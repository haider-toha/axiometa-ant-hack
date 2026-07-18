# Agent Harness

This is the canonical project guidance for both Codex and Claude Code. Codex reads this file directly; the root `CLAUDE.md` imports it. Keep shared rules here so the two harnesses cannot drift.

The checked-in `.claude/skills/` directory contains optional Claude Code helpers from earlier work. It is not authoritative project scope, and Codex does not need that entire 22 MB tree copied into its skill search path. Put cross-agent decisions, commands, and constraints in this file or the current plan; use skills only as optional workflow support.

This repo has pivoted. Start every implementation pass from:

- `README.md`
- `plan/2026-07-18-bus-stop-situational-awareness.md`
- `audit/bus-stop-situational-awareness/`

The plan is the authoritative build target. If current code, archived plans, or older audit files disagree with it, the current plan wins. If a bus-stop audit file records a measurement and the plan records a number, the audit measurement wins and the plan should be corrected.

## Current Target

Build the bus-stop situational-awareness prototype:

- ESP32-S3 Genesis Mini device.
- Two AX22-0018 passive buzzers on the P1/P3 diagonal, driven as low-frequency haptic/tone outputs.
- PDM microphone on I2S0 for local siren detection.
- VL53L0CX ToF for local proximity reflex.
- Phone browser camera capture through the Next.js app (`www/`).
- Modal YOLO/Claude endpoint for bus arrival and route reading.
- Vercel + Upstash relay for outbound-only ESP32 polling.

Hardcoded route `88` / destination `Clapham Common` is intentional. Do not add generality unless the plan is changed first.

The latest plan revision restored an explicit first-hour experiment: test whether the two passive buzzers can carry left/right through per-side low-frequency contrast. Do not remove the navigation test from scope just because earlier audit files cut spatial L/R. The current distinction is:

- spatial left/right from physical separation: not supported;
- experimental left/right from frequency contrast: in scope until the wear test says otherwise.

## Web App

The active web app is `www/` — a Next.js 16 app scaffolded with George's `design-studio` taste system (Tailwind v4 + shadcn on Base UI). **George owns the web app.** All new frontend, the phone camera-capture page, API routes, and the device relay are built here going forward. The legacy `app/` (below) is not the target.

## Legacy Traps

The old speech-to-braille idea is closed. Do not build from it.

- `plan/archive/` is provenance only.
- `audit/speech-to-braille-wearable/` is a closed historical record.
- `firmware/braille_wearable/` keeps its directory name only to avoid PlatformIO churn; the braille, LCD, and encoder code inside is legacy unless the current plan explicitly says to reuse a part.
- `app/` is the stale legacy speech/braille Next.js app — do not use, edit, or reference it, and do not build new web work there. It informed the relay idioms named in the plan, but new web work lives in `www/`.
- `cad/braille_wearable_exocage.py` is not the chosen design. Leave it alone unless the plan changes.

Do not claim "opposite sides of the wrist" or spatial left/right localization. The two buzzers are 33.941 mm apart; any left/right attempt is via frequency contrast and must be described as experimental until wear-tested. Prioritize the buzzer viability and L/R discrimination wear test early, because it decides whether the haptic navigation scope survives.

## Implementation Rules

- Work task-by-task from the current plan's checkbox tasks.
- Preserve the Redis race fix: write payload with `mset` before incrementing `seq`.
- Preserve outbound-only ESP32 networking. The board polls Vercel; it does not accept inbound connections.
- Keep local safety paths local: ToF and siren alerts must not depend on Wi-Fi.
- Use Anthropic structured outputs for Modal Claude calls: `output_config.format` plus `json_schema`.
- Before editing Next.js code, read the relevant local docs under `www/node_modules/next/dist/docs/`; this repo uses Next.js 16.
- Do not rely on `parts/` absence as inventory evidence. It mirrors the vendor catalogue, not the bench.

## Verification

Run the checks that match the files changed.

Web app (`www/`, the active app):

```bash
cd www
pnpm install
pnpm exec tsc --noEmit
pnpm run lint
pnpm run build
```

`pnpm run build` can print Upstash missing-env warnings in a local shell without `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`; the build still has to finish successfully. Runtime relay smoke requires those env vars. Never commit `www/.env.local` — only the empty `www/.env.example` template is tracked.

Firmware:

```bash
cd firmware/braille_wearable
pio test -e native
pio run -e genesis_mini
```

`pio run -e genesis_mini` intentionally downloads the Arduino-ESP32 3.x toolchain on first use. If `pio` is missing, say so plainly and do not report firmware verification as complete.

CAD:

```bash
python3 -m py_compile cad/braille_wearable_enclosure.py cad/braille_wearable_exocage.py
.venv/bin/python -m pytest cad/tests -q
```

The pytest command requires a repo venv with `pytest` and `build123d`. If the venv is absent, report that the CAD geometry suite was not run.

Relay smoke, with the app running and Upstash env configured:

```bash
curl -fsS http://localhost:3000/api/pull
```

After `/api/event` exists, smoke it with the locked demo payload from the plan, then confirm `/api/pull` returns the incremented command.
