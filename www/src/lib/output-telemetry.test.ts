import { describe, expect, it } from "vitest";

import {
  OutputTelemetryDecoder,
  parseOutputTelemetryLine,
} from "@/lib/output-telemetry";

const LEFT = 'TACTA_OUTPUT {"v":1,"leftHz":2350,"rightHz":0,"upMs":123}';
const RIGHT = 'TACTA_OUTPUT {"v":1,"leftHz":0,"rightHz":3050,"upMs":456}';
const PROXIMITY =
  'TACTA_OUTPUT {"v":2,"leftHz":2350,"rightHz":0,"upMs":789,"state":"ACTIVE","source":"LOCAL_TOF","pattern":"PROXIMITY","activity":"MOVING","reason":"PLAYING","tofMm":444,"outputMode":"AUDIBLE"}';

describe("parseOutputTelemetryLine", () => {
  it("parses a protocol-v1 output record", () => {
    expect(parseOutputTelemetryLine(LEFT)).toEqual({
      v: 1,
      leftHz: 2350,
      rightHz: 0,
      upMs: 123,
    });
  });

  it("parses a strict protocol-v2 output reason record", () => {
    expect(parseOutputTelemetryLine(PROXIMITY)).toEqual({
      v: 2,
      leftHz: 2350,
      rightHz: 0,
      upMs: 789,
      state: "ACTIVE",
      source: "LOCAL_TOF",
      pattern: "PROXIMITY",
      activity: "MOVING",
      reason: "PLAYING",
      tofMm: 444,
      outputMode: "AUDIBLE",
    });
  });

  it("accepts null when the board has no valid ToF sample", () => {
    const line = PROXIMITY.replace('"tofMm":444', '"tofMm":null');

    expect(parseOutputTelemetryLine(line)).toEqual(
      expect.objectContaining({ v: 2, tofMm: null }),
    );
  });

  it.each([
    "BOOT board_firmware",
    "TACTA_OUTPUT not-json",
    'TACTA_OUTPUT {"v":2,"leftHz":2350,"rightHz":0,"upMs":1}',
    PROXIMITY.replace('"state":"ACTIVE"', '"state":"BROKEN"'),
    PROXIMITY.replace('"source":"LOCAL_TOF"', '"source":"CLOUD"'),
    PROXIMITY.replace('"pattern":"PROXIMITY"', '"pattern":""'),
    PROXIMITY.replace('"pattern":"PROXIMITY"', '"pattern":"lowercase"'),
    PROXIMITY.replace('"activity":"MOVING"', '"activity":"WALKING"'),
    PROXIMITY.replace('"reason":"PLAYING"', '"reason":"UNKNOWN"'),
    PROXIMITY.replace('"tofMm":444', '"tofMm":-1'),
    PROXIMITY.replace('"tofMm":444', '"tofMm":65536'),
    PROXIMITY.replace('"tofMm":444', '"tofMm":1.5'),
    PROXIMITY.replace('"outputMode":"AUDIBLE"', '"outputMode":"SILENT"'),
    PROXIMITY.replace('"v":2', '"v":3'),
    'TACTA_OUTPUT {"v":1,"leftHz":-1,"rightHz":0,"upMs":1}',
    'TACTA_OUTPUT {"v":1,"leftHz":65536,"rightHz":0,"upMs":1}',
    'TACTA_OUTPUT {"v":1,"leftHz":1.5,"rightHz":0,"upMs":1}',
    'TACTA_OUTPUT {"v":1,"leftHz":0,"rightHz":0,"upMs":4294967296}',
    'TACTA_OUTPUT {"v":1,"leftHz":0,"rightHz":0}',
  ])("ignores invalid or unrelated line %s", (line) => {
    expect(parseOutputTelemetryLine(line)).toBeNull();
  });
});

describe("OutputTelemetryDecoder", () => {
  it("preserves a partial record across chunks", () => {
    const decoder = new OutputTelemetryDecoder();

    expect(decoder.push(LEFT.slice(0, 24))).toEqual([]);
    expect(decoder.push(`${LEFT.slice(24)}\n`)).toEqual([
      { v: 1, leftHz: 2350, rightHz: 0, upMs: 123 },
    ]);
  });

  it("decodes multiple records among human logs and CRLF endings", () => {
    const decoder = new OutputTelemetryDecoder();

    expect(decoder.push(`BOOT ready\r\n${LEFT}\r\nAUDIO rms=12\n${RIGHT}\n`)).toEqual([
      { v: 1, leftHz: 2350, rightHz: 0, upMs: 123 },
      { v: 1, leftHz: 0, rightHz: 3050, upMs: 456 },
    ]);
  });

  it("streams version 1 and version 2 records together", () => {
    const decoder = new OutputTelemetryDecoder();

    expect(decoder.push(`${LEFT}\n${PROXIMITY}\n`)).toEqual([
      { v: 1, leftHz: 2350, rightHz: 0, upMs: 123 },
      {
        v: 2,
        leftHz: 2350,
        rightHz: 0,
        upMs: 789,
        state: "ACTIVE",
        source: "LOCAL_TOF",
        pattern: "PROXIMITY",
        activity: "MOVING",
        reason: "PLAYING",
        tofMm: 444,
        outputMode: "AUDIBLE",
      },
    ]);
  });

  it("discards an unbounded malformed line and recovers", () => {
    const decoder = new OutputTelemetryDecoder(64);

    expect(decoder.push("x".repeat(80))).toEqual([]);
    expect(decoder.push(`\n${RIGHT}\n`)).toEqual([
      { v: 1, leftHz: 0, rightHz: 3050, upMs: 456 },
    ]);
  });
});
