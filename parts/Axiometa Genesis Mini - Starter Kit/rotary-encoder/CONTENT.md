# Rotary Encoder

## Identity
- **slug:** `rotary-encoder`
- **sku:** `AX22-0003`
- **role:** `kit_module`
- **source_url:** https://www.axiometa.io/products/rotary-encoder
- **price:** $4.32

## Description

This AX22-sized module integrates an ALPS Alpine incremental rotary encoder on a compact 22 × 22 mm PCB. The encoder outputs clean two-channel quadrature signals plus an optional push-switch, making it straightforward for any microcontroller to read direction, step count, and clicks without extra debouncing circuitry. It’s perfect for tweaking parameters like brightness, volume, or menu selections and slips seamlessly into AX22 systems with no special wiring. Use it in custom control panels, user-input dials, or interactive gadgets where precise, tactile rotary input is essential.

## Technical Details

- 22 mm × 22 mm square
- 4× ⌀2.7 mm Mounting Holes
- Integrated Push Button
- 1.8 V, 3.3 V, 5.0 V
- Arduino IDE Compatible
- MicroPython Compatible
- MicroBlocks Compatible

## CAD & Technical Files

| kind | label | local_path | source_url | notes |
| --- | --- | --- | --- | --- |
| datasheet | Material Datasheet | `parts/rotary-encoder/files/AX22-0003-datasheet.pdf` | https://lcsc.com/datasheet/lcsc_datasheet_2411271906_ALPSALPINE-EC11L1525G01_C2991196.pdf | 42751 bytes |
| schematic | Circuit Schematic | `parts/rotary-encoder/files/SCH_AX22-0003_7eb5f10f-c1c3-4e7b-a646-dacbfdc90398.pdf` | https://www.axiometa.io/cdn/shop/files/SCH_AX22-0003_7eb5f10f-c1c3-4e7b-a646-dacbfdc90398.pdf?v=4033840368395877099 | 64324 bytes |
| model_step | 3D Model | `parts/rotary-encoder/files/AX22-0003.step` | https://www.axiometa.io/cdn/shop/files/AX22-0003.step?v=2724289718625257314 | 1331978 bytes |
| model_glb | 3D Model (GLB) | `parts/rotary-encoder/files/AX22-0003.glb` | https://cdn.shopify.com/3d/models/ab6e2ec4dfe48671/AX22-0003.glb | 1347292 bytes |

Resolved CAD:
- **step:** `parts/rotary-encoder/files/AX22-0003.step`
- **glb:** `parts/rotary-encoder/files/AX22-0003.glb`
- **schematic:** `parts/rotary-encoder/files/SCH_AX22-0003_7eb5f10f-c1c3-4e7b-a646-dacbfdc90398.pdf`

## Images

### pinout

- **pinout-1:** `parts/rotary-encoder/images/pinout/Pins-0003.png`

### pcb

- **PCB FRONT:** `parts/rotary-encoder/images/pcb/T_0003.png`
- **PCB BACK:** `parts/rotary-encoder/images/pcb/B_0003.png`

### gallery

- **gallery-1:** `parts/rotary-encoder/images/gallery/Untitled_design_6.png`
- **gallery-2:** `parts/rotary-encoder/images/gallery/7_82c75658-2e09-4463-9015-2d06aed706a2.png`
- **gallery-3:** `parts/rotary-encoder/images/gallery/6_1b0049d9-b8b5-4e39-bd9f-e8a23b549e7c.png`
- **gallery-4:** `parts/rotary-encoder/images/gallery/8.png`

## Arduino Examples

### Example 1

```c
#include <RotaryEncoder.h>

#define PIN_BT 1
#define PIN_CL 14
#define PIN_DT 41

RotaryEncoder encoder(PIN_CL, PIN_DT, RotaryEncoder::LatchMode::TWO03);

void setup() {
  Serial.begin(9600);
  pinMode(PIN_BT, INPUT);
}

void loop() {
  static int pos = 0;
  encoder.tick();

  if (digitalRead(PIN_BT) == HIGH) {
    Serial.println("Button Press");
    delay(100);
  }

  int newPos = encoder.getPosition();
  if (pos != newPos) {
    Serial.print("pos:");
    Serial.print(newPos);
    Serial.print(" dir:");
    Serial.println((int)(encoder.getDirection()));
    pos = newPos;
  }
}
```

## Links

- [Material Datasheet](https://lcsc.com/datasheet/lcsc_datasheet_2411271906_ALPSALPINE-EC11L1525G01_C2991196.pdf) (`datasheet`)
- [Circuit Schematic](https://www.axiometa.io/cdn/shop/files/SCH_AX22-0003_7eb5f10f-c1c3-4e7b-a646-dacbfdc90398.pdf?v=4033840368395877099) (`schematic`)
- [3D Model](https://www.axiometa.io/cdn/shop/files/AX22-0003.step?v=2724289718625257314) (`model_step`)
- [3D Model (GLB)](https://cdn.shopify.com/3d/models/ab6e2ec4dfe48671/AX22-0003.glb) (`model_glb`)

## Notes

- Scraped at: 2026-07-17T15:07:41.951492+00:00
