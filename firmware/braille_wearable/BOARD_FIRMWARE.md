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

Sensor servicing starts immediately. The demo firmware boots in `AUDIBLE`
output mode so a reset or power cycle cannot silently disable the buzzer proxy
channels. Use service Serial `q` to enter `NIGHT` mode when quiet testing is
required; logical patterns and `TACTA_OUTPUT` telemetry continue while both
buzzer GPIO drives are held off. Use `v` to return to audible output.

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
| `q` | Service only | Enter `NIGHT` mode; mute both buzzer GPIOs while patterns, sensors, relay handling, and output telemetry continue |
| `v` | Service only | Enter `AUDIBLE` mode; send the current logical pattern to the buzzers |
| `h` | Service only | Print controls |

The relay parser accepts exactly `NONE`, `LEFT`, `RIGHT`, `AHEAD`, `BUS`,
`NUMBER`, `WAIT`, `UNKNOWN`, and `ERROR`; unknown strings are rejected.
Camera-derived bearings can render in either known activity phase, but bus
information renders only while `STILL`. The first command snapshot is a
non-rendering baseline. Commands received while gated still advance sequence
state, so an activity change cannot replay an earlier camera result. Activity
requires a complete valid `activity`/`activitySeq`/`activityTs` snapshot;
missing, invalid, regressed, or locally stale activity falls back to `MOVING`.

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

`q` is the safe quiet-test mode. Unlike `x`, it does not stop logical output
patterns: the laptop output view can still visualize their requested frequencies
from `TACTA_OUTPUT`. The firmware does not attempt a "very quiet" PWM level,
because these passive buzzer modules do not provide a calibrated volume control
that can guarantee inaudibility.

## Remaining Board Work

1. Run the end-to-end relay/activity soak with the phone capture page active so
   its 30-second activity heartbeat stays inside the 120-second board lease.
2. Validate the local siren classifier against labelled real siren recordings
   and a longer representative environmental-negative set.
3. Confirm the web producer holds transient BUS long enough for a 300 ms
   latest-value poll, or add queue/ack semantics.

## Phone Hotspot Configuration

Copy `src/secrets.example.h` to ignored `src/secrets.h`. On iPhone enable **Maximize Compatibility**; on Android select the **2.4 GHz** hotspot band. A checkout without secrets still builds and boots local-only, logging `RELAY configured=0`.
