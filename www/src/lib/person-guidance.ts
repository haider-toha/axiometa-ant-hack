import type { UserActivity } from "@/lib/contract";
import type { PersonDirection } from "@/lib/person-direction";

export interface PersonGuidanceState {
  direction: PersonDirection | null;
  reversalCandidate: PersonDirection | null;
  reversalCount: number;
}

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

export function personResultIsCurrent(
  requestGeneration: number,
  currentGeneration: number,
  activity: UserActivity,
  hasBus: boolean,
  hasPerson: boolean,
): boolean {
  return (
    requestGeneration === currentGeneration &&
    personGuidanceEligible(activity, hasBus, hasPerson)
  );
}
