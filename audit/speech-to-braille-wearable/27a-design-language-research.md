# 27a — Design-Language Research: Exposed / Cyberpunk / Clean-Brutalist Feature Vocabulary

**Date:** 2026-07-18 · **Author:** design-research track
**Purpose:** Web-grounded catalog of concrete, FDM-printable aesthetic features for the ~62 mm
square braille wearable case. Feeds the roof/deck/side-wall redesign (free surface per 27b §C).
Every feature ties to a cited source or one of the 3 inspo images, and carries print notes checked
against 27b's locked constraints (min feature 1.2, min emboss 0.4×0.4, bridges ≤12 mm, 45°
chamfers self-supporting, chamfers-not-fillets, one body `cage` + one `skin_plate`).

## Design-thesis distilled from sources

The target look sits at the intersection of four documented movements:

- **Skeleton-watch openworking** — remove every gram of material that isn't structurally
  necessary so the mechanism reads as "mechanical architecture on the wrist"; the removal itself
  is the ornament. ([SwissWatchExpo](https://www.swisswatchexpo.com/thewatchclub/2023/10/02/skeleton-dial-watches-101/),
  [Borsheims](https://www.borsheims.com/blog/inside-the-design-of-skeleton-watches/))
- **Teenage Engineering "strip away the shell"** — refuse to hide engineering; exposed screws,
  raw switches, visible PCBs and motor coils are presented *as* the visual language, closer to lab
  equipment than consumer gadget; monospace type, 5-colour restraint, every element visibly there
  for a functional reason. ([blakecrosley](https://blakecrosley.com/guides/design/teenage-engineering),
  [asiadesignprize](https://asiadesignprize.com/media/321545))
- **Nothing "inside-out"** — transparency turns normally-hidden surfaces (ribbon, screw, heat
  shield) into deliberately-placed design objects; flat edges, strict symmetry, modular grid
  layout. ([Vessel Object](https://vesselobject.com/blogs/blog/nothing-phone-2a-special-edition-when-transparency-becomes-design))
- **Clean brutalism** — bold geometric forms, stark angular lines, honest raw material, texture
  (grooves/ridges/relief) *instead of* applied decoration; matte not polished; apertures and
  cutouts create depth as light moves across them. ([Adorno](https://adorno.design/editorial/embracing-the-raw-beauty-of-brutalist-design/),
  [Hommes Studio](https://hommes.studio/journal/what-is-brutalist-design-brutalist-architecture-and-brutalist-furniture/))
- **G-SHOCK protection language** — knobby protruding bezel forms and all-direction guard
  structure that read as "toughness" while functionally shielding the module; the guard geometry
  is the styling. ([Casio](https://gshock.casio.com/intl/technology/shock/))

FDM makes bold geometry nearly free but punishes curves-going-horizontal and unsupported spans, so
the whole vocabulary is biased toward **chamfers, straight bevels, slots-over-holes, and short
bridges**. ([Snapmaker 45° rule](https://www.snapmaker.com/blog/45-degree-rule-3d-printing/),
[Layer X FDM rules](https://layerx3d.in/blog/fdm-design-rules-wall-thickness-overhangs-bridging-tolerances),
[3D-Demand enclosure guide](https://www.3d-demand.com/blog/3d-printed-enclosures-electronics-guide))

---

## FEATURE VOCABULARY CATALOG

Each: what it is · why it reads cyberpunk/brutalist · print notes · source / inspo.

### A. Frame & structure (the skeleton)

**A1 — Corner posts (4× vertical pillars)**
Four solid square/chamfered columns at the case corners carrying the roof, board sits inside them
like a chassis in a roll cage. *Reads:* exoskeleton / roll-cage toughness, the single strongest
"this is sick" silhouette move. *Print:* trivial — vertical prisms grow straight up, zero
overhang; ≥ 3.0 square easily meets the 2.0 structural floor. *Source:* inspo_2 (corner-post
frame), [G-SHOCK guard structure](https://gshock.casio.com/intl/technology/shock/), exo roll-cage
concept ([Team Integy exo-cage](https://www.integy.com/st_prod.html?p_prodid=37533&p_catid=499)).

**A2 — 45° diagonal brace webs**
Thin triangular gussets bridging post-to-post or post-to-deck at 45°, like a truss. *Reads:*
structural-honesty brutalism + mech-warframe; the diagonal is the signature cyberpunk line.
*Print:* the single best FDM ornament — a 45° web is exactly self-supporting and needs no support
regardless of orientation. Keep web ≥ 2.0 thick. *Source:* inspo_2 (45° braces), [Snapmaker 45°
rule](https://www.snapmaker.com/blog/45-degree-rule-3d-printing/).

**A3 — Open lug bridges**
Strap lugs formed as an open loop/bridge with a visible gap under the bar rather than solid blocks.
*Reads:* skeletal, weight-shed, "openworked." *Print:* the bar over the gap is a short horizontal
bridge — keep span ≤ 12 mm (our lug internal gap is 22 mm, so the bar must run *along* Y between
two posts, or be printed as part of a wall, not bridged across the 22 mm). Constraint: 27b locks
lug bore Ø2.6, gap 22.0 — style the surrounding block, don't move the bore. *Source:* inspo_1
(open lug bridges), [skeleton openworking](https://www.swisswatchexpo.com/thewatchclub/2023/10/02/skeleton-dial-watches-101/).

**A4 — Skeletal side windows**
Rectangular cut-outs through the side walls exposing the PCB edge / board stack from the side.
*Reads:* skeleton-watch caseback logic applied to the flanks; board visible front AND side.
*Print:* cut as slots with long axis vertical (parallel to layers where possible); a window taller
than 12 mm needs a mid-mullion or its top edge chamfered to avoid an unsupported span. *Source:*
inspo_2 (side slots, board visible front and back).

**A5 — Chamfered exposure well**
A module quadrant framed by a recessed opening whose walls flare outward at 45°, funnelling the eye
down to the electronics like a gun-sight or a machined counterbore. *Reads:* precision-milled
brutalist reveal; makes the ERM coin / PCB read as "on display." *Print:* an outward-flaring 45°
wall is self-supporting in face-up orientation; an inward taper is not — orient so the well opens
toward the build plate top. *Source:* inspo_3 (recessed black modules as the face),
[brutalist apertures/relief create depth](https://adorno.design/editorial/embracing-the-raw-beauty-of-brutalist-design/).

**A6 — Chunky protective bezel frame**
A thick raised rim around the whole face (or per-module) that stands proud of the components,
G-SHOCK style, taking hits so the electronics don't. *Reads:* overbuilt tactical heft; "slab-sided
toothy" ruggedness. *Print:* just a taller perimeter wall — free; outer top edge gets a 45° chamfer
(A2 language). Watch height budget (27b: motor top +15.25, roof over motor ≥ +16.25). *Source:*
inspo_3 (chunky gray bezel), [G-SHOCK knobby bezel](https://gshock.casio.com/intl/technology/triple/),
[tactical slab-sided bezel](https://teddybaldassarre.com/blogs/watches/military-watch).

### B. Exposure treatments (how each module shows itself)

**B7 — Raised collar / turret around the knob**
A cylindrical (or hex-prism) wall standing proud around the rotary-encoder shaft, like a lens
turret or a scope mount, knob spinning inside it. *Reads:* mechanical instrument / periscope;
protects the tallest protruding part. *Print:* a vertical cylinder/prism is support-free; 27b locks
≥ Ø16 clearance around the (−12,+12) axis from +13 up, and the hex motif here is already banked as
liked. A hex turret prints better than round (flat faces, no top overhang issue). *Source:* 27b
§B (hex motif liked), inspo_3 (proud knurled knob), [crown-guard turret language](https://seals-watches.com/pages/case-bezel-and-crown-guards).

**B8 — Louvre / slot grille over a motor**
A bank of parallel elongated slots spanning a covered module (e.g. an ERM you want *felt* not fully
seen) — airflow-grille look that still reveals motion in flashes. *Reads:* TE / lab-equipment
grille; hazard-adjacent rhythm. *Print:* use elongated slots ≥ 1.5 mm wide, ~2 mm pitch, long axis
running with the layers; slots print far better than round holes (round holes < ~4 mm droop on the
ceiling). Rib between slots ≥ 1.5. *Source:* inspo (grille rhythm), [3D-Demand: slots ≥1.5 mm, grid/louvre](https://www.3d-demand.com/blog/3d-printed-enclosures-electronics-guide),
[TE grilles/silkscreen](https://blakecrosley.com/guides/design/teenage-engineering).

**B9 — Open trench for the tactile buttons**
Instead of a shelf with pin-holes, an open channel down the +X edge with the 3 plungers standing
visible in it. *Reads:* exposed-switch honesty (TE "raw switches"), machined channel brutalism.
*Print:* an open-top trench is support-free and prints cleaner than 3 deep Ø-holes (27b allows this
explicitly; buttons never covered by >3 mm). *Source:* 27b §C, [TE exposed raw switches](https://asiadesignprize.com/media/321545).

**B10 — Bridge bezel over the LCD**
A single slim cross-bar or L-frame holding the LCD window opening, rest of the module left open —
minimal material touching the glass. *Reads:* skeleton/open-heart watch (one window framing the
"active" component). *Print:* the bar is a short bridge; keep any unsupported span ≤ 12 mm or step
it with a chamfered underside. 27b locks LCD window ≥13.5×27.9 and a −Y overhang-relief void — the
bezel may frame but must not intrude that void. *Source:* inspo_1/inspo_3 (LCD as framed face),
[open-heart single-window](https://teddybaldassarre.com/blogs/watches/best-skeleton-watches).

**B11 — Per-quadrant differentiated treatment**
Give the 4 module quadrants deliberately *different* exposures (open well / grille / collar /
bridge) rather than one uniform face. *Reads:* the modular-grid "every component placed with
intent" of Nothing; instrument-panel variety. *Print:* free — each is its own local feature. Risk:
overdone (see restraint rules — cap the vocabulary). *Source:* 27b §C, [Nothing inside-out intentional placement](https://vesselobject.com/blogs/blog/nothing-phone-2a-special-edition-when-transparency-becomes-design).

### C. Surface & edge language (the "clean" texture layer)

**C12 — Universal 45° hazard-chamfer motif**
Adopt one consistent 45° bevel on *every* top/outer edge and every well mouth — the repeated angle
is the through-line that unifies the whole part. *Reads:* machined brutalist honesty; the "one
accent motif repeated" that reads clean not busy. *Print:* 45° chamfers are the single most
print-friendly edge, self-supporting in any orientation, and 27b already banks
"chamfers-not-fillets." *Source:* [brutalist stark angular lines](https://hommes.studio/journal/what-is-brutalist-design-brutalist-architecture-and-brutalist-furniture/),
[FDM chamfer vs fillet](https://www.snapmaker.com/blog/45-degree-rule-3d-printing/).

**C13 — Stepped strata / stratified faces**
Deliberately expose FDM layer-stepping as terraced levels (deck at one Z, wells stepping down),
turning the process artifact into intentional geology. *Reads:* brutalist "honest expression of
material," retro-tech topography. *Print:* free and native to FDM — steps are just stacked
extrusions; each step riser vertical = no overhang. *Source:* [brutalist honest material / relief animates planes](https://adorno.design/editorial/embracing-the-raw-beauty-of-brutalist-design/).

**C14 — Trench / channel panel lines**
Shallow recessed grooves scored across the deck/walls to break up mass into panels (greeble panel
lines). *Reads:* cyberdeck / mecha panel-lining; catches shadow as light moves. *Print:* deboss ≥
0.4 wide × 0.4 deep (27b floor); with a V or flat bottom, no support. *Source:*
[cyberdeck chunky industrial exposed look](https://cyberdeck.cafe/build),
[brutalist grooves as primary detail](https://adorno.design/editorial/embracing-the-raw-beauty-of-brutalist-design/).

**C15 — Embossed silkscreen-style text/labels**
Raised monospace labels, index marks, or a device name on flat panel areas (mimicking PCB
silkscreen). *Reads:* TE monospace/silkscreen DNA; instrument labelling. *Print:* raised (embossed)
prints clearer than engraved on FDM; keep stroke ≥ 0.5 mm, height ≥ 0.6–1 mm, letters ≥ 3–5 mm
tall, simple font. Put on a top-facing flat only. *Source:* [Mandarin3D readable text](https://mandarin3d.com/blog/text-and-engravings-best-practices-for-readable-3d-printed-text),
[TE monospace-only type](https://blakecrosley.com/guides/design/teenage-engineering).

**C16 — Knurled collar band**
A ring of fine vertical ridges around the knob turret (B7) or a grip band on a corner post.
*Reads:* machined crown / instrument knob tactility. *Print:* knurling fights the overhang rule —
use a *right-triangle* groove profile (max 45° overhang, not 60°) and run ridges vertically; keep
ridge feature ≥ 1.2. Best on a vertical cylindrical surface. *Source:* [FDM knurling right-triangle 45° profile](https://forums.autodesk.com/t5/fusion-design-validate-document/how-to-make-a-knob-3d-print-friendly/td-p/9548879),
inspo_3 (knurled knob), [knurled crown grip](https://teddybaldassarre.com/blogs/watches/military-watch).

### D. Detail accents (used sparingly)

**C17 — Visible screw bosses as design elements**
Let the 4 skin-plate screw heads / bosses read openly as counter-sunk metal dots on a face, like
TE's exposed screws, arranged on the symmetry grid. *Reads:* TE / Nothing "exposed screws as
language"; honest fastening. *Print:* bosses are vertical cylinders (free); 27b locks Ø7.0 boss,
Ø4.0×2.0 head recess — style the surround, keep the bore. *Source:* [TE exposed screws](https://blakecrosley.com/guides/design/teenage-engineering),
inspo_3 (corner screw dots), [Nothing every screw placed with intent](https://vesselobject.com/blogs/blog/nothing-phone-2a-special-edition-when-transparency-becomes-design).

**C18 — Sculpted USB-C port funnel**
Treat the USB opening as a deliberate chamfered/flared funnel feature on the +X wall (cable
"docks") rather than a plain slot. *Reads:* exposed-port cyberdeck honesty; a sculpted aperture.
*Print:* outward chamfer/funnel is self-supporting and also eases plug insertion; 27b locks
opening ≥12×7, funnel *outward*, wall web ~2.1 — do NOT thicken. *Source:* inspo_2 (exposed USB),
[cyberdeck exposed ports](https://cyberdeck.cafe/build), 27b §A USB-C.

**C19 — Angular corner notch / cropped-corner language**
Clip one or more case corners at 45° (or notch them) as a repeated asymmetry cue. *Reads:*
tactical/mecha "cut" geometry; keys the whole form to the 45° motif. *Print:* a chamfered corner
is trivially self-supporting. Use sparingly (1 corner, e.g. to mark orientation). *Source:*
[brutalist bold geometric angular forms](https://hommes.studio/journal/what-is-brutalist-design-brutalist-architecture-and-brutalist-furniture/),
inspo_2 (angular frame).

**C20 — Raised registration/index tick**
A single small raised triangle or tick at a datum edge (e.g. "12 o'clock" / top-of-face marker).
*Reads:* instrument dial index; intentional wayfinding. *Print:* small raised prism, ≥ 1.2 feature,
top-facing. Use exactly once. *Source:* [tactical index/dial marks](https://teddybaldassarre.com/blogs/watches/military-watch),
[TE functional-mark language](https://asiadesignprize.com/media/321545).

**C21 — Matte / textured fill panel vs. crisp chamfer edges**
Leave broad faces in a light surface texture (or as-printed matte) while keeping all chamfer edges
crisp — brutalist "texture instead of decoration," and it hides FDM layer lines. *Reads:* honed
concrete brutalism; the gray inspo_3 look. *Print:* free (texture via slicer/fuzzy-skin or modeled
micro-relief ≥ 0.4). *Source:* [brutalist matte/honed texture as detail](https://adorno.design/editorial/embracing-the-raw-beauty-of-brutalist-design/),
inspo_3 (matte gray bead-blast look).

**C22 — Back-side openwork (skeletal caseback)**
NOTE: BLOCKED for this device — 27b locks the skin_plate as a SOLID 57×57×3.0 haptic coupler (no
holes beyond 4 screws), because the plate transmits ERM vibration to the wrist. Listed so the
"board visible from the back" move from inspo_2 is explicitly ruled out and not attempted.
*Source:* inspo_2 (rear-visible board) vs. 27b §A skin plate = solid.

---

## RESTRAINT RULES — what makes exposed/brutalist read CLEAN vs. overdone

Grounded in the sources, the "clean" versions of every reference win by *subtraction and
repetition*, not accumulation:

1. **One accent motif, repeated.** Pick the 45° chamfer (C12) as the single unifying angle and put
   it on every edge, well, notch, and funnel. TE's power comes from a 5-colour, one-typeface
   discipline — self-imposed limitation reads as intent.
   ([TE constraints-as-aesthetic](https://blakecrosley.com/guides/design/teenage-engineering))

2. **Everything on a grid.** Align module wells, screw bosses, labels, and slots to one shared
   symmetry grid. Nothing/TE both lean on "strict symmetry, modular layout, every component placed
   with intent" — misalignment is what makes exposed guts look messy rather than designed.
   ([Nothing inside-out](https://vesselobject.com/blogs/blog/nothing-phone-2a-special-edition-when-transparency-becomes-design))

3. **Cap the feature count per surface.** Skeletonization is "remove everything not structurally
   necessary" — the ornament is the *removal*. Aim for ~3 primary moves on the face (e.g. corner
   posts + one chamfer language + differentiated wells), not ten. Each added greeble spends the
   budget.
   ([skeleton = reduce to bare minimum](https://www.swisswatchexpo.com/thewatchclub/2023/10/02/skeleton-dial-watches-101/))

4. **Consistent chamfer angle & consistent wall rhythm.** One bevel angle (45°), one or two wall
   thicknesses, one slot pitch. Brutalism reads clean when forms are "bold, geometric, stark" with
   a single structural logic; it reads busy when angles and thicknesses vary randomly.
   ([brutalist bold geometric / order & clarity](https://hommes.studio/journal/what-is-brutalist-design-brutalist-architecture-and-brutalist-furniture/))

5. **Texture instead of decoration.** Use grooves, matte fill, and layer-strata (C13/C14/C21) to
   enrich surfaces rather than adding parts. Brutalism explicitly makes texture the primary detail
   "instead of applied decoration."
   ([Adorno brutalist texture-as-detail](https://adorno.design/editorial/embracing-the-raw-beauty-of-brutalist-design/))

6. **Let function be the ornament.** Expose screws, switches, ports, and coils *because they're
   there*, arranged deliberately — do not add fake greebles. TE's rule: every element exists where
   it is for a functional reason, and that honesty is the beauty.
   ([TE form-follows-function](https://blakecrosley.com/guides/design/teenage-engineering))

7. **Monochrome + one restrained accent.** Muted gray/black body (inspo_3, TE palette) with the
   green PCB (inspo_1/2) as the *only* colour event. Don't add a second accent colour in the print.
   ([TE muted grays/blacks](https://blakecrosley.com/guides/design/teenage-engineering))

8. **Print-honesty = design-honesty.** Because 45° chamfers, slots-over-holes, and short bridges
   are what FDM does cleanly, designing to those constraints *automatically* produces the crisp,
   machined-looking result; fighting them (fillets, round vents, long unsupported spans) produces
   the droopy, "3D-printed-looking" mess that reads cheap.
   ([Snapmaker chamfer-not-fillet](https://www.snapmaker.com/blog/45-degree-rule-3d-printing/),
   [Layer X FDM rules](https://layerx3d.in/blog/fdm-design-rules-wall-thickness-overhangs-bridging-tolerances))

---

## Sources

- Skeleton / openworked watch design language — [SwissWatchExpo](https://www.swisswatchexpo.com/thewatchclub/2023/10/02/skeleton-dial-watches-101/), [Borsheims](https://www.borsheims.com/blog/inside-the-design-of-skeleton-watches/), [Teddy Baldassarre](https://teddybaldassarre.com/blogs/watches/best-skeleton-watches)
- Cyberpunk watch industrial design — [Yanko Design](https://www.yankodesign.com/2022/10/25/this-striking-cyberpunk-watch-concept-is-ironically-analog-at-heart/), [Aesthetics of Design](https://www.aesdes.org/2024/02/14/opposite-upcycle-aesthetic-organic-modern-vs-cyberpunk-industrial/)
- Teenage Engineering design language — [blakecrosley](https://blakecrosley.com/guides/design/teenage-engineering), [Asia Design Prize](https://asiadesignprize.com/media/321545)
- Nothing transparency / inside-out — [Vessel Object](https://vesselobject.com/blogs/blog/nothing-phone-2a-special-edition-when-transparency-becomes-design)
- G-SHOCK protection structure — [Casio shock](https://gshock.casio.com/intl/technology/shock/), [Casio Triple G](https://gshock.casio.com/intl/technology/triple/)
- Brutalist product/detail language — [Adorno](https://adorno.design/editorial/embracing-the-raw-beauty-of-brutalist-design/), [Hommes Studio](https://hommes.studio/journal/what-is-brutalist-design-brutalist-architecture-and-brutalist-furniture/)
- Cyberdeck design / exposed PCB — [Cyberdeck Cafe](https://cyberdeck.cafe/build), [Bit Rebels](https://bitrebels.com/geek/raspberry-pi-cyberdeck-the-3d-printable-dual-screen-build-that-reveals-the-real-constraints/), [Hackster](https://www.hackster.io/news/a-cyberdeck-built-specifically-for-3d-printing-4a206d3481c1)
- Open-frame keyboard / PCB-as-aesthetic — [Kevin Lynagh](https://kevinlynagh.com/keyboards/)
- Tactical watch bezel/crown/lug language — [Teddy Baldassarre military](https://teddybaldassarre.com/blogs/watches/military-watch), [Seals crown guards](https://seals-watches.com/pages/case-bezel-and-crown-guards)
- FDM 45° rule / chamfer-vs-fillet / bridging — [Snapmaker](https://www.snapmaker.com/blog/45-degree-rule-3d-printing/), [Layer X](https://layerx3d.in/blog/fdm-design-rules-wall-thickness-overhangs-bridging-tolerances), [3DSourced](https://www.3dsourced.com/rigid-ink/how-to-print-overhangs-bridges-exeeding-the-45-degree-rule/)
- FDM enclosure vents/slots/walls — [3D-Demand enclosures](https://www.3d-demand.com/blog/3d-printed-enclosures-electronics-guide), [3D-Demand DFM](https://www.3d-demand.com/blog/design-guidelines-for-fdm-3d-printing-wall-thickness-tolerances-file-prep)
- FDM text emboss/engrave — [Mandarin3D](https://mandarin3d.com/blog/text-and-engravings-best-practices-for-readable-3d-printed-text)
- FDM knurling printability — [Autodesk forum](https://forums.autodesk.com/t5/fusion-design-validate-document/how-to-make-a-knob-3d-print-friendly/td-p/9548879)
- Exo / roll-cage frame reference — [Team Integy exo-cage](https://www.integy.com/st_prod.html?p_prodid=37533&p_catid=499)
</content>
</invoke>
