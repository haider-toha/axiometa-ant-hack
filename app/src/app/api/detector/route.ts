// The phone POSTs the raw detector state here every frame (~2Hz) so the debug
// screen can show what the vision pipeline sees — separate from /api/event,
// which only fires on a command change.
import { writeDetector } from "@/lib/redis";
import { coerceDetector } from "@/lib/coerce";
import { CORS, preflight } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await writeDetector(coerceDetector(body));
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400, headers: CORS });
  }
  return Response.json({ ok: true }, { headers: CORS });
}

export function OPTIONS() {
  return preflight();
}
