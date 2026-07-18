#include <unity.h>

#include "siren_runtime_pure.h"

void setUp(void) {}
void tearDown(void) {}

void test_attention_publishes_once_until_signal_clears(void) {
    SirenProducerState state{};

    TEST_ASSERT_TRUE(shouldPublishSirenDecision(state, SirenDecision::ATTENTION, 1000));
    TEST_ASSERT_FALSE(shouldPublishSirenDecision(state, SirenDecision::ATTENTION, 1032));
    TEST_ASSERT_FALSE(shouldPublishSirenDecision(state, SirenDecision::NONE, 1064));
    TEST_ASSERT_TRUE(shouldPublishSirenDecision(state, SirenDecision::ATTENTION, 1096));
}

void test_warning_rate_limit_is_ten_seconds_and_wrap_safe(void) {
    SirenProducerState state{};

    TEST_ASSERT_TRUE(shouldPublishSirenDecision(
        state, SirenDecision::SIREN_WARNING, UINT32_MAX - 4999));
    TEST_ASSERT_FALSE(shouldPublishSirenDecision(state, SirenDecision::NONE, UINT32_MAX - 4000));
    TEST_ASSERT_FALSE(shouldPublishSirenDecision(state, SirenDecision::SIREN_WARNING, 4000));
    TEST_ASSERT_FALSE(shouldPublishSirenDecision(state, SirenDecision::NONE, 4500));
    TEST_ASSERT_TRUE(shouldPublishSirenDecision(state, SirenDecision::SIREN_WARNING, 5000));
}

void test_confirmed_danger_publishes_after_attention_without_clearing(void) {
    SirenProducerState state{};

    TEST_ASSERT_TRUE(shouldPublishSirenDecision(state, SirenDecision::ATTENTION, 1000));
    TEST_ASSERT_TRUE(shouldPublishSirenDecision(state, SirenDecision::DANGER, 2000));
    TEST_ASSERT_FALSE(shouldPublishSirenDecision(state, SirenDecision::DANGER, 2032));
}

void test_danger_and_attention_preempt_lower_local_outputs(void) {
    TEST_ASSERT_TRUE(canStartSirenOutput(
        SirenDecision::DANGER, SirenDecision::SIREN_WARNING, true));
    TEST_ASSERT_TRUE(canStartSirenOutput(
        SirenDecision::ATTENTION, SirenDecision::SIREN_WARNING, true));
    TEST_ASSERT_FALSE(canStartSirenOutput(
        SirenDecision::ATTENTION, SirenDecision::DANGER, false));
}

void test_danger_does_not_restart_an_active_danger_pattern(void) {
    TEST_ASSERT_FALSE(canStartSirenOutput(
        SirenDecision::DANGER, SirenDecision::DANGER, false));
}

void test_proximity_blocks_warning_but_not_safety_outputs(void) {
    TEST_ASSERT_FALSE(canStartSirenOutput(
        SirenDecision::SIREN_WARNING, SirenDecision::NONE, true));
    TEST_ASSERT_TRUE(canStartSirenOutput(
        SirenDecision::SIREN_WARNING, SirenDecision::NONE, false));
    TEST_ASSERT_FALSE(canStartSirenOutput(
        SirenDecision::SIREN_WARNING, SirenDecision::ATTENTION, false));
}

void test_failed_delivery_can_roll_back_for_retry(void) {
    SirenProducerState state{};
    const SirenProducerState beforeAttempt = state;

    TEST_ASSERT_TRUE(shouldPublishSirenDecision(
        state, SirenDecision::SIREN_WARNING, 1000));
    state = beforeAttempt;

    TEST_ASSERT_TRUE(shouldPublishSirenDecision(
        state, SirenDecision::SIREN_WARNING, 1001));
    TEST_ASSERT_EQUAL_UINT32(1001, state.lastWarningPublishedMs);
}

int main(int, char**) {
    UNITY_BEGIN();
    RUN_TEST(test_attention_publishes_once_until_signal_clears);
    RUN_TEST(test_warning_rate_limit_is_ten_seconds_and_wrap_safe);
    RUN_TEST(test_confirmed_danger_publishes_after_attention_without_clearing);
    RUN_TEST(test_danger_and_attention_preempt_lower_local_outputs);
    RUN_TEST(test_danger_does_not_restart_an_active_danger_pattern);
    RUN_TEST(test_proximity_blocks_warning_but_not_safety_outputs);
    RUN_TEST(test_failed_delivery_can_roll_back_for_retry);
    return UNITY_END();
}
