# 27c — Concept A: EXO-CAGE (roll-cage skeleton)

**Date:** 2026-07-18 · **Author:** Concept Agent A ("EXO-CAGE") · **Lens:** maximum exposure,
roll-cage skeleton, closest to inspo_2. Works UNDER 27b; §A anchors untouched. Feeds the
implementation phase as a drop-in re-spec of `cad/braille_wearable_enclosure.py`.

---

## 1. Pitch — the "sick" factor

**EXO-CAGE turns the enclosure inside-out: a closed structural *base tube* carries all the load so
the entire upper half can be stripped to a bare roll cage — four chamfered corner posts, an L-shaped
top rim, and 45° corner gussets — with the electronics standing *proud in open air* between them.**
You see the green PCB edge through slotted side windows, the two ERM coins bare in open wells, the
encoder rising out of a machined **hex turret**, and the LCD floating behind a skeleton **bridge
bezel** on the fully-open strap side. The single unifying move is one repeated **45° hazard-chamfer**
— on every window mouth, every post shoulder, every rim edge — which is simultaneously the ornament
*and* the print-support strategy (every chamfer is self-supporting, so the whole part prints
support-free skin-down). The board screws aren't hidden: they sit at the bottom of four **Ø4.5 bores
drilled straight down the posts**, exposed-fastener honesty à la Teenage Engineering. It reads as
lab-equipment-meets-exoskeleton: overbuilt where it's loaded, gone everywhere else. The removal *is*
the design.

Restraint kept to 27a's rules: **3 primary face moves** (corner posts + one 45° chamfer language +
four differentiated module reveals), one accent (the green PCB is the only colour event), everything
on the ±12 / ±24.1 symmetry grid.

---

## 2. Sketches

### Top view (looking down +Z; +X = USB/button edge to the right, +Y up)

```
                              +Y  (lug / strap side)
            [POST]======lug=========win18========lug======[POST]
   x=-31 -->  #         (-X+Y post merges hex turret)         #  <-- x=+31
              #   ( P4  ENCODER )               ( P3  ERM )   #
              #   /##HEX TURRET##\             ::LOUVRE::     #   o  btn +17
   win26  ( -X wall )  boreØ16  proud+17.5      motor+15.25   #   o  btn  0   [USB slot below, z-2.79]
              #                                  proud+13rim  #   o  btn -17
              #   ( P1  ERM  )                 ( P2  LCD  )   #      (open +X trench, buttons bare)
              #   OPEN WELL                    [BRIDGE BEZEL] #
              #   motor+15.25 bare             winØ13.5x27.9  #
            [POST]======lug======OPEN(-Y)======lug=========[POST]
                              -Y  (LCD relief — upper wall absent)
     legend: #=base ring(z -11.1..+2) + posts(+2..+16.5)   win=45°-chamfered side window
```

### Side view (the +X face, looking in −X; Z up, Y across)

```
   Z
 +17.5 ........................ hex turret tip (encoder shaft +38.25 exits here) ......
 +16.5  [POST]--gusset\____L-rim (+Y,-X only)____/gusset--[POST]     <- roll-cage top
 +13.0  [POST]  \45°/   (open center, modules proud)   \45°/  [POST]  <- deck rim top
 +11.0    |  ___/                                        \___  |      <- window lintel (chamfered)
          |  \  45° chamfered window mouth (flat span <=12) /  |
 +2.4     |   |     o  o  o  <- 3 buttons bare in open trench|   |     <- plunger tops
 +2.0  ===+===+=====================================+========+===  <- BASE RING TOP (keep-out ceiling)
          |###|   solid base ring 2.5 wall (torsion tube)   |###|
 -2.79 ===|###|========[ USB-C slot 12x7, web 2.1, funnel ]=|###|===  <- receptacle centre
 -8.1  ===|###|=============================================|###|===  <- plate top / pocket floor
 -11.1    [===]  skin_plate 57x57x3 SOLID (bolted, bottom shear panel)  [===]
          lug block (y28.5..36, boreØ2.6 @ z-3)  <-- projects out of page on +/-Y faces
```

---

## 3. Constant table — NEW / CHANGED (mm)

