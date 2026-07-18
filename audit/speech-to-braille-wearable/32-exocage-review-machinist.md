# 32 — EXO-CAGE review: THE MACHINIST (total dimensional recompute)

**Reviewer:** Adversarial Reviewer 1 of 2 ("The Machinist")
**Date:** 2026-07-18
**Target:** `cad/braille_wearable_exocage.py` + `cad/tests/test_exocage_build.py`
**Method:** every number recomputed from the script constants + geometry code and checked
against 27b §A (the fit contract) and file 16 (board/module truth). File 31's claims were
read only AFTER findings were formed, to diff claims-vs-code. All geometry verified against
the offline build123d engine with 60+ independent probes (scratchpad `mach_probe*.py`).

## VERDICT: **FAIL**

The roll-cage corner structure (9×9 posts at ±26.5 with inner faces at ±22, plus the 7 mm-leg
corner gussets) **occupies the footprint of the three 22×22 modules (P1 ERM, P3 ERM, P4 encoder)**.
The modules reach ±23; the posts intrude to ±22 and the gussets to ±15. Clearance is **−1.0 mm
(interference), not the ≥1.3 mm §A requires** — a 2.3 mm shortfall. The upper corner gussets
(z +8.5…+11) physically collide with the module PCBs (top +11.56). The electronics cannot be
seated. This is a hard §A "Module seats" violation and it is exactly the class of PCB-corner
collision file 16 line 129 warns about (fixed there for the LCD, missed here for the other three).

Gates are green (py_compile exit 0; pytest 96 passed) but the suite contains **no lateral
module-clearance probe**, so the green result is blind to the defect.

---

## Findings table

| ID | Severity | Claim | Evidence | Verdict |
|---|---|---|---|---|
| MC-1 | **CRITICAL** | Corner posts clear the modules (`POST_INNER 22.0 … clears modules`, script L193; file 31 "post inner faces ≥1.3 from all modules") | Post = 9×9 @ (±26.5,±26.5) → inner faces at ±22 (L192, L221, `_add_posts` L457-465). 22×22 module @ (±12,±12) → edge at ±23 (16 row 13). Probe: `(22.5,22.5,10.5)`,`(22.7,22.0,10.5)` SOLID inside P3 footprint; same for P1 `(-22.5,-22.5,10)`, P4 `(-22.5,22.5,10)`. Clearance = 22−23 = **−1.0 mm** vs §A ≥1.3 (shortfall 2.3). | **UPHELD** — modules cannot seat |
| MC-2 | **CRITICAL** | Corner gussets are structural brackets tying posts inward (file 31 D6) | Gusset triangle (ix,iy)=(±22,±22)→legs 7 to (±15,±22)/(±22,±15) at z +3…+5.5 **and +8.5…+11** (`_add_corner_gussets` L495-515, `GUSSET_LEG` L203). Whole triangle lies inside the 22×22 module footprint. Probe: pure-gusset SOLID at `(18,20,10.5)`,`(20,18,10.5)` (dist-to-bore 7.35, not post) inside P3; upper gusset z8.5-11 overlaps module PCB z10.05-11.56. | **UPHELD** — gusset↔PCB collision, all of P1/P3/P4 |
| MC-3 | **MAJOR** | Ø4.5 driver bore "vertical, on-axis" down each post (file 31 §4) | Bore @ (±24.1,±24.1) r2.25 inside a post spanning 22…31 (`_cut_post_screw_bores` L468-477, `SCREW_ACCESS_DIA` L195). Inner edge = 24.1−2.25 = **21.85 < 22** → bore breaks through the inner face. Probe along x=22.0: SOLID at y=23.0/25.2 but **AIR y=23.3…24.9** — a 1.6 mm-wide open slot in the post inner wall. Remaining inner wall ≈ **−0.15 mm** vs §A ≥2.0 floor. | **UPHELD** — post inner wall breached / structure < 2.0 |
| MC-4 | MINOR | `LCD_PCB_W=29 (X extent)` / `LCD_PCB_H=22 (Y extent)` (L133-134) | File 16 row 14: 29 mates along **board-Y**, 22 along board-X. Labels are swapped. But the only *use* (`_cut_lcd_relief` x_w = `LCD_PCB_H`+2·1.3 = 24.6, L602) applies 22 as the X width — geometrically correct. | Comment-only defect, no geometric effect |
| MC-5 | NOTE | Test suite "open sky over all four module positions" proves module clearance | The exo probes only check *above* modules (z≈14) and posts-solid at 26.5; **no probe checks lateral/corner clearance**, so MC-1/MC-2 pass CI undetected. | Test gap — recommend adding corner probes |
| MC-6 | NOTE | file 31: "Every LOCKED §A fit anchor is verified unchanged"; POST_INNER "≥1.3 from all modules" | False for the module-seat anchor (MC-1). Claims-vs-code discrepancy. | Discrepancy logged |

