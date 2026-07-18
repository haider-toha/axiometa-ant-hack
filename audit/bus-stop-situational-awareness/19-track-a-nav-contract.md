# Track A — Navigation Contract

Date: 2026-07-19
Branch: `feat/relay-activity-contract`

## Scope

Carry `LEFT` / `RIGHT` / `AHEAD` on the existing `/api/event` → Redis →
`/api/pull` path, and give Track B a pure bearing → pattern translator to import.
Track A owns the contract and the API layer only; Track B (`capture/page.tsx`,
`motion.ts`) and Track C (`firmware/**`) landed in parallel in the same working
tree.

| Path | State |
|---|---|
| `www/src/lib/contract.ts` | MODIFIED, +103 / −5 |
| `www/src/app/api/event/route.ts` | MODIFIED, +14 / −0 (comment only) |
| `www/src/lib/contract.test.ts` | MODIFIED, +269 / −0 · 86 → **155 tests** |

`www/src/lib/redis.ts` is **untouched**. It was listed as in-domain "only if
genuinely required" and it was not: `writeCommand()` stores `pattern` as an
opaque string and `readCommand()` reads it back the same way, so both widened
with the type and neither has a pattern-specific branch to update. The
`mset`-before-`incr` race fix is byte-identical. `/api/pull`, `/api/state`,
`/api/activity` and `/api/detector` are untouched for the same reason.

## What changed

### `www/src/lib/contract.ts`

| Lines | Symbol | Change |
|---|---|---|
| 6–24 | `PatternId` | `+ "LEFT" \| "RIGHT" \| "AHEAD"` as P11–P13. These already exist in `patterns.h` as step tables and are what the board reports in `Telemetry.playing` while a nav pattern runs, so the union was previously lying about a value the board could already send |
| 26–54 | `CloudPattern` | Same three added. Doc records the firmware coupling: `parseCloudCommand()` is a `strcmp` chain and an unknown spelling becomes `CloudCommand::INVALID`, which `consumeRelayCommand()` turns into `REJECT` **before** `acceptsRelayCommand()` is consulted |
| 62–82 | `CLOUD_PATTERNS` | Same three appended. This is the `/api/event` accept-list |
| 85–96 | `isCloudPattern` | **No change — confirmed, not assumed.** See below |
| 352–375 | `bearingToPattern` | **NEW.** `left → LEFT`, `right → RIGHT`, `center → AHEAD` |
| 377–403 | `sameEvent` | **No logic change.** Doc extended with the nav truncation hazard and the obligation it places on the caller |

**`isCloudPattern` needed no edit, and that was verified rather than assumed.**
Both halves widen from elsewhere: the runtime half is a membership test over
`CLOUD_PATTERNS`, so it widened when the three values were appended; the type
half is a hand-written `v is CloudPattern` predicate, so it widened with the
union. The live smoke below confirms it end-to-end — `"LEFT"` returns 200 and
`"left"` returns 400.

The one thing that *was* missing is a guard on the two lists staying in sync.
`CLOUD_PATTERNS: readonly CloudPattern[]` already prevents an entry outside the
union; nothing prevented a union member being missing from the array, which is
the quiet direction — a pattern TypeScript calls legal that `/api/event` answers
with `400 unknown pattern`. `contract.test.ts:158` now closes it with a
`satisfies Record<CloudPattern, true>` census (fails to compile on a missing key
*or* an extra one) plus runtime assertions in both directions. This is the same
class of hazard as the `mget` alignment note in `redis.ts` — "add to all three or
none".

### `www/src/app/api/event/route.ts` — comment only, no behaviour change

Nav patterns already passed the accept gate once `CLOUD_PATTERNS` widened, and
the `NUMBER` route-validation branch at :53 is guarded on
`event.pattern === "NUMBER"` so it cannot touch them. Verified live.

