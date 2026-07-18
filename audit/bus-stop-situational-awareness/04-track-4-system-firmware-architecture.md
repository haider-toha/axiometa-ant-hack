# Track 4 — End-to-End Software & Firmware Architecture

**Author:** Track 4 of 4 (systems / firmware engineering)
**Date:** 2026-07-18
**Status:** design + audit pass. **No source file in this repository was modified.**

---

## Scope

This document specifies the *programming*: the wire protocol at every hop, the literal JSON, the
firmware task structure, the haptic pattern sequencer, the PDM/FFT parameters, and what can be
unit-tested without hardware. It is written to be followed literally by an engineer under time
pressure.

**Built on, and not re-derived:**

- `audit/bus-stop-situational-awareness/02-track-2-modal-claude-grounding-and-hardcoded-spec.md`
  — Modal + Claude API facts, the stateful-detector verdict, the hardcoded route-88 spec. I adopt
  its Modal contract unchanged and propose exactly **one** change to its code (§Open Risk R4).
- `audit/bus-stop-situational-awareness/03-track-3-transcript-and-gesture-vocabulary.md`
  — the 11-pattern vocabulary, arbitration rules, quinary encoding, 33.9 mm motor separation,
  PDM-on-I2S0. I implement its rules; I correct its P6 timing arithmetic (§Open Risk R6).

**Three findings below change the build and are stated up front:**

1. **The motor GPIOs in `firmware/braille_wearable/src/pins.h` are wrong.** The ERM module's
   drive pin is **IO1**, not IO0. Motors must be `GPIO3` (Port 1) and `GPIO16` (Port 3), not
   `GPIO4`/`GPIO9`. Two independent primary sources agree; the existing firmware was never run
   against hardware, so this was never caught. §Motor Drive Electrical Findings.
2. **The default PlatformIO environment cannot build the siren feature.** `driver/i2s_pdm.h` does
   not exist in ESP-IDF v4.4.7, which is what Arduino-ESP32 2.0.17 (`env:genesis_mini_offline`,
   the current `default_envs`) ships. The build must move to `env:genesis_mini` (Arduino 3.x),
   whose platform is **not cached on this machine**. §Build, Flash & Deploy Mechanics.
3. **`braille.cpp` is not adaptable as a sequencer.** It is a `delay()` chain, not a state machine.
   Its *timing constants* survive; none of its *code* does. §Software Asset Reuse Audit.

**Out of scope:** haptic vocabulary design (Track 3), Modal/Claude API grounding (Track 2), CAD
(Track 1), pitch and positioning.

---

## End-to-End Data Path

### Decision 1 — who holds the camera: **the laptop.** Locked.

PIVOT.md §8 offers "phone or laptop webcam" and names "skip the phone" as a fallback. **Promote the
fallback to the plan.** The reasoning is build-time, not aesthetics:

| | Laptop webcam + Python | Mobile web app |
|---|---|---|
| Camera access | `cv2.VideoCapture(0)` — one line | `getUserMedia()` + HTTPS + permission UX + iOS Safari quirks |
| Frame → JPEG | `cv2.imencode('.jpg', f, [IMWRITE_JPEG_QUALITY, 85])` | `canvas.toBlob()` + `drawImage` pump |
| Loop timing | `time.sleep()` | `requestAnimationFrame` / `setInterval` drift |
| Debuggability | `print()`, breakpoints, saves frames to disk | remote Safari inspector over USB |
| Failure on stage | script restarts in 2 s | reload, re-grant permission, hope |
| Estimated build | **~120 lines, ~45 min** | ~400 lines, ~4 h + device testing |

