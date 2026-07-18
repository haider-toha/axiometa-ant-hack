# Speaker script

Three voices, marked `[P1]` / `[P2]` / `[P3]`. Spoken pace **130 wpm**.
Every line is under 15 words. Nothing here appears on a slide surface — these are
presenter notes only.

**Fields in `«guillemets»` are pending `slides/research/facts.md`.** Any figure still in
guillemets at rehearsal must be cut, not guessed. A slide with a missing number is
survivable; a slide with an invented one is not.

---

## 0 — Black · P1 · 18 s · 37 words

> **Screen: nothing.** `#0A0B0C`, edge to edge. No logo, no title, no cursor.

[P1] It's 7:42 in the morning, at a bus stop in south London.
[P1] A bus pulls in.
[P1] Hasan's grandfather can't see which one.
[P1] He can't hear the driver call it.
[P1] So he asks a stranger. Every time.

> *Do not invite the audience to close their eyes.* Simulating disability to produce
> sympathy is a well-criticised move and it reads as a stunt. The black screen is
> **time**, not a simulation. Let it sit.

---

## 1 — The person · P1 · 24 s · 50 words

> **Screen:** `Hasan's grandfather.`

[P1] Hasan is my friend. This is his grandfather.
[P1] He's DeafBlind — no useful sight, no useful hearing.
[P1] He isn't a persona we invented for a pitch.
[P1] I spoke to him. That conversation is why this exists.
[P1] He has never tried the device. Nobody DeafBlind has.
[P1] I'll come back to that.

> Two verbs doing separate jobs, and they must not be blurred: **spoke to** (true, and the
> origin of the project) and **tried** (has not happened). The last two lines set up
> slide 9. Say them evenly — this is disclosure, not confession.

---

## 2 — Scale · P1 · 19 s · 41 words

> **Screen:** `450,000`, large, counting up. Below it, small and muted:
> `ESTIMATED · SENSE · 2022`.

[P1] Sense estimates 450,000 deafblind people in the UK. Over 610,000 by 2035.
[P1] The government's own definition names three difficulties.
[P1] Communication. Access to information. Mobility.
[P1] The law even requires buses to announce their route number.
[P1] Only to the people already on board.

> **Say "estimates".** The 450,000 is a model, not a count — Sense / Operational Research
> Society 2017, built on Centre for Disability Research 2010 prevalence, applied to 2022 ONS
> population. It is the best figure that exists and every UK deafblind charity uses it, but
> if a judge asks where it comes from, that chain is the answer. Never say "there are".
>
> The three difficulties are quoted from the **Department of Health's** statutory definition
> — communication, access to information, **mobility**. The government already wrote down
> the problem this device addresses. That is why this line beats any statistic.
>
> The last two lines are the deck's hardest fact, and they are primary legislation:
> **SI 2023/715 reg 7** requires the route number be given to passengers "on which they are
> travelling", beginning when the doors open. It is an on-board duty. Delivered flat, no
> emphasis — the sentence does the work.

---

## 3 — Why the existing tools don't answer this · P1 → P2 · 22 s · 48 words

> **Screen:** four-row ledger — subject, hairline rule, disqualifier. Rows reveal in
> sequence. Not a bullet list: no markers, no discs, no leading dashes.

[P1] A cane finds the kerb. It cannot read a bus.  ← *cuttable if running long*
[P1] A guide dog costs a hundred and two thousand pounds.
[P2] An interpreter is three hundred pounds a day, booked ahead.
[P2] Apps predict arrivals. They don't confirm what actually pulled in.
[P2] All good tools. None answers: which bus is this?

> The handoff from P1 to P2 happens mid-slide, on the interpreter line. Rehearse it — it's
> the only mid-slide voice change in the deck.
>
> **£102,000** is Guide Dogs' own current figure: £77,000 to breed, raise and train, plus
> £25,000 to support the partnership for its working life. **Do not say £55,000** — that
> number circulates widely, is undated, and is less than the training cost alone.
> **Do not say "£25,000 a year"** — the £25,000 covers the entire working life.
>
> **£300 a day** is inside NUBSLI's Apr 2026 guidance range of £275–£375 for a registered
> interpreter's full day. **Do not convert it to an hourly rate** — NUBSLI does not define
> how many hours a "day" is, so any hourly figure would be an invented divisor.
>
> Tone check: these are **not** weaknesses of a cane or a dog. They are different tools
> solving different problems, and the script says so ("all good tools") before it pivots.
> Getting this wrong makes the team sound like it doesn't know the domain.

---

