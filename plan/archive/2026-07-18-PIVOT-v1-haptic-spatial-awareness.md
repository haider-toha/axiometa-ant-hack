> # ⛔ SUPERSEDED — DO NOT BUILD FROM THIS FILE
>
> **PIVOT draft v1.** Archived 2026-07-18. This was the first written statement of the pivot away
> from the speech-to-braille idea. It was superseded within hours by draft v2, archived beside it as
> [`2026-07-18-PIVOT-v2-application-locked.md`](./2026-07-18-PIVOT-v2-application-locked.md).
>
> ### 👉 The current, authoritative plan is [`plan/2026-07-18-bus-stop-situational-awareness.md`](../2026-07-18-bus-stop-situational-awareness.md)
>
> Kept for provenance. Several technical claims below were later disproved — see the "Claims
> disproved" list in the v2 archive header, which applies to this draft too.

---

# Haptic Spatial Awareness for DeafBlind Navigation
### Axiometa × Anthropic Hardware Hack — London, 17–19 July 2026

---

## 1. The Problem

A DeafBlind person walking outdoors has **two of three environmental channels closed**. Vision is gone. Hearing is gone. Touch is all that remains — and the only tool that uses it is a cane that reaches about 1.5 metres of ground.

What this means concretely:

- **A siren approaching from behind is completely undetectable.** So is a car horn, a shouted warning, a reversing alarm, a fire alarm.
- **Anything above knee height is invisible.** Canes sweep the ground. Scaffolding, low branches, open windows, lorry wing mirrors, and A-boards are structurally outside their coverage.
- **Anything beyond ~1.5m is unknown.** No early warning, no route planning, no "the pavement is blocked ahead, cross now."
- **Displays and announcements are both closed.** At a bus stop, the arrival board is visual and the announcement is audio. A DeafBlind person cannot know which bus arrived.

Today, most DeafBlind people travel with a long cane, a guide dog, or a **support service provider (SSP)** — a human who supplies the missing environmental commentary. Independent travel is exhausting, and sighted-guide support in unfamiliar areas is a necessity for many.

**Our device is a partial substitute for the SSP's environmental commentary. It is not a replacement for the cane.**

---

## 2. Prior Art — and Where the Gap Is

| Device | Sensing | Output | Gap for DeafBlind users |
|---|---|---|---|
| **Sunu Band** (~$299) | Sonar, ~5.5m | Wrist haptics — pulses increase in frequency as objects approach; has an "edge detector" for doorways and corners | **No microphone.** No semantics. Proximity only. |
| **biped NOA** | 3× wide-angle cameras, 170° FOV, ~10 object classes, collision prediction | **Audio** via bone-conduction headphones, 3D spatial beeps, clock-position GPS | Audio output is **useless to a deaf user**. Also bulky — the CEO states they compromised on size because images must be processed locally to reduce latency. |
| **WeWALK, Ray** | Ultrasonic | Audio + basic haptics | Proximity only |
| **Seeing AI / Be My Eyes** | Phone camera | Speech | Audio output — closed channel |

### The unoccupied square

> **Nobody combines audio sensing + visual semantics + haptic output.**

- Sunu has haptics but no ears and no understanding.
- NOA has eyes and understanding but speaks to a channel deaf users don't have.
- Seeing AI has understanding but speaks.

**Sound is the sense that carries urgency** — sirens, horns, shouting, alarms. It is also the sense a DeafBlind person has zero access to and no substitute for. This is our primary differentiator.

---

## 3. Hardware

**Board:** Axiometa Genesis Mini — ESP32-S3-Mini-1, 4MB flash / 2MB PSRAM, **4× AX22 ports**, STEMMA QT, USB-C, Wi-Fi + BLE 5, onboard NeoPixel and user buttons, Arduino/MicroPython compatible.

### Port allocation (4 slots, hard constraint)

| Slot | Module | Role |
|---|---|---|
| 1 | Distance Sensor **VL53L0CX** (AX22-0015) | Obstacle reflex + closing speed |
| 2 | Vibration Motor **ERM** (AX22-0013) | Haptic — inner wrist |
| 3 | Vibration Motor **ERM** (AX22-0013) | Haptic — outer wrist |
| 4 | **Digital Microphone** | Siren / urgent sound detection |

**Trigger input** uses the board's **onboard user button** — no slot cost. Optionally add the AX22 Port Extension Kit (£7.54) to recover slots for the LED button and debug screen.

### ToF sensor — verified specs

