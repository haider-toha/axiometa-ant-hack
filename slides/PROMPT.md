## MISSION

You are orchestrating a team of sub-agents to build a **top-tier, award-calibre hackathon slide deck** for the Axiometa bus-stop situational-awareness prototype — a wrist-worn device for DeafBlind navigation. This is a 5-minute demo pitch with a live demo in the middle. The slides must be extraordinary: cinematic, minimal, technically grounded, and emotionally resonant.

You will work in six phases. Do not skip phases. Do not start building before research and planning are complete. No slop at any stage — visual or content.

**Typography red line:** Do not use monospace fonts anywhere. Not for labels, stats, callouts, GPIO names, dimensions, or "engineering" flavor. No `font-family: monospace`, no `ui-monospace`, no JetBrains Mono, no DM Mono, no IBM Plex Mono, no Geist Mono, no "technical mono" pairing. That look is peak AI slop. Use grotesque sans only. If `slides/reference/spec.md` or `type-scale.json` suggest mono labels, ignore that — pin ratios and frame counts still apply; typography does not copy iCoMat's mono.

---

## STEP 0 — READ ALL SKILLS FIRST

Before doing anything else, read every skill file listed below using the Read tool. They contain mandatory patterns, constraints, and technical approaches. You must read all of them:

```
/Users/haidertoha/Code/axiometa-ant-hack/.claude/skills/canvas-design/SKILL.md
/Users/haidertoha/Code/axiometa-ant-hack/.claude/skills/frontend-design/SKILL.md
/Users/haidertoha/Code/axiometa-ant-hack/.claude/skills/design-critique/SKILL.md
/Users/haidertoha/Code/axiometa-ant-hack/.claude/skills/scrollytelling/SKILL.md
/Users/haidertoha/Code/axiometa-ant-hack/.claude/skills/3d-spatial/SKILL.md
/Users/haidertoha/Code/axiometa-ant-hack/.claude/skills/scroll-animations/SKILL.md
/Users/haidertoha/Code/axiometa-ant-hack/.claude/skills/web-motion-design/SKILL.md
/Users/haidertoha/Code/axiometa-ant-hack/.claude/skills/gsap-awwwards-website/SKILL.md
/Users/haidertoha/Code/axiometa-ant-hack/.claude/skills/blender/SKILL.md
/Users/haidertoha/Code/axiometa-ant-hack/.claude/skills/3d-web-experience/SKILL.md
/Users/haidertoha/Code/axiometa-ant-hack/.claude/skills/r3f-best-practices/SKILL.md
/Users/haidertoha/Code/axiometa-ant-hack/.claude/skills/three-best-practices/SKILL.md
```

Also read these project context files:

```
/Users/haidertoha/Code/axiometa-ant-hack/plan/2026-07-18-bus-stop-situational-awareness.md
/Users/haidertoha/Code/axiometa-ant-hack/slides/reference/spec.md
/Users/haidertoha/Code/axiometa-ant-hack/slides/reference/catalog.md
/Users/haidertoha/Code/axiometa-ant-hack/slides/reference/harness/canvas-sequence.js
/Users/haidertoha/Code/axiometa-ant-hack/slides/reference/timing/pin-ratios.json
/Users/haidertoha/Code/axiometa-ant-hack/slides/reference/timing/scroll-frame-map.json
/Users/haidertoha/Code/axiometa-ant-hack/slides/reference/design/type-scale.json
/Users/haidertoha/Code/axiometa-ant-hack/slides/reference/network/chanel-frames.json
/Users/haidertoha/Code/axiometa-ant-hack/slides/reference/sites/summary.json
```

CAD models to be used for animation:
```
/Users/haidertoha/Code/axiometa-ant-hack/slides/models/v2_20mm_render_board_only.step
/Users/haidertoha/Code/axiometa-ant-hack/slides/models/v2_20mm_render_with_cage.step
/Users/haidertoha/Code/axiometa-ant-hack/slides/models/v2_20mm_render_without_cage.step
/Users/haidertoha/Code/axiometa-ant-hack/slides/models/v2_20mm_render_cage_only.step
/Users/haidertoha/Code/axiometa-ant-hack/slides/models/board-STP_MTX0013.step
/Users/haidertoha/Code/axiometa-ant-hack/slides/models/ToF-AX22-0015.step
/Users/haidertoha/Code/axiometa-ant-hack/slides/models/buzzer-1-AX22-0018.step
/Users/haidertoha/Code/axiometa-ant-hack/slides/models/mic-AX22-0009.step
```

