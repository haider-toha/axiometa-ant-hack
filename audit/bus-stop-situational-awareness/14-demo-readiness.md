# Demo Readiness Audit - 2026-07-18

## Scope

Read-only and host-only hardening for the two-phase bus-stop demo. No relay
state was written and no physical device action was taken during this audit.
Haider owns the motion classifier and activity producer.

## Source State

- Base after night-mode merge: `main` commit `993c399`.
- Hardening branch: `feat/demo-flow-hardening`.
- Night mode: merged through PR #15 and flashed after the test hotspot
  credentials became available.
- Local `secrets.h`: present only as an ignored file. The exact SSID was
  confirmed from the Mac preferred-network list; neither SSID nor password is
  tracked or present in the PR diff.

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

The initial read-only state snapshot reported command sequence 24 `NONE`, board
telemetry `playing=NONE`, ToF 276 mm, uptime 2,368,706 ms, and RSSI -67 dBm.
Those values were captured before the night-mode image was installed.

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
- Night-mode firmware on merged `main`: 105 native tests pass and
  `board_firmware` builds successfully.
- Web suite: 34 tests, TypeScript, lint, and production build pass. The local
  build prints the documented missing-Upstash warnings and completes.
- Pull-request CI: web and firmware jobs both pass on PR #16.

## Night-Mode Board Verification At 22:53 UTC

The credentialed `board_firmware` image built at 87.3% flash, uploaded through
`/dev/cu.usbmodem1101`, and rejoined the phone hotspot. The next production
telemetry snapshot reported uptime 7,193 ms and RSSI -52 dBm, proving that the
new image booted and restored outbound relay traffic.

A service-Serial rehearsal asserted `q` before every pattern and checked:

- MOVING service override;
- logical LEFT and RIGHT channel simulations;
- STILL service override;
- accepted BUS, WAIT, and NUMBER 88 commands while STILL;
- BUS suppression after returning to MOVING;
- final night-mode state.

All nine control checks passed. The board emitted 69 valid `TACTA_OUTPUT`
records containing both left and right logical activity while reporting
`hardware=muted`. The temporary service override was then cleared with `c`, and
`q` was reasserted so Haider's relay activity owns the board in night mode.

A subsequent 120.6-second production soak collected 168 `/api/state` samples
with zero failures. Board uptime increased monotonically from 224,562 to
343,859 ms, RSSI ranged from -66 to -41 dBm, and `playing` remained `NONE` with
no natural output transitions. A human in the room still needs to confirm
inaudibility; software evidence cannot measure sound pressure.

## Output-Page Verification

The deployed `/output` route returned HTTP 200 with server-rendered `Output
monitor`, P1, and P3 content. All 15 referenced Next.js scripts, styles, and
icon assets returned HTTP 200. Component/parser tests pass, and the real board
emitted protocol-v1 records for both channels during the night rehearsal.

The browser-control surface was unavailable in this session, so selecting the
physical serial port through Chrome's permission dialog remains a morning
manual check.

## Physical Checks Not Run

The following were intentionally **NOT RUN** overnight:

- Web Serial connection to the board;
- ToF obstruction or fixed-distance measurement;
- siren playback or microphone false-positive session;
- A4 bus image ingestion through Modal;
- audible `v` mode or emergency-stop actuation.

Morning physical verification must follow [`DEMO-RUNBOOK.md`](../../DEMO-RUNBOOK.md).
