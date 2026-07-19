# Narrative and fact review

Reviewed 2026-07-19. 4 BLOCKER, 10 WARNING, 7 SUGGESTION.

Scope: `slides/deck/index.html` (visible surfaces + all `<script class="notes">` blocks),
`slides/narrative/outline.md`, `slides/narrative/script.md`, checked against
`slides/research/facts.md`, `plan/2026-07-18-bus-stop-situational-awareness.md`,
`audit/bus-stop-situational-awareness/`, and `AGENTS.md`.

**Traps confirmed clean.** None of the following appears on any visible surface or in any
spoken line: the alighting-vs-boarding 65%/70%/25% conflation, the Wales-only 51%, the
"complex disabilities" 82%, the £55,000 guide dog cost, any invented hourly interpreter
rate, "160 million worldwide", the unverified 27%, or 700/1400 Hz. Each appears in the deck
**only** inside a `DO NOT` presenter note, which is correct. No `LEFT`/`RIGHT`/`AHEAD`, no
camera-derived bearing, and no route-generality claim has crept in. Keyboard navigation is
real — `deck/js/main.js:460-466` maps digits 0–9 to slide roots, so the contingency
"press 6" works. The mandatory sentence is present verbatim on slide 9 both on screen
(`index.html:428`) and in the mouth (`index.html:436`, `script.md:225`).

---

## BLOCKER

### 1. Slide 6 presents two unmeasured estimates as measurements

**Where:** `slides/deck/index.html:322-324`, `:327-334`, `:344-346`; `slides/narrative/script.md:172-174`; `slides/narrative/outline.md:155-156`

**Problem:** The deck puts `1.4 s` and `3.8 s` on screen at display size with a count-up
animation, and every presenter note describes them as measured. Nothing in this system has
been timed. The plan's own tables are headed **"Estimate"**, and the audit files — which
`AGENTS.md` makes authoritative over the plan — say so explicitly and forbid exactly this
slide.

**Evidence:** Deck note, `index.html:344-345`:

> "Both figures are the MEAN of the plan's **measured** latency budget"

HTML comment, `index.html:322`: "Both figures are the mean of the plan's **measured**
latency budget". `outline.md:155`: "two latency figures from the plan's **measured**
budget."

Against that:

- `plan/…:761` and `:779` — both latency tables are headed `| # | Hop | Estimate |`. Not one
  column says "measured".
- `audit/…/04-track-4-system-firmware-architecture.md:1496`, Open Risk 7, verbatim:
  **"Nothing in this architecture has been run. Every timing figure is arithmetic or
  citation, not measurement."**
- `audit/…/04-track-4-system-firmware-architecture.md:1492`, Open Risk 3: **"Claude vision
  call latency is unmeasured… my 1.5–3.0 s figure is inference"** — and it is "the **single
  largest term** in the Stage-2 budget — larger than every other hop combined." The 3.8 s
  figure is therefore mostly a guess wearing a decimal point.
- `audit/…/02-track-2-modal-claude-grounding-and-hardcoded-spec.md:348`, verbatim:
  **"Do not put a latency number on a slide you have not measured."**

Worse, the estimate's provenance is for an architecture that was cut. `04-track-4:150-166`
derives Stage 1 for the **laptop** client — "JPEG encode … typical `cv2.imencode` on a modern
laptop CPU", "**Laptop** → Modal HTTPS POST", "**Laptop** notices `reading_ready`". Plan
Revision 2026-07-18b §2 cut `vision/bus_client.py` and moved capture to a phone browser
(`canvas.toDataURL` on a phone, over venue Wi-Fi). The hops were relabelled, not re-derived.

A judge asking "did you measure that?" gets no good answer, and this is the deck that is
staking its credibility on not overclaiming.

**Fix — option A (preferred, ~20 minutes):** measure it before the pitch. Run T2's timing
script (`02-track-2…:348-370`) twice for the Claude leg, then stopwatch three rehearsal runs
prop-raised → first tone and prop-raised → first digit. Put the measured mean on the slide
and add a credit line in the slide-2 style: `MEASURED · 3 RUNS · 2026-07-19`. Change all
three notes from "measured latency budget" to "measured on the bench, N runs".

