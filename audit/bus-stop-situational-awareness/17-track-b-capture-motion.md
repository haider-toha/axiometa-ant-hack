# Track B — Capture Page and Motion Classifier

Date: 2026-07-18
Branch: `feat/relay-activity-contract`

## Scope

Track B of the STILL/MOVING activity contract: the phone-side half. Implements
`15-implementation-plan.md` §B1 and §B2 — the pure step-cadence classifier, its
unit suite, and the capture-page wiring that feeds it, gates it, and posts
transitions plus a 30 s heartbeat to `POST /api/activity`.

Three files, all under `www/`:

| Path | State |
|---|---|
| `www/src/lib/motion.ts` | NEW, 462 lines |
| `www/src/lib/motion.test.ts` | NEW, 505 lines, 48 tests |
| `www/src/app/capture/page.tsx` | MODIFIED, +309 / −1 |

Track A (`contract.ts`, `redis.ts`, `api/**`, `page.tsx`) landed in parallel and
is not audited here. `firmware/**` is untouched and was verified so.

This is demo logic against a synthetic waveform suite. **No phone was tested.**
Every amplitude threshold below is still a desk figure, and the permission
ordering — the single most load-bearing decision in this file — remains an
inference from WebKit's documented gesture window rather than an observation of
this API pair on hardware.

## What changed

### `www/src/lib/motion.ts` — NEW

Transcribed from the plan's §B1 complete listing. No re-derivation, no redesign.

| Lines | Symbol | Role |
|---|---|---|
| 24 | `MotionActivity` | Deliberate structural twin of `UserActivity`. The classifier imports nothing from `contract.ts` |
| 27–45 | `MotionVec3`, `MotionSample` | Flattened `devicemotion` event. Every field independently nullable |
| 47–103 | `MotionTunables`, `MOTION_TUNABLES` | The 14 tunables, table below |
| 107–139 | `MotionState` | Fold state. Stable shape so tests assert on internals |
| 141–163 | `initialMotionState` | The defined zero |
| 165–176 | `pickVec` | Magnitude `sqrt(x²+y²+z²)`, never an individual axis — invariant to the iOS/Android sign disagreement [10 §3] |
| 186–192 | `readMagnitude` | `acceleration` → `accelerationIncludingGravity` → `null`. Both null modes |
| 194–201 | `readRotationMagnitude` | Diagnostics only |
| 214–227 | `cadenceGate` | Peak count **and** consecutive in-band interval run |
| 229–245 | `clearWindow` | Window reset used by the gap/wrap path |
| 247–409 | `step` | The fold. Total — returns a state for every input, throws for none |
| 411–416 | `classify` | Array convenience for tests |
| 436–462 | `requestMotionPermission` | The only DOM-touching function, fenced at the bottom |

### `www/src/app/capture/page.tsx` — MODIFIED

The camera path is untouched. `detectorToEvent`, `sameEvent`, `tick`,
`drawBoxes`, `grabFrameB64`, `stop` and the whole detector UI are byte-identical;
capture still runs at 2 Hz in both phases and frame submission is not gated.

| Lines | Change |
|---|---|
| 9–29 | Imports — adds `ActivityState`/`UserActivity` from `contract`, five symbols from `motion` |
| 34–49 | `ACTIVITY_HEARTBEAT_MS = 30_000`, `DIAG_MS = 500` |
| 65 | `type ActivityMode = "off" \| "manual" \| "auto"` |
| 102–120 | Activity state hooks, including the `nowMs` clock (see deviation 1) |
| 122–128 | Refs: `activityRef`, `modeRef`, `motionRef`, `postInFlight`, `postPending`, `beatRef`, `postRef` |
| 140–171 | `postActivity` — in-flight serialisation, heartbeat re-armed in `finally` |
| 173–176 | `postRef` kept current |
| 179–196 | `applyActivity` — the single setter; drops sensor-sourced changes when not in `auto` or when `degraded` |
| 198–205 | `setManual` |
| 207–211 | `resumeSensor` (see deviation 2) |
| 216–235 | `devicemotion` listener → `step`; posts only on an activity CHANGE; diagnostics copied at `DIAG_MS` |
| 237–245 | `nowMs` interval |
| 247–252 | Heartbeat cleanup on unmount |
| 400–434 | `start` — **motion permission before `getUserMedia`** |
| 543–637 | The Activity section: manual buttons, six diagnostics, three advisory messages |
| 675–691 | `Diag` presentational helper |

