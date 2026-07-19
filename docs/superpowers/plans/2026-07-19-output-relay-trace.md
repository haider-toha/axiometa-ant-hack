# Output Relay Trace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `Relay trace` tab to `/output` that compares the Redis-backed command snapshot with the ESP32's confirmed USB receipt and decision.

**Architecture:** `OutputMonitor` remains the only Web Serial owner and feeds incoming chunks to the existing output decoder plus a new pure relay-log decoder. `RelayTrace` polls `/api/state` only while visible, compares that snapshot with reduced board events, and renders the verdict inside the existing output dashboard without remounting the serial session.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS Modules, Web Serial, Vitest, Testing Library.

## Global Constraints

- Work on `feat/output-relay-trace` in an isolated worktree before editing production code.
- Do not reboot or flash the ESP32; parse the logs already emitted by current firmware.
- Keep `OutputMonitor` as the sole Web Serial owner; tab switching must not close or reopen the port.
- Poll `/api/state` every 500 ms only while the relay tab is mounted, with `cache: "no-store"` and an in-flight guard.
- Capture `/api/state` HTTP status, response duration, browser receive time, and `x-vercel-id` when present.
- Never write to `/api/event`, `/api/activity`, Redis, or the serial port.
- Compare command `seq` independently from `activitySeq`.
- Never claim relay-only confidence, arrival id, or timestamps were confirmed by the board.
- Ignore unrelated or malformed Serial lines and recover after bounded overlong input.
- Preserve the existing output-channel UI and five-second timeline.
- Keep the visual language aligned with the existing Tacta output monitor and respect reduced motion.

---

### Task 1: Parse and reduce board relay logs

**Files:**
- Create: `www/src/app/output/relay-serial.ts`
- Create: `www/src/app/output/relay-serial.test.ts`

**Interfaces:**
- Produces `RelaySerialDecoder.push(chunk, receivedAt) => BoardRelayEvent[]` and `reset()`.
- Produces `reduceBoardRelayState(state, events) => BoardRelayState` and `initialBoardRelayState()`.
- Produces `compareRelayState({ usbConnected, relayOnline, relay, board, now }) => RelayVerdict`.

- [ ] **Step 1: Write failing parser and reducer tests**

Cover partial chunks, multiple lines, command dispositions, gaps, activity, Wi-Fi, HTTP/parser failures, unrelated lines, overlong-line recovery, and a 20-event cap. Use real firmware strings:

```ts
const decoder = new RelaySerialDecoder();
expect(decoder.push("RELAY command=accepted pattern=NUM", 1_000)).toEqual([]);
expect(decoder.push("BER seq=24 activity=STILL route=88\n", 1_010)).toEqual([
  {
    kind: "command",
    disposition: "accepted",
    pattern: "NUMBER",
    seq: 24,
    activity: "STILL",
    route: "88",
    receivedAt: 1_010,
  },
]);
```

- [ ] **Step 2: Run the parser tests and verify RED**

```bash
cd www
pnpm exec vitest run src/app/output/relay-serial.test.ts
```

Expected: FAIL because `relay-serial.ts` does not exist.

- [ ] **Step 3: Implement bounded decoding and typed state**

Define exact unions for command dispositions (`unchanged`, `baseline`, `accepted`, `suppressed`, `no_output`, `route_mismatch`, `low_confidence`, `rejected`), activity events, command gaps, and transport events. Parse only anchored known formats. Keep a 2,048-character line limit and discard an overlong partial line through the next newline.

The reduced state must keep:

```ts
type BoardRelayState = {
  command: BoardCommandReceipt | null;
  activity: BoardActivityReceipt | null;
  transport: "unknown" | "connected" | "disconnected" | "degraded";
  lastError: string | null;
  lastEventAt: number | null;
  sequenceGap: number | null;
  events: BoardRelayEvent[];
};
```

Reset `sequenceGap` when a later command without a reported gap arrives. Store events newest-first and cap at 20.

- [ ] **Step 4: Write failing verdict tests**

Assert `NO USB`, `RELAY OFFLINE`, `WAITING`, `PENDING`, `MISSED`, `MISMATCH`, and every matched board disposition. `PENDING` becomes `MISSED` after two seconds. A sequence gap forces `MISSED`. Assert an independent activity comparison reports `matched`, `behind`, or `mismatch` without changing the command verdict.

- [ ] **Step 5: Implement the pure comparison**