MINOR count: 1 (MC-4).  NOTE count: 2 (MC-5, MC-6).

---

## §A anchor-by-anchor recompute table (derived-from-source vs required)

| §A anchor | Required | Derived from script | Probe verdict |
|---|---|---|---|
| Board bay keep-out | nothing inside 57×57, z −8.1…+2 except bosses/gussets | cavity CUT 57×57 −11.1→+16.5 (L379-392); posts start +2, gussets +3, bridges/turret +12 — all ≥+2 | PASS — `(0,0,-5)`,`(0,0,1)`,`(5,5,1.9)` all AIR |
| M2 bosses | 4×Ø7/Ø1.8 @ ±24.1, −8.1→−1.6, gussets to walls | Ø7 JOIN −8.1→−1.6, Ø1.8 pilot CUT, 9×9 pad −8.1→−5.6 (L395-416) | PASS — pilot AIR, annulus SOLID, pad SOLID |
| Skin plate | 57×57×3 solid, Ø2.4 thru, Ø4.0×2.0 recess, −11.1…−8.1 | 57×57 NEWBODY −11.1→−8.1; Ø2.4 thru + Ø4.0×2.0 CB (L620-635) | PASS — ctr SOLID, CB & thru AIR |
| −Z pocket | 6.5 deep under board | −1.6 − 6.5 = −8.1 = plate top (L214) | PASS — pocket AIR |
| **Module lateral clr** | **≥1.3 to any flanking feature** | **posts inner ±22, gussets to ±15 vs module edge ±23 → −1.0** | **FAIL — MC-1/MC-2** |
| Nothing over motors | span over motor ≥ +16.25 | open sky; nearest is +Y rim @ y24.5 (clr 1.5 to motor PCB y23) | PASS — z12-16 AIR over all 4 centres |
| Encoder ≥Ø16 from +13 up | Ø16 clear bore, wall outside | bore CUT +18→+11.5 r8; AF21 hex wall 8.1→10.4; bridges z12-13 bored inside Ø16 | PASS — r7.9 AIR, r8.1 SOLID, r10.6 AIR |
| LCD window by absence | 0 material above 13.5×27.9 @ (11.98,−14.38) from +13.18 | glass x5.23-18.73 (<22 posts), y to 0.6; nothing overhead | PASS — sky ctr/corner/high all AIR |
| LCD −Y relief void | x −0.3…24.3, z 9.5…15, to y −30.5 | `_cut_lcd_relief` exactly those spans (L593-606) | PASS — LCD corner `(22.5,-24,10.5)` AIR (relieved); LCD fully clears |
| USB slot | 12×7 @ z −2.79, Y=0, web ~2.1, funnel | slot y−6…6, z−6.29…0.71 (L419-430); funnel 1.5 | PASS — interior AIR, roof SOLID, spans exact |
| Buttons bare | no >3 mm cover above (25.76,±17/0) from +2.4 | +X open above +2 (L609-617); x25.76 in hollow cavity | PASS — trench & ±17 AIR |
| Lugs | gap 22, Ø2.6 @ z−3, proj ≥5, chamfer | inner faces ±11 → gap 22 (L435); bore Ø2.6 x10-18 @ z−3; tip y36 (proj 5) | PASS — bore AIR, block SOLID |
| Structure min ≥2.0 | load walls/posts/bridges ≥2.0 | posts 9×9 OK globally **but** screw bore leaves −0.15 inner wall | **FAIL locally — MC-3** |
| Two bodies | cage + skin_plate | NEWBODY ×2 | PASS |
| bbox | X±31, Y±36, Z −11.1…+17.5 | matches | PASS |

---

## Independent probe results (own points, not the suite's)

`mach_probe.py / mach_probe2.py / mach_probe3.py`, `.venv/bin/python`, identity convention.
Highlights (full logs in scratchpad):

