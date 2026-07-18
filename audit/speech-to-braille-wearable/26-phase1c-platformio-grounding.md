# 26 — Phase 1C: PlatformIO Grounding (ESP32-S3-MINI-1 Arduino Build)

> **Track C / Phase 1 — RESEARCH ONLY.** This file determines the exact PlatformIO
> configuration needed to **compile** the `firmware/braille_wearable` Arduino sketch for the
> **Axiometa Genesis Mini** (ESP32-S3-MINI-1 module) and grounds every choice with cited URLs.
> No firmware source is written here — the deliverable is the `platformio.ini` below plus guidance.
> Verified **2026-07-17** against the local PlatformIO 6.1.19 install, the PlatformIO registry API,
> the pioarduino releases, arduinojson.org, and the ESP32-S3 Datasheet v2.2 PDF.

---

## Decisions at a glance

| # | Question | Verdict |
|---|---|---|
| a | Board ID | **`esp32-s3-devkitm-1`** — Espressif's DevKit**M**-1 *is* the ESP32-S3-**MINI**-1 module (8 MB flash, no PSRAM). |
| b | Platform (Arduino 3.x) | **pioarduino** fork → Arduino-ESP32 **3.3.9**. The official `espressif32` is still frozen at Arduino **2.0.17** even at v7.0.1. Exact line below. |
| c | USB build_flags | **`-DARDUINO_USB_MODE=1 -DARDUINO_USB_CDC_ON_BOOT=1`** — Hardware CDC/JTAG + bind `Serial` to the native USB-C port. |
| d | ArduinoJson | **Current is v7 (7.4.3).** The plan's `StaticJsonDocument<1024>` is **v6 syntax and must change to `JsonDocument`** (or pin `@^6.21.6`). |
| e | Rotary encoder | Use a maintained lib, not hand-rolled ISRs: **`mathertel/RotaryEncoder`** (simple, portable) — or **`madhephaestus/ESP32Encoder`** (hardware PCNT; S3 has only 2 PCNT units). |
| f | Unit test | `test/test_braille/` + Unity + a **`[env:native]`** host env → `pio test -e native`. Keep the table lookup Arduino-free. |
| g | Pin caveat | Only **GPIO45** needs special care (VDD_SPI strapping pin — must be **low at reset**). The other 10 pins are unrestricted S3 GPIO. |

**Critical build-breaker to fix in the plan:** the ArduinoJson snippet in plan task **B2** (`StaticJsonDocument<1024>`) will emit a deprecation warning under the current ArduinoJson v7 and will **fail the build if `-Werror` is set** (the embedded-systems skill recommends `-Wall -Werror`). See §(d).

---

## THE `platformio.ini` (centerpiece — ready to use)

