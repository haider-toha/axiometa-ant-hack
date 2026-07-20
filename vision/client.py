#!/usr/bin/env python3
"""Local test client for the Modal vision service.

Captures from an attached camera at 2 fps, POSTs each frame to the Modal
`/ingest` endpoint, and forwards detection events to the Vercel relay on change.
Equivalent to the phone capture page (`app/src/app/capture/page.tsx`), for
driving the service from a terminal instead of a phone browser.

Run
    pip install -r vision/requirements-client.txt
    export MODAL_URL="https://<workspace>--vision-service.modal.run/ingest"
    export VERCEL_URL="https://tacta.space"   # optional
    python vision/client.py

With VERCEL_URL unset it runs dry: the full state machine still advances and
every event it would have posted is printed.

Keys
    SPACE    force=true on the next frame
    q / ESC  quit

Contracts
    A   client -> Modal    POST $MODAL_URL
        {frame_b64, session_id, force} -> IngestResponse
    B   client -> Vercel   POST $VERCEL_URL/api/event
        {pattern, route, dest, conf, arrivalId}.  Edge-triggered: an unchanged
        state is never re-posted, because the relay fires the haptic on `seq`
        and a duplicate post would re-fire it.

Run one capture source at a time.  The Redis arrival keys (`det:hits`,
`det:misses`, `det:present`, `det:arrival_id`) are global rather than
session-scoped, so two live sources share one arrival latch and both post to
/api/event.  The `client-` prefix on `session_id` makes this traffic
identifiable if it happens anyway.

Dependencies: `opencv-python` plus the standard library.  HTTP is stdlib
`urllib` on purpose, so opencv is the single thing anyone has to install.
"""

from __future__ import annotations

import base64
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from dataclasses import dataclass, field

import cv2

# --------------------------------------------------------------------------
# Hardcoded demo constants.  Deliberately module constants: there is no CLI,
# no config file and no tuning env var.  The only environment inputs are the
# two URLs, which are deployment addresses rather than behaviour knobs.
# --------------------------------------------------------------------------

DEMO_ROUTE = "88"                    # the route the locked demo expects
DEMO_DEST = "Clapham Common"         # ditto; also the `dest` fallback below

CAPTURE_FPS = 2.0
PERIOD_S = 1.0 / CAPTURE_FPS         # 500 ms
FRAME_W, FRAME_H = 1280, 720
JPEG_QUALITY = 85

MODAL_TIMEOUT_S = 4.0                # warm round trip is ~120-360 ms; 4 s
                                     # absorbs a hiccup and still bounds the
                                     # stall
EVENT_TIMEOUT_S = 3.0
MODAL_FAILS_TO_ERROR = 3             # 1.5 s of silence before we tell the
                                     # device the system is degraded
MAX_PENDING_EDGES = 8
MAX_READ_FAILS = 20                  # ~10 s of a dead camera, then give up

# Contract B — CloudPattern.  The five device-local patterns (READY, DANGER,
# SIREN, ATTENTION, PROXIMITY, ACK) never cross the wire and are absent here.
PAT_NONE = "NONE"
PAT_BUS = "BUS"          # Contract B value — consumed by app/ and firmware/
PAT_NUMBER = "NUMBER"
PAT_WAIT = "WAIT"
PAT_UNKNOWN = "UNKNOWN"
PAT_ERROR = "ERROR"

# Contract A — detector events.
EV_NONE = "NONE"
EV_ARRIVED = "TARGET_ARRIVED"
EV_GONE = "TARGET_GONE"
_EVENTS = (EV_NONE, EV_ARRIVED, EV_GONE)


# --------------------------------------------------------------------------
# Contract A — the response half (`IngestResponse`).
# Parsing is deliberately defensive: a malformed or half-deployed endpoint
# must degrade to a usable frame, never take the loop down.
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class Reading:
    """Claude's answer.  `confidence` is lowercased on parse -- the structured
    output docs warn the model may differ in capitalisation from the enum."""

    route: str
    destination: str
    confidence: str


@dataclass(frozen=True)
class Hazard:
    """A non-target detection from the same YOLO forward pass.

    Hazards drive the device-local navigation patterns, which have no
    CloudPattern, so nothing here crosses Contract B.  Parsed and displayed
    so they are visible while testing.
    """

    kind: str
    bearing: str
    confidence: float


