# IR Transceiver

## Identity
- **slug:** `ir-transceiver`
- **sku:** `AX22-0040`
- **role:** `kit_module`
- **source_url:** https://www.axiometa.io/products/ir-transceiver
- **price:** $4.49
- **kit_label:** Remote Transceiver

## Description

This AX22 module combines both IR transmission and reception on a single compact 22 × 22 mm board, enabling full two-way infrared communication. It features the IR26-61C/L302/TR8 SMD infrared LED for reliable 940 nm signal transmission and the IRM-V538M3/TR1 38 kHz IR receiver for clean, demodulated signal input resistant to ambient light and interference. Two onboard status LEDs, one for TX and one for RX, provide immediate visual feedback. Ideal for remote control learning, IR device emulation, wireless communication between boards, or gesture-based control. Compatible with Arduino IRremote, MicroPython pulse handling, or MicroBlocks IR blocks with no additional components required.

## Technical Details

- 22 mm × 22 mm square
- 4 × ⌀2.7 mm mounting holes
- 940 nm IR LED (transmitter side)
- 38 kHz carrier, demodulated digital output (receiver side)
- Two status LEDs (TX and RX activity)
- 3.3 V and 5.0 V logic compatible
- Typical range up to 30 m indoors (line-of-sight)
- High ambient-light immunity and AGC filtering
- Arduino IDE compatible
- MicroPython compatible
- MicroBlocks compatible

## CAD & Technical Files

| kind | label | local_path | source_url | notes |
| --- | --- | --- | --- | --- |
| datasheet | Material Datasheet | `parts/ir-transceiver/files/AX22-0040-datasheet.pdf` | https://www.everlighteurope.com/custom/files/datasheets/DMO-0000605.pdf | 566658 bytes |
| schematic | Circuit Schematic | `parts/ir-transceiver/files/SCH_AX22-0040.pdf` | https://www.axiometa.io/cdn/shop/files/SCH_AX22-0040.pdf?v=1459990359366866787 | 65390 bytes |
| model_step | 3D Model | `parts/ir-transceiver/files/AX22-0040.step` | https://www.axiometa.io/cdn/shop/files/AX22-0040.step?v=14903371810998361765 | 1476561 bytes |
| model_glb | 3D Model (GLB) | `parts/ir-transceiver/files/AX22-0040.glb` | https://cdn.shopify.com/3d/models/cb947a3ccaa96aec/AX22-0040.glb | 509844 bytes |

Resolved CAD:
- **step:** `parts/ir-transceiver/files/AX22-0040.step`
- **glb:** `parts/ir-transceiver/files/AX22-0040.glb`
- **schematic:** `parts/ir-transceiver/files/SCH_AX22-0040.pdf`

## Images

### pinout

- **pinout-1:** `parts/ir-transceiver/images/pinout/Pins-0040.png`

### pcb

- **PCB FRONT:** `parts/ir-transceiver/images/pcb/T_0040.png`
- **PCB BACK:** `parts/ir-transceiver/images/pcb/B_0040.png`

### gallery

- **gallery-1:** `parts/ir-transceiver/images/gallery/Untitleddesigncopy_840c998e-6571-495c-924b-2acf695630e9.png`
- **gallery-2:** `parts/ir-transceiver/images/gallery/138.png`
- **gallery-3:** `parts/ir-transceiver/images/gallery/139.png`
- **gallery-4:** `parts/ir-transceiver/images/gallery/140.png`

## Arduino Examples

### Example 1

```c
#include "esp32-rmt-ir.h"  //by junkfix

#define RX_PIN 41  // IR receiver pin
#define TX_PIN 14  // IR transmitter pin

#define IR_BRAND NEC        // Options: NEC, SONY, SAMSUNG, RC5, RC6, etc.
#define IR_CODE 0xC1AAFC03  // Your hex code
#define IR_BITS 32          // Number of bits
#define SEND_INTERVAL 1000  // Milliseconds between sends

void irReceived(irproto brand, uint32_t code, size_t len, rmt_symbol_word_t *item) {
  if (code) {
    Serial.printf("IR %s, code: %#x, bits: %d\n", proto[brand].name, code, len);
  }

  if (true) {  // debug
    Serial.printf("Rx%d: ", len);
    for (uint8_t i = 0; i < len; i++) {
      int d0 = item[i].duration0;
      if (!item[i].level0) { d0 *= -1; }
      int d1 = item[i].duration1;
      if (!item[i].level1) { d1 *= -1; }
      Serial.printf("%d,%d ", d0, d1);
    }
    Serial.println();
  }
}

void setup() {
  Serial.begin(115200);
  irRxPin = RX_PIN;
  irTxPin = TX_PIN;
  xTaskCreatePinnedToCore(recvIR, "recvIR", 4096, NULL, 10, NULL, 1);

  Serial.printf("\nSending %s code: %#x every %d ms\n",
                proto[IR_BRAND].name, IR_CODE, SEND_INTERVAL);
}

void loop() {
  sendIR(IR_BRAND, IR_CODE, IR_BITS, 1, 1);
  delay(SEND_INTERVAL);
}
```

## Links

- [Material Datasheet](https://www.everlighteurope.com/custom/files/datasheets/DMO-0000605.pdf) (`datasheet`)
- [Circuit Schematic](https://www.axiometa.io/cdn/shop/files/SCH_AX22-0040.pdf?v=1459990359366866787) (`schematic`)
- [3D Model](https://www.axiometa.io/cdn/shop/files/AX22-0040.step?v=14903371810998361765) (`model_step`)
- [3D Model (GLB)](https://cdn.shopify.com/3d/models/cb947a3ccaa96aec/AX22-0040.glb) (`model_glb`)

## Notes

- Kit label: Remote Transceiver
- Scraped at: 2026-07-17T15:07:46.165518+00:00
