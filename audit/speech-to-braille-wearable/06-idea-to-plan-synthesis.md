# 06 — Idea-to-Plan Synthesis (Consolidated Orchestrator Report)

**Type:** Consolidated Phase 2 report — points to every track file, the plan, and the residual-risk register.
**Date:** 2026-07-17
**Orchestrator:** grilling (`/grill-me`) → 4 parallel research tracks → synthesis → executable plan → CAD design-spec.

---

## Scope

Turn `plan/idea.md` (a polished but internally under-locked hackathon handover) into an airtight,
executable build plan + CAD design-spec for a **generalized** Braille-literate-deafblind two-way
communication wearable — every blocking decision either locked with cited evidence or given a
demo-safe default. This report consolidates the whole chain and is the re-entry point for any later
agent or human.

## Artefact map (all on disk, re-readable)

| # | File | What it is |
|---|---|---|
| 00 | `audit/speech-to-braille-wearable/00-grilling-locked-decisions.md` | The 12 decisions the human locked live in the grilling, + the 4 holes not in idea.md's own list |
| 01 | `…/01-track-1-problem-prior-art.md` | Problem, prior art, competitive matrix, pitch-honest novelty (cited) |
| 02 | `…/02-track-2-encoding-body-site.md` | Encoding scheme ranking, timing constants, body-site + spacing science, 9-item wear-test (cited) |
| 03 | `…/03-track-3-parts-truth.md` | BOM, port map, pin map, electrical budget, CAD geometry + unknowns (parts-corpus-sourced) |
| 04 | `…/04-track-4-stack-network-apis.md` | STT/TTS/Claude models, CORS/proxy, network model, HTTP contract, latency, MVP cut lines (cited) |
| 05 | `…/05-form-factor-cad-design-spec.md` | Form-factor decision + CAD brief + image-gen prompt pack |
| 06 | **this file** | Consolidated synthesis |
| — | **`plan/2026-07-17-speech-to-braille-wearable.md`** | **The executable plan** (writing-plans structure, checkbox tasks) |
| — | `plan/idea.md` | Updated with a LOCKED-DECISIONS block superseding stale parts |
| — | *— extended CAD/design phase (post-synthesis) —* | |
| 07 | `…/07-geometry-physical-coherence.md` | All modules on ONE outer face; worn component-out; motors couple through a solid rigid plate |
| 08 | `…/08-fusion360-claude-workflow.md` | Fusion 360 ↔ Claude pipeline (official + community MCP, Python-script path) |
| 09 | `…/09-render-faithfulness-audit.md` | Adversarial audit of the concept renders + the faithful render spec |
| 10 | `…/10-printed-strap-linkage.md` | Fully-printed no-magnet PLA strap (segmented pin-hinge band + buckle) |
| 11 | `…/11-render-review-v2.md` | Review of the gray render (88/100 SHIP) |
| 12 | `…/12-print-logistics-straps.md` | Bambu bed sizes, fit, 22 mm lug spec, print-vs-buy strap |
| 13 | `…/13-drawing-review.md` | Review of the technical drawing (fixes applied) |
| — | `cad/braille_wearable_drawing.py` + `.dxf` | Dimensioned 2D technical drawing (Fusion-importable) |
| — | `renders/` | All concept images + the technical-drawing PNG |

## Verdicts / evidence (the locked decision set, with what grounded each)

**Product mechanics**
- **Encoding = Columns × 3 row-beats + micro-stagger on both-fire rows.** Grilling locked the column
  scheme; Track 2 confirmed the "93% vs 26%" study (Yeganeh 2024, DOI 10.3390/app14010043) was a
  *tight-grid* result that does **not** apply to two far-apart motors (the grilling's non-sequitur flag
  = confirmed), *and* found ~18/26 letters fire both motors in one beat → added the micro-stagger fix.
- **Timing:** buzz 400 / inter-beat 300 / inter-letter 800 / inter-word 1500 ms → ~3.4–4.4 wpm (Track 2 §3).
- **Throughput:** buzz Claude-condensed keyword only, ≤15 chars (Track 2 §3 + Track 4 §7 independently).
- **Alphabet:** A–Z + gaps; numbers spelled out (Track 2 §4).

