import { describe, expect, it } from "vitest";

import type { DebugState } from "@/lib/contract";

import {
  RelaySerialDecoder,
  compareRelayState,
  initialBoardRelayState,
  reduceBoardRelayState,
} from "./relay-serial";

function relayState(
  overrides: Partial<DebugState["device"]> & { seq?: number } = {},
): DebugState {
  const { seq = 24, ...device } = overrides;
  return {
    seq,
    device: {
      pattern: "NUMBER",
      route: "88",
      dest: "Clapham Common",
      conf: "high",
      arrivalId: 7,
      ts: 9_000,
      activity: "STILL",
      activitySeq: 5,
      activityTs: 8_500,
      ...device,
    },
    detector: {
      event: "BUS_ROUTE_READ",
      present: true,
      confidence: 0.94,
      arrivalId: 7,
      route: "88",
      destination: "Clapham Common",
      readingConf: "high",
      votes: ["88"],
      labels: ["bus"],
      hazards: [],
      targetBearing: "center",
    },
    telemetry: {
      bandRms: 0,
      peakHz: 0,
      modIdx: 0,
      trend: "flat",
      playing: "NONE",
      tofMm: 0,
      upMs: 0,
      rssi: -55,
    },
  };
}

describe("RelaySerialDecoder", () => {
  it("reassembles partial command lines", () => {
    const decoder = new RelaySerialDecoder();

    expect(decoder.push("RELAY command=accepted pattern=NUM", 1_000)).toEqual([]);
    expect(decoder.push("BER seq=24 activity=STILL route=88\n", 1_010)).toEqual([
      {
        kind: "command",
        disposition: "accepted",
        pattern: "NUMBER",
        seq: 24,
        activity: "STILL",
        route: "88",
        receivedAt: 1_010,
      },
    ]);
  });

  it("parses multiple command, activity, gap, and transport lines", () => {
    const decoder = new RelaySerialDecoder();
    const events = decoder.push(
      [
        "RELAY command=gap seq=24 missed=2",
        "RELAY command=route_mismatch pattern=NUMBER seq=24 activity=STILL route=91",
        "RELAY activity=STILL seq=5 override=0",
        "RELAY activity=baseline seq=4 value=MOVING",
        "RELAY activity=invalidated reason=missing_invalid_or_stale",
        "RELAY wifi=connected ip=172.20.10.4 rssi=-61",
        "RELAY wifi=disconnected retry_ms=1000",
        "RELAY http=503",
        "RELAY rejected=json error=InvalidInput",
        "RELAY poll=failed retry_ms=2000",
      ].join("\n") + "\n",
      2_000,
    );

    expect(events.map((event) => event.kind)).toEqual([
      "gap",
      "command",
      "activity",
      "activity_baseline",
      "activity_invalidated",
      "wifi_connected",
      "wifi_disconnected",
      "http_error",
      "rejected",
      "poll_failed",
    ]);
    expect(events[0]).toMatchObject({ seq: 24, missed: 2 });
    expect(events[1]).toMatchObject({
      disposition: "route_mismatch",
      pattern: "NUMBER",
      route: "91",
    });
    expect(events[2]).toMatchObject({ activity: "STILL", seq: 5, override: false });
    expect(events[5]).toMatchObject({ ip: "172.20.10.4", rssi: -61 });
    expect(events[7]).toMatchObject({ status: 503 });
  });

  it("parses all firmware command dispositions and INVALID patterns", () => {
    const decoder = new RelaySerialDecoder();
    const dispositions = [
      "unchanged",
      "baseline",
      "accepted",
      "suppressed",
      "no_output",
      "route_mismatch",
      "low_confidence",
      "rejected",
    ];
    const events = decoder.push(
      dispositions
        .map(
          (disposition, index) =>
            `RELAY command=${disposition} pattern=${index === 7 ? "INVALID" : "BUS"} seq=${index + 1} activity=MOVING route=`,
        )
        .join("\n") + "\n",
      3_000,
    );

    expect(events.map((event) => event.kind === "command" && event.disposition)).toEqual(
      dispositions,
    );
    expect(events.at(-1)).toMatchObject({ pattern: "INVALID" });
  });

  it("ignores unrelated and malformed lines", () => {
    const decoder = new RelaySerialDecoder();
    expect(
      decoder.push(
        "TACTA_OUTPUT {\"v\":1}\nRELAY command=accepted nope\nhello\n",
        4_000,
      ),
    ).toEqual([]);
  });

  it("recovers after discarding an overlong partial line", () => {
    const decoder = new RelaySerialDecoder(64);
    expect(decoder.push("x".repeat(80), 5_000)).toEqual([]);
    expect(
      decoder.push(
        "still ignored\nRELAY wifi=connected ip=1.2.3.4 rssi=-42\n",
        5_010,
      ),
    ).toEqual([
      {
        kind: "wifi_connected",
        ip: "1.2.3.4",
        rssi: -42,
        receivedAt: 5_010,
      },
    ]);
  });
});

