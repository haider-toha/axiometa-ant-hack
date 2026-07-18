#include <unity.h>

#include "tof_bench_pure.h"

void setUp(void) {}
void tearDown(void) {}

void test_bench_stats_separate_valid_ranges_from_failure_statuses(void) {
    TofBenchStats stats = makeTofBenchStats(600);

    addTofBenchSample(stats, 590, 0);
    addTofBenchSample(stats, 610, 0);
    addTofBenchSample(stats, 8191, 2);
    addTofBenchSample(stats, 65535, 4);
    addTofBenchSample(stats, 0, 0);

    TEST_ASSERT_EQUAL_UINT32(5, stats.sampleCount);
    TEST_ASSERT_EQUAL_UINT32(2, stats.validCount);
    TEST_ASSERT_EQUAL_UINT32(1, stats.signalFailCount);
    TEST_ASSERT_EQUAL_UINT32(1, stats.outOfRangeCount);
    TEST_ASSERT_EQUAL_UINT32(1, stats.otherInvalidCount);
    TEST_ASSERT_EQUAL_UINT16(590, stats.minMm);
    TEST_ASSERT_EQUAL_UINT16(610, stats.maxMm);
    TEST_ASSERT_EQUAL_UINT16(600, tofBenchMeanMm(stats));
    TEST_ASSERT_EQUAL_UINT16(10, tofBenchMeanAbsoluteErrorMm(stats));
    TEST_ASSERT_EQUAL_UINT8(40, tofBenchValidPercent(stats));
}

void test_empty_bench_stats_report_zero_derived_values(void) {
    const TofBenchStats stats = makeTofBenchStats(1200);

    TEST_ASSERT_EQUAL_UINT16(0, tofBenchMeanMm(stats));
    TEST_ASSERT_EQUAL_UINT16(0, tofBenchMeanAbsoluteErrorMm(stats));
    TEST_ASSERT_EQUAL_UINT8(0, tofBenchValidPercent(stats));
}

void test_active_bench_rejects_restart_and_preserves_original_window(void) {
    TofBenchSession session;

    TEST_ASSERT_TRUE(startTofBenchSession(session, 600, 1000));
    addTofBenchSample(session.stats, 601, 0);
    TEST_ASSERT_FALSE(startTofBenchSession(session, 1200, 2000));

    TEST_ASSERT_TRUE(session.active);
    TEST_ASSERT_EQUAL_UINT32(1000, session.startedMs);
    TEST_ASSERT_EQUAL_UINT16(600, session.stats.expectedMm);
    TEST_ASSERT_EQUAL_UINT32(1, session.stats.sampleCount);
}

void test_bench_expiry_is_wrap_safe_and_abort_allows_next_start(void) {
    TofBenchSession session;
    TEST_ASSERT_TRUE(startTofBenchSession(session, 300, UINT32_MAX - 1000U));

    TEST_ASSERT_FALSE(tofBenchSessionElapsed(session, 3000, 5000));
    TEST_ASSERT_TRUE(tofBenchSessionElapsed(session, 4500, 5000));

    abortTofBenchSession(session);
    TEST_ASSERT_FALSE(session.active);
    TEST_ASSERT_FALSE(tofBenchSessionElapsed(session, 5000, 5000));
    TEST_ASSERT_TRUE(startTofBenchSession(session, 1200, 5000));
    TEST_ASSERT_EQUAL_UINT16(1200, session.stats.expectedMm);
}

int main(int, char**) {
    UNITY_BEGIN();
    RUN_TEST(test_bench_stats_separate_valid_ranges_from_failure_statuses);
    RUN_TEST(test_empty_bench_stats_report_zero_derived_values);
    RUN_TEST(test_active_bench_rejects_restart_and_preserves_original_window);
    RUN_TEST(test_bench_expiry_is_wrap_safe_and_abort_allows_next_start);
    return UNITY_END();
}
