# Phase 3 — Adversarial Verdict

Hostile technical review of `audit/modal-vision-research/04-ideas-shortlist.md`. The bar is the
five gates. This is the last gate before someone edits a working, deployed service on the day of
a demo.

**No code was modified.** `vision/service.py` is untouched and is byte-identical to `HEAD`
(`git diff --stat HEAD -- vision/service.py` returns empty). The plan was read-only.

**Discipline applied.** The `systematic-debugging` skill was invoked and its Iron Law governs this
review: *no fixes without root cause investigation first*. A proposed fix for a behaviour nobody
has demonstrated actually occurs is not a fix — it is a guess with a deploy attached. That single
rule decides most of what follows.

---

## Scope and method

### Read in full

- `audit/modal-vision-research/04-ideas-shortlist.md` (729 lines).
- `vision/service.py` (1121 lines, all of it).
- The Orchestrator addenda at the tail of `01-modal-platform-capabilities.md` and
  `03-current-service-bottlenecks.md`. Where an addendum contradicts its own body, the addendum
  was taken as authoritative, as instructed.
- `plan/2026-07-18-bus-stop-situational-awareness.md` — "The Vision Pipeline" and "Latency budget".
  Read-only, not edited.
- `www/src/app/capture/page.tsx` and `www/src/app/page.tsx` for the diagnostic-instrument claims.

### Verified independently by this session

Every code claim that would become an implementation instruction was re-checked against the file
rather than accepted from the shortlist. Results:

| Claim | Method | Result |
|---|---|---|
| `"effort": "low"` at `:603` and `:916` | `grep -n '"effort"'` | **Confirmed**, exactly two sites |
| `CLAUDE_MODEL = "claude-opus-4-8"` at `:88`; Haiku comment at `:89-90` | direct read | **Confirmed** |
| The Haiku failure chain — `:899-902` try/except, `:647` `return_exceptions=True`, `:682` `reading=None`, `:697-702` UNREADABLE | hand-traced | **Confirmed end to end** |
| `_output_config()` (Idea 2B) would compile — `Any` is imported | `:55` `from typing import Any, Literal, Optional` | **Confirmed** |
| `MAX_RAW_BOXES = 30` (`:78`) reaches NMS as `max_det=` (`:983`) | direct read | **Confirmed** |
| `CONF_MIN = 0.35` (`:70`) gates `seen` at `:1035`, not `best_conf` at `:1003-1004` | hand-traced | **Confirmed** — response `confidence` (`:1113`) is the best target confidence above `DRAW_CONF_MIN` |
| `agnostic_nms` is not passed to the forward pass | read `:978-984` | **Confirmed** — NMS is class-aware |
| `_dedupe_for_display` does not hide a `bus` behind a `poster` | hand-traced `:782-792` with both orderings | **Confirmed** — `protected` is true for the bus, no suppression condition fires, both are kept |
| The seven depiction strings are what `_lvis_labels()` produces | **re-fetched `lvis.yaml` from upstream `main` and re-ran the exact algorithm at `:198-201`** | **Confirmed** — 1203 classes, 1203 unique labels, collisions exactly `{bow, fish, octopus, pan, salmon}`, and all seven present at indices 49 / 95 / 697 / 747 / 834 / 958 / 1076; `bus` 172, `school bus` 921 |
| None of the seven appear in `TARGET_LABELS` (`:147`) or `HAZARD_LABELS` (`:152-170`) | direct read | **Confirmed** |
| `gpu="T4"` `:843`, `min_containers=1` `:848`, `scaledown_window=1200` `:849`, `enable_memory_snapshot=True` `:851` | direct read | **Confirmed** |
| Snapshot phase `:872-883` is CPU-only; `.to("cuda")` is at `:889` in `snap=False` | direct read | **Confirmed** |
| `modal 1.5.2` / `anthropic 0.117.0` present, `ultralytics` / `torch` / `upstash_redis` absent | `importlib.metadata` in `.venv` | **Confirmed** — matches the shortlist's correction #3 |
| Capture-page citations `:129`, `:142`, `:217`, `:255`, `:309`, `:344` | `grep -n` | **All confirmed** |
| `www/src/app/page.tsx:104` is the `Confidence` field | direct read | **Confirmed** |
| The debug-screen instrument is live, not edge-triggered | traced `capture/page.tsx:172-192` | **Confirmed** — `POST /api/detector` carries `confidence: m.confidence` **every frame**; only `/api/event` is edge-triggered |
| No test suite exists for `vision/` | `find` | **Confirmed** — deploy + manual smoke is the whole of validation |
| Plan `:747-761` is the Stage 1 budget; `:752` names YOLO26n | direct read | **Confirmed** — the plan/code model discrepancy (R5) is real |

