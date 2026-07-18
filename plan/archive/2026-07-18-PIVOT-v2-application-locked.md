> # ⛔ SUPERSEDED — DO NOT BUILD FROM THIS FILE
>
> **PIVOT draft v2 ("application locked").** Archived 2026-07-18. This was the strongest statement of
> the bus-stop direction and much of its *reasoning* survives — but it was written before anything was
> measured, and four audit tracks subsequently disproved a number of its concrete claims.
>
> ### 👉 The current, authoritative plan is [`plan/2026-07-18-bus-stop-situational-awareness.md`](../2026-07-18-bus-stop-situational-awareness.md)
>
> ### Claims in this file that were verified WRONG — do not lift these
>
> | Claim here | Reality | Established by |
> |---|---|---|
> | Motors sit "on opposite sides of the wrist", ~7cm apart | **Impossible.** No port extension kit exists, so modules snap directly to the board. Max separation is **33.941mm** (P1↔P3 diagonal) — 48% of the ~70mm two-point threshold this file itself cites. L/R spatial coding is unachievable. | `audit/bus-stop-situational-awareness/01`, `03` |
> | Port table: ToF→1, ERM→2, ERM→3, mic→4 | Puts the ERMs on an **adjacent** pair, 10mm worse than the diagonal. Correct: **ERMs on {1,3}, ToF + mic on {2,4}**. | `audit/…/01` |
> | Motor data pin is IO0 (GPIO4 / GPIO9) | **Wrong pin.** The AX22-0013 leaves IO0 *not connected* and drives from **IO1** → **GPIO3 / GPIO16**. Motors would never have moved. | `audit/…/04` |
> | Siren classification in "<200ms" | **Physically impossible** — yelp modulation is 2–4Hz (400ms+ per period) and a wail cycle is 1–4s. The evidence does not exist that early. | `audit/…/03` |
> | §8 Phase 1: blindfold L/R test, "if this fails, move them apart" | A gate with **no possible remedy** — the ports are fixed. As written, day one opens with a test that can only fail into a dead end. | `audit/…/03` |
> | Route number as *n* pulses (unary) | **No symbol for zero** — routes 10, 20, 205 are unencodable. "88" would be 16 pulses. §10 also contradicts §4 by saying "eight pulses". | `audit/…/03` |
> | Demo with "a printed sign… a large clear route number" | A sheet of paper is **not a bus** — COCO class 5 never fires and detection silently returns nothing. The prop must be a picture of a bus front. | `audit/…/02` |
> | Modal "$30/month free credits… no card required" | **A payment method is required** to use Modal at all. | `audit/…/02` |
> | "Modal cold starts 3–15s" | **Not a Modal figure.** Modal publishes ~1s container boot and "seconds to minutes" end-to-end. GPU memory snapshotting is **alpha**. | `audit/…/02` |
> | Prompt-only JSON for the decision schema | Now the **weakest** option available — Anthropic shipped first-class structured outputs. Prefill 400s on current models. | `audit/…/02` |
>
> What *does* survive: the problem framing, the prior-art gap analysis, the three-tier latency
> architecture, the "detection is when, Claude is what" split (though for **state**, not cost), and the
> haptic-grammar argument. All of it is carried forward, corrected, in the current plan.

---


# Haptic Spatial Awareness for DeafBlind Navigation
### Axiometa × Anthropic Hardware Hack — London, 17–19 July 2026
**v2 — application locked**

---

## 0. What Changed From v1

| | v1 | **v2 (locked)** |
|---|---|---|
| Vision application | Four candidates, unranked | **Bus stop identification** |
| Modal role | Orchestration only | **Hosts a real vision model** (YOLO detection + optional depth) |
| Claude role | Everything | **Reading and reasoning on cropped regions only** |
| Pitch spine | Collision avoidance | **Situational awareness** — "what's happening around you" |

**The reframe that drove it:** a DeafBlind person with a cane or a guide dog usually knows *where* they are. What they don't have is any signal about *what is happening around them*. That's the gap. Not navigation — awareness.

