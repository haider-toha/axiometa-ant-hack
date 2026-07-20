import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DebugState } from "@/lib/contract";

import {
  RelaySerialDecoder,
  initialBoardRelayState,
  reduceBoardRelayState,
} from "./relay-serial";
import { RelayTrace } from "./relay-trace";

const CLOCK = 10_000;

function state(): DebugState {
  return {
    seq: 24,
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

function boardState() {
  const decoder = new RelaySerialDecoder();
  return reduceBoardRelayState(
    initialBoardRelayState(),
    decoder.push(
      [
        "RELAY wifi=connected ip=172.20.10.4 rssi=-61",
        "RELAY activity=STILL seq=5 override=0",
        "RELAY command=accepted pattern=NUMBER seq=24 activity=STILL route=88",
      ].join("\n") + "\n",
      9_500,
    ),
  );
}

function response(body: DebugState = state()) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "x-vercel-id": "lhr1::abc-123",
    },
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("RelayTrace", () => {
  it("shows aligned relay intent, board receipt, and endpoint evidence", async () => {
    vi.mocked(fetch).mockResolvedValue(response());
    render(<RelayTrace connection="connected" board={boardState()} clock={CLOCK} />);

    await screen.findByText("ACCEPTED");
    expect(screen.getByRole("status")).toHaveTextContent("ACCEPTED");
    expect(screen.getByRole("status")).not.toHaveTextContent("500 ms ago");
    expect(screen.getByRole("heading", { name: "Relay outgoing" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Board received" })).toBeInTheDocument();
    expect(screen.getAllByText("Relay only").length).toBeGreaterThan(0);
    expect(screen.getByRole("list", { name: "Recent relay events" })).toBeInTheDocument();
    expect(screen.getByText("HTTP 200")).toBeInTheDocument();
    expect(screen.getByText("lhr1::abc-123")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/state", { cache: "no-store" });
  });

  it("does not overlap polls while a request is in flight", async () => {
    vi.useFakeTimers();
    let resolveRequest: ((value: Response) => void) | undefined;
    vi.mocked(fetch).mockImplementation(
      () => new Promise<Response>((resolve) => { resolveRequest = resolve; }),
    );
    const view = render(
      <RelayTrace connection="connected" board={boardState()} clock={CLOCK} />,
    );

    await act(async () => Promise.resolve());
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTimeAsync(1_500));
    expect(fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRequest?.(response());
      await Promise.resolve();
    });
    view.unmount();
  });

  it("shows an endpoint failure and recovers on the next successful poll", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValue(response());
    render(<RelayTrace connection="connected" board={boardState()} clock={CLOCK} />);

    await act(async () => Promise.resolve());
    expect(screen.getByRole("status")).toHaveTextContent("RELAY OFFLINE");
    expect(screen.getByText("network down")).toBeInTheDocument();

    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(screen.getByRole("status")).toHaveTextContent("ACCEPTED");
  });

  it("marks unsuccessful HTTP responses offline with their status", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("nope", { status: 503 }));
    render(<RelayTrace connection="connected" board={boardState()} clock={CLOCK} />);

    await screen.findByText("RELAY OFFLINE");
    expect(screen.getByRole("status")).toHaveTextContent("RELAY OFFLINE");
    expect(screen.getByText("HTTP 503")).toBeInTheDocument();
  });
});
