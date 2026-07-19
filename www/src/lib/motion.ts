// The capture page's pure logic: the two folds it needs to turn noisy per-frame
// signals into decisions the device can be told about.
//
//   1. STILL/MOVING, from the phone's DeviceMotion stream — `step`.
//   2. LEFT/AHEAD/RIGHT, from the detector's target box — `voteBearing`.
//
// Deliberately free of `window`, timers, fetch and React: both are folds of the
// shape `f(state, sample) -> state`, so every threshold below is testable from
// an array of synthetic samples with no fake timers and no DOM. The browser
// plumbing that feeds them lives in src/app/capture/page.tsx. The single impure
// function — requestMotionPermission — is fenced at the bottom of the file and
// only touches DeviceMotionEvent inside its own body, so importing this module
// under Node or jsdom does nothing.
//
// Design note [10 §6]: the dominant false positive here is the user PANNING the
// camera while standing at a bus stop, and panning can be large. No amplitude
// threshold separates panning from walking — only PERIODICITY does. That is why
// the gate is a cadence window with an inter-peak interval consistency test
// rather than a variance threshold, and why a bare peak COUNT is not enough:
// random hand jitter can produce three peaks in the 5 s window.

/**
 * Structurally identical to `UserActivity` in ./contract, on purpose. A sensor
 * classifier must not depend on the wire contract. TypeScript is structural, so
 * the two are mutually assignable; motion.test.ts pins that with a compile-time
 * assertion so the pair cannot drift apart unnoticed.
 */
export type MotionActivity = "STILL" | "MOVING";

/** Components are independently nullable — see readMagnitude. */
export interface MotionVec3 {
  x: number | null;
  y: number | null;
  z: number | null;
}

/**
 * One `devicemotion` event, flattened.
 *
 * `t` is `event.timeStamp` — a DOMHighResTimeStamp in ms. Never `Date.now()`,
 * never a sample count: browsers deliver anywhere between ~1 Hz and 67 Hz
 * [10 §4], so anything derived from a count is wrong on a real phone.
 */
export interface MotionSample {
  t: number;
  acceleration: MotionVec3 | null;
  accelerationIncludingGravity: MotionVec3 | null;
  rotationRate: { alpha: number | null; beta: number | null; gamma: number | null } | null;
}

export interface MotionTunables {
  /** EMA time constant for signal smoothing, ms. */
  smoothTauMs: number;
  /** EMA time constant for the DC baseline that is subtracted, ms. */
  biasTauMs: number;
  /** Minimum height above baseline for a local max to count as a step, m/s²,
   *  on the gravity-REMOVED `acceleration` channel. */
  peakProminence: number;
  /**
   * The same, for the accelerationIncludingGravity fallback. LOWER, and it must
   * be a separate number — measured, not assumed.
   *
   * The magnitude of (gait + gravity) responds to the component ALONG gravity
   * almost linearly, but to a perpendicular component only in quadrature:
   * sqrt(6² + 9.81²) − 9.81 = 1.69, not 6. A single shared threshold therefore
   * misses walking by ~3.5× on the worst-case axis. See audit 15 §"Numerically
   * validated" for the sweep.
   */
  peakProminenceGravity: number;
  /** Minimum spacing between accepted peaks, ms. */
  peakCooldownMs: number;
  /** Accepted inter-peak interval band, ms. */
  stepMinMs: number;
  stepMaxMs: number;
  /** Rolling window the peaks are counted in, ms. */
  cadenceWindowMs: number;
  minPeaks: number;
  /** Consecutive in-band intervals required alongside the count. */
  minInBandIntervals: number;
  entryDebounceMs: number;
  exitDebounceMs: number;
  /** dt above this (or any dt < 0) resets the window and resolves STILL. */
  gapResetMs: number;
  /** Below this measured rate the state is untrustworthy; the page offers
   *  manual control instead of a derived value. */
  minRateHz: number;
}

