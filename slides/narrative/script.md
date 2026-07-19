# Speaker script

> **Generated from `slides/deck/index.html` by `slides/build/sync_script.py`.**
> Do not edit the per-slide sections here — edit the deck's `class="notes"`
> blocks and re-run the script. The deck is what the presenter actually reads,
> so it is the source of truth. Appendices at the end are authored by hand and
> are preserved.

Three voices, marked `[P1]` / `[P2]` / `[P3]`. Spoken pace **130 wpm**.
Nothing here appears on a slide surface — these are presenter notes only.

---

## Slide 0 · P1 · 36 spoken words

```
SCREEN: nothing. #0A0B0C, edge to edge. No logo, no title, no cursor.

[P1] It's 7:42 in the morning, at a bus stop in south London.
[P1] A bus pulls in.
[P1] Hasan's grandfather can't see which one.
[P1] He can't hear the driver call it.
[P1] So he asks a stranger. Every time.

NOTE: Do not invite the audience to close their eyes. Simulating disability to
produce sympathy is a well-criticised move and it reads as a stunt. The black
screen is time, not a simulation. Let it sit.
    
```

## Slide 1 · P1 · 50 spoken words

```
SCREEN: Hasan's grandfather.

[P1] Hasan is my friend. This is his grandfather.
[P1] He's DeafBlind — no useful sight, no useful hearing.
[P1] He isn't a persona we invented for a pitch.
[P1] I spoke to him. That conversation is why this exists.
[P1] He has never tried the device. Nobody DeafBlind has.
[P1] I'll come back to that.   [CUTTABLE: slide 9 pays this off regardless]

NOTE: Two verbs doing separate jobs, and they must not be blurred: SPOKE TO
(true, and the origin of the project) and TRIED (has not happened). The last two
lines set up slide 9. Say them evenly — this is disclosure, not confession.
    
```

## Slide 2 · P1 · 41 spoken words

```
SCREEN: 450,000, large, counting up. Credit beneath: ESTIMATED · SENSE · 2022.

[P1] Sense estimates over 450,000 deafblind people in the UK. More by 2035.
[P1] The government's own definition names three difficulties.
[P1] Communication. Access to information. Mobility.
[P1] The law even requires buses to announce their route number.
[P1] Only to the people already on board.

NOTE: Say "estimates". The 450,000 is a model, not a count — Sense / Operational
Research Society 2017, on Centre for Disability Research 2010 prevalence, applied
to 2022 ONS population. Best figure that exists; every UK deafblind charity uses
it. If a judge asks where it comes from, that chain is the answer. Never say
"there are".

NOTE: The three difficulties are quoted from the Department of Health's statutory
definition — communication, access to information, MOBILITY. The government
already wrote down the problem this device addresses. That is why this line beats
any statistic.

NOTE: The last two lines are the deck's hardest fact and they are primary
legislation. SI 2023/715 reg 7 requires the route number be given to passengers
"on which they are travelling", beginning when the doors open. An on-board duty.
Deliver flat, no emphasis — the sentence does the work.
    
```

## Slide 3 · P1/P2 · 48 spoken words

```
SCREEN: four-row ledger — subject, hairline rule, disqualifier. Rows reveal in
sequence. Not a bullet list: no markers, no discs, no leading dashes.

[P1] A cane finds the kerb. It cannot read a bus.   [CUTTABLE if running long]
[P1] A guide dog costs a hundred and two thousand pounds.
[P2] A communicator-guide has to be booked. Not at 7:42.
[P2] Apps predict arrivals. They don't confirm what actually pulled in.
[P2] All good tools. None answers: which bus is this?

NOTE: The handoff from P1 to P2 happens mid-slide, on the communicator-guide
line. Rehearse it — it's the only mid-slide voice change in the deck.

NOTE: £102,000 is Guide Dogs' own current figure — £77,000 to breed, raise and
train, plus £25,000 to support the partnership for its working life. DO NOT say
£55,000: that number circulates widely, is undated, and is less than the training
cost alone. DO NOT say "£25,000 a year" — it covers the entire working life.

NOTE: The row says COMMUNICATOR-GUIDE, not "interpreter", and carries no price.
Both are deliberate. A BSL interpreter is the wrong role for a man with no useful
sight — he cannot see BSL — and facts.md exists partly to stop that conflation:
interpreter, communicator-guide and intervenor are three different jobs and must
not be mixed. The role that matches acquired deafblindness has no national
published rate (one provider, undated), so the row argues availability instead of
cost. Availability is the real barrier at 7:42 anyway.

NOTE: Tone check. These are NOT weaknesses of a cane or a dog. They are
different tools solving different problems, and the script says so ("all good
tools") before it pivots. Getting this wrong makes the team sound like it
doesn't know the domain.
    
```

