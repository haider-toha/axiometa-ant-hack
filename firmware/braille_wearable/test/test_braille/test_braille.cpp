#include <unity.h>
#include <initializer_list>
#include "braille.h"                 // pure lookup; no Arduino.h (Phase 1C §f)

// ==========================================================================
//  Host (native) Unity test for the acceptance-critical A-Z Braille table.
//  It re-derives every mask from FIRST PRINCIPLES — the raised-dot list for
//  each letter of Unified English Braille grade 1 — and compares it against
//  brailleMask(). This is an INDEPENDENT cross-check, not a copy of the hex
//  table under test: a transcription typo in BRAILLE[] fails here.
//
//  Dot layout / bit map:  dot1->bit0 dot2->bit1 dot3->bit2
//                         dot4->bit3 dot5->bit4 dot6->bit5
// ==========================================================================

void setUp(void) {}
void tearDown(void) {}

// Build a mask from a raised-dot list, e.g. dots({1,2,3}) -> 0x07.
static uint8_t dots(std::initializer_list<int> ds) {
    uint8_t m = 0;
    for (int d : ds) m |= (uint8_t)(1 << (d - 1));
    return m;
}

// ---- The four letters the spec calls out explicitly -----------------------
void test_a_is_dot1_only(void)   { TEST_ASSERT_EQUAL_HEX8(0x01, brailleMask('a')); }
void test_c_is_dots_1_4(void)    { TEST_ASSERT_EQUAL_HEX8(0x09, brailleMask('c')); }
void test_l_is_dots_1_2_3(void)  { TEST_ASSERT_EQUAL_HEX8(0x07, brailleMask('l')); }
void test_w_is_dots_2_4_5_6(void){ TEST_ASSERT_EQUAL_HEX8(0x3A, brailleMask('w')); }

// ---- All 26, independently derived ----------------------------------------
void test_all_26_from_dot_lists(void) {
    struct { char c; uint8_t mask; } chart[26] = {
        {'a', dots({1})},          {'b', dots({1,2})},       {'c', dots({1,4})},
        {'d', dots({1,4,5})},      {'e', dots({1,5})},       {'f', dots({1,2,4})},
        {'g', dots({1,2,4,5})},    {'h', dots({1,2,5})},     {'i', dots({2,4})},
        {'j', dots({2,4,5})},      {'k', dots({1,3})},       {'l', dots({1,2,3})},
        {'m', dots({1,3,4})},      {'n', dots({1,3,4,5})},   {'o', dots({1,3,5})},
        {'p', dots({1,2,3,4})},    {'q', dots({1,2,3,4,5})}, {'r', dots({1,2,3,5})},
        {'s', dots({2,3,4})},      {'t', dots({2,3,4,5})},   {'u', dots({1,3,6})},
        {'v', dots({1,2,3,6})},    {'w', dots({2,4,5,6})},   {'x', dots({1,3,4,6})},
        {'y', dots({1,3,4,5,6})},  {'z', dots({1,3,5,6})},
    };
    for (auto& e : chart) {
        TEST_ASSERT_EQUAL_HEX8(e.mask, brailleMask(e.c));
    }
}

// ---- Case-insensitivity + non-letters map to 0 ----------------------------
void test_uppercase_matches_lowercase(void) {
    for (char c = 'a'; c <= 'z'; c++) {
        TEST_ASSERT_EQUAL_HEX8(brailleMask(c), brailleMask((char)(c - 'a' + 'A')));
    }
}
void test_non_letters_are_zero(void) {
    TEST_ASSERT_EQUAL_HEX8(0x00, brailleMask(' '));
    TEST_ASSERT_EQUAL_HEX8(0x00, brailleMask('0'));
    TEST_ASSERT_EQUAL_HEX8(0x00, brailleMask('!'));
}

int main(int, char**) {
    UNITY_BEGIN();
    RUN_TEST(test_a_is_dot1_only);
    RUN_TEST(test_c_is_dots_1_4);
    RUN_TEST(test_l_is_dots_1_2_3);
    RUN_TEST(test_w_is_dots_2_4_5_6);
    RUN_TEST(test_all_26_from_dot_lists);
    RUN_TEST(test_uppercase_matches_lowercase);
    RUN_TEST(test_non_letters_are_zero);
    return UNITY_END();
}
