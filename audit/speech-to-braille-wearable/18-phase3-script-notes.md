# 18 — Phase 3 Fusion 360 Script — Scope, Geometry Decisions & Grounding

**Type:** Phase 3 deliverable notes for the enclosure CAD pipeline.
**Date:** 2026-07-17
**Deliverable script:** `cad/braille_wearable_enclosure.py`
**Consumes (single source of truth):** `16-phase1-reconciled-dims.md` (Rev 2), verified against `17-phase2-adversarial-dim-review.md`.
**Rule honoured:** every numeric literal in the script traces to file 16 (row / §A.4 / §C / §D), a cited datasheet/URL, or is explicitly tagged `DESIGN`. Where the task brief and file 16 disagreed, **file 16 won** (see Deviations §5).

---

## 1. Scope

A self-contained, paste-and-run Fusion 360 Python script that builds the complete braille-wearable enclosure as a native parametric solid model with a full timeline. It produces **two bodies** — `cage` and `skin_plate` — inside a new component `BrailleWearableEnclosure`, plus a registered set of user parameters (Parameters dialog) documenting every fit-critical and design dimension.

Out of scope (by the brief): the host board itself, strap/hinge/pin geometry (lug **bosses only**), STEP/STL export (this is a Fusion API script, not a build123d/STEP generator — the `cad` skill's generators explicitly do **not** apply here).

## 2. Coordinate mapping

File 16 datum: origin = centre of the 55×55 PCB; **+X = USB/button edge, +Z = outer face, −Z = wrist/skin**. File 16 places PCB top at its own Z **+1.56**.

The script places **board top face at model Z = 0**, so `model_Z = file16_Z − 1.56`. Every "above board top" height from file 16 §A.4 then maps 1:1 to a positive model Z. Derived Z-map (mm):

| Plane | model Z | Source |
|---|---|---|
| skin-plate bottom (wrist face) | −10.6 | derived |
| skin-plate top / −Z pocket floor | −7.6 | `Z_BOARD_BOT − NEG_Z_POCKET` |
| board bottom | −1.6 | `−BOARD_THICK` (row 2) |
| **board top (DATUM)** | **0.0** | — |
| button plunger tops | +2.4 | row 9 |
| socket top | +7.5 | §A.4 |
| module PCB top | +11.56 | §A.4 |
| LCD glass top | +13.18 | §A.4 |
| ERM motor top (tallest enclosed) | +15.25 | §A.4 |
| roof inner face | +16.25 | motor top + `ROOF_CLEAR` 1.0 (DESIGN) |
| roof outer face | +18.75 | + `ROOF_THICK` 2.5 (DESIGN) |
| encoder shaft tip (protrudes roof bore) | +38.25 | §A.4 |

Cage footprint 62×62 (`board_bay 55 + 2×bay_clearance 1.0 + 2×wall 2.5`); overall height 29.35 mm (excl. protruding encoder shaft/knob).

## 3. Body & feature plan (ordered timeline)

The `run()` timeline executes in this order (each step = named function):

1. **`_build_cage_block`** — outer 62×62 solid, plate-bottom (−10.6) → roof-outer (+18.75). `NewBody` → body `cage`.
2. **`_cut_cavity`** — 57×57 through-cut from the open wrist side up to roof-inner (+16.25); leaves 2.5 walls + 2.5 roof, open on the wrist side so the board assembly slides in.
3. **`_add_bosses_and_gussets`** — 4× Ø7 M3 standoffs at (±24.1, ±24.1) spanning the 6 mm −Z pocket (−7.6→−1.6), each grounded to the cage walls by a corner **gusset** floor pad (so they are cage-integral, not floating), Ø2.5 self-tap pilot through each.
4. **`_cut_lcd_relief`** — relief notch in the −Y wall for the 2.5 mm LCD PCB overhang (x 5–19, z 9.5–15, leaves 0.5 outer wall).
5. **`_cut_module_roof_openings`** — 2× ERM roof seats; encoder hex ring + Ø16 knob-clearance bore; LCD bezel recess + 13.5×27.9 through-window.
6. **`_cut_usb_slot`** — 12×7 USB-C slot through the +X wall, centred Y=0.
7. **`_cut_button_strip`** — cuts the main roof away over the button column, joins a lowered shelf just above the plungers, drills 3× Ø4 tool holes (≤3 mm deep).
8. **`_add_lugs`** — 2 lug pairs on ±Y walls, internal gap 22.0, Ø2.6 through bores.
9. **`_add_step_rim_and_grooves`** — raised chamfered step-rim + 2 panel grooves (cosmetic).
10. **`_chamfer_vertical_corners`** — equal-distance chamfer on the 4 vertical outer corner edges (brutalist).
11. **`_chamfer_usb_funnel`** — 1.5 mm funnel chamfer on the USB slot exterior long edges.
12. **`_build_skin_plate`** — solid 57×57×3 plate (`NewBody` → `skin_plate`) + 4 corner counterbores.

Feature count ≈ 45 sketch/extrude/chamfer operations. Cosmetic steps (5 hex/bezel/seat, 9, 10, 11) are wrapped in try/except; a failed **cosmetic** feature is logged and skipped (shown in the end message-box), never crashing. **Fit-critical** geometry (bay, bosses, pockets, module openings, USB slot, LCD window/relief, lugs) is not degraded.

## 4. Attachment scheme (documented design choice)

The brief allowed "attach the plate by the M3 bosses (corner counterbores) … or another rigid documented scheme." Chosen scheme, chosen for maximum rigidity / haptic conduction:

- **4× Ø7 standoff bosses** at the board's true Ø3.40 hole positions (±24.1, ±24.1), **cage-integral** (grounded to the outer walls by corner gusset pads). They exactly span the 6 mm −Z clearance pocket.
- **Board** seats on the standoff **tops** (Z = −1.6) and is fastened by 4× M3 from the **+Z / roof** side (screw heads land at the 4 corners, clear of all module zones), self-tapping into the Ø2.5 pilot.
- **Skin plate** seats against the standoff **bottoms** (Z = −7.6) and is fastened by 4× M3 from the **−Z / wrist** side, through the plate's only holes — 4 corner **counterbores** (Ø3.4 clearance + Ø6 head recess) — self-tapping into the **same** Ø2.5 pilots from the opposite end.
- Result: board → standoff → gusset → walls → roof and plate → standoff are one continuous rigid PLA-and-steel path. The plate is otherwise a solid slab: no membrane, no soft features, no holes except those 4 corner counterbores. Whole chassis conducts ERM vibration.
- **Screw-length note:** the shared 6 mm pilot is self-tapped from both ends; use M3×4 (board, top) + M3×5 (plate — 3 mm through the plate + ~2 mm engagement) so the two screw tips do not collide mid-pilot. For extra thread engagement one could split the pilot into two blind holes (residual §7).

## 5. Deviations from the original brief forced by measured geometry

All of these are file-16 corrections that post-date the brief; file 16 wins.

| Brief said | Reality (file 16) | Handling in script |
|---|---|---|
| Ø2.7 board bosses | **Ø3.40** holes at (±24.1,±24.1) (C1) | `BOARD_HOLE_DIA = 3.4`; bosses take M3 through the board holes |
| "−Z pocket ≥4 mm" | JST-PH hangs **5.59** below PCB bottom (row 11, C5) | `NEG_Z_POCKET = 6.0` |
| buttons possibly side-actuated | **3× TOP-actuated** ALPS SKRPADE010 (C4/C10) | roof-face access via a **stepped-down roof shelf** + 3 shallow tool holes; **no** side-wall button holes |
| LCD centred on its port | header offset forces PCB centre **(12, −15.5)**, window **(11.98, −14.38)**, 2.5 mm −Y overhang (C12/D3) | window at true mated position + **−Y wall relief** |
| motors on Ports 1 & 4 (default) | silk map: **Ports 1 & 3 are the diagonal** (C7) | ERM seats at (−12,−12) & (+12,+12); encoder on **Port 4** (−12,+12), LCD on Port 2 |
| roof encloses everything | encoder tip **+38.25** protrudes | roof has a Ø16 clearance bore; roof does not enclose the shaft |

⚠️ Firmware `pins.h` must reflect the Port 1&3 / encoder-Port-4 mapping — flagged to the builder, **not** an enclosure change (file 16 C7, §E-5).

## 6. Grounding — Fusion 360 API (fetched & verified 2026-07-17, all HTTP 200 unless noted)

- Internal length unit = **cm** (mm ÷ 10); createByReal semantics: <https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/ValueInput_createByReal.htm> and Units_UM.htm — confirmed (file 16 §A.6 still accurate).
- `userParameters.add(name, ValueInput, "mm", comment)`: <https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/UserParameters_add.htm> — confirmed.
- `extrudeFeatures.addSimple(profile, distance, operation)`: <https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/ExtrudeFeatures_addSimple.htm> — confirmed (signed distance sets direction).
- `FeatureOperations` (Join/Cut/NewBody): <https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/FeatureOperations.htm>.
- **Chamfer — corrected vs file 16 §A.6:** `chamferFeatures.createInput(edges, isTangentChain)` + `ChamferFeatureInput.setToEqualDistance` are **RETIRED** (Dec 2020). Verified current pattern:
  `input = chamferFeatures.createInput2()` → `input.chamferEdgeSets.addEqualDistanceChamferEdgeSet(edges, offset, isTangentChain)` → `chamferFeatures.add(input)`.
  Sources: <https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/ChamferFeatures_createInput2.htm>, <https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/ChamferFeatureInput.htm>, sample <https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/EqualDistanceChamferFeature_Sample.htm>. The script uses `createInput2` — this is the one substantive update to file 16's API table.
- `combineFeatures.createInput(target, tools)` + `.operation = CutFeatureOperation` + `.add()`: <https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/CombineFeatures_createInput.htm> (documented; the script prefers `extrudeFeatures.addSimple(..., CutFeatureOperation)` for boolean cuts, which is simpler and equally valid).
- Offset construction plane `ConstructionPlaneInput.setByOffset(planarEntity, offset)`: <https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/ConstructionPlaneInput_setByOffset.htm> — confirmed.
- Edge selection: `BRepEdge.geometry` returns a `Curve3D` (`Line3D` for straight edges, with `startPoint`/`endPoint`); `ObjectCollection.create()` collects edges. Selection is done **deterministically by direction + bounding-box midpoint** (not by fragile index), per the brief.

## 7. Known limitations / residual risk

- **Parameter associativity:** user parameters are registered for exposure/documentation; geometry is driven by the matching Python constants (same values) through the single `_cm()` helper. Editing a Fusion parameter will **not** rebuild the geometry — full associativity would require binding each sketch dimension to the parameter expression (large, out of scope). The single-helper design guarantees mm→cm consistency (`createByReal` appears exactly once).
- **UNKNOWN-CONFIRMED residue (file 16 §E) — caliper before printing:** ERM coin Ø (Ø10 datasheet-typical), module X-registration ±1.27 mm (absorbed by the ≥1.3 mm row-direction pocket clearance), encoder knob OD (Ø16 clearance bore is a guess), board-hole Ø3.4-vs-spec-2.7 (M3 drop-test).
- **Shared-pilot standoffs:** board + plate screws self-tap the same 6 mm Ø2.5 pilot from opposite ends; respect the M3×4 / M3×5 length note (§4) or split into two blind pilots.
- **Cosmetic-feature robustness:** hex ring, bezel, ERM seats, step-rim, grooves, chamfers degrade gracefully (logged, skipped) if edge/profile selection fails on a given Fusion build — the model still contains all fit geometry.
- **Device thickness:** ~29.4 mm tall (driven by the +15.25 motor stack + roof). This is chunky for a wearable but intentional (brutalist) and unavoidable given the outward-facing module stack.
- **LCD relief vs lugs share the −Y wall** — verified geometrically separated in Z (relief z 9.5–15; lug bodies z −7…+1), no boolean collision. Lug roots sit flush with the cavity wall (y = 28.5) so they never intrude into the board bay.

## 8. Print orientation note (Bambu, PLA)

- **Orientation: print roof-DOWN (outer +Z face on the plate).** Rationale: the outer face carries the finest detail (LCD bezel, hex ring, panel grooves, step-rim) — printing it against the plate gives the crispest surface and no support scars on the show face; the open wrist side faces up, so the deep 57×57 cavity and the −Z pocket print as upward-opening voids needing no internal support. The 4 standoffs print as short upward pillars. The lug bores (horizontal, Ø2.6) bridge a small span — acceptable, or reorient/ream.
- **Walls ≥ 2.5 mm** everywhere (the −Y relief and the plate-rebate lip are the thinnest at ~0.5–2.0 mm locally — treat as sacrificial/decorative, not structural).
- **Chamfers are self-supporting** (≤45° overhang), consistent with the brutalist chamfer-not-fillet rule — no support needed on the outer corner chamfers or USB funnel.
- The **skin plate** prints flat separately (solid slab, counterbores up), maximizing layer adhesion for the haptic-conduction path.
