# 27d — Concept B: MONOLITH WITH REVEALS

**Date:** 2026-07-18 · **Author:** Concept Agent B · **Works under:** 27b (contract), 27a (vocabulary)
**Primary lens:** `renders/faithful-gray-gptimage.png` — gray brutalist block, black modules glowing
at the bottom of chamfered wells, one proud knurled turret.

Frame recap: origin = board centre, +X = USB/button edge, +Z = outer face, board TOP at Z = 0.

---

## 1. Pitch — the "sick" factor

Keep the full **62 × 62 G-SHOCK block** — the confident, slab-sided mass is the asset — but attack
it like a machinist: **carve four deliberately *different* reveals into one monolithic gray roof so
the black electronics read as instruments set at the bottom of milled wells.** The drama is depth
and shadow, not added parts. A tall protective rim at +18.75 stands proud on every side; inside it
the roof drops away in **45° chamfer-reveal funnels** that pull your eye down onto each module: one
ERM coin sits *fully exposed* at the bottom of an open well (P1), its diagonal twin is *felt* behind
a **louvre grille** (P3), the LCD glows in a **recessed bezel window** (P2), and the encoder rises
through the one element that breaks the plane — a **proud hex turret** like a scope mount (P4). The
three buttons live in an **open trench** with the raw plungers visible, TE-style. One angle (45°)
repeated on every edge, one ±12 grid, one gray body with black guts and the green PCB as the only
colour event. It looks milled-from-billet, not printed — a tactical instrument, not a gadget. It is
sick because the *removal* is the ornament and every reveal is doing a real job.

**Three primary face moves only:** (1) monolith rim + universal 45° chamfer frame; (2) the
four-quadrant reveal grid (open well / grille / bezel-window / turret) on one cross-spine; (3) the
proud hex turret. Everything else (button trench, USB funnel, LCD side-reveal, lugs) is edge
language inside the frame.

---

## 2. Sketches

### Top view (looking down −Z onto the +Z face). +X right, +Y up. 62 × 62.

```
        corner-clip (datum, 12 o'clock)          +Y lug        +Y lug
         \__                    ______________________||____________||__
            \__________________/                                        \
        +---(45° clip)-------------------------------------------------+ |  <- rim top +18.75
        | ####  P4: HEX TURRET (proud +23)     |  P3: LOUVRE GRILLE  |#| |     (2.0 top chamfer)
        | ##  ___________                       |  ||||||||||  (slots ||#| |
        | ## /  (())  hex \  <-Ø16 bore          |  ||||||||||  long-Y)||#| |
        | ## \  turret    /  solid deck quad     |  ||||||||||         ||#| |___ button
        | ##  \_hexring__/   +hex reveal ring     |  over ERM(+12,+12) ||#| |    TRENCH
        |=====================( x=0 spine web )===========================|=|    (open,
        | ##                                     |                      |T| |     plungers
        | ##  P1: OPEN REVEAL WELL               |  P2: LCD BEZEL       |R| |     visible
        | ##   +-----------------+   <-2.5 reveal|   +--------------+   |E| |     25.76,
        | ##   | ::: ERM coin ::: | chamfer funnel|   | [ LCD glass ] |  |N| |     +17/0/-17)
        | ##   |  (-12,-12) black |  down to      |   | window 13.5x  |  |C| |
        | ##   |  glows at bottom | +16.25 open   |   | 27.9 recessed |  |H| |
        | ##   +-----------------+                |   +--------------+  |_| |
        +--------------------------------------------------------------+---+  <- rim
         \__________________  ____________________  ____________________/
            -Y lug         ||        USB-C          ||    -Y lug
                        (side reveal / LCD relief on -Y flank, low)
        (USB-C funnel is on the +X flank at Z-2.79, below the trench — see side view)
```

### Side view (looking along +Y, i.e. the −Y flank). +X right, +Z up.

```
   Z
 +38.25 .............................  encoder shaft/knob tip (runtime, protrudes)
                    __
 +23.0  __________|  |________________  TURRET top (the one proud element)
 +18.75 |####|  hex |####|=====|####|   RIM top / DECK top  (2.0 top-edge chamfer, 3.0 vert corners)
        |####\ turret/## reveal ## /##| \  45° REVEAL chamfers funnel down to open wells
 +16.25 |#### \____/ ##  wells   \_/##|  > DECK inner (over-motor floor); grille slats bottom here
        |####            (black modules glow below, +15.25 coin / +13.18 glass / +11.56 PCB)
   0.0  |####  =========== board top =========== |   buttons +2.4 (in open trench, +X)
        |####                                    |
 -2.79  |####                              [====]|<- USB-C slot 12x7, funnel out (+X wall)
 -8.1   |####________ bosses / -Z pocket ________|   plate top
 -11.1  |________________ skin_plate 57x57x3.0 ___|   plate bottom (solid, wrist haptic face)
        <---------------- 62 mm ------------------>
```

