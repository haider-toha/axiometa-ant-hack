import { describe, expect, it } from "vitest";

import {
  buildOutputTimeline,
  pruneOutputTransitions,
  type OutputTransition,
} from "@/app/output/output-timeline";

function transition(
  id: number,
  upMs: number,
  leftHz: number,
  rightHz: number,
): OutputTransition {
  return { id, upMs, leftHz, rightHz, receivedAt: 50_000 + upMs };
}

describe("buildOutputTimeline", () => {
  it("positions a short simultaneous pulse by its real duration", () => {
    const transitions = [
      transition(1, 5_000, 0, 0),
      transition(2, 8_000, 2_350, 3_050),
      transition(3, 8_120, 0, 0),
    ];

    const timeline = buildOutputTimeline(transitions, 10_000, 10_000);

    expect(timeline.left).toHaveLength(1);
    expect(timeline.right).toHaveLength(1);
    expect(timeline.left[0]).toMatchObject({
      startPercent: 60,
      durationMs: 120,
    });
    expect(timeline.left[0].widthPercent).toBeCloseTo(2.4);
    expect(timeline.right[0]).toMatchObject({
      startPercent: 60,
      durationMs: 120,
    });
    expect(timeline.right[0].widthPercent).toBeCloseTo(2.4);
  });

  it("clips a pulse that begins before the five-second window", () => {
    const transitions = [
      transition(1, 0, 0, 0),
      transition(2, 500, 2_350, 0),
      transition(3, 2_000, 0, 0),
    ];

    const timeline = buildOutputTimeline(transitions, 6_000, 6_000);

    expect(timeline.left).toEqual([
      expect.objectContaining({
        startPercent: 0,
        widthPercent: 20,
        durationMs: 1_000,
      }),
    ]);
  });

  it("caps an open pulse at the latest fresh board time", () => {
    const transitions = [
      transition(1, 7_000, 0, 0),
      transition(2, 8_000, 2_350, 0),
    ];

    const timeline = buildOutputTimeline(transitions, 10_000, 8_500);

    expect(timeline.left).toEqual([
      expect.objectContaining({
        startPercent: 60,
        widthPercent: 10,
        durationMs: 500,
      }),
    ]);
  });

  it("merges touching channel intervals split by the other channel", () => {
    const transitions = [
      transition(1, 7_000, 0, 0),
      transition(2, 8_000, 2_350, 0),
      transition(3, 8_050, 2_350, 3_050),
      transition(4, 8_120, 0, 3_050),
      transition(5, 8_200, 0, 0),
    ];

    const timeline = buildOutputTimeline(transitions, 10_000, 10_000);

    expect(timeline.left).toHaveLength(1);
    expect(timeline.left[0].durationMs).toBe(120);
    expect(timeline.right).toHaveLength(1);
    expect(timeline.right[0].durationMs).toBe(150);
  });
});

describe("pruneOutputTransitions", () => {
  it("keeps the five-second window and one state before it", () => {
    const transitions = [
      transition(1, 0, 0, 0),
      transition(2, 1_000, 2_350, 0),
      transition(3, 2_000, 0, 0),
      transition(4, 6_000, 0, 3_050),
    ];

    expect(pruneOutputTransitions(transitions, 7_000).map(({ id }) => id)).toEqual([
      2, 3, 4,
    ]);
  });

  it("keeps only the latest state when every transition is older", () => {
    const transitions = [
      transition(1, 100, 2_350, 0),
      transition(2, 200, 0, 0),
    ];

    expect(pruneOutputTransitions(transitions, 10_000)).toEqual([transitions[1]]);
  });
});
