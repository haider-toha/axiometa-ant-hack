#include <unity.h>

#include <limits.h>
#include <string.h>

#include "relay_pure.h"

void setUp(void) {}
void tearDown(void) {}

static RelayCommand command(uint32_t seq, CloudCommand pattern,
                            const char* route = "") {
    RelayCommand result{};
    result.seq = seq;
    result.pattern = pattern;
    result.confidence = pattern == CloudCommand::NUMBER
        ? RelayConfidence::HIGH_CONFIDENCE
        : RelayConfidence::NO_CONFIDENCE;
    copyRelayRoute(result.route, route);
    return result;
}

void test_wire_command_parser_accepts_only_six_cloud_patterns(void) {
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CloudCommand::NONE),
                            static_cast<uint8_t>(parseCloudCommand("NONE")));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CloudCommand::BUS),
                            static_cast<uint8_t>(parseCloudCommand("BUS")));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CloudCommand::NUMBER),
                            static_cast<uint8_t>(parseCloudCommand("NUMBER")));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CloudCommand::WAIT),
                            static_cast<uint8_t>(parseCloudCommand("WAIT")));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CloudCommand::UNKNOWN),
                            static_cast<uint8_t>(parseCloudCommand("UNKNOWN")));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CloudCommand::ERROR),
                            static_cast<uint8_t>(parseCloudCommand("ERROR")));

    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CloudCommand::INVALID),
                            static_cast<uint8_t>(parseCloudCommand("LEFT")));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CloudCommand::INVALID),
                            static_cast<uint8_t>(parseCloudCommand("RIGHT")));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CloudCommand::INVALID),
                            static_cast<uint8_t>(parseCloudCommand("AHEAD")));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CloudCommand::INVALID),
                            static_cast<uint8_t>(parseCloudCommand("BUS ")));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CloudCommand::INVALID),
                            static_cast<uint8_t>(parseCloudCommand(nullptr)));
}

void test_activity_parser_is_closed_for_missing_or_invalid_values(void) {
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(UserActivity::MOVING),
                            static_cast<uint8_t>(parseUserActivity("MOVING")));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(UserActivity::STILL),
                            static_cast<uint8_t>(parseUserActivity("STILL")));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(UserActivity::UNKNOWN),
                            static_cast<uint8_t>(parseUserActivity("WAITING")));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(UserActivity::UNKNOWN),
                            static_cast<uint8_t>(parseUserActivity(nullptr)));
}

void test_confidence_parser_is_exact_and_closed(void) {
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(RelayConfidence::NO_CONFIDENCE),
                            static_cast<uint8_t>(parseRelayConfidence("")));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(RelayConfidence::LOW_CONFIDENCE),
                            static_cast<uint8_t>(parseRelayConfidence("low")));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(RelayConfidence::HIGH_CONFIDENCE),
                            static_cast<uint8_t>(parseRelayConfidence("high")));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(RelayConfidence::INVALID),
                            static_cast<uint8_t>(parseRelayConfidence("HIGH")));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(RelayConfidence::INVALID),
                            static_cast<uint8_t>(parseRelayConfidence(nullptr)));
}

void test_route_copy_is_bounded_and_only_exact_88_is_expected(void) {
    char route[8] = {};
    copyRelayRoute(route, "1234567890");
    TEST_ASSERT_EQUAL_STRING("1234567", route);
    TEST_ASSERT_TRUE(isExpectedRoute("88"));
    TEST_ASSERT_FALSE(isExpectedRoute("088"));
    TEST_ASSERT_FALSE(isExpectedRoute("87"));
    TEST_ASSERT_FALSE(isExpectedRoute(""));
    TEST_ASSERT_FALSE(isExpectedRoute(nullptr));
}

