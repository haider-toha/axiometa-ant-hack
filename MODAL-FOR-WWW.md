# Modal ↔ web app — what the vision endpoint must expose

Handoff spec for whoever builds the Modal vision service (`vision/bus_vision.py`). It defines the one HTTP contract the web app (`www/`) speaks to Modal. Get this shape right and the front end needs zero changes.

**Source of truth for the types:** [`www/src/lib/contract.ts`](www/src/lib/contract.ts) (`ModalResponse`, `ModalReading`, `detectorToEvent`). Full background: [`plan/2026-07-18-bus-stop-situational-awareness.md`](plan/2026-07-18-bus-stop-situational-awareness.md) → "Data Contracts → Contract A" and "The Vision Pipeline".

---

## TL;DR

- Expose **one public HTTPS POST endpoint** on Modal (a web endpoint). Callers need **no auth** — the browser posts directly to it.
- The web app sends a JPEG frame ~**2×/second**; the endpoint replies with the current **arrival state** (not a bounding box).
- The endpoint must send **CORS headers and answer the `OPTIONS` preflight** — the call is cross-origin from the browser. This is the single most common thing that breaks it.
- The only thing the web app needs back from you is the **deployed URL**. It goes into the app as `NEXT_PUBLIC_MODAL_URL` (or `?modal=<url>` on the capture page). The Modal **token** is for *deploying*, not for the app — never put it in `www`.

---

## The endpoint

`POST https://<workspace>--bus-vision-ingest.modal.run` (name is up to you)

### Request body (what the phone sends)

```jsonc
{
  "frame_b64": "/9j/4AAQSkZJRg…",  // base64 JPEG, NO "data:image/jpeg;base64," prefix
  "force": false                    // true only for the disclosed SPACE-key demo aid
}
```

- `frame_b64` is a raw base64 JPEG (~1280×720, q85, ~120 kB). The browser already strips the data-URL prefix, so decode it directly.
- `force`: when `true`, run the arrival/read path even if the debounce wouldn't normally fire. Used once, on stage, to trigger a detection on demand. Treat `false` as the default.

### Response body (what the app expects back — exact shape)

```jsonc
{
  "event": "NONE",          // "NONE" | "BUS_ARRIVED" | "BUS_GONE"
  "present": true,          // is a bus in frame this instant
  "confidence": 0.83,       // best bus-box confidence this frame (0..1)
  "arrival_id": 1,          // increments by 1 ONCE per arrival — the fire-once latch
  "reading": null,          // null until the route has been read; then the object below
  "reading_ready": false,   // true once `reading` is populated
  "votes": []               // raw route strings from the read step, e.g. ["88","88","88"]
}
```

When the route has been read, `reading` is:

```jsonc
{ "route": "88", "destination": "Clapham Common", "confidence": "high" }  // confidence: "high" | "low"
```

The TypeScript the app parses this into:

```ts
interface ModalReading { route: string; destination: string; confidence: "high" | "low"; }
interface ModalResponse {
  event: "NONE" | "BUS_ARRIVED" | "BUS_GONE";
  present: boolean;
  confidence: number;
  arrival_id: number;
  reading: ModalReading | null;
  reading_ready: boolean;
  votes: string[];
}
```

Keep the JSON keys **exactly** as above (snake_case: `frame_b64`, `arrival_id`, `reading_ready`).

---

## CORS — do not skip this

The browser posts cross-origin with `Content-Type: application/json`, which triggers a **preflight**. The endpoint must:

- Answer `OPTIONS` with `204` and the CORS headers below.
- Include on the `POST` response: `Access-Control-Allow-Origin: *` (or the deployed web-app origin).

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

Without these, the frames never leave the browser and you'll see nothing server-side.

---

## The behaviour Modal owns (why it's a server, not just Claude)

The endpoint's product is a **state transition**, not a per-frame detection. It must hold ~1–2 s of history and do three things the stateless model can't:

1. **Detect** a bus per frame (YOLO or equivalent) → `present` / `confidence`.
2. **Debounce + latch.** Require ~2 consecutive detections before firing, so one flickery frame doesn't fire and one dropped frame doesn't un-fire. On the rising edge, set `event: "BUS_ARRIVED"` and **increment `arrival_id` once**. Emit `BUS_GONE` when it leaves.
3. **Read once per arrival.** After the latch, crop the destination blind and ask Claude to read the route/destination (structured output). Run a few concurrent reads, vote, and when they agree set `reading`, `reading_ready: true`, and `votes`. Do this **once per `arrival_id`**, not every frame.

State lives in the container, which is only safe because the Modal app pins **`max_containers=1`** (see the plan). Keep the arrival state in-process.

Latency matters: keep the container **warm**. "A bus is here" (stage 1) must land fast — the whole two-stage haptic (coarse-then-precise) depends on the arrival pulse being quick, with the route following a couple of seconds later.

---

## How the web app uses each field (so the shape makes sense)

The capture page maps your response to a device command via `detectorToEvent()`:

| Your response | Device command the app fires |
| --- | --- |
| `event: "BUS_ARRIVED"`, no reading yet | `BUS` — "a bus is here" |
| `arrival_id > 0`, `present`, reading pending | `WAIT` — "reading it" |
| `reading_ready`, `reading.confidence: "high"`, digit route | `NUMBER` (route) — buzzes "88" |
| `reading_ready`, low confidence or non-digit route | `UNKNOWN` |
| otherwise | `NONE` |

So `arrival_id` must increment exactly once per real arrival, and `reading_ready` must flip to `true` only when `reading` is actually populated — those two drive the whole flow.

The app posts a fresh command to its own relay **only when the meaning changes**, so a stable response across frames is fine and expected.

---

## Auth / deployment

- **Callers need no credentials** — it's a public web endpoint.
- The `modal token set --token-id … --token-secret …` credential is for **deploying** (`modal deploy` / `modal serve`) and lives in `~/.modal.toml` on your machine. **Never** commit it or put it in any `NEXT_PUBLIC_*` var.
- Hand back the **deployed URL**; that's all `www` needs. It differs between `modal serve` (a `-dev` suffix) and `modal deploy`, so send whichever you're running.

---

## Minimal Modal sketch (illustrative)

```python
import modal

app = modal.App("bus-vision")
image = modal.Image.debian_slim().pip_install("ultralytics", "anthropic==0.117.0")

@app.cls(gpu="T4", max_containers=1, image=image, secrets=[modal.Secret.from_name("anthropic")])
class Detector:
    # holds ~2s of detection history + arrival_id latch in-process
    @modal.fastapi_endpoint(method="POST")
    def ingest(self, body: dict):
        # 1. decode base64 JPEG, run YOLO -> present/confidence
        # 2. debounce -> on rising edge: event=BUS_ARRIVED, arrival_id += 1
        # 3. once per arrival_id: crop + Claude read (structured output) -> reading/votes
        # 4. return the ModalResponse shape above, WITH CORS headers
        ...
```

Add the CORS headers (and an `OPTIONS` handler) on the FastAPI response — the sketch omits them for brevity, but they are required.
```
