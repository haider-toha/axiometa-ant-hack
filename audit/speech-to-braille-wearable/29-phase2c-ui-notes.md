# Phase 2 / Track C — Accessible Web UI + Client Pipeline (implementation notes)

- **Date:** 2026-07-18
- **Track:** Phase 2 / Track C — the companion web app UI + full client pipeline.
- **Grounds on:** `24-phase1a-ui-research.md` (hard requirements applied directly) and `25-phase1b-api-grounding.md` (endpoint shapes copied verbatim).
- **Files written:**
  - `app/app/layout.tsx` — root layout, `<html lang="en">`, metadata + viewport.
  - `app/app/globals.css` — dark theme, focus, reduced-motion, target sizing.
  - `app/app/page.tsx` (`"use client"`) — 3-state UI + forward pipeline + reply loop + polling.
  - `app/app/components/SpeakButton.tsx` — the press-to-talk toggle (dual input path).
  - `app/app/components/SuggestionCards.tsx` — labelled list of reply `<button>`s.
  - `app/app/components/History.tsx` — on-screen exchange log (`<ul>`, not a live region).
  - Removed the orphaned create-next-app `app/page.module.css`.
- **Verified (this track):** `npx eslint app/page.tsx app/layout.tsx app/components` → exit 0; `npx tsc --noEmit` (whole project) → exit 0. Per instructions I did **not** run `next build` / `npm run build` (the orchestrator runs the authoritative build after both web tracks land). Client request/response shapes were cross-checked against the API track's actual routes in `app/app/api/*` — all eight align.

---

## 1. The three states (as built)

| State | Rendered | Button (`SpeakButton`) |
|---|---|---|
| **IDLE** | Title + tagline, empty (present-from-first-paint) live regions, hero button at the bottom | visible "SPEAK", hollow-circle indicator, `aria-pressed="false"` |
| **RECORDING** | unchanged except the button + status region | inverted-weight border + filled-square (stop) indicator + "Listening… tap to stop", `aria-pressed="true"`; status region says "Listening" |
| **CAPTION/REPLY** | large caption (verbatim) + small "Buzzing: `<keyword>`" line, then up to 3 suggestion cards, then history | back to idle appearance (`aria-pressed="false"`) |

A transient **PROCESSING** sub-state (`aria-disabled="true"`, "Working…", status "Working") covers STT→condense→push. The button uses `aria-disabled`, **never** the native `disabled` attribute, so it stays focusable and focus is never lost (2.4.11).

---

## 2. WCAG 2.2 success criteria applied (with numbers)

**Perceivable**
- **1.3.1 Info & Relationships (A)** — semantic `<main>/<header>/<section>/<h1>/<h2>/<ul>/<li>/<button>`; cards + history are real lists; regions carry roles.
- **1.3.2 Meaningful Sequence (A)** — DOM order = visual/reading order: caption → cards → history → (help) → Speak button.
- **1.4.1 Use of Color (A)** — the RECORDING state is signalled by **shape (circle→square) + text ("Listening…") + border-weight + colour together**, never hue alone. Errors are text + a bordered box, not colour.
- **1.4.3 Contrast Minimum (AA)** and **1.4.6 Contrast Enhanced (AAA)** — `#F5F5F5` on `#111` ≈ 17.3:1; muted text `#d0d0d0` ≈ 12:1. Both clear AAA 7:1.
- **1.4.4 Resize Text (AA)** — all type in `rem`/`clamp`, base `font-size:100%` (16px), `text-size-adjust:100%`, and the viewport does **not** disable user scaling.
- **1.4.10 Reflow (AA)** — single column, `overflow-x:hidden`, flex-column shell, an internally-scrolling transcript region; usable at 320px with vertical-only scroll.
- **1.4.11 Non-text Contrast (AA)** — idle borders `#9a9a9a` ≈ 6.7:1; recording border + focus ring `#F5F5F5`; amber indicator `#ffd166`. All ≥ 3:1 on `#111` (ledger in `globals.css` comments, traced to 1A §C7).
- **1.4.13 Content on Hover/Focus (AA)** — no hover-revealed content; hover only tints a background on fine-pointer devices.

