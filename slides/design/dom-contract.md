# DOM contract

Binding on both build agents. **Markup agent owns** `index.html` + `css/`.
**JS agent owns** `js/`. Neither edits the other's files. This file is the interface.

## Slide roots

Eleven sections, DOM order = narrative order. Every one:

```html
<section id="slide-N" class="slide" data-slide="N" aria-label="…">
```

`N` = 0…10. `js/main.js` builds its navigation index from
`document.querySelectorAll('.slide')` and jumps via `#slide-N`. Nothing else may carry the
`.slide` class.

## Canvas sequence sections (slides 4 and 7)

Exact nesting — the harness derives the sticky element from `canvas.parentElement`:

```html
<section id="slide-4" class="slide slide--seq" data-slide="4"
         data-seq="explode" data-frames="90" data-pin="5"
         data-hold-start="4" data-hold-end="2">
  <div class="seq-sticky">
    <canvas class="seq-canvas"></canvas>
    <div class="seq-overlay"><!-- callouts --></div>
  </div>
</section>
```

Slide 7: `data-seq="orbit" data-frames="80" data-pin="4" data-hold-start="8" data-hold-end="4"`.

- The harness sets `section.style.height = pin * 100vh` and makes `.seq-sticky`
  `position:sticky; top:0; height:100vh; display:grid; place-items:center`.
  **CSS must not fight those** — do not set height, position, or display on
  `.slide--seq` or `.seq-sticky`.
- `.seq-overlay` must be `position:absolute; inset:0; pointer-events:none` so it sits over
  the centred canvas without being grid-placed away from it.
- Frame paths: `frames/{seq}/{0001}.jpg`, `padStart(4,'0')`, 1-based.

## Reveals

Any element that should animate in on scroll carries `data-reveal`.
Optional `data-reveal-delay="80"` (ms) for stagger — the ledger rows on slide 3 use
`0 / 80 / 160 / 240`.

JS adds `.is-revealed` when 20 % visible. **CSS owns both states**:

```css
[data-reveal]      { opacity:0; transform:translateY(calc(30 * var(--u) / 2.25)); }
[data-reveal].is-revealed { opacity:1; transform:none;
                            transition:opacity 500ms cubic-bezier(0,0,.2,1),
                                       transform 500ms cubic-bezier(0,0,.2,1); }
```

## Count-ups

```html
<span data-count-to="450000" data-count-format="int">450,000</span>
```

The element's **text content is the final value, authored in the HTML**. JS counts up to it
and restores it exactly. If JS fails, the correct number is already on screen — the deck
never shows a zero or a blank because a script broke.

`data-count-format`: `int` (thousands-separated) or `dec1` (one decimal, for `1.4`).

## Presenter notes — never rendered

```html
<script type="text/plain" class="notes" data-for="4">…script text…</script>
```

`type="text/plain"` means the browser does not execute or display it. Notes must **not** be
in a `<div hidden>` or `display:none` element — those still land in the accessibility tree
and could surface on a projector's presenter view.

## Reduced motion

JS sets `<html data-motion="reduced">` when `prefers-reduced-motion: reduce` matches.
CSS keys off that attribute for instant reveals. JS separately skips Lenis and paints final
frames. Both layers must handle it — neither alone is sufficient.

## Tokens — CSS custom properties on `:root`

```
--bg --ink --muted --accent
--u
--t-micro --t-label --t-body --t-subhead --t-display
```

JS reads none of these except `--u` (for the reveal transform distance). Values in
`slides/design/system.md`.

## Font faces

`@font-face` families named exactly **`Instrument Sans`** and **`Instrument Serif`**.
Fallback chains end in generic `sans-serif` / `serif` — never a named system face.