---

## 1. The Problem

A DeafBlind person outdoors has **two of three environmental channels closed**. Vision gone. Hearing gone. Touch is all that remains, and the only tool using it is a cane covering ~1.5m of ground.

- **A siren approaching from behind is undetectable.** So is a horn, a shout, a reversing alarm.
- **Anything above knee height is invisible.** Canes sweep the ground. Scaffolding, branches, wing mirrors, A-boards are structurally outside coverage.
- **Anything beyond ~1.5m is unknown.** No early warning, no route planning.
- **Displays and announcements are both closed channels.**

Today most DeafBlind people travel with a long cane, a guide dog, or a **support service provider (SSP)** — a human supplying the missing environmental commentary. Independent travel is exhausting; sighted-guide support in unfamiliar areas is a necessity for many.

> **Our device is a partial substitute for the SSP's environmental commentary. It is not a replacement for the cane.**

### The locked use case: which bus just arrived?

A DeafBlind person at a bus stop **cannot know which bus pulled in**. The route number is on a display — visual. The announcement is audio. **Both channels closed.**

Current options: ask a stranger, travel with someone, or don't go. There is no assistive technology that solves this for a DeafBlind user.

Existing partial solutions all **output audio or require hearing**:
- **Be My Eyes** — connects to a sighted volunteer who answers questions over video. Requires hearing and speech.
- **Soundscape** — Microsoft's 3D spatial audio navigation. Microsoft discontinued it and released the code open-source under MIT; it now lives on as **Soundscape by Scottish Tech Army**, **Soundscape Community**, and **VoiceVista**. It calls out points of interest by clock position — *"bus stop at 11 o'clock"* — built on OpenStreetMap data. **Entirely audio output.**

**Every existing solution speaks. Our user cannot hear.** That is the gap, stated in one line.

---

## 2. Prior Art — Where the Gap Is

| Device | Sensing | Output | Gap for DeafBlind users |
|---|---|---|---|
| **Sunu Band** (~$299) | Sonar ~5.5m | Wrist haptics; pulses increase as objects approach; "edge detector" for doorways | **No microphone.** No semantics. Proximity only. |
| **biped NOA** | 3× cameras, 170° FOV, ~10 classes, collision prediction | **Audio** via bone conduction, 3D beeps, clock-position GPS | Audio is **useless to a deaf user**. Bulky — CEO states they compromised on size because images must process locally to cut latency. |
| **Be My Eyes** | Phone camera + human volunteer | Voice call | Requires hearing and speech |
| **Soundscape / VoiceVista** | GPS + OpenStreetMap | 3D spatial audio | Audio only |
| **Seeing AI** | Phone camera | Speech | Audio only |

### The unoccupied square

> **Nobody combines audio sensing + visual semantics + haptic output.**

- Sunu: haptics, no ears, no understanding
- NOA: eyes and understanding, speaks to a channel deaf users lack
- Be My Eyes / Soundscape / Seeing AI: understanding, speaks

**Sound carries urgency** — sirens, horns, shouting, alarms — and it's the sense a DeafBlind person has zero access to and no substitute for. Primary differentiator.

---

## 3. Hardware

**Board:** Axiometa Genesis Mini — ESP32-S3-Mini-1, 4MB flash / 2MB PSRAM, **4× AX22 ports**, STEMMA QT, USB-C, Wi-Fi + BLE 5, onboard NeoPixel and user buttons, Arduino/MicroPython compatible.

### Port allocation (4 slots, hard constraint)

| Slot | Module | Role |
|---|---|---|
| 1 | Distance Sensor **VL53L0CX** | Obstacle reflex + closing speed |
| 2 | Vibration Motor **ERM** | Haptic — inner wrist |
| 3 | Vibration Motor **ERM** | Haptic — outer wrist |
| 4 | **Digital Microphone** | Siren / urgent sound |

