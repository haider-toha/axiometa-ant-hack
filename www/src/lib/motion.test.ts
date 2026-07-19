import { describe, expect, it } from "vitest";

import type { Bearing, UserActivity } from "@/lib/contract";
import {
  AHEAD_BAND,
  bearingFromBox,
  BEARING_CONFIRM_FRAMES,
  cadenceGate,
  classify,
  initialBearingVote,
  initialMotionState,
  MOTION_TUNABLES,
  readMagnitude,
  step,
  voteBearing,
  type BearingVote,
  type MotionActivity,
  type MotionBearing,
  type MotionSample,
  type MotionState,
} from "@/lib/motion";

// --- fixtures --------------------------------------------------------------

const vec = (x: number, y = 0, z = 0) => ({ x, y, z });

/** Flat: constant magnitude, zero AC content. */
function rest(count: number, hz = 30, t0 = 0): MotionSample[] {
  const dt = 1000 / hz;
  return Array.from({ length: count }, (_, i) => ({
    t: t0 + i * dt,
    acceleration: vec(0.02, 0.01, 0.0),
    accelerationIncludingGravity: vec(0.02, 0.01, 9.81),
    rotationRate: { alpha: 0, beta: 0, gamma: 0 },
  }));
}

/**
 * Walking-like: a HALF-WAVE RECTIFIED sine at `stepHz`.
 *
 * Half-wave, not a full sine, and this matters. `readMagnitude` returns
 * sqrt(x²+y²+z²), which is one-sided — a full sine on one axis rectifies through
 * it to DOUBLE the frequency, so a "1.9 Hz" fixture would present as 3.8 Hz,
 * alias through the cooldown to below stepMinMs, and the positive test would
 * fail for a reason that has nothing to do with the classifier. A one-sided
 * burst per step is also closer to a real heel strike.
 *
 * `axis: "z"` puts the gait along gravity, which is the realistic geometry and
 * the only one where the accelerationIncludingGravity fallback sees the full
 * amplitude. Default amp 6 sits far above the ~1.3 m/s² effective raw
 * threshold of the audit-24 prominence (0.45 × the ~2.9 raw→smoothed factor
 * measured in audit 17); amp 1.5 is the pinned gentle-walk floor.
 */
function walk(
  ms: number,
  { hz = 30, stepHz = 1.9, amp = 6, t0 = 0, axis = "x" as "x" | "z" } = {},
): MotionSample[] {
  const dt = 1000 / hz;
  const n = Math.round(ms / dt);
  return Array.from({ length: n }, (_, i) => {
    const t = t0 + i * dt;
    const a = amp * Math.max(0, Math.sin((2 * Math.PI * stepHz * t) / 1000));
    return {
      t,
      acceleration: axis === "z" ? vec(0, 0, a) : vec(a, 0, 0),
      accelerationIncludingGravity: axis === "z" ? vec(0, 0, 9.81 + a) : vec(a, 0, 9.81),
      rotationRate: { alpha: 5, beta: 5, gamma: 5 },
    };
  });
}

/**
 * Camera panning while stationary: a FULL sine, deliberately unlike `walk`.
 *
 * The rectification that `walk` avoids is the whole point here. A one-sided
 * magnitude folds a full sine at `panHz` to peaks at 2·panHz, which is exactly
 * why a 0.8 Hz pan lands at 1.6 Hz — inside the gait band — while 0.3 and
 * 0.5 Hz fold to 0.6 and 1.0 Hz and reject cleanly. [10 §6]
 */
function pan(ms: number, { hz = 30, panHz = 0.3, amp = 4, t0 = 0 } = {}): MotionSample[] {
  const dt = 1000 / hz;
  const n = Math.round(ms / dt);
  return Array.from({ length: n }, (_, i) => {
    const t = t0 + i * dt;
    const a = amp * Math.sin((2 * Math.PI * panHz * t) / 1000);
    return {
      t,
      acceleration: vec(a, 0, 0),
      accelerationIncludingGravity: vec(a, 0, 9.81),
      rotationRate: { alpha: 40, beta: 10, gamma: 10 },
    };
  });
}

