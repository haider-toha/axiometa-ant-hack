// Claude vision endpoint that resolves the "go AROUND the obstacle" direction.
//
// The phone posts a rear-camera JPEG here whenever the Modal detector sees a
// person in the frame but no bus. Claude looks at the whole frame and answers
// which side has more walkable pavement — that is the direction the wearer
// should turn toward. A blocked path always requires a TURN, never AHEAD:
// walking straight into a person is the failure mode this endpoint exists to
// prevent, so the response is constrained to LEFT or RIGHT.
import Anthropic from "@anthropic-ai/sdk";
import { CORS, preflight } from "@/lib/cors";

export const dynamic = "force-dynamic";

export function OPTIONS(): Response {
  return preflight();
}

/**
 * Extract the direction Claude actually committed to.
 *
 * The model is instructed to reply with a single word, but real replies
 * occasionally include a short justification ("Go right — more open pavement
 * on the right"). Two rules make this robust:
 *
 *   1. Match on WORD BOUNDARIES — a bare `.includes("right")` matches "bright"
 *      and other substrings.
 *   2. Take the LAST match, not the first — if Claude explains ("the person is
 *      standing on the left, so go right") the recommendation is at the end.
 *
 * "ahead" is admitted as a defensive fallback: if the model refuses to commit
 * to a side we surface that instead of forcing a coin flip. The capture page
 * maps it to the AHEAD device pattern, matching the pre-obstacle state.
 */
function parseDirection(raw: string): "left" | "right" | "ahead" {
  const lowered = raw.toLowerCase();
  const matches = lowered.match(/\b(left|right|ahead)\b/g);
  if (!matches || matches.length === 0) return "ahead";
  const last = matches[matches.length - 1];
  if (last === "left") return "left";
  if (last === "right") return "right";
  return "ahead";
}

export async function POST(request: Request): Promise<Response> {
  const safeDefault = Response.json({ direction: "ahead" }, { headers: CORS });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return safeDefault;
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).frame_b64 !== "string"
  ) {
    return safeDefault;
  }

  const frame_b64 = (body as Record<string, unknown>).frame_b64 as string;

  try {
    const client = new Anthropic();

    // Opus 4.5 was picked for spatial reasoning on the pavement scene — Haiku
    // routinely picked the side the person was ON instead of the side that
    // was clear. If cost/latency ever forces a downgrade, retest with a scene
    // where the person is off-center.
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 16,
      system:
        "You are a mobility assistant for a blind pedestrian. A person or obstacle is in the frame directly ahead, blocking the path. The pedestrian MUST walk around it — never straight through. Your job is to look at the whole frame and decide which SIDE has more clear, walkable pavement to route around the obstacle. Reply with EXACTLY one word — 'left' or 'right' — naming the side the pedestrian should turn toward (NOT the side the obstacle is on). Never reply 'ahead'. Never add punctuation. Never explain. If both sides look equally clear, pick the side with fewer people, walls, kerbs, or bollards.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: frame_b64,
              },
            },
            {
              type: "text",
              text: "Which side should the pedestrian turn toward to walk around this obstacle safely — left or right? One word only.",
            },
          ],
        },
      ],
    });

    const firstContent = message.content[0];
    if (!firstContent || firstContent.type !== "text") {
      console.error("[person-direction] unexpected Claude response shape");
      return safeDefault;
    }

    const raw = firstContent.text.trim();
    const direction = parseDirection(raw);
    console.log(`[person-direction] raw="${raw}" resolved=${direction}`);

    return Response.json({ direction }, { headers: CORS });
  } catch (err) {
    console.error("[person-direction] Claude error:", err);
    return safeDefault;
  }
}
