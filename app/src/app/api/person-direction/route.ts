import Anthropic from "@anthropic-ai/sdk";
import { CORS, preflight } from "@/lib/cors";
import {
  normalizePersonDecision,
  parsePersonDirectionRequest,
  type PersonBox,
  type PersonDirectionReason,
  type PersonDirectionResponse,
} from "@/lib/person-direction";

export const dynamic = "force-dynamic";

const PERSON_DIRECTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["obstructing", "direction", "confidence"],
  properties: {
    obstructing: { type: "boolean" },
    direction: { type: "string", enum: ["left", "right", "none"] },
    confidence: { type: "string", enum: ["high", "low"] },
  },
} as const;

export type PersonDirectionDecider = (input: {
  frameB64: string;
  personBox: PersonBox;
}) => Promise<unknown>;

function json(body: PersonDirectionResponse, status = 200): Response {
  return Response.json(body, { status, headers: CORS });
}

function isTimeout(error: unknown): boolean {
  return error instanceof Anthropic.APIConnectionTimeoutError ||
    (error instanceof Error && error.name === "APIConnectionTimeoutError");
}

async function decideWithClaude({
  frameB64,
  personBox,
}: {
  frameB64: string;
  personBox: PersonBox;
}): Promise<unknown> {
  const client = new Anthropic({ maxRetries: 0, timeout: 4000 });
  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 128,
    system:
      "You are a mobility-routing assistant. Judge only whether the highlighted person blocks the pedestrian's forward path and, if so, which side has more clear walkable space around that person. Direction names the side to move toward, not the side containing the person. Never recommend straight ahead for an obstructing person. Use low confidence whenever the image does not clearly support a safe side.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: frameB64,
            },
          },
          {
            type: "text",
            text: `The selected person's normalized [x1,y1,x2,y2] box is ${JSON.stringify(personBox)}. Return whether this person obstructs the forward path, the clear direction (left/right, or none only when not obstructing), and confidence.`,
          },
        ],
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: PERSON_DIRECTION_SCHEMA,
      },
    },
  });

  const first = message.content[0];
  if (!first || first.type !== "text") return null;
  try {
    return JSON.parse(first.text);
  } catch {
    return null;
  }
}

export function createPersonDirectionPost(decide: PersonDirectionDecider) {
  return async function POST(request: Request): Promise<Response> {
    const startedAt = Date.now();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json(
        { status: "unavailable", direction: null, reason: "invalid_request" },
        400,
      );
    }

    const parsed = parsePersonDirectionRequest(body);
    if (!parsed.ok) return json(parsed.response, 400);

    let outcome: PersonDirectionResponse;
    try {
      outcome = normalizePersonDecision(await decide(parsed.value));
    } catch (error) {
      const reason: PersonDirectionReason = isTimeout(error) ? "timeout" : "model_error";
      console.error(
        `[person-direction] outcome=${reason} durationMs=${Date.now() - startedAt}`,
      );
      return json({ status: "unavailable", direction: null, reason }, 503);
    }

    const status = outcome.status === "unavailable" && outcome.reason === "invalid_response" ? 502 : 200;
    console.info(
      `[person-direction] outcome=${outcome.status} durationMs=${Date.now() - startedAt}`,
    );
    return json(outcome, status);
  };
}

export function OPTIONS(): Response {
  return preflight();
}

export const POST = createPersonDirectionPost(decideWithClaude);
