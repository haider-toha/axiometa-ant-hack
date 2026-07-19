"""Regenerate slides/narrative/script.md from the deck's own presenter notes.

index.html is the single source of truth for spoken lines: it is what the deck
ships and what the presenter reads. This script lifts every
<script type="text/plain" class="notes"> block out of it and rebuilds script.md
around them, so the two can never disagree again.

Adversarial review found them already drifted in both directions — index.html
ahead on one line, script.md ahead on another, and the word count stale in both.
Hand-syncing would have fixed that once; this fixes it permanently.

Appendices below the marker are authored prose and are preserved verbatim.

Run:  .venv/bin/python slides/build/sync_script.py
"""
import html
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
DECK = ROOT / "slides/deck/index.html"
SCRIPT = ROOT / "slides/narrative/script.md"

MARKER = "<!-- APPENDICES — authored, preserved by sync_script.py -->"

NOTE_RE = re.compile(
    r'<script type="text/plain" class="notes" data-for="(\d+)"\s*>(.*?)</script>',
    re.DOTALL,
)
# Three categories, deliberately distinguished. Only DECK lines count toward the
# runtime added to the 90 s demo:
#   [P1] [P2] [P3]  deck speech, spoken over slides
#   [P#-DEMO]       spoken DURING the demo — already inside the 90 s, never added
#   [P#-ALT]        contingency alternates — at most one is ever spoken, and only on failure
SPOKEN_RE = re.compile(r"^\s*\[(P[123])\]\s*(.+?)\s*$")
DEMO_RE = re.compile(r"^\s*\[(P[123])-DEMO\]\s*(.+?)\s*$")
ALT_RE = re.compile(r"^\s*\[(P[123])-ALT\]\s*(.+?)\s*$")


def word_count(line: str) -> int:
    line = re.sub(r"\[CUTTABLE[^\]]*\]", "", line)
    return len([w for w in re.split(r"\s+", line.strip()) if w])


def main() -> int:
    if not DECK.exists():
        print(f"missing {DECK}", file=sys.stderr)
        return 1

    notes = NOTE_RE.findall(DECK.read_text())
    if not notes:
        print("no notes blocks found — refusing to write an empty script", file=sys.stderr)
        return 1

    per_presenter = {"P1": 0, "P2": 0, "P3": 0}
    total_words = 0
    cuttable_words = 0
    demo_words = 0
    alt_lines = []
    out = [
        "# Speaker script",
        "",
        "> **Generated from `slides/deck/index.html` by `slides/build/sync_script.py`.**",
        "> Do not edit the per-slide sections here — edit the deck's `class=\"notes\"`",
        "> blocks and re-run the script. The deck is what the presenter actually reads,",
        "> so it is the source of truth. Appendices at the end are authored by hand and",
        "> are preserved.",
        "",
        "Three voices, marked `[P1]` / `[P2]` / `[P3]`. Spoken pace **130 wpm**.",
        "Nothing here appears on a slide surface — these are presenter notes only.",
        "",
        "---",
        "",
    ]

    for slide_id, body in notes:
        body = html.unescape(body).strip("\n")
        lines = [ln.rstrip() for ln in body.split("\n")]
        spoken = []
        for ln in lines:
            m = SPOKEN_RE.match(ln)
            if m:
                spoken.append((m.group(1), m.group(2)))
                continue
            d = DEMO_RE.match(ln)
            if d:
                demo_words += word_count(d.group(2))
                continue
            a = ALT_RE.match(ln)
            if a:
                alt_lines.append(word_count(a.group(2)))

        words = sum(word_count(t) for _, t in spoken)
        total_words += words
        for who, text in spoken:
            per_presenter[who] += word_count(text)
            if "[CUTTABLE" in text:
                cuttable_words += word_count(text)

        voices = sorted({w for w, _ in spoken}) or ["—"]
        out += [
            f"## Slide {slide_id} · {'/'.join(voices)} · {words} spoken words",
            "",
            "```",
            body,
            "```",
            "",
        ]

    longest = 0
    over15 = []
    for _, body in notes:
        for ln in html.unescape(body).split("\n"):
            m = SPOKEN_RE.match(ln)
            if m:
                n = word_count(m.group(2))
                longest = max(longest, n)
                if n > 15:
                    over15.append((n, m.group(2).strip()))

    out += [
        "---",
        "",
        "## Ledger — computed, not asserted",
        "",
        "| Presenter | Spoken words |",
        "|---|---|",
    ]
    for who in ("P1", "P2", "P3"):
        out.append(f"| {who} | {per_presenter[who]} |")
    runtime = total_words / 130 * 60
    tight = (total_words - cuttable_words) / 130 * 60
    out += [
        f"| **Total** | **{total_words}** |",
        "",
        f"At 130 wpm: **{runtime:.0f} s ({int(runtime // 60)}:{int(runtime % 60):02d})** full, "
        f"**{tight:.0f} s ({int(tight // 60)}:{int(tight % 60):02d})** with every "
        f"`[CUTTABLE]` line dropped ({cuttable_words} words).",
        "",
        f"With a 90 s demo: **{int((runtime + 90) // 60)}:{int((runtime + 90) % 60):02d} full** / "
        f"**{int((tight + 90) // 60)}:{int((tight + 90) % 60):02d} tight**. The slot is 5:00.",
        "",
        "Excluded from the runtime above, and why:",
        "",
        f"- **{demo_words} words** of `[P#-DEMO]` — spoken *inside* the 90 s demo, so adding "
        "them would double-count that time.",
        f"- **{len(alt_lines)} `[P#-ALT]` contingency lines** "
        f"({'/'.join(str(n) for n in alt_lines) or '—'} words) — at most one is ever spoken, "
        "and only if the demo fails.",
        "",
        f"Longest spoken line: **{longest} words**.",
    ]
    if over15:
        out += ["", "Lines over 15 words:", ""]
        out += [f"- **{n}w** — {t}" for n, t in over15]
    else:
        out += ["", "No spoken line exceeds 15 words."]
    out.append("")

    existing = SCRIPT.read_text() if SCRIPT.exists() else ""
    appendix = ""
    if MARKER in existing:
        appendix = existing.split(MARKER, 1)[1]

    SCRIPT.write_text("\n".join(out) + "\n" + MARKER + appendix)
    print(f"wrote {SCRIPT.relative_to(ROOT)}")
    print(f"  slides {len(notes)}  words {total_words}  runtime {runtime:.0f}s"
          f"  P1/P2/P3 {per_presenter['P1']}/{per_presenter['P2']}/{per_presenter['P3']}")
    if over15:
        print(f"  WARNING: {len(over15)} spoken line(s) over 15 words")
    return 0


if __name__ == "__main__":
    sys.exit(main())
