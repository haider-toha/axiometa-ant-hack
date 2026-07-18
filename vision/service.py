"""Modal vision service — YOLO-World detector with a baked offline vocabulary.

Serves an HTTPS JSON endpoint over CORS for the phone capture page
(`www/src/app/capture/page.tsx`) or any other HTTP client. The vocabulary — the
1203-class LVIS list plus two hand-tuned target prompts — is encoded into the
weights at image-build time, so CLIP is never needed at runtime and one forward
pass yields the drawn boxes, the arrival target and the hazards together.

Retarget it by editing TARGET_LABELS and PROMPT. Nothing below is specific to
what they currently say.

One frame, end to end::

    HTTP client ──POST /ingest──▶ YOLO-World (baked vocab, warm T4)
                                      │
                                      ├──▶ Lua arrival state machine (Redis)
                                      │       "is the target here" over TIME
                                      │
                                      ├──▶ hazards:{session_id}  (TTL 5 s)
                                      │
                TARGET_ARRIVED ───────┴──▶ crop the text region → 3× Claude OCR
                                           on a daemon thread — NEVER blocks

    "Detection is when. Claude is what."

State lives in Redis, not in the process. The arrival state machine is mutated
only by an atomic `allow-key-locking` Lua script, so the service is correct
across concurrent containers and needs no `max_containers`.

The consequence that is easiest to miss: **the Claude reading must live in
Redis too.** Container A latches the arrival and runs the vote; the client's
next poll may land on container B. Keys `det:reading`, `det:reading_for`,
`det:votes` carry it across. See `_ocr_worker`.

Deploy::

    pip install -r vision/requirements.txt
    modal setup
    modal secret create anthropic ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"
    modal secret create upstash \\
        UPSTASH_REDIS_REST_URL="$UPSTASH_REDIS_REST_URL" \\
        UPSTASH_REDIS_REST_TOKEN="$UPSTASH_REDIS_REST_TOKEN"
    modal deploy vision/service.py

Paste the URL that `modal deploy` PRINTS (+ `/ingest`) into the webapp's
CONFIG block or `MODAL_URL`. Do not construct it from the documented pattern.
"""

import asyncio
import base64
import io
import json
import threading
from collections import Counter
from typing import Any, Literal, Optional

import modal
from pydantic import BaseModel, Field, field_validator

app = modal.App("bus-vision")

# ===========================================================================
# HARDCODED CONSTANTS
# No configuration knobs. Nothing below is read from the environment; the only
# env vars this service touches are the two Modal secrets (ANTHROPIC_API_KEY,
# UPSTASH_REDIS_REST_URL/_TOKEN), and neither is ever printed, logged, or
# returned in a response.
# ===========================================================================

CONF_MIN = 0.35  # a target box below this does not count as a detection

# Display threshold, deliberately well below CONF_MIN. Open-vocabulary scores
# spread thinner across 1203 classes than across 8, so a box worth OUTLINING is
# not yet a box worth latching an arrival or raising a hazard on. CONF_MIN still
# gates both of those; this only gates what gets drawn.
DRAW_CONF_MIN = 0.20
MAX_DETECTIONS = 12  # payload cap at 2 Hz, applied after sorting by confidence
MAX_RAW_BOXES = 30  # per-frame cap inside the forward pass itself
DEDUPE_IOU = 0.6  # above this two boxes are the same object seen twice
HITS_TO_ARRIVE = 2  # 2 consecutive frames @ 2 fps
MISSES_TO_CLEAR = 4  # ~2 s of absence before the latch re-arms
STATE_TTL_S = 900  # 15 min — no state survives between demo runs
HAZARD_TTL_S = 5  # a safety signal must evaporate, never go stale and lie

VOTE_ROUNDS = 3  # concurrent Claude readings per arrival
VOTES_NEEDED = 2  # agreeing high-confidence readings required to emit a route

CLAUDE_MODEL = "claude-opus-4-8"
# Faster/cheaper swap if the stage feels laggy — one string, nothing else:
# CLAUDE_MODEL = "claude-haiku-4-5"

# What the current demo target is expected to read as — used for logging only.
#
# ⚠️ THESE TWO STRINGS ARE NEVER SUBSTITUTED INTO A RESPONSE. They exist so a
# 3 a.m. log line can say "Claude read 8B, expected 88". Emitting the expected
# value instead of the observed one would fake the result and would destroy the
# "we would rather say nothing than say 87" moment, which is the entire point
# of the vote gate.
EXPECTED_CODE = "88"
EXPECTED_TEXT = "Clapham Common"

# ROUTE_RE is enforced at /api/event on the Vercel side, NOT here. This
# service returns Claude's raw `route` string verbatim so the debug screen can
# show what was actually read; the relay is what rejects a non-digit route and
# substitutes pattern "UNKNOWN". Do not filter it twice — a route silently
# dropped here is invisible on the debug screen, which is the failure mode the
# design guards against.
#
# Declared for reference and deliberately NOT applied. Do not "fix" this.
ROUTE_RE = r"^[0-9]{1,3}$"