**Fix — option B (if it is not measured by rehearsal):** the numbers come off the slide.
The two-stage argument survives without them. Replace the two stat blocks with the
statement pair used on slide 8:

```html
<p class="statement statement--accent">A bus is here.</p>
<p class="statement">Then, which bus.</p>
```

and the spoken lines with:

```
[P2] The first signal says a bus is here. The number follows.
[P2] You learn a bus is here before you learn which one.
[P2] That gap is deliberate. Knowing early is time to move.
```

Do not keep the figures and soften the note. "About" does not convert an estimate into a
measurement.

---

### 2. "Bus to route number — 3.8 s" is the wrong quantity, and the demo disproves it on stage

**Where:** `slides/deck/index.html:332-333` (screen), `:340` (spoken); `slides/narrative/script.md:168`

**Problem:** 3.8 s is the plan's mean for **prop raised → first digit**, not for the route
number. Route "88" then takes 6.4 s to play out. The audience will have just sat through
those 6.4 seconds of beeping during the demo, so the slide immediately afterwards contradicts
what they watched.

**Evidence:** Screen text: `<p class="eyebrow">Bus to route number</p>` over `3.8 s`.
Spoken: "[P2] About four seconds to the route number."

`plan/…:785-787`, verbatim:

```
| | **prop raised → first digit**            | **2.4 – 6.2 s · mean ≈ 3.8 s** |
| 17 | P6 delivers route "88"                | **6.4 s**                      |
| | **prop raised → number fully delivered** | **8.8 – 12.6 s**               |
```

The deck's own HTML comment (`index.html:323`) correctly traces the number to the
`2.4-6.2 s` row but silently renames "first digit" to "route number".

**Fix:** change the eyebrow to `Bus to first digit of the route` and the spoken line to
"[P2] About four seconds to the first digit of the number." If the intent is the number in
the wearer's possession, the honest figure is 8.8–12.6 s and it should be presented as the
argument for the two-stage design, not hidden. The stronger version:

```
[P2] The first signal lands in about a second and a half.
[P2] The number itself takes about ten.
[P2] That gap is why there are two signals, not one. A bus dwells thirty seconds.
```

That is defensible, matches what the audience heard, and turns the weakness into the design
rationale. (Dwell figure sourced: `plan/…:739`, "a London bus dwells 15–30 seconds".)

---

### 3. Slide 3 prices a BSL interpreter as the human alternative for a man with no useful sight

**Where:** `slides/deck/index.html:134-136` (screen), `:151` (spoken); `slides/narrative/script.md:80`, `:92-94`

**Problem:** The deck's subject is established on slide 1 as "DeafBlind — no useful sight, no
useful hearing." A BSL interpreter's entire output channel is visual. Slide 3 nonetheless
lists `Interpreter — £275–£375 a day` as the alternative that does not answer the question,
and the presenter note defends the figure as if the population were right. This is the exact
conflation `facts.md` builds a table to prevent. Anyone on the panel from Sense, RNID,
Deafblind UK or a disability-tech background catches it in one breath, and the slide's own
tone note — "Getting this wrong makes the team sound like it doesn't know the domain"
(`index.html:167-170`) — is then read back to the team.

**Evidence:** Deck screen text: `<dt>Interpreter</dt><dd>£275–£375 a day. Booked ahead.</dd>`.

`slides/research/facts.md:154-160`, verbatim heading: **"Three roles that are commonly
conflated — do not mix them:"**

| Role | What they do | Published rate |
|---|---|---|
| **BSL interpreter** (RSLI, NRCPD-registered) | Registered language professional, English ↔ BSL | £275–£375 full day |
| **Communicator-guide** | Guiding **plus** communication support, typically for **acquired** deafblindness | £22.93–£27.32/hour (one provider, undated) |
| **Intervenor** | Works with people deafblind **from birth** | No published rate found |

The role that matches an elderly man with acquired dual sensory loss is the
**communicator-guide** — and `facts.md:152` rates that source MEDIUM, undated, single
provider (Kent Association for the Blind), "**Not a national rate**". So the correct role has
no slide-safe price and the priced role is the wrong one.

**Fix:** stop pricing this row. The disqualifier that actually wins is availability, and it
needs no source beyond the plan's own dwell figure.

Screen (`index.html:134-136`):

