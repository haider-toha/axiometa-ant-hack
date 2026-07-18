# 06 — Phase 2 Track B: `vision/bus_client.py` (laptop rehearsal harness)

**Author:** Phase 2 Track B (implementation)
**Date written:** 2026-07-18
**Files created:** `vision/bus_client.py`, this file. Nothing else was created, modified or deleted.
**No web research was performed.** Every decision below traces to
`audit/bus-stop-situational-awareness/05-research-and-spec.md` or
`plan/2026-07-18-bus-stop-situational-awareness.md`. Where those were silent, the ambiguity and the choice
made are recorded in §5.

---

## 1. Scope — read this first

> **`vision/bus_client.py` is NOT the demo capture path.**

The plan **CUT this file**. Two places say so and they are not in tension:

| Where | What it says |
|---|---|
| `plan/…md:30` (§Revision 2026-07-18b §2) | *"`vision/bus_client.py` is **cut**"* — capture moved to an in-browser `getUserMedia` page in `app/`, reversing [T4 §Decision 1] |
| `plan/…md:176` (Asset Inventory → Vision) | ~~`vision/bus_client.py`~~ · **CUT (Revision §2)** — laptop capture replaced by the in-browser `getUserMedia` page in `app/` |
| `plan/…md:689` (§Camera and transport) | *"The laptop `cv2.VideoCapture` client (`vision/bus_client.py`) is cut."* |

It has been rebuilt anyway, deliberately, with a **changed role**:

> This client is a **DEVELOPER / REHEARSAL HARNESS**, not the demo capture path. Its job is to exercise and
> smoke-test the Modal endpoint from a laptop without wrestling iOS Safari camera permissions. **The mobile
> browser page (`app/app/capture/page.tsx`) remains the demo path.**

Concretely, this file exists to answer questions like *"is `/ingest` up, does the Lua latch fire, does
`reading_ready` ever go true with a null reading, does `/api/event` accept our body"* — from a laptop, at a
desk, before anyone points a phone at anything. It must never be described on stage, in the README, or in a
demo script as how frames are captured.

That framing is repeated verbatim in the module docstring at the top of `vision/bus_client.py:1-16`, so it
cannot be lost by someone who opens the file without reading this audit.

**Cross-track hazard — the two capture sources fight.** The Redis arrival keys are global (`bus:hits`,
`bus:misses`, `bus:present`, `bus:arrival_id`), not session-scoped — spec §(d), and spec §(g) risk 4 records
this as deliberate. **Running this harness and the phone page at the same time means two capture sources
share one arrival latch and both POST to `/api/event`.** Run exactly one at a time. This is the single most
likely way this file causes a problem it would not otherwise cause.

---

## 2. What was built

`vision/bus_client.py` — single file, 687 lines, stdlib + `opencv-python`.

