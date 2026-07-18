# ToF Proximity Reflex Implementation Plan

## Goal

Bring up the AX22-0015 VL53L0CX in P2, prove trustworthy raw distance readings, and drive a fully local proximity audio proxy without Wi-Fi or cloud dependencies.

## Hardware Contract

- P1: AX22-0018 LEFT audio proxy, IO1 / GPIO3, 700 Hz.
- P2: AX22-0015 ToF, SDA / GPIO10, SCL / GPIO11, XSHUT on module IO1 / GPIO6.
- P3: AX22-0018 RIGHT audio proxy, IO1 / GPIO16, 1400 Hz.
- P4: empty until microphone bring-up.

The AX22-0015 schematic is authoritative for XSHUT. Its `IO1D` net corrects the earlier plan/audit assumption that XSHUT used module IO0 / GPIO7.

## Files

- `firmware/braille_wearable/src/tof_proximity_pure.h`: Arduino-free debounce, range-state, and pulse-gap mapping.
- `firmware/braille_wearable/test/test_tof_proximity/test_tof_proximity.cpp`: host tests for thresholds, invalid samples, debounce, hysteresis, and monotonic pulse timing.
- `firmware/braille_wearable/src/tof_experiment.cpp`: I2C/ToF bring-up, structured Serial diagnostics, and non-blocking local audio output.
- `firmware/braille_wearable/platformio.ini`: isolated `tof_experiment` environment with the pinned Adafruit VL53L0X library.
- `firmware/braille_wearable/TOF_EXPERIMENT.md`: exact module placement, commands, expected diagnostics, and bench procedure.
- `plan/2026-07-18-bus-stop-situational-awareness.md` and `audit/bus-stop-situational-awareness/01-track-1-physical-cad-ground-truth.md`: correct XSHUT mapping.

## Order Of Operations

1. Correct the documented XSHUT net from P2 GPIO7 to GPIO6.
2. Write failing native tests for the proximity-state contract.
3. Implement and pass the pure-logic tests.
4. Add an isolated ESP32-S3 target and compile against Arduino-ESP32 3.3.9.
5. Replace the P2 LED button with the ToF module while power is disconnected.
6. Upload and verify I2C address `0x29`, valid range status, and known-distance readings.
7. Enable the local reflex and verify closer objects produce shorter gaps without network access.

## Behavior

- Raw readings are always printed with distance, sensor status, and derived proximity state.
- Three consecutive valid readings below 1200 mm enter proximity mode.
- Three consecutive valid readings above 1300 mm exit, providing 100 mm hysteresis.
- The first invalid reading immediately silences output; three consecutive invalid readings also clear the debounced proximity state.
- No completed measurement for 250 ms triggers the same invalid-sample path and is reported visibly.
- The proxy uses the P1 700 Hz channel for 120 ms pulses. Gap maps monotonically from 900 ms at 1200 mm to 120 ms at 300 mm or closer.
- Serial `r` toggles reflex output; `x` immediately silences it; `h` prints controls.

## Risks And Trade-offs

- The module product name says VL53L0CX while the supported Arduino library is VL53L0X; compile and physical I2C identity are the deciding checks.
- Cover material or a close enclosure can create optical crosstalk. Initial verification must be open-air against known distances.
- Audible output is only a proxy for future vibration hardware and must not be described as a validated haptic reflex.
- The P2 test button is removed for this target. Start/stop remains available through Serial; the onboard user-button polarity will be validated separately before it becomes a control dependency.

## Verification

```bash
cd firmware/braille_wearable
../../.venv/bin/pio test -e native
../../.venv/bin/pio run -e tof_experiment
../../.venv/bin/pio run -e tof_experiment -t upload
../../.venv/bin/pio device monitor -e tof_experiment
```

The hardware gate requires stable readings near known 300 mm, 600 mm, and 1200 mm targets, no false proximity state with no target in range, and immediate silence after `x`.

## Agent Operability

The runner emits one-line machine-readable diagnostics with stable field names, keeps sensor logic native-testable, and remains isolated from the main firmware. Future agents can reproduce sensor failures without credentials or app infrastructure and can replace the audio writer with a motor writer without changing the proximity-state contract.
