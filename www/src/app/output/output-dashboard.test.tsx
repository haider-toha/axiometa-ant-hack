import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  OutputDashboard,
  type OutputDashboardProps,
} from "@/app/output/output-dashboard";
import type { OutputTransition } from "@/app/output/output-timeline";

const IDLE = { v: 1 as const, leftHz: 0, rightHz: 0, upMs: 1000 };
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
    expect(screen.getAllByText("UNKNOWN")).toHaveLength(2);
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
});
