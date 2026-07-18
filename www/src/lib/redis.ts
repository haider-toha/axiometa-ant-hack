// Upstash Redis relay — the shared state between the phone (capture page) and
// the ESP32 wearable. The board is outbound-only: it POSTs to /api/pull and
// reads the current command; it never accepts an inbound connection.
//
// Stack note: george-stack defaults to Prisma/Neon Postgres, but the relay
// deliberately uses Upstash Redis — the device polls on an edge-triggered
// monotonic `seq`, the state is ephemeral, and Upstash is already provisioned.
import { Redis } from "@upstash/redis";
import type {
  DebugState,
  DetectorState,
  DeviceCommand,
  EventRequest,
  Telemetry,
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

/** Snapshot the current command for the ESP32 poll (`/api/pull`). */
export async function readCommand(): Promise<DeviceCommand> {
  const [seq, pattern, route, dest, conf, arrivalId, ts] = await redis.mget<
    [number, DeviceCommand["pattern"], string, string, DeviceCommand["conf"], number, number]
  >("seq", "pattern", "route", "dest", "conf", "arrivalId", "ts");
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
