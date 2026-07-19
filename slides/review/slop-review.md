# Anti-slop review — `slides/deck/`

**Second pass, 2026-07-19.** Supersedes the first-pass document. All five first-pass blockers
re-verified against the files and the font binaries, not against the summary of the fixes.

Re-read: `slides/deck/index.html`, `slides/deck/css/deck.css`, `slides/narrative/script.md`,
`slides/design/system.md`, plus the new `slides/build/sync_script.py`, the diffs to
`slides/deck/js/main.js` and `slides/deck/js/canvas-sequence.js`, and the `fvar` / `OS/2` /
`cmap` tables of every shipped font.

---

## Verdict on the five blockers

| # | First-pass blocker | Status |
|---|---|---|
| 1 | Slide 7 sensor miscount | **Fixed** — verified |
| 2 | Slide 6 uncredited figures | **Fixed, and better than I asked** — one residual |
| 3 | Contingency blames the network for local failures | **Fixed** — verified |
| 4 | Weight ladder undeliverable | **Fixed** — verified from the binary; one new side effect |
| 5 | Two canonical scripts | **Fixed structurally** — four residuals |

### 1 — Sensor miscount. Fixed.

`index.html:407` now reads `[P3] Two sensors on the board, one reason each.` It agrees with
`Both of those are local` three lines later and with slide 4's `A range sensor. A microphone.
Two output channels.` The note at `:414-418` records the reasoning, including why the plan's
"three sensor inputs" is right for the plan and wrong for this slide. Clean.

### 2 — Slide 6. Fixed, and you found something I missed.

I called these "the team's own measurements". They are not measurements at all — the plan's
tables are headed *Estimate*, and the note now quotes audit T4 Open Risk 7 verbatim: *"Nothing
in this architecture has been run. Every timing figure is arithmetic or citation, not
measurement."* My framing was too generous and the fix is stronger than my recommendation:
tilde, `Estimated · latency budget · not yet measured`, and a rehearsal instruction to replace
both with real timings.

The eyebrow correction `Bus to route number` → `Bus to first digit` is a real error I did not
catch, and the note at `:379-381` explains why saying "route number" would have contradicted
the six seconds the audience just watched.

**Residual (WARNING).** The credit sits only under the *second* figure (`:355`).
`stat--latency-first` (`:348-351`) still has none, and the two are separate grid cells
(`grid-column: 1 / span 4` and `6 / span 5`), so a credit under the right-hand figure does not
visually govern the left-hand one. This is the same "directly beneath it" problem I raised
about slide 3, reproduced on slide 6. Either duplicate the credit or move it to a single line
spanning both stats.

### 3 — Contingency. Fixed.

`:320-336` branches on which leg failed, rules out reflex network-blaming, and names the
counter-example explicitly: *"Slide 7 tells this same room 'Both of those are local. No wifi in
either path.' Blaming wifi for a local failure hands them the counter-example."* That is the
finding, closed properly.

### 4 — Weight ladder. Fixed. Verified from the binary, not the claim.

```
InstrumentSans-Variable.ttf   fvar: present
   axis wght: 400..700 (default 400)
   axis wdth:  75..100 (default 100)
   usWeightClass=400  fsType=0
```

`@font-face` declares `font-weight: 400 700` with `format("truetype-variations")`
(`deck.css:21-27`), so `font-weight: 500` and `600` are now real instances. The static cuts are
gone from disk. `Gloock-Regular.ttf` is static 400, `fsType 0`, which is correct for a
Regular-only display face.

One thing worth knowing: `InstrumentSans-Variable.ttf` was already tracked in `HEAD`. The two
static cuts I reviewed were stray untracked files that had displaced it. So the ladder was
authored correctly and then broken by a file swap — which is a better story than the spec being
fiction, and worth a line in `system.md` so it does not recur.

**New side effect (WARNING).** See N4 below — `.diagram-label` was silently dropped from 500 to
400 in the same pass.

### 5 — Two scripts. Fixed structurally, with four residuals.

`sync_script.py` regenerates `script.md` from the deck's own notes and preserves hand-authored
appendices below a marker. The ledger is genuinely computed. Right shape.

**Residual A (WARNING) — the docstring overclaims.** It says the two *"can never disagree
again"*. They can, until someone runs the script. There is no `--check` mode and nothing
enforces it. A `--check` flag that exits non-zero on drift would make the claim true and costs
about six lines.

**Residual B (WARNING) — `[P2-ALT]` is invisible to the generator.** `SPOKEN_RE` is
`^\s*\[(P[123])\]\s*(.+?)\s*$`, which does not match the two new contingency lines at `:330` and
`:333`. They survive into `script.md` because the whole body is dumped verbatim, but they are
excluded from the word ledger, from the runtime, and from the over-15 check. `That one's on us,
not the network. It's local. Let me show you the rest.` is exactly 15 words and nothing measured
it. Widen the pattern to `\[(P[123])(?:-ALT)?\]`.

