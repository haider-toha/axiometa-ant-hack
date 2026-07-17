# NeoPixel Matrix (5x5)

## Identity
- **slug:** `neopixel-matrix-5x5`
- **sku:** `AX22-0028`
- **role:** `kit_module`
- **source_url:** https://www.axiometa.io/products/neopixel-matrix-5x5
- **price:** $5.47
- **kit_label:** 5x5 LED Matrix

## Description

Turn the entire 22 × 22 mm AX22 footprint into a vivid 25-pixel canvas. This daisy chainable board packs a 5 × 5 grid of WS2812 Mini addressable RGB LEDs perfect for scrolling text, icons, bar-graphs, or attention grabbing status lights. Drop it into any AX22 backplane and animate it with just one GPIO pin using your favourite environment: Arduino IDE, MicroPython, or MicroBlocks.

## Technical Details

- 22 mm × 22 mm square
- 4× ⌀2.7 mm Mounting Holes
- Chainable DIN / DOUT pads
- Prints Numbers
- 5 x 5 Grid
- 3.3 V, 5.0 V
- Arduino IDE Compatible
- MicroPython Compatible
- MicroBlocks Compatible

## CAD & Technical Files

| kind | label | local_path | source_url | notes |
| --- | --- | --- | --- | --- |
| datasheet | Material Datasheet | `parts/neopixel-matrix-5x5/files/AX22-0028-datasheet.pdf` | https://www.lcsc.com/datasheet/C2909056.pdf | 43221 bytes |
| schematic | Circuit Schematic | `parts/neopixel-matrix-5x5/files/SCH_AX22-0028.pdf` | https://www.axiometa.io/cdn/shop/files/SCH_AX22-0028.pdf?v=10442569027764178329 | 85466 bytes |
| model_step | 3D Model | `parts/neopixel-matrix-5x5/files/AX22-0028.step` | https://www.axiometa.io/cdn/shop/files/AX22-0028.step?v=6869445560344897669 | 1049081 bytes |
| model_glb | 3D Model (GLB) | `parts/neopixel-matrix-5x5/files/AX22-0028.glb` | https://cdn.shopify.com/3d/models/a55a636751f4a24a/AX22-0028.glb | 1011984 bytes |

Resolved CAD:
- **step:** `parts/neopixel-matrix-5x5/files/AX22-0028.step`
- **glb:** `parts/neopixel-matrix-5x5/files/AX22-0028.glb`
- **schematic:** `parts/neopixel-matrix-5x5/files/SCH_AX22-0028.pdf`

## Images

### pinout

- **pinout-1:** `parts/neopixel-matrix-5x5/images/pinout/Pins-0028.png`

### pcb

- **PCB FRONT:** `parts/neopixel-matrix-5x5/images/pcb/T_0028.png`
- **PCB BACK:** `parts/neopixel-matrix-5x5/images/pcb/B_0028.png`

### gallery

- **gallery-1:** `parts/neopixel-matrix-5x5/images/gallery/84_f7c07521-9d99-4904-9f3f-bfe01c67248b.png`
- **gallery-2:** `parts/neopixel-matrix-5x5/images/gallery/86_6865a392-9801-4a07-88b4-1bd39578781c.png`
- **gallery-3:** `parts/neopixel-matrix-5x5/images/gallery/85_a9fa4e92-2083-4346-956b-b734a0027c4d.png`
- **gallery-4:** `parts/neopixel-matrix-5x5/images/gallery/87_e70afb85-a448-49a7-98c6-955e1bf92a20.png`

## Arduino Examples

### Example 1

```c
#include <Adafruit_NeoPixel.h>

#define NEOPIXEL_PIN 14
#define NUM_PIXELS 25

Adafruit_NeoPixel matrix(NUM_PIXELS, NEOPIXEL_PIN, NEO_GRB + NEO_KHZ800);

const uint8_t heartPixels[] = {
  1, 3,
  5, 6, 7, 8, 9,
  10, 11, 12, 13, 14,
  16, 17, 18,
  22
};

void setup() {
  matrix.begin();
  matrix.show();
  matrix.setBrightness(15);
}

void loop() {
  drawHeart();
}

void drawHeart() {
  // First turn all pixels off
  for (int i = 0; i < NUM_PIXELS; i++) {
    matrix.setPixelColor(i, 0);
  }

  // Set heart pixels red
  for (int i = 0; i < sizeof(heartPixels); i++) {
    matrix.setPixelColor(heartPixels[i], matrix.Color(255, 0, 0));
  }
  matrix.show();
}

void clearMatrix() {
  for (int i = 0; i < NUM_PIXELS; i++) {
    matrix.setPixelColor(i, 0);
  }
  matrix.show();
}
```

## Links

- [Material Datasheet](https://www.lcsc.com/datasheet/C2909056.pdf) (`datasheet`)
- [Circuit Schematic](https://www.axiometa.io/cdn/shop/files/SCH_AX22-0028.pdf?v=10442569027764178329) (`schematic`)
- [3D Model](https://www.axiometa.io/cdn/shop/files/AX22-0028.step?v=6869445560344897669) (`model_step`)
- [3D Model (GLB)](https://cdn.shopify.com/3d/models/a55a636751f4a24a/AX22-0028.glb) (`model_glb`)

## Notes

- Kit label: 5x5 LED Matrix
- Scraped at: 2026-07-17T15:07:43.059973+00:00
