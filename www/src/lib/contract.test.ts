// The wire contract, exercised. Implements the 14-row `contract.ts` case table
// in audit/bus-stop-situational-awareness/15-implementation-plan.md.
//
// Two rows carry most of the value and should not be "simplified" away:
//
//   Row 10 — `normActivitySeq(Date.now())` clamps to the uint32 ceiling. A raw ms
//   epoch is ~414x that ceiling; shipping one fails ArduinoJson's `is<uint32_t>()`
//   and the board skips the ENTIRE activity block, with no error on either side,
//   until it reboots. This is the executable form of that hazard.
//
//   Row 13 — `activity` stays off `EventRequest`. Activity is versioned
//   independently through POST /api/activity and `activitySeq`; it is not carried
//   on /api/event, and an activity heartbeat must never re-fire a pattern.
//
// The navigation sections (`isCloudPattern`, `bearingToPattern`, and
// `sameEvent > navigation patterns`) were added when LEFT/RIGHT/AHEAD joined the
// wire. Their load-bearing row is "posts once per bearing change across a run of
// capture ticks": nav patterns are 800–1000 ms step tables read at a ~500 ms
// capture tick, so an edge-trigger that stops edge-triggering does not merely
// spam the board — it truncates every nav pattern at ~500 ms, permanently, and
// LEFT and RIGHT stop being distinguishable from each other.
//
// Nothing here touches Redis. `redis.ts` builds `Redis.fromEnv()` at module
// scope, so an uncredentialed import burns ~4.3 s of retry backoff per command
// and a credentialed one mutates the demo state the ESP32 is polling. The wire
// round-trip is covered by the scripted smoke in the plan's §Deploy instead.
import { describe, expect, it } from "vitest";

import {
  ACTIVITY_SEQ_MAX,
  CLOUD_PATTERNS,
  bearingToPattern,
  chooseEvent,
  detectorToEvent,
  isCloudPattern,
  isUserActivity,
  navEvent,
  normActivity,
  normActivitySeq,
  sameEvent,
  type Bearing,
  type CloudPattern,
  type EventRequest,
  type ModalReading,
  type ModalResponse,
} from "@/lib/contract";

// --- fixtures --------------------------------------------------------------

/**
 * Exactly ArduinoJson's `is<uint32_t>()` predicate — the gate the whole activity
 * block passes or silently disappears through. [14 §"Precisely, the delta is"]
 *
 * The literal is spelled out rather than reusing `ACTIVITY_SEQ_MAX`, on purpose:
 * the constant is itself under test, and a predicate defined in terms of it
 * would pass no matter what anyone changed it to.
 */
const isUint32 = (v: number) => Number.isInteger(v) && v >= 0 && v <= 4294967295;

/**
 * Everything that is NOT a wire-legal activity value.
 *
 * The board does `strcmp(value, "STILL")` / `strcmp(value, "MOVING")` in
 * `parseUserActivity()` and maps everything else — including nullptr — to
 * `UserActivity::UNKNOWN`. So the relay's guard has to be exactly as intolerant
 * as the board's, case included.
 */
const NOT_ACTIVITY: { label: string; value: unknown }[] = [
  { label: 'lowercase "still"', value: "still" },
  { label: 'title-case "Still"', value: "Still" },
  { label: 'lowercase "moving"', value: "moving" },
  { label: '" STILL" with a leading space', value: " STILL" },
  { label: '"MOVING " with a trailing space', value: "MOVING " },
  { label: 'a different vocabulary ("WALKING")', value: "WALKING" },
  { label: "the empty string", value: "" },
  { label: "null", value: null },
  { label: "undefined", value: undefined },
  { label: "the number 42", value: 42 },
  // The firmware enum is `{ UNKNOWN = 0, MOVING, STILL }`, so STILL is ordinal
  // 2 — and it was reordered once already when the enum moved out of
  // navigation_pure.h. Serialising the ordinal instead of the string would be a
  // plausible-looking mistake that silently means UNKNOWN on the wire.
  { label: "the firmware enum ordinal for STILL (2)", value: 2 },
  { label: "an object", value: {} },
  { label: 'an array wrapping ["STILL"]', value: ["STILL"] },
  { label: "true", value: true },
];

