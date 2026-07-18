#pragma once

#include <stdint.h>

#include "patterns.h"

inline constexpr uint8_t BUZZER_LEFT_PIN = 3;             // P1 IO1
inline constexpr uint8_t BUZZER_RIGHT_PIN = 16;           // P3 IO1
// These controls belong only to the historical hot-swap bench runner. P2 is
// occupied by ToF in the production four-slot layout, which boots unarmed.
inline constexpr uint8_t EXPERIMENT_BUTTON_PIN = 6;          // P2 IO1
inline constexpr uint8_t EXPERIMENT_LED_PIN = 5;             // P2 IO2
inline constexpr uint8_t EXPERIMENT_BUTTON_ACTIVE_LEVEL = 0; // switch pulls low
inline constexpr uint8_t EXPERIMENT_LED_ACTIVE_LEVEL = 1;    // LED drives high
