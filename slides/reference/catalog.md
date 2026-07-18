# Reference catalog for Claude / Fable

Wide set of live references for an Axiometa Genesis Mini scroll deck (CAD modules → tasteful product storytelling).  
**Tier-1** = measured scrapes in `network/`, `timing/`, `design/`.  
**This catalog** = broader universe + what to steal from each. Prefer numbers over vibes.

---

## How to use this with Claude

1. Read `spec.md` first (hard numbers).
2. Pick 3–5 sites from the relevant lane below for the beat you’re building.
3. Open the linked scrape JSON when present; otherwise use the “steal” line only.
4. Never ask Claude to copy Apple/Chanel bitmaps — copy pacing, pin ratios, callout language, type scales.

---

## Lane A — CAD / aerospace / defense (highest relevance)

| Rank | Site | Technique | CAD? | Steal | Evidence |
|------|------|-----------|------|-------|----------|
| 1 | [Portal Space Systems](https://www.portalsystems.space/) | WebGL + **GSAP ScrollTrigger + Lenis** | High — solar-thermal spacecraft, 3D-printed HEX thruster | Step-by-step subsystem chapters; pin **3:1 / 2.1:1**; engineering stats as H3 | Scraped: 2× WebGL canvas 625×1266; stack `gsap+ScrollTrigger+lenis`; ~11.7 vh |
| 2 | [iCoMat](https://www.icomat.co.uk/) | WebGL + Lottie + video | High — composites / fiber steering | **Pin 5:1** accordion; mono+grotesque type | Tier-1 `pin-ratios.json`, `type-scale.json` |
| 3 | [EnduroSat](https://endurosat.com/) | WebGL scroll + **CAD downloads** | High — CubeSat / satellite buses | Public CAD-adjacent assets; satellite subsystem storytelling | Agent-ranked must-scrape |
| 4 | [Joby Experience](https://www.jobyaviation.com/experience) | Image-sequence scrollytelling | High — eVTOL flight journey | Flight-path narrative beats | Agent-ranked #1 aerospace |
| 5 | [Joby Technology](https://www.jobyaviation.com/technology) | Sticky canvas flythrough | High — engineering diagrams | Tech diagrams beside scroll 3D | Pair with Experience |
| 6 | [ThinKom Special Mission](https://www.thinkom.com/special-mission) | Scroll-scrub exploded antenna | High — RF/antenna layers | Exploded antenna = closest to module explode | Agent shortlist |
| 7 | [LGM Aviation](https://lgmaviation.com/) | Public frame-sequence deck | Medium-High | Open image-sequence aviation deck | Agent shortlist |
| 8 | [Hanwha Aerospace Showroom](https://www.hanwhaaerospace.com/eng/showroom.do) | WebGL 360 + hotspots | High — defense assemblies | Hotspot callouts on assemblies | Agent must-scrape |
| 9 | [ExplodeView](https://explodeview.com/) | STEP → interactive explode/BOM | **Highest CAD toolfit** | Pipeline: STEP → explode → BOM labels | Agent-ranked |
| 10 | [Rolls-Royce Discover Engines](https://discoverengines.rolls-royce.com/) | Interactive 3D engine | High | Turbomachinery cutaway vocabulary | Live explorer |
| 11 | [AVATR Vision](https://vision.avatr.com/) | Sticky + video camera moves | Medium | Pin ladder **7 / 6 / 4 / 3** | Tier-1 pins |
| 12 | [Milrem THeMIS](https://milremrobotics.com/themis-family/) | UGV product scroll | High | Numbered platform family | Prefer /themis-family over home |
| 13 | [OMEGA Clearspace](https://www.omegawatches.com/clearspace) | Three.js wireframe scroll | Medium — space debris capture | Wireframe technical aesthetic | Agent must-scrape |
| 14 | [Figure](https://figure.ai/) | Video-led humanoid | Medium | Type: machina + Haas Grot | Scraped |
| 15 | [Skydio X10](https://www.skydio.com/x10) | Sticky UAV chapters | High | Drone sensor chaptering | Agent shortlist |
| 16 | [Archer Aircraft](https://www.archer.com/aircraft) | Canvas sticky eVTOL | High | Competing eVTOL page structure | Agent shortlist |
| 17 | [Boom Symphony](https://boomsupersonic.com/symphony) | Sticky engine story | High | Engine product narrative | Agent shortlist |
| 18 | [Relativity Terran R](https://www.relativityspace.com/terran-r) | Long-scroll rocket architecture | High | Stage/architecture chapters | Agent shortlist |
| 19 | [Meta Glasses Tech 101](https://www.meta.com/ai-glasses/glasses-technology-101/) | Hardware subsystem callouts | Medium | Ray-Ban substitute for glasses explode | Agent shortlist |
| 20 | [Radian EXR](https://www.rideradian.com/exr) | Sticky + hotspots | High — EV pack swap teardown | Prefer over AVATR for *engineering* EV teardown | [CAD agent](6e4df0ad-cbea-44fe-bc18-bdf8fbfa861b) |
| 21 | [Digantara Mission](https://www.digantara.co.in/mission) | Three.js + GSAP collision scroll | High — SSA | Physics-feeling consequence beats | CAD agent |
| 22 | [Virgin Galactic Experience](https://www.virgingalactic.com/experience) | WebGL cinematic journey | Medium | Multi-scene pin+clip; hotspots on 3D | [Aerospace agent](3c7f235e-9ac6-451a-bfa7-e987b2c4f500) |
| 23 | [Chanel J12 Savoir-Faire](https://www.chanel.com/us/watches/j12-savoir-faire/) | Manufacturing chapters | Medium-High | Ceramic process / part-count overlays (not lifestyle J12) | CAD agent |
| 24 | Case: [Portal by O0](https://www.ozero.design/works/portal) | Case study | — | NASA-grade renders + WebGL workflow | Writeup |

**Dead / skip:** lilium.com (down), nasaspacecraft.com (dead), Virgin Galactic `/spaceships` & `/spaceport` (404). Use `/experience` only.

---

## Lane B — Electronics / modules / callouts (kit language)

| Rank | Site | Technique | Steal for Genesis Mini modules |
|------|------|-----------|--------------------------------|
| 1 | [Teenage Engineering — Pocket Operators](https://teenage.engineering/products/po) | Static annotated PCB (gold standard for callouts) | Label style: `silabs efm 32 gecko mcu`, `JTAG PROGRAMMING PORT`, `3.5 MM AUDIO OUT` — lowercase technical + ALLCAPS ports; type `te-20` ~8–11px hairline |
| 2 | [CrazyGL — Exploded View](https://crazygl.com/hero/product-exploded-view) | Three.js GLB explode | Knobs: explodeAmount **2.6**, holdExploded **3.8s**, assembleDuration **1.8s**, cameraDistance **6**; sample GLB **2.5 MB**; HDRI **247 KB** |
| 3 | [CrazyGL — Scroll Assemble](https://crazygl.com/hero/scroll-assemble-product) | Scroll → parts click together | Map scroll progress → assembly fraction (same idea as frame index) |
| 4 | [Framework Laptop 13](https://frame.work/laptop13) | Modular cards / repairability | Expansion-card chapters = your `data/parts/*` beats |
| 5 | [Apple Vision Pro](https://www.apple.com/apple-vision-pro/) | Apple product scroll | Multi-beat product storytelling (often video now) |
| 6 | [Nothing Phone](https://nothing.tech/products/phone-3) | Glyph / transparent electronics | LED matrix language → NeoPixel beat |
| 7 | [NuPhy Field75](https://nuphy.com/products/nuphy-field75-he-v2-1) | Switch cutaways | Component diagram density |
| 8 | [Steam Deck OLED](https://www.steamdeck.com/en/oled) | Handheld feature walkthrough | Spec strips without card spam |
| 9 | [DJI Mini 4 Pro](https://www.dji.com/mini-4-pro) | Feature-chapter scroll | Section pacing for sensors |
| 10 | [Fairphone — The One That Lasts](https://www.fairphone.com/the-one-that-lasts) | Modularity as product | Named swappable SKUs / spare-part cards | [Hardware agent](06317a1c-24a7-4caa-95b6-10f245bede66) |
| 11 | [Codrops folding cardboard](https://tympanus.net/Tutorials/OnScrollFoldingCardboardBox/) | Three.js + GSAP box unfold | Kit unboxing → tray reveal framing | Hardware agent |

---

## Lane C — Canonical image-sequence (implementation)

| Rank | Site / demo | Numbers | Steal |
|------|-------------|---------|-------|
| 1 | [Chanel J12](https://www.chanel.com/us/watches/the-j12-watch/) | 80–100 frames, ~29 KB, pin 4:1, **~4.2 px/frame** burn | Tier-1 `scroll-frame-map.json` |
| 2 | [CSS-Tricks AirPods](https://css-tricks.com/lets-make-one-of-those-fancy-scrolling-animations-used-on-apple-product-pages/) | Legacy **148** frames, **500vh**, padStart(4) | Preload `Image[]` gotcha |
| 3 | [GSAP imageSequenceScrub](https://gsap.com/docs/v3/HelperFunctions/helpers/imageSequenceScrub) | Official helper | `scrub` + `pin` |
| 4 | [Trionn / Codrops](https://tympanus.net/codrops/2026/07/15/the-architecture-behind-trionn-coordinating-gsap-three-js-lenis-and-web-audio/) | **371** WebP frames; Lenis on `gsap.ticker` | Stack sync |
| 5 | [scroll-hero Next](https://github.com/waseemnasir2k26/scroll-hero) | **280** frames, `500vh`, 1920×1080, scrub 1s | Config defaults |
| 6 | [Basement scrollytelling](https://scrollytelling.basement.studio/) | React `ImageSequenceCanvas` | Component API |
| 7 | [Canvas Scroll Clip](https://www.cssscript.com/image-sequence-animation-canvas-clip/) | frameCount **140**, scrollArea **2000px** | Compact pin |

Apple AirPods Pro **3** today = video scrub (`t-65vh → b-25vh`), not JPEG sequence — see `network/airpods-frames.json`.

---

## Lane D — Dark industrial / type systems

| Site | Steal |
|------|-------|
| [iCoMat](https://www.icomat.co.uk/) | LayGrotesk + AkkuratMono; cool gray `#CFD9E0` |
| [Figure](https://figure.ai/) | Machina display + Haas Grot text; tight negative tracking |
| [Lightmatter](https://lightmatter.co/) | Photonics dark UI |
| [Ayar Labs](https://ayarlabs.com/) | Semiconductor restraint |
| [The New Industrials](https://thenewindustrials.com/) | Editorial industrial |
| [Chanel J12](https://www.chanel.com/us/watches/the-j12-watch/) | Display tracking **0.7–1.8px** (luxury accent only) |
| [Portal Space](https://www.portalsystems.space/) | Uses Inter (do **not** copy font — copy chapter structure) |

Recommended Axiometa scale remains: **12 / 14 / 18 / 28 / 48** (`design/type-scale.json`).

---

## Lane E — Indexes (browse, don’t cite blindly)

- https://scrollytelling.ai/examples/
- https://godly.website/?animation=%5B%22scrolling-animation%22%5D
- https://www.awwwards.com/websites/locomotive-scroll/
- https://metabole.studio/en/blog/scrollytelling
- https://lenis.dev

---

## Suggested beat → reference mapping (Genesis Mini)

| Deck beat | Primary refs | Why |
|-----------|--------------|-----|
| Hero assembly explode | CrazyGL explode + Chanel pacing + iCoMat pin 5 | Explode knobs + hold-then-burn + runway |
| Module orbit (LCD / NeoPixel / encoder) | TE Pocket Operators + Framework | Callout language for real parts |
| Aerospace aspiration cutaway | Portal Space + AVATR pins | Engineering chapter tone |
| Spec / dimensions hold | Apple type scale + Chanel tracking | Quiet, considered type |
| Scroll feel | Lenis 1.2 + GSAP scrub 1 / harness lerp 0.12 | Measured stacks |

Parts live in `data/parts/*` (dht11, ips-lcd-0-96, ir-transceiver, neopixel-matrix-5x5, rotary-encoder, tactile-led-button, passive-buzzer, vibration-motor-erm, …).

---

## Blocked / dead ends (don’t waste Claude’s context)

| URL | Status |
|-----|--------|
| ray-ban.com … meta-ray-ban-display | Akamai Access Denied |
| chizzy.singula.team/3/ | Readymag tips — not universe scrub |
| iyO on narrow mobile | Orientation gate; WebGL not usable in scrape panel |

---

## File map

```
reference/
  catalog.md                 ← this file (wide set)
  spec.md                    ← hard executable numbers
  network/                   ← tier-1 network evidence
  timing/                    ← scroll maps + pin ratios
  design/type-scale.json
  harness/canvas-sequence.js
  sites/
    summary.json             ← tier-1 scrape summary
    scrapes/                 ← new site scrape JSONs
  tier2/
    patterns.md              ← implementation patterns
    demos.md                 ← open demos with numbers
```
