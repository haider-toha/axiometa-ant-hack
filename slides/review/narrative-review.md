# Narrative and fact review — pass 2

Re-reviewed 2026-07-19 after the coordinator's fixes. **1 BLOCKER, 11 WARNING, 8 SUGGESTION.**

Pass 1 raised 4 BLOCKER / 10 WARNING / 7 SUGGESTION. Three blockers are fully closed, one is
closed in placement but reopened in wording. Six warnings closed, six survive untouched.
Six new problems were introduced by the fixes themselves.

Traps still clean: no alighting-vs-boarding conflation, no Wales-only 51%, no 82%, no
£55,000, no invented hourly rate, no 700/1400 Hz, no camera bearing, no left/right, no
route-generality claim. Mandatory sentence still verbatim on screen (`index.html:468`) and
in the mouth (`:477`). Keyboard nav still works.

---

## Verdict on the four blockers

### Blocker 1 — latency figures. **Closed on the slide, open in two files, and the hedge does not comply.**

The slide is now honest: `~1.4 s` / `~3.8 s`, credit `Estimated · latency budget · not yet
measured`, and a presenter note (`index.html:366-377`) that quotes T4 Open Risk 7 and T2's
prohibition verbatim and orders a rehearsal timing. That removes the discrediting part — the
deck no longer *asserts* a measurement.

**You asked me to say plainly whether you have hedged around the audit's actual prohibition.
You have.** T2 says "Do not put a latency number on a slide you have not measured." The slide
still has two latency numbers and they are still not measured. A tilde and a credit line
change the number's *status*, not its *presence*. What you have built is an honest estimate,
which is a real improvement over a dishonest measurement, but it is not compliance.

The narrow residual risk is specific: the slide's aria-label is still "What you just saw", it
lands seconds after a demo that just produced the real numbers, and the credit says "not yet
measured". The obvious question is "you just ran it — why didn't you time it?" There is no
good answer, and it is a five-minute fix.

**Do this:** stopwatch three rehearsal prop-raises, prop-up → first tone and prop-up → first
digit. Replace both figures, change the credit to `Measured at rehearsal · 2026-07-19`, and
delete the tilde. Then the finding closes completely and the slide gets *stronger*, because a
defensible measured number beats an estimate you have to qualify. If it is not timed by
rehearsal, take the figures off per pass 1's option B — do not present the hedge as the plan.

Two of the three "measured" instances I cited were not fixed — see WARNING 1 and WARNING 2.

### Blocker 2 — wrong quantity. **Closed.**

`Bus to first digit` on screen (`index.html:353`), "About four to the first digit of the
number" spoken (`:362`), and a note (`:379-381`) recording that P6 then takes 6.4 s and
prop-to-fully-delivered is 8.8–12.6 s. Correct, sourced, and the note's reasoning — "Saying
'to the route number' would contradict the six seconds the audience just watched" — is
exactly right. One nit in SUGGESTION 1.

### Blocker 3 — BSL interpreter. **Closed, and better than my proposed fix.**

Row is now `Communicator-guide` / "Booked in advance. Not at 7:42." (`index.html:133-136`),
no price, and `NUBSLI Apr 2026` correctly dropped from the credit (`:142`). The note at
`:163-169` explains the role distinction and *why* the row carries no number. That is the
right call: `facts.md:152` rates the only communicator-guide rate MEDIUM, undated, one
provider, "Not a national rate", so no price belonged there.

Three residual issues, in WARNING 3, WARNING 4 and WARNING 9.

### Blocker 4 — tone disclaimer. **Placement closed. Wording reopened it.**

**Yes, slide 4 closes the gap I identified.** The sentence now sits at `index.html:208`,
before slide 5 and therefore before the demo, so it is said whether or not a tone ever
sounds. The note at `:211-216` states the reasoning correctly, and the demo repeats a short
form on the first tone. The contingency branch no longer runs eighty seconds without the
claim boundary. That was the defect and it is gone.

**But the new line breaks the deck's own rule**, and does so twenty lines above the note that
states the rule. See WARNING 5. It is a one-word-class fix and must be made.

---

## BLOCKER

### 1. Slide 8's `[CUTTABLE]` marker leaves the next line a fragment answering nothing

**Where:** `slides/deck/index.html:445`; repeated in `slides/narrative/outline.md:37`

**Problem:** The marker's own justification is false, and it fires in the configuration the
deck is designed to be presented in.

**Evidence:** `index.html:444-446`:

```
[P3] Claude reads a bus number better than YOLO ever could.
[P3] So why a detector?   [CUTTABLE — setup line; the next line stands alone]
[P3] Because a bus arriving isn't one frame. It's two seconds of frames.
```

The next line begins with **"Because"**. It does not stand alone. Cut the question and slide
8 opens: *"Claude reads a bus number better than YOLO ever could. Because a bus arriving
isn't one frame."* — a subordinate clause answering a question nobody asked.

