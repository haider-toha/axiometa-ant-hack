> # ⛔ SUPERSEDED — DO NOT BUILD FROM THIS FILE
>
> **The speech-to-braille wearable was abandoned on 2026-07-18.** The team pivoted to a situational-
> awareness device for DeafBlind users (siren detection → haptics; vision → "which bus just arrived?").
> Vibrotactile braille on a wrist was found to be physically impossible: a braille cell needs 6
> distinguishable points in ~6mm, while vibrotactile two-point discrimination on the forearm is ~70mm —
> off by an order of magnitude.
>
> ### 👉 The current, authoritative plan is [`plan/2026-07-18-bus-stop-situational-awareness.md`](../2026-07-18-bus-stop-situational-awareness.md)
>
> ### Why this file is still worth reading
>
> Its **Global Constraints** section (below) is the origin of several physical facts that remain true and
> load-bearing for the new build: the no-soldering / no-extension-kit rule, the power budget, the
> outbound-only network architecture, and the `{1,3}`/`{2,4}` port-diagonal correction.
>
> ### ⚠ But one "LOCKED" value in it is WRONG
>
> Its pin map assigns the ERM motor data line to **IO0 (GPIO4 / GPIO9)**. The AX22-0013 module leaves
> IO0 *not connected* and drives from **IO1 → GPIO3 / GPIO16**, confirmed against the module schematic
> and pinout image. The error originated in `audit/speech-to-braille-wearable/03-track-3-parts-truth.md:311`
> and survived because the firmware was only ever compile-verified, never run against hardware.
> See `audit/bus-stop-situational-awareness/04-track-4-system-firmware-architecture.md`.

---

# Speech-to-Braille Wearable — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **⚠️ AUDIT IS AUTHORITATIVE:** `audit/speech-to-braille-wearable/` is the single source of truth. Where anything in this plan conflicts with an audit file, the audit file wins. The plan records original intent; the audit records what was physically verified and corrected. Always read the audit trail before implementing anything from this plan.

**Goal:** Build a two-way communication wearable for Braille-literate deafblind people — a general-purpose device that turns any spoken utterance from a hearing person into a vibrotactile-Braille "gist" felt on the wrist, and lets the user pick an AI-drafted reply that the app speaks aloud.

**Architecture:** Three cooperating parts, all reachable without a local phone↔device link. (1) A **Next.js web app on Vercel** (opened in the phone browser over HTTPS) captures the mic, proxies ElevenLabs + Anthropic through same-origin `/api/*` routes (keys in server env), and pushes a condensed keyword into an **Upstash Redis** relay. (2) The **ESP32-S3 (Axiometa Genesis Mini)** joins the phone's hotspot only for outbound internet, **polls Vercel** for new messages, and drives **2 ERM vibration motors** as Braille columns over timed beats. (3) The **AI loop** (inside the Vercel routes) cleans + condenses incoming speech and drafts reply suggestions with lightweight preference memory. Because the ESP32 only makes **outbound** calls to Vercel, there is no mixed-content problem and no hotspot client-isolation risk.

**Tech Stack:** Next.js (App Router, TypeScript) on Vercel · Upstash Redis (serverless KV relay) · ElevenLabs `scribe_v2` (STT) + `eleven_flash_v2_5` (TTS) · Anthropic `claude-haiku-4-5` (forward cleanup+condense) / `claude-sonnet-5` (reply suggestions) · ESP32-S3 Arduino (Genesis Mini board) with `WiFiClientSecure`, ST7735S LCD (Adafruit ST7735 lib), quadrature encoder.

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from the audit trail (`audit/speech-to-braille-wearable/00`–`04`).

