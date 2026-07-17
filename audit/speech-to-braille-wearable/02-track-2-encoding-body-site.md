# 02 — Track 2: Vibrotactile Braille Encoding, Timing & Body-Site Science

**Type:** Phase 1 research audit (RESEARCH ONLY — no code, no CAD, no plan)
**Date:** 2026-07-17
**Author:** Track 2 (encoding / timing / body-site)
**Feeds:** Phase 2 executable plan; Phase 3 CAD spec (motor placement).

> Every load-bearing number below carries a primary-source citation (DOI/arXiv/venue + URL).
> Where a figure came only from a search-engine abstract or a publisher-blocked page, it is
> explicitly marked **[secondary]** or **[unverified]**. Do not promote marked figures to fact
> without reading the source PDF.

---

## Scope

Verify, from peer-reviewed and reputable-industry sources, the perceptual science under the
**locked** decisions (see `00-grilling-locked-decisions.md`):

- The **encoding scheme** ("Columns × 3 row-beats": Motor A = left column dots 1·2·3, Motor B =
  right column dots 4·5·6, three timed beats top→mid→bottom, empty rows keep a silent slot, fixed
  3 beats/letter) — ranked against (a) strict one-motor-at-a-time sequential and (b)
  1-motor-dots + 1-motor-delimiter.
- The **central claim** idea.md uses to justify "sequential": a study reporting **≈93 %
  sequential vs ≈26 % simultaneous** recognition. Find it, confirm what "simultaneous" meant,
  and rule on whether the 26 % figure applies to **two widely-separated** wrist motors fired in
  one beat (the grilling flagged this as a probable non-sequitur).
- **Timing constants** (buzz, inter-beat, inter-letter, inter-word) with citations; resulting
  reading speed.
- **Delimiters & A–Z sufficiency.**
- **Body site** (wrist vs forearm vs glove/fingertip) with *both* two-point-discrimination and
  vibrotactile-localization distances (they differ), and a corrected **motor-spacing minimum**.
- A **day-of wear-test checklist** for what research cannot settle in advance.

I did not touch firmware, enclosure geometry, or the plan. I do not re-litigate the human's
locked calls; I cite evidence for/against and flag contradictions.

---

## Verdicts / evidence

### 1. The 93 %/26 % study — found, and the 26 % is being misused

**Source found:** Yeganeh, Fantin, Torresen, et al. (2024). *"Discrimination Accuracy of
Sequential Versus Simultaneous Vibrotactile Stimulation on the Forearm."* **Applied Sciences
14(1):43. DOI 10.3390/app14010043** — <https://www.mdpi.com/2076-3417/14/1/43>.

What it actually did:

- **2 × 3 array of voice-coil actuators** (Lofelt L5) on the **upper forearm**, 100 Hz. [primary; array
  detail corroborated across MDPI abstract + the same group's sleeve papers]
- **"Simultaneous"** = every actuator of a multi-dot Braille-like pattern fires **together for
  1000 ms**. **"Sequential"** = the pattern's active dots fire **one at a time, 500 ms each with a
  450 ms gap.**
- **Sequential 93.24 % vs simultaneous 26.15 %** whole-pattern recognition.
- **Patterns using 2–3 active actuators were recognized more accurately than 4–5-actuator
  patterns**; strong **primacy/recency** and **learning** effects.

**Ruling on the grilling's non-sequitur flag — CONFIRMED. The 26 % does NOT apply to two
far-apart wrist motors.** Reasons:

1. **"Simultaneous" there means an entire 2–5-dot pattern lit at once across a small array**, and
   26 % is the accuracy of naming *which multi-dot pattern* it was. That is a spatial-pattern
   *identification* task among many confusable patterns on a low-acuity site — a completely
   different question from "did one point fire, or two?"
2. The array was **tightly clustered** (the same group's optimum-spacing study lands at ~20 mm
   center-to-center for these voice coils — see §5; the 2×3 array was on that order **[reasoned
   inference; exact array pitch not extractable — MDPI full text blocked to WebFetch, mark
   [unverified]]**). At ~20 mm, simultaneous multi-dot firing blurs *because the dots overlap in
   space*, which is exactly what a 2-motor / far-apart design is built to avoid.
3. What the study *does* legitimately support for this project is narrower and still useful:
   **(a)** time-separating dots beats space-packing them (validates the whole 2-motor,
   time-multiplexed direction); **(b)** **fewer active elements per instant read better** (2–3 ≫
   4–5) — an argument for **not** firing both motors at once when it can be avoided; **(c)** the
   500 ms/450 ms cadence is a *real, validated* operating point (§3).

> **Bottom line:** idea.md's "sequential 93 % vs simultaneous 26 %, therefore sequential wins" is
> a *true study, wrong lever.* The 26 % is a tight-array multi-pattern-confusion figure, not
> evidence about two separated motors. The correct evidence about "two far-apart motors fired
> together" comes from the two-point-discrimination literature (§4–5), and it tells a more
> nuanced — and partly cautionary — story.

### 2. Encoding schemes — ranked

The question the 2-motor design actually hinges on: **when a Braille row contains *both* its
column dots, the locked scheme fires *both motors in the same beat*. Is that read as "two points"
(→ "both") rather than "one point" (→ left-only / right-only)?** I counted the alphabet: **~18 of
26 letters contain at least one "both-column" row** (c d f g h j m n p q r t u v w x y z). So the
simultaneous-two-point percept is the **common case, not an edge case** — it is load-bearing for
the locked scheme.

| Rank | Scheme | Speed | Perceptual robustness | Verdict |
|---|---|---|---|---|
| **1 (recommended default)** | **Locked "Columns × 3 beats"** | Best — fixed **3 beats/letter** | Good **except** the ~18/26 letters whose rows fire **both** motors at once, which relies on simultaneous 2-point discrimination at the achievable wrist spacing (§5) | **Keep it** — aligns with the human's structural logic (2 motors ↔ 2 columns), is ~2× faster than strict-sequential (decisive given the brutal 3–4 wpm ceiling, §3), and its one weak case is *mitigable inside the scheme* (see micro-stagger, below). Ship conditional on the both-fire wear test (§ Residual risk). |
| 2 (safest, designated fallback) | **Strict one-motor-at-a-time sequential** (each present dot gets its own beat; up to 6 beats/letter) | Worst — up to 6 beats/letter (~2× slower) | **Highest** — every beat is a single unambiguous source; never needs 2-point discrimination; this is *exactly* the paradigm Yeganeh measured at 93.24 % | Use as the **fallback** if the both-fire percept fails the wear test and micro-stagger doesn't rescue it. Perceptually the most defensible, but the speed cost is severe at this baseline. |
| 3 (weakest) | **1-motor-dots + 1-motor-delimiter** (Motor A pulses dots/counts, Motor B marks boundaries) | Poor — A must encode 6 positions in time alone | Mediocre — high counting/working-memory load; throws away the natural column mapping | **Not recommended.** Spends a whole motor on delimiting, forces serial counting on the other, and gains nothing the inter-beat/inter-letter *gaps* don't already give for free. |

**Recommended rendering of "both-dot" rows — a mitigation that stays inside the lock.** The
evidence (Yeganeh: sequential ≫ simultaneous; 2–3 elements ≫ 4–5) plus the 2-point caution (§5)
converge on this: render a both-columns row **not as a simultaneous double-buzz** but as a
**micro-staggered left-then-right pulse** (Motor A leads Motor B by ~80–120 ms within the same
beat). This keeps **3 beats/letter and the 2-column model intact**, but converts the perceptually
hardest event ("are there two points here?") into an easy temporal order ("left, then right"),
which the low-acuity wrist handles well. **Wear-test simultaneous first (simpler); if "both" vs
"one" is unreliable, switch that row type to micro-stagger.** This is a tuning choice within the
locked scheme, not a re-litigation of it.

### 3. Timing constants (cited) and resulting reading speed

| Parameter | Recommended default | Acceptable range | Basis / citation |
|---|---|---|---|
| **Buzz (beat on-time)** | **350–400 ms** | 200–500 ms | Yeganeh 2024 used **500 ms** at 93.24 % [primary]. arXiv 2308.05497 used **200 ms** ERM pulses for 2-point work [primary]. **ERM floor:** coin-ERM rise+stop lag ≈ 40 ms + 40 ms (Precision Microdrives / patent lit) [industry] → keep buzz **≥ ~150 ms** or it feels mushy on an ERM. |
| **Inter-beat gap (ISI, between the 3 rows)** | **300 ms** | 50–700 ms | Yeganeh 2024 used **450 ms** at 93.24 % [primary]. The group's ISI follow-up reports short (2–3-actuator) patterns peak at **~300 ms**, with 92–98 % across **50–700 ms** [secondary — see Grounding]. Must exceed ERM spin-down so beats don't merge. |
| **Inter-letter gap** | **800 ms** | 700–1000 ms | No direct study; **reasoned** from pattern-segmentation (must be clearly > inter-beat gap, ≥ ~2×, so letters chunk). Mark [reasoned]. |
| **Inter-word gap** | **1500 ms** (or a distinct rhythmic cue) | 1200–2000 ms | **Reasoned** (must be clearly > inter-letter gap). A long silence is simplest and least ambiguous; a distinct cue is optional (§ Delimiters). Mark [reasoned]. |

**Vibration frequency:** target the **~150–250 Hz** Pacinian sensitivity band. Coin ERMs couple
frequency to amplitude (you don't set them independently), but the relevant studies ran 100 Hz
(Yeganeh), 131 Hz (arXiv 2308.05497), and 186 Hz (Exp Brain Res 2019) — all comfortably felt on
the arm, so the AX22 ERM's native band is fine. [primary]

**Resulting reading speed** (locked 3-beat scheme; a beat = buzz + inter-beat gap, last gap
replaced by the inter-letter gap):

- **Default (400 / 300 / 800 / 1500):** ≈ **2.6 s/letter → ~23 letters/min**; a 5-letter word +
  word-gap ≈ 13.7 s → **~4.4 words/min.**
- **Conservative (500 / 450 / 800 / 1500, the study-exact cadence):** ≈ **3.2 s/letter → ~19
  letters/min → ~3.4 words/min.**
- **Net: ~19–23 letters/min, ~3.4–4.4 words/min.** This **independently reproduces the grilling's
  ~3 s/letter and ~3–4 wpm arithmetic and confirms the keyword-condensation policy is mandatory** —
  buzzing full sentences is not demo-viable; 1–3 condensed keywords buzz in ~10–40 s.
- **Ceiling reference:** the fastest trained readers on **UbiBraille** (6 actuators, one per dot,
  whole cell delivered simultaneously to the fingers) hit **~1 character/second** (~60 letters/min)
  with word-recognition up to 93 % (Nicolau et al., ASSETS '13, DOI 10.1145/2513383.2513437). That
  rate needs 6 actuators and trained users; it is **not** attainable with 2 time-multiplexed motors,
  which is a structural ~3× slowdown — another reason the keyword policy is the right call.

### 4. Delimiters & A–Z sufficiency

- **Inter-letter delimiter:** a **silent gap clearly longer than the inter-beat gap** is the
  simplest robust boundary and is what the timing table encodes. Because every letter is a **fixed
  3 beats**, the reader has a second, redundant cue (beat-count), which makes segmentation more
  forgiving. Keep it silence-based.
- **Inter-word delimiter:** **extended silence (default)**. If wear-testing shows silence alone is
  confused with a long inter-letter gap, add a **distinct rhythmic cue** — e.g., a single long
  both-motor buzz, or a short double-tick on both motors — which is discriminable from a normal
  beat by *duration/rhythm* rather than by spatial pattern. Silence-first keeps the vocabulary
  minimal.
- **A–Z sufficiency — CONFIRMED for this use case.** The locked "spell numbers out, no
  number-sign, no punctuation" rule is sound: the keyword-condensation step already emits words,
  not codes, so digits/punctuation are unnecessary. This holds the symbol set to **26 letters + 2
  delimiters**, which maximizes learnability on a low-bandwidth channel. (The A–Z *dot-pattern
  table itself* must be validated against an authoritative Braille chart — that is **Track 3's**
  acceptance item, not a Track 2 perceptual question.)

### 5. Body site — wrist confirmed; motor-spacing minimum corrected

**Two families of distance that idea.md partly conflated — they are different measurements:**

| Measure (what it asks) | Fingertip | Palm | Volar forearm | Around the wrist |
|---|---|---|---|---|
| **Mechanical 2-point discrimination** — *are these two static touches two?* (Weinstein 1968 body map) | ~2–4 mm | ~10 mm | **~40 mm** | ~30–40 mm |
| **Point-localization threshold** — *is this the same spot I was just touched?* (much finer than 2PD; Cholewiak/Collins-style) | — | — | **~9–10 mm** | — |
| **Vibrotactile 2-point, lab, 90 % recognition** — *two buzzers felt as two?* 10 mm ERM, 131 Hz, 200 ms, 0.5 N (arXiv 2308.05497) | — | — | **36.6 mm** (vs **20.7 mm** static in the same paper) | ~ (transverse) |
| **Vibrotactile 2-point, wearable/field, ~96 %** — coin ERM around the wrist (ACM 3743721) | — | — | — | **~90 mm transverse** for best (96 %); onset only ~40 mm |
| **ERM interference-free separation** — two ERMs act as *independent* sites (Exp Brain Res 2019 / PMC6640119, 10 mm ERM 310-117) | — | — | **≥ 80 mm** | — |
| **Voice-coil relative-localization optimum** — focused actuators (Actuators 2023, 12(1):6, Lofelt L5) | — | — | **~20 mm** | — |

Citations: Weinstein 1968 (classic body map, via multiple reviews e.g. Frontiers Hum. Neurosci.
2013, 10.3389/fnhum.2013.00579) [secondary for the exact numbers]; Cholewiak & Collins 2003,
*Perception & Psychophysics* 65(7):1058, **DOI 10.3758/BF03194834** [primary];
**arXiv:2308.05497** "Measuring the Spatial Acuity of Vibrotactile Stimuli" — <https://arxiv.org/html/2308.05497>
[primary]; **ACM 10.1145/3743721** "Two-Point Discrimination of Vibrotactile Stimuli on the
Forearm," Proc. ACM HCI, 2025 — <https://dl.acm.org/doi/10.1145/3743721> [primary; per-distance %
[secondary]]; **Exp. Brain Res. 2019, 10.1007/s00221-019-05564-5 / PMC6640119** [primary];
**Actuators 2023, 10.3390/act12010006** — <https://www.mdpi.com/2076-0825/12/1/6> [primary].

**Key facts that reshape the spacing rule:**

1. **Vibration needs roughly DOUBLE the mechanical 2-point distance.** arXiv 2308.05497 measured,
   in the same subjects, static 2-point at **20.7 mm** but **vibrotactile** 2-point at **36.6 mm**
   (both 90 % recognition). idea.md's "~40 mm on the forearm" is the *static* (Weinstein) number;
   the *vibrotactile* number is worse. This is the distinction idea.md was missing.
2. **Coin ERMs (the AX22-0013 type) spread vibration widely** and only behave as **independent
   sites beyond ~80 mm** (Exp Brain Res 2019). Focused voice coils are far tighter (~20 mm optimum,
   Actuators 2023) — **do not** borrow voice-coil spacing figures for ERM hardware.
3. **Anisotropy: transverse (around the wrist) beats longitudinal (along the forearm).** Both the
   ACM wrist study (96 % transverse) and arXiv 2308.05497 (vertical/longitudinal "significantly
   worsened") agree. **This validates the locked thumb-side/pinky-side (transverse) placement over
   the "spaced along the forearm" alternative idea.md also floated.**
4. **Localization is best at anchor points (wrist, elbow).** Cholewiak & Collins 2003 found a
   7-tactor, 25 mm-pitch array on the volar forearm was **unlocalizable at the array middle (~40 %
   correct)** but accurate near the wrist/elbow. **Placing motors at the wrist joint helps.**

**Ruling on the locked ~40–50 mm thumb/pinky spacing:** it sits **at the optimistic lab floor
(near 36.6 mm, 90 %) but well below the field-reliable ~90 mm** for ERM two-point around the wrist,
and **below the ~80 mm ERM independence threshold.** Because ~18/26 letters fire both motors in a
beat, this matters. **Recommendation:**
- **≥ 40 mm is the absolute floor; treat 40–50 mm straight-line as *marginal* and wear-test it.**
- **Push separation as large as the wrist allows.** Thumb-side↔pinky-side is the right *axis*
  (transverse, learnable left/right map), but the **straight-line radial↔ulnar distance is capped
  by wrist width (~45–55 mm)**. Route the motors to **opposite aspects** (e.g., dorsal-radial vs
  volar-ulnar, or top vs bottom) so the **surface path** the vibration travels approaches
  **~70–90 mm**, into the reliable zone — at the cost of a slightly less literal left/right map.
- **Watch bone conduction:** two motors on opposite wrist faces can couple *through* the wrist and
  make "one" feel like "both." Wear-test this specifically.
- The **micro-stagger** rendering (§2) is the cheapest insurance if spacing can't be grown enough.

**Form factor — wristband CONFIRMED.** idea.md's reasoning holds:
- **Fingertip/glove is correctly rejected.** The fingertip's spatial advantage is for *reading
  raised dots by sliding*, not for resolving two buzzers: a 10 mm ERM stimulates the whole
  fingertip, so you cannot place two distinct motor points on one finger. idea.md's argument is
  well-founded.
- **The wrist's poor spatial acuity is largely moot** *for the beats where only one motor fires*
  (time carries the information, not space) — but note the **caveat**: it is **not** fully moot,
  because the locked scheme's common both-fire beats *do* depend on wrist 2-point discrimination.
  idea.md over-generalized "spatial resolution doesn't matter"; it matters for ~18/26 letters.
- Wearability, all-day comfort, watch-form precedent, and existing forearm/wrist vibro-Braille
  bands all favor the wrist. **Keep the wristband.**

---

## What changed vs `plan/idea.md`

| idea.md claim | Verdict | Correction |
|---|---|---|
| "sequential ≈93 % vs simultaneous ≈26 %, so sequential is *better*" | **Study real, figure misapplied** | Yeganeh 2024 (app14010043) is genuine, but "simultaneous" = a whole multi-dot pattern lit at once on a **tight** 2×3 array; 26 % is multi-pattern-confusion accuracy. It says **nothing** about two far-apart motors. **Grilling's non-sequitur flag = confirmed.** The real "two motors at once" question is answered by 2-point-discrimination data (§5), which is a *different* and partly cautionary story. |
| "~500 ms buzz / ~450 ms gap starting point" | **Verified; came straight from the study** | Those are Yeganeh 2024's exact sequential parameters (93.24 %). **Refined:** inter-beat optimum ~**300 ms** (faster, ≥ equal accuracy) [secondary]; buzz can drop to ~**350–400 ms** given the ERM ~150 ms clean-pulse floor. idea.md's numbers are safe-conservative, not wrong. |
| "motors ~40 mm min, up to 80–90 mm" | **Right magnitude, well-sourced** | Confirmed, **and sharpened**: vibrotactile 2-point needs ~**2×** the static distance (36.6 vs 20.7 mm); ERMs need **≥80 mm** to be independent; **~90 mm transverse** for field-reliable. So **40–50 mm is marginal**, not comfortable — grow it via opposite-aspect placement and wear-test. |
| "wrist's poor spatial resolution doesn't matter (dots separated in time)" | **True only for single-motor beats** | The locked encoding fires **both** motors together on ~18/26 letters, so spatial 2-point *is* load-bearing. Claim is over-generalized. |
| "spaced along the forearm" as an equal placement option | **Overturned in favor of transverse** | Evidence: transverse/around-wrist beats longitudinal/along-arm (ACM 3743721; arXiv 2308.05497 anisotropy). The locked thumb/pinky (transverse) choice is the *better* one. |
| Fingertip motors can't give two points; glove rejected | **Confirmed, well-founded** | No change. |
| "under 1 mm fingertip" two-point | **Slightly optimistic** | Classic static fingertip 2PD is ~2–4 mm (Weinstein); <1 mm applies to *grating/moving* acuity, not the static two-point test. Minor. |

Also note the **stale idea.md framings** already caught by the grilling and reconfirmed here: the
"motors arrive Saturday" risk is dead (parts in hand), and the timing scheme is no longer "the main
open question" — it is specified here with citations.

---

## Grounding notes

**Primary sources actually read/abstracted (peer-reviewed unless noted):**

- Yeganeh et al. 2024, *Applied Sciences* 14(1):43, **10.3390/app14010043** — the 93/26 study.
- arXiv:2308.05497, "Measuring the Spatial Acuity of Vibrotactile Stimuli" — VT-2PD **36.6 mm**
  vs static **20.7 mm** (90 %), 10 mm ERM, 131 Hz, 200 ms, 0.5 N. **[read via open arXiv HTML]**
- ACM Proc. HCI 2025, **10.1145/3743721**, "Two-Point Discrimination of Vibrotactile Stimuli on
  the Forearm" — coin ERM, distances {0,15,30,45,60,75,90 mm}, transverse best 96 % at 90 mm.
- Exp. Brain Res. 2019, **10.1007/s00221-019-05564-5** (PMC6640119) — 10 mm ERM interference
  "negligible only with separations > 8 cm"; sequential > simultaneous frequency discrimination.
- Cholewiak & Collins 2003, *Percept. Psychophys.* 65(7), **10.3758/BF03194834** — arm
  localization, anchor points, 25 mm pitch unlocalizable mid-array.
- Actuators 2023, **10.3390/act12010006** — Lofelt L5 voice-coil optimum ~**20 mm** on forearm.
- Nicolau et al. 2013, ASSETS '13, **10.1145/2513383.2513437** — UbiBraille, ~1 char/s ceiling.

**Secondary / partially-verified (publisher HTML blocked WebFetch with 403/redirect; figures came
from search abstracts — flagged in-text as [secondary]):**

- The **~300 ms ISI optimum / 92–98 % over 50–700 ms** for short patterns (Yeganeh ISI line of
  work: VRIH 2025 **10.1016/j.vrih.2025.06.001**; Sensors 2026 26(9):2664 **10.3390/s26092664**).
  I could not open either full text; the "300 ms peak" is from a search abstract. **Confidence:
  medium.** The *firm* anchor is Yeganeh 2024's directly-used **450 ms** (93.24 %); my 300 ms
  recommendation is an optimization on top of a validated value, safe under both.
- The **per-distance success %** in ACM 3743721 (exact 45 mm / 60 mm numbers) — abstract-level
  only; the ACM PDF and HTML both 403'd. The **shape** (transverse ≫ longitudinal, ~90 mm best) is
  firm; the exact 45 mm % is **[unverified]**.
- **Weinstein 1968** exact per-site 2PD values are quoted via review papers, not the original 1968
  book chapter. Magnitudes (forearm ~40 mm, palm ~10 mm, fingertip few mm) are textbook-stable.
- The **exact center-to-center pitch of Yeganeh 2024's 2×3 array** — not extractable (MDPI full
  text blocked). Inferred ~20–25 mm from the same group's optimum-distance work. **[unverified]**;
  the §1 ruling does not depend on the exact value.

**ERM lag (~40 ms rise / ~40 ms decay; 20–30 ms startup):** industry/patent sources (Precision
Microdrives app notes AB-028; ERM-optimization patents). Directionally reliable; the AX22-0013's
own datasheet is a **Track 3** item.

**Overall confidence:** High on the direction (time-multiplex 2 motors, sequential cadence,
transverse wrist placement, keyword-only throughput). High on the *non-sequitur ruling*. Medium on
the exact 40–50 mm both-fire reliability — that is genuinely a measurement, not a literature
lookup, and is routed to the wear test.

---

## Residual risk & day-of wear-test checklist

**Standing risks (perceptual, unresolvable from literature alone):**

| Risk | Severity | Why literature can't close it |
|---|---|---|
| The **common both-fire beat** ("both" vs "one") may not be discriminable at the achievable wrist spacing (~40–55 mm straight-line) | **High** | Field VT-2PD wants ~90 mm; lab floor ~37 mm; the real wrist, real ERM, real strap pressure sit in between and depend on this specific arm/skin/coupling. Must be measured. |
| **Bone conduction** across the wrist makes opposite-side "one" feel like "both" | Medium–High | Depends on wrist anatomy and motor coupling; not in the papers. |
| **ERM spin-up/down** blurs adjacent beats at the shorter (300 ms) gaps | Medium | AX22-0013's actual lag unknown until tested. |
| **Silent-row slot** (empty row) may not be *felt as elapsed time*, breaking the fixed-3-beat parse | Medium | The whole scheme assumes a silent beat reads as "gap here"; unverified on this hardware. |
| Inter-word vs inter-letter gap confusion | Low–Medium | Segmentation thresholds are person-specific. |

**Day-of wear-test checklist (do these on a real wrist, in this order — they gate the CAD and the
firmware constants):**

1. **BOTH-FIRE GATE (highest priority).** At the printed spacing, present all four beat states
   blind — {silent, left-only, right-only, both} — ≥ 20 randomized trials. **Target >90 % on the
   "both vs one" contrast.** If it fails → try (2), then micro-stagger, then fall back to strict
   sequential. *This single test decides whether the locked encoding ships as-is.*
2. **Spacing sweep.** Test 40 / 50 / 60 mm and opposite-aspect placements (dorsal-radial vs
   volar-ulnar; top vs bottom). Pick the **largest** separation that fits the wrist and passes (1).
3. **Micro-stagger check.** Render both-dot rows as left-leads-right by 80–120 ms; confirm it
   reads as an easy "left-then-right" and beats the simultaneous version. Keep whichever wins.
4. **Coupling/pressure.** Confirm strap tension keeps **firm, consistent** skin contact for *both*
   motors across wrist rotation, arm-resting-on-table, and arm-raised. Loose contact kills the
   percept (pressure strongly affects vibrotactile thresholds).
5. **Buzz feel.** Confirm 350–400 ms reads as a **clean discrete pulse** on the AX22 ERM (not
   mushy/laggy). If mushy, lengthen toward 500 ms.
6. **Inter-beat gap.** Confirm consecutive beats **don't merge** at 300 ms (ERM spin-down); raise
   toward 450 ms if they blur.
7. **Silent-slot perception.** Confirm an empty row is felt as "a beat of nothing," so top/mid/
   bottom stays unambiguous. If silent rows vanish, add a faint boundary tick or widen gaps.
8. **Letter & word segmentation.** Have a naive helper count letters and word boundaries from the
   buzzing alone; tune inter-letter (≥ ~2× inter-beat) and inter-word (long silence, or add the
   distinct cue from § Delimiters) until counting is reliable.
9. **Bone-conduction check.** With one motor firing, confirm the *other* side is quiet (no
   through-wrist leakage that mimics "both").

**Acceptance reminder (from lock #9):** success is *pattern-matches-screen*, checkable by any
sighted operator against the caption + a printed Braille chart — so these wear tests are about
**signal clarity**, not about training a reader. They can all be run by the build team.
