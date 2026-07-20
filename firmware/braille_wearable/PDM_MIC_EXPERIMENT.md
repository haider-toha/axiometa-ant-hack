# PDM Microphone Experiment

Tacta fuses cameras, microphones, and depth sensors into situational awareness
delivered by touch. The microphone is the local sound sense. This isolated runner
proves that the AX22-0044/T3902 in P4 delivers healthy 16-bit PCM before FFT or
siren-classification code is connected.

## P4 Mapping

The module silk reads `G / 3V3 / SL / DT / CLK`.

| Module signal | Genesis Mini P4 signal | ESP32-S3 GPIO |
|---|---|---|
| CLK | IO2 | GPIO18 |
| DT | IO1 | GPIO17 |
| SL | IO0 | GPIO1 |

The runner drives `SL` high. The T3902 datasheet calls select-high its DATA2
or left lane, while ESP-IDF names the pulled-high receive mask
`I2S_PDM_SLOT_RIGHT`. The runner uses the ESP-IDF name required by the installed
driver. Capture must remain on `I2S_NUM_0`, where ESP32-S3 provides PDM-to-PCM
conversion.

## Build, Upload, And Monitor

```bash
cd firmware/braille_wearable
$HOME/.platformio/penv/bin/pio test -e native
$HOME/.platformio/penv/bin/pio run -e pdm_mic_experiment
$HOME/.platformio/penv/bin/pio run -e pdm_mic_experiment -t upload --upload-port /dev/cu.usbmodem1101
$HOME/.platformio/penv/bin/pio device monitor -e pdm_mic_experiment --port /dev/cu.usbmodem1101 --baud 115200
```

The runner prints one aggregate line per second.

```text
PDM frames=32 partial=0 errors=0 mean=... sigma=... peak_sigma=... min=... max=... clipping=0 health=HEALTHY
```

## Physical Gate

1. Leave the board still and record several quiet-room lines.
2. Speak near the microphone, then clap once nearby.
3. Confirm `sigma`, `peak_sigma`, and the extrema react to sound.
4. Confirm frames continue near 32 per second with no persistent partial reads,
   read errors, or clipping.

`SILENT_OR_WRONG_SLOT` means every captured frame is effectively constant.
Verify that SL/GPIO1 is driven high and the slot mask remains `I2S_PDM_SLOT_RIGHT`
before changing the pin map. `RAW_PDM_OR_EXCESSIVE_NOISE` means the signal is
too variable for the bring-up threshold; first verify that capture is still on
`I2S_NUM_0`.

Passing this gate proves PCM capture and sound response only. It does not prove
that sirens can be distinguished from other environmental sounds.

The 2026-07-18 physical run passed. Quiet sigma was commonly 20-60 LSB; a
nearby repeatable system sound raised one-second sigma above 100 LSB and peak
frame sigma above 350 LSB, while capture held 32 frames per second with no read
errors or clipping. See `audit/situational-awareness/08-pdm-microphone-bench-test.md`.