- **No soldering.** All modules are AX22 snap-in. All parts are physically in hand (Genesis Mini kit + 2× ERM AX22-0013). There is **no "motors arrive Saturday" dependency** — that framing in `plan/idea.md` is stale.
- **⚠️ THE PARTS ARE FIXED — THIS IS THE ENTIRE BOM. Nothing else will be acquired.** Only the Genesis Mini kit modules + the 2× ERM. **No AX22 Port Extension Kit, no extension/ribbon leads, no purchased extras of any kind.** Consequence: **both motors snap directly into the board's ports, so they sit close together** (at most one 2×2-cluster diagonal apart). That closeness is **accepted, not a bug to fix** — the design gets distinguishability from **time** (the micro-stagger, and the strict-sequential fallback), and the **on-screen caption is the ground truth** for acceptance regardless of what the wrist can resolve. Do not plan around parts we do not have.
- **Power: a ≥1 A (≥5 W) USB source (power bank or wall charger), NOT a bare 500 mA laptop port.** Worst-case 3V3 load ≈0.58 A; the onboard TLV62569 buck is 2 A, so the USB source is the binding constraint (Track 3 §5).
- **Encoding scheme (LOCKED, do not redesign):** Columns × 3 row-beats. Motor A = left Braille column (dots 1·2·3), Motor B = right column (dots 4·5·6). Exactly 3 timed beats per letter (top/mid/bottom row); an empty row still consumes its silent slot. When a row fires **both** motors, render it **micro-staggered left-then-right (~100 ms)**, never truly simultaneous (Track 2 §2).
- **Timing constants (LOCKED defaults; tune only via the wear test):** buzz 400 ms, inter-beat gap 300 ms, inter-letter gap 800 ms, inter-word gap 1500 ms, both-fire stagger 100 ms (Track 2 §3).
- **Alphabet: A–Z only + letter-gap + word-gap. No number-sign, no punctuation.** Claude spells numbers as words ("two", not "2"). Symbol set = 26 letters + 2 delimiters (Track 2 §4).
- **Throughput: buzz only a Claude-condensed keyword, hard cap 15 characters** (~48 s absolute worst case; aim ≤10 chars). Full verbatim is shown on screen only. This is mandatory — the channel runs ~3.4–4.4 words/min (Track 2 §3, Track 4 §7).
- **Network (LOCKED): phone runs cellular + hotspot simultaneously; ESP32 joins the hotspot for outbound internet only; all traffic goes to Vercel.** No device-to-device link. iPhone: enable **Personal Hotspot → "Maximize Compatibility"** (ESP32 is 2.4 GHz-only) and keep the hotspot screen open during first connect.
- **WiFi fallback ladder (LOCKED):** (1) phone hotspot → Vercel [primary]; (2) any other 2.4 GHz internet with no captive portal (Android hotspot, home router) → Vercel; (3) **local-only emergency:** ESP32 `softAP` mode serving a type-a-word page (no cloud AI, forward buzz only) — last resort, loses the AI pipeline (Track 4 §4).
- **Pin map (LOCKED — CORRECTED by `audit/speech-to-braille-wearable/20-enclosure-cad-consolidated.md §4`. Board photos + STEP geometry proved silk Ports 1 & 4 are ADJACENT, not diagonal. The true diagonal pairs are {1,3} and {2,4}. Motors are on the {1,3} diagonal for maximum separation. Do NOT use the old "Port 1 & Port 4" default — it is wrong):**
  | Function | Port | Pin(s) → GPIO |
  |---|---|---|
  | Motor A (left column) | Port 1 | Data = GPIO4 (IO0) |
  | Motor B (right column) | Port 3 **(diagonal to Port 1)** | Data = GPIO9 (IO0) |
  | LCD ST7735S (SPI) | Port 2 | CS=GPIO7, RST=GPIO6, DC=GPIO5 + shared MOSI=GPIO12, SCK=GPIO14, backlight BL |
  | Rotary encoder | Port 4 **(corrected from Port 3)** | BT=GPIO1 (IO0), CL/A=GPIO17 (IO1), DT/B=GPIO18 (IO2) |
  | "Repeat last message" button | onboard | GPIO45 (no port cost) |
  Full per-port GPIO (IO0/IO1/IO2): **P1=4/3/2 · P2=7/6/5 · P3=9/16/15 · P4=1/17/18**. Shared buses (all ports): MOSI12 / MISO13 / SCK14 / SDA10 / SCL11. I²C is unused in this build.
- **Acceptance is scenario-agnostic and does NOT require a trained reader.** Success = for any spoken utterance in any face-to-face setting (retail, transit, service, workplace, social), the buzzed A/B beat sequence provably matches the on-screen caption checked against a printed Braille chart. The café is one example, never the scope.
- **Pitch integrity (LOCKED):** claim "feel the **gist**," never "feel everything said." **Never** claim "world-first," "novel device," or "minimal training" — all are demolition targets (Track 1 §D). The honest, defensible novelty is the **LLM-suggested-reply loop** on commodity no-solder hardware.
- **Serverless is stateless:** Vercel functions cannot persist a local file, so preference "memory" lives in Redis, not `memory.json` (correction to Track 4 §3).

---

## Scope Ladder (build upward; each rung is demoable; stop where the clock runs out)

| Rung | Deliverable | Status |
|---|---|---|
| **1** | Core pipeline: phone mic → STT → condense → Vercel → ESP32 pulls → keyword shows on LCD. No haptics. Proves plumbing. | Tasks A1–A5, B1–B2 |
| **2 — MVP CUT LINE** | The product: add Braille table + 2-motor 3-beat sequencer → **buzz the keyword**, with the verbatim caption on the LCD. **A working Rung 2 is the win.** | Tasks B3–B4, C1–C2 |
| **3** | Polish: 3D-printed wrist enclosure (see CAD spec `audit/…/05`), onboard-button "repeat", live captions for judges. | Task C-polish + CAD phase |
| **4 — STRETCH** | Reply loop: Claude suggests 3 replies → encoder scrolls (buzz highlighted) → press selects → app speaks via TTS → preference memory. | Tasks A6–A7, B5, C3 |

