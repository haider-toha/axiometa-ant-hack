# Build plan

Output root: `slides/deck/`. Single self-contained page, local assets, **works offline on a
borrowed venue laptop with no network**.

```
slides/deck/
  index.html            single page, all sections in DOM order
  fonts/                InstrumentSans-{Regular,Bold}.ttf, InstrumentSerif-Regular.ttf
  frames/
    explode/0001.jpg … 0090.jpg
    orbit/0001.jpg   … 0080.jpg
    detail/0001.jpg  … 0060.jpg
  js/
    canvas-sequence.js  from slides/reference/harness/, adapted
    lenis.min.js        vendored — NO CDN
    main.js             nav, reveals, count-ups, wiring
  css/deck.css
```

**No CDN.** `spec.md` and the brief both assume CDN Lenis; hard constraint 11 says the deck
must work offline. Vendoring wins — a deck that needs wifi at a hackathon venue is a deck
that fails. GSAP is **not used**: the only things it would provide here are scrub and pin,
and the harness already implements both with a 0.12 lerp that `spec.md` calls equivalent.
Shipping 23 KB of GSAP to duplicate working code is not justified.

---

## Tasks

### T1 — Font vendoring · no dependency
Copy `InstrumentSans-Regular.ttf`, `InstrumentSans-Bold.ttf`, `InstrumentSerif-Regular.ttf`
from `.claude/skills/canvas-design/canvas-fonts/` → `slides/deck/fonts/`. Copy the matching
`-OFL.txt` licences alongside.
**Produces:** `slides/deck/fonts/*`
**Skill:** canvas-design (font source), frontend-design (pairing rationale)
**Gate:** no filename in `fonts/` contains `Mono`.

### T2 — HTML/CSS scaffold · depends T1
Eleven sections in DOM order matching `narrative/outline.md`. Tokens from `design/system.md`.
Canvas elements in place for slides 4, 7. Sticky wrappers sized to the pin ratios.
**Produces:** `slides/deck/index.html`, `slides/deck/css/deck.css`
**Skills:** frontend-design, scrollytelling (sticky-within-section, `100svh`), design-critique
**Gate:** anti-slop checklist in `system.md` returns all-no.

### T3 — Harness adaptation · depends T2
Copy `reference/harness/canvas-sequence.js` → `deck/js/`. Keep `SPEC` verbatim. Add: an
`onProgress` hook for callout reveals, and a reduced-motion path that paints the final frame
and skips the scroll listener.
**Produces:** `slides/deck/js/canvas-sequence.js`
**Skills:** scrollytelling, scroll-animations
**Gate:** `Image[]` preload retained; `img.src` never assigned in a scroll handler.

### T4 — Navigation · depends T3
Vendored Lenis at `duration: 1.2` with the spec easing. Key bindings per `system.md`.
`0`–`9` jump to slide roots. Reduced-motion disables Lenis and falls back to native scroll.
**Produces:** `slides/deck/js/main.js` (nav section), `slides/deck/js/lenis.min.js`
**Skills:** scroll-animations, web-motion-design
**Gate:** pressing `6` from any scroll position lands exactly on slide 6.

### T5 — Blender renders · **in flight, no dependency** ⟵ critical path
90 explode + 80 orbit + 60 detail, 1920×1080, JPEG, ≤45 KB each.
**Produces:** `slides/deck/frames/{explode,orbit,detail}/*.jpg`
**Skills:** blender, 3d-spatial (eased F-curves, staging), flue
**Gate:** measured max frame size < 45 KB; frame counts exactly 90/80/60.

### T6 — Reveals and count-ups · depends T2, T4
IntersectionObserver at 20 % visibility, 500 ms `cubic-bezier(0,0,0.2,1)`. Ledger rows
stagger 80 ms. Count-ups 900 ms ease-out, final values from `research/facts.md`.
**Produces:** `slides/deck/js/main.js` (reveal section)
**Skills:** scroll-animations, web-motion-design
**Gate:** every animated value traces to `facts.md` or the plan.

