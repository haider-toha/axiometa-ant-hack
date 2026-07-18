# Relay Firmware Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the ESP32-S3 firmware to the Vercel relay over a phone hotspot, accept route-88 bus information only while `STILL`, and keep state-aware local ToF/siren behavior independent from networking.

**Architecture:** Arduino-free pure functions define the relay vocabulary, route-88 guard, sequence consumption, activity gate, and ToF policy. A Core-0 `netTask` owns Wi-Fi/TLS/HTTP/JSON and passes fixed-size updates to the existing Core-1 runtime, which alone owns buzzer arbitration. The camera/Modal/web producer is unchanged; the firmware tolerates the current command-only response and activates cloud mode when the pending independent activity fields appear.

**Tech Stack:** ESP32-S3 · Arduino-ESP32 3.x · FreeRTOS queues · `WiFiClientSecure` · `HTTPClient` · ArduinoJson 7 · PlatformIO Unity native tests

## Global Constraints

- Work only on branch `feat/relay-firmware` in `/Users/sebastian/Programming/axiometa-ant-hack-relay-firmware`.
- Do not upload, reboot, or monitor the physical board without coordinating with the developer using it.
- Phone hotspot must expose 2.4 GHz compatibility; the ESP32 remains outbound-only.
- Camera preview and 2 Hz frame submission to Modal remain unchanged in both phases.
- `MOVING` consumes but suppresses `BUS`, `WAIT`, `NUMBER`, and `UNKNOWN`; `STILL` accepts fresh events; `ERROR` is available in either phase.
- A command consumed while `MOVING` is never replayed after a later `STILL` transition.
- Only route string `"88"` with high confidence may drive the hardcoded `NUMBER_88` output. Any other route or confidence must be rejected without a false route-88 signal.
- ToF sampling stays active in both phases, but proximity output is allowed only in `MOVING`; siren sensing and output remain active in both.
- The single forward ToF zone must not generate an automatic left/right decision. Existing service tones are a conceptual-channel demonstration only.
- The first command/activity snapshot after boot or a long outage establishes a baseline without output.

---

### Task 1: Pure relay and activity policy

**Files:**
- Create: `firmware/braille_wearable/src/relay_pure.h`
- Modify: `firmware/braille_wearable/src/navigation_pure.h`
- Create: `firmware/braille_wearable/test/test_relay/test_relay.cpp`
- Modify: `firmware/braille_wearable/test/test_navigation/test_navigation.cpp`

**Interfaces:**
- Produces: `CloudCommand`, `UserActivity`, `RelayCommand`, `RelaySequenceState`, `copyRelayRoute(char (&)[8], const char*)`, `parseCloudCommand(const char*)`, `parseUserActivity(const char*)`, `consumeRelayCommand(...)`, `acceptsRelayCommand(...)`, `allowsProximityOutput(...)`, and `isExpectedRoute(...)`.
- Produces: `serviceDirectionPattern(ServiceDirection)` for the non-relay P1/P3 channel demonstration.

- [ ] **Step 1: Write failing relay policy tests**

Cover the exact six accepted wire strings, rejection of `LEFT`/`RIGHT`/`AHEAD`, `UNKNOWN` activity on missing/invalid input, the route-88 guard, baseline suppression, duplicate/regressed sequence rejection, gap reporting, moving consumption without output, still acceptance, and no replay after a mode transition.

```cpp
RelaySequenceState state{};
RelayCommand bus{};
bus.seq = 21;
bus.pattern = CloudCommand::BUS;
TEST_ASSERT_EQUAL(RelayDisposition::BASELINE, consumeRelayCommand(state, bus, UserActivity::MOVING).disposition);
RelayCommand number{};
number.seq = 22;
number.pattern = CloudCommand::NUMBER;
copyRelayRoute(number.route, "88");
TEST_ASSERT_EQUAL(RelayDisposition::ACCEPT, consumeRelayCommand(state, number, UserActivity::STILL).disposition);
RelayCommand wrong{};
wrong.seq = 23;
wrong.pattern = CloudCommand::NUMBER;
copyRelayRoute(wrong.route, "87");
TEST_ASSERT_EQUAL(RelayDisposition::ROUTE_MISMATCH, consumeRelayCommand(state, wrong, UserActivity::STILL).disposition);
```

- [ ] **Step 2: Run the new tests and verify failure**

Run: `$HOME/.platformio/penv/bin/pio test -e native -f test_relay -f test_navigation`

Expected: compilation fails because `relay_pure.h` and the new policy interfaces do not exist.

- [ ] **Step 3: Implement the minimal pure policy**

Use fixed enums and buffers; no Arduino types:

```cpp
enum class CloudCommand : uint8_t { NONE, BUS, NUMBER, WAIT, UNKNOWN, ERROR, INVALID };
enum class UserActivity : uint8_t { UNKNOWN, MOVING, STILL };
enum class RelayDisposition : uint8_t { UNCHANGED, BASELINE, ACCEPT, SUPPRESS, ROUTE_MISMATCH, REJECT };

struct RelayCommand {
    uint32_t seq = 0;
    CloudCommand pattern = CloudCommand::INVALID;
    char route[8] = {};
    uint32_t arrivalId = 0;
    int64_t serverTs = 0;
};
```