Lines 22–36 add a **do-not-add marker** recording why there is no server-side
activity/pattern consistency check, so the next agent does not add one as
"defence in depth": the board owns that decision in `acceptsRelayCommand()` and
has to, because it is the half that still works with the Wi-Fi down. A second
gate can only agree (dead code) or disagree — and on disagreement the relay
silently swallows a command the board would have accepted, with the 400 landing
on the phone where nobody is looking. Activity also travels on its own
independently versioned channel with a 120 s lease, so "current activity" at the
moment of an `/api/event` POST is a different value from the one the board gates
against 300 ms later.

### `www/src/lib/contract.test.ts` — +69 tests, 0 deletions

`git diff -U0 -- src/lib/contract.test.ts | grep '^-'` returns nothing: every one
of the original 86 tests is byte-identical and passing.

| Lines | Block | Tests |
|---|---|---|
| 144–217 | Nav fixtures: the `CloudPattern` census, `NAV_CASES`, `NAV`, and `NOT_A_PATTERN` near-misses | — |
| 349–383 | `isCloudPattern` — accepts all 9, rejects 21 near-misses, and the two-way `CLOUD_PATTERNS` ≡ `CloudPattern` guard | 35 |
| 385–436 | `bearingToPattern` — all three bearings, totality, purity, and that its output is accepted by `isCloudPattern` | 15 |
| 491–571 | `sameEvent > navigation patterns` — the edge-trigger cases, below | 19 |

35 + 15 + 19 = 69, which accounts for the whole delta: every new test lands in one
of these three blocks and nothing was inserted elsewhere.

**The new tests were mutation-checked, not just observed passing.** Three
mutations against `contract.ts`, each reverted:

| Mutation | Caught by |
|---|---|
| drop `"LEFT"` from `CLOUD_PATTERNS` | 5 tests |
| `bearingToPattern` always returns `AHEAD` | 3 tests |
| `sameEvent` stops comparing `pattern` | 14 tests |

## The exact `/api/pull` JSON for a LEFT command

Observed, not derived — `GET /api/pull` against the live Upstash relay
immediately after `POST /api/event {"pattern":"LEFT",…,"arrivalId":7}`:

```json
{"seq":27,"pattern":"LEFT","route":"","dest":"","conf":"","arrivalId":7,"ts":1784415959908,"activity":"MOVING","activitySeq":18,"activityTs":1784415106876}
```

Key order is unchanged: the activity trio still serialises last, after `ts`,
matching RELAY-FOR-FIRMWARE.md. `route` and `conf` are empty strings for a nav
command — the board's `RelayConfidence` parser maps `""` to `NO_CONFIDENCE`, and
the `NUMBER`-only route/confidence branches in `consumeRelayCommand()` never fire
for a bearing.

Note `activitySeq` and `activityTs` are **identical** to their pre-smoke values
across all four command writes. The independence rule holds for nav commands: a
command write does not touch the activity channel.

## `sameEvent` verdict for nav patterns

**Correct as written. No change needed — but it is not sufficient on its own, and
the remaining obligation is Track B's.**

`sameEvent` compares `pattern`, `route`, `conf`, `arrivalId`. `pattern` is among
them, so:

- repeated identical `LEFT` → `true` → **no re-POST**. Required.
- `LEFT → RIGHT` (and all six ordered nav pairs) → `false` → posts. Required.
- `LEFT → BUS`/`NUMBER`/`WAIT`/`UNKNOWN`/`ERROR`/`NONE` → `false` → posts.
- `dest` change on a nav command → `true`. Correct; the device never sees `dest`.

Why this is correctness rather than hygiene for nav specifically: `LEFT_STEPS`
and `RIGHT_STEPS` in `patterns.h` total **800 ms**, `AHEAD_STEPS` totals
**1000 ms**, against `CAPTURE_MS = 500` in `capture/page.tsx:30`. A re-POST of an
unchanged bearing bumps `seq`, the board restarts the table at step 0, and no nav
pattern ever reaches its second pulse — LEFT and RIGHT both collapse into one
continuous buzz on one channel and stop being distinguishable from each other,
permanently, for as long as the bearing holds. Which is exactly when the signal
matters.