**MVP cut order under time pressure (cut top-down; each still leaves a working forward demo):** (1) TTS spoken reply; (2) the whole reply loop; (3) preference memory; (4) *emergency only* — the forward Claude call (fall back to client-side truncation of the raw transcript). **Never cut:** mic → STT → condensed keyword → buzz + on-screen caption (Track 4 §8).

---

## File Structure

**Web app (`app/` — Next.js App Router, deploy target Vercel):**
- `app/page.tsx` — single-screen UI: record button, live caption, reply suggestions, history list.
- `app/lib/redis.ts` — Upstash Redis client + typed get/set helpers for the relay keys.
- `app/lib/contract.ts` — shared TypeScript types for the relay + HTTP contract (one source of truth).
- `app/api/stt/route.ts` — POST audio blob → ElevenLabs `scribe_v2` → `{transcript}`.
- `app/api/condense/route.ts` — POST `{transcript}` → Claude haiku cleanup+keyword → `{keyword, verbatim}`.
- `app/api/push/route.ts` — POST `{keyword, verbatim}` → Redis (`INCR seq`, set `msg`,`mode=forward`).
- `app/api/pull/route.ts` — GET (ESP32 polls) → `{seq, mode, msg, replies}`.
- `app/api/suggest/route.ts` — POST `{verbatim}` → Claude 3 replies (+ memory) → Redis (`replies`,`mode=reply`). *(Rung 4)*
- `app/api/reply/route.ts` — POST `{index, text}` (ESP32) → Redis (`choice`), update memory. *(Rung 4)*
- `app/api/reply-result/route.ts` — GET (phone polls) → `{choice}` then clear. *(Rung 4)*
- `app/api/tts/route.ts` — POST `{text}` → ElevenLabs TTS → audio. *(Rung 4)*
- `app/lib/braille.test.ts` — unit test for the A–Z table (mirrors the firmware table; guards correctness).

**Firmware (`firmware/braille_wearable/` — Arduino sketch for Genesis Mini):**
- `braille_wearable.ino` — setup/loop: WiFi, LCD, poll, dispatch.
- `pins.h` — the LOCKED pin map (single source of truth).
- `braille.h` / `braille.cpp` — A–Z dot-pattern table + `buzzLetter` / `buzzWord` sequencer (the product core).
- `net.h` / `net.cpp` — WiFi join + `WiFiClientSecure` poll of `/api/pull` + POST `/api/reply`.
- `display.h` / `display.cpp` — ST7735S status + caption.
- `encoder.h` / `encoder.cpp` — quadrature scroll + button select (Rung 4).

**Config:** `.env.local` (web, git-ignored): `ELEVENLABS_API_KEY`, `ANTHROPIC_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. Firmware `secrets.h` (git-ignored): `WIFI_SSID`, `WIFI_PASS`, `VERCEL_HOST`.

---

## PART A — Web app + Vercel relay (buildable with zero hardware)

### Task A1: Scaffold Next.js app and deploy to Vercel

**Files:**
- Create: `app/` (Next.js App Router, TypeScript), `app/page.tsx`, `package.json`
- Create: `app/lib/contract.ts`

**Interfaces:**
- Produces: the deployed HTTPS origin `https://<app>.vercel.app`; the shared types in `contract.ts` used by every route and the client.

- [ ] **Step 1: Create the app**
```bash
npx create-next-app@latest braille-app --ts --app --no-tailwind --no-src-dir --eslint
cd braille-app
```

- [ ] **Step 2: Define the shared contract** — create `app/lib/contract.ts`:
```ts
export type Mode = "idle" | "forward" | "reply";
export interface PullResponse { seq: number; mode: Mode; msg: string; replies: string[]; }
export interface Choice { index: number; text: string; }
export const KEYWORD_MAX = 15;          // hard cap, enforced both sides
```

- [ ] **Step 3: Minimal page** — `app/page.tsx` renders `<h1>Braille Wearable</h1>` and a disabled record button (filled in A5).