`consumeRelayCommand` must advance `lastSeq` before returning `SUPPRESS` or `ROUTE_MISMATCH`; this is what prevents replay on a later activity change. `NONE` consumes the edge but produces no output. Keep left/right/ahead only behind `ServiceDirection` in `navigation_pure.h`.

- [ ] **Step 4: Run the focused and full native suites**

Run: `$HOME/.platformio/penv/bin/pio test -e native -f test_relay -f test_navigation`

Expected: focused tests pass.

Run: `$HOME/.platformio/penv/bin/pio test -e native`

Expected: all native tests pass.

- [ ] **Step 5: Commit the pure policy**

```bash
git add firmware/braille_wearable/src/relay_pure.h firmware/braille_wearable/src/navigation_pure.h firmware/braille_wearable/test/test_relay/test_relay.cpp firmware/braille_wearable/test/test_navigation/test_navigation.cpp
git commit -m "feat(firmware): define relay activity gate"
```

---

### Task 2: Hotspot relay transport

**Files:**
- Create: `firmware/braille_wearable/src/network_config.h`
- Rewrite: `firmware/braille_wearable/src/net.h`
- Rewrite: `firmware/braille_wearable/src/net.cpp`
- Modify: `firmware/braille_wearable/src/secrets.example.h`
- Modify: `firmware/braille_wearable/platformio.ini`

**Interfaces:**
- Consumes: Task 1 relay types and parsing functions.
- Produces: `bool relayStart()`, `bool relayPollUpdate(RelayUpdate&)`, and `void relayPublishTelemetry(const RelayTelemetry&)`.

- [ ] **Step 1: Add compile-safe network configuration**

`network_config.h` must use `__has_include("secrets.h")`. A checkout without secrets compiles with empty credentials and logs `configured=0`; it must never try the template SSID.

```cpp
#if __has_include("secrets.h")
#include "secrets.h"
inline constexpr bool RELAY_NETWORK_CONFIGURED = WIFI_SSID[0] != '\0';
#else
#define WIFI_SSID ""
#define WIFI_PASS ""
#define VERCEL_HOST "bus-stop-awareness.vercel.app"
inline constexpr bool RELAY_NETWORK_CONFIGURED = false;
#endif
```

- [ ] **Step 2: Define fixed-size task messages**

```cpp
struct RelayUpdate {
    bool hasActivity = false;
    UserActivity activity = UserActivity::UNKNOWN;
    uint32_t activitySeq = 0;
    bool hasCommand = false;
    RelayCommand command{};
    bool sequenceGap = false;
};

struct RelayTelemetry {
    float bandRms = 0;
    uint16_t peakHz = 0;
    float modIdx = 0;
    bool trendRising = false;
    char playing[20] = "NONE";
    uint16_t tofMm = 0;
};
```

- [ ] **Step 3: Implement the Core-0 network task**

Pin a 12,288-byte task to Core 0. It must own one static `WiFiClientSecure`, one static `HTTPClient`, URL storage, JSON document, command/activity baselines, and capped 1/2/4/8-second reconnect backoff. Use `POST /api/pull`, a fixed telemetry buffer, `setReuse(true)`, a 300 ms healthy cadence, and direct stream deserialization. Reject response bodies whose advertised length exceeds 768 bytes.

The first response records `seq` and `activitySeq` without enqueueing output. A relay outage longer than 10 seconds resets both baselines. On subsequent responses, enqueue activity before the command in the same `RelayUpdate`. Missing activity fields must leave `hasActivity=false` while command parsing continues.

- [ ] **Step 4: Add the source and dependencies to the integrated build**

Add `+<net.cpp>` to `board_firmware`, pin `bblanchon/ArduinoJson@^7.4.3`, and update its comment to describe the two-phase relay target.

- [ ] **Step 5: Verify a no-secrets firmware build**

Run: `$HOME/.platformio/penv/bin/pio run -e board_firmware`

Expected: `SUCCESS`; no local `secrets.h` is required to compile.

- [ ] **Step 6: Commit the transport**

```bash
git add firmware/braille_wearable/src/network_config.h firmware/braille_wearable/src/net.h firmware/braille_wearable/src/net.cpp firmware/braille_wearable/src/secrets.example.h firmware/braille_wearable/platformio.ini
git commit -m "feat(firmware): poll relay over phone hotspot"
```

---

### Task 3: Runtime integration and local safety policy

**Files:**
- Modify: `firmware/braille_wearable/src/main.cpp`
- Modify: `firmware/braille_wearable/test/test_relay/test_relay.cpp`

**Interfaces:**
- Consumes: Task 1 policy and Task 2 queue API.
- Produces: effective activity selection, service override, relay-to-pattern routing, ToF output gating, and telemetry publication.

