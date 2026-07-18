"use client";

// Phone camera capture page (the camera host). Grabs frames from the rear
// camera at ~2Hz, POSTs each to the Modal detector, draws what came back over
// the video, translates the detector response into a device command, and POSTs
// it to /api/event only on change. This is the only component that speaks both
// the detector's vocabulary and the device's, so it owns the translation and
// the edge-trigger.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  detectorToEvent,
  sameEvent,
  type DetectorState,
  type EventRequest,
  type ModalDetection,
  type ModalResponse,
} from "@/lib/contract";

const CAPTURE_MS = 500; // 2 Hz – a bus pulling in is a multi-second event
const JPEG_QUALITY = 0.85;
const VISIBLE_LABELS = 6; // how many detections the list shows under the video

// Inlined at build time by Next, so this is a constant and identical on both
// server and client – no effect, no hydration dance, no query-string override.
// If it is empty the page says so and names the fix rather than silently
// posting nowhere.
const MODAL_URL = process.env.NEXT_PUBLIC_MODAL_URL ?? "";

const IDLE_EVENT: EventRequest = {
  pattern: "NONE",
  route: "",
  dest: "",
  conf: "",
  arrivalId: 0,
};

/** Which overlay token a box is drawn in. Colour is the only thing separating
 *  the arrival target from a hazard from everything else. */
function detectionToken(d: ModalDetection): string {
  if (d.target) return "--detect-target";
  if (d.kind) return "--detect-hazard";
  return "--detect-other";
}