/** Deterministic pseudo-noise, so the 60 s flap test cannot be flaky. */
function noisy(count: number, amplitude: number, hz = 30): MotionSample[] {
  let seed = 42;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff - 0.5;
  };
  return Array.from({ length: count }, (_, i) => ({
    t: i * (1000 / hz),
    acceleration: vec(rnd() * amplitude * 2, rnd() * amplitude * 2, rnd() * amplitude * 2),
    accelerationIncludingGravity: vec(0, 0, 9.81),
    rotationRate: null,
  }));
}

/** Every activity change across a fold, with the timestamp it happened at. */
function transitions(
  samples: readonly MotionSample[],
  tun = MOTION_TUNABLES,
): { t: number | null; activity: MotionActivity }[] {
  let s = initialMotionState();
  let prev = s.activity;
  const out: { t: number | null; activity: MotionActivity }[] = [];
  for (const x of samples) {
    s = step(s, x, tun);
    if (s.activity !== prev) {
      out.push({ t: s.lastTransitionT, activity: s.activity });
      prev = s.activity;
    }
  }
  return out;
}

/** Counts activity changes across a fold — the flap metric. */
function flips(samples: readonly MotionSample[], tun = MOTION_TUNABLES): number {
  return transitions(samples, tun).length;
}

/** Concatenate segments, keeping the timeline contiguous at `hz`. */
function chain(hz: number, ...build: ((t0: number) => MotionSample[])[]): MotionSample[] {
  const dt = 1000 / hz;
  const out: MotionSample[] = [];
  let t = 0;
  for (const make of build) {
    const seg = make(t);
    out.push(...seg);
    t += seg.length * dt;
  }
  return out;
}

// --- 1–2: the zero and the stationary baseline ------------------------------

describe("initialMotionState", () => {
  // Case 1
  it("has a defined zero the fold can start from", () => {
    const s = initialMotionState();
    expect(s.activity).toBe("STILL");
    expect(s.lastT).toBeNull();
    expect(s.lastTransitionT).toBeNull();
    expect(s.peaks).toEqual([]);
    expect(s.samples).toBe(0);
    expect(s.rejected).toBe(0);
  });
});

describe("stationary behaviour", () => {
  // Case 2 — issue #5's 60-second bench criterion.
  it("does not flap across 60 s of flat rest", () => {
    const samples = rest(1800);
    const s = classify(samples);
    expect(s.activity).toBe("STILL");
    expect(flips(samples)).toBe(0);
    expect(s.lastTransitionT).toBeNull();
    expect(s.peaks.length).toBe(0);
  });

  // Case 25 — the quantitative form of the same criterion.
  it.each([0.05, 0.15, 0.3, 0.6])(
    "does not flap across 60 s of ±%s m/s² stationary noise",
    (amplitude) => {
      expect(flips(noisy(1800, amplitude))).toBe(0);
    },
  );

  // Case 26 — the named dominant false positive [10 §6]. The audit-22 demo
  // retune widened the gait band to 350–1700 ms, so pans folding inside it
  // (0.3–0.8 Hz) moved to the known-limitations block below; what still rejects
  // is a pan slow enough that its one-sided peaks land beyond stepMaxMs.
  it.each([0.1, 0.2])("rejects 60 s of amp-4 camera panning at %s Hz", (panHz) => {
    expect(flips(pan(60_000, { panHz, amp: 4 }))).toBe(0);
  });
});

// --- 3–5, 7–12: the gate itself ---------------------------------------------

describe("amplitude gate", () => {
  // Case 3 — a tunable override rather than a hand-picked amplitude: the
  // raw→smoothed ratio is ~0.358, and guessing an amplitude is how this goes
  // flaky.
  it("is live — raising peakProminence above the signal blocks every peak", () => {
    const s = classify(walk(6000), { ...MOTION_TUNABLES, peakProminence: 4.0 });
    expect(s.activity).toBe("STILL");
    expect(s.peaks.length).toBe(0);
  });

  // Case 3b — the control for the row above.
  it("passes the same waveform at the default threshold", () => {
    expect(classify(walk(6000)).activity).toBe("MOVING");
  });
});

