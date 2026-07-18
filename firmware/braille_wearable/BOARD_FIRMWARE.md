# Integrated Board Firmware

`board_firmware` is the current ESP32-S3 physical workstream. It replaces the
isolated buzzer and ToF runners for combined testing.

## Module Map

| Slot | Module | Signal mapping |
|---|---|---|
| P1 | AX22-0018 passive buzzer | GPIO3, 2350 Hz LEFT audio proxy |
| P2 | AX22-0015 VL53L0CX ToF | SDA GPIO10, SCL GPIO11, XSHUT GPIO6 |
| P3 | AX22-0018 passive buzzer | GPIO16, 3050 Hz RIGHT audio proxy |
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

The board owns two runtime modes. It boots in `WAITING`.

| Serial stub | Future phone input | Board behavior |
|---|---|---|
| `s` | `STILL` | Enter `WAITING`; accept BUS and WAIT scenarios |
| `n` | `MOVING` | Enter `NAVIGATION`; accept LEFT, RIGHT, and AHEAD |
| `l` / `r` / `a` | Direction command | Play P1 low, P3 high, or both proxy tones |
| `b` / `w` | Waiting scenario | Play BUS or WAIT pattern |
| `8` / `u` / `e` | Waiting scenario | Play route 88, UNKNOWN, or ERROR pattern |
| `x` | Service emergency stop | Stop all output immediately; sensing remains active |
| `o` | Service resume | Re-enable output after `x` |
| `h` | Service only | Print controls |

The serial commands are temporary substitutes for the future relay parser. The
mode gate and output behavior run on the ESP32 and do not depend on the camera.

The ToF proximity reflex remains active in both modes. It preempts and drops a
cloud cue while proximity is active, revokes output immediately on an invalid
sample, and clears active proximity after three invalid samples.

The PDM microphone also remains active in both modes. I2S0 captures 512-sample
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

1. Replace the serial phone stub with the fixed-size Vercel relay command parser
   while preserving outbound-only polling.
2. Validate the local siren classifier against labelled real siren recordings
   and a longer representative environmental-negative set.
3. Complete the remaining output vocabulary and general queue arbitration.
