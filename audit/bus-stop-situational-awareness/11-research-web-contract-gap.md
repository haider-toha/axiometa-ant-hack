# Web Relay Contract Gap — UserActivity and the Navigation Patterns

Date: 2026-07-18

## Scope

This is a research pass, not an implementation. It maps every change needed to
carry `UserActivity = "STILL" | "MOVING"` and the three navigation patterns
(`LEFT`, `RIGHT`, `AHEAD`) end-to-end through the `www/` relay, from the phone's
`POST /api/event` to the ESP32's `POST /api/pull` and the debug screen's
`GET /api/state`.

Every line number below was read from the working tree, and every behavioural
claim about `@upstash/redis` was checked against the installed 1.38.0 typings
and dist bundle rather than recalled. Two claims that are easy to get wrong —
whether the `mget` triple is compiler-protected, and what an `undefined` value
does inside `mset` — were verified by running the compiler and the serializer.

Baseline before any change: `./node_modules/.bin/tsc --noEmit` in `www/` exits 0.

**Out of scope.** `www/src/app/capture/page.tsx` belongs to another track. This
document records only what that file consumes from `contract.ts`, so the change
map does not break it. `detectorToEvent` lives in `contract.ts` but is the
navigation-translation seam; it is deliberately left alone here.

**Decision already made, recorded so it is not relitigated.** `/api/event` stays
a faithful pipe. It stores exactly what the phone posts and must not drop or
rewrite a `LEFT`/`RIGHT`/`AHEAD` that arrives with `activity: "STILL"`. The
board owns that gate — `acceptsCloudCommand()` in
`firmware/braille_wearable/src/navigation_pure.h:43-73` — and it is the single
authoritative one. No server-side activity/pattern consistency guard is
proposed.

## Per-file change table

| File | Lines | Change | Rationale |
|---|---|---|---|
| `www/src/lib/contract.ts` | 6-19 | Add `LEFT`/`RIGHT`/`AHEAD` to `PatternId`; docstring P0–P10 → P0–P13 | Plan Contract B :287-302 |
| `www/src/lib/contract.ts` | 21-22 | Extend `CloudPattern`; insert `UserActivity` after it | Plan Contract B :305-309 |
| `www/src/lib/contract.ts` | 30-37 | Add the three patterns to `CLOUD_PATTERNS` | Plan Contract B :353-355 |
| `www/src/lib/contract.ts` | 39-41 | **No change.** `isCloudPattern` reads `CLOUD_PATTERNS` at runtime, so it widens for free | Verified: the body is `.includes(v)` over the array, not a literal list |
| `www/src/lib/contract.ts` | after 41 | Insert `isUserActivity` + `normActivity` | Shared by three call sites; defaults missing/invalid to `STILL` |
| `www/src/lib/contract.ts` | 43-50 | `EventRequest`: add `activity?: UserActivity` (optional) | Plan :313 — "omitted by old clients => STILL" |
| `www/src/lib/contract.ts` | 52-61 | `DeviceCommand`: add `activity: UserActivity` (required) | Plan :323 |
| `www/src/lib/contract.ts` | 168-201 | **No change this track.** `detectorToEvent` literals still compile because `activity?` is optional | Navigation-translation seam; capture-page track owns it |
| `www/src/lib/contract.ts` | 203-211 | `sameEvent`: compare `normActivity(a.activity)` vs `normActivity(b.activity)` | See sameEvent verdict |
| `www/src/lib/redis.ts` | 8-15 | Add a separate value import for `normActivity` | `isolatedModules: true` forbids folding a value into the `import type` clause |
| `www/src/lib/redis.ts` | 57-64 | Add `activity: normActivity(e.activity)` **inside** the existing `mset` object | One key, same single command; ordering untouched |
| `www/src/lib/redis.ts` | 70-86 | `readCommand`: add `activity` to bindings, tuple, and key list; resolve with `normActivity` | All three lists must stay index-aligned |
| `www/src/lib/redis.ts` | 109-117 | **No change.** `const { seq, ...device }` rest-spread carries `activity` automatically | `Omit<DeviceCommand,"seq">` widens with the interface |
| `www/src/app/api/event/route.ts` | 5 | Add `normActivity` to the existing import | Value import; the clause already mixes value and inline-type |
| `www/src/app/api/event/route.ts` | 23 | **No change.** The `isCloudPattern` gate accepts the nav patterns once `CLOUD_PATTERNS` is extended | Verified |
| `www/src/app/api/event/route.ts` | 27-34 | Add `const activity = normActivity(b.activity)` and the field | Contract B default |
| `www/src/app/api/event/route.ts` | 39-41 | **Critical.** Carry `activity` into the UNKNOWN rewrite literal | The literal is rebuilt from scratch; omitting it silently reverts MOVING to STILL |
| `www/src/app/api/event/route.ts` | 44 | *Optional/additive.* Echo `activity` in the 200 response | Issue 5 diagnostics; no effect on the device path |
| `www/src/app/api/pull/route.ts` | — | **No change.** Inherits `activity` through `readCommand()` | Both handlers serialise the whole command object |
| `www/src/app/api/state/route.ts` | — | **No change.** Inherits through `readDebugState()` | |
| `www/src/app/api/detector/route.ts` | — | **No change.** `DetectorState` carries no activity | Activity is a phone-interaction field on the command, not a detector output |
| `www/src/lib/coerce.ts` | — | **No change.** `normActivity` belongs in `contract.ts` | Keeps the dependency arrow one-way: `coerce.ts` → `contract.ts`. `sameEvent` needs the helper, so siting it in `coerce.ts` would make the pair circular |
| `www/src/lib/cors.ts` | — | **No change.** | |
| `www/src/app/page.tsx` | 80-87 | Render `cmd?.activity` on the headline row | Does not break; silently omits. See consumer sweep |
| `www/src/app/capture/page.tsx` | — | **Not this track.** Compiles unchanged | `IDLE_EVENT` (:31-37) omits `activity`, which is legal because the field is optional |

