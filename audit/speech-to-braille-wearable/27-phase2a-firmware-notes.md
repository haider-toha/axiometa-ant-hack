# 27 — Phase 2A: ESP32-S3 Firmware Build Notes

> **Track A / Phase 2 — BUILD.** Complete PlatformIO Arduino firmware for the
> Axiometa Genesis Mini (ESP32-S3-MINI-1). Grounded in
> [`26-phase1c-platformio-grounding.md`](./26-phase1c-platformio-grounding.md).
> Built + verified **2026-07-18** against the local PlatformIO 6.1.19 install.
> **Hard compile gate: `pio run` exits 0 and produces a firmware `.bin` — PASSED (proof below).**

---

## Result at a glance

| Item | Value |
|---|---|
| `pio run` exit code | **0** (green) |
| Built env | **`genesis_mini_offline`** (espressif32@7.0.1 → Arduino core 2.0.17) |
| Firmware binary | `.pio/build/genesis_mini_offline/firmware.bin` (**893 KB**) |
| Flash usage | 26.7 % (892,477 / 3,342,336 bytes) |
| RAM usage | 14.2 % (46,476 / 327,680 bytes) |
| Native Unity test | `pio test -e native` → **7/7 PASSED** |
| MOTOR_R (Motor B) | **GPIO9** (Port 3 IO0 — the {1,3} diagonal) |
| Encoder pins | **ENC_BT=1, ENC_CL=17, ENC_DT=18** (Port 4) |

---

## Files created (13)

Project root: `firmware/braille_wearable/`

| Path | Purpose |
|---|---|
| `platformio.ini` | Board `esp32-s3-devkitm-1`, Arduino framework; 3 envs (pioarduino 3.x, cached offline 2.0.17, native Unity); USB CDC flags; lib_deps (ArduinoJson v7, Adafruit ST7735/GFX/BusIO, RotaryEncoder). |
| `src/pins.h` | LOCKED pin map (audit 20 §4), transcribed verbatim. |
| `src/secrets.h` | Git-ignored template with PLACEHOLDER WiFi/Vercel values (compiles now; user fills real values). |
| `src/braille.h` | `static const uint8_t BRAILLE[26]` + pure inline `brailleMask(char)` (Arduino-free) + sequencer declarations. |
| `src/braille.cpp` | LOCKED sequencer: `beat()` (both-fire micro-stagger), `buzzLetter()`, `buzzWord()`, `brailleSelfTest()`. |
| `src/net.h` / `src/net.cpp` | `PullResult` struct + `wifiJoin()`, `deviceIp()`, `pollPull()` (seq-gated, ArduinoJson **v7 `JsonDocument`**), `postReply()`; `WiFiClientSecure` + `tls.setInsecure()`. |
| `src/display.h` / `src/display.cpp` | Adafruit ST7735 (software SPI on locked pins): `displayInit()`, `showStatus()`, `showCaption()`. |
| `src/encoder.h` / `src/encoder.cpp` | mathertel/RotaryEncoder (ISR `tick()` + poll safety net) + debounced button: `encoderInit()`, `encoderDelta()`, `encoderPressed()`. |
| `src/braille_wearable.cpp` | Main sketch: setup pinModes/display/WiFi/status; loop polls ~700 ms → caption + buzz; GPIO45 repeat button; Rung-4 reply branch (encoder scroll + POST). |
| `test/test_braille/test_braille.cpp` | Native Unity test: a,c,l,w + all 26 masks re-derived from first-principles dot lists + case/non-letter checks. |

---

## The `platformio.ini` env chosen for the green build + why

**`default_envs = genesis_mini_offline`** → `platform = espressif32@7.0.1`.

Rationale (grounded in Phase 1C §b, verified on this machine):

- The official `espressif32@7.0.1` platform, the **xtensa-esp32s3 toolchain 8.4.0**, and **Arduino
  core 2.0.17** (`framework-arduinoespressif32`) are **already fully cached** in `~/.platformio/`.
  A bare `pio run` therefore needs **zero platform download** and is reliably green.
