# 28 — Final Design Spec: "MONOLITH WITH REVEALS" + side-window graft

**Date:** 2026-07-18 · **Author:** orchestrator (judge) · **Inputs:** 27a (vocabulary), 27b
(contract), 27c (Concept A EXO-CAGE), 27d (Concept B MONOLITH). This file is the implementation
authority; 27d carries the full dimension detail for everything not amended here.

## 1. Judgment record

**Winner: Concept B (27d) as the architectural base.** Reasons:
1. It is the user's own primary reference (`faithful-gray-gptimage.png`) executed literally: gray
   monolith, black modules recessed in chamfered wells, one proud knurled element.
2. Lowest implementation risk: steps 1–4, 9 (USB), 11 (lugs), 13 (plate) are the LIVE, tested
   script's steps verbatim — only the roof program changes. The offline test suite survives with
   targeted probe edits.
3. Print certainty: face-down, zero supports, every reveal a 45° self-supporting funnel; no
   cantilevers. Concept A's two biggest wow-moves are its two biggest print gambles (LCD bridge
   bezel floating over the mandatory −Y relief void — flagged HIGH by its own author — and the
   louvre visor cantilever), and its open-corner stiffness needs a print-test loop we don't have
   time for before the hackathon.
4. The G-SHOCK rim keeps casual finger/impact protection on a device that lives on a wrist.

**Grafted from Concept A (its best fully-safe move): the −X SIDE WINDOW.** The monolith's flank
gets one skeletal aperture exposing the green PCB edge + socket stack — the side-on "cyber flash"
that B alone lacks, and per 27a's restraint rules the PCB green stays the single colour event.

**Rejected from A, with reasons:** corner-post skeleton + open −Y top corner (stiffness/print
validation loop unaffordable); floating LCD bridge bezel (HIGH print risk over the locked relief
void); post screw-access bores (unnecessary — board screws are driven with the cage inverted
through the open wrist side; no top access exists or is needed); louvre 1.6/3.2 slots (B's 2.0/4.0
chunkier rhythm reads cleaner and prints safer).

**Amendment to B (self-flagged risk 2 accepted):** the ~1–2 mm P2/P3 deck sliver where the locked
LCD window crosses the y=0 spine is accepted as-is (≥ min feature 1.2, sits at +16.25 above the
whole stack, zero load); implementation must simply not let the chamfer pass consume it (exclude
sliver edges from `REVEAL_CHAMFER` if the chamfer would zero it).

## 2. The grafted side window (all other dims per 27d §3)

| Name | Value | Note |
|---|---|---|
| `SIDEWIN_WALL` | −X | The only fully-free wall (no USB, no LCD relief, no lugs; boss gussets top out at −5.6). |
| `SIDEWIN_W` | **22.0** | Along Y, centred y=0 → y −11..+11. Echoes the 22 module grid. Leaves ≥17.5 solid to each corner. |
| `SIDEWIN_ZLO / ZHI` | **−1.6 / +11.0** | Board-bottom to module-PCB band: PCB edge, sockets, module undersides visible. 12.6 tall. |
| `SIDEWIN_CHAMF` | **5.0** | 45° chamfer on ALL FOUR corners (octagonal aperture): face-down print closing edge flat = 22 − 2·5 = **12.0** (bridge limit ✓); vertical edge flats 2.6 ✓. |
| cut idiom | — | ⚠ offset `yZ`-family plane at the −X wall, corners via `modelToSketchSpace`, `_extrude_symmetric` through the 2.5 wall (27b §D). Octagon drawn as an 8-point polygon (45° corners), or rect cut + 4 corner chamfers — implementer's choice, chamfer route reuses existing idioms. |

Fit check: window spans y ±11, z −1.6..+11 on the −X wall — outside the bay keep-out (that governs
INSIDE 57×57; this is wall material), clear of boss gussets (top −5.6 < −1.6), clear of lug roots
(±Y walls). Bay air gap means nothing structural is lost below z +2 except the 22×12.6 wall patch —
the −X wall retains full-height columns ≥17.5 wide at both corners. Compliant with 27b §A.

## 3. Implementation directives (Phase I)

1. Implement 27d §4's 13-step sequence with this file's §2 window inserted after 27d step 9
   (USB) — same offset-plane orientation-proof idioms.
2. Registry: adopt 27d §3's constant table (new constants DESIGN-tagged
   `DESIGN 27d/28 exposed rework`), retire `RIM_W/RIM_STEP/GROOVE_W/GROOVE_D/MODULE_SEAT_D` and the
   old `_add_step_rim_and_grooves`/ERM-seat code paths. `HEX_AF`/`HEX_DEPTH` are replaced by
   `TURRET_*`/`HEXRING_*` per 27d.
3. Preserve verbatim: `_cm()`, Part-document fallback, `_extrude_symmetric`, orientation-proof lug
   bores + USB cut, bosses/gussets/pilots step, LCD relief step (XY-sketch idiom), skin-plate step,
   M2 constants (BOSS_PILOT 1.8, PLATE_HOLE_DIA 2.4, PLATE_CB_DIA 4.0, PLATE_CB_D 2.0).
4. Update `cad/tests/`: keep every §A fit probe (they must all still pass untouched); update/replace
   aesthetic probes (roof seats, step-rim, grooves, button shelf+holes) with: P1 well open above
   motor A (AIR at (−12,−12,17.5)); grille slats present (SOLID at a rib, AIR in a slot over
   (+12,+12)); turret proud (SOLID at (−12,+12,21) outside bore, AIR inside bore); button trench
   open (AIR at (25.76,0,17)); side window (AIR at (−29.75,0,5), SOLID at (−29.75,0,−4) and
   (−29.75,±14,5)); bezel recess; deck top +18.75; orientation-invariance suite stays green.
5. Definition of done: `py_compile` exit 0 AND `.venv/bin/python -m pytest cad/tests -q` fully
   green. Write `audit/speech-to-braille-wearable/29-implementation-log.md` (what changed, step
   map old→new, test deltas, any spec deviation with reason).
