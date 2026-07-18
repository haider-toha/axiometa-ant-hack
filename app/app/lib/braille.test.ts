import { describe, it, expect } from "vitest";
import { dotsFor } from "./braille";

// An INDEPENDENT reference dot-map, hand-transcribed from the canonical Grade-1
// braille alphabet — deliberately NOT derived from braille.ts's masks, so this
// table cross-checks the implementation rather than restating it.
const REFERENCE: Record<string, number[]> = {
  a: [1],
  b: [1, 2],
  c: [1, 4],
  d: [1, 4, 5],
  e: [1, 5],
  f: [1, 2, 4],
  g: [1, 2, 4, 5],
  h: [1, 2, 5],
  i: [2, 4],
  j: [2, 4, 5],
  k: [1, 3],
  l: [1, 2, 3],
  m: [1, 3, 4],
  n: [1, 3, 4, 5],
  o: [1, 3, 5],
  p: [1, 2, 3, 4],
  q: [1, 2, 3, 4, 5],
  r: [1, 2, 3, 5],
  s: [2, 3, 4],
  t: [2, 3, 4, 5],
  u: [1, 3, 6],
  v: [1, 2, 3, 6],
  w: [2, 4, 5, 6],
  x: [1, 3, 4, 6],
  y: [1, 3, 4, 5, 6],
  z: [1, 3, 5, 6],
};

describe("braille dotsFor", () => {
  it("matches the four spot-checked letters", () => {
    expect(dotsFor("a")).toEqual([1]);
    expect(dotsFor("c")).toEqual([1, 4]);
    expect(dotsFor("l")).toEqual([1, 2, 3]);
    expect(dotsFor("w")).toEqual([2, 4, 5, 6]);
  });

  it("matches the full A–Z reference dot-map", () => {
    for (const [letter, dots] of Object.entries(REFERENCE)) {
      expect(dotsFor(letter)).toEqual(dots);
    }
  });

  it("is case-insensitive", () => {
    expect(dotsFor("W")).toEqual(dotsFor("w"));
  });

  it("returns an empty cell for a space", () => {
    expect(dotsFor(" ")).toEqual([]);
  });
});