## Copy-pasteable replacement blocks

### `www/src/lib/contract.ts`

**Lines 6-19** — `PatternId`. Note the docstring also drops the word "haptic":
Revision 2026-07-18c forbids describing buzzer output as haptic.

```ts
/** Every output pattern the device knows (P0–P13). */
export type PatternId =
  | "NONE" // no active command
  | "READY" // P0  boot complete
  | "DANGER" // P1  confirmed siren, amplitude rising   (device-local; never sent)
  | "SIREN" // P2  confirmed siren, flat or falling    (device-local; never sent)
  | "ATTENTION" // P3  Tier-2a band-energy alert          (device-local; never sent)
  | "PROXIMITY" // P4  ToF advisory                       (device-local; never sent)
  | "BUS" // P5  bus arriving
  | "NUMBER" // P6  route number — uses `route`
  | "WAIT" // P7  request in flight
  | "UNKNOWN" // P8  could not read / low confidence
  | "ACK" // P9  button feedback                     (device-local; never sent)
  | "ERROR" // P10 degraded
  | "LEFT" // P11 navigate toward frame left
  | "RIGHT" // P12 navigate toward frame right
  | "AHEAD"; // P13 target is centred
```

**Lines 21-22** — `CloudPattern` plus the new `UserActivity`. "The five local
patterns" stays accurate: DANGER, SIREN, ATTENTION, PROXIMITY, ACK are still the
five that never cross the wire.

```ts
/** Cloud-originated commands only. The five local patterns never cross the wire. */
export type CloudPattern =
  | "NONE"
  | "BUS"
  | "NUMBER"
  | "WAIT"
  | "UNKNOWN"
  | "ERROR"
  | "LEFT"
  | "RIGHT"
  | "AHEAD";

/**
 * Which interaction state the phone says the user is in. The board gates cloud
 * commands on it: STILL accepts the bus-stop set, MOVING accepts navigation.
 *
 * The gate lives on the DEVICE — `acceptsCloudCommand()` in
 * firmware/braille_wearable/src/navigation_pure.h — and it is the only one.
 * This relay is a faithful pipe: it stores what the phone posts and never drops
 * or rewrites a command for disagreeing with the activity.
 */
export type UserActivity = "STILL" | "MOVING";
```

