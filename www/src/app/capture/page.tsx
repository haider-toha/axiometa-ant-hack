"use client";

// Phone camera capture page (the camera host). Grabs frames from the rear
// camera at ~2Hz, POSTs each to the Modal detector, draws what came back over
// the video, translates the detector response into a device command, and POSTs
// it to /api/event only on change. This is the only component that speaks both
// the detector's vocabulary and the device's, so it owns the translation and
// the edge-trigger.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  detectorToEvent,
  sameEvent,
  type ActivityState,
  type DetectorState,
  type EventRequest,
  type ModalDetection,
  type ModalResponse,
  type UserActivity,
} from "@/lib/contract";
import {
  initialMotionState,
  requestMotionPermission,
  step,
  type MotionPermission,
  type MotionState,
} from "@/lib/motion";

const CAPTURE_MS = 500; // 2 Hz – a bus pulling in is a multi-second event
const JPEG_QUALITY = 0.85;
const VISIBLE_LABELS = 6; // how many detections the list shows under the video

/**
 * Activity heartbeat, well under the board's CLOUD_ACTIVITY_LEASE_MS = 120000
 * (firmware/braille_wearable/src/relay_pure.h).
 *
 * The board refreshes its activity lease ONLY when activitySeq advances, so a
 * steady STILL that is never re-posted silently decays to MOVING after two
 * minutes — reopening ToF proximity output and closing the bus gate on a user
 * standing at a bus stop. Four beats per lease survives three consecutive failed
 * posts. It also bounds post-reboot recovery: a board that reboots mid-demo
 * takes the next value it sees as a non-rendering baseline and needs one more
 * advance, so 30 s is the worst-case blind window. [14 §Remaining delta]
 */
const ACTIVITY_HEARTBEAT_MS = 30_000;
/** How often the sensor diagnostics are copied into React state. The raw event
 *  stream can be 60 Hz; re-rendering at 60 Hz from a sensor is a real bug. */
const DIAG_MS = 500;

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

type ActivityMode = "off" | "manual" | "auto";

/** Why a POST was issued — a bench readout needs to distinguish "the classifier
 *  just changed its mind" from "the 30 s lease timer fired". */
type PostReason = "manual" | "sensor" | "heartbeat";

/** One row of the on-screen relay log. Purely diagnostic; nothing reads it. */
interface PostLogEntry {
  id: number;
  t: number; // ms epoch when the POST was issued
  activity: UserActivity;
  reason: PostReason;
  status: number | "ERR";
  seq: number | null;
  ms: number; // round-trip duration
}

