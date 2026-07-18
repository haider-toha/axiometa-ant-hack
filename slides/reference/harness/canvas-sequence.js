/**
 * Sectioned, preloaded, sticky canvas image-sequence harness.
 * Numbers below come from live scrapes in /reference (Chanel + iCoMat).
 *
 * Drop frames at: ./frames/beat-01/0001.jpg … N.jpg
 * Wire Lenis optionally; GSAP ScrollTrigger optional (vanilla fallback included).
 */

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

/**
 * @param {object} opts
 * @param {string} opts.rootSel - section root (gets height = pinRatio * 100vh)
 * @param {string} opts.canvasSel
 * @param {string} opts.frameUrl - (i) => url for 1-based index
 * @param {number} opts.frameCount
 * @param {number} [opts.pinRatio]
 * @param {object} [opts.lenis] - Lenis instance; if set, syncs on lenis scroll
 * @param {object} [opts.holds] - optional { startFrames?: number, endFrames?: number } hold counts
 */
export function createSequenceSection(opts) {
  const {
    rootSel,
    canvasSel,
    frameUrl,
    frameCount,
    pinRatio = SPEC.defaultPinRatio,
    lenis = null,
    holds = { startFrames: 0, endFrames: 0 },
  } = opts;

  const root = document.querySelector(rootSel);
  const canvas = document.querySelector(canvasSel);
  if (!root || !canvas) throw new Error(`Missing ${rootSel} or ${canvasSel}`);

  const ctx = canvas.getContext("2d", { alpha: false });
  const images = new Array(frameCount);
  let loaded = 0;
  let targetIndex = 0;
  let drawIndex = 0;
  let raf = 0;

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
    const img = images[index];
    if (!img) return;
    const w = sticky?.clientWidth || window.innerWidth;
    const h = sticky?.clientHeight || window.innerHeight;
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.fillStyle = "#0A0B0C";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }

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
    targetIndex = progressToIndex(sectionProgress());
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function tick() {
    raf = 0;
    drawIndex += (targetIndex - drawIndex) * SPEC.scrubLerp;
    if (Math.abs(targetIndex - drawIndex) < 0.2) drawIndex = targetIndex;
    else raf = requestAnimationFrame(tick);
    paint(Math.round(drawIndex));
  }

  async function start() {
    resize();
    await preload();
    paint(0);
    window.addEventListener("resize", resize, { passive: true });
    if (lenis) lenis.on("scroll", syncFromScroll);
    else window.addEventListener("scroll", syncFromScroll, { passive: true });
    syncFromScroll();
    return { images, loaded: () => loaded, destroy };
  }

  function destroy() {
    window.removeEventListener("resize", resize);
    window.removeEventListener("scroll", syncFromScroll);
    if (raf) cancelAnimationFrame(raf);
  }

  return { start, SPEC };
}

/**
 * Optional Lenis bootstrap.
 * <script type="module">
 *   import Lenis from 'https://cdn.jsdelivr.net/npm/@studio-freight/lenis/+esm'
 *   import { createSequenceSection, bootLenis } from './canvas-sequence.js'
 *   const lenis = bootLenis()
 *   await createSequenceSection({ ..., lenis }).start()
 * </script>
 */
export function bootLenis() {
  if (!window.Lenis) {
    console.warn("Lenis not found on window; scrolling will use native.");
    return null;
  }
  const lenis = new window.Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  return lenis;
}

/** Example multi-beat deck wiring for Genesis Mini parts. */
export const AXIOMETA_BEATS = [
  {
    id: "hero-explode",
    rootSel: "#beat-hero",
    canvasSel: "#beat-hero canvas",
    frameUrl: (i) => `/frames/hero/${String(i).padStart(4, "0")}.jpg`,
    frameCount: 90,
    pinRatio: 5,
    holds: { startFrames: 4, endFrames: 2 },
  },
  {
    id: "part-orbit",
    rootSel: "#beat-orbit",
    canvasSel: "#beat-orbit canvas",
    frameUrl: (i) => `/frames/orbit/${String(i).padStart(4, "0")}.jpg`,
    frameCount: 80,
    pinRatio: 4,
    holds: { startFrames: 8, endFrames: 4 },
  },
  {
    id: "detail-zoom",
    rootSel: "#beat-detail",
    canvasSel: "#beat-detail canvas",
    frameUrl: (i) => `/frames/detail/${String(i).padStart(4, "0")}.jpg`,
    frameCount: 60,
    pinRatio: 3,
    holds: { startFrames: 0, endFrames: 0 },
  },
];
