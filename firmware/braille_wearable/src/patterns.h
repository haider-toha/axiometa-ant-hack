#pragma once

#include <stddef.h>
#include <stdint.h>

inline constexpr uint16_t AUDIO_PROXY_LEFT_HZ = 2350;
inline constexpr uint16_t AUDIO_PROXY_RIGHT_HZ = 3050;

enum class PatternId : uint8_t {
    BUS,
    WAIT,
    LEFT,
    RIGHT,
    AHEAD,
};

struct OutputStep {
    uint16_t p1Hz;
    uint16_t p3Hz;
    uint16_t durationMs;
};

struct OutputPattern {
    const char* name;
    const OutputStep* steps;
    uint8_t stepCount;
};

inline constexpr OutputStep BUS_STEPS[] = {
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 250}, {0, 0, 250},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 250}, {0, 0, 250},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 250}, {0, 0, 250},
};

inline constexpr OutputStep WAIT_STEPS[] = {
    {AUDIO_PROXY_LEFT_HZ, 0, 300}, {0, 0, 200},
    {0, AUDIO_PROXY_RIGHT_HZ, 300}, {0, 0, 200},
    {AUDIO_PROXY_LEFT_HZ, 0, 300}, {0, 0, 200},
    {0, AUDIO_PROXY_RIGHT_HZ, 300}, {0, 0, 200},
};

inline constexpr OutputStep LEFT_STEPS[] = {
    {AUDIO_PROXY_LEFT_HZ, 0, 200}, {0, 0, 200},
    {AUDIO_PROXY_LEFT_HZ, 0, 200}, {0, 0, 200},
};

inline constexpr OutputStep RIGHT_STEPS[] = {
    {0, AUDIO_PROXY_RIGHT_HZ, 200}, {0, 0, 200},
    {0, AUDIO_PROXY_RIGHT_HZ, 200}, {0, 0, 200},
};

inline constexpr OutputStep AHEAD_STEPS[] = {
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 400},
    {0, 0, 200},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 400},
};

template <size_t N>
constexpr OutputPattern makeOutputPattern(const char* name, const OutputStep (&steps)[N]) {
    return {name, steps, static_cast<uint8_t>(N)};
}

inline constexpr OutputPattern BUS_PATTERN = makeOutputPattern("BUS", BUS_STEPS);
inline constexpr OutputPattern WAIT_PATTERN = makeOutputPattern("WAIT", WAIT_STEPS);
inline constexpr OutputPattern LEFT_PATTERN = makeOutputPattern("LEFT", LEFT_STEPS);
inline constexpr OutputPattern RIGHT_PATTERN = makeOutputPattern("RIGHT", RIGHT_STEPS);
inline constexpr OutputPattern AHEAD_PATTERN = makeOutputPattern("AHEAD", AHEAD_STEPS);

constexpr const OutputPattern& outputPatternFor(PatternId id) {
    switch (id) {
        case PatternId::BUS: return BUS_PATTERN;
        case PatternId::WAIT: return WAIT_PATTERN;
        case PatternId::LEFT: return LEFT_PATTERN;
        case PatternId::RIGHT: return RIGHT_PATTERN;
        case PatternId::AHEAD: return AHEAD_PATTERN;
    }
    return BUS_PATTERN;
}

constexpr uint16_t outputPatternDurationMs(const OutputPattern& pattern) {
    uint16_t durationMs = 0;
    for (uint8_t index = 0; index < pattern.stepCount; ++index) {
        durationMs = static_cast<uint16_t>(durationMs + pattern.steps[index].durationMs);
    }
    return durationMs;
}
