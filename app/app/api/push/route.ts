// Publish a keyword to the wearable (forward path). Enforces the KEYWORD_MAX
// backstop server-side so a bad client can never overflow the braille buffer.
import { pushForward } from "../../lib/redis";
import { KEYWORD_MAX } from "../../lib/contract";

export const dynamic = "force-dynamic";

function sanitizeKeyword(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .slice(0, KEYWORD_MAX);
}

export async function POST(req: Request) {
  const { keyword, verbatim } = await req.json();
  const clean = sanitizeKeyword(keyword);
  if (clean.length === 0) {
    return Response.json(
      { error: "`keyword` must contain at least one a-z character" },
      { status: 400 },
    );
  }

  const seq = await pushForward(
    clean,
    typeof verbatim === "string" ? verbatim : "",
  );
  return Response.json({ seq });
}
