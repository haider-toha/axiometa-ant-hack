import type { CloudPattern, DebugState, UserActivity } from "@/lib/contract";

export type BoardActivity = UserActivity | "UNKNOWN";
export type BoardPattern = CloudPattern | "INVALID";
export type BoardCommandDisposition =
  | "unchanged"
  | "baseline"
  | "accepted"
  | "suppressed"
  | "no_output"
  | "route_mismatch"
  | "low_confidence"
  | "rejected";

export type BoardCommandReceipt = {
  kind: "command";
  disposition: BoardCommandDisposition;
  pattern: BoardPattern;
  seq: number;
  activity: BoardActivity;
  route: string;
  receivedAt: number;
};

export type BoardActivityReceipt = {
  kind: "activity";
  activity: BoardActivity;
  seq: number;
  override: boolean;
  receivedAt: number;
};

export type BoardRelayEvent =
  | BoardCommandReceipt
  | BoardActivityReceipt
  | { kind: "gap"; seq: number; missed: number; receivedAt: number }
  | { kind: "activity_baseline"; activity: BoardActivity; seq: number; receivedAt: number }
  | { kind: "activity_invalidated"; detail: string; receivedAt: number }
  | { kind: "baseline_reset"; detail: string; receivedAt: number }
  | { kind: "wifi_connected"; ip: string; rssi: number; receivedAt: number }
  | { kind: "wifi_disconnected"; retryMs: number; receivedAt: number }
  | { kind: "http_error"; status: number; receivedAt: number }
  | { kind: "rejected"; detail: string; receivedAt: number }
  | { kind: "poll_failed"; retryMs: number; receivedAt: number };

export type BoardRelayState = {
  command: BoardCommandReceipt | null;
  activity: BoardActivityReceipt | null;
  transport: "unknown" | "connected" | "disconnected" | "degraded";
  lastError: string | null;
  lastEventAt: number | null;
  sequenceGap: number | null;
  sequenceGapSeq: number | null;
  events: BoardRelayEvent[];
};

export type RelayVerdict = {
  kind:
    | "no_usb"
    | "relay_offline"
    | "waiting"
    | "pending"
    | "missed"
    | "mismatch"
    | BoardCommandDisposition;
  label: string;
  tone: "neutral" | "positive" | "warning" | "destructive";
  detail: string;
  activity: "unknown" | "matched" | "behind" | "mismatch";
};

const COMMAND_RE =
  /^RELAY command=(unchanged|baseline|accepted|suppressed|no_output|route_mismatch|low_confidence|rejected) pattern=(NONE|BUS|NUMBER|WAIT|UNKNOWN|ERROR|LEFT|RIGHT|AHEAD|INVALID) seq=(\d+) activity=(MOVING|STILL|UNKNOWN) route=(.*)$/;
const GAP_RE = /^RELAY command=gap seq=(\d+) missed=(\d+)$/;
const ACTIVITY_RE = /^RELAY activity=(MOVING|STILL|UNKNOWN) seq=(\d+) override=(0|1)$/;
const ACTIVITY_BASELINE_RE = /^RELAY activity=baseline seq=(\d+) value=(MOVING|STILL|UNKNOWN)$/;
const ACTIVITY_INVALIDATED_RE = /^RELAY activity=invalidated(?: (.*))?$/;
const BASELINE_RESET_RE = /^RELAY command=baseline_reset(?: (.*))?$/;
const WIFI_CONNECTED_RE = /^RELAY wifi=connected ip=([^ ]+) rssi=(-?\d+)$/;
const WIFI_DISCONNECTED_RE = /^RELAY wifi=disconnected retry_ms=(\d+)$/;
const HTTP_RE = /^RELAY http=(-?\d+)$/;
const REJECTED_RE = /^RELAY rejected=(.+)$/;
const POLL_FAILED_RE = /^RELAY poll=failed retry_ms=(\d+)$/;

export class RelaySerialDecoder {
  private buffer = "";
  private discardingOverlongLine = false;

  constructor(private readonly maxLineLength = 2_048) {}

