"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  OutputTelemetryDecoder,
  type OutputTelemetry,
} from "@/lib/output-telemetry";
import {
  getGrantedOutputPort,
  openOutputSerialSession,
  requestOutputPort,
  serialErrorMessage,
  supportsWebSerial,
  type OutputSerialSession,
} from "@/lib/web-serial";

import {
  OutputDashboard,
  type ConnectionStatus,
  type OutputHistoryEntry,
} from "./output-dashboard";

const TELEMETRY_STALE_MS = 1_500;
const HISTORY_LIMIT = 24;
const subscribeToBrowserCapability = () => () => undefined;

export function OutputMonitor() {
  const [connection, setConnection] = useState<ConnectionStatus>("checking");
  const [telemetry, setTelemetry] = useState<OutputTelemetry | null>(null);
  const [lastRecordAt, setLastRecordAt] = useState<number | null>(null);
  const [history, setHistory] = useState<OutputHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const decoderRef = useRef(new OutputTelemetryDecoder());
  const sessionRef = useRef<OutputSerialSession | null>(null);
  const generationRef = useRef(0);
  const connectingGenerationRef = useRef<number | null>(null);
  const historyIdRef = useRef(0);
  const webSerialSupported = useSyncExternalStore(
    subscribeToBrowserCapability,
    supportsWebSerial,
    () => false,
  );

  const consumeText = useCallback((chunk: string) => {
    for (const record of decoderRef.current.push(chunk)) {
      const receivedAt = Date.now();
      setTelemetry(record);
      setLastRecordAt(receivedAt);
      setClock(receivedAt);
      setHistory((current) => {
        const previous = current.at(-1);
        if (previous?.leftHz === record.leftHz && previous.rightHz === record.rightHz) {
          return current;
        }
        const next = [
          ...current,
          {
            id: ++historyIdRef.current,
            leftHz: record.leftHz,
            rightHz: record.rightHz,
          },
        ];
        return next.slice(-HISTORY_LIMIT);
      });
    }
  }, []);

  const connectPort = useCallback(
    async (port: SerialPort) => {
      if (sessionRef.current || connectingGenerationRef.current !== null) return;
      const generation = ++generationRef.current;
      connectingGenerationRef.current = generation;
      setConnection("connecting");
      setError(null);
      decoderRef.current.reset();

      try {
        const session = await openOutputSerialSession(port, {
          onText: consumeText,
          onDisconnect: () => {
            if (generationRef.current !== generation) return;
            sessionRef.current = null;
            setConnection("disconnected");
          },
          onError: (message) => {
            if (generationRef.current !== generation) return;
            sessionRef.current = null;
            setError(message);
            setConnection("error");
          },
        });

        if (generationRef.current !== generation) {
          await session.close();
          return;
        }
        sessionRef.current = session;
        setConnection("connected");
      } catch (caught) {
        if (generationRef.current !== generation) return;
        setError(serialErrorMessage(caught));
        setConnection("error");
      } finally {
        if (connectingGenerationRef.current === generation) {
          connectingGenerationRef.current = null;
        }
      }
    },
    [consumeText],
  );

  const connect = useCallback(async () => {
    try {
      const port = (await getGrantedOutputPort()) ?? (await requestOutputPort());
      await connectPort(port);
    } catch (caught) {
      setError(serialErrorMessage(caught));
      setConnection(caught instanceof DOMException && caught.name === "NotFoundError" ? "disconnected" : "error");
    }
  }, [connectPort]);

  const disconnect = useCallback(() => {
    generationRef.current += 1;
    connectingGenerationRef.current = null;
    const session = sessionRef.current;
    sessionRef.current = null;
    decoderRef.current.reset();
    setConnection("disconnected");
    setTelemetry(null);
    setLastRecordAt(null);
    setError(null);
    void session?.close();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!webSerialSupported) return;

    let cancelled = false;
    const reconnectGrantedPort = () => {
      if (cancelled || sessionRef.current || connectingGenerationRef.current !== null) return;
      void getGrantedOutputPort()
        .then((port) => {
          if (!cancelled && port) return connectPort(port);
        })
        .catch((caught) => {
          if (cancelled) return;
          setError(serialErrorMessage(caught));
          setConnection("error");
        });
    };
    navigator.serial.addEventListener("connect", reconnectGrantedPort);
    void getGrantedOutputPort()
      .then((port) => {
        if (cancelled) return;
        if (port) return connectPort(port);
        setConnection("disconnected");
      })
      .catch((caught) => {
        if (cancelled) return;
        setError(serialErrorMessage(caught));
        setConnection("error");
      });

    return () => {
      cancelled = true;
      navigator.serial.removeEventListener("connect", reconnectGrantedPort);
      generationRef.current += 1;
      connectingGenerationRef.current = null;
      const session = sessionRef.current;
      sessionRef.current = null;
      void session?.close();
    };
  }, [connectPort, webSerialSupported]);

  const fresh =
    connection === "connected" &&
    lastRecordAt !== null &&
    clock - lastRecordAt <= TELEMETRY_STALE_MS;

  return (
    <OutputDashboard
      connection={webSerialSupported ? connection : "unsupported"}
      telemetry={telemetry}
      fresh={fresh}
      history={history}
      error={error}
      onConnect={() => void connect()}
      onDisconnect={disconnect}
    />
  );
}
