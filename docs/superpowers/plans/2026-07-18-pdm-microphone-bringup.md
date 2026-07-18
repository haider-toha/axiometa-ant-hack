# PDM Microphone Bring-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove that the AX22-0044/T3902 in P4 delivers healthy 16-bit PCM through ESP32-S3 I2S0 before integrating FFT siren detection.

**Architecture:** A host-tested pure statistics boundary classifies 512-sample PCM frames. An isolated `pdm_mic_experiment` environment drives P4 `SL` high, captures the corresponding ESP-IDF `RIGHT` PDM slot on I2S0, and prints one-second diagnostics without involving ToF, buzzers, Wi-Fi, or the siren classifier.

**Tech Stack:** PlatformIO, Arduino-ESP32 3.3.9 / ESP-IDF 5.5, `driver/i2s_pdm.h`, native Unity tests.

## Global Constraints

- P4 silk and board-connector mapping is `SL -> GPIO1`, `DT -> GPIO17`, `CLK -> GPIO18`.
- Bind only to `I2S_NUM_0`; ESP32-S3 PDM-to-PCM conversion is not available on I2S1.
- Drive `SL` high before enabling I2S and select `I2S_PDM_SLOT_RIGHT`, matching ESP-IDF's pulled-high slot convention.
- Capture signed 16-bit mono PCM at 16 kHz in 512-sample frames.
- Keep this runner isolated from integrated board behavior until physical PCM health passes.

---

### Task 1: Host-Tested PCM Diagnostics

**Files:**
- Create: `firmware/braille_wearable/src/audio_pure.h`
- Create: `firmware/braille_wearable/test/test_audio/test_audio.cpp`

**Interfaces:**
- Consumes: `const int16_t* samples`, `size_t count`
- Produces: `AudioFrameStats analyzeAudioFrame(...)` and `AudioFrameHealth classifyAudioFrame(...)`

- [x] Write native tests for silence, healthy changing PCM, excessive variance, and clipping.
- [x] Run `pio test -e native -f test_audio` and confirm the new tests fail before implementation.
- [x] Implement mean, standard deviation, min/max, clipping count, and deterministic health classification.
- [x] Re-run the targeted test and the complete native suite.

### Task 2: Isolated PDM Capture Runner

**Files:**
- Modify: `firmware/braille_wearable/src/pins.h`
- Create: `firmware/braille_wearable/src/pdm_mic_experiment.cpp`
- Modify: `firmware/braille_wearable/platformio.ini`
- Create: `firmware/braille_wearable/PDM_MIC_EXPERIMENT.md`
- Modify: `firmware/braille_wearable/BOARD_FIRMWARE.md`
- Modify: `plan/2026-07-18-bus-stop-situational-awareness.md`
- Modify: `audit/bus-stop-situational-awareness/04-track-4-system-firmware-architecture.md`

**Interfaces:**
- Consumes: P4 T3902 PDM stream on GPIO17 with clock GPIO18 and select GPIO1.
- Produces: one line per second containing frame count, mean, sigma, min, max, clipping, and health.

- [x] Add the verified P4 constants and correct the TDK-versus-ESP-IDF slot naming in durable docs.
- [x] Initialize I2S0 with four 256-frame DMA descriptors, 16 kHz PCM conversion, 16-bit mono, and `I2S_PDM_SLOT_RIGHT`.
- [x] Read exact 512-sample frames with a 100 ms timeout and classify partial reads separately from signal health.
- [x] Add `env:pdm_mic_experiment` and build it with the pinned Arduino-ESP32 3.x platform.

### Task 3: Physical PCM Gate

**Files:**
- No source changes unless the physical evidence identifies a slot or clock defect.

- [x] Upload `pdm_mic_experiment` to `/dev/cu.usbmodem1101`.
- [x] Monitor at 115200 baud and capture quiet-room diagnostics.
- [x] Use a repeatable nearby sound and confirm sigma and extrema rise without persistent clipping.
- [x] Test the opposite slot mask after constant samples; the identical result ruled out slot selection and exposed the reversed CLK/SL mapping.
- [x] Record the measured result before connecting FFT and siren decisions.
