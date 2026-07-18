# 24 — Phase 3: Correction Log (applying file 23 §c to the CAD script)

**Date:** 2026-07-17
**Driven by:** `23-phase2-reference-delta.md` §(c) — the reference-shell (M2) delta change list.
**Target:** `cad/braille_wearable_enclosure.py` (Fusion 360 Python API script).
**Method:** systematic-debugging discipline — each edit verified against the change list; no
speculative extra changes. Reference for every value change:
`cad/reference/genesis-mini-shell.step`.

---

## Applied changes

| Constant / location | Old | New | Reason |
|---|---|---|---|
| `BOSS_PILOT` | 2.5 | **1.8** | Item 1. M2 self-tap pilot (ref plate bore Ø1.8, ~90 % of major); was the M3 pilot. Registry line tagged `CORRECTED … (was 2.5)`. |
| `PLATE_CB_DIA` | 6.0 | **4.0** | Item 2. M2 head recess per reference Ø4.0. Tagged `CORRECTED … (was 6.0)`. |
| `PLATE_CB_D` | 1.5 | **2.0** | Item 3. Sink an M2 pan/cap head (≤2.0) flush in the wrist-facing skin. Tagged `CORRECTED … (was 1.5)`. |
| `PLATE_HOLE_DIA` (NEW) | — | **2.4** | Item 4. New M2 clearance through-hole constant, placed by `PLATE_CB_DIA` in the registry. `_build_skin_plate` through-hole switched from `BOARD_HOLE_DIA` to this; comment block added explaining a Ø3.4 hole under a Ø4.0 head recess would leave only a 0.3 mm bearing ring. The one geometry-logic change the M2 switch forces. |
| `BOARD_HOLE_DIA` | 3.4 | 3.4 (comment-only) | Item 5. Retagged: measured BOARD hole Ø3.4 (HIGH), loose slip over the M2 screw body — no longer described as "M3 clearance". Value unchanged; no longer feeds the plate through-hole. |
| `BOSS_DIA` | 7.0 | 7.0 (comment-only) | Item 6. Comment "M3 boss/standoff" → "M2 boss/standoff". Value unchanged (matches reference plate bosses Ø7.0; 3.9× the Ø1.8 pilot). |
| `_register_parameters` strings | — | — (comment-only) | Item 7. `board_hole_dia` "M3 clearance" → "M2 slips through"; `boss_dia`/`boss_pilot` "M3" → "M2"; ADDED `("plate_hole_dia", PLATE_HOLE_DIA, "Plate M2 clearance hole (CORRECTED, reference shell)")`. |
| `run()` messageBox | "4x M3 standoffs" | "4x M2 standoffs" (comment/text-only) | Item 8. |
| Screw-note comments | M3 | M2 (comment-only) | Item 9. `_add_bosses_and_gussets` docstring "4x M3" → "4x M2"; `# Ø2.5 self-tap pilot…` → `# Ø1.8 M2 self-tap pilot…`; added shopping note `~M2x5 board-side / ~M2x6 plate-side`. File-header STRAP note left as-is (it references Ø2.5 strap spring-bar pins, not screws — not an M3 screw note). |
| Stale Z-map comments | 6.0-era | 6.5-live (comment-only) | Item 10. `Z_POCKET_FL`/`Z_PLATE_TOP` comment −7.6 → −8.1; `Z_PLATE_BOT` −10.6 → −11.1; `_build_cage_block` "29.35 mm tall" → 29.85; `_add_bosses_and_gussets` gusset "-7.6 -> -5.1" → "-8.1 -> -5.6", "6 mm -Z pocket span" → "6.5 mm", standoff "-7.6 -> -1.6 (6.0 tall)" → "-8.1 -> -1.6 (6.5 tall)"; `_build_skin_plate` "-10.6 -> -7.6" → "-11.1 -> -8.1"; `LUG_BORE_Z` comment "plate top -7.6" → -8.1. No constant values changed by this item. |

Plus two comment-only extensions of the above (documented under Deviations): the
`_build_skin_plate` line comment "counterbore for the M3 head" → "M2 head" (completes items 2/3),
and the `run()` timeline comment "# 3  4x M3 standoffs …" → "M2 standoffs" (completes item 9/8).

## Verification

- `python3 -m py_compile cad/braille_wearable_enclosure.py` → **exit 0** (run 2026-07-17).
- `PLATE_HOLE_DIA` defined exactly once (registry) and consumed in `_build_skin_plate`'s
  through-clearance circle; `BOSS_PILOT` = 1.8 drives the pilot cut in `_add_bosses_and_gussets`.
- No geometry call retains a BOSS_PILOT = 2.5-era or M3-head assumption (grep clean for
  `Ø2.5 self`, `M3 head`, `M3 standoff`, `2.5 … pilot`).

## Not changed (fit-critical constants deliberately left alone per file 23 §a/§b/§c)

`BAY_CLEAR` 1.0 · `WALL` 2.5 · `ROOF_THICK` 2.5 · `PLATE_T` 3.0 · USB slot `USB_SLOT_W`/`USB_SLOT_H`
12/7 + `USB_FUNNEL` 1.5 · module seat 24.6 (`MODULE_SQ` + 2·`MODULE_CLEAR_ROW`) · LCD window
`LCD_WIN_W`/`LCD_WIN_H` 13.5/27.9 · `ENCODER_BORE` 16.0 · `BOARD_HOLE_X` 24.1. Each carries a
documented reason in file 23 (reference less conservative, or our architecture-specific evidence).
The `_cm()` helper, feature order, the run() Part-vs-Assembly try/except block, and the coordinate
datum were untouched.

## Deviations from the change list

None material. Two comment-only edits go one line beyond the literal §c wording, both completing a
listed item on the exact feature being corrected (so the M3 label would otherwise contradict the
new M2 geometry): `_build_skin_plate`'s "M3 head" → "M2 head" (items 2/3) and the `run()` timeline
comment "4x M3 standoffs" → "M2 standoffs" (items 8/9). No values move.

Two remaining "M3" comment strings were **left unchanged and are flagged** for the caller: line 71
`BOARD_HOLE_X` "M3 hole centres" and line 229 param string "M3 hole centre offset". `BOARD_HOLE_X`
value (24.1) is explicitly locked by §c, and §c item 7 lists `board_hole_dia` but deliberately
omits `board_hole_x` — so these were treated as out of the list's scope rather than swept
speculatively. They describe the (now-M2) hole pattern and could be relabelled in a future pass if
desired.
