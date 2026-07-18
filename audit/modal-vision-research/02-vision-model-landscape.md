# Vision model landscape for bus detection (2026)

Track 2 of the Modal vision research phase. Researched 2026-07-18.

Subject under study: `vision/service.py` — a Modal-hosted `yolov8s-worldv2.pt` detector with a
1203-class LVIS vocabulary plus two hand-tuned prompts baked in at image-build time, running warm
on a T4, feeding a Redis arrival state machine that gates a Claude OCR read.

---

## Scope

**Researched:** open-vocabulary YOLO variants available in 2026 (YOLO-World v1/v2 at s/m/l/x, YOLOE,
YOLOE-26), the closed-vocabulary YOLO26 family, single-model detect+OCR VLMs (Florence-2, and a
survey of the VLM-detection literature), measured T4 latency for all of the above where a real
source exists, and T4-vs-A10/L4 economics on Modal specifically.

**Excluded deliberately:**

- **Fine-tuning, custom training, and labelled datasets.** Out of scope per the brief. Nothing below
  recommends them, including implicitly — every option here is a pretrained checkpoint used
  zero-shot.
- **Non-Ultralytics detector families** (Grounding DINO, OWLv2, DETR variants). They do not load
  through `YOLO()`, do not support the `set_classes()` + `save()` bake, and would replace the
  service's model-loading path wholesale. That fails the architectural constraint before latency is
  even discussed.
- **Quantisation / TensorRT export of the current model.** It optimises the one hop that is already
  ~1.4% of the budget. See "Latency reality check".

**The architectural constraint everything is measured against:** `_bake_detector()` runs
`set_classes(vocab)` then `save(BAKED_WEIGHTS)` at image-build time, and `load_model()` reloads that
`.pt` inside a `@modal.enter(snap=True)` phase where no network and no CUDA are available. Any
candidate model must support an equivalent offline-vocabulary bake to a torch checkpoint, or it
forces a runtime text encoder and a rewrite of the snapshot phase.

---

## The number that decides everything

The plan's Stage 1 budget (`plan/2026-07-18-bus-stop-situational-awareness.md:747-761`) totals
**0.76–2.09 s, mean ≈ 1380 ms** across 12 hops. Hop 4, the YOLO forward pass, is **10–30 ms**.

| Group | Hops | Mean ms | Share of 1380 ms |
|---|---|---:|---:|
| Deliberate debounce (`HITS_TO_ARRIVE = 2` @ 2 Hz) | 5 | 500 | **36.2%** |
| Network round trips | 3, 6, 7, 10 | 420 | **30.4%** |
| Capture tick | 1 | 250 | **18.1%** |
| ESP32 poll wait | 9 | 150 | **10.9%** |
| Redis write | 8 | 40 | 2.9% |
| **YOLO forward pass** | **4** | **~20** | **~1.4%** |
| JPEG encode, JSON parse, buzzer onset | 2, 11, 12 | 17 | 1.2% |

Four hops nobody is proposing to change account for **~85% of the budget**. The detector accounts
for about one part in seventy. Every latency verdict below is stated in milliseconds saved or added
out of 1380, because a percentage speedup on hop 4 is not a number anyone can feel.

---

## Model comparison table

T4 latency for the YOLO-World family comes from one source with a consistent methodology
(OVLW-DETR, Table 1): **T4, FP16, LVIS categories, NMS excluded**. Ultralytics' own T4 figures for
YOLOE / YOLO26 use a *different* methodology (TensorRT, NMS handling unstated). The two columns are
therefore **not directly comparable to each other**, and neither is directly comparable to what the
service actually runs — plain PyTorch Ultralytics, FP32 default, with class-aware NMS over 1205
classes. Treat all of these as ordering information, not as predictions of hop 4.

