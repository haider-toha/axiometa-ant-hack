# 07 — Geometry & Physical Coherence (motor-face / wearing-orientation audit)

**Type:** Phase 3 verification track (physical-coherence audit of the concept render).
**Date:** 2026-07-17
**Scope of authority:** The `parts/` corpus is source of truth. Web citations cross-check the
board face layout only; local corpus wins on any conflict.
**Constraint honoured:** RESEARCH / VERIFICATION ONLY. No CAD authored, no STEP/STL written, no
dimension invented. Anything not extractable from corpus / STEP / datasheet is marked **UNKNOWN**
with a "how to get it" note.
**Baseline:** `03-track-3-parts-truth.md` (flagged this as **R5** but did not resolve the
mounting-face question) and `05-form-factor-cad-design-spec.md` (§2 correct, but §3/§4 + the image
prompts carry the geometric error this audit corrects).

---

## Scope

A FLUX concept render (`concept3-exposed-devkit.png`) shows the LCD + rotary knob on the OUTER face
and **two round vibration-motor pads on the SKIN-side (underside)**. The builder suspects this is
physically impossible because every AX22 module snaps into a socket on the **same** board face.
This audit resolves, definitively and with sources:

1. Do all 4 snap-in modules (2× ERM, LCD, encoder) mount on the same board face?
2. Which way does an ERM coin motor face when snapped in — and can it be reversed with no extensions?
3. USB-C edge + which face the buttons/LEDs are on.
4. Given one component face + no extensions, which wearing orientation is buildable, and can the
   motors couple vibration to the skin (and how well)?
5. Is Concept 3 buildable as-shown? If not, the physically-correct version of the same aesthetic.
6. Re-verify the load-bearing dimensions; list what remains UNKNOWN and how to measure it.

**CAD-kernel status:** build123d / OCP / cadquery are **not installed** in this environment
(confirmed this session: `ModuleNotFoundError` for all three). Per the CAD skill fallback, geometry
below comes from the corpus tech text, the gallery/pinout/PCB images, a **raw STEP point-cloud parse**
(method noted), and the official product page. Precise connector/hole geometry that needs a CAD
solid stays UNKNOWN.

### Sources (every claim traces to one)

| Tag | Source | URL / path |
|---|---|---|
| `[IMG_6063]` | Board render, 4 sockets on one face, silk 1–4 | `…/axiometa-genesis-mini/images/gallery/IMG_6063_*.png` = https://cdn.shopify.com/s/files/1/0966/7756/0659/files/IMG_6063_84b4db7d-d486-4010-b9aa-524bee6d4290.png |
| `[HERO]` | Kit hero: all modules show pins-down / component-up | `…/gallery/BUN0001-HERO.png` = https://cdn.shopify.com/s/files/1/0966/7756/0659/files/BUN0001-HERO.png |
| `[2BACK]` | Board **back** face (ESP32 module, USB-C, battery JST, STEMMA, PINOUTS legend) | `…/gallery/2BACK_MTX0013.png` = https://www.axiometa.io/cdn/shop/files/2BACK_MTX0013.png?v=1773854734 |
| `[ERM Pins]` | ERM pinout render — coin on the labelled (component) face | `…/vibration-motor-erm/images/pinout/Pins-0013.png` |
| `[ERM photo]` | ERM real photo — coin on top, male pins protruding **down** | `…/vibration-motor-erm/images/gallery/53_*.png` |
| `[ENC photo]` | Encoder real photo — male pins on the back, shaft on the front | `…/rotary-encoder/images/gallery/6_*.png` |
| `[ERM CONTENT]` / `[LCD CONTENT]` / `[ENC CONTENT]` | Per-part CONTENT.md / part.json | `parts/.../CONTENT.md` |
| `[board CONTENT]` | Board CONTENT.md / part.json | `…/axiometa-genesis-mini/CONTENT.md` |
| `[STEP parse]` | This session's point-cloud parse of the STEP files (bbox + Z-histogram; mm units) | board `STP_MTX0013.zip`→`.step`; module `.step` files |
| `[SCH board]` (via Track 3) | Schematic shows exactly 4 AX22 connectors U1–U4 | `…/files/SCH_MTX0013.pdf` (read in `03-track-3-parts-truth.md`) |
| `[web-prod]` | Official product page | https://www.axiometa.io/products/axiometa-genesis-mini |
| `[web-esp]` | Espressif developer blog (Genesis platform) | https://developer.espressif.com/blog/2025/06/modular-esp32s3-prototyping-platform-genesis/ |
| `[web-cs]` | Crowd Supply / CNX corroboration | https://www.crowdsupply.com/axiometa/genesis-iot-discovery-lab · https://www.cnx-software.com/2025/08/22/genesis-iot-discovery-lab-modular-wire-free-prototyping-platform-for-esp32-s3/ |