# ---------------------------------------------------------------- REDIS KEYS
ARRIVAL_KEYS = ["det:hits", "det:misses", "det:present", "det:arrival_id"]
HITS_KEY, MISSES_KEY, PRESENT_KEY, ARRIVAL_ID_KEY = ARRIVAL_KEYS

READING_KEY = "det:reading"  # JSON object or JSON null
READING_FOR_KEY = "det:reading_for"  # int — the arrival_id the reading belongs to
VOTES_KEY = "det:votes"  # JSON array of raw text strings


# ===========================================================================
# IMAGE BUILD — bakes the YOLO-World vocabulary so CLIP is never needed at
# runtime.
# ===========================================================================

# YOLO-World is OPEN-vocabulary: `set_classes()` accepts any list of strings and
# CLIP encodes them into the checkpoint at build time. The vocabulary size is
# therefore a choice, not a limit. This service bakes LVIS — the 1203-class
# benchmark YOLO-World is itself evaluated on — so the screen can name what it
# is pointed at rather than only the handful of classes the demo needs.
#
# Two consequences of going wide, both designed for below rather than
# discovered at 3 a.m.:
#   1. Class indices SHIFT. Nothing may key off a literal integer ever again;
#      the target and hazard maps resolve BY NAME in `_resolve_vocab`.
#   2. Near-synonyms compete for one object ("car" / "jeep" / "minivan" all fire
#      on the same car). `agnostic_nms` collapses them to the single best box.

# Appended to LVIS, not replacing it. LVIS class 172 is
# "bus/bus vehicle/autobus/charabanc/double-decker/motorbus/motorcoach" and
# already covers a bus, but these two were hand-tuned against the actual demo
# prop and cost two embeddings to keep.
EXTRA_PROMPTS = ["double decker bus", "bus front"]

# Which labels are the arrival target. Resolved by name, so reordering or
# regenerating the vocabulary cannot silently repoint them.
TARGET_LABELS = {"bus", "school bus", "double decker bus", "bus front"}

# Coarse safety class for the wearable's future navigation patterns. A label
# absent from this map is still detected, still drawn, and still named on
# screen — it simply carries no `kind` and raises no hazard.
HAZARD_LABELS = {
    "person": "person",
    "bicycle": "bicycle",
    "dirt bike": "bicycle",
    "car": "vehicle",
    "cab": "vehicle",
    "jeep": "vehicle",
    "minivan": "vehicle",
    "camper": "vehicle",
    "ambulance": "vehicle",
    "police cruiser": "vehicle",
    "fire engine": "vehicle",
    "garbage truck": "vehicle",
    "pickup truck": "vehicle",
    "tow truck": "vehicle",
    "trailer truck": "vehicle",
    "motorcycle": "vehicle",
    "motor scooter": "vehicle",
}


def _lvis_labels() -> list[str]:
    """The LVIS class names, read from the installed ultralytics package.

    No network call and no second copy of a 1203-line list in this file. Every
    entry is a `/`-joined synonym set ("bus/autobus/double-decker"); the FIRST
    synonym becomes the label, because handing CLIP the whole joined string
    prompts it with a phrase no image caption ever contains — and prints a
    label no human wants to read off a screen.

    Five entries collide on their first synonym, because LVIS carries the
    animal and the foodstuff as separate classes ("salmon/salmon fish" against
    "salmon/salmon food"). Those take their LAST synonym, which is the
    disambiguating one. Labels must stay 1:1 with indices or the name lookup in
    `_resolve_vocab` resolves to the wrong class.

    Imports live inside the function: `modal deploy` imports this module on the
    LOCAL machine to build the app graph, where ultralytics is not installed.
    """
    from pathlib import Path

    import ultralytics
    import yaml

    path = Path(ultralytics.__file__).parent / "cfg" / "datasets" / "lvis.yaml"
    raw = yaml.safe_load(path.read_text())["names"]
    synonyms = [[s.strip() for s in raw[i].split("/")] for i in range(len(raw))]

    shared = Counter(s[0] for s in synonyms)
    labels = [s[-1] if shared[s[0]] > 1 else s[0] for s in synonyms]
    if len(set(labels)) != len(labels):
        raise RuntimeError("LVIS labels are not 1:1 with indices after disambiguation")
    return labels


def _vocab() -> list[str]:
    """The exact list baked into the weights. Called at BUILD time to bake and
    at RESTORE time to map indices back to names — one definition, so the two
    can never drift."""
    return _lvis_labels() + EXTRA_PROMPTS


def _resolve_vocab(labels: list[str]) -> tuple[set[int], dict[int, str]]:
    """Index maps, resolved by name.

    The version this replaces hardcoded `{0, 1, 2}` for the target and `{3..7}`
    for hazards. That was correct only for the exact 8-item list it was written
    against: inserting a single class ahead of them would have reported a bus as
    a bicycle, which is precisely the plausible-wrong output the rest of this
    service is built to refuse to emit.
    """
    idx = {label: i for i, label in enumerate(labels)}
    target = {idx[name] for name in TARGET_LABELS if name in idx}
    hazard = {idx[name]: kind for name, kind in HAZARD_LABELS.items() if name in idx}
    if not target:
        raise RuntimeError(f"no target label resolved from {sorted(TARGET_LABELS)}")
    return target, hazard


