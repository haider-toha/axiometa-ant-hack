# Track 3 — Current Service and Its Tuneable Constants

Read-only analysis of `vision/service.py`. No code was modified.

---

## Scope

**Read in full**
- `vision/service.py` — all 1121 lines, including every comment block.
- `plan/2026-07-18-bus-stop-situational-awareness.md:690-776` — "The Vision Pipeline" and "Latency budget".

**Read in part, to verify claims the service makes about the outside world**
- `www/src/app/capture/page.tsx:1-80, 138-260` — capture cadence, overlap guard, force one-shot, response handling.
- `www/src/app/api/event/route.ts:1-45` — whether `ROUTE_RE` is enforced there as `service.py:104-110` asserts.
- `audit/bus-stop-situational-awareness/06-track-a-modal-service.md` — prior audit of this same file (checked so as not to re-litigate settled decisions).
- `git show {527e5ca,b9a93e3,0314682}:vision/service.py` — constant values across the file's whole history.

**Excluded**
- `vision/client.py` (the laptop client; the plan cuts it at line 729).
- `app/`, `firmware/`, `cad/` — out of domain.
- Any runtime measurement. **No container was deployed and no request was timed.** Every latency figure below is either quoted from the plan, arithmetic over a stated frame rate, or explicitly flagged as unmeasured.

**Verification I wanted and could not do:** `ultralytics`, `anthropic`, `upstash_redis`, `modal`, and `torch` are all absent from this machine (checked via `python3 -c "import ..."` and the repo `.venv`). Claims that depend on library internals are labelled as hypotheses with a stated test, not as findings.

---

## Annotated constant table

| Name | Value | `file:line` | What it controls | Proposal | Risk | Expected impact |
|---|---|---|---|---|---|---|
| `HITS_TO_ARRIVE` | `2` | `vision/service.py:80` | Consecutive qualifying frames before the arrival latch fires (`ARRIVAL_LUA:424`) | **Leave alone.** The 500 ms belongs to the capture cadence, not this constant — see Verdict 1 | high if lowered | Lowering to 1 saves 500 ms (36% of Stage 1) and buys a ≥2.5 s unrecoverable-without-intervention failure mode |
| `MISSES_TO_CLEAR` | `4` | `vision/service.py:81` | Consecutive misses before the latch re-arms (`ARRIVAL_LUA:428`) | Leave alone | low | Off the first-arrival path entirely. Sets re-arm floor at 2.0 s @ 2 fps |
| `CONF_MIN` | `0.35` | `vision/service.py:70` | Gates two things: hazard emission (`:1022`) and `seen` for the state machine (`:1035`) | Leave alone; **it is observable in the field** — see Verdict 2 | medium if changed blind | No latency effect. Raising → missed arrivals; lowering → false latches, which cost ≥2.5 s each |
| `DRAW_CONF_MIN` | `0.20` | `vision/service.py:76` | Detector's own floor, passed as `conf=` to the forward pass (`:981`); gates what becomes a `Detection` at all | Leave the value. **Correct the comment's stated mechanism** — Verdict 2 | low | Display only. Zero device impact |
| `MAX_DETECTIONS` | `12` | `vision/service.py:77` | Payload cap, applied post-sort/post-dedupe (`:1033`) | Leave alone | low | Display only; ~1 kB of payload |
| `MAX_RAW_BOXES` | `30` | `vision/service.py:78` | `max_det` inside NMS (`:983`) | Leave alone | low | Marginal NMS time. Small tail risk in a crowded room (residual risk R4) |
| `DEDUPE_IOU` | `0.6` | `vision/service.py:79` | Display-collapse threshold in `_dedupe_for_display` (`:786`) | Leave alone | low | Display only — provably so, see "What is already optimal" |
| `STATE_TTL_S` | `900` | `vision/service.py:82` | TTL on all six state keys | Leave alone | low | Never expires mid-demo; arrival keys are rewritten every frame (`ARRIVAL_LUA:436-439`) |
| `HAZARD_TTL_S` | `5` | `vision/service.py:83` | TTL on `hazards:{session_id}` (`:1060`) | TTL is right; **the write it guards has no reader** — Finding F2 | low | 20-60 ms/frame on the critical path for zero consumers |
| `VOTE_ROUNDS` | `3` | `vision/service.py:85` | Concurrent Claude calls per arrival (`:646`) | Leave alone. Genuinely concurrent — Verdict 3 | — | Wall time = max(3), not sum(3). Reducing to 2 saves ~0 ms and breaks the gate |
| `VOTES_NEEDED` | `2` | `vision/service.py:86` | Agreeing high-confidence readings needed to emit (`:684`) | Leave alone | high if lowered | Protects against *variance*, not *bias* — the distinction drives Verdict 4 |
| `CLAUDE_MODEL` | `"claude-opus-4-8"` | `vision/service.py:88` | Model for both OCR (`:595`) and warm-up (`:913`) | **Keep Opus** — Verdict 4 | — | Swap saves ~$0.009/arrival, unmeasured latency, and moves error from variance to bias |
| *commented* `CLAUDE_MODEL = "claude-haiku-4-5"` | line 90 | `vision/service.py:89-90` | The documented fallback | **Do not use as written.** The comment "one string, nothing else" is false — Finding F1 | **high** | As written, every OCR call 400s, silently. Demo shows BUS ARRIVING then permanent UNKNOWN |
| `output_config.effort` | `"low"` | `vision/service.py:601` and `:916` | Thinking/spend depth on the structured call | Correct for Opus 4.8. **Load-bearing for F1** | low as-is | Right setting for a one-shot read; errors on `claude-haiku-4-5` |
| `thinking` | *omitted* | `vision/service.py:596-597` | Adaptive thinking off | Leave alone. Comment verified correct | low | Omitting `thinking` on Opus 4.8 runs without thinking — the latency-correct choice |
| `max_tokens` | `256` | `vision/service.py:595` | Output cap per vote | Leave alone | low | Ample for a 3-field object; well under the streaming threshold |
| `TEXT_TOP_FRACTION` | `0.30` | `vision/service.py:738` | Crop = top 30% of the target box (`:823`) | Leave alone | low | Safe over-crop for both "bus front" and full-bus boxes |
| `CROP_LONG_EDGE` | `896` | `vision/service.py:739` | Downscale ceiling (`:827-829`) | Leave alone | low | ~320-335 visual tokens. Never upscales (residual risk R5) |
| `CROP_JPEG_QUALITY` | `92` | `vision/service.py:740` | Crop encode quality (`:832`) | Leave alone | low | Correct direction for text legibility |
| `min_containers` | `1` | `vision/service.py:848` | Never scale to zero | **Leave alone. This is the whole cold-start answer** — Verdict 5 | — | Removes the cold-start problem entirely for a one-phone demo |
| `scaledown_window` | `1200` | `vision/service.py:849` | Idle life of containers *beyond* the minimum | Leave alone | low | Inert at one container. Would hold spare T4s 20 min if a burst ever spawned them |
| `timeout` | `120` | `vision/service.py:850` | Per-request ceiling | Leave alone | low | Handler is sub-second; 120 s is slack, not cost |
| `enable_memory_snapshot` | `True` | `vision/service.py:851` | CPU snapshot (GA) | Leave alone | low | Helps only restarts, which `min_containers=1` makes rare. Cheap insurance |
| *commented* `enable_gpu_snapshot` | lines 852-857 | `vision/service.py:854` | ALPHA GPU snapshot | **Leave commented.** The code's own comment already reaches the right verdict — Verdict 5 | **high if enabled** | Zero gain (nothing to cold-start), alpha-feature risk |
| *absent* `max_containers` | lines 859-861 | `vision/service.py:859-861` | Deliberately not set | Leave absent | — | The Lua state machine is atomic across containers; pinning is unnecessary |
| `_prime_schema()` | called | `vision/service.py:900`, `904-927` | One throwaway structured call to compile the grammar | Leave alone. Doc claim verified | low | Moves a one-time (24 h-cached) compile off the first arrival. Caveat in F1 |
| `EXTRA_PROMPTS` | 2 strings | `vision/service.py:143` | Hand-tuned prompts appended to LVIS | Leave alone | low | Zero runtime cost — baked at image build (`:211`, `:256`) |
| `_mget` / `_set_ex` probes | — | `vision/service.py:483-522` | Signature-tolerant Redis wrappers | Leave alone. One docstring overstatement, immaterial — see below | low | Zero steady-state cost (memoised at `:490`, `:497`, `:514`) |
| `ROUTE_RE` | declared, unused | `vision/service.py:110` | Deliberately not applied | Leave alone. **Claim verified** at `www/src/app/api/event/route.ts:39-40` | low | Correct as written |

