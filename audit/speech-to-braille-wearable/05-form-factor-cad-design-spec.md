# 05 — Phase 3: Form-Factor Decision + CAD Design-Spec + Image-Gen Brief

**Type:** Phase 3 deliverable (design-spec + CAD brief + image prompts). **No STEP/STL/3MF authored** — per the standing constraint, this stops at the brief that feeds ChatGPT/image tools and a later CAD session.
**Date:** 2026-07-17
**Inputs:** `00-grilling-locked-decisions.md` (decisions 7, 8), `02-track-2-encoding-body-site.md` (spacing, placement), `03-track-3-parts-truth.md` (§6 geometry, §9 unknowns), `plan/2026-07-17-speech-to-braille-wearable.md`.
**Dimensional rule honoured:** every dimension below is quoted from Track 3 / the parts corpus, or marked **UNKNOWN → measure**. Nothing is invented.

> **⚠️ SUPERSEDED IN PART by `07-geometry-physical-coherence.md` (2026-07-17).** A physical-coherence audit found this file wrongly implied motors on the skin side and specified a **soft membrane** for coupling. The truth: **all 4 modules mount on the SAME outer face; the two motors face OUTWARD and cannot be flipped without extensions (ruled out).** The device is worn **component-side-OUT**; the motors reach the wrist by **whole-chassis conduction into a SOLID RIGID skin plate** (a soft membrane would damp the buzz), with each ERM **rigidly clamped**. See `07` for the authoritative arrangement; the §4/CAD-brief lines below are corrected inline.

---

## Scope

Finalize the wearable's physical design enough to (a) generate concept images and (b) hand a later CAD session a dimensioned brief: form factor, board mounting, the motor-placement rule, keep-outs, strap approach, and print constraints. Resolve the one hard geometric conflict (central port cluster vs required motor separation).

---

## 1. Form-factor decision — WRISTBAND (confirmed)

**Decision: a wrist-worn cuff/band.** Track 2 §5 confirms it against the alternatives with evidence:
- **Fingertip/glove rejected** — a 10 mm ERM stimulates a whole fingertip, so two distinct motor points can't sit on one finger; the fingertip's acuity is for reading raised dots by sliding, not resolving two buzzers.
- **Transverse (around-the-wrist) beats longitudinal (along-the-forearm)** for two-point discrimination (ACM 10.1145/3743721; arXiv:2308.05497 anisotropy) — so the band goes *around the wrist*, not up the forearm.
- Wearability, all-day comfort, watch-form precedent, and existing wrist/forearm vibro-Braille bands all favour it.

## 2. Board placement — ON-WRIST, self-contained (locked decision 8)

The Genesis Mini rides **on the cuff**, components facing **outward (+Z, away from skin)** so the screen and encoder are usable and the USB-C port is reachable. USB-tethered to a **≥1 A power bank** for the demo (Global Constraints). "Slim all-day wearable" is the productionized pitch, not the demo unit — bulky-but-self-contained is fine.

## 3. THE central design problem — motor separation vs the port cluster

> **BUILDER DECISION (2026-07-17): no extension leads, no AX22 Port Extension Kit, no extra parts of any kind.** Strategy 1 below is **OFF the table** — retained only to record why remote-mounting would have helped. The two motors **snap directly into the board** (Strategy 2), on the two most-separated diagonal ports. Separation is whatever the on-board diagonal gives (well under 40 mm); this is **accepted**. Distinguishability comes from the **micro-stagger + strict-sequential fallback**, and the **on-screen caption is the ground truth** for acceptance. Design the enclosure for Strategy 2.

**Conflict.** Track 3 §6: the 4 AX22 ports are a **central 2×2 cluster** on the 55×55 mm board, sockets facing +Z. Two ERM modules snapped directly into that cluster sit only **~one socket-pitch apart** (pitch UNKNOWN, but small — tens of mm). Track 2 §5 requires **~70–90 mm surface path** for field-reliable two-point discrimination, with **40–50 mm already marginal**. **Directly-clustered motors cannot meet the spacing.** Track 3 §R5 flagged the same thing (motors seat on board-top; skin coupling + separation is a design problem).

**Two placement strategies (the CAD phase picks one; the wear test in plan Task C2 decides):**

