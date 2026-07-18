#include <Arduino.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>
#include "pins.h"
#include "display.h"

// Software-SPI constructor: bit-bangs on exactly the locked pins, so it works
// regardless of the ESP32-S3 hardware-SPI pin mux. Refresh is slower than HW
// SPI but the payload here is a few short lines of text — plenty fast.
static Adafruit_ST7735 tft(LCD_CS, LCD_DC, LCD_MOSI, LCD_SCLK, LCD_RST);

void displayInit() {
    tft.initR(INITR_BLACKTAB);     // common 1.8" ST7735S variant; swap to
    tft.setRotation(1);            // GREENTAB/REDTAB if colours/offset look wrong
    tft.fillScreen(ST77XX_BLACK);
    tft.setTextWrap(false);
}

void showStatus(const String& ssid, const String& ip, const String& state) {
    tft.fillScreen(ST77XX_BLACK);
    tft.setTextSize(1);
    tft.setTextColor(ST77XX_WHITE);

    tft.setCursor(4, 6);
    tft.print(F("SSID: "));
    tft.print(ssid);

    tft.setCursor(4, 22);
    tft.print(F("IP:   "));
    tft.print(ip);

    tft.setCursor(4, 42);
    tft.setTextColor(ST77XX_GREEN);
    tft.setTextSize(2);
    tft.print(state);
}

void showCaption(const char* verbatim) {
    tft.fillScreen(ST77XX_BLACK);
    tft.setTextColor(ST77XX_YELLOW);
    tft.setTextSize(2);
    tft.setTextWrap(true);
    tft.setCursor(2, 4);
    tft.print(verbatim);
}
