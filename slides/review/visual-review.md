# Visual review — `slides/deck/`

Adversarial pass. Reviewed 2026-07-19 against `slides/design/system.md` (binding),
`slides/reference/spec.md`, `timing/pin-ratios.json`, `timing/scroll-frame-map.json`,
`reference/catalog.md`.

Method: served `slides/deck/` on 127.0.0.1:8140, drove it in Playwright/Chrome at
1920×1080, 1920×1200 and 1400×1050, screenshotted every slide, stepped both canvas
beats at ten scroll fractions each, sampled the raw renders in
`frames/explode/*.jpg` and `frames/orbit/*.jpg` with numpy, and measured font-face
resolution, computed colour, and scrub timing in-page.

**Verdict up front.** The type system, the palette discipline, and the writing are
genuinely good — slide 3's ledger and slide 9 would not embarrass themselves next to
iCoMat. But the two slides carrying the actual product, 4 and 7, are where the deck
falls to the middle of the pack, and the central technique — the 90-frame scrubbed
explode — does not survive contact with the deck's own presentation mode. Against the
reference set this currently reads as *a very well-typeset deck with two CAD
viewport screenshots in it*, not as a Chanel/iCoMat-class object.

---

## BLOCKER

### 1. The 90-frame explode is effectively unwatchable in the deck's own presentation mode

**Where** `js/main.js:400-411` (`scrollToIndex`) + `js/canvas-sequence.js:232` (Lenis
easing) + slide 4 / slide 7.

**Problem** The deck is driven by keys mapped to `lenis.scrollTo` (accepted). What is
not acceptable is the consequence: the Lenis easing
`t => Math.min(1, 1.001 - Math.pow(2, -10*t))` is violently front-loaded, so a single
`→` press burns the entire 90-frame beat in roughly a third of a second and finishes
scrubbing after the canvas has already left the screen. There is no key that steps
*within* a beat, so while the presenter delivers slide 4's 16 seconds of script the
canvas is frozen on frame 0. The explode then plays as a sub-half-second wipe on the
way out, over the top of slide 5's opening line.

Every number in the pin/hold system is therefore ornamental: 4320 px of runway on
slide 4, a 5:1 pin, a 15 %/8 % hold-then-burn curve, and 3.12 MB of renders resolve,
in the mode the deck is explicitly built for, to a whip-pan nobody can read.

**Evidence** Sampled `window.scrollY` and section progress every ~120 ms immediately
after one `ArrowRight` from slide 4:

```
{'p': 0.647, 'y': 7114}    # ~120 ms
{'p': 0.957, 'y': 8456}    # ~240 ms
{'p': 1,     'y': 9078}    # ~360 ms — sequence already over
{'p': 1,     'y': 9720}    # settles ~1.5 s later
```

87 % of the beat is consumed in the first ~360 ms. With `SPEC.scrubLerp = 0.12`,
`drawIndex` (canvas-sequence.js:185) is still chasing `targetIndex` well after
`p` hits 1, so the tail of the explode is painted onto a canvas that has scrolled
off-screen. The audience sees perhaps 15–25 distinct frames of 90.

**Fix** Give the beats their own transport. Two options, both small:

- Make `→` inside a `.slide--seq` advance to the *next beat checkpoint* rather than
  the next slide root: scroll to `top + runway * k` for k in `0, 0.5, 1` before
  handing off to slide 5. Three presses to cross slide 4, the middle one parking
  mid-explode.
- Or keep one press per slide but pass a much longer, near-linear `duration` for
  seq sections specifically (`duration: 3.5`, `easing: t => t`) so the burn is
  actually legible. `scrollToIndex` already takes per-call options.

Either way, verify by sampling `p` over time as above — the burn should span
≥ 2 s, not 0.36 s.

---

### 2. `--accent` is darker than `--ink` and inverts the hierarchy it exists to create

**Where** `css/deck.css:47-48`, `.statement--accent` (`css/deck.css:204-206`), slide 8.

**Problem** `--accent: #CFD9E0` measures **1.30:1** against `--ink: #F2F4F5` — and it
is the *dimmer* of the two. On slide 8, `system.md` says "line one carries the slide's
one accent, because 'when' is the claim that answers 'so why a detector at all?'".
What renders is the claim line at relative luminance 0.683 and the supporting line at
0.902. The line the design promotes is the line the screen demotes. On a projector,
which crushes the top of the range, 1.30:1 disappears entirely and the two lines read
as identical — or worse, as one line that didn't finish loading.

`system.md` computed accent-on-muted at 1.79:1 and banned that pairing. It never
computed accent-against-ink, which is the pairing the deck actually ships.

**Evidence** Computed style, slide 8:

```json
[{"text":"Detection is when.","color":"rgb(207, 217, 224)"},
 {"text":"Claude is what.",   "color":"rgb(242, 244, 245)"}]
```

Relative luminance: `#F2F4F5` = 0.9021, `#CFD9E0` = 0.6828 → contrast ratio 1.30:1.
Visible in the screenshot: "Detection is when." is plainly greyer than "Claude is
what.".

The same weakness affects slide 5 — accent against muted is 1.79:1 — but there the
`stroke-width: 2` vs `1.25` carries the distinction, so the path still reads. Slide 8
has nothing but colour and therefore fails outright.

**Fix** Stop using accent as *emphasis*; it is a de-emphasis value. Either
(a) swap slide 8 so the accent line is the *second* line and `--ink` carries the claim,
(b) mark the claim with position/size instead of colour, or
(c) accept that the accent's real job is the slide-5 stroke and drop
`.statement--accent` entirely — slide 8 reads perfectly well as two equal lines, which
is arguably the better slide.

---

### 3. Slide 4's callouts land on top of the render on any non-16:9 projector

**Where** `js/canvas-sequence.js:126-129` (`Math.max` cover scaling) + `.callouts`
(`css/deck.css:308-315`, `grid-column: 1 / span 4`).

**Problem** `paint()` scales frames with `Math.max(w/iw, h/ih)` — CSS `cover`. The deck
is 1920×1080-native, so any taller aspect ratio scales the render *up* and crops the
sides, marching the board leftward into the column where the four hardware callouts
live. `.callouts` occupies grid columns 1–4 and the render silhouette already reaches
into column 4 at 16:9; there is no reserved gutter between them.

`system.md` §Layout: "Nothing overlaps. A projector crops more than a browser does."
This is precisely the failure that sentence is warning about.

**Evidence** Measured crop, same page, three viewports:

| Viewport | scale | drawn size | cropped horizontally |
|---|---|---|---|
| 1920×1080 (16:9) | 1.000 | 1920×1080 | 0 px |
| 1920×1200 (16:10 — every MacBook Pro, WUXGA projectors) | 1.111 | 2133×1200 | **213 px** |
| 1400×1050 (4:3 — common venue projector) | 0.972 | 1867×1050 | **467 px (24 %)** |

At 16:9 the object's left silhouette sits at x=400 while `P1 BUZZER` ends near x=310 —
a ~90 px gap and no more. The 4:3 screenshot shows all four labels sitting directly on
the base plate; `P3 BUZZER` and `P4 PDM MICROPHONE` are unreadable against it. At
16:10 the gap has closed to roughly 20 px.

**Fix** Two changes, both needed:

- Switch `paint()` to *contain* (`Math.min(w/iw, h/ih)`) so the product is never
  cropped. The surrounding fill is already `#0A0B0C`, so letterboxing is invisible.
- Reserve the callout column in the render itself: re-frame the Blender camera so the
  assembly occupies roughly x 0.35–0.95 of frame, leaving the left third empty by
  construction rather than by luck.

---

### 4. Slide 6 puts two statistics on screen with no source credit

**Where** `index.html:326-334`.

**Problem** `system.md` §Source credits: "Every statistic on a visible surface carries
a credit line directly beneath it… This is citation, not decoration… It also makes it
structurally awkward to put an unsourced number on a slide, which is the point."
Slide 2 complies (`ESTIMATED · SENSE · 2022`). Slide 3 complies. Slide 6 — `1.4 s` and
`3.8 s`, at 108 px, the two numbers that quantify the team's own product — carries
nothing.

These are the most challengeable figures in the deck. They are means of a measured
range (0.76–2.09 s and 2.4–6.2 s, per the HTML comment at `index.html:320-324`), which
is exactly the kind of derivation the credit line exists to disclose. A judge who has
seen forty decks will ask "measured how, how many runs?" and the slide has pre-emptively
declined to answer while every other slide answered.

**Evidence** `index.html:326-334` contains `.eyebrow` and `.figure` and no `.credit`.
Rendered slide 6 shows two stats with nothing beneath them.

**Fix** Add the credit to both stats, or one shared credit beneath the pair:
`MEAN OF MEASURED RANGE · OWN BENCH · 2026`. The CSS class already exists and the
`.stat` flex column will place it correctly with no layout work.

---

### 5. The CAD renders do not implement the specified lighting rig or material tiers, and their highlights clip to `#FFFFFF`

**Where** `frames/explode/*.jpg`, `frames/orbit/*.jpg`, against `system.md` §CAD render
aesthetic.

**Problem** Three separate failures against a binding spec:

*No three-point rig.* The spec is "key upper-left, 70 %, 6500 K cool white · fill
lower-right, 20 %, very slightly warm · rim directly behind, 40 %, coloured `#CFD9E0`".
The key is roughly present in the explode. The **warm fill does not exist** — the
object is uniformly, marginally *cool* in every frame sampled. The **rim does not exist**
— the silhouette against the background is dark everywhere; there is no cool edge
separating object from field, which is the single thing that would have made these
renders look expensive.

*No material tiers.* The spec names four surfaces: board `#1A1A1A`, connectors
`#2D2D2D`, housings `#383838`, edges `#9AA3A8`. What is actually in the frames is one
albedo shaded into a continuous ramp. The eight most common quantised object greys in
`explode/0001.jpg` are `#1E1E1E #242424 #2A2A2A #303030 #363636 #424242 #484848 #4E4E4E`
— evenly spaced six values apart across a continuum, with no clustering at 26/45/56.
That is the signature of a single grey material, not four.

*Highlights clip to pure white.* Edge highlights are specified at `#9AA3A8` = (154,163,168).
Measured maxima are **(254,255,255)** in `explode/0001.jpg` and **(254,255,255)** in
`orbit/0001.jpg` and `orbit/0040.jpg`. `#FFFFFF` is on the anti-slop checklist as a
banned fifth colour, and here it is, on a visible surface, in the hero asset.

**Evidence** Per-frame numpy sampling:

```
explode/0001.jpg  object mean RGB: R=57.5 G=59.4 B=58.4  (R-B = -0.88)   ← no warm fill
explode/0045.jpg  object mean RGB: R=60.5 G=62.6 B=61.7  (R-B = -1.24)
explode/0090.jpg  object mean RGB: R=59.5 G=61.6 B=60.7  (R-B = -1.18)
orbit/0040.jpg    object mean RGB: R=79.5 G=82.5 B=82.4  (R-B = -2.85)

explode/0001.jpg  pixels >150 lum: 1811 (0.087%)  mean (199,202,202)  max (254,255,255)
explode/0090.jpg  pixels >150 lum:  622 (0.030%)  mean (174,176,175)  max (226,228,227)
```

0.03–0.09 % of the frame above luminance 150 is not an "edge-highlighted" aesthetic;
it is a handful of blown speculars on one part. The bright continuous line along the
middle plate's perimeter reads as a hard outline, not the Fresnel/facing term the spec
requires.

**Fix** Re-render with the rig actually built: add the `#CFD9E0` rim behind the
assembly (this alone transforms the slide), warm the fill a few hundred K, and assign
the four albedos as distinct materials so the PCBs sit visibly darker than the
housings. Clamp specular so nothing exceeds `#9AA3A8`. Budget is not a constraint —
current frames average 35.5 KB against a 45 KB ceiling.

---

### 6. The hero explode is cut off by the frame for 60 of its 90 frames

**Where** `frames/explode/0006.jpg` … `0063.jpg`.

**Problem** The assembly blooms outward past the bottom of the frame through the
entire middle of the sequence and contracts again before the end. Frames 6 through 63
are clipped. At frames 36–41 — the exact midpoint, the most-watched moment — the
object spans y=8 to y=1079 of a 1080-tall frame, touching both edges. The base plate is
sliced off.

`system.md` §Layout: "Generous margins… Nothing touches an edge. A projector crops more
than a browser does." This is the deck's own rule, broken by its own hero asset, for
two-thirds of that asset's duration. Combined with finding 3 the situation compounds:
on a 4:3 projector the mid-explode frames lose 24 % of their width *and* are already
clipped vertically.

**Evidence** Object bounding box per frame:

```
frame   1: top= 209  bottom=1031  height= 822
frame  16: top= 128  bottom=1079  height= 951  <-- CLIPPED
frame  36: top=   8  bottom=1079  height=1071  <-- CLIPPED
frame  41: top=   9  bottom=1079  height=1070  <-- CLIPPED
frame  61: top=  48  bottom=1079  height=1031  <-- CLIPPED
frame  66: top=  65  bottom=1072  height=1007
frame  90: top=  96  bottom=1029  height= 933
```

60 of 90 frames have >50 object pixels in the bottom three rows.

**Fix** Pull the camera back ~15 % or reduce the explode translation so peak extent
fits inside roughly 85 % of frame height. The end state (frame 90, height 933) is
correctly framed — it is the overshoot in the middle that breaks. Re-render and re-run
the bbox check above; no frame should exceed y=1030.

---

## WARNING

### 7. `pxPerFrameActive: 4.2` is dead, and the achieved burn density is ~9× the mandate

**Where** `js/canvas-sequence.js:36`, `progressToIndex` (`:151-167`).

**Problem** `SPEC.pxPerFrameActive = 4.2` is declared and **never referenced by any
code path** — grep the file, it appears once. The density the deck actually produces is
**40.1 px/frame** on slide 4 and **37.2 px/frame** on slide 7.