describe("cadence gate", () => {
  // Case 7 — the positive case. The 5000 ms window (audit 22) retains ~9 peaks
  // at a 526 ms step interval where the old 2500 ms window held 4.
  it("reports MOVING for sustained 1.9 Hz walking", () => {
    const s = classify(walk(6000));
    expect(s.activity).toBe("MOVING");
    expect(s.peaks.length).toBe(9);
  });

  // Case 8 — issue #5 wants measured transition times. Asserted as a band so a
  // bench retune of the thresholds does not break the suite. Audit 24 dropped
  // the gate to two peaks + a 500 ms debounce, so entry lands ~1.2–1.8 s.
  it("enters MOVING inside the documented 1.0–2.0 s window", () => {
    const s = classify(walk(6000));
    expect(s.lastTransitionT).not.toBeNull();
    expect(s.lastTransitionT).toBeGreaterThanOrEqual(1000);
    expect(s.lastTransitionT).toBeLessThanOrEqual(2000);
  });

  // Case 4 — the debounce is real; two peaks is below minPeaks.
  it("does not fire on 900 ms of over-threshold motion", () => {
    const s = classify(walk(900));
    expect(s.activity).toBe("STILL");
    expect(s.peaks.length).toBe(2);
  });

  // Case 11 — a bare peak count would pass this instantly (15 peaks!); the
  // interval rule is what rejects it, and it SURVIVES the audit-24 bias: the
  // 300 ms cooldown aliases 6 Hz lobes to a uniform 333 ms spacing, which sits
  // below stepMinMs on the 30 Hz sample grid. The gate is biased, not
  // amplitude-triggered.
  it("rejects a 6 Hz cadence", () => {
    const s = classify(walk(6000, { stepHz: 6 }));
    expect(s.activity).toBe("STILL");
    expect(s.peaks.length).toBe(15);
  });

  // Case 11b — the precise upper edge: 333 ms spacing, below stepMinMs.
  it("rejects a 3 Hz cadence, just outside the band", () => {
    expect(classify(walk(8000, { stepHz: 3 })).activity).toBe("STILL");
  });

  // Case 12 — the band's lower edge moved again under audit 24: 0.5 Hz peaks
  // are 2000 ms apart, exactly the new stepMaxMs, so a very slow shuffle is
  // admitted…
  it("admits a 0.5 Hz shuffle at the band ceiling", () => {
    const s = classify(walk(9000, { stepHz: 0.5 }));
    expect(s.activity).toBe("MOVING");
    expect(s.peaks.length).toBe(3);
  });

  // …and this is what still rejects: 0.4 Hz peaks are 2500 ms apart, beyond
  // even the widened band, so the interval rule refuses however many peaks
  // accumulate. The cadence gate is biased, not abolished.
  it("rejects a 0.4 Hz cadence beyond the widened band", () => {
    expect(classify(walk(12000, { stepHz: 0.4 })).activity).toBe("STILL");
  });

  // Case 12b — 72 steps/min, the old documented design floor. Two peaks plus
  // the 500 ms debounce (audit 24) put entry at ~1.6 s.
  it("admits the slowest designed-for walk at 1.2 Hz", () => {
    const s = classify(walk(9000, { stepHz: 1.2 }));
    expect(s.activity).toBe("MOVING");
    expect(s.lastTransitionT).toBeGreaterThanOrEqual(1200);
    expect(s.lastTransitionT).toBeLessThanOrEqual(2200);
  });

  // Case 12c — the demo's reason for existing (audit 22): a phone reporting
  // peaks at 40/min (1500 ms apart, stride-rate detection of a normal walk)
  // must classify as MOVING. This is the case the old 850 ms ceiling rejected.
  it("admits a 40 peaks/min stride-rate walk at 0.67 Hz", () => {
    const s = classify(walk(12000, { stepHz: 0.667 }));
    expect(s.activity).toBe("MOVING");
  });

  // Case 27 — the interval-consistency rule on its own, independent of the
  // fold. Audit 24: two peaks with ONE in-band interval suffice, so the pinned
  // truth table shrank on the reject side — what still refuses is a lone peak,
  // an interval below stepMinMs, or one beyond stepMaxMs.
  it.each([
    [[0, 400, 800], true],
    [[0, 1500, 3000], true],
    [[0, 400], true],
    [[0, 2000], true],
    [[0], false],
    [[0, 300], false],
    [[0, 2100], false],
    [[0, 300, 600], false],
  ] as const)("cadenceGate(%j) === %s", (peaks, expected) => {
    expect(cadenceGate(peaks, MOTION_TUNABLES)).toBe(expected);
  });
});

