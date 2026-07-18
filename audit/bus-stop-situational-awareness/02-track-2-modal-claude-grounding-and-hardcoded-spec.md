# Track 2 — Modal & Claude Technical Grounding + Hardcoded Application Spec

**Author:** Track 2 of 3 (technical grounding)
**Date written:** 2026-07-18
**All facts verified against live documentation on 2026-07-18.** No claim in this document rests on training-data memory.

---

## Scope

This document does four things and nothing else:

1. **Verifies every Modal and Claude claim in `plan/PIVOT.md`** against official documentation, with URL + fetch date. Corrections are stated plainly.
2. **Resolves the Modal justification problem** raised in `plan/transcripts/2026-07-18-severity-levels-meeting.md` — the speaker's direct challenge that *"I don't even think we need an image [model]… we can probably do the entire thing with Claude. But I know we have to use Modal somehow."* A verdict is reached and argued with numbers.
3. **Writes the literal, hardcoded application spec** — exact prop, exact values, exact bytes and JSON at each hop, locked IN/OUT list, concrete failure rule.
4. **Identifies two garbled competitor references** from the transcript.

Out of scope for this track: haptic vocabulary design, ESP32 firmware, ToF/mic tiers, prior-art beyond the two garbled references, DeafBlind community/ethics framing. Those belong to Tracks 1 and 3.

**Reading order for the team:** if you read one section, read *The Modal Justification Verdict*. If you read two, add *Hardcoded Application Spec*. The code sections are copy-pasteable.

---

## Verdict Summary

| Claim (as PIVOT.md states it) | Verdict | Current truth | Source URL | Fetched |
|---|---|---|---|---|
| Modal T4 `$0.000164/sec` | **CONFIRMED** | `$0.000164/sec` (≈ $0.590/hr) | https://modal.com/pricing | 2026-07-18 |
| Modal L4 `$0.000222/sec` | **CONFIRMED** | `$0.000222/sec` (≈ $0.799/hr) | https://modal.com/pricing | 2026-07-18 |
| Modal A10 `$0.000306/sec` | **CONFIRMED** | `$0.000306/sec` (≈ $1.102/hr) | https://modal.com/pricing | 2026-07-18 |
| Modal CPU `$0.0000131/physical-core/sec` | **CONFIRMED** | `$0.0000131 / core / sec`, described as physical core = 2 vCPU equivalent, **minimum 0.125 cores**. Memory billed *separately* at `$0.00000222 / GiB / sec` — PIVOT.md omits memory entirely. | https://modal.com/pricing | 2026-07-18 |
| Pricing cited to `usagepricing.com` | **CORRECTED** | Third-party aggregator, not authoritative. The numbers happen to be correct today, but the citation must be swapped for `https://modal.com/pricing` before this goes near a judge. | https://www.usagepricing.com/blueprint/modal | 2026-07-18 |
| "$30/month free credits, auto-renewing" | **CONFIRMED** | Starter plan: **"$30 / month free credits"**, $0 plan fee. Also caps: 100 containers, 10 GPU concurrency, 3 seats. | https://modal.com/pricing | 2026-07-18 |
| "**no card required**" | **CORRECTED** | Modal's own docs state: **"Note that you must have a payment method on file in order to use Modal."** Third-party blogs claim no card is needed on Starter; Modal's documentation contradicts them. **Assume a card is required and add one tonight.** | https://modal.com/docs/guide/billing | 2026-07-18 |
| `scaledown_window` is the current `@app.function()` param | **CONFIRMED** | Current name. Units **seconds**, default **60**, range **2 s – 20 min (1200 s)**. It replaced `container_idle_timeout` (renamed in v0.73.76). | https://modal.com/docs/guide/cold-start · https://modal.com/docs/guide/modal-1-0-migration | 2026-07-18 |
| `modal.App`, `modal.Image(...).pip_install(...)`, `@app.function(gpu="T4")` | **CONFIRMED** | All current. GPU spec accepts a plain string (`gpu="T4"`) or a list. | https://modal.com/docs/reference/modal.App · https://docs.ultralytics.com/guides/modal-quickstart/ | 2026-07-18 |
| `@modal.fastapi_endpoint(method="POST")` is live | **CONFIRMED** | Live and current. `@modal.web_endpoint` is the **deprecated** former name, renamed in **v0.73.89**. Docs state verbatim: *"Note: Prior to v0.73.82, this function was named `@modal.web_endpoint`."* | https://modal.com/docs/guide/webhooks | 2026-07-18 |
| Decorator order (PIVOT.md puts `@app.function()` on top) | **CONFIRMED — PIVOT.md has it right** | `@app.function()` **above**, `@modal.fastapi_endpoint()` **below**, directly on the function. Reversing them is a silent failure. | https://modal.com/docs/guide/webhooks | 2026-07-18 |
| "Modal cold starts: **3–15s** for a typical ML inference container" | **CORRECTED** | Modal publishes no such range. What Modal *does* say: **"Containers boot in about one second"**, and total cold start depends on init work, ranging *"seconds to minutes."* Benchmarked vLLM/SGLang serving a 1 GiB model: mean **~13.8 s / ~17.5 s** with snapshots, **~95 s / ~84 s** without. **For our image (ultralytics + torch, multi-GB) expect tens of seconds, not 3.** | https://modal.com/docs/guide/cold-start · https://modal.com/blog/truly-serverless-gpus | 2026-07-18 |
| "GPU memory snapshotting took one customer from ~70s to ~12s" | **CONFIRMED** | Verbatim: *"the addition of GPU memory snapshotting pushed down cold starts about six-fold, from ~70s to ~12s."* Customer is **Reducto**. | https://modal.com/blog/truly-serverless-gpus | 2026-07-18 |
| Status of GPU memory snapshotting (PIVOT.md does not state it) | **NEW / CAUTION** | **CPU memory snapshots = GA. GPU memory snapshots = ALPHA.** Alpha, with documented incompatibilities (multi-GPU, non-CUDA, `torch.compile` failures) and a note that most functions *"require modifications."* **Do not put an alpha feature on the critical path of a stage demo.** | https://modal.com/docs/guide/memory-snapshot | 2026-07-18 |
| Warm-container mechanism | **CORRECTED (naming)** | `min_containers` is current; **`keep_warm` is the old name** (renamed v0.73.76). `buffer_containers` is current (promoted from `_experimental_buffer_containers`). `concurrency_limit` → `max_containers`. | https://modal.com/docs/guide/modal-1-0-migration · https://modal.com/docs/guide/scale | 2026-07-18 |
| Ultralytics Modal quickstart at `docs.ultralytics.com/guides/modal-quickstart` | **CONFIRMED** | Page exists (canonical URL has a trailing slash). | https://docs.ultralytics.com/guides/modal-quickstart/ | 2026-07-18 |
| Canonical demo image is `bus.jpg`, output "4 persons, 1 bus" | **CONFIRMED** | Verbatim output: `image 1/1 /root/bus.jpg: 640x480 4 persons, 1 bus, 377.8ms`. Image URL: `https://ultralytics.com/images/bus.jpg`. **Note the 377.8 ms — that is the CPU function in the guide, not a T4 number.** | https://docs.ultralytics.com/guides/modal-quickstart/ | 2026-07-18 |
| "COCO pretrained already has a `bus` class" | **CONFIRMED** | COCO has 80 classes; **`bus` is class index 5** (0 person, 1 bicycle, 2 car, 3 motorcycle, 4 airplane, **5 bus**, 6 train, 7 truck…). | https://docs.ultralytics.com/datasets/detect/coco/ | 2026-07-18 |
| "T4 (16GB) is typically sufficient and cost-effective for inference" | **CONFIRMED** | Ultralytics guide states: *"an NVIDIA T4 (16 GB) is typically sufficient"* for inference. | https://docs.ultralytics.com/guides/modal-quickstart/ | 2026-07-18 |
| Recommended YOLO weights (PIVOT.md does not name a file) | **NEW** | The Ultralytics Modal quickstart uses **`yolo26n.pt`** throughout — not `yolo11n.pt`. Use `yolo26n.pt`. | https://docs.ultralytics.com/guides/modal-quickstart/ | 2026-07-18 |
| "the whole hackathon costs well under a dollar" | **CONFIRMED** | A warm T4 held for a 5-minute demo slot costs **≈ $0.058** (GPU + 1 core + 8 GiB). Even 4 hours of warm T4 = ≈ $2.80. Well inside $30. | https://modal.com/pricing (arithmetic ours) | 2026-07-18 |
| Claude prompt-only JSON (`"Return ONLY JSON"`) | **CORRECTED** | Prompt-only is now the **weakest** available mechanism. Anthropic has shipped a **first-class structured-output feature**: `output_config.format` with `type: "json_schema"`, **GA**. This changes the recommendation entirely — see below. | https://platform.claude.com/docs/en/build-with-claude/structured-outputs | 2026-07-18 |
| PIVOT.md example JSON `{route, destination, confidence}` | **CONFIRMED as a shape** | Shape is fine and is what we lock. But it must be *enforced by schema*, not requested in prose. | (see above) | 2026-07-18 |
| Modal "hosts a real vision model" is technically necessary (PIVOT.md v2 §0/§6) | **PARTIALLY CORRECTED** | The *conclusion* survives; **two of PIVOT.md's three stated reasons do not.** See *The Modal Justification Verdict*. | — | 2026-07-18 |
| Exact Claude vision call latency in ms | **UNVERIFIABLE** | Anthropic publishes only a qualitative **"Comparative latency"** rating: Haiku 4.5 = *Fastest*, Sonnet 5 = *Fast*, Opus 4.8 = *Moderate*, Fable 5 = *Slower*. No per-request millisecond figures or SLA are published. **Measure it yourself — command given below.** | https://platform.claude.com/docs/en/about-claude/models/overview | 2026-07-18 |

---

## Modal — Detailed Findings

### 1. GPU and compute pricing (verified against modal.com, not the aggregator)

Full current table from https://modal.com/pricing (fetched 2026-07-18):

| Resource | Price / sec | ≈ / hr |
|---|---|---|
| Nvidia B300 | $0.001972 | $7.10 |
| Nvidia B200 | $0.001736 | $6.25 |
| Nvidia H200 | $0.001261 | $4.54 |
| Nvidia H100 | $0.001097 | $3.95 |
| Nvidia RTX PRO 6000 | $0.000842 | $3.03 |
| Nvidia A100 (80 GB) | $0.000694 | $2.50 |
| Nvidia A100 (40 GB) | $0.000583 | $2.10 |
| Nvidia L40S | $0.000542 | $1.95 |
| **Nvidia A10** | **$0.000306** | **$1.10** |
| **Nvidia L4** | **$0.000222** | **$0.80** |
| **Nvidia T4** | **$0.000164** | **$0.59** |
| CPU | $0.0000131 / physical core | $0.047 / core |
| Memory | $0.00000222 / GiB | $0.008 / GiB |

Two things PIVOT.md gets wrong by omission:

- **Memory is billed separately.** PIVOT.md quotes GPU + CPU only. For a T4 container with 1 core and 8 GiB, memory adds ~30 % on top of the CPU line. Immaterial at our scale, but the number in the deck should be complete.
- **CPU has a 0.125-core floor.** You cannot bill below that.

**Cost of the actual demo, computed:**