/** Rows kept on screen. Enough to see a transition followed by heartbeats. */
const POST_LOG_MAX = 6;

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

  // --- activity relay ------------------------------------------------------
  const [activity, setActivityState] = useState<UserActivity>("MOVING");
  const [mode, setMode] = useState<ActivityMode>("off");
  const [motionPermission, setMotionPermission] = useState<MotionPermission | null>(null);
  const [lastWrite, setLastWrite] = useState<ActivityState | null>(null);
  const [lastTransitionAt, setLastTransitionAt] = useState<number | null>(null);
  const [relayError, setRelayError] = useState("");
  const [diag, setDiag] = useState<MotionState>(initialMotionState);
  const [postLog, setPostLog] = useState<PostLogEntry[]>([]);

  /**
   * Steps per minute across the peaks still inside the cadence window.
   *
   * This is the number to watch on a bench walk: the classifier fires on
   * PERIODICITY, not magnitude, so "is it seeing me walk" is really "is this
   * landing in the gait band". Normal walking is roughly 90–120 spm. A reading
   * that swings wildly between samples means the peaks are noise, not steps —
   * which is the failure the peak count alone cannot show you.
   */
  const cadenceSpm = useMemo(() => {
    const p = diag.peaks;
    if (p.length < 2) return null;
    const span = p[p.length - 1] - p[0];
    if (span <= 0) return null;
    return ((p.length - 1) / span) * 60000;
  }, [diag.peaks]);
  /**
   * Clock for the "Last change" readout, ticked on a timer rather than read
   * during render.
   *
   * `Date.now()` in the render body is impure — react-hooks/purity rejects it —
   * and it is also simply wrong here: the value would only refresh when
   * something ELSE re-rendered the page, so the age would sit frozen at
   * whatever it read on the last unrelated update. Driving it from an interval
   * is what makes it a live diagnostic instead of a decorative one.
   */
  const [nowMs, setNowMs] = useState<number | null>(null);

  const activityRef = useRef<UserActivity>("MOVING");
  const modeRef = useRef<ActivityMode>("off");
  const motionRef = useRef<MotionState>(initialMotionState());
  const postInFlight = useRef(false);
  const postPending = useRef<UserActivity | null>(null);
  const beatRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const postRef = useRef<(a: UserActivity, why: PostReason) => void>(() => {});
  const postLogId = useRef(0);

  /**
   * POST the activity and re-arm the heartbeat from the moment the POST
   * COMPLETES, rather than running a free-running interval.
   *
   * A transition and a heartbeat issued milliseconds apart can land in Redis out
   * of order, and the loser would win permanently: activitySeq only ever goes
   * up, so the board honours whichever write got the higher counter, not
   * whichever the user meant last. Serialising through an in-flight guard makes
   * the last POST *issued* the last one stored.
   */
  const postActivity = useCallback(async (a: UserActivity, why: PostReason) => {
    if (postInFlight.current) {
      postPending.current = a;
      return;
    }
    postInFlight.current = true;
    // Captured before the await so the logged time is when the request was
    // ISSUED, not when it happened to come back. On a bad hotspot those differ
    // by seconds, and "when did the phone try" is the useful bench fact.
    const issuedAt = Date.now();
    let status: number | "ERR" = "ERR";
    let seq: number | null = null;
    try {
      const res = await fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity: a }),
      });
      status = res.status;
      if (!res.ok) throw new Error(`relay returned ${res.status}`);
      const written = (await res.json()) as ActivityState;
      seq = written.activitySeq;
      setLastWrite(written);
      setRelayError("");
    } catch {
      // Do not retry here: at 30 s against a 120 s lease the next beat covers
      // three consecutive failures. The diagnostics panel is what makes a dead
      // relay visible instead of silent.
      setRelayError("Activity relay unreachable. The board reverts to MOVING after 120s.");
    } finally {
      // Logged in BOTH outcomes. A log that only records successes cannot answer
      // "is it sending?" — a silent failure looks identical to never firing.
      const entry: PostLogEntry = {
        id: postLogId.current++,
        t: issuedAt,
        activity: a,
        reason: why,
        status,
        seq,
        ms: Date.now() - issuedAt,
      };
      setPostLog((rows) => [entry, ...rows].slice(0, POST_LOG_MAX));
      postInFlight.current = false;
      if (beatRef.current) clearTimeout(beatRef.current);
      beatRef.current = setTimeout(
        () => postRef.current(activityRef.current, "heartbeat"),
        ACTIVITY_HEARTBEAT_MS,
      );
      const queued = postPending.current;
      postPending.current = null;
      if (queued !== null && queued !== a) postRef.current(queued, why);
    }
  }, []);

  useEffect(() => {
    postRef.current = (a, why) => void postActivity(a, why);
  }, [postActivity]);

  /** The single setter. The classifier and the manual buttons both go through
   *  it, so the sensor can be switched off on stage without touching the relay. */
  const applyActivity = useCallback((a: UserActivity, source: "manual" | "sensor") => {
    if (source === "sensor" && modeRef.current !== "auto") return;
    // Below ~10 Hz delivered, peak detection is operating on unusable data and
    // the derived state is noise. Audit 10 §4: "declare the sensor degraded and
    // fall back to manual rather than emitting a state derived from unusable
    // data." The classifier still transitions — it reports, we decide — but a
    // degraded transition must not reach the relay and flip the board.
    if (source === "sensor" && motionRef.current.degraded) return;
    activityRef.current = a;
    setActivityState(a);
    // Both clocks are seeded here, in a callback, so the readout starts at
    // "0s ago" rather than showing "–" until the first interval fires — and so
    // neither Date.now() call lands in a render body or an effect body.
    const at = Date.now();
    setLastTransitionAt(at);
    setNowMs(at);
    postRef.current(a, source);
  }, []);

  const setManual = useCallback(
    (a: UserActivity) => {
      modeRef.current = "manual";
      setMode("manual");
      applyActivity(a, "manual");
    },
    [applyActivity],
  );

  const resumeSensor = useCallback(() => {
    modeRef.current = "auto";
    setMode("auto");
    motionRef.current = initialMotionState();
  }, []);

  // Feed devicemotion into the pure fold. Only a genuine activity CHANGE posts;
  // everything else is diagnostics, sampled at DIAG_MS so React never re-renders
  // at sensor rate.
  useEffect(() => {
    if (motionPermission !== "granted") return;
    const onMotion = (e: DeviceMotionEvent) => {
      const prev = motionRef.current;
      const next = step(prev, {
        t: e.timeStamp,
        acceleration: e.acceleration,
        accelerationIncludingGravity: e.accelerationIncludingGravity,
        rotationRate: e.rotationRate,
      });
      motionRef.current = next;
      if (next.activity !== prev.activity) applyActivity(next.activity, "sensor");
    };
    window.addEventListener("devicemotion", onMotion);
    const diagId = setInterval(() => setDiag(motionRef.current), DIAG_MS);
    return () => {
      window.removeEventListener("devicemotion", onMotion);
      clearInterval(diagId);
    };
  }, [motionPermission, applyActivity]);

  // Runs whether or not the sensor is granted: a manual transition sets
  // lastTransitionAt too, and its age has to keep counting. applyActivity has
  // already seeded nowMs, so this effect only owns the interval.
  useEffect(() => {
    if (lastTransitionAt === null) return;
    const id = setInterval(() => setNowMs(Date.now()), DIAG_MS);
    return () => clearInterval(id);
  }, [lastTransitionAt]);

  useEffect(
    () => () => {
      if (beatRef.current) clearTimeout(beatRef.current);
    },
    [],
  );

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

    // 1. MOTION FIRST. It is the only one of the two that needs the gesture, and
    //    requestPermission() is issued synchronously inside requestMotionPermission
    //    before its own first await, so the API call lands in the same task as
    //    the click. Awaiting getUserMedia first would burn WebKit's ~1 s
    //    activation window on a human-answered camera dialog and make this
    //    reject with NotAllowedError. [10 §2]
    const permission = await requestMotionPermission();
    setMotionPermission(permission);
    if (permission === "granted") resumeSensor();

    // 2. CAMERA SECOND. getUserMedia requires a secure context and permission
    //    but not transient activation, so it is safe after the await above.
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
  }, [resumeSensor]);

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

            {/* The manual control is ALWAYS visible and is the primary control,
                not a fallback. A perfectly periodic camera pan near 0.8 Hz folds
                through the one-sided magnitude to 1.6 Hz — squarely inside the
                gait band — so no cadence classifier can separate it from
                walking. Every sensor failure mode degrades to exactly these two
                buttons. [15 §finding 4] */}
            <section className="rounded-lg border border-border bg-card p-4 text-card-foreground">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-medium">Activity</h2>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {mode === "auto" ? "sensor" : mode === "manual" ? "manual" : "off"}
                  {lastWrite ? ` · seq ${lastWrite.activitySeq}` : ""}
                </span>
              </div>

              {/* Bench readout. Two rows deliberately: what the SENSOR thinks,
                  and what the RELAY actually holds. They diverge whenever the
                  manual override is in play or a POST failed, and collapsing
                  them into one number would hide exactly the case you are
                  checking for. */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-md border border-border p-3">
                  <div className="text-xs text-muted-foreground">Sensor sees</div>
                  <div
                    className={`font-mono text-xl font-medium tabular-nums ${
                      motionPermission !== "granted" || diag.degraded
                        ? "text-muted-foreground"
                        : diag.activity === "MOVING"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : ""
                    }`}
                  >
                    {motionPermission !== "granted"
                      ? "—"
                      : diag.activity === "MOVING"
                        ? "WALKING"
                        : "STILL"}
                  </div>
                  <div className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                    {cadenceSpm === null ? "no cadence" : `${cadenceSpm.toFixed(0)} spm`}
                    {` · ${diag.peaks.length} peak${diag.peaks.length === 1 ? "" : "s"}`}
                  </div>
                </div>
                <div className="rounded-md border border-border p-3">
                  <div className="text-xs text-muted-foreground">Relay holds</div>
                  <div className="font-mono text-xl font-medium tabular-nums">{activity}</div>
                  <div className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                    {lastWrite ? `seq ${lastWrite.activitySeq}` : "never written"}
                    {mode === "manual" ? " · manual" : mode === "auto" ? " · sensor" : ""}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={activity === "STILL" ? "default" : "outline"}
                  onClick={() => setManual("STILL")}
                >
                  Still
                </Button>
                <Button
                  size="sm"
                  variant={activity === "MOVING" ? "default" : "outline"}
                  onClick={() => setManual("MOVING")}
                >
                  Moving
                </Button>
                {motionPermission === "granted" && mode === "manual" && (
                  <Button size="sm" variant="outline" onClick={resumeSensor}>
                    Resume sensor
                  </Button>
                )}
              </div>

              {/* Diagnostics — issue #5 requires permission state, sensor
                  availability, derived activity and last transition time. The
                  measured rate is the one that matters most: browsers have been
                  reported dropping to 1 Hz, which kills peak detection silently
                  and freezes the state at whatever it last held. [10 §4] */}
              <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Diag label="Permission" value={motionPermission ?? "not asked"} />
                <Diag
                  label="Sensor"
                  value={
                    motionPermission !== "granted"
                      ? "unavailable"
                      : diag.sensorUnavailable
                        ? "null samples"
                        : diag.usingGravityFallback
                          ? "gravity fallback"
                          : "ok"
                  }
                />
                <Diag
                  label="Rate"
                  value={diag.rateHz === null ? "–" : `${diag.rateHz.toFixed(0)} Hz`}
                  alert={diag.degraded}
                />
                <Diag label="Peaks / window" value={String(diag.peaks.length)} />
                <Diag
                  label="Last change"
                  value={
                    lastTransitionAt === null || nowMs === null
                      ? "–"
                      : `${(Math.max(0, nowMs - lastTransitionAt) / 1000).toFixed(0)}s ago`
                  }
                />
                {/* Rotation is shown because it is the classic false positive:
                    a big spin reads as violent motion but is NOT walking, and
                    the classifier deliberately ignores it. Seeing this spike
                    while "Sensor sees" stays STILL is the gyro-spike rule
                    working, not a bug. Issue #5: "Do not equate a single gyro
                    spike with MOVING." */}
                <Diag label="Rotation" value={`${diag.rotationMagnitude.toFixed(0)}°/s`} />
              </dl>

              {/* Proof the request actually left the phone. Without this, a dead
                  relay and a classifier that never fires look identical from the
                  outside — both are simply "nothing happening". */}
              <div className="mt-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-xs font-medium text-muted-foreground">
                    POST /api/activity
                  </h3>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {/* Total is derived from the newest id, not read off the
                        ref: ids are monotonic from 0, and reading a ref during
                        render is both lint-rejected and genuinely unreliable —
                        it would not re-render when the count changed. */}
                    {postLog.length === 0 ? "no requests yet" : `${postLog[0].id + 1} sent`}
                  </span>
                </div>
                {postLog.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Nothing sent yet. Press Still or Moving, or start the camera to
                    begin the 30s heartbeat.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {postLog.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between gap-2 font-mono text-xs tabular-nums"
                      >
                        <span className="text-muted-foreground">
                          {new Date(r.t).toLocaleTimeString()}
                        </span>
                        <span className="flex-1 truncate">
                          {r.activity}
                          <span className="text-muted-foreground"> · {r.reason}</span>
                        </span>
                        <span className={r.status === 200 ? "" : "text-destructive"}>
                          {r.status === "ERR" ? "failed" : r.status}
                          {r.seq === null ? "" : ` · seq ${r.seq}`}
                        </span>
                        <span className="text-muted-foreground">{r.ms}ms</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {diag.degraded && motionPermission === "granted" && (
                <p className="mt-3 text-sm text-muted-foreground">
                  The motion sensor is delivering below 10 Hz. Use the manual control — a state
                  derived from this data is not trustworthy.
                </p>
              )}
              {motionPermission !== null && motionPermission !== "granted" && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Motion permission is {motionPermission}. Use the manual control. iOS removed the
                  Settings toggle in iOS 13 — the only grant path is this page&apos;s prompt, over
                  HTTPS.
                </p>
              )}
              {relayError && (
                <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {relayError}
                </p>
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

function Diag({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`truncate font-mono text-sm tabular-nums ${alert ? "text-destructive" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