export default function CapturePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastEventRef = useRef<EventRequest>(IDLE_EVENT);
  const inFlight = useRef(false);
  const forceNext = useRef(false);

  // One session per page load. The detector namespaces its hazard key on this,
  // and echoes it back so a mismatch is visible rather than silent. Minted on
  // first use inside a callback rather than during render – generating an id
  // while rendering is impure, and React is entitled to render twice.
  const sessionRef = useRef<string>("");
  const sessionId = useCallback(() => {
    if (!sessionRef.current) {
      sessionRef.current = `web-${crypto.randomUUID().slice(0, 8)}`;
    }
    return sessionRef.current;
  }, []);

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>("");
  const [frames, setFrames] = useState(0);
  const [detections, setDetections] = useState<ModalDetection[]>([]);
  const [modal, setModal] = useState<ModalResponse | null>(null);

  const grabFrameB64 = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = captureRef.current;
    if (!video || !canvas || !video.videoWidth) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY).split(",")[1] ?? null;
  }, []);

  // Boxes arrive normalised 0..1, so the overlay is sized to the video's
  // INTRINSIC resolution and then CSS-scaled by exactly the same rule as the
  // video element beneath it. That keeps the two aligned without this component
  // ever knowing what resolution the camera actually handed back.
  const drawBoxes = useCallback((dets: ModalDetection[]) => {
    const canvas = overlayRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !video.videoWidth) return;
    if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
    if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Read the tokens each draw so the overlay follows the theme toggle.
    const css = getComputedStyle(document.documentElement);
    const unit = canvas.width / 640; // keep strokes even across capture sizes
    ctx.lineWidth = Math.max(1.5, 2 * unit);
    // The family is taken from the resolved computed style, NOT from a
    // `var(--font-sans)` reference: a canvas font string is not CSS and does
    // not resolve custom properties. Assigning an invalid one is silently
    // ignored, which leaves every label at the 10px canvas default.
    const family = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
    ctx.font = `500 ${Math.round(13 * unit)}px ${family}`;
    ctx.textBaseline = "top";

    for (const d of dets) {
      if (d.box.length !== 4) continue;
      const colour = css.getPropertyValue(detectionToken(d)).trim();
      const [nx1, ny1, nx2, ny2] = d.box;
      const x = nx1 * canvas.width;
      const y = ny1 * canvas.height;
      const w = (nx2 - nx1) * canvas.width;
      const h = (ny2 - ny1) * canvas.height;

      ctx.strokeStyle = colour;
      ctx.strokeRect(x, y, w, h);

      // Label chip, tucked INSIDE the top-left corner rather than above it, so
      // it stays on screen for a box that starts at y = 0. Clamped on x for the
      // same reason: a detection against the right edge would otherwise have
      // its label rendered off-frame.
      const text = `${d.label} ${d.confidence.toFixed(2)}`;
      const padX = 5 * unit;
      const chipH = 18 * unit;
      const chipW = ctx.measureText(text).width + padX * 2;
      const chipX = Math.max(0, Math.min(x, canvas.width - chipW));
      ctx.fillStyle = colour;
      ctx.fillRect(chipX, y, chipW, chipH);
      ctx.fillStyle = "oklch(0.145 0 0)";
      ctx.fillText(text, chipX + padX, y + 3 * unit);
    }
  }, []);

  const tick = useCallback(async () => {
    if (inFlight.current) return;
    const frameB64 = grabFrameB64();
    if (!frameB64) return;

    inFlight.current = true;
    const force = forceNext.current;
    forceNext.current = false;
    try {
      const res = await fetch(MODAL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frame_b64: frameB64,
          session_id: sessionId(),
          force,
        }),
      });
      if (!res.ok) {
        throw new Error(`detector returned ${res.status}`);
      }
      const m = (await res.json()) as ModalResponse;
      // Stopped while this frame was in flight. Without this the late response
      // paints boxes back over a camera the user has already switched off.
      if (!streamRef.current) return;
      setFrames((n) => n + 1);
      setError("");
      setModal(m);
      setDetections(m.detections ?? []);
      drawBoxes(m.detections ?? []);

      // Mirror the raw detector state to the monitor screen every frame.
      const detector: DetectorState = {
        event: m.event,
        present: m.present,
        confidence: m.confidence,
        arrivalId: m.arrival_id,
        route: m.reading?.route ?? "",
        destination: m.reading?.destination ?? "",
        readingConf: m.reading?.confidence ?? "",
        votes: m.votes ?? [],
        labels: (m.detections ?? []).map((d) => d.label),
        hazards: m.hazards ?? [],
        targetBearing: (m.detections ?? []).find((d) => d.target)?.bearing ?? "",
      };
      // Fire and forget, but explicitly swallowed: the monitor mirror is
      // advisory, and an unhandled rejection here would surface as an uncaught
      // promise error rather than being the non-event it actually is.
      void fetch("/api/detector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(detector),
      }).catch(() => {});

      // Translate to a device command, and POST only when the meaning changes.
      const event = detectorToEvent(m);
      if (!sameEvent(event, lastEventRef.current)) {
        lastEventRef.current = event;
        void fetch("/api/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event),
          // Edge-triggered: this is the only POST that reaches the device, so a
          // dropped one is a missed pattern. Re-arm the diff on failure so the
          // next frame resends instead of assuming it landed.
        }).catch(() => {
          lastEventRef.current = IDLE_EVENT;
        });
      }
    } catch (e) {
      setError(
        e instanceof Error && e.message.startsWith("detector returned")
          ? `The detector rejected the frame – ${e.message}. Check the Modal service is deployed.`
          : "Could not reach the detector. Check your connection, then start the camera again.",
      );
    } finally {
      inFlight.current = false;
    }
  }, [grabFrameB64, drawBoxes, sessionId]);

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
          ? `The camera could not start – ${e.message}. Allow camera access for this site, then try again.`
          : "The camera could not start. Allow camera access for this site, then try again.",
      );
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRunning(false);
    setDetections([]);
    const canvas = overlayRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(tick, CAPTURE_MS);
    return () => clearInterval(id);
  }, [running, tick]);

  useEffect(() => () => stop(), [stop]);

  const reading = modal?.reading;

  return (
    <main className="flex-1 bg-background px-6 py-8 font-sans text-foreground">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-medium tracking-tight">Camera</h1>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/" />}>
            Monitor
          </Button>
        </header>

        {!MODAL_URL ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            No detector is configured. Set <code className="font-mono">NEXT_PUBLIC_MODAL_URL</code>{" "}
            to the Modal endpoint and redeploy.
          </p>
        ) : (
          <>
            {/* min-height reserves space for the idle state: the video element
                has no intrinsic height until a stream is attached, and the
                overlay must scale with the video rather than crop against it,
                so neither can carry a fixed aspect ratio. */}
            <div className="relative min-h-48 overflow-hidden rounded-lg border border-border bg-black">
              <video ref={videoRef} playsInline muted className="block w-full" />
              <canvas ref={overlayRef} className="absolute inset-0 h-full w-full" />
              {!running && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-white/60">
                  Camera off
                </div>
              )}
            </div>
            <canvas ref={captureRef} className="hidden" />

            <div className="flex flex-wrap items-center gap-3">
              {!running ? (
                <Button size="sm" onClick={start}>
                  Start camera
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={stop}>
                    Stop
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      forceNext.current = true;
                    }}
                  >
                    Force reading
                  </Button>
                </>
              )}
              <span className="text-sm text-muted-foreground">
                <span className="font-mono tabular-nums text-foreground">{frames}</span> frames
              </span>
            </div>

            <section className="rounded-lg border border-border bg-card p-4 text-card-foreground">
              <h2 className="mb-3 text-sm font-medium">In view</h2>
              {detections.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {running
                    ? "Nothing recognised yet. Point the camera at an object and hold steady."
                    : "Start the camera to see what the detector recognises."}
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {detections.slice(0, VISIBLE_LABELS).map((d, i) => (
                    <li
                      key={`${d.label}-${i}`}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ background: `var(${detectionToken(d)})` }}
                        />
                        <span className="truncate">{d.label}</span>
                      </span>
                      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                        {d.bearing} {d.confidence.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border border-border bg-card p-4 text-card-foreground">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-medium">Bus</h2>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  arrival {modal?.arrival_id ?? 0}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3">
                <span className="font-mono text-xl font-medium">
                  {reading?.route || (modal?.present ? "reading" : "–")}
                </span>
                <span className="text-sm text-muted-foreground">
                  {reading?.destination || (modal?.present ? "Bus in view" : "No bus in view")}
                </span>
              </div>
              {modal?.reading_ready && (!reading || reading.confidence === "low") && (
                <p className="mt-2 text-sm text-muted-foreground">
                  The blind could not be read confidently, so no route is being sent.
                </p>
              )}
            </section>

            {error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
