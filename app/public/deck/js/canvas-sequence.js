/**
 * Sectioned, preloaded, sticky canvas image-sequence harness.
 * Numbers below come from live scrapes in /reference (Chanel + iCoMat).
 *
 * Adapted from slides/reference/harness/canvas-sequence.js per build-plan T3.
 * SPEC is verbatim. Frames live at ./frames/{seq}/0001.jpg … N.jpg, resolved relative to
 * index.html so the deck opens from file:// with the network off.
 *
 * Deviations from the reference harness, all deliberate:
 *
 *   1. Classic script, not an ES module. `<script type="module">` is fetched with CORS and
 *      is blocked on file:// origins, which is exactly where this deck has to run. The API
 *      is attached to window.CanvasSequence instead of `export`ed. There is no import or
 *      export syntax left in the file, so it also stays valid if loaded as a module.
 *   2. onProgress(p) — optional, fired from syncFromScroll with raw 0..1 section progress.
 *   3. reducedMotion — paints the final frame and never binds a scroll listener.
 *   4. paint() fills the deck background before it looks at the frame, and refuses frames
 *      that are absent or broken. drawImage() throws InvalidStateError for an <img> in the
 *      broken state, and the Blender renders may not exist yet; without this guard a
 *      missing sequence would throw on every animation frame.
 *   5. The AXIOMETA_BEATS example export is dropped. Its "/frames/..." absolute paths do
 *      not resolve from file://, and T9 reads every value from the DOM instead.
 *
 * Unchanged and load-bearing: the Image[] preload, and progressToIndex's 15% lead / 8%
 * trail hold-then-burn curve. img.src is never assigned inside a scroll handler.
 */
