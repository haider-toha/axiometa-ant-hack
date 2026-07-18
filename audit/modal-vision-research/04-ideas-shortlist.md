# Phase 2 — Idea Shortlist

Consolidation of Tracks 1–3 into a ranked, gated shortlist. Phase 3 is an adversarial review
whose job is to kill weak entries, so every entry below states the gate it fails before the
reviewer has to find it.

**No code was modified.** `vision/service.py` is untouched; the plan is untouched.

---

## Headline

**Four ideas survive. Three of them are not Modal-specific, and the one that is buys insurance
rather than a stage moment.** That is not a failure of the research — it is the research's
finding. `min_containers=1` (`vision/service.py:848`) already bought the only Modal-platform win
that mattered on this workload, and it bought it for free. Everything left on Modal's feature
menu is either aimed at a problem this service does not have (cold starts, batching, queueing) or
costs a rewrite for no demo-visible gain.

The two ideas worth real effort are a **vocabulary/threshold question** and a **latent API
defect**. Neither is about Modal. Both are about whether the demo works.

**Latency is not the axis.** Stage 1 is 12 hops, mean ≈ 1380 ms
(`plan/2026-07-18-bus-stop-situational-awareness.md:747-761`). Hop 4 — the YOLO forward pass — is
10–30 ms, about **20 ms of 1380 (1.4%)**. The dominant hops are network (~420 ms), the deliberate
2-frame debounce (+500 ms) and the capture tick (250 ms), none of which any idea below touches.
**No entry on this shortlist is justified on latency**, and the ones that were have been rejected.

---

## Scope

### Read in full

- `audit/modal-vision-research/01-modal-platform-capabilities.md` including its Orchestrator
  addendum (which kills Track 1's only actionable recommendation).
- `audit/modal-vision-research/02-vision-model-landscape.md`.
- `audit/modal-vision-research/03-current-service-bottlenecks.md` including its Orchestrator
  addendum (which confirms F1 against the vendor API reference).
- `vision/service.py`, all 1121 lines.
- `plan/2026-07-18-bus-stop-situational-awareness.md:690-776` — "The Vision Pipeline" and
  "Latency budget". Read-only.

### Verified independently at this consolidation point

Phase 1 claims that would become implementation instructions were re-checked, because an error
passed through here becomes a code edit later.

| Check | Result |
|---|---|
| The seven depiction labels, and what `_lvis_labels()` (`:173-204`) actually names them | Replicated the function against upstream `ultralytics/cfg/datasets/lvis.yaml`: 1203 classes, 1203 unique labels, colliding first-synonyms exactly `{bow, fish, octopus, pan, salmon}` as `:181-185` documents. **None of the seven collide**, so each takes its first synonym. Baked strings are `banner`, `billboard`, `monitor`, `painting`, `poster`, `signboard`, `television set` |
| `bus` and `school bus` resolve | LVIS 172 → `bus`, 921 → `school bus`; both present in `TARGET_LABELS` (`:147`) |
| Does `_dedupe_for_display` hide a `bus` box behind a `poster` box? | **No.** Traced `:782-792` by hand: a `poster` box is unprotected and kept first; the lower-confidence `bus` box is `protected` (`d.target`), and none of the three suppression conditions fire, so it falls through to `kept.append`. Both are drawn. Confirms file 03 §10 and file 02 Q4 |
| Is the per-box label + confidence visible during rehearsal? | **Yes, with zero code.** `www/src/app/capture/page.tsx:129` draws a chip reading `${d.label} ${d.confidence.toFixed(2)}` on the video overlay (`:113-137`), and `:331-347` lists label / bearing / confidence. The debug screen shows the frame's best target confidence at `www/src/app/page.tsx:104` |
| Is `modal` runnable on this machine? | **Yes** — `.venv/bin/modal`, client 1.5.2, and `anthropic 0.117.0`, both at the pinned versions |

### Corrections to Phase 1, carried forward

1. **File 03 cites `vision/service.py:601` for `"effort": "low"` in `_one_vote`. It is at `:603`.**
   Line 601 is a comment line. `_prime_schema`'s copy at `:916` is cited correctly. Anyone
   editing from file 03's line number would edit a comment and think they were done. (Same file,
   same table: `max_tokens=256` is at `:596` not `:595`; the `thinking` comment is at `:597-598`.)
2. **File 02's Q4 table lists the *raw* LVIS entries** — `poster/placard`, `banner/streamer`,
   `monitor/monitor computer equipment`, `television set/tv/tv set`. Those are **not** the strings
   the vocabulary contains. `_lvis_labels()` splits on `/` and keeps the first synonym
   (`:198-201`). An exclusion set written verbatim from file 02's table would match nothing and
   silently no-op. Idea 1 below uses the verified post-split strings and adds a build-time
   assertion so a mismatch fails the bake instead of passing quietly.
3. **File 03 states `modal`, `anthropic`, `upstash_redis`, `torch` and `ultralytics` are all
   absent from this machine.** `modal==1.5.2` and `anthropic==0.117.0` are present in `.venv`.
   `ultralytics`, `torch` and `upstash_redis` genuinely are absent. This does not change any of
   file 03's verdicts — the things it could not verify were platform and library *behaviours*, not
   importability — but it does mean `modal deploy` is runnable locally, which every time estimate
   below assumes.
4. **File 02 asserts that changing one constant means "`modal deploy` reuses the cached bake
   layer. Seconds."** That is unverified and it sets the iteration cost of Ideas 1's cheap rungs.
   Treated as an assumption with a free first-deploy check, not as fact — see Idea 1 step 6.

### Excluded before writing

Applied as filters, not as after-the-fact justification:

- **Anything requiring infrastructure not already in the service** — Modal Volumes, `@app.server()`,
  ONNX runtime, `modal.Dict`/`Queue`, Sandboxes.
- **Anything requiring fine-tuning, training or labelled data.** Nothing below needs any.
- **Anything requiring a dependency beyond what is already installed.** Note the container's
  dependency list lives in `IMAGE` (`vision/service.py:261-276`), not in
  `vision/requirements.txt` — the latter pins only the local deploy-side set (`modal==1.5.2`,
  `anthropic==0.117.0`, `pydantic>=2.0`). Both were treated as closed.
- **Anything touching the Redis key schema, `ARRIVAL_LUA` (`:370-442`), or the Contract A response
  shape (`:346-362`).** This ruled out the one latency idea with a real number behind it — see
  Rejected §R7.
- **Anything over 3 hours including validation.**

---

## The shortlist

### 1. Settle whether the prop reads as a bus — with a zero-code diagnostic and a pre-written vocabulary fix behind it

**(a) What it is.** Read the detector's own reported confidence on the actual demo prop during
rehearsal, and — only if that number is marginal or the prop is being labelled as a *depiction* —
apply a prepared ladder of fixes ending in a seven-label exclusion from the baked vocabulary.