This is not hypothetical. `outline.md:31-39` lists it as cut #4 of 6, and the generated
ledger reports the deck only reaches the slot **with every `[CUTTABLE]` line dropped**
(4:59 tight vs 5:18 full). The tight run is the run. So the default presentation opens the
Modal slide — the sponsor slide — with a fragment.

**Fix:** 30 seconds. Make the following line self-standing, then the marker becomes true:

```
[P3] So why a detector?   [CUTTABLE — setup line; the next line stands alone]
[P3] A bus arriving isn't one frame. It's two seconds of frames.
```

Dropping "Because" costs one word and the line works with or without the question above it.

---

## WARNING

### 1. The HTML comment above slide 6 still says "measured" and now contradicts the note below it

**Where:** `slides/deck/index.html:343-345` vs `:366-373`

**Evidence:** Comment, `:343`: "Both figures are the mean of the plan's **measured** latency
budget". Note, 23 lines below, `:366-370`: "These are ESTIMATES from the plan's latency
budget, whose tables are headed 'Estimate'… 'Do not put a latency number on a slide you have
not measured.'" Same slide, opposite claims.

**Fix:** `:343-345` → "Both figures are the mean of the plan's latency budget, which is an
estimate: 0.76-2.09 s, mean 1.38; and 2.4-6.2 s, mean 3.8. See the note below before
rehearsal."

### 2. `outline.md` still calls the latency budget "measured", in the demo-independence section

**Where:** `slides/narrative/outline.md:150`

**Evidence:** "Slide 6 states two latency figures from the plan's **measured** budget. …The
numbers are sourced either way." Sourced, yes. Measured, no.

**Fix:** "Slide 6 states two latency figures from the plan's latency budget, flagged on the
slide as estimates until a rehearsal run is timed."

### 3. "£102,000" is still unattributed, and the row beneath it now makes that conspicuous

**Where:** `slides/deck/index.html:130-131`, `:150` — unfixed from pass 1

**Problem:** Guide Dogs bears the £102,000; the owner does not pay it. That was pass 1's
WARNING 3 and it survives. It is now more exposed, not less: the row directly beneath it
dropped its price *because the price was the wrong argument for that role*, and the new note
at `:169` says outright "**Availability is the real barrier at 7:42 anyway.**" If availability
is the real barrier, the guide-dog row is arguing the wrong axis by the deck's own reasoning.

The ledger now runs on three different axes across four rows — capability (cane, apps), cost
(guide dog), availability (communicator-guide) — where it previously ran on two.

**Fix:** three words on screen, one in the mouth. `£102,000 to breed, train and support.` /
"A guide dog costs a hundred and two thousand pounds **to provide**." Or switch the row to
availability and make the slide argue one thing: `Over 1,000 people waiting.` (`facts.md:145`,
Guide Dogs COO, May 2023 — date-stamp it, MEDIUM confidence).

### 4. "Not at 7:42" is logically soft, and it makes an unverified timestamp load-bearing twice

**Where:** `slides/deck/index.html:135` (screen), `:151` (spoken)

**Problem — logic:** You *can* book a communicator-guide for 7:42 a.m. The disqualifier is not
the hour; it is that you cannot book one for the thirty seconds an unidentified bus dwells.
Anyone who has commissioned social care will say "we book 7 a.m. support all the time," and
the row loses.

**Problem — coupling:** pass 1's WARNING 8 flagged "It's 7:42 in the morning" as an
unfalsifiable specific about a real named person. It is unfixed (`:29`), and slide 3 now
depends on it. If 7:42 turns out to be texture rather than fact, two slides change, not one.

**Fix:** make the row about the granularity, not the clock:

```html
<dd>Booked in advance. Not for a bus that's already here.</dd>
```
```
[P2] A communicator-guide has to be booked. Not for the bus in front of you.
```

That is true regardless of the hour and survives a judge who books early-morning support.

### 5. Slide 4's new disclaimer uses the active voice slide 9 explicitly forbids

**Where:** `slides/deck/index.html:208` vs `:483-486` and `slides/narrative/outline.md:125-127`

**Problem:** The fix for blocker 4 introduced the one phrasing the deck bans.

**Evidence:** New line, `:208`: "[P2] Those two channels are buzzers. **You can hear them, not
feel them.**"

Slide 9's note, `:483-486`, verbatim: *"'Can be heard, cannot be felt' is **passive on
purpose** — it is the claim-boundary phrasing from the bench observation. The active
alternative (**"you can't feel them"**) asserts something about a specific body that was never
tested. **Leave it passive.**"* `outline.md:125-127` restates this as a binding claim boundary.

The deck now states one claim three ways, and the new one is the outlier that carries the
load:

| Where | Wording | Voice |
|---|---|---|
| Slide 4 `:208` | "You can hear them, not feel them." | **active, 2nd person — banned** |
| Demo `:315` | "Heard, not felt." | passive ✓ |
| Slide 9 `:474` | "can be heard. They cannot be felt." | passive ✓ |

T5's observation was one person's qualitative bench result. "You can't feel them" generalises
it to the listener's body. The direction is self-deprecating so it is not an overclaim, but it
is exactly the boundary the deck spent three notes defending, and an attentive judge hears
both phrasings four minutes apart.

**Fix:** same length, passive, matches slides 5 and 9:

```
[P2] Those two channels are buzzers. They can be heard, not felt.
```

### 6. The third contingency line promises a demonstration that never comes

**Where:** `slides/deck/index.html:332-333`

**Problem:** After a failed demo the presenter presses 6 and lands on two estimated numbers
with a "not yet measured" credit. The line written for that moment is:

> "[P2-ALT] Live hardware. **Let me show you what it does when it works.**"

Nothing after slide 5 shows what it does when it works. The line writes a cheque slides 6–10
do not cash, and it is the line used when the presenter *doesn't know what failed* — the
highest-stress branch. The other two are fine: "Let me show you the rest" correctly means the
remaining slides, and the network line is unchanged and good.

**Fix:** "[P2-ALT] Live hardware. The rest of the deck is what it does when it works."

### 7. The outline hand-asserts a runtime in the section that exists to ban hand-asserted runtimes

**Where:** `slides/narrative/outline.md:29` vs `:13-21`

**Evidence:** The callout at `:13-21` reads: "**Do not put a word budget in this file.** An
earlier version of this section carried a hand-maintained per-slide table and a presenter
split. Both went stale within hours… The live numbers are **computed from the deck itself**."

Ten lines later, `:29`: "Currently that is the difference between **5:21 full** and **5:02
tight**."

I re-ran `sync_script.py`. The computed values are **5:18 full / 4:59 tight**. Already stale
by three seconds, in the paragraph explaining why hand numbers go stale.

**Fix:** `:29` → "The ledger at the end of `slides/narrative/script.md` reports both runtimes.
Re-read it after any change."

### 8. The outline describes a contingency that no longer exists

**Where:** `slides/narrative/outline.md:158-159`

**Evidence:** "**If the demo fails outright**, P2's fallback line is scripted in `script.md`
under `DEMO — contingency`. It is **14 words** and it does not apologise."

All three clauses are now wrong. There are three lines selected by failure mode, not one;
`script.md` is generated and contains no `DEMO — contingency` heading; and only one of the
three is 14 words.

**Fix:** "If the demo fails, the deck's slide-5 notes carry three fallback lines, chosen by
which leg failed. Pick by failure mode — do not blame the network for a local-sensing
failure."

### 9. `sync_script.py` moved the drift into the deck instead of eliminating it

**Where:** `slides/build/sync_script.py`; `slides/deck/index.html:203`, `:405`, `:472`

**Problem:** The generator rebuilds `script.md` from the deck's notes, but it does not touch
the hand-written `P2 · 16 s · 39 words` header *inside* each note block. Those headers are now
the stale artefact — and they live in the file the presenter actually reads at the podium.

Measured against the deck's own 130 wpm:

| Slide | Header says | Actually is | |
|---|---|---|---|
| 4 | 16 s · 39 words | **19.8 s · 43 words** | +4 words from the blocker-4 fix |
| 7 | 22 s · 47 words | 22.6 s · **49 words** | +2 from "Two sensors on the board" |
| 9 | **18 s** · 48 words | **22.2 s** · 48 words | pre-existing |
| 10 | **10 s** · 17 words | **7.8 s** · 17 words | pre-existing |

The generated file now prints both counts four lines apart:

```
## Slide 4 · P2 · 43 spoken words

  SCREEN: CAD explode. 90 frames, pin 5:1. Port callouts only.
  P2 · 16 s · 39 words
```

**Fix:** the generator already computes both numbers. Have it rewrite that header line in
`index.html` in place, or assert on it and exit non-zero on mismatch:

```python
HDR_RE = re.compile(r"^(P[123](?:\s*→\s*P[123])?)\s*·\s*\d+\s*s\s*·\s*\d+\s*words\s*$", re.M)
# per note: body = HDR_RE.sub(rf"\1 · {words/130*60:.0f} s · {words} words", body, count=1)
```

Simplest alternative: delete the header line from every note and let the generated heading be
the only count in existence.

### 10. Screen and mouth still disagree on both slide-6 figures

**Where:** `slides/deck/index.html:350` vs `:361`; `:354` vs `:362` — unfixed from pass 1

Screen `~1.4 s`, mouth "About a second and a half". Screen `~3.8 s`, mouth "About four".
Both spoken values round away from the figure the audience is reading. Neither overclaims —
both round toward *slower* — but on a deck this precise it reads as carelessness.

