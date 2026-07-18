# Phase 3a — Adversarial Verification of the A–Z Braille Encoding Table

**Reviewer role:** Independent, adversarial. Ground truth derived fresh from the web, NOT from any
comment, variable name, or "reference" string inside the reviewed source.

**Files under review (only these three were read):**
1. `firmware/braille_wearable/src/braille.h`
2. `firmware/braille_wearable/src/braille.cpp`
3. `app/app/lib/braille.test.ts`

---

## 1. Independent ground-truth derivation (Unified English Braille, Grade 1)

Braille cell dot numbering used throughout: left column top→bottom = dots **1, 2, 3**;
right column top→bottom = dots **4, 5, 6**.

**Primary cited reference (full explicit table, machine-read):**
- https://en.wikipedia.org/wiki/English_Braille

**Corroborating independent sources (agree letter-for-letter):**
- https://brailletranslators.com/braille-alphabet-chart/ (full explicit A–Z table)
- Structural rule set confirmed via web search: letters **a–j** use only dots {1,2,4,5}; **k–t** =
  the a–j shape **+ dot 3**; **u–z (except w)** = the a–e shape **+ dots 3,6**; **w** = dots 2,4,5,6
  (the historical French-alphabet exception). These rules regenerate exactly the table below.
- (BANA `symbols_list.pdf`, Hadley, and TeachingVisuallyImpaired UEB PDFs were fetched but are
  font/image-encoded and not machine-readable; not relied upon.)

Derived dot lists for all 26 letters:

```
a=1        b=1·2      c=1·4      d=1·4·5    e=1·5
f=1·2·4    g=1·2·4·5  h=1·2·5    i=2·4      j=2·4·5
k=1·3      l=1·2·3    m=1·3·4    n=1·3·4·5  o=1·3·5
p=1·2·3·4  q=1·2·3·4·5 r=1·2·3·5 s=2·3·4    t=2·3·4·5
u=1·3·6    v=1·2·3·6  w=2·4·5·6  x=1·3·4·6  y=1·3·4·5·6  z=1·3·5·6
```

## 2. Expected 6-bit mask

Bit map: bit0=dot1, bit1=dot2, bit2=dot3, bit3=dot4, bit4=dot5, bit5=dot6, so
mask = Σ 2^(dot−1). (dot1=1, dot2=2, dot3=4, dot4=8, dot5=16, dot6=32.)

## 3. Full 26-row verdict table

