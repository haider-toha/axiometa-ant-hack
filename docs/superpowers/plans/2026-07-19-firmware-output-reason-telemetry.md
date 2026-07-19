# Firmware Output Reason Telemetry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/output` explain the ESP32's current arbitration decision using atomic version 2 firmware telemetry while preserving version 1 boards and the existing channel timeline.

**Architecture:** A pure firmware module selects and formats the semantic winner from the existing arbitration state. `main.cpp` publishes one post-`serviceOutput()` snapshot using the semantic result plus the haptic layer's actual hardware drive. The Next.js decoder accepts strict v1/v2 records, and a focused reason presenter renders board-owned copy in the existing output dashboard.

**Tech Stack:** ESP32-S3 Arduino/PlatformIO C++ · Unity native tests · Next.js 16 Client Components · TypeScript · Vitest/React Testing Library · CSS Modules

## Global Constraints

- Work only in `/Users/sebastian/Programming/axiometa-ant-hack-output-telemetry` on `feat/output-reason-telemetry`.
- Do not flash, reset, reboot, or otherwise operate the connected board.
- Do not modify `/capture`, Modal, relay APIs, activity production, or the other agent's worktree.
- Preserve outbound-only networking and local ToF/siren behavior.
- `leftHz` and `rightHz` in version 2 are the actual post-output-mode hardware drive.
- The web app must continue to accept version 1 telemetry.
- Use test-first red/green cycles and stage only named files.

---

## File Structure

- Modify `firmware/braille_wearable/src/output_telemetry_pure.h`: closed telemetry enums, pure arbitration selection, equality, and v2 formatter.
- Modify `firmware/braille_wearable/test/test_output_telemetry/test_output_telemetry.cpp`: formatter, precedence, suppression, muting, source, and heartbeat tests.
- Modify `firmware/braille_wearable/src/haptic.h`: expose the actual hardware drive snapshot.
- Modify `firmware/braille_wearable/src/haptic.cpp`: stop emitting incomplete v1 records and expose the post-mode drive.
- Modify `firmware/braille_wearable/src/main.cpp`: retain player source, build semantic inputs, and publish atomic v2 records after output arbitration.
- Modify `www/src/lib/output-telemetry.ts`: discriminated v1/v2 types and strict parser.
- Modify `www/src/lib/output-telemetry.test.ts`: parser and streaming compatibility tests.
- Create `www/src/app/output/output-reason.ts`: pure firmware-enum-to-demo-copy mapping.
- Create `www/src/app/output/output-reason.test.ts`: exhaustive presentation tests.
- Modify `www/src/app/output/output-dashboard.tsx`: render the board-decision ribbon and extend its live announcement.
- Modify `www/src/app/output/output-dashboard.test.tsx`: connected v1 fallback and v2 reason-panel tests.
- Modify `www/src/app/output/output-monitor.module.css`: TACTA-aligned decision-ribbon layout, responsive behavior, and state styling.

---

### Task 1: Pure firmware telemetry contract

**Files:**
- Modify: `firmware/braille_wearable/src/output_telemetry_pure.h`
- Test: `firmware/braille_wearable/test/test_output_telemetry/test_output_telemetry.cpp`

**Interfaces:**
- Produces: `OutputTelemetryState`, `OutputTelemetrySource`, `OutputTelemetryReason`, `OutputSemanticInputs`, `OutputSemanticSnapshot`, `selectOutputSemantics()`, `sameOutputSnapshot()`, and `formatOutputTelemetry()`.
- Consumes: `HapticDrive`, `OutputMode`, and `UserActivity` from existing pure headers.

- [ ] **Step 1: Replace v1 formatter tests with failing v2 contract tests**

Add fixtures that call:

```cpp
const OutputSemanticSnapshot snapshot = selectOutputSemantics({
    true, false, "NONE", true, true, false,
    OutputTelemetrySource::NONE, "NONE",
    UserActivity::MOVING, 444, OutputMode::AUDIBLE,
});
formatOutputTelemetry(buffer, sizeof(buffer), {2350, 0}, 123456, snapshot);
```

Assert the exact output:

```text
TACTA_OUTPUT {"v":2,"leftHz":2350,"rightHz":0,"upMs":123456,"state":"ACTIVE","source":"LOCAL_TOF","pattern":"PROXIMITY","activity":"MOVING","reason":"PLAYING","tofMm":444,"outputMode":"AUDIBLE"}

```

Add separate tests for disabled-latch precedence, siren over ToF/player, player over suppressed ToF, STILL suppression, NIGHT conversion to `MUTED`, unknown ToF as JSON `null`, snapshot equality, truncation, and wrap-safe heartbeat behavior.

- [ ] **Step 2: Run the focused native test and verify RED**

Run:

```bash
/Users/sebastian/.platformio/penv/bin/pio test -e native -f test_output_telemetry
```

