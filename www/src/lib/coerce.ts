// Forgiving coercion of untrusted request bodies into our contract types.
// The device and the phone are the only clients, but a malformed frame must
// never crash a route or poison the debug screen.
import type { DetectorState, PatternId, Telemetry } from "./contract";

export function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export function coerceTelemetry(b: Partial<Telemetry> | null | undefined): Telemetry {
  return {
    bandRms: num(b?.bandRms),
    peakHz: num(b?.peakHz),
    modIdx: num(b?.modIdx),
    trend: b?.trend === "rising" ? "rising" : "flat",
    playing: str(b?.playing, "NONE") as PatternId,
    tofMm: num(b?.tofMm),
    upMs: num(b?.upMs),
    rssi: num(b?.rssi),
  };
}

export function coerceDetector(
  b: Partial<DetectorState> | null | undefined,
): DetectorState {
  return {
    event: str(b?.event, "NONE"),
    present: Boolean(b?.present),
    confidence: num(b?.confidence),
    arrivalId: num(b?.arrivalId),
    route: str(b?.route),
    destination: str(b?.destination),
    readingConf: str(b?.readingConf),
    votes: Array.isArray(b?.votes) ? b.votes.map((v) => str(v)) : [],
  };
}