**Residual C (WARNING) — the per-slide headers are still hand-written and now drift in five of
eleven slides.** The generator computes the ledger but dumps each note body verbatim, including
its authored `P2 · 22 s · 49 words` header. Computed against the generator's own `word_count`:

```
slide  declared  computed  delta
    0        37        36     -1
    4        39        43     +4
    5        49        72    +23
    6        40        41     +1
    7        47        49     +2
```

Slide 5 is +23 because the demo's spoken lines live inside slide 5's note block. BLOCKER 5 is
closed on the axis I raised and a new drift axis has opened inside the file.

**Residual D (WARNING) — the ledger conflates three categories of line.** `495` counts
`[P2] That's a live network at a hackathon…` (14 words), which is only spoken if the demo
fails, and counts `[P2] Those tones stand in for vibration. Heard, not felt.` (9 words), which
is spoken *inside* the 90 s demo that is then added on top — so it is counted twice. It excludes
the two `[P2-ALT]` branches entirely. A clean run is 481 words → 3:42 → **5:12** with the demo,
not 5:18. The numbers are close enough not to matter operationally; the problem is that a
section headed **"Ledger — computed, not asserted"** carries more authority than its method
earns, which is precisely the failure mode this review exists to catch.

---

## NEW — introduced by the fixes

### N1. BLOCKER — slide 4's new line uses the exact active construction slide 9 forbids

**Where:** `slides/deck/index.html:208` against `slides/deck/index.html:483-486`.

**Problem:** Moving the claim boundary onto slide 4 was the right call and I should have caught
the need for it. But the new line is written in the one voice the deck explicitly rules out, and
the rule is still sitting in slide 9's notes contradicting it.

**Evidence:** The new slide-4 line:

> `[P2] Those two channels are buzzers. You can hear them, not feel them.`

The standing rule at `:483-486`:

> `NOTE: "Can be heard, cannot be felt" is passive on purpose — it is the`
> `claim-boundary phrasing from the bench observation. The active alternative ("you`
> `can't feel them") asserts something about a specific body that was never tested.`
> `Leave it passive.`

`You can hear them, not feel them` is the active, second-person form, and the note names
almost exactly that string as the forbidden alternative. The other two instances are both
correct — `:315` `Heard, not felt.` and `:474` `The buzzers we were given can be heard. They
cannot be felt.` — so slide 4 is the only one out of register, and it is the one that now
carries the claim eighty seconds before slide 9 arrives.

This matters beyond consistency. `AGENTS.md` is explicit that the buzzers are not validated
against any body, and "you can hear them" tells a room of people that they, specifically, would
hear it. That is the assertion the passive phrasing exists to avoid.

**Fix:** `[P2] Those two channels are buzzers. They can be heard, not felt.` Same length, same
position, and it matches slides 5 and 9 exactly.

### N2. WARNING — four comments now contradict the code they describe

Every one of these was correct before this pass and was falsified by a fix that did not update
its own documentation.

**(a)** `deck.css:5-6` — the file header still names the face that was replaced:

> `Two faces, used semantically: Instrument Serif is the person (slides 1 and 10`
> `only), Instrument Sans is the machine (everywhere else).`

The serif is Gloock. `system.md` was updated thoroughly; the CSS header was not.

**(b)** `index.html:431-433` — the slide-8 comment still claims an accent that was removed:

> `The argument is state, not cost and not cropping. Line one carries the`
> `slide's one accent, because "when" is the claim that answers "so why a`
> `detector at all?".`

`:437` is now plain `class="statement"`. Nothing on slide 8 carries an accent.

**(c)** `main.js:12-13` — the header claims something the file no longer does:

> ` * Every value a human reads eases out (cubic-bezier(0,0,.2,1)). `linear` appears nowhere:`
> ` * the canvas scrub's easing is the scroll position itself.`

`main.js:409` is `easing: function (t) { return t; }`. See N5.