void test_first_command_is_a_non_rendering_baseline(void) {
    RelaySequenceState state{};
    const RelayDecision decision =
        consumeRelayCommand(state, command(20, CloudCommand::BUS), UserActivity::STILL);
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(RelayDisposition::BASELINE),
                            static_cast<uint8_t>(decision.disposition));
    TEST_ASSERT_EQUAL_UINT32(20, state.lastSeq);
    TEST_ASSERT_FALSE(decision.sequenceGap);
}

void test_moving_consumes_bus_information_without_render_or_replay(void) {
    RelaySequenceState state{};
    consumeRelayCommand(state, command(20, CloudCommand::NONE), UserActivity::MOVING);

    const RelayDecision moving =
        consumeRelayCommand(state, command(21, CloudCommand::BUS), UserActivity::MOVING);
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(RelayDisposition::SUPPRESS),
                            static_cast<uint8_t>(moving.disposition));
    TEST_ASSERT_EQUAL_UINT32(21, state.lastSeq);

    const RelayDecision afterTransition =
        consumeRelayCommand(state, command(21, CloudCommand::BUS), UserActivity::STILL);
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(RelayDisposition::UNCHANGED),
                            static_cast<uint8_t>(afterTransition.disposition));
}

void test_still_accepts_fresh_bus_information_and_error_is_global(void) {
    RelaySequenceState state{};
    consumeRelayCommand(state, command(20, CloudCommand::NONE), UserActivity::MOVING);

    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(RelayDisposition::ACCEPT),
        static_cast<uint8_t>(consumeRelayCommand(
            state, command(21, CloudCommand::NUMBER, "88"), UserActivity::STILL).disposition));
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(RelayDisposition::ACCEPT),
        static_cast<uint8_t>(consumeRelayCommand(
            state, command(22, CloudCommand::ERROR), UserActivity::MOVING).disposition));
}

void test_wrong_route_is_consumed_without_false_route_88_output(void) {
    RelaySequenceState state{};
    consumeRelayCommand(state, command(20, CloudCommand::NONE), UserActivity::STILL);

    const RelayDecision mismatch = consumeRelayCommand(
        state, command(21, CloudCommand::NUMBER, "87"), UserActivity::STILL);
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(RelayDisposition::ROUTE_MISMATCH),
                            static_cast<uint8_t>(mismatch.disposition));
    TEST_ASSERT_EQUAL_UINT32(21, state.lastSeq);
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(RelayDisposition::UNCHANGED),
        static_cast<uint8_t>(consumeRelayCommand(
            state, command(21, CloudCommand::NUMBER, "88"), UserActivity::STILL).disposition));
}

void test_low_confidence_route_88_is_consumed_without_output(void) {
    RelaySequenceState state{};
    consumeRelayCommand(state, command(20, CloudCommand::NONE), UserActivity::STILL);
    RelayCommand low = command(21, CloudCommand::NUMBER, "88");
    low.confidence = RelayConfidence::LOW_CONFIDENCE;

    const RelayDecision decision =
        consumeRelayCommand(state, low, UserActivity::STILL);
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(RelayDisposition::LOW_CONFIDENCE),
                            static_cast<uint8_t>(decision.disposition));
    TEST_ASSERT_EQUAL_UINT32(21, state.lastSeq);
}

void test_duplicate_regressed_invalid_and_none_edges_do_not_render(void) {
    RelaySequenceState state{};
    consumeRelayCommand(state, command(20, CloudCommand::NONE), UserActivity::STILL);

    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(RelayDisposition::UNCHANGED),
        static_cast<uint8_t>(consumeRelayCommand(
            state, command(20, CloudCommand::BUS), UserActivity::STILL).disposition));
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(RelayDisposition::UNCHANGED),
        static_cast<uint8_t>(consumeRelayCommand(
            state, command(19, CloudCommand::BUS), UserActivity::STILL).disposition));
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(RelayDisposition::REJECT),
        static_cast<uint8_t>(consumeRelayCommand(
            state, command(21, CloudCommand::INVALID), UserActivity::STILL).disposition));
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(RelayDisposition::NO_OUTPUT),
        static_cast<uint8_t>(consumeRelayCommand(
            state, command(22, CloudCommand::NONE), UserActivity::STILL).disposition));
}

