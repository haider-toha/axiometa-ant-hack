#pragma once
#include <cstdint>
// ==========================================================================
//  braille.h — A-Z Braille dot table + the pure (Arduino-free) mask lookup
//  and the declarations of the motor sequencer (implemented in braille.cpp).
//
//  Dot numbering (bit0 = dot1 … bit5 = dot6):
//        1 4        bit0 bit3
//        2 5   ==>  bit1 bit4
//        3 6        bit2 bit5
//
//  BRAILLE[] + brailleMask() are pure C++ (no Arduino.h) so the native Unity
//  test links them without a board. The sequencer below needs Arduino APIs
//  (digitalWrite/delay/Serial) and lives in braille.cpp, which the native
//  test env never compiles.
// ==========================================================================

// VERIFIED Unified-English-Braille grade-1 letters a..z.
// static const => internal linkage: safe to include from multiple .cpp files.
static const uint8_t BRAILLE[26] = {
    // a    b    c    d    e    f    g    h    i    j
    0x01,0x03,0x09,0x19,0x11,0x0B,0x1B,0x13,0x0A,0x1A,
    // k    l    m    n    o    p    q    r    s    t
    0x05,0x07,0x0D,0x1D,0x15,0x0F,0x1F,0x17,0x0E,0x1E,
    // u    v    w    x    y    z
    0x25,0x27,0x3A,0x2D,0x3D,0x35
};

// Pure lookup: returns the 6-bit dot mask for a letter (case-insensitive),
// or 0 for any non-letter. No Arduino dependency — host-testable.
inline uint8_t brailleMask(char c) {
    if (c >= 'A' && c <= 'Z') c = (char)(c - 'A' + 'a');
    if (c >= 'a' && c <= 'z') return BRAILLE[c - 'a'];
    return 0;
}

// ---- Motor sequencer (implemented in braille.cpp; needs Arduino) ---------
void beat(bool L, bool R);          // one row-beat: fire left/right column motor
void buzzLetter(uint8_t d);         // 3 row-beats for one dot mask
void buzzWord(const char* w);       // a word: letters + letter/word gaps
void brailleSelfTest();             // print each letter's L/R beat pattern to Serial
