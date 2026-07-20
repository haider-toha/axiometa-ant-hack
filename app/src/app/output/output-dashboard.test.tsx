import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  OutputDashboard,
  type OutputDashboardProps,
} from "@/app/output/output-dashboard";
import type { OutputTransition } from "@/app/output/output-timeline";
import {
  RelaySerialDecoder,
  initialBoardRelayState,
  reduceBoardRelayState,
} from "@/app/output/relay-serial";

const IDLE = { v: 1 as const, leftHz: 0, rightHz: 0, upMs: 1000 };
const IDLE_V2 = {
  v: 2 as const,
  leftHz: 0,
  rightHz: 0,
  upMs: 1000,
  state: "IDLE" as const,
  source: "NONE" as const,
  pattern: "NONE",
  activity: "MOVING" as const,
  reason: "NO_OUTPUT" as const,
  tofMm: null,
  outputMode: "AUDIBLE" as const,
};
const CLOCK = 10_000;

function pulseHistory(): OutputTransition[] {
  return [
    { id: 1, leftHz: 0, rightHz: 0, upMs: 1_000, receivedAt: 6_000 },
    { id: 2, leftHz: 2_350, rightHz: 0, upMs: 3_500, receivedAt: 8_500 },
    { id: 3, leftHz: 0, rightHz: 0, upMs: 3_620, receivedAt: 8_620 },
  ];
}

function renderDashboard(overrides: Partial<OutputDashboardProps> = {}) {
  const props: OutputDashboardProps = {
    connection: "disconnected",
    telemetry: null,
    fresh: false,
    history: [],
    clock: CLOCK,
    timelineNowUpMs: null,
    traceEndUpMs: null,
    recentPulseEndedAt: { left: null, right: null },
    boardRelay: initialBoardRelayState(),
    error: null,
    onConnect: vi.fn(),
    onDisconnect: vi.fn(),
    ...overrides,
  };
  render(<OutputDashboard {...props} />);
  return props;
}