### Taken on trust

The four facts supplied as already-settled by the orchestrating session: the `:603`/`:916` line
numbers (which I re-verified anyway), the `.venv` package versions (re-verified), the vendor
model-capability finding that `output_config.effort` errors on `claude-haiku-4-5` while
`output_config.format` json_schema works on both Opus 4.8 and Haiku 4.5 (**not** re-verified — no
Haiku request was issued), and the conclusion that `@modal.concurrent` does not apply (spot-checked
and consistent with what I read). There are no cold starts.

### A restructuring, declared up front

The shortlist presents Idea 1 as one idea with six steps and Idea 2 as one idea with two options.
Those are not single decisions. **Idea 1 Step 1 is a measurement; Steps 2–5 are fixes**, and my
brief is explicit that these are judged differently. **Idea 2 Option A is a comment; Option B is
live code on the working Claude path.** Bundling them would let the weakest half ride in on the
strongest half's evidence — exactly the failure this phase exists to prevent. So this review
grades six items, not four:

| Item | What it is |
|---|---|
| **1A** | Step 1 — the zero-code rehearsal diagnostic |
| **1B** | Steps 2–5 — the constants + vocabulary fix ladder |
| **2A** | Correct the false in-code instruction at `:89-90` (comment only) |
| **2B** | The `_output_config()` helper (live code) |
| **3** | `gpu=["T4", "L4"]` |
| **4** | Modal endpoint metrics on a second screen |

---

## Attacking the strongest idea: the depiction-label hypothesis

Idea 1B rests entirely on the claim that seven baked LVIS labels compete with `bus` on the demo
prop. The shortlist deserves credit for conceding the obvious mechanism is dead: YOLO-World scores
through a **per-class sigmoid, not a softmax**, so scores do not sum to 1 and removing a class
**cannot mechanically raise the `bus` score**. It names the two survivors — argmax-per-anchor under
`multi_label=False`, and `max_det=30` slot competition — and marks both unproven. I verified the
code that would carry them: `agnostic_nms` is absent from the call at `:978-984` so NMS is
class-aware, and `max_det=MAX_RAW_BOXES` is `30` at `:983`. Both mechanisms are *structurally
possible*. Neither is *demonstrated*.

Three findings kill 1B independently of which mechanism is true.

**Finding 1 — the dilemma. Either branch defeats the fix.** `multi_label` is not exposed as an
ultralytics predictor argument and is not passed by the detect predictor's `postprocess`, so the
value is whatever the library defaults to — and `ultralytics` is absent from this machine, so
neither Phase 1, Phase 2, nor I could read it. That does not matter, because both branches lose:

- **If `multi_label=True`:** every anchor contributes every class above threshold, no label
  shadows another, and per-class sigmoid means dropping seven classes changes nothing at all.
  Step 5 is a **pure no-op** that costs a bake.
- **If `multi_label=False`:** each anchor emits only its argmax class, so a `bus` score on an
  anchor that argmaxed to `poster` is **discarded inside NMS before it ever reaches
  `result.boxes`** (read at `:995`). The existing instrument therefore **cannot see it**.

**Finding 2 — the diagnostic cannot resolve the question the fix is premised on.** RR2 claims Step 1
*"distinguishes the two cases directly and for free."* It does not. Step 1 can establish "a target
box exists" or "no target box exists". In the second case — the case that triggers Steps 4–5 — it
**cannot distinguish `bus` scoring 0.34 and being argmax-shadowed (droppable, fixable) from `bus`
scoring 0.05 (hopeless)**, because under the very mechanism being hypothesised the losing score is
never emitted. The shortlist's own instrument is blind to its own hypothesis. That is a structural
gap, not a gap that more rehearsal time closes.

**Finding 3 — the seven are not a closed set, and I measured this.** After re-deriving the
post-split vocabulary from upstream `lvis.yaml`, I checked what survives the proposed exclusion.
Still present, and every one of them a literally correct label for a printed A3 sheet:

```
flag, map, mirror, newspaper, magazine, book, postcard,
street sign, curtain, blackboard, notepad, business card
```

`street sign` in particular is a highly plausible argmax for a printed sign bearing a route number
and a destination. **Dropping the seven promotes whatever ranked eighth on those anchors — which
the evidence says is likely to be another flat-surface label, not `bus`.** The seven are not a
principled category; they are the seven that two Phase 1 tracks happened to notice. This is
whack-a-mole against an unenumerated tail, and each swing costs a bake.

To be fair to the shortlist: its label strings are **correct**. I re-derived them and all seven
match at the exact indices claimed, and the collision set is exactly `{bow, fish, octopus, pan,
salmon}` as stated. The build-time assertion it proposes is also sound, and sound for a reason it
does not state — it works only because `_lvis_labels()` guarantees uniqueness at `:202-203`, so
each string can match at most once. The rejection below is not about correctness. It is about
gates 3, 4 and 5.

---

## Per-idea gate table

PASS/FAIL per gate. Every FAIL carries its evidence.

### 1A — Step 1, the zero-code rehearsal diagnostic

| Gate | Verdict | Evidence |
|---|---|---|
| 1 Demo impact | **PASS** | Targets "bus detected correctly", the canonical demo observable; the instrument is real and live — `capture/page.tsx:129` draws `label + confidence` per box and `:172-192` mirrors `confidence: m.confidence` to `/api/detector` **every frame**, surfacing at `page.tsx:104` |
| 2 Modal-specific | **FAIL** | Reading a browser canvas overlay and a Next.js debug field. Nothing in this action touches Modal |
| 3 Risk | **PASS** | Read-only. No file changes, no deploy |
| 4 Time | **PASS** | ~5 minutes inside a rehearsal that has to happen anyway |
| 5 Necessity | **PASS** | Judged as a *measurement*, not a fix: it is the sole gate on whether 1B's bake-and-revalidate cycle happens at all, and building 1B blind would violate the Iron Law outright |

### 1B — Steps 2–5, the constants and vocabulary fix ladder

| Gate | Verdict | Evidence |
|---|---|---|
| 1 Demo impact | **PASS** | If the hypothesis were true, "bus detected correctly" is exactly what it fixes — the target is the right kind of observable |
| 2 Modal-specific | **FAIL** | A computer-vision vocabulary question that happens to live in a file Modal deploys |
| 3 Risk | **FAIL** | Step 3 changes `CONF_MIN` (`:70`), the operating point of the working detection pipeline; by the shortlist's own analysis a too-low value produces a sticky false latch whose recovery needs 4 consecutive misses (`:81`, `ARRIVAL_LUA:428`) plus a re-raise, with the crop taken from the motion-blurred latching frame (`:1077-1079`) — permanent UNKNOWN on stage. That is not preserving the pipeline |
| 4 Time | **FAIL** | The estimate's dominant term is unmeasured **by the shortlist's own admission** (RR4: bake duration "unmeasured by anyone"; RR3: whether a constants-only edit even invalidates the `.run_function` layer is unchecked), the rollback path costs another bake, and there is no test suite for `vision/` — so "implementable *and testable* under 2 hours" is asserted, not established |
| 5 Necessity | **FAIL** | Nobody has observed the demo failing to detect the prop. The mechanism is unsupported in **both** branches: `multi_label=True` makes Step 5 a no-op; `multi_label=False` makes the Step 1 diagnostic blind to it, and 12+ competing flat-surface labels survive the exclusion regardless |

### 2A — Correct the false instruction at `:89-90` (comment only)

| Gate | Verdict | Evidence |
|---|---|---|
| 1 Demo impact | **PASS** (weakest pass in this document — see verdict) | The observable at risk is the route number reaching the wrist, the canonical Stage-2 observable a judge watches for |
| 2 Modal-specific | **FAIL** | An Anthropic API contract. Modal is only the host |
| 3 Risk | **PASS** | Comment-only. Zero runtime surface. Cannot alter behaviour by construction |
| 4 Time | **PASS** | ~10 minutes, no deploy required |
| 5 Necessity | **PASS** | The defect is **present-tense and verified**: `:89-90` says the Haiku swap is "one string, nothing else", and that is false today — `effort` is passed at `:603` **and** `:916`, and errors on `claude-haiku-4-5` at any level |

### 2B — The `_output_config()` helper (live code)

