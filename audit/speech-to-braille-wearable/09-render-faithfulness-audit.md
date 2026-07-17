# 09 — Render Faithfulness Audit (adversarial)

**Type:** Phase 3 verification track — adversarial audit of a generative-AI concept render against verified hardware.
**Date:** 2026-07-17
**Image audited:** `scratchpad/concept3-corrected-physically-honest.png` — a 3-view sheet (outer face · underside plate · iso) of an open printed cage holding a PCB with a screen, knob(s), and two round motor discs.
**Scope of authority:** The `parts/` corpus is source of truth, as consolidated in `03-track-3-parts-truth.md` (dims/appearance) and `07-geometry-physical-coherence.md` (physical arrangement). Local corpus wins on any conflict.
**Constraint honoured:** RESEARCH / AUDIT ONLY. No CAD authored, no STEP/STL written, no dimension invented. Every number below traces to `03`/`07` (which in turn trace to corpus); anything not sourced is marked **UNKNOWN**.

---

## Scope

The builder doubts the render is faithful and is right to. This audit (1) tears the render apart against verified facts, ranked by how misleading each deviation is; (2) restates the real component inventory with sourced dimensions and flagged UNKNOWNs; (3) delivers a paste-ready **faithful render spec** (image prompt + hand-draw diagram bullets) in **matte gray PLA, no green**; and (4) lists residual risk.

**Ground truth used (from corpus images read this session):**
- Host board `[IMG_6063]` / `[2BACK]` / `[HERO]`: the board and every module are **matte BLACK** PCBs. The component (+Z) face is dominated by a **central 2×2 cluster of four upright black 2×5 female sockets**, silk 1–4, with tiny RESET/BOOT tactile buttons and an edge USB-C. The **active silicon (ESP32-S3-MINI-1, buck, USB-C receptacle, battery JST, STEMMA QT, PWR/ACT LEDs) is all on the BACK (−Z) face**, not the component face.
- ERM `[ERM photo]` / `[ERM pins]`: a **22×22 mm black** module carrying **one small DARK coin motor (~10 mm ⌀, ~3.6 mm proud)** on top; male header pins protrude down from one face only.
- LCD `[LCD photo]`: a **22×29 mm black** module; the glass is a **landscape ~2:1 rectangle (13.5×27.9 mm)**, near-black when off, with a blue flex-ribbon on one short edge.
- Encoder `[ENC photo]`: a **22×22 mm black** module; the rotary **shaft/knob is the tallest element (~20 mm above its own PCB, ~30 mm above the host board)**.

**What the render already gets RIGHT** (stated up front, for fairness — the physical-coherence fix from `07` §5 did land): open exposed-cage aesthetic; **motors on the outer face, not the skin side**; **solid closed skin plate on the underside** (no motor pads on skin); **USB-C on the board edge**; a rotary knob present on the outer face; component-side-out wearing orientation; roughly square case. The remaining failures are **colour, material, component identity, size hierarchy, and internal structure** — not the gross geometry.

---

## Discrepancies (ranked by how misleading)

### 1. GREEN dominates — must be single-colour matte GRAY PLA with matte BLACK PCBs. **[most misleading]**
The render reads as a green device: a **green PCB** fills the cage and **green rubber straps / pull-tabs** wrap top and bottom. Both are wrong on two counts:
- **The real Axiometa board and all four modules are matte BLACK** `[IMG_6063]`/`[2BACK]`/`[HERO]`, not green. A green FR4 board is the single most eye-catching error and is simply not this hardware.
- **The printed build is specified as single-colour matte GRAY PLA, NO green.** The cage and skin plate in the render are near-**black glossy**, and the strap is **green** — neither is gray PLA.
Correct: **matte gray PLA** cage + plate + lugs; **matte black** PCBs; a **neutral gray/dark** strap. **No green, no gloss, anywhere.**

### 2. Wrong internal structure — a flat "custom PCB" instead of a host board + four snap-in modules on tall sockets.
The render draws **one integrated green board with components soldered flat onto it**. The real product's defining feature is the opposite: a **55×55 black HOST board** whose outer face carries a **central 2×2 cluster of four upright 2×5 female sockets**, into which **four SEPARATE black module PCBs snap vertically and stand ~8–9 mm proud** `[07 §1/§6]`. The screen, the knob, and each coin motor live on their **own raised module**, not on the host board. The render shows **no sockets, no raised sub-boards, no stacked structure** — it hides the entire AX22 modular concept and depicts a device that does not exist.

### 3. The two "motors" are giant polished-chrome pucks — real ERMs are small DARK ~10 mm coins.
The two round discs on the outer face are rendered as **bright chrome/polished-metal cylinders ~18–20 mm across** (roughly a third of the board width). The real ERM coin is a **~10 mm DARK/black disc with only a thin brushed-metal rim**, sitting on a small 22×22 black module `[ERM photo]`. The render is wrong in **size (≈2× too big), colour/finish (chrome vs matte dark), and mounting (flat pucks vs a small coin on a proud module)**. This misrepresents the haptic hardware and inflates its visual weight.

