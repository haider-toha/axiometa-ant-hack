#pragma once

#include <stdint.h>

#include "siren_pure.h"

inline constexpr uint32_t SIREN_WARNING_RATE_LIMIT_MS = 10000;

struct SirenProducerState {
    SirenDecision previousDecision = SirenDecision::NONE;
    uint32_t lastWarningPublishedMs = 0;
    bool warningPublished = false;
};

inline bool shouldPublishSirenDecision(
    SirenProducerState& state, SirenDecision decision, uint32_t nowMs) {
    if (decision == state.previousDecision) {
        return false;
    }
    state.previousDecision = decision;
    if (decision == SirenDecision::NONE) {
        return false;
    }
    if (decision == SirenDecision::SIREN_WARNING) {
        if (state.warningPublished &&
            static_cast<uint32_t>(nowMs - state.lastWarningPublishedMs) <
                SIREN_WARNING_RATE_LIMIT_MS) {
            return false;
        }
        state.warningPublished = true;
        state.lastWarningPublishedMs = nowMs;
    }
    return true;
}

inline bool canStartSirenOutput(
    SirenDecision incoming, SirenDecision active, bool proximityActive) {
    switch (incoming) {
        case SirenDecision::DANGER:
            return active != SirenDecision::DANGER;
        case SirenDecision::ATTENTION:
            return active != SirenDecision::DANGER;
        case SirenDecision::SIREN_WARNING:
            return !proximityActive && active == SirenDecision::NONE;
        case SirenDecision::NONE:
            return false;
    }
    return false;
}