**Lines 30-37** — `CLOUD_PATTERNS`.

```ts
export const CLOUD_PATTERNS: readonly CloudPattern[] = [
  "NONE",
  "BUS",
  "NUMBER",
  "WAIT",
  "UNKNOWN",
  "ERROR",
  "LEFT",
  "RIGHT",
  "AHEAD",
] as const;
```

**Insert after line 41**, below `isCloudPattern`.

```ts
/**
 * STILL unless the input is exactly "MOVING".
 *
 * Missing, null, and unrecognised input all resolve to STILL — the
 * backward-compatible default an old client that never sends the field must
 * land on, and the value a relay that predates this key reads back.
 */
export function isUserActivity(v: unknown): v is UserActivity {
  return v === "STILL" || v === "MOVING";
}

export function normActivity(v: unknown): UserActivity {
  return isUserActivity(v) ? v : "STILL";
}
```

**Lines 43-50** — `EventRequest`. `activity` is **optional** here, and that is
load-bearing: it is what lets `IDLE_EVENT` in `capture/page.tsx:31-37` and the
four `detectorToEvent` literals keep compiling untouched.

```ts
/** What the phone POSTs to /api/event (edge-triggered — send only on change). */
export interface EventRequest {
  pattern: CloudPattern;
  activity?: UserActivity; // omitted by old clients => STILL
  route: string; // "" unless pattern === "NUMBER"
  dest: string; // debug screen ONLY — the device ignores this field
  conf: Conf;
  arrivalId: number;
}
```

**Lines 52-61** — `DeviceCommand`. `activity` is **required** here: by the time
a command has been through Redis it has been normalised, and the device must
never receive the field absent.

```ts
/** What the ESP32 receives from /api/pull. `seq` is its edge-trigger. */
export interface DeviceCommand {
  seq: number; // monotonic; the device's edge-trigger
  pattern: CloudPattern;
  activity: UserActivity;
  route: string;
  dest: string;
  conf: Conf;
  arrivalId: number;
  ts: number; // ms epoch of the server write — staleness check
}
```

**Lines 203-211** — `sameEvent`.

```ts
/**
 * Two commands are "the same event" when every device-visible field matches.
 *
 * `activity` participates because the board gates on it. An activity flip with
 * an unchanged pattern is a real state change, and leaving it out here would
 * let the board hold a stale mode for as long as the pattern happened not to
 * move. It is compared THROUGH `normActivity` so an absent field and an
 * explicit "STILL" are the same event rather than a spurious re-post.
 *
 * `dest` still does not participate — it is debug-screen only and the device
 * ignores it.
 */
export function sameEvent(a: EventRequest, b: EventRequest): boolean {
  return (
    a.pattern === b.pattern &&
    normActivity(a.activity) === normActivity(b.activity) &&
    a.route === b.route &&
    a.conf === b.conf &&
    a.arrivalId === b.arrivalId
  );
}
```

### `www/src/lib/redis.ts`

**Lines 8-15** — imports. The existing clause is `import type`, and
`isolatedModules: true` (`www/tsconfig.json`) means a value cannot be folded
into it. A separate import line is required, not stylistic.

```ts
import { Redis } from "@upstash/redis";
import { normActivity } from "./contract";
import type {
  DebugState,
  DetectorState,
  DeviceCommand,
  EventRequest,
  Telemetry,
} from "./contract";
```

**Lines 56-67** — `writeCommand`. The docstring at 48-55 is unchanged and must
stay. The only edit is one key inside the existing `mset` object.