- Range **1mm – 4000mm**
- Accuracy **< ±10mm up to 2m**, < ±3% beyond
- **< 30ms single-shot, 50Hz continuous**
- I²C, address 0x52
- Arduino library: `Adafruit_VL53L0X`

**It returns one number.** No direction, no shape. But 50Hz unlocks:
- **Closing speed** (derivative) — distinguishes "walking into a wall fast" from "standing near a wall"
- **Manual scanning** — user sweeps arm, buzz intensity traces environment (this is how Sunu works)
- **Gap detection** — sudden 1m→4m jump during a sweep = doorway/opening

⚠️ **Known limitation:** ToF degrades in bright sunlight and against dark/angled surfaces. Test outdoors before demoing outdoors.

---

## 4. The Haptic Language

### Grounded in a real, published vocabulary

**Source:** *103 Haptic Signals — a reference book*, The Danish Association of the Deafblind (Ed. Gerd Nielsen, 2010; English 2012). Free PDF, hosted by WASLI. Developed **by** DeafBlind people in collaboration with contact persons and a reference group from across the Danish DeafBlind community.

Related practice: **Social Haptic Communication (SHC)** — brief touch messages (*haptices*) performed on the body to convey environmental information. Used for room layouts and the position of people and objects, letting a DeafBlind person build a mental image of their surroundings. Also relevant: **Protactile**, a philosophy emerging from the recognition that DeafBlind people's intuitions about tactile communication are stronger than sighted people's.

### The signals we're implementing

| Signal | As performed on the body | Structural essence |
|---|---|---|
| **DANGER** | Index fingertip draws a **big cross** — explicitly, on whichever body part is closest if danger arises | Crossing strokes, maximum urgency |
| **STOP** | Flat hand held **still** against back, held a moment | Sustained, static |
| **LEFT** | Flat hand sweeps **up and to the left** | Directional sweep |
| **RIGHT** | Flat hand sweeps **up and to the right** | Directional sweep |
| **AHEAD** | Flat hand moves **straight up**, vertical line | Vertical, no lateral |
| **MOVE OVER** | Back of hand presses gently **in the direction** to move | Directional pressure |
| **MOMENT / WAITING** | Index finger moves **back and forth** on upper arm | Oscillation |
| **NOISE** | Both hands open/close, **repeated on different parts** of the back | Distributed, repeated |
| **NUMBERS** | Digit **written** on the back, one continuous movement | Discrete glyph |
| **POSITION** | A **poke** marking where a person/object sits, relative to a drawn room outline | Spatial placement |

### The honest constraint

**Nearly every signal is a drawn stroke** — continuous motion across skin. Two ERM motors are point sources. **We cannot draw a cross with two points.**

Two facts make this workable:

1. **Vibrotactile two-point discrimination on the forearm is ~7cm** — versus ~2cm for touch. Vibration blurs. Motors must be on **opposite sides of the wrist** (inner/outer), not side-by-side, or the user feels one blurry buzz.

2. **The book's own grammar layer transfers directly.** Signals are modified by *enlarging the movement, repeating it, or adjusting pressure* — ANGRY uses stronger pressure, LAUGHING repeats as long as laughter continues. These modifiers are called **haptemes**: the grammar of touch — direction, frequency, rhythm, duration. **Intensity, repetition, and duration are exactly what two ERM motors can do.**

> **We cannot reproduce the signals. We can reproduce the grammar.**

The book explicitly permits this: users *choose the signals most relevant to them and adjust them to individual needs*, experimenting with size, pressure and body location, agreed in advance. And it positions itself as *a platform for further development of signals*.

### Our mapping

**L** = inner wrist · **R** = outer wrist

| Meaning | Pattern | Hapteme justification |
|---|---|---|
| **DANGER** | Both motors, 100% intensity, 4× rapid 100ms bursts | Cross = crossing strokes → simultaneous actuators; max pressure |
| **STOP** | Both motors, sustained 800ms, constant | Held static hand position |
| **LEFT** | R fades out → L fades in over 400ms | Directional sweep; sequential activation creates **apparent motion** across skin |
| **RIGHT** | L fades out → R fades in over 400ms | Mirror |
| **AHEAD** | Both motors, single 300ms ramp | Vertical sweep, no lateral component |
| **WAIT** | Alternating L-R-L-R, gentle, 200ms each | Back-and-forth oscillation |
| **SIREN / NOISE** | Both motors, irregular stutter, repeated | "Repeated on different parts of the back" |
| **NUMBER n** | *n* short pulses on R, 150ms on / 150ms off | Digit as discrete units |

**The L→R fade is the technical highlight.** Sequential activation of two spaced actuators produces a *phantom sweep* — the closest a two-point system gets to a drawn stroke. This is a real perceptual effect, not a workaround.

