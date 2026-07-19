#pragma once

#include <stdint.h>

inline constexpr uint32_t SIREN_SAMPLE_RATE_HZ = 16000;
inline constexpr uint16_t SIREN_FFT_SIZE = 512;
inline constexpr uint16_t SIREN_SPECTRUM_BINS = SIREN_FFT_SIZE / 2 + 1;
inline constexpr float SIREN_BIN_HZ = 31.25f;
inline constexpr uint8_t SIREN_ENERGY_FIRST_BIN = 16;
inline constexpr uint8_t SIREN_ENERGY_LAST_BIN = 58;
inline constexpr uint8_t SIREN_PEAK_FIRST_BIN = 13;
inline constexpr uint8_t SIREN_PEAK_LAST_BIN = 42;
inline constexpr uint8_t SIREN_NOISE_LOW_FIRST_BIN = 1;
inline constexpr uint8_t SIREN_NOISE_LOW_LAST_BIN = 12;
inline constexpr uint8_t SIREN_NOISE_HIGH_FIRST_BIN = 59;
inline constexpr uint8_t SIREN_NOISE_HIGH_LAST_BIN = 255;
inline constexpr uint8_t SIREN_NOISE_TRIMMED_BIN_COUNT = 8;
inline constexpr uint8_t SIREN_HISTORY_FRAMES = 64;
inline constexpr uint8_t SIREN_HISTORY_MASK = SIREN_HISTORY_FRAMES - 1;
inline constexpr uint8_t SIREN_ATTENTION_FRAMES = 16;
inline constexpr uint8_t SIREN_SUSTAINED_FRAMES = 32;
inline constexpr uint8_t SIREN_BOOTSTRAP_FRAMES = SIREN_SUSTAINED_FRAMES;
inline constexpr uint8_t SIREN_MODULATION_MIN_LAG = 8;
inline constexpr uint8_t SIREN_MODULATION_MAX_LAG = 16;
inline constexpr uint8_t SIREN_MIN_SWEEP_BINS = 8;
inline constexpr uint8_t SIREN_ATTENTION_MIN_SWEEP_BINS = 2;
inline constexpr float SIREN_ENERGY_THRESHOLD_RATIO = 15.848932f;
inline constexpr float SIREN_MIN_PEAK_ENERGY_RATIO = 0.45f;
inline constexpr float SIREN_THRESHOLD_RELATIVE_EPSILON = 0.00001f;
inline constexpr float SIREN_MODULATION_INDEX_THRESHOLD = 0.35f;
inline constexpr float SIREN_NOISE_FLOOR_ALPHA = 0.05f;
inline constexpr float SIREN_RISING_ENERGY_RATIO = 1.10f;
inline constexpr float SIREN_REFERENCE_ENERGY_EPSILON = 0.000001f;

static_assert(SIREN_HISTORY_FRAMES == 64, "The plan locks siren history at 64 frames.");
static_assert((SIREN_HISTORY_FRAMES & SIREN_HISTORY_MASK) == 0,
              "The history size must be a power of two.");
static_assert(SIREN_SUSTAINED_FRAMES * SIREN_FFT_SIZE >= 16320,
              "Tier 2b requires at least 1.02 seconds of sustained energy.");

enum class SirenDecision : uint8_t {
    NONE,
    ATTENTION,
    SIREN_WARNING,
    DANGER,
};

struct SirenFeatures {
    float bandEnergy;
    float noiseFloorEstimate;
    uint8_t peakBin;
    float peakEnergyRatio;
};

struct SirenState {
    float noiseFloorEnergy = 0.0f;
    float energyHistory[SIREN_HISTORY_FRAMES] = {};
    uint8_t peakHistory[SIREN_HISTORY_FRAMES] = {};
    bool tonalHistory[SIREN_HISTORY_FRAMES] = {};
    uint8_t historyHead = 0;
    uint8_t historyCount = 0;
    uint8_t consecutiveElevatedFrames = 0;
    uint8_t consecutiveTonalFrames = 0;
    uint8_t bootstrapFrames = 0;
    bool noiseFloorInitialized = false;
    bool bootstrapComplete = false;
};

