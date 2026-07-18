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

## Unmeasured In-Situ Sweep

**Date:** 2026-07-18
**Setup:** Board face-up on a table; a white napkin was moved vertically over the sensor by hand. No ruler or fixed target distance was available, so reported millimetres are sensor output rather than independently verified ground truth.

- The napkin produced long consecutive `status=0` sequences while moving through reported ranges from roughly 40 mm to at least 900 mm.
- The reported range rose and fell monotonically during a slow outward and return sweep.
- The computed off-gap moved from 120 ms in the near band to about 640 ms near 900 mm.
- Removing or misaligning the napkin produced three invalid samples and a `PROXIMITY transition=exited`, revoking output as designed.
- With the napkin removed, the upward-facing sensor produced a sustained cluster around 2.0-2.2 m, plausibly from a room surface. Because that surface was not identified or measured, this is evidence of distant detection only, not accuracy or maximum range.
- The 2350 Hz proximity proxy was enabled for the return sweep and then stopped with serial `x`. User confirmation of loudness and cadence discriminability remains outstanding.

**Interpretation:** The in-situ run supports using the ToF as a deliberate, single-ray near-field scanning aid and validates relative distance-to-cadence behavior. It does not pass the controlled 300/600/1,200 mm gate, establish outdoor or dark-target performance, validate room mapping, or substantiate the Axiometa 4 m claim.
