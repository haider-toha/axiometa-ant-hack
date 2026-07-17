# 11 — Render Review v2 (adversarial second-pass faithfulness check)

**Type:** Phase 3 verification track — adversarial re-audit of a *regenerated* concept render against the faithful spec.
**Date:** 2026-07-17
**Constraint honoured:** VERIFICATION ONLY. No CAD authored, no STEP/STL written, no dimension invented.
**Image reviewed:** `scratchpad/faithful-gray-gptimage.png` (1792×1024) — a 3-view sheet: **outer face** (left) · **underside skin plate** (centre) · **isometric** (right).
**Judged against:** `09-render-faithfulness-audit.md` (faithful spec + the 9 ranked discrepancies) and `07-geometry-physical-coherence.md` (authoritative physical arrangement). Strap direction cross-checked against `10-printed-strap-linkage.md`.
**Prior render (for delta):** `scratchpad/concept3-corrected-physically-honest.png` — the green / chrome-puck / extra-knob version that `09` tore apart.

---

## Scope

`09` gated every regenerated candidate on its five most-misleading discrepancies (§1 green, §2 flat "custom PCB", §3 chrome-puck motors, §4 extra knob + invented ICs, §5 inverted size hierarchy). This pass re-checks the new image component-by-component at zoomed resolution (crops of the outer face, both motors, the LCD, and the iso USB-C edge), scores it, and gives a ship/fix/regenerate verdict. I looked specifically for the failure modes `09` warned would recur (`09` F5: an image model re-inserting green/chrome/second knob).

**Bottom line up front:** all five of `09`'s major discrepancies are **resolved**. The new render is materially and structurally faithful. Only cosmetic nits remain.

---

## Component-by-component check

| # | Check (from task + `09`) | Verdict | Evidence in the render |
|---|---|---|---|
| 1 | **Colour** — matte GRAY PLA enclosure + matte BLACK PCBs, **NO green**, no gloss, no chrome | **PASS** | Cage, side walls, strap lugs and back plate are all one matte gray with visible fine horizontal FDM layer lines; host board + all four modules are matte black. **Zero green anywhere.** The only non-gray/black colour is the **blue LCD flex ribbon** — which is *correct* per `09` §spec (a) and not a violation. Fixes `09` §1. |
| 2 | **Architecture** — black square host board + **FOUR separate black modules** snapped vertically into a 2×2 cluster, standing proud (NOT one flat custom PCB) | **PASS** | Four discrete black module PCBs, each with its own 4 corner screws and a **visible castellated pin-header bank at its base**, stand clearly proud of a recessed black host board inside the gray cage. The iso view shows the vertical stand-off unambiguously. This is the exact AX22 snap-in structure `09` §2 said was missing. |
| 3 | **LCD** — ONE small **landscape** screen (~2:1) with a **flex ribbon** | **PASS** (minor) | Top-left module: dark/near-black landscape glass with a **blue FPC ribbon exiting the bottom short edge**. Reads unmistakably as the 0.96" IPS. *Nit:* aspect renders ≈1.5–1.6:1, a touch squarer than the real 13.5×27.9 (~2:1) glass. |
| 4 | **Encoder** — ONE tall **knurled knob**, the **tallest** element | **PASS** | Top-right module: a single knurled cylindrical knob on a shaft, visibly the highest point on the device in both the flat and iso views. Exactly one knob — no second control. Fixes half of `09` §4 and `09` §5. |
| 5 | **Motors** — TWO **small dark coin** motors (~10 mm), **not chrome pucks** | **PASS (with note)** | Two dark, round, flat-topped pucks, one per bottom module — matte dark bodies with a muted brushed-metal base collar. **Not the bright polished-chrome cylinders** of the prior render, and not oversized to a third of the board. *Note:* they render slightly **beefy** — ~12–13 mm (≈55–60 % of the 22 mm module) and taller/more domed than a flat ~3.6 mm-proud coin, with a slightly prominent metal collar. In-ballpark, not misleading, but stylised heavier than reality. Resolves `09` §3. |
| 6 | **No extra knob / no invented ICs / no gibberish silk** | **PASS** | No second knob, no scattered QFN/QFP packages on the component face, no fake silkscreen. Module faces are clean black. Fixes the rest of `09` §4 and §9. |
| 7 | **Buttons** — small tactile buttons present | **PASS** | Two black SMD tact switches (round plunger, square body) sit centred below the modules — reads as RESET/BOOT. |
| 8 | **Underside** — smooth SOLID gray skin plate, **no components, no holes** | **PASS** | Centre view is a plain matte-gray plate, gently rounded corners, faint layer lines, strap running off top and bottom. No motors, no pads, no cut-outs. Rigid-looking (not a soft dome). Satisfies `09` §6 and `07` §4/§5. |
| 9 | **USB-C on a side EDGE** | **PASS** | Iso view shows an oval USB-C receptacle in the **right side wall** of the cage, mid-height — edge-mounted, as `07` §3 requires. |
| 10 | **Cage + strap lugs** | **PASS** | Open square window framing the board; integrated watch-style lugs top and bottom carry the strap. |
| 11 | **Size hierarchy** — coins small < screen (~2:1) < tallest knob | **PASS** | Knob is the clear height apex; screen is a modest landscape rectangle; coin motors are the small parts. The inverted hierarchy of `09` §5 is corrected. |
| 12 | **Case is square (55×55), not portrait** | **PASS** | Aperture reads square (if anything a hair wider than tall) — not the Apple-Watch portrait `09` §7 flagged. |

**Score tally:** 12/12 checks pass; two carry cosmetic nits (motor stylisation, LCD aspect).

---

## Score + verdict

### Faithfulness score: **88 / 100**

