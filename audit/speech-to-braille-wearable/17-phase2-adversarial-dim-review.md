# 17 — Phase 2 Adversarial Dimension Review (context-clean re-derivation vs file 16)

**Type:** Phase 2 verification gate for the enclosure CAD pipeline.
**Date:** 2026-07-17
**Method:** A fresh Opus sub-agent re-derived every fit-critical dimension from ONLY the raw primary sources — `parts/` STEP files (OCP resolved solids), parts corpus text, board photos, web datasheets, and the plan's locked pin-map excerpt. It was forbidden from reading audit files 00–16, `cad/`, or `renders/`, and did not. Its independent table: `scratchpad/phase2-independent-dims.md` (session scratchpad; key values reproduced below). The ORCHESTRATOR then diffed that table against `16-phase1-reconciled-dims.md`; every discrepancy ≥0.2 mm or categorical disagreement got a grill-me interrogation (evidence probes against both sides until one won). Corrections were folded back into file 16 (Rev 2) and file 14 (addendum §A7).

---

## 1. Agreement matrix (independent derivation vs file 16 Rev 1)

| Item | File 16 (Phase 1) | Phase 2 independent | Verdict |
|---|---|---|---|
| Board outline | 55.00 × 55.00 | 55 × 55 | ✅ agree |
| PCB thickness | core 1.51 / mask 1.61 / nominal 1.6 | 1.510 (core) | ✅ agree (datum difference only) |
| Mounting holes | Ø3.40 at (±24.1, ±24.1); corpus-spec 2.7 flagged | same values, same flag, independently | ✅ agree — incl. the Ø3.4-vs-Ø2.7 anomaly, found twice independently |
| Port centres / pitch | (±12, ±12), 24.0 pitch, 2 sockets/port, pin pitch 2.54 | identical | ✅ agree |
| Socket height above PCB top | 7.50 | 7.555 (core-face datum) | ✅ agree (0.05 = soldermask datum artifact; both read socket top z = 9.065) |
| Silk map + diagonal verdict | P1(−12,−12) P2(+12,−12) P3(+12,+12) P4(−12,+12); diagonals {1,3},{2,4}; pin-map "1&4 diagonal" FALSE | identical, independently from photos | ✅ agree — **the categorical Port-1&4-adjacent finding is now double-confirmed** |
| USB-C | +X edge, Y=0, 7.9×8.9×4.2, z −3.29→+0.91, 1.41 proud | identical (8.94/4.21/1.411/3.295) | ✅ agree |
| Deepest −Z | 5.59 below PCB bottom | 5.585 | ✅ agree |
| Module footprints/holes/headers | 22×22 (LCD 29×22), Ø2.7 at (±9,±9)/(±12.5,±9), rows 17.78 apart, pins 8.55 below | identical | ✅ agree |
| Encoder | shaft Ø6.0, axis exactly at port centre | identical | ✅ agree |
| ERM coin | Ø10 × 2.7 (LCSC C2759984, LEADER LCM1027A2445F); no coin in STEP | identical, independently | ✅ agree (caliper caveat retained) |
| Button count/positions | 3× at (25.76, {+17, 0, −17}) | identical | ✅ agree |
| Strap | 22 mm standard; steel spring bar Ø1.78 | identical | ✅ agree |
| LCD long-axis constraint | forced along board-Y; exactly one viable flip | identical conclusion | ✅ agree (centre value disputed → D2) |

## 2. Disputes ≥0.2 mm / categorical → grill-me record

