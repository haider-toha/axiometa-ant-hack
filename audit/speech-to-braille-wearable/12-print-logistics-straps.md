# 12 — Print Logistics & Strap (buy-vs-print) — Bambu bed sizes, fit check, strap decision

**Type:** Research + logistics deliverable (printer/bed reality-check + strap buy-vs-print decision).
**Date:** 2026-07-17
**Constraint honoured:** RESEARCH ONLY, web-grounded. **No CAD authored, no STEP/STL/3MF written.** Every
printer/strap fact is cited inline (URLs) and in the Sources table. Device dimensions are quoted from the
corpus (`05`, `07`, `10`); nothing about the electronics is invented.
**Event constraints:** Bambu Lab printers, **PLA only**, colours black/white/gray/green → **assume single
gray**. Builder is unsure of the exact printer model / bed size and whether to **print** or **buy** the strap.
**Builds on:** `07-geometry-physical-coherence.md` (enclosure form: ~55 mm square head, worn component-side-out
like a watch), `10-printed-strap-linkage.md` (already recommended a fully-3D-printed segmented pin-hinge PLA
strap + tang buckle + printed cross-pin lug interface).

---

## Scope

Answer four practical logistics questions so the CAD modeller can freeze the enclosure's outer interfaces:

1. **Which Bambu, how big is the bed?** Map the current lineup (A1 mini, A1, P1P/P1S, X1C) to build volumes;
   identify the "generic common" machine to design to.
2. **Does the device fit?** Enclosure head ~60–65 mm square + a wrist strap — on **both** the big (256 mm) and
   small (180 mm) bed, with any orientation constraints for the strap band called out numerically.
3. **Strap — print vs buy, both concretely.** (a) Confirm/deny the segmented PLA approach from `10` and whether
   any slicer trick makes a flexible one-piece PLA band viable. (b) If buying: the exact **lug width** the CAD
   must use, strap length, spring-bar type, and where to buy.
4. **TPU note.** Would flexible filament change the answer? (Option only — they have PLA now.)

**Out of scope:** board capture, haptics coupling, and the full strap clearance/tolerance table — all owned by
`07` and `10`; this file is printer/bed reality + the buy-vs-print fork.

### Device recap (from `05` / `07` / `10`)

- **Head:** ~**55 × 55 mm** square board `[07 §6]` in an open printed cage; add ~2–3 mm walls each side → the
  enclosure "head" is ~**60–65 mm square** (the task's figure; consistent with a 55 mm board + `05` §7's ≥2 mm
  walls). Tallest feature is the encoder knob at ~**30 mm** above the board `[07 §6]`.
- **Strap:** fully-printed segmented pin-hinge band already specced in `10` (PLA, gray, magnet-free); adult wrist
  circumference design range **140–200 mm** `[10]`.

---

## Bambu printers + bed sizes (cited)

Bambu's current desktop FDM lineup collapses to **just two bed sizes**: a 180 mm cube (A1 mini only) and a
256 mm cube (everything else).

