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

  // The ONLY gate. `isCloudPattern` widened to admit LEFT/RIGHT/AHEAD when they
  // were appended to CLOUD_PATTERNS, so navigation needed no change here.
  //
  // Do NOT add an activity/pattern consistency check — no "reject LEFT unless
  // activity is MOVING", no "reject BUS unless STILL". It reads like defence in
  // depth and is the opposite. The board already owns that decision in
  // `acceptsRelayCommand()`, and it has to, because it is the half that still
  // works with the Wi-Fi down. A second gate here can only ever agree (dead
  // code) or disagree — and when it disagrees the relay silently swallows a
  // command the board would have accepted, with the 400 landing on the phone
  // where nobody is looking. Activity also arrives on its own independently
  // versioned channel with a 120 s lease, so "current activity" at the moment of
  // an /api/event POST is a different value from the one the board will gate
  // against 300 ms later. The relay is a faithful pipe.
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