// This is the FFT-only feature extraction boundary. It does not mutate temporal state.
inline SirenFeatures extractSirenFeatures(const float magnitudes[SIREN_SPECTRUM_BINS]) {
    float bandEnergy = 0.0f;
    for (uint8_t bin = SIREN_ENERGY_FIRST_BIN; bin <= SIREN_ENERGY_LAST_BIN; ++bin) {
        bandEnergy += magnitudes[bin] * magnitudes[bin];
    }

    float referenceEnergy = 0.0f;
    float strongestReferenceEnergies[SIREN_NOISE_TRIMMED_BIN_COUNT] = {};
    const auto addReferenceMagnitude = [&](float magnitude) {
        const float energy = magnitude * magnitude;
        referenceEnergy += energy;
        for (uint8_t index = 0; index < SIREN_NOISE_TRIMMED_BIN_COUNT; ++index) {
            if (energy <= strongestReferenceEnergies[index]) {
                continue;
            }
            for (uint8_t shift = SIREN_NOISE_TRIMMED_BIN_COUNT - 1; shift > index; --shift) {
                strongestReferenceEnergies[shift] = strongestReferenceEnergies[shift - 1];
            }
            strongestReferenceEnergies[index] = energy;
            break;
        }
    };
    for (uint8_t bin = SIREN_NOISE_LOW_FIRST_BIN; bin <= SIREN_NOISE_LOW_LAST_BIN; ++bin) {
        addReferenceMagnitude(magnitudes[bin]);
    }
    for (uint16_t bin = SIREN_NOISE_HIGH_FIRST_BIN; bin <= SIREN_NOISE_HIGH_LAST_BIN; ++bin) {
        addReferenceMagnitude(magnitudes[bin]);
    }
    constexpr uint16_t REFERENCE_BIN_COUNT =
        SIREN_NOISE_LOW_LAST_BIN - SIREN_NOISE_LOW_FIRST_BIN + 1 +
        SIREN_NOISE_HIGH_LAST_BIN - SIREN_NOISE_HIGH_FIRST_BIN + 1;
    constexpr uint8_t ENERGY_BIN_COUNT =
        SIREN_ENERGY_LAST_BIN - SIREN_ENERGY_FIRST_BIN + 1;
    for (uint8_t index = 0; index < SIREN_NOISE_TRIMMED_BIN_COUNT; ++index) {
        referenceEnergy -= strongestReferenceEnergies[index];
    }
    const float noiseFloorEstimate =
        referenceEnergy * ENERGY_BIN_COUNT /
        (REFERENCE_BIN_COUNT - SIREN_NOISE_TRIMMED_BIN_COUNT);

    float strongestBandEnergy = 0.0f;
    for (uint8_t bin = SIREN_ENERGY_FIRST_BIN; bin <= SIREN_ENERGY_LAST_BIN; ++bin) {
        const float energy = magnitudes[bin] * magnitudes[bin];
        strongestBandEnergy = energy > strongestBandEnergy ? energy : strongestBandEnergy;
    }
    const float peakEnergyRatio = bandEnergy > 0.0f
        ? strongestBandEnergy / bandEnergy
        : 0.0f;

    uint8_t peakBin = SIREN_PEAK_FIRST_BIN;
    float peakMagnitude = magnitudes[peakBin];
    for (uint8_t bin = SIREN_PEAK_FIRST_BIN + 1; bin <= SIREN_PEAK_LAST_BIN; ++bin) {
        if (magnitudes[bin] > peakMagnitude) {
            peakMagnitude = magnitudes[bin];
            peakBin = bin;
        }
    }
    return {bandEnergy, noiseFloorEstimate, peakBin, peakEnergyRatio};
}

inline void resetSiren(SirenState& state) {
    state.noiseFloorEnergy = 0.0f;
    state.historyHead = 0;
    state.historyCount = 0;
    state.consecutiveElevatedFrames = 0;
    state.consecutiveTonalFrames = 0;
    state.bootstrapFrames = 0;
    state.noiseFloorInitialized = false;
    state.bootstrapComplete = false;
    for (uint8_t index = 0; index < SIREN_HISTORY_FRAMES; ++index) {
        state.energyHistory[index] = 0.0f;
        state.peakHistory[index] = 0;
        state.tonalHistory[index] = false;
    }
}