/** Every input `normActivitySeq` must floor at 0. */
const SEQ_TO_ZERO: { label: string; value: unknown }[] = [
  { label: "-1", value: -1 },
  { label: "a large negative", value: -4294967296 },
  { label: "NaN", value: NaN },
  { label: "Infinity", value: Infinity },
  { label: "-Infinity", value: -Infinity },
  { label: "null", value: null },
  { label: "undefined", value: undefined },
  { label: 'the non-numeric string "abc"', value: "abc" },
  { label: "an object", value: {} },
];

/** Rows 6–10 pooled, so row 11 can assert the bound over the whole table. */
const SEQ_INPUTS: unknown[] = [
  0,
  1,
  41,
  ACTIVITY_SEQ_MAX, // row 6
  ...SEQ_TO_ZERO.map((c) => c.value), // row 7
  "41", // row 8
  41.7, // row 9
  Date.now(),
  ACTIVITY_SEQ_MAX + 1, // row 10
];

/** A detector frame with nothing happening. Override one field per case. */
function modal(over: Partial<ModalResponse> = {}): ModalResponse {
  return {
    event: "NONE",
    present: false,
    confidence: 0,
    arrival_id: 0,
    reading: null,
    reading_ready: false,
    votes: [],
    hazards: [],
    detections: [],
    session_id: "test-session",
    ...over,
  };
}

/** The locked demo walk: route 88 to Clapham Common. */
const READING: ModalReading = { route: "88", destination: "Clapham Common", confidence: "high" };

const EVENT: EventRequest = {
  pattern: "NUMBER",
  route: "88",
  dest: "Clapham Common",
  conf: "high",
  arrivalId: 7,
};

/** The five fields of `EventRequest`, sorted. Activity is not among them. */
const EVENT_KEYS = ["arrivalId", "conf", "dest", "pattern", "route"];

// --- navigation fixtures ----------------------------------------------------

/**
 * A compile-time census of `CloudPattern`.
 *
 * `satisfies Record<CloudPattern, true>` fails in BOTH directions on an object
 * literal: a missing key is a missing `Record` property, an extra key is an
 * excess property. So this table cannot drift from the union. The runtime
 * assertions below then pin `CLOUD_PATTERNS` to this table, and the
 * `readonly CloudPattern[]` annotation on `CLOUD_PATTERNS` pins the last edge.
 * Together they make the union and the `/api/event` accept-list one list rather
 * than two that merely look alike — the drift being guarded against is a pattern
 * TypeScript calls legal that the route answers with 400 "unknown pattern".
 */
const EVERY_CLOUD_PATTERN = {
  NONE: true,
  BUS: true,
  NUMBER: true,
  WAIT: true,
  UNKNOWN: true,
  ERROR: true,
  LEFT: true,
  RIGHT: true,
  AHEAD: true,
} satisfies Record<CloudPattern, true>;

const ALL_CLOUD_PATTERNS = Object.keys(EVERY_CLOUD_PATTERN) as CloudPattern[];

/** The whole of `bearingToPattern`, as data. */
const NAV_CASES: { bearing: Bearing; pattern: CloudPattern }[] = [
  { bearing: "left", pattern: "LEFT" },
  { bearing: "center", pattern: "AHEAD" },
  { bearing: "right", pattern: "RIGHT" },
];

/**
 * A nav command shaped the way the capture page builds one: a pattern and the
 * latched arrival id, no route and no confidence. `arrivalId` rides along on
 * purpose — it is the field that can silently break the edge-trigger.
 */
const NAV: EventRequest = { pattern: "LEFT", route: "", dest: "", conf: "", arrivalId: 7 };

/**
 * Near-misses the board would reject, so the relay has to reject them too.
 *
 * `parseCloudCommand()` is a `strcmp` chain; anything not spelled exactly is
 * `CloudCommand::INVALID`. "STILL" and "MOVING" are in here because the activity
 * vocabulary travels the same wire on an adjacent channel, and a pattern field
 * carrying an activity value must fail loudly at the relay rather than reaching
 * a board that will quietly drop it.
 */
const NOT_A_PATTERN: unknown[] = [
  "left",
  "Left",
  "LEFT ",
  " LEFT",
  "right",
  "ahead",
  "Ahead",
  "CENTER",
  "CENTRE",
  "STRAIGHT",
  "FORWARD",
  "STILL",
  "MOVING",
  "",
  null,
  undefined,
  0,
  9,
  ["LEFT"],
  { pattern: "LEFT" },
  true,
];

