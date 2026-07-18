// Condense a noisy transcript into ONE tactile keyword for the wearable.
// Model: claude-haiku-4-5 (grounding §3). JSON hardened via assistant-prefill
// + try/catch + fence-strip fallback. max_tokens 256 (verbatim is unbounded).
import { anthropic, HAIKU, parseModelJson, textOf } from "../../lib/anthropic";
import { KEYWORD_MAX } from "../../lib/contract";

export const dynamic = "force-dynamic";

const SYSTEM =
  "You clean a noisy speech transcript, then condense it to ONE tactile keyword " +
  "(1-3 words, letters a-z and spaces only, spell numbers as words, no punctuation, " +
  `max ${KEYWORD_MAX} characters) capturing the gist a deafblind user most needs. ` +
  'Reply ONLY as JSON: {"keyword":"...","verbatim":"<cleaned full text>"}.';

export async function POST(req: Request) {
  const { transcript } = await req.json();
  if (typeof transcript !== "string" || transcript.trim().length === 0) {
    return Response.json(
      { error: "`transcript` (non-empty string) is required" },
      { status: 400 },
    );
  }

  const msg = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 256,
    system: SYSTEM,
    messages: [
      { role: "user", content: transcript },
      { role: "assistant", content: "{" }, // prefill forces a JSON start
    ],
  });

  const parsed = parseModelJson<{ keyword?: string; verbatim?: string }>(
    textOf(msg),
    "{", // reconstruct the prefilled opening brace before parsing
  );

  // KEYWORD_MAX backstop: a-z + spaces only, hard-capped length.
  const keyword = (parsed?.keyword ?? "")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .slice(0, KEYWORD_MAX);

  // Fall back to the raw transcript if the model's JSON was unparseable.
  const verbatim =
    typeof parsed?.verbatim === "string" ? parsed.verbatim : transcript;

  return Response.json({ keyword, verbatim });
}
