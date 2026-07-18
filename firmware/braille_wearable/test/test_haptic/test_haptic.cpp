#include <unity.h>

#include "haptic_pure.h"
#include "patterns.h"

void setUp(void) {}
void tearDown(void) {}

void test_start_exposes_first_step_immediately(void) {
    PatternPlayer player{};
    startPattern(player, LEFT_PATTERN, 1000);

    const PatternOutput output = patternOutput(player);
    TEST_ASSERT_TRUE(output.active);
    TEST_ASSERT_EQUAL_UINT16(2350, output.p1Hz);
    TEST_ASSERT_EQUAL_UINT16(0, output.p3Hz);
}

void test_tick_advances_on_exact_step_boundary(void) {
    PatternPlayer player{};
    startPattern(player, LEFT_PATTERN, 1000);

    TEST_ASSERT_FALSE(tickPattern(player, 1199));
    TEST_ASSERT_EQUAL_UINT16(2350, patternOutput(player).p1Hz);
    TEST_ASSERT_FALSE(tickPattern(player, 1200));
    TEST_ASSERT_EQUAL_UINT16(0, patternOutput(player).p1Hz);
    TEST_ASSERT_FALSE(tickPattern(player, 1400));
    TEST_ASSERT_EQUAL_UINT16(2350, patternOutput(player).p1Hz);
}

void test_pattern_completes_with_both_outputs_off(void) {
    PatternPlayer player{};
    startPattern(player, LEFT_PATTERN, 1000);

    TEST_ASSERT_TRUE(tickPattern(player, 1800));
    const PatternOutput output = patternOutput(player);
    TEST_ASSERT_FALSE(output.active);
    TEST_ASSERT_EQUAL_UINT16(0, output.p1Hz);
    TEST_ASSERT_EQUAL_UINT16(0, output.p3Hz);
}

void test_large_tick_catches_up_without_extending_pattern(void) {
    PatternPlayer player{};
    startPattern(player, AHEAD_PATTERN, 500);

    TEST_ASSERT_TRUE(tickPattern(player, 1500));
    TEST_ASSERT_FALSE(patternOutput(player).active);
}

void test_timing_is_wrap_safe(void) {
    PatternPlayer player{};
    startPattern(player, LEFT_PATTERN, UINT32_MAX - 99);

    TEST_ASSERT_FALSE(tickPattern(player, 50));
    TEST_ASSERT_EQUAL_UINT16(2350, patternOutput(player).p1Hz);
    TEST_ASSERT_FALSE(tickPattern(player, 100));
    TEST_ASSERT_EQUAL_UINT16(0, patternOutput(player).p1Hz);
}

void test_stop_immediately_clears_output(void) {
    PatternPlayer player{};
    startPattern(player, RIGHT_PATTERN, 0);
    stopPattern(player);

    TEST_ASSERT_FALSE(patternOutput(player).active);
    TEST_ASSERT_EQUAL_UINT16(0, patternOutput(player).p3Hz);
}

int main(int, char**) {
    UNITY_BEGIN();
    RUN_TEST(test_start_exposes_first_step_immediately);
    RUN_TEST(test_tick_advances_on_exact_step_boundary);
    RUN_TEST(test_pattern_completes_with_both_outputs_off);
    RUN_TEST(test_large_tick_catches_up_without_extending_pattern);
    RUN_TEST(test_timing_is_wrap_safe);
    RUN_TEST(test_stop_immediately_clears_output);
    return UNITY_END();
}