---

## 3. Constant table — NEW / CHANGED (registry names; carried-over anchors keep their names/values)

All new constants get **DESIGN** source tags. Values in mm. Derived names show their formula.

| Name | Value | Rationale |
|---|---|---|
| **Deck / rim (monolith frame)** | | |
| `DECK_TOP` (= `Z_ROOF_OUTER`) | **18.75** | Keep full height — G-SHOCK protective rim proud of every module; stays in the 30 mm budget. |
| `DECK_INNER` (= `Z_ROOF_INNER`) | **16.25** | Deck underside = the "material over a motor ≥ +16.25" floor (motor top +15.25 + 1.0). Deck is 2.5 thick. |
| `FIELD_HALF` | **26.5** | Interior reveal-field half-extent = rim inner edge; rim top band = 31 − 26.5 = 4.5 wide (chunky frame). |
| `WEB_KEEPOUT` | **1.5** | Half-width of the retained deck spine at x=0 / y=0 → a **3.0 mm cross-web** grid between quadrants (≥2.0 struct). |
| `REVEAL_CHAMFER` | **2.5** | 45° funnel bevel on interior well top edges, full deck depth (16.25→18.75); the signature "chamfered well." |
| `CHAMFER_TOP` | **2.0** | 45° hazard-chamfer on the rim top OUTER edge — the unifying motif on the perimeter. |
| `CHAMFER_VERT` | **3.0** | (carry) vertical outer corner chamfers, brutalist. |
| `CORNER_CLIP` | **6.0** | ONE 45° clipped corner at (−X,+Y) as a "12 o'clock" datum/orientation cue (used exactly once). |
| **P1 open reveal well (ERM −12,−12)** | | |
| `P1_XLO,P1_XHI` | **−26.5, −1.5** | Well opening = rim-inner → spine (25 wide); ERM (22 @ −12) sits inside, biased to spine, huge sub-deck clearance. |
| `P1_YLO,P1_YHI` | **−26.5, −1.5** | Same in Y. Cut is a **through-deck** removal → NO material over the coin (beats the +16.25 rule by absence). |
| **P3 louvre grille (ERM +12,+12)** | | |
| `GRILLE_XLO,GRILLE_XHI` | **1.5, 21.8** | Grille field, stops short of the button trench (leaves a 2.0 wall to the trench at 21.8→23.8). |
| `GRILLE_SLOT_W` | **2.0** | Slot width ≥1.5; reveals ERM motion in flashes, "felt not fully seen." |
| `GRILLE_PITCH` | **4.0** | 2.0 slot + 2.0 rib (rib ≥1.5). |
| `GRILLE_COUNT` | **5** | 5 slots across ~20 mm over the module. |
| `GRILLE_LEN` | **20.0** | Slot length, long axis **Y** (rhymes with LCD window; slats bridge to rim+spine, solid on plate). |
| `GRILLE_SLOT_Z0` | **16.25** | Slots cut from 18.75 down through 16.25 → open to cavity; slat undersides = over-motor floor +16.25. ✓ |
| **P4 hex turret (encoder −12,+12)** | | |
| `TURRET_AF` | **20.0** | Hex across-flats; 2.0 wall around the Ø16 bore at flats (more at corners). |
| `TURRET_TOP` | **23.0** | Proud 4.25 above rim — the one plane-breaking element (scope-mount); shaft tip +38.25 still protrudes 15 mm. |
| `TURRET_BORE` (= `ENCODER_BORE`) | **16.0** | (carry) knob-clearance bore, Ø16 from +13 up; P4 deck stays solid except this bore. |
| `HEXRING_AF` | **24.0** | Shallow hex reveal ring recessed around the turret base (echoes the liked hex motif). |
| `HEXRING_DEPTH` | **1.5** | Recess depth of the base ring (18.75 → 17.25). |
| **P2 LCD bezel + window (+12,−15.5)** | | |
| `LCD_WIN_*` | (carry) | Through window 13.5 × 27.9 @ (11.98, −14.38), long axis Y — **LOCKED**, untouched. |
| `BEZEL_MARGIN` | **2.5** | Recessed bezel frame margin/side around the window (recess 18.5 × 32.9). |
| `BEZEL_D` | **1.5** | Bezel recess depth (18.75 → 17.25); window opening edge chamfered `CHAMFER_BEZEL`=1.0. |
| **Button open trench (25.76, ±17/0)** | | |
| `BTN_TRENCH_XLO,XHI` | **23.8, 28.5** | Open channel between grille wall and +X inner wall; contains Ø2.2 plungers (24.66..26.86) w/ margin. |
| `BTN_TRENCH_HALF_Y` | **20.5** | y −20.5..+20.5 covers the ±17 buttons + 3.5. |
| `BTN_TRENCH_Z0` | **16.25** | Trench removes deck 18.75→16.25 → opens to cavity; plungers stand visible, **0 mm cover** (≤3 rule ✓). |
| **USB funnel (+X, Y=0)** | | |
| `USB_SLOT_W,H` | **12.0, 7.0** | (carry) opening ≥12×7 @ Z −2.79; wall web ~2.1 NOT thickened; local wall solid −6.3..+0.7. |
| `USB_FUNNEL` | **2.0** | (was 1.5) deeper outward flare — sculpted "dock" aperture. |
| `USB_DOCK_D` | **1.0** | Shallow recessed panel framing the port on the +X outer face (cyberdeck exposed-port cue). |
| **LCD −Y side reveal (relief)** | | |
| relief void | (carry) | x −0.3..24.3, z 9.5..15, out to y ≥ −30.5 — **LOCKED**; built as XY-sketch + vertical extrude (no normal-sign ambiguity). |
| `SIDE_REVEAL_CHAMFER` | **1.5** | Chamfer the relief's outer mouth → celebrate it as an intentional side window showing the LCD PCB edge. |
| **Lugs (±Y, gap 22)** | (carry) | `LUG_GAP`22, `LUG_BORE`Ø2.6 @ z−3, `LUG_W`6, `LUG_PROJ`5, `LUG_H`8, `CHAMFER_LUG`1.5 tips — solid chamfered blocks, monolith heft. |
| **Fit anchors** | (carry) | `BOARD_BAY`55/`CAVITY`57/`CAGE_OUTER`62, bosses Ø7 @±24.1 pilot Ø1.8, plate 57×57×3.0, `WALL`2.5, `NEG_Z_POCKET`6.5 — all untouched. |

