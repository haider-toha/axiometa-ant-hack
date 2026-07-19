# Bus-Stop Demo Runbook

Use this sequence for the route `88` / `Clapham Common` demonstration. The cane
remains the primary mobility aid. The single forward ToF sensor detects
clearance; it cannot choose a safe left or right bypass.

## Readiness Gate

From `www/`, run:

```bash
pnpm demo:readiness -- --base-url https://bus-stop-awareness.vercel.app
```

Do not start the audience demo until it prints `READY`. Haider owns the phone
motion classifier and the relay activity heartbeat. This repo consumes that
state; it does not replace the producer.

The firmware merged in `main` boots in `NIGHT` mode. Logical patterns, sensors,
relay handling, and `TACTA_OUTPUT` telemetry remain active, but P1 and P3 are
electrically muted. This is the correct mode for silent rehearsal. The board
must be flashed with that build before relying on this guarantee.

## Hardware And Topology

| Port | Module | Firmware signal |
|---|---|---|
| P1 | AX22-0018 passive buzzer | GPIO3, left/channel A |
| P2 | VL53L0CX ToF | SDA GPIO10, SCL GPIO11, XSHUT GPIO6 |
| P3 | AX22-0018 passive buzzer | GPIO16, right/channel B |
| P4 | AX22-0044 PDM microphone | CLK GPIO18, data GPIO17, select GPIO1 high, I2S0 |

- Phone: 2.4 GHz hotspot plus Chrome/Safari at the deployed `/capture` route.
- ESP32: joins the phone hotspot and polls Vercel outbound only.
- MacBook: powers the ESP32 over USB-C and opens the deployed `/output` route
  in desktop Chrome for Web Serial.

PlatformIO Serial Monitor and `/output` cannot own the USB serial port at the
same time. Close one before opening the other.

## Morning Setup

1. Pull `main` and confirm it includes the night-mode firmware.
2. Create ignored `firmware/braille_wearable/src/secrets.h` from
   `secrets.example.h` with the phone hotspot SSID/password and deployed host.
3. Enable the phone hotspot. On iPhone enable **Maximize Compatibility**; on
   Android choose the 2.4 GHz band.
4. Build and upload `board_firmware`:

   ```bash
   cd firmware/braille_wearable
   $HOME/.platformio/penv/bin/pio run -e board_firmware
   $HOME/.platformio/penv/bin/pio run -e board_firmware -t upload --upload-port /dev/cu.usbmodem1101
   ```

5. Keep the board in its default `NIGHT` mode for the first rehearsal.
6. Open `/capture` on the phone, grant camera access, and frame the A4 bus prop.
7. Open `/output` in desktop Chrome, select the ESP32, and confirm live idle
   telemetry. In night mode the display shows requested logical frequencies
   even though the buzzers remain physically muted.
8. Run the readiness command until every route, contract, and activity
   freshness check passes.
9. After the board has observed its first activity baseline, make Haider's
   producer send a fresh `MOVING` transition. A baseline alone does not grant
   cloud control.

## Exact Demo Sequence

1. **Moving:** Confirm `/api/pull` reports fresh `MOVING`. Bring a blockade into
   the forward ToF zone. Expect P1 proximity pulses on `/output`; choose and
   verify the bypass with the cane, then clear the blockade.
2. **Ambulance:** In daytime only, play the validated siren sample at the
   rehearsed level. Expect local siren output to preempt proximity and signal a
   stop. Do not claim general environmental-sound recognition.
3. **Still:** Haider's producer changes activity to fresh `STILL`. Confirm the
   readiness probe still passes and ToF output is suppressed.
4. **Bus:** Move the printed route-88 bus prop steadily through the phone camera.
   Expect `BUS`, then `WAIT`, then high-confidence `NUMBER` with route `88`.
5. **Output:** Confirm `/output` visualizes both logical channels and the pulse
   history. In audible mode the buzzers mirror those signals; in night mode they
   remain muted.
6. **Reset:** Remove the prop and return activity to fresh `MOVING` before the
   next run.

## Output Controls

Use service Serial only while `/output` is disconnected:

| Key | Result |
|---|---|
| `q` | Night mode: hardware muted, logical patterns and telemetry continue |
| `v` | Audible mode: energize the buzzers for a daytime rehearsal |
| `x` | Emergency stop: clear all output; sensing continues |
| `o` | Resume output processing after `x` |
| `n` / `s` | Diagnostic MOVING/STILL override |
| `c` | Clear diagnostic override and return control to Haider's relay state |
| `b` / `w` / `8` | Diagnostic BUS/WAIT/NUMBER-88 inputs |

Opening Serial can reset the board. With the new build that reset is silent
because night mode is the boot default. After sending a control, close Serial
Monitor before reconnecting `/output`.

## Fallbacks And Stop

- Stale or missing activity: use `n`/`s` only as a disclosed diagnostic
  fallback. Do not present it as phone motion classification.
- Vision or Modal failure: use `b`, `w`, and `8` only as a disclosed board-only
  fallback. Do not claim the printed route was read.
- Deployed `/output` failure: from `www/`, run `pnpm dev -- -p 3012` and open
  `http://localhost:3012/output` in Chrome.
- Unreadable or low-confidence route: expect `UNKNOWN`; never substitute `88`.
- Unexpected sound: send `q`. If output continues, send `x`, then disconnect
  USB-C power.
- Full stop: stop camera capture, return relay activity to `MOVING`, send `q`,
  disconnect `/output`, and unplug the board.

## Five-Minute Rehearsal

- Readiness command prints `READY`.
- Board is flashed with hotspot credentials and starts silently.
- `/capture` sees the complete A4 prop in stable light.
- `/output` receives fresh telemetry in desktop Chrome.
- Fresh `MOVING` produces ToF visualization; fresh `STILL` suppresses it.
- BUS, WAIT, and NUMBER 88 arrive in order while `STILL`.
- `q` and `x` stop hardware output as expected before admitting an audience.
