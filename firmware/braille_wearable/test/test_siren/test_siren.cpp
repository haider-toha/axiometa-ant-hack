#include <cmath>

#include <unity.h>

#include "siren_pure.h"

void setUp(void) {}
void tearDown(void) {}

static void makeFrame(float magnitudes[SIREN_SPECTRUM_BINS], float bandEnergy,
                      uint8_t peakBin, float noiseFloorEstimate = 1.0f) {
    for (uint16_t bin = 0; bin < SIREN_SPECTRUM_BINS; ++bin) {
        magnitudes[bin] = 0.0f;
    }
    constexpr uint8_t BAND_BIN_COUNT =
        SIREN_ENERGY_LAST_BIN - SIREN_ENERGY_FIRST_BIN + 1;
    const bool peakInsideEnergyBand =
        peakBin >= SIREN_ENERGY_FIRST_BIN && peakBin <= SIREN_ENERGY_LAST_BIN;
    const float energyUnits = BAND_BIN_COUNT + (peakInsideEnergyBand ? 3.0f : 0.0f);
    const float backgroundMagnitude = std::sqrt(bandEnergy / energyUnits);
    for (uint8_t bin = SIREN_ENERGY_FIRST_BIN; bin <= SIREN_ENERGY_LAST_BIN; ++bin) {
        magnitudes[bin] = backgroundMagnitude;
    }
    // Keep a real in-band floor while allowing peak tracking down to bin 13.
    magnitudes[peakBin] = backgroundMagnitude * 2.0f;

    constexpr uint8_t BAND_BIN_COUNT_FOR_NOISE =
        SIREN_ENERGY_LAST_BIN - SIREN_ENERGY_FIRST_BIN + 1;
    const float referenceMagnitude =
        std::sqrt(noiseFloorEstimate / BAND_BIN_COUNT_FOR_NOISE);
    for (uint8_t bin = SIREN_NOISE_LOW_FIRST_BIN; bin <= SIREN_NOISE_LOW_LAST_BIN; ++bin) {
        magnitudes[bin] = referenceMagnitude;
    }
    for (uint16_t bin = SIREN_NOISE_HIGH_FIRST_BIN; bin <= SIREN_NOISE_HIGH_LAST_BIN; ++bin) {
        magnitudes[bin] = referenceMagnitude;
    }
}

static SirenDecision feedBandEnergy(SirenState& state, float bandEnergy,
                                    uint8_t peakBin = 20,
                                    float noiseFloorEstimate = 1.0f) {
    float magnitudes[SIREN_SPECTRUM_BINS];
    makeFrame(magnitudes, bandEnergy, peakBin, noiseFloorEstimate);
    return updateSirenFrame(state, magnitudes);
}

static void seedNoiseFloor(SirenState& state, float noiseEnergy = 1.0f) {
    for (uint8_t frame = 0; frame < SIREN_BOOTSTRAP_FRAMES; ++frame) {
        TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(SirenDecision::NONE),
                                static_cast<uint8_t>(feedBandEnergy(state, noiseEnergy)));
    }
    TEST_ASSERT_TRUE(state.bootstrapComplete);
}

void test_plan_constants_are_exact(void) {
    TEST_ASSERT_EQUAL_UINT32(16000, SIREN_SAMPLE_RATE_HZ);
    TEST_ASSERT_EQUAL_UINT16(512, SIREN_FFT_SIZE);
    TEST_ASSERT_FLOAT_WITHIN(0.0001f, 31.25f, SIREN_BIN_HZ);
    TEST_ASSERT_EQUAL_UINT8(16, SIREN_ENERGY_FIRST_BIN);
    TEST_ASSERT_EQUAL_UINT8(58, SIREN_ENERGY_LAST_BIN);
    TEST_ASSERT_EQUAL_UINT8(13, SIREN_PEAK_FIRST_BIN);
    TEST_ASSERT_EQUAL_UINT8(42, SIREN_PEAK_LAST_BIN);
    TEST_ASSERT_EQUAL_UINT8(64, SIREN_HISTORY_FRAMES);
    TEST_ASSERT_EQUAL_UINT8(32, SIREN_BOOTSTRAP_FRAMES);
    TEST_ASSERT_EQUAL_UINT8(8, SIREN_MIN_SWEEP_BINS);
    TEST_ASSERT_FLOAT_WITHIN(0.0001f, 1.10f, SIREN_RISING_ENERGY_RATIO);
}