describe("OutputDashboard", () => {
  it("offers connection while clearly marking both channels unknown", () => {
    const props = renderDashboard();

    expect(screen.getByText("Disconnected")).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("region", { name: "Physical output channels" }),
      ).getAllByText("UNKNOWN"),
    ).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Connect device" }));
    expect(props.onConnect).toHaveBeenCalledOnce();
  });

  it("explains when Web Serial is unavailable", () => {
    renderDashboard({ connection: "unsupported" });

    expect(screen.getByText("Unsupported browser")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect device" })).toBeDisabled();
  });

  it("shows both connected channels idle", () => {
    renderDashboard({ connection: "connected", telemetry: IDLE, fresh: true });

    expect(screen.getAllByText("IDLE")).toHaveLength(2);
    expect(screen.getByTestId("left-actuator")).toHaveAttribute("data-active", "false");
    expect(screen.getByTestId("right-actuator")).toHaveAttribute("data-active", "false");
  });

  it("keeps version 1 boards explicit and useful", () => {
    renderDashboard({ connection: "connected", telemetry: IDLE, fresh: true });

    const reason = screen.getByRole("region", { name: "Why this output?" });
    expect(within(reason).getByRole("heading", { name: "Reason unavailable" })).toBeInTheDocument();
    expect(reason).toHaveTextContent("Firmware telemetry v1");
    expect(reason).toHaveTextContent("FIRMWARE V1");
  });

  it("explains a board-derived proximity decision with live context", () => {
    renderDashboard({
      connection: "connected",
      telemetry: {
        ...IDLE_V2,
        leftHz: 2350,
        rightHz: 3050,
        state: "ACTIVE",
        source: "LOCAL_TOF",
        pattern: "PROXIMITY",
        reason: "PLAYING",
        tofMm: 444,
      },
      fresh: true,
    });

    const reason = screen.getByRole("region", { name: "Why this output?" });
    expect(within(reason).getByRole("heading", { name: "Local proximity" })).toBeInTheDocument();
    expect(reason).toHaveTextContent(
      "Both channels are pulsing because an object is 444 mm away while moving.",
    );
    expect(reason).toHaveTextContent("MOVING");
    expect(reason).toHaveTextContent("LOCAL TOF");
  });

  it("does not present a stale semantic reason as live", () => {
    renderDashboard({
      connection: "connected",
      telemetry: {
        ...IDLE_V2,
        state: "ACTIVE",
        source: "LOCAL_SIREN",
        pattern: "SIREN",
        reason: "PLAYING",
      },
      fresh: false,
    });

    const reason = screen.getByRole("region", { name: "Why this output?" });
    expect(within(reason).getByRole("heading", { name: "Board data is stale" })).toBeInTheDocument();
    expect(reason).not.toHaveTextContent("Local siren");
  });

  it("keeps semantic and physical live announcements separate", () => {
    renderDashboard({
      connection: "connected",
      telemetry: {
        ...IDLE_V2,
        leftHz: 2350,
        state: "ACTIVE",
        source: "LOCAL_TOF",
        pattern: "PROXIMITY",
        reason: "PLAYING",
        tofMm: 444,
      },
      fresh: true,
    });

    expect(screen.getByTestId("physical-output-announcement")).toHaveTextContent(
      "Left 2350 hertz. Right off.",
    );
    expect(screen.getByTestId("output-reason-announcement")).not.toHaveTextContent(
      "2350 hertz",
    );
  });

  it("shows a left-only output with its physical frequency", () => {
    renderDashboard({
      connection: "connected",
      telemetry: { ...IDLE, leftHz: 2350 },
      fresh: true,
    });

    expect(screen.getByTestId("left-actuator")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("right-actuator")).toHaveAttribute("data-active", "false");
    expect(screen.getByLabelText("Left output frequency")).toHaveTextContent("2,350 Hz");
  });

  it("shows a right-only output with its physical frequency", () => {
    renderDashboard({
      connection: "connected",
      telemetry: { ...IDLE, rightHz: 3050 },
      fresh: true,
    });

    expect(screen.getByTestId("left-actuator")).toHaveAttribute("data-active", "false");
    expect(screen.getByTestId("right-actuator")).toHaveAttribute("data-active", "true");
    expect(screen.getByLabelText("Right output frequency")).toHaveTextContent("3,050 Hz");
  });

  it("shows both channels active independently", () => {
    renderDashboard({
      connection: "connected",
      telemetry: { ...IDLE, leftHz: 2350, rightHz: 3050 },
      fresh: true,
    });

    expect(screen.getByTestId("left-actuator")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("right-actuator")).toHaveAttribute("data-active", "true");
    expect(screen.getAllByText("ACTIVE")).toHaveLength(2);
  });

  it("does not present stale values as live output", () => {
    renderDashboard({
      connection: "connected",
      telemetry: { ...IDLE, leftHz: 2350 },
      fresh: false,
    });

    expect(screen.getAllByText("STALE")).toHaveLength(2);
    expect(screen.getByTestId("left-actuator")).toHaveAttribute("data-active", "false");
  });

  it("surfaces connection errors", () => {
    renderDashboard({ connection: "error", error: "The serial port is busy." });

    expect(screen.getByRole("alert")).toHaveTextContent("The serial port is busy.");
  });

  it("keeps a completed pulse briefly visible without presenting it as live", () => {
    renderDashboard({
      connection: "connected",
      telemetry: { ...IDLE, upMs: 5_000 },
      fresh: true,
      history: pulseHistory(),
      timelineNowUpMs: 5_000,
      traceEndUpMs: 5_000,
      recentPulseEndedAt: { left: CLOCK - 500, right: null },
    });

    expect(screen.getByText("RECENT")).toBeInTheDocument();
    expect(screen.getByLabelText("Left output frequency")).toHaveTextContent("0 Hz");
    expect(screen.getByTestId("left-actuator")).toHaveAttribute("data-active", "false");
    expect(screen.getByTestId("left-actuator")).toHaveAttribute("data-recent", "true");
  });

  it("returns the afterglow to idle after 750 milliseconds", () => {
    renderDashboard({
      connection: "connected",
      telemetry: { ...IDLE, upMs: 5_000 },
      fresh: true,
      recentPulseEndedAt: { left: CLOCK - 751, right: null },
    });

    expect(screen.getAllByText("IDLE")).toHaveLength(2);
    expect(screen.getByTestId("left-actuator")).toHaveAttribute("data-recent", "false");
  });

  it("labels the five-second P1 and P3 timeline and summarizes duration", () => {
    renderDashboard({
      connection: "connected",
      telemetry: { ...IDLE, upMs: 5_000 },
      fresh: true,
      history: pulseHistory(),
      timelineNowUpMs: 5_000,
      traceEndUpMs: 5_000,
    });

    const timeline = screen.getByRole("region", {
      name: "Five-second output timeline",
    });
    expect(within(timeline).getByText("P1")).toBeInTheDocument();
    expect(within(timeline).getByText("LEFT")).toBeInTheDocument();
    expect(within(timeline).getByText("P3")).toBeInTheDocument();
    expect(within(timeline).getByText("RIGHT")).toBeInTheDocument();
    expect(within(timeline).getByText("-5 s")).toBeInTheDocument();
    expect(within(timeline).getByText("NOW")).toBeInTheDocument();
    expect(timeline).toHaveAccessibleDescription(
      "Left: 1 pulse, 120 milliseconds. Right: no pulses.",
    );
  });

  it("switches between accessible output and relay trace tabs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
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
              event: "",
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
          }),
          { status: 200 },
        ),
      ),
    );
    const decoder = new RelaySerialDecoder();
    const boardRelay = reduceBoardRelayState(
      initialBoardRelayState(),
      decoder.push(
        "RELAY command=accepted pattern=NUMBER seq=24 activity=STILL route=88\n",
        9_500,
      ),
    );
    renderDashboard({ connection: "connected", boardRelay });

    const channelsTab = screen.getByRole("tab", { name: "Output channels" });
    const relayTab = screen.getByRole("tab", { name: "Relay trace" });
    expect(channelsTab).toHaveAttribute("aria-selected", "true");

    fireEvent.click(relayTab);
    expect(relayTab).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByRole("heading", { name: "Board received" })).toBeInTheDocument();

    fireEvent.click(channelsTab);
    expect(screen.getByRole("region", { name: "Five-second output timeline" })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("supports arrow-key navigation between tabs", () => {
    renderDashboard();
    const channelsTab = screen.getByRole("tab", { name: "Output channels" });
    const relayTab = screen.getByRole("tab", { name: "Relay trace" });
    channelsTab.focus();

    fireEvent.keyDown(channelsTab, { key: "ArrowRight" });
    expect(relayTab).toHaveFocus();
    expect(relayTab).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(relayTab, { key: "ArrowLeft" });
    expect(channelsTab).toHaveFocus();
    expect(channelsTab).toHaveAttribute("aria-selected", "true");
  });
});
