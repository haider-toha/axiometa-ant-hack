#pragma once
// ==========================================================================
//  LOCKED pin map — Axiometa Genesis Mini (ESP32-S3-MINI-1).
//  Single source of truth. CORRECTED per audit 20 §4 (board photos + STEP
//  geometry proved silk Ports 1 & 4 are ADJACENT; the true diagonals are
//  {1,3} and {2,4}). Motors sit on the {1,3} diagonal for max separation.
//  These values OVERRIDE the plan's Task B1 snippet. Do NOT deviate.
// ==========================================================================
#define MOTOR_L    4    // Port 1 IO0 — left Braille column (Motor A)
#define MOTOR_R    9    // Port 3 IO0 — right Braille column (Motor B, diagonal)
#define LCD_CS     7    // Port 2 IO0
#define LCD_RST    6    // Port 2 IO1
#define LCD_DC     5    // Port 2 IO2
#define LCD_MOSI   12   // shared SPI
#define LCD_SCLK   14   // shared SPI
#define ENC_BT     1    // Port 4 IO0 — encoder button
#define ENC_CL     17   // Port 4 IO1 — channel A
#define ENC_DT     18   // Port 4 IO2 — channel B
#define BTN_REPEAT 45   // onboard user button (VDD_SPI strapping pin — active-high, NO pull-up)
