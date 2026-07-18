# 33 — Phase 5 Deploy + Compile + Smoke Test

**Date:** 2026-07-18
**Result:** Live on Vercel production, firmware compiles to a binary, braille test passes, forward-relay smoke test green end-to-end against real Upstash Redis.

## 1. Vercel deployment

- **Project:** `haider-projects/app` (`projectId prj_Gs5p5sGKq3HYTVmSepXz2Jo4L1ss`)
- **Production URL (deployment):** https://app-r1i7atzs0-haider-projects.vercel.app
- **Production alias (stable):** **https://app-eight-lyart-98.vercel.app**
- **Deployment id:** `dpl_Es7bCoJcuTCV7cBng9Av5diBtcZS` · readyState `READY` · target `production`
- **Inspector:** https://vercel.com/haider-projects/app/Es7bCoJcuTCV7cBng9Av5diBtcZS
- **Deploy method:** linked from `app/` (`vercel link --yes`), then `vercel --prod --yes`. Because the Next.js root is the `app/` subdir, deploying *from inside* `app/` makes it the root — no `vercel.json` rootDirectory needed (Phase 1B finding).

### Environment variables (set in Vercel, Production scope, Encrypted — values never logged)
`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY` — injected via `vercel env add <NAME> production` piping values from the repo-root `.env` over stdin. Confirmed present via `vercel env ls production`. These are required at **build** time too (`Redis.fromEnv()` runs at module import), which is why the remote build succeeded.

## 2. Smoke test (curl against the live production URL)

```
1) GET  /api/pull                 -> {"seq":0,"mode":"idle","msg":"","replies":[]}          HTTP 200
2) POST /api/push {hello,hello world} -> {"seq":1}                                           HTTP 200
3) GET  /api/pull                 -> {"seq":1,"mode":"forward","msg":"hello","replies":[]}   HTTP 200
```

**Expected == actual:** after the push, `mode:"forward"`, `msg:"hello"`, and `seq` advanced 0→1. This also confirms the Phase 4 fix (MSET-before-INCR in `pushForward`) against the real Redis: the payload and the seq signal are consistent. The URL is public (no deployment-protection wall) so the ESP32 can poll it directly.

## 3. Firmware compile — final

```
pio run -d firmware/braille_wearable  ->  [SUCCESS]  (env genesis_mini_offline)
binary: firmware/braille_wearable/.pio/build/genesis_mini_offline/firmware.bin  (~893 KB; Flash 26.7%, RAM 14.2%)
```
Exit 0. `pio test -e native` (braille table) previously 7/7. Corrected pin map in `src/pins.h`: MOTOR_L=4, **MOTOR_R=9**, LCD 7/6/5, **ENC_BT=1, ENC_CL=17, ENC_DT=18**, BTN_REPEAT=45.

## 4. Braille table test — final

```
npx vitest run app/lib/braille.test.ts  ->  Test Files 1 passed (1) · Tests 4 passed (4)  · exit 0
```
Plus Phase 3A context-clean adversarial review: **0/26 letter FAILs**, sequencer PASS, timing PASS.

## 5. Residual risks / follow-ups

| # | Item | Note |
|---|---|---|
| 1 | Firmware compiled against the **cached offline env** (`espressif32@7.0.1` / Arduino core 2.0.17), not the modern pioarduino Arduino-3.x env | Both envs are in `platformio.ini` and compile the identical source. The offline env is `default_envs` so the gate is download-free and reproducible. To flash with Arduino 3.x, run `pio run -e genesis_mini` (first build downloads the pioarduino platform ~1 GB). |
| 2 | Firmware is **compile-verified only** — no physical board attached here | On-device: fill `src/secrets.h` (WIFI_SSID/WIFI_PASS, and `VERCEL_HOST = "app-eight-lyart-98.vercel.app"`), flash, then run the wear-test / acceptance (plan C1–C2). Motor/LCD/WiFi runtime behavior is untested against hardware. |
| 3 | Deployed API routes are **public + unauthenticated** and call the user's paid ElevenLabs/Anthropic keys | Fine for a demo, but anyone with the URL can invoke `/api/stt|condense|suggest|tts`. Consider a shared-secret header or Vercel deployment protection before sharing widely. |
| 4 | Env vars set for **Production scope only** | Preview/dev deploys would need the same vars added to those scopes. |
| 5 | Phase 3B WARNs accepted (unguarded `req.json()`, reply-text→prompt, non-atomic memory RMW, unused stored `verbatim`) | Documented in `32-phase4-fix-log.md`; demo-safe, hardening is optional. |
| 6 | Audit dir shared with a **concurrent CAD session** tonight | Same NN prefixes, distinct suffixes → no overwrites; my ten files use `-phaseNx-<topic>` suffixes. |

## 6. Verification criteria — status

- ✅ `pio run -d firmware/braille_wearable` exits 0 + produces `firmware.bin`
- ✅ `cd app && npm run build` exits 0, no type errors
- ✅ `cd app && npm run lint` exits 0
- ✅ `cd app && npx vitest run app/lib/braille.test.ts` all PASS
- ✅ Phase 3A braille adversarial: 0 unresolved FAILs
- ✅ Phase 3B API adversarial: 1 FAIL → fixed (0 unresolved)
- ✅ Vercel deployment URL exists; smoke curl returns valid JSON (`mode:"forward"`, `msg:"hello"`, seq advanced)
- ✅ `pins.h`: MOTOR_R=9, ENC_BT=1, ENC_CL=17, ENC_DT=18
- ✅ Audit files 24–33 exist and are non-empty
