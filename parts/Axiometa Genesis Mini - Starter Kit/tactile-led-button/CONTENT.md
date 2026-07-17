# Tactile Led Button

## Identity
- **slug:** `tactile-led-button`
- **sku:** `AX22-0050`
- **role:** `kit_module`
- **source_url:** https://www.axiometa.io/products/tactile-led-button
- **price:** $5.49
- **kit_label:** LED Button

## Description

Add a clicky button with built-in LED feedback to your projects. This tactile switch module features a large 12mm button with a crisp mechanical feel, hardware debouncing for clean signal readings, and an integrated white LED for visual confirmation. Perfect for user interfaces, control panels, or any application where you need reliable button input with illumination. The onboard RC filter eliminates bounce, so you get clean press detection without extra code. The LED can be controlled independently, letting you indicate status, provide feedback, or create attention-grabbing effects. The button comes in different cap colors to match your project's aesthetic, while the white LED stays consistent across all variants.

## Technical Details

- 22 mm × 22 mm square
- 4× ⌀2.7 mm Mounting Holes
- 12mm tactile switch with LED
- Integrated hardware debounce
- 3.3 V, 5.0 V
- Arduino IDE Compatible
- MicroPython Compatible
- MicroBlocks Compatible

## CAD & Technical Files

| kind | label | local_path | source_url | notes |
| --- | --- | --- | --- | --- |
| datasheet | Material Datasheet | `parts/tactile-led-button/files/AX22-0050-datasheet.pdf` | https://www.lcsc.com/datasheet/C18185600.pdf | 44490 bytes |
| schematic | Circuit Schematic | `parts/tactile-led-button/files/SCH_AX22-0050.pdf` | https://www.axiometa.io/cdn/shop/files/SCH_AX22-0050.pdf?v=8768136489227045019 | 64675 bytes |
| model_step | 3D Model | `parts/tactile-led-button/files/AX22-0050.step` | https://www.axiometa.io/cdn/shop/files/AX22-0050.step?v=2148638634877737802 | 1091312 bytes |
| model_glb | 3D Model (GLB) | `parts/tactile-led-button/files/AX22-0050.glb` | https://cdn.shopify.com/3d/models/65cbcf25f47f58b2/AX22-0050.glb | 435684 bytes |

Resolved CAD:
- **step:** `parts/tactile-led-button/files/AX22-0050.step`
- **glb:** `parts/tactile-led-button/files/AX22-0050.glb`
- **schematic:** `parts/tactile-led-button/files/SCH_AX22-0050.pdf`

## Images

### pinout

- **pinout-1:** `parts/tactile-led-button/images/pinout/Pins-00050.png`

### pcb

- **PCB FRONT:** `parts/tactile-led-button/images/pcb/T_0050.png`
- **PCB BACK:** `parts/tactile-led-button/images/pcb/B_0050.png`

### gallery

- **gallery-1:** `parts/tactile-led-button/images/gallery/88_caf0cd14-a709-4280-84b9-672b1a13c0c9.png`
- **gallery-2:** `parts/tactile-led-button/images/gallery/Untitleddesigncopy2_97e58372-b489-4f4a-97c4-1d17300eadcb.png`
- **gallery-3:** `parts/tactile-led-button/images/gallery/89_9063580d-b893-4061-b175-c47be5ddda38.png`
- **gallery-4:** `parts/tactile-led-button/images/gallery/90_297a31bb-4fbc-44df-b91c-f2b238524205.png`

## Arduino Examples

### Example 1

```c
#define BUTTON_PIN 14
#define LED_PIN 41

void setup() {
  Serial.begin(9600);
  pinMode(BUTTON_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  int buttonValue = digitalRead(BUTTON_PIN);

  Serial.print("Button Value: ");
  Serial.println(buttonValue);

  if (buttonValue == LOW) {
    digitalWrite(LED_PIN, HIGH);
  } else {
    digitalWrite(LED_PIN, LOW);
  }

  delay(10);
}
```

## Links

- [Material Datasheet](https://www.lcsc.com/datasheet/C18185600.pdf) (`datasheet`)
- [Circuit Schematic](https://www.axiometa.io/cdn/shop/files/SCH_AX22-0050.pdf?v=8768136489227045019) (`schematic`)
- [3D Model](https://www.axiometa.io/cdn/shop/files/AX22-0050.step?v=2148638634877737802) (`model_step`)
- [3D Model (GLB)](https://cdn.shopify.com/3d/models/65cbcf25f47f58b2/AX22-0050.glb) (`model_glb`)

## Notes

- Kit label: LED Button
- Scraped at: 2026-07-17T15:07:40.096503+00:00