```html
<div class="ledger-row" data-reveal data-reveal-delay="160">
  <dt>Human support</dt>
  <dd>Booked in advance. A bus dwells thirty seconds.</dd>
</div>
```

Spoken (`index.html:151`, `script.md:80`), same 11-word length as the line it replaces:

```
[P2] Human support is booked ahead. A bus dwells under thirty seconds.
```

Then drop `NUBSLI Apr 2026` from the credit line at `index.html:142`, leaving
`Guide Dogs 2026`.

If the team would rather keep the number, the only honest form names the role and the reason
it fails, and it is a better line than the current one:
`<dt>BSL interpreter</dt><dd>£275–£375 a day — and he cannot see the signing.</dd>`.
That demonstrates the domain knowledge instead of hiding from it.

---

### 4. The audio-proxy disclaimer lives inside the demo, so the contingency branch runs four slides without it

**Where:** `slides/deck/index.html:300-315` (demo block), `:314-315` (the false claim), `:339-342` (slide 6)

**Problem:** The single sentence that carries the deck's central claim boundary — that the
output is audible, not felt — is spoken only during the demo, on the first tone. If the
pipeline fails before any tone sounds, the sentence is never said. The contingency line does
not contain it. The audience then hears slide 4's "So we built the thing that answers it",
slide 6's "You learn a bus is here before you learn which one", and slide 7's "the safety
sensing doesn't [die]" — roughly 80 seconds of a device apparently signalling a DeafBlind
man — with the correction arriving only at slide 9.

The deck asserts the opposite, and that assertion is false:

**Evidence:** `index.html:314-315`, verbatim: **"Slides 6 to 10 are written to stand without
the demo having worked."** They do stand — but the honesty chain does not. The demo block's
own reasoning proves the point, `index.html:306-307`: *"If the audience hears an unexplained
beep and forms their own theory, slide 9 arrives too late to correct it."* The same logic
applies with more force when there is no beep at all and therefore no correction.

Contingency line, `index.html:311`, in full: "[P2] That's a live network at a hackathon. The
numbers are the same either way." — no mention of the output channel.

This runs against plan Global Constraint 15 (`plan/…:109`): "**The current buzzer output is
audible demo feedback, not a DeafBlind-accessible output channel.**"

**Fix:** move the sentence out of the demo and into slide 4, where it is unconditional, and
keep a shortened restatement on the first tone. Slide 4 currently ends:

```
[P2] It only ever calls out. Nothing can call in.
```

Add before it:

```
[P2] The two channels are tones today. They can be heard, not felt.
```

(+12 words on slide 4; recover them with the two cut levers — see WARNING 1.) Then the demo
line shortens to "[P2] Those are the two channels — heard, not felt.", and slide 9's payoff
is unchanged and still lands. Also correct the false note at `index.html:314-315` to
"Slides 6 to 10 are written to stand without the demo having worked; the claim boundary is
now stated on slide 4 so it does not depend on a tone sounding."

---

## WARNING

### 1. The deck does not fit the 5:00 slot, and the outline's arithmetic is wrong

**Where:** `slides/narrative/outline.md:17-32`, `:34-44`

**Problem:** Counted directly from the `[Pn]` lines, the deck is 464 spoken words excluding
the demo line and the contingency. At the deck's own 130 wpm that is **214.2 s**, plus the
90 s demo = **304.2 s = 5:04.2** — over the slot before a single slide transition, breath or
pause, across eleven slides. The outline claims 461 words / 212 s / "302 s ≈ 5:02", which was
already over and is understated by a further 3 words.

The stated recovery is also wrong. The two cut levers are 10 words and 5 words = 15 words =
**6.9 s**, not the claimed "−5 s" and "−3 s" = 8 s. Taking both lands at 297.3 s = **4:57.3**,
leaving 2.7 s of slack for ten transitions and a live camera-permission grant.

**Evidence:** `outline.md:31-32`: "| **Speech total** | | **212** | **461** |" and
"| | **+ demo** | | **302 s ≈ 5:02** | |". `outline.md:43`: "Recovers 8 s → **4:54**."

The per-slide headers are individually inconsistent too. Slide 9 declares "P3 · 18 s · 48
words" (`index.html:432`) — 48 words at 130 wpm is 22.2 s. Slide 4 declares 16 s for 39 words
(18.0 s). Slide 10 declares 10 s for 17 words (7.8 s).

