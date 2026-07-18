# Testing and Deployment Research

Date: 2026-07-18

## Scope

This is a research pass, not an implementation pass. It establishes how the
phone-side DeviceMotion classifier, the extended relay contract, and the
firmware relay parser will be tested, and how `www/` reaches production, before
any of that code is written.

Everything below was executed on this machine. Install output, test output, and
exit codes are pasted as recorded. No tracked file was left modified — see
**Repo state on exit**.

Three things were measured rather than assumed:

1. `www/` had no test runner, no `test` script, and zero test files. Every unit
   test issue #5 asks for was unrunnable.
2. The `@/` path alias does **not** resolve under Vitest without configuration.
3. All three documented `www/` verification commands in `AGENTS.md` currently
   **fail on this machine**, for reasons that predate this work.

That third finding blocks Phase 3 and is the most important result here.

---

## Test runner verdict

**Vitest 4.1.10.** Installed, run, and reverted. Evidence below.

### Why Vitest

George owns the web app, and `www/.claude/skills/george-stack/SKILL.md:48` is
the only line in his stack skill that names a test framework:

> Build with tsup, test with vitest, ESM only, Node 20+.

The line sits under "Building CLIs and MCPs" rather than under the web-app
section, so it is not a verbatim instruction about Next.js apps. It is however
the *only* runner George names anywhere in the skill tree — a
`grep -rn -i "vitest\|jest\|node:test\|playwright"` across
`www/.claude/skills/` returns exactly that one hit and nothing else. There is no
competing preference to weigh it against, so Vitest is honoured.

The choice is independently corroborated: Next.js 16 ships a first-party Vitest
guide inside this repo's own `node_modules`, at
`www/node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`. Per
`AGENTS.md` that local doc is the authority for Next.js questions here, and it
documents the exact `pnpm add -D vitest` path used below.

### Node environment is sufficient — confirmed

The classifier and `detectorToEvent` are deliberately pure, so no browser
environment is needed. Vitest's default environment is already `node`, read
straight from the installed package:

```
default include : ["**/*.{test,spec}.?(c|m)[jt]s?(x)"]
default exclude : ["**/node_modules/**","**/.git/**"]
default env     : node
```

Every run below reports `environment 0ms`, confirming no jsdom/happy-dom was
constructed. **Do not install `jsdom`, `@testing-library/react`, or
`@vitejs/plugin-react`** for the Phase 3 work. The Next.js guide lists them
because it renders a React component; nothing in issue #5 does.

### Evidence 1 — install

```
$ cd www && pnpm add -D vitest
Packages: +31
devDependencies:
+ vitest 4.1.10
```

### Evidence 2 — zero config, and the alias failure

Run with **no config file at all**, against two throwaway tests: one importing
`./contract` relatively, one importing `@/lib/contract`.

```
$ ./node_modules/.bin/vitest run

 ❯ src/lib/scratch-alias.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/lib/scratch-alias.test.ts [ src/lib/scratch-alias.test.ts ]
Error: Cannot find package '@/lib/contract' imported from
/Users/haidertoha/Code/axiometa-ant-hack/www/src/lib/scratch-alias.test.ts

 Test Files  1 failed | 1 passed (2)
      Tests  4 passed (4)
   Duration  131ms (transform 26ms, setup 0ms, import 22ms, tests 2ms, environment 0ms)
```

The four relative-import tests of the **existing, unmodified**
`detectorToEvent`/`sameEvent` passed on a zero-config runner. The `@/` alias
did not resolve. `tsconfig.json` `paths` is a TypeScript-only setting; Vitest
resolves through Vite, which knows nothing about it.

The Next.js guide's fix is a fifth dependency, `vite-tsconfig-paths`. That is
avoidable — a four-line `resolve.alias` does the same job with **zero extra
packages**, which matters because every dependency added to `www/` is a
dependency the Vercel build installs.

### Evidence 3 — with the recommended config

```
$ ./node_modules/.bin/vitest run --reporter=verbose

 ✓ src/lib/scratch-alias.test.ts > @/ alias resolves 1ms
 ✓ src/lib/scratch-relative.test.ts > TARGET_ARRIVED maps to BUS 1ms
 ✓ src/lib/scratch-relative.test.ts > reading_ready with a null reading is UNKNOWN, not WAIT 0ms
 ✓ src/lib/scratch-relative.test.ts > high-confidence digit route maps to NUMBER 0ms
 ✓ src/lib/scratch-relative.test.ts > sameEvent ignores dest but not route 0ms

 Test Files  2 passed (2)
      Tests  5 passed (5)
   Duration  113ms (transform 26ms, setup 0ms, import 39ms, tests 3ms, environment 0ms)
```

Both throwaway files were deleted after this run.

### Interference checks — all clean

Run with the test files and `vitest.config.mts` present:

| Check | Command | Exit |
| --- | --- | --- |
| TypeScript | `./node_modules/.bin/tsc --noEmit` | **0** |
| ESLint | `./node_modules/.bin/eslint` | **0** |
| Production build | `./node_modules/.bin/next build` | **0**, compiled in 1260 ms, all 7 routes unchanged |

Conclusions:

- **`tsconfig.json` needs no change.** Test files are already covered by the
  `**/*.ts` include and type-check cleanly. No `types` entry is required
  *because* the recommended style imports `test`/`expect` explicitly. If Phase 3
  ever sets `globals: true` in the Vitest config, it must then add
  `"types": ["vitest/globals"]` to `compilerOptions` or `tsc` will fail on the
  undeclared globals. Prefer explicit imports and avoid the coupling.
- **ESLint needs no change.** No new ignore entry, no override block.
- **`next build` is unaffected.** Files under `src/lib/` are not routes; the App
  Router only treats reserved filenames (`page.tsx`, `route.ts`, `layout.tsx`)
  as routes, so a colocated `*.test.ts` is inert. It *is* type-checked by the
  build's TypeScript pass, which is desirable — a broken test file should fail
  the build rather than rot silently.
- **Pin `include` anyway.** Vitest 4's default exclude is only
  `**/node_modules/**` and `**/.git/**` — notably **not** `.next/`, which
  earlier Vitest majors did exclude. `.next/` contains no matching files today
  (verified), but a build artifact named `*.test.js` would be picked up. The
  config below scopes `include` to `src/` to close that off permanently.

---

## Exact config blocks

### `www/vitest.config.mts` (new file)

`.mts` is used, not `.ts`: `www/package.json` has no `"type": "module"`, and the
`.mts` extension forces ESM parsing regardless. This is also the extension the
Next.js local doc specifies. It is already matched by the `**/*.mts` entry in
`tsconfig.json` `include`, so it is type-checked for free.

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

`resolve.alias` sits at the **top level**, not inside `test` — it is a Vite
option, not a Vitest one. Putting it under `test` silently does nothing.

### `www/package.json` scripts

Add two entries; change nothing else.

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

`test` is `vitest run`, not bare `vitest`. Bare `vitest` enters watch mode and
will hang an agent or a CI job forever. Watch mode is available explicitly as
`test:watch`.

### Install command for Phase 3

```bash
cd www && pnpm add -D vitest
```

One package. Nothing else.

### File naming and location convention

**Colocated, `src/**/*.test.ts`.** A test lives beside the module it tests:

| Module | Test |
| --- | --- |
| `www/src/lib/motion.ts` | `www/src/lib/motion.test.ts` |
| `www/src/lib/contract.ts` | `www/src/lib/contract.test.ts` |
| `www/src/lib/coerce.ts` | `www/src/lib/coerce.test.ts` |

Not a top-level `test/` directory and not `__tests__/`. Colocation matches how
this repo already organises `src/lib`, keeps the `include` glob to one line, and
mirrors the firmware convention where a test sits next to the pure header it
exercises. The `.test.ts` suffix is fixed by the `include` glob above — a file
named `*.spec.ts` will be silently ignored.

---

## Test case tables

### 1. `www/src/lib/motion.ts` — the step-cadence classifier

Not yet written. It must be pure: samples in, state out, no `window`, no
`DeviceMotionEvent`, no timers. The DOM plumbing that feeds it belongs in the
capture page and is out of unit-test scope — it is covered by the real-phone
HTTPS test in issue #5's acceptance criteria, not by Vitest.

Proposed shape, so the table below is concrete:

```ts
type Sample = {
  t: number;                       // ms, event.timeStamp
  acc: { x: number; y: number; z: number } | null;
  rot: { alpha: number; beta: number; gamma: number } | null;
};
type Activity = "STILL" | "MOVING";
```

The classifier is a fold: `step(state, sample) -> state`, with `state.activity`
readable at any point. That shape makes every row below a plain array-in,
value-out assertion with no fake timers.