| Gate | Verdict | Evidence |
|---|---|---|
| 1 Demo impact | **FAIL** | For `CLAUDE_MODEL = "claude-opus-4-8"` the emitted dict is content-identical to the current literal at `:599-605`. Nothing a judge can observe changes |
| 2 Modal-specific | **FAIL** | Anthropic API surface |
| 3 Risk | **PASS** | Verified: the helper is behaviour-preserving on the Opus path, `Any` is already imported at `:55`, and `:927` gives a named startup canary |
| 4 Time | **PASS** | ~30 minutes including a deploy and one forced arrival |
| 5 Necessity | **FAIL** | 2A already de-arms the trap for free. Once the comment truthfully says "two edits", the helper protects against nothing 2A does not — while being the **only proposal in the shortlist that edits code executing on the currently-working Claude path** and requires redeploying a working service to do it |

### 3 — `gpu=["T4", "L4"]`

| Gate | Verdict | Evidence |
|---|---|---|
| 1 Demo impact | **FAIL** | The shortlist's own words: *"invisible when it works and invisible when it fires."* No judge observes a GPU fallback list |
| 2 Modal-specific | **PASS** | A genuine Modal platform feature, and one of only two gate-2 passes anywhere in this research |
| 3 Risk | **PASS**, with a caveat | T4 remains first preference. But the L4 path is **untested for this workload** (RR9), and whether Modal restores a CPU memory snapshot onto a different GPU type is unverified (RR6) |
| 4 Time | **PASS** | One token changed at `:843`, one deploy, one `/health` check |
| 5 Necessity | **FAIL** | Nothing is broken and T4 allocation has never failed here. `min_containers=1` (`:848`) means the T4 is **already held**, so the insured event requires an infra-initiated restart *and* simultaneous T4 exhaustion. Worse: installing the insurance requires a `modal deploy`, which forces exactly the re-allocation whose failure it insures against — a certain small risk to a working service to hedge an unmeasured tail |

### 4 — Modal endpoint metrics on a second screen

| Gate | Verdict | Evidence |
|---|---|---|
| 1 Demo impact | **FAIL** | It adds a panel; it does not improve the system. And File 01's residual risk 7 marks **UNVERIFIED** whether latency/QPS panels populate for a plain `@modal.asgi_app` POST endpoint — an "observable" that may render blank is not a material improvement |
| 2 Modal-specific | **PASS** | Literally Modal's own instrumentation |
| 3 Risk | **PASS** | Read-only dashboard, zero code, zero deploy |
| 4 Time | **PASS** | 5–10 minutes inside the rehearsal window |
| 5 Necessity | **FAIL** | Conceded by the shortlist itself: *"FAIL, explicitly. The demo is not broken in any way this fixes; it is narrative, not reliability."* Correct, and I apply the gate as it invites |

---

## Per-idea verdicts

### 1A — Step 1, the zero-code rehearsal diagnostic

> **CONDITIONALLY APPROVED.**

Passes gates 1, 3, 4 and 5; fails only gate 2. It is the single highest-value action in this
entire research programme, and it is free.

**Phase 4 decision: do not implement.** This is deliberate and it is not a downgrade. 1A is a
**human rehearsal action** — it requires the physical demo prop, a phone with camera permission
granted, and a person to read two numbers off a screen. An automated implementer cannot perform
it, and the failure mode of asking one to try is that it writes speculative code or, far worse,
reports a measurement it did not take. **Phase 4 must not attempt 1A and must not simulate its
result.**

**Instruction for the human running the demo, which must not be lost between phases:**

Before the demo, point the phone at the actual prop at 1.0–1.5 m with the capture page running and
read **three** fields, not the two the shortlist names:

1. The label chips drawn on the video overlay — `capture/page.tsx:129`.
2. `Confidence` on the debug screen — `page.tsx:104`. Note it renders `.toFixed(2)`, so a dead
   detector reads **`0.00`**, not `0.000` as the shortlist states.
3. **`Target bearing` — `page.tsx:111`.** The shortlist misses this and it is the *best* instrument
   for the question being asked: it is populated from
   `(m.detections ?? []).find((d) => d.target)?.bearing` (`capture/page.tsx:183`), so it is
   non-empty **if and only if** some box carries `target: true`. That is a direct, unambiguous read
   of "did the detector produce a target box at all", which is precisely the question.

