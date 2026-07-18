# Phase 1A — UI / Accessibility Design Research (Companion App)

- **Date:** 2026-07-17
- **Track:** Phase 1 / Track A — research only. No application code is written here; this is the spec the Phase 2 UI implementer applies directly.
- **Product under design:** Next.js web app (phone, in-hand) that is the ground-truth caption + control surface for a wrist-worn braille buzzer.
- **Primary user:** braille-literate DEAFBLIND users driving the app by screen reader (VoiceOver / TalkBack) + refreshable braille display; secondary: low-vision users.
- **Fixed aesthetic brief (do not renegotiate):** dark bg ~`#111`, near-white text ~`#F5F5F5`, very high contrast, very large touch targets, minimal cognitive load, low animation, clean sans-serif, mobile-first, one-handed.
- **Method:** every numeric requirement below was verified against the canonical W3C WCAG 2.2 *Understanding* pages (primary source) this session; real-app claims verified against official product/org pages. Full URL ledger in **Sources**. One caveat (Apple HIG rendered body) noted at the end.
- **Citation policy:** each requirement row carries its source. Confidence tags: HIGH = fetched W3C normative page; MED = corroborated via search of official pages.

---

## 0. The three states + the core tension

| State | Visible content | The accessibility problem it creates |
|---|---|---|
| **IDLE** | One large centred "HOLD TO SPEAK" button, nothing else | "HOLD" instructs a gesture a screen-reader (SR) user cannot perform (see C1) |
| **RECORDING** | Same button becomes a live "listening" indicator | A pulsing/animated indicator can violate reduced-motion; state change must be exposed non-visually |
| **CAPTION/REPLY** | Large caption above the button + up to 3 suggestion cards below | New content appearing must be announced *once*, without spamming the SR/braille display |

The whole design turns on two decisions: **(1)** how a "hold to speak" button is made operable by a screen reader, and **(2)** how the caption + "buzzing keyword" reach the user through one polite live channel instead of a flood. Both are resolved in Part C.

---

## Part A — WCAG 2.2 hard requirements

### A1. Target size — the load-bearing sizing decision

| SC | Level | Requirement | Source | Conf |
|---|---|---|---|---|
| **2.5.8 Target Size (Minimum)** | **AA** | Pointer target **≥ 24 × 24 CSS px** (exceptions: spacing where a 24px-diameter circle centred on each target does not intersect a neighbour; equivalent control; inline; user-agent; essential) | W3C Understanding 2.5.8 | HIGH |
| **2.5.5 Target Size (Enhanced)** | **AAA** | Pointer target **≥ 44 × 44 CSS px** (exceptions: equivalent, inline, user-agent, essential) | W3C Understanding 2.5.5 | HIGH |

Corroborating platform guidance (industry, not normative): **Apple HIG — 44 × 44 pt** minimum tappable area; **Google Material / Android — 48 × 48 dp** minimum touch target with **≥ 8 dp** spacing between targets.

> **RECOMMENDATION — adopt the AAA 44 × 44 CSS px floor, not the 24 px AA minimum.** The audience is low-vision + motor-variable + one-handed; the AA 24 px minimum is an absolute floor for incidental controls only. Enforce **44 × 44 CSS px as the hard minimum for every interactive element**, keep **≥ 8 px spacing** between adjacent targets, and make the primary controls far larger: the **Speak** button is the hero (full-width, ≥ ~25–30 vh tall), each suggestion card is full-width and **≥ 64 px** tall. This simultaneously satisfies 2.5.8 AA, 2.5.5 AAA, Apple 44 pt and Material 48 dp.

### A2. Contrast — text and non-text

| SC | Level | Requirement | Source | Conf |
|---|---|---|---|---|
| **1.4.3 Contrast (Minimum)** | **AA** | Text **≥ 4.5:1**; large text **≥ 3:1** (large = ≥ 18 pt, or ≥ 14 pt bold ≈ 24 px / 18.66 px bold) | W3C Understanding 1.4.3 | HIGH |
| **1.4.6 Contrast (Enhanced)** | AAA | Text ≥ 7:1; large text ≥ 4.5:1 | W3C (referenced) | MED |
| **1.4.11 Non-text Contrast** | **AA** | UI components & meaningful graphics **≥ 3:1** against adjacent colour; do not round (2.999:1 fails) | W3C Understanding 1.4.11 | HIGH |