Carried-over registry names keep their 27b/file-16 values and are **not** re-listed unless their role
changes: `BOARD_BAY 55`, `BAY_CLEAR 1.0`, `WALL 2.5`, `CAVITY 57`, `CAGE_OUTER 62`, `CAGE_HALF 31`,
`CAVITY_HALF 28.5`, `PLATE_T 3.0`, `Z_PLATE_TOP -8.1`, `Z_PLATE_BOT -11.1`, `Z_BOARD_TOP 0`,
`Z_BOARD_BOT -1.6`, all `BOSS_*`/`GUSSET_*`/`PLATE_*`, all `LUG_*` (gap 22, bore 2.6, block 6,
proj 5, bore-z −3), all `LCD_*` window anchors, all `BTN_*`, `ENC_*`, `USB_SLOT_W 12`,
`USB_SLOT_H 7`, `USB_SLOT_CZ` (−2.79 model-Z), `ENCODER_BORE 16`, `MODULE_CLEAR_ROW 1.3`.

**Removed** (roof concept retired): `Z_ROOF_INNER +16.25`, `Z_ROOF_OUTER +18.75`, `ROOF_THICK`,
`ROOF_CLEAR`, `MODULE_SEAT_D`, `BEZEL_MARGIN`, `BEZEL_D`, `BTN_SHELF_TOP`, `BTN_HOLE_DIA`,
`RIM_W`, `RIM_STEP`, `GROOVE_W`, `GROOVE_D`, `HEX_DEPTH` (hex is now a through turret, not a recess).

| Name | Value | One-line rationale |
|---|---|---|
| `Z_BAND_TOP` | **+2.0** | Base-ring top = the §A board keep-out ceiling; everything solid at/below, skeletal above. |
| `Z_DECK_BOT` | **+11.0** | Underside of the L top-rim; = window lintel level, below module tops so modules stand proud. |
| `Z_DECK_TOP` | **+13.0** | Top of the L rim / deck; motors (+15.25) stand 2.25 proud of it. |
| `DECK_RING_W` | **4.0** | Rim width (inboard from 28.5 to 24.5) on +Y and −X only; >2.0 structural floor. |
| `POST_SQ` | **9.0** | Corner-post cross-section above +2; chunky roll-cage column, chamfered outer edge. |
| `POST_INNER` | **22.0** | = `CAGE_HALF − POST_SQ`; post inner faces at ±22, clears all modules (nearest ±22 turret). |
| `Z_POST_TOP` | **+16.5** | Roll-cage top: >motor +15.25 (protective), <old roof +18.75 (−2.25 height, welcome per §B). |
| `SCREW_ACCESS_DIA` | **4.5** | Vertical driver bore down each post at ±24.1 to reach the board M2 screw head (exposed-fastener). |
| `WIN_LO` | **−1.6** | Side-window bottom = board bottom, so the PCB edge shows from the flank (inspo_2). |
| `WIN_HI` | **+11.0** | Side-window top = lintel at `Z_DECK_BOT`; window 12.6 tall. |
| `WIN_W` | **26.0** | −X side window width (Y); shows board edge, leaves ≥6 mullions at posts. |
| `WIN_W_Y` | **18.0** | +Y side window width (X); narrowed to clear the ±14 lug roots. |
| `WIN_CHAMF` | **7.0** | 45° chamfer on each window TOP corner → flat lintel bridge = 26−2·7 = **12** (self-supporting). |
| `MULLION_W` | **6.0** | Min solid wall left between/around windows and at corners (truss ring). |
| `WEB_T` | **2.5** | Corner-gusset & module-tie web thickness (= WALL; ≥2.0 floor). |
| `GUSSET_LEG` | **7.0** | 45° corner-gusset leg (equal legs → 45° hypotenuse, self-supporting); ties post→rim, backs lintel. |
| `HEX_AF_TURRET` | **20.0** | Encoder hex turret across-flats; wall (20−16)/2 = 2.0 at flats around the Ø16 bore. |
| `Z_TURRET_BOT` | **+12.0** | Turret base; above encoder module PCB top (+11.56) so the turret ring never fouls the module. |
| `Z_TURRET_TOP` | **+17.5** | Turret top, proud of posts; encoder shaft (+38.25) exits through the Ø16 bore. |
| `Z_BEZEL_BOT` | **+15.0** | LCD bridge-bezel underside; ≥+15 clears the −Y overhang relief void (z 9.5..15) — see §5 risk. |
| `Z_BEZEL_TOP` | **+16.5** | Bezel top; frames the LCD window from above (floating brow, 1.8 above glass +13.18). |
| `BEZEL_BAR_W` | **2.5** | Width of the two Y-running bezel bars at the window long edges (x 5.23 / 18.73). |
| `Z_VISOR_BOT` | **+16.25** | P3 louvre-visor underside = the §A "material over a motor ≥ +16.25" floor. |
| `Z_VISOR_TOP` | **+17.75** | Louvre visor top (1.5 thick), cantilevered from the +X/+Y post corner over the outer half of P3. |
| `SLOT_W` | **1.6** | Louvre slot width (≥1.5 FDM min); long axis X. |
| `SLOT_PITCH` | **3.2** | Louvre slot pitch → rib 1.6 (≥1.5). |
| `SLOT_COUNT` | **5** | 5 slots span the outer ~15 mm of the P3 motor. |
| `USB_WEB` | **2.1** | Front wall thickness at the USB receptacle face (§A: ≈2.1, do NOT thicken). |
| `USB_FUNNEL` | **1.5** | Outward funnel chamfer on the USB slot exterior (carried, unchanged). |
| `CHAMFER_VERT` | **3.0** | Vertical outer post-corner chamfer (carried). |
| `CHAMFER_TOP` | **1.0** | Universal 45° chamfer on all top-facing outer edges (posts, rim, turret) — the unifying motif. |
| `CHAMFER_LUG` | **1.5** | Lug tip chamfer (carried). |