void test_feature_extraction_uses_exact_energy_and_peak_boundaries(void) {
    float magnitudes[SIREN_SPECTRUM_BINS] = {};
    magnitudes[12] = 100.0f;
    magnitudes[16] = 2.0f;
    magnitudes[58] = 3.0f;
    magnitudes[59] = 100.0f;
    magnitudes[13] = 4.0f;
    magnitudes[42] = 5.0f;

    const SirenFeatures features = extractSirenFeatures(magnitudes);
    TEST_ASSERT_FLOAT_WITHIN(0.0001f, 38.0f, features.bandEnergy);
    TEST_ASSERT_EQUAL_UINT8(42, features.peakBin);
}

void test_noise_floor_extraction_uses_exact_boundaries_and_trimmed_scaling(void) {
    float magnitudes[SIREN_SPECTRUM_BINS] = {};
    for (uint8_t bin = SIREN_NOISE_LOW_FIRST_BIN; bin <= SIREN_NOISE_LOW_LAST_BIN; ++bin) {
        magnitudes[bin] = 2.0f;
    }
    for (uint16_t bin = SIREN_NOISE_HIGH_FIRST_BIN; bin <= SIREN_NOISE_HIGH_LAST_BIN; ++bin) {
        magnitudes[bin] = 2.0f;
    }
    magnitudes[0] = 100.0f;
    magnitudes[13] = 100.0f;
    magnitudes[58] = 100.0f;
    magnitudes[256] = 100.0f;

    const SirenFeatures features = extractSirenFeatures(magnitudes);
    constexpr float EXPECTED_SCALED_ENERGY =
        4.0f * (SIREN_ENERGY_LAST_BIN - SIREN_ENERGY_FIRST_BIN + 1);
    TEST_ASSERT_FLOAT_WITHIN(0.0001f, EXPECTED_SCALED_ENERGY,
                             features.noiseFloorEstimate);
}

void test_band_gate_is_inclusive_at_twelve_db_and_rejects_below(void) {
    SirenState belowState{};
    seedNoiseFloor(belowState);

    const float atThreshold = SIREN_ENERGY_THRESHOLD_RATIO;
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(SirenDecision::NONE),
                            static_cast<uint8_t>(
                                feedBandEnergy(belowState, atThreshold * 0.999f)));

    SirenState atState{};
    seedNoiseFloor(atState);
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(SirenDecision::NONE),
                            static_cast<uint8_t>(feedBandEnergy(atState, atThreshold)));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(SirenDecision::ATTENTION),
                            static_cast<uint8_t>(feedBandEnergy(atState, atThreshold)));
}

void test_below_threshold_frame_resets_the_two_frame_attention_streak(void) {
    SirenState state{};
    seedNoiseFloor(state);
    const float elevated = SIREN_ENERGY_THRESHOLD_RATIO * 2.0f;

    feedBandEnergy(state, elevated);
    feedBandEnergy(state, 1.0f);
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(SirenDecision::NONE),
                            static_cast<uint8_t>(feedBandEnergy(state, elevated)));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(SirenDecision::ATTENTION),
                            static_cast<uint8_t>(feedBandEnergy(state, elevated)));
}

void test_sustained_duration_requires_thirty_two_elevated_frames(void) {
    SirenState state{};
    seedNoiseFloor(state);
    const float elevated = SIREN_ENERGY_THRESHOLD_RATIO * 2.0f;

    SirenDecision finalDecision = SirenDecision::NONE;
    for (uint8_t frame = 0; frame < SIREN_SUSTAINED_FRAMES; ++frame) {
        const SirenDecision decision = feedBandEnergy(state, elevated);
        if (frame < SIREN_SUSTAINED_FRAMES - 1) {
            TEST_ASSERT_EQUAL_UINT8(
                static_cast<uint8_t>(frame == 0 ? SirenDecision::NONE : SirenDecision::ATTENTION),
                static_cast<uint8_t>(decision));
        }
        finalDecision = decision;
    }
    TEST_ASSERT_FALSE(hasMonotonicPeakSweep(state));
    TEST_ASSERT_TRUE(sirenModulationIndex(state) <= SIREN_MODULATION_INDEX_THRESHOLD);
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(SirenDecision::ATTENTION),
                            static_cast<uint8_t>(finalDecision));
}

