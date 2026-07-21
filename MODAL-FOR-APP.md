# Web app to Modal vision contract

This is the handoff spec for the Modal vision service (`vision/service.py`). It defines the one HTTP contract that the web app (`app/`) speaks to Modal. Get this shape right, and the front end needs no changes.

Tacta gives situational awareness through touch. It fuses cameras, microphones, and depth sensors and delivers the result as vibration. This endpoint is the vision sense. The demo hardcodes one concrete scene, reading a specific bus at a stop, route `88` to `Clapham Common`. That scene is one hardcoded example, not the product. The web app that calls this endpoint ships on the live site tacta.space, which serves the pitch deck as its landing page and the demo tools at `/capture` and `/output`.

The source of truth for the types is [`app/src/lib/contract.ts`](app/src/lib/contract.ts). It exports `ModalResponse`, `ModalReading`, and `detectorToEvent`. For full background, read [`plan/2026-07-18-situational-awareness.md`](plan/2026-07-18-situational-awareness.md). See the sections "Data Contracts, Contract A" and "The Vision Pipeline".

---

## Summary

- Expose **one public HTTPS POST endpoint** on Modal as a web endpoint. Callers need **no auth**. The browser posts directly to it.
- The web app sends a JPEG frame about **2 times per second**. The endpoint replies with the current **arrival state**, not a bounding box.
- The endpoint must send **CORS headers and answer the `OPTIONS` preflight**. The call is cross-origin from the browser. This is the single most common thing that breaks it.
- The web app needs only the **deployed URL** back from you. It goes into the app as `NEXT_PUBLIC_MODAL_URL`, or as `?modal=<url>` on the capture page. The Modal **token** is for deployment, not for the app. Never put it in `app`.

---

## The endpoint

`POST https://<workspace>--tacta-vision-ingest.modal.run` (name is up to you)

### Request body (what the phone sends)

```jsonc
{
  "frame_b64": "/9j/4AAQSkZJRg…",  // base64 JPEG, NO "data:image/jpeg;base64," prefix
  "force": false                    // true only for the disclosed SPACE-key demo aid
}
```

- `frame_b64` is a raw base64 JPEG, about 1280x720, q85, about 120 kB. The browser already strips the data-URL prefix. Decode it directly.
- When `force` is `true`, run the arrival and read path even if the debounce would not normally fire. Use `force` once, on stage, to trigger a detection on demand. Treat `false` as the default.

### Response body (exact shape the app expects)

```jsonc
{
  "event": "NONE",          // "NONE" | "BUS_ARRIVED" | "BUS_GONE"
  "present": true,          // is the target vehicle in frame this instant
  "confidence": 0.83,       // best detection-box confidence this frame (0..1)
  "arrival_id": 1,          // increments by 1 ONCE per arrival, the fire-once latch
  "reading": null,          // null until the route has been read; then the object below
  "reading_ready": false,   // true once `reading` is populated
  "votes": []               // raw route strings from the read step, e.g. ["88","88","88"]
}
```

After the route is read, `reading` holds this object.

```jsonc
{ "route": "88", "destination": "Clapham Common", "confidence": "high" }  // confidence: "high" | "low"
```

The app parses this into the following TypeScript.

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

Keep the JSON keys **exactly** as above. Use snake_case, for example `frame_b64`, `arrival_id`, and `reading_ready`.

---

## CORS is required

The browser posts cross-origin with `Content-Type: application/json`. This triggers a **preflight**. The endpoint must do two things.

- Answer `OPTIONS` with `204` and the CORS headers below.
- Include `Access-Control-Allow-Origin: *` on the `POST` response, or the deployed web-app origin.

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

Without these headers, the frames never leave the browser. You see nothing server-side.

---

## Why Modal is a server, not just Claude

The endpoint delivers a **state transition**, not a per-frame detection. It must hold about 1 to 2 seconds of history. It does three things that the stateless model cannot do.

1. **Detect** the target vehicle in each frame with YOLO or equivalent. Set `present` and `confidence`.
2. **Debounce and latch.** Require about 2 consecutive detections before you fire. One flickery frame then does not fire, and one dropped frame does not un-fire. On the rising edge, set `event: "BUS_ARRIVED"` and **increment `arrival_id` once**. Emit `BUS_GONE` when the target leaves.
3. **Read once per arrival.** After the latch, crop the destination blind and ask Claude to read the route and destination with structured output. Run a few concurrent reads and vote. When they agree, set `reading`, `reading_ready: true`, and `votes`. Do this **once per `arrival_id`**, not every frame.

State must persist across frames. The shipped `vision/service.py` keeps the arrival state machine **and** the Claude reading in Upstash Redis. An atomic Lua script mutates that state. It stays correct even when consecutive polls land on different containers, so it needs no `max_containers` cap. If you skip Redis, a simpler alternative pins **`max_containers=1`** and holds the arrival state in process.

Latency matters. Keep the container **warm**. The arrival signal (stage 1) must land fast. The whole two-stage haptic (coarse then precise) depends on a quick arrival pulse. The route follows a couple of seconds later.

---

## How the web app uses each field (so the shape makes sense)

The capture page maps your response to a device command with `detectorToEvent()`.

| Your response | Device command the app fires |
| --- | --- |
| `event: "BUS_ARRIVED"`, no reading yet | `BUS`, meaning "arrival detected" |
| `arrival_id > 0`, `present`, reading pending | `WAIT`, meaning "reading it" |
| `reading_ready`, `reading.confidence: "high"`, digit route | `NUMBER` (route), buzzes "88" |
| `reading_ready`, low confidence or non-digit route | `UNKNOWN` |
| otherwise | `NONE` |

`arrival_id` must increment exactly once per real arrival. `reading_ready` must flip to `true` only when `reading` is actually populated. Those two fields drive the whole flow.

The app posts a fresh command to its own relay **only when the meaning changes**. A stable response across frames is therefore fine and expected.

---

## Auth and deployment

- **Callers need no credentials.** It is a public web endpoint.
- The `modal token set --token-id … --token-secret …` credential is for deployment. You run `modal deploy` or `modal serve` with it, and it lives in `~/.modal.toml` on your machine. **Never** commit it or put it in any `NEXT_PUBLIC_*` var.
- Hand back the **deployed URL**. That is all `app` needs. The URL differs between `modal serve`, which adds a `-dev` suffix, and `modal deploy`. Send whichever one you run.

---

## Minimal Modal sketch (illustrative)

```python
import modal

app = modal.App("tacta-vision")
image = modal.Image.debian_slim().pip_install("ultralytics", "anthropic==0.117.0")

@app.cls(gpu="T4", image=image,
         secrets=[modal.Secret.from_name("anthropic"), modal.Secret.from_name("upstash")])
class Detector:
    # ~2 s of detection history + the arrival_id latch + Claude reading live in
    # Upstash Redis (see service.py), so concurrent containers stay consistent
    @modal.fastapi_endpoint(method="POST")
    def ingest(self, body: dict):
        # 1. decode base64 JPEG, run YOLO -> present/confidence
        # 2. debounce -> on rising edge: event=BUS_ARRIVED, arrival_id += 1
        # 3. once per arrival_id: crop + Claude read (structured output) -> reading/votes
        # 4. return the ModalResponse shape above, WITH CORS headers
        ...
```

Add the CORS headers and an `OPTIONS` handler on the FastAPI response. The sketch omits them for brevity, but they are required.
