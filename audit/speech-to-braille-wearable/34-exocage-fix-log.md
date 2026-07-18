# 34 — EXO-CAGE + MONOLITH fix log (post files 32/33 adversarial reviews)

**Date:** 2026-07-18 · **Author:** fix agent · **Targets:**
`cad/braille_wearable_exocage.py`, `cad/braille_wearable_enclosure.py`,
`cad/tests/test_exocage_build.py`, `cad/tests/test_enclosure_build.py`.

Two adversarial reviews (file 32 "The Machinist", file 33 "The Skeptic") found
CRITICAL defects in the exo-cage (14-lump body: floating gussets + post-corner
splinters; posts intruding into module footprints; screw bores breaching post
walls; turret impossible against the measured encoder can). An orchestrator
STEP re-measurement of the encoder can found the same latent collar defect in
the monolith. All design decisions below were fixed by the orchestrator; this
log records the geometry, the two computed decisions (E3, M1), and the gates.

---

## Encoder can lateral-material measurement (orchestrator, primary)

From `parts/Axiometa Genesis Mini - Starter Kit/rotary-encoder/files/AX22-0003.step`,
slice bounding boxes; mated model_z = module_local_z − 1.515 + 11.56. Radius =
max distance from the shaft axis at (−12,+12).

| model Z band | slice extent | max radius | note |
|---|---|---|---|
| +12.0 .. +14.1 | 19.7 × 18.4 | **13.51** | widest can body |
| +14.1 .. +16.1 | 14.9 × 11.7 | **9.59** | |
| +16.1 .. +18.05 | 13.8 × 11.7 | **9.32** | can top ≈ model **+18.05** |
| +18.05 .. +20 | 10.0 × 7.0 | **7.37** | bushing / nut band |
| above +20 | — | ≤ 4.95 | knurl / shaft |

**This supersedes the "≥Ø16 from +13" anchor.** The Ø16 figure was knob-based
and is WRONG below +18.05: the can itself is r13.51 at the base and r9.32 up to
+18.05, so no sub-+18.6 collar/turret can enclose it. Consequences: the exo-cage
turret is impossible (→ deleted, E4); the monolith bore must be Ø20 (→ M1).

---

## Fix-by-fix table

| ID | file | what changed | old → new |
|---|---|---|---|
| E1 | exocage | Corner posts rebuilt as a PENTAGON (9×9 square minus a 45° inner-corner triangle, leg `POST_CUT`=3.5) so no post material lies in the module L-keep-out. New `POST_CUT`; `_add_posts` rewritten. | square post inner faces ±22 (−1.0 mm into module) → pentagon hyp \|x\|+\|y\|≥47.5 (clear of L-region max 47.3) |
| E2 | exocage | DELETED the Ø4.5 post screw-access bores (screws drive from the open wrist side). Removed `_cut_post_screw_bores`, `SCREW_ACCESS_DIA`, its param, its 2 probes. | 4× Ø4.5 bores breaching post inner wall (−0.15 mm wall, 5 splinters) → none |
| E3 | exocage | DELETED 8 floating gussets; added 4 top CORNER PLATES (`_add_corner_plates`, `PLATE_LEG`=7.5). Each a horizontal triangle at z 10.5..13 (WEB_T thick, top flush at Z_DECK_TOP), right angle at (±31,±31), volumetrically overlapping the post pentagon. (+X,−Y) plate CLIPPED (see below). | 8 line-contact gusset prisms inside module footprints → 4 post-fused corner plates |
| E4 | exocage | DELETED the hex turret + both rim bridges; encoder is fully BARE. Removed `_build_turret`, `_join_hex_column`, `_hex_pts_uv`, `ENCODER_BORE`, `HEX_AF_TURRET`, `Z_TURRET_BOT`, `Z_TURRET_TOP` + params. Header + messageBox updated. | AF21 turret + Ø16 bore + 2 bridges → total absence (open air) |
| E5 | exocage | `USB_FUNNEL` reduced (only 1.29 mm lintel above the slot). | 1.5 → **1.0** |
| E6 | exocage | Header BOARD-INSERTION note: boss pads (z −8.1..−5.6) snag a flat 55×55 drop-in ~1 mm; tilt-insert clears. Comment-only. | — |
| E7 | exocage | Comment corrections: `LCD_PCB_W`/`LCD_PCB_H` axis labels (29 = board-Y after mate, 22 = board-X); removed false "clears modules" / "gussets close the top" claims; load-path note = base tube + plate + posts + L-rim + corner plates. | — |
| M1 | enclosure | Encoder bore + turret + hex-ring enlarged to clear the measured can (r9.32 to +18.05). Source-tagged `CORRECTED — encoder can measured r9.32 to model +18.05 (file 34)`. | `ENCODER_BORE` 16→**20**; `TURRET_AF` 20→**24**; `HEXRING_AF` 24→**28** (`TURRET_BORE` tracks bore 16→20) |