BAKED_WEIGHTS = "/model/vocab.pt"


def _bake_detector() -> None:
    """Runs at IMAGE BUILD time, where the network is available.

    The trap this function exists to avoid: `set_classes()` downloads CLIP
    into ~/.cache/clip to encode the prompts (ultralytics#11681). Doing it
    HERE means the running container never imports CLIP and never fetches
    weights. `save()` writes the pre-encoded "offline vocabulary" embeddings
    into the checkpoint, after which the saved .pt "behaves like any other
    pretrained YOLOv8 model" (Ultralytics docs).

    `yolov8s-world.pt`, not `-m`. The prop is a frame-filling A3
    print or tablet at 1.0–1.5 m; `s` already has far more capacity than that
    needs and `m` costs ~2.5× the parameters for no measurable gain.
    """
    from ultralytics import YOLO

    vocab = _vocab()
    m = YOLO("yolov8s-world.pt")  # auto-downloads from ultralytics/assets
    m.set_classes(vocab)
    m.save(BAKED_WEIGHTS)
    print(f"[bake] {len(vocab)} classes baked, e.g. {vocab[:3]} … {vocab[-3:]}")


IMAGE = (
    modal.Image.debian_slim(python_version="3.11")
    # libgl1/libglib: ultralytics will not import without them (Modal quickstart).
    # git: set_classes() pulls ultralytics/CLIP via git at bake time.
    .apt_install("libgl1", "libglib2.0-0", "git")
    .pip_install(
        "ultralytics",
        "anthropic==0.117.0",  # pinned
        "upstash-redis",
        "pillow",
        "fastapi[standard]",
        "git+https://github.com/ultralytics/CLIP.git",  # bake-time only
    )
    .run_commands("mkdir -p /model")
    .run_function(_bake_detector)
)


# ===========================================================================
# REQUEST / RESPONSE MODELS — Pydantic v2.
# ===========================================================================


class IngestRequest(BaseModel):
    """Contract A, phone → Modal. POST body.

    `frame_b64` accepts BOTH a bare base64 string ("/9j/4AAQ…") and a full data
    URL ("data:image/jpeg;base64,/9j/4AAQ…"). canvas.toDataURL() emits the
    latter, a bare encode emits the former. Both work — this is a classic
    3 a.m. bug, designed out rather than discovered.
    """

    frame_b64: str
    session_id: str = Field(min_length=1, max_length=64)
    force: bool = False  # true only for the disclosed SPACE key

    @field_validator("frame_b64")
    @classmethod
    def _strip_data_url(cls, v: str) -> str:
        if v.startswith("data:"):
            _, _, v = v.partition(",")  # drop "data:image/jpeg;base64,"
        return v.strip()


class Reading(BaseModel):
    """Claude's answer. Field names and the confidence enum are locked by the
    ROUTE_SCHEMA used in the structured-output call — keep them in sync."""

    route: str
    destination: str
    confidence: Literal["high", "low"]


class Hazard(BaseModel):
    """A non-target detection from the SAME forward pass — no second model, no
    extra latency. `bearing` is the box's horizontal centroid against frame
    thirds, computed from the DECODED frame width, never a hardcoded 1280 —
    camera capture-size requests are advisory."""

    kind: Literal["person", "vehicle", "bicycle", "obstacle"]
    bearing: Literal["left", "center", "right"]
    confidence: float


class Detection(BaseModel):
    """One box to outline on screen, with the name of what is inside it.

    `box` is [x1, y1, x2, y2] NORMALISED to 0..1 against the decoded frame, not
    pixels. The browser then scales it to whatever size it happens to render the
    video at, without needing to know the capture resolution — which is the one
    number that is never trustworthy, because `getUserMedia` capture-size
    requests are advisory and a phone may hand back something else entirely.

    `kind` is the coarse safety class, null for the ~1190 labels that are not a
    hazard. `target` marks the box that drives the arrival state machine.
    """

    label: str
    box: list[float]
    confidence: float
    bearing: Literal["left", "center", "right"]
    kind: Optional[Literal["person", "vehicle", "bicycle"]] = None
    target: bool = False


class IngestResponse(BaseModel):
    """Contract A response. The first seven fields are the locked contract —
    do not rename or camelCase them. `hazards`, `detections` and `session_id`
    are additions."""

    # ---- Contract A, locked -----------------------------------------------
    event: Literal["NONE", "TARGET_ARRIVED", "TARGET_GONE"]
    present: bool
    confidence: float  # best target-box confidence THIS frame
    arrival_id: int  # increments once per arrival — fire-once latch
    reading: Optional[Reading]  # null until Claude answers
    reading_ready: bool
    votes: list[str]  # Claude's raw route strings once answered
    # ---- additions ---------------------------------------------------------
    hazards: list[Hazard] = []
    detections: list[Detection] = []
    session_id: str


# ===========================================================================
# THE ARRIVAL STATE MACHINE. DO NOT REFORMAT.
# The shebang must be the first line, byte-for-byte.
# ===========================================================================