- [ ] **Step 4: Deploy** — push to a GitHub repo, import in Vercel, deploy.
Run: open `https://<app>.vercel.app` on the phone browser.
Expected: the page loads over HTTPS (required for the mic later).

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat: scaffold Next.js app deployed to Vercel"
```

### Task A2: Upstash Redis relay — `/api/push` and `/api/pull`

**Files:**
- Create: `app/lib/redis.ts`, `app/api/push/route.ts`, `app/api/pull/route.ts`
- Test: `app/api/relay.test.ts`

**Interfaces:**
- Consumes: `contract.ts` types.
- Produces: `POST /api/push {keyword, verbatim}` → `{seq}`; `GET /api/pull` → `PullResponse`. Redis keys: `seq`(int), `msg`(string), `verbatim`(string), `mode`(Mode), `replies`(json), `choice`(json|null).

- [ ] **Step 1: Write the failing test** — `app/api/relay.test.ts`:
```ts
import { test, expect } from "vitest";
import { pushMsg, pull } from "./_relayHelpers"; // thin wrappers over redis.ts
test("push then pull returns the keyword and a higher seq", async () => {
  const before = (await pull()).seq;
  await pushMsg("coffee", "a coffee please");
  const after = await pull();
  expect(after.seq).toBe(before + 1);
  expect(after.mode).toBe("forward");
  expect(after.msg).toBe("coffee");
});
```

- [ ] **Step 2: Run it to verify it fails** — `npx vitest run app/api/relay.test.ts` → FAIL (helpers not defined).

- [ ] **Step 3: Implement `redis.ts`**
```ts
import { Redis } from "@upstash/redis";
export const redis = Redis.fromEnv();
export async function pushForward(keyword: string, verbatim: string) {
  const seq = await redis.incr("seq");
  await redis.mset({ msg: keyword, verbatim, mode: "forward" });
  return seq;
}
export async function pullState() {
  const [seq, mode, msg, replies] = await redis.mget<[number,string,string,string[]]>(
    "seq","mode","msg","replies");
  return { seq: seq ?? 0, mode: (mode ?? "idle"), msg: msg ?? "", replies: replies ?? [] };
}
```

- [ ] **Step 4: Implement the routes** — `app/api/push/route.ts` calls `pushForward`, enforces `KEYWORD_MAX` (truncate as backstop), returns `{seq}`. `app/api/pull/route.ts` returns `pullState()`. Both set `Access-Control-Allow-Origin: *` and `export const dynamic = "force-dynamic"`.

- [ ] **Step 5: Run the test to verify it passes** — `npx vitest run app/api/relay.test.ts` → PASS (needs a real Upstash test DB configured in env).

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "feat: Upstash Redis relay with seq-gated push/pull"
```

### Task A3: `/api/stt` — ElevenLabs Scribe proxy

**Files:**
- Create: `app/api/stt/route.ts`

**Interfaces:**
- Produces: `POST /api/stt` (multipart, field `file`) → `{transcript: string}`. Key stays in server env.

- [ ] **Step 1: Implement the route**
```ts
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const inForm = await req.formData();
  const file = inForm.get("file") as File;
  const out = new FormData();
  out.append("file", file);
  out.append("model_id", "scribe_v2");
  const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
    body: out,
  });
  const j = await r.json();
  return Response.json({ transcript: j.text ?? "" });
}
```

- [ ] **Step 2: Verify with a sample clip**
Run: `curl -F file=@sample.webm https://<app>.vercel.app/api/stt`
Expected: JSON `{"transcript":"...words from the clip..."}`.

- [ ] **Step 3: Commit** — `git commit -m "feat: ElevenLabs Scribe v2 STT proxy"`

### Task A4: `/api/condense` — Claude cleanup + keyword condensation

**Files:**
- Create: `app/api/condense/route.ts`

**Interfaces:**
- Produces: `POST /api/condense {transcript}` → `{keyword: string (A–Z, ≤15 chars), verbatim: string}`.

- [ ] **Step 1: Implement the route** (single latency-critical Claude call; small `max_tokens`, JSON output):
```ts
import Anthropic from "@anthropic-ai/sdk";
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const { transcript } = await req.json();
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 128,
    system:
      "You clean a noisy speech transcript, then condense it to ONE tactile keyword " +
      "(1-3 words, letters a-z and spaces only, spell numbers as words, no punctuation, " +
      "max 15 characters) capturing the gist a deafblind user most needs. " +
      'Reply ONLY as JSON: {"keyword":"...","verbatim":"<cleaned full text>"}.',
    messages: [{ role: "user", content: transcript }],
  });
  const text = msg.content.find(c => c.type === "text")?.text ?? "{}";
  const { keyword, verbatim } = JSON.parse(text);
  const clean = (keyword ?? "").toLowerCase().replace(/[^a-z ]/g, "").slice(0, 15);
  return Response.json({ keyword: clean, verbatim: verbatim ?? transcript });
}
```

- [ ] **Step 2: Verify**
Run: `curl -s -XPOST https://<app>.vercel.app/api/condense -H 'content-type: application/json' -d '{"transcript":"hi there what can i get for you today"}'`
Expected: JSON where `keyword` is ≤15 chars, lowercase a–z + spaces (e.g. `"your order"`), and `verbatim` is the cleaned sentence.

- [ ] **Step 3: Commit** — `git commit -m "feat: Claude haiku cleanup+condense route"`

### Task A5: Client — mic capture and the forward pipeline

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `/api/stt`, `/api/condense`, `/api/push`.
- Produces: a working Rung-1 forward client (press → speak → release → keyword lands in Redis; caption shown).