**(d)** `index.html:44-45` and `deck.css:219-221` still describe the signature block in terms
that were written for Instrument Serif. Harmless, but they are the third and fourth copies of a
rationale I flagged as over-duplicated in the first pass, and they are now stale in different
ways from each other.

**Fix:** Update (a), (b), (c). For (d), reduce to a pointer at `system.md`.

### N3. WARNING — `.statement--accent` is a live rule with no user

**Where:** `deck.css:206-215`. Zero occurrences in `index.html`, one in `deck.css`.

**Problem:** The rule was correctly removed from the markup and then kept in the stylesheet as
documentation:

> `/* DO NOT USE ON TEXT. Kept only to document why it is unused.`
> `   --accent (#CFD9E0, 13.75:1 on --bg) is DARKER than --ink (#F2F4F5, 17.85:1).`

The reasoning is right and the contrast arithmetic checks out — `#CFD9E0` is genuinely darker
than `#F2F4F5`, so accenting text on a dark ground demotes it. That analysis now lives properly
in `system.md:159-169`, which is where it belongs.

But a CSS rule is not a comment. It is a live selector that will apply the moment anyone types
the class name, and a rule whose comment begins "DO NOT USE" is a loaded gun left on the table.
The `system.md` block already carries the explanation.

**Fix:** Delete the rule. Keep the prose in `system.md`.

### N4. WARNING — `.diagram-label` dropped 500 → 400, undocumented, and the other three 500s changed appearance silently

**Where:** `deck.css:359`, previously `500`.

**Problem:** `.eyebrow` (`:152`), `.hw-label` (`:163`) and `.credit` (`:175`) are all still
`font-weight: 500`. `.diagram-label` — the same label role, in the same deck, carrying the SVG
node names — is now the only one at 400, with no comment explaining why. Every other change in
this pass carries a comment; this one does not.

There is a plausible and slightly worrying explanation. Before the font swap, `500` rendered as
`400` for all four. After the swap, all four got heavier for the first time. If `.diagram-label`
was dialled back because the new rendering looked wrong, then the fix restored the *spec* while
one element was quietly retuned to the *broken appearance* — and the other three changed how
they look with nobody confirming the new look was reviewed.

**Fix:** Decide deliberately. If diagram labels should be lighter than eyebrows, say so in the
comment and in `system.md`'s tracking table. If not, restore 500. Either way, eyeball
`.eyebrow`, `.hw-label` and `.credit` at their now-real 500 before the deck is shown — they
have never been seen at that weight.

### N5. WARNING — `playBeat` is good work with three loose ends

**Where:** `main.js:385-412`.

The diagnosis is correct and the fix is real: LENIS_EASING is exponential, so a keypress across
a 5:1 pinned section did burn all 90 frames in a fraction of a second and leave the presenter
talking over a frozen frame. A clicker cannot scrub, so the beat has to play itself. Good catch,
and it is the difference between the canvas sections being narrative and being ornamental.

Three loose ends:

**(a) The `linear` rationale is circular.** `:409` comments `// linear: scroll position IS the
easing`. That justification held when a human's scroll supplied the easing. Here the machine
animates scroll position on a linear ramp over 6 s, so the frames burn at constant rate — which
is right for playback, a film does not ease, but it is not the reason given. `system.md` says
*"Never `linear` for anything a human reads. Linear is reserved for the canvas scrub, where the
scroll position is the easing."* Say plainly that a self-playing beat is film playback and
linear is correct for it, and update `main.js:12` and the `system.md` line together.

**(b) `onComplete` is a no-op.** `onComplete: function () { if (token !== navToken) return; }`
does nothing in either branch. Either drop it or put the intended cleanup in it.

**(c) The arithmetic leaves a gap.** `BEAT_DURATION = 6` against slide 4's 16 s of speech and
slide 7's 22 s means roughly 10 s and 16 s of frozen *final* frame. Better than a frozen frame
0, not a cure. Consider deriving the duration from the slide's spoken budget, or accept it and
note the residual.

### N6. NOTE — `canvas-sequence.js` contain fix is correct

`Math.max` → `Math.min` at `:183`, with the reasoning stated: cover was cropping 24% of the
render height on a 1400×1050 projector and dropping slide 4's callouts onto the base plate. The
letterbox argument holds — the bars are `#0A0B0C` and the renders' own world background is
`#0A0B0C`, so they are invisible rather than merely dark. No issue.

---

## First-pass warnings still open

### Still open, and W1 has got worse

