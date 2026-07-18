import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  OutputDashboard,
  type OutputDashboardProps,
} from "@/app/output/output-dashboard";

const IDLE = { v: 1 as const, leftHz: 0, rightHz: 0, upMs: 1000 };

function renderDashboard(overrides: Partial<OutputDashboardProps> = {}) {
  const props: OutputDashboardProps = {
    connection: "disconnected",
    telemetry: null,
    fresh: false,
    history: [],
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
});