**The obligation this places on Track B:** `sameEvent` also compares `route`,
`conf` and `arrivalId`, so those must be **stable across ticks that carry the
same bearing**. Deriving `arrivalId` from a frame counter, a tick index or
`Date.now()` would make every tick a new event and reintroduce the exact
truncation the edge-trigger prevents. `contract.test.ts:530` pins that case, and
`:544` runs the whole loop end to end — seven capture ticks, bearing changing
twice, asserting exactly three POSTs.

## Verification

All four commands run from `www/`, output pasted verbatim.

```
$ pnpm exec tsc --noEmit
EXIT: 0

$ pnpm run lint
$ eslint
EXIT: 0

$ pnpm run test
$ vitest run

 RUN  v4.1.10 /Users/haidertoha/Code/axiometa-ant-hack/www

 Test Files  6 passed (6)
      Tests  258 passed (258)
   Start at  00:06:45
   Duration  1.06s (transform 354ms, setup 836ms, import 442ms, tests 266ms, environment 3.15s)

EXIT: 0

$ pnpm run build
$ next build
▲ Next.js 16.2.10 (Turbopack)
- Environments: .env.local

  Creating an optimized production build ...
✓ Compiled successfully in 1159ms
  Running TypeScript ...
  Finished TypeScript in 1225ms ...
  Collecting page data using 9 workers ...
✓ Generating static pages using 9 workers (6/6) in 85ms
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

EXIT: 0
```

**On the test count.** Baseline was 163. The suite is now 258, but **only 69 of
that +95 is Track A**: `contract.test.ts` went 86 → 155, and Track B's
`motion.test.ts` went 48 → 74 concurrently in the same working tree. Per-file
counts at the time of the final run: `contract.test.ts` 155, `motion.test.ts` 74,
`output-telemetry` 12, `output-dashboard` 8, `web-serial` 5, `output-monitor` 4.
Every one of the 163 baseline tests still passes.

### Live relay smoke

Local dev server on port 3007 (port 3000 was already held by another track),
against the real Upstash instance.

```
### 1. lowercase "left" must be REJECTED (board strcmps exactly) ###
HTTP 400
{"error":"unknown pattern"}

### 2. POST /api/event  pattern=LEFT ###
HTTP 200
{"seq":27,"stored":"LEFT"}

### 3. GET /api/pull  — what the ESP32 receives ###
{"seq":27,"pattern":"LEFT","route":"","dest":"","conf":"","arrivalId":7,"ts":1784415959908,"activity":"MOVING","activitySeq":18,"activityTs":1784415106876}

### 4. POST /api/event  pattern=RIGHT  (bearing change must advance seq) ###
HTTP 200
{"seq":28,"stored":"RIGHT"}
{"seq":28,"pattern":"RIGHT","route":"","dest":"","conf":"","arrivalId":7,"ts":1784415960006,"activity":"MOVING","activitySeq":18,"activityTs":1784415106876}

### 5. AHEAD ###
POST HTTP 200
pull pattern: AHEAD seq: 29
```

Relay state was snapshotted before the smoke and restored after. Field-by-field
diff after restore:

```
pattern      before='WAIT'                 after='WAIT'                 OK
route        before=''                     after=''                     OK
dest         before=''                     after=''                     OK
conf         before=''                     after=''                     OK
arrivalId    before=1                      after=1                      OK
activity     before='MOVING'               after='MOVING'               OK
activitySeq  before=18                     after=18                     OK
activityTs   before=1784415106876          after=1784415106876          OK
seq          before=26                     after=30                     monotonic +4 (expected: 4 writes)
```

`seq` is monotonic and cannot be rewound without a direct `SET`; it advanced by
exactly the four successful writes. The board handles this through
`consumeRelayCommand()`'s `sequenceGap` / `missedCount` path — it logs a gap and
carries on.

