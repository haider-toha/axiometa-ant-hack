# Accessible Cue And Person Guidance Implementation Record

Date: 2026-07-19

## Decision

The prototype now uses a single learnable channel rule:

- P1-only means move LEFT.
- P3-only means move RIGHT.
- Every non-directional cue uses both channels.

The current AX22-0018 buzzers are audible proxies. This implementation validates software routing and timing only. It does not validate tactile discriminability, navigation safety, or usability with DeafBlind people.

## Implemented Behavior

### Phone and Claude

- Person avoidance runs only while activity is `MOVING` and only when no bus target has priority.
- The selected normalized person box is sent with the JPEG to `/api/person-direction`.
- Claude output uses Anthropic `output_config.format` with a strict JSON schema.
- A usable person result must be high-confidence LEFT or RIGHT. AHEAD is not a person-avoidance result.
- Invalid request, malformed model output, low confidence, timeout, model failure, non-obstructing person, stale result, bus priority, person disappearance, STILL, and camera stop all produce no person direction.
- A response can apply only while the current selected person box overlaps its request box by at least 0.30 intersection-over-union; switching targets clears and aborts the old guidance.
- The first direction applies immediately. A direct LEFT/RIGHT reversal needs two consecutive matching results.
- The existing `/api/event` payload, Redis ordering, bus-first selection, and ESP32 parser remain unchanged.

### Firmware

- LEFT remains two P1-only 2350 Hz pulses.
- RIGHT remains two P3-only 3050 Hz pulses.
- AHEAD is one sustained 600 ms pulse on both channels.
- PROXIMITY drives both channels for each 120 ms pulse; its distance-to-gap mapping is unchanged.
- WAIT is both channels for 200 ms, silent for 600 ms, then both for 200 ms.
- ERROR is both-channel long-short-long with its existing 1950 ms total duration.

## Verification Evidence

- Web unit suite: 13 files, 380 tests passed.
- Web lint: passed with no warnings.
- Next.js 16 production build: passed. Local build emitted the expected missing-Upstash-environment warnings.
- Firmware native suite: 13 suites, 116 tests passed.
- `board_firmware` target: built successfully in the firmware implementation pass.
- No board flash, sound playback, physical navigation trial, or representative-user test was performed in this pass.

## Exact Mode Matrix

| Behavior | `MOVING` | `STILL` |
|---|---|---|
| Person-derived LEFT/RIGHT | Eligible only with no bus target | Disabled and cleared |
| Bus-derived LEFT/RIGHT/AHEAD | Eligible | Eligible |
| BUS/WAIT/NUMBER/UNKNOWN output | Received but suppressed by firmware | Eligible under existing gates |
| Local ToF proximity | Enabled, both-channel cadence | Sampled for health but output suppressed and cleared |
| Local siren output | Enabled and highest priority | Enabled and highest priority |

The web tests enumerate all eight activity/bus/person combinations. Firmware relay tests enumerate every activity/command combination and separately pin proximity suppression on entry to `STILL`.

## Exploratory Live Trial

Bus and person scenes cannot be reproduced under controlled conditions with the available props and environment. Treat the live camera run as exploratory confirmation only, not validation. Run it after deployment and record the phone screen, `/output`, and board Serial together:

1. Select `MOVING`, point at a visible person with no bus, and confirm only LEFT or RIGHT can result from person analysis; uncertainty must produce no direction.
2. Move the camera to a different person and confirm the previous direction does not carry across the target change.
3. Select `STILL` with a person visible and confirm person analysis produces no direction.
4. Present the bus prop while `STILL` and confirm bus direction remains available while BUS, WAIT, and NUMBER 88 retain priority.
5. Switch to `MOVING` with the bus still visible and confirm bus direction remains available while bus-information patterns are suppressed by the board.

Environmental variation, model latency, and detector confidence may change what is observed. A missed or uncertain detection is evidence for tuning, not evidence that the mode contract is wrong; a wrong-mode output or stale direction is a software defect.

## Live P1-Only Incident

During development, the connected board produced frequent P1-only pulses that sounded nearly continuous. Live `/api/state` evidence identified the source without guessing:

- relay command: `UNKNOWN`, not LEFT;
- activity: `MOVING`;
- telemetry: `playing: PROXIMITY`;
- ToF: approximately 715-721 mm, inside the 1200 mm proximity threshold;
- output trace: nine P1 pulses totaling about 1081 ms over five seconds, P3 idle.

The physical board was still running the older one-channel proximity firmware. The USB output monitor was disconnected to release the serial port, then service command `x` stopped all output. The next telemetry snapshot reported `playing: NONE`. This does not reproduce on the branch contract: native tests require active proximity to drive both channels and inactive proximity to drive neither. The board must be flashed with this branch before physical cue verification; compilation alone does not update the connected device.

## Deployment State

These changes are isolated on `feat/accessibility-cue-hardening`. Production at `https://tacta.space` continues to use the previous behavior until this branch is reviewed, merged, and deployed.
