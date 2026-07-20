// Shared source of truth for the device relay. The firmware `DeviceCommand`
// struct mirrors this file; keep them in lockstep.
//
// See plan/2026-07-18-situational-awareness.md → "Data Contracts".

/** Every haptic pattern the device knows (P0–P13). */
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
  | "ERROR" // P10 degraded
  // P11–P13 exist in firmware/braille_wearable/src/patterns.h as step tables and
  // are the board's `playing` telemetry values while a nav pattern runs.
  | "LEFT" // P11 bear left    — P1 only, 2350 Hz ·  800 ms
  | "RIGHT" // P12 bear right   — P3 only, 3050 Hz ·  800 ms
  | "AHEAD"; // P13 keep going   — both channels    · 600 ms

/**
 * Cloud-originated commands only. The five local patterns never cross the wire.
 *
 * DANGER, SIREN, ATTENTION, PROXIMITY and ACK stay device-local: they are the
 * safety and feedback paths and must work with the Wi-Fi down.
 *
 * LEFT / RIGHT / AHEAD are the navigation half, carried on the SAME
 * `/api/event` → Redis → `/api/pull` path as the bus-information half. There is
 * no second channel and no second sequence counter — one `seq` orders every
 * cloud pattern, so a nav command and a bus command can never be delivered out
 * of order relative to each other.
 *
 * FIRMWARE COUPLING — the wire spellings are EXACT and case-sensitive.
 * `parseCloudCommand()` in relay_pure.h does `strcmp` against a fixed list and
 * maps everything else to `CloudCommand::INVALID`, which `consumeRelayCommand()`
 * turns into `RelayDisposition::REJECT` BEFORE `acceptsRelayCommand()` is
 * consulted. A board whose `parseCloudCommand()` does not know these three
 * strings drops them on the floor no matter what its activity gate says.
 */
export type CloudPattern =
  | "NONE"
  | "BUS"
  | "NUMBER"
  | "WAIT"
  | "UNKNOWN"
  | "ERROR"
  | "LEFT"
  | "RIGHT"
  | "AHEAD";

export type Conf = "high" | "low" | "";

/** Route numbers longer than this cannot be delivered inside a bus dwell. */
export const ROUTE_MAX_DIGITS = 3;
/** Quinary encoding covers digits only. A route with a letter is rejected server-side. */
export const ROUTE_RE = /^[0-9]{1,3}$/;
/**
 * The accept-list `/api/event` validates against.
 *
 * This array and the `CloudPattern` union are two lists that must stay
 * identical. The `readonly CloudPattern[]` annotation pins one direction — no
 * entry here can be outside the union. The other direction (every union member
 * appears here) is pinned by `contract.test.ts`, which builds a
 * `satisfies Record<CloudPattern, …>` table and asserts `isCloudPattern` accepts
 * every key. Drift the other way is the quiet failure: a pattern legal to
 * TypeScript that `/api/event` answers with 400 "unknown pattern".
 */
export const CLOUD_PATTERNS: readonly CloudPattern[] = [
  "NONE",
  "BUS",
  "NUMBER",
  "WAIT",
  "UNKNOWN",
  "ERROR",
  "LEFT",
  "RIGHT",
  "AHEAD",
] as const;

/**
 * Unchanged by the navigation work, deliberately.
 *
 * The runtime half is a membership test over `CLOUD_PATTERNS`, so it widened the
 * moment the three nav values were appended above; the type half is a
 * hand-written predicate over `CloudPattern`, so it widened with the union. No
 * edit here — and none wanted. An `isNavPattern`-style special case would be a
 * second gate to keep in sync with the board's.
 */
export function isCloudPattern(v: unknown): v is CloudPattern {
  return typeof v === "string" && (CLOUD_PATTERNS as readonly string[]).includes(v);
}

/**
 * Which interaction phase the phone says the user is in.
 *
 * Wire values are EXACT and case-sensitive. The board does
 * `strcmp(value, "MOVING")` / `strcmp(value, "STILL")` in `parseUserActivity()`
 * (firmware/braille_wearable/src/relay_pure.h on Sebastian's branch) and maps
 * everything else — including nullptr — to `UserActivity::UNKNOWN`, which closes
 * the bus-information gate.
 *
 * NEVER serialise this as an integer. The firmware enum is
 * `{ UNKNOWN = 0, MOVING, STILL }`; it was reordered when the enum moved out of
 * navigation_pure.h, so STILL went from 0 to 2 [14 §navigation_pure.h delta].
 */
