#include <unity.h>

#include "navigation_pure.h"
#include "patterns.h"

void setUp(void) {}
void tearDown(void) {}

static void assertStep(const OutputStep& step, uint16_t p1Hz,
                       uint16_t p3Hz, uint16_t durationMs) {
    TEST_ASSERT_EQUAL_UINT16(p1Hz, step.p1Hz);
    TEST_ASSERT_EQUAL_UINT16(p3Hz, step.p3Hz);
    TEST_ASSERT_EQUAL_UINT16(durationMs, step.durationMs);
}

void test_all_board_mode_and_command_combinations(void) {
    const CloudCommand commands[] = {
        CloudCommand::NONE, CloudCommand::BUS, CloudCommand::NUMBER,
        CloudCommand::WAIT, CloudCommand::UNKNOWN, CloudCommand::ERROR,
        CloudCommand::LEFT, CloudCommand::RIGHT, CloudCommand::AHEAD,
    };
    const bool stillAccepted[] = {true, true, true, true, true, true, false, false, false};
    const bool movingAccepted[] = {true, false, false, false, false, true, true, true, true};

    for (uint8_t index = 0; index < sizeof(commands) / sizeof(commands[0]); ++index) {
        TEST_ASSERT_EQUAL_INT(stillAccepted[index], acceptsCloudCommand(BoardMode::WAITING, commands[index]));
        TEST_ASSERT_EQUAL_INT(movingAccepted[index], acceptsCloudCommand(BoardMode::NAVIGATION, commands[index]));
    }
}

void test_phone_activity_maps_to_explicit_board_modes(void) {
    const CloudCommand commands[] = {
        CloudCommand::NONE, CloudCommand::BUS, CloudCommand::NUMBER,
        CloudCommand::WAIT, CloudCommand::UNKNOWN, CloudCommand::ERROR,
        CloudCommand::LEFT, CloudCommand::RIGHT, CloudCommand::AHEAD,
    };

    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(BoardMode::WAITING),
                            static_cast<uint8_t>(boardModeFor(UserActivity::STILL)));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(BoardMode::NAVIGATION),
                            static_cast<uint8_t>(boardModeFor(UserActivity::MOVING)));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(BoardMode::WAITING),
                            static_cast<uint8_t>(boardModeFor(UserActivity::UNKNOWN)));
    for (uint8_t index = 0; index < sizeof(commands) / sizeof(commands[0]); ++index) {
        TEST_ASSERT_EQUAL_INT(acceptsCloudCommand(BoardMode::WAITING, commands[index]),
                              acceptsCloudCommand(boardModeFor(UserActivity::UNKNOWN), commands[index]));
    }
}

void test_left_audio_pattern_is_exact(void) {
    const OutputPattern* pattern = navigationPattern(CloudCommand::LEFT);
    TEST_ASSERT_NOT_NULL(pattern);
    TEST_ASSERT_EQUAL_UINT8(4, pattern->stepCount);
    assertStep(pattern->steps[0], 2350, 0, 200);
    assertStep(pattern->steps[1], 0, 0, 200);
    assertStep(pattern->steps[2], 2350, 0, 200);
    assertStep(pattern->steps[3], 0, 0, 200);
    TEST_ASSERT_EQUAL_UINT16(800, outputPatternDurationMs(*pattern));
}

void test_right_audio_pattern_is_exact(void) {
    const OutputPattern* pattern = navigationPattern(CloudCommand::RIGHT);
    TEST_ASSERT_NOT_NULL(pattern);
    TEST_ASSERT_EQUAL_UINT8(4, pattern->stepCount);
    assertStep(pattern->steps[0], 0, 3050, 200);
    assertStep(pattern->steps[1], 0, 0, 200);
    assertStep(pattern->steps[2], 0, 3050, 200);
    assertStep(pattern->steps[3], 0, 0, 200);
    TEST_ASSERT_EQUAL_UINT16(800, outputPatternDurationMs(*pattern));
}

void test_ahead_audio_pattern_is_exact(void) {
    const OutputPattern* pattern = navigationPattern(CloudCommand::AHEAD);
    TEST_ASSERT_NOT_NULL(pattern);
    TEST_ASSERT_EQUAL_UINT8(3, pattern->stepCount);
    assertStep(pattern->steps[0], 2350, 3050, 400);
    assertStep(pattern->steps[1], 0, 0, 200);
    assertStep(pattern->steps[2], 2350, 3050, 400);
    TEST_ASSERT_EQUAL_UINT16(1000, outputPatternDurationMs(*pattern));
}

void test_non_navigation_commands_have_no_audio_pattern(void) {
    TEST_ASSERT_NULL(navigationPattern(CloudCommand::NONE));
    TEST_ASSERT_NULL(navigationPattern(CloudCommand::BUS));
    TEST_ASSERT_NULL(navigationPattern(CloudCommand::NUMBER));
    TEST_ASSERT_NULL(navigationPattern(CloudCommand::WAIT));
    TEST_ASSERT_NULL(navigationPattern(CloudCommand::UNKNOWN));
    TEST_ASSERT_NULL(navigationPattern(CloudCommand::ERROR));
}

int main(int, char**) {
    UNITY_BEGIN();
    RUN_TEST(test_all_board_mode_and_command_combinations);
    RUN_TEST(test_phone_activity_maps_to_explicit_board_modes);
    RUN_TEST(test_left_audio_pattern_is_exact);
    RUN_TEST(test_right_audio_pattern_is_exact);
    RUN_TEST(test_ahead_audio_pattern_is_exact);
    RUN_TEST(test_non_navigation_commands_have_no_audio_pattern);
    return UNITY_END();
}
