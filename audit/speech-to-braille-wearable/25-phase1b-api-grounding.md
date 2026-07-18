# Phase 1B — External API Grounding (verified 2026-07-17)

> **Purpose:** Phase 2 copies the call signatures below verbatim. Every claim is verified against a bundled skill (authoritative, current) and/or official docs on 2026-07-17. Where the plan is right, this file says so; where it drifts, see **§7 Corrections vs the plan**.
>
> **Verification legend:** ✅ verified · ⚠️ works-but-caveat · ❌ wrong-in-plan.
>
> **Sources** (cited inline per section): ElevenLabs STT/TTS skills (`.claude/skills/speech-to-text`, `.claude/skills/text-to-speech`) + `elevenlabs.io/docs`; Anthropic `claude-api` skill (models cached 2026-06-24) + `platform.claude.com`; Upstash `upstash-redis-js` skill; Vercel `nextjs` / `vercel-cli` / `deploy` / `knowledge-update` skills (v0.44.0, 2026-02-27) + `nextjs.org/docs` (v16.2.10, 2026-03-13).

---

## 1. ElevenLabs Speech-to-Text ("Scribe") — ✅

**The plan's `scribe_v2` is CORRECT.** The current 2026 batch STT model_id is **`scribe_v2`** (not `scribe_v1`). `scribe_v1` still exists as a legacy option; `scribe_v2` is the state-of-the-art default. (There is also `scribe_v2_realtime` for websocket streaming — NOT what this project uses.)

| Field | Value |
|---|---|
| Endpoint | `POST https://api.elevenlabs.io/v1/speech-to-text` |
| Auth header | `xi-api-key: <ELEVENLABS_API_KEY>` |
| Body | `multipart/form-data` |
| Form field — audio | `file` (the audio blob; webm/opus is accepted) |
| Form field — model | `model_id` = `scribe_v2` |
| Response | JSON; transcript is in the **`text`** field |
| Errors | 401 invalid key · 422 bad params · 429 rate limit |

Response shape (only `text` is read): `{ "text": "...", "language_code": "eng", "language_probability": 0.98, "words": [...] }`

**Do NOT set `Content-Type` manually** when the body is a `FormData` — `fetch` sets the multipart boundary itself.

### Ready-to-use route (`app/api/stt/route.ts`)
```ts
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const inForm = await req.formData();
  const file = inForm.get("file") as File;

  const out = new FormData();
  out.append("file", file);
  out.append("model_id", "scribe_v2"); // ✅ verified current 2026 model_id

  const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! }, // no Content-Type
    body: out,
  });
  if (!r.ok) return Response.json({ transcript: "", error: await r.text() }, { status: 502 });

  const j = await r.json();
  return Response.json({ transcript: j.text ?? "" }); // ✅ transcript lives in `text`
}
```
*Source: `speech-to-text` skill + https://elevenlabs.io/docs/api-reference/speech-to-text/convert (HTTP 200, confirms `POST /v1/speech-to-text`, fields `file`+`model_id`, both `scribe_v2`/`scribe_v1` accepted, response `text`, header `xi-api-key`).*

---

## 2. ElevenLabs Text-to-Speech `eleven_flash_v2_5` — ✅

| Field | Value |
|---|---|
| Endpoint | `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}` |
| Auth header | `xi-api-key: <ELEVENLABS_API_KEY>` |
| Content-Type (request) | `application/json` |
| Body (required) | `{ "text": "...", "model_id": "eleven_flash_v2_5" }` |
| Response | binary audio; default format `mp3_44100_128` → serve as **`Content-Type: audio/mpeg`** |
| Sync vs stream | This endpoint is **sync** (returns the whole MP3). A separate `/v1/text-to-speech/{voice_id}/stream` exists for chunked low-latency-first-byte; **not needed** for ≤15-char replies — use sync. |

**Safe default public `voice_id` to hardcode: `JBFqnCBsd6RMkjVDRZzb`** (premade voice "George", male). This exact ID is used in ElevenLabs' own docs example, and premade voices are available on all plan tiers including free. Alternative: `EXAVITQu4vr4xnSDxMaL` ("Sarah", female). (If a voice is ever unavailable you can list current ones via `GET /v1/voices`, but hardcoding a premade ID is fine for this build.)

