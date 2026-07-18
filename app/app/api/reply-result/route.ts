// The phone polls this to learn which reply the user picked on the wearable.
// takeChoice() returns the choice exactly once (atomic GETDEL), then null.
import { takeChoice } from "../../lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const choice = await takeChoice();
  return Response.json({ choice }, { headers: { "Cache-Control": "no-store" } });
}
