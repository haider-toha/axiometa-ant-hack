<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Current Project Rules

The app has pivoted from the old speech-to-braille prototype to the bus-stop situational-awareness build. Before editing app code, read:

- `../AGENTS.md`
- `../README.md`
- `../plan/2026-07-18-bus-stop-situational-awareness.md`

Most files in this app are legacy. Do not extend the speech, STT, TTS, reply suggestion, or braille UI flows. Reuse only the relay patterns the plan calls out:

- `app/api/pull/route.ts`: keep `force-dynamic`, `Cache-Control: no-store`, permissive CORS, and the curlable GET path.
- `app/api/push/route.ts`: reuse its request shape as the starting point for `app/api/event/route.ts`.
- `app/lib/redis.ts`: preserve payload-before-`seq` ordering.
- `app/page.tsx`: preserve the poll-with-in-flight-guard idiom and adapt the existing `getUserMedia` pattern for phone camera capture.

The current plan restored an experimental left/right navigation test using per-side buzzer frequency contrast. Debug UI work should surface that wear-test result plainly; do not treat earlier "no L/R" audit notes as cutting this revised scope.

Current app verification:

```bash
npm test
npm run lint
npm run build
```