ARRIVAL_LUA = """\
#!lua flags=allow-key-locking
-- Target-arrival state machine. Atomic across concurrent Modal containers,
-- which is what removes the need to pin the app to a single process.
--
-- KEYS[1]  det:hits        consecutive frames WITH a target box >= CONF_MIN
-- KEYS[2]  det:misses      consecutive frames WITHOUT one
-- KEYS[3]  det:present     "0" | "1"   debounced presence
-- KEYS[4]  det:arrival_id  monotonic; +1 exactly once per arrival (the latch)
--
-- ARGV[1]  seen             "1" if this frame has a qualifying target box, else "0"
-- ARGV[2]  hits_to_arrive   integer, 2   (plan latency budget row 5, 2 fps)
-- ARGV[3]  misses_to_clear  integer, 4
-- ARGV[4]  ttl_seconds      integer, 900 — EVERY key expires, so no state
--                           survives between demo runs
-- ARGV[5]  force            "1" for the disclosed SPACE key, else "0"
--
-- RETURNS  { event, present, arrival_id }
--          event ∈ "NONE" | "TARGET_ARRIVED" | "TARGET_GONE"
--          present    0 | 1
--          arrival_id integer
--
-- Exactly one concurrent caller can observe the not-present → present
-- transition, therefore exactly one container ever receives "TARGET_ARRIVED" and
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
  event      = "TARGET_ARRIVED"
elseif (not present) and hits >= hits_to_arrive then
  present    = true
  arrival_id = arrival_id + 1
  event      = "TARGET_ARRIVED"
elseif present and misses >= misses_to_clear then
  present    = false
  event      = "TARGET_GONE"
end

-- SET ... EX writes value and TTL in one command, so a TTL can never be
-- orphaned from its write. Every key carries one, so no state survives
-- between runs.
redis.call('SET', KEYS[1], tostring(hits),          'EX', ttl)
redis.call('SET', KEYS[2], tostring(misses),        'EX', ttl)
redis.call('SET', KEYS[3], present and "1" or "0",  'EX', ttl)
redis.call('SET', KEYS[4], tostring(arrival_id),    'EX', ttl)

return { event, present and 1 or 0, arrival_id }
"""


# ===========================================================================
# REDIS — the client is constructed in NEITHER @modal.enter hook.
# ===========================================================================

_TLS = threading.local()


def _redis():
    """One Upstash client per thread, created on first use.

    Two problems solved at once:
      1. It is never constructed during snap=True, so no network client is
         ever captured in the memory snapshot.
      2. FastAPI runs sync path operations in a threadpool and the OCR worker
         is its own thread; a per-thread client removes every shared-HTTP-
         session question. Constructing an Upstash REST client is cheap — it
         is a URL, a token, and a session.
    """
    r = getattr(_TLS, "redis", None)
    if r is None:
        from upstash_redis import Redis

        r = Redis.from_env()  # UPSTASH_REDIS_REST_URL + _REST_TOKEN
        _TLS.redis = r
    return r


# --- Signature-tolerant wrappers -------------------------------------------
# The SCRIPTING signature (`eval(script, keys=[], args=[])`) is verified against
# the Upstash docs, and `eval` below is used exactly that way with no fallback.
# The arity of `mget` and the TTL kwarg on `set` are NOT verified, so rather
# than bet on a remembered signature, probe once and memoise. A few bytes buys
# the deletion of an entire failure class.

_MGET_STYLE: Optional[str] = None  # "varargs" | "list" | "get"
_SETEX_STYLE: Optional[str] = None  # "kwarg" | "expire"


def _mget(keys: list[str]) -> list[Any]:
    """MGET the given keys."""
    global _MGET_STYLE
    r = _redis()

    if _MGET_STYLE in (None, "varargs"):
        try:
            out = r.mget(*keys)
            _MGET_STYLE = "varargs"
            return list(out)
        except TypeError:
            pass
    if _MGET_STYLE in (None, "list"):
        try:
            out = r.mget(keys)
            _MGET_STYLE = "list"
            return list(out)
        except TypeError:
            pass
    # A signature that cannot be wrong. Costs two extra REST round trips.
    _MGET_STYLE = "get"
    return [r.get(k) for k in keys]


def _set_ex(key: str, value: str, ttl: int) -> None:
    """SET key value EX ttl — value and TTL together, never orphaned."""
    global _SETEX_STYLE
    r = _redis()

    if _SETEX_STYLE in (None, "kwarg"):
        try:
            r.set(key, value, ex=ttl)
            _SETEX_STYLE = "kwarg"
            return
        except TypeError:
            pass
    _SETEX_STYLE = "expire"
    r.set(key, value)
    r.expire(key, ttl)


def _to_int(v: Any, default: int = 0) -> int:
    """Coerce a Redis/Lua scalar. The REST transport hands back either int or
    str depending on the value, so coerce both explicitly."""
    if v is None:
        return default
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