### T7 — System diagram · depends T2
Slide 5. Five nodes, four edges, inline SVG, `--muted` strokes with one `--accent` edge.
Edges draw on via `stroke-dashoffset`. Phone → Modal → relay → device, plus the local
sensing loop that bypasses the network.
**Produces:** `index.html` slide-5 section
**Skills:** frontend-design, canvas-design (systematic reference markers)
**Gate:** no gradient, no shadow, no rounded card; one accent element only.

### T8 — Content integration · depends T2, and `research/facts.md`
Visible surfaces only, per the outline's table. Presenter script goes into `<script
type="text/plain" id="notes-N">` blocks or HTML comments — **never rendered**.
**Produces:** `index.html` text content
**Skills:** frontend-design (writing section)
**Gate:** no bullet list, no paragraph, no figure lacking a source.

### T9 — Frame wiring · depends T3, T5
Bind explode (90 / pin 5 / holds 4,2) and orbit (80 / pin 4 / holds 8,4) to the harness.
Detail (60 / pin 3) is wired only if a slide earns it — see open question below.
**Produces:** `slides/deck/js/main.js` (sequence section)
**Gate:** pin ratios and frame counts match `system.md` exactly.

### T10 — Offline verification · depends all
Serve from `file://` and from a local server with the network disabled. Confirm fonts load,
all 230 frames load, no request leaves the machine.
**Gate:** DevTools Network shows zero external requests.

### T11 — Adversarial review · depends T10
Reviewers A / B / C in parallel → `slides/review/{narrative,visual,slop}-review.md`.

### T12 — Fix and re-review · depends T11
All BLOCKERs fixed, re-run A/B/C, then `slides/review/sign-off.md`.

---

## Open question — the `detail` sequence

`spec.md` budgets four beats; the narrative has **two** slides that carry CAD (4 explode,
7 orbit). The 60-frame detail sequence is being rendered but has no assigned slide.

Options, in preference order:

1. **Use it inside slide 7** as a second beat after the orbit — sensing gets orbit *then*
   contact close-up. Costs 3:1 of extra runway and one more click. Preferred.
2. **Hold it as a spare.** If slide 4's explode reads weakly on the projector, swap it in.
3. **Drop it.** Renders cost nothing to leave unused.

Decide after T5 lands and the frames can actually be looked at. **Do not** invent a slide to
justify the sequence — that is the tail wagging the deck.

---

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Blender renders slip | medium | Critical path, started first. Deck degrades to type-only slides 4/7 and still presents. |
| A statistic fails verification | **high** | Script marks every figure in `«guillemets»`. Unverified → line is cut, not guessed. Slide 2 survives on one figure. |
| Venue projector is not 16:9 | medium | Type scales off `--u`; margins 8vw/10vh; nothing near an edge. |
| Reduced motion on borrowed laptop | low | Explicit path — final frames, instant reveals, deck fully presentable. |
| 230 frames slow to preload | low | ~7 MB total at 30 KB. Preload on load, not on scroll. Show nothing until beat 1 is ready. |
| Demo fails | **planned for** | Slides 6–10 independent by construction; `0`–`9` recovery; 14-word contingency line scripted. |

## Verification

```bash
# no monospace anywhere — must return nothing
grep -rniE "mono|monospace|ui-monospace|SFMono|JetBrains|Consolas|Menlo|Courier" \
  slides/deck/ --include=*.html --include=*.css --include=*.js
ls slides/deck/fonts/ | grep -i mono

# no banned sans — must return nothing
grep -rniE "Inter|Roboto|Poppins|Montserrat|Raleway|system-ui|-apple-system" slides/deck/

# palette — every hex must be one of the four (plus render-internal greys)
grep -roiE "#[0-9a-f]{3,8}" slides/deck/ --include=*.css --include=*.html | sort -u

# banned effects — must return nothing
grep -rniE "gradient|box-shadow|text-shadow|filter:\s*blur|border-radius" slides/deck/

# frame counts
for d in explode:90 orbit:80 detail:60; do
  n=${d%%:*}; want=${d##*:}
  got=$(ls slides/deck/frames/$n/*.jpg 2>/dev/null | wc -l | tr -d ' ')
  echo "$n: $got (want $want)"
done

# frame budget — must print nothing over 45k
find slides/deck/frames -name '*.jpg' -size +45k
```
