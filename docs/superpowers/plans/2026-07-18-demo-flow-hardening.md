# Demo Flow Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add silent, repeatable verification and an operator runbook for the two-phase bus-stop demo.

**Architecture:** A dependency-free read-only Node probe validates the deployed
web/relay surface. Existing pure firmware policy receives one end-to-end
narrative regression. GitHub Actions reruns both stacks, while documentation
holds physical checks for daytime.

**Tech Stack:** Node.js 20 ESM, Vitest 4, Next.js 16, PlatformIO native Unity,
Arduino-ESP32 3.x, GitHub Actions.

## Global Constraints

- Haider owns the motion classifier and relay activity producer.
- Do not write production relay state or actuate/reset the board overnight.
- Preserve MSET-before-INCR command ordering and outbound-only ESP networking.
- Route `88` and destination `Clapham Common` remain hardcoded.
- Work only on `feat/demo-flow-hardening`.

---

### Task 1: Read-only deployment probe

**Files:**
- Create: `www/scripts/demo-readiness.mjs`
- Create: `www/scripts/demo-readiness.test.mjs`
- Modify: `www/package.json`

**Interfaces:**
- Consumes: `DEMO_BASE_URL` or `--base-url`, public HTTP GET routes.
- Produces: `runReadiness({ baseUrl, fetchImpl })` and CLI exit code 0/1.

- [ ] **Step 1: Write failing tests for successful and incomplete deployments**

Cover 200 HTML routes, missing `/output`, absent activity fields, malformed JSON,
network failure, and assert every mocked request uses `GET`.

- [ ] **Step 2: Run the focused test and confirm it fails because the module is missing**

Run: `pnpm exec vitest run scripts/demo-readiness.test.mjs`

- [ ] **Step 3: Implement the minimum probe**

Require `/`, `/capture`, `/output`, `/api/pull`, and `/api/state`. Validate exact
command/activity types without changing server state.

- [ ] **Step 4: Run focused and full web tests**

Run: `pnpm exec vitest run scripts/demo-readiness.test.mjs && pnpm test`

- [ ] **Step 5: Commit**

```bash
git add www/package.json www/scripts/demo-readiness.mjs www/scripts/demo-readiness.test.mjs
git commit -m "test(www): add read-only demo readiness probe"
```

### Task 2: Exact firmware demo regression

**Files:**
- Modify: `firmware/braille_wearable/test/test_relay/test_relay.cpp`

**Interfaces:**
- Consumes: `observeActivitySnapshot`, `applyCloudActivity`,
  `consumeRelayCommand`, `effectiveActivity`.
- Produces: one pure narrative regression for the team demo sequence.

- [ ] **Step 1: Add the exact sequence test**

Assert MOVING suppression, STILL transition, BUS/WAIT/NUMBER acceptance, exact
route `88`, and suppression after returning to MOVING.

- [ ] **Step 2: Run only the relay test and confirm the new expectation fails if a gate is wrong**

Run: `pio test -e native -f test_relay`

- [ ] **Step 3: Make only fixture corrections required by the existing policy**

No production firmware change is expected. If the existing policy disagrees,
stop and document the discrepancy before changing runtime code.

- [ ] **Step 4: Run the complete native suite**

Run: `pio test -e native`

- [ ] **Step 5: Commit**

```bash
git add firmware/braille_wearable/test/test_relay/test_relay.cpp
git commit -m "test(firmware): rehearse exact two-phase demo flow"
```

### Task 3: CI verification

**Files:**
- Create: `.github/workflows/verify.yml`

**Interfaces:**
- Consumes: tracked lockfile and PlatformIO project.
- Produces: independent `web` and `firmware` PR checks.

- [ ] **Step 1: Add the workflow**

Use pinned major actions, Node 20, pnpm frozen install, and Python 3.12 with
PlatformIO. Do not add deployment or secret-dependent steps.

- [ ] **Step 2: Validate workflow syntax locally**

Parse the YAML with an available structured parser and inspect the resulting
job/step names.

- [ ] **Step 3: Run the same commands locally**

Run web test/typecheck/lint/build and firmware native test/build.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/verify.yml
git commit -m "ci: verify web and firmware demo paths"
```

### Task 4: Morning runbook and audit

**Files:**
- Create: `DEMO-RUNBOOK.md`
- Create: `audit/bus-stop-situational-awareness/14-demo-readiness.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: actual live probe results and merged branch inventory.
- Produces: operator sequence, fallback path, blockers, and evidence record.

- [ ] **Step 1: Run the live probe read-only**

Run: `pnpm demo:readiness -- --base-url https://bus-stop-awareness.vercel.app`

- [ ] **Step 2: Write the runbook**

Include wiring, startup order, MOVING/STILL triggers, expected display, emergency
stop, daytime-only alerts, and a five-minute fallback rehearsal.

- [ ] **Step 3: Record measured readiness**

List exact status codes and missing fields. Mark physical checks `NOT RUN` under
quiet-hours policy.

- [ ] **Step 4: Link the runbook from README**

- [ ] **Step 5: Commit**

```bash
git add README.md DEMO-RUNBOOK.md audit/bus-stop-situational-awareness/14-demo-readiness.md
git commit -m "docs: add morning demo rehearsal runbook"
```

### Task 5: Final verification and PR

**Files:** No new files.

- [ ] **Step 1: Run full verification**

```bash
cd www
pnpm test
pnpm exec tsc --noEmit
pnpm run lint
pnpm run build
cd ../firmware/braille_wearable
pio test -e native
pio run -e board_firmware
```

- [ ] **Step 2: Run `git diff --check` and confirm a clean worktree**

- [ ] **Step 3: Push `feat/demo-flow-hardening` and open a draft PR**

- [ ] **Step 4: Wait for GitHub checks and record any external blockers**
