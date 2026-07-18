# Modal Platform Capabilities — Track 1 Research

Research date: 2026-07-18. Service under study: `vision/service.py` (Modal app `bus-vision`,
YOLO-World v2 detector on T4, `modal==1.5.2` pinned in `vision/requirements.txt`).

Every claim below is grounded in a URL fetched on the research date. Claims I could not
ground are marked **UNVERIFIED** inline. Modal's docs are a living site; the quotes are
what the pages said on 2026-07-18.

---

## Scope

**Researched:**

- `enable_gpu_snapshot` — exact stability status, syntax, documented limitations, published
  cold-start numbers, and whether the in-code comment at `vision/service.py:852-857` is
  accurate or stale.
- Modal's 2026 GPU menu, per-second pricing, and the standing cost of `min_containers=1`.
- Volume-backed vs image-baked model weights for a ~25 MB checkpoint.
- Modal changelog 1.5.0 → 1.5.2 and 2026 Modal blog posts touching inference latency.
- Feature surface judged against a **2 fps, single-user, single-endpoint demo**:
  `@modal.batched`, `@modal.concurrent`, `modal.Dict`/`Queue`, Sandboxes, the new
  `@app.server()` primitive, GPU fallbacks, and observability.

**Excluded deliberately:**

- Anything touching the Redis key schema or the `/ingest` response shape — locked contracts.
- LLM-serving-specific machinery (vLLM/SGLang/speculative decoding, continuous batching,
  KV-cache snapshot patterns). Cited only where it supplies a number, never as a proposal.
- Multi-node clusters, RBAC, SSO, cloud-bucket mounts, training paths.
- Modal's JS/Go SDKs.
- **Not measured:** I did not deploy, benchmark, or time anything. No latency number in this
  document was produced on this service. Everything is documentation and vendor-published
  benchmarks.

---

## Ranked feature list

Ranked by expected value to *this* service. "Effort" is honest lines-of-code in
`vision/service.py`.

| # | Feature | What it does | Applies here? | Effort | Demo story |
|---|---|---|---|---|---|
| 1 | `@modal.concurrent(max_inputs=N)` | Lets one container process several inputs at once instead of one-at-a-time | **Yes, conditionally** — the only actionable finding. Modal's canonical ASGI example ships it; without it a container takes one HTTP request at a time, so an overlapping frame queues and the autoscaler cold-starts container #2. Whether frames actually overlap depends on the capture page's post loop — see Verdict 5. | **1 line** (class-level decorator) | Low — invisible when it works |
| 2 | GPU fallback list `gpu=["T4", "L4"]` | Ordered preference; Modal falls back if the preferred type is unavailable | **Yes** — pure availability insurance for a live demo. Costs nothing unless it fires. | **1 line edit** | None (insurance) |
| 3 | Endpoint metrics / dashboard | p50/p95/p99 latency, QPS, queue depth in the Modal dashboard | **Yes** — zero code, already on. But the metrics page is oriented at Modal *Endpoints* (LLM serving); token/TTFT panels do not apply to `/ingest`. | **0 lines** | Medium — a live latency graph beside the demo is cheap and real |
| 4 | `Function.update_autoscaler()` | Change `min_containers` without redeploying | Marginal — `min_containers=1` is already static in the decorator. Only useful to burst warm capacity before a demo slot. | ~5 lines (separate script) | None |
| 5 | `experimental_options={"enable_gpu_snapshot": True}` | Snapshots GPU vRAM/CUDA state so restores skip GPU init | **No.** Three independent reasons (Verdict 1). Alpha, and this service's init is the documented anti-pattern. | 1 line to enable, **unbounded** to make safe | **Negative** — "we turned on an alpha flag that our own docs say may make it slower" |
| 6 | Volume-backed weights | Weights on a shared distributed FS instead of the image | **No.** Modal's own doc: *"Performance is similar for the two methods."* See Verdict 3. | ~15-25 lines + a populate step | None |
| 7 | `@modal.batched` | Accumulates inputs into one batched forward pass | **No.** One user at 2 fps never fills a batch; the decorator's `wait_ms` would *add* latency. | ~10 lines | None |
| 8 | `@app.server()` / `modal.Server` | New (1.5.1) HTTP primitive, "ultra-low latency", native concurrency, sticky sessions | **No** — for this demo. Genuinely interesting and unmarked-therefore-GA, but shipped 2026-06-23 and would mean rewriting the ASGI app and its lifecycle. | Rewrite of `web()` + both `@modal.enter` hooks | Medium, but not worth demo risk |
| 9 | `modal.Dict` / `modal.Queue` | Modal-native distributed state | **No.** Redis holds the arrival state machine under a locked key schema. Duplicating it is out of scope by instruction and wrong by design. | n/a | None |
| 10 | Sandboxes / Directory Snapshots / Notebooks | Untrusted-code microVMs, sandbox pre-warming | **No.** Nothing in this service runs untrusted code. | n/a | None |