**(b) Phase 1 support.** This is the one place two tracks converged independently, by different
routes, without seeing each other's work:

- **File 02, Q4** verified against `ultralytics/cfg/datasets/lvis.yaml` that the baked vocabulary
  contains seven labels that describe a *depiction* of a thing — LVIS 49 `banner/streamer`,
  95 `billboard`, 697 `monitor/…`, 747 `painting`, 834 `poster/placard`, 958 `signboard`,
  1076 `television set/…` — and that the demo prop **is** a printed A3 sheet or a tablet, so every
  one of them is a literally correct label for it. File 02 states plainly: *"The mechanism is
  UNVERIFIED; the presence of the competing labels in the baked vocabulary is verified."*
- **File 03, residual risk R2** arrived at the same place from the code: *"The demo prop is
  described in the code as 'a frame-filling A3 print' (`:245-246`) — that is literally a poster of
  a bus, and LVIS contains `poster`, `signboard`, `banner`, and `painting`. If one of those wins
  the argmax for the anchor covering the prop, `is_target` is `False` (`:1000`), `best_conf` stays
  0, and no arrival ever fires."*
- **File 03, §"What is already optimal" item 11** establishes the instrument: `confidence` in the
  response is the best *target* box confidence for the frame **even when it is below `CONF_MIN`**
  (`:1113`, sourced from `:1003-1004`, threshold applied separately at `:1035`).
- **File 02, "What would actually move the observable"** supplies the ladder and its ordering, and
  is explicit that a model swap is the *last* rung, not the first.
- **File 03, R4** supplies the `max_det` rung: *"`MAX_RAW_BOXES = 30` (`:78`, applied at `:983`)
  could in principle evict the target in a crowded room if 30 boxes outscore it."*

**Be honest about what the convergence does and does not establish.** It establishes the *risk*.
It does not establish the *mechanism*, and a reviewer should push on this: YOLO-World's head is a
scaled cosine similarity through a **per-class sigmoid**, not a softmax (file 03 Verdict 2 makes
this point while correcting the comment at `:72-75`). Scores do not sum to 1, so adding or
removing a class **cannot mechanically move the `bus` score**. Only two mechanisms remain by which
the seven labels can hurt, and both are unproven:

1. **Argmax per anchor.** If `non_max_suppression` runs with `multi_label=False`, each anchor
   contributes only its top class. Anchors covering the prop that argmax to `poster` produce no
   `bus` box at all. `ultralytics` is not installed on this machine, so this could not be read.
2. **`max_det` slot competition.** `max_det=MAX_RAW_BOXES=30` (`:983`) keeps the 30
   highest-confidence boxes. Seven depiction labels firing on a frame-filling prop consume slots.

Cross-class NMS suppression is **not** a live mechanism — NMS is deliberately class-aware here
(`:975-977`, `agnostic_nms` not passed), and `_dedupe_for_display` is display-only and
role-protective (traced above). Do not let the reviewer be told otherwise.

**(c) Concrete implementation steps.**

**Step 1 — the diagnostic. Zero code, ~5 minutes, do this before touching anything.** Point the
demo phone at the actual prop at 1.0–1.5 m with the capture page running. Read two things off the
screen: the label chips drawn per box (`www/src/app/capture/page.tsx:129`) and the frame's best
target confidence (`www/src/app/page.tsx:104`). Three outcomes, three actions:

| Observation | Meaning | Action |
|---|---|---|
| A `bus` / `double decker bus` / `bus front` box, confidence comfortably **> 0.6**, stable across frames | The detector is not the problem | **Stop. Close the question.** Do not spend a bake. Idea 1 is done and costs 5 minutes |
| A target box but confidence **0.35–0.50**, or flickering across the `CONF_MIN` line | Marginal. `HITS_TO_ARRIVE = 2` requires two *consecutive* qualifying frames (`ARRIVAL_LUA:407-413` zeroes `hits` on any miss), so flicker is worse than a low mean | Steps 2 → 5 |
| Boxes drawn reading `poster 0.7x` / `signboard` / `television set`, and **`Confidence` reads 0.000** | R2 confirmed. `best_conf` never left its initialiser at `:991`. No arrival will ever fire | Steps 4 → 5, skip 2 and 3 |

**Step 2 — `MAX_RAW_BOXES`, one constant, no bake.** Only if the drawn list looks saturated in a
busy frame. `vision/service.py:78`, `MAX_RAW_BOXES = 30` → `100`. It reaches NMS as `max_det=` at
`:983`. What breaks if wrong: more boxes survive NMS, so `_dedupe_for_display` (`:754-792`) does
more IoU work and the payload grows before the `MAX_DETECTIONS = 12` cap at `:1033`. Marginal NMS
time only; the device path (`hazards` at `:1022-1025`, `best_box` at `:1003-1004`) is computed
before the cap and is unaffected. **This is the weakest rung** — a frame-filling prop should be
the top detection — and it is listed only because it is free.

**Step 3 — `CONF_MIN`, one constant, no bake.** `vision/service.py:70`, `0.35` → a value at least
0.05 below the *lowest* per-frame confidence observed in Step 1. What breaks if wrong, in both
directions, is asymmetric and file 03 Verdict 1 quantifies it: **too high** and the prop never
reaches the bar, `seen` is never true at `:1035`, no arrival ever fires and the demo is dead;
**too low** and a false latch fires during the prop-raise sweep, at which point `:424`'s
`not present` guard means the *real* arrival produces no event, re-arming needs `MISSES_TO_CLEAR = 4`
consecutive misses (2.0 s at 2 fps) plus another qualifying frame, and the crop was taken from the
motion-blurred frame that latched (`:1077-1079`) so the OCR gate fails and the device shows
UNKNOWN and *stays* there. **Recovery floor ≈ 2.5 s and it needs the presenter to lower and
re-raise the prop on stage.** Do not go below ~0.25 without re-running Step 1 several times.

**Step 4 — target prompts, costs one bake.** `vision/service.py:143` and `:147`, edited together
— a string added to `EXTRA_PROMPTS` does nothing unless it is also in `TARGET_LABELS`, because
`_resolve_vocab` builds the target index set from `TARGET_LABELS ∩ idx` at `:224`:

```python
EXTRA_PROMPTS = [
    "double decker bus", "bus front",
    "photo of a red london bus",      # new: describes the prop as a depiction
    "bus destination blind",          # new: the text panel itself
]

TARGET_LABELS = {
    "bus", "school bus", "double decker bus", "bus front",
    "photo of a red london bus", "bus destination blind",
}
```

