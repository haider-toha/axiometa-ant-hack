# 16 — Phase 1 Reconciled Dimension Truth Table

**Type:** Orchestrator reconciliation of Phase 1 Track A (`14-phase1a-step-dims.md`, STEP solid geometry via OCP/CAF reader, incl. mated-placement addendum) and Track B (`15-phase1b-doc-web-dims.md`, audit corpus + web datasheets + official Fusion API docs).
**Date:** 2026-07-17
**Status:** SINGLE SOURCE OF TRUTH for all downstream enclosure-CAD phases (2–4). Where A and B conflicted, the conflict is recorded below with a stated resolution — nothing was silently merged.
**Rev 2 (same date):** Phase 2 adversarial corrections folded in (see `17-phase2-adversarial-dim-review.md`): mated seating +2.54 mm (header plastic base seats on socket top), onboard buttons are TOP-actuated, LCD +3.5 mm mated offset re-confirmed by measurement.
**Additional evidence used by the orchestrator:** board photographs `parts/.../axiometa-genesis-mini/images/gallery/IMG_6063_*.png` and `BUN0001-HERO.png`, and PCB render `images/pcb/TOP_MTX0013.png` (mirrored EDA export), read directly this session to bind silk port numbers to STEP refdes positions.

---

## Coordinate datum (all XY/Z below use this frame)

- Origin = geometric centre of the 55 × 55 mm host PCB.
- **+X = the USB-C / button edge.** +Z = component/socket ("outer") face. −Z = ESP32/skin side.
- PCB top face = z +1.56, PCB bottom face = z −0.05 (model coords). For stack-ups below, "above board top" means above z +1.56.
- Silk port map (photo-bound, see §Conflicts C7): **Port 1 = (−12, −12) · Port 2 = (+12, −12) · Port 3 = (+12, +12) · Port 4 = (−12, +12).** Port pitch 24.0 mm both axes. Diagonal pairs: **{1,3} and {2,4}** (33.9 mm centre-to-centre); {1,4} and {2,3} are ADJACENT pairs (24.0 mm).

---

## A. Reconciled truth table

Confidence: HIGH = measured from resolved STEP solids (Track A) or verbatim datasheet; MED = datasheet-typical or single-method estimate; DESIGN = a design choice, not a measurement. Source column: A = file 14, B = file 15, A+ = file 14 addendum, PHOTO = board photos read by orchestrator.

### A.1 Host board (Genesis Mini, STP_MTX0013)

| # | Dim | Value (mm) | Conf | Source / note |
|---|---|---|---|---|
| 1 | PCB outline | 55.00 × 55.00 | HIGH | A + B agree |
| 2 | PCB thickness (nominal for slots) | **1.6** (core 1.51, mask-to-mask 1.61) | HIGH | A; B's ~1.6 [approx] confirmed |
| 3 | Board mounting holes | **4× Ø3.40** through at **(±24.10, ±24.10)**, Ø6.8 pad ring | HIGH | A. **Conflict C1 resolved** — corpus said Ø2.7 |
| 4 | AX22 ports | 4 ports, each = **pair of 2×5 sockets**, centres (±12, ±12) | HIGH | A. Conflict C2 resolved (corpus assumed 1× 2×5/port) |
| 5 | Socket pin pitch | 2.54 (rows); within-socket contact-column pitch 6.74 | HIGH | A+; corpus "2.0 vs 2.54?" resolved → 2.54 |
| 6 | Socket body (each 2×5) | 6.80 × 12.70 × **7.50 tall** above PCB top | HIGH | A. **Conflict C3 resolved** — corpus standoff ~8.6 |
| 7 | Socket row Y positions | ±(6.92, 9.46, 12.00, 14.54, 17.08) — −Y ports mirror +Y exactly | HIGH | A+ |
| 8 | USB-C receptacle | +X edge, centred Y=0; body 7.9 × 8.9 × 4.2; z −3.29→+0.91 (mostly below PCB); protrudes **1.41** past board edge | HIGH | A. Was UNKNOWN in corpus |
| 9 | Onboard tactile buttons | **3×** TOP-actuated (+Z) ALPS SKRPADE010 (BOOT / user-45 / RESET), Ø2.2 plunger, at (25.76, +17.0), (25.76, +0.0), (25.76, −17.0); plunger top ≈2.4 above PCB top | HIGH | A (round-2 geometry) + DigiKey datasheet. **Conflicts C4 + C10 resolved** — render showed 2; A's first-pass "side-actuated" label was wrong. Access = openings in the OUTER face over the button row (stepped-down roof strip recommended — caps are ~13 mm below the main roof) |
| 10 | ESP32-S3 module (−Z) | 20.5 × 15.4 × 2.6, centre (−17.1, 0), bottom −2.66 below PCB bottom | HIGH | A |
| 11 | Deepest −Z feature | **JST-PH (J19) to −5.59 below PCB bottom**; JST J18 (24.4, −15.8), J19 (19.2, +15.8) | HIGH | A. **Conflict C5 resolved** — corpus "~4 mm bulk" |
| 12 | Board assembly overall bbox | 56.41 × 55.00 × 14.65 (bare board incl. sockets/USB) | HIGH | A |