Trigger input uses the **onboard user button** — no slot cost. Optional AX22 Port Extension Kit (£7.54) recovers slots for LED button + debug screen.

### ToF verified specs
- Range **1mm – 4000mm**, accuracy **< ±10mm to 2m**, < ±3% beyond
- **< 30ms single-shot, 50Hz continuous**, I²C addr 0x52
- Library: `Adafruit_VL53L0X`

Returns **one number** — no direction, no shape. But 50Hz unlocks **closing speed** (derivative), **manual scanning** (sweep arm, buzz traces environment — how Sunu works), and **gap detection** (1m→4m jump = doorway).

⚠️ Degrades in bright sunlight and against dark/angled surfaces. Test outdoors before demoing outdoors.

---

## 4. The Haptic Language

**Source:** *103 Haptic Signals — a reference book*, Danish Association of the Deafblind (Ed. Gerd Nielsen, 2010; English 2012). Free PDF via WASLI. Developed **by** DeafBlind people with contact persons and a reference group from across the Danish DeafBlind community.

Related: **Social Haptic Communication (SHC)** — brief touch messages (*haptices*) on the body conveying environmental information; used for room layouts and object positions so a DeafBlind person can build a mental image of surroundings. Also **Protactile**, emerging from the recognition that DeafBlind people's intuitions about tactile communication are stronger than sighted people's.

### Signals we implement

| Signal | As performed | Structural essence |
|---|---|---|
| **DANGER** | Index fingertip draws a **big cross** — explicitly on whichever body part is closest if danger arises | Crossing strokes, max urgency |
| **STOP** | Flat hand held **still**, held a moment | Sustained, static |
| **LEFT** | Flat hand sweeps **up and left** | Directional sweep |
| **RIGHT** | Flat hand sweeps **up and right** | Directional sweep |
| **AHEAD** | Flat hand moves **straight up** | Vertical, no lateral |
| **MOVE OVER** | Back of hand presses **in the direction** to move | Directional pressure |
| **MOMENT / WAITING** | Index finger moves **back and forth** on upper arm | Oscillation |
| **NOISE** | Both hands open/close, **repeated on different parts** of the back | Distributed, repeated |
| **NUMBERS** | Digit **written** on the back, one continuous movement | Discrete glyph |
| **POSITION** | A **poke** marking where something sits relative to a drawn room outline | Spatial placement |

### The honest constraint

**Nearly every signal is a drawn stroke** — continuous motion across skin. Two ERM motors are point sources. **We cannot draw a cross with two points.**

Two facts make it workable:

1. **Vibrotactile two-point discrimination on the forearm is ~7cm** — versus ~2cm for touch. Vibration blurs. Motors go on **opposite sides of the wrist** (inner/outer), never side-by-side, or the user feels one blurry buzz.

2. **The book's grammar layer transfers directly.** Signals are modified by *enlarging the movement, repeating it, or adjusting pressure* — ANGRY uses stronger pressure, LAUGHING repeats as long as laughter continues. These modifiers are **haptemes**: the grammar of touch — direction, frequency, rhythm, duration. **Intensity, repetition and duration are exactly what two ERM motors can do.**

> **We cannot reproduce the signals. We can reproduce the grammar.**

The book explicitly permits adaptation: users *choose the signals most relevant to them and adjust them to individual needs*, experimenting with size, pressure and body location, agreed in advance. It positions itself as *a platform for further development of signals*.

### Our mapping — **L** = inner wrist · **R** = outer wrist

| Meaning | Pattern | Hapteme justification |
|---|---|---|
| **DANGER** | Both, 100%, 4× rapid 100ms bursts | Cross = crossing strokes → simultaneous; max pressure |
| **STOP** | Both, sustained 800ms constant | Held static hand |
| **LEFT** | R fades out → L fades in, 400ms | Sweep; sequential activation creates **apparent motion** |
| **RIGHT** | L fades out → R fades in, 400ms | Mirror |
| **AHEAD** | Both, single 300ms ramp | Vertical, no lateral |
| **WAIT** | Alternating L-R-L-R gentle, 200ms each | Back-and-forth oscillation |
| **SIREN / NOISE** | Both, irregular stutter, repeated | "Repeated on different parts of the back" |
| **BUS ARRIVING** | Both, 2× medium 300ms pulses | Attention-getter, distinct from DANGER |
| **NUMBER n** | *n* short pulses on R, 150ms on / 150ms off | Digit as discrete units |

