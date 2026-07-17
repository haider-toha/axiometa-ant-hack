# 04 — Track 4: Software Stack + Network + APIs

**Type:** Phase 1 research track (grounded, cited)
**Date:** 2026-07-17
**Author:** Track 4 (SOFTWARE + NETWORK architecture)
**Feeds:** Phase 2 executable plan; corrects `plan/idea.md` software/network assumptions.

> Every external claim below is cited with a URL. API facts are **date-sensitive** — see Grounding notes. This track VERIFIES the LOCKED decisions in `00-grilling-locked-decisions.md` (browser web app; phone-hotspot network; record-then-send STT; single forward Claude call; separate reply-suggestion call; <~4 s latency target) and flags where they need to change to actually work.

---

## Scope

Ground the software + network layer: ElevenLabs STT (browser mic path), ElevenLabs TTS, Anthropic model IDs + browser-CORS reality, the phone↔ESP32 network (the risk), the end-to-end latency budget + message-length policy, and explicit MVP cut lines. Firmware braille encoding, motor science, and CAD are out of scope (Tracks 2/3).

**Headline finding (read first):** two browser-security invariants collide with the locked "phone browser calls the ESP32's local IP directly" model. Microphone capture (`getUserMedia`) requires a **secure context**, and a **secure (HTTPS) page cannot fetch an HTTP IP-host URL** (mixed content, hard-blocked). The only origin that satisfies *both* mic capture *and* a plain-HTTP call to the ESP32 is **`http://localhost`**, which forces the browser+mic onto a **laptop** (not a stock phone). The phone stays as the hotspot + cellular uplink. This is the single most important correction in this track. Everything else works within the locked decisions.

---

## Verdicts / evidence

### 1. ElevenLabs STT — model + call path