(function () {
  "use strict";

  const SPEC = {
    /** iCoMat accordion sticky parent/child */
    defaultPinRatio: 5,
    /** Chanel seq2–4 */
    framesPerBeat: 90,
    /** Chanel active-burn median */
    pxPerFrameActive: 4.2,
    /** Chanel seq avg */
    targetFrameKB: 30,
    /** Buffer relative to CSS box; Chanel used ~1–1.5× at dpr1 mobile */
    maxDpr: 2,
    /** Soft lag like GSAP scrub: 1 */
    scrubLerp: 0.12,
  };

  function prefersReducedMotion() {
    return !!(
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  /** A frame is paintable only once it has decoded. Broken images make drawImage throw. */
  function isPaintable(img) {
    return !!(img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
  }

  /**
   * One requestAnimationFrame loop for the whole deck.
   *
   * Measured before this existed: ~240 rAF callbacks/second, about four per frame — Lenis
   * ran its own loop and each sequence section spawned another, so two canvas beats plus
   * Lenis meant three schedulers competing for one frame budget (four while a count-up ran).
   * It did not drop frames on a fast machine, but the contention is exactly what bites on
   * weaker hardware, which is what a borrowed venue laptop is.
   *
   * Callbacks return truthy to stay registered, falsy to unregister. When the set empties
   * the loop stops entirely, so a deck sitting parked on a slide burns no frames at all.
   */
  const ticker = (function makeTicker() {
    const callbacks = new Set();
    let running = false;
    let onFrame = null;

    function loop(time) {
      if (onFrame) onFrame(time);
      // Iterate a copy: a callback may unregister itself or another mid-pass.
      for (const cb of [...callbacks]) {
        let keep = false;
        try {
          keep = cb(time);
        } catch (err) {
          console.error("ticker callback failed; unregistering", err);
        }
        if (!keep) callbacks.delete(cb);
      }
      running = callbacks.size > 0 || !!onFrame;
      if (running) requestAnimationFrame(loop);
    }

    function kick() {
      if (running) return;
      running = true;
      requestAnimationFrame(loop);
    }

    return {
      add(cb) {
        callbacks.add(cb);
        kick();
      },
      remove(cb) {
        callbacks.delete(cb);
      },
      /** Lenis drives from the same loop rather than owning a second one. */
      setDriver(fn) {
        onFrame = fn;
        kick();
      },
    };
  })();

  /**
   * @param {object} opts
   * @param {string} opts.rootSel - section root (gets height = pinRatio * 100vh)
   * @param {string} opts.canvasSel
   * @param {function} opts.frameUrl - (i) => url for 1-based index
   * @param {number} opts.frameCount
   * @param {number} [opts.pinRatio]
   * @param {object} [opts.lenis] - Lenis instance; if set, syncs on lenis scroll
   * @param {object} [opts.holds] - optional { startFrames?: number, endFrames?: number } hold counts
   * @param {function} [opts.onProgress] - (p) => void, raw 0..1 section progress
   * @param {boolean} [opts.reducedMotion] - paint the final frame, bind no scroll listener
   */
  function createSequenceSection(opts) {
    const {
      rootSel,
      canvasSel,
      frameUrl,
      frameCount,
      pinRatio = SPEC.defaultPinRatio,
      lenis = null,
      holds = { startFrames: 0, endFrames: 0 },
      onProgress = null,
      reducedMotion = prefersReducedMotion(),
    } = opts;

    const root = document.querySelector(rootSel);
    const canvas = document.querySelector(canvasSel);
    if (!root || !canvas) throw new Error(`Missing ${rootSel} or ${canvasSel}`);

    const ctx = canvas.getContext("2d", { alpha: false });
    const images = new Array(frameCount);
    let loaded = 0;
    let targetIndex = 0;
    let drawIndex = 0;
    /** Last index actually blitted. Skips redundant drawImage calls while the lerp
        settles across sub-frame deltas that round to the same frame. */
    let paintedIndex = -1;

    root.style.position = "relative";
    root.style.height = `${pinRatio * 100}vh`;

    const sticky = canvas.parentElement;
    if (sticky) {
      sticky.style.position = "sticky";
      sticky.style.top = "0";
      sticky.style.height = "100vh";
      sticky.style.display = "grid";
      sticky.style.placeItems = "center";
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, SPEC.maxDpr);
      const w = sticky?.clientWidth || window.innerWidth;
      const h = sticky?.clientHeight || window.innerHeight;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint(Math.round(drawIndex));
    }

    function paint(index) {
      const w = sticky?.clientWidth || window.innerWidth;
      const h = sticky?.clientHeight || window.innerHeight;
      // Fill first. A frame may be absent, and an alpha:false canvas rests on #000, which
      // is not in the palette. One drawImage per paint — never composite two frames
      // (spec.md "Do not" §1: cross-fading smears).
      ctx.fillStyle = "#0A0B0C";
      ctx.fillRect(0, 0, w, h);
      const img = images[index];
      if (!isPaintable(img)) return;
      // CONTAIN (min), not cover (max). Cover crops to fill: on a 1400x1050 projector
      // that removed 24% of the render's height and dropped slide 4's port callouts on
      // top of the base plate. Contain can letterbox — but the bars are #0A0B0C and the
      // renders' own world background is #0A0B0C, so they are literally invisible. The
      // whole frame is always shown and the callouts can never collide with geometry.
      const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    }

    /** Preloaded once, up front. Nothing below this ever assigns img.src. */
    function preload() {
      return Promise.all(
        Array.from({ length: frameCount }, (_, i) => {
          return new Promise((resolve) => {
            const img = new Image();
            img.decoding = "async";
            img.src = frameUrl(i + 1);
            img.onload = img.onerror = () => {
              images[i] = img;
              loaded += 1;
              resolve();
            };
          });
        })
      );
    }

    /** Map section scroll progress → frame, with optional hold heads/tails (Chanel pattern). */
    function progressToIndex(p) {
      const startHold = holds.startFrames || 0;
      const endHold = holds.endFrames || 0;
      const playable = Math.max(1, frameCount - startHold - endHold);
      if (p <= 0) return 0;
      if (p >= 1) return frameCount - 1;

      // Reserve ~15% scroll for lead-in hold when startHold set (Chanel seq3 ~0.73/1.06 vh)
      const lead = startHold ? 0.15 : 0;
      const trail = endHold ? 0.08 : 0;
      if (p < lead) return 0;
      if (p > 1 - trail) return frameCount - 1;

      const mid = (p - lead) / (1 - lead - trail);
      const idx = startHold + Math.floor(mid * (playable - 1));
      return Math.min(frameCount - 1, Math.max(0, idx));
    }

    function sectionProgress() {
      const rect = root.getBoundingClientRect();
      const total = root.offsetHeight - window.innerHeight;
      if (total <= 0) return 0;
      return Math.min(1, Math.max(0, -rect.top / total));
    }

    function syncFromScroll() {
      const p = sectionProgress();
      targetIndex = progressToIndex(p);
      if (onProgress) onProgress(p);
      ticker.add(tick);
    }

    /**
     * One lerp step. Registered on the shared ticker rather than self-scheduling its own
     * requestAnimationFrame: with two sequence sections plus Lenis, per-section rAF loops
     * meant four independent schedulers competing for one frame budget. Returning false
     * unregisters this callback once the lerp has settled, so a parked deck costs nothing.
     */
    function tick() {
      drawIndex += (targetIndex - drawIndex) * SPEC.scrubLerp;
      const settled = Math.abs(targetIndex - drawIndex) < 0.2;
      if (settled) drawIndex = targetIndex;
      const next = Math.round(drawIndex);
      if (next !== paintedIndex) paint(next);
      return !settled;
    }

    async function start() {
      resize();
      await preload();
      window.addEventListener("resize", resize, { passive: true });

      if (reducedMotion) {
        // Final frame, and no scroll listener at all. The section keeps its runway so key
        // navigation still lands on the same slide roots.
        drawIndex = targetIndex = frameCount - 1;
        paint(frameCount - 1);
        if (onProgress) onProgress(1);
        return { images, loaded: () => loaded, destroy };
      }

      paint(0);
      if (lenis) lenis.on("scroll", syncFromScroll);
      else window.addEventListener("scroll", syncFromScroll, { passive: true });
      syncFromScroll();
      return { images, loaded: () => loaded, destroy };
    }

    function destroy() {
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", syncFromScroll);
      ticker.remove(tick);
    }

    return { start, SPEC };
  }

  /**
   * Lenis bootstrap. Expects the vendored ./lenis.min.js to have run first — it attaches
   * globalThis.Lenis. No CDN import; the deck makes no network request of any kind.
   */
  function bootLenis() {
    if (!window.Lenis) {
      console.warn("Lenis not found on window; scrolling will use native.");
      return null;
    }
    const lenis = new window.Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    // Lenis drives from the deck's single shared loop rather than owning a second one.
    ticker.setDriver((time) => lenis.raf(time));
    return lenis;
  }

  window.CanvasSequence = {
    SPEC,
    createSequenceSection,
    bootLenis,
    prefersReducedMotion,
    isPaintable,
  };
})();