```
MODULE COLLISIONS (SOLID cage material inside a 22×22 module footprint = interference):
  (22.50, 22.50,10.0) SOLID in P3   <-- post
  (20.00, 20.00,10.0) SOLID in P3   <-- gusset
  (18.00, 20.00,10.5) SOLID in P3   <-- gusset (dist-to-bore 7.35, pure gusset)
  (-22.50,-22.50,10.0) SOLID in P1  <-- post
  (-20.00,-20.00,10.0) SOLID in P1  <-- gusset
  (-22.50, 22.50,10.0) SOLID in P4  <-- post
  (-20.00, 20.00,10.0) SOLID in P4  <-- gusset
  => 11+ collision points across P1/P3/P4 at module-PCB height (z≈10-11).

POST SCREW-BORE INNER-WALL BREACH (post wall should be solid):
  (22.00,23.30,10) AIR ... (22.00,24.90,10) AIR   <-- 1.6mm open slot in inner face
  (22.00,23.00,10) SOLID / (22.00,25.20,10) SOLID  <-- slot edges

LCD (P2) corner @ PCB/glass height (relief working):
  (22.5,-24,10.5) AIR   (22.5,-24,11.3) AIR   => LCD clears, MC not applicable to P2

Ø16 encoder ring @ z14.5:  r7.9 AIR | r8.1 SOLID | r10.4 SOLID | r10.6 AIR  (wall 2.5, OK)
USB slot:  interior AIR, roof SOLID, edges at y±6 / z −6.29..0.71  (12×7 @ −2.79, OK)
```

The three "mismatches" my first sweep flagged were **my own probe-point placement errors**
(points landed inside the Ø1.8 pilot, inside the Ø4.5 bore, or above the boss top −1.6), not
script bugs — re-probing at correct offsets confirmed the script behaves exactly as the
constants dictate. Likewise the "lug outside block AIR" readings were on the bore axis (the
Ø2.6 cut runs along X). None of these are defects.

---

## Claims-vs-code discrepancies with file 31

1. **file 31 constant table: "`POST_INNER 22.0` … post inner faces ≥1.3 from all modules"** —
   FALSE. Module edge is at ±23 (22×22 @ ±12); inner face at ±22 is 1.0 mm *inside* the
   module. Root cause: appears to treat the module ±9 mounting-hole pattern (16 row 15) or a
   ±10 half-width as the PCB edge, instead of the true ±11. (MC-1/MC-6)
2. **file 31 D6 / step 9 (corner gussets)** describe them purely as post-tie brackets; they do
   not note that all 8 sit inside the module footprints and the upper 4 collide with the PCBs. (MC-2)
3. **file 31 §5 test description** lists "open sky over all four module positions" as the module
   coverage — an *above*-only check; there is no lateral clearance probe, so the suite cannot
   catch MC-1/MC-2. (MC-5)
4. Positive: file 31 D1 + the LCD relief (Rev-3 x-span −0.3…24.3) are implemented correctly —
   the LCD PCB corners are cleared (probes AIR). The same fix was simply never applied to the
   post/gusset structure around P1/P3/P4.

---

## Gate outputs

```
$ python3 -m py_compile cad/braille_wearable_exocage.py
PY_COMPILE_EXIT=0 OK

$ .venv/bin/python -m pytest cad/tests -q
........................................................................ [ 75%]
........................                                                 [100%]
96 passed in 56.12s
```

Both gates green — but green is not fit-correct here (MC-5).

---

## Recommended fixes (for the builder; NOT applied by this review)

- **MC-1/MC-2 (must fix):** retreat the module-facing corner structure to ≥ +24.3 mm. Options:
  shrink `POST_SQ` so `POST_INNER = CAGE_HALF − POST_SQ ≥ 24.3` (POST_SQ ≤ 6.7, weakens posts),
  or chamfer/notch only the post+gusset *inner corner* over the module height (z +2…+15.3) to
  ≥24.3, or drop `GUSSET_LEG` and pull gussets out of the footprint. Any choice must re-probe
  the four module corners for ≥1.3 clearance.
- **MC-3 (should fix):** the Ø4.5 bore at ±24.1 is 2.1 mm from the post inner face (r2.25 → breach).
  Either center the bore on the post (±26.5) if the screw head tolerates it, or grow the post,
  or accept a counter-bored blind pocket that keeps ≥2.0 wall.
- **MC-5:** add lateral module-corner clearance probes (e.g. SOLID-free at (22.5,22.5,10) etc.)
  so the suite guards the §A module-seat anchor.

---

# Re-verification (post file-34 fix pass)

Re-derived from the CURRENT `cad/braille_wearable_exocage.py` and re-probed against the rebuilt
geometry (`scratchpad/mach_reverify.py`, `.venv/bin/python`, identity convention). The fixes:
pentagon posts (E1), Ø4.5 bores deleted (E2), 8 gussets → 4 top corner plates (E3), turret
deleted / encoder bare (E4).

## Per-finding verdict table

