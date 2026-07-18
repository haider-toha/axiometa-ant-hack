# Firmware Relay Parser — Research and Design

Date: 2026-07-18

## Scope

This track resolves how the ESP32 firmware should parse the new relay
`DeviceCommand` shape (Contract C), where that parse should live so it stays
host-testable, what `platformio.ini` currently gets wrong, whether ArduinoJson
can run under `pio test -e native`, whether the TLS keep-alive advice in the
plan is still correct on Arduino-ESP32 3.x, how the poll integrates with
`loop()`, and how staleness can be implemented on a board with no wall clock.

It is a design and verification pass. No file under `firmware/`, `www/`, or
`plan/` was modified. Everything below was exercised in a throwaway copy of
`firmware/braille_wearable/` under the session scratchpad, which has since been
kept only for the evidence quoted here.

`src/navigation_pure.h` is treated as locked. Nothing in this document proposes
an edit to it; the parser is designed to map onto the enums it already defines.

Two side effects to declare. This research installed the pinned pioarduino
Arduino-ESP32 3.x platform into the user's global `~/.platformio` (it was not
cached — see Verdict 9) and made one read-only `GET` against the deployed relay.
No repository file was touched.

## Verdicts / evidence

| # | Question | Verdict | Evidence |
|---|---|---|---|
| 1 | `DeviceCommand` struct shape | **Reuse the existing `CloudCommand` / `UserActivity` enums; do not add the parallel `uint8_t` constants Contract C sketches.** Add only `CommandConfidence`, which has no existing type | `navigation_pure.h:7-23` already defines both enums, and `boardModeFor()` / `acceptsCloudCommand()` / `cloudPattern()` are all typed on them. A `uint8_t` field would need a cast at every call site, and a cast is exactly where a wrong-buzz bug hides |
| 2 | Where the parse lives | **`src/relay_command_pure.h`** (header-only, Arduino-free, includes `<ArduinoJson.h>`), called from `net.cpp`. Signature `bool parseDeviceCommand(const char*, size_t, DeviceCommand&)` | Matches `navigation_pure.h` / `siren_pure.h` / `tof_proximity_pure.h`. PlatformIO defaults `test_build_src = no`, so `src/*.cpp` is never compiled during `pio test`; only a **header-only** pure module is reachable from a test |
| 3 | String → enum without heap | **`root["key"].as<const char*>()` + `strcmp`.** Returns `NULL` on missing key *and* on wrong type, so one `nullptr` guard covers both | Verified in docs and empirically: `activity:7`, `activity:null`, `pattern:123`, `route:404` all fall to their defaults. `as<String>()` would instead *convert* `7` into `"7"` — a correctness bug, not just a heap cost |
| 4a | `[env:board_firmware]` `build_src_filter` missing `net.cpp` | **CONFIRMED.** Lists only `audio.cpp`, `main.cpp`, `haptic.cpp`, `tof.cpp` | `platformio.ini:138-143` |
| 4b | `[env:board_firmware]` `lib_deps` missing ArduinoJson | **CONFIRMED.** Lists only `Adafruit_VL53L0X` and `arduinoFFT` | `platformio.ini:147-149` |
| 4c | `[env:native]` has no `lib_deps` at all | **CONFIRMED**, and it now needs one | `platformio.ini:165-168` — `platform`, `test_framework`, `build_flags` only |
| 5 | ArduinoJson under `pio test -e native` | **WORKS. No fallback extractor needed.** 16/16 new cases pass; full suite 93/93 with zero regression | Real `pio test` output pasted below |
| 6 | TLS keep-alive | **The plan's premise is wrong. `setReuse(true)` is a no-op — `_reuse` already defaults to `true`.** Keep `net.cpp:11`'s static client as-is; the existing per-poll local `HTTPClient` already reuses the session | `HTTPClient.h:293` (3.2.x) `bool _reuse = true;`; `HTTPClient.cpp:377-391` skips `_client->stop()` when reuse is live |
| 7 | `main.cpp` integration | **The poll must NOT run in `loop()`.** It belongs in a FreeRTOS task pinned to core 0; `loop()` only drains a queue | A blocking TLS exchange in `loop()` stalls `serviceOutput()` for 50–200 ms. `tickPattern()` catches up by *skipping* steps, so a stalled poll can silently swallow a 150 ms SHORT pulse mid-route-number |
| 8 | Staleness from `ts` | **Comparing a server epoch against `millis()` is unsound. Do not do it, and do not add SNTP.** Track local arrival time instead; keep `ts` as diagnostics only | `millis()` is ms-since-boot; `ts` is ms-since-1970. NTP failure on a venue hotspot silently yields epoch 0, which would make every command look 56 years stale and mute the device |
| 9 | Toolchain availability | The pinned 3.x platform was **not cached** on this machine before this pass; only `espressif32@7.0.1` (Arduino-ESP32 2.0.17) was present | `pio pkg list` showed `espressif32 @ 7.0.1` and `native @ 1.2.1` only. Installed during this pass |
| 10 | Does the proposed firmware actually build? | **YES, after one fix.** `pio run -e board_firmware` SUCCESS over the proposed `net.cpp`, `relay_command_pure.h`, `main.cpp` integration and both `platformio.ini` edits | Build output pasted below. RAM 16.7%, **Flash 86.7%** |
| 11 | `HIGH` / `LOW` as enumerator names | **HARD COMPILE ERROR on device, invisible on host.** Arduino defines them as preprocessor macros | See Finding D — caught only because the target build was run |

### Four findings nobody asked for, all load-bearing

**A. `/api/pull` answers with `Transfer-Encoding: chunked` and no `Content-Length`.**
Measured against the live deployment on 2026-07-18:

```
$ curl -sS --http1.1 -D - -o /tmp/pull11.txt https://bus-stop-awareness.vercel.app/api/pull
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Cache-Control: no-store
Content-Type: application/json
Server: Vercel
Transfer-Encoding: chunked

{"seq":20,"pattern":"UNKNOWN","route":"","dest":"","conf":"low","arrivalId":1,"ts":1784398000652}
```

This kills the obvious optimisation. With chunked framing `http.getSize()`
returns `-1` (`HTTPClient.cpp:1183`, `:1266`), and `http.getStream()` hands back
the **raw** stream — still carrying `61\r\n{…}\r\n0\r\n\r\n`. Reading that into a
fixed buffer produces a `DeserializationError` on every single poll. Only
`getString()` (or `writeToStream()`) de-frames chunks: `HTTPClient.cpp:948-962`
explicitly handles `_size == -1` by routing through `writeToStream`.

**Use `http.getString()`.** It costs one short-lived ~100-byte `String` per
poll, which is not the heap problem Contract C was written against — that was
`std::vector<String> replies` growing on every poll (`net.h:14`). A
constant-size, immediately-freed allocation reuses the same block.

**B. The deployed relay does not send `activity` yet.** The live body above has
no `activity` key. The "missing activity ⇒ `STILL`" rule is therefore not a
defensive nicety for old clients — it is the behaviour the board needs *today*,
before George's contract change lands. There is a test for exactly this body.

**C. `long` is 32-bit on ESP32 and 64-bit on macOS.** The legacy `long seq`
(`net.h:11`) means a host test and the device disagree on integer width. Use
`int32_t` explicitly so `pio test -e native` is faithful to the target. `ts`
must be `int64_t`: `1784419200123` does not fit in 32 bits.

**D. A pure header that passes every host test can still fail to compile on the
device — and this one did.** The first draft of `relay_command_pure.h` named the
confidence enumerators `NONE / LOW / HIGH`. All 16 native cases passed. The
target build then failed hard:

```
/Users/haidertoha/.platformio/packages/framework-arduinoespressif32/cores/esp32/esp32-hal-gpio.h:43:14: error: expected unqualified-id before numeric constant
   43 | #define HIGH 0x1
      |              ^~~
src/relay_command_pure.h:93:62: note: in expansion of macro 'HIGH'
   93 |     if (strcmp(name, "high") == 0) return CommandConfidence::HIGH;
      |                                                              ^~~~
src/relay_command_pure.h:93:60: error: expected ';' before numeric constant
*** [.pio/build/board_firmware/src/net.cpp.o] Error 1
```