**Two-way loop**
- In-scope as **stretch**; forward path is the committed MVP. Suggestions on screen + encoder scroll,
  **buzz only the highlighted one**, only the chosen reply spoken (grilling — fixed the "deafblind
  user can't see the screen" contradiction).

**Form factor** *(final reality below in the Extended CAD phase; the ~70–90 mm target was overtaken by the no-extensions decision)*
- Wristband confirmed (Track 2 §5). Board on-wrist, USB-tethered (grilling #8), worn **component-side-OUT**
  (all 4 modules on one face — file `07`). Motors stay **in the central cluster on diagonal ports** (close;
  no extensions) and couple to the wrist by **whole-chassis conduction into a solid rigid skin plate**;
  left/right leans on time (micro-stagger + strict-sequential), the screen is ground truth.

**Acceptance & pitch**
- Success = **pattern-matches-screen** against a Braille chart, no trained reader (grilling #9).
- Pitch = **"feel the gist"**; novelty = **LLM-suggested-reply loop**; never claim world-first /
  minimal-training (Track 1 §D — the field is crowded: BrailleBand, UbiBraille, Pérez-Aguirre 2024,
  HaptiBraille, BrailleGPT).

**Software & network**
- Phone browser + **Vercel HTTPS** app (mic works; keys in `/api/*`); **ESP32 polls Vercel** via an
  **Upstash Redis** relay — no direct phone↔ESP32 link, so mixed-content and client-isolation both
  vanish. Models: `scribe_v2` / `claude-haiku-4-5` / `claude-sonnet-5` / `eleven_flash_v2_5` (Track 4).

**Hardware**
- 4 ports (schematic-confirmed); 3 GPIO + SPI + I²C per port; motors on dedicated GPIO (I²C unused);
  encoder fits one port; 90 mA/motor; ≥1 A USB source; onboard GPIO45 for repeat (Track 3).

## Cross-track contradictions resolved (the synthesis' real work)

1. **Motor spacing: Track 1's ≥8 cm (Shah 2019) vs the locked ~40–50 mm.** Resolved by Track 2:
   keep thumb/pinky transverse, **grow to ~70–90 mm surface path via opposite aspects**, and
   **micro-stagger both-fire rows** so the marginal spacing stops being load-bearing. Gated by the
   day-of wear test (plan C2 Step 1). Not a re-litigation — a refinement inside the lock.
2. **App-host: "phone browser" lock vs Track 4's mic/mixed-content blocker.** Put to the human as an
   explicit decision; they chose **Vercel**. Synthesised to **phone-browser-on-Vercel + ESP32-polls-
   cloud**, which *preserves* the phone-host lock and is cleaner than Track 4's own laptop-localhost rec.
3. **Motor placement vs the central port cluster (surfaced in Phase 3).** Directly-snapped motors are
   ~1 pitch apart — far below the ideal separation. **Builder decision: no extensions, no extra parts**,
   so the motors stay in-cluster on the two most-separated diagonal ports; the design leans on the
   micro-stagger + strict-sequential fallback + on-screen caption. Remote-mounting would have helped but
   is off the table. This is an accepted limitation, not an open item.

## What changed vs `plan/idea.md`

Encoding specified (was open) · throughput policy added (was absent) · network re-architected to a
cloud relay (direct link was infeasible) · reply loop made feasible (was "feel every suggestion") ·
acceptance made falsifiable · pitch corrected (drop "minimal training"/"proven"/"novel", scope to
Braille-literate) · per-port GPIO corrected (3 not 1; motors use GPIO not I²C) · motor-arrival risk
retired · spacing grown 40→70–90 mm · a new motor-mounting constraint surfaced. `idea.md` now carries
a LOCKED-DECISIONS banner capturing these.

## Extended CAD/design phase (files 07–13, + `cad/` drawing + `renders/`)

After the plan, a design deepening resolved the enclosure / render / print questions:
- **07 — Physical coherence:** confirmed (3 ways) that **all 4 modules mount on ONE outer face**; the
  device is worn **component-side-OUT**; the motors face out and reach the wrist by **whole-chassis
  conduction into a SOLID RIGID skin plate** (a soft membrane would damp it — corrected in `05`). The
  earlier "motors on the skin side" concept was physically impossible; the exposed-cage look was corrected.
- **08 — Fusion 360 × Claude:** an **official Autodesk Fusion MCP** exists (+ community ones). Recommended
  path = Claude writes a Fusion Python script → Run in *Scripts & Add-Ins* → parametric model → STL →
  Bambu. Local build123d `cad` skill (STEP) is the fallback. Fusion API is in **cm** (mm→cm needed).
- **09 / 11 / 13 — Adversarial render + drawing reviews:** first renders were unfaithful (green, hidden
  modular architecture, chrome pucks); regenerated a faithful **gray GPT-Image-2** render (`11`: 88/100);
  the technical drawing passed at 8.5/10 with fixes applied (`13`).
- **10 — Strap:** fully-printed **segmented pin-hinge band** (PLA, no magnets) or a bought **22 mm
  quick-release** strap; **22 mm lugs**; printed Ø2.5 mm captive cross-pin. One-piece flexible PLA = no-go.
- **12 — Print logistics:** fits any Bambu (256 std prints head + whole band; 180 mini needs the band split).
- **Deliverable:** `cad/braille_wearable_drawing.py` → `.dxf` — a dimensioned 3-view technical drawing
  (Fusion-importable) with every unmeasured dimension flagged; concept + faithful renders in `renders/`.

**Still-open (day-of):** the CAD-critical dims (AX22 socket centres + 2×5 pitch, mounting-hole XY, USB-C
offset, board thickness, coin diameter) remain **UNKNOWN** — measure with calipers before finalising the
model. The both-fire percept at the close in-cluster spacing is the top build risk (wear-test gate).

## Grounding notes

- Research tracks 1, 2, 4 cite **primary sources** (DOIs/arXiv/official docs, listed in each file);
  Track 3 is **parts-corpus-sourced** (schematic, datasheets, STEP) with one web citation (TI buck rating).
- Known citation gaps flagged in the files: some MDPI/ACM full texts 403'd (Track 2 marked those
  figures [secondary]); the non-sequitur ruling does not depend on any blocked value. API model IDs
  are date-sensitive (Track 4) — re-verify on the day.
- No part dimensions, ports, or electrical values were invented anywhere; unknowns are marked UNKNOWN.

## Consolidated residual-risk register

| Risk | Severity | Owner / gate |
|---|---|---|
| Both-fire "both vs one" percept at achievable wrist spacing | **High** | Wear-test (plan C2 Step 1); micro-stagger; strict-sequential fallback |
| Motor separation below ideal — in-cluster only, no extensions (builder decision, accepted) | **High (accepted)** | Micro-stagger + strict-sequential fallback + on-screen caption; wear-test picks the mode |
| All CAD-critical dims UNKNOWN (port centres/pitch, hole XY, heights, USB-C offset) | **High** | Measure day-of (Track 3 §9); CAD stays parametric until then |
| Hotspot 2.4 GHz / "Maximize Compatibility" on iPhone; ESP32 needs outbound internet | Med | Plan Global Constraints; fallback ladder |
| <4 s latency not guaranteed (two cloud round-trips over cellular) | Med | Haiku + small tokens + short clips; measure; buzz time dominates anyway |
| Novelty is thin / field is crowded | Med | Lead with the reply-loop framing; never claim a first (Track 1) |
| ERM inrush / bare-port power margin | Low | ≥1 A USB bank (Track 3 §5) |

## Bottom line

Every blocking decision from `idea.md`'s open questions — plus four holes it never listed (network
model, throughput reality, reply-loop feasibility, falsifiable acceptance) — is now locked with cited
evidence or a named demo default. A zero-context builder can execute
`plan/2026-07-17-speech-to-braille-wearable.md` in a two-day hackathon, with the forward speech→Braille
demo as the guaranteed win and the reply loop as a clean stretch. The two things that genuinely cannot
be settled from a desk — the both-fire percept at real wrist spacing, and the exact enclosure geometry
— are correctly routed to a day-of wear test and calipers, with fallbacks specified for each.