Derived: `Z_BAND_TOP−Z_PLATE_BOT = 13.1` (base-tube height); lintel flat span `WIN_W−2·WIN_CHAMF = 12.0`.

---

## 4. Build-step sequence → Fusion ops

Same idioms as the live script: `_cm()` conversion, `_sketch_on_xy_at(z)` for XY work,
**`modelToSketchSpace()` + `_extrude_symmetric()` for every non-XY (side-wall) sketch** (orientation-
proof — flagged ⚠). Two bodies only: `cage` + `skin_plate`.

| # | Step | Fusion op | Notes / ⚠ orientation-proof |
|---|---|---|---|
| 1 | **Cage block** | XY sketch @ `Z_PLATE_BOT`; rect 62×62; extrude NEWBODY to `Z_POST_TOP` (27.6 tall) → `cage`. | plain XY. |
| 2 | **Hollow above the plate** | XY sketch @ `Z_PLATE_TOP`; rect 57×57; extrude CUT up to `Z_POST_TOP`. | Leaves 2.5 walls; open bottom (plate slots in). |
| 3 | **Board keep-out relief** | XY sketch @ `Z_BAND_TOP`(+2); rect 57×57; CUT up to `Z_POST_TOP`. | Carves everything above +2 back to ±28.5 EXCEPT the corner posts → posts become the only inboard material above the base ring. |
| 4 | **Bosses + gussets + pilots** | *(unchanged from live script Step 3)* XY sketches @ `Z_PLATE_TOP`; 4× gusset pads, Ø7 standoffs to `Z_BOARD_BOT`, Ø1.8 pilot CUT. | §A verbatim. |
| 5 | **Corner posts** | XY sketch @ `Z_BAND_TOP`; 4× rect `POST_SQ`×`POST_SQ` at corners (±26.5); extrude JOIN +2→`Z_POST_TOP`. | Vertical prisms; Step 3 already cleared the cavity so these stand alone above +2. |
| 6 | **Post screw-access bores** | XY sketch @ `Z_POST_TOP`; 4× Ø`SCREW_ACCESS_DIA` at (±24.1,±24.1); CUT down to +0.5. | Vertical bore = trivial print; exposes the board screw. |
| 7 | **Side windows (−X, +Y)** | ⚠ per side: offset `xZ`/`yZ` plane at the wall; `modelToSketchSpace` rect (`WIN_W`×window-height); `_extrude_symmetric` CUT through the 2.5 wall. | Long axis vertical-ish; +Y uses `WIN_W_Y`. |
| 8 | **Window top-corner 45° chamfers** | Chamfer feature, `WIN_CHAMF` equal-distance, on the two TOP corner edges of each window. | Self-supporting lintel; the hazard motif. |
| 9 | **−Y upper opening** | XY sketch @ `Z_BAND_TOP`; rect across x −0.3..24.3 (+ margin), full −Y wall band; CUT +2→`Z_POST_TOP`. | Removes −Y upper wall entirely → satisfies LCD relief void (z9.5..15) by *absence*. |
| 10 | **L top-rim (+Y, −X)** | XY sketch @ `Z_DECK_BOT`; two rim rects (width `DECK_RING_W`) along +Y and −X between posts; extrude JOIN +11→`Z_DECK_TOP`. | Rim seats on the wall/mullions below (supported, no bridge). |
| 11 | **Corner gussets** | ⚠ 8× (2/corner) offset-plane sketches in each wall plane; 45° right-triangle (`GUSSET_LEG`); `_extrude_symmetric` JOIN `WEB_T`. | Ties post→rim; backs each window lintel; 45° hypotenuse self-supports. |
| 12 | **Encoder hex turret** | XY sketch @ `Z_TURRET_BOT`; flat-top hex `HEX_AF_TURRET` at (−12,+12) (exact vertices, no `math` import — reuse `_cut_hex_recess` vertex list); extrude JOIN +12→`Z_TURRET_TOP`; then Ø`ENCODER_BORE` CUT through. | Merges into the −X/+Y post + rim (structural). Bore Ø16 from +12↑ ⊇ §A "≥Ø16 from +13". |
| 13 | **P2 LCD bridge bezel** | XY sketch @ `Z_BEZEL_BOT`; two bars `BEZEL_BAR_W` at x 5.23 / 18.73 + a +Y cross-bar + 2 spurs to the +X post; extrude JOIN +15→`Z_BEZEL_TOP`; chamfer underside 45°. | ⚠ cantilevers toward open −Y — see risk list. |
| 14 | **LCD window through-cut** | XY sketch @ `Z_BEZEL_TOP`+1; rect `LCD_WIN_W`×`LCD_WIN_H` (13.5×27.9) @ (11.98,−14.38); CUT down past glass top (+13.18). | §A window, long axis Y. |
| 15 | **P3 louvre visor** | XY sketch @ `Z_VISOR_TOP`; rect brow over outer half of P3, cantilever from +X/+Y post corner; extrude JOIN down to `Z_VISOR_BOT`; then `SLOT_COUNT` slots (`SLOT_W`, `SLOT_PITCH`, long axis X) CUT through. | Underside +16.25 ≥ §A motor-span floor. |
| 16 | **USB-C slot** | *(unchanged idiom, live Step 6)* ⚠ offset `yZ` plane @ x=27; `modelToSketchSpace` rect 12×7 @ z −2.79; `_extrude_symmetric` CUT through +X base ring; keep front web `USB_WEB` 2.1. | Slot lives in the solid base ring — clean. |
| 17 | **USB funnel chamfer** | Chamfer `USB_FUNNEL` 1.5 on exterior slot long edges. | Outward funnel (carried). |
| 18 | **Lugs + Ø2.6 bores** | *(unchanged idiom, live Step 8)* XY sketch lug blocks @ ±14 into ±Y base ring; ⚠ `modelToSketchSpace` + `_extrude_symmetric` CUT for each Ø2.6 bore @ z −3. | FIT feature — no cosmetic fallback. |
| 19 | **P1 open well reveal** | Chamfer 45° on the base-ring / post top edges framing the (−12,−12) corner. | No added body — the exposure *is* the feature. |
| 20 | **Universal top chamfers** | Chamfer `CHAMFER_TOP` on all top-facing outer edges; `CHAMFER_VERT` on the 4 vertical post corners; `CHAMFER_LUG` on lug tips. | The one repeated 45° motif. |
| 21 | **Skin plate** | *(unchanged from live Step 10)* 57×57×3 solid @ −11.1..−8.1 + 4 counterbores → `skin_plate`. | §A solid haptic coupler. |