void test_sequence_gap_is_reported_but_new_edge_is_consumed(void) {
    RelaySequenceState state{};
    consumeRelayCommand(state, command(20, CloudCommand::NONE), UserActivity::STILL);
    const RelayDecision decision =
        consumeRelayCommand(state, command(24, CloudCommand::BUS), UserActivity::STILL);
    TEST_ASSERT_TRUE(decision.sequenceGap);
    TEST_ASSERT_EQUAL_UINT32(3, decision.missedCount);
    TEST_ASSERT_EQUAL_UINT32(24, state.lastSeq);
}

void test_activity_policy_uses_moving_fallback_and_manual_override(void) {
    ActivityControlState state{};
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(UserActivity::MOVING),
                            static_cast<uint8_t>(effectiveActivity(state, 1000)));

    applyCloudActivity(state, UserActivity::STILL, 1000);
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(UserActivity::STILL),
                            static_cast<uint8_t>(effectiveActivity(state, 1001)));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(UserActivity::MOVING),
                            static_cast<uint8_t>(effectiveActivity(
                                state, 1000 + CLOUD_ACTIVITY_LEASE_MS + 1)));

    setServiceActivity(state, UserActivity::STILL);
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(UserActivity::STILL),
                            static_cast<uint8_t>(effectiveActivity(
                                state, 1000 + CLOUD_ACTIVITY_LEASE_MS + 1)));
    clearServiceActivity(state);
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(UserActivity::MOVING),
                            static_cast<uint8_t>(effectiveActivity(
                                state, 1000 + CLOUD_ACTIVITY_LEASE_MS + 1)));
}

void test_missing_activity_snapshot_revokes_still_before_next_command(void) {
    ActivityWireState wire{};
    ActivityControlState control{};
    RelaySequenceState sequence{};

    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(ActivityWireDisposition::BASELINE),
        static_cast<uint8_t>(observeActivitySnapshot(
            wire, true, UserActivity::MOVING, 1, 1000).disposition));

    const ActivityWireDecision still = observeActivitySnapshot(
        wire, true, UserActivity::STILL, 2, 2000);
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(ActivityWireDisposition::APPLY),
        static_cast<uint8_t>(still.disposition));
    applyCloudActivity(control, still.activity, 100);
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(UserActivity::STILL),
                            static_cast<uint8_t>(effectiveActivity(control, 101)));

    const ActivityWireDecision missing = observeActivitySnapshot(
        wire, false, UserActivity::UNKNOWN, 0, 0);
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(ActivityWireDisposition::INVALIDATE),
        static_cast<uint8_t>(missing.disposition));
    invalidateCloudActivity(control);
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(UserActivity::MOVING),
                            static_cast<uint8_t>(effectiveActivity(control, 102)));

    consumeRelayCommand(sequence, command(20, CloudCommand::NONE),
                        UserActivity::MOVING);
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(RelayDisposition::SUPPRESS),
        static_cast<uint8_t>(consumeRelayCommand(
            sequence, command(21, CloudCommand::BUS),
            effectiveActivity(control, 102)).disposition));
}

void test_activity_heartbeat_refreshes_lease_without_changing_sequence(void) {
    ActivityWireState wire{};
    ActivityControlState control{};
    observeActivitySnapshot(wire, true, UserActivity::MOVING, 1, 1000);
    const ActivityWireDecision still = observeActivitySnapshot(
        wire, true, UserActivity::STILL, 2, 2000);
    applyCloudActivity(control, still.activity, 100);

    const ActivityWireDecision heartbeat = observeActivitySnapshot(
        wire, true, UserActivity::STILL, 2, 3000);
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(ActivityWireDisposition::APPLY),
        static_cast<uint8_t>(heartbeat.disposition));
    applyCloudActivity(control, heartbeat.activity,
                       100 + CLOUD_ACTIVITY_LEASE_MS);
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(UserActivity::STILL),
        static_cast<uint8_t>(effectiveActivity(
            control, 100 + CLOUD_ACTIVITY_LEASE_MS + 1)));

    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(ActivityWireDisposition::NO_CHANGE),
        static_cast<uint8_t>(observeActivitySnapshot(
            wire, true, UserActivity::STILL, 2, 3000).disposition));
}

