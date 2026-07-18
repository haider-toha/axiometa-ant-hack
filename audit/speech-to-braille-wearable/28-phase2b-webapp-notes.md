# Phase 2 / Track B — Web App API Routes + Redis Relay + Braille Test (build notes)

**Date:** 2026-07-18 · **Next.js:** 16.2.10 (App Router, nested `app/app/`) · **Runtime deps:** `@upstash/redis`, `@anthropic-ai/sdk`
**Grounding source of truth:** `audit/speech-to-braille-wearable/25-phase1b-api-grounding.md` (every external call traced to it below).

> Build was intentionally NOT run (`next build`/`lint` left for the orchestrator to run authoritatively after both tracks land — a concurrent build would corrupt the shared `.next/`). No `git add/commit`, no `npm install`.

---

## 1. Files created (all under `app/app/`)

### Library modules (`app/app/lib/`)
| File | Purpose |
|---|---|
| `lib/redis.ts` | Upstash relay: `redis` (`Redis.fromEnv()`), `pushForward`, `pullState`, `setSuggestions`, `getMemory`, `setChoice`, `takeChoice`. |
| `lib/braille.ts` | A–Z 6-bit masks mirroring firmware (bit0=dot1…bit5=dot6). Exports `BRAILLE`, `maskFor`, `dotsFor`. |
| `lib/braille.test.ts` | Vitest — spot checks + full independent A–Z reference cross-check. **PASSES.** |
| `lib/anthropic.ts` | Shared Anthropic client + `HAIKU` const + `parseModelJson`/`textOf` JSON-hardening helpers (DRY across condense + suggest). |
| `lib/contract.ts` | *(pre-existing — imported, not modified).* |

### Route handlers (`app/app/api/`)
`stt`, `condense`, `push`, `pull`, `suggest`, `reply`, `reply-result`, `tts` — each `api/<name>/route.ts`.

All local imports are **relative** (e.g. `../../lib/redis`, `../../lib/contract`) per the task, not the `@/*` alias.

---

## 2. Exact models / endpoints (traced to 1B)

| Route | External call | Verbatim from grounding |
|---|---|---|
| `POST /api/stt` | ElevenLabs `POST https://api.elevenlabs.io/v1/speech-to-text`, header `xi-api-key`, multipart `file` + `model_id=scribe_v2`; transcript read from `j.text`. | §1 |
| `POST /api/condense` | Anthropic `anthropic.messages.create({ model: "claude-haiku-4-5", max_tokens: 256 })`. | §3 |
| `POST /api/suggest` | Anthropic `anthropic.messages.create({ model: "claude-haiku-4-5", max_tokens: 256 })` — **haiku, NOT sonnet** (builder override). | §3 + §7 correction (b) |
| `POST /api/tts` | ElevenLabs `POST https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb`, header `xi-api-key`, body `{ text, model_id: "eleven_flash_v2_5" }`; MP3 returned as `Content-Type: audio/mpeg`. | §2 |
| `POST /api/push` | Redis only (`pushForward`). | §4 |
| `GET /api/pull` + `OPTIONS` | Redis only (`pullState`). | §4/§5 |
| `POST /api/reply` | Redis only (`setChoice`). | §4 |
| `GET /api/reply-result` | Redis only (`takeChoice`). | §4 |

**Both Anthropic routes use `claude-haiku-4-5`** (bare alias; full id `claude-haiku-4-5-20251001`). No `thinking`/`effort` set (both error/are unnecessary on Haiku 4.5 per §3). `max_tokens: 256` on both (not 128 — §3/§7(c), because `verbatim` is unbounded and a short cap can truncate the JSON mid-string).

---

## 3. JSON-hardening approach (`lib/anthropic.ts` → `parseModelJson`)

Anthropic has no top-level JSON mode, so both model routes stack three defenses:

1. **Assistant prefill `{ role: "assistant", content: "{" }`** — forces the completion to start as a JSON object. Confirmed still valid on Haiku 4.5 (prefill is only 400-rejected on Opus/Sonnet/Fable, per §3).
2. **`parseModelJson(raw, "{")`** tries, in order: `JSON.parse("{" + raw)` (reconstruct the prefilled brace) → `JSON.parse(raw)` → a lenient extractor for each candidate that **strips ```json fences** and narrows to the outermost `{…}` span.
3. **Null-safe fallback** — `parseModelJson` returns `null` on total failure; callers never emit a silent `{}`:
   - `condense`: `keyword` degrades to `""`, `verbatim` falls back to the raw transcript.
   - `suggest`: filters to valid strings; if **zero** usable suggestions, returns HTTP **502** with a clear error (no empty stub) and does NOT touch Redis.

Truncation (`stop_reason==="max_tokens"`) is absorbed by the try/catch → fallback path rather than throwing.

---

## 4. KEYWORD_MAX (=15) enforcement points

Defense-in-depth, sanitizing to `a-z` + space and slicing to 15 at **every** boundary:

1. **`api/condense`** — `keyword.toLowerCase().replace(/[^a-z ]/g,"").slice(0, KEYWORD_MAX)` on the model output.
2. **`api/push`** — `sanitizeKeyword()` backstop re-applies the same clamp on whatever a client posts (rejects with 400 if nothing survives). This is the authoritative guard before `pushForward` writes Redis.
3. **`api/suggest`** — each of the 3 suggestions is clamped with the same regex + `.slice(0, KEYWORD_MAX)` before `setSuggestions`.

The system prompts also *instruct* the ≤15-char / a-z limit, but the code clamp is the real enforcement.

---

## 5. force-dynamic / CORS / no-store placement

- **`export const dynamic = "force-dynamic"`** on **all 8** route files. Verified still correct in Next 16 because Cache Components is OFF (`next.config.ts` has no `cacheComponents`, so `dynamic` is not removed — §5/§7(e)). Critical for the two polled GETs (`pull`, `reply-result`); belt-and-suspenders on the POSTs.
- **`GET /api/pull`** — headers `Access-Control-Allow-Origin: *` **and** `Cache-Control: no-store` (the ESP32 polls it). Plus an **`OPTIONS`** handler returning `204` with ACAO/Allow-Methods `GET, OPTIONS`/Allow-Headers `*`.
- **`GET /api/reply-result`** — `Cache-Control: no-store` (phone polls it).
- **`POST /api/tts`** — `Content-Type: audio/mpeg` + `no-store`, streaming the upstream MP3 body straight through (`new Response(r.body, …)`).

---

## 6. Redis relay design (`lib/redis.ts`)

- `pushForward(keyword, verbatim)`: **`INCR seq` BEFORE `MSET`** (atomic seq bump is the ESP32's change signal; ordering checked adversarially per task).
- `pullState()`: `mget<[number, Mode, string, string[]]>("seq","mode","msg","replies")` with null-coalescing defaults (`seq 0`, `mode "idle"`, `msg ""`, `replies []`) — required because `mget` returns `null` for missing keys and auto-deserializes (§4).
- Reply loop: `setSuggestions` (`MSET replies+mode="reply"`, THEN `INCR seq`), `setChoice` (stores pending `choice` + pushes `choice.text` into a capped `memory` array, last 10), `takeChoice` (**atomic `GETDEL "choice"`** → returns once then null; `getdel` confirmed present in the installed SDK).
- `getMemory()` feeds `api/suggest` optional context.
- All values rely on Upstash auto-(de)serialization (no manual `JSON.stringify`) — §4.

---

## 7. GATE results

### Braille test — **PASS**
```
$ cd app && npx vitest run app/lib/braille.test.ts

 RUN  v4.1.10 /Users/haidertoha/Code/axiometa-ant-hack/app

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  00:07:01
   Duration  105ms (transform 11ms, setup 0ms, import 16ms, tests 2ms, environment 0ms)
```
The test asserts `a→[1]`, `c→[1,4]`, `l→[1,2,3]`, `w→[2,4,5,6]`, loops **all 26** letters against a hand-transcribed independent reference dot-map, and checks case-insensitivity + blank-cell-for-space.

### Type sanity — `npx tsc --noEmit` → **exit 0** (whole project clean, my files included). Build itself left for the orchestrator.
