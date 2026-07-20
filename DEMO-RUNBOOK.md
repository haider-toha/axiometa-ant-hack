# Tacta Demo Runbook

Tacta is an open project toward one wearable that gives DeafBlind people
situational awareness through touch. It fuses cameras, microphones, and depth
sensors and delivers the result as vibration. This runbook drives the hackathon
demo. The demo hardcodes one concrete scene, reading a specific bus at a stop,
route `88` / `Clapham Common`. That scene is one hardcoded example of the
product, not the product itself.

The cane remains the primary mobility aid. The single forward ToF sensor detects
clearance only. It cannot choose a safe left or right bypass. The buzzers are
audible stand-ins for two future vibration channels. The first-hour tactile test
failed, so treat them as proxies only. Nothing here is validated with DeafBlind
users.

The live site tacta.space serves the pitch deck as the landing page. The demo
tools live at `/capture`, `/output`, and `/monitor`.

## Readiness Gate

Run the readiness command from `app/`.

```bash
pnpm demo:readiness -- --base-url https://tacta.space
```

Do not start the audience demo until it prints `READY`. Haider owns the phone
motion classifier and the relay activity heartbeat. This repo consumes that
state. It does not replace the producer.

The morning demo firmware boots in `AUDIBLE` mode. This stops a reset or power
cycle from disabling P1 and P3 without warning. Send service Serial `q` for a
deliberate quiet rehearsal. Sensors, relay handling, and `TACTA_OUTPUT`
telemetry continue while the buzzer GPIO drives stay muted.

## Hardware And Topology

| Port | Module | Firmware signal |
|---|---|---|
| P1 | AX22-0018 passive buzzer | GPIO3, left/channel A |
| P2 | VL53L0CX ToF | SDA GPIO10, SCL GPIO11, XSHUT GPIO6 |
| P3 | AX22-0018 passive buzzer | GPIO16, right/channel B |
| P4 | AX22-0044 PDM microphone | CLK GPIO18, data GPIO17, select GPIO1 high, I2S0 |

The phone runs Chrome or Safari at the deployed `/capture` route on a 2.4 GHz
hotspot. The ESP32 joins the phone hotspot and polls Vercel outbound only. The
MacBook powers the ESP32 over USB-C. The MacBook opens the deployed `/output`
route in desktop Chrome for Web Serial.

PlatformIO Serial Monitor and `/output` cannot own the USB serial port at the
same time. Close one before you open the other.

## Morning Setup

1. Pull `main` and confirm it includes the audible-default demo firmware.
2. Create the ignored file `firmware/braille_wearable/src/secrets.h` from
   `secrets.example.h`. Add only the phone hotspot SSID and password. The file
   `network_config.h` tracks the deployed relay host.
3. Enable the phone hotspot. On iPhone, enable **Maximize Compatibility**. On
   Android, choose the 2.4 GHz band.
4. Build and upload `board_firmware`.

   ```bash
   cd firmware/braille_wearable
   $HOME/.platformio/penv/bin/pio run -e board_firmware
   $HOME/.platformio/penv/bin/pio run -e board_firmware -t upload --upload-port /dev/cu.usbmodem1101
   ```

5. Confirm the board boots in `AUDIBLE` mode. Send `q` only for a quiet
   rehearsal. Send `v` before the audience demo.
6. Open `/capture` on the phone, grant camera access, and frame the A4 route prop.
7. Open `/output` in desktop Chrome. Select the ESP32. Confirm live idle
   telemetry. The display shows the requested logical frequencies in either
   output mode.
8. Run the readiness command until every route, contract, and activity
   freshness check passes.
9. Wait for the board to record its first activity baseline. Then make Haider's
   producer send a fresh `MOVING` transition. A baseline alone does not grant
   cloud control.

## Exact Demo Sequence

1. **Moving.** Confirm `/api/pull` reports fresh `MOVING`. Bring a blockade into
   the forward ToF zone. Expect P1 proximity pulses on `/output`. Choose the
   bypass with the cane and verify it. Then clear the blockade.
2. **Ambulance.** In daytime only, play the validated siren sample at the
   rehearsed level. Expect the local siren output to preempt proximity and
   signal a stop. Do not claim general environmental-sound recognition.
3. **Still.** Haider's producer changes activity to fresh `STILL`. Confirm the
   readiness probe still passes. Confirm the board suppresses ToF output.
4. **Direction (audit 23).** While `STILL`, hold the route prop to one side of
   the camera frame. Wait for the three-frame confirmation. Then expect `LEFT`,
   `RIGHT`, or `AHEAD` on `/output`. Bearings deliver in **both** activity
   phases. The user scans for the target while standing still. While an arrival
   or route reading is active, that information takes the shared channel first.
   The capture page then shows the direction as `held (…)`. The "Force send"
   toggle on `/capture` makes the direction outrank it.
5. **Arrival.** Move the printed route-88 prop steadily through the phone camera.
   Expect `BUS`, then `WAIT`, then a high-confidence `NUMBER` with route `88`.
6. **Output.** Confirm `/output` shows both logical channels and the pulse
   history. In audible mode, the buzzers mirror those signals. In night mode,
   the buzzers stay muted.
7. **Reset.** Remove the prop. Return activity to fresh `MOVING` before the next
   run.

## Output Controls

Use service Serial only while `/output` is disconnected.

| Key | Result |
|---|---|
| `q` | Night mode. Hardware muted, logical patterns and telemetry continue |
| `v` | Audible mode. Energize the buzzers for a daytime rehearsal |
| `x` | Emergency stop. Clear all output, sensing continues |
| `o` | Resume output processing after `x` |
| `n` / `s` | Diagnostic MOVING/STILL override |
| `c` | Clear diagnostic override and return control to Haider's relay state |
| `b` / `w` / `8` | Diagnostic BUS/WAIT/NUMBER-88 inputs |

The Serial connection can reset the board when you open it. The morning demo
build returns to audible output after that reset. Send a control, then close
Serial Monitor before you reconnect `/output`.

## Fallbacks And Stop

- For stale or missing activity, use `n` or `s` only as a disclosed diagnostic
  fallback. Do not present it as phone motion classification.
- For a vision or Modal failure, use `b`, `w`, and `8` only as a disclosed
  board-only fallback. Do not claim the board read the printed route.
- For a deployed `/output` failure, run `pnpm dev -- -p 3012` from `app/`. Then
  open `http://localhost:3012/output` in Chrome.
- For an unreadable or low-confidence route, expect `UNKNOWN`. Never substitute
  `88`.
- For an unexpected sound, send `q`. If output continues, send `x`. Then
  disconnect USB-C power.
- For a full stop, stop camera capture, return relay activity to `MOVING`, send
  `q`, disconnect `/output`, and unplug the board.

## Five-Minute Rehearsal

- The readiness command prints `READY`.
- The board holds hotspot credentials and starts in audible mode.
- `/capture` sees the complete A4 prop in stable light.
- `/output` receives fresh telemetry in desktop Chrome.
- Fresh `MOVING` produces the ToF visualization. Fresh `STILL` suppresses it.
- `BUS`, `WAIT`, and `NUMBER` 88 arrive in order while `STILL`.
- `q` and `x` stop hardware output as expected before you admit an audience.