describe("hysteresis", () => {
  // Case 5 — the anti-flap criterion, restated under the audit-24 bias. Short
  // movement bursts every 2.4 s are now legitimately MOVEMENT (each 900 ms
  // burst yields a solid in-band peak pair), so the right answer is a single
  // entry that then HOLDS through the 1.5 s rests — entering and leaving per
  // burst would restart the board's patterns constantly. One transition, zero
  // flapping.
  it("holds MOVING through intermittent movement without flapping", () => {
    const samples = chain(
      30,
      ...Array.from({ length: 10 }, () => [
        (t0: number) => walk(900, { t0 }),
        (t0: number) => rest(45, 30, t0),
      ]).flat(),
    );
    expect(classify(samples).activity).toBe("MOVING");
    expect(flips(samples)).toBe(1);
  });

  // Case 9 — "placing it down returns to STILL". Exit ≈ 6 s under audit 22:
  // the 5000 ms window drains until fewer than minPeaks remain (~4 s after the
  // last step at a 526 ms step interval), then the 2 s exit debounce runs.
  it("returns to STILL after the phone is put down", () => {
    const samples = [...walk(6000), ...rest(300, 30, 6000)];
    const s = classify(samples);
    expect(s.activity).toBe("STILL");
    expect(s.lastTransitionT).toBeGreaterThanOrEqual(11000);
    expect(s.lastTransitionT).toBeLessThanOrEqual(13000);
  });

  // Case 10 — sub-threshold motion for less than the exit debounce must not
  // drop the state.
  it("holds MOVING through 1.5 s of sub-threshold motion", () => {
    const samples = [...walk(6000), ...walk(1500, { t0: 6000, amp: 0.4 })];
    expect(classify(samples).activity).toBe("MOVING");
  });
});

// --- 6: rotation is diagnostics only ----------------------------------------

describe("rotationRate", () => {
  // Case 6 — issue #5 verbatim: "Do not equate a single gyro spike with MOVING."
  it("never gates a transition, however large the spike", () => {
    const samples = rest(300);
    samples[150] = { ...samples[150], rotationRate: { alpha: 900, beta: 900, gamma: 900 } };
    const s = classify(samples);
    expect(s.activity).toBe("STILL");
    expect(flips(samples)).toBe(0);
  });

  // The diagnostic itself, asserted MID-FOLD: state holds the LATEST value, not
  // a maximum, so it has decayed back to 0 by the end of the array above.
  it("is still recorded for the diagnostics panel", () => {
    const samples = rest(300);
    samples[150] = { ...samples[150], rotationRate: { alpha: 900, beta: 900, gamma: 900 } };
    const s = classify(samples.slice(0, 151));
    expect(s.rotationMagnitude).toBeCloseTo(Math.sqrt(3 * 900 * 900), 6);
  });
});

// --- 13–16: null and garbage sensor fields ----------------------------------