/** See the threshold table in audit 17 §"Classifier spec as built" for GROUNDED
 *  vs ASSUMED on every one of these.
 *
 *  DEMO RETUNE (2026-07-19, audit 22): `stepMaxMs` 850 → 1700 and
 *  `cadenceWindowMs` 2500 → 5000 (both ×2). Real phones on the bench report
 *  peak cadences of 40–50/min — the magnitude channel often only sees every
 *  OTHER heel strike — which is 1200–1500 ms between peaks, entirely outside
 *  the old 850 ms ceiling, so the classifier sat on STILL while the user
 *  walked. 1700 ms admits 40/min (1500 ms) with ~13% jitter margin; the window
 *  doubles with it so three peaks at the slowest admitted cadence still fit
 *  (2 × 1700 = 3400 < 5000). Known cost: slower camera pans (0.3–0.8 Hz full
 *  sine, folding to 0.6–1.6 Hz one-sided peaks) now land inside the band, so
 *  the pan false positive is wider than before — the manual override on the
 *  capture page remains the mitigation. Exit latency also grows: the window
 *  drains for up to ~4 s after the last step before the 2 s exit debounce even
 *  starts. Hardcoded for the demo; see audit 22 before treating these as
 *  measured. */
export const MOTION_TUNABLES: MotionTunables = {
  smoothTauMs: 100,
  biasTauMs: 1500,
  // SENSITIVITY RETUNE (audit 24): the bench complaint after audit 22 was the
  // inverse of the first one — the cadence band now admits slow walking, but
  // the user still had to walk HARD for the amplitude gate to see any peaks.
  // Demo bias, stated by the user: any real movement should read MOVING;
  // STILL is reserved for genuinely motionless. So prominence drops ~2.5×
  // (1.2 → 0.45, gravity 0.6 → 0.25), the gate needs two peaks with one
  // in-band interval instead of three-with-two, entry confirms in 500 ms, and
  // the band ceiling stretches to a 2 s shuffle. Cost, accepted deliberately:
  // hand tremor while holding the phone up can now read as MOVING, which
  // suppresses BUS/NUMBER on the board until the user is genuinely still —
  // "Force still" on the capture page is the escape hatch.
  peakProminence: 0.45,
  peakProminenceGravity: 0.25,
  peakCooldownMs: 300,
  stepMinMs: 350,
  stepMaxMs: 2000,
  cadenceWindowMs: 5000,
  minPeaks: 2,
  minInBandIntervals: 1,
  entryDebounceMs: 500,
  exitDebounceMs: 2000,
  gapResetMs: 2000,
  minRateHz: 10,
};

/** Smoothing factor for the measured-rate readout. Diagnostics only. */
const RATE_ALPHA = 0.2;

export interface MotionState {
  activity: MotionActivity;
  /** ms timestamp of the last activity change; null before the first. */
  lastTransitionT: number | null;
  /** Measured delivery rate; null until a second usable sample. */
  rateHz: number | null;
  /** The last accepted sample yielded no usable magnitude. */
  sensorUnavailable: boolean;
  /** rateHz below minRateHz — show the manual control, do not trust the state. */
  degraded: boolean;
  /** The magnitude came from accelerationIncludingGravity, not acceleration. */
  usingGravityFallback: boolean;
  /**
   * Diagnostics ONLY. This never gates a transition. Issue #5, verbatim: "Do not
   * equate a single gyro spike with MOVING." The literature agrees — periodicity,
   * not instantaneous magnitude, separates walking from everything else [10 §3].
   */
  rotationMagnitude: number;
  /** Accepted peak timestamps still inside the cadence window, oldest first. */
  peaks: readonly number[];
  samples: number;
  rejected: number;
  // --- internals; stable shape so tests can assert on them ---
  lastT: number | null;
  bias: number | null;
  smoothed: number | null;
  prev1: number | null;
  prev1T: number | null;
  prev2: number | null;
  lastPeakT: number | null;
  candidateSince: number | null;
  quietSince: number | null;
}

export function initialMotionState(): MotionState {
  return {
    activity: "STILL",
    lastTransitionT: null,
    rateHz: null,
    sensorUnavailable: false,
    degraded: false,
    usingGravityFallback: false,
    rotationMagnitude: 0,
    peaks: [],
    samples: 0,
    rejected: 0,
    lastT: null,
    bias: null,
    smoothed: null,
    prev1: null,
    prev1T: null,
    prev2: null,
    lastPeakT: null,
    candidateSince: null,
    quietSince: null,
  };
}

function pickVec(v: MotionVec3 | null | undefined): number | null {
  if (!v) return null;
  const { x, y, z } = v;
  if (x == null || y == null || z == null) return null;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
  // MAGNITUDE, never an individual axis. iOS Safari and Android Chrome disagree
  // on the sign convention for accelerationIncludingGravity (inverted X/Y on
  // Android); sqrt(x²+y²+z²) is invariant to that AND to how the phone is being
  // held, and it is what the step-detection literature uses [10 §3].
  return Math.sqrt(x * x + y * y + z * z);
}