---

## Verdicts / evidence

### 1. Same-face confirmation — **YES. The builder's intuition is correct.**

All four snap-in modules (2× ERM, LCD, encoder) mount on **one** board face: the **+Z component
face** that carries the four AX22 sockets. Proof, three independent ways:

- **Physical board photo `[IMG_6063]`:** the four 2×5 female AX22 sockets stand **up on a single
  face**, arranged in a **2×2 cluster**, silk-numbered 1, 2, 3, 4. The RESET and BOOT tactile
  buttons are on that **same** face. There is no socket anywhere else.
- **Board back photo `[2BACK]`:** the opposite (−Z) face carries the **ESP32-S3-MINI-1** shield,
  the buck + passives, the USB-C receptacle (edge), the 3×AA/AAA battery JST (`G`/`V+`), the STEMMA
  QT connector, `PWR`/`ACT` LEDs, and the debug test-pads — **and no AX22 sockets at all.** A module
  physically cannot be plugged into this face; there is nothing to plug into.
- **Schematic `[SCH board]` (via Track 3 §2):** exactly **four** `AX22-Module` connectors, U1–U4 —
  no fifth/back-side connector. Corroborated by `[web-prod]` / `[web-esp]` / `[web-cs]`: "**four AX22
  module ports**," each a fixed 10-pin socket.
- **STEP parse `[STEP parse]`:** the board's tall features (Z-histogram bins at +7/+9/+10 mm, tops
  at **Z = +10.25 mm**) are all on the **+Z** side (the sockets); the −Z side's bulk sits within
  ~4 mm of the PCB (ESP module + passives). Sockets are a +Z-only feature.

**Consequence:** the two ERM modules, the LCD, and the encoder **must all sit on the +Z face,
pointing the same way.** You cannot put a motor module on the −Z (skin) face — that face has no
socket. Builder is right; the concept's premise is impossible.

### 2. Motor facing — **coin faces OUTWARD (+Z), away from the wrist. Not reversible without extensions.**

Every AX22 module follows one convention, confirmed on real photos of all three module types:

- **ERM `[ERM photo]`:** the flat coin motor is soldered to the **top (component) face**; the male
  0.1″ header pins protrude **downward from the bottom face**. `[ERM Pins]` shows the coin on the
  same face as the `G / Vin / D` silk.
- **Encoder `[ENC photo]`:** male header rows on the back; the rotary body + shaft on the front.
- **LCD `[HERO]`:** screen on top; header pins behind. Same for NeoPixel, DHT11, LDR, LED-button in
  `[HERO]` — **pins down, functional component up, uniformly.**

Because the pins exist on **only one face**, the pin face **must** point at the board to mate. So
the functional component (coin / screen / shaft) **always points away from the board**, i.e. **+Z**,
the same direction for all four modules.

- **When snapped in, the ERM coin faces +Z (outward).** It is `~3.6 mm` proud of its own PCB
  `[STEP parse]`, sitting on top of a module that stands `~8–9 mm` above the board on the socket —
  so the coin ends up on the **outermost** part of the device, on the **opposite side from the
  wrist** in the only usable orientation (see §4).