---

## Verdicts and evidence

### 1. The Lua arrival state machine, and whether `HITS_TO_ARRIVE = 2` is right

**What it does.** `ARRIVAL_LUA` (`vision/service.py:370-442`) is a single atomic script over four keys. Per frame it reads `hits`/`misses`/`present`/`arrival_id` (`:402-405`), then:

- `seen` → `hits += 1`, `misses = 0`; else `misses += 1`, **`hits = 0`** (`:407-413`). Hits must be *consecutive*; one dropped frame resets the counter.
- `force` → unconditionally sets `present`, increments `arrival_id`, emits `TARGET_ARRIVED` (`:417-423`).
- else if `(not present) and hits >= hits_to_arrive` → latch, `arrival_id += 1`, `TARGET_ARRIVED` (`:424-427`).
- else if `present and misses >= misses_to_clear` → `TARGET_GONE` (`:428-431`).
- All four keys written with `SET ... EX` in one command each (`:436-439`).

The `not present` guard at `:424` is what makes the latch fire-once, and `arrival_id` is what binds a Claude vote-set to a specific arrival (`:712-714` supersede check). That is correct and I am not proposing to touch it.

**The 500 ms does not belong to this constant.** `HITS_TO_ARRIVE = 2` costs *one extra frame interval*. The interval is set at `www/src/app/capture/page.tsx:21` (`CAPTURE_MS = 500`), not in `service.py`. So hop 5's "+500 ms" is `1 × CAPTURE_MS`, and the constant that controls it lives in the web app.

**Lowering to 1 — quantified both directions.**

*Gain:* exactly 500 ms of the 1380 ms Stage 1 mean = **36%**. Real and large.

*Cost:* a false latch is not a transient annoyance, it is sticky.
- Once `present` is true, the real arrival produces **no event** — `:424` requires `not present`.
- Re-arming needs `MISSES_TO_CLEAR = 4` consecutive misses = 2.0 s @ 2 fps, then ≥1 more qualifying frame. **Recovery floor ≈ 2.5 s**, and only if the prop actually leaves frame.
- The crop is taken from whichever frame latched (`:1077-1079`), so a false latch during the prop-raise sweep crops a motion-blurred partial blind → gate fails → `reading=null`, `reading_ready=true` → the device shows UNKNOWN and *stays* there.