**Palette contrast ledger (the fixed brief passes with huge margin):**

| Pair | Ratio (computed, sRGB) | 1.4.3 AA (4.5) | 1.4.6 AAA (7) |
|---|---|---|---|
| Text `#F5F5F5` on bg `#111111` | **≈ 17.3 : 1** | PASS | PASS |

Because body text already clears **7:1**, the palette meets even AAA for text — spend no design effort fighting contrast; spend it on size and spacing. **The one thing to watch is non-text (1.4.11):** every focus ring, card border, and the RECORDING indicator colour must clear **3:1 against `#111`**. On `#111` that means any indicator colour with relative luminance **≥ ~0.117** (roughly `#767676` mid-grey or lighter). Safe default: draw indicators in the same near-white `#F5F5F5`. Never encode state by hue alone.

### A3. Reflow

| SC | Level | Requirement | Source | Conf |
|---|---|---|---|---|
| **1.4.10 Reflow** | **AA** | No loss of content/function and **no two-dimensional scrolling** at **320 CSS px** width (and 256 CSS px height) — i.e. usable at 400% zoom | W3C Understanding 1.4.10 | HIGH |

Single-column, vertical-only layout; the three states must each work at 320 px wide with no horizontal scroll. This aligns naturally with the "one thing on screen" brief.

### A4. Focus visibility

| SC | Level | Requirement | Source | Conf |
|---|---|---|---|---|
| **2.4.7 Focus Visible** | **AA** | Keyboard focus indicator is visible | W3C Understanding 2.4.7 | HIGH |
| **2.4.11 Focus Not Obscured (Minimum)** | **AA — new in WCAG 2.2** | A focused component is **not *entirely* hidden** by author content | W3C Understanding 2.4.11 | HIGH |

Never `outline:none` without replacement. Use a thick (**≥ 3 px**) high-contrast ring (≥ 3:1 per 1.4.11) with offset. No sticky/overlay element may fully cover a focused control (relevant if a caption banner or toast overlaps the Speak button).

### A5. Reduced motion

| SC | Level | Requirement | Source | Conf |
|---|---|---|---|---|
| **2.3.3 Animation from Interactions** | AAA | Motion animation triggered by interaction can be disabled unless essential; the sufficient technique is honouring **`prefers-reduced-motion`** | W3C Understanding 2.3.3 | HIGH |

The RECORDING "listening" indicator must have a **non-animated baseline** (colour/label/text change). Any pulse/wave is enhancement only, gated behind `@media (prefers-reduced-motion: no-preference)`.

### A6. Pointer interaction — why "press-and-hold" is constrained

| SC | Level | Requirement | Source | Conf |
|---|---|---|---|---|
| **2.5.1 Pointer Gestures** | A | Path-based / multipoint gestures need a single-pointer alternative unless essential | W3C 2.5.1 (search-corroborated) | MED |
| **2.5.2 Pointer Cancellation** | **A** | For single-pointer functions, at least one of: **no down-event**, **abort/undo**, **up reversal**, essential | W3C Understanding 2.5.2 | HIGH |
| **2.5.7 Dragging Movements** | **AA — new in WCAG 2.2** | Any drag operation must have a **single-pointer, non-drag alternative** unless essential | W3C Understanding 2.5.7 | HIGH |

Key nuance from 2.5.2: a press-and-hold whose **release commits/sends** does *not* automatically pass — passing requires either an **abort** affordance (slide finger off the target before releasing = cancel) or up-reversal. A press-and-hold whose release merely *reverses* (cancels a transient) is fine. This directly shapes C1.

### A7. Semantics / ARIA

