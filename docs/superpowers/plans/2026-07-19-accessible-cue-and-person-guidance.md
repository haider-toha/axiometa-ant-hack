# Accessible Cue And Person Guidance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden Claude-selected person avoidance and replace the overloaded buzzer vocabulary with a mode-aware, easily learned two-channel cue grammar.

**Architecture:** Keep `/api/event` and the ESP32 `LEFT | RIGHT | AHEAD` wire contract unchanged. Ground the person-direction request with the selected normalized box, normalize a structured Claude response into a fail-closed endpoint result, and gate asynchronous results through a pure client state machine before they can reach the relay. In firmware, reserve one-channel output for LEFT/RIGHT and move every non-directional cue to both channels.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Anthropic TypeScript SDK structured outputs, ESP32 Arduino/C++, PlatformIO Unity native tests.

## Global Constraints

- Work only in `/Users/sebastian/Programming/axiometa-ant-hack-accessible-cues` on `feat/accessibility-cue-hardening`.
- Rebase or merge new `origin/main` work before final verification; Haider is actively changing the capture and relay surfaces.
- Preserve `/api/event`, `/api/pull`, Redis keys, cloud pattern spellings, and ESP32 relay parsing.
- Person avoidance is eligible only in `MOVING`; bus direction remains eligible in both known activity states.
- Person avoidance returns LEFT or RIGHT only. Failure, low confidence, stale state, or a non-obstructing person emits no direction and never defaults to AHEAD.
- P1-only means LEFT and P3-only means RIGHT. Every non-directional firmware pattern uses both channels.
- The AX22-0018 buzzers remain audible proxies. Do not claim tactile or DeafBlind-user validation.
- Do not reset or flash the physical board without explicit coordination.
- Before editing Next.js files, read the relevant local Next 16 route-handler and client-component documentation under `www/node_modules/next/dist/docs/`.

---

### Task 1: Fail-Closed Person-Direction Endpoint

**Files:**
- Create: `www/src/lib/person-direction.ts`
- Create: `www/src/lib/person-direction.test.ts`
- Create: `www/src/app/api/person-direction/route.test.ts`
- Modify: `www/src/app/api/person-direction/route.ts`

**Interfaces:**
- Consumes: `{ frame_b64: string, person_box: [number, number, number, number] }`.
- Produces: `PersonDirectionResponse`, one of `ok`, `clear`, or `unavailable`.
- Exports: `parsePersonDirectionRequest()`, `normalizePersonDecision()`, `createPersonDirectionPost()`.

- [x] **Step 1: Write failing domain tests**

Add tests that reject missing/empty/oversized frames and malformed boxes, then pin all model-result combinations:

```ts
expect(parsePersonDirectionRequest({ frame_b64: "jpeg", person_box: [0.2, 0.1, 0.8, 0.9] })).toEqual({
  ok: true,
  value: { frameB64: "jpeg", personBox: [0.2, 0.1, 0.8, 0.9] },
});
expect(parsePersonDirectionRequest({ frame_b64: "jpeg", person_box: [0.8, 0.1, 0.2, 0.9] }).ok).toBe(false);
expect(normalizePersonDecision({ obstructing: true, direction: "left", confidence: "high" })).toEqual({
  status: "ok",
  direction: "left",
});
expect(normalizePersonDecision({ obstructing: false, direction: "none", confidence: "high" })).toEqual({
  status: "clear",
  direction: null,
});
expect(normalizePersonDecision({ obstructing: true, direction: "right", confidence: "low" })).toEqual({
  status: "unavailable",
  direction: null,
  reason: "low_confidence",
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
cd www
pnpm vitest run src/lib/person-direction.test.ts
```

Expected: FAIL because `@/lib/person-direction` does not exist.

- [x] **Step 3: Implement the closed domain contract**

Create these exact public types and functions:

```ts
export const MAX_PERSON_FRAME_BASE64_LENGTH = 2 * 1024 * 1024;
export type PersonBox = readonly [number, number, number, number];
export type PersonDirection = "left" | "right";
export type PersonDirectionReason =
  | "invalid_request"
  | "timeout"
  | "model_error"
  | "invalid_response"
  | "low_confidence";
export type PersonDirectionResponse =
  | { status: "ok"; direction: PersonDirection }
  | { status: "clear"; direction: null }
  | { status: "unavailable"; direction: null; reason: PersonDirectionReason };

export interface PersonModelDecision {
  obstructing: boolean;
  direction: PersonDirection | "none";
  confidence: "high" | "low";
}

export function parsePersonDirectionRequest(value: unknown):
  | { ok: true; value: { frameB64: string; personBox: PersonBox } }
  | { ok: false; response: PersonDirectionResponse };

export function normalizePersonDecision(value: unknown): PersonDirectionResponse;
```