**Operable**
- **2.1.1 Keyboard (A)** / **2.1.2 No Keyboard Trap (A)** — every control is a native `<button>`; Space/Enter toggle; no trap.
- **2.2.1 Timing Adjustable (A)** — the SR/keyboard path has **no timing** at all; the 250 ms hold threshold exists only on the sighted pointer-hold enhancement and is not required to operate anything.
- **2.3.3 Animation from Interactions (AAA)** — motion OFF by default; transitions + the optional recording pulse live only inside `@media (prefers-reduced-motion: no-preference)`.
- **2.4.2 Page Titled (A)** — descriptive `<title>` via `metadata`.
- **2.4.3 Focus Order (A)** — reading order matches DOM; after a reply is chosen, focus returns to the Speak button.
- **2.4.7 Focus Visible (AA)** — global `:focus-visible { outline: 4px solid #F5F5F5; outline-offset: 3px }`; the default outline is only removed where this replacement applies.
- **2.4.11 Focus Not Obscured, Minimum (AA)** — no sticky/overlay/toast; the focused Speak button is never covered.
- **2.5.1 Pointer Gestures (A)** — activation is a single-pointer click; no path-based/multipoint gesture is required.
- **2.5.2 Pointer Cancellation (A)** — discrete activation is on the **up** event (click); on the hold enhancement, **releasing outside the button aborts** (no send), and `pointercancel` aborts. So there is an abort path.
- **2.5.3 Label in Name (A)** — the accessible name is exactly the visible label word **"Speak"**; the "hold or tap" copy is a **description** (`aria-describedby`), not a label, so name ⊇ visible label holds. (This is my reconciliation of 1A §C1 point 5 — see §4.)
- **2.5.5 Target Size Enhanced (AAA)** — Speak button ≥ 28vh full-width; suggestion cards ≥ 64px full-width; every control ≥ 44×44 CSS px; ≥ 12px gaps (≥ 8px floor). Also satisfies **2.5.8 (AA)**.
- **2.5.7 Dragging Movements (AA)** — nothing requires a drag; the hold gesture has a non-drag equivalent (tap/click).

**Understandable / Robust**
- **3.1.1 Language of Page (A)** — `<html lang="en">`.
- **3.2.2 On Input (A)** — no context change happens automatically on focus/selection beyond the explicit send the user triggered.
- **4.1.2 Name, Role, Value (A)** — semantic `<button>`s; the toggle exposes `aria-pressed`; the accessible name is stable across state changes (APG Button pattern).
- **4.1.3 Status Messages (AA)** — `role="status"` (polite) for ephemeral state and `role="alert"` (assertive) for errors; both announce without moving focus.

---

## 3. Every ARIA role / attribute used, and where

| ARIA | Where (file) | Purpose |
|---|---|---|
| `lang="en"` | `layout.tsx` `<html>` | 3.1.1 |
| `role="status"` + `aria-live="polite"` + `aria-atomic="true"` | `page.tsx` status region | ephemeral state ≤ 3 words (4.1.3) |
| `aria-live="polite"` + `aria-atomic="true"` | `page.tsx` caption region | finalised verbatim + buzzing keyword, announced once, atomically |
| `role="alert"` | `page.tsx` error region | assertive, failures only (4.1.3) |
| `aria-pressed={isRecording}` | `SpeakButton.tsx` | toggle state, not a name change (APG, 4.1.2) |
| `aria-disabled={isProcessing}` | `SpeakButton.tsx` | busy state that keeps focus (vs native `disabled`) |
| `aria-describedby="speak-help"` | `SpeakButton.tsx` | pulls the "hold or tap" helper text as a description (keeps name = "Speak") |
| `aria-hidden="true"` | `SpeakButton.tsx` indicator span, state-text span; `page.tsx` `#speak-help` `<p>` | keep decorative/duplicative nodes out of the name + reading order |
| `role="list"` + `aria-label="Suggested replies"` | `SuggestionCards.tsx` `<ul>` | belt-and-braces list semantics + group name (1A §C3) |
| `aria-labelledby="cards-heading"` (+ `id` on `<h2>`) | `SuggestionCards.tsx` | names the cards region |
| `aria-label="Conversation history"` | `History.tsx` `<section>` | names the log |
| implicit `button` / `list` / `listitem` / `heading` / `main` / `banner` | throughout | native semantics, no ARIA needed |