### Local tooling (already installed — verify before Blender work)

Blender, Flue (CLI bridge so agents can drive Blender), and ffmpeg are already installed on this machine. Do **not** reinstall them unless a verify command fails. Before Sub-agent A starts rendering, run these checks:

```bash
# Blender binary
blender --version

# Flue CLI + live bridge (Blender GUI must be open with the Creative Adapter Bridge addon enabled)
flue version
flue test blender

# ffmpeg for image-sequence → video if needed
ffmpeg -version
which ffmpeg ffprobe
```

Expected: Blender **5.2.x**, Flue **1.0.x+**, `flue test blender` returns JSON with `"ok": true`, ffmpeg on PATH at `/opt/homebrew/bin/ffmpeg`.

If `flue test blender` fails:
1. Open Blender (`open -a Blender`).
2. Confirm Preferences → Add-ons → **Creative Adapter Bridge** is enabled (addon file lives at `~/Library/Application Support/Blender/5.2/scripts/addons/creative_adapter_bridge.py`).
3. Retry `flue test blender`. Session file should appear at `~/creative-adapters/blender.json`.

**STEP import note:** Blender cannot open `.step` natively. Convert STEP → glTF/STL first with the project venv (`build123d` / OCP already available at `.venv`), then import the mesh into Blender via Flue. Do not install FreeCAD unless conversion fails.

Flue skill docs after setup: `~/.claude/skills/flue/` (also mirrored under `~/.cursor/skills/flue/` and `~/.agents/skills/flue/`). Blender adapter notes: `adapters/blender/APP.md` inside those trees. Repo bootstrap skill: `.claude/skills/blender/SKILL.md`.

---

## PROJECT CONTEXT

### What we built

A wrist-worn navigation and situational-awareness device for DeafBlind people, built at a hackathon in roughly 1.5 days. Hardware: ESP32-S3-MINI-1 (Axiometa Genesis Mini board), two AX22-0018 passive buzzers, a VL53L0CX time-of-flight proximity sensor, and a PDM microphone. Software: a Next.js app on a phone for camera capture, a Modal endpoint running YOLO26n + Claude vision for bus detection and route reading, and a Vercel + Upstash Redis relay for outbound-only ESP32 polling.

Hardcoded route: **88 / Clapham Common**. This is intentional for the demo.

The buzzers could not be felt (tactile viability failed in bench testing), so the current demo uses two audio tones (2350 Hz and 3050 Hz) as audible proxies for what would be vibration channels in the final product.

### The narrative we are telling

The first friend's grandpa is DeafBlind. That is how this project started. Not a market research exercise, not a startup idea — a person, someone we know, who cannot safely catch a bus alone. That personal anchor must open the deck and never be forgotten.

We are three people. The presenting script should be split roughly equally across three voices.

### Why existing solutions fall short at a bus stop

Anticipate these audience questions by answering them in the problem slides before anyone asks:

- **Cane**: Essential, irreplaceable for orientation — but a cane cannot tell you which bus has just arrived, whether it is the 88 or the 22, or where the door is. The problem is information, not mobility.
- **Guide dog**: £50,000+ to train, multi-year wait list, cannot be scaled to every bus stop, cannot read a destination blind. A dog is a companion, not an information terminal.
- **Human interpreter**: £50–100/hour, requires advance booking, not available on demand at a bus stop at 7:42 AM. Freedom means not having to ask permission from a schedule.
- **Smartphone apps with GPS**: Arrival notifications exist but they rely on TfL's API which has no real-time visual confirmation of which bus physically stopped in front of you. A bus can skip a stop or a different service can use the same stop.

These are not weaknesses of those solutions — they are different tools solving different problems. Our device is the missing piece: **real-time, on-body confirmation that the right bus is here, right now, without any human intermediary.**

### The Modal / MODL argument

The architecture has a genuinely interesting split: YOLO26n on a Modal T4 GPU handles the temporal state (a bus arriving is a multi-second event, not a single frame — it needs debounce, hysteresis, and a fire-once latch). Claude handles the semantic reading of the destination blind. The key insight: **"Detection is when. Claude is what."** Claude is a stateless oracle; it cannot hold two seconds of detection history. Modal can. That is the architectural reason Modal is not decoration — it is the component that turns noisy per-frame detections into a single clean `BUS_ARRIVED` event. We also run three concurrent Claude vision calls for the destination reading and take a majority vote, which gives us a confidence measure the user can act on.