Fit probes in `cad/tests/` to keep/add: base-ring keep-out (nothing inside 57×57 for z −8.1..+2),
post screw-access bore present at ±24.1, Ø16 encoder clearance z≥+13, LCD window ≥13.5×27.9,
−Y relief void, USB slot 12×7 @ −2.79 web 2.1, lug bores Ø2.6 @ z−3, two-bodies contract.

---

## 5. Print orientation + risk list

**Orientation: skin-side DOWN on the bed, build +Z up (component face up).** Rationale: the open
bottom (57×57 wrist side) starts on the plate as a simple perimeter ring; all tall features (posts,
turret, bezel, louvre) grow straight up; every module opening and the encoder/LCD bores open *upward*
(apertures, no ceilings). `skin_plate` prints as a separate flat body, best side down.

Overhang audit (45° rule / bridges ≤12 / slots-over-holes):
- Posts, turret, USB dock walls, base ring → vertical prisms, zero overhang. ✓
- Post screw bores (Ø4.5), encoder bore (Ø16) → vertical, on the build axis, no teardrop needed. ✓
- Side-window lintels → top corners chamfered 45° (`WIN_CHAMF`) so the flat bridged span = **12.0 mm
  (= limit)**; drop to `WIN_W 24` if a margin is wanted. ✓