Break-even on latency alone is a false-positive rate of roughly 1 in 5 arrivals. But an averaged latency number does not capture the demo cost: the failure requires the presenter to lower and re-raise the prop on stage. The asymmetry is the point — **`HITS_TO_ARRIVE = 2` is correct and should not be lowered.**

The relevant risk is not random noise but the prop-raise sweep itself: `TARGET_LABELS` has four members (`:147`) and any one firing at ≥0.35 counts, and `EXTRA_PROMPTS` (`:143`) were deliberately tuned to be *sensitive* to this prop. Two consecutive qualifying frames is a meaningfully stronger gate than one during a sweep.

**The real lever, and why it may not exist.** Raising the capture rate shortens hop 5 *and* hop 1 while preserving the two-consecutive-frames requirement in count terms: at 3 fps, hop 5 costs 333 ms and hop 1's mean drops 250→167, saving ~250 ms; at 4 fps, ~375 ms (27% of Stage 1).

But `www/src/app/capture/page.tsx:142` is `if (inFlight.current) return;` — the loop is strictly serial, and a tick that fires mid-request is **dropped, not queued**. The effective rate is therefore `min(1/CAPTURE_MS, 1/RTT)`.

Two consequences, and the second is the important one:
1. If RTT > 500 ms on venue wifi, the loop is already RTT-bound and raising the nominal rate buys **nothing**.
2. **Hop 5's "+500 ms" is a floor, not a fixed cost.** It is `1 × max(CAPTURE_MS, RTT)`. If the real RTT is 700 ms, hop 5 is +700 ms and the plan understates Stage 1.

So the single highest-value measurement in this whole audit is the observed phone→Modal→phone round trip on the demo network. It decides whether the fps lever exists at all. I could not take it.

### 2. `CONF_MIN = 0.35` vs `DRAW_CONF_MIN = 0.20`

**What each gates.**
- `DRAW_CONF_MIN` is handed to the detector as `conf=` (`:981`). It is the floor below which a box never leaves the forward pass; every box above it becomes a `Detection` (`:1006`).
- `CONF_MIN` gates two device-facing things: hazard emission (`:1022`) and `seen`, which drives the state machine (`:1035`).

Note the ordering: `best_box`/`best_conf` are computed over all target boxes *without* a `CONF_MIN` filter (`:1003-1004`), and `CONF_MIN` is applied once at `:1035`.

**Is the comment's reasoning sound? No — and this is a comment/reality disagreement.** `vision/service.py:72-75` claims open-vocabulary scores "spread thinner across 1203 classes than across 8." That is softmax reasoning. YOLOv8's classification branch is trained with BCE and applies a **per-class sigmoid** at inference; YOLO-World's contrastive head produces a scaled cosine similarity fed through the same sigmoid. Scores do not sum to 1, so adding classes does not mechanically divide probability mass.

There *is* a real effect pointing the same way — open-vocabulary detectors are trained on noisy region-text pairs and are systematically less confident in absolute terms than closed-vocabulary YOLO, which is why the ultralytics YOLO-World examples use thresholds nearer 0.1-0.25 than 0.25-0.5. **So the value is defensible and the stated mechanism is not.** I am not proposing to change 0.20; I am proposing to stop citing an unsound reason for it, because that reason is what makes the next issue invisible.

*(Caveat: `ultralytics` is not installed here, so the sigmoid claim is from knowledge of the library rather than a source read. It is falsifiable in one line — see residual risk R2.)*

**Is 0.35 calibrated for the prop, or inherited?** Git settles this. `CONF_MIN = 0.35` is byte-identical across every commit that has ever contained this file (`527e5ca`, `b9a93e3`, `0314682`) — as is every other constant in the table above. Nothing here has ever been revised in response to a measurement. And `_resolve_vocab`'s docstring (`:216-221`) records that an earlier 8-class version existed.

That produces a specific internal inconsistency: when the vocabulary went wide, a *new* threshold (`DRAW_CONF_MIN = 0.20`) was introduced to compensate for open-vocabulary calibration, but `CONF_MIN` was left at its pre-existing value. If the calibration argument is true, it applies to the arrival threshold too.

**What breaks in each direction.** Too high → the prop never reaches 0.35, `seen` is never true, no arrival ever fires, and the demo is dead. Too low → false latches, each costing ≥2.5 s per Verdict 1.

**Why I am still not proposing a change.** The service already makes this observable: `IngestResponse.confidence` is `round(best_conf, 3)` (`:1113`) — the best *target* confidence for the frame, **even when it is below `CONF_MIN`** — and the phone forwards it to the monitor (`www/src/app/capture/page.tsx:176`). So a rehearsal frame reading `0.31` tells you immediately that you are just under the bar. That is a better instrument than any number I could pick from a desk. **Leave 0.35; read the number during rehearsal.**

### 3. `VOTE_ROUNDS = 3` — are the votes genuinely concurrent?

**Yes. Definitively, and the plan's hop 13 claim is delivered by the code.** The full chain:

1. `vision/service.py:1085-1087` — `threading.Thread(target=_ocr_worker, ..., daemon=True).start()`, never joined. The `/ingest` response is not blocked.
2. `vision/service.py:665` — `votes = asyncio.run(_vote_all(b64))`, a fresh event loop on that thread.
3. `vision/service.py:644` — `async with anthropic.AsyncAnthropic() as client:` — the genuinely async client, not the sync one.
4. `vision/service.py:645-648` — `await asyncio.gather(*(_one_vote(client, b64) for _ in range(VOTE_ROUNDS)), return_exceptions=True)`. `gather` schedules all three coroutines as tasks immediately.
5. `vision/service.py:594` — each `_one_vote` awaits `client.messages.create(...)` on `AsyncAnthropic`, i.e. a real async HTTP request.

Three requests are in flight simultaneously on one loop. Wall time is `max` of the three, not the sum. The plan's "saves 3-6 s versus sequential" (line 767) is claimed *and* implemented. `return_exceptions=True` correctly prevents one network blip from collapsing the other two (`:650-653`), which matters because the gate needs 2 of 3.

**One real but modest cost.** The `AsyncAnthropic` client is constructed *inside* `_vote_all` (`:644`) and destroyed by the `async with` on exit. It is created fresh per arrival, on a fresh thread, in a fresh event loop, so no connection is ever reused between arrivals. Each arrival pays three cold TLS handshakes to `api.anthropic.com` — order 100-200 ms depending on region, i.e. roughly 3-5% of the 3800 ms Stage 2 mean. `_prime_schema` does not help: it builds a *separate* synchronous `anthropic.Anthropic()` (`:911`) with its own pool.

I am **not** recommending a fix. A module-level `AsyncAnthropic` cannot be reused across `asyncio.run()` calls — the loop is closed each time and httpx's client holds loop-bound resources. Fixing it properly means keeping a long-lived loop/thread or moving to the sync client plus a thread pool, both of which are structural changes to the one part of the file that currently has no failure modes. **Bad risk/reward for ~150 ms. Measure before touching it, if ever.**

### 4. Is `claude-opus-4-8` necessary for this OCR task?

Model facts below are from the `claude-api` skill, not memory.

| | Opus 4.8 (`claude-opus-4-8`) | Haiku 4.5 (`claude-haiku-4-5`) |
|---|---|---|
| Input / output per 1M | $5.00 / $25.00 | $1.00 / $5.00 |
| Context | 1M | 200K |
| `output_config.effort` | supported (`low`…`max`) | **errors** |
| `output_config.format` (json_schema) | supported | supported |

**Cost is not an argument.** At ~520 input tokens (320 visual + ~200 prompt) and ~45 output: Opus ≈ $0.0037/vote → **$0.011 per arrival**; Haiku ≈ $0.00075/vote → **$0.0022 per arrival**. A delta of under one cent per arrival. This corroborates the plan's own figure (`3 × $0.0041`, line 703) and the plan's own conclusion that cost "becomes real only at product scale" (line 705). Nothing in a five-minute demo turns on this.

**So the entire case for Haiku is latency, and the case against is accuracy. The accuracy argument is stronger than it first appears.**

The brief notes that `VOTES_NEEDED = 2` of 3 "exists precisely to catch a single bad reading." That is true, and it is exactly why it does not license a weaker model. **The vote gate suppresses variance; it cannot suppress bias.** Three independent samples of the same model on the same 896 px crop are not independent in their *systematic* errors. If a weaker OCR reads a stylised "88" as "BB" or "38" because of the blind's font, all three votes agree, `Counter.most_common()` returns that route with `n = 3` (`:683-687`), `confidence` is `"high"`, and the gate passes a confidently wrong route straight to the wrist.

That is precisely the outcome the file is built to refuse. `vision/service.py:94-98` states the ethic — *"we would rather say nothing than say 87"* — and `PROMPT` at `:584` closes with *"A wrong route number sent to this user is worse than no answer."* Swapping to a cheaper model converts the dominant error mode from variance (caught) to bias (not caught), against a saving of under a cent.

**Verdict: keep `claude-opus-4-8`.** Ordered levers if hop 13 must come down:

1. **Measure it first.** Hop 13's 1.5-3.0 s is an estimate. Log wall time around `:645-648`.
2. **Fast mode on Opus 4.8** — a research preview that runs the *same model* at up to 2.5× output tokens/sec. Requires `client.beta.messages.create`, `betas=["fast-mode-2026-02-01"]`, and top-level `speed="fast"`. Zero accuracy change. Honest caveat: only ~45 output tokens are generated, so this compresses the generation tail, not TTFT or network — plausibly a few hundred ms, not seconds. Premium pricing, separate rate limit, requires moving to the beta endpoint. Medium risk, worth measuring before adopting.
3. **Only then Haiku** — and if so, see F1 below, because the swap as documented does not work.

### 5. `enable_gpu_snapshot`, `@modal.enter(snap=True)`, and whether any cold start remains

**What the comments say.** On GPU snapshots (`vision/service.py:852-857`), verbatim:

> `# ---- GPU snapshots are ALPHA. DO NOT ENABLE FOR THE DEMO. -------------`
> `# The exact syntax, one uncomment away, recorded so nobody has to look it up:`
> `#   experimental_options={"enable_gpu_snapshot": True},`
> `# Documented incompatibilities: multi-GPU, non-CUDA, torch.compile; and`
> `# "most functions require modifications". min_containers=1 already buys the`
> `# cold-start win for free.`

On the snapshot phase (`vision/service.py:864-871`), verbatim:

> `# ======================= SNAPSHOTTED PHASE =========================`
> `# Runs ONCE, before the memory snapshot is captured.`
> `# ALLOWED:  local disk reads, CPU model load, expensive imports.`
> `# FORBIDDEN: any CUDA call (no GPU is attached here without`
> `#            enable_gpu_snapshot), any network client, any socket,`
> `#            anything reading a secret, anything requiring uniqueness`
> `#            (RNG seeds, generated ids) — the snapshot replays it`
> `#            identically into every restored container.`

**Why the phase forbids what it forbids.** The snapshot is captured once and replayed byte-identically into every restored container. Anything non-deterministic (RNG, generated ids) would be cloned rather than regenerated; any live socket or network client would be restored pointing at a connection that no longer exists; any secret read would be frozen into the image.

**The code obeys it.** `load_model` (`:872-883`) does a disk YAML read via `_vocab()`, `_resolve_vocab`, and `YOLO(BAKED_WEIGHTS)` — which the comment at `:883` correctly notes "loads to CPU by default." No CUDA, no network. `activate` (`:887-902`, `snap=False`) is where `.to("cuda")` (`:889`), the warm forward pass (`:894`), and `_prime_schema()` (`:900`) happen. And `_redis()` is constructed in neither hook — the docstring at `:446` and `:456-458` says so, and it holds: `_redis()` is called only from `_mget`, `_set_ex`, `_ocr_worker:712`, and `_handle:1039`.

**The crux: is there any cold start left to solve? No.**

`min_containers=1` (`vision/service.py:848`) guarantees at least one container is always running. For a single-phone demo at 2 fps that container is never idle (a request lands every 500 ms) and never scales away. By the time the first frame arrives it has already run `activate`: model on GPU, CUDA kernels warmed by a dummy 640×640 pass (`:894`), and the structured-output grammar primed (`:900`).

A memory snapshot only accelerates containers **2..N**, and on this workload container 2 never exists. So `enable_memory_snapshot=True` (`:851`) is cheap insurance against an infra-initiated restart, not a demo-critical feature — and `enable_gpu_snapshot` would be an alpha-stage risk purchased against a benefit of exactly zero. **The comment at `:856-857` already reaches the correct verdict. Leave both lines exactly as they are.** This is the clearest "do not touch" item in the file.

*(The one conditional: if the capture rate were raised per Verdict 1 and handler wall time approached the frame period, Modal could spawn a second container, which **would** cold-start mid-demo. That is an argument against raising fps without measuring, not an argument for GPU snapshots. See residual risk R3.)*

### 6. Other constants and commented features

Most are covered in the table. The two that produced findings are F1 and F2 below; the rest are in "What is already optimal." Two minor comment/code disagreements, neither material, recorded for completeness:

- **`_set_ex`'s docstring overstates on the fallback path.** `vision/service.py:508` says "value and TTL together, never orphaned," but the fallback at `:519-521` is `r.set(...)` then `r.expire(...)` — two round trips with a window where the key has no TTL. Immaterial in practice: the fallback only triggers if `set(..., ex=)` raises `TypeError`, and the four arrival keys never route through `_set_ex` at all (the Lua script writes them directly with `SET ... EX` at `:436-439`). Worth one line of comment honesty, nothing more.
- **`CROP_LONG_EDGE`'s token arithmetic uses a non-Anthropic formula.** `vision/service.py:739` computes `⌈896/28⌉ × ⌈280/28⌉ = 320`. Anthropic's documented estimate is `(w × h) / 750`, giving 335 for the same crop. A ~5% difference with no behavioural consequence. The plan uses the same formula at line 707. Not worth changing.

---

## Findings

Two, both evidence-backed. I am not padding this list.

### F1 — The documented Haiku fallback does not work as documented (high value, correctness)

`vision/service.py:89-90`:

```python
# Faster/cheaper swap if the stage feels laggy — one string, nothing else:
# CLAUDE_MODEL = "claude-haiku-4-5"
```

