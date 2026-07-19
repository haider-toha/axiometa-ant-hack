# 22 — Demo retune: slow-cadence walk detection, and a nav force-send override

Branch `feat/relay-activity-contract`, 2026-07-19. Bench-driven fixes for the
two defects reported after the audit-21 build: *"motion detection is stuck on
STILL even when walking"* and *"pointing the camera at a bus should tell the
user which direction to go."* Everything here is a **demo hardcode**, chosen
from one bench observation, not a measured retune across devices. Read this
before trusting any number below as ground truth.

## Defect 1 — the classifier rejected real walking

On a real phone the diagnostics panel showed **peaks being accepted at 40–50
per minute while walking** ("Sensor sees … 40–50 spm"), yet the state never
left STILL. That readout is derived from *accepted* peaks, so the amplitude
path (prominence, smoothing, bias) was working; the failure was the cadence
band. 40–50 peaks/min is 1200–1500 ms between peaks, and `stepMaxMs` was
850 ms — every real inter-peak interval fell outside the accepted band, the
in-band-interval run never started, and `cadenceGate` refused forever.

The likely physical cause: the magnitude channel on a hand-held phone often
registers only every **other** heel strike (stride rate, not step rate) — a
normal ~90–110 steps/min walk presents as ~45–55 peaks/min. The audit-10/17
band was derived from step-rate literature (1.4–2.3 Hz) and never re-checked
against what the phone actually reported.

### Change (www/src/lib/motion.ts, `MOTION_TUNABLES`)

| tunable | was | now | why |
| --- | --- | --- | --- |
| `stepMaxMs` | 850 | **1700** | admits 40 peaks/min (1500 ms) with ~13% jitter margin |
| `cadenceWindowMs` | 2500 | **5000** | scaled ×2 with the band so 3 peaks at the slowest admitted cadence fit (2 × 1700 = 3400 < 5000) |

Nothing else changed: prominence, cooldown, `stepMinMs` 350, `minPeaks` 3,
`minInBandIntervals` 2 and both debounces are untouched, so the *shape* of the
gate (periodicity, not amplitude) is intact.

### Accepted costs, deliberately taken

1. **The pan false positive is wider.** A full-sine pan at `f` folds through
   the one-sided magnitude to peaks at `2f`. The old band caught pans of
   ~0.59–0.8 Hz; the new band catches ~0.3–1.4 Hz. Slow deliberate panning
   while standing at the stop can now read as walking. Mitigation is unchanged
   and load-bearing: the manual override on the capture page
   (audit 15 §finding 4 already established no cadence classifier can separate
   a periodic pan from a walk).
2. **Exit is slower.** Peaks linger in the doubled window, so after the last
   step the gate stays true until the window drains below `minPeaks`
   (up to ~4 s at a 526 ms step interval, ~2 s at 1500 ms) and only then does
   the 2 s exit debounce start. STILL now lands ~4–6 s after stopping, which
   delays the bus-information half opening by the same amount. Judged
   acceptable for the demo.
3. **The gravity-fallback quadrature miss shrank.** Amp-6 gait perpendicular
   to gravity (1.69 m/s² compressed swing) now scrapes past the gate because
   the longer window collects enough marginal peaks. A sensitivity gain, but
   it means the "misses perpendicular gait" limitation is only demonstrable at
   lower amplitudes now.

### Test changes (www/src/lib/motion.test.ts)

Every edit preserves the behaviour under test; none of the logic assertions
were weakened:

- **New regression test (case 12c)** — a 0.667 Hz (40 peaks/min) walk must
  classify MOVING. This is the exact bench failure, pinned.
- Pan rejection rows moved from 0.3/0.5 Hz to 0.1/0.2 Hz (the folded peaks
  must land beyond `stepMaxMs` to reject); 0.3/0.5/0.8 Hz all now live in the
  known-limitations block, asserted as flips so the manual override can never
  be argued away.
