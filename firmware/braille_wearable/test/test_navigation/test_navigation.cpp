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

void test_all_activity_and_relay_command_combinations(void) {
    const CloudCommand commands[] = {
        CloudCommand::NONE, CloudCommand::BUS, CloudCommand::NUMBER,
        CloudCommand::WAIT, CloudCommand::UNKNOWN, CloudCommand::ERROR,
        CloudCommand::LEFT, CloudCommand::RIGHT, CloudCommand::AHEAD,
        CloudCommand::INVALID,
    };
    // Audit 23: LEFT/RIGHT/AHEAD are accepted in BOTH known phases — the user
    // scans for the bus while standing still and needs the first direction
    // before the first step. Only UNKNOWN refuses bearings.
    const bool stillAccepted[] = {true, true, true, true, true, true,
                                  true, true, true, false};
    const bool movingAccepted[] = {true, false, false, false, false, true,
                                   true, true, true, false};

    for (uint8_t index = 0; index < sizeof(commands) / sizeof(commands[0]); ++index) {
        TEST_ASSERT_EQUAL_INT(stillAccepted[index], acceptsRelayCommand(UserActivity::STILL, commands[index]));
        TEST_ASSERT_EQUAL_INT(movingAccepted[index], acceptsRelayCommand(UserActivity::MOVING, commands[index]));
    }
}

void test_unknown_activity_keeps_bus_gate_closed(void) {
    TEST_ASSERT_FALSE(acceptsRelayCommand(UserActivity::UNKNOWN, CloudCommand::BUS));
    TEST_ASSERT_FALSE(acceptsRelayCommand(UserActivity::UNKNOWN, CloudCommand::NUMBER));
    TEST_ASSERT_TRUE(acceptsRelayCommand(UserActivity::UNKNOWN, CloudCommand::ERROR));
}

void test_left_audio_pattern_is_exact(void) {
    const OutputPattern* pattern = serviceDirectionPattern(ServiceDirection::LEFT);
    TEST_ASSERT_NOT_NULL(pattern);
    TEST_ASSERT_EQUAL_UINT8(4, pattern->stepCount);
    assertStep(pattern->steps[0], 2350, 0, 200);
    assertStep(pattern->steps[1], 0, 0, 200);
    assertStep(pattern->steps[2], 2350, 0, 200);
    assertStep(pattern->steps[3], 0, 0, 200);
    TEST_ASSERT_EQUAL_UINT16(800, outputPatternDurationMs(*pattern));
}

void test_right_audio_pattern_is_exact(void) {
    const OutputPattern* pattern = serviceDirectionPattern(ServiceDirection::RIGHT);
    TEST_ASSERT_NOT_NULL(pattern);
    TEST_ASSERT_EQUAL_UINT8(4, pattern->stepCount);
    assertStep(pattern->steps[0], 0, 3050, 200);
    assertStep(pattern->steps[1], 0, 0, 200);
    assertStep(pattern->steps[2], 0, 3050, 200);
    assertStep(pattern->steps[3], 0, 0, 200);
    TEST_ASSERT_EQUAL_UINT16(800, outputPatternDurationMs(*pattern));
}

void test_ahead_audio_pattern_is_exact(void) {
    const OutputPattern* pattern = serviceDirectionPattern(ServiceDirection::AHEAD);
    TEST_ASSERT_NOT_NULL(pattern);
    TEST_ASSERT_EQUAL_UINT8(1, pattern->stepCount);
    assertStep(pattern->steps[0], 2350, 3050, 600);
    TEST_ASSERT_EQUAL_UINT16(600, outputPatternDurationMs(*pattern));
}

void test_non_navigation_commands_have_no_audio_pattern(void) {
    TEST_ASSERT_NOT_NULL(serviceDirectionPattern(ServiceDirection::LEFT));
    TEST_ASSERT_NOT_NULL(serviceDirectionPattern(ServiceDirection::RIGHT));
    TEST_ASSERT_NOT_NULL(serviceDirectionPattern(ServiceDirection::AHEAD));
}

void test_implemented_cloud_commands_map_to_canonical_patterns(void) {
    TEST_ASSERT_EQUAL_PTR(&BUS_PATTERN, cloudPattern(CloudCommand::BUS));
    TEST_ASSERT_EQUAL_PTR(&NUMBER_PATTERN, cloudPattern(CloudCommand::NUMBER));
    TEST_ASSERT_EQUAL_PTR(&WAIT_PATTERN, cloudPattern(CloudCommand::WAIT));
    TEST_ASSERT_EQUAL_PTR(&UNKNOWN_PATTERN, cloudPattern(CloudCommand::UNKNOWN));
    TEST_ASSERT_EQUAL_PTR(&ERROR_PATTERN, cloudPattern(CloudCommand::ERROR));
    TEST_ASSERT_NULL(cloudPattern(CloudCommand::NONE));
    TEST_ASSERT_NULL(cloudPattern(CloudCommand::INVALID));
}

