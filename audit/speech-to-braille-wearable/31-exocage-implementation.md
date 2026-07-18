# 31 — EXO-CAGE implementation (27c, amended)

**Date:** 2026-07-18 · **Author:** implementation agent · **Deliverables:**
`cad/braille_wearable_exocage.py` (new, standalone) + `cad/tests/test_exocage_build.py`
(new). Builds under 27b §A and 27c; coexists with — and does not touch —
`cad/braille_wearable_enclosure.py` (the MONOLITH design) or its tests.

The EXO-CAGE is the fully-open roll-cage skeleton from the user's inspo
(`renders/inspo_2.png`): a closed structural **base tube** carries the load so
the upper half is stripped to four chamfered **corner posts**, an L **top-rim**,
corner **gussets** and a hex encoder **turret**, with the electronics bare and
proud in open air between them.

---

## 1. Design deltas vs 27c

| # | Delta | Rationale / consequence |
|---|---|---|
| D1 | **NO LCD bridge bezel** (27c step 13 removed) | LCD fully bare like the inspo. The §A "LCD window ≥13.5×27.9" anchor is met by **total absence** of material above the glass — open sky ⊃ the required window. Deletes 27c print risk 1 (bezel cantilever). |
| D2 | **NO P3 louvre visor** (27c step 15 removed) | Both ERM motors stand bare in open air, proud of the deck rim (motor top +15.25 vs rim top +13.0). Deletes 27c print risk 2 (visor cantilever). |
| D3 | **Turret nudged `HEX_AF_TURRET` 20.0 → 21.0** (27c risk 5) | An AF20 hex at (−12,+12) does **not** reach the −X/+Y post (~14 mm away) nor the rim (~2 mm gap) — it would *float*, and the JOIN would fail ("disjoint from every existing body"). Geometric check: AF20 flats land at x=−22 / vertices at y=23.5, both ~1 mm short of the rim (24.5) and never touching the post corner (−22,22). **Fix:** tie the turret to the −X and +Y rims with two short `WEB_T` bridges at rim level (z +12..+13); AF21 additionally gives a clean 2.5 mm wall around the Ø16 bore (`(21−16)/2`). |
| D4 | **27c steps 2+3 merged** (documented) | Both cut 57×57 up to `Z_POST_TOP`; executed literally the second cut removes nothing and raises "No target body found to cut" (Fusion + the offline engine). Merged into one full-height cavity hollow — keep-out is satisfied (cavity empty above +2; bosses/gussets live below the board). |
| D5 | **+Y window cut with a vertical Z-extrude** (not an offset-plane sketch) | A +Y-wall aperture is bounded in X,Z and cut through Y; the reference idiom set + offline engine expose only xY and yZ construction planes (no xZ), so a Z-extruded XY rectangle is the clean, orientation-safe tool. Consequence: the +Y lintel top is square (18 mm) — see print notes. The −X window keeps the 45°-chamfered top corners (12 mm lintel) via the orientation-proof `modelToSketchSpace` polygon. |
| D6 | **Corner gussets = horizontal 45° brackets** | Same XY-pad idiom the boss gussets already use in this codebase; robust under every plane convention, 45° hypotenuse self-supporting. A vertical lintel-backing web would need an xZ plane not exercised by the reference idioms. |

### §A-anchor vs monolith-probe conflicts (§A wins, documented)

Three probe POINTS in the enclosure suite encoded a *tall closed +X wall* — a
monolith aesthetic, never a §A anchor. The exo cage opens +X above +2 (buttons
bare) and windows the −X/+Y base ring from z −1.6, so those probes move to where
§A actually locks material:

- `roof above USB slot` (29.75,0,**+3.0**) → (29.75,0,**+1.0**): §A locks the wall
  solid only z −6.3..+0.7; the base ring (−11.1..+2) covers it.
- `+X wall` (30,0,**+5.0**) → (30,**16**,**−5.0**): +X is open above +2; base-ring
  wall solid below. y moved to 16 because y=0 at z<+0.7 is the USB slot.
- base-ring +X probe uses **y=16** (not y=0): §A's USB slot occupies (29.75,0,0),
  so y=0 there is correctly AIR (the 27c/task suggestion of (29.75,0,0)=SOLID
  overlooked the slot).

Every LOCKED §A fit anchor is otherwise verified **unchanged**.

---

## 2. Constant table (NEW / exo — mm)

