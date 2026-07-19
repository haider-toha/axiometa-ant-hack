# Narrative outline — bus-stop situational awareness

Compiled 2026-07-19. Authority: `plan/2026-07-18-bus-stop-situational-awareness.md` and
`audit/bus-stop-situational-awareness/`. Statistics: `slides/research/facts.md`.

---

## The timing problem

The brief's own timing table does not fit five minutes. Summed as written it is **340 s
before slide 4 is allocated any time at all** — 5:40 against a 5:00 slot.

> **Do not put a word budget in this file.** An earlier version of this section carried a
> hand-maintained per-slide table and a presenter split. Both went stale within hours, both
> disagreed with the deck, and the presenter split was simply wrong — it claimed P2 was the
> lightest voice when P2 is in fact the heaviest.
>
> The live numbers are **computed from the deck itself** by
> `slides/build/sync_script.py` and written into the ledger at the end of
> `slides/narrative/script.md`. Read them there. Re-run the script after any change to a
> presenter note.

Spoken pace is **130 words/minute**. Five minutes = 300 s, of which the live demo takes 90.

### Running-long lever

Lines that carry no unique argument are tagged `[CUTTABLE]` **inside the deck's own
presenter notes**, and the ledger reports the runtime with all of them dropped. For the
current figures see the ledger in `script.md` — do not copy them here, which is the mistake
this section already made once.

**The tight run is the run.** The deck only fits the slot with every `[CUTTABLE]` line
dropped, so treat those cuts as the default and the full script as the overrun case, not
the other way round.

Cut them in this order, worst first:

1. Slide 3, P1 — *"A cane finds the kerb. It cannot read a bus."* The cane point survives
   in the closing line of the same slide.
2. Slide 7, P3 — *"Two sensors on the board, one reason each."* A signpost, not a claim.
3. Slide 5, P2 — *"Which matters in a moment."* Pure transition.
4. Slide 8, P3 — *"So why a detector?"* Setup; the next line stands without it.
5. Slide 1, P1 — *"I'll come back to that."* Slide 9 pays it off regardless.

**Removed from this list:** *"We drove them down to seventy hertz. Still nothing."*
It was cut #6 and that was wrong. It is the only evidence-of-effort in slide 9, and
O'Keefe's split means a disclosure that is named but not refuted scores **worse than
silence** (r = −.049 vs +.077). Cutting it inverted the value of the deck's best
thirty seconds. Never mark it cuttable again.

**Never cut** the mandatory validation sentence on slide 9, or the callback on slide 10.
Those are the two things a judge remembers.

### Presenter load

P2 carries the most words **and** the 90 s live demo.

**Do not "fix" this by moving slide 6 to P3.** That was proposed here and it is wrong:
it would take the split from roughly 147/161/164 to 143/205, which is far worse. P2's
burden is the demo, not the word count, and no reshuffling of slides addresses that.

If rehearsal feels lopsided, the real lever is to move a *slide-3* line from P2 back to P1
— P1 is the lightest voice and already owns that slide's opening.

---

## Arc

The deck is built as **setup → payoff**, twice.