| Model | Open-vocab? Offline bake? | T4 latency (ms) | Accuracy (bus/vehicle relevant) | Ultralytics / Modal-compatible | Verdict |
|---|---|---:|---|---|---|
| **`yolov8s-worldv2` (current)** | Yes. `set_classes()`+`save()`→`.pt` **documented** | **5.58** (OVLW-DETR) | 37.7 COCO zero-shot mAP; 22.7 LVIS AP | Yes — in production | **Keep as baseline** |
| `yolov8m-worldv2` | Yes, same mechanism | **9.54** (OVLW-DETR) | 43.0 COCO zs mAP (+5.3); 30.0 LVIS AP (+7.3) | Yes | **Worth trying** — one string, +3.96 ms |
| `yolov8l-worldv2` | Yes, same mechanism | **13.66** (OVLW-DETR) | 45.8 COCO zs mAP (+8.1); 33.0 LVIS AP (+10.3) | Yes | **Worth trying** — one string, +8.08 ms |
| `yolov8x-worldv2` | Yes, same mechanism | not published (UNVERIFIED) | 47.1 COCO zs mAP (+9.4) | Yes | Not worth trying — no latency data, ~2× `l` params for +1.3 mAP |
| `yolov8s-world` (v1) | Yes — Ultralytics' own bake example uses **this** checkpoint | not published | 37.4 COCO zs mAP (−0.3) | Yes, but Export ❌ | Not worth trying — strictly worse, no upside |
| **YOLOE-L / YOLOE-26L** | Yes, but bake is `set_classes()`→**`export(onnx)`**, *not* `save(.pt)` | **6.2** (Ultralytics, diff. methodology) | 35.2% / **36.8% LVIS mAP** — best open-vocab LVIS here | Ultralytics yes; Modal path **changes** (ONNX runtime, seg→det conversion) | **Not worth trying for this demo** — best model, wrong integration cost |
| YOLOE-26L-PF (prompt-free) | Yes — ships fixed **4,585-class** RAM++ vocab, **no bake at all** | not published for PF | 27.2 e2e / 35.4 LVIS mAP | Ultralytics yes; still `-seg`, still ONNX story | Not worth trying — loses the two hand-tuned prompts |
| **YOLO26n** *(what the plan names)* | **No — closed-vocabulary COCO-80.** No `set_classes()` | **1.7** (Ultralytics, TensorRT10) | 40.9 COCO mAP (closed-set, not comparable) | Ultralytics yes; **deletes the bake design** | **Not worth trying** — plan-side error, see Q2 |
| YOLO11 / YOLOv10 / YOLOv13 (plain) | No — closed-vocabulary | n/a | n/a | Yes | Not worth trying — same defect as YOLO26n |
| **Florence-2-large** (detect+OCR in one) | n/a — generative VLM, no vocabulary bake | **~1000** (Roboflow, T4) | Localisation documented as weaker than specialised detectors | Runs on Modal, but not via `YOLO()` | **Not worth trying** — +994 ms, +72% of budget |
| Moondream 2 / PaliGemma / Qwen-VL | n/a — generative VLMs | **no T4 data found (UNVERIFIED)** | not established for this task | Runs on Modal | Not worth trying — same class of cost as Florence-2 |

---

## Verdicts and evidence

### Q1. Do `-m` and `-l` help, and what do they really cost?

**Latency verdict: the cost argument against bigger models is close to zero.**

| Swap | Δ latency | Δ as share of 1380 ms | New budget mean |
|---|---:|---:|---:|
| `s` → `m` | **+3.96 ms** | **+0.29%** | 1384 ms |
| `s` → `l` | **+8.08 ms** | **+0.59%** | 1388 ms |

