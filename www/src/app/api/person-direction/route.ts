import Anthropic from "@anthropic-ai/sdk";
import { CORS, preflight } from "@/lib/cors";

export const dynamic = "force-dynamic";

export function OPTIONS(): Response {
  return preflight();
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

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 10,
      system:
        "You are a navigation assistant for a visually impaired pedestrian using a white cane. Analyze the camera frame and determine the safest direction to walk. The frame shows a person or obstacle ahead. Reply with exactly one word — left, right, or ahead — indicating the clearest direction to proceed. Never explain your reasoning.",
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
              text: "Which direction is clearest — left, right, or ahead?",
            },
          ],
        },
      ],
    });

    const firstContent = message.content[0];
    if (!firstContent || firstContent.type !== "text") {
      return safeDefault;
    }

    const text = firstContent.text.toLowerCase().trim();
    let direction: "left" | "right" | "ahead" = "ahead";
    if (text.includes("left")) {
      direction = "left";
    } else if (text.includes("right")) {
      direction = "right";
    }

    return Response.json({ direction }, { headers: CORS });
  } catch {
    return safeDefault;
  }
}