**The L→R fade is the technical highlight.** Sequential activation of two spaced actuators produces a *phantom sweep* — the closest a two-point system gets to a drawn stroke. Real perceptual effect, not a workaround.

### Rejected: Braille

**Physically impossible on a wrist.**
- Braille cell = 6 distinguishable points in ~6mm. Vibrotactile 2PD on forearm ≈ 70mm. **Off by an order of magnitude.**
- Researchers building DeafBlind vibrotactile interfaces chose **Morse over Braille** because Braille is more complex and less time-efficient — T is one dash in Morse, multiple dots in Braille.
- Best measured throughput **30–35 chars/min**. Spelling "C-A-R" takes seconds. A car takes one second to hit you.

**Text is the wrong channel for danger. Semantic haptic signals are the right one.**

---

## 5. Architecture — Three Tiers by Latency Budget

**Core principle: match latency to urgency.**

### Tier 1 — Reflex (< 50ms, onboard, no network)
```
ToF @ 50Hz ──┐
             ├──► direct motor drive
mic amplitude┘
```
Obstacle within threshold → intensity/rate proportional to distance, weighted by closing speed. **Must work with Wi-Fi unplugged.** Safety floor.

### Tier 2 — Awareness (< 200ms, onboard FFT)
```
I²S mic → arduinoFFT → classify → haptic
```
Siren acoustics (verified):
- **Wail:** sweeps ~400Hz → ~1300Hz and back
- **Yelp:** rapid modulation at **~2.5Hz** — a rhythm humans instinctively read as urgent
- Human hearing most sensitive **500–2000Hz**, where siren tones live by design

One mic gives no distance or direction, but gives **amplitude trend** over 3s → approaching/receding (*the useful inference*), **Doppler shift** → falling pitch = already passed, and **classification** → siren vs horn vs alarm.

### Tier 3 — Semantics (1–3s, Modal + Claude)
Two models, two jobs. See §6.

---

## 6. The Vision Pipeline — Two Models, Two Jobs

```
Video frames (phone or laptop webcam)
        │
        ▼
┌─────────────────────────────────────┐
│ MODAL — hosted YOLO (T4)            │  Detection & localisation
│ • COCO pretrained, has `bus` class  │  Fast, continuous, cheap
│ • Returns bbox + confidence         │  ~50-100ms/frame
│ • Crops destination-blind region    │
└─────────────────────────────────────┘
        │  bus detected → BUS ARRIVING haptic fires immediately
        ▼
┌─────────────────────────────────────┐
│ CLAUDE VISION — on the crop only    │  Reading & reasoning
│ • Reads route number + destination  │  On demand, ~1-2s
│ • Returns structured decision JSON  │
└─────────────────────────────────────┘
        │
        ▼
  Decision → Wi-Fi/BLE → NUMBERS haptic pattern
```

### Why the split is real, not decorative

- **Claude doesn't need to watch 30fps.** The detector does. Claude fires ~twice per arrival. Genuine cost and latency argument.
- **Cropping massively improves OCR.** A full street scene renders the route number tiny. Detect → crop → read is the standard pipeline.
- **The detector gives you *when*.** "A bus is pulling in" is a state change you alert on **immediately**, before Claude has read anything. **Two-stage haptic:** *bus arriving* now, *it's the 88* two seconds later.

### Modal specifics (verified)

**Ultralytics publishes an official Modal quickstart.** Notably, the canonical demo image in that guide is `bus.jpg` and its output reads *"4 persons, 1 bus"* — the exact detection we need, out of the box, no training.

