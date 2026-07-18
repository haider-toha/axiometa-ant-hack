# Analog Microphone

- **Slug:** `analog-microphone`
- **SKU:** `AX22-0009`
- **Role:** `extra_module`
- **Source:** https://www.axiometa.io/products/analog-microphone
- **Price (scraped):** $4.32

## Description

This AX22-sized module integrates an analog microphone front end built around an MCP6001 rail-to-rail op amp on a compact 22 × 22 mm PCB. The electret microphone is amplified using an inverting amplifier configuration, with an onboard potentiometer that lets you smoothly adjust the gain to match everything from quiet ambient sounds to louder audio sources. The circuit provides a clean, fully analog output voltage that’s easy for microcontrollers, ADCs, or analog signal chains to sample without extra conditioning. It fits seamlessly into AX22 systems with no special wiring and is ideal for sound reactive projects, audio level sensing, or basic audio analysis where a simple, tunable mic amplifier is all you need.

## Technical Details

- 22 mm × 22 mm square
- 4× ⌀2.7 mm Mounting Holes
- On board MCP6001 OpAmp Inverting Amplifier
- 1.8 V, 3.3 V, 5.0 V
- Arduino IDE Compatible
- MicroPython Compatible
- MicroBlocks Compatible

## Links

- [Material Datasheet →](https://www.lcsc.com/datasheet/C233905.pdf) (`datasheet`)
- [Circuit Schematic](https://www.axiometa.io/cdn/shop/files/SCH_AX22-0009.pdf?v=6803923426720387824) (`schematic`)
- [3D Model](https://www.axiometa.io/cdn/shop/files/AX22-0009.step?v=1839462296937432360) (`model_step`)
- [3D Model (GLB)](https://cdn.shopify.com/3d/models/a34c22894b145c89/AX22-0009.glb) (`model_glb`)

## Downloaded Files

- **Material Datasheet →** → `parts/analog-microphone/files/AX22-0009-datasheet.pdf` (43760 bytes)
- **Circuit Schematic** → `parts/analog-microphone/files/SCH_AX22-0009.pdf` (71570 bytes)
- **3D Model** → `parts/analog-microphone/files/AX22-0009.step` (1944527 bytes)
- **3D Model (GLB)** → `parts/analog-microphone/files/AX22-0009.glb` (1100060 bytes)

## Images

- **pinout-1** → `parts/analog-microphone/images/pinout/Pins-0009.png`
- **PCB FRONT** → `parts/analog-microphone/images/pcb/T_0009.png`
- **PCB BACK** → `parts/analog-microphone/images/pcb/B_0009.png`
- **gallery-1** → `parts/analog-microphone/images/gallery/Untitled_design.png`
- **gallery-2** → `parts/analog-microphone/images/gallery/105_e44b7a60-4036-43d7-be44-5fd0bd73328a.png`
- **gallery-3** → `parts/analog-microphone/images/gallery/106_a20fba0e-dab8-411e-8438-8bad67844c01.png`
- **gallery-4** → `parts/analog-microphone/images/gallery/107_cc4d64b2-7307-4695-9fa4-d98c946ab2fc.png`

## Arduino Example Snippets

### Example 1

```c
#define MIC_PIN 1

void setup() {
  Serial.begin(9600);
}

void loop() {
  int micValue = analogRead(MIC_PIN);

  Serial.print("Microphone Value: ");
  Serial.println(micValue);

  delay(10); 
}
```

_Scraped at 2026-07-18T15:01:18.358270+00:00_