describe("reduceBoardRelayState", () => {
  it("attaches a sequence gap to its command and clears it on a later clean command", () => {
    const decoder = new RelaySerialDecoder();
    let state = reduceBoardRelayState(
      initialBoardRelayState(),
      decoder.push(
        "RELAY command=gap seq=24 missed=2\nRELAY command=accepted pattern=NUMBER seq=24 activity=STILL route=88\n",
        6_000,
      ),
    );
    expect(state.sequenceGap).toBe(2);

    state = reduceBoardRelayState(
      state,
      decoder.push(
        "RELAY command=accepted pattern=BUS seq=25 activity=STILL route=\n",
        6_100,
      ),
    );
    expect(state.sequenceGap).toBeNull();
  });

  it("tracks transport degradation and caps newest-first history at 20", () => {
    const decoder = new RelaySerialDecoder();
    const lines = Array.from(
      { length: 25 },
      (_, index) => `RELAY http=${500 + index}`,
    ).join("\n");
    const state = reduceBoardRelayState(
      initialBoardRelayState(),
      decoder.push(`${lines}\n`, 7_000),
    );

    expect(state.transport).toBe("degraded");
    expect(state.lastError).toContain("524");
    expect(state.events).toHaveLength(20);
    expect(state.events[0]).toMatchObject({ status: 524 });
    expect(state.events.at(-1)).toMatchObject({ status: 505 });
  });

  it("clears a prior activity receipt when firmware invalidates cloud activity", () => {
    const decoder = new RelaySerialDecoder();
    let state = reduceBoardRelayState(
      initialBoardRelayState(),
      decoder.push("RELAY activity=STILL seq=5 override=0\n", 7_100),
    );
    expect(state.activity).toMatchObject({ activity: "STILL", seq: 5 });

    state = reduceBoardRelayState(
      state,
      decoder.push(
        "RELAY activity=invalidated reason=missing_invalid_or_stale\n",
        7_200,
      ),
    );
    expect(state.activity).toBeNull();
  });
});

describe("compareRelayState", () => {
  const receipt = () => {
    const decoder = new RelaySerialDecoder();
    return reduceBoardRelayState(
      initialBoardRelayState(),
      decoder.push(
        "RELAY command=accepted pattern=NUMBER seq=24 activity=STILL route=88\nRELAY activity=STILL seq=5 override=0\n",
        9_500,
      ),
    );
  };

  it.each([
    [{ usbConnected: false, relayOnline: true }, "no_usb", "NO USB"],
    [{ usbConnected: true, relayOnline: false }, "relay_offline", "RELAY OFFLINE"],
  ] as const)("returns the transport gate %s", (flags, kind, label) => {
    expect(
      compareRelayState({
        ...flags,
        relay: relayState(),
        board: initialBoardRelayState(),
        now: 10_000,
      }),
    ).toMatchObject({ kind, label });
  });

  it("waits before any relay or board command exists", () => {
    expect(
      compareRelayState({
        usbConnected: true,
        relayOnline: true,
        relay: null,
        board: initialBoardRelayState(),
        now: 10_000,
      }),
    ).toMatchObject({ kind: "waiting", label: "WAITING" });
  });

  it("marks a newer relay command pending for two seconds, then missed", () => {
    const board = receipt();
    const pending = relayState({ seq: 25, ts: 9_000 });
    expect(
      compareRelayState({ usbConnected: true, relayOnline: true, relay: pending, board, now: 10_999 }),
    ).toMatchObject({ kind: "pending" });
    expect(
      compareRelayState({ usbConnected: true, relayOnline: true, relay: pending, board, now: 11_001 }),
    ).toMatchObject({ kind: "missed" });
  });

  it("waits when this USB session has not observed a board command", () => {
    const board = initialBoardRelayState();
    expect(
      compareRelayState({
        usbConnected: true,
        relayOnline: true,
        relay: relayState({ ts: 9_000 }),
        board,
        now: 10_000,
      }),
    ).toMatchObject({ kind: "waiting" });
  });

  it("marks an observed sequence gap missed", () => {
    const decoder = new RelaySerialDecoder();
    const board = reduceBoardRelayState(
      initialBoardRelayState(),
      decoder.push(
        "RELAY command=gap seq=24 missed=1\nRELAY command=accepted pattern=NUMBER seq=24 activity=STILL route=88\n",
        9_500,
      ),
    );
    expect(
      compareRelayState({ usbConnected: true, relayOnline: true, relay: relayState(), board, now: 10_000 }),
    ).toMatchObject({ kind: "missed" });
  });

  it("marks equal-sequence pattern or route differences as mismatches", () => {
    expect(
      compareRelayState({
        usbConnected: true,
        relayOnline: true,
        relay: relayState({ route: "91" }),
        board: receipt(),
        now: 10_000,
      }),
    ).toMatchObject({ kind: "mismatch", label: "MISMATCH" });
  });

  it.each([
    "unchanged",
    "baseline",
    "accepted",
    "suppressed",
    "no_output",
    "route_mismatch",
    "low_confidence",
    "rejected",
  ] as const)("surfaces the matched board disposition %s", (disposition) => {
    const decoder = new RelaySerialDecoder();
    const board = reduceBoardRelayState(
      initialBoardRelayState(),
      decoder.push(
        `RELAY command=${disposition} pattern=NUMBER seq=24 activity=STILL route=88\n`,
        9_500,
      ),
    );
    expect(
      compareRelayState({ usbConnected: true, relayOnline: true, relay: relayState(), board, now: 10_000 }),
    ).toMatchObject({ kind: disposition, label: disposition.toUpperCase() });
  });

  it.each([
    [5, "STILL", "matched"],
    [4, "STILL", "behind"],
    [5, "MOVING", "mismatch"],
  ] as const)("compares activity independently (%s, %s)", (seq, activity, expected) => {
    const decoder = new RelaySerialDecoder();
    const board = reduceBoardRelayState(
      initialBoardRelayState(),
      decoder.push(`RELAY activity=${activity} seq=${seq} override=0\n`, 9_500),
    );
    expect(
      compareRelayState({ usbConnected: true, relayOnline: true, relay: relayState(), board, now: 10_000 }).activity,
    ).toBe(expected);
  });
});
