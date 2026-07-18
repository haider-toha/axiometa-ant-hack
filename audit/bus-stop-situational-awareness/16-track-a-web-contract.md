# Track A — Web Relay Contract

Date: 2026-07-18
Branch: `feat/relay-activity-contract`

## Scope

Track A of the STILL/MOVING activity contract: the relay half. Implements
`15-implementation-plan.md` §A1–A4 — the `UserActivity` vocabulary and its
normalisers, the independently versioned `writeActivity()`/`readCommand()` pair,
the new `POST /api/activity` route, and the debug screen's activity readout.

**This audit was reconstructed after the fact.** The implementing agent died on
an API error before writing it, so nothing here is a self-report. It is a review
of the diff as it stands, written by a second agent that did not produce the
code, plus verification runs and a live relay smoke performed during that review.
Where the original author's intent is not recoverable from the diff or its
comments, this file says so rather than guessing at it.

One consequence of that failure is carried forward as work, not just narrative:
the plan's `contract.test.ts` was assigned to Track B, scoped out of Track B's
brief, and never reached by Track A. Audit 17 flagged it as unowned. It is
written now and documented in its own section below.

| Path | State |
|---|---|
| `www/src/lib/contract.ts` | MODIFIED, +98 / −2 (305 lines) |
| `www/src/lib/redis.ts` | MODIFIED, +87 / −5 (196 lines) |
| `www/src/app/api/activity/route.ts` | NEW, 45 lines |
| `www/src/app/page.tsx` | MODIFIED, +35 / −2 (205 lines) |
| `www/src/lib/contract.test.ts` | NEW this pass, 453 lines, 86 tests |

Track B (`motion.ts`, `motion.test.ts`, `capture/page.tsx`) landed in parallel and
is audited in 17. `firmware/**` is untouched. `www/package.json`,
`www/vitest.config.mts` and `www/pnpm-lock.yaml` are unchanged.

## What changed

### `www/src/lib/contract.ts` — MODIFIED

One insertion block after `isCloudPattern`, and one doc/shape change to
`DeviceCommand`. `EventRequest`, `sameEvent`, `detectorToEvent`, `PatternId`,
`CloudPattern`, `ROUTE_RE` and every Modal type are untouched.

| Lines | Symbol | Role |
|---|---|---|
| 43–56 | `UserActivity` | `"STILL" \| "MOVING"`. Doc records that the board `strcmp`s these exactly and that the firmware enum was reordered, so the ordinal must never be serialised |
| 58–60 | `isUserActivity` | Exact, case-sensitive guard. No trimming, no casefolding |
| 62–79 | `normActivity` | Defaults **MOVING**. READ path only |
| 81–86 | `ACTIVITY_SEQ_MAX` | `4294967295`, named because the ceiling is the hazard |
| 88–107 | `normActivitySeq` | Coerce → finite check → truncate → floor at 0 → clamp at ceiling |
| 109–124 | `ActivityState` | The independently versioned trio, split out so the independence rule is visible in the type system |
| 135–155 | `DeviceCommand` | Now `extends ActivityState`. Doc records that the activity trio serialises last |

### `www/src/lib/redis.ts` — MODIFIED

`writeCommand()` (53–72) is byte-identical, MSET-before-INCR intact.

| Lines | Change |
|---|---|
| 9–11 | Value import of `normActivity`/`normActivitySeq`, kept separate from the `import type` clause because `isolatedModules` is on |
| 12–20 | Type import adds `ActivityState`, `UserActivity` |
| 74–103 | `writeActivity()` — NEW. MSET `activity` + `activityTs`, then INCR `activitySeq`. Writes none of `seq`, `ts`, `pattern`, `route`, `dest`, `conf`, `arrivalId` |
| 105–143 | `readCommand()` — one `mget` widened from 7 keys to 10 |
| 155–163 | The activity trio added to the returned object, after `ts` |

The widened `mget` is the sharpest edge in this diff and the author flagged it in
a comment: three lists (destructuring bindings, the generic tuple, the key
arguments) must stay index-aligned, and a key list *shorter* than the tuple
compiles clean and silently shifts every field after the gap. TypeScript does not
check this — the generic is a bare assertion.

### `www/src/app/api/activity/route.ts` — NEW

