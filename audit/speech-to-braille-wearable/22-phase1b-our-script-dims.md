# 22 — Phase 1 / Track B: OUR Script Dimension Table (for reference-shell diff)

**Date:** 2026-07-17
**Role:** Phase 1 / Track B of the CAD validation pipeline. Tabulates what OUR enclosure
script currently *encodes* — reported from the live constants (evidence = constant name),
never from intent or from stale inline comments. Derived values show their arithmetic.
**Sources read (ONLY these):**
- `cad/braille_wearable_enclosure.py` — DIMENSION REGISTRY block + derived Z-map + build steps
- `audit/speech-to-braille-wearable/20-enclosure-cad-consolidated.md` — §1 truth table, §2 UNKNOWN-CONFIRMED
- `audit/speech-to-braille-wearable/16-phase1-reconciled-dims.md` — constant provenance context
**Strict isolation honoured:** nothing under `cad/reference/` was read; no STEP opened or measured.

Frame: origin = board centre; +X = USB/button edge; +Z = outer face; board TOP face at model Z = 0.

---

## Live Z-map (arithmetic, from constants — NOT the stale inline comments)

The script's inline comments in the `--- Derived Z-map ---` block still show values for an
older `NEG_Z_POCKET = 6.0`. The **live** constant is `NEG_Z_POCKET = 6.5`, so the real
computed values are 0.5 mm deeper on the −Z side. The values below are what the code actually
computes and what geometry consumes (and they match file 20 — see the note at the end).

| Z datum | Constant expression | Live value (mm) | Stale code comment |
|---|---|---|---|
| `Z_BOARD_TOP` | 0.0 | **0.00** | 0.0 |
| `Z_BOARD_BOT` | −`BOARD_THICK` | **−1.60** | −1.6 |
| `Z_POCKET_FL` / `Z_PLATE_TOP` | `Z_BOARD_BOT − NEG_Z_POCKET` = −1.6 − 6.5 | **−8.10** | −7.6 (stale) |
| `Z_PLATE_BOT` | `Z_PLATE_TOP − PLATE_T` = −8.1 − 3.0 | **−11.10** | −10.6 (stale) |
| `Z_ROOF_INNER` | `MOTOR_TOP + ROOF_CLEAR` = 15.25 + 1.0 | **+16.25** | +16.25 ✓ |
| `Z_ROOF_OUTER` | `Z_ROOF_INNER + ROOF_THICK` = 16.25 + 2.5 | **+18.75** | +18.75 ✓ |
| `CAVITY` | `BOARD_BAY + 2·BAY_CLEAR` = 55 + 2 | **57.00** | 57.0 ✓ |
| `CAGE_OUTER` | `BOARD_BAY + 2·BAY_CLEAR + 2·WALL` = 55 + 2 + 5 | **62.00** | 62.0 ✓ |
| `USB_SLOT_CZ` | `(USB_REC_ZLO+USB_REC_ZHI)/2 + Z_BOARD_BOT` = (−3.29+0.91)/2 − 1.6 | **−2.79** | (n/a) |

---

## 1. Our current enclosure dimensions

