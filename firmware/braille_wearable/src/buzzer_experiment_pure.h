#pragma once

#include <stddef.h>
#include <stdint.h>

inline constexpr uint8_t BUZZER_LEFT_PIN = 3;             // P1 IO1
inline constexpr uint8_t CONTROL_BUTTON_PIN = 6;          // P2 IO1
inline constexpr uint8_t CONTROL_LED_PIN = 5;             // P2 IO2
inline constexpr uint8_t BUZZER_RIGHT_PIN = 16;           // P3 IO1
inline constexpr uint8_t CONTROL_BUTTON_ACTIVE_LEVEL = 0; // AX22-0050 switch pulls low
inline constexpr uint8_t CONTROL_LED_ACTIVE_LEVEL = 1;    // AX22-0050 LED drives high

enum class BuzzerPatternId : uint8_t {
    NAV_LEFT,
    NAV_RIGHT,
    EVENT,
    WAIT,
};

struct BuzzerStep {
    uint16_t leftHz;
    uint16_t rightHz;
    uint16_t durationMs;
};

struct BuzzerPattern {
    const char* name;
    const BuzzerStep* steps;
    uint8_t stepCount;
};

inline constexpr uint16_t VIABILITY_FREQUENCIES_HZ[] = {70, 100, 150, 220};
inline constexpr uint8_t VIABILITY_FREQUENCY_COUNT = 4;

inline constexpr BuzzerStep NAV_LEFT_STEPS[] = {
    {70, 0, 200}, {0, 0, 200},
    {70, 0, 200}, {0, 0, 200},
};

inline constexpr BuzzerStep NAV_RIGHT_STEPS[] = {
    {0, 220, 200}, {0, 0, 200},
    {0, 220, 200}, {0, 0, 200},
};

inline constexpr BuzzerStep EVENT_STEPS[] = {
    {100, 100, 250}, {0, 0, 250},
    {100, 100, 250}, {0, 0, 250},
    {100, 100, 250}, {0, 0, 250},
};

inline constexpr BuzzerStep WAIT_STEPS[] = {
    {100, 0, 300}, {0, 0, 200},
    {0, 100, 300}, {0, 0, 200},
    {100, 0, 300}, {0, 0, 200},
    {0, 100, 300}, {0, 0, 200},
};

inline constexpr BuzzerPattern NAV_LEFT_PATTERN = {
    "LEFT", NAV_LEFT_STEPS, static_cast<uint8_t>(sizeof(NAV_LEFT_STEPS) / sizeof(NAV_LEFT_STEPS[0]))
};
inline constexpr BuzzerPattern NAV_RIGHT_PATTERN = {
    "RIGHT", NAV_RIGHT_STEPS, static_cast<uint8_t>(sizeof(NAV_RIGHT_STEPS) / sizeof(NAV_RIGHT_STEPS[0]))
};
inline constexpr BuzzerPattern EVENT_PATTERN = {
    "EVENT", EVENT_STEPS, static_cast<uint8_t>(sizeof(EVENT_STEPS) / sizeof(EVENT_STEPS[0]))
};
inline constexpr BuzzerPattern WAIT_PATTERN = {
    "WAIT", WAIT_STEPS, static_cast<uint8_t>(sizeof(WAIT_STEPS) / sizeof(WAIT_STEPS[0]))
};

inline constexpr const BuzzerPattern& patternFor(BuzzerPatternId id) {
    switch (id) {
        case BuzzerPatternId::NAV_LEFT:  return NAV_LEFT_PATTERN;
        case BuzzerPatternId::NAV_RIGHT: return NAV_RIGHT_PATTERN;
        case BuzzerPatternId::EVENT:     return EVENT_PATTERN;
        case BuzzerPatternId::WAIT:      return WAIT_PATTERN;
    }
    return NAV_LEFT_PATTERN;
}
