// The phone POSTs its STILL/MOVING interaction phase here.
//
// Deliberately NOT /api/event. Activity is versioned independently of the
// command, and an activity write must never bump command `seq` or refresh
// command `ts` — AGENTS.md: "Activity freshness is independent from command
// delivery." Sebastian left the route name to us: "The exact web setter route is
// not a firmware dependency. Only the /api/pull response shape matters to the
// board."
//
// Every POST bumps activitySeq, including a heartbeat carrying an unchanged
// value. That is the design: the board's 120 s activity lease is refreshed only
// when the counter advances.
import { writeActivity } from "@/lib/redis";
import { CORS, preflight } from "@/lib/cors";
import { isUserActivity } from "@/lib/contract";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400, headers: CORS });
  }

  const activity = (body as { activity?: unknown } | null)?.activity;
  // Rejected, not defaulted. normActivity() defaults on the READ path because
  // the board needs a well-formed field even when Redis is empty; here the phone
  // is the only client and a typo must surface as a 400 rather than silently
  // resolving to MOVING and closing the bus gate mid-demo.
  if (!isUserActivity(activity)) {
    return Response.json(
      { error: 'activity must be "STILL" or "MOVING"' },
      { status: 400, headers: CORS },
    );
  }

  const written = await writeActivity(activity);
  return Response.json(written, { headers: CORS });
}

export function OPTIONS() {
  return preflight();
}