```ini
; ==========================================================================
;  Axiometa Genesis Mini · ESP32-S3-MINI-1 · Speech-to-Braille wearable
;  PlatformIO project config · grounded in audit/26 · verified 2026-07-17
; ==========================================================================

[platformio]
default_envs = genesis_mini
; The Arduino sketch lives under firmware/braille_wearable/ per the plan.
; Point PlatformIO at it (or move the sketch into ./src and delete this line):
src_dir = firmware/braille_wearable

; --------------------------------------------------------------------------
;  Settings shared by every on-device (ESP32-S3) build env
; --------------------------------------------------------------------------
[esp32_common]
board          = esp32-s3-devkitm-1     ; DevKitM-1 == ESP32-S3-MINI-1 module, 8 MB, no PSRAM
framework      = arduino
monitor_speed  = 115200
upload_speed   = 921600

; --- Serial over the native USB-C port (built-in USB-Serial/JTAG CDC) ------
;   USB_MODE=1        -> "Hardware CDC and JTAG" (HWCDC), not TinyUSB/OTG
;   USB_CDC_ON_BOOT=1 -> the global `Serial` object talks to USB CDC at boot
;                        (instead of UART0 on GPIO43/44)
build_flags =
    -DARDUINO_USB_MODE=1
    -DARDUINO_USB_CDC_ON_BOOT=1

; --- Libraries (registry names + version pins, verified 2026-07-17) --------
;   WiFi / WiFiClientSecure / HTTPClient / SPI / Wire are BUILT INTO the esp32
;   Arduino core — do NOT add them to lib_deps.
lib_deps =
    bblanchon/ArduinoJson@^7.4.3
    adafruit/Adafruit ST7735 and ST7789 Library@^1.11.0
    adafruit/Adafruit GFX Library@^1.12.6
    adafruit/Adafruit BusIO@^1.17.4
    mathertel/RotaryEncoder@^1.6.0
    ; madhephaestus/ESP32Encoder@^0.12.0   ; <- alternative: hardware-PCNT encoder

; --------------------------------------------------------------------------
;  PRIMARY env — Arduino-ESP32 3.3.9 via the community "pioarduino" platform.
;  This is the ONLY way to get Arduino core 3.x on PlatformIO in 2026.
;  First build downloads the platform + core 3.3.9 + GCC-14 toolchain (needs
;  internet once, a few hundred MB).  Build:  pio run -e genesis_mini
; --------------------------------------------------------------------------
[env:genesis_mini]
extends  = esp32_common
platform = https://github.com/pioarduino/platform-espressif32/releases/download/stable/platform-espressif32.zip
; For a reproducible, pinned overnight build prefer the exact tag instead:
; platform = https://github.com/pioarduino/platform-espressif32/releases/download/55.03.39/platform-espressif32.zip

; --------------------------------------------------------------------------
;  OFFLINE FALLBACK env — Arduino-ESP32 2.0.17 via the OFFICIAL platform.
;  Already fully cached on this machine (toolchain 8.4.0 + core 2.0.17):
;  builds with ZERO downloads.  The firmware uses no 3.x-only APIs, so it
;  compiles here unchanged.  Build:  pio run -e genesis_mini_offline
; --------------------------------------------------------------------------
[env:genesis_mini_offline]
extends  = esp32_common
platform = espressif32@7.0.1

; --------------------------------------------------------------------------
;  HOST unit-test env — runs pure C++ (the braille table) on the Mac, no board.
;  Needs a host C++ compiler (Xcode Command Line Tools).  Run: pio test -e native
;  Note: this env does NOT extend esp32_common (no ESP32 flags / no ESP32 libs).
; --------------------------------------------------------------------------
[env:native]
platform       = native
test_framework = unity
build_flags    = -std=gnu++17 -I firmware/braille_wearable
```

> `pio run -e genesis_mini` builds the modern (Arduino 3.x) firmware; if internet is
> unavailable at build time, `pio run -e genesis_mini_offline` builds the identical
> firmware against the already-cached Arduino 2.0.17 stack. `pio test -e native` runs
> the braille-table unit test on the Mac.

---

## (a) Board ID — `esp32-s3-devkitm-1`

**Recommendation: `board = esp32-s3-devkitm-1`.**

Espressif's own **ESP32-S3-DevKit*M*-1** is the reference board built around the **ESP32-S3-MINI-1
/ MINI-1U** module — the DevKitM-1 user guide states the board carries "the ESP32-S3-MINI-1 or
ESP32-S3-MINI-1U, a module named for its small size." (The DevKit**C**-1, by contrast, carries the
larger **WROOM-1** module.) So for a MINI-1 target the `-devkitm-1` ID is the semantically correct
match. [1][2]

The installed platform's board definition (`~/.platformio/platforms/espressif32/boards/esp32-s3-devkitm-1.json`)
resolves to exactly the right silicon options for a plain MINI-1:

- `mcu = esp32s3`, `variant = esp32s3`, `f_cpu = 240 MHz`, `flash_mode = qio`
- `flash_size = 8MB`, **no PSRAM** (the plain MINI-1 has no PSRAM; `maximum_ram_size` is the 320 KB
  internal SRAM only) — correct, because enabling OPI PSRAM on a no-PSRAM module hangs at boot.
- It already injects `-DARDUINO_USB_MODE=1` in `build.extra_flags` (native-USB board). [3]

