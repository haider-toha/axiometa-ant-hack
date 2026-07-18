#include <Arduino.h>
#include "pins.h"
#include "braille.h"

// ==========================================================================
//  LOCKED encoding scheme + timing (audit trail; do NOT redesign):
//    Motor A = left column (dots 1·2·3), Motor B = right column (dots 4·5·6).
//    Exactly 3 timed row-beats per letter (top/mid/bottom); an empty row still
//    consumes its silent slot. When a row fires BOTH motors, render it
//    micro-staggered left-then-right (~100 ms), never truly simultaneous.
// ==========================================================================
static const int BUZZ       = 400;   // motor-on time per beat (ms)
static const int GAP_BEAT   = 300;   // silence between the 3 row-beats
static const int GAP_LETTER = 800;   // silence between letters
static const int GAP_WORD   = 1500;  // silence for a space (word boundary)
static const int STAGGER    = 100;   // both-fire micro-stagger (L then R)

// One row-beat. L/R = does the left/right column motor fire this row?
void beat(bool L, bool R) {
    if (L && R) {                                   // both-fire -> micro-stagger L then R
        digitalWrite(MOTOR_L, HIGH); delay(STAGGER);
        digitalWrite(MOTOR_R, HIGH); delay(BUZZ);
        digitalWrite(MOTOR_L, LOW);  digitalWrite(MOTOR_R, LOW);
    } else {                                        // single motor, or a silent slot
        if (L) digitalWrite(MOTOR_L, HIGH);
        if (R) digitalWrite(MOTOR_R, HIGH);
        delay(BUZZ);
        digitalWrite(MOTOR_L, LOW); digitalWrite(MOTOR_R, LOW);
    }
}

// One letter = 3 row-beats: (dot1|dot4), (dot2|dot5), (dot3|dot6).
void buzzLetter(uint8_t d) {
    beat(d & 0x01, d & 0x08); delay(GAP_BEAT);      // row1: dot1(L), dot4(R)
    beat(d & 0x02, d & 0x10); delay(GAP_BEAT);      // row2: dot2(L), dot5(R)
    beat(d & 0x04, d & 0x20);                       // row3: dot3(L), dot6(R)
}

// A word: a-z -> buzzLetter + inter-letter gap; space -> inter-word gap.
void buzzWord(const char* w) {
    for (int i = 0; w[i]; i++) {
        char c = (char)tolower((unsigned char)w[i]);
        if (c >= 'a' && c <= 'z') {
            buzzLetter(BRAILLE[c - 'a']);
            delay(GAP_LETTER);
        } else if (c == ' ') {
            delay(GAP_WORD);
        }
        // any other character is skipped (alphabet is a-z + gaps only)
    }
}

// Print every letter's 3-beat L/R pattern to Serial so a human can diff it
// against a printed Braille chart — no motor required.
//   L = left column fires this row, R = right column fires, '.' = silent.
void brailleSelfTest() {
    Serial.println(F("--- braille self-test (row1/row2/row3, L=left R=right) ---"));
    for (char c = 'a'; c <= 'z'; c++) {
        uint8_t d = brailleMask(c);
        Serial.printf("%c 0x%02X  r1[%c%c] r2[%c%c] r3[%c%c]\n",
                      c, d,
                      (d & 0x01) ? 'L' : '.', (d & 0x08) ? 'R' : '.',   // dot1 / dot4
                      (d & 0x02) ? 'L' : '.', (d & 0x10) ? 'R' : '.',   // dot2 / dot5
                      (d & 0x04) ? 'L' : '.', (d & 0x20) ? 'R' : '.');  // dot3 / dot6
    }
    Serial.println(F("--- end self-test ---"));
}
