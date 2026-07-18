# Track 3 — Transcript Deep-Dive & Locked Haptic Gesture Vocabulary

**Date:** 2026-07-18 · **Scope owner:** Track 3 of 3 · **Status:** rulings below are binding for synthesis

---

## Scope

**Analysed in full:**
- `plan/transcripts/2026-07-18-severity-levels-meeting.md` — read twice, in full, start to finish.
- `plan/PIVOT.md` **v2 only** (lines 351–768; v1 at lines 1–349 is superseded and was consulted only to confirm what v2 changed). Line references throughout are to `PIVOT.md` absolute line numbers.
- `plan/2026-07-17-speech-to-braille-wearable.md` Global Constraints (lines 13–38) — source of the reused timing primitives.
- `parts/` inventory and `audit/speech-to-braille-wearable/` (16, 20) — for the port-geometry number, which turned out to already exist.

**Not in my scope:** parts sourcing (Track 1), vision/Modal pipeline design (Track 2). Where I touch those, it is only to record what the transcript decided.

### Mid-task correction — please read before acting on the hardware findings

My original brief told me `parts/` showed no microphone module, and instructed me to record the meeting's *"we have a digital microphone"* as a false claim. **That was wrong and is retracted.** The user confirmed mid-task that they physically hold the mic: **PDM digital microphone, marking T3902, SKU AX22-0044**, standard 22×22 mm AX22 snap-in. It has no `parts/` folder because it is new hardware not yet listed on the Axiometa website — an uncatalogued product, not absent hardware.

Everything downstream has been corrected: **the siren patterns (P1, P2, P3) are first-class, fully-resourced vocabulary entries with the same standing as the ToF and bus patterns.** They are not hedged and not contingent. I additionally verified the PDM question that this raised — **ESP32-S3 does PDM→PCM decimation in hardware** — in §Feasibility Notes.

**Generalisable lesson: `parts/` is a catalogue snapshot, not a complete BOM. No track should infer that hardware is absent from a missing folder.**

### Transcript quality and how I handled it

The transcript is a **single-speaker-attributed ASR capture of a multi-person conversation**. Everything is attributed to "Me:" although at least three people are clearly talking. Turn boundaries are lost, so **I cannot attribute any statement to a specific individual, and I have not tried.** Where I say "the speaker", I mean "whoever was talking at that point in the transcript".

Mis-transcription is heavy. I applied the substitution key supplied in my brief and decoded conservatively:

| Garbled | Read as | Confidence |
|---|---|---|
| "model" / "mortal" / "the model" | **Modal** | High (context: hosting, "we have to use X somehow") |
| "cloth sub agents" / "fraud agents" | **Claude subagents** | High |
| "broad" / "clod" / "claud" | **Claude** | High |
| "death plant" / "best blind" / "deaf to my impression" | **DeafBlind** | High |
| "eczemata" | **Axiometa** | High |
| "Danish dictionary thing, 103" | *103 Haptic Signals* (Danish Association of the DeafBlind) | High |
| "the ml right? No, it's the erm" | LRA vs **ERM** | High |
| "one cork company" / "roll cup" | World Cup / football-analytics analogy | High |
| "BAI" | "the AI" | High |
| "series" (in "different levels of series") | **severity** | High |
| "the big pit" | the big **pitch** | High |
| "rabbit hoods" | rabbit **holes** | High |
| "caves" (in "there's caves, there's dogs") | **canes** | High |
| "bread" / "the bread" (in "your dog can't read that") | **read** | High |
| "murder. S." (in "where are these murder. S.") | **motors** | Medium |
| "one cent is bloody expensive" | LiDAR unit cost aside | Medium |
| "Okay sweet bored" | **Be My Eyes** | Medium (context: connects you to a volunteer who answers questions) |
| "I think we've been that off" | "we've **binned that off**" / "pared that down" | Medium — see §Detailed Adjudications D14 |
| "somebody would notice that you have fun. They will bring you the car" | unrecoverable | Low — excluded from findings |
| "Very basic lilac" | LiDAR | Low |

**Rule I followed:** every decision I tag is anchored to a verbatim quote. Garbled quotes are marked `[sic]` with my decoding in square brackets. **Where a passage was too corrupt to decode with confidence, I excluded it rather than guessing** — those exclusions are listed in Residual Risk. I did not paraphrase anything load-bearing.

### ⚠️ One physical fact overrides PIVOT v2 §4 — and it is already measured

My brief instructed me to design defensively because Track 1 was measuring the port-to-port distance in parallel. **That measurement already exists in this repository, at HIGH confidence, and Track 1 does not need to repeat it.**

`audit/speech-to-braille-wearable/20-enclosure-cad-consolidated.md:17,19` and `16-phase1-reconciled-dims.md:62`:

> `| Ports | centres (±12, ±12), pitch 24.0; silk P1(−12,−12) P2(+12,−12) P3(+12,+12) P4(−12,+12) ... | HIGH |`
> `| Motors (diagonal Ports 1 & 3) | ERM 22×22 seats at (−12,−12) and (+12,+12); motor envelope top +15.25; **separation 33.9** | HIGH |`

This was derived from two board photos plus STEP refdes binding, and **independently double-confirmed across two adversarial audit phases** (`20` §3). The ERM module centres sit on the port centres (header centroid offset measured at exactly 0.00 for ERM modules, vs −3.55 for the LCD — `16` C12), so motor-to-motor ≈ port-to-port. Allowing for the ERM envelope's ±(0.85, 0.70) offset within its module, worst case is ≈32–36 mm.

**Motor separation is 33.9 mm. PIVOT v2 line 472 cites vibrotactile two-point discrimination on the forearm as ~70 mm. We are at 48% of the threshold — under it by a factor of two.**

Consequences, which drive the entire Task B design:
1. **PIVOT v2's "opposite sides of the wrist" (line 472) and "~7cm apart" premise is false.** No AX22 Port Extension Kit was purchased (`plan/2026-07-17…:18` — "**no AX22 Port Extension Kit, no extension/ribbon leads, no purchased extras of any kind**"), so both motors snap directly into board ports. PIVOT v2 line 432 still offers the extension kit as an option; that option does not exist.
2. **Spatial LEFT/RIGHT is not an available channel.** Every pattern in my vocabulary is time-coded.
3. **PIVOT v2 §8 Phase 1 (line 641) contains a blocking gate with no possible remedy** — see D20. This must be rewritten before anyone starts building.

---

## Decision Log

Tags: **CONFIRMED** = transcript says it, PIVOT v2 captures it faithfully · **NEW** = transcript raises it, PIVOT v2 misses or only partly captures it · **CONTRADICTS** = they disagree.

