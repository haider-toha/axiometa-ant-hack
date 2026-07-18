# Phase 1A — Reference Shell Dimension Extraction

- **Date:** 2026-07-17
- **Source file:** `cad/reference/genesis-mini-shell.step` (Nebenezer "Axiometa Genesis Mini Game Console Shell", the physically-printed fit-truth reference)
- **Also referenced:** `cad/reference/README.md`, `cad/reference/image_of_the_build.png`
- **Tool used:** project venv `build123d` 0.11.1 (`import_step`), OCP `BRepClass3d_SolidClassifier` for point/void probing, plus the CAD skill `scripts/inspect` (facts/planes) and `scripts/snapshot`.
- **Extraction methods:** cylindrical-face radii (bores/bosses), planar-face positions (walls/floors), point-in-solid raster scans (openings, cavities, wall cutouts), bounding boxes (footprint/heights).

## Coordinate frame

- **Z = enclosure stacking / thickness axis ("up").** The front (display/module) face of the main shell is at **Z = 17 (max)**; the open bottom is **Z = 0**. XY is the face plane.
- The STEP is an **exploded layout**: the 4 solids are laid out side-by-side along +X, each with its own XY offset. They are **not** in assembled position. Feature positions below are therefore given **relative to each solid's own bounding-box centre** (stated per row).
- Assembly bounding box (all 4 solids): **159.5 × 63 × 17 mm** — wide in X only because of the exploded layout.

## Solid inventory (4 solids)

| # | Name | Size (mm, X×Y×Z) | X range | Faces | Role |
|---|------|------------------|---------|-------|------|
| Solid 1 | **MAIN SHELL** (front / face housing) | 60.0 × 63.0 × 17.0 | [70,130], ctr X=100 | 329 | Board bay, all 4 module face openings, screw bosses, board-button slot, logo |
| Solid 0 | **BACK PLATE** (bottom tray / lid) | 59.0 × 62.0 × 10.0 | [-29.5,29.5], ctr X=0 | 102 | 55×55 tray, USB-C slot, screw holes + internal bosses, floor |
| Solid 3 | **ENCODER KNOB COVER** (red knob) | Ø13.0 × 9.5 | [42.5,55.5] | 98 | Knurled accessory cap over P1 encoder shaft |
| Solid 2 | **BOARD-BUTTON PLUNGER** | 2.8 × 9.0 × 14.25 | [47.6,50.4] | 24 | Tall rounded-rect actuator for board button #45 |

Module→quadrant assignment (confirmed against photo + top snapshot): **P1 encoder** = bottom-left round hole, **P2 LED button** = bottom-right round hole, **P3 LCD** = top-right window, **P4 buzzer** = top-left louvre grille. Centre-top carries the recessed Axiometa "X" logo (cosmetic).

## Main dimension table

Positions "rel(x,y)" are relative to the owning solid's bbox centre (main shell centre = (100,29); back plate centre = (0,29)).

