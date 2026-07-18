# 26 — Fusion Live-Run Runtime Fixes

**Date:** 2026-07-17
**Subject:** `cad/braille_wearable_enclosure.py`
**Type:** Runtime defect log + fix record (live Fusion 2026 execution, not static review).

The Phase-4 review (file 19) certified the script statically. Actually *running* it in
Fusion 2026 has now surfaced two runtime errors that no paper review caught, because both
depend on real API behaviour (component policy; sketch-frame orientation on construction
planes) rather than on the dimensional math. This file records both.

---

## Runtime error #1 — Part-document single-component restriction (already fixed earlier)

**Symptom (first live run):**
```
RuntimeError: 3 : Failed to create component: Part Design documents can only contain one
component, please add this Part to an Assembly to add multiple components.
```
raised by `root.occurrences.addNewComponent(...)` in `run()`.

**Root cause:** a *Part Design* document permits exactly ONE component (its `rootComponent`);
`addNewComponent` is only legal in an *Assembly* (or legacy multi-component) document.

**Fix (already in the file — DO NOT re-touch):** `run()` now wraps the
`addNewComponent` call in try/except and falls back to building directly into
`rootComponent` when the child-component call is refused. The single-component limit
restricts COMPONENTS, not BODIES, so the two bodies (cage + skin_plate) remain fine.

---

## Runtime error #2 — lug bore: "No target body found to cut or intersect!" (fixed here)

**Symptom (second live run, step 8):**
```
line 679, in run: _add_lugs()
line 448, in _add_lugs: _extrude(prof2, LUG_W + 2.0, CUT)
line 203, in _extrude: return ext.addSimple(profile, _cm(dist_mm), operation)
RuntimeError: 3 : No target body found to cut or intersect!
```
Steps 1–7 built; the first lug BLOCK join succeeded; the first lug BORE cut produced a
tool solid that intersects no body.

**Root cause (sketch-frame orientation on offset construction planes, NOT arithmetic).**
The lug-block geometry math is correct on paper (block x cx-3..cx+3, y 28.5..36, z -7..+1;
intended bore cylinder at model (y=32.25, z=-3) spanning the lug in X). The bore, however,
was sketched on an **offset `yZConstructionPlane`** using **raw sketch-space coordinates**
`_pt(sign*y_mid, LUG_BORE_Z)` and a **one-sided** `addSimple(+dist)`. That silently encodes
two assumptions about the sketch frame on a yZ-parallel plane:
 (a) sketch-X axis -> model +Y and sketch-Y axis -> model +Z;
 (b) a positive extrude distance runs along model +X.
Neither is guaranteed by the Fusion API. When the real in-plane axis mapping and/or the
plane normal sign differ from those assumptions, the Ø2.6 circle is placed at a
mirrored/shifted location (e.g. at −Y on the +Y-first loop iteration, where no lug body
exists yet) and/or the cut is extruded away from the lug — so the cut tool overlaps no
solid → *No target body found to cut or intersect!*