45 lines. `POST` parses JSON, guards with `isUserActivity`, and **rejects** an
unrecognised value with 400 rather than defaulting. The asymmetry with
`normActivity`'s permissive read path is deliberate and documented in the file:
the board needs a well-formed field even when Redis is empty, but the phone is
the only writer and a typo there must be loud. `OPTIONS` delegates to the shared
`preflight()`. No `GET`.

### `www/src/app/page.tsx` — MODIFIED

Debug screen only; no relay logic.

| Lines | Change |
|---|---|
| 13–17 | `ACTIVITY_LEASE_MS = 120_000`, mirroring `CLOUD_ACTIVITY_LEASE_MS` |
| 22, 39 | `activityAgeMs` state, computed per poll from `device.activityTs` |
| 94–99 | `activity` rendered next to the pattern, since the board gates one on the other |
| 101 | Field grid `sm:grid-cols-4` → `sm:grid-cols-3` to fit two new fields |
| 110–119 | `Activity seq` and `Activity age` fields; age goes destructive past the lease |
| 186–200 | `Field` gains an optional `alert` prop |

## Contract conformance

Captured live from a dev server on this branch against the project's real Upstash
instance — not derived from the source:

```jsonc
{"seq":24,"pattern":"NONE","route":"","dest":"","conf":"","arrivalId":3,
 "ts":1784412639606,"activity":"MOVING","activitySeq":3,"activityTs":1784412639430}
```

154 bytes, against the 768-byte ceiling `net.cpp` imposes on the whole response
[14 §"Four constraints"]. Field order matches `RELAY-FOR-FIRMWARE.md` — the
activity trio last, after `ts` — so curl output stays diffable against the handoff
spec. His parser is key-lookup based, so order cannot break it either way.

**(a) Both `activity` and `activitySeq` always emitted.** Confirmed.
`readCommand()` returns them unconditionally: `normActivity(activity)` and
`normActivitySeq(activitySeq)` are total functions over `unknown`, so a null from
`mget` on an empty relay produces `"MOVING"` and `0` rather than an absent key.
This matters more than it looks — the board requires
`activity.is<const char*>() && activitySeq.is<uint32_t>()` **together**, and if
either is missing it skips the entire activity block silently.

**(b) `activity` is a JSON string `"STILL"`/`"MOVING"`.** Confirmed above on the
wire. The type admits nothing else, `normActivity` returns nothing else, and the
POST route rejects anything else with 400. The firmware enum ordinal is never
serialised.

**(c) `activitySeq` is a number within `uint32_t`.** Confirmed.
`normActivitySeq` truncates to an integer, floors negatives at 0, and clamps at
`ACTIVITY_SEQ_MAX`. Asserted over the plan's whole input table against a
hand-written copy of ArduinoJson's predicate — deliberately not written in terms
of `ACTIVITY_SEQ_MAX`, so the assertion cannot follow the constant if someone
edits it.

**(d) `activitySeq` strictly monotonic.** Confirmed live, with one honest
exception. Monotonicity is produced by Redis `INCR` (atomic, server-side) and
*preserved* rather than created by `normActivitySeq`; the plan's row 12 pins that
the normaliser does not collapse distinct values. Observed increment 3 → 4 in the
smoke below.

The exception: at the ceiling the clamp maps every value ≥ `ACTIVITY_SEQ_MAX` to
`ACTIVITY_SEQ_MAX`, so strict monotonicity ends there and the board's
`activitySeq > lastActivitySeq` edge would stall permanently. That is inherent to
clamping and the source comment accepts it — 4.29e9 INCRs is ~4,000 years at the
30 s heartbeat. Recorded because "strictly monotonic" is not unconditionally true,
not because it is reachable.

**(e) MSET-before-INCR preserved.** Confirmed by reading, in both writers.
`writeCommand()` is byte-identical to its pre-branch form. `writeActivity()`
repeats the discipline for the same reason, with the reasoning spelled out in its
docstring: a poll landing between MSET and INCR reads the new activity with the
old counter and ignores it, which is harmless and self-corrects on the next poll
300 ms later, whereas the reverse order would fire the board on a counter
pointing at the *previous* activity value. **This ordering has no automated
test** — see residual risk.

**(f) `/api/event` unchanged as a faithful pipe.** Confirmed mechanically:

```
$ git diff --stat -- www/src/app/api/
(empty — /api/event, /api/pull, /api/state, /api/detector all unmodified)
```

`/api/pull` picks up the activity trio purely because `readCommand()` returns it;
the route file itself did not change. `/api/event` still validates the pattern,
downgrades an undeliverable `NUMBER` to `UNKNOWN`, and writes a command. It has
no activity vocabulary at all, which is the point.