| # | Point (verbatim quote) | Tag | PIVOT v2 ref | Recommendation |
|---|---|---|---|---|
| 1 | Severity tiers exist — *"we have different levels of series"* [sic → severity] | CONFIRMED | §7 L623–631 | Keep. |
| 2 | Siren is the top tier — *"It's very severe. It's a siren."* | CONFIRMED | §7 L627 | Keep. |
| 3 | Siren auto-triggers the camera — *"maybe the camera picked up. That would be actually really good."* | CONFIRMED | §7 L627 (CRITICAL → "auto-triggers camera") | Keep. **CRITICAL is the only tier that auto-triggers.** See D1. |
| 4 | Auto "turn around" on siren — *"maybe to automatically saying just like turn around to like gather more information. Maybe that's kind of an automatic step if it's a siren"* | CONTRADICTS | §7 L633 warns against it | **Superseded, not rejected** — and PIVOT's *reasoning* is editorial. See D2. Ruling: no turn instruction ever, at any tier. |
| 5 | Camera activates on reaching destination — *"Maybe we can turn on once you reach the destination to give you, like, access into what you need to see."* | **NEW** | **Absent from PIVOT v2 entirely** | **Adopt in substance, not in mechanism.** See D3. |
| 6 | Arbitration gestured at — *"it's going to be very. Like sequential. Like, it doesn't have to be like."* [sic] | **NEW** | **Absent — PIVOT v2 never addresses pattern collision** | Firmware cannot be written without this. See §Severity Arbitration Rules. |
| 7 | Bus-stop use case is born — *"It's a bus stop, right? Like, how does a [DeafBlind] person know which bus arrives?"* | CONFIRMED | §1 L383–387 | Keep — this is the origin moment. |
| 8 | Device advises where to stand — *"Now just stand here. Oh, yeah. We have a good view."* | **NEW** | Absent | **Roadmap only.** No reliable channel to say "move here". See D4. |
| 9 | Google-Maps destination input — *"I was joking around the Google Maps thing, but I think we could do something similar where basically you input a destination. On the app."* | CONTRADICTS | §0 L361–366 locks away from navigation | **Dropped, and never re-committed.** See D5 + Scope Boundary Ruling. |
| 10 | Premise challenged — *"But isn't that the point that we're trying to go to a new place? Right? Rather than."* [sic] | **NEW** | Absent | Records that destination-input was contested in the room, not silently abandoned. |
| 11 | Vision covers distance / cane covers near-ground — *"the visual moment will always be way better at things that are distance… Like a cane… It's very good. I'm short distance… But it sucks on everything that is not on the floor."* [sic] | CONFIRMED | §1 L375, §11 L691 ("The cane is assumed") | Keep verbatim — it is the cleanest statement of the division of labour anywhere in the corpus. |
| 12 | ERM, not LRA — *"Is it the ml right? No, it's the erm."* | CONFIRMED | §3 L428–429 | Keep. Drives real timing limits — see §Feasibility Notes. |
| 13 | Motors NOT in hand — *"The vibration motors we haven't got it yet."* | CONTRADICTS (internal) | §3 L428–429 assumes possession | **Stale** — superseded within the same meeting and by present possession. Recorded for the record. See D6. |
| 14 | Motors, mic, ToF ALL in hand — *"we have the tof, the depth sensor. We have a digital microphone. We have two vibration Motors."* | CONTRADICTS (internal only) | §3 L425–431 allocates Port 4 to a mic | **Accurate — this is the correct statement of the two.** Mic confirmed in hand: **PDM, marking T3902, SKU AX22-0044.** See D6. |
| 15 | Motors still unlocated at meeting end — *"where are these [motors]. Where the fellas is the question"* [sic] | **NEW** | Absent | Reads as *locating* them, not *lacking* them — an in-the-room logistics moment. Resolved: both ERMs are in hand. |
| 16 | Pare the Danish book down to a small own set — *"I was thinking about the Danish dictionary part, I think we've [pared] that [down] and we just come up with our very like very small set of. Like 10 or 15 gestures"* | CONFIRMED (under-delivered) | §4 L482–492 — **9 rows** | **Direct mandate for Task B.** PIVOT delivers 9, mandate is 10–15. My table delivers 11. See D14. |
| 17 | Book's signals are drawn strokes that won't transfer — *"what you were mentioning about like touching. And feeling it which is obviously not going to be the same as what we're trying to do."* | CONFIRMED | §4 L466–476 ("We cannot reproduce the signals. We can reproduce the grammar.") | Keep — PIVOT's framing is a faithful, well-argued upgrade of what was said. |
| 18 | Application deferred — *"let's assume there will be an application down the road."* | CONFIRMED | §8 L660–661 (skip-the-phone fallback) | Keep. The phone is explicitly not on the critical path. |
| 19 | Core reframe: they know *where*, not *what* — *"you already know where it is… Now what's happening around you is kind of what you don't know."* | CONFIRMED | §0 L366 | Keep — PIVOT's §0 is a faithful and better-written version of this exact passage. |
| 20 | Boarding/seat-finding is already solved by the user — *"I'll find my seat. I use my usual tool. We can still build something that aids that process."* | **NEW** | Absent | Feeds the "cane is assumed" argument and the out-of-scope answer. See D7. |
| 21 | Once seated, the tactile channel stops working — *"But once I sit down… Once you sit, once you don't have. Your tactile sense"* [sic] | **NEW** | Absent | **Explicitly OUT OF SCOPE, roadmap only.** Pre-written judge answer in §Positioning Paragraphs. |
| 22 | Regulated-environment analogy — *"it's basically like a sports playing field in the modern era… it's one of the most measured places of every millimeter, even the ball"* vs *"for us, the open world is like one of the most difficult cases because there's so much, there's not track"* [sic] | **NEW** | Absent — §0 asserts the lock with no stated rationale | **This is the actual reasoning for the narrow scope.** Cleaned-up paragraph supplied in §Positioning Paragraphs. See D8. |
| 23 | GPS / mapped-city data as a second source — *"Some cities are highly mapped… [Google] has been mapping cities. Forever… not the question I asked, can we make use of that? Should we make use of that?"* | **NEW** | Only as roadmap (§13 L725, Soundscape/OSM) | **Raised and deliberately set aside.** Set-aside statement supplied. See D9. |
| 24 | Lands on situational awareness, not navigation — *"I'm thinking the big [pitch] should be around… not necessarily navigating… I think it's really just situational awareness"* [sic] | CONFIRMED | §0 L364 ("Pitch spine … Situational awareness") | Keep. **This sentence is the scope boundary.** |
| 25 | LiDAR rejected on size/cost — *"It's massive. It won't fit on your head. Is that huge? And it's like 50 grand"* | **NEW** | Absent | Add one line to §3 — it justifies the ToF choice as considered, not defaulted. |
| 26 | Lock one application and hardcode it — *"We should lock in the vision"* · *"We want to pick one application to lock it in… and hard code the fuck out of it"* | CONFIRMED | §0 L359–361 | Keep. This is the lock moment. |
| 27 | Work backwards from the demo — *"let's just think about the demo and work backwards"* | **NEW** | §10 exists but the method is not stated | Add as a stated method — it justifies why §10 drives §8. |
| 28 | Bus demo is hard to stage — *"I know it's quite hard to replicate"* | CONFIRMED | §9 L671 (printed sign / tablet prop) | Keep. |
| 29 | **"your dog can't read that"** — *"so your dog can't read that. Everybody knows the [read]."* | **NEW** | Absent | **Adopt as a headline pitch line.** See D10. Strongest single sentence in the transcript. |
| 30 | Parallel workstreams — *"Each one of us will like focus on like one bit."* | **NEW** | Absent | Process note; matches the 3-track structure already in use. |
| 31 | No separate vision model needed; Claude alone can do it — *"I don't even think we need an image. Like we don't even need like a video model. We can probably do just do the entire thing with [Claude]."* | **CONTRADICTS** | §6 L535–563 builds a two-model YOLO + Claude pipeline | **Serious architecture conflict.** See D11. |
| 32 | Modal use is an obligation, not a need — *"I know we have to use [Modal] somehow"* (said twice) | **NEW** | §6 L565–589 presents Modal as technically motivated | Be honest internally; keep the external framing. See D11. |
| 33 | ffmpeg → frames → Claude — *"ffmpeg just a library feed the video get images out frames out give that to [Claude]"* | **NEW** | Absent (PIVOT assumes frames arrive pre-formed) | Trivial to adopt; removes a video-handling unknown. |
| 34 | Frames may not show the number — *"Frames. Might not. Always. Show."* | CONFIRMED | §9 L669 (multi-frame voting) | Keep. |
| 35 | Face recognition = long term — *"in the long term you could probably build a feed up a list of people you know"* | CONFIRMED | §13 L728 | Keep as roadmap. |
| 36 | **The crux is the output channel** — *"how do you feed that information to the endpoint person… how do you actually give the [DeafBlind person the impression]? That is like the most crux of the problem"* | **NEW** | §4 solves it but never names it as the crux | **Reframe the pitch around this.** See D12. |
| 37 | Judges reward decomposition — *"They valued a lot that we were able to like break the [problem] down to very good parts we couldn't solve anything with the tech we have is [the AI]"* [sic] | **NEW** | Absent | Positioning input. See D13. |
| 38 | Current DeafBlind options are bad — *"either walking to a different bus or traveling with someone that could help identify"* | CONFIRMED | §1 L387 | Keep. |
| 39 | Flagging every bus is worse — *"All day flag every bus. Yeah that will be even more difficult."* | **NEW** | Absent | One-line addition to §1 — pre-empts "why not just hail every bus?" |
| 40 | Blind (hearing) users are already served — *"a lot of solutions for [blind] people that will tell you… the 88 is approaching now"* | CONFIRMED | §1 L389–393 | Keep. Sharpens the gap to *DeafBlind specifically*. |
| 41 | Be My Eyes = volunteer video call — *"it'll connect you to someone and they basically ask you a question because they're like what is this ingredient?"* | CONFIRMED | §1 L390, §2 L403 | Keep. |
| 42 | Soundscape now open source, 3D audio, clock positions — *"microsoft soundscape that is now open source it's a 3D audio navigation system… it says like coffee shop at two o'clock [bus] stop at 11 o'clock"* | CONFIRMED | §1 L391, §13 L725 | Keep — **independently re-verified**, see §Grounding Notes. |
| 43 | Explore Soundscape ideas for the mic — *"we could also explore that for the microphone"* | **NEW** | Absent | Too vague to action. Logged, no recommendation. |
| 44 | Team's own one-liner — *"we are building a spatial awareness device for deafblind people… use [Axiometa's] different senses… to detect noises vision and then feed that to a deafblind person use a haptics"* | CONFIRMED (with drift) | §0 L364 says **situational** awareness | **Standardise on "situational awareness"** — the speaker self-corrected to it at #24. Terminology drift only. |
| 45 | *"there's [canes] there's dogs we've talked to right yeah yeah we talked to them"* [sic] | **AMBIGUOUS — integrity risk** | §11 L697 states "We have not validated with DeafBlind users" | **Do not claim user contact.** See D15. |
| 46 | The lock, restated and personal — *"I'm very keen on the bus idea… Let's just fucking send it."* | CONFIRMED | §0 L361 | Keep — this is the moment the room committed. |

---

## Detailed Adjudications

### D1 — Severity → auto-response mapping: which tier triggers the camera

**Transcript:** the only automatic camera trigger discussed is on a siren — *"Okay, maybe the camera picked up. That would be actually really good."* Nothing in the transcript proposes auto-triggering the camera at any lower tier.

**PIVOT v2 §7 (L625–631)** maps: CRITICAL (siren + rising amplitude) → *"auto-triggers camera"*; WARNING (siren steady/receding, horn) → *"no camera"*; ADVISORY (ToF) → gentle pulse; BUS ARRIVING → vision-initiated; ON-DEMAND → button.

**Ruling: PIVOT v2 is faithful and correct. CONFIRMED.** The one thing worth stating that PIVOT leaves implicit is the *reason* the split is right, and it is a cost/latency reason as much as a UX one: auto-triggering vision on every WARNING would fire the cloud pipeline on every passing horn, spend the Modal budget on noise, and train the user to ignore the wrist. **Only CRITICAL auto-triggers. Everything else requires the button.** Add that sentence to §7.

### D2 — The "turn around" caution: endorsed, questioned, or rejected?

This needs to be precise because PIVOT v2 states it as a rule and my brief asks whether the rule is grounded.

The full arc in the transcript is:

> *"And then maybe like maybe to automatically saying just like turn around to like gather more information. Maybe that's kind of an automatic step if it's a siren… Maybe it's like, hey, stop and [?] only like turn around. Yeah. I mean, it's going to be very. Like sequential. Like, it doesn't have to be like. Okay. Of course, if it was real, maybe. Right. Okay. Okay, maybe the camera picked up. That would be actually really good."* [sic]

Read carefully, that is: **proposed → weak assent ("Yeah") → the proposer themselves hedges ("it doesn't have to be", "if it was real, maybe") → the room lands somewhere else: the camera may already have the frame.**

**Ruling — three separate findings, stated separately because they have different standing:**

1. **The decision is grounded.** *"Maybe the camera picked up"* is a real transcript moment and it is exactly PIVOT v2's *"Capture what the camera already sees."* PIVOT's operative instruction is faithful.
2. **The stated reasoning is editorial.** PIVOT v2 L633 justifies it as *"Asking a DeafBlind person to rotate in place during an emergency is a lot, and they cannot verify they turned the right way."* **That argument appears nowhere in the transcript.** It is the document's own addition. It happens to be correct and it is the better argument — but the team must not tell a judge "we decided this for accessibility reasons in our design meeting." They decided it pragmatically; the accessibility reasoning is a later rationalisation. Say it as a design principle, not as meeting history.
3. **Nobody rejected it.** Turn-around was *superseded*, not killed. That matters, because PIVOT v2 L633 leaves a residual path open: *"only prompt a turn if Claude reports insufficient information."*

**I am closing that residual path, and this is a Task B ruling.** With two motors 33.9 mm apart there is no reliable way to encode "rotate", and a rotation instruction the user cannot verify they executed correctly is worse than no instruction — it produces a user who has turned an unknown amount in an unknown direction and now believes the device has seen something. **There is no TURN pattern in the locked vocabulary and there must not be one.** On insufficient information the device fires `UNKNOWN` (P8). PIVOT v2 L633's final clause should be deleted.

### D3 — "Activate the camera on reaching a destination"

*"Maybe we can turn on once you reach the destination to give you, like, access into what you need to see."*

**Is it in PIVOT v2? No.** I grepped the whole file for `destination|reach|arriv`: every hit is either the bus *arriving*, the bus's *destination blind*, or Claude's `destination` JSON field. **The idea of the device changing behaviour on arrival at a place is absent.**

**Should it be, under the locked bus-stop scope? Yes — in substance. No — in mechanism.**

- **In substance, it is the scope's own logic.** The locked demo *is* "the user is at the bus stop". Something has to put the device into bus-watching mode. Right now PIVOT v2 has vision running continuously with no stated entry condition, which is both a battery story and a false-positive story the team has no answer for.
- **In mechanism, "reaching a destination" requires knowing where the user is — which is GPS, which is out of scope** (D9, Scope Boundary Ruling). Adopting the mechanism would smuggle geolocation back in through the side door.

**Ruling: adopt as an explicit, manually-entered MODE, not a geofence.** The device has a `BUS_STOP` mode entered by the user (long-press, or a toggle in the app), and vision only runs in that mode. This delivers exactly what the speaker wanted — *"turn on once you reach the destination"* — costs nothing, keeps GPS out, and gives the demo a clean "and now I arrive at the stop and tell it so" beat. It also honours the transcript's own framing that the user already knows where they are (#19). Add to PIVOT §7 as a precondition row.

### D4 — "Stand here, we have a good view"

