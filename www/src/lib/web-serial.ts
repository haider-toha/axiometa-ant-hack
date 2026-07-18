const SERIAL_BAUD_RATE = 115_200;

export type OutputSerialSession = {
  port: SerialPort;
  done: Promise<void>;
  close: () => Promise<void>;
};

type OutputSerialHandlers = {
  onText: (chunk: string) => void;
  onDisconnect: () => void;
  onError: (message: string) => void;
};

export function supportsWebSerial(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

function requireSerial(): Serial {
  if (!supportsWebSerial()) {
    throw new Error("Web Serial requires desktop Chrome or another supported Chromium browser.");
  }
  return navigator.serial;
}

export async function getGrantedOutputPort(): Promise<SerialPort | null> {
  const ports = await requireSerial().getPorts();
  return ports[0] ?? null;
}

export async function requestOutputPort(): Promise<SerialPort> {
  return requireSerial().requestPort();
}

export function serialErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotFoundError") {
      return "No serial device was selected.";
    }
    if (error.name === "NetworkError" || error.name === "InvalidStateError") {
      return "The serial port is busy. Close PlatformIO Serial Monitor and try again.";
    }
    if (error.name === "SecurityError") {
      return "Serial access was blocked. Open this page over HTTPS or localhost.";
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "The serial connection failed.";
}

export async function openOutputSerialSession(
  port: SerialPort,
  handlers: OutputSerialHandlers,
): Promise<OutputSerialSession> {
  await port.open({ baudRate: SERIAL_BAUD_RATE });
  if (!port.readable) {
    await port.close();
    throw new Error("The selected serial device did not expose a readable stream.");
  }

  const reader = port.readable.getReader();
  const decoder = new TextDecoder();
  let closing = false;
  let disconnected = false;
  let failed = false;

  const reportDisconnect = () => {
    if (disconnected) return;
    disconnected = true;
    handlers.onDisconnect();
  };

  const handlePhysicalDisconnect = () => {
    void reader.cancel().catch(() => undefined);
  };
  port.addEventListener("disconnect", handlePhysicalDisconnect);

  const done = (async () => {
    try {
      while (true) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        if (value) {
          handlers.onText(decoder.decode(value, { stream: true }));
        }
      }

      const trailing = decoder.decode();
      if (trailing) handlers.onText(trailing);
    } catch (error) {
      if (!closing) {
        failed = true;
        handlers.onError(serialErrorMessage(error));
      }
    } finally {
      reader.releaseLock();
      port.removeEventListener("disconnect", handlePhysicalDisconnect);
      if (!failed) reportDisconnect();
    }
  })();

  return {
    port,
    done,
    close: async () => {
      if (closing) return done;
      closing = true;
      await reader.cancel().catch(() => undefined);
      await done.catch(() => undefined);
      if (port.readable || port.writable) {
        await port.close().catch(() => undefined);
      }
    },
  };
}