> **Flash-size caveat (upload-time, not compile-time).** The board default assumes an **8 MB**
> MINI-1 (`-N8`). If the Genesis Mini's module is the 4 MB base part, compilation is unaffected, but
> flashing/partitioning is: add `board_upload.flash_size = 4MB` and a fitting
> `board_build.partitions = default.csv`. Confirm the module's flash marking before the first upload.
> `esp32-s3-devkitc-1` (also 8 MB / no-PSRAM, identical build flags here) is an acceptable substitute
> for compiling, but `-devkitm-1` documents the true module and is preferred. [3]

---

## (b) Platform — pioarduino (Arduino 3.x); official is frozen at 2.0.17

**This is the load-bearing finding.** In mid-2026 the **official** `platformio/espressif32`
platform is *still* on the **Arduino-ESP32 2.0.17** core. Its recent version bumps were about
adding **ESP-IDF v6** support for the *ESP-IDF* framework, **not** about advancing Arduino:

| Official `espressif32` | Published | Arduino core it bundles |
|---|---|---|
| **7.0.1** | 2026-05-12 | **2.0.17** (added ESP-IDF v6.0.1) |
| 7.0.0 | 2026-04-30 | **2.0.17** (added ESP-IDF v6.0.0) |
| 6.13.0 | 2026-02-26 | **2.0.17** (ESP-IDF 5.5.3) |

Verified two independent ways: the local manifest pins `framework-arduinoespressif32 @ ~3.20017.0`
(= Arduino 2.0.17, confirmed by `esp_arduino_version.h`: MAJOR 2 / MINOR 0 / PATCH 17), and the
GitHub release notes say the same. [4][5][6] The community has long relied on a fork for 3.x. [7][8]

The **community `pioarduino` fork** is the route to **Arduino-ESP32 3.x**. Current stable
(tag **`55.03.39`**, 2026-06-04) bundles **Arduino core 3.3.9 + ESP-IDF 5.5.4**. Its README gives the
canonical `platform =` line. [9][10]

**Exact `platform =` line for a clean `pio run` (Arduino 3.x):**

```ini
platform = https://github.com/pioarduino/platform-espressif32/releases/download/stable/platform-espressif32.zip
```
For a **pinned/reproducible** build (recommended for the locked overnight run), use the tag asset:
```ini
platform = https://github.com/pioarduino/platform-espressif32/releases/download/55.03.39/platform-espressif32.zip
```

**Which one actually resolves & builds today?** Both do. Trade-off:

- **pioarduino (recommended, `[env:genesis_mini]`):** modern, maintained Arduino **3.3.9**; matches
  this project's "Arduino 3.x in 2026" intent. **Cost:** the fork, the 3.3.9 framework, and a newer
  (GCC-14) toolchain are **not cached** here — the first build downloads them (needs internet once).
  PlatformIO Core 6.1.19 (installed) satisfies pioarduino. [9]
- **official `espressif32@7.0.1` (fallback, `[env:genesis_mini_offline]`):** Arduino **2.0.17**, but
  it is **already fully cached** on this machine (xtensa-esp32s3 toolchain 8.4.0 + core 2.0.17) →
  **builds offline, zero downloads.** The firmware uses no 3.x-only APIs, so it compiles unchanged. [3]

Keeping both envs in the ini is the hedge: prefer `genesis_mini` (3.x) when online; fall back to
`genesis_mini_offline` if the pioarduino download is unavailable at build time.

---

## (c) USB build_flags — Serial over the native USB-C port

**Correct, current flags:** `-DARDUINO_USB_MODE=1` and `-DARDUINO_USB_CDC_ON_BOOT=1`.

- **`ARDUINO_USB_MODE=1`** selects the S3's **"Hardware CDC and JTAG"** USB mode — the serial link
  is served by the on-chip **USB-Serial/JTAG controller** (`HWCDC` driver) rather than the
  TinyUSB / USB-OTG stack (which is `ARDUINO_USB_MODE=0`). This is the right mode when all you need
  is a serial console + flashing over the native port (no custom USB HID/MSC). Evidence: Espressif's
  own native-USB board definition (`esp32-s3-devkitm-1`) ships `-DARDUINO_USB_MODE=1`. [3][11]
