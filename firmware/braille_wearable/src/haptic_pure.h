#pragma once

#include <stdint.h>

#include "patterns.h"

struct PatternPlayer {
    const OutputPattern* pattern = nullptr;
    uint8_t stepIndex = 0;
    uint32_t stepStartedMs = 0;
};

struct PatternOutput {
    bool active;
    uint16_t p1Hz;
    uint16_t p3Hz;
};

inline void startPattern(PatternPlayer& player, const OutputPattern& pattern,
                         uint32_t nowMs) {
    player.pattern = &pattern;
    player.stepIndex = 0;
    player.stepStartedMs = nowMs;
}

inline void stopPattern(PatternPlayer& player) {
    player.pattern = nullptr;
    player.stepIndex = 0;
}

inline bool tickPattern(PatternPlayer& player, uint32_t nowMs) {
    if (player.pattern == nullptr) {
        return false;
    }

    while (player.stepIndex < player.pattern->stepCount) {
        const uint16_t stepDurationMs = player.pattern->steps[player.stepIndex].durationMs;
        if (static_cast<uint32_t>(nowMs - player.stepStartedMs) < stepDurationMs) {
            return false;
        }
        player.stepStartedMs += stepDurationMs;
        ++player.stepIndex;
    }

    stopPattern(player);
    return true;
}

inline PatternOutput patternOutput(const PatternPlayer& player) {
    if (player.pattern == nullptr || player.stepIndex >= player.pattern->stepCount) {
        return {false, 0, 0};
    }
    const OutputStep& step = player.pattern->steps[player.stepIndex];
    return {true, step.p1Hz, step.p3Hz};
}