- **COCO pretrained already has a `bus` class.** No dataset, no fine-tuning.
- Recommended GPU: **T4 (16GB) is typically sufficient and cost-effective for inference**; A10G/A100 only for training or larger models.
- **T4 at $0.000164/sec** (~$0.59/hr). Against the **$30/month free auto-renewing credit** (no card required), the whole hackathon costs well under a dollar.
- Python-native `@app.function()` decorators, web endpoints, per-second billing, scale to zero.

```python
import modal

app = modal.App("bus-vision")
image = modal.Image.debian_slim().pip_install(
    "ultralytics", "opencv-python-headless"
)

@app.function(gpu="T4", image=image, scaledown_window=600)
@modal.fastapi_endpoint(method="POST")
def detect(frame_b64: str):
    # YOLO → bus bbox → crop → return crop + confidence
    ...
```

⚠️ **Set `scaledown_window` generously so the container stays warm through the demo.** Modal cold starts run **3–15s** for a typical ML inference container — they've invested heavily here (GPU memory snapshotting took one customer from ~70s to ~12s) but a cold start on stage will hurt.

### Optional second hosted model

**Depth Anything V2 (small)** on the same endpoint gives distance-to-bus with no extra sensor — our ToF only reaches 4m and a bus pulls in much further out. Second genuinely-useful hosted model, strengthens the "we used Modal for vision" claim.

### Why cloud latency is acceptable here

The industry already learned this:
- **NOA processes locally** specifically to cut latency; its bulk is the onboard computer and battery.
- A 2026 Android assistive app found YOLO11n + depth per frame dropped **below 1 FPS** on mid-range devices. Final design: **removed YOLO, kept depth locally for proximity, delegated scene description to cloud** → stable 7–15 FPS.

> **We steal that split. Local = geometry and reflex. Cloud = semantics.**

Cloud latency is fine for Tier 3 because we describe things **10m away**, not react to something 1m away. Coarse alert now, precise guidance two seconds later — exactly how a human sighted guide works: hand on the arm first, explanation second.

### Claude prompt + return schema

**Prompt:**
> *You are reading a bus destination display for a DeafBlind user. Return ONLY JSON. What is the route number and destination? If the number is not clearly legible, set `confidence` to "low" — do not guess.*

**Returns:**
```json
{
  "route": "88",
  "destination": "Clapham Common",
  "confidence": "high"
}
```

**Return an action or a value, never prose.** Prose has to be parsed into a buzz pattern, and that's where hackathon demos die at 4am.

---

## 7. Severity Model

| Level | Trigger | Response |
|---|---|---|
| **CRITICAL** | Siren + rising amplitude | Immediate DANGER pattern, both motors, **auto-triggers camera** |
| **WARNING** | Siren steady/receding, horn | Single distinct pattern, no camera |
| **ADVISORY** | ToF closing slowly | Gentle pulse |
| **BUS ARRIVING** | YOLO detects bus | 2× medium pulses, then NUMBERS once Claude returns |
| **ON-DEMAND** | User presses button | Full vision analysis |

⚠️ **Don't make "turn around to gather info" the default.** Asking a DeafBlind person to rotate in place during an emergency is a lot, and they cannot verify they turned the right way. Capture what the camera already sees; only prompt a turn if Claude reports insufficient information.

---

## 8. Build Order

### Phase 1 — Reflex (must ship)
- [ ] Mount motors **opposite sides of wrist**
- [ ] **Blindfold discrimination test** — fire one at random, call left/right, need ~90%. *If this fails, move them apart before building anything on top.*
- [ ] `Adafruit_VL53L0X` continuous → distance-proportional buzz
- [ ] Closing-speed derivative
- [ ] Gate readings across frames to reject ground-return flicker from arm swing

### Phase 2 — Awareness (differentiator)
- [ ] I²S mic → `arduinoFFT`
- [ ] Detect 400–1300Hz sweep + 2.5Hz modulation
- [ ] Amplitude trend over 3s → approaching/receding
- [ ] SIREN haptic pattern
- [ ] **Test early** — if I²S fights you, fall back to analogue or phone mic