Return a structured verdict:

```ts
type RelayVerdict = {
  kind: "no_usb" | "relay_offline" | "waiting" | "pending" | "missed" |
    "mismatch" | BoardCommandDisposition;
  label: string;
  tone: "neutral" | "positive" | "warning" | "destructive";
  detail: string;
  activity: "unknown" | "matched" | "behind" | "mismatch";
};
```

Use relay `device.ts` to measure pending age, but clamp future timestamps to age zero. Pattern and route must match at equal command sequence; route comparison treats missing board route as `""`.

- [ ] **Step 6: Run Task 1 tests and commit**

```bash
cd www
pnpm exec vitest run src/app/output/relay-serial.test.ts
git add src/app/output/relay-serial.ts src/app/output/relay-serial.test.ts
git commit -m "feat(output): decode board relay receipts"
```

Expected: all relay decoder and verdict tests PASS.

---

### Task 2: Render relay intent and board receipt

**Files:**
- Create: `www/src/app/output/relay-trace.tsx`
- Create: `www/src/app/output/relay-trace.test.tsx`
- Create: `www/src/app/output/relay-trace.module.css`

**Interfaces:**
- Consumes `connection`, `board: BoardRelayState`, and `clock`.
- Fetches `DebugState` from `/api/state`.
- Renders the verdict, aligned relay/board cards, activity/transport health, and event list.

- [ ] **Step 1: Write failing polling and presentation tests**

Mock `fetch` and use fake timers. Assert initial polling, 500 ms refresh, no overlapping request, offline state after failure, recovery after success, cleanup on unmount, and capture of HTTP status, request duration, receive time, and `x-vercel-id`. Render a matching relay/board pair and assert:

```ts
expect(screen.getByRole("status")).toHaveTextContent("ACCEPTED");
expect(screen.getByRole("heading", { name: "Relay outgoing" })).toBeInTheDocument();
expect(screen.getByRole("heading", { name: "Board received" })).toBeInTheDocument();
expect(screen.getByText("Relay only")).toBeInTheDocument();
expect(screen.getByRole("list", { name: "Recent relay events" })).toBeInTheDocument();
```

- [ ] **Step 2: Run the component test and verify RED**

```bash
cd www
pnpm exec vitest run src/app/output/relay-trace.test.tsx
```

Expected: FAIL because `RelayTrace` does not exist.

- [ ] **Step 3: Implement polling and the Tacta diagnostic layout**

Use a single `useEffect` with a local `cancelled` flag and `inFlight` ref. Retain the last successful snapshot when a later poll fails, but pass `relayOnline=false` to the comparator.

Render:

- a verdict strip with status text, sequence pair, and board-event age;
- side-by-side relay and board cards with aligned command, route, activity, and sequence rows;
- confidence, arrival id, and command age marked `Relay only`;
- activity freshness and independent sequence comparison;
- transport state, last board error, `/api/state` status/age/duration, and Vercel request id;
- newest-first event list capped by the reducer.

Use the existing teal/orange/neutral tokens, mono data labels, restrained borders, and text-plus-colour status. Stack cards below 760 px and disable nonessential transitions under reduced motion.

- [ ] **Step 4: Run Task 2 tests and commit**

```bash
cd www
pnpm exec vitest run src/app/output/relay-trace.test.tsx src/app/output/relay-serial.test.ts
git add src/app/output/relay-trace.tsx src/app/output/relay-trace.test.tsx src/app/output/relay-trace.module.css
git commit -m "feat(output): render relay receipt trace"
```

Expected: component and parser tests PASS.

---

### Task 3: Share Web Serial across output tabs

**Files:**
- Modify: `www/src/app/output/output-monitor.tsx`
- Modify: `www/src/app/output/output-monitor.test.tsx`
- Modify: `www/src/app/output/output-dashboard.tsx`
- Modify: `www/src/app/output/output-dashboard.test.tsx`
- Modify: `www/src/app/output/output-monitor.module.css`

**Interfaces:**
- `OutputMonitor` feeds every text chunk to both decoders and passes reduced board state to `OutputDashboard`.
- `OutputDashboard` owns the visible tab and mounts `RelayTrace` only for the relay view without remounting `OutputMonitor`.

- [ ] **Step 1: Write failing integration tests**

Feed a combined chunk containing both `TACTA_OUTPUT` and `RELAY command=...` lines. Assert the channel telemetry still updates and the relay tab shows the board receipt. Click between tabs and assert `openOutputSerialSession` remains called once. Disconnect and reconnect, then assert prior relay events are cleared.

