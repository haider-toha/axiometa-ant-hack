# Track C — Camera Bearing Firmware

Date: 2026-07-19
Branch: `feat/relay-activity-contract`

## Scope

Track C of the camera-bearing work: the board half. The phone's camera detects a
bus, works out whether it is left, centre, or right of frame, and POSTs that as a
relay command. Before this pass the board's `parseCloudCommand()` did not know
the strings `"LEFT"`, `"RIGHT"`, `"AHEAD"`; they became `CloudCommand::INVALID`,
which `consumeRelayCommand()` turns into `RelayDisposition::REJECT` *before*
`acceptsRelayCommand()` is ever consulted. The board dropped them on the floor.

This pass restores the original `navigation_pure.h` intent — bearing commands in
the movement phase, bus commands at the stop — on top of the current
`relay_pure.h` structure, and wires them to the `PatternId::LEFT/RIGHT/AHEAD`
step tables that already existed in `patterns.h`. No new output was authored.

| Path | State |
|---|---|
| `firmware/braille_wearable/src/relay_pure.h` | MODIFIED, +50 |
| `firmware/braille_wearable/src/navigation_pure.h` | MODIFIED, +10 |
| `firmware/braille_wearable/src/main.cpp` | MODIFIED, +19 / −18 |
| `firmware/braille_wearable/test/test_relay/test_relay.cpp` | MODIFIED, +160 / −11 |
| `firmware/braille_wearable/test/test_navigation/test_navigation.cpp` | MODIFIED, +24 / −3 |
| `AGENTS.md` | MODIFIED, 1 line |

`www/`, `app/`, `vision/` and `cad/` are untouched by this track. The `www/` and
`slides/` entries visible in `git diff --stat` at the time of writing belong to
the two web tracks running in parallel on the same branch.

## What changed

### `firmware/braille_wearable/src/relay_pure.h`

| Lines | Change |
|---|---|
| 8–26 | `CloudCommand` gains `LEFT`, `RIGHT`, `AHEAD`, inserted after `ERROR` and before `INVALID`. Header comment records that the wire carries strings, that the two crossings are `parseCloudCommand()` and `cloudCommandName()`, and which commands belong to which activity payload |
| 107–109 | `parseCloudCommand()` maps the three exact uppercase strings. Everything else, including `nullptr`, `""`, `"left"`, `"LEFT "` and `"CENTRE"`, still yields `INVALID` |
| 147–151 | `isBearingCommand()` — new predicate naming the camera-derived set |
| 153–166 | `acceptsRelayCommand()` — bearing branch inserted *before* the existing `activity != STILL` early return, so the STILL path for `BUS`/`NUMBER`/`WAIT`/`UNKNOWN` is reached by exactly the same code as before |
| 167–190 | `CommandGate` enum and `evaluateCommandGate()` — a behaviour-preserving extraction of the drop-reason chain that was inline in `main.cpp`, so output arbitration becomes host-testable |
| 343–345 | `cloudCommandName()` returns `"LEFT"`, `"RIGHT"`, `"AHEAD"` for Serial diagnostics |

`consumeRelayCommand()` is untouched. Bearing commands are not `INVALID`, not
`NONE` and not `NUMBER`, so they fall straight through to the
`acceptsRelayCommand()` arm: `ACCEPT` while moving, `SUPPRESS` otherwise. The
route and confidence gates stay `NUMBER`-only, which is correct — those gates
exist to prevent a false route-88 readout, and a bearing carries no route.

**Ordinal stability.** Nothing depends on the ordinals, so inserting before
`INVALID` is safe. Verified rather than assumed:

- The wire is strings. `net.cpp:127` does
  `parseCloudCommand(responseDocument["pattern"].as<const char*>())`; the only
  outbound use is `cloudCommandName()`.
- No `static_cast<CloudCommand>(int)` and no serialisation of the ordinal exists
  anywhere in `firmware/` (grep over `src/` and `test/`).
- There is no NVS/flash persistence of a `CloudCommand`.
- `www/src/lib/contract.ts` independently documents the same rule for the
  neighbouring `UserActivity` enum: "NEVER serialise this as an integer",
  written after that enum was reordered.

The one visible consequence is that `CloudCommand::INVALID` moves from 6 to 9.
Both test suites compare enum values only against other enum values, never
against literals, so no test encodes the old numbering.

### `firmware/braille_wearable/src/navigation_pure.h`

