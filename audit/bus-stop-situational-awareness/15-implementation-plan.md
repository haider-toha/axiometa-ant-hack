# Implementation Plan — STILL/MOVING Activity Contract (`www/` only)

Date: 2026-07-18
Branch: `feat/relay-activity-contract`, cut from `origin/main` = `e02d094`.

Executable by two agents on disjoint file domains. **Every path in this plan is
under `www/`.** Nothing under `firmware/` is in scope — Sebastian's PR #13
(`origin/feat/relay-firmware`, OPEN / MERGEABLE / CLEAN, verified today) ships the
firmware half in full, and we adopt his contract exactly so he changes nothing
[14 §"Verdict on Track C"].

---

## OPEN QUESTIONS

Everything below is decided and encoded. These are the residual ambiguities. None
blocks the work; each has a stated default that the implementer follows unless
Sebastian says otherwise.

| # | Question | Our default | Who settles it |
|---|---|---|---|
| **Q1** | **The lease/heartbeat contradiction.** `RELAY-FOR-FIRMWARE.md` says `activitySeq` "changes only on an activity transition". Taken literally, a steady `STILL` decays to `MOVING` after `CLOUD_ACTIVITY_LEASE_MS = 120000` and the demo dies on stage. | **Heartbeat every 30 s**, bumping `activitySeq` regardless of value change. Issue #5 already asks for "only activity transitions **and a low-rate heartbeat**". | Sebastian confirms, or raises the lease |
| **Q2** | Is `activityTs` load-bearing? Documented in four places, **never parsed** by `net.cpp`. | Emit it for the debug screen and forward-compat. Depend on nothing. | Sebastian |
| **Q3** | What does `/api/pull` return before any activity is ever written? | `"activity":"MOVING","activitySeq":0`. Matches his own fail-safe and gives the board a baseline at 0, so the *first* real write (seq 1) renders instead of being swallowed as a non-rendering baseline. | Sebastian (we lean strongly; it is strictly better than omitting) |
| **Q4** | Setter route name. He wrote "the exact web setter route is not a firmware dependency". | `POST /api/activity`. | Ours to pick; tell him |
| **Q5** | Is `activitySeq` a small counter or a timestamp? His example shows `4` next to an ms-epoch `activityTs`. | Redis `INCR` counter. A `Date.now()` value fails ArduinoJson `is<uint32_t>()` and **silently disables the entire activity block**. | Confirmed by his source; ask him to fix the doc's adjacency |
| **Q6** | Who holds transient `BUS` for ≥1 s so a 300 ms poll cannot miss it? `BOARD_FIRMWARE.md` item 4. | **Unowned. Not in this plan.** It is `capture/page.tsx` + `/api/event` territory, which his plan marks REUSE and which we are told not to change. | Needs an owner before the demo |
| **Q7** | Issue #5 is stale in five clauses, all contradicted by his own newer firmware [14 §"Issue #5 is stale"]. | Do **not** implement it literally. This plan supersedes it. | He authored it; ask him to edit |
| **Q8** | **New.** `activitySeq` uses strict `>` on the board, but commands use `!=`. A Redis flush or `DEL activitySeq` restarts the counter at 1, below the board's `lastActivitySeq`, and activity dies **silently and permanently** until a >10 s poll outage triggers `resetWireBaselines()`. Commands survive the same flush. | Never reset the `activitySeq` key. Document the >10 s-unplug recovery. | Ask whether activity should use `!=` like commands do |
| **Q9** | **New.** `normActivity()` defaults to **`MOVING`**, not `STILL`. This inverts audit 11 and issue #5. | Correct per `effectiveActivity()`: missing activity means "show nothing", not "show bus info" [14 §Conflict map]. The relay must fail in the same direction as the board. | Ours; recorded so it is not relitigated |
| **Q10** | **New.** Is a 30 s write cadence acceptable Redis load? ~2,880 `MSET`+`INCR` pairs per phone per day. | Yes for a hack. 30 s also bounds post-reboot recovery to one beat. | Ours |

---

## Verified ground truth — measured on this machine today, not recalled

Do not re-derive these. They were checked against source and by execution.

### Sebastian's parser — the three hard conditions

`net.cpp:141-160`, read directly from `origin/feat/relay-firmware`:

```cpp
if (responseDocument["activity"].is<const char*>() &&
    responseDocument["activitySeq"].is<uint32_t>()) {
    const UserActivity activity = parseUserActivity(responseDocument["activity"].as<const char*>());
    const uint32_t activitySeq = responseDocument["activitySeq"].as<uint32_t>();
    if (activity != UserActivity::UNKNOWN) {
        if (!activityObserved) { activityObserved = true; lastActivitySeq = activitySeq; /* baseline, does NOT render */ }
        else if (activitySeq > lastActivitySeq) { update.hasActivity = true; /* … */ lastActivitySeq = activitySeq; }
    }
}
```

1. **`activity` and `activitySeq` are required together.** Either absent or
   mistyped and the whole block is skipped — no error, no log, no diagnostic.
2. **`activitySeq` must satisfy `is<uint32_t>()`**: a non-negative integer
   ≤ 4,294,967,295. `Date.now()` ≈ 1.78 × 10¹² and fails, disabling activity forever.
3. **`activity` must be a JSON *string*** parsing to `"STILL"` or `"MOVING"`,
   case-sensitive `strcmp`. Anything else → `UNKNOWN` → ignored.
4. **First observation is baseline-only.** A value must advance at least once
   *after board boot* to take effect.
5. **Only strictly-increasing `activitySeq` fires** — and it refreshes the lease
   whether or not the *value* changed. That is what makes a heartbeat work.
6. `CLOUD_ACTIVITY_LEASE_MS = 120000`, refreshed only on an `activitySeq` advance.
7. `activityTs` is documented four times and **never parsed**.
8. `MAX_RESPONSE_BYTES = 768`. Our full response is ~176 bytes — 592 bytes of headroom.
9. The whole response is rejected if `seq` is not `uint32_t` or `pattern` is not a
   string. Activity goes down with it. Never break the command fields.

### Live relay, right now

```
$ curl -fsS https://bus-stop-awareness.vercel.app/api/pull
{"seq":23,"pattern":"NONE","route":"","dest":"","conf":"low","arrivalId":3,"ts":1784408660375}
```

No activity fields. `grep -rn "ctivity" www/src/` still returns nothing.

### Toolchain — audit 13's blocker does NOT reproduce

Audit 13 reported all three `www/` verification commands exiting 1 on
`ERR_PNPM_IGNORED_BUILDS`. Re-measured today under the same pnpm 11.9.0:

| Command | Exit | Note |
|---|---|---|
| `pnpm exec tsc --noEmit` | **0** | Auto-installed 7 missing devDeps mid-run; no ignored-builds error |
| `pnpm run lint` | **0** | |
| `pnpm run test` | **0** | 4 files, **29 tests** |
| `pnpm run build` | **0** | Next 16.2.10 Turbopack, 8 routes |

`pnpm-lock.yaml` and `package.json` SHA-256 unchanged across all four runs;
`git status --porcelain -- www/` clean.

**Do NOT create `www/pnpm-workspace.yaml`.** Treat as a WATCH ITEM: if it ever
resurfaces, the fix is exactly

```yaml
# www/pnpm-workspace.yaml — ONLY if ERR_PNPM_IGNORED_BUILDS actually appears
allowBuilds:
  sharp: false
  unrs-resolver: false
```

### Vitest — audit 13's `resolve.alias` recipe is superseded, measured

Audit 13 specced `environment: "node"` plus a manual `resolve.alias` for `@/`.
Sebastian's merged PR #12 already shipped a different config, and **it works**:

```ts
// www/vitest.config.mts — SHIPPED, DO NOT CHANGE
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: { environment: "jsdom", setupFiles: ["./src/test/setup.ts"] },
});
```

Evidence that `@/` already resolves: all four existing test files import through
the alias (`@/lib/web-serial`, `@/lib/output-telemetry`, `@/app/output/…`), the
modules under test import `@/components/ui/button` and `@/lib/utils`
transitively, and all 29 tests pass. Vite resolves to **8.1.5**, which has
built-in `resolve.tsconfigPaths`.