**Fix:** take both cut levers as the default, not as a contingency, and re-time slide 9 to
22 s in the header. Update `outline.md:17-32` to the real counts. If the slot is hard-stopped
at 5:00, the two slides the outline says a judge remembers (9 and 10) are the two currently
at risk.

### 2. Both presenter ledgers are wrong, disagree with each other, and invert their own rationale

**Where:** `slides/narrative/outline.md:47-54`, `slides/narrative/script.md:259-265`

**Problem:** The brief asked for the actual split. Counted from the `[Pn]` markers:

| | Slide-scripted | + demo line (P2 speaks it) | Share |
|---|---|---|---|
| **P1** | 146 | 146 | 30.4 % |
| **P2** | 157 | **173** | 36.0 % |
| **P3** | 161 | 161 | 33.5 % |
| **Total** | 464 | 480 | |

Excluding the demo line the spread is 15 words (P1 146 → P3 161), which is tolerable.
Including it, P2 carries 27 more words than P1 — an 18.5 % spread — **and** the 90 s demo.

**Evidence:** `outline.md:50-52` publishes "P1 154 / P2 150 / P3 157" and "Even to within
5 %". `script.md:261-263` publishes "P1 ~153 / P2 ~149 / P3 ~162" and "Even to within 8 %".
All six figures are wrong, the two tables disagree, and both assert P2 is lightest.
`outline.md:54`: "**P2's lighter script is deliberate, not an accident of drafting.**" P2 is
in fact the heaviest voice on either counting method, on top of owning the demo.

**Fix:** replace both ledgers with the table above. If the "P2 lightest" design goal is real,
move slide 6 to P3 (P2 146+16=162 → wait, that inverts again) — cleaner: move the slide-3
handoff earlier so P1 takes the interpreter line, giving P1 157 / P2 146+16 / P3 161. Or
simply delete the "deliberate" claim, since the split is defensible without it.

### 3. "£102,000" invites "to whom?" — guide dogs are provided free to the owner

**Where:** `slides/deck/index.html:131-132` (screen), `:150` (spoken); `slides/narrative/script.md:79`

**Problem:** The row reads `Guide dog — £102,000 over its lifetime.` and the spoken line is
"A guide dog costs a hundred and two thousand pounds." Guide Dogs bears that cost; the owner
does not pay it. Left unqualified next to `Interpreter — £275–£375 a day` (which the user
*would* pay), the ledger implies a blind person faces a £102,000 bill. That is the domain slip
the slide's own tone note warns against.

**Evidence:** `facts.md:62`, source wording: "It costs £102,000 **to raise, train and support**
a guide dog from birth to retirement" — a provider cost. `facts.md:234` sanctions the
comparison but only in the form "one guide dog **partnership** costs £102,000 over its life."

**Fix:** three words on screen — `£102,000 to breed, train and support.` — and one in the
mouth: "A guide dog costs a hundred and two thousand pounds **to provide**." The capability
axis is already carried by the slide's closer ("None answers: which bus is this?"), so nothing
else needs to change.

### 4. "The cane remains the primary mobility aid" is never spoken

**Where:** `slides/deck/index.html:384` (note only); `slides/narrative/script.md:192-194`

**Problem:** `AGENTS.md` and plan Revision 2026-07-18e §1 both make this a claim boundary,
not a nicety: "`MOVING` demonstrates supplementary ToF forward-clearance feedback… **the cane
remains the primary mobility aid**." It appears in the deck as a presenter NOTE — "NOTE: The
cane remains the primary mobility aid. This is supplementary." — and in no spoken line.
The first question from anyone in the mobility field is "are you asking a blind person to
trust a wristband over a cane?", and the answer is not in the deck.

**Fix:** one word into slide 7, at zero net cost if the cuttable first line goes:

```
[P3] Range sensor: supplementary forward clearance. The cane still leads.
```

### 5. Slide 2's legal beat is a blind person's argument, not a DeafBlind one

**Where:** `slides/deck/index.html:91-92`, `:105-108`; `slides/narrative/script.md:54-55`