Root cause is finding 8 below: the hold fraction is wrong, so the burn is spread over
77 % of a 4-viewport runway instead of the ~31 % the reference measured. To hit
4.2 px/frame with 84 playable frames you need ~353 px of burn, not 3326 px.

**Evidence** Measured in-page:

```json
[{"id":"slide-4","frames":90,"runway":4320,"burnPx":3326,"playable":84,"pxPerFrame":40.1},
 {"id":"slide-7","frames":80,"runway":3240,"burnPx":2495,"playable":68,"pxPerFrame":37.2}]
```

Note `spec.md` is internally inconsistent here and the deck inherited the
contradiction: line 64's scaling formula `(pinRatio-1)*vh*0.7/frames` yields ~39 px/frame,
while the same file's verdict table says ~4.2. Worth resolving upstream rather than
silently carrying both numbers.

**Fix** Either delete the constant so the deck stops claiming a number it does not
honour, or — better, and it fixes finding 1 as a side effect — raise the hold fractions
so the burn actually concentrates.

---

### 8. The 15 % / 8 % hold is mis-attributed to a source that measured 69 %

**Where** `system.md` §Motion table, rows "Hold at beat start" and "Hold at beat end";
implemented at `js/canvas-sequence.js:158-162`.

**Problem** `system.md` cites "15 % of scroll — scroll-frame-map seq3" and "8 % —
harness `progressToIndex` trail". The first citation does not hold. `scroll-frame-map.json`
seq3 records `hold: { lenPx: 920 }` inside `scrollPx: 1340` — a **68.7 %** hold,
followed by a 31.3 % burn. The pacing string in that file is explicit: *"HOLD ~0.73vh
on frame 0, then burn 100 frames in ~0.33vh"*. Hold more than twice as long as you burn.

The 15 % figure comes from `spec.md`'s prose "Pacing recipe", not from the measurement.
Per this repo's own precedence rule in `AGENTS.md` — measurement beats restated number
— the measurement should win.

**Evidence** `timing/scroll-frame-map.json:51-53`:

```json
"hold": { "frame": 0, "y0": 6060, "y1": 6980, "lenPx": 920, "lenVh": 0.73 },
"activeBurn": { "y0": 6980, "y1": 7400, "scrollPx": 420, "frames": 100, "pxPerFrame": 4.2 },
```

**Fix** Set `lead ≈ 0.69`, `trail ≈ 0.08`. That reproduces Chanel's actual curve, drops
burn density to ~12 px/frame on slide 4, and means a presenter who *does* scroll gets a
long confident hold on the assembled board before it flies apart — which is also the
better dramatic reading of the slide.

---

### 9. Three of the four documented font weights do not exist; 500 renders as 400 and 600 as 700

**Where** `css/deck.css:16-38` (three `@font-face` rules) vs `system.md` §Tracking
("Weights: body 400 · label 500 · display 600").

**Problem** Only Instrument Sans 400 and 700 are loaded. CSS font matching therefore
resolves every `font-weight: 500` (`.eyebrow`, `.credit`, `.hw-label`, `.diagram-label`)
down to **400**, and every `font-weight: 600` (`.figure`) up to **700**. The label tier
loses its intended weight distinction entirely, and the one number on slide 2 renders a
full step heavier than designed — which is exactly why "450,000" reads as shouty against
an otherwise restrained deck.

Note `document.fonts.check('500 100px "Instrument Sans"')` returns `true`, so this
fails silently.

**Evidence** Rendered text-width probe at 200 px, string `450,000`:

```json
{"sans-400": 795.38, "sans-500": 795.38,   // identical → 500 resolves to 400
 "sans-600": 825.77, "sans-700": 825.77,   // identical → 600 resolves to 700
 "loadedFaces": ["Instrument Sans 400 loaded","Instrument Sans 700 loaded",
                 "Instrument Serif 400 loaded"]}
```

**Fix** Ship `InstrumentSans-Medium.ttf` and `-SemiBold.ttf` (both exist in the
Instrument family, ~68 KB each, and the deck already carries 205 KB of fonts), or
change `system.md` and the CSS to declare the two weights the deck actually has. Do not
leave the document asserting three and the screen showing two.

---

### 10. Slide 4's callouts are wired to the wrong trigger, and the machinery to fix it is already written and unused

**Where** `index.html:190-193` (four `data-reveal` callouts) vs `js/main.js:245-261`
(`makeCalloutDriver`) and `js/main.js:126` (`if (el.hasAttribute("data-seq-at")) return;`).

