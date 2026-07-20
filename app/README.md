# Tacta web app

This is the Next.js 16 web app for the Tacta bus-stop prototype. It does three jobs.

1. It captures phone camera frames and posts them to the Modal vision service.
2. It runs the outbound-only device relay that the ESP32 polls, backed by Upstash Redis.
3. It runs an output monitor that reads the device output over Web Serial.

The shared wire contract lives in [`src/lib/contract.ts`](src/lib/contract.ts). It is the source
of truth for the command, activity, and telemetry types. See
[`../MODAL-FOR-APP.md`](../MODAL-FOR-APP.md) for the Modal contract and
[`../RELAY-FOR-FIRMWARE.md`](../RELAY-FOR-FIRMWARE.md) for the firmware contract.

The stack is Next.js 16.2 (App Router), React 19, Tailwind v4 with shadcn on Base UI, Upstash
Redis, the Anthropic SDK, and Vitest.

## Pages

| Route | File | Function |
|---|---|---|
| `/capture` | `src/app/capture/page.tsx` | The capture page. It opens the rear camera with `getUserMedia`. It grabs a `<canvas>` JPEG at 2 Hz (`CAPTURE_MS = 500`). It POSTs the base64 frame to the Modal detector (`NEXT_PUBLIC_MODAL_URL`, or `?modal=<url>`). It maps the detector response to a relay command and posts it only on change. It also owns the `STILL` and `MOVING` activity control and the person-direction path. |
| `/output` | `src/app/output/page.tsx` | The output monitor. It reads `TACTA_OUTPUT` telemetry from the ESP32 over Web Serial. It shows the P1 and P3 buzzer channels and the pulse history. Desktop Chrome only. |
| `/` | `src/app/page.tsx` | The debug relay monitor. It polls `/api/state`. It shows the current device command, the raw detector state, and the device telemetry. |

## API routes

The API routes live under [`src/app/api/`](src/app/api/). All relay state lives in Upstash
Redis. The app writes the payload with `mset` before it increments `seq`. This ordering is the
race fix. Preserve it.

| Route | Method | Purpose |
|---|---|---|
| `/api/pull` | GET, POST | The ESP32's outbound poll. A POST body carries device telemetry, stored for the monitor. The response is the current `DeviceCommand`. A GET returns the command and writes no telemetry, which is handy for a `curl` smoke test. |
| `/api/event` | POST | It ingests a camera-derived command (`BUS`, `WAIT`, `NUMBER`, `UNKNOWN`, and the advisory `LEFT`, `RIGHT`, `AHEAD` bearings). It writes relay state. |
| `/api/activity` | POST | The `STILL` and `MOVING` activity channel and its heartbeat. It advances `activitySeq` and `activityTs` independently of the command `seq` and `ts`. |
| `/api/person-direction` | POST | Person and obstacle handling in `MOVING`. It takes a normalized box and asks Claude which side has clear pavement. It fails closed. It uses `ANTHROPIC_API_KEY` at request time. |
| `/api/detector` | POST | It records the raw Modal detector state for the debug screen. |
| `/api/state` | GET | An aggregate debug snapshot of command, detector, and telemetry. The `/` page polls it. |

## Local development

```bash
pnpm install
cp .env.example .env.local     # then fill in the values below
pnpm dev                       # http://localhost:3000
```

Set the values in [`.env.example`](.env.example).

| Variable | Needed for |
|---|---|
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Relay state. `Redis.fromEnv()` requires both |
| `NEXT_PUBLIC_MODAL_URL` | The Modal detector endpoint the capture page POSTs to. Public, or pass `?modal=<url>` on `/capture` |
| `ANTHROPIC_API_KEY` | The request-time Claude call in `/api/person-direction` |

The production relay is `https://tacta.space`. Never commit `.env.local`. The repo tracks only the
empty `.env.example` template.

## Verification

```bash
pnpm exec tsc --noEmit
pnpm run lint
pnpm run build          # may print Upstash missing-env warnings locally, must still succeed
pnpm test               # Vitest unit tests
```

Run the pre-demo relay and contract readiness gate before the demo.

```bash
pnpm demo:readiness -- --base-url https://tacta.space
```

See [`../DEMO-RUNBOOK.md`](../DEMO-RUNBOOK.md) for the full readiness gate and the fallbacks.