**Retired from the old script:** `RIM_W`, `RIM_STEP` (step-rim), `GROOVE_W/D` (panel-groove cross),
`MODULE_SEAT_D` (cosmetic ERM roof seats) — replaced by the reveal-well + cross-spine language (27b §B permits).

---

## 4. Build-step sequence → Fusion ops

Timeline order; each step is sketch(plane) → profile → extrude/cut/chamfer. ⚑ = needs an
orientation-proof idiom (`modelToSketchSpace` + `_extrude_symmetric`, per 27b §D).

| # | Step | Plane / profile | Op |
|---|---|---|---|
| 1 | **Cage block** | XY @ −11.1; 62×62 rect | Extrude NEWBODY to +18.75 (`cage`). |
| 2 | **Cavity** | XY @ −11.1; 57×57 rect | Extrude CUT to +16.25 → walls 2.5 + solid deck 57×57×2.5, open wrist side. |
| 3 | **Bosses + gussets + pilots** | XY @ −8.1; 4× Ø7 + 4 gusset pads + 4× Ø1.8 | JOIN standoffs −8.1→−1.6, JOIN gussets, CUT pilots (unchanged from live script). |
| 4 | **LCD −Y relief** ⚑ | XY @ +9.5; rect x−0.3..24.3, y−30.5..−28.5 | Extrude CUT +9.5→+15.0. Built on **XY** (vertical extrude) on purpose — no yZ normal-sign ambiguity (keeps live-script F1 fix). |
| 5 | **P1 open reveal well** | XY @ +16.25; rect x[−26.5,−1.5] y[−26.5,−1.5] | Extrude CUT +16.25→+18.9 (through deck). Removes roof over ERM(−12,−12). |
| 6 | **P3 louvre grille** | XY @ +16.25; 5× slot rects (2.0×20, pitch 4.0, long-Y, over +12,+12) | Extrude CUT +16.25→+18.9 each. Slats remain = grille. |
| 7 | **P2 bezel recess + window** | (a) XY @ +18.75 bezel rect 18.5×32.9 @(11.98,−14.38) CUT −1.5; (b) XY @ +18.9 window 13.5×27.9 CUT down through glass top +13.18. | CUT ×2. |
| 8 | **P4 turret + hex ring + bore** | (a) XY @ +16.25 hex AF20 @(−12,+12) JOIN to +23.0; (b) XY @ +18.75 hex AF24 CUT −1.5 (ring); (c) XY @ +23.5 Ø16 CUT down past +13. | JOIN + CUT ×2. Hex verts via the exact unit-hex list (no `math` import), as in `_cut_hex_recess`. |
| 9 | **USB-C slot + funnel** ⚑ | yZ plane @ X=27.0; rect from `modelToSketchSpace` corners (y±6, z −2.79±3.5) | `_extrude_symmetric` CUT (pierces +X wall both ways). Then chamfer `USB_FUNNEL`=2.0 on outer long edges (existing `_chamfer_usb_funnel`, retuned). |
| 10 | **Button open trench** | XY @ +18.9; rect x[23.8,28.5] y[−20.5,20.5] | Extrude CUT +18.9→+16.25 → opens to cavity, plungers visible. (No floor, no tool-holes — open trench.) |
| 11 | **Lugs + bores** ⚑ | XY @ z −7 lug blocks JOIN; yZ plane @ X=cx bore via `modelToSketchSpace` | JOIN blocks; `_extrude_symmetric` CUT Ø2.6 (keeps live-script step-8 fix verbatim). |
| 12 | **Reveal + edge chamfers** | edge-select by geometry | (a) `REVEAL_CHAMFER`=2.5 on P1 well + P3 grille-field + P2 bezel top **interior** edges; (b) `CHAMFER_TOP`=2.0 on rim top outer edge; (c) `CHAMFER_VERT`=3.0 on 3 vertical corners; (d) `CORNER_CLIP`=6.0 on the (−X,+Y) datum corner; (e) `CHAMFER_LUG`=1.5 lug tips; (f) `CHAMFER_BEZEL`=1.0 window; (g) `SIDE_REVEAL_CHAMFER`=1.5 on −Y relief mouth. All cosmetic → wrap in the graceful-skip try/except. |
| 13 | **Skin plate** | XY @ −11.1; 57×57 + 4 counterbores | Extrude NEWBODY (`skin_plate`) + CUT holes/CB (unchanged; solid haptic coupler). |