The stage line: *"These two tones simulate the two vibration channels the product would use. The supplied buzzers could be heard but not felt, so this prototype demonstrates sensing and pattern routing rather than tactile efficacy."*

Mandatory honesty constraint (do not remove from any slide): **"We have not validated this with DeafBlind users."** That sentence must appear somewhere in the deck.

### Three presenters, equal split

Draft a script for each slide. Mark each line `[P1]`, `[P2]`, or `[P3]` so the three presenters know who speaks when. P1 opens with the emotional hook and problem. P2 handles the solution and leads the demo. P3 covers the build, Modal architecture, and future vision.

---

## PHASE 1 — RESEARCH

Launch a research sub-agent. It must return hard numbers only — no estimates, no made-up statistics. Every number must have a source URL. If a number cannot be verified, mark it `[UNVERIFIED — do not use on slide]`.

Research targets:
1. UK population of DeafBlind people (Sense UK, RNIB, NHS estimates)
2. Global DeafBlind population estimates (WHO / Deafblind International)
3. Proportion who can travel independently (any published figures)
4. Average cost of a guide dog placement in the UK (Guide Dogs for the Blind Association)
5. Average hourly rate for a BSL/tactile communication interpreter in the UK
6. UK working-age DeafBlind employment statistics
7. Average daily public transport usage difficulty faced by people with combined sensory impairments (if published)
8. Any published data on bus stops as specific accessibility pain points

Output a `slides/research/facts.md` file with every finding, source URL, and a confidence rating (HIGH = official source, MEDIUM = reputable charity/news, LOW = anecdotal). Clearly mark which ones are slide-ready.

---

## PHASE 2 — NARRATIVE AND SCRIPT

Using the Phase 1 research, plan the exact slide count and narrative arc. Output `slides/narrative/outline.md`.

### Narrative arc constraints

The total presentation is 5 minutes. The live demo takes roughly 90 seconds. Slides must not fight the presenter — they serve as backdrop, not teleprompter. Plan for **10 slides maximum** (not counting the pure-black opening):

| # | Beat | Purpose | Presenter | Approx time |
|---|------|---------|-----------|-------------|
| 0 | Pure black screen | Emotional hook — darkness is the default | P1 | 15s |
| 1 | Personal story | Haider's friend's grandpa. One person. One name if possible. | P1 | 30s |
| 2 | The scale of the problem | Hard statistics — UK numbers, global numbers | P1 | 25s |
| 3 | Why current solutions fail | Cane / dog / interpreter — pre-empt the questions | P1/P2 | 30s |
| 4 | Our solution — the device | CAD explode animation, minimal callouts | P2 | 30s |
| 5 | How it works — system diagram | Modal + phone + ESP32 + buzzers — one clean diagram | P2 | 30s |
| — | DEMO | Live. P2 presents. | P2 | 90s |
| 6 | What you just saw | Timestamp the demo: 1.4s to first buzz, 3.8s to route number | P2 | 20s |
| 7 | How we built it — sensing | ToF, siren FFT, PDM mic — why each sensor | P3 | 30s |
| 8 | The Modal architecture | "Detection is when. Claude is what." | P3 | 30s |
| 9 | What we learned / future | Tactile failure acknowledged. Next: real LRA motors, user testing | P3 | 25s |
| 10 | Close | The device. The person. One sentence. | P3 | 15s |

Write a full script per slide with `[P1]`, `[P2]`, `[P3]` line markers. Keep each line under 15 words. No bullet points in the script — it should read like spoken word, not notes.

The script must:
- Never say "revolutionise", "seamless", "cutting-edge", "game-changing", "transform", "innovative solution", "leverage", "utilize", or any AI-generated filler phrase
- Use em dashes sparingly and only where they genuinely aid rhythm
- Reference the personal story (the grandpa) at least twice — at the start and the close
- Acknowledge the buzzer limitation honestly and without apology
- Credit Modal specifically by name and explain why it was the right architectural choice
- Include the mandatory "We have not validated with DeafBlind users" line somewhere natural

---

## PHASE 3 — DESIGN SYSTEM AND BUILD PLAN

Design a visual system and detailed build plan. Output `slides/design/system.md` and `slides/design/build-plan.md`.

`system.md` must include a **Typography — forbidden** subsection that lists every banned mono face and states that monospace anywhere is an automatic deck rejection.

### Visual system