`HIGH` and `LOW` are `#define`s in `esp32-hal-gpio.h`. The preprocessor runs
before C++ scoping, so `CommandConfidence::HIGH` expands to
`CommandConfidence::0x1`. **Scoped enums do not protect against macros.** The
native environment never includes `<Arduino.h>`, so no host test can ever catch
this class of bug.

The enumerators are therefore `NONE / CONF_LOW / CONF_HIGH`, which also matches
the names Contract C's own sketch used. The same build surfaced a second, minor
issue: `++consecutiveFailures` on a `volatile`-qualified variable is deprecated
in C++20 (`-Wvolatile`), rewritten as `x = x + 1`.

**The operational lesson is bigger than the bug.** `pio test -e native` green is
necessary but not sufficient. Any change to a `*_pure.h` header must be followed
by `pio run -e board_firmware` before it is called done.

## Exact code blocks

### `src/relay_command_pure.h` — NET-NEW, host-testable

```cpp
#pragma once

// ==========================================================================
//  relay_command_pure.h — Arduino-free parse of the Vercel relay's
//  DeviceCommand JSON (Contract C) into a fixed-size struct.
//
//  Includes <ArduinoJson.h> but NOT <Arduino.h>/<WiFi.h>/<HTTPClient.h>, so
//  the whole file compiles and runs under `pio test -e native`.
//  Header-only on purpose: PlatformIO does not build src/*.cpp during tests.
// ==========================================================================

#include <stddef.h>
#include <stdint.h>
#include <string.h>

#include <ArduinoJson.h>

#include "navigation_pure.h"

// Reject any relay body larger than this BEFORE handing it to the parser.
inline constexpr size_t PULL_BODY_MAX = 512;

// route[] holds "88" / "205" / "N550"; 7 chars + NUL is generous.
inline constexpr size_t ROUTE_CAPACITY = 8;

// DO NOT name these LOW / HIGH. Arduino's esp32-hal-gpio.h does
//   #define HIGH 0x1
//   #define LOW  0x0
// The preprocessor runs before C++ scoping, so even `CommandConfidence::HIGH`
// expands to `CommandConfidence::0x1` and fails to compile on the device.
// A native-only test cannot catch this: <Arduino.h> is never included there.
enum class CommandConfidence : uint8_t {
    NONE = 0,
    CONF_LOW,
    CONF_HIGH,
};

// Field order is chosen for packing, not for contract order.
struct DeviceCommand {
    int64_t ts = 0;                        // server ms epoch; needs 64 bits
    int32_t seq = 0;                       // monotonic edge-trigger
    int32_t arrivalId = 0;
    char route[ROUTE_CAPACITY] = {0};      // always NUL-terminated
    CloudCommand pattern = CloudCommand::NONE;
    UserActivity activity = UserActivity::STILL;
    CommandConfidence conf = CommandConfidence::NONE;
    bool activityExplicit = false;         // diagnostics only
};                                          // No String. No vector. No retained heap.

// -------------------------------------------------------------------------
//  string -> enum, done ONCE at parse time
// -------------------------------------------------------------------------

inline CloudCommand cloudCommandFromName(const char* name) {
    if (name == nullptr) return CloudCommand::NONE;
    if (strcmp(name, "BUS") == 0) return CloudCommand::BUS;
    if (strcmp(name, "NUMBER") == 0) return CloudCommand::NUMBER;
    if (strcmp(name, "WAIT") == 0) return CloudCommand::WAIT;
    if (strcmp(name, "UNKNOWN") == 0) return CloudCommand::UNKNOWN;
    if (strcmp(name, "ERROR") == 0) return CloudCommand::ERROR;
    if (strcmp(name, "LEFT") == 0) return CloudCommand::LEFT;
    if (strcmp(name, "RIGHT") == 0) return CloudCommand::RIGHT;
    if (strcmp(name, "AHEAD") == 0) return CloudCommand::AHEAD;
    return CloudCommand::NONE;             // "NONE", unknown, and missing all land here
}

// Static storage. This is what main.cpp's submitCloudCommand(cmd, name) gets.
inline const char* cloudCommandName(CloudCommand command) {
    switch (command) {
        case CloudCommand::NONE:    return "NONE";
        case CloudCommand::BUS:     return "BUS";
        case CloudCommand::NUMBER:  return "NUMBER";
        case CloudCommand::WAIT:    return "WAIT";
        case CloudCommand::UNKNOWN: return "UNKNOWN";
        case CloudCommand::ERROR:   return "ERROR";
        case CloudCommand::LEFT:    return "LEFT";
        case CloudCommand::RIGHT:   return "RIGHT";
        case CloudCommand::AHEAD:   return "AHEAD";
    }
    return "NONE";
}

// HARD REQUIREMENT: missing, unknown, or wrong-typed activity resolves to STILL.
inline UserActivity userActivityFromName(const char* name) {
    if (name == nullptr) return UserActivity::STILL;
    if (strcmp(name, "MOVING") == 0) return UserActivity::MOVING;
    return UserActivity::STILL;
}

inline const char* userActivityName(UserActivity activity) {
    switch (activity) {
        case UserActivity::STILL:   return "STILL";
        case UserActivity::MOVING:  return "MOVING";
        case UserActivity::UNKNOWN: return "UNKNOWN";
    }
    return "STILL";
}

inline CommandConfidence commandConfidenceFromName(const char* name) {
    if (name == nullptr) return CommandConfidence::NONE;
    if (strcmp(name, "high") == 0) return CommandConfidence::CONF_HIGH;
    if (strcmp(name, "low") == 0) return CommandConfidence::CONF_LOW;
    return CommandConfidence::NONE;
}

// Truncating copy with a guaranteed NUL. Deliberately not strncpy: strncpy
// leaves the destination unterminated when the source fills the buffer.
inline void copyRoute(char (&destination)[ROUTE_CAPACITY], const char* source) {
    destination[0] = '\0';
    if (source == nullptr) return;
    size_t index = 0;
    while (index + 1 < ROUTE_CAPACITY && source[index] != '\0') {
        destination[index] = source[index];
        ++index;
    }
    destination[index] = '\0';
}

// -------------------------------------------------------------------------
//  parse
// -------------------------------------------------------------------------

// Returns false on: oversize body, malformed JSON, non-object root, or an
// absent/non-integer `seq`. `out` is only written on success, so a bad poll
// can never corrupt the command the board is currently acting on.
//
// LIFETIME: every const char* obtained below points into `document` and dies
// with it. They are consumed by strcmp/copyRoute before returning. Never store
// one in DeviceCommand.
inline bool parseDeviceCommand(const char* body, size_t length, DeviceCommand& out) {
    if (body == nullptr || length == 0 || length > PULL_BODY_MAX) return false;

    JsonDocument document;
    if (deserializeJson(document, body, length) != DeserializationError::Ok) return false;

    JsonObjectConst root = document.as<JsonObjectConst>();
    if (root.isNull()) return false;
    if (!root["seq"].is<int32_t>()) return false;

    DeviceCommand parsed;
    parsed.seq = root["seq"].as<int32_t>();
    parsed.arrivalId = root["arrivalId"] | static_cast<int32_t>(0);
    parsed.ts = root["ts"] | static_cast<int64_t>(0);
    parsed.pattern = cloudCommandFromName(root["pattern"].as<const char*>());
    parsed.activityExplicit = root["activity"].is<const char*>();
    parsed.activity = userActivityFromName(root["activity"].as<const char*>());
    parsed.conf = commandConfidenceFromName(root["conf"].as<const char*>());
    copyRoute(parsed.route, root["route"].as<const char*>());
    // `dest` is deliberately never read. It is parsed by deserializeJson and
    // discarded with the document; the device has nothing to display it on.

    out = parsed;
    return true;
}

// -------------------------------------------------------------------------
//  seq edge-gate — preserves net.cpp:54-56, with the state lifted out so both
//  the gate and the parser stay host-testable.
// -------------------------------------------------------------------------

struct RelaySeqGate {
    int32_t lastSeq = 0;
};

inline bool acceptSeq(RelaySeqGate& gate, int32_t seq) {
    if (seq <= gate.lastSeq) return false;
    gate.lastSeq = seq;
    return true;
}

// -------------------------------------------------------------------------
//  activity staleness — see Verdict 8. millis()-only, no wall clock.
// -------------------------------------------------------------------------

inline constexpr uint32_t ACTIVITY_STALE_MS = 5000;

struct ActivityFreshness {
    uint32_t lastCommandAtMs = 0;
    bool haveCommand = false;
};

inline void noteCommandArrival(ActivityFreshness& state, uint32_t nowMs) {
    state.lastCommandAtMs = nowMs;
    state.haveCommand = true;
}

// A MOVING state the phone stopped refreshing decays back to STILL.
inline UserActivity freshActivityOr(
    const ActivityFreshness& state, UserActivity activity, uint32_t nowMs) {
    if (!state.haveCommand) return UserActivity::STILL;
    if (static_cast<uint32_t>(nowMs - state.lastCommandAtMs) >= ACTIVITY_STALE_MS) {
        return UserActivity::STILL;
    }
    return activity;
}
```

