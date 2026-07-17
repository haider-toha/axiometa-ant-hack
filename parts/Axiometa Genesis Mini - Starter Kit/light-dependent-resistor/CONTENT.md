# Light Dependent Resistor

## Identity
- **slug:** `light-dependent-resistor`
- **sku:** `AX22-0005`
- **role:** `kit_module`
- **source_url:** https://www.axiometa.io/products/light-dependent-resistor
- **price:** $3.39
- **kit_label:** Light Sensor

## Description

This AX22-sized module houses a light-dependent resistor with a dark resistance of 100 kΩ – 200 kΩ on a 22 × 22 mm PCB, yielding an analog voltage that smoothly follows ambient brightness and is effortless for any microcontroller’s ADC to read. It slots straight into AX22 systems with no special wiring, enabling automatic daylight detection, adaptive backlight dimming, or simple light-triggered events in minutes. Ideal for smart lamps, environmental loggers, or interactive installations where responsive, light-aware behavior is essential.

## Technical Details

- 22 mm × 22 mm square
- 4× ⌀2.7 mm Mounting Holes
- 100kΩ to 200kΩ
- 1.8 V, 3.3 V, 5.0 V
- Arduino IDE Compatible
- MicroPython Compatible
- MicroBlocks Compatible

## CAD & Technical Files

| kind | label | local_path | source_url | notes |
| --- | --- | --- | --- | --- |
| datasheet | Material Datasheet | `parts/light-dependent-resistor/files/AX22-0005-datasheet.pdf` | https://www.lcsc.com/datasheet/C11298.pdf | 42350 bytes |
| schematic | Circuit Schematic | `parts/light-dependent-resistor/files/SCH_AX22-0005.pdf` | https://www.axiometa.io/cdn/shop/files/SCH_AX22-0005.pdf?v=900061831112363715 | 59768 bytes |
| model_step | 3D Model | `parts/light-dependent-resistor/files/AX22-0005.step` | https://www.axiometa.io/cdn/shop/files/AX22-0005.step?v=1777086175554242781 | 620109 bytes |
| model_glb | 3D Model (GLB) | `parts/light-dependent-resistor/files/AX22-0005.glb` | https://cdn.shopify.com/3d/models/c91318eef8d3951b/AX22-0005.glb | 224192 bytes |

Resolved CAD:
- **step:** `parts/light-dependent-resistor/files/AX22-0005.step`
- **glb:** `parts/light-dependent-resistor/files/AX22-0005.glb`
- **schematic:** `parts/light-dependent-resistor/files/SCH_AX22-0005.pdf`

## Images

### pinout

- **pinout-1:** `parts/light-dependent-resistor/images/pinout/Pins-0005.png`

### pcb

- **PCB FRONT:** `parts/light-dependent-resistor/images/pcb/T_0005.png`
- **PCB BACK:** `parts/light-dependent-resistor/images/pcb/B_0005.png`

### gallery

- **gallery-1:** `parts/light-dependent-resistor/images/gallery/Untitled_design_10.png`
- **gallery-2:** `parts/light-dependent-resistor/images/gallery/15_ed659ee0-6d19-4156-92a3-a6e64377292a.png`
- **gallery-3:** `parts/light-dependent-resistor/images/gallery/14_1856c9cd-cd7a-4de9-b6ff-e978c0501ee5.png`
- **gallery-4:** `parts/light-dependent-resistor/images/gallery/16_d7323025-4e52-481b-8ade-ff1a8033c725.png`

## Arduino Examples

### Example 1

```c
#define LDR_PIN 1

void setup() {
  Serial.begin(9600);
}

void loop() {
  int ldrValue = analogRead(LDR_PIN);

  Serial.print("LDR Value: ");
  Serial.println(ldrValue);

  delay(10);
}
```

## Links

- [Material Datasheet](https://www.lcsc.com/datasheet/C11298.pdf) (`datasheet`)
- [Circuit Schematic](https://www.axiometa.io/cdn/shop/files/SCH_AX22-0005.pdf?v=900061831112363715) (`schematic`)
- [3D Model](https://www.axiometa.io/cdn/shop/files/AX22-0005.step?v=1777086175554242781) (`model_step`)
- [3D Model (GLB)](https://cdn.shopify.com/3d/models/c91318eef8d3951b/AX22-0005.glb) (`model_glb`)

## Notes

- Kit label: Light Sensor
- Scraped at: 2026-07-17T15:07:45.179380+00:00
