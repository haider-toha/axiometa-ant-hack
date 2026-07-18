"use client";

import { useRef } from "react";

export type Phase = "idle" | "recording" | "processing";

interface SpeakButtonProps {
  phase: Phase;
  /** Begin recording (from idle). */
  onStart: () => void;
  /** Stop recording and send it down the pipeline. */
  onStopSend: () => void;
  /** Abort recording and discard it (release-outside on the hold gesture). */
  onCancel: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}

/** Below this hold duration a pointer press is treated as a discrete TAP (toggle). */
const HOLD_THRESHOLD_MS = 250;

/**
 * The one control, two input paths (resolution from 1A §C1):
 *
 *  - PRIMARY, always-available contract = TOGGLE on discrete activation (`onClick`).
 *    A click is produced by keyboard Space/Enter, by a VoiceOver / TalkBack
 *    double-tap, by a mouse click and by a quick touch tap. This path is 100%
 *    timing-free, so the braille + screen-reader user is never asked to perform a
 *    gesture their input method cannot express.
 *
 *  - ENHANCEMENT for sighted pointer users = press-and-hold. Pointer-down starts
 *    recording; holding past HOLD_THRESHOLD then releasing over the button
 *    stops-and-sends; releasing OUTSIDE the button cancels/aborts (satisfies
 *    2.5.2 Pointer Cancellation). The click that follows a handled pointer
 *    gesture is suppressed so it does not double-toggle.
 *
 * The accessible name is a stable, hold-free "Speak" (button text). State is
 * exposed via `aria-pressed`, never by renaming the control (APG toggle pattern,
 * 4.1.2). The visible "hold or tap" affordance is a *description*
 * (`aria-describedby`), not part of the name, so it never competes with 2.5.3
 * Label in Name.
 */
export default function SpeakButton({
  phase,
  onStart,
  onStopSend,
  onCancel,
  buttonRef,
}: SpeakButtonProps) {
  const armedRef = useRef(false); // a pointer press we are tracking (started from idle)
  const downAtRef = useRef(0);
  const suppressClickRef = useRef(false);

  const isRecording = phase === "recording";
  const isProcessing = phase === "processing";

  function handleClick() {
    // A pointer gesture already handled this interaction — swallow its click.
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (isProcessing) return;
    if (isRecording) {
      onStopSend();
    } else {
      onStart();
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    // Only the primary button / touch contact, and only from idle: the hold
    // enhancement starts a recording. When already recording or processing we
    // let the click path handle it.
    if (isProcessing) return;
    if (e.button !== 0) return;
    suppressClickRef.current = false;
    if (phase !== "idle") return;

    armedRef.current = true;
    downAtRef.current = e.timeStamp;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* setPointerCapture can throw for stale pointer ids; safe to ignore */
    }
    onStart();
  }

  function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!armedRef.current) return;
    armedRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    const held = e.timeStamp - downAtRef.current;

    // The pointer gesture resolves the interaction; suppress the trailing click.
    suppressClickRef.current = true;

    if (!inside) {
      onCancel(); // release-outside = abort (2.5.2)
    } else if (held >= HOLD_THRESHOLD_MS) {
      onStopSend(); // a deliberate hold-and-release = send
    }
    // else: a quick TAP. Recording already started on pointer-down and stays on;
    // the user taps again to stop (that second click is not suppressed).
  }

  function handlePointerCancel() {
    if (!armedRef.current) return;
    armedRef.current = false;
    suppressClickRef.current = true;
    onCancel();
  }

  const visibleLabel = "Speak";
  const stateText = isRecording
    ? "Listening… tap to stop"
    : isProcessing
      ? "Working…"
      : "";

  return (
    <button
      ref={buttonRef}
      type="button"
      className={
        "speakButton" + (isRecording ? " speakButton--recording" : "")
      }
      aria-pressed={isRecording}
      aria-disabled={isProcessing}
      aria-describedby="speak-help"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <span className="indicator" aria-hidden="true" />
      {/* The accessible name is exactly this text: stable, hold-free "Speak". */}
      <span className="speakButton__label">{visibleLabel}</span>
      {/* State words are for sighted users; the screen reader learns state from
          aria-pressed + the status live region, so this is aria-hidden. */}
      {stateText ? (
        <span className="speakButton__state" aria-hidden="true">
          {stateText}
        </span>
      ) : null}
    </button>
  );
}