If a target box appears at healthy confidence: **the question is closed and nothing below should be
built.** If it does not, escalate to a human decision — do not reach for 1B, which is rejected
below on evidence.

### 1B — Steps 2–5, the constants and vocabulary fix ladder

> **REJECTED.**

Fails gates 2, 3, 4 and 5. This is a fix for a behaviour nobody has ever observed, resting on a
mechanism its own authors mark unproven, validated by a diagnostic that is structurally blind to
that mechanism, against a competing-label set that my own re-derivation of `lvis.yaml` shows is not
closed. Step 3 additionally proposes moving `CONF_MIN`, the one constant whose mis-setting produces
an unrecoverable on-stage failure, on the strength of a hypothesis.

The Iron Law disposes of this in one line: **no fixes without root cause investigation first.** The
investigation has not been done, cannot be completed with the instruments available, and the
proposed intervention would not be confirmable as having worked even after a bake.

If 1A comes back showing no target box, that is a *new* root-cause investigation with real evidence
in hand — not a licence to execute this ladder. Nothing here should be pre-built against that
branch.

### 2A — Correct the false instruction at `:89-90`

> **CONDITIONALLY APPROVED — implement this.**

Passes gates 1, 3, 4 and 5; fails only gate 2.

I am explicit that gate 1 is the weakest pass in this document, and I pass it for a specific reason
that is worth stating so nobody mistakes it for generosity. **The defect being fixed is present
tense, not speculative.** It is not "someone might swap models" — that trigger is genuinely
unobserved. It is "**the repository contains a verified-false instruction, today**". `:89-90` states
the Haiku swap is "one string, nothing else"; `effort` is passed at two sites (`:603`, `:916`) and
errors on `claude-haiku-4-5` at any level. That falsehood exists right now, in the file, and the
change removes it.

This is the distinction that separates 2A from the shortlist's own R16, which correctly rejects four
other comment fixes on gate 5. Those are **descriptive** inaccuracies — a wrong rationale, a stale
softmax argument. `:89-90` is a **prescriptive instruction** that causes a total, silent, permanent
Stage 2 failure if followed. I traced the failure chain myself and it is exactly as described: three
400s, `return_exceptions=True` at `:647` collapses them, `kept` is empty, `reading` stays `None` at
`:682`, the UNREADABLE path at `:697-702` runs, and on stage BUS ARRIVING fires normally while the
route never arrives, for every arrival, diagnosable only in Modal logs. The asymmetry is decisive:
a comment-only edit has bounded-at-zero runtime risk against an unbounded, unrecoverable failure.

**Two binding conditions on this approval.**

1. **Reference the call sites by function name, not by line number.** The shortlist's proposed
   replacement text cites `:603` and `:916` — but it expands a 2-line comment to ~9 lines, shifting
   every line below it by +7. The new comment's own line references would be **wrong the moment it
   is written**. Refer to `_one_vote` and `_prime_schema` instead; those names are stable.
2. **Comment only. Do not touch `output_config` at either call site.** Any edit that reaches
   `:599-605` or `:915-918` is item 2B, which is rejected.

### 2B — The `_output_config()` helper

> **REJECTED.**

Fails gates 1, 2 and 5. The code is correct — I checked it, including that `Any` is imported at
`:55` — and gate 3 genuinely passes. That is not enough. Once 2A makes the comment true, 2B protects
against nothing 2A does not, and it is the only surviving proposal that modifies code on the live
Claude path and requires redeploying a working service to install it. Marginal benefit nil, marginal
risk nonzero, on a day when the demo may be imminent. Do not implement.

### 3 — `gpu=["T4", "L4"]`

> **REJECTED.**

Fails gates 1 and 5. Gate 2 passes and it is genuinely the only *feature* in this research that
does — which is precisely the tension worth naming rather than papering over. Insurance against an
unmeasured, low-probability tail event, whose payout path (the service running on an L4) has never
been tested, purchased at the cost of a deploy that itself forces a fresh container allocation on a
service currently holding a T4 it does not need to re-request. When genuinely torn, reject. I am
not especially torn.

### 4 — Modal endpoint metrics on a second screen

> **REJECTED.**

Fails gates 1 and 5. The shortlist rejects it on gate 5 in its own text and invites the reviewer to
do the same; I do. It is narrative, not reliability, and File 01's residual risk 7 leaves it
unverified whether the panels populate for this endpoint type at all — so it is narrative that
might be a blank screen. Also, like 1A, it is not implementable by an automated phase: it is
"open a dashboard". Phase 4 must not attempt it.