- **Can it be reversed (coin toward skin) without soldering/extensions?** **No.** Rotating the
  module 180° would point its pins away from the board — they would not engage the socket. The only
  ways to face the coin skin-ward are (a) a **2×5 extension lead / AX22 Port Extension Kit** that
  relocates and re-orients the module, or (b) **de-soldering and re-mounting** the header on the
  other face. **Both are explicitly ruled out** by the builder ("no extension leads / Port Extension
  Kit / extra parts"). Therefore the coin faces outward, full stop.

### 3. USB-C + buttons/LEDs — which face

- **USB-C:** on a **board edge**, mid-mount (programming + power). Visible on the right edge in
  `[IMG_6063]` and on the same physical edge (left, in the flipped back-view) in `[2BACK]`;
  `[web-prod]`/`[web-esp]` call it "**USB-C for programming & power**." It reads from **both** faces
  because it is edge-mounted → an edge cut-out, not a face cut-out. Exact edge offset **UNKNOWN →
  measure** (§6).
- **RESET, BOOT, and the user button (GPIO45):** on the **+Z component face** (RESET/BOOT visible
  beside the sockets in `[IMG_6063]`).
- **LEDs:** the RGB NeoPixel (GPIO21) and ACT LED (GPIO37) are on the board; `PWR`/`ACT` silk appears
  on `[2BACK]`. The user-facing NeoPixel is addressable regardless of face; not load-bearing here.
- **The ESP32-S3-MINI-1 module + battery JST + STEMMA QT are on the −Z face** `[2BACK]` — relevant
  because that face becomes the skin side in the buildable orientation (§4).

### 4. Wearing-orientation analysis (one component face, no extensions, board on wrist)

The board has exactly two faces to choose from for skin contact; in-plane rotation does not change
skin coupling, so there are effectively **three candidate states**:

| State | Skin-facing side | Screen readable? | Encoder usable? | Motors couple to skin? | Verdict |
|---|---|---|---|---|---|
| **A** | −Z back (ESP-module side) → skin; **+Z component side out** | **Yes** (screen faces out) | **Yes** (knob faces out) | Only by **whole-chassis conduction** (coin is on the far/outer side) | **BUILDABLE** |
| **B** | +Z component side → skin | **No** (screen faces the wrist) | **No** — worse, the **~20 mm encoder shaft + knob (~30 mm total, §6) physically collide with the wrist**; the coin *would* face the skin | Motors touch skin, but the UI is destroyed and the knob cannot fit | Non-viable |
| **C** | Motors on skin side **and** screen on the outer side | — | — | — | **Impossible** — needs modules on two faces (no back socket) or remote leads (ruled out). **This is exactly Concept 3.** |

**THE buildable orientation is State A: worn component-side-OUT** (screen, knob, USB-C all reachable;
the relatively flat ESP-module back faces the wrist). This **matches `05` §2**. But it also means the
**motors are on the outer face, farthest from the skin** — so the haptic path is by **conduction**,
not direct contact.

**Is conducted coupling sound? — Yes in principle, with a specific and non-obvious caveat.**

- **Mechanism (first-principles haptics).** An ERM is an *eccentric rotating mass*: it produces
  **omnidirectional whole-body vibration** by spinning an offset weight, shaking whatever rigid
  chassis it is fixed to. This is exactly how every phone and smartwatch buzzes — the motor is buried
  inside the case, never touching skin, yet clearly felt. At `~12 000 rpm` `[ERM CONTENT]` the
  fundamental is `~200 Hz`, squarely in the Pacinian (vibrotactile) band. So "motor on the outer face,
  buzz reaches the wrist through the chassis" is the **normal** way ERMs are used, not a hack.
- **Transmission through 1.6 mm FR4 + a 2–3 mm PLA wall is NOT the bottleneck.** Thin, stiff solids
  transmit low-frequency whole-body vibration with little loss; attenuation happens at **compliant
  interfaces** (springy pins, air gaps) and in **soft/viscoelastic layers** (foam, gel, a rubbery
  membrane), not through rigid plates. PLA and FR4 are rigid → good conductors.
- **The real catch — the motor is NOT on the board; it is ~10 mm above it on compliant pins.** The
  coin sits on a module that stands `~8–9 mm` above the board, held only by the springy 2×5 header in
  the socket. If you rely on the path *coin → module → header pins → board → back → skin*, the
  **header-pin interface is a lossy spring** and the buzz will feel weak. The mental model in `05` §4
  ("coin buzzes through the 1.6 mm PCB into a skin-side membrane") is therefore **wrong twice**: the
  coin is not on the board (it is 10 mm above it, coin-up), and a soft skin-side membrane would
  *damp* the very vibration you want to transmit.
- **Required fix (enclosure, no extra electrical parts):** **rigidly capture** each ERM module — or
  the whole board — against the printed cage so the motor's centrifugal force drives the **rigid
  chassis** directly; give the cage a **solid (not foam) skin-contact back-plate**; and strap the
  device **firmly** (loose contact kills the percept). Then the whole watch buzzes against the wrist
  and it is comfortably perceptible.
- **Honest limitation — localization.** Two ERMs in the central 2×2 cluster, both rigidly coupled to
  **one** shared chassis, make the **entire device** buzz. Distinguishing "left motor" vs "right
  motor" as **two separate skin sites** is intrinsically weak in this geometry, and cannot be fixed
  without mechanically isolating each motor onto its own skin island — which the fixed central socket
  cluster precludes. This **reinforces `05`/`06` R1**: lean on the **micro-stagger + strict-sequential
  fallback + on-screen caption**, not on two-point spatial discrimination.
- **Quantitative strength (g at the skin plate): UNKNOWN** — do not invent. Obtain by bench test:
  mount the assembly, run both motors, and read a small accelerometer on the skin-contact plate
  (Precision-Microdrives-style measurement), comparing rigid-captured vs pin-only mounting.

### 5. Concept 3 verdict — **NOT buildable as-shown. Physically impossible.**

`concept3-exposed-devkit.png` shows the LCD + knob on the outer face and **two round motor pads on
the underside/skin-side** (its middle view). That is **State C** above: it requires the two motors to
be on the **opposite face from the screen**. With every module on the single +Z socket face and no
extension leads, **this cannot be built.** The two round discs on the skin side cannot be ERM modules
— there is **no socket on that face** `[2BACK]`, and an ERM's coin **always** faces away from the
board `[ERM photo]`. The FLUX prompt that asked for "TWO small round vibration-motor **contact pads
on the skin-side**" baked in the error; the render faithfully drew the impossible thing. (`05` §7
even labels these underside pads "matching the fixed-parts reality" — that is exactly **backwards**;
the fixed-parts reality is motors **outward**.)

