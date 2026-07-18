"use client";

// Phone camera capture page (the camera host). Grabs frames from the rear
// camera at ~2Hz, POSTs each to the Modal detector, translates the detector
// response into a device command, and POSTs it to /api/event only on change.
// This is the only component that speaks both the detector's vocabulary and
// the device's — so it owns the translation and the edge-trigger.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  detectorToEvent,
  sameEvent,
  type DetectorState,
  type EventRequest,
  type ModalResponse,
} from "@/lib/contract";

const CAPTURE_MS = 500; // 2 Hz — a bus pulling in is a multi-second event
const JPEG_QUALITY = 0.85;

const IDLE_EVENT: EventRequest = {
  pattern: "NONE",
  route: "",
  dest: "",
  conf: "",
  arrivalId: 0,
};

export default function CapturePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastEventRef = useRef<EventRequest>(IDLE_EVENT);
  const inFlight = useRef(false);
  const forceNext = useRef(false);

  const [modalUrl, setModalUrl] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>("");
  const [frames, setFrames] = useState(0);
  const [lastPattern, setLastPattern] = useState<string>("–");

  // Modal URL comes from ?modal=<url> or NEXT_PUBLIC_MODAL_URL, so it can change
  // between `modal serve` and `modal deploy` without a redeploy of this app.
  // Client-only read (needs window) — an effect avoids a hydration mismatch.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("modal");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only value
    setModalUrl(q || process.env.NEXT_PUBLIC_MODAL_URL || "");
  }, []);

  // Space forces one detection (the disclosed demo aid).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space") {
        e.preventDefault();
        forceNext.current = true;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const grabFrameB64 = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY).split(",")[1] ?? null;
  }, []);

  const tick = useCallback(async () => {
    if (inFlight.current || !modalUrl) return;
    const frameB64 = grabFrameB64();
    if (!frameB64) return;

    inFlight.current = true;
    const force = forceNext.current;
    forceNext.current = false;
    try {
      const res = await fetch(modalUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frame_b64: frameB64, force }),
      });
      const m = (await res.json()) as ModalResponse;
      setFrames((n) => n + 1);
      setError("");

      // Mirror the raw detector state to the debug screen every frame.
      const detector: DetectorState = {
        event: m.event,
        present: m.present,
        confidence: m.confidence,
        arrivalId: m.arrival_id,
        route: m.reading?.route ?? "",
        destination: m.reading?.destination ?? "",
        readingConf: m.reading?.confidence ?? "",
        votes: m.votes ?? [],
      };
      void fetch("/api/detector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(detector),
      });

      // Translate → device command, and POST only when the meaning changes.
      const event = detectorToEvent(m);
      if (!sameEvent(event, lastEventRef.current)) {
        lastEventRef.current = event;
        setLastPattern(event.pattern + (event.route ? ` ${event.route}` : ""));
        void fetch("/api/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event),
        });
      }
    } catch {
      setError("Couldn't reach the detector – check the Modal URL and network.");
    } finally {
      inFlight.current = false;
    }
  }, [modalUrl, grabFrameB64]);

  const start = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      lastEventRef.current = IDLE_EVENT;
      setRunning(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? `Camera unavailable – ${e.message}. Grant camera access and retry.`
          : "Camera unavailable – grant access and retry.",
      );
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRunning(false);
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(tick, CAPTURE_MS);
    return () => clearInterval(id);
  }, [running, tick]);

  useEffect(() => () => stop(), [stop]);

  return (
    <main className="min-h-full flex-1 bg-background px-6 py-8 font-sans text-foreground">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-medium tracking-tight">Camera</h1>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/" />}>
            Monitor
          </Button>
        </header>

        <div className="relative overflow-hidden rounded-lg border border-border bg-black">
          <video ref={videoRef} playsInline muted className="aspect-video w-full object-cover" />
          {!running && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/60">
              Camera off
            </div>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />

        <div className="flex flex-wrap items-center gap-3">
          {!running ? (
            <Button size="sm" onClick={start}>
              Start camera
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={stop}>
              Stop
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            <span className="font-mono tabular-nums text-foreground">{frames}</span> frames
            sent, last <span className="font-mono text-foreground">{lastPattern}</span>
          </span>
        </div>

        {!modalUrl && (
          <p className="rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">
            No detector URL set. Add <code className="font-mono">?modal=&lt;url&gt;</code> to the
            address, or set <code className="font-mono">NEXT_PUBLIC_MODAL_URL</code>. Frames aren&apos;t
            sent until it is configured.
          </p>
        )}
        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <p className="hidden text-xs text-muted-foreground md:block">
          Press <kbd className="rounded border border-border px-1 font-mono">space</kbd> to force one
          detection.
        </p>
      </div>
    </main>
  );
}