// --- 1, 2: isUserActivity ---------------------------------------------------

describe("isUserActivity", () => {
  // Case 1 — these two strings are the entire wire vocabulary.
  it.each(["STILL", "MOVING"] as const)("accepts %s", (v) => {
    expect(isUserActivity(v)).toBe(true);
  });

  // Case 2 — case-sensitive, never normalised. A tolerant guard here would wave
  // a typo through to a board that is not tolerant.
  it.each(NOT_ACTIVITY)("rejects $label", ({ value }) => {
    expect(isUserActivity(value)).toBe(false);
  });
});

// --- 3, 4, 5: normActivity --------------------------------------------------

describe("normActivity", () => {
  // Case 3.
  it("passes STILL through", () => {
    expect(normActivity("STILL")).toBe("STILL");
  });

  // Case 4.
  it("passes MOVING through", () => {
    expect(normActivity("MOVING")).toBe("MOVING");
  });

  // Case 5 — the row this suite exists to record. The default is MOVING, NOT
  // STILL, which inverts audit 11 and issue #5. Both predate the firmware.
  //
  // `effectiveActivity()` in relay_pure.h returns MOVING when cloud activity is
  // UNKNOWN or its 120 s lease has expired, and `acceptsRelayCommand()` rejects
  // everything but NONE and ERROR unless activity is exactly STILL. So missing
  // activity means "show nothing" on the board, not "show bus info" — and the
  // relay has to fail in the same direction, or the two disagree about what
  // silence means. [14 §Conflict map]
  //
  // If someone ever "fixes" this back to STILL, an empty Redis would open the
  // bus gate on a walking user. That is the failure this row prevents.
  it.each(NOT_ACTIVITY)("resolves $label to MOVING, never STILL", ({ value }) => {
    expect(normActivity(value)).toBe("MOVING");
  });

  it("is total — every input yields a value the board can parse", () => {
    const corpus = [...NOT_ACTIVITY.map((c) => c.value), "STILL", "MOVING"];
    const illegal = corpus.filter((v) => !isUserActivity(normActivity(v)));
    expect(illegal).toEqual([]);
  });
});

// --- 6 – 12: normActivitySeq ------------------------------------------------

describe("normActivitySeq", () => {
  it("pins the ceiling at the ArduinoJson uint32 maximum", () => {
    expect(ACTIVITY_SEQ_MAX).toBe(4294967295);
    expect(ACTIVITY_SEQ_MAX).toBe(2 ** 32 - 1);
  });

  // Case 6 — identity across the legal range, the ceiling itself included.
  it.each([0, 1, 41, ACTIVITY_SEQ_MAX])("passes %i through unchanged", (v) => {
    expect(normActivitySeq(v)).toBe(v);
  });

  // Case 7 — anything unusable floors at 0, which is also the board's
  // non-rendering baseline, so a garbage value cannot fire a stale gate.
  it.each(SEQ_TO_ZERO)("floors $label at 0", ({ value }) => {
    expect(normActivitySeq(value)).toBe(0);
  });

  // Case 8 — Upstash deserialises a stored integer back as a string often
  // enough that `readCommand()` already has to `String(...)` the route.
  it("coerces a numeric string, because Upstash may hand one back", () => {
    expect(normActivitySeq("41")).toBe(41);
  });

  // Case 9 — a JSON float fails `is<uint32_t>()` just as surely as a timestamp.
  it("truncates a fraction to an integer", () => {
    expect(normActivitySeq(41.7)).toBe(41);
    expect(normActivitySeq(0.9)).toBe(0);
  });

  // Case 10 — THE row. The single easiest way to silently kill this feature is
  // to store `Date.now()` in `activitySeq`. The board would then fail
  // `responseDocument["activitySeq"].is<uint32_t>()`, skip the whole activity
  // block — activity string included — log nothing, and sit on its MOVING
  // fallback until reboot. The relay would look perfectly healthy over curl.
  it("clamps Date.now() to the uint32 ceiling", () => {
    const now = Date.now();

    // The premise, asserted rather than assumed: a ms epoch is ~1.78e12, some
    // 414x the ceiling. If that ever stopped being true the clamp would be moot.
    expect(now).toBeGreaterThan(ACTIVITY_SEQ_MAX);

    expect(normActivitySeq(now)).toBe(ACTIVITY_SEQ_MAX);

    // Clamping rather than passing through is what keeps the field TYPE-valid.
    // Both failure modes end with the board on its MOVING fallback after the
    // lease, but a clamped value still parses, so the shape stays debuggable.
    expect(isUint32(normActivitySeq(now))).toBe(true);
  });

  // The boundary either side of the clamp, so `>` can never drift to `>=`.
  it("clamps the first value past the ceiling and not the ceiling itself", () => {
    expect(normActivitySeq(ACTIVITY_SEQ_MAX)).toBe(ACTIVITY_SEQ_MAX);
    expect(normActivitySeq(ACTIVITY_SEQ_MAX + 1)).toBe(ACTIVITY_SEQ_MAX);
  });

  // Case 11 — the bound over the whole table, not just the interesting rows.
  it("emits a value satisfying is<uint32_t>() for every input in the table", () => {
    const violations = SEQ_INPUTS.filter((v) => !isUint32(normActivitySeq(v)));
    expect(violations).toEqual([]);
  });

  // Case 12 — the normaliser must not collapse distinct counter values. The
  // board fires on `activitySeq > lastActivitySeq`; two inputs mapping to one
  // output would stall that edge and freeze the gate at its last value.
  it("does not collapse distinct counter values", () => {
    const inputs = [0, 1, 2, 41, 4294967294, ACTIVITY_SEQ_MAX];
    const out = inputs.map((v) => normActivitySeq(v));

    expect(out).toEqual(inputs);
    for (let i = 1; i < out.length; i += 1) {
      expect(out[i]).toBeGreaterThan(out[i - 1]);
    }
  });
});