- Peak-count pins re-measured for the doubled window: 4 → 9 (1.9 Hz walk),
  0 → 3 (6 Hz alias — now a live demonstration that the *interval* rule does
  the rejecting, since the count alone reaches `minPeaks`), 2 → 3 (0.5 Hz).
- `cadenceGate` table: the out-of-band row is `[0, 400, 2200]` (1800 ms gap)
  since 1600 ms is now legitimately in-band, and a `[0, 1500, 3000]` → true
  row pins the slow-walk acceptance at the unit level.
- Hysteresis oscillation fixture rest gap 600 → 1800 ms: the old 1200 ms burst
  period is *inside* the new band (a slow walk — correct detection, not flap),
  so the fixture now oscillates at a genuinely out-of-band period.
- Timing bands re-measured: put-down exit 8.5–10.5 s → 11–13 s; marginal-amp
  revert 4.5–7 s → 7–9.5 s; 1.2 Hz entry 4.5–7 s → 2.5–4.5 s (its ~866 ms
  quantised intervals used to straddle the old 850 ms edge and delay entry —
  they are now comfortably in-band).
- Perpendicular-gravity-fallback fixture pinned at amp 3 (0.45 m/s² compressed
  swing, unambiguously below the 0.6 prominence) per cost 3 above.

`cd www && pnpm test` — 262/262 pass.

## Defect 2 — camera bearing → board directions

Verified end-to-end, and the path was **already wired correctly**:

- `capture/page.tsx` finds the target box, derives a bearing
  (`bearingFromBox`, widened AHEAD band), debounces it (`voteBearing`,
  3 consecutive frames), maps it (`bearingToPattern` → `LEFT`/`RIGHT`/`AHEAD`)
  and POSTs `/api/event` edge-triggered.
- `/api/event` accepts all three (`CLOUD_PATTERNS`), writes payload-then-seq
  to Redis; `/api/pull` serves them; firmware `parseCloudCommand` knows all
  three strings and `acceptsRelayCommand` plays them **only while relay
  activity is MOVING** (`relay_pure.h`).

So the defect was real but *upstream*: with the classifier stuck on STILL
(defect 1), the page's own `activityRef.current === "MOVING"` guard suppressed
every nav command, silently. Fixing defect 1 fixes the normal path.

### Added: force-send override + explicit suppressed/sent UI

Demo insurance in `capture/page.tsx`:

- **Force send** toggle in the "Direction to the bus" card. When on, the page
  POSTs the confirmed bearing to `/api/event` regardless of local activity.
  It deliberately does **not** touch the board's own gate — the board still
  drops bearing commands unless the *relay* says MOVING, so the UI copy tells
  the operator to pair it with the existing **Force moving** override for
  end-to-end output while standing still. One gate owner (the board), one
  demo bypass per half, no server-side second gate — consistent with the
  audit-19 decision in `/api/event`.
- A **Command** readout cell that always answers the demo question directly:
  `LEFT · sent`, `LEFT · suppressed` (red), or `none`, plus a status chip
  (`sending` / `force-send on` / `suppressed · needs MOVING`) and an explicit
  suppression sentence naming the untransmitted command. A suppressed
  direction and a dead detector are no longer visually identical.

## Also fixed in this pass

- Vercel project env: the deployed relay needs `UPSTASH_REDIS_REST_URL`,
  `UPSTASH_REDIS_REST_TOKEN` and `NEXT_PUBLIC_MODAL_URL`; synced from the
  local `www/.env.local` via `vercel env` (values themselves stay uncommitted;
  only the empty `.env.example` is tracked).

## Not done / residual

- No representative-user or multi-device validation of the new band; 1700/5000
  is one phone, one bench.
- The wider pan false positive is documented, not solved — it is unsolvable at
  the classifier level (audit 15 §finding 4).
- The stride-rate hypothesis (why the phone sees half the heel strikes) is
  untested; if a future phone reports full step rate (~100 peaks/min ≈ 600 ms
  intervals), the band still admits it, so the retune is monotonic-safe.
