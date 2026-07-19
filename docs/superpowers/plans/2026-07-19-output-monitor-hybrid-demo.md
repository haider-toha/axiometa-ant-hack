# Output Monitor Hybrid Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make very short P1/P3 output pulses visible through a truthful 750 ms afterglow and a labelled, duration-proportional five-second timeline.

**Architecture:** `OutputMonitor` will retain a bounded set of ESP32-timestamped state transitions and track browser-time pulse endings. A pure `output-timeline.ts` module will turn those transitions into clipped percentage segments, while `OutputDashboard` renders literal live state, the brief `RECENT` echo, and the two-lane Tacta instrument view.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS Modules, Vitest, Testing Library, Web Serial.

## Global Constraints

- Work only in `/Users/sebastian/Programming/axiometa-ant-hack-output-timeline` on `feat/output-monitor-hybrid-demo`.
- Do not reboot or flash the ESP32; this change is entirely in `www/` plus its design and plan documents.
- Keep the current state and frequency literal. A completed pulse must show `RECENT` with `0 Hz`, never a stale active frequency.
- Use a fixed 750 ms afterglow and a fixed 5,000 ms rolling timeline.
- Use ESP32 `upMs` for pulse durations and browser receive time only for projection and afterglow.
- Preserve the current Web Serial telemetry protocol and all relay/firmware behavior.
- Reuse existing Tacta design tokens, teal P1/Left mapping, orange P3/Right mapping, typography, and restrained card treatment.
- Do not add charting dependencies, gradients, replay controls, history controls, or artificial pulse duration.
- Clear trace state when board uptime regresses and whenever a serial session starts or is manually disconnected.
- Keep live-region announcements literal; afterglow must not be announced as active output.
- Respect `prefers-reduced-motion`.

---

### Task 1: Pure five-second timeline model

**Files:**
- Create: `www/src/app/output/output-timeline.ts`
- Create: `www/src/app/output/output-timeline.test.ts`

**Interfaces:**
- Consumes: ESP32 state transitions shaped as `OutputTransition`.
- Produces: `buildOutputTimeline(transitions, nowUpMs, traceEndUpMs, windowMs?) => OutputTimeline`, plus `pruneOutputTransitions(transitions, nowUpMs, windowMs?) => OutputTransition[]`.

- [ ] **Step 1: Write failing tests for proportional, clipped, and simultaneous segments**

Create `output-timeline.test.ts` with fixtures that assert:

```ts
const transitions: OutputTransition[] = [
  { id: 1, leftHz: 0, rightHz: 0, upMs: 5_000, receivedAt: 50_000 },
  { id: 2, leftHz: 2_350, rightHz: 3_050, upMs: 8_000, receivedAt: 53_000 },
  { id: 3, leftHz: 0, rightHz: 0, upMs: 8_120, receivedAt: 53_120 },
];

expect(buildOutputTimeline(transitions, 10_000, 10_000).left).toEqual([
  expect.objectContaining({ startPercent: 60, widthPercent: 2.4, durationMs: 120 }),
]);
expect(buildOutputTimeline(transitions, 10_000, 10_000).right).toEqual([
  expect.objectContaining({ startPercent: 60, widthPercent: 2.4, durationMs: 120 }),
]);
```

Add a segment that begins before `nowUpMs - 5_000` and assert that it starts at `0`, is clipped to the window, and reports only its visible duration. Add a currently active transition and assert that its end is capped by `traceEndUpMs`, not allowed to run past known-fresh output.

- [ ] **Step 2: Run the focused test and confirm the module is missing**

Run:

```bash
cd www
./node_modules/.bin/vitest run src/app/output/output-timeline.test.ts
```

Expected: FAIL because `@/app/output/output-timeline` does not exist.

- [ ] **Step 3: Implement the pure model**

Create these exported types:

```ts
export const OUTPUT_TIMELINE_WINDOW_MS = 5_000;

export type OutputTransition = {
  id: number;
  leftHz: number;
  rightHz: number;
  upMs: number;
  receivedAt: number;
};

export type OutputTimelineSegment = {
  id: string;
  startPercent: number;
  widthPercent: number;
  durationMs: number;
};

export type OutputTimeline = {
  left: OutputTimelineSegment[];
  right: OutputTimelineSegment[];
};
```

