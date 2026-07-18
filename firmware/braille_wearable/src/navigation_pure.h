#pragma once

#include <stdint.h>

#include "patterns.h"
#include "relay_pure.h"

enum class ServiceDirection : uint8_t { LEFT = 0, RIGHT, AHEAD };

constexpr const OutputPattern* serviceDirectionPattern(ServiceDirection direction) {
    switch (direction) {
        case ServiceDirection::LEFT:
            return &outputPatternFor(PatternId::LEFT);
        case ServiceDirection::RIGHT:
            return &outputPatternFor(PatternId::RIGHT);
        case ServiceDirection::AHEAD:
            return &outputPatternFor(PatternId::AHEAD);
    }
    return nullptr;
}

constexpr const OutputPattern* cloudPattern(CloudCommand command) {
    switch (command) {
        case CloudCommand::BUS:
            return &outputPatternFor(PatternId::BUS);
        case CloudCommand::NUMBER:
            return &outputPatternFor(PatternId::NUMBER);
        case CloudCommand::WAIT:
            return &outputPatternFor(PatternId::WAIT);
        case CloudCommand::UNKNOWN:
            return &outputPatternFor(PatternId::UNKNOWN);
        case CloudCommand::ERROR:
            return &outputPatternFor(PatternId::ERROR);
        // Camera-derived bus bearing reuses the two audio-proxy channels the
        // service-Serial keys already drive. Same tones, same concept-only
        // claim: P1 2350 Hz and P3 3050 Hz stand in for future actuators.
        case CloudCommand::LEFT:
            return &outputPatternFor(PatternId::LEFT);
        case CloudCommand::RIGHT:
            return &outputPatternFor(PatternId::RIGHT);
        case CloudCommand::AHEAD:
            return &outputPatternFor(PatternId::AHEAD);
        case CloudCommand::NONE:
        case CloudCommand::INVALID:
        default:
            return nullptr;
    }
}
