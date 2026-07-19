import type { UserActivity } from "@/lib/contract";
import type { PersonBox, PersonDirection } from "@/lib/person-direction";

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
