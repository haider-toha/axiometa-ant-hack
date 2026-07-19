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

- Web unit suite: 13 files, 370 tests passed.
- Web lint: passed with no warnings.
- Next.js 16 production build: passed. Local build emitted the expected missing-Upstash-environment warnings.
- Firmware native suite: 13 suites, 116 tests passed.
- `board_firmware` target: built successfully in the firmware implementation pass.
- No board flash, sound playback, physical navigation trial, or representative-user test was performed in this pass.

## Deployment State

These changes are isolated on `feat/accessibility-cue-hardening`. Production at `https://tacta.space` continues to use the previous behavior until this branch is reviewed, merged, and deployed.