`cloudPattern()` (line 22) gains `LEFT`, `RIGHT`, `AHEAD` cases at lines 37–42,
returning `outputPatternFor(PatternId::LEFT/RIGHT/AHEAD)` — the same tables
`serviceDirectionPattern()` already returns for the service-Serial `l`/`r`/`a`
keys. `CloudCommand::NONE` is now listed explicitly at line 43 alongside
`INVALID` rather than reaching `nullptr` via `default:`.

This file is outside the file list in the Track C brief. It was edited because
it is where `cloudPattern()` actually lives — the brief assumed that mapping was
in `main.cpp`. It also had to be edited rather than merely could: the existing
`default:` label means new enum members produce no `-Wswitch` warning and would
have silently returned `nullptr`, i.e. `COMMAND unsupported=LEFT` at runtime with
a clean build. It is firmware-only and cannot collide with the web tracks.

### `firmware/braille_wearable/src/main.cpp`

`submitCloudCommand()` (line 114) now calls `evaluateCommandGate()` and switches
on the result instead of running four inline `if` guards. **The four
`Serial.printf` drop lines are byte-identical to Sebastian's, in the same
precedence order.** This is a refactor for testability, not a behaviour change.

No other change was needed. Once `parseCloudCommand()` and `cloudPattern()` know
the three commands, the existing path carries them end to end:
`net.cpp` → `consumeRelayCommand()` → `RelayDisposition::ACCEPT` →
`submitCloudCommand()` (main.cpp:423) → `startPattern(cloudPlayer, …)`.
`currentlyPlayingName()` reports `LEFT`/`RIGHT`/`AHEAD` through
`cloudPlayer.pattern->name` with no edit.

## Gating truth table

`acceptsRelayCommand(activity, command)`. Pinned exhaustively by
`test_activity_gate_truth_table_is_exhaustive` and, independently, by
`test_all_activity_and_relay_command_combinations` in the navigation suite.

| Command | STILL | MOVING | UNKNOWN | Note |
|---|---|---|---|---|
| `NONE` | accept | accept | accept | global; clears output |
| `ERROR` | accept | accept | accept | global |
| `BUS` | accept | reject | reject | unchanged |
| `NUMBER` | accept | reject | reject | unchanged; also route + confidence gated |
| `WAIT` | accept | reject | reject | unchanged |
| `UNKNOWN` | accept | reject | reject | unchanged |
| `LEFT` | **reject** | **accept** | **reject** | new |
| `RIGHT` | **reject** | **accept** | **reject** | new |
| `AHEAD` | **reject** | **accept** | **reject** | new |
| `INVALID` | reject | reject | reject | unchanged; rejected earlier anyway |

Bearing requires `MOVING` exactly, not merely "not STILL". `effectiveActivity()`
never returns `UNKNOWN` today — it falls back to `MOVING` — but
`acceptsRelayCommand()` is a pure function and must not depend on that.

`evaluateCommandGate()` precedence, unchanged from the inline chain it replaced:

| Order | Condition | Result |
|---|---|---|
| 1 | `!outputEnabled` | `OUTPUT_STOPPED` |
| 2 | `!acceptsRelayCommand(...)` | `ACTIVITY_GATE` |
| 3 | `proximityRendering` | `LOCAL_PROXIMITY` |
| 4 | `sirenActive` | `LOCAL_SIREN` |
| 5 | — | `ALLOW` |

Local safety outranks the cloud unconditionally, and this now matters more than
it did: bearing commands are accepted in `MOVING`, which is exactly the state
where `shouldRenderProximity()` permits ToF output. Steps 3 and 4 are what stop a
bearing masking an obstacle. `ERROR`, though globally accepted, is still
subordinate to both.

## Verification

Both commands run from `firmware/braille_wearable`, output redirected to a file
with `set -o pipefail` — never piped into `tail`. Pasted verbatim.

### `pio test -e native` → exit 0

```
NATIVE_EXIT=0
...
=================================== SUMMARY ===================================
Environment    Test                    Status    Duration
-------------  ----------------------  --------  ------------
native         test_output_telemetry   PASSED    00:00:00.698
native         test_tof_bench          PASSED    00:00:00.402
native         test_siren_runtime      PASSED    00:00:00.403
native         test_siren              PASSED    00:00:00.415
native         test_navigation         PASSED    00:00:00.681
native         test_braille            PASSED    00:00:00.547
native         test_haptic             PASSED    00:00:00.578
native         test_tof_proximity      PASSED    00:00:00.631
native         test_audio              PASSED    00:00:00.562
native         test_buzzer_experiment  PASSED    00:00:00.385
native         test_relay              PASSED    00:00:00.545
================ 110 test cases: 110 succeeded in 00:00:05.848 ================
```