```ts
export async function writeCommand(e: EventRequest): Promise<number> {
  await redis.mset({
    pattern: e.pattern,
    // `activity` is OPTIONAL on EventRequest, so it must be normalised here.
    // Upstash's default serializer sends a non-string/number/boolean through
    // JSON.stringify, and JSON.stringify(undefined) is undefined — which then
    // serialises into the request body as a literal null MSET argument. Never a
    // valid UserActivity. normActivity closes that off for every caller.
    activity: normActivity(e.activity),
    route: e.route,
    dest: e.dest,
    conf: e.conf,
    arrivalId: e.arrivalId,
    ts: Date.now(),
  }); // payload first — still ONE mset, still strictly before the incr below
  const seq = await redis.incr("seq"); // signal last — value after increment
  return seq;
}
```

**Lines 70-86** — `readCommand`.

```ts
/** Snapshot the current command for the ESP32 poll (`/api/pull`). */
export async function readCommand(): Promise<DeviceCommand> {
  // Three lists that must stay index-aligned: the bindings, the tuple, and the
  // key names. `mget`'s generic is a bare assertion, not a checked contract —
  // a key list SHORTER than the tuple compiles clean and silently shifts every
  // field after the gap. Add to all three or none.
  const [seq, pattern, activity, route, dest, conf, arrivalId, ts] = await redis.mget<
    [
      number,
      DeviceCommand["pattern"],
      DeviceCommand["activity"],
      string,
      string,
      DeviceCommand["conf"],
      number,
      number,
    ]
  >("seq", "pattern", "activity", "route", "dest", "conf", "arrivalId", "ts");
  return {
    seq: seq ?? 0,
    pattern: pattern ?? "NONE",
    // A relay written before this field existed returns null here. normActivity
    // resolves that — and any stored garbage — to STILL.
    activity: normActivity(activity),
    // `String(...)`, because Upstash deserialises a stored "88" back to the
    // number 88 and the device expects a JSON string here. Without this the
    // wire contract says `"route": 88` while the type says `string`.
    route: route == null ? "" : String(route),
    dest: dest ?? "",
    conf: conf ?? "",
    arrivalId: arrivalId ?? 0,
    ts: ts ?? 0,
  };
}
```

### `www/src/app/api/event/route.ts`

**Line 5** — import. Roughly 99 characters on one line; there is no Prettier
config in `www/` and `eslint-config-next` does not enforce a width, so the
single line is fine.

```ts
import { isCloudPattern, normActivity, ROUTE_RE, type Conf, type EventRequest } from "@/lib/contract";
```

**Lines 27-34** — the event literal.

```ts
  const arrivalId = num(b.arrivalId);
  // Missing or unrecognised activity resolves to STILL (Contract B). This route
  // stays a faithful pipe: it never drops or rewrites a command for disagreeing
  // with the activity. The board owns that gate — acceptsCloudCommand() in
  // firmware/braille_wearable/src/navigation_pure.h — and it is the only one.
  const activity = normActivity(b.activity);
  let event: EventRequest = {
    pattern: b.pattern,
    activity,
    route: str(b.route),
    dest: str(b.dest),
    conf: normConf(b.conf),
    arrivalId,
  };
```

**Lines 39-41** — the UNKNOWN rewrite. This is the easiest change in the set to
miss, because the block reads like a mutation but is a full reconstruction.

```ts
  if (event.pattern === "NUMBER" && !ROUTE_RE.test(event.route)) {
    // Rebuilt from scratch, so `activity` must be carried across explicitly.
    // Dropping it here silently reverts a MOVING phone to STILL on exactly the
    // path where the route was already unreadable.
    event = { pattern: "UNKNOWN", activity, route: "", dest: "", conf: "low", arrivalId };
  }
```

**Line 44** — optional. Additive diagnostic; skip it without consequence. Uses
the local `activity` const rather than `event.activity`, which is typed
`UserActivity | undefined` because the interface field is optional.

```ts
  return Response.json({ seq, stored: event.pattern, activity }, { headers: CORS });
```

### `www/src/app/page.tsx`