### What we explicitly rejected: Braille

Vibrotactile Braille on the wrist is **physically impossible**, and this was our most important early finding:

- A Braille cell needs 6 distinguishable points in ~6mm. Vibrotactile 2PD on the forearm is ~70mm. **Off by an order of magnitude.**
- Researchers building vibrotactile interfaces for DeafBlind users chose **Morse over Braille** specifically because Braille is more complex and less time-efficient — the letter T is one dash in Morse but multiple dots in Braille.
- Best measured throughput: **30–35 characters/minute**. Spelling "C-A-R" takes seconds. A car takes one second to hit you.

**Text is the wrong channel for danger.** Semantic haptic signals are the right one.

---

## 5. Architecture — Three Tiers by Latency Budget

The core design principle: **match latency to urgency.**

### Tier 1 — Reflex (< 50ms, fully onboard, no network)
```
ToF continuous @ 50Hz  ──┐
                         ├──►  Direct motor drive
Mic amplitude threshold ─┘
```
- Obstacle within threshold → intensity/rate proportional to distance
- Closing speed weighted: fast approach = higher urgency
- **Must work with Wi-Fi unplugged.** This is the safety floor.

### Tier 2 — Awareness (< 200ms, onboard FFT)
```
I²S mic → FFT → classify → haptic pattern
```
Siren acoustics (verified):
- **Wail:** sweeps ~400Hz → ~1300Hz and back
- **Yelp:** rapid modulation at **~2.5Hz** — a rhythm humans instinctively read as urgent
- Human hearing is most sensitive **500–2000Hz**, which is where siren tones live by design
- Library: `arduinoFFT` — well-established on ESP32

**One mic cannot give distance or direction.** But it gives:
- **Amplitude trend** over 3s → approaching or receding ← *this is the useful inference*
- **Doppler shift** → falling pitch = already passed
- **Classification** → siren vs horn vs alarm

### Tier 3 — Semantics (1–3s, Modal + Claude)
```
Trigger → camera frame(s) → Modal endpoint → Claude vision
       → structured decision JSON → BLE → haptic pattern
```

**Return an action, not a description.**
```json
{ "action": "drift_left", "urgency": 2, "reason": "roadworks", "bearing": 10 }
```
Prose has to be parsed into a buzz pattern. That's where hackathon demos die at 4am.

---

## 6. Why Cloud Vision Is Acceptable Here (and where it isn't)

**Modal pricing (verified):** T4 $0.000164/sec · L4 $0.000222/sec · A10 $0.000306/sec · CPU $0.0000131/physical-core/sec. **$30/month free credits, auto-renewing, no card required.** Python-native `@app.function()` decorators, web endpoints, per-second billing, scale to zero.

**Modal cold starts: 3–15s** for a typical ML inference container. Modal has invested heavily here — GPU memory snapshotting took one customer from ~70s to ~12s — but even 3s is **fatal for collision avoidance**.

The industry already learned this:
- **NOA processes locally** specifically to cut latency; its bulk is the onboard computer and battery.
- A 2026 Android assistive app found running YOLO11n + depth per frame dropped **below 1 FPS** on mid-range devices. Final design: **removed YOLO, kept depth locally for proximity, delegated scene description to cloud** → stable 7–15 FPS.

> **We steal that split. Local = geometry and reflex. Cloud = semantics.**

Cloud latency is acceptable for Tier 3 because we're describing things **10m away**, not reacting to something 1m away. Coarse alert now, precise guidance two seconds later — which is exactly how a human sighted guide works: a hand on the arm first, explanation second.

**Do not host a model just to have hosted one.** Claude has vision and we have credits. Modal's legitimate roles:
1. **Fusion endpoint** — takes `{sound_event, distance, image}`, holds a few seconds of state (so it can distinguish *approaching* from *receding*), calls Claude, returns one decision. **State is the honest reason to have a server.**
2. **Fast pre-filter** — tiny detector on T4 does a 100ms "is anything urgent" pass; escalate to Claude only when needed.
3. **Background monitoring** — ~1fps stream, push alerts only on state change.

---

## 7. Vision Applications — Ranked

### ⭐ A. Siren disambiguation *(tightest sensor coupling)*
Mic says *siren, rising*. That's all it can say. Vision answers what matters.

- **Prompt:** *"Emergency vehicle visible? Which side of frame? Between camera and vehicle — kerb, road, or clear pavement? Is the user standing in a roadway?"*
- **Returns:** `{vehicle: true, side: "left", user_in_road: false, action: "hold"}`
- **Haptic:** L motor, 3 sharp pulses = *on your left, stay put*