| # | Case | Input | Expected | Why it exists |
| --- | --- | --- | --- | --- |
| 1 | Cold start | no samples | `STILL` | Contract default; matches "missing activity resolves to STILL". |
| 2 | Flat rest | 60 s at 1 Hz variance ≈ 0 | `STILL` throughout, **0 transitions** | Acceptance criterion: no flapping in 60 s. |
| 3 | Noise just under entry threshold | variance held at `ENTRY - ε` | stays `STILL` | Threshold is exclusive; proves no off-by-one entry. |
| 4 | Noise just over entry threshold, **too short** | above `ENTRY` for less than the debounce window | stays `STILL` | Debounce is real, not decorative. |
| 5 | Noise oscillating across entry threshold | alternating above/below every sample | stays `STILL`, 0 transitions | The flap case. Fails immediately if entry/exit thresholds are equal. |
| 6 | Short rotation spike | one sample with large `rotationRate`, acceleration flat | stays `STILL` | Issue #5 verbatim: "Do not equate a single gyro spike with MOVING". |
| 7 | Sustained walking-like samples | ≥ debounce window of ~2 Hz periodic acceleration | `MOVING` | The positive case. |
| 8 | Transition latency | as #7 | records the sample index/time of the `STILL→MOVING` edge | Acceptance criterion demands *measured* transition times; the test pins the value the bench run tunes. |
| 9 | STILL recovery | #7 then sustained flat | returns to `STILL` | "placing it down returns to STILL". |
| 10 | Exit hysteresis | after `MOVING`, variance sits between `EXIT` and `ENTRY` | stays `MOVING` | Proves separate entry/exit thresholds. Fails if one threshold is used for both. |
| 11 | `acceleration` null, gravity present | `acc: null`, `accelerationIncludingGravity` supplied | classifies from the gravity channel | iOS commonly gives null `acceleration`. |
| 12 | Both acceleration channels null | `acc: null` and no gravity | `STILL`, flagged unavailable — **must not throw** | Null-sample criterion. Drives the manual-fallback UI. |
| 13 | `rotationRate` null | `rot: null`, acceleration fine | classifies from acceleration alone | Partial sensor availability. |
| 14 | NaN / Infinity in a field | `acc.x = NaN` | sample rejected, state unchanged, no throw | Garbage-in hardening, same spirit as `coerce.ts`. |
| 15 | Duplicate timestamps | two samples, identical `t` | no divide-by-zero, no throw | `dt = 0` is the classic crash. |
| 16 | Non-monotonic timestamp (wrap/backwards) | `t` jumps backwards | sample rejected or window reset; **never negative dt** | Timestamp-wrap criterion. |
| 17 | Large forward gap (tab backgrounded) | `t` jumps +30 s | window resets, resolves `STILL` | Staleness criterion — a stale window must not assert `MOVING`. |
| 18 | Staleness expiry | last sample older than the staleness limit | `STILL` | Plan: "Activity older than the command staleness limit resolves to STILL". |

Rows 15–17 are the ones most likely to be skipped and most likely to bite. Write
them first.

### 2. `detectorToEvent` — the MOVING extension

The current function (`www/src/lib/contract.ts:168`) has no notion of activity.
`DetectorState.targetBearing` (`contract.ts:92`) already carries
`"left" | "center" | "right" | ""`, and `ModalDetection.bearing` already exists,
so the input is present and unused. The extension adds an activity argument and
maps bearing to a navigation pattern when `MOVING`.

Gating contract, from the plan (§ line 550) and mirrored in the firmware's
`acceptsCloudCommand` (`firmware/braille_wearable/src/navigation_pure.h`):

- `STILL` accepts BUS, WAIT, NUMBER, UNKNOWN, ERROR, NONE.
- `MOVING` accepts LEFT, RIGHT, AHEAD, ERROR, NONE.

| # | Activity | Detector input | Expected pattern | Note |
| --- | --- | --- | --- | --- |
| 1 | `STILL` | any existing case | **unchanged from today** | Regression guard. Re-run the whole existing table with `STILL` and assert byte-identical output. Non-negotiable. |
| 2 | absent/undefined | any | same as `STILL` | Backward compatibility with old clients. |
| 3 | invalid string (`"WALKING"`, `null`, `42`) | any | same as `STILL` | Issue #5: "missing or invalid activity resolves to STILL". |
| 4 | `MOVING` | `targetBearing: "left"` | `LEFT` | |
| 5 | `MOVING` | `targetBearing: "right"` | `RIGHT` | |
| 6 | `MOVING` | `targetBearing: "center"` | `AHEAD` | |
| 7 | `MOVING` | `targetBearing: ""` | `NONE` | No target in view. Must **not** guess a direction. |
| 8 | `MOVING` | `reading_ready` + high-conf route `"88"` | **not** `NUMBER` | Route reading is a STILL-only command; it must be suppressed, not emitted for the board to drop. |
| 9 | `MOVING` | `event: "TARGET_ARRIVED"` | **not** `BUS` | Same reason. |
| 10 | `MOVING` | detector error state | `ERROR` | ERROR crosses both states. |
| 11 | `STILL` | `targetBearing: "left"` | **not** `LEFT` | The mirror of #8. |
| 12 | either | any | `route` is `""` for every navigation pattern | LEFT/RIGHT/AHEAD carry no route. |
| 13 | `MOVING` | bearing flips left→right→left across calls | each call independent | The function stays pure; debounce belongs in the classifier, not here. |
| 14 | `sameEvent` | two LEFT commands, same arrivalId | `true` | Keeps the edge-triggered POST from spamming Redis at 2 Hz. |
| 15 | `sameEvent` | LEFT vs RIGHT | `false` | |
| 16 | `sameEvent` | same pattern, different `activity` | **`false`** | Decide deliberately: a STILL→MOVING change with an otherwise identical command **must** re-POST, or the board never learns the mode changed. `sameEvent` (`contract.ts:204`) currently compares four fields and must gain `activity`. This is the single easiest bug to ship in Phase 2. |