/**
 * Two independent null modes, both real [10 §3]:
 *   1. the whole object is null — the per-spec behaviour;
 *   2. the object exists with individually-null components — what Chromium does.
 * Handling only the first leaves a TypeError on Android. `acceleration` is
 * gravity-removed and needs sensor fusion, so a device without a gyroscope
 * returns null there while still supplying accelerationIncludingGravity: the
 * fallback is mandatory, not defensive padding.
 */
export function readMagnitude(s: MotionSample): { value: number; fromGravity: boolean } | null {
  const primary = pickVec(s.acceleration);
  if (primary !== null) return { value: primary, fromGravity: false };
  const fallback = pickVec(s.accelerationIncludingGravity);
  if (fallback !== null) return { value: fallback, fromGravity: true };
  return null;
}

function readRotationMagnitude(s: MotionSample): number | null {
  const r = s.rotationRate;
  if (!r) return null;
  const { alpha, beta, gamma } = r;
  if (alpha == null || beta == null || gamma == null) return null;
  if (!Number.isFinite(alpha) || !Number.isFinite(beta) || !Number.isFinite(gamma)) return null;
  return Math.sqrt(alpha * alpha + beta * beta + gamma * gamma);
}

/**
 * Periodicity, not amplitude — though under the audit-24 sensitivity bias the
 * periodicity demand is the MINIMUM that still means anything: two peaks with
 * one interval inside 350–2000 ms. The band's floor still rejects cooldown
 * aliasing (a 6 Hz shake lands at 333 ms and refuses) and its ceiling still
 * rejects isolated bumps more than 2 s apart, but any two plausibly-spaced
 * peaks now read as movement. That is the stated demo requirement: STILL is
 * reserved for a genuinely motionless phone, and the stationary-noise suite
 * (±0.05–0.6 m/s², 60 s, zero flips) pins that random jitter still cannot
 * fake even this reduced periodicity through the EMA smoothing.
 */
export function cadenceGate(peaks: readonly number[], tun: MotionTunables): boolean {
  if (peaks.length < tun.minPeaks) return false;
  let run = 0;
  for (let i = 1; i < peaks.length; i += 1) {
    const gap = peaks[i] - peaks[i - 1];
    if (gap >= tun.stepMinMs && gap <= tun.stepMaxMs) {
      run += 1;
      if (run >= tun.minInBandIntervals) return true;
    } else {
      run = 0;
    }
  }
  return false;
}

function clearWindow(state: MotionState): MotionState {
  return {
    ...state,
    peaks: [],
    bias: null,
    smoothed: null,
    prev1: null,
    prev1T: null,
    prev2: null,
    lastPeakT: null,
    candidateSince: null,
    quietSince: null,
    rateHz: null,
    degraded: false,
  };
}

