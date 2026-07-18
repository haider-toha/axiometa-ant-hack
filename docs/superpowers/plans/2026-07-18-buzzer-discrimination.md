# Buzzer Discrimination Experiment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an isolated, uploadable Genesis Mini firmware target for scored navigation and stationary situational buzzer discrimination tests.

**Architecture:** Keep pattern data and verified port mappings in an Arduino-free header so native tests can verify semantics. A dedicated Arduino source owns LEDC tone output, the P2 LED-button arm/stop control, balanced trial shuffling, Serial controls, scoring, and user feedback. A separate PlatformIO environment builds only that source, leaving the legacy application unchanged.

**Tech Stack:** PlatformIO, Arduino-ESP32 3.x, ESP32-S3 LEDC tone API, Unity native tests, C++17.

## Global Constraints

- Buzzer A is Port 1 IO1 / GPIO3; buzzer B is Port 3 IO1 / GPIO16.
- Navigation is frequency-coded and experimental; never claim spatial localization.
- Do not initialize or depend on Wi-Fi, display, encoder, microphone, ToF, or secrets.
- The scored tests are balanced 12-trial binary sessions with a pass threshold of 10/12.

---

### Task 1: Pure Pattern Contract

**Files:**
- Create: `firmware/braille_wearable/src/buzzer_experiment_pure.h`
- Create: `firmware/braille_wearable/test/test_buzzer_experiment/test_buzzer_experiment.cpp`
- Modify: `firmware/braille_wearable/platformio.ini`

**Interfaces:**
- Produces: `BuzzerPatternId`, `BuzzerStep`, `BuzzerPattern`, `patternFor(BuzzerPatternId)`, `VIABILITY_FREQUENCIES_HZ`.

- [ ] Write Unity tests for LEFT, RIGHT, EVENT, WAIT, and the viability frequencies.
- [ ] Add a native test environment filter and run it to confirm failure because the contract header is absent.
- [ ] Implement the minimal constexpr pattern contract.
- [ ] Run the native test and confirm all assertions pass.

### Task 2: Isolated On-Device Runner

**Files:**
- Create: `firmware/braille_wearable/src/buzzer_experiment.cpp`
- Modify: `firmware/braille_wearable/platformio.ini`

**Interfaces:**
- Consumes: `patternFor(BuzzerPatternId)` and `VIABILITY_FREQUENCIES_HZ`.
- Produces: PlatformIO environment `buzzer_experiment` and the Serial command interface from the design.

- [ ] Add `env:buzzer_experiment` using Arduino-ESP32 3.x and `build_src_filter = +<buzzer_experiment.cpp>`.
- [ ] Attach GPIO3 and GPIO16 as independent LEDC tone outputs.
- [ ] Implement labelled viability playback.
- [ ] Implement balanced Fisher-Yates trial schedules, replay, guess validation, score reporting, and the 10/12 verdict.
- [ ] Build `pio run -e buzzer_experiment` and resolve all compiler errors.

### Task 3: Operator Procedure

**Files:**
- Create: `firmware/braille_wearable/BUZZER_EXPERIMENT.md`

**Interfaces:**
- Produces: exact physical setup, upload, monitor, test, scoring, and interpretation instructions.

- [ ] Document power-off module installation in P1/P3 and the confirmed Signal mapping.
- [ ] Document repo-local PlatformIO commands for build, upload, monitor, and troubleshooting.
- [ ] Document the viability, navigation, and situational protocols without overstating results.
- [ ] Run final native tests, ESP32 build, `git diff --check`, and review the complete diff.
