import { describe, expect, it } from "vitest";

import { describeOutputReason } from "@/app/output/output-reason";
import type {
  OutputTelemetryV1,
  OutputTelemetryV2,
} from "@/lib/output-telemetry";

const V1: OutputTelemetryV1 = {
  v: 1,
  leftHz: 0,
  rightHz: 0,
  upMs: 100,
};

const IDLE: OutputTelemetryV2 = {
  v: 2,
  leftHz: 0,
  rightHz: 0,
  upMs: 100,
  state: "IDLE",
  source: "NONE",
  pattern: "NONE",
  activity: "MOVING",
  reason: "NO_OUTPUT",
  tofMm: null,
  outputMode: "AUDIBLE",
};

describe("describeOutputReason", () => {
  it("does not present unavailable telemetry as current", () => {
    expect(describeOutputReason(IDLE, "unavailable")).toEqual({
      title: "Waiting for board",
      description: "Connect the ESP32 to see the board's decision.",
      sourceLabel: "NO LIVE DATA",
      activityLabel: "UNKNOWN",
      state: "unavailable",
    });
  });

  it("marks stale telemetry without repeating the old reason", () => {
    expect(describeOutputReason(IDLE, "stale")).toEqual(
      expect.objectContaining({
        title: "Board data is stale",
        description:
          "Reconnect USB before trusting the last output decision.",
        state: "unavailable",
      }),
    );
  });

  it("keeps version 1 boards useful with an explicit fallback", () => {
    expect(describeOutputReason(V1, "live")).toEqual({
      title: "Reason unavailable",
      description:
        "Firmware telemetry v1 keeps the frequencies live but does not explain them.",
      sourceLabel: "FIRMWARE V1",
      activityLabel: "UNKNOWN",
      state: "legacy",
    });
  });

  it("explains moving proximity with its measured distance", () => {
    expect(
      describeOutputReason(
        {
          ...IDLE,
          leftHz: 2350,
          state: "ACTIVE",
          source: "LOCAL_TOF",
          pattern: "PROXIMITY",
          reason: "PLAYING",
          tofMm: 444,
        },
        "live",
      ),
    ).toEqual({
      title: "Local proximity",
      description:
        "P1 is pulsing because an object is 444 mm away while moving.",
      sourceLabel: "LOCAL TOF",
      activityLabel: "MOVING",
      state: "active",
    });
  });

  it("explains why proximity is held while still", () => {
    expect(
      describeOutputReason(
        {
          ...IDLE,
          state: "SUPPRESSED",
          source: "LOCAL_TOF",
          pattern: "PROXIMITY",
          activity: "STILL",
          reason: "STILL_GATE",
          tofMm: 444,
        },
        "live",
      ),
    ).toEqual({
      title: "Proximity held",
      description:
        "An object is 444 mm away, but proximity output stays silent while still.",
      sourceLabel: "LOCAL TOF",
      activityLabel: "STILL",
      state: "held",
    });
  });

  it("explains a relay-derived right cue without claiming obstacle avoidance", () => {
    expect(
      describeOutputReason(
        {
          ...IDLE,
          rightHz: 3050,
          state: "ACTIVE",
          source: "RELAY",
          pattern: "RIGHT",
          reason: "PLAYING",
        },
        "live",
      ),
    ).toEqual(
      expect.objectContaining({
        title: "Cloud RIGHT",
        description:
          "The board accepted RIGHT while moving; P3 carries its pulse pattern.",
        sourceLabel: "RELAY",
        state: "active",
      }),
    );
  });

  it("uses the board's actual activity for a still-phase bearing cue", () => {
    expect(
      describeOutputReason(
        {
          ...IDLE,
          state: "ACTIVE",
          source: "RELAY",
          pattern: "RIGHT",
          activity: "STILL",
          reason: "PLAYING",
        },
        "live",
      ),
    ).toEqual(
      expect.objectContaining({
        description:
          "The board accepted RIGHT while still; P3 carries its pulse pattern.",
      }),
    );
  });

  it("makes local siren priority explicit", () => {
    expect(
      describeOutputReason(
        {
          ...IDLE,
          leftHz: 2350,
          rightHz: 3050,
          state: "ACTIVE",
          source: "LOCAL_SIREN",
          pattern: "SIREN",
          activity: "STILL",
          reason: "PLAYING",
        },
        "live",
      ),
    ).toEqual(
      expect.objectContaining({
        title: "Local siren",
        description:
          "The siren safety pattern has priority over other outputs.",
        sourceLabel: "LOCAL SIREN",
      }),
    );
  });

  it("explains logical output that NIGHT mode physically mutes", () => {
    expect(
      describeOutputReason(
        {
          ...IDLE,
          state: "MUTED",
          source: "RELAY",
          pattern: "BUS",
          activity: "STILL",
          reason: "NIGHT_MODE",
          outputMode: "NIGHT",
        },
        "live",
      ),
    ).toEqual(
      expect.objectContaining({
        title: "Hardware muted",
        description:
          "BUS is running logically, but NIGHT mode keeps both buzzers silent.",
        state: "muted",
      }),
    );
  });

  it("explains the emergency output latch", () => {
    expect(
      describeOutputReason(
        {
          ...IDLE,
          state: "STOPPED",
          reason: "OUTPUT_STOPPED",
        },
        "live",
      ),
    ).toEqual(
      expect.objectContaining({
        title: "Output stopped",
        description:
          "The emergency output latch is off; sensing is still active.",
        state: "stopped",
      }),
    );
  });

  it("states plainly when no output is requested", () => {
    expect(describeOutputReason(IDLE, "live")).toEqual(
      expect.objectContaining({
        title: "Idle",
        description: "No output is currently requested.",
        state: "idle",
      }),
    );
  });

  it("labels service simulation separately from relay output", () => {
    expect(
      describeOutputReason(
        {
          ...IDLE,
          state: "ACTIVE",
          source: "SERVICE",
          pattern: "LEFT",
          reason: "PLAYING",
        },
        "live",
      ),
    ).toEqual(
      expect.objectContaining({
        title: "Demo LEFT",
        description:
          "Serial service control is playing the LEFT channel simulation.",
        sourceLabel: "SERVICE",
      }),
    );
  });

  it("labels the boot-ready pattern as system output", () => {
    expect(
      describeOutputReason(
        {
          ...IDLE,
          state: "ACTIVE",
          source: "SYSTEM",
          pattern: "READY",
          reason: "PLAYING",
        },
        "live",
      ),
    ).toEqual(
      expect.objectContaining({
        title: "System READY",
        description: "The board is playing its startup-ready pattern.",
        sourceLabel: "SYSTEM",
      }),
    );
  });
});