Every one of `09`'s five most-misleading discrepancies is fixed, and the physical arrangement matches `07` (component-side-out, four modules on one +Z face, motors outward, solid skin plate, edge USB-C). Deductions are all cosmetic: motor pucks stylised slightly oversized/domed with a muted-metal collar (−6), LCD glass a touch squarer than 2:1 (−2), motors on adjacent rather than most-separated-diagonal ports (−2), smooth molded strap rather than the printed pin-hinge band `10` now specifies (−2).

### Verdict: **SHIP**

Good enough as a concept render — and materially better than any prior candidate. It correctly and unambiguously communicates the real device: a matte-gray printed cage holding a black host board with four snap-in black modules (landscape LCD + blue ribbon, tall knurled encoder, two small dark coin motors), tactile buttons, an edge USB-C, and a solid gray skin plate. A downstream CAD modeller or reviewer would build the *right* thing from it. Regenerating risks re-introducing the worse failures `09` F5 warns about (green / chrome / second knob) for only a marginal cosmetic gain — **not worth it.** Ship this one.

---

## Optional prompt tweaks (NOT required — only if a v3 is ever run)

The verdict is SHIP; these are polish-only and each carries regeneration risk. If a v3 is attempted, change **only** these and re-gate on `09` §1–§5:

1. **Slim the coin motors.** Add to the positive prompt: *"each vibration motor is a FLAT dark coin only ~10 mm across and ~3–4 mm thin — a low disc, matte near-black, with only a THIN brushed-metal rim; NOT a tall domed puck, NOT a knob, no thick metal collar."* Append to negative prompt: `tall domed motor, thick metal collar, puck as tall as it is wide, motor mistaken for a knob`.
2. **Stretch the LCD to ~2:1.** *"the LCD glass is a clearly ELONGATED landscape rectangle, about twice as wide as tall (~2:1), spanning most of its module's width."*
3. **Move motors to the diagonal** (per `07` §5 / `09` F2, cosmetic): *"place the two coin-motor modules on the two most-separated DIAGONAL ports of the 2×2 cluster (e.g. top-left and bottom-right), with the LCD and encoder on the other diagonal."*
4. **(Forward-looking, `10`) printed strap.** If the concept should preview the real strap: *"the strap is a fully 3D-printed segmented gray-PLA band of short rigid links joined by pin hinges (a watch-bracelet look), closed by a printed tang buckle with a row of adjustment holes — NOT a smooth molded silicone strap."* See caveat under Residual R4 before doing this.

---

## Residual risk / notes

| # | Item | Severity | Note |
|---|---|---|---|
| R1 | **Motor pucks stylised heavier than a real ERM coin** (≈12–13 mm, domed, metal collar vs a flat ~10 mm / ~3.6 mm-proud coin with a thin rim) | Low | Reads correctly as a dark coin motor, not a chrome puck (the `09` §3 failure is gone). A skeptical viewer *could* momentarily read them as pucks/buttons; the knurl-free, shaft-free flat top keeps them distinct from the knob. CAD governs true dims (`09` F1/F3, coin ⌀ still UNKNOWN → LCSC C2759984 / calipers), not the render. |
| R2 | **LCD aspect ≈1.5–1.6:1**, a touch squarer than the ~2:1 real glass | Low | Still clearly landscape with the correct blue ribbon; does not mislead. |
| R3 | **Motors on adjacent (bottom-row) ports, not the most-separated diagonal** | Low | `09` F2: module-to-port assignment is a design choice, electrically valid either way; diagonal is only *preferred* for haptic separation. Cosmetic for a concept image. |
| R4 | **Strap is a smooth molded/silicone-look band, not a fully-printed segmented pin-hinge band** (`10` PRIMARY = print-in-place link band + tang buckle) | Low for THIS pass | Against the spec this image was built to (`09`, which asked for "a plain neutral dark-gray strap with simple keeper loops"), the strap is a **PASS**. `10` supersedes that toward a printed articulated band. For a *faithfulness-of-the-electronics* concept it does not matter; flag it only if the image is meant to also preview the final printed strap. Note the render's strap is smooth/continuous, which visually implies TPU/silicone — the opposite of the PLA-only, no-flex-membrane intent of `10` — so if reused for strap comms it would mildly mislead. |
| R5 | **All precise dims remain UNKNOWN** (AX22 port centres/pitch, mounting-hole XY, USB-C edge offset, board thickness, ERM coin ⌀, module heights) | High (unchanged) | Carried from `09` F1 / `07` G3. The render shows *relative* layout only; do not read dimensions off it. Load `STP_MTX0013.step` in a CAD kernel or use calipers before any dimensioned CAD. |
| R6 | **Regeneration risk if a v3 is run** | Med | `09` F5: image models re-insert green / chrome / a second knob. Since this candidate already passes §1–§5, prefer shipping it over chasing cosmetic polish. |

---

**Bottom line:** The regenerated render is **faithful — SHIP at 88/100.** It fixes every major fault `09` identified: it is matte **gray PLA + black PCBs with no green** (not the green board/strap of the prior render), it shows the **host-board-plus-four-snap-in-modules** architecture with modules standing proud on visible pin headers (not a flat custom PCB), its two motors are **small dark coins** (not oversized chrome pucks), it has **exactly one knob and no invented ICs**, and the **size hierarchy is right** (knob tallest → screen a modest landscape rectangle → small coins). Underside is a solid gray skin plate; USB-C is on the edge. Remaining issues are cosmetic (motors stylised a bit beefy/domed, LCD slightly square, motors adjacent not diagonal, smooth strap vs the printed pin-hinge band of `10`) and do not justify a regenerate. Precise dimensions stay UNKNOWN pending a CAD-kernel STEP load or calipers.
