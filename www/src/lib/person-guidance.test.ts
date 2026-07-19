import { describe, expect, it } from "vitest";
import {
  acceptPersonDirection,
  clearPersonGuidance,
  initialPersonGuidanceState,
  personGuidanceEligible,
  personResultIsCurrent,
  personTargetMatches,
} from "@/lib/person-guidance";

describe("person guidance eligibility", () => {
  it.each([
    { activity: "MOVING", hasBus: false, hasPerson: false, expected: false },
    { activity: "MOVING", hasBus: false, hasPerson: true, expected: true },
    { activity: "MOVING", hasBus: true, hasPerson: false, expected: false },
    { activity: "MOVING", hasBus: true, hasPerson: true, expected: false },
    { activity: "STILL", hasBus: false, hasPerson: false, expected: false },
    { activity: "STILL", hasBus: false, hasPerson: true, expected: false },
    { activity: "STILL", hasBus: true, hasPerson: false, expected: false },
    { activity: "STILL", hasBus: true, hasPerson: true, expected: false },
  ] as const)(
    "$activity with bus=$hasBus person=$hasPerson resolves person guidance to $expected",
    ({ activity, hasBus, hasPerson, expected }) => {
      expect(personGuidanceEligible(activity, hasBus, hasPerson)).toBe(expected);
    },
  );

  it("rejects stale or no-longer-eligible results", () => {
    const requestBox = [0.1, 0.1, 0.4, 0.9] as const;
    const currentBox = [0.11, 0.1, 0.41, 0.9] as const;
    expect(personResultIsCurrent(4, 5, "MOVING", false, requestBox, currentBox)).toBe(false);
    expect(personResultIsCurrent(5, 5, "STILL", false, requestBox, currentBox)).toBe(false);
    expect(personResultIsCurrent(5, 5, "MOVING", true, requestBox, currentBox)).toBe(false);
    expect(personResultIsCurrent(5, 5, "MOVING", false, requestBox, null)).toBe(false);
    expect(personResultIsCurrent(5, 5, "MOVING", false, requestBox, currentBox)).toBe(true);
  });

  it("rejects a result when a different person replaced the request target", () => {
    const personA = [0.05, 0.1, 0.35, 0.9] as const;
    const personB = [0.65, 0.1, 0.95, 0.9] as const;
    expect(personResultIsCurrent(5, 5, "MOVING", false, personA, personB)).toBe(false);
  });

  it("tolerates detector jitter on the same person box", () => {
    expect(personTargetMatches([0.1, 0.1, 0.4, 0.9], [0.12, 0.08, 0.42, 0.92])).toBe(true);
    expect(personTargetMatches([0.05, 0.1, 0.35, 0.9], [0.65, 0.1, 0.95, 0.9])).toBe(false);
  });
});

describe("person guidance stabilization", () => {
  it("applies the first direction immediately", () => {
    const state = acceptPersonDirection(initialPersonGuidanceState(), "left");
    expect(state).toEqual({
      direction: "left",
      reversalCandidate: null,
      reversalCount: 0,
    });
  });

  it("requires two matching results to reverse direction", () => {
    let state = acceptPersonDirection(initialPersonGuidanceState(), "left");
    state = acceptPersonDirection(state, "right");
    expect(state.direction).toBe("left");
    expect(state.reversalCandidate).toBe("right");
    expect(state.reversalCount).toBe(1);

    state = acceptPersonDirection(state, "right");
    expect(state).toEqual({
      direction: "right",
      reversalCandidate: null,
      reversalCount: 0,
    });
  });

  it("cancels a pending reversal when the stable direction returns", () => {
    let state = acceptPersonDirection(initialPersonGuidanceState(), "left");
    state = acceptPersonDirection(state, "right");
    state = acceptPersonDirection(state, "left");
    expect(state).toEqual({
      direction: "left",
      reversalCandidate: null,
      reversalCount: 0,
    });
  });

  it("clears every remembered direction", () => {
    let state = acceptPersonDirection(initialPersonGuidanceState(), "left");
    state = acceptPersonDirection(state, "right");
    expect(clearPersonGuidance(state)).toEqual(initialPersonGuidanceState());
  });

  it("clears a moving instruction completely when the user becomes still", () => {
    const moving = acceptPersonDirection(initialPersonGuidanceState(), "left");
    const still = clearPersonGuidance(moving);

    expect(still.direction).toBeNull();
    expect(still.reversalCandidate).toBeNull();
    expect(still.reversalCount).toBe(0);
  });
});
