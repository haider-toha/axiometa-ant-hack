# 23 — Phase 2: Reference-Shell Delta Analysis (file 21 vs file 22)

**Date:** 2026-07-17
**Type:** Orchestrator-level row-by-row diff of the reference shell measurements
(`21-phase1a-reference-shell-dims.md`, from `cad/reference/genesis-mini-shell.step`) against our
script's encoded dimensions (`22-phase1b-our-script-dims.md`, from
`cad/braille_wearable_enclosure.py`). Grill-me interrogation applied to every fit-critical delta.
**Verdict legend:** ✅ MATCH (≤0.5 mm / same category) · ⚠️ DELTA (>0.5 mm or categorical,
resolution recorded) · ❌ ABSENT (feature exists on one side only).

**Architectural context (governs which rows are portable).** The reference is a two-part
clamshell *game console* (face shell + 10 mm back-plate tray, no strap, no motors): its screw
bosses hang DOWN from the face slab, the module PCBs seat face-side in shallow 22×22 pockets, and
the board rides the socket stack down into the plate tray. Ours is a wrist wearable: plate-side
standoffs, board near the skin plate, motors under a raised roof, lugs. Therefore Z-architecture
rows (bay depth, boss height, total height, which wall carries USB) are compared for *reasoning*
but are NOT ported. The portable set is: screw standard / boss drilling, hole pattern, wall-thickness
evidence, module PCB fit evidence, and clearance philosophy.

---

## (a) Full comparison table

