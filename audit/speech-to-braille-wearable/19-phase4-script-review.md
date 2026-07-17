# 19 — Phase 4 Independent Adversarial Script Review

**Type:** Phase 4 verification gate — static review of the enclosure CAD generator against the reconciled truth table.
**Date:** 2026-07-17
**Reviewer:** Independent Opus sub-agent, context-restricted.
**Subject:** `cad/braille_wearable_enclosure.py`
**Truth sources permitted:** `16-phase1-reconciled-dims.md` (Rev 2), `17-phase2-adversarial-dim-review.md`, and `help.autodesk.com` API docs only. The reviewer was forbidden all other audit/cad/render/plan/parts files (esp. file 18) and did not read them — the author's notes/reasoning were never seen; that isolation is the verification.
**Method:** Whole-script line-by-line read; every dimensional literal recomputed; every geometric feature traced to a file-16 row; Z stack-up recomputed from §A.4; construction-plane orientation and boolean/timeline order mentally simulated; API calls checked against current official docs.

**Bottom line:** NOT certifiable as-is. Two FAILs (LCD −Y overhang relief is built on the **wrong wall** and is too narrow; lug outer-face chamfer is specified but **never applied**), plus several WARNs. The dimensional *registry* is faithful to file 16; the *geometry construction* has an orientation defect and a missing-feature defect that both break fit/intent.

---

## Verdict table