**(g) The activity default direction.** `normActivity` defaults to **MOVING**,
not STILL. This inverts audit 11 and issue #5, both of which predate Sebastian's
firmware, and the plan records the inversion as a decision at Q9 so it is not
relitigated.

The justification is that the relay must fail in the same direction as the board.
`effectiveActivity()` in `relay_pure.h` returns `MOVING` when cloud activity is
UNKNOWN or its 120 s lease has expired, and `acceptsRelayCommand()` rejects
everything except NONE and ERROR unless activity is exactly `STILL`. So on the
board, absent activity already means "show nothing" — not "show bus info". A
relay defaulting to STILL would disagree with the device about what silence
means, and the disagreement would surface as the bus gate opening on a walking
user whenever Redis was empty.

Note the live capture above shows `"MOVING"` because that is the **written**
value at `activitySeq` 3, not because a default fired. The default path is
exercised only by the unit tests, which drive it with 14 malformed inputs.

## `contract.test.ts` — the unowned suite, now written

`www/src/lib/contract.test.ts`, 453 lines, 86 tests, all 14 rows of the plan's
case table. Colocated per §"File locations", following `motion.test.ts`
conventions. `vitest.config.mts`, `package.json` and every Vite/vitest version
are untouched.

| # | Target | Coverage | Result |
|---|---|---|---|
| 1 | `isUserActivity` | `"STILL"`, `"MOVING"` → true | pass |
| 2 | | 14 rejects: case variants, whitespace-padded, `""`, `null`, `undefined`, `42`, the firmware enum ordinal `2`, `{}`, `["STILL"]`, `true` | pass |
| 3 | `normActivity` | `"STILL"` → `"STILL"` | pass |
| 4 | | `"MOVING"` → `"MOVING"` | pass |
| 5 | | all 14 malformed inputs → `"MOVING"`, never `"STILL"` | pass |
| 6 | `normActivitySeq` | `0`, `1`, `41`, `4294967295` identity | pass |
| 7 | | `-1`, large negative, `NaN`, `±Infinity`, `null`, `undefined`, `"abc"`, `{}` → `0` | pass |
| 8 | | `"41"` → `41` | pass |
| 9 | | `41.7` → `41`; `0.9` → `0` | pass |
| 10 | | **`Date.now()` → `ACTIVITY_SEQ_MAX`**, plus `Date.now() > ACTIVITY_SEQ_MAX` asserted separately, plus the clamped output re-checked against the uint32 predicate | pass |
| — | | ceiling boundary: `MAX` identity, `MAX + 1` clamps — pins `>` against drifting to `>=` | pass |
| 11 | uint32 bound | the predicate over every input in rows 6–10 pooled | pass |
| 12 | monotonicity | `[0,1,2,41,4294967294,4294967295]` maps to itself, strictly increasing | pass |
| 13 | `sameEvent` | identity; false on each of pattern/route/conf/arrivalId; true when only `dest` differs; type-level guard that `activity` is not a key of `EventRequest`; runtime guard that two events carrying different `activity` values still compare equal | pass |
| 14 | `detectorToEvent` | all five branches, both precedence orders, four NONE boundaries, six UNKNOWN causes, four deliverable route shapes, key-shape check per branch, non-mutation | pass |

Two notes on how rows 10 and 13 are written, since both are easy to write
vacuously:

- Row 10 asserts its own premise. `expect(now).toBeGreaterThan(ACTIVITY_SEQ_MAX)`
  runs before the clamp assertion, so if a ms epoch ever stopped exceeding the
  ceiling the test would say so rather than passing for the wrong reason.
- Row 13's type guard is `type WithoutActivity<T> = "activity" extends keyof T ? never : T`.
  It collapses to `never` for a required *or optional* `activity`, so the field
  cannot be reintroduced quietly as optional.

### No defect found — and the suite was mutation-tested to show that means something

**All 14 rows passed on the first run against unmodified source. No bug was found
in `contract.ts`, and nothing was adjusted to make a test pass.**

A suite that goes green immediately is indistinguishable from a suite that
asserts nothing, so the three load-bearing guards were checked by breaking the
source and confirming the failure. `contract.ts` was restored from a byte-exact
backup after each and verified identical (`diff` → no output).

