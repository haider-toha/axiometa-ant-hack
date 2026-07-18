# Phase 3B — Web API + Relay Contract, Adversarial Review (2026-07-18)

**Reviewer stance:** independent/adversarial. Verified against the code and the Phase 1B
API grounding doc (`25-phase1b-api-grounding.md`), not against in-code claims/comments.
Scope: `app/app/lib/{contract,redis,anthropic}.ts` + all 8 routes under `app/app/api/*/route.ts`.

## Verdicts

| # | Check | Verdict | Evidence (file:line) | Fix if FAIL |
|---|---|---|---|---|
| 1 | Every non-cacheable route exports `dynamic = "force-dynamic"` (esp. pull + model/relay routes) | **PASS** | All 8 routes carry it: `stt:4`, `condense:7`, `push:6`, `pull:6`, `suggest:8`, `reply:6`, `reply-result:5`, `tts:4` | — |
| 2 | `GET /api/pull` sets `Access-Control-Allow-Origin: *` AND `Cache-Control: no-store` | **PASS** | `pull:8-11` defines `CORS` = `{ ACAO:"*", "Cache-Control":"no-store" }`; applied to GET at `pull:15` (`Response.json(state, { headers: CORS })`). OPTIONS preflight also covered `pull:18-28` | — |
| 3 | `/api/condense` enforces KEYWORD_MAX (=15) AND restricts to a–z + space (real transform, not just prompt) | **PASS** | `condense:40-43` `(parsed?.keyword ?? "").toLowerCase().replace(/[^a-z ]/g,"").slice(0, KEYWORD_MAX)`; `KEYWORD_MAX` imported `condense:5`; `contract:18` `=15`. Genuine lowercase+strip+cap, independent of the prompt at `condense:9-13` | — |
| 4 | `/api/push` seq bump is atomic; `INCR seq` ordered BEFORE `mset(msg/verbatim/mode)` | **FAIL** | `redis.ts:24` `incr("seq")` then `redis.ts:25` `mset({msg,verbatim,mode})`. Two separate awaited round trips → **NOT atomic** (no `multi`/pipeline/Lua). Ordering is **backwards** for the seq-as-signal design and directly contradicts `setSuggestions` `redis.ts:48-49` (mset→incr) whose own comment `redis.ts:44-45` explains the rule: "MSET the payload first so a poller never sees the new seq with stale replies." | Swap to **mset-then-incr** in `pushForward` (mirror `setSuggestions`): `await redis.mset({msg,verbatim,mode:"forward"}); const seq = await redis.incr("seq"); return seq;` — or wrap both in a single `redis.multi()`/pipeline for true atomicity. |
| 5 | `/api/pull` (`pullState`) shape EXACTLY matches `PullResponse` (seq:number, mode:Mode, msg:string, replies:string[]) with correct defaults | **PASS** | `contract:5-10` interface; `redis.ts:30-40` returns `{seq: seq??0, mode: mode??"idle", msg: msg??"", replies: replies??[]}`, typed `Promise<PullResponse>`; `"idle"` is a valid `Mode` (`contract:3`); `pull:14-15` returns it verbatim | — |
| 6 | `/api/suggest` AND `/api/condense` use `claude-haiku-4-5` (never sonnet) | **PASS** | `anthropic:9` `HAIKU = "claude-haiku-4-5"`; `condense:25` `model: HAIKU`; `suggest:32` `model: HAIKU`. No sonnet string anywhere. Matches grounding §3 / §7-b | — |
| 7 | STT call matches 1B §1 (POST /v1/speech-to-text, xi-api-key, multipart file + model_id=scribe_v2, reads `.text`); TTS matches 1B §2 (POST /v1/text-to-speech/{voice}, eleven_flash_v2_5, audio/mpeg) | **PASS** | STT: `stt:21` endpoint, `stt:23` `xi-api-key`, `stt:16-18` FormData `file`+`model_id="scribe_v2"`, no manual Content-Type (`stt:20`), reads `j.text` `stt:33-34`. TTS: `tts:18` endpoint, `tts:6` voice `JBFqnCBsd6RMkjVDRZzb`, `tts:22-23` `xi-api-key`+`application/json`, `tts:25` body `{text, model_id:"eleven_flash_v2_5"}`, `tts:33-34` `Content-Type: audio/mpeg`. Exact match to grounding lines 17-25 / 60-64 | — |
| 8 | Skepticism: unguarded model-JSON parse; unconsumable response shapes; KEYWORD_MAX bypass on suggest path | **WARN** | The three explicit sub-checks are CLEAN: (a) model-output parse is fully guarded — `anthropic:31-45` try/catch returns `null`, callers handle null (`condense:40,47`; `suggest:44`). (b) buzzed suggestions cannot bypass the cap — `suggest:47` `.replace(/[^a-z ]/g,"").trim().slice(0, KEYWORD_MAX)`, `suggest:49` `.slice(0,3)`, stored sanitized via `suggest:58`. (c) response shapes are consumable. **But** 4 minor robustness gaps (below) | — (non-blocking) |

