# 06 — Phase 2 Track A: the Modal vision service

**Author:** Phase 2 Track A (implementation)
**Date:** 2026-07-18
**Implements:** `audit/bus-stop-situational-awareness/05-research-and-spec.md` (the Phase 1 spec)
**Files written:** `vision/bus_vision.py`, `vision/requirements.txt`, this file. Nothing else.

---

## 0. Scope

Build the Modal vision service and its local dependency pin. Specifically:

- the YOLO-World detector with its vocabulary baked at image-build time,
- the Redis Lua arrival state machine that replaces the process-global `_STATE` dict,
- the three concurrent Claude OCR calls and the 2-of-3 confidence gate,
- the FastAPI/CORS HTTPS surface and the Contract A request/response models,
- hazard routing.

**Out of scope, untouched:** everything under `app/`, `firmware/`, `cad/`; every pre-existing file in
`audit/`; and `vision/bus_client.py`, which a parallel agent owns. `vision/read_blind.py` — authorised by
spec §0 but not assigned to this track — was not written.

**No web research was performed.** No `WebSearch`, no `WebFetch`. Every external-API claim in the code
traces to spec 05 or, where 05 says "unchanged from audit/02", to
`02-track-2-modal-claude-grounding-and-hardcoded-spec.md`. That is the whole of this track's grounding.

---

## 1. What was built

### `vision/bus_vision.py`

| Piece | Spec section | Note |
|---|---|---|
| `IMAGE` + `_bake_detector` | §(a) Q1, §(e) | `yolov8s-world.pt`; `set_classes(VOCAB)` + `save()` at **image-build time** via `Image.run_function`, so the running container never imports CLIP and never fetches weights |
| `ARRIVAL_LUA` | §(d) | **Byte-for-byte identical to the spec**, verified by diff (§5 below). Shebang first line; TTL on all four keys including `bus:hits` |
| `_redis()` | §(e) | Lazy, per-thread via `threading.local()`. Constructed in **neither** `@modal.enter` hook |
| `_vote_all` / `_one_vote` | §(a) Q4d | `AsyncAnthropic` + `asyncio.gather(..., return_exceptions=True)`, `output_config={"effort","format"}`, `json_schema`, image-before-text. No prefill, no prompt-only JSON |
| `_ocr_worker` | §(e), audit/02 §failure-path | Daemon thread; 2-of-3 gate; supersede check; **payload before signal** |
| `BusVision` | §(e) | Four decorators verbatim, `snap=True`/`snap=False` split exactly as specified, **no `max_containers`** |
| `web()` | §(a) Q2d, §(b) Dev 3 | `@modal.asgi_app(label="bus-vision")` + `CORSMiddleware(allow_origins=["*"], allow_credentials=False)`; `/health` and `/ingest` |
| `_handle` | §(e) | The 8 steps in the specified order. Decode → forward pass → partition → Lua → hazards → latch/crop/thread → MGET readback → Contract A |
| Pydantic models | §(c) | Verbatim, including the `data:image/jpeg;base64,` stripping validator |

Hardcoded module constants per §(f): `CONF_MIN=0.35`, `HITS_TO_ARRIVE=2`, `MISSES_TO_CLEAR=4`,
`STATE_TTL_S=900`, `HAZARD_TTL_S=5`, `VOTE_ROUNDS=3`, `VOTES_NEEDED=2`,
`CLAUDE_MODEL="claude-opus-4-8"` (with `claude-haiku-4-5` commented one line below),
`ROUTE_RE=r"^[0-9]{1,3}$"`, `PROP_ROUTE="88"`, `PROP_DEST="Clapham Common"`.

### `vision/requirements.txt`

Pins `modal==1.5.2` and `anthropic==0.117.0` exactly, plus `pydantic>=2.0`. It is the **local** deploy
environment only — the container's dependencies are declared in code as `IMAGE`, and the file says so.
`pydantic` is required locally because module-level code in a Modal app runs on both sides: once on the
deploying machine while Modal serialises the app, and again in the container.

---

## 2. Deviations from the spec

**None that change specified behaviour.** Three additions that the spec left as gaps rather than as
decisions are recorded here rather than in §3, because they are code the spec did not write:

### D1 — `_prime_schema()` was defined; the spec calls it but never defines it

§(e)'s `activate()` calls `self._prime_schema()` inside a `try`. No body is given anywhere in 05.
Implemented as a single throwaway `messages.create` with the **same `ROUTE_SCHEMA`** and a text-only
message. Justification: the spec's own stated purpose is "first use of a schema compiles a grammar; it
is then cached for 24 h" — the cache is keyed on the schema, not on the image, so a text-only prime
compiles the same grammar for a fraction of the tokens and none of the crop plumbing. It stays inside
the spec's `try/except`, so a failure prints and is ignored.

