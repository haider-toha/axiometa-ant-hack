# Distance Sensor (ToF-VL53L0CX)

- **Slug:** `distance-sensor-vl53l0cx`
- **SKU:** `AX22-0015`
- **Role:** `extra_module`
- **Source:** https://www.axiometa.io/products/distance-sensor-vl53l0cx
- **Price (scraped):** $9.99

## Description

⏳ This item is currently sold out — a new batch is on its way and will be available soon!
This AX22-sized board places ST’s VL53L0CX laser Time-of-Flight sensor on a compact 22 × 22 mm PCB, giving your project millimetre-accurate, eye-safe distance readings over I²C. An onboard regulator and bidirectional level shifters let any 1.8 V, 3.3 V, or 5 V microcontroller talk to the sensor hassle-free, while the factory-calibrated SPAD array measures absolute ranges out to 4 m in under 30 ms. Drop it into any AX22 backplane to add precise proximity sensing, gesture recognition, or collision avoidance to robots, smart interfaces, or interactive art with just a few library calls in Arduino, MicroPython, or MicroBlocks.

## Technical Details

- 22 mm × 22 mm square
- 4× ⌀2.7 mm Mounting Holes
- 1 mm – 4000 mm measurable range
- < ±10 mm error up to 2 m, < ±3% beyond
- < 30 ms single-shot, 50 Hz continuous mode
- I²C, default address 0x52
- 1.8 V, 3.3 V, 5.0 V
- Arduino IDE Compatible
- MicroPython Compatible
- MicroBlocks Compatible

## Links

- [Material Datasheet →](https://www.st.com/resource/en/datasheet/vl53l0x.pdf) (`datasheet`)
- [Circuit Schematic](https://www.axiometa.io/cdn/shop/files/SCH_AX22-0015.pdf?v=2137419566398641767) (`schematic`)
- [3D Model](https://www.axiometa.io/cdn/shop/files/AX22_0015.step?v=11463884403650754690) (`model_step`)
- [3D Model (GLB)](https://cdn.shopify.com/3d/models/d63d2c211adaee68/AX22_0015.glb) (`model_glb`)

## Downloaded Files

- **Material Datasheet →** → `None`
- **Circuit Schematic** → `parts/distance-sensor-vl53l0cx/files/SCH_AX22-0015.pdf` (84355 bytes)
- **3D Model** → `parts/distance-sensor-vl53l0cx/files/AX22-0015.step` (2011495 bytes)
- **3D Model (GLB)** → `parts/distance-sensor-vl53l0cx/files/AX22-0015.glb` (490864 bytes)

## Images

- **pinout-1** → `parts/distance-sensor-vl53l0cx/images/pinout/Pins-0015.png`
- **PCB FRONT** → `parts/distance-sensor-vl53l0cx/images/pcb/T_0015.png`
- **PCB BACK** → `parts/distance-sensor-vl53l0cx/images/pcb/B_0015.png`
- **gallery-1** → `parts/distance-sensor-vl53l0cx/images/gallery/152.png`
- **gallery-2** → `parts/distance-sensor-vl53l0cx/images/gallery/153.png`
- **gallery-3** → `parts/distance-sensor-vl53l0cx/images/gallery/155.png`
- **gallery-4** → `parts/distance-sensor-vl53l0cx/images/gallery/154.png`

## Arduino Example Snippets

### Example 1

```c
#include "Adafruit_VL53L0X.h"

Adafruit_VL53L0X lox = Adafruit_VL53L0X();

void setup() {
  Serial.begin(115200);

  while (! Serial) {
    delay(1);
  }

  Serial.println("Adafruit VL53L0X test.");
  if (!lox.begin()) {
    Serial.println(F("Failed to boot VL53L0X"));
    while(1);
  }
  Serial.println(F("VL53L0X API Continuous Ranging example\n\n"));
  lox.startRangeContinuous();
}

void loop() {
  if (lox.isRangeComplete()) {
    Serial.print("Distance in mm: ");
    Serial.println(lox.readRange());
  }
}
```

## Notes

- Download failed for Material Datasheet →: https://www.st.com/resource/en/datasheet/vl53l0x.pdf

_Scraped at 2026-07-18T12:00:41.417529+00:00_