| Model | Build volume (X × Y × Z, mm) | Class / notes | Source |
|---|---|---|---|
| **A1 mini** | **180 × 180 × 180** | Entry / budget, open-bed Cartesian; the **only** small-bed model | official spec ([bambulab.com/a1-mini/tech-specs](https://bambulab.com/en/a1-mini/tech-specs)); confirmed 180³ ([3DPros](https://3dpros.com/compares/bambu-lab-p1s-vs-bambu-lab-a1-mini)) |
| **A1** | **256 × 256 × 256** | Full-size open-bed Cartesian, ~$459; hugely popular in homes/schools | [MakerViking](https://www.makerviking.com/articles/bambu-lab-printer-comparison-x1-carbon-p1s-a1); [Bambu store A1](https://us.store.bambulab.com/products/a1); A1 = 188 % more volume than A1 mini ([All3DP](https://all3dp.com/2/bambu-lab-a1-vs-a1-mini-differences/)) |
| **P1P** | **256 × 256 × 256** | Open-frame CoreXY, ~500 mm/s | [Top3DShop P1P](https://top3dshop.com/product/bambu-lab-p1p-3d-printer); [3DPros P1P](https://3dpros.com/printers/bambu-lab-p1p) |
| **P1S** | **256 × 256 × 256** | Enclosed CoreXY, ~$699; "best value," best-selling enclosed | [MakerViking](https://www.makerviking.com/articles/bambu-lab-printer-comparison-x1-carbon-p1s-a1); [Bambu store P1S](https://us.store.bambulab.com/products/p1s) |
| **X1C (X1 Carbon)** | **256 × 256 × 256** | Flagship enclosed CoreXY, lidar/AMS | [MakerViking](https://www.makerviking.com/articles/bambu-lab-printer-comparison-x1-carbon-p1s-a1) |

Corroboration that the whole non-mini lineup shares one bed: Bambu's own wiki is titled *"…how to use the full
build volume **256×256×256 mm**"* and states the **X1 series, P1 series, and A1 all have a build volume of
256×256×256 mm** ([Bambu wiki](https://wiki.bambulab.com/en/knowledge-sharing/print-volume-limitations)). (An
emerging **P2S** is replacing the P1S in the mid-range but stays in the same 256-class bed —
[3D Printing News](https://3dprintingnews.com/2025/11/02/a-comprehensive-review-of-bambu-labs-best-selling-models/).)

**Most common / "generic" Bambu = a 256 × 256 × 256 mm bed.** Four of the five current models (A1, P1P, P1S,
X1C) share it, and the two single best-sellers — the **A1** (~$459) and **P1S** (~$699) — are both 256-class
([Bambu store](https://us.store.bambulab.com/collections/3d-printer); [MakerViking](https://www.makerviking.com/articles/bambu-lab-printer-comparison-x1-carbon-p1s-a1)).
The **A1 mini (180 × 180 × 180 mm)** is the **sole small-bed outlier** — but it is also the cheapest and very
common in schools/first-time makers, so we **verify fit on 180 mm too** (below). **Design target: the 256 mm bed;
guarantee everything also fits 180 mm.** The builder's assumption ("likely 256, but verify the mini is 180") is
correct on both counts.

---

## Fit check

**Head (~60–65 mm square) — fits comfortably on BOTH beds, trivially.**

| Bed | Head footprint uses | Free space per axis | Verdict |
|---|---|---|---|
| **256 × 256** | 65 / 256 ≈ **25 %** of the axis | ~191 mm | Fits with huge margin; can co-print head **+** both strap halves on one plate |
| **180 × 180** | 65 / 180 ≈ **36 %** of the axis | ~115 mm | Fits comfortably; print head alone, or head + one strap half |

Z is a non-issue: the tallest feature (~30 mm encoder knob, `07 §6`) is far under both 180 and 256 mm of Z height.
Print the head **flat** (rigid skin-plate on the plate, components-up — or vice-versa), per `05 §7` / `10`.

**Strap — the only real bed constraint, and it only bites on the 180 mm bed.** A full wrist band wraps
~**180–220 mm** of circumference (adult wrist 140–200 mm `[10]` + head + buckle overlap). What that means per bed
if you try to print the band as **one straight flat strip**:

| Bed | Straight strip along one axis | Diagonal reach (√2 × axis) | One-piece 180–220 mm strip? |
|---|---|---|---|
| **256 × 256** | ≤ **256 mm** | ~**362 mm** | **Fits straight** (220 mm leaves ~36 mm spare) — no trick needed |
| **180 × 180** | ≤ **180 mm** | ~**254 mm** | A 180 mm strip fits the axis **just barely**; a 200–220 mm strip does **NOT** fit straight → **print diagonally** (≤254 mm) **or split it** |

**Two clean fixes for the 180 mm bed (either removes the constraint entirely):**

- **Print the strap as two pieces** — the standard watch-strap split of a **long piece ~115 mm + short piece
  ~75 mm** ([Holben's strap-length guide](https://holbensfinewatchbands.com/pages/find-my-strap-length);
  [Crown & Buckle sizing](https://www.crownandbuckle.com/sizing)). Each half (≤ ~120 mm) fits the 180 mm bed
  along one axis with room to spare. This is the natural layout for a buckle strap anyway (buckle-half + holes-half).
- **It's segmented links** (`10` primary): each link is only **8–20 mm** long `[10]`, so you never need one long
  strip — lay the links out in **rows** on the plate (or print the band print-in-place as two short straight
  runs). Orientation is a non-issue for the links themselves; only a single 200 mm+ **assembled** strip would
  hit the 180 mm limit, and you simply don't lay it out that way.

**Orientation rules (unchanged from `10`):** band prints **flat, laid straight, no supports**, layer lines across
the band, **teardrop/flat-top pin bores**; head prints flat. **Net:** device fits both beds; on the 256 mm bed you
can put the head and the whole strap on one plate; on the 180 mm bed, print the strap in two halves (or the links
in rows). No part of this device is close to exceeding either Bambu bed.

---

## Strap: print option (PLA)

**Verdict: the segmented pin-hinge approach from `10` is the correct — and effectively the only — way to get a
wearable band in PLA. GO for segmented; NO-GO for any flexible one-piece PLA band.**

**Why a flexible one-piece PLA band is a no-go, and why no slicer trick rescues it:**

- **The material is the problem, not the geometry.** PLA's elongation-at-break is only ~**8 %** and it is brittle
  under cyclic strain; a plain-PLA **living-hinge / flexure band lasts ~50–200 flex cycles** before cracking,
  versus PETG 3–4 k, TPU 5 k+, nylon 10 k+ ([goodprints3d](https://www.goodprints3d.com/blogs/3d/best-filament-for-snap-fit-3d-prints-clips-latches-and-flexing-parts);
  [hotean](https://hotean.com/blogs/hotean-blog/design-a-3d-printed-living-hinge-for-10-000-cycles), both cited in
  `10 §D`). A wrist strap is flexed **every wear** → it would crack **during** the hackathon.
- **"Make it bendy with thin walls / low or gyroid infill" does NOT fix brittleness.** Dropping density/extrusion
  (e.g. gyroid at ~60 %) trades stiffness for a little compliance but **compromises strength, and PLA still cracks
  at the flex points at low density / thin walls** — the inherent brittleness works against you; guides advise
  *raising* wall count for functional PLA, not thinning it
  ([Ultimaker infill patterns](https://ultimaker.com/learn/mastering-3d-printing-infill-patterns-from-gyroid-to-lightning/)).
  A "springy thin PLA strip" is a fatigue crack waiting to happen, not a wearable band.
- **The one "trick" that genuinely works is mechanical, not material: print-in-place articulated links.** The band
  bends because **rigid links rotate on printed pivots**, not because the plastic flexes — so every duty cycle
  lands on a **rigid pin-in-hole** (PLA's home turf), never on a bent PLA web. This is exactly `10`'s primary
  (print-in-place segmented pin-hinge band + printed tang buckle + printed captive cross-pin at the lugs), with the
  separate-links-plus-push-pins fallback if a print-in-place joint fuses. Both are proven, single-material-gray,
  magnet-free, and low-risk in a 2-day build `[10]`.

So: **print the segmented/articulated band (print-in-place, or separate links + push-in pins) — do not attempt a
flexible one-piece PLA strap, and don't expect thin-wall/soft-infill settings to substitute for a flexible
material.** All clearances (0.30 mm pivot, Ø 2.5 mm pins, ≥2 mm knuckle walls, teardrop bores, tolerance coupon
first) are already tabulated in `10` — this file does not restate them.

---

## Strap: buy option (lug width + length)

If the builder buys a standard watch strap instead of printing one, the enclosure must be designed to a **standard
lug interface** so any off-the-shelf strap drops in.

**Lug width — the exact number the CAD must use: `lug_width = 22.0 mm` (inner gap between the two lugs = strap
width = spring-bar length).**

- Standard watch lug/strap widths are the **even sizes 18 / 20 / 22 / 24 mm**; **20 mm is the single most common**
  overall, **22 mm** the next ([Hewore lug guide](https://www.hewore.com/watch-lug-width-guide/) — also cited in
  `10`; [theSUPARV 18/20/22/24 guide](https://www.thesuparv.com/blogs/info/18mm-vs-20mm-vs-22mm-vs-24mm-watch-straps-what-s-the-right-size-for-you)).
- **Pick 22 mm for this device.** The head is oversized (~60–65 mm square — far larger than a typical 40–44 mm
  watch case), so a **22 mm** strap is proportionally right and gives a beefier, more load-bearing lug/pin to carry
  the tall, heavy head (`07` notes the ~30 mm knob and module stack). 22 mm is universally stocked. This also sits
  at the top of `10`'s recommended **20–22 mm** lug-gap range, so the **same lug geometry serves both the printed
  band and a bought strap.**
- **20 mm is the acceptable alternative** if maximum strap *selection* matters more than proportion (20 mm has the
  widest aftermarket range). Do **not** design an odd size (19/21 mm) — far fewer straps exist
  ([WatchGecko odd-lug advice](https://www.watchgecko.com/blogs/magazine/odd-lug-width-advice-19mm-or-21mm-lug-widths)).

**Spring bar vs printed pin (how the bought strap attaches):**

- A purchased strap comes with (or takes) a **spring bar**: a standard steel spring bar is **Ø 1.78 mm with 0.7 mm
  tips** ([WatchGecko spring bars](https://www.watchgecko.com/products/set-of-20-standard-diameter-replacement-watch-strap-spring-bars),
  cited in `10`). For tool-free swaps, buy **quick-release spring bars** — a finger-lever on the underside
  compresses one tip so the strap pops in/out in seconds, no tool, yet locks securely
  ([dupe.watch spring-bars/quick-release](https://dupe.watch/guides/spring-bars-quick-release);
  [Barton quick-release spring bars](https://www.bartonwatchbands.com/products/copy-of-spring-bars-packet-of-4)).
  A **22 mm lug takes a 22 mm spring bar** (bar length = lug width) — the widths must match exactly
  ([dupe.watch](https://dupe.watch/guides/spring-bars-quick-release)).
- **CAD detail for the lugs (buy path):** two lugs **22.0 mm apart** (inner faces), each with a **through-hole
  Ø ≈ 1.9 mm** to accept the Ø 1.78 mm spring-bar tips (or a blind ~1.0 mm dimple for the 0.7 mm tips). Because
  brittle PLA can blow out a thin spring-bar hole, keep **≥2 mm material around the hole**, fillet the lug roots,
  and prefer a **through-drilled lug + quick-release bar** over tiny blind dimples. NOTE this differs from the
  **printed** path's Ø 2.5 mm captive cross-pin through Ø 2.6 mm bores (`10`) — the **22 mm width is shared, but the
  pin/bore is chosen when you choose the strap path.**

**Strap length — what fits a wrist:** two-piece straps are quoted as **long-piece / short-piece (mm), excluding the
buckle**. Standard/"regular" ≈ **115/75 or 120/75 mm** (fits wrist ~165–185 mm / 6.5–7.3 in); short ≈ 105–110/70;
long ≈ 125–130/80–85; XL/XXL ≈ 210–235 total for large wrists
([Holben's length guide](https://holbensfinewatchbands.com/pages/find-my-strap-length);
[Crown & Buckle sizing](https://www.crownandbuckle.com/sizing);
[CNS sizing guide](https://cnswatchbands.com/blog/watch-strap-sizing-guide-lug-width-length-buckle-size/)). **Buy a
"regular" 22 mm strap** for the adult 140–200 mm design range; offer a long/XL for big wrists. A soft silicone or
nylon strap also satisfies `07 §4`'s "press the skin-plate firmly" requirement well (cinch it snug on the buckle).

**Where to buy (generic, in stock, ~$8–15):** **Barton Watch Bands** (silicone/nylon/leather quick-release in
16/18/20/22/24 mm, on their site and Amazon — [Barton 22 mm](https://www.bartonwatchbands.com/collections/22mm-watch-straps);
[Barton silicone quick-release on Amazon](https://www.amazon.com/Barton-Silicone-Black-Buckle-Crimson/dp/B06XWKWCY4));
**WatchGecko**, **Strapcode**, **Archer Watch Straps** ([quick-release straps](https://www.archerwatchstraps.com/en-us/collections/quick-release-straps)),
**Crown & Buckle**, **Delugs**; or a generic Amazon search for **"22 mm quick release watch band"** (silicone/nylon,
many sellers). Any of these drops onto 22 mm lugs.

---

## TPU note (flexible filament — option only; they have PLA now)

**Yes — TPU would change the print answer: with TPU you could print a *flexible one-piece* band (the exact thing
PLA cannot do), essentially a home-made silicone-style strap.**

- **TPU is flexible and fatigue-tolerant** (living-hinge/flex life 5 k+ cycles vs PLA's 50–200), so a thin one-piece
  TPU band flexes around the wrist without cracking ([hotean](https://hotean.com/blogs/hotean-blog/design-a-3d-printed-living-hinge-for-10-000-cycles)).
  One-piece flexible TPU watch bands are a proven, widely-printed model
  ([PrusaWatch modifiable TPU band, Printables](https://www.printables.com/model/129346-the-prusawatch-individually-modifiable-band-strap-)).
- **Hardness: use TPU ~95A for a watch band.** 95A is the "goldilocks" — flexible enough to wrap yet stiff enough
  to print reliably on a direct-drive machine (all Bambu are direct-drive); the softer **85A** is more silicone-like
  but buckles/jams and needs very slow speeds
  ([Siraya shore-hardness guide](https://siraya.tech/blogs/news/tpu-shore-hardness);
  [SpoolHound hardness chart](https://spoolhound.com/tpu-hardness-guide)).
- **Bambu can print TPU — but from an EXTERNAL spool, NOT through the AMS.** Bambu officially states TPU is **not
  AMS-compatible**; feed it from an external spool holder, print slow
  ([Bambu wiki TPU guide](https://wiki.bambulab.com/en/knowledge-sharing/tpu-printing-guide);
  [Siraya: TPU not for AMS](https://siraya.tech/blogs/news/how-to-print-tpu-on-bambu-lab-ams);
  [MatterHackers TPU on Bambu](https://www.matterhackers.com/about/how-to-print-tpu-and-flexible-filament-on-your-bambu-3d-printer)).
  The A1/P1S/P1P/X1 all handle 95A on a plain single spool; very soft grades need extra care on the A1.
- **Caveats:** TPU is a **second material** (breaks the single-gray-PLA event constraint — though a gray TPU strap
  keeps the colour), and even a one-piece TPU band still wants a buckle or the same 22 mm quick-release lug to
  close/adjust. **Flag only:** if TPU (ideally gray, 95A) becomes available at the event, print a **one-piece
  flexible TPU strap** and skip the articulated-link complexity; **with PLA only, stay with segmented links.**

---

## Recommendation

**Design the enclosure lugs to a 22.0 mm strap width — one number that keeps both paths open — and, with PLA-only
in hand, PRINT the segmented pin-hinge band as the primary; treat a bought 22 mm quick-release strap as a drop-in
upgrade if one can be obtained at the event.**

1. **Bed to design to:** the generic common Bambu is **256 × 256 × 256 mm** (A1, P1P, P1S, X1C); guarantee fit on
   the A1 mini's **180 × 180 × 180 mm** too. **The device fits both** — the ~60–65 mm head uses only 25 %/36 % of
   the axis; the only constraint is a one-piece 200 mm+ strap on the 180 mm bed, solved by **printing the strap in
   two ~115 mm/75 mm halves** (or the links in rows), or diagonally (≤254 mm).
2. **Strap, primary = PRINT segmented (per `10`).** It is the **guaranteed on-site, PLA-only, single-gray**
   option, already fully specced, and it puts every duty cycle on a rigid pivot. A flexible one-piece PLA band is a
   **no-go** (cracks in 50–200 cycles) and **no thin-wall/soft-infill trick** substitutes for a flexible material.
3. **Strap, upgrade = BUY a 22 mm quick-release strap** (silicone/nylon, ~$10 from Barton/WatchGecko/Amazon) **iff**
   one is actually available at the hackathon (can't rely on mid-event shipping). It is more comfortable, more
   secure, and **frees the printer** for the enclosure — and it drops straight onto the **same 22 mm lugs**. For the
   buy path, through-drill each lug **Ø ≈ 1.9 mm** for a standard/quick-release spring bar (≥2 mm wall around the
   hole); for the print path, keep `10`'s Ø 2.5 mm printed cross-pin. **The 22 mm width is common to both; pick the
   pin system when you pick the path.**
4. **TPU:** if flexible filament (gray **TPU 95A**, external spool — not AMS) turns up, print a **one-piece flexible
   TPU band** instead; otherwise segmented PLA.

**Exact lug width for CAD: 22.0 mm** (20.0 mm is the acceptable alternative for maximum strap selection). Freeze
this with the cage author (supersedes/pins `10 §S7`'s "20–22 mm" to **22 mm**), keep the lug parametric so the
Ø 1.9 mm (bought spring-bar) vs Ø 2.6 mm (printed cross-pin) bore is a one-line switch.

---

## Sources

| Tag | Source | URL |
|---|---|---|
| A1 mini 180×180×180 (official) | Bambu Lab A1 mini tech specs | https://bambulab.com/en/a1-mini/tech-specs |
| P1S 256 / A1 mini 180 (side-by-side) | 3DPros P1S vs A1 mini | https://3dpros.com/compares/bambu-lab-p1s-vs-bambu-lab-a1-mini |
| X1C / P1S / A1 all 256×256×256; P1S "best value" | MakerViking Bambu comparison | https://www.makerviking.com/articles/bambu-lab-printer-comparison-x1-carbon-p1s-a1 |
| A1 = 188 % more volume than A1 mini | All3DP A1 vs A1 mini | https://all3dp.com/2/bambu-lab-a1-vs-a1-mini-differences/ |
| P1P 256×256×256 (open-frame CoreXY) | Top3DShop P1P | https://top3dshop.com/product/bambu-lab-p1p-3d-printer |
| P1P specs | 3DPros P1P database | https://3dpros.com/printers/bambu-lab-p1p |
| "X1, P1, A1 all 256×256×256"; full-volume note | Bambu Lab Wiki — print volume | https://wiki.bambulab.com/en/knowledge-sharing/print-volume-limitations |
| A1 ~$459 / most accessible | Bambu Lab US store — A1 | https://us.store.bambulab.com/products/a1 |
| P1S ~$699 / best-selling enclosed | Bambu Lab US store — P1S | https://us.store.bambulab.com/products/p1s |
| Best-selling models; P2S replacing P1S | 3D Printing News (Nov 2025) | https://3dprintingnews.com/2025/11/02/a-comprehensive-review-of-bambu-labs-best-selling-models/ |
| #1 best-selling brand (lineup) | Bambu Lab US store — printers | https://us.store.bambulab.com/collections/3d-printer |
| Lug widths 18/20/22/24; 20 most common | Hewore lug-width guide | https://www.hewore.com/watch-lug-width-guide/ |
| 18/20/22/24 sizing by wrist/case | theSUPARV strap-size guide | https://www.thesuparv.com/blogs/info/18mm-vs-20mm-vs-22mm-vs-24mm-watch-straps-what-s-the-right-size-for-you |
| Avoid odd (19/21 mm) lug widths | WatchGecko odd-lug advice | https://www.watchgecko.com/blogs/magazine/odd-lug-width-advice-19mm-or-21mm-lug-widths |
| Spring bar Ø 1.78 mm / 0.7 mm tips | WatchGecko spring bars | https://www.watchgecko.com/products/set-of-20-standard-diameter-replacement-watch-strap-spring-bars |
| Quick-release spring bars — how they work; bar = lug width | dupe.watch spring-bars guide | https://dupe.watch/guides/spring-bars-quick-release |
| Quick-release spring bars (buy) | Barton Watch Bands | https://www.bartonwatchbands.com/products/copy-of-spring-bars-packet-of-4 |
| Strap length long/short (115/75 etc.), wrist ranges | Holben's strap-length guide | https://holbensfinewatchbands.com/pages/find-my-strap-length |
| Strap sizing (length categories, keeper) | Crown & Buckle sizing | https://www.crownandbuckle.com/sizing |
| Lug width + length + buckle sizing | CNS Watch Bands sizing guide | https://cnswatchbands.com/blog/watch-strap-sizing-guide-lug-width-length-buckle-size/ |
| Generic 22 mm quick-release straps (buy) | Barton 22 mm collection | https://www.bartonwatchbands.com/collections/22mm-watch-straps |
| Silicone quick-release 16–24 mm (buy, Amazon) | Barton silicone on Amazon | https://www.amazon.com/Barton-Silicone-Black-Buckle-Crimson/dp/B06XWKWCY4 |
| Quick-release straps (buy) | Archer Watch Straps | https://www.archerwatchstraps.com/en-us/collections/quick-release-straps |
| PLA elongation ~8 %; brittle, not for daily flex | goodprints3d filament for flexing parts | https://www.goodprints3d.com/blogs/3d/best-filament-for-snap-fit-3d-prints-clips-latches-and-flexing-parts |
| Living-hinge life: PLA 50–200 vs TPU 5k+ | hotean living-hinge guide | https://hotean.com/blogs/hotean-blog/design-a-3d-printed-living-hinge-for-10-000-cycles |
| Gyroid/low-infill trades strength for flex; raise walls for PLA | Ultimaker infill patterns | https://ultimaker.com/learn/mastering-3d-printing-infill-patterns-from-gyroid-to-lightning/ |
| TPU not AMS-compatible; external spool | Bambu Lab Wiki — TPU guide | https://wiki.bambulab.com/en/knowledge-sharing/tpu-printing-guide |
| TPU from external spool, not AMS | Siraya — TPU on Bambu AMS | https://siraya.tech/blogs/news/how-to-print-tpu-on-bambu-lab-ams |
| TPU 95A "goldilocks" for wearables; 85A harder to print | Siraya shore-hardness guide | https://siraya.tech/blogs/news/tpu-shore-hardness |
| 85A vs 95A hardness chart | SpoolHound TPU hardness | https://spoolhound.com/tpu-hardness-guide |
| One-piece flexible TPU watch band (proven) | PrusaWatch TPU band, Printables | https://www.printables.com/model/129346-the-prusawatch-individually-modifiable-band-strap- |
| TPU on Bambu (external spool, slow) | MatterHackers TPU on Bambu | https://www.matterhackers.com/about/how-to-print-tpu-and-flexible-filament-on-your-bambu-3d-printer |

---

**Bottom line:** The generic common Bambu bed is **256 × 256 × 256 mm** (A1, P1P, P1S, X1C); the A1 mini is the lone
**180 × 180 × 180 mm** small bed. **The device fits both** — the ~60–65 mm head uses ≤36 % of either axis; the only
catch is that a one-piece 200 mm+ strap won't fit straight on the 180 mm bed, so print the strap in two ~115/75 mm
halves (or the links in rows), or diagonally (≤254 mm). **Strap: design the lugs to `22.0 mm` and PRINT the
segmented pin-hinge band** (single-material gray PLA, guaranteed on-site, already specced in `10`) — a flexible
one-piece PLA band is a no-go and no slicer trick fixes it. **If a 22 mm quick-release silicone/nylon strap is
obtainable at the event, buy it** (~$10, Barton/WatchGecko/Amazon) as a more-comfortable drop-in on the same 22 mm
lugs. If flexible **TPU 95A** turns up, a one-piece printed TPU band becomes the best of both worlds.