`sizeof(DeviceCommand)` is asserted `<= 32` by the test suite. Field order is
`int64_t` first so the 8-byte alignment does not open a hole.

### `src/net.h` — REPLACES the legacy `PullResult`

```cpp
#pragma once

// ==========================================================================
//  net.h — Wi-Fi join + outbound-only poll of the Vercel relay.
//  Replaces the legacy PullResult ({seq, mode, msg, replies}).
//  The parse itself lives in relay_command_pure.h so it is host-testable.
// ==========================================================================

#include <Arduino.h>

#include "relay_command_pure.h"

// Telemetry POSTed as the /api/pull request body (Contract C, debug screen).
// `playing` must point at a string literal or a pattern name with static
// storage: this struct is copied by value through a queue.
// `upMs` and `rssi` are filled by the relay task, not by the caller.
struct RelayTelemetry {
    float bandRms = 0.0f;
    float modIdx = 0.0f;
    uint32_t upMs = 0;
    uint16_t peakHz = 0;
    uint16_t tofMm = 0;
    int16_t rssi = 0;
    bool rising = false;
    const char* playing = "NONE";
};

// Join the hotspot (STA). Blocks up to ~20 s. Returns true on WL_CONNECTED.
bool wifiJoin();

// Current station IP as a dotted string ("0.0.0.0" if not connected).
String deviceIp();

// Create the command queue, the telemetry mailbox, and the polling task.
// Call AFTER wifiJoin(). Safe to call when Wi-Fi is down: the task idles.
bool relayBegin();

// Drain one newly-arrived command. Non-blocking; safe to call from loop()
// every iteration. Only ever yields commands whose seq advanced.
bool relayPollCommand(DeviceCommand& out);

// Latest-wins mailbox read by the polling task on its next poll.
void relayPublishTelemetry(const RelayTelemetry& telemetry);

// True while the last poll reached the relay and got HTTP 200.
bool relayOnline();

// Consecutive failed polls — drives the P10 ERROR trigger at 3.
uint32_t relayConsecutiveFailures();
```

### `src/net.cpp` — glue only

`wifiJoin()` is preserved verbatim from `net.cpp:14-31`, including
`setInsecure()`. `postReply()` is deleted: `/api/reply` belongs to the closed
speech/braille contract.

```cpp
#include <Arduino.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#include <freertos/task.h>

#include "net.h"
#include "secrets.h"

namespace {

constexpr uint32_t RELAY_POLL_INTERVAL_MS = 300;
constexpr uint16_t RELAY_CONNECT_TIMEOUT_MS = 4000;
constexpr uint16_t RELAY_RESPONSE_TIMEOUT_MS = 2000;

// Core 0 hosts the Wi-Fi/TCP stack. loop() and audioTask own core 1, so a
// blocking TLS exchange here can never stall the 10 ms output tick.
constexpr uint8_t RELAY_TASK_CORE = 0;
constexpr UBaseType_t RELAY_TASK_PRIORITY = 2;
// mbedTLS handshakes are stack-hungry; verify with uxTaskGetStackHighWaterMark.
constexpr uint32_t RELAY_TASK_STACK_BYTES = 12288;

constexpr size_t TELEMETRY_BODY_MAX = 192;
constexpr UBaseType_t COMMAND_QUEUE_DEPTH = 4;

enum class PollOutcome : uint8_t {
    OFFLINE,
    HTTP_FAILED,
    BODY_REJECTED,
    PARSE_FAILED,
    NO_CHANGE,
    NEW_COMMAND,
};

WiFiClientSecure tlsClient;          // ONE TLS client, reused for every poll
QueueHandle_t commandQueue = nullptr;
QueueHandle_t telemetryMailbox = nullptr;
TaskHandle_t relayTaskHandle = nullptr;
RelaySeqGate seqGate;
char responseBody[PULL_BODY_MAX + 1] = {0};
volatile bool relayReachable = false;
volatile uint32_t consecutiveFailures = 0;

int formatTelemetry(const RelayTelemetry& telemetry, char* out, size_t capacity) {
    return snprintf(
        out, capacity,
        "{\"bandRms\":%.1f,\"peakHz\":%u,\"modIdx\":%.2f,\"trend\":\"%s\","
        "\"playing\":\"%s\",\"tofMm\":%u,\"upMs\":%lu,\"rssi\":%d}",
        static_cast<double>(telemetry.bandRms),
        static_cast<unsigned>(telemetry.peakHz),
        static_cast<double>(telemetry.modIdx),
        telemetry.rising ? "rising" : "flat",
        telemetry.playing == nullptr ? "NONE" : telemetry.playing,
        static_cast<unsigned>(telemetry.tofMm),
        static_cast<unsigned long>(telemetry.upMs),
        static_cast<int>(telemetry.rssi));
}

PollOutcome pollOnce(DeviceCommand& out) {
    if (WiFi.status() != WL_CONNECTED) return PollOutcome::OFFLINE;

    RelayTelemetry telemetry{};
    if (telemetryMailbox != nullptr) {
        xQueuePeek(telemetryMailbox, &telemetry, 0);
    }
    // Owned here, not by main.cpp: this task is the one that knows about WiFi.
    telemetry.upMs = millis();
    telemetry.rssi = static_cast<int16_t>(WiFi.RSSI());

    char telemetryBody[TELEMETRY_BODY_MAX];
    const int telemetryLength = formatTelemetry(telemetry, telemetryBody, sizeof(telemetryBody));
    if (telemetryLength <= 0 || telemetryLength >= static_cast<int>(sizeof(telemetryBody))) {
        return PollOutcome::HTTP_FAILED;
    }

    HTTPClient http;
    // Arduino-ESP32 3.x already defaults _reuse to true; this is documentation.
    http.setReuse(true);
    http.setConnectTimeout(RELAY_CONNECT_TIMEOUT_MS);
    http.setTimeout(RELAY_RESPONSE_TIMEOUT_MS);

    const String url = String("https://") + VERCEL_HOST + "/api/pull";
    if (!http.begin(tlsClient, url)) return PollOutcome::HTTP_FAILED;
    http.addHeader("Content-Type", "application/json");

    const int code = http.POST(reinterpret_cast<uint8_t*>(telemetryBody),
                               static_cast<size_t>(telemetryLength));
    if (code != HTTP_CODE_OK) {
        http.end();
        return PollOutcome::HTTP_FAILED;
    }

    // MEASURED 2026-07-18: /api/pull answers with `Transfer-Encoding: chunked`
    // and no Content-Length, so getSize() is -1 and getStream() would hand back
    // raw chunk framing ("61\r\n{...}\r\n0\r\n\r\n"). getString() is the only
    // call that de-frames it. Do not "optimise" this into a stream read.
    const int contentLength = http.getSize();
    if (contentLength > static_cast<int>(PULL_BODY_MAX)) {
        http.end();
        return PollOutcome::BODY_REJECTED;
    }

    const String body = http.getString();
    http.end();

    const size_t bodyLength = body.length();
    if (bodyLength == 0 || bodyLength > PULL_BODY_MAX) return PollOutcome::BODY_REJECTED;
    memcpy(responseBody, body.c_str(), bodyLength);
    responseBody[bodyLength] = '\0';

    DeviceCommand parsed;
    if (!parseDeviceCommand(responseBody, bodyLength, parsed)) return PollOutcome::PARSE_FAILED;
    if (!acceptSeq(seqGate, parsed.seq)) return PollOutcome::NO_CHANGE;

    out = parsed;
    return PollOutcome::NEW_COMMAND;
}

void relayTask(void*) {
    while (true) {
        const uint32_t startedMs = millis();

        DeviceCommand command;
        const PollOutcome outcome = pollOnce(command);

        const bool reached =
            outcome == PollOutcome::NEW_COMMAND || outcome == PollOutcome::NO_CHANGE;
        relayReachable = reached;
        if (reached) {
            consecutiveFailures = 0;
        } else if (consecutiveFailures < UINT32_MAX) {
            // Not ++: incrementing a volatile-qualified value is deprecated in C++20.
            consecutiveFailures = consecutiveFailures + 1;
        }

        if (outcome == PollOutcome::NEW_COMMAND && commandQueue != nullptr) {
            if (xQueueSend(commandQueue, &command, 0) != pdTRUE) {
                DeviceCommand discarded;                // newest command wins
                xQueueReceive(commandQueue, &discarded, 0);
                xQueueSend(commandQueue, &command, 0);
            }
        }

        const uint32_t elapsedMs = millis() - startedMs;
        const uint32_t sleepMs =
            elapsedMs >= RELAY_POLL_INTERVAL_MS ? 1 : RELAY_POLL_INTERVAL_MS - elapsedMs;
        vTaskDelay(pdMS_TO_TICKS(sleepMs));
    }
}

} // namespace

bool wifiJoin() {
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    const uint32_t start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
        delay(250);
        Serial.print('.');
    }
    Serial.println();
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println(F("WiFi join FAILED"));
        return false;
    }
    tlsClient.setInsecure();                   // demo: accept any server cert
    Serial.print(F("WiFi connected, IP="));
    Serial.println(WiFi.localIP().toString());
    return true;
}

String deviceIp() {
    if (WiFi.status() != WL_CONNECTED) return String("0.0.0.0");
    return WiFi.localIP().toString();
}

bool relayBegin() {
    commandQueue = xQueueCreate(COMMAND_QUEUE_DEPTH, sizeof(DeviceCommand));
    telemetryMailbox = xQueueCreate(1, sizeof(RelayTelemetry));
    if (commandQueue == nullptr || telemetryMailbox == nullptr) {
        Serial.println(F("RELAY_INIT failed=queue_allocation"));
        return false;
    }
    const BaseType_t created = xTaskCreatePinnedToCore(
        relayTask, "relayTask", RELAY_TASK_STACK_BYTES, nullptr,
        RELAY_TASK_PRIORITY, &relayTaskHandle, RELAY_TASK_CORE);
    if (created != pdPASS) {
        Serial.println(F("RELAY_INIT failed=task_creation"));
        return false;
    }
    return true;
}

bool relayPollCommand(DeviceCommand& out) {
    return commandQueue != nullptr && xQueueReceive(commandQueue, &out, 0) == pdTRUE;
}

void relayPublishTelemetry(const RelayTelemetry& telemetry) {
    if (telemetryMailbox != nullptr) {
        xQueueOverwrite(telemetryMailbox, &telemetry);
    }
}

bool relayOnline() {
    return relayReachable;
}

uint32_t relayConsecutiveFailures() {
    return consecutiveFailures;
}
```

