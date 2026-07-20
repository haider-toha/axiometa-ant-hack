const OUTPUT_PREFIX = "TACTA_OUTPUT ";
const MAX_FREQUENCY_HZ = 65_535;
const MAX_UPTIME_MS = 4_294_967_295;
const DEFAULT_MAX_LINE_LENGTH = 2_048;
const PATTERN_TOKEN = /^[A-Z][A-Z0-9_]{0,19}$/;

const OUTPUT_STATES = new Set([
  "ACTIVE",
  "SUPPRESSED",
  "MUTED",
  "STOPPED",
  "IDLE",
] as const);
const OUTPUT_SOURCES = new Set([
  "LOCAL_SIREN",
  "LOCAL_TOF",
  "RELAY",
  "SERVICE",
  "SYSTEM",
  "NONE",
] as const);
const USER_ACTIVITIES = new Set(["MOVING", "STILL", "UNKNOWN"] as const);
const OUTPUT_REASONS = new Set([
  "PLAYING",
  "STILL_GATE",
  "NIGHT_MODE",
  "OUTPUT_STOPPED",
  "NO_OUTPUT",
] as const);
const OUTPUT_MODES = new Set(["AUDIBLE", "NIGHT"] as const);

export type OutputTelemetryV1 = {
  v: 1;
  leftHz: number;
  rightHz: number;
  upMs: number;
};

export type OutputTelemetryV2 = {
  v: 2;
  leftHz: number;
  rightHz: number;
  upMs: number;
  state: "ACTIVE" | "SUPPRESSED" | "MUTED" | "STOPPED" | "IDLE";
  source:
    | "LOCAL_SIREN"
    | "LOCAL_TOF"
    | "RELAY"
    | "SERVICE"
    | "SYSTEM"
    | "NONE";
  pattern: string;
  activity: "MOVING" | "STILL" | "UNKNOWN";
  reason:
    | "PLAYING"
    | "STILL_GATE"
    | "NIGHT_MODE"
    | "OUTPUT_STOPPED"
    | "NO_OUTPUT";
  tofMm: number | null;
  outputMode: "AUDIBLE" | "NIGHT";
};

export type OutputTelemetry = OutputTelemetryV1 | OutputTelemetryV2;

function isBoundedInteger(value: unknown, maximum: number): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= maximum
  );
}

function isSetValue<T extends string>(
  value: unknown,
  values: ReadonlySet<T>,
): value is T {
  return typeof value === "string" && values.has(value as T);
}

export function parseOutputTelemetryLine(line: string): OutputTelemetry | null {
  const normalized = line.endsWith("\r") ? line.slice(0, -1) : line;
  if (!normalized.startsWith(OUTPUT_PREFIX)) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(normalized.slice(OUTPUT_PREFIX.length));
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return null;
    }

    const record = value as Record<string, unknown>;
    if (
      !isBoundedInteger(record.leftHz, MAX_FREQUENCY_HZ) ||
      !isBoundedInteger(record.rightHz, MAX_FREQUENCY_HZ) ||
      !isBoundedInteger(record.upMs, MAX_UPTIME_MS)
    ) {
      return null;
    }

    if (record.v === 1) {
      return {
        v: 1,
        leftHz: record.leftHz,
        rightHz: record.rightHz,
        upMs: record.upMs,
      };
    }

    if (
      record.v !== 2 ||
      !isSetValue(record.state, OUTPUT_STATES) ||
      !isSetValue(record.source, OUTPUT_SOURCES) ||
      typeof record.pattern !== "string" ||
      !PATTERN_TOKEN.test(record.pattern) ||
      !isSetValue(record.activity, USER_ACTIVITIES) ||
      !isSetValue(record.reason, OUTPUT_REASONS) ||
      (record.tofMm !== null &&
        !isBoundedInteger(record.tofMm, MAX_FREQUENCY_HZ)) ||
      !isSetValue(record.outputMode, OUTPUT_MODES)
    ) {
      return null;
    }

    return {
      v: 2,
      leftHz: record.leftHz,
      rightHz: record.rightHz,
      upMs: record.upMs,
      state: record.state,
      source: record.source,
      pattern: record.pattern,
      activity: record.activity,
      reason: record.reason,
      tofMm: record.tofMm,
      outputMode: record.outputMode,
    };
  } catch {
    return null;
  }
}

export class OutputTelemetryDecoder {
  private buffer = "";
  private discardingOverlongLine = false;

  constructor(private readonly maxLineLength = DEFAULT_MAX_LINE_LENGTH) {}

  push(chunk: string): OutputTelemetry[] {
    let input = chunk;
    if (this.discardingOverlongLine) {
      const newlineIndex = input.indexOf("\n");
      if (newlineIndex === -1) {
        return [];
      }
      input = input.slice(newlineIndex + 1);
      this.discardingOverlongLine = false;
    }

    const segments = `${this.buffer}${input}`.split("\n");
    const trailing = segments.pop() ?? "";
    this.buffer = "";

    const records: OutputTelemetry[] = [];
    for (const line of segments) {
      if (line.length > this.maxLineLength) {
        continue;
      }
      const record = parseOutputTelemetryLine(line);
      if (record) {
        records.push(record);
      }
    }

    if (trailing.length > this.maxLineLength) {
      this.discardingOverlongLine = true;
    } else {
      this.buffer = trailing;
    }
    return records;
  }

  reset(): void {
    this.buffer = "";
    this.discardingOverlongLine = false;
  }
}
