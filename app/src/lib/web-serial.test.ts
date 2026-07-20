import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getGrantedOutputPort,
  openOutputSerialSession,
  requestOutputPort,
  serialErrorMessage,
} from "@/lib/web-serial";

function installSerial(serial: Pick<Serial, "getPorts" | "requestPort">) {
  Object.defineProperty(navigator, "serial", {
    configurable: true,
    value: serial,
  });
}

function createPort() {
  let streamController: ReadableStreamDefaultController<Uint8Array>;
  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;
    },
  });
  const target = new EventTarget();
  const close = vi.fn(async () => undefined);
  const port = Object.assign(target, {
    readable,
    writable: null,
    open: vi.fn(async () => undefined),
    close,
  }) as unknown as SerialPort;
  return { port, close, streamController: streamController! };
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "serial");
});

describe("Web Serial helpers", () => {
  it("reuses a granted port and requests a port only when asked", async () => {
    const port = {} as SerialPort;
    const serial = {
      getPorts: vi.fn(async () => [port]),
      requestPort: vi.fn(async () => port),
    };
    installSerial(serial);

    await expect(getGrantedOutputPort()).resolves.toBe(port);
    await expect(requestOutputPort()).resolves.toBe(port);
    expect(serial.getPorts).toHaveBeenCalledOnce();
    expect(serial.requestPort).toHaveBeenCalledOnce();
  });

  it("reads text, releases the stream, and closes cleanly", async () => {
    const { port, close, streamController } = createPort();
    const onText = vi.fn();
    const onDisconnect = vi.fn();
    const session = await openOutputSerialSession(port, {
      onText,
      onDisconnect,
      onError: vi.fn(),
    });

    streamController.enqueue(new TextEncoder().encode("TACTA_OUTPUT "));
    await waitFor(() => expect(onText).toHaveBeenCalledWith("TACTA_OUTPUT "));
    await session.close();

    expect(close).toHaveBeenCalledOnce();
    expect(onDisconnect).toHaveBeenCalledOnce();
  });

  it("ends the reader when the physical device disconnects", async () => {
    const { port } = createPort();
    const onDisconnect = vi.fn();
    const session = await openOutputSerialSession(port, {
      onText: vi.fn(),
      onDisconnect,
      onError: vi.fn(),
    });

    port.dispatchEvent(new Event("disconnect"));
    await session.done;

    expect(onDisconnect).toHaveBeenCalledOnce();
  });

  it("preserves a read error instead of replacing it with disconnected", async () => {
    const { port, close, streamController } = createPort();
    const onDisconnect = vi.fn();
    const onError = vi.fn();
    const session = await openOutputSerialSession(port, {
      onText: vi.fn(),
      onDisconnect,
      onError,
    });

    streamController.error(new Error("read failed"));
    await session.done;

    expect(onError).toHaveBeenCalledWith("read failed");
    expect(onDisconnect).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
  });

  it("provides an actionable message for a busy port", () => {
    expect(serialErrorMessage(new DOMException("busy", "NetworkError"))).toContain(
      "Close PlatformIO Serial Monitor",
    );
  });
});