| Mutation | Result |
|---|---|
| `normActivity` default flipped `"MOVING"` → `"STILL"` | **14 tests fail**, exit 1 |
| `normActivitySeq` clamp removed (`return i`) | **3 tests fail**, exit 1 |
| `activity?: UserActivity` added to `EventRequest` | **`tsc` exit 2** — `src/lib/contract.test.ts(292,11): error TS2322: Type '{ activity?: UserActivity; ... }' is not assignable to type 'never'` |

The third is the one worth noting: it fires at compile time, on the *optional*
form, which is the shape someone would most plausibly use to sneak activity back
onto the command path.

## Verification

Run from `www/`, each redirected to its own file — never piped, because a piped
build has previously reported exit 0 in this repo while failing.

```
$ pnpm exec tsc --noEmit ; echo "TSC   EXIT=$?"
TSC   EXIT=0
```

```
$ pnpm run lint ; echo "LINT  EXIT=$?"
$ eslint
LINT  EXIT=0
```

```
$ pnpm run test ; echo "TEST  EXIT=$?"
$ vitest run

 RUN  v4.1.10 /Users/haidertoha/Code/axiometa-ant-hack/www


 Test Files  6 passed (6)
      Tests  163 passed (163)
   Start at  23:28:42
   Duration  1.11s (transform 295ms, setup 874ms, import 379ms, tests 284ms, environment 3.59s)
TEST  EXIT=0
```

```
$ pnpm run build ; echo "BUILD EXIT=$?"
$ next build
▲ Next.js 16.2.10 (Turbopack)
- Environments: .env.local

  Creating an optimized production build ...
✓ Compiled successfully in 1351ms
  Running TypeScript ...
  Finished TypeScript in 1288ms ...
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

**All four exit 0.** `ƒ /api/activity` appears in the route table, which is the
proof the new route was picked up.

Test count: **5 files / 77 tests** before this pass (measured on this branch,
exit 0) → **6 files / 163 tests**. `contract.test.ts` contributes 86. The five
pre-existing suites — `web-serial`, `output-telemetry`, `output-dashboard`,
`output-monitor`, `motion` — all still pass.

### Live relay smoke

Against the real Upstash instance, dev server on port 3117. Port 3000 was already
held by an unrelated app on IPv4 while Next bound IPv6, so the first attempt
reached the wrong server entirely — worth knowing before trusting a `localhost:3000`
smoke on this machine.

```
$ curl -fsS http://127.0.0.1:3117/api/pull
{"seq":24,"pattern":"NONE","route":"","dest":"","conf":"","arrivalId":3,"ts":1784412639606,
 "activity":"MOVING","activitySeq":3,"activityTs":1784412639430}

$ curl -fsS -X POST http://127.0.0.1:3117/api/activity -H 'content-type: application/json' \
       -d '{"activity":"MOVING"}'
{"activity":"MOVING","activitySeq":4,"activityTs":1784413808070}

$ curl -fsS http://127.0.0.1:3117/api/pull
{"seq":24,"pattern":"NONE","route":"","dest":"","conf":"","arrivalId":3,"ts":1784412639606,
 "activity":"MOVING","activitySeq":4,"activityTs":1784413808070}

$ curl -s -w 'HTTP %{http_code}\n' -X POST http://127.0.0.1:3117/api/activity \
       -H 'content-type: application/json' -d '{"activity":"still"}'
HTTP 400
{"error":"activity must be \"STILL\" or \"MOVING\""}