- [ ] **Step 2: Run output integration tests and verify RED**

```bash
cd www
pnpm exec vitest run src/app/output/output-monitor.test.tsx src/app/output/output-dashboard.test.tsx
```

Expected: FAIL because relay state and tabs are not connected.

- [ ] **Step 3: Integrate the decoder and tabs**

Add `RelaySerialDecoder` and `BoardRelayState` refs/state beside the existing output decoder. In `consumeText`, push the same chunk through both decoders and reduce any relay events in one functional state update. Reset both decoder and board state in `resetTrace`.

Add accessible tabs with `role="tablist"`, `role="tab"`, `aria-selected`, and stable `aria-controls`. The default remains `Output channels`. Switching to `Relay trace` changes only the panel subtree; the connection header and `OutputMonitor` stay mounted.

- [ ] **Step 4: Run all focused output tests and commit**

```bash
cd www
pnpm exec vitest run src/app/output/output-timeline.test.ts src/app/output/output-dashboard.test.tsx src/app/output/output-monitor.test.tsx src/app/output/relay-serial.test.ts src/app/output/relay-trace.test.tsx src/lib/output-telemetry.test.ts
git add src/app/output/output-monitor.tsx src/app/output/output-monitor.test.tsx src/app/output/output-dashboard.tsx src/app/output/output-dashboard.test.tsx src/app/output/output-monitor.module.css
git commit -m "feat(output): add relay trace tab"
```

Expected: all focused output tests PASS and serial open count remains one.

---

### Task 4: Full verification and shipping

**Files:**
- Modify only files above if verification exposes a tested defect.

**Interfaces:**
- Produces a clean feature branch, mergeable PR, merged `main`, and removed feature worktree.

- [ ] **Step 1: Read relevant local Next.js 16 documentation**

Read the complete local App Router client-component, CSS Modules, and Vitest guides under `www/node_modules/next/dist/docs/` before editing Next.js code.

- [ ] **Step 2: Run required web verification**

```bash
cd www
pnpm exec vitest run
pnpm exec tsc --noEmit
pnpm run lint
pnpm run build
```

Expected: all tests, typecheck, lint, and production build pass. Missing local Upstash warnings are acceptable only when the build exits zero.

- [ ] **Step 3: Inspect scope and repository state**

```bash
git diff origin/main...HEAD --check
git diff --stat origin/main...HEAD
git status --short --branch
```

Expected: only the design/plan and output-relay trace implementation are present; worktree is clean.

- [ ] **Step 4: Push, open PR, and wait for GitHub checks**

Push `feat/output-relay-trace`, create a PR against `main`, and verify GitHub reports `MERGEABLE` with a clean merge state. Wait for both Web and Firmware checks; do not bypass a failed or pending gate.

- [ ] **Step 5: Verify the deployed endpoints with Vercel evidence**

Use the authenticated Vercel CLI without printing secrets:

```bash
vercel whoami
vercel link --yes --project bus-stop-awareness
vercel project inspect bus-stop-awareness
vercel ls
```

Create an explicit preview from `www/`, inspect it until ready, then send protected read-only requests through `vercel curl`:

```bash
PREVIEW_URL=$(vercel deploy --yes)
vercel inspect "$PREVIEW_URL" --wait --timeout 3m
vercel curl /api/state --deployment "$PREVIEW_URL"
vercel curl /api/pull --deployment "$PREVIEW_URL"
vercel logs "$PREVIEW_URL" --since 10m --limit 50 --json
```

Require HTTP 200 and validate that `/api/state` contains `seq`, `device`, and `telemetry` while `/api/pull` contains `seq`, `pattern`, `activity`, and `activitySeq`. Use the runtime log JSON to confirm both requests were received; record request paths, status, deployment URL, and timestamps in the PR or final handoff. Do not display environment values or tokens.

- [ ] **Step 6: Merge, verify production, and clean up**

Merge the PR only after all checks pass and no conflict is reported. Fast-forward local `main`, rerun focused web tests on the merged commit, then repeat the two read-only endpoint smokes with `vercel curl` using `--deployment https://tacta.space` and confirm receipt with `vercel logs https://tacta.space --since 10m --limit 50 --json`. Remove the isolated worktree and delete the feature branch locally and remotely only after production evidence is captured.