Baseline before this pass was 104 cases, also exit 0. Six new cases, no
regressions.

### `pio run -e board_firmware` → exit 0

Run twice. Incremental first; then `--target fullclean` and a full rebuild, so
the result cannot be a stale artefact. Clean run pasted:

```
CLEAN_BOARD_EXIT=0
Successfully created ESP32-S3 image.
Creating binary "firmware.factory.bin" with:
    Offset   | File
 -  0x0000   | bootloader.bin
 -  0x8000   | partitions.bin
 -  0xe000   | boot_app0.bin
 -  0x10000  | firmware.bin
Successfully created combined binary image.
========================= [SUCCESS] Took 15.37 seconds =========================

Environment     Status    Duration
--------------  --------  ------------
board_firmware  SUCCESS   00:00:15.370
========================= 1 succeeded in 00:00:15.370 =========================
```

The incremental run confirmed `main.cpp.o` and `net.cpp.o` both recompiled, i.e.
the `relay_pure.h` change genuinely entered the target build rather than being
skipped. `grep -iE "warning|error"` over the clean log returns nothing matching
`relay_pure`, `navigation_pure`, `main.cpp`, `CloudCommand`, `CommandGate`,
`LEFT`, `RIGHT` or `AHEAD`. Flash 87.3%, RAM 16.7%.

### Arduino macro collision

The brief flags the class of bug where a scoped enum member collides with an
Arduino `#define` — invisible to `native`, fatal on target. Checked directly
against `framework-arduinoespressif32` `cores/` and `variants/`:

```
LEFT -> 0 macro definition(s) in Arduino core
RIGHT -> 0 macro definition(s) in Arduino core
AHEAD -> 0 macro definition(s) in Arduino core
ALLOW -> 0 macro definition(s) in Arduino core
OUTPUT_STOPPED -> 0 macro definition(s) in Arduino core
ACTIVITY_GATE -> 0 macro definition(s) in Arduino core
LOCAL_PROXIMITY -> 0 macro definition(s) in Arduino core
LOCAL_SIREN -> 0 macro definition(s) in Arduino core
```

`OUTPUT_STOPPED` is safe despite Arduino's `#define OUTPUT` because macro
substitution matches whole tokens. `PatternId::LEFT` and `ServiceDirection::LEFT`
already shipped in this build, which was prior evidence; the clean target build
above is the proof.

## New tests

`test_relay.cpp`:

- `test_wire_command_parser_accepts_the_nine_cloud_patterns` — rewritten. It
  previously **asserted** `"LEFT"`/`"RIGHT"`/`"AHEAD"` parse to `INVALID`, which
  is the behaviour being removed, so it would have failed. Now asserts the three
  parse correctly and that the parser stays exact and closed for `"left"`,
  `"LEFT "`, `"CENTRE"`, `""` and `nullptr`.
- `test_command_names_round_trip_through_the_wire_vocabulary` — every command
  survives `cloudCommandName()` → `parseCloudCommand()`. Catches a future member
  added to one function and not the other.
- `test_activity_gate_truth_table_is_exhaustive` — all 10 commands × 3 activities.
- `test_camera_bearing_renders_while_moving_and_is_suppressed_while_still` —
  `ACCEPT` for all three while moving, `SUPPRESS` while still and while unknown,
  and a suppressed bearing is *consumed*, not queued: replaying its seq after the
  activity flips yields `UNCHANGED`. That is the AGENTS.md no-replay rule.
- `test_bearing_is_not_route_or_confidence_gated_like_number` — an empty route
  and `NO_CONFIDENCE` still render a bearing, while `NUMBER` with route `"87"`
  still yields `ROUTE_MISMATCH`.
- `test_local_proximity_and_siren_outrank_accepted_cloud_commands` — the
  precedence table above, including that the emergency-stop latch outranks
  everything and that a STILL bearing reports `ACTIVITY_GATE` rather than a
  misleading proximity reason.

`test_navigation.cpp`:

- `test_all_activity_and_relay_command_combinations` extended with the three
  bearing rows.
- `test_camera_bearing_reuses_the_service_direction_patterns` — `cloudPattern()`
  and `serviceDirectionPattern()` return the *same pointers*, so the relay path
  and the Serial path can never drift into two output vocabularies. Also pins
  800/800/1000 ms, the durations `www/src/lib/contract.ts` reasons about.

