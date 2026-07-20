# Agent Harness

This is the canonical project guidance for both Codex and Claude Code. Codex reads this file directly; the root `CLAUDE.md` imports it. Keep shared rules here so the two harnesses cannot drift.

The checked-in `.claude/skills/` directory contains optional Claude Code helpers from earlier work. It is not authoritative project scope, and Codex does not need that entire 22 MB tree copied into its skill search path. Put cross-agent decisions, commands, and constraints in this file or the current plan; use skills only as optional workflow support.

This repo has pivoted. Start every implementation pass from:

- `README.md`
- `plan/2026-07-18-situational-awareness.md`
- `audit/situational-awareness/`

The plan is the authoritative build target. If current code, archived plans, or older audit files disagree with it, the current plan wins. If an audit file records a measurement and the plan records a number, the audit measurement wins and the plan should be corrected.

## Current Target

Build the Tacta situational-awareness wearable. Tacta is an open project toward one wearable that gives DeafBlind people situational awareness through touch. It fuses vision from cameras, sound from microphones, and depth from distance sensors, then delivers those events as vibration. This hackathon build hardcodes one concrete demo scene, reading a specific bus at a stop, so the whole pipeline runs end to end. That scene is one example, not the product. The end product is a purpose-built device: a custom PCB that integrates the sensors, real haptic actuators, and a form factor that fits the wearer such as a wrist unit, a chest harness, or a necklace. It is open source so people with more resources can build it.

This prototype runs on off-the-shelf parts:

- ESP32-S3 Genesis Mini device.
- Two AX22-0018 passive buzzers on the P1/P3 diagonal, used only as audible proxies for future vibration channels.
- PDM microphone on I2S0 for local siren detection.
- VL53L0CX ToF for local proximity reflex.
- Phone browser camera capture through the Next.js app (`app/`).
- Modal YOLO/Claude endpoint for arrival and route reading.
- Vercel + Upstash relay for outbound-only ESP32 polling.

Hardcoded route `88` / destination `Clapham Common` is intentional. Do not add generality unless the plan is changed first.

The first-hour experiment is complete. The buzzers were audible but produced virtually no tactile movement, so tactile viability failed. Preserve P1 at 2350 Hz and P3 at 3050 Hz only as audible proxies for two conceptual future vibration channels. This is not directional, haptic, or accessibility validation. The intended product assumes purpose-built ERM/LRA actuators and requires later retuning and representative-user testing.

The demo has two activity phases. `MOVING` demonstrates supplementary ToF forward-clearance feedback and siren detection while the wearer is on the move; the cane remains the primary mobility aid. `STILL` enables camera-derived arrival reading and route-88 output. The phone camera and Modal submission may remain active in both phases; the ESP32 still receives and sequence-acknowledges relay commands while moving but suppresses BUS/WAIT/NUMBER/UNKNOWN before output arbitration. ToF continues sampling in both phases but may produce proximity output only in `MOVING`; entering `STILL` clears it. Siren detection and output remain active in both phases.

The single forward ToF zone cannot choose a safe left/right bypass, so ToF must never derive `LEFT`, `RIGHT`, or `AHEAD`, and no local sensor output may be described as navigation. Camera-derived bearing is a separate thing. The phone can see which side of frame the target is on, so `LEFT`, `RIGHT`, and `AHEAD` are advisory relay commands accepted in **both** `MOVING` and `STILL` (audit 23, the user scans for the target while standing still and needs the first direction before the first step; only `UNKNOWN` activity refuses bearings). While `STILL`, the phone yields the shared command channel to `BUS`/`NUMBER`/`UNKNOWN` so arrival and route-88 output still land; bearings fill the `WAIT`/`NONE` gaps (`chooseEvent` in `app/src/lib/contract.ts`). They are not obstacle avoidance, not automatic navigation, and never outrank the local ToF and siren paths. Existing service-Serial tones may demonstrate two conceptual future channels only when they are explicitly labelled as a simulation.

Activity freshness is independent from command delivery. An activity heartbeat must not increment command `seq` or refresh an old command timestamp. A command suppressed while moving must never replay solely because activity later changes to still.

Do not allocate a module slot to a button. P1/P3 are outputs, P2 is ToF, and P4 is the PDM microphone. Full firmware must boot operationally without an arming press. The onboard user button is optional fallback hardware only after its GPIO and polarity are bench-verified; USB Serial remains the bring-up/emergency control path.

## Web App

The active web app is `app/`. It is a Next.js 16 app scaffolded with George's `design-studio` taste system (Tailwind v4 + shadcn on Base UI). **George owns the web app.** All new frontend, the phone camera-capture page, API routes, and the device relay are built here going forward.

Haider owns the phone motion classifier and the relay-side activity producer.
Other workstreams may validate and consume the independent `activity`,
`activitySeq`, and `activityTs` fields, but must not add a competing classifier
or producer unless that ownership is explicitly reassigned.

## Legacy Traps

The old speech-to-braille idea is closed. Do not build from it.

- `plan/archive/` is provenance only.
- `audit/speech-to-braille-wearable/` is a closed historical record.
- `firmware/braille_wearable/` keeps its directory name only to avoid PlatformIO churn; the braille, LCD, encoder, and experimental directionality code inside is legacy unless the current plan explicitly says to reuse a part.

Do not claim "opposite sides of the wrist", spatial left/right localization, or usable tactile output from the buzzers. The two audible tones simulate separate future vibration channels; they do not prove those channels will be distinguishable on the body.

## Implementation Rules

- Work task-by-task from the current plan's checkbox tasks.
- Preserve the Redis race fix: write payload with `mset` before incrementing `seq`.
- Preserve outbound-only ESP32 networking. The board polls Vercel; it does not accept inbound connections.
- Keep local safety paths local: ToF and siren alerts must not depend on Wi-Fi.
- Use Anthropic structured outputs for Modal Claude calls: `output_config.format` plus `json_schema`.
- Before editing Next.js code, read the relevant local docs under `app/node_modules/next/dist/docs/`; this repo uses Next.js 16.
- Do not rely on `parts/` absence as inventory evidence. It mirrors the vendor catalogue, not the bench.

## Verification

Run the checks that match the files changed.

Web app (`app/`, the active app):

```bash
cd app
pnpm install
pnpm exec tsc --noEmit
pnpm run lint
pnpm run build
```

`pnpm run build` can print Upstash missing-env warnings in a local shell without `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`; the build still has to finish successfully. Runtime relay smoke requires those env vars. Never commit `app/.env.local`. Only the empty `app/.env.example` template is tracked.

Firmware:

```bash
cd firmware/braille_wearable
pio test -e native
pio run -e board_firmware
```

`board_firmware` is the current integrated target and uses the pinned Arduino-ESP32 3.x toolchain. The `genesis_mini` and `genesis_mini_offline` environments build closed speech/braille code and are legacy provenance, not verification targets. Run an isolated experiment environment as an additional check when changing that runner. If `pio` is missing, say so plainly and do not report firmware verification as complete.

CAD:

```bash
python3 -m py_compile cad/enclosure.py
.venv/bin/python -m pytest cad/tests -q
```

The pytest command requires a repo venv with `pytest` and `build123d`. If the venv is absent, report that the CAD geometry suite was not run.

Relay smoke, with the app running and Upstash env configured:

```bash
curl -fsS http://localhost:3000/api/pull
```

After `/api/event` exists, smoke it with the locked demo payload from the plan, then confirm `/api/pull` returns the incremented command.