- [ ] **Step 1: Record + run the pipeline** (press-to-talk):
```tsx
async function onStop(blob: Blob) {
  const f = new FormData(); f.append("file", blob, "clip.webm");
  const { transcript } = await (await fetch("/api/stt", { method: "POST", body: f })).json();
  const { keyword, verbatim } =
    await (await fetch("/api/condense", { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ transcript }) })).json();
  await fetch("/api/push", { method: "POST",
    headers: { "content-type": "application/json" }, body: JSON.stringify({ keyword, verbatim }) });
  setCaption(verbatim); setBuzzing(keyword);   // show verbatim; keyword is what the wrist gets
}
```
Use `navigator.mediaDevices.getUserMedia({audio:true})` + `MediaRecorder` (`audio/webm;codecs=opus`); assemble the `Blob` on stop and call `onStop`.

- [ ] **Step 2: Verify end-to-end (no hardware yet)**
Run: open the app on the phone, hold record, say "a flat white please", release; then `curl https://<app>.vercel.app/api/pull`.
Expected: `pull` shows `mode:"forward"`, `msg` a ≤15-char keyword, and a fresh `seq`. The page shows the verbatim caption.

- [ ] **Step 3: Commit** — `git commit -m "feat: mic capture + forward pipeline (Rung 1 client)"`

### Task A6: Reply-loop server routes *(Rung 4 — stretch)*

**Files:**
- Create: `app/api/suggest/route.ts`, `app/api/reply/route.ts`, `app/api/reply-result/route.ts`, `app/api/tts/route.ts`

**Interfaces:**
- Produces: `POST /api/suggest {verbatim}` → writes `replies`(3 items, each ≤15 chars) + `mode="reply"` + `INCR seq`; `POST /api/reply {index,text}` (ESP32) → sets `choice`, updates memory; `GET /api/reply-result` → `{choice}` then clears; `POST /api/tts {text}` → audio.

- [ ] **Step 1: `/api/suggest`** — Claude (`claude-sonnet-5`, `max_tokens` 256) reads `verbatim` + `memory` (from Redis `memory` key) and returns `{"suggestions":["...","...","..."]}` (short, a–z, ≤15 chars each, most-likely-usual first). Write to Redis, bump seq.

- [ ] **Step 2: `/api/reply` + `/api/reply-result`** — ESP32 posts the chosen `{index,text}`; store in `choice`; append to `memory.recent` and increment counts; phone polls `reply-result`, receives `choice`, then it is cleared.

- [ ] **Step 3: `/api/tts`** — forward `{text}` to `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}` with `model_id: "eleven_flash_v2_5"`, return the MP3 stream.

- [ ] **Step 4: Verify** — `curl -XPOST …/api/suggest -d '{"verbatim":"would you like anything else"}'` → 3 short suggestions in Redis; `curl -XPOST …/api/reply -d '{"index":0,"text":"just the bill"}'` then `curl …/api/reply-result` → returns the choice once.

- [ ] **Step 5: Commit** — `git commit -m "feat: reply-loop server routes (suggest/reply/tts/memory)"`

### Task A7: Reply-loop client UI *(Rung 4 — stretch)*

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1:** after a forward push, call `/api/suggest`; render the 3 suggestions on screen (they also go to the ESP32 via `pull`).
- [ ] **Step 2:** poll `/api/reply-result` (~500 ms); on a choice, `POST /api/tts` and play the returned audio via an `Audio` element; append to an on-screen history list.
- [ ] **Step 3: Verify** — full loop with the ESP32 (after B5): speak → suggestions appear → scroll+select on the device → phone speaks the reply.
- [ ] **Step 4: Commit** — `git commit -m "feat: reply-loop client UI + TTS playback"`

---

## PART B — ESP32 firmware (needs the board; motors are in hand)

### Task B1: WiFi join + LCD status

**Files:**
- Create: `firmware/braille_wearable/braille_wearable.ino`, `pins.h`, `secrets.h` (git-ignored), `display.h/.cpp`, `net.h/.cpp`

**Interfaces:**
- Produces: on boot the ESP32 joins the hotspot and the LCD shows SSID + `WiFi.localIP()` + "READY".

- [ ] **Step 1: `pins.h`** — transcribe the LOCKED pin map verbatim:
```cpp
#define MOTOR_L    4    // Port 1 IO0 — left Braille column (Motor A)
#define MOTOR_R    9    // Port 3 IO0 — right Braille column (Motor B, diagonal to Port 1)
#define LCD_CS     7    // Port 2 IO0
#define LCD_RST    6    // Port 2 IO1
#define LCD_DC     5    // Port 2 IO2
#define LCD_MOSI   12   // shared SPI
#define LCD_SCLK   14   // shared SPI
#define ENC_BT     1    // Port 4 IO0 — encoder button
#define ENC_CL     17   // Port 4 IO1 — channel A
#define ENC_DT     18   // Port 4 IO2 — channel B
#define BTN_REPEAT 45   // onboard user-45 button
```

- [ ] **Step 2: WiFi join** (`net.cpp`) — `WiFi.mode(WIFI_STA); WiFi.begin(WIFI_SSID, WIFI_PASS);` loop until `WL_CONNECTED`; expose `String deviceIp()` = `WiFi.localIP().toString()`.

