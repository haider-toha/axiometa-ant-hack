# Temperature & Humidity

## Identity
- **slug:** `dht11`
- **sku:** `AX22-0011`
- **role:** `kit_module`
- **source_url:** https://www.axiometa.io/products/dht11
- **price:** $5.43
- **kit_label:** Temperature and Humidity Sensor

## Description

This AX22-sized board drops a trusty DHT11 onto a 22 × 22 mm PCB so you can read ambient temperature and relative humidity with a single-wire digital protocol. A built-in 4.7 kΩ pull-up makes the data line plug-and-play, while the sensor’s 1 Hz refresh rate is perfect for dashboards, smart lamps, or environmental loggers that don’t need sub-second updates. Just issue a read command and your microcontroller—whether you’re coding in the Arduino IDE, MicroPython, or MicroBlocks—gets reasonably accurate (±2 °C / ±5 % RH) climate data in one shot. Snap it into any AX22 backplane and you’ve added reliable local weather sensing to your project with zero fuss.

## Technical Details

- 22 mm × 22 mm square
- 4× ⌀2.7 mm Mounting Holes
- 20 – 90 % RH, ±5 % RH accuracy
- 0 – 50 °C, ±2 °C accuracy
- 1 Hz update rate, single-wire protocol
- On-board 4.7 kΩ pull-up resistor
- 3.3 V, 5.0 V
- Arduino IDE Compatible
- MicroPython Compatible
- MicroBlocks Compatible

## CAD & Technical Files

| kind | label | local_path | source_url | notes |
| --- | --- | --- | --- | --- |
| datasheet | Material Datasheet | _missing_ | https://www.mouser.com/datasheet/2/758/DHT11-Technical-Data-Sheet-Translated-Version-1143054.pdf?srsltid=AfmBOopGwzIebIOjBZM639g2uIRiSslwOytwNg_ymeFo73HOal66dWy_ | download_failed |
| schematic | Circuit Schematic | `parts/dht11/files/SCH_AX22-0011.pdf` | https://www.axiometa.io/cdn/shop/files/SCH_AX22-0011.pdf?v=17251756401384723896 | 62913 bytes |
| model_step | 3D Model | `parts/dht11/files/AX22-0011.step` | https://www.axiometa.io/cdn/shop/files/AX22-0011.step?v=8986039710401718866 | 1009187 bytes |
| model_glb | 3D Model (GLB) | `parts/dht11/files/AX22-0011.glb` | https://cdn.shopify.com/3d/models/f47a787d9ca24716/AX22-0011.glb | 217968 bytes |

Resolved CAD:
- **step:** `parts/dht11/files/AX22-0011.step`
- **glb:** `parts/dht11/files/AX22-0011.glb`
- **schematic:** `parts/dht11/files/SCH_AX22-0011.pdf`

## Images

### pinout

- **pinout-1:** `parts/dht11/images/pinout/Pins-0011.png`

### pcb

- **PCB FRONT:** `parts/dht11/images/pcb/T_0011.png`
- **PCB BACK:** `parts/dht11/images/pcb/B_0011.png`

### gallery

- **gallery-1:** `parts/dht11/images/gallery/Untitled_design_4.png`
- **gallery-2:** `parts/dht11/images/gallery/19_497dc0b4-d6db-43e4-8188-1fdbdca06aff.png`
- **gallery-3:** `parts/dht11/images/gallery/18_d175791f-0f29-43de-80b3-0150f4057c72.png`
- **gallery-4:** `parts/dht11/images/gallery/20_5663a986-6db6-43d0-a555-cc33a52703ba.png`

## Arduino Examples

### Example 1

```c
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <DHT_U.h>

#define DHTPIN 14

#define DHTTYPE DHT11

DHT_Unified dht(DHTPIN, DHTTYPE);

uint32_t delayMS;

void setup() {
  Serial.begin(9600);
  dht.begin();
}

void loop() {
  delay(100);
  sensors_event_t event;
  dht.temperature().getEvent(&event);
  if (isnan(event.temperature)) {
    Serial.println(F("Error reading temperature!"));
  } else {
    Serial.print(F("Temperature: "));
    Serial.print(event.temperature);
    Serial.println(F("°C"));
  }
  // Get humidity event and print its value.
  dht.humidity().getEvent(&event);
  if (isnan(event.relative_humidity)) {
    Serial.println(F("Error reading humidity!"));
  } else {
    Serial.print(F("Humidity: "));
    Serial.print(event.relative_humidity);
    Serial.println(F("%"));
  }
}
```

## Links

- [Material Datasheet](https://www.mouser.com/datasheet/2/758/DHT11-Technical-Data-Sheet-Translated-Version-1143054.pdf?srsltid=AfmBOopGwzIebIOjBZM639g2uIRiSslwOytwNg_ymeFo73HOal66dWy_) (`datasheet`)
- [Circuit Schematic](https://www.axiometa.io/cdn/shop/files/SCH_AX22-0011.pdf?v=17251756401384723896) (`schematic`)
- [3D Model](https://www.axiometa.io/cdn/shop/files/AX22-0011.step?v=8986039710401718866) (`model_step`)
- [3D Model (GLB)](https://cdn.shopify.com/3d/models/f47a787d9ca24716/AX22-0011.glb) (`model_glb`)

## Notes

- Kit label: Temperature and Humidity Sensor
- Download failed for Material Datasheet →: https://www.mouser.com/datasheet/2/758/DHT11-Technical-Data-Sheet-Translated-Version-1143054.pdf?srsltid=AfmBOopGwzIebIOjBZM639g2uIRiSslwOytwNg_ymeFo73HOal66dWy_
- Scraped at: 2026-07-17T15:06:50.241136+00:00
