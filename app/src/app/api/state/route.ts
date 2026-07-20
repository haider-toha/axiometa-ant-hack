// The debug screen polls this (~500ms): device command + detector + telemetry
// in one blob, all from the same Redis state the device reads.
import { readDebugState } from "@/lib/redis";
import { CORS, preflight } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await readDebugState();
  return Response.json(state, { headers: CORS });
}

export function OPTIONS() {
  return preflight();
}
