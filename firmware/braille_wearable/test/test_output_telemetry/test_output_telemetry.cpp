#include <unity.h>

#include "output_telemetry_pure.h"

void setUp(void) {}
void tearDown(void) {}

namespace {

OutputSemanticInputs idleInputs() {
    return {
        true,
        false,
        "NONE",
        false,
        false,
        false,
        false,
        OutputTelemetrySource::NONE,
        "NONE",
        UserActivity::MOVING,
        -1,
        OutputMode::AUDIBLE,
    };
}

void test_direction_override_is_reported_instead_of_masking_proximity(void) {
    OutputSemanticInputs inputs = idleInputs();
    inputs.proximityActive = true;
    inputs.proximityCanRender = true;
    inputs.playerActive = true;
    inputs.playerOverridesProximity = true;
    inputs.playerSource = OutputTelemetrySource::RELAY;
    inputs.playerPattern = "LEFT";

    const OutputSemanticSnapshot snapshot = selectOutputSemantics(inputs);

    TEST_ASSERT_EQUAL(OutputTelemetryState::ACTIVE, snapshot.state);
    TEST_ASSERT_EQUAL(OutputTelemetrySource::RELAY, snapshot.source);
    TEST_ASSERT_EQUAL_STRING("LEFT", snapshot.pattern);
    TEST_ASSERT_EQUAL(OutputTelemetryReason::PLAYING, snapshot.reason);
}

} // namespace

void test_formats_protocol_v2_local_proximity_record(void) {
    OutputSemanticInputs inputs = idleInputs();
    inputs.proximityActive = true;
    inputs.proximityCanRender = true;
    inputs.tofMm = 444;
    const OutputSemanticSnapshot snapshot = selectOutputSemantics(inputs);

    char buffer[320];
    const int length = formatOutputTelemetry(
        buffer, sizeof(buffer), {2350, 0}, 123456, snapshot);

    TEST_ASSERT_GREATER_THAN(0, length);
    TEST_ASSERT_EQUAL_STRING(
        "TACTA_OUTPUT {\"v\":2,\"leftHz\":2350,\"rightHz\":0,\"upMs\":123456,"
        "\"state\":\"ACTIVE\",\"source\":\"LOCAL_TOF\",\"pattern\":\"PROXIMITY\","
        "\"activity\":\"MOVING\",\"reason\":\"PLAYING\",\"tofMm\":444,"
        "\"outputMode\":\"AUDIBLE\"}\n",
        buffer);
}

void test_disabled_output_latch_has_highest_precedence(void) {
    OutputSemanticInputs inputs = idleInputs();
    inputs.outputEnabled = false;
    inputs.sirenActive = true;
    inputs.sirenPattern = "DANGER";
    inputs.proximityActive = true;
    inputs.proximityCanRender = true;
    inputs.playerActive = true;
    inputs.playerSource = OutputTelemetrySource::RELAY;
    inputs.playerPattern = "RIGHT";

    const OutputSemanticSnapshot snapshot = selectOutputSemantics(inputs);

    TEST_ASSERT_EQUAL(OutputTelemetryState::STOPPED, snapshot.state);
    TEST_ASSERT_EQUAL(OutputTelemetrySource::NONE, snapshot.source);
    TEST_ASSERT_EQUAL_STRING("NONE", snapshot.pattern);
    TEST_ASSERT_EQUAL(OutputTelemetryReason::OUTPUT_STOPPED, snapshot.reason);
}

void test_siren_outranks_proximity_and_player(void) {
    OutputSemanticInputs inputs = idleInputs();
    inputs.sirenActive = true;
    inputs.sirenPattern = "SIREN";
    inputs.proximityActive = true;
    inputs.proximityCanRender = true;
    inputs.playerActive = true;
    inputs.playerSource = OutputTelemetrySource::RELAY;
    inputs.playerPattern = "BUS";

    const OutputSemanticSnapshot snapshot = selectOutputSemantics(inputs);

    TEST_ASSERT_EQUAL(OutputTelemetryState::ACTIVE, snapshot.state);
    TEST_ASSERT_EQUAL(OutputTelemetrySource::LOCAL_SIREN, snapshot.source);
    TEST_ASSERT_EQUAL_STRING("SIREN", snapshot.pattern);
    TEST_ASSERT_EQUAL(OutputTelemetryReason::PLAYING, snapshot.reason);
}

void test_player_outranks_suppressed_still_proximity(void) {
    OutputSemanticInputs inputs = idleInputs();
    inputs.proximityActive = true;
    inputs.proximityCanRender = false;
    inputs.playerActive = true;
    inputs.playerSource = OutputTelemetrySource::RELAY;
    inputs.playerPattern = "BUS";
    inputs.activity = UserActivity::STILL;

    const OutputSemanticSnapshot snapshot = selectOutputSemantics(inputs);

    TEST_ASSERT_EQUAL(OutputTelemetryState::ACTIVE, snapshot.state);
    TEST_ASSERT_EQUAL(OutputTelemetrySource::RELAY, snapshot.source);
    TEST_ASSERT_EQUAL_STRING("BUS", snapshot.pattern);
    TEST_ASSERT_EQUAL(OutputTelemetryReason::PLAYING, snapshot.reason);
}

