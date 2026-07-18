// Text-to-speech: speak a short reply back through the phone.
// Grounding §2: POST /v1/text-to-speech/{voice}, model eleven_flash_v2_5,
// premade voice "George" (JBFqnCBsd6RMkjVDRZzb). MP3 streamed as audio/mpeg.
export const dynamic = "force-dynamic";

const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // "George" premade — safe public hardcode

export async function POST(req: Request) {
  const { text } = await req.json();
  if (typeof text !== "string" || text.trim().length === 0) {
    return Response.json(
      { error: "`text` (non-empty string) is required" },
      { status: 400 },
    );
  }

  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, model_id: "eleven_flash_v2_5" }),
    },
  );
  if (!r.ok || !r.body) {
    return Response.json({ error: await r.text() }, { status: 502 });
  }

  // Pass the MP3 bytes straight through to the browser <audio> element.
  return new Response(r.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