**"One string, nothing else" is false.** `output_config.effort` **errors on `claude-haiku-4-5`** (per the `claude-api` skill's thinking/effort support matrix; `effort` is supported on Opus 4.5 and every 4.6+ model, and errors on Sonnet 4.5 / Haiku 4.5). Both call sites pass it:

- `vision/service.py:601` — `"effort": "low"` in `_one_vote`
- `vision/service.py:916` — `"effort": "low"` in `_prime_schema`

`output_config.format` with `json_schema` *is* supported on Haiku 4.5, so the schema half is fine — it is specifically `effort` that breaks.

**The failure is silent, and two existing safety nets make it more silent, not less.**

1. `_prime_schema` is wrapped in `try/except` (`:899-902`) so the container still boots, printing only `[warm] schema prime skipped: ...`. The loud startup canary is swallowed.
2. `_vote_all` uses `return_exceptions=True` (`:647`), so all three failing votes are collected as exceptions, logged to Modal at `:651-652`, and filtered out at `:653`. `votes` is empty → `kept` is empty → `reading` stays `None` (`:682`) → the UNREADABLE path runs (`:697-702`).

Net observable behaviour: **BUS ARRIVING fires normally, then the route never arrives — permanently, for every arrival**, with the only diagnosis in Modal container logs. That is the single worst thing that can happen on stage, and it is one uncomment away.

**What makes this a genuine finding rather than a hypothetical:** the mitigation is already written down three hundred lines away and was never connected to its trigger. `vision/service.py:600-602`:

```python
# `effort` and `format` are optional SIBLINGS on output_config and
# may both be set. If a 400 ever names output_config, drop `effort`
# first — it is the non-essential half; the schema does the work.
```

The author anticipated exactly this 400 and wrote the correct recovery — but the fallback comment at line 90 still promises a one-token edit.

**Proposed change (documentation only; no behaviour change under the current config):** amend the comment at `:89-90` to state that the swap is *two* edits — the model string **and** removing `"effort": "low"` from both `output_config` blocks (`:601`, `:916`). Risk: none, the code path is dormant. Impact: converts a silent, total, mid-demo OCR failure into a working fallback. Note this does **not** re-open Verdict 4 — Opus should stay; this only makes the escape hatch real if it is ever needed under pressure.

### F2 — Three sequential Redis round trips per frame, one of which has no reader, none of which are budgeted (medium value, latency)

`_handle` performs **three sequential blocking Upstash REST calls per frame**:

1. `vision/service.py:1039` — `_redis().eval(ARRIVAL_LUA, ...)`, the state machine. Mandatory.
2. `vision/service.py:1057-1061` — `_set_ex(f"hazards:{req.session_id}", ...)`.
3. `vision/service.py:1093-1095` — `_mget([READING_KEY, READING_FOR_KEY, VOTES_KEY])`, the cross-container readback. Mandatory (`:1089-1092` explains why, correctly).

**Two observations.**

**(a) The hazard write has no consumer anywhere in the repository.** I grepped the whole tree excluding `node_modules`/`.git`. The literal key `hazards:` appears in exactly two places: the docstring at `vision/service.py:19` and the write at `:1058`. Every actual consumer of hazards reads them from the `/ingest` **HTTP response body**, not from Redis:

- `www/src/app/capture/page.tsx:183` — `hazards: m.hazards ?? []`
- `www/src/lib/coerce.ts:45` and `www/src/lib/contract.ts:89,149`
- `www/src/app/page.tsx:115-116` — renders them on the monitor
- `vision/client.py:153` — same, from the response

So the write costs one round trip per frame at 2 fps for zero readers today.

**Important qualifier that changes the recommendation:** this key is a *spec* item, not an accident — `audit/bus-stop-situational-awareness/06-track-a-modal-service.md:215` records `hazards:{session_id}`, TTL 5 s as a required deliverable. So "delete it" would silently drop a contracted behaviour. The right move is to take it **off the synchronous path** (fire-and-forget on a thread, exactly as `_ocr_worker` is dispatched at `:1085-1087`) rather than remove it. It is already wrapped in `try/except` and documented as "Advisory, so never fatal" (`:1055`, `:1062-1063`), so ordering nondeterminism on a 5 s TTL key is harmless.

**(b) None of this server-side time appears in the plan's Stage 1 budget.** The budget (plan lines 747-761) attributes exactly one server-side hop to Modal: hop 4, "YOLO26n forward pass, warm T4, 10-30 ms." Hops 3 and 6 are the network legs either side. There is no line for the JPEG decode (`:970`), the three Redis round trips, the box loop, or the crop/encode.

Using the plan's own figure for a Redis round trip (hop 8: 20-60 ms), three sequential calls is **60-180 ms of unbudgeted, per-frame, on-the-critical-path latency**. That is 4-13% of the 1380 ms Stage 1 mean, and it is invisible in the table.

**Proposed change:** measure first (see R1); if the round trip is at the top of that range, move the hazard write to a daemon thread. Risk: low. Impact: 20-60 ms of 1380 (1.5-4%), plus a corrected budget.

**Considered and rejected:** folding the `_mget` into `ARRIVAL_LUA` by passing the three reading keys as `KEYS[5..7]` and returning them. This would save a *second* round trip and does not violate the locked key schema (the keys and their meanings are unchanged). I am not recommending it: it modifies the most safety-critical code in the file — the atomic state machine that guarantees exactly one container fires exactly one vote-set per arrival — to recover 20-60 ms of 1380. Bad risk/reward. Recording it so a downstream reviewer does not have to rediscover and re-reject it.

---

## What is already optimal

This list is deliberately longer than the findings list. Each item looks tunable and should not be touched.

1. **`min_containers=1` and the absence of any cold-start problem** (`:848`). Covered in Verdict 5. The commented `enable_gpu_snapshot` (`:854`) must stay commented — alpha risk for zero benefit, as its own comment already concludes.

2. **The three-way concurrency of the Claude votes** (`:644-648`). Genuinely concurrent, correctly isolated with `return_exceptions=True`, correctly detached from the request path via a daemon thread (`:1085-1087`). The plan's largest claimed win is real.

3. **`thinking` deliberately omitted** (`:596-597`). **Verified correct:** on Opus 4.8 an omitted `thinking` field runs *without* thinking — the right call for a latency-critical one-shot read. There is a documented caveat that Opus 4.8 with thinking off can write longer reasoning into the visible response; here it cannot, because `output_config.format` constrains output to the three schema fields. The two decisions protect each other.

4. **Assistant prefill avoided** (`:590-592`). **Verified correct:** prefill returns 400 on Opus 4.8. `output_config.format` is the right mechanism.

5. **`_prime_schema`'s documented basis** (`:896-898`). **Verified correct:** first use of a schema compiles a grammar which is then cached for 24 h. Keep the warm call; it moves a one-time cost off the first arrival and is already failure-tolerant.

6. **The payload-first / signal-last ordering** (`:717-729`) and its mirror on teardown (`:1069-1074`). `det:reading` and `det:votes` are written before `det:reading_for`; on a new arrival `det:reading_for` is zeroed *first*. This is the same race fix `AGENTS.md` mandates for the relay, applied correctly to different keys. Do not reorder.

7. **The supersede check** (`:711-714`). A late vote-set from arrival N-1 is discarded rather than overwriting arrival N. Correct.

8. **`det:reading` written unconditionally, as JSON `null` on gate failure** (`:727` with the reasoning at `:724-726`). Skipping the write would leave the previous arrival's route in place and deliver a stale code. Do not "optimise" this into a conditional write.

9. **`ROUTE_RE` declared and deliberately not applied** (`:104-110`). **Verified against the other side:** `www/src/app/api/event/route.ts:39-40` does test `ROUTE_RE` and substitutes the `UNKNOWN` pattern. The service is right to return Claude's raw string so a misread is visible on the debug screen. Do not filter twice.

10. **`_dedupe_for_display` is provably display-only** (`:754-792`). Its role-aware suppression is the correct fix for the failure it documents — class-agnostic NMS deleting a `person` box to keep a `dress suit`. And it cannot affect the device: `hazards` are appended at `:1022-1025` and `best_box` set at `:1003-1004`, both inside the detection loop, before dedupe runs at `:1032`. `DEDUPE_IOU` is therefore a pure cosmetics knob.

11. **`confidence` reports the best target box even below `CONF_MIN`** (`:1113`, sourced from `:1003-1004` with the threshold applied separately at `:1035`). This makes `CONF_MIN` observable during rehearsal instead of a silent cliff, and the phone forwards it (`www/src/app/capture/page.tsx:176`). Excellent design property; do not "clean it up" by clamping it.

12. **`def ingest`, not `async def`** (`:955-960` with the reasoning at `:957-959`). FastAPI runs sync path operations in a threadpool, so the blocking Upstash calls and the blocking forward pass never stall the event loop. This is what makes the per-thread lazy Redis client (`:452-469`) correct.

13. **The `_mget`/`_set_ex` signature probes** (`:483-522`). They look like a candidate for deletion but cost **zero** steady-state: each memoises after one call (`:490`, `:497`, `:503`, `:514`, `:519`). The module-level globals are mutated without a lock from multiple threads, which I checked — the race is benign, since every racing writer writes the same value. Deleting a whole failure class for a few bytes and one first-call probe is a good trade. Leave it.

14. **No `max_containers`** (`:859-861`). The Lua script is atomic across containers, so pinning to one process is unnecessary. Do not add it back.

15. **`force` fires unconditionally in the Lua** (`:417-423`). This looks like a repeat-fire hazard but is safe: the phone makes it one-shot — `www/src/app/capture/page.tsx:147-148` reads `forceNext.current` and immediately resets it *before* the POST at `:156`.

16. **`EXTRA_PROMPTS` and the bake-time vocabulary** (`:143`, `:234-258`). CLIP runs at image build, never at runtime; two extra embeddings cost nothing per frame. The index-by-name resolution (`:214-228`) is the right defence against class-index drift.

---

## Web sources cited

- **`claude-api` skill** (invoked, not recalled from memory) — used for: the Opus 4.8 / Haiku 4.5 model IDs, context windows, and per-1M pricing; the thinking-and-effort support matrix that establishes `effort` errors on Haiku 4.5 (F1); confirmation that `output_config.format` with `json_schema` is supported on Haiku 4.5; the structured-outputs note that a new schema incurs a one-time grammar compilation cached for 24 h (verifying `:896-898`); confirmation that omitting `thinking` on Opus 4.8 runs without thinking (verifying `:596-597`); confirmation that assistant prefill returns 400 on Opus 4.8 (verifying `:590-592`); and the Fast Mode contract (Opus 4.8/4.7 only, `betas=["fast-mode-2026-02-01"]`, top-level `speed="fast"`, beta endpoint).

No other web sources. Everything else is code-grounded.

---

## Residual risk

Things I could not settle from the code, ordered by how much they would change the conclusions.

**R1 — The observed phone→Modal→phone round trip. This is the decisive unknown.** Because the capture loop is serial (`www/src/app/capture/page.tsx:142`), RTT sets an effective frame-rate ceiling and therefore *sets hop 5*. If RTT > 500 ms, hop 5 is larger than the plan's +500 ms, the fps lever from Verdict 1 does not exist, and Stage 1 is understated. If RTT is comfortably under 500 ms, raising to 3 fps is the largest available win in the whole pipeline (~250 ms, 18%). One measurement decides between those. It also bounds F2. **Take this measurement before acting on anything in this document.**

**R2 — The `multi_label` / argmax question, and whether the prop can be labelled something other than a bus.** `ultralytics` is not installed here so I could not read the NMS source. The mechanism I could not confirm: if `non_max_suppression` runs with `multi_label=False` (which I believe is the predictor default), each anchor reports only its **argmax** class across all 1203. The demo prop is described in the code as "a frame-filling A3 print" (`:245-246`) — that is literally a poster of a bus, and LVIS contains `poster`, `signboard`, `banner`, and `painting`. If one of those wins the argmax for the anchor covering the prop, `is_target` is `False` (`:1000`), `best_conf` stays 0, and no arrival ever fires.

I am flagging this as a **hypothesis with a cheap test, not a finding**, for two reasons: I could not read the library, and there is direct evidence someone already hit and solved this — `EXTRA_PROMPTS` (`:143`) exists precisely because two prompts were "hand-tuned against the actual demo prop." The test is free and requires no code change: point the camera at the prop and read the debug screen. If a box is drawn labelled `poster`/`signboard` while `confidence` reads 0.000, this is real; if the box reads `bus` or `double decker bus`, it is not. Do not change anything before running that test.

**R3 — Modal's per-container concurrency for `@modal.asgi_app`.** `modal` is not installed here, so I could not confirm whether one container serves concurrent requests by default or requires `@modal.concurrent`. This only matters if the capture rate is raised: if handler wall time approaches the frame period, Modal may spawn a second container, which **would** cold-start mid-demo (the one scenario where Verdict 5's "no cold start" stops holding). If fps is raised, verify this and consider `@modal.concurrent` — the state machine is already container-safe, so absorbing bursts in one container is architecturally free.