### D1 — Onboard button actuation (categorical) → **Phase 2 auditor WINS**
- Phase 1 (file 14 v1): "side-actuated", from the `skrpade010` part-name reading → +X wall holes.
- Phase 2: top-actuated (+Z).
- **Grill evidence:** (a) orchestrator fetched the ALPS SKRPADE010 listing — DigiKey: actuator "Oval Button", direction **"Top Actuated"**, body 4.2×3.2×2.5 (https://www.digikey.com/en/products/detail/alps-alpine/SKRPADE010/19529205; ALPS: https://tech.alpsalpine.com/e/products/detail/SKRPADE010/). (b) Phase 1 agent geometry probe: the ONLY moving-element feature is a **Ø2.20 cylinder with +Z axis** at each switch centre, top ≈ z+4.00; the +X face is a flat box side 0.14 from the board edge with no plunger.
- **Resolution:** TOP-actuated. Enclosure access = openings through the outer (+Z) face over the button row, with a stepped-down roof strip (plungers are ~13 mm below the main roof level). File 16 rows 9, C4/C10 updated.

### D2 — Mated seating height (Δ2.55, fit-critical) → **Phase 2 auditor WINS**
- Phase 1 v1: module PCB bottom directly on socket top → +7.50 above board top.
- Phase 2: header **plastic insulator base** seats on the socket top → +10.055.
- **Grill evidence (Phase 1 agent re-measured, conceded):** header solid has a 12.70 × 2.54 plastic block with horizontal faces at module-local z −2.545/−0.005 → **2.54 mm insulator** flush under the module PCB; pins extend 6.00 below the plastic and insert into the 7.5 socket without bottoming out (tip z +3.07 vs socket floor).
- **Resolution:** standoff = **10.05**; module PCB top **11.56**; LCD glass top **13.18**; ERM motor top **15.25**; encoder shaft tip **38.25** — all above board top face. Phase 1 and Phase 2 now agree to 0.01. File 16 rows 16, 17, 26, A.4, §C updated; file 14 §A7 appended.

### D3 — LCD mated centre (Δ3.5, fit-critical) → **Phase 1 WINS (defense held)**
- Phase 1: header-centroid→port-centre with the LCD's offset headers → PCB centre (12, −15.5), glass centre (11.98, −14.38), overhang past −Y board edge 2.5 (PCB) / 1.9 (glass).
- Phase 2: module-centre→port-centre → (12, −12), glass-envelope overhang only 0.6.
- **Grill evidence:** Phase 1 re-measured the LCD header solid: plastic X-extent [−9.85, +2.75], pins [−8.85, +1.75] → **header centroid at local x = −3.55**, while ERM/encoder/button headers measure exactly 0.00 (rules out artifact). Pins-in-sockets is a hard constraint → the mated PCB centre MUST shift +3.5 from the port centre. Phase 2 simply missed the offset (its own summary listed generic "rows at ±8.89" without the LCD x-offset).
- **Resolution:** LCD PCB centre **(12, −15.5)**, window centre **(11.98, −14.38)**, −Y wall relief for the 2.5 mm overhang. Unchanged in file 16.

### D-minor (below threshold or datum-only, no action)
- Socket height 7.50 vs 7.555 and PCB 1.51 vs 1.6 — soldermask-vs-core datum choices; file 16 states both faces explicitly.
- ERM motor envelope top 3.69 vs corpus ~3.6 — within noise; envelope value kept.
- LCD "wrong-flip overhang 0.6" (Phase 2) vs "inward collides 5 mm" (Phase 1): artifacts of the different mated centres in D3; with D3 resolved, exactly one viable flip remains (glass end outboard, 2.5 mm PCB overhang), both agents' collision logic concurs.

## 3. Gate status for Phase 3

- **UNKNOWN-CONTESTED items affecting enclosure fit: NONE.** All three disputes resolved with measured evidence; both agents' tables now coincide on every fit-critical anchor (board bay, bosses, port/module positions, LCD window, encoder axis, USB slot, button access, stack heights, −Z pocket depth).
- Remaining UNKNOWN-CONFIRMED (not contested — physically unmeasurable from sources; see file 16 §E): ERM coin Ø (Ø10 datasheet-typical, caliper), module X-registration ±1.27 (pin-1 polarity; pockets carry ≥1.3 clearance), encoder knob OD (clearance ring parameter), board hole Ø3.4-vs-spec-2.7 (model Ø3.4 + caliper check). Each is handled by documented design tolerance, so **Phase 3 is UNBLOCKED**.

## 4. What changed

- File 14: §A7 round-2 corrections appended (seating +2.54, buttons top-actuated); switch row corrected.
- File 16 → Rev 2: rows 9, 16, 17, 26; stack table A.4; anchor set §C (button access + LCD relief z-band + heights); conflict log C4 split + C10–C12 added.
- Independent Phase 2 table preserved at `scratchpad/phase2-independent-dims.md` (session artifact; key values captured in §1–§2 above for durability).

## Residual risk

- Both tracks read the same STEP files — a modeling error IN the STEP (vs the physical board) would pass both reviews. Mitigations: the §E physical checklist (coin Ø, M3 screw drop-test, dry-fit registration), plus the pockets' documented clearances.
- The 0.16 mm socket-pair vs header-row grid incoherence in the STEP footprints (14 §A7 finding) is absorbed by the ≥1.3 mm row-direction pocket clearance.
- Phase 2's independence was enforced by prompt-level path restriction; its final report and scratchpad table contain no references to audit-file content, and its values arrived with independent derivations (including catching two Phase 1 errors) — strong evidence the isolation held.
