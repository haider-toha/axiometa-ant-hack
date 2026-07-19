export const OUTPUT_TIMELINE_WINDOW_MS = 5_000;

export type OutputTransition = {
  id: number;
  leftHz: number;
  rightHz: number;
  upMs: number;
  receivedAt: number;
};

export type OutputTimelineSegment = {
  id: string;
  startPercent: number;
  widthPercent: number;
  durationMs: number;
};

export type OutputTimeline = {
  left: OutputTimelineSegment[];
  right: OutputTimelineSegment[];
};

type Channel = "left" | "right";
type Interval = { startMs: number; endMs: number };

export function buildOutputTimeline(
  transitions: OutputTransition[],
  nowUpMs: number,
  traceEndUpMs: number,
  windowMs = OUTPUT_TIMELINE_WINDOW_MS,
): OutputTimeline {
  return {
    left: buildChannelSegments(transitions, "left", nowUpMs, traceEndUpMs, windowMs),
    right: buildChannelSegments(transitions, "right", nowUpMs, traceEndUpMs, windowMs),
  };
}

export function pruneOutputTransitions(
  transitions: OutputTransition[],
  nowUpMs: number,
  windowMs = OUTPUT_TIMELINE_WINDOW_MS,
): OutputTransition[] {
  if (transitions.length <= 1) return transitions;

  const windowStartMs = nowUpMs - windowMs;
  const firstInside = transitions.findIndex(({ upMs }) => upMs >= windowStartMs);

  if (firstInside === -1) return transitions.slice(-1);
  if (firstInside === 0) return transitions;
  return transitions.slice(firstInside - 1);
}

function buildChannelSegments(
  transitions: OutputTransition[],
  channel: Channel,
  nowUpMs: number,
  traceEndUpMs: number,
  windowMs: number,
): OutputTimelineSegment[] {
  if (windowMs <= 0) return [];

  const frequencyKey = channel === "left" ? "leftHz" : "rightHz";
  const intervals: Interval[] = [];

  for (const [index, transition] of transitions.entries()) {
    if (transition[frequencyKey] <= 0) continue;

    const next = transitions[index + 1];
    const endMs = Math.min(next?.upMs ?? traceEndUpMs, nowUpMs);
    if (endMs <= transition.upMs) continue;

    const previous = intervals.at(-1);
    if (previous && previous.endMs >= transition.upMs) {
      previous.endMs = Math.max(previous.endMs, endMs);
    } else {
      intervals.push({ startMs: transition.upMs, endMs });
    }
  }

  const windowStartMs = nowUpMs - windowMs;

  return intervals.flatMap(({ startMs, endMs }) => {
    const visibleStartMs = Math.max(startMs, windowStartMs);
    const visibleEndMs = Math.min(endMs, nowUpMs);
    if (visibleEndMs <= visibleStartMs) return [];

    const durationMs = visibleEndMs - visibleStartMs;
    return [
      {
        id: `${channel}-${startMs}-${endMs}`,
        startPercent: ((visibleStartMs - windowStartMs) / windowMs) * 100,
        widthPercent: (durationMs / windowMs) * 100,
        durationMs,
      },
    ];
  });
}