def _from_json(v: Any, default: Any = None) -> Any:
    """Decode a Redis value that we wrote with json.dumps.

    Tolerates a client that has already deserialised it (the JS SDK does; the
    Python SDK is not documented either way, so accept both)."""
    if v is None:
        return default
    if isinstance(v, (dict, list)):
        return v
    try:
        out = json.loads(v)
    except (TypeError, ValueError):
        return default
    return default if out is None else out


# ===========================================================================
# CLAUDE OCR — structured outputs only.
# ===========================================================================

ROUTE_SCHEMA = {
    "type": "object",
    "properties": {
        "route": {"type": "string"},
        "destination": {"type": "string"},
        # Enum values are lowercase; the docs warn output capitalisation may
        # differ, so every comparison below is .lower()'d.
        "confidence": {"type": "string", "enum": ["high", "low"]},
    },
    "required": ["route", "destination", "confidence"],
    "additionalProperties": False,  # REQUIRED by structured outputs
}

# The OCR task description. This and TARGET_LABELS are the two places the
# service knows what it is looking at — edit both together to retarget.
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


async def _one_vote(client: Any, b64: str) -> dict:
    """One structured Claude reading of the crop.

    Assistant prefill and prompt-only JSON are FORBIDDEN — prefill returns 400
    on Opus 4.8 and prompt-only carries no guarantee. `output_config.format` is
    the only mechanism used.
    """
    resp = await client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=256,
        # `thinking` deliberately OMITTED: on Opus 4.8 an omitted thinking field
        # runs WITHOUT thinking — correct for a latency-critical one-shot read.
        output_config={
            # `effort` and `format` are optional SIBLINGS on output_config and
            # may both be set. If a 400 ever names output_config, drop `effort`
            # first — it is the non-essential half; the schema does the work.
            "effort": "low",
            "format": {"type": "json_schema", "schema": ROUTE_SCHEMA},
        },
        messages=[
            {
                "role": "user",
                "content": [
                    # Image BEFORE text — Anthropic's documented preference.
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": b64,
                        },
                    },
                    {"type": "text", "text": PROMPT},
                ],
            }
        ],
    )
    # output_config.format guarantees the first text block is valid JSON.
    text = next(b.text for b in resp.content if b.type == "text")
    out = json.loads(text)
    # Docs: "Output may differ in capitalization from schema enum values."
    out["confidence"] = str(out.get("confidence", "")).lower()
    return out


async def _vote_all(b64: str) -> list[dict]:
    """3 concurrent Claude OCR votes. Returns only the parsed successes.

    AsyncAnthropic + asyncio.gather beats asyncio.to_thread here: to_thread
    also needs a running loop, so it buys no simplicity, and it burns three OS
    threads to do what one loop does with three sockets.
    `return_exceptions=True` surfaces per-vote failures without collapsing the
    other two — which matters, because the gate needs 2 of 3 and one network
    blip must not lose the arrival.
    """
    import anthropic

    async with anthropic.AsyncAnthropic() as client:  # reads ANTHROPIC_API_KEY
        results = await asyncio.gather(
            *(_one_vote(client, b64) for _ in range(VOTE_ROUNDS)),
            return_exceptions=True,
        )

    for r in results:
        if isinstance(r, BaseException):
            print(f"[claude] vote failed: {r!r}")
    return [r for r in results if isinstance(r, dict)]


def _ocr_worker(crop_jpeg: bytes, arrival_id: int) -> None:
    """Daemon thread. Runs the 3 votes, applies the gate, writes to Redis.

    Called from `_handle` and NEVER waited on — that is what makes the
    two-stage haptic possible without websockets. The Claude call is network-
    I/O bound, so the GIL is released and the ingest path keeps serving polls.
    """
    try:
        b64 = base64.standard_b64encode(crop_jpeg).decode("utf-8")
        votes = asyncio.run(_vote_all(b64))  # own event loop, own thread

        # Every raw route string Claude produced, verbatim and unfiltered —
        # this is what the debug screen shows. See ROUTE_RE above: filtering
        # here would make a misread invisible at exactly the moment you need
        # to see it.
        raw_routes = [str(v.get("route", "")) for v in votes]

        # ---- the confidence gate -------------------------------------------
        # Keep only readings that are high-confidence AND have a route. A
        # single confident hallucination must not reach the wrist; two
        # independent calls must agree.
        kept = [
            v
            for v in votes
            if str(v.get("confidence", "")).lower() == "high" and v.get("route")
        ]
        reading: Optional[dict] = None
        for route, n in Counter(str(v["route"]) for v in kept).most_common():
            if n >= VOTES_NEEDED:
                dest = next(
                    str(v.get("destination", ""))
                    for v in kept
                    if str(v["route"]) == route
                )
                reading = {
                    "route": route,
                    "destination": dest,
                    "confidence": "high",
                }
                break

        if reading is None:
            # A real answer, not silence: "the system saw the target and could not
            # read it". The browser turns reading_ready + reading:null into the
            # WAIT/UNKNOWN pattern. No silent retry — the event is bound to
            # this arrival, and re-arming waits for the next TARGET_GONE.
            print(f"[ocr] arrival {arrival_id}: UNREADABLE, held. raw={raw_routes}")
        else:
            match = "ok" if reading["route"] == EXPECTED_CODE else "MISMATCH"
            print(
                f"[ocr] arrival {arrival_id}: {reading['route']!r} / "
                f"{reading['destination']!r} [{match} vs expected "
                f"{EXPECTED_CODE!r}/{EXPECTED_TEXT!r}] raw={raw_routes}"
            )

        # ---- supersede check ------------------------------------------------
        current = _to_int(_redis().get(ARRIVAL_ID_KEY))
        if current != arrival_id:
            print(f"[ocr] arrival {arrival_id} superseded by {current}; discarding")
            return

        # ---- PAYLOAD FIRST, SIGNAL LAST — the same ordering rule as
        # app/app/lib/redis.ts:27-29. `det:reading_for` is the
        # signal that flips `reading_ready` true; if it landed first, a poll in
        # between would see reading_ready:true with a null reading and the
        # client would post a NUMBER pattern with an empty route. Same bug,
        # same fix, different keys.
        #
        # `det:reading` is written UNCONDITIONALLY — as JSON `null` when the
        # gate failed. Skipping the write would leave the PREVIOUS arrival's
        # reading in place and deliver a stale code for a target we could not read.
        _set_ex(READING_KEY, json.dumps(reading), STATE_TTL_S)  # payload
        _set_ex(VOTES_KEY, json.dumps(raw_routes), STATE_TTL_S)  # payload
        _set_ex(READING_FOR_KEY, str(arrival_id), STATE_TTL_S)  # ← signal, LAST
    except Exception as exc:  # noqa: BLE001 — a daemon thread must never die loudly
        print(f"[ocr] worker failed for arrival {arrival_id}: {exc!r}")


