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
// Nothing here touches Redis. `redis.ts` builds `Redis.fromEnv()` at module
// scope, so an uncredentialed import burns ~4.3 s of retry backoff per command
// and a credentialed one mutates the demo state the ESP32 is polling. The wire
// round-trip is covered by the scripted smoke in the plan's §Deploy instead.
import { describe, expect, it } from "vitest";

import {
  ACTIVITY_SEQ_MAX,
  detectorToEvent,
  isUserActivity,
  normActivity,
  normActivitySeq,
  sameEvent,
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
