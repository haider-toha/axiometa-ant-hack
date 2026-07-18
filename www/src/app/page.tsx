"use client";

// Debug screen — the demo's "show, don't tell". Polls /api/state and renders
// the current device command, the raw detector state, and device telemetry.
// Without this, the wrist buzz is invisible and judges take it on faith.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { DebugState } from "@/lib/contract";

const POLL_MS = 500;
const EMPTY = "–";

export default function DebugScreen() {
  const [state, setState] = useState<DebugState | null>(null);
  const [ageMs, setAgeMs] = useState<number | null>(null);
  const [online, setOnline] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      // In-flight guard: never stack requests if the network stalls.
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        const data = (await res.json()) as DebugState;
        if (!cancelled) {
          setState(data);
          setAgeMs(data.device.ts ? Date.now() - data.device.ts : null);
          setOnline(true);
        }
      } catch {
        if (!cancelled) setOnline(false);
      } finally {
        inFlight.current = false;
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const cmd = state?.device;
  const det = state?.detector;
  const tel = state?.telemetry;

  return (
    <main className="flex-1 bg-background px-6 py-8 font-sans text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-medium tracking-tight">Relay monitor</h1>
          <div className="flex items-center gap-3">
            <StatusDot online={online} />
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/capture" />}
            >
              Open camera
            </Button>
          </div>
        </header>

        {/* Current command — the one focal point */}
        <section className="rounded-lg border border-border bg-card p-4 text-card-foreground">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Current command</span>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              seq {state?.seq ?? EMPTY}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3">
            <span className="font-mono text-xl font-medium">{cmd?.pattern ?? EMPTY}</span>
            {cmd?.pattern === "NUMBER" && (
              <span className="font-mono text-xl font-medium tabular-nums text-primary">
                {cmd.route}
              </span>
            )}
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Destination" value={cmd?.dest || EMPTY} />
            <Field label="Confidence" value={cmd?.conf || EMPTY} />
            <Field label="Arrival" value={cmd?.arrivalId ?? EMPTY} num />
            <Field
              label="Age"
              value={ageMs === null ? EMPTY : `${(ageMs / 1000).toFixed(1)}s`}
              num
            />
          </dl>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <Panel title="Detector">
            <Field label="Event" value={det?.event ?? EMPTY} num />
            <Field label="Present" value={String(det?.present ?? false)} num />
            <Field label="Confidence" value={det ? det.confidence.toFixed(2) : EMPTY} num />
            <Field label="Arrival" value={det?.arrivalId ?? EMPTY} num />
            <Field label="Route" value={det?.route || EMPTY} num />
            <Field label="Destination" value={det?.destination || EMPTY} />
            <Field label="Reading conf" value={det?.readingConf || EMPTY} num />
            <Field label="Votes" value={det?.votes?.length ? det.votes.join(", ") : EMPTY} num />
            <Field label="In view" value={det?.labels?.length ? det.labels.join(", ") : EMPTY} />
            <Field label="Target bearing" value={det?.targetBearing || EMPTY} num />
            <Field
              label="Hazards"
              value={
                det?.hazards?.length
                  ? det.hazards.map((h) => `${h.kind} ${h.bearing}`).join(", ")
                  : EMPTY
              }
            />
          </Panel>

          <Panel title="Device telemetry">
            <Field label="Playing" value={tel?.playing ?? EMPTY} num />
            <Field label="Band rms" value={tel ? tel.bandRms.toFixed(1) : EMPTY} num />
            <Field label="Peak hz" value={tel?.peakHz ?? EMPTY} num />
            <Field label="Mod idx" value={tel ? tel.modIdx.toFixed(2) : EMPTY} num />
            <Field label="Trend" value={tel?.trend ?? EMPTY} num />
            <Field label="Distance" value={tel?.tofMm ? `${tel.tofMm} mm` : EMPTY} num />
            <Field label="Uptime" value={tel?.upMs ? `${Math.floor(tel.upMs / 1000)}s` : EMPTY} num />
            <Field label="Rssi" value={tel?.rssi ? `${tel.rssi} dBm` : EMPTY} num />
          </Panel>
        </div>
      </div>
    </main>
  );
}

function StatusDot({ online }: { online: boolean }) {
  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground">
      <span
        className="inline-block size-2 rounded-full"
        style={{ background: online ? "var(--success)" : "var(--destructive)" }}
      />
      {online ? "Polling" : "Offline"}
    </span>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 text-card-foreground">
      <h2 className="mb-3 text-sm font-medium">{title}</h2>
      <dl className="grid grid-cols-2 gap-3">{children}</dl>
    </section>
  );
}

function Field({
  label,
  value,
  num = false,
}: {
  label: string;
  value: React.ReactNode;
  num?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`truncate text-sm ${num ? "font-mono tabular-nums" : ""}`}>{value}</dd>
    </div>
  );
}