# ===========================================================================
# FRAME GEOMETRY
# ===========================================================================

TEXT_TOP_FRACTION = 0.30  # the text region sits in the top 30% of the target box
CROP_LONG_EDGE = 896  # ⌈896/28⌉ × ⌈280/28⌉ = 32 × 10 = 320 visual tokens
CROP_JPEG_QUALITY = 92  # high q: heavy JPEG artefacts hurt text legibility


def _iou(a: list[float], b: list[float]) -> float:
    """Intersection over union of two normalised [x1, y1, x2, y2] boxes."""
    ix1, iy1 = max(a[0], b[0]), max(a[1], b[1])
    ix2, iy2 = min(a[2], b[2]), min(a[3], b[3])
    inter = max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)
    if inter <= 0.0:
        return 0.0
    union = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / union if union > 0.0 else 0.0


def _dedupe_for_display(dets: list["Detection"]) -> list["Detection"]:
    """Collapse near-duplicate boxes left by competing synonyms.

    Across 1203 classes several labels fire on one object — a car draws "car",
    "jeep" and "minivan" stacked on the same pixels, which is unreadable.

    The detector's own `agnostic_nms` would collapse them, and the first
    version of this used it. It is the wrong tool: being class-blind it keeps
    whichever label scored highest and DROPS the rest, so a person in a suit
    came back as "dress suit" with no "person" box at all — silently deleting
    the detection the hazard signal depends on, and able to do the same to the
    bus that latches an arrival.

    So NMS stays class-aware and the collapse happens here instead, by ROLE:

      * an ordinary box is suppressed by any overlapping box already kept;
      * a target or hazard box is suppressed only by one playing the SAME role
        (both targets, or the same hazard kind).

    That second rule is the whole point. It still collapses "bus" against
    "double decker bus" — both target prompts fire on one London bus and would
    otherwise draw two stacked rectangles — while making it impossible for
    "dress suit" to suppress "person", because they are not the same role.

    Only the drawn list is affected. `hazards` and the arrival target are taken
    straight from the detection loop, so nothing removed here can change what
    the device is told. `dets` must already be sorted by confidence, descending.
    """
    kept: list["Detection"] = []
    for d in dets:
        protected = d.target or d.kind is not None
        for k in kept:
            if _iou(d.box, k.box) <= DEDUPE_IOU:
                continue
            if not protected or (d.target and k.target) or (d.kind and d.kind == k.kind):
                break
        else:
            kept.append(d)
    return kept


def _bearing(cx: float, width: int) -> str:
    """Horizontal centroid against frame thirds, from the DECODED width."""
    if width <= 0:
        return "center"
    third = width / 3.0
    if cx < third:
        return "left"
    if cx < 2.0 * third:
        return "center"
    return "right"


def _crop_text_region(frame: Any, xyxy: Optional[tuple]) -> bytes:
    """Crop the target's text region and encode it as JPEG.

    Geometry: top 30 % of the target box, long edge
    resized to 896 px, JPEG q92.

    `xyxy=None` is the disclosed SPACE-key path (and the defensive no-box
    path): send the WHOLE frame, resized. A manual override means "detection
    failed, just look" — a top-30 % crop of a frame whose target box we never
    found could cut the text out entirely, and a full frame merely costs more
    tokens. Losing the answer is worse than paying for it.
    """
    if xyxy is None:
        crop = frame
    else:
        x1, y1, x2, y2 = (int(v) for v in xyxy)
        crop = frame.crop((x1, y1, x2, y1 + int(TEXT_TOP_FRACTION * (y2 - y1))))

    w, h = crop.size
    long_edge = max(w, h)
    if long_edge > CROP_LONG_EDGE:
        scale = CROP_LONG_EDGE / float(long_edge)
        crop = crop.resize((max(1, int(w * scale)), max(1, int(h * scale))))

    buf = io.BytesIO()
    crop.save(buf, format="JPEG", quality=CROP_JPEG_QUALITY)
    return buf.getvalue()


