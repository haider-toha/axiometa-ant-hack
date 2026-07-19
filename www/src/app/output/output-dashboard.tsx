import { Cable, Unplug } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { OutputTelemetry } from "@/lib/output-telemetry";
import { cn } from "@/lib/utils";

import styles from "./output-monitor.module.css";
import {
  buildOutputTimeline,
  type OutputTimelineSegment,
  type OutputTransition,
} from "./output-timeline";

export const OUTPUT_AFTERGLOW_MS = 750;

export type ConnectionStatus =
  | "checking"
  | "unsupported"
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type OutputDashboardProps = {
  connection: ConnectionStatus;
  telemetry: OutputTelemetry | null;
  fresh: boolean;
  history: OutputTransition[];
  clock: number;
  timelineNowUpMs: number | null;
  traceEndUpMs: number | null;
  recentPulseEndedAt: { left: number | null; right: number | null };
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
  clock,
  timelineNowUpMs,
  traceEndUpMs,
  recentPulseEndedAt,
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
          clock={clock}
          recentPulseEndedAt={recentPulseEndedAt.left}
        />
        <OutputChannel
          side="right"
          port="P3"
          frequency={telemetry?.rightHz ?? null}
          connected={connected}
          fresh={fresh}
          clock={clock}
          recentPulseEndedAt={recentPulseEndedAt.right}
        />
      </section>

      <p className="sr-only" aria-live="polite">
        {outputAnnouncement(connection, telemetry, fresh)}
      </p>

      <PulseTimeline
        history={history}
        timelineNowUpMs={timelineNowUpMs}
        traceEndUpMs={traceEndUpMs}
      />
    </main>
  );
}

function OutputChannel({
  side,
  port,
  frequency,
  connected,
  fresh,
  clock,
  recentPulseEndedAt,
}: {
  side: "left" | "right";
  port: string;
  frequency: number | null;
  connected: boolean;
  fresh: boolean;
  clock: number;
  recentPulseEndedAt: number | null;
}) {
  const live = connected && fresh && frequency !== null;
  const active = live && frequency > 0;
  const recent =
    live &&
    frequency === 0 &&
    recentPulseEndedAt !== null &&
    clock >= recentPulseEndedAt &&
    clock - recentPulseEndedAt <= OUTPUT_AFTERGLOW_MS;
  const state = !connected
    ? "UNKNOWN"
    : frequency === null
      ? "WAITING"
      : !fresh
        ? "STALE"
        : active
          ? "ACTIVE"
          : recent
            ? "RECENT"
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
          data-recent={String(recent)}
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

function PulseTimeline({
  history,
  timelineNowUpMs,
  traceEndUpMs,
}: {
  history: OutputTransition[];
  timelineNowUpMs: number | null;
  traceEndUpMs: number | null;
}) {
  const timeline =
    timelineNowUpMs === null || traceEndUpMs === null
      ? { left: [], right: [] }
      : buildOutputTimeline(history, timelineNowUpMs, traceEndUpMs);
  const empty = timeline.left.length === 0 && timeline.right.length === 0;
  const summary = `${summarizeLane("Left", timeline.left)} ${summarizeLane("Right", timeline.right)}`;

  return (
    <section
      className={styles.timeline}
      aria-label="Five-second output timeline"
      aria-describedby="output-timeline-summary"
    >
      <div className={styles.timelineHeader}>
        <div>
          <p className={styles.timelineEyebrow}>Physical output trace</p>
          <h2>Last 5 seconds</h2>
        </div>
        <span>Duration proportional</span>
      </div>
      <div className={styles.timelineBody}>
        <TimelineLane port="P1" label="LEFT" side="left" segments={timeline.left} />
        <TimelineLane port="P3" label="RIGHT" side="right" segments={timeline.right} />
        {empty && <span className={styles.timelineEmpty}>Waiting for a pulse</span>}
        <div className={styles.timelineScale} aria-hidden="true">
          <span>-5 s</span>
          <span>NOW</span>
        </div>
      </div>
      <p className="sr-only" id="output-timeline-summary">
        {summary}
      </p>
    </section>
  );
}

function TimelineLane({
  port,
  label,
  side,
  segments,
}: {
  port: string;
  label: string;
  side: "left" | "right";
  segments: OutputTimelineSegment[];
}) {
  return (
    <div className={styles.timelineLane} data-side={side}>
      <div className={styles.timelineLabel}>
        <span>{port}</span>
        <strong>{label}</strong>
      </div>
      <div className={styles.timelineTrack} aria-hidden="true">
        {segments.map((segment) => (
          <span
            className={styles.timelinePulse}
            key={segment.id}
            style={{
              left: `${segment.startPercent}%`,
              width: `${segment.widthPercent}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function summarizeLane(label: string, segments: OutputTimelineSegment[]): string {
  if (segments.length === 0) return `${label}: no pulses.`;

  const durationMs = Math.round(
    segments.reduce((total, segment) => total + segment.durationMs, 0),
  );
  return `${label}: ${segments.length} ${segments.length === 1 ? "pulse" : "pulses"}, ${durationMs.toLocaleString("en-GB")} milliseconds.`;
}
