"use client";

// The phone page. Two jobs, and they are INDEPENDENT:
//
//   1. Am I walking? DeviceMotion → STILL/MOVING → /api/activity. This is the
//      default behaviour and it does not need the camera. [defect 1]
//   2. Where is the bus? Rear camera at ~2 Hz → Modal detector → the target
//      box's bearing → LEFT/AHEAD/RIGHT → /api/event, edge-triggered.
//
// This is the only component that speaks both the detector's vocabulary and the
// device's, so it owns the translation and the edge-trigger for both. All the
// debounce policy is pure and lives in @/lib/motion; what is left here is
// browser plumbing and the on-screen readouts that make the two paths legible
// on a bench.
//
// Target platform is iPhone Safari. Layout, tap targets and ordering are for a
// phone held in one hand; desktop is not a consideration.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  bearingToPattern,
  chooseEvent,
  detectorToEvent,
  sameEvent,
  type ActivityState,
  type Bearing,
  type CloudPattern,
  type DetectorState,
  type EventRequest,
  type ModalDetection,
  type ModalResponse,
  type UserActivity,
} from "@/lib/contract";
import {
  bearingFromBox,
  BEARING_CONFIRM_FRAMES,
  initialBearingVote,
  initialMotionState,
  requestMotionPermission,
  step,
  voteBearing,
  type BearingVote,
  type MotionBearing,
  type MotionPermission,
  type MotionState,
} from "@/lib/motion";
import {
  acceptPersonDirection,
  clearPersonGuidance,
  initialPersonGuidanceState,
  invertBoxBearing,
  personGuidanceEligible,
  personResultIsCurrent,
  personTargetMatches,
} from "@/lib/person-guidance";
import {
  isPersonBox,
  type PersonBox,
  type PersonDirectionResponse,
} from "@/lib/person-direction";

const CAPTURE_MS = 500; // 2 Hz – a bus pulling in is a multi-second event
const JPEG_QUALITY = 0.85;
const VISIBLE_LABELS = 6; // how many detections the list shows under the video

/**
 * Client-side confidence floor for the person / obstacle fallback path.
 *
 * 0.10 means "if the detector reports a person at all, run the path". Modal's
 * own DRAW_CONF_MIN is set to 0.10 too (vision/service.py), so this matches
 * the server floor and no valid person box is dropped between the two.
 *
 * A person at this floor immediately drives LEFT/RIGHT via invertBoxBearing
 * (centroid inversion on this same tick). Claude may refine that answer later
 * while MOVING; it is never a gate — a fail-closed / low_confidence Claude
 * reply falls back to the centroid direction instead of silencing the wearer.
 */
const PERSON_MIN_CONFIDENCE = 0.1;

/**
 * Activity heartbeat, well under the board's CLOUD_ACTIVITY_LEASE_MS = 120000
 * (firmware/braille_wearable/src/relay_pure.h).
 *
 * The board refreshes its activity lease ONLY when activitySeq advances, so a
 * steady STILL that is never re-posted silently decays to MOVING after two
 * minutes — reopening ToF proximity output and closing the bus gate on a user
 * standing still. Four beats per lease survives three consecutive failed
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

/**
 * The three navigation patterns, taken from the contract's own signature rather
 * than re-declared. If `bearingToPattern` is ever widened, this follows it.
 */
type NavPattern = ReturnType<typeof bearingToPattern>;

/** Glyph only — contract.ts has no opinion on how a direction is drawn. */
const BEARING_ARROW: Record<MotionBearing, string> = {
  left: "←",
  center: "↑",
  right: "→",
};

