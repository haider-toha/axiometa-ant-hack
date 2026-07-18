# 32 — Phase 4 Fix Log (orchestrator-applied)

**Date:** 2026-07-18
**Inputs:** Phase 3A braille adversarial review (`30-phase3a-braille-adversarial.md`) and Phase 3B API adversarial review (`31-phase3b-api-adversarial.md`).
**Result:** 1 FAIL applied, 0 remaining. All four verification gates re-run green on the first pass (no fix-loop iteration needed).

## 1. Braille table (Phase 3A) — nothing to fix

Phase 3A independently re-derived all 26 UEB letters from official sources (Wikipedia *English Braille*, cross-checked vs brailletranslators.com) and reported **0 letter FAILs, sequencer PASS, timing PASS, UNRESOLVED FAILS: 0**. Three-way agreement firmware ↔ TS mirror ↔ web standard. No firmware braille change was required — the single most safety-critical artefact passed context-clean independent derivation unchanged.

## 2. FAIL applied (Phase 3B check 4)

| Item | File | Old value | New value | Verification |
|---|---|---|---|---|
| Forward-relay write ordering (seq-as-signal) | `app/app/lib/redis.ts` `pushForward()` | `incr("seq")` **then** `mset({msg,verbatim,mode})` | `mset({msg,verbatim,mode})` **then** `incr("seq")` | `npm run build`=0, `npm run lint`=0, and the seq-gated forward path now writes the payload before the signal (matches `setSuggestions`, which was already correct) |

**Why it was a real FAIL (not a nit):** `seq` is the change-detection signal the ESP32 polls (`net.cpp`: `if (seq <= lastSeq) return false; lastSeq = seq`). With INCR-before-MSET, a `pull` snapshot landing between the two writes returns the **new seq with the stale `msg`**; the ESP32 buzzes the old keyword and advances `lastSeq`, so the real keyword — written under that same seq — is `<= lastSeq` on the next poll and is **silently dropped**. This is on the Rung-2 MVP forward path (the never-cut core). The misleading in-code comment ("checked adversarially") was also corrected. Root cause: the plan's own Task A2 snippet used INCR-first; it was propagated into the Phase 2B brief and caught here — exactly what the context-clean review is for.

## 3. WARNs — dispositions (Phase 3B check 8)

| WARN | Disposition | Reasoning |
|---|---|---|
| Unguarded `await req.json()` on 5 routes | **Accepted** | Malformed body throws → HTTP 500 with a clear stack, i.e. it *panics loudly* rather than failing silently, satisfying the "works or explicitly panics" rule. Every real caller (the phone client and the Phase-5 smoke curl) sends well-formed JSON, so it cannot affect the acceptance criteria. Left unhardened to avoid late churn across 5 files on a green build. |
| `/api/reply` text flows unsanitized into `memory` → later `/api/suggest` prompt | **Accepted** | The reply `text` is one of the AI-generated suggestions echoed back by the trusted ESP32; there is no sensitive data or privileged action gated on it, and this is a single-user hackathon demo. Prompt-injection surface is negligible in scope. |
| Non-atomic read-modify-write of `memory` | **Accepted** | Single-user device, one writer at a time; a lost update only drops one entry from a 10-item rolling bias list. No correctness impact on the demo. |
| Stored `verbatim` never read back via `/api/pull` | **Accepted** | Intentional: the full caption is shown on the phone from the `/api/condense` response client-side; the ESP32 only needs `msg` (the keyword). The stored `verbatim` is harmless retained state (useful for debugging / future features). |

## 4. Post-fix verification (all green)

| Gate | Command | Result |
|---|---|---|
| Web build | `cd app && npm run build` | exit 0 (`✓ Compiled successfully`, 8 dynamic API routes) |
| Web lint | `cd app && npm run lint` | exit 0 |
| Braille test | `cd app && npx vitest run app/lib/braille.test.ts` | 4/4 PASS |
| Firmware | `pio run -d firmware/braille_wearable` | `[SUCCESS]` (genesis_mini_offline, Flash 26.7%) |

**Unresolved FAILs after Phase 4: 0** (Phase 3A: 0; Phase 3B: 1 → fixed).