### Strategy 1 — Remote-mounted motors (RECOMMENDED for the physics)
Relocate each ERM module off the board on a **no-solder 2×5 (10-pin) extension lead**, so the two motors sit at **opposite aspects of the wrist** — Motor A (left column) on the **dorsal-radial** (thumb-side back) face, Motor B (right column) on the **volar-ulnar** (pinky-side front) face — giving a **~70–90 mm surface path** while each presses directly to skin under strap tension. Electrically unchanged (still Port 1 GPIO4 / Port 2 GPIO7); only the physical location moves.
- **Dependency (procurement):** needs **2× no-solder 2×5 ribbon extensions**. The Axiometa **AX22 Port Extension Kit** does exactly this relocation (one module each) — which **reverses the `idea.md` "not buying the Port Extension Kit" decision** for the motors specifically. Alternative: generic pre-made 2×5 IDC ribbon jumpers if available at the event. **No soldering either way.** → This is the top open procurement item (see Residual risk R1).

### Strategy 2 — In-cluster motors (zero extra parts, fallback)
Both ERM modules stay snapped in the central cluster; the enclosure conducts their vibration to **two underside skin pads**. Because the pads are close together (~one pitch), spacing is **below marginal** → lean entirely on the **micro-stagger** rendering and be ready to switch the firmware to **strict-sequential encoding** (Track 2 rank #2), which never fires both motors at once and so needs only left-vs-right *identification*, not two-point discrimination. Wear-test (plan C2 Step 1) decides if this is acceptable; if the "both vs one" gate fails and can't be rescued, Strategy 1 or strict-sequential is mandatory.

**Design-spec position:** design the enclosure for **Strategy 1** (motor pods on leads) as the primary, because it is the only option that satisfies the locked spacing with direct skin contact; keep **Strategy 2** as the no-extra-parts fallback the same cuff can support (two blanking pads under the board). Confirm the extension-lead sourcing early (it gates which enclosure variant prints).

## 4. Motor placement rule (locked decision 7, refined by Track 2)

- **Axis:** transverse (around the wrist), thumb-side ↔ pinky-side — Motor A radial (left column), Motor B ulnar (right column) — a learnable left/right map.
- **Separation:** fixed by the board — the two motors sit at the on-board cluster **diagonal** (well under 40 mm, below the perceptual ideal). This is **accepted** (no extra parts). Put the motors on the two most-separated ports; the mitigations (micro-stagger + strict-sequential fallback + on-screen caption) carry it.
- **Coupling (CORRECTED per `07`):** the motors face **outward** in the cluster, not toward the skin. Vibration reaches the wrist by **whole-chassis conduction**: each ERM module must be **rigidly clamped** to a **solid rigid PLA skin-contact plate** on the wrist side — **NOT a soft membrane** (a compliant membrane, or leaving the coin floating on its ~10 mm compliant header pins, damps the buzz). The whole unit buzzes like a watch; strap tension holds the rigid plate firmly to the skin. Coin protrudes ~3.6 mm above its module `[approx — confirm]`.
- **Watch bone conduction:** opposite-face motors can couple through the wrist; wear-test item 9 checks for through-wrist "one feels like both" leakage.

## 5. Keep-outs & access (from Track 3 §6)

| Element | Requirement | Dimension (source) |
|---|---|---|
| Rotary-encoder shaft | outward-facing knob clearance + access hole; **tallest element** | shaft ~**20 mm** above PCB [approx — confirm] |
| LCD window | clear the glass + panel; outward-facing for captions | module 22×29 mm; **glass 13.5×27.9 mm**, active 10.8×21.7 mm; panel ~2–4 mm proud [approx] |
| USB-C port | side cut-out for charge + flash without removing the device | on one board edge; edge offset **UNKNOWN → measure** |
| AX22 port cluster | if Strategy 2: pockets/clearance for module bodies; sockets face +Z | 2×2 central cluster; socket height ~8–9 mm [approx]; **centres + pitch UNKNOWN → measure** |
| Board mounting | 4× ⌀2.7 mm corner holes → screw bosses or captive posts | board **55×55 mm**; **hole XY UNKNOWN → measure** |
| Motor pods (Strategy 1) | 22×22 mm module footprint each, 4× ⌀2.7 mm holes | **22×22 mm** (source: Track 3) |

## 6. Strap approach — fully 3D-printed linkage (no magnets, no fabric)

**Superseded by `10-printed-strap-linkage.md`** (the fully-printed constraint rules out fabric/velcro and bought spring bars). Recommended: a **print-in-place segmented pin-hinge band** closing with a **printed tang (pin) buckle** — 6–8 holes at 5 mm pitch → ~30–40 mm wrist adjustment. All gray PLA, magnet-free; every load lands on a rigid pivot or pin-in-hole, never a flexed PLA section (a PLA living-hinge cracks in ~50–200 cycles). **Fallback:** separately-printed coarse links + push-in printed pins, same buckle + lug interface (one small reprint if a print-in-place joint fuses). **Attachment to the cage:** a **printed captive cross-pin** as a spring-bar substitute — Ø2.5 mm pin, **Ø2.6 mm lug bores** (2 lugs/side, ~20–22 mm gap = standard watch-lug spacing), Ø2.8 mm strap-knuckle bore (0.30 mm pivot clearance), snap-retained by a chamfered barb, glue-free. **Action:** the cage author must freeze this shared **lug parameter set** (currently undimensioned in §5/`07`).

## 7. Print constraints (event)

- **Bambu Lab printers, PLA**, colours **black / white / grey / green** (`idea.md`).
- Design for **FDM/PLA**: ≥2 mm walls, generous fillets, no unsupported spans >~5 mm, flat base for bed adhesion, self-supporting motor recesses. Budget for **≥1 reprint** after the wear-test spacing sweep (plan C2) sets the final motor positions — **do not finalize the print until spacing is measured on a real wrist.**
- Function first, aesthetics last: print a rough functional v1 early.

---

## CAD brief (for the later CAD session — per the cad skill format)

```text
CAD brief:
- Model: braille_wrist_cuff — assembly (cuff/half-shell + board mount + 2 motor pods + strap slots).
- Task type: new assembly, first-pass conceptual → dimensioned once §9-unknowns are measured.
- Inputs: prose spec above + Track 3 geometry (audit 03 §6). NO reference STEP loaded yet (build123d/OCP not installed; ERM/LCD STEPs have annotation artifacts — do not trust their raw bbox).
- Units: millimeters. STEP is the primary artifact when authored (later).
- Coordinate convention: origin at board-mount centre; base plane = wrist-tangent XY; +Z outward (away from skin, toward screen/encoder).
- Overall dimensions: board bay 55×55 mm (+walls); band inner circumference sized to wrist (UNKNOWN → measure/parametric); total thickness = board bay + component stack (encoder shaft ~20 mm dominates the +Z envelope) [approx].
- Functional features:
  * board bay: 55×55 mm floor, 4 screw bosses at the board corner holes (⌀2.7 mm; XY UNKNOWN),
  * encoder access hole + ~20 mm knob clearance (outward),
  * LCD window ~13.5×27.9 mm glass (outward), panel pocket ~2–4 mm,
  * USB-C side cut-out (edge position UNKNOWN),
  * the two ERM modules (×2, 22×22 mm) seat in the OUTER socket cluster (same face as screen/knob); the wrist side is a SOLID RIGID skin-contact plate (no soft membrane), with the ERM modules rigidly clamped to it so vibration conducts,
  * strap slots (×2) for a fabric/velcro strap.
- Manufacturing assumptions: FDM PLA, ≥2 mm walls, 1–3 mm cosmetic fillets, self-supporting recesses, flat base.
- Positioning/mating: board seats components-up in the bay; motor pods positioned by the WEAR-TESTED separation (plan C2) — parametric `motor_separation_mm` (default 80, floor 40); strap slots tangent to the wrist curve.
- Paths (later): firmware/CAD out of scope this session; when authored, keep .py generator + .step same basename.
- Validation targets (later): one assembly compound, labelled children (cuff, board_mount, motor_pod_L, motor_pod_R); board bay bbox 55×55 mm; encoder clearance ≥20 mm; hole axes aligned to measured board holes.
- Assumptions (to confirm before printing): all §9 UNKNOWN dims (port centres/pitch, mounting-hole XY, motor/encoder/LCD heights, USB-C offset, board thickness ~1.6 mm) measured with calipers or a clean STEP load; motor_separation_mm set from the wear test.
```

**Blocking measurements before any real CAD (Track 3 §9 — measure with calipers or a CAD-kernel STEP load):** AX22 port centres + pitch + socket height; board + per-module mounting-hole XY; board thickness + −Z envelope; ERM protrusion; LCD panel height; encoder shaft length/diameter; USB-C position. **Do not invent these — the CAD stays parametric/rough until they're measured.**

---

## Image-gen prompt pack (for ChatGPT / image tools — concept only, not a fabrication spec)

**Shared style directive (prepend to each):**
> Industrial-design concept render, matte PLA 3D-printed prototype aesthetic (visible layer lines welcome), neutral studio background, soft product lighting, no text/logos, functional-first not luxury. Colours limited to black / white / grey / green PLA. Wrist-worn assistive device, watch-scale.

1. **Hero silhouette (dorsal view):** "A chunky matte-black 3D-printed wrist cuff worn on a forearm, watch-position, with a small rectangular colour screen and a knurled rotary knob on the outward face; a fabric velcro strap threads through printed side slots; a thin USB-C cable exits one edge. Bulky-but-clean functional prototype."
2. **Two-motor contact points (cutaway/ghost):** "Same wrist cuff, semi-transparent, showing two small round vibration-motor pods pressed against the skin at opposite sides of the wrist — one on the thumb-side back, one on the pinky-side underside — connected by thin ribbon leads to a central circuit board. Emphasise the wide separation of the two contact points."
3. **Screen + encoder usability (three-quarter):** "Close three-quarter view of the outward face: a 0.96-inch rectangular IPS screen showing a short caption, and a rotary encoder knob beside it positioned for the other hand to reach and turn; clean readable layout."
4. **On-body in use (context-neutral):** "A person wearing the cuff resting a hand on a counter in an everyday setting (deliberately generic — could be a shop, a station, an office), the other hand on the knob; conveys discreet, independent two-way communication. No specific venue branding."
5. **Strap + print detail (macro):** "Macro of the printed cuff edge: 2 mm matte PLA walls, generous fillets, a strap slot, and a shallow round recess with a thin membrane where a vibration motor couples to the skin. Rapid-prototype craftsmanship."

*(Images are for pitch/concept and to sanity-check proportions — not dimensioned CAD. Feed measured dims into the CAD brief above for the real model.)*

**Generated concepts (fal-ai/flux-2-pro, 2026-07-17)** — three multi-view sheets, saved to the session scratchpad, all correctly showing the two motor pads **close together** on the underside (matching the fixed-parts reality):
- Concept 1 — chunky utilitarian black square cuff (seed 484669526)
- Concept 2 — rounded pebble cuff, grey/green PLA (seed 1452372282)
- Concept 3 — exposed modular dev-kit, black/green with visible PCB (seed 32359137)
- **Faithful gray render** (fal `openai/gpt-image-2`, seed 1495874046) → `renders/faithful-gray-gptimage.png` — corrects colour + the modular architecture; reviewed 88/100 (`11`).
- **Dimensioned technical drawing** → `cad/braille_wearable_drawing.dxf` + `renders/braille_technical_drawing.png` (source `cad/braille_wearable_drawing.py`) — reviewed 8.5/10, fixes applied (`13`).

---

## What changed vs `idea.md` (physical design section)

- **Motor placement sharpened:** thumb/pinky **transverse** confirmed as the right *axis* (idea.md's "opposite sides of the wrist" was right in spirit). The ideal ~70–90 mm surface separation is **not achievable without extensions**, which are off the table — so the motors stay at the on-board diagonal and the mitigations carry the percept (see §3/§4).
- **Constraint accepted:** the central 2×2 port cluster means directly-snapped motors are close together; **per builder decision there are no extension leads or extra parts**, so the design owns the close spacing and leans on the micro-stagger + strict-sequential fallback + on-screen caption. (Remote-mounting would have helped but is off the table.)
- **Board orientation clarified:** components-up (screen/encoder/USB out), motors couple to the skin through the underside membrane — resolves Track 3 R5's coupling flag.

## Residual risk

| # | Risk | Severity | Route |
|---|---|---|---|
| R1 | **Motor separation below the perceptual ideal** — in-cluster diagonal only (well under 40 mm); no extensions per builder decision | **High (accepted)** | Micro-stagger + strict-sequential fallback + on-screen caption as ground truth; wear-test (plan C2) picks the encoding mode |
| R2 | **All CAD-critical dims UNKNOWN** (port centres/pitch, hole XY, heights, USB-C offset, board thickness) | High | Measure with calipers / clean STEP load before real CAD (Track 3 §9) — spec stays parametric until then |
| R3 | **Final motor position depends on the wear test** | Med | Do not finalize/print until plan C2 spacing sweep sets `motor_separation_mm`; budget ≥1 reprint |
| R4 | **Bone conduction across the wrist** at opposite-face placement | Med | Wear-test item 9; if leakage, move toward same-face wider spacing or micro-stagger only |
| R5 | **Skin-contact membrane** may damp the ERM too much | Low–Med | Keep membrane ~1 mm; test coupling (wear-test item 4); thin/flex the membrane if the buzz feels weak |

## Downstream pointers
- Feeds the later CAD session (not this one): the CAD brief + §9 measured dims.
- Feeds plan Task C-polish (enclosure print) and gated by plan Task C2 (wear-test spacing).