**Lines 80-87.** Activity is a mode, not a detail, so it reads better beside the
pattern than as a fifth cell in a four-column `<dl>`. Together the two say
whether the board will act on the command at all.

```tsx
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3">
            <span className="font-mono text-xl font-medium">{cmd?.pattern ?? EMPTY}</span>
            {cmd?.pattern === "NUMBER" && (
              <span className="font-mono text-xl font-medium tabular-nums text-primary">
                {cmd.route}
              </span>
            )}
            {/* The board gates the pattern above on this, so the two belong on
                one line: read together they say whether the device will act. */}
            <span className="font-mono text-xs text-muted-foreground">
              {cmd?.activity ?? EMPTY}
            </span>
          </div>
```

Lower-risk alternative if the `<dl>` is preferred: change `sm:grid-cols-4` to
`sm:grid-cols-5` on line 88 and add
`<Field label="Activity" value={cmd?.activity ?? EMPTY} num />`. Adding a fifth
`Field` without widening the grid leaves an orphan on a second row.

## MSET ordering verdict

**The race fix survives, by construction.**

`writeCommand` is two awaited statements: one `mset` at `redis.ts:57-64`, then
one `incr` at `redis.ts:65`. The change adds a single key **inside the existing
`mset` object literal**. It adds no statement, no second round trip, no
`pipeline`, and does not move the `incr`. The MSET-before-INCR ordering named in
`AGENTS.md:54` and documented at `redis.ts:48-55` is textually and semantically
untouched.

The reasoning, in the two directions that matter:

- **Within the payload.** Upstash's own guidance is that batch operations are
  "atomic per command, not across commands"
  (`.claude/skills/upstash/upstash-redis-js/performance/batching-operations.md:16`).
  Per-command atomicity is exactly the guarantee needed here: all eight keys
  land in one MSET, so no reader can observe `activity` from one write and
  `pattern` from another. Growing 7 keys to 8 does not weaken this — it is the
  same single command.
- **Across the two commands.** MSET and INCR are *not* atomic together, and the
  ordering is what compensates. A poll landing in the window reads the **new
  payload with the old `seq`**, and the device ignores it because it
  edge-triggers on `seq`. Reversed, the same poll would read the **new `seq`
  with the old payload** and fire a plausible-wrong pattern — the failure the
  comment at `redis.ts:51-54` describes.

**The one way an implementer can break this.** Writing `activity` as its own
call — `await redis.set("activity", ...)` — placed *after* the `incr`. That
reintroduces exactly the window the ordering exists to close. Placed before the
`incr` it is merely wasteful. The safe rule is unconditional: **any new payload
field goes inside the existing `mset`.**

## mget alignment, verified

The task flagged an off-by-one in the `mget` triple as a silent-corruption risk.
It is real, and the compiler protects only one of the two directions. Both cases
were compiled against the installed `@upstash/redis@1.38.0`:

| Mistake | Compiler result |
|---|---|
| Tuple (7) shorter than the destructured bindings (8) | **Caught.** `error TS2493: Tuple type '[...]' of length '7' has no element at index '7'.` |
| Key list (7) shorter than the tuple (8) | **NOT caught.** Compiles clean, exit 0. |

The second case is the dangerous one. The declaration is
`mget: <TData extends unknown[]>(...args: CommandArgs<typeof MGetCommand>) => Promise<TData>`
(`www/node_modules/@upstash/redis/error-8y4qG0W2.d.mts:4521`) — `TData` is an
unchecked assertion with no relationship to the number of key arguments. At
runtime a 7-element array destructured into 8 bindings shifts every field after
the gap: `activity` would hold the route, `route` the dest, `conf` a number, and
`ts` would be `undefined`. Nothing would throw. The replacement block above
keeps all three lists aligned and carries a comment saying why.

The insertion position — `activity` immediately after `pattern` — is taken from
the Contract C wire example at plan :386-387, so the JSON field order the ESP32
sees matches the documented one.

## sameEvent verdict

