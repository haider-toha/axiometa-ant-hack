# Accessible Cue And Person Guidance Design

**Date:** 2026-07-19

**Status:** Approved interaction direction; written specification awaiting user review

## Purpose

Make the two-channel output vocabulary easy to learn in both `MOVING` and
`STILL`, while hardening the camera-to-Claude person-avoidance path that chooses
where the user should move around a detected person.

The current AX22-0018 buzzers are audible proxies for future vibration motors.
They demonstrate channel routing, timing, arbitration, and semantics. They do
not make the prototype tactilely accessible, and this work must not claim that
the resulting patterns have been validated with DeafBlind users. The design
instead keeps the software contract suitable for later LRA/ERM retuning and
representative-user testing.

## Goals

1. Give each output channel one stable meaning that can be learned as a rule.
2. Keep walking and standing behavior distinct without making the user memorize
   a separate vocabulary for each mode.
3. Treat bus direction and person avoidance as opposite inputs to the same
   movement instruction:
   - bus: move toward the detected target;
   - person: move through the clear path selected from the frame.
4. Make person guidance fail closed when detection, Claude, parsing, timing, or
   mode state is uncertain.
5. Preserve the existing `/api/event` and ESP32 relay wire vocabulary so
   Haider's relay work and the firmware remain compatible.
6. Make the critical usability rules executable as native firmware and web
   tests rather than prose-only conventions.

## Non-Goals

- General obstacle avoidance or a claim that the system has mapped traversable
  free space.
- Replacing the cane or guide dog as the primary mobility aid.
- Tactile efficacy, spatial-localization, or regulatory compliance claims from
  the current buzzer hardware.
- Changing the Redis command schema, `/api/event`, `/api/pull`, or the ESP32
  command enum.
- Choosing a different Claude model from Haider's current branch. The endpoint
  contract is model-independent; `main` currently uses `claude-opus-4-5` even
  though some comments still say Haiku.

## Learnable Output Grammar

The user learns two rules:

1. **One channel means a movement direction.** P1 alone means move left. P3
   alone means move right.
2. **Both channels mean no left/right distinction.** Rhythm then identifies an
   ahead instruction, local hazard, environmental alert, bus event, payload, or
   device state.

No non-directional pattern may energize only one channel. This is a testable
firmware invariant.

### Locked Vocabulary

| Meaning | P1 | P3 | Timing | Learning hook |
|---|---:|---:|---|---|
| LEFT | 2350 Hz | off | `200 on / 200 off` twice | one low/left channel |
| RIGHT | off | 3050 Hz | `200 on / 200 off` twice | one high/right channel |
| AHEAD | 2350 Hz | 3050 Hz | one sustained `600` pulse | both, continue forward |
| PROXIMITY | 2350 Hz | 3050 Hz | repeating `120` pulses; gap maps 300-1200 mm to 120-900 ms | both, faster means closer |
| ATTENTION | 2350 Hz | 3050 Hz | one `250` pulse | brief local sound notice |
| SIREN WARNING | 2350 Hz | 3050 Hz | `400 on / 300 off` twice | two long alarm beats |
| DANGER | 2350 Hz | 3050 Hz | existing five rapid beats plus sustained tail, repeated | unmistakable urgent alarm |
| BUS | both, existing frequency ascent | both | three `250` pulses with `250` gaps | three means bus arrived |
| NUMBER 88 | both | both | existing bracketed long/short encoding | payload follows bus cue |
| WAIT | 2350 Hz | 3050 Hz | `200 on / 600 off / 200 on` once | slow processing doublet |
| UNKNOWN | both, existing outward sweep | both | `900` total | information unavailable |
| ERROR | 2350 Hz | 3050 Hz | `600 on / 300 off / 150 on / 300 off / 600 on` | long-short-long system state |
| READY | both, existing inward sweep | both | `400` total, boot only | device available |

The audio frequencies are proxies, not motor drive frequencies. Future
vibration hardware keeps channel and timing semantics but requires actuator-
specific amplitude/frequency tuning and a new wear test.

