# PDM Microphone Bench Test

Date: 2026-07-18

## Hardware

- Board: ESP32-S3 Genesis Mini over native USB-C
- Module: AX22-0044 with T3902 PDM microphone, installed in P4
- Module silk: `G / 3V3 / SL / DT / CLK`
- Verified board mapping: SL GPIO1, DT GPIO17, CLK GPIO18
- Capture: I2S0, 16 kHz, signed 16-bit mono, 512 samples per frame
- Select: SL driven high, ESP-IDF `I2S_PDM_SLOT_RIGHT`

## Diagnostic Failure And Root Cause

The first firmware attempt incorrectly treated the last three silk labels as
IO0/IO1/IO2 in reverse order. It drove clock on GPIO1 and held GPIO18 high.
Both slot masks then returned 32 complete frames per second containing the
constant sample `-30935`.

The Genesis Mini schematic defines connector pins 3/4/5 as IO0/IO1/IO2. The
silk therefore maps SL/DT/CLK to IO0/IO1/IO2, not the reverse. Correcting only
that mapping restored PCM immediately.

## Passing Measurements

Quiet ambient windows:

- 32 complete frames per second after the first partial reporting window
- 0 partial reads and 0 read errors
- mean approximately 558 to 562 LSB
- average frame sigma commonly 20 to 60 LSB
- no clipping

Repeatable stimulus used macOS `Sosumi.aiff` from the nearby computer speaker:

- one-second average sigma rose to 109 to 116 LSB
- peak frame sigma reached 351 LSB in the captured stimulus window
- extrema expanded to approximately -102 and 1532 LSB
- later nearby sound produced peak frame sigma 968 and extrema -1049 to 2946
- capture remained at 32 complete frames per second with 0 errors and 0 clipping

## Verdict

**PASS: P4 supplies responsive 16-bit PCM through I2S0.** The signal reacts to
sound without persistent silence, raw-PDM variance, DMA loss, or clipping.

This gate validates capture only. FFT integration and the first classifier
calibration are recorded separately in `09-local-siren-bench-test.md`.