## 4 — The device · P2 · 16 s · 39 words

> **Screen:** CAD explode. 90 frames, pin 5:1. Port callouts only.

[P2] So we built the thing that answers it.
[P2] A board you wear. Four ports.
[P2] A range sensor. A microphone. Two output channels.
[P2] Everything on it is there for one job.
[P2] It only ever calls out. Nothing can call in.

> Last line is the outbound-only property (plan Global Constraint 9). It reads as a
> security answer, which is what a judge will hear, and it's true.

---

## 5 — The system · P2 · 22 s · 49 words

> **Screen:** system diagram. Five nodes, four edges, drawn on.

[P2] Your phone watches the road and sends frames to Modal.
[P2] Modal decides when a bus has arrived.
[P2] Claude reads the number off the front.
[P2] That lands in a relay. The wrist device polls it, three times a second.
[P2] Safety sensing never touches the network.
[P2] Which matters in a moment.

> "Three times a second" = the 300 ms poll. Accurate.
> Last line hands into the demo. Don't pause after it.

---

## DEMO · P2 · 90 s

> **Screen:** hold slide 5. Do not advance. The diagram is a legend for what's happening.

Run the locked order from the plan (Revision 2026-07-18e §5):

1. Start in **MOVING**. Show the range sensor finding an obstacle — pulse cadence slows as
   the path clears.
2. Show the siren detection.
3. Switch to **STILL**.
4. *Only then* raise the bus prop. BUS → WAIT → NUMBER 88.

**The one line that must be said during the demo**, when the tones fire:

[P2] These two tones stand in for two vibration channels. The buzzers can be heard, not felt.

> Say it the first time a tone sounds, not at the end. If the audience hears an unexplained
> beep and forms their own theory, slide 9 arrives too late to correct it.

### DEMO — contingency

If the pipeline fails at any point, say this and press **6**:

[P2] That's a live network at a hackathon. The numbers are the same either way.

> Fourteen words. It does not apologise, does not explain, does not troubleshoot on stage.
> Slides 6–10 are written to stand without the demo having worked.

---

## 6 — What you just saw · P2 · 18 s · 38 words

> **Screen:** two figures — `1.4 s` and `3.8 s`. Count up.

[P2] About one and a half seconds from bus to first signal.
[P2] About four seconds to the route number.
[P2] You learn a bus is here before you learn which one.
[P2] That gap is deliberate. Knowing early is time to move.

> Both figures are the **mean** of the plan's measured latency budget (`plan/…:767` gives
> 0.76–2.09 s, mean 1.38; `:777` gives 2.4–6.2 s, mean 3.8). "About" is doing honest work —
> do not say "exactly", and do not quote the ranges on stage.
>
> **If the demo failed:** change the first two lines to past-conditional — *"It takes about
> one and a half seconds…"* — and add nothing else. Do not re-run the demo.

---

## 7 — Sensing · P3 · 22 s · 47 words

> **Screen:** CAD orbit of the range sensor. 80 frames, pin 4:1.

[P3] Three sensors, one reason each.  ← *cuttable if running long*
[P3] Range sensor: forward clearance while you're walking.
[P3] Microphone: sirens, detected on the board itself with an FFT.
[P3] Both of those are local. No wifi in either path.
[P3] If the network dies mid-street, the safety sensing doesn't.
[P3] That was not a nice-to-have.

> Do **not** claim the range sensor chooses a direction. It's a single forward cone; it
> cannot tell left from right (plan Revision 2026-07-18e §6). "Forward clearance" is the
> honest phrase and it is the only one to use.

---

## 8 — Why Modal · P3 · 22 s · 50 words

> **Screen:** `Detection is when.` / `Claude is what.`

[P3] Claude reads a bus number better than YOLO ever could.
[P3] So why a detector?
[P3] Because a bus arriving isn't one frame. It's two seconds of frames.
[P3] That needs history, debounce, and a latch that fires exactly once.
[P3] The Claude API is stateless. Modal isn't.
[P3] Detection is when. Claude is what.

> **Do not** argue cost, and **do not** argue that a GPU was needed for throughput. The
> plan concedes both (`…:704–713`): at 2 fps neither is true, and a judge who has seen
> forty projects will take the opening. State is the only argument that survives, so it's
> the only one made.
>
> This slide credits Modal by name, which the brief requires, and earns it.

---

## 9 — What failed · P3 · 18 s · 48 words

> **Screen:** `We have not validated this with DeafBlind users.` Held, static, alone.

