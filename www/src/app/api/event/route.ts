// The phone POSTs a translated command here (edge-triggered — only on change).
// This is the single place that turns detector meaning into a device pattern.
import { writeCommand } from "@/lib/redis";
import { CORS, preflight } from "@/lib/cors";
import { isCloudPattern, ROUTE_RE, type Conf, type EventRequest } from "@/lib/contract";
import { num, str } from "@/lib/coerce";

export const dynamic = "force-dynamic";

function normConf(v: unknown): Conf {
  return v === "high" || v === "low" ? v : "";
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400, headers: CORS });
  }

  const b = body as Partial<EventRequest>;
  if (!isCloudPattern(b.pattern)) {
    return Response.json({ error: "unknown pattern" }, { status: 400, headers: CORS });
  }

  const arrivalId = num(b.arrivalId);
  let event: EventRequest = {
    pattern: b.pattern,
    route: str(b.route),
    dest: str(b.dest),
    conf: normConf(b.conf),
    arrivalId,
  };

  // A NUMBER whose route isn't 1–3 digits is undeliverable by the quinary
  // encoder. Surface it as UNKNOWN so the failure shows on the debug screen
  // instead of a plausible-wrong number on the wrist.
  if (event.pattern === "NUMBER" && !ROUTE_RE.test(event.route)) {
    event = { pattern: "UNKNOWN", route: "", dest: "", conf: "low", arrivalId };
  }

  const seq = await writeCommand(event);
  return Response.json({ seq, stored: event.pattern }, { headers: CORS });
}

export function OPTIONS() {
  return preflight();
}