**Model: `scribe_v2`** (batch), record-then-send. Endpoint `POST https://api.elevenlabs.io/v1/speech-to-text`; audio uploaded as **multipart form-data field `file`**; `model_id=scribe_v2`; auth header `xi-api-key`; supports "all major audio and video formats," <5.0 GB, min 100 ms duration. `scribe_v1` is legacy; `scribe_v2_realtime` (~150 ms streaming) is **not** used because the locked mode is press-to-talk record-then-send. ([STT convert reference](https://elevenlabs.io/docs/api-reference/speech-to-text/convert); model list also in `.claude/skills/speech-to-text/SKILL.md`.)

**Browser audio path:** `navigator.mediaDevices.getUserMedia({audio:true})` → `MediaRecorder` → on stop, a `Blob` (`audio/webm;codecs=opus` on Chrome/Firefox) → `FormData` with the blob as `file` → POST. `getUserMedia`/`MediaRecorder` require a **secure context** (see §5). WebM/Opus is an accepted format.

**CORS / key model — DO NOT call ElevenLabs directly from browser JS.** ElevenLabs' own guidance: *"Do not share it with others or expose it in any client-side code (browsers, apps)."* For client-side they offer **single-use tokens** ("valid for a limited time … without exposing your API key, for example from the client side") — but those are documented for the realtime WebSocket STT, not the batch convert endpoint. ([Authentication](https://elevenlabs.io/docs/api-reference/authentication).) **Verdict: proxy it.** Send the recorded blob to a same-origin server route (`POST /api/stt`) that holds the key and forwards to ElevenLabs. This also sidesteps any REST CORS question (server→server), and the server call rides the phone's cellular link.

### 2. ElevenLabs TTS — model + call path

**Model: `eleven_flash_v2_5`** for a snappy demo (~75 ms model latency, 32 languages, built for real-time) OR **`eleven_multilingual_v2`** for maximum naturalness (29 languages, higher latency/cost). `eleven_v3` is the most expressive (70+ langs) but overkill here. ([Models](https://elevenlabs.io/docs/overview/models); [Meet Flash](https://elevenlabs.io/blog/meet-flash); table also in `.claude/skills/text-to-speech/SKILL.md`.) Because TTS is on the **backward** (reply) path, it is **not** inside the <4 s forward budget, so quality-over-speed (`eleven_multilingual_v2`) is a fine default; `flash_v2_5` if you want instant playback.

**Call path:** `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}` with `model_id` + `text`, returns MP3 (`mp3_44100_128` default). Voice: any preset, e.g. Sarah `EXAVITQu4vr4xnSDxMaL` or George `JBFqnCBsd6RMkjVDRZzb`. Same **proxy** rule as STT (key server-side, `POST /api/tts` → returns audio → browser plays via an `Audio`/`<audio>` element). Same CORS/credit considerations as §1.

### 3. Anthropic API — model IDs + the CORS/proxy implication

Grounded via the in-environment `claude-api` skill (authoritative for this session; cached 2026-06-24):

| Role | Recommended model ID | $ / 1M (in/out) | Why |
|---|---|---|---|
| **(a) Forward: cleanup + keyword-condensation (ONE call, latency-critical)** | **`claude-haiku-4-5`** | $1 / $5 | Fastest, cheapest; the task (fix STT typos + return 1–2 keywords) is a simple transform. Sub-second typical → protects the <4 s budget. 200K context is ample. |
| **(b) Backward: reply suggestions + preference memory (not latency-critical)** | **`claude-sonnet-5`** ($3/$15) or `claude-haiku-4-5` | — | Slightly more nuance for natural replies; still cheap. Haiku is fine if you want one model everywhere. |

- Anthropic's stated default is **`claude-opus-4-8`** ($5/$25) and the guidance is "never downgrade for cost — that's the user's decision." For a **<4 s latency budget on a 2-day demo with a $100 credit**, Haiku 4.5 on the forward path is the pragmatic engineering call; this is the builder's decision to confirm. Opus 4.8 or Sonnet 5 are drop-in if quality matters more than latency.
- **Latency knobs:** keep `max_tokens` small (e.g. 64–128), do **not** enable extended thinking (Haiku 4.5 has no `effort`/adaptive-thinking; just omit `thinking`), and constrain output to a tiny JSON shape (e.g. `{"keywords":"coffee"}` / `{"suggestions":["...","...","..."]}`) via `output_config.format`.
- **Endpoint:** `POST https://api.anthropic.com/v1/messages`, headers `x-api-key`, `anthropic-version: 2023-06-01`, `content-type: application/json`.

**CORS/proxy reality (the key implication):** Anthropic *does* support browser CORS, but **only** via the request header `anthropic-dangerous-direct-browser-access: true` (SDK: `dangerouslyAllowBrowser: true`) — which requires the **secret key in the browser**, an anti-pattern by design ("anyone with access to that site can steal your API key"). ([Simon Willison, Aug 2024](https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access/).) **Verdict: proxy it** through the same server route pattern as ElevenLabs (`POST /api/claude`). For a demo you *could* embed the key in a local-only `http://localhost` app you control (see §5) and use the dangerous header — acceptable risk with a capped key you rotate after the event — but the server-route pattern is strictly cleaner and is the standard Next.js approach (keys in server env, browser calls same-origin `/api/*`, no third-party CORS at all).

**Preference-memory (no ML):** a plain JSON file on the server, e.g. `memory.json`:
```json
{ "orders": [{"item":"cappuccino","mods":["extra shot"],"count":5}], "recent":["just the bill thanks"] }
```
On each reply-suggestion call the server reads this file and injects it into the Claude prompt ("User's usual orders: cappuccino + extra shot ×5 …"); Claude ranks the usual order first. On selection, increment the count / push to `recent` and write the file back. The "it learns your habits" pitch stays truthful — the behavior is real, the implementation is a file. (Matches `plan/idea.md` "The AI angle.")

### 4. Phone↔ESP32 network — VERIFICATION of the locked hotspot model

**Locked model:** phone runs a hotspot, ESP32 joins as a client, phone keeps cellular for the APIs and reaches the ESP32 on the hotspot LAN. **Does it actually work?** *Mostly yes — the LAN plumbing is sound — but the "phone browser reaches the ESP32" leg is blocked by browser security (see §5), so the browser must move to a laptop client, which turns the ESP32 hop into a client↔client hop that depends on the hotspot not isolating clients.* Per-OS detail:

**Hotspot + cellular simultaneously — YES (both OSes).** A phone hosting a hotspot NATs connected clients to its cellular data while keeping its own connectivity — this is the normal tethering behavior on iOS and Android. iPhone Personal Hotspot hands out a fixed **`172.20.10.0/28`** subnet, gateway/iPhone at **`172.20.10.1`**, ~13 client slots, mask `255.255.255.240` (some iOS 17+ builds use `192.0.0.1`). ([iPhone hotspot subnet info](https://charsiurice.wordpress.com/2021/02/08/iphone-hotspot-subnet-info/).) Android's hotspot gateway is typically `192.168.43.1`, but **Android 11+ randomizes the 3rd octet** (`192.168.x.1`) — so you cannot hardcode the ESP32/gateway IP on Android. ([B4X: httpserver on 192.168.43.1](https://www.b4x.com/android/forum/threads/httpserver-running-on-a-hotspot-192-168-43-1.111930/); Android 11 randomization noted in [XDA hotspot DHCP thread](https://xdaforums.com/t/guide-root-how-to-set-wi-fi-hotspot-dhcp-ip-address-range-and-static-ip-addresses-on-android-14.4751546/).)

**iPhone gotcha — 2.4 GHz.** The **ESP32-S3 is 2.4 GHz-only**; iPhone 12+ hotspots default to **5 GHz**, so the ESP32 silently fails to join until you enable **Settings → Personal Hotspot → "Maximize Compatibility"** (forces 2.4 GHz). Also: keep the Personal Hotspot settings screen open during first connect (iOS can stop broadcasting the SSID when idle/screen-locked with no clients), and avoid special characters in the iPhone name (SSID parsing). ([arduino-esp32 issue #2110](https://github.com/espressif/arduino-esp32/issues/2110); [ESP32↔iPhone hotspot notes](https://grokipedia.com/page/ESP32_WiFi_Connection_to_iPhone_Hotspot).) Android hotspots default to 2.4 GHz and generally "just work."

**Client-to-client reachability (the make-or-break, because the browser is now a laptop client — see §5):** devices on the same iPhone-hotspot subnet are on one `/28` and *generally can* reach each other; Android hotspots are routinely used to host a server on one client reachable by another. ([Apple Community: hotspot devices share one subnet](https://discussions.apple.com/thread/253403899); Android web-server-on-hotspot pattern in the B4X thread above.) **BUT** some hotspot configs apply **AP/client isolation** (blocks client↔client, host↔client still works) — a real, config-dependent risk. ([AP isolation explained](https://www.ruijie.com/en-global/support/tech-gallery/what-is-ap-isolation-how-does-it-work).) **→ Must wear/wire-test on the actual demo phone (already flagged in decision 11).** Mitigations, in order: (a) prefer an **Android** phone hotspot (reliably non-isolating in practice); (b) **isolation-proof variant:** USB-tether the phone to the laptop (laptop gets cellular internet, no WiFi isolation) and run the laptop's *own* WiFi AP that the ESP32 joins — then ESP32 is a client of the *laptop* (host↔client, isolation impossible) while internet still comes from cellular and event-WiFi is still avoided.

**Discovery — static IP on the 0.96" screen, not mDNS.** mDNS (`braille.local` via `ESPmDNS`/`MDNS.begin()`) is unreliable across clients — **Android does not resolve mDNS hostnames natively** — so the robust path is: ESP32 gets a DHCP lease, prints `WiFi.localIP()` to the 0.96" OLED at boot, and the operator types that IP into the app. This is exactly what `plan/idea.md` already specifies and it is correct. (mDNS/Android caveat: [RNT ESP32 mDNS](https://randomnerdtutorials.com/esp32-mdns-arduino/).) A static IP via `WiFi.config()` is risky on the phone's `/28` (collision with DHCP pool) — prefer DHCP + on-screen IP. ESP32 station APIs: `WiFi.mode(WIFI_STA)`, `WiFi.begin(ssid,pw)`, `WiFi.status()==WL_CONNECTED`, `WiFi.localIP()`. ([RNT ESP32 WiFi functions](https://randomnerdtutorials.com/esp32-useful-wi-fi-functions-arduino/).)

**Fallback — ESP32 as its own AP.** `WiFi.mode(WIFI_AP)` + `WiFi.softAP(ssid,pw)`, ESP32 at `192.168.4.1` (`WiFi.softAPIP()`), phone/laptop joins the ESP32. ([RNT ESP32 AP web server](https://randomnerdtutorials.com/esp32-access-point-ap-web-server/).) **Tradeoff — this kills the forward AI pipeline for a live demo:** joining the ESP32's AP gives the browser device **no internet**, so it cannot reach ElevenLabs/Anthropic; phones will also run captive-portal probes (`generate_204`, `hotspot-detect.html`) and may flag "no internet." ([ESPAsyncWebServer mobile/captive-portal issue #435](https://github.com/me-no-dev/ESPAsyncWebServer/issues/435).) Use AP-mode only as a *local-only* last resort (e.g. type text into a page served by the ESP32 → buzz it, no cloud AI). It is not a substitute for the phone-hotspot model on the forward path.

**HTTP contract shape (client ↔ ESP32, over the hotspot LAN):**

| Direction | Method + path | Body | Response |
|---|---|---|---|
| Forward (buzz keywords) | `POST http://<esp32-ip>/say` | `text/plain` = condensed A–Z keyword (e.g. `coffee`) | `200 {"ok":true,"chars":6}`; ESP32 enqueues and returns immediately, then buzzes |
| Replies (enter reply mode) | `POST http://<esp32-ip>/replies` | `text/plain`, 3 suggestions newline-separated | `200 {"ok":true}`; ESP32 plays "replies ready" cue, enters encoder scroll |
| Reply selection (pull) | `GET http://<esp32-ip>/choice` | — | `{"pending":true}` until pressed, then `{"pending":false,"index":1,"text":"just the bill thanks"}` — browser **polls** (~300 ms) because a browser can't be pushed to |
| Status / caption | `GET http://<esp32-ip>/status` | — | `{"ip":"172.20.10.4","state":"idle","last":"coffee"}` |

- **Use `text/plain` bodies** so the POST is a CORS "simple request" and skips preflight.
- **The ESP32 firmware must emit CORS headers** on every response: `Access-Control-Allow-Origin: *`, and answer `OPTIONS` with `204` + `Access-Control-Allow-Methods: GET,POST,OPTIONS` + `Access-Control-Allow-Headers: Content-Type` (needed the moment any request is non-simple, e.g. JSON). Without this the browser blocks reading the response even when the packet arrives. (Chrome Private Network Access does **not** add a preflight for a `localhost`→private-IP request — loopback is the most-private space — but the ordinary cross-origin CORS header is still required.)

### 5. Browser-security constraint + the deployment it forces (the big correction)

Two grounded MDN facts:

1. **`getUserMedia` needs a secure context.** Secure/"potentially trustworthy" origins are HTTPS **and** `http://localhost`, `http://127.0.0.1`, `http://*.localhost` ("considered to have been delivered securely because they are on the same device as the browser"). Powerful APIs (incl. media capture) are gated to secure contexts. ([MDN Secure Contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts).)
2. **An HTTPS page cannot fetch an HTTP IP-host URL.** `fetch`/`XHR` from HTTPS→HTTP is "blockable" mixed content and is **blocked**; loopback (`127.0.0.1`/`localhost`) HTTP is exempted (treated as secure); and crucially *"Mixed content requests that would otherwise be upgraded are blocked if the URL's host is an IP address rather than a domain name."* So `https://app → http://172.20.10.4/say` is **hard-blocked**. ([MDN Mixed content](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content).)

**Consequence:** a **phone** web app must be served over HTTPS (only way to get the mic on a phone) → it then **cannot** reach the ESP32's plain-HTTP IP. Giving the ESP32 a browser-trusted HTTPS cert for its LAN IP is not realistic in a 2-day build. The one origin that satisfies both mic capture and a same-scheme HTTP call to the ESP32 is **`http://localhost`**, which requires the server and browser on the same machine → a **laptop** running the app (e.g. `next dev` at `http://localhost:3000`), joined to the phone's hotspot.

**Recommended deployment (keeps every locked API/network decision intact):**
```
[ Laptop @ http://localhost:3000 ]  (browser + mic + Next.js server, keys in server env)
   |  getUserMedia  → record → POST /api/stt  ─┐
   |  /api/stt,/api/claude,/api/tts  ──────────┼──> HTTPS to ElevenLabs / Anthropic
   |                                            │     (server-side, over the phone's CELLULAR)
   |  fetch http://172.20.10.x/say  ────────────┘──> ESP32 (same-scheme http, allowed)
   |
   └── joined to ──▶ [ iPhone/Android Personal Hotspot ]  ◀── joined by ── [ ESP32-S3 client ]
                       (cellular uplink + LAN; no event-WiFi dependency)
```
- `http://localhost` = secure context → **mic works**.
- HTTP origin → HTTP ESP32 IP = same scheme → **no mixed content**.
- Browser→`/api/*` are same-origin → **no third-party CORS, keys never in the browser**; the server does the ElevenLabs/Anthropic calls over cellular (HTTP-page→HTTPS-API is allowed; only HTTPS→HTTP is blocked).
- The only deviation from the lock: **mic + browser live on a laptop on the hotspot**, not on the phone. Speaking into the laptop for a demo is clean and legitimate (same spirit as "mic on the phone, not the wearable").

### 6. Latency budget (does <~4 s hold?)

Forward path, speech-end → first buzz:

| Step | Estimate | Notes |
|---|---|---|
| Stop recording + assemble blob | ~50 ms | client-side |
| POST audio → `/api/stt` → ElevenLabs `scribe_v2` → back | **~0.5–1.5 s** | short clip, batch model, over cellular; dominant term |
| One Claude call (`claude-haiku-4-5`, small in/out) → back | **~0.4–1.0 s** | cleanup+condensation in a single call |
| POST keywords → ESP32 over hotspot LAN | ~20–50 ms | local |
| ESP32 begins first buzz | ~immediate | enqueue + return |
| **Total** | **≈ 1.0–2.7 s typical** | comfortably under ~4 s |

**Verdict: <~4 s is plausible but not guaranteed** — it is dominated by the two cloud round-trips over **cellular**, whose variance is the real risk (cold TLS connections, weak signal, event congestion). De-risk: keep clips short (press-to-talk), Haiku 4.5 + tiny `max_tokens` + JSON output, warm the API connections once at startup, and **measure on the day** (decision: target, not guarantee). Note the *perceived* end-to-end time is dominated later by **buzz duration**, not compute — see §7.

### 7. Message-length policy for the haptic stream

At the locked timing (3 beats/letter, ~400–500 ms buzz + ~300–450 ms inter-beat gap + ~700 ms+ inter-letter gap) a letter costs **~3.0–3.3 s**. So buzz time, not API latency, is what the user waits through:

- `bill` (4) ≈ 13 s · `coffee` (6) ≈ 19 s · a full sentence ≈ minutes (unusable).

**Policy:** the forward Claude call must condense to a **single 3–6 letter keyword** (occasionally two very short ones), **hard cap ~15 characters** (~48 s absolute worst case; aim for ≤ ~10 chars / ≤ ~30 s). This matches the grilling doc's "<~15 s buzz" intent (≈5 letters). Screen shows the full verbatim caption; the wrist gets the owned, condensed keyword ("feel the gist"). Enforce the cap on **both** sides — prompt Claude for ≤N chars **and** truncate on the ESP32 as a backstop. Numbers are spelled as words (locked alphabet A–Z, no number-sign), which the condensation makes natural.

### 8. Explicit MVP cut lines (software), in cut order

Cut top-down under time pressure; each cut still leaves a working **forward** demo:

1. **Cut first: TTS reply audio (`/api/tts`).** The spoken reply is the least essential to the "feel what was said" core. Show the chosen reply on-screen instead.
2. **Cut next: the whole reply loop** (reply-suggestion Claude call + encoder scroll/select + `/replies`,`/choice`). → forward-only MVP (idea.md scope-ladder rung 2); frees the encoder port too.
3. **Cut next: preference memory** (`memory.json` injection). Suggestions become generic; pipeline unaffected.
4. **Emergency only: the forward Claude call.** If Anthropic is down/slow, fall back to **client-side truncation** of the raw transcript (first word / first ~5 letters) → still buzzes something (loses the AI differentiator — last resort).

**Never cut (the winning demo):** `getUserMedia` → `/api/stt` (Scribe v2) → condensed keyword → `POST /say` → sequential buzz, with the verbatim caption on the 0.96" screen for judges.

---

## What changed vs `plan/idea.md`

- **"The phone app … talks to ElevenLabs and the Anthropic API" (from the browser) → route through server-side API routes.** ElevenLabs explicitly forbids exposing the key in browser code ([auth docs](https://elevenlabs.io/docs/api-reference/authentication)); Anthropic browser-CORS only works with the key-exposing "dangerous" header ([ref](https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access/)). Move all three (STT/Claude/TTS) behind `/api/*` on the same machine as the browser; keys stay in server env.
- **"Web app runs in the phone browser" + "HTTP request to the ESP32's local IP" → run the app at `http://localhost` on a laptop on the hotspot.** A phone app must be HTTPS to get the mic, and an HTTPS page cannot fetch the ESP32's HTTP IP (mixed content, [MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content)). Only `http://localhost` satisfies both. Mic + browser move to a laptop; the phone stays the hotspot + cellular uplink.
- **Network model consequence:** with the browser on a laptop client, the ESP32 hop becomes **client↔client** on the hotspot, which depends on the hotspot not applying client isolation — verify on the day; Android-hotspot or the USB-tether/laptop-AP variant removes the risk (§4).
- **Concrete model IDs added:** forward = `claude-haiku-4-5`, replies = `claude-sonnet-5`/`claude-haiku-4-5` (idea.md said only "Claude"). STT = `scribe_v2`; TTS = `eleven_flash_v2_5`/`eleven_multilingual_v2`.
- **Confirmed correct in idea.md:** show the ESP32 IP on the 0.96" screen (mDNS is unreliable, esp. Android); record-then-send STT; single forward Claude call for cleanup+condensation; JSON-file preference memory.

---

## Grounding notes

**Docs actually fetched / searched this track:**
- ElevenLabs STT convert reference (endpoint, `scribe_v2`, `file` field, limits); Authentication (no key in browser, single-use tokens); Models + "Meet Flash" (TTS latency). Plus in-repo `.claude/skills/{speech-to-text,text-to-speech}/SKILL.md`.
- Anthropic model IDs/pricing/CORS via the in-environment `claude-api` skill (cached 2026-06-24) + the `anthropic-dangerous-direct-browser-access` header (Simon Willison, 2024).
- MDN Secure Contexts + Mixed content (the load-bearing browser-security facts).
- ESP32: arduino-esp32 issue #2110 + ESP32/iPhone hotspot notes (2.4 GHz / Maximize Compatibility); RNT WiFi functions, mDNS, AP web server; ESPAsyncWebServer #435 (captive portal).
- Hotspot subnets: iPhone `172.20.10.0/28`; Android `192.168.43.1` + Android-11 octet randomization; AP-isolation reference; Apple TN3179 / support 102229 (iOS Local Network privacy).

**Date-sensitivity (verify at build time, APIs move):** ElevenLabs Scribe/TTS model IDs and latency figures; Anthropic model IDs + pricing (the `claude-api` table is a cached snapshot — re-check `client.models.list()` on the day); the `anthropic-dangerous-direct-browser-access` header name; iOS hotspot subnet (17+ may use `192.0.0.1`); Chrome Private Network Access rules. Latency numbers in §6 are **estimates to be measured on the actual phone/carrier**, not published SLAs.

---

## Residual risk

| Risk | Severity | Mitigation / route |
|---|---|---|
| Hotspot applies **client isolation** → laptop client can't reach ESP32 client | **High** | Verify on the day (decision 11); prefer Android hotspot; USB-tether + laptop-as-AP variant makes ESP32 a host↔client (isolation-proof) while keeping cellular |
| Deviation from "phone browser/mic" (now laptop `http://localhost`) surprises the demo narrative | Medium | It's the only in-browser way to get mic + ESP32-HTTP together; laptop mic is legitimate; phone still supplies hotspot + cellular |
| **<4 s not guaranteed** — two cloud round-trips over cellular | Medium | Haiku 4.5 + tiny `max_tokens`, short clips, warm connections, measure; buzz time (not compute) dominates perceived latency |
| iPhone hotspot on 5 GHz → ESP32 (2.4 GHz) can't join; SSID stops broadcasting when idle | Medium | Enable "Maximize Compatibility"; keep hotspot settings screen open; plain SSID name |
| Key exposure if the server-route/proxy pattern is skipped for a browser-embedded key | Medium | Use `/api/*` server routes; if embedding for a local demo, cap + rotate keys after event |
| ESP32 firmware missing CORS headers → browser blocks reads even when packets arrive | Medium | ESP32 sets `Access-Control-Allow-Origin: *` + handles `OPTIONS`; use `text/plain` bodies to avoid preflight |
| ElevenLabs/Anthropic **429** rate limits / credit exhaustion | Low (demo volume) | Retry-after handling; the credits (ElevenLabs + $100 Anthropic) cover demo scale |
| Android hotspot randomizes gateway/ESP32 subnet (Android 11+) | Low | Never hardcode the IP; always read it from the on-screen `WiFi.localIP()` |
| ESP32-AP fallback loses internet → forward AI pipeline dead | Info | AP-mode is local-only last resort, not a forward-path substitute |

---

## Downstream pointers

- Feeds Phase 2 plan: adopt the `http://localhost`-on-laptop deployment, `/api/{stt,claude,tts}` server routes, the ESP32 HTTP contract (§4) with CORS, and the model IDs (§1–3). Correct the two stale idea.md assumptions in "What changed."
- Feeds firmware plan (Track 3 boundary): ESP32 must run a WiFi-STA web server that (a) prints `WiFi.localIP()` to the 0.96" screen, (b) serves `/say`,`/replies`,`/choice`,`/status` with CORS headers, (c) enqueues-and-returns on `/say` so the HTTP response isn't blocked by the multi-second buzz.
- Confirms for Phase 2: message-length cap (§7) and MVP cut order (§8).
