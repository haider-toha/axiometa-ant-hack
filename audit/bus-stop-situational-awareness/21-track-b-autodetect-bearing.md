# 21 — Track B: automatic walk detection, and bus bearing → nav command

Branch `feat/relay-activity-contract`. Track B of a three-track parallel pass.
Track A owned `www/src/lib/contract.ts` and `www/src/app/api/**`; Track C owned
`firmware/`. Both had landed by the time this was verified.

## Scope

Two defects reported from a bench test of the previous build: *"I thought the
entire point was that as I walk around it detects am I still or moving. I don't
understand any of this. And when I open the camera, if there's a bus, it should
tell me the directions to it and send that to the ESP."*

Target platform is **iPhone Safari**. Layout, tap targets and section ordering
are for a phone held in one hand. Desktop was not a consideration.

Files changed — nothing outside these three:

- `www/src/app/capture/page.tsx`
- `www/src/lib/motion.ts`
- `www/src/lib/motion.test.ts`

## Defect 1 — motion sensing was gated behind the camera

### What was wrong

`mode` started `"off"`, and the only caller of `resumeSensor()` was `start()` —
the "Start camera" button. `applyActivity` drops every sensor input unless
`modeRef.current === "auto"`, so opening `/capture` and walking around did
literally nothing, and the manual Still/Moving buttons looked like the whole
feature. The entire page was also wrapped in the `NEXT_PUBLIC_MODAL_URL` guard,
so an unconfigured detector hid walk detection too.

### What changed

**`page.tsx:378` — new `startMotion()`.** Requests DeviceMotion permission and
enters auto mode, with no camera involved. `requestMotionPermission()` is the
first statement in the body so that `DeviceMotionEvent.requestPermission()` is
issued synchronously inside the click's task, holding WebKit's ~1 s transient
activation window (audit 10 §2).

**`page.tsx:753` — the primary control.** A full-width `size="lg"` button,
"Start motion detection", rendered whenever `mode === "off"`. It sits in the
first card on the page.

**`page.tsx:635` — `start()` now delegates.** The camera button calls
`await startMotion()` before `getUserMedia`, preserving the motion-before-camera
ordering. One refinement: `startMotion` only claims the mode when
`modeRef.current === "off"` (`page.tsx:385`), so starting the camera does not
silently overrule a user who has deliberately selected the manual override.

**Activity card moved out of the `MODAL_URL` guard.** Walk detection needs
neither a camera nor a deployed Modal service. The detector banner now says so
explicitly ("Walk detection above is unaffected").

### Defect 2 — auto was not the default

`resumeSensor()` sets `mode = "auto"` on grant, so auto is what runs once
permission exists. The manual buttons remain, relabelled **"Force still" /
"Force moving"** under a **"Manual override"** subheading with a top border
(`page.tsx:765`), and they only render as `variant="default"` while
`mode === "manual"` — in auto they are outline buttons, so they read as an
escape hatch rather than as the state display. The prior instruction that made
manual "primary, not fallback" is reversed. The honest caveat is kept verbatim
next to the buttons, because it is still true:

> A steady ~0.8 Hz camera pan is indistinguishable from walking, so the override
> always stays available.

### A third bug found while fixing the first

`applyActivity` only ever runs on a **transition**. A freshly reset classifier
already believes `STILL`, so a user who granted permission and then stood still
produced no transition, no POST, no heartbeat — the board was never told
anything at all. Meanwhile the on-screen state sat on the component's initial
`"MOVING"`, which is the wire contract's fail-safe default for a *missing* value
and not something anything measured. **The page would have read WALKING while
standing at a bus stop.**

`resumeSensor` (`page.tsx:356`) now asserts the classifier's belief on entry.
That is the honest claim, it starts the 30 s lease heartbeat, and a real walk
overrides it within ~2.5 s.

## Feature — bus bearing → LEFT / RIGHT / AHEAD

`ModalResponse.detections[].bearing` and `.target` already existed; nothing was
wired to a command. Track A supplied `bearingToPattern(b: Bearing)`.