inline uint8_t sirenHistoryIndex(const SirenState& state, uint8_t chronologicalIndex) {
    const uint8_t first = state.historyCount == SIREN_HISTORY_FRAMES ? state.historyHead : 0;
    return static_cast<uint8_t>((first + chronologicalIndex) & SIREN_HISTORY_MASK);
}

inline float sirenHistoryEnergy(const SirenState& state, uint8_t chronologicalIndex) {
    if (chronologicalIndex >= state.historyCount) {
        return 0.0f;
    }
    return state.energyHistory[sirenHistoryIndex(state, chronologicalIndex)];
}

inline uint8_t sirenHistoryPeak(const SirenState& state, uint8_t chronologicalIndex) {
    if (chronologicalIndex >= state.historyCount) {
        return 0;
    }
    return state.peakHistory[sirenHistoryIndex(state, chronologicalIndex)];
}

inline uint8_t sirenSustainedWindowStart(const SirenState& state) {
    return static_cast<uint8_t>(state.historyCount - SIREN_SUSTAINED_FRAMES);
}

inline float sirenModulationIndex(const SirenState& state) {
    if (state.historyCount < SIREN_SUSTAINED_FRAMES) {
        return 0.0f;
    }

    const uint8_t start = sirenSustainedWindowStart(state);
    float mean = 0.0f;
    for (uint8_t index = 0; index < SIREN_SUSTAINED_FRAMES; ++index) {
        mean += sirenHistoryEnergy(state, static_cast<uint8_t>(start + index));
    }
    mean /= SIREN_SUSTAINED_FRAMES;

    float variance = 0.0f;
    for (uint8_t index = 0; index < SIREN_SUSTAINED_FRAMES; ++index) {
        const float delta = sirenHistoryEnergy(state, static_cast<uint8_t>(start + index)) - mean;
        variance += delta * delta;
    }
    // FFT magnitudes can leave minute reconstruction residue in an otherwise flat envelope.
    if (variance <= mean * mean * 0.000001f) {
        return 0.0f;
    }

    float bestIndex = 0.0f;
    for (uint8_t lag = SIREN_MODULATION_MIN_LAG; lag <= SIREN_MODULATION_MAX_LAG; ++lag) {
        float correlation = 0.0f;
        for (uint8_t index = 0; index < SIREN_SUSTAINED_FRAMES - lag; ++index) {
            const float earlier =
                sirenHistoryEnergy(state, static_cast<uint8_t>(start + index)) - mean;
            const float later =
                sirenHistoryEnergy(state, static_cast<uint8_t>(start + index + lag)) - mean;
            correlation += earlier * later;
        }
        const float index = correlation / variance;
        if (index > bestIndex) {
            bestIndex = index;
        }
    }
    return bestIndex;
}

inline bool hasMonotonicPeakSweep(const SirenState& state) {
    if (state.historyCount < SIREN_SUSTAINED_FRAMES) {
        return false;
    }

    const uint8_t start = sirenSustainedWindowStart(state);
    bool nonDecreasing = true;
    bool nonIncreasing = true;
    uint8_t previous = sirenHistoryPeak(state, start);
    uint8_t minimum = previous;
    uint8_t maximum = previous;
    for (uint8_t index = 1; index < SIREN_SUSTAINED_FRAMES; ++index) {
        const uint8_t current = sirenHistoryPeak(state, static_cast<uint8_t>(start + index));
        nonDecreasing = nonDecreasing && current >= previous;
        nonIncreasing = nonIncreasing && current <= previous;
        minimum = current < minimum ? current : minimum;
        maximum = current > maximum ? current : maximum;
        previous = current;
    }
    return static_cast<uint8_t>(maximum - minimum) >= SIREN_MIN_SWEEP_BINS &&
           (nonDecreasing || nonIncreasing);
}

inline bool hasSustainedTonalEvidence(const SirenState& state) {
    if (state.historyCount < SIREN_SUSTAINED_FRAMES) {
        return false;
    }

    const uint8_t start = sirenSustainedWindowStart(state);
    uint8_t tonalFrames = 0;
    for (uint8_t index = 0; index < SIREN_SUSTAINED_FRAMES; ++index) {
        const uint8_t historyIndex = sirenHistoryIndex(
            state, static_cast<uint8_t>(start + index));
        tonalFrames += state.tonalHistory[historyIndex] ? 1 : 0;
    }
    return tonalFrames >= SIREN_ATTENTION_FRAMES;
}