Row 16 is the one to write first.

### 3. Relay round-trip — `POST /api/event` → `GET /api/pull`

**Recommendation: a scripted `curl` smoke, not an automated test.** This is
evidence-backed, not a preference.

`www/src/lib/redis.ts:18` constructs the client at **module scope**:

```ts
export const redis = Redis.fromEnv();
```

The obvious worry is that this throws on import and makes the routes untestable.
It does not — measured directly:

```
stdout | what does vitest actually see for Upstash env?
URL   seen by process.env: undefined
TOKEN seen by process.env: undefined
stderr | [Upstash Redis] Unable to find environment variable: `UPSTASH_REDIS_REST_URL`
stderr | [Upstash Redis] Unable to find environment variable: `UPSTASH_REDIS_REST_TOKEN`
stderr | [Upstash Redis] The 'url' property is missing or undefined in your Redis config.
stdout | module imported OK, redis client: object
stderr | [Upstash Redis] Redis client was initialized without url or token. Failed to execute command.
 ✓ what does vitest actually see for Upstash env? 4323ms
```

So: the module imports fine and only **warns**; the first actual command
rejects, after **4.3 seconds** of internal retry backoff. Two consequences.

First, this is the mechanism behind the behaviour `AGENTS.md` documents — that
`pnpm run build` "can print Upstash missing-env warnings ... the build still has
to finish successfully". The warnings above are that exact text, and because
every relay route is `export const dynamic = "force-dynamic"`, nothing is
prerendered, so no Redis *command* runs during a build. Only the constructor
runs, and it warns. The documented behaviour is correct and now traced to source.

Second, an automated route-level test is a trap. Without credentials each Redis
call burns ~4.3 s and then fails for reasons unrelated to the code under test.
With credentials it needs live secrets in CI and mutates shared demo state that
the ESP32 is polling. Mocking `@/lib/redis` would leave the assertion testing the
mock, not the MSET-before-INCR ordering that actually matters.

What to do instead — split it:

**(a) Automated, no credentials.** Unit-test the pure parts, which is where the
real risk lives:

| # | Target | Case | Expected |
| --- | --- | --- | --- |
| 1 | `coerceActivity` (new, in `coerce.ts`) | `"MOVING"` | `"MOVING"` |
| 2 | | `"STILL"` | `"STILL"` |
| 3 | | `undefined` (old client) | `"STILL"` |
| 4 | | `"moving"` lowercase | `"STILL"` — reject, do not normalise |
| 5 | | `null`, `42`, `{}`, `"WALKING"` | `"STILL"` |
| 6 | `readCommand` shaping | stored `activity` missing in Redis | `"STILL"` |
| 7 | | stored `route` returns as number `88` | `"88"` string — guards the documented Upstash coercion at `redis.ts:80` |

Phase 2 should put activity defaulting in a **named exported pure function** in
`coerce.ts` for exactly this reason. If the defaulting is inlined into the route
handler it becomes untestable without credentials.

**(b) Scripted smoke, credentials required.** The wire round-trip, run by hand
against a running app or the deployed URL, using the locked demo payload from the
plan (§ line 374):

```bash
BASE=http://localhost:3000       # or https://bus-stop-awareness.vercel.app

curl -fsS -X POST "$BASE/api/event" \
  -H 'content-type: application/json' \
  -d '{"pattern":"LEFT","activity":"MOVING","route":"","dest":"","conf":"high","arrivalId":1}'

curl -fsS "$BASE/api/pull"
```

Assertions:

| # | Check |
| --- | --- |
| 1 | `POST` returns HTTP 200 with `{"seq":N,"stored":"LEFT"}` |
| 2 | `GET /api/pull` returns `"activity":"MOVING"` — the round-trip |
| 3 | `GET /api/pull` returns `"pattern":"LEFT"` |
| 4 | `seq` in the pull is the same `N` the POST returned |
| 5 | A second identical POST increments `seq` to `N+1` |
| 6 | `route` is the JSON **string** `""`, never a number |
| 7 | An old-client POST **omitting** `activity` pulls back `"activity":"STILL"` |
| 8 | A POST with `"activity":"MOVING"` and `"pattern":"NUMBER"` still stores — the **board** drops it, per the plan; the relay does not gate |

Check 8 encodes a real design decision: gating lives on the board
(`acceptsCloudCommand`), not in the relay. Do not "fix" the relay to reject it.

**Never** run this smoke against production while the ESP32 is polling and
someone is demoing — it overwrites the live command.

---

## Firmware native test conventions

`pio` is on PATH and working:

```
$ which pio
/Users/haidertoha/.local/bin/pio
$ pio --version
PlatformIO Core, version 6.1.19
```

