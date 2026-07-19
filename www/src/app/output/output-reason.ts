import type { OutputTelemetry } from "@/lib/output-telemetry";

export type OutputReasonAvailability = "live" | "stale" | "unavailable";

export type OutputReasonPresentation = {
  title: string;
  description: string;
  sourceLabel: string;
  activityLabel: string;
  state:
    | "active"
    | "held"
    | "muted"
    | "stopped"
    | "idle"
    | "legacy"
    | "unavailable";
};

const SOURCE_LABELS = {
  LOCAL_SIREN: "LOCAL SIREN",
  LOCAL_TOF: "LOCAL TOF",
  RELAY: "RELAY",
  SERVICE: "SERVICE",
  SYSTEM: "SYSTEM",
  NONE: "BOARD",
} as const;

export function describeOutputReason(
  telemetry: OutputTelemetry | null,
  availability: OutputReasonAvailability,
): OutputReasonPresentation {
  if (availability === "unavailable" || telemetry === null) {
    return {
      title: "Waiting for board",
      description: "Connect the ESP32 to see the board's decision.",
      sourceLabel: "NO LIVE DATA",
      activityLabel: "UNKNOWN",
      state: "unavailable",
    };
  }

  if (availability === "stale") {
    return {
      title: "Board data is stale",
      description: "Reconnect USB before trusting the last output decision.",
      sourceLabel: "NO LIVE DATA",
      activityLabel: "UNKNOWN",
      state: "unavailable",
    };
  }

  if (telemetry.v === 1) {
    return {
      title: "Reason unavailable",
      description:
        "Firmware telemetry v1 keeps the frequencies live but does not explain them.",
      sourceLabel: "FIRMWARE V1",
      activityLabel: "UNKNOWN",
      state: "legacy",
    };
  }

  const context = {
    sourceLabel: SOURCE_LABELS[telemetry.source],
    activityLabel: telemetry.activity,
  };

  if (telemetry.state === "STOPPED") {
    return {
      ...context,
      title: "Output stopped",
      description: "The emergency output latch is off; sensing is still active.",
      state: "stopped",
    };
  }

  if (telemetry.state === "MUTED") {
    return {
      ...context,
      title: "Hardware muted",
      description: `${telemetry.pattern} is running logically, but NIGHT mode keeps both buzzers silent.`,
      state: "muted",
    };
  }

  if (telemetry.state === "SUPPRESSED") {
    const distance = distancePhrase(telemetry.tofMm);
    return {
      ...context,
      title: "Proximity held",
      description: distance
        ? `An object is ${distance} away, but proximity output stays silent while still.`
        : "Proximity is detected, but its output stays silent while still.",
      state: "held",
    };
  }

  if (telemetry.state === "IDLE") {
    return {
      ...context,
      title: "Idle",
      description: "No output is currently requested.",
      state: "idle",
    };
  }

  if (telemetry.source === "LOCAL_TOF") {
    const distance = distancePhrase(telemetry.tofMm);
    return {
      ...context,
      title: "Local proximity",
      description: distance
        ? `P1 is pulsing because an object is ${distance} away while moving.`
        : "P1 is pulsing because the local proximity reflex is active while moving.",
      state: "active",
    };
  }

  if (telemetry.source === "LOCAL_SIREN") {
    return {
      ...context,
      title: "Local siren",
      description: "The siren safety pattern has priority over other outputs.",
      state: "active",
    };
  }

  if (telemetry.source === "RELAY") {
    return {
      ...context,
      title: `Cloud ${telemetry.pattern}`,
      description: relayDescription(telemetry.pattern, telemetry.activity),
      state: "active",
    };
  }

  if (telemetry.source === "SERVICE") {
    return {
      ...context,
      title: `Demo ${telemetry.pattern}`,
      description: `Serial service control is playing the ${telemetry.pattern} channel simulation.`,
      state: "active",
    };
  }

  if (telemetry.source === "SYSTEM") {
    return {
      ...context,
      title: `System ${telemetry.pattern}`,
      description:
        telemetry.pattern === "READY"
          ? "The board is playing its startup-ready pattern."
          : `The board is playing its ${telemetry.pattern} system pattern.`,
      state: "active",
    };
  }

  return {
    ...context,
    title: telemetry.pattern,
    description: "The board is playing this local output pattern.",
    state: "active",
  };
}

function distancePhrase(tofMm: number | null): string | null {
  return tofMm === null ? null : `${tofMm.toLocaleString("en-GB")} mm`;
}

function relayDescription(pattern: string, activity: "MOVING" | "STILL" | "UNKNOWN") {
  const phase = activity.toLowerCase();
  switch (pattern) {
    case "LEFT":
      return `The board accepted LEFT while ${phase}; P1 carries its pulse pattern.`;
    case "RIGHT":
      return `The board accepted RIGHT while ${phase}; P3 carries its pulse pattern.`;
    case "AHEAD":
      return `The board accepted AHEAD while ${phase}; both channels carry its pulse pattern.`;
    case "BUS":
      return "The board accepted BUS while still; both channels carry the arrival pattern.";
    case "NUMBER":
      return "The board accepted route 88; both channels carry the number pattern.";
    case "WAIT":
      return "The board is waiting for the route reading; P1 and P3 alternate.";
    case "UNKNOWN":
      return "The route could not be read confidently; both channels carry the unknown pattern.";
    case "ERROR":
      return "The relay reported an error; P1 carries the degraded-state pattern.";
    default:
      return `The board accepted ${pattern} while ${phase}.`;
  }
}
