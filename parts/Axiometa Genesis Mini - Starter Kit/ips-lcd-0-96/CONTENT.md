# IPS LCD Display (0.96)

## Identity
- **slug:** `ips-lcd-0-96`
- **sku:** `AX22-0034`
- **role:** `kit_module`
- **source_url:** https://www.axiometa.io/products/ips-lcd-0-96
- **price:** $9.49
- **kit_label:** 0.96" Screen

## Description

⏳ This item is currently sold out — a new batch is on its way and will be available soon! This board mounts a Newvisio N096-1608TBBIG11-H13 IPS panel on a 22 × 29 mm PCB, delivering a sharp 160 × 80-pixel canvas driven by the ST7735S controller over 4-wire SPI. Snap it into any AX22 backplane and you’re drawing text, bitmaps, or real-time graphs in a handful of library calls Arduino IDE, MicroPython, or MicroBlocks.

## Technical Details

- 22 mm × 29 mm PCB
- 4× ⌀2.7 mm Mounting Holes
- 160 × 80 RGB pixels, normally-black IPS wide view
- 3.3 V
- Active area: 10.8 × 21.7 mm; glass size 13.5 × 27.9 mm
- Back-light: single white LED, ~20 mA @ 3 V
- Typical luminance ≈ 400 cd/m²
- ST7735S driver, 4-wire SPI up to ≈ 10 MHz
- Arduino IDE Compatible
- MicroPython Compatible
- MicroBlocks Compatible

## CAD & Technical Files

| kind | label | local_path | source_url | notes |
| --- | --- | --- | --- | --- |
| datasheet | Material Datasheet | `parts/ips-lcd-0-96/files/AX22-0034-datasheet.pdf` | https://www.lcsc.com/datasheet/C2890616.pdf | 43063 bytes |
| schematic | Circuit Schematic | `parts/ips-lcd-0-96/files/SCH_AX22-0034.pdf` | https://www.axiometa.io/cdn/shop/files/SCH_AX22-0034.pdf?v=4307088830728544920 | 69770 bytes |
| model_step | 3D Model | `parts/ips-lcd-0-96/files/AX22-0034.step` | https://www.axiometa.io/cdn/shop/files/AX22-0034.step?v=17196374049099874299 | 1206025 bytes |
| model_glb | 3D Model (GLB) | `parts/ips-lcd-0-96/files/AX22-0034.glb` | https://cdn.shopify.com/3d/models/0983197bc2c9a71b/AX22-0034.glb | 285892 bytes |

Resolved CAD:
- **step:** `parts/ips-lcd-0-96/files/AX22-0034.step`
- **glb:** `parts/ips-lcd-0-96/files/AX22-0034.glb`
- **schematic:** `parts/ips-lcd-0-96/files/SCH_AX22-0034.pdf`

## Images

### pinout

- **pinout-1:** `parts/ips-lcd-0-96/images/pinout/Pins-0034.png`

### pcb

- **PCB FRONT:** `parts/ips-lcd-0-96/images/pcb/T_0034.png`
- **PCB BACK:** `parts/ips-lcd-0-96/images/pcb/B_0034.png`

### gallery

- **gallery-1:** `parts/ips-lcd-0-96/images/gallery/Untitled_design_copy.png`
- **gallery-2:** `parts/ips-lcd-0-96/images/gallery/109_fcbb7099-2d49-4e2b-9a62-ec48af66aa94.png`
- **gallery-3:** `parts/ips-lcd-0-96/images/gallery/111.png`
- **gallery-4:** `parts/ips-lcd-0-96/images/gallery/110.png`

## Arduino Examples

### Example 1

```c
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>
#include <SPI.h>

#define TFT_CS    1
#define TFT_RST   14
#define TFT_DC    41
#define TFT_MOSI  11
#define TFT_SCLK  13

SPIClass mySPI(FSPI);
Adafruit_ST7735 tft = Adafruit_ST7735(&mySPI, TFT_CS, TFT_DC, TFT_RST);

// Rainbow colors
const uint16_t colors[] = {
  ST77XX_RED, ST77XX_ORANGE, ST77XX_YELLOW, 
  ST77XX_GREEN, ST77XX_CYAN, ST77XX_BLUE, ST77XX_MAGENTA
};

int colorIndex = 0;
int starCount = 20;
int starX[20], starY[20], starSpeed[20];

void setup() {
  mySPI.begin(TFT_SCLK, -1, TFT_MOSI);
  tft.initR(INITR_MINI160x80);
  tft.setRotation(3);
  
  // Initialize stars
  for(int i = 0; i < starCount; i++) {
    starX[i] = random(160);
    starY[i] = random(80);
    starSpeed[i] = random(1, 4);
  }
}

void loop() {
  // Animated starfield background
  tft.fillScreen(ST77XX_BLACK);
  
  for(int i = 0; i < starCount; i++) {
    tft.drawPixel(starX[i], starY[i], ST77XX_WHITE);
    starX[i] += starSpeed[i];
    if(starX[i] > 160) {
      starX[i] = 0;
      starY[i] = random(80);
    }
  }
  
  // Pulsing text effect
  int pulse = (millis() / 100) % 20;
  int textSize = 2 + (pulse > 10 ? 20 - pulse : pulse) / 10;
  
  // Rainbow cycling text
  tft.setTextColor(colors[colorIndex]);
  tft.setTextSize(textSize);
  tft.setCursor(30, 25);
  tft.print("Hello!");
  
  tft.setTextColor(colors[(colorIndex + 3) % 7]);
  tft.setTextSize(2);
  tft.setCursor(30, 50);
  tft.print("Axiometa");
  
  // Cycle through rainbow
  if(millis() % 500 < 50) {
    colorIndex = (colorIndex + 1) % 7;
  }
  
  delay(50);
}
```

## Links

- [Material Datasheet](https://www.lcsc.com/datasheet/C2890616.pdf) (`datasheet`)
- [Circuit Schematic](https://www.axiometa.io/cdn/shop/files/SCH_AX22-0034.pdf?v=4307088830728544920) (`schematic`)
- [3D Model](https://www.axiometa.io/cdn/shop/files/AX22-0034.step?v=17196374049099874299) (`model_step`)
- [3D Model (GLB)](https://cdn.shopify.com/3d/models/0983197bc2c9a71b/AX22-0034.glb) (`model_glb`)

## Notes

- Kit label: 0.96" Screen
- Scraped at: 2026-07-17T15:07:38.639756+00:00
