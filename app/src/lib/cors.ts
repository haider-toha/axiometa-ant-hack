// Open CORS + no-store on every relay endpoint. The ESP32 poller and the
// browser debug screen both read the same state from the same place, uncached.

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
} as const;

export function preflight(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Cache-Control": "no-store",
    },
  });
}
