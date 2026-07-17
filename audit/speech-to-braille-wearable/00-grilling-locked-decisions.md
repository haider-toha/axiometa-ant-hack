# 00 — Grilling: Locked Decisions

**Type:** Grilling session record (interactive interview via `/grill-me`)
**Date:** 2026-07-17
**Source doc under grilling:** `plan/idea.md`
**Author:** orchestrator (interview with the human builder)

> This file is the tangible output of the grilling phase. It captures decisions the
> human locked live, the reasoning that forced each one, and — critically — which
> locks are **user decisions** (authoritative) versus **claims still needing primary-source
> citation** from the Phase 1 research tracks. Do not treat the analysis here as researched
> fact; Tracks 1–4 must back the science/latency claims with cited sources.

---

## Scope

Adversarial interview to convert `plan/idea.md` (a polished but internally under-locked
handover) into a set of committed decisions before any research tracks or implementation
plan are written. Twelve decisions were forced across three rounds, plus four holes that
were **not in the doc's own open-questions list** were surfaced and resolved.

---

## Verdicts (locked decisions)

Each row: the decision, who owns it, and what still needs citing.

### Product mechanics

1. **Braille encoding scheme — LOCKED: Columns × 3 row-beats.**
   Motor A = left Braille column (dots 1·2·3), Motor B = right column (dots 4·5·6).
   Play **3 timed beats** = top row → middle row → bottom row. In each beat, fire A and/or B
   for the dot(s) present in that row. Empty rows still consume their time slot (silent beat)
   so row position is unambiguous. **Fixed 3 beats per letter.**
   - *Owner:* user decision.
   - *Grill that forced it:* the doc justified "sequential" using a study (≈93% sequential vs
     ≈26% simultaneous) run on a **tight 6-point grid** where "simultaneous" means all six dots
     blur together. That says nothing about firing **two widely-separated** motors together within
     a row. The doc's justification was a partial non-sequitur; the scheme was re-chosen on
     structural grounds (2 motors ↔ 2 columns) instead.
   - *Needs citation (Track 2):* confirm that two far-apart motors fired in the same beat are
     reliably read as a 2-point pattern (i.e., the tight-grid 26% figure does NOT apply here).

2. **Throughput / message-length policy — LOCKED: buzz Claude-condensed keywords only (1–3 words).**
   Screen shows the full verbatim text; the wrist receives a condensed keyword summary.
   - *Owner:* user decision.
   - *Grill that forced it:* nobody had done the arithmetic. At ~3 s/letter (3 beats × ~950 ms),
     "coffee" ≈ 20 s and a full waiter sentence ≈ 45–90 s → **~3–4 words/min**. Buzzing full
     sentences is proof-of-concept speed, not demo-friendly. Condensing to keywords keeps buzz
     time <~15 s and leans on the AI (the stated differentiator) to do the condensing.
   - *Needs citation (Track 2/4):* the per-beat timing constants that produce the ~3 s/letter figure.

3. **Alphabet + delimiters — LOCKED: A–Z + inter-letter gap + inter-word gap.**
   No number-sign, no punctuation. Claude spells numbers out ("two", not "2"), which the
   keyword-condensation step already makes natural.
   - *Owner:* user decision.
   - *Needs validation (Track 3):* the A–Z dot-pattern lookup table must be validated against an
     authoritative Braille reference (acceptance depends on it — see decision 9).

### Two-way / reply loop

4. **Reply loop — LOCKED: in scope for the MVP** (not deferred to stretch).
   Suggestions are shown on screen and scrolled with the rotary encoder; only the **chosen**
   reply is spoken aloud.
   - *Owner:* user decision.

5. **Reply UX — LOCKED: buzz only the highlighted suggestion** as the encoder lands on it.
   Press to select. Screen mirrors all options for sighted judges.
   - *Owner:* user decision.
   - *Grill that forced it:* decision 4 as first stated put suggestions **on the screen only** —
     but a deaf-blind user cannot see the screen, so only a sighted person could operate reply
     selection, which guts the "two-way for deaf-blind" claim. Buzzing just the highlighted option
     (keyword-short, ~5–10 s each) reconciles this with the throughput policy and keeps the loop
     genuinely usable by the target user.

6. **Reply flow entry — LOCKED: auto-enter, 3 options, distinct "ready" cue.**
   After the incoming keywords finish buzzing, a distinct "replies ready" buzz plays and the
   device enters scroll mode; encoder cycles **3** Claude suggestions (buzz the highlighted one);
   press selects; **LED button = repeat last message.**
   - *Owner:* user decision.

### Form factor / hardware placement

7. **Motor placement — LOCKED: thumb-side vs pinky-side across the wrist.**
   Left-column motor A on the radial (thumb) side, right-column motor B on the ulnar (pinky)
   side, so left/right column maps to left/right of the wrist (learnable). ~40–50 mm apart.
   - *Owner:* user decision.
   - *Must wear-test on the day:* the 2-point-discrimination threshold at this spacing is at the
     edge of research figures — verify two distinct points are felt before finalizing the print.
   - *Needs citation (Track 2):* two-point / vibrotactile localization distances for wrist vs forearm.

8. **Board placement — LOCKED: on-wrist, self-contained, USB-tethered for power.**
   "All-day slim wearable" is explicitly the *productionized* pitch, not the demo unit.
   - *Owner:* user decision. (This is a Phase 3 CAD input.)

### Acceptance & pitch integrity

9. **Success test — LOCKED: pattern-matches-screen.**
   Success = for each buzzed letter, the fired A/B beat sequence provably matches that letter's
   Braille cell, checkable by **anyone** against the on-screen caption + a printed Braille chart.
   **No trained vibrotactile-Braille reader required.** Fully falsifiable and scenario-agnostic.
   - *Owner:* user decision.
   - *Grill that forced it:* the operator won't be a trained reader, so "user reads it" cannot be
     the test; the doc's success criterion was soft. This makes it observable and honest.