export type UserActivity = "STILL" | "MOVING";

export function isUserActivity(v: unknown): v is UserActivity {
  return v === "STILL" || v === "MOVING";
}

/**
 * MOVING unless the input is exactly "STILL".
 *
 * The default is MOVING, **not** STILL. This inverts audit 11 and issue #5, both
 * of which predate the firmware. `effectiveActivity()` in relay_pure.h returns
 * `UserActivity::MOVING` when cloud activity is UNKNOWN or its 120 s lease has
 * expired, and `acceptsRelayCommand(UNKNOWN, BUS)` is false. Missing activity
 * therefore means "show nothing", not "show bus info" — and the relay has to
 * fail in the same direction as the board, or the two disagree about what
 * silence means. [14 §Conflict map]
 *
 * READ path only. POST /api/activity rejects an unrecognised value with 400
 * rather than defaulting: the phone is the only client and a typo there must be
 * loud, not silently resolved to MOVING.
 */
export function normActivity(v: unknown): UserActivity {
  return isUserActivity(v) ? v : "MOVING";
}

/**
 * ArduinoJson `is<uint32_t>()` ceiling. Above this the board skips the ENTIRE
 * activity block with no error anywhere, and cloud activity is dead until the
 * next reboot.
 */
export const ACTIVITY_SEQ_MAX = 4294967295;

/**
 * Coerce a stored activity sequence into something the board can actually read.
 *
 * `Date.now()` is ~1.78e12 and fails `is<uint32_t>()`. That is the single
 * easiest way to silently disable this feature, which is why the ceiling is a
 * named constant with a test asserting `Date.now() > ACTIVITY_SEQ_MAX`.
 *
 * Clamping at the ceiling rather than passing the value through is deliberate:
 * both failure modes end with the board on its MOVING fallback after the lease,
 * but a clamped value keeps the field TYPE-valid, so the shape stays debuggable
 * over curl. Reaching the ceiling takes 4.29e9 INCRs — ~4,000 years at the 30 s
 * heartbeat — so this is a guard, not a design constraint.
 */
export function normActivitySeq(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  const i = Math.trunc(n);
  if (i < 0) return 0;
  return i > ACTIVITY_SEQ_MAX ? ACTIVITY_SEQ_MAX : i;
}

/**
 * The independently versioned half of the /api/pull response.
 *
 * Split out as its own interface so the independence rule in AGENTS.md is
 * visible in the type system: `writeCommand()` never produces one of these and
 * `writeActivity()` never produces a command. An activity heartbeat must not
 * increment command `seq` or refresh a previous command's `ts`.
 */
export interface ActivityState {
  activity: UserActivity;
  /** Independent edge-trigger. Small monotonic counter — NEVER a timestamp. */
  activitySeq: number;
  /** ms epoch of the activity write. Documented by firmware, never parsed by
   *  it — for the debug screen and forward-compat only. [14 §activityTs] */
  activityTs: number;
}

/** What the phone POSTs to /api/event (edge-triggered — send only on change). */
export interface EventRequest {
  pattern: CloudPattern;
  route: string; // "" unless pattern === "NUMBER"
  dest: string; // debug screen ONLY — the device ignores this field
  conf: Conf;
  arrivalId: number;
}

/**
 * What the ESP32 receives from /api/pull.
 *
 * Two independently versioned pieces of state in one flat JSON object: `seq`
 * edge-triggers the cloud pattern, `activitySeq` edge-triggers the activity gate
 * and refreshes its 120 s lease. Neither may move the other.
 *
 * The activity trio is serialised LAST, after `ts`, matching
 * RELAY-FOR-FIRMWARE.md, the two-phase gating design spec, and the plan's
 * Contract C JSON example. His parser is key-lookup based so order cannot break
 * it; matching his doc keeps curl output diffable against the handoff spec.
 */