**Physically-correct version of the SAME exposed-cage / visible-PCB aesthetic** (keeps the look; fixes
the physics — a CAD modeller can follow this):

- **Board capture:** the 55×55 mm board sits in the open printed cage **component-side-OUT** (visible
  PCB + the green module PCBs stay exposed — the exact devkit aesthetic the render nails). Capture it
  by the **4× ⌀2.7 mm corner holes** (screw bosses or captive posts) **and** clamp the two ERM module
  bodies against rigid cage ribs (for haptic coupling, §4).
- **All four modules on the outer (visible) face**, in the 2×2 socket cluster: LCD on one port,
  encoder on another, and **both ERM coin motors on the two remaining, most-separated diagonal ports
  — on the OUTER face, among the screen and knob, NOT on the skin side.** In the render, move the two
  black discs from the back to the front cluster.
- **Skin side (−Z back) = a solid PLA skin-contact plate**, strap-pressed to the wrist. It is what
  actually transmits the buzz. Optionally raise **two subtle bumps** on this plate roughly under each
  motor's port and bridge them to the board/cage with **rigid printed standoffs** (enclosure
  geometry, not electrical extensions) for slightly-more-local coupling — but expect only a modest
  localization gain because the chassis is shared (§4). The plate must be **rigid**, not a soft
  membrane.
- **Screen window:** cut-out over the LCD glass on the outer cage (glass `13.5 × 27.9 mm`, active
  `10.8 × 21.7 mm` `[LCD CONTENT]`).
- **Knob access:** the encoder shaft is the tallest element (`~20 mm` above its PCB, `~30 mm` above
  the board, §6) and protrudes through/above the outer cage on one side — as the render already draws
  the green knob. Good as-is.
