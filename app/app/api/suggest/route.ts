// Generate 3 candidate replies for the deafblind user to pick from on the
// wearable. Model: claude-haiku-4-5 (grounding §7 correction b — haiku, NOT
// sonnet). Reads the heard utterance + optional rolling memory of past replies.
import { anthropic, HAIKU, parseModelJson, textOf } from "../../lib/anthropic";
import { setSuggestions, getMemory } from "../../lib/redis";
import { KEYWORD_MAX } from "../../lib/contract";

export const dynamic = "force-dynamic";

const SYSTEM =
  "You help a deafblind user reply to what was just said to them. Propose 3 short " +
  "candidate replies, ordered most-likely first. Each reply: 1-3 words, letters a-z " +
  `and spaces only, no punctuation, max ${KEYWORD_MAX} characters. ` +
  'Reply ONLY as JSON: {"suggestions":["...","...","..."]}.';

export async function POST(req: Request) {
  const { verbatim } = await req.json();
  if (typeof verbatim !== "string" || verbatim.trim().length === 0) {
    return Response.json(
      { error: "`verbatim` (non-empty string) is required" },
      { status: 400 },
    );
  }

  const memory = await getMemory();
  const userContent =
    memory.length > 0
      ? `They heard: "${verbatim}"\nThe user's recent replies (memory), for style: ${memory.join(", ")}`
      : `They heard: "${verbatim}"`;

  const msg = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 256,
    system: SYSTEM,
    messages: [
      { role: "user", content: userContent },
      { role: "assistant", content: "{" }, // prefill forces a JSON start
    ],
  });

  const parsed = parseModelJson<{ suggestions?: unknown }>(textOf(msg), "{");

  const suggestions = (
    Array.isArray(parsed?.suggestions) ? parsed.suggestions : []
  )
    .filter((s: unknown): s is string => typeof s === "string")
    .map((s) => s.toLowerCase().replace(/[^a-z ]/g, "").trim().slice(0, KEYWORD_MAX))
    .filter((s) => s.length > 0)
    .slice(0, 3);

  if (suggestions.length === 0) {
    return Response.json(
      { error: "model returned no usable suggestions" },
      { status: 502 },
    );
  }

  await setSuggestions(suggestions);
  return Response.json({ suggestions });
}