| SC | Level | Requirement | Source | Conf |
|---|---|---|---|---|
| **4.1.2 Name, Role, Value** | **A** | Every UI component exposes name + role programmatically; user-settable states (e.g. a toggle's pressed state) are programmatically set | W3C Understanding 4.1.2 | HIGH |
| **4.1.3 Status Messages** | **AA** | Status messages are programmatically determinable via **role or properties** and announced **without taking focus** (`role="status"`, `role="alert"`, `aria-live`) | W3C Understanding 4.1.3 | HIGH |

WAI-ARIA APG **Button pattern** (fetched, HIGH): a toggle button uses **`aria-pressed`** (`true`/`false`); it is **critical the accessible name does NOT change when the state changes** (change the *state*, not the *label*); the button is activated by **Enter and Space** (and, on mobile SRs, a double-tap). These three rules are load-bearing for C1.

---

## Part B — Prior art: products serving braille / deafblind users

| Product | What it is | Transferable pattern |
|---|---|---|
| **Aira** (aira.io) | On-demand visual-interpreting app; blind/low-vision (some deafblind via ASL + captions) | **One large button on the home screen = one primary action.** The entire IDLE screen is a single "connect" button. Exactly the "HOLD TO SPEAK"-as-hero model. |
| **Be My Eyes** (bemyeyes.com) | Free app connecting blind users to volunteers / AI describer; deeply VoiceOver-integrated; built with continuous blind-user feedback | Minimal, one-action-per-screen flows; **AI describer returns a single plain-language block** — mirrors our single large caption. "Nothing built without disabled users at the table" (Haben Girma). |
| **NFB-NEWSLINE Mobile 3.0** (nfb.org) | Free audio/braille news service; "fully accessible with VoiceOver … or read it in Braille with a connected refreshable Braille display" | **Explicitly designed for deafblind + refreshable braille display.** Flat 4-page structure, no nesting; start/stop/skip/repeat controls. Proof that *flat + few controls + list semantics* is the deafblind-friendly shape. |
| **Blitab** (blitab.com; Perkins) | Tactile "braille tablet" — 14 rows × 23 six-dot cells raised by liquid "tixels" | Confirms the **text channel is the product** for our user: whatever the caption says is what reaches the fingertips. The buzzer's keyword is a *redundant* cue; the caption text is authoritative. (Note: product appears commercially dormant — cite as design reference, not a live competitor.) |
| **Android TalkBack braille support** (blog.google, May 2022) | Built-in refreshable-braille-display support in TalkBack (Android 13); navigation, editing, silent phone access for deafblind users | The deafblind user drives the whole OS via braille display + SR. **Our app must be 100% operable through that stack — no gesture, no hover, no timing that the braille+SR path can't express.** |

**Distilled transferable patterns**
1. **One primary action, screen-filling.** The hero *is* a single button (Aira, Be My Eyes). Matches the brief.
2. **Flat information structure, few controls, list semantics.** NFB-NEWSLINE's 4 flat pages; deafblind users navigate linearly on a braille display, so DOM order = reading order and lists announce their length.
3. **Text is the real output.** For a braille-display user the caption string is the deliverable (Blitab, refreshable-display model). Audio/haptic buzz is secondary/redundant.
4. **Discrete activation only.** The braille+SR stack (TalkBack/VoiceOver) activates controls with a discrete double-tap or Space/Enter — never a sustained hold. This is the hard constraint behind C1.
5. **Built and tested with the actual AT.** Every claim above traces to products validated by blind/deafblind users; Phase 2 verification must include a real SR pass.

---

## Part C — Design-pattern recommendations for the exact 3-state UI

### C1. Press-to-talk vs the screen reader — the resolution

**Problem.** A true "hold to speak, release to send" is a timed single-pointer gesture. VoiceOver / TalkBack intercept touch and map activation to a **discrete double-tap**; desktop SRs use **Space/Enter**. None can express "hold for N seconds then release." So a hold-*only* control is operable by sighted touch users but effectively inoperable and undiscoverable for our primary (deafblind) user. Also, per **2.5.2**, a hold whose *release sends* needs an explicit **abort** affordance to pass Level A.

**Resolution — one control, two input paths, stable name:**

1. **Make it a real `<button>` that TOGGLES recording on discrete activation.** Tap / double-tap / Space / Enter starts recording; the same activation stops-and-sends. This is the SR-and-keyboard path and it is the *primary* contract.
2. **Reflect state with `aria-pressed`**, not with the label: `aria-pressed="false"` = idle, `aria-pressed="true"` = recording. (APG toggle rule.)
3. **Keep the accessible name stable and hold-free:** accessible name = **"Speak"** (NOT "Hold to speak"). The pressed state, plus the live status region (C2), conveys "now recording." Never rename the control on state change.
4. **Layer press-and-hold as a progressive enhancement for sighted pointer users:** `pointerdown` → start, `pointerup` → stop-and-send. To satisfy 2.5.2, **releasing while the pointer is OUTSIDE the button cancels (abort), does not send.** SR/keyboard users never touch this path.
5. **Reconcile with the brand wording.** Keep a bold visible label, but make it honest about both inputs: **"HOLD OR TAP TO SPEAK"** (idle) → **"LISTENING — TAP TO STOP"** (recording). The *visible* text may change; the *accessible name* ("Speak") stays fixed while `aria-pressed` flips. This preserves the brief's "HOLD TO SPEAK" spirit while remaining fully operable by braille + SR.

> Net: sighted one-handed users can hold; everyone (including the deafblind primary user) can tap/activate. No user is asked to perform a gesture their input method can't produce.

### C2. Live-region strategy — announce once, never spam

Use **two dedicated, `aria-atomic="true"` regions**, present in the DOM from first paint (empty), updated by text injection:

| Region | Markup | Carries | Politeness |
|---|---|---|---|
| **Status** | `role="status"` (implicit `aria-live="polite"`) `aria-atomic="true"` | Ephemeral state only, ≤ 3 words: "Listening", "Processing", "Sending to band", "Sent" | polite |
| **Caption** | `aria-live="polite"` `aria-atomic="true"` | The **finalized** transcript, written **once** when ASR is final | polite |
| **Errors** | `role="alert"` (assertive) | Only failures: "No speech detected", "Band disconnected" | assertive |

Anti-spam rules (this is the part that makes or breaks the SR experience):
- **Never stream interim/partial ASR results into a live region.** Show live partials in a visually-updating node that is `aria-hidden="true"`; write into the caption live region **only** the final string. This prevents the braille display and SR from re-rendering on every word.
- **The "buzzing keyword"** (the word sent to the wrist buzzer) is announced **once, politely** — append it to the caption or emit a single status line "Buzzing: <word>". **Never assertive** (it would cut off the caption). On the braille display the caption text is already authoritative; the buzz is a redundant cue.
- **Suggestion cards appearing:** announce their arrival **politely and once** ("3 replies") via the status region or a visually-hidden heading — **do NOT auto-move focus** to a card (it steals focus from the caption the user may still be reading on the braille display). Let the user navigate to them.
- **Reserve assertive strictly for errors.** One live update per user-visible event; never fire two regions in the same tick.

### C3. Suggestion cards — markup and announcement

- Wrap the (≤ 3) cards in a **list**: `<ul>` with `role="list"` (belt-and-braces if CSS strips list semantics) and an `aria-label="Suggested replies"` on the container. SR announces "Suggested replies, list, 3 items."
- Each card is a **real `<button>`** (or `<li><button>`), full-width, **≥ 64 px tall**, `≥ 8 px` gap. Its **accessible name = the full reply text** (the visible text is the name; no truncation for SR).
- On selection: perform the send, return focus to the Speak button (or the caption), and emit a polite status "Sent". Do not silently swap the screen.
- Give the group a stable position **below** the caption and **above** the persistent Speak button so DOM order = reading order (C5).

### C4. Layout + type scale

Single column, vertical only (satisfies Reflow at 320 px). Mobile-first, thumb-reachable: **caption on top, cards in the middle, Speak button anchored at the bottom** (one-handed thumb zone).

Recommended type scale (root 16 px baseline; never shrink below 16 px; all pass ≥ 7:1 on the fixed palette):

| Role | Size | Weight | Notes |
|---|---|---|---|
| Caption (primary read) | `clamp(1.75rem, 6vw, 2.5rem)` (28–40 px) | 600 | line-height 1.25; the thing the eye/finger lands on first |
| Speak button label | ~1.5 rem (24 px) | 700 | uppercase per brand |
| Suggestion card text | 1.25–1.5 rem (20–24 px) | 500–600 | full text, wraps, never truncates |
| Status / meta | ≥ 1.125 rem (18 px) | 500 | still large |

Clean sans-serif (system UI stack is fine and performant: `-apple-system, "Segoe UI", Roboto, sans-serif`). Respect Dynamic Type / browser zoom — use `rem`/`clamp`, never fixed `px` heights that clip enlarged text.

### C5. Focus order per state (DOM order = braille reading order)

- **IDLE:** `[Speak button]` — the only interactive element; it holds initial focus.
- **RECORDING:** `[Speak button]` (`aria-pressed="true"`) + Status region announces "Listening". No focus move.
- **CAPTION/REPLY:** DOM/reading order **top→bottom = (1) Caption region → (2) Suggested-replies list (≤ 3 buttons) → (3) Speak button**. Visually the Speak button stays anchored at the bottom (thumb) and the caption at the top; DOM order matches that top-to-bottom order. Do not trap focus; the Speak button is reachable in every state. After a reply is sent, return focus to the Speak button and announce "Sent".

### C6. RECORDING indicator + reduced motion

- **Baseline (no motion):** on entering RECORDING, change the button's border to a solid ≥ 3:1 accent, swap visible label to "LISTENING — TAP TO STOP", flip `aria-pressed="true"`, and emit status "Listening". This is fully perceivable with zero animation and via SR/braille.
- **Enhancement (motion-safe):** any pulse/ring animation lives only inside `@media (prefers-reduced-motion: no-preference)`. Also honour `prefers-contrast` if set.

### C7. Non-text contrast ledger (implementer quick-check)

| Element | Colour on `#111` | Must clear | Guidance |
|---|---|---|---|
| Body/caption text | `#F5F5F5` | 4.5:1 (has ≈17.3:1) | Fine |
| Focus ring | `#F5F5F5` (or accent ≥ 3:1) | 3:1 (1.4.11) | ≥ 3 px, offset, never removed |
| Card border / RECORDING indicator | accent with luminance ≥ ~0.117 (≥ `#767676`) | 3:1 (1.4.11) | Do not rely on hue alone |

---

## Part D — HARD REQUIREMENTS FOR PHASE 2 (checklist)

**Sizing & spacing**
- [ ] Every interactive element **≥ 44 × 44 CSS px** (WCAG 2.5.5 AAA; ≥ 24×24 is the absolute AA floor, do not use it as the target). Apple 44 pt / Material 48 dp corroborate.
- [ ] **≥ 8 px** gap between adjacent targets (Material).
- [ ] Primary **Speak** button: full-width, **≥ ~25–30 vh** tall. Suggestion cards: full-width, **≥ 64 px** tall.

**Contrast**
- [ ] Text `#F5F5F5` on `#111` (≈ **17.3:1**) — already passes AA 4.5:1 and AAA 7:1. Keep it.
- [ ] Every **non-text** indicator (focus ring, borders, RECORDING colour) **≥ 3:1** on `#111` (1.4.11) → luminance ≥ ~0.117 (≥ `#767676`) or use `#F5F5F5`.
- [ ] Never convey state by hue alone (pair with text/shape).

**Layout / reflow / focus / motion**
- [ ] Single-column, **no 2-D scroll at 320 CSS px** width (1.4.10).
- [ ] Visible focus indicator, **≥ 3 px**, ≥ 3:1, offset, never `outline:none` unreplaced (2.4.7); focused control never fully covered by overlays/toasts (2.4.11).
- [ ] RECORDING indicator has a **non-animated baseline**; all motion behind `@media (prefers-reduced-motion: no-preference)` (2.3.3).
- [ ] Type in `rem`/`clamp`; usable with Dynamic Type / zoom; base ≥ 16 px.

**Semantics / ARIA (4.1.2 + 4.1.3)**
- [ ] Speak control = semantic **`<button>`**, role `button`, **accessible name "Speak"** (stable, hold-free).
- [ ] Speak control **toggles** on discrete activation (tap / double-tap / Space / Enter); reflect state with **`aria-pressed="true|false"`**; **do not change the accessible name** on state change (APG).
- [ ] Optional press-and-hold is enhancement only; **release-outside = cancel/abort** (2.5.2). SR/keyboard path never depends on it.
- [ ] **Status region:** `role="status"` + `aria-live="polite"` + `aria-atomic="true"` — ephemeral state ≤ 3 words.
- [ ] **Caption region:** `aria-live="polite"` + `aria-atomic="true"` — write **final** transcript **once**; interim partials go in an `aria-hidden="true"` node.
- [ ] **Buzzing keyword** announced **once, politely** (never assertive).
- [ ] **Errors:** `role="alert"` (assertive) only.
- [ ] **Suggestion cards:** container `<ul>` (`role="list"`) with `aria-label="Suggested replies"`; each card a **`<button>`** whose accessible name = full reply text; **do not auto-move focus** to cards on appearance.
- [ ] Every control has a programmatic **accessible name** (4.1.2); status changes are programmatically determinable and announced without focus (4.1.3).
- [ ] `<html lang="…">` set; meaningful `<title>`; DOM order = visual/reading order (caption → cards → Speak).

**Verification gate (Phase 2 done = )**
- [ ] Full pass with a real screen reader (VoiceOver iOS + TalkBack) — every state entered and every control activated **without any hold/hover/timed gesture**.

---

## Sources (cited)

**WCAG 2.2 — W3C *Understanding* (primary, fetched this session):**
- 2.5.8 Target Size (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- 2.5.5 Target Size (Enhanced): https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html
- 1.4.3 Contrast (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- 1.4.11 Non-text Contrast: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- 1.4.10 Reflow: https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
- 2.4.7 Focus Visible: https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html
- 2.4.11 Focus Not Obscured (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- 2.3.3 Animation from Interactions: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- 2.5.2 Pointer Cancellation: https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html
- 2.5.7 Dragging Movements: https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html
- 4.1.2 Name, Role, Value: https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html
- 4.1.3 Status Messages: https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html

**WAI-ARIA (primary, fetched):**
- APG Button Pattern (aria-pressed, stable label, Enter/Space): https://www.w3.org/WAI/ARIA/apg/patterns/button/

**Platform target-size corroboration (search-verified, official pages):**
- Apple HIG — Accessibility (44 pt): https://developer.apple.com/design/human-interface-guidelines/accessibility
- Android / Material — Touch target size (48 dp, 8 dp spacing): https://support.google.com/accessibility/android/answer/7101858

**Prior-art products (search-verified, official/authoritative pages):**
- Aira: https://aira.io/
- Be My Eyes: https://www.bemyeyes.com/
- NFB-NEWSLINE (deafblind + refreshable braille): https://nfb.org/programs-services/nfb-newsline
- Blitab (braille tablet): https://blitab.com/ ; https://www.perkins.org/resource/blitab-android-tablet-14-row-braille-display/
- Android TalkBack braille display support (May 2022): https://blog.google/products-and-platforms/platforms/android/braille-display-talkback/

**aria-live guidance (secondary, corroborating C2):**
- MDN — aria-live: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live

## Could not fetch / caveats

- **Apple HIG accessibility page** is a JS-rendered SPA; its body did not return via WebFetch this session. The **44 × 44 pt** figure is therefore cited from that canonical URL but corroborated via multiple secondary sources and Material's own comparison ("Apple's guidelines suggest 44 pts"). The load-bearing normative citation for the 44 px floor is **WCAG 2.5.5 (fetched, HIGH)**; Apple/Material are supporting context only.
- **WCAG 2.5.1 Pointer Gestures** was corroborated via search of official/authoritative summaries, not directly fetched; it is supporting context. The load-bearing pointer citations (2.5.2, 2.5.7) were fetched from W3C (HIGH).