@dataclass(frozen=True)
class DetectorFrame:
    """One `IngestResponse`, coerced."""

    event: str = EV_NONE
    present: bool = False
    confidence: float = 0.0
    arrival_id: int = 0
    reading: Reading | None = None
    reading_ready: bool = False
    votes: list[str] = field(default_factory=list)
    hazards: list[Hazard] = field(default_factory=list)
    session_id: str = ""

    @classmethod
    def from_json(cls, payload: object) -> "DetectorFrame":
        d = payload if isinstance(payload, dict) else {}

        raw_reading = d.get("reading")
        reading = None
        if isinstance(raw_reading, dict):
            reading = Reading(
                route=str(raw_reading.get("route") or "").strip(),
                destination=str(raw_reading.get("destination") or "").strip(),
                confidence=str(raw_reading.get("confidence") or "").strip().lower(),
            )

        hazards: list[Hazard] = []
        for item in d.get("hazards") or []:
            if not isinstance(item, dict):
                continue
            hazards.append(
                Hazard(
                    kind=str(item.get("kind") or "?"),
                    bearing=str(item.get("bearing") or "?"),
                    confidence=_as_float(item.get("confidence")),
                )
            )

        event = str(d.get("event") or EV_NONE)
        if event not in _EVENTS:
            event = EV_NONE

        return cls(
            event=event,
            present=bool(d.get("present")),
            confidence=_as_float(d.get("confidence")),
            arrival_id=_as_int(d.get("arrival_id")),
            reading=reading,
            reading_ready=bool(d.get("reading_ready")),
            votes=[str(v) for v in (d.get("votes") or []) if v is not None],
            hazards=hazards,
            session_id=str(d.get("session_id") or ""),
        )


def _as_float(value: object) -> float:
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0.0


def _as_int(value: object) -> int:
    try:
        return int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0


# --------------------------------------------------------------------------
# Contract B — the request we send to the relay.
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class EventRequest:
    """Contract B body.  Frozen so `==` is the edge trigger: two frames that
    mean the same thing compare equal and the second one is never posted."""

    pattern: str
    route: str
    dest: str
    conf: str
    arrival_id: int

    def body(self) -> dict:
        """The wire shape, written out literally so it can be diffed by eye.
        `arrivalId` is camelCase; the other four are lowercase."""
        return {
            "pattern": self.pattern,
            "route": self.route,
            "dest": self.dest,
            "conf": self.conf,
            "arrivalId": self.arrival_id,
        }


def _plain(pattern: str, arrival_id: int) -> EventRequest:
    """A payload-free pattern.  Contract B: `route` is "" unless the pattern
    is NUMBER, and `conf` is "" when there is no reading to be confident in."""
    return EventRequest(pattern=pattern, route="", dest="", conf="", arrival_id=arrival_id)


def steady_state(frame: DetectorFrame) -> EventRequest:
    """Map one detector frame to the Contract B *level* it implies.

    Pure -- no I/O, no globals -- because this is the part worth reasoning
    about.  `present` is tested before `reading_ready` on purpose: the reading
    keys outlive the arrival (900 s TTL) so a ready reading must not pin the
    device to NUMBER after the target has gone.

        not present                     -> NONE
        present, reading not ready      -> WAIT
        present, ready, high confidence -> NUMBER  (route verbatim)
        present, ready, anything else   -> UNKNOWN
    """
    if not frame.present:
        return _plain(PAT_NONE, frame.arrival_id)

    if not frame.reading_ready:
        return _plain(PAT_WAIT, frame.arrival_id)

    reading = frame.reading
    if reading is None:
        # `reading_ready` true with a null reading means the OCR worker wrote
        # its signal before its payload.
        return _plain(PAT_UNKNOWN, frame.arrival_id)
    if reading.confidence != "high":
        return _plain(PAT_UNKNOWN, frame.arrival_id)
    if not reading.route:
        # NUMBER with an empty route is self-contradictory and would hand the
        # quinary encoder nothing to encode.  Note this is NOT a ROUTE_RE
        # check -- a non-digit route like "N3" is passed through verbatim and
        # rejected by /api/event, so the debug screen shows what was read
        # so the debug screen shows what was read.  Do not filter it twice.
        return _plain(PAT_UNKNOWN, frame.arrival_id)

    return EventRequest(
        pattern=PAT_NUMBER,
        route=reading.route,                    # verbatim; never fabricated
        dest=reading.destination or DEMO_DEST,  # debug-screen only, so a
                                                # fallback here is harmless
        conf="high",
        arrival_id=frame.arrival_id,
    )


# --------------------------------------------------------------------------
# HTTP.  Stdlib only, and it never raises: every failure comes back as a
# string so the caller's loop survives it.
# --------------------------------------------------------------------------