Accessible name of the hero control is the button's own text node **"Speak"** (the indicator + state spans are `aria-hidden`), so no `aria-label` is used there — name comes from content, the cleanest 2.5.3/4.1.2 form.

---

## 4. Press-to-talk vs screen reader — resolution as implemented

Implements 1A §C1 ("one control, two input paths, stable name") in `SpeakButton.tsx`:

1. **Primary, always-available contract = TOGGLE on discrete activation (`onClick`).** A click is emitted by keyboard **Space/Enter**, by a **VoiceOver / TalkBack double-tap**, by a mouse click, and by a quick touch tap. This path is **entirely timing-free**, so the braille + screen-reader user is never asked to perform a gesture their input method cannot produce. idle→click starts; recording→click stops-and-sends.
2. **State via `aria-pressed`, never the name.** `aria-pressed` flips `false↔true`; the accessible name stays **"Speak"**. The *visible* state word ("Listening…") is `aria-hidden`; the SR learns state from `aria-pressed` + the status region.
3. **Press-and-hold is a sighted-only progressive enhancement.** `pointerdown` (from idle, primary button) starts recording immediately and captures the pointer; on `pointerup`, a hit-test against the button rect decides:
   - **inside + held ≥ 250 ms** → stop-and-send;
   - **inside + held < 250 ms** → treat as a **tap** — recording stays on, user taps again to stop (toggle semantics);
   - **outside** (or `pointercancel`) → **abort/discard** (satisfies 2.5.2).
   The trailing click after any handled pointer gesture is suppressed (`suppressClickRef`) so it cannot double-toggle. `touch-action:none` + `user-select:none` + `-webkit-touch-callout:none` make the hold reliable and stop long-press selection/zoom.
4. **Async-race handling** lives in the page's recording controller (`intentRef`: idle/starting/recording; `pendingStopRef`): if the user releases before `getUserMedia` resolves, the pending stop/cancel is honoured when the mic becomes ready (a too-short hold surfaces a gentle error rather than sending an empty clip). Tracks are always stopped on `onstop`/unmount.
5. **`getUserMedia` errors** map to specific messages (permission denied / no mic / insecure context) into the alert region.

Net: sighted one-handed users can hold; **everyone**, including the deafblind primary user on VoiceOver/TalkBack + a braille display, can tap/activate with no hold, hover, or timed gesture.

---

## 5. Live-region strategy — announce once, never spam (1A §C2)

Three regions, all present from first paint (empty), updated by text injection:

- **Status** — `role="status"` `aria-live="polite"` `aria-atomic="true"`. Only ephemeral state ≤ 3 words: "Listening", "Working", "Sending", "Sent", "3 replies".
- **Caption** — `aria-live="polite"` `aria-atomic="true"`. Carries the **finalised** verbatim transcript **and** the "Buzzing: `<keyword>`" line **in the same atomic region**, so the forward result is announced **once** (verbatim + buzzed keyword together), politely — never assertive.
- **Errors** — `role="alert"` (assertive), failures only.

Anti-spam rules honoured:
- **No interim/partial ASR is ever streamed to a live region.** The pipeline uses ElevenLabs Scribe **batch** STT, so there are no partials by construction; the visible recording indicator is `aria-hidden` and the caption region receives only the final string.
- **One live update per user-visible event; never two regions in one tick.** When the result lands I set the caption **and** clear the status to `""` (empty = no announcement) in the same commit → a single announcement. Card arrival ("3 replies") is a separate later tick via the poll.
- **Buzzing keyword announced once, politely** — co-located in the atomic caption region (1A explicitly permits "append it to the caption").
- **Suggestion cards do not auto-move focus**; their arrival is announced once via the status region. The user navigates to them.
- **History is a plain `<ul>`, not a live region**, so it never re-announces.
- **De-dup:** `/api/pull` replies are keyed on `seq` (`lastRepliesSeqRef`) so re-polls of the same reply state announce nothing; `/api/reply-result` is GETDEL server-side (returns a choice exactly once).

