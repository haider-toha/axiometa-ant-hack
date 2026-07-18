# Demo Readiness Audit - 2026-07-18

## Scope

Read-only and host-only hardening for the two-phase bus-stop demo. No relay
state was written and no physical device action was taken during this audit.
Haider owns the motion classifier and activity producer.

## Source State

- Base after night-mode merge: `main` commit `993c399`.
- Hardening branch: `feat/demo-flow-hardening`.
- Night mode: merged through PR #15, but **not flashed to the connected board**.
- Local `secrets.h`: absent, so the board was not overwritten with a build that
  would lose hotspot connectivity.

## Live Readiness At 2026-07-18 22:45 UTC

Command:

```bash
cd www
pnpm demo:readiness -- --base-url https://bus-stop-awareness.vercel.app
```

| Gate | Result | Evidence |
|---|---|---|
| Relay monitor `/` | PASS | HTTP 200 HTML |
| Phone camera `/capture` | PASS | HTTP 200 HTML |
| Laptop monitor `/output` | PASS | HTTP 200 HTML |
| Relay `/api/pull` | PASS | HTTP 200 JSON, command contract complete |
| Activity schema | PASS | `MOVING`, `activitySeq=7` |
| Activity freshness | **FAIL** | `activityTs=1784414230934`, about 8.1 minutes old; firmware lease is 120 seconds |
| Debug `/api/state` | PASS | device, detector, and telemetry objects present |

Overall result: **NOT READY** because the activity heartbeat is stale. Haider's
producer must refresh it and provide a fresh transition after the board's first
baseline.

The same read-only state snapshot reported command sequence 24 `NONE`, board
telemetry `playing=NONE`, ToF 276 mm, uptime 2,368,706 ms, and RSSI -67 dBm.
These values prove the existing board was posting telemetry at that instant;
they do not prove the new night-mode image was installed.

## Vision Wiring

The deployed `/capture` JavaScript bundle contains:

```text
https://mohammedhaidertoha--bus-vision.modal.run/ingest
```

A read-only GET returned HTTP 405 with `Allow: POST`, confirming that the
configured endpoint is reachable and expects POST. No image was submitted, so
bus detection and route reading remain **NOT RUN** in this quiet-hours audit.

## Silent Verification

- Readiness probe unit tests: five scenarios pass, including stale activity and
  GET-only enforcement.
- Firmware native suite: pure exact demo sequence passes; no GPIO or sensor
  access.
- Night-mode firmware on merged `main`: 104 native tests pass and
  `board_firmware` builds successfully.
- Web and firmware pull-request CI is included on the hardening branch; GitHub
  execution remains pending until that branch is pushed.

## Physical Checks Not Run

The following were intentionally **NOT RUN** overnight:

- firmware upload or board reset;
- Web Serial connection to the board;
- ToF obstruction or fixed-distance measurement;
- siren playback or microphone false-positive session;
- A4 bus image ingestion through Modal;
- audible `v` mode or emergency-stop actuation.

Morning physical verification must follow [`DEMO-RUNBOOK.md`](../../DEMO-RUNBOOK.md).