Chamfer edge selection reuses the existing `_edge_is_*`/geometry-filter pattern (match by mid-point
Z and X/Y bands), so it degrades gracefully and never blocks a fit feature.

---

## 5. Print orientation + risk list

**Orientation: FACE-DOWN** — deck (+Z, +18.75) on the build plate, cavity opening (wrist side)
upward. One stated support-free orientation (27b §B). Why it works:

- Deck prints first, flat and perfect; the reveal chamfers are short **45° overhangs** in that first
  2.5 mm → self-supporting.
- The **hex turret is the tallest +Z feature**, so it lands on the plate first and the deck builds
  up from it — a clean plate-contact top face, vertical Ø16 bore grows straight up. No support.
- Walls, bosses, lugs grow **upward** as vertical prisms → zero overhang. Cavity opens up = no roof
  bridging (the failure mode a face-**up** print would hit across the 57 mm cavity).
- Grille slots + P1 well + button trench are gaps in the flat first layers → trivial, no bridge.
- USB slot in the +X wall = a 12 mm-wide aperture in a vertical wall; top edge is a **12 mm bridge
  at the limit** — the outward `USB_FUNNEL` chamfer also chamfers that top edge, so it self-supports.

**Risks**

1. **+X packing is tight.** P3 grille (ends 21.8) ↔ 2.0 wall ↔ button trench (starts 23.8) ↔ +X
   inner wall (28.5). Verify no feature crosses into the module’s 1.3 lateral clearance *below*
   +16.25 (all these features live at ≥+16.25, so clearance is satisfied — but re-probe in tests).
2. **LCD window overruns the y=0 spine.** Window top reaches y ≈ −0.43, inside the 3 mm cross-web
   zone → the P2/P3 divider is only the ~1–2 mm of deck left above the window. Acceptable (≥ min
   feature, at +16.25 above the stack) but it is the thinnest web — flag for a stiffness probe.
3. **Roof perforation.** Three open reveals (P1, grille, trench) remove a lot of roof. Rigidity is
   carried by: full-perimeter rim (2.5 wall, full height), the x=0 spine web (3.0), the **solid P4
   turret quadrant**, and the board+4 bosses+solid skin plate. Keep every wall/web/slat-rib ≥ 2.0.
