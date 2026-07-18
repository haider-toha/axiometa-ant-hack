# Sebastian Integration Analysis — Reframing the Activity Pipeline

Date: 2026-07-18

## Scope

This analyses two bodies of Sebastian Kuhn's work against our planned STILL/MOVING
activity pipeline, and reframes our workstream so that he has to change nothing.

Pinned SHAs, because his branch is unmerged and may move:

| Ref | SHA | State |
|---|---|---|
| Our fork point | `5d85e91` | Merge of PR #11, local siren detection |
| Merged body (PR #12, `feat/serial-output-monitor`) | `5d85e91..cb7b4ee` | MERGED |
| In-flight body (PR #13, `feat/relay-firmware`) | `cb7b4ee..03a8498` | **OPEN**, `mergeable_state: clean` |
| Our branch `feat/activity-state-pipeline` | `c236879` | = PR #14 head; merged to main |
| Actual remote `main` | `e02d094` | PR #14 merged 2026-07-18T21:27:32Z |
| Local `origin/main` ref | `cb7b4ee` | **stale — one merge behind** |

Two corrections to the working assumptions before anything else.

**Our branch is no longer where the brief said it was, and it moved mid-analysis.**
The brief described `feat/activity-state-pipeline` as identical to `origin/main` at
`cb7b4ee`, with our four research audits sitting untracked in the working tree.
During this analysis another process committed those artefacts as `a45bc87` and
`c236879`, pushed, opened PR #14, and merged it to main as `e02d094`. The branch now
sits at `c236879`. Nothing in this document was invalidated by that — the file sets
are still disjoint from PR #13 — but the local `origin/main` ref was never fetched
and still reads `cb7b4ee`, so fetch before branching or the first push will look
like a divergence.

PR #14's contents are research and asset artefacts only —
`audit/bus-stop-situational-awareness/10-13`, `audit/modal-vision-research/`,
`cad/v2_20mm.step`, the TACTA logo, `layout.tsx`, `topbar.tsx`, and an 18-line
`vision/service.py` edit. It contains **no activity implementation**: no
`contract.ts` change, no `motion.ts`, no API route change. So the branch name is
already spent upstream, but the work it was named for was never done.

**PR #13 is clean.** `gh api repos/:owner/:repo/pulls/13` reports
`"mergeable": true, "mergeable_state": "clean"`. Its 17 files and PR #14's 16 files
are fully disjoint. His branch touches nothing under `www/` at all —
`git diff --stat cb7b4ee origin/feat/relay-firmware -- www/` is empty.

Sources read in full: `relay_pure.h`, `net.h`, `net.cpp`, `network_config.h`,
`main.cpp`, `test_relay.cpp`, `RELAY-FOR-FIRMWARE.md`,
`docs/superpowers/specs/2026-07-18-two-phase-relay-gating-design.md`,
`docs/superpowers/plans/2026-07-18-relay-firmware-integration.md`, the
`AGENTS.md` / `README.md` / `plan/` diffs, the current `www/` relay contract, our
own audits 10–13, and GitHub issue #5.

**Issue #5 is his issue, not ours.** "Phone motion state (gyroscope/accelerometer)
to ESP32" was opened by SebastianKuhn and assigned to `haider-toha`, labelled
`enhancement`, zero comments. It carries the note "Coordinate changes in `www/`
with George, who owns the active web app." So the activity pipeline was always
scoped to us — but the issue predates his firmware and five of its clauses are now
contradicted by his own newer work. See "Issue #5 is stale" below.

## Inventory

### Merged body — PR #12, `5d85e91..cb7b4ee`, 21 files, +2933/-2

A laptop-facing serial output monitor. Additive; it touches no relay code.

| File | Change |
|---|---|
| `firmware/.../src/output_telemetry_pure.h` | NEW. `formatOutputTelemetry()` emits `TACTA_OUTPUT {"v":1,"leftHz":%u,"rightHz":%u,"upMs":%lu}\n`; `OUTPUT_TELEMETRY_HEARTBEAT_MS = 1000` |
| `firmware/.../src/haptic.cpp` | `hapticWrite()` now emits that line on channel change, or at most 1 Hz as a heartbeat |
| `firmware/.../test/test_output_telemetry/` | NEW. Native Unity tests for the formatter |
| `www/src/lib/web-serial.ts` (+test) | NEW. Web Serial transport, `SERIAL_BAUD_RATE = 115_200`, port grant, reconnect, error copy |
| `www/src/lib/output-telemetry.ts` (+test) | NEW. Line parser for the `"TACTA_OUTPUT "` prefix, bounded-integer validation, streaming decoder |
| `www/src/app/output/*` | NEW. `/output` route: `page.tsx`, `output-monitor.tsx`, `output-dashboard.tsx`, CSS module, two test files |
| `www/vitest.config.mts` | NEW. jsdom, `@vitejs/plugin-react`, `setupFiles: ["./src/test/setup.ts"]` |
| `www/src/test/setup.ts` | NEW. `@testing-library/jest-dom/vitest`, `afterEach(cleanup)` |
| `www/package.json`, `pnpm-lock.yaml` | Scripts `test`/`test:watch`; 8 new devDependencies (vitest 4, jsdom, RTL, `@types/w3c-web-serial`) |
| `docs/lra-motor-upgrade.md` | NEW. AX22-0018 → AX22-0039 LRA migration note |
| `docs/superpowers/plans|specs/…serial-output-monitor*.md` | NEW. Plan and design for the above |
| `README.md` | Points at the LRA note |

Verified by blob hash at both ends of the range: `contract.ts`, `redis.ts`, and all
four API routes are **byte-identical**. This body does not touch the relay contract.

### In-flight body — PR #13, `cb7b4ee..03a8498`, 17 files, +1635/-354

The firmware relay client and the two-phase activity gate. This is our Track C,
already built.

| File | Change |
|---|---|
| `firmware/.../src/relay_pure.h` | NEW +247. All relay/activity vocabulary, parsers, sequence consumption, gate functions, 120 s lease |
| `firmware/.../src/navigation_pure.h` | −88. Enums and gates moved out; LEFT/RIGHT/AHEAD demoted to `ServiceDirection` |
| `firmware/.../src/net.cpp` | Rewritten +331. Core-0 `netTask`, TLS keep-alive, chunked handling, JSON parse, backoff |
| `firmware/.../src/net.h` | Rewritten. `RelayUpdate`, `RelayTelemetry`, three-function API |
| `firmware/.../src/network_config.h` | NEW. `__has_include("secrets.h")` guard, `RELAY_NETWORK_CONFIGURED` |
| `firmware/.../src/main.cpp` | +281. `BoardMode` replaced by effective activity; `serviceRelay()`; ToF gated to MOVING; telemetry publish |
| `firmware/.../src/secrets.example.h` | Hotspot guidance, `VERCEL_HOST` |
| `firmware/.../platformio.ini` | `+<net.cpp>`, `bblanchon/ArduinoJson@^7.4.3` |
| `firmware/.../test/test_relay/test_relay.cpp` | NEW +247. 14 native tests over the pure policy |
| `firmware/.../test/test_navigation/test_navigation.cpp` | Rewritten to the new gate |
| `RELAY-FOR-FIRMWARE.md` | +65. The handoff spec — the single most important artefact here |
| `docs/superpowers/specs/…two-phase-relay-gating-design.md` | NEW +128. Ownership boundaries and demo walk |
| `docs/superpowers/plans/…relay-firmware-integration.md` | NEW +288. His task-by-task plan |
| `firmware/.../BOARD_FIRMWARE.md` | Serial control table rewritten; "Remaining Board Work" now names our dependency |
| `AGENTS.md`, `README.md`, `plan/…bus-stop…md` | Project guidance rewritten — see below |

### What changed in project guidance under us

`AGENTS.md` retitles the target from "navigation" to "movement-safety" and replaces
the navigation paragraph outright:

> Navigation is first-class scope. The phone owns `STILL` (bus arrival and route
> reading) versus `MOVING` (LEFT/RIGHT/AHEAD guidance)…

becomes a two-phase framing plus a new hard rule:

> Activity freshness is independent from command delivery. An activity heartbeat
> must not increment command `seq` or refresh an old command timestamp. A command
> suppressed while moving must never replay solely because activity later changes
> to still.

The plan's ownership table is now explicit about who does what:

> | `www/src/lib/contract.ts` | **MODIFY by George** | Add independent `UserActivity`, `activitySeq`, and `activityTs` fields while preserving the existing six-value `CloudPattern` |

and his design spec assigns it by name:

> George's web work owns the activity setter and exposing the latest activity to
> `/api/pull`.

**LEFT/RIGHT/AHEAD are cut from the wire.** The plan now reads: "Directionality is
cut. LEFT, RIGHT, AHEAD, STOP, MOVE OVER, and TURN have no relay trigger or demo
step." The stated reason is physical: one forward ToF zone cannot choose a safe
bypass side.

### Issue #5 is stale and should be corrected before we work from it

Five clauses in issue #5 are now contradicted by Sebastian's own later work. Anyone
who implements the issue literally will build the wrong thing.

| Issue #5 says | Current truth | Source |
|---|---|---|
| "missing or invalid activity resolves to `STILL`" | Resolves to `MOVING`, bus gate closed | `effectiveActivity()` in `relay_pure.h` |
| "Include `activity` in `POST /api/event`" | Must **not**. Activity is independently versioned | `AGENTS.md`: heartbeat "must not increment command `seq`" |
| "`MOVING` accepts LEFT, RIGHT, AHEAD, and ERROR" | `MOVING` accepts only `NONE` and `ERROR`; the three directions are off the wire | `acceptsRelayCommand()`; `parseCloudCommand("LEFT") == INVALID` |
| "Activity older than the command staleness limit resolves to `STILL`" | Resolves to `MOVING` after a 120 s lease | `CLOUD_ACTIVITY_LEASE_MS` |
| "A navigation command in STILL … is dropped with a diagnostic" | No navigation commands exist to drop | plan: "Directionality is cut" |

Three clauses survive intact and are still exactly our job: adding `UserActivity`
to `contract.ts`, the gesture-scoped `DeviceMotionEvent.requestPermission()`
control, and the pure tested classifier module with separate entry/exit thresholds.

One clause is unexpectedly load-bearing. Issue #5 already says:

> Post only activity transitions **and a low-rate heartbeat**. Do not stream raw
> IMU samples to Redis.

That heartbeat is not decoration — as the Remaining delta section shows, without it
a steady `STILL` decays to `MOVING` after 120 seconds. His issue anticipated the
need before his firmware made it mandatory.

## Serial versus relay

Our plan's premise was "no serial stub — use the relay". That premise still holds.
The two paths are orthogonal and both are intended to run at once.

His serial monitor design states the topology directly:

> - Phone browser: the deployed `/capture` experience and phone hotspot.
> - ESP32-S3: Wi-Fi client on the phone hotspot **and** USB serial device connected
>   to the MacBook.
> - MacBook Chrome: the deployed `/output` experience, reading the ESP over Web
>   Serial.
>
> The phone and laptop can use the same deployment concurrently because they are
> independent browser clients on different routes.

And its purpose is observability, not transport:

> The laptop display must reflect the tones or future vibration motors that the
> firmware actually drives, rather than guessing from relay commands.

The `TACTA_OUTPUT` protocol is deliberately decoupled from the command vocabulary —
"Version `1` is intentionally small and independent of relay command names." It
carries `leftHz`, `rightHz`, `upMs` and nothing else. It cannot express activity,
patterns, or routes, and it is read-only from the laptop's side.

**Verdict: the relay remains the sole authoritative transport for activity and
commands. Serial is a one-way physical-output display.** Issue #5's transport ban —
"Do not add Web Bluetooth, Web Serial, WebUSB, an ESP32 access point, or an inbound
ESP32 server" — was scoped to the *activity* path and is not violated by an output
monitor. There is one real consequence for us: service Serial `s`/`n` is currently
the *only* way to control activity on hardware, and it takes priority over cloud
activity via `serviceOverride`. A board left on `s` will ignore our relay fields
until someone presses `c`.

## His relay contract

### The endpoint

`net.cpp` builds exactly one URL and polls it from a dedicated task:

```c
snprintf(pullUrl, sizeof(pullUrl), "https://%s/api/pull", VERCEL_HOST);
```

with `VERCEL_HOST` defaulting to `bus-stop-awareness.vercel.app`. Cadence is
`HEALTHY_POLL_MS = 300`, start-to-start, `POST` with a telemetry body, failures on
capped `BACKOFF_MS[] = {1000, 2000, 4000, 8000}`.

### The JSON he parses

From `RELAY-FOR-FIRMWARE.md`:

```jsonc
{
  "seq": 20,            // monotonic. Only act when it advances. THE trigger.
  "pattern": "NUMBER",  // CloudPattern (see below)
  "route": "88",        // always a JSON string, 1–3 digits; "" unless pattern==NUMBER
  "dest": "Clapham Common", // debug-screen only — parse and DISCARD on device
  "conf": "high",       // "high" | "low" | ""
  "arrivalId": 1,       // increments once per bus arrival
  "ts": 1784398000652,  // ms epoch of the server write — command timestamp
  "activity": "STILL", // pending web extension: "MOVING" | "STILL"
  "activitySeq": 4,     // changes only on an activity transition
  "activityTs": 1784397999000 // activity write time; independent of command ts
}
```

### The struct

`relay_pure.h`, verbatim:

```c
struct RelayCommand {
    uint32_t seq = 0;
    CloudCommand pattern = CloudCommand::INVALID;
    char route[8] = {};
    RelayConfidence confidence = RelayConfidence::INVALID;
    uint32_t arrivalId = 0;
    int64_t serverTs = 0;
};
```

Activity does **not** live in `RelayCommand`. It rides separately on `RelayUpdate`
in `net.h`:

```c
struct RelayUpdate {
    bool resetCommandBaseline = false;
    bool hasActivity = false;
    UserActivity activity = UserActivity::UNKNOWN;
    uint32_t activitySeq = 0;
    bool hasCommand = false;
    RelayCommand command{};
};
```

### Does his parser handle `activity`? Yes — with three hard conditions

From `net.cpp`, verbatim:

```c
if (responseDocument["activity"].is<const char*>() &&
    responseDocument["activitySeq"].is<uint32_t>()) {
    const UserActivity activity =
        parseUserActivity(responseDocument["activity"].as<const char*>());
    const uint32_t activitySeq = responseDocument["activitySeq"].as<uint32_t>();
    if (activity != UserActivity::UNKNOWN) {
        if (!activityObserved) {
            activityObserved = true;
            lastActivitySeq = activitySeq;
            Serial.printf("RELAY activity=baseline seq=%lu value=%s\n", ...);
        } else if (activitySeq > lastActivitySeq) {
            update.hasActivity = true;
            update.activity = activity;
            update.activitySeq = activitySeq;
            lastActivitySeq = activitySeq;
        }
    }
}
```

1. **Both fields are required together.** `activity` must be a JSON *string* and
   `activitySeq` must satisfy ArduinoJson `is<uint32_t>()`. If either is absent or
   the wrong type, the entire activity block is skipped and the board keeps the bus
   gate shut.
2. **Values are exact and case-sensitive.** `parseUserActivity` does
   `strcmp(value, "MOVING")` / `strcmp(value, "STILL")` and returns
   `UserActivity::UNKNOWN` for everything else, including `nullptr`. His test asserts
   `parseUserActivity("WAITING")` is `UNKNOWN`.
3. **`activitySeq` must strictly increase.** `activitySeq > lastActivitySeq`.
   Equal or lower is ignored silently.

**Default on missing/invalid: the bus gate closes and effective activity becomes
`MOVING`.** From `relay_pure.h`:

```c
inline UserActivity effectiveActivity(const ActivityControlState& state,
                                      uint32_t nowMs,
                                      uint32_t leaseMs = CLOUD_ACTIVITY_LEASE_MS) {
    if (state.serviceOverride) return state.serviceActivity;
    if (state.cloudActivity != UserActivity::UNKNOWN &&
        static_cast<uint32_t>(nowMs - state.cloudUpdatedMs) <= leaseMs) {
        return state.cloudActivity;
    }
    return UserActivity::MOVING;
}
```

Note the inversion against our old assumption. Our contract draft said
`activity?: UserActivity; // omitted by old clients => STILL`. His fallback is
`MOVING`, and `acceptsRelayCommand(UserActivity::UNKNOWN, CloudCommand::BUS)` is
`false`. **Missing activity now means "show nothing", not "show bus info".**

### `activityTs` is documented but never parsed

`net.cpp` reads `activity` and `activitySeq`. It does not read `activityTs`
anywhere. Freshness is tracked as a **local** `millis()` stamp taken when an
activity edge is applied:

```c
inline void applyCloudActivity(ActivityControlState& state,
                               UserActivity activity, uint32_t nowMs) {
    if (activity == UserActivity::UNKNOWN) return;
    state.cloudActivity = activity;
    state.cloudUpdatedMs = nowMs;
}
```

with `CLOUD_ACTIVITY_LEASE_MS = 120000`. See open question 1 — this has a real
consequence for how often we must bump `activitySeq`.

### Chunked Transfer-Encoding — confirmed, and he fixed it

Commit `2844e31 fix(firmware): parse chunked relay responses`. Our audit found the
live relay sends chunked with no `Content-Length`; he hit the same wall. From
`net.cpp`, verbatim:

```c
// Vercel commonly returns this route with Transfer-Encoding: chunked and no
// Content-Length. HTTPClient::getStream() exposes the raw chunk framing,
// which ArduinoJson quite correctly rejects as non-JSON. getString() goes
// through HTTPClient's bounded de-chunking path before we parse it.
const String responseBody = httpClient.getString();
```

and in the handoff doc:

> A direct `getStream()` regression reproduces as repeated
> `RELAY rejected=json error=InvalidInput` followed by capped polling backoff.

Response size is capped at `MAX_RESPONSE_BYTES = 768`, checked both on
`getSize()` and on the de-chunked string length.

### Polling: separate FreeRTOS task, not `loop()`

```c
xTaskCreatePinnedToCore(networkTask, "netTask", NETWORK_TASK_STACK_BYTES,
                        nullptr, 1, &networkTaskHandle, 0);
```

`NETWORK_TASK_STACK_BYTES = 12288`, pinned to **Core 0**, priority 1. It owns one
static `WiFiClientSecure` and one static `HTTPClient` with `setReuse(true)`.
Parsed updates go through an 8-deep FreeRTOS queue; `loop()` drains it on Core 1
via `serviceRelay(nowMs)`. Networking never touches a buzzer directly.

### Staleness — three independent mechanisms

1. **Command baseline.** `consumeRelayCommand` returns `BASELINE` on the first
   command ever seen and does not render it.
2. **Long outage re-baseline.** `LONG_OUTAGE_MS = 10000`; after a >10 s outage
   `resetWireBaselines()` runs and `resetCommandBaseline` is flagged so an old
   command cannot fire on reconnect.
3. **Activity lease.** 120 s from the last applied activity edge, then `MOVING`.

He deliberately does **not** use the wire `ts` for staleness. The handoff doc lists
it as "Optional staleness guard".

### Verdict on Track C

**Track C is fully superseded. There is no firmware work left for us.**

Everything we planned — a pure parser header, the command struct, the native test
env, the `net.cpp` rewrite, `platformio.ini` wiring — exists on his branch, with 14
native tests and a claimed 97/97 pass plus a physical hotspot smoke. The only
firmware-adjacent items outstanding are explicitly *his*, listed in his own
`BOARD_FIRMWARE.md` "Remaining Board Work": the coordinated board session with
`secrets.h`, the siren-classifier validation, and confirming the producer holds
transient `BUS` long enough for a 300 ms poll. We should touch none of it.

## `navigation_pure.h` delta

88 lines removed. The file now `#include "relay_pure.h"` and keeps only pattern
mapping.

| Symbol | Before (`cb7b4ee`) | After (`03a8498`) |
|---|---|---|
| `CloudCommand` | `navigation_pure.h`, 9 values incl. `LEFT`/`RIGHT`/`AHEAD` | **Moved to `relay_pure.h`**; `LEFT`/`RIGHT`/`AHEAD` dropped, `INVALID` added |
| `UserActivity` | `navigation_pure.h`, `STILL=0, MOVING, UNKNOWN` | **Moved to `relay_pure.h`**, **reordered** to `UNKNOWN=0, MOVING, STILL` |
| `BoardMode` | `WAITING=0, NAVIGATION` | **Deleted.** No replacement enum |
| `boardModeFor(UserActivity)` | present | **Deleted** |
| `acceptsCloudCommand(BoardMode, CloudCommand)` | present | **Deleted** → `acceptsRelayCommand(UserActivity, CloudCommand)` in `relay_pure.h` |
| `navigationPattern(CloudCommand)` | present | **Renamed** → `serviceDirectionPattern(ServiceDirection)` |
| `ServiceDirection` | — | **New** enum `LEFT=0, RIGHT, AHEAD`, service-Serial only |
| `cloudPattern(CloudCommand)` | present | **Survives**, now handles `INVALID` |

Before, in `navigation_pure.h`:

```c
enum class UserActivity : uint8_t { STILL = 0, MOVING, UNKNOWN };
enum class BoardMode : uint8_t { WAITING = 0, NAVIGATION };

constexpr BoardMode boardModeFor(UserActivity activity) { … UNKNOWN → WAITING … }
constexpr bool acceptsCloudCommand(BoardMode mode, CloudCommand command) { … }
```

After, in `relay_pure.h`:

```c
enum class UserActivity : uint8_t { UNKNOWN = 0, MOVING, STILL };

inline bool acceptsRelayCommand(UserActivity activity, CloudCommand command) {
    if (command == CloudCommand::NONE || command == CloudCommand::ERROR) {
        return true;
    }
    if (activity != UserActivity::STILL) {
        return false;
    }
    return command == CloudCommand::BUS || command == CloudCommand::NUMBER ||
           command == CloudCommand::WAIT || command == CloudCommand::UNKNOWN;
}
```

Three semantic changes matter to us:

1. **The numeric values of `UserActivity` changed.** `STILL` moved from 0 to 2 and
   `UNKNOWN` from 2 to 0. Nothing may serialise this enum as an integer.
2. **The unknown default inverted.** `boardModeFor(UNKNOWN)` used to return
   `WAITING`, which *accepted* bus commands. Now `UNKNOWN` accepts only `NONE` and
   `ERROR`. Fail-safe flipped from "show bus info" to "show nothing".
3. **`MOVING` no longer accepts anything but `NONE`/`ERROR`.** The old
   `NAVIGATION` mode accepted `LEFT`/`RIGHT`/`AHEAD`; those are gone from the wire.

Our gating story depended on `acceptsCloudCommand()` and `boardModeFor()`. Both are
deleted. The replacement is `acceptsRelayCommand()` in `relay_pure.h`, and it is
already wired into `main.cpp` and covered by tests. Our audits treated
`navigation_pure.h` as locked; that lock is void — he rewrote it, and his version is
the one with tests behind it.

## Conflict map

CLEAN = untouched by him, ours to change. SUPERSEDED = he built it, delete our task.
CHANGE = still ours but the shape differs from what we planned.

### Track A — web relay contract

| File | Status | Note |
|---|---|---|
| `www/src/lib/contract.ts` | **CLEAN — and assigned to us by name** | Byte-identical across both bodies. Plan says "MODIFY by George" |
| `www/src/lib/redis.ts` | **CLEAN** | Untouched. Add activity keys + a separate writer |
| `www/src/app/api/pull/route.ts` | **CLEAN** | Untouched. No code change needed if `readCommand()` widens |
| `www/src/app/api/event/route.ts` | **CHANGE → do not touch** | Plan demotes it to "REUSE (implemented)". Activity must not ride the command writer |
| `www/src/app/api/state/route.ts` | **CLEAN — no-op** | Returns `readDebugState()`; widens automatically |
| `www/src/app/page.tsx` | **CLEAN** | Small additive render of the new fields |

### Track B — phone DeviceMotion classifier

| File | Status | Note |
|---|---|---|
| `www/src/app/capture/page.tsx` | **CHANGE — scope cut** | Plan: "REUSE for capture/Modal submission… A separate activity setter may be added, but do not gate frame submission or translate target bearing into device commands" |
| `www/src/lib/motion.ts` (new) | **CLEAN** | Nobody has written it. Still ours |
| `www/src/lib/motion.test.ts` (new) | **CLEAN** | Ours. Runs under his config |
| `www/vitest.config.mts` | **SUPERSEDED — and different from what we specced** | He shipped jsdom + `@vitejs/plugin-react` + `resolve.tsconfigPaths`. Audit 13 specced node + manual `resolve.alias` and said "Do not install `jsdom`, `@testing-library/react`, or `@vitejs/plugin-react`". That ship has sailed; adapt |
| `www/package.json` | **SUPERSEDED** | vitest 4.1.10, jsdom, RTL, `@types/w3c-web-serial`, `test`/`test:watch` already present |
| `www/pnpm-workspace.yaml` (new) | **CLEAN — genuinely new, unowned** | Does not exist. See Remaining delta |

### Track C — firmware relay parser

| File | Status |
|---|---|
| `firmware/.../src/net.h` | **SUPERSEDED** |
| `firmware/.../src/net.cpp` | **SUPERSEDED** |
| `firmware/.../src/main.cpp` | **SUPERSEDED** |
| `firmware/.../platformio.ini` | **SUPERSEDED** |
| new pure parser header | **SUPERSEDED** by `relay_pure.h` |
| new native test | **SUPERSEDED** by `test/test_relay/test_relay.cpp` |

## Reframed scope

**Delete outright — Track C, all of it.** Do not write a firmware parser, a pure
header, a native test, or a `platformio.ini` change. Do not touch
`navigation_pure.h`. If we want the gate semantics changed, that is a conversation
with Sebastian, not a commit.

**Delete — the test-harness half of Track B.** `www/vitest.config.mts`,
`www/src/test/setup.ts`, and the vitest/jsdom/RTL devDependencies already exist on
main. Write `motion.test.ts` against his config. Do not add a second runner, and do
not pin Vite below 8 — his config relies on Vite 8's built-in
`resolve.tsconfigPaths` and carries no `vite-tsconfig-paths` dependency, so a
downgrade breaks every `@/…` import in the existing tests.

Two carry-overs from audit 13 still apply. `motion.ts` must stay a pure fold —
`step(state, sample) -> state`, no `window`, no `DeviceMotionEvent`, no timers — so
it is indifferent to jsdom versus node. And his config declares no `include`, so
Vitest 4's default exclude (`**/node_modules/**`, `**/.git/**` — notably not
`.next/`) is all that guards discovery. If a stray build artefact ever matches the
default glob, pin `include: ["src/**/*.test.{ts,tsx}"]` rather than reworking the
config.

**Keep and narrow — Track B, the classifier.** `www/src/lib/motion.ts` plus a
`STILL`/`MOVING` setter surface is still entirely ours. Two constraints from his
spec change its shape:

- Do **not** gate Modal frame submission on activity. Capture runs at 2 Hz in both
  phases: "Keep capture and Modal submission unchanged in both activity phases."
- Do **not** translate target bearing into device commands. LEFT/RIGHT/AHEAD are
  off the wire; his parser returns `CloudCommand::INVALID` for all three and his
  test asserts it.

Ship a manual `STILL`/`MOVING` control first — the demo depends on a deterministic
transition, and his firmware currently relies on service Serial `s`/`n` as the
stand-in. The DeviceMotion classifier should drive the *same* setter, so it can be
switched off on stage without touching the relay.

**Keep and re-shape — Track A.** This is the critical path, and it is now the
blocking dependency for his firmware. His `BOARD_FIRMWARE.md` says so directly:

> 2. Land the web-owned independent `activity`, `activitySeq`, and `activityTs`
>    fields. The currently deployed command response omits them, so use `s`/`n`
>    until that endpoint update is live.

Changes from what we planned:

- `activity` is **not** optional-defaulting-to-`STILL`. Our draft had
  `activity?: UserActivity; // omitted by old clients => STILL`. His fallback is
  `MOVING` and missing activity closes the bus gate. Drop the optional marker and
  drop the STILL default.
- Activity needs **its own version and its own writer**. It is not a field on the
  command write. `activitySeq` is a second, independent edge-trigger.
- **Do not touch `/api/event`.** Adding activity there would couple the two
  sequences, which his spec forbids: "An activity heartbeat must not increment
  command `seq` or refresh a previous command's `ts`."
- Add a new setter route. He explicitly leaves this to us: "The exact web setter
  route is not a firmware dependency. Only the `/api/pull` response shape matters
  to the board." `POST /api/activity` is the obvious choice.

## Remaining delta

`grep -rn "ctivity" www/src/` returns **nothing**. `DeviceCommand` on `cb7b4ee` has
exactly seven fields and there is no `UserActivity` type. The entire activity
extension is unimplemented on the web side.

What `/api/pull` returns today:

```jsonc
{"seq":20,"pattern":"UNKNOWN","route":"","dest":"","conf":"low","arrivalId":1,"ts":1784398000652}
```

What his firmware needs it to return:

```jsonc
{"seq":20,"pattern":"UNKNOWN","route":"","dest":"","conf":"low","arrivalId":1,"ts":1784398000652,
 "activity":"STILL","activitySeq":4,"activityTs":1784397999000}
```

Precisely, the delta is:

| Field | Type on wire | Firmware requirement | Today |
|---|---|---|---|
| `activity` | JSON string | Exactly `"MOVING"` or `"STILL"`, case-sensitive. Anything else → `UNKNOWN` → block skipped | **absent** |
| `activitySeq` | JSON integer | Must satisfy ArduinoJson `is<uint32_t>()`: non-negative integer ≤ 4294967295. Must strictly increase to fire | **absent** |
| `activityTs` | JSON number | Documented; **never parsed** by `net.cpp`. Include for the debug screen and forward-compat | **absent** |

Four constraints that are easy to get wrong:

1. **`activitySeq` must not be a timestamp.** `Date.now()` is ~1.78e12 and fails
   `is<uint32_t>()`, which silently disables the whole activity block. Use a Redis
   `INCR` counter, exactly like `seq`.
2. **Preserve the MSET-before-INCR ordering for activity too.** `writeCommand()`
   carries the comment "MSET the payload FIRST, then INCR the sequence… Do not
   reorder." A new `writeActivity()` must MSET `activity` + `activityTs`, then
   `INCR activitySeq`, for the same reason: the board edge-triggers on the counter.
3. **Never let the activity writer touch `seq`, `ts`, `pattern`, `route`, `dest`,
   `conf`, or `arrivalId`.** That is the independence rule in `AGENTS.md`.
4. **Keep `seq` and `pattern` well-formed.** `net.cpp` rejects the *entire*
   response — activity included — if `!responseDocument["seq"].is<uint32_t>() ||
   !responseDocument["pattern"].is<const char*>()`. And the whole body must stay
   under 768 bytes; the shape above is ~175 bytes, so there is headroom, but nothing
   large should be added to this route.

There is one behaviour the current design forces on us that is not obvious from the
docs, and it is the single highest-risk item in this analysis:

**A steady `STILL` decays to `MOVING` after 120 seconds, and a board reboot
discards the current activity.** `applyCloudActivity()` refreshes the lease only
when `update.hasActivity` is set, which requires `activitySeq > lastActivitySeq`.
And the first activity a freshly-booted board sees is recorded as a **non-rendering
baseline** — `if (!activityObserved) { activityObserved = true; lastActivitySeq =
activitySeq; }`. So if we bump `activitySeq` only on genuine transitions, as
`RELAY-FOR-FIRMWARE.md` says ("changes only on an activity transition"), then:

- standing still for over two minutes silently reopens ToF output and closes the bus
  gate; and
- rebooting the board mid-demo leaves the bus gate shut until the user physically
  transitions again.

The safe resolution is a **heartbeat that bumps `activitySeq` on an interval
shorter than the lease** — 30 s is a reasonable default — in addition to bumping it
on every transition. Re-sending the same value is provably harmless: `serviceRelay`
calls `applyCloudActivity` (refreshing the lease) and then
`refreshEffectiveActivity`, which early-returns when `currentActivity ==
nextActivity`, so no pattern is stopped and no proximity state churns. It costs one
log line per beat. This contradicts the letter of his handoff doc, which is why it
is open question 1 rather than a decision. Note that issue #5 already asks for
"a low-rate heartbeat", so the intent is probably already there.

### Work nobody has done

Our prior was that the DeviceMotion classifier and the `activity` relay field are
still ours. **Both confirmed.** `grep -rn "ctivity" www/src/` returns nothing and
`www/src/lib/motion.ts` does not exist. Neither body of Sebastian's work touches
either. Three further items are genuinely unowned:

1. **`www/pnpm-workspace.yaml` does not exist.** Audit 13 measured `pnpm exec tsc
   --noEmit`, `pnpm run lint`, and `pnpm run build` all exiting 1 in `www/` under
   pnpm 11.9.0 — `ERR_PNPM_IGNORED_BUILDS` on `sharp@0.34.5` and
   `unrs-resolver@1.12.2`, because pnpm 11.9.0 removed `ignoredBuiltDependencies`
   and now defaults `strictDepBuilds` to true. The fix is a four-line
   `allowBuilds` block. These are the exact commands `AGENTS.md` mandates for web
   verification, so on an affected machine we cannot honestly claim verification
   without this. Sebastian's PR #13 reports lint/build/tests passing, so his
   toolchain is unaffected — treat this as environment-specific, confirm locally
   before changing anything, and if it reproduces, fix it in our PR.
2. **Somebody has to deploy.** Audit 13 found `vercel project inspect` reports no
   connected Git repository: "Pushing to `main` will **not** deploy." The contract
   change only reaches his board via an explicit `vercel --cwd www --prod`. That
   command must never be run from the repo root, and never while the ESP32 is
   polling mid-demo.
3. **A relay smoke for the activity path.** The existing `curl` smoke in audit 13
   was written against a shape where activity rode on `/api/event`. It needs
   rewriting for a separate setter, and its assertions inverted — the old assertion
   "an old-client POST omitting `activity` pulls back `"activity":"STILL"`" is now
   wrong in both directions.

One inherited inconsistency to settle while we are in there: audit 11 sites
`normActivity` in `contract.ts` (to keep the `coerce.ts → contract.ts` dependency
arrow one-way and avoid making `sameEvent` circular), while audit 13 assumes a
`coerceActivity` in `coerce.ts`. Audit 11's reasoning is the sounder of the two.

## Branching recommendation

**Branch fresh off remote `main` (`e02d094`) and target only `www/`.** Do not
branch off `origin/feat/relay-firmware`, and do not wait for his merge.

Reasoning:

- **Merge risk is already zero.** His PR #13 touches 17 files, none under `www/`.
  Our reframed work touches only `www/`. The two sets cannot conflict at the text
  level, so branching off his tip buys nothing and couples our history to a branch
  that may be rebased or force-pushed.
- **Branching off his tip would import his unmerged firmware.** If he amends after
  review, we inherit a rebase we did not need. His PR is `mergeable: clean` today
  and may land at any moment.
- **Waiting blocks him.** His own "Remaining Board Work" item 2 is our contract
  change, and his PR body lists it under "Known dependency". He is currently driving
  the demo from service Serial `s`/`n` because the fields do not exist. Every hour we
  wait is an hour he cannot run the end-to-end activity path.
- **Our local refs are stale by one commit.** `origin/main` here is `cb7b4ee`; the
  remote is `e02d094`. Fetch before branching or the first push will look like a
  divergence. Also note `feat/activity-state-pipeline` is already spent — PR #14 was
  merged from it — so use a new branch name such as `feat/relay-activity-contract`.
- **Integration order does not matter.** Because the file sets are disjoint,
  whichever of PR #13 and our PR lands first, the second still merges clean. The
  only true coupling is semantic: his firmware starts honouring cloud activity the
  moment our deploy goes live.

One coordination point that is not a merge risk but is a *deploy* risk: the instant
`/api/pull` starts returning valid `activity` + `activitySeq`, boards in the field
stop being governed purely by service Serial and begin taking cloud edges. His
`effectiveActivity()` gives `serviceOverride` priority over cloud activity, so a
board sitting on `s` or `n` is unaffected until someone presses `c`. That is a safe
default, but it should be said out loud before the deploy.

## Open questions for Sebastian

1. **Should the web side bump `activitySeq` as a periodic heartbeat, or strictly
   only on transitions?** `RELAY-FOR-FIRMWARE.md` says "changes only on an activity
   transition", but `CLOUD_ACTIVITY_LEASE_MS = 120000` combined with
   `applyCloudActivity` being reached only on an `activitySeq` increase means a
   steady `STILL` decays to `MOVING` after two minutes, and a board reboot baselines
   the current activity without applying it. His own issue #5 already asks us to
   "post only activity transitions and a low-rate heartbeat", so we read a ~30 s
   `activitySeq` bump as both intended and harmless. Confirm, or raise the lease, or
   add an explicit re-arm path. **This is the one that will bite on stage.**
2. **Is `activityTs` required at all?** It is in the doc, the plan, the spec, and
   the field table as `int64_t`, but `net.cpp` never reads it. We will emit it for
   the debug screen and forward-compat, but confirm no firmware change is pending
   that starts using it — if it becomes the freshness source, the heartbeat design in
   question 1 changes shape.
3. **What should `/api/pull` return before any activity has ever been set?** Options
   are to omit the fields entirely, or to emit `"activity":"MOVING","activitySeq":0`
   so the board establishes a baseline early and the first real transition fires
   cleanly. We lean toward the latter because it matches his own `MOVING` fallback.
   Either is safe; we want his preference recorded.
4. **Does he want the setter at `POST /api/activity`?** He wrote "The exact web
   setter route is not a firmware dependency", so we will pick it, but confirming
   the name keeps the docs in lockstep.
5. **`RELAY-FOR-FIRMWARE.md` still shows `activitySeq` as `4` in an example
   alongside `activityTs` as an ms epoch.** Confirm `activitySeq` is intended to be
   a small monotonic counter, not a timestamp — ArduinoJson's `is<uint32_t>()` gate
   makes a millisecond epoch fail silently, taking the whole activity block with it.
6. **Who holds transient `BUS` long enough for a 300 ms poll?** His
   `BOARD_FIRMWARE.md` item 4 and his handoff doc both flag that the relay is a
   latest-value register and the producer must hold `BUS` for ~1 s or add queue/ack
   semantics. That is producer-side, so it may be ours — but it is `capture/page.tsx`
   and `/api/event` territory, which the plan marks REUSE. We need an owner.
7. **Will he update issue #5, or should we?** He authored it and assigned it to us,
   but five of its clauses now contradict his own firmware (see "Issue #5 is stale").
   Leaving it as-is guarantees somebody eventually implements the `STILL` fallback
   and the `/api/event` activity field. We would rather he edited it, since the
   contradictions are all in his direction of travel.

## Residual risk

**Our audits are partly obsolete and should be read with that caveat.** Files 10–13
were written against a contract where `activity` defaulted to `STILL`, where
`navigation_pure.h` was locked, and where LEFT/RIGHT/AHEAD were live wire values.
All three premises are now false. They were merged to main by PR #14 as research
artefacts; nothing has been done to mark them superseded. This file is the
correction, but a reader who finds file 11 or 12 first will be misled.

**His branch is unmerged and may move.** Everything here is pinned to `03a8498`. If
he force-pushes, re-verify `relay_pure.h` and the `net.cpp` activity block before
building against the field names.

**The 120-second lease is untested against a real demo.** His physical smoke
(`RELAY-FOR-FIRMWARE.md`, 2026-07-18) exercised sequences 21–23 under *service*
`STILL`/`MOVING`, not under cloud activity — because the fields do not exist yet. No
one has yet observed the cloud activity path end-to-end on hardware. The first
integration run is the real test, and open question 1 is the most likely failure.

**Flash headroom is nearly gone, and it is not our lever.** Audit 12 measured
`board_firmware` at 86.7% flash (1136636/1310720) before the relay landed; his PR
#13 reports 87.2% after. Roughly 165 kB remains. Nothing we do in `www/` affects
this, but it means any future firmware ask — a second ToF zone, an IMU driver, a
larger JSON document — needs a size budget stated up front rather than discovered
at link time.

**Nothing here is accessibility or field validation.** The two-phase gate is demo
logic. The buzzers remain audible proxies with no proven tactile separation, the
single forward ToF zone cannot choose a bypass side, and the cane remains the
primary mobility aid. This analysis is about making two workstreams meet at a JSON
contract, not about whether the device helps anyone navigate.