Three deviations from the plan's listing, all deliberate:

1. **`Date.now()` moved out of the render body.** The plan's "Last change" field
   reads `Date.now()` inline in JSX. That is a lint error under
   `react-hooks/purity` (`pnpm run lint` exit 1, reproduced below) and it is also
   substantively wrong: a value read during render only refreshes when something
   *else* re-renders the page, so the age would sit frozen at whatever it
   happened to read on an unrelated update. Replaced with a `nowMs` state seeded
   in `applyActivity` — a callback, so neither impure nor an effect body — and
   ticked by a `DIAG_MS` interval that runs whether or not the sensor is granted,
   because a manual transition sets `lastTransitionAt` too.
2. **`resumeSensor` extracted.** The plan repeats the same three lines inline in
   `start` and in the "Resume sensor" button. Extracted to one `useCallback`.
   Behaviourally identical.
3. **The `MODAL_URL` comment is preserved.** The plan's constants block drops it;
   the omission is doc abbreviation, not intent.

## Classifier spec as built

Values are exactly the plan's. Status is carried forward from audit 10 and the
plan's §"Classifier spec", not re-litigated.

| Parameter | Value | Status |
|---|---|---|
| Signal | magnitude of `acceleration` | **GROUNDED** — immune to the iOS/Android `accelerationIncludingGravity` sign disagreement |
| Fallback signal | `accelerationIncludingGravity` magnitude, EMA-subtracted | **GROUNDED** — the null mode is per-spec and real |
| `smoothTauMs` | 100 ms | **GROUNDED** that walking is <5 Hz. The time-constant form (not fixed-N) is ASSUMED, chosen because delivered rate varies ~1–67 Hz |
| `biasTauMs` | 1500 ms | **ASSUMED-NEEDS-BENCH** |
| `peakProminence` | **1.2 m/s²** | **ASSUMED-NEEDS-BENCH.** No published figure exists for a phone in camera-aiming posture. The highest-value bench item after the permission test |
| `peakProminenceGravity` | **0.6 m/s²** | **ASSUMED-NEEDS-BENCH.** Must be separate and lower — the gravity-inclusive magnitude responds to a perpendicular gait component only in quadrature |
| `peakCooldownMs` | 300 ms | **GROUNDED** — permits 3.33 steps/s, above the fastest normal walking (2.3 Hz ⇒ 435 ms) |
| `stepMinMs` / `stepMaxMs` | 350 / 850 ms | **GROUNDED** — 1.4–2.3 Hz documented step frequency widened ~15% |
| `cadenceWindowMs` / `minPeaks` | 2500 ms / 3 | **GROUNDED** — demands 72 steps/min, below every documented normal cadence (slowest documented normal male: 81) |
| `minInBandIntervals` | 2 | **GROUNDED** — the part that separates walking from camera panning |
| `entryDebounceMs` | 1200 ms | **ASSUMED** — the gate already needs ~1.0–1.5 s of peaks, so total entry ≈ 2.5 s |
| `exitDebounceMs` | 2000 ms | **ASSUMED but well-reasoned** — tolerates two consecutive missed steps |
| `gapResetMs` | 2000 ms, and any `dt < 0` | **ASSUMED** |
| `minRateHz` | 10 Hz | **GROUNDED** — Nyquist needs >4 Hz for 2 Hz steps; prominence estimation wants ≥10 |
| `RATE_ALPHA` | 0.2 | **ASSUMED** — diagnostics only, gates nothing |

**The effective raw threshold is ~3.35 m/s², not 1.2.** A magnitude signal is
one-sided, so its mean is non-zero and the bias EMA converges onto it; the
measured smoothed-peak-to-raw-amplitude ratio is 0.358. A bench run that logs
first-step peaks rather than steady-state peaks will set this ~2.9× too high.
Test 24 pins the consequence.

### Measured against the plan's simulation

Every "Expected" in the plan's case table was reproduced exactly by this
implementation. Values dumped from the built module, then the harness deleted:

```
MEASURE 7/8 walk(6000) transitions   = ["MOVING@2466.666666666667"]     plan: ≈2467
MEASURE 7   walk(6000) peaks.length  = 4                                plan: 4
MEASURE 4   walk(900) peaks.length   = 2                                plan: 2
MEASURE 9   walk+rest transitions    = ["MOVING@2466.67","STILL@9466.67"]  plan: ≈9467
MEASURE 11  stepHz 6 peaks           = 0                                plan: 0
MEASURE 12  stepHz 0.5 peaks         = 2                                plan: 2
MEASURE 12b stepHz 1.2 transitions   = ["MOVING@5666.666666666667"]     plan: ≈5667
MEASURE 24  amp 3 transitions        = ["MOVING@2466.67","STILL@5766.67"]  plan: ≈2467 then ≈5767
MEASURE 23  hz=10  transitions       = ["MOVING@3000"]                  plan: 3000
MEASURE 23  hz=15  transitions       = ["MOVING@2466.666666666667"]     plan: 2467
MEASURE 23  hz=20  transitions       = ["MOVING@2500"]                  plan: 2500
MEASURE 23  hz=30  transitions       = ["MOVING@2466.666666666667"]     plan: 2467
MEASURE 23  hz=60  transitions       = ["MOVING@2450"]                  plan: 2450
MEASURE 20  hz=4 rateHz              = 4                                plan: ≈4
MEASURE 26  pan 0.3Hz transitions    = []                               plan: 0 flips
MEASURE 26  pan 0.5Hz transitions    = []                               plan: 0 flips
MEASURE 26  pan 0.8Hz transitions    = ["MOVING@2866.67","STILL@6800.00"]  plan: 2 flips
MEASURE 13  gravity axis z           = ["MOVING",2466.67,true]          plan: MOVING
MEASURE 13b gravity axis x           = ["STILL",0 peaks,true]           plan: STILL
MEASURE 18  backwards                = ["STILL",1000,1 rejected]        plan: lastTransitionT 1000
MEASURE 19  gap                      = ["STILL",36000,1 rejected]       plan: lastTransitionT 36000
```

The agreement is exact, including finding 5's rate sweep (3000 / 2467 / 2500 /
2467 / 2450) and finding 4's "2 flips at 0.8 Hz". Assertions in the suite are
written as **bands**, not points, so a bench retune does not break them.

## Verification

Run from `www/`, redirected to files rather than piped — a piped build has
previously reported exit 0 in this repo while failing.

```
$ pnpm exec tsc --noEmit ; echo "TSC   EXIT=$?"
TSC   EXIT=0

$ pnpm run lint ; echo "LINT  EXIT=$?"
$ eslint
LINT  EXIT=0

$ pnpm run test ; echo "TEST  EXIT=$?"
$ vitest run

 RUN  v4.1.10 /Users/haidertoha/Code/axiometa-ant-hack/www

 Test Files  5 passed (5)
      Tests  77 passed (77)
   Start at  23:14:59
   Duration  1.08s (transform 375ms, setup 613ms, import 590ms, tests 329ms, environment 2.51s)
TEST  EXIT=0

$ pnpm run build ; echo "BUILD EXIT=$?"
$ next build
▲ Next.js 16.2.10 (Turbopack)
- Environments: .env.local

  Creating an optimized production build ...
✓ Compiled successfully in 1061ms
  Running TypeScript ...
  Finished TypeScript in 1169ms ...
  Collecting page data using 9 workers ...
✓ Generating static pages using 9 workers (6/6) in 88ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/activity
├ ƒ /api/detector
├ ƒ /api/event
├ ƒ /api/pull
├ ƒ /api/state
├ ○ /capture
├ ○ /icon.png
└ ○ /output

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
BUILD EXIT=0
```

**All four exit 0.**

Test count: baseline **4 files / 29 tests** (measured on this branch before any
Track B file existed, exit 0) → **5 files / 77 tests**. The four pre-existing
suites — `web-serial`, `output-telemetry`, `output-dashboard`, `output-monitor` —
all still pass. `motion.test.ts` contributes 48.

### Two lint failures found and fixed, not worked around

`pnpm run lint` failed twice before reaching 0. Both are recorded because both
were real defects in the plan's listing, not style noise:

```
1. react-hooks/purity — capture/page.tsx:586:30
   Error: Cannot call impure function during render
   `Date.now` is an impure function.
   > 586 |  : `${((Date.now() - lastTransitionAt) / 1000).toFixed(0)}s ago`

2. react-hooks/set-state-in-effect — capture/page.tsx:236:5
   Error: Calling setState synchronously within an effect can trigger cascading renders
   > 236 |    setNowMs(Date.now());
```