| # | Feature | Reference (file 21) | Ours (file 22) | Verdict | Resolution |
|---|---|---|---|---|---|
| 1 | `cage_outer_footprint` | 60.0 × 63.0 | 62.0 × 62.0 | ✅ | Same class (~60 mm shell around the same board). Different exact envelope is architecture (their Y=63 carries the logo strip; our 62 carries 2.5 walls). **No change.** |
| 2 | `corner_treatment` | Rounded, R≈3.5 verticals + chamfered top/bottom edges | Chamfer 3.0, verticals | ⚠️ categorical | Aesthetic, LOCKED brutalist choice on our side. The reference proves rounded also prints fine — irrelevant to fit. **Keep chamfer 3.0.** |
| 3 | `cage_total_height` / `assembled_total_height` | shell 17.0 + plate 10.0, assembled ≈25 (LOW conf, exploded STEP) | 29.85 total | ⚠️ 4.9 | Architecture, resolved by stack math (§b Q3): the console has no ERM motors (tallest face-side item is a flat module), so its face sits ~2.0 over the module PCBs. Our +Z half must clear motor top +15.25 (+1.0 clear +2.5 roof). Δ is fully explained by the motor stack. **Keep 29.85.** |
| 4 | `board_bay_inner` | 55.15 × ~55 (shell) / 55.0 × 55.0 (plate tray) — net fit | 57.0 × 57.0 | ⚠️ 2.0 | §b Q2. Reference locates the board by its bay WALLS (hence net fit); we locate by 4 screw bosses at ±24.1 — bay walls are secondary. Reference is LESS conservative; per task rule (prefer the conservative value for fit) ours stands. **Keep 57.0 (BAY_CLEAR 1.0).** |
| 5 | `bay_clearance_per_side` | ≈0.05–0.08 | 1.0 | ⚠️ | Same resolution as #4. **No change.** |
| 6 | `board_bay_depth` | board/module seat at shell Z≈11; ~6 mm module space above | −Z pocket 6.5; board-bot→roof-inner 17.85 | ⚠️ architectural | Not portable (opposite cradle direction). NOTE: file 21's "board seats against boss shoulders at Z≈11" is more plausibly the MODULE PCBs seating (a 7.5 mm socket + 2.54 header cannot fit the 6 mm space above Z=11; the 22×22 pockets at Z 11→15 fit module PCBs exactly). Does not change any recommendation. **No change.** |
| 7 | `boss_positions` | ±24.0 (48 mm square), both parts | ±24.1 | ✅ Δ0.1 | Agreement within print-design rounding. Ours is the board-STEP-measured value (HIGH, double-confirmed). **Keep ±24.1.** |
| 8 | `boss_inner_pilot_dia` | shell Ø2.0 / plate Ø1.8; head recess Ø4.0 → **M2×20 verdict** | Ø2.5 pilot (M3 assumption) | ⚠️ **CATEGORICAL — M2 vs M3** | §b Q1 — **reference wins. Switch to M2.** Change list items 1–4. |
| 9 | `boss_outer_dia` / `boss_height` | plate internal bosses Ø7.0 OD; shell bosses Ø3.5–4 × 4 tall | Ø7.0 × 6.5 tall | ✅ OD | Their plate bosses match our Ø7.0 exactly. Height is architecture. **Keep Ø7.0; keep 6.5.** Ø7.0/Ø1.8 pilot = 3.9× (≥ the 2.5–3× guideline). |
| 10 | `module_pocket_size` | 22 × 22 NET (R2 corners), ~4 deep | 24.6 × 24.6 roof seats, 2.0 deep | ⚠️ 2.6 | §b Q5a. Reference proves the module PCBs really are 22.0 net (fit evidence ✓ for row 13's 22×22). But we carry a MEASURED ±1.27 X-registration ambiguity (file 16 row 28) the reference author never faced (their pockets ARE the registration). Evidence-backed reason ours is right for our architecture. **Keep 24.6.** |
| 11 | `lcd_window_cut` / `lcd_bezel_recess` | window ≈17.2 × 19.4; bezel ≈20.0 × 20.8 × ~1.6 deep (MED conf) | window 13.5 × 27.9; bezel +3.0/side × 1.5 deep | ⚠️ | §b Q5b — reference measurement is internally inconsistent (a 29×22 LCD PCB cannot sit in the 22×22 pocket measured at P3; window 19.4 long would clip the 21.7 mm active area). Our window = the module's own STEP glass measurement (HIGH, twice-confirmed). **Keep 13.5 × 27.9.** |
| 12 | `encoder_shaft_bore` | Ø9.5 bore + Ø11 recess ring; separate Ø13 knurled knob cover seats OVER the face | Ø16.0 through-bore (knob outside, unknown OD) | ⚠️ | Different encoder treatment: their bore passes only the Ø7 threaded bushing; their knob (Ø13) sits proud. Ours must pass the encoder can/knob envelope (tip +38.25). Useful datum gained: a real knob for this encoder is Ø13 < our Ø16 bore. **Keep Ø16.** |
| 13 | `usb_slot` | 8.6 × 3.5 straight slot, in BACK-PLATE +X wall (0.6 mm web in front of receptacle) | 12.0 × 7.0 + 1.5 funnel, +X cage wall (≈2.1 mm web in front of receptacle) | ⚠️ | §b Q4 — reference slot is plug-metal-snug and only works because their wall web ahead of the receptacle face is ~0.6 mm. Ours is ~2.1 mm (bay clear 1.0 + wall 2.5 − 1.41 protrusion), so the cable OVERMOLD nose must enter our slot or the plug can't reach full insertion. **Keep 12 × 7 + funnel.** |
| 14 | `wall_thickness` (±X/±Y/roof) | ≈1.85–2.0 / 2.0 / 2.0 | 2.5 / 2.5 / 2.5 | ⚠️ 0.5 | Reference proves 2.0 suffices for a handheld console; ours is thicker = MORE conservative, and the wearable wants stiffness for haptic coupling (audit 07). Task rule: prefer conservative. **Keep 2.5.** |
| 15 | `plate_thickness` | 2.0 floor | 3.0 | ⚠️ 1.0 | Ours deliberately ≥3.0 solid for haptic transmission + rigidity (DESIGN §D, audit 07 §4). More conservative. **Keep 3.0.** |
| 16 | `plate_features` | tray 55×55, lip registration, screw Ø1.8–2.0, head recess Ø4.0 | flat 57×57 plate, through Ø3.4, CB Ø6.0×1.5 | ⚠️ | Portable part = the M2 screw drilling (→ change items 2–4). Tray/lip architecture not ported. |
| 17 | `lug_features` | ABSENT (console) | gap 22.0 / bore Ø2.6 / etc. | ❌ ours-only | Reference cannot inform lugs. **No change.** |
| 18 | `roof_steps` / `button_access` | flat face; board-button = 2.8×~11 slot + printed 14.25 mm plunger | stepped shelf +5.0, 3× Ø4.0 tool holes | ⚠️ categorical | Different solution to the same "button is ~13 mm below the face" problem. Their printed-plunger approach is a nice idea (noted for future); our shelf+holes is already reviewed geometry. **No change.** |
| 19 | `misc` — corner fit details | R2 pocket corners, chamfered top/bottom outer edges, logo recess, louvre grille | step-rim, grooves, hex ring, gussets | ✅ category | Cosmetic language differs by design intent. **No change.** |

Rows compared: 19. Portable corrections all concentrate in row 8/16 (screw standard).

---

## (b) High-priority resolutions (grill-me record)

### Q1 — Boss standard: **M2 wins (categorical correction)**

- **Evidence for M2 (reference, physically assembled):** all four screw-pattern drillings cluster
  at Ø1.8–2.0 (shell boss pilot Ø2.0 full-circle cylinder faces, plate blind bore Ø1.8, head
  recess Ø4.0); README states "(4)× 2×20 mm screws". M2.5 (~Ø2.0–2.2 pilot band) and M3
  (~Ø2.4–2.7 pilot band) are both excluded by the Ø1.8 plate bore + Ø4.0 head recess (an M3 pan
  head is Ø5.5–6.0 and would not seat in Ø4.0).
- **Grounding (pilot standards for thread-forming screws in printed plastic):** pilot ≈80–90 % of
  screw major Ø; boss OD ≈2.5–3× pilot; ≥2× Ø thread engagement —
  [Kingroon: how to screw into 3D printed parts](https://kingroon.com/blogs/3d-print-101/how-to-screw-into-3d-printed-parts),
  [Pencom thread-forming screws for plastics (PDF)](https://www.pencomsf.com/site/assets/files/2312/thread_forming_screws_plastic.pdf),
  [TR Fastenings Plas-Tech 30 hole sizes](https://www.trfastenings.com/knowledge-base/fasteners-for-plastic/plas-tech-30-installation-guide).
  M2 major 2.0 → pilot 1.6–1.8 ✓ (reference plate Ø1.8); M3 major 3.0 → pilot 2.4–2.7 (our old
  Ø2.5 was a correct M3 pilot — for the wrong screw).
- **What this means for the board-hole question (UNKNOWN §2 item 4):** our Ø3.4 board-hole
  measurement is NOT contradicted — it is *reinterpreted*. The Ø3.4 hole is a loose slip fit over
  the M2 screw body; the screw never threads the board, it threads the PLA above/below. The
  reference author, holding the physical board, chose M2 and it assembled. M3 remains *possible*
  (Ø3.0 < Ø3.4) but is the unproven path with a marginal head-vs-counterbore stack on our plate
  (M3 pan head Ø5.5–6.0 vs our CB Ø6.0). **Resolution: adopt M2 self-tapping.**
- **Our two-short-screws architecture is retained** (board screw from +Z, plate screw from −Z
  into the shared boss pilot) — the reference's single M2×20 through-screw suits its clamshell,
  not our lug/plate stack. Screw shopping note becomes ≈M2×5 (board side) / M2×6 (plate side).

### Q2 — Board bay clearance: **ours stands (1.0 mm/side)**

Grill: what does the reference's net-fit 55.0–55.15 bay encode? That the AUTHOR used the bay
walls as the board's locating feature (and PLA+ print tolerance as the slip). Our board is
located by the four ±24.1 bosses/screws; bay walls only need to not collide. Their value is
tighter (less conservative) — the task rule prefers the conservative value for fit-critical
geometry, and 1.0/side additionally absorbs print shrinkage without rework. **Keep 57.0.**

### Q3 — Total Z / roof height: **ours stands (29.85)**

Grill: why is the reference only ~25 assembled? Because nothing tall lives under its face — the
console's modules (encoder base, LED, LCD, buzzer) finish near the module PCB plane and the face
sits ~2.0 above them; the encoder shaft/knob simply pokes through. Our device must roof over an
ERM motor at +15.25 with 1.0 clearance + 2.5 roof, and carry a 6.5 −Z pocket (JST −5.59) + 3.0
plate on the skin side. Every mm of the Δ4.9 is accounted for by measured stack items the console
does not have. **Keep 29.85.**

### Q4 — USB-C slot: **ours stands (12 × 7 + 1.5 funnel)**

Grill: the reference's 8.6 × 3.5 was sized by someone who plugged a real cable — why not adopt
it? Because the geometry it encodes is "slot directly over the receptacle face": their tray wall
leaves only ~0.6 mm web in front of the receptacle (55.0 net tray, receptacle 1.41 proud, 2.0
wall), so only the plug's 8.34 × 2.56 metal shell passes through. In OUR cage the receptacle face
sits ≈2.1 mm behind the outer wall face (1.0 bay clearance + 2.5 wall − 1.41 protrusion). A
USB-C plug's metal is ~6.5 mm long and needs ~6.2 mm insertion: with a plug-snug slot the cable
could never latch — the overmold nose must be able to enter the opening. That is exactly what
12 × 7 + funnel provides (file 16 §C sized it for overmold entry). Adopting 8.6 × 3.5 would be
copying the number while breaking the constraint it encodes. **Keep 12 × 7 + funnel.** (Slot
height 7.0 also must exceed the 4.2 mm receptacle body span; 3.5 would not.)

### Q5 — Module pockets & LCD window

**(a) Module pocket:** the reference's NET 22×22 pockets (R2) are strong fit evidence that the
22×22 module PCB dimension is exact (✅ confirms file 16 row 13), but zero-clearance pockets are
their registration mechanism. We carry a measured ±1.27 mm X-registration ambiguity (file 16 row
28, pin-1 polarity unresolvable from the STEP) that their design never had to absorb. **Keep
24.6 seats.** **(b) LCD window:** the instruction "LCD pocket/window sizes port directly" fails
on the evidence: the reference P3 pocket measures 22×22, which cannot hold the 29×22 AX22-0034
PCB, and its ~17.2 × 19.4 window is smaller than the module's 13.5 × 27.9 visible glass on the
long axis (would clip the 21.7 active area) — the measurement is MED-confidence raster work on
an area that contradicts the same-module premise (possibly a different display variant or a
window sized to a bezel sticker). Our 13.5 × 27.9 window comes from the module's own STEP glass
solid (HIGH, confirmed twice, files 14/16/17). **Keep our window and bezel.**

---

## (c) Recommended change list for `cad/braille_wearable_enclosure.py`

Value changes (each gets `CORRECTED — reference shell cad/reference/genesis-mini-shell.step (was <old>)` in its source tag):

| # | Constant | Old | New | Reason |
|---|---|---|---|---|
| 1 | `BOSS_PILOT` | 2.5 | **1.8** | M2 self-tap pilot (reference plate bore Ø1.8; 90 % of major per grounding URLs). Was the M3 pilot. |
| 2 | `PLATE_CB_DIA` | 6.0 | **4.0** | M2 head recess, per reference Ø4.0. |
| 3 | `PLATE_CB_D` | 1.5 | **2.0** | Sink an M2 pan/cap head (≤2.0 tall) flush in the skin face — this plate touches the wrist. Reference-informed (M2), DESIGN depth. |
| 4 | NEW `PLATE_HOLE_DIA` | — | **2.4** | M2 clearance through-hole in the skin plate. `_build_skin_plate` currently drills the plate with `BOARD_HOLE_DIA` (3.4); with a Ø4.0 head recess a Ø3.4 through-hole leaves a 0.3 mm bearing ring — the plate hole must become M2 clearance. This is the one geometry-logic touch the M2 switch forces (swap the constant used in `_build_skin_plate`'s through-hole; add explanatory comment block). |

Comment/documentation-only changes (no geometry values move):

| # | Item | Change |
|---|---|---|
| 5 | `BOARD_HOLE_DIA` (stays 3.4) | Re-tag comment: Ø3.4 is the measured BOARD hole (HIGH) = loose slip over the M2 screw body; no longer described as "M3 clearance". Constant no longer feeds the plate through-hole (item 4). |
| 6 | `BOSS_DIA` comment | "M3 boss/standoff" → "M2 boss/standoff" (value 7.0 unchanged — matches reference plate bosses Ø7.0; 3.9× pilot). |
| 7 | `_register_parameters` strings | boss_pilot / board_hole_dia / boss_dia comment strings updated M3→M2; add `plate_hole_dia` parameter row. |
| 8 | `run()` messageBox | "4x M3 standoffs" → "4x M2 standoffs". |
| 9 | Screw shopping notes (header + `_add_bosses_and_gussets` comments) | M3×4 / M3×5 → ≈M2×5 board-side / M2×6 plate-side self-tapping. |
| 10 | Stale Z-map comments (Track B finding, file 22) | Refresh the `--- Derived Z-map ---` inline comments and the affected step comments to the live `NEG_Z_POCKET = 6.5` values: plate top −8.1, plate bottom −11.1, boss 6.5 tall, cage 29.85 (comments currently show the 6.0-era −7.6 / −10.6 / 6.0 / 29.35). Comments only; geometry already correct. |

Explicit no-change list (deltas resolved in favour of our values, reasons in §a/§b): `BAY_CLEAR`
1.0 · `WALL` 2.5 · `ROOF_THICK` 2.5 · `PLATE_T` 3.0 · `USB_SLOT_W/H` 12/7 + `USB_FUNNEL` 1.5 ·
module seat 24.6 (`MODULE_SQ`+2·`MODULE_CLEAR_ROW`) · `LCD_WIN_W/H` 13.5/27.9 + bezel ·
`ENCODER_BORE` 16.0 · `BOARD_HOLE_X` 24.1 · cage 62 / height 29.85 · chamfer aesthetic · lugs.

**Gate:** Phase 3 may start now that this file exists. Verification criterion 7 status: every
fit-critical constant either matches the reference or carries a documented reason above.