**This plan therefore does not add `resolve.alias`, does not add
`vite-tsconfig-paths`, and does not pin Vite below 8** — a downgrade breaks every
`@/` import in his existing tests [14 §"Delete — the test-harness half of
Track B"]. `www/package.json` already carries `test`/`test:watch`; **no change**.

---

## Where audit 11 loses to audit 14

Audit 11 is the per-file change map, written *before* Sebastian's firmware. Its
mechanics (`mset`/`mget` alignment, the MSET-before-INCR reasoning, the Upstash
`undefined → null` trap) are still correct and are reused verbatim below. Five of
its conclusions are now wrong. **Audit 14 wins every one of them.**

| Audit 11 says | Audit 14 / his source says | Verdict |
|---|---|---|
| Add `activity?: UserActivity` to `EventRequest` | "Activity must not ride the command writer"; heartbeat "must not increment command `seq`" (his `AGENTS.md`) | **No change to `EventRequest` or `/api/event`** |
| `normActivity` defaults to `STILL` | `effectiveActivity()` falls back to `MOVING`; `acceptsRelayCommand(UNKNOWN, BUS)` is `false` | **Default `MOVING`** |
| `sameEvent` gains an `activity` comparison | Activity is off `EventRequest` entirely | **`sameEvent` unchanged** |
| Add `LEFT`/`RIGHT`/`AHEAD` to `PatternId` + `CloudPattern` | "Directionality is cut"; `parseCloudCommand("LEFT") == INVALID`, asserted by his test | ~~**Do not add them**~~ **SUPERSEDED 2026-07-19 — they ARE added.** See [19] and [20]. The cut conflated ToF-derived navigation (still cut) with camera-derived target bearing (restored): `vision/service.py` already returns a per-detection `bearing`, so the camera can answer what a single forward ToF zone cannot. `parseCloudCommand` now maps all three, and `acceptsRelayCommand` takes them only while `MOVING`. `plan/2026-07-18-…:502` corrected to match. |
| `activity` inserted after `pattern` in the `mget`/JSON | His three docs all show the activity trio **last** | **Append after `ts`** (key order is irrelevant to his key-lookup parser; matching his doc keeps `curl` output diffable) |

One audit-11 call survives and is adopted: **`normActivity` lives in
`contract.ts`, not `coerce.ts`** (audit 13 assumed `coerceActivity` in
`coerce.ts`). This keeps the dependency arrow one-way, `coerce.ts → contract.ts`
[14 §"One inherited inconsistency"].

---

## Track split and the frozen interface

| Track | Owns |
|---|---|
| **A** | `www/src/lib/contract.ts`, `www/src/lib/redis.ts`, `www/src/app/api/**`, `www/src/app/page.tsx` |
| **B** | `www/src/app/capture/page.tsx`, `www/src/lib/motion.ts` (new), all test files, `www/package.json` + vitest config |

Track B needs symbols Track A owns. **Resolved two ways so B is never blocked:**

**1. `motion.ts` imports nothing from `contract.ts`.** It declares its own
`MotionActivity = "STILL" | "MOVING"`, structurally identical to `UserActivity`.
This is deliberate, not laziness: a sensor classifier must not depend on the wire
contract. TypeScript is structural, so the two are mutually assignable, and
`motion.test.ts` pins that with a compile-time assertion so drift is caught.
**Track B can write and test `motion.ts` immediately, with zero dependency on A.**

**2. These signatures are FROZEN.** Track A must export exactly this; Track B may
code against it before A's commit lands.

```ts
// www/src/lib/contract.ts — the frozen surface Track B may rely on
export type UserActivity = "STILL" | "MOVING";
export interface ActivityState {
  activity: UserActivity;
  activitySeq: number;
  activityTs: number;
}
export const ACTIVITY_SEQ_MAX: 4294967295;
export function isUserActivity(v: unknown): v is UserActivity;
export function normActivity(v: unknown): UserActivity;      // defaults MOVING
export function normActivitySeq(v: unknown): number;         // clamped [0, ACTIVITY_SEQ_MAX]
export interface DeviceCommand extends ActivityState {
  seq: number; pattern: CloudPattern; route: string; dest: string;
  conf: Conf; arrivalId: number; ts: number;
}
```

```ts
// www/src/lib/redis.ts — frozen
export function writeActivity(a: UserActivity): Promise<ActivityState>;
```

```
// POST /api/activity   body: {"activity":"STILL"|"MOVING"}
//   200 -> ActivityState      400 -> {"error": string}
```

**Ordering.** A1 (`contract.ts`) is ~45 lines and unblocks everything. Land it
first if the tracks are serialised. If they run in parallel, B writes
`motion.ts` + `motion.test.ts` first (zero dependency), then `contract.test.ts`
and the capture page, which compile the moment A1 is on the branch. B iterates
without waiting via `pnpm exec vitest run src/lib/motion.test.ts`.

---

## Per-file change table

| Path | Track | Lines | Change |
|---|---|---|---|
| `www/src/lib/contract.ts` | A | after 41 | **INSERT** `UserActivity`, `isUserActivity`, `normActivity`, `ACTIVITY_SEQ_MAX`, `normActivitySeq`, `ActivityState` (~48 lines) |
| `www/src/lib/contract.ts` | A | 52-61 | **REPLACE** `DeviceCommand` → `extends ActivityState` |
| `www/src/lib/contract.ts` | A | 43-50 | **NO CHANGE** — `EventRequest` does not gain `activity` |
| `www/src/lib/contract.ts` | A | 203-211 | **NO CHANGE** — `sameEvent` stays a 4-field comparison |
| `www/src/lib/contract.ts` | A | 6-22 | **NO CHANGE** — no `LEFT`/`RIGHT`/`AHEAD` |
| `www/src/lib/redis.ts` | A | 8-15 | **REPLACE** import block — add a value import (`isolatedModules` forbids folding into `import type`) |
| `www/src/lib/redis.ts` | A | after 67 | **INSERT** `writeActivity()` (~22 lines) |
| `www/src/lib/redis.ts` | A | 69-86 | **REPLACE** `readCommand()` — `mget` widens 7 → 10 keys |
| `www/src/lib/redis.ts` | A | 56-67 | **NO CHANGE** — `writeCommand` must not learn about activity |
| `www/src/app/api/activity/route.ts` | A | new | **NEW FILE**, ~40 lines |
| `www/src/app/api/pull/route.ts` | A | — | **NO CHANGE** — inherits through `readCommand()` |
| `www/src/app/api/state/route.ts` | A | — | **NO CHANGE** — inherits through `readDebugState()`; `Omit<DeviceCommand,"seq">` widens for free |
| `www/src/app/api/event/route.ts` | A | — | **NO CHANGE — deliberately.** See "Where audit 11 loses" |
| `www/src/app/api/detector/route.ts` | A | — | **NO CHANGE** |
| `www/src/lib/coerce.ts` | A | — | **NO CHANGE** — `normActivity` belongs in `contract.ts` |
| `www/src/app/page.tsx` | A | 11-12, 32, 50-52, 80-97 | Render activity, activity seq, and **activity age against the 120 s lease** |
| `www/src/lib/motion.ts` | B | new | **NEW FILE** — the pure classifier, ~215 lines |
| `www/src/app/capture/page.tsx` | B | 9-19, 21-37, 47-72, after 251, 295-319, after 350 | Motion permission **before** `getUserMedia`, classifier wiring, manual control, heartbeat, diagnostics |
| `www/src/lib/motion.test.ts` | B | new | **NEW FILE** |
| `www/src/lib/contract.test.ts` | B | new | **NEW FILE** |
| `www/vitest.config.mts` | B | — | **NO CHANGE** — verified working |
| `www/package.json` | B | — | **NO CHANGE** — `test`/`test:watch` already present |
| `www/pnpm-workspace.yaml` | — | — | **DO NOT CREATE** — watch item only |
| `firmware/**` | — | — | **OUT OF SCOPE.** Superseded by PR #13 |

---

# Track A — the relay contract

## A1 · `www/src/lib/contract.ts`

**Insert after line 41** (below `isCloudPattern`):

```ts
/**
 * Which interaction phase the phone says the user is in.
 *
 * Wire values are EXACT and case-sensitive. The board does
 * `strcmp(value, "MOVING")` / `strcmp(value, "STILL")` in `parseUserActivity()`
 * (firmware/braille_wearable/src/relay_pure.h on Sebastian's branch) and maps
 * everything else — including nullptr — to `UserActivity::UNKNOWN`, which closes
 * the bus-information gate.
 *
 * NEVER serialise this as an integer. The firmware enum is
 * `{ UNKNOWN = 0, MOVING, STILL }`; it was reordered when the enum moved out of
 * navigation_pure.h, so STILL went from 0 to 2 [14 §navigation_pure.h delta].
 */
export type UserActivity = "STILL" | "MOVING";

export function isUserActivity(v: unknown): v is UserActivity {
  return v === "STILL" || v === "MOVING";
}

/**
 * MOVING unless the input is exactly "STILL".
 *
 * The default is MOVING, **not** STILL. This inverts audit 11 and issue #5, both
 * of which predate the firmware. `effectiveActivity()` in relay_pure.h returns
 * `UserActivity::MOVING` when cloud activity is UNKNOWN or its 120 s lease has
 * expired, and `acceptsRelayCommand(UNKNOWN, BUS)` is false. Missing activity
 * therefore means "show nothing", not "show bus info" — and the relay has to
 * fail in the same direction as the board, or the two disagree about what
 * silence means. [14 §Conflict map]
 *
 * READ path only. POST /api/activity rejects an unrecognised value with 400
 * rather than defaulting: the phone is the only client and a typo there must be
 * loud, not silently resolved to MOVING.
 */
export function normActivity(v: unknown): UserActivity {
  return isUserActivity(v) ? v : "MOVING";
}

/**
 * ArduinoJson `is<uint32_t>()` ceiling. Above this the board skips the ENTIRE
 * activity block with no error anywhere, and cloud activity is dead until the
 * next reboot.
 */
export const ACTIVITY_SEQ_MAX = 4294967295;

/**
 * Coerce a stored activity sequence into something the board can actually read.
 *
 * `Date.now()` is ~1.78e12 and fails `is<uint32_t>()`. That is the single
 * easiest way to silently disable this feature, which is why the ceiling is a
 * named constant with a test asserting `Date.now() > ACTIVITY_SEQ_MAX`.
 *
 * Clamping at the ceiling rather than passing the value through is deliberate:
 * both failure modes end with the board on its MOVING fallback after the lease,
 * but a clamped value keeps the field TYPE-valid, so the shape stays debuggable
 * over curl. Reaching the ceiling takes 4.29e9 INCRs — ~4,000 years at the 30 s
 * heartbeat — so this is a guard, not a design constraint.
 */
export function normActivitySeq(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  const i = Math.trunc(n);
  if (i < 0) return 0;
  return i > ACTIVITY_SEQ_MAX ? ACTIVITY_SEQ_MAX : i;
}

/**
 * The independently versioned half of the /api/pull response.
 *
 * Split out as its own interface so the independence rule in AGENTS.md is
 * visible in the type system: `writeCommand()` never produces one of these and
 * `writeActivity()` never produces a command. An activity heartbeat must not
 * increment command `seq` or refresh a previous command's `ts`.
 */
export interface ActivityState {
  activity: UserActivity;
  /** Independent edge-trigger. Small monotonic counter — NEVER a timestamp. */
  activitySeq: number;
  /** ms epoch of the activity write. Documented by firmware, never parsed by
   *  it — for the debug screen and forward-compat only. [14 §activityTs] */
  activityTs: number;
}
```

**Replace lines 52-61** (`DeviceCommand`):

```ts
/**
 * What the ESP32 receives from /api/pull.
 *
 * Two independently versioned pieces of state in one flat JSON object: `seq`
 * edge-triggers the cloud pattern, `activitySeq` edge-triggers the activity gate
 * and refreshes its 120 s lease. Neither may move the other.
 *
 * The activity trio is serialised LAST, after `ts`, matching
 * RELAY-FOR-FIRMWARE.md, the two-phase gating design spec, and the plan's
 * Contract C JSON example. His parser is key-lookup based so order cannot break
 * it; matching his doc keeps curl output diffable against the handoff spec.
 */
export interface DeviceCommand extends ActivityState {
  seq: number; // monotonic; the device's edge-trigger
  pattern: CloudPattern;
  route: string;
  dest: string;
  conf: Conf;
  arrivalId: number;
  ts: number; // ms epoch of the server write — staleness check
}
```

**No other edit to this file.** In particular `EventRequest` (43-50), `sameEvent`
(203-211), `PatternId` (6-19), `CloudPattern` (21-22) and `CLOUD_PATTERNS`
(30-37) are untouched.

A pleasant consequence of keeping activity off `EventRequest`: audit 11's
residual risk #1 — "a heartbeat will re-fire live patterns" — **disappears
entirely**. The heartbeat goes down a different endpoint and cannot touch `seq`.

## A2 · `www/src/lib/redis.ts`

**Replace lines 8-15** (the import block):

```ts
import { Redis } from "@upstash/redis";
// A separate value import, not stylistic: tsconfig sets `isolatedModules: true`,
// so a value cannot be folded into the `import type` clause below.
import { normActivity, normActivitySeq } from "./contract";
import type {
  ActivityState,
  DebugState,
  DetectorState,
  DeviceCommand,
  EventRequest,
  Telemetry,
  UserActivity,
} from "./contract";
```

**Insert after line 67** (after `writeCommand`, before `readCommand`):

```ts
/**
 * Publish the phone's interaction phase. Independent of the command.
 *
 * Same MSET-before-INCR discipline as writeCommand(), for the same reason: the
 * board edge-triggers on `activitySeq`, so the value must already be stored
 * before the counter bumps. A poll landing between the two reads the new
 * activity with the old activitySeq and ignores it — harmless, and the next poll
 * 300 ms later collects it. Reversed, the board would fire on a counter pointing
 * at the PREVIOUS activity value. Do not reorder.
 *
 * This function must NEVER write `seq`, `ts`, `pattern`, `route`, `dest`,
 * `conf`, or `arrivalId`. AGENTS.md (Sebastian's revision): "Activity freshness
 * is independent from command delivery. An activity heartbeat must not increment
 * command `seq` or refresh an old command timestamp." A heartbeat that bumped
 * `seq` would re-fire whatever pattern was last published, on a wrist, every
 * 30 seconds.
 *
 * EVERY call bumps activitySeq, including a heartbeat re-posting an unchanged
 * value. That bump IS the mechanism — applyCloudActivity() refreshes the 120 s
 * lease only when the counter advances, and refreshEffectiveActivity()
 * early-returns when the value is unchanged, so no pattern stops and no
 * proximity state churns. It costs one Serial log line per beat. [14 §Remaining
 * delta]
 */
export async function writeActivity(a: UserActivity): Promise<ActivityState> {
  const activityTs = Date.now();
  await redis.mset({ activity: a, activityTs }); // payload first
  const activitySeq = await redis.incr("activitySeq"); // signal last
  return { activity: a, activitySeq: normActivitySeq(activitySeq), activityTs };
}
```

**Replace lines 69-86** (`readCommand`):

```ts
/**
 * Snapshot command + activity for the ESP32 poll (`/api/pull`).
 *
 * ONE mget across both key sets, deliberately: `mget` is atomic per command, so
 * the board can never see activity from one write paired with a command from
 * another. Two calls would be two round trips and a torn read.
 */
export async function readCommand(): Promise<DeviceCommand> {
  // Three lists that must stay index-aligned: the bindings, the tuple, and the
  // key names. `mget`'s generic is a bare assertion, not a checked contract — a
  // key list SHORTER than the tuple compiles clean (verified against the
  // installed @upstash/redis 1.38.0) and silently shifts every field after the
  // gap. Add to all three or none. [11 §"mget alignment, verified"]
  const [seq, pattern, route, dest, conf, arrivalId, ts, activity, activitySeq, activityTs] =
    await redis.mget<
      [
        number,
        DeviceCommand["pattern"],
        string,
        string,
        DeviceCommand["conf"],
        number,
        number,
        DeviceCommand["activity"],
        number,
        number,
      ]
    >(
      "seq",
      "pattern",
      "route",
      "dest",
      "conf",
      "arrivalId",
      "ts",
      "activity",
      "activitySeq",
      "activityTs",
    );
  return {
    seq: seq ?? 0,
    pattern: pattern ?? "NONE",
    // `String(...)`, because Upstash deserialises a stored "88" back to the
    // number 88 and the device expects a JSON string here. Without this the
    // wire contract says `"route": 88` while the type says `string`.
    route: route == null ? "" : String(route),
    dest: dest ?? "",
    conf: conf ?? "",
    arrivalId: arrivalId ?? 0,
    ts: ts ?? 0,
    // A relay that has never been told resolves to MOVING with activitySeq 0.
    // Both fields are ALWAYS emitted and always well-typed: the board requires
    // `activity.is<const char*>() && activitySeq.is<uint32_t>()` together, and
    // omitting either skips the whole block silently. Seeding at 0 also lets a
    // freshly booted board take 0 as its non-rendering baseline, so the FIRST
    // real write (seq 1) renders instead of being swallowed. [14 §open Q3]
    activity: normActivity(activity),
    activitySeq: normActivitySeq(activitySeq),
    activityTs: activityTs ?? 0,
  };
}
```

`readDebugState()` at 108-117 needs **no change** — the `const { seq, ...device }`
rest spread carries all three new fields into `DebugState.device` automatically.

## A3 · `www/src/app/api/activity/route.ts` — NEW FILE

```ts
// The phone POSTs its STILL/MOVING interaction phase here.
//
// Deliberately NOT /api/event. Activity is versioned independently of the
// command, and an activity write must never bump command `seq` or refresh
// command `ts` — AGENTS.md: "Activity freshness is independent from command
// delivery." Sebastian left the route name to us: "The exact web setter route is
// not a firmware dependency. Only the /api/pull response shape matters to the
// board."
//
// Every POST bumps activitySeq, including a heartbeat carrying an unchanged
// value. That is the design: the board's 120 s activity lease is refreshed only
// when the counter advances.
import { writeActivity } from "@/lib/redis";
import { CORS, preflight } from "@/lib/cors";
import { isUserActivity } from "@/lib/contract";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400, headers: CORS });
  }

  const activity = (body as { activity?: unknown } | null)?.activity;
  // Rejected, not defaulted. normActivity() defaults on the READ path because
  // the board needs a well-formed field even when Redis is empty; here the phone
  // is the only client and a typo must surface as a 400 rather than silently
  // resolving to MOVING and closing the bus gate mid-demo.
  if (!isUserActivity(activity)) {
    return Response.json(
      { error: 'activity must be "STILL" or "MOVING"' },
      { status: 400, headers: CORS },
    );
  }

  const written = await writeActivity(activity);
  return Response.json(written, { headers: CORS });
}

export function OPTIONS() {
  return preflight();
}
```

Next 16 conventions confirmed against the local docs
(`www/node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`):
`GET`/`POST`/`OPTIONS` exports, native `Response`, and
`export const dynamic = "force-dynamic"` all remain valid — Cache Components is
not enabled in `www/next.config.ts`, so the route segment config is untouched
[AGENTS.md §Implementation Rules].

## A4 · `www/src/app/api/pull/route.ts` and `/api/state/route.ts` — NO CHANGE

Both serialise whatever `readCommand()` / `readDebugState()` return. Widening
`DeviceCommand` widens both handlers for free. Confirm by diff, not by editing.

## A5 · `www/src/app/page.tsx`

**Replace lines 11-12:**

```tsx
const POLL_MS = 500;
const EMPTY = "–";
// CLOUD_ACTIVITY_LEASE_MS in firmware/braille_wearable/src/relay_pure.h. Past
// this the board discards cloud activity and falls back to MOVING, closing the
// bus gate. The heartbeat exists to stop that happening; this readout is how we
// SEE it working rather than assume it. [14 §Remaining delta]
const ACTIVITY_LEASE_MS = 120_000;
```

**Replace line 32:**

```tsx
          setAgeMs(data.device.ts ? Date.now() - data.device.ts : null);
          setActivityAgeMs(data.device.activityTs ? Date.now() - data.device.activityTs : null);
```

**Replace line 16** (add the state hook beside `ageMs`):

```tsx
  const [ageMs, setAgeMs] = useState<number | null>(null);
  const [activityAgeMs, setActivityAgeMs] = useState<number | null>(null);
```

**Replace lines 80-97** (the headline row and the `<dl>`):

```tsx
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3">
            <span className="font-mono text-xl font-medium">{cmd?.pattern ?? EMPTY}</span>
            {cmd?.pattern === "NUMBER" && (
              <span className="font-mono text-xl font-medium tabular-nums text-primary">
                {cmd.route}
              </span>
            )}
            {/* The board gates the pattern above on this, so the two belong on
                one line: read together they say whether the device will act at
                all. MOVING accepts only NONE and ERROR. */}
            <span className="font-mono text-sm text-muted-foreground">
              {cmd?.activity ?? EMPTY}
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Destination" value={cmd?.dest || EMPTY} />
            <Field label="Confidence" value={cmd?.conf || EMPTY} />
            <Field label="Arrival" value={cmd?.arrivalId ?? EMPTY} num />
            <Field
              label="Age"
              value={ageMs === null ? EMPTY : `${(ageMs / 1000).toFixed(1)}s`}
              num
            />
            <Field label="Activity seq" value={cmd?.activitySeq ?? EMPTY} num />
            <Field
              label="Activity age"
              value={activityAgeMs === null ? EMPTY : `${(activityAgeMs / 1000).toFixed(1)}s`}
              num
              // Past the lease the board has already reverted to MOVING. Showing
              // this in destructive colour turns a silent two-minute decay into
              // something visible from the back of the room.
              alert={activityAgeMs !== null && activityAgeMs > ACTIVITY_LEASE_MS}
            />
          </dl>
```

**Replace the `Field` component at lines 159-174** to accept `alert`:

```tsx
function Field({
  label,
  value,
  num = false,
  alert = false,
}: {
  label: string;
  value: React.ReactNode;
  num?: boolean;
  alert?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={`truncate text-sm ${num ? "font-mono tabular-nums" : ""} ${
          alert ? "text-destructive" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
```

---

# The `/api/pull` wire contract

## Exact response, field by field

`GET` and `POST /api/pull` return the identical body. Key order is the object
literal order in `readCommand()`.

```jsonc
{
  "seq": 24,                      // number, integer  — command edge-trigger
  "pattern": "NUMBER",            // string           — CloudPattern, six values only
  "route": "88",                  // string, always   — "" unless pattern === "NUMBER"
  "dest": "Clapham Common",       // string           — parsed and DISCARDED on device
  "conf": "high",                 // string           — "high" | "low" | ""
  "arrivalId": 3,                 // number, integer
  "ts": 1784408660375,            // number, ms epoch — command write time
  "activity": "STILL",            // string           — EXACTLY "STILL" or "MOVING"
  "activitySeq": 41,              // number, integer  — 0 … 4294967295
  "activityTs": 1784408660001     // number, ms epoch — never parsed by firmware
}
```

| Field | JSON type | TS type | Firmware guard | Failure if wrong |
|---|---|---|---|---|
| `seq` | integer | `number` | `is<uint32_t>()` | **Whole response rejected**, activity included |
| `pattern` | string | `CloudPattern` | `is<const char*>()` | **Whole response rejected** |
| `route` | string | `string` | `char[8]` copy | Route-88 waveform will not play |
| `dest` | string | `string` | discarded | none |
| `conf` | string | `Conf` | `parseRelayConfidence` | `NUMBER` demoted to low confidence |
| `arrivalId` | integer | `number` | `\| 0U` default | none |
| `ts` | integer | `number` | optional guard | none |
| **`activity`** | **string** | `UserActivity` | `is<const char*>()` **and** `strcmp` to `"MOVING"`/`"STILL"` | Activity block skipped **silently**; board falls back to MOVING |
| **`activitySeq`** | **integer ≤ 4294967295** | `number` | `is<uint32_t>()` **and** `> lastActivitySeq` | Same silent skip. A `Date.now()` here disables activity permanently |
| `activityTs` | integer | `number` | **not parsed** | none |

Full body above is **176 bytes**; `MAX_RESPONSE_BYTES = 768`. Do not add
anything large to this route.

## Worked example — boot, first transition, heartbeat, second transition

Command state is frozen at `seq: 24` throughout to make the independence visible.

| t | Action | Redis writes | `/api/pull` returns | Board |
|---|---|---|---|---|
| 0 s | Board boots. No activity has ever been written. | — | `…,"ts":1784408660375,"activity":"MOVING","activitySeq":0,"activityTs":0` | `activityObserved = false` → **baseline at 0, does not render**. `effectiveActivity` = MOVING (fallback). Bus gate shut, ToF proximity live |
| 12 s | User taps **STILL**. `POST /api/activity {"activity":"STILL"}` | `MSET activity="STILL" activityTs=…001` then `INCR activitySeq` → **1** | `…,"activity":"STILL","activitySeq":1,"activityTs":1784408672001` | `1 > 0` → `hasActivity`. `applyCloudActivity(STILL)`, **lease starts**. Bus gate opens, proximity output cleared |
| 42 s | **Heartbeat.** Same value re-posted. | `MSET activity="STILL" activityTs=…001` then `INCR` → **2** | `…,"activity":"STILL","activitySeq":2,…` | `2 > 1` → applies STILL again. `refreshEffectiveActivity` early-returns (unchanged) — **no pattern stops, no proximity churn**. Lease refreshed. One Serial line |
| 72 s | Heartbeat | `INCR` → **3** | `"activitySeq":3` | Lease refreshed |
| 102 s | Heartbeat | `INCR` → **4** | `"activitySeq":4` | Lease refreshed |
| 118 s | Classifier fires **MOVING** (user walks off). | `MSET activity="MOVING" activityTs=…` then `INCR` → **5** | `…,"activity":"MOVING","activitySeq":5,…` | `5 > 4` → MOVING. Bus gate closes, ToF proximity re-enabled. Heartbeat timer **re-armed from this post**, next beat at 148 s |

**Without the heartbeat**, row 42/72/102 vanish and at t = 132 s the board's
`nowMs - cloudUpdatedMs` exceeds 120,000: `effectiveActivity()` silently returns
`MOVING`, the bus gate shuts, and ToF proximity starts firing at a user standing
still at a bus stop. That is the landmine [14 §Remaining delta, Q1].

**Command independence proof:** `seq` and `ts` are byte-identical in every row.
Six activity writes moved nothing on the command side.

---

# Track B — the phone classifier

## B1 · `www/src/lib/motion.ts` — NEW FILE, complete

```ts
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
   * misses walking by ~3.5× on the worst-case axis. See §"Numerically
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

/** See the threshold table in audit 15 §"Classifier spec" for GROUNDED vs
 *  ASSUMED on every one of these. */
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
export function readMagnitude(
  s: MotionSample,
): { value: number; fromGravity: boolean } | null {
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
```

## B2 · `www/src/app/capture/page.tsx`

**Scope guard.** The camera path is unchanged. Sebastian's plan marks this file
"REUSE for capture/Modal submission… A separate activity setter may be added,
but **do not gate frame submission** or **translate target bearing into device
commands**." Capture runs at 2 Hz in both phases. `detectorToEvent`, `sameEvent`,
`tick`, `drawBoxes`, `grabFrameB64`, `stop` and the whole detector UI are
untouched. LEFT/RIGHT/AHEAD are off the wire; his parser returns
`CloudCommand::INVALID` for all three and his test asserts it.

**Replace lines 9-19** (imports):

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  detectorToEvent,
  sameEvent,
  type ActivityState,
  type DetectorState,
  type EventRequest,
  type ModalDetection,
  type ModalResponse,
  type UserActivity,
} from "@/lib/contract";
import {
  initialMotionState,
  requestMotionPermission,
  step,
  type MotionPermission,
  type MotionState,
} from "@/lib/motion";
```

**Replace lines 21-37** (constants):

```tsx
const CAPTURE_MS = 500; // 2 Hz – a bus pulling in is a multi-second event
const JPEG_QUALITY = 0.85;
const VISIBLE_LABELS = 6; // how many detections the list shows under the video

/**
 * Activity heartbeat, well under the board's CLOUD_ACTIVITY_LEASE_MS = 120000
 * (firmware/braille_wearable/src/relay_pure.h).
 *
 * The board refreshes its activity lease ONLY when activitySeq advances, so a
 * steady STILL that is never re-posted silently decays to MOVING after two
 * minutes — reopening ToF proximity output and closing the bus gate on a user
 * standing at a bus stop. Four beats per lease survives three consecutive failed
 * posts. It also bounds post-reboot recovery: a board that reboots mid-demo
 * takes the next value it sees as a non-rendering baseline and needs one more
 * advance, so 30 s is the worst-case blind window. [14 §Remaining delta]
 */
const ACTIVITY_HEARTBEAT_MS = 30_000;
/** How often the sensor diagnostics are copied into React state. The raw event
 *  stream can be 60 Hz; re-rendering at 60 Hz from a sensor is a real bug. */
const DIAG_MS = 500;

const MODAL_URL = process.env.NEXT_PUBLIC_MODAL_URL ?? "";

const IDLE_EVENT: EventRequest = {
  pattern: "NONE",
  route: "",
  dest: "",
  conf: "",
  arrivalId: 0,
};

type ActivityMode = "off" | "manual" | "auto";
```

**Insert after line 72** (after the existing `useState` block, before
`grabFrameB64`):

```tsx
  // --- activity relay ------------------------------------------------------
  const [activity, setActivityState] = useState<UserActivity>("MOVING");
  const [mode, setMode] = useState<ActivityMode>("off");
  const [motionPermission, setMotionPermission] = useState<MotionPermission | null>(null);
  const [lastWrite, setLastWrite] = useState<ActivityState | null>(null);
  const [lastTransitionAt, setLastTransitionAt] = useState<number | null>(null);
  const [relayError, setRelayError] = useState("");
  const [diag, setDiag] = useState<MotionState>(initialMotionState);

  const activityRef = useRef<UserActivity>("MOVING");
  const modeRef = useRef<ActivityMode>("off");
  const motionRef = useRef<MotionState>(initialMotionState());
  const postInFlight = useRef(false);
  const postPending = useRef<UserActivity | null>(null);
  const beatRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const postRef = useRef<(a: UserActivity) => void>(() => {});

  /**
   * POST the activity and re-arm the heartbeat from the moment the POST
   * COMPLETES, rather than running a free-running interval.
   *
   * A transition and a heartbeat issued milliseconds apart can land in Redis out
   * of order, and the loser would win permanently: activitySeq only ever goes
   * up, so the board honours whichever write got the higher counter, not
   * whichever the user meant last. Serialising through an in-flight guard makes
   * the last POST *issued* the last one stored.
   */
  const postActivity = useCallback(async (a: UserActivity) => {
    if (postInFlight.current) {
      postPending.current = a;
      return;
    }
    postInFlight.current = true;
    try {
      const res = await fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity: a }),
      });
      if (!res.ok) throw new Error(`relay returned ${res.status}`);
      setLastWrite((await res.json()) as ActivityState);
      setRelayError("");
    } catch {
      // Do not retry here: at 30 s against a 120 s lease the next beat covers
      // three consecutive failures. The diagnostics panel is what makes a dead
      // relay visible instead of silent.
      setRelayError("Activity relay unreachable. The board reverts to MOVING after 120s.");
    } finally {
      postInFlight.current = false;
      if (beatRef.current) clearTimeout(beatRef.current);
      beatRef.current = setTimeout(
        () => postRef.current(activityRef.current),
        ACTIVITY_HEARTBEAT_MS,
      );
      const queued = postPending.current;
      postPending.current = null;
      if (queued !== null && queued !== a) postRef.current(queued);
    }
  }, []);

  useEffect(() => {
    postRef.current = (a) => void postActivity(a);
  }, [postActivity]);

  /** The single setter. The classifier and the manual buttons both go through
   *  it, so the sensor can be switched off on stage without touching the relay. */
  const applyActivity = useCallback((a: UserActivity, source: "manual" | "sensor") => {
    if (source === "sensor" && modeRef.current !== "auto") return;
    // Below ~10 Hz delivered, peak detection is operating on unusable data and
    // the derived state is noise. Audit 10 §4: "declare the sensor degraded and
    // fall back to manual rather than emitting a state derived from unusable
    // data." The classifier still transitions — it reports, we decide — but a
    // degraded transition must not reach the relay and flip the board.
    if (source === "sensor" && motionRef.current.degraded) return;
    activityRef.current = a;
    setActivityState(a);
    setLastTransitionAt(Date.now());
    postRef.current(a);
  }, []);

  const setManual = useCallback(
    (a: UserActivity) => {
      modeRef.current = "manual";
      setMode("manual");
      applyActivity(a, "manual");
    },
    [applyActivity],
  );

  // Feed devicemotion into the pure fold. Only a genuine activity CHANGE posts;
  // everything else is diagnostics, sampled at DIAG_MS so React never re-renders
  // at sensor rate.
  useEffect(() => {
    if (motionPermission !== "granted") return;
    const onMotion = (e: DeviceMotionEvent) => {
      const prev = motionRef.current;
      const next = step(prev, {
        t: e.timeStamp,
        acceleration: e.acceleration,
        accelerationIncludingGravity: e.accelerationIncludingGravity,
        rotationRate: e.rotationRate,
      });
      motionRef.current = next;
      if (next.activity !== prev.activity) applyActivity(next.activity, "sensor");
    };
    window.addEventListener("devicemotion", onMotion);
    const diagId = setInterval(() => setDiag(motionRef.current), DIAG_MS);
    return () => {
      window.removeEventListener("devicemotion", onMotion);
      clearInterval(diagId);
    };
  }, [motionPermission, applyActivity]);

  useEffect(
    () => () => {
      if (beatRef.current) clearTimeout(beatRef.current);
    },
    [],
  );
```

**Replace lines 221-242** (the `start` handler — this is the ordering fix):

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
    if (permission === "granted") {
      modeRef.current = "auto";
      setMode("auto");
      motionRef.current = initialMotionState();
    }

    // 2. CAMERA SECOND. getUserMedia requires a secure context and permission
    //    but not transient activation, so it is safe after the await above.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      lastEventRef.current = IDLE_EVENT;
      setRunning(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? `The camera could not start – ${e.message}. Allow camera access for this site, then try again.`
          : "The camera could not start. Allow camera access for this site, then try again.",
      );
    }
  }, []);
