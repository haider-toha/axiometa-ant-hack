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
        case CloudCommand::INVALID:
        default:
            return nullptr;
    }
}
