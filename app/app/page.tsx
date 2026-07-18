"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Choice, PullResponse } from "./lib/contract";
import SpeakButton, { type Phase } from "./components/SpeakButton";
import SuggestionCards from "./components/SuggestionCards";
import History, { type HistoryEntry } from "./components/History";

/** Pick the best MediaRecorder mime type this browser actually supports.
 *  iOS Safari (the primary VoiceOver target) does NOT support webm/opus and
 *  falls back to mp4/aac — ElevenLabs Scribe accepts all of these. */
function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

function extForMime(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

const PULL_INTERVAL_MS = 700;
const REPLY_RESULT_INTERVAL_MS = 500;

export default function Home() {
  // ----- render state -----
  const [phase, setPhase] = useState<Phase>("idle");
  const [caption, setCaption] = useState(""); // verbatim (finalised transcript)
  const [buzzing, setBuzzing] = useState(""); // condensed keyword sent to the band
  const [statusMsg, setStatusMsg] = useState(""); // polite, ephemeral, <= 3 words
  const [errorMsg, setErrorMsg] = useState(""); // assertive, failures only
  const [replies, setReplies] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [pollActive, setPollActive] = useState(false);

  // ----- recording refs -----
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeRef = useRef<string>("");
  const intentRef = useRef<"idle" | "starting" | "recording">("idle");
  const pendingStopRef = useRef<null | "send" | "cancel">(null);
  const sendOnStopRef = useRef(false);

  // ----- values the poll closures read without re-subscribing -----
  const captionRef = useRef("");
  const buzzingRef = useRef("");
  const lastRepliesSeqRef = useRef(-1);
  const pullInFlightRef = useRef(false);
  const replyInFlightRef = useRef(false);
  const handleChoiceRef = useRef<(choice: Choice) => void>(() => {});

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const speakButtonRef = useRef<HTMLButtonElement | null>(null);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  // ----- forward pipeline: STT -> condense -> push -> suggest -----
  const runPipeline = useCallback(async (blob: Blob, ext: string) => {
    try {
      setStatusMsg("Working");

      const form = new FormData();
      form.append("file", blob, `speech.${ext}`);
      const sttRes = await fetch("/api/stt", { method: "POST", body: form });
      if (!sttRes.ok) throw new Error("Could not transcribe the audio.");
      const sttData: { transcript?: string } = await sttRes.json();
      const transcript = (sttData.transcript ?? "").trim();
      if (!transcript) {
        setErrorMsg("No speech detected. Please try again.");
        setStatusMsg("");
        setPhase("idle");
        return;
      }

      const condRes = await fetch("/api/condense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      if (!condRes.ok) throw new Error("Could not process the speech.");
      const condData: { keyword?: string; verbatim?: string } =
        await condRes.json();
      const verbatim = (condData.verbatim ?? transcript).trim();
      const keyword = (condData.keyword ?? "").trim();

      const pushRes = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, verbatim }),
      });
      if (!pushRes.ok) throw new Error("Could not send to the band.");

      // Single live update for this event: the caption region (verbatim +
      // buzzing keyword) is announced once; the status region is cleared
      // (empty = no announcement) so two regions never fire in one tick.
      captionRef.current = verbatim;
      buzzingRef.current = keyword;
      setCaption(verbatim);
      setBuzzing(keyword);
      setStatusMsg("");
      setPhase("idle");
      setPollActive(true);

      // Ask for reply suggestions. The cards themselves are rendered from
      // /api/pull (the shared source of truth with the ESP32), not this
      // response, so we only need to fire it.
      fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verbatim }),
      }).catch(() => {
        /* non-fatal: forward-only still works */
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
      setStatusMsg("");
      setPhase("idle");
    }
  }, []);

  // ----- recording control (async-race aware) -----
  const finishRecorder = useCallback(() => {
    const mime = mimeRef.current;
    const blob = new Blob(chunksRef.current, {
      type: mime || "audio/webm",
    });
    chunksRef.current = [];
    stopTracks();
    recorderRef.current = null;
    intentRef.current = "idle";
    if (sendOnStopRef.current) {
      if (blob.size > 0) {
        void runPipeline(blob, extForMime(mime));
      } else {
        setErrorMsg("No speech detected. Please try again.");
        setStatusMsg("");
        setPhase("idle");
      }
    }
    sendOnStopRef.current = false;
  }, [runPipeline, stopTracks]);

  const startRecording = useCallback(async () => {
    if (intentRef.current !== "idle") return;
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setErrorMsg(
        "Microphone is unavailable. Open this page over HTTPS and allow mic access.",
      );
      return;
    }

    intentRef.current = "starting";
    pendingStopRef.current = null;
    setErrorMsg("");
    setReplies([]); // clear stale suggestions from the previous turn

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      intentRef.current = "idle";
      const name = err instanceof DOMException ? err.name : "";
      setErrorMsg(
        name === "NotAllowedError" || name === "SecurityError"
          ? "Microphone permission was denied. Enable it in your browser settings."
          : name === "NotFoundError"
            ? "No microphone was found on this device."
            : "Could not start the microphone. Please try again.",
      );
      return;
    }

    // The user may have released the hold before the mic was ready.
    if (pendingStopRef.current) {
      const action = pendingStopRef.current;
      pendingStopRef.current = null;
      intentRef.current = "idle";
      stream.getTracks().forEach((t) => t.stop());
      if (action === "send") {
        setErrorMsg("That was too short to hear. Please try again.");
      }
      return;
    }

    streamRef.current = stream;
    const mime = pickMimeType();
    mimeRef.current = mime;
    chunksRef.current = [];
    const recorder = mime
      ? new MediaRecorder(stream, { mimeType: mime })
      : new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = finishRecorder;
    recorderRef.current = recorder;
    intentRef.current = "recording";
    recorder.start();

    setCaption("");
    setBuzzing("");
    captionRef.current = "";
    buzzingRef.current = "";
    setPhase("recording");
    setStatusMsg("Listening");
  }, [finishRecorder]);

  const stopRecording = useCallback((send: boolean) => {
    if (intentRef.current === "starting") {
      // Mic not ready yet — remember the intent; startRecording resolves it.
      pendingStopRef.current = send ? "send" : "cancel";
      return;
    }
    if (intentRef.current !== "recording" || !recorderRef.current) return;
    sendOnStopRef.current = send;
    setPhase(send ? "processing" : "idle");
    setStatusMsg(send ? "Working" : "");
    try {
      recorderRef.current.stop();
    } catch {
      // Recorder already stopped; clean up defensively.
      stopTracks();
      recorderRef.current = null;
      intentRef.current = "idle";
      setPhase("idle");
    }
  }, [stopTracks]);

  const onStart = useCallback(() => {
    void startRecording();
  }, [startRecording]);
  const onStopSend = useCallback(() => stopRecording(true), [stopRecording]);
  const onCancel = useCallback(() => stopRecording(false), [stopRecording]);

  // ----- reply selection (from a phone card tap) -----
  const handleCardSelect = useCallback((index: number, text: string) => {
    setReplies([]);
    setStatusMsg("Sending");
    // Setting `choice` on the relay; our /api/reply-result poll then plays it,
    // so a tap here and an encoder select on the wrist run one identical path.
    fetch("/api/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index, text }),
    }).catch(() => {
      setErrorMsg("Could not send your reply. Please try again.");
    });
  }, []);

  // ----- a chosen reply came back (from phone OR the wrist encoder) -----
  const handleChoice = useCallback(
    (choice: Choice) => {
      setReplies([]);
      setStatusMsg("Sent");
      setHistory((h) => [
        ...h,
        {
          id: Date.now(),
          heard: captionRef.current,
          keyword: buzzingRef.current,
          reply: choice.text,
        },
      ]);

      // Speak the reply aloud. This is user-initiated (a reply was selected),
      // not autoplay-on-load; browsers may still gate audio started outside a
      // direct gesture, so a blocked play() is swallowed.
      void (async () => {
        try {
          const r = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: choice.text }),
          });
          if (!r.ok) return;
          const blob = await r.blob();
          cleanupAudio();
          const url = URL.createObjectURL(blob);
          audioUrlRef.current = url;
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.addEventListener("ended", cleanupAudio);
          await audio.play().catch(() => {});
        } catch {
          /* TTS is best-effort; the reply is already logged + on the band */
        }
      })();

      // Return focus to the persistent Speak button (1A §C5).
      speakButtonRef.current?.focus();
    },
    [cleanupAudio],
  );

  // Keep the ref pointing at the latest handler for the poll closures.
  useEffect(() => {
    handleChoiceRef.current = handleChoice;
  }, [handleChoice]);

  // ----- polling: reply-mode replies (~700ms) + chosen reply (~500ms) -----
  useEffect(() => {
    if (!pollActive) return;

    async function pollPull() {
      if (pullInFlightRef.current) return;
      pullInFlightRef.current = true;
      try {
        const r = await fetch("/api/pull", { cache: "no-store" });
        if (!r.ok) return;
        const data: PullResponse = await r.json();
        if (
          data.mode === "reply" &&
          Array.isArray(data.replies) &&
          data.replies.length > 0 &&
          data.seq !== lastRepliesSeqRef.current
        ) {
          lastRepliesSeqRef.current = data.seq;
          const next = data.replies.slice(0, 3);
          setReplies(next);
          setStatusMsg(`${next.length} replies`);
        }
      } catch {
        /* transient poll failure — stay quiet, do not spam the alert region */
      } finally {
        pullInFlightRef.current = false;
      }
    }

    async function pollReplyResult() {
      if (replyInFlightRef.current) return;
      replyInFlightRef.current = true;
      try {
        const r = await fetch("/api/reply-result", { cache: "no-store" });
        if (!r.ok) return;
        const data: { choice: Choice | null } = await r.json();
        if (data.choice) handleChoiceRef.current(data.choice);
      } catch {
        /* transient poll failure — ignore */
      } finally {
        replyInFlightRef.current = false;
      }
    }

    const pullId = setInterval(pollPull, PULL_INTERVAL_MS);
    const replyId = setInterval(pollReplyResult, REPLY_RESULT_INTERVAL_MS);
    return () => {
      clearInterval(pullId);
      clearInterval(replyId);
    };
  }, [pollActive]);

  // ----- unmount cleanup -----
  useEffect(() => {
    return () => {
      try {
        recorderRef.current?.stop();
      } catch {
        /* ignore */
      }
      stopTracks();
      cleanupAudio();
    };
  }, [stopTracks, cleanupAudio]);

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">Speech to Braille</h1>
        <p className="app__tagline">
          Speak a message. It is captioned here and buzzed to the wrist band.
        </p>
      </header>

      {/* Errors only — assertive. Present from first paint, empty until needed. */}
      <div className="alertRegion" role="alert">
        {errorMsg}
      </div>

      {/* Ephemeral state, <= 3 words, announced politely. */}
      <div
        className="statusRegion"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {statusMsg}
      </div>

      <div className="transcript">
        {/* The finalised transcript + buzzing keyword, announced once, together. */}
        <div className="captionRegion" aria-live="polite" aria-atomic="true">
          {caption ? <p className="caption">{caption}</p> : null}
          {buzzing ? (
            <p className="buzzing">
              <span className="buzzing__label">Buzzing:</span>{" "}
              <span className="buzzing__word">{buzzing}</span>
            </p>
          ) : null}
        </div>

        <SuggestionCards replies={replies} onSelect={handleCardSelect} />

        <History entries={history} />
      </div>

      {/* Visible affordance for sighted users. aria-hidden so it is not read as
          a standalone node — its text still reaches the screen reader via the
          button's aria-describedby, avoiding a double announcement. */}
      <p id="speak-help" className="speakHelp" aria-hidden="true">
        Hold or tap to speak. Tap again to stop.
      </p>

      <SpeakButton
        phase={phase}
        onStart={onStart}
        onStopSend={onStopSend}
        onCancel={onCancel}
        buttonRef={speakButtonRef}
      />
    </main>
  );
}