/** Fold one sample into the state. Total: never throws, for any input. */
export function step(
  state: MotionState,
  sample: MotionSample,
  tun: MotionTunables = MOTION_TUNABLES,
): MotionState {
  const t = sample.t;
  if (!Number.isFinite(t)) return { ...state, rejected: state.rejected + 1 };

  const reading = readMagnitude(sample);
  const rotation = readRotationMagnitude(sample) ?? state.rotationMagnitude;

  // First sample after init or a reset: seed the clock, nothing to fold yet.
  if (state.lastT === null) {
    return {
      ...state,
      lastT: t,
      samples: state.samples + 1,
      rotationMagnitude: rotation,
      sensorUnavailable: reading === null,
      usingGravityFallback: reading?.fromGravity ?? state.usingGravityFallback,
      bias: reading === null ? state.bias : reading.value,
    };
  }

  const dt = t - state.lastT;

  // Duplicate timestamp. dt = 0 is the classic divide-by-zero; drop the sample
  // and leave the clock where it is. Benign and common — the sensor is allowed
  // to coalesce deliveries.
  if (dt === 0) {
    return { ...state, rejected: state.rejected + 1, rotationMagnitude: rotation };
  }

  // Backwards (clock change / wrap) or a long gap — on Android motion events
  // stop firing while the page lacks focus [10 §4], so backgrounding the browser
  // produces exactly this. Both mean the window no longer describes now. Reset
  // it and resolve STILL: a stale window must never keep asserting MOVING.
  if (dt < 0 || dt > tun.gapResetMs) {
    const wasMoving = state.activity === "MOVING";
    return {
      ...clearWindow(state),
      lastT: t,
      samples: state.samples + 1,
      rejected: state.rejected + 1,
      rotationMagnitude: rotation,
      sensorUnavailable: reading === null,
      activity: "STILL",
      lastTransitionT: wasMoving ? t : state.lastTransitionT,
    };
  }

  const instantHz = 1000 / dt;
  const rateHz =
    state.rateHz === null ? instantHz : state.rateHz + RATE_ALPHA * (instantHz - state.rateHz);
  const degraded = rateHz < tun.minRateHz;

  // No usable magnitude at all. Flag it, hold the clock, never throw. The page
  // surfaces the manual control on this.
  if (reading === null) {
    return {
      ...state,
      lastT: t,
      rateHz,
      degraded,
      samples: state.samples + 1,
      sensorUnavailable: true,
      rotationMagnitude: rotation,
    };
  }

  // Slow EMA baseline, subtracted. Mandatory on the accelerationIncludingGravity
  // path (~9.81 m/s² of DC) and harmless on the gravity-removed path, so both go
  // through one code path and prominence is measured against 0 either way. Do
  // not feed the two channels into the same threshold untransformed [10 §3].
  const biasAlpha = dt / (dt + tun.biasTauMs);
  const bias =
    state.bias === null ? reading.value : state.bias + biasAlpha * (reading.value - state.bias);
  const centred = reading.value - bias;

  // Time-constant EMA rather than a fixed-N moving average: the delivered rate
  // varies between ~1 and 67 Hz across browsers [10 §4], so an N-sample window
  // would have a different bandwidth on every device. tau = 100 ms matches the
  // ~100 ms smoothing audit 10 specifies and keeps the passband below ~5 Hz,
  // where walking lives.
  const smoothAlpha = dt / (dt + tun.smoothTauMs);
  const smoothed =
    state.smoothed === null ? centred : state.smoothed + smoothAlpha * (centred - state.smoothed);

  // Three-point local maximum on the smoothed, centred signal. prev1 is the
  // candidate; it needs one sample after it to be confirmed as a maximum. `>` on
  // the rising side and `>=` on the falling side so a plateau is counted once.
  const peakT = state.prev1T;
  let peaks = state.peaks;
  let lastPeakT = state.lastPeakT;
  if (
    state.prev1 !== null &&
    state.prev2 !== null &&
    peakT !== null &&
    state.prev1 > state.prev2 &&
    state.prev1 >= smoothed &&
    // Channel-selected threshold. The gravity fallback compresses perpendicular
    // motion into quadrature and needs its own, lower number.
    state.prev1 >= (reading.fromGravity ? tun.peakProminenceGravity : tun.peakProminence) &&
    // 300 ms permits up to 3.33 steps/s, far above the fastest normal walking
    // (2.3 Hz ⇒ 435 ms), so it cannot suppress a genuine step — while still
    // rejecting the second peak of the heel-strike/push-off pair within one step.
    (lastPeakT === null || peakT - lastPeakT >= tun.peakCooldownMs)
  ) {
    peaks = [...peaks, peakT];
    lastPeakT = peakT;
  }
  peaks = peaks.filter((p) => t - p <= tun.cadenceWindowMs);

  const gate = cadenceGate(peaks, tun);
  let { activity, lastTransitionT, candidateSince, quietSince } = state;
  if (gate) {
    quietSince = null;
    if (candidateSince === null) candidateSince = t;
    // Entry needs POSITIVE proof of periodicity; the gate itself already took
    // ~1.0–1.5 s of peaks to become true, so total entry lands near 2.5 s.
    if (activity === "STILL" && t - candidateSince >= tun.entryDebounceMs) {
      activity = "MOVING";
      lastTransitionT = t;
      candidateSince = null;
    }
  } else {
    candidateSince = null;
    if (quietSince === null) quietSince = t;
    // Exit is harder than entry, and the asymmetry is evidence-based rather than
    // taste: entering requires proof of periodicity, leaving is triggered by
    // mere ABSENCE of peaks, and absence is the weaker signal. 2.0 s tolerates
    // two consecutive missed steps (longest normal step interval ~0.85 s), so a
    // kerb pause or a stumble does not drop the state.
    if (activity === "MOVING" && t - quietSince >= tun.exitDebounceMs) {
      activity = "STILL";
      lastTransitionT = t;
      quietSince = null;
    }
  }

  return {
    activity,
    lastTransitionT,
    rateHz,
    sensorUnavailable: false,
    degraded,
    usingGravityFallback: reading.fromGravity,
    rotationMagnitude: rotation,
    peaks,
    samples: state.samples + 1,
    rejected: state.rejected,
    lastT: t,
    bias,
    smoothed,
    prev1: smoothed,
    prev1T: t,
    prev2: state.prev1,
    lastPeakT,
    candidateSince,
    quietSince,
  };
}