Full suite, run for this audit:

```
$ cd firmware/braille_wearable && pio test -e native
================= 78 test cases: 78 succeeded in 00:00:06.053 =================
```

All nine suites pass: `test_tof_bench`, `test_siren_runtime`, `test_siren`,
`test_navigation`, `test_braille`, `test_haptic`, `test_tof_proximity`,
`test_audio`, `test_buzzer_experiment`.

### Directory-per-test convention

PlatformIO discovers one test suite per **subdirectory** of `test/`. The
directory name is the suite name; the `.cpp` inside conventionally repeats it:

```
firmware/braille_wearable/test/
├── test_audio/test_audio.cpp
├── test_navigation/test_navigation.cpp
├── test_siren/test_siren.cpp
└── ...
```

A loose `.cpp` sitting directly in `test/` is not a suite. To add the relay
parser tests, create `test/test_relay/test_relay.cpp` — no `platformio.ini`
change is needed, discovery is automatic.

### How `-I src` makes the pure headers visible

```ini
[env:native]
platform       = native
test_framework = unity
build_flags    = -std=gnu++17 -I src
```

Three things make this work, and they are load-bearing:

1. **`src/` is not compiled during `pio test`.** Only the test `.cpp` is built.
   The Arduino-dependent translation units (`main.cpp`, `audio.cpp`, `tof.cpp`,
   `haptic.cpp`) are never seen by the host compiler, so no Arduino toolchain is
   required.
2. **`-I src` puts `src/` on the include path**, so `#include "navigation_pure.h"`
   resolves from a test file two directories away.
3. **The logic under test is header-only and Arduino-free.** `navigation_pure.h`,
   `siren_pure.h`, `tof_bench_pure.h`, `audio_pure.h`, `haptic_pure.h`,
   `patterns.h` and friends contain `constexpr` functions and tables with no
   `.cpp` to link. That is why the suite links with nothing but the test file.

`[env:native]` deliberately does **not** `extends = esp32_common`, so it inherits
no ESP32 flags and no ESP32 `lib_deps`.

**The rule for Phase 3:** any firmware logic that needs a unit test must live in
a `*_pure.h` header with no `Arduino.h` include and no hardware access. The relay
parser rewrite must follow this — parse from a `const char*` into a struct, with
all I2C/Wi-Fi/`Serial` work left in the `.cpp`. If it needs `Arduino.h`, it
cannot be tested on the host.

### Unity idioms in this repo

From `test/test_navigation/test_navigation.cpp`:

- `#include <unity.h>` first.
- `void setUp(void) {}` and `void tearDown(void) {}` must both be defined even
  when empty — Unity references them at link time.
- Each case is `void test_snake_case_describing_behaviour(void)`.
- An explicit `int main(int, char**)` wraps `UNITY_BEGIN()`, one `RUN_TEST(...)`
  per case, and `return UNITY_END();`. **There is no auto-registration** — a test
  function without a matching `RUN_TEST` line compiles, never runs, and reports
  success. This is the most common way to ship a dead test here.
- Type-specific asserts are used throughout: `TEST_ASSERT_EQUAL_UINT16`,
  `TEST_ASSERT_EQUAL_UINT8`, `TEST_ASSERT_EQUAL_INT`, `TEST_ASSERT_EQUAL_PTR`,
  `TEST_ASSERT_NULL`, `TEST_ASSERT_NOT_NULL`.
- Enum comparisons go through `static_cast<uint8_t>` on both sides.
- Local static helpers (e.g. `assertStep`) collapse repeated assertions.

### Running a single suite

`-f` / `--filter` matches the suite path relative to `test_dir`. Verified:

```
$ pio test -e native -f test_navigation
-------------- native:test_navigation [PASSED] Took 0.52 seconds --------------
================== 9 test cases: 9 succeeded in 00:00:00.516 ==================
```

`-i` / `--ignore` is the inverse. Both accept glob patterns.

---

## Vercel deploy command and pre-deploy checklist

**Do not deploy from this phase.** Phase 4 deploys. This section is the command
and the checklist only.

### Confirmed project state

```
$ vercel --version
Vercel CLI 56.3.1
$ cd www && vercel whoami
mohammedhaidertoha
```

`www/.vercel/project.json` exists and is gitignored (`www/.gitignore:39`):

| Field | Value |
| --- | --- |
| Org | `haider-projects` (`team_twqOAgAGAoR1QIpdvqHRjE62`) |
| Project | `bus-stop-awareness` (`prj_aycLGOeruiDMpatN5x1jCRkQ4nQs`) |
| Root Directory | `.` |
| Node.js Version | `24.x` |
| Framework Preset | Next.js |
| Production URL | `https://bus-stop-awareness.vercel.app` |

Four production deployments exist, all `● Ready`, all created ~3 h ago by
`mohammedhaidertoha`.

### The root-directory subtlety — read before deploying