**Fix:** say the number on the screen: "About one point four seconds…" / "About three point
eight seconds to the first digit." Moot if the rehearsal timing lands (Blocker 1).

### 11. Four pass-1 warnings are untouched

Restated in one block; each is unchanged and the original reasoning stands.

- **The cane's primacy is still never spoken.** `index.html:424` is a NOTE: "The cane remains
  the primary mobility aid. This is supplementary." `AGENTS.md` and plan Revision 2026-07-18e
  §1 make this a claim boundary. Fix: slide 7 → "[P3] Range sensor: supplementary forward
  clearance. The cane still leads."
- **Slide 2's legal beat is still a blind person's argument.** `index.html:91-92`. A man with
  no useful hearing cannot use the announcement wherever he stands, so the on-board/at-stop
  split is not his failure mode, and the "won't the 2026 regs fix this?" door stays open.
  `facts.md:246-248` says to close it explicitly. Budget-negative fix (17 words → 15): "[P1]
  The law does require an announcement. / [P1] Audio and visual, to the people already on
  board."
- **"It's 7:42" and "Every time" remain unfalsifiable specifics** about a real named person,
  in the deck's opening, now load-bearing in two slides (WARNING 4).
- **The mandatory sentence still differs from plan Global Constraint 13 by one word.**
  `plan/…:107` says "We have not validated with DeafBlind users." and "That sentence survives
  into every artefact, **unchanged**." The deck says "…validated **this** with…". Amend the
  plan to the deck's wording; the deck's is better English.

Also unfixed: `index.html:493` "the most credible **thirty seconds**" under a header saying
18 s (really 22.2 s), and `index.html:516` "the audience saw nine minutes of argument ago" in
a five-minute deck.

---

## SUGGESTION

1. **"About four to the first digit" drops its unit.** `index.html:362`. Spoken, the listener
   must carry "seconds" from the previous line. "About four **seconds** to the first digit."
2. **The slide-6 credit qualifies only the second figure.** `index.html:355` puts
   `Estimated · latency budget · not yet measured` inside `.stat--latency-second`. `~1.4 s`
   carries no qualifier and is equally an estimate. Move the credit to its own element
   spanning both, or duplicate it.
3. **Slide 6's two figures will not share a baseline.** `css/deck.css:389-399` — both stat
   blocks are `grid-row: 3; align-self: end`, and only the second contains a credit line, so
   the second block's figure sits higher by the credit's height. Verify in the browser; fix by
   lifting the credit out of the stat block into its own grid child.
4. **The outline's suggested rebalance would make the split worse.** `outline.md:48-49`
   proposes moving slide 6 from P2 to P3. Slide 6 is 41 words. Computed split is P1 147 /
   P2 184 / P3 164; net of the demo line and contingency, P2's slide-scripted total is **161**,
   so the real spread is 147 / 161 / 164 — even to within 11%. Moving slide 6 gives
   143 / 205 and a 62-word spread. P2's burden is the 90 s demo, not word count. Say that, and
   drop the proposed move.
5. **`5:18 full` is ~10 s pessimistic.** The 9-word demo line is spoken *inside* the 90 s demo
   window and the 14-word contingency is mutually exclusive with the demo running, so both are
   double-counted. Real full runtime is nearer 5:07. That does not rescue the slot — 4:59
   tight still leaves one second of margin for ten slide transitions and a live camera
   permission grant — but plan against the right number.
6. **Restore "over" to 450,000.** `facts.md:33`: "there are **over** 450,000". The next clause
   already says "Over 610,000 by 2035", so the deck is inconsistent with itself in one breath.
7. **The strongest unused fact still supports slide 0's premise.** `facts.md:94`, ⭐-marked as
   "the boarding-side statistic and the one that legitimately supports the pitch": in 2014
   only 35% of drivers always told a blind passenger the bus number *when asked*, down from
   55% the year before. The deck's premise is "he asks a stranger" — the sourced finding that
   asking usually fails would convert the anecdote into evidence. Date-stamp it.
8. **The demo block still omits the plan's fire-once landmine.** `index.html:305-310`
   reproduces the locked order but drops `plan/…:41`: "The bus prop must not latch an arrival
   before the still transition unless the web producer explicitly resets/re-arms it." If the
   prop is visible during MOVING, `arrival_id` latches and the STILL sequence never fires
   fresh — a silent failure at the 90-second mark. Add as step 0.

Still open from pass 1 and unchanged: "deafblind"/"DeafBlind" capitalisation mixed
(`:80` vs `:468`); slide 6's `aria-label="What you just saw"` is false in the contingency
branch; "statutory definition" at `:100` is an escalation `facts.md:36` does not verify (it is
*Policy Guidance*) — the spoken line correctly says only "the government's own definition".
