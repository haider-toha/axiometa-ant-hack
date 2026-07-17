# 10 — Fully-Printed Wrist Strap / Linkage — Research + Design Spec

**Type:** Design-spec deliverable (printability research + CAD design rules for the strap/linkage).
**Date:** 2026-07-17
**Constraint honoured:** RESEARCH + DESIGN-SPEC ONLY. **No CAD authored, no STEP/STL/3MF written.** Every
printability claim is web-grounded (URLs cited inline + in the Sources table). Dimensions are either
quoted from the corpus (`05`, `07`) or given as **design recommendations** for the CAD modeller and
marked as such; nothing about the electronics is invented.
**Hard constraints honoured:** fully 3D-printed **PLA** on Bambu Lab; **single colour = gray** (no AMS);
**NO magnets**; attaches to the open printed cage's **strap lugs**; wrist-adjustable; wearer-openable;
low-risk for a 2-day hackathon.

> **Supersedes `05` §6 on one point.** `05` §6 assumed a *fabric/velcro* strap threaded through printed
> slots ("no printed clasp mechanism for v1"). This brief tightens the constraint to **fully 3D-printed**,
> so fabric/velcro and any bought spring-bar are **out** — the strap, its articulation, its closure, and
> its pin(s) are all printed PLA. Everything else in `05`/`07` (component-side-out watch form, ~55 mm
> square head, rigid skin-plate, USB-C tether for the demo) stands.

---

## Scope

Specify a **fully-printed, PLA, gray, magnet-free** wrist strap/linkage that:

1. clips to the **strap lugs** of the ~55 mm square open printed cage (the "head" that holds the Genesis
   Mini board component-side-out, `07` §5 / `05` §2);
2. wraps the wrist and is **adjustable** across adult wrist sizes;
3. **opens and closes reliably** by the wearer with no magnets and no bought hardware;
4. **prints and assembles inside a 2-day hackathon at low risk** on Bambu Lab machines.

It evaluates the five candidate architectures in the brief, picks a **primary + a simpler fallback**, and
hands the CAD modeller concrete clearances, wall thicknesses, pin diameters, the lug interface, and
Bambu print-orientation rules. Motor/haptics coupling and board capture are **out of scope** (owned by
`07`); this file is only the strap from the lugs outward.

### Device recap — what the strap must attach to (from `07` / `05`)

- **Head:** ~**55 × 55 mm** square open cage, worn **component-side-out** on the wrist top like a watch
  (`07` §4 State A; `05` §1–2). The flat −Z (ESP-module) face is the skin side.
- **Lugs:** the cage carries **strap lugs** (watch-style) — their exact geometry is **not yet fixed** in
  `05`/`07` (those docs dimension the board bay, not the lugs). This spec therefore **defines the lug
  interface** for the cage designer (see *Attachment to the cage*), rather than measuring an existing one.
- **Print rules already locked (`05` §7):** Bambu FDM, PLA, **≥2 mm walls**, generous fillets, flat base,
  self-supporting recesses, no unsupported spans >~5 mm. Gray single colour (this brief).

---

## Options evaluated (cited)