## AGENTS.md change

One line (33). Before:

> The single forward ToF zone cannot choose a safe left/right bypass. `LEFT`,
> `RIGHT`, and `AHEAD` are not relay commands or automatic navigation claims.

After:

> The single forward ToF zone cannot choose a safe left/right bypass, so ToF must
> never derive `LEFT`, `RIGHT`, or `AHEAD`, and no local sensor output may be
> described as navigation. Camera-derived bus bearing is a separate thing: the
> phone can see which side of frame the bus is on, so `LEFT`, `RIGHT`, and
> `AHEAD` are relay commands accepted in `MOVING` only, as advisory bus bearing.
> They are not obstacle avoidance, not automatic navigation, and never outrank
> the local ToF and siren paths.

Justification: "are not relay commands" became actively false the moment
`parseCloudCommand()` learned the strings — a reader following the old wording
would delete working code. The ToF safety claim it protects is not weakened, only
narrowed to ToF, which is where the evidence actually sits: one forward zone
cannot choose a bypass. The camera can see bearing; a ToF zone cannot. The
sentence about service-Serial tones needing an explicit simulation label is
retained verbatim, and the new text adds the local-safety subordination that the
code now enforces.

Nothing else in AGENTS.md was edited. Line 31 was left alone deliberately: it
enumerates what `MOVING` does without claiming the list is exhaustive, so it is
incomplete rather than wrong, and AGENTS.md is a shared file with two other
tracks live on this branch.

## Cross-track state

The web half landed in parallel and the two now meet. `www/src/lib/contract.ts`
already carries `"LEFT"`, `"RIGHT"`, `"AHEAD"` in both `CloudPattern` and
`CLOUD_PATTERNS`, plus `bearingToPattern()` emitting those exact uppercase
strings. Its doc comment describes precisely the bug fixed here: *"A board whose
`parseCloudCommand()` does not know these three strings drops them on the floor
no matter what its activity gate says."*

The division of responsibility is consistent from both sides. The relay
deliberately does not gate patterns on activity server-side; the board is the
single authority. That matches `evaluateCommandGate()` being the only gate.

No end-to-end run was performed. Neither half has been exercised against the
other on hardware, and this pass claims compile and host-test evidence only.

## Residual risk

1. **Sebastian must be told.** This modifies `relay_pure.h` and `main.cpp` from
   his PR #13, including a refactor of `submitCloudCommand()`. The drop-log
   strings and their precedence are preserved exactly, but he owns this code and
   did not review the change.
2. **Bearing oscillation truncates every pattern.** `startPattern()` restarts the
   step table from step 0 on each accepted command, and there is no minimum hold
   in firmware. `sameEvent()` on the web side suppresses a *repeated* identical
   bearing, but a bus sitting near a frame boundary produces
   `LEFT → AHEAD → LEFT` at the ~500 ms capture tick, and each of those is a
   genuinely new event. Against 800–1000 ms tables, no pattern would reach its
   second pulse and LEFT/RIGHT would collapse into one continuous buzz. The fix
   belongs on the classifier side as bearing hysteresis, or as a minimum-hold in
   `submitCloudCommand()`; neither exists today. Not addressed here because it is
   a design decision beyond this brief, but it will be audible on the first bench
   run with a moving target.
3. **No hardware verification.** The bearing path has never driven a buzzer. The
   claim is that it compiles and that the pure logic is pinned.
4. **Tactile claims unchanged.** These are 2350 Hz and 3050 Hz audible proxies.
   Nothing here demonstrates that two vibration channels would be
   distinguishable on the body, and the first-hour experiment found the buzzers
   produced virtually no tactile movement.
5. **Bearing carries no confidence gate.** Unlike `NUMBER`, a bearing renders at
   `NO_CONFIDENCE`. The web mitigates the analogous risk by degrading an
   unreadable bearing to `AHEAD` rather than to a turn, so a low-quality
   detection produces "keep going". If Modal ever emits low-confidence LEFT or
   RIGHT directly, the board will render it.
6. **`UserActivity` is the only thing separating the two payloads.** A phone
   stuck reporting `MOVING` at the stop renders bearings and suppresses bus
   information. The 120 s `CLOUD_ACTIVITY_LEASE_MS` fallback is itself `MOVING`,
   so the failure mode of a dead activity channel is now "bearings render",
   where before it was "nothing renders".
