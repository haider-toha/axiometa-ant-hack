# 06 — Implementation

## Scope

Phase 4 of the Modal vision research workstream. Implements the **single** change authorised by
`05-adversarial-verdict.md`, and nothing else.

The verdict returned **0 APPROVED, 2 CONDITIONALLY APPROVED**, of which exactly one carries the
gate phrase "implement this":

| Item | Verdict | Action taken |
|---|---|---|
| 1A — zero-code rehearsal diagnostic | CONDITIONALLY APPROVED, *do not implement* | Not implemented (it is a human action, not a code change) |
| 1B — constants + vocabulary fix ladder | REJECTED (gates 2, 3, 4, 5) | Not implemented |
| **2A — correct the false instruction at the `CLAUDE_MODEL` swap comment** | **CONDITIONALLY APPROVED — "implement this"** | **Implemented** |
| 2B — `_output_config()` helper | REJECTED (gates 1, 2, 5) | Not implemented |
| 3 — `gpu=["T4","L4"]` | REJECTED (gates 1, 5) | Not implemented |
| 4 — Modal metrics on a second screen | REJECTED (gates 1, 5) | Not implemented |

Gate phrase verified before acting: `grep -n -i "implement this" 05-adversarial-verdict.md` returns
line 262 (`> **CONDITIONALLY APPROVED — implement this.**`, item 2A) and line 331 (confirming exactly
one item carries it). `NOTHING CLEARS THE BAR` is **absent** from the verdict, so Phase 4 was
authorised — for one change.

## What changed

One comment block, immediately below `CLAUDE_MODEL` in `vision/service.py`. **No code.**

The removed text claimed the Haiku fallback was **"one string, nothing else"**. That is false:
`output_config.effort` is rejected by `claude-haiku-4-5` and is passed in *two* functions, so
following the instruction produces three 400s per arrival.

The replacement states that it is not one string, names the two functions that must also change,
and describes the silent failure signature. Both of the reviewer's binding conditions were honoured:

1. **Call sites referenced by function name (`_one_vote`, `_prime_schema`), never by line number.**
   The reviewer caught that the shortlist's proposed replacement cited `:603`/`:916` while itself
   expanding the comment by ~7 lines — those references would have been wrong the moment they were
   written. Function names cannot rot this way.
2. **Comment only.** `output_config` was not touched at either call site.

### Why it is safe — the three-sentence note

The change adds sixteen lines of comment below `CLAUDE_MODEL` and alters no executable statement,
which is proven rather than asserted: the Python AST of the file is byte-identical before and after,
and comments do not appear in an AST. No constant moved — `CLAUDE_MODEL`, `CONF_MIN`,
`DRAW_CONF_MIN`, `HITS_TO_ARRIVE`, `MISSES_TO_CLEAR`, `VOTE_ROUNDS` and `VOTES_NEEDED` all hold
their prior values — so Contract A's response shape, the `det:*` Redis key schema and the `/ingest`
endpoint are untouched by construction. The only behaviour that changed is what a human reads at
3 a.m. when the stage feels laggy.

## Verification and evidence

Baseline for every check is **`a45bc87`**, the commit immediately preceding this change.

```
baseline = a45bc87 (pre-edit)
lines: 1121 -> 1137  (+16)

AST identical to pre-edit: YES — change is provably comment-only

baseline still had the false claim: True
current still has the false claim:  False

  CLAUDE_MODEL     "claude-opus-4-8"      == "claude-opus-4-8"
  CONF_MIN         0.35                   == 0.35
  DRAW_CONF_MIN    0.20                   == 0.20
  HITS_TO_ARRIVE   2                      == 2
  MISSES_TO_CLEAR  4                      == 4
  VOTE_ROUNDS      3                      == 3
  VOTES_NEEDED     2                      == 2

=== code (non-comment) lines in diff vs pre-edit ===
(none — every changed line is a comment)
```

Method: parse both revisions with `ast.parse`, compare `ast.dump(..., include_attributes=False)`.
Comments are absent from a Python AST, so an identical dump across a revision that changed the file
is a positive proof of a comment-only edit — strictly stronger than eyeballing a diff.

### A failed verification, reported

**The first verification run was invalid and its result must not be relied on.** It compared the
working tree against `HEAD` and reported "AST identical to HEAD". That check was vacuous: the edit
had already been committed as `c236879 docs(vision): warn that Haiku rejects output_config.effort`,
so `HEAD` *was* the edited file and the comparison was the file against itself.

It was caught by an arithmetic inconsistency rather than by the check itself — the script reported
1137 lines both before and after an edit that added 16 lines, and `git status` reported a clean tree
including the loss of an untracked file present in the session-start snapshot. Re-running against
`a45bc87` produced the sound result above.

Two things follow. First, the session-start git snapshot was stale: the branch has moved through
several commits (`cb7b4ee`, `3d3df4d`, `422cd89`, `a45bc87`) that are not in it, so this workstream
was not operating on the tree it was briefed on. Second, **edits in this repository are being
auto-committed** — this change was committed without an explicit commit having been requested or
run by the workstream. Anyone auditing this file should be aware that "the working tree is clean" is
not evidence that nothing was changed here.

## Deployment: DEPLOYED AND SMOKE-TESTED

Deployed on explicit human instruction. Pre-flight confirmed `modal` CLI 1.5.2, profile
`mohammedhaidertoha`, and both required secrets (`anthropic`, `upstash`) present and last used
17:45→20:59 BST the same day — i.e. the service was already live.