void test_yelp_modulation_confirms_a_flat_siren_warning(void) {
    SirenState state{};
    seedNoiseFloor(state);
    const float yelpShape[] = {1.0f, 1.5f, 2.0f, 1.5f, 1.0f, 0.5f, 0.0f, 0.5f};

    SirenDecision decision = SirenDecision::NONE;
    for (uint8_t frame = 0; frame < SIREN_SUSTAINED_FRAMES; ++frame) {
        decision = feedBandEnergy(state, 32.0f + yelpShape[frame & 7]);
    }

    TEST_ASSERT_TRUE(sirenModulationIndex(state) > 0.35f);
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(SirenDecision::SIREN_WARNING),
                            static_cast<uint8_t>(decision));
}

void test_monotonic_peak_sweep_confirms_a_flat_siren_warning(void) {
    SirenState state{};
    seedNoiseFloor(state);
    SirenDecision decision = SirenDecision::NONE;

    for (uint8_t frame = 0; frame < SIREN_SUSTAINED_FRAMES; ++frame) {
        const uint8_t peakBin = static_cast<uint8_t>(
            SIREN_PEAK_FIRST_BIN + (frame * (SIREN_PEAK_LAST_BIN - SIREN_PEAK_FIRST_BIN)) /
                                       (SIREN_SUSTAINED_FRAMES - 1));
        decision = feedBandEnergy(state, 32.0f, peakBin);
    }

    TEST_ASSERT_TRUE(hasMonotonicPeakSweep(state));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(SirenDecision::SIREN_WARNING),
                            static_cast<uint8_t>(decision));
}

void test_rising_siren_amplitude_yields_danger_while_flat_yields_warning(void) {
    SirenState flat{};
    SirenState rising{};
    seedNoiseFloor(flat);
    seedNoiseFloor(rising);
    const float yelpShape[] = {1.0f, 1.5f, 2.0f, 1.5f, 1.0f, 0.5f, 0.0f, 0.5f};

    SirenDecision flatDecision = SirenDecision::NONE;
    SirenDecision risingDecision = SirenDecision::NONE;
    for (uint8_t frame = 0; frame < SIREN_SUSTAINED_FRAMES; ++frame) {
        flatDecision = feedBandEnergy(flat, 32.0f + yelpShape[frame & 7]);
        const uint8_t risingPeak = static_cast<uint8_t>(
            SIREN_PEAK_FIRST_BIN + (frame * (SIREN_PEAK_LAST_BIN - SIREN_PEAK_FIRST_BIN)) /
                                       (SIREN_SUSTAINED_FRAMES - 1));
        risingDecision = feedBandEnergy(rising, 32.0f + frame, risingPeak);
    }

    TEST_ASSERT_FALSE(hasRisingAmplitudeTrend(flat));
    TEST_ASSERT_TRUE(hasRisingAmplitudeTrend(rising));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(SirenDecision::SIREN_WARNING),
                            static_cast<uint8_t>(flatDecision));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(SirenDecision::DANGER),
                            static_cast<uint8_t>(risingDecision));
}

void test_startup_during_yelp_still_confirms_after_full_shape_window(void) {
    SirenState state{};
    const float yelpShape[] = {1.0f, 1.5f, 2.0f, 1.5f, 1.0f, 0.5f, 0.0f, 0.5f};
    SirenDecision decision = SirenDecision::NONE;

    for (uint8_t frame = 0; frame < SIREN_SUSTAINED_FRAMES; ++frame) {
        decision = feedBandEnergy(state, 32.0f + yelpShape[frame & 7]);
    }

    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(SirenDecision::SIREN_WARNING),
                            static_cast<uint8_t>(decision));
}