- Corner gussets → 45° hypotenuse, self-supporting any orientation; they also back the lintels. ✓
- L top-rim → seats on continuous wall/mullion below (not bridged). ✓
- Louvre slots → elongated, long axis X, ≥1.6 wide, rib ≥1.6 → far better than round vents. ✓
- Universal top chamfers → 45°, self-supporting. ✓
- USB slot / lug bores in vertical walls → horizontal features ≤ Ø8 / ≤12 tall; slot top edge 7 mm
  bridge < 12. ✓ (both cut with the orientation-proof `_extrude_symmetric` idiom.)

**Risks (ranked):**
1. **LCD bridge bezel cantilever (HIGH).** The bezel must float at z ≥ +15 to clear the −Y overhang
   relief, so it cantilevers ~28 mm toward the open −Y edge with a downward-facing underside. Mitigation:
   45° chamfer the underside from its supported +X/+Y root, keep bars thin (2.5), and tie both long
   bars back to the +X post with 2 spurs so the free cantilever length is ≤ ~10 mm. If it still
   sags, fall back to framing only the +X and +Y window edges (open on −X and −Y). *This is the one
   place the design fights the print.*
2. **Louvre visor cantilever (MED).** 1.5-thick brow reaching in from the corner over P3; keep reach
   ≤ 12 mm and back it with a 45° gusset to the +X/+Y post.
3. **Reduced closed-box stiffness (MED).** Roof gone + side windows → see §7; the base tube + bolted
   plate carry it, but validate FEA/print-test the −Y-open corner.
4. **Screw-access bores must clear the driver (LOW).** Ø4.5 assumes a small hex/Phillips M2 driver;
   widen to 5.5 if a bit-holder is used.
5. **Post-to-turret merge (LOW).** Turret AF20 at (−12,+12) just reaches x−23.5/y23.5 into the −X/+Y
   post (inner ±22) — a ~1.5 mm overlap. Confirm the JOIN unions (nudge AF to 21 if it only kisses).

---

## 6. 27b §A compliance checklist (anchor-by-anchor)

