// The ESP32 posts the reply the user selected on the wearable. We store it as
// the pending choice (for the phone to collect) and fold it into memory.
import { setChoice } from "../../lib/redis";
import type { Choice } from "../../lib/contract";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { index, text } = await req.json();
  if (typeof index !== "number" || typeof text !== "string") {
    return Response.json(
      { error: "`index` (number) and `text` (string) are required" },
      { status: 400 },
    );
  }

  const choice: Choice = { index, text };
  await setChoice(choice);
  return Response.json({ ok: true });
}