10. **Pitch framing — LOCKED: "feel the gist / key info."**
    Full verbatim shown on screen; the wrist channel is an owned, condensed summary. The
    over-claiming option ("feel what was said" verbatim while sending keywords) was explicitly
    rejected as dishonest.
    - *Owner:* user decision.

### Network

11. **Phone↔ESP32 link — LOCKED: phone hotspot, ESP32 joins as a client.**
    Phone shares cellular data (keeps internet for ElevenLabs/Anthropic) AND reaches the ESP32
    on the hotspot LAN. No dependency on event WiFi.
    - *Owner:* user decision.
    - *Grill that forced it:* "HTTP to the ESP32's local IP" over event WiFi dies silently under
      **client isolation** — a common conference-network default and a total demo-killer that was
      **not in the doc's risk list at all.**
    - *Needs verification (Track 4):* confirm on the **actual demo phone** that hotspot + simultaneous
      cellular API calls + local ESP32 reachability all work together (some phones/carriers restrict
      this; watch for captive-portal behaviour on the ESP32 side).

### Risk retired

12. **Motor-arrival risk — RETIRED.** The builder confirmed **all parts are physically in hand**
    (Genesis Mini kit + 2× ERM motors). There is **no Saturday dependency.** Everything can be
    built and tested against the real motors from hour one.
    - *Impact:* `plan/idea.md` open-question #4 is dead; the "Coming from Axiometa on Saturday" and
      "Motors arrive Saturday (reconfirm risk)" framings are **stale** and must be corrected in Phase 2.

---

## Defaults locked by fiat (object-if-wrong — not separately interviewed)

These follow directly from the decisions above and are stated so the plan has zero placeholders:

- **AI call structure:** a single Claude call on the forward path does transcript **cleanup +
  keyword-condensation** together (cleanup is effectively free because a Claude call is already in
  the path for condensation). Reply suggestions are a separate Claude call on the backward path.
- **STT mode:** record-then-send (press-to-talk / release-to-transcribe), **not** streaming — simpler
  for a 2-day build.
- **Latency target:** <~4 s from speech-end to first buzz (STT + one Claude call). Target, not guarantee
  — Track 4 to measure.
- **Power:** USB tether to a battery bank / laptop for the demo.
- **Screen role:** status (IP address) + live verbatim caption for sighted judges. Not an interface
  for the deaf-blind user.
- **Port map (all 4 used, zero spare):** 2 motors + 0.96" screen + rotary encoder. Forward-only
  fallback (if the reply loop is cut under time pressure) frees the encoder port.
- **Timing constants (starting point, tune live):** ~400–500 ms buzz, ~300–450 ms inter-beat gap,
  ~700 ms+ inter-letter gap, ~1.2 s+ inter-word gap. Track 2 to refine against sources.

---

## What changed vs `plan/idea.md`

- Encoding went from "the main remaining design detail, tune live" (hand-waved) to a **fully specified
  fixed-3-beat column scheme.**
- Added a **throughput/message-length policy** (keyword condensation) that the doc never confronted.
- Added a **network model** (phone hotspot) to cover a demo-killer risk the doc omitted.
- Reworked the **reply loop** from an infeasible "feel every suggestion" into "buzz the highlighted one."
- Hardened **acceptance** from "distinguishable patterns" into a falsifiable pattern-matches-screen test.
- Hardened the **pitch** to "gist," rejecting a verbatim over-claim.
- **Retired** the motor-arrival risk (parts in hand) — open-question #4 and the Saturday framing are stale.
- Motor **placement** narrowed to thumb-side/pinky-side; **board** confirmed on-wrist.

---

## Grounding notes

- The decisions above are **user-authoritative** (the human made each call live) plus **orchestrator
  analysis** (the arithmetic, the study-misuse critique, the client-isolation risk). The analysis is
  reasoning, **not cited research** — Tracks 1–4 must independently verify and cite the flagged items.
- No part dimensions, port maps, or electrical limits were invented here. The port budget (4) and
  motor properties are quoted from `plan/idea.md`'s own text and are **flagged for Track 3 to confirm
  against the schematic/STEP**, per the standing "8 ports suspect, Mini truth is 4" constraint.

---

## Residual risk (routed to tracks)

| Risk | Severity | Route |
|---|---|---|
| Two far-apart motors fired in one beat may still blur / mislocalize at ~40–50 mm on the wrist | High | Track 2 (cite) + wear-test on the day |
| Phone hotspot + simultaneous cellular API + local ESP32 may not all coexist on the actual demo phone | High | Track 4 (verify on device) |
| End-to-end latency (STT + Claude) unmeasured; <4 s is a target | Medium | Track 4 (measure) |
| One AX22 port may not expose enough GPIO for a quadrature encoder | Medium | Track 3 (parts truth) |
| 2× ERM current draw vs USB power budget with screen + encoder | Medium | Track 3 (electrical) |
| A–Z Braille lookup table correctness (acceptance depends on it) | Medium | Track 3 / plan (validate vs authoritative chart) |
| Port count 4 vs kit-copy "8" | Low (asserted 4) | Track 3 (confirm via schematic) |

---

## Downstream pointers

- Feeds: Phase 1 Tracks 1–4 (each must cite; do not recycle this file's analysis as fact).
- Feeds: Phase 2 executable plan (`plan/YYYY-MM-DD-speech-to-braille-wearable.md`) — must also correct
  the stale `idea.md` sections noted above.
- Feeds: Phase 3 CAD design-spec (decisions 7, 8 + Track 3 measured geometry).
