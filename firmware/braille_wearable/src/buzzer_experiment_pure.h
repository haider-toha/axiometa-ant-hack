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

inline constexpr uint16_t AUDIO_PROXY_LEFT_HZ = 700;
inline constexpr uint16_t AUDIO_PROXY_RIGHT_HZ = 1400;

inline constexpr BuzzerStep NAV_LEFT_STEPS[] = {
    {AUDIO_PROXY_LEFT_HZ, 0, 200}, {0, 0, 200},
    {AUDIO_PROXY_LEFT_HZ, 0, 200}, {0, 0, 200},
};

inline constexpr BuzzerStep NAV_RIGHT_STEPS[] = {
    {0, AUDIO_PROXY_RIGHT_HZ, 200}, {0, 0, 200},
    {0, AUDIO_PROXY_RIGHT_HZ, 200}, {0, 0, 200},
};

inline constexpr BuzzerStep EVENT_STEPS[] = {
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 250}, {0, 0, 250},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 250}, {0, 0, 250},
    {AUDIO_PROXY_LEFT_HZ, AUDIO_PROXY_RIGHT_HZ, 250}, {0, 0, 250},
};

inline constexpr BuzzerStep WAIT_STEPS[] = {
    {AUDIO_PROXY_LEFT_HZ, 0, 300}, {0, 0, 200},
    {0, AUDIO_PROXY_RIGHT_HZ, 300}, {0, 0, 200},
    {AUDIO_PROXY_LEFT_HZ, 0, 300}, {0, 0, 200},
    {0, AUDIO_PROXY_RIGHT_HZ, 300}, {0, 0, 200},
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
