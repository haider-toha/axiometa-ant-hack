# 27b — Redesign Constraint Brief (fit contract for the exposed/cyberpunk rework)

**Date:** 2026-07-18 · **Author:** orchestrator, distilled from files 16 (reconciled dims), 21
(reference shell), 23 (reference delta), 26 (runtime fixes), and the live script + test suite.
**Purpose:** every design/implementation agent works UNDER this contract. §A may not move by one
tenth of a millimetre. §B is guidance. §C is free.

Frame: origin = board centre, +X = USB/button edge, +Z = outer face, board TOP at Z = 0.

## A. LOCKED fit anchors (do not touch)

| Anchor | Value |
|---|---|
| Board bay | 57.0 × 57.0 cavity (55 board + 1.0/side); bay walls need not be full-height, but nothing may intrude inside 57×57 between Z −8.1 and +2.0 (board + insertion) |
| Bosses | 4× Ø7.0, pilot Ø1.8 (M2 self-tap), at (±24.1, ±24.1), plate-top (−8.1) to board-bottom (−1.6), gussets to walls |
| Skin plate | separate body, 57 × 57 × 3.0 SOLID (haptics — no holes beyond the 4 screw features), plate top −8.1, bottom −11.1; through Ø2.4, head recess Ø4.0 × 2.0 |
| −Z pocket | 6.5 deep under board (JST hangs −5.59 + ESP32 + USB body) |
| Module seats | P1 ERM (−12,−12) · P2 LCD PCB centre (+12,−15.5) · P3 ERM (+12,+12) · P4 encoder (−12,+12); 22×22 module PCBs (LCD 29×22); ≥1.3 mm lateral clearance to any wall/feature flanking a module (X-registration ±1.27) |
| Stack heights | socket top +7.5 · module PCB top +11.56 · LCD glass top +13.18 · **motor top +15.25** · encoder shaft tip +38.25 (always protrudes); any material spanning OVER a motor ≥ +16.25; over LCD glass ≥ +14.2 unless it is the window bezel seat |
| LCD window | through-cut ≥ 13.5 × 27.9 centred (+11.98, −14.38), long axis Y |
| LCD overhang relief | −Y side must be void/absent material in x −0.3…+24.3, z +9.5…+15.0 out to y ≥ −30.5 (PCB juts 2.5 past board edge) |
| USB-C | +X side, Y=0: opening ≥ 12 (Y) × 7 (Z) centred Z −2.79, funnel/chamfer outward; wall web in front of receptacle face ≈ 2.1 — do NOT thicken (plug reach) and keep local wall solid z −6.3…+0.7 around the slot |
| Buttons | 3× plungers at (25.76, +17/0/−17), tops +2.4, Ø2.2; access from +Z required — either open trench (visible buttons) or holes ≤3 mm deep above them; never covered by >3 mm of material |
| Lugs | KEEP: 2 pairs on ±Y, internal gap 22.0, bore Ø2.6 at Z −3, block ≈6 wide, projection ≥5 past wall, tip chamfer — user is buying a standard 22 mm strap |
| Encoder | clearance bore/collar ≥ Ø16 around axis (−12,+12) from +13 upward (knob datum Ø13, reference shell) |
| Structure minimums | any load-bearing wall/post/bridge ≥ 2.0 thick (reference-proven floor); boss↔wall load path must survive (gussets or equivalent) |

## B. Engineering guidance (bend with justification)

- Total height budget ≈ 30 mm (−11.1 … +18.75 today). The frame top may drop BELOW +18.75 in an
  open design (e.g. deck at +13–16 with motors proud) — dropping height is welcome; raising needs a reason.
- Print: PLA FDM, one case body + plate. Design support-free in ONE stated orientation
  (face-down or skin-down). 45° chamfers self-supporting; bridges ≤ 12 mm; horizontal round
  bores in vertical walls ≤ Ø8 or teardropped; min feature 1.2, min emboss/deboss 0.4 wide × 0.4 deep.
- Two bodies only: `cage` + `skin_plate` (test suite contract).
- Aesthetic verdicts already banked: brutalist CHAMFERS not fillets; hex motif around encoder is
  liked; step-rim/groove language may be replaced by the new vocabulary.

## C. Free design surface

Everything above Z ≈ +2 except the anchors above: the roof/deck architecture (closed, wells,
skeletal, corner posts, braces), side-wall sculpting outside the USB/LCD-relief/lug zones,
exposure treatment per module (open well / grille / collar / bridge bezel), edge language,
embossed text, accent geometry. The four module quadrants may each get DIFFERENT treatments.
The 3 buttons may be exposed in an open trench (plungers visible) instead of today's shelf+holes.

## D. Script/test preservation contract (implementation phase)

- Keep: `_cm()` single conversion point; DIMENSION REGISTRY + source tags (new constants get
  DESIGN tags); orientation-proof idioms (`modelToSketchSpace` + `_extrude_symmetric` for any
  non-XY-plane sketch); Part-document fallback in `run()`; user-parameter registration.
- Update: `cad/tests/` probes for changed aesthetic geometry; ALL fit probes in §A stay and must
  still pass; suite must be green before handoff.
- `python3 -m py_compile` exit 0 and `.venv/bin/python -m pytest cad/tests -q` green are the
  definition of done.