| Item | Arithmetic | Cost |
|---|---|---|
| Warm T4 held for a 5-minute demo slot | 300 s × ($0.000164 + $0.0000131 + 8 × $0.00000222) | **$0.058** |
| Warm T4 held for 4 hours of rehearsal | 14 400 s × same | **$2.80** |
| Claude read, Opus 4.8, 3-vote per arrival | 3 × (600 in × $5/MTok + 45 out × $25/MTok) | **$0.012** |
| Claude read, Haiku 4.5, 3-vote per arrival | 3 × (600 in × $1/MTok + 45 out × $5/MTok) | **$0.0025** |

The whole hackathon lands around **$5–10** against a **$30/month** credit. PIVOT.md's "well under a dollar" is optimistic if you keep a container warm for hours, but the conclusion — you will not run out of credit — holds.

### 2. Free tier — the "no card required" claim is wrong

PIVOT.md states, twice: *"$30/month free credits, auto-renewing, **no card required**."*

- **CONFIRMED:** `$30 / month free credits` on the Starter plan (plan fee $0). Starter also caps you at 100 containers, 10-way GPU concurrency, 3 workspace seats. Source: https://modal.com/pricing.
- **CORRECTED:** Modal's billing documentation states verbatim: **"Note that you must have a payment method on file in order to use Modal."** Source: https://modal.com/docs/guide/billing.

Third-party SEO pages (aicreditmart.com and similar) assert "no credit card required on Starter." **Modal's own documentation is the authority and it contradicts them.** A previous run flagged this correctly.

> **Action tonight, before anything else:** have whoever owns the Modal account sign in and confirm a payment method is on file. If the team discovers at 3 a.m. that deploys are blocked on a billing form, that is an hour lost for a two-minute task. Do it now.

Third-party sources additionally claim credits reset monthly and do not roll over, and that workloads simply stop rather than auto-billing if no payment method was ever added. **Neither claim is on modal.com; treat both as unverified.**

### 3. `scaledown_window` — units, default, maximum

| Property | Value | Source |
|---|---|---|
| Units | **seconds** | https://modal.com/docs/reference/modal.App |
| Default | **60** — *"By default, the maximum idle time is 60 seconds."* | https://modal.com/docs/guide/cold-start |
| Range | **2 s to 20 min** — *"it can be set anywhere between two seconds and twenty minutes."* | https://modal.com/docs/guide/cold-start |
| Meaning | *"The maximum duration (in seconds) that individual containers can remain idle when scaling down."* | https://modal.com/docs/guide/scale |
| Former name | `container_idle_timeout` (renamed in v0.73.76) | https://modal.com/docs/guide/modal-1-0-migration |

**PIVOT.md's snippet uses `scaledown_window=600`.** That is legal (600 s = 10 min, inside the 2 s–1200 s range) but it is not the right number for a stage demo — see *Cold-Start Risk & Demo Strategy*. Use **1200**, the maximum.

### 4. Decorator syntax and order — PIVOT.md is correct, keep it that way

Verbatim from https://modal.com/docs/guide/webhooks (fetched 2026-07-18):

```python
@app.function(image=image)
@modal.fastapi_endpoint(method="POST")
def square(item: dict):
    return {"square": item['x']**2}
```

**`@app.function()` on top. `@modal.fastapi_endpoint()` directly above the function.** Reversing them does not raise a clear error — it produces an app that deploys but has no HTTP route, which is exactly the class of bug that eats an hour at 2 a.m.

