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
      max_tokens: 20,
      system:
        "You are a navigation assistant for a visually impaired pedestrian. A person or obstacle is blocking the path ahead. Your job is to identify which side of the frame has MORE OPEN SPACE so the pedestrian can walk around the obstacle. Look at the left side and the right side of the image. Whichever side has more open, unobstructed floor or pavement is the correct answer. Reply with exactly one word: 'left', 'right', or 'ahead' (ahead only if the path is clearly wide enough to pass without turning). Never explain.",
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
              text: "A person is blocking the path. Which side has more open space to walk around them — left or right? Reply with one word only.",
            },
          ],
        },
      ],
    });

    const firstContent = message.content[0];
    if (!firstContent || firstContent.type !== "text") {
      console.error("[person-direction] unexpected Haiku response shape");
      return safeDefault;
    }

    const text = firstContent.text.toLowerCase().trim();
    console.log(`[person-direction] Haiku raw: "${firstContent.text.trim()}"`);

    let direction: "left" | "right" | "ahead" = "ahead";
    if (text.includes("left")) {
      direction = "left";
    } else if (text.includes("right")) {
      direction = "right";
    }

    console.log(`[person-direction] resolved: ${direction}`);
    return Response.json({ direction }, { headers: CORS });
  } catch (err) {
    console.error("[person-direction] Haiku error:", err);
    return safeDefault;
  }
}