- The **pioarduino** Arduino-3.x platform (`[env:genesis_mini]`) is **not** cached here — its first
  build would download the fork + core 3.3.9 + a GCC-14 toolchain (hundreds of MB). Per the task's
  compile-gate instruction, `default_envs` is pinned to the cached offline env so the gate does not
  depend on that download. `genesis_mini` is retained in the ini for an online Arduino-3.x build.
- The firmware uses **no Arduino-3.x-only APIs**, so it compiles unchanged on either device env
  (Phase 1C §b). Only `lib_deps` (ArduinoJson, Adafruit, RotaryEncoder) were fetched once from the
  PlatformIO registry (reachable, HTTP 200) and are now cached in `.pio/libdeps/`.
- **`native` is deliberately NOT in `default_envs`** (per the task) — a bare `pio run` builds only the
  device env; `native` runs only under `pio test -e native`.

USB flags applied on both device envs via `[esp32_common]`:
`-DARDUINO_USB_MODE=1 -DARDUINO_USB_CDC_ON_BOOT=1` (Serial over native USB-C, Phase 1C §c).

> Note vs. the 1C reference ini: 1C set `src_dir = firmware/braille_wearable` because its project root
> was the repo root. Here the **project root IS `firmware/braille_wearable/`**, so the default
> `src_dir = src` is correct and the `src_dir` override is omitted. The native env's include path is
> `-I src` (was `-I firmware/braille_wearable` in 1C) for the same reason.

---

## ArduinoJson v6 → v7 migration note (Phase 1C §d)

The plan's Task B2 snippet used the **v6** API `StaticJsonDocument<1024>`, which is deprecated in v7
and would warn (and fail under `-Werror`). `lib_deps` pins **`bblanchon/ArduinoJson@^7.4.3`**, so
`net.cpp` uses the **v7 elastic `JsonDocument`** instead — every accessor is unchanged:

```cpp
JsonDocument d;                          // was StaticJsonDocument<1024>
deserializeJson(d, body);
long seq = d["seq"] | 0L;
out.mode = d["mode"].as<String>();
out.msg  = d["msg"].as<String>();
for (JsonVariant v : d["replies"].as<JsonArray>()) out.replies.push_back(v.as<String>());
```

`postReply()` likewise builds its JSON body with a v7 `JsonDocument` + `serializeJson`. The resolved
library was **ArduinoJson 7.4.3**; the build emitted **no ArduinoJson deprecation warnings**.

---

## GPIO45 handling (the one real GPIO caveat — Phase 1C §g)

GPIO45 is the ESP32-S3 **VDD_SPI voltage-select strapping pin**, sampled only at reset; it must read
**LOW at reset** so the MINI-1's 3.3 V flash is driven correctly. The firmware therefore:

- Uses **`pinMode(BTN_REPEAT, INPUT)` — NO pull-up** (`INPUT_PULLUP` would risk mis-strapping the
  flash voltage → boot failure). The pin's internal weak pull-down holds it low at reset.
- Reads the button **active-high** (idle LOW, pressed = 3.3 V): `repeatPressed()` debounces (30 ms)
  and fires on the **rising** edge. Comment in `braille_wearable.cpp` documents the strapping hazard.
- Operational note preserved for the bench: don't hold the repeat button while resetting/plugging USB.

The encoder inputs (GPIO1/17/18) and motor outputs (GPIO4/9) are ordinary S3 GPIO with no strapping
role, so `INPUT_PULLUP` (encoder) and `OUTPUT` (motors) are used normally.

---

## Deviations from the plan (all justified)

1. **Pin map** — used the **audit-20-§4 CORRECTED** map (`pins.h`), which overrides the plan's Task B1
   snippet: **Motor B = GPIO9** (Port 3, the {1,3} diagonal) not GPIO1, and encoder on Port 4
   (BT=1, CL=17, DT=18). This is the authoritative locked map.
2. **ArduinoJson** — v7 `JsonDocument` instead of the plan's v6 `StaticJsonDocument<1024>` (see above).
3. **Braille table location** — `BRAILLE[26]` + a pure inline `brailleMask()` live in **`braille.h`**
   (Phase 1C §f layout) so the native Unity test links the lookup without Arduino. `static const` gives
   the table internal linkage → safe to `#include` from multiple `.cpp` files (no ODR/duplicate-symbol
   issue). The sequencer stays in `braille.cpp`. Values transcribed exactly as specified.