**R4 — Forward-pass time for `yolov8s-worldv2` at 1203 classes.** The plan's hop 4 says "YOLO26n forward pass, 10-30 ms" (line 752), but the code bakes `yolov8s-worldv2.pt` (`:255`) with a 1203-class contrastive head — a different and heavier model than the budget assumes. Combined with the unbudgeted Redis time in F2, Modal-side accounting is the weakest part of the Stage 1 estimate. Probably still small in absolute terms; genuinely unmeasured. Related: `MAX_RAW_BOXES = 30` (`:78`, applied at `:983`) could in principle evict the target in a crowded room if 30 boxes outscore it, though a frame-filling prop should be the top detection.

**R5 — OCR quality on the specific latch frame.** The crop comes from whichever frame happened to latch (`:1077-1079`); there is no "wait for a good frame" logic. During a prop-raise sweep, frame 2 may still be motion-blurred. `_crop_text_region` also only ever downscales (`:827`), so a small target box yields a small crop with no floor. Both would show up as an elevated UNREADABLE rate (`:702`), which is measurable in rehearsal and not from the code. I am not proposing a change — any fix here is architectural, and the rate is currently unknown.

**R6 — TLS handshake cost per arrival.** Verdict 3's ~100-200 ms estimate for three cold connections is inferred from the client construction site (`:644`), not measured. Worth capturing in the same instrumentation pass as R1.

