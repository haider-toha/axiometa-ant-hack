# Anti-slop review — `slides/deck/`

Reviewed 2026-07-19 against `slides/design/system.md`.

Files read line by line: `slides/deck/index.html` (489 lines, all 11 `<script type="text/plain" class="notes">`
blocks), `slides/deck/css/deck.css` (449 lines, every declaration), `slides/narrative/script.md`,
`slides/design/system.md`. Cross-checked against `slides/design/dom-contract.md`,
`slides/deck/js/main.js`, `slides/deck/js/canvas-sequence.js`, `slides/research/facts.md`,
`plan/2026-07-18-bus-stop-situational-awareness.md`, and the shipped font binaries.

Known-and-accepted items (empty `frames/detail/`, empty slide 0, slides 1 and 10 identical) are not
reported.

---

## Sections that are clean

I looked hard at each of these and found nothing. Stated explicitly so the clean result is on the
record rather than inferred from silence.

**Monospace — clean.** Zero hits for `mono`, `Mono`, `monospace`, `ui-monospace`, `SFMono`, `Menlo`,
`Monaco`, `Consolas`, `Courier`, `Cascadia`, `JetBrains`, `Geist`, `IBM Plex`, `Red Hat`, `Space
Mono`, `Fira`, `Source Code` across `deck/`, including JS and font filenames. No `tabular-nums`, no
`font-variant-numeric` anywhere. The three shipped faces are `InstrumentSans-Regular.ttf`,
`InstrumentSans-Bold.ttf`, `InstrumentSerif-Regular.ttf`. The one place a mono would have been
reached for by reflex — the slide-4 port callouts `P1 BUZZER` / `P2 RANGE` / `P3 BUZZER` /
`P4 PDM MICROPHONE` — correctly uses the grotesque at `--t-micro` with `+0.08em`. This is the single
biggest thing the deck gets right.

**Banned words — clean.** Zero occurrences of any of the 21 banned words in visible copy or spoken
lines. The only hits are `narrative/script.md:316-319`, which is the banned-word checklist listing
them, and CSS `transform:` / `text-transform:` properties. Second-tier sweep (delve, tapestry,
landscape, realm, testament, crucial, pivotal, meticulous, elevate, streamline, foster, showcase,
harness, bespoke, curated, effortless, impactful, paradigm, world-class, end-to-end, frictionless,
"it's not just X", "imagine a world", "under the hood", "deep dive") returns one hit only, reported
as WARNING 11.

**Colour — clean.** Exactly four hex values in the entire CSS: `#0A0B0C`, `#F2F4F5`, `#9AA3A8`,
`#CFD9E0`. No `rgb()`, no `hsl()`, no `color-mix()`, no named colours. `#000` appears once, at
`deck/js/canvas-sequence.js:119`, inside a comment explaining why it is being avoided —
`"an alpha:false canvas rests on #000, which is not in the palette"` — followed by
`ctx.fillStyle = "#0A0B0C"`. That is the correct handling, not a violation.

**Gradients / shadows / glows / blurs / radius — clean.** Zero hits for `gradient`, `box-shadow`,
`text-shadow`, `drop-shadow`, `filter:`, `backdrop-filter`, `border-radius`, `blur(`. No card-like
object exists in the CSS at all; slide 5's nodes are baseline rules, which
`deck.css:337-339` justifies in the right terms.

**AI-default sans faces — clean.** Zero hits for Inter, Roboto, Poppins, Montserrat, Raleway, Open
Sans, Lato, Nunito, `system-ui`, `-apple-system`, Helvetica, Arial, Segoe. Both fallback chains end
in a generic family (`deck.css:61-62`), exactly as `system.md:52-53` requires.

**Bullets, discs, leading dashes — clean.** No `<ul>`, `<ol>`, `<li>`, `list-style`, `::marker`, or
dash/bullet glyph in any `content:` value. The slide-3 ledger is a real `<dl>` and its leader is
`.ledger-row dd::before { content: ""; height: var(--hairline); background-color: var(--muted); }`
(`deck.css:296-303`) — a drawn rule, not a typed character. This is the correct implementation and
it survives the ledger exemption on its own merits.

**Paragraphs of body text on visible surfaces — clean.** All 32 rendered strings extracted and
counted. The longest is `We have not validated this with DeafBlind users.` at 8 words. Nothing
approaches a paragraph.

**Animation — clean.** Every animation in `main.js` carries narrative: reveal at 20% visible, ledger
stagger 80 ms, count-up 900 ms ease-out, diagram edges drawn by `getTotalLength()` with the local
sensing path last. No decorative motion, no parallax-for-its-own-sake, no hover flourishes.
`linear` appears nowhere, per `main.js:12-13`. Reduced-motion is handled in both layers and never
withholds content.

**Frame budgets — clean.** `explode/` 90 frames, `orbit/` 80, `detail/` 60 — matching `system.md`
Motion exactly. Averages 37 / 33 / 38 KB, all inside the ≤45 KB budget.