---

## 6. Client pipeline (as wired to the API track)

Forward: `getUserMedia({audio:true})` → `MediaRecorder` (best supported of `audio/webm;codecs=opus` → `audio/webm` → `audio/mp4` → `audio/ogg;codecs=opus`; **iOS Safari falls back to mp4/aac, which Scribe accepts**) → Blob → `POST /api/stt` (multipart `file`) → `{transcript}` → `POST /api/condense {transcript}` → `{keyword,verbatim}` → `POST /api/push {keyword,verbatim}` → `{seq}`; then `setCaption(verbatim)` + `setBuzzing(keyword)` and fire `POST /api/suggest {verbatim}`.

Reply loop: poll `GET /api/pull` (700 ms); on `mode==="reply"` render `replies` as cards. Card tap → `POST /api/reply {index,text}` (sets `choice`). Poll `GET /api/reply-result` (500 ms); on a returned `choice` → `POST /api/tts {text}`, play the `audio/mpeg` via an `Audio` element, append the exchange to history, and return focus to the Speak button. A phone card-tap and a wrist-encoder select run the **same** `/api/reply → reply-result` path (one code path, consistent for both selection sources). Polling starts after the first successful forward push and is guarded against overlapping requests; transient poll failures are swallowed (never spam the alert region).

---

## 7. Design decisions & deviations (traced to 1A)

- **Palette / type scale / layout** taken directly from 1A §A2/§C4/§C7: `#111`/`#F5F5F5`, caption `clamp(1.75rem,6vw,2.5rem)`, uppercase button label, cards ≥ 64px, hero ≥ 28vh. Layout = caption top / cards middle / history / Speak button anchored at the bottom (thumb zone), matching 1A §C4–C5 reading order.
- **iOS mime-type fallback** added (1A did not specify recording format) because the primary user is on VoiceOver/Safari, where webm/opus is unsupported.
- **Deviation — 2.5.3 over the literal "changing visible label".** 1A §C1 point 5 proposed a *changing* visible label ("HOLD OR TAP TO SPEAK" → "LISTENING — TAP TO STOP") while the accessible name stays "Speak". Taken literally that risks **2.5.3 Label in Name** (name "Speak" would not contain the visible label). I kept 1A's load-bearing intent (stable, hold-free accessible name "Speak"; state via `aria-pressed` + status region) and moved the "hold or tap" affordance into an `aria-describedby` **description** and an `aria-hidden` in-button state word. This satisfies 2.5.3 **and** the APG stable-name rule **and** 1A's intent simultaneously.
- **Deviation — no `autofocus` on mount.** 1A §C5 says the Speak button "holds initial focus" in IDLE. I do **not** force focus on load (widely regarded as harmful for SR orientation — it skips the page title/heading); instead the button is the primary control and focus is explicitly returned to it after a reply is sent (the case 1A actually needs). Not a Part-D hard requirement, so this is a documented refinement.
- **Continuous polling after first push.** Kept simple and robust (mirrors the poll-based architecture and lets a wrist-initiated reply arrive at any time) rather than orchestrating dynamic start/stop windows.
- **TTS autoplay caveat.** Playing the spoken reply is user-initiated (a reply was selected), not autoplay-on-load, so it does not violate 1A's "no autoplaying media". A browser that still gates audio started outside a direct gesture will reject `play()`; that rejection is swallowed and the reply is already logged + already on the band.

---

## 8. Verification gate status

- Self-consistency + typecheck: **PASS** (`eslint` exit 0 on my files; `tsc --noEmit` exit 0 project-wide).
- Endpoint alignment with the parallel API track: **confirmed** for all eight routes.
- **Left to the orchestrator:** the authoritative `npm run build` + `npm run lint` after both web tracks land (not run here to avoid corrupting the shared `.next/`).
- **Still owed at system integration (1A Part D gate):** a real screen-reader pass (VoiceOver iOS + TalkBack) entering every state and activating every control with no hold/hover/timed gesture.
