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

static uint8_t disposition(RelaySequenceState& state, const RelayCommand& input,
                           UserActivity activity) {
    return static_cast<uint8_t>(
        consumeRelayCommand(state, input, activity).disposition);
}

static uint8_t gate(bool outputEnabled, UserActivity activity,
                    CloudCommand input, bool proximity, bool siren) {
    return static_cast<uint8_t>(
        evaluateCommandGate(outputEnabled, activity, input, proximity, siren));
}

void test_wire_command_parser_accepts_the_nine_cloud_patterns(void) {
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

    // Camera-derived bus bearing. Previously parsed to INVALID and dropped.
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CloudCommand::LEFT),
                            static_cast<uint8_t>(parseCloudCommand("LEFT")));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CloudCommand::RIGHT),
                            static_cast<uint8_t>(parseCloudCommand("RIGHT")));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CloudCommand::AHEAD),
                            static_cast<uint8_t>(parseCloudCommand("AHEAD")));

    // The parser stays closed and exact for everything else.
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CloudCommand::INVALID),
                            static_cast<uint8_t>(parseCloudCommand("BUS ")));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CloudCommand::INVALID),
                            static_cast<uint8_t>(parseCloudCommand("left")));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CloudCommand::INVALID),
                            static_cast<uint8_t>(parseCloudCommand("LEFT ")));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CloudCommand::INVALID),
                            static_cast<uint8_t>(parseCloudCommand("CENTRE")));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CloudCommand::INVALID),
                            static_cast<uint8_t>(parseCloudCommand("")));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(CloudCommand::INVALID),
                            static_cast<uint8_t>(parseCloudCommand(nullptr)));
}

void test_command_names_round_trip_through_the_wire_vocabulary(void) {
    const CloudCommand all[] = {
        CloudCommand::NONE, CloudCommand::BUS,   CloudCommand::NUMBER,
        CloudCommand::WAIT, CloudCommand::UNKNOWN, CloudCommand::ERROR,
        CloudCommand::LEFT, CloudCommand::RIGHT, CloudCommand::AHEAD,
    };
    for (uint8_t index = 0; index < sizeof(all) / sizeof(all[0]); ++index) {
        TEST_ASSERT_EQUAL_UINT8(
            static_cast<uint8_t>(all[index]),
            static_cast<uint8_t>(parseCloudCommand(cloudCommandName(all[index]))));
    }
    TEST_ASSERT_EQUAL_STRING("LEFT", cloudCommandName(CloudCommand::LEFT));
    TEST_ASSERT_EQUAL_STRING("RIGHT", cloudCommandName(CloudCommand::RIGHT));
    TEST_ASSERT_EQUAL_STRING("AHEAD", cloudCommandName(CloudCommand::AHEAD));
    TEST_ASSERT_EQUAL_STRING("INVALID", cloudCommandName(CloudCommand::INVALID));
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

void test_activity_gate_truth_table_is_exhaustive(void) {
    const CloudCommand commands[] = {
        CloudCommand::NONE,    CloudCommand::BUS,   CloudCommand::NUMBER,
        CloudCommand::WAIT,    CloudCommand::UNKNOWN, CloudCommand::ERROR,
        CloudCommand::LEFT,    CloudCommand::RIGHT, CloudCommand::AHEAD,
        CloudCommand::INVALID,
    };
    //                    NONE   BUS    NUM    WAIT   UNKN   ERR    LEFT   RIGHT  AHEAD  INVAL
    const bool still[] = {true,  true,  true,  true,  true,  true,  true,  true,  true,  false};
    const bool moving[] = {true, false, false, false, false, true,  true,  true,  true,  false};
    const bool unset[] = {true,  false, false, false, false, true,  false, false, false, false};

    for (uint8_t index = 0; index < sizeof(commands) / sizeof(commands[0]); ++index) {
        TEST_ASSERT_EQUAL_INT(
            still[index], acceptsRelayCommand(UserActivity::STILL, commands[index]));
        TEST_ASSERT_EQUAL_INT(
            moving[index], acceptsRelayCommand(UserActivity::MOVING, commands[index]));
        TEST_ASSERT_EQUAL_INT(
            unset[index], acceptsRelayCommand(UserActivity::UNKNOWN, commands[index]));
    }
}

void test_camera_bearing_renders_in_both_phases_and_needs_known_activity(void) {
    RelaySequenceState state{};
    consumeRelayCommand(state, command(20, CloudCommand::NONE), UserActivity::MOVING);

    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(RelayDisposition::ACCEPT),
        disposition(state, command(21, CloudCommand::LEFT), UserActivity::MOVING));
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(RelayDisposition::ACCEPT),
        disposition(state, command(22, CloudCommand::RIGHT), UserActivity::MOVING));
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(RelayDisposition::ACCEPT),
        disposition(state, command(23, CloudCommand::AHEAD), UserActivity::MOVING));

    // Audit 23: the user scans for the bus while STANDING STILL, so the first
    // direction must be deliverable before the first step is taken.
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(RelayDisposition::ACCEPT),
        disposition(state, command(24, CloudCommand::LEFT), UserActivity::STILL));

    // UNKNOWN still refuses: no directions without a fresh activity claim.
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(RelayDisposition::SUPPRESS),
        disposition(state, command(25, CloudCommand::AHEAD), UserActivity::UNKNOWN));

    // A suppressed bearing is consumed, not queued: it must not replay when
    // activity later becomes known.
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(RelayDisposition::UNCHANGED),
        disposition(state, command(25, CloudCommand::AHEAD), UserActivity::MOVING));
    TEST_ASSERT_EQUAL_UINT32(25, state.lastSeq);
}