| Requirement | Where |
|---|---|
| 2 fps capture loop, `cv2.VideoCapture(0)` | `PERIOD_S = 1.0 / CAPTURE_FPS`; deadline-based pacing so processing time is absorbed, with a re-baseline if the loop falls more than one period behind |
| 1280×720, JPEG quality 85 | `cv2.imencode(".jpg", frame, [IMWRITE_JPEG_QUALITY, 85])`; the frame is `cv2.resize`d to exactly 1280×720 when the webcam ignores the advisory `CAP_PROP_FRAME_*` hints |
| POST to `$MODAL_URL`, parse per spec §(c) | `post_json()` + `DetectorFrame.from_json()` — every field of `IngestResponse` including the two additions |
| `session_id` once per process | `f"laptop-{uuid.uuid4().hex[:12]}"` (19 chars, inside the spec's `min_length=1, max_length=64`). The `laptop-` prefix makes harness traffic obvious in Redis |
| `hazards` handled | Parsed into `Hazard`, counted in the status line, top hazard by confidence shown as `[person@left 0.72]` |
| Edge-trigger on `/api/event` | `EventRequest` is a frozen dataclass, so `==` **is** the edge trigger; `last_sent` is only advanced after a POST the relay accepted |
| Contract B body shape | `EventRequest.body()` writes the five keys out literally, in Contract B order, so it can be eye-diffed against `plan/…md:276-282` |
| SPACE → `force=True` next frame | `KeyReader` reads the OpenCV preview window, falling back to a POSIX cbreak terminal |
| One-line status per frame | fps / latency / event / present / confidence / arrival_id / reading_ready / hazards / pattern-sent |
| Graceful Ctrl-C | `try/except KeyboardInterrupt` + `finally` that releases the capture device, destroys windows, and restores termios |
| Hardcoded route/dest, no knobs | `DEMO_ROUTE = "88"`, `DEMO_DEST = "Clapham Common"`. No CLI, no flags, no config file. The only env inputs are two deployment addresses |
| Network failures never kill the loop | `post_json()` cannot raise — DNS, TLS, timeout, HTTP 4xx/5xx and non-JSON bodies all return as strings. Camera read failures, encode failures and window failures are all survivable too |

**HTTP is stdlib `urllib`, not `requests`, on purpose** — see §6. It means `opencv-python` is the *only* thing
anyone has to install.

### Status line

```
f#0042  2.0fps  187ms  ev=BUS_ARRIVED  pres=1 conf=0.83 aid=1 rdy=0 haz=1  sent=BUS>WAIT  [person@left 0.72]
f#0043  2.0fps    --ms ev=?            pres=- conf=---- aid=- rdy=- haz=-  sent=-   ! HTTPError: timed out
```

`sent=-` means the edge trigger suppressed the post. `sent=BUS>WAIT` means two events went out on one frame
(§3). `sent=NUMBER(dry)` means `VERCEL_URL` is unset and the body was printed instead of posted.

---

## 3. The exact Contract B state-machine mapping implemented

### 3a. The level function — `steady_state(frame) -> EventRequest`

Pure, no I/O, no globals. This is the part worth reasoning about, so it is isolated and separately testable.

```
not present                                        ->  NONE     route=""  dest=""            conf=""
present, not reading_ready                         ->  WAIT     route=""  dest=""            conf=""
present, reading_ready, reading is None            ->  UNKNOWN  route=""  dest=""            conf=""
present, reading_ready, confidence != "high"       ->  UNKNOWN  route=""  dest=""            conf=""
present, reading_ready, high but route == ""       ->  UNKNOWN  route=""  dest=""            conf=""
present, reading_ready, high, route non-empty      ->  NUMBER   route=<verbatim>
                                                                dest=<destination or DEMO_DEST>
                                                                conf="high"
```

`arrivalId` is always the detector's `arrival_id` for that frame.

**`present` is tested before `reading_ready`, and the ordering is load-bearing.** `bus:reading_for` carries a
900 s TTL (spec §(d)) and therefore *outlives the arrival*. Testing `reading_ready` first would pin the device
to `NUMBER` for fifteen minutes after the bus left. Verified: `present=False, reading_ready=True` → `NONE`.

### 3b. The edge — BUS

`BUS_ARRIVED` is an **edge**, not a level. It is emitted once, ahead of the level derived from the same frame:

```
if frame.event == "BUS_ARRIVED":  emit BUS(arrival_id)   # then fall through
emit steady_state(frame)                                 # normally WAIT
```

This is what reproduces the plan's `t=0.00 BUS` → `t=0.10 WAIT` (plan:323-329) — those two are 100 ms apart,
which is one sequential HTTP round trip, *not* one 500 ms capture period. Deriving WAIT from the next frame
instead would still work but would not match the locked timing (§5 ambiguity A1).

### 3c. The drain — edges first, then the level, retry on failure

```
sent = []
while pending_edges and not blocked:
    ev = pending_edges[0]
    if ev == last_sent:          pending_edges.pop(0); continue     # suppressed
    if post(ev):                 last_sent = ev; sent += ev; pending_edges.pop(0)
    else:                        blocked = True                     # retry next frame

if not blocked and level != last_sent and post(level):
    last_sent = level; sent += level
```

Three properties this buys, each of which was a real failure mode:

1. **`last_sent` advances only on an accepted POST.** A dropped packet is retried on the next frame instead of
   being silently lost. Plan:255 warns that re-posting an *unchanged* state re-fires the haptic; the
   complementary bug — a *changed* state that never arrives — is what this guards.
2. **A failed edge blocks the level behind it.** If the BUS post fails, WAIT is not sent in its place. Without
   this, the BUS pulse would be lost forever: Modal reports `BUS_ARRIVED` exactly once per arrival (the Lua
   latch), so there is no second chance to derive it. `pending_edges` persists across frames for the same
   reason.
3. **Ordering is preserved under failure.** The device still receives BUS → WAIT → NUMBER in order, just later.

`pending_edges` is deduplicated by `arrival_id` and capped at `MAX_PENDING_EDGES = 8`.

### 3d. ERROR

`ERROR` is in the `CloudPattern` enum but the plan never says who emits it or when. Emitted here after
`MODAL_FAILS_TO_ERROR = 3` consecutive Modal failures (1.5 s at 2 fps) — long enough to ride out one dropped
packet, short enough to be visible. Edge-triggered like everything else, so it posts once. When Modal recovers,
the normal mapping resumes and the edge trigger delivers the new state.

### 3e. Verified against the locked demo

The pure logic was exercised with `cv2` stubbed (no webcam required). Feeding the seven-frame trace from
Contract A's frame-by-frame walk (plan:234-251) produces exactly the locked sequence (plan:320-334):

```
frame 0: (suppressed)
frame 1: (suppressed)
frame 2: [{"pattern":"BUS",   "route":"",  "dest":"",              "conf":"",     "arrivalId":1},
          {"pattern":"WAIT",  "route":"",  "dest":"",              "conf":"",     "arrivalId":1}]
frame 3: (suppressed)
frame 4: [{"pattern":"NUMBER","route":"88","dest":"Clapham Common","conf":"high", "arrivalId":1}]
frame 5: (suppressed)
frame 6: [{"pattern":"NONE",  "route":"",  "dest":"",              "conf":"",     "arrivalId":1}]
```

Key names and order confirmed as `["pattern", "route", "dest", "conf", "arrivalId"]`. Frames 3 and 5 being
suppressed is the edge trigger doing its job — those frames carry the same meaning as their predecessor.

---

## 4. Contract A wire shapes

**Request** (spec §(c) `IngestRequest`):

```json
{"frame_b64": "/9j/4AAQ…", "session_id": "laptop-a1b2c3d4e5f6", "force": false}
```

Bare base64, not a data URL. The spec's validator accepts both (`_strip_data_url`); bare is what the plan's
Contract A example shows and is 37 % smaller than a data URL prefix would make it. `force` is `true` on
exactly the frame after SPACE.

**Response** — all nine fields of `IngestResponse` are parsed, including `hazards` and `session_id`. Parsing is
defensive by design: unknown `event` strings coerce to `"NONE"`, non-numeric confidences to `0.0`, non-dict
hazard entries are skipped, and a completely malformed body yields an all-defaults frame rather than an
exception. A half-deployed endpoint must degrade, not take the loop down.

Two trip-wires from the spec are wired to a one-shot warning:

- **`reading_ready` true with `reading` null** — spec §(g) risk 8. This means the OCR worker wrote
  `bus:reading_for` before `bus:reading`, inverting the payload-before-signal ordering that spec §(d) inherits
  from `app/app/lib/redis.ts:27-29`. The warning names the keys so the fix is obvious.
- **`session_id` echo mismatch** — would indicate hazards being written to the wrong Redis key.

---

## 5. Spec ambiguities and the choices made

Every one of these was resolved by picking the safest option and implementing it, per the Track B brief.

| # | Ambiguity | Choice | Why it is the safe one | To reverse |
|---|---|---|---|---|
| **A1** | The locked demo shows BUS at t=0.00 and WAIT at t=0.10 — 100 ms apart — but the capture loop runs at 500 ms. Same frame or next frame? | **Same frame**, emitted back-to-back as two sequential POSTs | Reproduces the locked timing exactly, and guarantees WAIT is delivered even if the next frame's response differs or never arrives | Drop the `pending_edges` pre-emit; WAIT then lands on frame N+1 |
| **A2** | Should the client apply `ROUTE_RE` and downgrade a letter route to UNKNOWN? | **No.** Route is passed **verbatim**; `/api/event` owns `ROUTE_RE` | plan:565 assigns the check to the relay and spec §(f) says *"Do not filter it twice — a route silently dropped in Modal is invisible on the debug screen"*. Filtering here would recreate exactly that blindness one hop further along | — |
| **A3** | Related: is an **empty** route also the relay's problem? | **No** — empty route → UNKNOWN, client-side | This is a self-consistency guard, not a filter. `NUMBER` with `route: ""` contradicts Contract B (*"`""` unless pattern === NUMBER"*) and hands the quinary encoder nothing to encode | — |
| **A4** | `dest`: Claude's `destination`, or the hardcoded `"Clapham Common"`? | **Claude's, with `DEMO_DEST` as fallback when empty.** Route is *never* substituted | `dest` is debug-screen-only (plan:279), so showing what was actually read is the point and a fallback is harmless. `route` drives the wrist, and a fabricated route number is the single worst output this device can produce (spec §(a) Q4e) — the asymmetry is deliberate | — |
| **A5** | What should be posted at startup when nothing is happening? | **Nothing.** `last_sent` is pre-seeded with the idle `NONE` state | The literal reading of *"only POST when the state actually CHANGES"* — at startup nothing has changed. Also avoids a harness burning a `seq` on a device that may be mid-pattern | `last_sent = None` at init (one line) |
| **A6** | What `conf` accompanies `UNKNOWN`? | **`""`** | `UNKNOWN` already means *"could not read / low confidence"* (plan:269), so `conf` adds nothing; `""` is the in-enum not-applicable value | — |
| **A7** | Who emits `ERROR`, and when? Never specified. | **After 3 consecutive Modal failures** (1.5 s) | Long enough to ride out one dropped packet; short enough that a dead detector does not leave the device sitting on a stale `NUMBER` | Change `MODAL_FAILS_TO_ERROR` |
| **A8** | Is `VERCEL_URL` required? | **No** — unset means dry run: bodies are printed, `last_sent` still advances | The file's stated job is *exercising the Modal endpoint*. Requiring a relay to smoke-test the detector would defeat it. `MODAL_URL` **is** required (exit 2) | — |
| **A9** | Is `force` consumed on attempt or on success? | **On attempt** | A queued force fires an extra arrival on some later frame. On stage, "press SPACE again" beats "an unexplained second BUS buzz" | — |
| **A10** | Webcam refuses 1280×720. | **`cv2.resize` to exactly 1280×720** | Spec Deviation 6 means the server derives frame thirds from the *decoded* size and does not care — but the documented wire shape (*"~120 kB base64 of a 1280×720 q85 JPEG"*) is kept true, so a payload-size surprise is one fewer thing to debug | — |
| **A11** | `MODAL_URL` with or without `/ingest`? Spec §(f) says the value is the deploy URL *plus* `/ingest`. | **A bare origin gets `/ingest` appended; any other path is respected verbatim** | Forgiving about the likely mistake without overriding a deliberate path | — |
| **A12** | `VERCEL_URL` scheme — Vercel's own convention is a bare host | **`https://` prepended when absent**; a value already ending `/api/event` is not doubled | — | — |
| **A13** | How is SPACE read with no GUI? | OpenCV preview window primary; **POSIX `tty.setcbreak` fallback**; disabled with a printed warning if neither works | `opencv-python-headless` has no `imshow`. **cbreak not raw** — cbreak leaves `ISIG` enabled so Ctrl-C still raises `KeyboardInterrupt`. termios state is restored in the `finally`, or the operator is left with a terminal that does not echo | — |
| **A14** | `/api/event` response shape — the route does not exist yet | **Any 2xx counts as success; the body is ignored** (`parse_response=False`) | `/api/push` returns `{seq}`, so `/api/event` probably will too — but a `204` or a plain-text body must not look like a failure and be retried forever | — |

---

## 6. The `opencv-python` dependency I could not add

**`vision/requirements.txt` is owned by a parallel agent and was not touched.** The Track B brief forbids it
explicitly. Recording the dependency here instead, for the orchestrator to reconcile:

```
opencv-python        # vision/bus_client.py ONLY — the laptop rehearsal harness.
                     # NOT needed by vision/bus_vision.py (Modal), which gets
                     # cv2 transitively from ultralytics inside the Modal image.
```

Three things the orchestrator should weigh before adding it:

1. **It does not belong in the file as the parallel track has written it.** `vision/requirements.txt` (read,
   not modified) scopes itself in its own header to *"the machine that runs `modal deploy vision/bus_vision.py`"*
   and lists only what `bus_vision.py` imports at **module** level — `modal==1.5.2`, `anthropic==0.117.0`,
   `pydantic>=2.0`. It explicitly is **not** the container's dependency list; the image is declared in code as
   `IMAGE` inside `bus_vision.py`, where `cv2` already arrives transitively via `ultralytics`. Adding
   `opencv-python` to that file would put a laptop-only GUI dependency into the deploy machine's requirements
   and break the file's stated contract with itself. **A separate `vision/requirements-dev.txt`, or just
   `pip install opencv-python` per the harness docstring, is the correct reconciliation** — not an edit to
   `requirements.txt`.
2. **No version pin is proposed.** Global Constraint 11 pins versions that were grounded by research; I did no
   research and will not invent a pin. Unpinned `opencv-python` is the honest state.
3. **`opencv-python` vs `opencv-python-headless`.** The harness prefers the GUI build (preview window + SPACE
   key) but detects and survives the headless one via the terminal fallback (A13).

**No other dependency was added.** HTTP is stdlib `urllib`, JSON is stdlib `json`, the session id is stdlib
`uuid`, key reading is stdlib `termios`/`tty`/`select`. That was a deliberate choice made *because* I could not
edit `requirements.txt`: it reduces the unaddable surface to exactly one package.

---

## 7. Verification

### 7a. `py_compile` — verbatim, exit 0

```
$ python -m py_compile vision/bus_client.py
$ echo $?
0
```

No output, exit status 0. (Python 3.12.13, `/opt/homebrew/opt/python@3.12/libexec/bin/python`.) Run after the
final edit to `post_json`/`_post_event`, not before.

### 7b. State-machine logic — exercised with `cv2` stubbed

The pure functions were driven from a scratchpad script that injects a stub `cv2` into `sys.modules`, so no
webcam and no OpenCV install were needed. All checks passed:

- the seven-frame Contract A trace → the locked Contract B sequence, keys and order exact (§3e)
- `low confidence` → UNKNOWN · `null reading` → UNKNOWN · `empty route` → UNKNOWN · `route "N3"` → NUMBER
  verbatim (A2)
- `present=False` + `reading_ready=True` → NONE, not NUMBER (the 900 s TTL trap, §3a)
- SPACE force re-arm mid-presence → `BUS(aid=2) → WAIT(aid=2)`
- eight `MODAL_URL` / `VERCEL_URL` normalisation cases (A11, A12)
- hazard parsing including a non-numeric confidence and a non-dict list entry
- `DetectorFrame.from_json` against `None`, `[]`, `"nope"` and a dict with a bogus event — no exception
- every emitted pattern is in the `CloudPattern` allow-list

The script lives in the session scratchpad, not the repo — it is a check, not an asset, and the brief scoped my
writable files to two.

### 7c. What was NOT run — stated plainly

**The capture loop has never been executed.** It cannot be, from here:

- **`cv2` is not installed on this machine.** Confirmed: `python -c "import cv2"` →
  `ModuleNotFoundError: No module named 'cv2'`.
- **There is no webcam available to this agent**, so `cv2.VideoCapture(0)` has never opened.
- **`MODAL_URL` is unset and no Modal app is deployed**, so `/ingest` has never been called.
- **`/api/event` does not exist yet** — it is NET-NEW and owned by another track.

So: byte-compilation is verified, and the pure state machine is verified against the locked demo. **The camera
path, the JPEG encode, the two HTTP paths, the preview window and the termios fallback are unexercised code.**
Nothing above should be read as claiming otherwise.

---

## 8. Residual risk

Ordered by expected cost × probability.

| # | Risk | Why it survives | Mitigation / trip-wire |
|---|---|---|---|
| 1 | **Two capture sources share one arrival latch.** The `bus:*` keys are global (spec §(d), §(g) risk 4). Running this harness while the phone page is live means both drive the same latch and both POST to `/api/event`. | Deliberate design of the Redis state; not fixable from this file. | **Run exactly one capture source at a time.** Stated in §1 and in the module docstring. The `laptop-` prefix on `session_id` makes harness traffic identifiable in Redis if it happens anyway. |
| 2 | **The whole file is unexercised at runtime** (§7c). First real run will find whatever compile and pure-logic checks cannot. | No camera, no cv2, no deployed endpoints in this environment. | Run it at a desk against `modal serve` **before** it is needed. First-run failures to expect: opencv install, camera permission on macOS (`cv2.VideoCapture(0)` returning not-opened is handled with an explicit message and exit 3), and the `/ingest` path suffix. |
| 3 | **A letter route reaches the device** if `/api/event` has not implemented `ROUTE_RE` yet. | Direct consequence of A2 — deliberately not filtered twice. | Trip-wire: the debug screen shows `NUMBER` with a non-digit route. The fix belongs in `/api/event` (plan:565), not here. Route 88 is unaffected. |
| 4 | **A blocking POST stalls capture** for up to `MODAL_TIMEOUT_S = 4.0` s. | The loop is deliberately single-threaded and synchronous — the simple, auditable shape for a harness. | Bounded and self-recovering; the deadline pacer re-baselines rather than spiralling. If it bites, lower the timeout — do not add threads to a rehearsal tool. |
| 5 | **Frame staleness from camera buffering.** At 2 fps the driver may hand back a frame captured a few hundred ms ago, inflating apparent arrival latency. | `CAP_PROP_BUFFERSIZE = 1` is advisory and ignored by several backends. | Only affects perceived latency in rehearsal, not the demo path. Do not tune the real latency budget against numbers measured here. |
| 6 | **A long Vercel outage delays a BUS edge.** `pending_edges` holds the arrival until the relay accepts it, so BUS could land seconds late — after NUMBER is already known. | The alternative (dropping it) loses the arrival pulse entirely, which is worse. | Ordering is still BUS → WAIT → NUMBER; only the wall clock slips. Capped at `MAX_PENDING_EDGES = 8`. |
| 7 | **`opencv-python` is in no requirements file** (§6). | Cannot edit `vision/requirements.txt` — parallel agent owns it. | Orchestrator reconciliation. The module docstring names the package so a reader is never stuck. |
| 8 | **Terminal left in cbreak mode** if the process is killed with `SIGKILL` (the `finally` cannot run). | Unavoidable for `SIGKILL`. | Ctrl-C, `q`, ESC and any exception all restore it. Recovery if it ever happens: `stty sane`. |
| 9 | **`ERROR` is emitted on Modal failure but not on relay failure.** If `/api/event` is down, the device simply stops receiving updates and holds its last pattern. | The client cannot tell the device anything over a dead relay — there is no other channel. | Relay failures print per-attempt and are retried every frame; the status line shows them. Nothing better is available from here. |