**W1 — the em-dash claim was not scoped.** `script.md:400` is byte-identical to what I flagged:

> `Em dashes: **one**, in slide 1, marking an appositive. Rhythmic, not decorative.`

And the underlying count moved the wrong way. Spoken `[P#]` lines containing an em dash went
from **1** to **5**, because the four new `[CUTTABLE — …]` annotations all use one:

```
56:[P1] He's DeafBlind — no useful sight, no useful hearing.
60:[P1] I'll come back to that.   [CUTTABLE — slide 9 pays this off regardless]
295:[P2] Which matters in a moment.   [CUTTABLE — pure transition into the demo]
445:[P3] So why a detector?   [CUTTABLE — setup line; the next line stands alone]
475:[P3] We drove them down to seventy hertz. Still nothing.   [CUTTABLE — detail, not the claim]
```

Strip the stage directions and it is still exactly one em dash in spoken *words*, which is the
true and defensible claim. Totals are now 31 in `index.html` and 41 in `script.md`.

**Fix:** `Em dashes in spoken words: one — slide 1, an appositive. Stage directions, headings
and note prose are not counted.` The appendix is hand-authored below the marker, so this is a
one-line edit that survives regeneration.

**W3 — "nine minutes of argument ago"** is still at `index.html:516`, and it is now contradicted
by an artefact in the same repo: the generated ledger says **5:18 full / 4:59 tight**. The deck
computes its own runtime and then tells the presenter it is nearly twice that.

**W4 — "the most credible thirty seconds"** still at `index.html:492-493` against the block's own
`P3 · 18 s` header.

**W8 — "Sense estimates 450,000"** still at `index.html:88`, still dropping the `over` that
`facts.md:226` sanctions and that the very next clause uses for the 2035 figure.

**W10 — self-congratulation** is partly cleared. `index.html:456` survives untouched:
`NOTE: This slide credits Modal by name, which the brief requires, and earns it.` So does
`:102-103` (`That is why this line beats any statistic.`) and `:218-219`.

### Improved or closed since the first pass

**W7 — slide 3** is materially better than what I asked for. Replacing `Interpreter / £275–£375
a day` with `Communicator-guide / Booked in advance. Not at 7:42.` corrects a domain error I did
not flag: a BSL interpreter is the wrong role for a man with no useful sight, and the note at
`:163-169` says so. Dropping the price also removes the two-source credit problem — the credit
is now `Guide Dogs · 2026` governing the one figure left on the slide. Correct.

**W2 — the 16-word demo line** is now 9 words: `Those tones stand in for vibration. Heard, not
felt.` Longest spoken line is 14. Confirmed.

**W11 — explaining the joke.** `Which matters in a moment.` (`:295`) and `So why a detector?`
(`:445`) are now tagged `[CUTTABLE]`, which is a good compromise — they stay for a full run and
go first under time pressure. `He isn't a persona we invented for a pitch.` (`:57`) and
`That was not a nice-to-have.` (`:412`) are untagged and unchanged.

**W12 — generic copy.** `Everything on it is there for one job.` is gone, replaced by the
claim-boundary line. `So we built the thing that answers it.` (`:205`) remains.

**Accent budget.** With `.statement--accent` off slide 8, `--accent` now appears on exactly one
slide — slide 5's local-sensing path — and `system.md:159-169` documents the rule properly. The
budget is no longer ambiguous. Closed.

---

## The two you held

### `7:42` — I withdraw the objection, with one condition

You have changed the facts of my finding in two ways. It came from the project brief rather than
being invented, and it is no longer decorative: `:135` and `:151` both use it as the pivot of the
communicator-guide row — `Booked in advance. Not at 7:42.` A detail that opens the deck and then
returns forty seconds later to carry an argument is doing structural work, and cutting it now
costs more than it saves. My first-pass reasoning was that it looked like fabricated texture; it
isn't, and it no longer reads that way.

**One condition.** `script.md`'s appendix asserts *"Every figure traces to
`slides/research/facts.md`."* `7:42` does not, and it is now spoken twice and printed once on a
visible surface. Add it to `facts.md` with its provenance — one line, sourced to the brief,
flagged as a story detail rather than a statistic. That keeps the deck's own traceability claim
true, which is the only reason I raised it.

### `better than YOLO ever could` — I still think it should go

**Where:** `index.html:444`.