**Why it wins:** A siren while safely on a pavement needs no action. A siren while mid-crossing needs immediate action. **Sound cannot tell these apart. Vision can.** That is the entire argument for having a camera.

### ⭐ B. Overhead / head-height hazards *(cleanest "cane can't do this")*
- **Prompt:** *"Any obstruction between 1.4m and 2.2m above ground in the walking path? Type and distance?"*
- Our ToF points forward at wrist height and will **miss a branch entirely**
- NOA explicitly markets low-hanging branch detection — validated need

### C. Arrival / bus stop *(best narrative, most novel)*
A DeafBlind person cannot know which bus arrived. Display is visual, announcement is audio. **Both channels closed.**
- Vision reads the bus number or arrival board → haptic delivers digits via NUMBERS pattern
- Demoable indoors with a printed sign
- **Roadmap note:** TfL has an open real-time arrivals API — beats OCR entirely in production

### D. Pavement obstruction lookahead
- **Prompt:** *"Path 5–15m ahead: clear? If obstructed, what and which side is passable?"*
- Value: **early gentle correction instead of late collision.** Adjust 8m out, nobody notices.

### ~~E. Crossing state~~ — *roadmap only, not the build*
Highest stakes, highest liability. If mentioned, frame as **information, never permission**: "the system reports the signal shows walk," never "it's safe to cross."

---

## 8. Severity Model

| Level | Trigger | Response |
|---|---|---|
| **CRITICAL** | Siren + rising amplitude | Immediate DANGER pattern, both motors, **auto-triggers camera** |
| **WARNING** | Siren steady/receding, horn | Single distinct pattern, no camera |
| **ADVISORY** | ToF closing slowly, ambient change | Gentle pulse |
| **ON-DEMAND** | User presses button | Full vision analysis |

**Key automation:** critical events auto-trigger the camera. The user shouldn't have to press a button when a siren is bearing down.

⚠️ **Do not make "turn around to gather info" the default.** Asking a DeafBlind person to rotate in place during an emergency is a lot, and they cannot verify they turned the right way. Capture what the camera already sees; only prompt a turn if Claude reports insufficient information.

---

## 9. Build Order

### Phase 1 — Reflex (must ship)
- [ ] Mount motors on **opposite sides of wrist**
- [ ] **Blindfold discrimination test** — fire one at random, call left/right. Need ~90%. *If this fails, move them further apart before building anything on top.*
- [ ] `Adafruit_VL53L0X` continuous ranging → distance-proportional buzz
- [ ] Closing-speed derivative
- [ ] Gate readings across frames to reject ground-return flicker from arm swing

### Phase 2 — Awareness (differentiator)
- [ ] I²S mic → `arduinoFFT`
- [ ] Detect 400–1300Hz sweep and 2.5Hz modulation
- [ ] Amplitude trend over 3s → approaching/receding
- [ ] Distinct SIREN haptic pattern
- [ ] **Test early** — if I²S fights you, fall back to analogue mic or phone mic

### Phase 3 — Semantics (ambition)
- [ ] Modal endpoint, Claude vision, structured JSON out
- [ ] Frame capture → decision → BLE → haptic
- [ ] Wire to CRITICAL auto-trigger

### Fallback if the mobile app becomes the bottleneck
**Skip the phone.** Laptop webcam → Wi-Fi → Modal → push to board. Ugly but removes the entire mobile build from the critical path. Nothing in the demo actually requires a phone.

---

## 10. Demo Script

1. **Reflex** — walk toward a wall, wrist buzzes with rising intensity. *Unplug Wi-Fi. It still works.*
2. **Sweep** — sweep arm across the room, feel the environment traced out. Hit a doorway, feel the gap.
3. **Siren** — play a siren from a laptop. Instant DANGER pattern. Screen shows the FFT signature and *"approaching."*
4. **Fusion** — siren auto-triggers camera. Two seconds later, refined directional haptic. Screen shows Claude's returned JSON.
5. **Overhead** — hold something at head height. Cane analogy lands.

**Put the debug screen and LED matrix on the judges.** The actual output is invisible to an audience — the screen is how they see the system thinking.

---

## 11. Positioning — Say These Exact Things

✅ **"The cane is assumed."** Kills the "why not just a cane?" question before it's asked. The cane handles the ground; we handle what it can't reach.

