// Speech-to-text: browser posts a recorded audio blob → ElevenLabs Scribe v2.
// Grounding §1: POST /v1/speech-to-text, header xi-api-key, multipart form
// { file, model_id: "scribe_v2" }, transcript returned in the `text` field.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const inForm = await req.formData();
  const file = inForm.get("file");
  if (!(file instanceof File)) {
    return Response.json(
      { transcript: "", error: "multipart field `file` (audio) is required" },
      { status: 400 },
    );
  }

  const out = new FormData();
  out.append("file", file);
  out.append("model_id", "scribe_v2"); // current 2026 batch STT model

  // NOTE: no Content-Type header — fetch sets the multipart boundary itself.
  const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
    body: out,
  });
  if (!r.ok) {
    return Response.json(
      { transcript: "", error: await r.text() },
      { status: 502 },
    );
  }

  const j = (await r.json()) as { text?: string };
  return Response.json({ transcript: j.text ?? "" });
}