Fix 1 introduced fix 2; the final shape seeds `nowMs` in `applyActivity` (a
callback) and leaves the effect owning only the interval.

### Scope constraints

```
$ git diff --stat origin/main -- firmware/
FIRMWARE UNTOUCHED: ok

$ test ! -e www/pnpm-workspace.yaml
not created: ok

$ git diff --stat HEAD -- www/package.json www/vitest.config.mts www/pnpm-lock.yaml
(empty — unchanged)
```

`vitest.config.mts` was not modified: no `resolve.alias`, no `vite-tsconfig-paths`,
no Vite downgrade. `@/` resolves through the shipped `resolve.tsconfigPaths` on
Vite 8, as it already did for the four existing suites.

## Test coverage table

48 tests, all passing. Numbering follows the plan's case table.

| # | Case | Assertion | Result |
|---|---|---|---|
| 1 | Cold start | `STILL`, `lastT`/`lastTransitionT` null, `peaks` empty, counters 0 | pass |
| 2 | Flat rest, 60 s | `STILL`, `flips === 0`, `lastTransitionT` null, 0 peaks | pass |
| 3 | Threshold is live | `peakProminence: 4.0` override → `STILL`, 0 peaks | pass |
| 3b | Default passes it | same waveform, defaults → `MOVING` | pass |
| 4 | Over threshold, too short | `walk(900)` → `STILL`, `peaks.length === 2` | pass |
| 5 | Oscillating across the gate | 10× (walk 600 / rest 600) → `STILL`, `flips === 0` | pass |
| 6 | Rotation spike only | one 900°/s sample in 10 s of rest → `STILL`, `flips === 0` | pass |
| 6b | Rotation diagnostic | mid-fold `rotationMagnitude` ≈ `sqrt(3)·900` | pass |
| 7 | Sustained walking | `walk(6000)` → `MOVING`, `peaks.length === 4` | pass |
| 8 | Transition latency | `lastTransitionT` in [2000, 3500]; measured 2466.7 | pass |
| 9 | STILL recovery | walk then rest → `STILL`, `lastTransitionT` in [8500, 10500]; measured 9466.7 | pass |
| 10 | Exit hysteresis | 1.5 s sub-threshold after walking → stays `MOVING` | pass |
| 11 | Cadence too fast | `stepHz: 6` → `STILL`, 0 peaks | pass |
| 11b | Cadence just too fast | `stepHz: 3` (333 ms) → `STILL` | pass |
| 12 | Cadence too slow | `stepHz: 0.5` → `STILL`, `peaks.length === 2` | pass |
| 12b | Slowest admitted walk | `stepHz: 1.2` → `MOVING` in [4500, 7000]; measured 5666.7 | pass |
| 13 | `acceleration` null, gravity present | axis z → `MOVING`, `usingGravityFallback === true` | pass |
| 13b | Gravity path, perpendicular gait | axis x → `STILL`, fallback still flagged | pass |
| 14 | Both channels null | `STILL`, `sensorUnavailable === true`, no throw | pass |
| 15 | Components individually null | `{x:1, y:null, z:3}` → falls to gravity, no throw | pass |
| 16 | NaN / Infinity / −Infinity | falls through to gravity, no throw (3 cases) | pass |
| 16b | `readMagnitude` channel reporting | reports `fromGravity` correctly, `null` when both dead | pass |
| 17 | Duplicate timestamps | `rejected === 1`, `smoothed` and `rateHz` finite, no throw | pass |
| 18 | Timestamp goes backwards | `STILL`, `lastTransitionT === 1000`, all fields finite/non-negative | pass |
| 19 | Large forward gap | 30 s gap → `STILL`, `lastTransitionT === 36000` | pass |
| 20 | Degraded rate | `hz: 4` → `degraded === true`, `rateHz ≈ 4`; still transitions | pass |
| 21 | Non-finite `t` | `rejected` +1, every other field byte-identical, no throw | pass |
| 22 | Purity | fold twice → deep-equal; input array unmutated | pass |
| 23 | Rate independence | 10/15/20/30/60 Hz → `MOVING`, all in [2400, 3100] | pass |
| 24 | Marginal-amplitude revert | `amp: 3` → `MOVING` ≈2467 then `STILL` ≈5767 | pass |
| 25 | Stationary noise sweep | `flips === 0` at ±0.05 / 0.15 / 0.3 / 0.6 m/s² | pass |
| 26 | Camera panning | 60 s amp-4 pan at 0.3 Hz and 0.5 Hz → `flips === 0` | pass |
| 26b | **0.8 Hz pan, pinned as a limitation** | asserts `flips > 0` — the inherent ambiguity, asserted so it cannot be argued away | pass |
| 27 | `cadenceGate` unit | `[0,400,800]` true; `[0,400,2000]`, `[0,400]`, `[0,300,600]` false | pass |
| 28 | Type identity | `UserActivity` ↔ `MotionActivity` mutually assignable | pass |