---

## Verdicts and evidence

### Verdict 1 — `enable_gpu_snapshot`: the in-code comment is ACCURATE, and correctly conservative. It is also INCOMPLETE in the one way that matters most.

**Status: Alpha. Confirmed, not stale.** The docs page renders an Alpha callout with the
literal text:

> "**Alpha** — This feature is in Alpha. We'd love to hear your feedback — please reach out
> via Slack or email us at support@modal.com."

Source: https://modal.com/docs/guide/memory-snapshots

Modal's own maturity ladder defines Alpha as *"potentially fragile features with known
limitations"* where users should *"expect significant changes to how the feature works"* —
and reserves *"stable and fully ready for production grade usage"* for GA only.
Source: https://modal.com/docs/guide/feature-maturity

It has **not** graduated. The changelog entries for 1.5.0 (2026-06-09), 1.5.1 (2026-06-23)
and 1.5.2 (2026-07-10) contain no GPU-snapshot maturity change.
Source: https://modal.com/docs/reference/changelog

The separate example page is even blunter: *"GPU memory snapshotting is an experimental
feature, so test carefully before using in production!"*
Source: https://modal.com/docs/examples/gpu_snapshot

**Syntax: the comment records it correctly.** `experimental_options={"enable_gpu_snapshot":
True}`, passed *in addition to* `enable_memory_snapshot=True`. Verbatim from the docs.

**Documented limitations — the docs list FIVE section headers. The comment names four.**

| Doc section header | In the comment? |
|---|---|
| "You may need to rewrite code for compatibility or to improve performance" | Yes ("most functions require modifications") |
| "GPU Memory Snapshots are generally incompatible with multi-GPU code" | Yes |
| "GPU Memory Snapshots are generally incompatible with non-CUDA GPU code" | Yes |
| "GPU Memory Snapshots can interact poorly with `torch.compile`" | Yes |
| **"GPU Memory Snapshots do not speed up model loading from storage"** | **No — missing** |

The missing one is the decisive one. Full quote:

> "Memory Snapshots use the same high-performance distributed filesystem that delivers Modal
> Images and Modal Volumes to our worldwide fleet of containers at minimum latency and
> maximum throughput. That means that **if the majority of your initialization latency is
> spent loading weights, GPU Memory Snapshots will generally not improve your cold start
> times — and may even worsen them, by adding overhead.** Instead, Memory Snapshots should
> primarily be used to 'skip past' work that is not bottlenecked by storage bandwidth, like
> library initialization (imports) and JIT compilation (Torch, DeepGEMM, Triton, etc.)."

The `@modal.enter(snap=True)` phase of `VisionService` is `YOLO(BAKED_WEIGHTS)` — a weight
load from local storage, and essentially nothing else. That is precisely the case the docs
say GPU snapshots do not help and may hurt. The service also does not use `torch.compile`,
so there is no JIT cost to skip either. **The comment's conclusion is right; its stated
reasoning understates how right it is.** Recommended amendment: add the storage-bound
limitation, because it is the reason that survives even if `min_containers` were removed.

**Published improvement for PyTorch models.** Modal's blog (2025-07-30) reports:
Parakeet 20s → 2s (10x); ViT with `torch.compile` 8.5s → 2.25s (3.8x); vLLM with
Qwen2.5-0.5B 45s → 5s (9x). Implementation is NVIDIA/CUDA checkpoint APIs (driver branches
570/575), not CRIU. **No YOLO or object-detection number is published — UNVERIFIED for this
model class.** Note also that the blog headlines a `torch.compile` win while the docs warn
`torch.compile` can make snapshot creation *fail*; treat the two as in tension.
Source: https://modal.com/blog/gpu-mem-snapshots