### Cross-track vocabulary check

Track C landed the firmware side in parallel. Extracting the `strcmp` literals
from the working-tree `parseCloudCommand()` and diffing against `CLOUD_PATTERNS`:

```
=== diff (empty means the two vocabularies are identical, in order) ===
IDENTICAL — 9 patterns on both sides
```

The predicted blocker — `parseCloudCommand()` returning `INVALID` for the three
new strings, which `consumeRelayCommand()` rejects *before* `acceptsRelayCommand()`
is ever consulted — **does not apply.** Track C extended the `CloudCommand` enum
(`relay_pure.h:22-24`), `parseCloudCommand()` (:107-109), `acceptsRelayCommand()`
via `isBearingCommand()` (:149-150) and `cloudCommandName()` (:343-345), and
updated `test_relay.cpp` accordingly. Firmware tests were not run here — that is
Track C's verification, not Track A's.

## Residual risk

1. **This contradicts the plan, and the plan has not been changed.**
   `plan/…:502` reads "Directionality is cut. LEFT, RIGHT, AHEAD … have no relay
   trigger or demo step", and `15-implementation-plan.md:144` records the
   decision as "**Do not add them**", justified by `parseCloudCommand("LEFT") ==
   INVALID`. `AGENTS.md §Current Target` says the opposite — "Navigation is
   first-class scope … `MOVING` (LEFT/RIGHT/AHEAD guidance)". This work follows
   AGENTS.md. The justification in 15 is now stale (Track C changed the parser),
   but **the plan is the authoritative build target per AGENTS.md and it still
   says the feature is cut.** Someone should correct `plan/…:502`, the
   Revision-e note at :27, and `15-implementation-plan.md:144`/:217, or this
   lands as an undocumented deviation that the next agent will "fix" by deleting
   it.

2. **The relay is a single-slot, last-write-wins store, and nav commands raise
   the collision rate.** `writeCommand()` overwrites one set of Redis keys. If
   two commands are written inside one ~300 ms board poll, the first payload is
   gone — the board detects the `seq` gap and logs `missedCount`, but the command
   itself never existed as far as it is concerned. This is pre-existing, but it
   was low-risk while commands were rare (a bus arrival). Nav commands fire on
   every bearing change at a 500 ms tick, so a `BUS` or `NUMBER` posted just
   before a bearing change can now be overwritten before the board sees it. The
   board's severity arbitration cannot help: the command is lost in Redis, not
   dropped by arbitration. Not fixed here — fixing it means a queue, which is a
   contract change, not a Track A patch.

3. **No server-side activity gate, by design — so the board is the only thing
   standing between a nav command and the user's wrist.** If Track C's
   `acceptsRelayCommand()` is wrong in the permissive direction, the relay will
   not catch it. This is the correct split (local safety stays local) but it does
   concentrate the risk in one place, and that place is only exercised by
   Track C's host tests.

4. **`bearingToPattern`'s totality is untested against the real producer.** The
   `AHEAD` fallback handles an out-of-contract bearing, and `coerce.ts:asBearing`
   already resolves unknown bearings to `"center"` on the `/api/detector` path —
   but nothing in this track verifies what Modal actually emits in the
   no-target case. Track B owns the extraction of a bearing from `ModalResponse`
   (`detections[].target` / `targetBearing`), and `DetectorState.targetBearing`
   is typed `Bearing | ""` — that empty string is a real value that must not be
   translated into a command at all. `bearingToPattern("")` returns `AHEAD`,
   which is safe as a degradation but wrong as a decision. **Track B must not
   call it when there is no target.**

5. **`Telemetry.playing` is still an unchecked cast.** `coerce.ts:25` does
   `str(b?.playing, "NONE") as PatternId` with no membership test. Widening
   `PatternId` made the type honest about LEFT/RIGHT/AHEAD, but the runtime path
   would accept any string. Pre-existing, debug-screen-only, not touched.
