import { describe, expect, it, vi } from "vitest";

import { runReadiness } from "./demo-readiness.mjs";

const COMPLETE_PULL = {
  seq: 9,
  pattern: "NUMBER",
  route: "88",
  dest: "Clapham Common",
  conf: "high",
  arrivalId: 1,
  ts: 1784419200123,
  activity: "STILL",
  activitySeq: 4,
  activityTs: 1784419199000,
};

const COMPLETE_STATE = {
  seq: 9,
  device: { ...COMPLETE_PULL, seq: undefined },
  detector: { event: "TARGET_ARRIVED" },
  telemetry: { playing: "NUMBER" },
};

function response({ status = 200, contentType = "text/html", body = "<html></html>" }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => (name.toLowerCase() === "content-type" ? contentType : null) },
    text: vi.fn(async () => (typeof body === "string" ? body : JSON.stringify(body))),
    json: vi.fn(async () => {
      if (body instanceof Error) throw body;
      return body;
    }),
  };
}

function deployment(overrides = {}) {
  return {
    "/": response({ body: "<html>Relay monitor</html>" }),
    "/capture": response({ body: "<html>Camera</html>" }),
    "/output": response({ body: "<html>Physical output</html>" }),
    "/api/pull": response({ contentType: "application/json", body: COMPLETE_PULL }),
    "/api/state": response({ contentType: "application/json", body: COMPLETE_STATE }),
    ...overrides,
  };
}

function mockFetch(routes) {
  return vi.fn(async (input) => {
    const path = new URL(String(input)).pathname;
    const value = routes[path];
    if (value instanceof Error) throw value;
    if (!value) return response({ status: 404 });
    return value;
  });
}

describe("runReadiness", () => {
  it("passes a complete deployed demo surface using GET requests only", async () => {
    const fetchImpl = mockFetch(deployment());

    const report = await runReadiness({
      baseUrl: "https://demo.example",
      fetchImpl,
    });

    expect(report.ok).toBe(true);
    expect(report.checks.every((check) => check.ok)).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(fetchImpl.mock.calls.every(([, init]) => init.method === "GET")).toBe(true);
  });

  it("reports the output route and activity contract as separate failures", async () => {
    const pullWithoutActivity = { ...COMPLETE_PULL };
    delete pullWithoutActivity.activity;
    delete pullWithoutActivity.activitySeq;
    delete pullWithoutActivity.activityTs;

    const report = await runReadiness({
      baseUrl: "https://demo.example",
      fetchImpl: mockFetch(
        deployment({
          "/output": response({ status: 404, body: "<html>404</html>" }),
          "/api/pull": response({ contentType: "application/json", body: pullWithoutActivity }),
        }),
      ),
    });

    expect(report.ok).toBe(false);
    expect(report.checks.find((check) => check.id === "output")).toMatchObject({ ok: false });
    expect(report.checks.find((check) => check.id === "activity-contract")).toMatchObject({
      ok: false,
    });
  });

  it("turns malformed pull JSON into a contract failure instead of throwing", async () => {
    const report = await runReadiness({
      baseUrl: "https://demo.example",
      fetchImpl: mockFetch(
        deployment({
          "/api/pull": response({
            contentType: "application/json",
            body: new SyntaxError("bad JSON"),
          }),
        }),
      ),
    });

    expect(report.ok).toBe(false);
    expect(report.checks.find((check) => check.id === "pull-contract")).toMatchObject({
      ok: false,
    });
  });

  it("reports a network failure without skipping the remaining routes", async () => {
    const fetchImpl = mockFetch(
      deployment({
        "/capture": new Error("offline"),
      }),
    );

    const report = await runReadiness({ baseUrl: "https://demo.example", fetchImpl });

    expect(report.ok).toBe(false);
    expect(report.checks.find((check) => check.id === "capture")).toMatchObject({
      ok: false,
      detail: "network error: offline",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(5);
  });
});