| ID | Original | Verdict | Evidence |
|---|---|---|---|
| MC-1 | posts foul module PCB corners (−1.0 mm) | **RESOLVED** | Posts rebuilt as pentagons (9×9 minus a leg-3.5 inner-corner triangle, hyp x+y≥47.5, `_add_posts` L452-482). **0 in-module SOLID hits** across P1/P3/P4 (sweep of corner zones @ z5/10.5/15). Along the module +X edge (y=22) first post material is at **x=24.5**; module edge at 23 → **row-direction clearance 1.5 mm ≥1.3** and the whole L-keep-out (to ±24.3, the same convention as the locked LCD relief) is AIR. |
| MC-2 | corner gussets collide with module PCBs | **RESOLVED** | 8 gussets deleted; `_add_corner_gussets` gone (asserted absent, test L386+). 4 top corner plates (`_add_corner_plates` L500-528) sit at cage corners (\|x\|+\|y\|≥54.5). Probe: **0 plate points inside any module footprint**. Body is a **single lump** (`cage.solid.solids()==1`, was 14) → plates fused volumetrically, not floating. |
| MC-3 | Ø4.5 bore breaches post inner wall (−0.15 mm) | **RESOLVED** | Bores deleted (`_cut_post_screw_bores` gone; `SCREW_ACCESS_DIA` retired). Post interior at (24.1,24.1,10) is now **SOLID** (3 corners); pentagon inner-face wall SOLID. The (+X,−Y) corner reads AIR at (24.1,−24.1,10) — that is the intended LCD-relief notch (z9.5–15), not a breach. Screws now drive from the wrist side through the plate counterbores. |
| MC-4 | LCD_PCB_W/H labels swapped | **RESOLVED** | L147-148 now read "board-Y extent after mate" / "board-X extent … used as relief X-width". Correct. |
| MC-5 | suite blind to lateral module clearance | **RESOLVED** | New probes L173-180 (L-keep-out AIR sentinels (23.5,22.5)/(22.5,23.5) per P1/P3/P4 @ z5/z10) + single-lump test L256-259 + POST_CUT/PLATE_LEG invariants L346-362 + deleted-functions test L386. |
| MC-6 | file 31 claimed POST_INNER ≥1.3 from modules | **RESOLVED** | The false "clears modules" claim is removed from the current header (E7); header L66-69 now states the square posts *did* intrude and describes the pentagon fix. File 31 is superseded by file 34. |

## New-violation spot-checks (fixes didn't regress the anchors I recomputed)

- **Pentagon posts still structural:** no bore; solid pentagon, all faces ≥5.5 mm long, well above the 2.0 floor. `(22.3,26.0,10)` SOLID. ✓
- **Corner plates outside module keep-outs + LCD relief:** 0 module-footprint hits; (+X,−Y) plate clipped to x≥24.5 — probes inside the relief envelope (24.0,−23.5,11.5)/(24.2,−23.0,11.5) are **AIR**, plate material only at x≥24.4 (outside relief). ✓
- **Encoder bare (E4):** r9.9 compass rings around (−12,+12) are **all AIR at z13/14/15/16/17**; axis AIR. Clears the measured can (r9.32). ✓
- **Height:** cage bbox Z now −11.1…**+16.5** (turret gone); §B welcomes dropping height. Other anchors (USB slot/roof, LCD sky, LCD relief, lug bore, bosses, bay keep-out, plate, rims, buttons, air-above) all re-probe correct. ✓
- **Monolith (separate body):** `ENCODER_BORE 20 / TURRET_AF 24 / TURRET_BORE 20 / HEXRING_AF 28` (L143/169/171/172). AF24 flat at 12 vs Ø20 bore r10 → **2.0 mm wall** (= floor); can r9.32 < r10 → clears +0.68. Registry-consistent; both gates green. ✓

## Residual note (not a reopening)

- **MC-1-r (NOTE):** the pure-diagonal gap from the *nominal* PCB corner (23,23) to the 45° pentagon
  face (x+y=47.5) is **1.06 mm** perpendicular — below the 1.3 mm target *if* measured corner-to-face
  rather than in the row direction. It is a 45°-face-vs-square-corner artifact: the §A/file-16 measure
  is the row-direction gap (1.5 mm here) and the ±1.27 registration is X-only (toward the 1.5 mm edge),
  and this uses the identical ±24.3 keep-out convention as the LOCKED LCD relief. Real PCB corner radius
  further recovers it. Acceptable, but worth a dry-fit check — logged, not escalated.

## Gate outputs (re-run)

```
$ python3 -m py_compile cad/braille_wearable_exocage.py    -> EXOCAGE_COMPILE=0
$ python3 -m py_compile cad/braille_wearable_enclosure.py  -> ENCLOSURE_COMPILE=0
$ .venv/bin/python -m pytest cad/tests -q
128 passed in 56.21s
```

## Final gate verdict: **PASS**

All six of my findings are RESOLVED; no regression introduced in the anchors I recomputed. The
CRITICAL module interference (MC-1/MC-2) and the MAJOR post-wall breach (MC-3) are eliminated and
now guarded by new geometry probes. One 1.06 mm diagonal-clearance NOTE remains for dry-fit.
