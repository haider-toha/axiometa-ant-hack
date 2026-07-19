import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const serialMocks = vi.hoisted(() => ({
  getGrantedOutputPort: vi.fn(),
  requestOutputPort: vi.fn(),
  openOutputSerialSession: vi.fn(),
}));

vi.mock("@/lib/web-serial", () => ({
  getGrantedOutputPort: serialMocks.getGrantedOutputPort,
  requestOutputPort: serialMocks.requestOutputPort,
  openOutputSerialSession: serialMocks.openOutputSerialSession,
  serialErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : "Serial connection failed",
  supportsWebSerial: () => true,
}));

import { OutputMonitor } from "@/app/output/output-monitor";

type SessionHandlers = {
  onText: (chunk: string) => void;
  onDisconnect: () => void;
  onError: (message: string) => void;
};

let serialEvents: EventTarget;
let handlers: SessionHandlers[];
let sessions: Array<{ close: ReturnType<typeof vi.fn> }>;

function outputRecord(leftHz: number, rightHz: number, upMs: number): string {
  return `TACTA_OUTPUT ${JSON.stringify({ v: 1, leftHz, rightHz, upMs })}\n`;
}

beforeEach(() => {
  vi.clearAllMocks();
  handlers = [];
  sessions = [];
  serialEvents = new EventTarget();
  Object.defineProperty(navigator, "serial", {
    configurable: true,
    value: serialEvents,
  });
  serialMocks.openOutputSerialSession.mockImplementation(
    async (port: SerialPort, nextHandlers: SessionHandlers) => {
      const session = {
        port,
        done: new Promise<void>(() => undefined),
        close: vi.fn(async () => undefined),
      };
      handlers.push(nextHandlers);
      sessions.push(session);
      return session;
    },
  );
});

describe("OutputMonitor serial lifecycle", () => {
  it("reuses an already granted port when Connect device is clicked", async () => {
    const port = {} as SerialPort;
    serialMocks.getGrantedOutputPort.mockResolvedValueOnce(null).mockResolvedValueOnce(port);
    render(<OutputMonitor />);
    await screen.findByText("Disconnected");

    fireEvent.click(screen.getByRole("button", { name: "Connect device" }));
    await screen.findByText("USB connected");

    expect(serialMocks.openOutputSerialSession).toHaveBeenCalledWith(port, expect.any(Object));
    expect(serialMocks.requestOutputPort).not.toHaveBeenCalled();
  });

  it("automatically reopens a granted port after a cable replug", async () => {
    const port = {} as SerialPort;
    serialMocks.getGrantedOutputPort.mockResolvedValue(port);
    render(<OutputMonitor />);
    await screen.findByText("USB connected");

    act(() => handlers[0].onDisconnect());
    expect(screen.getByText("Disconnected")).toBeInTheDocument();

    act(() => serialEvents.dispatchEvent(new Event("connect")));
    await waitFor(() => expect(serialMocks.openOutputSerialSession).toHaveBeenCalledTimes(2));
    expect(screen.getByText("USB connected")).toBeInTheDocument();
  });

  it("closes the active session on manual disconnect", async () => {
    serialMocks.getGrantedOutputPort.mockResolvedValue({} as SerialPort);
    render(<OutputMonitor />);
    await screen.findByText("USB connected");

    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));

    expect(sessions[0].close).toHaveBeenCalledOnce();
    expect(screen.getByText("Disconnected")).toBeInTheDocument();
  });

  it("can reconnect after a serial read error", async () => {
    const port = {} as SerialPort;
    serialMocks.getGrantedOutputPort.mockResolvedValue(port);
    render(<OutputMonitor />);
    await screen.findByText("USB connected");

    act(() => handlers[0].onError("read failed"));
    expect(screen.getByText("Connection error")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Connect device" }));
    await waitFor(() => expect(serialMocks.openOutputSerialSession).toHaveBeenCalledTimes(2));
    expect(screen.getByText("USB connected")).toBeInTheDocument();
  });

  it("shows a completed short pulse as recent while keeping zero hertz literal", async () => {
    serialMocks.getGrantedOutputPort.mockResolvedValue({} as SerialPort);
    render(<OutputMonitor />);
    await screen.findByText("USB connected");

    act(() => {
      handlers[0].onText(
        outputRecord(0, 0, 1_000) +
          outputRecord(2_350, 0, 2_000) +
          outputRecord(0, 0, 2_120),
      );
    });

    expect(screen.getByText("RECENT")).toBeInTheDocument();
    expect(screen.getByLabelText("Left output frequency")).toHaveTextContent("0 Hz");
    expect(
      screen.getByRole("region", { name: "Five-second output timeline" }),
    ).toHaveAccessibleDescription("Left: 1 pulse, 120 milliseconds. Right: no pulses.");
  });

  it("clears pulse history and afterglow when board uptime moves backwards", async () => {
    serialMocks.getGrantedOutputPort.mockResolvedValue({} as SerialPort);
    render(<OutputMonitor />);
    await screen.findByText("USB connected");

    act(() => {
      handlers[0].onText(
        outputRecord(2_350, 0, 2_000) + outputRecord(0, 0, 2_120),
      );
    });
    expect(screen.getByText("RECENT")).toBeInTheDocument();

    act(() => handlers[0].onText(outputRecord(0, 0, 10)));

    expect(screen.queryByText("RECENT")).not.toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Five-second output timeline" }),
    ).toHaveAccessibleDescription("Left: no pulses. Right: no pulses.");
  });

  it("clears the trace on manual disconnect", async () => {
    serialMocks.getGrantedOutputPort.mockResolvedValue({} as SerialPort);
    render(<OutputMonitor />);
    await screen.findByText("USB connected");

    act(() => {
      handlers[0].onText(
        outputRecord(0, 0, 1_000) +
          outputRecord(0, 3_050, 2_000) +
          outputRecord(0, 0, 2_120),
      );
    });
    expect(screen.getByText("RECENT")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));

    expect(screen.queryByText("RECENT")).not.toBeInTheDocument();
    expect(screen.getByText("Waiting for a pulse")).toBeInTheDocument();
  });
});