**Problem** `main.js` contains a purpose-built progress-driven reveal system with a
correct comment explaining exactly why it is needed: *"an overlay inside a sticky
element is 'visible' for the whole pin, so the observer would fire it at the top of the
section rather than at its moment."* Nothing in the deck uses it. The document contains
**zero** `[data-seq-at]` elements, so `makeCalloutDriver` returns `null` for both
sections and is dead code.

The result is the failure the comment predicts: all four hardware labels stagger in
within 240 ms of the section top, over the un-exploded board, then sit static for the
remaining five viewports. They arrive before the parts they name have separated, and by
mid-explode the modules have travelled to the upper half of the frame while the labels
remain parked in the lower left. Against `system.md`'s anti-slop line "Any animation
that does not carry narrative?" this stagger is decoration.

**Evidence** In-page: `document.querySelectorAll('[data-seq-at]').length === 0`.
Screenshot of slide 4 at section progress 0 shows all four labels already revealed.

**Fix** Replace `data-reveal-delay` with `data-seq-at` on the four callouts —
`0.30 / 0.45 / 0.60 / 0.75` — so each label arrives as its module clears the stack. The
consuming code needs no changes.

---

### 11. The four callouts are a list beside a picture, not a callout system — and the catalog names the reference they should have followed

**Where** slide 4, `.callouts`.

**Problem** `P1 BUZZER / P2 RANGE / P3 BUZZER / P4 PDM MICROPHONE` is a left-aligned
vertical stack with no leader rules and no spatial relationship to the four modules.
A viewer cannot determine which module is P1 and which is P3 — and both are buzzers, so
the two labels are indistinguishable from each other in every frame of the sequence.

`catalog.md` Lane B ranks Teenage Engineering Pocket Operators #1 and calls it "the gold
standard for callouts", specifically for placing technical labels *at* the component.
Three more entries in the same catalog (Hanwha "hotspot callouts on assemblies",
ExplodeView "STEP → explode → BOM labels", Framework) do label-to-part association. The
deck adopts none of it. This is the single most template-looking element in the deck and
it is on the product slide.

**Evidence** Screenshots at scroll fractions 0, 0.40 and 1.0: labels static in the
lower-left throughout while the modules translate upward out of the labels' vicinity.

**Fix** Anchor each label to its module with a hairline leader — the deck already owns
this vocabulary in `.ledger-row dd::before` on slide 3, and reusing it would tie the two
slides together. If leaders are too much work in the time available, at minimum drop to
two labels (`RANGE`, `PDM MICROPHONE`) placed adjacent to their modules, and let the
buzzers go unlabelled rather than ambiguously labelled.

---

### 12. Slide 7 is a dead-centred object with no information on it

**Where** slide 7, `index.html:361-368`; `.seq-overlay` intentionally empty.

**Problem** Measured content centre is **(49.9 %, 48.1 %)** — dead centre to within one
percent on both axes, on an otherwise empty black field, with no counterweight and no
label. `system.md`'s own anti-slop checklist asks "Any element dead-centred without a
reason?"; the stated reason ("the canvas is the whole surface") is a description, not a
justification.

Compounding it: the script for this slide says *"Three sensors, one reason each"* and
the screen shows **one** unlabelled grey breakout board. Nothing on screen tells the
audience what they are looking at, how it relates to the three sensors being described,
or which of the four ports it plugs into. Slide 7 is 22 seconds of narration over a
picture of an anonymous PCB.

**Evidence** Content bbox x 513–1405, y 200–839 in 1920×1080. No text nodes in the
section outside the notes block.

**Fix** Cheapest real improvement: give it one `hw-label` naming the part
(`P2 · TIME-OF-FLIGHT RANGE`) placed off-centre, and shift the orbit's framing so the
board sits on a third rather than the centre. If the render can be re-shot, orbit around
an off-centre pivot so the object sweeps through the frame rather than spinning in place.

---

### 13. Six of nine content slides share one composition, which spends the slide-1/slide-10 signature before it can register

**Where** slides 1, 2, 6, 8, 9, 10.

**Problem** `system.md` §The signature claims slides 1 and 10 are "the only repeated
composition in the deck". Measured, they are not: six slides place their content block
against the same left margin (x≈155) with the same baseline (y≈942–962). The 1↔10 rhyme
is real in *words* but invisible as *composition*, because by the time slide 10 arrives
the audience has seen that exact placement five times. The design's stated single
deliberate risk is therefore not perceptible as a risk.

**Evidence** Content bounding boxes, 1920×1080:

```
slide  1: x 155–980   y 858–962   BOTTOM-LEFT
slide  2: x 155–858   y 715–962   BOTTOM-LEFT
slide  6: x 154–1257  y 775–942   BOTTOM-LEFT
slide  8: x 158–1018  y 695–942   BOTTOM-LEFT
slide  9: x 156–1392  y 722–942   BOTTOM-LEFT
slide 10: x 155–980   y 858–962   BOTTOM-LEFT   (pixel-identical to slide 1 ✓)
```

