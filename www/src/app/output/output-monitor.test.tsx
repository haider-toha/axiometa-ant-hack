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
});
