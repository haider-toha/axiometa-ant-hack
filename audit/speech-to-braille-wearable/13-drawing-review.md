# 13 — Drawing Review (adversarial verification of the enclosure concept drawing)

**Type:** Phase 3 verification track (adversarial review of the 2D concept drawing).
**Date:** 2026-07-17
**Constraint honoured:** VERIFICATION ONLY. No files modified. Every judgement below traces to
`03-track-3-parts-truth.md` §6, `07-geometry-physical-coherence.md` §4–6, or
`12-print-logistics-straps.md`. No dimension invented.

**Artifacts reviewed:**
- Source: `cad/braille_wearable_drawing.py` (parameters + `gen_dxf()` geometry).
- Render: `renders/braille_technical_drawing.png` (VIEW 1 outer face, VIEW 2 side cross-section,
  VIEW 3 underside/skin plate, plus BOM/notes block).

---

## Scope

Check every dimension and every physical claim on the drawing against the ground-truth audit
files. Confirm that: (a) each numeric value matches its source or is correctly tagged
approx/UNKNOWN; (b) the five genuinely-UNKNOWN items are flagged and not presented as measured
fact; (c) the physics is right (4 modules on ONE outer face, worn component-side-out, motors
facing OUT, coupling through a SOLID rigid skin plate — not a soft membrane, not skin-side
motors); (d) nothing a CAD modeller needs is missing; (e) no invented number, contradiction, or
mislabel.

---

## Dimension-by-dimension check (source vs drawing)