Census: BOTTOM-LEFT ×6, MIDDLE-CENTRE ×2, BOTTOM-CENTRE ×1, MIDDLE-LEFT ×1.

**Fix** Vary the argument slides so the serif slides own the low-left position alone.
Slide 2's single number could sit high-left with the credit hanging beneath; slide 8's
two statements could sit on the upper third. Reserve row 3 / column 1 exclusively for
Hasan's grandfather and the signature starts working.

---

### 14. The renders' background is `#0A0C0B`, not `#0A0B0C`

**Where** every file in `frames/explode/` and `frames/orbit/`.

**Problem** Green and blue channels are transposed relative to `--bg`. The deck
specifies a marginally *cool* near-black; the renders ship a marginally *green* one.
`system.md` §Colour: "four, no exceptions". This is a fifth value, and it is the
full-bleed background of the two most important slides.

In practice it is sub-perceptual (one level in two channels) and `cover` scaling means
there is never a letterbox where the canvas fill `#0A0B0C` meets the frame background,
so nothing is visible today. It becomes visible the moment `paint()` switches to
*contain*, which finding 3 recommends.

**Evidence** All four corners of all five frames sampled return exactly
`(10, 12, 11)`; `--bg` is `(10, 11, 12)`. The consistency across frames rules out JPEG
noise and points at the render world colour.

**Fix** Set the Blender world/film background to `#0A0B0C` and re-render — which is
happening anyway for findings 5 and 6.

---

### 15. The orbit's key light swaps sides mid-sequence

**Where** `frames/orbit/*.jpg`.

**Problem** In every explode frame and in `orbit/0001.jpg` the upper-left quadrant is
brightest, consistent with the specified key. By `orbit/0040.jpg` the brightest quadrant
is upper-**right**, and the object's mean luminance has climbed from 69.9 to 79.5. The
lighting is world-fixed while the camera orbits, so the rig reads as coming from the
opposite side halfway through — and slide 7 ends up lit differently from every other
slide in the deck.

`spec.md` sanctions slow lighting drift ("Chanel ceramic trick"); a full side-swap plus
a 14 % brightness climb is more than drift.

**Evidence** Per-quadrant mean object luminance:

```
orbit/0001.jpg   UL 84.1  UR 74.0  LL 63.6  LR 53.5    ← key upper-left ✓
orbit/0040.jpg   UR 99.8  LR 79.6  UL 78.3  LL 62.6    ← key upper-right ✗
```

**Fix** Parent the three lights to the camera so the rig orbits with it. Standard
product-turntable practice and a one-line change in the Blender scene.

---

### 16. Slide 5 is a generic four-box architecture flowchart, and it runs to within 13 px of its own margins

**Where** slide 5, `index.html:227-274`.

**Problem** Two things. First, the form: four evenly spaced nodes left-to-right joined
by arrows with filled triangular heads is the default architecture diagram, and a judge
who has seen forty decks has seen it forty times. Replacing boxes with underlines is a
good instinct that does not change the underlying shape. The one genuinely interesting
idea — the bypass path that reaches the device without touching the network — is
undersold at 1.79:1 against the other strokes.

Second, the framing: the SVG's outermost rules start at user x=10 and end at x=1210 of a
1220 viewBox, so they render 13 px inside the content box on each side. Every other
slide holds a comfortable margin; this one runs edge to edge, and at 0.69 % ink coverage
it reads as a thin band floating in a large void with the bottom quarter of the slide
empty.

**Evidence** Content bbox x 167–1753 in a 1920 frame with `--margin-x` = 153.6 px, so
13.4 px of clearance. Vertical extent y 329–769 leaves 311 px empty below.

**Fix** Inset the first and last node rules to x=60 and x=1160. Consider dropping the
arrowheads entirely — direction is already implied by reading order, and Chanel/iCoMat
never draw them. If time allows, break the left-to-right row: putting `LOCAL SENSING`
genuinely *outside* the chain rather than below it would make the argument visual rather
than annotated.

---

### 17. Count-up and reveal are out of phase on slide 6

**Where** `js/main.js:122-134` (reveal honours `data-reveal-delay`) and `:179-184`
(count-up does not).

**Problem** `.stat--latency-second` carries `data-reveal-delay="160"`, but the
`[data-count-to]` inside it starts its 900 ms count on the same observer entry with no
delay. The second figure therefore spends the first 160 ms of its count at
`opacity: 0` and becomes visible already ~18 % of the way through, so the two numbers do
not read as a matched pair. The same applies to the `.figure` inside `.stat--scale`.

**Evidence** `runCountUp` is invoked directly from `onEnter(el, () => runCountUp(el))`;
no delay is read.