### D2 — the previous arrival's reading keys are cleared on `BUS_ARRIVED`

The spec's `_handle` step 6 does not mention clearing. This mirrors audit/02 lines 716–717
(`_STATE["reading"] = None; _STATE["votes"] = []` on latch), which the Redis port would otherwise drop.

Without it, the response for the `BUS_ARRIVED` frame carries **arrival N−1's route** in the `reading`
field with `reading_ready: false` — a stale route on the debug screen at the exact moment a human is
looking at it. It also closes the §(g) Risk 3 wrap-around window (if `bus:arrival_id` expires and
restarts at 1 while a `bus:reading_for` of 1 is still alive, `reading_ready` would go true against a
reading from the previous demo run).

Cleared **signal-first** — `bus:reading_for` → `"0"`, then `bus:reading` → `null`, then `bus:votes` →
`[]`. That is the deliberate mirror of payload-first-on-write: zeroing the signal makes `reading_ready`
false immediately, so no interleaved poll can ever see the old reading attached to the new arrival.

### D3 — signature-tolerant wrappers for `mget` and `set … EX`

See Ambiguity A2 below. `eval` is used **exactly** as §(a) Q3c verifies it, with no fallback.

---

## 3. Ambiguities hit, and the choice made

Per the Track A brief: where 05 is ambiguous, take the safest option, implement it, record it.

### A1 — `reading_ready: true` with `reading: null` is both a bug signature and a legitimate state

§(g) Risk 8's trip-wire says *"if `reading_ready` ever goes true with `reading: null`, the ordering was
inverted."* But audit/02's failure path deliberately produces exactly that shape: when the 2-of-3 gate
fails, `reading` is null and `reading_for` is set, meaning *"answered, and the answer is unsure"* — which
is what the browser turns into the WAIT/UNKNOWN haptic. That path is described by audit/02 as the
strongest twenty seconds in the demo; deleting it was never an option.

**Choice:** keep the unsure state, and make the two cases distinguishable by writing `bus:reading`
**unconditionally** — as the JSON literal `null` when the gate fails — before the signal.

This is also a correctness fix, not just a diagnostic one. If the worker had simply skipped the write on
a gate failure, `bus:reading` would still hold the **previous** arrival's object while `bus:reading_for`
advanced to the new one, and the service would confidently deliver route 88 for a bus it could not read.
That is the single worst output this device can produce.

**Refined trip-wire for whoever debugs this at 3 a.m.:** `reading_ready: true` + `reading: null` is a bug
only if it is *transient* — i.e. if it later flips to a non-null reading **for the same `arrival_id`**. A
stable null is the honest "unreadable, held" verdict.

### A2 — the Python arity of `mget`, and the TTL kwarg on `set`, are not verified anywhere in 05

§(a) Q3c verifies the **scripting** signatures verbatim (`eval(script, keys=[], args=[])`) and explicitly
warns that the PyPI page and GitHub README omit scripting entirely — i.e. the spec author treated SDK
surface uncertainty as a live risk. But §(e) step 7 names `MGET` and §(d) names `SET … EX` without
pinning either Python signature, and this track is forbidden from checking.

**Choice:** probe once and memoise, in `_mget()` and `_set_ex()`. `mget` tries varargs → list → three
plain `get`s (a signature that cannot be wrong). `set` tries `ex=` → `set` + `expire`. ~25 lines total.
This is the same trade §(a) Q3d makes when choosing `eval` over `evalsha`: paying a trivial cost to
delete an entire failure class is correct at this deadline. `eval` itself gets no fallback, because it is
the one call 05 verified with a runnable example.

`_from_json` / `_to_int` are the same defensive posture on the read side — 05 §(d) already warns that the
REST transport can hand back `int` or `str`, and the Python SDK's JSON auto-deserialisation behaviour is
not documented in 05 either way, so both shapes are accepted.

### A3 — what goes into `votes`

§(d)'s key table says `bus:votes` is a "JSON array of route strings"; audit/02's globals version appended
only *high-confidence, non-empty* routes.

**Choice:** every raw route string from every successful parse, unfiltered. §(f) is explicit about the
principle — *"a route silently dropped in Modal is invisible on the debug screen, which is the failure
mode the plan explicitly designed against."* `votes` is debug-surface only (`DetectorState` in Contract
B); the wrist is driven by `reading`, which the gate still guards. Filtering here could only ever hide
information from the person debugging.

### A4 — `force: true` with no bus box