| # | Item | Source (03 §6 / 07 §6 / 12) | Drawing (param + label/geometry) | Verdict |
|---|---|---|---|---|
| 1 | Board outline | 55.0 × 55.0 mm, HIGH | `BOARD=55`; "55 board" dim; BOM "55 x 55" | ✅ MATCH |
| 2 | Board thickness | ~1.6 mm, MED **[approx]** | `BOARD_T=1.6` (comment "approx"); BOM "…x 1.6" (no ~); also listed in UNKNOWN-measure note | ⚠️ OK but BOM states 1.6 as if fact while note says "measure board thickness" — tag it approx |
| 3 | Module footprint (ERM, encoder) | 22 × 22 mm, HIGH | `MOD=22`; "22 module" dim; 22×22 rects | ✅ MATCH |
| 4 | **LCD module footprint** | **22 × 29 mm, HIGH** | Label "LCD 0.96\" 22x29" + BOM "22 x 29" **but geometry drawn 22×22** (`crect(cx,cy,MOD,MOD)`, line 106). `LCD_H=29` is defined and **never used** | ❌ **GEOMETRY WRONG** — label/BOM correct, drawn box is 22×22 not 22×29 |
| 5 | LCD glass | 13.5 × 27.9 mm, HIGH | BOM "glass 13.5 x 27.9" ✅; **screen glyph drawn 14 × 7** (line 112) — matches neither glass (13.5×27.9) nor active (10.8×21.7), and is landscape where the real glass is portrait | ⚠️ BOM correct; drawn screen glyph unsourced/mis-proportioned |
| 6 | LCD active area | 10.8 × 21.7 mm, HIGH | not stated on drawing | ⚠️ omitted (screen-window size a CAD modeller needs) |
| 7 | Socket standoff (module proud of board) | ~8.6 mm, MED **[approx]** | `STANDOFF=8.6`; label renders **"9 standoff"** (`:.0f` rounds 8.6→9), no "~"/approx tag | ⚠️ value fine (8–9 mm range) but displayed as bare "9", overstating precision on an UNKNOWN-precise item |
| 8 | ERM coin protrusion | ~3.5–4 (~3.6) mm, MED **[approx]** | `COIN_PROUD=3.6`; BOM "~3.6 proud" | ✅ MATCH (approx, correctly ~-tagged) |
| 9 | ERM coin diameter | **UNKNOWN** (visually ~10) | `COIN_D=10` (comment "exact UNKNOWN"); BOM "coin ~10 dia"; listed in UNKNOWN-measure note | ✅ correctly flagged UNKNOWN/approx |
| 10 | Encoder shaft proud (tallest) | ~20.4 mm, MED-HIGH | `KNOB_PROUD=20`; "knob (TALLEST)"; BOM "knob ~20 proud = TALLEST" | ✅ MATCH (approx) |
| 11 | Encoder knob diameter | not in sources | `KNOB_D=12` drawn, **not dimensioned/labelled** | ⚠️ unsourced but not presented as fact (acceptable placeholder) |
| 12 | Derived outer stack height | knob top ~30 mm above board; total device taller | "~35 total (approx)" (= plate3 + board1.6 + standoff8.6 + PCB1.6 + knob20 = 34.8) | ✅ consistent & correctly tagged approx |
| 13 | Lug / strap width | 22.0 mm, 12 (frozen) | `LUG_GAP=22`; "22 strap"; BOM "22 mm lugs" | ✅ MATCH |
| 14 | Lug pin bore | printed Ø2.5 pin thru Ø2.6 bore; bought Ø1.9, 12 | `PIN_D=2.6`; note "Ø2.5 pin … Ø1.9 spring-bar bore" | ✅ MATCH (both paths correctly stated) |
| 15 | Cage (head) envelope | ~60–65 mm sq, 12 | `CAGE=62`; "62 cage (approx)" | ✅ MATCH (approx) |
| 16 | Cage wall | 2–3 mm (07); design | `WALL=2.5`; **not dimensioned on drawing** | ⚠️ value fine; not called out (derivable from 62−55) |
| 17 | Skin-plate thickness | design choice (07: "solid, rigid, not foam") | `PLATE_T=3.0`; "3 plate"; VIEW 3 "SOLID rigid skin plate" | ✅ reasonable design value, labelled |
| 18 | Board mounting holes | 4× Ø2.7, corners; **XY UNKNOWN** | drawn 4× Ø2.7 at ±(BOARD/2−5)=±22.5; Ø not labelled; XY in UNKNOWN-measure note | ⚠️ hole Ø correct; XY approx but drawn at a definite spot (only flagged in the note, not at the feature) |
| 19 | Board −Z (skin-side) envelope | bulk ~4 mm (ESP-S3 module + passives), 07 §6 | **absent** — VIEW 2 seats the board flush on the plate | ❌ MISSING (see Missing/needed §5) |
| 20 | AX22 port centres + 2×5 pitch | **UNKNOWN** | magenta note VIEW 1 "positions APPROX — measure AX22 socket centres & pitch"; BOM "AX22 socket centres + 2x5 pitch" | ✅ correctly flagged UNKNOWN |
| 21 | USB-C edge offset | **UNKNOWN** | magenta "USB-C (edge — offset UNKNOWN)"; in UNKNOWN-measure note | ✅ correctly flagged UNKNOWN |

**Net:** every load-bearing NUMBER either matches its source or is correctly tagged
approx/UNKNOWN. The one hard defect is a **geometry/label mismatch** (row 4: the LCD is drawn
22×22 while both its own label and the BOM say 22×29). Rows 2, 5, 7, 16, 18 are minor
precision/labelling nits. Row 19 is a completeness gap, not a wrong number.

### UNKNOWN-item audit (the five that must NOT read as measured fact)

| UNKNOWN (per 03 §9 / 07 §6) | On the drawing | Flagged correctly? |
|---|---|---|
| AX22 socket centres + 2×5 pitch | magenta note in VIEW 1 + BOM UNKNOWN list | ✅ Yes |
| Mounting-hole XY | BOM UNKNOWN list only (feature itself drawn at a definite ±22.5) | ⚠️ Listed, but the plan holes look placed |
| USB-C edge offset | magenta label + BOM UNKNOWN list | ✅ Yes |
| Board thickness | BOM UNKNOWN list — but BOM header also prints "…x 1.6" un-tagged | ⚠️ Mild self-contradiction |
| Coin diameter | "~10 dia" + BOM UNKNOWN list | ✅ Yes |