## Check 4 — detail (the blocking finding)

The relay is a **seq-as-change-signal** design: the ESP32 polls `/api/pull`, which reads
`seq,mode,msg,replies` in one atomic `mget` (`redis.ts:31-33`) and treats a change in `seq`
as "new payload, act on it" (comments at `redis.ts:17-18`, `44-46`).

With `pushForward` doing **INCR then MSET**, a poll that lands in the window between the two
writes observes **the new `seq` with the still-stale `msg`**:

1. state `seq=5, msg="hello"` → `incr` → `seq=6, msg="hello"` (stale)
2. ESP32 polls: `seq 5→6` changed → **buzzes stale "hello" again**, records `last_seq=6`
3. `mset` → `seq=6, msg="world"`
4. ESP32 polls: `seq=6` unchanged → **"world" is never buzzed (dropped keyword)**

`setSuggestions` (`redis.ts:47-51`) already does it the correct way (MSET→INCR) with the
rationale spelled out in its own comment. `pushForward` is the inverse and is therefore wrong
for the same consumer. The pair is also not transactional, so even the "atomic" wording of the
check is false. This is a functional race on the **primary forward path**, not a style nit →
**FAIL**. Note: the in-code comment `redis.ts:17-18` asserting this ordering is intentional and
"checked adversarially" is itself incorrect and should not be trusted.

## Check 8 — minor WARNs (none blocking)

- **Unguarded `await req.json()`** in `condense:16`, `push:16`, `suggest:17`, `reply:9`, `tts:9`.
  A malformed/empty POST body throws before field validation → ungraceful 500 (HTML) instead of
  the `400 {error}` these routes otherwise return. Fix: wrap the parse in try/catch → `400`.
- **`/api/reply` stores `text` unsanitized** (`reply:17` → `setChoice` → `redis.ts:66` pushes into
  `memory`). Memory is later interpolated into the suggest system/user prompt (`suggest:28`), and
  `choice.text` is echoed to the phone for TTS. Not a *buzzed-path* KEYWORD_MAX bypass (suggestions
  scrolled on the wearable are sanitized), but arbitrary device input reaches the model prompt and
  the TTS. Defense-in-depth: sanitize/length-cap `text` on `/reply`.
- **`setChoice` memory update is a non-atomic read-modify-write** (`redis.ts:63-68`: `getMemory`
  then `set`). Concurrent choices could lose an entry. Low risk (choices are user-paced).
- **Dead write:** `pushForward` stores `verbatim` (`redis.ts:25`) but `pullState` never reads it
  (`redis.ts:31-33`) and no route reads it from Redis (`/api/suggest` takes `verbatim` from its own
  request body, `suggest:17`). Harmless, but the stored value is unused.

## Notes / residual risk (out of assigned scope, not scored)

- Check 1 passes on the directive being present in all routes. The grounding doc §5 verifies
  `force-dynamic` is still correct in Next 16 **only when Cache Components is OFF**; `next.config`
  was out of read-scope, so that assumption is unverified here. `app/AGENTS.md` also warns this
  Next.js "is NOT the Next.js you know." Reconfirm the directive's validity against the bundled
  `node_modules/next/dist/docs` during implementation.

---

UNRESOLVED FAILS: 1
