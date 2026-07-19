# Sign-off

Compiled 2026-07-19. Four adversarial reviewers, two rounds, plus a pitch-practice audit
against published research.

---

## Final state

| | |
|---|---|
| Slides | 11 (0–10), 18 viewports — inside `spec.md`'s 16–21 target |
| Runtime | **5:12 full · 4:58 with `[CUTTABLE]` lines dropped.** Slot is 5:00 |
| Presenter split | P1 147 · P2 160 · P3 176 words |
| Frames | 230 · explode 90, orbit 80, detail 60 · max 42.9 KB · max RGB 191/201/183 |
| Palette | exactly `#0A0B0C` `#F2F4F5` `#9AA3A8` `#CFD9E0` |
| Faces | Instrument Sans Variable + Gloock, both SIL OFL, `fsType 0` |
| Monospace | **zero**, in CSS, HTML, JS and `fonts/` |
| Console errors | zero |
| External requests | zero — works from `file://` with the network off |

**The tight run is the run.** The deck only fits the slot with every `[CUTTABLE]` line
dropped. Treat those cuts as default and the full script as the overrun case.

> **That policy nearly broke slide 9.** The cut list originally included *"We drove them
> down to seventy hertz. Still nothing."* — the only evidence-of-effort in the block, and
> therefore the only thing making the disclosure *refutational*. Under O'Keefe a named-but-
> unrefuted weakness scores **worse than silence**. A default-cut policy and a cut list
> compiled by word count are safe only if nothing load-bearing is on the list; that line was.
> It is no longer cuttable, and the deck still fits at 4:58.

---

## Pass 1 — 12 blockers

**Narrative and fact**
1. Slide 6's latency figures were presented as measured. They are not: the plan's tables
   are headed *"Estimate"*, T4 Open Risk 7 says *"Nothing in this architecture has been
   run"*, and T2 says verbatim *"Do not put a latency number on a slide you have not
   measured."* Now carry a tilde, an explicit "not yet measured" credit, and a rehearsal
   instruction.
2. "Bus to route number — 3.8 s" was the wrong quantity. 3.8 s is to the **first digit**;
   P6 then takes 6.4 s to deliver "88". The slide would have contradicted the six seconds
   the audience had just watched.
3. **Slide 3 priced a BSL interpreter as the alternative for a man with no useful sight.**
   He cannot see BSL. `facts.md` exists partly to prevent this exact conflation. Now a
   communicator-guide, arguing availability rather than a rate that does not exist for
   that role.
4. The "heard, not felt" boundary lived only inside the demo — if no tone sounded it was
   never said, and slides 4–8 run ~80 s implying a working signal. Moved to slide 4.

**Anti-slop**
5. Slide 7 said "three sensors" and named two, contradicting slide 4.
6. The demo contingency blamed the network — but demo steps 1–2 are ToF and on-board FFT,
   and slide 7 tells the same room those paths have no wifi.
7. **The weight ladder was fiction.** Only 400/700 shipped, so every `font-weight: 500`
   silently rendered 400 and the display 600 snapped to Bold — the exact weight the CSS
   argued against four lines below.
8. Two canonical script files had already drifted in both directions.

**Visual and animation**
9. **The 90-frame explode was unwatchable.** Lenis's exponential easing burned the whole
   beat in ~0.36 s; the presenter would have talked over a frozen frame 0 for 16 s while
   3 MB of renders played as a wipe on the way out.
10. `--accent` is **darker** than `--ink` (13.75:1 vs 17.85:1, differing by 1.30:1), so
    slide 8's promoted line rendered greyer than the line it supported.
11. The canvas used `cover`, cropping 24% on a 4:3 projector and dropping slide 4's
    callouts onto the base plate.
12. Renders clipped to **(254,255,255)** — pure white, outside the palette — and that
    blowout was also why the rim light was undetectable.

## Pass 2 — 6 further blockers