**What would GPU snapshotting buy a service that never cold-starts? Nothing.** Snapshots
accelerate *restores*. `min_containers=1` means there is no restore on the demo's critical
path. The three reasons stack independently: (a) no cold starts to accelerate, (b) the init
is storage-bound so the docs predict no gain or a loss, (c) no JIT compilation to skip.

**Bonus finding — the service already implements Modal's documented alternative, verbatim.**
The docs carry a section titled *"Using GPUs without using GPU Memory Snapshots"*:

> "you might load model weights into CPU memory in the `snap=True` method, then move the
> weights onto GPU memory in the `snap=False` method. Even without GPU snapshotting, this
> technique reduces the startup time for `Embedder.run` in the below example by about 3x,
> from ~6 seconds down to just ~2 seconds."

Their example is `SentenceTransformer(..., device="cpu")` in `snap=True` and
`self.model.to("cuda")` in `snap=False`. `VisionService` does `YOLO(BAKED_WEIGHTS)` (loads
to CPU by default) in `snap=True` and `self.model.to("cuda")` in `snap=False`. This is the
recommended pattern, already in place. Source: https://modal.com/docs/guide/memory-snapshots

*One honest counterpoint, for completeness:* the docs also say *"We recommend warming up
your model by running a few forward passes on sample data in the `@modal.enter(snap=True)`
method to move more initialization work into the snapshot."* The service's warmup forward
pass and CUDA kernel load currently sit in `snap=False` — they must, because GPUs are
unavailable in `snap=True` without GPU snapshots. Enabling GPU snapshots could fold that
warmup into the snapshot. That is a real theoretical gain, and it applies only to cold
starts, which this service does not have.

**Related and separately verified:** `scaledown_window=1200` and its "20 min, the documented
maximum (range 2 s – 20 min)" comment are **accurate**. Docs: *"The value is measured in
seconds, and it can be set anywhere between two seconds and twenty minutes."* Default idle
time is 60 seconds. Source: https://modal.com/docs/guide/cold-start

**`keep_warm` vs `min_containers`:** `min_containers` is current and correct.
`keep_warm` is the **old** spelling, renamed in client v0.73.76 — alongside
`concurrency_limit` → `max_containers` and `container_idle_timeout` → `scaledown_window`.
The service uses the current names throughout. Source:
https://modal.com/docs/guide/modal-1-0-migration

---

### Verdict 2 — GPU menu and pricing 2026, and what `min_containers=1` actually costs

Per-second, from the pricing page on 2026-07-18:

| GPU | $/second | $/hour (derived) |
|---|---|---|
| T4 | 0.000164 | 0.5904 |
| L4 | 0.000222 | 0.7992 |
| A10 | 0.000306 | 1.1016 |
| L40S | 0.000542 | 1.9512 |
| A100 40 GB | 0.000583 | 2.0988 |
| A100 80 GB | 0.000694 | 2.4984 |
| RTX PRO 6000 | 0.000842 | 3.0312 |
| H100 | 0.001097 | 3.9492 |
| H200 | 0.001261 | 4.5396 |
| B200 | 0.001736 | 6.2496 |
| B300 | 0.001972 | 7.0992 |

CPU $0.0000131/core/s (min 0.125 cores); memory $0.00000222/GiB/s; Volumes $0.09/GiB/month
with 1 TiB free. Plans: Starter $0/mo with **$30/mo credits**, 100 containers, 10 GPU
concurrency; Team $250/mo with $100/mo credits.
Source: https://modal.com/pricing

Valid `gpu=` strings: `T4`, `L4`, `A10`, `L40S`, `A100`, `A100-40GB`, `A100-80GB`,
`RTX-PRO-6000`, `H100`/`H100!`, `H200`, `B200`/`B200+`, `B300`. GPU fallback lists are
supported: `gpu=["H100", "A100-40GB:2"]`, tried in order.
Source: https://modal.com/docs/guide/gpu

