#pragma once

#include <stdint.h>

inline constexpr uint16_t PROXIMITY_ENTER_MM = 1200;
inline constexpr uint16_t PROXIMITY_EXIT_MM = 1300;
inline constexpr uint16_t PROXIMITY_FAST_MM = 300;
inline constexpr uint16_t PROXIMITY_SLOW_MM = 1200;
inline constexpr uint16_t PROXIMITY_FAST_GAP_MS = 120;
inline constexpr uint16_t PROXIMITY_SLOW_GAP_MS = 900;
inline constexpr uint8_t PROXIMITY_CONFIRM_SAMPLES = 3;
inline constexpr uint16_t PROXIMITY_RANGE_TIMEOUT_MS = 250;

struct ProximityState {
    bool active = false;
    uint8_t nearCount = 0;
    uint8_t farCount = 0;
    uint8_t invalidCount = 0;
    uint16_t lastValidMm = 0;
};

struct ProximityUpdate {
    bool active;
    bool outputAllowed;
    bool entered;
    bool exited;
    bool sampleValid;
    uint16_t distanceMm;
    uint16_t pulseGapMs;
};

inline constexpr bool rangeCompletionTimedOut(uint32_t nowMs,
                                              uint32_t lastCompletionMs) {
    return static_cast<uint32_t>(nowMs - lastCompletionMs) >=
           PROXIMITY_RANGE_TIMEOUT_MS;
}

inline constexpr uint16_t proximityPulseGapMs(uint16_t distanceMm) {
    const uint16_t clamped = distanceMm < PROXIMITY_FAST_MM
                                 ? PROXIMITY_FAST_MM
                                 : (distanceMm > PROXIMITY_SLOW_MM
                                        ? PROXIMITY_SLOW_MM
                                        : distanceMm);
    const uint32_t distanceSpan = PROXIMITY_SLOW_MM - PROXIMITY_FAST_MM;
    const uint32_t gapSpan = PROXIMITY_SLOW_GAP_MS - PROXIMITY_FAST_GAP_MS;
    return static_cast<uint16_t>(
        PROXIMITY_FAST_GAP_MS +
        (static_cast<uint32_t>(clamped - PROXIMITY_FAST_MM) * gapSpan) / distanceSpan);
}

inline ProximityUpdate updateProximity(ProximityState& state,
                                       uint16_t distanceMm,
                                       bool sampleValid) {
    const bool wasActive = state.active;

    if (!sampleValid) {
        state.nearCount = 0;
        state.farCount = 0;
        if (state.invalidCount < PROXIMITY_CONFIRM_SAMPLES) {
            ++state.invalidCount;
        }
        if (state.invalidCount >= PROXIMITY_CONFIRM_SAMPLES) {
            state.active = false;
        }
    } else {
        state.invalidCount = 0;
        state.lastValidMm = distanceMm;

        if (distanceMm < PROXIMITY_ENTER_MM) {
            state.farCount = 0;
            if (state.nearCount < PROXIMITY_CONFIRM_SAMPLES) {
                ++state.nearCount;
            }
            if (state.nearCount >= PROXIMITY_CONFIRM_SAMPLES) {
                state.active = true;
            }
        } else if (distanceMm > PROXIMITY_EXIT_MM) {
            state.nearCount = 0;
            if (state.farCount < PROXIMITY_CONFIRM_SAMPLES) {
                ++state.farCount;
            }
            if (state.farCount >= PROXIMITY_CONFIRM_SAMPLES) {
                state.active = false;
            }
        } else {
            state.nearCount = 0;
            state.farCount = 0;
        }
    }

    return {
        state.active,
        state.active && sampleValid,
        !wasActive && state.active,
        wasActive && !state.active,
        sampleValid,
        sampleValid ? distanceMm : state.lastValidMm,
        proximityPulseGapMs(sampleValid ? distanceMm : state.lastValidMm),
    };
}