- [ ] **Step 3: LCD** (`display.cpp`) — init Adafruit ST7735 on the pins above; `showStatus(ssid, ip, state)` renders three lines.

- [ ] **Step 4: Verify (flash + observe)**
Run: flash via Arduino IDE (board "Axiometa Genesis Mini"), open Serial Monitor at 115200, power from a **≥1 A** bank; start the phone hotspot with "Maximize Compatibility".
Expected: Serial prints "WiFi connected, IP=172.20.10.x"; the LCD shows the SSID, that IP, and "READY".

- [ ] **Step 5: Commit** — `git commit -m "firmware: WiFi STA join + LCD status"`

### Task B2: Poll Vercel over TLS

**Files:**
- Modify: `net.h/.cpp`, `braille_wearable.ino`

**Interfaces:**
- Consumes: `GET https://<VERCEL_HOST>/api/pull` → `PullResponse` JSON.
- Produces: `bool pollPull(PullResult& out)` that returns true when `seq` advances past the last handled seq.

- [ ] **Step 1: TLS poll** (`net.cpp`):
```cpp
WiFiClientSecure tls; // in setup: tls.setInsecure();  // demo: skip cert check
bool pollPull(PullResult& out) {
  HTTPClient http; http.begin(tls, String("https://") + VERCEL_HOST + "/api/pull");
  if (http.GET() != 200) { http.end(); return false; }
  StaticJsonDocument<1024> d; deserializeJson(d, http.getString()); http.end();
  long seq = d["seq"]; if (seq <= lastSeq) return false;
  lastSeq = seq; out.mode = d["mode"].as<String>(); out.msg = d["msg"].as<String>();
  for (auto v : d["replies"].as<JsonArray>()) out.replies.push_back(v.as<String>());
  return true;
}
```

- [ ] **Step 2: Call it every ~700 ms** in `loop()`; on a new forward message, `Serial.println(out.msg)` for now.

- [ ] **Step 3: Verify (flash + observe)**
Run: with B1 running, speak into the phone app; watch Serial.
Expected: within ~1 s of release, Serial prints the condensed keyword. Latency speech-end→print ≈ 1.5–3 s.

- [ ] **Step 4: Commit** — `git commit -m "firmware: TLS poll of Vercel /api/pull (seq-gated)"`

### Task B3: Braille table + 2-motor 3-beat sequencer (THE PRODUCT CORE)

**Files:**
- Create: `braille.h/.cpp`
- Test: `app/lib/braille.test.ts` (JS mirror, guards table correctness against a chart)

**Interfaces:**
- Produces: `void buzzWord(const char* w)` driving `MOTOR_L`/`MOTOR_R` per the LOCKED scheme + timing.

- [ ] **Step 1: The A–Z table** — each letter is a 6-bit mask (bit0=dot1 … bit5=dot6). **Validate this against an authoritative Unified English Braille chart before trusting it** (acceptance depends on it):
```cpp
// a b c d e f g h i j  k l m n o p q r s t  u v w x y z
const uint8_t BRAILLE[26] = {
 0x01,0x03,0x09,0x19,0x11,0x0B,0x1B,0x13,0x0A,0x1A,
 0x05,0x07,0x0D,0x1D,0x15,0x0F,0x1F,0x17,0x0E,0x1E,
 0x25,0x27,0x3A,0x2D,0x3D,0x35 };
```

- [ ] **Step 2: The sequencer** (LOCKED scheme + timing + micro-stagger):
```cpp
const int BUZZ=400, GAP_BEAT=300, GAP_LETTER=800, GAP_WORD=1500, STAGGER=100;
void beat(bool L, bool R){
  if (L && R){                                   // both-fire → micro-stagger L then R
    digitalWrite(MOTOR_L,HIGH); delay(STAGGER);
    digitalWrite(MOTOR_R,HIGH); delay(BUZZ);
    digitalWrite(MOTOR_L,LOW);  digitalWrite(MOTOR_R,LOW);
  } else {                                        // single or silent
    if(L) digitalWrite(MOTOR_L,HIGH);
    if(R) digitalWrite(MOTOR_R,HIGH);
    delay(BUZZ);
    digitalWrite(MOTOR_L,LOW); digitalWrite(MOTOR_R,LOW);
  }
}
void buzzLetter(uint8_t d){                       // 3 beats: top/mid/bottom row
  beat(d&0x01, d&0x08); delay(GAP_BEAT);          // row1: dot1(L), dot4(R)
  beat(d&0x02, d&0x10); delay(GAP_BEAT);          // row2: dot2(L), dot5(R)
  beat(d&0x04, d&0x20);                           // row3: dot3(L), dot6(R)
}
void buzzWord(const char* w){
  for (int i=0; w[i]; i++){
    char c = tolower(w[i]);
    if (c>='a'&&c<='z'){ buzzLetter(BRAILLE[c-'a']); delay(GAP_LETTER); }
    else if (c==' ') delay(GAP_WORD);
  }
}
```