void test_baseline_heartbeat_does_not_open_still_gate(void) {
    ActivityWireState wire{};
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(ActivityWireDisposition::BASELINE),
        static_cast<uint8_t>(observeActivitySnapshot(
            wire, true, UserActivity::STILL, 4, 1000).disposition));
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(ActivityWireDisposition::NO_CHANGE),
        static_cast<uint8_t>(observeActivitySnapshot(
            wire, true, UserActivity::STILL, 4, 2000).disposition));
}

void test_activity_lease_and_tof_policy_are_millis_wrap_safe(void) {
    ActivityControlState state{};
    applyCloudActivity(state, UserActivity::STILL, UINT32_MAX - 10);
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(UserActivity::STILL),
                            static_cast<uint8_t>(effectiveActivity(state, 20)));
    TEST_ASSERT_FALSE(allowsProximityOutput(UserActivity::STILL));
    TEST_ASSERT_TRUE(allowsProximityOutput(UserActivity::MOVING));
    TEST_ASSERT_FALSE(allowsProximityOutput(UserActivity::UNKNOWN));
}

void test_entering_still_clears_rendered_proximity_but_moving_does_not(void) {
    TEST_ASSERT_TRUE(activityTransitionClearsProximity(
        UserActivity::MOVING, UserActivity::STILL));
    TEST_ASSERT_FALSE(activityTransitionClearsProximity(
        UserActivity::STILL, UserActivity::MOVING));
    TEST_ASSERT_FALSE(activityTransitionClearsProximity(
        UserActivity::STILL, UserActivity::STILL));

    TEST_ASSERT_TRUE(shouldRenderProximity(UserActivity::MOVING, true, true));
    TEST_ASSERT_FALSE(shouldRenderProximity(UserActivity::STILL, true, true));
    TEST_ASSERT_FALSE(shouldRenderProximity(UserActivity::MOVING, false, true));
    TEST_ASSERT_FALSE(shouldRenderProximity(UserActivity::MOVING, true, false));
}

int main(int, char**) {
    UNITY_BEGIN();
    RUN_TEST(test_wire_command_parser_accepts_only_six_cloud_patterns);
    RUN_TEST(test_activity_parser_is_closed_for_missing_or_invalid_values);
    RUN_TEST(test_confidence_parser_is_exact_and_closed);
    RUN_TEST(test_route_copy_is_bounded_and_only_exact_88_is_expected);
    RUN_TEST(test_first_command_is_a_non_rendering_baseline);
    RUN_TEST(test_moving_consumes_bus_information_without_render_or_replay);
    RUN_TEST(test_still_accepts_fresh_bus_information_and_error_is_global);
    RUN_TEST(test_wrong_route_is_consumed_without_false_route_88_output);
    RUN_TEST(test_low_confidence_route_88_is_consumed_without_output);
    RUN_TEST(test_duplicate_regressed_invalid_and_none_edges_do_not_render);
    RUN_TEST(test_sequence_gap_is_reported_but_new_edge_is_consumed);
    RUN_TEST(test_activity_policy_uses_moving_fallback_and_manual_override);
    RUN_TEST(test_missing_activity_snapshot_revokes_still_before_next_command);
    RUN_TEST(test_activity_heartbeat_refreshes_lease_without_changing_sequence);
    RUN_TEST(test_baseline_heartbeat_does_not_open_still_gate);
    RUN_TEST(test_activity_lease_and_tof_policy_are_millis_wrap_safe);
    RUN_TEST(test_entering_still_clears_rendered_proximity_but_moving_does_not);
    return UNITY_END();
}