/** Everything the navigation card shows about the current frame. */
interface NavView {
  /** This frame's bearing under the widened AHEAD band; null = no target. */
  observed: MotionBearing | null;
  /** Horizontal centroid of the target box, 0..1. Shown because it is the raw
   *  number both bearings are derived from, so a disagreement is explicable. */
  centroid: number | null;
  /** What the DETECTOR called it, on its own hard thirds. Kept visible so the
   *  widened band reads as a deliberate difference rather than a bug. */
  detector: Bearing | "";
  /** The confirmed bearing — what may be sent. */
  confirmed: MotionBearing | null;
  /** A change currently accumulating evidence, and how many frames of it. */
  pending: MotionBearing | null;
  streak: number;
  /** Whether the bearing owned the command channel this frame (audit 23):
   *  false with a confirmed bearing means bus info (BUS/NUMBER/UNKNOWN) had
   *  priority while STILL. */
  sentNav: boolean;
  /** What the bus-information half wanted this frame — names the pattern the
   *  bearing is held behind when sentNav is false. */
  busPattern: CloudPattern;
  /** What kind of detection is driving the bearing this frame. Bus is always
   *  preferred; person is the fallback when no bus is in view. */
  targetKind: "bus" | "person" | null;
  /** True while a /api/person-direction call is in-flight. */
  personAnalyzing: boolean;
}

const NAV_IDLE: NavView = {
  observed: null,
  centroid: null,
  detector: "",
  confirmed: null,
  pending: null,
  streak: 0,
  sentNav: false,
  busPattern: "NONE",
  targetKind: null,
  personAnalyzing: false,
};

/** The last direction that actually left the phone. */
interface NavPost {
  t: number;
  pattern: NavPattern;
  ok: boolean;
}

/** Which overlay token a box is drawn in. Colour is the only thing separating
 *  the arrival target from a hazard from everything else. */
function detectionToken(d: ModalDetection): string {
  if (d.target) return "--detect-target";
  if (d.kind) return "--detect-hazard";
  return "--detect-other";
}

