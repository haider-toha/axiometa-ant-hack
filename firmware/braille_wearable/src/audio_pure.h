#pragma once

#include <math.h>
#include <stddef.h>
#include <stdint.h>

inline constexpr float AUDIO_SILENCE_SIGMA_MAX = 1.0f;
inline constexpr float AUDIO_RAW_PDM_SIGMA_MIN = 5000.0f;
inline constexpr int16_t AUDIO_CLIPPING_POSITIVE_MIN = 32760;
inline constexpr int16_t AUDIO_CLIPPING_NEGATIVE_MAX = -32760;

enum class AudioFrameHealth : uint8_t {
    EMPTY,
    SILENT_OR_WRONG_SLOT,
    HEALTHY,
    RAW_PDM_OR_EXCESSIVE_NOISE,
    CLIPPING,
};

struct AudioFrameStats {
    size_t sampleCount = 0;
    float mean = 0.0f;
    float standardDeviation = 0.0f;
    int16_t minimum = 0;
    int16_t maximum = 0;
    uint16_t clippingSamples = 0;
};

inline AudioFrameStats analyzeAudioFrame(const int16_t* samples, size_t count) {
    AudioFrameStats stats{};
    if (samples == nullptr || count == 0) {
        return stats;
    }

    stats.sampleCount = count;
    stats.minimum = samples[0];
    stats.maximum = samples[0];
    double sum = 0.0;
    for (size_t index = 0; index < count; ++index) {
        const int16_t sample = samples[index];
        sum += sample;
        stats.minimum = sample < stats.minimum ? sample : stats.minimum;
        stats.maximum = sample > stats.maximum ? sample : stats.maximum;
        if (sample >= AUDIO_CLIPPING_POSITIVE_MIN || sample <= AUDIO_CLIPPING_NEGATIVE_MAX) {
            ++stats.clippingSamples;
        }
    }
    stats.mean = static_cast<float>(sum / count);

    double squaredDeltaSum = 0.0;
    for (size_t index = 0; index < count; ++index) {
        const double delta = samples[index] - stats.mean;
        squaredDeltaSum += delta * delta;
    }
    stats.standardDeviation = static_cast<float>(sqrt(squaredDeltaSum / count));
    return stats;
}

inline AudioFrameHealth classifyAudioFrame(const AudioFrameStats& stats) {
    if (stats.sampleCount == 0) {
        return AudioFrameHealth::EMPTY;
    }
    if (stats.clippingSamples > 0) {
        return AudioFrameHealth::CLIPPING;
    }
    if (stats.standardDeviation < AUDIO_SILENCE_SIGMA_MAX) {
        return AudioFrameHealth::SILENT_OR_WRONG_SLOT;
    }
    if (stats.standardDeviation > AUDIO_RAW_PDM_SIGMA_MIN) {
        return AudioFrameHealth::RAW_PDM_OR_EXCESSIVE_NOISE;
    }
    return AudioFrameHealth::HEALTHY;
}

inline const char* audioFrameHealthName(AudioFrameHealth health) {
    switch (health) {
        case AudioFrameHealth::EMPTY:
            return "EMPTY";
        case AudioFrameHealth::SILENT_OR_WRONG_SLOT:
            return "SILENT_OR_WRONG_SLOT";
        case AudioFrameHealth::HEALTHY:
            return "HEALTHY";
        case AudioFrameHealth::RAW_PDM_OR_EXCESSIVE_NOISE:
            return "RAW_PDM_OR_EXCESSIVE_NOISE";
        case AudioFrameHealth::CLIPPING:
            return "CLIPPING";
    }
    return "UNKNOWN";
}