  push(chunk: string, receivedAt: number): BoardRelayEvent[] {
    const events: BoardRelayEvent[] = [];
    let start = 0;

    for (let index = 0; index < chunk.length; index += 1) {
      if (chunk[index] !== "\n") continue;
      const segment = chunk.slice(start, index);
      if (this.discardingOverlongLine) {
        this.discardingOverlongLine = false;
      } else if (this.buffer.length + segment.length <= this.maxLineLength) {
        const event = parseRelayLine(`${this.buffer}${segment}`.replace(/\r$/, ""), receivedAt);
        if (event) events.push(event);
      }
      this.buffer = "";
      start = index + 1;
    }

    const remainder = chunk.slice(start);
    if (!this.discardingOverlongLine) {
      if (this.buffer.length + remainder.length > this.maxLineLength) {
        this.buffer = "";
        this.discardingOverlongLine = true;
      } else {
        this.buffer += remainder;
      }
    }
    return events;
  }

  reset() {
    this.buffer = "";
    this.discardingOverlongLine = false;
  }
}

function parseRelayLine(line: string, receivedAt: number): BoardRelayEvent | null {
  let match = COMMAND_RE.exec(line);
  if (match) {
    return {
      kind: "command",
      disposition: match[1] as BoardCommandDisposition,
      pattern: match[2] as BoardPattern,
      seq: Number(match[3]),
      activity: match[4] as BoardActivity,
      route: match[5],
      receivedAt,
    };
  }
  match = GAP_RE.exec(line);
  if (match) return { kind: "gap", seq: Number(match[1]), missed: Number(match[2]), receivedAt };
  match = ACTIVITY_RE.exec(line);
  if (match) {
    return {
      kind: "activity",
      activity: match[1] as BoardActivity,
      seq: Number(match[2]),
      override: match[3] === "1",
      receivedAt,
    };
  }
  match = ACTIVITY_BASELINE_RE.exec(line);
  if (match) {
    return {
      kind: "activity_baseline",
      seq: Number(match[1]),
      activity: match[2] as BoardActivity,
      receivedAt,
    };
  }
  match = ACTIVITY_INVALIDATED_RE.exec(line);
  if (match) return { kind: "activity_invalidated", detail: match[1] ?? "invalidated", receivedAt };
  match = BASELINE_RESET_RE.exec(line);
  if (match) return { kind: "baseline_reset", detail: match[1] ?? "reset", receivedAt };
  match = WIFI_CONNECTED_RE.exec(line);
  if (match) return { kind: "wifi_connected", ip: match[1], rssi: Number(match[2]), receivedAt };
  match = WIFI_DISCONNECTED_RE.exec(line);
  if (match) return { kind: "wifi_disconnected", retryMs: Number(match[1]), receivedAt };
  match = HTTP_RE.exec(line);
  if (match) return { kind: "http_error", status: Number(match[1]), receivedAt };
  match = REJECTED_RE.exec(line);
  if (match) return { kind: "rejected", detail: match[1], receivedAt };
  match = POLL_FAILED_RE.exec(line);
  if (match) return { kind: "poll_failed", retryMs: Number(match[1]), receivedAt };
  return null;
}

export function initialBoardRelayState(): BoardRelayState {
  return {
    command: null,
    activity: null,
    transport: "unknown",
    lastError: null,
    lastEventAt: null,
    sequenceGap: null,
    sequenceGapSeq: null,
    events: [],
  };
}

export function reduceBoardRelayState(
  state: BoardRelayState,
  events: BoardRelayEvent[],
): BoardRelayState {
  let next = state;
  for (const event of events) {
    next = {
      ...next,
      lastEventAt: event.receivedAt,
      events: [event, ...next.events].slice(0, 20),
    };
    switch (event.kind) {
      case "command":
        next = {
          ...next,
          command: event,
          sequenceGap: next.sequenceGapSeq === event.seq ? next.sequenceGap : null,
          sequenceGapSeq: next.sequenceGapSeq === event.seq ? next.sequenceGapSeq : null,
        };
        break;
      case "gap":
        next = { ...next, sequenceGap: event.missed, sequenceGapSeq: event.seq };
        break;
      case "activity":
        next = { ...next, activity: event };
        break;
      case "wifi_connected":
        next = { ...next, transport: "connected", lastError: null };
        break;
      case "wifi_disconnected":
        next = {
          ...next,
          transport: "disconnected",
          lastError: `Wi-Fi disconnected; retry in ${event.retryMs} ms`,
        };
        break;
      case "http_error":
        next = { ...next, transport: "degraded", lastError: `Relay HTTP ${event.status}` };
        break;
      case "rejected":
        next = { ...next, transport: "degraded", lastError: `Relay response rejected: ${event.detail}` };
        break;
      case "poll_failed":
        next = {
          ...next,
          transport: "degraded",
          lastError: `Relay poll failed; retry in ${event.retryMs} ms`,
        };
        break;
      case "baseline_reset":
        next = {
          ...next,
          command: null,
          activity: null,
          sequenceGap: null,
          sequenceGapSeq: null,
        };
        break;
      case "activity_baseline":
      case "activity_invalidated":
        break;
    }
  }
  return next;
}