**Participating fields: `pattern`, `activity`, `route`, `conf`, `arrivalId`.
Not `dest`. `activity` is compared through `normActivity`, not `===`.**

**Why `activity` must participate.** It is device-visible and the board gates on
it. If it were excluded, an activity flip with an unchanged pattern would return
`true`, the capture page would skip the POST, `seq` would not bump, and the
board would keep its previous mode. Recovery would then depend on some *other*
field happening to change. Concretely: a phone posts `{AHEAD, MOVING}` while the
detector holds the target centred; the user stops walking; the pattern is still
`AHEAD`, so nothing posts, and the board stays in `NAVIGATION` — accepting
navigation commands and rejecting `NUMBER` — for as long as the detector's
verdict holds steady. Issue 5 also states the requirement directly: *"Post only
activity transitions and a low-rate heartbeat."* An excluded field cannot post a
transition.

**Why `normActivity` rather than `===`.** `EventRequest.activity` is optional,
so a raw comparison would treat `undefined` and `"STILL"` as different events.
`IDLE_EVENT` (`capture/page.tsx:31-37`) has no `activity`; the moment the
capture-page track makes `detectorToEvent` emit an explicit `"STILL"`, the first
frame would compare `NONE/undefined` against `NONE/STILL` and fire a spurious
POST. Normalising both sides makes the predicate agree with the server default
and with `readCommand`. One definition of "what STILL means", used at all three
boundaries.

**Why a repeated `LEFT` does not re-post, and why that is correct.** The plan
marks P11-P13 "×1, re-postable" (:488-489). That is a statement about the
**board's** arbitration — LEFT is not rate-limited or deduped on the device the
way P5 BUS is (max 1 per 15 s, plan :542) — not a mandate that the phone must
resend it. `sameEvent` is pure equality, so a sustained LEFT posts once and the
user gets one nudge per direction change.

Forcing the opposite would be actively harmful. The capture loop runs at 2 Hz
(`CAPTURE_MS = 500`, `capture/page.tsx:21`) and the LEFT pattern is 800 ms —
`(200 on / 200 off) ×2`, plan :488. Re-posting every frame would bump `seq`
every 500 ms and restart the pattern before it ever finished, producing a
permanently truncated buzz on a permanently buzzing wrist. That is precisely
what plan :542 forbids: *"A wrist that buzzes constantly gets taken off. These
are not optional polish."*

**Where a re-nudge belongs if one is wanted.** In the capture page, as a
time-based re-arm of `lastEventRef` — never inside `sameEvent`. Making a pure
two-argument predicate time-dependent would make it impure and untestable, and
it is the one function in this contract that a unit test can pin down cheaply.
The issue-5 heartbeat is the same shape and belongs in the same place.

**Why `dest` stays out.** Unchanged reasoning: the device parses and discards it
(plan :410-411), and the debug screen receives it from `/api/detector` every
frame regardless. A `sameEvent(a, {...a, dest: "…"})` comparison still returns
`true` under the new body: both sides have an absent `activity`, which
normalises to `STILL` on both sides, so adding the field changes no existing
behaviour for callers that never set it.

## Consumer sweep

Grepped across `www/src/` for `EventRequest`, `DeviceCommand`, `CloudPattern`,
`CLOUD_PATTERNS`, `isCloudPattern`, `sameEvent`, `detectorToEvent`, `DebugState`.

**Making `DeviceCommand.activity` required produces exactly one compile error.**

| Site | Kind | Result |
|---|---|---|
| `redis.ts:74-85` | Object literal returned by `readCommand` | **FAILS.** Missing property `activity`. Fixed by the `readCommand` block above — the only forced error, inside a file already being edited |
| `redis.ts:115-116` | `const { seq, ...device } = command` in `readDebugState` | Passes. Rest spread, not a literal — `activity` flows through with no code change |
| `contract.ts:97` | `DebugState.device = Omit<DeviceCommand,"seq">` | Passes. Widens with the interface |
| `page.tsx:15, 29` | Reads `DebugState` | Passes. A widened interface never breaks a reader |
| `redis.ts:72` | `mget` generic tuple | Not an error, but must be updated in lockstep — see the alignment section |