My position has hardened rather than softened, because this pass removed the deck's only other
unsourced number. Slide 6 now says `not yet measured` on the team's own timings. Slide 3 dropped
a price rather than cite a single undated provider. Slide 7 corrected a count that was defensible
in the plan but wrong on the slide. Against that, `better than YOLO ever could` is the last bald
comparative in the deck, and `ever could` is not a claim about a benchmark — it is a claim about
every possible YOLO configuration.

It is also unnecessary. The slide's real argument is three lines below and is unattackable:
`The Claude API is stateless. Modal isn't.` The YOLO line exists only to set up `So why a
detector?`, which is itself now tagged `[CUTTABLE]` — so the deck is prepared to cut the payoff
while keeping the overclaim that sets it up.

A judge who has trained a detector will push on this, and the honest answer ("we didn't
benchmark it") undercuts a slide that is otherwise the most rigorous in the deck.

**Fix:** `[P3] Claude reads the number off the front. YOLO tells us when to ask.` Same setup,
no superlative, and it states the `when` / `what` split the slide is built on one beat earlier.

---

## Gloock — my read

**Considered, not trying-too-hard.** Three reasons, and one thing to test.

The reasoning in `system.md:52-58` is the right reasoning. Instrument Serif's problem is not that
it is a bad face — it is that it has become the default signal for "we have taste", which makes
it load-bearing in the same way Inter is, just one tier up. Swapping it for a face in the same
register that has not been worn smooth is exactly the move, and it is the *reason* given that
makes it read as considered rather than contrarian.

It survives the test that matters: it is doing a job. Gloock is a Didone — high stroke contrast,
vertical stress — which is a genuinely different voice from Instrument Sans's grotesque, so the
serif-is-the-person / grotesque-is-the-machine split reads *more* clearly than it did, not less.
A face chosen to be unusual rather than to be different-from-the-other-face is what trying-too-hard
looks like, and this isn't that.

It is also correctly scoped. `--font-serif` has exactly one consumer, `.signature-line`
(`deck.css:230-237`), at `--t-display` only. Two slides, one size, five words. The boldness is
spent in one place, which is what `system.md` says it is for.

**The one thing to test.** A Didone's hairlines are the first thing a projector loses. Verify it
on the actual projector at the actual throw before the room fills. Two things work in your
favour: it is only ever set at 108 px @1920, which is where a Didone is safest, and light-on-dark
causes strokes to bloom rather than thin, so the hairlines will thicken slightly rather than
drop out. Risk is low but it is not zero, and it is fifteen seconds to check.

If it does shimmer, the fix is a lower-contrast serif — not a retreat to Instrument Serif, which
would reintroduce the problem you correctly identified.

**Glyph coverage — checked, clean.** The signature line uses U+2019 in `Hasan’s`, and a missing
glyph there would fall back to the generic `serif` for one character in the deck's most-repeated
word. Both shipped faces cover everything the deck uses:

```
Gloock-Regular.ttf (446 chars)          InstrumentSans-Variable.ttf (343 chars)
  U+2019 RIGHT SINGLE QUOTE   OK          U+2019 RIGHT SINGLE QUOTE   OK
  U+00A3 POUND SIGN           OK          U+00A3 POUND SIGN           OK
  U+00B7 MIDDLE DOT           OK          U+00B7 MIDDLE DOT           OK
  U+2013 EN DASH              OK          U+2013 EN DASH              OK
  U+2014 EM DASH              OK          U+2014 EM DASH              OK
  U+007E TILDE                OK          U+007E TILDE                OK
```

The tilde matters now that slide 6 uses it, and the middle dot matters for every credit line.
Both are present in both faces.

**Licensing.** `Gloock-OFL.txt` is alongside the binary, `fsType 0`. The `system.md:60-64` note
about commercial faces being off the table for a public repo is correct and worth having written
down.

---

## Summary

Five blockers, five closed. Two of the fixes — the slide-6 estimate disclosure and the slide-3
communicator-guide correction — are better than what I recommended, and both fixed errors I had
missed or accepted.

What is left is smaller and of one kind: **the fixes outran their own documentation.** Four
comments now describe code that no longer exists, a dead CSS rule was kept as a comment, a font
weight moved without a note, and a generated ledger asserts more precision than its method has.
Individually minor; collectively they are the same failure the first pass found, which is that
this deck's prose about itself is written faster than it is verified.

One new blocker: slide 4's claim-boundary line is written in the exact voice slide 9 forbids,
and that one is a claims-discipline problem rather than a taste problem, which is why it ranks
where it does.