**Palette** — three tones only:
- Background: `#0A0B0C` (near-black, from the Chanel/iCoMat scrape)
- Primary text / details: `#F2F4F5` (off-white)
- Muted / secondary: `#9AA3A8` (cool gray)
- Accent (use sparingly, one element per slide maximum): `#CFD9E0` (light steel)

No other colors. No gradients. No glow effects. No drop shadows. Flat, surgical, precise.

**Typography** — scale from `slides/reference/design/type-scale.json`; **font choices override the reference** (no mono anywhere):
- Scale: 12 / 14 / 18 / 28 / 48px
- Display role (48px): one grotesque face, single large numbers or one-word statements only
- Body + labels + callouts + stats (14/18px): **the same grotesque family** — weight and size do the hierarchy, not a second "tech" face
- Letter-spacing: small caps / labels `+0.04em` to `+0.08em` (luxury accent, Chanel-style); body `-0.01em`; display `-0.02em`
- **Banned — zero tolerance:** any monospace, `font-family: monospace`, `ui-monospace`, `SFMono-Regular`, or any file in `canvas-fonts/` whose name contains `Mono` (JetBrains Mono, DM Mono, IBM Plex Mono, Geist Mono, Red Hat Mono, etc.). Using mono for "engineering credibility" is automatic slop — reject the deck if it appears.
- **Also banned:** Inter, Roboto, Poppins, Montserrat, Raleway, system-ui defaults
- **Use instead:** one primary grotesque from `canvas-fonts/` (e.g. Instrument Sans, Work Sans, Outfit, Bricolage Grotesque) and optionally one display serif for a single accent if it earns its place (e.g. Instrument Serif) — never a mono companion
- Line height: 1.3 for display, 1.6 for body
- Labels that reference hardware (GPIO, AX22-0018, VL53L0X) still use the grotesque — smaller size, wider tracking, muted `#9AA3A8`; never switch to mono to signal "technical"

**CAD model aesthetic**:
The STEP files need to be rendered in Blender as image sequences. All materials must be monochromatic:
- Board/PCB surface: `#1A1A1A` (near-black matte)  
- Connector bodies: `#2D2D2D` (dark gray)
- Module housings: `#383838` (medium-dark gray)  
- Highlight edges / chamfers: `#9AA3A8` (the same cool gray as the type system)
- Background for renders: transparent (alpha channel), so they composite over `#0A0B0C`

Three-point lighting setup: key light from upper-left at 70% intensity (cool white, 6500K), fill from lower-right at 20% (very slightly warm to create contrast), rim from directly behind at 40% (the `#CFD9E0` accent color as light).

No texture maps. No HDRI environments that look like a product studio. Flat-lit geometry with edge highlights only. The renders should look like technical drawings that decided to have a soul.

**Animation system** — derived from `slides/reference/spec.md` hard numbers:
- Image sequence beats: 90 frames at ~30KB JPEG per beat
- Pin ratios: 5:1 for hero device explode, 4:1 for orbit/detail, 3:1 for system diagram
- Pacing: hold 15% of scroll at start of each beat (Chanel hold-then-burn pattern)
- Active burn density: ~4.2 px/frame during the active window
- Scroll feel: Lenis `duration: 1.2`, easing `t => Math.min(1, 1.001 - Math.pow(2, -10 * t))`
- Canvas harness: use `slides/reference/harness/canvas-sequence.js` as the direct implementation base

**No WebGL/Three.js for the main deck.** Canvas 2D image sequences (the Chanel technique) are the correct approach — they are deterministic, performant, and cannot lag mid-demo. Reserve Three.js for the interactive system diagram only if time permits.

### Build plan

Produce a numbered task list. Each task must name:
- What is being built
- Which files it produces
- Which skill(s) it draws on
- Any dependency on a prior task

Proposed output directory: `slides/deck/` — a single self-contained HTML page (`index.html`) with all assets in `slides/deck/frames/`, `slides/deck/fonts/`, `slides/deck/js/`.

---

## PHASE 4 — BUILD

Execute the build plan from Phase 3. Use sub-agents for parallelism where tasks are independent. Specifically:

### Sub-agent A — Blender rendering
Render image sequence frames for each CAD beat. Read the blender skill first. Re-run the **Local tooling** verify block from STEP 0 (`blender --version`, `flue test blender`, `ffmpeg -version`) before importing; keep Blender open while Flue drives it. Produce:
- `slides/deck/frames/explode/0001.jpg` … `0090.jpg` — board assembly explode (90 frames)
- `slides/deck/frames/orbit/0001.jpg` … `0080.jpg` — single-module orbit (80 frames)
- `slides/deck/frames/detail/0001.jpg` … `0060.jpg` — contact/sensor close-up (60 frames)
All frames: 1920×1080, JPEG q80, under 45KB each. Apply the monochromatic material system from Phase 3. Camera path is locked and linear — no handheld wobble, no bloom. Lighting exactly as specified above.

