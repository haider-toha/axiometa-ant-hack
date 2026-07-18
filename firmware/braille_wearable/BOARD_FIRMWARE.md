# Integrated Board Firmware

`board_firmware` is the current ESP32-S3 physical workstream. It replaces the
isolated buzzer and ToF runners for combined testing.

## Module Map

| Slot | Module | Signal mapping |
|---|---|---|
| P1 | AX22-0018 passive buzzer | GPIO3, 2350 Hz LEFT audio proxy |
| P2 | AX22-0015 VL53L0CX ToF | SDA GPIO10, SCL GPIO11, XSHUT GPIO6 |
| P3 | AX22-0018 passive buzzer | GPIO16, 3050 Hz RIGHT audio proxy |
| P4 | AX22-0044 PDM microphone | CLK/DATA assignment still requires module-silk verification |

The firmware boots operationally without a button. The buzzers simulate future
vibration channels; they are not tactile actuators.

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
| `x` | Stop cloud output | Stop the current cloud cue; local ToF remains active |
| `h` | Service only | Print controls |

The serial commands are temporary substitutes for the future relay parser. The
mode gate and output behavior run on the ESP32 and do not depend on the camera.

The ToF proximity reflex remains active in both modes. It preempts and drops a
cloud cue while proximity is active, revokes output immediately on an invalid
sample, and clears active proximity after three invalid samples.

## Remaining Board Work

1. Replace the serial phone stub with the fixed-size Vercel relay command parser
   while preserving outbound-only polling.
2. Verify the AX22-0044 PDM CLK/DATA silk in P4, then add I2S0 capture and the
   local siren classifier.
3. Complete the remaining output vocabulary and severity arbitration before
   making `board_firmware` the default PlatformIO environment.