*The strings above are this document's specialisation of file 02's rung 2, which says only "add
hand-tuned target prompts" without naming any.* The rationale is file 02's own Q4 observation that
the prop is a *depiction*, not a bus, and that a depiction "is not obviously an easier case than a
real bus — it is a *different* case" — so give CLIP a target prompt that describes the depiction.
Cost of getting it wrong: every added member of `TARGET_LABELS` widens the false-latch surface
(file 03 Verdict 1: *"`TARGET_LABELS` has four members and any one firing at ≥0.35 counts"*), and
these two are wider than the existing four. Re-run Step 1 after the bake and watch for latches on
things that are not the prop.

**Step 5 — drop the seven depiction labels, same bake as Step 4.** Insert after
`vision/service.py:143`:

```python
# LVIS labels that name a DEPICTION of a thing rather than the thing. The demo
# prop is a printed A3 sheet or a tablet, so each of these is a literally
# correct label for it and competes with `bus` on the same pixels.
#
# These are the strings _lvis_labels() PRODUCES, not the raw LVIS entries:
# it splits on "/" and keeps the first synonym (:198-201). Verified against
# ultralytics/cfg/datasets/lvis.yaml — none of the seven collide on their
# first synonym, so each keeps it.
DEPICTION_LABELS = {
    "banner",          # LVIS 49   "banner/streamer"
    "billboard",       # LVIS 95   "billboard"
    "monitor",         # LVIS 697  "monitor/monitor computer equipment"
    "painting",        # LVIS 747  "painting"
    "poster",          # LVIS 834  "poster/placard"
    "signboard",       # LVIS 958  "signboard"
    "television set",  # LVIS 1076 "television set/tv/tv set"
}
```

and replace the body of `_vocab()` at `vision/service.py:211`:

```python
    base = _lvis_labels()
    kept = [name for name in base if name not in DEPICTION_LABELS]
    if len(base) - len(kept) != len(DEPICTION_LABELS):
        raise RuntimeError(
            f"DEPICTION_LABELS matched {len(base) - len(kept)} of "
            f"{len(DEPICTION_LABELS)} — a label string is wrong for this "
            "ultralytics version"
        )
    return kept + EXTRA_PROMPTS
```

The assertion is not decoration. Without it a wrong string silently drops nothing and the bake
looks successful — the exact failure mode that `_lvis_labels()` already guards at `:202-203` and
`_resolve_vocab` at `:227`. It is also the only defence against the pinned-vs-latest `ultralytics`
gap: `IMAGE` installs `ultralytics` unpinned (`:267`), so the container's `lvis.yaml` is whatever
is current at build time, and this document verified against upstream `main`.

Two properties make this safe, and both were designed in rather than lucked into: dropping entries
**shifts every subsequent class index**, which is harmless because `_resolve_vocab` resolves by
name (`:214-228`) — the exact failure its docstring says it exists to prevent; and `_vocab()` is
called at **both** bake time (`:254`) and restore time (`:879`), so a single edit keeps the two in
sync by construction (`:207-210` says so). None of the seven appear in `TARGET_LABELS` (`:147`) or
`HAZARD_LABELS` (`:152-170`), so neither map can break.

**Step 6 — validate, and learn the iteration cost for free.**

```bash
cd /Users/haidertoha/Code/axiometa-ant-hack
.venv/bin/modal deploy vision/service.py
```

Watch the build log. `@modal.asgi_app(label="bus-vision")` (`:930`) means the deployed URL is
stable across deploys, so the phone never needs repointing — iterate with `modal deploy`, not
`modal serve` (which appends a `-dev` suffix and would need a `www` rebuild, since `MODAL_URL`
comes from a build-time env at `www/src/app/capture/page.tsx:29`).

- After Step 2 or 3 (constants only): **if `[bake] … classes baked` prints at all, the run_function
  layer re-ran and file 02's "seconds" assumption is wrong.** That is a free, definitive
  observation on the first deploy and it tells you the cost of every subsequent iteration.
- After Step 4/5: the line at `:258` must read **`[bake] 1198 classes baked`** (1203 − 7 + 2), not
  1205. If it reads 1205 the exclusion did not apply — but the assertion should have raised first.
- Then `curl -fsS https://<printed-url>/health`, then one arrival driven by the disclosed SPACE
  key on the capture page (`:309` sets `forceNext`), and confirm `TARGET_ARRIVED` and a route.

There is **no test suite for `vision/`** and `AGENTS.md` prescribes no verification recipe for it.
Deploy plus the smoke above is the whole of validation.

**(d) Estimated implementation time.**

| Path | Time |
|---|---|
| Step 1 only (the likely case, if confidence is healthy) | **5 minutes**, zero code, zero deploy |
| Steps 1–3 (constants) | ~25 min, plus deploy — minutes if the bake layer caches, ~15 min more if it does not |
| Steps 1–6 (full ladder) | **~1.5 h.** The edit is 20 minutes; the rest is one bake (checkpoint download + CLIP weight fetch + 1198 prompt encodes, "minutes" per file 02, **duration unmeasured by anyone**) plus re-running Step 1 to confirm the change helped and did not introduce false latches |

Budget the rebuild and the revalidation, not the edit. Because Steps 4 and 5 share a bake they
should be applied together — at the cost that if the result changes, attribution between "new
prompts helped" and "dropped labels helped" is lost. Accept that; the bake is too slow to bisect.

**(e) Risk to the existing working demo.** Step 1 is read-only and cannot break anything. Steps
2–5 are all reversible single-file edits. The failure modes, in order of severity: a mistyped
`CONF_MIN` kills every arrival (noticed instantly — no `TARGET_ARRIVED` in the Modal log at
`:1080-1083`, and `Confidence` visible on the debug screen while `present` stays false); a
too-low `CONF_MIN` produces sticky false latches (noticed as BUS ARRIVING firing before the prop
is up, then permanent UNKNOWN); a wrong `DEPICTION_LABELS` string now raises at build time rather
than passing quietly; and a broken `_vocab()` fails the bake, so the current deployment keeps
serving. Nothing here touches `ARRIVAL_LUA`, the Redis keys, Contract A, or the relay.

**(f) Demo story value.** In the healthy case, **nothing new to say — and that is the point**: five
minutes of rehearsal converts "we think the detector sees the prop" into "we measured it at 0.7".
In the unhealthy case it is the difference between a demo that fires and one that does not, which
is the only demo story that matters.

**Gates.** 1 Demo impact: **pass** — "bus detected correctly" is the canonical observable.
2 Modal-specific: **fail, openly.** This is a computer-vision fix that happens to live in a Modal
file. 3 Risk: **pass.** 4 Time: **pass** in every branch. 5 Necessity: **unknown until Step 1
runs** — which is precisely why Step 1 is the idea and Steps 2–5 are contingent. A reviewer who
rejects the ladder should still keep Step 1; it costs five minutes and it is the only thing in
this entire research phase that can turn a hypothesis into a fact.

---

### 2. De-arm the Haiku fallback trap

**(a) What it is.** The in-code instruction at `vision/service.py:89-90` tells a panicking operator
that switching to a cheaper Claude model is "one string, nothing else"; it is two edits, and doing
only the first silently breaks every OCR call for the rest of the demo.

