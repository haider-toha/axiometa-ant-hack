#include <unity.h>

#include "tof_proximity_pure.h"

void setUp(void) {}
void tearDown(void) {}

void test_pulse_gap_clamps_and_increases_with_distance(void) {
    TEST_ASSERT_EQUAL_UINT16(120, proximityPulseGapMs(100));
    TEST_ASSERT_EQUAL_UINT16(120, proximityPulseGapMs(300));
    TEST_ASSERT_TRUE(proximityPulseGapMs(600) > proximityPulseGapMs(300));
    TEST_ASSERT_TRUE(proximityPulseGapMs(900) > proximityPulseGapMs(600));
    TEST_ASSERT_EQUAL_UINT16(900, proximityPulseGapMs(1200));
    TEST_ASSERT_EQUAL_UINT16(900, proximityPulseGapMs(2000));
}

void test_three_consecutive_near_samples_enter_proximity(void) {
    ProximityState state{};
    TEST_ASSERT_FALSE(updateProximity(state, 900, true).active);
    TEST_ASSERT_FALSE(updateProximity(state, 850, true).active);
    const ProximityUpdate third = updateProximity(state, 800, true);
    TEST_ASSERT_TRUE(third.active);
    TEST_ASSERT_TRUE(third.outputAllowed);
    TEST_ASSERT_TRUE(third.entered);
}

void test_invalid_sample_breaks_near_streak(void) {
    ProximityState state{};
    updateProximity(state, 900, true);
    updateProximity(state, 850, true);
    updateProximity(state, 0, false);
    TEST_ASSERT_FALSE(updateProximity(state, 800, true).active);
    TEST_ASSERT_FALSE(updateProximity(state, 750, true).active);
    TEST_ASSERT_TRUE(updateProximity(state, 700, true).entered);
}

void test_hysteresis_band_retains_active_state(void) {
    ProximityState state{};
    updateProximity(state, 900, true);
    updateProximity(state, 900, true);
    updateProximity(state, 900, true);
    TEST_ASSERT_TRUE(updateProximity(state, 1250, true).active);
    TEST_ASSERT_TRUE(updateProximity(state, 1200, true).active);
    TEST_ASSERT_TRUE(updateProximity(state, 1300, true).active);
}

void test_three_consecutive_far_samples_exit_proximity(void) {
    ProximityState state{};
    updateProximity(state, 900, true);
    updateProximity(state, 900, true);
    updateProximity(state, 900, true);
    TEST_ASSERT_TRUE(updateProximity(state, 1400, true).active);
    TEST_ASSERT_TRUE(updateProximity(state, 1450, true).active);
    const ProximityUpdate third = updateProximity(state, 1500, true);
    TEST_ASSERT_FALSE(third.active);
    TEST_ASSERT_TRUE(third.exited);
}

void test_three_invalid_samples_fail_safe_to_inactive(void) {
    ProximityState state{};
    updateProximity(state, 900, true);
    updateProximity(state, 900, true);
    updateProximity(state, 900, true);
    const ProximityUpdate firstInvalid = updateProximity(state, 0, false);
    TEST_ASSERT_TRUE(firstInvalid.active);
    TEST_ASSERT_FALSE(firstInvalid.outputAllowed);
    const ProximityUpdate secondInvalid = updateProximity(state, 0, false);
    TEST_ASSERT_TRUE(secondInvalid.active);
    TEST_ASSERT_FALSE(secondInvalid.outputAllowed);
    const ProximityUpdate third = updateProximity(state, 0, false);
    TEST_ASSERT_FALSE(third.active);
    TEST_ASSERT_FALSE(third.outputAllowed);
    TEST_ASSERT_TRUE(third.exited);
}

void test_range_completion_timeout_is_wrap_safe(void) {
    TEST_ASSERT_FALSE(rangeCompletionTimedOut(1249, 1000));
    TEST_ASSERT_TRUE(rangeCompletionTimedOut(1250, 1000));
    TEST_ASSERT_FALSE(rangeCompletionTimedOut(20, UINT32_MAX - 100));
    TEST_ASSERT_TRUE(rangeCompletionTimedOut(200, UINT32_MAX - 100));
}

int main(int, char**) {
    UNITY_BEGIN();
    RUN_TEST(test_pulse_gap_clamps_and_increases_with_distance);
    RUN_TEST(test_three_consecutive_near_samples_enter_proximity);
    RUN_TEST(test_invalid_sample_breaks_near_streak);
    RUN_TEST(test_hysteresis_band_retains_active_state);
    RUN_TEST(test_three_consecutive_far_samples_exit_proximity);
    RUN_TEST(test_three_invalid_samples_fail_safe_to_inactive);
    RUN_TEST(test_range_completion_timeout_is_wrap_safe);
    return UNITY_END();
}