# ===========================================================================
# THE SERVICE.
# ===========================================================================


@app.cls(
    image=IMAGE,
    gpu="T4",
    secrets=[
        modal.Secret.from_name("anthropic"),  # → ANTHROPIC_API_KEY
        modal.Secret.from_name("upstash"),  # → UPSTASH_REDIS_REST_URL + _TOKEN
    ],
    min_containers=1,  # the warmth guarantee — never scale to zero
    scaledown_window=1200,  # 20 min, the documented maximum (range 2 s – 20 min)
    timeout=120,  # seconds; Modal's default is 300
    enable_memory_snapshot=True,  # CPU snapshots: GA
    # ---- GPU snapshots are ALPHA. DO NOT ENABLE FOR THE DEMO. -------------
    # The exact syntax, one uncomment away, recorded so nobody has to look it up:
    #   experimental_options={"enable_gpu_snapshot": True},
    # Documented incompatibilities: multi-GPU, non-CUDA, torch.compile; and
    # "most functions require modifications". min_containers=1 already buys the
    # cold-start win for free.
    #
    # NOTE: there is deliberately NO max_containers. The arrival state machine
    # lives in Redis and is atomic across containers, so pinning to one process
    # is neither required nor desirable. Do not add it back.
)
class VisionService:
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

        # Rebuilt from the SAME `_vocab()` the bake used, so index → label can
        # never drift from what is actually encoded in the weights. A local
        # yaml read is a disk read, which the snapshot phase permits.
        self.labels = _vocab()
        self.target_idx, self.hazard_kind = _resolve_vocab(self.labels)

        # Local file, baked at image build. No download, no CLIP, no network.
        self.model = YOLO(BAKED_WEIGHTS)  # loads to CPU by default

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
        except Exception as exc:  # noqa: BLE001
            print(f"[warm] schema prime skipped: {exc}")

    def _prime_schema(self) -> None:
        """One throwaway structured call so ROUTE_SCHEMA's grammar is compiled
        and cached before the first real arrival. Text-only: the grammar cache
        is keyed on the schema, not the image, so no crop is needed and this
        stays cheap."""
        import anthropic

        client = anthropic.Anthropic()  # snap=False — secrets and sockets are live
        client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=64,
            output_config={
                "effort": "low",
                "format": {"type": "json_schema", "schema": ROUTE_SCHEMA},
            },
            messages=[
                {
                    "role": "user",
                    "content": "Warm-up only. There is no image. Return an empty "
                    "route with low confidence.",
                }
            ],
        )
        print("[warm] ROUTE_SCHEMA grammar primed")

    # ------------------------------------------------------------------ ASGI
    @modal.asgi_app(label="bus-vision")
    def web(self):
        from fastapi import FastAPI
        from fastapi.middleware.cors import CORSMiddleware

        web_app = FastAPI()

        # MANDATORY. The capture page is served from the Vercel origin and POSTs
        # cross-origin to *.modal.run. Without this the browser blocks the
        # preflight and no frame ever arrives. This is the reason we use
        # @modal.asgi_app() rather than @modal.fastapi_endpoint() — the latter
        # has no middleware parameter.
        web_app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=False,  # must be False when allow_origins=["*"]
            allow_methods=["*"],
            allow_headers=["*"],
        )

        @web_app.get("/health")
        def health():
            return {"ok": True}

        @web_app.post("/ingest", response_model=IngestResponse)
        def ingest(req: IngestRequest) -> IngestResponse:
            # `def`, not `async def`. FastAPI runs sync path operations in a
            # threadpool, so the blocking Upstash REST calls and the blocking
            # YOLO forward pass never stall the event loop. This is deliberate
            # and it is what makes the per-thread lazy Redis client correct.
            return self._handle(req)

        return web_app

    # --------------------------------------------------------------- HANDLER
    def _handle(self, req: IngestRequest) -> IngestResponse:
        """The ordering below is load-bearing. Do not rearrange."""
        from PIL import Image

        # 1. Decode. W/H come from the DECODED image, never a constant.
        frame = Image.open(io.BytesIO(base64.b64decode(req.frame_b64))).convert("RGB")
        W, H = frame.size

        # 2. ONE forward pass. Drawn boxes, target boxes and hazards all come
        #    out of it. NMS is deliberately left CLASS-AWARE: the synonym
        #    pile-up a wide vocabulary produces is cleaned in
        #    `_dedupe_for_display`, which unlike agnostic NMS will not throw
        #    away a person or a bus to keep a coat. See that function.
        result = self.model(
            frame,
            verbose=False,
            conf=DRAW_CONF_MIN,
            iou=0.5,
            max_det=MAX_RAW_BOXES,
        )[0]

        # 3. Partition the boxes. Every box above the draw threshold becomes a
        #    Detection; the best target box drives the arrival machine, and the
        #    subset carrying a coarse kind drives the hazard signal. All three
        #    read from the same pass — a box is never re-derived.
        best_box = None
        best_conf = 0.0
        detections: list[Detection] = []
        hazards: list[Hazard] = []

        for box in result.boxes or []:
            cls_id = int(box.cls)
            conf = float(box.conf)
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            bearing = _bearing((x1 + x2) / 2.0, W)
            is_target = cls_id in self.target_idx
            kind = self.hazard_kind.get(cls_id)

            if is_target and conf > best_conf:
                best_box, best_conf = box, conf

            detections.append(
                Detection(
                    label=self.labels[cls_id] if cls_id < len(self.labels) else "?",
                    box=[
                        round(x1 / W, 4),
                        round(y1 / H, 4),
                        round(x2 / W, 4),
                        round(y2 / H, 4),
                    ],
                    confidence=round(conf, 3),
                    bearing=bearing,
                    kind=kind,
                    target=is_target,
                )
            )

            if kind is not None and conf >= CONF_MIN:
                hazards.append(
                    Hazard(kind=kind, bearing=bearing, confidence=round(conf, 3))
                )

        # Sort BEFORE deduping: the collapse keeps the first box it sees in a
        # cluster, which is only the right one if the list is confidence-ordered.
        # Hazards and the target are taken from the loop above, so neither is
        # affected by what the display collapse removes.
        detections.sort(key=lambda d: d.confidence, reverse=True)
        detections = _dedupe_for_display(detections)
        del detections[MAX_DETECTIONS:]
        hazards.sort(key=lambda h: h.confidence, reverse=True)
        seen = best_box is not None and best_conf >= CONF_MIN

        # 4. The atomic state machine. `eval`, not `evalsha`: no script_load at
        #    startup and no NOSCRIPT retry path to get wrong.
        raw_event, raw_present, raw_arrival = _redis().eval(
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
        event = str(raw_event)
        present = bool(_to_int(raw_present))
        arrival_id = _to_int(raw_arrival)

        # 5. Hazards. TTL 5 s: if the phone stops posting they evaporate rather
        #    than going stale and lying. Advisory, so never fatal to the ingest.
        try:
            _set_ex(
                f"hazards:{req.session_id}",
                json.dumps([h.model_dump() for h in hazards]),
                HAZARD_TTL_S,
            )
        except Exception as exc:  # noqa: BLE001
            print(f"[hazard] write skipped: {exc!r}")

        # 6. The fire-once latch. Exactly one container reaches this per
        #    arrival — that is what bounds the Claude spend.
        if event == "TARGET_ARRIVED":
            # Clear the previous arrival's reading before announcing this one.
            # SIGNAL FIRST on teardown (the mirror of payload-first on write):
            # zeroing reading_for makes reading_ready false immediately, so no
            # poll can observe arrival N-1's route attached to arrival N.
            _set_ex(READING_FOR_KEY, "0", STATE_TTL_S)  # ← signal down, FIRST
            _set_ex(READING_KEY, "null", STATE_TTL_S)
            _set_ex(VOTES_KEY, "[]", STATE_TTL_S)

            xyxy = None
            if best_box is not None and not req.force:
                xyxy = tuple(best_box.xyxy[0].tolist())
            crop_jpeg = _crop_text_region(frame, xyxy)
            print(
                f"[latch] TARGET_ARRIVED arrival_id={arrival_id} conf={best_conf:.3f} "
                f"crop={len(crop_jpeg)}B force={req.force} frame={W}x{H}"
            )
            # DO NOT BLOCK ON THIS.
            threading.Thread(
                target=_ocr_worker, args=(crop_jpeg, arrival_id), daemon=True
            ).start()

        # 7. Read back whatever the OCR worker has published — possibly from a
        #    different container. This step is the one most likely to be
        #    skipped, and skipping it means the reading is written by
        #    container A and never seen by the phone polling container B.
        raw_reading, raw_for, raw_votes = _mget(
            [READING_KEY, READING_FOR_KEY, VOTES_KEY]
        )
        reading_for = _to_int(raw_for)
        reading_ready = reading_for == arrival_id and arrival_id > 0

        reading: Optional[Reading] = None
        reading_dict = _from_json(raw_reading)
        if isinstance(reading_dict, dict):
            try:
                reading = Reading(**reading_dict)
            except Exception as exc:  # noqa: BLE001
                print(f"[state] malformed det:reading discarded: {exc!r}")

        votes = [str(v) for v in _from_json(raw_votes, []) or []]

        # 8. Contract A.
        return IngestResponse(
            event=event,
            present=present,
            confidence=round(best_conf, 3),
            arrival_id=arrival_id,
            reading=reading,
            reading_ready=reading_ready,
            votes=votes,
            hazards=hazards,
            detections=detections,
            session_id=req.session_id,
        )
