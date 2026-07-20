// The ESP32 wearable polls this every ~300ms. It POSTs its telemetry as the
// request body and receives the current command in the same round trip.
// GET stays implemented (empty telemetry) so the endpoint is curl-able.
import { readCommand, writeTelemetry } from "@/lib/redis";
import { coerceTelemetry } from "@/lib/coerce";
import { CORS, preflight } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function GET() {
  const cmd = await readCommand();
  return Response.json(cmd, { headers: CORS });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await writeTelemetry(coerceTelemetry(body));
  } catch {
    // A bad telemetry body must never starve the device of its command.
  }
  const cmd = await readCommand();
  return Response.json(cmd, { headers: CORS });
}

export function OPTIONS() {
  return preflight();
}
