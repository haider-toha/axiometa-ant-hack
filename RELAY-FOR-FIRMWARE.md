# Relay ↔ firmware — what the ESP32 polls

Handoff spec for the wristband firmware on the live `www` relay. Commands and
the independent `STILL`/`MOVING` activity channel are deployed. Haider owns the
phone motion classifier and activity producer; service Serial remains available
for deterministic board testing.

**Source of truth for the types:** [`www/src/lib/contract.ts`](www/src/lib/contract.ts) (`DeviceCommand`, `Telemetry`, `CloudPattern`). Background: [`plan/2026-07-18-bus-stop-situational-awareness.md`](plan/2026-07-18-bus-stop-situational-awareness.md) → "Data Contracts → Contract C".

---

## TL;DR

- **Host:** `tacta.space`, tracked in `network_config.h`; `secrets.h` contains only hotspot credentials.
- The board **POSTs to `/api/pull` every ~300 ms**; the request body is telemetry, the response is the current command.
- The response is `{ seq, pattern, route, dest, conf, arrivalId, ts, activity, activitySeq, activityTs }` — **not** the old `{ seq, mode, msg, replies }`.
- Activity version and freshness are independent from command `seq`/`ts`; an activity heartbeat must never re-fire a command.
- **`/api/reply` is gone.** Remove it. Telemetry now rides on the `/api/pull` POST body.
- **`seq` is still the edge-trigger:** only act when `seq` advances past the last one you handled.
- Camera bearings (`LEFT`, `RIGHT`, `AHEAD`) are accepted in both known activity phases. `MOVING` suppresses `BUS`, `WAIT`, `NUMBER`, and `UNKNOWN`; `STILL` accepts them. `ERROR` is global.
- Only wire route `"88"` with `conf="high"` may drive the hardcoded route-88 pattern. A different route or lower confidence is consumed and logged without a false `88` signal.
- The first command and activity snapshots after boot or a long outage are baselines and never fire output.

The old speech app at `app-eight-lyart-98.vercel.app` is **retired** — do not poll it.

---

## The poll

`POST https://tacta.space/api/pull` every ~300 ms.

- **Request body** = telemetry (below). The relay stores it for the debug screen, then returns the command.
- **Response** = the current `DeviceCommand`.
- `GET /api/pull` also works (returns the command, writes no telemetry) — handy for `curl` smoke.

```bash
curl -fsS https://tacta.space/api/pull
# {"seq":20,"pattern":"UNKNOWN","route":"","dest":"","conf":"low","arrivalId":1,"ts":1784398000652}
```

### Response — the command (what to parse)

```jsonc
{
  "seq": 20,            // monotonic. Only act when it advances. THE trigger.
  "pattern": "NUMBER",  // CloudPattern (see below)
  "route": "88",        // always a JSON string, 1–3 digits; "" unless pattern==NUMBER
  "dest": "Clapham Common", // debug-screen only — parse and DISCARD on device
  "conf": "high",       // "high" | "low" | ""
  "arrivalId": 1,       // increments once per bus arrival
  "ts": 1784398000652,  // ms epoch of the server write — command timestamp
  "activity": "STILL", // "MOVING" | "STILL"
  "activitySeq": 4,     // increments on transitions and 30 s heartbeats
  "activityTs": 1784397999000 // activity write time; independent of command ts
}
```

All three activity fields are required together. The first complete, valid
snapshot establishes a non-rendering baseline. Missing, invalid, regressed, or
older-than-120-second activity data falls back to `MOVING`. Every phone POST,
including the 30-second heartbeat, advances `activitySeq` and refreshes
`activityTs` without changing command `seq` or `ts`.

### Field → firmware struct

| JSON field | Type on wire | Firmware | Notes |
| --- | --- | --- | --- |
| `seq` | number | `long` | Edge-trigger. `if (seq <= s_lastSeq) return;` then `s_lastSeq = seq`. |
| `pattern` | string | `uint8_t` enum | Map string → `PAT_*` **once**, at parse time. Never keep the `String`. |
| `route` | string | `char[8]` | Always a JSON string, even `"88"`. Digits only (server rejects letters). Copy into a fixed buffer — no heap. |
| `dest` | string | — | **Parse and discard.** No display on the device. |
| `conf` | string | `uint8_t` enum | `""`→`CONF_NONE`, `"low"`→`CONF_LOW`, `"high"`→`CONF_HIGH`. |
| `arrivalId` | number | `long` | For de-duping repeated arrivals if needed. |
| `ts` | number | `long`/`int64` | Optional staleness guard — ignore commands older than N seconds. |
| `activity` | string | `uint8_t` enum | Exact `MOVING` or `STILL`; missing/invalid falls back to `MOVING`. |
| `activitySeq` | number | `uint32_t` | Independent edge. Must not increment command `seq`. |
| `activityTs` | number | `int64_t` | Activity write time. Must not refresh command `ts`. |

Implemented fixed-size command struct (no `String`, no heap):

```c
enum : uint8_t { CONF_NONE = 0, CONF_LOW, CONF_HIGH, CONF_INVALID };

struct DeviceCommand {
    uint32_t seq      = 0;
    uint8_t pattern   = PAT_INVALID; // string → enum ONCE, at parse time
    char    route[8]  = {0};        // "88" · "205"
    uint8_t confidence = CONF_INVALID;
    uint32_t arrivalId = 0;
    int64_t serverTs  = 0;
};
```