/** Fold a whole array. Test convenience; the page uses step() per event. */
export function classify(
  samples: readonly MotionSample[],
  tun: MotionTunables = MOTION_TUNABLES,
): MotionState {
  return samples.reduce<MotionState>((s, sample) => step(s, sample, tun), initialMotionState());
}

// --- target bearing: the capture page's second pure fold --------------------
//
// Which way to walk to reach the bus. It shares this module with the cadence
// classifier because it is the same KIND of thing — a pure, total fold over a
// noisy per-frame signal — and keeping both here means every debounce rule on
// this page is unit-testable without rendering a component or faking a camera.
//
// It is deliberately NOT in contract.ts: that file is the wire format shared
// with the firmware, and this is a local smoothing policy the board never sees.

/**
 * Structurally identical to `Bearing` in ./contract, for exactly the reason
 * `MotionActivity` is: nothing in this module may depend on the wire contract.
 * motion.test.ts pins the mutual assignability so the pair cannot drift.
 */
export type MotionBearing = "left" | "center" | "right";

/**
 * Fraction of the frame width that reads as "center" — i.e. AHEAD.
 *
 * The detector's own `bearing` splits the frame into hard THIRDS with no
 * deadband (vision/service.py `_bearing`: cx < W/3 → left, cx < 2W/3 → center,
 * else right). That is a reasonable way to log which side a hazard was on, but
 * it is the wrong shape for telling a walking user which way to turn:
 *
 *   1. it commits to LEFT for a centroid at 0.32 — and for a bus that fills a
 *      third of the frame, that is not a turn instruction, it is noise; and
 *   2. under ambiguity the useful answer is "keep going", not a turn. AHEAD is
 *      the cheap mistake here; a wrong LEFT walks someone off a kerb.
 *
 * 0.44 answers AHEAD for anything whose centroid is inside the middle 44 % of
 * the frame (0.28..0.72) and reserves LEFT/RIGHT for a target genuinely off to
 * one side. ASSUMED, not measured — no bench walk has tuned this number.
 *
 * Widening the band does NOT on its own stop the emitted bearing flapping: a
 * hard threshold at any position still flaps when the centroid hovers on it.
 * That is what `voteBearing` below is for. The two rules do different jobs —
 * this one picks the right answer, that one stops it changing its mind.
 */
export const AHEAD_BAND = 0.44;

/**
 * Bearing of a normalised [x1, y1, x2, y2] box, from its horizontal centroid.
 *
 * `null` for a malformed or non-finite box rather than a guessed direction: a
 * fabricated LEFT is worse than no instruction, and `voteBearing` treats null
 * as "no target" and holds the last confirmed value.
 */
export function bearingFromBox(box: readonly number[] | null | undefined): MotionBearing | null {
  if (!box || box.length !== 4) return null;
  const [x1, , x2] = box;
  if (!Number.isFinite(x1) || !Number.isFinite(x2)) return null;
  const cx = (x1 + x2) / 2;
  const half = AHEAD_BAND / 2;
  if (cx < 0.5 - half) return "left";
  if (cx > 0.5 + half) return "right";
  return "center";
}

/**
 * `emitted` is the confirmed bearing the device is being told about; `null`
 * means no target. `candidate`/`streak` are the evidence accumulating for a
 * change — when `streak` is 0 there is no pending change and `candidate` is
 * meaningless.
 */
export interface BearingVote {
  emitted: MotionBearing | null;
  candidate: MotionBearing | null;
  streak: number;
}