### 4. Wrong component inventory — an EXTRA knob + invented IC chips + fake silk.
Faithful count on the outer face = **1 small LCD + 1 encoder knob + 2 small coin motors** (each on its own module) + tiny RESET/BOOT buttons. The render instead shows **two knob-like controls** (a large knurled knob AND a second smaller black dome/knob — reality has exactly **ONE** rotary encoder), plus **several scattered QFN/QFP IC packages** and **gibberish silkscreen**. Those chips do not belong on the component face at all — the real board's silicon (ESP32-S3, buck, USB-C) is on the **BACK** `[2BACK]`. The extra knob and the invented chips are pure fabrication.

### 5. Inverted size hierarchy / wrong proportions.
In the render the **screen is small and squarish and is dwarfed by the chrome discs**, and the knob is not clearly the tallest thing. Reality inverts this: the **encoder KNOB is the tallest element (~30 mm above the board)** and should visibly dominate height; the **LCD glass is a ~2:1 landscape rectangle** with a **larger footprint than a 10 mm coin**; the **coin motors are the small parts**. A viewer of the render would badly mis-estimate which parts are big and which are tall.

### 6. Underside plate: glossy black + Apple-Watch dome — should be matte gray PLA, flat/rigid.
The middle view is correct in concept (solid, no motors) but is drawn as a **glossy black, softly domed ceramic-look back**. The spec calls for a **rigid, matte GRAY PLA skin plate** (rigid = good haptic conduction; `07` §4 warns a soft/rounded compliant back damps the buzz). Finish and material read wrong.

### 7. Case reads slightly portrait — the board is SQUARE (55×55).
The case/aperture is drawn a touch taller-than-wide (Apple-Watch portrait). The board is **55.0 × 55.0 mm square** `[03 §6]`; the cage window should read **square**.

### 8. Over-styled strap with green pull-tabs (cosmetic, but adds false polish).
The strap is an elaborate multi-link openwork band with **green** keeper tabs. Not load-bearing to function, but it dresses an honest devkit as a finished consumer product and re-introduces green. Use a **simple neutral gray strap**.

### 9. Gibberish silkscreen (cosmetic).
Silk text is fake. Minor, but reinforces that this is an imagined board, not the real MTX0013.

---

## Component inventory + verified dimensions

All values from `03-track-3-parts-truth.md` §6 and `07-geometry-physical-coherence.md` §6 (which trace to corpus). Confidence and UNKNOWNs preserved. **Colour of every PCB = matte black.**

| # | Component | Qty | Footprint (mm) | Key feature size | Height above host board | Confidence / source |
|---|---|---:|---|---|---|---|
| 1 | **Genesis Mini host board** | 1 | **55.0 × 55.0** square, 4-layer, **matte black** | 4× AX22 2×5 sockets in a **central 2×2 cluster**, silk 1–4, facing +Z; RESET/BOOT + user buttons on +Z | socket tops **~8.6 mm** proud [approx] | HIGH outline/layout `[IMG_6063]`+`[web-prod]`; socket height [approx] `[STEP parse]` |
| 2 | **Vibration motor (ERM)** | **2** | **22 × 22**, black, 4× ⌀2.7 mm holes | **coin ⌀ ~10 mm** (visual), **~3.6 mm** proud of its PCB [approx]; dark coin, thin metal rim | coin top **~13–15 mm** [approx] | HIGH footprint `[ERM CONTENT]`; coin dia **UNKNOWN**; heights [approx] `[STEP parse]` |
| 3 | **IPS LCD 0.96"** | 1 | **22 × 29**, black | **glass 13.5 × 27.9** (landscape ~2:1); **active 10.8 × 21.7**; 160×80 IPS; blue FPC on one edge | glass top **~12–13 mm** [approx] | HIGH footprint/glass `[LCD CONTENT]`; panel height [approx] |
| 4 | **Rotary encoder** | 1 | **22 × 22**, black, 4× ⌀2.7 mm holes | single knob on shaft (**ALPS EC11**); **tallest module** | shaft/knob top **~30 mm** (dominant) [approx] | HIGH footprint `[ENC CONTENT]`; shaft ~20.4 mm above its PCB (MED-HIGH) `[STEP parse]` |
| — | USB-C | 1 | on one **board EDGE**, mid-mount | reads from both faces (edge cut-out) | — | HIGH face `[IMG_6063]`/`[2BACK]`; **edge offset/protrusion UNKNOWN** |
| — | Back (−Z) face content | — | — | ESP32-S3-MINI-1 + buck + USB-C receptacle + battery JST + STEMMA QT + PWR/ACT LEDs; bulk within ~4 mm | (faces wrist; solid plate covers it) | HIGH `[2BACK]`; exact −Z envelope LOW [approx] |