- **USB-C cut-out:** on the board **edge** (a slot in the cage side wall), matching the mid-mount
  USB-C — the render's edge USB-C placement is correct.
- **Net change to the render:** it is ~90% right (cage, exposed PCB, outward screen + knob, edge
  USB-C). The **only** fix is: the two motor discs move from the **underside** to the **outer socket
  cluster**, and the underside becomes a **solid skin-contact plate.**

### 6. Dimension re-verification

Independently re-parsed the STEP point clouds this session `[STEP parse]` (mm units confirmed in every
header). Board and encoder STEPs are clean; **ERM and LCD STEPs carry embedded annotation geometry**
— confirmed here: both share identical stray points at Z≈8–9 mm and the LCD X-span is a nonsensical
`315 mm`. So module **footprints are quoted from corpus text**, and heights are taken from the
robust core (2–98th percentile) of the Z cloud, marked **[approx]**.

| Feature | Value | Confidence / source |
|---|---|---|
| Board outline | **55.0 × 55.0 mm**, square, 4-layer | **HIGH** — `[board CONTENT]` + `[web-prod]` + `[STEP parse]` (X/Y span 55.00) |
| Board PCB thickness | **~1.6 mm** | MED **[approx]** — `[STEP parse]` dense planes ~1.6–2 mm apart; corpus states "4-layer," no thickness → calipers/CAD to confirm |
| AX22 sockets | **4 ports**, 2×5, **2×2 central cluster**, silk 1–4, facing **+Z** | **HIGH** layout — `[IMG_6063]` + `[SCH board]` |
| AX22 socket height (standoff above PCB) | **~8.6 mm** | MED **[approx]** — `[STEP parse]` board Z-max +10.25 − ~1.6 PCB ≈ 8.6; matches Track 3 "8–9 mm" |
| AX22 port centres (×4) + 2×5 pitch | **UNKNOWN** | blocks port cut-outs → load STEP solid in a CAD kernel, or calipers *(Track 3 R1)* |
| Board mounting holes | **4× ⌀2.7 mm**, near corners; **XY UNKNOWN** | count HIGH `[board CONTENT]`; positions → measure *(Track 3 R2)* |
| Board −Z (skin-side) envelope | bulk within **~4 mm** (ESP module + passives); sparse features to **~10 mm** (edge connectors) | LOW **[approx]** — `[STEP parse]`; exact content (JST/USB-C/STEMMA vs modelling bound) → load solid *(Track 3 R4)* |
| USB-C | on one **board edge**, mid-mount; **edge offset + protrusion UNKNOWN** | HIGH face `[IMG_6063]`/`[2BACK]`; offset → measure |
| **ERM module footprint** | **22 × 22 mm**, 4× ⌀2.7 mm holes | **HIGH** — `[ERM CONTENT]` |
| **ERM coin protrusion above its PCB** | **~3.5–4 mm** (parse core-98% ≈ 3.6) | MED **[approx]** — `[STEP parse]` (ignore Z 8–9 annotation); calipers to confirm — drives motor-pocket depth |
| ERM coin **diameter** | **UNKNOWN** (visually ~10 mm flat coin) | → LCSC **C2759984** datasheet or calipers |
| ERM header-pin protrusion below PCB | **~3 mm** | MED **[approx]** — `[STEP parse]` Z-min ≈ −3 |
| **LCD module footprint** | **22 × 29 mm**; glass **13.5 × 27.9 mm**; active **10.8 × 21.7 mm**; 160×80 IPS | **HIGH** — `[LCD CONTENT]` |
| LCD panel height above its PCB | **~2–3 mm** | MED **[approx]** — `[STEP parse]` (annotation-contaminated); Track 3 said 2–4 → calipers |
| **Encoder module footprint** | **22 × 22 mm**, 4× ⌀2.7 mm holes | **HIGH** — `[ENC CONTENT]` + `[STEP parse]` (22.0×22.4) |
| **Encoder shaft height above its PCB** | **~20.4 mm** (tallest module) | MED-HIGH — `[STEP parse]` clean file, Z-max 20.40; below-PCB legs to −7 mm |
| **Derived outward stack above board face [approx]** | ERM coin top **~13–15 mm**; LCD glass top **~12–13 mm**; **encoder knob top ~30 mm (dominant clearance)** | LOW **[approx]** — sum of socket standoff + module PCB + component height; confirm by loading the mated assembly in a CAD kernel |