---

## Total count

> **APPROVED: 0**
>
> **CONDITIONALLY APPROVED: 2** — items **1A** and **2A**.
>
> Of the two conditionally approved, exactly **one** carries "implement this": **2A**. Item 1A is
> explicitly marked **do not implement** as a Phase 4 action, because it is a human rehearsal
> measurement, not a code change.
>
> **REJECTED: 4** — items 1B, 2B, 3 and 4.

**Net instruction to Phase 4: make exactly one change — the comment at `vision/service.py:89-90`,
per item 2A and its two binding conditions. Change nothing else.**

---

## Conclusion

Two items clear the bar, so the all-rejected conclusion this phase was permitted to reach does not
apply and its trigger phrase is deliberately not written anywhere in this document. But the margin
is thin enough that the honest headline is close to it: **the total sanctioned engineering output
of this research programme is one corrected comment.**

The shortlist's own headline finding is correct and this review confirms it from an adversarial
direction: **the Modal-distinctive and the useful are nearly disjoint sets in this codebase.** Of
six graded items, exactly two pass gate 2 (items 3 and 4) and both fail gate 5. Of the two that
clear the bar, neither passes gate 2. That is not a research failure. It is the correct answer to
the question that was asked, and the shortlist deserves credit for reaching it without manufacturing
a Modal-flavoured change to satisfy a rubric.

The reason is structural and already in the code. `min_containers=1` at `:848` with
`scaledown_window=1200` at `:849` removed cold starts by design, which is the only Modal-platform
problem this workload has. The forward pass is ~20 ms of a ~1380 ms Stage 1 budget
(`plan:747-761`) — 1.4%, and the dominant hops are network, the deliberate 2-frame debounce, and
the capture tick, none of which any surviving idea touches. Everything remaining on Modal's feature
menu addresses a problem this service does not have.

**The strongest Modal claim available on stage is not a feature at all — it is that
`min_containers=1` removed cold starts by design. That is already true, already shipped, and
requires no further work.** Say that.

And a note on what this verdict is protecting. The service is deployed, unmodified from `HEAD`, and
has no test suite: deploy plus manual smoke is the entirety of its validation. In that situation the
cost of breaking it exceeds the benefit of any marginal improvement on this list. Four of six items
are rejected primarily because they ask to spend that risk on hypotheses.

---

## What I could not verify

Ordered by how much a resolution would change this verdict.

**U1 — The `multi_label` default in the installed ultralytics NMS.** `ultralytics` is absent from
`.venv` (confirmed) and was unreadable to both Phase 1 and Phase 2. **This does not change the
verdict on 1B**, because the dilemma above defeats it in both branches — but it is the single fact
that would let anyone reason about the depiction hypothesis at all. Settled by
`python -c "import inspect, ultralytics.utils.ops as o; print(inspect.signature(o.non_max_suppression))"`
inside a running container, or by reading `ultralytics/models/yolo/detect/predict.py`.

**U2 — That `output_config.effort` errors on `claude-haiku-4-5`.** Taken on trust as a
settled fact; no Haiku request was issued from this session. This is the sole factual basis for item
2A. Settled by one `curl` to the Messages API with `claude-haiku-4-5` and `output_config.effort`
set. If it turns out to be wrong, 2A becomes a harmless no-op comment edit, so the downside of
trusting it is nil.

**U3 — Bake duration and `.run_function` layer invalidation.** Unmeasured by anyone (RR3, RR4). It
is load-bearing for 1B's gate-4 failure, but 1B fails three other gates, so resolving it would not
revive the item.

**U4 — Whether Modal's endpoint metrics populate for a plain `@modal.asgi_app` POST endpoint.**
Unverified by File 01 and by me. Contributes to item 4's gate-1 failure; item 4 fails gate 5
independently.

**U5 — Whether Modal restores a CPU memory snapshot onto a different GPU type in a fallback list**
(RR6), and whether `yolov8s-worldv2` runs correctly on an L4 (RR9). Both bear on item 3, which fails
gates 1 and 5 regardless.

**U6 — Runtime behaviour of anything.** No container was deployed, no request was timed, no frame was
captured, in Phase 1, Phase 2, or this phase. Every verdict here is a code-and-documentation verdict.