---

## E3 — plate-vs-LCD-relief computation & decision

The (+X,−Y) top corner plate spans x 23.5..31, y −31..−23.5, z 11..13, with
material where |x|+|y| ≥ 2·CAGE_HALF − PLATE_LEG = **54.5**. The LCD PCB-overhang
relief envelope (which must stay AIR) is x −0.3..24.3, |y| 22..30.5, z 9.5..15.

- Unclipped overlap: the plate hypotenuse enters the relief only where x ≤ 24.3
  AND |x|+|y| ≥ 54.5 AND |y| ≤ 30.5 → a sliver x∈[24.0,24.3], |y|∈[54.5−x, 30.5],
  roughly 0.3 × 0.5 mm. **A real (if tiny) overlap** — confirmed by computation.
- Decision: **CLIP that one plate's +/−Y-wall leg to x ≥ 24.5** (inner vertex
  moved from x 23.5 → 24.5; triangle becomes (31,−31),(24.5,−31),(31,−23.5)).
  Min plate x = 24.5 > relief max x 24.3 → no overlap. The plate still overlaps
  the +X/−Y post pentagon fully (all its points have |x|+|y| ≥ 55.5 ≥ 47.5), so
  it still fuses into one lump. The other 3 plates are unclipped (their L-region
  overlap is empty: region max |x|+|y| = 48.6 < plate 54.5).

Chosen: **clip** (not delete) — keeps a functional corner tie at the −Y-open
weak corner. (Note: the relief CUT at step 14 would also have removed the sliver,
but clipping proactively leaves a clean plate rather than a notched one.)

---

## M1 — hex-ring recess computation & decision

`HEXRING_AF` 28: circumradius = 28/2 / cos30 = **16.166**. In this script the hex
vertices point ±Y and flats face ±X (`_hex_pts_uv`), so from the encoder axis
(−12,+12):

- X reach: −12 ± 14.0 → **[−26.0, +2.0]** (via the ±X flats)
- Y reach: +12 ± 16.166 → **[−4.17, +28.17]** (via the ±Y vertices)

**Correction to the prompt's hypothesis:** the prompt expected the recess to
reach x −28.2 and overlap the −X rim. With the actual hex orientation the max
excursion beyond `FIELD_HALF` (26.5) is in **+Y**, reaching y ≈ **28.17** — NOT
−X. It overshoots the rim-inner edge (26.5) by 1.67 mm but stays **inboard of the
28.5 wall** (28.17 < 28.5).

Rim-thinning check: the recess is only 1.5 mm deep (deck top 18.75 → 17.25) and
reaches y 28.17, so it removes only the top 1.5 mm of the deck rim-band between
y 26.5..28.17. The load-bearing **perimeter wall (y 28.5..31, full height
−11.1..+18.75) is untouched** → rim wall ≥ 2.5 mm intact, well above the 2.0
floor. Probe (0, 29.75, 17) = SOLID confirms it.

Decision: **keep `HEXRING_AF` 28** (do NOT drop to 26). The overlap is a shallow
cosmetic incursion into the deck-top surface only; nothing structural is thinned
below 2.0. Documented that the incursion is +Y, not −X.

