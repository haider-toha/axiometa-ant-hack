# Relay ↔ firmware — what the ESP32 polls

Handoff spec for the wristband firmware on the live `www` relay. The command side is deployed. The independent `STILL`/`MOVING` activity extension described below is still a web-owned dependency; until it lands, service Serial provides deterministic mode control.

**Source of truth for the types:** [`www/src/lib/contract.ts`](www/src/lib/contract.ts) (`DeviceCommand`, `Telemetry`, `CloudPattern`). Background: [`plan/2026-07-18-bus-stop-situational-awareness.md`](plan/2026-07-18-bus-stop-situational-awareness.md) → "Data Contracts → Contract C".

---

## TL;DR

- **Host:** `bus-stop-awareness.vercel.app`. Set `VERCEL_HOST` to this in `secrets.h`.
- The board **POSTs to `/api/pull` every ~300 ms**; the request body is telemetry, the response is the current command.
- The command shape **changed**. It is now `{ seq, pattern, route, dest, conf, arrivalId, ts }` — **not** the old `{ seq, mode, msg, replies }`. Reparse it.
- The pending activity extension adds `{ activity, activitySeq, activityTs }` alongside the command. Its version and freshness are independent from command `seq`/`ts`.
- **`/api/reply` is gone.** Remove it. Telemetry now rides on the `/api/pull` POST body.
- **`seq` is still the edge-trigger:** only act when `seq` advances past the last one you handled.
- The board consumes new command edges in both phases. `MOVING` suppresses `BUS`, `WAIT`, `NUMBER`, and `UNKNOWN`; `STILL` accepts them. `ERROR` is global.
- Only wire route `"88"` with `conf="high"` may drive the hardcoded route-88 pattern. A different route or lower confidence is consumed and logged without a false `88` signal.
- The first command and activity snapshots after boot or a long outage are baselines and never fire output.

The old speech app at `app-eight-lyart-98.vercel.app` is **retired** — do not poll it.

---

## The poll

`POST https://bus-stop-awareness.vercel.app/api/pull` every ~300 ms.

- **Request body** = telemetry (below). The relay stores it for the debug screen, then returns the command.
- **Response** = the current `DeviceCommand`.
- `GET /api/pull` also works (returns the command, writes no telemetry) — handy for `curl` smoke.

```bash
curl -fsS https://bus-stop-awareness.vercel.app/api/pull
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
  "activity": "STILL", // pending web extension: "MOVING" | "STILL"
  "activitySeq": 4,     // changes only on an activity transition
  "activityTs": 1784397999000 // activity write time; independent of command ts
}
```

The currently deployed response may omit all three activity fields. Firmware continues parsing commands but keeps the bus-information gate closed unless service Serial has explicitly selected `STILL`. The first valid activity snapshot establishes a non-rendering baseline; the phone/operator must then produce a fresh transition. A received transition has a 120-second demo lease, after which the board falls back to `MOVING` unless another transition or service override refreshes control.

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
| `activity` | string | `uint8_t` enum | Pending extension. Exact `MOVING` or `STILL`; missing/invalid closes the bus gate. |
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

The relay only ever sends these six. Map each to your `PAT_*`:

| `pattern` | Meaning | Device pattern |
| --- | --- | --- |
| `NONE` | no active command | idle |
| `BUS` | a bus is arriving | P5 BUS ARRIVING |
| `NUMBER` | route is in `route` | P6 ROUTE NUMBER |
| `WAIT` | reading the route now | P7 WAIT |
| `UNKNOWN` | couldn't read / low confidence | P8 UNKNOWN |
| `ERROR` | degraded | P10 ERROR |

The **device-local** patterns — READY, DANGER, SIREN, ATTENTION, PROXIMITY, ACK — are generated on the board (siren FFT, ToF, button) and **never come over the wire**. Don't expect them in `pattern`.

`LEFT`, `RIGHT`, and `AHEAD` are also not wire values. The current device has one forward ToF zone, so it cannot determine a safe bypass side. Its existing P1/P3 direction tones are service-only conceptual-channel simulations.

### Activity gate and local sensing

| Effective activity | Relay output | ToF | Siren |
|---|---|---|---|
| `MOVING` | Consume but suppress bus-information patterns; accept `ERROR` | Sample and allow local proximity output; the cane remains primary | Sample and allow local output |
| `STILL` | Accept fresh bus-information patterns and `ERROR` | Continue sampling for health/telemetry; clear and suppress proximity output | Sample and allow local output |
| missing/stale | Bus-information gate closed; fallback behavior is `MOVING` | Sample and allow local proximity output | Sample and allow local output |

A command suppressed while moving advances `lastSeq` immediately. It can never replay simply because activity later changes to still.

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