**First pair.** Slide 1 foreshadows the honesty constraint (*"He hasn't tried the device.
Nobody DeafBlind has. I'll come back to that."*). Slide 9 pays it off with the mandatory
sentence verbatim. Disclosing early is braver than burying it at the end, and it means a
judge who was going to ask the question hears the answer before they can form it.

**Second pair.** Slide 0 opens on a specific person at a specific bus stop at 7:42.
Slide 10 returns to him. Nothing in between is abstract enough to lose him.

## What each slide surface shows

Hard rule from the brief: **one number, or one short sentence, or the CAD animation, or the
diagram. Nothing else.** No bullet lists anywhere.

| # | Visible on screen | Motion |
|---|---|---|
| 0 | nothing — `#0A0B0C`, pure | none |
| 1 | `Hasan's grandfather.` | text reveal, 500 ms |
| 2 | `450,000` + credit `ESTIMATED · SENSE · 2022` | count-up on entry |
| 3 | four-row ledger: subject / disqualifier | staggered row reveal |
| 4 | **CAD explode, 90 frames, pin 5:1** | canvas sequence |
| 5 | system diagram — 5 nodes, 4 edges | edge draw-on |
| 6 | two figures: `~1.4 s` / `~3.8 s` + estimate credit | count-up |
| 7 | **CAD orbit, 80 frames, pin 4:1** | canvas sequence |
| 8 | `Detection is when.` / `Claude is what.` | two-line reveal |
| 9 | `We have not validated this with DeafBlind users.` | static, held |
| 10 | `Hasan's grandfather.` again | text reveal |

Slide 3 is the one place a multi-part structure earns its place, because the argument *is*
an enumeration of four different tools. It is set as a **typographic ledger** — label,
rule, disqualifier — not as bullets. No markers, no discs, no dashes leading each line.

Slide 10 deliberately reuses slide 1's exact composition. Same words, same position, same
size. The only thing that has changed is that the audience now knows what the device does.

---

## Claim boundaries — binding on every slide

Derived from `AGENTS.md`, plan Global Constraints 4/13/15, and `T5`.

**Never claim.** Tactile or haptic output. That the two tones were felt. Spatial or
left/right discrimination. Any DeafBlind user validation, testing, or endorsement. That the
device guides the user anywhere — to the stop, around an obstacle, or to a bus door.
Route generality beyond the hardcoded 88.

**Direction, stated exactly** (`AGENTS.md` as revised 2026-07-19). Two different things
that must not be merged:

- **ToF-derived direction: forbidden, permanently.** One forward cone cannot choose a safe
  bypass. No local sensor output may be described as navigation. Slide 7 says "forward
  clearance" and stops there.
- **Camera-derived bus bearing: permitted in the codebase**, as advisory `LEFT`/`RIGHT`/
  `AHEAD` relay commands in `MOVING` only — the phone can see which side of frame a bus is
  on. It is not obstacle avoidance and never outranks the local paths.

**Neither appears on a slide.** Bearing is not in the locked demo order (plan Revision
2026-07-18e §5), so the audience will not see it, and the gap between "advisory bearing"
and "it tells you where to walk" is too fine to hold on stage in five minutes. The deck
claims sensing and identification. It does not claim direction of any kind. This is a
deliberate omission of a real feature, not an oversight — do not let a later pass "helpfully"
add it back.

**The one conversation, stated precisely.** Haider spoke to Hasan's grandfather about the
*problem*. That is the origin of the project and it is real. It is **not** user validation
of the *device*, and the script never lets those two blur. Slide 1 says the conversation
happened; slide 9 says the validation did not. Both are true and they do not contradict —
but only because the script keeps them in separate sentences with separate verbs.

**The tones.** T5 is a qualitative first-person bench observation, not an instrumented
acceleration measurement. Slide 9 says the buzzers "can be heard, not felt", which is
exactly what was observed. It must not say "we measured" or quote a figure.

**The frequencies.** 2350 Hz (P1) and 3050 Hz (P3), per plan Revision 2026-07-18c. T5's
earlier 700/1400 Hz is superseded — Revision c moved both tones near the MLT-8530's 2.7 kHz
resonance for audibility in a noisy room. Do not quote 700/1400 anywhere.

**The microphone part number.** The CAD renders use `AX22-0009`; the hardware in hand is
`AX22-0044` (marking T3902), which has no STEP file. The render is therefore a stand-in.
**No slide labels the mic with a part number** — the callout reads `PDM MICROPHONE`. This
is the only place the renders and the bench diverge, and it is handled by omission rather
than by a wrong label.

**Modal.** Credit by name. The argument is *state*, not cost and not cropping — the plan
concedes both of those and so does the script. Claiming a GPU was needed for throughput at
2 fps invites exactly the question the team would lose.

---

## Demo independence

Hard constraint: **slides 6–10 must be presentable immediately after slide 5 regardless of
what the demo does.**

- Slide 6 states two latency figures from the plan's **estimated** budget — the plan's own
  tables are headed "Estimate", and audit T4 Open Risk 7 says nothing in this architecture
  has been run. They carry a tilde and a "not yet measured" credit until a rehearsal run
  replaces them. If the demo failed,
  P2 says what the figures are and that the audience did not just see them. The numbers are
  sourced either way.
- Nothing in slides 7–10 refers back to a demo event. Slide 7 says what the sensors are for,
  not what they just did. Slide 9's honesty line is unaffected.
- Deck navigation: number keys jump to any slide root. After the demo, P2 presses **6**.
  There is no scrolling-by-eye recovery path and no dependency on where the deck was left.

**If the demo fails outright**, P2's fallback line is scripted in `script.md` under
`DEMO — contingency`. It is 14 words and it does not apologise.