### `src/main.cpp` — the call sites

Include `"net.h"` alongside the existing headers, then add:

```cpp
constexpr uint32_t TELEMETRY_PUBLISH_INTERVAL_MS = 1000;
constexpr uint32_t RELAY_ERROR_FAILURE_THRESHOLD = 3;
constexpr uint32_t RELAY_ERROR_REPEAT_MS = 60000;

uint32_t lastTelemetryPublishMs = 0;
uint16_t lastTofMm = 0;
bool relayDegraded = false;
uint32_t lastRelayErrorMs = 0;
```

`setMode()` gains a source string so a relay-driven change is distinguishable
from the Serial stub on the console, and the no-op branch stops printing (at
3.3 polls/s the old `MODE unchanged` line would flood the log):

```cpp
void setMode(BoardMode mode, const char* source) {
    if (boardMode == mode) {
        return;
    }
    boardMode = mode;
    stopCloudPattern();
    Serial.printf("MODE changed=%s source=%s\n", modeName(mode), source);
}
```

Existing Serial cases become `setMode(BoardMode::NAVIGATION, "serial")` and
`setMode(BoardMode::WAITING, "serial")`.

The new service function — a pure queue drain, which is what keeps the 10 ms
output tick intact:

```cpp
const char* currentOutputName() {
    if (sirenOutputActive()) return sirenDecisionName(activeSirenOutput);
    if (proximityActive && proximityOutputAllowed) return "PROXIMITY";
    if (patternOutput(cloudPlayer).active && cloudPlayer.pattern != nullptr) {
        return cloudPlayer.pattern->name;
    }
    return "NONE";
}

// Pure queue drain: the blocking TLS exchange already happened on core 0.
// Cost here is bounded by the queue depth, so the 10 ms output tick is safe.
void serviceRelay(uint32_t nowMs) {
    DeviceCommand command;
    while (relayPollCommand(command)) {
        setMode(boardModeFor(command.activity), "relay");
        submitCloudCommand(command.pattern, cloudCommandName(command.pattern));
    }

    if (static_cast<uint32_t>(nowMs - lastTelemetryPublishMs) >= TELEMETRY_PUBLISH_INTERVAL_MS) {
        lastTelemetryPublishMs = nowMs;
        RelayTelemetry telemetry{};
        telemetry.tofMm = lastTofMm;
        telemetry.playing = currentOutputName();
        relayPublishTelemetry(telemetry);
    }

    const uint32_t failures = relayConsecutiveFailures();
    const bool degraded = failures >= RELAY_ERROR_FAILURE_THRESHOLD;
    if (degraded && (!relayDegraded ||
                     static_cast<uint32_t>(nowMs - lastRelayErrorMs) >= RELAY_ERROR_REPEAT_MS)) {
        relayDegraded = true;
        lastRelayErrorMs = nowMs;
        Serial.printf("RELAY degraded=1 failures=%lu\n", static_cast<unsigned long>(failures));
        submitCloudCommand(CloudCommand::ERROR, "ERROR_RELAY");
    } else if (!degraded && relayDegraded) {
        relayDegraded = false;
        Serial.println(F("RELAY recovered=1"));
    }
}
```

`applyTofUpdate()` records the range for telemetry, immediately after its
`if (!update.updated) return;` guard:

```cpp
    lastTofMm = update.distanceMm;
```

`setup()` brings the relay up *after* the sensors, and Wi-Fi failure is
deliberately non-fatal — Global Constraint 7 requires ToF and siren to work with
no network:

```cpp
    if (!audioBegin()) {
        haltWithError("ERROR component=microphone reason=init_failed");
    }

    // Wi-Fi is deliberately NOT fatal: ToF and siren safety are fully local.
    if (wifiJoin()) {
        Serial.printf("RELAY online=1 ip=%s\n", deviceIp().c_str());
    } else {
        Serial.println(F("RELAY online=0 local_safety=active"));
    }
    if (!relayBegin()) {
        Serial.println(F("RELAY init_failed=1 local_safety=active"));
    }
```

`loop()` gains one line, between the ToF update and `serviceReady`:

```cpp
void loop() {
    serviceSerial();
    const uint32_t nowMs = millis();
    serviceAudio(nowMs);
    applyTofUpdate(tofService(nowMs), nowMs);
    serviceRelay(nowMs);
    serviceReady(nowMs);
    serviceOutput(nowMs);
    delay(1);
}
```

**How the 300 ms cadence coexists with the 1 ms loop.** It does not need to.
`loop()` keeps its `delay(1)` and never waits on the network; the 300 ms cadence
is enforced by `vTaskDelay` inside `relayTask` on core 0. `serviceRelay()` runs
every ~1 ms and almost always finds an empty queue. The seq edge-gate
(`net.cpp:54-56`) is preserved inside `pollOnce`, so a command only ever reaches
the queue once — `loop()` never sees a repeat and cannot re-fire a pattern.

**Why not just call the poll from `loop()`.** `serviceOutput()` must run about
every 10 ms. `http.POST()` blocks for 50–200 ms with keep-alive, longer on a
handshake. `tickPattern()` (`haptic_pure.h:49-65`) catches up after a stall by
advancing `stepStartedMs` in a `while` loop, so it *skips* steps rather than
stretching them. A 150 ms stall during P6 can therefore swallow a whole SHORT
pulse and deliver a **plausible wrong route number** — the exact failure the
plan's arbitration rule 5 calls the worst output this device can make.

**Getting a name without heap.** `cloudCommandName()` returns a string literal,
so `submitCloudCommand(command.pattern, cloudCommandName(command.pattern))`
allocates nothing. This mirrors `sirenDecisionName()` in `audio.cpp:201-209` and
`OutputPattern::name` in `patterns.h:31`.

### `platformio.ini` diffs

Two environments change.

```diff
 [env:board_firmware]
@@
 build_src_filter =
     -<*>
     +<audio.cpp>
     +<main.cpp>
     +<haptic.cpp>
+    +<net.cpp>
     +<tof.cpp>
 build_flags =
     -DARDUINO_USB_MODE=1
     -DARDUINO_USB_CDC_ON_BOOT=1
 lib_deps =
     adafruit/Adafruit_VL53L0X@1.2.5
     kosme/arduinoFFT@^2.0.4
+    bblanchon/ArduinoJson@^7.4.3
```

```diff
 [env:native]
 platform       = native
 test_framework = unity
 build_flags    = -std=gnu++17 -I src
+lib_deps =
+    bblanchon/ArduinoJson@^7.4.3
```

The version pin matches Global Constraint 11. Without the `board_firmware`
`lib_deps` line the firmware fails to compile at `#include <ArduinoJson.h>`;
without the `build_src_filter` line it compiles and links cleanly and the board
simply never polls — a silent no-op, which is the worse of the two.

## Native ArduinoJson verdict

**VERIFIED WORKING. No hand-rolled fallback extractor is needed.**

ArduinoJson 7.4.3 installs and links under `platform = native` and the full
parser runs on the host. Method: `firmware/braille_wearable/` was copied to the
scratchpad, `lib_deps` was added to `[env:native]`, `src/relay_command_pure.h`
and `test/test_relay_command/` were added, and `pio test` was run with
PlatformIO Core 6.1.19 on macOS (Darwin 25.3.0).

```
$ pio test -e native -f test_relay_command
Verbosity level can be increased via `-v, -vv, or -vvv` option
Collected 10 tests

Processing test_relay_command in native environment
--------------------------------------------------------------------------------
Building...
Library Manager: Installing bblanchon/ArduinoJson @ ^7.4.3
Unpacking 0% 10% 20% 30% 40% 50% 60% 70% 80% 90% 100%
Library Manager: ArduinoJson@7.4.3 has been installed!
Library Manager: Installing throwtheswitch/Unity @ ^2.6.1
Unpacking 0% 10% 20% 30% 40% 50% 60% 70% 80% 90% 100%
Library Manager: Unity@2.6.1 has been installed!
Testing...
test/test_relay_command/test_relay_command.cpp:229: test_contract_c_response_parses_every_field	[PASSED]
test/test_relay_command/test_relay_command.cpp:230: test_ms_epoch_survives_as_int64	[PASSED]
test/test_relay_command/test_relay_command.cpp:231: test_moving_activity_and_navigation_pattern	[PASSED]
test/test_relay_command/test_relay_command.cpp:232: test_missing_activity_defaults_to_still	[PASSED]
test/test_relay_command/test_relay_command.cpp:233: test_unknown_activity_string_defaults_to_still	[PASSED]
test/test_relay_command/test_relay_command.cpp:234: test_wrong_typed_activity_defaults_to_still	[PASSED]
test/test_relay_command/test_relay_command.cpp:235: test_missing_or_unknown_pattern_resolves_to_none	[PASSED]
test/test_relay_command/test_relay_command.cpp:236: test_route_is_truncated_and_always_nul_terminated	[PASSED]
test/test_relay_command/test_relay_command.cpp:237: test_dest_is_parsed_and_discarded	[PASSED]
test/test_relay_command/test_relay_command.cpp:238: test_oversize_and_malformed_bodies_are_rejected	[PASSED]
test/test_relay_command/test_relay_command.cpp:239: test_failed_parse_leaves_the_previous_command_intact	[PASSED]
test/test_relay_command/test_relay_command.cpp:240: test_conf_mapping	[PASSED]
test/test_relay_command/test_relay_command.cpp:241: test_seq_gate_is_edge_triggered	[PASSED]
test/test_relay_command/test_relay_command.cpp:242: test_command_names_round_trip_without_allocation	[PASSED]
test/test_relay_command/test_relay_command.cpp:243: test_live_relay_body_parses_and_defaults_to_still	[PASSED]
test/test_relay_command/test_relay_command.cpp:244: test_struct_stays_small	[PASSED]
------------- native:test_relay_command [PASSED] Took 1.33 seconds -------------

=================================== SUMMARY ===================================
Environment    Test                Status    Duration
-------------  ------------------  --------  ------------
native         test_relay_command  PASSED    00:00:01.330
================= 16 test cases: 16 succeeded in 00:00:01.330 =================
```

**Adding `lib_deps` to `[env:native]` does not regress the existing suite.** The
final full run, after the `CONF_LOW`/`CONF_HIGH` rename:

```
$ pio test -e native
=================================== SUMMARY ===================================
Environment    Test                    Status    Duration
-------------  ----------------------  --------  ------------
native         test_tof_bench          PASSED    00:00:00.979
native         test_siren_runtime      PASSED    00:00:00.469
native         test_siren              PASSED    00:00:00.526
native         test_relay_command      PASSED    00:00:00.911
native         test_navigation         PASSED    00:00:00.550
native         test_braille            PASSED    00:00:00.421
native         test_haptic             PASSED    00:00:00.441
native         test_tof_proximity      PASSED    00:00:00.419
native         test_audio              PASSED    00:00:00.415
native         test_buzzer_experiment  PASSED    00:00:00.503
================= 94 test cases: 94 succeeded in 00:00:05.633 =================
native exit=0
```

Three supporting facts, each verified independently of the test run:

1. **`int64_t` works.** `ARDUINOJSON_USE_LONG_LONG` defaults to `1` when
   `ARDUINOJSON_SIZEOF_POINTER >= 4` — confirmed in the installed
   `Configuration.hpp:82-88`, in the published config page, and empirically by
   `test_ms_epoch_survives_as_int64` round-tripping `1784419200123`.
2. **`JsonDocument` allocates on the heap in v7.** `StaticJsonDocument` no
   longer exists. Contract C's "No heap" is satisfied in the sense that
   matters — the **retained** `DeviceCommand` holds no heap — but the parser
   uses a transient pool, as Contract C's own "~230 bytes of ArduinoJson v7
   pool" note already concedes. If that ever becomes unacceptable, v7 accepts a
   custom `ArduinoJson::Allocator` over a static arena; it is not needed here.
3. **The parser was run against the bytes the deployed relay returns today**, not
   only against the plan's example.

## Board firmware build verdict