Implement `buildOutputTimeline` by treating each transition as the state until the next transition, clipping active intervals to `[nowUpMs - windowMs, nowUpMs]`, capping an open final interval at `traceEndUpMs`, and merging touching active intervals for the same channel. Use deterministic segment ids such as `left-${startMs}-${endMs}`.

Implement `pruneOutputTransitions` so it keeps transitions inside the five-second window plus exactly one preceding transition needed to establish the state at the left edge. If all transitions precede the window, keep only the newest transition.

- [ ] **Step 4: Run the focused tests**

Run:

```bash
cd www
./node_modules/.bin/vitest run src/app/output/output-timeline.test.ts
```

Expected: all timeline model tests PASS.

- [ ] **Step 5: Commit the timeline model**

```bash
git add www/src/app/output/output-timeline.ts www/src/app/output/output-timeline.test.ts
git commit -m "feat(output): model five-second pulse timeline"
```

---

### Task 2: Serial transition capture, afterglow timing, and session resets

**Files:**
- Modify: `www/src/app/output/output-monitor.tsx`
- Modify: `www/src/app/output/output-monitor.test.tsx`

**Interfaces:**
- Consumes: `OutputTransition`, `pruneOutputTransitions`, and `OUTPUT_TIMELINE_WINDOW_MS` from Task 1.
- Produces: dashboard props `history`, `clock`, `timelineNowUpMs`, `traceEndUpMs`, and `recentPulseEndedAt`.

- [ ] **Step 1: Add failing serial-behavior tests**

Extend the Web Serial mock test harness so a test can call `handlers[0].onText()` with newline-delimited telemetry. Add tests that:

```ts
act(() => handlers[0].onText(
  '{"v":1,"leftHz":2350,"rightHz":0,"upMs":1000}\n' +
  '{"v":1,"leftHz":0,"rightHz":0,"upMs":1120}\n',
));
expect(screen.getByText("RECENT")).toBeInTheDocument();
expect(screen.getByLabelText("Left output frequency")).toHaveTextContent("0 Hz");
```

Advance fake timers past 750 ms and expect the left channel to return to `IDLE`. Feed a timestamp regression after a visible pulse, then assert that the old timeline summary is gone. Finally, manually disconnect and assert that the timeline returns to `Waiting for a pulse`.

- [ ] **Step 2: Run the monitor test and confirm the new behavior fails**

Run:

```bash
cd www
./node_modules/.bin/vitest run src/app/output/output-monitor.test.tsx
```

Expected: FAIL because the dashboard has no recent-pulse or duration-timeline state.

- [ ] **Step 3: Replace count-limited history with timestamped transitions**

In `output-monitor.tsx`:

- Replace `OutputHistoryEntry` with `OutputTransition`.
- Add `AFTERGLOW_MS = 750` to the dashboard module in Task 3 and use that value through dashboard rendering; do not duplicate a second duration constant in the monitor.
- Add refs for the last parsed record and current history id.
- For every parsed record, capture `receivedAt = Date.now()`.
- If `record.upMs < previousRecord.upMs`, replace history with a single new transition and clear both recent-pulse end timestamps.
- Otherwise, append a transition only if either frequency changed, and prune it against the latest `record.upMs`.
- When a channel changes from positive Hz to `0`, store `receivedAt` as that channel's recent pulse end.
- Keep `lastRecordAt`, `telemetry`, and `clock` updated even for unchanged frequency samples.
- On a new connection attempt and manual disconnect, clear telemetry, transition history, recent pulse ends, decoder state, and the previous-record ref.

Derive projection values before rendering:

```ts
const elapsedSinceRecord = lastRecordAt === null ? 0 : Math.max(0, clock - lastRecordAt);
const timelineNowUpMs = telemetry ? telemetry.upMs + elapsedSinceRecord : null;
const traceEndUpMs = telemetry
  ? telemetry.upMs + (fresh ? elapsedSinceRecord : 0)
  : null;
```