inline bool hasRecentAttentionSweep(const SirenState& state) {
    if (state.historyCount < SIREN_ATTENTION_FRAMES) {
        return false;
    }

    const uint8_t start = static_cast<uint8_t>(
        state.historyCount - SIREN_ATTENTION_FRAMES);
    bool nonDecreasing = true;
    bool nonIncreasing = true;
    uint8_t previous = sirenHistoryPeak(state, start);
    uint8_t minimum = previous;
    uint8_t maximum = previous;
    for (uint8_t index = 1; index < SIREN_ATTENTION_FRAMES; ++index) {
        const uint8_t current = sirenHistoryPeak(
            state, static_cast<uint8_t>(start + index));
        nonDecreasing = nonDecreasing && current >= previous;
        nonIncreasing = nonIncreasing && current <= previous;
        minimum = current < minimum ? current : minimum;
        maximum = current > maximum ? current : maximum;
        previous = current;
    }
    return static_cast<uint8_t>(maximum - minimum) >=
               SIREN_ATTENTION_MIN_SWEEP_BINS &&
           (nonDecreasing || nonIncreasing);
}

inline bool hasRisingAmplitudeTrend(const SirenState& state) {
    if (state.historyCount < SIREN_SUSTAINED_FRAMES) {
        return false;
    }

    constexpr uint8_t HALF = SIREN_SUSTAINED_FRAMES / 2;
    const uint8_t start = sirenSustainedWindowStart(state);
    float firstHalfMean = 0.0f;
    float secondHalfMean = 0.0f;
    for (uint8_t index = 0; index < HALF; ++index) {
        firstHalfMean += sirenHistoryEnergy(state, static_cast<uint8_t>(start + index));
        secondHalfMean += sirenHistoryEnergy(
            state, static_cast<uint8_t>(start + HALF + index));
    }
    firstHalfMean /= HALF;
    secondHalfMean /= HALF;
    return firstHalfMean > 0.0f &&
           secondHalfMean >= firstHalfMean * SIREN_RISING_ENERGY_RATIO;
}

inline bool hasSustainedBandEnergyAbove(const SirenState& state, float threshold) {
    if (state.historyCount < SIREN_SUSTAINED_FRAMES) {
        return false;
    }
    const uint8_t start = sirenSustainedWindowStart(state);
    for (uint8_t index = 0; index < SIREN_SUSTAINED_FRAMES; ++index) {
        if (sirenHistoryEnergy(state, static_cast<uint8_t>(start + index)) < threshold) {
            return false;
        }
    }
    return true;
}

inline bool hasUsableSirenNoiseFloor(const SirenState& state) {
    return state.noiseFloorEnergy > SIREN_REFERENCE_ENERGY_EPSILON;
}

inline void appendSirenHistory(SirenState& state, const SirenFeatures& features) {
    state.energyHistory[state.historyHead] = features.bandEnergy;
    state.peakHistory[state.historyHead] = features.peakBin;
    state.tonalHistory[state.historyHead] =
        features.peakEnergyRatio >= SIREN_MIN_PEAK_ENERGY_RATIO;
    state.historyHead = static_cast<uint8_t>((state.historyHead + 1) & SIREN_HISTORY_MASK);
    if (state.historyCount < SIREN_HISTORY_FRAMES) {
        ++state.historyCount;
    }
}