/**
 * Consecutive agreeing frames required before the emitted bearing changes.
 *
 * Three frames is ~1.5 s at the page's 2 Hz capture rate. Counted in FRAMES and
 * not milliseconds on purpose: the unit of evidence here is a detection, and a
 * detector running slow gives fewer, not worse, opinions. The consequence is
 * that a stalled detector stretches the confirmation window in wall-clock time
 * — recorded as a residual risk in audit 21 rather than papered over.
 */
export const BEARING_CONFIRM_FRAMES = 3;

export function initialBearingVote(): BearingVote {
  return { emitted: null, candidate: null, streak: 0 };
}

/**
 * Fold one frame's observed bearing into the confirmed one.
 *
 * The rule is one sentence: **any change to the emitted bearing — including
 * acquiring a target and losing one — needs `confirmFrames` consecutive frames
 * agreeing on the new value.** A single disagreeing frame resets the count.
 *
 * A majority vote was the obvious alternative and is not enough. The detector
 * thresholds on hard thirds, so a box centroid hovering on a boundary produces
 * left, center, left, center…; best-of-3 over that sequence yields left,
 * center, left, center… — the same flap rate, just delayed. Requiring
 * CONSECUTIVE agreement never reaches three of anything on that input, so the
 * emitted bearing simply holds, which is the correct answer for a target that
 * genuinely is on the line.
 *
 * The same rule absorbs a dropped detection: at 2 Hz a one-frame miss would
 * otherwise clear the command and re-send it 500 ms later, restarting the
 * board's 800 ms nav pattern every time and truncating it permanently.
 */
export function voteBearing(
  state: BearingVote,
  observed: MotionBearing | null,
  confirmFrames: number = BEARING_CONFIRM_FRAMES,
): BearingVote {
  // Agrees with what we are already emitting: cancel any pending change.
  if (observed === state.emitted) {
    return state.streak === 0 ? state : { emitted: state.emitted, candidate: null, streak: 0 };
  }
  // `state.streak > 0` disambiguates "candidate is null because nothing is
  // pending" from "the pending candidate IS null, i.e. the target is gone".
  const streak = observed === state.candidate && state.streak > 0 ? state.streak + 1 : 1;
  if (streak >= confirmFrames) return { emitted: observed, candidate: null, streak: 0 };
  return { emitted: state.emitted, candidate: observed, streak };
}

// --- impure boundary: the only DOM-touching function in this module ---------

export type MotionPermission = "granted" | "denied" | "unsupported" | "error";

/**
 * MUST be invoked synchronously at the top of a real user-gesture handler,
 * BEFORE any await.
 *
 * WebKit bounds user-gesture validity to about one second — WebKit bug 198040,
 * Youenn Fablet: "We currently bound the user gesture duration to 1s", still
 * open. A camera permission prompt is answered by a HUMAN and will essentially
 * never resolve inside that window on a first grant, so awaiting getUserMedia
 * first consumes the activation and makes this reject with NotAllowedError.
 * Motion first, camera second: getUserMedia requires a secure context and
 * permission but NOT transient activation (w3c/mediacapture-extensions#11 is an
 * open proposal to ADD one, i.e. none exists today). [10 §2 — the load-bearing
 * finding]
 */
export async function requestMotionPermission(): Promise<MotionPermission> {
  // A bare `DeviceMotionEvent` reference is a ReferenceError, not undefined, on
  // browsers without the interface. Guard the identifier itself.
  if (typeof DeviceMotionEvent === "undefined") return "unsupported";

  // requestPermission is not in lib.dom.d.ts (verified against the installed
  // TypeScript) — it is iOS-only, so the cast is required, not sloppiness.
  const request = (
    DeviceMotionEvent as unknown as { requestPermission?: () => Promise<PermissionState> }
  ).requestPermission;

  // Android/Chrome: the method is absent, there is no permission gate, listen
  // immediately. Feature-detect with typeof — never a UA sniff.
  if (typeof request !== "function") return "granted";

  try {
    // `.call` matters — extracting the method loses its `this`. This line runs
    // in the same task as the click, which is what holds the activation.
    const state = await request.call(DeviceMotionEvent);
    return state === "granted" ? "granted" : "denied";
  } catch {
    // NotAllowedError (activation gone) or a non-secure context. iOS auto-
    // declines over plain HTTP; the Vercel deployment satisfies the secure-
    // context requirement, a bare-IP LAN dev server does not.
    return "error";
  }
}