- **`ARDUINO_USB_CDC_ON_BOOT=1`** binds the global **`Serial`** object to that USB CDC **at boot**, so
  `Serial.begin()/print()` go out the **USB-C** port instead of UART0 (GPIO43/44). With `=0`, `Serial`
  stays on UART0 and USB CDC would require a separate `USBSerial`/`HWCDC` object. [11][12]

The `esp32-s3-devkitm-1` board already defines `USB_MODE=1`; we still set **both** flags explicitly so
the behavior is identical on the pioarduino board files and is self-documenting. `monitor_speed = 115200`
matches the plan's Serial Monitor (baud is nominal for USB CDC, but keep it consistent). [3]

> **Boot-safety gotcha (native USB CDC).** With CDC-on-boot, the COM/tty port is created by firmware.
> If the sketch crashes early, hard-reboots, or the host hasn't opened the port, the CDC device can
> **disappear**, and a plain re-upload may fail to find a port. Recovery = put the S3 into **download
> mode** (hold **BOOT/GPIO0**, tap **RESET**, release BOOT), then flash. This is normal S3 behavior,
> not a config error. [12][13]

---

## (d) `lib_deps` + the ArduinoJson v6-vs-v7 VERDICT

**`lib_deps` (registry names + versions, verified against the PlatformIO registry API 2026-07-17):**

```ini
lib_deps =
    bblanchon/ArduinoJson@^7.4.3
    adafruit/Adafruit ST7735 and ST7789 Library@^1.11.0
    adafruit/Adafruit GFX Library@^1.12.6
    adafruit/Adafruit BusIO@^1.17.4
    mathertel/RotaryEncoder@^1.6.0
```

- **Adafruit ST7735/ST7789** — exact registry name (note the spaces):
  `adafruit/Adafruit ST7735 and ST7789 Library`, latest **1.11.0**. It depends on
  **`adafruit/Adafruit GFX Library`** (latest **1.12.6**), which in turn depends on
  **`adafruit/Adafruit BusIO`** (latest **1.17.4**). PlatformIO's Library Dependency Finder auto-pulls
  GFX + BusIO from the `depends=` field, but listing all three explicitly **pins** them for a
  reproducible resolve — recommended. [14][15][16]
- **Built-in, do NOT add:** `WiFiClientSecure`, `HTTPClient`, `WiFi`, `SPI`, `Wire` ship inside the
  esp32 Arduino core. Adding them to `lib_deps` is wrong (they are not registry libraries).

### ArduinoJson: **the current version is v7 — the plan's snippet is v6 and must change**

**Verdict:** ArduinoJson's current major is **v7** (latest **7.4.3**, 2026-03-02; v7.0.0 shipped
2024-01-03). The last v6 release is **6.21.6** (maintenance only). [17][18][19]

v7 **removed** the fixed-capacity documents and merged them into one elastic class. From the official
v6→v7 migration guide: *"StaticJsonDocument and DynamicJsonDocument were merged into a single
JsonDocument class,"* and *"the new JsonDocument has an elastic capacity that automatically grows as
required, so you don't need to specify the capacity anymore."* `StaticJsonDocument<N>` /
`DynamicJsonDocument` still compile in v7 but emit a **deprecation warning** (since 7.0.3). [18]

The plan's **Task B2** uses:
```cpp
StaticJsonDocument<1024> d;            // <-- ArduinoJson v6 API (deprecated in v7)
deserializeJson(d, http.getString());
```
**Under `bblanchon/ArduinoJson@^7.4.3` this warns — and FAILS the build if `-Werror` is set.**

**Two ways to make it correct — pick one:**

1. **Recommended — migrate to v7** (pin `@^7.4.3`). Change only the document declaration; every
   accessor stays identical:
   ```cpp
   JsonDocument d;                      // heap-elastic; no <1024> template arg
   deserializeJson(d, http.getString());
   long seq          = d["seq"];              // unchanged
   String mode       = d["mode"].as<String>();// unchanged
   String msg        = d["msg"].as<String>(); // unchanged
   JsonArray replies = d["replies"].as<JsonArray>(); // unchanged
   ```