[P3] The buzzers we were given can be heard. They cannot be felt.
[P3] We drove them down to seventy hertz. Still nothing.
[P3] So those two tones stand in for two vibration channels.
[P3] We have not validated this with DeafBlind users.
[P3] Real motors next. Then the people who'd use it.

> Line 4 is the mandatory sentence, verbatim, and it is on the screen as well as in the
> mouth. It pays off slide 1.
>
> "Can be heard, cannot be felt" is passive on purpose — it is T5's own claim-boundary
> phrasing. The active alternative ("you can't feel them") asserts something about a
> specific body that was never tested. Leave it passive.
>
> 70 Hz is from T5's labelled sweep (70/100/150/220 Hz), driven deliberately low to try to
> elicit a felt buzz. Do not quote 700 or 1400 Hz — superseded by Revision 2026-07-18c.
> The demo tones are 2350 Hz and 3050 Hz.
>
> Deliver this without apology and without a rueful smile. It is the most credible
> thirty seconds in the deck.

---

## 10 — Close · P3 · 10 s · 17 words

> **Screen:** `Hasan's grandfather.` — identical composition to slide 1.

[P3] Hasan's grandfather still asks a stranger which bus just arrived.
[P3] We'd like him to stop having to.

> Stop. Do not add "thank you", do not add "any questions", do not add the team name.
> The slide is already the same image the audience saw nine minutes of argument ago, and
> the only thing that changed is that they now know what the device does.

---

## Word ledger

| Presenter | Slides | Words |
|---|---|---|
| P1 | 0, 1, 2, 3a | ~153 |
| P2 | 3b, 4, 5, demo, 6 | ~149 + demo |
| P3 | 7, 8, 9, 10 | ~162 |

Even to within 8 %. P2 carries the lightest script because P2 carries the live demo.

---

## Anticipated questions

Sourced answers for the eight questions most likely to come. Every figure traces to
`slides/research/facts.md`. **If a question isn't on this list, say you don't know.**

**"Won't the 2026 regulations fix this?"** — *the most dangerous question, and we win it.*
No. Three reasons, in order of force: the duty is to passengers already **on** the bus
(SI 2023/715 reg 7); every mandated channel is **audio and visual** (reg 12), and for
someone with both sight and hearing loss, louder and brighter both fail; and as of 2021–22
only **46%** of English buses had the equipment — **25%** outside London — with partially
compliant vehicles exempt until **2031**. The regulations mandate exactly the two channels a
DeafBlind person cannot use.

**"Where does 450,000 come from?"** — Sense, via the Operational Research Society (2017),
using Centre for Disability Research 2010 prevalence against 2022 ONS population. It's a
model, not a count. It's the only UK deafblind-specific figure that exists.

**"Do you have data on deafblind people and buses specifically?"** — No, and neither does
anyone. RNIB's 2025 bus report (n=1,197), Guide Dogs' 2014 report (n=2,009), Transport for
All (n=521) and NCAT (n=1,195) contain **zero** mentions of deafblindness — checked by
full-text search. DfT's National Travel Survey treats vision and hearing as separate
categories with no combined breakout. WFDB calls it "persistent statistical invisibility".
The absence of data is the finding. Say that plainly; do not borrow a blindness figure.

**"But London buses announce the route."** — They do, and London is the **best-served** case
in the country. It's still on-board and still audio-visual. Do not use London to argue
provision is absent; use it to argue that even at its best, it doesn't reach the person
standing at the stop.

**"Haven't you tested this with DeafBlind users?"** — No. It's on slide 9 and in the deck
because it's true. One conversation about the problem is not validation of a device.

**"Why not just use Claude for every frame?"** — Slide 8. Claude is stateless; arrival is a
temporal event needing history, debounce and a fire-once latch. Do **not** argue cost or GPU
throughput — at 2 fps neither is true and the plan concedes both.

**"Why is route 88 hardcoded?"** — Because it's a 1.5-day hack and generality was explicitly
out of scope. The route encoder handles any 1–3 digit route; 88 is what the demo prop shows.

**"Why not just a phone app?"** — The phone is already in the loop; it's the camera. The
question is the **output**. A phone answers by showing or speaking, and a DeafBlind user can
do neither. The device exists to put the answer on the body.

---

## Banned-word check

Swept for: revolutionise · seamless · cutting-edge · innovative · leverage · utilize ·
transform · game-changing · next-generation · breakthrough · state-of-the-art · robust ·
scalable · ecosystem · synergy · holistic · empower · journey · unlock · reimagine ·
disrupt. **Zero occurrences.**

Em dashes: **one**, in slide 1, marking an appositive. Rhythmic, not decorative.