## Slide 4 · P2 · 42 spoken words

```
SCREEN: CAD explode. 90 frames, pin 5:1. Port callouts only.

[P2] So we built the thing that answers it.
[P2] A board you wear. Four ports.
[P2] A range sensor. A microphone. Two output channels.
[P2] Those two channels are buzzers. They can be heard, not felt.
[P2] It only ever calls out. Nothing can call in.

NOTE: The "hear them, not feel them" line lives HERE, not only in the demo.
It used to sit only in the demo script, which meant that if no tone ever
sounded it was never said at all — and slides 4 to 8 run about eighty seconds
implying a working signal to a DeafBlind user before slide 9 corrects it. The
claim boundary cannot depend on the demo working. Say it again on the first
tone if the demo runs; saying it twice costs nothing.

NOTE: Last line is the outbound-only property (plan Global Constraint 9). It
reads as a security answer, which is what a judge will hear, and it's true.

NOTE: Do not name a part number for the microphone. The callout is
PDM MICROPHONE and nothing more.
    
```

## Slide 5 · P2 · 49 spoken words

```
SCREEN: system diagram. Five nodes, four edges, drawn on.

[P2] Your phone watches the road and sends frames to Modal.
[P2] Modal decides when a bus has arrived.
[P2] Claude reads the number off the front.
[P2] That lands in a relay. The wrist device polls it, three times a second.
[P2] Safety sensing never touches the network.
[P2] Which matters in a moment.   [CUTTABLE: pure transition into the demo]

NOTE: "Three times a second" = the 300 ms poll. Accurate.
NOTE: Last line hands into the demo. Don't pause after it.

-------------------------------------------------------------------------------
DEMO · P2 · 90 s
SCREEN: hold this slide. Do not advance. The diagram is a legend for what's
happening.

Locked order, plan Revision 2026-07-18e §5:
1. Start in MOVING. Show the range sensor finding an obstacle — pulse cadence
   slows as the path clears.
2. Show the siren detection.
3. Switch to STILL.
4. Only then raise the bus prop. BUS, then WAIT, then NUMBER 88.

The one line that must be said during the demo, the first time a tone sounds —
not at the end:

[P2-DEMO] Those tones stand in for vibration. Heard, not felt.

NOTE: Say it on the first tone. If the audience hears an unexplained beep and
forms their own theory, slide 9 arrives too late to correct it.

RECORD THIS DEMO WORKING BEFORE YOU PRESENT. Non-negotiable, and it is the
single highest-value twenty minutes of prep available.

David S. Rose (chairman, New York Angels) on live demos inside a pitch: "You can
deliver 200% of the value of a live demo in a CANNED demo... no chance that
Murphy's Law will rear its ugly head." Geoff Ralston, who has coached over a
thousand YC demo-day pitches: "demos seldom work in modern demo day
presentations." Paul Graham publicly reversed his own long-standing advice to
emphasise demos.

We are keeping the demo live, because this is a hackathon and working hardware
is the thing being judged — but that is a reason to have a recording, not a
reason to go without one. A phone video of the locked sequence running
end to end, on the presenting laptop, playable in two taps.

If the live run fails, PLAY THE RECORDING. Do not skip to slide 6 with an
apology, and do not troubleshoot on stage. A judge who has sat through eighty
pitches will not remember which one you played; they will remember whether they
saw the thing work.

DEMO CONTINGENCY — if there is no recording, press 6 and use the line that
matches WHAT failed. Do not
blame the network by reflex: demo steps 1 and 2 are the range sensor and the
on-board FFT, and neither touches the network. Slide 7 tells this same room
"Both of those are local. No wifi in either path." Blaming wifi for a local
failure hands them the counter-example.

If the CAMERA / MODAL / RELAY leg failed (steps 3-4):
[P2-ALT] That's a live network at a hackathon. The numbers are the same either way.

If the LOCAL sensing failed (steps 1-2):
[P2-ALT] That one's on us, not the network. It's local. Let me show you the rest.

If you are not sure which failed:
[P2-ALT] Live hardware. The rest of the deck stands without it.

NOTE: Short, and none of them apologise, explain, or troubleshoot on stage.
Slides 6 to 10 are written to stand without the demo having worked.
    
```