Pass those values, `clock`, and `{ left, right }` recent timestamps to `OutputDashboard`.

- [ ] **Step 4: Run the monitor lifecycle tests**

Run:

```bash
cd www
./node_modules/.bin/vitest run src/app/output/output-monitor.test.tsx
```

Expected: all existing connection tests and new trace/reset tests PASS.

- [ ] **Step 5: Commit serial trace capture**

```bash
git add www/src/app/output/output-monitor.tsx www/src/app/output/output-monitor.test.tsx
git commit -m "feat(output): retain truthful pulse timing"
```

---

### Task 3: Literal recent-pulse presentation and labelled timeline

**Files:**
- Modify: `www/src/app/output/output-dashboard.tsx`
- Modify: `www/src/app/output/output-dashboard.test.tsx`
- Modify: `www/src/app/output/output-monitor.module.css`

**Interfaces:**
- Consumes: `OutputTransition`, `buildOutputTimeline`, and the projection/recent-pulse props from Task 2.
- Produces: the final accessible Tacta hybrid demo view.

- [ ] **Step 1: Add failing dashboard tests for hybrid presentation**

Update the dashboard fixture to include:

```ts
clock: 10_000,
timelineNowUpMs: 5_000,
traceEndUpMs: 5_000,
recentPulseEndedAt: { left: null, right: null },
```

Add a completed left pulse whose end timestamp is 500 ms before `clock`. Assert all of the following:

```ts
expect(screen.getByText("RECENT")).toBeInTheDocument();
expect(screen.getByLabelText("Left output frequency")).toHaveTextContent("0 Hz");
expect(screen.getByText("P1")).toBeInTheDocument();
expect(screen.getByText("LEFT")).toBeInTheDocument();
expect(screen.getByText("P3")).toBeInTheDocument();
expect(screen.getByText("RIGHT")).toBeInTheDocument();
expect(screen.getByText("-5 s")).toBeInTheDocument();
expect(screen.getByText("NOW")).toBeInTheDocument();
expect(screen.getByLabelText(/Left: 1 pulse, 120 milliseconds/)).toBeInTheDocument();
```

Assert the left actuator exposes `data-recent="true"` while `data-active="false"`, and assert a timestamp older than 750 ms renders `IDLE` with `data-recent="false"`.

- [ ] **Step 2: Run the dashboard test and confirm the hybrid UI is absent**

Run:

```bash
cd www
./node_modules/.bin/vitest run src/app/output/output-dashboard.test.tsx
```

Expected: FAIL on missing `RECENT`, timeline lane labels, and accessible duration summary.

- [ ] **Step 3: Implement the dashboard behavior and timeline markup**

In `output-dashboard.tsx`:

- Export `OUTPUT_AFTERGLOW_MS = 750`.
- Replace `OutputHistoryEntry` with `OutputTransition`.
- Add the five projection/recent props from Task 2 to `OutputDashboardProps`.
- Compute `recent` only when connected, fresh, idle, and `clock - endedAt <= 750`.
- Keep `active` strictly tied to a fresh positive frequency.
- Set the state priority to `UNKNOWN`, `WAITING`, `STALE`, `ACTIVE`, `RECENT`, then `IDLE`.
- Add `data-recent` to the actuator while retaining literal `data-active`.

Replace `PulseHistory` with `PulseTimeline`. It calls:

```ts
const timeline = buildOutputTimeline(
  history,
  timelineNowUpMs ?? 0,
  traceEndUpMs ?? 0,
);
```

Render labelled lane rows, a shared grid, absolutely positioned bars using `left: ${startPercent}%` and `width: ${widthPercent}%`, and a scale row with `-5 s` and `NOW`. If both arrays are empty, render `Waiting for a pulse`. Add a visually hidden summary with exact pulse counts and total visible milliseconds per lane, using singular/plural grammar.

- [ ] **Step 4: Apply restrained Tacta styling**

In `output-monitor.module.css`:

- Keep the existing dashboard, card, typography, and channel token system.
- Style `[data-recent="true"]` with a tinted channel ring and one 750 ms fade; do not animate it like live output.
- Style `RECENT` badges with the channel's soft background and foreground colour, visually quieter than `ACTIVE`.
- Replace the 42 px barcode with a compact instrument panel containing a label column and a two-row track.
- Give each lane a neutral baseline and five subtle one-second grid divisions using CSS backgrounds or pseudo-elements.
- Render solid teal/orange pulse bars, at their calculated percentages, with 2 px rounding and no minimum width other than the browser's rendered subpixel.
- Keep `-5 s` and `NOW` in mono text aligned to the lane bounds.
- At widths below 700 px, shorten the label column and preserve both lanes rather than stacking them separately.
- Under `prefers-reduced-motion`, remove both the active pulse animation and afterglow transition while retaining static colour/state.

- [ ] **Step 5: Run all focused output tests**

Run:

```bash
cd www
./node_modules/.bin/vitest run src/app/output/output-timeline.test.ts src/app/output/output-dashboard.test.tsx src/app/output/output-monitor.test.tsx
```

Expected: all focused output tests PASS.

- [ ] **Step 6: Commit the hybrid demo view**

```bash
git add www/src/app/output/output-dashboard.tsx www/src/app/output/output-dashboard.test.tsx www/src/app/output/output-monitor.module.css
git commit -m "feat(output): add hybrid pulse demo view"
```

---

### Task 4: Full verification and browser proof

**Files:**
- Modify only if verification exposes a defect in Task 1-3 files.

**Interfaces:**
- Consumes: complete hybrid output monitor.
- Produces: evidence that the implementation works in tests, production build, desktop browser, narrow layout, and reduced-motion mode.

- [ ] **Step 1: Read the relevant local Next.js 16 documentation before final code review**

Read the full local documents that cover App Router client components, testing, and CSS behavior under `www/node_modules/next/dist/docs/`. Record the exact files read in the handoff.

- [ ] **Step 2: Run the complete output test set**

```bash
cd www
./node_modules/.bin/vitest run src/app/output/output-timeline.test.ts src/app/output/output-dashboard.test.tsx src/app/output/output-monitor.test.tsx src/lib/output-telemetry.test.ts
```

Expected: all output and decoder tests PASS.

- [ ] **Step 3: Run required web verification**

Because the host has pnpm 9 while this repo records pnpm 11 workspace policy, use the installed standalone binaries where pnpm workspace parsing would fail:

```bash
cd www
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint .
./node_modules/.bin/next build
```

Expected: typecheck and lint exit 0; Next.js production build completes successfully. Missing local Upstash environment warnings are acceptable only if the build still exits 0, per `AGENTS.md`.

- [ ] **Step 4: Verify the real browser surface with simulated serial telemetry**

Start one development server and reuse it for all browser checks:

```bash
cd www
./node_modules/.bin/next dev
```

In desktop Chrome, open `/output` and use a Web Serial test stream or the existing mocked/simulated telemetry path to confirm:

- a 120 ms left pulse remains visible as `RECENT` for 750 ms while frequency reads `0 Hz`;
- the left bar occupies 2.4% of the five-second lane;
- left/right simultaneous pulses align;
- bars age toward `-5 s` and disappear;
- lane labels remain clear at a narrow mobile viewport;
- reduced-motion mode preserves the static `RECENT` cue without animation.

Capture a screenshot for review if the browser tool supports local capture. Stop the development server after the checks.

- [ ] **Step 5: Inspect scope and repository state**

```bash
git diff origin/main...HEAD --check
git diff --stat origin/main...HEAD
git status --short --branch
```

Expected: only the design doc, implementation plan, and output-monitor implementation/tests are changed; the worktree is clean.

- [ ] **Step 6: Commit any verification-only corrections**

If Step 2-5 required corrections, stage only the affected output-monitor files and commit:

```bash
git commit -m "fix(output): harden hybrid demo view"
```

If no corrections were needed, do not create an empty commit.