| Feature | Reference value (mm) | Extraction method | Conf |
|---|---|---|---|
| `cage_outer_footprint` | **60.0 (X) × 63.0 (Y)** (main shell) | bbox of solid 1; cross-checked vs raw assembly facts | HIGH |
| `corner_treatment` | Rounded vertical corners, effective **R ≈ 3.5** at mid-height (measured profile); blended vertical-edge fillets up to ~5.5, plus chamfered top & bottom edges | corner outline raster at z=8 + corner cylinder faces (r=5.5/4.75/3.75/6.0) | MED |
| `cage_total_height` | **17.0** (main shell, Z 0→17) | bbox Z of solid 1; cross-checked vs facts | HIGH |
| `assembled_total_height` | **≈ 25** (inferred: shell 17 + plate 10 − ~2 lip overlap). NOT directly measurable — parts are exploded in this STEP | inference from part heights + mating-lip geometry | LOW |
| `board_bay_inner` (main shell) | **55.15 (X) × ~55 (Y)** (interior walls x 72.5→127.65; y 0→55, cavity extends to ~58 on the USB side for connector clearance) | interior planar wall faces + z-section raster | HIGH |
| `board_bay_inner` (back plate tray) | **55.0 × 55.0** (walls ±27.5; y 0→55) | interior wall faces (x=±27.5, y=0/55) | HIGH |
| `bay_clearance_per_side` | **≈ 0.05–0.08** (X: (55.15−55)/2 = 0.075). Essentially net / very tight fit — relies on PLA+ print tolerance | derived | HIGH |
| `board_bay_depth` | Board seats against 4 boss shoulder faces at **Z ≈ 11**; clear depth below board to open bottom (Z 0) **≈ 11**; module space above board (Z 11→17) **≈ 6** | boss bottom-face plane (z=11, area 96) + bbox | MED |
| `boss_positions` | **48 mm square pattern = ±24 (X) × ±24 (Y)** from board/bay centre (main-shell holes at x 77/125, y 3.5/51.5; plate holes at x −23/25, y 3.5/51.5). Matches board ±24.1 holes | cylinder axes at the 4 corners, both parts | HIGH |
| `boss_inner_pilot_dia` | **Main shell: Ø2.0** pilot (r=1.0 cyl faces, Z 11→15, ~4 mm deep). **Back plate: Ø1.8** (blind hole probed from bottom, ~3 mm deep) / Ø2.0 cyl faces. See verdict below | cylinder radii + radius-vs-Z void probing at each screw axis | HIGH |
| `boss_outer_dia` / `boss_height` | Main shell boss **OD ≈ Ø3.5–4.0**, height **~4 mm** (Z 11→15). Back plate internal bosses **OD ≈ Ø7.0** (r=3.5) with Ø3.0 pilot, height **~5 mm** (Z 2→7.15) | surrounding cylinder faces (r=1.75/2.0 shell; r=3.5/1.5 plate) | MED |
| `module_pocket_size` | **22 × 22** inner pockets, **R2 corner fillets**, depth **~4 mm** (Z 11→15). 4 pockets, centres rel shell-ctr: P1(−14,−13.5), P2(+10,−13.5), P4(−14,+10.5), P3(+10,+10.5); 24×24 grid | r=2.0 corner-fillet cylinders (Z 11→15) at 4 quadrants | HIGH (22×22) / MED (ctr) |
| `lcd_window_cut` (P3) | Through-window **≈ 17.2 (W) × 19.4 (H)**, centre (112, 41) = rel(+12,+12). Bezel recess **≈ 20.0 × 20.8** at outer face, recess depth **~1.5–1.8** (down to Z≈15.2) | region raster at z=15.2 (window) vs z=16.7 (bezel) | MED-HIGH |
| `encoder_shaft_bore` (P1) | Round opening **Ø ≈ 9.5** (r=4.75 cyl; raster ~Ø10), centre (88, 15.5) = rel(−12,−13.5); shallow ~Ø11 face recess ring around it; red Ø13 knob cover seats over it | cylinder radius + region raster | MED-HIGH |
| P2 LED button bore | Round opening **Ø ≈ 8.5–9** (r=4.25 cyl), centre (112, 15.5) = rel(+12,−13.5) | cylinder radius + region raster | MED-HIGH |
| `usb_slot` | **W(along wall, Y) ≈ 8.6 × H(Z) ≈ 3.5**, in the **BACK PLATE +X wall**, centred Y ≈ 27.5, Z ≈ 5.5 (mid-height). Straight slot, no exterior funnel detected | mid-wall material-profile scan of plate walls | HIGH |
| `wall_thickness` — ±X (sides) | **≈ 1.85–2.0** (+X: 129.5−127.65=1.85; −X: 72.5−70.5=2.0) | outer vs inner planar wall faces | HIGH |
| `wall_thickness` — ±Y | **≈ 2.0** (+Y: 60−58; −Y: 0−(−2)) | planar wall faces | HIGH |
| `wall_thickness` — roof/top | **≈ 2.0** over module pockets (front slab Z 15→17); thicker over solid areas | z-plane spacing (z=15 shelf → z=17 face) | HIGH |
| `plate_thickness` (floor) | **2.0** (back plate floor, Z 0→2) | z-plane spacing (z=0 → z=2 floor) | HIGH |
| `plate_features` | Outline **59 × 62 × 10**; floor 2.0, walls 2.0; inner tray **55 × 55**; screw holes Ø1.8–2.0; Ø4.0 recess (r=2.0) + internal Ø7.0 bosses (r=3.5, Ø3 pilot); rim registration lip (steps at Z≈7.15 / 9.0 / 10) | planar + cylinder faces, void probing | MED |
| `lug_features` | **ABSENT** — no strap lugs (this is a game-console shell) | full solid inventory review | HIGH |
| `roof_steps` / `button_access` | Top face largely flat at Z=17 with recessed module pockets, recessed "X" logo (centre-top), buzzer louvre grille (top-left), and the **board-button slot ≈ 2.8 × ~11** (rounded), centre ≈ (119, 52) = rel(+19,+23), top-right. No stepped shelf — button is a slot + plunger (solid 2, 2.8×9×14.25 tall) | region raster + button-plunger bbox | MED |
| `misc` | Axiometa "X" logo recess (cosmetic, centre-top). Buzzer P4 = ~5 horizontal louvre slots ~4 × 1.4 each (top-left). Encoder knob cover = Ø13 × 9.5 knurled red accessory (solid 3). Internal module pockets have R2 corners. Outer top & bottom edges chamfered. Board bay is a net/interference-light fit on the 55 mm board | assorted | LOW-MED |