**Still UNKNOWN → must measure before real CAD** (calipers or a CAD-kernel STEP load): AX22 port
centres + pitch; board + per-module mounting-hole XY; board thickness + true −Z content; USB-C edge
offset/protrusion; ERM coin diameter; exact ERM/LCD/encoder heights. These are unchanged from Track 3
§9 / `05` R2 — this audit did not close them (no CAD kernel), it only firmed the height estimates.

---

## Physically-correct arrangement (hand to the CAD modeller)

```text
Orientation:  board WORN COMPONENT-SIDE-OUT (State A).
  +Z (outer, away from wrist): AX22 sockets, all 4 modules, RESET/BOOT/user buttons, screen, knob.
  -Z (inner, skin side):       ESP32-S3-MINI-1 module + passives + edge connectors → faces the wrist.
Face rule:    there is ONE socket face. Motors, screen, encoder ALL face +Z. No module can face skin.
Motors:       2× ERM in the 2 most-separated diagonal ports of the central cluster, coin facing +Z
              (outward). They do NOT touch the skin; they are captured rigidly to the cage.
Haptics path: motor (coin-up, ~10 mm above board on compliant pins) -> RIGID clamp to printed cage
              -> solid PLA skin-contact back-plate -> strapped firmly to wrist. Whole device buzzes.
              Avoid soft membranes/foam in the path (they damp). Rigid = good conduction.
Skin plate:   solid (not foam); optional 2 rigid bumps under the 2 motor ports for mild localization,
              via printed standoffs (enclosure geometry, NOT electrical extension leads).
Windows/access (all on +Z / edges):
  - LCD window over glass 13.5 x 27.9 mm (active 10.8 x 21.7).
  - encoder knob clearance ~30 mm above board (tallest); access hole on +Z.
  - USB-C slot on the board EDGE (mid-mount), reachable while worn.
Board capture: 4x screw bosses at the ⌀2.7 mm corner holes + rigid ribs clamping the ERM modules.
Do NOT: put any motor/pad on the -Z face; rely on the header-pin path for haptics; use a soft
        skin-side membrane; expect strong two-point (left/right) spatial discrimination.
All bracketed dims are [approx] until measured (see §6) — keep the model parametric.
```

---

## What changed (vs Track 3, vs `05`, vs the concept)

- **Closes Track 3 R5.** Track 3 §6/R5 correctly stated "motors seat on board-top (+Z); pressing them
  to the wrist is a coupling problem" but left it open. **Resolved here:** the coin faces **outward
  and is not reversible without extensions**; the buildable orientation is **component-out**; the
  motors reach the skin only by **whole-chassis conduction**, which is sound **if the module is
  rigidly captured to a solid skin-plate** (not via the compliant header pins, not through a soft
  membrane).