4. **Turret tip on plate** may need a brim for adhesion (small footprint, AF20). Cosmetic, not fit.
5. **Reveal chamfer vs rim width.** 2.5 chamfer eats 2.5 of the 4.5 rim top → 2.0 flat rim remains.
   If it reads thin, drop `REVEAL_CHAMFER` to 2.0. Parameterised, easy to tune.

---

## 6. 27b §A compliance checklist (anchor-by-anchor)

| Anchor | ✓ | How |
|---|---|---|
| Board bay 57×57, no intrusion Z −8.1..+2.0 inside 57×57 | ✓ | Cavity 57×57 cut untouched; all reveal features live at ≥+16.25, all bosses/gussets at the corners (±24.1) outside the board footprint. |
| Bosses 4× Ø7 pilot Ø1.8 @ ±24.1, −8.1..−1.6, gusseted | ✓ | Step 3 unchanged from live script. |
| Skin plate 57×57×3.0 SOLID, Ø2.4 thru / Ø4.0×2.0 CB | ✓ | Step 13 unchanged; no back openwork (27a C22 respected). |
| −Z pocket 6.5 deep | ✓ | `NEG_Z_POCKET`=6.5 unchanged. |
| Module seats P1/P2/P3/P4, 22×22 (LCD 29×22), ≥1.3 lateral clear | ✓ | Modules unmoved; reveals open the roof *above* them, all framing features at ≥+16.25 (above the stack), sub-deck cavity walls ≥16 mm away. |
| Stack heights; material over motor ≥+16.25; over glass ≥+14.2 unless bezel seat | ✓ | P1 open (nothing over coin); P3 grille slats bottom = +16.25; P4 solid deck +16.25 (encoder, no motor); LCD window/bezel is the bezel seat, recess floor +17.25 > +14.2. |
| LCD window ≥13.5×27.9 @ (+11.98,−14.38), long-Y | ✓ | `LCD_WIN_*` untouched (step 7b). |
| LCD −Y overhang relief void x−0.3..24.3, z9.5..15, y≥−30.5 | ✓ | Step 4 unchanged (XY-sketch build); side-reveal chamfer only touches the outer mouth, never intrudes the void. |
| USB-C ≥12×7 @ Z−2.79, funnel out, web ~2.1 not thickened, wall solid −6.3..+0.7 | ✓ | `USB_SLOT_W/H` kept; only the outward funnel deepened (2.0) + a −1.0 outer dock recess (does not thin the 2.1 front web). |
| Buttons 3× @ (25.76,+17/0/−17), tops +2.4, access +Z, ≤3 mm cover | ✓ | Open trench (step 10) → **0 mm** cover, plungers visible; access straight down +Z. |
| Lugs ±Y, gap 22.0, bore Ø2.6 @ z−3, block ~6, proj ≥5, chamfer tips | ✓ | Step 11 unchanged; solid chamfered blocks (monolith heft), bore via orientation-proof idiom. |
| Encoder clearance ≥Ø16 around (−12,+12) from +13 up | ✓ | `TURRET_BORE`/`ENCODER_BORE`=16 through turret + P4 deck; open cavity +13..+16.25. |
| Structure min 2.0 walls/posts/bridges; boss↔wall load path | ✓ | Rim 2.5, spine web 3.0, grille rib 2.0, turret wall 2.0, grille↔trench wall 2.0, P2 divider flagged (risk 2); gussets kept. |
| Two bodies only (`cage` + `skin_plate`) | ✓ | Steps 1 & 13 produce exactly these two. |

**Hardest anchor to honour (honesty):** the **LCD window vs. the y=0 cross-spine**. The locked
window (27.9 long, centred −14.38) reaches y ≈ −0.43, which pokes into the central grid spine and
leaves the P2/P3 divider as a ~1–2 mm sliver of deck instead of a clean 3 mm web. It complies (min
feature, above the stack) but it is the one place the tidy ±12 grid can’t stay geometrically pure —
the LCD is simply too tall for its quadrant. Everything else honours §A without a fight.

---

## Final numbers to hand the judge

**Boldest 5:** rim/deck top **+18.75** (kept — G-SHOCK block, in budget) with **2.5 mm 45° reveal
chamfers** funnelling to open wells; hex turret **AF 20, top +23.0** (the one proud plane-break);
grille **5 slots × 2.0 wide, 4.0 pitch, long-Y**, slats bottomed at **+16.25** (over-motor legal);
button **open trench x 23.8–28.5, 0 mm cover**; interior reveal field **±26.5** on a **3.0 mm
cross-spine** grid.
