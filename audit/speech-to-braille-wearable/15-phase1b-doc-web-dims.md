# 15 — Phase 1B: Doc + Web Dimension Groundwork (Track B)

**Type:** Phase 1 / Track B deliverable — a single sourced dimension table for the CAD phase.
**Date:** 2026-07-17
**Scope:** Build one authoritative dimension table for the wrist-worn braille wearable from
(a) the existing audit corpus (`00`–`13`) + the `parts/` corpus, and (b) current web sources.
Also confirm the Fusion 360 Python API unit convention and the enclosure-relevant API patterns.
**Method (evidence-before-conclusions, per `systematic-debugging` SKILL):** every value below carries
a source (file path + section, or a URL). **Nothing is invented.** Where corpus and web disagree, the
disagreement is **recorded as a conflict**, not silently merged. STEP files were **NOT** opened here
(that is another track's job) — heights tagged `[approx]` are quoted from the other tracks' point-cloud
parses, not re-derived.

Confidence tags: **HIGH** = stated verbatim in the parts corpus / a datasheet; **MED** = point-cloud
`[approx]` estimate from `03`/`07`; **UNKNOWN** = not sourceable without a CAD-kernel load or calipers.

---

## Table A — Corpus dimensions (dim | value mm | confidence | source file §)

### A.1 Genesis Mini host board (AXMT-MTX0013)

| Dim | Value | Conf | Source |
|---|---|---|---|
| Board PCB outline | **55.0 × 55.0 mm** square, 4-layer | HIGH | `parts/…/axiometa-genesis-mini/CONTENT.md` "55 mm × 55 mm square 4-layer PCB"; `03` §6; `07` §6 |
| Board mounting holes | **4× ⌀2.7 mm**, near corners | HIGH (count) | `axiometa-genesis-mini/CONTENT.md` "4× ⌀2.7 mm Mounting Holes"; `03` §6 |
| Board mounting-hole XY | **UNKNOWN** | UNKNOWN | `03` §6/§9 R2; `07` §6 — measure |
| Board PCB thickness | **~1.6 mm** | MED [approx] | `03` §6 (STEP dense planes); `07` §6; `13` row 2 — corpus states "4-layer," no thickness |
| AX22 ports | **4 ports**, 2×5 socket, **central 2×2 cluster**, silk 1–4, facing **+Z** | HIGH (layout) | `03` §2/§6 (schematic U1–U4 + `IMG_6063`); `07` §1/§6 |
| AX22 socket standoff above PCB | **~8.6 mm** (range 8–9) | MED [approx] | `07` §6 (Zmax +10.25 − 1.6 PCB); `03` §6; `13` row 7 (`STANDOFF=8.6`) |
| AX22 port centres (×4) + 2×5 pitch | **UNKNOWN** (pitch 2.0 vs 2.54 mm) | UNKNOWN | `03` §6/§9 R1; `07` §6; `13` row 20 |
| Board −Z (skin-side) envelope | bulk **~4 mm** (ESP-S3 module + passives); sparse to ~10 mm | LOW [approx] | `07` §6; `13` row 19/§5.1 (ESP-S3 + passives ~4 mm) |
| USB-C port | on one **board edge**, mid-mount; edge offset **UNKNOWN** | HIGH (face) / UNKNOWN (offset) | `07` §3/§6; `03` §6; `13` row 21 |

### A.2 Vibration Motor / ERM module (AX22-0013), ×2

| Dim | Value | Conf | Source |
|---|---|---|---|
| ERM module PCB | **22 × 22 mm** square | HIGH | `parts/Vibration Motor (ERM)/…/CONTENT.md` "22 mm × 22 mm square"; `03` §6 |
| ERM mounting holes | **4× ⌀2.7 mm** | HIGH | ERM `CONTENT.md` "4× ⌀2.7 mm Mounting Holes" |
| ERM coin protrusion above its PCB | **~3.5–4 mm** (parse core ≈ 3.6) | MED [approx] | `03` §6; `07` §6; `13` row 8 (`COIN_PROUD=3.6`); `09` §row2 |
| ERM coin diameter | **UNKNOWN** (visually ~10 mm) | UNKNOWN (corpus) → see Table B | `03` §6; `07` §6; `13` row 9 — "confirm via LCSC C2759984" |
| ERM header-pin protrusion below PCB | **~3 mm** | MED [approx] | `03` §6; `07` §6 (Zmin ≈ −3) |
| ERM motor electrical | 3 V nominal, 90 mA, ≈12000 rpm | HIGH (corpus) → conflict in Table B | ERM `CONTENT.md` "3 V nominal, 90 mA, ≈ 12000 rpm" |

### A.3 IPS LCD 0.96" module (AX22-0034), ×1

| Dim | Value | Conf | Source |
|---|---|---|---|
| LCD module PCB | **22 × 29 mm** | HIGH | `parts/…/ips-lcd-0-96/CONTENT.md` "22 mm × 29 mm PCB"; `03` §6; `07` §6 |
| LCD mounting holes | **4× ⌀2.7 mm** | HIGH | LCD `CONTENT.md` "4× ⌀2.7 mm Mounting Holes" |
| LCD glass size | **13.5 × 27.9 mm** | HIGH | LCD `CONTENT.md` "glass size 13.5 × 27.9 mm"; `03` §6 |
| LCD active area | **10.8 × 21.7 mm** | HIGH | LCD `CONTENT.md` "Active area: 10.8 × 21.7 mm"; `03` §6 |
| LCD resolution | 160 × 80 px IPS, ≈400 cd/m² | HIGH | LCD `CONTENT.md`; ST7735S driver, 4-wire SPI |
| LCD panel height above its PCB | **~2–3 mm** (Track 3 said 2–4) | MED [approx] | `07` §6; `03` §6; `13` rows 5–6 |
| LCD panel | Newvisio N096-1608TBBIG11-H13, ST7735S | HIGH | LCD `CONTENT.md` description |

### A.4 Rotary Encoder module (AX22-0003), ×1

| Dim | Value | Conf | Source |
|---|---|---|---|
| Encoder module PCB | **22 × 22 mm** square | HIGH | `parts/…/rotary-encoder/CONTENT.md` "22 mm × 22 mm square"; `03` §6 (STEP 22.0×22.4) |
| Encoder mounting holes | **4× ⌀2.7 mm** | HIGH | Encoder `CONTENT.md` "4× ⌀2.7 mm Mounting Holes" |
| Encoder shaft height above its PCB | **~20.4 mm** (tallest module) | MED-HIGH | `07` §6 (clean STEP, Zmax 20.40); `03` §6 (~20 mm); `13` row 10 (`KNOB_PROUD=20`) |
| Encoder underlying part | ALPS Alpine EC11L1525G01 | HIGH | Encoder `CONTENT.md` datasheet link; `03` §4/grounding |
| Encoder shaft diameter / D-flat / knob OD | **UNKNOWN** (corpus) → see Table B | UNKNOWN | `03` §9 item 9 — "calipers / EC11 datasheet" |

### A.5 Derived stack-ups (all `[approx]`, LOW confidence)

| Dim | Value | Conf | Source |
|---|---|---|---|
| Module→board mated standoff | ~8–9 mm (= socket height; pins insert ~3 mm) | LOW [approx] | `03` §6 |
| ERM coin top above board face | ~13–15 mm | LOW [approx] | `07` §6; `09` §row2 |
| LCD glass top above board face | ~12–13 mm | LOW [approx] | `07` §6; `09` §row3 |
| Encoder knob top above board face | **~30 mm** (dominant +Z clearance) | LOW [approx] | `07` §6; `12` recap; `09` §row4 |
| Derived outer stack (plate+board+standoff+PCB+knob) | ~35 mm total | LOW [approx] | `13` row 12 (34.8 = 3+1.6+8.6+1.6+20) |

### A.6 Enclosure / strap parameters (design values, from `05`/`07`/`10`/`12`)

| Dim | Value | Conf | Source |
|---|---|---|---|
| Cage / head envelope | ~60–65 mm square (55 board + ≥2 mm walls) | design | `12` recap; `13` row 15 (`CAGE=62`); `05` §7 |
| Cage wall | 2–3 mm (≥2 mm) | design | `05` §7; `07` §4; `10`; `13` row 16 (`WALL=2.5`) |
| Solid skin-contact plate thickness | ~3 mm (SOLID rigid, NOT foam/membrane) | design | `07` §4/§5; `13` row 17 (`PLATE_T=3.0`) |
| Strap / lug width | **22.0 mm** (20.0 mm acceptable alt) | design (frozen) | `12` "lug_width = 22.0 mm"; `10` §S7; `13` row 13 |
| Printed captive cross-pin (spring-bar substitute) | **Ø2.5 mm** pin, headed one end + barb | design | `10` (Ø2.5 pin); `12`; `13` row 14 |
| Lug bore (printed-pin path) | **Ø2.6 mm** (0.30 mm clearance) | design | `10` "bore Ø 2.6 mm"; `13` row 14 |
| Strap knuckle bore (printed-pin path) | **Ø2.8 mm** (0.30 mm pivot clearance) | design | `10`; `05` §6 |
| Lug bore (bought spring-bar path) | **Ø≈1.9 mm** through-hole | design | `12` "Ø ≈ 1.9 mm"; `13` row 14 |
| Lug inner gap | 20–22 mm (watch-lug spacing) | design | `10` §Attachment; `12` (22 mm) |
| Hinge-pin free-rotation clearance | 0.30 mm | design (web-cited) | `10` clearances table |
| Buckle hole pitch / count | 5 mm pitch, 6–8 holes → ~30–40 mm adjust | design | `10` §Wrist sizing; `05` §6 |
| Adult wrist circumference design range | 140–200 mm | design | `10`; `12` |

### A.7 Body-site spacing thresholds (context, not enclosure geometry — from `02`)

| Metric | Value | Source |
|---|---|---|
| Vibrotactile 2-point on wrist, 90% recognition (10 mm ERM) | **36.6 mm** (vs 20.7 mm static) | `02` §5 (arXiv 2308.05497) |
| Field-reliable ERM 2-point around wrist, ~96% | **~90 mm** transverse; onset ~40 mm | `02` §5 (ACM 3743721) |
| ERM interference-free independence separation | **≥80 mm** | `02` §5 (Exp Brain Res 2019 / PMC6640119) |
| Locked on-board diagonal motor separation | well under 40 mm (accepted) | `05` §3/§4; `00`; `07` §4 |

---

## Table B — Web-verified dimensions (dim | value | URL | agrees/disagrees with corpus)

| Dim | Web value | URL | vs corpus |
|---|---|---|---|
| **ERM coin motor diameter** (LCSC C2759984 = LEADER **LCM1027A2445F**) | **Ø10 mm** | https://jlcpcb.com/partdetail/Leader-LCM1027A2445F/C2759984 | **AGREES** — confirms corpus "visually ~10 mm" UNKNOWN. Closes coin-Ø UNKNOWN #5 (subject to the part-identity caveat below). |
| **ERM coin motor thickness/height** (same part) | **2.7 mm** | https://jlcpcb.com/partdetail/Leader-LCM1027A2445F/C2759984 | PARTIAL — motor body 2.7 mm thick; corpus "~3.6 mm proud of PCB" is the coin+mount protrusion above the module PCB, so not directly equal but broadly consistent (motor sits slightly raised). |
| ERM motor electrical (same part) | 3 V, **80 mA**, **13,500 rpm** (CW/CCW, −20…+60 °C) | https://jlcpcb.com/partdetail/Leader-LCM1027A2445F/C2759984 | **DISAGREES (mild)** — corpus ERM `CONTENT.md` says **90 mA, ≈12000 rpm**. See conflict note. |
| **LCD** module PCB / glass / active | 22×29 PCB, glass 13.5×27.9, active 10.8×21.7, ST7735S, 160×80 | https://www.axiometa.io/products/ips-lcd-0-96 | **AGREES** — web product page reproduces the corpus verbatim (same source). |
| Generic 0.96" 160×80 IPS panel cross-check | ST7735S-driven 0.96" IPS, 160×80, SPI (LCD wiki / Waveshare) | https://www.lcdwiki.com/0.96inch_IPS_Module · https://www.waveshare.com/0.96inch-lcd-module.htm | **AGREES** on panel class/driver/resolution; corpus glass 13.5×27.9 / active 10.8×21.7 are the panel-specific Newvisio numbers (kept as primary). |
| **Encoder shaft** (generic ALPS EC11 family) | **Ø6 mm shaft**, ~**20 mm** shaft length (knurled or D-flat variants), body ~12.5 mm, EC11 = 11 mm size | https://tech.alpsalpine.com/prod/e/html/encoder/incremental/ec11/ec11_list.html · https://www.duppa.net/product/rotary-encoder-ec11-with-20mm-knurled-shaft/ · https://www.amazon.com/uxcell-Encoder-Digital-Potentiometer-D-Shaft/dp/B07R8J8JC7 | **AGREES** — Ø6 mm shaft is the EC11 convention; 20 mm shaft length matches corpus STEP "~20.4 mm above PCB." Knob OD still not fixed (varies by knob). |
| **Watch strap width** standard | 18 / 20 / 22 / 24 mm (20 most common, 22 next); 22 mm chosen | https://www.hewore.com/watch-lug-width-guide/ · https://www.thesuparv.com/blogs/info/18mm-vs-20mm-vs-22mm-vs-24mm-watch-straps-what-s-the-right-size-for-you | **AGREES** — corpus `12` froze 22.0 mm as a standard even size. |
| **Spring-bar pin diameter** (standard steel) | **Ø1.78 mm** (0.7 mm tips) | https://www.watchgecko.com/products/set-of-20-standard-diameter-replacement-watch-strap-spring-bars | CLARIFIES — a real steel spring bar is Ø1.78 mm. The **Ø2.5 mm** figure in the corpus is the **PRINTED PLA substitute pin** (needs more section than steel), NOT the steel spring-bar convention. Buy-path lug bore Ø≈1.9 mm accepts the 1.78 mm bar. |

### Fusion 360 API — units + patterns (web-verified, see dedicated section below for detail)

| Item | Web value | URL |
|---|---|---|
| Internal length unit | **centimeters** (always; radians for angle) | https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/Units_UM.htm |
| `ValueInput.createByReal(x)` | x is in **database/internal units** → cm for length (2 → 2 cm) | https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/ValueInput_createByReal.htm |
| `ValueInput.createByString("15 mm")` | evaluated **with units** → 15 mm regardless of doc units | https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/Units_UM.htm |
| `ExtrudeFeatures.addSimple(profile, distance, operation)` | confirmed signature | https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/ExtrudeFeatures_addSimple.htm |
| `UserParameters.add(name, value, units, comment)` | confirmed signature | https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/UserParameters_add.htm |
| `ChamferFeatures.createInput(edges, isTangentChain)` → `.add(input)` | confirmed | https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/ChamferFeatures_createInput.htm · https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/ChamferFeatures_add.htm |
| `FeatureOperations.CutFeatureOperation` (=1) | confirmed (with Join=0, Intersect=2, NewBody=3) | https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/FeatureOperations.htm |

---

## The five UNKNOWNs — doc + web evidence for each

Per `13` §UNKNOWN-item-audit / `03` §9, the five items that must NOT read as measured fact:

| # | UNKNOWN | Corpus status | New web/doc evidence (this file) | Now resolved? |
|---|---|---|---|---|
| 1 | **AX22 socket centres + 2×5 pitch** | UNKNOWN — pitch 2.0 vs 2.54 mm; 4 port centres on the 55×55 board (`03` R1, `07` §6, `13` row 20) | **None** — needs a CAD-kernel STEP load or calipers on the physical board. No web source gives per-board connector coordinates. | **NO — still UNKNOWN** |
| 2 | **Mounting-hole XY** (board + each module, 4× ⌀2.7 mm each) | Count HIGH, positions UNKNOWN (`03` R2, `13` row 18) | **None** — geometry lives only in the STEP solids / physical parts. | **NO — still UNKNOWN** |
| 3 | **USB-C edge offset** (+ protrusion) | UNKNOWN, on one board edge (`07` §3, `13` row 21) | **None** — not published; measure. | **NO — still UNKNOWN** |
| 4 | **Board thickness** (~1.6 mm [approx]) + true −Z content | MED [approx] from STEP planes (`07` §6, `13` row 2) | Corroborated only as a generic 4-layer FR4 nominal; corpus states "4-layer," no thickness. Not independently web-verified for this board. | **PARTIAL** — 1.6 mm is a standard nominal but remains `[approx]` until measured |
| 5 | **ERM coin diameter** (visually ~10 mm) | UNKNOWN → "confirm via LCSC C2759984" (`03` §6, `07` §6, `13` row 9) | **RESOLVED via datasheet:** LCSC **C2759984 = LEADER LCM1027A2445F = Ø10 mm × 2.7 mm** (JLCPCB part page). Diameter Ø10 mm confirms the visual estimate. | **YES (Ø10 mm)** — with the part-identity caveat below |

**Caveat on UNKNOWN #5 (part identity):** the audit (`03` §grounding) labels C2759984 the *"likely"* raw motor
because the local "datasheet.pdf" was an HTML LCSC viewer page, not a real PDF. The web datasheet for
C2759984/LCM1027A2445F gives **80 mA / 13,500 rpm**, whereas the Axiometa ERM `CONTENT.md` states
**90 mA / ≈12000 rpm**. The electrical mismatch means the coin *may* be a close sibling of C2759984 rather
than that exact SKU. The **Ø10 mm** figure is a robust cross-check of the "~10 mm" visual estimate either way
(all "10xx" flat coin motors in this class are Ø10 mm), but treat Ø10 mm as **HIGH-confidence-typical**, not
"this exact SKU proven." Confirm final coin Ø with calipers before the skin-recess pocket is cut.

---

## Fusion 360 API findings (as of 2026) — with URLs

**All Autodesk pages below were fetched successfully from `help.autodesk.com` (HTTP 200).** The
`www.autodesk.com` / `documentation.autodesk` hosts and the `tech.alpsalpine.com/assets/.../ec11.en.pdf`
returned 403/404 — see grounding notes.

### Units — the load-bearing gotcha (CONFIRMED)
- **Fusion's internal database unit for length is centimeters; angles are radians — "always … without any
  exceptions."** — https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/Units_UM.htm
- This independently confirms the corpus warning in `08` §Fusion-workflow: *"the Fusion API's internal length
  unit is CENTIMETERS. `ValueInput.createByReal(0.5)` = 5 mm. A script that pastes mm values as reals produces
  a part 10× too large."* (`audit/…/08-fusion360-claude-workflow.md`).

### ValueInput — createByReal vs createByString (CONFIRMED)
- **`ValueInput.createByReal(x)`** → x is interpreted in **database/internal units**; for a length that is
  **centimeters** (createByReal(2) = 2 cm). — https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/ValueInput_createByReal.htm
- **`ValueInput.createByString(s)`** → evaluated like user input, **with units**; e.g. `"15 mm"` = 15 mm
  regardless of document default units (per the Units page). **Recommended for a mm-based parametric part** to
  avoid the 10× trap. — https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/Units_UM.htm
- **Rule of thumb for CAD:** either pass mm values as `createByString("55 mm")`, or divide by 10 when using
  `createByReal` (55 mm → `createByReal(5.5)`), or drive everything through named `userParameters` with explicit
  `"mm"` units so the model reads in mm while the kernel stores cm.

### Extrude (CONFIRMED)
- **`extrudeFeatures.addSimple(profile, distance, operation)`** — `profile` (Profile/planar face/…),
  `distance` (ValueInput), `operation` (FeatureOperations). Returns an ExtrudeFeature.
  — https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/ExtrudeFeatures_addSimple.htm

### Cut operation (CONFIRMED)
- **`adsk.fusion.FeatureOperations.CutFeatureOperation`** exists (enum value **1** = "cuts or removes
  materials"), alongside `JoinFeatureOperation` (0), `IntersectFeatureOperation` (2),
  `NewBodyFeatureOperation` (3). Pass it as the `operation` arg to `addSimple` (or an extrude input) to make a
  pocket/window/hole. — https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/FeatureOperations.htm

### Chamfer (CONFIRMED pattern)
- **`chamferFeatures.createInput(edges, isTangentChain)`** returns a `ChamferFeatureInput`; configure it, then
  **`chamferFeatures.add(input)`**. — https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/ChamferFeatures_createInput.htm
  · https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/ChamferFeatures_add.htm
- The distance-setting call (equal-distance) lives on the returned **`ChamferFeatureInput`** object
  (`setToEqualDistance(distance)` with a ValueInput) — that method is on the ChamferFeatureInput class page,
  not the two pages fetched here, so it is noted as the standard pattern but **not directly quoted**. Remember
  the distance ValueInput obeys the cm-unit rule above.

### User parameters (CONFIRMED)
- **`userParameters.add(name, value, units, comment)`** — `name` (str), `value` (ValueInput), `units` (str;
  e.g. `"mm"`; `""` = unitless; `"Text"` = text param), `comment` (str). Returns a UserParameter. Driving the
  model from named mm parameters is the cleanest way to keep the part parametric and unit-safe.
  — https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/UserParameters_add.htm

---

## Grounding notes (fetched vs excerpt-only) + residual risk

**Directly fetched (HTTP 200, quoted):**
- JLCPCB part page for C2759984 / LCM1027A2445F (coin Ø10 × 2.7 mm, 3 V/80 mA/13,500 rpm).
- Autodesk `help.autodesk.com` Fusion-360-API pages: Units_UM, ValueInput_createByReal, ExtrudeFeatures_addSimple,
  UserParameters_add, ChamferFeatures_createInput, ChamferFeatures_add, FeatureOperations. All fetched cleanly —
  the previously-noted autodesk.com 403 problem did **not** occur on `help.autodesk.com`; nothing here is
  excerpt-only for Fusion.

**Search-excerpt-only (not deep-fetched):**
- ALPS EC11 shaft Ø6 mm / 20 mm length — the official `tech.alpsalpine.com/assets/products/catalog/ec11.en.pdf`
  returned **403** and the Farnell `1837001.pdf` fetched as **corrupt binary**, so the Ø6 mm / 20 mm figures are
  **as reported by search excerpts** (ALPS product-list page, DuPPa 20 mm-shaft listing, uxcell 20 mm D-shaft).
  Consistent across three independent listings and with the corpus STEP (~20.4 mm), but the primary ALPS PDF was
  not read. The exact EC11L1525G01 shaft length/flat and knob OD remain to confirm at CAD time.
- Watch-strap width (Hewore, theSUPARV) and steel spring-bar Ø1.78 mm (WatchGecko) — search excerpts corroborating
  the corpus (`10`/`12` already fetched these); not re-fetched here.
- LCSC direct product page for C2759984 returned **404**; the JLCPCB mirror (same part) was used instead.

**Residual risk / open items (unchanged from `03` R1–R4, `07` G3):**
1. **Still UNKNOWN → blocks dimensioned CAD:** AX22 port centres + 2×5 pitch; board + per-module mounting-hole XY;
   USB-C edge offset/protrusion; board thickness (~1.6 mm `[approx]`); board −Z content depth (~4 mm `[approx]`).
   These need a **CAD-kernel STEP load** (`STP_MTX0013.step`, ERM/LCD/encoder `.step`) or **calipers** — no web
   source can supply per-board connector/hole coordinates. (Out of Track B scope; Track A / the CAD session owns
   the STEP measurement.)
2. **ERM part-identity caveat (UNKNOWN #5):** Ø10 mm is a strong typical, but the 80 mA/13,500 rpm vs corpus
   90 mA/12000 rpm mismatch means C2759984 may be a sibling, not the exact SKU — confirm coin Ø with calipers.
3. **Height numbers (`[approx]`)** — ERM coin proud ~3.6 mm, LCD panel ~2–3 mm, encoder shaft ~20.4 mm, standoff
   ~8.6 mm — come from the other tracks' point-cloud parses of annotation-contaminated STEPs (`03`/`07` flag the
   ERM/LCD STEPs carry stray geometry). Confirm with calipers or a clean kernel load before final pockets.
4. **LCD footprint mis-draw** already flagged in `13` row 4 (drawing rendered 22×22 vs true 22×29) — a
   documentation defect downstream, not a dimension conflict; the true value is 22×29 (HIGH).

**Bottom line:** every corpus dimension is captured with a source and confidence tag; the web pass **closed the
coin-diameter UNKNOWN (Ø10 mm, with a part-identity caveat)**, **confirmed the Fusion API centimeter unit
convention and the extrude/cut/chamfer/userParameters/ValueInput patterns from official Autodesk docs**, and
**cross-checked** the LCD panel class, EC11 Ø6 mm shaft, and 22 mm strap standard. The four connector/hole/edge
UNKNOWNs remain and require a STEP-kernel load or calipers — no web source can supply them.
