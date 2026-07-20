import type { UserActivity } from "@/lib/contract";
import type { MotionBearing } from "@/lib/motion";
import type { PersonBox, PersonDirection } from "@/lib/person-direction";

/**
 * Instant "route around" direction from a person's box centroid.
 *
 * The Claude person-direction endpoint answers the same question but with a
 * 2–4 s round trip and a fail-closed "low confidence" path that discards
 * ambiguous cases. That is fine as a smart refinement — it is not fine as
 * the ONLY signal, because the wearer feels nothing on the frame a person
 * appears in. This helper is the same shape as the bus centroid path
 * (bearingFromBox → LEFT/RIGHT/AHEAD): purely deterministic, resolves in
 * one frame, and safe to render immediately.
 *
 * The rule is inversion: person on the LEFT third of the frame means the
 * wearer should turn RIGHT to pass, and vice versa. A dead-centre person
 * biases to right (a consistent arbitrary choice matters more than which
 * side, and Claude may override on the next tick).
 */
export function invertBoxBearing(bearing: MotionBearing | null): MotionBearing | null {
  if (bearing === null) return null;
  if (bearing === "left") return "right";
  if (bearing === "right") return "left";
  return "right";
}

export interface PersonGuidanceState {
  direction: PersonDirection | null;
  reversalCandidate: PersonDirection | null;
  reversalCount: number;
}

export const PERSON_TARGET_MIN_IOU = 0.3;

export function initialPersonGuidanceState(): PersonGuidanceState {
  return { direction: null, reversalCandidate: null, reversalCount: 0 };
}

export function clearPersonGuidance(
  state: PersonGuidanceState,
): PersonGuidanceState {
  void state;
  return initialPersonGuidanceState();
}

export function acceptPersonDirection(
  state: PersonGuidanceState,
  incoming: PersonDirection,
): PersonGuidanceState {
  if (state.direction === null || state.direction === incoming) {
    return {
      direction: incoming,
      reversalCandidate: null,
      reversalCount: 0,
    };
  }

  const reversalCount = state.reversalCandidate === incoming ? state.reversalCount + 1 : 1;
  if (reversalCount >= 2) {
    return {
      direction: incoming,
      reversalCandidate: null,
      reversalCount: 0,
    };
  }

  return {
    ...state,
    reversalCandidate: incoming,
    reversalCount,
  };
}

export function personGuidanceEligible(
  activity: UserActivity,
  hasBus: boolean,
  hasPerson: boolean,
): boolean {
  return activity === "MOVING" && !hasBus && hasPerson;
}

export function personTargetMatches(a: PersonBox, b: PersonBox): boolean {
  const intersectionWidth = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0]));
  const intersectionHeight = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const intersection = intersectionWidth * intersectionHeight;
  const areaA = (a[2] - a[0]) * (a[3] - a[1]);
  const areaB = (b[2] - b[0]) * (b[3] - b[1]);
  const union = areaA + areaB - intersection;
  return union > 0 && intersection / union >= PERSON_TARGET_MIN_IOU;
}

export function personResultIsCurrent(
  requestGeneration: number,
  currentGeneration: number,
  activity: UserActivity,
  hasBus: boolean,
  requestPersonBox: PersonBox,
  currentPersonBox: PersonBox | null,
): boolean {
  return (
    requestGeneration === currentGeneration &&
    personGuidanceEligible(activity, hasBus, currentPersonBox !== null) &&
    currentPersonBox !== null &&
    personTargetMatches(requestPersonBox, currentPersonBox)
  );
}
