#include <unity.h>
#include "buzzer_experiment_pure.h"

void setUp(void) {}
void tearDown(void) {}

static uint32_t totalDuration(const BuzzerPattern& pattern) {
    uint32_t total = 0;
    for (uint8_t i = 0; i < pattern.stepCount; ++i) {
        total += pattern.steps[i].durationMs;
    }
    return total;
}

void test_audio_proxy_assigns_one_distinct_frequency_to_each_buzzer(void) {
    TEST_ASSERT_EQUAL_UINT16(700, AUDIO_PROXY_LEFT_HZ);
    TEST_ASSERT_EQUAL_UINT16(1400, AUDIO_PROXY_RIGHT_HZ);
}

void test_buzzer_and_led_button_ports_match_the_verified_schematics(void) {
    TEST_ASSERT_EQUAL_UINT8(3, BUZZER_LEFT_PIN);    // P1 IO1
    TEST_ASSERT_EQUAL_UINT8(6, CONTROL_BUTTON_PIN); // P2 IO1
    TEST_ASSERT_EQUAL_UINT8(5, CONTROL_LED_PIN);    // P2 IO2
    TEST_ASSERT_EQUAL_UINT8(16, BUZZER_RIGHT_PIN);  // P3 IO1
    TEST_ASSERT_EQUAL_UINT8(0, CONTROL_BUTTON_ACTIVE_LEVEL);
    TEST_ASSERT_EQUAL_UINT8(1, CONTROL_LED_ACTIVE_LEVEL);
}

void test_navigation_left_is_two_low_pulses_on_port_1_only(void) {
    const BuzzerPattern& pattern = patternFor(BuzzerPatternId::NAV_LEFT);
    TEST_ASSERT_EQUAL_STRING("LEFT", pattern.name);
    TEST_ASSERT_EQUAL_UINT8(4, pattern.stepCount);
    TEST_ASSERT_EQUAL_UINT32(800, totalDuration(pattern));
    TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_LEFT_HZ, pattern.steps[0].leftHz);
    TEST_ASSERT_EQUAL_UINT16(0, pattern.steps[0].rightHz);
    TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_LEFT_HZ, pattern.steps[2].leftHz);
    TEST_ASSERT_EQUAL_UINT16(0, pattern.steps[2].rightHz);
}

void test_navigation_right_is_two_high_pulses_on_port_3_only(void) {
    const BuzzerPattern& pattern = patternFor(BuzzerPatternId::NAV_RIGHT);
    TEST_ASSERT_EQUAL_STRING("RIGHT", pattern.name);
    TEST_ASSERT_EQUAL_UINT8(4, pattern.stepCount);
    TEST_ASSERT_EQUAL_UINT32(800, totalDuration(pattern));
    TEST_ASSERT_EQUAL_UINT16(0, pattern.steps[0].leftHz);
    TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_RIGHT_HZ, pattern.steps[0].rightHz);
    TEST_ASSERT_EQUAL_UINT16(0, pattern.steps[2].leftHz);
    TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_RIGHT_HZ, pattern.steps[2].rightHz);
}

void test_stationary_event_is_three_pulses_on_both_buzzers(void) {
    const BuzzerPattern& pattern = patternFor(BuzzerPatternId::EVENT);
    TEST_ASSERT_EQUAL_STRING("EVENT", pattern.name);
    TEST_ASSERT_EQUAL_UINT8(6, pattern.stepCount);
    TEST_ASSERT_EQUAL_UINT32(1500, totalDuration(pattern));
    for (uint8_t i = 0; i < pattern.stepCount; i += 2) {
        TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_LEFT_HZ, pattern.steps[i].leftHz);
        TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_RIGHT_HZ, pattern.steps[i].rightHz);
    }
}

void test_stationary_wait_alternates_left_then_right_twice(void) {
    const BuzzerPattern& pattern = patternFor(BuzzerPatternId::WAIT);
    TEST_ASSERT_EQUAL_STRING("WAIT", pattern.name);
    TEST_ASSERT_EQUAL_UINT8(8, pattern.stepCount);
    TEST_ASSERT_EQUAL_UINT32(2000, totalDuration(pattern));
    TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_LEFT_HZ, pattern.steps[0].leftHz);
    TEST_ASSERT_EQUAL_UINT16(0, pattern.steps[0].rightHz);
    TEST_ASSERT_EQUAL_UINT16(0, pattern.steps[2].leftHz);
    TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_RIGHT_HZ, pattern.steps[2].rightHz);
    TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_LEFT_HZ, pattern.steps[4].leftHz);
    TEST_ASSERT_EQUAL_UINT16(0, pattern.steps[4].rightHz);
    TEST_ASSERT_EQUAL_UINT16(0, pattern.steps[6].leftHz);
    TEST_ASSERT_EQUAL_UINT16(AUDIO_PROXY_RIGHT_HZ, pattern.steps[6].rightHz);
}

int main(int, char**) {
    UNITY_BEGIN();
    RUN_TEST(test_audio_proxy_assigns_one_distinct_frequency_to_each_buzzer);
    RUN_TEST(test_buzzer_and_led_button_ports_match_the_verified_schematics);
    RUN_TEST(test_navigation_left_is_two_low_pulses_on_port_1_only);
    RUN_TEST(test_navigation_right_is_two_high_pulses_on_port_3_only);
    RUN_TEST(test_stationary_event_is_three_pulses_on_both_buzzers);
    RUN_TEST(test_stationary_wait_alternates_left_then_right_twice);
    return UNITY_END();
}
