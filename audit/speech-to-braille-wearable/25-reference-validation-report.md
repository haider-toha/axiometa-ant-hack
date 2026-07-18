# 25 — Reference-Shell Validation: Consolidated Report

**Date:** 2026-07-17
**Pipeline:** Phase 1 parallel extraction (file 21 = reference shell measured with build123d/OCP;
file 22 = our script's encoded dims) → Phase 2 orchestrator delta + grill-me (file 23) → Phase 3
script correction (file 24, `py_compile` exit 0). Reference: `cad/reference/genesis-mini-shell.step`
(Nebenezer's Genesis Mini console shell — physically printed and assembled on the same MTX0013
board, hence the highest-trust fit source available).
**Also this session (outside the 21–24 file set):** a user-reported Fusion runtime failure was
fixed in `run()` — current Fusion "Part Design" documents allow only one component, so
`addNewComponent()` raised `RuntimeError: 3`; the script now falls back to building directly into
`rootComponent` (multiple bodies remain allowed; sources cited in the code comment block).

---

## (a) What the reference shell CONFIRMED (our values that matched)

| Ours | Reference evidence |
|---|---|
| Screw pattern ±24.1 (48.2 mm square) | Reference drills a 48.0 mm square (±24.0) in both parts — agreement within 0.1 mm |
| 22×22 module PCB dimension | Reference's module pockets are NET 22.0 × 22.0 (R2 corners) — a physically assembled proof the module PCB figure is exact |
| Boss outer Ø7.0 | Reference back-plate internal bosses are Ø7.0 OD — identical choice |
| ~2 mm wall class is printable | Reference runs 1.85–2.0 walls everywhere in PLA+; our 2.5/2.5/3.0 sit safely above a proven floor |
| Overall envelope class (~60 mm square shell) | 60 × 63 vs our 62 × 62 — same design class around the same board |
| Board hole Ø3.4 compatibility | The reference passes its screws through those same board holes — no interference at the ±24 pattern |

## (b) What CHANGED and why (reference wins)

**The screw standard: M3 → M2.** The single highest-priority question, resolved definitively.
Every screw-pattern drilling in the reference clusters at Ø1.8–2.0 (shell boss pilot Ø2.0, plate
bore Ø1.8) with a Ø4.0 head recess — an M3 pan head (Ø5.5–6.0) could not even seat, and the
README's "(4)× 2×20 mm screws" corroborates M2×20. Our Ø3.4 board-hole measurement stands but is
reinterpreted: it is a loose slip fit over the M2 screw body; the screw threads only the PLA
boss, never the board. Script changes (full log in file 24):

| Constant | Old → New |
|---|---|
| `BOSS_PILOT` | 2.5 → **1.8** (M2 self-tap pilot, 90 % of major; grounding URLs in file 23 §b Q1) |
| `PLATE_CB_DIA` | 6.0 → **4.0** (M2 head recess, per reference) |
| `PLATE_CB_D` | 1.5 → **2.0** (flush head on the wrist-facing plate) |
| `PLATE_HOLE_DIA` | NEW **2.4** (M2 clearance; plate through-hole no longer uses the board's Ø3.4 — a Ø3.4 hole under a Ø4.0 recess would leave a 0.3 mm bearing ring) |

Plus comment-only sweeps (M3→M2 labels, screw shopping note ≈M2×5 board-side / M2×6 plate-side,
`plate_hole_dia` user parameter added) and a bookkeeping fix from Track B: the Z-map inline
comments were stale (6.0-era `NEG_Z_POCKET` values) and now match the live 6.5 constants
(plate top −8.1, plate bottom −11.1, cage 29.85). No geometry moved for item 10 — comments only.

## (c) What the reference COULD NOT tell us (documented keeps, file 23 §a/§b)

- **Bay clearance (kept 1.0/side vs their ~0.07):** the reference locates the board by its bay
  walls (net fit); we locate by the four screw bosses. Their tighter value encodes a different
  locating strategy, not a better tolerance.
- **Total height (kept 29.85 vs their ~25):** the console roofs flat modules ~2 mm above the
  module-PCB plane; we roof an ERM motor at +15.25 (+1.0 clearance +2.5 roof) and carry a 6.5 mm
  −Z pocket + 3.0 plate. Every mm of the Δ is a measured stack item the console doesn't have.
- **USB slot (kept 12 × 7 + funnel vs their 8.6 × 3.5):** their plug-snug slot works only because
  their wall web ahead of the receptacle is ~0.6 mm; ours is ~2.1 mm, so the cable overmold nose
  must enter the opening or the plug cannot reach full insertion depth.
- **Module seats (kept 24.6 vs their net 22.0):** we carry the measured ±1.27 X-registration
  ambiguity (file 16 row 28); their pockets ARE their registration and never faced it.
- **LCD window (kept 13.5 × 27.9 vs their ~17.2 × 19.4):** the reference's own LCD data is
  internally inconsistent (a 22×22 pocket cannot hold the 29×22 AX22-0034 PCB; a 19.4-long window
  would clip the 21.7 mm active area), so its window did not port. Ours derives from the module's
  own STEP glass solid, twice-confirmed.
- **Encoder bore (kept Ø16 vs their Ø9.5):** different architectures (their bore passes only the
  Ø7 bushing, knob proud of the face; ours passes the can/knob envelope). Useful datum gained:
  a real knob for this encoder is **Ø13** — comfortably inside our Ø16 bore.
- **Lugs, plate solidity, button shelf, brutalist chamfers:** absent or categorically different
  in a console shell; reference is silent. (Their printed button *plunger* in a 2.8 × 11 slot is
  a nice alternative pattern, noted for future iterations.)

## (d) Updated UNKNOWN-CONFIRMED list (post-reference-check)

1. **ERM coin Ø + protrusion** — UNCHANGED unknown. The console has no motors; caliper before
   adding any local coin recess (roof seat tolerates Ø8–12).
2. **Module X-registration ±1.27** — UNCHANGED unknown. Dry-fit each module; pockets carry
   ≥1.3 mm either way. (The reference's net pockets show its author never needed the allowance —
   weak comfort, different registration scheme.)
3. **Encoder knob OD** — DOWNGRADED. The reference ships a Ø13 knurled knob cover for this same
   encoder; our Ø16 bore clears it with 1.5 mm/side. Still caliper the actual knob you fit.
4. **Board hole Ø3.4 / screw standard** — **RESOLVED.** M2 self-tapping adopted (reference
   evidence, file 23 §b Q1). Residual action is procurement, not measurement: buy M2 self-tap
   screws (~M2×5 board-side, ~M2×6 plate-side for the shared Ø1.8 pilot — NOT the reference's
   M2×20, which suits its through-screw clamshell).
5. **Seating assumption (module PCB top ≈ +11.56)** — UNCHANGED unknown, weakly corroborated:
   the reference's ~25 mm assembled height is consistent with the same socket-mated stack, but
   its STEP is exploded (assembled height was LOW-confidence inference), so the dry-fit caliper
   check stands.

## (e) Remaining print risks

| # | Risk | Mitigation |
|---|---|---|
| 1 | **Ø1.8 pilot prints undersize in FDM** (holes shrink ~0.1–0.3 mm) — an M2 may bind hard on first drive | Drive screws slowly on first assembly; if binding, open the pilot with a 1.5–1.6 mm bit. Boss Ø7.0 (3.9× pilot) has ample hoop strength |
| 2 | Full script still unvalidated in a live Fusion build — the user's run died at the (now-fixed) Part-document component call before any geometry was built | Re-run in Fusion; check the messageBox skip-list. Fit geometry errors loudly by design |
| 3 | Plate counterbore deepened to 2.0 in the 3.0 plate → 1.0 mm web under the head | Fine in solid PLA printed flat-side-down; don't thin `PLATE_T` below 3.0 |
| 4 | Reference corroboration is architectural, not dimensional, for the ±Z stack (its STEP is exploded) | Stack risks unchanged from file 20 §7 (wear-test, haptic transmission) |
| 5 | Carried risks from file 20 §7 (chamfer edge-filters, user-params-as-documentation, encoder height) | Unchanged |

## Verification criteria — status

1. ✅ File 21: reference fully measured, 19+ feature rows (16 canonical + sub-rows), snapshots taken.
2. ✅ File 23: every row ✅/⚠️/❌ with resolutions + concrete change list.
3. ✅ M2-vs-M3 resolved with measured Ø evidence + cited pilot-hole standards; constants updated (file 24).
4. ✅ `python -m py_compile cad/braille_wearable_enclosure.py` exit 0 (confirmed in file 24 and re-run after final comment edits).
5. ✅ File 24 correction log: every change old → new.
6. ✅ This file, with the updated UNKNOWN-CONFIRMED list (§d).
7. ✅ No fit-critical constant deviates from the reference by >0.5 mm without a documented reason (file 23 §a/§b).