**Board mounting holes:** 4× ⌀2.7 mm near corners (count HIGH; **XY UNKNOWN**). **Per-module mounting holes:** 4× ⌀2.7 mm each (count HIGH; **XY UNKNOWN**).

**Explicit UNKNOWNs (do NOT invent — need CAD-kernel STEP load or calipers; unchanged from `03` §9 / `07` §6):**
1. **AX22 port centre coordinates (×4)** + **2×5 connector pitch** (2.0 vs 2.54 mm).
2. **Board mounting-hole XY** and **per-module mounting-hole XY**.
3. **USB-C edge offset + protrusion.**
4. **ERM coin diameter** (visually ~10 mm; confirm via LCSC C2759984 / calipers).
5. **Board PCB thickness** (~1.6 mm [approx]) + **true −Z content depth.**
6. Exact module heights (ERM coin protrusion, LCD panel height, encoder shaft) — currently [approx].

---

## Faithful render spec

### A. Image-generation prompt (paste-ready — GRAY, no green)

> Product-design studio render, **three orthographic views** of ONE wrist-worn open-frame devkit "watch" laid out left-to-right on a plain light-gray seamless background, soft neutral studio lighting, subtle contact shadows, photoreal, all-matte finishes.
>
> DEVICE: a **55 × 55 mm SQUARE matte-BLACK circuit host board** held in an open, skeletal **3D-printed cage of MATTE GRAY PLA** with fine horizontal FDM print layer lines. **Single-colour gray PLA** for the whole enclosure (cage, side walls, strap lugs, back plate) and a plain **neutral dark-gray strap**. **ABSOLUTELY NO GREEN anywhere. No gloss. No chrome.**
>
> VIEW 1 — OUTER FACE (flat, front-on): the square black host board sits in the gray cage, component-side toward the viewer. In the CENTRE of the board is a tight **2×2 cluster of FOUR upright black 2×5 female pin sockets**; **FOUR separate small BLACK module boards are snapped vertically onto those sockets, each standing about 8–9 mm proud** (they read as raised sub-boards, NOT flat chips):
> (a) one **0.96-inch IPS LCD module** (~22×29 mm black board) with a **small LANDSCAPE rectangular screen, ~2:1 aspect** (glass ~13.5×28 mm), dark/near-black when off, a thin blue flex ribbon along one short edge;
> (b) one **rotary-encoder module** (~22×22 mm black board) carrying a **single small knurled KNOB on a shaft — this knob is the TALLEST thing on the whole device**, clearly standing above everything else;
> (c) and (d) **TWO identical vibration-motor modules** (each ~22×22 mm black board), each carrying **ONE small DARK cylindrical coin motor only ~10 mm across and ~4 mm tall — matte dark/near-black with a thin brushed-metal rim, small, NOT shiny chrome**, on the two most-separated diagonal ports.
> Also on the black host board: two tiny tactile buttons near one edge and four small screw holes near the corners. **No large chrome discs, no second knob, no scattered IC chips, no green.** The gray cage frames the square board with an open window and integrated strap lugs top and bottom.
>
> VIEW 2 — UNDERSIDE / SKIN PLATE (flat, back-on): a completely **SMOOTH, SOLID, RIGID matte-GRAY-PLA back plate**, plain, with gently rounded corners and faint print layer lines, **NO components, NO coin motors, NO holes** on the skin side — just the flat gray plate that presses to the wrist, with the neutral gray strap running off top and bottom.
>
> VIEW 3 — ISOMETRIC (three-quarter): the same watch angled, showing the open gray PLA cage, the black square host board with its **raised black modules** (small 2:1 screen, the **tall knurled knob clearly the highest point**, two **small dark coin motors**), and a **USB-C port on one SIDE EDGE** of the board (edge-mounted, mid-height in the cage wall). The gray strap wraps with simple keeper loops.
>
> Overall: honest exposed-devkit look; **matte gray PLA enclosure + matte black PCBs + small dark coin motors**; realistic relative sizes (encoder knob tallest ~30 mm; screen a modest 2:1 rectangle; coin motors small ~10 mm). **No green, no chrome, no gloss, no invented parts.**

**Negative prompt (append):** `green, green PCB, green strap, chrome, polished metal discs, oversized motors, second knob, random IC chips, glossy plastic, flat single circuit board with surface-mount parts, oversized screen, portrait/elongated case, foam back`

### B. Hand-draw dimensioned-diagram bullets (per view)

Draw as a 3-view assembly sketch; all dims mm; tag every number **[HIGH] / [approx] / [UNKNOWN]**; PCBs = black, enclosure = gray PLA.

