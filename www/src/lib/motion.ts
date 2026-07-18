// Pure STILL/MOVING step-cadence classifier for the phone's DeviceMotion stream.
//
// Deliberately free of `window`, timers, fetch and React: the classifier is a
// fold, `step(state, sample) -> state`, so every threshold below is testable
// from an array of synthetic samples with no fake timers and no DOM. The browser
// plumbing that feeds it lives in src/app/capture/page.tsx. The single impure
// function — requestMotionPermission — is fenced at the bottom of the file and
// only touches DeviceMotionEvent inside its own body, so importing this module
// under Node or jsdom does nothing.
//
// Design note [10 §6]: the dominant false positive here is the user PANNING the
// camera while standing at a bus stop, and panning can be large. No amplitude
// threshold separates panning from walking — only PERIODICITY does. That is why
// the gate is a cadence window with an inter-peak interval consistency test
// rather than a variance threshold, and why a bare peak COUNT is not enough:
// random hand jitter can produce three peaks in 2.5 s.

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
 *  vs ASSUMED on every one of these. */
export const MOTION_TUNABLES: MotionTunables = {
  smoothTauMs: 100,
  biasTauMs: 1500,
  peakProminence: 1.2,
  peakProminenceGravity: 0.6,
  peakCooldownMs: 300,
  stepMinMs: 350,
  stepMaxMs: 850,
  cadenceWindowMs: 2500,
  minPeaks: 3,
  minInBandIntervals: 2,
  entryDebounceMs: 1200,
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
 * Periodicity, not amplitude.
 *
 * Three peaks alone are too weak — hand jitter while standing can produce three
 * peaks in 2.5 s — so the count is paired with an inter-peak interval
 * consistency test [10 §6]. The 350–850 ms band is the documented 1.4–2.3 Hz
 * step frequency widened by ~15%. Three peaks in 2.5 s demands 1.2 steps/s
 * (72 steps/min), which sits clearly below every documented normal-walking
 * cadence — the slowest documented normal male cadence is 81 steps/min — while
 * still requiring genuine periodicity.
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