Expected: compilation fails because the new enums, structs, selector, and v2 signature do not exist.

- [ ] **Step 3: Implement the minimal pure contract**

Define closed enums and inputs:

```cpp
enum class OutputTelemetryState : uint8_t { ACTIVE, SUPPRESSED, MUTED, STOPPED, IDLE };
enum class OutputTelemetrySource : uint8_t { LOCAL_SIREN, LOCAL_TOF, RELAY, SERVICE, SYSTEM, NONE };
enum class OutputTelemetryReason : uint8_t { PLAYING, STILL_GATE, NIGHT_MODE, OUTPUT_STOPPED, NO_OUTPUT };

struct OutputSemanticInputs {
    bool outputEnabled;
    bool sirenActive;
    const char* sirenPattern;
    bool proximityActive;
    bool proximityCanRender;
    bool playerActive;
    OutputTelemetrySource playerSource;
    const char* playerPattern;
    UserActivity activity;
    int32_t tofMm;
    OutputMode outputMode;
};

struct OutputSemanticSnapshot {
    OutputTelemetryState state;
    OutputTelemetrySource source;
    const char* pattern;
    UserActivity activity;
    OutputTelemetryReason reason;
    int32_t tofMm;
    OutputMode outputMode;
};
```

Implement precedence exactly as the approved design, convert `ACTIVE` to `MUTED` only after choosing the logical winner, use `strcmp` for pattern equality, and format `tofMm < 0` as `null`. Enum-name functions must emit the exact uppercase wire strings.

- [ ] **Step 4: Run focused and full native tests and verify GREEN**

Run:

```bash
/Users/sebastian/.platformio/penv/bin/pio test -e native -f test_output_telemetry
/Users/sebastian/.platformio/penv/bin/pio test -e native
```

Expected: all telemetry cases and the full 111-case baseline plus new cases pass.

- [ ] **Step 5: Commit the pure contract**

```bash
git add firmware/braille_wearable/src/output_telemetry_pure.h firmware/braille_wearable/test/test_output_telemetry/test_output_telemetry.cpp
git commit -m "feat(firmware): define output reason telemetry"
```

---

### Task 2: Firmware runtime integration

**Files:**
- Modify: `firmware/braille_wearable/src/haptic.h`
- Modify: `firmware/braille_wearable/src/haptic.cpp`
- Modify: `firmware/braille_wearable/src/main.cpp`
- Test: `firmware/braille_wearable/test/test_haptic/test_haptic.cpp`

**Interfaces:**
- Consumes: Task 1's `selectOutputSemantics()`, `sameOutputSnapshot()`, and `formatOutputTelemetry()`.
- Produces: `HapticDrive hapticHardwareDrive()` and runtime `TACTA_OUTPUT` v2 emission.

- [ ] **Step 1: Add a failing haptic snapshot test where pure coverage is possible**

Keep mode semantics pinned through the existing pure function:

```cpp
const HapticDrive audible = hardwareDriveFor({2350, 3050}, OutputMode::AUDIBLE);
const HapticDrive night = hardwareDriveFor({2350, 3050}, OutputMode::NIGHT);
TEST_ASSERT_EQUAL_UINT16(2350, audible.p1Hz);
TEST_ASSERT_EQUAL_UINT16(0, night.p1Hz);
```

Add or retain this assertion before moving telemetry out of `haptic.cpp`; runtime glue is target-build verified because native tests do not compile Arduino source files.

- [ ] **Step 2: Move emission to the arbitration owner**

In `haptic.cpp`, remove `output_telemetry_pure.h`, `lastTelemetryMs`, and Serial record emission from `hapticWrite()`. Add:

```cpp
HapticDrive hapticHardwareDrive() {
    return {
        hardwareP1Hz == UINT16_MAX ? uint16_t{0} : hardwareP1Hz,
        hardwareP3Hz == UINT16_MAX ? uint16_t{0} : hardwareP3Hz,
    };
}
```

Declare it in `haptic.h`.

- [ ] **Step 3: Retain player provenance in `main.cpp`**

Add `OutputTelemetrySource cloudPlayerSource = OutputTelemetrySource::NONE;`. Set it to `RELAY` for accepted relay commands, `SERVICE` for Serial scenario/direction commands, and `SYSTEM` for `READY`. Reset it when explicitly stopping the cloud player.

Change `submitCloudCommand` to consume an explicit source:

```cpp
void submitCloudCommand(CloudCommand command, const char* name,
                        OutputTelemetrySource source) {
    // existing gates unchanged
    startPattern(cloudPlayer, *pattern, millis());
    cloudPlayerSource = source;
}
```

- [ ] **Step 4: Publish one atomic post-arbitration record**