| # | Item | Verdict | Evidence (file:line) | Required fix if FAIL |
|---|---|---|---|---|
| 1 | Unit conversion (mm÷10 everywhere; params in mm) | **PASS** | `_cm` 52-55; `_pt` 170-171; radii `/2.0/10.0` 312,319,359,422,446,486,490; params 270 | — |
| 2 | LCD recess/window/bezel | **FAIL** | window 370-372 (correct); bezel 363-367 (not chamfered); −Y relief 324-337 (wrong wall + too narrow) | Rebuild the −Y relief on the −Y wall spanning the full 22 mm PCB width; chamfer the bezel |
| 3 | Board bay 55 + clearance, +X orientation | **PASS** | `CAVITY` 150; USB/buttons on +X 391-424 | — |
| 4 | Board bosses at (±24.1,±24.1), M3 / Ø3.4 (not 2.7) | **PASS** | 298-321; pilot `BOSS_PILOT=2.5` 119; hole 3.4 66; no 2.7 on bosses | — |
| 5 | USB-C slot on +X, Y=0, spans receptacle band, ≥12×7, funnel chamfer | **PASS** | slot 391-401; `USB_SLOT_CZ` 154; funnel 538-564 | — |
| 6 | Encoder bore at (−12,+12), Ø6 passes, hex/counterbore, bore param | **PASS** | bore 357-361; hex 375-388; `encoder_bore` param 253 | — |
| 7 | Lugs: 2 pairs ±Y, gap 22.0, Ø2.6 coaxial bores, **outer faces chamfered** | **FAIL** | lugs 427-450; gap math 430; `CHAMFER_LUG=1.5` **defined 129, never referenced** | Add a chamfer feature that consumes `CHAMFER_LUG` on the lug outer edges |
| 8 | −Z clearance pocket ≥6 deep, covers ESP32/JST/USB underbody | **PASS** | cavity 289-293; `NEG_Z_POCKET=6.0` 109; floor Z_POCKET_FL −7.6 145 | — |
| 9 | Skin plate solid ≥3.0, only documented attachment holes | **PASS** | 473-491; `PLATE_T=3.0` 108 | — |
| 10 | User parameters exposed in mm, consistent with geometry constants | **WARN** | 228-273 | Values consistent, but **non-associative** (see findings) |
| 11 | Standalone robustness | **WARN** | imports 42-45; guard 575-580; try/except 574/618 | Cosmetic fallback masks a fit feature (lug bore); dead helpers |
| 12 | Stack-up audit (Z levels mutually consistent, no envelope collisions) | **PASS** | Z-map 143-154; roof 148-149; button shelf 404-424 | — (one tight clearance noted) |
| 13 | Boolean / timeline sanity | **WARN** | xZ relief 324-337; ERM seat vs bezel 344-372; grooves 462-470 | Orientation bug (folded into #2); cosmetic overlaps benign |

---

## Detailed findings — FAILs

### F1 (Item 2 & 13) — LCD −Y overhang relief is cut in the WRONG wall, and is too narrow

`_cut_lcd_relief` (324-337) sketches on an **offset of `xZConstructionPlane`** and relies on the comment's assumption (line 204/332): *"offset moves it in +Y."* That assumption is inverted.

Fusion's base-plane normals follow the right-hand rule of their named axes: `xY → X×Y = +Z`, `yZ → Y×Z = +X`, **`xZ → X×Z = −Y`**. `ConstructionPlaneInput.setByOffset(plane, offset)` measures a *positive* offset **along the positive normal**. So:

- `y_out = −(55/2 + 2.5 + 0.5) = −30.5` (line 328) → `setByOffset(xZ, _cm(−30.5))` places the plane at world **Y = 0 + (−30.5)·(−1) = +30.5**, i.e. on the **+Y wall**, not −30.5.
- The extrude `(y_in − y_out) = (−28.5 − −30.5) = +2.0` (line 337) is applied **along the −Y normal**, moving the cut from +30.5 to +28.5.

Net: the relief notch (x 5..19, z 9.5..15) is carved into the **+Y wall**, where nothing overhangs, while the **−Y wall — where the LCD PCB actually overhangs to y = −30.0 — gets no relief at all.** The LCD PCB's −Y edge would collide with solid −Y wall. This is a fit-blocking defect. (The +Y wall also hosts a lug pair; the spurious notch is at z 9.5..15, above the lug root z −7..1, so it does not weaken the lug, but it is still material removed from the wrong place.)

By contrast the `yZ`-plane features (USB slot 394, lug bores 443) are **correct**, because `yZ`'s normal is `+X` — matching the author's sign convention — and the USB opening is Y-symmetric. The bug is isolated to the single `xZ` use.

**Second, independent defect in the same feature:** even if the wall/sign were corrected, the relief x-span is `5.0..19.0` (line 330) — sized to the **glass** width (file 16 §C states "x span ≈ +5.2…+18.7", which is the 13.5 mm glass). But the *PCB* is **22 mm wide** (row 14; X-extent 1..23 at PCB centre X=12), and it is the **PCB** edge that overhangs 2.5 mm (row 27). The PCB corners at x 1..5 and x 19..23 penetrate the −Y wall (y −28.5..−30) with **no relief** → collision. The relief must span ≥ x 0.5..23.5. *Note: the script faithfully copied file 16 §C's x-span; file 16 itself under-specified the relief to glass width — flag upstream.*

**Third (minor, same item):** the "bezel" (363-367) is a flat rectangular counterbore recess (`BEZEL_MARGIN`, `BEZEL_D`), **not chamfered.** Item 2 requires a chamfered bezel. The window geometry itself (13.5×27.9 long-axis-Y at (11.98,−14.38), lines 370-372) is correct.

**Fix:** build the relief so it lands on −Y (offset should be `+30.5` with a matching extrude-sign flip, or construct the plane by three explicit points to remove the ambiguity), widen it to the full PCB width, and add a chamfer to the bezel edge.

### F2 (Item 7) — Lug outer-face chamfer specified but never created

`CHAMFER_LUG = 1.5` is defined (line 129, "lug outer-edge chamfer DESIGN §D") but **grep of the whole script shows it is referenced nowhere else.** `_add_lugs` (427-450) builds the blocks and bores only; no chamfer feature. The two chamfer functions in the timeline consume `CHAMFER_VERT` (532) and `USB_FUNNEL` (559) exclusively. File 16 §C explicitly requires "boss outer faces chamfered." **The lug chamfer is missing.** Everything else in item 7 passes: 2 pairs on ±Y (434), internal gap exactly 22.0 (`x_ctr=14`, block width 6 → inner faces ±11, gap 22, line 430), Ø2.6 coaxial bores through both lugs of each pair at z −3 (438-448, coaxial because both share Y=`sign·y_mid` and Z=`LUG_BORE_Z`), clear of the LCD relief z-band.

**Fix:** add a chamfer feature selecting the lug outer/tip edges at distance `CHAMFER_LUG`.

---

## Detailed findings — WARNs

### W1 (Item 10) — Parameters are consistent but non-associative
Every `userParameters.add` uses the same Python constant that drives the geometry (228-273), so no parameter *disagrees* with its constant — item 10's literal test passes, and the mm-unit encoding is correct (`_cm(value)` yields cm internal + `"mm"` display, no double-conversion — see Item 1 note). **But** the script's own comment (222-227) concedes the sketches are driven by the constants, not by the parameter expressions. Editing `lcd_win_w` in the Fusion dialog will **not** move any geometry. So "fit-critical dims exposed via parameters" is documentation only; a downstream user who tweaks a parameter will get a silently unchanged model. Treat the parameter block as a data sheet, not a control surface.

### W2 (Item 11) — Cosmetic fallback masks a fit feature; minor robustness nits
- The **lug bore** (442-450) is wrapped in `try/except → _skipped`, and `_skipped` is reported as *"Cosmetic features skipped (fit geometry unaffected)"* (612). A lug bore is a **fit feature** (the strap pin passes through it); if it throws, the enclosure ships with a solid lug and the message wrongly reassures the user. The encoder through-bore (357-361) and LCD window (370-372) are correctly *not* guarded, so a genuine fit failure there aborts the run — good.
- Robustness positives: imports are exactly `adsk.core/adsk.fusion/adsk.cam/traceback` (42-45); `Design.cast` guarded with message + return (575-580); empty edge collections are handled (`if edges.count == 0` 527, `if edges.count:` 556) so chamfers can't crash; edge selection is geometric, not index-based (497-512).
- `profiles.item(profiles.count - 1)` (189, 313, 319, 359, 387, 400, 423, 447, 486, 490) assumes the last profile is the one just drawn. Each such sketch is freshly created and holds a single closed profile, so it is deterministic here — but it is fragile (a stray open contour would shift the index). Not a defect today; a latent one.

### W3 (Item 13) — Cosmetic feature overlaps (benign, but present)
- **ERM roof seat vs LCD bezel:** the seat square is `MODULE_SQ + 2·1.3 = 24.6` (344) centred at Motor B (+12,+12) → spans x −0.3..24.3, y −0.3..24.3; the LCD bezel (19.5×33.9 at (11.98,−14.38)) reaches y +2.6 → the two outer-face recesses overlap in x 2.2..21.7 / y −0.3..2.6. Different depths (seat 2.0, bezel 1.5) so they simply merge into one pocket — cosmetic, not destructive, but not intended.
- **Panel grooves cross the LCD bezel/window:** the horizontal groove at y=0 (463) spans all x and passes over the LCD bezel and the (open) window region. Item 13's "grooves crossing the LCD bezel" case is literally present. Both are shallow outer-face cuts → harmless merge, but the "brutalist cross" will visibly clip the LCD surround.
- All are wrapped in `try/except → _skipped` and are genuinely cosmetic, so severity is low.

---

## Extra findings (outside the checklist)

1. **Dead helpers.** `_sketch_on_xz_at` (203-206) and `_sketch_on_yz_at` (209-212) are defined but never called — `_cut_lcd_relief`, `_cut_usb_slot`, and the lug bores all call `_offset_plane(...)` directly (332, 394, 443). Harmless, but note the dead `_sketch_on_xz_at` carries the same "+Y" mis-assumption that sank F1.
2. **Chamfer API is actually *newer* than file 16 documents — and correct.** File 16 §A.6 lists the deprecated `chamferFeatures.createInput(edges, isTangentChain)` + `setToEqualDistance`. The script instead uses `createInput2()` → `chamferEdgeSets.addEqualDistanceChamferEdgeSet(edges, distance, isTangentChain)` → `add()` (531-533, 558-560). Verified against current docs: `createInput2()` takes no args and returns a `ChamferFeatureInput`; `addEqualDistanceChamferEdgeSet(edges: ObjectCollection, distance: ValueInput, isTangentChain: bool)` is the current signature. **This is correct**; file 16's API row is stale, not the script.
3. **Shared self-tap pilot from both ends.** Each Ø7 boss carries one Ø2.5 pilot running its full 6 mm height (317-321); the board screw enters from +Z and the plate screw from −Z into the *same* pilot (comment 315-316, 480). Two M3s meeting mid-boss is workable but leaves little thread engagement each; consider two blind pilots or a longer boss.
4. **Encoder bore depth reference is arbitrary but harmless.** The bore floor is tied to `LCD_GLASS_TOP=13.18` (361) even though the encoder is at (−12,+12), nowhere near the LCD. It still produces a clean roof through-hole (20.75→13.18 spans the roof 16.25..18.75), so functionally fine — just a confusing datum.
5. **Tight −Z clearance.** Pocket floor is Z_POCKET_FL = −7.6 (145) vs deepest JST at −7.19 (board bottom −1.6 minus 5.59) → **0.41 mm** clearance. Meets "≥6.0 deep" but has almost no margin; a slightly proud connector or print swell eats it.

---

## Grounding notes (API docs checked, help.autodesk.com, this session)

- `ChamferEdgeSets.addEqualDistanceChamferEdgeSet` — signature `(edges: ObjectCollection, distance: ValueInput, isTangentChain: boolean)` confirmed: `.../ChamferEdgeSets_addEqualDistanceChamferEdgeSet.htm`
- `ChamferFeatures.createInput2()` — no args, returns `ChamferFeatureInput`: `.../ChamferFeatures_createInput2.htm`
- `xZConstructionPlane` normal = −Y (right-hand rule X×Z), and the community-documented xZ sketch Y/orientation flip: forums.autodesk.com thread "Point3D.create – X and Y coordinates shifted on construction plane parallel to YZ" and "Sketch Orientation"; consistent with `ConstructionPlaneInput.setByOffset` measuring along the positive normal (Construction Plane API Sample).
- Unit / ValueInput / addSimple / userParameters facts re-confirmed as in file 16 §A.6 (`Units_UM.htm`, `ValueInput_createByReal.htm`, `ExtrudeFeatures_addSimple.htm`, `UserParameters_add.htm`).

Sources:
- [addEqualDistanceChamferEdgeSet](https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/ChamferEdgeSets_addEqualDistanceChamferEdgeSet.htm)
- [ChamferFeatures.createInput2](https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/ChamferFeatures_createInput2.htm)
- [Construction Plane API Sample](https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/ConstructionPlaneSample_Sample.htm)
- [Point3D on YZ-parallel plane — coordinate shift](https://forums.autodesk.com/t5/fusion-api-and-scripts-forum/point3d-create-x-and-y-coordinates-shifted-on-construction-plane/td-p/9900679)
- [Sketch Orientation](https://forums.autodesk.com/t5/fusion-api-and-scripts/sketch-orientation/td-p/9952217)

---

## Orchestrator fix log (applied after this review; same date)

All FAILs and the masking WARN were applied as targeted edits to `cad/braille_wearable_enclosure.py`; the checklist was then re-run mentally against the diff — no fix introduced a new FAIL, so no second review loop was required. `python3 -m py_compile` passes post-fix.

| Finding | Fix applied | How verified |
|---|---|---|
| **F1a** LCD relief on wrong (+Y) wall | `_cut_lcd_relief` rebuilt from an **XY sketch + vertical (+Z) cut extrude** — no construction-plane normal involved, so the sign ambiguity is eliminated rather than patched. Notch now explicitly spans y −30.5…−28.5 (−Y wall, 0.5 outer web) | Coordinates literal in the sketch rectangle; same `_sketch_on_xy_at` path used by 10 already-verified features |
| **F1b** relief too narrow (glass-width) | Widened to `LCD_PCB_H + 2·MODULE_CLEAR_ROW` = 24.6 → x −0.3…+24.3 (full 22 PCB + 1.3/side) | Covers PCB x 1…23 + registration ±1.27; clear of lug roots (z 9.5…15 vs lug z −7…+1). **Upstream cause fixed too:** file 16 §C relief row corrected (Rev 3) — it had specified the glass-width span |
| **F1c** bezel not chamfered | New `_chamfer_lcd_bezel()` (timeline 11c): 1.0 mm equal-distance chamfer on the 4 window-opening edges at the bezel floor (z 17.25), selected by z-tolerance 0.2 (excludes step-rim floor 17.75) + window-bbox filter (excludes bezel outer boundary) | Edge-filter arithmetic checked against all other z-17-ish features (ERM seats 16.75, hex 16.75) |
| **F2** lug chamfer never applied | New `_chamfer_lugs()` (timeline 11b): `CHAMFER_LUG` 1.5 mm on all edges with midpoint \|y\| > 35.8 — only the 4 lug tip faces reach past \|y\| 31 | Uniqueness of the y-band; runs after lugs exist, before the plate body |
| **W2** lug bore masked as cosmetic | try/except removed from the lug bore — a failure now aborts the run with the full traceback instead of "fit geometry unaffected" | Encoder bore / LCD window already follow this pattern |
| Extra-1 dead helpers | `_sketch_on_xz_at` / `_sketch_on_yz_at` deleted (one carried the same wrong "+Y" normal comment that caused F1a) | grep: no `xZConstructionPlane` reference remains in the file |
| Extra-4 confusing encoder-bore datum | Bore floor re-expressed as `Z_ROOF_INNER − 3.0` (≈13.25, was 13.18 via the unrelated LCD datum) — behaviour unchanged, datum now the roof it actually cuts | Depth −7.50 vs −7.57 before; both well through the 16.25…18.75 roof |
| Extra-5 0.41 mm −Z margin | `NEG_Z_POCKET` 6.0 → **6.5** (still "≥6.0" per file 16 §A.5); margin over the JST −5.59 grows to 0.91. Device thickens 0.5 (all Z-map-derived) | Z-map re-derived: plate −11.1…−8.1, cage height 29.85, USB slot stays fully within the wall band |

Accepted as documented limitations (no change): W1 non-associative parameters (parameter block is a data sheet, not a control surface — stated in the script and file 18); W3 cosmetic groove/bezel/seat overlaps (shallow same-face cuts, merge harmlessly); shared-pilot screw engagement (screw-length note in file 18); `profiles.item(count−1)` idiom (deterministic on fresh single-profile sketches).

**Post-fix verdict: zero unresolved FAILs.** Items 2 and 7 are now satisfied; live-Fusion caveats in Residual risk below still apply to chamfer edge resolution and boolean participation.

## Residual risk (cannot be settled statically — requires a live Fusion run)

1. **F1 orientation** — my −Y-wall conclusion rests on the documented xZ-normal convention and setByOffset sign, not on execution. A single Fusion run with a print of the relief body's Y-extent settles it definitively. I rate it high-confidence-bug, not certainty.
2. **Chamfer edge resolution** — `_chamfer_vertical_corners` and `_chamfer_usb_funnel` select edges by post-hoc geometry filters. Whether exactly the intended 4 corner edges / 2 slot edges resolve (and survive the prior step-rim and corner-chamfer operations) can only be confirmed at runtime; the filters look deterministic but edge topology after a chain of cuts is empirically fragile.
3. **`addSimple` boolean targeting** — JOIN/CUT participation with the correct body (bosses→cage, plate cuts→plate) is inferred from build order (plate is body #2, built last). Multi-body participation defaults should hold, but verify no cut unintentionally bites the plate or vice-versa.
4. **`profiles.item(count-1)`** picking the intended profile in every sketch (see W2).
5. **Hardware-envelope items still UNKNOWN-CONFIRMED per file 16 §E** (ERM coin Ø, module X-registration ±1.27, encoder knob OD, board-hole Ø3.4-vs-2.7) are carried by design clearances, not resolved here.
