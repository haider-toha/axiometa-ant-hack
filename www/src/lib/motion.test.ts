import { describe, expect, it } from "vitest";

import type { UserActivity } from "@/lib/contract";
import {
  cadenceGate,
  classify,
  initialMotionState,
  MOTION_TUNABLES,
  readMagnitude,
  step,
  type MotionActivity,
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
 * fall outside the 350–850 ms band, and the positive test would fail for a
 * reason that has nothing to do with the classifier. A one-sided burst per step
 * is also closer to a real heel strike.
 *
 * `axis: "z"` puts the gait along gravity, which is the realistic geometry and
 * the only one where the accelerationIncludingGravity fallback sees the full
 * amplitude. Default amp 6 sits clearly above the ~3.35 m/s² effective raw
 * threshold — see audit 17 §"Classifier spec as built" before changing it.
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

  // Case 26 — the named dominant false positive [10 §6]. 0.8 Hz is deliberately
  // absent as a passing case; it is covered as a known limitation below.
  it.each([0.3, 0.5])("rejects 60 s of amp-4 camera panning at %s Hz", (panHz) => {
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
  // Case 7 — the positive case.
  it("reports MOVING for sustained 1.9 Hz walking", () => {
    const s = classify(walk(6000));
    expect(s.activity).toBe("MOVING");
    expect(s.peaks.length).toBe(4);
  });

  // Case 8 — issue #5 wants measured transition times. Asserted as a band so a
  // bench retune of the thresholds does not break the suite.
  it("enters MOVING inside the documented 2.0–3.5 s window", () => {
    const s = classify(walk(6000));
    expect(s.lastTransitionT).not.toBeNull();
    expect(s.lastTransitionT).toBeGreaterThanOrEqual(2000);
    expect(s.lastTransitionT).toBeLessThanOrEqual(3500);
  });

  // Case 4 — the debounce is real; two peaks is below minPeaks.
  it("does not fire on 900 ms of over-threshold motion", () => {
    const s = classify(walk(900));
    expect(s.activity).toBe("STILL");
    expect(s.peaks.length).toBe(2);
  });

  // Case 11 — a bare peak count would pass this; the interval test is what
  // rejects it.
  it("rejects a 6 Hz cadence", () => {
    const s = classify(walk(6000, { stepHz: 6 }));
    expect(s.activity).toBe("STILL");
    expect(s.peaks.length).toBe(0);
  });

  // Case 11b — the precise upper edge: 333 ms spacing, below stepMinMs.
  it("rejects a 3 Hz cadence, just outside the band", () => {
    expect(classify(walk(8000, { stepHz: 3 })).activity).toBe("STILL");
  });

  // Case 12 — the lower edge.
  it("rejects a 0.5 Hz cadence", () => {
    const s = classify(walk(9000, { stepHz: 0.5 }));
    expect(s.activity).toBe("STILL");
    expect(s.peaks.length).toBe(2);
  });

  // Case 12b — 72 steps/min, the documented design floor. A cautious walker
  // must not be excluded.
  it("admits the slowest designed-for walk at 1.2 Hz", () => {
    const s = classify(walk(9000, { stepHz: 1.2 }));
    expect(s.activity).toBe("MOVING");
    expect(s.lastTransitionT).toBeGreaterThanOrEqual(4500);
    expect(s.lastTransitionT).toBeLessThanOrEqual(7000);
  });

  // Case 27 — the interval-consistency rule on its own, independent of the fold.
  it.each([
    [[0, 400, 800], true],
    [[0, 400, 2000], false],
    [[0, 400], false],
    [[0, 300, 600], false],
  ] as const)("cadenceGate(%j) === %s", (peaks, expected) => {
    expect(cadenceGate(peaks, MOTION_TUNABLES)).toBe(expected);
  });
});

describe("hysteresis", () => {
  // Case 5 — fails immediately if entry and exit debounce were equal.
  it("does not flap when the signal oscillates across the gate", () => {
    const samples = chain(
      30,
      ...Array.from({ length: 10 }, () => [
        (t0: number) => walk(600, { t0 }),
        (t0: number) => rest(18, 30, t0),
      ]).flat(),
    );
    expect(classify(samples).activity).toBe("STILL");
    expect(flips(samples)).toBe(0);
  });

  // Case 9 — "placing it down returns to STILL". Exit ≈ 3.5 s = window drain
  // plus the 2 s debounce.
  it("returns to STILL after the phone is put down", () => {
    const samples = [...walk(6000), ...rest(300, 30, 6000)];
    const s = classify(samples);
    expect(s.activity).toBe("STILL");
    expect(s.lastTransitionT).toBeGreaterThanOrEqual(8500);
    expect(s.lastTransitionT).toBeLessThanOrEqual(10500);
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
  // away.
  it("misses perpendicular gait on the gravity fallback, as the geometry demands", () => {
    const samples = walk(8000, { axis: "x" }).map((s) => ({ ...s, acceleration: null }));
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

  // Case 18 — the wrap criterion. The reset fires on the first backwards sample.
  it("resets and resolves STILL when time goes backwards", () => {
    const samples = [...walk(6000), ...walk(2000, { t0: 1000 })];
    const s = classify(samples);
    expect(s.activity).toBe("STILL");
    expect(s.lastTransitionT).toBe(1000);
    expect(s.peaks.every((p) => Number.isFinite(p) && p >= 0)).toBe(true);
    expect(Number.isFinite(s.lastT)).toBe(true);
    expect(Number.isFinite(s.bias)).toBe(true);
    expect(Number.isFinite(s.smoothed)).toBe(true);
    expect(s.samples).toBeGreaterThan(0);
    expect(s.rejected).toBeGreaterThan(0);
  });

  // Case 19 — a backgrounded tab. A stale window must never assert MOVING.
  it("resets and resolves STILL across a 30 s gap", () => {
    const samples = [...walk(6000), ...walk(2000, { t0: 36000 })];
    const s = classify(samples);
    expect(s.activity).toBe("STILL");
    expect(s.lastTransitionT).toBe(36000);
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
  // time-constant EMA buys; a fixed-N moving average would fail it.
  it.each([10, 15, 20, 30, 60])("reaches MOVING at %i Hz delivery", (hz) => {
    const s = classify(walk(6000, { hz }));
    expect(s.activity).toBe("MOVING");
    expect(s.lastTransitionT).toBeGreaterThanOrEqual(2400);
    expect(s.lastTransitionT).toBeLessThanOrEqual(3100);
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

  // Case 24 — pins finding 1 as KNOWN behaviour rather than a bug found at
  // 2 a.m. The baseline EMA converges onto a one-sided magnitude's mean, so the
  // effective raw threshold is ~2.9× the configured one and amp 3 sits inside
  // the marginal band: it fires on the first-step transient, then loses it.
  it("fires and then reverts on a marginal amplitude", () => {
    const seen = transitions(walk(15000, { amp: 3 }));
    expect(seen.map((x) => x.activity)).toEqual(["MOVING", "STILL"]);
    expect(seen[0].t).toBeGreaterThanOrEqual(2000);
    expect(seen[0].t).toBeLessThanOrEqual(3500);
    expect(seen[1].t).toBeGreaterThanOrEqual(4500);
    expect(seen[1].t).toBeLessThanOrEqual(7000);
  });
});

// --- the known limitation, pinned rather than hidden ------------------------

describe("known limitations", () => {
  // The counterpart to case 26. A one-sided magnitude folds a 0.8 Hz pan to
  // 1.6 Hz peaks — 625 ms spacing, squarely inside the 350–850 ms gait band. No
  // cadence-based classifier can separate the two. This is asserted as a FLIP,
  // not as a pass, so that the manual control can never be argued away as
  // redundant. [audit 15 §finding 4]
  it("cannot distinguish a perfectly periodic 0.8 Hz camera pan from walking", () => {
    expect(flips(pan(60_000, { panHz: 0.8, amp: 4 }))).toBeGreaterThan(0);
  });
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
});