- **Corrects `05` §3/§4 and the image-prompt pack.** `05` §2 is right (components out). But `05` §4
  ("each motor sits in a shallow recess with a thin ~1 mm **skin-side** membrane") and §3 ("motors
  couple to the skin through the **underside** membrane") describe the coin as if it were on the skin
  side — **geometrically impossible**; the coin is on the **outer** face, ~10 mm above the board,
  coin-up. The correct coupling is rigid capture → solid back-plate, and a soft membrane **hurts**.
  Image prompts #2 and #5 (motor pads on the skin/underside) encode the same error.
- **Flags `05` §7's mislabel.** Calling the underside-motor renders "matching the fixed-parts reality"
  is backwards; the fixed-parts reality is motors **outward**. All three generated concepts inherit
  this if they show motors on the skin side.
- **Reinforces `05`/`06` R1 (spacing).** The shared-chassis geometry makes left-vs-right *spatial*
  discrimination intrinsically weak → the **strict-sequential + micro-stagger + on-screen caption**
  mitigation is not just about spacing, it is forced by the mounting geometry too.
- **vs the concept:** Concept 3 is impossible as-shown (State C). The corrected same-aesthetic
  arrangement is in §5 / the block above.

## Grounding notes

- **Primary = corpus.** The face verdict rests on **primary photographs** of the actual hardware
  (`[IMG_6063]`, `[2BACK]`, `[ERM photo]`, `[ENC photo]`) plus the module pinout render `[ERM Pins]`
  — not on marketing copy. The decisive fact is visual and unambiguous: **there is no socket on the
  −Z face**, and **ERM pins exist on only one face**.
- **Web cross-check (per mandate).** `[web-prod]` confirms 55×55 mm, "four AX22 ports," USB-C for
  programming & power; `[web-esp]`/`[web-cs]` corroborate "4 AX22 module ports," "USB-C for
  programming & power," and the fixed 10-pin AX22 layout (I²C/SPI/UART/ADC/3 GPIO/power/ground). No
  external source contradicts the corpus. The getting-started guide still references "port 7 /
  GENESIS One," consistent with Track 3's finding that the 8-port copy leaked from the larger sibling.
- **STEP caveat re-confirmed.** ERM and LCD `.step` files carry annotation geometry (identical stray
  Z≈8–9 mm points; LCD X-span 315 mm) — footprints from corpus, heights from the robust core only.
- **Haptics reasoning is first-principles** (ERM = whole-body centrifugal vibration; rigid solids
  conduct, compliant interfaces/soft layers damp). The **quantitative** transmitted amplitude is
  **not** asserted — marked UNKNOWN with a bench-test method. No dimension or force value invented.

## Residual risk

| # | Risk | Severity | How to close |
|---|---|---|---|
| G1 | **Perceived buzz strength in State A** (motor on outer face, coupling via chassis) not quantified | Med | Bench-test: accelerometer on the skin-plate, rigid-captured vs pin-only; if weak, stiffen the clamp / thin the back-plate |
| G2 | **Two-point (left/right) localization is intrinsically weak** — shared rigid chassis, central cluster | High (accepted) | Strict-sequential encoding + micro-stagger + on-screen caption (`05`/`06` R1); do not promise spatial two-site coding |
| G3 | **All precise connector/hole/edge geometry still UNKNOWN** (port centres/pitch, hole XY, USB-C offset, board thickness, −Z content) | High | Load `STP_MTX0013.step` in a CAD kernel (build123d/FreeCAD) or calipers — not possible here (no kernel) |
| G4 | **Encoder knob (~30 mm above board) + module stack make the device tall on the +Z side** | Med | Accept watch-scale bulk (per `05`); ensure the strap presses the flat −Z back to the wrist |
| G5 | **A soft skin-side membrane (as in `05` §4) would damp the haptics** | Med | Use a rigid skin-contact plate; if a cosmetic cover is needed keep it thin and stiff |
| G6 | **Downstream docs (`05`, image prompts, Concept 3) still describe/print motors on the skin side** | Med | Propagate this correction: motors outward, solid skin-plate, rigid capture |

---

**Bottom line:** the builder is right — all four modules mount on the single +Z socket face, the ERM
coin faces **outward** and cannot be reversed without the ruled-out extensions, so **Concept 3 (motors
on the skin side, screen on the outer side) is physically impossible.** The only buildable orientation
is **component-side-out**: screen, knob, USB-C usable; the two motors on the outer face reach the wrist
by **whole-chassis conduction**, which works **only if each motor module is rigidly clamped to a solid
skin-contact plate** (not through the compliant header pins, not through a soft membrane) — and even
then the two motors read as one shared buzz, so distinguish them in **time**, not space. Fix the render
by moving the two motor discs from the underside into the outer socket cluster and making the underside
a solid skin plate. Top UNKNOWN dims (need a CAD kernel or calipers): AX22 port centres + 2×5 pitch,
mounting-hole XY, USB-C edge offset, board thickness, and ERM coin diameter.
