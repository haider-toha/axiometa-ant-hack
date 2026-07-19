# 24 — Motion sensitivity bias: MOVING on any real movement

2026-07-19, third motion retune, after audits 22 (cadence band) and 23
(STILL-phase bearings). Demo hardcode from a stated user requirement; read
audit 22's caveats before treating any number as measured truth.

## The requirement, in the user's words

> "I have to walk quite fast for it to detect that I'm walking … any kind of
> movement we detect, we should say that it's walking … still should be when
> it's like really, really still."

Audit 22 fixed the *cadence* rejection (slow inter-peak intervals), but the
bench still demanded a hard walk. The remaining limiter was **amplitude**: a
1.2 m/s² prominence on the smoothed signal is an effective ~3.4 m/s² raw
threshold (audit 17's ~2.9× raw→smoothed factor), which gentle walking does
not reach. The fix biases the whole gate toward MOVING.

## Change (www/src/lib/motion.ts, `MOTION_TUNABLES`)

| tunable | was | now | effect |
| --- | --- | --- | --- |
| `peakProminence` | 1.2 | **0.45** | effective raw threshold ~3.4 → ~1.3 m/s²; gentle walking registers |
| `peakProminenceGravity` | 0.6 | **0.25** | same bias on the no-gyro fallback channel |
| `minPeaks` | 3 | **2** | half the evidence to enter |
| `minInBandIntervals` | 2 | **1** | one plausible interval suffices |
| `entryDebounceMs` | 1200 | **500** | entry ~1.2–1.8 s from the first step (was ~2.5–4.5 s) |
| `stepMaxMs` | 1700 | **2000** | a 2 s shuffle (30 peaks/min) is admitted |

Unchanged: smoothing/bias taus, 300 ms cooldown, `stepMinMs` 350, window
5000 ms, exit debounce 2000 ms, gap reset, degraded-rate rule.

## What the suite says survives the bias (all measured, 289/289)

- **Genuinely still is still STILL**: flat rest and ±0.05–0.6 m/s² random
  noise over 60 s produce zero flips — random jitter cannot fake even the
  reduced periodicity through the EMA smoothing.
- **The cadence gate is biased, not abolished**: a 6 Hz shake still rejects
  (cooldown-aliased 333 ms spacing sits below `stepMinMs` — with 15 peaks in
  the window, so the interval rule alone does the work), and 0.4 Hz
  (2.5 s spacing) still rejects. 0.5 Hz now sits exactly at the ceiling and
  is admitted.
- **Gentle walk regression**: amp 1.5 and 2 (vs the old ~3.4 effective
  threshold) classify MOVING; amp 3, formerly marginal-then-reverting, is now
  one clean entry.
- **Entry**: 1233–1800 ms across 10–60 Hz delivery rates.
- **Clock resets still fail safe**: backwards time and a 30 s gap resolve
  STILL at the reset instant; the faster entry then legitimately re-detects a
  continuing walk ~1.7 s later (the tests now pin the full sequence).
- **Intermittent movement holds**: 900 ms bursts every 2.4 s produce one
  entry and no flapping.

## Accepted costs, deliberately taken

1. **Hand tremor can read as MOVING.** Holding the phone up while scanning may
   produce two plausibly-spaced peaks. Consequence on the board: MOVING
   suppresses BUS/NUMBER, so route-88 output needs the user genuinely still —
   or the **Force still** override on the capture page, which is the escape
   hatch. Directions are unaffected (bearings deliver in both phases since
   audit 23).
2. **The pan false positive widens again** (any two folded peaks 350–2000 ms
   apart). Same mitigation as audits 15/22: the manual override.
3. Exit is unchanged (~4–6 s of genuine stillness before STILL), which is the
   direction the user asked the bias to point.

Verification: `www` tsc, lint, 289/289 vitest, build. No firmware change —
the board consumes activity; it does not classify.