Two fixtures carry the load and are worth not "simplifying":

- `walk()` is a **half-wave rectified** sine. A full sine on one axis rectifies
  through the one-sided magnitude to double frequency, so a "1.9 Hz" fixture
  would present as 3.8 Hz and fall outside the gait band.
- `pan()` is a **full** sine, for exactly that reason — the frequency doubling is
  the mechanism under test. 0.8 Hz folding to 1.6 Hz is why case 26b exists.

## Permission ordering verdict

**CONFIRMED: motion is requested before `getUserMedia`, and
`requestPermission()` is issued synchronously before the handler's first await.**

`capture/page.tsx:400-419`:

```tsx
  const start = useCallback(async () => {
    setError("");

    // 1. MOTION FIRST. It is the only one of the two that needs the gesture, and
    //    requestPermission() is issued synchronously inside requestMotionPermission
    //    before its own first await, so the API call lands in the same task as
    //    the click. Awaiting getUserMedia first would burn WebKit's ~1 s
    //    activation window on a human-answered camera dialog and make this
    //    reject with NotAllowedError. [10 §2]
    const permission = await requestMotionPermission();
    setMotionPermission(permission);
    if (permission === "granted") resumeSensor();

    // 2. CAMERA SECOND. getUserMedia requires a secure context and permission
    //    but not transient activation, so it is safe after the await above.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
```

Line 409 is the first `await` in the handler. Mechanically verified:

```
$ grep -n "requestMotionPermission\|getUserMedia\|const start = useCallback" src/app/capture/page.tsx
400:  const start = useCallback(async () => {
409:    const permission = await requestMotionPermission();
416:      const stream = await navigator.mediaDevices.getUserMedia({
```

Inside `requestMotionPermission` (`motion.ts:436-462`) everything before the
await is synchronous — two `typeof` guards and a property read — so
`request.call(DeviceMotionEvent)` executes in the same task as the click and
holds the transient activation:

```ts
  if (typeof DeviceMotionEvent === "undefined") return "unsupported";
  const request = (
    DeviceMotionEvent as unknown as { requestPermission?: () => Promise<PermissionState> }
  ).requestPermission;
  if (typeof request !== "function") return "granted";
  try {
    const state = await request.call(DeviceMotionEvent);
```

Feature detection is `typeof request !== "function"`, never a UA sniff, and the
identifier itself is guarded first because a bare `DeviceMotionEvent` reference
is a `ReferenceError` — not `undefined` — on a browser without the interface.
`.call(DeviceMotionEvent)` preserves `this`, which extracting the method loses.
Android/Chrome, where the method is absent, resolves `"granted"` and listens
immediately.

**This is code-level confirmation, not hardware confirmation.** See residual risk.

## Grounding notes

Carried from audit 10; nothing new was researched for this pass.

- Ordering: https://bugs.webkit.org/show_bug.cgi?id=198040 — "We currently bound
  the user gesture duration to 1s" (Youenn Fablet). Still open.
- No gesture required for `getUserMedia`:
  https://github.com/w3c/mediacapture-extensions/issues/11 is an open proposal to
  *add* one, i.e. none exists today.
- Null modes and the Android sign inversion: https://www.w3.org/TR/orientation-event/
  (components independently nullable), https://yal.cc/js-device-motion/.
- Delivered rate: https://github.com/w3c/sensors/issues/98 — "varying 67 Hz
  (drops down to 1 Hz sometimes)". Open. This is why `event.timeStamp` is the
  only clock and why `minRateHz` exists.