// --- isCloudPattern: the /api/event accept gate ------------------------------

describe("isCloudPattern", () => {
  it.each(ALL_CLOUD_PATTERNS)("accepts %s", (p) => {
    expect(isCloudPattern(p)).toBe(true);
  });

  // The three that navigation added. Called out separately from the sweep above
  // so a regression names the feature it broke instead of just a count.
  it.each(["LEFT", "RIGHT", "AHEAD"] as const)("accepts the nav pattern %s", (p) => {
    expect(isCloudPattern(p)).toBe(true);
  });

  it.each(NOT_A_PATTERN)("rejects %o", (v) => {
    expect(isCloudPattern(v)).toBe(false);
  });

  // The half `readonly CloudPattern[]` cannot check. If someone widens the union
  // and forgets the array, `/api/event` starts answering 400 "unknown pattern"
  // for a value the compiler is perfectly happy with — the phone logs a failed
  // POST, the board never hears the command, and nothing else complains.
  it("lists every CloudPattern in CLOUD_PATTERNS", () => {
    const missing = ALL_CLOUD_PATTERNS.filter((p) => !CLOUD_PATTERNS.includes(p));

    expect(missing).toEqual([]);
  });

  // And the reverse, so a stale entry cannot outlive its removal from the union.
  it("lists nothing in CLOUD_PATTERNS that is not a CloudPattern", () => {
    const extra = CLOUD_PATTERNS.filter((p) => !ALL_CLOUD_PATTERNS.includes(p));

    expect(extra).toEqual([]);
    expect(CLOUD_PATTERNS).toHaveLength(ALL_CLOUD_PATTERNS.length);
  });
});

// --- bearingToPattern: frame bearing → nav command ---------------------------