## Boss / screw verdict

**Verdict: M2 — specifically M2×20 self-tapping (matches README "2×20 mm screws").**

Raw measured hole diameters at the 4-corner ±24 mm screw pattern:

- **Main shell boss pilot: Ø2.0** — r=1.0 cylinder faces, spanning Z 11→15 (~4 mm deep), full-circle (area 25.1 = 2π·1.0·4).
- **Back plate screw hole: Ø1.8** — void probed by point-classifier as a blind bore ~3 mm deep entering from the outer bottom (Z 0→3), with matching Ø2.0 cylinder faces in the CAD.
- **Back plate head recess / counterbore-ish: Ø4.0** (r=2.0) on the cavity/rim side.
- **Back plate internal support bosses: Ø7.0** OD (r=3.5) with **Ø3.0** pilots (r=1.5).

Reasoning: pilot/through diameters cluster at **Ø1.8–2.0**. That is a textbook M2 pair — a thread-forming M2 self-taps into the Ø1.8 plastic pilot while clearing the Ø2.0 side. It is far below the M2.5 window (~Ø2.5–2.9 pilot) and the M3 window (~Ø2.5–3.5). Combined with the README's explicit "2×20 mm" note, the screw is **M2×20**. No evidence of M2.5 or M3 anywhere in either part.

## Notes & anomalies

- **Exploded STEP.** The 4 solids are laid out along +X, not assembled. `assembled_total_height` therefore cannot be measured directly; it is inferred (~25 mm) from the two part heights (17 + 10) minus a ~2 mm mating-lip overlap. Everything else is measured on the individual solids.
- **Very tight board fit.** Main-shell bay 55.15 mm and back-plate tray 55.0 mm on a 55 mm board → ~0.05–0.08 mm/side. This is a net/interference-light fit that only works because it is a PLA+ print; a rigid-tolerance CAD target would want more clearance. Worth flagging when comparing to our own design's bay clearance.
- **Both halves cradle the board.** Both the main shell (bosses/pockets) and the back-plate tray (55×55 pocket) locate the board; screws run from the outer bottom (through the plate) up into the main-shell bosses.
- **Cylinder Face.center() offset artifact.** For partial (non-360°) cylindrical faces build123d reports a centre offset from the true axis by ~1 radius. This initially made the encoder bore look like it sat at x=83.25 (Ø9.5) when the true axis is (88,15.5); resolved via point-raster. Full-circle holes (Ø2.0 pilots) are unaffected. Boss/opening centres above use the raster-derived (true) values where it mattered.
- **Module opening grid vs pocket grid.** The face *openings* (bores/window/grille) are symmetric on X about the shell centre (x=100, ±12 grid), but the 22×22 *inner pockets* read a hair off-centre (grid centre x≈98). Minor; likely draft/print asymmetry.
- **USB-C is in the back plate wall, not the front shell.** All front-shell side walls are fully solid — every functional opening except USB-C is on the top face. The USB-C slot lives in the back-plate +X wall.

## Verification cross-checks (performed)

- **Outer footprint & total height:** solid-1 bounding box (60 × 63 × 17) matches the `scripts/inspect refs --facts` reading — HIGH.
- **Bore diameter cross-check:** encoder opening measured two independent ways — cylindrical-face radius r=4.75 (Ø9.5) and point-raster width (~Ø10) — agree within ~0.5 mm.
- **Board bay cross-check:** front-shell interior-wall spacing (55.15) and back-plate tray inner walls (55.0) independently agree on the ~55 mm board pocket.
- **Snapshots:** rendered via CAD `scripts/snapshot`. Reviewed top, iso, and 5 orthographic views. Key files:
  - top: `/private/tmp/claude-501/-Users-haidertoha-Code-axiometa-ant-hack/fcab14e8-0bf1-4e7d-bb83-671927904590/scratchpad/top_20260717T215808Z.png`
  - iso (exploded): `/private/tmp/claude-501/-Users-haidertoha-Code-axiometa-ant-hack/fcab14e8-0bf1-4e7d-bb83-671927904590/scratchpad/iso_20260717T215812Z.png`
  - right (shows plate USB slot): `/private/tmp/claude-501/-Users-haidertoha-Code-axiometa-ant-hack/fcab14e8-0bf1-4e7d-bb83-671927904590/scratchpad/v_right_20260717T220112Z.png`