Validation requires four finite `0..1` box coordinates with `x1 < x2` and `y1 < y2`. Normalization rejects unknown keys/types and inconsistent combinations such as `obstructing: true` with `direction: "none"`.

- [x] **Step 4: Run the domain test and verify GREEN**

Run `pnpm vitest run src/lib/person-direction.test.ts`.

Expected: PASS.

- [x] **Step 5: Write failing route orchestration tests**

Test the injectable handler without a live Anthropic call:

```ts
const post = createPersonDirectionPost(async () => ({
  obstructing: true,
  direction: "right",
  confidence: "high",
}));
const response = await post(request({ frame_b64: "jpeg", person_box: [0.2, 0.1, 0.8, 0.9] }));
expect(response.status).toBe(200);
expect(await response.json()).toEqual({ status: "ok", direction: "right" });
```

Also pin HTTP 400 invalid input, HTTP 200 low confidence/clear, HTTP 502 invalid model output, HTTP 503 model error, and timeout cancellation. Assert the decider is never called for invalid input.

- [x] **Step 6: Run the route test and verify RED**

Run `pnpm vitest run src/app/api/person-direction/route.test.ts`.

Expected: FAIL because `createPersonDirectionPost` is not exported.

- [x] **Step 7: Implement the route and structured Claude output**

Replace free-text parsing with `output_config.format`:

```ts
output_config: {
  format: {
    type: "json_schema",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["obstructing", "direction", "confidence"],
      properties: {
        obstructing: { type: "boolean" },
        direction: { type: "string", enum: ["left", "right", "none"] },
        confidence: { type: "string", enum: ["high", "low"] },
      },
    },
  },
},
```

The prompt includes the selected normalized box and distinguishes “visible” from “blocking.” Construct the Anthropic client with `maxRetries: 0` and a 4000 ms timeout. Export:

```ts
export type PersonDirectionDecider = (
  input: { frameB64: string; personBox: PersonBox },
) => Promise<unknown>;

export function createPersonDirectionPost(decide: PersonDirectionDecider) {
  return async function POST(request: Request): Promise<Response>;
}

export const POST = createPersonDirectionPost(decideWithClaude);
```

Return CORS headers on every path. Log duration/outcome only; do not log frames or secrets.

- [x] **Step 8: Run focused and full web tests**

Run:

```bash
pnpm vitest run src/lib/person-direction.test.ts src/app/api/person-direction/route.test.ts
pnpm test
```

Expected: all tests pass.

- [x] **Step 9: Commit the endpoint unit**

```bash
git add www/src/lib/person-direction.ts www/src/lib/person-direction.test.ts \
  www/src/app/api/person-direction/route.ts www/src/app/api/person-direction/route.test.ts
git commit -m "fix(web): fail closed on uncertain person guidance"
```

---

### Task 2: MOVING-Only, Stale-Safe Person Guidance

**Files:**
- Create: `www/src/lib/person-guidance.ts`
- Create: `www/src/lib/person-guidance.test.ts`
- Modify: `www/src/app/capture/page.tsx`
- Modify: `www/src/lib/contract.test.ts` only if existing event-selection expectations need explicit person-path coverage

**Interfaces:**
- Consumes: `UserActivity`, target presence, request generation, and `PersonDirectionResponse`.
- Produces: a stable `MotionBearing | null` for the existing `chooseEvent()` path.
- Preserves: bus-first target selection and edge-triggered `/api/event` writes.

- [x] **Step 1: Write failing state-machine tests**

Pin eligibility and stabilization:

```ts
expect(personGuidanceEligible("MOVING", false, true)).toBe(true);
expect(personGuidanceEligible("STILL", false, true)).toBe(false);
expect(personGuidanceEligible("MOVING", true, true)).toBe(false);

let state = initialPersonGuidanceState();
state = acceptPersonDirection(state, "left");
expect(state.direction).toBe("left");
state = acceptPersonDirection(state, "right");
expect(state.direction).toBe("left");
state = acceptPersonDirection(state, "right");
expect(state.direction).toBe("right");
expect(clearPersonGuidance(state).direction).toBeNull();
expect(personResultIsCurrent(4, 5, "MOVING", false, requestBox, currentBox)).toBe(false);
```

- [x] **Step 2: Run the focused test and verify RED**

Run `pnpm vitest run src/lib/person-guidance.test.ts`.

Expected: FAIL because the module does not exist.

- [x] **Step 3: Implement the pure state machine**

Export:

```ts
export interface PersonGuidanceState {
  direction: "left" | "right" | null;
  reversalCandidate: "left" | "right" | null;
  reversalCount: number;
}

export function initialPersonGuidanceState(): PersonGuidanceState;
export function clearPersonGuidance(state: PersonGuidanceState): PersonGuidanceState;
export function acceptPersonDirection(
  state: PersonGuidanceState,
  incoming: "left" | "right",
): PersonGuidanceState;
export function personGuidanceEligible(
  activity: UserActivity,
  hasBus: boolean,
  hasPerson: boolean,
): boolean;
export function personResultIsCurrent(
  requestGeneration: number,
  currentGeneration: number,
  activity: UserActivity,
  hasBus: boolean,
  requestPersonBox: PersonBox,
  currentPersonBox: PersonBox | null,
): boolean;
export function personTargetMatches(a: PersonBox, b: PersonBox): boolean;
```

The first direction applies immediately. A direct opposite direction requires two consecutive matching results. Same-direction results clear any pending reversal.

- [x] **Step 4: Run the state-machine test and verify GREEN**

Run `pnpm vitest run src/lib/person-guidance.test.ts`.

Expected: PASS.

- [x] **Step 5: Integrate the state machine into capture**

Replace `personDirectionRef` with state, generation, and abort refs. Send the selected box:

```ts
body: JSON.stringify({ frame_b64: frameB64, person_box: personTarget.box }),
```

Only request when `personGuidanceEligible(activityRef.current, Boolean(busTarget), Boolean(personTarget))` is true. On response, require `response.ok`, validate `status`, and apply only when `personResultIsCurrent(...)` remains true for the same tracked box (`IoU >= 0.30`). Clear and invalidate on `STILL`, bus selection, person disappearance or replacement, camera stop, `clear`, `unavailable`, or fetch failure.

Map accepted person directions into the existing bearing vocabulary:

```ts
const personBearing = state.direction; // "left" | "right" | null; never center
```

Keep Haider's `PERSON_MIN_CONFIDENCE = 0.35`, generic phone copy, bus-first selection, 1500 ms request cadence, and existing `sameEvent()` edge-trigger.

- [x] **Step 6: Run web verification**

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm run lint
```

Expected: all pass with no new warnings.

- [x] **Step 7: Commit the capture unit**

```bash
git add www/src/lib/person-guidance.ts www/src/lib/person-guidance.test.ts \
  www/src/app/capture/page.tsx www/src/lib/contract.test.ts
git commit -m "fix(capture): reject stale person avoidance directions"
```

---

### Task 3: Enforce The Two-Channel Cue Grammar In Firmware

**Files:**
- Modify: `firmware/braille_wearable/src/patterns.h`
- Modify: `firmware/braille_wearable/src/haptic_pure.h`
- Modify: `firmware/braille_wearable/src/main.cpp`
- Modify: `firmware/braille_wearable/test/test_navigation/test_navigation.cpp`
- Modify: `firmware/braille_wearable/test/test_haptic/test_haptic.cpp`
- Modify: `firmware/braille_wearable/test/test_buzzer_experiment/test_buzzer_experiment.cpp`

**Interfaces:**
- Preserves: output telemetry v1 and all `PatternId`/`CloudCommand` names.
- Produces: P1-only LEFT, P3-only RIGHT, and both-channel non-directional cues.

- [x] **Step 1: Write failing pattern and invariant tests**

Update exact waveform expectations:

```cpp
assertStep(AHEAD_PATTERN.steps[0], 2350, 3050, 600);
TEST_ASSERT_EQUAL_UINT8(1, AHEAD_PATTERN.stepCount);
assertStep(WAIT_PATTERN.steps[0], 2350, 3050, 200);
assertStep(WAIT_PATTERN.steps[1], 0, 0, 600);
assertStep(WAIT_PATTERN.steps[2], 2350, 3050, 200);
assertStep(ERROR_PATTERN.steps[0], 2350, 3050, 600);
```

Add an exhaustive pattern census that fails when any pattern other than LEFT contains P1-only output or any pattern other than RIGHT contains P3-only output. Add a haptic pure test requiring active proximity drive `{2350, 3050}`.

- [x] **Step 2: Run focused firmware tests and verify RED**

```bash
/Users/sebastian/.platformio/penv/bin/pio test -e native \
  -f test_navigation -f test_haptic -f test_buzzer_experiment
```

Expected: FAIL on current AHEAD, WAIT, ERROR, and proximity behavior.

- [x] **Step 3: Implement minimal pattern changes**

Use these exact tables:

```cpp
inline constexpr OutputStep AHEAD_STEPS[] = {
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 600},
};

inline constexpr OutputStep WAIT_STEPS[] = {
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 200},
    {0, 0, 600},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 200},
};