describe("bearingToPattern", () => {
  it.each(NAV_CASES)("maps $bearing to $pattern", ({ bearing, pattern }) => {
    expect(bearingToPattern(bearing)).toBe(pattern);
  });

  // "center" is AHEAD, not NONE. A bus dead ahead is still a thing to walk
  // toward, and silence at that moment reads as "no bus" to the user.
  it("maps center to AHEAD rather than to silence", () => {
    expect(bearingToPattern("center")).toBe("AHEAD");
  });

  // Total against the type, and total against the wire. The bearing originates
  // at Modal and crosses HTTP, where `Bearing` is a promise rather than a
  // guarantee, so the fallback has to exist and has to be the safe one: an
  // unreadable bearing degrades to "keep going", never to a confident turn. A
  // spurious LEFT sends a blind user toward the kerb.
  it.each([
    { label: "an unknown bearing string", value: "diagonal" },
    { label: "the empty string coerce.ts emits for no target", value: "" },
    { label: "null", value: null },
    { label: "undefined", value: undefined },
    { label: "an uppercase bearing", value: "LEFT" },
    { label: "a number", value: 0 },
  ])("degrades $label to AHEAD", ({ value }) => {
    expect(bearingToPattern(value as Bearing)).toBe("AHEAD");
  });

  // The join that matters: whatever this produces, /api/event must accept it.
  // Without this the translator and the gate are two independent widenings and
  // nothing proves they landed on the same three strings.
  it.each(NAV_CASES)("produces a pattern /api/event accepts for $bearing", ({ bearing }) => {
    expect(isCloudPattern(bearingToPattern(bearing))).toBe(true);
  });

  it("is pure — same bearing, same answer, no state between calls", () => {
    const first = NAV_CASES.map((c) => bearingToPattern(c.bearing));
    const second = NAV_CASES.map((c) => bearingToPattern(c.bearing));

    expect(first).toEqual(second);
  });

  it("never returns a bus-information pattern", () => {
    const nav = ["LEFT", "RIGHT", "AHEAD"];
    const leaked = NAV_CASES.map((c) => bearingToPattern(c.bearing)).filter(
      (p) => !nav.includes(p),
    );

    expect(leaked).toEqual([]);
  });
});

// --- 13: sameEvent, and the guard that activity stayed off the command path --

