// The ESP32 wearable polls this to learn the current relay state.
// force-dynamic + no-store + open CORS so the (non-browser, but also any
// browser debug) poller always gets fresh, uncached JSON. Grounding §5.
import { pullState } from "../../lib/redis";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
};

export async function GET() {
  const state = await pullState();
  return Response.json(state, { headers: CORS });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Cache-Control": "no-store",
    },
  });
}