export interface DeviceCommand extends ActivityState {
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
  /** Coarse hazards this frame (person / vehicle / bicycle / obstacle + bearing). */
  hazards: ModalHazard[];
  /** Bearing of the target (the bus); "" when no target is in view. */
  targetBearing: Bearing | "";
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

/**
 * Map a detected target's frame bearing to the nav command for the board.
 *
 * Pure and total. `Bearing` is a closed three-value union, so the `AHEAD`
 * fallback is unreachable through the type system — it exists because the
 * bearing originates at Modal and crosses HTTP, where the union is only a
 * promise. `coerce.ts:asBearing()` already resolves an unrecognised bearing to
 * `"center"`; this resolves it to `AHEAD` for the same reason and in the same
 * direction. An unreadable bearing must degrade to "keep going", never to a
 * confident turn instruction — a spurious LEFT sends a blind user toward the
 * kerb, while a spurious AHEAD is what they were already doing.
 *
 * This does NOT decide *whether* to send a nav command. It only names the one to
 * send. Whether the user is in the navigation phase at all is `UserActivity`,
 * which travels on its own independently versioned channel, and the final say
 * belongs to `acceptsRelayCommand()` on the board. The relay never gates a
 * pattern on activity server-side: two gates that can disagree are worse than
 * one, and the board is the half that still works with the Wi-Fi down.
 */
export function bearingToPattern(b: Bearing): Extract<CloudPattern, "LEFT" | "RIGHT" | "AHEAD"> {
  if (b === "left") return "LEFT";
  if (b === "right") return "RIGHT";
  return "AHEAD";
}

/**
 * The EventRequest a confirmed bearing translates to.
 *
 * `arrivalId` is 0, NEVER a live arrival counter. `sameEvent()` compares
 * arrivalId, so carrying one would re-POST an unchanged LEFT every time the
 * detector re-latched an arrival — restarting the board's 800 ms pattern and
 * truncating it. A direction is not about an arrival. Every field here must be
 * STABLE for a held bearing so the edge-trigger keeps comparing equal.
 */
export function navEvent(b: Bearing): EventRequest {
  return { pattern: bearingToPattern(b), route: "", dest: "", conf: "", arrivalId: 0 };
}

/**
 * Which half owns the single command channel this frame. (audit 23)
 *
 * The demo flow this serves: the user stands STILL at the stop scanning with
 * the camera, gets the FIRST direction the moment a bus is confirmed, then
 * starts walking and keeps receiving directions. So a bearing must be
 * deliverable in both phases — `acceptsRelayCommand()` on the board agrees
 * since audit 23.
 *
 * MOVING: the bearing always wins. The board drops the bus-information half in
 * MOVING anyway, so sending it would be a seq bump the board ignores.
 *
 * STILL: bus information outranks the bearing, but only when it is SAYING
 * something — BUS (arrival edge), NUMBER (route read) or UNKNOWN (unreadable
 * verdict). WAIT and NONE render nothing the user is waiting on, so a
 * confirmed bearing fills those gaps. The deliberate cost: the WAIT
 * "request in flight" tone is never heard while a bearing is held — a
 * direction is worth more than a progress noise.
 *
 * `force` is the capture page's demo override: the bearing wins the channel
 * unconditionally, including over NUMBER.
 */
export function chooseEvent(
  busEvent: EventRequest,
  bearing: Bearing | null,
  activity: UserActivity,
  force = false,
): EventRequest {
  if (bearing === null) return busEvent;
  if (force || activity === "MOVING") return navEvent(bearing);
  return busEvent.pattern === "NONE" || busEvent.pattern === "WAIT"
    ? navEvent(bearing)
    : busEvent;
}

/**
 * Two commands are "the same event" when every device-visible field matches.
 *
 * This is the edge-trigger, and for navigation it is load-bearing rather than an
 * optimisation. LEFT and RIGHT are 800 ms step tables and AHEAD is 600 ms
 * (`patterns.h`), against a ~500 ms capture tick. A caller that re-POSTs an
 * unchanged bearing bumps `seq`, the board restarts the table from step 0, and
 * neither pattern ever reaches its second pulse — LEFT and RIGHT collapse into
 * one indistinguishable continuous buzz, permanently, for as long as the bearing
 * holds. Which is precisely the case where the signal matters most.
 *
 * So `LEFT → LEFT` must compare equal and `LEFT → RIGHT` must not. It does both
 * with no nav-specific branch, because `pattern` is one of the four fields
 * compared. The obligation this places on the caller is the other three:
 * `route`, `conf` and `arrivalId` have to be STABLE across ticks that carry the
 * same bearing. Deriving `arrivalId` from a frame counter or a timestamp would
 * make every tick a new event and reintroduce the truncation this prevents —
 * `contract.test.ts` pins that case.
 */
export function sameEvent(a: EventRequest, b: EventRequest): boolean {
  return (
    a.pattern === b.pattern &&
    a.route === b.route &&
    a.conf === b.conf &&
    a.arrivalId === b.arrivalId
  );
}
