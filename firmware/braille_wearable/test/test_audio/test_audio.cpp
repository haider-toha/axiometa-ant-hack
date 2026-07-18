#include <unity.h>

#include "audio_pure.h"

void setUp(void) {}
void tearDown(void) {}

void test_empty_frame_is_reported_explicitly(void) {
    const AudioFrameStats stats = analyzeAudioFrame(nullptr, 0);

    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(AudioFrameHealth::EMPTY),
                            static_cast<uint8_t>(classifyAudioFrame(stats)));
}

void test_all_zero_frame_identifies_silence_or_wrong_slot(void) {
    int16_t samples[512] = {};
    const AudioFrameStats stats = analyzeAudioFrame(samples, 512);

    TEST_ASSERT_FLOAT_WITHIN(0.0001f, 0.0f, stats.mean);
    TEST_ASSERT_FLOAT_WITHIN(0.0001f, 0.0f, stats.standardDeviation);
    TEST_ASSERT_EQUAL_INT16(0, stats.minimum);
    TEST_ASSERT_EQUAL_INT16(0, stats.maximum);
    TEST_ASSERT_EQUAL_UINT16(0, stats.clippingSamples);
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(AudioFrameHealth::SILENT_OR_WRONG_SLOT),
        static_cast<uint8_t>(classifyAudioFrame(stats)));
}

void test_constant_nonzero_frame_identifies_failed_clock_or_data_path(void) {
    int16_t samples[512];
    for (int16_t& sample : samples) {
        sample = -30935;
    }
    const AudioFrameStats stats = analyzeAudioFrame(samples, 512);

    TEST_ASSERT_FLOAT_WITHIN(0.0001f, -30935.0f, stats.mean);
    TEST_ASSERT_FLOAT_WITHIN(0.0001f, 0.0f, stats.standardDeviation);
    TEST_ASSERT_EQUAL_INT16(-30935, stats.minimum);
    TEST_ASSERT_EQUAL_INT16(-30935, stats.maximum);
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(AudioFrameHealth::SILENT_OR_WRONG_SLOT),
        static_cast<uint8_t>(classifyAudioFrame(stats)));
}

void test_changing_pcm_frame_is_healthy(void) {
    int16_t samples[] = {-200, -100, 0, 100, 200};
    const AudioFrameStats stats = analyzeAudioFrame(samples, 5);

    TEST_ASSERT_FLOAT_WITHIN(0.0001f, 0.0f, stats.mean);
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 141.42136f, stats.standardDeviation);
    TEST_ASSERT_EQUAL_INT16(-200, stats.minimum);
    TEST_ASSERT_EQUAL_INT16(200, stats.maximum);
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(AudioFrameHealth::HEALTHY),
                            static_cast<uint8_t>(classifyAudioFrame(stats)));
}

void test_excessive_variance_identifies_raw_pdm_or_garbage(void) {
    int16_t samples[] = {-10000, 10000, -10000, 10000};
    const AudioFrameStats stats = analyzeAudioFrame(samples, 4);

    TEST_ASSERT_FLOAT_WITHIN(0.001f, 10000.0f, stats.standardDeviation);
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(AudioFrameHealth::RAW_PDM_OR_EXCESSIVE_NOISE),
        static_cast<uint8_t>(classifyAudioFrame(stats)));
}

void test_full_scale_samples_identify_clipping_before_variance(void) {
    int16_t samples[] = {-32768, 32767, -32768, 32767};
    const AudioFrameStats stats = analyzeAudioFrame(samples, 4);

    TEST_ASSERT_EQUAL_UINT16(4, stats.clippingSamples);
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(AudioFrameHealth::CLIPPING),
                            static_cast<uint8_t>(classifyAudioFrame(stats)));
}

int main(int, char**) {
    UNITY_BEGIN();
    RUN_TEST(test_empty_frame_is_reported_explicitly);
    RUN_TEST(test_all_zero_frame_identifies_silence_or_wrong_slot);
    RUN_TEST(test_constant_nonzero_frame_identifies_failed_clock_or_data_path);
    RUN_TEST(test_changing_pcm_frame_is_healthy);
    RUN_TEST(test_excessive_variance_identifies_raw_pdm_or_garbage);
    RUN_TEST(test_full_scale_samples_identify_clipping_before_variance);
    return UNITY_END();
}