/** Horizontal centroid of a normalised box, or null if it is unusable. */
function centroidX(box: number[] | undefined): number | null {
  if (!box || box.length !== 4) return null;
  const cx = (box[0] + box[2]) / 2;
  return Number.isFinite(cx) ? cx : null;
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

  // --- bus bearing ---------------------------------------------------------
  const [nav, setNav] = useState<NavView>(NAV_IDLE);
  const [lastNav, setLastNav] = useState<NavPost | null>(null);
  /**
   * Demo override (audit 23): make the confirmed bearing win the shared
   * command channel unconditionally — including over BUS/NUMBER/UNKNOWN while
   * STILL. Directions already flow in both phases without it; this exists so
   * an operator can guarantee the direction is what plays.
   */
  const [forceNav, setForceNav] = useState(false);
  const bearingVoteRef = useRef<BearingVote>(initialBearingVote());
  const forceNavRef = useRef(false);
  const personGuidanceRef = useRef(initialPersonGuidanceState());
  const personGenerationRef = useRef(0);
  const personAbortRef = useRef<AbortController | null>(null);
  const personRequestBoxRef = useRef<PersonBox | null>(null);
  const personGuidanceBoxRef = useRef<PersonBox | null>(null);
  const personSceneRef = useRef<{ hasBus: boolean; personBox: PersonBox | null }>({
    hasBus: false,
    personBox: null,
  });
  const lastPersonCallRef = useRef<number>(0);
  const personAnalyzingRef = useRef<boolean>(false);

  const invalidatePersonGuidance = useCallback(() => {
    personGenerationRef.current += 1;
    personAbortRef.current?.abort();
    personAbortRef.current = null;
    personRequestBoxRef.current = null;
    personGuidanceBoxRef.current = null;
    personSceneRef.current = { hasBus: false, personBox: null };
    personGuidanceRef.current = clearPersonGuidance(personGuidanceRef.current);
    personAnalyzingRef.current = false;
  }, []);

  const toggleForceNav = useCallback(() => {
    const next = !forceNavRef.current;
    forceNavRef.current = next;
    setForceNav(next);
  }, []);

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
  const applyActivity = useCallback(
    (a: UserActivity, source: "manual" | "sensor") => {
      if (source === "sensor" && modeRef.current !== "auto") return;
      // Below ~10 Hz delivered, peak detection is operating on unusable data and
      // the derived state is noise. Audit 10 §4: "declare the sensor degraded and
      // fall back to manual rather than emitting a state derived from unusable
      // data." The classifier still transitions — it reports, we decide — but a
      // degraded transition must not reach the relay and flip the board.
      if (source === "sensor" && motionRef.current.degraded) return;
      activityRef.current = a;
      if (a === "STILL") invalidatePersonGuidance();
      setActivityState(a);
      // Both clocks are seeded here, in a callback, so the readout starts at
      // "0s ago" rather than showing "–" until the first interval fires — and so
      // neither Date.now() call lands in a render body or an effect body.
      const at = Date.now();
      setLastTransitionAt(at);
      setNowMs(at);
      postRef.current(a, source);
    },
    [invalidatePersonGuidance],
  );

  const setManual = useCallback(
    (a: UserActivity) => {
      modeRef.current = "manual";
      setMode("manual");
      applyActivity(a, "manual");
    },
    [applyActivity],
  );

  /**
   * Enter automatic mode and immediately assert what the classifier believes.
   *
   * The assertion is not decoration. `applyActivity` only ever runs on a
   * TRANSITION, and a freshly reset classifier already believes STILL — so a
   * user who grants permission and then stands still produces no transition,
   * no POST, no heartbeat, and a board that is never told anything at all.
   * Meanwhile the on-screen state would sit on this component's initial
   * `MOVING`, which is the wire contract's fail-safe default for a MISSING
   * value and not something anything measured. The page would read WALKING
   * while the user is standing still.
   *
   * Asserting STILL on entry is the honest claim: it is what the classifier
   * concluded, it starts the 30 s lease heartbeat, and a real walk overrides it
   * within ~2.5 s.
   */
  const resumeSensor = useCallback(() => {
    modeRef.current = "auto";
    setMode("auto");
    motionRef.current = initialMotionState();
    applyActivity(motionRef.current.activity, "sensor");
  }, [applyActivity]);

  /**
   * Start automatic walk detection — WITHOUT the camera.
   *
   * This is the page's primary control. Motion detection used to be reachable
   * only through `start()`, i.e. the camera button, so opening this page and
   * walking around did nothing at all and the manual buttons looked like the
   * whole feature. It needs a real user gesture (iOS 13+ gates DeviceMotion on
   * `requestPermission()`), but a gesture is all it needs — no camera, no
   * detector, no `NEXT_PUBLIC_MODAL_URL`.
   *
   * `requestMotionPermission()` must stay the FIRST statement: it issues
   * `requestPermission()` synchronously before its own first await, so the API
   * call lands in the same task as the click that holds WebKit's ~1 s
   * activation window. [10 §2]
   */
  const startMotion = useCallback(async (): Promise<MotionPermission> => {
    const permission = await requestMotionPermission();
    setMotionPermission(permission);
    // Auto is the DEFAULT once permission exists. The one exception is a user
    // who has already chosen the manual override — starting the camera should
    // not silently overrule that — so this only claims the mode when nothing
    // else has.
    if (permission === "granted" && modeRef.current === "off") resumeSensor();
    return permission;
  }, [resumeSensor]);

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

      // --- which way to the bus or person ----------------------------------
      // Bus (target: true) is always preferred. When no bus is in view we fall
      // back to person avoidance. Target *selection* runs in both MOVING and
      // STILL — the wearer needs an instant "route around this person"
      // bearing whether they are walking or scanning at the stop, matching
      // how buses give bearings in both phases per audit 23. The Claude
      // refinement (personGuidanceEligible below) still fires only while
      // MOVING; STILL people are served by the synchronous centroid path.
      const detections = m.detections ?? [];
      const busTarget = detections.find((d) => d.target);
      const personTarget = !busTarget
        ? detections
            .filter(
              (d) =>
                d.kind === "person" &&
                d.confidence >= PERSON_MIN_CONFIDENCE &&
                isPersonBox(d.box),
            )
            .sort((a, b) => b.confidence - a.confidence)[0]
        : undefined;
      const personBox = personTarget && isPersonBox(personTarget.box) ? personTarget.box : null;
      const targetKind: NavView["targetKind"] = busTarget
        ? "bus"
        : personTarget
          ? "person"
          : null;

      let observed: MotionBearing | null;
      let vote: BearingVote;
      const trackedBox = personAnalyzingRef.current
        ? personRequestBoxRef.current
        : personGuidanceBoxRef.current;
      if (personBox && trackedBox && !personTargetMatches(trackedBox, personBox)) {
        invalidatePersonGuidance();
        lastPersonCallRef.current = 0;
      }
      personSceneRef.current = { hasBus: Boolean(busTarget), personBox };

      if (busTarget) {
        // Bus: go toward it. bearingFromBox + voteBearing unchanged.
        observed = bearingFromBox(busTarget.box);
        vote = voteBearing(bearingVoteRef.current, observed);
        bearingVoteRef.current = vote;
        invalidatePersonGuidance();
      } else if (personTarget && personBox) {
        // Person/obstacle: ask Claude which direction is clear.
        // Rate-limit to one call per 1500 ms; don't stack calls.
        const now = Date.now();
        if (
          personGuidanceEligible(activityRef.current, false, true) &&
          now - lastPersonCallRef.current > 1500 &&
          !personAnalyzingRef.current
        ) {
          lastPersonCallRef.current = now;
          personAnalyzingRef.current = true;
          const requestGeneration = personGenerationRef.current + 1;
          personGenerationRef.current = requestGeneration;
          const requestBox: PersonBox = [
            personBox[0],
            personBox[1],
            personBox[2],
            personBox[3],
          ];
          const controller = new AbortController();
          personAbortRef.current = controller;
          personRequestBoxRef.current = requestBox;
          void fetch("/api/person-direction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              frame_b64: frameB64,
              person_box: requestBox,
            }),
            signal: controller.signal,
          })
            .then(async (response) => {
              if (!response.ok) throw new Error(`person direction returned ${response.status}`);
              return (await response.json()) as PersonDirectionResponse;
            })
            .then((data) => {
              const scene = personSceneRef.current;
              if (
                !personResultIsCurrent(
                  requestGeneration,
                  personGenerationRef.current,
                  activityRef.current,
                  scene.hasBus,
                  requestBox,
                  scene.personBox,
                )
              ) {
                return;
              }

              if (
                data.status === "ok" &&
                (data.direction === "left" || data.direction === "right")
              ) {
                personGuidanceRef.current = acceptPersonDirection(
                  personGuidanceRef.current,
                  data.direction,
                );
                personGuidanceBoxRef.current = requestBox;
              } else {
                personGuidanceRef.current = clearPersonGuidance(personGuidanceRef.current);
                personGuidanceBoxRef.current = null;
              }
            })
            .catch(() => {
              const scene = personSceneRef.current;
              if (
                personResultIsCurrent(
                  requestGeneration,
                  personGenerationRef.current,
                  activityRef.current,
                  scene.hasBus,
                  requestBox,
                  scene.personBox,
                )
              ) {
                personGuidanceRef.current = clearPersonGuidance(personGuidanceRef.current);
                personGuidanceBoxRef.current = null;
              }
            })
            .finally(() => {
              if (requestGeneration === personGenerationRef.current) {
                personAnalyzingRef.current = false;
                personAbortRef.current = null;
                personRequestBoxRef.current = null;
              }
            });
        }
        // Fast path: on this very frame, invert the person's box centroid so
        // the wearer feels a LEFT/RIGHT immediately — the same latency they
        // get for a bus. Claude's refined answer (which arrives 2–4 s later
        // via personGuidanceRef, and only while MOVING) overrides the fast
        // path whenever it is available. Claude returning low_confidence /
        // clear / unavailable falls back to the centroid direction instead
        // of erasing the screen. A `low_confidence` reply clears
        // personGuidanceRef.current.direction, so `?? fastBearing` re-fires
        // the centroid path automatically.
        const fastBearing = invertBoxBearing(bearingFromBox(personBox));
        const personBearing = personGuidanceRef.current.direction ?? fastBearing;
        observed = personBearing;
        vote = {
          emitted: personBearing,
          candidate: null,
          streak: 0,
        };
        // Don't update bearingVoteRef; keep bus vote state intact.
      } else {
        // No target visible: reset everything.
        observed = bearingFromBox(null);
        vote = voteBearing(bearingVoteRef.current, null);
        bearingVoteRef.current = vote;
        invalidatePersonGuidance();
      }

      // One command channel, two halves. `chooseEvent` (audit 23) owns the
      // precedence: a confirmed bearing is deliverable in BOTH phases — the
      // user scans for the bus while standing still and needs the first
      // direction before the first step — while BUS/NUMBER/UNKNOWN keep the
      // channel during STILL so arrival and route-88 output still land.
      // `forceNavRef` makes the bearing win unconditionally.
      const busEvent = detectorToEvent(m);
      const event = chooseEvent(busEvent, vote.emitted, activityRef.current, forceNavRef.current);
      const navPattern: NavPattern | null =
        event.pattern === "LEFT" || event.pattern === "RIGHT" || event.pattern === "AHEAD"
          ? event.pattern
          : null;

      setNav({
        observed,
        centroid: centroidX((busTarget ?? personTarget)?.box),
        detector: (busTarget ?? personTarget)?.bearing ?? "",
        confirmed: vote.emitted,
        pending: vote.streak > 0 ? vote.candidate : null,
        streak: vote.streak,
        // What actually owns the channel this frame, so the card can say
        // "sent" vs "held behind NUMBER" truthfully instead of guessing.
        sentNav: navPattern !== null,
        busPattern: busEvent.pattern,
        targetKind,
        personAnalyzing: personAnalyzingRef.current,
      });

      // Translate to a device command, and POST only when the meaning changes.
      if (!sameEvent(event, lastEventRef.current)) {
        lastEventRef.current = event;
        const issuedAt = Date.now();
        void fetch("/api/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event),
        })
          .then((r) => {
            // `ok` and not just "it resolved": /api/event answers 400 for a
            // pattern it does not know, which is exactly what a half-deployed
            // relay looks like. Showing that on the phone beats silence.
            if (navPattern) setLastNav({ t: issuedAt, pattern: navPattern, ok: r.ok });
          })
          // Edge-triggered: this is the only POST that reaches the device, so a
          // dropped one is a missed pattern. Re-arm the diff on failure so the
          // next frame resends instead of assuming it landed.
          .catch(() => {
            lastEventRef.current = IDLE_EVENT;
            if (navPattern) setLastNav({ t: issuedAt, pattern: navPattern, ok: false });
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
  }, [grabFrameB64, drawBoxes, invalidatePersonGuidance, sessionId]);

  const start = useCallback(async () => {
    setError("");

    // 1. MOTION FIRST. It is the only one of the two that needs the gesture, and
    //    requestPermission() is issued synchronously inside requestMotionPermission
    //    before its own first await, so the API call lands in the same task as
    //    the click. Awaiting getUserMedia first would burn WebKit's ~1 s
    //    activation window on a human-answered camera dialog and make this
    //    reject with NotAllowedError. [10 §2]
    await startMotion();

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
      // A new camera session must not inherit the last one's confirmed
      // direction, or the first frame diffs against a bearing from minutes ago.
      bearingVoteRef.current = initialBearingVote();
      invalidatePersonGuidance();
      lastPersonCallRef.current = 0;
      setNav(NAV_IDLE);
      setRunning(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? `The camera could not start – ${e.message}. Allow camera access for this site, then try again.`
          : "The camera could not start. Allow camera access for this site, then try again.",
      );
    }
  }, [invalidatePersonGuidance, startMotion]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRunning(false);
    setDetections([]);
    bearingVoteRef.current = initialBearingVote();
    invalidatePersonGuidance();
    lastPersonCallRef.current = 0;
    setNav(NAV_IDLE);
    const canvas = overlayRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }, [invalidatePersonGuidance]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(tick, CAPTURE_MS);
    return () => clearInterval(id);
  }, [running, tick]);

  useEffect(() => () => stop(), [stop]);

  const reading = modal?.reading;

  // --- derived readouts (pure; no clock reads, no ref reads) ----------------
  const sensorRunning = mode === "auto" && motionPermission === "granted";
  const walking = activity === "MOVING";
  const heroWord = mode === "off" ? "OFF" : walking ? "WALKING" : "STILL";
  const heroHint =
    mode === "off"
      ? "Not detecting yet. This does not need the camera."
      : mode === "manual"
        ? "Manual override — automatic detection is paused."
        : diag.degraded
          ? "Sensor degraded — holding the last value, not trusting new ones."
          : cadenceSpm === null
            ? "Watching your steps. Walk a few paces."
            : `Detected from your steps — ${cadenceSpm.toFixed(0)} steps/min.`;

  // A confirmed bearing that did NOT own the channel this frame: bus info
  // (BUS/NUMBER/UNKNOWN) had priority while STILL. Said loudly, because a held
  // direction and a dead detector must not look alike. (audit 23)
  const navHeld = nav.confirmed !== null && !nav.sentNav;
  /** What the confirmed bearing translates to — shown even when held. */
  const navCommand = nav.confirmed === null ? null : bearingToPattern(nav.confirmed);
  /** Whether a target of ANY kind is driving the bearing this frame. The two
   *  code paths (bus vs person) diverge internally — bus uses the detector's
   *  centroid, person asks Claude which way is clear — but the phone screen
   *  and the wearer's ear both hear one thing: a direction to a target. */
  const hasTarget = nav.targetKind !== null;
  /** True while the person-direction Claude call is in-flight. Shown as a
   *  generic "analyzing" state so the UI does not leak the branch. */
  const personAnalyzing = nav.personAnalyzing;

  return (
    <main className="flex-1 bg-background px-4 py-6 font-sans text-foreground sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-medium tracking-tight">Capture</h1>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/" />}>
            Monitor
          </Button>
        </header>

        {/* 1. ACTIVITY — first on the page and OUTSIDE the detector guard.
            Walk detection needs neither a camera nor a deployed Modal service,
            and burying it under both is what made it look like it did not
            exist. */}
        <section className="rounded-lg border border-border bg-card p-4 text-card-foreground">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-medium">Are you walking?</h2>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {mode === "auto" ? "auto" : mode === "manual" ? "override" : "off"}
              {lastWrite ? ` · seq ${lastWrite.activitySeq}` : ""}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <span
              className={`size-3 shrink-0 rounded-full ${
                mode === "off"
                  ? "bg-muted-foreground/40"
                  : walking
                    ? "bg-emerald-500 dark:bg-emerald-400"
                    : "bg-muted-foreground"
              }`}
            />
            <div className="min-w-0 flex-1">
              <div
                className={`font-mono text-3xl font-medium tracking-tight tabular-nums ${
                  mode === "off"
                    ? "text-muted-foreground"
                    : walking
                      ? "text-emerald-600 dark:text-emerald-400"
                      : ""
                }`}
              >
                {heroWord}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{heroHint}</p>
            </div>
          </div>

          {mode === "off" && (
            <Button size="lg" className="mt-4 w-full" onClick={() => void startMotion()}>
              {motionPermission === null ? "Start motion detection" : "Try motion detection again"}
            </Button>
          )}

          {/* The override, clearly labelled as one. It is not the primary
              interface — auto is — but it cannot be removed either: a steady
              ~0.8 Hz camera pan folds through the one-sided magnitude to 1.6 Hz,
              squarely inside the gait band, so no cadence classifier can
              separate it from walking. [15 §finding 4] */}
          <div className="mt-4 border-t border-border pt-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-muted-foreground">Manual override</span>
              {mode === "manual" && motionPermission === "granted" && (
                <Button size="xs" variant="ghost" onClick={resumeSensor}>
                  Resume auto
                </Button>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={mode === "manual" && activity === "STILL" ? "default" : "outline"}
                onClick={() => setManual("STILL")}
              >
                Force still
              </Button>
              <Button
                size="sm"
                variant={mode === "manual" && activity === "MOVING" ? "default" : "outline"}
                onClick={() => setManual("MOVING")}
              >
                Force moving
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              A steady ~0.8 Hz camera pan is indistinguishable from walking, so the override always
              stays available.
            </p>
          </div>

          {diag.degraded && sensorRunning && (
            <p className="mt-3 text-sm text-muted-foreground">
              The motion sensor is delivering below 10 Hz. Use the override — a state derived from
              this data is not trustworthy.
            </p>
          )}
          {motionPermission !== null && motionPermission !== "granted" && (
            <p className="mt-3 text-sm text-muted-foreground">
              Motion permission is {motionPermission}. Use the override. iOS removed the Settings
              toggle in iOS 13 — the only grant path is this page&apos;s prompt, over HTTPS.
            </p>
          )}
          {relayError && (
            <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {relayError}
            </p>
          )}
        </section>

        {!MODAL_URL ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            No detector is configured, so the camera half of this page is off. Set{" "}
            <code className="font-mono">NEXT_PUBLIC_MODAL_URL</code> to the Modal endpoint and
            redeploy. Walk detection above is unaffected.
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

            {!running ? (
              <Button size="lg" className="w-full" onClick={start}>
                Start camera
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
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
                <span className="text-sm text-muted-foreground">
                  <span className="font-mono tabular-nums text-foreground">{frames}</span> frames
                </span>
              </div>
            )}

            {/* 2. DIRECTION TO TARGET. The frontend deliberately does not
                distinguish the two internal paths — bus (centroid) vs person
                (Claude-picked side around the obstacle) — because the wearer
                does not need to know which one is active. Only the direction
                matters. Every step below the header is on screen because "it
                isn't doing anything" and "it decided AHEAD" are otherwise
                indistinguishable. */}
            <section className="rounded-lg border border-border bg-card p-4 text-card-foreground">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-medium">Direction</h2>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {forceNav ? "force-send on" : walking ? "sending · walking" : "sending · scanning"}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-4">
                <span
                  aria-hidden
                  className={`font-mono text-4xl leading-none ${
                    nav.confirmed === null || navHeld ? "text-muted-foreground/40" : ""
                  }`}
                >
                  {nav.confirmed === null ? "·" : BEARING_ARROW[nav.confirmed]}
                </span>
                <div className="min-w-0 flex-1">
                  <div
                    className={`font-mono text-2xl font-medium tracking-tight ${
                      nav.confirmed === null || navHeld ? "text-muted-foreground" : ""
                    }`}
                  >
                    {nav.confirmed === null ? "NONE" : bearingToPattern(nav.confirmed)}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {!running
                      ? "Start the camera to look for a target."
                      : personAnalyzing && nav.confirmed === null
                        ? "Target detected — choosing a safe direction\u2026"
                        : nav.confirmed === null && nav.observed === null
                          ? "Nothing in view."
                          : nav.confirmed === null
                            ? `Target in view — confirming (${nav.streak}/${BEARING_CONFIRM_FRAMES}).`
                            : navHeld
                              ? `${navCommand} ready — held while ${nav.busPattern} plays. It sends when that clears; Force send overrides.`
                              : nav.streak > 0 && nav.pending !== null
                                ? `Sent. Checking a change to ${bearingToPattern(nav.pending)} (${nav.streak}/${BEARING_CONFIRM_FRAMES}).`
                                : nav.streak > 0
                                  ? `Sent. Target may have left view (${nav.streak}/${BEARING_CONFIRM_FRAMES}).`
                                  : walking
                                    ? "Sent to the board."
                                    : "Sent to the board — start walking and it keeps updating."}
                  </p>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3">
                <Diag
                  label="Target in view"
                  value={
                    nav.observed === null
                      ? hasTarget
                        ? "yes · resolving"
                        : "no"
                      : `yes · ${nav.observed}`
                  }
                />
                <Diag
                  label="Box centre"
                  value={nav.centroid === null ? "–" : nav.centroid.toFixed(2)}
                />
                {/* Shown so the widened AHEAD band reads as a deliberate
                    difference. The detector splits on hard thirds, so it will
                    say "left" for a centroid at 0.32 where this page says
                    AHEAD — that divergence is the design, not a fault. */}
                <Diag label="Detector says" value={nav.detector || "–"} />
                {/* The one cell that answers the demo question outright: what
                    command the confirmed bearing became, and whether it owned
                    the channel or is queued behind bus information. */}
                <Diag
                  label="Command"
                  value={
                    navCommand === null
                      ? "none"
                      : navHeld
                        ? `${navCommand} · held (${nav.busPattern})`
                        : `${navCommand} · sent`
                  }
                  alert={navHeld}
                />
                <Diag
                  label="Last sent"
                  value={
                    lastNav === null
                      ? "nothing yet"
                      : `${lastNav.pattern}${lastNav.ok ? "" : " · failed"}`
                  }
                  alert={lastNav !== null && !lastNav.ok}
                />
              </dl>

              {/* Demo override (audit 23). Directions already flow while both
                  scanning (STILL) and walking (MOVING); this only decides who
                  wins the shared channel when bus info also has something to
                  say. */}
              <div className="mt-4 border-t border-border pt-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-muted-foreground">Force send</span>
                  <Button
                    size="sm"
                    variant={forceNav ? "default" : "outline"}
                    onClick={toggleForceNav}
                  >
                    {forceNav ? "Force send: on" : "Force send: off"}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Directions send in both phases by default. Force send makes them outrank the bus
                  announcements (BUS / route 88 / UNKNOWN) that normally take the channel first
                  while you stand at the stop.
                </p>
              </div>
            </section>

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
          </>
        )}

        {/* 3. BENCH DIAGNOSTICS. Last, because they are for the bench and not
            for the demo. Nothing here has been removed — it has been moved
            below the two things the page is actually for. */}
        <section className="rounded-lg border border-border bg-card p-4 text-card-foreground">
          <h2 className="text-sm font-medium">Bench diagnostics</h2>

          {/* Two rows deliberately: what the SENSOR thinks, and what the RELAY
              actually holds. They diverge whenever the manual override is in
              play or a POST failed, and collapsing them into one number would
              hide exactly the case you are checking for. */}
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

          {/* Issue #5 requires permission state, sensor availability, derived
              activity and last transition time. The measured rate is the one
              that matters most: browsers have been reported dropping to 1 Hz,
              which kills peak detection silently and freezes the state at
              whatever it last held. [10 §4] */}
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
            {/* Rotation is shown because it is the classic false positive: a big
                spin reads as violent motion but is NOT walking, and the
                classifier deliberately ignores it. Seeing this spike while
                "Sensor sees" stays STILL is the gyro-spike rule working, not a
                bug. Issue #5: "Do not equate a single gyro spike with MOVING." */}
            <Diag label="Rotation" value={`${diag.rotationMagnitude.toFixed(0)}°/s`} />
          </dl>

          {/* Proof the request actually left the phone. Without this, a dead
              relay and a classifier that never fires look identical from the
              outside — both are simply "nothing happening". */}
          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-xs font-medium text-muted-foreground">POST /api/activity</h3>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {/* Total is derived from the newest id, not read off the ref:
                    ids are monotonic from 0, and reading a ref during render is
                    both lint-rejected and genuinely unreliable — it would not
                    re-render when the count changed. */}
                {postLog.length === 0 ? "no requests yet" : `${postLog[0].id + 1} sent`}
              </span>
            </div>
            {postLog.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Nothing sent yet. Start motion detection, or use the override, to begin the 30s
                heartbeat.
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
        </section>

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
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