**(b) Phase 1 support.** File 03 Finding F1, **confirmed by file 03's Orchestrator addendum against
the `claude-api` reference tables** — this is the one finding in the whole phase that is
established fact rather than hypothesis:

- `output_config.effort` **errors on `claude-haiku-4-5` at any level**, per the *Thinking & Effort*
  table ("errors on Sonnet 4.5 / Haiku 4.5"). The level passed is irrelevant; the service sends
  `"low"`.
- `output_config.format` with `json_schema` **is** supported on Haiku 4.5. Only the `effort` half
  breaks, which is what makes the trap partial and therefore confusing.
- `effort` is passed at **two** call sites: `vision/service.py:603` (`_one_vote`) and `:916`
  (`_prime_schema`). *(File 03 cites `:601` for the first; that is the comment line. Corrected
  here.)*
- Both existing safety nets **hide** the failure rather than surface it: `_prime_schema` is wrapped
  in `try/except` at `:899-902` and prints only `[warm] schema prime skipped: …`; `_vote_all`
  passes `return_exceptions=True` at `:647`, so three 400s collapse into an empty `votes` list,
  `kept` is empty, `reading` stays `None` at `:682`, and the UNREADABLE path at `:697-702` runs.
- Observable on stage: **BUS ARRIVING fires normally** — YOLO is untouched — **and then the route
  never arrives, permanently, for every arrival**, diagnosable only in Modal container logs.