2. **Keep the v6 snippet as-is** — pin `bblanchon/ArduinoJson@^6.21.6` instead. `StaticJsonDocument<1024>`
   then compiles cleanly. Choose this only if you want zero code churn.

Recommendation: **option 1** (v7 + `JsonDocument`) for a new 2026 build; the ~1 KB `/api/pull`
payload is trivial for v7's heap allocator. Update the mirror note in the plan accordingly.

---

## (e) Rotary encoder — use a maintained library

**Recommendation: use a maintained library, not hand-rolled interrupt quadrature decoding.** For a
3-item menu scroll, either of these is standard, reliable practice:

- **`mathertel/RotaryEncoder@^1.6.0`** (primary pick — simplest, portable). Header-only quadrature
  decoder with a `tick()` method you call either by polling in `loop()` **or** from a pin-change ISR
  you attach yourself (the lib installs no ISR of its own). `LatchMode::FOUR3` matches common detented
  encoders. Works on ESP32/ESP32-S3 (`platforms = *`). [20][21]
  *Usage reference* (from the library's `InterruptRotator` example — not project firmware):
  ```cpp
  #include <RotaryEncoder.h>
  RotaryEncoder enc(ENC_DT, ENC_CL, RotaryEncoder::LatchMode::FOUR3);
  void IRAM_ATTR onEnc() { enc.tick(); }              // ISR just ticks
  // setup(): pinMode(ENC_CL/ENC_DT, INPUT_PULLUP);
  //          attachInterrupt(ENC_CL, onEnc, CHANGE); attachInterrupt(ENC_DT, onEnc, CHANGE);
  // loop():  long pos = enc.getPosition();            // read detents; debounce ENC_BT separately
  ```
- **`madhephaestus/ESP32Encoder@^0.12.0`** (hardware alternative — most robust). Uses the ESP32
  **PCNT** (pulse-counter) peripheral, so counting is done in hardware with near-zero CPU cost.
  **S3 caveat:** the ESP32-S3 has **only 2 PCNT units** (vs 8 on the classic ESP32; 0 on the C3), so
  at most 2 hardware encoders — fine here (we have one). [22][23]

For this build's single low-speed menu encoder, `mathertel/RotaryEncoder` with `attachInterrupt` is
the lightest reliable choice; `ESP32Encoder` is the upgrade if you ever see missed detents.
Encoder inputs need pull-ups (`INPUT_PULLUP`) with the encoder common tied to GND.

---

## (f) PlatformIO Unity host test — `pio test -e native`

PlatformIO's unit-test runner looks in a **`test/`** directory, groups tests by **`test_`-prefixed
sub-folders**, and defaults to the **Unity** framework (`test_framework = unity`). A **`[env:native]`**
env (`platform = native`) compiles with the **host GCC/Clang** (install Xcode Command Line Tools on
macOS) so platform-independent logic runs on the Mac — perfect for the pure braille table. [24][25]

**Key rule:** keep the function under test **Arduino-free**. The A–Z mask table + a pure
`brailleMask(char)` lookup have no `Arduino.h` / `digitalWrite` / `delay`, so they compile natively.
The *sequencer* (`buzzLetter`/`buzzWord`, which calls Arduino APIs) is **not** host-testable without
mocks — leave it out of the native test.

**Layout** (the `-I firmware/braille_wearable` in `[env:native]` lets the test include the header):
```
firmware/braille_wearable/
    braille.h            ; pure C++: const uint8_t BRAILLE[26] + inline uint8_t brailleMask(char)
    braille.cpp          ; sequencer (Arduino APIs) — NOT compiled by the native env
    ...
test/
    test_braille/
        test_braille.cpp ; the Unity test below
```

**Minimal `test/test_braille/test_braille.cpp`** (host runner uses `main()`; on-device you'd use
`setup()/loop()` instead):
```cpp
#include <unity.h>
#include "braille.h"                 // pure lookup; no Arduino.h

void setUp(void) {}                  // Unity requires these two symbols
void tearDown(void) {}

void test_a_is_dot1_only(void)  { TEST_ASSERT_EQUAL_HEX8(0x01, brailleMask('a')); } // dot 1
void test_l_is_dots_1_2_3(void) { TEST_ASSERT_EQUAL_HEX8(0x07, brailleMask('l')); } // dots 1,2,3
void test_w_is_dots_2_4_5_6(void){ TEST_ASSERT_EQUAL_HEX8(0x3A, brailleMask('w')); } // dots 2,4,5,6

int main(int, char**) {
    UNITY_BEGIN();
    RUN_TEST(test_a_is_dot1_only);
    RUN_TEST(test_l_is_dots_1_2_3);
    RUN_TEST(test_w_is_dots_2_4_5_6);
    return UNITY_END();
}
```
Run: **`pio test -e native`**. (This mirrors the JS `braille.test.ts` guard in the plan — both assert
the acceptance-critical table against a known Braille chart, but on the C side.)

---

## (g) Pin-mode / boot-safety caveats for the LOCKED GPIO map

Grounded in the **ESP32-S3 Series Datasheet v2.2** and the **ESP32-S3-MINI-1 Datasheet v1.7**. [26][27][28]
The pin map is LOCKED — this is a compile-and-boot-safety note, not a redesign.

**Headline: only GPIO45 needs special handling.** The ESP32-S3's strapping pins are **exactly
GPIO0, GPIO3, GPIO45, GPIO46**; the SPI flash lives on **GPIO26–32**; native USB is **GPIO19/20**;
JTAG defaults to **GPIO39–42**. The locked map touches **none** of these except **GPIO45**. [26]

Crucially, this differs from the **classic ESP32**: there GPIO6–11 are flash pins and **GPIO12 is a
strapping (VDD_SPI) pin** — on the **S3** those roles moved, so **GPIO5/6/7/9/12/13/14 are ordinary,
free GPIO.** Muscle memory from classic-ESP32 would wrongly flag GPIO6/7/9/12/14 in this map; on the
S3 they are safe. [26][29]

### Strapping-pin defaults (ESP32-S3 Datasheet Table 3-1, p.32) [26]

| Strapping pin | Controls | Default pull @ reset | Bit | In our map? |
|---|---|---|---|---|
| GPIO0 | Boot mode (w/ 46) | Weak **pull-up** | 1 | No |
| GPIO3 | JTAG signal source | Floating | – | No |
| **GPIO45** | **VDD_SPI voltage select** | Weak **pull-down** | **0** | **Yes → "repeat" button** |
| GPIO46 | Boot mode / ROM-msg | Weak pull-down | 0 | No |

### Per-pin assessment (the 11 locked GPIOs)

| GPIO | Design function | Special role on S3? | Safe as used? | pinMode / note |
|---|---|---|---|---|
| **4** | Motor A (out) | none (ADC1_CH3) | Yes | `OUTPUT`. Free RTC/ADC1 pin. |
| **9** | Motor B (out) | none (ADC1_CH8) | Yes | `OUTPUT`. **Not** a flash pin on S3. |
| **1** | Encoder button (in) | none (ADC1_CH0) | Yes | `INPUT_PULLUP`. |
| **7** | LCD CS (out) | none (ADC1_CH6) | Yes | `OUTPUT`. Free on S3 (flash is 26–32). |
| **6** | LCD RST (out) | none (ADC1_CH5) | Yes | `OUTPUT`. Free on S3. |
| **5** | LCD DC (out) | none (ADC1_CH4) | Yes | `OUTPUT`. Free RTC/ADC1 pin. |
| **17** | Encoder A/CLK (in) | none (ADC2_CH6) | Yes | `INPUT_PULLUP`. Default drive 10 mA. |
| **18** | Encoder B/DT (in) | none (ADC2_CH7) | Yes | `INPUT_PULLUP`. Default drive 10 mA. |
| **45** | "Repeat" button (in) | **STRAPPING: VDD_SPI select** | Yes, **after reset** | **See boot-safety note ↓** |
| **12** | LCD MOSI (out) | none on S3 (ADC2_CH1) | Yes | `OUTPUT`. **Not** a strap on S3 (was MTDI strap on classic ESP32). |
| **14** | LCD SCK (out) | none on S3 (ADC2_CH3) | Yes | `OUTPUT`. Free ordinary I/O on S3. |

Notes: **No ESP32-S3 GPIO is input-only** (unlike classic ESP32's 34–39), so all outputs above are
valid — every pad is I/O-capable per Datasheet Table 2-4. GPIO12/14/17/18 are **ADC2**, which is shared
with the Wi-Fi driver; irrelevant here because we use them as **digital** I/O (ADC2 conflict only bites
analog reads while Wi-Fi is on). GPIO1/4/5/6/7/9 are ADC1 (no such restriction). [26]

### GPIO45 boot-safety note (the one real caveat)

GPIO45 is the **VDD_SPI voltage-select** strapping pin, sampled **only during reset** (hold time
≥ 3 ms after power-good). With the default (un-burnt) eFuses, **GPIO45 = 0 → 3.3 V flash; GPIO45 = 1 →
1.8 V flash** (Datasheet Table 3-4, p.34). The MINI-1's in-package flash is **3.3 V**, so **GPIO45 must
read LOW at reset** — its internal weak pull-down gives exactly that. [26][27]

If anything drives GPIO45 **high at reset** — an **external pull-up**, or the **button held at
power-on** — the strap latches 1 → VDD_SPI = 1.8 V → the 3.3 V flash is under-volted → the ROM
bootloader can't read flash → **boot failure / reset loop / "invalid header"**. Rules for the locked
button: [26][30]

- **Never enable a pull-up on GPIO45.** Use `pinMode(BTN_REPEAT, INPUT)` (or `INPUT_PULLDOWN`); read
  it **active-high** (idle low via the internal weak pull-down, pressed = 3.3 V). Strapping is latched
  before `setup()` runs, so reading it in `loop()` is fine — the hazard is purely at the reset instant.
- **Verify on the bench:** with the board idle, confirm **GPIO45 sits LOW at reset** (i.e. the Genesis
  Mini's onboard "user-45" button has no external pull-up to 3V3). If it idles high, that pin cannot be
  a safe strap and the module may not boot.
- **Operational rule:** don't hold the "repeat" button while plugging in USB / resetting.
- (Optional permanent fix, out of scope here: burning `EFUSE_VDD_SPI_FORCE=1` + `TIEH=1` locks 3.3 V
  and makes GPIO45 a don't-care — one-way, not needed for the demo.) [26][30]

**Correctly avoided by the locked map:** GPIO0/3/46 (other straps), GPIO19/20 (native USB), GPIO26–37
(flash/PSRAM), GPIO39–42 (JTAG). No conflicts. [26]

---

## Sources

**Board / platform**
- [1] ESP32-S3-DevKitM-1 user guide (module = ESP32-S3-MINI-1/MINI-1U): https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/hw-reference/esp32s3/user-guide-devkitm-1.html
- [2] PlatformIO board page — ESP32-S3-DevKitM-1: https://docs.platformio.org/en/latest/boards/espressif32/esp32-s3-devkitm-1.html
- [3] Local board definition `~/.platformio/platforms/espressif32/boards/esp32-s3-devkitm-1.json` (installed espressif32 7.0.1) — `flash_size 8MB`, no PSRAM, `-DARDUINO_USB_MODE=1`.
- [4] platformio/espressif32 on the registry: https://registry.platformio.org/platforms/platformio/espressif32
- [5] platformio/platform-espressif32 releases (7.0.1/7.0.0 = Arduino 2.0.17 + ESP-IDF v6): https://github.com/platformio/platform-espressif32/releases
- [6] framework-arduinoespressif32 (version 3.20017.x ⇒ Arduino 2.0.17): https://registry.platformio.org/tools/platformio/framework-arduinoespressif32
- [7] PlatformIO community — "ESP32 Arduino Core 3.x and PlatformIO status": https://community.platformio.org/t/esp32-arduino-core-3-x-and-platformio-status/42008
- [8] arduino-esp32 discussion #10039 — community PlatformIO support for core 3.x: https://github.com/espressif/arduino-esp32/discussions/10039
- [9] pioarduino/platform-espressif32 (README — canonical `platform =` lines; Arduino 3.3.9 / IDF 5.5.4): https://github.com/pioarduino/platform-espressif32
- [10] pioarduino releases (tag 55.03.39, 2026-06-04): https://github.com/pioarduino/platform-espressif32/releases

**USB CDC**
- [11] Arduino-ESP32 USB CDC API docs (ARDUINO_USB_MODE / ARDUINO_USB_CDC_ON_BOOT): https://docs.espressif.com/projects/arduino-esp32/en/latest/api/usb_cdc.html
- [12] PlatformIO community — enabling USB CDC on boot for ESP32-S3/C3: https://community.platformio.org/t/enabling-usb-cdc-on-boot-on-esp32-c3-devkit/33346
- [13] arduino-esp32 issue #8704 — S3 no longer recognized after `ARDUINO_USB_CDC_ON_BOOT=1` (download-mode recovery): https://github.com/espressif/arduino-esp32/issues/8704

**Libraries**
- [14] Adafruit ST7735 and ST7789 Library (1.11.0): https://registry.platformio.org/libraries/adafruit/Adafruit%20ST7735%20and%20ST7789%20Library
- [15] Adafruit GFX Library (1.12.6): https://registry.platformio.org/libraries/adafruit/Adafruit%20GFX%20Library
- [16] Adafruit BusIO (1.17.4): https://registry.platformio.org/libraries/adafruit/Adafruit%20BusIO
- [17] ArduinoJson on the PlatformIO registry (latest 7.4.3; v6 final 6.21.6): https://registry.platformio.org/libraries/bblanchon/ArduinoJson
- [18] ArduinoJson v6→v7 migration guide (StaticJsonDocument → JsonDocument): https://arduinojson.org/v7/how-to/upgrade-from-v6/
- [19] ArduinoJson 7 announcement (2024-01-03): https://arduinojson.org/news/2024/01/03/arduinojson-7/
- [20] mathertel/RotaryEncoder (1.6.0): https://registry.platformio.org/libraries/mathertel/RotaryEncoder
- [21] mathertel/RotaryEncoder source + examples: https://github.com/mathertel/RotaryEncoder
- [22] madhephaestus/ESP32Encoder (0.12.0): https://registry.platformio.org/libraries/madhephaestus/ESP32Encoder
- [23] madhephaestus/ESP32Encoder source (PCNT; "ESP32s3 has just 2 PCNT modules"): https://github.com/madhephaestus/ESP32Encoder

**Unit testing**
- [24] PlatformIO Unit Testing (test/ dir, test_ prefix, Unity, `test_framework`): https://docs.platformio.org/en/latest/advanced/unit-testing/index.html
- [25] PlatformIO `native` platform (host GCC/Clang): https://docs.platformio.org/en/latest/platforms/native.html

**Pins / datasheets**
- [26] ESP32-S3 Series Datasheet v2.2 (Ch.2 pins, Ch.3 boot/strapping — Table 3-1 p.32, Table 3-4 p.34): https://documentation.espressif.com/esp32-s3_datasheet_en.pdf
- [27] ESP32-S3-MINI-1 / MINI-1U Datasheet v1.7 (module strapping defaults; -N8 = 8 MB, no PSRAM): https://documentation.espressif.com/esp32-s3-mini-1_mini-1u_datasheet_en.pdf
- [28] ESP-IDF GPIO & RTC GPIO (ESP32-S3) — flash pins 26–32 not recommended for reuse: https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/peripherals/gpio.html
- [29] Arduino-ESP32 GPIO / IO MUX reference: https://docs.espressif.com/projects/arduino-esp32/en/latest/api/gpio.html
- [30] ESP32-S3 Hardware Design Guidelines — schematic checklist (VDD_SPI / GPIO45): https://docs.espressif.com/projects/esp-hardware-design-guidelines/en/latest/esp32s3/schematic-checklist.html
```