### Sub-agent B — HTML/CSS scaffold
Build the slide structure in `slides/deck/index.html`. Sections in DOM order matching the narrative outline. Canvas elements in place. Lenis and GSAP loaded from CDN. Typography loaded from local font files. Colors from the system. No framework — vanilla HTML/CSS/JS. The canvas harness from `slides/reference/harness/canvas-sequence.js` drops in as a module import.

### Sub-agent C — Animation wiring
Wire each canvas section to the harness using the numbers from the build plan. Implement Lenis scroll feel. Implement IntersectionObserver text reveals (500ms ease-out, trigger at 20% visibility). Implement the statistics counter animations (count-up on entry, using the real numbers from Phase 1 research). Implement slide transitions that feel deliberate, not cheap.

### Sub-agent D — Content and script integration
Drop the final approved script text from Phase 2 into the slide structure. Text must be presenter notes only — not on the visible slide surface. The visible slide surface gets: one number, or one short sentence, or the CAD animation, or the system diagram. Nothing more. No bullet point lists. No paragraph text on any slide.

---

## PHASE 5 — ADVERSARIAL REVIEW (run three agents in parallel)

Launch three sub-agents simultaneously. Each reviews the output of Phase 4 independently.

### Reviewer A — Narrative and fact integrity
Go through every visible claim, number, and statement in the deck. For each:
1. Is it sourced in `slides/research/facts.md`?
2. Is it grounded in the actual codebase as it exists today (read the plan and audit files)?
3. Is it making a claim the project has not validated (especially: tactile discrimination, DeafBlind user validation, spatial localization)?
4. Does the narrative arc answer the cane/dog/interpreter questions before the audience asks?
5. Does the script maintain three equal voices?
6. Is the mandatory "We have not validated with DeafBlind users" line present?

Output `slides/review/narrative-review.md` with a numbered list of issues, severity (BLOCKER / WARNING / SUGGESTION), and the specific line or slide.

### Reviewer B — Visual and animation quality
Go through every visual decision in the CSS, animation parameters, and render setup. Ask for each:
1. Does this look like a reference site from `slides/reference/catalog.md` (Portal Space, iCoMat, CrazyGL explode, Teenage Engineering) or does it look like a default template?
2. Are the pin ratios, frame counts, and burn densities exactly the numbers from `slides/reference/spec.md`?
3. Is the Lenis duration set to 1.2?
4. Are the canvas sequences preloading correctly (Image array, not dynamic src setting)?
5. Is every font decision justified by the type scale?
6. **Is monospace used anywhere?** If yes → **BLOCKER**. Grep CSS and HTML for `mono`, `Mono`, `monospace`, `ui-monospace`, and every banned face name.
7. Does the palette strictly contain only the four specified colors?
8. Do the CAD renders use the three-point lighting setup specified?
9. Is there anything that looks like it was generated by an AI rather than designed by a human?

Output `slides/review/visual-review.md` with the same format.

### Reviewer C — Anti-slop enforcement
Read every line of copy in the deck and every CSS/animation decision. Check for:

**Content slop** (flag every instance):
- Em dashes used decoratively rather than rhythmically
- Any of these words: revolutionary, seamless, cutting-edge, innovative, leverage, utilize, transform, game-changing, next-generation, breakthrough, state-of-the-art, robust, scalable, ecosystem, synergy, holistic, empower, journey, unlock, reimagine, disrupt
- Passive voice where active is clearer
- Sentences over 15 words in the presenter script
- Any bullet point list visible on a slide (they are banned)
- Vague statistics ("millions of people") where a specific number is available

**Visual slop** (flag every instance):
- **Monospace fonts in any form** — `font-family: monospace`, JetBrains/DM/IBM Plex/Geist/Red Hat Mono, "engineering mono" label pairs, tabular-nums as an excuse for mono. **Always BLOCKER.**
- Gradients (they are banned)
- Drop shadows (banned)
- Glow effects (banned)
- Card components with rounded corners and border (banned — this is a film, not a dashboard)
- Multiple accent colors on one slide
- Any animation that serves decoration rather than narrative
- Any section that looks like it could belong to a different project
- Fonts that are the same three fonts every AI picks (Inter, Poppins, Montserrat, Roboto, Raleway)

