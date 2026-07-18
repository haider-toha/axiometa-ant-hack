# Axiometa scroll-deck spec (evidence-backed)

Scraped 2026-07-18 in Cursor browser (~625×1266, dpr 1). Numbers below are measured, not vibes. Use this file + JSONs in `/reference` as the brief for Fable/Claude. Do **not** invent frame counts, pin ratios, or type sizes.

**Wide reference set:** see [`catalog.md`](./catalog.md) (aerospace/CAD, electronics callouts, demos, type). Tier-2 patterns in `tier2/`.

## Verdict: what to copy

| Need | Source | Number |
|------|--------|--------|
| Technique | Chanel J12 | Canvas 2D + preloaded image sequence |
| Frames / beat | Chanel seq2–4 | **80–100** (use **90**) |
| Per-frame budget | Chanel avg | **~29 KB** (target JPEG q80 / AVIF ≤ 45 KB) |
| Payload / beat | Chanel | **2.0–3.3 MB** |
| Pin ratio (hero) | iCoMat accordion | **5:1** exactly |
| Pin ratio (detail) | Chanel slideshow | **4:1** |
| Active scrub density | Chanel drawImage log | **~4.2 px / frame** during burn |
| Hold-then-burn | Chanel seq3 | Hold frame 0 for **~0.73 vh**, then burn 100 frames in **~0.33 vh** |
| Gap between sequences | Chanel seq3→4 | **~1.85 vh** of copy/space |
| Page length | Apple / AVATR / iCoMat | **16–21** viewports total |
| Type (engineering) | iCoMat | Mono 12.7 / 14 / 15 + display 23 / 40 / 45 |
| Tracking (luxury accent) | Chanel display | **0.7–1.8 px** letter-spacing on titles |

## What failed / changed

- **Apple AirPods Pro 3** is no longer a JPEG canvas sequence. It is scroll-scrubbed **video** via `data-inline-media` with play keyframes `{ start: "t - 65vh", end: "b - 25vh" }` and start/end stills (~9–17 KB). Still useful for **scrub window** and **multi-beat chaining**, not for frame assets.
- **Ray-Ban Meta** returned Akamai **Access Denied**. Use **AVATR Vision** pin ratios (3 / 4 / 6 / 7) for camera-move section lengths.
- **Chizzy `/3/`** is a Readymag tips page (0 canvases) — ignore prior “99-perf universe scrub” claim for that URL.

## Executable brief (hard-code this)

### Stack
- Canvas 2D image sequence (not Three.js, not WebGL) — copyable; see Chanel.
- Sticky-within-section (not `position: fixed` on the whole page).
- Preload `Image()` into an array; `drawImage(images[i])` only — never set `img.src` in the scroll handler.
- Lenis `duration: 1.2` for scroll feel (Apple/Chanel don’t expose GSAP; Lenis is the cheap “expensive” factor).
- Optional GSAP ScrollTrigger `scrub: 1` — harness uses lerp `0.12` as equivalent.

### Beats (map to `data/parts`)

Render your own frames from STEP/CAT via Blender (or fal.ai for environment plates only — not the CAD metal).

| Beat | Part idea | Frames | Pin | Holds | Notes |
|------|-----------|--------|-----|-------|-------|
| 1 Hero explode | Genesis Mini assembly | 90 | 5 | start 4 / end 2 | Lifestyle still → technical explode |
| 2 Orbit | One hero module (e.g. IPS LCD / NeoPixel) | 80 | 4 | start 8 / end 4 | Chanel hold-then-burn |
| 3 Detail zoom | Fastener / pin / contact | 60 | 3 | none | Short, dense |
| 4 Spec hold | Dimensions overlay | 1 still | 1.5 | — | Typography only; no sequence |

Total scroll runway ≈ `5+4+3+1.5 = 13.5 vh` of pinned content + ~2 vh gaps ≈ **16 vh** page (matches Chanel 16.15).

### Frame production
- Resolution: **1600×1200** (Chanel mobile seq) or **1920×1080**; serve 2× only if needed.
- Naming: `frames/{beat}/{0001}.jpg` with `padStart(4,'0')`.
- Compression: JPEG q80 or AVIF; aim **≤ 45 KB**, prefer **~30 KB**.
- Camera: locked path, linear frames; lighting can drift slowly across the sequence (Chanel ceramic trick).

### Pacing recipe (from `timing/scroll-frame-map.json`)
For a 90-frame beat at pin 5 (scroll distance ≈ `4 × vh` while sticky):
- 0–15% scroll: hold near frame 0–4
- 15–92% scroll: linear burn frames
- 92–100%: hold end frames

Active density target: **~4 px per frame** at mobile width during the burn (scale with viewport: `pxPerFrame ≈ (pinRatio - 1) * vh * 0.7 / frames`).

### Type
From iCoMat + Chanel harvest (`design/type-scale.json`):

```
12 / 14 / 18 / 28 / 48 px
mono labels: +0.02em
body: -0.01em
display: -0.02em
hero accent only: +0.04em
ink #F2F4F5 on #0A0B0C, muted #9AA3A8, accent #CFD9E0
```

No Inter/Roboto/Arial. Prefer a grotesque + a mono (iCoMat pattern).

### Do not
- Fade between frames (causes smear).
- Put stats/cards in the hero viewport.
- Scrape and redistribute Apple/Chanel/Ray-Ban bitmaps — **copy the numbers**, render your own CAD.
- Use WebGL unless you need true interactivity; demo should be deterministic.

## Artifact index

```
reference/
  spec.md                          ← this file
  network/airpods-frames.json      ← video-scrub model + still budgets
  network/chanel-frames.json       ← real sequence counts / KB / canvas buffers
  timing/scroll-frame-map.json     ← scrollY → frame tables + fableBrief
  timing/pin-ratios.json           ← sticky parent/child ratios across sites
  design/type-scale.json           ← frequency-ranked type systems
  sites/summary.json               ← what worked / blocked
  harness/canvas-sequence.js       ← drop-in multi-beat harness
```

## Hand-off one-liner for Fable

> Build a sticky canvas image-sequence deck: 90 frames/beat @ ~30KB JPEG, pin 5:1 then 4:1 then 3:1, hold-then-burn pacing (~4.2 px/frame active), Lenis 1.2, type 12/14/18/28/48 with mono labels, dark #0A0B0C. Preload Image array. Frames from our STEP parts in `data/parts/*`. Numbers from `/reference` — do not invent.