**Modal recommends L40S, not T4, as the inference default:** *"For running, rather than
training, neural networks, we recommend starting off with the L40S, which offers an
excellent trade-off of cost and performance and 48 GB of GPU RAM for storing model weights
and activations."* Adversarially: that guidance is framed around LLaMA- and
Stable-Diffusion-class models and 48 GB of weight storage. A `yolov8s-worldv2` forward pass
at 640×640 is nowhere near that envelope, and L40S is 3.3× the price of T4. **I have not
measured this model's per-frame latency on either card, so I cannot say T4 is sufficient for
2 fps — UNVERIFIED.** Nothing found justifies a change; nothing found rules one out either.

**No published per-GPU inference throughput.** The pricing page lists no throughput figures.
Modal publishes framework-level boot and serving numbers in blog posts, not a
GPU-vs-throughput table — UNVERIFIED.

**The finding that matters: `min_containers=1` bills continuously.** The pricing page's
marketing line is *"you never pay for idle resources — just actual compute time"* — that
describes scale-to-zero and **does not hold when you pin a warm container.** The cold-start
guide is explicit: *"you will be billed for any resources used while the container is idle
(e.g., GPU reservation or residual memory occupancy)."*
Source: https://modal.com/docs/guide/cold-start

At T4 rates, one pinned container costs **$0.5904/hour = $14.17/day ≈ $425 per 30 days for
the GPU alone.** CPU and memory add on top and are billed on *"whichever is higher: your
request or actual usage"* (default request is 0.125 cores / 128 MiB, and a resident
PyTorch + YOLO process will exceed the memory request) — call it a few cents per hour more.
**I did not measure resident memory, so the CPU/memory increment is an ESTIMATE.**
Source: https://modal.com/docs/guide/resources

Consequence for a hackathon: the Starter tier's $30/month credit covers roughly **two days**
of a continuously warm T4. This is a correct and deliberate trade — the plan bought
zero cold starts with it — but it should be a conscious burn, and the app should be brought
down between demo sessions.

---

### Verdict 3 — Volumes vs baked weights: no. Blunt answer, from Modal's own page.

Modal does nominally recommend Volumes: *"Our recommended method for working with model
weights is to store them in a Modal Volume."* But the same page states the tradeoff plainly:

> "We recommend storing model weights in a Modal Volume, as described above. **Performance is
> similar for the two methods.** Volumes are more flexible. Images are rebuilt when their
> definition changes, starting from the changed layer, which increases reproducibility for
> some builds but leads to unnecessary extra downloads in most cases."

Source: https://modal.com/docs/guide/model-weights

So the recommendation is about **flexibility and build-time rebuild cost**, explicitly *not*
about runtime speed. For this service:

- **No runtime gain.** Vendor's own words. A ~25 MB checkpoint is not where this service's
  time goes.
- **The bake is load-bearing for correctness, not just for caching.** `_bake_detector` runs
  `set_classes()` at build time specifically so CLIP is never downloaded or imported in the
  running container, and `_vocab()` is called at *both* bake time and restore time so
  index→label mapping cannot drift. A Volume would keep that property only if the populate
  step were equally disciplined — it would be a lateral move with new failure modes.
- **The cited downside of images is build-time only.** Changing the image definition re-runs
  the bake layer (re-download of `yolov8s-worldv2.pt` + CLIP, re-encode of 1205 prompts).
  That is minutes per rebuild across a handful of deploys, paid by the developer, never by
  the demo.
- **Cost is a wash.** Volumes include 1 TiB free.

**Recommendation: do not change.** If a reviewer pushes "but the docs recommend Volumes,"
the counter is the docs' own next sentence: performance is similar, and the recommendation
is a flexibility argument that this service does not need.

---

### Verdict 4 — 2026 Modal posts: one strong one, and no computer-vision post at all