### Where the logic lives

Both rules are pure and live in `motion.ts` (`AHEAD_BAND`, `bearingFromBox`,
`BearingVote`, `BEARING_CONFIRM_FRAMES`, `initialBearingVote`, `voteBearing` —
`motion.ts:437–541`), tested in `motion.test.ts`. `motion.ts` was previously
only the DeviceMotion classifier; its module docstring now describes it as the
capture page's two pure folds. Two reasons for that home rather than a new
module: the assigned file domain for this track was exactly three files, and a
new `lib/` file risked colliding with a parallel track; and the bearing rule is
the same *kind* of thing — a total fold over a noisy per-frame signal — so
keeping both here means every debounce rule on this page is unit-testable
without rendering a component or faking a camera.

`MotionBearing` is declared locally and structurally identical to the contract's
`Bearing`, matching the existing discipline that this module imports nothing
from the wire contract. `motion.test.ts` pins the mutual assignability, mirroring
the existing `MotionActivity`/`UserActivity` case 28.

### Stabilisation rule, and why

Two rules doing two different jobs. **They are not redundant** — the first picks
the right answer, the second stops it changing its mind.

**1. Widened AHEAD band (`AHEAD_BAND = 0.44`, `motion.ts:461`).**

Ground truth, read from the service rather than assumed —
`vision/service.py:811`:

```python
def _bearing(cx: float, width: int) -> str:
    """Horizontal centroid against frame thirds, from the DECODED width."""
    third = width / 3.0
    if cx < third: return "left"
    if cx < 2.0 * third: return "center"
    return "right"
```