Track 2 already locked `Camera = Laptop webcam` in its prop table, and its IN/OUT list cuts the
mobile app (OUT #12). **This track concurs and adds the engineering justification.** Nothing in the
demo requires a phone; the phone's only former job was hotspot, and any 2.4 GHz AP does that.

### Decision 2 — how a decision reaches the board: **reuse the Vercel + Upstash polling relay.** Locked.

| Option | Verdict | Reasoning |
|---|---|---|
| **Vercel + Upstash, ESP32 polls** | ✅ **CHOSEN** | Already built, deployed, and smoke-tested green end-to-end (`audit/speech-to-braille-wearable/33-phase5-deploy-smoke.md` §2). `net.cpp` already implements TLS join + GET + `seq`-gate + JSON POST. The `seq` gate at `net.cpp:54-56` is exactly the edge-trigger the new build needs. `/api/pull` already sets `Access-Control-Allow-Origin: *` (`app/app/api/pull/route.ts:9-11`), so the debug screen reads the same state from the same place with zero extra work. Host is stable and already in `secrets.h`. |
| ESP32 → Modal directly | ❌ | Genuinely ~100–200 ms faster (two hops removed) and technically easy — add a `GET /state` endpoint returning `_STATE`. Rejected because the Modal URL **changes between `modal serve` (`-dev` suffix) and `modal deploy`**, and changing it on the board is a recompile-and-reflash. It also needs CORS headers added by hand for the debug screen. Keep as a documented emergency path if Vercel is down. |
| WebSocket | ❌ | New library (`links2004/WebSockets`), new failure modes, and Vercel serverless does not hold persistent connections well. Buys ~150 ms for hours of work. |
| MQTT | ❌ | Requires a broker nobody has provisioned. Same latency class as polling. |
| BLE from the laptop | ❌ | Adds a Python BLE stack (`bleak`), pairing, and MTU negotiation. On-stage BLE pairing is a classic demo failure. Also loses the hotspot-independent cloud path the vision pipeline needs anyway. |

**The single change that makes polling fast enough: TLS keep-alive.** `net.cpp:41-48` constructs a
fresh `HTTPClient` per poll and calls `http.end()`, which tears the TLS session down. Every poll
therefore pays a full handshake (ECDHE on a 240 MHz Xtensa ≈ 300–800 ms) — **this is why the old
firmware used a 700 ms cadence** (`braille_wearable.cpp:17`). Hoisting `HTTPClient` to a static and
calling `http.setReuse(true)` collapses a poll to one TLS record exchange (~50–200 ms), which makes
a 300 ms cadence sustainable.

### Decision 3 — poll interval: **300 ms.** Fallback 700 ms if keep-alive misbehaves.

| Severity class | Path | Network latency added |
|---|---|---|
| **P0 SAFETY** — P1 DANGER, P3 ATTENTION (siren) | **Fully onboard.** PDM → FFT → haptic queue. | **Zero. Touches none of this.** |
| **P1 HAZARD** — P4 PROXIMITY (ToF) | **Fully onboard.** | **Zero.** |
| P3 INFORMATION — P5 BUS ARRIVING | Cloud | mean 150 ms, worst 300 ms |
| P3 INFORMATION — P6 ROUTE NUMBER | Cloud | mean 150 ms, worst 300 ms |

**Is 300 ms acceptable per class?** For P0/P1: the question does not arise — the safety floor is
local and works with Wi-Fi unplugged, which is PIVOT.md §5's own stated requirement and the
demo's strongest single beat. For P5/P6: the whole vision chain is ~1–5 s; adding a mean 150 ms is
**3–6 % of the total** and is invisible against the two-stage narrative. Polling latency is not the
problem in this system — Claude's generation time is.

### The path, hop by hop

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAPTOP   bus_client.py   (OpenCV + requests, ~120 lines)                         │
│   cv2.VideoCapture(0) ──2 Hz──▶ imencode JPEG q85 1280×720 (~90 kB) ──▶ base64  │
└────────────────────────────────────┬────────────────────────────────────────────┘
                                     │ HTTPS POST  {"frame_b64":"…"}   ~120 kB
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ MODAL   bus-vision.ingest    T4 · min_containers=1 · max_containers=1           │
│                                                                                 │
│   ┌────────────┐   ┌───────────────────┐   ┌──────────────────────────────┐    │
│   │ YOLO26n    │──▶│ debounce + LATCH  │──▶│ crop top 30 % → 896 px q92   │    │
│   │ COCO cls 5 │   │ 2 hits / 4 misses │   └──────────────┬───────────────┘    │
│   └────────────┘   └───────────────────┘                  │ 3 votes,           │
│      _STATE = module globals (safe because max_containers=1)│ CONCURRENT (R4)   │
│                                                             ▼                   │
│                                              ┌──────────────────────────┐       │
│                                              │ CLAUDE claude-opus-4-8   │       │
│                                              │ output_config.format     │       │
│                                              └────────────┬─────────────┘       │
└─────────────────────────────────────┬─────────────────────┴─────────────────────┘
                                      │ 200 {"event","arrival_id","reading",…}
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAPTOP   maps detector state → PatternId.  POSTs ONLY on change (edge-trigger).  │
└────────────────────────────────────┬────────────────────────────────────────────┘
                                     │ HTTPS POST /api/event {"pattern":"BUS",…}
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ VERCEL   bus-stop-awareness.vercel.app        ┌────────────────────────────┐    │
│   POST /api/event  ─ MSET payload → INCR seq ─▶│ UPSTASH REDIS              │    │
│   POST /api/pull   ◀─ MGET ────────────────────│  seq · pattern · route     │    │
│   GET  /api/state  ◀─ MGET  (debug screen) ────│  conf · arrivalId · tlm    │    │
└────────────────────────────────────┬───────────┴────────────────────────────┘    │
                                     │ ESP32 POST /api/pull every 300 ms
                                     │ request body = telemetry · response = command
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ESP32-S3   Axiometa Genesis Mini                                                │
│                                                                                 │
│  CORE 0 │ netTask   (prio 2, 300 ms) ──────────┐   Wi-Fi stack lives here       │
│  ───────┼──────────────────────────────────────┤                                │
│  CORE 1 │ audioTask (prio 3) I²S0 PDM→FFT ─────┼──▶ xQueueSend(g_hapticQ)       │
│         │ loop()    (prio 1) ToF 50 Hz, button ┘         │                       │
│         │ hapticTask(prio 5, 10 ms vTaskDelayUntil) ◀────┘                       │
│         │        arbitration → sequencer → LEDC                                 │
│         │              ├── LEDC ch0 → GPIO3   (Port 1 · IO1)                    │
│         │              └── LEDC ch1 → GPIO16  (Port 3 · IO1)                    │
│         │                            │                                          │
│         │                            ▼ 220 Ω → MMBTA42 NPN → ERM (1N4001 fly-   │
│         │                              back, 0.1 µF bulk, 3V3 rail)             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Per-hop latency budget

**Stage 1 — prop raised → BUS ARRIVING buzzes on the wrist.**

| # | Hop | Estimate | Source of estimate |
|---|---|---|---|
| 1 | Prop enters frame → next capture tick | 0–500 ms (mean **250**) | 2 Hz cadence, Track 2 §Stage 0 |
| 2 | JPEG encode 1280×720 q85 | ~**10 ms** | typical `cv2.imencode` on a modern laptop CPU |
| 3 | Laptop → Modal HTTPS POST, ~120 kB | 80–250 ms (mean **150**) | Track 2's "~100–300 ms on venue wifi" |
| 4 | YOLO26n forward pass, warm T4 | **10–30 ms** | Ultralytics' published 377.8 ms is the **CPU** figure; a nano model on T4 is ~10 ms |
| 5 | Debounce `HITS_TO_ARRIVE = 2` @ 2 Hz | +**500 ms** | Track 2's state machine, deliberate |
| 6 | Modal → laptop response (small JSON) | 30–80 ms (mean **50**) | same link, ~200 B |
| 7 | Laptop → Vercel `POST /api/event` | 60–150 ms (mean **100**) | Vercel edge + function cold-path |
| 8 | Redis `MSET` + `INCR` | 20–60 ms (mean **40**) | two Upstash REST round trips, `redis.ts:27-29` |
| 9 | ESP32 poll wait | 0–300 ms (mean **150**) | our chosen cadence |
| 10 | `POST /api/pull` round trip, TLS keep-alive | 50–200 ms (mean **120**) | one TLS record each way over an established session |
| 11 | ArduinoJson parse + enum map + `xQueueSend` | <**2 ms** | ~200 B document |
| 12 | Queue → first motor edge | 0–10 ms (mean **5**) | 10 ms sequencer tick |
| | **TOTAL** | **0.76 – 2.09 s · mean ≈ 1.38 s** | |

**Stage 2 — … → first digit element of ROUTE NUMBER.**

| # | Hop | Estimate | Source |
|---|---|---|---|
| 13 | 3 × Claude vision calls, **run concurrently** | **1.5 – 3.0 s** | Track 2: latency unpublished, "Moderate" for Opus 4.8. Concurrency makes wall-clock ≈ one call. **Sequential would be 4.5–9.0 s — see R4.** |
| 14 | Vote + gate, in-process | <1 ms | Track 2 Stage 4 |
| 15 | Laptop notices `reading_ready` on its next 500 ms poll | 0–500 ms (mean **250**) | 2 Hz |
| 16 | `/api/event` → Redis → ESP32 poll → parse (hops 7–12) | 130–560 ms (mean **415**) | as above |
| | **prop raised → first digit** | **2.4 – 6.2 s · mean ≈ 3.8 s** | |
| 17 | P6 delivers route "88" | **6.4 s** | corrected arithmetic, §Open Risk R6 |
| | **prop raised → number fully delivered** | **8.8 – 12.6 s** | |

Against a 15–30 s bus dwell this is **real but not generous**, exactly as Track 3's R12 says — and
0.8 s tighter than Track 3 computed, because P6 is 6.4 s not 5.6 s. **The two levers, in order:**
(a) make the three Claude votes concurrent (saves 3–6 s — do this first, it is 4 lines);
(b) drop the P6 terminator bracket (saves 1.1 s).

---

## JSON Data Contracts

Four contracts. Two are Track 2's and are adopted **unchanged**. Two are new.

### Contract A — laptop → Modal (Track 2, unchanged)

```jsonc
// POST https://<workspace>--bus-vision-ingest.modal.run
{ "frame_b64": "/9j/4AAQSkZJRgABAQAAAQ…9k=" }        // ~120 kB base64 of a 1280×720 q85 JPEG
```
```jsonc
// 200 response
{ "event": "BUS_ARRIVED",        // "NONE" | "BUS_ARRIVED" | "BUS_GONE"
  "present": true,
  "confidence": 0.83,            // float, best bus-box conf this frame
  "arrival_id": 1,               // increments once per arrival — the fire-once latch
  "reading": null,               // null until Claude answers
  "reading_ready": false }
```

### Contract B — laptop → Vercel (**new**)

The laptop is the only component that understands *both* the detector's vocabulary and the
device's. It translates, and it POSTs **only on change** — the relay is edge-triggered, so
re-posting an unchanged state would re-fire the haptic.

```ts
// app/app/lib/contract.ts  — REPLACES the braille Mode/PullResponse/Choice types
export type PatternId =
  | "NONE"      // no active command
  | "READY"     // P0  boot complete
  | "DANGER"    // P1  confirmed siren, amplitude rising      (device-local; never sent)
  | "SIREN"     // P2  confirmed siren, flat/falling          (device-local; never sent)
  | "ATTENTION" // P3  Tier-2a band-energy alert              (device-local; never sent)
  | "BUS"       // P5  bus arriving
  | "NUMBER"    // P6  route number — uses `route`
  | "WAIT"      // P7  request in flight
  | "UNKNOWN"   // P8  could not read / low confidence
  | "ACK"       // P9  button feedback                        (device-local; never sent)
  | "ERROR";    // P10 degraded

/** Cloud-originated commands only. The four acoustic/local patterns never cross the wire. */
export type CloudPattern = "NONE" | "BUS" | "NUMBER" | "WAIT" | "UNKNOWN" | "ERROR";

export interface EventRequest {
  pattern:   CloudPattern;
  route:     string;                    // "" unless pattern === "NUMBER"
  dest:      string;                    // debug screen ONLY — the device ignores this field
  conf:      "high" | "low" | "";
  arrivalId: number;
}

export interface DeviceCommand {
  seq:       number;                    // monotonic; the device's edge-trigger
  pattern:   CloudPattern;
  route:     string;
  dest:      string;
  conf:      "high" | "low" | "";
  arrivalId: number;
  ts:        number;                    // ms epoch of the server write — staleness check
}

/** Route numbers longer than this cannot be delivered inside a bus dwell. */
export const ROUTE_MAX_DIGITS = 3;
/** Quinary encoding covers digits only. A route containing a letter is rejected server-side. */
export const ROUTE_RE = /^[0-9]{1,3}$/;
```

**Worked example — the locked demo, in order.**

```jsonc
// t = 0.0 s  laptop → POST /api/event      (YOLO latched arrival_id 1)
{ "pattern":"BUS", "route":"", "dest":"", "conf":"", "arrivalId":1 }
// ← 200 {"seq":7}

// t = 0.1 s  laptop → POST /api/event      (Claude in flight)
{ "pattern":"WAIT", "route":"", "dest":"", "conf":"", "arrivalId":1 }
// ← 200 {"seq":8}

// t = 2.6 s  laptop → POST /api/event      (3 votes agreed on "88")
{ "pattern":"NUMBER", "route":"88", "dest":"Clapham Common", "conf":"high", "arrivalId":1 }
// ← 200 {"seq":9}
```

```jsonc
// ESP32 → POST /api/pull   every 300 ms.  Request body = telemetry for the debug screen.
{ "bandRms":312.4, "peakHz":940, "modIdx":0.62, "trend":"rising",
  "playing":"NUMBER", "tofMm":842, "upMs":93000, "rssi":-58 }

// ← 200 response = the command.  108 bytes on the wire.
{ "seq":9, "pattern":"NUMBER", "route":"88", "dest":"Clapham Common",
  "conf":"high", "arrivalId":1, "ts":1784419200123 }
```

`GET /api/pull` is **also** implemented (same handler, empty telemetry) purely so the endpoint stays
`curl`-able — that is how the existing relay was smoke-tested and it is worth six extra lines.

### Contract C — what the ESP32 actually holds

`ArduinoJson` **is already a dependency**: `platformio.ini:42`, pinned `bblanchon/ArduinoJson@^7.4.3`,
and `net.cpp:50` already uses the v7 elastic `JsonDocument`. **No new library, no version change.**

```c
// net.h  — REPLACES `struct PullResult` (net.h:10-15)
enum : uint8_t { PAT_NONE=0, PAT_READY, PAT_DANGER, PAT_SIREN, PAT_ATTENTION,
                 PAT_BUS, PAT_NUMBER, PAT_WAIT, PAT_UNKNOWN, PAT_ACK, PAT_ERROR };
enum : uint8_t { CONF_NONE = 0, CONF_LOW, CONF_HIGH };

struct DeviceCommand {
    long    seq       = 0;
    uint8_t pattern   = PAT_NONE;   // string → enum ONCE, at parse time
    char    route[8]  = {0};        // "88" · "205" · longest UK route "N550" is 4 chars
    uint8_t conf      = CONF_NONE;
    long    arrivalId = 0;
};                                  // sizeof == 24 bytes.  No String. No vector. No heap.
```

**Three deliberate RAM decisions:**

1. **`dest` is parsed and discarded.** The destination text exists for the debug screen. The LCD is
   gone from the BOM, so the device has nothing to display it on. Never store it.
2. **`pattern` becomes a `uint8_t` at parse time.** The old `PullResult` kept `String mode`
   (`net.h:12`) and compared it with `pr.mode == "forward"` (`braille_wearable.cpp:100`) — a heap
   allocation and a `strcmp` on every poll, 3× per second, forever.
3. **`route` is a fixed `char[8]`.** The old code's `std::vector<String> replies` (`net.h:14`)
   allocated on every poll that carried replies. Fixed arrays cannot fragment the heap.

**Buffer sizing.** ArduinoJson v7's `JsonDocument` is elastic and needs no compile-time size, which
is why `net.cpp:50` is already correct. Two guards belong in the new code:

```c
static const size_t PULL_BODY_MAX = 512;   // reject anything larger BEFORE parsing
// measured: the 108-byte response above deserialises into ~230 bytes of v7 pool.
// If anyone reverts to ArduinoJson v6, the equivalent is StaticJsonDocument<512>.
```

### Contract D — debug screen (**new**)

```jsonc
// GET /api/state   — browser only, ~700 B, polled at 500 ms by the Next.js page
{ "seq": 9,
  "device":   { "pattern":"NUMBER","route":"88","conf":"high","arrivalId":1,"ts":1784419200123 },
  "detector": { "event":"NONE","present":true,"confidence":0.85,"arrivalId":1 },
  "claude":   { "route":"88","destination":"Clapham Common","confidence":"high",
                "votes":["88","88","88"] },
  "acoustic": { "bandRms":312.4,"peakHz":940,"modIdx":0.62,"trend":"rising","tier":"2b" },
  "device_health": { "tofMm":842,"upMs":93000,"rssi":-58,"lastSeenMs":214 } }
```

`acoustic` and `device_health` are the ESP32's own telemetry, written to Redis by `/api/pull` on
each poll. **This is what makes the siren tier visible to an audience** — without it, the FFT is
invisible and the judges have to take the buzz on faith.

---

## Firmware Concurrency Model

### Decision: **four FreeRTOS tasks, not a superloop.** Locked.

A superloop is the right default for a 1.5-day build and I considered it seriously. It loses here
for one reason that is not negotiable: **`i2s_channel_read()` and `HTTPClient` TLS both block, and
the haptic tick cannot tolerate either.**

| Requirement | Superloop | Tasks |
|---|---|---|
| `i2s_channel_read()` blocks until the DMA buffer fills | must poll with `timeout=0` → busy-spin or dropped frames | a task blocks on it and is rate-limited for free |
| TLS poll takes 50–200 ms (800 ms on a cold handshake) | stalls **everything** for that long | isolated on Core 0 |
| Haptic tick jitter | = worst-case loop body ≈ 200 ms | ≈ **<1 ms** at the highest priority |
| Track 3: *"timing carries all semantic load"* | ✗ unacceptable | ✓ |
| Wi-Fi ISR jitter vs FFT | unavoidable | FFT pinned to Core 1, Wi-Fi is on Core 0 |
| Cost to write | 0 | ~30 lines of `xTaskCreatePinnedToCore` |

Arduino-ESP32 already runs FreeRTOS — `loop()` *is* a task (`loopTask`, priority 1, Core 1 by
default). We are not adding an RTOS; we are naming three more tasks in a system that already has
twenty.

### Task table

| Task | Core | Prio | Period | Stack (bytes) | Blocks on | Owns |
|---|---|---|---|---|---|---|
| `hapticTask` | 1 | **5** | `vTaskDelayUntil` 10 ms | 4096 | queue receive (0 timeout) | both LEDC channels, arbitration, queue, sequencer |
| `audioTask` | 1 | 3 | ~32 ms | 8192 | `i2s_channel_read()` | I²S0, FFT buffers, siren state |
| `netTask` | **0** | 2 | 300 ms | **12288** | TLS socket | `WiFiClientSecure`, `HTTPClient`, JSON |
| `loop()` | 1 | 1 | 10 ms | (default 8192) | nothing | ToF I²C, onboard button |

**Why these numbers:**

- **`netTask` stack = 12 KB.** mbedTLS handshake plus `HTTPClient` plus ArduinoJson is the single
  most common stack-overflow crash on ESP32. 12 KB is the safe figure; 4 KB will crash
  intermittently and look like a network bug.
- **`hapticTask` at priority 5** — above everything else we create. It runs for ~50 µs per 10 ms
  tick. Starving it is impossible; being starved *by* it is impossible.
- **`netTask` on Core 0** because the Wi-Fi/LWIP stack already lives there (priority 22–23); keeping
  the socket on the same core avoids cross-core cache traffic. Wi-Fi will preempt `netTask` freely,
  which is correct and harmless.
- **`audioTask` on Core 1** specifically to keep the FFT away from Wi-Fi interrupt jitter.
- **`loop()` stays** because ToF and button are cheap and non-blocking, and leaving Arduino's
  `loop()` doing something keeps the sketch recognisable.

### Loading

| Task | Work per period | Period | Load |
|---|---|---|---|
| `hapticTask` | ~50 µs (interp + 2 `ledcWrite`) | 10 ms | **0.5 % C1** |
| `audioTask` | int16→float + Hann 0.20 ms, FFT 0.19–0.80 ms, features 0.05 ms | 32 ms | **1.4 – 3.3 % C1** |
| `loop()` ToF | `isRangeComplete()` + `readRangeResult()` ≈ 0.5 ms @ 400 kHz I²C | 20 ms | **2.5 % C1** |
| **Core 1 total** | | | **≈ 4.4 – 6.3 %** |
| `netTask` | ~10 ms CPU (TLS record + JSON); the rest is socket wait | 300 ms | **≈ 3 % C0** |
| Wi-Fi stack | | | 5–15 % C0 |
| **Core 0 total** | | | **≈ 8 – 18 %** |

**Headroom is not the issue in this design and never will be.** Both cores sit under 20 %. The
risk is blocking, not throughput — which is exactly why the task split exists.

> **Note on Track 3's estimate.** Track 3 §Resource budget puts ToF at "~15 % of Core 0". That is
> correct at **100 kHz** I²C. Calling `Wire.setClock(400000)` — the VL53L0X supports 400 kHz Fast
> Mode — cuts it to ~2.5 %. One line, 4× saving. No disagreement, just a cheap improvement.

### Synchronisation — one queue, no mutex

Track 3's sketch proposes *"a mutex on the active-pattern pointer"*. **A queue removes the mutex
entirely**, which is strictly better: only `hapticTask` ever touches the player state, so there is
nothing to protect.

```c
// haptic.h
struct HapRequest {
    uint8_t  pattern;          // PAT_* enum
    char     route[8];         // populated only for PAT_NUMBER
    uint32_t postedMs;         // millis() at post — used for the 10 s queue TTL
};
extern QueueHandle_t g_hapticQ;    // xQueueCreate(4, sizeof(HapRequest))
```

Producers: `audioTask` (P1/P2/P3), `netTask` (P5/P6/P7/P8/P10), `loop()` (P4/P9).
Consumer: `hapticTask`, exclusively. **All arbitration lives inside `hapticTask`.**

The only genuinely shared state is telemetry for the debug screen. One spinlock, one struct copy:

```c
static portMUX_TYPE s_tlmMux = portMUX_INITIALIZER_UNLOCKED;
static Telemetry    s_tlm;                              // ~32 bytes

void tlmSet(const Telemetry &t) { portENTER_CRITICAL(&s_tlmMux); s_tlm = t;
                                  portEXIT_CRITICAL(&s_tlmMux); }
void tlmGet(Telemetry &out)     { portENTER_CRITICAL(&s_tlmMux); out = s_tlm;
                                  portEXIT_CRITICAL(&s_tlmMux); }
```

### The non-blocking pattern sequencer

**This is the section that decides whether the firmware works.** The existing `braille.cpp` is the
exact anti-pattern: `beat()` at `braille.cpp:19-30` calls `delay(STAGGER)` and `delay(BUZZ)`;
`buzzLetter()` at `braille.cpp:33-37` adds `delay(GAP_BEAT)`; `buzzWord()` at `braille.cpp:40-51`
adds `delay(GAP_LETTER)` and `delay(GAP_WORD)`. `braille_wearable.cpp:105` calls `buzzWord()`
synchronously from `loop()`. **Buzzing a 15-character keyword blocks the entire MCU for up to ~48 s**
(the superseded plan's own figure, `plan/2026-07-17-…:23`). During that window there is no ToF, no
FFT, no button, no network. It is not adaptable — there is no state machine to adapt.

#### Data model

```c
// haptic.h  —  6 bytes per step; the whole vocabulary is <1.5 kB of const flash.
#include <stdint.h>

enum : uint8_t { M_NONE = 0, M_A = 1, M_B = 2, M_BOTH = 3 };

/** One timed step. `duty0 == duty1` is a flat step; differing values ramp linearly. */
struct HapStep {
    uint8_t  mask;     // M_NONE | M_A | M_B | M_BOTH
    uint8_t  duty0;    // 0..100 %, duty at the START of the step
    uint8_t  duty1;    // 0..100 %, duty at the END  of the step
    uint16_t ms;       // duration; MUST be a multiple of TICK_MS
};

/** Priority class. LOWER NUMBER = HIGHER PRIORITY (Track 3 §Severity Arbitration). */
enum : uint8_t { CLS_SAFETY = 0, CLS_HAZARD, CLS_ALERT,
                 CLS_INFORMATION, CLS_FEEDBACK, CLS_STATUS };

struct HapPattern {
    const HapStep *steps;
    uint8_t  nSteps;
    uint8_t  cls;
    uint8_t  repeats;        // 1 = play once
    uint16_t repeatGapMs;
    uint8_t  id;             // PAT_* — for logging, dedup and telemetry
    bool     queueable;      // Track 3 rule 4
};
```

`duty1` is the one field beyond Track 3's sketch, and it earns its two bytes: it expresses P0's
ramp-up, P8's fade-out and P5's ascending envelope in **one row each** instead of a staircase.

#### Static tables — three of the eleven, to show the shape

```c
// P1 DANGER — (200 on / 150 off) ×5, then a 500 ms sustained tail.
static const HapStep P1_DANGER[] = {
    {M_BOTH,100,100,200},{M_NONE,0,0,150},{M_BOTH,100,100,200},{M_NONE,0,0,150},
    {M_BOTH,100,100,200},{M_NONE,0,0,150},{M_BOTH,100,100,200},{M_NONE,0,0,150},
    {M_BOTH,100,100,200},{M_NONE,0,0,150},{M_BOTH,100,100,500},
};
// P3 ATTENTION — one 250 ms full-power pulse. The Tier-2a fast alert.
static const HapStep P3_ATTENTION[] = { {M_BOTH,100,100,250} };
// P8 UNKNOWN — one 900 ms pulse fading 100 → 0 %. The inverse of P5's ascent.
static const HapStep P8_UNKNOWN[]   = { {M_BOTH,100,0,900} };

static const HapPattern PATTERNS[] = {
  /* …                       steps          n  cls               rpt gap   id          queue */
  { P1_DANGER,   11, CLS_SAFETY,      4, 3000, PAT_DANGER,    false },
  { P3_ATTENTION, 1, CLS_SAFETY,      1,    0, PAT_ATTENTION, false },
  { P8_UNKNOWN,   1, CLS_INFORMATION, 1,    0, PAT_UNKNOWN,   true  },
  /* P0 P2 P4 P5 P7 P9 P10 follow the same shape — see Track 3 §Locked Gesture Vocabulary */
};
```

#### P6 ROUTE NUMBER — built at runtime, quinary long/short

Track 3's quinary encoding (LONG = 5, SHORT = 1, `LONG LONG` = zero) cannot be a static table
because the route arrives at runtime. It is composed into a static buffer — **no heap**.

```c
// haptic_route.cpp
static const uint16_t SHORT_MS = 150, LONG_MS = 500;
static const uint16_t INTRA_GAP_MS = 250, INTER_GAP_MS = 800;   // 800 = the proven constant
static const uint16_t BRACKET_MS = 500, BRACKET_GAP_MS = 600;
static const uint8_t  DUTY_FULL = 100, DUTY_MED = 65;

// worst case "999": 2 (preamble) + 2×15 (elements) + 1 (terminator) = 33 steps.
static const uint8_t MAX_ROUTE_STEPS = 40;                       // 40 × 6 B = 240 B
static HapStep    s_routeSteps[MAX_ROUTE_STEPS];
static HapPattern s_routePattern;

static bool push(uint8_t &n, uint8_t mask, uint8_t d0, uint8_t d1, uint16_t ms) {
    if (n >= MAX_ROUTE_STEPS) return false;
    s_routeSteps[n++] = HapStep{mask, d0, d1, ms};
    return true;
}

/** Compose P6 for `route`. Returns false if unencodable — caller then fires P8 UNKNOWN. */
bool buildRoutePattern(const char *route) {
    const size_t len = strlen(route);
    if (len == 0 || len > 3) return false;

    uint8_t n = 0;
    push(n, M_BOTH, 0, DUTY_MED, BRACKET_MS);        // preamble: ramp 0→65 %
    push(n, M_NONE, 0, 0,        BRACKET_GAP_MS);

    for (size_t i = 0; i < len; i++) {
        const char c = route[i];
        if (c < '0' || c > '9') return false;         // letters are unencodable — see R7
        const uint8_t d = (uint8_t)(c - '0');
        // Quinary: digit d = (d/5) LONGs then (d%5) SHORTs.
        // d/5 <= 1 for every digit, so "LONG LONG" is a free codepoint → assign it to zero.
        const uint8_t longs  = (d == 0) ? 2 : (uint8_t)(d / 5);
        const uint8_t shorts = (d == 0) ? 0 : (uint8_t)(d % 5);

        for (uint8_t k = 0; k < longs; k++) {
            if (!push(n, M_BOTH, DUTY_FULL, DUTY_FULL, LONG_MS))  return false;
            if (!push(n, M_NONE, 0, 0, INTRA_GAP_MS))             return false;
        }
        for (uint8_t k = 0; k < shorts; k++) {
            if (!push(n, M_BOTH, DUTY_FULL, DUTY_FULL, SHORT_MS)) return false;
            if (!push(n, M_NONE, 0, 0, INTRA_GAP_MS))             return false;
        }
        if (i + 1 < len) s_routeSteps[n - 1].ms = INTER_GAP_MS;   // promote the trailing gap
    }

    s_routeSteps[n - 1].ms = BRACKET_GAP_MS;                       // terminator silence
    push(n, M_BOTH, DUTY_MED, DUTY_MED, BRACKET_MS);               // terminator tone

    s_routePattern = HapPattern{ s_routeSteps, n, CLS_INFORMATION, 1, 0, PAT_NUMBER, true };
    return true;
}
```

For `"88"` this emits **19 steps** totalling **6400 ms** (arithmetic in §Open Risk R6).

#### The tick — the whole engine

```c
// haptic.cpp
static const uint16_t TICK_MS       = 10;    // sequencer granularity
static const uint16_t KICK_MS       = 30;    // overdrive: 100 % for the first 30 ms of an onset
static const uint16_t CLEAR_GAP_MS  = 150;   // mandatory gap on preemption (Track 3 rule 2)
static const uint32_t QUEUE_TTL_MS  = 10000; // Track 3 rule 6

struct HapPlayer {
    const HapPattern *pat = nullptr;
    uint8_t  stepIdx = 0, repeatIdx = 0;
    uint16_t stepElapsed = 0;
    bool     inRepeatGap = false;
};
static HapPlayer   s_play;
static int16_t     s_clearGap = 0;
static HapRequest  s_pendingAfterGap;   static bool s_hasPending = false;
static HapRequest  s_queue[2];          static uint8_t s_qLen = 0;   // depth 2, Track 3 rule 3

static inline uint8_t pctToDuty(uint8_t pct) { return (uint8_t)((pct * 255u + 50u) / 100u); }

static void motorWrite(uint8_t mask, uint8_t pct) {
    const uint8_t d = pctToDuty(pct);
    ledcWriteCompat(MOTOR_A_PIN, (mask & M_A) ? d : 0);
    ledcWriteCompat(MOTOR_B_PIN, (mask & M_B) ? d : 0);
}

/** Called every TICK_MS from hapticTask. Never blocks. Never allocates. */
void hapticTick(void) {
    // ---- 1. mandatory clearing gap after a preemption -----------------------
    if (s_clearGap > 0) {
        s_clearGap -= TICK_MS;
        motorWrite(M_NONE, 0);
        if (s_clearGap <= 0 && s_hasPending) { startRequest(s_pendingAfterGap);
                                               s_hasPending = false; }
        return;
    }

    // ---- 2. idle: drain the queue (honouring TTL) ---------------------------
    if (s_play.pat == nullptr) {
        motorWrite(M_NONE, 0);
        while (s_qLen > 0) {
            HapRequest r = s_queue[0];
            s_qLen--; for (uint8_t i = 0; i < s_qLen; i++) s_queue[i] = s_queue[i + 1];
            if (millis() - r.postedMs <= QUEUE_TTL_MS) { startRequest(r); break; }
            // else: silently discarded — a stale route number is dangerous (Track 3 rule 6)
        }
        return;
    }

    const HapStep &st = s_play.pat->steps[s_play.stepIdx];

    // ---- 3. duty for this tick: linear ramp, then the overdrive kick --------
    uint8_t duty = st.duty0;
    if (st.duty1 != st.duty0 && st.ms > 0) {
        duty = (uint8_t)((int32_t)st.duty0
             + ((int32_t)st.duty1 - (int32_t)st.duty0) * (int32_t)s_play.stepElapsed
               / (int32_t)st.ms);
    }
    // Stiction: an ERM will not reliably START below ~55 % duty. Drive 100 % for KICK_MS,
    // then fall to target. A RUNNING motor sustains well below its start voltage.
    if (st.mask != M_NONE && s_play.stepElapsed < KICK_MS && duty < 100) duty = 100;

    motorWrite(st.mask, duty);

    // ---- 4. advance ---------------------------------------------------------
    s_play.stepElapsed += TICK_MS;
    if (s_play.stepElapsed < st.ms) return;
    s_play.stepElapsed = 0;

    if (++s_play.stepIdx < s_play.pat->nSteps) return;
    s_play.stepIdx = 0;

    if (++s_play.repeatIdx < s_play.pat->repeats) {
        if (s_play.pat->repeatGapMs) {           // insert the inter-repeat silence
            s_clearGap = (int16_t)s_play.pat->repeatGapMs;
        }
        return;
    }
    s_play.pat = nullptr;                        // pattern complete → idle
}
```

#### Preemption — the mechanism

Track 3 defines *which* pattern wins. This is *how* the win is enforced. The entire mechanism is
**one comparison and one pointer store** — there is no unwinding, no partial state, nothing to
clean up, because a pattern's only state is `{stepIdx, repeatIdx, stepElapsed}`.

```c
/** Called from hapticTask when a HapRequest arrives on g_hapticQ. */
static void hapticSubmit(const HapRequest &req) {
    const HapPattern *incoming = patternFor(req);          // resolves PAT_NUMBER via buildRoutePattern
    if (incoming == nullptr) return;

    if (s_play.pat == nullptr && s_clearGap <= 0) { startRequest(req); return; }

    const uint8_t activeCls = (s_play.pat != nullptr) ? s_play.pat->cls
                                                      : CLS_STATUS;

    // Track 3 rule 7: P1 DANGER is uninterruptible except by a newer P1.
    if (s_play.pat && s_play.pat->id == PAT_DANGER && incoming->id != PAT_DANGER) {
        if (incoming->queueable) enqueue(req);
        return;
    }

    if (incoming->cls < activeCls) {                        // STRICTLY higher priority → preempt
        s_play.pat      = nullptr;                          // abort at this tick (rule 1)
        s_clearGap      = CLEAR_GAP_MS;                     // rule 2: legibility, not correctness
        s_pendingAfterGap = req;
        s_hasPending    = true;
        return;
    }

    // Rule 3: equal or lower class never preempts.
    if (incoming->queueable) enqueue(req);                  // rule 5: restarts from step 0, never resumes
    // else: dropped.
}
```

**Rule 5 falls out for free.** A queued pattern restarts from `stepIdx = 0` because
`startRequest()` zeroes the player. Track 3's justification is worth restating because it is the
strongest safety argument in the firmware: *resuming mid-digit produces a plausible wrong number*,
which is the single worst output this device can make.

**P4 PROXIMITY is a state, not a message** (Track 3 rule 4). It is therefore *not* queued — `loop()`
simply re-posts it every 100 ms while the ToF condition holds, and it naturally resumes when the
channel frees. Zero extra machinery.

#### Why 10 ms, and what the jitter actually is

Track 3 notes that with no spatial channel, **rhythm and duration carry all the semantic load** —
so timing jitter is what degrades meaning. Quantifying it:

- Every element in the vocabulary is a multiple of 50 ms; the shortest is **SHORT = 150 ms**.
- A 10 ms tick quantises each edge to ±10 ms worst case = **±6.7 % of a SHORT**.
- The duration JND for vibrotactile stimuli is ~20–25 % (Track 3 §Discriminability). 6.7 % is
  **3–4× inside** it.
- `vTaskDelayUntil` is drift-free by construction: it schedules against an absolute wake time, so
  errors do not accumulate over a 6.4 s route delivery.
- Jitter from preemption by higher-priority tasks: only Wi-Fi (Core 0) and the I²S ISR outrank us,
  and `hapticTask` is on Core 1 at priority 5. Measured jitter should be **<1 ms**.

A 5 ms tick would halve the quantisation for double the (already negligible) CPU. **It is not
needed** — 6.7 % against a 20 % JND has no perceptual consequence, and 10 ms divides every constant
in the vocabulary exactly, including the 30 ms kick.

---

## Motor Drive Electrical Findings

### ⚠ FINDING 1 — the motor GPIOs in `pins.h` are wrong. This is the highest-value item in this document.

`firmware/braille_wearable/src/pins.h:9-10` declares:

```c
#define MOTOR_L    4    // Port 1 IO0 — left Braille column (Motor A)
#define MOTOR_R    9    // Port 3 IO0 — right Braille column (Motor B, diagonal)
```

**Both are the IO0 pins. The AX22-0013 ERM module leaves IO0 Not Connected and drives from IO1.**

Two independent primary sources in this repository agree:

**(a) The module schematic** — `parts/Vibration Motor (ERM)/vibration-motor-erm/files/SCH_AX22-0013.pdf`
(rendered and read 2026-07-18). The AX22 connector symbol carries net labels `IO0` on pin 3, `IO1`
on pin 4, `IO2` on pin 5. The wire entering `R1` (220 Ω) → base of `Q1` is labelled **`IO1`**.
Pins 3 and 5 go nowhere.

**(b) The module pinout image** — `parts/Vibration Motor (ERM)/vibration-motor-erm/images/pinout/Pins-0013.png`.
Header pins top-to-bottom: `G` (Ground) · `Vin` · **`N.C`** · **`D` (Data)** · `N.C`. Mapping to the
connector order (pin 1 GND, 2 Vcc, 3 IO0, 4 IO1, 5 IO2): **IO0 = N.C., IO1 = Data.**

**Cross-referenced against the board** — `parts/Axiometa Genesis Mini - Starter Kit/axiometa-genesis-mini/files/SCH_MTX0013.pdf`
(read 2026-07-18). All four AX22 connectors: pin 1 → GND, pin 2 → **+3V3**, and pins 3/4/5 →
U1 `IO4/IO3/IO2` · U2 `IO7/IO6/IO5` · U3 `IO9/IO16/IO15` · U4 `IO1/IO17/IO18`. This confirms the
locked port map exactly.

**Therefore:**

```c
// pins.h — CORRECTED
#define MOTOR_A_PIN   3    // Port 1 · IO1 · connector pin 4   (was: 4 = IO0 = N.C.)
#define MOTOR_B_PIN  16    // Port 3 · IO1 · connector pin 4   (was: 9 = IO0 = N.C.)
```

**Where the error came from, and why nobody caught it.** `audit/speech-to-braille-wearable/03-track-3-parts-truth.md:311`
states the ERM's *"Data line is pin 3/GPIO4, and its unused pin-4/GPIO3 just floats"*, and `:330`
repeats *"the port's pin-3 'Data' line, e.g. GPIO4 on Port 1"* — both citing `[ERM pins]`, i.e. the
very pinout image that shows pin 3 as `N.C.` **The earlier audit misread its own cited source.** It
was never caught because `audit/…/33-phase5-deploy-smoke.md` §5 records, verbatim:
*"Firmware is compile-verified only — no physical board attached here… Motor/LCD/WiFi runtime
behavior is untested against hardware."* **With the wrong pins, the motors would simply never have
moved, and the failure would have looked like a dead module.**

**Secondary consequence — the strapping-pin argument inverts.** Audit 03 §7.5 chose Port 1 for an
ERM *precisely because* it believed GPIO3 (an ESP32-S3 strapping pin, JTAG source select) would be
left floating. In reality the ERM drives exactly that pin. This is **still safe**, for two
independent reasons: (i) GPIO3 is only sampled at reset when the `EFUSE_STRAP_JTAG_SEL` eFuse is
burned to 1, and its factory default is 0, so GPIO3 is ignored at boot; (ii) `R2` (3 kΩ) on the
module holds the net near ground while the GPIO is high-Z during reset, which is a defined, benign
level. **Verify once with `espefuse.py summary | grep -i jtag` and move on.**

### FINDING 2 — the module provides a complete driver. Direct GPIO drive is correct, and PWM is safe.

From the schematic, the full circuit is:

```
 AX22 pin 4 (IO1) ──[ R1 220 Ω ]──┬── B  Q1 = MMBTA42 (NPN BJT)
                                  │      E ── GND
                            [ R2 3 kΩ ]
                                  │
                                 GND
                                        C ──┬── J3 pin 2 ── motor M−
                                            │
 +3V3 (AX22 pin 2) ── J3 pin 1 ── motor M+ ─┴── D1 1N4001 (flyback, cathode to +3V3)
                                            └── C1 0.1 µF (bulk / EMI)
```

**Saturation check** (Vbe(sat) ≈ 0.9 V at this current):

| Quantity | Arithmetic | Value |
|---|---|---|
| Current through R1 | (3.3 − 0.9) / 220 | 10.9 mA |
| Current shunted by R2 | 0.9 / 3000 | 0.30 mA |
| Base current I_B | 10.9 − 0.30 | **10.6 mA** |
| Required β at I_C = 90 mA | 90 / 10.6 | **8.5** |
| MMBTA42 h_FE (min, I_C = 10 mA) | datasheet | **40** |

**Verdict: saturates with ≈5× margin.** No external transistor, no flyback diode, no gate resistor
is needed or wanted. GPIO source current is 10.9 mA per motor (21.8 mA with both on, from two
separate pads) — within ESP32-S3 pad capability.

> **One correction to the vendor copy.** `part.json` and `CONTENT.md` both describe *"a low-R MOSFET
> driver"* and *"On-board N-channel MOSFET driver"*. The schematic shows **Q1 = MMBTA42, an NPN
> bipolar transistor**, not a MOSFET. This is not a defect — a BJT low-side switch is entirely
> appropriate here — but it is why the PWM frequency recommendation below is 20 kHz rather than the
> 100 kHz+ a MOSFET would tolerate: a saturated BJT has storage-time-limited turn-off.

### FINDING 3 — LEDC configuration

**The ESP32-S3 has 8 LEDC channels and 4 timers, not the ESP32's 16.** Verbatim from the ESP32-S3
Technical Reference Manual v1.8 §35.2: *"Eight independent PWM generators (i.e., eight channels) …
Four independent timers … Maximum PWM resolution: 14 bits"*, corroborated by `soc_caps.h`
(`SOC_LEDC_CHANNEL_NUM (4→8)`, `SOC_LEDC_TIMER_NUM (4)`, `SOC_LEDC_TIMER_BIT_WIDTH (14)`).
`SOC_LEDC_SUPPORT_HS_MODE` is **absent** on S3 — low-speed mode only. **We need 2 of 8. Not a
constraint.**

| Parameter | Value | Justification |
|---|---|---|
| Frequency | **20 000 Hz** | Above the audible band, so no PWM whine adds to the ERM's own acoustic signature. Precision Microdrives AB-012 states *"The frequency of the PWM signal is usually around 20 kHz or higher"* — see the honesty note below. |
| Resolution | **8 bits** (0–255) | Max at 20 kHz on APB_CLK is `floor(log2(80e6 / 20e3))` = `floor(11.97)` = **11 bits**. 8 is well inside, and the ERM has ~2 perceptually usable levels — extra bits buy nothing. |
| Channels | 0 (Motor A), 1 (Motor B) | 8 available |
| Duty map | `duty = (pct × 255 + 50) / 100` | integer, rounds-to-nearest |

**Honesty note on the 20 kHz figure.** AB-012's mention is an aside inside a paragraph about EMI
capacitor sizing, not a recommendation with supporting data. **Precision Microdrives publishes no
ERM PWM-frequency recommendation with justification, and nothing linking PWM frequency to audible
whine.** AB-022, which sounds relevant, is about a *brushed DC gearmotor* for linear motion and
never mentions vibration motors. 20 kHz is sound engineering convention that happens to match
AB-012's aside — **cite it as convention, not as a vendor recommendation.**

**Cross-version LEDC API.** `platformio.ini` carries two device environments and the LEDC API is
**mutually exclusive** between them — `ledcSetup`/`ledcAttachPin` were *removed* in Arduino 3.x and
replaced with pin-based calls. Guard it:

```c
static inline void ledcInitCompat(uint8_t pin, uint8_t ch) {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
    (void)ch; ledcAttach(pin, 20000, 8);              // 3.x: pin-based, channel auto-allocated
#else
    ledcSetup(ch, 20000, 8); ledcAttachPin(pin, ch);  // 2.0.17: channel-based
#endif
}
static inline void ledcWriteCompat(uint8_t pin, uint32_t duty) {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
    ledcWrite(pin, duty);                             // 3.x indexes by PIN
#else
    ledcWrite(pin == MOTOR_A_PIN ? 0 : 1, duty);      // 2.0.17 indexes by CHANNEL
#endif
}
```

### FINDING 4 — the stiction floor is **unknown**, and the overdrive kick is load-bearing because of it

Track 3 design rule 3 fixes two intensity levels: **MED = 65 %** and **FULL = 100 %**, on the basis
that ERMs do not reliably start below ~50–55 % duty. **The specific motor's start voltage cannot be
confirmed from this repository.**

`parts/Vibration Motor (ERM)/vibration-motor-erm/files/AX22-0013-datasheet.pdf` is **not a
datasheet**. `file(1)` reports `HTML document text`; its content is LCSC's JavaScript landing page.
The scrape captured the site shell instead of the PDF and recorded a sha256 for it, so the failure
was silent. **There is no motor datasheet in this repo.**

Why this matters, with real numbers from two Precision Microdrives 10 mm coin cells:

| Part | Rated V | **Start voltage** | As % of rated | Min duty on a 3V3 rail |
|---|---|---|---|---|
| PM 310-101 | 3.0 V | **2.3 V** | 77 % | **~70 %** |
| PM 310-103 | 3.0 V | **1.2 V** | 40 % | **~36 %** |

**A 2× spread between two same-size coin cells from the same vendor.** If the AX22-0013 behaves like
the 310-101, **65 % duty is below its start voltage and MED would never spin from rest.**

**The overdrive kick is what makes this safe, and it is therefore not an optimisation.** Driving
100 % for `KICK_MS = 30 ms` breaks stiction; a *running* ERM sustains well below its start voltage
(PM AB-029 documents exactly this hysteresis). The `hapticTick()` above applies the kick to every
onset unconditionally. Without it, MED-level patterns (P0, P2, P10 and P6's brackets) are a coin
flip on unknown hardware.

**Two additional consequences of the ERM physics, both already handled:**

- **Rise time is 40 ms lag + 87 ms rise on a PM 310-103.** This is why Track 3 rejected PIVOT.md's
  *"4× rapid 100 ms bursts"* for DANGER and specified 200/150 instead. Concur — 100 ms on/off would
  render as a mush.
- **Amplitude scales as roughly the square of speed** (F₀ = mrω²), so a linear duty ramp feels
  strongly non-linear. This *helps* P5's 65→82→100 % ascent (perceptually ~42→67→100 % of
  amplitude) and is another reason not to build meaning on fine intensity gradations.

**Resolution: a 5-minute bench measurement, first hour of build.** Sweep duty 40→100 % in 5 % steps
with the kick disabled and record the lowest duty that starts the motor from rest. If it is above
65 %, raise MED to that value + 10 %. Everything else in the vocabulary is unaffected.

---

## PDM Capture & Siren FFT Parameters

**PDM RX on ESP32-S3 is CONFIRMED in hardware — this is no longer an assumption.** Three independent
primary sources agree (§Grounding Notes): the ESP-IDF I2S mode table for the esp32s3 target, the
`soc_caps.h` header (`SOC_I2S_SUPPORTS_PDM_RX (1)`, `SOC_I2S_SUPPORTS_PDM2PCM (1)` — present
unchanged from v4.4.7 through master), and the ESP32-S3 TRM v1.8 Ch. 28. Hardware decimation means
**the FFT receives ordinary 16-bit signed PCM at zero CPU cost.**

### ⚠ Two silent-failure traps. Both must be designed against, not discovered.

**TRAP 1 — the PDM-to-PCM converter exists on I2S0 only.** ESP-IDF, verbatim: *"PDM RX is only
supported on I2S0, and it only supports 16-bit width sample data."* Binding the mic to I2S1 **does
not error** — it yields the raw 1-bit bitstream, which forces software decimation and produces an
FFT full of garbage with no diagnostic. This is Track 3's R11 and it is real.

> **Constraint on whoever writes `pins.h` and the peripheral init:**
> **the microphone binds to `I2S_NUM_0`. Never `I2S_NUM_AUTO`. Never `I2S_NUM_1`.**
> This costs nothing — I²S signals route through the GPIO matrix
> (TRM Table 6.11-1 lists `I2S0I_SD_in` / `I2S0I_BCK_in` with "Output via IO MUX: no"),
> so *any* port's pins can carry I2S0. The port choice is free; the peripheral choice is not.

**TRAP 2 — the mono slot default is LEFT.** `I2S_PDM_RX_SLOT_*_DEFAULT_CONFIG` sets
`.slot_mask = (mono) ? I2S_PDM_SLOT_LEFT : I2S_PDM_SLOT_BOTH`. The T3902 datasheet calls
SELECT=VDD its DATA2/left lane, while the installed ESP-IDF header names the device with select
pulled high `I2S_PDM_SLOT_RIGHT`. For the photographed AX22-0044, drive SL/GPIO1 **high** and
override `slot_mask` with `I2S_PDM_SLOT_RIGHT`, or capture reads **pure silence**. This distinction
is driver naming, not an electrical contradiction.

**The bring-up assertion that catches both traps in one line.** After `i2s_channel_enable()`,
capture 512 samples and print the standard deviation:

```c
// Real 16-bit PCM in a quiet room:      sigma ≈  50 – 500 LSB
// Raw PDM misread as PCM:               sigma > 8000 LSB and the spectrum is flat  → TRAP 1
// Wrong slot:                           sigma == 0, every sample 0                 → TRAP 2
if (sigma < 1.0f)    Serial.println(F("[mic] FAIL: all-zero — wrong slot? try SLOT_RIGHT"));
if (sigma > 5000.0f) Serial.println(F("[mic] FAIL: raw PDM — is the channel on I2S_NUM_0?"));
```

**Put this in the first hour of the build.** It converts two silent, afternoon-eating failures into
two printed sentences.

### Capture parameters

| Parameter | Value | Justification |
|---|---|---|
| I²S port | **`I2S_NUM_0`** | hard requirement — TRAP 1 |
| Sample rate | **16 000 Hz** | Nyquist 8 kHz, far above the 500–1800 Hz siren band. Bottom of ESP-IDF's documented PCM range (*"usually ranges 16 kHz ~ 48 kHz"*) and an explicitly supported TRM frequency |
| Bit depth | **16-bit signed** | not a choice — *"regardless of whether you are using raw PDM or PCM format, the data unit width is always 16 bits"* |
| Slot mode | `I2S_SLOT_MODE_MONO`, slot LEFT | one mic; see TRAP 2 |
| Downsample ratio | `I2S_PDM_DSR_8S` (×64) → CLK **1.024 MHz** | the `I2S_PDM_RX_CLK_DEFAULT_CONFIG` default. **If the mic is silent or noisy, switch to `I2S_PDM_DSR_16S` (×128, 2.048 MHz)** — many PDM MEMS mics need CLK above ~1 MHz to stay out of sleep mode, and 1.024 MHz sits on that boundary |
| `dma_desc_num` | **4** | 4 × 16 ms = 64 ms of slack — tolerates a full missed frame without overrun |
| `dma_frame_num` | **256** | 4 × 256 × 2 B = **2 KB** total DMA RAM |
| Read size | **512 samples** (1024 B) per FFT frame | = 2 DMA buffers = 32 ms of audio |
| `i2s_channel_read` timeout | **100 ms** | 3× the frame period; check the return code *and* `bytes_read` — a timeout can return a partial read |

```c
#include "driver/i2s_pdm.h"

i2s_chan_handle_t s_rx;
i2s_chan_config_t chan = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_0, I2S_ROLE_MASTER);  // <-- NUM_0
chan.dma_desc_num  = 4;
chan.dma_frame_num = 256;
ESP_ERROR_CHECK(i2s_new_channel(&chan, NULL, &s_rx));

i2s_pdm_rx_config_t pdm = {
    .clk_cfg  = I2S_PDM_RX_CLK_DEFAULT_CONFIG(16000),
    .slot_cfg = I2S_PDM_RX_SLOT_PCM_FMT_DEFAULT_CONFIG(I2S_DATA_BIT_WIDTH_16BIT,
                                                       I2S_SLOT_MODE_MONO),
    .gpio_cfg = { .clk = (gpio_num_t)MIC_CLK_PIN,      // Port 2 or 4 · any GPIO
                  .din = (gpio_num_t)MIC_DIN_PIN,
                  .invert_flags = { .clk_inv = false } },
};
ESP_ERROR_CHECK(i2s_channel_init_pdm_rx_mode(s_rx, &pdm));
ESP_ERROR_CHECK(i2s_channel_enable(s_rx));
```

**No DC blocker is required, by construction.** The tunable high-pass filter fields
(`hp_en`, `hp_cut_off_freq_hz`, `amplify_num`) are gated on `SOC_I2S_SUPPORTS_PDM_RX_HP_FILTER`,
which is defined **only for the ESP32-P4** — the S3 does not expose them. That would normally force
a software DC blocker. **It does not here, because every feature below is computed from FFT bins
13–58 and DC lands in bin 0.** Deriving the amplitude trend from FFT band energy rather than
time-domain RMS makes the whole chain DC-immune for free. If headroom ever becomes an issue, a
one-pole blocker `y[n] = x[n] − x[n−1] + 0.995·y[n−1]` gives a −3 dB corner at
`(1 − 0.995) × 16000 / 2π` = **12.7 Hz**.

### FFT parameters and the bin arithmetic

| Parameter | Value |
|---|---|
| FFT size N | **512** |
| Sample rate f_s | **16 000 Hz** |
| Window | **Hann** (`FFTWindow::Hann`) |
| Overlap | **none** — hop = 512 |
| Data type | **`float`** — never `double` |

**Bin resolution, shown:**

```
Δf   = f_s / N          = 16000 / 512   = 31.25 Hz per bin
T_frame = N / f_s       = 512 / 16000   = 32.0 ms per frame
f_rate  = 1 / T_frame                   = 31.25 frames per second
Nyquist = f_s / 2       = 8000 Hz       → usable bins 0 … 255
f(k)    = k × 31.25 Hz
```

**Band mapping, shown:**

```
Wail sweep low   400 Hz  →  400 / 31.25 = 12.80  → bin 13   (406.25 Hz)
Wail sweep high 1300 Hz  → 1300 / 31.25 = 41.60  → bin 42  (1312.50 Hz)
Siren band low   500 Hz  →  500 / 31.25 = 16.00  → bin 16   (500.00 Hz)  exact
Siren band high 1800 Hz  → 1800 / 31.25 = 57.60  → bin 58  (1812.50 Hz)
```

**Frequency range covered: 31.25 Hz – 8000 Hz.** Siren energy gate = **bins 16…58** (43 bins).
Peak tracking = **bins 13…42** (30 bins).

**Why Hann, not Hamming.** We measure band *energy* and track a *peak bin*; we never need to resolve
two close tones. Hann's far-sidelobe rolloff is −60 dB/decade against Hamming's −20 dB/decade, so a
loud low-frequency component — traffic rumble, wind, HVAC — leaks far less into the 500–1800 Hz
band. Sidelobe rejection is the property that matters here, and Hann wins on it.

**Why no overlap.** 50 % overlap would halve detection latency to ~50 ms at double the CPU, but it
also doubles the envelope sample rate and complicates the autocorrelation lag table. Non-overlapped
frames give an envelope sampled at exactly **31.25 Hz**, which keeps the lag table clean, and 80 ms
already meets the <100 ms Tier-2a budget. Simpler wins.

### The detection algorithm

Track 3's two-tier split is adopted as the structure. **PIVOT.md's "<200 ms siren classification" is
physically impossible** — a 2 Hz yelp modulation has a 500 ms period, so the evidence does not exist
inside a 200 ms window. This is a property of the signal, not of the ESP32.

#### Level 0 — per-frame features (every 32 ms)

```c
// Parseval scaling: converts arduinoFFT magnitudes back to LSB² for a Hann-windowed
// real signal.  W2 = mean(w[n]^2) for Hann = 3/8 = 0.375.
//   scale = 2 / (N * N * W2) = 2 / (512 * 512 * 0.375) = 2.0345e-5
static const float PARSEVAL = 2.0f / (512.0f * 512.0f * 0.375f);

float bandPower = 0.0f;                       // LSB²
for (int k = 16; k <= 58; k++) bandPower += mag[k] * mag[k];
bandPower *= PARSEVAL;
const float bandRms = sqrtf(bandPower);       // LSB

int   peakBin = 13;                           // argmax over the wail band
float peakMag = 0.0f;
for (int k = 13; k <= 42; k++) if (mag[k] > peakMag) { peakMag = mag[k]; peakBin = k; }
```

#### Level 1 — adaptive noise floor

```c
static const float FLOOR_ALPHA = 0.01f;       // tau = 100 frames = 3.2 s
// Updated ONLY when the gate is NOT tripped, so a sustained siren can never raise the floor.
if (!gated) s_noiseFloor += FLOOR_ALPHA * (bandPower - s_noiseFloor);
// Boot: plain mean of the first 32 frames (1.0 s) before any gating is allowed.
```

#### Tier 2a — the fast coarse alert (→ P3 ATTENTION)

```c
static const float REL_RATIO   = 15.85f;      // +12 dB in power: 10^(12/10) = 15.849
static const float ABS_MIN_RMS = 184.0f;      // ≈ -45 dBFS: 10^(-45/20) × 32768 = 184.2 LSB
static const uint8_t CONFIRM_FRAMES = 2;

const bool hot = (bandPower > REL_RATIO * s_noiseFloor) && (bandRms > ABS_MIN_RMS);
s_hotRun = hot ? (uint8_t)(s_hotRun + 1) : 0;
if (s_hotRun == CONFIRM_FRAMES) postHaptic(PAT_ATTENTION);   // fires exactly once per onset
```

The absolute floor exists so that a silent room — where `s_noiseFloor` decays toward zero — cannot
be tripped by a cough at +12 dB over nothing.

**Tier 2a latency, shown:**
```
capture frame 1                32.0 ms
FFT + features                  2.3 ms
capture frame 2                32.0 ms
FFT + features                  2.3 ms
haptic tick quantisation     ≤ 10.0 ms
                             ─────────
TOTAL                        ≈ 78.6 ms      ← inside the <100 ms budget
```

#### Tier 2b — confirmed siren (→ P1 DANGER or P2 SIREN WARNING), 1–2 s

Three features over a **64-frame ring buffer = 2048 ms** of history. 64 is chosen as a power of two
so the modulo is a mask, and because it holds ≥2 full cycles of the slowest yelp (2 Hz → 500 ms).

```c
static const uint8_t HIST = 64;               // 64 × 32 ms = 2048 ms
static float   s_env[HIST];                   // band RMS per frame — the envelope
static uint8_t s_peak[HIST];                  // argmax bin per frame
static uint8_t s_head = 0;                    // s_head = (s_head + 1) & (HIST - 1)
```

**(a) Yelp — envelope modulation at 2–4 Hz, by normalised autocorrelation.**

```
Envelope is sampled at 31.25 Hz. A modulation of period P frames = 1000/(P × 32) Hz.
  lag  8 frames → 1000 / 256 = 3.91 Hz
  lag 16 frames → 1000 / 512 = 1.95 Hz
⇒ search lags 8 … 16 inclusive to cover the verified 2–4 Hz yelp band.
```
```c
static const uint8_t LAG_MIN = 8, LAG_MAX = 16;
static const float   MOD_INDEX_MIN = 0.35f;     // normalised autocorrelation peak
// Mean-remove the last 64 envelope samples, then for each lag L in [8,16]:
//   r(L) = Σ e[i]·e[i-L] / Σ e[i]²     (i over the 48 samples where both are valid)
// modIdx = max over L of r(L).   Cost: 9 lags × 48 MACs = 432 MACs ≈ 4 µs.
const bool yelp = (modIdx > MOD_INDEX_MIN);
```

`MOD_INDEX_MIN = 0.35` is the operative threshold. Rationale: a clean square-wave yelp gives
r ≈ 0.8–0.95; broadband traffic noise gives r < 0.15; 0.35 sits above the noise population with
margin and below any real periodic siren. **Measure `modIdx` on a played siren clip at bring-up and
print it** — the number will be far from the threshold in both directions, which is the point.

**(b) Wail — monotonic peak travel across a 1 s window.**

```
A full 400 → 1300 Hz sweep spans bins 13 → 42 = 29 bins.
Wail modulation is 0.25 – 1 Hz ⇒ a full cycle is 1 – 4 s ⇒ travel rate 225 – 900 Hz/s.
Over a 1.0 s window (32 frames) the slowest real sweep still moves 225 Hz = 7.2 bins.
⇒ threshold: |peak[now] − peak[now−32]| ≥ 8 bins  (= 250 Hz)  AND  ≥75 % of the
  frame-to-frame deltas in that window share the sign (monotonicity).
```
```c
static const uint8_t  SWEEP_WINDOW = 32;        // 1.024 s
static const uint8_t  SWEEP_MIN_BINS = 8;       // 250 Hz of travel
static const float    SWEEP_MONOTONIC = 0.75f;
```

**(c) Amplitude trend over 3 s → approaching or receding.**

```
3 s = 3000 / 32 = 93.75 → 94 frames.  Our ring is 64, so use the full 64 (2.05 s) —
long enough for the trend and it avoids a second buffer.
  recent = mean(s_env[last 16 frames])      (0.51 s)
  older  = mean(s_env[frames 48..63 ago])   (0.51 s, 1.5 s earlier)
  rising if recent > 1.26 × older           (+2 dB in amplitude)
```
```c
static const float TREND_RATIO = 1.26f;         // +2 dB
```

**(d) The verdict.**

```c
const bool sirenConfirmed = (s_hotRun >= 32) && (yelp || sweep);   // ≥1.02 s of sustained band energy
if (sirenConfirmed) postHaptic(rising ? PAT_DANGER : PAT_SIREN);
```

**Frames of history required: 64** (2048 ms) — set by the slowest feature, the 2 Hz yelp needing two
full cycles. This is the number that sizes the buffers, exactly as the coordinator instructed.

**Total acoustic RAM:** `s_env` 64×4 B + `s_peak` 64×1 B + `vReal`/`vImag` 2×512×4 B = **4.3 KB**.

### Compute cost per frame, and library choice

| Step | Cost | Source |
|---|---|---|
| `int16 → float` + Hann window, 512 samples | ~0.20 ms | ~4 FPU ops/sample at 240 MHz |
| **512-pt float FFT — `dsps_fft2r_fc32` (esp-dsp)** | **0.186 ms** | published: **44 594 cycles** on ESP32-S3 O2 ÷ 240 MHz |
| **512-pt float FFT — `ArduinoFFT<float>`** | **~0.33 – 0.80 ms** | esp-dsp's *ANSI* column for the same transform is 79 978 cycles = 333 µs; a generic C library is at or above that |
| Band sum (43 bins) + argmax (30 bins) + ring push | ~0.02 ms | |
| Autocorrelation, 9 lags × 48 MACs | ~0.004 ms | |
| **Total per 32 ms frame** | **0.41 – 1.02 ms** | **1.3 – 3.2 % of one core** |

**Recommendation: `kosme/arduinoFFT@^2.0.4`, instantiated as `ArduinoFFT<float>`.** Neither library
is remotely close to a performance constraint (3 % of a core at worst), so the decision is about
API surface, and arduinoFFT ships `windowing()` and `complexToMagnitude()` that esp-dsp makes you
hand-write alongside `dsps_cplx2reC_fc32` unpacking and table initialisation. That is ~40 lines of
unfamiliar API at 2 a.m. for a saving of 0.5 ms per 32 ms.

```ini
lib_deps = kosme/arduinoFFT@^2.0.4     ; v2.0.4, released 2024-11-21 — the current release
```

```cpp
#include <arduinoFFT.h>
static float vReal[512], vImag[512];
static ArduinoFFT<float> FFT = ArduinoFFT<float>(vReal, vImag, 512, 16000.0f);

FFT.windowing(FFTWindow::Hann, FFTDirection::Forward);   // scoped enums — must qualify
FFT.compute(FFTDirection::Forward);
FFT.complexToMagnitude();                                 // magnitudes land in vReal[0..255]
```

**Three traps in that snippet, all real:**

1. **`ArduinoFFT<float>`, never `ArduinoFFT<double>`.** The ESP32-S3 FPU is **single-precision
   only**; ESP-IDF's own optimisation guide says *"Avoid using double precision floating point
   arithmetic `double`. These calculations are emulated in software and are very slow."* **The
   library's own shipped example uses `ArduinoFFT<double>` — do not copy it.**
2. **arduinoFFT v2 is not source-compatible with v1.** v1's `arduinoFFT` class with
   `Compute()`/`Windowing()`/`ComplexToMagnitude()` no longer exists; there is no shim. Every
   tutorial written before Nov 2024 uses the v1 API and will not compile.
3. **The enums are scoped** (`enum class FFTWindow`), so `FFTWindow::Hann` must be qualified.

> **Free 2× speedup, zero new dependencies, if the audio task ever needs headroom:** ESP-DSP ships
> **prebuilt inside Arduino-ESP32** — `esp32s3/lib/libespressif__esp-dsp.a` is present with its
> headers on the default include path in both 2.0.17 and 3.x. `#include "esp_dsp.h"` and call
> `dsps_fft2r_fc32()`; no `lib_deps` entry exists or is needed. (The common "esp-dsp is IDF-only"
> advice is stale — Espressif closed esp-dsp issue #11 in 2022 with *"esp-dsp has been added to
> arduino-esp32"*.) Note that `dsps_fft4r_fc32` (radix-4, another 34 % faster) requires N to be a
> power of **four** — 256 or 1024, not 512.

### Fallback if PDM capture fails on the bench

Stated for completeness; the hardware support is confirmed, so this should not arise.

| Failure | Symptom | Remedy |
|---|---|---|
| Bound to I2S1 | σ > 5000, flat spectrum | rebind to `I2S_NUM_0`. Any GPIO works — GPIO matrix |
| Wrong slot | σ == 0, all samples zero | `slot_mask = I2S_PDM_SLOT_RIGHT` |
| Mic asleep at 1.024 MHz CLK | σ == 0 or intermittent | `I2S_PDM_DSR_16S` → 2.048 MHz |
| Hardware converter genuinely unusable | garbage that survives all of the above | **Move the siren tier to the laptop.** Run the identical FFT in Python on the laptop mic and push `ATTENTION`/`DANGER` through the same `/api/event` relay. Costs ~500 ms of latency and **breaks the "works with Wi-Fi unplugged" claim for Tier 2** — say so honestly rather than quietly. Tier 1 (ToF) still holds the offline safety floor. |

---

## Software Asset Reuse Audit

### Firmware — `firmware/braille_wearable/`

| File | Verdict | Detail |
|---|---|---|
| `platformio.ini` | **ADAPTABLE** | Change `default_envs` to `genesis_mini` (Arduino 3.x is **required** — `driver/i2s_pdm.h` does not exist in the 2.0.17 env's IDF v4.4.7). Keep lines 32-34 verbatim (`ARDUINO_USB_MODE=1`, `ARDUINO_USB_CDC_ON_BOOT=1`) — hard-won and still correct. Keep `ArduinoJson@^7.4.3` (:42). **Delete** lines 43-46 (ST7735 ×2, BusIO, RotaryEncoder — all dead BOM). **Add** `kosme/arduinoFFT@^2.0.4` and `adafruit/Adafruit_VL53L0X@^1.2.4`. Keep `[env:native]` (:75-78) unchanged — it is the TDD asset. |
| `src/net.cpp` · `net.h` | **ADAPTABLE — the most valuable asset in the repo** | `wifiJoin()` (`net.cpp:14-31`) — **keep verbatim**, including `setInsecure()` at :27 and the 20 s bounded join. `pollPull()` (:38-65) — keep the skeleton, the `seq` gate (:54-56) and the `JsonDocument` usage (:50); change `http.GET()` → `http.POST(telemetry)`, replace the `mode`/`msg`/`replies` fields with `pattern`/`route`/`conf`/`arrivalId`, and map pattern string → `uint8_t` at parse time. `postReply()` (:67-84) — **keep as the template** for `/api/event`; it already demonstrates `addHeader` + `serializeJson` + POST correctly. **Add:** hoist `HTTPClient` to a static + `setReuse(true)` (§Decision 3). **Delete** `PullResult` (`net.h:10-15`) → `DeviceCommand`. |
| `src/braille.cpp` | **DELETE** | The braille encoding is dead. More importantly the sequencer is **structurally wrong**: `beat()` (:19-30), `buzzLetter()` (:33-37) and `buzzWord()` (:40-51) are a `delay()` chain that blocks the MCU for up to ~48 s. There is no state machine to adapt. **What survives is the five timing constants at `braille.cpp:12-16`** — `BUZZ 400`, `GAP_BEAT 300`, `GAP_LETTER 800`, `GAP_WORD 1500`, `STAGGER 100` — which Track 3 deliberately reused as proven primitives. Copy the numbers, delete the file. |
| `src/braille.h` | **DELETE** | `BRAILLE[26]` (:20-27) and `brailleMask()` (:31-35) encode a rejected idea. Its *pattern* — an Arduino-free pure-logic header that the `native` env can link — is the model for the new `siren_logic.h` and `haptic_pattern.h`. **Reuse the technique, delete the content.** |
| `src/display.cpp` · `display.h` | **DELETE** | ST7735S LCD removed from the BOM. Port 2 is reallocated to ToF/mic. |
| `src/encoder.cpp` · `encoder.h` | **DELETE** | Rotary encoder removed from the BOM. Port 4 reallocated. **One idiom worth lifting:** the debounce in `encoderPressed()` (`encoder.cpp:31-43`) is a correct non-blocking edge detector — copy its shape for the onboard button. |
| `src/pins.h` | **ADAPTABLE — and it contains a bug** | `MOTOR_L 4` / `MOTOR_R 9` (:9-10) are **wrong** → `3` / `16`. Keep `BTN_REPEAT 45` (:19) and its strapping-pin comment. Delete `LCD_*` (:11-15) and `ENC_*` (:16-18). Add `MIC_CLK_PIN`/`MIC_DIN_PIN` (Port 4) and the `I2S_NUM_0` constraint as a comment. |
| `src/braille_wearable.cpp` | **ADAPTABLE — ~20 % survives** | `setup()`'s ordering (:71-91) is a good template: Serial → pins → peripherals → Wi-Fi. `repeatPressed()` (:58-69) is a correct active-high debounce for GPIO45 — **keep, rename**. The poll cadence idiom at :96-97 survives as a pattern. **Delete** all of `enterReplyMode`/`serviceReplyMode` (:26-53) and the `loop()` body (:99-122). `loop()` becomes ToF + button only. |
| `src/secrets.h` | **DIRECTLY REUSABLE** | Template + gitignore pattern is exactly right. Add one line: `#define MODAL_HOST "…"` only if the Modal-direct emergency path is wired. |
| `test/test_braille/test_braille.cpp` | **DELETE (content) / KEEP (structure)** | The braille table it tests is dead. **The file is the single best asset in the repo for the new build**: it proves the `native` Unity env works and demonstrates independent re-derivation rather than copying the table under test (:33-48). Mirror that technique for the new sequencer and siren tests. |

### Web app — `app/`

| File | Verdict | Detail |
|---|---|---|
| `app/lib/redis.ts` | **ADAPTABLE — high value** | The **MSET-before-INCR ordering** (`redis.ts:27-29`) is a debugged race fix (Phase 3B) and the comment at :20-22 explains exactly why. Keep `pushForward` → rename `pushEvent`, keep `pullState` (:33-43) with new keys. **Delete** `setSuggestions`, `getMemory`, `setChoice`, `takeChoice` (:50-81) and the memory machinery — all reply-loop. |
| `app/lib/contract.ts` | **ADAPTABLE** | Only 19 lines and the *principle* (one shared source of truth mirrored by the firmware struct) is the right one. Types are all braille-era: replace `Mode`/`PullResponse`/`Choice`/`KEYWORD_MAX` with §Contract B. |
| `app/api/pull/route.ts` | **ADAPTABLE — near-verbatim** | `force-dynamic` + `Cache-Control: no-store` + `Access-Control-Allow-Origin: *` (:6-11) and the `OPTIONS` preflight (:18-28) are exactly what the ESP32 and the debug screen need. **Keep the whole file**; add a `POST` handler that ingests telemetry and returns the same body. |
| `app/api/push/route.ts` | **ADAPTABLE → `/api/event`** | Structure is right; the server-side sanitiser (:8-13) is a good instinct. Swap `sanitizeKeyword` for `ROUTE_RE` validation and a `CloudPattern` allow-list. **Server-side rejection of non-numeric routes belongs here** (R7). |
| `app/api/stt` · `tts` · `condense` · `suggest` · `reply` · `reply-result` | **DELETE — all six** | ElevenLabs STT/TTS and the Claude condense/suggest/reply loop belong to the speech pipeline, which no longer exists. Deleting them also removes the two unauthenticated paid-API endpoints flagged as risk #3 in `audit/…/33-phase5-deploy-smoke.md`. |
| `app/lib/anthropic.ts` | **DELETE** | Claude now runs **server-side inside Modal** (Track 2's verdict), not in a Vercel route. Its `parseModelJson` (:31-45) is also superseded — Track 2 replaces prompt-only JSON with `output_config.format`, and notes assistant prefill now returns **400**. Keeping this file invites someone to reach for the dead pattern. |
| `app/lib/braille.ts` · `braille.test.ts` | **DELETE** | Dead idea. The vitest wiring in `package.json:10` survives. |
| `app/components/SpeakButton` · `SuggestionCards` · `History` | **DELETE** | All three are speech/reply-loop UI. |
| `app/page.tsx` | **ADAPTABLE — ~15 % survives** | The demo needs a **debug/companion screen**, because the actual output is invisible to an audience. What survives: the **poll-with-in-flight-guard** idiom (:336-359, `pullInFlightRef`) — genuinely valuable, it prevents request pile-up when the network stalls; the `useEffect` + `setInterval` + cleanup shape (:376-382); the interval constants (:33-34). **Everything else goes** — MediaRecorder (:172-238), the STT/condense/push pipeline (:85-148), TTS playback (:300-319), reply handling (:268-325). The new page renders §Contract D: detector state + bbox confidence, Claude's raw JSON with all three votes, the live FFT signature (band RMS, peak Hz, modulation index, trend), and the currently-playing haptic pattern. |
| `app/package.json` | **ADAPTABLE** | Keep `next` 16.2.10, `react` 19.2.4, `@upstash/redis` ^1.38.0, `vitest` ^4.1.10. **Remove `@anthropic-ai/sdk`** — Claude moves to Modal's Python. |
| `www/.env.example` · Vercel project link | **IN USE** | Project `haider-projects/bus-stop-awareness`, stable alias `bus-stop-awareness.vercel.app`, `UPSTASH_*` at Production scope. The legacy `app-eight-lyart-98.vercel.app` speech app is retired. |

---

## Build, Flash & Deploy Mechanics

### ⚠ Do this first — it is the longest-lead item in the whole build

```bash
# The siren tier REQUIRES Arduino-ESP32 3.x (ESP-IDF v5.x) for driver/i2s_pdm.h.
# Verified 2026-07-18: ~/.platformio/platforms/ contains ONLY `espressif32` and `native`.
# The pioarduino platform is NOT cached. First build downloads platform + core + GCC-14 (~1 GB).
cd /Users/haidertoha/Code/axiometa-ant-hack/firmware/braille_wearable
pio run -e genesis_mini            # START THIS NOW, on good wifi, before the venue
```

**Why this is non-negotiable.** `platformio.ini:18` pins `default_envs = genesis_mini_offline`,
which is `espressif32@7.0.1` → Arduino-ESP32 **2.0.17** → ESP-IDF **v4.4.7**. `driver/i2s_pdm.h`
**does not exist** in v4.4.7 (the raw GitHub path 404s); v4.4.7 exposes PDM only through the legacy
`driver/i2s.h` with `i2s_set_pdm_rx_down_sample()`. Track 3's verified API — and every current
Espressif example — is ESP-IDF v5.x only.

| Arduino-ESP32 | ESP-IDF | `driver/i2s_pdm.h` | LEDC API |
|---|---|---|---|
| **2.0.17** (current `default_envs`) | v4.4.7 | ❌ legacy `driver/i2s.h` only | `ledcSetup` + `ledcAttachPin` |
| **3.3.x** (`env:genesis_mini`) | v5.5.x | ✅ | `ledcAttach(pin,…)` |

**Contingency if the download fails at the venue:** build the siren tier against the legacy
`driver/i2s.h` API (`I2S_MODE_PDM` + `i2s_set_pdm_rx_down_sample(I2S_NUM_0, I2S_PDM_DSR_8S)`),
which *does* work on 2.0.17. It costs an afternoon of API translation. **Downloading tonight costs
twenty minutes of waiting.**

### Build and flash

```bash
cd /Users/haidertoha/Code/axiometa-ant-hack/firmware/braille_wearable

pio run -e genesis_mini                       # compile (the environment to use)
pio run -e genesis_mini -t upload             # flash over USB-C
pio device monitor -e genesis_mini            # 115200, USB-CDC (build_flags :32-34)
pio run -e genesis_mini -t upload -t monitor  # the one you will actually type

pio test -e native                            # host unit tests — NO BOARD REQUIRED
```

`upload_speed = 921600` and `monitor_speed = 115200` (`platformio.ini:26-27`) are already correct.
The board talks over the native USB-Serial/JTAG CDC because of `-DARDUINO_USB_MODE=1` and
`-DARDUINO_USB_CDC_ON_BOOT=1` (:33-34) — **keep both**; they are the reason `Serial` works over
USB-C at all.

### Secrets

The existing pattern is correct and should be carried over unchanged. `.gitignore:5-6` ignores
`**/secrets.h` and `**/secrets.cpp`; `src/secrets.h` is a committed template with placeholders
(`secrets.h:9-11`).

```c
// firmware/braille_wearable/src/secrets.h   — git-ignored; fill in and flash
#define WIFI_SSID   "your-hotspot-ssid"
#define WIFI_PASS   "your-hotspot-password"
#define VERCEL_HOST "bus-stop-awareness.vercel.app"   // bare host: no scheme, no trailing slash
```

`net.cpp:42` prepends `https://` and appends the path — do not put a scheme in the constant.

Web-app secrets stay in Vercel env (Production scope, already set). Modal's `ANTHROPIC_API_KEY`
lives in a Modal Secret, never on the laptop:

```bash
modal secret create anthropic ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"
```

### Modal deploy and endpoint-URL propagation

```bash
pip install "modal==1.5.2"
modal setup                                # browser auth; confirm a payment method is on file
modal serve bus_vision.py                  # while iterating — hot-reloads, "-dev" URL suffix
modal deploy bus_vision.py                 # the real one. Deploy ≥1 h before you present.
```

Deployed URL pattern: `https://<workspace>--bus-vision-ingest.modal.run`.

**The URL reaches exactly one place — the laptop — and never the board.** This is a deliberate
consequence of choosing the Vercel relay:

| Consumer | How it gets the URL | Cost to change |
|---|---|---|
| **Laptop** `bus_client.py` | `MODAL_URL` env var, read via `os.environ` | edit a shell var, restart the script — **2 seconds** |
| **ESP32** | **never sees it.** The board only knows `VERCEL_HOST`. | n/a |
| **Debug screen** | never sees it. Reads Redis. | n/a |

```bash
export MODAL_URL="https://haider--bus-vision-ingest.modal.run"
export RELAY_URL="https://bus-stop-awareness.vercel.app"
python bus_client.py
```

**This is the strongest practical argument for the relay.** If the board polled Modal directly, the
`modal serve` → `modal deploy` URL change would be a recompile-and-reflash cycle every single time —
at exactly the moment you are least able to afford one.

---

## Host-Testable Logic

`platformio.ini:75-78` already defines a working `[env:native]` with `test_framework = unity` and
`-std=gnu++17 -I src`. It ran 7/7 green (`audit/…/33-phase5-deploy-smoke.md` §6). **This is the most
under-valued asset in the repository**, because hardware time is the scarce resource and every hour
of the build competes for one board.

**The technique that makes it work** is already demonstrated at `braille.h:12-16`: keep pure logic
in an **Arduino-free header**, put Arduino-dependent code in a `.cpp` that the `native` env never
compiles. `src/` is not built during tests, so `#include <Arduino.h>` never appears.

### What can be tested on the Mac, with no board

| Module | Header (Arduino-free) | Tests |
|---|---|---|
| **Quinary route encoder** | `haptic_route_pure.h` — `buildRouteSteps(const char*, HapStep*, uint8_t max, uint8_t *n)` | **Highest value.** Independently re-derive each digit from the LONG=5/SHORT=1 rule (the `test_braille.cpp:33-48` technique) rather than copying the table. Assert: `"0"` → exactly 2 LONGs; `"9"` → 1 LONG + 4 SHORTs; `"88"` → 19 steps and **6400 ms** total; `"999"` → 33 steps, inside `MAX_ROUTE_STEPS`; `"N3"` → returns false; `""` → false; `"1234"` → false. |
| **Pattern sequencer** | `haptic_seq_pure.h` — `hapticTick()` with `millis()` and `motorWrite()` injected as function pointers | Drive it with a fake clock and record every `motorWrite` call. Assert: total duration equals the sum of `step.ms`; the overdrive kick raises duty to 100 for exactly the first 30 ms of each onset and no longer; `duty1 != duty0` interpolates linearly and hits `duty1` on the final tick; `repeats` inserts `repeatGapMs` between iterations. |
| **Preemption / arbitration** | same header | The whole of Track 3's §Severity Arbitration is pure logic. Assert: DANGER preempts BUS mid-sequence; a **150 ms all-off gap** is inserted; the preempted queueable pattern restarts at `stepIdx == 0` and **never resumes mid-digit**; DANGER is not preempted by NUMBER; queue depth caps at 2; an entry older than 10 s is discarded; ACK/WAIT/READY/ERROR are dropped rather than queued. |
| **Siren decision logic** | `siren_pure.h` — `sirenUpdate(const float *mag, int nBins, SirenState*)` | **Takes a magnitude array, not audio.** No FFT and no I²S in the test. Feed synthetic spectra: a flat floor → no trigger; +12 dB in bins 16–58 for 2 frames → `ATTENTION` fires **exactly once**; +11 dB → never fires; a peak bin walked 13→42 over 32 frames → `sweep == true`; an envelope modulated at 3 Hz for 64 frames → `modIdx > 0.35`; at 8 Hz → below threshold; a sustained gate → the noise floor **does not** rise (the freeze works). |
| **Pattern-table invariants** | `patterns.h` | Compile-time-ish sanity: every `step.ms` is a multiple of `TICK_MS`; every `duty` ≤ 100; every pattern's `cls` matches Track 3's class table; no two patterns share an `id`. |
| **Relay contract (TypeScript)** | `app/lib/contract.ts` | `vitest` is already wired (`package.json:10`). Test `ROUTE_RE` accepts `"88"`/`"205"`/`"9"` and rejects `""`/`"N3"`/`"1234"`/`"8 8"`; test the `CloudPattern` allow-list rejects `"DANGER"` (device-local, must never arrive from the cloud). |

**What cannot be host-tested, and must have board time budgeted:** LEDC output (needs a scope or an
eye), I²S PDM capture (the σ assertion is the substitute), VL53L0X I²C, Wi-Fi/TLS, and the wear
test. Everything else above runs in under a second on the Mac with `pio test -e native`.

**Practical consequence for the plan:** the sequencer, the arbitration rules, the quinary encoder
and the siren decision logic — the four pieces most likely to contain a subtle bug, and the four
hardest to debug on a wrist — are **100 % testable before the board is even plugged in.** Write them
first, test them on the Mac, and spend board time only on the things that genuinely need it.

---

## Open Engineering Risks

Ranked by expected cost × probability.

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| **R1** | **Motor pins are wrong in `pins.h`** — `MOTOR_L 4`/`MOTOR_R 9` drive IO0, which the ERM leaves N.C. | **Total.** Motors never move; looks like dead hardware; burns hours on the wrong hypothesis | Change to `3` (P1 IO1) and `16` (P3 IO1) **before the first flash**. Verify in 60 s: flash a bare `ledcAttach(3,20000,8); ledcWrite(3,255);` and feel it. Two primary sources agree (§Motor Drive Electrical Findings) |
| **R2** | **Arduino 3.x platform is not cached** — `driver/i2s_pdm.h` is absent from the current default env's IDF v4.4.7 | **High.** The entire siren tier is unbuildable; discovered at the worst moment | Run `pio run -e genesis_mini` **tonight on good wifi** (~1 GB). Contingency: legacy `driver/i2s.h` + `i2s_set_pdm_rx_down_sample()` works on 2.0.17 at the cost of an afternoon |
| **R3** | **Mic bound to I2S1 or the wrong slot** — both fail **silently** | **High.** FFT produces garbage or silence with no error to search for | Hard-code `I2S_NUM_0`; never `I2S_NUM_AUTO`. Ship the σ assertion (§TRAP 1/2) in the first hour. Put "mic → I2S0" in `pins.h` as a comment |
| **R4** | **Track 2's three Claude votes run sequentially** (`_read_blind`, `for _ in range(VOTE_ROUNDS)`) | **High.** 4.5–9.0 s instead of 1.5–3.0 s; pushes the total past a short bus dwell | The calls are network-I/O-bound so the GIL is released. **4-line fix:** `with ThreadPoolExecutor(max_workers=3) as ex: results = list(ex.map(lambda _: one_vote(b64), range(3)))`. **Saves 3–6 s on the critical path.** Not a disagreement with Track 2 — its logic is correct, only serialised |
| **R5** | **ERM start voltage unknown** — the "datasheet" in `parts/` is an LCSC **HTML page**, not a PDF. Comparable coin cells span 1.2 V–2.3 V start | Medium. If it behaves like a PM 310-101, 65 % duty never starts the motor from rest, and every MED pattern (P0, P2, P10, P6 brackets) silently fails | The 30 ms overdrive kick makes MED work regardless, via stiction hysteresis — **it is load-bearing, not polish.** Confirm with a 5-minute duty sweep (kick disabled) in the first hour; if the floor is >65 %, raise MED |
| **R6** | **P6 timing is under-stated by ~0.8 s.** Recomputed from Track 3's own parameters | Medium. The demo script quotes a number the device will not hit | Use the corrected table below. Digit block = tone + intra-gaps; total = Σ blocks + (n−1)×800 + 2200 brackets. **`"88"` = 1700 + 1700 + 800 + 2200 = 6400 ms.** Also: `"205"` is **5** elements, not 7 |
| **R7** | **Routes containing letters are unencodable** — quinary covers digits only, but Claude's prompt explicitly allows `"N3"`, `"P5"` | Medium. Device would silently drop the pattern | **Reject server-side, in `/api/event`:** if `!ROUTE_RE.test(route)`, store `pattern: "UNKNOWN"` instead. The failure becomes visible on the debug screen rather than invisible on the wrist. Route 88 is unaffected |
| **R8** | **Poll at 300 ms without TLS keep-alive** — a fresh handshake per poll costs 300–800 ms and will not complete before the next fires | Medium. Request pile-up, heap churn, watchdog resets | Hoist `HTTPClient` to a static + `http.setReuse(true)`. **Verify by timing 20 polls**: keep-alive shows ~50–200 ms, handshake-per-poll shows ~400 ms+. If it cannot be made to work, fall back to the proven **700 ms** |
| **R9** | **`netTask` stack too small** — mbedTLS + HTTPClient + ArduinoJson | Medium. Intermittent crashes that look like network faults | **12288 bytes.** Check headroom with `uxTaskGetStackHighWaterMark()` printed once a minute during bring-up |
| **R10** | **Adaptive noise floor chases a sustained siren**, desensitising Tier 2a mid-event | Low–Medium | The floor updates **only when the gate is not tripped** (`if (!gated)`). Plus the absolute `ABS_MIN_RMS = 184.0f` guard so a silent room cannot trigger on a cough |
| **R11** | **`ArduinoFFT<double>` copied from the library's own example** — doubles are software-emulated on ESP32-S3 | Low–Medium. Silent ~5–10× slowdown of the audio task | `ArduinoFFT<float>` only. Add a `static_assert(sizeof(decltype(vReal[0])) == 4, "use float")`. Note arduinoFFT v2 is **not** source-compatible with v1 — pre-Nov-2024 tutorials will not compile |
| **R12** | **GPIO3 is an ESP32-S3 strapping pin** (JTAG source select) and now carries Motor A | Low | Benign by default: `EFUSE_STRAP_JTAG_SEL` ships as 0, so GPIO3 is not sampled at reset, and the module's 3 kΩ `R2` holds the net low while the pad is high-Z. Confirm once: `espefuse.py summary \| grep -i jtag` |
| **R13** | **Both motors at 100 % = 180 mA plus inrush** on the shared 3V3 rail | Low | Track 3's 100 ms micro-stagger halves the peak — **its justification is electrical, not perceptual** (at 33.9 mm the perceptual benefit is nil). Use a ≥1 A USB source, per the superseded plan's already-computed budget |

### R6 — corrected P6 timing, arithmetic shown

Per-digit block (tone + intra-digit gaps only; SHORT 150, LONG 500, intra 250):

| d | Encoding | Elements | Tone | Intra gaps | **Block** |
|---|---|---|---|---|---|
| 0 | `L L` | 2 | 1000 | 250 | **1250** |
| 1 | `S` | 1 | 150 | 0 | **150** |
| 2 | `S S` | 2 | 300 | 250 | **550** |
| 3 | `S S S` | 3 | 450 | 500 | **950** |
| 4 | `S S S S` | 4 | 600 | 750 | **1350** |
| 5 | `L` | 1 | 500 | 0 | **500** |
| 6 | `L S` | 2 | 650 | 250 | **900** |
| 7 | `L S S` | 3 | 800 | 500 | **1300** |
| 8 | `L S S S` | 4 | 950 | 750 | **1700** |
| 9 | `L S S S S` | 5 | 1100 | 1000 | **2100** |

`total = Σ blocks + (ndigits − 1) × 800 + 2200`

| Route | Elements | Σ blocks | Inter gaps | Brackets | **Total** | Track 3 stated |
|---|---|---|---|---|---|---|
| "7" | 3 | 1300 | 0 | 2200 | **3.5 s** | 3.3 s |
| "10" | 3 | 1400 | 800 | 2200 | **4.4 s** | 4.6 s |
| "205" | **5** | 2300 | 1600 | 2200 | **6.1 s** | 6.1 s ✓ (elements stated as 7) |
| **"88"** | 8 | 3400 | 800 | 2200 | **6.4 s** | 5.6 s |
| "999" | 15 | 6300 | 1600 | 2200 | **10.1 s** | 9.0 s |

**The encoding scheme is correct and I am not proposing any change to it** — only the arithmetic
moves. If 6.4 s proves too long in rehearsal, drop the terminator bracket (−1.1 s → 5.3 s) before
touching digit timing, exactly as Track 3's R12 advises.

---

## Grounding Notes

### Live sources (all fetched **2026-07-18**)

| Claim | URL |
|---|---|
| ESP32-S3 PDM-to-PCM on **I2S0 only**; PDM RX 16-bit only; the per-target mode table | https://docs.espressif.com/projects/esp-idf/en/v5.5/esp32s3/api-reference/peripherals/i2s.html |
| `SOC_I2S_SUPPORTS_PDM_RX (1)`, `SOC_I2S_SUPPORTS_PDM2PCM (1)`, `SOC_LEDC_CHANNEL_NUM (8)`, `SOC_LEDC_TIMER_NUM (4)`, `SOC_LEDC_TIMER_BIT_WIDTH (14)` | https://raw.githubusercontent.com/espressif/esp-idf/master/components/soc/esp32s3/include/soc/soc_caps.h |
| TRM §28.3/§28.4 *"PDM-to-PCM RX … only supported by I2S0"*; §35.2 *"Eight independent PWM generators … Four independent timers … Maximum PWM resolution: 14 bits"*; §35.3.2.3 the duty-resolution formula; Table 6.11-1 I²S signals via GPIO matrix | https://documentation.espressif.com/esp32-s3_technical_reference_manual_en.pdf |
| Arduino-ESP32 → ESP-IDF mapping: **2.0.17 → v4.4.7**, 3.3.10 → v5.5.4 | https://api.github.com/repos/espressif/arduino-esp32/releases |
| `driver/i2s_pdm.h` **absent** in ESP-IDF v4.4.7 (404 on the raw path) | https://raw.githubusercontent.com/espressif/esp-idf/v4.4.7/components/driver/include/driver/i2s_pdm.h |
| `ESP_I2S.h` / `I2SClass` / `I2S_MODE_PDM_RX` / `setPinsPdmRx()` | https://raw.githubusercontent.com/espressif/arduino-esp32/master/libraries/ESP_I2S/src/ESP_I2S.h |
| LEDC API 2.0.17 (`ledcSetup`, `ledcAttachPin`) | https://raw.githubusercontent.com/espressif/arduino-esp32/2.0.17/cores/esp32/esp32-hal-ledc.h |
| LEDC API 3.x (`ledcAttach`, pin-based `ledcWrite`); `ledcSetup`/`ledcAttachPin` removed | https://raw.githubusercontent.com/espressif/arduino-esp32/master/cores/esp32/esp32-hal-ledc.h · https://docs.espressif.com/projects/arduino-esp32/en/latest/migration_guides/2.x_to_3.0.html |
| arduinoFFT **2.0.4** (2024-11-21); templated `ArduinoFFT<T>`; scoped `FFTWindow`/`FFTDirection` | https://api.registry.platformio.org/v3/packages/kosme/library/arduinoFFT · https://raw.githubusercontent.com/kosme/arduinoFFT/master/src/arduinoFFT.h |
| ESP32-S3 FPU is **single-precision only**; *"Avoid using double precision … emulated in software and are very slow"* | https://developer.espressif.com/blog/2025/10/cores_with_fpu/ · https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-guides/performance/speed.html |
| esp-dsp benchmarks: `dsps_fft2r_fc32` 512-pt = **44 594 cycles** on S3 (ANSI 79 978) | https://docs.espressif.com/projects/esp-dsp/en/latest/esp32/esp-dsp-benchmarks.html |
| esp-dsp ships inside Arduino-ESP32 — *"esp-dsp has been added to arduino-esp32"* | https://github.com/espressif/esp-dsp/issues/11 · https://github.com/espressif/esp32-arduino-libs/tree/idf-release/v5.1/esp32s3/lib |
| PM AB-012 *"The frequency of the PWM signal is usually around 20 kHz or higher"*; start-voltage hysteresis | https://www.precisionmicrodrives.com/ab-012 · https://www.precisionmicrodrives.com/ab-029 |
| ERM start voltages: 310-101 = **2.3 V**; 310-103 = **1.2 V**, rise 87 ms, stop 115 ms | https://cdn.sparkfun.com/assets/4/a/9/8/2/310-101_datasheet.pdf · https://precisionmicrodrives.com/product/310-103-10mm-vibration-motor-3mm-type |

### Repository sources (read **2026-07-18**)

| Claim | File |
|---|---|
| **ERM drive pin = IO1**; `R1` 220 Ω → `Q1` MMBTA42 NPN; `R2` 3 kΩ; `D1` 1N4001; `C1` 0.1 µF | `parts/Vibration Motor (ERM)/vibration-motor-erm/files/SCH_AX22-0013.pdf` |
| **IO0 = N.C., IO1 = "D" (Data)** on the module header | `parts/Vibration Motor (ERM)/vibration-motor-erm/images/pinout/Pins-0013.png` |
| AX22 connector pin 2 = **+3V3**; per-port GPIO P1 `4/3/2` · P2 `7/6/5` · P3 `9/16/15` · P4 `1/17/18` | `parts/Axiometa Genesis Mini - Starter Kit/axiometa-genesis-mini/files/SCH_MTX0013.pdf` |
| ERM module: MOSFET+flyback claim, 3 V / 90 mA / 12 000 rpm | `parts/Vibration Motor (ERM)/vibration-motor-erm/CONTENT.md:12,20` |
| The "datasheet" is an **LCSC HTML page**, not a PDF | `parts/…/files/AX22-0013-datasheet.pdf` (`file(1)` → `HTML document text`) |
| Prior audit's incorrect pin claim: *"Data line is pin 3/GPIO4"* | `audit/speech-to-braille-wearable/03-track-3-parts-truth.md:311,330` |
| *"Firmware is compile-verified only — no physical board attached … Motor/LCD/WiFi runtime behavior is untested"* | `audit/speech-to-braille-wearable/33-phase5-deploy-smoke.md` §5 |
| Live relay at `bus-stop-awareness.vercel.app` | Production deploy of `www/` |
| Motor separation **33.9 mm**, HIGH confidence | `audit/speech-to-braille-wearable/20-enclosure-cad-consolidated.md:19` |
| Arduino 3.x platform **not cached** (only `espressif32`, `native`) | `~/.platformio/platforms/` |

**Explicitly not verified, and flagged as such:** wall-clock `arduinoFFT` timings on ESP32-S3 (no
credible published benchmark exists; the esp-dsp ANSI column is used as an upper-bound proxy); any
Precision Microdrives statement linking PWM frequency to audible whine (their audible-noise note
covers mechanical noise only — the >20 kHz rule is convention, not vendor guidance); the AX22-0013's
own start voltage (no datasheet in the repo); whether PDM DC offset is problematic in practice on S3
silicon.

---

## Residual Risk

**Things I could not settle from the repository or the documentation, and what would settle each.**

| # | Unresolved | Why it matters | What resolves it |
|---|---|---|---|
| 1 | **RESOLVED 2026-07-18: AX22-0044 P4 pinout.** The installed module silk reads `G / 3V3 / SL / DT / CLK`; board connector pins 3/4/5 are IO0/IO1/IO2. | Capture can now use verified pins instead of inference. | User-provided bench photograph `IMG_0195.HEIC` plus `SCH_MTX0013.pdf`: CLK GPIO18, DT GPIO17, SL GPIO1 high; use I2S0 and the ESP-IDF pulled-high mask `I2S_PDM_SLOT_RIGHT`. |
| 2 | **The ERM start voltage.** No datasheet exists in the repo (§R5). | Determines whether Track 3's MED = 65 % works from rest. | 5-minute duty sweep on the bench, kick disabled. |
| 3 | **Claude vision call latency is unmeasured.** Track 2 correctly flags it as unpublished; my 1.5–3.0 s figure is inference from "Moderate" comparative latency plus ~45 output tokens. | It is the **single largest term** in the Stage-2 budget — larger than every other hop combined. | Run Track 2's timing script (its §Claude Vision §4). Run it **twice** — the first run pays the one-time schema-compilation cost. Put the second run's number in the plan. |
| 4 | **Venue Wi-Fi RTT.** Every network hop above uses Track 2's ~100–300 ms estimate. | If the venue is 500 ms+, the ~1.4 s Stage-1 mean roughly doubles. | Measure on site with `ping` and a timed `curl` to the Vercel alias. If it is bad, the Modal-direct path (§Decision 2) removes two hops. |
| 5 | **Whether `HTTPClient::setReuse(true)` actually holds the TLS session** across polls in the pinned Arduino version, against Vercel's edge. | Decides 300 ms vs 700 ms polling (§R8). | Time 20 consecutive polls on the bench. This is a 5-minute experiment with an unambiguous answer. |
| 6 | **`i2s_channel_read()` behaviour when `audioTask` is preempted** for longer than the 64 ms DMA depth. | Determines whether frames are dropped or silently stale during a Wi-Fi burst. | Instrument: count frames per second in `audioTask` and print once a second. A steady 31.25 means no loss. |
| 7 | **Nothing in this architecture has been run.** Every timing figure is arithmetic or citation, not measurement. The concurrency model, the sequencer and the FFT chain are designs, not tested code. | The usual hackathon risk: a design that is correct on paper and wrong in one specific way that only appears at 3 a.m. | The §Host-Testable Logic section exists precisely to shrink this: four of the highest-risk modules can be proven on the Mac before the board is touched. **That is the mitigation, and it should be spent.** |

**One disagreement recorded, per instruction:** I differ from Track 3 only on the **P6 timing
arithmetic** (§R6) and on the **ToF I²C load estimate** (2.5 % at 400 kHz vs its 15 % at 100 kHz).
Neither is a design disagreement — the encoding scheme, the vocabulary, the arbitration rules, the
33.9 mm measurement and the I2S0 constraint are all adopted exactly as Track 3 specifies. I differ
from Track 2 on **nothing**; §R4 is an optimisation to its code, not a correction of its API facts.
