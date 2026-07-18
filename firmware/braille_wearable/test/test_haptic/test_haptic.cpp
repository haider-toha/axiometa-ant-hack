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

void test_preemption_clearing_gap_is_exact_and_wrap_safe(void) {
    TEST_ASSERT_FALSE(clearingGapElapsed(1149, 1000));
    TEST_ASSERT_TRUE(clearingGapElapsed(1150, 1000));
    TEST_ASSERT_FALSE(clearingGapElapsed(20, UINT32_MAX - 100));
    TEST_ASSERT_TRUE(clearingGapElapsed(60, UINT32_MAX - 100));
}

void test_service_stop_latches_output_off_until_explicit_resume(void) {
    OutputEnableLatch latch{};
    TEST_ASSERT_TRUE(latch.enabled);
    stopAllOutput(latch);
    TEST_ASSERT_FALSE(latch.enabled);
    resumeOutput(latch);
    TEST_ASSERT_TRUE(latch.enabled);
}

void test_night_mode_mutes_hardware_without_changing_requested_output(void) {
    const HapticDrive requested{2350, 3050};

    const HapticDrive muted = hardwareDriveFor(requested, OutputMode::NIGHT);
    TEST_ASSERT_EQUAL_UINT16(0, muted.p1Hz);
    TEST_ASSERT_EQUAL_UINT16(0, muted.p3Hz);
    TEST_ASSERT_EQUAL_UINT16(2350, requested.p1Hz);
    TEST_ASSERT_EQUAL_UINT16(3050, requested.p3Hz);
}

void test_firmware_output_mode_defaults_to_night(void) {
    TEST_ASSERT_EQUAL_INT(static_cast<int>(OutputMode::NIGHT),
                          static_cast<int>(DEFAULT_OUTPUT_MODE));
}

void test_audible_mode_passes_requested_output_to_hardware(void) {
    const HapticDrive requested{2350, 3050};

    const HapticDrive audible = hardwareDriveFor(requested, OutputMode::AUDIBLE);
    TEST_ASSERT_EQUAL_UINT16(2350, audible.p1Hz);
    TEST_ASSERT_EQUAL_UINT16(3050, audible.p3Hz);
}

void test_local_siren_patterns_match_locked_timing_and_channels(void) {
    TEST_ASSERT_EQUAL_UINT16(250, outputPatternDurationMs(ATTENTION_PATTERN));
    TEST_ASSERT_EQUAL_UINT16(1400, outputPatternDurationMs(SIREN_WARNING_PATTERN));
    TEST_ASSERT_EQUAL_UINT16(11250, outputPatternDurationMs(DANGER_PATTERN));

    TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_LEFT_HZ, ATTENTION_STEPS[0].p1Hz);
    TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_RIGHT_HZ, ATTENTION_STEPS[0].p3Hz);
    TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_LEFT_HZ, DANGER_STEPS[0].p1Hz);
    TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_RIGHT_HZ, DANGER_STEPS[0].p3Hz);
}

int main(int, char**) {
    UNITY_BEGIN();
    RUN_TEST(test_start_exposes_first_step_immediately);
    RUN_TEST(test_tick_advances_on_exact_step_boundary);
    RUN_TEST(test_pattern_completes_with_both_outputs_off);
    RUN_TEST(test_large_tick_catches_up_without_extending_pattern);
    RUN_TEST(test_timing_is_wrap_safe);
    RUN_TEST(test_stop_immediately_clears_output);
    RUN_TEST(test_preemption_clearing_gap_is_exact_and_wrap_safe);
    RUN_TEST(test_service_stop_latches_output_off_until_explicit_resume);
    RUN_TEST(test_night_mode_mutes_hardware_without_changing_requested_output);
    RUN_TEST(test_firmware_output_mode_defaults_to_night);
    RUN_TEST(test_audible_mode_passes_requested_output_to_hardware);
    RUN_TEST(test_local_siren_patterns_match_locked_timing_and_channels);
    return UNITY_END();
}