**Fix** Have `initCountUps` read the nearest ancestor's `data-reveal-delay` and defer by
the same amount.

---

## SUGGESTION

### 18. `.diagram-label` is the one type size not on the ladder

`css/deck.css:349` hardcodes `font-size: 20px` in SVG user units, which renders at
~26.4 px against `--t-micro`'s 27 px. Close enough to look right and not derived from
anything. Every other size in the deck resolves cleanly to
27 / 31.5 / 40.5 / 63 / 108 px — ratios `1 : 1.167 : 1.5 : 2.333 : 4`, exact. Convert
this one to a `--t-micro`-derived value so the ladder is genuinely complete.

### 19. Three different hairline weights, none of them `--hairline`

`.ledger-row dd::before` renders at 1 px (via `--hairline`), `.diagram-rule` /
`.diagram-edge` at 1.65 px (1.25 user units), `.diagram-edge--local` at 2.65 px. The
deck reads as one object partly because of its rule weights; three unrelated values
undercuts that. Drive the SVG strokes from the same token.

### 20. Credit-line format differs between slides 2 and 3

Slide 2 is `ESTIMATED · SENSE · 2022` — the documented `QUALIFIER · SOURCE · YEAR`.
Slide 3 is `GUIDE DOGS 2026 · NUBSLI APR 2026` — two `SOURCE YEAR` pairs, where the
same `·` separator now means something different. Slide 3's £102,000 is also a modelled
lifetime cost and arguably wants the `ESTIMATED` qualifier the system calls mandatory
for models.

### 21. Slide 9's line break orphans "this"

The mandatory sentence wraps as "We have not validated this / with DeafBlind users."
On the deck's most important slide the break lands mid-clause. A `<br>` after
"validated" — or narrowing `.statement-block` from `span 10` to `span 8` — gives
"We have not validated / this with DeafBlind users."

### 22. The count-up jitters horizontally

`450,000` counts from `0` through varying digit counts in a proportional face. Left
alignment keeps the left edge stable so it is not offensive, but the comma appearing
mid-count is visible. `font-variant-numeric: tabular-nums` on `.figure` fixes it and is
**not** a mono violation — `system.md` bans reaching for a mono *face* to get tabular
figures, not the OpenType feature on the grotesque.

### 23. Sequences preload strictly in series

`startSequences` (`js/main.js:319-340`) chains with `.then`, so slide 7's 80 frames do
not begin loading until slide 4's 90 have all resolved, and slide 7's scroll listener is
not bound until then. Locally this is milliseconds; from a venue's file share or a cold
cache it means slide 7 can be scrolled past before it is live. Consider starting both
preloads concurrently and only ordering the *binding*.

---

## Anti-slop checklist — `system.md`, every line answered

| Check | Answer |
|---|---|
| Any `mono` / `Mono` / `monospace` / `ui-monospace` in CSS, HTML, or a font filename? | **No.** Zero hits across `css/deck.css`, `index.html`, `js/main.js`, `js/canvas-sequence.js`, and `fonts/` (which contains only `InstrumentSans-Regular.ttf`, `-Bold.ttf`, `InstrumentSerif-Regular.ttf`, `InstrumentSans-OFL.txt`). Vendored `lenis.min.js` also clean. Every banned face name checked individually. **Clean.** |
| Any of Inter / Roboto / Poppins / Montserrat / Raleway / `system-ui`? | **No.** Both fallback chains end in the generic `sans-serif` / `serif` as required. |
| Any fifth colour, including `#000` or `#fff`? | **Yes — twice.** `#FFFFFF` blown highlights in the CAD renders (finding 5) and `#0A0C0B` as the render background (finding 14). The CSS itself is exactly four values; the single `#000` in source is inside a comment at `canvas-sequence.js:119` and is not a rendered value. |
| Any gradient, shadow, glow, or blur? | **No.** No `box-shadow`, `text-shadow`, `filter`, `blur()`, or `gradient` anywhere in the deck's CSS. |
| Any rounded-corner bordered card? | **No.** No `border-radius` in the deck at all. |
| More than one accent element on a slide? | **Borderline.** Slide 5 carries `--accent` on three DOM nodes (`.diagram-rule--local`, `.diagram-edge--local`, `.diagram-arrow--local`) which together form one visual path — defensible as one element. Slide 8 is one. No slide exceeds the budget in spirit. Separately, `--accent` appears on only two of eleven slides, and on slide 8 it does not function as an accent at all (finding 2). |
| Any bullet list, disc, or leading dash on a visible surface? | **No.** Slide 3 is a proper `<dl>` with the leader as `dd::before`, no markers. Slide 4's callouts are `<span>`s with no markers — but they *read* as a list (finding 11). |
| Any paragraph of body text on a visible surface? | **No.** The longest visible string is slide 9's single sentence. All prose lives in `<script type="text/plain">` notes. |
| Any animation that does not carry narrative? | **Yes.** Slide 4's four-callout 0/80/160/240 ms stagger fires at the top of a five-viewport pin, before the parts it names have moved, and carries no narrative (finding 10). |
| Any element dead-centred without a reason? | **Yes.** Slide 7's orbit sits at (49.9 %, 48.1 %) on an otherwise empty field with no counterweight and no label (finding 12). |
| Any figure on screen that is not in `facts.md` or the plan? | **No** — but slide 6's two figures are on screen *without their source*, which the same document makes mandatory (finding 4). |