```
$ modal deploy vision/service.py
✓ Created objects.
├── 🔨 Created mount .../vision/service.py
├── 🔨 Created function _bake_detector.
├── 🔨 Created function VisionService.*.
└── 🔨 Created Web Function URL for VisionService.web =>
    https://mohammedhaidertoha--bus-vision.modal.run
✓ App deployed in 5.473s! 🎉
EXIT=0
```

**The rebuild risk did not materialise, and this settles a question flagged UNVERIFIED earlier in
this document.** The deploy completed in **5.473 s**, which is only possible if the image layer
cache held — a comment-only change to the module source did **not** invalidate
`.run_function(_bake_detector)`, so CLIP was not re-downloaded and the 1205 class embeddings were
not re-encoded. Recorded because the earlier caution ("whether it does is UNVERIFIED") was
reasonable *a priori* and is now answered with evidence: for a comment-only edit, it does not.

`vision/requirements.txt` was not modified; no dependency changed.

### Smoke test

Sent against the deployed URL above. **One** frame, `force: false`, deliberately non-bus-like
synthetic content — chosen so nothing latches: `force: true` would have fired `TARGET_ARRIVED`,
spawned three billable Claude OCR calls, and incremented the shared `det:arrival_id`.

```
GET  /health -> 200 {"ok":true}   (521 ms)
POST /ingest -> 200               (790 ms round trip, 7 kB frame)
```

Response body, verbatim:

```json
{
  "event": "NONE",
  "present": false,
  "confidence": 0.0,
  "arrival_id": 0,
  "reading": null,
  "reading_ready": false,
  "votes": [],
  "hazards": [],
  "detections": [],
  "session_id": "smoke-audit-phase4"
}
```

Contract A validation — every field checked for presence **and** type:

| Field | Class | Result | Value |
|---|---|---|---|
| `event` | locked | PASS | `'NONE'` (legal member of NONE/TARGET_ARRIVED/TARGET_GONE) |
| `present` | locked | PASS | `False` |
| `confidence` | locked | PASS | `0.0` |
| `arrival_id` | locked | PASS | `0` |
| `reading` | locked | PASS | `None` |
| `reading_ready` | locked | PASS | `False` |
| `votes` | locked | PASS | `[]` |
| `hazards` | addition | PASS | `[]` |
| `detections` | addition | PASS | `[]` |
| `session_id` | addition | PASS | `'smoke-audit-phase4'` (echoed correctly) |

**CONTRACT A: INTACT.** The seven locked fields and three additions are all present with correct
types, so the capture page's parser and the debug screen are unaffected.

Two incidental readings worth recording:

- `arrival_id: 0` means the arrival state machine held no prior state — the `det:*` keys had aged
  out under `STATE_TTL_S` (15 min). The smoke test therefore did not disturb a live arrival. It did
  increment `det:misses` by one, which is harmless and TTLs out; `MISSES_TO_CLEAR` is 4.
- `detections: []` on a synthetic frame confirms nothing spurious cleared `DRAW_CONF_MIN = 0.20`.

The 790 ms round trip is **not** comparable to the plan's Stage 1 hop budget and should not be read
as contradicting it: it is a cold TLS connection from a laptop on a different network, and it
measures transport plus inference together rather than isolating hop 4. It does not decompose, so
it neither confirms nor refutes Track 2's caveat that the 10–30 ms forward-pass figure may be
optimistic.

## Web sources cited

This phase introduced no new research. The one external fact it depends on was established in
`03-current-service-bottlenecks.md` (orchestrator addendum) and re-verified independently by Phase 3:

- **`output_config.effort` is rejected by `claude-haiku-4-5`** — supported on Opus 4.5+ tiers only;
  the level is irrelevant, `"low"` errors too. Source: the vendor Claude API model-capability
  reference (*Thinking & Effort* table), consulted via the `claude-api` skill.
- **`output_config.format` / `json_schema` is supported on both `claude-opus-4-8` and
  `claude-haiku-4-5`.** Source: same reference, structured-outputs supported-models list. This is
  why dropping `effort` is the correct fix rather than a workaround — the schema half survives.

## Residual risk

- **The fix is documentation, not enforcement.** Nothing prevents someone from uncommenting the
  Haiku line and ignoring the comment. The reviewer rejected the code-level guard (item 2B) on gates
  1, 2 and 5; that rejection stands, but it means the trap is de-armed only for a reader who reads.
- **The underlying trigger remains unobserved.** Nobody has reported the stage feeling laggy, so the
  probability of the Haiku swap being attempted is unknown. Gate 5 was passed on the grounds that
  the *false statement* is present-tense, not that the *swap* is likely.
- **The prop/vocabulary question is unresolved and was deliberately not acted on.** Item 1B was
  rejected because the mechanism is unproven and — per the reviewer's dilemma — the proposed
  diagnostic is structurally blind to it under either branch of `multi_label`. The open question
  survives this workstream: point the camera at the real prop and read the confidence chips. That
  remains the highest-value next action and it requires no code.
- **Source and deployment are now in sync.** Resolved by the deploy above; noted because it was an
  open item before it.
- **The smoke test proves the contract, not the detector.** A synthetic non-bus frame exercises
  decode → forward pass → Lua state machine → Redis read-back → Contract A serialisation, and all of
  that is now known-good. It says nothing about whether a real bus, or the A3 prop, produces a
  target box above `CONF_MIN` — which remains the open question below.
- **Auto-commit behaviour was discovered, not designed around.** If it is a hook, other agents and
  workstreams in this repository are also having edits committed without asking, which affects how
  much "clean tree" can be trusted as a safety signal anywhere in this repo.