describe("null and malformed sensor fields", () => {
  // Case 13 — iOS/gyroless devices give null `acceleration`. `axis: "z"` is
  // required: perpendicular gait collapses to a 1.69 m/s² swing at amp 6.
  it("falls back to accelerationIncludingGravity for gait along gravity", () => {
    const samples = walk(8000, { axis: "z" }).map((s) => ({ ...s, acceleration: null }));
    const s = classify(samples);
    expect(s.activity).toBe("MOVING");
    expect(s.usingGravityFallback).toBe(true);
  });

  // Case 13b — documents the quadrature limitation rather than pretending it
  // away. Pinned at amp 3, where the compression is unambiguous: the magnitude
  // swing is sqrt(3² + 9.81²) − 9.81 ≈ 0.45 m/s², below even the fallback's
  // 0.6 prominence. (At the old amp 6 the swing is 1.69 m/s² and the audit-22
  // doubled window now collects enough of those marginal peaks to pass the
  // gate — a deliberate sensitivity gain, so amp 6 stopped being a miss.)
  it("misses perpendicular gait on the gravity fallback, as the geometry demands", () => {
    const samples = walk(8000, { axis: "x", amp: 3 }).map((s) => ({ ...s, acceleration: null }));
    const s = classify(samples);
    expect(s.activity).toBe("STILL");
    expect(s.usingGravityFallback).toBe(true);
  });

  // Case 14 — drives the manual-fallback UI.
  it("reports sensorUnavailable when both channels are null", () => {
    const samples = rest(300).map((s) => ({
      ...s,
      acceleration: null,
      accelerationIncludingGravity: null,
    }));
    let s: MotionState = initialMotionState();
    expect(() => {
      s = classify(samples);
    }).not.toThrow();
    expect(s.activity).toBe("STILL");
    expect(s.sensorUnavailable).toBe(true);
  });

  // Case 15 — the non-standard Chromium null mode: object present, components
  // individually null.
  it("falls through to the gravity channel when components are individually null", () => {
    const samples = rest(300).map((s) => ({ ...s, acceleration: { x: 1, y: null, z: 3 } }));
    let s: MotionState = initialMotionState();
    expect(() => {
      s = classify(samples);
    }).not.toThrow();
    expect(s.activity).toBe("STILL");
    expect(s.sensorUnavailable).toBe(false);
    expect(s.usingGravityFallback).toBe(true);
  });

  // Case 16 — garbage-in hardening, same spirit as coerce.ts.
  it.each([NaN, Infinity, -Infinity])("falls through when a component is %s", (bad) => {
    const samples = rest(300).map((s) => ({ ...s, acceleration: vec(bad, 0, 0) }));
    let s: MotionState = initialMotionState();
    expect(() => {
      s = classify(samples);
    }).not.toThrow();
    expect(s.activity).toBe("STILL");
    expect(s.usingGravityFallback).toBe(true);
  });

  it("readMagnitude reports which channel a reading came from", () => {
    const [sample] = rest(1);
    expect(readMagnitude(sample)).toEqual({ value: expect.any(Number), fromGravity: false });
    expect(readMagnitude({ ...sample, acceleration: null })).toEqual({
      value: expect.any(Number),
      fromGravity: true,
    });
    expect(
      readMagnitude({ ...sample, acceleration: null, accelerationIncludingGravity: null }),
    ).toBeNull();
  });
});

// --- 17–19, 21: the clock ---------------------------------------------------