| # | feature | our value (mm) | source (constant name / derived) | conf |
|---|---|---|---|---|
| 1 | `cage_outer_footprint` | **62.0 × 62.0** | derived: `CAGE_OUTER = BOARD_BAY(55) + 2·BAY_CLEAR(1.0) + 2·WALL(2.5)` | DESIGN (on HIGH board 55) |
| 2 | `corner_treatment` | **chamfer 3.0**, equal-distance, 4 vertical outer corners (NOT fillet) | `CHAMFER_VERT` (applied in `_chamfer_vertical_corners`) | DESIGN |
| 3 | `cage_total_height` | **29.85** total Z = `Z_ROOF_OUTER(+18.75) − Z_PLATE_BOT(−11.10)`. Device thickness ≈ **29.9**, file 20 §1 quotes "≈29.9 (plate bottom −11.1 → roof +18.75)" | derived from Z-map (`MOTOR_TOP`+`ROOF_CLEAR`+`ROOF_THICK` over `NEG_Z_POCKET`+`PLATE_T`+`BOARD_THICK`) | DESIGN on measured stack |
| 4 | `board_bay_inner` | **57.0 × 57.0** | `CAVITY = BOARD_BAY(55, HIGH) + 2·BAY_CLEAR(1.0)` | HIGH board / DESIGN clear |
| 5 | `bay_clearance_per_side` | **1.0** per side | `BAY_CLEAR` | DESIGN |
| 6 | `board_bay_depth` | −Z pocket depth **6.5** (`NEG_Z_POCKET`); board-bottom→roof-inner span = `Z_ROOF_INNER(+16.25) − Z_BOARD_BOT(−1.60)` = **17.85** | `NEG_Z_POCKET`; derived span | DESIGN / HIGH stack |
| 7 | `boss_positions` | 4× at **(±24.1, ±24.1)** | `(±BOARD_HOLE_X, ±BOARD_HOLE_X)` | HIGH (row 3) |
| 8 | `boss_inner_pilot_dia` | pilot **Ø2.5** (self-tap; script assumes **M3**); plate through-holes **Ø3.4** | `BOSS_PILOT`=2.5, `BOARD_HOLE_DIA`=3.4 | DESIGN pilot / HIGH hole |
| 9 | `boss_outer_dia` **Ø7.0**; `boss_height` **6.5** | Ø7.0; height = `Z_BOARD_BOT(−1.60) − Z_PLATE_TOP(−8.10)` = 6.5 (spans the −Z pocket) | `BOSS_DIA`; derived extrude in `_add_bosses_and_gussets` | DESIGN |
| 10 | `module_pocket_size` (ERM roof seat) | **24.6 × 24.6**, depth **2.0** — roof-side (+Z) recesses, NOT side pockets | seat = `MODULE_SQ(22) + 2·MODULE_CLEAR_ROW(1.3)`; depth `MODULE_SEAT_D` | HIGH size / DESIGN depth |
| 11 | `lcd_window_cut` **13.5 × 27.9** at **(11.98, −14.38)**; `lcd_bezel_recess` margin **3.0**/side (→19.5 × 33.9), depth **1.5**, chamfer **1.0** | `LCD_WIN_W`×`LCD_WIN_H` at (`LCD_WIN_CX`,`LCD_WIN_CY`); `BEZEL_MARGIN`,`BEZEL_D`,`CHAMFER_BEZEL` | HIGH window / DESIGN bezel |
| 12 | `encoder_shaft_bore` **Ø16.0** at **(−12, +12)**; shaft `ENC_SHAFT_DIA` **Ø6.0**; hex ring **22.0** across-flats × **2.0** deep | `ENCODER_BORE` at (`ENC_X`,`ENC_Y`); `ENC_SHAFT_DIA`; `HEX_AF`,`HEX_DEPTH` | DESIGN bore/hex / HIGH axis+shaft |
| 13 | `usb_slot` **12.0 × 7.0**, +X wall, Y=0, centre Z **−2.79**, funnel chamfer **1.5** | `USB_SLOT_W`×`USB_SLOT_H`; `USB_SLOT_CZ` (see Z-map); `USB_FUNNEL` | DESIGN slot / HIGH receptacle Z |
| 14 | `wall_thickness` **2.5** (all 4 walls); `roof_thickness` **2.5**; `plate_thickness` **3.0** | `WALL`; `ROOF_THICK`; `PLATE_T` | DESIGN |
| 15 | `plate_features` — outline **57 × 57** (`CAVITY`), through-hole **Ø3.4**, counterbore **Ø6.0 × 1.5** deep | plate `CAVITY×CAVITY`; `BOARD_HOLE_DIA`; `PLATE_CB_DIA`×`PLATE_CB_D` | HIGH hole / DESIGN plate+CB |
| 16 | `lug_features` — gap **22.0**, bore **Ø2.6**, block W **6.0**, projection **5.0**, height **8.0**, bore-centre Z **−3.0**, tip chamfer **1.5** | `LUG_GAP`,`LUG_BORE`,`LUG_W`,`LUG_PROJ`,`LUG_H`,`LUG_BORE_Z`,`CHAMFER_LUG` | DESIGN |
| 17 | `roof_steps` / `button_access` — shelf outer Z **5.0**, access channel x **23.0…28.5** (`CAVITY_HALF`); button holes **Ø4.0** at x=25.76, y = +17/0/−17; stack: `MOTOR_TOP` 15.25 + `ROOF_CLEAR` 1.0 → `Z_ROOF_INNER` +16.25, `Z_ROOF_OUTER` +18.75 | `BTN_SHELF_TOP`; channel `ch_lo/ch_hi` in `_cut_button_strip`; `BTN_HOLE_DIA` at `BTN_X`,±`BTN_Y`; Z-map | HIGH btn pos / DESIGN shelf |
| 18 | `misc` — step-rim lip **2.0** wide × **1.0** step; grooves **1.0** wide × **0.5** deep (cross); gussets **9.0 × 9.0 × 2.5**; LCD wall relief (see below) | `RIM_W`,`RIM_STEP`; `GROOVE_W`,`GROOVE_D`; `GUSSET_SQ`,`GUSSET_T`; `_cut_lcd_relief` | DESIGN |

**LCD wall relief geometry (`_cut_lcd_relief`, row 18 detail):** notch in the −Y wall for the
2.5 mm LCD-PCB overhang. Derived spans:
- y_out = `−(BOARD_BAY/2 + LCD_OVERHANG + 0.5)` = −(27.5 + 2.5 + 0.5) = **−30.5** (leaves 0.5 outer web)
- y_in = `−CAVITY_HALF` = **−28.5**
- x-width = `LCD_PCB_H(22) + 2·MODULE_CLEAR_ROW(1.3)` = **24.6**, centred at `LCD_PCB_CX`=12 → x **−0.3…+24.3**
- z-band = **9.5…15.0** (`z_lo`, `z_hi` literals, module-PCB band + margin)

