# 01 — Track 1: Problem, Prior Art & Competitive Landscape

**Track:** 1 of 4 (Research phase)
**Scope owner:** Problem grounding, prior art, competitive landscape, novelty honesty
**Date:** 2026-07-17
**Status:** Research only — no code, no design, no plan.
**Source docs read:** `plan/idea.md`, `audit/speech-to-braille-wearable/00-grilling-locked-decisions.md`

> This file backs (or corrects) the *problem/market/prior-art* claims in `plan/idea.md` with
> independently verified, cited primary sources. It does **not** re-litigate the human's LOCKED
> decisions (file `00`); where evidence bears on a locked decision, it is flagged as cross-track
> context only. Motor-spacing physics and latency are Tracks 2/4 — cited here only where a source
> surfaced during prior-art work.

---

## Scope

What I investigated:

1. **The generalized problem** — deafblind / dual-sensory-loss two-way communication in *everyday*
   interactions (retail, transit, public services, workplace, social), not the café vignette as scope.
2. **Population & "under-served" claim** — is this demographic real, sizeable, and genuinely
   poorly served?
3. **Prior art map** — refreshable Braille displays, vibrotactile Braille bands/gloves/rings,
   sound-to-vibration sensory-substitution wearables, deafblind communication devices, and the
   most recent (2024–2025) speech→Braille projects.
4. **Buildability filter** — which existing approaches are too expensive / mechanically complex
   for a 2-day, no-solder, commodity-hardware build, and why.
5. **Claim-by-claim challenge** of `plan/idea.md`'s validation notes.
6. **Pitch-honest novelty** — what this project can truthfully claim versus what a sharp judge
   who knows the field will demolish.

---

## Verdicts / evidence

### A. Rewritten GENERALIZED problem statement