inline constexpr OutputStep ERROR_STEPS[] = {
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 600}, {0, 0, 300},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 150}, {0, 0, 300},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 600},
};
```

Add:

```cpp
inline constexpr HapticDrive proximityDrive(bool active) {
    return active
        ? HapticDrive{AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ}
        : HapticDrive{0, 0};
}
```

Use `proximityDrive(proximityToneOn)` in `serviceOutput()` instead of writing only P1.

- [x] **Step 4: Run focused and full firmware tests**

```bash
/Users/sebastian/.platformio/penv/bin/pio test -e native \
  -f test_navigation -f test_haptic -f test_buzzer_experiment
/Users/sebastian/.platformio/penv/bin/pio test -e native
```

Expected: all 11 native suites pass.

- [x] **Step 5: Build the board image without flashing**

```bash
/Users/sebastian/.platformio/penv/bin/pio run -e board_firmware
```

Expected: firmware links successfully. Do not run `upload`.

- [x] **Step 6: Commit the firmware unit**

```bash
git add firmware/braille_wearable/src/patterns.h \
  firmware/braille_wearable/src/haptic_pure.h \
  firmware/braille_wearable/src/main.cpp \
  firmware/braille_wearable/test/test_navigation/test_navigation.cpp \
  firmware/braille_wearable/test/test_haptic/test_haptic.cpp \
  firmware/braille_wearable/test/test_buzzer_experiment/test_buzzer_experiment.cpp
git commit -m "feat(firmware): make output cue grammar unambiguous"
```

---

### Task 4: Synchronize Current Documentation And Verify The Integrated Branch

**Files:**
- Modify: `plan/2026-07-18-bus-stop-situational-awareness.md`
- Create: `audit/bus-stop-situational-awareness/26-accessible-cue-and-person-guidance.md`
- Modify: `docs/superpowers/specs/2026-07-19-accessible-cue-and-person-guidance-design.md` only if implementation exposes a verified constraint that changes the design

**Interfaces:**
- Documents the implemented truth without changing runtime contracts.

- [x] **Step 1: Update the authoritative plan and audit**

Add a latest revision that states:

```text
Single-channel output is reserved for movement direction: P1-only = LEFT and
P3-only = RIGHT. All hazards, alerts, information, and status cues use both
channels. Person avoidance is MOVING-only and Claude chooses the clear side;
bus bearing points toward the bus. Uncertain person guidance emits no command.
```

Correct the P4, P7, P10, and P13 rows to match the implemented timings. Record test counts, build results, production smoke results, and the audible-proxy claim boundary in audit 26.

- [x] **Step 2: Run complete web verification**

```bash
cd www
pnpm test
pnpm exec tsc --noEmit
pnpm run lint
pnpm run build
```

Expected: all commands pass. Local Upstash warnings are acceptable only if the build completes.

- [x] **Step 3: Run complete firmware verification**

```bash
cd firmware/braille_wearable
/Users/sebastian/.platformio/penv/bin/pio test -e native
/Users/sebastian/.platformio/penv/bin/pio run -e board_firmware
```

Expected: all native suites pass and the board image builds without upload.

- [ ] **Step 4: Run production fail-closed smoke after deployment, not before**

```bash
curl -fsS -X POST https://tacta.space/api/person-direction \
  -H 'content-type: application/json' --data '{}'
```

Expected after deployment: HTTP 400 with `status: "unavailable"`, `direction: null`, and `reason: "invalid_request"`. Before deployment, record the known old response `{"direction":"ahead"}` rather than treating it as branch failure.

- [x] **Step 5: Reconcile new main work and rerun affected checks**

Fetch `origin/main`, inspect every incoming capture/relay/person-direction change, and rebase only with a clean tree. Resolve semantically in favor of the approved spec while preserving unrelated Haider UI and relay-trace work. Rerun web tests after any reconciliation.

- [ ] **Step 6: Request independent review**

Ask a `deep_reviewer` to inspect person-guidance safety, concurrency/stale-response handling, relay compatibility, firmware cue collisions, and missing tests. Fix every critical/high finding and rerun the affected verification.

- [ ] **Step 7: Commit documentation and final integration fixes**

```bash
git add plan/2026-07-18-bus-stop-situational-awareness.md \
  audit/bus-stop-situational-awareness/26-accessible-cue-and-person-guidance.md \
  docs/superpowers/specs/2026-07-19-accessible-cue-and-person-guidance-design.md
git commit -m "docs: record accessible cue hardening evidence"
```

- [ ] **Step 8: Prepare the PR**

Push `feat/accessibility-cue-hardening` and open a PR to `main` only after all checks and review pass. Do not merge while Haider has an overlapping unmerged capture branch; report the exact overlap first.
