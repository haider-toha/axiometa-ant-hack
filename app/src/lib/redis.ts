// Upstash Redis relay — the shared state between the phone (capture page) and
// the ESP32 wearable. The board is outbound-only: it POSTs to /api/pull and
// reads the current command; it never accepts an inbound connection.
//
// Stack note: george-stack defaults to Prisma/Neon Postgres, but the relay
// deliberately uses Upstash Redis — the device polls on an edge-triggered
// monotonic `seq`, the state is ephemeral, and Upstash is already provisioned.
import { Redis } from "@upstash/redis";
// A separate value import, not stylistic: tsconfig sets `isolatedModules: true`,
// so a value cannot be folded into the `import type` clause below.
import { normActivity, normActivitySeq } from "./contract";
import type {
  ActivityState,
  DebugState,
  DetectorState,
  DeviceCommand,
  EventRequest,
  Telemetry,
  UserActivity,
} from "./contract";

// Reads UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN from the environment.
export const redis = Redis.fromEnv();

const TELEMETRY_KEY = "telemetry";
const DETECTOR_KEY = "detector";

const EMPTY_TELEMETRY: Telemetry = {
  bandRms: 0,
  peakHz: 0,
  modIdx: 0,
  trend: "flat",
  playing: "NONE",
  tofMm: 0,
  upMs: 0,
  rssi: 0,
};

const EMPTY_DETECTOR: DetectorState = {
  event: "NONE",
  present: false,
  confidence: 0,
  arrivalId: 0,
  route: "",
  destination: "",
  readingConf: "",
  votes: [],
  labels: [],
  hazards: [],
  targetBearing: "",
};

/**
 * Publish a new command for the wearable.
 *
 * MSET the payload FIRST, then INCR the sequence. `seq` is the signal the ESP32
 * polls on, so every field must already be written before it bumps — otherwise
 * a poll landing between the two writes would read the new seq with a stale
 * payload and fire the wrong (or a plausible-wrong) pattern. Do not reorder.
 */
export async function writeCommand(e: EventRequest): Promise<number> {
  await redis.mset({
    pattern: e.pattern,
    route: e.route,
    dest: e.dest,
    conf: e.conf,
    arrivalId: e.arrivalId,
    ts: Date.now(),
  }); // payload first
  const seq = await redis.incr("seq"); // signal last — value after increment
  return seq;
}

/**
 * Publish the phone's interaction phase. Independent of the command.
 *
 * Same MSET-before-INCR discipline as writeCommand(), for the same reason: the
 * board edge-triggers on `activitySeq`, so the value must already be stored
 * before the counter bumps. A poll landing between the two reads the new
 * activity with the old activitySeq and ignores it — harmless, and the next poll
 * 300 ms later collects it. Reversed, the board would fire on a counter pointing
 * at the PREVIOUS activity value. Do not reorder.
 *
 * This function must NEVER write `seq`, `ts`, `pattern`, `route`, `dest`,
 * `conf`, or `arrivalId`. AGENTS.md (Sebastian's revision): "Activity freshness
 * is independent from command delivery. An activity heartbeat must not increment
 * command `seq` or refresh an old command timestamp." A heartbeat that bumped
 * `seq` would re-fire whatever pattern was last published, on a wrist, every
 * 30 seconds.
 *
 * EVERY call bumps activitySeq, including a heartbeat re-posting an unchanged
 * value. That bump IS the mechanism — applyCloudActivity() refreshes the 120 s
 * lease only when the counter advances, and refreshEffectiveActivity()
 * early-returns when the value is unchanged, so no pattern stops and no
 * proximity state churns. It costs one Serial log line per beat. [14 §Remaining
 * delta]
 */
export async function writeActivity(a: UserActivity): Promise<ActivityState> {
  const activityTs = Date.now();
  await redis.mset({ activity: a, activityTs }); // payload first
  const activitySeq = await redis.incr("activitySeq"); // signal last
  return { activity: a, activitySeq: normActivitySeq(activitySeq), activityTs };
}

/**
 * Snapshot command + activity for the ESP32 poll (`/api/pull`).
 *
 * ONE mget across both key sets, deliberately: `mget` is atomic per command, so
 * the board can never see activity from one write paired with a command from
 * another. Two calls would be two round trips and a torn read.
 */
export async function readCommand(): Promise<DeviceCommand> {
  // Three lists that must stay index-aligned: the bindings, the tuple, and the
  // key names. `mget`'s generic is a bare assertion, not a checked contract — a
  // key list SHORTER than the tuple compiles clean (verified against the
  // installed @upstash/redis 1.38.0) and silently shifts every field after the
  // gap. Add to all three or none. [11 §"mget alignment, verified"]
  const [seq, pattern, route, dest, conf, arrivalId, ts, activity, activitySeq, activityTs] =
    await redis.mget<
      [
        number,
        DeviceCommand["pattern"],
        string,
        string,
        DeviceCommand["conf"],
        number,
        number,
        DeviceCommand["activity"],
        number,
        number,
      ]
    >(
      "seq",
      "pattern",
      "route",
      "dest",
      "conf",
      "arrivalId",
      "ts",
      "activity",
      "activitySeq",
      "activityTs",
    );
  return {
    seq: seq ?? 0,
    pattern: pattern ?? "NONE",
    // `String(...)`, because Upstash deserialises a stored "88" back to the
    // number 88 and the device expects a JSON string here. Without this the
    // wire contract says `"route": 88` while the type says `string`.
    route: route == null ? "" : String(route),
    dest: dest ?? "",
    conf: conf ?? "",
    arrivalId: arrivalId ?? 0,
    ts: ts ?? 0,
    // A relay that has never been told resolves to MOVING with activitySeq 0.
    // Both fields are ALWAYS emitted and always well-typed: the board requires
    // `activity.is<const char*>() && activitySeq.is<uint32_t>()` together, and
    // omitting either skips the whole block silently. Seeding at 0 also lets a
    // freshly booted board take 0 as its non-rendering baseline, so the FIRST
    // real write (seq 1) renders instead of being swallowed. [14 §open Q3]
    activity: normActivity(activity),
    activitySeq: normActivitySeq(activitySeq),
    activityTs: activityTs ?? 0,
  };
}

/** The device reports its own state on every poll; stash it for the debug screen. */
export async function writeTelemetry(t: Telemetry): Promise<void> {
  await redis.set(TELEMETRY_KEY, t);
}

export async function readTelemetry(): Promise<Telemetry> {
  const t = await redis.get<Telemetry>(TELEMETRY_KEY);
  return t ?? EMPTY_TELEMETRY;
}

/** The phone reports the raw detector state per frame; stash it for the debug screen. */
export async function writeDetector(d: DetectorState): Promise<void> {
  await redis.set(DETECTOR_KEY, d);
}

export async function readDetector(): Promise<DetectorState> {
  const d = await redis.get<DetectorState>(DETECTOR_KEY);
  return d ?? EMPTY_DETECTOR;
}

/** Compose the full debug blob for `/api/state`. */
export async function readDebugState(): Promise<DebugState> {
  const [command, detector, telemetry] = await Promise.all([
    readCommand(),
    readDetector(),
    readTelemetry(),
  ]);
  const { seq, ...device } = command;
  return { seq, device, detector, telemetry };
}