$ curl -fsS http://127.0.0.1:3117/api/pull | wc -c
154
```

This is the independence rule observed rather than argued: `activitySeq` advanced
3 → 4 and `activityTs` refreshed, while `seq` stayed 24 and `ts` stayed
1784412639606. An activity heartbeat did not touch the command. The rejected write
left `activitySeq` at 4, so the 400 path stores nothing.

**Disclosure:** this wrote to the shared demo Redis. The value posted was
`"MOVING"`, which is what the relay already held, so it was a semantic no-op —
exactly the 30 s heartbeat the design specifies. `activitySeq` advanced by one,
which is a counter that only ever advances. `GET /api/pull` is read-only
(`readCommand()` issues `mget` alone), and `/api/event` was never posted to.

## Grounding notes

Every firmware claim in this file is **second-hand, from audit 14**. Sebastian's
branch was not checked out, `relay_pure.h` and `net.cpp` were not read during this
pass, and no board was flashed or polled. Specifically inherited rather than
verified:

- `parseUserActivity()` does `strcmp` against `"STILL"`/`"MOVING"` and maps
  everything else, nullptr included, to `UserActivity::UNKNOWN`.
- `net.cpp` requires `activity.is<const char*>() && activitySeq.is<uint32_t>()`
  and skips the whole activity block if either fails, with no log line.
- `net.cpp` rejects the entire response if `seq` or `pattern` is malformed, and
  caps the body at 768 bytes.
- `effectiveActivity()` falls back to `MOVING`; `acceptsRelayCommand()` admits
  only NONE and ERROR unless activity is exactly `STILL`.
- `CLOUD_ACTIVITY_LEASE_MS = 120000`, refreshed only when `activitySeq` advances,
  and the first `activitySeq` a booted board sees is a non-rendering baseline.
- The firmware enum is `{ UNKNOWN = 0, MOVING, STILL }`, reordered when it moved
  out of `navigation_pure.h`.

`ACTIVITY_SEQ_MAX = 4294967295` is `2**32 - 1`, checked arithmetically in the
suite rather than taken on trust.

## Residual risk

**`redis.ts` has no automated coverage at all, and the MSET-before-INCR ordering
is the thing most worth protecting.** The plan rules out Redis-level tests for
sound reasons — `Redis.fromEnv()` at module scope burns ~4.3 s of retry backoff
per uncredentialed command, credentials mean live secrets and mutation of the
state the ESP32 polls, and mocking would test the mock rather than the ordering.
The consequence stands regardless: both writers depend on a comment and a code
review. Reversing the two lines in `writeActivity()` would pass tsc, lint, all
163 tests, and the build, and would surface only as an occasional missed activity
edge on the board. The one-shot smoke above does not exercise the race.

**The widened `mget` is a live footgun.** Bindings, generic tuple, and key list
must stay index-aligned across three separate lists, and the generic is an
assertion TypeScript does not check — a short key list compiles clean and shifts
every field after the gap. This was verified against `@upstash/redis` 1.38.0 by
whoever wrote the comment; this pass took that on trust. The failure mode is a
board receiving `pattern` in the `route` slot, which is not obviously wrong
in a log.

**Nothing in this repo pins the firmware's half of the contract.** Every
constraint the web side satisfies is transcribed from audit 14 into TypeScript
comments and test names. If Sebastian's parser changes — a renamed key, a
tightened type check, a different lease — no check on this branch fails. The
contract is enforced in one direction only.

**The activity default is correct and still looks like a broken device.**
Defaulting to MOVING means an empty or unreachable relay closes the bus gate, so
a demo where the phone never POSTs activity produces a device that stays silent
through a bus arrival. That is the intended direction and the safe one, but the
symptom on stage is indistinguishable from dead hardware. The debug screen's
`Activity seq` and `Activity age` fields are the only way to tell the two apart,
and only one person can see them.

**The 120 s lease depends on the phone staying on the capture page.** The board
discards cloud activity 120 s after the last `activitySeq` advance and on every
reboot. Backgrounding the tab, a page reload, or a Wi-Fi drop longer than the
lease all end with the board on its MOVING fallback. Track B's 30 s heartbeat is
the mitigation and it only runs while that page is alive.

**`activityTs` is emitted and never read by anything but the debug screen.**
`net.cpp` does not parse it. It is 21 bytes of the 154-byte body kept for the
debug screen and forward-compat, which is fine, but it should not be mistaken for
a field the board acts on — the lease is driven by `activitySeq` alone.

**JSON key order is unpinned.** The activity trio serialising last is a property
of the object literal in `readCommand()` and nothing asserts it. Sebastian's
parser is key-lookup based so order cannot break the board; what would break is
the ability to diff curl output against `RELAY-FOR-FIRMWARE.md`, which is a
debugging convenience rather than a contract term.

**`sameEvent` deliberately ignores `dest`, which has a visible consequence.** A
re-read that changes only the destination string is not a new event, so the
device does not re-fire — correct — but the debug screen's destination will also
not update until some other field changes. Intended, and worth knowing before
someone reports it as a bug.

**The live smoke is one observation, not a suite.** It ran once, against whatever
state the shared Upstash instance happened to hold, on a dev server rather than a
Vercel deployment. It demonstrates the contract shape and the independence rule;
it does not demonstrate them under concurrency, on Vercel's runtime, or against a
board that is actually polling.

**None of this is accessibility or field validation.** The two-phase gate is demo
logic, the buzzers remain audible proxies with no proven tactile separation, and
the cane remains the primary mobility aid.
