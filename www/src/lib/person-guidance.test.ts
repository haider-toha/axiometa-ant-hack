import { describe, expect, it } from "vitest";
import {
  acceptPersonDirection,
  clearPersonGuidance,
  initialPersonGuidanceState,
  personGuidanceEligible,
  personResultIsCurrent,
} from "@/lib/person-guidance";

describe("person guidance eligibility", () => {
  it("allows a person only while moving and without a bus", () => {
    expect(personGuidanceEligible("MOVING", false, true)).toBe(true);
    expect(personGuidanceEligible("STILL", false, true)).toBe(false);
    expect(personGuidanceEligible("MOVING", true, true)).toBe(false);
    expect(personGuidanceEligible("MOVING", false, false)).toBe(false);
  });

  it("rejects stale or no-longer-eligible results", () => {
    expect(personResultIsCurrent(4, 5, "MOVING", false, true)).toBe(false);
    expect(personResultIsCurrent(5, 5, "STILL", false, true)).toBe(false);
    expect(personResultIsCurrent(5, 5, "MOVING", true, true)).toBe(false);
    expect(personResultIsCurrent(5, 5, "MOVING", false, false)).toBe(false);
    expect(personResultIsCurrent(5, 5, "MOVING", false, true)).toBe(true);
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
});
