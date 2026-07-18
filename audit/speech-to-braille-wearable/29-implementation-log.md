# 29 — Implementation Log: MONOLITH WITH REVEALS + side window

**Date:** 2026-07-18 · **Author:** implementation phase · **Implements:** file 28
(authority) + 27d (dimension detail), under 27b (fit contract).
**Target:** `cad/braille_wearable_enclosure.py` reworked from the closed-roof design to
the approved "MONOLITH WITH REVEALS + −X side window" concept.

## Definition-of-done results

| Gate | Result |
|---|---|
| `python3 -m py_compile cad/braille_wearable_enclosure.py` | exit 0 ✓ |
| `.venv/bin/python -m pytest cad/tests -q` | **41 passed** ✓ (was 27) |

All §A LOCKED fit probes pass untouched; orientation-invariance (identity / mirrored /
rotated) green with identical cage volume (23004.6 mm³) under every convention.

## Build-step map (old → new)

| Old step (closed roof) | New step (27d §4 + file 28) |
|---|---|
| 1 cage block (→+18.75) | 1 cage block — **verbatim** |
| 2 cavity (→+16.25) | 2 cavity — **verbatim** |
| 3 bosses + gussets + Ø1.8 pilots | 3 — **verbatim** (M2 BOSS_PILOT 1.8) |
| 4 LCD −Y relief (XY-sketch idiom) | 4 — **verbatim** |
| 5 `_cut_module_roof_openings` (ERM seats, hex ring, encoder bore, LCD bezel+window) | **RETIRED**, replaced by steps 5–8 below |
| — | 5 `_cut_p1_well` — P1 open reveal well, through-deck cut x[−26.5,−1.5] y[−26.5,−1.5] |
| — | 6 `_cut_grille` — P3 louvre, 5 slots 2.0×20.0, pitch 4.0, long-Y, over (+12,+12) |
| — | 7 `_cut_bezel_and_window` — P2 bezel recess 18.5×32.9×1.5 + LOCKED 13.5×27.9 window |
| — | 8 `_build_turret` — P4 hex AF20 JOIN +16.25→+23.0, AF24×1.5 reveal ring, Ø16 bore |
| 6 USB slot (orientation-proof) | 9 `_cut_usb_slot` — **verbatim idiom**; funnel now 2.0 |
| — | 9b `_cut_usb_dock` — shallow −1.0 dock recess panel (cosmetic, orientation-proof) |
| — | 9c `_cut_side_window` — −X octagonal aperture 22×12.6, 4×45° corners (file 28 §2) |
| 7 `_cut_button_strip` (shelf + 3 tool holes) | 10 `_cut_button_trench` — OPEN trench x[23.8,28.5] y±20.5, 0 mm cover (NO shelf/holes) |
| 8 lugs + Ø2.6 bores (orientation-proof) | 11 `_add_lugs` — **verbatim** |
| 9 `_add_step_rim_and_grooves` | **RETIRED** |
| 10 vert-corner chamfer | 12c `_chamfer_vertical_corners` — now **3 corners** only |
| 11 USB funnel chamfer | 12g — retuned to 2.0, threshold follows the dock floor |
| 11b lug chamfer / 11c bezel chamfer | 12e / 12f — **kept** |
| — | 12a `_reveal_chamfers` 2.5 (P1/P3/P2, sliver-guarded) |
| — | 12b `_chamfer_rim_top` 2.0 (rim top outer edge) |
| — | 12d `_chamfer_corner_clip` 6.0 ((−X,+Y) datum corner) |
| — | 12h `_chamfer_side_reveal` 1.5 (−Y relief mouth) |
| 12 skin plate + counterbores | 13 `_build_skin_plate` — **verbatim** (PLATE_HOLE 2.4 / CB 4.0×2.0) |

Preserved idioms: `_cm()`, `_pt`, `_sketch_on_xy_at`, `_rect_profile`, `_extrude`,
`_extrude_symmetric`, `modelToSketchSpace` on offset yZ planes, Part-document fallback in
`run()`, the exact unit-hex vertex list (no `math` import; imports stay adsk.* + traceback),
the geometry edge-filter chamfer pattern, and the cosmetic-vs-fit failure policy (cosmetic
wrapped → `_skipped`; fit features never wrapped).

## Constants delta (registry)