---

## Findings the shortlist missed

Recorded because they were found while verifying it, not because any of them warrants action.

1. **A fifth comment defect, not in R16.** `:136-137` states *"`agnostic_nms` collapses them to the
   single best box"* — directly contradicted by `_dedupe_for_display`'s docstring at `:760-765`
   (which says agnostic NMS was tried and rejected for exactly that behaviour) and by `:974-977`.
   `agnostic_nms` is not passed at `:978-984`. Same disposition as R16: correct criticism, zero demo
   impact, fails gate 5. **Do not spend a task on it.**
2. **`vision/client.py` is outside the shortlist's stated scope.** A 26 KB OpenCV terminal client
   that POSTs to `/ingest` and to `/api/event`. It does not disturb the settled `@modal.concurrent`
   finding — its own docstring says *"Run one capture source at a time"*, and the plan explicitly
   cuts it — but the shortlist reviewed `vision/service.py` as though it were the directory. Note
   the plan calls this file `vision/bus_client.py`; the file on disk is `vision/client.py`, so the
   plan's own reference is stale.
3. **A better instrument for Idea 1A than either the shortlist names**: `page.tsx:111`
   `Target bearing`, populated from `capture/page.tsx:183`, which is non-empty iff a box carries
   `target: true`. Folded into the 1A instruction above.
4. **The `:89-90` comment expansion would invalidate its own line references.** Flagged as binding
   condition 1 on item 2A.
5. **Minor imprecision in the shortlist's diagnostic table**: it predicts `Confidence` reads
   `0.000`; `page.tsx:104` renders `.toFixed(2)`, so it reads `0.00`. Also, the shortlist summarises
   `_lvis_labels()` as *"splits on `/` and keeps the first synonym (`:198-201`)"* — the code at
   `:200-201` takes the **last** synonym on a first-synonym collision. Its verification table handles
   collisions correctly, so this is shorthand rather than an error, but the shorthand is embedded in
   a code comment the shortlist proposes shipping.

---

## Residual risk

Including, as required, the risk that this verdict is wrong in each direction.

**RR-A — Risk that I killed something worth doing.**

The exposure is concentrated in **item 1B** and, secondarily, **item 3**.

If the demo prop genuinely does not read as a bus, and the cause genuinely is argmax shadowing by
one of the seven labels, then I have rejected the fix. My defence is that this conjunction is
unevidenced at every link, that dropping the seven leaves at least twelve equally-plausible
competitors (measured, not assumed), and that a bake spent on a wrong hypothesis is time removed
from a demo day. **But if 1A comes back showing no target box, this verdict should be reopened by a
human with the measurement in hand** — that is a different decision made on different evidence, and
nothing here forecloses it.

For item 3, if Modal exhausts T4 capacity during an infra-initiated restart in the demo window, one
rejected line would have saved the demo. I judge that conjunction less likely than the harm of an
unnecessary deploy on demo day, but I hold that view with less confidence than any other verdict
here, and it is the one I would most expect a reasonable reviewer to overturn.

**RR-B — Risk that I approved something that breaks the demo.**

Structurally near zero. The single sanctioned change (2A) is a comment. Python cannot execute it.
The only mechanism by which it could break anything is a malformed edit corrupting surrounding
code — which is why condition 2 restricts it to `:89-90` and forbids touching `:599-605` and
`:915-918`. If Phase 4 respects that boundary, the deployed service's behaviour is provably
unchanged.

The residual risk is **not** technical but procedural: item 1A is conditionally approved yet marked
do-not-implement, and a phase that reads only verdict labels could either skip the rehearsal
entirely or, far worse, produce a fabricated measurement. **The mitigation is that no code change
anywhere in this document is contingent on 1A's result** — 2A ships regardless, and 1B is rejected
regardless. 1A informs a human decision only. If it never runs, nothing in the codebase is wrong;
the demo team simply goes on stage without having checked something they should have checked.

**RR-C — Risk in the verdict's foundations.** Every conclusion rests on static reading of code and
documentation. If the deployed service differs from `vision/service.py` at `HEAD` — a `modal deploy`
from an uncommitted working tree, for instance — parts of this analysis address a file that is not
running. `git diff --stat HEAD -- vision/service.py` is empty and `git status` shows the file
untracked-clean, so the repository is consistent; whether the *deployment* matches the repository
was not checked and cannot be from here.