void test_camera_bearing_reuses_the_service_direction_patterns(void) {
    // A relay bearing must land on the same audio proxies the service-Serial
    // l/r/a keys already drive — one output vocabulary, two input sources.
    TEST_ASSERT_EQUAL_PTR(&LEFT_PATTERN, cloudPattern(CloudCommand::LEFT));
    TEST_ASSERT_EQUAL_PTR(&RIGHT_PATTERN, cloudPattern(CloudCommand::RIGHT));
    TEST_ASSERT_EQUAL_PTR(&AHEAD_PATTERN, cloudPattern(CloudCommand::AHEAD));

    TEST_ASSERT_EQUAL_PTR(serviceDirectionPattern(ServiceDirection::LEFT),
                          cloudPattern(CloudCommand::LEFT));
    TEST_ASSERT_EQUAL_PTR(serviceDirectionPattern(ServiceDirection::RIGHT),
                          cloudPattern(CloudCommand::RIGHT));
    TEST_ASSERT_EQUAL_PTR(serviceDirectionPattern(ServiceDirection::AHEAD),
                          cloudPattern(CloudCommand::AHEAD));

    TEST_ASSERT_EQUAL_UINT16(800, outputPatternDurationMs(LEFT_PATTERN));
    TEST_ASSERT_EQUAL_UINT16(800, outputPatternDurationMs(RIGHT_PATTERN));
    TEST_ASSERT_EQUAL_UINT16(600, outputPatternDurationMs(AHEAD_PATTERN));
}

void test_wait_and_waiting_mode_payload_durations_match_plan(void) {
    TEST_ASSERT_EQUAL_UINT16(400, outputPatternDurationMs(READY_PATTERN));
    TEST_ASSERT_EQUAL_UINT16(1500, outputPatternDurationMs(BUS_PATTERN));
    TEST_ASSERT_EQUAL_UINT16(6400, outputPatternDurationMs(NUMBER_PATTERN));
    TEST_ASSERT_EQUAL_UINT16(1000, outputPatternDurationMs(WAIT_PATTERN));
    TEST_ASSERT_EQUAL_UINT16(900, outputPatternDurationMs(UNKNOWN_PATTERN));
    TEST_ASSERT_EQUAL_UINT16(1950, outputPatternDurationMs(ERROR_PATTERN));
}

void test_waiting_mode_waveforms_keep_the_locked_audio_contrasts(void) {
    TEST_ASSERT_EQUAL_UINT8(3, READY_PATTERN.stepCount);
    assertStep(READY_PATTERN.steps[0], 2100, 3300, 100);
    assertStep(READY_PATTERN.steps[1], 2250, 3150, 100);
    assertStep(READY_PATTERN.steps[2], 2350, 3050, 200);

    TEST_ASSERT_EQUAL_UINT8(6, BUS_PATTERN.stepCount);
    assertStep(BUS_PATTERN.steps[0], 2050, 3350, 250);
    assertStep(BUS_PATTERN.steps[2], 2200, 3200, 250);
    assertStep(BUS_PATTERN.steps[4], 2350, 3050, 250);

    TEST_ASSERT_EQUAL_UINT16(2700, NUMBER_PATTERN.steps[0].p1Hz);
    TEST_ASSERT_EQUAL_UINT16(2700, NUMBER_PATTERN.steps[0].p3Hz);
    TEST_ASSERT_EQUAL_UINT16(2350, NUMBER_PATTERN.steps[2].p1Hz);
    TEST_ASSERT_EQUAL_UINT16(3050, NUMBER_PATTERN.steps[2].p3Hz);
    TEST_ASSERT_EQUAL_UINT16(2700,
                             NUMBER_PATTERN.steps[NUMBER_PATTERN.stepCount - 1].p1Hz);

    TEST_ASSERT_EQUAL_UINT8(3, UNKNOWN_PATTERN.stepCount);
    assertStep(UNKNOWN_PATTERN.steps[0], 2350, 3050, 300);
    assertStep(UNKNOWN_PATTERN.steps[1], 2050, 3350, 300);
    assertStep(UNKNOWN_PATTERN.steps[2], 1750, 3650, 300);

    TEST_ASSERT_EQUAL_UINT8(5, ERROR_PATTERN.stepCount);
    assertStep(ERROR_PATTERN.steps[0], 2350, 3050, 600);
    assertStep(ERROR_PATTERN.steps[2], 2350, 3050, 150);
    assertStep(ERROR_PATTERN.steps[4], 2350, 3050, 600);
}

int main(int, char**) {
    UNITY_BEGIN();
    RUN_TEST(test_all_activity_and_relay_command_combinations);
    RUN_TEST(test_unknown_activity_keeps_bus_gate_closed);
    RUN_TEST(test_left_audio_pattern_is_exact);
    RUN_TEST(test_right_audio_pattern_is_exact);
    RUN_TEST(test_ahead_audio_pattern_is_exact);
    RUN_TEST(test_non_navigation_commands_have_no_audio_pattern);
    RUN_TEST(test_implemented_cloud_commands_map_to_canonical_patterns);
    RUN_TEST(test_camera_bearing_reuses_the_service_direction_patterns);
    RUN_TEST(test_wait_and_waiting_mode_payload_durations_match_plan);
    RUN_TEST(test_waiting_mode_waveforms_keep_the_locked_audio_contrasts);
    return UNITY_END();
}
