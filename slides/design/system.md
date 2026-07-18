# Design system

For `slides/deck/`. Motion and layout numbers come from `slides/reference/spec.md` and are
**mandatory**. Typography is specified here and **overrides** the reference.

---

## Typography — forbidden

**Monospace anywhere is an automatic deck rejection.** Not for labels, not for stats, not
for GPIO names, not for dimensions, not for part numbers, not for "product spec" callouts,
not for `tabular-nums` dressed up as a reason.

Banned declarations: `monospace` · `ui-monospace` · `SFMono-Regular` · `Menlo` · `Monaco` ·
`Consolas` · `Courier` · `Liberation Mono` · `Andale Mono` · `Nimbus Mono` · `Cascadia`.

Banned faces, including every file in `canvas-fonts/` whose name contains `Mono`:
**JetBrains Mono · DM Mono · IBM Plex Mono · Geist Mono · Red Hat Mono · Akkurat Mono**
(iCoMat's — copy their pin ratios and their cool gray, not their type) · **Space Mono ·
Roboto Mono · Fira Code · Source Code Pro · Courier New**.

Also banned as default-AI sans picks: **Inter · Roboto · Poppins · Montserrat · Raleway ·
Open Sans · Lato · Nunito · `system-ui` · `-apple-system`**.

`slides/reference/design/type-scale.json` lists `mono-caption` / `mono-body` / `mono-label`
roles and `spec.md` line 78 says "prefer a grotesque + a mono". **Ignore both.** The
reference's pin ratios, frame counts, burn density, palette, and tracking discipline are
mandatory; its type pairing is not. Reaching for mono to signal "engineering credibility"
is the single most recognisable tell of an AI-generated deck.

Hierarchy comes from **size, weight, tracking, and colour**. Nothing else is needed.

---

## Typography — the system

Two faces, both from Instrument. They are used **semantically**, not decoratively:

> **The serif is the person. The grotesque is the machine.**

| Face | Role | Used on |
|---|---|---|
| **Instrument Serif** Regular | the human voice | slides **1** and **10** only |
| **Instrument Sans** Regular / Bold | everything else | slides 0, 2–9 |

Instrument Serif appears on exactly two slides — the two that name Hasan's grandfather —
and nowhere else. That is the deck's single deliberate risk, and it is spent in one place
per the frontend-design skill's "spend your boldness in one place". Slide 10 reuses slide
1's composition **exactly**: same face, same size, same position. The only thing that has
changed between them is that the audience now knows what the device does.

If either face fails to load, the fallback chain ends in `serif` / `sans-serif` — never in
a named system face, because that is how Inter and `-apple-system` sneak back in.

### Scale — ratios preserved, absolutes scaled for projection

The reference ladder is **12 / 14 / 18 / 28 / 48 px**, ratios `1 : 1.167 : 1.5 : 2.333 : 4`.

Those absolutes are for a website at arm's length. **This deck is projected and read from
the back of a room** — 12 px labels would be invisible, and a deck nobody can read fails
its actual job. So the ratios are preserved exactly and the whole ladder is scaled by a
viewport-derived unit:

```css
--u: calc(100vw / 1920 * 2.25);   /* 2.25 at 1920w; scales with the projector */

--t-micro:   calc(12 * var(--u));   /*  27px @1920 — port labels, source credits */
--t-label:   calc(14 * var(--u));   /*  31px @1920 — ledger labels, eyebrows     */
--t-body:    calc(18 * var(--u));   /*  40px @1920 — the rare full sentence      */
--t-subhead: calc(28 * var(--u));   /*  63px @1920 — secondary statements        */
--t-display: calc(48 * var(--u));   /* 108px @1920 — one number, or one phrase   */
```

**This is a deliberate documented deviation** from `spec.md`'s absolute px, and the only
one in the type system. Ratio fidelity is exact; absolute fidelity would make the deck
unusable. Every other number from `spec.md` is used literally.

### Tracking

Chanel's own tell, per `type-scale.json`: the considered look is the *tracking climb*, not
the font.

| Role | Tracking | Line height |
|---|---|---|
| micro / label (small caps) | `+0.08em` | 1.4 |
| label | `+0.04em` | 1.4 |
| body | `-0.01em` | 1.6 |
| subhead | `-0.015em` | 1.3 |
| display | `-0.02em` | 1.3 |
| hero accent (slide 1 / 10 serif) | `+0.04em` | 1.3 |

Weights: body 400 · label 500 · display 600. Instrument Serif is Regular only — the serif
slides carry their weight through size, not boldness.

### Source credits

Every statistic on a visible surface carries a credit line directly beneath it, at
`--t-micro`, `--muted`, uppercase, tracking `+0.08em`:

```
450,000
ESTIMATED · SENSE · 2022
```

Format: `QUALIFIER · SOURCE · YEAR`. The qualifier is mandatory when the figure is a
model rather than a count — `ESTIMATED` on the Sense number, and it is not optional.

This is citation, not decoration. It costs one line of muted 27 px type and it tells a
judge the team knows the difference between a sourced figure and a remembered one. It also
makes it structurally awkward to put an unsourced number on a slide, which is the point.

### Hardware labels

Port names, part designations, and sensor names use the **grotesque** at `--t-micro`, wide
tracking `+0.08em`, uppercase, colour `--muted`. `P1 BUZZER` · `P2 RANGE` · `P3 BUZZER` ·
`P4 PDM MICROPHONE`. They never switch face to signal "technical".

> **Part-number rule.** The mic callout reads `PDM MICROPHONE` with **no part number**. The
> CAD renders use `AX22-0009`; the hardware in hand is `AX22-0044` (T3902), which has no
> STEP file. Labelling the render with either number would be wrong. Handled by omission.

---

## Colour — four, no exceptions

| Token | Hex | Use | Contrast on bg |
|---|---|---|---|
| `--bg` | `#0A0B0C` | background, every slide | — |
| `--ink` | `#F2F4F5` | primary text, the one number | **17.85:1** |
| `--muted` | `#9AA3A8` | labels, secondary, disqualifiers | **7.67:1** |
| `--accent` | `#CFD9E0` | one element per slide, maximum | **13.75:1** |

All three clear **WCAG AAA (7:1)**. Measured, not asserted — a deck about sensory access
that failed its own contrast check would be an unforced error.

**Never put `--muted` on `--accent`** — that pairing is 1.79:1. The only legal
foreground/background combination is any of the three tones on `--bg`.

Banned outright: gradients · drop shadows · glows · `box-shadow` · `text-shadow` ·
`filter: blur()` · rounded-corner bordered cards · any fifth colour, including pure
`#000` and `#fff`.

Accent budget is **one element per slide**. Slide 6's two numbers count as one element
(they are one statement); if both were accent the slide would have no hierarchy.

---

## CAD render aesthetic

Monochrome, flat-lit, edge-highlighted. "A technical drawing that decided to have a soul."

| Surface | Hex |
|---|---|
| board / PCB | `#1A1A1A` |
| connector bodies | `#2D2D2D` |
| module housings | `#383838` |
| edge / chamfer highlights | `#9AA3A8` |

Three-point lighting, exactly: **key** upper-left, 70 %, 6500 K cool white · **fill**
lower-right, 20 %, very slightly warm · **rim** directly behind, 40 %, coloured `#CFD9E0`.

No texture maps. No product-studio HDRI. No bloom, no depth of field, no bokeh.
Edge highlights come from a Fresnel/facing term, not Freestyle outlines.

**Background deviation, documented.** The brief specifies transparent alpha; the output
format is JPEG, which has no alpha channel. Since the deck background is `#0A0B0C` and the
canvas harness fills `#0A0B0C` before every `drawImage`, rendering onto a solid `#0A0B0C`
world is pixel-identical to flattening alpha onto it. Renders go straight to JPEG.

---

## Motion

Every number below is from `slides/reference/spec.md` and is used **literally**.

| Parameter | Value | Source |
|---|---|---|
| Lenis duration | **1.2** | spec.md Stack |
| Lenis easing | `t => Math.min(1, 1.001 - Math.pow(2, -10*t))` | harness `bootLenis` |
| Scrub lerp | **0.12** | harness `SPEC.scrubLerp` |
| Pin — hero explode | **5:1** | iCoMat accordion, measured exactly 5.0 |
| Pin — orbit | **4:1** | Chanel slideshow sticky |
| Pin — detail | **3:1** | AVATR short beat |
| Frames — explode | **90** | Chanel seq2–4 |
| Frames — orbit | **80** | pin-ratios recommendedForAxiometa |
| Frames — detail | **60** | spec.md beat table |
| Per-frame budget | **≤ 45 KB, target ~30 KB** | Chanel avg 29 KB |
| Active burn density | **~4.2 px/frame** | Chanel drawImage log |
| Hold at beat start | **15 % of scroll** | scroll-frame-map seq3 |
| Hold at beat end | **8 %** | harness `progressToIndex` trail |

**Preload discipline.** Build an `Image[]` array up front and only ever `drawImage(images[i])`.
Never assign `img.src` inside a scroll handler — that is the CSS-Tricks AirPods gotcha and
it produces exactly the stutter this technique exists to avoid.

**Never cross-fade between frames.** `spec.md` "Do not" §1 — it smears.

### Reveals

From the scroll-animations skill's timing table:

| Element | Duration | Trigger | Easing |
|---|---|---|---|
| text reveal | **500 ms** | 20 % visible | `cubic-bezier(0, 0, 0.2, 1)` |
| ledger row stagger | 500 ms, **80 ms** apart | 20 % visible | same |
| statistic count-up | 900 ms | on entry | `ease-out` |
| slide-to-slide tween | **1.2 s** (Lenis) | keypress | Lenis easing |

Never `linear` for anything a human reads. Linear is reserved for the canvas scrub, where
the scroll position *is* the easing.

### Navigation — hybrid, and why

The deck keeps a real scroll runway (so every pin ratio above is literal) but is **driven
by keys**, because it is presented live from a clicker:

| Input | Action |
|---|---|
| `→` `↓` `Space` `PageDown` | `lenis.scrollTo(next slide root)` |
| `←` `↑` `PageUp` | previous slide root |
| `0`–`9` | jump directly to that slide |
| trackpad / wheel | still works, unchanged |

Pressing a key tweens across the section in Lenis's 1.2 s, which burns the beat's frames on
the mandated hold-then-burn curve. The animation *is* the transition.

**`0`–`9` is the demo-recovery path.** After the 90 s live demo, P2 presses `6` and lands
exactly on slide 6. There is no scrolling-by-eye, and hard constraint 6 is met structurally
rather than by hoping.

### Reduced motion

`prefers-reduced-motion: reduce` → Lenis off (native scroll), canvases jump straight to
their final frame, text reveals become instant, count-ups show the final figure. **The deck
remains fully presentable** — reduced motion must never mean missing content. If a borrowed
venue laptop has the OS setting on, the deck still runs.

---

## Layout

12-column grid, `--u`-derived gutters. Every slide is one viewport (`100svh`, not `100vh` —
mobile browser chrome, per the scrollytelling skill).

Composition is **off-centre by default**. The single element sits on a third, not dead
centre; dead-centre single elements are the template answer. Slide 0 has nothing, slides 1
and 10 sit low-left, numbers sit low-left with their label above.

Generous margins: minimum `8vw` horizontal, `10vh` vertical. Nothing touches an edge.
Nothing overlaps. A projector crops more than a browser does.

---

## The signature

Not an effect. **Slides 1 and 10 are the same slide.** Same serif, same words, same
position, same size — the only repeated composition in the deck. Everything between them is
argument; they are the two ends of one sentence, and the audience closes the loop
themselves without being told to.

Supporting it: the serif/grotesque split as semantics rather than decoration. Once a viewer
notices that the human voice is set differently from the machine, every other slide
retroactively reads as deliberate.

---

## Anti-slop checklist

Run before sign-off. Any **yes** is a defect.

- [ ] Any `mono` / `Mono` / `monospace` / `ui-monospace` in CSS, HTML, or a font filename?
- [ ] Any of Inter / Roboto / Poppins / Montserrat / Raleway / `system-ui`?
- [ ] Any fifth colour, including `#000` or `#fff`?
- [ ] Any gradient, shadow, glow, or blur?
- [ ] Any rounded-corner bordered card?
- [ ] More than one accent element on a slide?
- [ ] Any bullet list, disc, or leading dash on a visible surface?
- [ ] Any paragraph of body text on a visible surface?
- [ ] Any animation that does not carry narrative?
- [ ] Any element dead-centred without a reason?
- [ ] Any figure on screen that is not in `slides/research/facts.md` or the plan?