13. My own fix to (4) landed in the active second person (*"You can hear them"*), the one
    construction slide 9's own note forbids. Now *"They can be heard, not felt."*
14. `[CUTTABLE]` on "So why a detector?" broke the following line, which began *"Because"*.
    Since the tight run is the run, this would have fired by default.
15. Four comments described code that no longer existed.
16. `.statement--accent` survived as a live rule with a DO-NOT-USE comment — a trap.
17. The ledger conflated deck speech, demo speech and contingency alternates under a
    heading reading "computed, not asserted".
18. **Slide 9 named a limitation without answering it.** O'Keefe 1999 (107 effect sizes,
    20,111 respondents): refutational two-sided messages gain (r = +.077); non-refutational
    ones — a weakness left hanging — do *worse than saying nothing* (r = −.049).

---

## Two errors that were mine, not the build's

**The lighting spec was wrong.** I wrote "key light, 6500 K cool white". 6500 K *is* D65,
the sRGB white point — neutral, not cool. The key had been pushed artificially cool, which
combined with the cool `#CFD9E0` rim to swamp the 20% warm fill entirely. Mean R−B was
negative in every frame. Now positive throughout.

**The navigation model broke the hero animation.** I chose key-driven scroll on the
assumption that "the animation is the transition". It is not: Lenis's easing covers 65% of
the distance in 120 ms. A clicker cannot scrub, so the beat now plays itself over ~7 s.

Both were caught by adversarial review, not by me, and both had passed every mechanical
check I ran.

---

## Accepted warnings

**Slide 6's figures are still estimates.** T2 says do not put an unmeasured latency number
on a slide. They are now labelled as estimates rather than passed off as measurements,
which is an improvement but not compliance. **The close-out is to time three rehearsal
prop-raises and replace both figures** — a measured number you can defend is a stronger
slide than a hedged one. Until then the tilde and credit stay.

**`7:42` is a story detail, not a datum.** It comes from the project brief, not from
`facts.md`. It is load-bearing — slide 3's communicator-guide row pivots on it — and
reads as narrative rather than as evidence.

**`frames/detail/` is rendered but unwired.** 60 frames exist and are committed. No slide
uses them: slide 7's argument is complete with the orbit, and adding a contact close-up
because it happens to exist is decoration. Kept as a spare.

**The close is quiet.** Ralston advises ending "with a bang" and listing the points to
retain. Chris Anderson explicitly calls the inspiring-call-to-action formula cliché and
"emotionally manipulative". The deck follows Anderson: it ends on a callback, not an ask.
This is a judgement call against one credible source and with another.

---

## Before you present

1. **Put the debug screen up during the demo** — not the static diagram. Tsay (2021,
   n=1,855): judges given silent video picked the real winner 52.2% of the time; audio-only
   scored 35.6%, indistinguishable from chance. Ninety seconds of a motionless slide, with
   all meaning in two tones the plan itself calls confusable, is the wrong way round.
   `/api/state` exists for this: the plan says it is "what makes the siren tier visible to
   an audience". Say the payload out loud too — "that's the eighty-eight".
2. **Record the demo working.** Highest-value prep available. If the live run fails, play
   the recording — do not skip to slide 6 and do not troubleshoot on stage.
3. **Time three rehearsal prop-raises** and replace slide 6's two estimates.
4. **Check Gloock on the actual projector.** Hairlines are the first thing a projector
   loses; 108 px light-on-dark is in our favour, but verify.
5. **Rehearse the mid-slide P1→P2 handoff** on slide 3 — the only voice change inside a
   slide.
6. Confirm the deck opens by **double-clicking `index.html`** on the presenting machine.

---

## What makes this deck hard to replace

It is the only hackathon deck in the room whose central argument is a piece of primary
legislation — that the law requiring a bus to announce its route number applies only to
the people already inside it — and which then tells the judges, on screen and unprompted,
the one thing that would most damage it.