4. **Display SPI** — used the Adafruit **software-SPI** constructor
   (`Adafruit_ST7735(CS, DC, MOSI, SCLK, RST)`) so the exact locked pins are driven regardless of the
   S3 hardware-SPI mux — robust and compiles cleanly (Phase 1C left SW/HW to the builder).
5. **File extension** — main sketch is **`src/braille_wearable.cpp`** (not `.ino`) because this is a
   native PlatformIO project (project root = `firmware/braille_wearable/`, default `src_dir = src`).
6. **`native` include path** — `-I src` (project root changed vs. the 1C reference ini; see above).

No functional behavior from the LOCKED scheme/timing was changed: `BUZZ=400, GAP_BEAT=300,
GAP_LETTER=800, GAP_WORD=1500, STAGGER=100`; both-fire micro-stagger L-then-R; 3 row-beats per letter.

---

## Compile-gate proof (`pio run`, exit 0)

Command: `pio run` (in `firmware/braille_wearable/`, builds `default_envs = genesis_mini_offline`).

```
Retrieving maximum program size .pio/build/genesis_mini_offline/firmware.elf
Checking size .pio/build/genesis_mini_offline/firmware.elf
Advanced Memory Usage is available via "PlatformIO Home > Project Inspect"
RAM:   [=         ]  14.2% (used 46476 bytes from 327680 bytes)
Flash: [===       ]  26.7% (used 892477 bytes from 3342336 bytes)
Building .pio/build/genesis_mini_offline/firmware.bin
esptool.py v4.11.0
Creating esp32s3 image...
Merged 2 ELF sections
Successfully created esp32s3 image.
========================= [SUCCESS] Took 18.90 seconds =========================

Environment           Status    Duration
--------------------  --------  ------------
genesis_mini_offline  SUCCESS   00:00:18.902
========================= 1 succeeded in 00:00:18.902 =========================
```

Clean re-run reported **`PIO_EXIT=0`**. Binary on disk:

```
.pio/build/genesis_mini_offline/firmware.bin   (893 KB)
```

## Bonus: native Unity test (`pio test -e native`, exit 0)

```
test/test_braille/test_braille.cpp:64: test_a_is_dot1_only          [PASSED]
test/test_braille/test_braille.cpp:65: test_c_is_dots_1_4           [PASSED]
test/test_braille/test_braille.cpp:66: test_l_is_dots_1_2_3         [PASSED]
test/test_braille/test_braille.cpp:67: test_w_is_dots_2_4_5_6       [PASSED]
test/test_braille/test_braille.cpp:68: test_all_26_from_dot_lists   [PASSED]
test/test_braille/test_braille.cpp:69: test_uppercase_matches_lowercase [PASSED]
test/test_braille/test_braille.cpp:70: test_non_letters_are_zero    [PASSED]
================== 7 test cases: 7 succeeded in 00:00:02.994 ==================
```

The `test_all_26_from_dot_lists` case re-derives every mask from first-principles UEB dot lists
(`dots({1,2,3})` etc.) and compares against `brailleMask()` — an **independent** cross-check of the
acceptance-critical table, not a copy of the hex under test. All 26 agree.

---

## For the bench (first flash, not blocking the build)

- Confirm the module's flash marking; if it is a 4 MB part (not the assumed `-N8` 8 MB), add
  `board_upload.flash_size = 4MB` + a fitting `board_build.partitions` before upload (Phase 1C §a).
- USB-CDC boot gotcha: if the port vanishes after a crash, enter download mode (hold BOOT, tap RESET)
  to re-flash (Phase 1C §c).
- Fill `src/secrets.h` with the real hotspot SSID/pass + deployed `VERCEL_HOST` (git-ignored template).
- If the ST7735 colours/offset look wrong, switch `INITR_BLACKTAB` → `GREENTAB`/`REDTAB` in `display.cpp`.