**VIEW A — Outer / component face (looking at +Z):**
- Board outline **55.0 × 55.0 mm** square **[HIGH]**; small corner fillets; **4× ⌀2.7 mm** mounting holes near corners (count [HIGH], **XY [UNKNOWN]** — draw nominal near corners).
- **Central 2×2 socket cluster**: 4 ports, each a **2×5** female header, facing +Z, **~8.6 mm** tall **[approx]**. Port centre coords + **2×5 pitch [UNKNOWN]** — draw as a centered 2×2 grid placeholder.
- Module assignment (one valid layout): **LCD** (22×29 module; glass **13.5×27.9**, active **10.8×21.7**, 2:1 landscape) on one port; **encoder** (22×22) with knob on an adjacent port; **two ERMs** (22×22 each; coin **~10 mm ⌀ [UNKNOWN]**, **~3.6 mm** proud **[approx]**) on the two most-separated diagonal ports.
- Two tiny tactile buttons **RESET + BOOT** near one edge.
- Cage wall around board; open aperture reads **square**; strap lugs top & bottom.
- Callout: **all module functional faces point +Z (outward); NO module on the skin side.**

**VIEW B — Underside / skin plate (looking at −Z):**
- **Solid gray PLA plate**, ~55×55 + cage wall, rounded corners; **rigid, matte**.
- **NO holes, NO motors, NO cut-outs** on the skin face.
- Note: this face presses to the wrist; buzz reaches skin by **whole-chassis conduction**; keep **rigid — no foam/soft membrane** (`07` §4).
- (Internal, behind the plate: board −Z carries ESP32-S3 module + buck + battery JST + STEMMA — not shown on the skin surface.)

**VIEW C — Side elevation / iso (height stack, looking along board plane):**
- Host PCB thickness **~1.6 mm [approx]**; socket standoff **~8.6 mm [approx]**; module PCB **~1.6 mm** on top.
- Stack heights above the board face **[approx]**: **ERM coin top ~13–15 mm**; **LCD glass top ~12–13 mm**; **encoder knob top ~30 mm (TALLEST → drives cage height + knob-access hole).**
- **USB-C on one board EDGE**, mid-mount; **edge offset/protrusion [UNKNOWN]** (draw as a slot in the cage side wall).
- Skin plate thickness = design value (rigid); −Z board content within **~4 mm** of PCB **[approx]**.

---

## Residual risk / UNKNOWNs

| # | Risk | Severity | Note / how to close |
|---|---|---|---|
| F1 | **UNKNOWN geometry** (AX22 port centres + 2×5 pitch, mounting-hole XY, USB-C edge offset, board thickness, ERM coin ⌀) is baked into the diagram as placeholders | High | Do **not** invent. Load `STP_MTX0013.step` in a CAD kernel (build123d/FreeCAD) or calipers before dimensioned CAD (`03` §9 / `07` G3). The render/diagram show *relative* layout only. |
| F2 | Module-to-port **assignment** (which module on which of the 4 ports) is a design choice, not a fixed fact | Low | Any layout is valid electrically (`03` §3); render just needs 1 LCD + 1 encoder + 2 ERM in the 2×2 cluster, motors on the most-separated diagonal. |
| F3 | **Coin diameter ~10 mm is a visual estimate**, not sourced | Med | Render "small ~10 mm dark coin"; confirm via LCSC C2759984 / calipers before any dimensioned drawing. |
| F4 | Height numbers (coin ~3.6 mm, knob ~30 mm, glass ~2–3 mm) are **[approx]** from artifact-contaminated STEP point clouds | Med | Fine for a proportional render; calipers before CAD. |
| F5 | A future image model may still **re-insert green / chrome / a second knob** despite the negative prompt | Med | Verify each generated candidate against Discrepancies §1–§5 before accepting; regenerate if any reappear. |
| F6 | Grayscale study risk: reading the **PCB as gray** instead of black | Low | The faithful colour is **black PCB + gray PLA**; only the *printed* parts are gray. Under no circumstances green. |

---

**Bottom line:** the render's *geometry* is now honest (motors outward, solid skin plate, edge USB-C — the `07` §5 fix landed), but it is **materially and structurally unfaithful**: it is **green** (must be matte **gray PLA** enclosure + matte **black** PCBs), it **flattens** the host-board-plus-four-snap-in-modules architecture into an imaginary single custom PCB, its **coin motors are oversized chrome pucks** (real: small ~10 mm dark coins), it invents an **extra knob and IC chips**, and it **inverts the size hierarchy** (the encoder knob, not a motor, is the tallest, ~30 mm; the LCD is a modest 2:1 rectangle). Use the paste-ready prompt above to regenerate — gray, no green — and gate every candidate on Discrepancies §1–§5. All precise dimensions remain **UNKNOWN** pending a CAD-kernel STEP load or calipers.