Add `currentOutputSemantics()` and `serviceOutputTelemetry(nowMs)`. The latter reads `hapticHardwareDrive()` after `serviceOutput(nowMs)`, emits immediately on drive/semantic changes, and otherwise emits at the existing one-second heartbeat. Use a 320-byte fixed buffer and retain no heap object.

Call order in `loop()` must be:

```cpp
serviceOutput(nowMs);
serviceOutputTelemetry(nowMs);
serviceRelayTelemetry(nowMs);
```

- [ ] **Step 5: Verify native tests and target compilation**

Run:

```bash
/Users/sebastian/.platformio/penv/bin/pio test -e native
/Users/sebastian/.platformio/penv/bin/pio run -e board_firmware
```

Expected: native suite passes and the ESP32 image builds successfully. Do not run `pio run -t upload`.

- [ ] **Step 6: Commit runtime integration**

```bash
git add firmware/braille_wearable/src/haptic.h firmware/braille_wearable/src/haptic.cpp firmware/braille_wearable/src/main.cpp firmware/braille_wearable/test/test_haptic/test_haptic.cpp
git commit -m "feat(firmware): publish output arbitration reasons"
```

---

### Task 3: Backward-compatible web decoder

**Files:**
- Modify: `www/src/lib/output-telemetry.ts`
- Test: `www/src/lib/output-telemetry.test.ts`

**Interfaces:**
- Produces: discriminated `OutputTelemetryV1`, `OutputTelemetryV2`, and `OutputTelemetry` union.
- Consumes: exact version 2 wire fields from Task 1.

- [ ] **Step 1: Write failing v2 parser tests**

Add a valid `LOCAL_TOF` record and assert the full object. Add table cases rejecting missing semantic fields, unknown enum strings, `tofMm` below zero or above 65535, non-integer values, and unsupported version 3. Change the old version 2 rejection case to a malformed-version-2 case. Add a decoder test that streams a v1 record followed by a v2 record.

- [ ] **Step 2: Run focused web tests and verify RED**

Run:

```bash
pnpm test -- --run src/lib/output-telemetry.test.ts
```

Expected: valid v2 telemetry is rejected by the current v1-only parser.

- [ ] **Step 3: Implement strict discriminated parsing**

Define:

```ts
export type OutputTelemetryV1 = {
  v: 1;
  leftHz: number;
  rightHz: number;
  upMs: number;
};

export type OutputTelemetryV2 = {
  v: 2;
  leftHz: number;
  rightHz: number;
  upMs: number;
  state: "ACTIVE" | "SUPPRESSED" | "MUTED" | "STOPPED" | "IDLE";
  source: "LOCAL_SIREN" | "LOCAL_TOF" | "RELAY" | "SERVICE" | "SYSTEM" | "NONE";
  pattern: string;
  activity: "MOVING" | "STILL" | "UNKNOWN";
  reason: "PLAYING" | "STILL_GATE" | "NIGHT_MODE" | "OUTPUT_STOPPED" | "NO_OUTPUT";
  tofMm: number | null;
  outputMode: "AUDIBLE" | "NIGHT";
};

export type OutputTelemetry = OutputTelemetryV1 | OutputTelemetryV2;
```

Use readonly sets for enum validation, retain the shared numeric checks, bound `pattern` to a non-empty 20-character uppercase/underscore token, and keep v1 parsing unchanged.

- [ ] **Step 4: Verify focused and full web tests**

Run:

```bash
pnpm test -- --run src/lib/output-telemetry.test.ts
pnpm test -- --run
```

Expected: decoder tests and all web tests pass.

- [ ] **Step 5: Commit decoder compatibility**

```bash
git add www/src/lib/output-telemetry.ts www/src/lib/output-telemetry.test.ts
git commit -m "feat(web): parse firmware reason telemetry"
```

---

### Task 4: Board-decision ribbon

**Files:**
- Create: `www/src/app/output/output-reason.ts`
- Create: `www/src/app/output/output-reason.test.ts`
- Modify: `www/src/app/output/output-dashboard.tsx`
- Modify: `www/src/app/output/output-dashboard.test.tsx`
- Modify: `www/src/app/output/output-monitor.module.css`

**Interfaces:**
- Consumes: `OutputTelemetry` union from Task 3.
- Produces: `describeOutputReason()` and an accessible `Why this output?` region.

- [ ] **Step 1: Write failing pure presentation tests**

Test v1 fallback plus every v2 state. Pin copy for the demo-critical cases:

```ts
expect(describeOutputReason(proximity)).toEqual(expect.objectContaining({
  title: "Local proximity",
  description: "P1 is pulsing because an object is 444 mm away while moving.",
}));

expect(describeOutputReason(held)).toEqual(expect.objectContaining({
  title: "Proximity held",
  description: "An object is 444 mm away, but proximity output stays silent while still.",
}));
```

Also cover cloud RIGHT, siren priority, NIGHT mute, output stop, idle, service simulation, and system READY.

