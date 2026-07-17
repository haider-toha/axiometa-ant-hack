# 03 — Track 3: Parts Truth

**Type:** Phase 1 research track (parts corpus audit)
**Date:** 2026-07-17
**Author:** Track 3 (Parts Truth)
**Scope of authority:** The `parts/` corpus is the source of truth. Web citations used only
to fill gaps the corpus is silent on (one TI part rating). Local corpus wins on any conflict.
**Constraint honoured:** No dimension, port number, pin assignment, or electrical value is
invented. Anything not extractable from the corpus / STEP / datasheet is marked **UNKNOWN**
with a "how to get it" note. No firmware written; no enclosure geometry authored.

---

## Scope

Resolve the hardware ground truth for the locked build (Genesis Mini + 2× ERM motor + 0.96"
LCD + rotary encoder, on-wrist, USB-tethered). Deliver: BOM (used vs owned-unused); the AX22
port map and per-interface pin assignments; the "8 ports vs 4 ports" resolution; the
encoder-GPIO reality; electrical limits and the USB power-budget verdict; CAD-critical
measured geometry; firmware pin/boot caveats; and a CAD-input checklist of unknowns.

**Residual-risk items routed here (from `00-grilling-locked-decisions.md`):**
encoder-GPIO reality • ERM current vs USB budget • port-count 4-vs-8. All three resolved below.

### Sources used (every number in this file traces to one of these)
| Tag | File |
|---|---|
| `[board CONTENT]` / `[board json]` | `parts/…/axiometa-genesis-mini/CONTENT.md` / `part.json` |
| `[kit CONTENT]` | `parts/…/axiometa-genesis-mini-starter-kit/CONTENT.md` (+ `catalog.json`) |
| `[SCH board]` | `parts/…/axiometa-genesis-mini/files/SCH_MTX0013.pdf` (KiCad, "Axiometa Genesis — Mini", Rev 1, 2026‑02‑19) |
| `[silk back]` | `parts/…/axiometa-genesis-mini/images/gallery/2BACK_MTX0013.png` (PINOUTS legend) |
| `[render top]` | `parts/…/axiometa-genesis-mini/images/gallery/IMG_6063_*.png` (4 sockets, silk 1–4) |
| `[MCU DS]` | `parts/…/axiometa-genesis-mini/files/AXMT-MTX0013-datasheet.pdf` (ESP32‑S3‑MINI‑1 & 1U DS v1.7) |
| `[guide]` | `parts/…/axiometa-genesis-mini/guides/getting-started-guide.md` |
| `[ERM CONTENT]` | `parts/Vibration Motor (ERM)/vibration-motor-erm/CONTENT.md` / `part.json` |
| `[ERM pins]` | `parts/…/vibration-motor-erm/images/pinout/Pins-0013.png` |
| `[LCD CONTENT]` | `parts/…/ips-lcd-0-96/CONTENT.md` / `part.json` |
| `[LCD pins]` | `parts/…/ips-lcd-0-96/images/pinout/Pins-0034.png` |
| `[ENC CONTENT]` | `parts/…/rotary-encoder/CONTENT.md` / `part.json` |
| `[ENC pins]` | `parts/…/rotary-encoder/images/pinout/Pins-0003.png` |
| `[STEP bbox]` | point‑cloud bounding boxes parsed from the `.step` files (method noted where used) |
| `[TI]` | ti.com/product/TLV62569 (buck rating; not in corpus) |

---

## Verdicts / evidence

### 1. BOM — used vs owned-but-unused

| Role | Part | SKU | Qty | Interface (this build) | CAD assets |
|---|---|---|---:|---|---|
| **USED** | Genesis Mini board | AXMT‑MTX0013 | 1 | host (ESP32‑S3) | STEP(zip)+GLB+SCH |
| **USED** | Vibration Motor (ERM) | AX22‑0013 | 2 | 1× active‑high GPIO each | STEP+GLB+SCH |
| **USED** | IPS LCD 0.96" | AX22‑0034 | 1 | 4‑wire SPI (shared bus + 3 GPIO) | STEP+GLB+SCH |
| **USED** | Rotary Encoder | AX22‑0003 | 1 | raw quadrature + button (3 GPIO) | STEP+GLB+SCH |
| Owned, unused | Tactile LED Button | AX22‑0050 | 1 | — (see note ★) | STEP+GLB+SCH |
| Owned, unused | NeoPixel Matrix 5×5 | AX22‑0028 | 1 | — | STEP+GLB+SCH |
| Owned, unused | Passive Buzzer | AX22‑0018 | 1 | — | STEP+GLB+SCH |
| Owned, unused | DHT11 temp/humidity | AX22‑0011 | 1 | — | GLB+SCH (datasheet dl failed) |
| Owned, unused | Light Dependent Resistor | AX22‑0005 | 1 | — | STEP+GLB+SCH |
| Owned, unused | IR Transceiver | AX22‑0040 | 1 | — | STEP+GLB+SCH |
| Software | Genesis Studio (prompt‑to‑firmware IDE) | n/a | — | — | none |