## Mode Contract

### `MOVING`

- Local ToF proximity output is enabled and uses both channels.
- Local siren detection is enabled and has priority over every cloud command.
- A detected bus may emit LEFT/RIGHT/AHEAD toward the bus.
- If no bus is selected and a person is detected, Claude may emit
  LEFT/RIGHT/AHEAD for the clearer path around the person.
- BUS, WAIT, NUMBER, and UNKNOWN are received and sequence-consumed but remain
  suppressed by the existing firmware activity gate.
- A cane or guide dog remains the primary means of confirming and negotiating
  the path.

### `STILL`

- ToF continues sampling but proximity output is suppressed.
- Local siren detection remains enabled.
- Person-avoidance requests and results are suppressed and cleared.
- Bus LEFT/RIGHT/AHEAD remains available while the user scans for and approaches
  an arrived bus.
- BUS, WAIT, NUMBER, UNKNOWN, and ERROR may render according to the existing
  relay and confidence gates.

## Direction Semantics

`LEFT`, `RIGHT`, and `AHEAD` are action instructions by the time they reach the
relay. Their derivation depends on the target type:

- **Bus target:** derive the instruction from the bus bounding-box bearing. The
  user moves toward it.
- **Person obstacle while MOVING:** send the current frame to the
  person-direction endpoint. Claude judges the side with more open floor or
  pavement. The returned instruction moves around the person.
- **Person while STILL:** emit no person-derived instruction.

The ESP32 intentionally does not know whether a direction came from a bus or a
person. It receives the same stable action vocabulary and preserves local ToF
and siren priority.

## Person-Direction Endpoint

### Request

`POST /api/person-direction`

```json
{
  "frame_b64": "<base64 JPEG without a data-URL prefix>",
  "person_box": [0.35, 0.2, 0.62, 0.94]
}
```

`person_box` is the selected detection's `[x1, y1, x2, y2]`, normalized to
`0..1`. Supplying it prevents Claude from silently choosing a different person
when a frame contains several people. Reject an absent, empty, non-string, or
oversized frame, and reject a missing, non-finite, out-of-range, or inverted
box, before constructing the Anthropic client. The maximum accepted base64
payload is 2 MiB.

### Response

Success:

```json
{ "status": "ok", "direction": "left" }
```

Person visible but not obstructing the walking corridor:

```json
{ "status": "clear", "direction": null }
```

Unavailable:

```json
{ "status": "unavailable", "direction": null, "reason": "model_error" }
```

`reason` is one of:

- `invalid_request`
- `timeout`
- `model_error`
- `invalid_response`
- `low_confidence`

Malformed requests return HTTP 400. Model timeout or failure returns HTTP 503.
Invalid structured model output returns HTTP 502. A low-confidence or clear
assessment returns HTTP 200 because the request completed normally, but neither
produces a direction. An unavailable result never becomes `AHEAD`.

### Model Output

Use Anthropic structured output with a closed JSON schema:

```json
{
  "obstructing": true,
  "direction": "left",
  "confidence": "high"
}
```

The schema closes `obstructing` to a boolean, `direction` to
`left | right | ahead | none`, and `confidence` to `high | low`.

Only `high` confidence, `obstructing: true`, and `left`, `right`, or `ahead`
becomes a successful endpoint response. High-confidence
`obstructing: false` becomes `status: "clear"`; this prevents a peripheral
person from generating unnecessary movement cues. Every low-confidence or
inconsistent combination becomes `low_confidence` or `invalid_response`. Do not
parse natural-language text with substring matching.

The prompt identifies the selected normalized person box and asks about open
floor or pavement around that person. It must distinguish a person merely
visible in the frame from one obstructing the forward walking corridor.

The server-side Claude request has a four-second timeout and no automatic retry.
Retries can turn a transient model delay into a stale movement instruction.

Logs use neutral `person-direction` and `Claude` labels rather than stale model
names. They record outcome, duration, and rejection reason but never frame data
or secrets.