**Added (26)** — all tagged `DESIGN 27d/28 exposed rework`:
`DECK_TOP`, `DECK_INNER`, `FIELD_HALF`, `WEB_KEEPOUT`, `REVEAL_CHAMFER`, `CHAMFER_TOP`,
`CORNER_CLIP`, `P1_XLO/XHI/YLO/YHI`, `GRILLE_XLO/XHI`, `GRILLE_SLOT_W`, `GRILLE_PITCH`,
`GRILLE_COUNT`, `GRILLE_LEN`, `TURRET_AF`, `TURRET_TOP`, `TURRET_BORE` (=`ENCODER_BORE`),
`HEXRING_AF`, `HEXRING_DEPTH`, `BTN_TRENCH_XLO/XHI`, `BTN_TRENCH_HALF_Y`, `USB_DOCK_D`,
`SIDE_REVEAL_CHAMFER`, `SIDEWIN_W`, `SIDEWIN_ZLO`, `SIDEWIN_ZHI`, `SIDEWIN_CHAMF`.
(`GRILLE_SLOT_Z0`/`BTN_TRENCH_Z0` fold into `DECK_INNER`; the sliver is referenced through
`GRILLE_XLO/XHI` + `WEB_KEEPOUT`, so they are not separate literals.)

**Changed (2):** `USB_FUNNEL` 1.5 → **2.0**; `BEZEL_MARGIN` 3.0 → **2.5** (recess 18.5×32.9).

**Retired (9):** `RIM_W`, `RIM_STEP`, `GROOVE_W`, `GROOVE_D`, `MODULE_SEAT_D`, `HEX_AF`,
`HEX_DEPTH`, `BTN_HOLE_DIA`, `BTN_SHELF_TOP`. (`HEX_AF`/`HEX_DEPTH` superseded by
`TURRET_*`/`HEXRING_*`.)

**Header comment block** rewritten (aesthetic description now the MONOLITH concept);
`_register_parameters` dropped `groove_w/groove_d/rim_w`, added deck/reveal/turret/grille/
trench/sidewin/corner-clip params; `run()` messageBox summary rewritten.

## Test changes (file 28 §3.4)

- **Kept untouched:** every §A fit probe (lug bores, USB slot air/roof, encoder Ø16,
  LCD window, boss pilot/annulus, −Z pocket, +X wall, plate centre/CB/through-hole),
  two-bodies, both document paths, orientation-invariance suite, the boolean-miss net
  (`test_lug_bore_would_fail_without_fix`, `test_mirrored_raw_coords_would_miss`).
- **Added** a bay keep-out probe (AIR at the board plane origin).
- **Removed** the 3 retired button-shelf/hole probes; **added** the reveal probes: P1 well
  AIR, grille rib SOLID + slot AIR, turret wall SOLID + bore AIR, bezel recess AIR + deck
  SOLID below floor, trench AIR, side-window AIR/SOLID×4, deck-top SOLID/AIR.
- `test_cage_bbox`: max Z updated **18.75 → 23.0** (proud turret breaks the deck plane).
- Registry invariants: added `DECK_TOP/DECK_INNER`; new `test_monolith_reveal_registry`
  (all new constants) and `test_retired_constants_absent` (9 dead constants gone).
- No change needed to `fake_adsk`: the mock's existing extrude/boolean/chamfer surface
  covered every new API call (offset-yZ symmetric cuts, JOIN hex column, chamfer edge-sets).

## Deviations from 27d / 28

1. **Turret sub-step order (27d §4 step 8).** 27d lists the AF20 turret JOIN (a) *before* the
   AF24 reveal-ring CUT (b). Executed literally, a solid AF24 recess cut 1.5 deep slices
   through the AF20 turret base (AF20 < AF24) and **severs** the proud column from the deck.
   Implemented order is ring-CUT → turret-JOIN → bore-CUT, which yields the *identical
   described geometry* (proud hex rising from a hex reveal-ring recess, ring only in the
   AF24−AF20 annulus) while keeping the column connected. Dimensions unchanged; only the
   op order within step 8 differs. This is a build-order correction, not a dimensional change.

No other deviations. The accepted P2/P3 spine sliver (file 28 §1 risk 2) is honoured, not
"fixed": the reveal-chamfer edge selection position-filters out the sliver band
(0 ≤ y ≤ 3, GRILLE_XLO ≤ x ≤ GRILLE_XHI) so the 2.5 chamfer can never zero the ~1–2 mm web —
those edges are dropped (cosmetic-safe), never bevelled. No §A anchor conflict arose.