void test_startup_siren_ignores_sparse_out_of_band_harmonics(void) {
    SirenState state{};
    const float yelpShape[] = {1.0f, 1.5f, 2.0f, 1.5f, 1.0f, 0.5f, 0.0f, 0.5f};
    const uint8_t harmonicBins[] = {64, 96, 128, 160};
    SirenDecision decision = SirenDecision::NONE;

    for (uint8_t frame = 0; frame < SIREN_SUSTAINED_FRAMES; ++frame) {
        float magnitudes[SIREN_SPECTRUM_BINS];
        makeFrame(magnitudes, 32.0f + yelpShape[frame & 7], 20);
        for (const uint8_t bin : harmonicBins) {
            magnitudes[bin] = std::sqrt(20.0f);
        }
        decision = updateSirenFrame(state, magnitudes);
    }

    TEST_ASSERT_FLOAT_WITHIN(0.0001f, 1.0f, state.noiseFloorEnergy);
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(SirenDecision::SIREN_WARNING),
                            static_cast<uint8_t>(decision));
}

void test_startup_yelp_with_zero_reference_confirms_after_full_shape_window(void) {
    SirenState state{};
    const float yelpShape[] = {1.0f, 1.5f, 2.0f, 1.5f, 1.0f, 0.5f, 0.0f, 0.5f};
    SirenDecision decision = SirenDecision::NONE;

    for (uint8_t frame = 0; frame < SIREN_SUSTAINED_FRAMES; ++frame) {
        decision = feedBandEnergy(state, 32.0f + yelpShape[frame & 7], 20, 0.0f);
        if (frame < SIREN_SUSTAINED_FRAMES - 1) {
            TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(SirenDecision::NONE),
                                    static_cast<uint8_t>(decision));
        }
    }

    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(SirenDecision::SIREN_WARNING),
                            static_cast<uint8_t>(decision));
}

void test_near_zero_reference_never_emits_attention_for_tiny_unshaped_energy(void) {
    SirenState state{};
    for (uint8_t frame = 0; frame < SIREN_BOOTSTRAP_FRAMES; ++frame) {
        TEST_ASSERT_EQUAL_UINT8(
            static_cast<uint8_t>(SirenDecision::NONE),
            static_cast<uint8_t>(feedBandEnergy(state, 0.0f, 20, 0.000000001f)));
    }

    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(SirenDecision::NONE),
        static_cast<uint8_t>(feedBandEnergy(state, 0.001f, 20, 0.000000001f)));
    TEST_ASSERT_EQUAL_UINT8(
        static_cast<uint8_t>(SirenDecision::NONE),
        static_cast<uint8_t>(feedBandEnergy(state, 0.001f, 20, 0.000000001f)));
}

void test_one_bin_peak_drift_does_not_count_as_wail_sweep(void) {
    SirenState state{};
    seedNoiseFloor(state);
    SirenDecision decision = SirenDecision::NONE;

    for (uint8_t frame = 0; frame < SIREN_SUSTAINED_FRAMES; ++frame) {
        decision = feedBandEnergy(state, 32.0f, frame == 31 ? 14 : 13);
    }

    TEST_ASSERT_FALSE(hasMonotonicPeakSweep(state));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(SirenDecision::ATTENTION),
                            static_cast<uint8_t>(decision));
}

void test_small_positive_energy_drift_remains_warning(void) {
    SirenState state{};
    seedNoiseFloor(state);
    const float yelpShape[] = {1.0f, 1.5f, 2.0f, 1.5f, 1.0f, 0.5f, 0.0f, 0.5f};
    SirenDecision decision = SirenDecision::NONE;

    for (uint8_t frame = 0; frame < SIREN_SUSTAINED_FRAMES; ++frame) {
        decision = feedBandEnergy(state,
                                  32.0f + yelpShape[frame & 7] + frame * 0.015f);
    }

    TEST_ASSERT_FALSE(hasRisingAmplitudeTrend(state));
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(SirenDecision::SIREN_WARNING),
                            static_cast<uint8_t>(decision));
}

void test_subthreshold_yelp_shape_cannot_confirm_after_bootstrap(void) {
    SirenState state{};
    seedNoiseFloor(state, 1.0f);
    const float yelpShape[] = {0.0f, 0.5f, 1.0f, 0.5f, 0.0f, -0.5f, -0.8f, -0.5f};
    SirenDecision decision = SirenDecision::NONE;

    for (uint8_t frame = 0; frame < SIREN_SUSTAINED_FRAMES; ++frame) {
        decision = feedBandEnergy(state, 2.0f + yelpShape[frame & 7]);
    }

    TEST_ASSERT_TRUE(sirenModulationIndex(state) > SIREN_MODULATION_INDEX_THRESHOLD);
    TEST_ASSERT_EQUAL_UINT8(0, state.consecutiveElevatedFrames);
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(SirenDecision::NONE),
                            static_cast<uint8_t>(decision));
}

