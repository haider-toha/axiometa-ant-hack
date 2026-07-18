# Relay ↔ firmware — what the ESP32 polls

Handoff spec for migrating the wristband firmware onto the live `www` relay. Defines the one HTTP contract the board speaks. The relay side is already deployed and correct; this is the firmware's to-do.

**Source of truth for the types:** [`www/src/lib/contract.ts`](www/src/lib/contract.ts) (`DeviceCommand`, `Telemetry`, `CloudPattern`). Background: [`plan/2026-07-18-bus-stop-situational-awareness.md`](plan/2026-07-18-bus-stop-situational-awareness.md) → "Data Contracts → Contract C".

---

## TL;DR

- **Host:** `bus-stop-awareness.vercel.app`. Set `VERCEL_HOST` to this in `secrets.h`.
- The board **POSTs to `/api/pull` every ~300 ms**; the request body is telemetry, the response is the current command.
- The command shape **changed**. It is now `{ seq, pattern, route, dest, conf, arrivalId, ts }` — **not** the old `{ seq, mode, msg, replies }`. Reparse it.
- **`/api/reply` is gone.** Remove it. Telemetry now rides on the `/api/pull` POST body.
- **`seq` is still the edge-trigger:** only act when `seq` advances past the last one you handled.

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
  "ts": 1784398000652   // ms epoch of the server write — staleness check
}
```

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

Suggested struct (from the plan, Contract C — 24 bytes, no `String`, no heap):

```c
enum : uint8_t { CONF_NONE = 0, CONF_LOW, CONF_HIGH };

struct DeviceCommand {
    long    seq       = 0;
    uint8_t pattern   = PAT_NONE;   // string → enum ONCE, at parse time
    char    route[8]  = {0};        // "88" · "205"
    uint8_t conf      = CONF_NONE;
    long    arrivalId = 0;
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

The old `net.cpp` builds a fresh `HTTPClient` per poll and calls `http.end()`, tearing down the TLS session; each poll then pays a full ECDHE handshake (~300–800 ms on a 240 MHz Xtensa) — which is why the old cadence was 700 ms. **Hoist `HTTPClient` to a static and call `setReuse(true)`** so a poll collapses to one TLS record exchange (~50–200 ms). See the plan, "Camera and transport".

---

## Keeping the two in lockstep

`contract.ts` is the source of truth. If a field or enum changes there, this struct changes with it. The `route` char buffer and the `conf`/`pattern` enums are the parts most likely to drift — grep both files when touching either.