**Problem:** "The law even requires buses to announce their route number. / Only to the people
already on board." That distinction matters to someone who can hear. The man on slide 1
cannot hear the announcement **wherever he is standing**, so the on-board/at-stop split is not
his failure mode. A well-informed judge spots the borrowed argument and asks the question
`facts.md` predicts: "won't the 2026 regulations fix this?" The deck raises the regulation and
never disarms it on stage. The winning answer sits unused in the Q&A appendix
(`script.md:274-280`).

**Evidence:** `facts.md:246-248`, section heading: **"An audibility fix does not help a
DeafBlind user — make this explicit"** … "it is worth saying plainly, because a judge may
otherwise ask 'won't the 2026 regulations solve this?' The answer is no — **the regulations
mandate exactly the two channels a DeafBlind person cannot use.**" SI 2023/715 reg 12
(`facts.md:47`) requires the information "in audio **and** visual form".

**Fix:** budget-negative — this replaces 17 words with 15 and closes the door:

```
[P1] The law does require an announcement.
[P1] Audio and visual, to the people already on board.
```

Slide 1 has already established no useful sight and no useful hearing; the audience does the
arithmetic, which is stronger than being told.

### 6. "Three sensors, one reason each" is followed by two sensors and the word "Both"

**Where:** `slides/deck/index.html:373-376`; `slides/narrative/script.md:185-188`

**Problem:** The signpost promises three and delivers two, then confirms the count is two:

```
[P3] Three sensors, one reason each.
[P3] Range sensor: forward clearance while you're walking.
[P3] Microphone: sirens, detected on the board itself with an FFT.
[P3] Both of those are local. No wifi in either path.
```

The third sensor in `plan/…:7` is the phone camera, which is not on the device, is not on the
slide-7 orbit, and was covered on slide 5. On stage this reads as a miscount.

**Fix:** the line is already marked CUTTABLE — cut it, which also buys 2.3 s (WARNING 1).
If it is kept, "Two sensors on the board, one reason each."

### 7. Screen and mouth disagree on both slide-6 numbers

**Where:** `slides/deck/index.html:329` vs `:339`; `:333` vs `:340`

**Problem:** The screen says `1.4 s` while P2 says "About one and a half seconds"; the screen
says `3.8 s` while P2 says "About four seconds". Both spoken values round away from the
displayed figure in front of an audience reading the figure. Neither is an overclaim — both
round toward *slower* — but a judge watching a deck this precise will notice the mismatch.

**Fix:** say the number on the screen. "About one point four seconds" / "About three point
eight seconds", or change the screen to `1.5 s` / `4 s`. Do not leave them different. (Moot
if BLOCKER 1 is fixed by option B.)

### 8. "It's 7:42 in the morning" and "Every time" are unfalsifiable specifics about a real person

**Where:** `slides/deck/index.html:29`, `:33`; `slides/narrative/script.md:17`, `:21`

**Problem:** The opening 18 seconds are the deck's credibility frame, and they contain two
absolute claims about a named real individual that rest entirely on one conversation:
a precise clock time and "**Every time**". If 7:42 is real, fine. If it was chosen for
texture, it is an invented detail about a real person in the one deck at the event whose
whole argument is that it does not invent things — and the team has no answer if asked.
Route 88 → Clapham Common → "south London" does check out (`plan/…:96`), so only the
timestamp and the universal quantifier are exposed.

**Fix:** if 7:42 is not something the grandfather actually said, use "It's a weekday morning,
at a bus stop in south London." and change "So he asks a stranger. Every time." to "So he asks
a stranger." — the emphasis already lands on the pause. If it is real, keep it and be ready to
say so.

### 9. The mandatory sentence differs from plan Global Constraint 13 by one word

**Where:** `slides/deck/index.html:428`, `:436` vs `plan/…:107`

**Problem:** The plan's constraint is written as a verbatim-preservation rule:

> 13. **"We have not validated with DeafBlind users."** That sentence survives into every
> artefact, **unchanged.**

The deck says "We have not validated **this** with DeafBlind users." One word has changed in
a sentence the plan says must not change. The deck's wording is better English and narrower in
the right direction, and it matches the review brief — but the two artefacts now differ, and
anyone diffing them finds the deck violating a Global Constraint.

**Fix:** amend `plan/…:107` to the deck's wording rather than the reverse. Then deck, outline,
script and plan all read identically and the constraint is enforceable again.