- The correct recovery is already written 500 lines away at `:600-602` (*"If a 400 ever names
  output_config, drop `effort` first"*) and was never connected to the instruction that triggers it.

**(c) Concrete implementation steps.** Two options. Prefer B; A is the zero-risk floor.

**Option A — documentation only, ~10 minutes, cannot break anything** (the code path is dormant;
`CLAUDE_MODEL = "claude-opus-4-8"` at `:88` is active and `effort` is valid there). Replace
`vision/service.py:89-90`:

```python
# Faster/cheaper swap if the stage feels laggy. This is TWO edits, not one:
#   1. CLAUDE_MODEL = "claude-haiku-4-5"
#   2. DELETE `"effort": "low"` from BOTH output_config blocks — :603 and :916.
# output_config.effort ERRORS on claude-haiku-4-5 at ANY level; the json_schema
# half is fine. Leave `effort` in and every OCR call 400s SILENTLY: _prime_schema
# swallows it (:899-902) and _vote_all collects it via return_exceptions=True
# (:647). On stage that is BUS ARRIVING firing normally and the route never
# arriving, for every arrival, for the rest of the demo.
```

**Option B — make the comment true, ~30 minutes including a deploy and one forced arrival.** Insert
after `ROUTE_SCHEMA` (`vision/service.py:566`):

```python
# Models on which output_config.effort is accepted. An ALLOW-list, not a
# deny-list, and deliberately so: an unknown model then silently loses `effort`
# (harmless — the schema does the work) instead of silently 400ing every call.
EFFORT_MODELS = {"claude-opus-4-8"}


def _output_config() -> dict:
    """output_config for both Claude call sites.

    `effort` and `format` are optional siblings. `format` is the load-bearing
    half and is supported everywhere this service would plausibly go; `effort`
    is rejected outright by claude-haiku-4-5 and claude-sonnet-4-5, so it is
    added only where it is known to be valid. This is what makes swapping
    CLAUDE_MODEL genuinely a one-string change.
    """
    cfg: dict[str, Any] = {
        "format": {"type": "json_schema", "schema": ROUTE_SCHEMA},
    }
    if CLAUDE_MODEL in EFFORT_MODELS:
        cfg["effort"] = "low"
    return cfg
```

Then replace the literal at `:599-605` with `output_config=_output_config(),` and the literal at
`:915-918` with the same. Update the comment at `:89-90` to the one-string version it now truthfully
is. Validation: deploy, confirm `[warm] ROUTE_SCHEMA grammar primed` appears in the container log
(`:927` — it prints only on success, so it is the canary that the Opus path still works), then one
SPACE-key forced arrival and confirm a route reaches the wrist.

**(d) Estimated implementation time.** Option A: **10 minutes**, no deploy needed. Option B:
**30 minutes** — 10 to write, 10 for `modal deploy` (config-only change; `IMAGE` is untouched so
the bake layer is not at issue), 10 to smoke one arrival.

**(e) Risk to the existing working demo.** Option A: **zero.** Option B: the only real risk is
breaking the *working* Opus path while fixing the dormant Haiku one — i.e. causing the exact failure
being prevented. It is bounded: for `CLAUDE_MODEL = "claude-opus-4-8"` the dict `_output_config()`
returns is content-identical to the current literal, and the `[warm] ROUTE_SCHEMA grammar primed`
line at `:927` plus one forced arrival catches it in under a minute. If in doubt at T-minus-one-hour,
ship Option A.

**(f) Demo story value.** **None. Say so plainly.** Nothing about this can be said on stage. It is
insurance against a self-inflicted wound, armed precisely when someone is under time pressure and
follows the repo's own written advice.

**Gates.** 1 Demo impact: **fail** — a judge observes nothing, today. 2 Modal-specific: **fail** —
this is an Anthropic API contract, not a Modal one. 3 Risk: **pass** (Option A trivially; Option B
with a named canary). 4 Time: **pass** comfortably. 5 Necessity: **arguable, and the honest answer
is "the demo is not broken by this today."** The finding is dormant: Opus is active and `effort` is
valid there. What justifies it is asymmetry — 10 minutes now against a total, silent,
undiagnosable Stage 2 failure at the worst possible moment. Judge it as a fire extinguisher, not
as a feature.

---

### 3. GPU fallback list — `gpu=["T4", "L4"]`

**(a) What it is.** One line, so that if Modal cannot allocate a T4 at demo time the container
comes back on an L4 instead of not coming back.

**(b) Phase 1 support.** File 01, ranked feature #2 and Verdict 5: Modal *"respects the ordering of
this list and will try to allocate the most preferred GPU type before falling back"*
(https://modal.com/docs/guide/gpu). File 01 rates it *"pure availability insurance for a live demo.
Costs nothing unless it fires"*, with L4 at $0.000222/s against T4's $0.000164/s — **35% more, and
only while it is in force** (https://modal.com/pricing). File 02 Q5 independently establishes there
is no performance reason to want a bigger GPU: `yolov8l-worldv2` already fits the hop-4 budget on a
T4 at 13.66 ms, so this is availability insurance and nothing else.

**(c) Concrete implementation steps.** `vision/service.py:843`:

```python
    gpu=["T4", "L4"],   # was: gpu="T4"
```

Then `.venv/bin/modal deploy vision/service.py` and `curl -fsS https://<url>/health`. Nothing else
changes: `IMAGE` is untouched so the bake layer is not rebuilt, and `min_containers=1` (`:848`),
`scaledown_window=1200` (`:849`) and `enable_memory_snapshot=True` (`:851`) are unaffected.

**Why this is compatible with the memory snapshot, which file 01 did not check.** Read from the
code: the `snap=True` phase (`:872-883`) does a disk YAML read, `_resolve_vocab`, and
`YOLO(BAKED_WEIGHTS)` — which `:883` correctly notes "loads to CPU by default". **No CUDA call
happens before the snapshot is taken**, and `.to("cuda")` is in `snap=False` at `:889`. So the
snapshot contains no GPU state and is GPU-model-agnostic by construction. This is the same property
file 01 Verdict 1 identifies as Modal's documented "Using GPUs without using GPU Memory Snapshots"
pattern, already implemented here. **Whether Modal itself permits restoring a snapshot onto a
different GPU type in the fallback list is UNVERIFIED** — no Phase 1 file checked it. If it turns
out not to, the fallback still works; only the snapshot would be skipped, and file 03 Verdict 5
already establishes the snapshot is *"cheap insurance against an infra-initiated restart, not a
demo-critical feature."*

**(d) Estimated implementation time.** **10 minutes** — one character-level edit, one deploy, one
health check. There is no way to *test* the fallback short of Modal running out of T4s, so
validation is limited to "the service still comes up on a T4 and serves a frame."

**(e) Risk to the existing working demo.** Low, and one-directional. The failure it prevents is
total: `min_containers=1` means Modal must hold a T4 continuously, and any infra-initiated restart
requires re-allocating one. If T4 capacity is exhausted at that moment the container does not come
back and there is no demo. The failure it *introduces* is that the service silently lands on an L4
and bills 35% more, which shows up in the Modal dashboard, not on stage. The model runs on L4
without change (PyTorch/CUDA, and file 02 Q5 puts L4 at roughly 2× T4 throughput for this class of
work — **UNVERIFIED for this workload**, per file 02's own marking). Untested on L4 is the honest
residual.

**(f) Demo story value.** **None.** It is invisible when it works and invisible when it fires. It
cannot be claimed on stage, and it should not be.

**Gates.** 1 Demo impact: **fail** in the expected case; in the tail case it is the difference
between having a demo and not. 2 Modal-specific: **pass** — GPU fallback lists are a Modal platform
feature and this is the only surviving idea that clears this gate. 3 Risk: **pass.** 4 Time:
**pass** (10 min). 5 Necessity: **unproven** — T4 availability at demo time is unmeasured, and file
01 took no measurement of anything on this service. This is insurance against a low-probability,
total-loss event at a cost of ten minutes. That trade stands or falls on how much a lost demo costs,
which is not a technical question.

---

### 4. Put Modal's endpoint metrics on a second screen during the demo

**(a) What it is.** Open the Modal dashboard's endpoint metrics panel for `bus-vision` beside the
demo, so p50/p95 latency and QPS are visible live while frames are flowing.

**(b) Phase 1 support.** File 01, ranked feature #3: *"zero code, already on"*, giving
p50/p95/p99 latency, QPS and queue depth, rated *"Medium — a live latency graph beside the demo is
cheap and real"* (https://modal.com/docs/guide/endpoint-metrics). File 01 attaches two caveats and
both must travel with the idea: the metrics page is written for Modal **Endpoints** (LLM serving),
so TTFT and token-throughput panels are irrelevant to `/ingest`; and *"idle endpoints show no
data."* File 01's residual risk 7 marks **UNVERIFIED** which panels actually light up for a plain
`@modal.asgi_app` POST endpoint.

**(c) Concrete implementation steps.** **No code.** No `file:line` reference exists because there is
nothing to change — which is itself a fair objection to this being called an "idea".

1. During the Idea 1 rehearsal (frames already flowing at 2 Hz), open the Modal dashboard for app
   `bus-vision` (`vision/service.py:60`) and find the metrics view for the `bus-vision`-labelled
   ASGI endpoint (`:930`).
2. Record which panels populate. If latency and QPS do not appear for an `asgi_app` endpoint, this
   idea is dead and costs nothing to abandon — that is the UNVERIFIED point above resolving itself.
3. If they do, rehearse the one sentence it licenses. Keep frames flowing right up to the moment
   it is shown: an idle endpoint shows nothing.

**(d) Estimated implementation time.** **5–10 minutes**, entirely inside the Idea 1 rehearsal
window. Zero if step 2 comes back empty.

**(e) Risk to the existing working demo.** **Zero.** Read-only dashboard, no deploy, no code.
The only cost is a presenter's attention on stage and one more thing that can be blank when
someone looks at it.

**(f) Demo story value.** **The only genuinely new Modal sentence available anywhere in this
research** — "that is our GPU container serving the phone at 2 Hz, p95 under X ms, live" — backed by
a real graph rather than a claim. Weigh it against what it is not: it does not make the system
better, and file 01 rated the story "Medium", not high.

**Gates.** 1 Demo impact: **pass** if it goes on a screen. 2 Modal-specific: **pass** — it is
literally Modal's own instrumentation. 3 Risk: **pass** (zero). 4 Time: **pass.**
5 Necessity: **FAIL, explicitly.** The demo is not broken in any way this fixes; it is narrative,
not reliability. It is on the shortlist because it is free, because gate 2 has exactly one other
candidate (Idea 3, which has no story at all), and because the alternative was to report "nothing
Modal-specific is worth doing" without mentioning the zero-cost option. A reviewer who cuts it on
gate 5 is applying the gate correctly.

---

## Explicitly rejected

Each of these came up in Phase 1. Recorded so the reviewer does not re-derive them.

| # | Idea | Source | Why rejected |
|---|---|---|---|
| R1 | `experimental_options={"enable_gpu_snapshot": True}` (`:854`) | File 01 Verdict 1, file 03 Verdict 5 | Alpha, and **three independent reasons it buys zero here**: `min_containers=1` (`:848`) means no cold start to accelerate; the `snap=True` phase is `YOLO(BAKED_WEIGHTS)`, a storage-bound weight load, which Modal's own docs say snapshots *"will generally not improve … and may even worsen"*; and there is no `torch.compile` JIT cost to skip. Fails gates 3 and 5. File 01's demo-story rating is **negative** |
| R2 | `@modal.concurrent(max_inputs=N)` | File 01 ranked #1 — **killed by file 01's Orchestrator addendum** | Track 1's only actionable finding, and the addendum retired it. The capture page serialises its own requests: `if (inFlight.current) return;` at `www/src/app/capture/page.tsx:142`, cleared in a `finally` at `:217`, and it is the only Modal client. One phone never has two inputs outstanding, so the queueing failure Track 1 posited **cannot occur**. Survives only as insurance against a judge opening the capture page on a second device. Placement is also **UNVERIFIED** — file 01 found no doc showing `@modal.concurrent` on an `@app.cls` whose method is `@modal.asgi_app`. Fails gate 5, risks gate 3 |
| R3 | `s` → `yolov8m/l-worldv2` model swap | File 02 Q1 | Latency is free (+3.96 / +8.08 ms of 1380 = +0.29% / +0.59%), but **every accuracy number supporting it is COCO zero-shot or LVIS minival mAP**, and file 02 states outright: *"A reviewer would be right to reject `s`→`l` on the strength of '+8.1 mAP' alone, and I am not asking for it on that basis."* Fails gate 1. Also fails gate 4: file 02 requires *"full revalidation of thresholds, since box counts and the confidence distribution both shift and `CONF_MIN`, `DRAW_CONF_MIN`, `MAX_RAW_BOXES` and `DEDUPE_IOU` were all tuned against `s`."* It is rung 5 of Idea 1's ladder if rungs 1–4 fail |
| R4 | YOLOE / YOLOE-26L | File 02 Q2 | The best open-vocabulary detector in the report (36.8% LVIS mAP, 6.2 ms T4) and still wrong here: its documented bake is `set_classes()` → `export(onnx)`, **not** `save(.pt)`, so it needs an ONNX runtime in `IMAGE`, breaks the torch semantics the entire `snap=True`/`snap=False` split rests on (`:872-889`), needs a `-seg` → detection conversion, and its NMS-free head changes what `iou=` and `max_det=` at `:982-983` mean. Fails the infrastructure exclusion and gate 4 |
| R5 | YOLO26n — **the model the plan names** at `plan/…md:7, :9, :752` | File 02 Q2 | Real, excellent, 1.7 ms, and **closed-vocabulary COCO-80**. No `set_classes()`, so adopting it deletes `_bake_detector`, `_vocab`, `_lvis_labels`, `_resolve_vocab`, the on-screen naming, the by-name hazard map and both hand-tuned prompts. A redesign, not a swap. **Flagged for human adjudication, not acted on:** `AGENTS.md` gives the plan authority over code, but here the code satisfies the architecture and the plan's model name is what looks wrong. The plan was read-only for this phase and has not been edited |
| R6 | Florence-2 / a single detect+OCR VLM | File 02 Q3 | **+994 ms of 1380 (+72%)**, and worse than that: a ~1000 ms model does not fit inside the 250 ms capture tick, so frames queue and `HITS_TO_ARRIVE = 2` takes ≥2 s to accumulate. Independently disqualified on architecture — the Lua state machine still needs a per-frame boolean, so the VLM replaces hop 4 without removing anything |
| R7 | Move the `hazards:{session_id}` write off the synchronous path (file 03's F2) | File 03 F2 | File 03 grep-verified the key has **no reader** — it appears only at `:19` (docstring) and `:1058`; every consumer reads hazards from the HTTP response body. But the payoff is **20–60 ms of 1380 (1.5–4%)**, which no judge observes (gate 1) and which fixes nothing broken (gate 5). **And the proposed fix has a defect Phase 1 missed:** `_redis()` caches per-thread on `threading.local()` (`:449-469`), so dispatching the write on a fresh `threading.Thread` — the `_ocr_worker` pattern at `:1085-1087` — constructs **a new Upstash client per frame**, twice a second, where the `_ocr_worker` precedent runs once per arrival. That trades blocking time for object and connection churn. Not worth it |
| R8 | Fold the `_mget` at `:1093-1095` into `ARRIVAL_LUA` as `KEYS[5..7]` | File 03 F2, "considered and rejected" | Saves another 20–60 ms of 1380 and does **not** violate the key schema, but it modifies the atomic state machine that guarantees exactly one container fires exactly one vote-set per arrival. Automatic fail on gate 3. Recorded here so it is not rediscovered |
| R9 | Reuse the `AsyncAnthropic` client across arrivals (`:644`) | File 03 Verdict 3 | ~100–200 ms of the 3800 ms Stage 2 mean, from three cold TLS handshakes per arrival. A module-level client cannot survive `asyncio.run()` closing its loop, so the fix means a long-lived loop/thread or a sync client plus a pool — structural surgery on the one part of the file with no current failure modes. File 03's own verdict: *"Bad risk/reward for ~150 ms"* |
| R10 | Opus 4.8 Fast Mode (`betas=["fast-mode-2026-02-01"]`, `speed="fast"`) | File 03 Verdict 4, lever 2 | Same model, no accuracy change — but it compresses the generation tail of only ~45 output tokens, so file 03 estimates *"a few hundred ms, not seconds"* against a 3800 ms Stage 2. Requires the beta endpoint (`client.beta.messages.create`), carries premium pricing and a separate rate limit, and **whether `anthropic==0.117.0` supports the parameter is unverified.** Fails gate 3 on the beta-endpoint move, marginal on gate 1 |
| R11 | Raise the capture rate from 2 fps to 3 fps | File 03 Verdict 1 | Numerically the **largest lever anywhere in this research** — ~250 ms of 1380 (18%) — and rejected on four counts: it lives at `www/src/app/capture/page.tsx:21`, not in the vision service, and `AGENTS.md` assigns `www/` to George; the capture loop is serial (`:142`) so the effective rate is `min(1/CAPTURE_MS, 1/RTT)` and the lever **may not exist at all** if venue RTT exceeds 500 ms; if handler wall time approaches the frame period Modal may spawn container #2, which **would** cold-start mid-demo — the one scenario where "no cold starts" stops holding (file 03 R3, Verdict 5's conditional); and a judge has no baseline against which to observe 250 ms |
| R12 | Modal Volumes for the weights instead of the image bake | File 01 Verdict 3 | Modal's own page: *"Performance is similar for the two methods."* The recommendation is about flexibility and rebuild cost, explicitly not runtime speed — and the bake here is load-bearing for **correctness**, not caching (`_bake_detector` runs `set_classes()` at build so CLIP never enters the container, and `_vocab()` runs at both bake and restore so indices cannot drift). A lateral move with new failure modes |
| R13 | `@app.server()` / `modal.Server`; `@modal.batched`; `modal.Dict`/`Queue`; Sandboxes; `Function.update_autoscaler()` | File 01 ranked #4, #7–#10 | Respectively: a rewrite of `web()` and both `@modal.enter` hooks for no demo-visible gain; one user at 2 fps never fills a batch and `wait_ms` would *add* latency; duplicates a Redis state machine under a locked schema; nothing here runs untrusted code; and `min_containers=1` is already static in the decorator |
| R14 | T4 → A10 / L4 / L40S as an *upgrade* | File 02 Q5 | **−3.2 ms of 1380 (−0.23%) for 1.87× the GPU spend**, and `yolov8l-worldv2` already fits the hop-4 budget on a T4 with margin. Note this is a different proposal from Idea 3, which changes nothing unless T4 allocation fails |
| R15 | TensorRT / FP16 export of the current model | File 02, excluded at source | Optimises a hop that is ~20 ms of 1380 (1.4%). Even taking file 02's pessimistic caveat that real hop 4 may be nearer 90 ms, it is 6.5% of the budget and every conclusion holds a fortiori |
| R16 | Comment-accuracy fixes: add the missing 5th GPU-snapshot limitation at `:852-857`; reword `_bake_detector`'s rationale at `:246-250` where *"for no measurable gain"* is unsupported; correct `DRAW_CONF_MIN`'s softmax reasoning at `:72-75`; correct `_set_ex`'s docstring at `:508` | File 01 Verdict 1, file 02 "Adjudicating the in-code rationale", file 03 Verdict 2 and §6 | All correct criticisms, all zero demo impact, all fail gate 5. The GPU-snapshot omission in particular is immaterial to behaviour because the comment's operative instruction — *"DO NOT ENABLE FOR THE DEMO"* — is already right. Fold into whatever change happens to touch those lines; do not spend a task on them |

---

## What the evidence does NOT support

Stated plainly, because each of these is a conclusion someone could reasonably draw from Phase 1
and should not.

1. **There is no cold-start problem to solve, so nothing that accelerates cold starts is worth
   anything here.** `min_containers=1` at `vision/service.py:848` with `scaledown_window=1200` at
   `:849` means the container never scales to zero, and at 2 fps a request lands every 500 ms so it
   is never idle. Both file 01 and file 03 reach this independently. Every published GPU-snapshot
   number — Parakeet 10×, ViT 3.8×, vLLM 9× — accelerates a *restore* that does not happen on this
   demo's critical path.

2. **Nothing in the forward pass is worth optimising for latency.** Hop 4 is ~20 ms of 1380. Even
   the most extreme proposal on the table (`s` → `l`) costs 8 ms, which is 1/60th of what cutting
   `HITS_TO_ARRIVE` to 1 would save — and cutting the debounce is correctly refused because a false
   latch is sticky for ≥2.5 s and reaches a DeafBlind user's wrist. **The forward pass is not where
   this demo's time goes, and no model on file 02's list changes that.**

3. **No benchmark anywhere establishes that any model swap detects *this prop* better.** Every
   accuracy figure in file 02 is COCO zero-shot mAP or LVIS minival AP, aggregated over street
   scenes with real vehicles at distance. The prop is a frame-filling 2D *depiction* at 1.0–1.5 m.
   File 02 is explicit: *"I could not find a benchmark that resembles this prop, and I do not
   believe one exists."* The direction of the transfer error is not knowable in advance — a
   depiction is a *different* case, not an easier one.

4. **The convergent finding is a risk, not a mechanism.** Two tracks independently identified the
   seven depiction labels; neither could show that they actually suppress the `bus` box. Per-class
   sigmoid scoring means removing a label cannot mechanically raise another label's score. Idea 1
   is structured as a measurement first *because of* this, and would be indefensible as a blind fix.

5. **T4 is not proven adequate and has not been measured.** Nobody in Phase 1 deployed, invoked or
   timed this service. File 01: *"No latency number in this document was produced on this service."*
   File 03: *"No container was deployed and no request was timed."* Modal's own default inference
   recommendation is L40S, which file 02 argues is aimed at a different weight class — a plausible
   argument, not a measurement. Nothing here disproves it.

6. **The Modal-distinctive and the useful are almost disjoint sets in this codebase, and no amount
   of framing fixes that.** The genuinely useful changes (Ideas 1 and 2) are a computer-vision
   question and an Anthropic API contract. The Modal-specific ones are insurance (Idea 3) and a
   dashboard (Idea 4). The strongest Modal claim available on stage is not a feature at all — it is
   that `min_containers=1` removed cold starts by design, which is already true, already shipped,
   and requires no further work. **Manufacturing a Modal-flavoured change to satisfy a rubric would
   make this demo worse.**

7. **The plan names the wrong model and this phase did not fix it.** `plan/…md:752` budgets a
   "YOLO26n forward pass"; the code bakes `yolov8s-worldv2.pt` (`:255`), a heavier 1203-class
   contrastive model, and YOLO26n is closed-vocabulary and structurally cannot do this job. The plan
   was read-only here. Flagged for human adjudication (see R5).

---

## Web sources cited

Carried forward from Phase 1, restricted to the URLs that actually underpin an idea above. All
fetched 2026-07-18 by Track 1 or Track 2.

**Underpinning Idea 1**

1. https://raw.githubusercontent.com/ultralytics/ultralytics/main/ultralytics/cfg/datasets/lvis.yaml
   — the actual baked vocabulary. Establishes 1203 classes, that index 172 is
   `bus/bus vehicle/autobus/charabanc/double-decker/motorbus/motorcoach` exactly as `:140-142`
   states, and the seven depiction-competing entries. **Re-fetched and re-derived through
   `_lvis_labels()`'s own algorithm at this consolidation point** to obtain the post-split strings
   the exclusion set must use.
2. https://docs.ultralytics.com/models/yolo-world/ and
   https://raw.githubusercontent.com/ultralytics/ultralytics/main/docs/en/models/yolo-world.md —
   the *"Persisting Models with Custom Vocabulary"* section showing `set_classes()` + `save()` → `.pt`,
   the mechanism `_bake_detector()` (`:234-258`) depends on, and the source of the v1→v2 mAP figures
   the in-code rationale quotes verbatim.
3. https://github.com/ultralytics/ultralytics/issues/11681 — cited in `_bake_detector`'s docstring;
   confirms `set_classes()` fetches CLIP into `~/.cache/clip`, which is why the bake exists.
   Closed **without a maintainer reply**, so it does not itself prove the saved `.pt` reloads
   CLIP-free (residual risk below).
4. https://arxiv.org/html/2407.10655v1 (OVLW-DETR, Table 1) — the only per-variant T4 latency table:
   YOLO-Worldv2 S/M/L at 5.58 / 9.54 / 13.66 ms, LVIS AP 22.7 / 30.0 / 33.0. T4, FP16, NMS excluded.
   Establishes that the latency headroom exists and therefore that **accuracy on the prop is the
   only criterion that should decide**.

**Underpinning Idea 3**

5. https://modal.com/docs/guide/gpu — GPU fallback list syntax and the ordering guarantee; valid
   2026 `gpu=` strings (note Modal exposes `A10`, not `A10G`); and Modal's warning that small-batch
   inference is memory-bottlenecked so bigger GPUs may not pay off proportionally.
6. https://modal.com/pricing — T4 $0.000164/s vs L4 $0.000222/s (the 35% figure), and the
   arithmetic behind `min_containers=1` costing ≈$14.17/day for the GPU alone.

**Underpinning Idea 4**

7. https://modal.com/docs/guide/endpoint-metrics — the available latency/QPS/queue-depth panels,
   that no code change is required, and the *"idle endpoints show no data"* caveat.

**Underpinning the rejections**

8. https://modal.com/docs/guide/memory-snapshots — **the decisive citation for R1.** The Alpha
   callout; the exact `experimental_options={"enable_gpu_snapshot": True}` syntax; and the fifth
   documented limitation the in-code comment omits: *"if the majority of your initialization latency
   is spent loading weights, GPU Memory Snapshots will generally not improve your cold start times —
   and may even worsen them."* Also the *"Using GPUs without using GPU Memory Snapshots"* pattern
   that `:872-889` already implements.
9. https://modal.com/docs/guide/cold-start — `scaledown_window`'s documented 2 s–20 min range,
   validating the comment at `:849`; and the idle-billing quote that contradicts the pricing page's
   "you never pay for idle resources" marketing line.
10. https://modal.com/docs/guide/concurrent-inputs and https://modal.com/docs/guide/webhooks —
    *"By default, each container will be assigned one input at a time"*, and Modal's canonical ASGI
    example carrying `@modal.concurrent(max_inputs=100)`. The basis for R2 before its addendum
    retired it.
11. https://modal.com/docs/guide/model-weights — *"Performance is similar for the two methods.
    Volumes are more flexible."* The decisive quote for R12.
12. https://modal.com/docs/guide/dynamic-batching — *"Batching increases throughput at a potential
    cost to latency"*, ruling out `@modal.batched` (R13).
13. https://docs.ultralytics.com/models/yolo26/ and https://arxiv.org/abs/2606.03748 — YOLO26 is
    real, five scales, 1.7–11.8 ms T4, and *"YOLO26 itself is not open-vocabulary."* Settles R5.
14. https://docs.ultralytics.com/models/yoloe/ — the *"Exported models are static"* warning
    establishing that YOLOE's documented bake is `export(onnx)`, not `save(.pt)`. Settles R4.
15. https://blog.roboflow.com/florence-2-ocr/ — *"On a T4 GPU, Florence-2 takes ~1 second to
    generate an OCR description for an image."* The single load-bearing number for R6.
16. https://arxiv.org/html/2508.19294v1 — *"LVLMs emphasize semantic comprehension over fine-grained
    localization, underscoring the need for hybrid approach with the use of conventional detectors."*
    The architectural half of R6.
17. https://inference.roboflow.com/foundation/yolo_world/ — ~90 ms per inference for a
    (variant-unspecified) YOLO-World on a T4 in a hosted stack. The basis for the caveat that real
    hop 4 likely exceeds the plan's 10–30 ms — which strengthens rather than weakens R15.
18. **`claude-api` skill** (invoked by Track 3, re-verified by file 03's Orchestrator addendum) —
    the *Thinking & Effort* table establishing that `output_config.effort` **errors on Haiku 4.5 and
    Sonnet 4.5** at any level; that `output_config.format` json_schema **is** supported on both
    Opus 4.8 and Haiku 4.5; the one-time-then-24h-cached grammar compilation that justifies
    `_prime_schema` (`:896-898`); and the Fast Mode contract behind R10. **The whole of Idea 2.**

---

## Residual risk

What remains unverified, and what a live measurement would settle. Ordered by how much it would
change the shortlist.

**RR1 — Nothing in this shortlist has been measured against a running service, including by me.**
No container was deployed, no request timed, no frame captured, in any of Phases 1 or 2. Idea 1
Step 1 is the measurement that resolves the largest single unknown, and it is five minutes of
rehearsal. **Take it before acting on anything else in this document, including the rest of Idea 1.**

**RR2 — The mechanism behind Idea 1's fix is unproven, and it may be a no-op.** If `ultralytics`
runs NMS with `multi_label=True`, or if the prop already produces its own `bus` box independent of
the depiction labels, then dropping the seven changes nothing at all and the bake was wasted. This
cannot be settled from a desk: `ultralytics` is not installed on this machine, and the Phase 1
tracks could not read the library either. The observation in Idea 1 Step 1 — *does a target box
exist at all, or only depiction boxes?* — distinguishes the two cases directly and for free.

**RR3 — Whether a constant-only edit invalidates the `.run_function(_bake_detector)` image layer.**
File 02 asserts it does not ("seconds"); nobody checked. If it does, Idea 1's cheap rungs (Steps 2
and 3) each cost a full bake, roughly tripling the ladder's time budget. Resolved for free by
watching whether `[bake] … classes baked` prints on the first constant-only deploy.

**RR4 — Bake duration is unmeasured by anyone.** File 02 says "minutes" and marks it UNVERIFIED
(*"I did not run a build"*). Idea 1's 1.5 h estimate for the full ladder is built on that word. If a
bake turns out to be 10+ minutes, the full ladder approaches the gate-4 ceiling and Steps 4–5 should
be dropped in favour of Steps 1–3.

**RR5 — The container's `ultralytics` version is unpinned.** `IMAGE` installs `ultralytics` without
a version at `:267`, so the container's `lvis.yaml` is whatever is current at build time, while this
document's label verification is against upstream `main`. If LVIS class names ever change,
`DEPICTION_LABELS` silently stops matching — which is exactly why Idea 1 Step 5 includes a
build-time assertion rather than trusting the strings.

**RR6 — Whether Modal permits restoring a CPU memory snapshot onto a different GPU type in a
fallback list.** Not checked by file 01 and not checkable from the code. The reasoning that it
*should* be fine (no CUDA call happens before the snapshot; `:872-883` is CPU-only) is sound but is
inference, not documentation. Low stakes: worst case the snapshot is skipped, and file 03 Verdict 5
already classes it as non-critical.

**RR7 — Whether the saved `.pt` truly reloads with no CLIP import.** The Ultralytics docs' *"behaves
like any other pretrained YOLOv8 model"* strongly implies it and the service is presumably already
running this way, but issue #11681 closed without a maintainer statement. Load-bearing for every
bake in Idea 1: if a rebake ever needs CLIP at *restore* time, `snap=True` forbids the network
(`:867-871`) and the container will not come up. Confirm from a running container, not from this
document.

**RR8 — Observed phone→Modal→phone round trip on the demo network.** File 03 calls this *"the single
highest-value measurement in this whole audit"* (R1) because the capture loop is serial (`:142`), so
RTT sets the effective frame rate and therefore sets hop 5 — if RTT exceeds 500 ms, hop 5 is larger
than the plan's +500 ms and Stage 1 is understated. It bounds R7 and R11 and it does not affect any
idea on the shortlist, which is why it is here rather than above. Capture it in the same rehearsal
pass as Idea 1 Step 1.

**RR9 — Idea 3 has been reasoned about but cannot be tested.** There is no way to exercise a GPU
fallback short of Modal exhausting T4 capacity. The model is untested on L4. This is accepted risk,
not resolved risk.
