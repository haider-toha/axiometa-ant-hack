# Pitch-practice review

Reviewed 2026-07-19 against `slides/deck/index.html` as it stood after the ~01:35 edit.
**The deck moved twice during this review.** Every number below was recomputed against the
latest state, not the state at the start. Where a finding was closed by one of those edits
I say so rather than raising it stale.

**3 BLOCKER / 9 WARNING / 3 SUGGESTION.**

Independent recount agrees with the ledger exactly: **P1 147 / P2 160 / P3 166 = 473 words;
5:08 full, 4:49 tight.** The ledger's earlier double-count of the in-demo and contingency
lines has been fixed by retagging them `[P#-DEMO]` and `[P#-ALT]`, which `sync_script.py`'s
`SPOKEN_RE` does not match. That finding is closed — do not re-raise it.

Measured timeline:

| # | Voice | Words | Runs | Notes |
|---|---|---|---|---|
| 0 | P1 | 36 | 0:00–0:16 | black screen |
| 1 | P1 | 50 | 0:16–0:39 | |
| 2 | P1 | 41 | 0:39–0:58 | |
| 3 | P1→P2 | 48 | 0:58–1:20 | thesis line at 1:20 |
| 4 | P2 | 42 | 1:20–1:40 | **device first described at 1:20 = 26% in** |
| 5 | P2 | 49 | 1:40–2:02 | |
| — | P2 | — | **2:02–3:32** | **LIVE DEMO, 90 s = 29.3%** |
| 6 | P2 | 41 | 3:32–3:51 | |
| 7 | P3 | 49 | 3:51–4:14 | |
| 8 | P3 | 52 | 4:14–4:38 | |
| 9 | P3 | 48 | 4:38–5:00 | |
| 10 | P3 | 17 | 5:00–5:08 | **close falls outside the slot on the full run** |

Section shares: problem/person 26.3% · device+system 13.7% · **demo 29.3%** · post-demo
technical 20.9% · limitation 7.2% · close 2.6%. "What we built" (device + demo + technical)
= 196 s = **64%**.

Stage time, with the demo attributed to its operator: **P1 22.0% · P2 53.1% · P3 24.9%.**

---

## Research findings

### A caveat that matters more than anything below

**No judging criteria for this event exist anywhere in the repo.** I searched `README.md`,
the plan, and the full audit tree. The only relevant trace is the transcript audit's note
that Modal's involvement was *"I know we have to use [Modal] somehow"*, said twice —
recorded there as *"a sponsor/prize obligation, not a technical requirement"*
(`audit/bus-stop-situational-awareness/03-track-3-transcript-and-gesture-vocabulary.md:249`).

Everything below is from **comparable** events, not this one. The single cheapest action
available to this team is to ask the organisers for the actual rubric. If it turns out to
weight presentation at 0%, several of the deck's most expensive choices are unpriced.

### A. What hackathon judges actually score, and how much

**Technical implementation is close to universal and is usually the largest single bucket.
Presentation is frequently worth nothing.** Of the four rubrics found that publish real
percentages:

| Event | Weights | Source |
|---|---|---|
| Amazon Nova AI Hackathon | Technical Implementation **60%**, Impact **20%**, Creativity **20%** | [rules](https://amazon-nova.devpost.com/rules) |
| Microsoft Azure Hack for Accessibility | Technological Implementation **50%**, Potential Accessibility Impact **30%**, Quality of Idea **20%** | [rules](https://azureforaccessibility.devpost.com/rules) |
| HackMIT 2023 | Originality/Innovation/Impact **33%**, Technology **33%**, Learning & Collaboration **33%** | [devpost](https://hack-mit-2023.devpost.com/) |
| CGU Ethical AI Hackathon | five criteria × **20%**, incl. Presentation and Storytelling | [rubric](https://research.cgu.edu/hackathon/home/judging-rubric/) |

Across those: **technical 33–60%, impact 20–30%, presentation 0–20%, and the modal value
for presentation is zero.** Note the direction of the accessibility case specifically —
even at an event branded around accessibility, Microsoft weights *technical* at 50% against
*accessibility impact* at 30%.

**[MLH](https://github.com/MLH/mlh-policies/blob/main/standard-hackathon-rules.md)** uses four
criteria, explicitly equally weighted ("Judges will weigh the criteria equally"):

- **Technology** — "How technically impressive was the hack?… Did the technology involved make you go 'Wow'?"
- **Design** — "For a hardware project, it might be more about how good the human-computer interaction is"
- **Completion** — "Does the hack work? Did the team achieve everything they wanted?"
- **Learning** — "Did the team stretch themselves?… that exploration should be rewarded."

**MLH has no impact criterion, no originality criterion and no presentation criterion.**
If this event runs anything MLH-shaped, the deck's 80-second problem runway scores nothing
directly.

**A structural fact worth knowing:** Devpost, which powers most hackathon judging, cannot
express weights at all — *"The Devpost online judging platform does not currently support
varying weights in criteria"* ([Devpost for Teams](https://help.devpost.team/article/231-how-judging-works)).
Everything on that platform is 1–5 stars per criterion, averaged. So flat weighting is
usually a platform artefact, not a considered choice.

**Sources disagree on whether problem framing is scored at all.** MLH: no. Devpost's
defaults ([judging & voting](https://help.devpost.com/article/64-judging-public-voting)):
yes — "Potential Impact: How big of an impact could the project have on customers?" Do not
assume either.

### B. Where a live demo belongs, and how long

The clearest statement found is **Hack the North's**, and it is unambiguous:

> "Your judging pitch should be focused on a **live demo** of the project — not a slide
> show, product pitch, etc."
> — [Hack the North 2025 rules](https://hackthenorth2025.devpost.com/rules) (5 minutes per team)

[HackHarvard](https://info.hhuh.io/rules/project_rules/) requires a live demo, 3 minutes
max. MLH's organiser guide models science-fair judging at ~3 minutes per team
([judging plan](https://guide.mlh.com/general-information/judging-and-submissions/judging-plan)).
Recorded-demo events converge on 2–3 minutes: MLH digital caps at "2 minutes or less";
OpenAI and Amazon Nova both state that **judges are not required to watch beyond three
minutes**.

**On the specific question — is 90 s of 300 s defensible?** Yes, and the framing in the
brief has it backwards. Against Hack the North's rule the risk is not that 90 s is too
much; it is that 210 s of *non-demo* is a lot. 29.3% is at the conservative end of what
a live-demo-first rubric rewards. I found **no source anywhere** recommending a ceiling on
live demo time in a judged hackathon pitch.

### C. Completeness versus ambition — sources genuinely disagree

Do not let anyone tell you there is a consensus here.

- **MLH pays for both simultaneously.** Completion is 25% ("Does the hack work?") and
  Learning is another 25% ("Did the team stretch themselves?"). MLH also tells hackers:
  *"You are encouraged to present what you have done even if your hack is broken or you
  weren't able to finish."*
- **PennApps tilts hard toward ambition**: Technical Difficulty is "the most important
  criterion", and the rubric asks *"Is it just some lipstick on an API, or were there real
  technical challenges to surmount?"* ([PennApps XVIII](https://pennapps-xviii.devpost.com/))
- **Devpost's own judge panel tilts the other way.** Warren Marusiak (Atlassian):
  *"It's all about that finished product. Is that finished product something that I would
  want to use?"* ([Devpost judging tips](https://info.devpost.com/blog/hackathon-judging-tips))
- **OpenAI files "working" under *Design*:** "Does the project deliver a working or runnable
  project that has a complete, coherent product experience — **not just a technical proof of
  concept**?" ([rules](https://openai.devpost.com/rules))
- **MLH's cheating check inverts the question entirely** — unusual polish is itself a fraud
  signal: *"Is a solo hacker making a really advanced project in a single weekend?"*
  ([cheating check](https://guide.mlh.com/general-information/judging-and-submissions/cheating-check))

### D. Does admitting limitations help or hurt? — the honest answer

This is the deck's biggest deliberate bet, so it deserves the least comfortable answer.

**On the scorecard: it buys nothing.** Across roughly twenty rubrics examined, **no rubric
scores "acknowledges limitations", and none penalises overclaiming as a named criterion.**
That is a clear negative result, not an absence of searching. The honesty rules that do
exist police **attribution, not capability claims** — MLH's DQ-enforced *"You must credit
any tools used and be clear on what you made and what was generated"*
([rules for your hackathon](https://guide.mlh.com/general-information/judging-and-submissions/rules-for-your-hackathon)).

**Off the scorecard: judges behave as though it is scored.** Karen Bajza-Terlouw
(Databricks), on what she marks down: *"Ambiguity is a red flag, and also projects that lack
detail and code."* The same panel describes a team whose slick home page turned out to be
"a lot lighter on code" underneath. Overclaiming is punished in Q&A, not on the sheet.

**Two event-specific facts cut in the deck's favour.** This is an Anthropic-sponsored
hackathon. The **Anthropic Claude 2 Hackathon** scored *Relevancy* as: *"Does the project use
Claude 2 in a **helpful, harmless, and honest** way?"* ([devpost](https://claude2hackathon.devpost.com/)).
And the UK **Claude Hackathon @ Imperial** scored *Ethical Alignment* and *Presentation* as
two of its four criteria ([devpost](https://claude-hackathon-at-imperial.devpost.com/)).
If this event's rubric is drawn from that family, slide 9 is not merely defensive — it is
directly on-criterion.

**But there is a real cost, and it is specific.** MLH's Completion criterion is *"Does the
hack work?"* at 25%. Slide 9 states that the output channel — the one thing that puts
information on a DeafBlind person's body — does not work as designed. That is a direct hit
on the largest or joint-largest bucket in most rubrics.

**Net:** disclose, but understand what you are buying. You are buying protection on
Technical/Completion in Q&A (where 33–60% of the score lives), and possible credit on an
ethics/HHH criterion if one exists. You are not buying points for candour itself. See
BLOCKER 3 for the placement problem this creates.

### E. What makes judges disengage

Thin, and I want to be clear that it is thin. What I have is first-party judge commentary
from Devpost's panel rather than the broader post-mortem literature:

- Richard Moot (Square): *"The demo video gives the most amount of scope."* and *"A project
  that really stands out is one that was clearly considering the judging criteria."*
- Karen Bajza-Terlouw (Databricks): *"Ambiguity is a red flag."*
- Warren Marusiak (Atlassian): *"It's all about that finished product."*
  — all [here](https://info.devpost.com/blog/hackathon-judging-tips)

**On judging bias, one methodological point is worth more than the anecdotes.** HackMIT does
not use a scoring rubric in practice; it uses [Gavel](https://github.com/anishathalye/gavel),
a pairwise-comparison system, because — in its author's words — *"Assigning numerical scores
to entries is not a task that people are good at"*, judges see only a small fraction of
entries, and results otherwise depend on judging order
([design writeup](https://anishathalye.com/designing-a-better-judging-system/)). Order
effects and score non-comparability in this setting are real enough that a major hackathon
re-engineered around them.

### F. Presentation format and slide density

MLH tells organisers to brief judges **not** to focus on business:

> "It is important to mention to your judges about the judging criteria and **not to focus on
> the business aspect of the hackathon. This highly separates a hackathon from a startup
> contest.**"
> — [MLH judges communication](https://guide.mlh.com/general-information/judging-and-submissions/judges-communication-and-recruiting)

and, in its judging plan, *"Focus on learning over profit."*

I found **no hackathon rubric that scores slide design, bullet density, or deck craft.**
The one rubric that scores storytelling at all (CGU, 20%) bundles it with presentation
generally, not with visual style.

### G. Does opening with a personal story work? — the evidence, and one myth to stop repeating

**First, kill the number you have probably heard.** "Stories are recalled twice as well /
read twice as fast" is not citable. It traces to
[Dahlstrom 2014, PNAS](https://pmc.ncbi.nlm.nih.gov/articles/PMC4183170/) — a *perspective
piece reporting no original data*, whose supporting refs are book chapters. Willingham, the
usual second-hand source, actually writes *"Subjects remember about **50 percent more** from
the stories"* and gives no speed ratio
([full text](https://mrbartonmaths.com/resourcesnew/8.%20Research/Explicit%20Instruction/The%20Privileged%20Status%20of%20Story2.pdf)) —
and miscites his own source. Do not put "2×" on a slide or in an answer.

**The real number is g ≈ 0.55.** [Mar, Li, Nguyen & Ta 2021, *Psychonomic Bulletin & Review*](https://pmc.ncbi.nlm.nih.gov/articles/PMC8219577/) —
37 articles, 78 samples, **N = 33,078**, 150 effect sizes:

| | g | 95% CI |
|---|---|---|
| Overall | .55 | [.31, .79] |
| **Memory / recall** | **.72** | [.43, 1.01] |
| Comprehension | .48 | [.21, .75] |

"Twice as well" would need d ≈ 3, about four times this. The authors' own caveats are
severe: **I² = 98%**, publication bias concentrated *precisely* in the memory subset
(p = .02 vs .30 for comprehension), all moderators non-significant. Their closing line:
*"These results should not be interpreted as a suggestion to force all information into a
narrative form."*

**For technical content the advantage shrinks or disappears.**
[Wolfe & Mienko 2007](https://eric.ed.gov/?id=EJ775602) (N=90, *BJEP*): ***"Learning and
recall did not differ as a function of text genre overall"*** — and higher-knowledge
readers did *better* from expository text. Tobler et al. 2024 reports g = 0.16 across 30
studies and >5,300 students, but **its full text was unreachable — unverified.**

**Narrative buys gist and spends precision.** Fuzzy-trace theory
([Reyna](https://pmc.ncbi.nlm.nih.gov/articles/PMC4268540/)): gist outlives verbatim detail.
[Salovich, Imundo & Rapp 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC9255489/): stories
reliably implant false factual beliefs — error rate **.50 vs .34** control (z = 7.15,
p < .001), replicated twice. The mechanism that makes stories stick is the same one that
fabricates detail.

**And narrative used as decoration actively harms recall.** The "seductive details" line of
work: Davis et al. 2026 (N=62) found the control condition beat added narrative detail on
free recall, **g = 1.03 against**; Kienitz et al. 2023 (N=247) found learners rated
seductive details *more* relevant and spent longer on them, and recalled *less*. Noetel et
al. 2021's meta-meta (29 reviews, 1,189 studies, 78,177 participants) lists "removing
seductive details" as a significant positive design principle.

**The reconciliation, and the test to apply to this deck:** narrative as **format** helps
(g ≈ .55); narrative as **decoration** hurts (up to g ≈ 1.0 against). *Whether a story helps
depends on whether it carries the content or merely surrounds it.* See BLOCKER 3 and Q8 —
this deck's story currently brackets the technical middle rather than running through it.

**One caution the deck should know about:** the identifiable-victim effect — one named
person outperforming a statistic — is the usual theoretical justification for exactly this
deck's opening. My researcher reports that it **does not survive bias correction
(r = 0.002, BF₀₁ = 14.93)**, but **returned no source URL for that figure**, so treat it as
unverified and do not cite it either way. What *is* verified is smaller and narrower:
transportation reduces counterarguing at **ρ = –.20** (k = 7, N = 2,373, CI [–.34, –.05]),
from van Laer's meta-analysis. Real, but modest.

**Bottom line for the deck:** opening with a real person is defensible on the narrative-format
evidence and is not a cliché *per se*. But the honest version of the claim is "stories reach
people who would otherwise not attend, and convey gist well" — not "stories are remembered
better than data." Do not defend the opening in Q&A with a number.

### H. What I could not source — read this before trusting Part 1

**The session's web search budget was exhausted (200/200) part-way through.** Two of the four
research streams I commissioned did not return. I have **no verified sources** for:

- **Accelerator guidance** — YC, Techstars, Sequoia, 500 Global. No time-split numbers, no
  YC position on whether to demo at all, no Kevin Hale material. The brief asked for this
  first and I do not have it. Sections A–F rest entirely on hackathon rubrics, which is the
  more directly applicable body of evidence for this event but is not what was asked for.
- **The psychology of disclosed weakness** — pratfall effect (Aronson), stealing thunder
  (Williams et al.), inoculation / two-sided messaging. **Section D is grounded in rubrics
  and judge quotes only, not in the persuasion literature.** Given that slide 9 is the
  deck's biggest deliberate bet, this is the gap I would close first.

Partially covered: presentation science returned on **story vs data** (section G) but not on
primacy/recency transfer to spoken talks, retention figures, Duarte's sparkline, Mayer's
redundancy principle, or opening with silence.

Where I reason about memory, endings and the black-screen open below (BLOCKER 3, Q3, Q7, Q8),
**I am reasoning from the deck's own structure, the rubric evidence and the narrative
findings in G — not from cited research on serial position in talks.** Treat those as argued
judgement, not sourced fact.

I have also not repeated fact-level findings already covered by
`slides/review/narrative-review.md` and `slides/review/slop-review.md`; several remain open
and I flag them only where they bear on pitch structure.

I have also not repeated fact-level findings already covered by
`slides/review/narrative-review.md` and `slides/review/slop-review.md`; several remain open
and I flag them only where they bear on pitch structure.

---

## Where the deck already matches best practice

1. **The demo is 29% of runtime and sits in the middle.** Against Hack the North's
   demo-first rule this is right, and if anything conservative.

2. **The problem stands on primary legislation, not sentiment.** SI 2023/715 reg 7 (the duty
   runs only to passengers "on which they are travelling"), plus DfT's own guidance conceding
   the gap and filing the fix under "further steps you can choose to take". Very few hackathon
   decks have a problem section that survives a hostile read.

3. **Slide 3 pre-empts the four obvious objections at 0:58**, before a judge can form them —
   and refuses to rubbish the alternatives ("All good tools") before pivoting. That single
   phrase is what stops a domain-literate judge writing the team off.

4. **Slide 8 is the direct answer to the sharpest critique in any published rubric.**
   PennApps asks "Is it just some lipstick on an API". "The Claude API is stateless. Modal
   isn't" is precisely that answer — and it is the one Modal argument the plan concedes it
   can actually defend, having ruled out both cost and GPU throughput at 2 fps.

5. **No market slide, no TAM, no ask.** Correct here, per MLH's explicit instruction that
   judges not focus on the business aspect.

6. **Local-first safety with a stated reason** — "If the network dies mid-street, the safety
   sensing doesn't." A decision with a defence is what a Technology criterion rewards.

7. **Demo failure is scripted in three branches matched to *what* failed**, and none of them
   apologise or blame the network reflexively. Better than most teams manage.

8. **The recovery path actually works.** Verified in `main.js`: number keys jump by
   `data-slide`, so "press 6" lands from any scroll position.

9. **Claim boundaries are enforced in the wording, not just the docs** — "can be heard, not
   felt" is passive on purpose; "Sense estimates" not "there are". This is exactly what
   protects the Technical/Completion score during Q&A.

10. **The ledger is computed from the deck and is now correct.** Recount agrees exactly.

11. **No bullets; one idea per surface; the serif is used by exactly one CSS rule** and so
    appears only on slides 1 and 10. The callback has a genuine typographic signal, even
    though `visual-review` 13 correctly measured that six slides share the bottom-left
    composition.

---

## BLOCKER

### 1. The demo is 29% of the pitch and has nine scripted words

**Where** `slides/deck/index.html`, slide-5 notes, `DEMO · P2 · 90 s` block.

**Problem** Ninety seconds — the largest single block in the pitch, and the only part where
Technology and Completion are actually demonstrated — carries **one scripted line of nine
words**: *"Those tones stand in for vibration. Heard, not felt."* The three contingency
branches total **39 words**. The failure path is four times better prepared than the success
path. Everything else in this deck is counted to the syllable; the highest-stakes 90 seconds
is improvised.

Three consequences follow, and each is independently serious:

- **"88" is never spoken.** Verified across every `[P#]` line: the number appears only in a
  stage direction (`:304`) and a note (`:373`). The deck's title question is *"Which bus is
  this?"* and the answer is never said out loud. The prop is excellent and legible
  (`slides/props/bus-88-a.png` reads **88 CLAPHAM COMMON**) — but the prop is raised toward
  the phone camera, not the room.
- **The audience's only channel is audio, and the plan says the audio is confusable.** The
  plan rates `P2 SIREN` vs `P5 BUS ARRIVING` confusability **"High"** and instructs "Check
  semantic clarity in the audio demo" (`plan/…:519`). Neither `/output` (a USB WebSerial
  monitor showing `leftHz`/`rightHz`) nor `/capture` (an operator console with request logs)
  is an audience-facing legend.
- **The visual channel is dead for 90 seconds.** The instruction is "hold this slide", and
  `visual-review` 16 measured that slide as "the default architecture diagram, and a judge
  who has seen forty decks has seen it forty times", at 0.69% ink coverage with the bottom
  quarter empty.
- **The thesis is last in the demo order** (steps 3–4). Any overrun or failure kills the
  central claim specifically. The contingency line for that branch is graceful, but the
  audience then never sees the thing the whole pitch is about.

**Evidence** Rubric weights put technical implementation at 33–60% and presentation at
0–20% (mode 0) — [Nova](https://amazon-nova.devpost.com/rules) 60/20/20,
[Azure](https://azureforaccessibility.devpost.com/rules) 50/30/20,
[MLH](https://github.com/MLH/mlh-policies/blob/main/standard-hackathon-rules.md) with no
presentation criterion at all. [Hack the North](https://hackthenorth2025.devpost.com/rules):
the judging pitch "should be focused on a live demo of the project — not a slide show".

**Fix** Script the demo to the same standard as the slides — roughly eight narration beats
keyed to events, each under fifteen words, in the deck's own voice. Name every event as it
fires so SIREN and BUS cannot be confused by ear. It must contain a line at the moment P6
plays: **"That's the eighty-eight."** Optionally give the audience a legend — even a
projected four-step tracker that ticks as each step completes.

### 2. Slide 6 shows unmeasured estimates 19 seconds after the audience watched it run

**Where** `index.html:343–349`; on-screen credit reads `Estimated · latency budget · not yet
measured`.

**Problem** The audience has just watched the system work. The very next slide puts two
numbers on screen and tells them, in writing, that nobody measured them. That converts an
honesty signal into a **diligence** signal — measuring was trivially available and was not
done — and it hands a judge a free question at the exact moment the team is strongest.
This is not the same kind of admission as slide 9: the buzzer limitation is a real
constraint that cannot be resolved in the time; the latency figure is a number they could
have obtained with a stopwatch during rehearsal.

**Evidence** Open after two prior review passes. `narrative-review` pass 2 states the case
exactly: *"A tilde and a credit line change the number's status, not its presence."* The
deck's own note orders the fix and it has not been done: *"TIME A REHEARSAL RUN. Then
replace both figures with what you actually saw."* Devpost judge Karen Bajza-Terlouw:
*"Ambiguity is a red flag."*

**Fix** Time three rehearsal runs, take the median, and change the credit to
`Measured at rehearsal · <date>`. If that is genuinely impossible, **cut slide 6** and move
its one real idea — *"You learn a bus is here before you learn which one"* — into demo
narration, where it is observable rather than asserted. That also buys 19 seconds, which
BLOCKER 3 needs.

### 3. The last 38 seconds contain no statement of what the team achieved

**Where** slides 9 (4:38–5:00) and 10 (5:00–5:08).

**Problem** The final two beats are (a) four things that do not work — buzzers can't be
felt, 70 Hz didn't help, the tones are stand-ins, nothing is validated — and (b) a
restatement of the *unchanged* problem: *"Hasan's grandfather still asks a stranger which
bus just arrived. We'd like him to stop having to."*

Nothing in the last 38 seconds says the device identified a bus or read a route number.
The closing position — the one an audience is most likely to retain — holds a limitation
followed by the status quo. The deck's own outline says of slide 9 and the callback:
*"Those are the two things a judge remembers."* Taken at face value, the deck has decided
that what a judge remembers should be a disclaimer and an unsolved problem.

This is not an argument for removing the honesty. The sentence is a project constraint
(`PROMPT.md`: "Mandatory honesty constraint (do not remove from any slide)") and it is the
right call. It is an argument about **what follows it**.

**Evidence** See section D: candour scores nothing on any rubric found, while Completion
("Does the hack work?") is 25% at MLH and technical implementation is 50–60% at Nova and
Azure. Ending on the limitation spends the most valuable position in the pitch on the one
message that has no scoring home. *(Reasoning from rubric weights and deck structure —
the presentation-retention literature that would strengthen this was not sourced; see G.)*

**Fix** Keep slide 9 exactly as written. Change slide 10 to carry one clause of achievement
before the aspiration — two beats, what was done and what has not been. Something with the
shape of: *"Today it told him the 88 had arrived. It has never been on his wrist."* Same
honesty, same callback, same composition — but the last thing in the room is the thing that
worked.

---

## WARNING

### 1. There is no presenter view and no clock

`class="notes"` blocks live in `<script type="text/plain">`; nothing in `js/` or `css/`
reads them, there is no `@media print`, and there is no timer in `main.js`. Three people
must deliver 473 words whose claim boundaries depend on **verbatim** delivery ("can be
heard, not felt" is passive on purpose) with no cue surface and no sense of pace, in a
pitch that runs 8 s over its slot on the full script. **Fix:** a `?notes` presenter pane or
a printed cue card per presenter, plus a visible elapsed clock.

### 2. Nothing a judge can write on a scorecard

No slide states what the thing is in one sentence. The closest is slide 4's *"So we built
the thing that answers it"*, which needs slide 3's question as its antecedent. The project
has no name on any surface — `<title>` is "Which bus is this?" and never appears on screen —
and no team member is named. Richard Moot (Square): *"A project that really stands out is
one that was clearly considering the judging criteria."* **Fix:** one sentence, early —
e.g. *"A wrist device that tells a DeafBlind person which bus just pulled in."*

### 3. P2 holds 53% of the stage

P1 67.8 s (22.0%), P2 164.3 s (53.1%), P3 76.6 s (24.9%). The word ledger hides this because
the 90 s demo is unattributed — and `outline.md:51` now says *"P2 carries the most words"*,
which is false after the last edit (P3 is heaviest at 166). That file warns against exactly
this drift at `:29`. **Fix:** hand slide 5 to P1 so P2 arrives at the demo fresh, or let P3
narrate the demo while P2 operates the hardware.

### 4. Axiometa is never named, at Axiometa's own hackathon

Zero occurrences of "Axiometa", "Genesis", "ESP32" or "Anthropic" in the deck. Claude
appears 6 times, Modal 10. The event is the *Axiometa × Anthropic Hardware Hack*
(`README.md`). Slide 4 says "A board you wear" where it could say which board. **Fix:** one
word on slide 4, or change the `P2 RANGE`-style callouts to name the board once.

### 5. No scope statement

Nothing says what was built during the event. MLH Completion asks *"Did the team achieve
everything they wanted?"*; MLH Learning asks *"Did the team stretch themselves?"*; and MLH's
cheating check treats unusual polish as a fraud signal. A deck this finished, with no scope
statement, invites the wrong question. **Fix:** one clause — e.g. *"A day and a half,
firmware to phone."*

### 6. A verbatim seven-word clause is spoken twice, by two different presenters

Slide 5 `[P2]`: *"Claude reads the number off the front."* Slide 8 `[P3]`: *"Claude reads
the number off the front. YOLO tells us when to ask."* Identical clause, two voices, 2.5
minutes apart, in a deck that is 8 s over its slot. **Fix:** rewrite slide 8's opener; the
"YOLO tells us when to ask" half is the new information and can stand alone.

### 7. The full run does not fit, and the tight run costs a callback

5:08 full / 4:49 tight. Slide 10 runs 5:00–5:08, so the close is **outside the slot** unless
every `[CUTTABLE]` is dropped — meaning the tight run is the run, not the fallback. But cut
#5 of 6 is slide 1's *"I'll come back to that"*, which is the forward reference that makes
slide 9 read as planned rather than defensive. **Fix:** find the 19 s elsewhere (BLOCKER 2's
fallback yields exactly that) and protect the slide-1 setup.

### 8. Slide 2 carries six facts in 19 seconds, and the screen commits to the weakest one

Spoken: 450,000 → more by 2035 → the government definition → three named difficulties → the
law → the on-board gap. On screen: one number. The strongest asset in the whole deck is the
legal gap — primary legislation — and it arrives last, with the note instructing "deliver
flat". Meanwhile `facts.md` says plainly: *"The bus argument does not need a population
statistic. It stands on primary government sources alone, which is far safer."* The slide
puts the modelled estimate on screen and the primary-source argument in the mouth. **Fix:**
consider putting the legal line on screen and letting 450,000 be spoken.

### 9. The only mid-slide handoff buys nothing

P1 → P2 lands mid-slide-3 on the communicator-guide line, and the deck flags that it needs
rehearsal. Moving it to the 3/4 boundary is strictly better: P1 asks *"which bus is this?"*
and P2 — who built it — answers *"So we built the thing that answers it."* It removes the
deck's only mid-slide voice change and moves 28 words from the presenter holding 53% of the
stage to the one holding 22%.

---

## SUGGESTION

### 1. The strongest unused fact in `facts.md` props up slide 0

Guide Dogs 2014 (n=818): only **35%** of drivers always tell a blind passenger the bus
number *even when asked*, down from 55% the year before. `facts.md` stars it as *"the one
that legitimately supports the pitch"* and sanctions the phrasing. Slide 0 says *"So he asks
a stranger. Every time."* and never says whether asking works. Thirteen words would turn an
anecdote into a systemic failure. (Also raised as `narrative-review` SUGGESTION 5; still open.)

### 2. "More by 2035" says nothing

Four words carrying no information, where `facts.md` sanctions *"rising to over 610,000 by
2035"*. Either give the number or cut the clause and spend the second in the close.

### 3. Residual staleness

Slide 10's note still says *"nine minutes of argument ago"* for a five-minute deck
(`slop-review` WARNING 3, unfixed). `outline.md:51`'s presenter-load claim is now inverted.
`slides/deck/frames/detail/` (60 frames, 2.3 MB) is rendered but referenced by no slide.

---

## The eight questions, answered

**1. Is the arc right?** Broadly yes, and better than most. Problem 26% / built-thing 64% /
close 3% is a sane split for a hackathon, and the post-demo technical run (7 sensing, 8
architecture) is well aimed at an Axiometa+Anthropic panel. Two things are misplaced: slide
6 sits in the position of maximum leverage and spends it on unmeasured numbers, and the
close spends the final beat restating the problem rather than the result.

**2. Is the demo in the right position at the right length?** Yes on both, and the worry is
inverted. 90 s of 300 s is at the *conservative* end for an event type whose clearest
published guidance says the pitch should be a live demo, not a slide show. The problem is
not its length or position — it is that it is unscripted (BLOCKER 1).

**3. Does the opening earn the 18 s of black?** It is actually 16.6 s, 5.4% of the pitch, and
yes — with one caveat. A voice starting at t=0 over darkness reads as deliberate within about
three seconds, and the note correctly refuses the "close your eyes" stunt. The risk is not
the black screen; it is that **the device is not described until 1:20**, 26% in. Those are
separable problems. Keep the black screen; add one sentence saying what this is (WARNING 2).
*(I could not source presentation research on opening with silence — see G.)*

**4. Does the honesty on slide 9 help or hurt?** Mixed, and the honest answer is less
flattering than "it's your differentiator". **On the scorecard it buys nothing** — no rubric
found scores acknowledging limitations, and none penalises overclaiming as a named
criterion. **It costs you on Completion** ("Does the hack work?", 25% at MLH), because the
thing disclosed is not peripheral: the tactile channel is the entire mechanism by which a
DeafBlind person receives the answer. **It protects you in Q&A**, which is where the
technical score is really settled, and where "Ambiguity is a red flag" gets applied.
**And at this specific event it may score directly** — the Anthropic Claude 2 Hackathon
scored "helpful, harmless, and **honest**", and Claude @ Imperial scored Ethical Alignment.
Keep it. Do not let it be the last thing said (BLOCKER 3). Note also that slide 9's kind of
honesty is load-bearing and correct, while slide 6's is a hedge around a number you could
simply measure — judges read those two very differently.

**5. Is 11 slides right for 5 minutes?** Yes. It is ~19 s per slide, which sounds fast but
isn't, because each surface holds one statement that takes 2–4 s to read. The count is not
the problem; slide 6 is the only slide that does not earn its 19 s.

**6. Is the three-way split sensible, and is P2 overloaded?** The word split is now almost
even (147/160/166 — P3 is heaviest). The **stage-time** split is not: P2 holds 53%, P1 22%,
P3 25%. So yes, P2 is overloaded — but not for the reason the outline states. P2 has the
fewest words and the most stage time, because the 90 s demo is unattributed in the ledger.
The cheapest fixes are moving the slide-3 handoff to the slide boundary (WARNING 9) and
giving slide 5 to P1.

**7. The single weakest moment.** Slide 6, at 3:32 — nineteen seconds spent telling a room
that just watched the system run that you did not measure it. Replace it with measured
numbers from a rehearsal timing; if you cannot, delete the slide and move its one good idea
into the demo narration, where the audience can see it happen.

**8. What will a judge remember 10 minutes later?** "Hasan's grandfather", a black screen,
some beeps, and that the team said it doesn't vibrate yet. The person will land — the serif
appears on only two slides and the words are identical, which is a real signal. But notice
what is missing from that list: **the device, and the fact that it worked.** The demo's
strongest sensory artefact is a beep, and the deck tells the audience twice that the beep is
not the real output. Meanwhile "88" — the answer to the question the deck is named after —
is never spoken. So no: that is not quite the thing you want remembered. You want
"the team who built the thing that told a DeafBlind man the 88 had arrived, and who were
straight about what's left." Right now the second half is louder than the first.

---

## The single highest-leverage change

**Script the 90-second demo to the same standard as the slides, and make sure "That's the
eighty-eight" is said out loud.**

It is 29% of the pitch, it is the only stretch where the criteria that actually carry weight
(Technology, Completion) are demonstrated rather than asserted, and it currently contains
nine scripted words against 39 for the failure branches. Everything else in this deck has
been counted, sourced and defended to the word. The most important ninety seconds has not
been written at all.

Doing this also absorbs two other problems: it gives slide 6's one good idea a better home
(BLOCKER 2's fallback), and it puts the achievement into the room in the presenter's own
voice, which is what the close is currently missing (BLOCKER 3).

Second priority: fix or cut slide 6. Third: give slide 10 one clause of achievement before
the aspiration.