**Vague quantities — clean.** No "millions of people", "many", "a lot", "countless". Every quantity
on a visible surface is a specific figure, and all four trace to `research/facts.md` (450,000 →
`facts.md:33`; 610,000 → `:34`; £102,000 → `:62`; £275–£375 → `:65`; 1.4 s / 3.8 s → plan latency
table). No figure is fabricated. Sourcing *placement* is a separate defect, reported as BLOCKER 2
and WARNING 7.

---

## BLOCKER

### 1. Slide 7 says "three sensors", names two, then says "both" — and contradicts slide 4

**Where:** `slides/deck/index.html:373-376`; same text at `slides/narrative/script.md:185-188`.
Contradicts `slides/deck/index.html:203`.

**Problem:** The deck counts its own hardware two different ways, four lines apart, out loud, in
front of judges.

**Evidence:**

Slide 4 (`index.html:203`):

> `[P2] A range sensor. A microphone. Two output channels.`

Two sensors on the board. Then slide 7 (`index.html:373-376`):

> `[P3] Three sensors, one reason each.   [CUTTABLE if running long]`
> `[P3] Range sensor: forward clearance while you're walking.`
> `[P3] Microphone: sirens, detected on the board itself with an FFT.`
> `[P3] Both of those are local. No wifi in either path.`

"Three sensors, one reason each" promises three reasons and delivers two. The next line but one says
`Both of those` — which counts two. The sentence audits itself as wrong inside three lines.

The number is not invented: `plan/…:7` says *"Three sensor inputs and two simulated output
channels"*, counting the phone camera as the third. But slide 7 is a CAD orbit **of the board**, the
two named sensors are **the board's**, and the camera is neither local nor on the device — so
`Both of those are local` is the line that is actually correct, and `Three sensors` is the line that
is wrong in this context. An audience that has just been told the board has a range sensor and a
microphone hears a miscount.

That the line is tagged `[CUTTABLE if running long]` is telling: the deck's own author marked the
broken sentence as the first thing to throw away.

**Fix:** Delete the line. It carries no information the following two lines don't. If a count is
wanted, `[P3] Two sensors on the board, one reason each.` is true, matches slide 4, and matches
`Both of those`.

---

### 2. Slide 6's two figures carry no source credit — the deck breaks its own mandatory rule on its own least verifiable numbers

**Where:** `slides/deck/index.html:327-334`. Rule at `slides/design/system.md:95-110`.

**Problem:** `system.md` makes source credits mandatory and explains that the point of the rule is to
make an unsourced number structurally awkward. Slide 6 is the one slide that skips it — and it skips
it on the two numbers a judge cannot check, because they are the team's own measurements rather than
a published figure.

**Evidence:** The rule (`system.md:95-110`):

> `### Source credits`
> `Every statistic on a visible surface carries a credit line directly beneath it, at`
> `--t-micro, --muted, uppercase, tracking +0.08em`
> …
> `It also makes it structurally awkward to put an unsourced number on a slide, which is the point.`

Slide 6 as built (`index.html:327-334`):

```
<div class="stat stat--latency-first" data-reveal data-reveal-delay="0">
  <p class="eyebrow">Bus to first signal</p>
  <p class="figure"><span data-count-to="1.4" data-count-format="dec1">1.4</span> <span class="figure-unit">s</span></p>
</div>
```

No `.credit` element. Same for `stat--latency-second`. Compare slide 2 (`index.html:79-83`), which
does it correctly with `<p class="credit">Estimated · Sense · 2022</p>`.

The irony is sharp and a judge will find it: the deck credits Sense for a figure anyone can look up,
and credits nothing for the figure that only this team can vouch for. The numbers are legitimate —
plan latency table, `0.76–2.09 s mean 1.38` and `2.4–6.2 s mean 3.8` — but the audience is given no
way to know they are measured rather than hoped, and the presenter note at `index.html:344-346`
correctly worries about exactly this while the slide surface stays silent.

**Fix:** Add a credit under each figure, or one under the pair, in the documented
`QUALIFIER · SOURCE · YEAR` shape. `MEASURED · MEAN OF 12-HOP BUDGET · 2026` is honest, fits
`--t-micro`, and turns the slide's weakest moment into its second-strongest.

---

### 3. The demo contingency line blames the network for failures that cannot be the network — and slide 7 then contradicts it two slides later

**Where:** `slides/deck/index.html:309-315`; same at `slides/narrative/script.md:152-159`. Contradicted
by `slides/deck/index.html:376-377`.

**Problem:** The fallback line is scoped to *any* demo failure, but the first two demo steps have no
network in them at all. If those are what fail, the line is false — and it destroys the deck's single
strongest technical claim, which is delivered two slides later.

**Evidence:** The contingency, scoped to everything (`index.html:309-311`):

> `DEMO CONTINGENCY — if the pipeline fails at any point, say this and press 6:`
> `[P2] That's a live network at a hackathon. The numbers are the same either way.`

The locked demo order (`index.html:294-299`):

> `1. Start in MOVING. Show the range sensor finding an obstacle — pulse cadence slows as the path clears.`
> `2. Show the siren detection.`
> `3. Switch to STILL.`
> `4. Only then raise the bus prop. BUS, then WAIT, then NUMBER 88.`

