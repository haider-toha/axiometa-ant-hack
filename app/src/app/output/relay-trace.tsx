"use client";

import { useEffect, useRef, useState } from "react";

import type { DebugState } from "@/lib/contract";

import type { ConnectionStatus } from "./output-dashboard";
import {
  compareRelayState,
  type BoardRelayEvent,
  type BoardRelayState,
} from "./relay-serial";
import styles from "./relay-trace.module.css";

type EndpointEvidence = {
  status: number | null;
  durationMs: number;
  receivedAt: number;
  vercelId: string | null;
  error: string | null;
};

export function RelayTrace({
  connection,
  board,
  clock,
}: {
  connection: ConnectionStatus;
  board: BoardRelayState;
  clock: number;
}) {
  const [relay, setRelay] = useState<DebugState | null>(null);
  const [relayOnline, setRelayOnline] = useState<boolean | null>(null);
  const [evidence, setEvidence] = useState<EndpointEvidence | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      const startedAt = Date.now();
      let status: number | null = null;
      let vercelId: string | null = null;
      try {
        const response = await fetch("/api/state", { cache: "no-store" });
        status = response.status;
        vercelId = response.headers.get("x-vercel-id");
        if (!response.ok) throw new Error(`Relay returned HTTP ${response.status}`);
        const snapshot = (await response.json()) as DebugState;
        if (cancelled) return;
        const receivedAt = Date.now();
        setRelay(snapshot);
        setRelayOnline(true);
        setEvidence({
          status,
          durationMs: Math.max(0, receivedAt - startedAt),
          receivedAt,
          vercelId,
          error: null,
        });
      } catch (caught) {
        if (cancelled) return;
        const receivedAt = Date.now();
        setRelayOnline(false);
        setEvidence({
          status,
          durationMs: Math.max(0, receivedAt - startedAt),
          receivedAt,
          vercelId,
          error: caught instanceof Error ? caught.message : "Relay request failed",
        });
      } finally {
        inFlight.current = false;
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      inFlight.current = false;
    };
  }, []);

  const verdict = compareRelayState({
    usbConnected: connection === "connected",
    relayOnline: relayOnline !== false,
    relay,
    board,
    now: clock,
  });
  const boardAge = board.lastEventAt === null ? null : Math.max(0, clock - board.lastEventAt);
  const endpointAge = evidence === null ? null : Math.max(0, clock - evidence.receivedAt);

  return (
    <section className={styles.trace} aria-label="Relay receipt trace">
      <div className={styles.verdict} data-tone={verdict.tone}>
        <div role="status">
          <p className={styles.kicker}>Relay intent ↔ board receipt</p>
          <strong>{verdict.label}</strong>
          <span>{verdict.detail}</span>
        </div>
        <div className={styles.sequencePair} aria-label="Relay and board command sequences">
          <span>Relay <b>{relay?.seq ?? "—"}</b></span>
          <span aria-hidden="true">→</span>
          <span>Board <b>{board.command?.seq ?? "—"}</b></span>
          <small>{boardAge === null ? "No board event" : `${formatAge(boardAge)} ago`}</small>
        </div>
      </div>

      <div className={styles.commandGrid}>
        <CommandCard title="Relay outgoing" accent="relay">
          <DataRow label="Command" value={relay?.device.pattern ?? "—"} />
          <DataRow label="Route" value={relay?.device.route || "—"} />
          <DataRow label="Activity" value={relay?.device.activity ?? "—"} />
          <DataRow label="Sequence" value={relay?.seq ?? "—"} />
          <DataRow label="Confidence" value={relay?.device.conf || "—"} relayOnly />
          <DataRow label="Arrival ID" value={relay?.device.arrivalId ?? "—"} relayOnly />
          <DataRow
            label="Command age"
            value={relay ? formatAge(Math.max(0, clock - relay.device.ts)) : "—"}
            relayOnly
          />
        </CommandCard>

        <CommandCard title="Board received" accent="board">
          <DataRow label="Command" value={board.command?.pattern ?? "—"} />
          <DataRow label="Route" value={board.command?.route || "—"} />
          <DataRow label="Activity" value={board.command?.activity ?? "—"} />
          <DataRow label="Sequence" value={board.command?.seq ?? "—"} />
          <DataRow label="Decision" value={board.command?.disposition.replaceAll("_", " ") ?? "—"} />
          <DataRow label="Sequence gap" value={board.sequenceGap ?? "None"} />
          <DataRow label="Received" value={boardAge === null ? "—" : `${formatAge(boardAge)} ago`} />
        </CommandCard>
      </div>

      <div className={styles.healthGrid}>
        <section className={styles.healthCard} aria-labelledby="activity-health-title">
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>Independent state gate</p>
              <h3 id="activity-health-title">Activity</h3>
            </div>
            <StatusPill value={verdict.activity} />
          </div>
          <DataRow label="Relay" value={`${relay?.device.activity ?? "—"} · ${relay?.device.activitySeq ?? "—"}`} />
          <DataRow label="Board" value={`${board.activity?.activity ?? "—"} · ${board.activity?.seq ?? "—"}`} />
          <DataRow label="Service override" value={board.activity ? (board.activity.override ? "On" : "Off") : "—"} />
        </section>

        <section className={styles.healthCard} aria-labelledby="transport-health-title">
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>Board network path</p>
              <h3 id="transport-health-title">Transport</h3>
            </div>
            <StatusPill value={board.transport} />
          </div>
          <DataRow label="Last board error" value={board.lastError ?? "None"} />
          <DataRow label="USB" value={connection === "connected" ? "Connected" : "Not connected"} />
          <DataRow label="Board event" value={boardAge === null ? "—" : `${formatAge(boardAge)} ago`} />
        </section>

        <section className={styles.healthCard} aria-labelledby="endpoint-health-title">
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.kicker}>Live endpoint evidence</p>
              <h3 id="endpoint-health-title">/api/state</h3>
            </div>
            <StatusPill value={relayOnline === null ? "checking" : relayOnline ? "online" : "offline"} />
          </div>
          <DataRow label="Response" value={evidence?.status ? `HTTP ${evidence.status}` : "—"} />
          <DataRow label="Duration" value={evidence ? `${evidence.durationMs} ms` : "—"} />
          <DataRow label="Received" value={endpointAge === null ? "—" : `${formatAge(endpointAge)} ago`} />
          <DataRow label="Vercel request" value={evidence?.vercelId ?? "Not provided"} />
          {evidence?.error && <p className={styles.endpointError}>{evidence.error}</p>}
        </section>
      </div>

      <section className={styles.events} aria-labelledby="recent-relay-events-title">
        <div className={styles.cardHeader}>
          <div>
            <p className={styles.kicker}>Newest first · board confirmed</p>
            <h3 id="recent-relay-events-title">Recent relay events</h3>
          </div>
          <span className={styles.eventCount}>{board.events.length}/20</span>
        </div>
        <ol aria-label="Recent relay events">
          {board.events.length === 0 ? (
            <li className={styles.emptyEvent}>Waiting for RELAY lines over USB</li>
          ) : (
            board.events.map((event, index) => (
              <li key={`${event.receivedAt}-${event.kind}-${index}`}>
                <time>{formatAge(Math.max(0, clock - event.receivedAt))} ago</time>
                <span>{eventLabel(event)}</span>
              </li>
            ))
          )}
        </ol>
      </section>
    </section>
  );
}