- [ ] **Step 3: Serial self-test** — a `brailleSelfTest()` that prints each letter's 3-beat states (e.g. `c: [L·][··][··]... ` mapped from the mask) so a human can diff it against a Braille chart without feeling anything.

- [ ] **Step 4: JS mirror test** — `braille.test.ts` encodes the same 26 masks and asserts a few known letters (`a`→dot1 only; `l`→dots 1,2,3; `w`→dots 2,4,5,6). Run `npx vitest run app/lib/braille.test.ts` → PASS. (Guards against a transcription typo in the acceptance-critical table.)

- [ ] **Step 5: Verify on motors (flash + observe)**
Run: flash; in `setup()` call `pinMode(MOTOR_L/R, OUTPUT)` then `buzzWord("cab")`.
Expected: you feel `c`=[both-row1][silent][silent], `a`=[L-row1][silent][silent], `b`=[L-row1][L-row2][silent] — each a distinct 3-beat pattern; verify against the chart.

- [ ] **Step 6: Commit** — `git commit -m "firmware: A-Z Braille table + column x 3-beat sequencer with micro-stagger"`

### Task B4: Wire poll → buzz + caption (Rung 2 MVP COMPLETE)

**Files:**
- Modify: `braille_wearable.ino`, `display.cpp`

- [ ] **Step 1:** in `loop()`, when `pollPull` returns a new `forward` message: `showCaption(msg)` on the LCD, then `buzzWord(msg.c_str())`.
- [ ] **Step 2:** debounce onboard `BTN_REPEAT` (GPIO45) → re-buzz the last message.
- [ ] **Step 3: Verify — the MVP acceptance test** (scenario-agnostic, see Task C1).
- [ ] **Step 4: Commit** — `git commit -m "firmware: forward path buzz + LCD caption (Rung 2 MVP)"`

### Task B5: Encoder reply mode *(Rung 4 — stretch)*

**Files:**
- Create: `encoder.h/.cpp`; Modify: `braille_wearable.ino`, `net.cpp`

**Interfaces:**
- Consumes: `pull` `replies[]` when `mode=="reply"`; posts `POST /api/reply {index,text}`.
- Produces: scroll-and-select UX (buzz the highlighted suggestion only).

- [ ] **Step 1:** decode the quadrature encoder (`ENC_CL`/`ENC_DT`, interrupt or the RotaryEncoder lib) + read `ENC_BT`.
- [ ] **Step 2:** on `mode=="reply"`: play a distinct "replies ready" cue (e.g. a long both-motor buzz), show all 3 on the LCD, and enter scroll mode. On each encoder detent, highlight the next suggestion and `buzzWord` **only that one**. On `ENC_BT` press, `postReply(index, text)`.
- [ ] **Step 3: Verify (flash + observe)** — trigger a reply set; scroll: each landed suggestion buzzes (keyword-short, ~5–10 s); press → Serial shows the POST; the phone (A7) speaks it.
- [ ] **Step 4: Commit** — `git commit -m "firmware: encoder reply scroll/select (Rung 4)"`

---

## PART C — Integration, wear-test, demo

### Task C1: Forward acceptance test (scenario-agnostic)

**Interfaces:** exercises the whole Rung-2 path; this is the falsifiable success test from the Global Constraints.

- [ ] **Step 1: Define the check** — pick **three different contexts** (e.g. retail: "that's four pounds fifty"; transit: "platform two"; social: "how are you"). For each, speak it into the app.
- [ ] **Step 2: Verify**
Run: for each utterance, watch the LCD caption + feel/observe the buzz; a second person with a printed Braille chart transcribes the beat pattern.
Expected (**acceptance**): the transcribed beats match the keyword shown on the LCD, letter-for-letter, for all three contexts. First buzz begins within ~4 s of speech-end. **No trained reader required** — correctness is judged against the chart.
- [ ] **Step 3: Commit** any tuning — `git commit -m "test: scenario-agnostic forward acceptance passes for 3 contexts"`

### Task C2: Wear-test protocol + timing tune (gates CAD)

**Interfaces:** runs Track 2 §"Day-of wear-test checklist" (audit `02`, items 1–9). Results feed the CAD spec and may switch the both-fire rendering.