**Best 2026 source — "How we achieved truly serverless GPUs" (2026-05-12).** Four mechanisms:
cloud buffers, a lazy content-addressed image filesystem (ImageFS), CPU checkpoint/restore,
and CUDA checkpoint/restore. Headline: *"Inference servers that take upwards of 2 kiloseconds
to boot naïvely boot in ~50 seconds"* — a 40× reduction. Concrete: vLLM mean boot
95,679 ms → 13,797 ms; SGLang 83,713 ms → 17,486 ms. GPU snapshotting is one of the four,
described as running at *"the scale of tens of millions of replicas"* — note this is the
marketing framing of a feature the docs still label Alpha; the docs are the more conservative
and more reliable source. Source: https://modal.com/blog/truly-serverless-gpus

**Product updates (2026-03-04):** Directory Snapshots for Sandboxes (Beta), a free GLM-5
endpoint, `modal billing report` GA, a `modal changelog` CLI. Nothing about computer vision,
GPU snapshot maturity, or new GPU types.
Source: https://modal.com/blog/product-updates-directory-snapshots-glm-5-billing-updates-and-more

**Changelog, versions relevant to the pin.** 1.5.2 (2026-07-10) is the **latest stable
release** — PyPI shows only `1.5.3.devN` pre-releases after it (most recent `1.5.3.dev7`,
2026-07-18). So `modal==1.5.2` is current, not behind.
- 1.5.0 (2026-06-09): Named Images (`Image.publish()` / `Image.from_name()`), version-pinned
  Function lookups, Workspace object.
- 1.5.1 (2026-06-23): **`@app.server()` / `modal.Server`**, `modal endpoint` CLI, billing
  APIs, experimental `modal curl`.
- 1.5.2 (2026-07-10): workspace settings API, `modal.types`, `routing_region` on
  `Function.with_options()`, graceful container stop.

Sources: https://modal.com/docs/reference/changelog and https://pypi.org/project/modal/

**Negative result, stated plainly: I found no 2026 Modal blog post about object detection,
YOLO, or computer vision.** Modal's 2026 inference writing is LLM-serving-centric
(speculative decoding, vLLM/SGLang boot times, host overhead). There is no vendor CV
showcase to borrow credibility from. Do not let a downstream phase assume one exists.

---

### Verdict 5 — Distinctive demo features: exactly one is worth doing

**`@modal.concurrent` — the one actionable item, and it is one line.**

Modal's default is explicit: *"By default, each container will be assigned one input at a
time."* And Modal's canonical ASGI example ships the decorator by default:

```python
@app.function(image=image)
@modal.concurrent(max_inputs=100)
@modal.asgi_app()
def fastapi_app(): ...
```

with the note *"The `@modal.concurrent` decorator enables a single container to process
multiple inputs at once, taking advantage of the asynchronous event loops in ASGI
applications."* Sources: https://modal.com/docs/guide/webhooks and
https://modal.com/docs/guide/concurrent-inputs

`VisionService` has no `@modal.concurrent`. The consequence is *not* slower throughput —
two concurrent YOLO passes do not make one T4 faster. The consequence is that an overlapping
request **queues, and a queued input makes the autoscaler start container #2**, which
cold-starts (restore + `.to("cuda")` + warmup forward pass + the Claude schema prime). With
`min_containers=1` and no `max_containers` (deliberately absent), that scale-up is possible
and would show up as a latency spike mid-demo. Correctness is unaffected — the Redis Lua
state machine is atomic across containers by design — but the demo would visibly hitch.

The service's code is **already written to be concurrency-safe**: `/ingest` is `def`, not
`async def`, so FastAPI runs it in a threadpool, and the comment at line 956-959 records
that the per-thread lazy Redis client depends on exactly that. Only the decorator is missing.

Placement, per the input-concurrency doc: *"When using the class pattern, the decorator
should be applied at the level of the class, not on individual methods"* — i.e. between
`@app.cls(...)` and `class VisionService:`. **UNVERIFIED:** the docs show class-level
`@modal.concurrent` on `@app.cls`, and the ASGI example on `@app.function`; I did not find
the exact `@app.cls` + `@modal.asgi_app`-method combination documented. Smoke-test before
trusting it.

**Whether this matters at all depends on a fact I could not check.** If the capture page
awaits each `/ingest` response before posting the next frame, there is never more than one
request in flight and this decorator buys nothing. If it posts on a fixed 500 ms timer
regardless of response, overlaps occur whenever per-frame latency exceeds 500 ms. **I did
not read `www/src/app/capture/page.tsx` — that check belongs to whoever acts on this.**