void test_still_proximity_is_reported_as_suppressed(void) {
    OutputSemanticInputs inputs = idleInputs();
    inputs.proximityActive = true;
    inputs.proximityCanRender = false;
    inputs.activity = UserActivity::STILL;
    inputs.tofMm = 444;

    const OutputSemanticSnapshot snapshot = selectOutputSemantics(inputs);

    TEST_ASSERT_EQUAL(OutputTelemetryState::SUPPRESSED, snapshot.state);
    TEST_ASSERT_EQUAL(OutputTelemetrySource::LOCAL_TOF, snapshot.source);
    TEST_ASSERT_EQUAL_STRING("PROXIMITY", snapshot.pattern);
    TEST_ASSERT_EQUAL(OutputTelemetryReason::STILL_GATE, snapshot.reason);
}

void test_night_mode_mutes_an_active_winner_without_hiding_it(void) {
    OutputSemanticInputs inputs = idleInputs();
    inputs.playerActive = true;
    inputs.playerSource = OutputTelemetrySource::SERVICE;
    inputs.playerPattern = "RIGHT";
    inputs.outputMode = OutputMode::NIGHT;

    const OutputSemanticSnapshot snapshot = selectOutputSemantics(inputs);

    TEST_ASSERT_EQUAL(OutputTelemetryState::MUTED, snapshot.state);
    TEST_ASSERT_EQUAL(OutputTelemetrySource::SERVICE, snapshot.source);
    TEST_ASSERT_EQUAL_STRING("RIGHT", snapshot.pattern);
    TEST_ASSERT_EQUAL(OutputTelemetryReason::NIGHT_MODE, snapshot.reason);
    TEST_ASSERT_EQUAL(OutputMode::NIGHT, snapshot.outputMode);
}

void test_unknown_tof_formats_as_json_null(void) {
    const OutputSemanticSnapshot snapshot = selectOutputSemantics(idleInputs());
    char buffer[320];

    TEST_ASSERT_GREATER_THAN(
        0, formatOutputTelemetry(buffer, sizeof(buffer), {0, 0}, UINT32_MAX, snapshot));
    TEST_ASSERT_NOT_NULL(strstr(buffer, "\"tofMm\":null"));
    TEST_ASSERT_NOT_NULL(strstr(buffer, "\"state\":\"IDLE\""));
}

void test_snapshot_equality_compares_pattern_content(void) {
    char firstPattern[] = "RIGHT";
    char secondPattern[] = "RIGHT";
    OutputSemanticInputs firstInputs = idleInputs();
    firstInputs.playerActive = true;
    firstInputs.playerSource = OutputTelemetrySource::RELAY;
    firstInputs.playerPattern = firstPattern;
    OutputSemanticInputs secondInputs = firstInputs;
    secondInputs.playerPattern = secondPattern;

    TEST_ASSERT_TRUE(sameOutputSnapshot(
        selectOutputSemantics(firstInputs), selectOutputSemantics(secondInputs)));

    secondPattern[0] = 'L';
    TEST_ASSERT_FALSE(sameOutputSnapshot(
        selectOutputSemantics(firstInputs), selectOutputSemantics(secondInputs)));
}

void test_record_change_detection_includes_physical_drive(void) {
    const OutputSemanticSnapshot snapshot = selectOutputSemantics(idleInputs());

    TEST_ASSERT_TRUE(sameOutputTelemetry(
        {0, 0}, snapshot, {0, 0}, snapshot));
    TEST_ASSERT_FALSE(sameOutputTelemetry(
        {2350, 0}, snapshot, {0, 0}, snapshot));
}

void test_reports_truncation_for_small_buffer(void) {
    char buffer[8];
    const OutputSemanticSnapshot snapshot = selectOutputSemantics(idleInputs());

    TEST_ASSERT_EQUAL_INT(
        -1, formatOutputTelemetry(buffer, sizeof(buffer), {2350, 0}, 1, snapshot));
}

void test_heartbeat_is_immediate_on_change_and_due_once_per_second(void) {
    TEST_ASSERT_TRUE(outputTelemetryDue(true, 10, 10));
    TEST_ASSERT_FALSE(outputTelemetryDue(false, 999, 0));
    TEST_ASSERT_TRUE(outputTelemetryDue(false, 1000, 0));
}

void test_heartbeat_timing_is_wrap_safe(void) {
    TEST_ASSERT_FALSE(outputTelemetryDue(false, 100, UINT32_MAX - 500));
    TEST_ASSERT_TRUE(outputTelemetryDue(false, 1000, UINT32_MAX - 500));
}

int main(int, char **) {
    UNITY_BEGIN();
    RUN_TEST(test_formats_protocol_v2_local_proximity_record);
    RUN_TEST(test_direction_override_is_reported_instead_of_masking_proximity);
    RUN_TEST(test_disabled_output_latch_has_highest_precedence);
    RUN_TEST(test_siren_outranks_proximity_and_player);
    RUN_TEST(test_player_outranks_suppressed_still_proximity);
    RUN_TEST(test_still_proximity_is_reported_as_suppressed);
    RUN_TEST(test_night_mode_mutes_an_active_winner_without_hiding_it);
    RUN_TEST(test_unknown_tof_formats_as_json_null);
    RUN_TEST(test_snapshot_equality_compares_pattern_content);
    RUN_TEST(test_record_change_detection_includes_physical_drive);
    RUN_TEST(test_reports_truncation_for_small_buffer);
    RUN_TEST(test_heartbeat_is_immediate_on_change_and_due_once_per_second);
    RUN_TEST(test_heartbeat_timing_is_wrap_safe);
    return UNITY_END();
}
