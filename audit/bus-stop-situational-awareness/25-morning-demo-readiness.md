# Morning Demo Readiness - 2026-07-19

## Scope

Pulled `origin/main` at `cd7dce8`, reviewed Haider's overnight motion/activity
changes, and prepared `fix/morning-demo-audible-default` for the live demo.

## Decisions

- The demo firmware boots in `AUDIBLE` mode. Serial `q` still enters quiet
  telemetry-only mode, and `v` returns to audible output.
- The production relay is `https://tacta.space`. Its host is tracked in
  `network_config.h`; ignored `secrets.h` contains only hotspot credentials.
- Haider's `/capture` page remains the sole activity producer. It must stay open
  after motion detection or a Force action so its 30-second heartbeat remains
  inside the firmware's 120-second activity lease.

## Automated Verification

- Firmware native tests: 111 passed.
- `board_firmware` credentialed build: passed; 16.7% RAM and 87.3% flash.
- Web tests: 289 passed.
- TypeScript, ESLint, and Next.js production build: passed.
- Local pnpm 9 frozen install and readiness command: passed. CI remains pinned
  to pnpm 11.9.0 on Node 22.

## Physical Verification

- Uploaded the credentialed image to `/dev/cu.usbmodem101`; all flash hashes
  verified.
- Board joined the phone hotspot and posted fresh telemetry to `tacta.space`.
  Observed RSSI `-29 dBm` after reboot, fresh low uptime, live ToF distance, and
  healthy PDM microphone frames.
- Brave opened `https://tacta.space/output`, connected to the ESP32 over Web
  Serial, and displayed live idle telemetry plus repeated P1 `2350 Hz`
  proximity transitions.
- A production `MOVING` activity smoke advanced `activitySeq` to 63 and the
  readiness gate printed `READY` for all routes and contracts.

## Operator Requirement

The one-time activity smoke is not a replacement for the phone producer. Before
the audience run, open `https://tacta.space/capture` on the phone, start motion
detection or choose Force moving, and keep that page active. Run
`pnpm demo:readiness -- --base-url https://tacta.space` immediately before the
demo and require `READY`.