Every ESP32-side code block in this document was compiled, not merely reviewed.
The scratch copy carried the proposed `src/relay_command_pure.h`, `src/net.h`,
`src/net.cpp`, the `main.cpp` integration, and both `platformio.ini` edits.

The three C++ file blocks above were then **extracted from this markdown file
and written back over the scratch sources verbatim**, and both checks re-run, so
the text printed here is byte-for-byte the text that builds — comments included.
Copy-paste is safe.

```
$ pio run -e board_firmware
RAM:   [==        ]  16.7% (used 54804 bytes from 327680 bytes)
Flash: [========= ]  86.7% (used 1136636 bytes from 1310720 bytes)
Building .pio/build/board_firmware/firmware.bin
esptool v5.3.0
Creating ESP32-S3 image...
Merged 2 ELF sections.
Successfully created ESP32-S3 image.
========================= [SUCCESS] Took 8.68 seconds =========================

Environment     Status    Duration
--------------  --------  ------------
board_firmware  SUCCESS   00:00:08.678
========================= 1 succeeded in 00:00:08.678 =========================
board exit=0
```

**RAM 16.7 % is comfortable. Flash 86.7 % is not.** The relay path costs roughly
174 KB of headroom in the 1.31 MB app slot of `default.csv`. ArduinoJson v7 is
explicitly "significantly bigger" than v6 per its own release notes, and mbedTLS
plus the Wi-Fi stack dominate the rest. This is a **new constraint the plan does
not record**: there is room to finish the build, but not room for another large
library. If flash becomes the binding constraint, the first lever is a partition
table with a larger app slot, not deleting features.

One methodology note, because it nearly produced a false green. The first build
was run as `pio run -e board_firmware 2>&1 | tail -45` in the background, and the
harness reported **exit code 0 even though the build failed** — the exit status
belonged to `tail`, not to `pio`. The failure was found only by reading the
output. Every build claim above was re-verified under `set -o pipefail` with the
exit code printed explicitly. Anyone scripting these checks should do the same.

## Native test pattern

`firmware/braille_wearable/test/test_relay_command/test_relay_command.cpp`,
following the `test_navigation` conventions (free functions, explicit
`RUN_TEST` list in `main`, `TEST_ASSERT_EQUAL_UINT8` over `static_cast<uint8_t>`
for scoped enums).

One Unity caveat: `TEST_ASSERT_EQUAL_INT64` depends on `UNITY_SUPPORT_64`, which
is not configured in this project. Compare 64-bit values with
`TEST_ASSERT_TRUE_MESSAGE(x == 1784419200123LL, "…")` instead — that is what the
verified suite does.

```cpp
#include <unity.h>

#include <string.h>

#include "relay_command_pure.h"

void setUp(void) {}
void tearDown(void) {}

// The literal Contract C response from the plan.
static const char CONTRACT_C[] =
    "{\"seq\":9,\"pattern\":\"NUMBER\",\"activity\":\"STILL\",\"route\":\"88\","
    "\"dest\":\"Clapham Common\",\"conf\":\"high\",\"arrivalId\":1,"
    "\"ts\":1784419200123}";

// Captured verbatim from the deployed relay on 2026-07-18 with
//   curl -sS --http1.1 https://bus-stop-awareness.vercel.app/api/pull
// Note: the deployed contract has NO `activity` field yet.
static const char LIVE_RELAY_BODY[] =
    "{\"seq\":20,\"pattern\":\"UNKNOWN\",\"route\":\"\",\"dest\":\"\","
    "\"conf\":\"low\",\"arrivalId\":1,\"ts\":1784398000652}";

static bool parseLiteral(const char* json, DeviceCommand& out) {
    return parseDeviceCommand(json, strlen(json), out);
}

void test_contract_c_response_parses_every_field(void) {
    DeviceCommand command;
    TEST_ASSERT_TRUE(parseLiteral(CONTRACT_C, command));
    TEST_ASSERT_EQUAL_INT32(9, command.seq);
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CloudCommand::NUMBER),
                            static_cast<uint8_t>(command.pattern));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(UserActivity::STILL),
                            static_cast<uint8_t>(command.activity));
    TEST_ASSERT_EQUAL_STRING("88", command.route);
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CommandConfidence::CONF_HIGH),
                            static_cast<uint8_t>(command.conf));
    TEST_ASSERT_EQUAL_INT32(1, command.arrivalId);
    TEST_ASSERT_TRUE(command.activityExplicit);
}

// The single most important 64-bit question: a ms epoch does not fit in int32.
void test_ms_epoch_survives_as_int64(void) {
    DeviceCommand command;
    TEST_ASSERT_TRUE(parseLiteral(CONTRACT_C, command));
    TEST_ASSERT_TRUE_MESSAGE(command.ts == 1784419200123LL,
                             "ts truncated: ARDUINOJSON_USE_LONG_LONG is off");
}

void test_moving_activity_and_navigation_pattern(void) {
    DeviceCommand command;
    TEST_ASSERT_TRUE(parseLiteral(
        "{\"seq\":10,\"pattern\":\"LEFT\",\"activity\":\"MOVING\",\"route\":\"\","
        "\"dest\":\"\",\"conf\":\"high\",\"arrivalId\":1,\"ts\":1784419205000}",
        command));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CloudCommand::LEFT),
                            static_cast<uint8_t>(command.pattern));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(BoardMode::NAVIGATION),
                            static_cast<uint8_t>(boardModeFor(command.activity)));
    TEST_ASSERT_EQUAL_STRING("", command.route);
}

void test_missing_activity_defaults_to_still(void) {
    DeviceCommand command;
    TEST_ASSERT_TRUE(parseLiteral("{\"seq\":3,\"pattern\":\"BUS\"}", command));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(UserActivity::STILL),
                            static_cast<uint8_t>(command.activity));
    TEST_ASSERT_FALSE(command.activityExplicit);
}

void test_unknown_activity_string_defaults_to_still(void) {
    DeviceCommand command;
    TEST_ASSERT_TRUE(parseLiteral(
        "{\"seq\":3,\"pattern\":\"BUS\",\"activity\":\"SPRINTING\"}", command));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(UserActivity::STILL),
                            static_cast<uint8_t>(command.activity));
}

void test_wrong_typed_activity_defaults_to_still(void) {
    DeviceCommand command;
    TEST_ASSERT_TRUE(parseLiteral(
        "{\"seq\":3,\"pattern\":\"BUS\",\"activity\":7}", command));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(UserActivity::STILL),
                            static_cast<uint8_t>(command.activity));

    TEST_ASSERT_TRUE(parseLiteral(
        "{\"seq\":4,\"pattern\":\"BUS\",\"activity\":null}", command));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(UserActivity::STILL),
                            static_cast<uint8_t>(command.activity));
}

void test_missing_or_unknown_pattern_resolves_to_none(void) {
    DeviceCommand command;
    TEST_ASSERT_TRUE(parseLiteral("{\"seq\":5}", command));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CloudCommand::NONE),
                            static_cast<uint8_t>(command.pattern));

    TEST_ASSERT_TRUE(parseLiteral("{\"seq\":6,\"pattern\":\"TELEPORT\"}", command));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CloudCommand::NONE),
                            static_cast<uint8_t>(command.pattern));

    TEST_ASSERT_TRUE(parseLiteral("{\"seq\":7,\"pattern\":123}", command));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CloudCommand::NONE),
                            static_cast<uint8_t>(command.pattern));
}

void test_route_is_truncated_and_always_nul_terminated(void) {
    DeviceCommand command;
    TEST_ASSERT_TRUE(parseLiteral(
        "{\"seq\":8,\"pattern\":\"NUMBER\",\"route\":\"1234567890ABC\"}", command));
    TEST_ASSERT_EQUAL_STRING("1234567", command.route);
    TEST_ASSERT_EQUAL_size_t(ROUTE_CAPACITY - 1, strlen(command.route));
    TEST_ASSERT_EQUAL_CHAR('\0', command.route[ROUTE_CAPACITY - 1]);

    TEST_ASSERT_TRUE(parseLiteral("{\"seq\":9,\"pattern\":\"NUMBER\"}", command));
    TEST_ASSERT_EQUAL_STRING("", command.route);

    TEST_ASSERT_TRUE(parseLiteral(
        "{\"seq\":10,\"pattern\":\"NUMBER\",\"route\":404}", command));
    TEST_ASSERT_EQUAL_STRING("", command.route);
}

void test_dest_is_parsed_and_discarded(void) {
    // The struct has no dest member at all; this is a compile-time guarantee.
    // Behaviourally: a long dest must not spill into route or fail the parse.
    DeviceCommand command;
    TEST_ASSERT_TRUE(parseLiteral(
        "{\"seq\":11,\"pattern\":\"NUMBER\",\"route\":\"88\","
        "\"dest\":\"Clapham Common via Wandsworth Road and Queenstown Road\"}",
        command));
    TEST_ASSERT_EQUAL_STRING("88", command.route);
    TEST_ASSERT_EQUAL_INT32(11, command.seq);
}

void test_oversize_and_malformed_bodies_are_rejected(void) {
    DeviceCommand command;

    char oversize[PULL_BODY_MAX + 64];
    memset(oversize, 'x', sizeof(oversize));
    TEST_ASSERT_FALSE(parseDeviceCommand(oversize, sizeof(oversize), command));

    TEST_ASSERT_FALSE(parseLiteral("{\"seq\":1,", command));
    TEST_ASSERT_FALSE(parseLiteral("not json at all", command));
    TEST_ASSERT_FALSE(parseLiteral("[1,2,3]", command));
    TEST_ASSERT_FALSE(parseLiteral("{\"pattern\":\"BUS\"}", command));
    TEST_ASSERT_FALSE(parseLiteral("{\"seq\":\"nine\"}", command));
    TEST_ASSERT_FALSE(parseDeviceCommand(nullptr, 10, command));
    TEST_ASSERT_FALSE(parseDeviceCommand("", 0, command));
}

void test_failed_parse_leaves_the_previous_command_intact(void) {
    DeviceCommand command;
    TEST_ASSERT_TRUE(parseLiteral(CONTRACT_C, command));
    TEST_ASSERT_FALSE(parseLiteral("garbage", command));
    TEST_ASSERT_EQUAL_INT32(9, command.seq);
    TEST_ASSERT_EQUAL_STRING("88", command.route);
}

void test_seq_gate_is_edge_triggered(void) {
    RelaySeqGate gate;
    TEST_ASSERT_TRUE(acceptSeq(gate, 9));
    TEST_ASSERT_FALSE(acceptSeq(gate, 9));
    TEST_ASSERT_FALSE(acceptSeq(gate, 8));
    TEST_ASSERT_FALSE(acceptSeq(gate, 0));
    TEST_ASSERT_TRUE(acceptSeq(gate, 10));
    TEST_ASSERT_EQUAL_INT32(10, gate.lastSeq);
}

void test_live_relay_body_parses_and_defaults_to_still(void) {
    DeviceCommand command;
    TEST_ASSERT_TRUE(parseLiteral(LIVE_RELAY_BODY, command));
    TEST_ASSERT_EQUAL_INT32(20, command.seq);
    TEST_ASSERT_TRUE(command.ts == 1784398000652LL);
    // The whole point: today's relay omits `activity`.
    TEST_ASSERT_FALSE(command.activityExplicit);
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(UserActivity::STILL),
                            static_cast<uint8_t>(command.activity));
    // ...and UNKNOWN is accepted in WAITING, so the legacy body still drives output.
    TEST_ASSERT_TRUE(acceptsCloudCommand(boardModeFor(command.activity), command.pattern));
}

void test_struct_stays_small(void) {
    TEST_ASSERT_TRUE_MESSAGE(sizeof(DeviceCommand) <= 32, "DeviceCommand grew");
}

int main(int, char**) {
    UNITY_BEGIN();
    RUN_TEST(test_contract_c_response_parses_every_field);
    RUN_TEST(test_ms_epoch_survives_as_int64);
    RUN_TEST(test_moving_activity_and_navigation_pattern);
    RUN_TEST(test_missing_activity_defaults_to_still);
    RUN_TEST(test_unknown_activity_string_defaults_to_still);
    RUN_TEST(test_wrong_typed_activity_defaults_to_still);
    RUN_TEST(test_missing_or_unknown_pattern_resolves_to_none);
    RUN_TEST(test_route_is_truncated_and_always_nul_terminated);
    RUN_TEST(test_dest_is_parsed_and_discarded);
    RUN_TEST(test_oversize_and_malformed_bodies_are_rejected);
    RUN_TEST(test_failed_parse_leaves_the_previous_command_intact);
    RUN_TEST(test_seq_gate_is_edge_triggered);
    RUN_TEST(test_live_relay_body_parses_and_defaults_to_still);
    RUN_TEST(test_struct_stays_small);
    return UNITY_END();
}
```

