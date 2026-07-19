#pragma once

#include <stddef.h>
#include <stdint.h>

inline constexpr uint16_t AUDIO_PROXY_LEFT_HZ = 2350;
inline constexpr uint16_t AUDIO_PROXY_RIGHT_HZ = 3050;

enum class PatternId : uint8_t {
    DANGER,
    SIREN_WARNING,
    ATTENTION,
    READY,
    BUS,
    NUMBER,
    WAIT,
    UNKNOWN,
    ERROR,
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

inline constexpr OutputStep READY_STEPS[] = {
    {2100, 3300, 100},
    {2250, 3150, 100},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 200},
};

inline constexpr OutputStep ATTENTION_STEPS[] = {
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 250},
};

inline constexpr OutputStep SIREN_WARNING_STEPS[] = {
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 400}, {0, 0, 300},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 400}, {0, 0, 300},
};

inline constexpr OutputStep DANGER_STEPS[] = {
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 200}, {0, 0, 150},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 200}, {0, 0, 150},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 200}, {0, 0, 150},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 200}, {0, 0, 150},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 200}, {0, 0, 150},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 500}, {0, 0, 750},

    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 200}, {0, 0, 150},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 200}, {0, 0, 150},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 200}, {0, 0, 150},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 200}, {0, 0, 150},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 200}, {0, 0, 150},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 500}, {0, 0, 750},

    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 200}, {0, 0, 150},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 200}, {0, 0, 150},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 200}, {0, 0, 150},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 200}, {0, 0, 150},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 200}, {0, 0, 150},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 500}, {0, 0, 750},

    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 200}, {0, 0, 150},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 200}, {0, 0, 150},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 200}, {0, 0, 150},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 200}, {0, 0, 150},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 200}, {0, 0, 150},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 500},
};

inline constexpr OutputStep BUS_STEPS[] = {
    {2050, 3350, 250}, {0, 0, 250},
    {2200, 3200, 250}, {0, 0, 250},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 250}, {0, 0, 250},
};

// Hardcoded route 88: preamble, two quinary "8" digits, and terminator.
inline constexpr OutputStep NUMBER_STEPS[] = {
    {2700, 2700, 500}, {0, 0, 600},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 500}, {0, 0, 250},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 150}, {0, 0, 250},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 150}, {0, 0, 250},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 150}, {0, 0, 800},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 500}, {0, 0, 250},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 150}, {0, 0, 250},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 150}, {0, 0, 250},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 150}, {0, 0, 600},
    {2700, 2700, 500},
};

inline constexpr OutputStep WAIT_STEPS[] = {
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 200},
    {0, 0, 600},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 200},
};

inline constexpr OutputStep UNKNOWN_STEPS[] = {
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 300},
    {2050, 3350, 300},
    {1750, 3650, 300},
};

inline constexpr OutputStep ERROR_STEPS[] = {
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 600}, {0, 0, 300},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 150}, {0, 0, 300},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 600},
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
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 600},
};

template <size_t N>
constexpr OutputPattern makeOutputPattern(const char* name, const OutputStep (&steps)[N]) {
    return {name, steps, static_cast<uint8_t>(N)};
}

inline constexpr OutputPattern READY_PATTERN = makeOutputPattern("READY", READY_STEPS);
inline constexpr OutputPattern ATTENTION_PATTERN =
    makeOutputPattern("ATTENTION", ATTENTION_STEPS);
inline constexpr OutputPattern SIREN_WARNING_PATTERN =
    makeOutputPattern("SIREN_WARNING", SIREN_WARNING_STEPS);
inline constexpr OutputPattern DANGER_PATTERN = makeOutputPattern("DANGER", DANGER_STEPS);
inline constexpr OutputPattern BUS_PATTERN = makeOutputPattern("BUS", BUS_STEPS);
inline constexpr OutputPattern NUMBER_PATTERN = makeOutputPattern("NUMBER_88", NUMBER_STEPS);
inline constexpr OutputPattern WAIT_PATTERN = makeOutputPattern("WAIT", WAIT_STEPS);
inline constexpr OutputPattern UNKNOWN_PATTERN = makeOutputPattern("UNKNOWN", UNKNOWN_STEPS);
inline constexpr OutputPattern ERROR_PATTERN = makeOutputPattern("ERROR", ERROR_STEPS);
inline constexpr OutputPattern LEFT_PATTERN = makeOutputPattern("LEFT", LEFT_STEPS);
inline constexpr OutputPattern RIGHT_PATTERN = makeOutputPattern("RIGHT", RIGHT_STEPS);
inline constexpr OutputPattern AHEAD_PATTERN = makeOutputPattern("AHEAD", AHEAD_STEPS);

constexpr const OutputPattern& outputPatternFor(PatternId id) {
    switch (id) {
        case PatternId::DANGER: return DANGER_PATTERN;
        case PatternId::SIREN_WARNING: return SIREN_WARNING_PATTERN;
        case PatternId::ATTENTION: return ATTENTION_PATTERN;
        case PatternId::READY: return READY_PATTERN;
        case PatternId::BUS: return BUS_PATTERN;
        case PatternId::NUMBER: return NUMBER_PATTERN;
        case PatternId::WAIT: return WAIT_PATTERN;
        case PatternId::UNKNOWN: return UNKNOWN_PATTERN;
        case PatternId::ERROR: return ERROR_PATTERN;
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