---

## Numbers verified against the code (not the docs)

| Parameter | Required | Actual | |
|---|---|---|---|
| Lenis `duration` | 1.2 | `1.2` — `canvas-sequence.js:231` | ✓ |
| Lenis easing | `t => Math.min(1, 1.001 - 2**(-10t))` | identical — `:232` | ✓ |
| `SPEC.scrubLerp` | 0.12 | `0.12`, used at `:185` | ✓ |
| `SPEC.framesPerBeat` | 90 | `90` — `:34` | ✓ |
| `SPEC.pxPerFrameActive` | 4.2 | `4.2` declared — **never referenced**; achieved 40.1 / 37.2 | ✗ finding 7 |
| `SPEC.maxDpr` | 2 | `2`, used at `:105` | ✓ |
| Pin, slide 4 | 5:1 | `data-pin="5"` → `height: 500vh`, measured 5.00 | ✓ |
| Pin, slide 7 | 4:1 | `data-pin="4"` → `height: 400vh`, measured 4.00 | ✓ |
| Frames, explode | 90 | 90 files, `0001`–`0090` | ✓ |
| Frames, orbit | 80 | 80 files, `0001`–`0080` | ✓ |
| Hold lead / trail | 15 % / 8 % | `lead = 0.15`, `trail = 0.08` — `:158-162` | implemented, but mis-sourced — finding 8 |
| Frame budget | ≤ 45 KB, target ~30 KB | explode max 39.7 KB / mean 35.5 KB; orbit max 39.7 KB / mean 31.5 KB; **0 frames over 45 KB** | ✓ |
| Payload per beat | 2.0–3.3 MB | explode 3.12 MB, orbit 2.46 MB | ✓ |
| Page length | 16–21 viewports | 18.0 | ✓ |
| `Image[]` preload up front | required | `preload()` builds `new Image()` × N — `:133-148` | ✓ |
| `img.src` inside scroll handler | forbidden | never — only assignment is `:139` inside `preload()` | ✓ |
| Cross-fade between frames | forbidden | one `drawImage` per `paint()` — `:129` | ✓ |
| Type ladder ratios | 1 : 1.167 : 1.5 : 2.333 : 4 | 27 / 31.5 / 40.5 / 63 / 108 px — exact | ✓ (one exception, finding 18) |
| Console errors | — | one, `GET /favicon.ico 404`. Not a deck defect. | ✓ |

---

## Where it stands against the reference set

**Holds up.** Slide 3 is the best thing here — the ledger with hairline leaders, the
subject/qualifier weight split, the flush right edge with ragged leaders is genuinely
iCoMat-adjacent and does not read as a bullet list. Slide 9 is excellent: one sentence,
no ornament, correct restraint on the deck's most difficult claim. Slide 0 being
literally empty is a real decision and it will land. The serif on slides 1 and 10 is
well chosen and well set. The type ladder is exact, the contrast work is real, and
there is not one pixel of mono anywhere — which is more discipline than most of the
forty decks will show.

**Falls short.** Slides 4, 5 and 7 — the three slides that carry the product — are the
weak ones, and they are the ones judges will look at hardest. Slide 7 is an unlabelled
grey PCB dead-centre on black; nothing about it says a person designed this frame.
Slide 4 has the right idea and the wrong execution: the renders are flatly lit, the
material tiers named in the spec are simply not present, the assembly is cut off by the
frame for two-thirds of the animation, and the callouts are a list in a corner rather
than the Teenage Engineering labelling the catalog explicitly points at. Slide 5 is a
four-box flowchart. And the technique the whole deck is built around — the scrubbed
sequence — is invisible in practice because one keypress burns it in a third of a second.

**The gap is not taste, it is finish.** Nothing here needs a redesign. Findings 1, 3, 5
and 6 are the four that separate this from the reference set, and all four are
mechanical: a scroll-transport change, a `Math.max` → `Math.min`, a lighting rig, and a
camera pull-back. Fix those and slides 4 and 7 stop looking like CAD viewport captures
and start looking like the rest of the deck.