Source: `[kit CONTENT]`, `catalog.json`, per‑part `CONTENT.md`. The ERM is scraped as an
`extra_module` (role in corpus), **not** listed in the kit "what's inside," but it is the
confirmed haptic actuator for this build and treated as in‑BOM per project decision.

**★ Onboard peripherals (no port cost)** `[silk back]` `[board json]`: the board carries an
**onboard user button = GPIO45**, a **BOOT button = GPIO0**, a **RESET (EN)** button, an
**onboard RGB NeoPixel = GPIO21**, and an **ACT LED = GPIO37** (`ACT_LED 37` in `[board json]`
example). Grilling decision 6 ("LED button = repeat last message") can therefore be served by
the **onboard GPIO45 user button** — it does **not** require the AX22 Tactile LED Button module
and does **not** consume a 5th port. This removes an internal contradiction (decision 6 named a
button while the port map had zero spare).

**Not owned / excluded** (from `idea.md` "Not buying," none present in corpus): INMP441 mic;
Analog Microphone module AX22‑0009; AX22 Port Extension Kit; bare motors/solder supplies.
These SKUs are **not in the corpus** and cannot be spec‑verified here (nor need they be).

---

### 2. Port count ruling — **4 ports (not 8)**

**RULING: the Genesis Mini has exactly 4 AX22 ports.** The kit‑copy "eight" is an erroneous
marketing string, almost certainly inherited from the larger *GENESIS One* sibling board.

| Evidence | Says | Weight |
|---|---|---|
| `[kit CONTENT]` bundle page | "provides **eight** AX22 ports" | SUSPECT (bundle marketing copy; the only "8") |
| `[board CONTENT]`/`[board json]` | "provides **four** AX22 ports" | board‑specific product copy |
| `[SCH board]` | Exactly **4** `AX22‑Module` connectors: **U1, U2, U3, U4** | **authoritative (schematic)** |
| `[render top]` | **4** physical 2×5 sockets, silk‑screened **1, 2, 3, 4** | **authoritative (physical board)** |
| `[guide]` | Refers to inserting a module into "**port 7**" / `P7_IO0` | that guide targets *GENESIS One* (8‑port), explaining where "8" leaked from |

Three independent board‑specific sources (product copy + schematic + photographed hardware)
agree on **4**; only the bundle blurb says 8. Conflict resolved in favour of 4. `idea.md`'s
port count (4) is **correct**; the standing "8 suspect / Mini truth is 4" instruction is upheld.

---

### 3. AX22 port map & interface table

**AX22 connector = 10‑pin, 2×5 header.** Pin→net mapping is identical on all four ports for
pins 1,2,6–10 (shared) and port‑specific for pins 3–5. From `[SCH board]`, cross‑checked to
`[silk back]` PINOUTS legend and the module pinout images.

| Pin | Module‑side label | Board net / GPIO | Class |
|---:|---|---|---|
| 1 | G | GND | power |
| 2 | Vin / Vcc | **+3V3** | power (3.3 V rail) |
| 3 | IO0 / ADC | *port‑specific* | **dedicated GPIO** |
| 4 | IO1 / CS / PWM / Rx | *port‑specific* | **dedicated GPIO** |
| 5 | IO2 / Rx | *port‑specific* | **dedicated GPIO** |
| 6 | MOSI | **GPIO12** | shared SPI (all ports) |
| 7 | MISO | **GPIO13** | shared SPI (all ports) |
| 8 | SCK | **GPIO14** | shared SPI (all ports) |
| 9 | SDA | **GPIO10** | shared I²C (all ports) |
| 10 | SCL | **GPIO11** | shared I²C (all ports) |