**Everything else, judged against 2 fps / one user:**

- **`@modal.batched` — no.** Docs: *"Batching increases throughput at a potential cost to
  latency"*, and it is aimed at high-concurrency GPU workloads. One user at 2 fps never
  fills a batch; `wait_ms` would be pure added latency. Also note the docs steer CPU-bound
  work to batching and I/O-bound work to concurrency — this service is neither cleanly.
  Source: https://modal.com/docs/guide/dynamic-batching
- **`@app.server()` / `modal.Server` — no, for this demo.** Genuinely the most interesting
  new primitive: *"designed from the ground up to provide ultra-low latency for processes
  that listen on a port and speak HTTP natively"*, with `target_concurrency=` autoscaling
  and sticky sessions via `Modal-Session-ID`. Carries no Alpha/Beta marker, and Modal's
  maturity policy says *"Any feature unmarked as Alpha or Beta is automatically considered
  GA"* — but it shipped three weeks before this research, and `@modal.asgi_app` is **not**
  announced as deprecated. Adopting it means rewriting `web()` and the lifecycle hooks for
  no demo-visible gain. Source: https://modal.com/docs/guide/servers
- **`modal.Dict` / `modal.Queue` — no.** Out of scope by instruction (locked Redis schema)
  and redundant with a state machine that is already atomic.
- **Sandboxes / Directory Snapshots — no.** Nothing here runs untrusted code.
- **GPU fallback list — yes, cheap.** `gpu=["T4", "L4"]` is a one-line hedge against T4
  capacity being unavailable at demo time. Modal *"respects the ordering of this list and
  will try to allocate the most preferred GPU type before falling back."* Note L4 costs 35%
  more if it fires. Source: https://modal.com/docs/guide/gpu
- **Observability — free, modest story.** Endpoint metrics require no code changes and give
  p50/p95/p99 latency, QPS and queue depth in the dashboard. Caveat: that page is written
  for Modal *Endpoints* (LLM serving) — TTFT and token-throughput panels are irrelevant to
  `/ingest`, and *"Idle endpoints show no data."* 1.5.x also added `modal app logs --search`
  / `--since` / `--source` filters, which is the practical 3 a.m. debugging win.
  Sources: https://modal.com/docs/guide/endpoint-metrics and
  https://modal.com/docs/reference/changelog

---

## Web sources cited

Each line states what the URL established. All fetched 2026-07-18.

1. **https://modal.com/docs/guide/memory-snapshots** — *Mandatory citation for
   `enable_gpu_snapshot`.* Establishes: Alpha status with the literal callout "This feature
   is in Alpha"; the exact `experimental_options={"enable_gpu_snapshot": True}` syntax; all
   five limitation section headers including the storage-bound one the in-code comment omits;
   and the "Using GPUs without using GPU Memory Snapshots" pattern (~3x, ~6s → ~2s) that this
   service already implements.
2. **https://modal.com/pricing** — *Mandatory citation for GPU pricing.* Full per-second GPU
   table (T4 $0.000164 → B300 $0.001972), CPU/memory/Volume rates, plan tiers and the
   $30/month Starter credit, and the "you never pay for idle resources" marketing claim.
3. **https://modal.com/blog/gpu-mem-snapshots** — *2025-07-30.* Published cold-start numbers
   (Parakeet 10x, ViT+torch.compile 3.8x, vLLM 9x), NVIDIA/CUDA checkpoint APIs on driver
   branches 570/575, and confirmation that no YOLO/detection number is published.
4. **https://modal.com/blog/truly-serverless-gpus** — *2026-05-12, the strongest 2026 post.*
   Four boot-acceleration mechanisms, the 40× / "~50 seconds instead of 2k" headline, and
   vLLM 95,679 ms → 13,797 ms and SGLang 83,713 ms → 17,486 ms.
5. **https://modal.com/blog/product-updates-directory-snapshots-glm-5-billing-updates-and-more**
   — *2026-03-04.* Directory Snapshots (Beta), GLM-5, billing GA; establishes the negative
   result that no GPU-snapshot maturity change was announced.
