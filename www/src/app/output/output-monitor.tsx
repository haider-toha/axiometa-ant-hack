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
} from "./output-dashboard";
import {
  pruneOutputTransitions,
  type OutputTransition,
} from "./output-timeline";

const TELEMETRY_STALE_MS = 1_500;
const subscribeToBrowserCapability = () => () => undefined;

export function OutputMonitor() {
  const [connection, setConnection] = useState<ConnectionStatus>("checking");
  const [telemetry, setTelemetry] = useState<OutputTelemetry | null>(null);
  const [lastRecordAt, setLastRecordAt] = useState<number | null>(null);
  const [history, setHistory] = useState<OutputTransition[]>([]);
  const [recentPulseEndedAt, setRecentPulseEndedAt] = useState<{
    left: number | null;
    right: number | null;
  }>({ left: null, right: null });
  const [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const decoderRef = useRef(new OutputTelemetryDecoder());
  const sessionRef = useRef<OutputSerialSession | null>(null);
  const generationRef = useRef(0);
  const connectingGenerationRef = useRef<number | null>(null);
  const historyIdRef = useRef(0);
  const previousRecordRef = useRef<OutputTelemetry | null>(null);
  const webSerialSupported = useSyncExternalStore(
    subscribeToBrowserCapability,
    supportsWebSerial,
    () => false,
  );

  const resetTrace = useCallback(() => {
    decoderRef.current.reset();
    previousRecordRef.current = null;
    setTelemetry(null);
    setLastRecordAt(null);
    setHistory([]);
    setRecentPulseEndedAt({ left: null, right: null });
  }, []);

  const consumeText = useCallback((chunk: string) => {
    for (const record of decoderRef.current.push(chunk)) {
      const receivedAt = Date.now();
      const previousRecord = previousRecordRef.current;
      const boardRestarted =
        previousRecord !== null && record.upMs < previousRecord.upMs;
      const frequenciesChanged =
        previousRecord === null ||
        record.leftHz !== previousRecord.leftHz ||
        record.rightHz !== previousRecord.rightHz;

      if (boardRestarted) {
        setRecentPulseEndedAt({ left: null, right: null });
      } else if (previousRecord !== null) {
        const leftEnded = previousRecord.leftHz > 0 && record.leftHz === 0;
        const rightEnded = previousRecord.rightHz > 0 && record.rightHz === 0;
        if (leftEnded || rightEnded) {
          setRecentPulseEndedAt((current) => ({
            left: leftEnded ? receivedAt : current.left,
            right: rightEnded ? receivedAt : current.right,
          }));
        }
      }

      setTelemetry(record);
      setLastRecordAt(receivedAt);
      setClock(receivedAt);
      setHistory((current) => {
        const transition: OutputTransition = {
          id: ++historyIdRef.current,
          leftHz: record.leftHz,
          rightHz: record.rightHz,
          upMs: record.upMs,
          receivedAt,
        };
        if (boardRestarted) return [transition];

        const next = frequenciesChanged ? [...current, transition] : current;
        return pruneOutputTransitions(next, record.upMs);
      });
      previousRecordRef.current = record;
    }
  }, []);

  const connectPort = useCallback(
    async (port: SerialPort) => {
      if (sessionRef.current || connectingGenerationRef.current !== null) return;
      const generation = ++generationRef.current;
      connectingGenerationRef.current = generation;
      resetTrace();
      setConnection("connecting");
      setError(null);

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
    [consumeText, resetTrace],
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
    resetTrace();
    setConnection("disconnected");
    setError(null);
    void session?.close();
  }, [resetTrace]);

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
  const elapsedSinceRecord =
    lastRecordAt === null ? 0 : Math.max(0, clock - lastRecordAt);
  const timelineNowUpMs = telemetry
    ? telemetry.upMs + elapsedSinceRecord
    : null;
  const traceEndUpMs = telemetry
    ? telemetry.upMs + (fresh ? elapsedSinceRecord : 0)
    : null;

  return (
    <OutputDashboard
      connection={webSerialSupported ? connection : "unsupported"}
      telemetry={telemetry}
      fresh={fresh}
      history={history}
      clock={clock}
      timelineNowUpMs={timelineNowUpMs}
      traceEndUpMs={traceEndUpMs}
      recentPulseEndedAt={recentPulseEndedAt}
      error={error}
      onConnect={() => void connect()}
      onDisconnect={disconnect}
    />
  );
}