## Slide 6 · P2 · 41 spoken words

```
SCREEN: ~1.4 s and ~3.8 s, counting up, with the estimate credit beneath.

[P2] About a second and a half from bus to first signal.
[P2] About four to the first digit of the number.
[P2] You learn a bus is here before you learn which one.
[P2] That gap is deliberate. Knowing early is time to move.

NOTE — READ BEFORE REHEARSAL. These are ESTIMATES from the plan's latency
budget, whose tables are headed "Estimate". Audit T4 Open Risk 7 says verbatim:
"Nothing in this architecture has been run. Every timing figure is arithmetic or
citation, not measurement." Audit T2 says verbatim: "Do not put a latency number
on a slide you have not measured."

That is why the tilde and the credit line are on the slide, and why the spoken
line says "about". Do not remove either. Do not say "we measured".

TIME A REHEARSAL RUN. Then replace both figures with what you actually saw and
change the credit to "Measured at rehearsal · <date>". A real number you can
defend beats an estimate you have to hedge.

NOTE: 3.8 s is to the FIRST DIGIT, not the finished number. P6 then takes 6.4 s
to deliver "88" in full, so prop-raised to fully-delivered is 8.8-12.6 s. Saying
"to the route number" would contradict the six seconds the audience just watched.

NOTE: If the demo failed, keep these lines exactly as written — they are already
phrased as what the system does, not as what just happened. Add nothing.
    
```

## Slide 7 · P3 · 49 spoken words

```
SCREEN: CAD orbit of the range sensor. 80 frames, pin 4:1.

[P3] Two sensors on the board, one reason each.   [CUTTABLE if running long]
[P3] Range sensor: forward clearance while you're walking.
[P3] Microphone: sirens, detected on the board itself with an FFT.
[P3] Both of those are local. No wifi in either path.
[P3] If the network dies mid-street, the safety sensing doesn't.
[P3] That was not a nice-to-have.

NOTE: "TWO sensors on the board", not three. The plan counts three sensor inputs
because it includes the phone camera — but this slide is a CAD orbit of the
board, the camera is not on it, and slide 4 already said "a range sensor, a
microphone, two output channels". Saying three here names two and contradicts
slide 4 in front of the same room.

NOTE: Do NOT claim the range sensor chooses a direction. It is a single forward
cone; it cannot tell left from right. "Forward clearance" is the honest phrase
and it is the only one to use.

NOTE: The cane remains the primary mobility aid. This is supplementary.
    
```

## Slide 8 · P3 · 52 spoken words