Three of five are cleanly flagged; two (mounting-hole XY, board thickness) are named in the
UNKNOWN note yet also drawn/printed with a definite-looking value elsewhere. No UNKNOWN is
presented purely as hard measured fact.

---

## Physical-correctness check (the part most concept drawings get wrong — this one gets right)

| Required by 07 | On the drawing | Verdict |
|---|---|---|
| All 4 modules on **ONE** (+Z) outer face; no module on the skin face | VIEW 1 shows all 4 (2× ERM, LCD, encoder) in a central 2×2 cluster on the OUTER face; VIEW 3 underside is a bare plate "NO components NO holes" | ✅ Correct |
| Worn **component-side-OUT** (State A) | VIEW 1 title "OUTER FACE (faces away from wrist)"; VIEW 2 "OUTER / VIEWING SIDE (up)", "WRIST … strap holds plate firmly"; BOM "outer face up, plate against top of wrist" | ✅ Correct |
| ERM coin **faces OUT** (away from wrist), not reversible | VIEW 2 "ERM coin (faces OUT)", coin drawn on the up/outer side of the module | ✅ Correct |
| Motors on the two **most-separated diagonal** ports | plan places MOTOR A at (−13,+13) and MOTOR B at (+13,−13) — diagonal; BOM "on DIAGONAL ports" | ✅ Correct |
| Coupling by whole-chassis conduction into a **SOLID rigid skin plate**, strapped firmly | VIEW 2 vibration-path arrow coin→stack→plate→wrist; VIEW 3 "SOLID rigid skin plate"; `PLATE_T=3` solid | ✅ Correct |
| **NOT** a soft membrane (a membrane would damp it) | Explicit: "a closed plate TRANSMITS it; a soft membrane would DAMP it" (VIEW 2 + BOM) | ✅ Correct — and it calls out the exact 07 §4 trap |
| **NOT** skin-side motors (the Concept-3 error) | Motors are on +Z; underside is bare plate | ✅ Correct — the physically-impossible arrangement is avoided |
| Rigid capture of each motor (not via compliant header pins) | Standoff posts drawn; BOM "Rigidly clamp each motor module to the plate" | ✅ Intent correct (wording "to the plate" is loose — capture is to the cage/stack, but the meaning is right) |
| Encoder is tallest; knob access on +Z | VIEW 2 knob is the tallest element on the up side | ✅ Correct |

**Physics verdict: fully correct.** The drawing faithfully encodes 07's corrected arrangement and
even reproduces 07's non-obvious caveats (rigid plate transmits / soft membrane damps; motors out,
not skin-side). This is the hard part and it is right.

**One representational nit (not a physics error):** VIEW 2 is a *schematic* section, not a true
projected section — it shows a coin at x=−P and the knob at x=+P, but in the plan the encoder
(knob) sits at x=−P (bottom-left) and x=+P has the LCD + a coin. No section line is drawn in
VIEW 1. Fine as an illustrative stack-up; wrong if read as a literal cut. Add a section line or
label it "representative section."

---

## Missing / needed items (what a CAD modeller still can't get from this sheet)

1. **Board −Z envelope (~4 mm).** 07 §6: the skin-side face carries the ESP32-S3-MINI-1 module +
   passives, bulk to ~4 mm below the PCB. VIEW 2 seats the board **flush** on the 3 mm plate — so
   the board can't actually sit there without a ~4 mm standoff/recess. This changes the stack-up
   and the true device thickness. **Add the −Z gap** (or a recess in the plate) and note "confirm
   −Z content."
