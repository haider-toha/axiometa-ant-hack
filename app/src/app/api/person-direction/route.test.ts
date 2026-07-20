import { describe, expect, it, vi } from "vitest";
import { createPersonDirectionPost } from "@/app/api/person-direction/route";

const validBody = {
  frame_b64: "jpeg",
  person_box: [0.2, 0.1, 0.8, 0.9],
};

function request(body: unknown): Request {
  return new Request("http://localhost/api/person-direction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("createPersonDirectionPost", () => {
  it("returns a validated direction", async () => {
    const post = createPersonDirectionPost(async () => ({
      obstructing: true,
      direction: "right",
      confidence: "high",
    }));

    const response = await post(request(validBody));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", direction: "right" });
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("rejects invalid JSON without calling the decider", async () => {
    const decide = vi.fn();
    const post = createPersonDirectionPost(decide);
    const response = await post(
      new Request("http://localhost/api/person-direction", {
        method: "POST",
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    expect(decide).not.toHaveBeenCalled();
  });

  it("rejects invalid input without calling the decider", async () => {
    const decide = vi.fn();
    const response = await createPersonDirectionPost(decide)(request({ frame_b64: "jpeg" }));

    expect(response.status).toBe(400);
    expect(decide).not.toHaveBeenCalled();
  });

  it.each([
    [
      { obstructing: false, direction: "none", confidence: "high" },
      { status: "clear", direction: null },
    ],
    [
      { obstructing: true, direction: "left", confidence: "low" },
      { status: "unavailable", direction: null, reason: "low_confidence" },
    ],
  ])("returns closed non-guidance results", async (decision, expected) => {
    const response = await createPersonDirectionPost(async () => decision)(request(validBody));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expected);
  });

  it("returns 502 for invalid model output", async () => {
    const response = await createPersonDirectionPost(async () => ({
      obstructing: true,
      direction: "ahead",
      confidence: "high",
    }))(request(validBody));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      status: "unavailable",
      direction: null,
      reason: "invalid_response",
    });
  });

  it("returns 503 for model failures", async () => {
    const response = await createPersonDirectionPost(async () => {
      throw new Error("network down");
    })(request(validBody));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      status: "unavailable",
      direction: null,
      reason: "model_error",
    });
  });

  it("classifies timeouts without returning a direction", async () => {
    const response = await createPersonDirectionPost(async () => {
      const error = new Error("request timed out");
      error.name = "APIConnectionTimeoutError";
      throw error;
    })(request(validBody));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      status: "unavailable",
      direction: null,
      reason: "timeout",
    });
  });
});