`modal.fastapi_endpoint` full signature (https://modal.com/docs/reference/modal.fastapi_endpoint):

```python
fastapi_endpoint(*, method="GET", label=None, custom_domains=None,
                 docs=False, requires_proxy_auth=False)
```

`@modal.web_endpoint` is the **deprecated** former name (renamed in v0.73.89, per the Modal 1.0 migration guide). The migration guide describes it as *"a simple name substitution in your code as the semantics are otherwise identical."* PIVOT.md already uses the current name.

Full `@app.function()` signature (https://modal.com/docs/reference/modal.App):

```python
@app.function(*, image=None, schedule=None, env=None, secrets=None, gpu=None,
    serialized=False, network_file_systems={}, volumes={}, cpu=None,
    memory=None, ephemeral_disk=None, min_containers=None, max_containers=None,
    buffer_containers=None, scaledown_window=None, proxy=None, retries=None,
    timeout=300, startup_timeout=None, name=None, is_generator=None, cloud=None,
    region=None, routing_region=None, nonpreemptible=False,
    enable_memory_snapshot=False, block_network=False,
    restrict_modal_access=False, single_use_containers=False, i6pn=None,
    include_source=None, experimental_options=None,
    _experimental_restrict_output=False, max_inputs=None)
```

Note `timeout=300` (seconds) is the default — fine for us.

### 5. Cold starts — the 3–15 s figure is not Modal's

PIVOT.md: *"Modal cold starts run **3–15s** for a typical ML inference container."*

**Modal does not publish that range.** What Modal publishes:

- *"Containers boot in about one second."* (https://modal.com/docs/guide/cold-start) — this is **container boot only**, not your app being ready.
- Total cold start includes model loading and can be *"seconds to minutes."* (same page)
- Blog benchmark: vLLM and SGLang serving a **1 GiB** model reach mean cold-start latencies of **~13.8 s and ~17.5 s with snapshots enabled**, versus **~95 s and ~84 s without**. (https://modal.com/blog/truly-serverless-gpus)
- *"Inference servers that take upwards of 2 kiloseconds to boot naïvely boot in ~50 seconds on Modal."* (same)

**Our image is `ultralytics` + `torch` + CUDA — several GB.** A first cold start on stage will be measured in **tens of seconds**, not 3. Plan accordingly. The mitigation is `min_containers=1` plus a pre-warm, not optimism.

**Memory snapshotting status — this is the important correction:**

| Feature | Status | Enabling syntax |
|---|---|---|
| CPU memory snapshots | **Generally Available** | `@app.function(enable_memory_snapshot=True)` |
| **GPU memory snapshots** | **ALPHA** | `@app.function(gpu="a10", enable_memory_snapshot=True, experimental_options={"enable_gpu_snapshot": True})` |

Source: https://modal.com/docs/guide/memory-snapshot (fetched 2026-07-18). Documented caveats on the GPU path: *"Generally incompatible with multi-GPU code"*, *"Generally incompatible with non-CUDA GPU code"*, *"Running the Torch Compiler can cause Memory Snapshot creation to fail"*, and most functions *"require modifications… to ensure compatibility."*

> **Recommendation: do not enable GPU memory snapshotting for this demo.** It is an alpha feature that requires code changes to pay off, and the payoff (cold start) is a problem we can solve for free with `min_containers=1`. The Reducto 70 s → 12 s story is a great *slide*. It is a bad *dependency*.

### 6. Keeping a container warm across a 5-minute demo slot

Verified mechanisms (https://modal.com/docs/guide/scale, https://modal.com/docs/guide/cold-start, https://modal.com/docs/guide/modal-1-0-migration):

| Parameter | Meaning | Old name |
|---|---|---|
| `min_containers` | *"The minimum number of containers that should be kept warm, even when the Function is inactive."* | `keep_warm` |
| `buffer_containers` | *"The size of the buffer to maintain while the Function is active, so that additional inputs will not need to queue for a new container."* | `_experimental_buffer_containers` |
| `max_containers` | *"The upper limit on containers for the specific Function."* | `concurrency_limit` |
| `scaledown_window` | Idle seconds before scale-down. | `container_idle_timeout` |

**Exactly how to guarantee a warm container across a 5-minute demo slot:**

```python
@app.function(
    image=image,
    gpu="T4",
    min_containers=1,        # never scale to zero — this is the guarantee
    max_containers=1,        # exactly one container ⇒ one process ⇒ one state machine
    scaledown_window=1200,   # 20 min, the documented maximum
    timeout=120,
)
```

`min_containers=1` is the load-bearing line. `scaledown_window` is belt-and-braces: it only governs how long an *idle* container survives, and with `min_containers=1` there is always one. Setting both costs nothing and removes an entire failure class.

`max_containers=1` is deliberate and is doing real architectural work: it guarantees a **single process**, which is what lets the arrival state machine live in ordinary Python module globals with no external store. At demo scale (one camera, ~2 requests/sec) this is not a bottleneck.

---

## Claude Vision — Detailed Findings

The in-repo `claude-api` skill was invoked first (cached 2026-06-24) and then checked against live docs. **Discrepancies found: three, all minor, all resolved in favour of live docs.** They are listed in *Grounding Notes*.

### 1. Model choice and pricing

Verified from https://platform.claude.com/docs/en/about-claude/pricing and https://platform.claude.com/docs/en/about-claude/models/overview (both fetched 2026-07-18):

| Model | Model ID | Input $/MTok | Output $/MTok | Context | Comparative latency | Vision res. tier |
|---|---|---|---|---|---|---|
| Claude Opus 4.8 | `claude-opus-4-8` | $5 | $25 | 1M | Moderate | High-res (2576 px / 4784 vt) |
| Claude Sonnet 5 | `claude-sonnet-5` | **$2** (intro, → $3 on 2026-09-01) | **$10** (intro, → $15) | 1M | Fast | High-res |
| Claude Haiku 4.5 | `claude-haiku-4-5` | $1 | $5 | 200k | **Fastest** | Standard (1568 px / 1568 vt) |
| Claude Fable 5 | `claude-fable-5` | $10 | $50 | 1M | Slower | High-res |

**Recommendation: `claude-opus-4-8` as the primary.** Reading two large high-contrast digits off a clean crop is not a hard vision task, but it *is* the single point where a wrong answer harms the user, and Opus 4.8 is the model with the most headroom on ambiguous glyphs (8 vs 6 vs B, 1 vs 7). At $0.004/call this costs nothing.

**Cheaper/faster alternative: `claude-haiku-4-5`.** It is rated *Fastest*, costs 1/5 as much, and its standard resolution tier (1568 px long edge) is far more than a 896 px crop needs. **If the demo feels laggy on stage, swapping `claude-opus-4-8` → `claude-haiku-4-5` is a one-string change** and should be the first lever pulled. Keep both strings in the file, one commented.

Per-call cost with our locked crop (896 × 280 → 320 visual tokens + ~280 prompt tokens = ~600 input; ~45 output):

| Model | Per call | Per arrival (3-vote) |
|---|---|---|
| `claude-opus-4-8` | $0.0041 | $0.0124 |
| `claude-sonnet-5` (intro) | $0.0017 | $0.0050 |
| `claude-haiku-4-5` | $0.00083 | $0.0025 |

### 2. Image input format — verified

Source: https://platform.claude.com/docs/en/build-with-claude/vision (fetched 2026-07-18).

**Three source types:** `base64`, `url`, and `file` (Files API `file_id`, beta header `files-api-2025-04-14`). We use `base64` — the crop is generated in-process and never exists as a URL.

**Exact content-block structure:**

```python
{
    "type": "image",
    "source": {
        "type": "base64",
        "media_type": "image/jpeg",   # one of: image/jpeg image/png image/gif image/webp
        "data": "<base64 string, no newlines>",
    },
}
```

**Supported media types:** `image/jpeg`, `image/png`, `image/gif`, `image/webp`. Animations are unsupported — only the first frame is used.

**Limits:**

| Limit | Value |
|---|---|
| Max size per image | **10 MB** base64-encoded (Claude API direct); 5 MB on Bedrock / Google Cloud |
| Max dimensions | **8000 × 8000 px** |
| Max images per request | **100** for 200k-context models (i.e. Haiku 4.5); **600** for 1M-context models |
| Stricter rule | If a request contains **>20 images**, a tighter per-image dimension cap applies — keep every dimension ≤ 2000 px or keep the request to ≤ 20 image/document blocks |
| Request size | 32 MB for standard endpoints |

**Token counting — the formula.** Claude views images in **28 × 28 pixel patches**, each patch being one *visual token*:

```
visual_tokens = ceil(width / 28) × ceil(height / 28)
```

Each model has a resolution tier; images over the tier limit are **downscaled before processing**:

| Tier | Models | Max long edge | Max visual tokens |
|---|---|---|---|
| High-resolution | Fable 5, Mythos 5, Opus 4.8, Opus 4.7, Sonnet 5 | 2576 px | 4784 |
| Standard | All others (incl. Haiku 4.5) | 1568 px | 1568 |

Worked for our shapes:

| Our image | Visual tokens |
|---|---|
| Locked blind crop, 896 × 280 | ⌈896/28⌉ × ⌈280/28⌉ = 32 × 10 = **320** |
| Full capture frame, 1280 × 720 | 46 × 26 = **1196** |
| Full frame, 640 × 480 | 23 × 18 = **414** |

**This formula is the entire cost argument in Part 2.** It is the reason cropping matters and the reason Claude-per-frame gets expensive: a full 1280 × 720 frame is **3.7×** the token cost of the crop that actually contains the answer, and it hands the model a street scene to search instead of a legible sign.

**Anthropic's own guidance we should follow:** images work best placed **before** text in the content array; resize before uploading to cut latency; avoid heavy JPEG compression because *"heavy JPEG compression can make text difficult to read."*

**One hard limitation to know:** Claude *"cannot be used to name people in images and refuses to do so."* This kills the transcript's speculative face-recognition tangent as an application built on Claude vision — a further reason it is OUT (see IN/OUT list).

### 3. Forcing strict JSON — the recommendation, and why it changed

**Anthropic has shipped a first-class structured-output feature and it is GA.** This is the finding that most changes PIVOT.md's plan.

Source: https://platform.claude.com/docs/en/build-with-claude/structured-outputs (fetched 2026-07-18).

The four candidate mechanisms, ranked:

| Mechanism | Status | Verdict for us |
|---|---|---|
| **`output_config.format` with `type: "json_schema"`** | **GA** | ✅ **USE THIS** |
| Forced tool use (`tool_choice` + `strict: true`) | GA | Works, but adds a `tools` array, a tool-use system prompt (410 tokens on Opus 4.8 with forced choice), and a `tool_use` block to unwrap. Strictly more machinery for the same result. |
| Assistant prefill | **REMOVED** | ❌ Returns **400** on Opus 4.8, Opus 4.7, Opus 4.6, Sonnet 4.6, and Fable 5. This is a trap for anyone reaching for a remembered pattern. |
| Prompt-only ("Return ONLY JSON") | n/a | ❌ What PIVOT.md currently specifies. No guarantee. This is where 4 a.m. demos die. |

**Recommended — exactly one mechanism, `output_config.format`:**

```python
output_config={
    "format": {
        "type": "json_schema",
        "schema": {
            "type": "object",
            "properties": {
                "route":       {"type": "string"},
                "destination": {"type": "string"},
                "confidence":  {"type": "string", "enum": ["high", "low"]},
            },
            "required": ["route", "destination", "confidence"],
            "additionalProperties": False,
        },
    },
}
```

Documented constraints that bind us:

- `additionalProperties: false` is **required** on every object.
- No recursive schemas, no `minimum`/`maximum`/`minLength`/`maxLength`. Our schema uses none.
- **Enum casing caveat:** *"Output may differ in capitalization from schema enum values."* → **compare `confidence` case-insensitively in code.** This is a real footgun; the snippet below handles it.
- First use of a schema pays a **grammar-compilation latency** cost, then it is **cached for 24 hours**. → **Fire one throwaway call during pre-warm** so the demo call hits the cache.
- Incompatible with **citations** (400) and with **message prefilling**. Neither affects us.
- Supported on Opus 4.8, Sonnet 5, Haiku 4.5, Fable 5 and several legacy models — all our candidates.
- A small system prompt is added automatically, so input tokens tick up slightly. Not quantified in the docs.

**Do not enable thinking.** On `claude-opus-4-8`, omitting the `thinking` parameter runs **without** thinking (Opus 4.8/4.7 do not default to adaptive), which is exactly what we want on a latency-critical one-shot extraction. Adding `thinking: {"type": "adaptive"}` would buy nothing here and cost latency. Do add `"effort": "low"` inside `output_config` to keep the model terse.

### 4. Latency for a single vision call on a small crop

**UNVERIFIABLE as a published number.** Anthropic publishes no per-request millisecond figures and no latency SLA. The only official signal is the qualitative **"Comparative latency"** column: `Haiku 4.5 = Fastest`, `Sonnet 5 = Fast`, `Opus 4.8 = Moderate`, `Fable 5 = Slower` (https://platform.claude.com/docs/en/about-claude/models/overview). Third-party benchmark blogs quote TTFT figures in the 250 ms – 2 s range across models, but none are authoritative and none test a vision payload.

**Do not put a latency number on a slide you have not measured.** Measure it in 30 seconds:

```bash
python - <<'PY'
import base64, time, anthropic
c = anthropic.Anthropic()
img = base64.standard_b64encode(open("crop.jpg","rb").read()).decode()
for model in ("claude-opus-4-8", "claude-haiku-4-5"):
    for i in range(5):
        t = time.perf_counter()
        c.messages.create(
            model=model, max_tokens=256,
            output_config={"effort": "low", "format": {"type": "json_schema", "schema": {
                "type":"object",
                "properties":{"route":{"type":"string"},"destination":{"type":"string"},
                              "confidence":{"type":"string","enum":["high","low"]}},
                "required":["route","destination","confidence"],"additionalProperties":False}}},
            messages=[{"role":"user","content":[
                {"type":"image","source":{"type":"base64","media_type":"image/jpeg","data":img}},
                {"type":"text","text":"Read the bus destination blind."}]}],
        )
        print(f"{model} call {i}: {time.perf_counter()-t:.2f}s")
PY
```

Run it **twice** — the first run pays the one-time schema-compilation cost, the second is representative. Put *that* number on the slide.

**What the structural argument does not need measurement for:** a Claude response requires network RTT **plus** time-to-first-token **plus** generation of ~45 output tokens. A warm Modal detector requires network RTT **plus** ~10 ms of GPU. **There is no model configuration in which a complete Claude JSON response beats a warm YOLO bounding box.** That inequality holds regardless of the exact milliseconds, and it is what the two-stage haptic rests on.

---

## The Modal Justification Verdict

### The challenge, stated fairly

From the transcript, in substance: *"I don't even think we need an image [model]… we don't even need like a video model. We can probably do just do the entire thing with Claude. But I know we have to use Modal somehow."* And the proposed alternative: *"a video is just a bunch of images… ffmpeg… feed the video, get frames out, give that to Claude and Claude does everything."*

**The speaker is right on capability and wrong on architecture.** Claude can absolutely read a route number off a frame — better than YOLO could, since YOLO-COCO has no concept of text at all. If the question is *"can Claude do this task,"* the answer is yes and no detector is needed.

But the sentence immediately after — *"but I know we have to use Modal somehow"* — is the tell. A team that cannot finish the sentence *"and Modal is there because ___"* is decorating, and a judge who has seen forty hackathon projects will hear it.

PIVOT.md v2 §6 offers three defences. **Two of them do not survive contact with the verified numbers.**

### Testing PIVOT.md's three arguments

**PIVOT.md argument 1 — "Claude doesn't need to watch 30fps. The detector does. Genuine cost and latency argument."**

**Half true, and the half that's false is the half PIVOT.md leads with.**

Nothing in this demo needs 30 fps. A bus pulling into a stop is a multi-second event; the human-perceptible difference between detecting it at 30 fps and at 2 fps is nil. **The honest frame rate for a bus-arrival demo is 2 fps** — fast enough that the arrival pulse feels immediate, slow enough that nothing is wasted.

At 2 fps, run the cost comparison for a 5-minute demo:

| Approach | Arithmetic | Cost |
|---|---|---|
| Claude Haiku 4.5 on every frame, 640×480 (414 vt + 200 prompt ≈ 614 in, 45 out) | 600 frames × $0.00083 | **$0.50** |
| Warm Modal T4 + Claude only on the transition | $0.058 + 3 × $0.0041 | **$0.070** |

The detector is ~7× cheaper. **And both numbers are under a dollar.** *At demo scale the cost argument is directionally real and practically irrelevant, and PIVOT.md should stop leading with it.*

Where it becomes real is at product scale — continuous monitoring, one user, one hour at 2 fps:

| Approach | Cost / user / hour |
|---|---|
| Claude Haiku 4.5 every frame | **$5.98** |
| Warm T4 + Claude on transitions only | **$0.71** |

That is an 8× gap that compounds per user, and it is a legitimate roadmap slide. It is not a demo justification. **Say it as a roadmap claim, not as today's reason.**

**PIVOT.md argument 2 — "Cropping massively improves OCR."**

**True, and now quantified — but it does not require YOLO.**

A full 1280 × 720 frame costs **1196 visual tokens**; the 896 × 280 blind crop costs **320**. Cropping is a 3.7× token reduction and, more importantly, removes the search problem: Claude is handed the answer rather than asked to find it in a street scene.

But: **you can crop without a detector.** For a hardcoded demo with a prop at a known distance, a fixed centre-crop would do most of this. So cropping is a real benefit of *having* a detector, not an argument that a detector is *necessary*. **Demote it to supporting evidence.**

**PIVOT.md argument 3 — "The detector gives you *when*. Two-stage haptic: *bus arriving* now, *it's the 88* two seconds later."**

**This one is load-bearing, and PIVOT.md buries it third.** It is the only one of the three that Claude structurally cannot supply, for two independent reasons:

*Reason A — latency floor.* A warm T4 running YOLO-nano returns a bounding box in ~10 ms of compute; the round trip is dominated by network, ~100–300 ms on venue wifi. A Claude response requires network RTT **plus** TTFT **plus** generation of ~45 output tokens. Even on Haiku 4.5 (*Fastest*), that is strictly more. Human perception of "instant" for a haptic response to a deliberate action is roughly **< 300 ms**; a ~1 s Claude round trip reads as lag, not as feedback. **Stage one of the two-stage haptic must come from something that isn't an LLM.**

*Reason B — statelessness.* This is the stronger reason and the one nobody has said out loud yet.

> **The detector's product is not a bounding box. It is a state transition.**

"A bus is here" is a boolean over time. Turning noisy per-frame detections into a single clean `BUS_ARRIVED` event requires three things:

1. a fast per-frame signal (the detector),
2. **debounce/hysteresis over ~1–2 seconds of history** — so one flickery frame does not fire, and one dropped frame does not un-fire,
3. **a fire-once latch** — so Claude is called exactly once per arrival, not 600 times, and the user is buzzed once, not continuously.

**The Claude API is stateless per request.** It cannot do (2) or (3). *Something* must hold a few seconds of history. That something is a server. If it is a server, Modal is an honest place for it — and PIVOT.md v1 §6 already had this right ("**State is the honest reason to have a server**") before v2 overwrote it with the weaker cost story.

### The verdict

> **Modal hosts a real detector, and the detector's job is to produce state transitions, not bounding boxes. Modal also calls Claude server-side, so the crop is made and read in the same process it was detected in.**

**This is not hedging — it is a narrower and more defensible claim than PIVOT.md's.** PIVOT.md says "Modal hosts a vision model." We say: *Modal hosts the stateful arrival detector, because the arrival event is a temporal object and Claude is a stateless oracle.* That sentence survives an adversarial judge; "we ran YOLO on a GPU" does not.

Three concrete consequences that follow from the verdict, all of which change the build:

1. **The detector and the Claude call live in the same Modal app.** The full frame goes up **once**. The crop is made server-side and handed straight to Claude without a round trip back to the laptop and up again. A 896 × 280 JPEG crop is ~40 kB; on venue wifi that saved round trip is **~100–200 ms** — a real, measurable, non-rhetorical win, and it keeps `ANTHROPIC_API_KEY` off a laptop that is about to be handed to a judge.

2. **The client integration is one endpoint.** The laptop POSTs a frame at 2 Hz and reads back `{event, reading}`. The two-stage haptic falls out of polling for free: an early poll returns `event: "BUS_ARRIVED", reading: null`; a later poll returns the reading. No callbacks, no websockets, no second integration when the phone/laptop fallback fires.

3. **What we explicitly do NOT claim on stage.** We do not claim we needed a GPU for throughput (we don't, at 2 fps). We do not claim Claude can't read the number (it can, better than YOLO). We do not claim cost forced our hand at demo scale (it didn't). Claiming any of those invites the exact question the transcript already asked, and we would lose.

### What to say on stage, verbatim

> "Claude can read the bus number better than any detector we could train in a day — that was never the question. The question is *when*. 'A bus arrived' is not a property of a frame, it's a change between frames, and the Claude API is stateless by design. So Modal holds the two seconds of history that turn a stream of detections into one event, fires the immediate 'something arrived' pulse from the detector, and calls Claude once — on a crop, not a street scene. Detection is *when*. Claude is *what*. That's the split."

### If you decide to cut the detector anyway

If time runs out and YOLO has to go, **the honest fallback is not "no Modal."** It is:

> Modal hosts the stateful fusion endpoint — the arrival state machine, the debounce, the multi-frame vote, the confidence gate, and the Claude call — with a cheap non-ML frame-difference trigger in place of YOLO.

That is still a real, non-decorative use of a server. **But say so.** The line becomes *"we host the fusion layer on Modal; the detector is a roadmap item"* — not *"we used Modal for vision."* Do not claim a GPU workload you cut. And note the honest weakness: a CPU-only fusion endpoint is not a *Modal-shaped* workload (it would run equally well anywhere), so this fallback costs you the sponsor-fit story even though it keeps the architecture honest.

---

## Verified Code — Modal Endpoint

Every decorator, parameter name, and default below is verified against the URL in its attribution comment. **Three constructs are marked `[INFERRED]`** — they follow from documented behaviour but are not verbatim doc statements; they are flagged so nobody mistakes them for verified.

Save as `bus_vision.py`.

```python
# bus_vision.py — Modal arrival-detection + Claude-read endpoint
#
# Deploy:  modal deploy bus_vision.py
# Dev:     modal serve bus_vision.py       # ephemeral, hot-reloads, "-dev" URL suffix
#
# Package versions verified 2026-07-18:
#   modal     == 1.5.2       (https://pypi.org/pypi/modal/json)
#   anthropic == 0.117.0     (https://pypi.org/pypi/anthropic/json, released 2026-07-16)

import base64
import io
import json
import os
import threading

import modal

# modal.App — current app object.
# https://modal.com/docs/reference/modal.App (2026-07-18)
app = modal.App("bus-vision")

# Image build.
#   .apt_install("libgl1", "libglib2.0-0")  — verbatim from the Ultralytics Modal
#     quickstart; ultralytics fails to import without them.
#     https://docs.ultralytics.com/guides/modal-quickstart/ (2026-07-18)
#   "fastapi[standard]" — @modal.fastapi_endpoint has an implicit FastAPI
#     dependency; the docs name the decorator after it for exactly this reason.
#     https://modal.com/docs/guide/webhooks (2026-07-18)
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("libgl1", "libglib2.0-0")
    .pip_install(
        "ultralytics",
        "anthropic==0.117.0",
        "pillow",
        "fastapi[standard]",
    )
    # OPTIONAL cold-start win: bake yolo26n.pt into the image so it is not
    # downloaded on first request. `run_commands` is a standard modal.Image
    # method but was NOT verified in this audit — check
    # https://modal.com/docs/reference/modal.Image before uncommenting.
    # .run_commands("python -c \"from ultralytics import YOLO; YOLO('yolo26n.pt')\"")
)

# --------------------------------------------------------------------------
# Container-local state.
#
# [INFERRED] Module globals persist for the life of one warm container. This
# follows directly from Modal's documented container-reuse model — the whole
# reason @modal.enter() exists is that "The container entry handler is called
# when a new container is started ... useful for doing one-time initialization,
# such as loading model weights."
#   https://modal.com/docs/guide/lifecycle-functions (2026-07-18)
# It is NOT a verbatim doc guarantee. It is safe here because max_containers=1
# pins us to exactly one process.
# --------------------------------------------------------------------------
_MODEL = None
_STATE = {
    "present": False,      # debounced "a bus is in frame"
    "hits": 0,             # consecutive frames WITH a bus
    "misses": 0,           # consecutive frames WITHOUT a bus
    "arrival_id": 0,       # increments once per arrival — the fire-once latch
    "reading": None,       # {"route","destination","confidence"} once Claude answers
    "reading_for": -1,     # which arrival_id the reading belongs to
    "votes": [],           # accumulated Claude route strings for this arrival
}

# COCO class index for "bus". Verified: 80 classes, index 5.
#   https://docs.ultralytics.com/datasets/detect/coco/ (2026-07-18)
BUS_CLASS_ID = 5

CONF_MIN = 0.35            # per-frame YOLO confidence floor
HITS_TO_ARRIVE = 2         # 2 consecutive frames @ 2 Hz ≈ 1 s of evidence
MISSES_TO_CLEAR = 4        # 4 consecutive misses ≈ 2 s before re-arming
VOTE_ROUNDS = 3            # Claude calls per arrival
VOTES_NEEDED = 2           # agreeing votes required to emit a route

CLAUDE_MODEL = "claude-opus-4-8"
# Faster/cheaper swap if the demo feels laggy — one string, nothing else changes:
# CLAUDE_MODEL = "claude-haiku-4-5"

ROUTE_SCHEMA = {
    "type": "object",
    "properties": {
        "route":       {"type": "string"},
        "destination": {"type": "string"},
        # Enum values are lowercase; the docs warn output capitalisation may
        # differ, so every comparison below is .lower()'d.
        "confidence":  {"type": "string", "enum": ["high", "low"]},
    },
    "required": ["route", "destination", "confidence"],
    "additionalProperties": False,   # REQUIRED by structured outputs
}

PROMPT = """You are reading the destination blind on the front of a London bus \
for a DeafBlind user who cannot see the display and cannot hear the announcement.

Report only what is printed on the blind in this image.

Rules:
- `route` is the route identifier exactly as printed (usually 1-3 characters, \
may include a letter, e.g. "88", "N3", "P5"). Do not normalise, expand or guess.
- `destination` is the destination text exactly as printed, in Title Case.
- `confidence` is "high" only if EVERY character of `route` is individually \
legible to you. If any character is ambiguous, blurred, cropped or occluded, \
set `confidence` to "low".
- If you cannot read a route at all, set `route` to "" and `confidence` to "low".

Never guess. A wrong route number sent to this user is worse than no answer."""


def _read_blind(crop_jpeg: bytes, arrival_id: int) -> None:
    """Call Claude on the crop. Runs on a background thread; writes to _STATE.

    [INFERRED] A plain threading.Thread inside a Modal container is ordinary
    Python — no Modal API is involved. The Claude call is network-I/O bound, so
    the GIL is released and the main thread keeps serving /ingest polls. This is
    what makes the two-stage haptic possible without websockets.
    """
    import anthropic

    client = anthropic.Anthropic()          # reads ANTHROPIC_API_KEY from env
    b64 = base64.standard_b64encode(crop_jpeg).decode("utf-8")

    for _ in range(VOTE_ROUNDS):
        if _STATE["arrival_id"] != arrival_id:
            return                          # a new arrival superseded this one
        try:
            resp = client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=256,
                # No `thinking` field: on Opus 4.8 omitting it runs WITHOUT
                # thinking, which is what we want on a latency-critical one-shot.
                #   https://platform.claude.com/docs/en/about-claude/models/overview
                output_config={
                    "effort": "low",
                    "format": {"type": "json_schema", "schema": ROUTE_SCHEMA},
                },
                # Image BEFORE text — Anthropic's documented preference.
                #   https://platform.claude.com/docs/en/build-with-claude/vision
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "image", "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": b64,
                        }},
                        {"type": "text", "text": PROMPT},
                    ],
                }],
            )
            # output_config.format guarantees the first text block is valid JSON.
            text = next(b.text for b in resp.content if b.type == "text")
            parsed = json.loads(text)
        except Exception as exc:            # network / rate limit / anything
            print(f"[claude] call failed: {exc}")
            continue

        if str(parsed.get("confidence", "")).lower() == "high" and parsed.get("route"):
            _STATE["votes"].append((parsed["route"], parsed.get("destination", "")))

    # Confidence gate: a route is emitted only on VOTES_NEEDED agreeing
    # high-confidence readings. Anything else stays None → WAIT haptic.
    routes = [r for r, _ in _STATE["votes"]]
    for route in set(routes):
        if routes.count(route) >= VOTES_NEEDED:
            dest = next(d for r, d in _STATE["votes"] if r == route)
            _STATE["reading"] = {
                "route": route, "destination": dest, "confidence": "high",
            }
            _STATE["reading_for"] = arrival_id
            return
    _STATE["reading"] = None
    _STATE["reading_for"] = arrival_id      # answered, and the answer is "unsure"


# --------------------------------------------------------------------------
# THE ENDPOINT.
#
# Decorator ORDER is load-bearing: @app.function() ABOVE,
# @modal.fastapi_endpoint() directly above the function. Reversing them
# deploys cleanly and produces no HTTP route.
#   https://modal.com/docs/guide/webhooks (2026-07-18)
# --------------------------------------------------------------------------
@app.function(
    image=image,
    gpu="T4",                    # https://docs.ultralytics.com/guides/modal-quickstart/
    secrets=[modal.Secret.from_name("anthropic")],   # https://modal.com/docs/guide/secrets
    min_containers=1,            # never scale to zero — the warmth guarantee
    max_containers=1,            # exactly one process ⇒ globals are the state store
    scaledown_window=1200,       # 20 min = the documented MAXIMUM (range 2 s–20 min)
    timeout=120,                 # seconds; default is 300
)
@modal.fastapi_endpoint(method="POST")
def ingest(item: dict):
    """POST {"frame_b64": "<base64 JPEG>"} at ~2 Hz. Returns the event + reading.

    Response:
      {"event": "NONE" | "BUS_ARRIVED" | "BUS_GONE",
       "present": bool,
       "confidence": float,
       "arrival_id": int,
       "reading": null | {"route","destination","confidence"},
       "reading_ready": bool}
    """
    global _MODEL
    from PIL import Image
    from ultralytics import YOLO

    if _MODEL is None:
        # yolo26n.pt is the weight file used throughout the official
        # Ultralytics Modal quickstart.
        #   https://docs.ultralytics.com/guides/modal-quickstart/ (2026-07-18)
        _MODEL = YOLO("yolo26n.pt")

    frame = Image.open(io.BytesIO(base64.b64decode(item["frame_b64"]))).convert("RGB")
    result = _MODEL(frame, verbose=False)[0]

    # Best `bus` (COCO class 5) box in this frame.
    best, best_conf = None, 0.0
    for box in result.boxes:
        if int(box.cls) == BUS_CLASS_ID and float(box.conf) > best_conf:
            best, best_conf = box, float(box.conf)
    seen = best is not None and best_conf >= CONF_MIN

    # ---- debounce / hysteresis: the thing Claude structurally cannot do -----
    event = "NONE"
    if seen:
        _STATE["hits"] += 1
        _STATE["misses"] = 0
    else:
        _STATE["misses"] += 1
        _STATE["hits"] = 0

    if not _STATE["present"] and _STATE["hits"] >= HITS_TO_ARRIVE:
        _STATE["present"] = True
        _STATE["arrival_id"] += 1
        _STATE["reading"] = None
        _STATE["votes"] = []
        event = "BUS_ARRIVED"                      # ← the fire-once latch

        # Crop the destination blind: top 30% of the bus box, long edge 896 px.
        # 896×280 ⇒ ceil(896/28)*ceil(280/28) = 32*10 = 320 visual tokens.
        #   https://platform.claude.com/docs/en/build-with-claude/vision
        x1, y1, x2, y2 = [int(v) for v in best.xyxy[0].tolist()]
        crop = frame.crop((x1, y1, x2, y1 + int(0.30 * (y2 - y1))))
        w, h = crop.size
        if w > 896:
            crop = crop.resize((896, max(1, int(h * 896 / w))))
        buf = io.BytesIO()
        crop.save(buf, format="JPEG", quality=92)  # high q: heavy JPEG hurts text

        threading.Thread(
            target=_read_blind, args=(buf.getvalue(), _STATE["arrival_id"]),
            daemon=True,
        ).start()

    elif _STATE["present"] and _STATE["misses"] >= MISSES_TO_CLEAR:
        _STATE["present"] = False
        event = "BUS_GONE"

    return {
        "event": event,
        "present": _STATE["present"],
        "confidence": round(best_conf, 3),
        "arrival_id": _STATE["arrival_id"],
        "reading": _STATE["reading"],
        "reading_ready": _STATE["reading_for"] == _STATE["arrival_id"]
                         and _STATE["arrival_id"] > 0,
    }
```

**Setup and deploy — exact commands:**

```bash
pip install "modal==1.5.2"
modal setup                                          # browser auth

# Secret name "anthropic" must match modal.Secret.from_name("anthropic") above.
# Env var name must be ANTHROPIC_API_KEY — the SDK reads it with no argument.
#   https://modal.com/docs/guide/secrets  (2026-07-18)
modal secret create anthropic ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"

modal deploy bus_vision.py
```

Deployed URL pattern (https://modal.com/docs/guide/webhook-urls, 2026-07-18):

```
https://<workspace>--bus-vision-ingest.modal.run
```

Use `modal serve bus_vision.py` while iterating — it hot-reloads and appends a `-dev` suffix so it cannot collide with the deployed demo endpoint. **Deploy the real one at least an hour before you present, and do not touch it again.**

**Not asserted here:** Modal's webhooks guide contains **no example** of `@modal.fastapi_endpoint` on a method of an `@app.cls()` class, so this snippet deliberately does not use that combination. If you want `@modal.enter()` for model loading (which is the cleaner pattern), the verified form is `@app.cls()` + `@modal.enter()` + `@modal.method()` — verify the web-endpoint-on-a-class combination against https://modal.com/docs/reference/modal.Cls before relying on it at 3 a.m.

---

## Verified Code — Claude Vision Structured Call

Standalone, testable without Modal. This is the same call the endpoint makes — develop it here first, then paste it in.

**Package:** `anthropic==0.117.0` (PyPI, released 2026-07-16, fetched 2026-07-18). Requires Python ≥ 3.9.

```bash
pip install "anthropic==0.117.0"
export ANTHROPIC_API_KEY="sk-ant-..."
```

```python
# read_blind.py — python read_blind.py crop.jpg
import base64
import json
import sys

import anthropic

# Zero-arg constructor reads ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN, or an
# `ant auth login` profile) from the environment. Never hardcode a key.
client = anthropic.Anthropic()

MODEL = "claude-opus-4-8"      # $5/$25 per MTok, "Moderate" latency, high-res tier
# MODEL = "claude-haiku-4-5"   # $1/$5 per MTok, "Fastest" — the swap if stage lags
#   https://platform.claude.com/docs/en/about-claude/pricing (2026-07-18)

SCHEMA = {
    "type": "object",
    "properties": {
        "route":       {"type": "string"},
        "destination": {"type": "string"},
        "confidence":  {"type": "string", "enum": ["high", "low"]},
    },
    "required": ["route", "destination", "confidence"],
    # REQUIRED by structured outputs — objects must set this to false.
    #   https://platform.claude.com/docs/en/build-with-claude/structured-outputs
    "additionalProperties": False,
}

PROMPT = """You are reading the destination blind on the front of a London bus \
for a DeafBlind user who cannot see the display and cannot hear the announcement.

Report only what is printed on the blind in this image.

Rules:
- `route` is the route identifier exactly as printed (usually 1-3 characters, \
may include a letter, e.g. "88", "N3", "P5"). Do not normalise, expand or guess.
- `destination` is the destination text exactly as printed, in Title Case.
- `confidence` is "high" only if EVERY character of `route` is individually \
legible to you. If any character is ambiguous, blurred, cropped or occluded, \
set `confidence` to "low".
- If you cannot read a route at all, set `route` to "" and `confidence` to "low".

Never guess. A wrong route number sent to this user is worse than no answer."""


def read_blind(path: str) -> dict:
    # base64 must have no newlines — standard_b64encode is correct.
    #   https://platform.claude.com/docs/en/build-with-claude/vision
    b64 = base64.standard_b64encode(open(path, "rb").read()).decode("utf-8")

    resp = client.messages.create(
        model=MODEL,
        max_tokens=256,                       # output is ~45 tokens of JSON
        # `thinking` deliberately OMITTED. On Opus 4.8/4.7 an omitted `thinking`
        # field runs WITHOUT thinking — correct for a latency-critical one-shot.
        # Adding {"type": "adaptive"} here would cost latency and buy nothing.
        output_config={
            "effort": "low",                  # low | medium | high | xhigh | max
            "format": {"type": "json_schema", "schema": SCHEMA},
        },
        messages=[{
            "role": "user",
            "content": [
                # Image FIRST — Anthropic: "Claude works best when images come
                # before text."  https://.../build-with-claude/vision
                {"type": "image", "source": {
                    "type": "base64",
                    "media_type": "image/jpeg",   # jpeg | png | gif | webp only
                    "data": b64,
                }},
                {"type": "text", "text": PROMPT},
            ],
        }],
    )

    # output_config.format guarantees the first text block is schema-valid JSON.
    text = next(b.text for b in resp.content if b.type == "text")
    out = json.loads(text)

    # Docs warn: "Output may differ in capitalization from schema enum values."
    # Always compare case-insensitively.
    out["confidence"] = str(out["confidence"]).lower()

    print(f"usage: in={resp.usage.input_tokens} out={resp.usage.output_tokens}")
    return out


if __name__ == "__main__":
    print(json.dumps(read_blind(sys.argv[1]), indent=2))
```

**Expected output on the locked prop:**

```json
{
  "route": "88",
  "destination": "Clapham Common",
  "confidence": "high"
}
```

**Per-line attribution**

| Line | Verified at | Fetched |
|---|---|---|
| `anthropic==0.117.0` | https://pypi.org/pypi/anthropic/json | 2026-07-18 |
| `anthropic.Anthropic()` zero-arg env resolution | `claude-api` skill, `python/claude-api/README.md` | 2026-07-18 |
| `model="claude-opus-4-8"` / `"claude-haiku-4-5"` | https://platform.claude.com/docs/en/about-claude/models/overview | 2026-07-18 |
| Pricing $5/$25 and $1/$5 | https://platform.claude.com/docs/en/about-claude/pricing | 2026-07-18 |
| `output_config.format` + `type:"json_schema"` + `schema` | https://platform.claude.com/docs/en/build-with-claude/structured-outputs | 2026-07-18 |
| `additionalProperties: false` mandatory | same | 2026-07-18 |
| Enum-capitalisation caveat | same | 2026-07-18 |
| `output_config.effort` accepts `low` | `claude-api` skill §Thinking & Effort; effort is documented as living inside `output_config` | 2026-07-18 |
| Omitting `thinking` ⇒ no thinking on Opus 4.8 | `claude-api` skill §Thinking & Effort; corroborated by models overview ("Extended thinking: No / Adaptive thinking: Yes") | 2026-07-18 |
| Image content-block shape, base64 source, media types | https://platform.claude.com/docs/en/build-with-claude/vision | 2026-07-18 |
| "images before text" ordering | same | 2026-07-18 |
| `resp.usage.input_tokens` / `.output_tokens` | `claude-api` skill §Prompt Caching / verifying usage | 2026-07-18 |

**One combination NOT verbatim-verified:** placing `effort` and `format` together inside a single `output_config`. `output_config` is documented as the container for both (`{"effort": ...}` and `{"format": ...}` appear separately, and `{"effort": ..., "task_budget": ...}` appears combined), so the combination is a sound reading — but if you get a `400`, **drop `effort` first** and re-test; it is the non-essential half.

---

## Hardcoded Application Spec

Everything here is a literal, committed value. **Nothing below is an example.** Where PIVOT.md left a choice open, this section closes it.

### 1. The prop — exact, and one correction that matters

> **⚠️ Correction to PIVOT.md v2 §9.** PIVOT.md says *"Demo with a printed sign or tablet. A large clear route number is a legitimate prop."* **A printed route number is not a bus. COCO class 5 (`bus`) will not fire on a sheet of paper with "88" on it, and the entire detection stage produces nothing.** The prop must be a **picture of a bus**, with the blind legible on it. This is the single highest-value correction in this document — it is the difference between the pipeline working and the pipeline silently returning zero detections at 4 a.m.

**LOCKED PROP:**

| Property | Value |
|---|---|
| What it is | **A3 landscape colour print of a head-on photograph of a London double-decker bus**, front filling the sheet |
| Sheet size | A3 landscape, **420 × 297 mm** |
| Route number | **88** |
| Destination | **CLAPHAM COMMON** |
| Blind styling | White text on black, mimicking a TfL LED destination blind |
| Blind area on sheet | Top **25 %** of the sheet (deliberately exaggerated vs. a real bus's ~7 %) |
| Route "88" cap height on sheet | **≥ 60 mm** |
| Destination cap height on sheet | **≥ 25 mm** |
| Typeface | Helvetica Bold / Arial Bold (use TfL Johnston if anyone has it — cosmetic only) |
| Finish | **Matte if possible.** Gloss produces specular glare under venue spotlights and will destroy the read. |
| **Fallback prop** | Same render full-screen on an **11–13″ tablet or laptop in landscape**, brightness 100 %. Self-illuminating, immune to venue lighting, re-renderable in seconds if anything changes. **Build this one first** — it needs no printer. |
| Viewing distance | **1.0 – 1.5 m** from the camera |
| Camera capture | **1280 × 720**, JPEG quality 85 |
| Camera | Laptop webcam (phone is optional and off the critical path) |

**Why route 88 / Clapham Common, and why it is factually right:** London bus route 88 currently runs **Parliament Hill Fields ↔ Clapham Common** (southern terminus shown on the blind as Clapham Common / "Omnibus Clapham") — verified at https://en.wikipedia.org/wiki/London_Buses_route_88 and https://tfl.gov.uk/bus/route/88/, fetched 2026-07-18. It is a real route, with a real southbound destination matching the prop, and it is the number already used in both the transcript and PIVOT.md. **Adopted. Do not change it** — continuity across the deck, the code, and the transcript is worth more than a shorter number.

**Legibility arithmetic (this is why the numbers above are the numbers):**

At distance *d* with a ~60° horizontal FOV webcam, the visible field width is `W = 2·d·tan(30°) = 1.155·d`.

| Distance | Field width | px/mm at 1280 px | "88" cap (60 mm) | Destination cap (25 mm) |
|---|---|---|---|---|
| 1.0 m | 1155 mm | 1.108 | **66 px** | **28 px** |
| 1.5 m | 1733 mm | 0.739 | **44 px** | **18 px** |
| 2.0 m | 2310 mm | 0.554 | **33 px** | **14 px** |

Anthropic's own limitation note says Claude *"might hallucinate or make mistakes when interpreting low-quality, rotated, or very small images under 200 pixels."* At 1.0–1.5 m the destination line sits at 18–28 px cap height inside a 896 px-wide crop — comfortably legible. **At 2.0 m the destination degrades. Stand at 1.2 m and mark the spot on the floor with tape.**

### 2. The pipeline — every hop, with literal bytes and literal JSON

**Stage 0 — Capture (laptop, local).**
Webcam frame, 1280 × 720, JPEG q85 → **~90 kB** → base64 → **~120 kB** string.
Cadence: **2 Hz** (every 500 ms).

```json
POST https://<workspace>--bus-vision-ingest.modal.run
{"frame_b64": "/9j/4AAQSkZJRgABAQAAAQ...<~120 kB>...9k="}
```

**Stage 1 — Modal / YOLO26n on T4.**
In: the decoded 1280 × 720 RGB frame. Out: boxes. Filter to `cls == 5` (`bus`), keep the highest `conf ≥ 0.35`.

Frame *N* (nothing in view) — response:
```json
{"event":"NONE","present":false,"confidence":0.0,"arrival_id":0,
 "reading":null,"reading_ready":false}
```

Frame *N+1* (prop raised, first detection — **not enough evidence yet**) — response:
```json
{"event":"NONE","present":false,"confidence":0.71,"arrival_id":0,
 "reading":null,"reading_ready":false}
```

Frame *N+2* (second consecutive detection — **latch fires**) — response:
```json
{"event":"BUS_ARRIVED","present":true,"confidence":0.83,"arrival_id":1,
 "reading":null,"reading_ready":false}
```
→ **Client fires BUS ARRIVING haptic immediately.** Elapsed from prop being raised: ~500 ms (one debounce frame) + ~150 ms round trip ≈ **650 ms**.

**Stage 2 — Crop (Modal, in-process, ~5 ms).**
Bus bbox `(x1,y1,x2,y2)` e.g. `(210, 96, 1058, 690)`. Blind region = top 30 % → `(210, 96, 1058, 274)` = 848 × 178 → resized to long edge 896 → **896 × 188** → JPEG q92 → **~34 kB**.
Visual-token cost: ⌈896/28⌉ × ⌈188/28⌉ = 32 × 7 = **224 visual tokens**.

**Stage 3 — Claude (Modal → Anthropic, background thread, ×3).**

Request body (abbreviated):
```json
{
  "model": "claude-opus-4-8",
  "max_tokens": 256,
  "output_config": {
    "effort": "low",
    "format": {"type": "json_schema", "schema": {
      "type": "object",
      "properties": {
        "route": {"type": "string"},
        "destination": {"type": "string"},
        "confidence": {"type": "string", "enum": ["high", "low"]}
      },
      "required": ["route", "destination", "confidence"],
      "additionalProperties": false
    }}
  },
  "messages": [{"role": "user", "content": [
    {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
     "data": "/9j/4AAQ...<~45 kB base64 of the 34 kB crop>...9k="}},
    {"type": "text", "text": "<PROMPT, verbatim below>"}
  ]}]
}
```

**The exact prompt text sent to Claude — copy this verbatim:**

```
You are reading the destination blind on the front of a London bus for a
DeafBlind user who cannot see the display and cannot hear the announcement.

Report only what is printed on the blind in this image.

Rules:
- `route` is the route identifier exactly as printed (usually 1-3 characters,
  may include a letter, e.g. "88", "N3", "P5"). Do not normalise, expand or guess.
- `destination` is the destination text exactly as printed, in Title Case.
- `confidence` is "high" only if EVERY character of `route` is individually
  legible to you. If any character is ambiguous, blurred, cropped or occluded,
  set `confidence` to "low".
- If you cannot read a route at all, set `route` to "" and `confidence` to "low".

Never guess. A wrong route number sent to this user is worse than no answer.
```

**Real example response** (first text block, schema-guaranteed valid JSON):
```json
{"route": "88", "destination": "Clapham Common", "confidence": "high"}
```

Usage on a successful call: `input_tokens ≈ 505` (224 visual + ~281 prompt & auto system), `output_tokens ≈ 24`. Cost on `claude-opus-4-8`: **$0.0031**. Three votes: **$0.0093**.

**Stage 4 — Vote and gate (Modal).**
Three high-confidence readings: `["88", "88", "88"]` → 3 ≥ `VOTES_NEEDED` (2) → emit.

**Stage 5 — Client polls again (~2 s after arrival) — response:**
```json
{"event":"NONE","present":true,"confidence":0.85,"arrival_id":1,
 "reading":{"route":"88","destination":"Clapham Common","confidence":"high"},
 "reading_ready":true}
```
→ **Client fires NUMBERS haptic for "88".**

**Stage 6 — Haptic (ESP32 over Wi-Fi/BLE), exact timing.**

| Beat | Pattern | Duration |
|---|---|---|
| BUS ARRIVING | Both motors, 2 × 300 ms medium pulses, 200 ms gap | **800 ms** |
| — silence — | | ~1.2 s |
| NUMBER "8" | 8 pulses on R, 150 ms on / 150 ms off | **2.4 s** |
| digit gap | silence | **600 ms** |
| NUMBER "8" | 8 pulses on R, 150 ms on / 150 ms off | **2.4 s** |
| **Total from prop raised** | | **≈ 8.1 s** |

> **Know this number and own it.** "88" is the **worst case** in the whole vocabulary — two 8s is 16 pulses. At PIVOT.md's 150/150 ms that is 5.4 s of pulsing after a ~2 s Claude wait. If that feels too long on stage, tighten to **120 ms on / 120 ms off**, which brings the digits to 4.4 s and the total to ≈ 7.0 s. **Do not silently drop to one digit — that is a lie about what the system delivered.** A better move is to say it out loud: *"88 is the slowest number this vocabulary can produce; here's why digit-by-digit is still right."*

### 3. Locked IN / OUT list

**IN — built for the demo. Nothing else gets built.**

| # | In scope | Definition of done |
|---|---|---|
| 1 | Modal `/ingest` endpoint, T4, YOLO26n, COCO class 5 | Returns `BUS_ARRIVED` within 2 frames of the prop being raised |
| 2 | Debounce state machine (2 hits arrive, 4 misses clear) + fire-once latch | One arrival ⇒ exactly one `BUS_ARRIVED` and exactly one Claude batch |
| 3 | Server-side crop, top 30 % of bbox, long edge 896 px | Crop contains the whole blind and nothing above/below it |
| 4 | Claude structured read, `output_config.format`, 3-vote | Returns `{route,destination,confidence}` or `null` |
| 5 | Confidence gate → NUMBERS haptic or WAIT haptic | Never emits a route from a single low-confidence read |
| 6 | Two-stage haptic: BUS ARRIVING then NUMBER n | Both fire, in order, on the wrist |
| 7 | Debug screen: bbox + live JSON + state machine | Judges can watch the system think |
| 8 | Laptop webcam as the camera | No phone build on the critical path |
| 9 | Disclosed manual force-arrival key (`SPACE`) | Works, and is **announced** if used |

**OUT — explicitly cut. One line each.**

| # | Cut | Reason |
|---|---|---|
| 1 | **General open-world navigation** | Already ruled out by the team. The transcript's own football-pitch argument is the reason: constrained, measured environments are tractable; the open street is not. |
| 2 | **Turn-by-turn routing** | Needs a routing engine, a destination-entry UX a DeafBlind user can actually operate, and continuous position. None exist in 1.5 days. |
| 3 | **GPS / map integration** | Adds a sensor, a permissions flow and outdoor testing, and contributes nothing to "which bus is in front of me". |
| 4 | **TfL arrivals API** | Correct in production, but it answers *"which buses are due"*, not *"which bus is at the kerb right now"* — and wiring it hides the vision work the demo exists to show. Roadmap slide. |
| 5 | **Depth Anything V2 / distance-to-bus** | A second model to cold-start on stage for a number no judge can verify. Pure risk. |
| 6 | **Flagging / listing every bus at the stop** | Transcript identifies this as harder; one bus, one answer, one haptic. |
| 7 | **Face recognition for known contacts** | Different problem, different consent model — and Claude *"cannot be used to name people in images and refuses to do so"* (vision docs), so it cannot be built on this stack anyway. |
| 8 | **Crossing state / pedestrian signals** | Highest stakes, highest liability; already roadmap-only in PIVOT.md v1 §7E. |
| 9 | **Reading the stop's own arrival board** | Different OCR geometry, different prop, no time to do two OCR problems. |
| 10 | **Any speech or audio output** | The user cannot hear. Adding audio would undercut the one-sentence pitch. |
| 11 | **On-device VLM** | Roadmap. Not a 1.5-day item. |
| 12 | **Mobile app** | Laptop webcam removes an entire build from the critical path. PIVOT.md §8 already says this; hold the line. |
| 13 | **GPU memory snapshotting** | Alpha, requires code changes to pay off, and `min_containers=1` solves the same problem for free. |

### 4. The failure path — concrete rule

Carrying PIVOT.md v2 §9's logic ("telling a DeafBlind person the wrong bus is worse than telling them nothing") into an enforceable rule. **The reason it is worse is not politeness — it is that acting on a wrong route means boarding a wrong bus and ending up somewhere unknown, which is a strictly worse state than remaining at a known stop.**

```
GIVEN one arrival event (arrival_id = N):

  collect up to VOTE_ROUNDS (3) Claude readings on the crop.
  keep only readings where confidence.lower() == "high" AND route != "".

  IF some route string appears in >= VOTES_NEEDED (2) of those kept readings:
      EMIT  NUMBERS haptic for that route's digits
      SHOW  the route + destination on the debug screen, marked CONFIRMED
  ELSE:
      EMIT  WAIT haptic  (alternating L-R-L-R, 200 ms each, 3 cycles = 2.4 s)
      SHOW  "UNREADABLE — held" on the debug screen, with the raw readings
      DO NOT emit any digits. DO NOT retry silently.
      RE-ARM: wait for the next BUS_GONE -> BUS_ARRIVED transition.
```

**Four properties this rule has, deliberately:**

1. **A single high-confidence reading is not enough.** One confident hallucination cannot reach the wrist. Two independent calls must agree.
2. **The WAIT pattern is a real answer, not silence.** The user learns "the system saw a bus and could not read it" — which is actionable (ask someone, wait for the next one). Silence is indistinguishable from a dead device.
3. **No silent retry.** If the system quietly kept re-reading, the user would feel a NUMBERS pattern arrive at an unpredictable moment, possibly after the bus has left. The event is bound to the arrival.
4. **It is demoable as a feature.** Cover half the blind with your hand on stage. Two pulses fire (a bus is there), then the WAIT pattern instead of digits. Then say: *"That's the system refusing to guess. For this user, a wrong number means boarding a wrong bus. We would rather say nothing than say 87."* **This is the strongest 20 seconds in the demo and it costs nothing to build.**

---

## Resolved Competitor References

### Reference 1 — *"It's massive. It won't fit on your head. Is that huge? And it's like 50 grand… very basic LiDAR… it has this sensor right here."*

**Identified: `.lumen` glasses, by dotLumen (Romania).** Confidence: **high on identity, low on the price figure.**

Every distinguishing feature in the garbled transcript matches (all fetched 2026-07-18):

| Transcript fragment | `.lumen` fact | Source |
|---|---|---|
| *"very basic lilac"* (ASR for **LiDAR**) | Uses LiDAR + cameras + AI | https://lidarnews.com/visual-impairment-headset-relies-on-lidar/ |
| *"it has this sensor right here"* (gesturing at forehead) | Head-worn; *"gentle vibrations on your forehead"*; worn on the forehead, strapped around the head | https://www.dotlumen.com/glasses |
| *"it won't fit on your head, it's huge"* | Bulky headset form factor; markets *"compatible with 80% of adult heads"* — a claim you only make when fit is a known problem | https://www.dotlumen.com/glasses |
| Guide-dog framing throughout the surrounding transcript | *"the world's first technology that replicates the functionality of a guide dog"* | https://www.dotlumen.com/glasses |

**The "50 grand" is wrong and should not be repeated.** `.lumen` glasses are **€9,999 (VAT included)** — roughly £8,700 / $11,800. The £30k–£60k figure almost certainly leaked in from `.lumen`'s *own* marketing, which cites the **cost of training a guide dog at $30,000–$60,000** as its comparison point. **If anyone says "50 grand" on stage, a judge who knows this space will correct them and the credibility of every other number in the deck drops.** Say **"about ten thousand euros"** or say nothing.

**Genuinely distinct from PIVOT.md v2 §2? YES — and it is the most important omission in that table.** `.lumen` is the *only* prior-art device that is head-worn, LiDAR-based, **and haptic-output**. Every other row in PIVOT.md's table is either haptic-without-semantics (Sunu) or semantics-with-audio (NOA, Be My Eyes, Soundscape, Seeing AI). `.lumen` is the closest thing to our output modality that exists, and **omitting it makes "nobody combines sensing + semantics + haptics" look like a claim the team did not check.** Include it, and sharpen the claim.

**Prior-art row to add to PIVOT.md v2 §2:**

| Device | Sensing | Output | Gap for DeafBlind users |
|---|---|---|---|
| **`.lumen` glasses** (dotLumen, €9,999) | LiDAR + cameras + AI, scanning ~100×/sec; head-worn | **Haptic** — vibration on the forehead, steering the wearer like a guide dog's pull | **No microphone and no semantics.** Guides you *around* obstacles; cannot tell you *what* anything is. Bulky head-mounted form factor; shipping only in Romania. Closest device to our output channel — and it still cannot answer "which bus is this?" |

**How this sharpens the pitch, rather than weakening it.** The unoccupied square is now stated more precisely and more defensibly:

> ".lumen already proves haptics work for spatial guidance — it steers you around a lamppost the way a guide dog pulls your hand. What no device does, at any price, is tell you *what the thing in front of you is*. Steering is not the same as knowing. We're building the knowing half."

### Reference 2 — *"it'll connect you to someone and they basically ask a question because they're like, what is this ingredient?"*

**Identified: Aira** (aira.io) — the transcript's guess in the task brief is **correct**.

The transcript separately and explicitly covers Be My Eyes (*"it's a build volunteer anymore"* ≈ "it's built on volunteers"), so this is the *other* service in that category. Verified 2026-07-18 (https://aira.io/, https://itsaccessibility.syr.edu/aira-visual-interpreting-service/, https://dres.illinois.edu/community/accessibility-transportation/aira-on-demand-description-service/):

- Aira connects blind and low-vision users to **professional, Aira-certified visual interpreters** — not volunteers.
- Agents pass background checks, sign NDAs, and receive *"extensive training on orientation and mobility."*
- **Paid subscription**, with free access at Aira "Access Partner" locations (airports, universities, hospitals).
- Delivered as a **live audio call** describing the user's surroundings.

**Genuinely distinct from PIVOT.md v2 §2? NO — do not add a row.**

PIVOT.md already lists **Be My Eyes** with the gap stated as *"Requires hearing and speech."* Aira has the **identical** gap: it is a live human describing things **audibly** over a phone call. Adding a second row that says "audio only, requires hearing" pads the table without adding an argument, and a padded prior-art table reads as inflation.

**Instead: one clause inside the existing Be My Eyes row.** Change its Sensing cell to:

> Phone camera + human describer — **free volunteers (Be My Eyes) or paid certified interpreters (Aira)**

**Why this is worth doing anyway.** Aira is the *strongest* human-in-the-loop alternative that exists — professionally trained, O&M-certified, background-checked. Naming it and then noting it has the same closed channel is a much stronger move than ignoring it:

> "The best version of this that exists today is Aira — certified interpreters, trained in orientation and mobility, on call. It's excellent, and it's a phone call. Our user cannot take a phone call."

That single sentence pre-empts the "why not just call a human?" question, and it is the question this project will get.

---

## Cold-Start Risk & Demo Strategy

### The exact warming syntax

```python
@app.function(
    image=image,
    gpu="T4",
    min_containers=1,        # ← the guarantee. Never scales to zero.
    max_containers=1,
    scaledown_window=1200,   # ← 20 min, the documented maximum (range 2 s–20 min)
    timeout=120,
)
```

`min_containers=1` is what actually guarantees warmth: *"The minimum number of containers that should be kept warm, even when the Function is inactive"* (https://modal.com/docs/guide/scale). `scaledown_window=1200` is redundant belt-and-braces but costs nothing and eliminates a failure mode.

**Cost of holding it warm:** $0.000164/s (T4) + $0.0000131/s (1 core) + 8 × $0.00000222/s (memory) ≈ **$0.000195/s = $0.70/hour**. Leaving it warm from the moment you deploy until the moment you present, say 6 hours, costs **~$4.20** of a $30 credit. **This is the cheapest insurance available to this project. Buy it.**

### Should you pre-warm on a timer? No. Do something better.

A timer/cron pre-warm is the wrong tool: `min_containers=1` already does the job, and Modal Starter caps you at 5 cron jobs — spend them elsewhere or not at all.

**Do these two things instead:**

1. **Deploy at least 60 minutes before your slot and then do not touch the app.** Every `modal deploy` creates a new app version and forces a fresh cold start. **The single most likely way to lose this demo is a "one last tweak" deploy at T-5 minutes.** Use `modal serve` for all iteration (it uses a separate `-dev` URL and cannot touch the deployed endpoint) and treat `modal deploy` as a one-way door.

2. **Fire a warm-up request 60 seconds before you walk on.** Two things need warming, not one:
   - the **Modal container** (weights in GPU memory), and
   - the **Claude structured-output schema grammar** — the docs state that first use of a schema pays a **compilation cost**, then it is **cached for 24 hours**. A cold schema on your first live read adds latency to the exact moment the audience is watching.

```bash
# Run this 60 s before you present. Warms the container AND the schema cache.
python - <<'PY'
import base64, requests
URL = "https://<workspace>--bus-vision-ingest.modal.run"
frame = base64.b64encode(open("demo_prop.jpg","rb").read()).decode()
for i in range(4):                    # 4 frames: 2 to latch, 2 to exercise Claude
    print(i, requests.post(URL, json={"frame_b64": frame}, timeout=90).json())
PY
```

Run it until you see a `reading` come back non-null. **If that script is slow, you found out backstage instead of on stage.**

### Fallback if Modal is unreachable on stage — ranked, and pick before you need it

The venue wifi is the single most likely thing to fail, and it will fail for Modal and for Anthropic simultaneously. **Rank the fallbacks now and put the switch on a keyboard key.**

| Rank | Fallback | Setup cost | What the audience sees | Honesty cost |
|---|---|---|---|---|
| **1** | **Local `ultralytics` hot spare on the laptop** — same YOLO26n, same state machine, same `/ingest` contract, run against `localhost`. `--offline` flag flips the client's base URL. | ~30 min (the detection half of the code is identical; you strip the Modal decorators) | Detection and both haptic stages still work; the *reading* is the only thing missing | **Low** — say "we're running the detector locally because the venue network is down; the hosted path is the same code" |
| **2** | **Cached last-good response** — the client keeps the last successful `{route,destination,confidence}` and replays it when the endpoint times out, **with a visible `CACHED` badge on the debug screen** | ~10 min | Everything works | **Medium — and only acceptable with the badge visible.** An unbadged cached response shown as live is fabrication. Draw that line now, not at 4 a.m. |
| **3** | **Pre-recorded screen capture of a working run** | ~15 min | A video | **Zero, if you say "this is a recording."** Non-zero and fatal if you don't. |

**Recommended: build #1, prepare #3, and only use #2 with the badge.** #1 is the strongest because it *is* the real system minus the network, and because the code overlaps ~80 % with what you are already writing. Build it as a `--local` flag on the same client, not as a second program.

Do **not** rely on #2 alone. Judges ask to see it run twice.

### Does the two-stage haptic genuinely mask latency, or just relocate it?

**Honest answer: it relocates it, and relocation is the point — but only if stage one is genuinely fast.**

It does *not* mask latency. Total time from prop-raised to route-known is unchanged (~2–3 s). What changes is that the user gets **actionable information at 650 ms instead of at 2.5 s.** "A bus is here" is itself useful — a London bus dwells at a stop for perhaps 15–30 seconds, and knowing at 0.65 s rather than 2.5 s is nearly two extra seconds to start moving toward the door. That is a real UX win, not a stage trick.

**Where it becomes a trick and stops working:** if stage one is slow. If the arrival pulse lands at 1.5 s and the digits at 3.5 s, the audience does not perceive "coarse then precise" — they perceive **two lags**. The design reads as latency management only when stage one is fast enough to feel causal (< ~300 ms of *system* time on top of the 500 ms debounce window).

**This is the whole reason the detector has to be warm, and the whole reason the detector has to be a detector.** The two-stage haptic is not a story bolted onto the architecture — it is the architecture's user-facing consequence. If you cut the detector, cut the two-stage claim with it, honestly.

**One thing to say explicitly on stage**, because it converts a limitation into a design principle:

> "This is the same thing a human sighted guide does — a hand on your arm first, the explanation second. We didn't invent the two-stage pattern to hide our latency. We had latency, we looked at how humans already solve this, and it turns out they stage it too."

---

## Grounding Notes

Every URL fetched for this document, with date. **All fetches: 2026-07-18.**

**Modal**

| URL | Used for |
|---|---|
| https://modal.com/pricing | GPU/CPU/memory per-second pricing; Starter plan $30/month free credits; Starter caps |
| https://modal.com/docs/guide/billing | **"you must have a payment method on file in order to use Modal"** — the correction to PIVOT.md |
| https://modal.com/docs/reference/modal.App | Full `@app.function()` signature; all parameter names and defaults |
| https://modal.com/docs/reference/modal.fastapi_endpoint | `fastapi_endpoint` signature and parameters |
| https://modal.com/docs/guide/webhooks | Decorator order (verbatim `method="POST"` example); `web_endpoint` → `fastapi_endpoint` rename |
| https://modal.com/docs/guide/webhook-urls | Deployed URL pattern; `modal deploy` vs `modal serve` |
| https://modal.com/docs/guide/cold-start | "Containers boot in about one second"; `scaledown_window` default 60 s, range 2 s–20 min; `min_containers` / `buffer_containers` |
| https://modal.com/docs/guide/scale | Autoscaling parameter definitions, verbatim |
| https://modal.com/docs/guide/memory-snapshot | **GPU memory snapshots = ALPHA**; exact enabling syntax; incompatibility list |
| https://modal.com/docs/guide/modal-1-0-migration | `keep_warm`→`min_containers`, `concurrency_limit`→`max_containers`, `container_idle_timeout`→`scaledown_window` (v0.73.76); `web_endpoint`→`fastapi_endpoint` (v0.73.89) |
| https://modal.com/docs/guide/secrets | `modal.Secret.from_name()`; `modal secret create` CLI |
| https://modal.com/docs/guide/lifecycle-functions | `@app.cls()` / `@modal.enter()` / `@modal.method()` |
| https://modal.com/blog/truly-serverless-gpus | **Verbatim:** *"the addition of GPU memory snapshotting pushed down cold starts about six-fold, from ~70s to ~12s"* (Reducto); vLLM/SGLang snapshot benchmarks |
| https://pypi.org/pypi/modal/json | `modal == 1.5.2` |

**Ultralytics / YOLO**

| URL | Used for |
|---|---|
| https://docs.ultralytics.com/guides/modal-quickstart/ | Page exists; `bus.jpg`; verbatim output `4 persons, 1 bus`; `yolo26n.pt`; `gpu="T4"`; `apt_install("libgl1","libglib2.0-0")`; T4-sufficient claim |
| https://docs.ultralytics.com/datasets/detect/coco/ | 80 COCO classes; **`bus` = index 5** |

**Claude / Anthropic**

| URL | Used for |
|---|---|
| https://platform.claude.com/docs/en/build-with-claude/vision | Image content-block structure; base64/url/file source types; media types; 10 MB / 8000 px / 100–600 images limits; **`ceil(w/28)×ceil(h/28)` visual-token formula**; high-res vs standard tier; images-before-text; people-identification refusal |
| https://platform.claude.com/docs/en/build-with-claude/structured-outputs | `output_config.format` / `json_schema` / `schema`; GA status; `additionalProperties:false` requirement; enum-capitalisation caveat; schema-compilation latency + 24 h cache; incompatibilities |
| https://platform.claude.com/docs/en/about-claude/models/overview | Model IDs; context windows; **"Comparative latency" qualitative ratings**; adaptive vs extended thinking per model |
| https://platform.claude.com/docs/en/about-claude/pricing | Opus 4.8 $5/$25; Sonnet 5 $2/$10 intro through 2026-08-31 then $3/$15; Haiku 4.5 $1/$5; cache multipliers; batch discount |
| https://pypi.org/pypi/anthropic/json | `anthropic == 0.117.0`, released 2026-07-16 |
| In-repo skill `claude-api` (bundled, cached 2026-06-24) | Invoked first per its trigger conditions; used for SDK idioms and thinking/effort semantics |

**Competitor references**

| URL | Used for |
|---|---|
| https://www.dotlumen.com/glasses | `.lumen` €9,999; forehead haptics; guide-dog replacement claim; "80% of adult heads" |
| https://lidarnews.com/visual-impairment-headset-relies-on-lidar/ | `.lumen` LiDAR + cameras; forehead-worn, head-strapped |
| https://newatlas.com/wearables/dotlumen-ai-glasses-blind-independence/ | €9,999 ≈ $11,800; guide-dog training cost $30k–$60k (the likely source of the "50 grand" confusion) |
| https://aira.io/ · https://itsaccessibility.syr.edu/aira-visual-interpreting-service/ · https://dres.illinois.edu/community/accessibility-transportation/aira-on-demand-description-service/ | Aira = paid, certified, background-checked, NDA-bound visual interpreters, O&M-trained; audio call; free at Access Partner sites |
| https://en.wikipedia.org/wiki/London_Buses_route_88 · https://tfl.gov.uk/bus/route/88/ | Route 88 termini: Parliament Hill Fields ↔ Clapham Common |

### PIVOT.md citations that proved stale, wrong, or non-authoritative

1. **`https://www.usagepricing.com/blueprint/modal` — NON-AUTHORITATIVE.** This is a third-party pricing aggregator, cited in *both* v1 and v2 Sources blocks as the source for Modal pricing. Its numbers happen to be correct today, but citing an aggregator for a sponsor's own pricing is a needless credibility risk on stage. **Replace with `https://modal.com/pricing` in both places.**

2. **"no card required" — WRONG.** Contradicted directly by Modal's billing documentation. This claim appears in v1 §6 and v2 §6. **Delete it from both.**

3. **"cold starts 3–15s" — NOT A MODAL FIGURE.** Appears in v1 §6 and v2 §6, unattributed. Modal publishes no such range. The attributable numbers are "containers boot in about one second", "seconds to minutes" total, and the ~13.8 s / ~17.5 s snapshot benchmarks. **The 3 s floor is materially optimistic for a multi-GB torch image and should not be said out loud.**

4. **`https://modal.com/blog/truly-serverless-gpus` — VALID.** The 70 s → 12 s claim is verbatim correct and the customer is Reducto. Keep it, and add the customer name — it is more credible with the attribution.

5. **PIVOT.md v2 §6 Claude prompt block — STALE APPROACH.** *"Return ONLY JSON"* was the right answer before Anthropic shipped first-class structured outputs. It is now the weakest of four available mechanisms. **Replace with `output_config.format`.**

6. **PIVOT.md v2 §9 "printed sign" prop — BROKEN AS SPECIFIED.** A printed route number will not trigger COCO class 5. See *Hardcoded Application Spec §1*.

7. **PIVOT.md v2 §10 demo script, "eight pulses: it's the 88" — UNDERCOUNTS.** Route 88 is two digits and therefore **two groups of eight** (16 pulses, ~5.4 s at 150/150 ms), not eight.

8. **PIVOT.md v2 §2 prior-art table — INCOMPLETE.** `.lumen` (LiDAR + head-worn + **haptic**) is the nearest neighbour to our output modality and is absent. Its absence weakens the "unoccupied square" claim.

### Discrepancies between the in-repo `claude-api` skill and live docs

The skill was invoked before any Claude research, per its trigger conditions. Live docs win where they differ. Three differences found, all minor:

| Item | Skill (cached 2026-06-24) | Live docs (2026-07-18) | Resolution |
|---|---|---|---|
| Structured-output model support | Lists Fable 5, Opus 4.8, Sonnet 5, Haiku 4.5 + "legacy: Opus 4.5, Opus 4.1" | Also lists Opus 4.7, Opus 4.6, Sonnet 4.6, Sonnet 4.5, Mythos 5 | **Live docs.** Does not affect us — Opus 4.8 and Haiku 4.5 are supported in both. |
| Image token accounting | Not covered | `ceil(w/28)×ceil(h/28)` visual tokens; high-res tier 2576 px/4784 vt vs standard 1568 px/1568 vt | **Live docs.** Skill is silent, not wrong. This formula is load-bearing for the cost arithmetic in Part 2. |
| Max images per request | Not covered | 100 (200k-context models) / 600 (1M-context); stricter dimension cap above 20 images | **Live docs.** Skill is silent. Does not bind us — we send one image. |

**No contradictions found on pricing, model IDs, thinking semantics, or the `output_config.format` mechanism.** Skill and live docs agree on all four.

---

## Residual Risk

Ranked by expected damage, with the mitigation stated. **Items 1 and 2 are the ones to act on tonight.**

| # | Risk | Likelihood | Damage | Mitigation |
|---|---|---|---|---|
| 1 | **Modal account has no payment method → deploys blocked** | Medium | **Fatal** (nothing ships) | **Check tonight.** Two minutes. Modal's docs say a payment method is required; third-party blogs disagree; do not find out which is true at 3 a.m. |
| 2 | **YOLO does not fire on the prop** — a photo-of-a-photo at an angle, under glare, is not `bus.jpg` | **Medium-high** | Fatal to the detection stage | Test the prop against the deployed endpoint **the moment it is printed**. Tune `CONF_MIN` down from 0.35 if needed. Keep the `SPACE`-key force-arrival as a disclosed fallback. **Build the tablet prop first — it needs no printer and no lighting luck.** |
| 3 | **Venue wifi drops** — takes out Modal *and* Anthropic simultaneously | Medium | Severe | Local `ultralytics` hot spare behind a `--local` flag (fallback #1 above). Build it; it's ~80 % shared code. |
| 4 | **Cold start on stage** despite `min_containers=1` (redeploy, Modal-side eviction, region change) | Low-medium | Severe | Deploy ≥ 60 min early; `modal serve` for all iteration; treat `modal deploy` as a one-way door; run the warm-up script 60 s before. |
| 5 | **Claude reads "88" as "BB" / "68" / "80"** | Low-medium | Moderate | The 3-vote confidence gate turns a misread into a WAIT pattern, not a wrong number. Worst realistic case is a demo that visibly refuses to guess — which is a feature. |
| 6 | **Destination line too small to read at the chosen distance** | Medium | Moderate | Floor tape at **1.2 m**. Destination cap ≥ 25 mm on the sheet. Verified: 28 px cap height at 1.0 m, 18 px at 1.5 m, degrading past 2 m. |
| 7 | **`[INFERRED]` assumption fails: module globals do not persist across invocations** | Low | Severe (state machine never latches) | Test with two consecutive POSTs and check that `hits` increments. If it does not, move state to a `modal.Dict` (verify its API first). `max_containers=1` makes this very unlikely. |
| 8 | **`[INFERRED]` assumption fails: background thread does not complete or does not share `_STATE`** | Low | Moderate (reading never appears; digits never fire) | Fallback is trivial: make the Claude call synchronous inside `/ingest` on the arrival frame. Costs the two-stage haptic (both stages collapse into one ~2 s beat) but the demo still runs. **Decide this before you're on stage.** |
| 9 | **`output_config` rejects `effort` and `format` together (400)** | Low | Trivial | Drop `effort`. It is the non-essential half. |
| 10 | **Schema-compilation latency on the first live call** | Medium | Minor | Covered by the warm-up script — fire one throwaway Claude call before you present. 24 h cache. |
| 11 | **Someone repeats "50 grand" for `.lumen` on stage** | Medium | Moderate (credibility) | It's €9,999. Correct the deck now. A judge who knows this space will know. |
| 12 | **Judge asks "why Modal at all?"** | **High — the transcript proves someone will ask** | Moderate | The verdict section answers it in one sentence: *detection is* when*, Claude is* what*, and* when *is a temporal property a stateless API cannot compute.* Rehearse it. |
| 13 | **`yolo26n.pt` download fails or is slow at container start** | Low | Moderate (adds 10–30 s to cold start) | Bake the weights into the image (`run_commands` line is commented in the snippet — **verify the `modal.Image` API before uncommenting**). Or accept it; `min_containers=1` means it happens once, backstage. |
| 14 | **Route 88's 16-pulse encoding feels interminable on stage** | Medium | Minor | Tighten to 120 ms on / 120 ms off (digits 5.4 s → 4.4 s). **Do not truncate to one digit and call it "88."** Better: name it out loud as the vocabulary's worst case. |