6. **https://modal.com/docs/guide/feature-maturity** — Modal's definitions of Experimental /
   Alpha / Beta / GA; supplies the "expect significant changes" language for Alpha and the
   "unmarked ⇒ GA" rule used to classify `modal.Server`.
7. **https://modal.com/docs/reference/changelog** — 1.5.0 / 1.5.1 / 1.5.2 contents and dates;
   establishes that GPU snapshots did not graduate in any 1.5.x release.
8. **https://pypi.org/project/modal/** — 1.5.2 (2026-07-10) is the latest **stable** release;
   only `1.5.3.devN` pre-releases follow. Confirms the repo's pin is current.
9. **https://modal.com/docs/guide/cold-start** — The `scaledown_window` "two seconds and
   twenty minutes" range and 60 s default that validate the in-code comment; and the
   idle-billing quote that contradicts the pricing page's marketing line.
10. **https://modal.com/docs/guide/model-weights** — The decisive Volumes-vs-image quote:
    "Performance is similar for the two methods. Volumes are more flexible."
11. **https://modal.com/docs/guide/webhooks** — Modal's canonical ASGI example carrying
    `@modal.concurrent(max_inputs=100)` by default, which `vision/service.py` lacks.
12. **https://modal.com/docs/guide/concurrent-inputs** — "By default, each container will be
    assigned one input at a time"; `max_inputs` vs `target_inputs`; class-level placement rule.
13. **https://modal.com/docs/guide/dynamic-batching** — `@modal.batched` semantics and the
    "throughput at a potential cost to latency" tradeoff that rules it out here.
14. **https://modal.com/docs/guide/gpu** — Valid `gpu=` strings for 2026, the GPU fallback
    list syntax, and Modal's "start with the L40S" inference recommendation.
15. **https://modal.com/docs/guide/servers** — `@app.server()` / `modal.Server` capabilities;
    absence of any Alpha/Beta marker; absence of any `asgi_app` deprecation notice.
16. **https://modal.com/docs/guide/modal-1-0-migration** — `keep_warm` → `min_containers`,
    `concurrency_limit` → `max_containers`, `container_idle_timeout` → `scaledown_window`
    (v0.73.76); `allow_concurrent_inputs` → `@modal.concurrent` (v0.73.148).
17. **https://modal.com/docs/guide/resources** — Default request 0.125 cores / 128 MiB and
    the "charged based on whichever is higher: your request or actual usage" rule.
18. **https://modal.com/docs/guide/endpoint-metrics** — Available latency/throughput panels,
    that no code change is needed, and the "idle endpoints show no data" caveat.
19. **https://modal.com/docs/examples/gpu_snapshot** — Independent corroboration of the Alpha
    framing: "GPU memory snapshotting is an experimental feature, so test carefully before
    using in production!"

---

## Residual risk

**What I could not verify.**

1. **No measurement of this service.** I did not deploy, invoke, or time `bus-vision`.
   Per-frame YOLO latency on T4, actual resident memory, real cold-start duration, and
   whether frames ever overlap in practice are all unmeasured. Every latency and cost figure
   here is either vendor-published or arithmetic on vendor rates.
2. **The `@modal.concurrent` recommendation is conditional and its placement is unproven.**
   Whether overlapping requests occur depends on `www/src/app/capture/page.tsx`, which I did
   not read. And the docs do not show `@modal.concurrent` combined with an `@modal.asgi_app`
   *method on an `@app.cls`* — only class-level on a plain Cls, and function-level on an
   `@app.function`. Smoke-test before trusting the one-line change.
3. **No YOLO/detection cold-start benchmark exists publicly.** Every GPU-snapshot number
   quoted is for ASR, ViT, or LLM serving. Extrapolating them to YOLO-World would be
   invention.
4. **Modal's docs and Modal's blog disagree in tone about GPU snapshots.** The blog says the
   stack runs at "tens of millions of replicas"; the docs say Alpha and "expect significant
   changes." I weighted the docs. A reader who weighted the blog would reach a different
   conclusion, and should know that is the disagreement they are resolving.