Five architectures, each rated for PLA printability, clearance/tolerance values, how it clips to the cage
lugs, wrist adjustability, and failure modes. The **key cross-cutting fact** that drives the whole
recommendation: in PLA, **rotating pin hinges are fine (the pin is a rigid pivot — it turns, it doesn't
flex), but repeatedly-*flexed* PLA is not** — PLA's elongation-at-break is only ~8 % and it is brittle
under cyclic strain, so living hinges and daily-flexed snap latches are the failure-prone parts, not the
pivots ([goodprints3d](https://www.goodprints3d.com/blogs/3d/best-filament-for-snap-fit-3d-prints-clips-latches-and-flexing-parts);
[hotean](https://hotean.com/blogs/hotean-blog/design-a-3d-printed-living-hinge-for-10-000-cycles)). Put
the cyclic duty where PLA is strong (rigid pin-in-hole), not where it is weak (bending membrane).

### Option A — Segmented rigid links + printed pin hinges (watch-band style)

Many short rigid links, each pair joined by a knuckle-and-pin hinge, like a metal watch bracelet. Pins
can be **separate printed pins pushed in after printing**, or the links printed loose and pinned.

- **Printability (PLA):** excellent. The links are chunky rigid solids (PLA's home turf — stiff, low
  shrink, low warp — the material every guide calls the *most forgiving* for articulated parts,
  [UAVMODEL](https://blog.uavmodel.com/3d-printer-print-in-place-designs-clearance-tolerances-material-choice-and-articulation-tips-2026-guide/)).
  The only tricky feature is the pin bore.
- **Clearance/tolerance:** for a pin that must **rotate** in its knuckle bore, use **~0.30 mm diametral
  clearance** (bore Ø − pin Ø). This is the community "free-rotation" number for PLA — 0.20 mm slide /
  **0.30 mm free rotation** / 0.40 mm loose ([UAVMODEL](https://blog.uavmodel.com/3d-printer-print-in-place-designs-clearance-tolerances-material-choice-and-articulation-tips-2026-guide/));
  Snapmaker's fit table agrees (moving/hinge = **0.30–0.50 mm**, transition = 0.1–0.2,
  interference 0 to −0.05, [Snapmaker](https://www.snapmaker.com/blog/3d-printing-tolerances/)). Where you
  want the pin **retained** rather than free (its ends, in the outer link), drop to a transition/press
  value (0.0 to −0.05 mm) or add a barb.
- **Pin retention without glue:** three glue-free options — (a) **barbed/headed printed pin**: a disc head
  one end, a chamfered barb that snaps past the far knuckle the other; (b) **press-fit ends, clearance
  middle**: pin is interference in the two outer knuckles and 0.30 mm-clearance in the rotating middle
  knuckle; (c) **print-in-place captive pin** (see Option B). MatterHackers' printed strap simply *reused
  the watch's own pin+clip* through the lug ([MatterHackers](https://www.matterhackers.com/articles/matterhackers-design-lab-watch-strap)) —
  we replace that steel pin with a printed one.
- **Clips to the cage lugs:** the two **end-links** are the lug interface — a knuckle that takes the same
  printed cross-pin through the cage lugs (see *Attachment to the cage*).
- **Adjustability:** by **removing/adding links** (coarse, ~link-pitch steps) and/or by the closure
  (Option C). Link removal alone is clumsy for a wearer; pair it with a buckle for fine steps.
- **Failure modes:** knuckle **splitting along layer lines** (mitigate: print flat so layer lines are not
  the shear plane, ≥2 mm knuckle wall, root fillets); **pin shear** if the pin is thin (keep Ø ≥ 2.4 mm —
  a printed pin needs far more section than a 1.78 mm steel spring bar,
  [WatchGecko](https://www.watchgecko.com/products/set-of-20-standard-diameter-replacement-watch-strap-spring-bars));
  bore **ovalisation** over many cycles (low-load here, acceptable). PLA cyclic-fatigue-under-pin-loading
  is real but this is a low-cycle, low-load pivot ([NCBI PMC11595828](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11595828/)).

### Option B — Print-in-place articulated band (links printed pre-assembled)

The whole band prints in one go, links already interlocked around integral pins — **zero assembly**. This
is the classic "3D-printed watch band" on Printables/MakerWorld
([JuanGrados print-in-place watch band](https://www.printables.com/model/46273-watch-band-print-in-place);
[Fluxspace tutorial](https://www.fluxspace.io/resources/print-in-place-watch-band);
[parametric articulated bracelet](https://makerworld.com/en/models/2790613-parametric-customizable-articulated-bracelet)).

- **Printability (PLA):** very reliable and *proven at scale* — print-in-place watch bands are one of the
  most-printed functional models, and PLA is the recommended material (low warp, good bridging, forgiving
  temps, [Zbotic](https://zbotic.in/print-in-place-designs-functional-3d-prints-without-assembly/)).
  Printed **flat, no supports**. The named risk is the built-in pin bore printing as a horizontal hole:
  the bore's top prints as an overhang that can sag and **fuse the joint** if the gap is too small or the
  profile is a plain circle. Fix = **teardrop/chamfered hinge profile** (flatten the top of the bore /
  point the pin) so the overhang self-supports; the Fluxspace tutorial explicitly adds a **fillet to the
  hinge cylinder "to help the printer when printing without supports"**
  ([Fluxspace](https://www.fluxspace.io/resources/print-in-place-watch-band); teardrop rationale,
  [UAVMODEL](https://blog.uavmodel.com/3d-printer-print-in-place-designs-clearance-tolerances-material-choice-and-articulation-tips-2026-guide/)).
- **Clearance/tolerance:** **0.30 mm** all-round is the safe hackathon value; Bambu machines out-of-the-box
  can go tighter (**0.15–0.20 mm** with good calibration/flow) but 0.30 mm buys margin so nothing fuses on
  the first print ([Bambu forum](https://forum.bambulab.com/t/print-in-place-hinge-tolerances/111715);
  articulated-bracelet range quoted **0.15–0.35 mm**, [Zbotic](https://zbotic.in/print-in-place-designs-functional-3d-prints-without-assembly/)).
  Verify with a **captive-pin tolerance test coupon** before committing the full band
  ([UAVMODEL](https://blog.uavmodel.com/3d-printer-print-in-place-designs-clearance-tolerances-material-choice-and-articulation-tips-2026-guide/)).
- **Clips to the lugs / adjustability / failure modes:** same as Option A (end-links + cross-pin; buckle
  for sizing). Extra risk unique to print-in-place: **a single fused joint = reprint the whole band**
  (many joints in series, one bad bridge ruins it), and the first bottom-layer joint can fuse from
  **elephant-foot** (mitigate with slicer XY/first-layer compensation,
  [Snapmaker](https://www.snapmaker.com/blog/3d-printing-tolerances/)).

### Option C — Ratchet / notched clasp or printed tang buckle + holes (the adjustability mechanism)

This is the **closure/adjustment**, not the band; it pairs with A/B/E. Two magnet-free, fully-printable
families:

- **Tang (pin) buckle + hole row — like an ordinary watch strap.** A printed rectangular buckle frame with
  a **tang** (a stub pin) on the free end; the other strap end carries a **row of holes**; the wearer drops
  the tang into whichever hole fits. This is the **lowest-risk PLA closure** because the tang is a **rigid
  pin dropping into a molded-in hole — essentially zero cyclic bending strain on the plastic** (unlike a
  snap latch it never flexes to open). Printed watch-strap buckles are a standard pattern and are
  recommended in **PLA/PETG rather than TPU** precisely because the locking parts want stiffness
  ([Printables watchband/buckle tags](https://www.printables.com/tag/watchband); a printable buckle is
  commonly "separable into parts, tongue between knuckles for an adjustable fit"). MatterHackers tuned the
  **buckle-hole spacing** to dial in fit ([MatterHackers](https://www.matterhackers.com/articles/matterhackers-design-lab-watch-strap)).
  - Clearance: tang Ø ~2.5–3.0 mm, holes **+0.3–0.4 mm** over tang Ø; **hole pitch 5 mm** gives clean
    wrist steps; 6–8 holes covers the adult range.
  - Failure modes: hole **elongation/tear-out** and tang-tip wear (mitigate: ≥2 mm material around each
    hole, chamfer hole mouths, tang Ø ≥ 2.5 mm). Very durable because nothing repeatedly flexes.
- **Ratchet / notched pawl — like a ski-boot buckle or cable-tie.** A toothed strap runs through a
  sprung pawl; each tooth is a finer adjustment step, one-handed to tighten. Fully-printable ratchet straps
  exist and print **in PLA with no supports** ([Thingiverse "Functional Ratchet Strap" thing:4034949](https://www.thingiverse.com/thing:4034949);
  [Printables ratchetstrap tag](https://www.printables.com/tag/ratchetstrap)).
  - **Higher risk in PLA:** the pawl is a **cyclically-flexed cantilever** (PLA fatigue-prone) and the fine
    teeth can **shear/round-off** in a brittle material; the small tooth features also stress the printer's
    tolerance. Finer adjustment, but more failure surface than a tang buckle.
- **Rejected sub-options:** deployant/butterfly clasps (many small precise parts — too complex/risky for a
  2-day build); anything relying on magnets (ruled out).

### Option D — Living-hinge / flexure band in PLA — **NOT RECOMMENDED (feasibility flag)**

A band that wraps by **elastically bending a thin PLA web** (living hinge / flexure), no discrete pins.

- **Feasibility in PLA: poor — this is the one architecture to avoid.** PLA's crystalline structure is
  brittle and has almost no fatigue tolerance in thin bending sections. Reported cycle life for a **PLA
  living hinge is ~50–200 cycles** before cracking (and delamination in as few as 10–50 if layers run the
  wrong way), versus PETG 3,000–4,000, TPU 5,000+, PA12/nylon 10,000+
  ([hotean](https://hotean.com/blogs/hotean-blog/design-a-3d-printed-living-hinge-for-10-000-cycles)).
  Multiple guides state PLA is **unsuitable for living hinges unless a flexible-formulated PLA is used**
  ([3DISM](https://3dism.org/how-to-print-flexible-hinges-and-living-hinges-in-one-piece/);
  [Protolabs/Hubs living hinges](https://www.hubs.com/knowledge-base/how-design-living-hinges-3d-printing/)).
  A wrist strap is flexed **every wear** — hundreds of cycles in days — so a plain-PLA flexure band will
  **crack during the hackathon**.
- **If ever attempted anyway (documented for completeness, still flagged high-risk):** web thickness
  **0.3 mm** (range 0.2–0.5), internal bend radius **1.0–1.5×** web thickness, active flex length
  **5–10 mm**, and critically **layer lines parallel to the bend axis** (perpendicular layers delaminate in
  10–50 cycles) ([hotean](https://hotean.com/blogs/hotean-blog/design-a-3d-printed-living-hinge-for-10-000-cycles)).
  Even done perfectly, PLA won't reach a reliable service life. **Reliable flexure bands require TPU/PP/PETG
  — outside the PLA-only constraint — so Option D is excluded from the recommendation.**

### Option E — Two-part cuff + printed snap/latch

Two rigid printed arcs (top + bottom half-cuff) hinged on one lug pair and **snapping/latching** shut on
the other — a bracelet that opens on one side.

- **Printability (PLA):** the arcs are easy rigid prints. The **snap latch** is the concern: a cantilever
  snap in PLA works for things opened **rarely** ("once a year for a battery," fine) but PLA is explicitly
  called **less suitable for snap-fits that are opened often** because the brittle beam fatigues and can
  snap off ([Protolabs/Hubs snap-fits](https://www.hubs.com/knowledge-base/how-design-snap-fit-joints-3d-printing/);
  [goodprints3d](https://www.goodprints3d.com/blogs/3d/best-filament-for-snap-fit-3d-prints-clips-latches-and-flexing-parts)).
  A wrist clasp is opened **daily**, so a PLA snap latch is a moderate fatigue risk — survivable only with
  conservative cantilever geometry.
- **Snap-fit design numbers (if used):** deflection-to-length ratio **≤ 1:12 for FDM** (not the injection-
  moulding 1:8) so peak root strain stays low; **root fillet radius ≥ 0.5×** beam base thickness;
  **taper** the beam thinner toward the tip to even out strain; **min clip width ~5 mm**; beam wall
  **≥ 1.2 mm** (3× a 0.4 mm nozzle) and ≥3–4 perimeters; **engagement clearance ~0.4–0.5 mm** for FDM; and
  **print the cantilever lying in the X-Y plane, layer lines along its length** — a Z-oriented snap loses
  ~50 % elongation-at-break and ~20–30 % strength and delaminates
  ([Fictiv](https://www.fictiv.com/articles/how-to-design-snap-fit-components);
  [Protolabs/Hubs](https://www.hubs.com/knowledge-base/how-design-snap-fit-joints-3d-printing/);
  [Mandarin3D](https://mandarin3d.com/blog/how-to-design-parts-that-snap-fit-together);
  [goodprints3d](https://www.goodprints3d.com/blogs/3d/best-filament-for-snap-fit-3d-prints-clips-latches-and-flexing-parts)).
- **Adjustability:** a rigid two-part cuff is **barely adjustable** on its own (one fixed diameter). To make
  it wrist-adjustable you must add hole steps or a ratchet at the latch — at which point you've re-created
  Option C anyway. This is E's main weakness for the "wrist-adjustable" requirement.
- **Clips to the lugs:** the hinge arc pins to one lug pair (cross-pin, as A); the latch arc pins to the
  other. Failure modes: **latch cantilever fatigue/snap-off** (the daily-flex problem above) and a hard
  binary fit (fits or it doesn't).

### At-a-glance comparison

| Option | PLA printability | Wrist-adjustable? | No-magnet closure | Main PLA risk | Hackathon fit |
|---|---|---|---|---|---|
| **A** Segmented links + push-in pins | Excellent | Coarse (links) + buckle | via Option C | knuckle layer-split / pin shear | **Very good** |
| **B** Print-in-place band | Excellent, proven | via buckle | via Option C | one fused joint ⇒ whole reprint | **Very good** (with test coupon) |
| **C** Tang buckle + holes | Excellent (rigid) | **Yes — hole steps** | **Yes (rigid pin, ~no flex)** | hole tear-out (minor) | **Best closure** |
| C′ Ratchet/pawl | Good, support-free | Yes — fine steps | Yes | pawl fatigue + tooth shear | OK, higher risk |
| **D** Living-hinge flexure | **Poor (50–200 cyc)** | continuous | n/a | **cracks in days** | **Avoid (PLA)** |
| **E** Two-part cuff + snap latch | Good arcs, risky latch | Poor without holes | snap (daily-flexed) | latch cantilever snap-off | Fallback-tier |

---

## Recommended primary + fallback

### PRIMARY — **Print-in-place segmented pin-hinge band + printed tang (pin) buckle, clipped to the cage lugs with a printed captive cross-pin ("spring-bar substitute")**  (Option B + Option C)

Why this wins the constraints:

- **Fully printed, PLA, gray, no magnets, no bought parts** — band, buckle, tang, and pins are all printed.
- **Puts cyclic duty where PLA is strong.** The band articulates on **rotating pins** (rigid pivots, not
  flexed) and closes on a **tang-in-hole** (rigid pin, ~zero bending strain). The two things PLA is *bad*
  at — a repeatedly-*flexed* living hinge (Option D) and a daily-*flexed* snap latch (Option E) — are
  designed out. This is the single most important reason the primary is B+C, not D or E.
- **Proven pattern, minimal assembly.** Print-in-place watch bands are among the most-printed functional
  PLA models; the band comes off the plate already articulated (zero band assembly). Only the buckle tang
  and the two lug cross-pins are separate small parts.
- **Wrist-adjustable + wearer-openable** by the everyday watch-strap action (tang into a hole), reliable
  and one-you-already-know-how-to-use.

**If the print-in-place clearance misbehaves at the event** (a joint fuses, or the band is too stiff),
pivot the band construction to the fallback **without changing the buckle or the lug interface** — those
are shared.

### FALLBACK (simpler / lower single-point-of-failure) — **Separately-printed coarse links joined by push-in printed pins + the same tang buckle + the same lug cross-pin**  (Option A + Option C)

- **Same closure, same lug clip** as the primary — only the band construction changes: **fewer, larger
  links printed as individual parts**, each joint made by pushing a printed pin through (deterministic,
  test-each-joint). This trades a little assembly for **no whole-band fusing risk** (a bad joint costs one
  small reprint, not the whole band) and coarser articulation that is very forgiving to print.
- It is the safe pivot precisely because print-in-place's failure mode is "one bad bridge ⇒ reprint
  everything"; separate-link-plus-pin removes that. Coarser links also print faster (good for the
  reprint budget in `05` §7).

Both are **no-magnet, PLA-only, gray, and printable in the hackathon.** A CAD modeller builds **one buckle
family and one lug-pin family**, then chooses band construction (print-in-place vs separate-link) — the
interfaces are identical, so the choice is deferred to the first test print.

*(Option E, the two-part snap cuff, is the third-choice: keep it only if a slimmer/rigid look is wanted and
accept the daily-flex latch fatigue risk with the conservative snap geometry above. Option D is excluded in
PLA.)*

---

## Design rules / clearances (hand to the CAD modeller)

All values are **design recommendations** for a Bambu FDM PLA print at **0.4 mm nozzle, 0.16–0.20 mm layer**
unless noted. Keep everything **parametric** and print a **tolerance test coupon first** (below).

### Clearances / tolerances

| Fit / feature | Value | Basis (cited) |
|---|---|---|
| **Hinge pin — free rotation** (bore Ø − pin Ø) | **0.30 mm** (start); 0.25 tight, 0.35 loose | [UAVMODEL](https://blog.uavmodel.com/3d-printer-print-in-place-designs-clearance-tolerances-material-choice-and-articulation-tips-2026-guide/) (0.20/0.30/0.40); [Snapmaker](https://www.snapmaker.com/blog/3d-printing-tolerances/) hinge 0.30–0.50 |
| **Print-in-place joint gap** (all-round) | **0.30 mm** hackathon-safe; 0.15–0.20 if Bambu tuned | [Bambu forum](https://forum.bambulab.com/t/print-in-place-hinge-tolerances/111715); [Zbotic](https://zbotic.in/print-in-place-designs-functional-3d-prints-without-assembly/) 0.15–0.35 |
| **Pin retained end** (press/transition) | **0.0 to −0.05 mm** interference, or a barb | [Snapmaker](https://www.snapmaker.com/blog/3d-printing-tolerances/) interference/transition |
| **Buckle tang in adjustment hole** | hole = tang Ø **+0.3–0.4 mm** | tang-buckle practice; general clearance-fit |
| **Snap-latch engagement clearance** (if Option E) | **0.4–0.5 mm** (FDM) | [Protolabs/Hubs](https://www.hubs.com/knowledge-base/how-design-snap-fit-joints-3d-printing/) |
| **Elephant-foot / first joint** | slicer XY-compensation −0.10–−0.15 mm, or 0.2 mm chamfer on bottom edges | [Snapmaker](https://www.snapmaker.com/blog/3d-printing-tolerances/) |

**Tolerance test coupon (do this before the real band):** print a small block with a captive pin at your
chosen clearance, let it **cool fully**, and confirm it turns under light finger pressure; if it binds, add
0.05 mm and reprint just the coupon
([UAVMODEL](https://blog.uavmodel.com/3d-printer-print-in-place-designs-clearance-tolerances-material-choice-and-articulation-tips-2026-guide/)).

### Dimensions / geometry

| Feature | Recommendation | Note |
|---|---|---|
| **Pin diameter** (hinge + lug cross-pin) | **Ø 2.4–3.0 mm** (use 2.5 mm) | Printed PLA needs far more section than a 1.78 mm steel spring bar ([WatchGecko](https://www.watchgecko.com/products/set-of-20-standard-diameter-replacement-watch-strap-spring-bars)) |
| **Knuckle / bore wall** | **≥ 2.0 mm** around the bore | `05` §7 ≥2 mm walls; resist layer-split |
| **Link body wall / thickness** | **≥ 2.0 mm**; band inner face smooth, edges chamfered | `05` §7 |
| **Snap-beam wall** (Option E only) | **≥ 1.2 mm** (3× nozzle), ≥3–4 perimeters | [Mandarin3D](https://mandarin3d.com/blog/how-to-design-parts-that-snap-fit-together) |
| **Snap-beam geometry** (Option E only) | deflection:length **≤ 1:12**, root fillet **≥ 0.5×** base thk, taper toward tip, width ≥ 5 mm | [Fictiv](https://www.fictiv.com/articles/how-to-design-snap-fit-components); [Protolabs/Hubs](https://www.hubs.com/knowledge-base/how-design-snap-fit-joints-3d-printing/) |
| **Fillet all hinge cylinders** | small fillet at the cylinder base | helps support-free printing ([Fluxspace](https://www.fluxspace.io/resources/print-in-place-watch-band)) |
| **Hinge bore profile** | **teardrop / flat-top** (not a plain circle) | prevents overhang sag/fusing ([UAVMODEL](https://blog.uavmodel.com/3d-printer-print-in-place-designs-clearance-tolerances-material-choice-and-articulation-tips-2026-guide/)) |
| **Link pitch** | **8–12 mm** per link (primary, fine); **15–20 mm** (fallback, coarse) | wrap vs joint count trade |

### Print orientation & supports (Bambu)

- **Band (A & B):** print **FLAT on the plate, band laid out straight, no supports.** Layer lines run
  **across** the band so the pin bores are **horizontal holes** → use the **teardrop/flat-top bore** so the
  bore roof self-supports, and **fillet the hinge cylinders** ([Fluxspace](https://www.fluxspace.io/resources/print-in-place-watch-band);
  [UAVMODEL](https://blog.uavmodel.com/3d-printer-print-in-place-designs-clearance-tolerances-material-choice-and-articulation-tips-2026-guide/)).
  Apply first-layer **elephant-foot compensation** so the bottom joint doesn't fuse.
- **Printed pins:** print **standing/upright is cleanest for roundness** but makes a weak Z-layer pin;
  **prefer printing pins lying flat** (layers along the pin length) so they don't shear on layer lines —
  same rule as snap beams (XY-plane = full strength, Z = −50 % elongation,
  [goodprints3d](https://www.goodprints3d.com/blogs/3d/best-filament-for-snap-fit-3d-prints-clips-latches-and-flexing-parts)).
- **Buckle frame & tang:** print **flat**, tang oriented so it is **not a Z-column** (layers along the
  tang) for shear strength; no supports needed for a well-drafted buckle window.
- **Snap latch (Option E):** print the **cantilever lying in X-Y, layer lines along the beam** — never up
  the Z axis ([Fictiv](https://www.fictiv.com/articles/how-to-design-snap-fit-components)).
- **Single gray colour:** no AMS/multi-material needed anywhere — every part is one-colour PLA.

### Wrist sizing / adjustability

- **Target range:** adult wrist circumference ≈ **140–200 mm** (design assumption; size parametrically).
  Band arc length ≈ wrist circumference − head footprint (~55 mm) + buckle overlap.
- **Coarse sizing:** choose the number of links (or trim links in Option A).
- **Fine sizing = the tang buckle:** a **6–8 hole row at 5 mm pitch** gives ~30–40 mm of on-wrist
  adjustment in comfortable steps (standard watch-strap behaviour;
  [MatterHackers](https://www.matterhackers.com/articles/matterhackers-design-lab-watch-strap) tuned exactly
  this). Optional upgrade: ratchet/pawl for finer, one-handed steps — with the PLA fatigue/tooth-shear risk
  flagged above.
- Keep `motor_separation` / strap-tension logic from `05`/`07`: the strap must **press the flat skin-plate
  firmly** to the wrist (loose = weak haptics), so favour a closure that can be cinched **snug**, which the
  tang buckle does well.

---

## Attachment to the cage (lug interface — this spec defines it)

The cage's lug geometry isn't fixed in `05`/`07`, so here is a **recommended, fully-printed, magnet-free
lug interface** for the cage designer and the strap to share. Model it **parametrically** and match both
sides.

**Recommended (PRIMARY): printed captive cross-pin — a "spring-bar substitute."**

- **Cage side:** **two lugs per side** (watch-style), projecting from the cage wall, with **coaxial bores**.
  Recommend **lug inner gap ≈ 20–22 mm** (matches the common 20/22 mm watch lug widths — plentiful design
  precedent, [Hewore lug guide](https://www.hewore.com/watch-lug-width-guide/)) and **bore Ø 2.6 mm** for a
  Ø 2.5 mm printed pin. Lugs ≥ 3 mm thick, filleted at the root (they carry the whole strap load).
- **Strap side:** the **end-link knuckle** sits in the lug gap; its bore = **Ø 2.8 mm** (0.30 mm clearance
  over the 2.5 mm pin) so the strap **pivots** on the pin.
- **The pin (printed):** **Ø 2.5 mm**, with a **4–5 mm disc head** on one end and a **chamfered barb**
  (Ø ~2.8 mm) on the other that **snaps through the far lug bore** and stays — **captive, glue-free,
  removable** with a deliberate push. Print the pin **lying flat** (layers along its length) for shear
  strength. The pin is a **rigid pivot** → no fatigue.
- Retention logic: pin is **clearance (0.30 mm) in the rotating strap knuckle** but **snaps/press-retains at
  the lug bores** — free where it must turn, held where it must stay
  ([Snapmaker](https://www.snapmaker.com/blog/3d-printing-tolerances/) fit tiers).

**Alternative (FALLBACK lug interface — fewest loose parts): C-snap end-link over a molded cross-bar.**

- Bridge the two lugs with a **solid printed cross-bar (Ø ~3 mm)** integral to the cage. The strap
  **end-link is a C-hook** that **snaps over** the bar (hook mouth ~Ø 2.4 mm over a 3 mm bar ⇒ it flexes
  open to clip on). **No loose pin at all.**
- Trade-off: the C-hook **flexes on every strap change** — but strap changes are **rare** (not a daily
  action), which is exactly the duty cycle where a PLA snap is fine
  ([goodprints3d](https://www.goodprints3d.com/blogs/3d/best-filament-for-snap-fit-3d-prints-clips-latches-and-flexing-parts)).
  Use the conservative snap geometry (root fillet ≥ 0.5× thickness, print in X-Y).

**Both interfaces are identical on the two sides of the head**, so the strap is symmetric and the cage
carries the same lug feature twice. Coordinate the chosen bore/bar Ø with whoever authors the cage so the
strap and cage share one parameter set.

---

## Residual risk

| # | Risk | Severity | How to close |
|---|---|---|---|
| S1 | **Print-in-place joint fuses** (clearance too tight / bottom-layer elephant-foot) ⇒ whole band reprint | Med | Print the **tolerance coupon first**; use **0.30 mm** gap + **teardrop bores** + first-layer XY compensation; if it fuses, **switch to the fallback** (separate links + push pins) — same buckle/lug, no redesign |
| S2 | **Knuckle splits along layer lines / pin shears** under strap tension | Med | Print band **flat** (layers not the shear plane); pin **Ø ≥ 2.4 mm**, printed **lying flat**; ≥2 mm knuckle walls + root fillets |
| S3 | **Buckle hole tear-out / tang wear** over many open-close cycles | Low | ≥2 mm material around holes, chamfer hole mouths, tang **Ø ≥ 2.5 mm**; tang buckle carries ~no bending strain so this is minor |
| S4 | **Ratchet/pawl chosen for fine adjust** ⇒ pawl fatigue + tooth shear in PLA | Med (if used) | Prefer the **tang buckle** (rigid, no cyclic flex); use the ratchet only if fine one-handed adjust is essential, and thicken teeth/pawl |
| S5 | **Snap-latch cuff (Option E) fatigues** — daily-flexed PLA cantilever can snap off | Med (if used) | Avoid daily-flexed PLA snaps for the *main* closure; if used, deflection:length ≤ **1:12**, root fillet ≥ 0.5× base, print in **X-Y**, taper the beam |
| S6 | **Living-hinge flexure band cracks in days** (PLA 50–200 cycles) | High (design-out) | **Excluded** — do not build a PLA flexure band; a reliable flexure needs TPU/PP/PETG, outside the PLA-only constraint |
| S7 | **Lug geometry not yet fixed** in `05`/`07` (this spec defines it) | Med | Freeze the shared lug parameter set (gap 20–22 mm, bore Ø 2.6 mm, pin Ø 2.5 mm) **with the cage author** before printing; keep parametric |
| S8 | **Fit-to-wrist wrong** on first print (arc length / hole range) | Low | Parametric band length + **6–8 holes @ 5 mm**; budget ≥1 reprint (already in `05` §7); test on a real wrist as in plan C2 |
| S9 | **Strap too loose ⇒ weak haptics** (needs firm skin-plate contact, `07` §4) | Med | Tang buckle allows a **snug cinch**; verify the skin-plate is pressed firm in the wear test |

---

## Sources

| Tag | Source | URL |
|---|---|---|
| Print-in-place clearances / teardrop hinge / PLA best / test coupon | UAVMODEL 2026 print-in-place guide | https://blog.uavmodel.com/3d-printer-print-in-place-designs-clearance-tolerances-material-choice-and-articulation-tips-2026-guide/ |
| Bambu PLA hinge tolerance (0.15–0.20 mm; tolerance = design) | Bambu Lab community forum | https://forum.bambulab.com/t/print-in-place-hinge-tolerances/111715 |
| FDM fit table (clearance 0.3–0.5 / transition 0.1–0.2 / interference 0 to −0.05; XY compensation) | Snapmaker tolerances blog | https://www.snapmaker.com/blog/3d-printing-tolerances/ |
| Ball-socket & bracelet clearances; PLA easiest for print-in-place; Bambu 0.12 mm layer | Zbotic print-in-place designs | https://zbotic.in/print-in-place-designs-functional-3d-prints-without-assembly/ |
| Classic print-in-place watch band (PLA, no supports) | Printables — JuanGrados | https://www.printables.com/model/46273-watch-band-print-in-place |
| Print-in-place watch-band tutorial (hole+boss hinge, fillet for support-free, section-view tolerance check) | Fluxspace | https://www.fluxspace.io/resources/print-in-place-watch-band |
| Parametric articulated bracelet (link sizing) | MakerWorld | https://makerworld.com/en/models/2790613-parametric-customizable-articulated-bracelet |
| Snap-fit resizable watch band (snap links, resize, lug snap) | MakerWorld | https://makerworld.com/en/models/1738815-watch-band-snap-fit-easily-resized |
| Printed watch strap: reused pin+clip to lug, buckle-hole spacing tuned for fit | MatterHackers Design Lab | https://www.matterhackers.com/articles/matterhackers-design-lab-watch-strap |
| Snap-fit FDM clearance 0.5 mm, fillet ≥0.5× base, min clip 5 mm, PLA less suitable | Protolabs / Hubs snap-fit guide | https://www.hubs.com/knowledge-base/how-design-snap-fit-joints-3d-printing/ |
| Living-hinge design; PLA unsuitable unless flexible-formulated | Protolabs / Hubs living-hinge guide | https://www.hubs.com/knowledge-base/how-design-living-hinges-3d-printing/ |
| Living-hinge cycle life (PLA 50–200; PETG 3–4k; TPU 5k+; PA12 10k+); web 0.2–0.5 mm, radius 1–1.5×, flex 5–10 mm, layers ∥ bend | hotean living-hinge 10,000 cycles | https://hotean.com/blogs/hotean-blog/design-a-3d-printed-living-hinge-for-10-000-cycles |
| PLA unsuitable for living hinges (brittle) | 3DISM flexible/living hinges | https://3dism.org/how-to-print-flexible-hinges-and-living-hinges-in-one-piece/ |
| Snap-fit deflection 1:12 for FDM, taper beam, X-Y orientation | Fictiv snap-fit components | https://www.fictiv.com/articles/how-to-design-snap-fit-components |
| PLA elongation ~8 % (PETG 24 %, Nylon 100 %); PLA fine for rarely-opened, not daily latches; Z −50 % strain | goodprints3d best filament for snap-fits | https://www.goodprints3d.com/blogs/3d/best-filament-for-snap-fit-3d-prints-clips-latches-and-flexing-parts |
| Snap wall ≥3× nozzle (1.2 mm), 3–4 walls | Mandarin3D snap-fit | https://mandarin3d.com/blog/how-to-design-parts-that-snap-fit-together |
| Watch lug widths 18/20/22/24 mm (20 most common) | Hewore lug width guide | https://www.hewore.com/watch-lug-width-guide/ |
| Spring bar 1.78 mm dia, 0.7 mm tips; 1.5/1.8/2.0 mm options (printed pin must be bigger) | WatchGecko spring bars | https://www.watchgecko.com/products/set-of-20-standard-diameter-replacement-watch-strap-spring-bars |
| Fully-printable ratchet strap in PLA, no supports | Thingiverse "Functional Ratchet Strap" (thing:4034949) | https://www.thingiverse.com/thing:4034949 |
| Ratchet-strap model collection | Printables ratchetstrap tag | https://www.printables.com/tag/ratchetstrap |
| PLA cyclic fatigue under inserted-pin loading (pivot fatigue caution) | NCBI PMC11595828 | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11595828/ |

---

**Bottom line:** Build the strap as a **print-in-place segmented pin-hinge band closed by a printed tang
(pin) buckle with a 6–8 hole row**, clipped to the cage lugs by a **printed captive cross-pin (a
spring-bar substitute: Ø 2.5 mm pin, headed one end, barb-snap the other, through Ø 2.6 mm lug bores and a
Ø 2.8 mm strap knuckle = 0.30 mm pivot clearance)** — fully printed, gray, magnet-free, wrist-adjustable,
wearer-openable. It works in PLA because every duty cycle lands on a **rigid pivot or a rigid pin-in-hole**,
never on a flexed PLA section. If print-in-place clearances misbehave at the event, **fall back to
separately-printed coarse links joined by push-in printed pins** — same buckle, same lug pin, no redesign.
**Do not** build a PLA living-hinge/flexure band (cracks in ~50–200 cycles) or rely on a daily-flexed PLA
snap latch as the main closure. Freeze the shared **lug parameter set** (gap 20–22 mm, bore Ø 2.6 mm, pin
Ø 2.5 mm) with the cage author, keep the clearance at **0.30 mm**, use **teardrop hinge bores**, print the
band **flat with no supports**, and validate with a **tolerance test coupon** before the full band.
