import { describe, expect, it } from "vitest";
import {
  MAX_PERSON_FRAME_BASE64_LENGTH,
  normalizePersonDecision,
  parsePersonDirectionRequest,
} from "@/lib/person-direction";

describe("parsePersonDirectionRequest", () => {
  it("accepts a frame and normalized person box", () => {
    expect(
      parsePersonDirectionRequest({
        frame_b64: "jpeg",
        person_box: [0.2, 0.1, 0.8, 0.9],
      }),
    ).toEqual({
      ok: true,
      value: { frameB64: "jpeg", personBox: [0.2, 0.1, 0.8, 0.9] },
    });
  });

  it.each([
    null,
    {},
    { frame_b64: "", person_box: [0.2, 0.1, 0.8, 0.9] },
    { frame_b64: "jpeg" },
    { frame_b64: "jpeg", person_box: [0.2, 0.1, 0.8] },
    { frame_b64: "jpeg", person_box: [0.8, 0.1, 0.2, 0.9] },
    { frame_b64: "jpeg", person_box: [0.2, 0.9, 0.8, 0.1] },
    { frame_b64: "jpeg", person_box: [-0.1, 0.1, 0.8, 0.9] },
    { frame_b64: "jpeg", person_box: [0.2, 0.1, 1.1, 0.9] },
    { frame_b64: "jpeg", person_box: [0.2, Number.NaN, 0.8, 0.9] },
  ])("rejects malformed input %#", (input) => {
    expect(parsePersonDirectionRequest(input)).toEqual({
      ok: false,
      response: {
        status: "unavailable",
        direction: null,
        reason: "invalid_request",
      },
    });
  });

  it("rejects oversized frames", () => {
    expect(
      parsePersonDirectionRequest({
        frame_b64: "x".repeat(MAX_PERSON_FRAME_BASE64_LENGTH + 1),
        person_box: [0.2, 0.1, 0.8, 0.9],
      }).ok,
    ).toBe(false);
  });
});

describe("normalizePersonDecision", () => {
  it("accepts a high-confidence clear-side decision", () => {
    expect(
      normalizePersonDecision({
        obstructing: true,
        direction: "left",
        confidence: "high",
      }),
    ).toEqual({ status: "ok", direction: "left" });
  });

  it("accepts a high-confidence non-obstructing decision", () => {
    expect(
      normalizePersonDecision({
        obstructing: false,
        direction: "none",
        confidence: "high",
      }),
    ).toEqual({ status: "clear", direction: null });
  });

  it("fails closed on low confidence", () => {
    expect(
      normalizePersonDecision({
        obstructing: true,
        direction: "right",
        confidence: "low",
      }),
    ).toEqual({
      status: "unavailable",
      direction: null,
      reason: "low_confidence",
    });
  });

  it.each([
    null,
    {},
    { obstructing: true, direction: "none", confidence: "high" },
    { obstructing: false, direction: "left", confidence: "high" },
    { obstructing: true, direction: "ahead", confidence: "high" },
    { obstructing: true, direction: "left", confidence: "high", extra: true },
  ])("fails closed on invalid model output %#", (output) => {
    expect(normalizePersonDecision(output)).toEqual({
      status: "unavailable",
      direction: null,
      reason: "invalid_response",
    });
  });
});
