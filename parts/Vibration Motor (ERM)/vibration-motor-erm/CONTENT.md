# Vibration Motor (ERM)

## Identity
- **slug:** `vibration-motor-erm`
- **sku:** `AX22-0013`
- **role:** `extra_module`
- **source_url:** https://www.axiometa.io/products/vibration-motor-erm
- **price:** $3.99

## Description

This AX22-sized board seats a 12000rpm flat eccentric-rotating-mass (ERM) motor on a 22 × 22 mm PCB and adds a low-R MOSFET driver, so you can trigger crisp haptic feedback with a single active-high GPIO pin. A fly-back diode and bulk capacitor tame startup surges, while the driver lets even 1.8 V logic pull the 90 mA load safely. Snap it into any AX22 backplane to give wearables, control panels, or notification gadgets a silent buzz or rhythmic pulse in just a few lines of code Arduino, MicroPython, or MicroBlocks.

## Technical Details

- 22 mm × 22 mm square
- 4× ⌀2.7 mm Mounting Holes
- 3 V nominal, 90 mA, ≈ 12000 rpm
- −20 °C … +60 °C operating range
- On-board N-channel MOSFET driver & fly-back diode
- 3.3 V, 5.0 V
- Arduino IDE Compatible
- MicroPython Compatible
- MicroBlocks Compatible

## CAD & Technical Files

| kind | label | local_path | source_url | notes |
| --- | --- | --- | --- | --- |
| datasheet | Material Datasheet | `parts/vibration-motor-erm/files/AX22-0013-datasheet.pdf` | https://www.lcsc.com/datasheet/C2759984.pdf | 773563 bytes |
| schematic | Circuit Schematic | `parts/vibration-motor-erm/files/SCH_AX22-0013.pdf` | https://www.axiometa.io/cdn/shop/files/SCH_AX22-0013.pdf?v=10094957708111866119 | 68121 bytes |
| model_step | 3D Model | `parts/vibration-motor-erm/files/AX22-0013.step` | https://www.axiometa.io/cdn/shop/files/AX22-0013.step?v=7433936064696912177 | 1406859 bytes |
| model_glb | 3D Model (GLB) | `parts/vibration-motor-erm/files/AX22-0013.glb` | https://cdn.shopify.com/3d/models/f5ce94663cc645fe/AX22-0013.glb | 750544 bytes |

Resolved CAD:
- **step:** `parts/vibration-motor-erm/files/AX22-0013.step`
- **glb:** `parts/vibration-motor-erm/files/AX22-0013.glb`
- **schematic:** `parts/vibration-motor-erm/files/SCH_AX22-0013.pdf`

## Images

### pinout

- **pinout-1:** `parts/vibration-motor-erm/images/pinout/Pins-0013.png`
- **pinout-2:** `parts/vibration-motor-erm/images/pinout/ERM.gif`

### pcb

- **PCB FRONT:** `parts/vibration-motor-erm/images/pcb/T_0013.png`
- **PCB BACK:** `parts/vibration-motor-erm/images/pcb/B_0013_dd733bcf-be6e-4a50-a3ef-9464f061a9ef.png`

### gallery

- **gallery-1:** `parts/vibration-motor-erm/images/gallery/53_933b61af-df64-4308-8064-40d85c89502f.png`
- **gallery-2:** `parts/vibration-motor-erm/images/gallery/55_1075e29c-82ba-4c79-b48c-1f5aaa93412c.png`
- **gallery-3:** `parts/vibration-motor-erm/images/gallery/54_24b09d87-0bc0-4d97-bbca-9513bdb3391a.png`
- **gallery-4:** `parts/vibration-motor-erm/images/gallery/56_785a61de-5e94-4f36-97d6-3c5040ade9c3.png`

## Arduino Examples

### Example 1

```c
#define MOTOR_PIN 14

void setup() {
  pinMode(MOTOR_PIN, OUTPUT);
}

void loop() {

  // Set the motor pin to the new state
  digitalWrite(MOTOR_PIN, HIGH);
  delay(100);
  digitalWrite(MOTOR_PIN, LOW);
  delay(1000);
}
```

## Links

- [Material Datasheet](https://www.lcsc.com/datasheet/C2759984.pdf) (`datasheet`)
- [Circuit Schematic](https://www.axiometa.io/cdn/shop/files/SCH_AX22-0013.pdf?v=10094957708111866119) (`schematic`)
- [3D Model](https://www.axiometa.io/cdn/shop/files/AX22-0013.step?v=7433936064696912177) (`model_step`)
- [3D Model (GLB)](https://cdn.shopify.com/3d/models/f5ce94663cc645fe/AX22-0013.glb) (`model_glb`)

## Notes

- Scraped at: 2026-07-17T15:07:48.109437+00:00
