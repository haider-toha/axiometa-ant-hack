// Shared source of truth for the device relay. The firmware `DeviceCommand`
// struct mirrors this file; keep them in lockstep.
//
// See plan/2026-07-18-bus-stop-situational-awareness.md → "Data Contracts".

/** Every haptic pattern the device knows (P0–P10). */
export type PatternId =
  | "NONE" // no active command
  | "READY" // P0  boot complete
  | "DANGER" // P1  confirmed siren, amplitude rising   (device-local; never sent)
  | "SIREN" // P2  confirmed siren, flat or falling    (device-local; never sent)
  | "ATTENTION" // P3  Tier-2a band-energy alert          (device-local; never sent)
  | "PROXIMITY" // P4  ToF advisory                       (device-local; never sent)
  | "BUS" // P5  bus arriving
  | "NUMBER" // P6  route number — uses `route`
  | "WAIT" // P7  request in flight
  | "UNKNOWN" // P8  could not read / low confidence
  | "ACK" // P9  button feedback                     (device-local; never sent)
  | "ERROR"; // P10 degraded

/** Cloud-originated commands only. The five local patterns never cross the wire. */
export type CloudPattern = "NONE" | "BUS" | "NUMBER" | "WAIT" | "UNKNOWN" | "ERROR";

export type Conf = "high" | "low" | "";

/** Route numbers longer than this cannot be delivered inside a bus dwell. */
export const ROUTE_MAX_DIGITS = 3;
/** Quinary encoding covers digits only. A route with a letter is rejected server-side. */
export const ROUTE_RE = /^[0-9]{1,3}$/;
export const CLOUD_PATTERNS: readonly CloudPattern[] = [
  "NONE",
  "BUS",
  "NUMBER",
  "WAIT",
  "UNKNOWN",
  "ERROR",
] as const;

export function isCloudPattern(v: unknown): v is CloudPattern {
  return typeof v === "string" && (CLOUD_PATTERNS as readonly string[]).includes(v);
}

/** What the phone POSTs to /api/event (edge-triggered — send only on change). */
export interface EventRequest {
  pattern: CloudPattern;
  route: string; // "" unless pattern === "NUMBER"
  dest: string; // debug screen ONLY — the device ignores this field
  conf: Conf;
  arrivalId: number;
}

/** What the ESP32 receives from /api/pull. `seq` is its edge-trigger. */
export interface DeviceCommand {
  seq: number; // monotonic; the device's edge-trigger
  pattern: CloudPattern;
  route: string;
  dest: string;
  conf: Conf;
  arrivalId: number;
  ts: number; // ms epoch of the server write — staleness check
}

/** The device's own state, POSTed as the /api/pull request body. */
export interface Telemetry {
  bandRms: number;
  peakHz: number;
  modIdx: number;
  trend: "rising" | "flat";
  playing: PatternId;
  tofMm: number;
  upMs: number;
  rssi: number;
}

/** The detector's raw per-frame state, for the debug screen. */
export interface DetectorState {
  event: string;
  present: boolean;
  confidence: number;
  arrivalId: number;
  route: string;
  destination: string;
  readingConf: string;
  votes: string[];
  /** Top labels seen this frame, highest confidence first — so the monitor can
   *  show what the camera is pointed at without streaming boxes to it. */
  labels: string[];
}

/** The /api/state blob the debug screen polls. */
export interface DebugState {
  seq: number;
  device: Omit<DeviceCommand, "seq">;
  detector: DetectorState;
  telemetry: Telemetry;
}

// --- Contract A: the Modal detector response the phone receives --------------

export interface ModalReading {
  route: string;
  destination: string;
  confidence: "high" | "low";
}

/** The coarse safety class. `null` for the ~1190 labels that aren't a hazard. */
export type HazardKind = "person" | "vehicle" | "bicycle";
export type Bearing = "left" | "center" | "right";

/**
 * One box to outline, and the name of what's inside it.
 *
 * `box` is [x1, y1, x2, y2] normalised to 0..1 against the frame the detector
 * decoded — NOT pixels. The capture resolution a phone actually gives back is
 * not the one you asked for, so the only safe thing to send over the wire is a
 * fraction; multiply by the canvas size at draw time.
 */
export interface ModalDetection {
  label: string;
  box: number[];
  confidence: number;
  bearing: Bearing;
  kind: HazardKind | null;
  target: boolean;
}

export interface ModalHazard {
  kind: HazardKind | "obstacle";
  bearing: Bearing;
  confidence: number;
}

export interface ModalResponse {
  // The detector's vocabulary is deliberately generic: it says TARGET, not BUS,
  // because the same service retargets by swapping a label set. Do not rename
  // these to BUS_* — that mismatch silently disabled arrival detection here for
  // the entire life of the previous version of this file.
  event: "NONE" | "TARGET_ARRIVED" | "TARGET_GONE";
  present: boolean;
  confidence: number;
  arrival_id: number;
  reading: ModalReading | null;
  reading_ready: boolean;
  votes: string[];
  hazards: ModalHazard[];
  detections: ModalDetection[];
  session_id: string;
}

// --- The translator: Modal detector vocabulary → device command --------------

/**
 * Map one Modal detector response to the device command it should produce.
 * Pure and total, so the capture page can diff it against the last-sent command
 * and POST /api/event only when the result changes.
 *
 * Follows the locked demo walk in the plan (Contract A/B):
 *   TARGET_ARRIVED edge         → BUS
 *   arrival latched, reading pending → WAIT
 *   reading_ready + high conf + digit route → NUMBER
 *   reading_ready + low conf / non-digit / unreadable → UNKNOWN
 *   otherwise                    → NONE
 */
export function detectorToEvent(m: ModalResponse): EventRequest {
  const arrivalId = m.arrival_id;
  const none: EventRequest = { pattern: "NONE", route: "", dest: "", conf: "", arrivalId };

  // `reading_ready` means the VERDICT is in, not that the reading is good. A
  // null reading here is the vote gate having refused to agree — the blind was
  // unreadable — and that is an answer, not a pending state. It must surface as
  // UNKNOWN: gating this branch on `m.reading` as well left an unreadable bus
  // falling through to WAIT, so the device sat on "request in flight" forever
  // for a reading that was never coming.
  if (m.reading_ready) {
    const r = m.reading;
    if (r && r.confidence === "high" && ROUTE_RE.test(r.route ?? "")) {
      return {
        pattern: "NUMBER",
        route: r.route,
        dest: r.destination ?? "",
        conf: "high",
        arrivalId,
      };
    }
    return { pattern: "UNKNOWN", route: "", dest: "", conf: "low", arrivalId };
  }

  if (m.event === "TARGET_ARRIVED") {
    return { pattern: "BUS", route: "", dest: "", conf: "", arrivalId };
  }

  if (arrivalId > 0 && m.present) {
    return { pattern: "WAIT", route: "", dest: "", conf: "", arrivalId };
  }

  return none;
}

/** Two commands are "the same event" when every device-visible field matches. */
export function sameEvent(a: EventRequest, b: EventRequest): boolean {
  return (
    a.pattern === b.pattern &&
    a.route === b.route &&
    a.conf === b.conf &&
    a.arrivalId === b.arrivalId
  );
}