```

**Insert a new section after line 350** (after the "In view" `<section>`, before
the "Bus" `<section>`). The manual control is always visible: audit 14 —
"Ship a manual STILL/MOVING control first — the demo depends on a deterministic
transition." Every sensor failure mode degrades to exactly this.

```tsx
            <section className="rounded-lg border border-border bg-card p-4 text-card-foreground">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-medium">Activity</h2>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {mode === "auto" ? "sensor" : mode === "manual" ? "manual" : "off"}
                  {lastWrite ? ` · seq ${lastWrite.activitySeq}` : ""}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={activity === "STILL" ? "default" : "outline"}
                  onClick={() => setManual("STILL")}
                >
                  Still
                </Button>
                <Button
                  size="sm"
                  variant={activity === "MOVING" ? "default" : "outline"}
                  onClick={() => setManual("MOVING")}
                >
                  Moving
                </Button>
                {motionPermission === "granted" && mode === "manual" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      modeRef.current = "auto";
                      setMode("auto");
                      motionRef.current = initialMotionState();
                    }}
                  >
                    Resume sensor
                  </Button>
                )}
              </div>

              {/* Diagnostics — issue #5 requires permission state, sensor
                  availability, derived activity and last transition time. The
                  measured rate is the one that matters most: browsers have been
                  reported dropping to 1 Hz, which kills peak detection silently
                  and freezes the state at whatever it last held. [10 §4] */}
              <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Diag label="Permission" value={motionPermission ?? "not asked"} />
                <Diag
                  label="Sensor"
                  value={
                    motionPermission !== "granted"
                      ? "unavailable"
                      : diag.sensorUnavailable
                        ? "null samples"
                        : diag.usingGravityFallback
                          ? "gravity fallback"
                          : "ok"
                  }
                />
                <Diag
                  label="Rate"
                  value={diag.rateHz === null ? "–" : `${diag.rateHz.toFixed(0)} Hz`}
                  alert={diag.degraded}
                />
                <Diag label="Peaks / window" value={String(diag.peaks.length)} />
                <Diag
                  label="Last change"
                  value={
                    lastTransitionAt === null
                      ? "–"
                      : `${((Date.now() - lastTransitionAt) / 1000).toFixed(0)}s ago`
                  }
                />
                <Diag
                  label="Relay"
                  value={lastWrite ? `seq ${lastWrite.activitySeq}` : "never written"}
                  alert={Boolean(relayError)}
                />
              </dl>

              {diag.degraded && motionPermission === "granted" && (
                <p className="mt-3 text-sm text-muted-foreground">
                  The motion sensor is delivering below 10 Hz. Use the manual control — a state
                  derived from this data is not trustworthy.
                </p>
              )}
              {motionPermission !== null && motionPermission !== "granted" && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Motion permission is {motionPermission}. Use the manual control. iOS removed the
                  Settings toggle in iOS 13 — the only grant path is this page&apos;s prompt, over
                  HTTPS.
                </p>
              )}
              {relayError && (
                <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {relayError}
                </p>
              )}
            </section>
