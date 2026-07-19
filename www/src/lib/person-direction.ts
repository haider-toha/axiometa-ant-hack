export const MAX_PERSON_FRAME_BASE64_LENGTH = 2 * 1024 * 1024;

export type PersonBox = readonly [number, number, number, number];
export type PersonDirection = "left" | "right";
export type PersonDirectionReason =
  | "invalid_request"
  | "timeout"
  | "model_error"
  | "invalid_response"
  | "low_confidence";

export type PersonDirectionResponse =
  | { status: "ok"; direction: PersonDirection }
  | { status: "clear"; direction: null }
  | {
      status: "unavailable";
      direction: null;
      reason: PersonDirectionReason;
    };

export interface PersonModelDecision {
  obstructing: boolean;
  direction: PersonDirection | "none";
  confidence: "high" | "low";
}

const INVALID_REQUEST: PersonDirectionResponse = {
  status: "unavailable",
  direction: null,
  reason: "invalid_request",
};

const INVALID_RESPONSE: PersonDirectionResponse = {
  status: "unavailable",
  direction: null,
  reason: "invalid_response",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPersonBox(value: unknown): value is PersonBox {
  if (!Array.isArray(value) || value.length !== 4) return false;
  if (!value.every((coordinate) => Number.isFinite(coordinate) && coordinate >= 0 && coordinate <= 1)) {
    return false;
  }
  return value[0] < value[2] && value[1] < value[3];
}

export function parsePersonDirectionRequest(
  value: unknown,
):
  | { ok: true; value: { frameB64: string; personBox: PersonBox } }
  | { ok: false; response: PersonDirectionResponse } {
  if (!isRecord(value)) return { ok: false, response: INVALID_REQUEST };

  const frame = value.frame_b64;
  if (
    typeof frame !== "string" ||
    frame.length === 0 ||
    frame.length > MAX_PERSON_FRAME_BASE64_LENGTH ||
    !isPersonBox(value.person_box)
  ) {
    return { ok: false, response: INVALID_REQUEST };
  }

  return {
    ok: true,
    value: { frameB64: frame, personBox: [...value.person_box] as PersonBox },
  };
}

export function normalizePersonDecision(value: unknown): PersonDirectionResponse {
  if (!isRecord(value)) return INVALID_RESPONSE;
  if (
    Object.keys(value).length !== 3 ||
    typeof value.obstructing !== "boolean" ||
    (value.direction !== "left" && value.direction !== "right" && value.direction !== "none") ||
    (value.confidence !== "high" && value.confidence !== "low")
  ) {
    return INVALID_RESPONSE;
  }

  if (value.confidence === "low") {
    return {
      status: "unavailable",
      direction: null,
      reason: "low_confidence",
    };
  }

  if (value.obstructing && (value.direction === "left" || value.direction === "right")) {
    return { status: "ok", direction: value.direction };
  }
  if (!value.obstructing && value.direction === "none") {
    return { status: "clear", direction: null };
  }
  return INVALID_RESPONSE;
}