Knock-on checked & accepted: the AF24 turret's −Y vertex now reaches y −1.86 (was
+0.45 at AF20), grazing the top edge of the P1 well footprint at x −12; but at
z ≥ 16.25 it sits 1.0 mm above the motor top (15.25) — no collision, a cosmetic
0.36 mm sliver over the well's upper edge. Ø20 bore (r10) clears the can (r9.32)
by +0.68; AF24 keeps a 2.0 mm wall at the flats around the Ø20 bore.

---

## Test-suite hardening (both modules)

- **T1** single-lump connectivity: `len(body.solid.solids()) == 1` for `cage`
  and `skin_plate` in BOTH suites (`test_cage_and_plate_single_lump`). Catches
  the file-33 F1 class (floating fragments) forever. Verified: exo-cage cage went
  from 14 lumps → **1**; plate 1.
- **T2** lateral module-clearance + encoder-band probes:
  - exo-cage: AIR at the L-keep-out sentinels (23.5,22.5)/(22.5,23.5) per P1/P3/P4
    corner at z +5 and +10; posts SOLID at (±26,±26,+10); AIR within r10 of
    (−12,+12) at z +13/+15/+17 (r9.9 compass points) — encoder bare.
  - monolith: AIR inside the Ø20 bore at r9.9 (z +17/+18); SOLID in the AF24
    turret wall at the flats (−1.5,12)/(−22.5,12) (r10.5); +Y perimeter wall SOLID.
- **T3** USB slot-height material probes (both): AIR at (29.75,0,−2.79±3.4),
  SOLID at (29.75,0,−2.79±3.6) — a slot-height regression now flips a geometry
  probe, not just the registry pin.
- **T4** registry invariants updated for all changed/retired constants: exo-cage
  drops `SCREW_ACCESS_DIA`/`GUSSET_LEG`/`HEX_AF_TURRET`/`Z_TURRET_*`/`ENCODER_BORE`
  (added to `test_removed_features_absent` + new `test_deleted_functions_absent`),
  adds `POST_CUT`/`PLATE_LEG`, `USB_FUNNEL` 1.5→1.0; monolith asserts
  `ENCODER_BORE` 20 / `TURRET_AF` 24 / `HEXRING_AF` 28 / `TURRET_BORE` 20 and the
  2.0-wall relation.

---

## Test-count delta

| suite | before | after | delta |
|---|---|---|---|
| test_enclosure_build.py | 41 | **52** | +11 (T1 + 10 new probes) |
| test_exocage_build.py | 55 | **76** | +21 (T1 + T2/T3 probes + deleted-fns test − 1 retired turret-wall probe) |
| **total** | **96** | **128** | **+32** |

---

## Gate outputs

**Gate 1 — py_compile (exit 0):**
```
$ python3 -m py_compile cad/braille_wearable_exocage.py   -> EXOCAGE_COMPILE=0
$ python3 -m py_compile cad/braille_wearable_enclosure.py -> ENCLOSURE_COMPILE=0
```

**Gate 2 — pytest (fully green):**
```
$ .venv/bin/python -m pytest cad/tests -q
128 passed in 54.41s
  (test_enclosure_build.py: 52 passed; test_exocage_build.py: 76 passed)
```

**Gate 3 — this file (34).**

---

## Geometrically-impossible prescriptions

None were impossible. Two prompt sub-hypotheses were CORRECTED (not the fixes
themselves, which all realized cleanly):
1. E3: the prompt asked to CHECK whether the (+X,−Y) plate overlaps the LCD
   relief — it DOES (computed 0.3×0.5 mm sliver); resolved by clipping the leg to
   x ≥ 24.5 (kept the plate).
2. M1: the prompt predicted the AF28 ring would reach **x −28.2** and possibly
   thin the −X rim; the actual hex orientation makes it reach **+Y ≈ 28.17**
   instead, and it stays inboard of the 28.5 wall — so `HEXRING_AF` 28 is kept
   (no thinning below 2.0), not dropped to 26.