*"Now just stand here. Oh, yeah. We have a good view."* — the device advising the user on positioning so the camera has line of sight.

Genuinely interesting, and it is the natural partner to D3. But it requires telling a user to *move*, which is spatial guidance, which the hardware cannot deliver (33.9 mm). A "move left" the user cannot verify is the same failure mode as "turn around" (D2).

**Ruling: OUT for this build, roadmap only.** Record it so it doesn't look overlooked. The honest version for a roadmap slide: *"framing feedback — a back-worn or multi-actuator array could guide the user into a position with line of sight to the stop; two co-located actuators cannot."* This connects directly to the array item PIVOT v2 already has at §13 L724.

### D5 — Google Maps / destination input: abandoned or merely dropped?

**My brief flags this as binding, so I am being exact.**

The idea is raised at length and with enthusiasm: *"I think we could do something similar where basically you input a destination. On the app… And then it's pointing you towards it. And then the actual on device is there for any obstacles on the way… it's kind of like an all kind of more tied in of a story."*

It is then **immediately contested in the room**: *"But isn't that the point that we're trying to go to a new place? Right? Rather than."* [sic] — garbled, but unmistakably a challenge to the premise.

It is then **never mentioned again for the entire remainder of the meeting.** The conversation moves to the cane/vision division of labour, then to the reframe (#19), then to the regulated-environment analogy (#22), then to geospatial (#23), and lands at *"I'm thinking the big [pitch] should be around… not necessarily navigating… I think it's really just situational awareness"* (#24), followed by the hard lock (#26, #46).

**Ruling: dropped, contested, and then superseded by an explicit contrary commitment — but never uttered as a rejection.** I will not overstate this. Nobody said "we're not doing destination input."

**However — and this is the part that binds — the standard the brief set is "explicit re-commitment", and there is none.** The last thing anyone says about the navigation frame is *"not necessarily navigating… it's really just situational awareness"*, and the last thing anyone says about scope at all is *"pick one application to lock it in… and hard code the fuck out of it"* and *"I'm very keen on the bus idea."* The direction of travel across the whole meeting is monotonic: from broad navigation toward one narrow awareness scenario. **The final plan may not reintroduce general navigation.** See Scope Boundary Ruling.

### D6 — Conflicting hardware-possession statements

**⚠️ This adjudication was revised after my initial draft.** My original brief stated that `parts/` contained no microphone module and instructed me to record the meeting's mic claim as false. **The user has since confirmed directly that they physically hold a digital microphone module.** It is new hardware not yet listed on the Axiometa website, which is why no `parts/` folder exists for it. The absence of a folder reflected an uncatalogued new product, not absent hardware. **My earlier "the mic claim is false" finding is retracted in full.**

Confirmed module: **PDM digital microphone · marking T3902 · SKU AX22-0044 · standard 22×22 mm AX22 snap-in.**

Recorded in full, all three statements:

> **Claim A (earlier):** *"The vibration motors we haven't got it yet."*
> **Claim B (later, same meeting):** *"in terms of components, we have the tof, the depth sensor. We have a digital microphone. We have two vibration Motors."*
> **Claim C (meeting end):** *"where are these [motors]. Where the fellas is the question"* [sic]

**Findings:**

- **The internal contradiction is real and still worth logging.** A and B directly conflict on the motors, within a single meeting. Anyone reading the transcript cold will hit it, so it belongs in the record.
- **The resolution is that B is the accurate statement and A is stale.** The ToF, the PDM mic, and both ERMs are all in hand. B reads as a deliberate inventory summary spoken for the benefit of the research subagents (*"so I can now send off [Claude] agents"*), and it was correct.
- **C is best read as *locating* the motors, not *lacking* them** — a logistics moment in the room ("where did we put them"), not a possession claim. It does not undercut B.
- **PIVOT v2 §3 L430's Port 4 → "Digital Microphone" allocation is therefore correct**, and §5 L519–527's Tier-2 acoustic differentiator rests on hardware that exists.

**Consequence for this document: the siren patterns are first-class.** P1 DANGER, P2 SIREN WARNING and P3 ATTENTION are core vocabulary entries with exactly the same standing as the ToF and bus-arrival patterns. They are not hedged, not conditional, and not at risk pending sourcing.

**The one genuine unknown that remained — the mic's interface — is now settled as PDM, and I have verified what that means for the build.** See §Feasibility Notes → "PDM capture on ESP32-S3". Short version: **ESP32-S3 supports PDM RX in hardware with a PDM-to-PCM converter on I2S0, so `arduinoFFT` receives ordinary 16-bit PCM and the siren path is straightforward.** No software decimation, no CPU cost.

**Lesson worth carrying:** a missing `parts/` folder is evidence about the *catalogue*, not about the *bench*. This project's parts inventory is not a complete BOM for new or uncatalogued modules, and no track should infer absence from it again without asking.

### D7 / D8 / D9 — see §Positioning Paragraphs

The "once you sit down" distinction (#20, #21), the regulated-environment analogy (#22), and the GPS set-aside (#23) are all **NEW** and all missing from PIVOT v2. Because my brief asks for them as usable prose rather than analysis, they are written out in full in §Positioning Paragraphs below. The rulings in one line each:

- **D7 — "once you sit down": OUT OF SCOPE, roadmap only.** In-transit / on-board awareness is a genuinely distinct problem from bus identification, the speaker identified it as such, and it needs a different sensing story. Pre-written judge answer supplied.
- **D8 — regulated environment: this is the rationale for the narrow scope**, and without it §0's lock reads as arbitrary. Supplied as finished prose.
- **D9 — GPS / geospatial: raised explicitly, deliberately set aside.** The set-aside is grounded in the speaker's own next sentence (*"not necessarily navigating… it's really just situational awareness"*). Supplied as a quotable statement so the idea is visibly considered rather than silently missing.

### D10 — "Your dog can't read that"

*"But yeah, so your dog can't read that. Everybody knows the [read]."*

**This is the best sentence in the transcript and PIVOT v2 does not have it.**

PIVOT v2 §11 L691 has *"The cane is assumed"*, which handles the cane objection. It has no equivalent for the guide dog, and the guide dog is the harder objection because a dog *is* intelligent, *does* navigate, and *does* handle obstacles — so "why not just a guide dog?" is a real question with a real answer that the current pitch does not give.

**Ruling: adopt verbatim as a headline positioning line.** *"A guide dog gets you to the bus stop. A guide dog cannot read the bus."* It is one sentence, it is unarguable, it complements "the cane is assumed" exactly, and it makes the same point about the *semantic* gap that the whole vision pipeline exists to fill. Add to §11.

### D11 — Vision architecture: the transcript and PIVOT v2 disagree

**This is the largest CONTRADICTS in the corpus and I am flagging it for Track 2 rather than resolving it, because the vision pipeline is not my scope. But the transcript evidence must be on the record.**

**What was actually said:**
> *"I don't even think we need it because like I know we have to use [Modal] somehow, but I don't even think we need an image. Like we don't even need like a video model. We can probably do just do the entire thing with [Claude]. But I know we have to use [Modal] somehow."*
> *"a video is just a bunch of images. So you can have a deterministic kind of [ffmpeg]… feed the video get images out frames out give that to [Claude] and [Claude] can… it does everything."*

**What PIVOT v2 §6 (L535–563) builds:** a two-stage pipeline — Modal-hosted YOLO for detection and cropping, then Claude on the crop only — and argues at L559–563 that *"the split is real, not decorative"* on cost, OCR quality, and state-change detection grounds.

**Adjudication:**
- **PIVOT v2's technical arguments are good.** Cropping genuinely improves OCR. A detector genuinely gives you the *when*. The two-stage haptic (alert now, number later) genuinely depends on having a fast detector.
- **But the room's stated position was the opposite**, and the room's stated reason for involving Modal at all was *"I know we have to use [Modal] somehow"* — said **twice**. That is a sponsor/prize obligation, not a technical requirement, and PIVOT v2 §6 presents Modal as technically motivated without ever recording that.
- **Both can be true.** The honest reconciliation: Modal's role is genuinely useful *and* its selection was obligation-driven. Nobody needs to hide that — hackathons have sponsor tracks and everyone knows it.

**Recommendation for Track 2 / synthesis, in priority order:**
1. **Ship the Claude-only path first.** It is what the room believed would work, it has one moving part, and it is the shortest route to a working demo on a 1.5-day clock. `ffmpeg` → frames → Claude → JSON.
2. **Add the Modal/YOLO detection stage second, as the thing that gives you the immediate BUS ARRIVING alert** — which the Claude-only path genuinely cannot do at acceptable latency or cost. That is the honest technical justification for the split, and it is the one PIVOT v2 already makes best (L563).
3. **Do not put the two-stage pipeline on the critical path.** If YOLO is not up by the deadline, BUS ARRIVING fires off Claude's own `bus_present` boolean, one second later, and nothing else changes.
4. Internally, record that Modal usage is partly an obligation. Externally, §6's argument stands on its own merits — no need to say otherwise.

**Note this changes nothing in my vocabulary.** BUS ARRIVING and ROUTE NUMBER are triggered by pipeline outputs, not by which model produced them.

### D12 — The crux is the output channel, and the pitch does not say so

> *"I think the biggest problem is how do you feed that information to the endpoint person… how do you actually give the [DeafBlind person the impression]? That is like the most crux of the problem I think it's… a nice [problem] to solve"*

PIVOT v2 §4 does the work — it is the longest and best-researched section in the document. But **§11 Positioning never claims it as the hard part.** The pitch as written leads with the sensing (audio + vision + haptics, the unoccupied square at §2 L409) and treats the haptic language as an implementation detail with a good citation.

**Ruling: invert the emphasis.** Anyone can detect a bus. The unsolved problem — the one the room itself identified as the crux — is delivering a number to a person with two closed channels, through two point actuators, in a way they can act on. That is where the actual design work in this project went, it is the part a judge cannot dismiss as "you called an API", and it is what §37 says judges reward. **Lead the pitch with the output problem, not the input problem.**

### D13 — "Break the problem down" is a scoring insight, and it is missing

> *"I literally [won] a hackathon just for [that], no joke right because… They valued a lot that we were able to like break the [problem] down to very good parts we couldn't solve anything with the tech we have is [the AI] right but that's what it's also about right"*

First-hand evidence about how this kind of event scores: a prior hackathon was won primarily on **problem decomposition**, explicitly *without* a complete technical solution. PIVOT v2 §11 has nothing on this — it is entirely about defending the solution.

**Ruling: adopt as a positioning input.** Concretely: the pitch should show the decomposition explicitly — closed channels → three latency tiers matched to urgency (§5) → what each tier can and cannot do → what is honestly unsolved. **The three-tier latency architecture is already the team's strongest decomposition artefact and it is currently buried at §5 as an implementation detail.** Put it on a slide. Combined with §11 L697's existing honesty about no user validation, this converts the project's biggest weakness (nothing is fully solved in 1.5 days) into the thing the speaker says judges actually reward.

### D14 — Vocabulary size: the mandate vs the delivery

> *"I was thinking about the Danish dictionary part, I think we've [pared] that [down] and we just come up with our very like very small set of. Like 10 or 15 gestures all our vibrations"*

Note on decoding: *"we've been that off"* is most likely British *"binned that off"* (discarded) rather than "pared that down". **The distinction does not change the outcome** — either reading produces "stop trying to implement the 103-signal book, define our own small set" — so I have not relied on resolving it. Logged in Residual Risk.

**PIVOT v2 §4 L482–492 delivers 9 rows against a 10–15 mandate.** More importantly, **4 of those 9 have no trigger under the locked scope**: LEFT, RIGHT, AHEAD, and STOP are navigation directives, and general navigation is out (Scope Boundary Ruling). There is no condition in firmware that would ever fire "LEFT". They are vestigial from the v1 navigation framing.

So PIVOT v2's effective usable vocabulary is **5 patterns** (DANGER, WAIT, SIREN/NOISE, BUS ARRIVING, NUMBER), and it is missing every system state, all feedback, the ToF advisory, and any low-confidence signal — i.e. most of what firmware actually needs to emit.

**Ruling: cut LEFT / RIGHT / AHEAD / STOP / MOVE OVER entirely.** They are unbuildable (spatial, 33.9 mm) *and* untriggerable (no navigation). Replace with the 11-row set below, which is inside the mandate, fully triggered, and fully implementable.

### D15 — "we talked to them" — do not build a claim on this

> *"it's a very compelling problem that can clearly show okay there's [canes] there's dogs we've talked to right yeah yeah we talked to them it turns out there is nothing to give you any situational awareness"*

Two readings: (a) "we talked to [DeafBlind people]", or (b) "we talked *about* them" / "we talked to [people about canes and dogs]". The ASR gives no way to settle it, and the surrounding words are among the most corrupt in the transcript.

**Ruling: do not claim user contact.** PIVOT v2 §11 L697 already states *"We have not validated with DeafBlind users"* and frames it correctly against the "nothing about us without us" norm. **That line must survive into the final plan unchanged.** If somebody on the team did in fact speak to a DeafBlind person, that is valuable and should be documented properly with who and when — but it cannot be established from this transcript, and a judge who knows the field will ask. An unsupported claim of user contact is the single most damaging thing this team could say. Flagged in Residual Risk as resolvable only by asking the team.

### D16 — PIVOT v2 §10's demo script contradicts PIVOT v2 §4's own encoding

Minor but it would have been caught live on stage. §10 L682: *"Two seconds later, **eight pulses**: it's the 88."* Under §4 L492's encoding (*n* short pulses per digit), route "88" is **sixteen** pulses, not eight. The demo script silently encodes "88" as a single symbol. **Fixed by the encoding decision below**, which delivers "88" in 8 discrete elements — coincidentally making §10's line correct for the first time.

### D17 — Terminology: "spatial" vs "situational" awareness

The team's rehearsed one-liner says *"spatial awareness device"*; the speaker's own considered landing was *"it's really just situational awareness"*. PIVOT v2 correctly uses situational. **Standardise on "situational awareness"** — spatial awareness implies geometry and navigation (which is out), situational awareness implies events and semantics (which is the whole pitch). Small change, real consequence for how the scope reads.

### D18 — PIVOT v2's "phantom sweep" is overstated but not absurd

§4 L494: *"The L→R fade is the technical highlight. Sequential activation of two spaced actuators produces a phantom sweep… Real perceptual effect, not a workaround."*

Being fair rather than blunt, because the underlying phenomenon is real:
- **Tactile apparent motion between two actuators is a genuine, documented effect**, and it has been demonstrated on wrists with smart bracelets — 33.9 mm is not automatically too close.
- **But it requires tuned stimulus onset asynchrony.** The literature puts the usable window at roughly SOA 80 ms for 120 ms bursts, ~120 ms for 240 ms bursts — SOA scaling at roughly half the burst duration. **Too long and "the two vibrations will be perceived as discrete and no illusion of movement will occur."**
- **PIVOT v2 specifies a 400 ms crossfade.** At that SOA the effect does not occur; the user feels two successive buzzes. The pattern as written does not do what the document claims it does.
- Additionally, ERM motors have sloppy, load-dependent rise and decay (see §Feasibility Notes), so precise SOA control is poor — and with 2PD at ~70 mm the *endpoints* are not separately resolvable, so even if motion is felt, its *direction* is not reliably reportable.

**Ruling: do not build meaning on apparent motion.** No pattern's semantics may depend on direction. If the team wants the effect as a demo flourish, retune SOA to ~100 ms and treat it as decorative. §4 L494 should be softened from "technical highlight" to an honest description, or a judge with a haptics background will take the pitch apart on exactly this point.

### D19 — PIVOT v2's "<200 ms" siren classification is not achievable, for physics reasons

§5 L519 frames Tier 2 as *"Awareness (< 200ms, onboard FFT)"* and L523–525 defines the siren signature as a 400→1300 Hz sweep plus ~2.5 Hz yelp modulation.

**A 2.5 Hz modulation has a period of 400 ms. You cannot observe it in 200 ms.** A wail sweep cycle is 1–4 s (verified, see Grounding Notes). **These are properties of the signal, not limits of the ESP32** — no optimisation fixes it. Full analysis and the fix in §Feasibility Notes.

### D20 — PIVOT v2 §8 Phase 1 contains a blocking gate with no possible remedy

L640–641:
> *"Mount motors **opposite sides of wrist**"*
> *"**Blindfold discrimination test** — fire one at random, call left/right, need ~90%. **If this fails, move them apart before building anything on top.**"*

Three problems, compounding:
1. **"Opposite sides of the wrist" is not achievable** — no extension leads exist, so both motors are on the board, 33.9 mm apart on the {1,3} diagonal.
2. **The test is expected to fail** at 33.9 mm against a ~70 mm 2PD threshold.
3. **The prescribed remedy — "move them apart" — is impossible.** There is no hardware that allows it. §12 L710 repeats the same non-remedy as the mitigation for the "High" severity risk *"Motors too close → no L/R discrimination"*.

**As written, Phase 1 step 2 can only produce "fail, and now we are blocked", at the very start of a 1.5-day build.**

**Ruling: rewrite Phase 1.** Because **no pattern in my locked vocabulary depends on L/R discrimination**, the blindfold test is no longer a gate on anything — it is a 10-minute measurement that, if it passes, unlocks optional future spatial patterns. Move it out of the critical path. Delete the "move them apart" remedy from §8 and §12 and replace the §12 risk mitigation with "vocabulary is time-coded; spatial discrimination is not required" — which retires that High risk entirely rather than mitigating it.

---

## Positioning Paragraphs (ready to paste)

*Three finished paragraphs. Lift directly; no editing needed.*

### 1. Why we scoped to one scenario — the regulated-environment rationale

> Think about why computer vision works so well in professional sport. A football pitch in 2026 is one of the most exhaustively measured environments on earth — every line surveyed, every player tracked, the ball itself instrumented to the millimetre. The problem is tractable because the world has been constrained in advance. The open street is the exact opposite: unbounded, cluttered, unmapped, and nothing in it is tracked. That is why general-purpose assistive navigation has stayed hard for decades while sports analytics became a solved commercial product. **So we did the only thing a small team can do about that asymmetry: instead of waiting for the world to become measurable, we picked one situation and constrained it ourselves.** A person standing at a bus stop, waiting to find out which bus just pulled in. Fixed location, known question, small answer space, an outcome that is either right or wrong with nothing in between. We are not claiming to have solved open-world awareness. We are claiming that this is the right shape of problem to solve first, and that solving it properly is worth more than gesturing at all of them.

### 2. "What happens after they board?" — the out-of-scope answer

> Honestly? Nothing — and that is deliberate. A DeafBlind traveller already has working strategies for boarding and finding a seat: the cane, the dog, the driver, the routines they have built over years. We are not going to pretend we improve on that in a day and a half. **But there is a real second problem sitting right behind ours, and it is worth naming: the moment you sit down, the channel that was doing all the work stops working.** Walking, the cane is in constant contact with the world and it is feeding you information the whole time. Seated, your hands are in your lap and that input simply ends — you have no idea whether you have passed your stop, what the traffic outside is doing, or whether anything around you has changed. **It is a genuinely different problem from ours.** Ours is identification — one question, one answer, one moment. That one is continuous monitoring over a whole journey, and it needs a different sensing story than a wrist-mounted camera pointed at a bus. We scoped it out on purpose, we know exactly what it would take, and it is the first thing on our roadmap.

### 3. GPS and mapped geospatial data — the set-aside

> We looked hard at whether to build on existing geospatial data, and decided against it. The data is genuinely there: cities have been mapped for two decades, GPS is a commodity module, large indoor venues publish floor plans, and Microsoft's Soundscape — now open source — already has a mature points-of-interest engine on top of OpenStreetMap. We asked ourselves directly whether we could use it, and whether we should. **We concluded that it answers a question our user does not have.** Map data tells you where you are and how to get somewhere. A DeafBlind person with a cane or a guide dog usually already knows where they are — that is the part they have solved. What no map contains is what is happening around them *right now*: which bus just pulled in, whether a siren is approaching, whether something moved. **Geospatial data is a layer for navigation. We are building for awareness, and awareness is about the present moment, not the map.** So we set it aside for this build. It becomes genuinely valuable the moment we extend beyond a single known location — Soundscape's POI layer is MIT-licensed and its clock-position callouts are a ready-made semantic layer we would render haptically instead of audibly — and that is exactly where it sits on our roadmap.

---

## Scope Boundary Ruling

**Binding. The synthesis agent should treat this as settled.**

| Capability | Status | Settling evidence |
|---|---|---|
| **General navigation / route guidance** | **OUT** | *"I'm thinking the big [pitch] should be around… not necessarily navigating… I think it's really just situational awareness"* — the speaker's own explicit landing, never contradicted afterwards. |
| **Destination input (Google-Maps-style)** | **OUT** | Raised at length, challenged in the room (*"But isn't that the point that we're trying to go to a new place?"*), then never mentioned again across the entire remainder of the meeting. **No re-commitment exists.** See D5. |
| **GPS / geolocation** | **OUT** | Raised explicitly as a question — *"can we make use of that? Should we make use of that?"* — and answered by the speaker's next sentence, which pivots to situational awareness. See D9. |
| **Map / OpenStreetMap / Soundscape data integration** | **OUT of build, IN as roadmap** | Discussed as a data source; PIVOT v2 §13 L725 already places it on the roadmap. Keep there. |
| **In-transit / on-board awareness ("once you sit down")** | **OUT, roadmap only** | Identified in the transcript as a *distinct* problem, not this one. See D7. |
| **Turn / rotate instructions to the user** | **OUT — hard prohibition** | Proposed, hedged by the proposer, superseded by *"maybe the camera picked up"*. Also physically undeliverable at 33.9 mm. See D2. |
| **Spatial LEFT / RIGHT / AHEAD haptics** | **OUT — hard prohibition** | 33.9 mm measured vs ~70 mm 2PD (PIVOT v2's own cited figure, L472). Also untriggerable once navigation is out. See D14, D18. |
| **Bus identification at a stop** | **IN — the locked scope** | *"We should lock in the vision"* · *"We want to pick one application to lock it in… and hard code the fuck out of it"* · *"I'm very keen on the bus idea… Let's just fucking send it."* |
| **Siren / urgent-sound awareness** | **IN — fully resourced** | *"there's a siren… we have different levels of [severity]"* — the meeting's opening subject and the differentiator at §2 L415. Mic is **in hand** (PDM, AX22-0044) and **ESP32-S3 does PDM→PCM in hardware** (verified). No contingency. |
| **Near-field obstacle reflex (ToF)** | **IN** | Consistent with the cane division of labour (#11); already built at §5 L511–517. Note it is a *reflex*, not navigation — this is the boundary. |
| **On-demand "what's in front of me" (button)** | **IN** | *"how does [a DeafBlind] person know which bus arrives?"* + §7 L631. |
| **Bus-stop MODE, entered manually** | **IN (new)** | The buildable form of *"turn on once you reach the destination"* without geolocation. See D3. |

**The one-line test for anything proposed later:** *does it tell the user where to go, or what is happening around them?* If the former, it is out.

---

## Locked Gesture Vocabulary

**11 patterns.** Inside the 10–15 mandate (#16), below the 15-row ceiling, and consolidated in the target 10–12 band.

### Design rules these patterns obey

1. **No pattern's meaning depends on which motor fires.** Motor separation is 33.9 mm against a ~70 mm two-point threshold. **There are therefore zero L/R-contingent patterns and no blindfold test is required for any of this to work.** This is stronger than my brief asked for: it removes the discrimination test from the critical path entirely (see D20).
2. **The one structural rule that makes the set learnable: BOTH motors = the world. ONE motor = the device.** External events (danger, sirens, buses, numbers) always fire both; internal state (proximity readings, acknowledgements, waiting, errors) always fires one. This is an *amplitude* distinction, not a spatial one, so it survives at 33.9 mm — the user feels "strong" vs "weak", never "left" vs "right". It halves the recognition space before any counting.
3. **Intensity is a 2-level channel, not a continuous one.** ERM motors do not overcome stiction reliably below ~50–55% duty. Usable levels: **MED ≈ 65%** and **FULL = 100%**. No pattern relies on finer gradations.
4. **Proven primitives reused, not reinvented** (`plan/2026-07-17…:21`): buzz 400 ms · inter-beat gap 300 ms · inter-letter gap 800 ms (reused as inter-digit) · both-fire micro-stagger 100 ms · strict-sequential fallback.
5. **The 100 ms micro-stagger applies whenever both motors start together.** Its primary justification here is **electrical, not perceptual**: 2 × 90 mA ERMs plus startup surge on a shared 3V3 rail is a meaningful inrush, and staggering the starts halves the peak. At 33.9 mm the perceptual benefit is negligible — state the electrical reason, which is real.
6. **Every pattern is a step table** — `{motorMask, dutyA, dutyB, durationMs}` — driven by a 10 ms sequencer tick. This makes arbitration a pointer swap (see §Severity Arbitration Rules) and keeps timing off the main loop.
7. **Overdrive kick on every pulse onset:** drive 100% for the first 30 ms, then drop to target duty. Standard ERM technique, roughly halves rise time, costs nothing.

### Notation

`A` / `B` = the two motors (Port 1 / Port 3). `BOTH` = both, B delayed 100 ms at onset. Durations in ms. `×n` = repeat count.

| # | Pattern | Motors | Timing spec | Total | Trigger (firmware condition) | Justification |
|---|---|---|---|---|---|---|
| **P0** | **READY** | BOTH @ 65% | Ramp 0→65% over 200 ms, hold to 400 ms, off. ×1 | 400 ms | Boot complete: ToF init OK, motors OK, Wi-Fi joined (or offline mode confirmed) | Only ramped-onset pattern in the set. A soft rise is affectively "waking up" and cannot be mistaken for an alert — every alert has an abrupt onset. |
| **P1** | **DANGER** (siren critical) | BOTH @ 100% | `(200 on / 150 off) ×5`, then 500 ms sustained tail. Repeats every 3000 ms while condition holds, max 4 repeats | 2250 ms/cycle, ≤12 s | Tier-2b confirmed siren **AND** 3 s amplitude trend rising | Max intensity + fastest rhythm + longest total + **the only pattern that repeats persistently**. Four independent margins over everything else. At 150 ms off the ERM does not fully decay, giving a harsh warble — intentional, and unique in the set. |
| **P2** | **SIREN WARNING** | BOTH @ 65% | `(400 on / 300 off) ×2` | 1400 ms | Tier-2b confirmed siren with flat/falling amplitude trend; **or** broadband transient (horn) over threshold. Rate-limited: 1 per 10 s | Same "both motors" family as DANGER so it reads as the same *category*; medium intensity, 2 beats, no repeat, and the proven 400/300 primitive. Category-consistent, urgency-distinct. |
| **P3** | **ATTENTION** (fast coarse acoustic alert) | BOTH @ 100% | Single 250 ms pulse. ×1 | 250 ms | Tier-2a: band energy 500–1800 Hz exceeds adaptive noise floor +12 dB on 2 consecutive FFT frames (~70 ms) | **Resolves the <200 ms feasibility gap (D19).** Fires immediately to buy the 1–2 s that classification actually needs. Only single-pulse-at-full-power pattern. "Something just happened, more coming." |
| **P4** | **PROXIMITY** (ToF advisory) | **A only**, 55→100% | Repeating `120 on / gap`, where `gap = map(dist, 300→1200 mm, 120→900 ms)` and duty = `map(dist, 1200→300 mm, 55→100%)`. Continuous while in range | continuous | ToF range < 1200 mm for ≥3 consecutive frames (60 ms debounce against arm-swing ground flicker) | The only continuous, analogue, rate-coded channel — how Sunu works (§2 L401). Single motor keeps a persistent background signal at low energy and low attention cost. |
| **P5** | **BUS ARRIVING** | BOTH, 65→82→100% | `(250 on / 250 off) ×3`, intensity ascending across the three pulses | 1500 ms | Vision returns `bus_present == true` on 2 of 3 consecutive frames, **and** previous state was false (edge-triggered), **and** device is in `BUS_STOP` mode | 3 pulses vs SIREN WARNING's 2 is the primary discriminator; ascending envelope is affectively "approaching" and is unlike the flat/decaying alert family. |
| **P6** | **ROUTE NUMBER** | BOTH @ 100% (digits); BOTH @ 65% (brackets) | Preamble: 500 ms ramped @65%, 600 ms silence. Digits: `LONG = 500 on`, `SHORT = 150 on`, intra-digit gap 250, inter-digit gap **800** (proven constant). Terminator: 600 ms silence, 500 ms @65% | ≈5.7 s for "88" | Claude returns `confidence == "high"` **and** multi-frame vote reached consensus | Quinary long/short — see §Number Encoding Decision. Brackets at 65% are texturally distinct from the 100% digit pulses and make digit count unambiguous. |
| **P7** | **WAIT / THINKING** | **A, B alternating** @ 100% | `A 300 on / 200 off / B 300 on / 200 off` ×2. Repeats every 2500 ms while pending, max 4 repeats (10 s) | 1900 ms/cycle | Vision request in flight and no result yet | Single-motor (weak) + slow even tempo + **the only pattern that repeats gently during a wait**. Guarantees silence is never ambiguous. If alternation is imperceptible at 33.9 mm it degrades to 4 evenly-spaced medium pulses — **still unique by count, tempo and amplitude. No fallback needed.** |
| **P8** | **UNKNOWN** (couldn't read it) | BOTH, 100→0% | Single 900 ms pulse with a linear fade-out across its full duration. ×1 | 900 ms | `confidence == "low"`, **or** multi-frame vote failed consensus, **or** request timed out (>8 s), **or** Claude reported insufficient information | **The most safety-critical pattern in the set.** This is what fires *instead of a wrong bus number* (§9 L670). Only decaying-envelope pattern; structurally the inverse of P5's ascent. Terminal — it stops P7 and gives the user closure. |
| **P9** | **ACK** (button feedback) | **A only** @ 100% | Single 150 ms pulse. ×1, within 20 ms of press | 150 ms | Onboard user button press, debounced | Shortest, lightest event in the vocabulary — its only job is "I felt that". Hands straight off to P7. |
| **P10** | **ERROR / OFFLINE** | **A only** @ 65% | `600 on / 300 off / 150 on / 300 off / 600 on` (long-short-long). ×1 on state change, re-fires every 60 s while degraded | 1950 ms | Wi-Fi down >5 s, **or** 5 consecutive ToF I²C failures, **or** 3 consecutive vision endpoint failures | Single motor (weak) + **asymmetric long-short-long, which nothing else in the set uses**. Cannot be confused with DANGER (both motors, 100%, fast, repeating). Reads as "the device has a problem", not "the world has a problem". |

**Deliberately cut from PIVOT v2 §4:** LEFT, RIGHT, AHEAD, STOP, MOVE OVER — unbuildable at 33.9 mm *and* untriggerable once navigation is out of scope (D14). **Deliberately not added:** any TURN pattern (D2), any "stand here" framing pattern (D4).

### Button gesture map (no extra patterns needed)

| Input | Action | Haptic |
|---|---|---|
| Short press | On-demand vision request | P9 → P7 → P6 or P8 |
| Short press within 10 s of a delivered number | **Replay last number** (no new request) | P9 → P6 |
| Long press ≥1.5 s | Toggle `BUS_STOP` mode (D3) | P0 on enter, P9 on exit |
| Long press ≥1.5 s during any active alert | Global mute, 60 s, **P0/P1/P3 excepted** | P9 |

---

## Discriminability Analysis

Assessed as felt through a sleeve on the volar wrist, where amplitude is attenuated and fine timing is smeared. Ordered most-confusable first.

| Pair | Risk | Why they separate | Verdict |
|---|---|---|---|
| **P3 ATTENTION vs P9 ACK** | **Highest** — both are single short hits | Amplitude (both motors vs one, ~2× energy) and duration (250 vs 150 ms, ~1.7×, near the duration JND). **Waveform separation alone is marginal.** | **Accepted — resolved by causation, not waveform.** P9 fires only within 20 ms of the user pressing the button. The user knows they pressed it. P3 arrives unbidden. Self-disambiguating in every real case. |
| **P2 SIREN WARNING vs P5 BUS ARRIVING** | **High** — both are "a few medium pulses from both motors" at mid-urgency | Pulse count 2 vs 3; beat duration 400 vs 250 ms; envelope flat vs ascending | **Test this pair first in the wear test.** If confused: extend P5 to 4 pulses, or prepend a 700 ms sustained head. Both fixes are one-line changes to the step table. |
| **P1 DANGER vs P4 PROXIMITY at close range** | **High in principle** — as an object nears, P4 becomes a fast insistent buzz | Amplitude (both motors @100% vs one motor @100%, ~2× energy); P1 has a 500 ms sustained tail and repeats, P4 never does | **Safe by arbitration, not by waveform.** P1 preempts P4 (P0 > P1 class), so they never overlap, and the mandatory 150 ms clearing gap marks the transition. Worth stating explicitly because it is the pair a reviewer will raise. |
| **P1 DANGER vs P10 ERROR** | Medium | Motors (2 vs 1), intensity (100 vs 65%), rhythm (fast even ×5 vs asymmetric long-short-long), persistence (repeats every 3 s vs once per 60 s) | **Safe — four independent margins.** This pair was explicitly redesigned: an earlier fast-triplet ERROR was too close to DANGER and was replaced with the asymmetric figure. |
| **P6 preamble (500 ms @65% ramped) vs P6 LONG (500 ms @100% abrupt)** | Medium — identical duration | Intensity (65 vs 100%, above the ~15–20% Weber fraction), onset (200 ms ramp vs abrupt + overdrive kick), and following gap (600 vs 250 ms, 2.4×) | **Safe on three dimensions.** The ramped onset is the decisive one — no digit element ever ramps. |
| **P6 LONG (500 ms) vs P6 SHORT (150 ms)** | Low | 3.3× duration ratio, far above the ~20–25% duration JND. Identical intensity and motor set, so duration is the *only* varying dimension — no confounds | **Safe. This is the cleanest contrast in the vocabulary**, which is correct, because it carries the payload. |
| **P7 WAIT vs P4 PROXIMITY** | Low | Both single-motor and repeating, but P4's inter-pulse gap **changes as the user moves their arm** and P7's never does; P7 has 2.5 s silent windows, P4 is continuous | **Safe — and the discriminator is embodied.** The user's own motion disambiguates within one arm movement. |
| **P8 UNKNOWN vs P0 READY** | Low | Opposite envelopes (900 ms fade-out vs 400 ms ramp-up), 2.25× duration difference, and P0 fires only at boot | **Safe.** |
| **P5 BUS ARRIVING's internal 65→82→100% ramp** | — | Each step is ~15–20%, i.e. right at the vibrotactile Weber fraction | **Do not rely on it.** The discriminating feature of P5 is **3 pulses**, not the ramp. The ramp is a bonus if perceived and costs nothing if not. Stated honestly so nobody builds a claim on it. |

**Structural safeguard.** The BOTH-vs-ONE rule (design rule 2) means the user's first discrimination is always the easy one — strong vs weak — and it is an amplitude judgement, not a localisation judgement, so it holds at 33.9 mm. Within each half, patterns are then separated by count and rhythm, which are the most robust vibrotactile dimensions through fabric. **No pattern requires the user to judge duration and intensity simultaneously.**

---

## Severity Arbitration Rules

**PIVOT v2 does not address this anywhere.** The transcript only gestures at it — *"it's going to be very. Like sequential. Like, it doesn't have to be like."* [sic]. **This is a NEW finding and firmware cannot be written without it**, because two patterns sharing two motors produce noise, not a message.

### Priority classes

| Class | Patterns | Rationale |
|---|---|---|
| **P0 — SAFETY** | P1 DANGER, P3 ATTENTION | Physical risk. Never lose, never queue, never mute. |
| **P1 — HAZARD** | P4 PROXIMITY | Physical risk, but continuous and low-stakes per event. |
| **P2 — ALERT** | P2 SIREN WARNING | Environmental, non-immediate. |
| **P3 — INFORMATION** | P5 BUS ARRIVING, P6 ROUTE NUMBER, P8 UNKNOWN | The payload. Must arrive, but never before safety. |
| **P4 — FEEDBACK** | P9 ACK, P7 WAIT | Conversational glue. Worthless if late. |
| **P5 — STATUS** | P0 READY, P10 ERROR | About the device, not the world. |

### Rules

1. **Higher class preempts lower, immediately, mid-sequence.** The running pattern aborts at the next 10 ms tick.
2. **Every preemption inserts a mandatory 150 ms clearing gap** with both motors off before the new pattern starts. Without it the two patterns smear into an unparseable blur — this gap is what makes preemption *legible* rather than merely correct.
3. **Equal or lower class never preempts.** It queues if queueable, else it is dropped. **Queue depth 2.**
4. **Queueable vs droppable:**
   - **P6 ROUTE NUMBER — queueable.** It is the payload; never lose it.
   - **P8 UNKNOWN — queueable.** The user must get closure.
   - **P5 BUS ARRIVING — droppable** if a ROUTE NUMBER for the same event is already queued. The number supersedes the alert.
   - **P9 ACK, P7 WAIT, P0 READY, P10 ERROR — droppable, never queued.** All are stale the moment they are late; P7 re-fires on its own heartbeat anyway.
   - **P4 PROXIMITY — never queued. It is a state, not a message.** It is *suspended* while any higher class runs and *resumes automatically* when the channel frees and the range condition still holds.
   - **P1, P3 — never queued**, because they never lose.
5. **A preempted queueable pattern restarts from the beginning; it never resumes mid-sequence.** A half-delivered route number is worse than a delayed one — resuming mid-digit produces a *plausible wrong number*, which is the single worst output this device can make.
6. **Queue TTL = 10 s.** Anything older is discarded silently. **ROUTE NUMBER carries a hard 10 s TTL**: a stale bus number is actively dangerous because the bus may have gone.
7. **P1 DANGER is uninterruptible** except by a newer P1. It holds the channel for its full 2250 ms cycle and repeats up to 4× (≈12 s) or until the acoustic condition clears. It cannot be starved by anything.
8. **Button press during P1:** the ACK is suppressed, but the vision request still fires and its result queues behind DANGER under rule 6's TTL.
9. **The case named in my brief — a bus arrives while a siren is active:** **DANGER wins and preempts.** BUS ARRIVING is **dropped**. ROUTE NUMBER is **queued with its 10 s TTL** — so if the siren clears in time the user still learns which bus; if not, it expires silently and no misleading late signal is delivered. Rationale: during a siren the user's decision is "do not step into the road", not "which bus is this". Delivering a bus number mid-siren would actively compete with the only signal that matters.
10. **Rate limits (anti-fatigue):** P2 max 1 per 10 s · P10 max 1 per 60 s · P5 edge-triggered only, max 1 per 15 s · P4 unlimited but gated to <1200 mm with 3-frame debounce. **A wrist that buzzes constantly gets taken off** — this is the fastest way to fail a real user, and the rate limits are not optional polish.
11. **Global mute:** long-press ≥1.5 s suspends classes P1–P5 for 60 s. **P0 SAFETY is never mutable.**

### Implementation shape

```c
/* Pattern = array of steps; arbitration = pointer swap under a mutex.
   Sequencer runs at 10ms tick, highest priority task. */
typedef struct { uint8_t mask; uint8_t dutyA, dutyB; uint16_t ms; } step_t;
typedef struct { const step_t *steps; uint8_t n; uint8_t cls; uint8_t repeats; } pattern_t;

/* On request: if (new->cls < active->cls) { abort; insert CLEAR_GAP_150; start new; }
   else if queueable(new) enqueue(new, ttl=10000); else drop(new); */
```

All 11 patterns fit in well under 2 KB of `const` step tables in flash.

---

## Number Encoding Decision

### PIVOT v2's scheme fails, on four counts

§4 L492: *"NUMBER n | n short pulses on R, 150ms on / 150ms off"*.

1. **Too slow.** Route "88" = 16 pulses × 300 ms = **4.8 s**, plus an inter-digit gap ≈ **5.6 s** of undifferentiated pulsing. Route "999" = 27 pulses ≈ **9.7 s**.
2. **Uncountable at the counts that matter.** Human subitizing is reliable to about 4 items; beyond that, counting error climbs steeply — and this is tactile, through fabric, on a moving arm, from a user who is also managing a cane. **Counting to 8 twice without error is not a reasonable ask, and a miscount produces a confident wrong answer.** §9 L670 states the principle correctly — *"Telling a DeafBlind person the wrong bus is worse than telling them nothing"* — and then the encoding violates it.
3. **Zero is unrepresentable.** Unary has no symbol for 0. Routes 10, 20, 30, 205, 390 — a large fraction of real London routes — **cannot be encoded at all.** This is a hard bug, not a limitation.
4. **It is spatially coded** (*"on R"*), which is unavailable at 33.9 mm.

Plus the internal inconsistency at D16: §10's demo script says "eight pulses" for a route the encoding renders in sixteen.

### The replacement: quinary long/short, both motors

Assign **LONG = 5** and **SHORT = 1**, encoded in *time* rather than in *space* — so it needs no motor discrimination. Digit *d* = (*d* ÷ 5) LONGs followed by (*d* mod 5) SHORTs.

Because *d* ÷ 5 ≤ 1 for every digit 0–9, **"two LONGs" is a free codepoint** — assign it to zero. That closes the zero gap with no extra machinery.

| Digit | Encoding | Elements | Digit | Encoding | Elements |
|---|---|---|---|---|---|
| 0 | `LONG LONG` | 2 | 5 | `LONG` | 1 |
| 1 | `SHORT` | 1 | 6 | `LONG SHORT` | 2 |
| 2 | `SHORT SHORT` | 2 | 7 | `LONG SHORT SHORT` | 3 |
| 3 | `SHORT ×3` | 3 | 8 | `LONG SHORT ×3` | 4 |
| 4 | `SHORT ×4` | 4 | 9 | `LONG SHORT ×4` | 5 |

**Parameters** (chosen for ERM reliability, not minimum time — see design rule 3 and §Feasibility Notes):
`SHORT = 150 ms` · `LONG = 500 ms` · intra-digit gap `250 ms` · **inter-digit gap `800 ms`** (the proven inter-letter constant, reused) · both motors @ 100% throughout · preamble `500 ms @65% ramped` + `600 ms` silence · terminator `600 ms` silence + `500 ms @65%`.

### Timing, worked

| Route | Elements | Digits time | + brackets | **Total** | vs PIVOT v2 |
|---|---|---|---|---|---|
| **"88"** | 8 | 3400 ms | +2200 ms | **5.6 s** | 5.6 s — *same time, half the elements* |
| "7" | 3 | 1050 ms | +2200 ms | **3.3 s** | 2.1 s (slower, but countable) |
| "10" | 3 | 2400 ms | +2200 ms | **4.6 s** | **impossible** |
| "205" | 7 | 3900 ms | +2200 ms | **6.1 s** | **impossible** |
| "999" | 15 | 6750 ms | +2200 ms | **9.0 s** | 9.7 s |

### Why this is the right trade

**The headline win is not speed — it is error rate and coverage.**

- **Maximum identical adjacent elements drops from 9 to 4**, landing inside the reliable subitizing range. This is the whole point: the failure mode being designed out is *a confident wrong number*.
- **Zero becomes representable**, which takes the scheme from "works for some routes" to "works for all routes".
- **Elements for "88" drop from 16 to 8** at identical wall-clock time — so the same duration carries far less counting load. (And it makes §10's existing "eight pulses" line accurate, D16.)
- **It is grounded in the document's own cited research.** §4 L500 already notes that researchers building DeafBlind vibrotactile interfaces chose **Morse over Braille** for time-efficiency, *"T is one dash in Morse, multiple dots in Braille"*. Long/short **is** that primitive. This is not an invention — it is applying the reasoning PIVOT already accepted.
- **Brackets remove digit-boundary ambiguity.** Without a preamble, a user who misses the leading LONG of "8" receives "3". The 500 ms bracket costs ~1 s per delivery and eliminates the highest-consequence error in the system.

**Committed: quinary long/short with the two-LONG zero codepoint, bracketed.** Route numbers up to 3 digits, delivered in 3.3–9.0 s.

**Operational note:** ROUTE NUMBER preempts BUS ARRIVING (both class P3, but the number supersedes — rule 4). Do not wait for P5 to finish before starting P6. Bus dwell time at a stop is typically 15–30 s, and the full chain (detection → Claude → delivery) is ≈8 s, so the margin is real but not generous.

---

## Feasibility Notes

Ran against the ESP32-S3-Mini-1 (dual Xtensa LX7 @ 240 MHz, ~512 KB internal SRAM, 4 MB flash, 2 MB PSRAM, single-precision FPU per core).

**All acoustic rows below assume PDM→PCM decimation happens in the I2S peripheral rather than on the CPU. That assumption is verified, not asserted — see "PDM capture on ESP32-S3" at the end of this section.** Every latency and CPU figure here holds because the decimation costs zero cycles.

### Per-trigger verdict

| Trigger | Computable? | Realistic latency | Notes |
|---|---|---|---|
| **ToF proximity** | ✅ Yes, trivially | **~80 ms** to fire | I²C read 2–4 ms; 50 Hz continuous mode = 20 ms period; 3-frame debounce = 60 ms. Comfortably inside the <50 ms *per-sample* reflex budget; the debounce is what sets fire time, and it is worth it. **Use `isRangeComplete()` non-blocking — `readRange()` blocking-polls and will stall the task.** |
| **Band-energy acoustic alert (P3)** | ✅ Yes | **~70–100 ms** | 512-pt FFT @16 kHz = 32 ms acquisition + ~2 ms compute; 2-frame confirmation ≈ 70 ms. **Meets the <200 ms budget.** |
| **Yelp modulation (2–4 Hz)** | ⚠️ Yes, but **not in 200 ms** | **1.0–1.5 s** | A 2 Hz modulation has a 500 ms period. Detecting periodicity needs ≥2 cycles. **Physics, not silicon.** |
| **Wail sweep (400→1300 Hz)** | ⚠️ Yes, but **not in 200 ms** | **1–2 s** | Wail modulation is 0.25–1 Hz → a full sweep cycle is 1–4 s. You need at least a half-sweep to see monotonic pitch travel. **Physics, not silicon.** |
| **Amplitude trend (approaching/receding)** | ✅ Yes | 3 s (as §5 L528 states) | Fine — it is a slow inference by nature. |
| **Bus detection / route number** | ✅ Off-device | 1–3 s | Network + Modal/Claude. Unchanged by anything here. |
| **Button press** | ✅ Yes | <20 ms | |
| **Haptic sequencing** | ✅ Yes | 10 ms granularity | All 11 patterns use multiples of 50 ms. LEDC is hardware — zero CPU after configuration. |

### The one thing that must be restructured (D19)

**PIVOT v2 §5 L519 frames Tier 2 as "Awareness (< 200ms, onboard FFT)". That budget is achievable for spectral *analysis* and not achievable for siren *classification*.** The defining features of a siren are slow temporal modulations — 2–4 Hz for yelp, 0.25–1 Hz for wail. **You cannot observe a 400 ms period in a 200 ms window.**

**Fix — split Tier 2, which also produces a better story:**

| Sub-tier | Budget | Test | Haptic |
|---|---|---|---|
| **2a — acoustic alert** | **<100 ms** | Band energy 500–1800 Hz > adaptive noise floor +12 dB, 2 consecutive frames | **P3 ATTENTION** |
| **2b — siren confirmed** | **1–2 s** | Sustained band energy **AND** (2–4 Hz modulation index high **OR** monotonic sweep detected across frames) | **P1 DANGER** or **P2 SIREN WARNING** by amplitude trend |

This mirrors the two-stage bus haptic exactly — coarse now, precise shortly after — so it is architecturally consistent rather than a special case, and it gives the pitch a clean line: **"we match latency to certainty, and we do it twice."** Widen the yelp detector to **2–4 Hz**, not PIVOT's single ~2.5 Hz figure (see Grounding Notes).

### Resource budget — comfortable

| Resource | Usage | Available | Verdict |
|---|---|---|---|
| CPU, FFT | ~2 ms per 32 ms frame | one core | **~6% of Core 1** |
| CPU, ToF | 2–4 ms per 20 ms | one core | **~15% of Core 0**, and it is I²C wait, not compute |
| CPU, motors | ~0 | — | **LEDC is hardware.** Duty change = one register write |
| RAM, FFT | 4 KB (2 × 512 floats) | ~512 KB SRAM | negligible |
| RAM, I²S DMA | ~16 KB (8 × 512 × 4 B) | | negligible |
| RAM, patterns | <2 KB `const` in flash | 4 MB | negligible |
| **PSRAM** | **0** | 2 MB | **Not needed at all** — no frame buffering on-device |

### Task partitioning

- **Core 1 (APP):** `audioTask` (prio 3) — I²S DMA read → arduinoFFT → feature extraction. Pinned here specifically to keep FFT away from Wi-Fi interrupt jitter, since the Wi-Fi stack lives on Core 0 (PRO_CPU) by default. Naturally rate-limited by blocking on `i2s_read()`.
- **Core 0 (PRO):** `hapticTask` (prio 4, **highest** — patterns must not stretch), `sensorTask` (prio 2, `vTaskDelayUntil` at 20 ms), `netTask` (prio 1).
- Inter-task: one queue for haptic requests, one mutex on the active-pattern pointer. Arbitration (above) lives entirely in `hapticTask`.

**Do LEDC PWM + FFT + I²C coexist? Yes, unambiguously.** LEDC is hardware; I²S is DMA with an ISR only at buffer completion; I²C runs on a different core from the FFT. Steady-state load is well under 25% across both cores. There is no contention path between them.

### ERM-specific constraints that change the design

The AX22-0013 is *"a 12000rpm flat eccentric-rotating-mass motor… low-R MOSFET driver… single active-high GPIO pin"* (`parts/Vibration Motor (ERM)/vibration-motor-erm/CONTENT.md`), 3 V nominal, 90 mA.

1. **A low-side MOSFET switch, not an H-bridge → no active braking.** Spin-down is passive: typically 40–110 ms for a coin ERM.
2. **Rise time to full is typically 50–90 ms.** **This is why PIVOT v2 §4 L484's DANGER — *"4× rapid 100ms bursts"* — would not render as four distinct hits**; at 100 ms on with an unspecified gap, rise and decay overlap and the result is a mushy near-continuous buzz. My P1 uses 200/150, which is deliberate: the pulses are distinct enough to count, and the incomplete decay produces a *harsh warble* that is unique in the set and affectively correct for danger.
3. **Practical minimums: ~150 ms ON and ~150 ms OFF** for a crisply-felt discrete pulse. **The superseded plan's proven 400 ms buzz / 300 ms gap sits comfortably above both** — which is precisely why those constants are proven, and why I reused rather than re-derived them.
4. **Stiction: ERMs do not reliably start below ~50–55% duty.** "Intensity 30%" is not a thing. Usable range ≈55–100%, giving **two reliable levels**, which is why design rule 3 exists.
5. **Overdrive kick (100% for 30 ms, then target duty)** on every onset — roughly halves rise time, costs nothing, materially sharpens every pattern.
6. **PWM at 20–30 kHz**, 8-bit resolution. Above audible, avoids motor whine. (LEDC at 20 kHz supports up to ~12-bit on this part; 8-bit is ample.)
7. **Inrush:** 2 × 90 mA plus startup surge on a shared 3V3 rail is the real reason for the 100 ms micro-stagger. State the electrical justification — at 33.9 mm the perceptual one is negligible.

### PDM capture on ESP32-S3 — verified, and the answer is good

The mic is a **PDM** module (T3902, AX22-0044). PDM is a 1-bit oversampled bitstream; it must be decimated to PCM before any FFT can touch it. **Whether that decimation happens in hardware or in software is the single largest technical risk in the siren path**, so I verified it against Espressif's own documentation rather than assuming.

**This required a chip-specific check, because the answer varies across the family** — the original ESP32 supports PDM RX, the **ESP32-S2 does not**, and the ESP32-C3 has PDM TX but no PDM RX. A generic "ESP32 supports PDM" claim would not have been sufficient evidence.

#### 1. Verdict

> **✅ YES. The ESP32-S3 supports PDM RX in hardware, and I2S0 carries a hardware PDM-to-PCM converter.**

From the ESP-IDF Programming Guide, **ESP32-S3 build**, I2S peripheral page (v6.0.2 stable), fetched **2026-07-18**:

- Mode support table for **ESP32-S3**: Standard = `I2S 0/1` · **PDM-to-PCM = `I2S 0`** · PCM-to-PDM = `I2S 0` · PDM = `I2S 0/1` · TDM = `I2S 0/1`.
- *"In PDM mode, regardless of whether you are using raw PDM or PCM format, **the data unit width is always 16 bits**."*
- Raw PDM clock *"typically ranges 1.024 MHz ~ 6.144 MHz"*; converted PCM *"usually ranges 16 kHz ~ 48 kHz"*.
- ESP32-S3 supports up to 4 PDM RX data lines (up to 8 mics). We need one.

**Driver/API:** `driver/i2s_pdm.h` (the `esp_driver_i2s` component). Initialise with **`i2s_channel_init_pdm_rx_mode()`** taking an `i2s_pdm_rx_config_t`. Slot config comes from one of two helper macros — **`I2S_PDM_RX_SLOT_PCM_FMT_DEFAULT_CONFIG`** (hardware-converted PCM) or `I2S_PDM_RX_SLOT_RAW_FMT_DEFAULT_CONFIG` (raw bitstream).

**⚠️ One hard constraint to put in the pin map: the PDM-to-PCM converter exists on I2S0 only.** The mic must be bound to **I2S port 0**. Using I2S1 for PDM RX yields the raw bitstream and forces software decimation — i.e. it silently converts the good case into the bad case. This is the one configuration mistake that would cost the team hours.

Note on ESP-IDF versioning: the legacy `driver/i2s.h` API was split into `i2s_std` / `i2s_pdm` / `i2s_tdm`. **Use the `i2s_pdm` variant**; older tutorials using the legacy header will mislead. Arduino-ESP32 3.x is built on ESP-IDF 5.x, so the ESP-IDF driver is callable directly from an Arduino sketch.

#### 2. What this means for the build

**`arduinoFFT` works exactly as PIVOT.md assumes.** The peripheral hands the DMA buffer **16-bit signed PCM at 16 kHz**, which is precisely the input an FFT expects. Concretely:

- **Configure:** `i2s_pdm_rx_config_t` with `I2S_PDM_RX_SLOT_PCM_FMT_DEFAULT_CONFIG`, `clk_cfg.sample_rate_hz = 16000`, 16-bit mono, on **I2S0**. Two pins: CLK out, DATA in — an AX22 port supplies three (IO0/IO1/IO2), so it fits with a pin spare.
- **Cost of decimation: zero CPU.** The converter is in the I2S peripheral. This is the whole reason the verdict matters.
- **Nyquist at 16 kHz is 8 kHz**, comfortably above the 500–1800 Hz siren band.
- **512-point frame** = 32 ms of audio, **31.25 Hz bin width** — resolves 400–1300 Hz across bins 13–42. Convert `int16_t` → `float` (~0.2 ms for 512 samples with the FPU), then FFT ~2 ms.
- **RAM unchanged** from the budget above: ~16 KB DMA + 4 KB FFT working set.

**All three siren trigger conditions are computable within budget, alongside 50 Hz ToF polling and both motors:**

| Trigger | Computable on PDM→PCM? | Latency | Cost |
|---|---|---|---|
| **400–1300 Hz wail sweep** | ✅ Yes, unchanged | **1–2 s** (physics, not silicon — D19) | Track the argmax bin across frames; ~free once the FFT is running |
| **~2.5 Hz yelp modulation** (widen to **2–4 Hz**) | ✅ Yes, unchanged | **1.0–1.5 s** (physics — D19) | Band-energy envelope at 31 Hz frame rate → short autocorrelation over a ~2 s ring buffer. Trivial |
| **3 s amplitude trend** | ✅ Yes, unchanged | 3 s by definition | Running mean over ~94 frames. Negligible |
| **Band-energy alert (P3, Tier-2a)** | ✅ Yes | **~70 ms** | Sum bins 16–58 vs adaptive floor. One pass |

**Steady-state load is unchanged from the budget table above** — the FFT still costs ~2 ms per 32 ms frame (~6% of Core 1) because the hardware absorbed the decimation entirely. LEDC PWM remains zero-cost, ToF remains ~15% of Core 0 in I²C wait. **No contention, no revision to the task partitioning.**

#### 3. Fallback — not needed, but stated

Since PDM RX is available in hardware, the software-decimation scenario does not arise and **no trigger has to be simplified or cut**. For completeness, the two failure modes that would change this, and their remedies:

- **If the module is wired to a port that cannot reach I2S0** — rebind the mic to a port whose pins can be routed to I2S0. ESP32-S3 I2S signals go through the GPIO matrix, so any GPIO can carry them; this is a `pins.h` change, not a hardware problem.
- **If the hardware converter misbehaves in practice** — capture raw PDM and decimate in software with a CIC + FIR at 64× on Core 1. This is a real cost (order 15–25% of a core) and would put the <200 ms Tier-2a alert under pressure, but the wail sweep, yelp modulation and amplitude trend are all ≥1 s features and **would all still survive**. Only P3 ATTENTION's speed would degrade, to ~150–250 ms.

**§8 L651's instinct to test the mic path early is correct and should stay** — not because the path is doubtful, but because "I2S0 + `i2s_pdm.h` + PCM slot macro" is a specific configuration worth proving in the first hour rather than the last.

---

## Grounding Notes

Both leads from the interrupted run were **re-verified from scratch**; its evidence was treated as unavailable.

**1. Microsoft Soundscape open-sourcing — ✅ CONFIRMED, PIVOT v2 §1 L391 is accurate.**
Microsoft ran Soundscape as a research project that **concluded 3 January 2023**, at which point the code was **released as open source under the MIT License**. Successors built on it include **VoiceVista** (App Store description: "Soundscape Resurrection", MIT-licensed) and **Soundscape by Scottish Tech Army**. PIVOT v2's characterisation — discontinued, MIT open source, lives on as Scottish Tech Army / Soundscape Community / VoiceVista, clock-position callouts on OpenStreetMap, audio-only output — is correct in every particular.
Fetched 2026-07-18: https://www.perkins.org/resource/microsoft-soundscape-app-being-discontinued/ · https://drwjf.github.io/vvt/index.html · https://www.scottishtecharmy.org/soundscape

**2. Siren acoustics — ⚠️ SUBSTANTIALLY CONFIRMED, with two corrections PIVOT v2 should absorb.**

| PIVOT v2 §5 L523–527 | Verified | Verdict |
|---|---|---|
| Wail sweeps ~400 Hz → ~1300 Hz and back | *"might sweep from ~400 Hz up to ~1300 Hz and back down"* | ✅ Accurate — this is the source PIVOT cites |
| Yelp modulates at ~2.5 Hz | Yelp modulation rate **2–4 Hz** | ⚠️ **Widen to 2–4 Hz.** 2.5 Hz sits inside the band but a detector tuned to a point estimate will miss real sirens |
| Human hearing most sensitive 500–2000 Hz | *"roughly 500 to 2000 Hz"* | ✅ Accurate |
| *(not stated)* | **Wail modulation 0.5–1 Hz** → full sweep cycle **1–2 s** (a second source gives ~0.25 Hz, i.e. up to 4 s) | ❗ **Missing and load-bearing.** This is the figure that makes the "<200 ms" classification budget impossible (D19) |
| *(not stated)* | Siren band generally **500–1800 Hz** | Use this for the Tier-2a band-energy gate |

Fetched 2026-07-18: https://sirengenerator.com/faq · https://www.blueprintfleet.com/drawingboard/loud-and-clear-the-science-and-strategy-behind-emergency-vehicle-sirens

**3. Tactile apparent motion SOA — new grounding for D18.**
Apparent motion between two vibrotactile actuators is a real, documented effect (demonstrated on wrists using smart bracelets), but it requires tuned stimulus onset asynchrony — roughly **SOA 80 ms at 120 ms burst duration, ~120 ms at 240 ms**, i.e. SOA scaling at about half the burst duration. **If SOA is too long the two vibrations are perceived as discrete and no motion illusion occurs.** PIVOT v2's 400 ms crossfade (L486–487) is well outside that window.
Fetched 2026-07-18: https://www.researchgate.net/publication/334640255_Representing_Interpersonal_Touch_Directions_by_Tactile_Apparent_Motion_Using_Smart_Bracelets · https://la.disneyresearch.com/wp-content/uploads/Hand-to-Hand-An-Intermanual-Illusion-of-Movement-Paper.pdf

**4. Motor separation = 33.9 mm — internal, not external, and already at HIGH confidence.**
`audit/speech-to-braille-wearable/20-enclosure-cad-consolidated.md:17,19,43` and `16-phase1-reconciled-dims.md:62,115`. Derived from two board photos plus STEP refdes binding, double-confirmed across two adversarial audit phases. **Track 1 does not need to re-measure this.**

**5. ESP32-S3 PDM RX support — ✅ CONFIRMED in hardware. This was the single largest open risk in the siren path.**
Espressif ESP-IDF Programming Guide v6.0.2 (stable), **ESP32-S3 build** of the I2S peripheral page — the chip-specific build matters, since ESP32-S2 has no PDM at all and ESP32-C3 has PDM TX but no PDM RX. For **ESP32-S3**: PDM-to-PCM converter present on **I2S0**; PDM RX supported on I2S 0/1; data unit width fixed at 16 bits; converted PCM sample rate typically 16–48 kHz; API `driver/i2s_pdm.h` / `i2s_channel_init_pdm_rx_mode()` / `I2S_PDM_RX_SLOT_PCM_FMT_DEFAULT_CONFIG`. **Decimation costs zero CPU. `arduinoFFT` receives ordinary 16-bit PCM.**
Fetched 2026-07-18: https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/peripherals/i2s.html · driver source reference https://github.com/espressif/esp-idf/blob/master/docs/en/api-reference/peripherals/i2s.rst

**6. Microphone hardware — present, uncatalogued.**
**PDM digital microphone, marking T3902, SKU AX22-0044**, standard 22×22 mm AX22 snap-in — confirmed in hand by the user. No `parts/` folder exists for it because the module is new and not yet listed on the Axiometa website. `parts/` otherwise contains the Genesis Mini Starter Kit (dht11, ips-lcd-0-96, ir-transceiver, light-dependent-resistor, neopixel-matrix-5x5, passive-buzzer, rotary-encoder, tactile-led-button), `Vibration Motor (ERM)` (AX22-0013), and `distance-sensor-vl53l0cx`. **`parts/` is a catalogue snapshot, not a complete BOM — do not infer absence from it.**

---

## Residual Risk

**Transcript ambiguities I could not resolve, and what would settle each:**

| # | Ambiguity | Why it matters | What resolves it |
|---|---|---|---|
| R1 | **"we've talked to them"** (#45) — did anyone actually speak to a DeafBlind person, or was it "we talked *about* canes and dogs"? | Directly contradicts §11 L697's honesty line. An unsupported user-contact claim in front of a judge who knows the field is the most damaging thing this team could say. | **Ask the team directly, today.** Until answered, D15 stands: claim nothing. |
| R2 | ~~Do the motors physically exist?~~ (#13 vs #14 vs #15) | — | **RESOLVED.** Both ERMs, the ToF and the PDM mic are all in hand. The transcript contradiction is stale; #14 was the accurate statement. |
| R3 | *"I think we've been that off"* — "binned that off" (discarded) or "pared that down" (reduced)? | **Does not change the outcome** — both readings produce "define our own small set instead of implementing the 103". Logged for completeness. | No action needed. |
| R4 | *"Maybe it's like, hey, stop and fight only like turn around"* [sic] — "stop and **fight**" is certainly a mis-transcription. Possibly "stop and wait", "stop and stand", "stop right there". | It may encode a *second*, lower-severity auto-response distinct from turn-around — i.e. a genuine STOP directive I have not captured. | Ask whoever spoke it. **If it was "stop", reconsider adding a STOP pattern** — it is the one cut item from §4 that could plausibly earn a trigger under the locked scope (e.g. ToF at <300 mm). |
| R5 | *"Of course, if it was real, maybe."* — real *emergency*, or real *product* (vs demo)? | Changes whether turn-around was rejected in principle or only deferred past the hackathon. | Does not change D2's ruling either way, since the camera-already-has-it argument supersedes both readings. |
| R6 | *"we could also explore that for the microphone"* re: Soundscape (#43) | Too vague to action. Possibly "use Soundscape's POI semantics to decide what the mic should listen for" — but that is my inference, not the transcript's. | Ask. Low stakes. |
| R7 | *"Now just stand here. Oh, yeah. We have a good view."* (#8) — device advising the user, or a person in the room describing the scene? | Determines whether camera-framing feedback was a real proposal or an aside. | D4 rules it out for this build either way. |
| R8 | Several passages are unrecoverable — *"somebody would notice that you have fun. They will bring you the car"*, *"The best of them is quite similar. To the publisher problem"*, *"some pixel have like product featured in the world like navigating like mistakes"*. | Each may contain a decision I have missed. | **Only a re-recording or a participant's recollection resolves these.** I excluded them rather than guessing — flagging the exclusion explicitly so nobody assumes the transcript was fully mined. |

**Design risks I am carrying knowingly:**

| # | Risk | Mitigation |
|---|---|---|
| R9 | **P2 vs P5 confusion** (SIREN WARNING vs BUS ARRIVING) | Highest-priority wear test. Both fixes are one-line step-table changes. |
| R10 | **P3 vs P9 waveform similarity** (ATTENTION vs ACK) | Accepted — resolved by causation, not waveform. Stated openly rather than papered over. |
| R11 | **PDM mic must be bound to I2S0** — the PDM-to-PCM hardware converter exists on I2S0 only | Silently degrades to raw-bitstream capture + software decimation if mis-bound. **Put "mic → I2S port 0" in the pin map** and prove the PCM path in the first hour. Signals route through the GPIO matrix, so any port's pins can reach I2S0. |
| R12 | **~8 s from bus appearing to number delivered**, against a 15–30 s dwell | Real but not generous. P6 preempts P5 rather than queueing behind it. If it proves tight in rehearsal, drop the P6 terminator bracket (−1.1 s) before touching digit timing. |
| R13 | **Nothing in this vocabulary has been tested on a person**, let alone a DeafBlind person | §11 L697's honesty line covers it. **Do not let it be cut.** The wear test on a blindfolded team member is the minimum bar before the demo, and it is worth an hour. |