def post_json(
    url: str, payload: dict, timeout: float, parse_response: bool = True
) -> tuple[dict | None, str, float]:
    """POST JSON.  Returns (parsed | None, error, elapsed_ms).

    `parse_response=False` means any 2xx counts as success and the body is
    ignored -- used for /api/event, which we only need to have *accepted* the
    post.  A relay that answers 204, or plain text, must not look like a
    failure and be retried forever.
    """
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    start = time.perf_counter()
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read()
        elapsed = (time.perf_counter() - start) * 1000.0
        if not parse_response:
            return {}, "", elapsed
        try:
            return json.loads(raw.decode("utf-8")), "", elapsed
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            return None, f"bad JSON ({exc})", elapsed
    except urllib.error.HTTPError as exc:  # subclass of URLError -- catch first
        elapsed = (time.perf_counter() - start) * 1000.0
        try:
            detail = exc.read()[:160].decode("utf-8", "replace").replace("\n", " ")
        except Exception:  # noqa: BLE001 - the error path must not raise
            detail = ""
        return None, f"HTTP {exc.code} {detail}".strip(), elapsed
    except Exception as exc:  # noqa: BLE001 - DNS, TLS, timeout, reset, ...
        elapsed = (time.perf_counter() - start) * 1000.0
        return None, f"{type(exc).__name__}: {exc}", elapsed


def modal_endpoint(raw: str) -> str:
    """Normalise MODAL_URL.

    The value is the URL printed by `modal deploy`, plus `/ingest`.
    A bare origin is the likely mistake, so a bare origin gets `/ingest`
    appended; any other path is respected verbatim.
    """
    url = (raw or "").strip().rstrip("/")
    if not url:
        return ""
    if "://" not in url:
        url = "https://" + url
    parts = urllib.parse.urlsplit(url)
    if parts.path in ("", "/"):
        url = urllib.parse.urlunsplit(parts._replace(path="/ingest"))
    return url


def event_endpoint(raw: str) -> str:
    """Normalise VERCEL_URL into the `/api/event` address.  Vercel's own
    VERCEL_URL convention is a bare host with no scheme, so one is added."""
    url = (raw or "").strip().rstrip("/")
    if not url:
        return ""
    if "://" not in url:
        url = "https://" + url
    if url.endswith("/api/event"):
        return url
    return url + "/api/event"


# --------------------------------------------------------------------------
# Keys.  SPACE is the disclosed manual trigger.
# --------------------------------------------------------------------------


class KeyReader:
    """SPACE / q / ESC, read from an OpenCV preview window when one can be
    opened, and from the terminal otherwise.

    The terminal fallback uses cbreak rather than raw mode on purpose: cbreak
    leaves ISIG enabled, so Ctrl-C still raises KeyboardInterrupt and the
    graceful shutdown path still runs.  The saved termios state is restored in
    `close()`, which the caller must call from a `finally` -- otherwise the
    operator is left with a terminal that does not echo.
    """

    WINDOW = "vision client  [SPACE] force   [q] quit"

    def __init__(self) -> None:
        self.gui = False
        self._termios = None
        self._fd: int | None = None
        self._saved = None
        try:
            cv2.namedWindow(self.WINDOW, cv2.WINDOW_NORMAL)
            self.gui = True
        except Exception as exc:  # noqa: BLE001 - headless opencv build, no DISPLAY
            print(f"[client] no preview window ({type(exc).__name__}); using terminal keys.")
        if not self.gui:
            self._open_tty()

    def _open_tty(self) -> None:
        try:
            import termios
            import tty

            if not sys.stdin.isatty():
                print("[client] stdin is not a tty; SPACE trigger unavailable.")
                return
            self._termios = termios
            self._fd = sys.stdin.fileno()
            self._saved = termios.tcgetattr(self._fd)
            tty.setcbreak(self._fd)
        except Exception as exc:  # noqa: BLE001 - non-POSIX, or no controlling tty
            self._fd = None
            print(f"[client] terminal keys unavailable ({type(exc).__name__}).")

    def show(self, frame, overlay: str) -> None:
        """Render the preview.  Draws on the frame AFTER it was encoded, so
        the overlay never reaches Modal."""
        if not self.gui:
            return
        try:
            cv2.putText(frame, overlay, (14, 34), cv2.FONT_HERSHEY_SIMPLEX,
                        0.8, (0, 255, 0), 2, cv2.LINE_AA)
            cv2.imshow(self.WINDOW, frame)
        except Exception:  # noqa: BLE001 - window closed under us
            self.gui = False

    def poll(self) -> str:
        """Keys pressed since the last call, as a string ('' if none)."""
        pressed = ""
        if self.gui:
            try:
                code = cv2.waitKey(1) & 0xFF
            except Exception:  # noqa: BLE001
                self.gui = False
                return ""
            if code != 255:
                if 32 <= code <= 126:
                    pressed += chr(code)
                elif code == 27:
                    pressed += "\x1b"
        elif self._fd is not None:
            import select

            while select.select([sys.stdin], [], [], 0)[0]:
                char = sys.stdin.read(1)
                if not char:
                    break
                pressed += char
        return pressed

    def close(self) -> None:
        if self._fd is not None and self._saved is not None and self._termios is not None:
            try:
                self._termios.tcsetattr(self._fd, self._termios.TCSADRAIN, self._saved)
            except Exception:  # noqa: BLE001
                pass
        self._fd = None
        try:
            cv2.destroyAllWindows()
        except Exception:  # noqa: BLE001
            pass