Hard thirds, no deadband. That is fine for logging which side a hazard was on
and wrong for telling a walking user which way to turn: it commits to LEFT for a
centroid at 0.32, and for a bus that fills a third of the frame that is not a
turn instruction, it is noise. `bearingFromBox` re-derives from the same
normalised box with a 44 %-wide centre band (0.28–0.72), so AHEAD is the answer
under ambiguity. AHEAD is the cheap mistake; a spurious LEFT walks someone
toward the kerb. This agrees with the direction Track A documented on
`bearingToPattern` ("An unreadable bearing must degrade to *keep going*, never
to a confident turn instruction").

**Honest limitation:** widening the band does **not** on its own stop flapping.
It relocates the threshold; a centroid hovering on the *new* boundary flaps
identically. That is what rule 2 is for.

**2. Consecutive-agreement hold (`BEARING_CONFIRM_FRAMES = 3`, `motion.ts:502`).**

> Any change to the emitted bearing — including acquiring a target and losing
> one — requires 3 consecutive frames agreeing on the new value. A single
> disagreeing frame resets the count.

A best-of-N majority vote was the obvious alternative and was rejected on
analysis. Given a centroid on a threshold, the raw sequence is
`left, center, left, center…`; a majority-of-3 over that yields
`left, center, left, center…` — **the same flap rate, just delayed**. Requiring
*consecutive* agreement never reaches three of anything on that input, so the
emitted bearing simply holds, which is the correct answer for a target that
genuinely is on the line. `motion.test.ts` pins this over 60 synthetic frames:
zero nav POSTs from a cold start, exactly one (the acquisition) when already
established.

The same rule absorbs a dropped detection. At the 2 Hz capture rate a one-frame
miss that cleared the command would re-send it 500 ms later, restarting the
board's 800 ms LEFT pattern every time and truncating it permanently — the
failure Track A documented on `sameEvent`. Tested for 1 and 2 dropped frames.

Three frames is ~1.5 s at 2 Hz. Counted in **frames, not milliseconds**,
deliberately: the unit of evidence is a detection, and a slow detector gives
fewer opinions, not worse ones. See Residual risk.

### Wiring (`page.tsx:554–615`)

Per frame: find the `target` detection, `bearingFromBox` → `voteBearing` → a
confirmed bearing. Then a **single** command stream, so the nav path and the bus
path cannot fight over the one relay slot:

```ts
const navPattern: NavPattern | null =
  vote.emitted && activityRef.current === "MOVING" ? bearingToPattern(vote.emitted) : null;

const event: EventRequest = navPattern
  ? { pattern: navPattern, route: "", dest: "", conf: "", arrivalId: 0 }
  : detectorToEvent(m);

if (!sameEvent(event, lastEventRef.current)) { /* POST /api/event */ }
```

Three things worth naming:

- **`arrivalId: 0`, never `m.arrival_id`.** `sameEvent` compares `arrivalId`, so
  carrying a live arrival counter on a direction would make every re-latched
  arrival a new event and re-POST an unchanged LEFT. Track A's own docstring
  states the obligation: `route`, `conf` and `arrivalId` must be *stable* across
  ticks carrying the same bearing. A direction is not about an arrival.
- **Edge-triggered through the existing `sameEvent` discipline**, not a second
  mechanism.
- **Directions are the MOVING payload.** The board enforces the same split in
  `acceptsRelayCommand` (Track C). This is the phone agreeing with it, not a
  second independent gate — and per Track A the relay deliberately does not gate
  server-side, because two gates that can disagree are worse than one.
  `navPattern` is null while STILL, so the bus payload flows as before.

### Making it visible

New **"Direction to the bus"** card (`page.tsx:867`), between the camera and the
detections list, showing the whole decision chain so "it isn't doing anything"
and "it decided AHEAD" are distinguishable:

- Arrow glyph + the pattern word (`LEFT` / `AHEAD` / `RIGHT` / `NO BUS`).
- Live status line: *No bus in view* → *Bus in view — confirming (2/3)* →
  *Sent to the board* → *Directions are only sent while you are MOVING*.
- Four readouts: **Bus in view**, **Box centre** (the raw centroid), **Detector
  says** (the detector's own hard-thirds answer), **Last sent** (the last nav
  command that actually left the phone, flagged red if it failed).

"Detector says" is deliberately kept on screen: the widened band *will*
disagree with it near the thirds, and showing both makes that a visible design
decision rather than a confusing bug.

Page order is now Activity → Camera → Direction → In view → Bus → **Bench
diagnostics**. Every existing diagnostic is retained — sensor-vs-relay two-up,
cadence/spm, peaks, rate, rotation, permission, and the `POST /api/activity`
log — moved below the two things the page is actually for.

## Verification

Real output, from `www/`. All four exit 0.

```
=== pnpm exec tsc --noEmit ===
exit=0

=== pnpm run lint ===
$ eslint
exit=0

=== pnpm run test ===
$ vitest run

 RUN  v4.1.10 /Users/haidertoha/Code/axiometa-ant-hack/www


 Test Files  6 passed (6)
      Tests  258 passed (258)
   Start at  00:14:48
   Duration  1.45s (transform 546ms, setup 1.09s, import 691ms, tests 411ms, environment 4.53s)

exit=0

=== pnpm run build ===
$ next build
▲ Next.js 16.2.10 (Turbopack)
- Environments: .env.local

  Creating an optimized production build ...
✓ Compiled successfully in 1420ms
  Running TypeScript ...
  Finished TypeScript in 1341ms ...
  Collecting page data using 9 workers ...
✓ Generating static pages using 9 workers (6/6) in 79ms
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

exit=0
```

Baseline before this work was 6 files / 163 tests, tsc exit 0. The count is now
258 because Tracks A and C landed their own tests into the same worktree
meanwhile. This track's own contribution to `motion.test.ts` is **48 → 74
tests**, +26, covering `bearingFromBox` band edges and malformed boxes, and
`voteBearing` acquisition, change, drop, boundary flapping, dropped frames,
purity and non-mutation. Both ends of that measured rather than inferred —
`git show HEAD:www/src/lib/motion.test.ts` run in isolation gives 48, the
current file gives 74:

```
$ pnpm exec vitest run src/lib/tmp-baseline.test.ts     # HEAD version
 Test Files  1 passed (1)
      Tests  48 passed (48)

$ pnpm exec vitest run src/lib/motion.test.ts           # current
 Test Files  1 passed (1)
      Tests  74 passed (74)
```

`react-hooks/purity` and `react-hooks/refs` are enforced here and both have
bitten this file before. No `Date.now()` was added to a render body — the nav
POST timestamp is captured in the callback and rendered via
`toLocaleTimeString()` — and no `ref.current` is read during render; `nav` and
`lastNav` are React state written from callbacks.

### Behavioural verification of defect 1

Static checks cannot show that motion starts without the camera, so the page was
rendered and driven. A temporary harness at
`www/src/app/capture/tmp-verify.test.tsx` stubbed `fetch`, set
`navigator.mediaDevices = undefined`, rendered `CapturePage`, and clicked
**Start motion detection**:

```
 RUN  v4.1.10 /Users/haidertoha/Code/axiometa-ant-hack/www

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  00:14:16
```

It asserted: the hero reads `OFF` before the click and `STILL` after (not the
`MOVING` default — the third bug above); the mode badge reads `auto`;
`POST /api/activity` fired with body `{"activity":"STILL"}`; the "Manual
override" group is present and clicking **Force still** switches the badge to
`override`. Because vitest does not load `.env.local`, `NEXT_PUBLIC_MODAL_URL`
was empty for that run, so the camera/detector half of the page **was not
rendered at all** and walk detection still ran end to end — the strongest
available form of the claim.

The harness was **deleted** afterwards: this track's assigned file domain was
three files, and adding a fourth risked colliding with a parallel track. See
Residual risk — it is worth re-adding deliberately.

### What was NOT verified

- **No run on a real iPhone.** The iOS permission prompt, the delivered
  DeviceMotion rate, and the actual walk→MOVING latency on device are all
  unmeasured here. A dev server was started for a browser pass but the available
  Chrome instance was not on the same host and could not reach `localhost:3000`.
- **No end-to-end run against a real bus, a live Modal deployment, or the
  board.** The bearing path is verified as pure logic plus a type-checked
  integration, not as observed hardware behaviour.

## Residual risk

1. **`AHEAD_BAND = 0.44` is ASSUMED, not measured.** No bench walk has tuned it.
   If AHEAD swallows real turns, narrow it; the constant is one number with a
   test that derives its assertions from it, so retuning moves the tests with it.
2. **Confirmation is counted in frames, not time.** At the nominal 2 Hz that is
   ~1.5 s, but the `inFlight` guard means a slow detector reduces the frame rate,
   stretching confirmation in wall-clock time. A detector at 0.5 Hz makes it 6 s.
3. **Acquisition latency is ~1.5 s.** A bus that appears and is gone within three
   frames emits nothing. Deliberate, and the safer direction.
4. **A persistent boundary hover emits nothing at all.** By design — but the UI
   shows "confirming (n/3)" rather than a direction, and a user could read that
   as a failure. It is the classifier declining to guess.
5. **Stopping the camera does not clear a held direction.** `stop()` resets the
   local vote but does not POST a clearing command, so the board keeps the last
   nav pattern until something else changes it. Pre-existing behaviour for the
   bus payload too; not changed here, but it is a real demo hazard.
6. **`activityRef` is sampled once per frame.** A MOVING→STILL flip mid-frame is
   acted on at the next tick, up to 500 ms later.
7. **No regression test on the page component.** The harness above passed and was
   then removed to respect the file boundary; a copy is at
   `capture-page.test.tsx.kept` in this session's scratchpad. Re-adding it as
   `www/src/app/capture/page.test.tsx` would lock defect 1 shut permanently, and
   is the single highest-value follow-up here.
8. **The board's half is unverified from this side.** Whether `LEFT`/`RIGHT`/
   `AHEAD` are accepted while MOVING is Track C's; whether `/api/event` accepts
   them is Track A's. Both had landed and `tsc` agrees on the contract, but no
   request was pushed through the deployed relay to the board.
