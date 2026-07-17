# Axiometa Parts Catalog

Structured scrape of the Genesis Mini Starter Kit contents plus extra modules.
Each part folder has `part.json` (machine-readable) and `CONTENT.md` (LLM-friendly).

- Kit: https://www.axiometa.io/products/axiometa-genesis-mini-starter-kit
- Scraped: 2026-07-17T15:07:48.596769+00:00

## Kit contents (Learn More)

- **Axiometa Genesis Mini** → https://www.axiometa.io/products/axiometa-genesis-mini
- **Temperature and Humidity Sensor** → https://www.axiometa.io/products/dht11
- **0.96" Screen** → https://www.axiometa.io/products/ips-lcd-0-96
- **LED Button** → https://www.axiometa.io/products/tactile-led-button
- **Rotary Encoder** → https://www.axiometa.io/products/rotary-encoder
- **5x5 LED Matrix** → https://www.axiometa.io/products/neopixel-matrix-5x5
- **Passive Buzzer** → https://www.axiometa.io/products/passive-buzzer
- **Light Sensor** → https://www.axiometa.io/products/light-dependent-resistor
- **Remote Transceiver** → https://www.axiometa.io/products/ir-transceiver
- **Full access to Genesis Studio** → https://studio.axiometa.io/

## Parts

- [`axiometa-genesis-mini-starter-kit`](parts/axiometa-genesis-mini-starter-kit/CONTENT.md) — Axiometa Genesis Mini - Starter Kit (`AXMT-BUN0001`, kit_bundle)
- [`axiometa-genesis-mini`](parts/axiometa-genesis-mini/CONTENT.md) — Axiometa Genesis Mini (`AXMT-MTX0013`, kit_module) [STEP, GLB, SCH]
- [`dht11`](parts/dht11/CONTENT.md) — Temperature & Humidity (`AX22-0011`, kit_module) [STEP, GLB, SCH]
- [`ips-lcd-0-96`](parts/ips-lcd-0-96/CONTENT.md) — IPS LCD Display (0.96) (`AX22-0034`, kit_module) [STEP, GLB, SCH]
- [`tactile-led-button`](parts/tactile-led-button/CONTENT.md) — Tactile Led Button (`AX22-0050`, kit_module) [STEP, GLB, SCH]
- [`rotary-encoder`](parts/rotary-encoder/CONTENT.md) — Rotary Encoder (`AX22-0003`, kit_module) [STEP, GLB, SCH]
- [`neopixel-matrix-5x5`](parts/neopixel-matrix-5x5/CONTENT.md) — NeoPixel Matrix (5x5) (`AX22-0028`, kit_module) [STEP, GLB, SCH]
- [`passive-buzzer`](parts/passive-buzzer/CONTENT.md) — Passive Buzzer (`AX22-0018`, kit_module) [STEP, GLB, SCH]
- [`light-dependent-resistor`](parts/light-dependent-resistor/CONTENT.md) — Light Dependent Resistor (`AX22-0005`, kit_module) [STEP, GLB, SCH]
- [`ir-transceiver`](parts/ir-transceiver/CONTENT.md) — IR Transceiver (`AX22-0040`, kit_module) [STEP, GLB, SCH]
- [`genesis-studio`](parts/genesis-studio/CONTENT.md) — Axiometa Studio (`n/a`, kit_software)
- [`vibration-motor-erm`](parts/vibration-motor-erm/CONTENT.md) — Vibration Motor (ERM) (`AX22-0013`, extra_module) [STEP, GLB, SCH]

## LLM usage

See **[`LLM_README.md`](LLM_README.md)** for the full corpus guide (kit vs extra module, scrape scope, DHT11 datasheet gap).

1. Start with `INDEX.md` / `manifest.json` (or compact `catalog.json`) for the inventory.
2. Open `parts/<slug>/CONTENT.md` for human-readable facts.
3. Use `parts/<slug>/files/` for CAD (STEP/ZIP/GLB) and schematics (PDF).
4. Pinout / PCB images live under `parts/<slug>/images/`.