void test_subthreshold_yelp_shape_cannot_confirm_during_bootstrap(void) {
    SirenState state{};
    const float yelpShape[] = {0.0f, 0.5f, 1.0f, 0.5f, 0.0f, -0.5f, -0.8f, -0.5f};
    SirenDecision decision = SirenDecision::NONE;

    for (uint8_t frame = 0; frame < SIREN_BOOTSTRAP_FRAMES; ++frame) {
        decision = feedBandEnergy(state, 2.0f + yelpShape[frame & 7]);
    }

    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(SirenDecision::NONE),
                            static_cast<uint8_t>(decision));
}

void test_history_ring_wraps_without_losing_chronological_order(void) {
    SirenState state{};
    for (uint8_t frame = 0; frame < 70; ++frame) {
        feedBandEnergy(state, 100.0f + frame);
    }

    TEST_ASSERT_EQUAL_UINT8(SIREN_HISTORY_FRAMES, state.historyCount);
    TEST_ASSERT_FLOAT_WITHIN(0.0001f, 106.0f, sirenHistoryEnergy(state, 0));
    TEST_ASSERT_FLOAT_WITHIN(0.0001f, 169.0f,
                             sirenHistoryEnergy(state, SIREN_HISTORY_FRAMES - 1));
}

void test_reset_clears_temporal_state_and_relearns_the_noise_floor(void) {
    SirenState state{};
    seedNoiseFloor(state);
    feedBandEnergy(state, SIREN_ENERGY_THRESHOLD_RATIO * 2.0f);
    resetSiren(state);

    TEST_ASSERT_FALSE(state.noiseFloorInitialized);
    TEST_ASSERT_FALSE(state.bootstrapComplete);
    TEST_ASSERT_EQUAL_UINT8(0, state.bootstrapFrames);
    TEST_ASSERT_EQUAL_UINT8(0, state.consecutiveElevatedFrames);
    TEST_ASSERT_EQUAL_UINT8(0, state.historyCount);
    TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(SirenDecision::NONE),
                            static_cast<uint8_t>(feedBandEnergy(state, 7.0f)));
    TEST_ASSERT_FLOAT_WITHIN(0.0001f, 1.0f, state.noiseFloorEnergy);
}

int main(int, char**) {
    UNITY_BEGIN();
    RUN_TEST(test_plan_constants_are_exact);
    RUN_TEST(test_feature_extraction_uses_exact_energy_and_peak_boundaries);
    RUN_TEST(test_noise_floor_extraction_uses_exact_boundaries_and_trimmed_scaling);
    RUN_TEST(test_band_gate_is_inclusive_at_twelve_db_and_rejects_below);
    RUN_TEST(test_below_threshold_frame_resets_the_two_frame_attention_streak);
    RUN_TEST(test_sustained_duration_requires_thirty_two_elevated_frames);
    RUN_TEST(test_yelp_modulation_confirms_a_flat_siren_warning);
    RUN_TEST(test_monotonic_peak_sweep_confirms_a_flat_siren_warning);
    RUN_TEST(test_rising_siren_amplitude_yields_danger_while_flat_yields_warning);
    RUN_TEST(test_startup_during_yelp_still_confirms_after_full_shape_window);
    RUN_TEST(test_startup_siren_ignores_sparse_out_of_band_harmonics);
    RUN_TEST(test_startup_yelp_with_zero_reference_confirms_after_full_shape_window);
    RUN_TEST(test_near_zero_reference_never_emits_attention_for_tiny_unshaped_energy);
    RUN_TEST(test_one_bin_peak_drift_does_not_count_as_wail_sweep);
    RUN_TEST(test_small_positive_energy_drift_remains_warning);
    RUN_TEST(test_subthreshold_yelp_shape_cannot_confirm_after_bootstrap);
    RUN_TEST(test_subthreshold_yelp_shape_cannot_confirm_during_bootstrap);
    RUN_TEST(test_history_ring_wraps_without_losing_chronological_order);
    RUN_TEST(test_reset_clears_temporal_state_and_relearns_the_noise_floor);
    return UNITY_END();
}
