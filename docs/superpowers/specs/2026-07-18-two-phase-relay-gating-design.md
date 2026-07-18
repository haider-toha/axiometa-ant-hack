# Two-Phase Relay Gating Design

## Decision

The hack demo has two explicit activity phases, but it does not attempt camera-guided navigation toward a bus.

- `MOVING`: the user is travelling toward the bus stop. The cane remains the primary mobility aid. The ESP32 uses its local ToF reflex only as supplementary forward-clearance feedback and its local microphone classifier for siren alerts. Camera frames may continue flowing through the existing phone-to-Modal pipeline, and the ESP32 may receive and parse their relay results, but it must not render bus-arrival or route-reading commands.
- `STILL`: the user is waiting at the bus stop. The ESP32 continues sampling ToF for health and telemetry, but suppresses and clears proximity output so nearby people, shelters, and street furniture do not create a continuous nuisance alert. Siren processing remains active. The ESP32 may render `BUS`, `WAIT`, `NUMBER`, `UNKNOWN`, and `ERROR` commands received through the relay.

`LEFT`, `RIGHT`, and `AHEAD` are not part of the relay contract or obstacle-avoidance claim. The one forward ToF zone cannot determine which side is traversable. Existing experimental tone tables may remain available through service Serial as an explicitly labelled conceptual-channel demonstration, but the relay parser must not accept or emit them.

`WAIT` is a feedback pattern meaning that route reading is in progress. It is not the name of the `STILL` activity phase.

## Demo Walk

1. Boot operationally into `MOVING`. Local sensing starts before Wi-Fi is ready.
2. While walking toward the bus stop, a physical obstacle activates the local ToF proximity pattern. The user chooses a bypass with their cane; as the wrist and body reorient around the obstacle, the ToF cadence slows and stops when its forward zone clears. This is clearance feedback, not a left/right instruction.
3. An ambulance recording activates local siren attention/warning/danger behavior. Siren safety outranks ToF and all cloud information.
4. The phone or service control switches activity to `STILL` once the user reaches the bus stop.
5. The camera stream and Modal submission path remain unchanged throughout. The printed bus prop enters the camera view only after `STILL` is active.
6. A fresh relay sequence delivers `BUS`, then `WAIT`, then route `88` as `NUMBER`.

A camera-derived command observed while `MOVING` is received, parsed, sequence-acknowledged, and recorded as suppressed by the activity gate. It does not reach output arbitration and is never replayed after the switch to `STILL`; the demo must generate a fresh event after the switch.

The device's route pattern is physically hardcoded for `88`. A `NUMBER` command may therefore reach that pattern only when the wire `route` is exactly `"88"` and `conf` is `"high"`. Any other route or lower confidence is consumed and logged without playing the route-88 output.

## Ownership Boundaries

### Phone, Modal, and web relay

- Keep the existing camera preview, 2 Hz frame capture, Modal request, detector state, and `/api/event` producer unchanged in this firmware workstream.
- George's web work owns the activity setter and exposing the latest activity to `/api/pull`.
- Activity liveness must be independent from command delivery. A heartbeat must not increment the command `seq` or refresh a previous command timestamp, because either action could re-fire stale output.
- The relay remains a latest-value register. The producer must hold transient `BUS` long enough for a polling client or add acknowledgement/queue semantics; firmware cannot recover an overwritten event.

### ESP32

- Poll outbound-only over the phone's 2.4 GHz hotspot.
- Keep polling and advancing the last-seen command sequence in both activity phases.
- Apply the latest valid activity before deciding whether to render the accompanying command.
- In `MOVING`, receive and parse `BUS`, `WAIT`, `NUMBER`, and `UNKNOWN`, advance the last-seen sequence, then suppress their output with a structured diagnostic.
- In `STILL`, pass the six current cloud patterns through the existing output arbitration.
- Keep ToF sampling local and active in both phases. Permit proximity output only in `MOVING`; entering `STILL` immediately clears it.
- Keep siren detection and siren output local and active in both phases.
- Retain USB Serial as the deterministic mode and command test surface when the phone endpoint is unfinished or unavailable.

## Directionality Decision

Two output channels are sufficient to encode a left/right vocabulary, but they do not produce the missing direction estimate. The current device has one approximately 25-degree forward ToF zone, no IMU, and no validated tactile separation between its two buzzer positions. It therefore cannot recommend a safe bypass side.

