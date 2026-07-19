# Pitch-practice review

Reviewed 2026-07-19 against `slides/deck/index.html` as it stood after the ~01:35 edit.
**The deck moved twice during this review.** Every number below was recomputed against the
latest state, not the state at the start. Where a finding was closed by one of those edits
I say so rather than raising it stale.

**3 BLOCKER / 11 WARNING / 3 SUGGESTION.**

This is a pitch-craft review, not another fact check. It does not repeat findings already
made in `narrative-review.md`, `slop-review.md` or `visual-review.md`. **Two of its three
blockers reopen items that `sign-off.md` consciously accepted** (slide 6's estimates, and
the quiet close) — in both cases because the prior passes asked a different question than
the one that decides a judged pitch. I say why in each finding rather than simply
overruling them.

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

**Now the persuasion literature, which arrived late and is less friendly than the folklore.**
All of the following came via delegated research threads rather than my own fetching; I have
preserved their confidence markers rather than laundering them into certainty.

**First, stop citing the pratfall effect.** Aronson, Willerman & Floyd (1966) — the study
everyone invokes for "a blunder makes a competent person more likable" — **was never
statistically significant on that half. N = 48, p = .18, never replicated.** If a judge asks
why you disclosed, do not reach for it.

**The finding that matters most for slide 9 — two-sided messaging.** Disclosure pays **only
when the counterargument is refuted**, not merely acknowledged: refutational **r = +.077**
versus non-refutational **r = −.049**, k = 107. *Naming a weakness without answering it is,
on this evidence, worse than not raising it at all.* This is the single most actionable
result in the whole review, and it is a scalpel rather than a hammer — it does not say
"don't disclose", it says "don't disclose bare".