**Deafblindness / dual-sensory loss removes the two channels—vision and hearing—that mediate
almost all spontaneous, face-to-face exchanges with strangers.** In everyday, unscripted
interactions—paying at a till, asking a transit official which platform, confirming an
appointment at a service desk, a quick exchange with a colleague, small talk—a deafblind person
typically cannot independently (a) receive what a sighted-hearing stranger just said, nor
(b) reply in a way that stranger understands, because the stranger almost never knows Braille,
tactile sign, or the Lorm alphabet. Today this gap is bridged mainly by a human intermediary
(interpreter / support-service provider) or a companion, which is costly, scarce, and eliminates
privacy and independence. The unmet need is a **portable, self-operated, two-way channel** that
(i) delivers the gist of incoming speech to the deafblind user through touch, and (ii) lets them
emit an intelligible spoken reply without a full Braille keyboard or a human relay. *(The café/waiter
scene in `idea.md` is one instance of this general pattern, not the product's scope.)*

**Evidence the problem is real and the demographic is under-served — CONFIRMED:**

- Deafblindness affects an estimated **0.2%–2% of the global population**, with ~0.2% living with
  a *severe* form; the World Federation of the Deafblind's first Global Report (2018) concluded the
  group's issues "have largely been ignored" and that people with deafblindness are being
  "left behind." *(WFDB, "At risk of exclusion from CRPD and SDGs implementation," Global Report 2018,
  http://www.wfdb.eu/wp-content/uploads/2019/04/WFDB-global-report-2018.pdf ; 2nd Global Report 2023,
  https://wfdb.eu/wp-content/uploads/2023/03/ENG_WFDB-2nd-Global-Report_-FINAL-V6.pdf )*
- **UK (host country): ~450,000 deafblind people (2022), projected >610,000 by 2035**; prevalence is
  higher among those aged over 70. *(Sense UK, "Deafblindness statistics in the UK,"
  https://www.sense.org.uk/about-us/research/deafblindness-statistics-in-the-uk/ )*
- **US: ~45,000–50,000 identified deafblind; >1.5 million with dual sensory loss.** *(Library of
  Congress / NLS, "Deafblindness,"
  https://www.loc.gov/nls/services-and-resources/informational-publications/deafblindness/ )*
- Support is scarce and expensive: support-service provision reaches only a small fraction of the
  population, and a large majority go without dedicated support. *(Reported prevalence-of-support
  figures — e.g. "≈15% use Braille," "≈60% without support" — recur in secondary literature
  summarizing the field; treat the exact percentages as **secondary/indicative**. The primary,
  high-confidence claim "under-served" is carried by WFDB + Sense above.)*

**Important market nuance (pitch honesty):** the *largest* deafblind sub-population is **age-related
dual sensory loss** in older adults, who are typically **not Braille readers**. Any Braille-based
device—refreshable or vibrotactile—addresses the **Braille-literate subset**, not "all deafblind
people." *(Minhas et al., "Prevalence of Individuals With Deafblindness and Age-Related Dual-Sensory
Loss," *Journal of Visual Impairment & Blindness* 2022,
https://journals.sagepub.com/doi/abs/10.1177/0145482X211072541 ; Sense demographics above.)*
Frame the pitch as *"for Braille-literate deafblind people"*, not the whole demographic.

---

### B. Competitive / prior-art matrix

Legend for "2-day fit": ✗ = not achievable in a hackathon; ~ = partially/with heavy simplification;
✓ = comparable to our build. "Ours differs" is stated pitch-honestly.

| Existing solution | What it does | Cost / complexity | 2-day build fit | How OUR approach differs |
|---|---|---|---|---|
| **Refreshable Braille displays** (piezo pin arrays; Orbit, HumanWare, etc.) | Raise/lower physical pins so a Braille reader reads text by touch (one-way, reading only) | Piezo cell ≈ **US$35 OEM / ~$4.38 per dot**; commercial displays **$4k–6k (40-cell) to $8k–12k (80-cell)**; precision mechanical actuators | **✗** — cost + mechanical precision impossible to source/build in 2 days, no-solder | We use **2 commodity ERM vibration motors** (time-sequenced), not pins — no refreshable actuators at all |
| **Dot Watch** (Dot Inc.) | Commercial **refreshable-Braille smartwatch**; notifications/text as pins on the wrist | **$299–399**; custom electromagnetic "Dot Cell" actuator took **~3 years** to develop | **✗** — proves wrist-Braille is viable, but needs bespoke actuator R&D | Same body site (wrist), but vibrotactile + **speech-in/speech-out two-way**, not a one-way reading display |
| **BrailleGPT** (pre-launch) | Handheld with **144 magnetically-actuated refreshable cells** + on-device AI to summarize/translate/convert digital content to Braille | Undisclosed price; **waitlist / not shipping**; aerospace chassis, 12 ms refresh | **✗** — refreshable-cell hardware; markets itself as AI-Braille "first" | Directly threatens any "first AI speech-to-Braille" claim (see novelty). We are vibrotactile + reply-suggestion, not a refreshable reader |
| **BrailleBand** (Savindu et al., IEEE SMC 2017) | **6 vibration motors in 3 bands on the arm**; phone→Bluetooth→ vibrotactile Braille characters | Research prototype; commodity motors | **~** — closest academic precedent to *exactly* our forearm-vibro-Braille idea | We use **2 motors (column×row-beat)**, not 6; add **LLM reply loop + speech-out**. Reported throughput ~**0.44 char/s** (≈1000 ms gap) |
| **UbiBraille** (Nicolau et al., ASSETS 2013) | **6 vibrotactile rings** on index/middle/ring of both hands; **simultaneously** actuates a Braille cell | Research prototype; 6 actuators | **~** | Achieved **82% avg char accuracy but expertise-dependent** (better for existing Braille readers). Note: it used *simultaneous* spatial coding across distinct fingers and still worked—see caveat in §C4 |
| **Mobile Lorm Glove** (Gollner, Bieling, Joost; TEI 2012) | Deafblind **glove**: palm pressure sensors compose the Lorm alphabet (out); back-of-hand vibration motors deliver incoming text (in) — two-way over Bluetooth/phone | Research prototype; custom textile sensors + motors | **✗** as-is (custom textile sensing) | We avoid a compose-alphabet input entirely: user **picks an AI-suggested reply**, not lorms/types it |
| **HaptiBraille Communicator** (4Blind; commercial) | Phone-sized **two-way** device: vibrational Braille to fingers (in) + **Braille-to-speech** so a deafblind user "speaks" to hearing people (out); accept/refuse buttons for the hearing party | Shipping commercial product | **✗** to replicate; **strong direct competitor** | Nearly the same two-way value prop. **We differ by using an LLM to *suggest* full replies the user selects**, vs. the user *composing* the message on Braille dots |
| **Tatum Robotics — Tatum1** | Robotic **18-DOF hand fingerspells tactile ASL** to a deafblind reader (text/eBook/email → tactile sign) | Commercial; ~25 units shipped; complex robotics | **✗** | Different modality (robotic tactile sign, not Braille); output-only reading. We are vibrotactile Braille + speech-out |
| **Neosensory Buzz** (Eagleman/Neosensory; commercial) | **Wristband, 4 vibration motors**; maps environmental **sound→spatiotemporal vibration** (sensory substitution) for deaf/HoH | Commercial (~$800 launch, later cheaper) | **✓** hardware-comparable (4 motors, wrist) | **Not Braille, not two-way, not for deafblind** (users still see). Proves a commodity 4-motor wrist device is learnable (users ID up to 95% / avg 70% of stimuli). Adjacent, not same |
| **Pérez-Aguirre et al. 2024** (ERIES; deafblind students) | **Bidirectional Braille-speech**: CNN speech-recognition in, vibrotactile out; user **composes finger-Braille via buttons**; TTS to the hearing party | Research prototype; 3D-printed | **~** — *the closest peer to our exact concept, published 2024* | **They do NOT suggest replies — the user composes every reply.** Our LLM-suggested-reply loop is the key differentiator |
| **Tec de Monterrey device 2025** (Fuentes group; same lineage) | Speech→Braille via CNN + vibration motors; "true two-way… active transmission and reception" | Research prototype | **~** | Same as above: **two-way but user-composed, no AI-suggested replies** |
| **SmartFingerBraille / Tacsac** (glove / capacitive wearables for deafblind) | Tactile sensing + vibrotactile actuation for deafblind comms | Research prototypes | **✗/~** | Confirm the *space is crowded*; ours differs via LLM reply suggestions + no-solder commodity build |

Primary source URLs/IDs for the matrix rows are consolidated in §Grounding notes.

---

### C. Claim-by-claim challenge of `plan/idea.md`

**C1. "Deaf-blind users are the right demographic… this area is under-served."** — **CONFIRMED**
(with the market nuance in §A). WFDB + Sense substantiate both the size and the neglect. *But* the
addressable market for a **Braille** device is the Braille-literate subset, not all deafblind people;
say so in the pitch.

**C2. "Vibro-tactile Braille … is a proven, researched approach."** — **PARTIALLY CONFIRMED /
soften the wording.** It is *researched and repeatedly prototyped* (BrailleBand, UbiBraille, Lorm,
HaptiBraille, Pérez-Aguirre 2024) — so "proven concept" is fair. It is **not** a mature, fluent,
standardized *reading channel*: reported performance is **character-recognition at modest speed**
(BrailleBand ≈0.44 char/s; UbiBraille 82% and *expertise-dependent*), not comfortable sentence
reading. Claim "a researched, repeatedly-prototyped approach," **not** "a proven reading method."

**C3. "Studies have shown deaf-blind users can learn to read vibro-tactile Braille with minimal
training."** — **UNSUBSTANTIATED as written / pitch liability.** I found **no** primary source showing
*minimal-training* fluency in **vibrotactile** Braille by deafblind users. Contrary evidence:
learning tactile (raised-dot) Braille is slow — sighted adults in a **9-month** course reached only
~**6 words/min**; late-blind adults often struggle to learn Braille at all. *(Bola et al., "Braille
in the Sighted: Teaching Tactile Reading to Sighted Adults," *PLOS ONE* 2016,
https://doi.org/10.1371/journal.pone.0155394 , PMID 27187496.)* Vibrotactile recognition results
that *are* good (UbiBraille 82%) leaned on **pre-existing Braille literacy**. **Mitigation already
in place:** locked decision #9 removed reading fluency from the success test (success =
pattern-matches-screen, no trained reader needed), so acceptance does **not** depend on this claim —
but **do not assert "minimal training" in the pitch**; it invites a citation a judge can produce
against you.

**C4. The sequential-vs-simultaneous justification ("~93% sequential vs ~26% simultaneous").** —
**CONFIRMED as a real study, but SCOPE-LIMITED** (consistent with file `00`'s own flag). Source:
**Yeganeh, Makarov, Kristjánsson, Unnthorsson, "Discrimination Accuracy of Sequential Versus
Simultaneous Vibrotactile Stimulation on the Forearm," *Applied Sciences* 2024, 14(1), 43,
DOI 10.3390/app14010043.** Numbers: sequential **93.24%** vs simultaneous **26.15%**; a **2×3 array
of voice-coil actuators** at 100 Hz on the **forearm**; timing 500 ms stimulus / 450 ms gap.
Caveats a sharp judge will raise: (i) participants were **normal volunteers, not deafblind**;
(ii) stimuli were **abstract vibrotactile patterns**, not Braille letters read for meaning;
(iii) "simultaneous" meant **all points of a tight 2×3 grid at once** — it says nothing about firing
**two widely-separated** motors in one beat (exactly the gap file `00` routes to Track 2). So this
study validates the **sequential > simultaneous direction in principle**, not "deafblind Braille
reading" and not the project's specific 2-motor column scheme. Use it as *directional support*, not
proof of the product.

**C5. "Prior systems have used multiple small vibration motors to present Braille characters."** —
**CONFIRMED.** BrailleBand (6 motors), UbiBraille (6 vibrotactile rings), Lorm Glove (back-of-hand
motors), Pérez-Aguirre 2024 / Tec 2025 (vibration motors). This is well-established prior art — it is
a *reason the concept is credible*, and simultaneously a *reason it is not novel* (see §D).

**C6. "Refreshable Braille pins are expensive, mechanically complex, not achievable in two days."** —
**CONFIRMED.** Piezo Braille cells ≈**$35 OEM/cell (~$4.38/dot)**; full displays **$4k–12k**; the
high cost has itself driven decades of research into cheaper actuation. *(Runyan/NFB, "Refreshable
Braille Now and in the Years Ahead," https://nfb.org/images/nfb/publications/bm/bm00/bm0001/bm000110.htm ;
review "Seeking the 'holy Braille' display," *Expert Review of Medical Devices* 2011,
DOI 10.1586/erd.11.47, https://www.tandfonline.com/doi/full/10.1586/erd.11.47 .)* Even the cheapest
wrist-worn refreshable product (Dot Watch, $299–399) required **~3 years** of custom actuator
development. Avoiding refreshable pins for 2 commodity ERM motors is the correct call.

**C7. Cross-track note on motor spacing (NOT Track 1's call — flag only).** A separate primary study
using the **same class of 10 mm ERM motors** as the project's AX22-0013 kept motors **≥8 cm apart to
avoid vibrotactile interference** *(Shah, Casadio, Scheidt, Mrotek, "Spatial and temporal influences
on discrimination of vibrotactile stimuli on the arm," *Experimental Brain Research* 2019,
DOI 10.1007/s00221-019-05564-5, 30 sighted participants)*. Locked decision #7 places the two motors
**~40–50 mm** apart (thumb-side vs pinky-side). **40–50 mm is roughly half the 8 cm this ERM study
used to avoid interference** — reinforcing file `00`'s "wear-test on the day" flag. Routed to Track 2;
recorded here only because it surfaced during prior-art work.

---

### D. Pitch-honest novelty claim

**What is NOT novel (prior art, including 2024–2025 work — a judge may know at least one):**
- Speech → vibrotactile Braille on the body: BrailleBand (2017), UbiBraille (2013),
  Pérez-Aguirre 2024, Tec 2025.
- **Two-way** speech↔Braille for deafblind users: HaptiBraille (commercial), Lorm Glove (2012),
  Pérez-Aguirre 2024.
- AI/CNN in the speech→text step: Pérez-Aguirre 2024, Tec 2025, BrailleGPT.
- Wrist/forearm vibrotactile band on commodity motors: Neosensory Buzz, BrailleBand.
- Sequential (time-multiplexed) dot presentation: Yeganeh 2024; BrailleBand's gap-timed output.
- 3D-printed enclosure, personalization/"smart-reply" memory: routine.

**Do NOT claim:** "world-first," "first speech-to-Braille wearable," "novel device," or "first to use
AI for deafblind Braille." **BrailleGPT** already markets "AI that converts speech to tactile Braille
in real time"; **HaptiBraille** already ships two-way Braille↔speech; **Pérez-Aguirre 2024 / Tec 2025**
already published the bidirectional CNN speech-Braille system for deafblind users. Any of these will
demolish a first/novel claim.

**The pitch-honest, defensible novelty (integration- and UX-level, not a scientific first):**

> *An LLM-in-the-loop reply model that lets a deafblind user **pick an AI-suggested spoken reply**
> instead of **composing** one letter-by-letter — combined with **AI keyword-condensation** of
> incoming speech into a low-bandwidth tactile "gist," and lightweight personalization — assembled
> on **commodity, no-solder hardware** in a 2-day build.*

Why this survives a sharp judge:
- **The closest peers require the user to compose the reply** (Pérez-Aguirre 2024 finger-Braille
  buttons; HaptiBraille Braille-dot typing; Lorm alphabet). Using a general-purpose LLM to *generate
  candidate replies the user just selects* genuinely **reduces the output-side burden** — the hardest
  half of two-way deafblind communication. That is a real, verifiable difference, not marketing.
- **Framing is honest** (per locked decisions #2/#10): "feel the **gist**," full verbatim on screen —
  not "feel everything that was said."
- It is claimed as **integration + interaction novelty**, not a new sensory science or a hardware
  first — which is exactly what a 2-day hackathon should claim.

**One-line pitch-safe version:** *"Not a new way to feel Braille — a new way to reply: the AI drafts,
you pick, it speaks."*

---

## What changed vs `plan/idea.md`

| `idea.md` claim | Verdict | Note |
|---|---|---|
| Deafblind are under-served, right demographic | **CONFIRMED** | Add nuance: Braille device serves the *Braille-literate subset*, not all deafblind (age-related DSL dominates and usually isn't Braille) |
| Vibrotactile Braille is "proven" | **CORRECTED → soften** | Repeatedly *prototyped* and *researched*; not a mature/fluent reading channel. Say "researched, prototyped approach" |
| Deafblind can learn vibrotactile Braille "with minimal training" | **UNSUBSTANTIATED** | No primary source found; contrary evidence (tactile Braille takes months). Acceptance already de-scoped from reading fluency (locked #9). **Drop from pitch.** |
| Sequential > simultaneous ("93% vs 26%") validates the approach | **CONFIRMED but SCOPE-LIMITED** | Real study (Yeganeh 2024, DOI 10.3390/app14010043) — abstract patterns, sighted participants, tight-grid "simultaneous." Directional support only; the 2-far-apart-motor question is unaddressed (Track 2) |
| "Existing forearm Braille vibration bands" as precedent | **CONFIRMED** | BrailleBand (IEEE SMC 2017, arXiv:1901.03329) is exactly this |
| Refreshable pins are expensive/complex, not 2-day-feasible | **CONFIRMED** | $35/cell OEM, $4k–12k displays; even Dot Watch needed ~3 yrs of actuator R&D |
| (Implicit) the concept is fresh/novel | **CORRECTED** | Core concept exists in 2024–2025 academic + commercial work; novelty must be narrowed to the **LLM-suggested-reply loop** (§D) |

**New competitors surfaced that `idea.md` did not mention** (and that a judge might): HaptiBraille
Communicator (commercial two-way), BrailleGPT (AI refreshable-Braille, pre-launch), Pérez-Aguirre
2024 & Tec de Monterrey 2025 (bidirectional CNN speech-Braille for deafblind), Tatum Robotics
(tactile-ASL robot), Neosensory Buzz (commodity wrist sound→vibration), Mobile Lorm Glove.

---

## Grounding notes

**Primary sources (high confidence):**
- WFDB Global Reports 2018 & 2023 (population, "left behind"): PDFs at wfdb.eu (URLs in §A).
- Sense UK deafblindness statistics (UK 450k→610k): https://www.sense.org.uk/about-us/research/deafblindness-statistics-in-the-uk/
- Library of Congress/NLS (US figures): https://www.loc.gov/nls/services-and-resources/informational-publications/deafblindness/
- Yeganeh et al., *Applied Sciences* 2024, 14(1):43, **DOI 10.3390/app14010043** (sequential vs
  simultaneous). *(Numbers/geometry from MDPI abstract + indexers; MDPI page 403'd to direct fetch,
  so array-spacing-in-mm and exact participant count were not read in full text — confidence high on
  the headline numbers/design, medium on fine detail.)*
- Shah et al., *Exp Brain Res* 2019, **DOI 10.1007/s00221-019-05564-5** (ERM motors ≥8 cm; full text
  read via PMC6640119).
- Pérez-Aguirre et al., *ERIES J.* 2024, **DOI 10.7160/eriesj.2024.170206** (bidirectional
  Braille-speech; user composes; >95% typing accuracy — full record read).
- Bola et al., *PLOS ONE* 2016, **DOI 10.1371/journal.pone.0155394** (Braille learning is slow).
- BrailleBand: **arXiv:1901.03329** (Savindu et al., IEEE SMC 2017; 6 motors, ~0.44 char/s).
- Mobile Lorm Glove: **DOI 10.1145/2148131.2148159** (Gollner, Bieling, Joost, TEI 2012).
- Tatum Robotics open-source hand: **PubMed PMID 34892268**; product at https://tatumrobotics.com/
- Refreshable-Braille cost: NFB (nfb.org, "$35/cell") + *Expert Rev. Med. Devices* 2011,
  **DOI 10.1586/erd.11.47**.

**Secondary / product-marketing sources (medium confidence — vendor claims, verify before quoting as
independent fact):**
- BrailleGPT: https://braillegpt.com.au/ (pre-launch/waitlist; 144 refreshable cells; vendor "first"
  language is unverified marketing).
- HaptiBraille / 4Blind: https://nib.org/haptibraille-communicator-a-breakthrough-in-personal-communications-independence/ , https://4blind.com/en
- Dot Watch price/dev-time: https://emag.medicalexpo.com/the-worlds-first-braille-smartwatch/
- Neosensory Buzz specs/results: neosensory preprint PDF at neosensory.com; review at hearinghealthmatters.org.
- Tec de Monterrey 2025 write-up: https://tecscience.tec.mx/en/tech/ai-to-improve-communication-for-deafblind-individuals/
- UbiBraille (Nicolau et al., ASSETS 2013): 82% figure via ResearchGate/ACM
  (https://www.researchgate.net/publication/256035144 ); DOI not independently re-confirmed here.
- "≈15% use Braille / ≈60% without support": recurring secondary field summaries — indicative, not primary.

**Confidence summary:** HIGH that the problem is real/under-served and that refreshable pins are
2-day-infeasible; HIGH that the core two-way speech↔Braille concept is prior art (incl. 2024–2025);
MEDIUM on exact competitor internals sourced from marketing pages; the *novelty narrowing* (§D) is a
judgment call I'm confident is defensible.

---

## Residual risk / pitch liabilities

1. **Novelty is thin and the field is crowded (HIGH).** Speech→vibrotactile Braille two-way already
   exists in 2024–2025 academic (Pérez-Aguirre, Tec) and commercial (HaptiBraille) form, plus
   BrailleGPT marketing an AI-Braille "first." **Any "world-first / novel device" pitch is a
   demolition target.** Mitigation: lead with the **LLM-suggested-reply loop** framing (§D) and
   never claim a hardware/concept first.
2. **"Minimal training" claim (MEDIUM-HIGH).** Unsupported; a judge can cite the opposite. Drop it.
   (Acceptance is safe via locked #9, but the *spoken pitch* is still exposed if the claim is made.)
3. **Addressable-market overreach (MEDIUM).** "Helps deafblind people" over-broad — the device serves
   *Braille-literate* deafblind users, a minority of the population. Scope the claim.
4. **Cited sequential study is over-extended (MEDIUM).** Yeganeh 2024 supports *direction*, not the
   specific 2-far-apart-motor scheme, nor deafblind Braille reading. If pitched as "proven," a judge
   who reads the abstract can puncture it. Pair with the honest "gist/pattern-matches-screen" framing.
5. **Cross-track spacing tension (flag, MEDIUM).** ERM-motor literature used ≥8 cm to avoid
   interference; locked placement is ~40–50 mm. Not Track 1's to resolve — Track 2 + on-day wear-test.
6. **Could-not-fully-verify items (LOW-MEDIUM).** MDPI full text (exact actuator spacing/participant
   n) and some competitor internals were read only via abstract/indexer/marketing due to a 403 and
   paywalls; flagged above so nothing marketing-sourced is quoted as independent fact.

---

## One-paragraph handoff summary

The problem is **real and under-served** (WFDB "left behind"; Sense: 450k deafblind in the UK), but a
Braille device serves only the **Braille-literate subset**. Refreshable Braille is correctly ruled out
(**$4k–12k / bespoke actuators**). The concept, however, is **not novel**: speech→vibrotactile Braille
two-way exists in 2017–2025 academic work (BrailleBand, UbiBraille, Pérez-Aguirre 2024, Tec 2025) and
in shipping/near-shipping products (HaptiBraille, BrailleGPT, Dot Watch, Neosensory Buzz, Tatum). The
**honest, defensible novelty is the LLM-suggested-reply loop** — the user *picks* an AI-drafted spoken
reply instead of *composing* it, which is precisely what the closest peers make the user do by hand.
**Correct in the pitch:** drop "minimal training," soften "proven," scope the market, and never claim
a first.
