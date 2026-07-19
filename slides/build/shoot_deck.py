"""Drive the deck in Playwright: screenshot every slide, exercise navigation,
collect console errors. Run with: .venv/bin/python slides/build/shoot_deck.py
"""
import pathlib, sys, json
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8137/index.html"
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/deckshots")
OUT.mkdir(parents=True, exist_ok=True)

errors, logs = [], []

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    page.on("console", lambda m: (logs.append(f"{m.type}: {m.text}"),
                                  errors.append(m.text) if m.type == "error" else None))
    page.on("pageerror", lambda e: errors.append(f"PAGEERROR: {e}"))

    page.goto(URL, wait_until="networkidle")
    page.wait_for_timeout(1200)

    # --- what did the page actually build? ---
    info = page.evaluate("""() => ({
        slides: document.querySelectorAll('.slide').length,
        ids: [...document.querySelectorAll('.slide')].map(s => s.id),
        seqSections: [...document.querySelectorAll('.slide--seq')].map(s => ({
            id: s.id, seq: s.dataset.seq, frames: s.dataset.frames,
            pin: s.dataset.pin, heightVh: Math.round(s.offsetHeight / window.innerHeight * 10) / 10
        })),
        lenis: typeof window.Lenis,
        harness: typeof window.CanvasSequence,
        motion: document.documentElement.dataset.motion || 'normal',
        revealed: document.querySelectorAll('[data-reveal].is-revealed').length,
        totalReveal: document.querySelectorAll('[data-reveal]').length,
        docHeightVh: Math.round(document.body.scrollHeight / window.innerHeight * 10) / 10,
    })""")
    print("PAGE STATE:", json.dumps(info, indent=2))

    # --- screenshot each slide by jumping with number keys / arrows ---
    n = info["slides"]
    for i in range(n):
        if i <= 9:
            page.keyboard.press(str(i))
        else:
            page.keyboard.press("ArrowRight")
        page.wait_for_timeout(1600)          # Lenis 1.2s tween + settle
        page.screenshot(path=str(OUT / f"slide-{i:02d}.png"))
        y = page.evaluate("() => Math.round(window.scrollY)")
        top = page.evaluate(f"""() => {{
            const el = document.getElementById('slide-{i}');
            return el ? Math.round(el.getBoundingClientRect().top) : null;
        }}""")
        print(f"  slide {i:2d}: scrollY={y:6d}  slideTopOffset={top}")

    # --- the demo-recovery path: jump to 6 from the very end ---
    page.keyboard.press("9")
    page.wait_for_timeout(1600)
    page.keyboard.press("6")
    page.wait_for_timeout(1800)
    recov = page.evaluate("""() => {
        const el = document.getElementById('slide-6');
        return { top: Math.round(el.getBoundingClientRect().top),
                 scrollY: Math.round(window.scrollY) };
    }""")
    page.screenshot(path=str(OUT / "recovery-jump-to-6.png"))
    print("RECOVERY (9 then 6):", recov,
          "->", "PASS" if abs(recov["top"]) <= 4 else "FAIL")

    browser.close()

print("\nCONSOLE ERRORS:", len(errors))
for e in errors[:20]:
    print("  !", e)
print(f"\nscreenshots -> {OUT}")