### 10. Presenter-note timing claims contradict the budget, in two files

**Where:** `slides/deck/index.html:432` vs `:453`; `index.html:476` and `script.md:253`; `script.md:80` vs `index.html:151`

**Problem:** Three drifts, all presenter-facing:

- Slide 9's header says "P3 · 18 s · 48 words" (`index.html:432`); its own closing note four
  lines later says "It is **the most credible thirty seconds** in the deck"
  (`index.html:453`). 18 s and 30 s in the same block.
- Slide 10's note says the audience saw the same image "**nine minutes** of argument ago"
  (`index.html:476`, `script.md:253`). The whole deck is budgeted at 5:02 and slide 1 to
  slide 10 is under 4:30. Wrong by roughly 2×, and it repeats verbatim in both files.
- The slide-3 interpreter line reads "An interpreter is three hundred pounds a day"
  (`script.md:80`) but "An interpreter is **around** three hundred pounds a day"
  (`index.html:151`). The deck is presumably canonical; the script was not updated.

**Fix:** slide 9 header → 22 s; "thirty seconds" → "twenty seconds"; "nine minutes" → "four
minutes"; re-sync `script.md:80` to whatever survives BLOCKER 3.

---

## SUGGESTION

### 1. Restore "over" to 450,000

`index.html:81` shows `450,000` and `:88` says "Sense estimates 450,000". Source
(`facts.md:33`): "there are **over** 450,000 people in the UK who are deafblind", total
451,211. The next clause already says "**Over** 610,000 by 2035", so the deck is inconsistent
with itself and with the source in the same breath. `facts.md:226` gives the safe phrasing
verbatim. Costs one word.

### 2. "deafblind" and "DeafBlind" are both used

`index.html:80` and `:88` use lowercase (correct — it matches Sense's own wording);
`:59`, `:428`, `:436` use "DeafBlind". Both usages are defensible and the distinction is real
in the community, but a judge who knows that will read the mix as accidental rather than
chosen. Either pick one, or be ready to explain the distinction in one sentence.

### 3. £275 is the Northern Ireland median; the story is set in south London

`facts.md:65` breaks the NUBSLI range down: London **£375**, South East £365, Scotland £335,
Northern Ireland £275. If any interpreter figure survives BLOCKER 3, the London-relevant
number is £375, and "around three hundred pounds" understates the alternative the deck is
arguing against — weakening its own case.

### 4. Slide 6's `aria-label` is "What you just saw"

`index.html:326`. In the contingency branch nobody just saw it. Trivial for sighted judges;
less trivial on an accessibility deck if anyone runs a screen reader over it. Neutral
alternative: `aria-label="Latency"`.

### 5. The strongest unused fact in `facts.md` is the one that props up slide 0

The deck's premise is "So he asks a stranger." `facts.md:94` has the sourced finding that
asking usually fails: "only **35%** of bus drivers were identified as always communicating
this information [when asked]… down from 55% in the previous year's survey" (Guide Dogs 2014,
n=818, ⭐-marked in the research as "**the boarding-side statistic and the one that
legitimately supports the pitch**"). Nine words on slide 0 or slide 10 would convert the
anecdote into evidence: "In 2014, drivers told them the number a third of the time."
Date-stamp it, per `facts.md:229`.

### 6. "Statutory definition" is an escalation the research does not verify

`index.html:100-101` (note only): "quoted from the Department of Health's **statutory**
definition". `facts.md:36` names the document as *Care and Support for Deafblind Children and
Adults **Policy Guidance*** (Dec 2014). The spoken line correctly says only "The government's
own definition" and is safe. Drop "statutory" from the note so nobody upgrades the spoken
line under pressure.

### 7. The demo block omits the plan's fire-once landmine

`index.html:294-299` reproduces plan Revision 2026-07-18e §5's locked order faithfully, but
drops its final clause (`plan/…:41`): "**The bus prop must not latch an arrival before the
still transition unless the web producer explicitly resets/re-arms it.**" If the prop is
visible during the MOVING phase, `arrival_id` latches to 1 and the STILL sequence never fires
fresh — a silent failure at exactly the 90-second mark, in the highest-pressure slot in the
deck. Add it as a bullet 0: "Prop stays out of frame until step 4, or re-arm before raising
it."
