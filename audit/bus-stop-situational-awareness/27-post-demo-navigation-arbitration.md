# Post-Demo Navigation Arbitration

Date: 2026-07-19

## Observed Failure

During the live person-avoidance demo, the phone and relay appeared to choose a direction but the board did not expose a clean LEFT or RIGHT cue.

A controlled production relay check established that transport and parsing were healthy:

- the board accepted LEFT, RIGHT, and AHEAD command sequences in `MOVING`;
- the board accepted the same three command types in `STILL`;
- relay and board sequence numbers matched;
- board uptime and Wi-Fi RSSI continued updating.

The physical output trace exposed the actual collision. The board was `MOVING`, ToF measured an obstacle at approximately 0.5 m, and the both-channel proximity cadence owned the outputs. The relay direction was accepted at the sequence layer but then dropped by the local-proximity output gate. This made a valid camera direction look like another non-directional obstacle pulse.

## Interaction Decision

Keep sensing local and continuous, but serialize the two meanings:

1. ToF emits the repeated both-channel obstacle/stop cadence immediately.
2. A fresh LEFT or RIGHT command suspends ToF output, not ToF sensing.
3. Both channels are silent for 150 ms.
4. The one-sided LEFT or RIGHT pattern plays in full.
5. Both channels are silent for 150 ms before proximity may resume.
6. If the obstacle is still in range, the stop cadence resumes automatically.

AHEAD does not override active proximity. It means continue toward a centered target or along a clear path, so playing it while ToF still reports an obstacle would create a contradictory and unsafe instruction. Siren output remains above both proximity and navigation.

## Scope Boundaries

- Person avoidance while `MOVING` produces LEFT or RIGHT around the detected person. It does not direct the user AHEAD through a detected obstacle.
- Bus alignment while `STILL` can produce LEFT, RIGHT, or AHEAD. ToF continues sampling but its output is already suppressed in `STILL`.
- The buzzers remain audible stand-ins for future vibration motors. This records software behavior, not validated DeafBlind usability.
- Haider's person confidence threshold and centroid-inversion behavior are unchanged.

## Verification

- Native relay and output-telemetry regression tests cover proximity interruption, AHEAD refusal during active proximity, siren priority, and monitor semantics.
- A full native firmware suite, ESP32 build, credentialed board flash, and physical output-monitor run are required before this change is called device-ready.