- [ ] **Step 1: BOTH-FIRE GATE (highest priority)** — at the printed spacing, present {silent, left-only, right-only, both} blind ≥20 trials. **Target >90 % on "both vs one".** If it fails: grow spacing (Step 2), then keep micro-stagger, then fall back to strict-sequential encoding.
- [ ] **Step 2: Measure the FIXED spacing + pick the encoding mode** — the motors are snapped into the board, so separation is **fixed at the cluster diagonal** (measure it; likely well under 40 mm). You cannot sweep it — this is everything we have. Run the Step-1 both-fire gate at that spacing. If it fails: keep the micro-stagger; if it still fails, **switch the firmware to strict-sequential encoding** (Track 2 rank #2 — one motor per beat, never both at once, so it needs only left-vs-right *identification*, not two-point discrimination, and does not depend on spacing). Record which mode passed → hand to the CAD phase.
- [ ] **Step 3:** confirm buzz feel (400 ms clean, not mushy), inter-beat non-merge (300 ms), silent-slot perceived as elapsed time, letter/word segmentation countable by a naive helper, and no through-wrist bone-conduction leakage. Adjust the five timing constants only here.
- [ ] **Step 4: Commit** the tuned constants — `git commit -m "test: wear-test results + tuned timing constants"`

### Task C3: Reply-loop integration *(Rung 4 — stretch)*
- [ ] End-to-end: speak → suggestions on screen + on device → scroll/select on device → phone speaks. Verify the chosen reply is the one selected. Commit.

### Task C-polish: Enclosure + strap + captions *(Rung 3)*

**Refs:** design-spec `audit/…/05` (corrected by `07`) · dimensioned drawing `cad/braille_wearable_drawing.dxf` (import into Fusion 360; pipeline in `08`) · strap `10` · print logistics `12`.

- [ ] **Enclosure:** print per the CAD phase — board **component-side-OUT** (screen/knob/motors/encoder all face outward), a **solid rigid PLA skin-contact plate** on the wrist side with the **ERM modules rigidly clamped** so vibration conducts (NO soft membrane — it damps the buzz). Confirm the buzz is clearly felt through the plate under strap tension; verify captions readable by judges.
- [ ] **Strap (22 mm lugs):** print a **segmented pin-hinge band** in gray PLA (no magnets; a one-piece flexible PLA band is NOT viable — PLA cracks), closing with a printed tang buckle (6–8 holes ≈ 30–40 mm adjust); OR buy a **22 mm quick-release strap** if sourceable on-site. Fits any Bambu (256 std bed prints head + whole band; split the band for a 180 mini). Clip via a printed Ø2.5 mm captive cross-pin in Ø2.6 mm lug bores.
- [ ] Commit.

### Task C4: Demo script + fallbacks

- [ ] **Step 1:** write a 2-minute script that shows **≥2 distinct contexts** (never café-only), states the honest pitch ("feel the gist; the AI drafts, you pick, it speaks"), and never claims a first or "minimal training".
- [ ] **Step 2:** rehearse the fallback ladder — if the hotspot/Vercel path fails, drop to the ESP32 `softAP` type-a-word local demo (forward buzz only); if Claude is slow, the client truncates the transcript. Confirm each fallback buzzes something.
- [ ] **Step 3: Commit** — `git commit -m "docs: demo script + rehearsed fallback ladder"`

---

## Self-Review

**Spec coverage:** forward pipeline (A1–A5,B1–B4) ✓ · encoding scheme locked + coded (B3) ✓ · WiFi model + fallback ladder (Global Constraints, C4) ✓ · power assumption (Global Constraints) ✓ · MVP cut line + cut order (Scope Ladder) ✓ · reply loop as explicit stretch (A6–A7,B5,C3) ✓ · scenario-agnostic acceptance (C1) ✓ · wear-test gating CAD (C2) ✓ · honest pitch (Global Constraints, C4) ✓ · CAD hand-off (C-polish → `05`/`07`/`10`/`12` + `cad/braille_wearable_drawing.dxf`, Fusion via `08`) ✓ · strap 22 mm printed/buy (C-polish) ✓.

**Placeholder scan:** the four must-not-be-placeholder items are concrete — encoding scheme (B3 code), WiFi fallback (3-rung ladder), power (≥1 A source), MVP cut line (Rung 2 + cut order). No "TBD"/"handle errors"/"similar to Task N".

**Type consistency:** `PullResponse`/`Choice`/`KEYWORD_MAX` defined once in `contract.ts`; the firmware `PullResult` mirrors the same fields; the Braille masks appear identically in `braille.cpp` and `braille.test.ts` (the JS test guards the C table).

**Known residual (not placeholders — flagged with how to close):** CAD-critical geometry (port centres, mounting-hole XY, motor/encoder heights) is UNKNOWN and must be measured on the day (audit `03` §9) — this is a CAD-phase input, not a firmware blocker. The both-fire percept at the achievable wrist spacing is a measurement (C2 Step 1), with micro-stagger and a strict-sequential fallback already specified.

## Execution Handoff

**Plan complete and saved to `plan/2026-07-17-speech-to-braille-wearable.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks. Note Part A (web) and Part B (firmware) are independent until Task B4 and can proceed in parallel.

**2. Inline Execution** — execute tasks in this session with checkpoints.

**Which approach?** (Not for this session — this session stops at plan + design-spec per the standing constraint; no application/firmware code is written here.)
