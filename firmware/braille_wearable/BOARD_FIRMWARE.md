# Integrated Board Firmware

`board_firmware` is the current ESP32-S3 physical workstream. It replaces the
isolated buzzer and ToF runners for combined testing.

## Module Map

| Slot | Module | Signal mapping |
|---|---|---|
| P1 | AX22-0018 passive buzzer | GPIO3, 2350 Hz channel-A audio proxy |
| P2 | AX22-0015 VL53L0CX ToF | SDA GPIO10, SCL GPIO11, XSHUT GPIO6 |
| P3 | AX22-0018 passive buzzer | GPIO16, 3050 Hz channel-B audio proxy |
| P4 | AX22-0044 PDM microphone | CLK GPIO18, DT GPIO17, SL GPIO1 driven high; I2S0 pulled-high slot |

The firmware boots operationally without a button. The buzzers simulate future
vibration channels; they are not tactile actuators.

Sensor servicing starts immediately. The READY tone is deferred for about 1.1
seconds so the microphone can bootstrap its acoustic reference without blocking
the ToF loop.

## Build And Upload

```bash
cd firmware/braille_wearable
$HOME/.platformio/penv/bin/pio test -e native
$HOME/.platformio/penv/bin/pio run -e board_firmware
$HOME/.platformio/penv/bin/pio run -e board_firmware -t upload --upload-port /dev/cu.usbmodem1101
$HOME/.platformio/penv/bin/pio device monitor -e board_firmware --port /dev/cu.usbmodem1101 --baud 115200
```

## Current Interaction

The board boots operationally with an effective `MOVING` fallback while the independent cloud activity state is missing, stale, or establishing its first baseline. A fresh relay activity transition can take control; service Serial can override it for deterministic testing.

| Serial | Relay equivalent | Board behavior |
|---|---|---|
| `s` | fresh `STILL` activity | Set service `STILL`; accept fresh BUS/WAIT/NUMBER/UNKNOWN and suppress ToF output |
| `n` | fresh `MOVING` activity | Set service `MOVING`; suppress bus information and enable ToF output |
| `c` | relay owns activity | Clear the service override; use a fresh relay activity lease or the safe `MOVING` fallback |
| `l` / `r` / `a` | none | Play conceptual channel tones in `MOVING`; service simulation only, not sensed navigation |
| `b` / `w` | BUS / WAIT | Exercise the same activity and local-priority gate as relay commands |
| `8` / `u` / `e` | NUMBER 88 / UNKNOWN / ERROR | Exercise route 88, unreadable, or global error output |
| `x` | Service emergency stop | Stop all output immediately; sensing remains active |
| `o` | Service resume | Re-enable output after `x` |
| `h` | Service only | Print controls |

The relay parser accepts exactly `NONE`, `BUS`, `NUMBER`, `WAIT`, `UNKNOWN`, and `ERROR`. It rejects `LEFT`, `RIGHT`, `AHEAD`, and unknown strings. The first command snapshot is a non-rendering baseline. Commands received while `MOVING` still advance sequence state, so switching to `STILL` cannot replay an earlier camera result.

The route waveform is hardcoded for route 88. Firmware requires the `NUMBER` payload route to be exactly `"88"` and its confidence to be `"high"`; another number or lower confidence is consumed without playing the route-88 output.

The ToF sensor continues sampling in both activities. Proximity output exists only in `MOVING`, where it provides supplementary forward-clearance feedback while the cane remains the primary mobility aid. Entering `STILL` clears proximity output immediately so nearby people, shelters, and street furniture do not create nuisance alerts. One forward ToF zone cannot choose whether left or right is safe.

The PDM microphone remains active in both activities. I2S0 captures 512-sample
frames at 16 kHz on a Core 1 worker. A Hann FFT supplies local siren features:

- `ATTENTION` requires about 0.5 seconds of elevated, tonal energy with a short
  directional frequency sweep.
- `SIREN_WARNING` or `DANGER` requires at least 1.02 seconds of elevated energy
  plus a yelp-like envelope or a wider monotonic peak sweep.
- Siren safety output preempts proximity and cloud cues. Proximity outranks the
  lower-severity confirmed warning and resumes after a safety pattern clears.

Serial telemetry reports capture health, FFT features, and classifier decisions.
The service stop command `x` silences outputs without stopping either sensor,
which is useful for environmental false-positive testing. On `o`, a siren that
is still classified active is eligible to resume immediately.

## Remaining Board Work

1. Coordinate a board session, provide ignored `secrets.h` with the phone hotspot credentials, and run the end-to-end relay/activity soak. No upload or reboot should happen while another developer owns the board.
2. Land the web-owned independent `activity`, `activitySeq`, and `activityTs` fields. The currently deployed command response omits them, so use `s`/`n` until that endpoint update is live.
3. Validate the local siren classifier against labelled real siren recordings
   and a longer representative environmental-negative set.
4. Confirm the web producer holds transient BUS long enough for a 300 ms latest-value poll, or add queue/ack semantics.

## Phone Hotspot Configuration

Copy `src/secrets.example.h` to ignored `src/secrets.h`. On iPhone enable **Maximize Compatibility**; on Android select the **2.4 GHz** hotspot band. A checkout without secrets still builds and boots local-only, logging `RELAY configured=0`.