Output `slides/review/slop-review.md` with the same severity format.

---

## PHASE 6 — FIX AND FINAL REVIEW

Read all three review files from Phase 5. For every BLOCKER, fix it immediately. For every WARNING, fix it unless there is a documented reason not to. For every SUGGESTION, use judgment.

After fixes, run Reviewers A, B, and C again on the updated output. If any new BLOCKERs appear, fix those too. Repeat until all three reviews return only WARNINGs and SUGGESTIONs.

Output a final `slides/review/sign-off.md` that summarises:
- What was fixed in each pass
- What WARNINGs remain and why they were accepted
- The final slide count and total runtime estimate (at a spoken pace of 130 words/minute)
- One-line description of what makes this deck not replaceable by any other hackathon deck

---

## HARD CONSTRAINTS (non-negotiable at every phase)

1. **No slop.** Not in content, not visually. If it looks like it was generated by a default AI, it is slop. Reject it.
2. **No invented statistics.** Every number on a visible slide is from `slides/research/facts.md` with a source.
3. **No tactile claims.** The buzzers failed the bench test. The deck never claims the device is tactile or haptic.
4. **No DeafBlind user validation claims.** The device was never tested with DeafBlind users. This is stated honestly.
5. **The personal story is real.** A friend's grandpa. Not "a user." Not "someone we met." One specific person, referred to by relationship if not by name.
6. **The demo must be able to fail.** The deck structure must not depend on the demo succeeding. Slides 6–10 should be able to be presented immediately after slide 5 regardless of what happens in the demo.
7. **No monospace fonts — ever.** Not for labels, stats, dimensions, GPIO names, or "product spec" callouts. No `monospace`, no `ui-monospace`, no font file with `Mono` in the name from `canvas-fonts/`. One grotesque family handles everything; hierarchy comes from size, weight, tracking, and color — not a fake "developer" typeface. Mono on a slide deck is peak AI slop. If it appears in a draft, delete it before anything else.
8. **No Inter, Roboto, Poppins, Montserrat, or Raleway.** Default AI sans picks. Use non-mono faces from `canvas-fonts/` only.
9. **Colors: four only.** `#0A0B0C`, `#F2F4F5`, `#9AA3A8`, `#CFD9E0`. No exceptions.
10. **Slide 0 is pure black.** The presenter speaks over it. There is nothing on screen. That is the point.
11. **The deck is a single self-contained HTML file** with local assets. It must work offline, in a venue, on a borrowed laptop, without internet.
12. **`slides/reference/` is the spec for motion and layout, not typography.** Pin ratios, frame counts, and timing numbers are mandatory. **Ignore** any reference to mono labels in `spec.md`, `type-scale.json`, or iCoMat scrape notes — steal their pacing and palette, not their mono type.
13. **Every skill must be actively used.** Not mentioned — actually used. Before each major decision (animation approach, 3D rendering, scroll mechanics, typography, design critique), cite which skill you drew from and how. If a skill recommends mono for "technical" UI, override it for this deck.

---

## OUTPUT STRUCTURE

```
slides/
  research/
    facts.md            ← Phase 1 output
  narrative/
    outline.md          ← Phase 2 output
    script.md           ← Phase 2 full speaker script with [P1]/[P2]/[P3] marks
  design/
    system.md           ← Phase 3 design system
    build-plan.md       ← Phase 3 numbered task list
  deck/
    index.html          ← the deck itself
    frames/
      explode/          ← 90 Blender renders
      orbit/            ← 80 Blender renders
      detail/           ← 60 Blender renders
    fonts/              ← local font files from canvas-fonts/
    js/
      canvas-sequence.js
      main.js
  review/
    narrative-review.md
    visual-review.md
    slop-review.md
    sign-off.md
```

---

## WHAT GOOD LOOKS LIKE

The gold standard is the Chanel J12 Savoir-Faire page (JPEG canvas sequences, hold-then-burn pacing, precision typography, luxury restraint), the iCoMat page (**pin 5:1 and cool-gray CAD palette only — do not copy their mono type**), and Teenage Engineering Pocket Operators callout language (lowercase technical labels, ALLCAPS port names, hairline grotesque — **still no monospace**). If the deck does not make someone who has never heard of the project stop and look, it is not done.

The deck is done when a judge who has seen forty hackathon presentations in a day sees something they have not seen before — not because of tricks, but because everything is precise, grounded, and honest about what was built and what was not.