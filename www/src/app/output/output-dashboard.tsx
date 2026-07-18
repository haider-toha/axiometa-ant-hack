import { Cable, Unplug } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { OutputTelemetry } from "@/lib/output-telemetry";
import { cn } from "@/lib/utils";

import styles from "./output-monitor.module.css";

export type ConnectionStatus =
  | "checking"
  | "unsupported"
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type OutputHistoryEntry = {
  id: number;
  leftHz: number;
  rightHz: number;
};

export type OutputDashboardProps = {
  connection: ConnectionStatus;
  telemetry: OutputTelemetry | null;
  fresh: boolean;
  history: OutputHistoryEntry[];
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
};

const CONNECTION_LABEL: Record<ConnectionStatus, string> = {
  checking: "Checking browser",
  unsupported: "Unsupported browser",
  disconnected: "Disconnected",
  connecting: "Connecting",
  connected: "USB connected",
  error: "Connection error",
};

export function OutputDashboard({
  connection,
  telemetry,
  fresh,
  history,
  error,
  onConnect,
  onDisconnect,
}: OutputDashboardProps) {
  const connected = connection === "connected";
  const canDisconnect = connected || connection === "connecting";

  return (
    <main className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>ESP32 physical channels</p>
          <h1 className={styles.title}>Output monitor</h1>
        </div>

        <div className={styles.connectionControls}>
          <span className={styles.connectionStatus} data-connection={connection}>
            <span className={styles.statusDot} aria-hidden="true" />
            {CONNECTION_LABEL[connection]}
          </span>
          {canDisconnect ? (
            <Button type="button" variant="outline" size="lg" onClick={onDisconnect}>
              <Unplug data-icon="inline-start" />
              Disconnect
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              onClick={onConnect}
              disabled={connection === "checking" || connection === "unsupported"}
            >
              <Cable data-icon="inline-start" />
              Connect device
            </Button>
          )}
        </div>
      </header>

      {connection === "unsupported" && (
        <p className={styles.notice} role="status">
          Open this page in desktop Chrome to connect over USB.
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <section className={styles.channels} aria-label="Physical output channels">
        <OutputChannel
          side="left"
          port="P1"
          frequency={telemetry?.leftHz ?? null}
          connected={connected}
          fresh={fresh}
        />
        <OutputChannel
          side="right"
          port="P3"
          frequency={telemetry?.rightHz ?? null}
          connected={connected}
          fresh={fresh}
        />
      </section>

      <p className="sr-only" aria-live="polite">
        {outputAnnouncement(connection, telemetry, fresh)}
      </p>

      <PulseHistory history={history} />
    </main>
  );
}

function OutputChannel({
  side,
  port,
  frequency,
  connected,
  fresh,
}: {
  side: "left" | "right";
  port: string;
  frequency: number | null;
  connected: boolean;
  fresh: boolean;
}) {
  const live = connected && fresh && frequency !== null;
  const active = live && frequency > 0;
  const state = !connected
    ? "UNKNOWN"
    : frequency === null
      ? "WAITING"
      : !fresh
        ? "STALE"
        : active
          ? "ACTIVE"
          : "IDLE";
  const frequencyLabel =
    frequency === null
      ? "Not available"
      : `${frequency.toLocaleString("en-GB")} Hz${fresh ? "" : " last"}`;
  const label = side === "left" ? "Left" : "Right";

  return (
    <article className={cn(styles.channel, styles[side])}>
      <div className={styles.channelHeader}>
        <div>
          <p className={styles.port}>{port}</p>
          <h2>{label}</h2>
        </div>
        <span className={styles.channelState} data-state={state.toLowerCase()}>
          {state}
        </span>
      </div>

      <div className={styles.actuatorStage}>
        <div
          className={styles.actuator}
          data-active={String(active)}
          data-testid={`${side}-actuator`}
          aria-label={`${label} output ${state.toLowerCase()}`}
        >
          <span className={styles.actuatorCore} aria-hidden="true" />
        </div>
      </div>

      <p className={styles.frequency} aria-label={`${label} output frequency`}>
        {frequencyLabel}
      </p>
    </article>
  );
}

function outputAnnouncement(
  connection: ConnectionStatus,
  telemetry: OutputTelemetry | null,
  fresh: boolean,
): string {
  if (connection !== "connected") return "Physical outputs unavailable.";
  if (!telemetry) return "Connected. Waiting for physical output state.";
  if (!fresh) return "Physical output state is stale.";
  return `Left ${telemetry.leftHz > 0 ? `${telemetry.leftHz} hertz` : "off"}. Right ${telemetry.rightHz > 0 ? `${telemetry.rightHz} hertz` : "off"}.`;
}

function PulseHistory({ history }: { history: OutputHistoryEntry[] }) {
  return (
    <section className={styles.history} aria-label="Recent output transitions">
      <div className={styles.historyHeader}>
        <h2>Pulse history</h2>
        <span>{history.length === 0 ? "Waiting for output" : "Oldest to newest"}</span>
      </div>
      <div className={styles.historyTrack}>
        {history.length === 0 ? (
          <span className={styles.emptyHistory} aria-hidden="true" />
        ) : (
          history.map((entry) => (
            <span
              className={styles.historyEvent}
              key={entry.id}
              aria-label={`Left ${entry.leftHz > 0 ? `${entry.leftHz} hertz` : "off"}, right ${entry.rightHz > 0 ? `${entry.rightHz} hertz` : "off"}`}
            >
              <span data-side="left" data-active={String(entry.leftHz > 0)} />
              <span data-side="right" data-active={String(entry.rightHz > 0)} />
            </span>
          ))
        )}
      </div>
    </section>
  );
}