✅ **"We didn't invent a haptic vocabulary — we implemented one."** The Danish reference book, developed by DeafBlind people. The signals are drawn strokes, which two actuators can't reproduce, so we implemented the **semantic categories and the hapteme grammar**: intensity, repetition, duration, directional sequencing. The book explicitly frames itself as a platform for further development.

✅ **"We have not validated with DeafBlind users."** The community norm is **"nothing about us without us."** Most prior haptic research used sighted or blindfolded participants, which limits real-world applicability. One study reached out to **90+ DeafBlind organisations** to recruit two participants. Nobody expects user studies in 48 hours — but state the gap and the plan to close it. This protects you from the one judge who knows the field.

### Language
- ❌ "helping them see" → ✅ **orientation and mobility (O&M)**, environmental description
- ❌ replacement for the cane → ✅ **complement to** the cane
- ❌ "it's safe to cross" → ✅ "the signal reports walk"

---

## 12. Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Motors too close → no L/R discrimination | **High** | Opposite sides of wrist; blindfold test **first** |
| I²S mic driver eats hours | **High** | Test tonight; analogue or phone mic fallback |
| Mobile app blocks critical path | **High** | Laptop webcam + Wi-Fi instead |
| ToF fails in sunlight | Medium | Demo indoors; disclose honestly |
| Modal cold start visible in demo | Medium | Warm the container before demoing; two-stage haptic makes latency legible as design |
| "Why not a cane?" | Medium | Cane assumed; we cover distance, overhead, audio |
| "Have you talked to DeafBlind users?" | Medium | Answer honestly, name the plan |

---

## 13. Roadmap Slide

- **Back-worn actuator array.** The **ROOM** convention — draw the outline, mark a dot for where you are, place objects relative to it — is an elegant spatial encoding, and it's essentially what our vision layer already outputs. *"Our vision model produces a room model in exactly the structure DeafBlind people already use for spatial description. A back-worn array would render it directly."*
- **Validation with DeafBlind users** via Helen Keller National Center / Deafblind UK / Sense.
- **Two-mic TDOA** for acoustic direction-of-arrival (~150µs delay at wrist spacing — real DSP, not a hackathon build).
- **Transit API integration** replacing OCR for arrivals.
- **On-device VLM** to remove cloud dependency entirely, following NOA's local-processing rationale.

---

## Sources

- *103 Haptic Signals — a reference book*, Danish Association of the Deafblind — https://wasli.org/wp-content/uploads/2022/11/103-Haptic-Signals-English.pdf
- Kutner & Hadzidedic, *Vibration-based communication for deafblind people* — https://arxiv.org/pdf/2205.04802
- VibroMap: vibrotactile actuator spacing across the body — https://mschmitz.org/publications/elsayed-IMWUT20-vibromap.pdf
- Two-Point Discrimination of Vibrotactile Stimuli on the Forearm — https://dl.acm.org/doi/10.1145/3743721
- *Beyond the fingertips: haptic technologies for a deafblind future* — https://pmc.ncbi.nlm.nih.gov/articles/PMC11877112/
- Social Haptics, Deafblind Information — https://www.deafblindinformation.org.au/living-with-deafblindness/deafblind-communication/social-haptics/
- Haptics & Protactile, National Center on Deafblindness — https://www.nationaldb.org/info-center/educational-practices/touch-signals/
- AADB FAQ on Deaf-Blindness — https://www.aadb.org/FAQ/faq_DeafBlindness.html
- Axiometa Genesis Mini + AX22 modules — https://www.axiometa.io/ · https://www.crowdsupply.com/axiometa/genesis-iot-discovery-lab
- VL53L0CX product page — https://www.axiometa.io (AX22-0015)
- Modal serverless GPU cold starts — https://modal.com/blog/truly-serverless-gpus
- Modal pricing — https://www.usagepricing.com/blueprint/modal
- biped NOA — https://biped.ai/ · AppleVis review (local processing rationale) — https://www.applevis.com/forum/assistive-technology/my-sightcity-impressions-about-noa-mobility-device-biped-ai
- Sunu Band — https://lowvisionmd.org/sunu-band-faqs/
- VisionAId offline-first Android assistant (YOLO/depth FPS finding) — https://arxiv.org/html/2607.02371v1
- Siren acoustics — https://www.blueprintfleet.com/drawingboard/loud-and-clear-the-science-and-strategy-behind-emergency-vehicle-sirens · https://sirengenerator.com/sirens/yelp
- ESP32 + arduinoFFT — https://www.makerguides.com/spectrum-analyzer-with-esp32-and-max4466/
- "Nothing about us without us" in AT research — https://www.tandfonline.com/doi/full/10.1080/10400435.2022.2117524