# --------------------------------------------------------------------------
# The loop.
# --------------------------------------------------------------------------


def _hazard_note(hazards: list[Hazard]) -> str:
    if not hazards:
        return ""
    top = max(hazards, key=lambda h: h.confidence)
    return f"  [{top.kind}@{top.bearing} {top.confidence:.2f}]"


def main() -> int:
    ingest_url = modal_endpoint(os.environ.get("MODAL_URL", ""))
    if not ingest_url:
        print(
            "MODAL_URL is not set.\n"
            '  export MODAL_URL="https://<workspace>--vision-service.modal.run/ingest"\n'
            "Paste the URL printed by `modal deploy` -- do not construct it.",
            file=sys.stderr,
        )
        return 2

    relay_url = event_endpoint(os.environ.get("VERCEL_URL", ""))
    dry_run = not relay_url
    session_id = f"client-{uuid.uuid4().hex[:12]}"

    print(f"[client] ingest  {ingest_url}")
    print(f"[client] relay   {relay_url or '(VERCEL_URL unset -- dry run, nothing is posted)'}")
    print(f"[client] session {session_id}")
    print(f"[client] expecting route {DEMO_ROUTE!r} -> {DEMO_DEST!r} at {CAPTURE_FPS:.0f} fps")

    capture = cv2.VideoCapture(0)
    capture.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_W)
    capture.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_H)
    capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)   # advisory; ignored by some backends
    if not capture.isOpened():
        print("[client] cv2.VideoCapture(0) would not open. Camera busy or no permission.",
              file=sys.stderr)
        capture.release()
        return 3

    keys = KeyReader()

    # --- state ---------------------------------------------------------
    last_sent: EventRequest | None = None    # the edge trigger's memory
    pending_edges: list[EventRequest] = []   # an arrival is an edge and must not
                                             # be dropped; it survives a failed
                                             # POST and is retried next frame
    level: EventRequest | None = None        # the current steady state
    force_armed = False
    modal_fails = 0
    read_fails = 0
    frame_no = 0
    posted = 0
    warned_session = False
    warned_ordering = False

    next_tick = time.monotonic()
    last_tick = next_tick

    try:
        while True:
            now = time.monotonic()
            observed_fps = 1.0 / (now - last_tick) if now > last_tick else 0.0
            last_tick = now
            next_tick += PERIOD_S
            frame_no += 1

            ok, raw_frame = capture.read()
            if not ok or raw_frame is None:
                read_fails += 1
                print(f"[client] frame read failed ({read_fails}/{MAX_READ_FAILS})", flush=True)
                if read_fails >= MAX_READ_FAILS:
                    print("[client] camera is gone; stopping.", file=sys.stderr)
                    break
                _sleep_to(next_tick)
                continue
            read_fails = 0

            # Capture-size requests are advisory, so normalise here rather
            # than trusting the camera.  Modal derives frame thirds from the
            # decoded size, so this is about keeping the wire shape as
            # documented, not about the math.
            if raw_frame.shape[0] != FRAME_H or raw_frame.shape[1] != FRAME_W:
                frame = cv2.resize(raw_frame, (FRAME_W, FRAME_H), interpolation=cv2.INTER_AREA)
            else:
                frame = raw_frame

            encoded_ok, buffer = cv2.imencode(
                ".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY]
            )
            if not encoded_ok:
                print("[client] JPEG encode failed; skipping frame", flush=True)
                _sleep_to(next_tick)
                continue
            frame_b64 = base64.b64encode(buffer.tobytes()).decode("ascii")

            # Contract A request.  `force` is consumed on attempt, not on
            # success: a queued force would fire an extra arrival later, which
            # is worse on stage than the operator pressing SPACE again.
            sending_force = force_armed
            force_armed = False
            response, error, latency_ms = post_json(
                ingest_url,
                {"frame_b64": frame_b64, "session_id": session_id, "force": sending_force},
                MODAL_TIMEOUT_S,
            )

            detector: DetectorFrame | None = None
            if response is None:
                modal_fails += 1
                if modal_fails >= MODAL_FAILS_TO_ERROR:
                    # Tell the device the system is degraded rather than
                    # leaving it sitting on a stale NUMBER.  Edge-triggered
                    # like everything else, so this posts exactly once.
                    level = _plain(PAT_ERROR, last_sent.arrival_id if last_sent else 0)
            else:
                modal_fails = 0
                detector = DetectorFrame.from_json(response)

                if detector.session_id and detector.session_id != session_id and not warned_session:
                    warned_session = True
                    print(f"[client] WARNING session echo {detector.session_id!r} "
                          f"!= {session_id!r}", flush=True)
                if detector.reading_ready and detector.reading is None and not warned_ordering:
                    warned_ordering = True
                    print("[client] WARNING reading_ready with a null reading -- the OCR "
                          "worker wrote det:reading_for before det:reading "
                          "(payload-before-signal).", flush=True)

                if detector.event == EV_ARRIVED:
                    arrival = _plain(PAT_BUS, detector.arrival_id)
                    if arrival not in pending_edges and len(pending_edges) < MAX_PENDING_EDGES:
                        pending_edges.append(arrival)
                level = steady_state(detector)

            # --- drain, edge-triggered ---------------------------------
            # Edges first and in order, then the level.  A failed POST does not
            # advance `last_sent`, so the same event is retried on the next
            # frame instead of being silently lost.
            sent: list[str] = []
            blocked = False
            while pending_edges and not blocked:
                event = pending_edges[0]
                if event == last_sent:
                    pending_edges.pop(0)
                    continue
                if _post_event(relay_url, event, dry_run):
                    last_sent = event
                    posted += 1
                    sent.append(event.pattern)
                    pending_edges.pop(0)
                else:
                    blocked = True

            if not blocked and level is not None and level != last_sent:
                if _post_event(relay_url, level, dry_run):
                    last_sent = level
                    posted += 1
                    sent.append(level.pattern)

            # --- one line per frame ------------------------------------
            if detector is None:
                body = "ev=?            pres=- conf=---- aid=- rdy=- haz=-"
                tail = f"  ! {error}"
            else:
                body = (
                    f"ev={detector.event:<12} pres={int(detector.present)} "
                    f"conf={detector.confidence:.2f} aid={detector.arrival_id} "
                    f"rdy={int(detector.reading_ready)} haz={len(detector.hazards)}"
                )
                tail = _hazard_note(detector.hazards)
            latency = f"{latency_ms:4.0f}ms" if response is not None else "  --ms"
            label = ">".join(sent) if sent else "-"
            if sent and dry_run:
                label += "(dry)"
            flag = " FORCE" if sending_force else ""
            print(f"f#{frame_no:04d} {observed_fps:4.1f}fps {latency}  {body}  "
                  f"sent={label}{flag}{tail}", flush=True)

            keys.show(frame, f"{(last_sent.pattern if last_sent else PAT_NONE)}"
                             f"{'  FORCE ARMED' if force_armed else ''}")
            pressed = keys.poll()
            if " " in pressed:
                force_armed = True
                print("[client] SPACE -- force=true on the next frame (disclosed manual "
                      "trigger)", flush=True)
            if "q" in pressed or "\x1b" in pressed:
                print("[client] quit key", flush=True)
                break

            _sleep_to(next_tick)
            if time.monotonic() - next_tick > PERIOD_S:
                next_tick = time.monotonic()   # fell far behind; re-baseline

    except KeyboardInterrupt:
        print("\n[client] interrupted", flush=True)
    finally:
        capture.release()
        keys.close()

    print(f"[client] {frame_no} frames, {posted} events posted, "
          f"final={last_sent.pattern if last_sent else '-'}")
    return 0


def _post_event(relay_url: str, event: EventRequest, dry_run: bool) -> bool:
    """POST one Contract B event.  Returns True when the relay accepted it (or
    when there is no relay configured, so the state machine still advances and
    a Modal-only smoke test shows the full sequence)."""
    if dry_run:
        print(f"[client] DRY {json.dumps(event.body())}", flush=True)
        return True
    response, error, _ = post_json(
        relay_url, event.body(), EVENT_TIMEOUT_S, parse_response=False
    )
    if response is None:
        print(f"[client] /api/event {event.pattern} failed: {error} (will retry)", flush=True)
        return False
    return True


def _sleep_to(deadline: float) -> None:
    remaining = deadline - time.monotonic()
    if remaining > 0:
        time.sleep(remaining)


if __name__ == "__main__":
    raise SystemExit(main())