describe("timestamp handling", () => {
  // Case 17 — dt = 0 is the classic divide-by-zero.
  it("drops a duplicate timestamp without dividing by zero", () => {
    const base = rest(10);
    const samples = [...base.slice(0, 5), base[4], ...base.slice(5)];
    let s: MotionState = initialMotionState();
    expect(() => {
      s = classify(samples);
    }).not.toThrow();
    expect(s.rejected).toBe(1);
    expect(Number.isFinite(s.smoothed)).toBe(true);
    expect(Number.isFinite(s.rateHz)).toBe(true);
  });

  // Case 18 — the wrap criterion. The reset fires on the first backwards
  // sample and resolves STILL at that instant; audit 24's ~1.7 s entry then
  // legitimately re-detects the continuing walk INSIDE the 2 s tail, so the
  // assertion is the full sequence rather than the final value — the reset
  // still happened, and recovery is now fast enough to observe.
  it("resets to STILL when time goes backwards, then re-detects the walk", () => {
    const samples = [...walk(6000), ...walk(2000, { t0: 1000 })];
    const seen = transitions(samples);
    expect(seen.map((x) => x.activity)).toEqual(["MOVING", "STILL", "MOVING"]);
    expect(seen[1].t).toBe(1000);
    const s = classify(samples);
    expect(s.peaks.every((p) => Number.isFinite(p) && p >= 0)).toBe(true);
    expect(Number.isFinite(s.lastT)).toBe(true);
    expect(Number.isFinite(s.bias)).toBe(true);
    expect(Number.isFinite(s.smoothed)).toBe(true);
    expect(s.samples).toBeGreaterThan(0);
    expect(s.rejected).toBeGreaterThan(0);
  });

  // Case 19 — a backgrounded tab. A stale window must never carry MOVING over
  // the gap: the reset resolves STILL at the gap and the tail walk has to
  // re-earn the state on fresh evidence.
  it("resets to STILL across a 30 s gap, then re-detects the walk", () => {
    const samples = [...walk(6000), ...walk(2000, { t0: 36000 })];
    const seen = transitions(samples);
    expect(seen.map((x) => x.activity)).toEqual(["MOVING", "STILL", "MOVING"]);
    expect(seen[1].t).toBe(36000);
  });

  // Case 21 — total-function guard.
  it("rejects a non-finite timestamp and changes nothing else", () => {
    const before = classify(rest(10));
    const after = step(before, { ...rest(1)[0], t: NaN });
    expect(after).toEqual({ ...before, rejected: before.rejected + 1 });
  });

  // Case 20 — below 10 Hz the derived state is untrustworthy. It STILL
  // transitions: the classifier reports, the page decides not to post.
  it("flags a degraded delivery rate without suppressing the transition", () => {
    const s = classify(walk(20000, { hz: 4 }));
    expect(s.degraded).toBe(true);
    expect(s.rateHz).toBeCloseTo(4, 1);
  });

  // Case 23 — delivered rate varies ~1–67 Hz in the wild. This is what the
  // time-constant EMA buys; a fixed-N moving average would fail it. Entry
  // measured 1233–1800 ms across the rates under audit 24.
  it.each([10, 15, 20, 30, 60])("reaches MOVING at %i Hz delivery", (hz) => {
    const s = classify(walk(6000, { hz }));
    expect(s.activity).toBe("MOVING");
    expect(s.lastTransitionT).toBeGreaterThanOrEqual(1000);
    expect(s.lastTransitionT).toBeLessThanOrEqual(2000);
  });
});

// --- 22, 24: purity and the known-marginal band -----------------------------

describe("fold properties", () => {
  // Case 22 — it is a fold or it is not testable.
  it("is pure: same input, same output, and the input is not mutated", () => {
    const samples = walk(6000);
    const snapshot = JSON.stringify(samples);
    const a = classify(samples);
    const b = classify(samples);
    expect(a).toEqual(b);
    expect(JSON.stringify(samples)).toBe(snapshot);
  });

  // Case 24 — under the 1.2 m/s² prominence, amp 3 sat in a marginal band
  // (fired on the transient, then lost it). The audit-24 drop to 0.45 puts the
  // effective raw threshold near 1.3 m/s², so amp 3 is now comfortably above
  // it: one clean entry, held for the whole walk. The gentle-walk row below is
  // the user-facing point of the retune.
  it("detects a formerly marginal amplitude cleanly", () => {
    const seen = transitions(walk(15000, { amp: 3 }));
    expect(seen.map((x) => x.activity)).toEqual(["MOVING"]);
    expect(seen[0].t).toBeGreaterThanOrEqual(1000);
    expect(seen[0].t).toBeLessThanOrEqual(2200);
  });

  // The audit-24 regression the retune exists for: a GENTLE walk — the bench
  // complaint was having to walk hard before anything registered. amp 1.5 is
  // half the old marginal amplitude and an eighth above the new effective raw
  // threshold.
  it.each([1.5, 2])("detects a gentle walk at amp %s", (amp) => {
    expect(classify(walk(8000, { amp })).activity).toBe("MOVING");
  });
});

// --- the known limitation, pinned rather than hidden ------------------------

describe("known limitations", () => {
  // The counterpart to case 26. A one-sided magnitude folds a pan at panHz to
  // peaks at 2·panHz, so 0.3, 0.5 and 0.8 Hz pans land at 1667, 1000 and
  // 625 ms spacings — all inside the audit-22 350–1700 ms band. No
  // cadence-based classifier can separate these from a slow walk. The band was
  // widened deliberately to admit real 40–50 peaks/min walking, and this block
  // grew from one frequency to three as the cost: asserted as FLIPS, not
  // passes, so the manual control can never be argued away as redundant.
  // [audit 15 §finding 4; audit 22]
  it.each([0.3, 0.5, 0.8])(
    "cannot distinguish a perfectly periodic %s Hz camera pan from walking",
    (panHz) => {
      expect(flips(pan(60_000, { panHz, amp: 4 }))).toBeGreaterThan(0);
    },
  );
});