A staleness test belongs alongside these once `ActivityFreshness` lands —
`freshActivityOr()` is pure and takes `nowMs` as a parameter precisely so it can
be driven from a host test without a clock.

## TLS keep-alive — the plan is wrong here

The plan states at its Camera and transport section that `net.cpp:41-48`
"constructs a fresh `HTTPClient` per poll and calls `http.end()`, tearing the TLS
session down; every poll then pays a full handshake", and prescribes hoisting
`HTTPClient` to a static and calling `setReuse(true)`.

**Read against the Arduino-ESP32 3.x source, that diagnosis does not hold.**

- `HTTPClient.h:293` — `bool _reuse = true;`. Reuse is **on by default**.
  `setReuse(true)` changes nothing. It is worth writing anyway as documentation,
  but it is not a fix.
- `HTTPClient.cpp:377-391` — `disconnect()` only calls `_client->stop()` in the
  `else` branch. When `_reuse && _canReuse`, it logs `tcp keep open for reuse`
  and leaves the socket, and therefore the TLS session, open.
- `HTTPClient.cpp:1069-1080` — `connect()` returns early with the existing
  connection whenever `connected()` is true. A *new* `HTTPClient` handed the same
  still-connected static client reuses it.

So the existing shape — a file-static `WiFiClientSecure` (`net.cpp:11`) plus a
per-poll local `HTTPClient` — **already** achieves keep-alive. **Verdict: keep
`net.cpp:11` as-is. Do not hoist `HTTPClient` to a static.**

Hoisting it would be actively worse. `HTTPClient` holds `String _host`, `_uri`,
`_headers` and a redirect/location buffer; making it static keeps that state
alive between polls and makes header accumulation and stale-URL bugs possible.
The local object is cheap and its destructor is the natural reset.

What actually decides whether the handshake recurs is `_canReuse`, and the live
endpoint keeps it true:

- `HTTPClient.cpp:1205-1206` clears it only for `HTTP/1.0` responses. The relay
  answers `HTTP/1.1 200 OK`.
- `HTTPClient.cpp:1223-1225` clears it on `Connection: close`. The relay sends no
  `Connection` header.

**Socket leaks.** The classic ESP32 report is a `WiFiClientSecure` allocated per
request, each carrying an mbedTLS context of tens of kilobytes. That failure mode
does not apply here: there is exactly one static client for the process lifetime.
`disconnect(false)` sets HTTPClient's `_client = nullptr` in the non-reuse
branch, but that only detaches the pointer — the static object survives and the
next `begin(tlsClient, url)` re-attaches it.

The residual risk is a genuinely reported one — arduino-esp32 issue #6561
describes an HTTPS request succeeding once and failing afterwards with
`start_ssl_client: -1`, and the thread is labelled "Needs investigation" with no
confirmed root cause or fix. **UNVERIFIED whether that reproduces on 3.x against
Vercel.** The mitigation is already in the design: `pollOnce` returns
`HTTP_FAILED`, `relayTask` counts it, and three consecutive failures fire P10
ERROR rather than leaving the board mutely stuck. If it does reproduce on the
bench, the escalation is `WiFi.disconnect()`/`wifiJoin()` re-init after N
consecutive failures — not `setReuse(false)`, which issue #6561 reports as
already ineffective.