Table row count: **18 canonical features** (plus the LCD-relief sub-detail and the 9-row Z-map).

---

## 2. UNKNOWN-CONFIRMED — caliper BEFORE printing (from file 20 §2, verbatim-in-substance)

Five items our shell cannot resolve from geometry alone; each needs a physical caliper/fit check.

1. **ERM coin diameter + protrusion.** STEP modelled a rectangular placeholder, not the coin.
   Datasheet-typical Ø10 × 2.7 (LCSC C2759984), but stated electricals (90 mA/12 000 rpm) differ
   slightly from that SKU (80 mA/13 500) — possibly a sibling part. *Why unknown:* no coin solid
   in the STEP; SKU ambiguity. Our roof seat (24.6, 1.0 mm Z clearance) fits any Ø8–12 coin; only
   re-check if a local coin recess is ever added.
2. **Module X-registration ±1.27.** STEP socket/header footprints are pin-level incoherent
   (0.16 mm grid mismatch) and pin-1 polarity is not in the geometry. *Why unknown:* a module
   could register one half-pitch off. Dry-fit each module; our pockets carry ≥1.3 mm clearance
   either way (`MODULE_CLEAR_ROW`).
3. **Encoder knob OD.** No knob in the STEP; EC11 knobs vary. *Why unknown:* knob not modelled.
   Caliper the fitted knob; our roof bore is `ENCODER_BORE` = Ø16 (enlarge the parameter if bigger).
4. **Board hole Ø3.4 vs corpus Ø2.7 (M3 vs M2.5).** Our geometry encodes **Ø3.4 twice
   independently** (`BOARD_HOLE_DIA`=3.4 plate through-hole; `BOARD_HOLE_X`=24.1 M3 centres); the
   corpus text said Ø2.7 (that was the *modules'* hole figure). *Why unknown:* STEP-vs-corpus
   conflict (C1) — **this is the item about to be tested against the reference shell.** Drop an M3
   screw through a physical board corner hole; if it does NOT pass, switch to M2.5 screws (the
   bosses' Ø2.5 pilots still work; print unaffected).
5. **Seating assumption.** Stack heights assume the header plastic base bottoms on the socket
   shroud (measured geometry supports it). *Why unknown:* pin-in-socket depth not fully
   constrained. Dry-fit one module; caliper module-PCB-top height (expect ≈11.6); if it rides
   higher, the roof still has 1.0 mm clearance (`ROOF_CLEAR`) before collision.

---

## 3. Module layout OUR shell encodes (layout-dependent — do NOT diff against reference)

These positions are OUR placement decisions (silk-port-bound, diagonal-rule driven). The diff
step must treat them as layout-dependent and NOT compare them to the reference shell's measured
positions.

| Position | Item | Centre / X (mm) | Constants |
|---|---|---|---|
| P1 | ERM Motor A | (−12, −12) | `MOTOR_A_X`, `MOTOR_A_Y` |
| P2 | IPS LCD | PCB centre (+12, −15.5); glass (+11.98, −14.38) | `LCD_PCB_CX/CY`, `LCD_WIN_CX/CY` |
| P3 | ERM Motor B | (+12, +12) — diagonal to P1, 33.9 mm | `MOTOR_B_X`, `MOTOR_B_Y` |
| P4 | Encoder | (−12, +12), shaft axis exact | `ENC_X`, `ENC_Y` |
| — | 3 onboard buttons | x = **25.76**, y = +17 / 0 / −17 | `BTN_X`, ±`BTN_Y` |

---

## Consistency check (script vs file 20)

**No script-vs-file-20 inconsistency in encoded values.** Every dimension our script computes
matches file 20 §1 — notably the −Z side: file 20 states "plate bottom −11.1 → roof +18.75,
total ≈29.9", and the live constants compute `Z_PLATE_BOT = −11.10`, `Z_ROOF_OUTER = +18.75`,
total **29.85 ≈ 29.9**. The Ø3.4 board hole, (±24.1) centres, 62×62 cage, 57×57 bay, 2.5 walls,
2.5 roof, 3.0 plate, USB 12×7 + 1.5 funnel, lug gap 22.0 / bore Ø2.6, and the module layout all
agree with file 20 and file 16.

**One internal (script-only) discrepancy noted, honestly:** the inline comments in the script's
`--- Derived Z-map ---` block (and a few geometry-step comments) are **stale** — they show values
for an older `NEG_Z_POCKET = 6.0` (plate top −7.6, plate bottom −10.6, boss "6.0 tall", cage
"29.35 mm tall"). The **live** constant is `NEG_Z_POCKET = 6.5`, so the code actually computes
plate top −8.1, plate bottom −11.1, boss height 6.5, cage height 29.85. The *computed* geometry
(what gets built, and what matches file 20) is correct; only the human-readable comments lag by
0.5 mm. This does not change any built dimension — flagged so a future reader does not trust the
stale −7.6/−10.6/29.35 comment values over the constants.
