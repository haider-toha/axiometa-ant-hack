#pragma once
#include <Arduino.h>

// ==========================================================================
//  display.h — ST7735S status + caption on the Port-2 SPI LCD.
// ==========================================================================

// Init the panel (software SPI on the LCD_* pins). Call once in setup().
void displayInit();

// Status screen: 3 lines — SSID, IP, and a short state word ("READY", etc.).
void showStatus(const String& ssid, const String& ip, const String& state);

// Caption screen: the verbatim text (word-wrapped) — the on-screen ground truth.
void showCaption(const char* verbatim);
