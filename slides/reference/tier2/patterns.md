# Tier-2 implementation patterns

Complement to tier-1 measured scrapes. Steal patterns + published numbers.

## Sticky / pin

| Source | Pattern |
|--------|---------|
| iCoMat (tier-1) | Accordion sticky **5:1** |
| Chanel (tier-1) | Slideshow sticky **4:1** |
| AVATR (tier-1) | Ladder **7 / 6 / 4 / 3** |
| Portal (scraped) | Intro sticky **3:1**, wrapper **2.1:1** |
| Playbook scroll-experience | Pin ≤ ~2000px / scene; total pinned ≤ ~6000px |

## Image sequence

| Source | Numbers |
|--------|---------|
| CSS-Tricks AirPods (legacy) | 148 frames, 500vh, padStart(4) |
| Chanel J12 (tier-1) | 80–100 / beat, ~29 KB, ~4.2 px/frame active |
| Trionn Codrops | 371 WebP |
| scroll-hero Next | 280 frames, 500vh, 1920×1080, scrub 1s |
| Canvas Scroll Clip | 140 frames, scrollArea 2000px |
| GSAP helper | `end: "+=1000"`, scrub, pin |

## Video scrub

| Source | Pattern |
|--------|---------|
| AirPods Pro 3 (tier-1) | `play: { start: "t - 65vh", end: "b - 25vh" }` |
| AVATR | Per-section mp4 ~1.6–2.3 MB |

## Stacks

| Stack | Where seen |
|-------|------------|
| GSAP + ScrollTrigger + Lenis | Portal Space (confirmed) |
| Lenis on `gsap.ticker` | Trionn Codrops |
| Three + GLTFLoader | CrazyGL explode |
| Lottie | iCoMat |
| Apple inline-media | AirPods (proprietary) |

## Type — dark industrial

See `design/type-scale.json` + Lane D in `catalog.md`.