function CommandCard({
  title,
  accent,
  children,
}: {
  title: string;
  accent: "relay" | "board";
  children: React.ReactNode;
}) {
  return (
    <section className={styles.commandCard} data-accent={accent}>
      <div className={styles.cardHeader}>
        <div>
          <p className={styles.kicker}>{accent === "relay" ? "Redis snapshot" : "USB serial"}</p>
          <h2>{title}</h2>
        </div>
        <span className={styles.sourceMark}>{accent === "relay" ? "R" : "B"}</span>
      </div>
      <dl>{children}</dl>
    </section>
  );
}

function DataRow({
  label,
  value,
  relayOnly = false,
}: {
  label: string;
  value: React.ReactNode;
  relayOnly?: boolean;
}) {
  return (
    <div className={styles.dataRow}>
      <dt>{label}</dt>
      <dd>
        {value}
        {relayOnly && <small>Relay only</small>}
      </dd>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  return <span className={styles.statusPill} data-value={value}>{value.replaceAll("_", " ")}</span>;
}

function formatAge(milliseconds: number): string {
  if (milliseconds < 1_000) return `${Math.round(milliseconds)} ms`;
  return `${(milliseconds / 1_000).toFixed(milliseconds < 10_000 ? 1 : 0)} s`;
}

function eventLabel(event: BoardRelayEvent): string {
  switch (event.kind) {
    case "command":
      return `Command ${event.seq}: ${event.pattern}${event.route ? ` ${event.route}` : ""} · ${event.disposition.replaceAll("_", " ")}`;
    case "gap":
      return `Command ${event.seq}: missed ${event.missed}`;
    case "activity":
      return `Activity ${event.seq}: ${event.activity}${event.override ? " · override" : ""}`;
    case "activity_baseline":
      return `Activity baseline ${event.seq}: ${event.activity}`;
    case "activity_invalidated":
      return `Activity invalidated · ${event.detail}`;
    case "baseline_reset":
      return `Command baseline reset · ${event.detail}`;
    case "wifi_connected":
      return `Wi-Fi connected · ${event.rssi} dBm`;
    case "wifi_disconnected":
      return `Wi-Fi disconnected · retry ${event.retryMs} ms`;
    case "http_error":
      return `Relay HTTP ${event.status}`;
    case "rejected":
      return `Relay response rejected · ${event.detail}`;
    case "poll_failed":
      return `Relay poll failed · retry ${event.retryMs} ms`;
  }
}