Shared‑bus GPIO numbers are **triple‑confirmed**: `[SCH board]` (all 4 connectors show
IO12/IO13/IO14/IO10/IO11 on pins 6–10) **and** `[silk back]` legend ("12‑MOSI, 13‑MISO,
14‑SCK, 10‑SDA, 11‑SCL").

**Per‑port dedicated GPIO (pins 3/4/5), from `[SCH board]`:**

| Port (silk) | Sch ref | Pin 3 (IO0/ADC) | Pin 4 (IO1/CS/PWM/Rx) | Pin 5 (IO2/Rx) |
|---:|---|---|---|---|
| **1** | U1 | GPIO4 | GPIO3 ⚠ | GPIO2 |
| **2** | U2 | GPIO7 | GPIO6 | GPIO5 |
| **3** | U3 | GPIO9 | GPIO16 | GPIO15 |
| **4** | U4 | GPIO1 | GPIO17 | GPIO18 |

⚠ GPIO3 (Port 1, pin 4) is an ESP32‑S3 **strapping pin** — see Firmware constraints §7.
Port silk numbers were matched to U‑designators via `[render top]` (silk "4" carries IO17/IO18;
silk "3" carries IO15/IO16 — matching U4/U3 in the schematic).

**Key structural fact:** each port exposes **3 dedicated GPIO** (not "a" single GPIO), **plus**
the shared SPI bus (MOSI/MISO/SCK) **and** shared I²C bus (SDA/SCL), **plus** 3V3/GND. This is
richer than `idea.md`'s "shared I²C + one dedicated GPIO" description (see What changed §A).

**Also available (not an AX22 port):** STEMMA QT connector J18 `[SCH board]` = 3V3/GND +
SDA(GPIO10)/SCL(GPIO11) — the **same** I²C bus as the AX22 pins 9/10. A future I²C peripheral
could hang here **without** consuming an AX22 port. Unused in this build.

**Module → interface → port assignment (this build):**

| Module | Bus/interface | Pins it actually uses | Ports |
|---|---|---|---:|
| ERM motor #1 | 1× active‑high GPIO ("D"/Data = pin 3, IO0) + Vin + GND `[ERM pins]` | Data, Vin, G | 1 |
| ERM motor #2 | same | Data, Vin, G | 1 |
| LCD (ST7735S) | **4‑wire SPI**: shared MOSI(12)+SCK(14) + dedicated **CS**(pin3), **RST**(pin4), **DC**(pin5) + **BL** backlight `[LCD pins]` | SI, CK, CS, RST, DC, BL, 3V3, G | 1 |
| Rotary encoder | **raw quadrature + button**: **BT**(pin3), **CL/A**(pin4), **DT/B**(pin5) `[ENC pins]` | BT, CL, DT, Vin, G | 1 |
| | | **Total** | **4 / 4** |

All 4 ports consumed, **zero spare** — consistent with the locked plan. Note the LCD and ERM
share the SPI/I²C buses harmlessly (motors and encoder don't touch them; the LCD is the only
SPI device, so no CS contention). **The shared I²C bus (SDA/SCL) is entirely unused** in this
build — no chosen module is I²C.

---

### 4. Encoder‑GPIO reality — **RESOLVED: raw quadrature, fits one port**

**Finding:** the rotary encoder is a **raw incremental quadrature module (ALPS EC11L1525G01),
NOT an I²C module.** It needs **3 GPIO** — channel A, channel B, and the push‑button — and a
single AX22 port provides exactly **3 dedicated GPIO (pins 3/4/5)**. **One port is sufficient.**

Evidence:
- `[ENC pins]` header, top→bottom: **G, Vin, BT (Button), CL (Clock/ch A), DT (Data/ch B)** →
  BT/CL/DT land on pins 3/4/5 (the 3 dedicated GPIO).
- `[ENC CONTENT]` description: "clean two‑channel **quadrature** signals plus an optional
  push‑switch"; Arduino example uses three pins (`PIN_BT`, `PIN_CL`, `PIN_DT`) with
  `RotaryEncoder encoder(PIN_CL, PIN_DT, …)` + `digitalRead(PIN_BT)`.
- Encoder logic levels: 1.8 V / 3.3 V / 5.0 V `[ENC CONTENT]` (works on the 3V3 rail).

The Medium‑severity risk "one AX22 port may not expose enough GPIO for a quadrature encoder"
is **retired**: the port exposes 3 dedicated GPIO; the encoder consumes exactly those 3. Both
quadrature channels (CL/DT) and the button (BT) are ordinary GPIO; all ESP32‑S3 GPIO are
interrupt‑capable, so hardware‑interrupt or PCNT‑based decoding is available.

---

### 5. Electrical limits

| Item | Value | Source |
|---|---|---|
| **ERM motor, current** | **90 mA** (3 V nominal, ≈12 000 rpm) per motor | `[ERM CONTENT]`/`[ERM json]` ("3 V nominal, 90 mA") |
| ERM drive | Single **active‑high GPIO**, onboard **N‑ch MOSFET driver + fly‑back diode + bulk cap**; "even 1.8 V logic can pull the 90 mA load" | `[ERM CONTENT]` |
| ERM logic levels | 3.3 V / 5.0 V supported; on Mini the Vin pin = **3V3** rail | `[ERM CONTENT]` + `[SCH board]` (AX22 Vcc = +3V3) |
| ERM inrush | Startup surge **tamed by onboard fly‑back diode + bulk capacitor** (magnitude not stated) | `[ERM CONTENT]` — exact inrush **UNKNOWN** |
| **LCD supply** | **3.3 V** | `[LCD CONTENT]` |
| **LCD backlight** | single white LED, **≈20 mA @ 3 V** | `[LCD CONTENT]` |
| LCD controller | ST7735S, 4‑wire SPI ≤ ~10 MHz; controller active current **not stated** | `[LCD CONTENT]` — ≈ few mA, **UNKNOWN exact** |
| **Encoder** | passive quadrature + switch → **negligible** (pull‑up currents only) | `[ENC CONTENT]` (no active draw listed) |
| **ESP32‑S3 Wi‑Fi TX peak** | **355 mA** (802.11b @20.5 dBm); 297/286/285 mA for g/n | `[MCU DS]` Table 6‑4 |
| ESP32‑S3 Wi‑Fi RX | 95–97 mA | `[MCU DS]` Table 6‑4 |
| ESP32‑S3 modem‑sleep | ~13–108 mA depending on freq/cores | `[MCU DS]` Table 6‑6 |
| ESP32‑S3 supply | VDD33 **3.0 / 3.3 / 3.6 V** (min/typ/max); external supply must deliver **≥ 0.5 A** | `[MCU DS]` Table 6‑2 (I_VDD min = 0.5 A) |
| GPIO drive | I_OH ≈ 40 mA / I_OL ≈ 28 mA typ (PAD_DRIVER=3); weak pull‑up/down ≈ 45 kΩ | `[MCU DS]` Table 6‑3 |
| **Onboard 3V3 buck** | **TLV62569DBV** (U8), **2 A** max output, 2.5–5.5 V in | `[SCH board]` (part id) + `[TI]` (rating; not in corpus) |
| Board power path | USB‑C (P1) → polyfuse (F1) → LM66100 ideal‑diode OR‑ing vs 3×AA battery (V_BAT) → TLV62569 buck → 3V3 | `[SCH board]` |

#### Power-budget verdict — **ADEQUATE (with a ≥1 A USB source; a bare 500 mA port is marginal-but-workable)**

Worst‑case **simultaneous** 3V3‑rail load (Wi‑Fi TX burst coinciding with both motors + screen):

| Load | Peak |
|---|---:|
| ESP32‑S3 Wi‑Fi TX peak `[MCU DS]` | 355 mA |
| 2× ERM, both firing in one beat (2×90 mA) `[ERM CONTENT]` | 180 mA |
| LCD (backlight‑dominated) `[LCD CONTENT]` | ~20–25 mA |
| Onboard NeoPixel/LEDs (if lit) | ~0–20 mA |
| Encoder | ~0 |
| **Worst‑case total** | **≈ 560–580 mA** |

- **Supply side is not the buck.** The onboard TLV62569 delivers up to **2 A** `[TI]` at 3V3 —
  ~3.5× the peak. The regulator is comfortably oversized.
- **The binding constraint is the USB source current**, because the buck steps 5 V→3.3 V:
  - **Battery bank / USB‑C wall charger (typical 5 V @ 1–3 A = 5–15 W):** → ~1.3–4 A available
    at 3V3. **Ample headroom.** The locked plan ("USB tether to a battery bank / laptop")
    lands here for any real power bank.
  - **Bare USB‑2.0 laptop port (unnegotiated 5 V @ 500 mA = 2.5 W):** → only ~0.6–0.68 A at
    3V3 after buck loss. That's **just above** the ~0.58 A peak — **marginal**. It works
    because motor and Wi‑Fi‑TX peaks are brief and are buffered by the board's bulk caps
    (C1 10 µF, C4 100 nF, C13 10 µF, C14 22 µF `[SCH board]`), but there is little margin.
- The ESP32‑S3 datasheet's own **I_VDD ≥ 0.5 A** requirement (`[MCU DS]` Table 6‑2) already
  demands a ≥0.5 A rail for the module alone; +180 mA of motors pushes the recommended source
  to **≥ ~0.7 A**, i.e. any ordinary power bank.

**Recommendation for the demo:** power from a **≥1 A (≥5 W) USB source** (power bank or wall
charger), not a laptop port, for comfortable margin. This is a soft recommendation, not a
blocker — the budget closes. Medium‑severity risk "2× ERM vs USB budget with screen+encoder"
is **retired** with that caveat.

---

### 6. CAD-critical geometry

**Method note.** build123d/OCP are not installed in this environment, so STEP solids were not
loaded through the CAD kernel. Instead: (a) PCB **footprints** are taken from the corpus tech
text (authoritative, matches the schematic/renders); (b) **heights/stack‑ups** are estimated
from **point‑cloud bounding boxes** of the `.step` files (`CARTESIAN_POINT` min/max +
Z‑histograms). STEP units are **millimetres** (`SI_UNIT(.MILLI.,.METRE.)` in every file header).
**The module `.step` files (ERM, LCD) contain embedded annotation/leader geometry** that
inflates their raw X/Y point spans (the LCD file spans a nonsensical 315 mm in X), so module
**footprints are quoted from corpus, not from STEP bbox.** The board and encoder STEPs are
clean (board X/Y = 55.00×55.00; encoder X/Y = 22.0×22.4). Height numbers below are marked
**[approx]** where they come from the noisy point cloud.

| Feature | Value | Confidence / source |
|---|---|---|
| **Board PCB outline** | **55.0 × 55.0 mm**, square, 4‑layer | HIGH — `[board CONTENT]` **and** `[STEP bbox]` (X/Y span 55.00) |
| Board PCB thickness | ~1.6 mm (dense STEP planes at Z≈0 and Z≈1.6) | MED [approx] `[STEP bbox]`; corpus says "4‑layer," no thickness → confirm |
| Board mounting holes | **4× ⌀2.7 mm**, one near each corner | HIGH count `[board CONTENT]`; exact X/Y centres **UNKNOWN** → measure |
| Board Z‑envelope (point cloud) | ~20.5 mm total span (Z −10.25…+10.25) | LOW [approx] `[STEP bbox]` — spans both sides; see note |
| — top side (sockets/USB‑C/buttons) | up to ~8–9 mm above PCB top | LOW [approx] `[STEP bbox]` |
| — bottom side | down to ~10 mm below (battery‑holder / connector region) | LOW [approx] `[STEP bbox]` — **confirm what occupies −Z** |
| **AX22 ports** | **4 ports**, 2×5 sockets, arranged in a **2×2 cluster** in the board centre, silk 1–4; sockets face **+Z (up)** | HIGH layout `[render top]`; exact port centre coords **UNKNOWN** → measure |
| AX22 socket height (female, on board) | ~8–9 mm above PCB | LOW [approx] `[render top]` + module pin length; **UNKNOWN precise** → measure |
| AX22 connector pitch | 2×5; pitch **UNKNOWN** (2.0 vs 2.54 mm) | **UNKNOWN** → measure from STEP/calipers |
| Module→board mated standoff | ~8–9 mm (= socket height; module pins insert ~3 mm) | LOW [approx] — **UNKNOWN precise** → measure |
| USB‑C port | on one board edge, mid‑mount (programming + power) | HIGH `[silk back]`/`[render top]`; edge offset **UNKNOWN** → measure |
| Battery input | JST "3× AA/AAA" (G / V+) on board; external holder | `[silk back]`; not used (USB‑powered) |
| **ERM module PCB** | **22 × 22 mm**, square | HIGH `[ERM CONTENT]` |
| ERM mounting holes | 4× ⌀2.7 mm | HIGH `[ERM CONTENT]` |
| ERM motor protrusion (skin‑contact‑critical) | flat coin motor ~**3.5–4 mm** proud of PCB top face | LOW [approx] `[STEP bbox]` Z; **confirm with calipers** — this is the haptic coupling height |
| ERM connector‑pin protrusion below PCB | ~3 mm | LOW [approx] `[STEP bbox]` |
| **LCD module PCB** | **22 × 29 mm** | HIGH `[LCD CONTENT]` |
| LCD active area | **10.8 × 21.7 mm** | HIGH `[LCD CONTENT]` |
| LCD glass size | **13.5 × 27.9 mm** | HIGH `[LCD CONTENT]` |
| LCD resolution | 160 × 80 px, IPS, ~400 cd/m² | HIGH `[LCD CONTENT]` |
| LCD panel height above PCB | ~2–4 mm | LOW [approx] `[STEP bbox]`; **confirm** |
| LCD mounting holes | 4× ⌀2.7 mm | HIGH `[LCD CONTENT]` |
| **Encoder module PCB** | **22 × 22 mm** | HIGH `[ENC CONTENT]` **and** `[STEP bbox]` (22.0×22.4) |
| **Encoder shaft height** | shaft tip ~**20 mm** above PCB (metal body ~9 mm; total part Z ≈ 27 mm) | MED `[STEP bbox]` (clean file) — **tallest module; needs ~20 mm knob clearance + access hole** |
| Encoder mounting holes | 4× ⌀2.7 mm | HIGH `[ENC CONTENT]` |

**CAD takeaways:** the enclosure must clear a **~20 mm rotary shaft** (encoder is by far the
tallest module) with an outward‑facing knob; the **ERM coin motor sits only ~3.5–4 mm proud**
(low‑profile, good for skin contact, but note motors seat on the **board‑top +Z** side, so the
"press motor to skin" requirement is a coupling/orientation problem for the CAD phase, not a
part limitation); the board is a **55×55 mm square with 4× ⌀2.7 mm corner holes**; all four
modules are **22 mm‑wide** with **4× ⌀2.7 mm holes** each. Precise connector centres, socket
height, pitch, and hole coordinates are UNKNOWN (see checklist §9).

---

### 7. Firmware constraints (pin/port realities & getting‑started caveats)

1. **Board select:** in Arduino IDE choose **"Axiometa Genesis Mini"** (the guide lists both
   "GENESIS One" and "Genesis Mini") `[guide]`. The Genesis Arduino library exposes pins as
   **`P<port>_IO<n>`** macros with pin defs built in (e.g. `P4_IO0`) `[guide]`.
2. **The product‑page Arduino examples use pin numbers that are NOT the Mini's map.** The LCD
   example (`MOSI 11, SCLK 13, CS 1, DC 41, RST 14`), the ERM example (`MOTOR_PIN 14`), and the
   encoder example (`BT 1, CL 14, DT 41`) reuse a generic `{1,14,41}`+`{11,13}` set that does
   **not** match the Mini schematic (Mini shared SPI = **MOSI 12 / SCK 14**; per‑port dedicated
   pins are 4/3/2, 7/6/5, 9/16/15, 1/17/18). The guide's "insert into **port 7** / `P7_IO0`"
   shows those examples target the 8‑port **GENESIS One**. **On the Mini, derive pins from
   `[SCH board]` / `[silk back]` or the `P1–P4_IOx` macros — do not paste the example integers.**
3. **Shared‑bus pins (all ports, fixed):** MOSI **12**, MISO **13**, SCK **14**, SDA **10**,
   SCL **11** `[silk back]`/`[SCH board]`. The LCD's SI/CK ride these; its CS/RST/DC are the
   3 dedicated pins of whatever port it occupies.
4. **Onboard controls (no port):** User Button **GPIO45**, BOOT **GPIO0**, RESET **EN**,
   NeoPixel **GPIO21**, ACT LED **GPIO37** `[silk back]`/`[board json]`. Use **GPIO45** for the
   "repeat last message" function.
5. **Strapping‑pin caveat** `[MCU DS]` Table 4‑1: ESP32‑S3 strapping pins are **GPIO0** (boot,
   weak‑PU), **GPIO3** (JTAG source, floating), **GPIO45** (VDD_SPI, weak‑PD), **GPIO46** (boot,
   weak‑PD). Of these, **only GPIO3 is exposed on an AX22 port — Port 1, pin 4** (the "CS/IO1"
   position). Low risk (GPIO3 only selects JTAG source and floats by default), but **prefer to
   place a module that idles that pin at boot on Port 1** — e.g. put an **ERM motor on Port 1**
   (its Data line is pin 3/GPIO4, and its unused pin‑4/GPIO3 just floats). Avoid routing the
   **LCD CS** or an **encoder channel** to Port 1 pin 4 if boot‑time contention is ever seen.
   GPIO0/45/46 are the onboard buttons/user‑button, not on any port — safe.
6. **USB / native‑USB pins:** GPIO19/GPIO20 = USB D‑/D+ (USB‑Serial/JTAG, programming) `[SCH board]`
   — not on AX22 ports; leave for the USB‑C link.
7. **Motor drive:** `digitalWrite(dataPin, HIGH)` buzzes; the module's MOSFET+flyback handle the
   load `[ERM CONTENT]`. No PWM required for on/off haptics (PWM optional for intensity).

---

## What changed vs `plan/idea.md` hardware claims

- **A. Per‑port GPIO understated.** `idea.md`: "All AX22 ports share the same I²C lines (SDA/SCL)
  and each port additionally exposes **its own dedicated GPIO**." **Truth `[SCH board]`:** each
  port exposes **3 dedicated GPIO** (pins 3/4/5 = IO0/IO1/IO2) **plus** a shared **SPI** bus
  (MOSI/MISO/SCK) **plus** the shared **I²C** bus. Both SPI and I²C are bussed to all ports —
  not I²C alone.
- **B. "Motors use the shared I²C line" is wrong.** `idea.md` implies the shared I²C is "what the
  vibration motors use." **Truth:** each ERM is driven by **one dedicated active‑high GPIO** (the
  port's pin‑3 "Data" line, e.g. GPIO4 on Port 1) `[ERM pins]`. **No I²C is involved** in this
  build at all — the SDA/SCL bus is entirely unused.
- **C. Encoder GPIO — confirmed feasible.** The flagged risk ("one port may not expose enough
  GPIO for a quadrature encoder") is resolved: encoder is **raw quadrature** using the port's
  **3 dedicated GPIO** (A/B + button) — fits one port `[ENC pins]`.
- **D. Port count — confirmed 4** via schematic + physical board; the kit‑bundle "8" is an
  erroneous copy from the GENESIS One. `idea.md`'s "4 (Mini kit)" stands.
- **E. ERM electrical claims — confirmed.** "Onboard MOSFET + flyback, active‑high 3.3 V GPIO,
  no soldering, snap‑in" all verified `[ERM CONTENT]`. Adds the missing number: **90 mA/motor**.
- **F. Power budget quantified.** `idea.md` never did the arithmetic; peak ≈0.58 A, buck=2 A,
  adequate on a ≥1 A USB source (§5).
- **G. "LED button" need not cost a port.** The onboard **GPIO45** user button covers grilling
  decision 6 without the AX22 Tactile LED Button module or a 5th port.
- **H. Motor‑arrival framing stale** (already noted in grilling doc): both ERM modules are in the
  corpus as real parts with STEP/GLB/SCH; no Saturday dependency.

---

## Grounding notes (corpus vs web; conflicts)

- **Primary = corpus.** Every electrical/interface number came from the local corpus; the only
  web citation is the **TLV62569 = 2 A** rating `[TI]`, because the buck's current rating is a
  TI spec not present in the corpus (the schematic gives only the part number). It is
  corroborative, not load‑bearing (the USB source, not the buck, is the binding constraint).
- **Corpus‑internal conflict:** kit‑bundle page says **8** ports; board page + schematic +
  physical render say **4**. Resolved to **4** (board‑specific + schematic + hardware beat
  bundle marketing copy). Documented in §2.
- **Corpus‑vs‑examples conflict:** the product‑page Arduino example pin integers do not match
  the Mini schematic (they target the GENESIS One). Schematic wins; documented in §7.2.
- **Datasheet gap:** the ERM/LCD/encoder "datasheet.pdf" files are **HTML LCSC viewer pages**,
  not real PDFs (`file` reports HTML). Component‑level specs beyond the corpus tech text were
  therefore not extractable locally. If deeper specs are needed, the underlying parts are: ERM
  raw motor **LCSC C2759984**; LCD panel **Newvisio N096‑1608TBBIG11‑H13** + **ST7735S**
  controller; encoder **ALPS Alpine EC11L1525G01**. The **ESP32‑S3‑MINI‑1** datasheet **is** a
  real PDF and was used directly. (DHT11 Mouser datasheet download failed per `[kit LLM_README]`
  — irrelevant, DHT11 unused.)
- **STEP reliability varies:** board + encoder STEPs are clean; **ERM & LCD STEPs carry embedded
  annotation geometry** that corrupts their raw X/Y bbox (LCD → 315 mm). Footprints were taken
  from corpus text to avoid propagating that artifact; heights are flagged **[approx]**.

---

## Residual risk

| # | Risk (unresolved) | Severity | Impact | How to close |
|---|---|---|---|---|
| R1 | **AX22 connector geometry** — socket height, 2×5 pitch, and the 4 port centre coordinates on the board are UNKNOWN | High (blocks accurate enclosure port cut‑outs) | Enclosure openings / module standoff can't be dimensioned precisely | Load `STP_MTX0013.step` in a CAD kernel (build123d/FreeCAD) and measure; or calipers on the physical board |
| R2 | **Mounting‑hole coordinates** — 4× ⌀2.7 mm on board and on each module: count known, XY positions UNKNOWN | High | Can't place screw bosses / align modules in CAD | Measure from STEP or calipers |
| R3 | **Module component heights [approx]** — ERM motor protrusion (~3.5–4 mm) and LCD panel height (~2–4 mm) are point‑cloud estimates from artifact‑contaminated STEPs | Med | Skin‑contact recess depth (ERM) and screen window depth (LCD) may be off by a mm or two | Calipers on physical parts; or clean STEP load |
| R4 | **Board −Z envelope** — what occupies the ~10 mm below the PCB in the STEP (battery holder vs modelling bound) is unconfirmed | Med | Overall device thickness / how the board sits in the cuff | Inspect STEP solid or the physical board |
| R5 | **ERM motor orientation for skin coupling** — motors seat on the board‑top (+Z) via sockets; pressing them to the wrist is a coupling problem | Med (design, not part) | May force remote‑mount on leads or a specific board orientation in the cuff | CAD‑phase decision (out of Track 3 scope); part fact recorded (§6) |
| R6 | **Bare‑port power margin** — a 500 mA laptop USB port leaves only ~0.6 A at 3V3 vs ~0.58 A peak | Low | Brief brown‑out risk if Wi‑Fi TX + both motors + screen peak together on a weak port | Power from a ≥1 A power bank/charger (recommended §5) |
| R7 | **ERM inrush current** unquantified (buffered by onboard cap, magnitude not in corpus) | Low | Marginally higher instantaneous draw than 90 mA at motor start | Bench‑measure with a current probe if margin is ever suspect |
| R8 | **Strapping pin GPIO3 on Port 1 pin 4** | Low | A module strongly pulling that pin at boot could alter JTAG source | Put a motor (idle pin) on Port 1; keep LCD‑CS/encoder off Port 1 pin 4 (§7.5) |

---

## CAD input checklist of unknowns (hand to Phase 3)

Everything the enclosure needs that I could **not** source from the corpus, with how to obtain it:

1. **AX22 port centre coordinates (×4) on the 55×55 board** — measure from `STP_MTX0013.step`
   (CAD load) or calipers. *(R1)*
2. **AX22 socket height above PCB** and **module‑seated standoff** (~8–9 mm est.) — CAD load /
   calipers. *(R1)*
3. **AX22 connector pitch** (2×5; 2.0 vs 2.54 mm) — CAD load / calipers. *(R1)*
4. **Board mounting‑hole XY** (4× ⌀2.7 mm, ~corners) — CAD load / calipers. *(R2)*
5. **Per‑module mounting‑hole XY** (ERM/LCD/encoder, 4× ⌀2.7 mm each) — CAD load / calipers. *(R2)*
6. **Board thickness** and **true top/bottom component envelope** (PCB ~1.6 mm est.; −Z content) —
   CAD load / calipers. *(R4)*
7. **ERM coin‑motor protrusion above PCB** (~3.5–4 mm est.) — calipers (drives skin‑recess depth). *(R3)*
8. **LCD panel height + glass standoff above PCB** (~2–4 mm est.) — calipers (drives screen window). *(R3)*
9. **Encoder shaft length/diameter + D‑flat** above PCB (~20 mm est.) — calipers / ALPS
   EC11L1525G01 datasheet (drives knob‑access hole). 
10. **USB‑C port position/height on the board edge** — CAD load / calipers (drives charging cut‑out).

**Known‑good CAD inputs (already sourced, no action needed):** board 55×55 mm; ERM 22×22 mm;
LCD 22×29 mm (active 10.8×21.7, glass 13.5×27.9); encoder 22×22 mm; all parts 4× ⌀2.7 mm holes;
4 ports in a central 2×2 cluster, sockets facing +Z; encoder is the tallest module (~20 mm shaft).

---

## Downstream pointers

- Feeds **Phase 2 executable plan** — correct `idea.md` items A–H above (esp. per‑port 3‑GPIO
  reality, motors‑use‑GPIO‑not‑I²C, GPIO45 for repeat, pin numbers from schematic not examples).
- Feeds **Phase 3 CAD design‑spec** — §6 geometry table + §9 unknowns checklist are the direct
  input; decisions 7 (motor placement) and 8 (on‑wrist board) from the grilling doc combine with
  these measured/estimated dims.
- **Retires** grilling residual‑risk rows: encoder‑GPIO (feasible), ERM‑vs‑USB budget (adequate),
  port‑count 4‑vs‑8 (4). Leaves the CAD geometry unknowns (R1–R4) as the main open items.