- [ ] **Step 2: Run the pure test and verify RED**

Run:

```bash
pnpm test -- --run src/app/output/output-reason.test.ts
```

Expected: module import fails because `output-reason.ts` does not exist.

- [ ] **Step 3: Implement minimal copy mapping**

Return a stable presentation object:

```ts
export type OutputReasonPresentation = {
  title: string;
  description: string;
  sourceLabel: string;
  activityLabel: string;
  state: "active" | "held" | "muted" | "stopped" | "idle" | "legacy" | "unavailable";
};
```

`describeOutputReason(telemetry, availability)` accepts `"live" | "stale" | "unavailable"`; stale and disconnected input must return explicit unavailable copy without exposing the previous reason as current. Prefer state-specific copy before source-specific active copy. Never call the passive buzzers vibration motors and never describe ToF as choosing a direction.

- [ ] **Step 4: Write failing dashboard tests**

Assert the channels tab contains a region named `Why this output?`, v1 shows `Reason unavailable`, v2 proximity shows the exact distance copy and `MOVING`/`LOCAL TOF` badges, and disconnected/stale displays do not present old reasons as live.

- [ ] **Step 5: Render the TACTA decision ribbon**

Place the panel above `.channels`:

```tsx
<section
  className={styles.reasonPanel}
  data-state={presentation.state}
  aria-label="Why this output?"
>
  <div className={styles.reasonRail} aria-hidden="true" />
  <div className={styles.reasonCopy}>
    <p>Why this output?</p>
    <h2>{presentation.title}</h2>
    <p>{presentation.description}</p>
  </div>
  <div className={styles.reasonBadges} aria-label="Board context">
    <span>{presentation.activityLabel}</span>
    <span>{presentation.sourceLabel}</span>
  </div>
</section>
```

The CSS uses existing background, card, border, mono, teal, orange, warning, destructive, and success tokens. The single signature element is a vertical decision rail whose style changes with the explicit text state; the rest stays quiet. Stack copy and badges below 700px and preserve reduced-motion behavior.

- [ ] **Step 6: Verify focused and full web checks**

Run:

```bash
pnpm test -- --run src/app/output/output-reason.test.ts src/app/output/output-dashboard.test.tsx src/app/output/output-monitor.test.tsx
pnpm test -- --run
pnpm exec tsc --noEmit
pnpm run lint
```

Expected: all tests, TypeScript, and ESLint pass with no warnings introduced.

- [ ] **Step 7: Commit the demo UI**

```bash
git add www/src/app/output/output-reason.ts www/src/app/output/output-reason.test.ts www/src/app/output/output-dashboard.tsx www/src/app/output/output-dashboard.test.tsx www/src/app/output/output-monitor.module.css
git commit -m "feat(web): explain board output decisions"
```

---

### Task 5: Full verification, review, and shipping

**Files:**
- Modify if evidence changes: `docs/superpowers/specs/2026-07-19-firmware-output-reason-telemetry-design.md`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: reviewed PR, merged main, and removed telemetry worktree/branch when safe.

- [ ] **Step 1: Run the complete firmware gates without upload**

```bash
cd firmware/braille_wearable
/Users/sebastian/.platformio/penv/bin/pio test -e native
/Users/sebastian/.platformio/penv/bin/pio run -e board_firmware
```

- [ ] **Step 2: Run the complete web gates**

```bash
cd www
pnpm test -- --run
pnpm exec tsc --noEmit
pnpm run lint
pnpm run build
```

- [ ] **Step 3: Review the diff and obtain the required reviewer gate**

Check `git diff origin/main...HEAD`, `git diff --check`, and `git status`. Address all important reviewer findings and rerun affected checks.

- [ ] **Step 4: Push and open the PR with evidence**

```bash
git push -u origin feat/output-reason-telemetry
gh pr create --base main --head feat/output-reason-telemetry --title "Explain ESP32 output reasons in demo monitor" --body $'## What changed\n- add atomic board-owned output reason telemetry\n- keep v1 boards compatible\n- explain active, held, muted, stopped, and idle states on /output\n\n## Verification\n- firmware native tests pass\n- board_firmware target builds without upload\n- web tests, TypeScript, lint, and production build pass\n- no board flash or reboot performed'
```

The PR body lists exact test totals, target build success, confirms no flash/reboot, and notes physical acceptance remains coordinated follow-up.

- [ ] **Step 5: Merge only if clean and green**

Confirm mergeability and checks through `gh pr view`/`gh pr checks`, then merge using the repository's normal merge method. Do not bypass a failing required check.

- [ ] **Step 6: Clean up safely**

After merge, remove only `/Users/sebastian/Programming/axiometa-ant-hack-output-telemetry` with `git worktree remove` once its status is clean. Delete the local feature branch if fully merged. Leave every other worktree untouched.
