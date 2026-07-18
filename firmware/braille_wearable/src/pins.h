#pragma once

#include <stdint.h>

// Verified Genesis Mini port map for the current four-slot build.
inline constexpr uint8_t BUZZER_LEFT_PIN = 3;   // P1 IO1
inline constexpr uint8_t TOF_SDA_PIN = 10;      // P2 SDA
inline constexpr uint8_t TOF_SCL_PIN = 11;      // P2 SCL
inline constexpr uint8_t TOF_XSHUT_PIN = 6;     // P2 IO1
inline constexpr uint8_t BUZZER_RIGHT_PIN = 16; // P3 IO1

// Verified from the AX22-0044 module silk: G / 3V3 / SL / DT / CLK.
inline constexpr uint8_t MIC_CLK_PIN = 18;     // P4 IO2 / CLK
inline constexpr uint8_t MIC_DATA_PIN = 17;    // P4 IO1 / DT
inline constexpr uint8_t MIC_SELECT_PIN = 1;   // P4 IO0 / SL
inline constexpr uint8_t MIC_SELECT_LEVEL = 1; // select tied high

inline constexpr uint8_t ONBOARD_USER_BUTTON_PIN = 45; // active-high; no pull-up