2. **True LCD footprint in geometry (22×29)** and **screen-window size** (glass 13.5×27.9 / active
   10.8×21.7). Currently the LCD is a 22×22 box with a 14×7 glyph — a CAD import would be wrong on
   both the module outline and the screen cut-out. (See fix #1.) Note the 29 mm-tall LCD nearly
   fills the board half-width at the current cluster pitch — a real fit check the 22×22 stand-in
   hides.
3. **Wall thickness callout.** `WALL=2.5` exists but is not dimensioned; add a "2.5 wall" note.
4. **Mounting-hole Ø + the fact that XY is UNKNOWN at the feature.** Holes are drawn at a definite
   ±22.5 with no Ø label; add "4× Ø2.7 — XY UNKNOWN, measure."
5. **LCD active-area / glass window depth** (panel ~2–3 mm proud) — not shown in the section
   (LCD isn't in the cut). Minor.

Present and adequate: overall XY envelope ("62 cage"), overall height ("~35 total"), plate
thickness ("3 plate"), strap interface (22 mm lugs + both pin/bore options), and the full
UNKNOWN-to-measure checklist in the notes.

---

## Score + verdict

**Score: 8.5 / 10.**
**Verdict: MINOR-FIX** (not SHIP; nowhere near REDO).

Rationale: the physics — the thing this class of drawing usually gets wrong — is **entirely
correct** (motors out, one face, solid rigid plate, no membrane, worn component-out, diagonal
ports, encoder tallest). Every numeric value matches its source or is correctly tagged
approx/UNKNOWN, and the five genuine UNKNOWNs are named. It is held back from SHIP by one real
geometry/label contradiction (LCD drawn 22×22 while labelled/BOM'd 22×29 — a HIGH-confidence
sourced dimension mis-drawn, with `LCD_H=29` defined but unused) and one completeness gap (the
~4 mm board −Z envelope, so the board floats/flush-seats incorrectly on the plate), plus a few
precision-labelling nits. None are physics errors, invented facts, or mis-flagged UNKNOWNs, so a
REDO is unwarranted.

### Exact fixes (do these, then it SHIPs)

1. **Draw the LCD at its true footprint.** In the VIEW-1 module loop, special-case the screen so
   the LCD box is 22 × 29 (use the already-defined `LCD_H`), e.g. draw `crect(cx, cy_lcd, MOD,
   LCD_H, "MODULE")`, and size the screen glyph to the glass **13.5 × 27.9** (or active
   10.8 × 21.7), portrait — not 14 × 7. Re-check that the 29 mm-tall LCD still fits the cluster/
   board at the chosen (approx) pitch. *(Fixes rows 4–6; retires the LCD_H dead parameter.)*
2. **Show the board −Z envelope.** In VIEW 2 insert a ~4 mm gap (or plate recess) between the
   board underside and the plate, labelled "−Z: ESP-S3 module + passives ~4 mm (UNKNOWN, measure)".
   Update "~35 total" accordingly (adds ~4 mm). *(Fixes row 19 / missing #1.)*
3. **Stop over-stating the standoff precision.** Change the "9 standoff" label to "~8.6 standoff
   (approx)" — either widen the format or hard-code the tilde — since 8.6 is UNKNOWN-precise.
   *(Row 7.)*
4. **Tag the two half-flagged UNKNOWNs at the feature.** Add "(approx — 1.6 UNKNOWN, measure)" to
   the BOM board-thickness line, and "4× Ø2.7 — XY UNKNOWN" next to the plan mounting holes.
   *(Rows 2, 18; UNKNOWN-audit.)*
5. **Dimension the wall** ("2.5 wall") and **label VIEW 2 as a representative section** (or draw a
   section line in VIEW 1, and correct the knob to the −P column if a true section is intended).
   *(Row 16 / physics nit.)*

**Bottom line:** physically correct and dimensionally faithful; one mis-drawn LCD footprint and a
missing 4 mm underside envelope keep it at MINOR-FIX. Apply fixes 1–2 (substantive) and 3–5
(polish) and it is SHIP-ready as a Fusion-import concept sheet.