### A.2 Modules (mounted set: 2× ERM, LCD, encoder)

| # | Dim | Value (mm) | Conf | Source / note |
|---|---|---|---|---|
| 13 | Module PCB (ERM, encoder) | 22.00 × 22.00 × 1.51 | HIGH | A + B agree |
| 14 | LCD module PCB | **29.00 × 22.00** × 1.51 (29 axis mates along board-Y) | HIGH | A + B agree (13's 22×22 draw bug stands corrected) |
| 15 | Module mounting holes | 4× Ø2.70; 22×22 modules at (±9, ±9); LCD at (±12.5, ±9) local | HIGH | A |
| 16 | Module header rows | 2× 1×5 P2.54 per module, rows 17.78 apart; **plastic insulator base 2.54 tall** under the module PCB, pins 6.00 below the plastic (8.55 total below module PCB) | HIGH | A+ round 2. Corpus "~3 mm" was wrong (C6) |
| 17 | Mated module standoff (module PCB bottom above board top) | **10.05** — the header plastic base seats on the socket top (7.5 socket + 2.54 plastic); pins insert 6.0 into the socket and do NOT bottom out; module PCB top at **+11.56** | HIGH | A+ round 2, conceded to Phase 2 auditor (C11). Replaces both corpus ~8.6 (C3) and A's first-pass 7.50 |
| 18 | ERM motor body | rectangular envelope 18.20 × 16.54 × 4.35; top **3.69 above module PCB top** | HIGH (envelope) | A; corpus ~3.6 agrees |
| 19 | ERM coin diameter | **Ø10 (datasheet-typical)** — LCSC C2759984 = LEADER LCM1027A2445F Ø10 × 2.7 | MED | B. **UNKNOWN-CONFIRMED residue:** no coin in STEP (A); electrical mismatch (80 vs 90 mA) means possible sibling SKU → caliper before final pocket sizing |
| 20 | LCD glass/panel | envelope 29.97 × 13.50, proud **1.62** above module PCB top; datasheet visible glass 13.5 × 27.9, active 10.8 × 21.7 | HIGH | A + B. Panel proud: A's 1.62 supersedes corpus 2–3 (C6) |
| 21 | LCD panel overhang past module PCB | ~1.6 (on the pins-away end) | MED | A |
| 22 | Encoder shaft | **Ø6.0 D-shaft**; tip **26.68 above module PCB top**; Ø7 threaded bushing below; can body top ~18.9 above module PCB | HIGH (tip) / MED (Ø) | A. **Conflict C6 resolved** — corpus "~20.4 tallest" under-measured |
| 23 | Encoder knob OD | UNKNOWN-CONFIRMED (no knob modeled; EC11 knobs vary) | — | A + B. Design clearance instead (see §D) |

### A.3 Mated placements in board frame (file 14 addendum; per plan's LOCKED diagonal rule — see §C7)

| # | Item | Value | Conf | Note |
|---|---|---|---|---|
| 24 | Motor A seat | ERM module centred **(−12, −12)** (Port 1) | HIGH | motor envelope centre offset ±(0.85, 0.70) from module centre |
| 25 | Motor B seat | ERM module centred **(+12, +12)** (Port 3) | HIGH | diagonal to Motor A, 33.9 mm separation — max the board allows |
| 26 | Encoder seat | module centred **(−12, +12)** (Port 4); **shaft axis exactly (−12, +12)**, rotation-independent | HIGH | shaft tip ≈ z +39.81 model ≈ **38.25 above board top** (rev 2) |
| 27 | LCD seat | module centred **(+12, −15.5)** (Port 2); **glass centre (+11.98, −14.38)**; 29 axis along board-Y, outward (−Y) — the ONLY viable orientation (inward collides ~5 mm with the Port-1/Port-4-row neighbour) | HIGH | **overhangs board −Y edge: 2.5 (PCB) / ~1.9 (glass)** — enclosure −Y wall needs a relief |
| 28 | Module X-registration ambiguity | mated centre may shift **±1.27 in the row direction** (pin-1 polarity not in STEP) | UNKNOWN-CONFIRMED | pockets need ≥1.3 clearance in the row direction; dry-fit check instruction in §E |

### A.4 Derived stack-up (above board top face, mated)

| Level | Height above board top (mm) | Conf |
|---|---|---|
| Socket top | 7.50 | HIGH |
| Module PCB bottom (header plastic base on socket top) | 10.05 | HIGH |
| Module PCB top | 11.56 | HIGH |
| LCD glass top | 13.18 | HIGH |
| ERM motor top | 15.25 | HIGH |
| Onboard button plunger tops | ~2.4 | HIGH |
| Encoder shaft tip (tallest) | **38.25** | HIGH |
| Below board: ESP32 −2.66 · USB-C −3.29 · JST-PH **−5.59** (deepest) | | HIGH |

### A.5 Enclosure / strap design values (design choices, carried from corpus)

| Dim | Value | Status |
|---|---|---|
| Cage outer envelope | ~62 × 62 (55 board + 1 bay clearance + 2.5 wall per side) | DESIGN (05/12/13) |
| Cage wall | ≥2.5 | DESIGN |
| Skin plate | ≥3.0 solid rigid PLA, no holes/membrane | DESIGN (07 §4) |
| Board −Z clearance pocket | **≥6.0 deep** (clears JST −5.59) | DESIGN, driven by row 11 — supersedes the "≥4" figure in the task brief |
| Lug gap / strap width | 22.0 internal | DESIGN, web-confirmed standard (B) |
| Lug bore | Ø2.6 through (printed Ø2.5 pin); note real steel spring bars are Ø1.78 → Ø2.6 also admits them loosely | DESIGN (10/12) |
| Board screw bosses | 4× for **M3** at (±24.1, ±24.1) (hole Ø3.4) | DESIGN, driven by row 3 |

### A.6 Fusion 360 API facts (Track B, official help.autodesk.com, all fetched HTTP 200)

| Item | Value | URL |
|---|---|---|
| Internal length unit | **centimeters**, always (angles radians) | https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/Units_UM.htm |
| `ValueInput.createByReal(x)` | x in cm → **mm value ÷ 10** | https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/ValueInput_createByReal.htm |
| `extrudeFeatures.addSimple(profile, dist, op)` | confirmed | https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/ExtrudeFeatures_addSimple.htm |
| `FeatureOperations` | Join=0, Cut=1, Intersect=2, NewBody=3 | https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/FeatureOperations.htm |
| `chamferFeatures.createInput(edges, isTangentChain)` → `.add()` | confirmed; `setToEqualDistance` on ChamferFeatureInput | https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/ChamferFeatures_createInput.htm |
| `userParameters.add(name, ValueInput, units, comment)` | confirmed; units string "mm" supported | https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/UserParameters_add.htm |

---

## B. Conflict log (A vs B vs brief — every discrepancy ≥0.2 mm or categorical)

| # | Item | Track A (STEP) | Track B (corpus/web) | Winner + reason |
|---|---|---|---|---|
| C1 | Board mounting holes | Ø3.40 at (±24.1, ±24.1) | Ø2.7 "near corners" (CONTENT.md) | **A.** 4 clean cylindrical faces measured; the corpus Ø2.7 text was copied from the module template (modules really are Ø2.7). Design bosses for M3; §E caliper check. |
| C2 | Sockets per port | 2× 2×5 per port (8 total, 80 pins) | 1× 2×5 per port assumed | **A.** Direct component count. No enclosure impact (pockets are per-module). |
| C3 | Module standoff | 7.50 (socket body height, direct) | ~8.6 (derived from contaminated point-cloud Zmax 10.25) | **A.** Resolved solids beat point-cloud subtraction. Stack shrinks ~1.1. |
| C4 | Onboard button count | 3 | render suggested 2 | **A + PHOTO.** 3 buttons (BOOT/45/RESET). |
| C5 | −Z envelope | JST-PH to −5.59 (ESP −2.66) | "bulk ~4 mm" | **A.** Pocket deepened to ≥6.0 (§A.5). The brief's "≥4 mm" is superseded. |
| C6 | Encoder height / LCD proud / pin length | shaft tip +26.68 above module PCB; LCD proud 1.62; pins 8.55 | ~20.4 tallest; 2–3; ~3 | **A** on all three. Corpus point-cloud truncated the shaft (20.4 was the can body) and guessed pins. Device is ~5–6 taller than corpus estimates. |
| C7 | Port numbering / motor diagonal | STEP has refdes U1–U4 only; addendum + photos bind silk: P1(−12,−12), P2(+12,−12), P3(+12,+12), P4(−12,+12) | plan's pin map **default** assumed Ports 1 & 4 are diagonal | **PHOTO + plan's own locked rule.** Silk Ports 1 & 4 are ADJACENT (both −X column). The plan's overriding locked instruction is "put the two motors on the two physically farthest-apart ports (diagonal corners) — confirm the diagonal by eye; the default below assumes Port 1 & Port 4." The confirmation now exists and falsifies the default. **Enclosure is designed for motors on diagonal {Port 1, Port 3}, LCD on Port 2 (unchanged), encoder on Port 4.** Rationale: keeps ERM on Port 1 (strapping-pin preference, audit 03 §7.5) and leaves the LCD's SPI pins untouched; only Motor B (→Port 3, data GPIO9) and encoder (→Port 4, BT=GPIO1/CL=GPIO17/DT=GPIO18) swap. ⚠️ **Firmware `pins.h` must be updated accordingly — flagged to the builder; NOT an enclosure change.** |
| C8 | ERM coin | no coin modeled (rect envelope) | Ø10 × 2.7 datasheet (sibling-SKU caveat) | **B for nominal Ø10 (MED)**; protrusion from A (3.69 envelope). Caliper before print (§E). |
| C9 | LCD glass length | glass envelope 29.97 long | datasheet visible glass 27.9 | **Both, different things.** Window through-cut sized to visible glass 13.5 × 27.9; pocket/relief must clear the full 29.97 envelope + PCB. |
| C10 | Button actuation (Phase 2 round) | A first pass: "side-actuated" (from part-name guess) | Phase 2 auditor: top-actuated | **Phase 2 auditor.** A's round-2 geometry probe found the only actuator is a Ø2.2 +Z-axis cylinder (no +X plunger); ALPS SKRPADE010 datasheet (DigiKey) confirms "Top Actuated". Face openings, not wall holes. |
| C11 | Mated seating height (Phase 2 round) | A first pass: module PCB bottom on socket top (+7.50) | Phase 2 auditor: header plastic base on socket top (+10.05) | **Phase 2 auditor.** A measured the 2.54 mm plastic insulator base (12.70 × 2.54 footprint, faces at −2.545/−0.005 module-local) and conceded; pins (6.0 below plastic) do not bottom out in the 7.5 socket. All stack heights +2.54. |
| C12 | LCD mated centre (Phase 2 round) | A: port centre +3.5 → (12, −15.5) | Phase 2 auditor: module-centre-on-port → (12, −12) | **A (defense held).** Direct measurement: LCD header centroid at local x = −3.55 (plastic X-extent −9.85…+2.75), while ERM/encoder/button headers measure exactly 0.00 — pin-in-socket alignment forces the +3.5 mated shift. The auditor omitted the offset. Window centre (11.98, −14.38) stands. |

---

## C. Fit-critical anchor set for the enclosure script (consume these numbers)

- Board bay: 55.0 × 55.0 + clearance; bosses M3 at (±24.1, ±24.1).
- ERM pockets (2): 22×22 module seats centred (−12, −12) and (+12, +12); motor top at +15.25 above board top.
- Encoder: shaft hole axis (−12, +12); Ø6 shaft; tip +38.25 above board top; knob clearance = design parameter.
- LCD: window 13.5 × 27.9 through-cut centred (+11.98, −14.38), long axis board-Y; module pocket must admit 29×22 PCB centred (+12, −15.5) + glass envelope to 29.97 + **−Y wall relief for 2.5 mm overhang** at z ≈ +10…+14.7 above board top, x span **−0.3…+24.3** (the FULL 22 mm PCB width + 1.3 registration clearance per side — Rev 3 correction per Phase-4 F1: an earlier revision under-specified this to the 13.5 mm glass width, x +5.2…+18.7, which would leave the PCB corners colliding).
- USB-C slot: +X wall, centred Y=0; receptacle z −3.29→+0.91 rel. PCB bottom; opening sized generously for cable overmold (design ≥ 12 wide × 7 tall recommended).
- Button access: 3× openings through the OUTER (+Z) face over (25.76, +17), (25.76, 0), (25.76, −17) — plunger tops only ~2.4 above board top, so step the roof down over the button strip (x ≈ +23.5…bay edge) or the holes are unusably deep (~13+ mm). Top-actuated Ø2.2 plungers (C10).
- −Z pocket: ≥6.0 deep under the board (JST −5.59), spanning at least the ESP32 + JST + USB-C underbody region.
- Lugs: 2 bosses per ±Y side, 22.0 internal gap, Ø2.6 bore, boss outer faces chamfered.
- All module pockets: ≥1.3 mm clearance in the socket-row direction (X-registration ambiguity, row 28).

## D. Design-choice registry (explicitly NOT measurements)

Chamfer sizes, panel-line grooves (~0.5 deep × 1 wide), 2 mm step-rim, hex ring around encoder, knob clearance bore (recommend Ø14–16 for unknown knob OD ≤ Ø12 + finger room to be validated), USB funnel chamfer 1.5, bay clearance 0.5–1.0/side, pocket clearances 0.5 + the 1.3 row-direction allowance, plate 3.0, wall 2.5, cage 62.

## E. Physical checks before printing (UNKNOWN-CONFIRMED residue)

1. **ERM coin Ø + protrusion** — calipers on the physical module (datasheet-typical Ø10 × 2.7; envelope protrusion 3.69).
2. **Board hole Ø3.4 / M3** — drop an M3 screw through a physical board corner hole.
3. **Module X-registration ±1.27** — dry-fit each module, verify it centres on its port (silk pin labels give polarity).
4. **Encoder knob OD** (if a knob is fitted) — calipers; enclosure uses a clearance ring parameter.
5. **Port swap in firmware** — Motor B → Port 3 (GPIO9), encoder → Port 4 (1/17/18); verify against silk before flashing (C7).

## Residual risk

- The whole mated-stack model assumes modules bottom out on the socket bodies (pins 8.55 > socket 7.5 means tips approach the board surface — geometry supports seating on the socket shroud). If a module rides high, stack heights grow ≤1 mm; pockets below are unaffected.
- The LCD overhang relief and lug bosses share the −Y wall; keep the relief above the lug boss root (relief z ≥ +9 above board top; lug bores near plate level) — geometrically compatible, verify in the model.
- Ø10 coin pocket features (if any local recess is modeled) must tolerate a Ø8–12 coin until calipered.