### `pattern` values — the cloud vocabulary

The relay sends these nine values. Map each to the corresponding firmware enum:

| `pattern` | Meaning | Device pattern |
| --- | --- | --- |
| `NONE` | no active command | idle |
| `LEFT` | camera target is left of frame | P1 proxy pattern |
| `RIGHT` | camera target is right of frame | P3 proxy pattern |
| `AHEAD` | camera target is centred | both-channel proxy pattern |
| `BUS` | a bus is arriving | P5 BUS ARRIVING |
| `NUMBER` | route is in `route` | P6 ROUTE NUMBER |
| `WAIT` | reading the route now | P7 WAIT |
| `UNKNOWN` | couldn't read / low confidence | P8 UNKNOWN |
| `ERROR` | degraded | P10 ERROR |

The **device-local** patterns — READY, DANGER, SIREN, ATTENTION, PROXIMITY,
ACK — are generated on the board and **never come over the wire**. Camera
bearings are advisory target-location cues; the single forward ToF zone never
derives a bypass direction.

### Activity gate and local sensing

| Effective activity | Relay output | ToF | Siren |
|---|---|---|---|
| `MOVING` | Consume but suppress bus-information patterns; accept `ERROR` | Sample and allow local proximity output; the cane remains primary | Sample and allow local output |
| `STILL` | Accept fresh bus-information patterns and `ERROR` | Continue sampling for health/telemetry; clear and suppress proximity output | Sample and allow local output |
| missing/stale | Bus-information gate closed; fallback behavior is `MOVING` | Sample and allow local proximity output | Sample and allow local output |

A command suppressed while moving advances `lastSeq` immediately. It can never replay simply because activity later changes to still.

---

## Physical hotspot and relay smoke — 2026-07-18

Tested on the Genesis Mini through an iPhone hotspot with **Maximize Compatibility** enabled. The board joined the 2.4 GHz hotspot, POSTed telemetry to the deployed Vercel route, and established the existing sequence 20 `UNKNOWN` value as a non-rendering baseline. The following live relay edges were then observed over Serial:

| Relay edge | Effective activity | Physical result |
|---|---|---|
| sequence 21, `NUMBER`, route `88`, `conf=high` | service `STILL` | accepted; route-88 waveform appeared on both output telemetry channels |
| sequence 22, same route result | service `MOVING` | consumed and logged as suppressed; both channels remained off |
| sequence 23, `NONE` | service `MOVING` | consumed with no output; shared relay left neutral |

ToF also entered proximity during both phases: it produced local channel-A pulses while `MOVING`, but was logged as suppressed while `STILL`. Microphone frames stayed `HEALTHY` throughout this smoke. This is a bench integration check, not accessibility or outdoor validation.

### ESP32 HTTP gotcha: Vercel uses chunked responses

The deployed `/api/pull` response can omit `Content-Length` and use `Transfer-Encoding: chunked`. Arduino-ESP32 3.3.9 `HTTPClient::getStream()` exposes the raw chunk framing, so passing that stream directly to ArduinoJson fails with `InvalidInput` even though `curl` shows valid JSON. Firmware must first use `HTTPClient::getString()`, which de-chunks the response, enforce the 768-byte response limit, and only then deserialize. A direct `getStream()` regression reproduces as repeated `RELAY rejected=json error=InvalidInput` followed by capped polling backoff.

---

## Telemetry — the POST request body

Send this as the `/api/pull` request body each poll so the debug screen can show what the device is doing. All fields best-effort; the server coerces/defaults anything missing.

```jsonc
{
  "bandRms": 312.4,      // siren band RMS
  "peakHz": 940,         // dominant siren-band bin
  "modIdx": 0.62,        // 2–4 Hz modulation index
  "trend": "rising",     // "rising" | "flat"
  "playing": "NUMBER",   // the pattern currently on the buzzers (PatternId string)
  "tofMm": 842,          // ToF distance
  "upMs": 93000,         // uptime ms
  "rssi": -58            // Wi-Fi RSSI
}
```

`playing` is the full device vocabulary (e.g. `READY`, `DANGER`, `PROXIMITY`, `ACK`, …), not just the cloud six — it reflects what's actually buzzing.

---

## Remove from the old firmware

- Parsing of `mode` / `msg` / `replies` (old contract).
- The `POST /api/reply` call and its endpoint (gone in `www`).
- Anything reading the retired `app-eight-lyart-98.vercel.app`.

---

## One change that makes 300 ms polling viable — TLS keep-alive

The firmware now owns one static `WiFiClientSecure` and one static `HTTPClient`, calls `setReuse(true)`, and never overlaps polls. Healthy cadence is 300 ms; failures use capped 1/2/4/8-second backoff. Wi-Fi/TLS runs only on Core 0 and never blocks local sensor startup.

The relay is a latest-value register, not a queue. If the producer overwrites `BUS` with `WAIT` between polls, firmware cannot recover `BUS`; it can only report a sequence gap. Hold transient `BUS` for at least about one second for the demo, or add queue/ack semantics on the web side.

---

## Keeping the two in lockstep

`contract.ts` is the command-side source of truth. The activity extension must be added there before it is considered deployed. If a field or enum changes, update the fixed firmware structs and host tests in the same change. The `route` buffer, exact route-88 guard, and command/activity sequence independence are the highest-risk drift points.