describe("sameEvent", () => {
  it("is true for two structurally identical events", () => {
    expect(sameEvent(EVENT, { ...EVENT })).toBe(true);
  });

  it.each([
    { label: "pattern", other: { ...EVENT, pattern: "UNKNOWN" } as EventRequest },
    { label: "route", other: { ...EVENT, route: "37" } },
    { label: "conf", other: { ...EVENT, conf: "low" } as EventRequest },
    { label: "arrivalId", other: { ...EVENT, arrivalId: 8 } },
  ])("is false when $label differs", ({ other }) => {
    expect(sameEvent(EVENT, other)).toBe(false);
  });

  // `dest` is the debug screen's field and the device ignores it, so a change
  // there is deliberately NOT a new event — re-firing a pattern on the wrist
  // because a destination string was re-read would be worse than a stale label.
  it("ignores dest, which the device never sees", () => {
    expect(sameEvent(EVENT, { ...EVENT, dest: "Brixton" })).toBe(true);
  });

  // Case 13 — the regression guard. `activity` is versioned independently via
  // POST /api/activity and `activitySeq`; it is NOT carried on /api/event.
  // Adding it to `EventRequest` would put activity back on the command path,
  // where an activity heartbeat bumps command `seq` and re-fires whatever
  // pattern was last published — every 30 seconds, on a wrist.
  //
  // `WithoutActivity` collapses to `never` the moment `activity` becomes a key
  // of `EventRequest`, required or optional, and this stops compiling.
  it("keeps activity off EventRequest entirely", () => {
    type WithoutActivity<T> = "activity" extends keyof T ? never : T;
    const command: WithoutActivity<EventRequest> = { ...EVENT };

    expect(Object.keys(command).sort()).toEqual(EVENT_KEYS);
  });

  it("compares only the four device-visible fields, whatever else rides along", () => {
    const still = { ...EVENT, activity: "STILL" } as unknown as EventRequest;
    const moving = { ...EVENT, activity: "MOVING" } as unknown as EventRequest;

    expect(sameEvent(still, moving)).toBe(true);
  });

  // --- navigation -----------------------------------------------------------
  //
  // For bus information the edge-trigger is hygiene: a re-fired NUMBER is
  // annoying. For navigation it is correctness. LEFT and RIGHT are 800 ms step
    // tables and AHEAD is 600 ms (firmware/braille_wearable/src/patterns.h),
  // against a ~500 ms capture tick. Re-post an unchanged bearing and `seq`
  // bumps, the board restarts the table at step 0, and no nav pattern ever
  // reaches its second pulse: LEFT and RIGHT both collapse to one continuous
  // buzz on one channel and stop being distinguishable — permanently, for as
  // long as the bearing holds, which is exactly when the user needs them.
  describe("navigation patterns", () => {
    // THE case. A held bearing must compare equal so the capture page stays
    // silent and the running pattern is allowed to finish.
    it("is true for a repeated identical nav command, so a held bearing never re-posts", () => {
      expect(sameEvent(NAV, { ...NAV })).toBe(true);
    });

    // …and a changed bearing must not, or the user is steered by a stale
    // command. Every ordered pair, not just LEFT → RIGHT.
    it.each(
      (["LEFT", "RIGHT", "AHEAD"] as const).flatMap((from) =>
        (["LEFT", "RIGHT", "AHEAD"] as const)
          .filter((to) => to !== from)
          .map((to) => ({ from, to })),
      ),
    )("is false for $from → $to, so the change posts", ({ from, to }) => {
      expect(sameEvent({ ...NAV, pattern: from }, { ...NAV, pattern: to })).toBe(false);
    });

    // The two halves of the vocabulary share one `seq`, so crossing between them
    // has to register as a change like any other.
    it.each(["NONE", "BUS", "NUMBER", "WAIT", "UNKNOWN", "ERROR"] as const)(
      "is false for LEFT → %s",
      (other) => {
        expect(sameEvent(NAV, { ...NAV, pattern: other })).toBe(false);
      },
    );

    it("ignores dest on a nav command too", () => {
      expect(sameEvent(NAV, { ...NAV, dest: "Clapham Common" })).toBe(true);
    });

    // The hazard this suite exists to pin. `sameEvent` compares arrivalId, which
    // is right for bus information — a new arrival is a new event. But it means
    // a caller that derives arrivalId from a frame counter, a tick index or
    // `Date.now()` makes EVERY tick a new event under a held bearing, and
    // reintroduces the truncation the edge-trigger prevents. The contract is not
    // "call sameEvent"; it is "call sameEvent AND hold route/conf/arrivalId
    // steady while the bearing is steady".
    it("treats a moving arrivalId under a held bearing as a new event", () => {
      expect(sameEvent({ ...NAV, arrivalId: 41 }, { ...NAV, arrivalId: 42 })).toBe(false);
    });

    it.each([
      { label: "route", other: { ...NAV, route: "88" } },
      { label: "conf", other: { ...NAV, conf: "high" } as EventRequest },
    ])("treats a moving $label under a held bearing as a new event", ({ other }) => {
      expect(sameEvent(NAV, other)).toBe(false);
    });

    // The whole loop Track B writes, run end to end: seven capture ticks, the
    // bearing changing twice, three POSTs. If this ever reports seven the demo
    // is a continuous buzz.
    it("posts once per bearing change across a run of capture ticks", () => {
      const ticks: Bearing[] = ["left", "left", "left", "left", "right", "right", "left"];
      const posted: CloudPattern[] = [];
      let last: EventRequest | null = null;

      for (const bearing of ticks) {
        const next: EventRequest = {
          pattern: bearingToPattern(bearing),
          route: "",
          dest: "",
          conf: "",
          arrivalId: NAV.arrivalId,
        };
        if (last === null || !sameEvent(last, next)) {
          posted.push(next.pattern);
          last = next;
        }
      }

      expect(posted).toEqual(["LEFT", "RIGHT", "LEFT"]);
    });

    // A nav command is an EventRequest and nothing more — no bearing field, no
    // activity field. Activity stays on its own independently versioned channel.
    it("carries exactly the five EventRequest fields", () => {
      expect(Object.keys(NAV).sort()).toEqual(EVENT_KEYS);
    });
  });
});

// --- 14: detectorToEvent, unchanged by the activity work --------------------

