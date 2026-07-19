# Output Relay Trace Design

**Date:** 2026-07-19
**Status:** Approved for implementation

## Goal

Add a demo-safe diagnostic view to `/output` that distinguishes what the relay currently intends to send from what the ESP32 has actually parsed and decided. The view must answer three questions at a glance:

1. What command and activity snapshot is available at the relay?
2. Did the connected board receive the same command edge?
3. Did the board accept, suppress, baseline, or reject it?

The debugger must reuse the firmware already on the board. It must not require a reboot, firmware edit, or flash.

## Interaction model

`/output` gains two in-page tabs:

- `Output channels` keeps the existing live P1/P3 monitor unchanged.
- `Relay trace` shows relay intent, board receipt, comparison status, and recent transport events.

Both tabs share the existing Web Serial session. Serial decoding continues regardless of the selected tab so switching views cannot lose a short relay edge. A separate browser page is deliberately avoided because two pages cannot reliably own the same serial port.

The selected tab may be reflected in `?view=relay` or `?view=channels` so the relay trace is bookmarkable, but changing tabs must not navigate away from the mounted serial owner or reopen the port.

## Data sources

### Relay intent

While the relay tab is selected, the browser polls `/api/state` every 500 ms with `cache: "no-store"`. The response already contains the same Redis-backed `DeviceCommand` snapshot returned by `/api/pull`, plus detector and device telemetry. This feature uses only the command/activity fields:

- `seq`, `pattern`, `route`, `conf`, `arrivalId`, and `ts`;
- `activity`, `activitySeq`, and `activityTs`.

Polling uses an in-flight guard and stops when the component unmounts. An HTTP error marks relay intent unavailable but does not affect the serial session or output monitor.

Each successful poll also records endpoint evidence: HTTP status, browser receive time, request duration, and the `x-vercel-id` response header when Vercel provides it. This is displayed separately from command data so the demo can show that the deployed endpoint answered, not merely that stale state exists in the UI.

### Board-confirmed receipt

The existing firmware logs sufficient structured key/value lines over USB:

- `RELAY command=<disposition> pattern=<pattern> seq=<n> activity=<activity> route=<route>`;
- `RELAY command=gap seq=<n> missed=<n>`;
- `RELAY activity=<activity> seq=<n> override=<0|1>`;
- activity baseline and invalidation lines;
- Wi-Fi connection/disconnection, HTTP status, parser rejection, queue-drop, and poll-failure lines.

A dedicated incremental decoder shares each incoming serial chunk with the existing `OutputTelemetryDecoder`. It buffers partial lines, ignores unrelated audio/ToF/output telemetry, and emits typed relay events only for recognised complete lines. Malformed or future log variants are ignored rather than guessed.

The board-receipt state contains the latest command receipt, activity receipt, transport status, last serial relay event time, and a bounded recent-event list. Browser receive time is presentation metadata; sequence, pattern, route, disposition, and activity remain board-reported truth.

## Comparison verdict

The relay tab presents one prominent verdict derived from relay intent and the latest board command receipt:

- `NO USB`: no active Web Serial session.
- `RELAY OFFLINE`: `/api/state` cannot be read.
- `WAITING`: USB and relay are available but no board command receipt has been observed in this session.
- `PENDING`: relay `seq` is newer than the board receipt and the relay edge is at most two seconds old.
- `MISSED`: relay `seq` remains newer for more than two seconds, or the board reports a sequence gap.
- `MISMATCH`: sequence numbers match but pattern or route differs.
- `BASELINE`, `ACCEPTED`, `SUPPRESSED`, `NO OUTPUT`, `ROUTE MISMATCH`, `LOW CONFIDENCE`, or `REJECTED`: sequence, pattern, and route match, with the label taken from the board disposition.

Comparison never claims that fields absent from the firmware log were board-confirmed. Confidence, arrival id, and command timestamp are visibly labelled as relay-only fields. Activity is compared independently through `activitySeq`, because command and activity sequence counters must never be conflated.

## Relay trace layout

The view follows the existing Tacta instrument styling and uses four restrained regions:

1. A verdict strip with status, sequence comparison, and last board event age.
2. Side-by-side `Relay outgoing` and `Board received` cards with aligned command fields.
3. An `Activity and transport` row showing relay activity freshness, board activity/override state, Wi-Fi state, the latest transport error, `/api/state` HTTP status and response age, and the Vercel request id when available.
4. A compact, newest-first event trace capped at 20 recognised relay events.

Statuses use text and colour. Expected gating such as `SUPPRESSED` is not rendered as a failure; it is a valid board decision. `MISSED`, `MISMATCH`, relay unavailability, and parse/HTTP failures receive destructive treatment. Raw serial noise is not displayed.

The existing `/` relay monitor remains unchanged. This view is narrower and board-receipt-focused because it is part of the physical output diagnostic workflow.

## Component boundaries

- `OutputMonitor` remains the sole Web Serial owner and feeds every chunk to both decoders.
- A pure `relay-serial.ts` module owns incremental line buffering, parsing, typed events, state reduction, and comparison verdicts.
- `RelayTrace` owns `/api/state` polling and renders the already-reduced board state.
- `OutputDashboard` remains responsible only for physical channel presentation.
- A small output shell/tab component switches the visible panel without remounting `OutputMonitor`.

## Error and lifecycle handling

- Starting a new serial session clears all prior board receipt and event state.
- Manual disconnect clears receipt state and produces `NO USB`.
- Board uptime is not used to match relay commands; independent monotonic sequence fields are authoritative.
- Relay polling errors retain the last relay snapshot for context but clearly mark it stale/offline.
- Serial decoder buffers are bounded. Overlong lines are discarded until the next newline, matching the existing output telemetry decoder's defensive behavior.
- No debugger action writes to `/api/event`, `/api/activity`, Redis, or the serial port.

## Verification

Tests cover:

- partial and multi-line serial chunks;
- recognised command dispositions, route values, activity updates, gaps, and transport failures;
- ignoring unrelated firmware logs;
- buffer recovery after an overlong line;
- every comparison verdict, including independent activity mismatch;
- tab switching without closing or reopening Web Serial;
- relay polling success, failure, recovery, and in-flight protection;
- captured endpoint status, duration, response time, and Vercel request id;
- manual disconnect and reconnect state clearing;
- accessible labels for tab selection, verdict, relay fields, board fields, and event trace.

Required verification:

```bash
cd www
pnpm exec vitest run
pnpm exec tsc --noEmit
pnpm run lint
pnpm run build
```

No firmware build, board reset, or flash is required because the design parses the logs already emitted by the merged firmware.

Before merge, the authenticated Vercel CLI will identify the linked project and preview deployment. Read-only smoke requests to the deployed `/api/state` and `/api/pull` endpoints must return HTTP 200 with the expected contract keys. Vercel runtime logs must show those requests reaching the deployment. After merge, repeat the read-only smoke against `https://tacta.space` and record the endpoint responses and request-log evidence in the PR/handoff. Never print environment values or authentication tokens.

## Non-goals

- Changing relay, Redis, `/api/pull`, command gating, or firmware behavior.
- Sending test commands from the debugger.
- Treating relay intent as proof of board receipt.
- Displaying all raw Serial output.
- Opening a second Web Serial session from another browser tab or route.
