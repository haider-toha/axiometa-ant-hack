// Shared Anthropic client + JSON-hardening for the two model routes
// (/api/condense and /api/suggest). Both use claude-haiku-4-5 per the Phase 1B
// grounding (§3 + §7 correction b: haiku for BOTH routes, overriding sonnet).
import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Bare alias (full id claude-haiku-4-5-20251001). Active in 2026, $1/$5 per 1M.
export const HAIKU = "claude-haiku-4-5";

/**
 * Narrow a model response down to a parseable JSON object: strip any markdown
 * code fence, then keep only the outermost {...} span.
 */
function extractJson(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end > start) s = s.slice(start, end + 1);
  return s;
}

/**
 * Best-effort JSON parse of model output. Anthropic has no top-level JSON mode,
 * so we harden: try the assistant-prefill reconstruction first (prefill + raw),
 * then the raw text, then a fence-stripped / brace-narrowed fallback for each.
 * Returns null if nothing parses — callers MUST handle null (never a silent {}).
 */
export function parseModelJson<T>(raw: string, prefill = ""): T | null {
  for (const candidate of [prefill + raw, raw]) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      /* fall through to the lenient extractor */
    }
    try {
      return JSON.parse(extractJson(candidate)) as T;
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

/** Pull the concatenated text blocks out of a Messages API response. */
export function textOf(msg: Anthropic.Message): string {
  return msg.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("");
}