Carried-over registry names keep their file-16/27b values (BOARD_*, BOSS_* incl.
`BOSS_PILOT 1.8`, PLATE_* incl. `PLATE_HOLE_DIA 2.4` / `PLATE_CB_DIA 4.0` /
`PLATE_CB_D 2.0`, LUG_* gap 22 / bore 2.6 / bore-z −3, LCD_*, USB_SLOT_* @
`USB_SLOT_CZ −2.79`, `USB_WEB 2.1`, `ENCODER_BORE 16`, MODULE_*).

| Name | Value | Role |
|---|---|---|
| `Z_BAND_TOP` | +2.0 | base-ring top = §A keep-out ceiling; solid below, skeletal above |
| `Z_DECK_BOT` | +11.0 | L-rim underside / window lintel level |
| `Z_DECK_TOP` | +13.0 | L-rim top; motors (+15.25) stand +2.25 proud |
| `DECK_RING_W` | 4.0 | rim width (inboard 28.5→24.5) on +Y and −X only |
| `POST_SQ` | 9.0 | corner-post cross-section above +2 |
| `POST_INNER` | 22.0 | = CAGE_HALF−POST_SQ; post inner faces ≥1.3 from all modules |
| `POST_CTR` | 26.5 | derived = CAGE_HALF−POST_SQ/2 |
| `RIM_INNER` | 24.5 | derived = CAVITY_HALF−DECK_RING_W |
| `Z_POST_TOP` | +16.5 | roll-cage top: > motor +15.25, < old roof +18.75 |
| `SCREW_ACCESS_DIA` | 4.5 | vertical driver bore down each post at ±24.1 |
| `WIN_LO` / `WIN_HI` | −1.6 / +11.0 | side-window bottom (board bottom) / top (lintel) |
| `WIN_W` / `WIN_W_Y` | 26.0 / 18.0 | −X window (Y) / +Y window (X, clears ±14 lug roots) |
| `WIN_CHAMF` | 7.0 | 45° −X-window top-corner chamfer → 12 mm lintel |
| `MULLION_W` | 6.0 | min solid wall around windows |
| `WEB_T` | 2.5 | gusset / turret-bridge web thickness (= WALL) |
| `GUSSET_LEG` | 7.0 | 45° corner-gusset leg |
| `HEX_AF_TURRET` | **21.0** | encoder hex turret AF (nudged 20→21, D3) |
| `Z_TURRET_BOT` / `Z_TURRET_TOP` | +12.0 / +17.5 | turret base (above module PCB +11.56) / top |
| `CHAMFER_VERT` / `CHAMFER_TOP` / `CHAMFER_LUG` | 3.0 / 1.0 / 1.5 | vertical post / universal top / lug-tip chamfers |
| `USB_FUNNEL` | 1.5 | USB exterior funnel chamfer |

---

## 3. Build sequence (Fusion timeline order)

1. **Cage block** — XY @ −11.1, 62×62, NEWBODY → +16.5 (`cage`).
2. **Cavity hollow** — XY @ −11.1, 57×57, CUT → +16.5 (walls + open bottom; keep-out merged in, D4).
3. **Bosses + gussets + pilots** — 4× Ø7 standoffs −8.1→−1.6, 9×9 pads, Ø1.8 pilots (§A verbatim).
4. **USB-C slot** — 12×7 @ z −2.79 through the +X base ring (`modelToSketchSpace` + symmetric extent).
5. **Lugs + Ø2.6 bores** — 2 pairs ±Y, gap 22 (orientation-proof bore idiom).
6. **Corner posts** — 4× 9×9 at ±26.5, JOIN +2→+16.5 (overlap the walls → robust union).
7. **Post screw-access bores** — 4× Ø4.5 at ±24.1, +16.5→+0.5.
8. **L top-rim** — +Y and −X rects (width 4), JOIN +11→+13, overlapping posts.
9. **Corner gussets** — 8× 45° right-triangle brackets, 2/corner at two heights, JOIN (D6).
10. **Encoder turret** — 2 rim bridges (JOIN) + AF21 hex column +12→+17.5 (JOIN) + Ø16 bore (CUT +18→+11.5).
11. **−X side window** — chamfered-top polygon through the −X wall (12 mm lintel).
12. **+Y side window** — Z-extruded box through the +Y wall (D5).
13. **−Y upper opening** — remove −Y wall above +2 between posts (LCD relief by absence).
14. **LCD relief notch** — §A void x −0.3..24.3, z 9.5..15, notching the +X/−Y post inner corner.
15. **+X opening** — remove +X wall above +2 (buttons bare, open trench).
16. **Chamfers** — top (1.0), vertical post (3.0), USB funnel (1.5), lug tip (1.5); all cosmetic → graceful skip.
17. **Skin plate** — 57×57×3 solid @ −11.1..−8.1 + 4 counterbores (`skin_plate`).

