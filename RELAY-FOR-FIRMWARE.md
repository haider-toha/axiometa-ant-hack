# Relay to firmware command contract

This is the handoff spec for the wristband firmware on the live `app` relay.
Commands and the independent `STILL` and `MOVING` activity channel are deployed.
Haider owns the phone motion classifier and the activity producer. Service
Serial remains available for deterministic board testing.

Tacta gives situational awareness through touch, delivered as vibration. The
demo hardcodes one concrete scene, reading a specific bus at a stop, route `88`
to `Clapham Common`. That scene is one hardcoded example. The command vocabulary
below is the real product surface.

The source of truth for the types is
[`app/src/lib/contract.ts`](app/src/lib/contract.ts). It exports `DeviceCommand`,
`Telemetry`, and `CloudPattern`. For background, read
[`plan/2026-07-18-situational-awareness.md`](plan/2026-07-18-situational-awareness.md).
See "Data Contracts, Contract C".

---

## Summary

- The host is `tacta.space`, tracked in `network_config.h`. That site serves the
  pitch deck as its landing page and the demo tools at `/capture` and `/output`. The file `secrets.h` contains only hotspot credentials.
- The board **POSTs to `/api/pull` about every 300 ms**. The request body is
  telemetry. The response is the current command.
- The response is `{ seq, pattern, route, dest, conf, arrivalId, ts, activity, activitySeq, activityTs }`,
  **not** the old `{ seq, mode, msg, replies }`.
- Activity version and freshness are independent from command `seq` and `ts`. An
  activity heartbeat must never re-fire a command.
- **`/api/reply` is gone.** Remove it. Telemetry now rides on the `/api/pull`
  POST body.
- **`seq` is still the edge-trigger.** Act only when `seq` advances past the last
  one you handled.
- The relay accepts camera bearings (`LEFT`, `RIGHT`, `AHEAD`) in both known
  activity phases. `MOVING` suppresses `BUS`, `WAIT`, `NUMBER`, and `UNKNOWN`.
  `STILL` accepts them. `ERROR` is global.
- Only wire route `"88"` with `conf="high"` may drive the hardcoded route-88
  pattern. The board consumes and logs a different route or lower confidence
  without a false `88` signal.
- The first command and activity snapshots after boot or a long outage are
  baselines. They never fire output.

The old speech app at `app-eight-lyart-98.vercel.app` is **retired**. Do not poll
it.

---

## The poll

`POST https://tacta.space/api/pull` about every 300 ms.

- The **request body** is telemetry (see below). The relay stores it for the
  debug screen, then returns the command.
- The **response** is the current `DeviceCommand`.
- `GET /api/pull` also works. It returns the command and writes no telemetry,
  which is handy for a `curl` smoke test.

```bash
curl -fsS https://tacta.space/api/pull
# {"seq":20,"pattern":"UNKNOWN","route":"","dest":"","conf":"low","arrivalId":1,"ts":1784398000652}
```

### Response, the command to parse

```jsonc
{
  "seq": 20,            // monotonic. Only act when it advances. THE trigger.
  "pattern": "NUMBER",  // CloudPattern (see below)
  "route": "88",        // always a JSON string, 1 to 3 digits; "" unless pattern==NUMBER
  "dest": "Clapham Common", // debug-screen only, parse and DISCARD on device
  "conf": "high",       // "high" | "low" | ""
  "arrivalId": 1,       // increments once per arrival
  "ts": 1784398000652,  // ms epoch of the server write, command timestamp
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

### JSON field to firmware struct

| JSON field | Type on wire | Firmware | Notes |
| --- | --- | --- | --- |
| `seq` | number | `long` | Edge-trigger. `if (seq <= s_lastSeq) return;` then `s_lastSeq = seq`. |
| `pattern` | string | `uint8_t` enum | Map the string to `PAT_*` **once**, at parse time. Never keep the `String`. |
| `route` | string | `char[8]` | Always a JSON string, even `"88"`. Digits only (server rejects letters). Copy into a fixed buffer, no heap. |
| `dest` | string | none | **Parse and discard.** No display on the device. |
| `conf` | string | `uint8_t` enum | `""` becomes `CONF_NONE`, `"low"` becomes `CONF_LOW`, `"high"` becomes `CONF_HIGH`. |
| `arrivalId` | number | `long` | Use it to de-duplicate repeated arrivals if needed. |
| `ts` | number | `long`/`int64` | Optional staleness guard. Ignore commands older than N seconds. |
| `activity` | string | `uint8_t` enum | Exact `MOVING` or `STILL`. Missing or invalid falls back to `MOVING`. |
| `activitySeq` | number | `uint32_t` | Independent edge. Must not increment command `seq`. |
| `activityTs` | number | `int64_t` | Activity write time. Must not refresh command `ts`. |

The firmware uses this fixed-size command struct, with no `String` and no heap.

```c
enum : uint8_t { CONF_NONE = 0, CONF_LOW, CONF_HIGH, CONF_INVALID };