// This is the temporal decision boundary. Feed it one feature set per FFT frame.
inline SirenDecision updateSiren(SirenState& state, const SirenFeatures& features) {
    appendSirenHistory(state, features);

    if (!state.noiseFloorInitialized) {
        state.noiseFloorEnergy = features.noiseFloorEstimate;
        state.noiseFloorInitialized = true;
    }

    if (!state.bootstrapComplete) {
        ++state.bootstrapFrames;
        if (state.bootstrapFrames == 1) {
            state.noiseFloorEnergy = features.noiseFloorEstimate;
        } else {
            state.noiseFloorEnergy +=
                (features.noiseFloorEstimate - state.noiseFloorEnergy) /
                state.bootstrapFrames;
        }
        if (state.bootstrapFrames < SIREN_BOOTSTRAP_FRAMES) {
            return SirenDecision::NONE;
        }

        state.bootstrapComplete = true;
        state.consecutiveElevatedFrames = 0;
        state.consecutiveTonalFrames = 0;
        const bool startupShapeConfirmed =
            sirenModulationIndex(state) > SIREN_MODULATION_INDEX_THRESHOLD ||
            hasMonotonicPeakSweep(state);
        const bool hasReference = hasUsableSirenNoiseFloor(state);
        const float startupThreshold = hasReference
            ? state.noiseFloorEnergy * SIREN_ENERGY_THRESHOLD_RATIO *
                  (1.0f - SIREN_THRESHOLD_RELATIVE_EPSILON)
            : SIREN_REFERENCE_ENERGY_EPSILON;
        if (hasSustainedBandEnergyAbove(state, startupThreshold) &&
            hasSustainedTonalEvidence(state) && startupShapeConfirmed) {
            return hasRisingAmplitudeTrend(state) ? SirenDecision::DANGER
                                                   : SirenDecision::SIREN_WARNING;
        }
        return SirenDecision::NONE;
    }

    if (!hasUsableSirenNoiseFloor(state) &&
        features.noiseFloorEstimate > SIREN_REFERENCE_ENERGY_EPSILON) {
        state.noiseFloorEnergy = features.noiseFloorEstimate;
    }

    if (!hasUsableSirenNoiseFloor(state)) {
        state.consecutiveElevatedFrames = 0;
        state.consecutiveTonalFrames = 0;
        const bool shapeConfirmed =
            sirenModulationIndex(state) > SIREN_MODULATION_INDEX_THRESHOLD ||
            hasMonotonicPeakSweep(state);
        if (hasSustainedBandEnergyAbove(state, SIREN_REFERENCE_ENERGY_EPSILON) &&
            hasSustainedTonalEvidence(state) && shapeConfirmed) {
            return hasRisingAmplitudeTrend(state) ? SirenDecision::DANGER
                                                   : SirenDecision::SIREN_WARNING;
        }
        return SirenDecision::NONE;
    }

    const bool energyElevated = features.bandEnergy > 0.0f &&
                                features.bandEnergy >=
                                    state.noiseFloorEnergy *
                                        SIREN_ENERGY_THRESHOLD_RATIO *
                                        (1.0f - SIREN_THRESHOLD_RELATIVE_EPSILON);
    const bool tonalElevated = energyElevated &&
                               features.peakEnergyRatio >=
                                   SIREN_MIN_PEAK_ENERGY_RATIO;
    if (energyElevated) {
        if (state.consecutiveElevatedFrames < SIREN_SUSTAINED_FRAMES) {
            ++state.consecutiveElevatedFrames;
        }
    } else {
        state.consecutiveElevatedFrames = 0;
    }
    if (tonalElevated) {
        if (state.consecutiveTonalFrames < SIREN_ATTENTION_FRAMES) {
            ++state.consecutiveTonalFrames;
        }
    } else {
        state.consecutiveTonalFrames = 0;
    }
    if (!tonalElevated) {
        state.noiseFloorEnergy +=
            SIREN_NOISE_FLOOR_ALPHA *
            (features.noiseFloorEstimate - state.noiseFloorEnergy);
    }

    const bool shapeConfirmed =
        sirenModulationIndex(state) > SIREN_MODULATION_INDEX_THRESHOLD ||
        hasMonotonicPeakSweep(state);
    if (state.consecutiveElevatedFrames >= SIREN_SUSTAINED_FRAMES &&
        hasSustainedTonalEvidence(state) && shapeConfirmed) {
        return hasRisingAmplitudeTrend(state) ? SirenDecision::DANGER
                                               : SirenDecision::SIREN_WARNING;
    }
    if (state.consecutiveTonalFrames >= SIREN_ATTENTION_FRAMES &&
        hasRecentAttentionSweep(state)) {
        return SirenDecision::ATTENTION;
    }
    return SirenDecision::NONE;
}

inline SirenDecision updateSirenFrame(
    SirenState& state, const float magnitudes[SIREN_SPECTRUM_BINS]) {
    return updateSiren(state, extractSirenFeatures(magnitudes));
}