5. **`torch.compile` and GPU snapshots are internally inconsistent in Modal's own material** —
   headlined as a win in the blog, flagged as a possible snapshot-creation *failure* in the
   docs (mitigable via `TORCHINDUCTOR_COMPILE_THREADS=1`). Not load-bearing here, since this
   service does not use `torch.compile`.
6. **Pricing is a moving target.** Rates were read on 2026-07-18. The pricing page does not
   promise rate stability, and I found no published per-GPU inference throughput to pair
   with the rates.
7. **Endpoint metrics may be narrower than described.** That doc is written around Modal
   Endpoints (LLM serving). Which panels light up for a plain `@modal.asgi_app` POST endpoint
   is **UNVERIFIED**; I assumed latency/QPS/queue-depth carry over and token metrics do not.
8. **Background-thread lifetime is unverified.** `_handle` spawns a `daemon=True` thread for
   OCR that outlives the HTTP response. I found no Modal documentation stating whether a
   container may be reclaimed while a daemon thread is still running after its input
   completes. `min_containers=1` plus `scaledown_window=1200` almost certainly makes this
   moot in practice, but I could not confirm the guarantee. Flagging as a question, not a
   defect.

**What a reader must not conclude from this document.**

- **Not** that GPU snapshots are broken or useless. They are a real, well-evidenced 4-10×
  win for cold-start-dominated, JIT-heavy, storage-light workloads. They are wrong *for this
  service*, for reasons specific to this service.
- **Not** that T4 is proven adequate for 2 fps. Nothing here measured that. Modal's own
  default inference recommendation is L40S, and I did not disprove it — I argued it is aimed
  at a different weight class.
- **Not** that adding `@modal.concurrent` is definitely needed. It is defensible and cheap;
  whether it changes anything depends on an unchecked client-side detail.
- **Not** that this document ranks the *service's* biggest risks. It ranks *Modal platform
  features*. The dominant demo risks may well live in the capture page, the Claude vote gate,
  or network conditions — all outside this track's scope.

---

## Orchestrator addendum — the `@modal.concurrent` conditional, resolved

*Added by the orchestrating session after Track 1 completed. Track 1 correctly refused to
assert this, writing: "whether it changes anything depends on an unchecked client-side
detail." That detail has now been checked. This section is not Track 1's work; it is
appended here so the correction travels with the claim it corrects.*

**Verdict: `@modal.concurrent` does not apply to the single-phone demo path.**

The capture page structurally serialises its own requests. Evidence:

| Fact | Evidence |
|---|---|
| `tick` aborts if a request is already outstanding | `www/src/app/capture/page.tsx:142` — `if (inFlight.current) return;` |
| The guard cannot wedge on a failed frame | `www/src/app/capture/page.tsx:216-217` — `inFlight.current = false` sits in a `finally`, so a thrown fetch clears it |
| The 2 Hz timer does not imply 2 Hz of in-flight requests | `page.tsx:255` — `setInterval(tick, CAPTURE_MS)` fires every 500 ms, but each `tick` is a no-op while one is in flight |
| The capture page is the **only** client that posts to Modal | `grep -rn "MODAL_URL" www/src` returns no hit outside `app/capture/page.tsx` |
| The debug screen is not a second Modal client | It reads Redis through the Vercel relay — plan §"Camera and transport", transport table: "Debug screen \| never sees it. Reads Redis" |

So one phone never has more than one input outstanding, and Modal's default of one input per
container is sufficient. Track 1's stated failure mode — "an overlapping frame queues, and a
queued input makes the autoscaler cold-start container #2 mid-demo" — **cannot occur from a
single phone.**

**What survives.** The decorator remains cheap insurance against a *second concurrent client*:
a judge opening the capture page on their own device, or a spare phone left running. That is a
plausible hackathon scenario, but it is not the demo happy path, and it is a materially weaker
justification than the one Track 1 assumed. Downstream phases should weigh it as
"insurance against an unlikely second device", not "fixes a live queueing problem".

**Residual risk on this addendum.** Read-only static analysis; no `www/` file was modified and
nothing was measured against a running service. If the capture page changes to fire frames
without the in-flight guard, or if the demo deliberately runs two devices, this verdict
reverses and the decorator becomes worth adding.
