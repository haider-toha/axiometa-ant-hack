# ToF Proximity Reflex Bench Test

**Date:** 2026-07-18  
**Branch:** `feat/tof-proximity-reflex`  
**Hardware:** Genesis Mini, AX22-0015 VL53L0CX in P2, AX22-0018 passive buzzer in P1

## Setup

- P2 I2C: SDA GPIO10, SCL GPIO11, XSHUT GPIO6.
- Sensor address: `0x29`.
- Firmware environment: `tof_experiment`.
- Ranging period: 50 ms.
- Audio proxy: P1 at 700 Hz, 120 ms pulse, distance-dependent off gap.
- Reflex starts disabled and is controlled with serial `r` / `x`.

## Results

| Check | Result | Evidence |
|---|---|---|
| Sensor initialization | PASS | Continuous readings began at address `0x29`; corrected P2 pin mapping is functional. |
| Default ranging profile | INSUFFICIENT | Stable valid readings were observed around 245-350 mm, but returns above roughly 380 mm were predominantly signal failures (`status=2`). |
| Long-range profile | PARTIAL PASS | A continuous hand-held sweep produced valid `status=0` readings from roughly 33 mm through 650 mm. Valid isolated readings were also observed near 800, 1,000, 1,188, 1,306, 1,590, and 2,142 mm, but readings around and above 1.2 m were not yet stable. |
| Proximity entry debounce | PASS | Three consecutive valid near samples caused `PROXIMITY transition=entered`. |
| Distance encoding | PASS (serial) | During a valid sweep, `gap_ms` increased from 120 ms near 300 mm to 395 ms near 618 mm. User perception of the changing pulse cadence still needs explicit confirmation. |
| Invalid-reading fail-safe | PASS | An invalid sample immediately revoked output permission; three invalid samples cleared active proximity and logged `transition=exited`. |
| Manual stop | PASS | Serial `x` logged `REFLEX enabled=0 reason=serial_stop` and left both outputs disabled. |
| 1.2 m fixed-target gate | NOT YET PASSED | The bench run did not produce a sustained cluster of valid readings at 1.2 m. |

## Decision

Keep `VL53L0X_SENSE_LONG_RANGE` as the best-performing profile observed so far. It materially improved useful range, but it is not yet proven at the 1.2 m proximity threshold. The existing validity and debounce rules prevent intermittent returns from producing unsafe output while that gate remains open.

Do not mark the ToF hardware task complete or merge the branch until a large matte target, held perpendicular and centered on the sensor, produces sustained valid readings at 300, 600, and 1,200 mm. Record the three clusters and confirm that the P1 cadence is perceptibly faster at the nearer distances and stops when the target leaves view.
