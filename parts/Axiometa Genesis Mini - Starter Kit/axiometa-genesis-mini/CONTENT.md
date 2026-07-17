# Axiometa Genesis Mini

## Identity
- **slug:** `axiometa-genesis-mini`
- **sku:** `AXMT-MTX0013`
- **role:** `kit_module`
- **source_url:** https://www.axiometa.io/products/axiometa-genesis-mini
- **price:** $19.99

## Description

Genesis Mini is a modular, Wi-Fi-enabled prototyping system built around a standardized AX22 connector. The ESP32-S3 powered board provides four AX22 ports that modules plug into directly. This platform eliminates breadboard wiring for common tasks like sensor reading, display control, and motor driving. Modules lock securely in place and provide reliable electrical connections.

## Technical Details

- MCU: ESP32-S3-Mini-1
- Flash: 4MB
- PSRAM: 2MB
- 3x AA/AAA Battery Connector
- User buttons & LEDs
- Integrated Neopixel
- 55 mm × 55 mm square 4-layer PCB
- 4× ⌀2.7 mm Mounting Holes
- 1× STEMMA QT connectors
- Arduino IDE Compatible
- MicroPython Compatible
- MicroBlocks Compatible

## CAD & Technical Files

| kind | label | local_path | source_url | notes |
| --- | --- | --- | --- | --- |
| datasheet | MCU Datasheet | `parts/axiometa-genesis-mini/files/AXMT-MTX0013-datasheet.pdf` | https://documentation.espressif.com/esp32-s3-mini-1_mini-1u_datasheet_en.pdf | 1338916 bytes |
| guide | Getting Started Guide | `parts/axiometa-genesis-mini/guides/getting-started-guide.md` | https://www.axiometa.io/pages/genesis-getting-started-arduino |  |
| schematic | Circuit Schematic | `parts/axiometa-genesis-mini/files/SCH_MTX0013.pdf` | https://cdn.shopify.com/s/files/1/0966/7756/0659/files/SCH_MTX0013.pdf?v=1773849466 | 135794 bytes |
| model_step | 3D Model (STEP) | `parts/axiometa-genesis-mini/files/STP_MTX0013.zip` | https://cdn.shopify.com/s/files/1/0966/7756/0659/files/STP_MTX0013.zip?v=1773849541 | 4005661 bytes |
| model_glb | 3D Model (GLB) | `parts/axiometa-genesis-mini/files/GLB_MTX0013.glb` | https://cdn.shopify.com/3d/models/bcde7ad0cc082c1e/GLB_MTX0013.glb | 2184500 bytes |

Resolved CAD:
- **step:** `parts/axiometa-genesis-mini/files/STP_MTX0013.zip`
- **glb:** `parts/axiometa-genesis-mini/files/GLB_MTX0013.glb`
- **schematic:** `parts/axiometa-genesis-mini/files/SCH_MTX0013.pdf`

## Images

### pcb

- **PCB FRONT:** `parts/axiometa-genesis-mini/images/pcb/TOP_MTX0013.png`
- **PCB BACK:** `parts/axiometa-genesis-mini/images/pcb/BOT_MTX0013.png`

### gallery

- **gallery-1:** `parts/axiometa-genesis-mini/images/gallery/IMG_6063_84b4db7d-d486-4010-b9aa-524bee6d4290.png`
- **gallery-2:** `parts/axiometa-genesis-mini/images/gallery/BUN0001-HERO-5.png`
- **gallery-3:** `parts/axiometa-genesis-mini/images/gallery/BUN0001-HERO.png`
- **gallery-4:** `parts/axiometa-genesis-mini/images/gallery/2BACK_MTX0013.png`

## Arduino Examples

### Example 1

```c
#include <Adafruit_NeoPixel.h>
#define LED_PIN     21
#define BTN_PIN     45
#define ACT_LED     37

Adafruit_NeoPixel px(1, LED_PIN, NEO_GRB + NEO_KHZ800);
#define BRIGHTNESS  20

uint32_t colors[] = {
  px.Color(0, 180, 255),    // ice blue
  px.Color(0, 255, 180),    // aqua mint
  px.Color(80, 0, 255),     // deep violet
  px.Color(180, 0, 255),    // electric purple
  px.Color(0, 255, 100),    // neon green
  px.Color(0, 120, 255),    // ocean
  px.Color(255, 0, 180),    // hot magenta
  px.Color(0, 220, 220),    // cyan
  px.Color(140, 0, 255),    // ultraviolet
  px.Color(0, 255, 60),     // matrix green
};
int colorIdx = 0;
bool prev = HIGH;

void setup() {
  px.begin();
  px.setBrightness(BRIGHTNESS);
  px.setPixelColor(0, colors[0]);
  px.show();
  pinMode(BTN_PIN, INPUT_PULLUP);
  pinMode(ACT_LED, OUTPUT);
}

void loop() {
  bool btn = digitalRead(BTN_PIN) == LOW;
  if (btn && !prev) {
    colorIdx = (colorIdx + 1) % 10;
    px.setPixelColor(0, colors[colorIdx]);
    px.show();
  }
  prev = btn;

  uint32_t t = millis() % 1000;
  digitalWrite(ACT_LED, t < 200 ? HIGH : LOW);

  delay(10);
}
```

## Links

- [MCU Datasheet](https://documentation.espressif.com/esp32-s3-mini-1_mini-1u_datasheet_en.pdf) (`datasheet`)
- [Getting Started Guide](https://www.axiometa.io/pages/genesis-getting-started-arduino) (`guide`)
- [Circuit Schematic](https://cdn.shopify.com/s/files/1/0966/7756/0659/files/SCH_MTX0013.pdf?v=1773849466) (`schematic`)
- [3D Model (STEP)](https://cdn.shopify.com/s/files/1/0966/7756/0659/files/STP_MTX0013.zip?v=1773849541) (`model_step`)
- [3D Model (GLB)](https://cdn.shopify.com/3d/models/bcde7ad0cc082c1e/GLB_MTX0013.glb) (`model_glb`)

## Notes

- Scraped at: 2026-07-17T15:06:48.771535+00:00