Firmware = `BRAILLE[]` in `braille.h`. Test = `REFERENCE` dot-map in `braille.test.ts`
(the file's independent hand-transcribed map; the `dotsFor` impl in `braille.ts` was out of scope,
but the test's REFERENCE map is what the suite asserts against). Firmware hex is additionally
decoded bit-by-bit back to dots to confirm it is not merely a numeric coincidence.

| Ltr | Correct dots | Exp mask | Firmware mask | Firmware→dots decode | Test dots | Verdict |
|-----|--------------|----------|---------------|----------------------|-----------|---------|
| a | 1 | 0x01 | 0x01 | 1 | [1] | PASS |
| b | 1·2 | 0x03 | 0x03 | 1·2 | [1,2] | PASS |
| c | 1·4 | 0x09 | 0x09 | 1·4 | [1,4] | PASS |
| d | 1·4·5 | 0x19 | 0x19 | 1·4·5 | [1,4,5] | PASS |
| e | 1·5 | 0x11 | 0x11 | 1·5 | [1,5] | PASS |
| f | 1·2·4 | 0x0B | 0x0B | 1·2·4 | [1,2,4] | PASS |
| g | 1·2·4·5 | 0x1B | 0x1B | 1·2·4·5 | [1,2,4,5] | PASS |
| h | 1·2·5 | 0x13 | 0x13 | 1·2·5 | [1,2,5] | PASS |
| i | 2·4 | 0x0A | 0x0A | 2·4 | [2,4] | PASS |
| j | 2·4·5 | 0x1A | 0x1A | 2·4·5 | [2,4,5] | PASS |
| k | 1·3 | 0x05 | 0x05 | 1·3 | [1,3] | PASS |
| l | 1·2·3 | 0x07 | 0x07 | 1·2·3 | [1,2,3] | PASS |
| m | 1·3·4 | 0x0D | 0x0D | 1·3·4 | [1,3,4] | PASS |
| n | 1·3·4·5 | 0x1D | 0x1D | 1·3·4·5 | [1,3,4,5] | PASS |
| o | 1·3·5 | 0x15 | 0x15 | 1·3·5 | [1,3,5] | PASS |
| p | 1·2·3·4 | 0x0F | 0x0F | 1·2·3·4 | [1,2,3,4] | PASS |
| q | 1·2·3·4·5 | 0x1F | 0x1F | 1·2·3·4·5 | [1,2,3,4,5] | PASS |
| r | 1·2·3·5 | 0x17 | 0x17 | 1·2·3·5 | [1,2,3,5] | PASS |
| s | 2·3·4 | 0x0E | 0x0E | 2·3·4 | [2,3,4] | PASS |
| t | 2·3·4·5 | 0x1E | 0x1E | 2·3·4·5 | [2,3,4,5] | PASS |
| u | 1·3·6 | 0x25 | 0x25 | 1·3·6 | [1,3,6] | PASS |
| v | 1·2·3·6 | 0x27 | 0x27 | 1·2·3·6 | [1,2,3,6] | PASS |
| w | 2·4·5·6 | 0x3A | 0x3A | 2·4·5·6 | [2,4,5,6] | PASS |
| x | 1·3·4·6 | 0x2D | 0x2D | 1·3·4·6 | [1,3,4,6] | PASS |
| y | 1·3·4·5·6 | 0x3D | 0x3D | 1·3·4·5·6 | [1,3,4,5,6] | PASS |
| z | 1·3·5·6 | 0x35 | 0x35 | 1·3·5·6 | [1,3,5,6] | PASS |

**Letter FAILs: 0 / 26.** Firmware table, TS REFERENCE map, and the independent web-derived
standard are in three-way agreement. No "firmware == test but both wrong vs standard" condition
exists — the standard agrees too.

## 4. Sequencer verdict (`braille.cpp`)

**Row extraction — `buzzLetter()` and `brailleSelfTest()`** map each dot to the correct
motor/row. Required vs actual:

| Requirement | Code | OK? |
|-------------|------|-----|
| dot1 → Left,  row1 (d & 0x01) | `beat(d & 0x01, …)` row1 L | YES (0x01=bit0=dot1) |
| dot4 → Right, row1 (d & 0x08) | `beat(…, d & 0x08)` row1 R | YES (0x08=bit3=dot4) |
| dot2 → Left,  row2 (d & 0x02) | `beat(d & 0x02, …)` row2 L | YES (0x02=bit1=dot2) |
| dot5 → Right, row2 (d & 0x10) | `beat(…, d & 0x10)` row2 R | YES (0x10=bit4=dot5) |
| dot3 → Left,  row3 (d & 0x04) | `beat(d & 0x04, …)` row3 L | YES (0x04=bit2=dot3) |
| dot6 → Right, row3 (d & 0x20) | `beat(…, d & 0x20)` row3 R | YES (0x20=bit5=dot6) |

Rows are emitted top→middle→bottom, i.e. (1,4)(2,5)(3,6) — anatomically correct cell order.
`brailleSelfTest()` uses the identical masks/comments, so the human-diff aid matches the driver.

**Both-fire micro-stagger** — in `beat()`, when `L && R`: `MOTOR_L` is driven HIGH, then
`delay(STAGGER)`, then `MOTOR_R` HIGH. **LEFT leads, RIGHT follows** (~100 ms later); both drop
together after `BUZZ`. Confirmed: not truly simultaneous, left-then-right as required.

**Sequencer verdict: PASS.**

## 5. Timing verdict (`braille.cpp`)

| Constant | Required (ms) | Code | OK? |
|----------|---------------|------|-----|
| BUZZ (buzz) | 400 | `BUZZ = 400` | YES |
| GAP_BEAT (gap_beat) | 300 | `GAP_BEAT = 300` | YES |
| GAP_LETTER (gap_letter) | 800 | `GAP_LETTER = 800` | YES |
| GAP_WORD (gap_word) | 1500 | `GAP_WORD = 1500` | YES |
| STAGGER (stagger) | 100 | `STAGGER = 100` | YES |

Structure check: `buzzLetter` = 3 beats with `GAP_BEAT` after beats 1 and 2 (none after beat 3);
`buzzWord` appends `GAP_LETTER` after each a–z letter and `GAP_WORD` for a space, skipping other
chars. Consistent with the stated scheme.

**Timing verdict: PASS.**

## 6. Final

- Letter-table FAILs: **0**
- Sequencer: **PASS**
- Timing: **PASS**
- Firmware ↔ TS ↔ web-standard: **three-way agreement**

**UNRESOLVED FAILS: 0**
