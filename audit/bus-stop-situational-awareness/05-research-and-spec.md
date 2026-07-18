# 05 — Phase 1 Research & Implementation Spec (Modal vision service)

**Author:** Phase 1 (research only — no code files written)
**Date written:** 2026-07-18
**All external claims below were fetched live on 2026-07-18.** Nothing rests on training-data memory.

---

## 0. What this document is

This is the **contract Phase 2 implements from**. Phase 2 is forbidden from doing its own research, so every
open question is closed here — decisively, and with the safer option chosen and labelled where sources
conflicted.

Scope: the Modal vision service (`vision/bus_vision.py`), its Redis state machine, and its HTTP contract with
the mobile capture page. Out of scope: firmware, CAD, the Next.js app internals, the haptic vocabulary.

**Files this spec authorises Phase 2 to create:** `vision/bus_vision.py`, `vision/read_blind.py`,
`vision/requirements.txt`. Nothing under `app/`, `firmware/`, `cad/`, or any existing `audit/` file is touched.

**Prior art mined, not repeated.** `audit/…/02-track-2-modal-claude-grounding-and-hardcoded-spec.md` already
grounds Modal pricing, decorator order, the Claude vision content-block shape, the visual-token formula, the
structured-outputs mechanism ranking, the locked prop, and the crop geometry. All of that stands. This document
only adds what 02 left open or what the `max_containers` removal invalidates.

---

## (a) Research findings

### Q1 — YOLO-World offline vocabulary

**Evidence**
| Source | Fetched |
|---|---|
| https://docs.ultralytics.com/models/yolo-world | 2026-07-18 |
| https://docs.ultralytics.com/models/yoloe | 2026-07-18 |
| WebSearch "YOLO-World set_classes save offline vocabulary" → https://github.com/ultralytics/ultralytics/issues/11681 | 2026-07-18 |
| https://docs.ultralytics.com/guides/modal-quickstart/ (via audit/02) | 2026-07-18 |

**VERDICT 1a — `set_classes()` + `save()` bakes the embeddings. CONFIRMED.**
The Ultralytics docs show this exact sequence and state that after saving, *"the `custom_yolov8s.pt` model behaves
like any other pretrained YOLOv8 model"*:

```python
model = YOLO("yolov8s-world.pt")
model.set_classes(["person", "bus"])
model.save("custom_yolov8s.pt")
```

The docs describe the mechanism as an **offline vocabulary**: *"Custom prompts … are pre-encoded and stored as
offline vocabulary embeddings, which streamlines the detection process without the need for retraining."*
Loading the saved `.pt` needs **no CLIP at inference**.

**VERDICT 1b — but `set_classes()` itself needs CLIP AT CALL TIME. This is the trap.**
Ultralytics issue #11681 is a user asking for a way to point `set_classes` at a local CLIP checkpoint precisely
because it downloads CLIP into `~/.cache/clip` on first call. **Consequence for Phase 2: `set_classes()` must run
at Modal image-build time, never at request time.** Baking it into the image means the running container never
imports CLIP and never touches the network for weights. This is specified in §(e).

**VERDICT 1c — use `yolov8s-world.pt`, not `-m`.** Both auto-download from
`https://github.com/ultralytics/assets/releases/download/v8.4.0/`. The prop is a frame-filling A3 print or tablet
at 1.0–1.5 m — `s` is already far more capacity than a frame-filling target needs, and `m` costs ~2.5× the
parameters for no measurable gain here. Auto-download is confirmed for all eight world checkpoints
(`yolov8{s,m,l,x}-world{,v2}.pt`).

**VERDICT 1d — YOLOE: REJECT.** Four independent reasons, any one sufficient:
1. **Wrong output head.** Every published YOLOE checkpoint is `-seg` (`yoloe-11s-seg.pt`, `yoloe-26n-seg.pt`, …).
   We need boxes. We would pay for mask heads we discard on every frame.
2. **API instability on exactly the call we depend on.** The YOLOE docs show `model.set_classes(["person","bus"])`
   with *no embeddings parameter documented*, while the widely-published YOLOE usage is
   `model.set_classes(names, model.get_text_pe(names))`. A two-argument-vs-one-argument discrepancy on the single
   API call our whole detector rests on is not something to discover at 3 a.m.
3. **Auto-download not confirmed.** The docs say weights are *"available from the YOLOE GitHub releases"* but
   do not confirm the transparent auto-download that YOLO-World checkpoints have.
4. **Zero upside.** We need one coarse class on a frame-filling target. There is no task here that YOLOE does and
   YOLO-World does not.

**VERDICT 1e — reconciling the plan's "YOLO26n" (plan line 712).**
The plan and audit/02 both name `yolo26n.pt` because that is the weight file used throughout the official
Ultralytics Modal quickstart, and COCO class 5 is `bus`. **That is a valid, fully-grounded path and it is retained
as the documented fallback.** It is *not* the primary, for one reason that matters on stage:

> COCO `bus` gives you **no knob**. If the prop does not fire, there is nothing to turn. A baked YOLO-World
> vocabulary gives you a text prompt list you can edit and rebuild in ~2 minutes.

The prop is a *head-on close-up of a bus front* — COCO's `bus` class is trained on full-vehicle street scenes,
so the tight frontal crop is exactly the distribution edge where confidence sags. The prompt list
(`"bus"`, `"double decker bus"`, `"bus front"`) is the mitigation.

**Phase 2 MUST use:** `yolov8s-world.pt`, vocabulary baked at image-build time, saved to `/model/bus_world.pt`.
**Documented fallback (§g):** swap to `yolo26n.pt` + COCO index map. It is a 6-line change and both index maps
are given in §(e).

---

### Q2 — Modal GPU memory snapshots + web endpoint (pinned `modal==1.5.2`)

**Evidence**
| Source | Fetched |
|---|---|
| https://modal.com/docs/guide/memory-snapshots | 2026-07-18 |
| https://modal.com/docs/guide/webhooks | 2026-07-18 |
| https://modal.com/docs/guide/lifecycle-functions | 2026-07-18 |
| https://modal.com/docs/reference/modal.asgi_app | 2026-07-18 |
| https://modal.com/docs/reference/modal.Image | 2026-07-18 |
| https://modal.com/docs/guide/webhook-urls | 2026-07-18 |

**VERDICT 2a — the flags, and where they go. CONFIRMED.**
Both flags are accepted on **`@app.function()` *and* `@app.cls()`**:

| Feature | Status | Syntax |
|---|---|---|
| CPU memory snapshots | **GA** | `enable_memory_snapshot=True` |
| GPU memory snapshots | **ALPHA** | `enable_memory_snapshot=True` **plus** `experimental_options={"enable_gpu_snapshot": True}` |

**VERDICT 2b — GPU snapshots: ENABLE THE CPU HALF ONLY. Do not set `enable_gpu_snapshot`.**
This upholds audit/02's ruling and I found nothing to overturn it. GPU snapshotting is still marked alpha in the
docs, and audit/02 records the documented incompatibilities (multi-GPU, non-CUDA, `torch.compile`, *"most
functions require modifications"*). The payoff is cold start, and we already buy that for free with
`min_containers=1`. The exact enabling line is given commented-out in §(e) so it is one uncomment away, but it
must not ship enabled.

**VERDICT 2c — the `snap=True` / `snap=False` split. CONFIRMED, with one hard rule.**

Documented verbatim: *"GPUs will not be available within the `@modal.enter(snap=True)` method"* (when
`enable_gpu_snapshot` is not set), and *"If your application depends on uniqueness of state, you must evaluate
your Function code and verify that it is resilient to snapshotting operations."*

| Phase | Runs | Put here | Never put here |
|---|---|---|---|
| `@modal.enter(snap=True)` | once, before the snapshot is taken | model load **to CPU**, local disk reads, expensive imports, JIT warm-up | anything holding a socket, any secret-derived client, anything requiring uniqueness (RNG seeds, IDs), **any CUDA call** |
| `@modal.enter(snap=False)` | after every restore | `.to("cuda")`, network clients, API clients, anything reading a secret | slow one-time work you could have snapshotted |

**The rule Phase 2 must encode, stated plainly:** *a network client constructed before the snapshot is captured
in the snapshot, and every restored container then resurrects the same dead socket state.* The docs do not spell
this out as a prohibition — they warn about state uniqueness generally, and the official example splits exactly
this way (`SentenceTransformer(..., device="cpu")` in `snap=True`; `.to("cuda")` in `snap=False`). **I picked the
strict reading: no client that talks to the network is constructed in `snap=True`.** That is the safer option and
it costs nothing.

**We go further and remove the question entirely.** §(e) constructs the Redis client **lazily, per-thread**, so it
is never constructed in *either* enter hook. That satisfies the rule by construction and simultaneously dodges
every thread-safety question raised by FastAPI's sync-handler threadpool. See §(e).

**VERDICT 2d — `@modal.fastapi_endpoint` cannot carry middleware. Use `@modal.asgi_app()`. PICK ONE: `asgi_app`.**

The full signature (audit/02, re-confirmed) is:

```python
fastapi_endpoint(*, method="GET", label=None, custom_domains=None,
                 docs=False, requires_proxy_auth=False)
```

**There is no middleware parameter.** A mobile browser on the Vercel origin POSTing to `*.modal.run` is a
cross-origin request and will be blocked at the preflight without `Access-Control-Allow-Origin`. Therefore
`fastapi_endpoint` is **rejected** for this service and `@modal.asgi_app()` is **mandatory** — it returns a real
FastAPI app object, onto which `CORSMiddleware` attaches normally.

```python
asgi_app(*, label=None, custom_domains=None, requires_proxy_auth=False)
```

`label=` is confirmed present, so the deployed URL is **pinned**, not guessed:
`https://<workspace>--bus-vision.modal.run`. `modal serve` appends `-dev` to the label
(*"webhooks for ephemeral Apps … will have a `-dev` suffix appended to their URL label"*), so dev and prod
cannot collide. **Phase 2 must still paste the URL printed by `modal deploy` into `MODAL_URL` rather than
constructing it from the pattern.**

**VERDICT 2e — web endpoints on a class method. CONFIRMED VERBATIM.**
audit/02 line ~773 flagged this as unverified and told the reader to check before relying on it. **It is now
verified.** From https://modal.com/docs/guide/lifecycle-functions:

> *"Modal Web Functions can be converted to the class syntax as well. Instead of `@modal.method`, simply use
> whichever Web Function decorator (`@modal.fastapi_endpoint`, `@modal.asgi_app` or `@modal.wsgi_app`) you were
> using before."*

with this example:

```python
@app.cls()
class Model:
    @modal.enter()
    def run_this_on_container_startup(self):
        self.model = pickle.load(open("model.pickle"))

    @modal.fastapi_endpoint()
    def predict(self, request: Request):
        ...
```

**One honest caveat.** The docs show `@app.cls` + `@modal.enter` + web-endpoint-method (lifecycle page) and
`@app.cls(enable_memory_snapshot=True)` + `@modal.enter(snap=…)` + `@modal.method()` (snapshots page). **No single
page shows all four together.** The composition is sound — both are documented properties of `@app.cls()` — but
Phase 2 must treat it as a composition, not a quoted example. **Smoke test is in §(g) and takes 60 seconds.**
If it fails, the fallback is: drop `enable_memory_snapshot=True` (lose ~nothing; `min_containers=1` is the real
cold-start guarantee) and keep the class + `asgi_app`.

**VERDICT 2f — `modal.Image.run_function` is real and is the build hook. CONFIRMED.**
audit/02 left `run_commands` unverified. Both are confirmed current:

```python
run_commands(self, *commands, env=None, secrets=None, volumes=None, gpu=None, force_build=False)
run_function(self, raw_f, *, env=None, secrets=None, volumes={}, network_file_systems={},
             gpu=None, cpu=None, memory=None, timeout=3600, cloud=None, region=None,
             force_build=False, args=(), kwargs={}, include_source=True)
```

`run_function` is what bakes the YOLO-World vocabulary (Q1b) into the image.

---

### Q3 — Upstash Redis Lua atomicity (Python SDK)

**Evidence**
| Source | Fetched |
|---|---|
| https://upstash.com/docs/redis/features/key-locking | 2026-07-18 |
| https://upstash.com/docs/redis/sdks/py/commands/scripts/eval | 2026-07-18 |
| https://upstash.com/docs/redis/sdks/py/commands/scripts/evalsha | 2026-07-18 |
| https://github.com/upstash/redis-py (README) | 2026-07-18 |
| https://pypi.org/project/upstash-redis/ | 2026-07-18 |
| https://deepwiki.com/upstash/redis-py/5.9-scripting-commands | 2026-07-18 |

**VERDICT 3a — the shebang is real and it locks only `KEYS`. CONFIRMED.**
Exact line: `#!lua flags=allow-key-locking`. Upstash's docs state it *"locks only the keys passed through the
`KEYS` array when the script is invoked"*, and that other commands touching disjoint keys run in parallel.

Two constraints that bind our script:
- **Every key touched must be declared in `KEYS`.** *"Every key passed to `redis.call` must appear in `KEYS`"* —
  otherwise the engine rejects with an error referencing *"Dynamic keys are not allowed."* Our script declares
  all four.
- **Database-wide commands are prohibited** (`FLUSHDB`, `FLUSHALL`). We use none.
- `GET`, `SET`, `INCR` and friends are explicitly permitted on declared keys.

**VERDICT 3b — `EXPIRE`/`SET … EX` inside the script. CONFIRMED, and we use the `SET … 'EX'` form.**
Standard Redis commands are permitted on declared keys; the docs' own example calls `INCR`. `SET key val 'EX' ttl`
sets value and TTL in one call, which is strictly better than a separate `EXPIRE` (one fewer command, and the TTL
can never be orphaned from the write). **This is what puts a TTL on `bus:hits`** — Global-Constraint requirement.

**VERDICT 3c — the Python SDK. Exact import, constructor, and methods.**

```python
from upstash_redis import Redis              # sync
redis = Redis.from_env()                     # reads UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN

from upstash_redis.asyncio import Redis      # async — same constructor + .from_env()
```

Package: **`upstash-redis`** on PyPI, latest **1.7.0** (2026-03-18). Env vars confirmed in the GitHub README.

Scripting methods exist on **`Commands` (sync), `AsyncCommands` (async), and `PipelineCommands`**:

| Method | Signature | Returns |
|---|---|---|
| `eval` | `eval(script, keys=[], args=[])` | `Any` |
| `eval_ro` | `eval_ro(script, keys=[], args=[])` | `Any` |
| `evalsha` | `evalsha(sha1, keys=[], args=[])` | `Any` |
| `evalsha_ro` | `evalsha_ro(sha1, keys=[], args=[])` | `Any` |
| `script_load` | `script_load(script)` | `str` (40-char sha1) |
| `script_exists` | `script_exists(*sha1)` | `List[bool]` |
| `script_flush` | `script_flush(flush_type=None)` | `bool` |

Verbatim from the `eval` docs page — note `keys` and `args` are **keyword** arguments taking lists:

```python
script = """
local value = redis.call("GET", KEYS[1])
return value
"""

redis.set("mykey", "Hello")

assert redis.eval(script, keys=["mykey"]) == "Hello"
```

> **⚠️ The PyPI page and the GitHub README do not mention scripting at all.** Do not conclude from their silence
> that it is unsupported — the per-command docs pages and the SDK source both have it. This is recorded because
> a Phase 2 agent checking only the README would reach the wrong conclusion.

**VERDICT 3d — use `eval`, NOT `evalsha`. DECISION.**
`evalsha` needs a `script_load` at startup *and* a `NOSCRIPT` retry path, because Upstash may evict the script
cache and every new container restarts cold. `eval` ships the ~1.2 kB script body on each call — at 2 fps that is
2.4 kB/s over a REST connection that is already carrying a JSON payload. **Trading 2.4 kB/s for the deletion of an
entire failure class is correct at this deadline.** Also: `eval`'s signature is the one confirmed verbatim with a
runnable example; `evalsha`'s doc example only shows `args=`, not `keys=`.

---

### Q4 — Claude structured outputs with `anthropic==0.117.0`

**Evidence**
| Source | Fetched |
|---|---|
| https://platform.claude.com/docs/en/build-with-claude/structured-outputs | 2026-07-18 |
| https://platform.claude.com/docs/en/build-with-claude/effort | 2026-07-18 |
| https://platform.claude.com/docs/en/api/messages | 2026-07-18 |

**VERDICT 4a — field path. CONFIRMED, matches audit/02 exactly.**
`output_config={"format": {"type": "json_schema", "schema": {...}}}`. `additionalProperties: false` is required on
every object (*"Add `additionalProperties: false` to all objects"*; *"`additionalProperties` set to anything other
than `false`"* is listed under **Not supported**). Supported on `claude-opus-4-8`, `claude-sonnet-5`,
`claude-haiku-4-5` and others — all our candidates.

**VERDICT 4b — audit/02 line 907's open question is now RESOLVED. `effort` and `format` ARE siblings.**
audit/02 flagged the `effort` + `format` combination inside one `output_config` as the one construct not
verbatim-verified, and told the reader to drop `effort` on a 400.

The **Messages API reference** settles it. `output_config` is documented as *"Configuration options for the
model's output, such as the output format"* with exactly two child fields:

- `effort` — optional string, one of `low | medium | high | xhigh | max`
- `format` — optional `JSONOutputFormat` object

**They are optional siblings on the same object and may both be set.** Corroborated three ways:
the effort page's own examples use `output_config: {"effort": "medium"}`; the `claude-api` skill documents
`output_config={"effort": "high", "task_budget": {...}}` (proving multi-key `output_config`); and the typed SDKs
model `OutputConfig` as **one class carrying both** `Effort` and `Format` properties (C#:
`new OutputConfig { Effort = ..., Format = ... }`; Java: `OutputConfig.builder().effort(...).format(...)`). A
union type would be required if they were mutually exclusive; there is none.

**Phase 2 ships them together.** The audit/02 fallback (drop `effort` first on a 400) is retained in §(g) as
belt-and-braces, but is no longer expected to be needed.

**VERDICT 4c — prefill and prompt-only JSON remain FORBIDDEN.** Unchanged from audit/02 and Global Constraint 12.
Assistant prefill returns **400** on Opus 4.8. Prompt-only ("Return ONLY JSON") carries no guarantee.
`output_config.format` is the only mechanism used.

**VERDICT 4d — concurrency. PICK ONE: `AsyncAnthropic` + `asyncio.gather`.**

Reasoning, stated so Phase 2 does not relitigate it:
- `asyncio.to_thread` *also* requires a running event loop, so it buys no simplicity over `AsyncAnthropic` — and
  it burns three OS threads to do what one loop does with three sockets.
- `AsyncAnthropic` is first-class in the SDK and supports `async with` for deterministic teardown.
- `return_exceptions=True` surfaces per-vote failures without collapsing the other two — which matters, because
  the vote gate needs 2 of 3 and one network blip must not lose the arrival.

It runs inside `asyncio.run()` on a **daemon thread**, so it owns a fresh event loop for its lifetime and never
shares a loop with uvicorn. Exact shape:

```python
async def _vote_all(b64: str) -> list[dict]:
    """3 concurrent Claude OCR votes. Returns only the parsed successes."""
    async with anthropic.AsyncAnthropic() as client:      # reads ANTHROPIC_API_KEY
        results = await asyncio.gather(
            *(_one_vote(client, b64) for _ in range(VOTE_ROUNDS)),
            return_exceptions=True,
        )
    return [r for r in results if isinstance(r, dict)]


async def _one_vote(client: "anthropic.AsyncAnthropic", b64: str) -> dict:
    resp = await client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=256,
        # `thinking` deliberately OMITTED: on Opus 4.8 an omitted thinking field
        # runs WITHOUT thinking — correct for a latency-critical one-shot read.
        output_config={
            "effort": "low",
            "format": {"type": "json_schema", "schema": ROUTE_SCHEMA},
        },
        messages=[{
            "role": "user",
            "content": [
                # Image BEFORE text — Anthropic's documented preference.
                {"type": "image", "source": {
                    "type": "base64", "media_type": "image/jpeg", "data": b64}},
                {"type": "text", "text": PROMPT},
            ],
        }],
    )
    text = next(b.text for b in resp.content if b.type == "text")
    out = json.loads(text)
    # Docs: "Output may differ in capitalization from schema enum values."
    out["confidence"] = str(out.get("confidence", "")).lower()
    return out
```

Called from the sync world as `votes = asyncio.run(_vote_all(b64))`.

**VERDICT 4e — model id: `claude-opus-4-8`.** Retained from audit/02 unchanged. It is a latency-critical one-shot
extraction where a wrong answer is the single worst output the device can produce (Global Constraint: a plausible
wrong route number). Opus 4.8 has the most headroom on the exact ambiguity that bites here — `8` vs `6` vs `B`,
`1` vs `7` — at $0.0041/call. `claude-haiku-4-5` is rated *Fastest* and is a **one-string swap** if the stage
feels laggy; both strings ship in the file, one commented.

`effort: "low"` is correct here and is not a contradiction: reading two large high-contrast glyphs off a
pre-cropped 896 px blind is not an intelligence-sensitive task, and low effort is documented as *"Simpler tasks
that need the best speed and lowest costs."* The schema does the structural work; the model only has to read.

---

### Q5 — Mobile webapp API contract

**Evidence:** plan §Revision 2026-07-18b §2, plan §Camera and transport (line ~689), plan Contract A (line ~213),
Contract B (line ~257); `app/app/lib/contract.ts` (read — confirmed to still hold the **old** speech-to-braille
types `Mode`/`PullResponse`/`Choice`/`KEYWORD_MAX`, so the plan's Contract B block is authoritative);
`app/app/lib/redis.ts` (read — MSET-then-INCR ordering confirmed at `:27-29`).

**VERDICT 5a — the endpoint serves a browser, so three things change vs audit/02's laptop-client assumption.**

1. **CORS is mandatory** (Q2d). Not optional, not "nice to have" — without it the browser never sends the POST.
2. **`canvas.toDataURL("image/jpeg", 0.85)` returns a data URL**, i.e. `data:image/jpeg;base64,/9j/…`, **not** bare
   base64. The plan's Contract A example shows bare base64 starting `/9j/`. **Both must be accepted.** The server
   strips the prefix defensively — a Pydantic validator, given in §(c). This is a classic 3 a.m. bug and it is
   being designed out rather than discovered.
3. **`session_id` is required**, because with `max_containers` removed there is no longer one process that
   implicitly owns "the" camera.

**VERDICT 5b — Contract A field names are preserved verbatim.** `event`, `present`, `confidence`, `arrival_id`,
`reading`, `reading_ready`, `votes` — all snake_case, all exactly as the plan's Contract A block prints them
(plan lines 222–251). Two fields are **added**: `hazards` and `session_id`. Nothing is renamed and nothing is
removed. The frame-by-frame walk in the plan (lines 234–251) remains a valid trace of this endpoint.

**VERDICT 5c — hazards.** Sourced from the *same* YOLO forward pass (no second model, no extra latency), from the
non-bus half of the baked vocabulary. Written to `hazards:{session_id}` with **TTL 5 s**, which is the correct
semantics for a safety signal: if the phone stops posting, hazards evaporate in 5 s rather than going stale and
lying. `bearing` (`left`/`center`/`right`, from the box's horizontal centroid vs frame thirds) is also what
feeds the plan's experimental navigation block P11–P13 if the wear test passes — it costs nothing to emit now.

---

## (b) Deviations from the plan

### Deviation 1 — `max_containers` is REMOVED; the arrival state machine moves to Redis. **(Mandated)**

**Plan text overridden:** Global Constraint 10 (line 49) — *"the Modal container's own arrival state machine,
which is safe only because `max_containers=1` pins it to a single process"* — and audit/02 line 668
(`max_containers=1,  # exactly one process ⇒ globals are the state store`).

**Justification.** The plan is *correct* that module globals are only safe under `max_containers=1`. It is exactly
that correctness which makes `max_containers=1` load-bearing, and therefore a single point of failure: one
container is one process, one process is one crash away from the demo being over, with `min_containers=1` then
racing to cold-start a multi-GB torch image on stage. Removing the pin removes that. But it also removes the
safety property, so **the state must move somewhere that is atomic across processes.** That is the Lua script in
§(d).

**This is not a downgrade — the Lua version is strictly stronger than the globals version.** The fire-once latch
is the thing that must never double-fire (it gates the Claude spend and the user's BUS haptic). Under
`max_containers=1` it is protected by *"there is only one thread touching this dict"* — which is not even true,
since FastAPI runs sync handlers in a threadpool, so the globals version has a latent read-modify-write race
*within* the single container. `redis.call` inside an `allow-key-locking` script is genuinely atomic against
both. **The deviation fixes a bug the plan did not know it had.**

**Consequences Phase 2 must implement — all of them:**
- Arrival state → four Redis keys, mutated only by the Lua script (§d).
- **The Claude reading must ALSO move to Redis.** Container A latches the arrival and runs the vote; the phone's
  next poll may land on container B. Keys `bus:reading`, `bus:reading_for`, `bus:votes`. This is a direct
  consequence of the deviation and is the part most likely to be missed.
- `_MODEL` stays a per-container attribute (`self.model`). It is derived state, identical in every container,
  and needs no coordination.
- `min_containers=1` and `scaledown_window=1200` are **kept** — they are the warmth guarantee and are unrelated to
  the pin.

### Deviation 2 — detector is `yolov8s-world.pt` with a baked vocabulary, not `yolo26n.pt`. **(Recommended)**

**Plan text overridden:** §Latency budget row 4 (line 712) and §Architecture (line 7), both naming YOLO26n.

**Justification:** Q1e. The latency claim in the plan's row 4 (**10–30 ms, warm T4**) is *unchanged* —
`yolov8s-world` at 640 px on a T4 sits in the same band. What changes is that a failed detection on stage becomes
a 2-minute prompt-list edit instead of an unrecoverable dead end. `yolo26n.pt` + COCO index 5 is retained as the
documented fallback with both index maps given in §(e).

### Deviation 3 — `@modal.asgi_app()` replaces `@modal.fastapi_endpoint(method="POST")`. **(Forced)**

**Plan text overridden:** Contract A's endpoint annotation (line 216) and audit/02's `@modal.fastapi_endpoint`
snippet (line 672).

**Justification:** Q2d. `fastapi_endpoint` has no middleware parameter, and Revision §2 moved capture into a
browser. No CORS ⇒ no POST ⇒ no demo. This is forced by the revision, not chosen.

### Deviation 4 — the endpoint is a method on `@app.cls()`, not a bare `@app.function()`. **(Recommended)**

**Plan text overridden:** audit/02 line 773, which explicitly declined the class form as unverified.

**Justification:** Q2e — now verified verbatim. The class form is what makes `@modal.enter(snap=True/False)`
available, which is what makes CPU memory snapshots and the clean CPU-load → CUDA-move split possible. audit/02
called this *"the cleaner pattern"* and only avoided it for lack of verification; the verification now exists.

### Deviation 5 — `hazards` and `session_id` added to Contract A. **(Mandated by the Phase-1 brief)**

Additive only. Every existing Contract A field keeps its name, type and meaning.

### Deviation 6 — the prop capture source is the phone, at whatever resolution the phone gives.

**Plan text refined:** audit/02's hardcoded spec row *"Camera: Laptop webcam"* (line 936) and *"Camera capture:
1280 × 720"* (line 935) predate Revision §2. The capture page should request
`{ width: { ideal: 1280 }, height: { ideal: 720 } }` but **must not assume it gets it** — `getUserMedia`
constraints are advisory. The server therefore derives frame thirds from the *decoded* image size, never from a
hardcoded 1280. Noted so Phase 2 does not hardcode `1280` anywhere in the bearing math.

---

## (c) Exact Pydantic models

Pydantic **v2** (what `fastapi[standard]` installs). Copy-pasteable as-is.

```python
# vision/bus_vision.py — request/response models
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

# ---------------------------------------------------------------- REQUEST ---

class IngestRequest(BaseModel):
    """Contract A, phone → Modal. POST body.

    `frame_b64` accepts BOTH a bare base64 string ("/9j/4AAQ…") and a full data
    URL ("data:image/jpeg;base64,/9j/4AAQ…"). canvas.toDataURL() emits the
    latter; the plan's Contract A example shows the former. Both work.
    """

    frame_b64: str
    session_id: str = Field(min_length=1, max_length=64)
    force: bool = False          # true only for the disclosed SPACE key

    @field_validator("frame_b64")
    @classmethod
    def _strip_data_url(cls, v: str) -> str:
        if v.startswith("data:"):
            _, _, v = v.partition(",")     # drop "data:image/jpeg;base64,"
        return v.strip()

# --------------------------------------------------------------- RESPONSE ---

class Reading(BaseModel):
    """Claude's answer. Field names and the confidence enum are locked by the
    ROUTE_SCHEMA used in the structured-output call — keep them in sync."""

    route: str
    destination: str
    confidence: Literal["high", "low"]


class Hazard(BaseModel):
    """A non-bus detection from the SAME forward pass. `bearing` is the box's
    horizontal centroid against frame thirds, computed from the DECODED frame
    width — never a hardcoded 1280 (see Deviation 6)."""

    kind: Literal["person", "vehicle", "bicycle", "obstacle"]
    bearing: Literal["left", "center", "right"]
    confidence: float


class IngestResponse(BaseModel):
    """Contract A response. The first seven fields are VERBATIM from the plan
    (lines 222-229) — do not rename, reorder-rename, or camelCase them.
    `hazards` and `session_id` are the two additions."""

    # ---- Contract A, verbatim -------------------------------------------
    event: Literal["NONE", "BUS_ARRIVED", "BUS_GONE"]
    present: bool
    confidence: float                 # best bus-box confidence THIS frame
    arrival_id: int                   # increments once per arrival — fire-once latch
    reading: Optional[Reading]        # null until Claude answers
    reading_ready: bool
    votes: list[str]                  # Claude's raw route strings once answered
    # ---- additions -------------------------------------------------------
    hazards: list[Hazard] = []
    session_id: str
```

**Wiring into FastAPI** (inside the `@modal.asgi_app()` method, see §e):

```python
@web_app.post("/ingest", response_model=IngestResponse)
def ingest(req: IngestRequest) -> IngestResponse:   # sync def → FastAPI threadpool
    ...
```

> `def`, not `async def`. FastAPI runs sync path operations in a threadpool, so the blocking Upstash REST calls
> and the blocking YOLO forward pass never stall the event loop. This is deliberate and is what makes the
> per-thread lazy Redis client in §(e) correct.

---

## (d) Exact Lua script

Ship this as a module-level `ARRIVAL_LUA` string constant. **Do not reformat it** — the shebang must be the
first line, byte-for-byte.

```lua
#!lua flags=allow-key-locking
-- Bus-arrival state machine. Atomic across concurrent Modal containers.
-- Replaces the process-global _STATE dict that was only safe under
-- max_containers=1 (see spec 05 §(b) Deviation 1).
--
-- KEYS[1]  bus:hits        consecutive frames WITH a bus box >= CONF_MIN
-- KEYS[2]  bus:misses      consecutive frames WITHOUT one
-- KEYS[3]  bus:present     "0" | "1"   debounced presence
-- KEYS[4]  bus:arrival_id  monotonic; +1 exactly once per arrival (the latch)
--
-- ARGV[1]  seen             "1" if this frame has a qualifying bus box, else "0"
-- ARGV[2]  hits_to_arrive   integer, 2   (plan latency budget row 5, 2 fps)
-- ARGV[3]  misses_to_clear  integer, 4
-- ARGV[4]  ttl_seconds      integer, 900 — EVERY key expires, so no state
--                           survives between demo runs
-- ARGV[5]  force            "1" for the disclosed SPACE key, else "0"
--
-- RETURNS  { event, present, arrival_id }
--          event ∈ "NONE" | "BUS_ARRIVED" | "BUS_GONE"
--          present    0 | 1
--          arrival_id integer
--
-- Exactly one concurrent caller can observe the not-present → present
-- transition, therefore exactly one container ever receives "BUS_ARRIVED" and
-- exactly one Claude vote-set is spawned per arrival. That is the whole point.

local seen            = ARGV[1] == "1"
local hits_to_arrive  = tonumber(ARGV[2])
local misses_to_clear = tonumber(ARGV[3])
local ttl             = tonumber(ARGV[4])
local force           = ARGV[5] == "1"

local hits       = tonumber(redis.call('GET', KEYS[1]) or "0")
local misses     = tonumber(redis.call('GET', KEYS[2]) or "0")
local present    = (redis.call('GET', KEYS[3]) or "0") == "1"
local arrival_id = tonumber(redis.call('GET', KEYS[4]) or "0")

if seen then
  hits   = hits + 1
  misses = 0
else
  misses = misses + 1
  hits   = 0
end

local event = "NONE"

if force then
  -- Disclosed manual override: re-arm and fire regardless of history.
  present    = true
  arrival_id = arrival_id + 1
  hits       = hits_to_arrive
  misses     = 0
  event      = "BUS_ARRIVED"
elseif (not present) and hits >= hits_to_arrive then
  present    = true
  arrival_id = arrival_id + 1
  event      = "BUS_ARRIVED"
elseif present and misses >= misses_to_clear then
  present    = false
  event      = "BUS_GONE"
end

-- SET ... EX writes value and TTL in one command, so a TTL can never be
-- orphaned from its write. bus:hits carries a TTL — required by the plan's
-- Global Constraints.
redis.call('SET', KEYS[1], tostring(hits),          'EX', ttl)
redis.call('SET', KEYS[2], tostring(misses),        'EX', ttl)
redis.call('SET', KEYS[3], present and "1" or "0",  'EX', ttl)
redis.call('SET', KEYS[4], tostring(arrival_id),    'EX', ttl)

return { event, present and 1 or 0, arrival_id }
```

**Invocation — exact call, exact key order:**

```python
ARRIVAL_KEYS = ["bus:hits", "bus:misses", "bus:present", "bus:arrival_id"]

HITS_TO_ARRIVE  = 2     # plan latency budget row 5: 2 consecutive frames @ 2 fps
MISSES_TO_CLEAR = 4     # ~2 s of absence before re-arming
STATE_TTL_S     = 900   # 15 min — nothing survives between demo runs

event, present, arrival_id = _redis().eval(
    ARRIVAL_LUA,
    keys=ARRIVAL_KEYS,
    args=[
        "1" if seen else "0",
        str(HITS_TO_ARRIVE),
        str(MISSES_TO_CLEAR),
        str(STATE_TTL_S),
        "1" if req.force else "0",
    ],
)
present = bool(int(present))
arrival_id = int(arrival_id)
```

> Redis returns Lua numbers as integers and Lua strings as strings, but the REST transport can hand back either
> `int` or `str` depending on the value. **Coerce both `present` and `arrival_id` explicitly**, exactly as above.

**Reading keys — written by the OCR worker, read on every ingest. No Lua needed: exactly one writer per
arrival, guaranteed by the latch.**

| Key | Type | TTL | Written by |
|---|---|---|---|
| `bus:reading` | JSON object or absent | 900 s | OCR worker |
| `bus:reading_for` | int (arrival_id the reading belongs to) | 900 s | OCR worker |
| `bus:votes` | JSON array of route strings | 900 s | OCR worker |
| `hazards:{session_id}` | JSON array of `Hazard` | **5 s** | every ingest |

`reading_ready` is computed, never stored: `reading_for == arrival_id and arrival_id > 0`.

**Ordering rule inherited from `app/app/lib/redis.ts:27-29` — preserve it.** That file's comment explains the
debugged race: *payload first, signal last*. The same invariant applies to the OCR worker: **write `bus:reading`
and `bus:votes` BEFORE `bus:reading_for`.** `reading_for` is the signal that flips `reading_ready` true; if it
lands first, a poll in between sees `reading_ready: true` with a null reading, and the browser posts a `NUMBER`
pattern with an empty route. Same bug, same fix, different keys.

---

## (e) Exact `@app.cls` decorator and the snap split

### Image build — bakes the vocabulary so CLIP is never needed at runtime (Q1b)

```python
import modal

app = modal.App("bus-vision")

BUS_PROMPTS    = ["bus", "double decker bus", "bus front"]
HAZARD_PROMPTS = ["person", "car", "bicycle", "motorcycle", "truck"]
VOCAB          = BUS_PROMPTS + HAZARD_PROMPTS            # indices 0..7

BUS_IDX = set(range(len(BUS_PROMPTS)))                   # {0, 1, 2}
HAZARD_KIND = {3: "person", 4: "vehicle", 5: "bicycle",
               6: "vehicle", 7: "vehicle"}               # index → Hazard.kind

BAKED_WEIGHTS = "/model/bus_world.pt"


def _bake_detector():
    """Runs at IMAGE BUILD time, where the network is available.

    set_classes() downloads CLIP into ~/.cache/clip to encode the prompts
    (ultralytics#11681). Doing it here means the RUNNING container never
    imports CLIP and never fetches weights. save() writes the pre-encoded
    offline vocabulary into the checkpoint.
    """
    from ultralytics import YOLO
    m = YOLO("yolov8s-world.pt")     # auto-downloads from ultralytics/assets
    m.set_classes(VOCAB)
    m.save(BAKED_WEIGHTS)


IMAGE = (
    modal.Image.debian_slim(python_version="3.11")
    # verbatim from the Ultralytics Modal quickstart — ultralytics won't import without them
    .apt_install("libgl1", "libglib2.0-0")
    .pip_install(
        "ultralytics",
        "anthropic==0.117.0",       # pinned — Global Constraint 11
        "upstash-redis",
        "pillow",
        "fastapi[standard]",
    )
    .run_commands("mkdir -p /model")
    .run_function(_bake_detector)   # verified: modal.Image.run_function
)
```

### The class — decorator flags, verbatim

```python
@app.cls(
    image=IMAGE,
    gpu="T4",
    secrets=[
        modal.Secret.from_name("anthropic"),   # → ANTHROPIC_API_KEY
        modal.Secret.from_name("upstash"),     # → UPSTASH_REDIS_REST_URL + _TOKEN
    ],
    min_containers=1,          # the warmth guarantee — never scale to zero
    scaledown_window=1200,     # 20 min, the documented maximum (range 2 s – 20 min)
    timeout=120,               # seconds; Modal's default is 300
    enable_memory_snapshot=True,   # CPU snapshots: GA
    # ---- GPU snapshots are ALPHA. DO NOT ENABLE FOR THE DEMO. -------------
    # The exact syntax, one uncomment away, recorded so nobody has to look it up:
    #   experimental_options={"enable_gpu_snapshot": True},
    # Documented incompatibilities: multi-GPU, non-CUDA, torch.compile; and
    # "most functions require modifications". min_containers=1 already buys the
    # cold-start win for free. See spec 05 §(a) Q2b.
    #
    # NOTE: there is deliberately NO max_containers. See §(b) Deviation 1 —
    # the arrival state machine now lives in Redis (§d), which is atomic across
    # containers, so pinning to one process is no longer required and no longer
    # desirable. Do not add it back.
)
class BusVision:
    ...
```

### The `snap=True` / `snap=False` split — what goes in each

```python
    # ======================= SNAPSHOTTED PHASE =========================
    # Runs ONCE, before the memory snapshot is captured.
    # ALLOWED:  local disk reads, CPU model load, expensive imports.
    # FORBIDDEN: any CUDA call (no GPU is attached here without
    #            enable_gpu_snapshot), any network client, any socket,
    #            anything reading a secret, anything requiring uniqueness
    #            (RNG seeds, generated ids) — the snapshot replays it
    #            identically into every restored container.
    @modal.enter(snap=True)
    def load_model(self):
        from ultralytics import YOLO
        # Local file, baked at image build. No download, no CLIP, no network.
        self.model = YOLO(BAKED_WEIGHTS)          # loads to CPU by default

    # ====================== POST-RESTORE PHASE =========================
    # Runs after EVERY restore. GPU and network are live here.
    @modal.enter(snap=False)
    def activate(self):
        self.model.to("cuda")

        # Warm the CUDA kernels so the first real frame isn't the slow one.
        import numpy as np
        self.model(np.zeros((640, 640, 3), dtype="uint8"), verbose=False)

        # Pay the structured-output grammar-compilation cost off the critical
        # path. Docs: first use of a schema compiles a grammar; it is then
        # cached for 24 h. Failure here must NOT kill the container.
        try:
            self._prime_schema()
        except Exception as exc:                 # noqa: BLE001
            print(f"[warm] schema prime skipped: {exc}")
```

> **The Redis client is constructed in NEITHER hook.** It is created lazily, per thread:
>
> ```python
> _TLS = threading.local()
>
> def _redis():
>     """One Upstash client per thread, created on first use.
>
>     Two problems solved at once:
>       1. It is never constructed during snap=True, so no network client is
>          ever captured in the memory snapshot (§(a) Q2c).
>       2. FastAPI runs sync path operations in a threadpool and the OCR
>          worker is its own thread; a per-thread client removes every
>          shared-HTTP-session question. Constructing an Upstash REST client
>          is cheap — it is a URL, a token, and a session.
>     """
>     r = getattr(_TLS, "redis", None)
>     if r is None:
>         from upstash_redis import Redis
>         r = Redis.from_env()          # UPSTASH_REDIS_REST_URL + _REST_TOKEN
>         _TLS.redis = r
>     return r
> ```

### The ASGI app — CORS, and the one route

```python
    @modal.asgi_app(label="bus-vision")
    def web(self):
        from fastapi import FastAPI
        from fastapi.middleware.cors import CORSMiddleware

        web_app = FastAPI()

        # MANDATORY. The capture page is served from the Vercel origin and POSTs
        # cross-origin to *.modal.run. Without this the browser blocks the
        # preflight and no frame ever arrives. This is the reason we use
        # @modal.asgi_app() rather than @modal.fastapi_endpoint() — the latter
        # has no middleware parameter. See §(b) Deviation 3.
        web_app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=False,     # must be False when allow_origins=["*"]
            allow_methods=["*"],
            allow_headers=["*"],
        )

        @web_app.get("/health")
        def health():
            return {"ok": True}

        @web_app.post("/ingest", response_model=IngestResponse)
        def ingest(req: IngestRequest) -> IngestResponse:
            return self._handle(req)     # sync — FastAPI runs it in a threadpool

        return web_app
```

**Deployed URL:** `https://<workspace>--bus-vision.modal.run/ingest`
(`modal serve` → `…--bus-vision-dev.modal.run`). **Phase 2 pastes the URL printed by `modal deploy` into
`MODAL_URL` — it does not construct it from this pattern.**

### `_handle` — the required order of operations

Phase 2 implements exactly this sequence. The ordering is load-bearing.

1. Decode `req.frame_b64` → PIL RGB image. Record `W, H` **from the decoded image**, never a constant.
2. One forward pass: `result = self.model(frame, verbose=False)[0]`.
3. Partition boxes by `int(box.cls)`: indices in `BUS_IDX` → bus candidates; indices in `HAZARD_KIND` → hazards.
   `seen = best_bus_conf >= CONF_MIN` where `CONF_MIN = 0.35`.
4. **`eval` the Lua script** (§d) → `event, present, arrival_id`.
5. `SET hazards:{session_id} <json> EX 5`.
6. If `event == "BUS_ARRIVED"`: crop the blind (top 30 % of the bus box, resize long edge to 896, JPEG q92 —
   geometry unchanged from audit/02), then start the OCR daemon thread. **Do not block on it.**
7. `MGET bus:reading, bus:reading_for, bus:votes` → build `reading`, `reading_ready`, `votes`.
8. Return `IngestResponse`.

**OCR worker (daemon thread):**
```
votes = asyncio.run(_vote_all(b64))          # §(a) Q4d — AsyncAnthropic + gather
→ apply the vote gate: VOTE_ROUNDS = 3, VOTES_NEEDED = 2 agreeing high-confidence readings
→ abandon silently if bus:arrival_id has since changed (a newer arrival superseded this one)
→ write bus:votes and bus:reading FIRST, then bus:reading_for  ← payload before signal (§d)
```

### Fallback index map (if Deviation 2 is reverted to `yolo26n.pt`)

```python
# Swap BAKED_WEIGHTS → "yolo26n.pt", delete _bake_detector + run_function, and:
BUS_IDX     = {5}                                        # COCO: 5 = bus
HAZARD_KIND = {0: "person", 1: "bicycle", 2: "vehicle",
               3: "vehicle", 7: "vehicle"}               # person/bicycle/car/motorcycle/truck
```

---

## (f) Environment variables

| Name | Where it lives | Consumed by | Notes |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Modal secret **`anthropic`** | `anthropic.AsyncAnthropic()` — zero-arg, reads env | Already in `.env`. **Never printed, never logged, never returned in a response.** Creation command: `modal secret create anthropic ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"` |
| `UPSTASH_REDIS_REST_URL` | Modal secret **`upstash`** | `Redis.from_env()` | Already in `.env`. Exact name — `from_env()` looks for this literal string |
| `UPSTASH_REDIS_REST_TOKEN` | Modal secret **`upstash`** | `Redis.from_env()` | Already in `.env`. Exact name |
| `MODAL_URL` | Vercel project env / capture-page query param | the browser capture page only | **The ESP32 never sees this** (plan §Camera and transport). Value = the URL printed by `modal deploy`, plus `/ingest`. Expose to the browser as `NEXT_PUBLIC_MODAL_URL` if it is read at render time |

**The `upstash` secret must be created — it does not exist yet.** Only `anthropic` is referenced in audit/02.
Phase 2's first Modal command is:

```bash
modal secret create upstash \
  UPSTASH_REDIS_REST_URL="$UPSTASH_REDIS_REST_URL" \
  UPSTASH_REDIS_REST_TOKEN="$UPSTASH_REDIS_REST_TOKEN"
```

No other environment variable is read by the Modal service. Route `"88"`, destination `"Clapham Common"`,
`ROUTE_RE = r"^[0-9]{1,3}$"`, `HITS_TO_ARRIVE = 2`, `CONF_MIN = 0.35`, `VOTE_ROUNDS = 3`, `VOTES_NEEDED = 2` and
the model id are all **hardcoded module constants** — Global Constraint 2 forbids configuration knobs.

> `ROUTE_RE` is enforced at `/api/event` on the Vercel side (plan line 565), not in Modal. Modal returns Claude's
> raw `route` string verbatim so the debug screen can show what was actually read; the relay is what rejects a
> non-digit route and substitutes `pattern: "UNKNOWN"`. Do not filter it twice — a route silently dropped in
> Modal is invisible on the debug screen, which is the failure mode the plan explicitly designed against.

---

## (g) Residual risk

Ordered by expected cost × probability.

| # | Risk | Why it survives | Mitigation / trip-wire |
|---|---|---|---|
| 1 | **`@app.cls` + `enable_memory_snapshot` + `@modal.asgi_app` is a composition, not a quoted example.** Both halves are documented on `@app.cls()`, but no single doc page shows all four decorators together. | Q2e. Verified separately; never verified jointly. | **60-second smoke test, run FIRST, before any application code:** deploy a stub class with the four decorators and a `/health` route that returns `{"ok": True}`; `curl` it. If it fails, delete `enable_memory_snapshot=True` — `min_containers=1` is the real cold-start guarantee and nothing else in the spec depends on the snapshot. |
| 2 | **Frame reordering across containers.** Without `max_containers=1`, frames N and N+1 can be handled concurrently and reach the Lua script out of order. | Lua gives atomicity, not ordering. | Mostly self-correcting: the ARRIVE path counts hits, and 2 hits in either order is still 2 hits. A swapped hit/miss resets the counter — a false negative that clears on the next 500 ms frame. **Accepted.** If it bites in rehearsal, add `min_containers=1, max_containers=2` rather than reverting to 1. |
| 3 | **`bus:arrival_id` resets to 0 after the 900 s TTL** while the relay still holds `arrivalId: 1`. | Every key expires by design (Global Constraint: no state between demo runs). | Harmless: the ESP32's edge-trigger is `seq` (a separate monotonic Redis key with no TTL, per `app/app/lib/redis.ts`), never `arrivalId`. `arrivalId` is carried for the debug screen. **Do not make the firmware trigger on `arrivalId`.** |
| 4 | **Two phones posting concurrently share the arrival latch.** Arrival keys are global (`bus:*`); only hazards are session-scoped. | Deliberate — Contract A's `arrival_id` is global and there is one ESP32. | One-line fix if ever needed: prefix the four arrival keys with `session_id`. Not done now because it would make `arrival_id` ambiguous to the single relay. |
| 5 | **`effort` + `format` together could still 400** despite the API reference listing them as siblings. | Q4b resolves this from the reference, but no doc *example* shows the two combined. | If a 400 mentions `output_config`: **drop `effort` first** and re-test. It is the non-essential half — the schema does the real work. (audit/02's original guidance, retained.) |
| 6 | **CLIP download at image build.** `set_classes()` fetches CLIP; a build-time network failure fails the image build. | Q1b — unavoidable, it is where the encoding happens. | Fails loudly at build, not at 3 a.m. on stage. Build the image **tonight**. If it fails, take the `yolo26n.pt` fallback in §(e) — 6 lines, no build-time network needed beyond the weights. |
| 7 | **`yolov8s-world` may not fire on the prop** at all. | The prop is a *photo of a bus*, not a bus. No detector is guaranteed on a photo-of-a-photo. | This is exactly why Deviation 2 exists — edit `BUS_PROMPTS`, rebuild (~2 min). **Test against the actual prop before the print starts**, not after. The `force: true` SPACE key is the disclosed last resort and already exists in Contract A. |
| 8 | **Reading written by container A, polled from container B** during the ~1.5–3 s Claude window. | Deviation 1's main consequence. | Fully handled *if* Phase 2 implements step 7 of `_handle` and the payload-before-signal ordering. **This is the most likely thing to be skipped.** Trip-wire: if `reading_ready` ever goes true with `reading: null`, the ordering was inverted. |
| 9 | **`allow-key-locking` rejects a key not in `KEYS`.** | Documented: *"Dynamic keys are not allowed."* | All four keys are declared, and no key name is computed inside the script. If the error appears, something added a `redis.call` on an undeclared key — do not "fix" it by removing the shebang; add the key to `KEYS`. |
| 10 | **iOS Safari camera permission** — reset or denied mid-demo. | Plan §Camera and transport already flags this as the accepted residual risk of Revision §2. | Out of this spec's scope, restated because it is the highest-probability stage failure in the whole vision path. **Rehearse the grant flow on the actual demo phone.** |

**Not a risk, recorded to stop it being re-raised:** the removal of `max_containers` does *not* make the Claude
spend unbounded. The Lua latch guarantees exactly one container observes each `BUS_ARRIVED`, so exactly one
3-vote set runs per arrival — the same bound the single-process version had, now enforced rather than assumed.