This is the same class of defect as Phase-4 F1 (the LCD relief once landed on the wrong
wall because `xZConstructionPlane`'s normal is −Y). F1 was fixed by rebuilding from an XY
sketch; the yZ features (USB slot, lug bore) were left on the fragile raw-coordinate
pattern and were only *assumed* correct because the normal happened to match the author's
+X convention — that assumption did not survive execution.

**Fix (orientation-proof, in `_add_lugs`):**
- Place the sketch plane **AT the lug mid-plane** (`_offset_plane(yZ, cx)`) instead of at
  `cx − LUG_W/2 − 1.0`.
- Derive the bore centre from **intended MODEL coordinates** with
  `sk2.modelToSketchSpace(_pt(cx, sign*y_mid, LUG_BORE_Z))`, so the circle lands correctly
  no matter how the sketch axes are oriented.
- Cut with a **symmetric extent** via a full `ExtrudeInput`
  (`createInput` → `setSymmetricExtent(_cm(LUG_W+2), True, 0)` → `add`) instead of the
  one-sided `addSimple`. Full length `LUG_W+2 = 8 mm` about `X=cx` → the cut spans
  `cx−4..cx+4`, fully piercing the `LUG_W = 6` block (`cx−3..cx+3`) from BOTH ends
  regardless of the plane normal's sign.
- Kept a FIT feature: still **no** try/except swallowing (Phase-4 W2 stays true — a failure
  must abort loudly, not report "fit geometry unaffected").

## Precautionary fix — USB slot (same offset-yZ pattern, `_cut_usb_slot`)

The USB slot uses the identical offset-yZ technique and did **not** crash (its rectangle is
Y-symmetric and tall enough to reach the wall regardless of sign flips). But if the frame
assumption is wrong, it would have cut the slot at the **wrong model Z** (+2.79 instead of
the intended −2.79, reflected about the plane origin). Hardened the same way:
- Both rectangle corners derived from MODEL coords (`y = ±USB_SLOT_W/2`,
  `z = USB_SLOT_CZ ± USB_SLOT_H/2`, at the plane's X) via `modelToSketchSpace`.
- Symmetric through-cut, full length `2*((CAGE_HALF − x_start) + 2.0) = 12 mm` about
  `X = 27.0` → spans model X `21.0..33.0`: it **exits** the +X outer wall (31.0) by 2 mm and
  its −X reach (21.0) stops 49.5 mm short of the −X inner wall (−28.5), so it **cannot** nick
  the opposite wall; the 21.0..28.5 inward stretch is hollow cavity and removes nothing.

Correcting the slot's model Z also un-blocks a downstream cosmetic feature:
`_chamfer_usb_funnel` selects its edges by `abs(mz − USB_SLOT_CZ)`. With the slot now
guaranteed at the correct model Z, that filter should finally match (left unchanged, as
instructed).

**Not touched:** no constant values, feature order, `_cm()`, the Part-document fallback,
or any chamfer function.

---

## Research (API confirmed against help.autodesk.com this session)

- `Sketch.modelToSketchSpace(modelCoordinate: Point3D) -> Point3D` — converts a MODEL-space
  point to that sketch's space; single point only.
  https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/Sketch_modelToSketchSpace.htm
- `ExtrudeFeatures.createInput(profile, operation) -> ExtrudeFeatureInput`; configure then
  `ExtrudeFeatures.add(input)`.
  https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/ExtrudeFeatures_createInput.htm
- `ExtrudeFeatureInput.setSymmetricExtent(distance: ValueInput, isFullLength: bool,
  taperAngle: ValueInput=optional)` — `isFullLength=True` ⇒ `distance` is the FULL length
  (i.e. ±distance/2 about the sketch plane).
  https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/SymmetricExtentDefinition_isFullLength.htm
- Background / prior precedent (construction-plane normals + sketch-frame axis shifts on
  yZ-parallel planes): file 19 §Grounding + forum "Point3D.create – X and Y coordinates
  shifted on construction plane parallel to YZ"
  https://forums.autodesk.com/t5/fusion-api-and-scripts-forum/point3d-create-x-and-y-coordinates-shifted-on-construction-plane/td-p/9900679

---

## Verification & honest caveat

- `python3 -m py_compile cad/braille_wearable_enclosure.py` exits 0.
- The fix is **statically validated only.** Like the residual risks in file 19 §Residual
  risk, the definitive test is the **next live Fusion run**: confirm all four lug bores cut
  through their blocks, the USB slot sits at model Z ≈ −2.79 (not +2.79), and the USB funnel
  chamfer now resolves. `modelToSketchSpace` + a symmetric extent are the established
  orientation-proof idioms, so the class of failure should be removed rather than merely
  re-tuned — but that remains an inference until Fusion executes it.
