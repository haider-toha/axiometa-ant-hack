#pragma once

#include <stdint.h>

#include "patterns.h"

enum class CloudCommand : uint8_t {
    NONE = 0,
    BUS,
    NUMBER,
    WAIT,
    UNKNOWN,
    ERROR,
    LEFT,
    RIGHT,
    AHEAD,
};

enum class UserActivity : uint8_t {
    STILL = 0,
    MOVING,
    UNKNOWN,
};

enum class BoardMode : uint8_t {
    WAITING = 0,
    NAVIGATION,
};

constexpr BoardMode boardModeFor(UserActivity activity) {
    switch (activity) {
        case UserActivity::STILL:
            return BoardMode::WAITING;
        case UserActivity::MOVING:
            return BoardMode::NAVIGATION;
        case UserActivity::UNKNOWN:
        default:
            return BoardMode::WAITING;
    }
}

constexpr bool acceptsCloudCommand(BoardMode mode, CloudCommand command) {
    if (mode == BoardMode::WAITING) {
        switch (command) {
            case CloudCommand::NONE:
            case CloudCommand::BUS:
            case CloudCommand::NUMBER:
            case CloudCommand::WAIT:
            case CloudCommand::UNKNOWN:
            case CloudCommand::ERROR:
                return true;
            case CloudCommand::LEFT:
            case CloudCommand::RIGHT:
            case CloudCommand::AHEAD:
            default:
                return false;
        }
    }

    switch (command) {
        case CloudCommand::NONE:
        case CloudCommand::ERROR:
        case CloudCommand::LEFT:
        case CloudCommand::RIGHT:
        case CloudCommand::AHEAD:
            return true;
        case CloudCommand::BUS:
        case CloudCommand::NUMBER:
        case CloudCommand::WAIT:
        case CloudCommand::UNKNOWN:
        default:
            return false;
    }
}

constexpr const OutputPattern* navigationPattern(CloudCommand command) {
    switch (command) {
        case CloudCommand::LEFT:
            return &outputPatternFor(PatternId::LEFT);
        case CloudCommand::RIGHT:
            return &outputPatternFor(PatternId::RIGHT);
        case CloudCommand::AHEAD:
            return &outputPatternFor(PatternId::AHEAD);
        default:
            return nullptr;
    }
}