`eleven_flash_v2_5` = ~75 ms latency, 32 languages — the right choice for a spoken-reply loop. (The convert endpoint's *default* is `eleven_multilingual_v2`, so you MUST pass `model_id` explicitly to get flash.)

### Ready-to-use route (`app/api/tts/route.ts`)
```ts
export const dynamic = "force-dynamic";
const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // "George" premade — safe hardcode

export async function POST(req: Request) {
  const { text } = await req.json();
  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, model_id: "eleven_flash_v2_5" }),
    }
  );
  if (!r.ok) return Response.json({ error: await r.text() }, { status: 502 });

  // Pass the MP3 bytes straight through to the browser <audio> element.
  return new Response(r.body, { headers: { "Content-Type": "audio/mpeg" } });
}
```
*Source: `text-to-speech` skill (lists `eleven_flash_v2_5`, voice IDs, `mp3_44100_128` default) + https://elevenlabs.io/docs/api-reference/text-to-speech/convert (HTTP 200, confirms `POST /v1/text-to-speech/{voice_id}`, body `text`+`model_id`, header `xi-api-key`, example voice `JBFqnCBsd6RMkjVDRZzb`).*

---

## 3. Anthropic Messages API `claude-haiku-4-5` — ✅ (with JSON-hardening)

**`claude-haiku-4-5` is VALID and Active in 2026.** Context 200K, $1/$5 per 1M in/out (full ID `claude-haiku-4-5-20251001`; use the bare alias). Use the official SDK `@anthropic-ai/sdk`, method `anthropic.messages.create(...)`.

**This project uses `claude-haiku-4-5` for BOTH routes** — `/api/condense` AND `/api/suggest` (overriding the plan's `claude-sonnet-5` mention; see §7).

**Do NOT set `thinking` or `output_config.effort` on Haiku 4.5** — the `effort` parameter *errors* on Haiku 4.5, and thinking is unnecessary for this task. Omit both (the plan already does).

### Getting reliable JSON (Anthropic has no top-level "JSON mode" flag)
Three options, all valid on Haiku 4.5 — pick one:

1. **Instruct-and-parse (closest to the plan)** — put "Reply ONLY as JSON …" in the system prompt, then `JSON.parse`. Simple, low-latency. *Fragile:* any preamble or a `max_tokens` truncation breaks `JSON.parse` — so wrap it in try/catch and handle `stop_reason === "max_tokens"`.
2. **+ Assistant prefill** — append a trailing `{ role: "assistant", content: "{" }` to force the response to start as JSON. **This STILL WORKS on `claude-haiku-4-5`** (prefill is only 400-rejected on Opus 4.6/4.7/4.8, Sonnet 4.6, Fable 5 — NOT Haiku 4.5). Cheapest reliability upgrade; remember to prepend the `{` back before parsing.
3. **Structured outputs (most robust)** — `output_config: { format: { type: "json_schema", schema: {...} } }`. **Haiku 4.5 is explicitly on the supported-models list.** Guarantees schema-valid JSON; first request per schema pays a one-time compile, then 24 h cached.

### `max_tokens: 128` assessment — ⚠️ bump to 256
128 tokens (~96 words) is fine for the target case (a short press-to-talk utterance → a ≤15-char keyword). **But the route also returns `verbatim` = the *cleaned full transcript*, which is unbounded.** A longer utterance can push the JSON past 128 tokens, truncating mid-string → `JSON.parse` throws and the whole forward pipeline fails. **Recommend `max_tokens: 256`** as a safer default and always guard the parse.

### Ready-to-use route (`app/api/condense/route.ts`)
```ts
import Anthropic from "@anthropic-ai/sdk";
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { transcript } = await req.json();
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5",          // ✅ valid + Active in 2026
    max_tokens: 256,                    // ⚠️ 256 (not 128) — `verbatim` can be long
    system:
      "You clean a noisy speech transcript, then condense it to ONE tactile keyword " +
      "(1-3 words, letters a-z and spaces only, spell numbers as words, no punctuation, " +
      "max 15 characters) capturing the gist a deafblind user most needs. " +
      'Reply ONLY as JSON: {"keyword":"...","verbatim":"<cleaned full text>"}.',
    messages: [
      { role: "user", content: transcript },
      { role: "assistant", content: "{" }, // prefill: forces JSON start (OK on haiku-4-5)
    ],
  });
  const raw = msg.content.find((c) => c.type === "text")?.text ?? "";
  let keyword = "", verbatim = transcript;
  try {
    ({ keyword, verbatim } = JSON.parse("{" + raw)); // prepend the prefilled "{"
  } catch { /* fall through to backstop below */ }
  const clean = (keyword ?? "").toLowerCase().replace(/[^a-z ]/g, "").slice(0, 15);
  return Response.json({ keyword: clean, verbatim: verbatim ?? transcript });
}
```
*(`/api/suggest` is the same shape: `model: "claude-haiku-4-5"`, `max_tokens: 256`, system asks for `{"suggestions":["...","...","..."]}`, same prefill+try/catch.)*

*Source: `claude-api` skill — models table (Haiku 4.5 Active, $1/$5, ID `claude-haiku-4-5-20251001`); prefill-removal list excludes Haiku 4.5; structured-outputs supported-models list includes Haiku 4.5; `effort` errors on Haiku 4.5. Live model check: `client.models.retrieve("claude-haiku-4-5")`.*

---

## 4. Upstash Redis `@upstash/redis` — ✅

- **`Redis.fromEnv()` reads exactly `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`** ✅ (the plan's `.env.local` names match).
- **`incr(key)` → `Promise<number>`** — native Redis INCR; returns the new integer. ✅
- **`mset(record)` → auto-serializes** every value (objects/arrays are JSON-serialized for you — do NOT `JSON.stringify`). ✅
- **`mget<[T1,T2,...]>(...keys)` → `Promise<[T1|null, T2|null, ...]>`** — the tuple generic types each position, and each value is **auto-deserialized** back to its JS type. Missing keys return `null`. ✅ So the plan's `mget<[number,string,string,string[]]>("seq","mode","msg","replies")` returns `replies` as a real `string[]`, `seq` as a `number`, etc.

**⚠️ Auto-deserialization edge case (know it, unlikely to bite):** the SDK `JSON.parse`s each returned value. A plain-string value that happens to be valid JSON deserializes to that JSON — e.g. a keyword of literally `"null"` / `"true"` would come back as `null` / `true` instead of the string. A–Z keywords make this near-impossible here, but if paranoid, prefix stored strings or set `automaticDeserialization: false` and parse manually. The `null`-coalescing defaults (`seq ?? 0`, `mode ?? "idle"`, `replies ?? []`) the plan already has are correct and necessary.

The plan's `app/lib/redis.ts` is essentially correct as written. Ready-to-use:

```ts
import { Redis } from "@upstash/redis";
export const redis = Redis.fromEnv(); // reads UPSTASH_REDIS_REST_URL + _TOKEN

export async function pushForward(keyword: string, verbatim: string) {
  const seq = await redis.incr("seq");                          // number
  await redis.mset({ msg: keyword, verbatim, mode: "forward" }); // auto-serialized
  return seq;
}

export async function pullState() {
  const [seq, mode, msg, replies] = await redis.mget<
    [number, string, string, string[]]
  >("seq", "mode", "msg", "replies");                            // auto-deserialized, nullable
  return {
    seq: seq ?? 0,
    mode: mode ?? "idle",
    msg: msg ?? "",
    replies: replies ?? [],
  };
}
```
*Source: `upstash-redis-js` skill — overview (env-var names), batching-operations.md (`mget<any[]>`, `mset({...})`), data-serialization.md (auto (de)serialize; arrays/objects preserved). Official: https://upstash.com/docs/redis/sdks/ts/overview.*

---

## 5. Next.js App Router (current stable = **v16**) — ✅

- **Current major version: Next.js 16** (docs report `16.2.10`, 2026-03-13). `npx create-next-app@latest` scaffolds v16 — the plan's Task A1 command is fine.
- **`export const dynamic = "force-dynamic"` is STILL the correct way to force a route handler dynamic / opt out of caching — by default.** ✅ Route-segment config still supports it.
  - **⚠️ One caveat:** in Next 16, `dynamic` (and `revalidate`/`fetchCache`) is **removed only when Cache Components is enabled** (`cacheComponents: true` in `next.config`). A plain create-next-app does NOT enable Cache Components, so `force-dynamic` works. **Do not enable Cache Components** for this project (or you'd migrate to `'use cache'`/`cacheLife`).
  - Note: since Next 15, route handlers are **already uncached by default**, so `force-dynamic` here is belt-and-suspenders — keep it (it also blocks the Data/CDN cache on the ESP32-polled `/api/pull`).
- **`Response.json(data, init?)` works in route handlers** ✅ — it's the idiomatic helper (Web `Response.json` static method). `Response.json({...}, { status: 404 })` for status; `new Response(stream, { headers })` for streaming (used by `/api/tts`). No need for `NextResponse` here.
- **For the ESP32 poll route, also send `Cache-Control: no-store`** as extra insurance against any intermediary cache.
- FYI (not used here): v16 renamed `middleware.ts` → `proxy.ts`; async `params`/`searchParams` are `Promise`-wrapped — irrelevant to these flat routes.

### Ready-to-use pattern (`app/api/pull/route.ts`)
```ts
import { pullState } from "@/app/lib/redis";
export const dynamic = "force-dynamic"; // ✅ still correct in Next 16 (Cache Components OFF)

export async function GET() {
  const state = await pullState();
  return Response.json(state, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store", // belt-and-suspenders for the polling ESP32
    },
  });
}
```
*Source: `vercel:nextjs` skill (route-handlers.md — `Response.json` usage; overview notes v16 middleware→proxy) + `vercel:knowledge-update` + https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config (v16.2.10; version history: `dynamic` removed only under Cache Components).*

---

## 6. Vercel deploy with the Next.js app in a subdirectory — ✅

The Next.js root is a subfolder (`app/`, or `braille-app/` per Task A1 Step 1 — **pick ONE name**, see §7). The repo root is NOT the Next.js root. Three working approaches, in order of recommendation for this project:

1. **Git-import flow (matches Task A1 Step 4): set "Root Directory" in Vercel Project Settings.**
   Dashboard → Project → Settings → Build & Deployment → **Root Directory** = `app` (or your subdir). This is THE mechanism when Vercel builds from a pushed GitHub repo. Set it at import time or after.
2. **CLI from inside the subdir (most foolproof):**
   ```bash
   cd app                # the Next.js root
   vercel link           # creates .vercel/project.json for this dir
   vercel                # preview  (deploys `app/` as the project root)
   vercel --prod         # production
   ```
   Running the CLI from the project subdirectory makes the root unambiguous — no prompt, no config.
3. **`vercel.json` at the repo root with a `rootDirectory` key** — supported per the current CLI docs:
   ```json
   { "rootDirectory": "app" }
   ```
   (For a multi-project repo you'd instead `vercel link --repo` at the root → `.vercel/repo.json` maps dirs to projects.)

**Recommended exact invocation for this build:** use the Git-import flow with **Root Directory = the subdir in Project Settings** (Task A1 already imports the repo in the dashboard). If deploying purely from the CLI, `cd app && vercel --prod` is the guaranteed-correct one-liner.

*Source: `vercel-cli` skill (monorepos.md — `rootDirectory` in vercel.json; linking rules) + `vercel:deploy` skill (Next Steps: "Ensure the correct project root is configured in Vercel project settings … check `vercel.json` for `rootDirectory`"). Official: https://vercel.com/docs/monorepos.*

---

## 7. Corrections vs the plan (consolidated)

| # | Plan says | Reality (verified) | Action for Phase 2 |
|---|---|---|---|
| a | STT model `scribe_v2` | ✅ **Correct** — `scribe_v2` is the current 2026 model_id (not `scribe_v1`) | Keep `scribe_v2`. No change. |
| b | Reply-suggestions route uses `claude-sonnet-5` (Tech Stack line + Task A6 §1) | ❌ Overridden: use **`claude-haiku-4-5` for BOTH** `/api/condense` and `/api/suggest` | Use `claude-haiku-4-5` in `/api/suggest`. |
| c | `/api/condense` `max_tokens: 128` | ⚠️ Risky — `verbatim` is unbounded and can truncate the JSON | Bump to **`max_tokens: 256`**; wrap `JSON.parse` in try/catch; handle `stop_reason === "max_tokens"`. |
| d | JSON via bare instruct-and-parse | ⚠️ Fragile | Add an **assistant prefill `"{"`** (works on Haiku 4.5) or use **structured outputs** (`output_config.format`, supported on Haiku 4.5). |
| e | `dynamic = "force-dynamic"` (Next.js) | ✅ Still correct in Next **16** by default | Keep it. **Do NOT enable Cache Components** (would remove `dynamic`). Add `Cache-Control: no-store` on `/api/pull`. |
| f | Subdir naming: Task A1 Step 1 creates `braille-app/`, but File Structure/deploy refer to `app/` | ⚠️ Inconsistent | Pick ONE subdir name and set Vercel **Root Directory** to match (or `cd <subdir> && vercel`). |
| g | `Redis.fromEnv()` / `incr` / `mset` / `mget<[...]>()` | ✅ All correct; env vars `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | No change. Note the `"null"`/`"true"`-string deserialization edge case (harmless for a–z keywords). |
| h | STT/TTS auth + shapes | ✅ Correct (`xi-api-key`, `file`+`model_id`, response `text`; TTS body `text`+`model_id`) | No change. Serve TTS as `Content-Type: audio/mpeg`; hardcode voice `JBFqnCBsd6RMkjVDRZzb`. |

**Net:** the plan's external-API assumptions are largely sound. The only outright override is the **sonnet-5 → haiku-4-5** swap on the suggest route (per this task's instruction). The rest are hardening tweaks (max_tokens 256 + JSON guard, no-store header, don't enable Cache Components, pin the subdir name).