void test_bearing_is_not_route_or_confidence_gated_like_number(void) {
    RelaySequenceState state{};
    consumeRelayCommand(state, command(20, CloudCommand::NONE), UserActivity::MOVING);

    // The route/confidence gates exist to stop a false route-88 readout. A
    // bearing carries neither, so an empty route and no confidence still render.
    RelayCommand bearing = command(21, CloudCommand::RIGHT, "");
    bearing.confidence = RelayConfidence::NO_CONFIDENCE;
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(RelayDisposition::ACCEPT),
                            disposition(state, bearing, UserActivity::MOVING));

    RelayCommand mismatched = command(22, CloudCommand::LEFT, "87");
    mismatched.confidence = RelayConfidence::LOW_CONFIDENCE;
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(RelayDisposition::ACCEPT),
                            disposition(state, mismatched, UserActivity::MOVING));

    // The NUMBER gates are untouched by that.
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(RelayDisposition::ROUTE_MISMATCH),
        disposition(state, command(23, CloudCommand::NUMBER, "87"),
                    UserActivity::STILL));
}

void test_local_proximity_and_siren_outrank_accepted_cloud_commands(void) {
    // Bearings are accepted in exactly the state where ToF proximity renders,
    // so this precedence is what stops a bearing masking an obstacle.
    TEST_ASSERT_TRUE(shouldRenderProximity(UserActivity::MOVING, true, true));

    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(CommandGate::ALLOW),
        gate(true, UserActivity::MOVING, CloudCommand::LEFT, false, false));
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(CommandGate::LOCAL_PROXIMITY),
        gate(true, UserActivity::MOVING, CloudCommand::LEFT, true, false));
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(CommandGate::LOCAL_SIREN),
        gate(true, UserActivity::MOVING, CloudCommand::AHEAD, false, true));
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(CommandGate::LOCAL_PROXIMITY),
        gate(true, UserActivity::MOVING, CloudCommand::RIGHT, true, true));

    // The STILL bus payload and the global ERROR keep the same subordination.
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(CommandGate::LOCAL_SIREN),
        gate(true, UserActivity::STILL, CloudCommand::BUS, false, true));
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(CommandGate::LOCAL_SIREN),
        gate(true, UserActivity::STILL, CloudCommand::ERROR, false, true));

    // The emergency-stop latch outranks every source, local or cloud.
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(CommandGate::OUTPUT_STOPPED),
        gate(false, UserActivity::MOVING, CloudCommand::LEFT, false, false));

    // Audit 23: a STILL bearing passes the activity gate now, so local safety
    // is what arbitrates it — proximity cannot render in STILL by policy, but
    // the pure gate must still rank it above the cloud if it ever were.
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(CommandGate::LOCAL_PROXIMITY),
        gate(true, UserActivity::STILL, CloudCommand::LEFT, true, false));
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(CommandGate::ALLOW),
        gate(true, UserActivity::STILL, CloudCommand::LEFT, false, false));
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(CommandGate::ACTIVITY_GATE),
        gate(true, UserActivity::MOVING, CloudCommand::INVALID, false, false));
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

void test_long_outage_reset_revokes_authorized_still(void) {
    RelaySequenceState sequence{};
    ActivityControlState control{};
    consumeRelayCommand(sequence, command(20, CloudCommand::NONE),
                        UserActivity::MOVING);
    applyCloudActivity(control, UserActivity::STILL, 100);
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(UserActivity::STILL),
                            static_cast<uint8_t>(effectiveActivity(control, 101)));

    resetRelayControlAfterOutage(sequence, control);

    TEST_ASSERT_FALSE(sequence.initialized);
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(UserActivity::MOVING),
                            static_cast<uint8_t>(effectiveActivity(control, 102)));
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
    RUN_TEST(test_wire_command_parser_accepts_the_nine_cloud_patterns);
    RUN_TEST(test_command_names_round_trip_through_the_wire_vocabulary);
    RUN_TEST(test_activity_parser_is_closed_for_missing_or_invalid_values);
    RUN_TEST(test_confidence_parser_is_exact_and_closed);
    RUN_TEST(test_route_copy_is_bounded_and_only_exact_88_is_expected);
    RUN_TEST(test_first_command_is_a_non_rendering_baseline);
    RUN_TEST(test_moving_consumes_bus_information_without_render_or_replay);
    RUN_TEST(test_still_accepts_fresh_bus_information_and_error_is_global);
    RUN_TEST(test_activity_gate_truth_table_is_exhaustive);
    RUN_TEST(test_camera_bearing_renders_in_both_phases_and_needs_known_activity);
    RUN_TEST(test_bearing_is_not_route_or_confidence_gated_like_number);
    RUN_TEST(test_local_proximity_and_siren_outrank_accepted_cloud_commands);
    RUN_TEST(test_wrong_route_is_consumed_without_false_route_88_output);
    RUN_TEST(test_low_confidence_route_88_is_consumed_without_output);
    RUN_TEST(test_duplicate_regressed_invalid_and_none_edges_do_not_render);
    RUN_TEST(test_sequence_gap_is_reported_but_new_edge_is_consumed);
    RUN_TEST(test_activity_policy_uses_moving_fallback_and_manual_override);
    RUN_TEST(test_missing_activity_snapshot_revokes_still_before_next_command);
    RUN_TEST(test_activity_heartbeat_refreshes_lease_without_changing_sequence);
    RUN_TEST(test_baseline_heartbeat_does_not_open_still_gate);
    RUN_TEST(test_long_outage_reset_revokes_authorized_still);
    RUN_TEST(test_activity_lease_and_tof_policy_are_millis_wrap_safe);
    RUN_TEST(test_entering_still_clears_rendered_proximity_but_moving_does_not);
    return UNITY_END();
}
