#include <unity.h>

#include "output_telemetry_pure.h"

void setUp(void) {}
void tearDown(void) {}

void test_formats_protocol_v1_record(void) {
    char buffer[96];
    const int length = formatOutputTelemetry(buffer, sizeof(buffer), 2350, 3050, 123456);

    TEST_ASSERT_GREATER_THAN(0, length);
    TEST_ASSERT_EQUAL_STRING(
        "TACTA_OUTPUT {\"v\":1,\"leftHz\":2350,\"rightHz\":3050,\"upMs\":123456}\n",
        buffer);
}

void test_formats_inactive_channels_and_max_uptime(void) {
    char buffer[96];
    const int length = formatOutputTelemetry(buffer, sizeof(buffer), 0, 0, UINT32_MAX);

    TEST_ASSERT_GREATER_THAN(0, length);
    TEST_ASSERT_EQUAL_STRING(
        "TACTA_OUTPUT {\"v\":1,\"leftHz\":0,\"rightHz\":0,\"upMs\":4294967295}\n",
        buffer);
}

void test_reports_truncation_for_small_buffer(void) {
    char buffer[8];

    TEST_ASSERT_EQUAL_INT(-1, formatOutputTelemetry(buffer, sizeof(buffer), 2350, 0, 1));
}

int main(int, char **) {
    UNITY_BEGIN();
    RUN_TEST(test_formats_protocol_v1_record);
    RUN_TEST(test_formats_inactive_channels_and_max_uptime);
    RUN_TEST(test_reports_truncation_for_small_buffer);
    return UNITY_END();
}