// --- 28: the deliberate type duplication ------------------------------------

describe("MotionActivity", () => {
  // Case 28 — motion.ts imports nothing from contract.ts on purpose: a sensor
  // classifier must not depend on the wire contract. TypeScript is structural,
  // so the two are mutually assignable; this pins that so the pair cannot drift
  // apart unnoticed.
  it("stays mutually assignable with the wire contract's UserActivity", () => {
    const fromMotion: MotionActivity = "STILL";
    const toWire: UserActivity = fromMotion;
    const fromWire: UserActivity = "MOVING";
    const toMotion: MotionActivity = fromWire;
    expect([toWire, toMotion]).toEqual(["STILL", "MOVING"]);
  });

  // The same pin for the bearing pair. `bearingToPattern` in contract.ts takes a
  // `Bearing`; this page hands it a `MotionBearing`, so the two must stay
  // interchangeable or the nav path stops compiling for a reason that has
  // nothing to do with either module's logic.
  it("stays mutually assignable with the wire contract's Bearing", () => {
    const fromMotion: MotionBearing = "left";
    const toWire: Bearing = fromMotion;
    const fromWire: Bearing = "right";
    const toMotion: MotionBearing = fromWire;
    expect([toWire, toMotion]).toEqual(["left", "right"]);
  });
});

// --- target bearing ---------------------------------------------------------

/** A normalised box whose horizontal centroid is `cx`. */
const boxAt = (cx: number, w = 0.1) => [cx - w / 2, 0.2, cx + w / 2, 0.8];

/** Repeat one observation `n` times. */
const rep = (n: number, v: MotionBearing | null) => Array.from({ length: n }, () => v);

/** Fold a sequence of observations, returning the emitted bearing after each. */
function emitted(
  observations: readonly (MotionBearing | null)[],
  confirm = BEARING_CONFIRM_FRAMES,
): (MotionBearing | null)[] {
  let v: BearingVote = initialBearingVote();
  return observations.map((o) => {
    v = voteBearing(v, o, confirm);
    return v.emitted;
  });
}

/**
 * How many times the emitted bearing changed — i.e. how many POSTs the page
 * would have issued. This is the number that matters: every change restarts the
 * board's 800 ms nav pattern, so an over-eager rule is not a cosmetic problem.
 */
function navPosts(observations: readonly (MotionBearing | null)[], confirm?: number): number {
  let prev: MotionBearing | null = null;
  let n = 0;
  for (const e of emitted(observations, confirm)) {
    if (e !== prev) {
      n += 1;
      prev = e;
    }
  }
  return n;
}

describe("bearingFromBox", () => {
  it.each([
    [0.05, "left"],
    [0.2, "left"],
    [0.5, "center"],
    [0.8, "right"],
    [0.95, "right"],
  ] as const)("reads a centroid at %s as %s", (cx, expected) => {
    expect(bearingFromBox(boxAt(cx))).toBe(expected);
  });

  // The load-bearing difference from the detector. vision/service.py `_bearing`
  // splits on hard thirds, so it calls 0.32 "left"; for a walking instruction
  // that is noise, not a turn.
  it("is wider than the detector's thirds — 0.32 reads AHEAD, not LEFT", () => {
    expect(bearingFromBox(boxAt(0.32))).toBe("center");
    expect(bearingFromBox(boxAt(0.68))).toBe("center");
  });

  // Derived from the constant rather than hard-coded, so retuning AHEAD_BAND
  // moves the assertion with it instead of silently invalidating it.
  it("puts its boundaries exactly where AHEAD_BAND says", () => {
    const lo = 0.5 - AHEAD_BAND / 2;
    const hi = 0.5 + AHEAD_BAND / 2;
    expect(bearingFromBox(boxAt(lo - 1e-6))).toBe("left");
    expect(bearingFromBox(boxAt(lo + 1e-6))).toBe("center");
    expect(bearingFromBox(boxAt(hi - 1e-6))).toBe("center");
    expect(bearingFromBox(boxAt(hi + 1e-6))).toBe("right");
  });

  // A fabricated direction is worse than none: null flows into voteBearing as
  // "no target" and holds the last confirmed value rather than inventing a turn.
  it.each([
    ["missing", undefined],
    ["null", null],
    ["empty", [] as number[]],
    ["three-element", [0.1, 0.2, 0.3]],
    ["NaN", [NaN, 0, 0.5, 1]],
    ["Infinity", [0, 0, Infinity, 1]],
  ])("returns null for a %s box", (_label, box) => {
    expect(bearingFromBox(box)).toBeNull();
  });
});