---

## Orchestrator addendum — F1 verified against the Claude API reference

*Added by the orchestrating session after Track 3 completed. Track 3 asserted that
`output_config.effort` errors on `claude-haiku-4-5`. Because that claim is the basis of its
highest-severity finding — and because a wrong model/API fact would poison the downstream
synthesis — it was checked against the `claude-api` skill's authoritative model tables rather
than accepted on trust. **The claim is CONFIRMED.** This section is not Track 3's work.*

### What the reference says

| Question | Answer | Source |
|---|---|---|
| Does `output_config.effort` work on `claude-haiku-4-5`? | **No — it errors.** | `claude-api` skill, *Thinking & Effort* table: "`effort` works on Opus 4.5 (`low`/`medium`/`high` only — no `xhigh`/`max`); **errors on Sonnet 4.5 / Haiku 4.5**" |
| Corroborating statement | `max` "errors on Sonnet 4.5 and Haiku 4.5" | `shared/model-migration.md`, Sonnet 4.5 → 4.6 effort section |
| Does `output_config.format` json_schema work on Opus 4.8? | **Yes.** | `shared/tool-use-concepts.md` § Structured Outputs — supported models list |
| Does it work on Haiku 4.5? | **Yes.** | Same list: "Claude Fable 5, Claude Opus 4.8, Claude Sonnet 5, and **Claude Haiku 4.5**" |

Note the level passed is irrelevant: the service sends `"effort": "low"`, and `effort` is
rejected on Haiku 4.5 at any level — this is not a "too high a tier" failure.

### Why this makes the trap worse, not better

The **schema half survives** a Haiku swap and only `effort` breaks. That is precisely what the
in-code mitigation at `vision/service.py:600-602` already predicts — *"If a 400 ever names
output_config, drop `effort` first — it is the non-essential half; the schema does the work."*
The advice is correct and sits 300 lines away from the instruction that triggers it
(`:89-90`, "Faster/cheaper swap if the stage feels laggy — **one string, nothing else**").
The comment's "one string, nothing else" is false: `effort` is passed at **two** call sites,
`:601` (`_one_vote`) and `:916` (`_prime_schema`).

### Confirmed failure signature

Both safety nets Track 3 identified are real and both hide the 400:

1. `_prime_schema` is wrapped in `try/except` (`:899-902`) — the startup canary is swallowed and
   prints only `[warm] schema prime skipped: …`.
2. `_vote_all` passes `return_exceptions=True` (`:647`) — three 400s collapse into an empty
   `votes` list, so `kept` is empty, `reading` stays `None`, and the worker logs
   `UNREADABLE, held`.

Observable on stage: **BUS ARRIVING fires normally** (YOLO is untouched), **then the route
never arrives** — permanent UNKNOWN, diagnosable only in Modal logs. The failure is armed
precisely when someone is under time pressure and follows the documented advice.

### Residual risk on this addendum

Documentation-grounded, not reproduced against the live API — no Haiku request was issued from
this session. The verdict rests on the vendor reference being current for `claude-haiku-4-5`.
The finding is **dormant today**: `CLAUDE_MODEL = "claude-opus-4-8"` is active at `:88`, `effort`
is valid there, and nothing is broken in the current deployment.