**Making `EventRequest.activity` optional produces zero compile errors.** This
is the whole reason Contract B specifies `activity?` rather than a required
field, and it is what keeps the capture-page track unblocked:

| Site | Result |
|---|---|
| `capture/page.tsx:31-37` — `IDLE_EVENT` literal | Passes unchanged |
| `capture/page.tsx:52` — `useRef<EventRequest>` | Passes unchanged |
| `capture/page.tsx:196-197` — `detectorToEvent` / `sameEvent` calls | Pass unchanged; signatures are untouched |
| `contract.ts:170, 181-187, 189, 193, 197` — four `detectorToEvent` literals | Pass unchanged |
| `api/event/route.ts:22, 28` | Edited anyway |
| `redis.ts:56` — `writeCommand(e: EventRequest)` | Passes; `normActivity` absorbs the optionality |

**Extending `CloudPattern` and `CLOUD_PATTERNS` produces zero compile errors.**
Widening a union breaks only exhaustive `switch`/mapped-type consumers, and
`www/src/` has none — the sole consumer is `isCloudPattern`, which does a runtime
`.includes` over the array (`contract.ts:39-41`). `page.tsx:82` compares against
the `"NUMBER"` literal, which stays valid.

**Verification after implementing:** `cd www && ./node_modules/.bin/tsc
--noEmit` (baseline is exit 0, so any output is a regression), then
`pnpm run lint` and `pnpm run build`. Note that `pnpm exec tsc` currently fails
before reaching TypeScript — pnpm's dependency-status check exits non-zero on
`ERR_PNPM_IGNORED_BUILDS` for `sharp` and `unrs-resolver`. Call the binary in
`node_modules/.bin` directly, or run `pnpm approve-builds` first.

## Grounding notes

