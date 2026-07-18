# Serial Output Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the ESP32's actual LEFT/P1 and RIGHT/P3 output transitions on a crowd-visible laptop route while the phone camera and ESP Wi-Fi relay remain active.

**Architecture:** Firmware emits a prefixed JSON record when `hapticWrite` changes a physical channel and repeats the current state as a 1 Hz heartbeat. A client-only `/output` route in the existing Next.js app reads those records with Web Serial and passes validated state to a separate presentational dashboard.

**Tech Stack:** ESP32-S3 Arduino C++17, PlatformIO/Unity, Next.js 16.2, React 19, TypeScript, Web Serial, Tailwind CSS 4, Vitest, Testing Library.

## Global Constraints

- Work only on `feat/serial-output-monitor`; do not touch the relay agent's worktree.
- Treat `hapticWrite` as the physical-output source of truth and limit unchanged-state heartbeat records to 1 Hz.
- Emit only `TACTA_OUTPUT {"v":1,"leftHz":N,"rightHz":N,"upMs":N}` records and preserve existing human-readable logs.
- Keep the browser connection read-only and local to the MacBook.
- Do not infer semantic events such as bus, siren, or navigation from frequency values.
- Mark disconnected and stale data explicitly; never present stale values as live output.
- Keep PlatformIO Serial Monitor closed while Chrome owns the port.

---

### Task 1: Versioned firmware output telemetry

**Files:**
- Create: `firmware/braille_wearable/src/output_telemetry_pure.h`
- Modify: `firmware/braille_wearable/src/haptic.cpp`
- Create: `firmware/braille_wearable/test/test_output_telemetry/test_output_telemetry.cpp`

**Interfaces:**
- Produces: `int formatOutputTelemetry(char *buffer, size_t size, uint16_t leftHz, uint16_t rightHz, uint32_t upMs)`
- Produces: serial line prefix `TACTA_OUTPUT ` followed by protocol-v1 JSON and `\n`

- [ ] **Step 1: Add failing native tests for exact formatting and bounded writes**

```cpp
void test_formats_protocol_v1_record(void) {
    char buffer[96];
    const int length = formatOutputTelemetry(buffer, sizeof(buffer), 2350, 3050, 123456);
    TEST_ASSERT_GREATER_THAN(0, length);
    TEST_ASSERT_EQUAL_STRING(
        "TACTA_OUTPUT {\"v\":1,\"leftHz\":2350,\"rightHz\":3050,\"upMs\":123456}\n",
        buffer);
}

void test_reports_truncation_for_small_buffer(void) {
    char buffer[8];
    TEST_ASSERT_EQUAL_INT(-1, formatOutputTelemetry(buffer, sizeof(buffer), 2350, 0, 1));
}
```

- [ ] **Step 2: Run `pio test -e native -f test_output_telemetry` and verify it fails because the helper is absent**
- [ ] **Step 3: Implement the pure `snprintf` helper with integer bounds and return `-1` on formatting failure or truncation**
- [ ] **Step 4: Run the focused native test and verify both tests pass**
- [ ] **Step 5: Update `hapticWrite` to track whether either frequency changed, update both channels first, then emit one formatted record with `millis()`**
- [ ] **Step 6: Run the full native suite and `pio run -e board_firmware`**
- [ ] **Step 7: Commit the independently buildable firmware protocol**

---

### Task 2: Browser parser and serial transport

**Files:**
- Modify: `www/package.json`
- Modify: `www/pnpm-lock.yaml`
- Create: `www/vitest.config.ts`
- Create: `www/src/test/setup.ts`
- Create: `www/src/lib/output-telemetry.ts`
- Create: `www/src/lib/output-telemetry.test.ts`
- Create: `www/src/lib/web-serial.ts`

**Interfaces:**
- Produces: `OutputTelemetry = { v: 1; leftHz: number; rightHz: number; upMs: number }`
- Produces: `parseOutputTelemetryLine(line: string): OutputTelemetry | null`
- Produces: `OutputTelemetryDecoder.push(chunk: string): OutputTelemetry[]`
- Produces: `openGrantedOutputPort()`, `requestOutputPort()`, and `readOutputPort(port, handlers)`

- [ ] **Step 1: Install the locked `www` dependencies and read the bundled Next.js client-component documentation before editing route code**
- [ ] **Step 2: Add Vitest, jsdom, Testing Library, jest-dom, and Web Serial types as dev dependencies plus `test` and `test:watch` scripts**
- [ ] **Step 3: Add failing parser tests for split chunks, multiple records, mixed logs, CRLF, malformed JSON, unsupported versions, non-integers, negative values, and uint bounds**
- [ ] **Step 4: Implement strict telemetry validation and a stateful line decoder that preserves incomplete trailing input**
- [ ] **Step 5: Run the focused parser test and verify it passes**
- [ ] **Step 6: Implement a read-only Web Serial adapter at 115200 baud with first-use request, previously granted port lookup, cancellation, stream release, and clear busy-port errors**
- [ ] **Step 7: Run TypeScript-aware lint and tests, then commit the parser and transport boundary**

---

### Task 3: Crowd-visible output route

**Files:**
- Create: `www/src/app/output/page.tsx`
- Create: `www/src/app/output/output-monitor.tsx`
- Create: `www/src/app/output/output-dashboard.tsx`
- Create: `www/src/app/output/output-dashboard.test.tsx`
- Create: `www/src/app/output/output-monitor.module.css`

**Interfaces:**
- Consumes: strict `OutputTelemetry` records and Web Serial lifecycle helpers from Task 2
- Produces: `/output`, with `unsupported | disconnected | connecting | connected | error` connection states and `live | stale` telemetry state

- [ ] **Step 1: Add failing presentational tests for disconnected, connected idle, left-only, right-only, both-active, stale, and unsupported-browser states**
- [ ] **Step 2: Implement a fixed two-region dashboard with LEFT/P1 and RIGHT/P3 labels, active/idle text, hertz values, non-color active cues, and accessible status announcements**
- [ ] **Step 3: Add stable actuator animation and a short time-based pulse history using a CSS module, with reduced-motion support and responsive laptop/mobile fallback**
- [ ] **Step 4: Implement the client controller: reconnect a granted port on load, connect on user gesture, read and decode telemetry, mark data stale after 1500 ms without a record, preserve brief pulses in history, and disconnect cleanly**
- [ ] **Step 5: Run component tests, full tests, lint, and production build**
- [ ] **Step 6: Start the Next.js dev server and inspect `/output` at desktop and narrow viewports with mocked states before using the hardware**
- [ ] **Step 7: Commit the completed web monitor**

---

### Task 4: Integrated verification and delivery

**Files:**
- Modify only if verification finds a scoped defect in files from Tasks 1-3.

**Interfaces:**
- Consumes: compiled board firmware and deployed/local `/output` route
- Produces: evidence for concurrent Wi-Fi, phone camera, USB serial, and left/right output behavior

- [ ] **Step 1: Rebase or merge the latest target branch only after checking for the relay agent's overlapping changes**
- [ ] **Step 2: Run `pio test -e native`, `pio run -e board_firmware`, `pnpm test`, `pnpm lint`, and `pnpm build` from their respective directories**
- [ ] **Step 3: Request a read-only reviewer pass focused on protocol correctness, serial lifecycle cleanup, stale-state safety, and cross-agent merge risk**
- [ ] **Step 4: Fix substantive findings and repeat affected verification**
- [ ] **Step 5: Upload the firmware and execute the seven-step physical acceptance test in the design spec with the user**
- [ ] **Step 6: Push the feature branch and open a pull request rather than pushing this cross-cutting feature directly to `main`**