- Cadence band: https://pmc.ncbi.nlm.nih.gov/articles/PMC6029645/ (115.2 steps/min
  real-world mean; 81–135 male lifespan range),
  https://pmc.ncbi.nlm.nih.gov/articles/PMC4634483/ (1.6–2.1 steps/s walking).
- Amplitude order of magnitude only:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC4180224/ — waist-mounted, ±2 g
  suffices at 1–2 m/s. **Nothing published covers a phone in camera-aiming
  posture**, which is the posture this feature runs in.

## Residual risk

**A periodic camera pan near 0.8 Hz is indistinguishable from walking.** Not a
tuning bug and not fixable by tuning: the one-sided magnitude folds a 0.8 Hz
sweep to 1.6 Hz peaks — 625 ms spacing, squarely inside the 350–850 ms gait band.
No cadence-based classifier can separate them. Aperiodic panning at 0.3–0.5 Hz
rejects cleanly in simulation (0 flips over 60 s), and real panning is aperiodic,
but the failure exists and test 26b asserts it rather than hiding it. **This is
the load-bearing reason the manual STILL/MOVING control is always visible and is
the primary control, not a fallback.** The buttons are rendered unconditionally,
before any permission is requested, and every sensor failure mode degrades to
exactly them.

**The amplitude thresholds are guesses and the suite only bounds them.** 1.2 /
0.6 m/s² are reasoned from waist-mounted literature's order of magnitude. The
48 tests prove the algorithm behaves sanely across a wide sweep of *synthetic*
waveforms; they say nothing about what a real phone emits. Resolves with a 60 s
logging run in capture posture — 30 s standing and panning, 30 s walking — set
between the two populations, near 40% of the median walking peak. **Log
steady-state peaks, not first steps**, or the threshold lands ~2.9× too high.

**The permission ordering is unproven on a real iPhone.** The 1-second window is
documented for `getDisplayMedia`; applying it to
`DeviceMotionEvent.requestPermission` is inference from the shared transient
activation mechanism. It is a strong inference and the ordering is safe either
way, but it is inference. One HTTPS test on the venue phone settles it in ten
minutes and remains the single highest-value bench check.

**The gravity fallback has never run on a device that actually needs it.** Tests
13 and 13b exercise the path with synthetic samples, so it is not dead code — but
no phone returning null `acceleration` was available, and
`peakProminenceGravity` is therefore doubly unmeasured. Test 13b documents that
perpendicular gait legitimately misses at amp 6: the magnitude swing collapses to
1.69 m/s². A phone tilted into camera-aiming posture sits between the two axes
tested.

**A degraded sensor is silent to the board by design.** `applyActivity` drops
sensor-sourced transitions when `motionRef.current.degraded`, so below 10 Hz the
relay simply stops being updated and the last posted value ages against the
120 s lease. The classifier still transitions internally — it reports, the page
decides — and the "Rate" diagnostic turns destructive-coloured. But nobody
watching the phone from a stage will see that. The manual buttons remain live.

**Two permission prompts is a stage risk regardless of ordering.** Grant both
before going on, and do not reload the page.

**Backgrounding the tab stops the event stream on Android, probably on iOS.**
`gapResetMs` resolves the state to STILL rather than freezing MOVING (test 19),
which is the safe direction for the bus gate but the wrong one for a walk in
progress — STILL during a walk means guidance commands are gated off.

**`contract.test.ts` is unowned.** The plan's §"File locations" assigns it to
Track B, but this agent's brief scoped Track B's test domain to files covering
`motion.ts` and `capture/page.tsx` only. It was therefore not written, and Track
A did not write it either. The plan's contract case table — 14 rows, including
row 10 (`normActivitySeq(Date.now()) === ACTIVITY_SEQ_MAX`, the executable form
of the single easiest way to silently kill this feature) and row 13 (`sameEvent`
regression, the guard that activity stayed off `EventRequest`) — **has no
automated coverage on this branch.** It needs an owner.

**The capture page has no component-level test.** The permission ordering, the
in-flight POST serialisation, and the heartbeat re-arm are verified by reading
the code and by lint/tsc, not by execution. The ordering in particular is the
kind of thing a future refactor can invert without any check failing.

**Nothing here is accessibility or field validation.** The two-phase gate is demo
logic. The buzzers remain audible proxies with no proven tactile separation, and
the cane remains the primary mobility aid.