Steps 1 and 2 are the ToF reflex and the on-board FFT. `plan/…:101` — *"The ToF → output reflex and
siren → output reflex are fully local. No network in either path."* Then slide 7 (`index.html:376-377`):

> `[P3] Both of those are local. No wifi in either path.`
> `[P3] If the network dies mid-street, the safety sensing doesn't.`

So the failure mode is: the buzzer stays silent on the ToF step, P2 says "that's a live network at a
hackathon", and ninety seconds later P3 tells the same room that the network cannot affect that path.
The audience has just watched the counter-example. This is worse than having no contingency line,
because it converts a hardware hiccup into a caught contradiction on the deck's load-bearing claim.

**Fix:** Split the contingency by step. Local failure (steps 1–2) needs its own line that does not
mention the network — e.g. `[P2] That one's on the bench, not the network. Moving on.` Keep the
existing line for steps 3–4 only, where it is true. Change `if the pipeline fails at any point` to
`if the camera pipeline fails`.

---

### 4. The weight ladder in `system.md` cannot render — 500 resolves to 400 and 600 resolves to 700

**Where:** `slides/deck/css/deck.css:150, 161, 173, 183, 350` against `deck.css:16-38` and the shipped
font binaries. Spec at `slides/design/system.md:92-93`.

**Problem:** `system.md` declares a three-step weight ladder and names weight as one of the four
levers the whole hierarchy rests on. Only two of the three steps exist as files, so two of the five
weight declarations in the CSS silently render as something else. One of them renders as the exact
Bold the CSS comment argues against.

**Evidence:** The spec (`system.md:92-93`):

> `Weights: body 400 · label 500 · display 600.`

and (`system.md:31`):

> `Hierarchy comes from **size, weight, tracking, and colour**. Nothing else is needed.`

The shipped faces, read from the binaries — no `fvar` table in any of the three, so all static, no
weight axis:

```
InstrumentSans-Bold.ttf       usWeightClass = 700   (fvar: absent)
InstrumentSans-Regular.ttf    usWeightClass = 400   (fvar: absent)
InstrumentSerif-Regular.ttf   usWeightClass = 400   (fvar: absent)
```

`@font-face` registers exactly 400 and 700 (`deck.css:19, 27, 35`). Under CSS Fonts L4 weight
matching:

- `font-weight: 500` → target is in [400,500], so weights ≥ target up to 500 are checked (none
  available), then weights below target descending → **400**. Affects `.eyebrow` (`:150`),
  `.hw-label` (`:161`), `.credit` (`:173`), `.diagram-label` (`:350`).
- `font-weight: 600` → target > 500, so weights ≥ target ascending → **700**. Affects `.figure`
  (`:183`). No synthetic bolding, because a real bolder face exists.

So every label in the deck renders at Regular, identical in weight to body — the "label 500" step
does not exist. And `450,000`, `1.4` and `3.8` render in real Instrument Sans **Bold**.

That second one matters because the CSS reasons explicitly about avoiding it, four lines below the
declaration that causes it (`deck.css:193-195`):

> `/* One short sentence, at display size. Weight stays at 400: the display-600`
> `   weight in system.md is for figures; a sentence set in Bold at 108px shouts,`
> `   and slides 8 and 9 are the two slides that must not. */`

The comment distinguishes "display 600" from "Bold". In the shipped build they are the same file.
The distinction the comment is built on does not exist, which is the signature of a spec written
without being rendered.

**Fix:** Either ship the Instrument Sans variable font and declare `font-weight: 400 700` on a single
`@font-face`, which makes 500 and 600 real; or change the CSS to the weights that exist (labels 400,
figures 700) and correct `system.md:92-93` to say `body 400 · label 400 · display 700`. Do not leave
a spec asserting a ladder the deck cannot climb.

---

### 5. Two canonical spoken scripts exist, and they have already drifted

**Where:** `slides/narrative/script.md` vs. the 11 `<script type="text/plain" class="notes">` blocks
in `slides/deck/index.html`.

**Problem:** The same 57 spoken lines are maintained in two files with no stated source of truth.
They are already out of sync. Three presenters rehearsing from different files is how a live pitch
stumbles, and this is the only defect in the review that gets worse with every future edit.

**Evidence:** Diffing the 57 `[P#]` lines from each file, the spoken copy has already diverged:

`script.md:80`:

> `[P2] An interpreter is three hundred pounds a day, booked ahead.`

`index.html:151`:

> `[P2] An interpreter is around three hundred pounds a day, booked ahead.`

The word `around` was added on one side only — and the declared word count in the same block was not
updated (`index.html:147` still says `48 words`; the lines now total 50).

The supporting notes have drifted further. `script.md:231` still uses an internal audit task ID:

> `> "Can be heard, cannot be felt" is passive on purpose — it is T5's own claim-boundary phrasing.`

`index.html:443-444` has already been repaired to:

> `NOTE: "Can be heard, cannot be felt" is passive on purpose — it is the`
> `claim-boundary phrasing from the bench observation.`

