#include <unity.h>
#include "buzzer_experiment_pure.h"

void setUp(void) {}
void tearDown(void) {}

static uint32_t totalDuration(const OutputPattern& pattern) {
    uint32_t total = 0;
    for (uint8_t i = 0; i < pattern.stepCount; ++i) {
        total += pattern.steps[i].durationMs;
    }
    return total;
}

void test_audio_proxy_assigns_one_distinct_frequency_to_each_buzzer(void) {
    TEST_ASSERT_EQUAL_UINT16(2350, AUDIO_PROXY_LEFT_HZ);
    TEST_ASSERT_EQUAL_UINT16(3050, AUDIO_PROXY_RIGHT_HZ);
    TEST_ASSERT_EQUAL_UINT16(700, AUDIO_PROXY_RIGHT_HZ - AUDIO_PROXY_LEFT_HZ);
}

void test_isolated_hot_swap_runner_ports_match_the_verified_schematics(void) {
    TEST_ASSERT_EQUAL_UINT8(3, BUZZER_LEFT_PIN);    // P1 IO1
    TEST_ASSERT_EQUAL_UINT8(6, EXPERIMENT_BUTTON_PIN); // P2 IO1
    TEST_ASSERT_EQUAL_UINT8(5, EXPERIMENT_LED_PIN);    // P2 IO2
    TEST_ASSERT_EQUAL_UINT8(16, BUZZER_RIGHT_PIN);  // P3 IO1
    TEST_ASSERT_EQUAL_UINT8(0, EXPERIMENT_BUTTON_ACTIVE_LEVEL);
    TEST_ASSERT_EQUAL_UINT8(1, EXPERIMENT_LED_ACTIVE_LEVEL);
}

void test_navigation_left_is_two_low_pulses_on_port_1_only(void) {
    const OutputPattern& pattern = outputPatternFor(PatternId::LEFT);
    TEST_ASSERT_EQUAL_STRING("LEFT", pattern.name);
    TEST_ASSERT_EQUAL_UINT8(4, pattern.stepCount);
    TEST_ASSERT_EQUAL_UINT32(800, totalDuration(pattern));
    TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_LEFT_HZ, pattern.steps[0].p1Hz);
    TEST_ASSERT_EQUAL_UINT16(0, pattern.steps[0].p3Hz);
    TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_LEFT_HZ, pattern.steps[2].p1Hz);
    TEST_ASSERT_EQUAL_UINT16(0, pattern.steps[2].p3Hz);
}

void test_navigation_right_is_two_high_pulses_on_port_3_only(void) {
    const OutputPattern& pattern = outputPatternFor(PatternId::RIGHT);
    TEST_ASSERT_EQUAL_STRING("RIGHT", pattern.name);
    TEST_ASSERT_EQUAL_UINT8(4, pattern.stepCount);
    TEST_ASSERT_EQUAL_UINT32(800, totalDuration(pattern));
    TEST_ASSERT_EQUAL_UINT16(0, pattern.steps[0].p1Hz);
    TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_RIGHT_HZ, pattern.steps[0].p3Hz);
    TEST_ASSERT_EQUAL_UINT16(0, pattern.steps[2].p1Hz);
    TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_RIGHT_HZ, pattern.steps[2].p3Hz);
}

void test_bus_event_is_three_ascending_pulses_on_both_buzzers(void) {
    const OutputPattern& pattern = outputPatternFor(PatternId::BUS);
    TEST_ASSERT_EQUAL_STRING("BUS", pattern.name);
    TEST_ASSERT_EQUAL_UINT8(6, pattern.stepCount);
    TEST_ASSERT_EQUAL_UINT32(1500, totalDuration(pattern));
    TEST_ASSERT_EQUAL_UINT16(2050, pattern.steps[0].p1Hz);
    TEST_ASSERT_EQUAL_UINT16(3350, pattern.steps[0].p3Hz);
    TEST_ASSERT_EQUAL_UINT16(2200, pattern.steps[2].p1Hz);
    TEST_ASSERT_EQUAL_UINT16(3200, pattern.steps[2].p3Hz);
    TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_LEFT_HZ, pattern.steps[4].p1Hz);
    TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_RIGHT_HZ, pattern.steps[4].p3Hz);
}

void test_wait_is_two_both_channel_pulses(void) {
    const OutputPattern& pattern = outputPatternFor(PatternId::WAIT);
    TEST_ASSERT_EQUAL_STRING("WAIT", pattern.name);
    TEST_ASSERT_EQUAL_UINT8(3, pattern.stepCount);
    TEST_ASSERT_EQUAL_UINT32(1000, totalDuration(pattern));
    TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_LEFT_HZ, pattern.steps[0].p1Hz);
    TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_RIGHT_HZ, pattern.steps[0].p3Hz);
    TEST_ASSERT_EQUAL_UINT16(0, pattern.steps[1].p1Hz);
    TEST_ASSERT_EQUAL_UINT16(0, pattern.steps[1].p3Hz);
    TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_LEFT_HZ, pattern.steps[2].p1Hz);
    TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_RIGHT_HZ, pattern.steps[2].p3Hz);
}

int main(int, char**) {
    UNITY_BEGIN();
    RUN_TEST(test_audio_proxy_assigns_one_distinct_frequency_to_each_buzzer);
    RUN_TEST(test_isolated_hot_swap_runner_ports_match_the_verified_schematics);
    RUN_TEST(test_navigation_left_is_two_low_pulses_on_port_1_only);
    RUN_TEST(test_navigation_right_is_two_high_pulses_on_port_3_only);
    RUN_TEST(test_bus_event_is_three_ascending_pulses_on_both_buzzers);
    RUN_TEST(test_wait_is_two_both_channel_pulses);
    return UNITY_END();
}