### Phase 3 — Bus stop (the pitch)
- [ ] Modal + YOLO endpoint, warm container
- [ ] Bus detection → immediate BUS ARRIVING haptic
- [ ] Crop → Claude → route number JSON
- [ ] NUMBERS haptic delivery
- [ ] Multi-frame voting + confidence gating

### Fallback if the mobile app blocks
**Skip the phone.** Laptop webcam → Wi-Fi → Modal → push to board. Removes the entire mobile build from the critical path. Nothing in the demo requires a phone.

---

## 9. The Bus Number Risk — Mitigate All Three Ways

Route numbers on a moving vehicle, at distance, variable light, from a wrist/chest camera is a **hard OCR problem** and the single most likely live failure.

1. **Multi-frame voting.** 10 frames over 2s, Claude on the best-cropped few, take the modal answer. One bad frame doesn't sink it.
2. **Confidence gating.** If Claude isn't sure → **WAIT pattern, not a wrong number.** Telling a DeafBlind person the wrong bus is worse than telling them nothing.
3. **Demo with a printed sign or tablet.** A large clear route number is a legitimate prop. State openly that live street conditions are the next validation step.

**Roadmap note:** TfL has an open real-time arrivals API — in production that beats OCR entirely. Vision handles *"a bus is physically here now"*; the API handles *"which one."*

---

## 10. Demo Script

1. **Reflex** — walk toward a wall, wrist buzzes with rising intensity. **Unplug Wi-Fi. It still works.**
2. **Sweep** — sweep arm across the room, feel the environment traced out. Hit a doorway, feel the gap.
3. **Siren** — play a siren from a laptop. Instant DANGER pattern. Screen shows FFT signature + *"approaching."*
4. **Bus stop** *(the money shot)* — hold up the bus sign. Two pulses fire immediately: *something arrived*. Two seconds later, eight pulses: *it's the 88*. Screen shows YOLO bbox and Claude's JSON.
5. **Overhead** — hold something at head height. Cane analogy lands.

**Put the debug screen and LED matrix on the judges.** The real output is invisible to an audience — the screen is how they see the system thinking.

---

## 11. Positioning — Say These Exact Things

✅ **"The cane is assumed."** Kills "why not just a cane?" before it's asked. Cane handles the ground; we handle what it can't reach.

✅ **"Every existing solution speaks. Our user can't hear."** Be My Eyes needs hearing. Soundscape is audio. Seeing AI is audio. NOA is audio. One sentence, whole gap.

✅ **"We didn't invent a haptic vocabulary — we implemented one."** The Danish reference book, developed by DeafBlind people. Signals are drawn strokes that two actuators can't reproduce, so we implemented the **semantic categories and hapteme grammar**: intensity, repetition, duration, directional sequencing. The book explicitly frames itself as a platform for further development.

✅ **"We have not validated with DeafBlind users."** Community norm is **"nothing about us without us."** Most prior haptic research used sighted or blindfolded participants, limiting real-world applicability; one study contacted **90+ DeafBlind organisations** to recruit two participants. Nobody expects user studies in 48 hours — but state the gap and the plan. This protects you from the one judge who knows the field.

### Language
- ❌ "helping them see" → ✅ **orientation and mobility (O&M)**, environmental description, **situational awareness**
- ❌ replaces the cane → ✅ **complements** the cane
- ❌ "it's safe to cross" → ✅ "the signal reports walk"

---

## 12. Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Motors too close → no L/R discrimination | **High** | Opposite sides of wrist; blindfold test **first** |
| I²S driver eats hours | **High** | Test tonight; analogue/phone mic fallback |
| Bus number unreadable | **High** | Multi-frame voting, confidence gating, printed prop |
| Mobile app blocks critical path | **High** | Laptop webcam + Wi-Fi instead |
| Modal cold start on stage | Medium | Long `scaledown_window`, warm before demo |
| ToF fails in sunlight | Medium | Demo indoors; disclose honestly |
| "Why not a cane?" | Medium | Cane assumed; we cover distance, overhead, audio |
| "Talked to DeafBlind users?" | Medium | Answer honestly, name the plan |