```

**Append at the end of the file** (beside the existing helpers):

```tsx
function Diag({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={`truncate font-mono text-sm tabular-nums ${alert ? "text-destructive" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
```

**Note on where the heartbeat starts.** Nothing is posted until the first
explicit assertion — a manual button, or the classifier's first transition. That
is deliberate: opening the page in a second tab must not silently INCR
`activitySeq` and flip a board that someone has set to STILL. From the first
assertion onward the beat is self-sustaining, re-armed after every completed POST.

---

# Classifier spec

Each parameter is GROUNDED (traced to a citation in audit 10) or
ASSUMED-NEEDS-BENCH, with the measurement that settles it.

| Parameter | Value | Status | Settles with |
|---|---|---|---|
| Signal | magnitude `sqrt(x²+y²+z²)` of `acceleration` | **GROUNDED** — immune to the iOS/Android sign-convention disagreement on `accelerationIncludingGravity` | — |
| Fallback signal | `accelerationIncludingGravity` magnitude, EMA-subtracted | **GROUNDED** — the null mode is real and per-spec | Confirm the fallback path is exercised, not dead code |
| Smoothing `smoothTauMs` | 100 ms EMA time constant | **GROUNDED** — walking is <5 Hz. The time-constant form (not fixed-N) is ASSUMED, chosen because delivered rate varies ~1–67 Hz | Measured-Hz readout during the walk test |
| Bias `biasTauMs` | 1500 ms | **ASSUMED** | Peak-prominence logging run: the baseline must track posture drift without eating step peaks. Simulated at 1500/3000/6000/20000 ms — see §"Numerically validated" finding 1, it moves the marginal band but not the suprathreshold case |
| Peak prominence (`acceleration`) | **1.2 m/s²** | **ASSUMED-NEEDS-BENCH** — no published figure exists for a phone held in camera-aiming posture. Deliberately permissive: the periodicity gate carries false-positive rejection, and a too-high bar silently loses cautious walkers | **60 s logging run in capture posture: 30 s standing still while panning, 30 s walking. Set the threshold between the two populations, near 40% of the median walking peak.** Log the *steady-state* peak, not the first step — see finding 1. The highest-value bench item after the permission test |
| Peak prominence (`accelerationIncludingGravity`) | **0.6 m/s²** | **ASSUMED-NEEDS-BENCH.** Must be a separate, lower number: the gravity-inclusive magnitude responds to a perpendicular gait component only in quadrature. Simulation says a shared threshold misses walking by ~3.5× on the worst axis | Same logging run, on a device that actually returns null `acceleration`. If none is to hand, the path is exercised by test 13 only |
| Peak cooldown | **300 ms** | **GROUNDED** — permits 3.33 steps/s, above the fastest normal walking (2.3 Hz ⇒ 435 ms), so it cannot suppress a real step; still rejects the heel-strike/push-off pair | — |
| Step interval band | **350–850 ms** | **GROUNDED** — 1.4–2.3 Hz documented step frequency, widened ~15% | — |
| Cadence gate | **≥3 peaks in 2500 ms**, plus **≥2 consecutive in-band intervals** | **GROUNDED** — 3 in 2.5 s demands 72 steps/min, below every documented normal cadence (slowest documented normal male: 81 steps/min). The interval-consistency test is the part that separates walking from camera panning | Slow-deliberate-walk run |
| Entry debounce | **1200 ms** | **ASSUMED** — the gate already needs ~1.0–1.5 s of peaks, so total entry ≈ 2.5 s | Measured STILL→MOVING transition time on the walk test |
| Exit debounce | **2000 ms** | **ASSUMED but well-reasoned** — tolerates two consecutive missed steps (longest normal interval ~0.85 s). Asymmetric on purpose: entry needs proof of periodicity, exit is triggered by mere absence | Measured MOVING→STILL time |
| Gap reset | **2000 ms**, and any `dt < 0` | **ASSUMED** | Background/foreground the tab mid-walk and confirm the state resolves STILL rather than freezing MOVING |
| Min usable rate | **10 Hz** measured | **GROUNDED** — Nyquist needs >4 Hz for 2 Hz steps; prominence estimation realistically wants ≥10 Hz | The diagnostics readout, watched live |
| Rate EMA alpha | 0.2 | **ASSUMED** — diagnostics only, gates nothing | — |

**Hard requirements the module satisfies, each traceable to issue #5 or audit 10:**

- **Pure.** No `window`, no timers, no fetch in the fold. `requestMotionPermission`
  is fenced at the bottom and touches `DeviceMotionEvent` only inside its body.
- **Both null modes handled** — whole object null (spec) and individually-null
  components (Chromium). Either yields `null` from `readMagnitude`,
  `sensorUnavailable: true`, and no throw.
- **`event.timeStamp` only.** Never `Date.now()`, never a sample count.
- **Inter-peak interval consistency test** present in `cadenceGate` — a bare peak
  count is too weak because hand jitter can produce three peaks in 2.5 s.
- **`rotationRate` never gates a transition.** It is read, magnitude-reduced, and
  stored for diagnostics. Issue #5, verbatim: "Do not equate a single gyro spike
  with MOVING."
- **Separate entry/exit thresholds** via `candidateSince` / `quietSince`, so a
  signal oscillating around the gate cannot flap.
- **Total.** Every input path returns a state; nothing throws for NaN, Infinity,
  null, duplicate timestamps, or backwards time.

## Numerically validated

The algorithm above was implemented as a plain-JS mirror and swept before this
plan was written, because handing an implementer unvalidated fixtures wastes a
day. Everything in this subsection is a **simulation on synthetic waveforms, not
a phone measurement** — it bounds the algorithm's behaviour, it does not
establish that a real phone produces these amplitudes. That is still the bench
run's job.

**Finding 1 — the threshold applies to the smoothed, baseline-subtracted signal,
and the steady state is much lower than the first step.** A magnitude signal is
one-sided, so its mean is non-zero and the bias EMA converges *onto* it. Measured
steady-state ratio of smoothed peak to raw amplitude: **0.358**, stable across
amplitudes (amp 6 → 2.15, amp 4 → 1.43, amp 3 → 1.07).

| Raw amplitude | Smoothed peak, first 2 s | Steady state | Outcome |
|---|---|---|---|
| 2.5 | 1.75 | 0.90 | MOVING @2467 ms, then **reverts** to STILL @4667 ms |
| 3.0 | 2.10 | 1.07 | MOVING @2467 ms, then **reverts** @5767 ms |
| 3.5 | 2.45 | 1.25 | MOVING @2467 ms, holds |
| 4.0 | 2.80 | 1.43 | MOVING @2467 ms, holds |
| 6.0 | 4.20 | 2.15 | MOVING @2467 ms, holds |

So `peakProminence: 1.2` corresponds to an **effective raw threshold of ~3.35
m/s²**, and there is a marginal band (~2.5–3.4) where the classifier fires on the
first-step transient and then loses the state. **The bench run must log the
steady-state peak, not the first step**, or the threshold will be set ~2.9× too
high. This band is below the documented walking range ("several m/s²; hip peaks
can exceed ±4 g"), so it is a calibration hazard rather than an expected
operating point — but it must be a named test.

**Finding 2 — the gravity fallback is axis-dependent.** Final state after 8 s of
1.9 Hz gait with `acceleration: null`:

| Gait axis | Raw magnitude swing | Shared 1.2 threshold | Separate 0.6 threshold |
|---|---|---|---|
| along gravity, amp 3 | 3.00 | STILL (miss) | **MOVING** |
| along gravity, amp 6 | 6.00 | MOVING | MOVING |
| ⟂ gravity, amp 6 | **1.69** | STILL (miss) | STILL (still misses) |
| ⟂ gravity, amp 10 | 4.20 | MOVING | MOVING |

Hence `peakProminenceGravity`. The perpendicular case still needs a large
amplitude, and that is honest: the geometry genuinely destroys the signal. Real
gait's dominant component is vertical, so the along-gravity row is the realistic
one — but a phone tilted into camera-aiming posture sits between the two.

**Finding 3 — stationary noise does not flap.** 60 s at 30 Hz of uniform noise on
all three axes, zero transitions at every level tested:

| Noise | `acceleration` path | gravity path @0.6 |
|---|---|---|
| ±0.05 … ±0.6 m/s² | 0 flips | 0 flips |
| ±1.0 m/s² | — | 0 flips |

That is issue #5's "a stationary phone does not flap during a 60-second bench
run", satisfied in simulation. Lowering the gravity threshold to 0.6 did **not**
open a false-positive hole.

**Finding 4 — camera panning is rejected up to ~0.5 Hz, and is genuinely
ambiguous at 0.8 Hz.** 60 s of large (amp 4) two-tone sweeps while stationary:

| Pan rate | Flips in 60 s |
|---|---|
| 0.3 Hz | 0 |
| 0.5 Hz | 0 |
| **0.8 Hz** | **2** |

A one-sided magnitude folds a 0.8 Hz sweep to 1.6 Hz peaks — 625 ms spacing,
squarely inside the 350–850 ms gait band. **A perfectly periodic 0.8 Hz pan is
mathematically indistinguishable from walking** to any cadence-based classifier.
Real panning is aperiodic, which is why 0.3 and 0.5 Hz reject cleanly, but this
is a hard limit of the approach and not a tuning bug. It is why the manual
control is not optional.

**Finding 5 — sampling rate does not matter across the plausible range.**
Transition time for the amp-6 positive case: 10 Hz → 3000 ms, 15 Hz → 2467,
20 Hz → 2500, 30 Hz → 2467, 60 Hz → 2450. The time-constant EMA does its job; a
fixed-N moving average would not have.

**Finding 6 — the cadence band behaves as designed.** 1.2 Hz → MOVING @5667 ms;
1.4 / 1.7 / 1.9 / 2.2 / 2.4 Hz → MOVING @2200–2933 ms; **3.0 Hz → STILL** (333 ms
spacing, below `stepMinMs`); 6 Hz → STILL, zero peaks. Slow walking at 72
steps/min is admitted, running is not.

---

# Test specification

## Config and scripts — NO CHANGE, verified

`www/vitest.config.mts` and `www/package.json` are already correct. See
"Toolchain" above for the evidence: 4 files, 29 tests, all passing, `@/` resolving
through `resolve.tsconfigPaths` on Vite 8.1.5. Do not add `resolve.alias`, do not
add `vite-tsconfig-paths`, do not downgrade Vite, do not add a `test` script that
already exists.

**One contingency, not a change.** His config declares no `include`, so Vitest 4's
default exclude (`**/node_modules/**`, `**/.git/**` — notably *not* `.next/`) is
all that guards discovery. `.next/` contributes nothing today (the run finds
exactly 4 files). **If** a build artefact ever matches, pin

```ts
  test: { environment: "jsdom", setupFiles: ["./src/test/setup.ts"], include: ["src/**/*.test.{ts,tsx}"] },
```

rather than reworking the config.

## File locations — colocated, `src/**/*.test.ts`

| Module | Test | Track |
|---|---|---|
| `www/src/lib/motion.ts` | `www/src/lib/motion.test.ts` | B |
| `www/src/lib/contract.ts` | `www/src/lib/contract.test.ts` | B |

Not `__tests__/`, not a top-level `test/` — colocation matches the four existing
test files.

## Fixtures

```ts
// in motion.test.ts
import { initialMotionState, step, classify, type MotionSample, type MotionState } from "@/lib/motion";

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
 * threshold — see §"Numerically validated" finding 1 before changing it.
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

/** Counts activity changes across a fold — the flap metric. */
function flips(samples: readonly MotionSample[]): number {
  let s = initialMotionState();
  let prev = s.activity;
  let n = 0;
  for (const x of samples) {
    s = step(s, x);
    if (s.activity !== prev) {
      n += 1;
      prev = s.activity;
    }
  }
  return n;
}
```

## `motion.ts` case table

**Every "Expected" below was produced by running the algorithm.** They are
measurements of the specified design, not guesses — if an implementation
disagrees, the implementation is wrong.

| # | Case | Input | Expected | Why it exists |
|---|---|---|---|---|
| 1 | Cold start | `initialMotionState()` | `"STILL"`, `lastT === null`, `peaks` empty, `lastTransitionT === null` | The fold has to have a defined zero |
| 2 | Flat rest, 60 s | `rest(1800)` | `"STILL"`, `flips === 0`, `lastTransitionT === null`, `peaks.length === 0` | Issue #5: no flapping in a 60 s stationary bench run |
| 3 | Threshold is live | `walk(6000)` with `{...MOTION_TUNABLES, peakProminence: 4.0}` | `"STILL"`, `peaks.length === 0` | Proves the threshold gates. Uses a tunable override rather than a guessed amplitude, because the raw→smoothed ratio is 0.358 and hand-picking an amplitude is how this test goes flaky |
| 3b | …and the default passes it | `walk(6000)` with defaults | `"MOVING"` | The control for row 3 |
| 4 | Over threshold, too short | `walk(900)` | `"STILL"`, `peaks.length === 2` | The debounce is real. Two peaks is below `minPeaks` |
| 5 | Oscillating across the gate | 10× (`walk(600)` then `rest(18)`), contiguous timestamps | `"STILL"`, `flips === 0` | The flap case. Fails immediately if entry and exit debounce were equal |
| 6 | **Rotation spike only** | `rest(300)`, one sample given `rotationRate {alpha: 900, beta: 900, gamma: 900}` | `"STILL"`, `flips === 0` | Issue #5 verbatim. **Do not assert on final `rotationMagnitude`** — state holds the LATEST value, not a max, so it reads 0 at the end of the fold. Assert the activity, and assert `rotationMagnitude` mid-fold if you want the diagnostic covered |
| 7 | Sustained walking | `walk(6000)` | `"MOVING"`, `peaks.length === 4` | The positive case |
| 8 | Transition latency | `walk(6000)` | `lastTransitionT` ≈ **2467 ms**; assert the band 2000–3500 | Issue #5 wants *measured* transition times. The band, not the point, so a bench retune of the thresholds does not break the suite |
| 9 | STILL recovery | `walk(6000)` then `rest(300, 30, 6000)` | `"STILL"`, `lastTransitionT` ≈ **9467 ms** | "placing it down returns to STILL". Exit ≈ 3.5 s = window drain + 2 s debounce |
| 10 | Exit hysteresis | `walk(6000)` then `walk(1500, {t0: 6000, amp: 0.4})` | stays `"MOVING"` | Sub-threshold motion for less than the exit debounce must not drop the state |
| 11 | Cadence too fast | `walk(6000, {stepHz: 6})` | `"STILL"`, `peaks.length === 0` | The interval-consistency test. A bare peak count would pass this |
| 11b | Cadence just too fast | `walk(8000, {stepHz: 3})` | `"STILL"` — 333 ms spacing, below `stepMinMs` | The precise upper edge of the band |
| 12 | Cadence too slow | `walk(9000, {stepHz: 0.5})` | `"STILL"`, `peaks.length === 2` | The lower edge |
| 12b | Slowest admitted walk | `walk(9000, {stepHz: 1.2})` | `"MOVING"` ≈ 5667 ms — 72 steps/min, the documented design floor | Proves cautious walking is not excluded |
| 13 | `acceleration` null, gravity present | `walk(8000, {axis: "z"}).map(s => ({...s, acceleration: null}))` | `"MOVING"`, `usingGravityFallback === true` | iOS/gyroless devices give null `acceleration`. **`axis: "z"` is required** — with the gait perpendicular to gravity the magnitude swing collapses to 1.69 for amp 6 and this legitimately does not fire |
| 13b | Gravity path, perpendicular gait | same with `axis: "x"`, amp 6 | `"STILL"` | Documents the quadrature limitation rather than pretending it away |
| 14 | Both channels null | `rest(300)` with both set to `null` | `"STILL"`, `sensorUnavailable === true`, **no throw** | Drives the manual-fallback UI |
| 15 | Components individually null | `acceleration: {x: 1, y: null, z: 3}` throughout | falls through to the gravity channel, no throw | The non-standard Chromium null mode |
| 16 | NaN / Infinity | `acceleration: vec(NaN, 0, 0)` throughout | falls through, no throw | Garbage-in hardening, same spirit as `coerce.ts` |
| 17 | **Duplicate timestamps** | `rest(10)` with sample 4 repeated | `rejected === 1`, `Number.isFinite(state.smoothed)`, no throw | `dt = 0` is the classic divide-by-zero |
| 18 | **Timestamp goes backwards** | `walk(6000)` then `walk(2000, {t0: 1000})` | `"STILL"`; `lastTransitionT === 1000`; every numeric field finite and non-negative | The wrap criterion. The reset fires on the first backwards sample |
| 19 | **Large forward gap** | `walk(6000)` then `walk(2000, {t0: 36000})` | `"STILL"`, `lastTransitionT === 36000` | Backgrounded tab. A stale window must never assert MOVING |
| 20 | Degraded rate | `walk(20000, {hz: 4})` | `degraded === true`, `rateHz` ≈ 4 | Below 10 Hz the state is untrustworthy. **It still transitions** — the classifier reports, the page decides not to post. Assert `degraded`, not `"STILL"` |
| 21 | Non-finite `t` | `{...sample, t: NaN}` | `rejected` increments, everything else unchanged, no throw | Total-function guard |
| 22 | Purity | fold the same array twice | deep-equal results; the input array is not mutated | It is a fold or it is not testable |
| 23 | Rate independence | `walk(6000, {hz})` for hz ∈ {10, 15, 20, 30, 60} | `"MOVING"` in all five; `lastTransitionT` within 2400–3100 ms | Delivered rate varies ~1–67 Hz in the wild. Proves the time-constant EMA, which a fixed-N moving average would fail |
| 24 | **Marginal-amplitude revert** | `walk(15000, {amp: 3})` | fires `"MOVING"` ≈2467 ms then **reverts** to `"STILL"` ≈5767 ms | Pins finding 1 as known behaviour rather than a bug found at 2 a.m. If a bench retune is meant to remove it, this test is what proves it did |
| 25 | Stationary noise sweep | `noisy(1800, a)` for a ∈ {0.05, 0.15, 0.3, 0.6} | `flips === 0` for all four | The quantitative form of issue #5's 60 s criterion |
| 26 | Camera panning | 60 s of `amp 4` sweeps at 0.3 Hz and 0.5 Hz while stationary | `flips === 0` | The named dominant false positive [10 §6]. **Do not add an 0.8 Hz case as a passing test** — it flips, inherently; see finding 4 |
| 27 | `cadenceGate` unit | `[0,400,800]` → `true`; `[0,400,2000]` → `false`; `[0,400]` → `false`; `[0,300,600]` → `false` | as stated | Direct test of the interval-consistency rule, independent of the fold |
| 28 | Type identity | a `satisfies` assertion in both directions between `UserActivity` and `MotionActivity` | compiles | Pins the deliberate duplication in §"frozen interface" |

Rows **17, 18, 19** are the ones most likely to be skipped and most likely to
bite. Write them first. Rows **6, 13, 20, 24** each encode a mistake this plan
already made and corrected during validation — do not "simplify" them away.

## `contract.ts` case table

| # | Target | Case | Expected |
|---|---|---|---|
| 1 | `isUserActivity` | `"STILL"`, `"MOVING"` | `true` |
| 2 | | `"still"`, `"WALKING"`, `""`, `null`, `42`, `{}`, `undefined` | `false` — case-sensitive, never normalised |
| 3 | `normActivity` | `"STILL"` | `"STILL"` |
| 4 | | `"MOVING"` | `"MOVING"` |
| 5 | | **`undefined`, `null`, `"still"`, `"WALKING"`, `42`** | **`"MOVING"`** — the inversion against audit 11 and issue #5. This is the row that documents the decision |
| 6 | `normActivitySeq` | `0`, `1`, `41`, `4294967295` | identity |
| 7 | | `-1`, `NaN`, `Infinity`, `null`, `undefined`, `"abc"`, `{}` | `0` |
| 8 | | `"41"` (Upstash may deserialise a stored value as a string) | `41` |
| 9 | | `41.7` | `41` — integer, because a JSON float fails `is<uint32_t>()` |
| 10 | | **`Date.now()`** | **`ACTIVITY_SEQ_MAX`**, and separately assert `Date.now() > ACTIVITY_SEQ_MAX` | 
| 11 | **uint32 bound** | for every output of `normActivitySeq` over the table above | `Number.isInteger(v) && v >= 0 && v <= 4294967295` — exactly ArduinoJson's `is<uint32_t>()` predicate |
| 12 | **Monotonicity invariant** | `[0, 1, 2, 41, 4294967294, 4294967295].map(normActivitySeq)` | strictly increasing — the normaliser must not collapse distinct counter values, which would stall the board's `activitySeq > lastActivitySeq` edge |
| 13 | `sameEvent` **regression** | re-run the existing behaviour, no activity anywhere | byte-identical to today. Non-negotiable — proves activity did not leak onto the command path |
| 14 | `detectorToEvent` **regression** | every existing case | unchanged output | 

Row 10 is the executable form of the single easiest way to kill this feature.
Row 13 is the guard that `activity` really did stay off `EventRequest`.

**No route-level or Redis-level automated tests.** Deliberate, and
evidence-backed: `redis.ts:18` constructs `Redis.fromEnv()` at module scope, and
without credentials each command burns ~4.3 s of internal retry backoff before
failing for reasons unrelated to the code under test. With credentials it needs
live secrets and mutates the shared demo state the ESP32 is polling. Mocking
`@/lib/redis` would leave the assertion testing the mock rather than the
MSET-before-INCR ordering that actually matters. The wire round-trip is covered by
the scripted smoke in §Deploy. [13 §"Relay round-trip"]

---

# Verification

**Never pipe a verification command into `tail` or `head`.** A piped build has
already reported exit 0 in this repo while actually failing — the pipeline's exit
status is the last command's. Redirect to a file and echo `$?`, or set
`-o pipefail`.

## Track A

```bash
cd /Users/haidertoha/Code/axiometa-ant-hack/www
SP=/tmp/verify   # any writable dir
mkdir -p "$SP"
pnpm install            > "$SP/install.log" 2>&1; echo "INSTALL EXIT=$?"
pnpm exec tsc --noEmit  > "$SP/tsc.log"     2>&1; echo "TSC     EXIT=$?"
pnpm run lint           > "$SP/lint.log"    2>&1; echo "LINT    EXIT=$?"
pnpm run build          > "$SP/build.log"   2>&1; echo "BUILD   EXIT=$?"
```

Expected: **all four exit 0.** `build` must additionally list `ƒ /api/activity`
in its route table — that is the proof the new route was picked up.

`pnpm run build` may print Upstash missing-env warnings in a shell without
`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`; the build still has to
finish successfully. All four relay routes are `force-dynamic`, so nothing
prerenders and no Redis *command* runs at build time — only the constructor,
which warns [13 §"Relay round-trip"].

## Track B

```bash
cd /Users/haidertoha/Code/axiometa-ant-hack/www
SP=/tmp/verify; mkdir -p "$SP"
pnpm exec vitest run src/lib/motion.test.ts > "$SP/motion.log" 2>&1; echo "MOTION EXIT=$?"
pnpm run test           > "$SP/test.log"    2>&1; echo "TEST    EXIT=$?"
pnpm exec tsc --noEmit  > "$SP/tsc.log"     2>&1; echo "TSC     EXIT=$?"
pnpm run lint           > "$SP/lint.log"    2>&1; echo "LINT    EXIT=$?"
pnpm run build          > "$SP/build.log"   2>&1; echo "BUILD   EXIT=$?"
```

Expected: **all exit 0.** `pnpm run test` must report **more than 29 tests** —
that number is today's measured baseline, so an unchanged count means the new
files were not discovered.

The first command needs no Track A code and can run before A1 lands.

## Both tracks, before the PR

```bash
cd /Users/haidertoha/Code/axiometa-ant-hack
git status --porcelain > /tmp/verify/status.log 2>&1; echo "STATUS EXIT=$?"
git diff --stat origin/main -- firmware/ > /tmp/verify/fw.log 2>&1
test ! -s /tmp/verify/fw.log && echo "FIRMWARE UNTOUCHED: ok" || echo "FIRMWARE TOUCHED: FAIL"
grep -c "" /tmp/verify/fw.log
```

The firmware diff **must be empty**. It is the one hard constraint on this branch.
Also confirm `www/.env.local` is not staged (`.gitignore` covers `.env*`; check
anyway) and that `www/pnpm-workspace.yaml` was not created.

## Not verified by anything above

`pio test -e native` and `pio run -e board_firmware` are **not** run for this
branch, because it changes no firmware file. Do not report firmware verification
either way.

---

# Deploy

## Facts

| Item | Value |
|---|---|
| Project | `bus-stop-awareness` (`prj_aycLGOeruiDMpatN5x1jCRkQ4nQs`) |
| Org | `haider-projects` (`team_twqOAgAGAoR1QIpdvqHRjE62`) |
| Link file | `www/.vercel/project.json` — **gitignored**, exists, verified today |
| Root Directory | `.` — resolves against what the CLI uploads, and the link lives in `www/`, so `.` correctly means `www/` |
| Production URL | `https://bus-stop-awareness.vercel.app` |
| CLI | 56.3.1, `vercel whoami` → `mohammedhaidertoha`, verified today |

**No git integration is connected.** `vercel project inspect` reports no
connected repository and every existing deployment is CLI-created. **Pushing to
`main` does NOT deploy.** Sebastian's board only sees the new fields after an
explicit CLI deploy — his `BOARD_FIRMWARE.md` "Remaining Board Work" item 2 is
literally waiting on this command.

```bash
# from the repo root — preferred, no directory state to get wrong
vercel --cwd www --prod
```

**Never run `vercel --prod` from the repo root.** There is no `.vercel/` there, so
the CLI would not find the link and would prompt to create or link a *different*
project — silently, if `--yes` were passed.

If git integration is ever connected, Root Directory must change from `.` to `www`
at the same time, which then breaks the CLI path above. The two configurations are
mutually exclusive; pick one deliberately.

## Pre-deploy

1. All Track A and Track B verification commands exit 0.
2. `git status --porcelain` clean or intentionally committed.
3. `vercel env ls production` still lists `UPSTASH_REDIS_REST_URL`,
   `UPSTASH_REDIS_REST_TOKEN`, `NEXT_PUBLIC_MODAL_URL`. The Upstash pair is
   runtime-only; `NEXT_PUBLIC_MODAL_URL` is inlined **at build time** and a deploy
   that lost it ships a capture page that can never reach Modal.
4. **Say out loud that this deploy changes board behaviour.** The instant
   `/api/pull` returns valid `activity` + `activitySeq`, boards in the field stop
   being governed purely by service Serial and start taking cloud edges. A board
   sitting on `s` or `n` is unaffected until someone presses `c` —
   `effectiveActivity()` gives `serviceOverride` priority — which is a safe
   default, but it should not be a surprise.
5. Nobody mid-demo. The smoke below overwrites live activity.

## Smoke — proves `activity` and `activitySeq` appear with the right types

```bash
BASE=https://bus-stop-awareness.vercel.app   # or http://localhost:3000
SP=/tmp/verify; mkdir -p "$SP"

# 0. Baseline — capture the command half so independence can be asserted.
curl -fsS "$BASE/api/pull" -o "$SP/pull0.json"; echo "PULL0 EXIT=$?"

# 1. Set STILL.
curl -fsS -X POST "$BASE/api/activity" \
  -H 'content-type: application/json' \
  -d '{"activity":"STILL"}' -o "$SP/set1.json"; echo "SET1 EXIT=$?"

curl -fsS "$BASE/api/pull" -o "$SP/pull1.json"; echo "PULL1 EXIT=$?"

# 2. Heartbeat — same value again. activitySeq MUST still advance.
curl -fsS -X POST "$BASE/api/activity" \
  -H 'content-type: application/json' \
  -d '{"activity":"STILL"}' -o "$SP/set2.json"; echo "SET2 EXIT=$?"

curl -fsS "$BASE/api/pull" -o "$SP/pull2.json"; echo "PULL2 EXIT=$?"

# 3. Bad input must be rejected, not defaulted.
curl -s -o "$SP/bad.json" -w '%{http_code}\n' -X POST "$BASE/api/activity" \
  -H 'content-type: application/json' -d '{"activity":"WALKING"}'   # expect 400
```

```bash
# 4. The type assertions his parser actually demands.
node -e '
const fs = require("fs");
const SP = "/tmp/verify";
const [p0, p1, p2] = ["pull0","pull1","pull2"].map(n => JSON.parse(fs.readFileSync(SP+"/"+n+".json","utf8")));
let bad = 0;
const ok = (c, m) => { if (c) { console.log("ok   " + m); } else { console.error("FAIL " + m); bad++; } };

ok(typeof p1.activity === "string",              "activity is a JSON string (is<const char*>())");
ok(p1.activity === "STILL",                      "activity round-trips exactly, case-sensitive");
ok(Number.isInteger(p1.activitySeq),             "activitySeq is a JSON integer");
ok(p1.activitySeq >= 0 && p1.activitySeq <= 4294967295, "activitySeq fits is<uint32_t>()");
ok(Number.isInteger(p1.activityTs),              "activityTs is an integer");

ok(Number.isInteger(p1.seq),                     "seq is still an integer (whole response depends on it)");
ok(typeof p1.pattern === "string",               "pattern is still a JSON string");
ok(typeof p1.route === "string",                 "route is still a JSON string, never a number");

ok(p2.activitySeq > p1.activitySeq,              "HEARTBEAT: activitySeq advances on an UNCHANGED value");
ok(p2.activity === p1.activity,                  "HEARTBEAT: the value itself did not change");

ok(p1.seq === p0.seq && p2.seq === p0.seq,       "INDEPENDENCE: command seq never moved");
ok(p1.ts  === p0.ts  && p2.ts  === p0.ts,        "INDEPENDENCE: command ts never moved");
ok(p1.pattern === p0.pattern,                    "INDEPENDENCE: pattern never moved");

ok(JSON.stringify(p2).length < 768,              "response fits MAX_RESPONSE_BYTES");
process.exit(bad ? 1 : 0);
'; echo "ASSERT EXIT=$?"
```

Expected: every line `ok`, `ASSERT EXIT=0`, and step 3 printing `400`.

## Final acceptance — needs the board

Issue #5's last criterion. With `secrets.h` present and the board on the phone
hotspot, watch Serial while running the smoke:

- First poll after boot: `RELAY activity=baseline seq=<n> value=<…>` — expected,
  non-rendering.
- After the next `POST /api/activity`: an activity edge is applied and the bus
  gate opens on `STILL`.
- After ~30 s with no user action: another advance from the heartbeat, with no
  pattern restarting and no proximity churn.
- Leave it sitting on `STILL` for **three minutes** with the page open. It must
  still be `STILL`. That is the Q1 test, and it is the one that will bite on stage.

---

# Open questions for Sebastian

Carried forward from [14 §Open questions] with our decisions attached, plus three
new ones surfaced by this plan.

1. **Heartbeat versus strict transitions — the one that will bite on stage.**
   `RELAY-FOR-FIRMWARE.md` says `activitySeq` "changes only on an activity
   transition". `CLOUD_ACTIVITY_LEASE_MS = 120000` combined with
   `applyCloudActivity()` being reached only on an `activitySeq` increase means a
   steady `STILL` decays to `MOVING` after two minutes, and a board reboot
   baselines the current activity without applying it. His own issue #5 already
   asks for "only activity transitions **and a low-rate heartbeat**". **We ship a
   30 s heartbeat.** Confirm, raise the lease, or add an explicit re-arm path.
2. **Is `activityTs` required at all?** It is in the doc, the plan, the design
   spec, and the field table as `int64_t`, but `net.cpp` never reads it. We emit
   it for the debug screen and forward-compat. Confirm no firmware change is
   pending that starts using it — if it becomes the freshness source, question 1
   changes shape entirely.
3. **Pre-first-write response shape.** We emit `"activity":"MOVING",
   "activitySeq":0` rather than omitting the fields, because it matches his own
   `MOVING` fallback *and* gives a booting board a baseline of 0, so the first
   real write renders instead of being swallowed. Confirm.
4. **Setter route name.** `POST /api/activity`, body `{"activity":"STILL"}`,
   returns `{activity, activitySeq, activityTs}`. He wrote "the exact web setter
   route is not a firmware dependency", so we picked it; confirming keeps the docs
   in lockstep.
5. **`activitySeq` is a counter, not a timestamp.** His example shows `4` beside
   an ms-epoch `activityTs`, which reads as if either would do. ArduinoJson's
   `is<uint32_t>()` gate makes a millisecond epoch fail **silently, taking the
   whole activity block with it**. Ask him to separate the two in the doc.
6. **Who holds transient `BUS` for ~1 s?** `BOARD_FIRMWARE.md` item 4 and his
   handoff doc both flag that the relay is a latest-value register and a 300 ms
   poll can miss a short-lived `BUS`. That is producer-side, so it may be ours —
   but it is `capture/page.tsx` + `/api/event` territory, which his plan marks
   REUSE and which this branch does not touch. **Unowned. Needs an owner before
   the demo.**
7. **Will he update issue #5, or should we?** Five of its clauses now contradict
   his own firmware. Leaving it guarantees somebody eventually implements the
   `STILL` fallback and the `/api/event` activity field. We would rather he edited
   it, since every contradiction is in his direction of travel.
8. **NEW — the `activitySeq` reset asymmetry.** Commands consume with
   `seq != lastQueuedCommandSeq`; activity consumes with
   `activitySeq > lastActivitySeq`. A Redis flush or a `DEL activitySeq` restarts
   the counter at 1, below the board's `lastActivitySeq`, and **activity dies
   silently and permanently** while commands keep working. The only recovery is
   `resetWireBaselines()`, which needs a >10 s poll outage. Should activity use
   `!=` like commands do?
9. **NEW — `normActivity` defaults to `MOVING`.** The relay now fails in the same
   direction as `effectiveActivity()`: missing or unrecognised activity resolves
   to `MOVING`, closing the bus gate. This inverts audit 11 and issue #5. Confirm
   this is the intent for the *relay* and not just for the board.
10. **NEW — heartbeat cadence.** 30 s gives four beats per lease (survives three
    consecutive failed posts) and bounds post-reboot blindness to one beat. Would
    he prefer 60 s to halve the Redis write volume, accepting two beats of margin?

---

# Residual risk

**The 120-second lease has still never been exercised on hardware.** His physical
smoke exercised sequences 21–23 under *service* `STILL`/`MOVING`, not cloud
activity, because the fields did not exist. Nobody has observed the cloud activity
path end-to-end on a board. The first integration run is the real test and open
question 1 is the most likely failure. The three-minute soak in §Deploy is the
cheapest way to find out before the stage does.

**The amplitude thresholds are guesses, and the simulation only bounds them.**
1.2 / 0.6 m/s² are reasoned from waist-mounted literature's order of magnitude,
not measured, and nothing published covers a phone held up in camera-aiming
posture. §"Numerically validated" proves the algorithm behaves sanely across a
wide sweep of *synthetic* waveforms; it says nothing about what a real phone
emits. Two specific traps it did surface: the effective raw threshold is ~2.9×
the configured one because the baseline EMA converges onto a one-sided
magnitude's mean, so **the bench run must log steady-state peaks, not first
steps**; and there is a marginal band (~2.5–3.4 m/s² raw) where the state fires
and then reverts.

**A periodic camera pan near 0.8 Hz is indistinguishable from walking.** Not a
tuning bug — a one-sided magnitude folds it to 1.6 Hz, squarely inside the gait
band, and no cadence-based classifier can separate the two. Aperiodic panning at
0.3–0.5 Hz rejects cleanly in simulation. This is the load-bearing reason the
manual STILL/MOVING control is always visible and is the primary control rather
than a fallback.

**The permission ordering is unproven on a real iPhone.** The 1-second gesture
window is documented for `getDisplayMedia`; applying it to
`DeviceMotionEvent.requestPermission` is inference from the shared transient
activation mechanism. It is a strong inference and the ordering is safe either
way, but it is inference. One HTTPS test on the venue phone settles it in ten
minutes and is the single highest-value bench check in this plan.

**Two permission prompts is a stage risk regardless of ordering.** Grant both
before going on stage and do not reload the page.

**Sebastian's branch is unmerged and may move.** Everything here is pinned to
`03a8498`. If he force-pushes, re-verify the `net.cpp` activity block and
`relay_pure.h` before trusting the field names — a rename would be silent on our
side, because a mistyped field simply skips the block.

**Audits 10–13 are partly obsolete and are not marked as such in the repo.** A
reader who finds file 11 first will build activity onto `/api/event` with a
`STILL` default and add `LEFT`/`RIGHT`/`AHEAD` to the wire — all three now wrong.
Audit 14 is the correction and this file is the plan; 11 and 13 should be read only
for their mechanics.

**The relay round-trip has no automated coverage, by design.** A regression in
MSET-before-INCR ordering — the exact race `AGENTS.md` pins — would not be caught
by CI. Mitigation is the pure `normActivity`/`normActivitySeq` tests, the smoke
script, and discipline about `redis.ts`. The rule is unconditional: **any new
payload field goes inside the existing `mset`, never as a separate `set` after the
`incr`.**

**Nothing here is accessibility or field validation.** The two-phase gate is demo
logic, the buzzers remain audible proxies with no proven tactile separation, and
the cane remains the primary mobility aid. This plan is about making two
workstreams meet at a JSON contract.