Source: OVLW-DETR Table 1 — YOLO-Worldv2-S 13M/22.7 AP/**5.58 ms**, -M 29M/30.0 AP/**9.54 ms**,
-L 48M/33.0 AP/**13.66 ms**, caption *"The latency is tested on T4 GPU with FP16 precision on LVIS
categories. We test the latency of YOLO-Worldv2 without NMS."*
(https://arxiv.org/html/2407.10655v1)

**Accuracy verdict: the benchmark gain is large, and it is also the wrong benchmark.** Ultralytics
reports zero-shot COCO 37.7 → 43.0 → 45.8 mAP for s/m/l-worldv2; OVLW-DETR reports LVIS minival
22.7 → 30.0 → 33.0 AP. Both say the same thing: `m` and `l` are substantially better detectors *on
street scenes*.

**Does that transfer to a frame-filling A3 prop at 1.0–1.5 m? No source answers this, and I do not
believe it can be answered from the web.** Model capacity buys small-object and cluttered-scene
performance. A frame-filling prop is the easiest possible case on both axes. The in-code rationale's
instinct is probably right; see "Adjudicating the in-code rationale" for where its *wording* is not
defensible.

**Practical verdict:** `s` → `l` is the one swap on this list that is genuinely cheap — a single
string in `_bake_detector()`, the same bake mechanism, the same `.pt` reload, the same snapshot
phase, no API change, and 8 ms. It is worth trying **only after** the measurement in "What would
actually move the observable" below, because if the current model already clears `CONF_MIN` on the
prop with margin, a bigger model changes nothing observable and costs an image rebuild.

### Q2. Newer open-vocabulary YOLO in 2026 — and does "YOLO26n" exist?

**YOLO26 exists. The plan's reference to it is still an error.**

Ultralytics YOLO26 launched **14 January 2026** (arXiv 2606.03748), five scales n/s/m/l/x,
**40.9–57.5 mAP on COCO at 1.7–11.8 ms T4 TensorRT latency**, NMS-free end-to-end by default.
YOLO26n specifically: 40.9 mAP, 2.4 M params, **1.7 ms** on T4 TensorRT10.

But **YOLO26 is closed-vocabulary, trained on COCO's 80 classes**. The arXiv abstract confirms
open-vocabulary lives only in the *extension*: "YOLO26 itself is not open-vocabulary — only its
extension, YOLOE-26". YOLO26n has no `set_classes()`, cannot encode the 1203-class LVIS list, and
cannot carry `"double decker bus"` or `"bus front"`.

So the plan naming YOLO26n (`plan/...md:7`, `:9`, `:752`) is a **plan-side error of a specific
kind**: it names a real, excellent, faster model that cannot do the job the service is built around.
COCO-80 does contain a `bus` class, so "YOLO26n detects a bus" is technically true — which is
exactly what makes the error easy to miss. Adopting it literally would delete `_bake_detector`,
`_vocab`, `_lvis_labels`, `_resolve_vocab`, the 1203-label on-screen naming, the by-name hazard map,
and both hand-tuned prompts. **That is a redesign, not a model swap.** Flagging for human
adjudication: `AGENTS.md` says the plan wins over code, but here the code is the artifact that
satisfies the architecture and the plan's model name is the part that looks wrong. Recommend
correcting the plan to name `yolov8s-worldv2`.

**YOLOE / YOLOE-26 is the genuine state of the art, and still not the right move here.** Ultralytics
reports YOLOE-L at 35.2% LVIS mAP / 6.2 ms T4 / 26.2 M params and YOLOE26-L at **36.8% LVIS mAP** /
6.2 ms / 32.3 M params, with the claim *"improves by +3.5 AP over YOLO-Worldv2 on LVIS while using
just a third of the training resources and achieving 1.4× faster inference speeds"*. On paper it is
both more accurate and faster than the current model.

The blocker is the bake, and it is precise. Ultralytics documents **two different persistence
mechanisms**:

- **YOLO-World** — section *"Persisting Models with Custom Vocabulary"*: `set_classes([...])` then
  `model.save("custom_yolov8s.pt")`, after which *"the custom_yolov8s.pt model behaves like any
  other pretrained YOLOv8 model"*. This is exactly what `_bake_detector()` does.
- **YOLOE** — no `save()`-to-`.pt` path is documented. The only documented bake is
  `set_classes([...])` then `model.export(format="onnx")`, under a warning titled *"Exported models
  are static"*: *"Classes configured with `set_classes()` ... are baked into the **exported**
  weights ... The exported file behaves like a standard YOLO detector and can also be loaded with
  `YOLO()` instead of `YOLOE()`."*

Migrating therefore means: an ONNX runtime dependency in the image; `self.model.to("cuda")` in
`activate()` no longer means what it means for a torch model, which matters because the whole
snapshot design (`@modal.enter(snap=True)` CPU load → `snap=False` CUDA move) is built on torch
semantics; every YOLOE checkpoint is `-seg` (instance segmentation), so a detection-only model needs
the documented `YOLOE("yoloe-26l.yaml")` + `torch_load` + `save()` conversion; and YOLOE-26's NMS-free
end-to-end head changes the meaning of the `iou=` and `max_det=` arguments the service passes and the
synonym pile-up that `_dedupe_for_display` exists to clean.

Additionally **UNVERIFIED**: every YOLOE `set_classes()` example in the docs uses **two** classes.
Whether a 1203-item vocabulary survives ONNX export at usable size and speed is not documented
anywhere I found.

**Verdict: not worth trying for this demo.** This is the honest shape of the finding — YOLOE is the
better model and the wrong change. Revisit it if this service outlives the hackathon.

### Q3. Could one model do detect + OCR and replace the two-stage pipeline?

**No, on two independent grounds, either of which is sufficient.**

**Ground 1 — latency.** Florence-2-large (0.77 B params, 1.54 GB weights) takes **~1 second per
image on a T4** for OCR (Roboflow). Against a 5.58 ms forward pass that is roughly **180×**.

| Change | Δ latency | Δ share of 1380 ms | New budget mean |
|---|---:|---:|---:|
| Replace YOLO with Florence-2-large | **+994 ms** | **+72%** | **~2374 ms** |

And the second-order effect is worse than the first. The capture tick is 250 ms mean at 2 Hz; a
~1000 ms per-frame model does not fit inside the tick at all, so frames queue rather than pipeline,
and `HITS_TO_ARRIVE = 2` — two *consecutive* qualifying frames — would take ≥2 s to accumulate
instead of 500 ms. The +994 ms understates it.

**Ground 2 — the architecture, which is the one that actually settles it.** The plan's justification
for the detector is **state**: `HITS_TO_ARRIVE = 2`, `MISSES_TO_CLEAR = 4`, and the monotonic
`det:arrival_id` fire-once latch, evaluated atomically in `ARRIVAL_LUA` over ~1–2 s of history. A
VLM call is stateless. Putting Florence-2 where YOLO is does not remove the state machine — it still
needs a per-frame boolean to feed `ARGV[1]`, still needs the debounce, still needs the latch. It
changes what produces the boolean and pays 994 ms for the privilege.

The literature agrees on direction: a 2025 review of VLM object detection concludes LVLMs
*"emphasize semantic comprehension over fine-grained localization, underscoring the need for hybrid
approach with the use of conventional detectors"* and anticipates *"hybrid approaches integrating
both types of object detection models"* (https://arxiv.org/html/2508.19294v1). That hybrid is
precisely what this service already is. **"Detection is when. Claude is what." is the recommended
architecture, already implemented.**

One further point worth stating plainly: the service already contains a frontier VLM. Replacing YOLO
with Florence-2 would put a weaker OCR model in the blocking hot path in order to avoid a stronger
one that currently runs on a daemon thread and never blocks (`_ocr_worker`).

Moondream 2, PaliGemma, and Qwen-VL: **no T4 latency source found — UNVERIFIED.** They are the same
class of generative model at the same order of cost, and Ground 2 disqualifies them regardless of
what their latency turns out to be.

### Q4. State-of-the-art bus/vehicle detection benchmarks

The usable numbers are the ones already tabulated: COCO zero-shot mAP and LVIS minival AP, both
whole-dataset aggregates. LVIS reports rare/common/frequent splits (mAP_r / mAP_c / mAP_f) but no
per-class bus figure is published in any source I fetched. **No benchmark I found isolates bus
detection, and none contains anything resembling this demo's prop.**

Being direct about transfer: **COCO/LVIS mAP does not transfer to "a printed A3 sheet at 1.5 m", and
the direction of the error is not even knowable in advance.** LVIS and COCO bus instances are real
vehicles in street scenes, at distance, partially occluded, at angles. The prop is a frame-filling
2D *depiction*. Those differ on every axis a detection benchmark measures, and a depiction is not
obviously an easier case than a real bus — it is a *different* case.

I verified one concrete, checkable consequence directly against the baked vocabulary
(`ultralytics/cfg/datasets/lvis.yaml`, 1203 classes confirmed). The vocabulary this service bakes
contains labels that compete directly with a printed or screen-displayed prop:

| LVIS index | Label | Competes with |
|---:|---|---|
| 49 | `banner/streamer` | A3 print |
| 95 | `billboard` | A3 print |
| 747 | `painting` | A3 print |
| 834 | `poster/placard` | **A3 print** |
| 958 | `signboard` | A3 print |
| 697 | `monitor/monitor computer equipment` | **tablet** |
| 1076 | `television set/tv/tv set` | **tablet** |

For reference, the target class is index 172, `bus/bus vehicle/autobus/charabanc/double-decker/motorbus/motorcoach`
— verbatim as the code comment at `vision/service.py:141-142` states.

None of these seven are in `TARGET_LABELS` or `HAZARD_LABELS`. Reading the code, the drawn output is
safe: `_dedupe_for_display` protects a target box from suppression by a non-target box of a different
role, which is exactly the case it was written for. The risk is upstream of display — it is whether
the `bus` box's *confidence* clears `CONF_MIN = 0.35` when seven plausible depiction labels are also
firing on the same pixels. The code itself asserts the underlying effect at `vision/service.py:73-76`
("Open-vocabulary scores spread thinner across 1203 classes than across 8"). **The mechanism is
UNVERIFIED; the presence of the competing labels in the baked vocabulary is verified.**

### Q5. T4 vs A10G / L4 — would a bigger GPU help?

**Availability and price (Modal):** Modal supports `T4`, `L4`, `A10`, `L40S`, `A100`, `A100-40GB`,
`A100-80GB`, `RTX-PRO-6000`, `H100`, `H200`, `B200`, `B300`. Note Modal exposes **`A10`, not
`A10G`**. Pricing: T4 **$0.000164/s**, L4 **$0.000222/s** (1.35×), A10 **$0.000306/s** (1.87×).
Modal's own guidance recommends the L40S as a default inference GPU and warns that small-batch
workloads bottleneck on memory rather than arithmetic, "suggesting that upgrading to more powerful
GPUs may not provide proportional cost benefits."

**Benchmark source:** Baseten measured *"Using an A10 costs about 1.9x as much per minute as a T4
for a 1.2x-1.4x speedup"* (Whisper). Third-party aggregate benchmarks put A10G ≈ +37% over T4 and
L4 ≈ 2× T4 FPS, but those are synthetic aggregates rather than a measured detector workload, so I am
citing the Baseten figure as the defensible one and marking the aggregates **UNVERIFIED for this
workload**.

**Applied to hop 4, taking the most favourable case (the *large* model, 1.4× speedup):**

| Change | Δ latency | Δ share of 1380 ms | GPU cost |
|---|---:|---:|---:|
| `l` on T4 → `l` on A10 | **−3.2 ms** | **−0.23%** | **1.87×** |
| `s` on T4 → `s` on A10 | **−1.3 ms** | **−0.09%** | 1.87× |

**Verdict: no, and the question is the wrong one.** A bigger GPU would buy `yolov8l-worldv2` about
three milliseconds for nearly double the GPU spend. But the real answer is that **`l` already fits on
the T4 with room to spare** — 13.66 ms against a hop budgeted at 10–30 ms. There is no GPU-bound
problem here to solve. `min_containers=1` has already bought the only GPU-side win that mattered
(cold starts), and it is free.

---

## Adjudicating the in-code rationale

The rationale at `vision/service.py:246-250`, claim by claim:

| Claim | Verdict |
|---|---|
| "v2 over v1 … mAP 37.4→37.7, mAP50 52.0→52.2" | **Accurate.** Verbatim match to the Ultralytics table rows `yolov8s-world` / `yolov8s-worldv2`. |
| "v2 is the only variant that also supports export" | **True but not load-bearing.** The Export column is ❌ for all v1 and ✅ for all v2. But this service calls `save()`, not `export()` — and Ultralytics' own "Persisting Models with Custom Vocabulary" example bakes `YOLO("yolov8s-world.pt")`, the **v1** checkpoint. Export support does no work in this decision. The +0.3 mAP is the whole (sufficient) reason. |
| "`m` costs ~2.5× the parameters" | **Approximately right.** 13 M → 29 M = 2.23×. |
| "for no measurable gain" | **Unsupported as written.** Both benchmarks measure a large gain: +5.3 COCO zero-shot mAP, +7.3 LVIS AP. The defensible claim is "no gain *on this prop*" — a domain claim about a frame-filling A3 sheet that no published benchmark can confirm or refute. |
| "`s` already has far more capacity than that needs" | **Plausible, UNVERIFIED.** Consistent with capacity buying small-object and clutter performance that a frame-filling prop does not need. No source measures open-vocab detectors on printed props. |
| The implied cost framing (params as the reason not to go bigger) | **Wrong currency.** In the only currency this demo spends — milliseconds out of 1380 — `m` costs 0.29% and `l` costs 0.59%. Parameter count is not the constraint; nothing is. |

**Net:** the conclusion (`s` is fine) is very likely correct. Two of its supporting arguments are
not. Recommend keeping the choice and rewording the comment so a future reader does not inherit the
belief that `m`/`l` were rejected on cost or on benchmark parity — they were rejected on a judgment
about the prop, which is the honest and defensible ground.

---

## Latency reality check

Baseline: mean **1380 ms**, of which hop 4 is **10–30 ms (~1.4%)**.

| Proposed change | Δ hop 4 | Δ budget mean | New mean | Worth it? |
|---|---:|---:|---:|---|
| `s` → `m` worldv2 | +3.96 ms | **+0.29%** | 1384 ms | Latency: free. Decide on accuracy alone. |
| `s` → `l` worldv2 | +8.08 ms | **+0.59%** | 1388 ms | Latency: free. Decide on accuracy alone. |
| `s` worldv2 → YOLOE-26L | ≤ ±8 ms (methodologies differ) | **≤ ±0.6%** | ~1380 ms | Latency irrelevant. Blocked on integration cost. |
| `s` worldv2 → YOLO26n | −3.88 ms | **−0.28%** | 1376 ms | Deletes the open-vocab design to save 4 ms. No. |
| T4 → A10 (with `l`) | −3.2 ms | **−0.23%** | 1385 ms | 1.87× GPU spend for 3 ms. No. |
| TensorRT/FP16 export of current model | ≈ −0 ms | ≈ 0% | 1380 ms | Optimises the 1.4% hop. No. |
| **Replace YOLO with Florence-2-large** | **+994 ms** | **+72%** | **~2374 ms** | No — and it breaks the 2 Hz tick, so the true cost is higher. |

**For calibration, the levers that are not in this table:** cutting `HITS_TO_ARRIVE` from 2 to 1
removes **500 ms (36%)** — sixty times the entire `s`→`l` cost — and requires no image rebuild at
all, since `_bake_detector()` is unchanged and Modal reuses the cached layer. It is not recommended:
the debounce is the mechanism that stops a single-frame false positive reaching a DeafBlind user's
wrist, and this service's whole design refuses plausible-wrong output. But it correctly sizes the
model question. **Nothing available in hop 4 is worth optimising for latency. The forward pass is not
where this demo's time goes, and no model on this list changes that.**

The corollary, which is the useful half: **the budget has enough headroom to absorb any
YOLO-World-family model, so accuracy on the prop is the only criterion that should decide the
choice.**

### One caveat on hop 4's own estimate

The plan's 10–30 ms may itself be optimistic. The 5.58 ms figure is **TensorRT FP16 without NMS**;
the service runs plain PyTorch Ultralytics at default precision with class-aware NMS over 1205
classes. Roboflow measured a (variant-unspecified) YOLO-World at **~90 ms per inference on a T4** in
their hosted stack. The true hop 4 is plausibly somewhere between, and **UNVERIFIED**.

This does not change any verdict — it strengthens them. Even at 90 ms, hop 4 is 6.5% of the budget
and every conclusion above holds a fortiori. Worth noting only so that a bench measurement showing
"60 ms, not 20 ms" is not mistaken for a regression.

---

## What would actually move the observable

Pre-empting Gate 1 — *"Bus detected correctly" is observable; "better mAP on COCO" is not* —
honestly, because it disqualifies most of this report:

**Every accuracy number above is COCO zero-shot mAP or LVIS minival AP. Not one of them is evidence
that any swap improves "bus detected correctly" on a frame-filling A3 print at 1.0–1.5 m.** I could
not find a benchmark that resembles this prop, and I do not believe one exists. A reviewer would be
right to reject `s`→`l` on the strength of "+8.1 mAP" alone, and I am not asking for it on that
basis.

**The decisive measurement is not on the web — it is one number the service already returns.**
`IngestResponse.confidence` is the best target-box confidence for the frame. Point the phone at the
actual prop and read it against `CONF_MIN = 0.35`:

- **Comfortably above ~0.6:** the detector is not the problem. No swap on this list is worth an image
  rebuild. Close the question.
- **Marginal, 0.35–0.5, or flickering across frames:** there is something real to fix — and a model
  swap is the *last* rung of the ladder, not the first, because it is the only rung that costs a
  bake:
  1. Lower `CONF_MIN`. One constant; `modal deploy` reuses the cached bake layer. Seconds.
  2. Add hand-tuned target prompts alongside the existing two. Requires a bake re-run.
  3. Drop the seven competing depiction labels (`poster/placard`, `signboard`, `billboard`,
     `banner`, `painting`, `television set`, `monitor`) from the baked vocabulary — directly removes
     the competition, at the cost of on-screen naming for those objects. Requires a bake re-run.
  4. `s` → `l`. Requires a bake re-run **plus** full revalidation of thresholds, since box counts
     and the confidence distribution both shift and `CONF_MIN`, `DRAW_CONF_MIN`, `MAX_RAW_BOXES` and
     `DEDUPE_IOU` were all tuned against `s`.
- **Below 0.35 / no target box at all:** the prop is not reading as a bus. Rungs 2 and 3 address that
  far more directly than capacity does, and a bigger model may simply produce a *more confident*
  `poster`.

**Effort accounting.** A model swap is one string to write and an image rebuild plus a bench
revalidation to trust. `_bake_detector()` runs inside `.run_function()` at image-build time and
downloads the checkpoint, pulls `ultralytics/CLIP` from git, and CLIP-encodes 1205 prompts on every
rebuild — minutes per iteration, and it is on the critical path of every experiment. Exact duration
**UNVERIFIED** (I did not run a build). Budget rebuild + revalidation, not the edit, and note that
rung 4 needs a threshold re-tune that rungs 1–3 do not.

---

## Web sources cited

Every URL below was fetched during this research. Where a claim rests on a search snippet rather than
a fetched page, it is marked UNVERIFIED in the body and is not listed here.

**Required by the brief:**

1. **https://docs.ultralytics.com/models/yolo-world/** — *(mandatory citation)* The YOLO-World model
   card. Establishes the full zero-shot COCO table (s-worldv2 37.7/52.2/41.0 through x-worldv2
   47.1/62.8/51.4), the Export column (v1 ❌ / v2 ✅), and the "prompt-then-detect" offline-vocabulary
   strategy. Confirms the in-code v1→v2 numbers verbatim.
2. **https://www.baseten.co/blog/comparing-nvidia-gpus-for-ai-t4-vs-a10/** — *(T4 vs A10 benchmark)*
   Measured comparison: *"Using an A10 costs about 1.9x as much per minute as a T4 for a 1.2x-1.4x
   speedup."* T4 2,560 CUDA cores / 16 GiB vs A10 9,216 / 24 GiB.
3. **https://blog.roboflow.com/florence-2-ocr/** — *(Florence-2 latency)* *"On a T4 GPU, Florence-2
   takes ~1 second to generate an OCR description for an image."* Model weights 1.54 GB
   (`Florence-2-large`). The single load-bearing number for the Q3 verdict.

**Supporting:**

4. **https://raw.githubusercontent.com/ultralytics/ultralytics/main/docs/en/models/yolo-world.md** —
   Source markdown. Established the exact table caption *"Zero-shot Transfer on COCO Dataset"* (not
   LVIS), and the verbatim "Persisting Models with Custom Vocabulary" section showing
   `set_classes()` + `save()` → `.pt` — the mechanism `_bake_detector()` relies on — using the **v1**
   checkpoint, which is what makes the in-code export justification non-load-bearing.
5. **https://arxiv.org/html/2407.10655v1** (OVLW-DETR) — The only per-variant T4 latency table found:
   YOLO-Worldv2-S 5.58 ms, -M 9.54 ms, -L 13.66 ms, with LVIS AP 22.7 / 30.0 / 33.0 and params
   13/29/48 M. Caption states T4, FP16, LVIS categories, NMS excluded. This table is the
   quantitative spine of Q1 and Q5.
6. **https://docs.ultralytics.com/models/yoloe/** and
   **https://raw.githubusercontent.com/ultralytics/ultralytics/main/docs/en/models/yoloe.md** —
   YOLOE-L 35.2% / YOLOE26-L 36.8% LVIS mAP at 6.2 ms T4; the *"+3.5 AP over YOLO-Worldv2 … 1.4×
   faster"* claim; the full checkpoint list (all `-seg`); and critically the *"Exported models are
   static"* warning establishing that YOLOE's documented bake is `export(onnx)`, **not** `save(.pt)`.
7. **https://docs.ultralytics.com/models/yolo26/** and
   **https://raw.githubusercontent.com/ultralytics/ultralytics/main/docs/en/models/yolo26.md** —
   YOLO26 exists, five scales, 40.9–57.5 COCO mAP at 1.7–11.8 ms T4 TensorRT; YOLO26n = 40.9 mAP /
   2.4 M / 1.7 ms. Establishes YOLO26 is closed-vocabulary COCO-80 and that open-vocab is YOLOE-26
   only, plus the full YOLOE-26 LVIS table (26n 24.7 → 26x 40.6) and the 4,585-class RAM++
   prompt-free vocabulary.
8. **https://arxiv.org/abs/2606.03748** — YOLO26 paper. Independently confirms the release, the
   scale/latency ranges, and that *"YOLO26 itself is not open-vocabulary"*. Settles Q2.
9. **https://arxiv.org/html/2401.17270v2** — Original YOLO-World CVPR 2024 paper, Table 2. LVIS
   zero-shot with FPS on **V100 without TensorRT** (S 13M/74.1 FPS/26.2 AP; M 29M/58.1/31.0;
   L 48M/52.0/35.0). Cited to show the widely-quoted FPS figures are V100, not T4 — they are not
   usable for this budget.
10. **https://inference.roboflow.com/foundation/yolo_world/** — *"YOLO-World ran 100 inferences in
    9.18 seconds (0.09 seconds per inference, on average)"* on a T4. Variant unspecified. The basis
    for the caveat that real PyTorch hop-4 latency likely exceeds the plan's 10–30 ms.
11. **https://modal.com/pricing** — T4 $0.000164/s, L4 $0.000222/s, A10 $0.000306/s, L40S
    $0.000542/s, H100 $0.001097/s. The cost side of Q5.
12. **https://modal.com/docs/guide/gpu** — Modal's supported GPU strings (T4, L4, **A10** not A10G,
    L40S, A100, H100, H200, B200, B300) and its warning that small-batch inference is
    memory-bottlenecked so bigger GPUs may not pay off proportionally.
13. **https://arxiv.org/html/2508.19294v1** — Review of object detection with multimodal LVLMs.
    *"LVLMs emphasize semantic comprehension over fine-grained localization, underscoring the need
    for hybrid approach with the use of conventional detectors."* Supports the Q3 architectural
    verdict.
14. **https://github.com/ultralytics/ultralytics/issues/11681** — The issue cited in
    `_bake_detector()`'s docstring. Confirms `set_classes()` fetches CLIP into `~/.cache/clip` and
    that this breaks offline use. Note: closed **without a visible maintainer reply**, so it does not
    itself confirm that reloading the saved `.pt` needs no CLIP — see Residual risk.
15. **https://raw.githubusercontent.com/ultralytics/ultralytics/main/ultralytics/cfg/datasets/lvis.yaml**
    — The actual baked vocabulary. Confirmed 1203 classes; index 172 is
    `bus/bus vehicle/autobus/charabanc/double-decker/motorbus/motorcoach` exactly as the code comment
    states; and confirmed the seven depiction-competing labels tabulated in Q4.

---

## Residual risk

**What I could not verify:**

- **Any accuracy number on the actual prop.** No benchmark exists for a frame-filling A3 print or
  tablet at 1.0–1.5 m. This is the single largest gap and it invalidates any confident accuracy
  claim in this report.
- **The current model's observed confidence on the prop.** Not obtainable from the web; obtainable in
  under a minute at the bench. Everything in "What would actually move the observable" is
  conditional on it.
- **Whether the saved `.pt` truly loads with no CLIP import.** The Ultralytics docs' "behaves like
  any other pretrained YOLOv8 model" strongly implies it, and the service is presumably already
  running this way in practice, but issue #11681 closed without a maintainer statement and I found
  no explicit confirmation. If this is load-bearing, confirm it from a running container, not from me.
- **Real hop-4 latency in this service's configuration** (PyTorch, FP32, class-aware NMS, 1205
  classes). Every T4 number I cite was measured under different conditions.
- **Whether a 1203-item vocabulary survives YOLOE's ONNX export.** Every documented example uses two
  classes.
- **`yolov8x-worldv2` T4 latency.** Not published in any source I found.
- **Moondream 2 / PaliGemma / Qwen-VL T4 latency.** No source found. Disqualified on architecture,
  not on measured speed.
- **The exact duration of an image rebuild** with the bake. I did not run one.
- **Cross-source latency comparability.** OVLW-DETR (T4/FP16/no-NMS) and Ultralytics (T4/TensorRT)
  cannot be differenced against each other. The YOLOE-vs-YOLO-World speed comparison in this report
  rests on Ultralytics' own "1.4× faster" claim, which is a **vendor claim about its own model** and
  should be treated as such.

**What a reader should not conclude from this document:**

- **Not** that `yolov8l-worldv2` will detect the prop better than `s`. It has a higher COCO and LVIS
  mAP. That is all that is established, and Gate 1 correctly rejects it as a reason on its own.
- **Not** that the current `s` choice is proven optimal. It is *unfalsified* and its latency cost
  advantage over `l` is negligible (8 ms), which means the choice was never really a latency
  decision and should not be defended as one.
- **Not** that YOLOE/YOLOE-26 is a bad model. It is the best open-vocabulary detector in this report
  on both accuracy and speed. It is rejected purely on integration cost against a hackathon deadline,
  and that verdict should be revisited if this service outlives the demo.
- **Not** that the T4 is a constraint. It is not. `yolov8l-worldv2` fits inside the existing hop-4
  budget on a T4 with margin.
- **Not** that the plan should be edited unilaterally. The YOLO26n discrepancy is reported for human
  adjudication. `AGENTS.md` gives the plan authority over code, but here the plan names a model that
  cannot support the architecture the code implements, so the resolution is a judgment call, not a
  mechanical application of the rule.
- **Not** that the two hand-tuned prompts (`"double decker bus"`, `"bus front"`) are validated. They
  are described in-code as tuned against the real prop; I found no external evidence bearing on them
  either way, and they are the cheapest lever in the entire ladder above.