## Capture State Machine

The capture page keeps bus selection as the first priority. Person guidance is
eligible only when all conditions hold:

1. activity is `MOVING`;
2. no bus target is selected;
3. a person target with a valid normalized box is present;
4. no person request is already in flight;
5. the request cooldown has elapsed.

Each request captures a monotonically increasing generation token. Its result
may update navigation only when the token is still current and all eligibility
conditions still hold. Increment the generation and abort/ignore the response
when:

- activity changes to `STILL`;
- a bus becomes the selected target;
- the person disappears;
- the camera stops;
- a newer person request starts.

Clear the last person instruction on every invalidation, `clear` response, or
unavailable response. Never retain it as a fallback after a request failure.

The first successful high-confidence instruction may publish immediately for
responsiveness. A direct LEFT-to-RIGHT or RIGHT-to-LEFT reversal requires the
same new high-confidence result twice consecutively before switching. This
prevents model jitter from telling a moving user to oscillate while preserving a
fast initial instruction. `AHEAD` is treated as a normal instruction but is
cleared, never assumed, on uncertainty.

The existing edge-trigger remains: an unchanged accepted direction does not
re-POST `/api/event` and therefore does not restart the firmware pattern every
camera frame.

## Priority And Interruption

Firmware output priority remains:

1. confirmed local siren output;
2. local ToF proximity while `MOVING`;
3. accepted cloud pattern;
4. idle.

The existing 150 ms clearing gap remains mandatory when local safety output
preempts another cue. Moving proximity to both channels changes its grammar, not
its local priority or distance thresholds.

## Output Monitor Compatibility

The USB serial protocol remains unchanged:

```text
TACTA_OUTPUT {"v":1,"leftHz":2350,"rightHz":3050,"upMs":1234}
```

The `/output` timeline therefore reflects the new patterns without a protocol
migration. Relay-trace parsing also remains compatible because pattern names and
`/api/event` values do not change. UI labels may explain the channel grammar,
but the monitor must continue presenting literal P1/P3 activity rather than
claiming tactile output.

## Verification

### Web

- Pure tests for frame and selected-person-box validation and structured-output
  normalization.
- Route tests for invalid input, low confidence, invalid model output, timeout,
  and successful left/right/ahead responses without making live API calls.
- Pure state-machine tests proving person guidance is MOVING-only, bus wins,
  stale generations are rejected, failures clear guidance, and reversals require
  confirmation.
- Existing capture, relay, output-monitor, TypeScript, lint, and build checks.
- Production smoke verifies route presence and fail-closed malformed-input
  behavior without sending a real image or spending model tokens.

### Firmware

- Tests prove LEFT is the only P1-only pattern and RIGHT is the only P3-only
  pattern.
- Tests pin the revised AHEAD, WAIT, and ERROR timings.
- Tests prove active proximity writes both channels at the two proxy frequencies.
- Existing local-priority, relay, siren, ToF, haptic, and build checks remain
  green.

### Physical

No board reset or flash occurs without explicit coordination. After software
verification, the operator runs a randomized, eyes-off cue identification check
for LEFT, RIGHT, AHEAD, PROXIMITY, SIREN, BUS, UNKNOWN, and ERROR. Record a
confusion matrix; do not infer success from knowing which cue was manually
triggered. This validates the audible demonstration only.

## Claim Boundary

Acceptable:

> The prototype uses an accessibility-oriented, mode-aware two-channel cue
> grammar. Audible buzzer tones simulate the routing and timing intended for
> future vibration motors, while local sensing continues if cloud guidance is
> unavailable.

Not acceptable:

- "The buzzers provide tactile output."
- "The design is compliant for DeafBlind use."
- "LEFT and RIGHT have been validated on the wrist."
- "Claude guarantees a safe route around a person."
- "The device replaces a cane or guide dog."

Actual DeafBlind usability requires representative users, real vibration
actuators, a retuned vocabulary, and testing while walking with the user's normal
mobility aid.
