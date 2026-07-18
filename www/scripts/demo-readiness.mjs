import { pathToFileURL } from "node:url";

const CLOUD_PATTERNS = new Set(["NONE", "BUS", "NUMBER", "WAIT", "UNKNOWN", "ERROR"]);
const ACTIVITIES = new Set(["MOVING", "STILL"]);

function check(id, label, ok, detail) {
  return { id, label, ok, detail };
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function commandContract(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    isNonNegativeInteger(value.seq) &&
    CLOUD_PATTERNS.has(value.pattern) &&
    typeof value.route === "string" &&
    typeof value.dest === "string" &&
    (value.conf === "" || value.conf === "low" || value.conf === "high") &&
    isNonNegativeInteger(value.arrivalId) &&
    isNonNegativeInteger(value.ts)
  );
}

function activityContract(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    ACTIVITIES.has(value.activity) &&
    isNonNegativeInteger(value.activitySeq) &&
    isPositiveInteger(value.activityTs)
  );
}

function debugStateContract(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    isNonNegativeInteger(value.seq) &&
    value.device !== null &&
    typeof value.device === "object" &&
    value.detector !== null &&
    typeof value.detector === "object" &&
    value.telemetry !== null &&
    typeof value.telemetry === "object"
  );
}

function errorDetail(error) {
  return error instanceof Error ? error.message : String(error);
}

async function get(fetchImpl, baseUrl, path) {
  return fetchImpl(new URL(path, baseUrl), {
    method: "GET",
    headers: { Accept: path.startsWith("/api/") ? "application/json" : "text/html" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
}

async function checkPage(fetchImpl, baseUrl, id, label, path) {
  try {
    const response = await get(fetchImpl, baseUrl, path);
    const contentType = response.headers.get("content-type") ?? "";
    const ok = response.ok && contentType.includes("text/html");
    return check(
      id,
      label,
      ok,
      ok ? `HTTP ${response.status}` : `HTTP ${response.status}, content-type ${contentType || "missing"}`,
    );
  } catch (error) {
    return check(id, label, false, `network error: ${errorDetail(error)}`);
  }
}

async function checkPull(fetchImpl, baseUrl) {
  let response;
  try {
    response = await get(fetchImpl, baseUrl, "/api/pull");
  } catch (error) {
    const detail = `network error: ${errorDetail(error)}`;
    return [
      check("pull", "Relay pull route", false, detail),
      check("pull-contract", "Relay command contract", false, detail),
      check("activity-contract", "Relay activity contract", false, detail),
    ];
  }

  const routeOk = response.ok && (response.headers.get("content-type") ?? "").includes("json");
  const checks = [
    check("pull", "Relay pull route", routeOk, `HTTP ${response.status}`),
  ];

  let body;
  try {
    body = await response.json();
  } catch (error) {
    const detail = `invalid JSON: ${errorDetail(error)}`;
    checks.push(check("pull-contract", "Relay command contract", false, detail));
    checks.push(check("activity-contract", "Relay activity contract", false, detail));
    return checks;
  }

  checks.push(
    check(
      "pull-contract",
      "Relay command contract",
      routeOk && commandContract(body),
      commandContract(body) ? "command fields present" : "missing or invalid command fields",
    ),
  );
  checks.push(
    check(
      "activity-contract",
      "Relay activity contract",
      routeOk && activityContract(body),
      activityContract(body)
        ? `${body.activity} seq=${body.activitySeq}`
        : "requires activity, activitySeq, and positive activityTs",
    ),
  );
  return checks;
}

async function checkState(fetchImpl, baseUrl) {
  let response;
  try {
    response = await get(fetchImpl, baseUrl, "/api/state");
  } catch (error) {
    const detail = `network error: ${errorDetail(error)}`;
    return [
      check("state", "Debug state route", false, detail),
      check("state-contract", "Debug state contract", false, detail),
    ];
  }

  const routeOk = response.ok && (response.headers.get("content-type") ?? "").includes("json");
  const checks = [check("state", "Debug state route", routeOk, `HTTP ${response.status}`)];
  try {
    const body = await response.json();
    checks.push(
      check(
        "state-contract",
        "Debug state contract",
        routeOk && debugStateContract(body),
        debugStateContract(body)
          ? "device, detector, and telemetry present"
          : "missing device, detector, or telemetry",
      ),
    );
  } catch (error) {
    checks.push(
      check("state-contract", "Debug state contract", false, `invalid JSON: ${errorDetail(error)}`),
    );
  }
  return checks;
}

export async function runReadiness({ baseUrl, fetchImpl = globalThis.fetch }) {
  const normalizedBaseUrl = new URL(baseUrl).toString();
  const [home, capture, output, pull, state] = await Promise.all([
    checkPage(fetchImpl, normalizedBaseUrl, "home", "Relay monitor page", "/"),
    checkPage(fetchImpl, normalizedBaseUrl, "capture", "Phone capture page", "/capture"),
    checkPage(fetchImpl, normalizedBaseUrl, "output", "Laptop output page", "/output"),
    checkPull(fetchImpl, normalizedBaseUrl),
    checkState(fetchImpl, normalizedBaseUrl),
  ]);
  const checks = [home, capture, output, ...pull, ...state];
  return { baseUrl: normalizedBaseUrl, ok: checks.every((item) => item.ok), checks };
}

function parseBaseUrl(argv) {
  const index = argv.indexOf("--base-url");
  if (index >= 0) {
    const value = argv[index + 1];
    if (!value) throw new Error("--base-url requires a value");
    return value;
  }
  return process.env.DEMO_BASE_URL ?? "https://bus-stop-awareness.vercel.app";
}

async function main() {
  let report;
  try {
    report = await runReadiness({ baseUrl: parseBaseUrl(process.argv.slice(2)) });
  } catch (error) {
    console.error(`Demo readiness could not start: ${errorDetail(error)}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Demo readiness: ${report.baseUrl}`);
  for (const item of report.checks) {
    console.log(`${item.ok ? "PASS" : "FAIL"}  ${item.label}: ${item.detail}`);
  }
  console.log(report.ok ? "READY" : "NOT READY");
  process.exitCode = report.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