**Plan — `plan/2026-07-18-bus-stop-situational-awareness.md`.** Contract B is
the authoritative wire spec and was followed literally: `PatternId` additions
:300-302, `CloudPattern` :305-307, `UserActivity` :309, `EventRequest.activity?`
:313, `DeviceCommand.activity` required :323, `CLOUD_PATTERNS` :353-355. Field
**order** for the `mget` insertion comes from the Contract C response example
:386-387. The Contract D debug shape is :422-431. The STILL default is stated
twice — Revision 2026-07-18d §2 at :31 ("missing state defaults to `STILL` for
backward compatibility") and again at :556. The P11-P13 "re-postable" note is
:488-490; the anti-fatigue rule is :542; `dest` being parsed and discarded on the
board is :410-411.

**Issue 5.** Supplies three requirements this map satisfies: keep old clients
compatible (missing or invalid activity → `STILL`); include `activity` in
`POST /api/event`, `POST /api/pull` responses, and `GET /api/state`; preserve
the MSET-before-INCR ordering. Its "post only activity transitions" line is what
settles the `sameEvent` question.

**AGENTS.md.** :54 pins the Redis race fix. :58 requires reading the local
Next.js docs before editing Next code.

**Firmware.** `firmware/braille_wearable/src/navigation_pure.h` already defines
`CloudCommand` (with LEFT/RIGHT/AHEAD), `UserActivity`, `boardModeFor`, and
`acceptsCloudCommand` at :43-73. The gate exists and is authoritative, which is
what makes the faithful-pipe decision safe.

**Upstash, checked in-tree against the installed 1.38.0 rather than recalled.**
`mget: <TData extends unknown[]>(...) => Promise<TData>` at
`www/node_modules/@upstash/redis/error-8y4qG0W2.d.mts:4521` — an unchecked
assertion, which is why the key-list/tuple mismatch is silent.
`mset: <TData>(kv: Record<string, TData>) => Promise<"OK">` at :4525 — `TData`
infers a union that happily includes `undefined`, so the type system does not
catch an unnormalised activity. `defaultSerializer` at
`chunk-2X4SLXT7.mjs:323-333` sends anything that is not a string, number, or
boolean through `JSON.stringify`; `MSetCommand` at :2036-2040 flattens the object
into the command array; the array is `JSON.stringify`d into the request body at
:148. Running that chain on `{activity: undefined}` yields the wire body
`["mset","pattern","LEFT","activity",null,...]` — the `undefined` becomes a JSON
`null` argument. Confirmed by execution, not inspection.

Skill docs consulted: `upstash-redis-js/performance/batching-operations.md`
(per-command atomicity, :16) and `upstash-redis-js/data-structures/strings.md`
(:59-60, the `mset`/`mget` round trip and its automatic deserialisation — the
behaviour the existing `String(route)` comment at `redis.ts:77-79` guards
against).

**Next.js 16.** `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/index.md`
records that `export const dynamic` is removed **only when Cache Components is
enabled**. `www/next.config.ts` does not enable it, so the
`export const dynamic = "force-dynamic"` in all four relay routes remains valid
and needs no change as part of this work. `Response.json` in route handlers is
current per `01-app/01-getting-started/15-route-handlers.md`.

## Residual risk

1. **A heartbeat will re-fire live patterns.** Issue 5 asks for a low-rate
   heartbeat. Implemented naively as a periodic `lastEventRef` re-arm, it bumps
   `seq`, and the board edge-triggers on `seq` — so a heartbeat arriving during
   a live `LEFT` re-fires the buzz, which plan :542 forbids. The heartbeat needs
   to be gated (post only when the resolved pattern is `NONE`) or the board
   needs to dedupe an identical `(pattern, activity, arrivalId)`. Cross-track,
   between the capture page and the firmware; nothing in `contract.ts` can fix
   it.

2. **The firmware does not yet read `activity` off the wire.** `grep` over
   `firmware/braille_wearable/src/net.cpp` and `net.h` finds no `activity`. The
   enum and the gate exist in `navigation_pure.h`, but nothing parses the JSON
   field into them. Until the firmware track lands that, `/api/pull` will carry
   `activity` and the board will ignore it. The web change is independently
   correct but not independently demonstrable — issue 5's "verify an ESP32 pull
   receives the exact activity value sent by the phone" needs both tracks.

3. **The two `UserActivity` enums are not 1:1.** The firmware's has a third
   member, `UNKNOWN`, mapped to `BoardMode::WAITING` by `boardModeFor`. That is
   correct for a board-side parse failure and behaviourally identical to
   `STILL`, but the TypeScript union deliberately has only two members because
   the server normalises before writing. Do not "sync" them mechanically.

4. **Redis holds no `activity` key until the first write after deploy.** The
   existing deployed state has seven keys; `readCommand` will read `null` and
   resolve `STILL`. That is the specified behaviour, but it means "the relay has
   never been told" and "the phone said STILL" are indistinguishable on the
   wire. Acceptable for the hack; worth knowing if a future version wants a
   genuine unknown state.

5. **`readCommand` still does no runtime validation of `pattern`.** `normActivity`
   guards `activity`, but `pattern ?? "NONE"` passes whatever is in Redis
   straight through to the device without an `isCloudPattern` check. Pre-existing
   and untouched by this work, but it is the same class of hole and the fix would
   be one call.

6. **There is no test runner in `www/`, and this change wants one.** A
   concurrent track briefly added `vitest ^4.1.10` plus two throwaway specs
   during this session and then reverted all of it; as of writing `package.json`
   has no `vitest` dependency and no `test` script, and `src/lib/` contains only
   the four source modules. `sameEvent` and `normActivity` are the natural first
   unit tests here — an activity flip with an unchanged pattern, and the
   optional-field boundary where `undefined` must equal `"STILL"` — but nothing
   in `www/` can run them today. Issue 5's unit-test acceptance criteria depend
   on that runner landing. Verification for this change is currently limited to
   `tsc --noEmit`, `lint`, and `build` (baseline: `tsc --noEmit` exits 0).