The repo root has **no** `vercel.json` and **no** `.vercel/`. Only `www/` is
linked. The Vercel project's Root Directory is `.`, which resolves against
whatever the CLI uploads as the project root. Since the link lives in `www/`,
the CLI uploads `www/` and `.` correctly means `www/`.

The consequence: **`vercel --prod` must never be run from the repo root.** With
no `.vercel/` there, the CLI would not find the link and would prompt to create
or link a *different* project — silently, if `--yes` were passed. Both correct
forms:

```bash
# from the repo root — preferred, no directory state to get wrong
vercel --cwd www --prod

# or
cd www && vercel --prod
```

`--cwd <DIR>` is documented as "Sets the current working directory for a single
run of a command" and is the supported way to deploy a project that lives in a
subdirectory.

### Git-push deploys are not available

`vercel project inspect` reports no connected Git repository, and all four
existing deployments are CLI-created (a username, not a commit, in the
deployment list). Pushing to `main` will **not** deploy. Phase 4 must deploy
explicitly with the CLI.

This is worth a deliberate decision rather than drift: if git integration is ever
connected, the Root Directory setting must be changed from `.` to `www` at the
same time, or every git build will fail looking for a `package.json` at the repo
root. Changing it would then break the CLI path above. Pick one; do not run both.

### Environment variables

`www/.env.example` declares four keys. Actual Production scope on Vercel
(`vercel env ls production`, names only — no values were printed or recorded):

| Key | On Vercel (Production) | Build-time | Runtime | Notes |
| --- | --- | --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | ✅ set (3 h ago) | not required | **required** | `Redis.fromEnv()`; routes are `force-dynamic` so nothing prerenders |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ set (3 h ago) | not required | **required** | as above |
| `NEXT_PUBLIC_MODAL_URL` | ✅ set (3 h ago) | **required** | inlined | `NEXT_PUBLIC_` is substituted into the client bundle at build; absent at build ⇒ permanently `undefined` in the shipped page, no runtime recovery |
| `ANTHROPIC_API_KEY` | ❌ not set | no | no | Correct. Claude runs inside Modal; the web app does not use it. |

The Upstash pair is genuinely runtime-only, which is why the documented
"build succeeds with missing Upstash env" behaviour holds — see the traced
warnings in the relay section above. `NEXT_PUBLIC_MODAL_URL` is the opposite: it
must be present **at build time**, and a deploy that silently lost it would
produce a capture page that cannot reach Modal. The page accepts a `?modal=<url>`
query override, which is a demo-day escape hatch, not a substitute.

### Pre-deploy checklist

Run from `www/`. Note that the `pnpm`-prefixed forms are currently broken — see
the next section — so the direct-binary forms are given.

1. [ ] `git status --porcelain` is clean, or intentional changes are committed.
2. [ ] `www/.env.local` is **not** staged (`.gitignore:34` covers `.env*`; verify anyway).
3. [ ] `./node_modules/.bin/tsc --noEmit` exits 0.
4. [ ] `./node_modules/.bin/eslint` exits 0.
5. [ ] `./node_modules/.bin/vitest run` — all green (once Phase 3 adds it).
6. [ ] `./node_modules/.bin/next build` exits 0.
7. [ ] `cd firmware/braille_wearable && pio test -e native` — 78+ cases pass.
8. [ ] `vercel whoami` returns `mohammedhaidertoha`.
9. [ ] `vercel env ls production` still lists all three keys.
10. [ ] Confirm nobody is mid-demo — a production deploy plus the relay smoke will
      overwrite the live command the ESP32 is polling.
11. [ ] Deploy: `vercel --cwd www --prod`.
12. [ ] Smoke the deployed relay with the two `curl`s above against
       `https://bus-stop-awareness.vercel.app`, asserting `activity` round-trips.
13. [ ] Confirm the ESP32 pulls the value the phone wrote (issue #5's final
       acceptance criterion — this one needs the board powered and on Wi-Fi).

---

## Blocker: `pnpm run` and `pnpm exec` are broken in `www/`

Found while verifying the runner, but **entirely independent of it**. All three
`www/` verification commands documented in `AGENTS.md` currently fail:

```
$ cd www && pnpm exec tsc --noEmit   ; echo $?    →  1
$ cd www && pnpm run lint            ; echo $?    →  1
$ cd www && pnpm run build           ; echo $?    →  1

$ cd www && ./node_modules/.bin/tsc --noEmit ; echo $?  →  0
$ cd www && ./node_modules/.bin/eslint       ; echo $?  →  0
```

**This is pre-existing.** The check above was re-run after Vitest was fully
uninstalled and `package.json`/`pnpm-lock.yaml` were restored to `HEAD`; all
three still exit 1. Nothing in this audit caused it.

Cause:

```
[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: sharp@0.34.5, unrs-resolver@1.12.2
Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.
```

`www/package.json` carries a pnpm 10-era block:

```json
"pnpm": { "ignoredBuiltDependencies": ["sharp", "unrs-resolver"] }
```

pnpm 11 **removed** `ignoredBuiltDependencies` (along with
`onlyBuiltDependencies`, `neverBuiltDependencies`, and `ignoreDepScripts`),
replaced them with `allowBuilds` in `pnpm-workspace.yaml`, and flipped
`strictDepBuilds` to `true` by default. Installed pnpm here is **11.9.0**. So the
setting is ignored, unbuilt scripts became a hard error, `pnpm install` exits 1 —
and because `pnpm run` and `pnpm exec` both perform a deps-status check that
shells out to `pnpm install`, every scripted command inherits the failure.

Fix, verified and then reverted:

```yaml
# www/pnpm-workspace.yaml
allowBuilds:
  sharp: false
  unrs-resolver: false
```

```
INSTALL EXIT=0
LINT EXIT=0
TSC EXIT=0
```

Neither `npm_config_verify_deps_before_run=false` nor
`--no-verify-deps-before-run` worked; the `pnpm-workspace.yaml` file is the fix.
`pnpm approve-builds` is the interactive equivalent but is unusable from an
agent and mutates state unpredictably.

This was **not applied** — it is a tracked-file change and this pass is research
only. Phase 3 should apply it as its first commit, and `AGENTS.md` should keep
its `pnpm`-prefixed commands once it works. `sharp` and `unrs-resolver` are
transitive dependencies of Next.js and `eslint-config-next` respectively; neither
needs its build script, so `false` preserves current behaviour exactly.

---

## Repo state on exit

`git status --porcelain` returns only `?? cad/v2_20mm.step`, which was present
before this pass began and is untouched.

Installed then reverted:

| Item | Action | Final state |
| --- | --- | --- |
| `vitest@4.1.10` | `pnpm add -D`, then `git checkout` + `pnpm install` | **Not installed.** Absent from `node_modules/.bin/`. |
| `www/package.json` | modified by the install, reverted | **At `HEAD`.** SHA-256 `1732644b…c4460`, byte-identical to the pre-pass baseline. |
| `www/pnpm-lock.yaml` | modified by the install, reverted | **At `HEAD`.** SHA-256 `f25bf5d0…5e2d405`, byte-identical to the pre-pass baseline. |
| `www/vitest.config.mts` | created for the proof | **Deleted.** |
| `www/src/lib/scratch-relative.test.ts` | throwaway | **Deleted.** |
| `www/src/lib/scratch-alias.test.ts` | throwaway | **Deleted.** |
| `www/src/lib/scratch-redis.test.ts` | throwaway | **Deleted.** |
| `www/pnpm-workspace.yaml` | created to verify the pnpm fix | **Deleted.** |
| `audit/…/13-research-testing-and-deploy.md` | this file | **Added** — the only new file. |
| Vercel | read-only (`whoami`, `env ls`, `project inspect`, `ls`) | **No deploy. No env var written. No secret value printed or recorded.** |

**Recommendation on the dependency:** Phase 3 should install Vitest itself with
`cd www && pnpm add -D vitest`. Leaving it installed here was considered — it is
genuinely needed — but this pass was scoped research-only with a hard revert
requirement, and shipping a lockfile change from a research pass would land an
unreviewed dependency in an audit commit. The install is one command and is
proven to work. Phase 3 should expect `node_modules` to have **no** vitest and
`package.json` to have **no** `test` script until it adds them.

Phase 3's first two actions, in order:

1. Create `www/pnpm-workspace.yaml` with the `allowBuilds` block above, so
   `pnpm run test` can exist at all.
2. `cd www && pnpm add -D vitest`, add `vitest.config.mts` and the two scripts.

---

## Grounding notes

Vercel CLI:

- https://vercel.com/docs/cli
- https://vercel.com/docs/cli/deploy — `--prod`, `--cwd <DIR>`, `--yes`,
  `--no-wait`, `--target`, `--prebuilt`, `--archive`. Source for "`vercel --cwd
  [path-to-project]`" and for `stdout` always being the deployment URL.
- https://vercel.com/docs/cli/global-options
- https://vercel.com/docs/cli/project-linking
- https://vercel.com/docs/project-configuration/git-settings
- https://vercel.com/docs/project-configuration/project-settings
- https://vercel.com/docs/environment-variables
- https://vercel.com/docs/environment-variables/system-environment-variables

Vitest:

- https://vitest.dev/guide/
- https://vitest.dev/config/ — confirms Vite options such as `resolve.alias`
  belong at top level, "not within a `test` property", and that
  `configDefaults` is importable from `vitest/config`. The concrete default
  values quoted in this audit were read from the installed package rather than
  the docs page.
- https://vitest.dev/config/#include
- https://vitest.dev/config/#environment

Next.js (local copy is authoritative per `AGENTS.md`):

- `www/node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`
- https://nextjs.org/docs/app/guides/testing/vitest
- https://github.com/vercel/next.js/tree/canary/examples/with-vitest

PlatformIO:

- https://docs.platformio.org/en/latest/advanced/unit-testing/index.html —
  Unity as a supported framework; tests run "on the local host machine
  (native)".
- https://docs.platformio.org/en/latest/core/userguide/cmd_test.html — `-f,
  --filter PATTERN` processes "only test suites whose path relative to the
  test_dir matches the specified pattern"; `-i, --ignore`; `-e, --environment`.
- https://docs.platformio.org/en/latest/projectconf/sections/env/options/test/test_filter.html
- https://docs.platformio.org/en/latest/platforms/native.html

pnpm 11 breaking change:

- https://pnpm.io/blog/releases/11.0
- https://pnpm.io/settings — `allowBuilds` in `pnpm-workspace.yaml`
- https://pnpm.io/cli/ignored-builds
- https://github.com/pnpm/pnpm/issues/10235 — renaming
  `onlyBuiltDependencies`/`ignoredBuiltDependencies` in v11

Issue #5 sources, carried forward:

- https://www.w3.org/TR/orientation-event/ — DeviceMotion `acceleration`,
  `accelerationIncludingGravity`, `rotationRate`; secure context; permission
- https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent

Repo files cited:

- `www/.claude/skills/george-stack/SKILL.md:48`
- `www/src/lib/contract.ts:92`, `:168`, `:204`
- `www/src/lib/redis.ts:18`, `:56`, `:80`
- `firmware/braille_wearable/platformio.ini` `[env:native]`
- `firmware/braille_wearable/src/navigation_pure.h`
- `firmware/braille_wearable/test/test_navigation/test_navigation.cpp`
- `plan/2026-07-18-bus-stop-situational-awareness.md` §§ 300–330, 374, 550

---

## Residual risk

**The pnpm 11 blocker gates everything.** Until `www/pnpm-workspace.yaml` exists,
a `"test": "vitest run"` script cannot be invoked as `pnpm run test` — it exits 1
before Vitest starts. Every `www/` command in `AGENTS.md`'s Verification section
is currently non-functional on this machine. Phase 3 must fix this first or it
will misread a pnpm packaging failure as a broken test suite. It is also possible
CI or another developer's machine pins an older pnpm and does not see this,
which would make it look intermittent.

**Vitest 4.1.10 was verified; a later major may not behave identically.** In
particular the default `exclude` shrank to just `node_modules` and `.git` in this
major — earlier versions also excluded `dist`, `.idea`, `.cache`, `.output`. The
recommended config pins `include` to `src/`, which insulates against this, but a
future upgrade should re-check.

**The classifier tests cannot test the sensor.** Everything in table 1 exercises
a pure fold over synthetic samples. Nothing there proves a real phone emits the
values assumed, that iOS grants permission, or that the thresholds are right on a
body. Issue #5's real-phone HTTPS test, the 60-second stationary bench run, and
the measured walking transition times remain mandatory and are **not** replaced
by any test specified here. Threshold constants in table 1 are placeholders to be
filled from that bench evidence, not invented at implementation time.

**The relay round-trip has no automated coverage by design.** Checks 1–8 in the
smoke table are manual. A regression in MSET-before-INCR ordering — the exact
race `AGENTS.md` calls out — would not be caught by CI. Mitigation is the pure
`coerceActivity` unit tests plus discipline about `redis.ts:56`. If stronger
coverage is ever wanted, the right shape is a test that injects a fake Redis
client through a parameter, which requires refactoring `redis.ts` away from the
module-scope `Redis.fromEnv()` singleton. That refactor is out of scope for the
hack and should not be attempted mid-phase.

**`detectorToEvent`'s regression guard is the highest-value test and the easiest
to under-write.** Row 1 of table 2 must re-run the entire existing behaviour
under `STILL` and assert identical output. If Phase 2 adds the activity parameter
without it, a subtle change to the STILL path ships unnoticed and the bus-arrival
demo breaks in a way that looks like a detector problem.

**Deployment is CLI-only and unattended pushes will not deploy.** No git
integration is connected. Anyone assuming "merge to main ships it" will demo an
old build. The Root Directory `.` / `www`-link arrangement works for CLI deploys
and would break git deploys; the two configurations are mutually exclusive and
the choice should be made deliberately, not discovered at deploy time.

**Not verified here:** that a production build succeeds with the Upstash
variables genuinely absent. `www/.env.local` exists on this machine and the build
consumed it (`- Environments: .env.local`), so the documented missing-env path
was reasoned from the traced warning behaviour rather than reproduced. Moving
`.env.local` to test it was judged too risky mid-session. Also not verified: that
the ESP32 receives the `activity` value end-to-end — that needs the board
powered, on Wi-Fi, and running firmware that parses the field, none of which
exists yet.
