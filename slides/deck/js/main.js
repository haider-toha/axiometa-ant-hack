/**
 * Deck runtime — navigation, reveals, count-ups, diagram edges, canvas-sequence wiring.
 * Build-plan T4, T6, T9. Interface: slides/design/dom-contract.md. Motion numbers:
 * slides/design/system.md, which takes them literally from slides/reference/spec.md.
 *
 * Owns js/ only. Reads index.html and css/, writes neither.
 *
 * Classic script on purpose: the deck must open from file:// with the network off, and
 * `<script type="module">` is blocked by CORS on file:// origins. Load order in index.html
 * must be lenis.min.js → canvas-sequence.js → main.js, all as plain <script> tags.
 *
 * Every value a human reads eases out (cubic-bezier(0,0,.2,1)). `linear` appears nowhere:
 * the canvas scrub's easing is the scroll position itself.
 */
(function () {
  "use strict";

  /* ---------------------------------------------------------------- constants */

  const REVEALED = "is-revealed";
  const DRAWN = "is-drawn";

  /** scroll-animations skill: text reveal fires at 20% visible. */
  const THRESHOLD = 0.2;
  /** system.md Reveals: statistic count-up 900 ms, ease-out. */
  const COUNT_MS = 900;
  /** system.md Reveals: 500 ms cubic-bezier(0,0,.2,1), ledger stagger 80 ms. */
  const EDGE_MS = 500;
  const EDGE_STAGGER = 80;
  const EASE_OUT = "cubic-bezier(0, 0, 0.2, 1)";
  /** system.md Motion: Lenis duration 1.2, and the same easing for keyed slide jumps. */
  const NAV_DURATION = 1.2;
  const LENIS_EASING = (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t));

  const seq = window.CanvasSequence || null;

  const REDUCED = seq
    ? seq.prefersReducedMotion()
    : !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  // Set before first paint so CSS never flashes the animated state. The dom-contract makes
  // both layers responsible: CSS keys off this attribute, JS skips Lenis and the scrub.
  if (REDUCED) document.documentElement.dataset.motion = "reduced";

  /* -------------------------------------------------------------------- utils */

  function all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  /* --------------------------------------------------- one observer, all enters */

  // dom-contract + T6: a single IntersectionObserver for every scroll-triggered element.
  // Elements register an action; the observer unobserves each element after it fires.
  const enterActions = new Map();

  function onEnter(el, fn) {
    const existing = enterActions.get(el);
    if (existing) existing.push(fn);
    else enterActions.set(el, [fn]);
  }

  function runActions(el) {
    const list = enterActions.get(el);
    if (!list) return;
    enterActions.delete(el);
    for (let i = 0; i < list.length; i++) {
      try {
        list[i]();
      } catch (err) {
        console.warn("[deck] enter action failed", err);
      }
    }
  }

  function startObserver() {
    if (!enterActions.size) return;
    if (typeof IntersectionObserver !== "function") {
      // No observer support: show everything rather than hide it.
      Array.from(enterActions.keys()).forEach(runActions);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          runActions(entry.target);
        }
      },
      { threshold: THRESHOLD }
    );
    enterActions.forEach((_, el) => observer.observe(el));
  }

  /* ------------------------------------------------------------------ reveals */

  function markRevealed(el) {
    el.classList.add(REVEALED);
  }

  function initReveals() {
    const els = all("[data-reveal]");
    if (!els.length) return;

    if (REDUCED) {
      // Instant, and everything at once. Reduced motion never means missing content.
      els.forEach(markRevealed);
      return;
    }

    els.forEach((el) => {
      // Callouts pinned to a canvas beat are driven by sequence progress instead — an
      // overlay inside a sticky element is "visible" for the whole pin, so the observer
      // would fire it at the top of the section rather than at its moment.
      if (el.hasAttribute("data-seq-at")) return;

      onEnter(el, () => {
        // dom-contract: data-reveal-delay is the slide-3 ledger stagger, 0/80/160/240.
        const delay = toNumber(el.dataset.revealDelay, 0);
        if (delay > 0) window.setTimeout(() => markRevealed(el), delay);
        else markRevealed(el);
      });
    });
  }

  /* ----------------------------------------------------------------- count-ups */

  // Locale-independent on purpose: toLocaleString on a borrowed venue laptop set to de-DE
  // would render 450.000 mid-count and then snap to the authored 450,000.
  function formatInt(value) {
    return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function formatDec1(value) {
    return value.toFixed(1);
  }

  function runCountUp(el) {
    // dom-contract: the authored text is already the final value. Read the target from the
    // attribute, animate to it, restore the authored string verbatim at the end. Any
    // failure leaves the authored text exactly as it was.
    const target = toNumber(el.dataset.countTo, NaN);
    const authored = el.textContent;
    if (!Number.isFinite(target)) return;

    const format = el.dataset.countFormat === "dec1" ? formatDec1 : formatInt;
    const started = performance.now();

    function frame(now) {
      try {
        const t = clamp((now - started) / COUNT_MS, 0, 1);
        if (t >= 1) {
          el.textContent = authored;
          return;
        }
        // ease-out cubic — system.md Reveals, "statistic count-up 900 ms, ease-out".
        el.textContent = format(target * (1 - Math.pow(1 - t, 3)));
        requestAnimationFrame(frame);
      } catch (err) {
        el.textContent = authored;
        console.warn("[deck] count-up failed", err);
      }
    }

    requestAnimationFrame(frame);
  }

  function initCountUps() {
    // Reduced motion: the authored text is the final value, so the correct behaviour is to
    // touch nothing at all.
    if (REDUCED) return;
    all("[data-count-to]").forEach((el) => onEnter(el, () => runCountUp(el)));
  }

  /* ------------------------------------------------------------- diagram edges */

  function drawEdges(edges) {
    edges.forEach((edge) => {
      edge.style.strokeDashoffset = "0";
      edge.classList.add(DRAWN);
    });
  }

  function initDiagramEdges() {
    const edges = all(".diagram-edge");
    if (!edges.length) return;

    const measured = [];
    edges.forEach((edge) => {
      let length = 0;
      try {
        length = typeof edge.getTotalLength === "function" ? edge.getTotalLength() : 0;
      } catch (err) {
        length = 0;
      }
      // Unmeasurable edge: leave it alone, drawn, rather than hide it behind a dash offset
      // we can never clear.
      if (!Number.isFinite(length) || length <= 0) return;
      edge.style.strokeDasharray = String(length);
      edge.style.strokeDashoffset = String(length);
      measured.push(edge);
    });
    if (!measured.length) return;

    if (REDUCED) {
      drawEdges(measured);
      return;
    }

    // Commit the primed offset before attaching the transition, so setting it back to 0
    // animates instead of being coalesced into one style flush.
    void measured[0].getBoundingClientRect();
    measured.forEach((edge, i) => {
      edge.style.transition =
        "stroke-dashoffset " + EDGE_MS + "ms " + EASE_OUT + " " + i * EDGE_STAGGER + "ms";
    });

    const host = measured[0].closest(".slide") || document.getElementById("slide-5");
    if (!host) {
      drawEdges(measured);
      return;
    }
    onEnter(host, () => drawEdges(measured));
  }

  /* ---------------------------------------------------------------- sequences */

  /**
   * Optional: an element inside a .slide--seq carrying data-seq-at="0.55" reveals when the
   * beat passes 55% of its scroll. This is the onProgress consumer; if the markup uses
   * plain data-reveal on its callouts instead, nothing here runs and nothing breaks.
   */
  function makeCalloutDriver(section) {
    const marks = all("[data-seq-at]", section).map((el) => ({
      el: el,
      at: clamp(toNumber(el.dataset.seqAt, 0), 0, 1),
    }));
    if (!marks.length) return null;

    let pending = marks;
    return function (p) {
      if (!pending.length) return;
      const still = [];
      for (let i = 0; i < pending.length; i++) {
        if (p >= pending[i].at) markRevealed(pending[i].el);
        else still.push(pending[i]);
      }
      pending = still;
    };
  }

  /**
   * T9 — every value comes from the DOM. Slide 4 is explode/90/pin 5/holds 4,2 and slide 7
   * is orbit/80/pin 4/holds 8,4, but this file hardcodes none of that.
   *
   * Runs synchronously so section heights are final before navigation measures anything.
   * A section that cannot be wired is skipped, never thrown out of: the frames are rendered
   * by a separate agent and may not exist yet, and a missing sequence must not take the
   * other nine slides or the navigation with it.
   */
  function createSequences(lenis) {
    const built = [];
    const sections = all(".slide--seq");
    if (!sections.length) return built;

    if (!seq || typeof seq.createSequenceSection !== "function") {
      console.warn("[deck] canvas-sequence.js not loaded — sequence slides stay static.");
      sections.forEach((section) => all("[data-seq-at]", section).forEach(markRevealed));
      return built;
    }

    sections.forEach((section) => {
      try {
        const data = section.dataset;
        if (!section.id) throw new Error("no id on .slide--seq");
        if (!data.seq) throw new Error("no data-seq");
        if (!section.querySelector("canvas")) throw new Error("no canvas");

        const name = data.seq;
        const rootSel = "#" + section.id;
        const handle = seq.createSequenceSection({
          rootSel: rootSel,
          canvasSel: rootSel + " canvas",
          // Relative to index.html. An absolute /frames/ path does not resolve on file://.
          frameUrl: (i) => "frames/" + name + "/" + String(i).padStart(4, "0") + ".jpg",
          frameCount: toNumber(data.frames, seq.SPEC.framesPerBeat),
          pinRatio: toNumber(data.pin, seq.SPEC.defaultPinRatio),
          holds: {
            startFrames: toNumber(data.holdStart, 0),
            endFrames: toNumber(data.holdEnd, 0),
          },
          lenis: lenis,
          reducedMotion: REDUCED,
          onProgress: makeCalloutDriver(section),
        });
        built.push({ section: section, handle: handle, name: name });
      } catch (err) {
        console.warn("[deck] sequence " + (section.id || "?") + " skipped:", err.message || err);
        // Its callouts would otherwise never be revealed by anything.
        all("[data-seq-at]", section).forEach(markRevealed);
      }
    });

    return built;
  }

  /** Preload in DOM order so the earlier beat is ready first. Failures stay contained. */
  function startSequences(built) {
    let chain = Promise.resolve();
    built.forEach((entry) => {
      chain = chain.then(function () {
        return Promise.resolve(entry.handle.start())
          .then(function (api) {
            const usable = api.images.filter(function (img) {
              return img && img.naturalWidth > 0;
            }).length;
            if (!usable) {
              console.warn(
                "[deck] sequence '" + entry.name + "' has no frames yet — slide holds its layout."
              );
            }
          })
          .catch(function (err) {
            console.warn("[deck] sequence '" + entry.name + "' failed to start:", err);
          });
      });
    });
    return chain;
  }

  /* --------------------------------------------------------------- navigation */

  let slides = [];
  let byNumber = new Map();
  let activeIndex = 0;
  let lenis = null;
  let navToken = 0;
  let navLock = false;

  function indexSlides() {
    // dom-contract: nothing else in the document carries .slide, and DOM order is
    // narrative order.
    slides = all(".slide");
    byNumber = new Map();
    slides.forEach((el, i) => {
      const raw =
        el.dataset.slide != null ? el.dataset.slide : String(el.id || "").replace(/^slide-/, "");
      const n = Number(raw);
      const key = Number.isFinite(n) ? n : i;
      if (!byNumber.has(key)) byNumber.set(key, i);
    });
  }

  function documentTop(el) {
    const rect = el.getBoundingClientRect();
    return Math.round(rect.top + (window.scrollY || window.pageYOffset || 0));
  }

  /**
   * Current slide read from geometry, not from a counter that can drift out of sync with
   * the wheel. The last slide whose top has crossed the middle of the viewport is current,
   * which keeps a 5:1 pinned section current for its whole runway.
   */
  function nearestIndex() {
    const line = window.innerHeight * 0.5;
    let idx = 0;
    for (let i = 0; i < slides.length; i++) {
      if (slides[i].getBoundingClientRect().top <= line) idx = i;
      else break;
    }
    return idx;
  }

  function scrollToIndex(i, immediate) {
    if (!slides.length) return;
    const index = clamp(i, 0, slides.length - 1);
    const target = slides[index];
    if (!target) return;

    activeIndex = index;

    // Hold the index against scroll-derived updates until the tween lands, so two quick
    // presses of → advance two slides instead of fighting the in-flight scroll.
    const token = ++navToken;
    navLock = true;
    const release = function () {
      if (token === navToken) navLock = false;
    };

    if (lenis) {
      lenis.scrollTo(target, {
        duration: immediate ? 0 : NAV_DURATION,
        easing: LENIS_EASING,
        immediate: !!immediate,
        force: true,
        onComplete: release,
      });
      // onComplete does not fire if this tween is interrupted; never leave the lock set.
      window.setTimeout(release, immediate ? 0 : NAV_DURATION * 1000 + 250);
      return;
    }

    const top = documentTop(target);
    const behavior = immediate || REDUCED ? "instant" : "smooth";
    try {
      window.scrollTo({ top: top, behavior: behavior });
    } catch (err) {
      window.scrollTo(0, top);
    }
    window.setTimeout(release, behavior === "smooth" ? 800 : 0);
  }

  function onScrollSettle() {
    if (navLock) return;
    activeIndex = nearestIndex();
  }

  function isTypingTarget(node) {
    if (!node) return false;
    if (node.isContentEditable) return true;
    return /^(INPUT|TEXTAREA|SELECT)$/.test(node.tagName || "");
  }

  function onKeyDown(e) {
    // Let the browser keep its own shortcuts (Cmd+6 switches tabs; Ctrl+End is a habit).
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    // A held key must not shoot through the deck.
    if (e.repeat) return;
    if (isTypingTarget(e.target)) return;
    if (!slides.length) return;

    const key = e.key;

    if (key === "ArrowRight" || key === "ArrowDown" || key === "PageDown" || key === " " || key === "Spacebar") {
      e.preventDefault();
      scrollToIndex(activeIndex + 1);
      return;
    }

    if (key === "ArrowLeft" || key === "ArrowUp" || key === "PageUp") {
      e.preventDefault();
      scrollToIndex(activeIndex - 1);
      return;
    }

    // The demo-recovery path. After the 90 s demo the presenter presses 6 and lands on
    // slide 6 from wherever the deck was left, with no scrolling by eye. Keyed off
    // data-slide, not array position, so it survives any DOM reshuffle.
    if (key.length === 1 && key >= "0" && key <= "9") {
      e.preventDefault();
      const idx = byNumber.get(Number(key));
      if (idx != null) scrollToIndex(idx);
      return;
    }

    // Eleven slides, ten digits: Home and End reach slide 0 and slide 10 unambiguously.
    // A two-digit buffer would have delayed the single-digit jump, which is the one path
    // that has to be instant.
    if (key === "Home") {
      e.preventDefault();
      scrollToIndex(0);
      return;
    }
    if (key === "End") {
      e.preventDefault();
      scrollToIndex(slides.length - 1);
    }
  }

  /**
   * Lenis ships functional CSS in its package. css/ belongs to the markup agent, so the
   * three rules Lenis actually needs to scroll correctly are injected here with the code
   * that depends on them. Behaviour only — no colour, type, or layout.
   */
  function injectLenisRuntimeCss() {
    if (document.getElementById("lenis-runtime-css")) return;
    const style = document.createElement("style");
    style.id = "lenis-runtime-css";
    style.textContent =
      "html.lenis,html.lenis body{height:auto}" +
      "html.lenis{scroll-behavior:auto}" +
      ".lenis:not(.lenis-autoToggle).lenis-stopped{overflow:clip}" +
      ".lenis [data-lenis-prevent]{overscroll-behavior:contain}" +
      ".lenis.lenis-smooth iframe{pointer-events:none}";
    (document.head || document.documentElement).appendChild(style);
  }

  function initNavigation() {
    if (!REDUCED && seq && typeof seq.bootLenis === "function") {
      injectLenisRuntimeCss();
      lenis = seq.bootLenis();
    }

    if (lenis) lenis.on("scroll", onScrollSettle);
    else window.addEventListener("scroll", onScrollSettle, { passive: true });

    window.addEventListener("keydown", onKeyDown);
    // Section heights change with the viewport; re-derive rather than trust a stale index.
    window.addEventListener("resize", onScrollSettle, { passive: true });
  }

  /** Open on slide 0, or on #slide-N if the URL names one. Called once heights are final. */
  function restoreStartPosition() {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    const id = String(location.hash || "").replace(/^#/, "");
    const el = id ? document.getElementById(id) : null;
    const index = el && el.classList.contains("slide") ? slides.indexOf(el) : 0;
    scrollToIndex(index < 0 ? 0 : index, true);
  }

  /* --------------------------------------------------------------------- boot */

  function init() {
    indexSlides();

    // Navigation and reveals are wired before anything touches a frame, so a sequence that
    // cannot load has nothing left to break.
    initNavigation();
    const built = createSequences(lenis);

    initReveals();
    initCountUps();
    initDiagramEdges();
    startObserver();

    restoreStartPosition();
    onScrollSettle();

    startSequences(built);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
