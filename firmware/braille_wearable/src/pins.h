#pragma once

#include <stdint.h>

// Verified Genesis Mini port map for the current four-slot build.
inline constexpr uint8_t BUZZER_LEFT_PIN = 3;   // P1 IO1
inline constexpr uint8_t TOF_SDA_PIN = 10;      // P2 SDA
inline constexpr uint8_t TOF_SCL_PIN = 11;      // P2 SCL
inline constexpr uint8_t TOF_XSHUT_PIN = 6;     // P2 IO1
inline constexpr uint8_t BUZZER_RIGHT_PIN = 16; // P3 IO1

// P4 exposes GPIO1 / GPIO17 / GPIO18. The AX22-0044 microphone's CLK/DATA
// assignment remains intentionally undefined until read from the module silk.
// PDM capture must bind to I2S0 regardless of the two GPIOs selected.

inline constexpr uint8_t ONBOARD_USER_BUTTON_PIN = 45; // active-high; no pull-up
