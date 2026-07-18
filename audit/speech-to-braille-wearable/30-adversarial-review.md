# 30 — Adversarial Review: MONOLITH WITH REVEALS + side window

**Date:** 2026-07-18 · **Role:** adversarial review gate (try to BREAK it)
**Target:** `cad/braille_wearable_enclosure.py` (HEAD) + `cad/tests/`
**Reviewed against:** 27b §A (fit contract), 28 (design authority) + 27d (dimensions), 29 (impl log).
**Method:** anchor-by-anchor recompute from the SCRIPT SOURCE (constants + geometry code, not
comments/log); independent geometry probing via the offline build123d engine (dozens of custom
model-space probes beyond the suite's own); mutation check; runtime-idiom scan.

## Gate verdict: **PASS-WITH-FIXES**

No CRITICAL or MAJOR defect found. §A is honoured on every anchor (recompute + geometric probes
agree). The suite is honest and bites (mutation caught). Definition-of-done is met:
`py_compile` exit 0, `pytest cad/tests -q` = **41 passed**. One should-fix (F1, MINOR) is a
real-Fusion-only cosmetic robustness hole the offline harness structurally cannot see; the rest
are NOTES. Fixes are advisory — none block fit.

**Fix list (advisory):**
- **F1 (MINOR)** — `_reveal_chamfers` selects each grille slot's deck-top rim edges; a 2.5 mm
  equal-distance chamfer on 2.0 mm-wide slots / 2.0 mm ribs / a 2.5 mm-deep deck over-consumes and
  will error the chamfer feature in real Fusion → the whole (cosmetic, try/except-wrapped) reveal
  chamfer is skipped → real Fusion reports skipped features (contradicting "All cosmetic features
  created"). Offline fake records-not-applies chamfers, so the suite stays green regardless. Exclude
  the grille-field band from the reveal-chamfer selection (chamfer only the P1 well + P2 bezel
  mouths), or shrink the grille-slot chamfer. Fit-safe either way.

---

## Findings table

| ID | Severity | Claim / attack | Evidence (file:line) | Verdict |
|---|---|---|---|---|
| A1 | — | Bay keep-out: nothing solid inside 57×57 for z −8.1..+2 except sanctioned bosses/gussets | script:356-361 cavity 57×57 cut −11.1→16.25; probe grid (−28..28 step4 × z{−8..1.5}) → only ±24 corners solid | COMPLIANT |
| A2 | — | New features (turret base +16.25, grille slats, trench, side window, chamfers) vs bay band | turret z16.25↑, grille/trench z16.25↑ (all >+2); side window is a −X wall cut (x −31..−28.5, outside 57×57) | COMPLIANT |
| A3 | — | M2 boss set Ø7/pilot Ø1.8 @±24.1, −8.1..−1.6, gusseted | script:363-389 verbatim; probe pilot AIR@(24.1,24.1,−5), annulus SOLID@(26.5,24.1,−5) | COMPLIANT |
| A4 | — | Skin plate 57×57×3.0 SOLID, Ø2.4 thru / Ø4.0×2.0 CB | script:631-652; probe centre & over-module SOLID, thru/CB AIR | COMPLIANT |
| A5 | — | −Z pocket 6.5 deep intact | Z_POCKET_FL=−8.1 script:193; side window zlo=−1.6 doesn't reach pocket | COMPLIANT |
| A6 | — | Module ≥1.3 lateral clearance; all reveals live ≥+16.25 above the stack | reveals z≥16.25; sub-deck walls at ±28.5 → ≥2.0 to any module edge | COMPLIANT |
| A7 | — | Over-motor ≥+16.25: every feature spanning (+12,+12)/(−12,−12) | P1 well through-deck (nothing over A); grille slat underside =16.25 (script:198,425); bezel y≤+2.07 (not over B) | COMPLIANT |
| A8 | — | Over-LCD-glass ≥+14.2 unless bezel seat | bezel floor 17.25, window is the seat (script:428-438) | COMPLIANT |
| A9 | — | LCD window 13.5×27.9 @ (11.98,−14.38) long-Y | script:92-95,437 exact | COMPLIANT |
| A10 | — | −Y relief void x−0.3..24.3, z9.5..15, out to y≥−30.5; no new chamfer/bezel intrudes | script:392-406 (x−0.3..24.3,y−30.5..−28.5,z9.5..15); bezel z17.25↑, window y≥−28.33 (adjacent, non-overlapping) | COMPLIANT |
| A11 | — | USB slot 12×7 @z−2.79 funnel out; 2.1 web not thinned by dock/funnel | script:494-521 slot; dock relieves only outer 1.0 over 16×10 (script:524-540) | COMPLIANT |
| A12 | NOTE | "keep local wall solid z−6.3..0.7 around slot" — dock leaves 1.5 mm around slot | dock 16×10×1.0 outer relief → 1.5 of 2.5 remains | ACCEPT (N2) |
| A13 | — | Buttons: open trench, 0 mm cover, +Z access | script:573-581 x23.8..28.5 z16.25..18.75; probe AIR over all 3 plungers + access column | COMPLIANT |
| A14 | — | Lugs ±Y gap22 boreØ2.6@z−3 proj≥5 tip chamfer | script:584-628 (gap22, proj5, z−3); probe bore AIR both pairs | COMPLIANT |
| A15 | — | Encoder Ø16 from +13 up; AF24 ring doesn't cut Ø16 wall below +13 | bore Ø16 12.9→23.5 (script:457-460); AF24 recess z17.25..18.75 (above +13); probe: bore AIR, AF20 wall SOLID, ring annulus AIR@z17.5↑ | COMPLIANT |
| A16 | — | Two bodies (cage + skin_plate) | probe body_names == {cage, skin_plate} | COMPLIANT |
| G1 | — | Turret hex verts vs ±28.5 cavity / keep-out | AF20 r=11.547 → x−22..−2, y0.45..23.55; AF24 r=13.856 → within ±28.5; all z≥16.25 | COMPLIANT |
| G2 | — | Grille centring on (+12,+12) | cx=4,8,12,16,20 (mid=12), y2..22 (mid=12) script:420-424 | COMPLIANT |
| G3 | — | Corner-clip filter vs lug edges | lug vert edges |mx|≈11..17 < CAGE_HALF−1=30 → not selected (script:772-789) | COMPLIANT |
| G4 | — | Reveal chamfer vs LCD-window edge | window edge z17.25; reveal selects z≈18.75 (script:708) → miss; bezel edge handled by 12f | COMPLIANT |
| G5 | — | Side-reveal chamfer vs USB slot edges | side reveal my−31..−28 & mz15 (script:874-876); USB at my±6,mz−2.79 → miss | COMPLIANT |
| G6 | — | USB funnel chamfer vs dock/side-window edges | funnel mx>29.4 (script:809) excludes −X window & dock top/bottom (|mz−(−2.79)|>4) | COMPLIANT |
| F1 | MINOR | Reveal chamfer over-consumes 2 mm grille slots in real Fusion | script:696-727 selects grille slot rim edges; 2.5 chamfer > 2.0 slot/rib & 2.5 deck depth | REAL-FUSION RISK (cosmetic, wrapped) |
| P1 | NOTE | Side-window closing edge 12.0 & USB slot top ≈12 = AT the 12 mm bridge limit | SIDEWIN 22−2·5=12 (script:181,184); designed to limit | ACCEPT (N4) |
| T1 | — | New bay keep-out probe is a single centre point | test:42 | HONEST but WEAK (N5) |
| T2 | — | test_cage_bbox max-Z 23.0 = TURRET_TOP | test:115; build bbox max.Z=23.0 confirmed | HONEST |
| R1 | — | Runtime idioms: modelToSketchSpace + symmetric on all yZ cuts; per-slot fresh sketches; hex/octagon single-profile | script:494-570,418-491; orientation-invariance suite green (identical volume all conventions) | SOUND |

---

## §A anchor recompute table (source-derived → compliance)

| 27b §A anchor | Contract value | Built (from constants + code) | Verdict |
|---|---|---|---|
| Board bay | 57×57; clear inside z−8.1..+2 | CAVITY=57 cut −11.1→16.25; grid probe finds nothing inside except ±24 bosses/gussets (sanctioned by boss anchor) | ✓ |
| Bosses | 4×Ø7 pilotØ1.8 @±24.1, −8.1..−1.6 | BOSS_DIA7/BOSS_PILOT1.8; standoffs −8.1→−1.6; gussets −8.1→−5.6 to walls | ✓ |
| Skin plate | 57×57×3.0 solid, Ø2.4/Ø4.0×2.0 | CAVITY×PLATE_T3 −11.1→−8.1; PLATE_HOLE2.4, CB Ø4.0×2.0 | ✓ |
| −Z pocket | 6.5 deep | NEG_Z_POCKET6.5, floor −8.1 | ✓ |
| Module seats | P1(−12,−12) P2(+12,−15.5) P3(+12,+12) P4(−12,+12), ≥1.3 clear | seats unmoved; reveals open roof above; sub-deck walls ≥2.0 from module edges | ✓ |
| Stack / over-motor ≥+16.25 | motor top +15.25 | P1 open; grille underside =16.25; P4 solid; DECK_INNER=16.25 | ✓ (=limit) |
| Over-glass ≥+14.2 unless bezel | glass +13.18 | window (open) / bezel floor 17.25 | ✓ |
| LCD window | ≥13.5×27.9 @(11.98,−14.38) Y | exact | ✓ |
| −Y relief void | x−0.3..24.3 z9.5..15 y≥−30.5 | exact cut; no bezel/window/chamfer intrusion | ✓ |
| USB-C | ≥12×7 @z−2.79 funnel; web ~2.1 not thickened; wall solid −6.3..0.7 | slot 12×7 @−2.79; dock relieves only outer 1.0 (note N2) | ✓ |
| Buttons | 3× @(25.76,±17/0) ≤3 mm cover | open trench 0 mm cover, +Z access | ✓ |
| Lugs | gap22 Ø2.6@z−3 proj≥5 chamfer | gap22, proj5, bore z−3, tip chamfer | ✓ |
| Encoder | ≥Ø16 around (−12,+12) from +13 up | bore Ø16 12.9→23.5; open cavity 13..16.25 | ✓ |
| Structure min 2.0 | walls/webs/ribs ≥2.0 | rim2.5, x-web≈4-5, grille rib2.0, turret wall2.0, grille↔trench2.0; P2/P3 spine sliver = accepted risk-2 (~1 mm, above stack, zero load) | ✓ |
| Two bodies | cage + skin_plate | exactly two | ✓ |

---

## Print-audit table (face-down, 27d §5) — NEW/changed features

| Feature | Overhang / bridge | Limit | Verdict |
|---|---|---|---|
| P1 well (25×25) | hole in first-layer deck slab; open to cavity above → no bridge | — | SAFE |
| Grille slats (2×20, ×5) | in-plane ribs in the 2.5 mm deck (first layers) | — | SAFE |
| Button trench | hole in deck | — | SAFE |
| P2 bezel recess / USB dock | shallow pockets in first layers | — | SAFE |
| Side window closing edge | 22−2·5 = **12.0** mm bridge (last deck-side layer), 45° corners self-support the fan | ≤12 | AT LIMIT (N4) |
| USB slot top edge | ≈12 mm bridge, funnel chamfer assists | ≤12 | AT LIMIT (existing) |
| Turret on plate | AF20 hex column proud 4.25 mm, small plate footprint | — | SAFE (brim advised, cosmetic) |
| Reveal / rim / corner chamfers | 45° self-supporting | 45° | SAFE |
| −Y relief (unchanged) | 0.5 mm outer skin retained full height → pocket, not through-hole; 2 mm re-forming ledge | — | SAFE (pre-existing) |

No NEW overhang >45° or bridge >12 mm. Two features sit exactly at the 12 mm bridge limit (by design).

---

## Test-honesty verdict

**Honest.** Every §A fit probe is present with correct coordinates and AIR/SOLID expectations
(independently reproduced by the geometry engine). New reveal probes (P1 well, grille rib/slot,
turret wall/bore, bezel recess/floor, trench, side window ×4, deck top) probe what they claim —
verified by reproducing each with custom probes. `test_cage_bbox` max-Z 23.0 does correspond to
`TURRET_TOP` (build bbox max.Z = 23.00). No §A probe is deleted, weakened, or tautological.

Two limitations (not dishonesty):
- **N5**: the new bay keep-out probe is a single centre point `(0,0,0)`; my own grid sweep shows the
  bay is genuinely clear, but the committed probe under-covers.
- Structural: the offline fake **records chamfers without applying them** (fusion.py:452-456), so the
  suite cannot detect a chamfer that over-consumes or selects wrong edges in real Fusion (root of F1).

**Mutation check (tests bite):** on a COPY of the cad tree in scratchpad, `BOSS_PILOT 1.8 → 2.5`
→ `test_dimension_registry_invariants` **FAILED** (`assert 2.5 == 1.8`), suite went 41→**40 passed,
1 failed**. Note the *material* probe alone would NOT catch this (bore centre is AIR at either
diameter) — the registry invariant is the actual guard. The mutation was applied only to the copy;
the real files were never edited.

**Byte-identical restoration proof** (SHA-256, before vs after all work):
```
956710f55ab03762b481123fdd44993c3a30e32e8aad28fd3cb5fbc4ce29ba64  cad/braille_wearable_enclosure.py   OK
e868c6e8c7c41b6cc3078b14fb27482a773d86f28c71b2653ef5c57f2c02b2e6  cad/tests/test_enclosure_build.py  OK
9f6477c45ad5137ae9b973eebeaf44342045f78af376ee3bf6a2f9497a7acc2f  cad/tests/conftest.py              OK
```
`shasum -c` against the pre-work manifest: all three OK.

---

## Fusion-runtime risk scan

- **yZ-plane cuts** (USB slot, USB dock, side window, lug bores): all use `modelToSketchSpace` +
  `_extrude_symmetric` (script:494-570,621-628). Orientation-invariance suite green across
  identity/mirrored/rotated with identical cage volume → no raw-sketch-coord or one-sided-extrude
  assumption survives. SOUND.
- **Profile-index**: grille uses a fresh sketch per slot (`item(count-1)` = item(0), script:421-425);
  octagon (8 lines) and hexes (6 lines) each close to a single profile. No multi-profile ambiguity.
  SOUND.
- **JOIN reachability**: turret AF20 base at z16.25 overlaps the deck → JOIN target found; the
  documented ring-CUT-before-turret-JOIN reordering (log §Deviations 1) is geometrically sound and
  reproduced correctly (probe: proud turret + recessed AF24 annulus + Ø16 bore all present). SOUND.
- **Chamfer edge-set emptiness**: every chamfer wrapped in try/except → `_skipped`; suite asserts
  `skipped == []`, so all selections must be non-empty in the fake. SOUND offline.
- **F1 (the one real risk)**: `_reveal_chamfers` cannot be validated for *application* offline; in
  real Fusion the 2.5 mm chamfer on 2.0 mm grille slots over-consumes and errors → graceful-skip →
  cosmetic loss + `skipped != []`. Fit geometry unaffected (chamfers never wrap fit features).

---

## Severity counts

- CRITICAL: 0
- MAJOR: 0
- MINOR: 1 (F1 — reveal chamfer over-consumes grille slots in real Fusion; cosmetic, advisory fix)
- NOTE: 4 (N2 dock leaves 1.5 mm wall around USB slot; N3 brief's bay-band wording vs sanctioned
  bosses/gussets — pre-existing tension, not a regression; N4 two bridges at the 12 mm limit by
  design; N5 single-point bay keep-out probe under-covers)

---

## Orchestrator addendum — F1 fix applied (2026-07-18)

F1 (MINOR) fixed in `cad/braille_wearable_enclosure.py::_reveal_chamfers` per the advisory
option: the edge filter now excludes the ENTIRE P3 grille field (band `my > -0.5`,
`GRILLE_XLO-0.5 ≤ mx ≤ GRILLE_XHI+0.5`), superseding the narrower sliver guard, so the 2.5 mm
reveal chamfer applies only to the P1 well and P2 bezel mouths — grille slot rims stay crisp
by design. Re-verified after the fix: `py_compile` exit 0, `pytest cad/tests -q` → 41 passed.
N2–N5 accepted as documented. Gate now: **PASS**.