```
SCREEN: Detection is when. / Claude is what.

[P3] Claude reads the number off the front. YOLO tells us when to ask.
[P3] So why a detector?   [CUTTABLE: setup line; the next line stands alone]
[P3] A bus arriving isn't one frame. It's two seconds of frames.
[P3] That needs history, debounce, and a latch that fires exactly once.
[P3] The Claude API is stateless. Modal isn't.
[P3] Detection is when. Claude is what.

NOTE: Do NOT argue cost, and do NOT argue that a GPU was needed for throughput.
The plan concedes both: at 2 fps neither is true, and a judge who has seen forty
projects will take the opening. State is the only argument that survives, so it
is the only one made.

NOTE: This slide credits Modal by name, which the brief requires, and earns it.
    
```

## Slide 9 · P3 · 58 spoken words

```
SCREEN: We have not validated this with DeafBlind users. Held, static, alone.

[P3] The buzzers we were given can be heard. They cannot be felt.
[P3] We drove them down to seventy hertz. Still nothing.   [CUTTABLE: detail, not the claim]
[P3] So those two tones stand in for two vibration channels.
[P3] We have not validated this with DeafBlind users.
[P3] What this build proves is the sensing and the routing.
[P3] Real motors and real users are the next one.

NOTE — WHY EACH LIMITATION IS ANSWERED, NOT JUST NAMED. O'Keefe's 1999
meta-analysis (107 effect sizes, 20,111 respondents) found two-sided messages
split sharply: REFUTATIONAL ones — name a weakness and answer it — gain
persuasive ground (r = +.077), while NON-REFUTATIONAL ones, which name a
weakness and leave it hanging, do WORSE than saying nothing at all (r = -.049).
Credibility follows the same split.

So neither disclosure here sits alone. "Heard, not felt" is answered by the
proxy explanation; "not validated with DeafBlind users" is answered by scoping
what the build does prove and naming what comes next. Delete either answer and
this slide flips from an asset to a liability.

Two things the same research rules out, so nobody re-adds them: the pratfall
effect is not real evidence (Aronson 1966's headline result was NOT significant,
t = 1.45, p < .18), and message ORDER did not matter — so do not restructure
the deck on a theory that disclosing early buys goodwill. It buys nothing; the
answer is what buys.

NOTE: Line 4 is the mandatory sentence, verbatim, and it is on the screen as
well as in the mouth. It pays off slide 1.

NOTE: "Can be heard, cannot be felt" is passive on purpose — it is the
claim-boundary phrasing from the bench observation. The active alternative ("you
can't feel them") asserts something about a specific body that was never tested.
Leave it passive. Do not say "we measured" and do not quote a figure for it.

NOTE: 70 Hz is from the labelled sweep (70/100/150/220 Hz), driven deliberately
low to try to elicit a felt buzz. Do NOT quote 700 or 1400 Hz — superseded. The
demo tones are 2350 Hz and 3050 Hz.

NOTE: Deliver this without apology and without a rueful smile. It is the most
credible thirty seconds in the deck.
    
```

## Slide 10 · P3 · 17 spoken words

```
SCREEN: Hasan's grandfather. — identical composition to slide 1.

[P3] Hasan's grandfather still asks a stranger which bus just arrived.
[P3] We'd like him to stop having to.

NOTE: Stop. Do not add "thank you", do not add "any questions", do not add the
team name. The slide is already the same image the audience saw nine minutes of
argument ago, and the only thing that changed is that they now know what the
device does.
    
```

---

## Ledger — computed, not asserted

| Presenter | Spoken words |
|---|---|
| P1 | 147 |
| P2 | 160 |
| P3 | 176 |
| **Total** | **483** |

At 130 wpm: **223 s (3:42)** full, **204 s (3:24)** with every `[CUTTABLE]` line dropped (41 words).

With a 90 s demo: **5:12 full** / **4:54 tight**. The slot is 5:00.

Excluded from the runtime above, and why:

- **9 words** of `[P#-DEMO]` — spoken *inside* the 90 s demo, so adding them would double-count that time.
- **3 `[P#-ALT]` contingency lines** (14/15/10 words) — at most one is ever spoken, and only if the demo fails.

Longest spoken line: **14 words**.

No spoken line exceeds 15 words.

<!-- APPENDICES — authored, preserved by sync_script.py -->

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