---

## 4. Print notes (skin-down, +Z up) — re-verified after bezel/visor removal

- Posts, turret, base tube → vertical prisms, zero overhang. ✓
- Post screw bores (Ø4.5), encoder bore (Ø16) → vertical, on-axis. ✓
- **−X window lintel** → 45° top corners (WIN_CHAMF 7) → 12.0 mm bridge (= limit). ✓
- **+Y window lintel** → **18 mm flat top** (square, from the vertical Z-extrude, D5). Apply the
  cosmetic top chamfer in Fusion, or accept an 18 mm PLA bridge; a mid-mullion is **not** allowed
  (it would block the required +Y open-air view of the PCB and fail the (0,+29.75,+5) probe).
- L top-rim → seats on the wall/mullion below it (not bridged). ✓
- Corner gussets, all top chamfers → 45°, self-supporting. ✓
- USB slot / lug bores → orientation-proof idiom; slot top edge 7 mm < 12. ✓

**Stiffness (27c §7):** closed base tube (2.5-wall ring −11.1..+2, windows leave ≥6 mm mullions +
solid corners) + bolted 57×57×3 shear panel carry torsion/bending; posts tie base→top; +Y/−X rim +
8 gussets + turret bridges close the top on three sides. The **−Y-open top corner is the accepted
weak point**, carried by its gussets and the bottom plate (flagged for print/FEA).

---

## 5. Tests (`cad/tests/test_exocage_build.py`, 55 tests)

Self-contained loader with a parametrizable `run_build_script(path, convention, part_document)`
helper (conftest fixture untouched). Coverage:

- **build completes** (assembly + part document) with empty skipped list; **two bodies** `cage`+`skin_plate`;
- **cage bbox** X ±31, Y ±36, Z −11.1..+17.5;
- **§A fit probes** (ported at identical coords, three monolith points adjusted per §1): lug bores,
  USB slot + base-ring roof, boss pilot/annulus, −Z pocket, bay keep-out, plate centre/CB/through-hole,
  encoder Ø16 bore, LCD open-sky, LCD relief void + post-corner notch;
- **exo probes:** 4 solid posts, open sky over all four module positions, motor proud/bare, −X/+Y
  window apertures + 3 mullions, 2 screw-access bores, turret wall vs Ø16 bore, +Y/−X rim, open button
  trench, 4-side base-ring solidity, air above cage;
- **orientation invariance** (identity/mirrored/rotated): clean build + identical probes + matching
  cage volume;
- **registry invariants:** shared §A anchors + exo constants (incl. `HEX_AF_TURRET 21` nudge,
  12 mm lintel derivation, 2.5 mm turret wall) + removed-features-absent (bezel/visor/roof vocab).

---

## 6. Gate results

| Gate | Result |
|---|---|
| `python3 -m py_compile cad/braille_wearable_exocage.py` | **exit 0** ✓ |
| `.venv/bin/python -m pytest cad/tests -q` | **96 passed** (41 existing enclosure + 55 new exocage) ✓ |
| existing enclosure suite unbroken | 41 passed (unchanged) ✓ |

---

## CORRECTION ADDENDUM (2026-07-18, per files 32/33/34)

This file's claim that "**Every LOCKED §A fit anchor is verified unchanged**" (and
its 96-passed green gate) was **NOT fit-correct** and is corrected by the two
adversarial reviews and the fix:

- **File 32** (machinist) / **File 33** (skeptic): the exo-cage cage was **14
  disjoint solids** (floating gussets + Ø4.5-bore post-corner splinters), the
  9×9 posts **interfered with the P1/P3/P4 module PCBs** (−1.0 mm vs the required
  ≥1.3), and the screw bores breached the post inner walls. The green suite was
  blind to all of it (no connectivity or lateral-clearance probe). D3's turret
  was also geometrically impossible against the real encoder can.
- **File 34** (this fix): pentagon posts (E1), screw bores deleted (E2), corner
  plates replace gussets (E3), turret deleted / encoder bare (E4), plus the
  monolith bore correction (M1) and single-lump/clearance test hardening. New
  gate: **128 passed** (52 enclosure + 76 exocage). See
  `34-exocage-fix-log.md` for the encoder-can measurement table and computations.

The `POST_INNER … clears modules` and "gussets close the top" claims in this file
are FALSE and are superseded by file 34.