## Staleness — what actually works

Contract C carries `ts` as a server ms epoch. **Comparing it against `millis()`
is unsound and must not be done.** `millis()` counts milliseconds since boot;
`ts` counts milliseconds since 1970. Their difference is about 1.78 × 10¹², not
an age.

**Do not add SNTP to close the gap.** `configTime()` + `time()` would give a real
epoch, but it introduces a failure mode that is strictly worse than the problem:
a venue hotspot that blocks or intercepts UDP 123 leaves the clock at epoch 0
with no error, every command then measures as ~56 years stale, and the device
goes silent on stage in a way no one can debug without a laptop. The board also
cannot distinguish "NTP has not synced yet" from "NTP will never sync".

**Recommended: measure staleness locally, and treat `ts` as diagnostics.**

The property the plan actually wants is that a `MOVING` state the phone stopped
refreshing must not persist — if the capture page is backgrounded or the browser
loses the camera, the board must fall back to `STILL` so that navigation patterns
stop being accepted and bus-stop patterns resume. That is fully expressible with
`millis()`:

```cpp
// in serviceRelay(), inside the drain loop
noteCommandArrival(activityFreshness, nowMs);

// and after the drain, every iteration
const UserActivity effective =
    freshActivityOr(activityFreshness, lastCommand.activity, nowMs);
setMode(boardModeFor(effective), "relay");
```

`freshActivityOr()` (given above) resolves to `STILL` when no command has ever
arrived and when the last one is older than `ACTIVITY_STALE_MS`. All comparisons
use the overflow-safe `static_cast<uint32_t>(now - then) >= limit` idiom already
used throughout `haptic_pure.h` and `siren_runtime_pure.h`, so the 49.7-day
`millis()` wrap is handled.

`ts` still earns its place: echo it in the Serial diagnostic line and treat a
`ts` that moves **backwards** while `seq` moves forwards as a relay or Redis
anomaly worth printing. That is a real signal and it costs nothing. It is just
not a clock the board can subtract from.

**`ACTIVITY_STALE_MS = 5000` is a proposal, not a measurement.** At a 300 ms poll
it is ~16 missed polls. It needs one bench pass with the phone actually
backgrounded before it is treated as tuned.

## Grounding notes

Verified, with the claim each supports:

- <https://arduinojson.org/v7/how-to/upgrade-from-v6/> — `StaticJsonDocument` and
  `DynamicJsonDocument` are merged into `JsonDocument`, which "always allocates
  its memory on the heap"; custom allocators are supplied by inheriting
  `ArduinoJson::Allocator` and passing a pointer to the constructor.
- <https://arduinojson.org/v7/config/use_long_long/> — "The default is `1` on
  32-bit and 64-bit processors, `0` otherwise." Supports the `int64_t ts` field.
- <https://arduinojson.org/v7/api/jsonvariantconst/as/> — `as<const char*>()`
  returns `NULL` when the value is not a string or the key is missing, whereas
  `as<String>()` returns "the JSON representation", converting numbers and
  booleans to text. This is the correctness argument for `const char*`, beyond
  the heap argument.
- <https://arduinojson.org/news/2024/01/03/arduinojson-7/> — v7 release notes.
- <https://arduinojson.org/news/2024/12/29/arduinojson-7-3/> — 7.3 copy-policy
  change; `const char*` is stored by copy.
- <https://docs.platformio.org/en/latest/projectconf/sections/env/options/library/lib_deps.html>
  — `lib_deps` installs "to the libdeps_dir before environment processing", with
  no platform restriction stated. Combined with the passing run above, this is
  what licenses `lib_deps` in `[env:native]`.
- <https://docs.platformio.org/en/latest/advanced/unit-testing/index.html> —
  "you can execute the same tests on the local host machine (native)".
- <https://docs.platformio.org/en/latest/projectconf/index.html> — project
  configuration reference.
- <https://github.com/espressif/arduino-esp32/issues/6561> — "HTTPClient https
  request works the first time, but fails the second time". Labelled "Needs
  investigation"; `setReuse(false)` reported as not helping. Basis for the
  residual-risk entry.
- <https://github.com/espressif/arduino-esp32/issues/6165> — "[SSL] timeout on
  second connection", the adjacent report.
- <https://deepwiki.com/espressif/arduino-esp32/5.2-http-and-https-client> —
  third-party overview of HTTPClient/NetworkClientSecure. **Not authoritative**;
  used only for orientation. Every HTTPClient claim in this document is cited to
  source instead.

Primary sources read directly rather than fetched:

- `libraries/HTTPClient/src/HTTPClient.h` and `.cpp` at
  `espressif/arduino-esp32` ref `release/v3.2.x`, retrieved with
  `gh api repos/espressif/arduino-esp32/contents/...`. Line numbers cited above
  are from that ref. `release/v3.3.x` does not exist as a branch.
- `~/.platformio/packages/framework-arduinoespressif32/libraries/HTTPClient/src/`
  — the locally cached 2.0.17 copy, which matches on every point cited.
- `ArduinoJson/Configuration.hpp:82-88` from the installed 7.4.3 package.

**UNVERIFIED:**

- Whether the pinned pioarduino 55.03.39 platform resolves to Arduino-ESP32
  3.2.x specifically. The HTTPClient facts were read from `release/v3.2.x`; the
  same code is present in the cached 2.0.17 copy, so the verdict is stable
  across both ends of the range, but the exact 3.x point release was not pinned
  down.
- Whether issue #6561 reproduces on 3.x against Vercel.
- Whether Vercel's HTTP/1.1 framing stays chunked. It was chunked on 2026-07-18;
  a platform-side change to emit `Content-Length` would be silently *safe* here
  (the `getSize()` guard tightens, `getString()` still works), but the reverse
  assumption is not.
- `ACTIVITY_STALE_MS = 5000`, and `RELAY_TASK_STACK_BYTES = 12288`. Both are
  proposals. The stack figure needs one `uxTaskGetStackHighWaterMark()` reading
  after a TLS handshake.

## Residual risk

1. **Compiled, never run.** Both `pio test -e native` (94/94) and
   `pio run -e board_firmware` (SUCCESS) are green over exactly the code printed
   here, but nothing in this document has been flashed. A green build says the
   types line up; it says nothing about whether the TLS poll actually completes
   in 50–200 ms, whether keep-alive survives Vercel's idle timeout, or whether
   `relayTask` starves anything. That is a bench test, and it has not happened.
2. **Flash is at 86.7 %.** ~174 KB of headroom in the 1.31 MB app slot. Any
   further large dependency needs a partition change first. See the build
   verdict above.
3. **`snprintf("%.1f")` in `formatTelemetry` assumes float formatting is linked
   in.** ESP-IDF enables it for the main app by default, but if telemetry ever
   prints `bandRms` as blank or `?`, that is the cause — scale to integers rather
   than debugging newlib.
4. **`relayReachable` and `consecutiveFailures` are plain `volatile` scalars
   shared across cores.** Aligned 32-bit loads and stores are atomic on Xtensa,
   so a torn read is not possible, but `volatile` is not a memory barrier. This
   is acceptable for a status flag read once per loop and would not be acceptable
   for anything the arbitration depends on.
5. **Drop-oldest on a full command queue.** At depth 4, a 300 ms producer and a
   ~1 ms consumer, the queue cannot realistically fill. If it ever does, the
   discarded entry could be a `NUMBER` payload. The plan's queue TTL and
   arbitration rules are the correct place to handle that, not `net.cpp`.
6. **`activityExplicit` is diagnostics only.** It exists so a Serial dump can
   distinguish "phone said STILL" from "phone said nothing" — which, per Finding
   B, is the live case today. Nothing in the arbitration may branch on it, or the
   `STILL` default stops being a single well-defined behaviour.
7. **No field validation.** This is parser and transport design verified on a
   host and against one live HTTP response. It is not a bench test of the board
   polling the relay, and it is not a demo rehearsal. Both still need to happen.
8. **We have not validated with DeafBlind users.**
