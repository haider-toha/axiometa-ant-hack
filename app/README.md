# Tacta web app

This is the Next.js 16 web app for the Tacta prototype. It does four jobs.

1. It serves the pitch deck as the public landing page.
2. It captures phone camera frames and posts them to the Modal vision service.
3. It runs the outbound-only device relay that the ESP32 polls, backed by Upstash Redis.
4. It runs two debug monitors, one for the device output and one for the relay state.

The shared wire contract lives in [`src/lib/contract.ts`](src/lib/contract.ts).
It is the source of truth for the command, activity, and telemetry types. See
[`../MODAL-FOR-APP.md`](../MODAL-FOR-APP.md) for the Modal contract.

The stack is Next.js 16.2 (App Router), React 19, Tailwind v4 with shadcn on
Base UI, Upstash Redis, the Anthropic SDK, and Vitest.

## Pages

The landing route `/` serves the pitch deck. A rewrite in
[`next.config.ts`](next.config.ts) maps `/` to `public/deck/index.html`, so the
URL stays `/`. The deck is a static scrollytelling site. Its final call to
action links to `/capture`.

| Route | File | Function |
|---|---|---|
| `/` | `public/deck/index.html` (rewrite) | The pitch deck. A static scrollytelling site served at the site root |
| `/capture` | `src/app/capture/page.tsx` | The capture page. It opens the rear camera with `getUserMedia`. It grabs a `<canvas>` JPEG at 2 Hz (`CAPTURE_MS = 500`). It POSTs the base64 frame to the Modal detector (`NEXT_PUBLIC_MODAL_URL`, or `?modal=<url>`). It maps the detector response to a relay command and posts it on change. It also owns the `STILL` and `MOVING` activity control and the person-direction path |
| `/output` | `src/app/output/page.tsx` | The output monitor. It reads `TACTA_OUTPUT` telemetry from the ESP32 over Web Serial. It shows the P1 and P3 output channels and the pulse history. Desktop Chrome only |

## API routes

The API routes live under [`src/app/api/`](src/app/api/). All relay state lives
in Upstash Redis. The app writes the payload with `mset` before it increments
`seq`. This ordering is the race fix. Preserve it.

| Route | Method | Purpose |
|---|---|---|
| `/api/pull` | GET, POST | The ESP32's outbound poll. A POST body carries device telemetry, stored for the monitor. The response is the current `DeviceCommand`. A GET returns the command and writes no telemetry, which is handy for a `curl` smoke test |
| `/api/event` | POST | It ingests a camera-derived command and writes relay state. The command set lives in [`src/lib/contract.ts`](src/lib/contract.ts). It covers the arrival, wait, route-number, and unknown patterns, plus the advisory `LEFT`, `RIGHT`, and `AHEAD` bearings |
| `/api/activity` | POST | The `STILL` and `MOVING` activity channel and its heartbeat. It advances `activitySeq` and `activityTs` independently of the command `seq` and `ts` |
| `/api/person-direction` | POST | Person and obstacle handling in `MOVING`. It takes a normalized box and asks Claude which side has clear pavement. It fails closed. It uses `ANTHROPIC_API_KEY` at request time |
| `/api/detector` | POST | It records the raw Modal detector state for the debug screen |
| `/api/state` | GET | An aggregate debug snapshot of command, detector, and telemetry |

## Local development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

The dev server runs at http://localhost:3000. Set the values from
[`.env.example`](.env.example).

| Variable | Needed for |
|---|---|
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Relay state. `Redis.fromEnv()` requires both |
| `NEXT_PUBLIC_MODAL_URL` | The Modal detector endpoint the capture page POSTs to. Public, or pass `?modal=<url>` on `/capture` |
| `ANTHROPIC_API_KEY` | The request-time Claude call in `/api/person-direction` |

The production relay is https://tacta.space. Never commit `.env.local`. The repo
tracks only the empty `.env.example` template.

## Verification

```bash
pnpm exec tsc --noEmit
pnpm run lint
pnpm run build
pnpm test
```

`pnpm run build` can print Upstash missing-env warnings in a local shell. It must
still finish. Run the pre-demo readiness gate before the demo.

```bash
pnpm demo:readiness -- --base-url https://tacta.space
```

See [`../DEMO-RUNBOOK.md`](../DEMO-RUNBOOK.md) for the full readiness gate and the
fallbacks.