struct DeviceCommand {
    uint32_t seq      = 0;
    uint8_t pattern   = PAT_INVALID; // string to enum ONCE, at parse time
    char    route[8]  = {0};        // "88" or "205"
    uint8_t confidence = CONF_INVALID;
    uint32_t arrivalId = 0;
    int64_t serverTs  = 0;
};
```

### `pattern` values, the cloud vocabulary

The relay sends these nine values. Map each one to the corresponding firmware enum.

| `pattern` | Meaning | Device pattern |
| --- | --- | --- |
| `NONE` | no active command | idle |
| `LEFT` | camera target is left of frame | P1 proxy pattern |
| `RIGHT` | camera target is right of frame | P3 proxy pattern |
| `AHEAD` | camera target is centred | both-channel proxy pattern |
| `BUS` | arrival detected | P5 BUS ARRIVING |
| `NUMBER` | route is in `route` | P6 ROUTE NUMBER |
| `WAIT` | reading the route now | P7 WAIT |
| `UNKNOWN` | could not read or low confidence | P8 UNKNOWN |
| `ERROR` | degraded | P10 ERROR |

The board generates the **device-local** patterns READY, DANGER, SIREN,
ATTENTION, PROXIMITY, and ACK. They **never come over the wire**. Camera bearings
are advisory target-location cues. The single forward ToF zone never derives a
bypass direction.

### Activity gate and local sensing

| Effective activity | Relay output | ToF | Siren |
|---|---|---|---|
| `MOVING` | Consume but suppress arrival-information patterns. Accept `ERROR`. | Sample and allow local proximity output. The cane remains primary. | Sample and allow local output. |
| `STILL` | Accept fresh arrival-information patterns and `ERROR`. | Continue to sample for health and telemetry. Clear and suppress proximity output. | Sample and allow local output. |
| missing or stale | Arrival-information gate closed. Fallback behavior is `MOVING`. | Sample and allow local proximity output. | Sample and allow local output. |

A command suppressed while moving advances `lastSeq` immediately. It can never
replay simply because activity later changes to still.

---

## Physical hotspot and relay smoke, 2026-07-18

We tested this on the Genesis Mini through an iPhone hotspot with **Maximize
Compatibility** enabled. The board joined the 2.4 GHz hotspot. It POSTed
telemetry to the deployed Vercel route. It established the existing sequence 20
`UNKNOWN` value as a non-rendering baseline. We then observed the following live
relay edges over Serial.

| Relay edge | Effective activity | Physical result |
|---|---|---|
| sequence 21, `NUMBER`, route `88`, `conf=high` | service `STILL` | accepted. The route-88 waveform appeared on both output telemetry channels |
| sequence 22, same route result | service `MOVING` | consumed and logged as suppressed. Both channels remained off |
| sequence 23, `NONE` | service `MOVING` | consumed with no output. The shared relay stayed neutral |

ToF also entered proximity during both phases. It produced local channel-A
pulses while `MOVING`. The board logged it as suppressed while `STILL`.
Microphone frames stayed `HEALTHY` throughout this smoke. This is a bench
integration check, not accessibility or outdoor validation.

### ESP32 HTTP gotcha, Vercel uses chunked responses

The deployed `/api/pull` response can omit `Content-Length` and use
`Transfer-Encoding: chunked`. Arduino-ESP32 3.3.9 `HTTPClient::getStream()`
exposes the raw chunk framing. So a direct pass of that stream to ArduinoJson
fails with `InvalidInput`, even though `curl` shows valid JSON. Firmware must
first call `HTTPClient::getString()`, which de-chunks the response. Then it
enforces the 768-byte response limit. Only then does it deserialize. A direct
`getStream()` regression reproduces as repeated
`RELAY rejected=json error=InvalidInput`, then capped poll backoff.

---

## Telemetry, the POST request body

Send this as the `/api/pull` request body on each poll. The debug screen then
shows what the device does. All fields are best-effort. The server coerces or
defaults anything missing.

```jsonc
{
  "bandRms": 312.4,      // siren band RMS
  "peakHz": 940,         // dominant siren-band bin
  "modIdx": 0.62,        // 2 to 4 Hz modulation index
  "trend": "rising",     // "rising" | "flat"
  "playing": "NUMBER",   // the pattern currently on the buzzers (PatternId string)
  "tofMm": 842,          // ToF distance
  "upMs": 93000,         // uptime ms
  "rssi": -58            // Wi-Fi RSSI
}
```

`playing` is the full device vocabulary (for example `READY`, `DANGER`,
`PROXIMITY`, `ACK`, and more), not just the cloud six. It reflects what actually
buzzes.

---

## Remove from the old firmware

- Remove the parse code for `mode`, `msg`, and `replies`. These are the old
  contract.
- Remove the `POST /api/reply` call and its endpoint. It is gone in `app`.
- Remove anything that reads the retired `app-eight-lyart-98.vercel.app`.

---

## TLS keep-alive makes 300 ms polls viable

The firmware now owns one static `WiFiClientSecure` and one static `HTTPClient`.
It calls `setReuse(true)` and never overlaps polls. The healthy cadence is
300 ms. Failures use a capped 1, 2, 4, and 8-second backoff. Wi-Fi and TLS run
only on Core 0 and never block local sensor startup.

The relay is a latest-value register, not a queue. If the producer overwrites
`BUS` with `WAIT` between polls, firmware cannot recover `BUS`. It can only
report a sequence gap. Hold a transient `BUS` for at least about one second for
the demo. Or add queue and ack semantics on the web side.

---

## Keep the two in lockstep

`contract.ts` is the command-side source of truth. Add the activity extension
there before you treat it as deployed. If a field or enum changes, update the
fixed firmware structs and host tests in the same change. The `route` buffer, the
exact route-88 guard, and the command and activity sequence independence are the
highest-risk drift points.