describe("detectorToEvent", () => {
  it("returns NONE for an idle frame", () => {
    expect(detectorToEvent(modal())).toEqual({
      pattern: "NONE",
      route: "",
      dest: "",
      conf: "",
      arrivalId: 0,
    });
  });

  it("maps the TARGET_ARRIVED edge to BUS", () => {
    expect(detectorToEvent(modal({ event: "TARGET_ARRIVED", present: true, arrival_id: 1 }))).toEqual(
      { pattern: "BUS", route: "", dest: "", conf: "", arrivalId: 1 },
    );
  });

  it("holds WAIT while an arrival is latched and the reading is pending", () => {
    expect(detectorToEvent(modal({ present: true, arrival_id: 1 }))).toEqual({
      pattern: "WAIT",
      route: "",
      dest: "",
      conf: "",
      arrivalId: 1,
    });
  });

  it("maps a high-confidence digit route to NUMBER, carrying dest through", () => {
    const m = modal({ reading_ready: true, reading: READING, present: true, arrival_id: 1 });

    expect(detectorToEvent(m)).toEqual({
      pattern: "NUMBER",
      route: "88",
      dest: "Clapham Common",
      conf: "high",
      arrivalId: 1,
    });
  });

  it.each(["8", "88", "088", "999"])("accepts the deliverable route %s", (route) => {
    const m = modal({
      reading_ready: true,
      reading: { route, destination: "Clapham Common", confidence: "high" },
      arrival_id: 2,
    });

    expect(detectorToEvent(m)).toEqual({
      pattern: "NUMBER",
      route,
      dest: "Clapham Common",
      conf: "high",
      arrivalId: 2,
    });
  });

  // `reading_ready` means the VERDICT is in, not that the reading is good. A
  // null reading is the vote gate having refused to agree — the blind was
  // unreadable — and that is an answer, not a pending state. Gating this branch
  // on `m.reading` as well once left an unreadable bus falling through to WAIT,
  // so the device sat on "request in flight" forever for a reading that was
  // never coming.
  it.each<{ label: string; reading: ModalReading | null }>([
    { label: "the vote gate refused to agree (null reading)", reading: null },
    {
      label: "confidence is low",
      reading: { route: "88", destination: "Clapham Common", confidence: "low" },
    },
    {
      label: "the route carries a letter",
      reading: { route: "88A", destination: "", confidence: "high" },
    },
    {
      label: "the route is longer than the quinary encoder can deliver",
      reading: { route: "8888", destination: "", confidence: "high" },
    },
    { label: "the route is empty", reading: { route: "", destination: "", confidence: "high" } },
    {
      label: "the route carries whitespace",
      reading: { route: "88 ", destination: "", confidence: "high" },
    },
  ])("returns UNKNOWN when $label", ({ reading }) => {
    const m = modal({ reading_ready: true, reading, present: true, arrival_id: 3 });

    expect(detectorToEvent(m)).toEqual({
      pattern: "UNKNOWN",
      route: "",
      dest: "",
      conf: "low",
      arrivalId: 3,
    });
  });

  it("lets a ready reading win over a simultaneous TARGET_ARRIVED edge", () => {
    const m = modal({
      event: "TARGET_ARRIVED",
      reading_ready: true,
      reading: READING,
      present: true,
      arrival_id: 4,
    });

    expect(detectorToEvent(m).pattern).toBe("NUMBER");
  });

  it("lets the TARGET_ARRIVED edge win over WAIT", () => {
    const m = modal({ event: "TARGET_ARRIVED", present: true, arrival_id: 5 });

    expect(detectorToEvent(m).pattern).toBe("BUS");
  });

  it.each<{ label: string; over: Partial<ModalResponse> }>([
    {
      label: "an arrival is latched but the target left view",
      over: { arrival_id: 1, present: false },
    },
    {
      label: "the target is present but no arrival has been latched",
      over: { arrival_id: 0, present: true },
    },
    { label: "the target has gone", over: { event: "TARGET_GONE", arrival_id: 1, present: false } },
  ])("returns NONE when $label", ({ over }) => {
    expect(detectorToEvent(modal(over)).pattern).toBe("NONE");
  });

  // The runtime half of case 13: whatever branch it takes, the command payload
  // carries the five EventRequest fields and nothing else.
  it.each<{ label: string; over: Partial<ModalResponse> }>([
    { label: "NONE", over: {} },
    { label: "BUS", over: { event: "TARGET_ARRIVED", present: true, arrival_id: 1 } },
    { label: "WAIT", over: { present: true, arrival_id: 1 } },
    { label: "NUMBER", over: { reading_ready: true, reading: READING, arrival_id: 1 } },
    { label: "UNKNOWN", over: { reading_ready: true, reading: null, arrival_id: 1 } },
  ])("emits exactly the five EventRequest fields on the $label branch", ({ over }) => {
    expect(Object.keys(detectorToEvent(modal(over))).sort()).toEqual(EVENT_KEYS);
  });

  // The capture page diffs each result against the last one it sent, so the
  // translator has to be pure — a mutated input would corrupt that comparison.
  it("does not mutate the response it was handed", () => {
    const m = modal({ reading_ready: true, reading: READING, present: true, arrival_id: 6 });
    const before = structuredClone(m);

    detectorToEvent(m);

    expect(m).toEqual(before);
  });
});

