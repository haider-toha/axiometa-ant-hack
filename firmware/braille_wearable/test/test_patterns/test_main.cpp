#include <unity.h>

#include "patterns.h"

namespace {

void assertStep(const OutputStep& step, uint16_t p1Hz, uint16_t p3Hz,
                uint16_t durationMs) {
    TEST_ASSERT_EQUAL_UINT16(p1Hz, step.p1Hz);
    TEST_ASSERT_EQUAL_UINT16(p3Hz, step.p3Hz);
    TEST_ASSERT_EQUAL_UINT16(durationMs, step.durationMs);
}

void test_directional_patterns_remain_single_channel(void) {
    TEST_ASSERT_EQUAL_UINT8(4, LEFT_PATTERN.stepCount);
    assertStep(LEFT_PATTERN.steps[0], AUDIO_PROXY_LEFT_HZ, 0, 200);
    assertStep(LEFT_PATTERN.steps[1], 0, 0, 200);
    assertStep(LEFT_PATTERN.steps[2], AUDIO_PROXY_LEFT_HZ, 0, 200);
    assertStep(LEFT_PATTERN.steps[3], 0, 0, 200);

    TEST_ASSERT_EQUAL_UINT8(4, RIGHT_PATTERN.stepCount);
    assertStep(RIGHT_PATTERN.steps[0], 0, AUDIO_PROXY_RIGHT_HZ, 200);
    assertStep(RIGHT_PATTERN.steps[1], 0, 0, 200);
    assertStep(RIGHT_PATTERN.steps[2], 0, AUDIO_PROXY_RIGHT_HZ, 200);
    assertStep(RIGHT_PATTERN.steps[3], 0, 0, 200);
}

void test_non_directional_cues_use_both_channels(void) {
    TEST_ASSERT_EQUAL_UINT8(1, AHEAD_PATTERN.stepCount);
    assertStep(AHEAD_PATTERN.steps[0], AUDIO_PROXY_LEFT_HZ,
               AUDIO_PROXY_RIGHT_HZ, 600);

    TEST_ASSERT_EQUAL_UINT8(3, WAIT_PATTERN.stepCount);
    assertStep(WAIT_PATTERN.steps[0], AUDIO_PROXY_LEFT_HZ,
               AUDIO_PROXY_RIGHT_HZ, 200);
    assertStep(WAIT_PATTERN.steps[1], 0, 0, 600);
    assertStep(WAIT_PATTERN.steps[2], AUDIO_PROXY_LEFT_HZ,
               AUDIO_PROXY_RIGHT_HZ, 200);

    TEST_ASSERT_EQUAL_UINT8(5, ERROR_PATTERN.stepCount);
    assertStep(ERROR_PATTERN.steps[0], AUDIO_PROXY_LEFT_HZ,
               AUDIO_PROXY_RIGHT_HZ, 600);
    assertStep(ERROR_PATTERN.steps[1], 0, 0, 300);
    assertStep(ERROR_PATTERN.steps[2], AUDIO_PROXY_LEFT_HZ,
               AUDIO_PROXY_RIGHT_HZ, 150);
    assertStep(ERROR_PATTERN.steps[3], 0, 0, 300);
    assertStep(ERROR_PATTERN.steps[4], AUDIO_PROXY_LEFT_HZ,
               AUDIO_PROXY_RIGHT_HZ, 600);
}

void test_only_directional_patterns_contain_single_channel_output(void) {
    constexpr PatternId patternIds[] = {
        PatternId::DANGER,  PatternId::SIREN_WARNING, PatternId::ATTENTION,
        PatternId::READY,   PatternId::BUS,           PatternId::NUMBER,
        PatternId::WAIT,    PatternId::UNKNOWN,       PatternId::ERROR,
        PatternId::LEFT,    PatternId::RIGHT,         PatternId::AHEAD,
    };

    for (const PatternId id : patternIds) {
        const OutputPattern& pattern = outputPatternFor(id);
        for (uint8_t stepIndex = 0; stepIndex < pattern.stepCount; ++stepIndex) {
            const OutputStep& step = pattern.steps[stepIndex];
            const bool p1Only = step.p1Hz != 0 && step.p3Hz == 0;
            const bool p3Only = step.p1Hz == 0 && step.p3Hz != 0;

            if (p1Only) {
                TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(PatternId::LEFT),
                                        static_cast<uint8_t>(id));
            }
            if (p3Only) {
                TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(PatternId::RIGHT),
                                        static_cast<uint8_t>(id));
            }
        }
    }
}

}  // namespace

int main(int, char**) {
    UNITY_BEGIN();
    RUN_TEST(test_directional_patterns_remain_single_channel);
    RUN_TEST(test_non_directional_cues_use_both_channels);
    RUN_TEST(test_only_directional_patterns_contain_single_channel_output);
    return UNITY_END();
}