describe("voteBearing", () => {
  it("needs three consecutive frames to acquire a target", () => {
    expect(emitted(rep(4, "left"))).toEqual([null, null, "left", "left"]);
  });

  it("needs three consecutive frames to change an established bearing", () => {
    const seen = emitted([...rep(3, "left"), ...rep(3, "right")]);
    expect(seen).toEqual([null, null, "left", "left", "left", "right"]);
  });

  it("needs three consecutive frames to drop a target", () => {
    const seen = emitted([...rep(3, "left"), ...rep(3, null)]);
    expect(seen).toEqual([null, null, "left", "left", "left", null]);
  });

  // THE case this rule exists for. The detector thresholds on hard thirds, so a
  // centroid sitting on a boundary alternates. A majority-of-3 vote over
  // left,center,left,center… yields left,center,left,center… — the same flap at
  // the same rate. Consecutive agreement never reaches three, so nothing is
  // emitted at all, which is the right answer for a target genuinely on the line.
  it("emits nothing across 60 frames of boundary flapping", () => {
    const flap = Array.from({ length: 60 }, (_, i) =>
      i % 2 === 0 ? "left" : ("center" as MotionBearing),
    );
    expect(navPosts(flap)).toBe(0);
    expect(emitted(flap).every((e) => e === null)).toBe(true);
  });

  it("holds an established bearing through 60 frames of boundary flapping", () => {
    const flap = Array.from({ length: 60 }, (_, i) =>
      i % 2 === 0 ? "left" : ("center" as MotionBearing),
    );
    const seen = emitted([...rep(3, "left"), ...flap]);
    // One POST for the acquisition, none thereafter.
    expect(navPosts([...rep(3, "left"), ...flap])).toBe(1);
    expect(seen.slice(3).every((e) => e === "left")).toBe(true);
  });

  // At 2 Hz a one-frame miss that cleared the command would re-send it 500 ms
  // later, restarting the board's 800 ms pattern every time.
  it.each([1, 2])("absorbs %i dropped detection frames without a POST", (dropped) => {
    const seq = [...rep(3, "left"), ...rep(dropped, null), ...rep(3, "left")];
    expect(navPosts(seq)).toBe(1);
    expect(emitted(seq).slice(3).every((e) => e === "left")).toBe(true);
  });

  it("resets the streak on a single disagreeing frame", () => {
    const seq: (MotionBearing | null)[] = ["right", "right", "left", "right", "right"];
    expect(emitted(seq).every((e) => e === null)).toBe(true);
  });

  it("is total and does not mutate its input state", () => {
    const before: BearingVote = { emitted: "left", candidate: "right", streak: 2 };
    const snapshot = JSON.stringify(before);
    voteBearing(before, "center");
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it("is pure — the same fold twice gives the same result", () => {
    const seq: (MotionBearing | null)[] = ["left", null, "left", "left", "center", "left"];
    expect(emitted(seq)).toEqual(emitted(seq));
  });

  it("honours a caller-supplied confirmFrames", () => {
    expect(emitted(rep(2, "right"), 1)).toEqual(["right", "right"]);
    expect(emitted(rep(4, "right"), 4)).toEqual([null, null, null, "right"]);
  });

  it("starts from a defined zero", () => {
    expect(initialBearingVote()).toEqual({ emitted: null, candidate: null, streak: 0 });
  });
});