| §A anchor | ✓ | How EXO-CAGE honors it |
|---|---|---|
| Board bay 57×57; nothing inside 57×57 between z −8.1…+2 | ✓ | Walls at 28.5..31 (outside ±28.5); Step 3 keep-out cut clears all inboard material above +2; only sanctioned bosses/gussets sit inside, at the corners the board is drilled for. |
| Bosses 4× Ø7, pilot Ø1.8 @ (±24.1,±24.1), −8.1→−1.6, gussets to walls | ✓ | Step 4 unchanged from live script; gussets ground bosses into the solid base ring. |
| Skin plate 57×57×3.0 SOLID, top −8.1, through Ø2.4, head recess Ø4.0×2.0 | ✓ | Step 21 unchanged; separate `skin_plate` body, no holes beyond the 4 screws (haptic coupler intact). |
| −Z pocket 6.5 deep under board | ✓ | Cavity hollowed to plate top −8.1 (= pocket floor); base ring/posts never intrude the pocket. |
| Module seats P1/P2/P3/P4, 22×22 (LCD 29×22), ≥1.3 clearance | ✓ | No material inside ±28.5 above +2 except posts (inner ±22, ≥1.3 from any module) and the turret ring (base +12, above module PCB +11.56). |
| Stack heights; over-motor ≥+16.25; over-LCD ≥+14.2 unless bezel seat | ✓ | Nothing spans a motor except the P3 louvre (underside +16.25). Nothing over LCD glass except the bezel brow (+15 ≥14.2). Encoder tip +38.25 exits the Ø16 turret bore. |
| LCD window ≥13.5×27.9 @ (11.98,−14.38), long axis Y | ✓ | Step 14 cuts exactly 13.5×27.9 at that centre, long axis Y. |
| LCD overhang relief: −Y void x −0.3…24.3, z 9.5…15, to y ≥ −30.5 | ✓ | Step 9 removes the entire −Y upper wall (void by absence); bezel floats at z ≥15, above the relief band; lugs sit at z −7…+1, below it. |
| USB-C +X: ≥12×7 @ z −2.79, funnel out, web ≈2.1, wall solid z −6.3…+0.7 | ✓ | Slot 12×7 cut in the SOLID +X base ring (z −11.1…+2 spans −6.3…+0.7); front web `USB_WEB` 2.1, funnel 1.5 outward, not thickened. |
| Buttons 3× @ (25.76,±17/0), tops +2.4; +Z access, never >3 mm cover | ✓ | +X is fully open above +2 over the button column (open trench); posts/rim are outboard (x≥28.5) — buttons bare, zero cover. |
| Lugs: 2 pairs ±Y, gap 22, bore Ø2.6 @ z −3, block ≈6, proj ≥5, tip chamfer | ✓ | Step 18 unchanged; blocks root into the solid ±Y base ring; `CHAMFER_LUG` applied Step 20. |
| Encoder clearance ≥Ø16 around (−12,+12) from +13 up | ✓ | Turret bore Ø`ENCODER_BORE` 16 from +12 upward (⊇ +13). |
| Structure min ≥2.0 load-bearing; boss↔wall load path survives | ✓ | Walls/posts/rim/webs all ≥2.5; gussets keep the boss→base-ring path; see §7. |
| Two bodies only (`cage` + `skin_plate`) | ✓ | Every JOIN unions into `cage`; only Step 21 makes the second body. |
| Height budget ≈30, may drop below +18.75 | ✓ | Top drops to +16.5 (turret +17.5, visor +17.75); overall −11.1…+17.75 = 28.85 < 29.85 today. |

---

## 7. Stiffness / load path (roof mostly gone)

Torsion and bending are carried by a **closed base tube + a bolted bottom panel**, not the roof:

1. **Skin plate** — 57×57×3 solid, bolted to the four standoffs → a full-area bottom **shear panel**
   closing the box on the wrist side.
2. **Base ring** — the continuous 2.5-wall tube from −11.1 to +2 (13.1 mm tall) on all four sides is
   the primary **torsion box**; the side windows start at −1.6 but leave ≥6 mm mullions + full solid
   corners, so the ring reads as a truss, not a cut tube.
3. **Corner posts** — four 9×9 columns tie the base ring to the top ring; they take the vertical/
   impact loads (G-SHOCK guard logic) and are the roll-cage silhouette.
4. **Top ring** — L-rim (+Y, −X) + 8 corner gussets + the turret (merged into the −X/+Y post) close
   the top on three sides; the **−Y-open corner is the deliberate weak point**, carried by its two
   corner gussets, the wrap of the +Y/−X rim, and the bottom plate. Flagged for print/FEA validation.

Net: the part is a bolted **base monocoque** with a **skeletal upper exo-frame** — stiff where the
strap and impacts load it, stripped everywhere the eye wants to see the electronics.