// --- chooseEvent: who owns the single command channel (audit 23) -------------
//
// The demo flow this arbitration exists for: the user stands STILL at the stop
// scanning with the camera, must get the FIRST direction before taking a step,
// then walks and keeps receiving directions. The board accepts bearings in both
// known phases since audit 23, so the phone's only judgement call is precedence
// against the bus-information half on the shared seq channel.

describe("chooseEvent", () => {
  const ev = (pattern: CloudPattern, arrivalId = 0): EventRequest => ({
    pattern,
    route: pattern === "NUMBER" ? "88" : "",
    dest: "",
    conf: pattern === "NUMBER" ? "high" : "",
    arrivalId,
  });

  it("returns the bus event untouched when there is no bearing", () => {
    const bus = ev("NUMBER", 3);
    expect(chooseEvent(bus, null, "STILL")).toBe(bus);
    expect(chooseEvent(bus, null, "MOVING")).toBe(bus);
  });

  // THE requirement this function exists for: standing still, scanning, bus
  // confirmed, nothing else to say — the direction must go out.
  it.each(["NONE", "WAIT"] as const)(
    "sends the bearing while STILL when the bus half only offers %s",
    (idle) => {
      expect(chooseEvent(ev(idle, 2), "left", "STILL")).toEqual(navEvent("left"));
    },
  );

  // Arrival and route information still land while standing at the stop —
  // otherwise widening the bearing to STILL would have silenced route 88.
  it.each(["BUS", "NUMBER", "UNKNOWN"] as const)(
    "yields the channel to %s while STILL",
    (busy) => {
      const bus = ev(busy, 2);
      expect(chooseEvent(bus, "left", "STILL")).toBe(bus);
    },
  );

  it("always sends the bearing while MOVING — the board drops the bus half there anyway", () => {
    expect(chooseEvent(ev("NUMBER", 2), "right", "MOVING")).toEqual(navEvent("right"));
    expect(chooseEvent(ev("BUS", 2), "center", "MOVING")).toEqual(navEvent("center"));
  });

  it("force makes the bearing win unconditionally, including over NUMBER while STILL", () => {
    expect(chooseEvent(ev("NUMBER", 2), "left", "STILL", true)).toEqual(navEvent("left"));
  });

  // The edge-trigger contract: a HELD bearing must keep comparing sameEvent-
  // equal across ticks even as the detector's arrival counter moves, or every
  // re-latch restarts the board's 800 ms pattern and truncates it.
  it("emits a stable event for a held bearing across arrival re-latches", () => {
    const a = chooseEvent(ev("NONE", 1), "left", "STILL");
    const b = chooseEvent(ev("NONE", 2), "left", "STILL");
    expect(sameEvent(a, b)).toBe(true);
  });

  // The transition the user physically performs: scanning STILL with a held
  // direction, then starting to walk. The event is identical on both sides of
  // the flip, so the edge-trigger does NOT re-fire and the board's pattern is
  // not restarted mid-play by the activity change itself.
  it("does not re-fire the same bearing when the user starts walking", () => {
    const still = chooseEvent(ev("NONE", 1), "left", "STILL");
    const moving = chooseEvent(ev("NONE", 1), "left", "MOVING");
    expect(sameEvent(still, moving)).toBe(true);
  });

  it("does not mutate the bus event it was handed", () => {
    const bus = ev("NUMBER", 4);
    const before = structuredClone(bus);
    chooseEvent(bus, "left", "STILL");
    chooseEvent(bus, "left", "MOVING");
    expect(bus).toEqual(before);
  });
});

describe("navEvent", () => {
  it.each([
    ["left", "LEFT"],
    ["center", "AHEAD"],
    ["right", "RIGHT"],
  ] as const)("maps %s to a %s event with empty info fields", (bearing, pattern) => {
    expect(navEvent(bearing)).toEqual({
      pattern,
      route: "",
      dest: "",
      conf: "",
      arrivalId: 0,
    });
  });

  // arrivalId is pinned at 0 — a live arrival counter here would make every
  // detector re-latch a "new" event and truncate the running nav pattern.
  it("never carries an arrival id", () => {
    expect(navEvent("left").arrivalId).toBe(0);
  });
});
