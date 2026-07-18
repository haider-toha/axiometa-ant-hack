# Bus-Stop Relay App

This is the Next.js 16 app for the bus-stop situational-awareness prototype. It currently contains a mostly legacy speech-to-braille implementation; treat the current plan as authoritative before editing:

```bash
sed -n '1,220p' ../plan/2026-07-18-bus-stop-situational-awareness.md
```

## What Survives

The current build reuses the Vercel + Upstash relay, not the speech product.

- `app/api/pull/route.ts`: ESP32 polling endpoint. Keep it dynamic, uncached, CORS-open, and curlable.
- `app/api/push/route.ts`: starting template for the new `app/api/event/route.ts`.
- `app/lib/redis.ts`: keep payload writes before `seq` increments. The `seq` increment is the edge trigger for the device.
- `app/lib/contract.ts`: replace the braille-era contract with the plan's `CloudPattern`, `EventRequest`, `DeviceCommand`, telemetry, detector, and debug-state types.
- `app/page.tsx`: keep only useful browser idioms, especially guarded polling and `getUserMedia`; the new capture path is phone video, not microphone audio.

The current plan includes a first-hour buzzer wear test. The app should help expose the resulting states clearly on the debug screen once `/api/state` exists; do not hide the experimental left/right result behind generic "haptic OK" wording.

## Legacy Files

Do not extend these old speech/braille surfaces. The plan says to delete or replace them during implementation:

- `app/api/stt/route.ts`
- `app/api/tts/route.ts`
- `app/api/condense/route.ts`
- `app/api/suggest/route.ts`
- `app/api/reply/route.ts`
- `app/api/reply-result/route.ts`
- `app/lib/anthropic.ts`
- `app/lib/braille.ts`
- `app/lib/braille.test.ts`
- `app/components/*`

The stale UI title "Speech to Braille" is not a product requirement; it is leftover code.

## Local Setup

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

Runtime relay calls require:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

The production Vercel project already owns these env vars according to the current plan. Do not commit local `.env` files.

## Verification

Run these after app changes:

```bash
npm test
npm run lint
npm run build
```

`npm run build` may print Upstash missing-env warnings locally when the env vars are absent; that is acceptable only if the build completes successfully. Runtime relay smoke needs the env vars.

With the dev server running and Upstash env configured:

```bash
curl -fsS http://localhost:3000/api/pull
```

After `app/api/event/route.ts` exists, smoke it with the exact `BUS`, `WAIT`, and `NUMBER` payloads from the current plan, then confirm `/api/pull` returns the incremented command.