So `index.html` is ahead in one place and behind in another. Same for the demo cue
(`script.md:145` *"when the tones fire"* vs `index.html:301` *"the first time a tone sounds — not at
the end"*), the cuttable notation (`← *cuttable if running long*` vs `[CUTTABLE if running long]`),
and a slide-7 note present only in `index.html:384`.

**Fix:** Declare one file canonical in `system.md` and make the other generated or a pointer. If
`index.html` wins — correct, since it is what runs in the room — reduce `script.md` to the word
ledger and the anticipated-questions section, which are the only parts not duplicated.

---

## WARNING

### 1. "Em dashes: one" is false as written — there are 43 in the file that says it

**Where:** `slides/narrative/script.md:321`.

**Problem:** The self-audit claim is unscoped, so it reads as a claim about the document, and as a
claim about the document it is wrong by a factor of 43. This is checklist theatre in a deck whose
entire pitch is that its numbers hold up, and it takes one grep to puncture.

**Evidence:**

> `Em dashes: **one**, in slide 1, marking an appositive. Rhythmic, not decorative.`

Actual counts: **43** in `script.md`, **26** in `index.html`.

The claim is true under exactly one reading — spoken `[P#]` lines only — and under that reading it is
precisely right:

```
script.md   spoken lines with —:  34:[P1] He's DeafBlind — no useful sight, no useful hearing.   (1 of 57)
index.html  spoken lines with —:  56:[P1] He's DeafBlind — no useful sight, no useful hearing.   (1 of 57)
```

The em dash itself is fine: one appositive, rhythmic, correctly placed, and the remaining 42 are
headings (`## 3 — Why the existing tools…`) and note prose, none decorative. The defect is the
unqualified claim, not the punctuation.

**Fix:** `Em dashes in spoken lines: one — slide 1, an appositive. Note prose and headings are not
counted.`

### 2. "Every line is under 15 words" is false — the one mandatory line is 16

**Where:** `slides/narrative/script.md:4`; the offending line at `script.md:147` and
`slides/deck/index.html:304`.

**Problem:** The claim fails on exactly one line, and it is the single line the deck marks as
non-optional.

**Evidence:** The claim:

> `Every line is under 15 words. Nothing here appears on a slide surface — these are presenter notes only.`

Counted every one of the 57 spoken lines. Fifty-six pass. One does not:

> `[P2] These two tones stand in for two vibration channels. The buzzers can be heard, not felt.`

Sixteen words — the longest spoken line in the deck, and the one at `script.md:145` labelled
**"The one line that must be said during the demo"**, delivered live while a buzzer is sounding and
attention is on the hardware.

Second-longest for context: `That lands in a relay. The wrist device polls it, three times a second.`
(14, `index.html:282`) and the contingency line (14, `index.html:311`).

**Fix:** It is already two sentences; give the presenter permission to breathe between them, or cut
to `These two tones stand in for two vibration channels. Heard, not felt.` (13). Then the claim is
true and the hardest line to deliver becomes the shortest.

### 3. "nine minutes of argument ago" — the deck runs 5 minutes 1 second

**Where:** `slides/deck/index.html:476-477` and `slides/narrative/script.md:252-253`.

**Problem:** A duration stated in the notes that is nearly double the deck's own summed budget. In a
deck that gets £102,000, £275–£375, 450,000, 1.4 s and 3.8 s all exactly right, this is the one
number nobody added up — and it is the deck's own runtime.

**Evidence:**

> `The slide is already the same image the audience saw nine minutes of`
> `argument ago, and the only thing that changed is that they now know what the`
> `device does.`

Summing every `· N s ·` budget in `index.html`: slides total **211 s**, plus the **90 s** demo =
**301 s = 5 min 01 s**. Measured slide 1 → slide 10 specifically: 301 − 18 (slide 0) − 10
(slide 10) = **273 s = 4 min 33 s**.

"Nine minutes" is wrong under either measure. It stays in the notes so it will not be said aloud —
but a presenter riffing off their own note may repeat it, and a five-minute pitch described as nine
minutes reads as a deck that has never been timed.

**Fix:** `four and a half minutes of argument ago`, in both files.

### 4. Slide 9's note calls it "thirty seconds"; the slide is budgeted 18 s

**Where:** `slides/deck/index.html:432` vs `:452-453`; same at `script.md:218` vs `:239-240`.

**Problem:** Two different durations for the same slide, 21 lines apart in one notes block.

**Evidence:** The block header (`index.html:432`):

> `P3 · 18 s · 48 words`

and its closing note (`index.html:452-453`):

> `NOTE: Deliver this without apology and without a rueful smile. It is the most`
> `credible thirty seconds in the deck.`

At the stated 130 wpm, 48 words is 22 s, so 18 s is already tight; 30 s is a different slide. If the
presenter believes they have thirty seconds here, the deck runs long and the demo budget is what
gives.

**Fix:** Either say "the most credible moment in the deck" and drop the duration, or reconcile the
budget upward — slide 9 is the one place worth the extra ten seconds.

### 5. "It's 7:42 in the morning" — invented precision opening a deck that insists nothing is invented

**Where:** `slides/deck/index.html:29`, `slides/narrative/script.md:17`.

**Problem:** The deck's first spoken sentence is a fabricated-sounding specific, and its fourth
spoken sentence is a promise that nothing here is fabricated. Fake-precise timestamps are one of the
most recognisable tells in AI-assisted narrative copy, and this one is not in `facts.md`.

**Evidence:** First line of the deck (`index.html:29`):

> `[P1] It's 7:42 in the morning, at a bus stop in south London.`

Grepped `research/facts.md` for `7:42`, `7.42`, `seven forty` — **no match**. Every other figure the
deck speaks traces to `facts.md`; this one does not.

Nineteen lines later (`index.html:57`):

> `[P1] He isn't a persona we invented for a pitch.`

If 7:42 is Hasan's grandfather's actual bus time, it is the best detail in the deck and should be in
`facts.md` beside the rest. If it was chosen because 7:42 sounds more real than 7:40, it is the exact
move the next slide disavows, and it is placed where a sceptical judge forms their first impression.

**Fix:** Source it into `facts.md`, or drop to `It's early morning, at a bus stop in south London.`
The line loses nothing — the specificity that earns the deck its credibility is `Hasan's
grandfather`, not the clock.

### 6. "better than YOLO ever could" — an unsourced comparative superlative in a deck that sources everything

**Where:** `slides/deck/index.html:404`, `slides/narrative/script.md:202`.

**Problem:** The deck refuses to say "there are 450,000" without a citation chain, then makes an
unbounded model-comparison claim with no measurement behind it. It is also the one line where the
deck sounds like a product pitch rather than an engineering account.

**Evidence:**

> `[P3] Claude reads a bus number better than YOLO ever could.`

`ever could` is not a measured claim — it is a claim about all possible YOLO configurations. Nothing
in `facts.md` or the plan benchmarks the two on route-number OCR. Compare the discipline three lines
down, where the same slide makes its real argument and makes it precisely:

> `[P3] The Claude API is stateless. Modal isn't.`

That line is checkable, load-bearing and unattackable. The YOLO line is none of the three and it is
the first thing a judge who has trained a detector will push on.

**Fix:** `[P3] Claude reads the number off the front. YOLO tells us when to ask.` Same setup, no
superlative, and it lands the `when` / `what` split the slide is actually built on.

### 7. Slide 3's credit breaks the documented format and does not sit beneath its figures

**Where:** `slides/deck/index.html:142`. Format spec at `slides/design/system.md:105-106`.

**Problem:** The documented credit shape is `QUALIFIER · SOURCE · YEAR` and the qualifier is called
mandatory. Slide 3 ships `SOURCE YEAR · SOURCE YEAR`, with no qualifier, placed under the whole
block rather than under either figure.

**Evidence:** The rule (`system.md:105-106`):

> `Format: QUALIFIER · SOURCE · YEAR. The qualifier is mandatory when the figure is a`
> `model rather than a count`

and `system.md:97-98`: *"carries a credit line **directly beneath it**"*.

As built (`index.html:142`):

```
<p class="credit" data-reveal data-reveal-delay="320">Guide Dogs 2026 · NUBSLI Apr 2026</p>
```

Two sources compressed into one line, no qualifier field, and `.ledger-block` (`deck.css:254-261`)
places it under all four rows — so neither `£102,000` nor `£275–£375` has a credit directly beneath
it. Slide 2 (`index.html:82`) shows the correct shape: `Estimated · Sense · 2022`.

Both figures also want a qualifier that is currently missing. Per `facts.md:62`, £102,000 is a
*lifetime* cost on a page current 2026 citing end-2024 data. Per `facts.md:65`, £275–£375 is a
*median full-day range across regions*, not a single rate.

**Fix:** Move each credit under its own row, or set the shared line as
`LIFETIME · GUIDE DOGS · 2026   ·   MEDIAN DAY · NUBSLI · APR 2026`. The deck's own rule is right;
this is the one slide that does not follow it.

### 8. "Sense estimates 450,000" drops the "over" that `facts.md` sanctions

**Where:** `slides/deck/index.html:88`, `script.md:51`, and the slide surface at `index.html:81`.

**Problem:** `facts.md` writes the approved sentence out in full and the deck delivers it one word
short — turning a floor into a point estimate.

**Evidence:** `facts.md:226` gives the sanctioned phrasing:

> `✅ "Sense estimates over 450,000 people in the UK are deafblind, rising to over 610,000 by 2035."`

The deck says (`index.html:88`):

> `[P1] Sense estimates 450,000 deafblind people in the UK. Over 610,000 by 2035.`

`over` survives on the 2035 projection and is dropped on the headline figure, which is inconsistent
within a single sentence. The source (`facts.md:33`) is explicit: *"there are over 450,000 people in
the UK who are deafblind."*

The `ESTIMATED` credit correctly handles model-vs-count, but not floor-vs-point. On screen,
`450,000` under the eyebrow `People in the UK who are deafblind`, counting up to a precise-looking
number, reads as a census result.

**Fix:** `Sense estimates over 450,000 deafblind people in the UK.` One word, and it costs nothing.

### 9. The presenter notes are written to be audited, not performed

**Where:** throughout the `.notes` blocks; worst at `slides/deck/index.html:207, 294, 411-414` and
`slides/narrative/script.md:231, 235`.

**Problem:** The brief for this review asks whether three nervous people would say these words. Much
of the notes apparatus is not addressed to a nervous presenter at all — it is addressed to a reviewer
checking provenance. Internal document IDs are worse than useless at the moment of delivery.

**Evidence:**

`index.html:207` — a plan constraint number, mid-performance:

> `NOTE: Last line is the outbound-only property (plan Global Constraint 9). It`

`index.html:294` — a revision hash, immediately above the live 90-second demo, the single highest-stress
moment in the deck:

> `Locked order, plan Revision 2026-07-18e §5:`

`script.md:231` and `:235` — an internal audit task ID, twice, with no expansion:

> `> "Can be heard, cannot be felt" is passive on purpose — it is T5's own claim-boundary`
> `> 70 Hz is from T5's labelled sweep (70/100/150/220 Hz)`

Nobody on stage knows what T5 is. `index.html` has already fixed one of these two and not the other,
which is BLOCKER 5 in miniature.

The genuinely good notes are the ones written to a person: `index.html:35-37` (*"Do not invite the
audience to close their eyes… The black screen is time, not a simulation. Let it sit."*),
`:155-156` (*"The handoff from P1 to P2 happens mid-slide, on the interpreter line. Rehearse it"*),
and `:306-307` (*"Say it on the first tone. If the audience hears an unexplained beep and forms their
own theory, slide 9 arrives too late to correct it."*). Those are direction. The provenance strings
are footnotes wearing a director's hat.

**Fix:** Strip document IDs from the `.notes` blocks. Keep them in the plan and in `facts.md` where a
reviewer looks. A note either changes what the presenter does in the next ten seconds or it belongs
somewhere else.

### 10. Four notes praise the deck to the person reading it

**Where:** `slides/deck/index.html:103, 208, 313, 416, 453`.

**Problem:** Self-congratulation in presenter notes does nothing for delivery, and reads as written-to-be-read.
It is also the tell that the notes were composed as an artefact rather than as rehearsal material.

**Evidence:**

`:103` — > `That is why this line beats any statistic.`

`:208` — > `It reads as a security answer, which is what a judge will hear, and it's true.`

`:313` — > `NOTE: Fourteen words. It does not apologise, does not explain, does not troubleshoot on stage.`

`:416` — > `NOTE: This slide credits Modal by name, which the brief requires, and earns it.`

`:453` — > `It is the most credible thirty seconds in the deck.`

`:416` is the clearest case: `and earns it` is the deck applauding itself, and the rest of the
sentence tells the presenter about a submission brief they cannot act on mid-slide. `:313`'s
*"Fourteen words"* is accurate — I counted — but a presenter does not need the word count of the line
they are about to say; they need to know it is the whole response and nothing follows it, which the
rest of the note already says well.

**Fix:** Cut `:416` entirely. Reduce `:453` to `Deliver this without apology and without a rueful
smile.` — the strongest note in the deck, weakened by the sentence after it. Cut the first sentence
of `:313` and keep the second.

### 11. Three spoken lines explain the joke

**Where:** `slides/deck/index.html:57, 284, 378`.

**Problem:** Each of these tells the audience how to receive the line before or after it, instead of
letting the line do its own work. The deck is otherwise unusually disciplined about this, which makes
the three stand out.

**Evidence:**

`:57` — > `[P1] He isn't a persona we invented for a pitch.`

Defensive and self-aware; it also plants the words *persona* and *pitch* in the audience's head at
the exact moment the deck wants them thinking about a person. The very next line does the job
properly and needs no help: `[P1] I spoke to him. That conversation is why this exists.`

`:284` — > `[P2] Which matters in a moment.`

Announcing that something is about to matter rather than making it matter. The preceding line,
`Safety sensing never touches the network.`, already lands and already points forward.

`:378` — > `[P3] That was not a nice-to-have.`

`nice-to-have` is product-management register in a deck that has otherwise held plain English for
seven slides, and the sentence exists only to tell the audience the previous line was important.
`If the network dies mid-street, the safety sensing doesn't.` is the strongest sentence on slide 7
and it is followed by a line that softens it.

**Fix:** Cut all three. Slide 1 loses a defensive beat, slide 5 hands into the demo a half-second
faster, slide 7 ends on its best line. No information is lost.

### 12. Two spoken lines could belong to any hardware pitch

**Where:** `slides/deck/index.html:201, 204`.

**Problem:** The review asked for copy that could belong to another project. These two are it. Every
other line in the deck is unusable by anyone else — these could open any hackathon hardware demo of
the last decade.

**Evidence:**

`:201` — > `[P2] So we built the thing that answers it.`

`we built the thing` is the default transition into a hardware reveal, and `the thing` is vague in
the one place the deck should be concrete.

`:204` — > `[P2] Everything on it is there for one job.`

Generic, and slightly untrue on its face: the board has four ports doing three different jobs (two
outputs, ranging, listening). The line immediately before it already made the point better by
enumerating them.

By contrast, `[P2] It only ever calls out. Nothing can call in.` (`:205`) is specific, checkable,
belongs to this project alone, and is the best line on the slide.

**Fix:** Cut `:204`. Replace `:201` with something that names the answer, e.g.
`[P2] So we built something that tells you which one.`

### 13. The same design rationale is written out in four files

**Where:** `slides/deck/index.html:45` and `:461-462` and `:476-478`; `slides/deck/css/deck.css:210`;
`slides/design/system.md:48-50`; `slides/narrative/script.md:252-253`.

**Problem:** The slide-1/slide-10 rationale is restated nearly verbatim in six places across four
files. Documentation replicated to look thorough is a slop pattern in its own right, and it
guarantees drift — as BLOCKER 5 already demonstrates elsewhere.

**Evidence:** The same sentence, four times:

- `index.html:461-462` — `The only thing that has changed is that the audience now knows what the device does.`
- `index.html:477-478` — `the only thing that changed is that they now know what the device does.`
- `system.md:49-50` — `The only thing that has changed between them is that the audience now knows what the device does.`
- `script.md:253` — `the only thing that changed is that they now know what the device does.`

And the supporting formulation three times:

- `index.html:45` — `this block verbatim — same face, size, tracking, placement, words.`
- `deck.css:210` — `Slides 1 and 10 share this block verbatim: same face, same size, same`
- `system.md:49` — `1's composition **exactly**: same face, same size, same position.`

Note that the three lists disagree: `index.html` lists five properties, `deck.css` lists four,
`system.md` lists three. Nobody can say which is authoritative.

**Fix:** `system.md:255-259` is the right home. Reduce the `index.html` comment and the `deck.css`
comment to a pointer, and delete the restatement from the slide-10 note, which is design rationale
the presenter cannot act on anyway.

### 14. Twenty-nine prohibitions in three casing styles

**Where:** throughout `slides/deck/index.html` `.notes` blocks.

**Problem:** The notes are majority-negative and typographically inconsistent about it. For three
nervous people, a wall of DO NOTs raises the cost of every sentence — the presenter is rehearsing a
list of ways to fail rather than a thing to say.

**Evidence:** Counted across `index.html`: **29** prohibitions, rendered five different ways:

```
   3  DO NOT
   3  Do NOT
   7  Do not
   5  do not
   1  Never
   3  never
```

`DO NOT`, `Do NOT` and `Do not` all appear inside the slide-3 note alone (`:158-165`). The emphasis
carries no consistent meaning, so it stops signalling anything.

The prohibitions themselves are mostly justified — `DO NOT say £55,000` (`:160`) prevents a real,
documented error (`facts.md:221`), and `Do NOT claim the range sensor chooses a direction` (`:380`)
is a safety-of-claim boundary that must hold. The problem is density and inconsistency, not
existence.

**Fix:** Pick one form (`Do not`) and use it everywhere. Where a prohibition has a positive twin,
lead with the twin: `Say £102,000 — Guide Dogs' birth-to-retirement figure. Not £55,000, which is
stale and lower than the training cost alone.` Same information, and the presenter rehearses the
sentence they will actually say.

---

## SUGGESTION

### 1. Slide 5 is the only dead-centred composition and the only one without a stated reason

**Where:** `slides/deck/css/deck.css:324-328`. Checklist item at `slides/design/system.md:280`.

**Problem:** `system.md:244-247` sets off-centre as the default and calls dead-centre "the template
answer"; the checklist asks *"Any element dead-centred without a reason?"* Slide 5 spans all twelve
columns and all three rows with `align-self: center`, and no file states why.

**Evidence:**

```
.diagram-frame {
  grid-column: 1 / span 12;
  grid-row: 1 / span 3;
  align-self: center;
}
```

Every other placement in the deck follows the rule: `.signature`, `.stat--scale`,
`.stat--latency-first/second` and `.statement-block` all sit `grid-row: 3; align-self: end`.
`.callouts` sits `1 / span 4; grid-row: 3`. Slide 5 is the sole exception.

There is a good reason available — a 2.6:1 diagram needs the full measure, and the slide is held for
the entire 90-second demo while the audience is watching hardware, not the screen. It is simply not
written down, and the `index.html:217-225` comment explains the accent path instead.

**Fix:** One line in `system.md` §Layout granting slide 5 the exception and saying why, in the same
way `system.md:143-145` grants slide 6's.

### 2. Slide 5's three accent paths are an undocumented exemption; slide 6's identical case is documented

**Where:** `slides/deck/css/deck.css:363-375` vs `slides/design/system.md:143-145`.

**Problem:** The accent budget is "one element per slide, maximum". Slide 5 accents three separate
`<path>` elements. The argument that they are one thing is correct — but it lives only in a CSS
comment, while the structurally identical argument for slide 6 is written into the design system.
Budgets that are enforced in one file and waived in another are how budgets stop being budgets.

**Evidence:** Documented exemption (`system.md:143-145`):

> `Accent budget is **one element per slide**. Slide 6's two numbers count as one element`
> `(they are one statement); if both were accent the slide would have no hierarchy.`

Undocumented exemption (`deck.css:360-375`), three rules:

```
.diagram-rule--local,
.diagram-edge--local { stroke: var(--accent); stroke-width: 2; }
.diagram-arrow--local { fill: var(--accent); }
```

Also worth noting for balance: slide 6 ends up with **no** accent at all — `.stat--latency-first` and
`.stat--latency-second` carry no accent class, and `.figure` is `--ink` (`deck.css:186`). So the one
exemption `system.md` bothered to write down is for a case that does not arise. Across the whole
deck only slides 5 and 8 use `--accent`; eight of eleven slides use none. That is legal under a
maximum, but it means the accent token is carrying almost no work.

**Fix:** Add slide 5's exemption to `system.md` §Colour in the same sentence pattern. Separately,
decide whether slide 6 should take the accent it was written an exemption for.

### 3. `system.md`'s slide-6 accent sentence argues against itself

**Where:** `slides/design/system.md:143-145`.

**Problem:** The sentence grants an exemption and then gives a reason not to use it, in the same
breath, leaving no actionable rule.

**Evidence:**

> `Slide 6's two numbers count as one element (they are one statement); if both were accent the`
> `slide would have no hierarchy.`

Clause one says accenting both is within budget. Clause two says accenting both is a mistake. A
reader cannot tell what to do, and the implementation resolves it by accenting neither — which is a
third option the sentence never mentions.

**Fix:** Say which. E.g. *"Slide 6 accents the first figure only; the second is `--ink`. The pair
counts as one element against the budget."*

### 4. `.hw-label` relies on authored capitals while `.eyebrow` and `.credit` are transformed

**Where:** `slides/deck/css/deck.css:159-165`. Spec at `slides/design/system.md:113-116`.

**Problem:** `system.md` specifies hardware labels as uppercase, but `.hw-label` is the one caps role
without `text-transform: uppercase`. It renders correctly only because `index.html:190-193` authors
`P1 BUZZER` in capitals. Any future label typed in sentence case silently breaks the role.

**Evidence:** `.eyebrow` (`:153`) and `.credit` (`:176`) both carry `text-transform: uppercase`.
`.hw-label` (`:159-165`) carries `letter-spacing: 0.08em` and `color: var(--muted)` but no transform.
`.diagram-label` (`:346-352`) has the same gap and the same authored-caps dependency
(`PHONE`, `MODAL`, `RELAY`, `WRIST DEVICE`, `LOCAL SENSING`).

**Fix:** Add `text-transform: uppercase` to both. Costs one line each and makes the role
self-enforcing.

### 5. `.diagram-label` is the one type size not on the ladder

**Where:** `slides/deck/css/deck.css:348`.

**Problem:** Every other size in the deck derives from `--u` and the five `--t-*` tokens. This one is
a bare number.

**Evidence:**

```
.diagram-label {
  ...
  font-size: 20px;
```

Because it sits inside `viewBox="0 0 1220 470"` on an SVG at `width: 100%`, the `20px` resolves in
user units and scales with the frame — at 1920w across an 84vw measure that is ≈26 px rendered,
landing near `--t-micro` (27 px). So it is right today by arithmetic rather than by construction. If
`.diagram-frame`'s column span or the viewBox ever changes, it leaves the ladder silently.

**Fix:** Comment the derivation, or express it as a viewBox-relative constant so the relationship to
`--t-micro` is visible to the next person who touches it.

### 6. Declared per-slide word counts drift from actual by one to two

**Where:** the `P# · Ns · N words` headers in each `.notes` block.

**Problem:** Minor, but this deck trades on its numbers being checkable, and these are the numbers a
reviewer will spot-check first.

**Evidence:** Counted every block. Six are exact (slides 1, 2, 4, 5, 8, 9, 10). Four drift:

```
slide 0   claimed 37   actual 36
slide 3   claimed 48   actual 50   (see BLOCKER 5 — "around" was added, count not updated)
slide 6   claimed 38   actual 39
slide 7   claimed 47   actual 46
```

Slide 3 is the meaningful one; the rest are within counting-convention noise (`7:42`, contractions).

**Fix:** Recount slide 3 after resolving BLOCKER 5. Leave the others or note the convention.

---

## Summary

The deck passes every hard visual test in `system.md` outright. No monospace anywhere — including in
the four places most decks would reach for it. Four colours, no fifth. No gradient, shadow, glow,
blur, or rounded card. No bullet list, no `<ul>`, no marker glyph; the ledger leader is a drawn
hairline. No paragraph on any visible surface — the longest rendered string is eight words. No
default-AI sans face, and both fallback chains end generic. Frame counts and per-frame budgets match
spec exactly. The animation all carries narrative.

The failures are not visual. They are five places where the deck asserts something it has not
checked: a sensor count that contradicts itself out loud, two figures that skip the deck's own
mandatory citation rule, a contingency line that would sabotage the deck's best technical claim, a
weight ladder the shipped fonts cannot render, and two copies of the spoken script that have already
diverged.

That is a good failure profile. The taste is real and the discipline holds under a hostile read. What
is missing is the last verification pass — the one where someone sums the timings, counts the
sensors, and renders the type before writing down what it looks like.