---

## 13. Roadmap Slide

- **Transit API integration** (TfL) replacing OCR — vision confirms physical arrival, API supplies the number.
- **Back-worn actuator array.** The **ROOM** convention — draw the outline, mark a dot for where you are, place objects relative to it — is an elegant spatial encoding, and essentially what our vision layer already outputs. *"Our vision model produces a room model in exactly the structure DeafBlind people already use for spatial description. A back-worn array would render it directly."*
- **Soundscape data layer.** Now MIT-licensed open source. Its OpenStreetMap POI engine and clock-position callouts are a ready-made semantic layer — **we'd render it haptically instead of audibly.** Direct reuse, credited.
- **Validation with DeafBlind users** via Helen Keller National Center / Deafblind UK / Sense.
- **Two-mic TDOA** for acoustic direction-of-arrival (~150µs delay at wrist spacing — real DSP, not a hackathon build).
- **Face recognition for known contacts** — situational awareness extends to *who* is nearby, not just what.
- **On-device VLM** removing cloud dependency, following NOA's local-processing rationale.

---

## Sources

**Haptic language & DeafBlind practice**
- *103 Haptic Signals* — https://wasli.org/wp-content/uploads/2022/11/103-Haptic-Signals-English.pdf
- Social Haptics — https://www.deafblindinformation.org.au/living-with-deafblindness/deafblind-communication/social-haptics/
- Haptics & Protactile — https://www.nationaldb.org/info-center/educational-practices/touch-signals/
- AADB FAQ — https://www.aadb.org/FAQ/faq_DeafBlindness.html
- *Beyond the fingertips* — https://pmc.ncbi.nlm.nih.gov/articles/PMC11877112/

**Vibrotactile limits**
- Kutner & Hadzidedic, *Vibration-based communication for deafblind people* — https://arxiv.org/pdf/2205.04802
- VibroMap — https://mschmitz.org/publications/elsayed-IMWUT20-vibromap.pdf
- 2PD of Vibrotactile Stimuli on the Forearm — https://dl.acm.org/doi/10.1145/3743721

**Hardware**
- Axiometa — https://www.axiometa.io/ · https://www.crowdsupply.com/axiometa/genesis-iot-discovery-lab
- ESP32 + arduinoFFT — https://www.makerguides.com/spectrum-analyzer-with-esp32-and-max4466/

**Modal & vision**
- **Ultralytics Modal quickstart** — https://docs.ultralytics.com/guides/modal-quickstart
- Modal cold starts — https://modal.com/blog/truly-serverless-gpus
- Modal pricing — https://www.usagepricing.com/blueprint/modal
- VisionAId (YOLO/depth FPS finding) — https://arxiv.org/html/2607.02371v1

**Competitive landscape**
- biped NOA — https://biped.ai/ · local-processing rationale: https://www.applevis.com/forum/assistive-technology/my-sightcity-impressions-about-noa-mobility-device-biped-ai
- Sunu Band — https://lowvisionmd.org/sunu-band-faqs/
- Soundscape open-sourcing — https://www.microsoft.com/en-us/research/product/soundscape/ · https://www.scottishtecharmy.org/soundscape · https://drwjf.github.io/vvt/index.html · https://www.guidedogs.org.uk/getting-support/information-and-advice/how-can-technology-help-me/apps/soundscape/

**Siren acoustics**
- https://www.blueprintfleet.com/drawingboard/loud-and-clear-the-science-and-strategy-behind-emergency-vehicle-sirens
- https://sirengenerator.com/sirens/yelp

**Ethics**
- "Nothing about us without us" in AT research — https://www.tandfonline.com/doi/full/10.1080/10400435.2022.2117524