For this hack, obstacle negotiation is user-led: the cane finds the route and the ToF cadence confirms whether the device's forward zone remains occupied. Service Serial may play the existing P1/P3 left/right tones to demonstrate how two future haptic channels could be routed, but the stage script must call this a channel simulation, not sensed navigation.

Automated bypass guidance is a future experiment gated on both:

1. a spatial input that observes at least two independently aimed zones, or a depth/free-space model with a defined confidence and stop behavior; and
2. purpose-built ERM/LRA actuators whose left/right vocabulary has been tested with representative users.

## Relay Response Contract

The ESP32 continues to make one `POST /api/pull` request with telemetry. The response carries two independently versioned pieces of state:

```jsonc
{
  "seq": 21,
  "pattern": "NUMBER",
  "route": "88",
  "dest": "Clapham Common",
  "conf": "high",
  "arrivalId": 1,
  "ts": 1784419200123,
  "activity": "STILL",
  "activitySeq": 4,
  "activityTs": 1784419199000
}
```

- `seq` edge-triggers a cloud pattern exactly once.
- `activitySeq` changes only on a `MOVING`/`STILL` transition.
- `activityTs` records the activity write time; a heartbeat may refresh a separate liveness timestamp but must not touch command `seq` or `ts`.
- Missing, invalid, or stale cloud activity closes the camera-command gate. It must not turn a service-Serial override back on or replay a stored command.

The exact web setter route is not a firmware dependency. Only the `/api/pull` response shape matters to the board.

## Firmware Architecture

- `netTask`, pinned to Core 0 with a 12,288-byte stack, owns Wi-Fi, TLS, HTTP, reconnect/backoff, JSON parsing, command sequence tracking, and activity tracking.
- One static `WiFiClientSecure` and one static `HTTPClient` use `setReuse(true)`. Polls never overlap.
- Healthy polling targets 300 ms start-to-start. After failures, use capped exponential backoff. If warm reuse is not stable in a 20-poll bench measurement, use 700 ms.
- The first relay snapshot after boot, and the first after an outage longer than the command TTL, establishes a baseline without firing output.
- A fixed-size queue passes accepted snapshots to the board runtime. No `String` or `std::vector` survives past parsing.
- Local output arbitration remains outside `netTask`. Networking cannot directly drive a buzzer or mutate siren/ToF state.

## Failure Handling

- Wi-Fi failure never blocks boot or local sensing.
- Missing/stale activity keeps bus information gated off unless an explicit service-Serial test mode is active.
- Invalid JSON, oversized bodies, unknown patterns, and regressed sequence numbers are rejected and logged.
- Sequence gaps are logged because the latest-value relay cannot recover missing intermediate commands.
- A command suppressed by the activity gate records its source, pattern, activity, sequence, and reason.
- Reconnection discards the persisted snapshot so an old bus or route cannot fire after a reboot.

## Verification

Host tests cover:

- exact cloud-pattern mapping for `NONE`, `BUS`, `NUMBER`, `WAIT`, `UNKNOWN`, and `ERROR`;
- rejection of `LEFT`, `RIGHT`, `AHEAD`, and unknown strings;
- activity transition ordering and stale/missing activity behavior;
- consuming without rendering while `MOVING`;
- accepting a fresh bus command while `STILL`;
- rejecting a `NUMBER` command whose route is not exactly `88` or whose confidence is not high, without replay;
- ToF output enabled only in `MOVING`, with immediate clearing on entry to `STILL`;
- siren output accepted in both phases;
- no replay after a mode transition, boot baseline, reconnect, sequence gap, or timestamp wrap.

Build verification is `pio test -e native` and `pio run -e board_firmware`. Hardware verification is a coordinated step only: no upload or reboot while another developer is using the board.

The demo soak uses the exact phone, SIM, hotspot credentials, board, and venue position for at least 15 minutes. It records RSSI, poll latency, reconnect count, heap minimum, network-task stack high-water, ToF cadence, and audio frame cadence.

## Explicitly Out of Scope

- Modifying camera capture or Modal submission.
- Camera-guided `LEFT`, `RIGHT`, or `AHEAD` output.
- Automatic selection of an obstacle-bypass side from the single ToF zone.
- Bluetooth, Web Bluetooth, Web Serial, WebUSB, or an inbound ESP32 server.
- An ESP32-mounted camera in this hardware revision.
- Route guidance to the bus stop or from the detected bus to its door.
- Any claim that the current buzzers provide usable tactile or spatial guidance.