The SPACE key can fire `BUS_ARRIVED` through the Lua's force branch when there is no box to crop. §(e)
step 6 assumes a box exists.

**Choice:** send the **whole frame**, resized to a long edge of 896. A manual override means "detection
failed, just look" — cropping the top 30 % of a frame whose bus box was never found can remove the blind
entirely, whereas a full frame merely costs more visual tokens (audit/02: 1196 vs 320). Losing the answer
is worse than paying for it. The same path covers the defensive `best_box is None` case.

Note this also means `force: true` **always** sends the full frame, even when a box was found — a manual
override is a statement that the automatic geometry is not trusted.

### A5 — no confidence threshold is specified for hazards

§(a) Q5c specifies the source (same forward pass, non-bus half of the vocabulary) and the TTL, but no
threshold.

**Choice:** reuse `CONF_MIN = 0.35`. A hazard channel is a *safety* signal; a false positive is the
harmful direction, so the bus threshold is the conservative reuse. Hazards are additionally sorted by
confidence descending — lossless, deterministic, and it puts the most confident detection first for the
plan's experimental P11–P13 navigation block.

### A6 — `PROP_ROUTE` / `PROP_DEST` have no specified consumer

§(f) lists route `"88"` and destination `"Clapham Common"` among the hardcoded module constants but never
says what reads them.

**Choice:** they are **never substituted into a response**. They are used in exactly one place — a log
line comparing what Claude actually read against what the locked prop says, so a 3 a.m. session can see
`MISMATCH` rather than guessing. Emitting the expected value in place of the observed one would fake the
demo and destroy the "we would rather say nothing than say 87" moment that the vote gate exists to
produce. A prominent comment in the file says so.

### A7 — `ROUTE_RE` is mandated as a constant but forbidden as a filter

§(f) requires the constant and, in the same paragraph, states the regex is enforced at `/api/event` on
the Vercel side and must not be applied twice.

**Choice:** declared, commented, and deliberately unused, with the reason inline so nobody "fixes" the
dead constant by wiring it up.

---

## 4. Grounding notes

This track did **zero** independent research. Every external-API decision below is inherited, with the
spec section that closed it:

| Claim in the code | Grounded by |
|---|---|
| `set_classes()` needs CLIP at call time ⇒ must run at build, not request, time | §(a) Q1b (ultralytics#11681) |
| `yolov8s-world.pt` over `-m`, and over YOLOE | §(a) Q1c, Q1d |
| `enable_memory_snapshot=True` **without** `enable_gpu_snapshot` | §(a) Q2a, Q2b |
| No CUDA call, no network client, no secret read inside `snap=True` | §(a) Q2c |
| `@modal.fastapi_endpoint` has no middleware parameter ⇒ `asgi_app` is mandatory | §(a) Q2d |
| A web endpoint may be a method on `@app.cls()` | §(a) Q2e |
| `Image.run_function` exists and is the build hook | §(a) Q2f |
| `#!lua flags=allow-key-locking`; every key in `KEYS`; `SET … 'EX' ttl` permitted | §(a) Q3a, Q3b |
| `from upstash_redis import Redis`, `Redis.from_env()`, `eval(script, keys=[], args=[])` | §(a) Q3c |
| `eval`, not `evalsha` | §(a) Q3d |
| `output_config={"format": {"type": "json_schema", …}}`, `additionalProperties: false` | §(a) Q4a |
| `effort` and `format` are siblings and ship together | §(a) Q4b |
| Prefill returns 400; prompt-only JSON carries no guarantee | §(a) Q4c |
| `AsyncAnthropic` + `asyncio.gather(return_exceptions=True)` | §(a) Q4d |
| `claude-opus-4-8`, `effort: "low"`, `thinking` omitted | §(a) Q4e |
| CORS mandatory; both bare-base64 and data-URL accepted; `session_id` required | §(a) Q5a |
| Contract A field names preserved; `hazards` + `session_id` added | §(a) Q5b, §(b) Deviation 5 |
| `hazards:{session_id}`, TTL 5 s, `bearing` from frame thirds | §(a) Q5c |
| No `max_containers`; the reading must also live in Redis | §(b) Deviation 1 |
| Frame thirds from the **decoded** width, never 1280 | §(b) Deviation 6 |
| Payload before signal (`bus:reading`/`bus:votes`, then `bus:reading_for`) | §(d), mirroring `app/app/lib/redis.ts:27-29` |
| Crop geometry: top 30 % of the bus box, long edge 896, JPEG q92 | §(e) step 6 → audit/02 lines 720–729 |
| The 2-of-3 confidence gate and the "unsure ⇒ WAIT" failure path | audit/02 §The failure path (lines 1106–1127) |
| Prompt text and `ROUTE_SCHEMA` | audit/02 lines 559–586 |

**The `upstash` skill was invoked and is not a source for this file.** Its sub-skill index covers
`upstash-redis-js` (the TypeScript/JavaScript SDK) and has no Python Redis sub-skill. Where a skill and
the spec could have disagreed, the spec wins by the Track A brief — here they simply do not overlap, and
§(a) Q3c is the only grounding for the Python surface. The `claude-api` skill was also invoked; its
guidance (`claude-opus-4-8`, `output_config.format` over the deprecated `output_format`, prefill removed
on 4.6+, structured outputs incompatible with citations) **agrees** with spec §(a) Q4 on every point that
touches this file. Two places where the skill's *defaults* differ from the spec, with the spec followed
in both:

- The skill defaults to adaptive thinking "for anything remotely complicated". §(a) Q4d omits `thinking`
  deliberately — on Opus 4.8 an omitted field runs *without* thinking, which is correct for a
  latency-critical one-shot glyph read. **Spec followed: `thinking` is absent.**
- The skill's `max_tokens` guidance is ~16000 for non-streaming. §(a) Q4d specifies `max_tokens=256`,
  which is ample for a three-field JSON object. **Spec followed: 256.**

---

## 5. Verification performed

Static only. **No `modal deploy` and no `modal serve` were run** — no credentials, and it would cost
money.

### 5.1 `py_compile` — the required check

```
$ python3 --version
Python 3.12.13

$ python3 -m py_compile vision/bus_vision.py
$ echo "EXIT=$?"
EXIT=0
```

Combined stdout+stderr captured to confirm it is genuinely silent, not merely exit-0:

```
$ out=$(python3 -m py_compile vision/bus_vision.py 2>&1); echo "stdout+stderr: [${out}]"
stdout+stderr: []
```

**Exits 0, no output. Pass.**

### 5.2 Lua byte-for-byte diff against §(d)

The `ARRIVAL_LUA` constant was extracted from the source via `ast.literal_eval` (not regex) and diffed
against the ```` ```lua ```` block in spec 05 §(d):

```
LUA DIFF vs spec §(d): IDENTICAL
```

Also asserted programmatically:

```
ARRIVAL_LUA first line: '#!lua flags=allow-key-locking'
starts with shebang byte-for-byte: True
has TTL on bus:hits (KEYS[1] SET..EX): True
declares all 4 KEYS, no dynamic keys: ['KEYS[1]', 'KEYS[2]', 'KEYS[3]', 'KEYS[4]']
```

### 5.3 Prohibition scan

`grep -n "max_containers" vision/bus_vision.py` returns three hits — **all of them prose**: the module
docstring (line 22), a comment inside the Lua explaining what it replaced (line 252), and the
`DO NOT ADD IT BACK` note inside the `@app.cls(...)` call (line 687). **It appears nowhere as a
parameter.**

`prefill`, `"role": "assistant"`, and `evalsha` likewise appear only in comments stating that they are
forbidden or were rejected.

### 5.4 Decorator inventory (AST)

```
class BusVision decorators: ['app.cls']
  load_model: ['modal.enter(snap=True)']
  activate: ['modal.enter(snap=False)']
  web: ["modal.asgi_app(label='bus-vision')"]
```

Matches §(e) exactly.

### What was NOT verified, and cannot be without deploying

Everything runtime: that the image builds, that CLIP downloads at build time, that YOLO-World fires on
the prop, that the Lua is accepted by Upstash's engine, that `output_config` with both `effort` and
`format` returns 200, that `mget`'s first probed signature is the right one, and that the four decorators
compose. A green `py_compile` means the file parses. It means nothing else.

---

## 6. Residual risk

Spec §(g) Risks 1–10 all still stand. Six that this implementation changed the shape of, plus the two it
added:

### R1 (spec §(g) #1) — THE HEADLINE RISK. The four-decorator combination is a composition, never a quoted example.

`@app.cls(enable_memory_snapshot=True)` + `@modal.enter(snap=True)` + `@modal.enter(snap=False)` +
`@modal.asgi_app()` is **two documented facts that no single Modal doc page shows jointly**. §(a) Q2e is
explicit: the lifecycle page shows `@app.cls` + `@modal.enter` + a web-endpoint method; the snapshots
page shows `@app.cls(enable_memory_snapshot=True)` + `@modal.enter(snap=…)` + `@modal.method()`. Neither
shows all four. The composition is sound — both are documented properties of `@app.cls()` — but it is a
composition, not a quotation, and this file ships it unverified because Track A cannot deploy.

**Smoke test, 60 seconds, run it FIRST — before anything else, before any application code is exercised:**
deploy a stub class carrying the same four decorators with a `/health` route returning `{"ok": True}` and
`curl` it.

**Spec's stated fallback, verbatim in effect:** delete `enable_memory_snapshot=True`. Nothing else in the
spec or in this file depends on the snapshot — **`min_containers=1` is the real cold-start / warmth
guarantee**, and it is unaffected. If the snapshot flag is removed, the `snap=True`/`snap=False` split
collapses harmlessly (both hooks still run, in order, on every container start); the only cost is a
slower first boot, backstage, once.

### R2 (spec §(g) #6, #7) — the image build is the long pole and it needs the network

`_bake_detector` downloads `yolov8s-world.pt` *and* CLIP. A build-time network failure fails the image
build — loudly, at build, not at 3 a.m. on stage. **Build the image tonight.** If it fails, the
`yolo26n.pt` + COCO-index fallback is written out as a comment block directly under `IMAGE` in the source
(six lines). If the detector builds but will not fire on the prop, edit `BUS_PROMPTS` and rebuild —
that ~2-minute loop is the entire justification for §(b) Deviation 2, and it is why the prompt list is a
module constant rather than a literal.

### R3 (new) — the `mget` / `set` signature probes are unexercised

`_mget` and `_set_ex` fall back on `TypeError`. If the real SDK raises something *else* on an arity
mismatch — or, worse, accepts the wrong shape silently and returns garbage — the fallback never fires.
This is strictly safer than a bare call (which would hard-fail), but it is not proof. **First trip-wire
on the smoke test: post one frame and confirm the response's `arrival_id` increments across two frames
and that `votes` is a list, not `null`.** If `_MGET_STYLE` lands on `"get"` you pay two extra REST round
trips per frame (~40–120 ms) — visible in the latency budget but not fatal at 2 fps.

### R4 (spec §(g) #8, sharpened) — reading written by container A, polled from container B

Fully handled: `_handle` step 7 reads the three keys on every ingest, the OCR worker writes payload
before signal, and D2 clears them on latch. **Trip-wire, as refined in A1:** a *transient*
`reading_ready: true` with `reading: null` that later flips non-null for the same `arrival_id` means the
ordering was inverted. A *stable* null is the correct "unreadable, held" verdict and must not be
"fixed".

### R5 (spec §(g) #2) — frame reordering across containers

Unchanged and accepted. Lua gives atomicity, not ordering; two hits in either order are still two hits,
and a swapped hit/miss is a false negative that clears on the next 500 ms frame. If it bites in
rehearsal, add `min_containers=1, max_containers=2` — **do not** revert to a single container.

### R6 (spec §(g) #4) — two phones share the arrival latch

Unchanged. `bus:*` keys are global by design (Contract A's `arrival_id` is global and there is one
ESP32); only `hazards:{session_id}` is session-scoped. One-line fix if ever needed: prefix the four
arrival keys with `session_id`.

### R7 (new) — `_prime_schema` burns one Claude call per container restore

Trivial cost (~$0.004), off the critical path, and already wrapped in the spec's `try/except`. Noted only
so nobody is surprised by a Claude call in the logs before the first frame arrives.

### R8 (spec §(g) #5) — `effort` + `format` together could still 400

Retained belt-and-braces. If a 400 ever names `output_config`: **drop `effort` first**, in both
`_one_vote` and `_prime_schema`. It is the non-essential half; the schema does the real work.

### R9 (spec §(g) #3, #10) — unchanged and out of this file's hands

`bus:arrival_id` resetting after its 900 s TTL is harmless *provided the firmware edge-triggers on `seq`,
never on `arrivalId`* (D2 additionally closes the stale-reading window this used to open). And iOS
Safari camera permission remains the highest-probability stage failure in the whole vision path —
rehearse the grant flow on the actual demo phone.

---

## 7. Handoff notes

1. **Create the `upstash` secret — it does not exist yet.** Only `anthropic` is referenced in audit/02.
   The exact command is in §(f) and repeated in the module docstring.
2. **Paste the URL `modal deploy` prints** into `MODAL_URL` (+ `/ingest`). Do not construct it from the
   documented pattern — §(e) says so twice.
3. The browser consumes `reading_ready` + `reading`. `reading_ready: true` with `reading: null` is the
   **UNREADABLE** verdict → WAIT/UNKNOWN pattern. It is not an error and must not be retried.
4. `votes` is unfiltered and debug-only. `ROUTE_RE` is enforced at `/api/event`, not here.
5. `GET /health` exists and returns `{"ok": true}` — that is the smoke-test target for R1.