**Corroborated in a funding context.** Bolinger, Brownell & Covin, *Strategic
Entrepreneurship Journal* 19:283–312 (N = 300/141/188),
[doi](https://doi.org/10.1002/sej.1525), verbatim: *"**While risk disclosure may harm
financing efforts**, we reveal that using a tactic we call '**compensation**' — in which
risk disclosures are packaged with information meant to mitigate the risk — **enhances
financing efforts**… entrepreneurs should disclose risk, but should take care to do so in a
specific manner."* **Caveat: crowdfunding, not VC, not hackathons.**

**And a boundary condition on which kind of flaw.** Howe & Menges, *OBHDP* 186 (2025),
[doi](https://doi.org/10.1016/j.obhdp.2024.104388): *"Disclosing agency-excess flaws does not
generate closeness or elicit investment… Disclosing agency-deficit flaws can generate
closeness and result in investment, **but only among investors who possess the same flaw**."*
Capability-deficit flaws only; overconfidence-type flaws never pay. *(Sample sizes
unverified — ScienceDirect 403.)* The deck's disclosure is capability-deficit type, which is
the better category to be in.

**The strongest null, and a calibration warning.** Kalvapalle, Phillips & Cornelissen (2024),
*Academy of Management Annals* 18(2):550–599 reviews **252 pitching papers since 1986**. The
words *candor, candour, honesty, weakness, humility* appear **zero times**; *disclosure*
appears **once** ([PDF](https://escholarship.org/content/qt6994466p/qt6994466p.pdf)).
**Anyone claiming "research shows investors reward admitting weakness" is overstating a
literature of roughly two papers.** That includes anyone on this team defending slide 9 in
Q&A.

**The distinction that should change what the deck cuts.** Huang & Pearce (2015) found
person-perception beat business data outright (β = 1.15, p < .01 vs β = .10, n.s.) — but the
manipulation used to *create* the positive perception was a founder quote admitting
near-total failure (months behind on the mortgage, unable to pay staff). That is **candour
about struggle and persistence, not candour about a flaw in the product.** My researcher
called this the most useful thing in the thread and I agree. See WARNING 11: the deck
currently protects the bare product-flaw sentence and marks the struggle narrative
`[CUTTABLE]`.

**Practitioners disagree four ways — do not flatten this.**

1. **Bolinger et al.** — bare disclosure harms; disclosure + mitigation helps.
2. **Howe & Menges** — helps only for capability-deficit flaws, only with a matched judge.
3. **Paul Graham**, [*How to Convince Investors*](http://www.paulgraham.com/convince.html) —
   candid **if asked**, never volunteer a risks slide: *"the best response is neither to bluff
   nor give up, but instead to explain how you'd figure out the answer"*; *"that worry will
   now be out in the open instead of being a gotcha"*; *"As long as you stay on the territory
   of truth, you're strong."* **This directly conflicts with Bolinger** on whether to disclose
   proactively. Unresolved.
4. **Sequoia / [Sam Altman](https://playbook.samaltman.com/)** — omit risk from the deck
   entirely; *"Always explain why you could be a huge success."* No major VC firm recommending
   a dedicated risks slide was found (degraded search — "not found", not "does not exist").

**One more calibration point.** Parhankangas & Ehrlich (2014), *JBV* 29(4):543–564 found
angels prefer *"the **moderate** use of positive language"* — **both extremes lose**, neither
pure hype nor heavy self-deprecation. Slide 9 is 22 seconds of four consecutive negatives,
which sits toward the self-deprecation end.

**Two further threats to "honest substance gets judged on merit."** Cottle & Anderson (2020),
*JBV Insights* 14:e00190: *"investors are unable to distinguish between the presence of a
well-prepared script and an entrepreneur who is exaggerating"*; *"sometimes exaggeration
works."* And Brooks, Huang, Kearney & Murray (2014), *PNAS* 111(12):4427–4431: investors
preferred male-presented pitches *"even when the content of the pitch is the same."*

**One finding that threatens the bet structurally.** Maxwell, Jeffrey & Lévesque (2011,
*Journal of Business Venturing*) report that angel investors screen **non-compensatorily** —
they reject on a *single fatal flaw* rather than weighing strengths against weaknesses. If
that decision rule holds, volunteering an unrefuted weakness is far more dangerous than a
"pros and cons net out" model implies, because there is no netting out. *(Relayed via my
researcher; existence and ~480 citations verified, the underlying numbers not.)*

**Two reasons I do not think this sinks slide 9, and one reason to take it seriously anyway.**
First, non-compensatory screening is an *angel* finding, and hackathon judging is
compensatory by construction — Devpost literally averages 1–5 stars across criteria
(section A). A rubric cannot express "one flaw, reject". Second, the disclosed flaw is
paired with a resolution path in the same breath ("Real motors next"), which is what
separates a disclosed *constraint* from a disclosed *defect*. But third, and this is the
part to take seriously: **the holistic prizes — "best overall", sponsor picks, anything
decided by discussion rather than by sheet — are exactly where non-compensatory screening
would apply.** Slide 9 is safest where the rubric is doing the work and most exposed where a
room is arguing about a shortlist.

**A related result on negative cues.** Elsbach & Kramer (2003, *AMJ* 46(3), 283–301,
[PDF](https://leeds-faculty.colorado.edu/dahe7472/Elsbach%202003.pdf)) coded Hollywood pitch
meetings and found a sharp asymmetry: **15 cues signalling creativity against only 4
signalling uncreativity — and the 4 negatives were weighted far more heavily.** They also
report irreversibility: *"it appears that pitchers could not recover from these early
negative categorizations later in a pitch."* **Method caveat, which matters:** 36 informants
but only **12 live pitches** (16 were re-enactments during interviews), qualitative, no
effect sizes — and the widely-repeated "first few seconds" claim is an *inference from
retrospective interviews*, not a timed measurement. Note also that Elsbach's negatives are
about the *pitcher* reading as "too slick, mechanical, or rehearsed", not about candid
disclosure of a project limitation, so do not over-transfer it.

**Net.** The sentence is mandatory and it is true, so the question was never whether to say
it. The evidence gives three specific instructions about *how*:

1. **Never bare.** Refuted disclosure r = +.077, unrefuted r = −.049. Every disclosed
   limitation needs its mitigation in the same breath — Bolinger's "compensation".
2. **Prefer struggle to defect.** The candour that demonstrably moves people is candour about
   what you fought and what it cost (Huang & Pearce), not an inventory of what is broken.
3. **Moderate, not maximal.** Both extremes lose (Parhankangas & Ehrlich). Four consecutive
   negatives is a lot.

You are buying protection on Technical/Completion in Q&A (where 33–60% of the score lives)
and possible credit on an ethics/HHH criterion if one exists. You are not buying points for
candour itself — that literature is roughly two papers — and in holistic prize discussions
you may be handing over a single-flaw rejection. See WARNING 11 for the specific line the
deck has mis-prioritised, and BLOCKER 3 for the placement problem.

**Overall caveat on everything in D and E.** McSweeney et al. (2025), *JBV*, systematically
reviewed **173 pitching articles, 2000–2024** and reports: *"none of the articles in our
review were replication studies"*
([PDF](https://www.thallison.com/wp-content/uploads/2025/05/Pitching-Review-2025-JBV.pdf)).
The *pattern* across these findings is consistent and worth acting on. **The individual
coefficients are not trustworthy.** Do not quote a beta at a judge.

### E. What makes judges disengage

First-party judge commentary from Devpost's panel, then the academic work, which is more
useful and considerably more unsettling.

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

**The strongest quantitative result in this literature, and it is uncomfortable.** Tsay
(2021), *Academy of Management Discoveries* 7(3), 343–366
([PDF](https://discovery.ucl.ac.uk/id/eprint/10117864/3/Tsay_Visuals%20Dominate%20Investor%20Decisions%20about%20Entrepreneurial%20Pitches_AAM.pdf))
— 12 studies, 1,855 participants, picking the real winner from three finalists (chance = 33%):

| Condition | Correct |
|---|---|
| **Silent video** | **52.2%** (t(171) = 11.82, P < .001) |
| Video with sound | 43.6% |
| **Sound only** | **35.6% — indistinguishable from chance** (n.s.) |

**Adding the audio made judges worse.** Meanwhile **63.5% of participants said auditory
content was the most informative** (χ² = 228.95, P < .001). Clark (2008) found the same
pattern in real angels: presentation score predicted follow-up, and angels explained their
decisions purely in terms of substance, apparently unaware. **Pitch judges cannot introspect
on what actually drives them.** For this deck that cuts two ways — it vindicates the visual
investment, and it makes the dead visual channel during the 90-second demo (BLOCKER 1) the
single most expensive omission in the pitch, because that is the channel that predicts
outcomes.

**Preparedness reads; theatre does not.** Chen, Yao & Kotha (2009), *AMJ* 52(1):199–214, a
field study with 55 real investors: *"**preparedness, not passion, positively impacted
decisions to fund ventures**"* — preparedness β = 1.69, p < .01; passion β = −0.09, n.s.
**Caveats:** "passion" was actor-performed theatre over identical content, so this shows
*added theatre* is worthless rather than that conviction is; and the paper does not test
candour at all. It is nonetheless the closest thing to direct evidence that an unscripted
demo costs you (BLOCKER 1).

**On judge fatigue and order effects — two clean negatives.** My researcher found **no study
of order effects within startup pitch competitions or demo days**, and **no rigorous
empirical study of how human judges evaluate hackathon projects at all.** What exists is
outcomes research (Medina Angarita & Nolte 2020, CSCW), large-scale project analysis that
sidesteps judges entirely (Falk et al., CHI '25 — 193,353 projects, uses the winner tag as an
*input feature* and never studies the judging that produced it), and two 2026 LLM
auto-grading papers that never validate against human judges. Everything else is blog-level.
**If someone tells you what hackathon judges do at pitch 40, they are guessing.**

**Do not blend the two order-effect literatures — they point opposite ways.** Sequentially
*scored* contests favour **later** performers. A two-item **forced choice** favoured the
**first**: Brooks et al. Study 2, **57.97% (302/521) funded the pitch they watched first**,
β = 0.177, SE = 0.039, P < 0.0001, order randomised. Eurovision (Antipov & Pokryshevskaya):
later performers rank better, **televoting p = 0.020 (significant), jury p = 0.081 (not
significant at .05)** — and two independent transcriptions disagree on the correlation
magnitudes while the p-values match, so **cite the p-values, not the r's.**

**One number to stop repeating.** Gompers et al. (2020), *JFE*, surveyed 885 VCs at 681
firms: roughly **100 opportunities considered per closed deal**, and **95% cite the
management team as important, 47% as the single most important factor** versus 37% for all
business factors combined. But that paper does **not** measure screening speed — the widely
circulated "investors spend 3 min 44 sec on a deck" figure is **DocSend marketing research,
not peer-reviewed.**

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

**The session's web search budget was exhausted (200/200) part-way through**, and the
research threads returned in stages. Two gaps remain, and one earlier gap has since closed:

- **Still missing — accelerator time-split guidance.** No YC / Techstars / Sequoia / 500
  Global numbers for how a five-minute pitch should be divided, no YC position on whether to
  demo at all. Sections A–F rest on hackathon rubrics, which is the more directly applicable
  evidence for this event but is not what the brief asked for first. What *did* arrive from
  that world is Graham, Altman and Sequoia on risk disclosure (section D), and Gompers on VC
  screening (section E).
- **Still missing — presentation science on structure.** Primacy/recency transfer to spoken
  talks, retention figures, Duarte's sparkline, Mayer's redundancy principle, and evidence on
  opening with silence were never retrieved. The narrative thread returned only on **story
  versus data** (section G).
- **Now closed — the psychology of disclosed weakness.** Section D was originally written
  from rubrics and judge quotes alone. The persuasion literature arrived late and **partly
  reversed** that draft: the pratfall effect turns out to be a null result, and the
  refuted/unrefuted distinction (r = +.077 vs −.049) changed the recommendation from "keep it,
  move it" to "keep it, never let it stand bare". WARNING 10 exists only because of that
  late material.

Where I reason about memory, endings and the black-screen open (BLOCKER 3, Q3, Q7, Q8), **I am
reasoning from the deck's own structure, the rubric evidence, and the narrative and
persuasion findings in D/E/G — not from cited research on serial position in talks.** Treat
those as argued judgement, not sourced fact.

**Two provenance notes.** Everything in D and E after the Devpost quotes came through
delegated research threads rather than my own fetching; I have kept their unverified flags
intact and marked them inline. And per McSweeney et al., the pitching literature contains
**zero replication studies** — trust the pattern, not the coefficients.

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

Two academic results sharpen this considerably (section E). **Tsay (2021)**: judges shown
*silent video* of pitches picked the real winner 52.2% of the time against 33% chance, while
*audio only* scored 35.6% — statistically indistinguishable from guessing. The visible
channel predicts outcomes; the audible one barely does. This deck's demo runs 90 seconds
with its visible channel parked on a static diagram that `visual-review` 16 already called
generic, while all the meaning is carried in audio the plan itself rates confusable. **That
is the wrong way round on the one result with 1,855 participants behind it.** And **Chen, Yao
& Kotha (2009)**, with 55 real investors: *"preparedness, not passion, positively impacted
decisions to fund ventures"* (β = 1.69, p < .01). An unscripted ninety seconds is the most
visible place in this pitch to look unprepared.

**Fix** Script the demo to the same standard as the slides — roughly eight narration beats
keyed to events, each under fifteen words, in the deck's own voice. Name every event as it
fires so SIREN and BUS cannot be confused by ear. It must contain a line at the moment P6
plays: **"That's the eighty-eight."** Optionally give the audience a legend — even a
projected four-step tracker that ticks as each step completes.

Note that `sign-off.md`'s top prep item — *"Record the demo working… If the live run fails,
play the recording"* — is good advice and does **not** address this. A recording de-risks
*failure*; it does nothing for the ninety seconds of unnarrated audio in the success case.
The recording also needs the same script, or it inherits the same problem.

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

**Evidence** Open after two prior review passes, and now formally accepted: `sign-off.md`
lists it under *accepted warnings* — *"Until then the tilde and credit stay."*
`narrative-review` pass 2 states the case exactly: *"A tilde and a credit line change the
number's status, not its presence."* The deck's own note orders the fix and it has not been
done: *"TIME A REHEARSAL RUN. Then replace both figures with what you actually saw."*
Devpost judge Karen Bajza-Terlouw: *"Ambiguity is a red flag."*

**Why I am reopening what was accepted.** The prior passes judged this as a *compliance*
question — is a hedged estimate honest enough. That framing is right and the answer was
"nearly". The pitch-craft question is different and was not asked: this slide sits nineteen
seconds after a live demo, so its audience has *just watched the event being estimated*.
Everywhere else in the deck a hedge costs nothing. Here it costs the demo's credibility,
because the obvious question — "you just ran it, why is this an estimate?" — has no good
answer. `sign-off.md` already names the close-out and prices it at three rehearsal
prop-raises. That is the cheapest high-value fix on the whole list.

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
message that has no scoring home. Section G adds a second reason: the closing callback lands
on a story that has been absent for 196 seconds (WARNING 9), so it is asked to do recall work
that the narrative evidence says it can only do when it *carries* the content rather than
surrounding it. *(Reasoning from rubric weights, deck structure and the narrative findings in
G — serial-position research on spoken talks was not sourced; see H.)*

**The team has already considered this and accepted it.** `sign-off.md` lists "The close is
quiet" under accepted warnings, and defends it: Ralston says end "with a bang"; Chris
Anderson calls the inspiring-call-to-action formula cliché and "emotionally manipulative";
the deck follows Anderson.

**That defence does not cover this objection.** Anderson's target is the *inspirational
call to action* — the swelling appeal, the ask, the "join us". I am not asking for one, and
adding an ask here would be wrong for a hackathon (section F). I am asking for **one clause
of fact**: that the thing worked. "Today it told him the 88 had arrived" is not a call to
action, is not emotionally manipulative, and is not a bang. It is the result. A deck can
follow Anderson and still state its outcome; the two are not in tension. The callback,
the composition and the refusal to say "thank you" all survive intact.

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

### 9. The story brackets the technical middle instead of running through it

Slides 0, 1 and 10 are narrative; slides 2–9 are argument. They touch exactly once, at slide
4's *"So we built the thing that answers it."* Across the 196 seconds where the team explains
what it built — 64% of the pitch — **Hasan's grandfather is never mentioned again.** He
reappears only at 5:00, having still never used the device.

This matters because of the sharpest distinction in the narrative literature: narrative as
**format** helps recall (g ≈ .55, [Mar et al. 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8219577/)),
while narrative as **decoration** measurably hurts it — the seductive-details effect runs up
to **g ≈ 1.0 against** (Davis et al. 2026), and "removing seductive details" is listed as a
positive design principle in Noetel et al.'s meta-meta of 1,189 studies. A story that
carries the content earns its time; a story that surrounds it competes with it.

To be fair: this story is not a seductive detail in the strict sense — he is the user, not
an ornament, and the problem section genuinely rests on him. But structurally, the deck
currently runs two pitches on one stage: a human one at the ends and a technical one in the
middle. **Fix:** thread him through the demo. During the 90 seconds, say what each event
means *for him*, not just what the board is doing — "That's a bus. He knows before he could
have asked anyone." This costs no extra time (the demo is unscripted anyway, BLOCKER 1),
converts the story from bracket to spine, and makes the slide-10 callback land on something
the audience watched rather than something they were told.

### 10. The cut list drops the two lines that make the honesty work

`sign-off.md` states it plainly: **"The tight run is the run."** So every `[CUTTABLE]` line
goes by default, not as a fallback. Two of the six are load-bearing in a way the cut list
does not price:

- **Cut #6, slide 9: *"We drove them down to seventy hertz. Still nothing."*** The outline
  classifies this as "detail, not the claim". On the two-sided-messaging evidence it is
  precisely the opposite: it is the **refutation**. Refuted disclosure scores r = +.077,
  unrefuted r = −.049 — and this nine-word line is the only thing in the deck that turns "the
  buzzers cannot be felt" from a bare admission of failure into evidence that the team
  attacked the problem and measured the result. It is also **candour about struggle**, which
  is the category Huang & Pearce found actually moves people, as opposed to candour about a
  product defect, which has essentially no supporting literature (Kalvapalle's null).
- **Cut #5, slide 1: *"I'll come back to that."*** Already noted in WARNING 7 — the forward
  reference that makes slide 9 read as planned rather than defensive.

**Fix** Reclassify both as never-cut, alongside the mandatory sentence. Find the 19 seconds
in slide 6 instead (BLOCKER 2). If something on slide 9 must go, cut *"So those two tones
stand in for two vibration channels"* — that claim is already made verbatim on slide 4 and
again in the demo line, so it is the only genuinely redundant sentence in the block.

### 11. The only mid-slide handoff buys nothing

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
three seconds, and the note correctly refuses the "close your eyes" stunt. Opening on a real
person is defensible on the narrative-format evidence (g ≈ .55 for narrative over expository,
[Mar et al. 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8219577/)) and is not a cliché in
itself. Two cautions: do **not** defend it in Q&A with the "stories are remembered twice as
well" claim — that number is not citable (section G) — and note that the effect shrinks or
vanishes for technical content, so the story is doing work for the *problem*, not for the
build. The real risk is not the black screen; it is that **the device is not described until
1:20**, 26% in. Those are separable problems. Keep the black screen; add one sentence early
saying what this is (WARNING 2). *(No sourced evidence on opening with silence specifically
— see H.)*

**4. Does the honesty on slide 9 help or hurt?** It helps *as delivered on the full script*
and **hurts on the tight script you are actually going to run** — and that is a much more
specific answer than "honesty is your differentiator", which the evidence does not support.

**The framing to drop first.** Do not defend this in Q&A by saying research shows investors
reward candour. Kalvapalle et al. reviewed 252 pitching papers since 1986 and found the words
*candor / honesty / weakness / humility* **zero times**. The supporting literature is roughly
two papers. And do not cite the pratfall effect — its famous half was **never significant**
(N = 48, p = .18).

**The one rule that actually matters:** disclosure pays only when the weakness is
**refuted**, not merely named — refutational r = +.077, non-refutational **r = −.049**.
Bare disclosure is worse than silence. Bolinger et al. found the same in a funding context:
risk disclosure harms *unless* packaged with mitigation.

**Apply that to the actual slide.** On the full script, slide 9 passes: failure stated,
effort evidenced ("we drove them down to seventy hertz"), reframed, then a forward path.
On the tight script — which `sign-off.md` says *is* the run — the effort evidence is cut, and
what remains is closer to a bare inventory. **That single nine-word cut is the difference
between a refuted disclosure and an unrefuted one** (WARNING 10).

**What it costs and buys.** It costs you on Completion ("Does the hack work?", 25% at MLH),
because what is disclosed is not peripheral — the tactile channel is the whole mechanism by
which a DeafBlind person receives the answer. It exposes you in holistic prize discussions,
where non-compensatory single-flaw screening applies (Maxwell et al.) in a way a rubric
cannot. It protects you in Q&A, where "ambiguity is a red flag". And at *this* event it may
score directly — the Anthropic Claude 2 Hackathon scored "helpful, harmless, and **honest**".

**Also note the category.** Huang & Pearce's effect came from candour about *struggle*, not
about a product defect. The deck's most persuasive honesty is therefore the 70 Hz line and
the tactile-failure story — not the mandatory sentence, which is a compliance obligation you
should meet and move past. Keep it; never let it stand bare; do not let it be the last thing
said (BLOCKER 3).

**And keep it separate from slide 6.** Slide 9's honesty is about a constraint that could not
be resolved in the time. Slide 6's is a hedge around a number you could get with a stopwatch.
Judges read those very differently, and only one of them is admirable.

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
what is missing from that list: **the device, and the fact that it worked.**

Three things push it that way. The demo's strongest sensory artefact is a beep, and the deck
tells the audience *twice* that the beep is not the real output. "88" — the answer to the
question the deck is named after — is never spoken. And the story never touches the technical
middle (WARNING 9), so the two halves are recalled separately rather than as one thing; the
narrative literature is clear that a story helps when it *carries* content and hurts when it
merely surrounds it.

So no: that is not quite the thing you want remembered. You want *"the team who built the
thing that told a DeafBlind man the 88 had arrived, and who were straight about what's
left."* Right now the second half of that sentence is louder than the first, and the two
halves are not attached to each other.

---

## The single highest-leverage change

**Write the 90-second demo script to the same standard as the slides — narrate it as what is
happening to Hasan's grandfather, not to the board — and make sure "That's the eighty-eight"
is said out loud.**

It is 29% of the pitch. It is the only stretch where the criteria that actually carry weight
(Technology, Completion — 33–60% of the score in every rubric with published numbers) are
demonstrated rather than asserted. And it currently contains **nine scripted words, against
39 for the failure branches**. Everything else in this deck has been counted, sourced and
defended to the word. The most important ninety seconds has not been written at all.

**One refinement the late research forces.** Tsay (2021) found judges shown *silent video*
picked the real winner 52.2% of the time, while *audio only* scored 35.6% — chance. So the
demo does not only need a script; **it needs something to look at.** Narration fixes
legibility and preparedness (Chen et al.: preparedness β = 1.69, p < .01); it does not fix a
dead visible channel. Give the room something that visibly changes as each step fires — the
board in someone's hand held up and pointed at, a projected step tracker, anything that is
not the same static diagram for ninety seconds. Script *and* stagecraft, in that order of
effort but not of importance.

Narrating it through the person rather than the hardware is what makes it the highest-leverage
change rather than merely a necessary one, because it fixes four things at once:

- The demo stops being unscripted (BLOCKER 1) and stops depending on the audience decoding
  two tones the plan itself rates "High" for confusability.
- "88" gets said, so the question the deck is named after gets an audible answer.
- The story stops bracketing the technical middle and starts running through it (WARNING 9),
  which is the difference between narrative-as-format and narrative-as-decoration.
- The achievement enters the room in a presenter's voice at 2:02–3:32, so it is no longer
  absent from the last 38 seconds (BLOCKER 3) even before slide 10 is rewritten.

Second priority: fix or cut slide 6 (BLOCKER 2) — measure it at rehearsal, or delete it and
move its one good idea into the demo narration, which buys back 19 seconds. Third: give slide
10 one clause of achievement before the aspiration (BLOCKER 3).

And before any of that: **ask the organisers for the actual judging criteria.** Everything
above is calibrated against comparable events, not this one.