export function compareRelayState({
  usbConnected,
  relayOnline,
  relay,
  board,
  now,
}: {
  usbConnected: boolean;
  relayOnline: boolean;
  relay: DebugState | null;
  board: BoardRelayState;
  now: number;
}): RelayVerdict {
  const activity = compareActivity(relay, board);
  if (!usbConnected) return verdict("no_usb", "NO USB", "neutral", "Connect the ESP32 to confirm receipt.", activity);
  if (!relayOnline) return verdict("relay_offline", "RELAY OFFLINE", "destructive", "/api/state is not responding.", activity);
  if (!relay) return verdict("waiting", "WAITING", "neutral", "Waiting for relay intent and a board receipt.", activity);
  if (!board.command) {
    const age = Math.max(0, now - relay.device.ts);
    return age <= 2_000
      ? verdict("pending", "PENDING", "warning", `Relay sequence ${relay.seq} has not reached the board yet.`, activity)
      : verdict("missed", "MISSED", "destructive", `Relay sequence ${relay.seq} is more than two seconds old.`, activity);
  }
  if (board.sequenceGap !== null) {
    return verdict("missed", "MISSED", "destructive", `Board reported ${board.sequenceGap} missed sequence${board.sequenceGap === 1 ? "" : "s"}.`, activity);
  }

  const relaySeq = relay.seq;
  const boardSeq = board.command.seq;
  if (relaySeq > boardSeq) {
    const age = Math.max(0, now - relay.device.ts);
    return age <= 2_000
      ? verdict("pending", "PENDING", "warning", `Relay sequence ${relaySeq} has not reached the board yet.`, activity)
      : verdict("missed", "MISSED", "destructive", `Relay sequence ${relaySeq} is more than two seconds old.`, activity);
  }
  if (relaySeq !== boardSeq) {
    return verdict("mismatch", "MISMATCH", "destructive", `Relay is at sequence ${relaySeq}; board reported ${boardSeq}.`, activity);
  }
  if (
    relay.device.pattern !== board.command.pattern ||
    (relay.device.route ?? "") !== (board.command.route ?? "")
  ) {
    return verdict("mismatch", "MISMATCH", "destructive", "Pattern or route differs at the same sequence.", activity);
  }

  const disposition = board.command.disposition;
  const positive = disposition === "accepted" || disposition === "no_output" || disposition === "unchanged";
  const neutral = disposition === "baseline" || disposition === "suppressed";
  return verdict(
    disposition,
    disposition.toUpperCase(),
    positive ? "positive" : neutral ? "neutral" : "warning",
    `Board confirmed sequence ${boardSeq} with ${disposition.replaceAll("_", " ")}.`,
    activity,
  );
}

function compareActivity(
  relay: DebugState | null,
  board: BoardRelayState,
): RelayVerdict["activity"] {
  if (!relay || !board.activity) return "unknown";
  if (relay.device.activitySeq > board.activity.seq) return "behind";
  if (
    relay.device.activitySeq !== board.activity.seq ||
    relay.device.activity !== board.activity.activity
  ) {
    return "mismatch";
  }
  return "matched";
}

function verdict(
  kind: RelayVerdict["kind"],
  label: string,
  tone: RelayVerdict["tone"],
  detail: string,
  activity: RelayVerdict["activity"],
): RelayVerdict {
  return { kind, label, tone, detail, activity };
}
