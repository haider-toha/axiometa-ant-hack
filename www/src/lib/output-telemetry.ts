const OUTPUT_PREFIX = "TACTA_OUTPUT ";
const MAX_FREQUENCY_HZ = 65_535;
const MAX_UPTIME_MS = 4_294_967_295;
const DEFAULT_MAX_LINE_LENGTH = 2_048;

export type OutputTelemetry = {
  v: 1;
  leftHz: number;
  rightHz: number;
  upMs: number;
};

function isBoundedInteger(value: unknown, maximum: number): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= maximum
  );
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
      record.v !== 1 ||
      !isBoundedInteger(record.leftHz, MAX_FREQUENCY_HZ) ||
      !isBoundedInteger(record.rightHz, MAX_FREQUENCY_HZ) ||
      !isBoundedInteger(record.upMs, MAX_UPTIME_MS)
    ) {
      return null;
    }

    return {
      v: 1,
      leftHz: record.leftHz,
      rightHz: record.rightHz,
      upMs: record.upMs,
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