- [ ] **Step 1: Extend pure tests for activity leases and ToF policy**

Add tests that `MOVING` permits proximity, `STILL` suppresses it, missing/stale cloud activity closes the bus gate, and a serial override remains authoritative until cleared. Model the 120-second cloud activity lease with wrap-safe unsigned subtraction.

- [ ] **Step 2: Replace `WAITING`/`NAVIGATION` with effective activity**

Boot with cloud activity unavailable and fallback activity `MOVING`. `s` sets a manual `STILL` override, `n` sets a manual `MOVING` override, and `c` returns control to relay activity. Expired/missing relay activity closes bus output and falls back to `MOVING` for local ToF safety.

- [ ] **Step 3: Drain relay updates before sensor/output service**

Apply `hasActivity` first. Pass each new command through `consumeRelayCommand`; log `accepted`, `suppressed`, `route_mismatch`, `baseline`, `duplicate`, and `gap` with sequence/activity. Only `ACCEPT` calls the existing cloud output path.

- [ ] **Step 4: Make ToF output movement-only**

Continue calling `tofService` in every phase. When effective activity changes to `STILL`, clear `proximityToneOn`, `proximityClearing`, and any current proximity-owned output without stopping an active siren. In `serviceOutput`, enter the proximity branch only when both `proximityActive` and `allowsProximityOutput(effectiveActivity)` are true.

- [ ] **Step 5: Keep direction tones service-only**

Retain `l/r/a` but route them through `serviceDirectionPattern`; label them `CHANNEL_SIMULATION` in logs/help. They must never be parseable from relay JSON.

- [ ] **Step 6: Publish best-effort telemetry**

Update the cached telemetry from the latest audio/ToF values and currently playing pattern. Networking failure must have no effect on sensor cadence or output arbitration.

- [ ] **Step 7: Run tests and build**

Run: `$HOME/.platformio/penv/bin/pio test -e native`

Expected: all native tests pass.

Run: `$HOME/.platformio/penv/bin/pio run -e board_firmware`

Expected: `SUCCESS`.

- [ ] **Step 8: Commit runtime integration**

```bash
git add firmware/braille_wearable/src/main.cpp firmware/braille_wearable/test/test_relay/test_relay.cpp
git commit -m "feat(firmware): gate relay output by activity"
```

---

### Task 4: Handoff documentation and non-hardware verification

**Files:**
- Modify: `RELAY-FOR-FIRMWARE.md`
- Modify: `firmware/braille_wearable/BOARD_FIRMWARE.md`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `plan/2026-07-18-bus-stop-situational-awareness.md`
- Add: `docs/superpowers/specs/2026-07-18-two-phase-relay-gating-design.md`

**Interfaces:**
- Documents the firmware/web boundary and coordinated hardware gate.

- [ ] **Step 1: Record the command/activity contract**

Document that the currently deployed command fields are usable now, while `activity`, `activitySeq`, and `activityTs` are a pending web extension. State that command and activity edges are independent and that the firmware ignores missing activity rather than default-opening `STILL`.

- [ ] **Step 2: Record demo and service controls**

Document `n`, `s`, `c`, bus scenario keys, channel-simulation keys, movement-only ToF output, global siren output, first-snapshot suppression, route-88 mismatch handling, and no automatic bypass direction.

- [ ] **Step 3: Record the latest-value relay limitation**

State that the producer must hold transient `BUS` long enough for a 300 ms poll or add queue/ack semantics. Firmware logs a sequence gap but cannot recover an overwritten event.

- [ ] **Step 4: Run non-hardware verification**

Run: `git diff --check`

Run: `$HOME/.platformio/penv/bin/pio test -e native`

Run: `$HOME/.platformio/penv/bin/pio run -e board_firmware`

Expected: clean diff check, all native tests pass, firmware build succeeds.

- [ ] **Step 5: Inspect repository isolation**

Run in the feature worktree: `git status --short --branch`

Run in the main checkout: `git -C /Users/sebastian/Programming/axiometa-ant-hack status --short --branch`

Expected: only the feature branch contains these changes; the main checkout remains clean.

- [ ] **Step 6: Commit documentation**

```bash
git add AGENTS.md README.md RELAY-FOR-FIRMWARE.md firmware/braille_wearable/BOARD_FIRMWARE.md plan/2026-07-18-bus-stop-situational-awareness.md docs/superpowers/specs/2026-07-18-two-phase-relay-gating-design.md docs/superpowers/plans/2026-07-18-relay-firmware-integration.md
git commit -m "docs: lock two-phase relay demo"
```

---

## Coordinated Hardware Gate

No command in this plan uploads, reboots, or opens the serial monitor. After the other board workstream releases the device, perform one coordinated bench session using the actual phone hotspot and local ignored `secrets.h`: verify hotspot join, first-snapshot suppression, `MOVING` bus-command suppression, `STILL` route-88 acceptance, wrong-route rejection, ToF silence in `STILL`, siren output in both phases, reconnect re-baselining, and a 15-minute soak.
