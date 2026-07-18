# Bus-Stop Situational Awareness — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a wrist-worn ESP32-S3 device that tells a DeafBlind user, entirely through two passive buzzers driven as haptic actuators, that a siren is approaching, that something is close in front of them, and **which bus just pulled in**.

**Architecture:** Three inputs, one output. A PDM microphone feeds an on-device FFT that fires a coarse haptic alert in ~79 ms and a confirmed-siren classification in 1–2 s. A VL53L0CX ToF gives a purely local proximity reflex with no network in the path. A phone browser POSTs frames at 2 Hz to a Modal endpoint that runs YOLO26n, holds two seconds of detection history, latches exactly one `BUS_ARRIVED` event, crops the destination blind and asks Claude to read it under a strict JSON schema; the answer travels to the board through the existing Vercel + Upstash polling relay. The two AX22-0018 buzzers are 33.941 mm apart, so pure spatial left/right is unavailable — the default vocabulary stays time-coded, and left/right navigation is *attempted* through a per-side frequency contrast (felt pitch, not felt position). See the Revision note below.

**Tech Stack:** ESP32-S3-MINI-1 (Arduino-ESP32 3.x / ESP-IDF v5.x, FreeRTOS, LEDC in **tone** mode, I2S0 PDM→PCM, `arduinoFFT<float>`, `Adafruit_VL53L0X`, `ArduinoJson` v7) · 2× AX22-0018 passive buzzer (MLT-8530) · Modal 1.5.2 + Ultralytics YOLO26n on T4 · `anthropic` 0.117.0 with `output_config.format` structured outputs · Next.js 16.2.10 on Vercel + Upstash Redis · in-browser `getUserMedia` capture on the phone (Python/OpenCV survives only inside Modal, not on a laptop) · build123d via `cad/tests/fake_adsk` for CAD.

**Evidence legend.** Every measured claim below traces to one of four audit files. They are authoritative over anything else in the repository.

| Tag | File |
|---|---|
| **T1** | `audit/bus-stop-situational-awareness/01-track-1-physical-cad-ground-truth.md` |
| **T2** | `audit/bus-stop-situational-awareness/02-track-2-modal-claude-grounding-and-hardcoded-spec.md` |
| **T3** | `audit/bus-stop-situational-awareness/03-track-3-transcript-and-gesture-vocabulary.md` |
| **T4** | `audit/bus-stop-situational-awareness/04-track-4-system-firmware-architecture.md` |

`plan/archive/` holds three superseded plans. **Do not build from them.** Their headers list claims that these four tracks disproved.

---

## Revision 2026-07-18b — Actuator swap, mobile capture, L/R navigation attempt

This revision overrides earlier rulings where they conflict. Three changes, all landing after the four audit tracks were written; where a track finding is contradicted, **this section wins and states the reason.** Downstream mentions of "motor", "ERM", "duty %", and "laptop webcam" elsewhere in this document should be read through this revision.

**1. The two ERM motors are replaced by two AX22-0018 passive buzzers.** The ERMs could not be sourced in time; the buzzer ships in the Genesis Mini Starter Kit and is in hand. It is an **MLT-8530 electromagnetic** (magnetic, not piezo) transducer on a 22×22 mm module — 2.7 kHz resonant, 80 dB — driven by a **single Signal-pin PWM** (header `G / Vin / S`); there is no second drive channel and no amplitude-by-duty knob the way an ERM has [`parts/Axiometa Genesis Mini - Starter Kit/passive-buzzer/CONTENT.md`]. This flips the drive model from *duty-cycle amplitude* to *frequency (tone)* and flips the output physics from inertial vibration to acoustic diaphragm motion. **We drive the buzzer at a low frequency to elicit a felt buzz rather than an audible tone.** This is an experiment: a sealed magnetic buzzer is not a tactile actuator, so the felt output may be weak. A first-hour wear test (Task 13-adjacent) decides whether the tactile path is viable or whether the device falls back to audible-tone signalling for a hearing companion. The overdrive-kick / start-voltage analysis written for the ERM is **moot** — buzzers have no stiction and no inrush.

**2. Camera capture moves from the laptop Python client to a mobile-ready web app.** [T4 §Decision 1] locked `cv2.VideoCapture(0)` on the laptop and explicitly rejected a browser app; that ruling is **reversed by request.** Capture is now a route in the existing Next.js app (`app/`), served over HTTPS on the same Vercel deployment, using `getUserMedia({ video })` + a `<canvas>` grab at 2 Hz. `app/app/page.tsx:176-191` already calls `getUserMedia` for audio, so the permission/stream idiom is already in-repo. `vision/bus_client.py` is **cut**; `vision/bus_vision.py` (Modal) and `vision/read_blind.py` remain. The trade [T4 §Decision 1] warned of — iOS Safari permission UX, a possible reload-and-re-grant on stage — is now **accepted, not avoided**; rehearse the grant flow before the demo.

**3. Left/right navigation is back in scope, as an explicit attempt.** [T3 D14/D20] cut LEFT/RIGHT/AHEAD and retired all spatial coding because the two ports are a fixed 33.941 mm apart — below the ~70 mm forearm two-point threshold. **That geometry is unchanged by the swap** and pure spatial localization stays unavailable. What the buzzer newly enables is a **per-side frequency contrast**: each side is driven at a distinct low band, so L/R is carried by felt *pitch*, not felt *position*. This is added as an experimental pattern block (P11–P13 in the vocabulary), gated behind the same wear test, carrying an honest "may not discriminate" caveat. It is only meaningful if change 1's tactile path proves viable at all.

---

## Global Constraints

Every task's requirements implicitly include this section.

1. **Today is 2026-07-18. The hack ends 2026-07-19. Roughly 1.5 days remain.** Sequencing beats completeness. The Cut List near the end is binding when the clock runs out.
2. **Hardcoding is sanctioned.** Route **88**, destination **Clapham Common**. No configuration knobs, no generality, no "make this pluggable".
3. **No soldering. All modules are AX22 snap-in. No extension kit, no ribbon leads, no purchased extras.** All four ports are occupied and every part is in hand.
4. **The two buzzers are 33.941 mm apart on the {1,3} diagonal** — the maximum the board allows, and 48 % of the ~70 mm forearm two-point-discrimination threshold [T1 §Motor Separation Finding]. **Pure spatial left/right localization is unachievable; the default vocabulary stays time-coded.** The buzzer swap adds one lever the ERMs lacked — a **per-side frequency contrast** — so L/R is *attempted* via felt pitch, not felt position (see the Navigation block, P11–P13). The phrase "opposite sides of the wrist" still describes a physically impossible *spatial* arrangement and must not be used to claim spatial localization; any L/R claim rests on frequency discrimination and the wear test, not geometry.
5. **Buzzer Signal pins drive from Port 1 and Port 3.** The AX22-0018 header is `G / Vin / S` — a single Signal line per buzzer plus power and ground; there is no second drive channel. Working assumption: Signal → **GPIO3 (Port 1)** and **GPIO16 (Port 3)**, reusing the ERM diagonal. **Confirm the Signal-pin-to-IO mapping against `parts/Axiometa Genesis Mini - Starter Kit/passive-buzzer/files/SCH_AX22-0018.pdf` and the module silk before first drive** — it was derived for the ERM (AX22-0013), not this part. The committed `firmware/braille_wearable/src/pins.h:9-10` says GPIO4/GPIO9 and is **wrong** for either part; with those pins nothing sounds and it looks like dead hardware.
6. **The microphone binds to `I2S_NUM_0`. Never `I2S_NUM_1`, never `I2S_NUM_AUTO`.** The PDM-to-PCM converter exists on I2S0 only, and binding I2S1 fails silently by yielding a raw bitstream [T3 §PDM capture, T4 §TRAP 1].
7. **The ToF → haptic reflex and the siren → haptic reflex are fully local.** No network in either path. The device must work with Wi-Fi unplugged for both safety tiers.
8. **Power: a ≥1 A (≥5 W) USB-C source — kept for margin, but its old binding reason is gone.** That constraint was 2 × ERM inrush [T1 §Old Global Constraints row 3]. Two MLT-8530 buzzers draw on the order of ~30 mA each with no inertial inrush, so the rail is comfortable now; ESP32-S3 + Wi-Fi transients dominate. Keep ≥1 A anyway — headroom is free.
9. **The ESP32 is outbound-only.** It polls `https://app-eight-lyart-98.vercel.app/api/pull` every 300 ms and never accepts an inbound connection.
10. **Serverless is stateless; all shared state lives in Upstash Redis.** The one exception is the Modal container's own arrival state machine, which is safe only because `max_containers=1` pins it to a single process.
11. **Pin versions exactly:** `modal==1.5.2`, `anthropic==0.117.0`, `kosme/arduinoFFT@^2.0.4`, `bblanchon/ArduinoJson@^7.4.3`, `adafruit/Adafruit_VL53L0X@^1.2.4`, `next@16.2.10`, `@upstash/redis@^1.38.0`.
12. **Use Anthropic's first-class structured outputs** (`output_config.format` + `json_schema`). Prompt-only JSON is the weakest available mechanism and **assistant prefill now returns 400** on Opus 4.8 [T2 §Claude Vision 3].
13. **"We have not validated with DeafBlind users."** That sentence survives into every artefact, unchanged. The community norm is "nothing about us without us". The transcript's *"we've talked to them"* is genuinely ambiguous [T3 D15] and **no claim may be built on it**.
14. **`parts/` is a catalogue mirror, not an inventory.** Absence of a folder is evidence about Axiometa's product listing and says nothing about what is on the bench [T1 §Inference trap].
15. **No component in this build has a display or a control knob.** The wrist is the only output channel. There is no on-device ground truth, which is why the acceptance test in Task 17 exists.

---

## Do This First

**Three things block everything else and all three are unattended waiting. Start them before you read another line.**

### 1. The PlatformIO toolchain — the longest-lead item in the build

`firmware/braille_wearable/platformio.ini:18` pins `default_envs = genesis_mini_offline`, which resolves to `espressif32@7.0.1` → Arduino-ESP32 **2.0.17** → ESP-IDF **v4.4.7**. **`driver/i2s_pdm.h` does not exist in v4.4.7** — the raw GitHub path 404s — so **the siren feature cannot compile at all** in the default environment [T4 §Build Mechanics]. The build must move to `env:genesis_mini` (Arduino 3.3.x → ESP-IDF v5.5.x), whose platform is **not cached on this machine** (`~/.platformio/platforms/` contains only `espressif32` and `native`). First build downloads platform + core + GCC-14, roughly **1 GB**.

```bash
cd /Users/haidertoha/Code/axiometa-ant-hack/firmware/braille_wearable
pio run -e genesis_mini
```

Expected: a long download, then `SUCCESS` with a RAM/Flash summary. Run it **now, on good wifi**, in a background terminal. It does not need the board attached.

| Arduino-ESP32 | ESP-IDF | `driver/i2s_pdm.h` | LEDC API |
|---|---|---|---|
| 2.0.17 (current `default_envs`) | v4.4.7 | ❌ legacy `driver/i2s.h` only | `ledcSetup` + `ledcAttachPin` |
| 3.3.x (`env:genesis_mini`) | v5.5.x | ✅ | `ledcAttach(pin, freq, bits)` |

**Contingency if the download fails at the venue:** build the siren tier against the legacy `driver/i2s.h` API (`I2S_MODE_PDM` + `i2s_set_pdm_rx_down_sample(I2S_NUM_0, I2S_PDM_DSR_8S)`), which does work on 2.0.17. That costs an afternoon of API translation. Downloading tonight costs twenty minutes of waiting.

### 2. Modal billing — a two-minute task that can cost an hour at 3 a.m.

Modal's own documentation states verbatim: *"Note that you must have a payment method on file in order to use Modal."* Third-party blogs claim Starter needs no card; **Modal's docs are the authority and they contradict them** [T2 §Modal 2].

```bash
pip install "modal==1.5.2"
modal setup                     # browser auth
modal secret create anthropic ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"
```

Then open https://modal.com/settings/billing and confirm a payment method is listed. Expected: a card on file, Starter plan, `$30 / month free credits`.

### 3. Calipers on the microphone — 60 seconds, two answers, both load-bearing

**AX22-0044 (marking T3902) is in hand.** It has no folder under `parts/` because it is a new product not yet on the Axiometa catalogue — uncatalogued, not absent [T1 §Inference trap]. There is no STEP file, so two dimensions cannot be measured from CAD and must be measured with calipers and eyes:

- **Z height above its own module PCB top.** Available headroom is **4.64 mm** (deck inner face +16.25 minus module PCB top +11.61) [T1 §Derived mated stack]. The ERM uses 3.685 mm. **The tallest non-encoder module in the AX22 family, the DHT11, is 5.835 mm** — so a collision is plausible, not hypothetical. If the mic exceeds 4.64 mm, raise `Z_ROOF_INNER` and `Z_ROOF_OUTER` in `cad/braille_wearable_enclosure.py` by the difference and recompute the ToF aperture for the larger air gap.
- **Whether the MEMS port is top- or bottom-firing.** All 10 measured AX22 modules place their functional component on the +Z face, so **top-firing is much more likely — but that is an inference from other modules, not a measurement of this one** [T1 §Microphone Acoustic Port]. Top-firing → a Ø3.0 hole through the deck at (−12, +12). Bottom-firing → that hole does nothing and the interior must be vented instead.

Write both answers into this plan's Task 16 before the print starts.

### 4. Start the print as soon as Task 16's STL exists

37.01 cm³ measured, ~3–4.5 h estimated (not sliced). **Black or dark filament, 10–15 % infill.** Dark filament for bore-wall IR absorption at the ToF aperture; low infill matters even more now — a passive buzzer's felt output is already weak, so **the enclosure must not damp it**. Keep the P1 open-reveal well so buzzer A couples directly to the wrist, and treat the P3 louvre grille as the vent for the audible fallback. This is machine time, not person time — it runs while firmware is written. [T1 §Three caveats, amended by Revision §1]

---

## Asset Inventory

### Hardware — **there are no GAP items**

Earlier drafts assumed a missing microphone. That assumption was wrong, and its correction is what makes the four-port map complete.

| Asset | Status | Notes |
|---|---|---|
| Axiometa Genesis Mini (ESP32-S3-MINI-1-N4R2) | **REUSE / IN-HAND** | 55.000 × 55.000 mm PCB, MEASURED-FROM-STEP [T1] |
| VL53L0CX ToF, AX22-0015 | **REUSE / IN-HAND** | `parts/distance-sensor-vl53l0cx/files/AX22-0015.step` |
| ~~ERM vibration motor ×2, AX22-0013~~ | **CUT — could not source in time** | Superseded by the buzzer below (Revision §1) |
| **Passive buzzer ×2, AX22-0018 (MLT-8530)** | **REUSE / IN-HAND** | `parts/Axiometa Genesis Mini - Starter Kit/passive-buzzer/`. 22×22 mm module, single Signal-pin PWM, STEP present so Z is CAD-derivable. Driven low-freq for felt buzz — tactile viability is a wear-test question |
| **PDM microphone, AX22-0044, marking T3902** | **REUSE / IN-HAND** | **No `parts/` folder, no STEP, no public product page — new uncatalogued hardware.** Footprint is `ASSUMED-AX22-STANDARD`; Z height and port face need calipers (Do This First §3) |
| USB-C source, ≥1 A | **REUSE / IN-HAND** | Constraint 8 |
| 20 mm strap + Ø2.5 pins | **REUSE / IN-HAND** | Drives `LUG_GAP = 20.0`, not 22.0 |
| FDM printer + dark filament | **REUSE / IN-HAND** | Task 16 |
| **Phone with rear camera + modern browser** | **REUSE / IN-HAND** | The camera host (Revision §2). Runs the `getUserMedia` capture page over HTTPS; replaces the laptop webcam. Needs the venue Wi-Fi/hotspot, nothing installed |
| A3 bus-front print **or** an 11–13″ tablet | **NET-NEW** | Task 17. Build the tablet version first — it needs no printer |
| Calipers | **REUSE / IN-HAND** | 60 seconds of work, two load-bearing answers |

**No GAP items in hardware.** Every port is populated, nothing needs sourcing, nothing needs soldering.

### Firmware — `firmware/braille_wearable/`

The directory keeps its legacy name to avoid churning PlatformIO paths. Nothing inside it will be about braille when Task 2 finishes.

| Path | Verdict | Detail |
|---|---|---|
| `platformio.ini` | **REUSE (modify)** | `default_envs` → `genesis_mini`. Keep `-DARDUINO_USB_MODE=1` / `-DARDUINO_USB_CDC_ON_BOOT=1` (:33-34) — hard-won and still correct. Keep `[env:native]` (:75-78) unchanged; it is the TDD asset |
| `src/net.cpp` · `src/net.h` | **REUSE (modify) — the most valuable software asset in the repo** | `wifiJoin()` (`net.cpp:14-31`) keep verbatim including `setInsecure()` (:27); keep the `seq` gate (:54-56) and the v7 `JsonDocument` (:50); `postReply()` (:67-84) is the template for `/api/event` |
| `src/pins.h` | **REUSE (modify) — contains a bug** | `MOTOR_L 4` / `MOTOR_R 9` → `3` / `16` |
| `src/secrets.h` | **REUSE unchanged** | Committed template; `.gitignore:5-6` already ignores the real one |
| `src/braille_wearable.cpp` | **REUSE (~20 %)** | `setup()` ordering (:71-91) and `repeatPressed()` (:58-69, a correct active-high GPIO45 debounce) survive; everything else goes |
| `src/braille.cpp` · `src/braille.h` | **DELETE** | **Not adaptable.** `beat()`/`buzzLetter()`/`buzzWord()` are a `delay()` chain that blocks the MCU for up to ~48 s. There is no state machine to adapt. **Only the five timing constants at `braille.cpp:12-16` survive** — 400 / 300 / 800 / 1500 / 100 ms |
| `src/display.cpp` · `src/display.h` | **DELETE** | Out of BOM; Port 2 reallocated to the ToF |
| `src/encoder.cpp` · `src/encoder.h` | **DELETE** | Out of BOM; Port 4 reallocated to the microphone |
| `test/test_braille/` | **DELETE (content) / REUSE (technique)** | It proves `[env:native]` works and demonstrates re-deriving the table under test rather than copying it (`:33-48`). Mirror that technique |
| `src/haptic_pure.h` | **NET-NEW** | Arduino-free sequencer + arbitration. Host-testable |
| `src/haptic_route_pure.h` | **NET-NEW** | Quinary route encoder. Host-testable |
| `src/patterns.h` | **NET-NEW** | The 11 base pattern tables + the 3 experimental nav patterns (P11–P13). Each step is a `(freq, on/off)` pair, not a duty. Host-testable |
| `src/siren_pure.h` | **NET-NEW** | Siren decision logic over a magnitude array. Host-testable |
| `src/haptic.cpp` · `src/haptic.h` | **NET-NEW** | LEDC **tone** glue (`ledcAttach(pin, freq, res)` + `ledcWriteTone(pin, hz)`, or `ledcWrite` at 50 % duty for a given freq) + `hapticTask`. No duty-amplitude control — steps set a frequency or 0 |
| `src/audio.cpp` · `src/audio.h` | **NET-NEW** | I2S0 PDM capture + FFT + `audioTask` |
| `src/tof.cpp` · `src/tof.h` | **NET-NEW** | VL53L0X continuous ranging |
| `src/main.cpp` | **NET-NEW** (from `braille_wearable.cpp`) | `setup()` + `loop()` = ToF and button only |

### Web app — `app/`

| Path | Verdict | Detail |
|---|---|---|
| `app/app/lib/redis.ts` | **REUSE (modify) — high value** | The **MSET-before-INCR ordering** (`:27-29`) is a debugged race fix; the comment at `:20-22` explains why. Keep the ordering, change the keys. Delete `setSuggestions`/`getMemory`/`setChoice`/`takeChoice` (:50-81) |
| `app/app/api/pull/route.ts` | **REUSE (near-verbatim)** | `force-dynamic` + `Cache-Control: no-store` + `Access-Control-Allow-Origin: *` (:6-11) and the `OPTIONS` preflight (:18-28) are exactly what the board and the debug screen need. Add a `POST` handler for telemetry |
| `app/app/api/push/route.ts` | **REUSE → `api/event/route.ts`** | Structure is right; the server-side sanitiser (:8-13) is a good instinct. Swap it for `ROUTE_RE` + a `CloudPattern` allow-list |
| `app/app/lib/contract.ts` | **REUSE (principle) / replace (types)** | One shared source of truth mirrored by the firmware struct is the right idea; every current type is braille-era |
| `app/app/page.tsx` | **REUSE (~15 %)** | The **poll-with-in-flight-guard** idiom (`:336-359`, `pullInFlightRef`) prevents request pile-up when the network stalls — genuinely valuable. Keep it and the `useEffect`+`setInterval`+cleanup shape (`:376-382`) |
| `app/app/api/{stt,tts,condense,suggest,reply,reply-result}/` | **DELETE — all six** | Speech pipeline. Deleting them also removes two unauthenticated paid-API endpoints |
| `app/app/lib/anthropic.ts` | **DELETE** | Claude now runs server-side inside Modal. Its `parseModelJson` is superseded by `output_config.format`, and keeping the file invites someone to reach for the dead pattern |
| `app/app/lib/braille.ts` · `braille.test.ts` | **DELETE** | Dead idea. The vitest wiring in `package.json:10` survives |
| `app/app/components/*` (3 files) | **DELETE** | All speech / reply-loop UI |
| `app/package.json` | **REUSE (modify)** | Remove `@anthropic-ai/sdk`. Keep everything else |
| Vercel project link + Upstash env | **REUSE unchanged** | `haider-projects/app`, stable alias `app-eight-lyart-98.vercel.app`, `UPSTASH_*` already set at Production scope |
| `app/app/api/state/route.ts` · `api/detector/route.ts` · `lib/contract.test.ts` | **NET-NEW** | Debug-screen feed and its tests |
| `app/app/capture/page.tsx` (or a `?capture` mode on `page.tsx`) | **NET-NEW** | Mobile capture page (Revision §2): `getUserMedia({video})` + `<canvas>` grab at 2 Hz → POST to Modal. Adapt the existing audio `getUserMedia` at `page.tsx:176-191`. Served over the existing HTTPS Vercel origin |

### Vision — `vision/` (net-new directory)

| Path | Verdict |
|---|---|
| `vision/bus_vision.py` | **NET-NEW** — the Modal app |
| ~~`vision/bus_client.py`~~ | **CUT (Revision §2)** — laptop capture replaced by the in-browser `getUserMedia` page in `app/` |
| `vision/read_blind.py` | **NET-NEW** — standalone Claude call, developed and timed before it is pasted into Modal |
| `vision/requirements.txt` | **NET-NEW** |

### CAD — `cad/`

| Path | Verdict | Detail |
|---|---|---|
| `cad/braille_wearable_enclosure.py` | **REUSE (modify) — the chosen design** | Ten one-line deletions produce a closed body in 0.24 s. **Also reconcile `MOTOR_TOP = 15.25` (ERM body top) with the AX22-0018 buzzer height measured from `parts/.../passive-buzzer/files/AX22-0018.step`** — if the buzzer module is taller, raise `Z_ROOF_INNER`/`Z_ROOF_OUTER` by the difference; the 22×22 mm footprint is unchanged (Revision §1) |
| `cad/tests/test_enclosure_build.py` | **REUSE (modify)** | Update two lug-bore probes and add two aperture probes |
| `cad/tests/fake_adsk/` | **REUSE unchanged** | A real build123d engine, not a stub. **Fusion 360 is not required for anything in this plan** |
| `cad/braille_wearable_exocage.py` | **LEAVE ALONE** | Not used. Do not edit it; its `POST_INNER = 22.0` is a trap (see Task 16) |

---

## Port Map

Port centres are **MEASURED-FROM-STEP** (`parts/Axiometa Genesis Mini - Starter Kit/axiometa-genesis-mini/files/STP_MTX0013.step`, socket-pair centroids, max deviation 0.001 mm) [T1].

| Port | Centre | Module | Signal |
|---|---|---|---|
| **P1** | (−12.000, −12.000) | **Buzzer A (left)** | Signal = **GPIO3** (verify vs SCH_AX22-0018) |
| **P2** | (+12.000, −12.000) | **VL53L0CX ToF** | SDA = GPIO10, SCL = GPIO11 (shared bus) · XSHUT = IO0 = GPIO7 |
| **P3** | (+12.000, +12.000) | **Buzzer B (right)** | Signal = **GPIO16** (verify vs SCH_AX22-0018) |
| **P4** | (−12.000, +12.000) | **PDM microphone (AX22-0044)** | CLK + DATA on two of GPIO1 / GPIO17 / GPIO18 — **read the silk at bring-up**. Bind to **I2S0** |

- Diagonals are **{1,3}** and **{2,4}**. P1↔P3 = **33.941 mm**; P1↔P2 = 24.000 mm (adjacent). Buzzers take the diagonal for maximum separation — which still falls short of spatial two-point discrimination, so L/R rides on the per-side frequency contrast, not this distance.
- ToF I²C address is **0x29 (7-bit)** / 0x52 (8-bit write), fixed in silicon. One sensor, no collision. XSHUT is not required for single-sensor operation.
- **The PDM CLK/DATA assignment is the one unverified row.** No pinout image or CAD exists for AX22-0044, so it cannot be derived the way XSHUT was (by comparing header silk position-by-position across two modules). **Read it off the module's silkscreen.** An explicitly flagged unknown is more useful than a plausible wrong pin — do not let anyone guess it [T1 §Corrected Port Map].
- Pin choice is otherwise free: ESP32-S3 routes I²S through the GPIO matrix, so any of GPIO1/17/18 can carry either signal. **The peripheral choice is not free — it must be I2S0.**

---

## Data Contracts

Four contracts, all literal, all worked with route 88.

### Contract A — phone → Modal

```jsonc
// POST https://<workspace>--bus-vision-ingest.modal.run
{ "frame_b64": "/9j/4AAQSkZJRgABAQAAAQ…9k=",   // ~120 kB base64 of a 1280×720 q85 JPEG
  "force": false }                              // true only for the disclosed SPACE key
```

```jsonc
// 200 response
{ "event": "BUS_ARRIVED",        // "NONE" | "BUS_ARRIVED" | "BUS_GONE"
  "present": true,
  "confidence": 0.83,            // best bus-box confidence this frame
  "arrival_id": 1,               // increments once per arrival — the fire-once latch
  "reading": null,               // null until Claude answers
  "reading_ready": false,
  "votes": [] }                  // Claude's raw route strings once it has answered
```

**The frame-by-frame walk, literally.**

```jsonc
// frame N   — nothing in view
{"event":"NONE","present":false,"confidence":0.0,"arrival_id":0,
 "reading":null,"reading_ready":false,"votes":[]}

// frame N+1 — prop raised, first detection, NOT enough evidence yet
{"event":"NONE","present":false,"confidence":0.71,"arrival_id":0,
 "reading":null,"reading_ready":false,"votes":[]}

// frame N+2 — second consecutive detection, LATCH FIRES
{"event":"BUS_ARRIVED","present":true,"confidence":0.83,"arrival_id":1,
 "reading":null,"reading_ready":false,"votes":[]}

// frame N+7 — ~2.5 s later, three concurrent Claude votes have returned
{"event":"NONE","present":true,"confidence":0.85,"arrival_id":1,
 "reading":{"route":"88","destination":"Clapham Common","confidence":"high"},
 "reading_ready":true,"votes":["88","88","88"]}
```

### Contract B — phone browser → Vercel

The **browser capture page** is now the only component that understands both the detector's vocabulary and the device's (Revision §2 — it inherits this role from the cut laptop client). It translates Modal's detector response into a `CloudPattern`, and it POSTs to `/api/event` **only on change** — the relay is edge-triggered on `seq`, so re-posting an unchanged state would re-fire the haptic. (Alternatively Modal POSTs to `/api/event` directly; keep it in the browser so the one component that speaks both vocabularies also owns the edge-trigger.)

```ts
// app/app/lib/contract.ts — REPLACES Mode / PullResponse / Choice / KEYWORD_MAX
export type PatternId =
  | "NONE"      // no active command
  | "READY"     // P0  boot complete
  | "DANGER"    // P1  confirmed siren, amplitude rising   (device-local; never sent)
  | "SIREN"     // P2  confirmed siren, flat or falling    (device-local; never sent)
  | "ATTENTION" // P3  Tier-2a band-energy alert           (device-local; never sent)
  | "PROXIMITY" // P4  ToF advisory                        (device-local; never sent)
  | "BUS"       // P5  bus arriving
  | "NUMBER"    // P6  route number — uses `route`
  | "WAIT"      // P7  request in flight
  | "UNKNOWN"   // P8  could not read / low confidence
  | "ACK"       // P9  button feedback                     (device-local; never sent)
  | "ERROR";    // P10 degraded

/** Cloud-originated commands only. The five local patterns never cross the wire. */
export type CloudPattern = "NONE" | "BUS" | "NUMBER" | "WAIT" | "UNKNOWN" | "ERROR";

export interface EventRequest {
  pattern:   CloudPattern;
  route:     string;                 // "" unless pattern === "NUMBER"
  dest:      string;                 // debug screen ONLY — the device ignores this field
  conf:      "high" | "low" | "";
  arrivalId: number;
}

export interface DeviceCommand {
  seq:       number;                 // monotonic; the device's edge-trigger
  pattern:   CloudPattern;
  route:     string;
  dest:      string;
  conf:      "high" | "low" | "";
  arrivalId: number;
  ts:        number;                 // ms epoch of the server write — staleness check
}

export interface Telemetry {
  bandRms: number; peakHz: number; modIdx: number;
  trend: "rising" | "flat";
  playing: PatternId; tofMm: number; upMs: number; rssi: number;
}

export interface DetectorState {
  event: string; present: boolean; confidence: number; arrivalId: number;
  route: string; destination: string; readingConf: string; votes: string[];
}

export interface DebugState {
  seq: number;
  device: Omit<DeviceCommand, "seq">;
  detector: DetectorState;
  telemetry: Telemetry;
}

/** Route numbers longer than this cannot be delivered inside a bus dwell. */
export const ROUTE_MAX_DIGITS = 3;
/** Quinary encoding covers digits only. A route containing a letter is rejected server-side. */
export const ROUTE_RE = /^[0-9]{1,3}$/;
export const CLOUD_PATTERNS: readonly CloudPattern[] =
  ["NONE", "BUS", "NUMBER", "WAIT", "UNKNOWN", "ERROR"] as const;
```

**The locked demo, in order, literally.**

```jsonc
// t = 0.00 s   browser → POST /api/event      (YOLO latched arrival_id 1)
{ "pattern":"BUS", "route":"", "dest":"", "conf":"", "arrivalId":1 }
// ← 200 {"seq":7}

// t = 0.10 s   browser → POST /api/event      (Claude in flight)
{ "pattern":"WAIT", "route":"", "dest":"", "conf":"", "arrivalId":1 }
// ← 200 {"seq":8}

// t = 2.60 s   browser → POST /api/event      (3 concurrent votes agreed on "88")
{ "pattern":"NUMBER", "route":"88", "dest":"Clapham Common", "conf":"high", "arrivalId":1 }
// ← 200 {"seq":9}
```

### Contract C — ESP32 ↔ Vercel

```jsonc
// ESP32 → POST /api/pull  every 300 ms.  Request body = telemetry for the debug screen.
{ "bandRms":312.4, "peakHz":940, "modIdx":0.62, "trend":"rising",
  "playing":"NUMBER", "tofMm":842, "upMs":93000, "rssi":-58 }

// ← 200 response = the command. 108 bytes on the wire.
{ "seq":9, "pattern":"NUMBER", "route":"88", "dest":"Clapham Common",
  "conf":"high", "arrivalId":1, "ts":1784419200123 }
```

`GET /api/pull` stays implemented (same handler, empty telemetry) purely so the endpoint remains `curl`-able — that is how the existing relay was smoke-tested and it is worth six extra lines.

What the board actually holds:

```c
// src/net.h — REPLACES struct PullResult (net.h:10-15)
enum : uint8_t { CONF_NONE = 0, CONF_LOW, CONF_HIGH };

struct DeviceCommand {
    long    seq       = 0;
    uint8_t pattern   = PAT_NONE;   // string → enum ONCE, at parse time
    char    route[8]  = {0};        // "88" · "205" · longest UK route "N550" is 4 chars
    uint8_t conf      = CONF_NONE;
    long    arrivalId = 0;
};                                  // sizeof == 24 bytes. No String. No vector. No heap.
```

Three deliberate RAM decisions [T4 §Contract C]:

1. **`dest` is parsed and discarded.** It exists for the debug screen; the device has nothing to show it on. Never store it.
2. **`pattern` becomes a `uint8_t` at parse time.** The old `PullResult` kept `String mode` and compared it with `pr.mode == "forward"` — a heap allocation and a `strcmp` three times a second, forever.
3. **`route` is a fixed `char[8]`.** The old `std::vector<String> replies` allocated on every poll. Fixed arrays cannot fragment the heap.

```c
static const size_t PULL_BODY_MAX = 512;   // reject anything larger BEFORE parsing
// Measured: the 108-byte response above deserialises into ~230 bytes of ArduinoJson v7 pool.
```

### Contract D — debug screen

```jsonc
// GET /api/state  — browser only, ~700 B, polled at 500 ms by the Next.js page
{ "seq": 9,
  "device":    { "pattern":"NUMBER","route":"88","dest":"Clapham Common",
                 "conf":"high","arrivalId":1,"ts":1784419200123 },
  "detector":  { "event":"NONE","present":true,"confidence":0.85,"arrivalId":1,
                 "route":"88","destination":"Clapham Common","readingConf":"high",
                 "votes":["88","88","88"] },
  "telemetry": { "bandRms":312.4,"peakHz":940,"modIdx":0.62,"trend":"rising",
                 "playing":"NUMBER","tofMm":842,"upMs":93000,"rssi":-58 } }
```

`telemetry` is the ESP32's own state, written to Redis by `/api/pull` on each poll. **This is what makes the siren tier visible to an audience** — without it the FFT is invisible and judges have to take the buzz on faith.

---

## The Haptic Vocabulary — 11 patterns, all time-coded

Two AX22-0018 passive buzzers, 33.941 mm apart. The **default** vocabulary (P0–P10) depends on *which side fires only via the both-vs-one presence rule*, never on spatial localization. The **navigation** block (P11–P13, experimental) deliberately does encode side — via a per-side frequency contrast, not position. [T3 §Locked Gesture Vocabulary, amended by Revision §1/§3]

> **Buzzer caveat carried into every rule below.** These patterns were authored for ERMs, whose control channel is *amplitude* (duty). A passive magnetic buzzer's control channel is *frequency* (tone), and its felt output is diaphragm motion, not inertial vibration. Where a rule below says "duty %", read it as "map to a drive **frequency/tone**": the buzzer is driven at a **low fundamental (~60–200 Hz square wave, ~50 % duty)** to trade its 2.7 kHz acoustic job for a felt buzz. Loudness/intensity is *not* a clean channel on this part, so patterns that leaned on MED-vs-FULL amplitude now lean harder on **count, rhythm and duration**. A first-hour wear test confirms any of this is felt at all.

### Design rules

1. **Default patterns are L/R-agnostic; the navigation block is the one exception.** For P0–P10, 33.941 mm against a ~70 mm two-point threshold still means no side-localization claim. **The navigation block (P11–P13) is a deliberate, bounded L/R attempt** and it — and only it — requires a blindfold wear test to decide whether the per-side frequency contrast is discriminable. If that test fails, P11–P13 are cut and the rest of the build is unaffected [T3 D20, amended].
2. **BOTH buzzers = the world. ONE buzzer = the device.** External events (danger, sirens, buses, numbers) fire both; internal state (proximity, acknowledgement, waiting, errors) fires one. On ERMs this was an amplitude ("strong vs weak") distinction; on buzzers it is a **two-source-vs-one-source presence** distinction — coarser and itself a wear-test item, but it still halves the recognition space before any counting. If both-vs-one proves unreliable, fall back to distinguishing these classes by rhythm alone.
3. **Frequency is the primary channel; loudness is not.** Usable design: a **buzz band ≈ 60–120 Hz** and an **alert band ≈ 180–250 Hz**, both felt as coarse "low" vs "high" texture, plus plain on/off gating. Do not design meaning onto fine amplitude steps — the buzzer cannot deliver them.
4. **Proven timing primitives reused, not reinvented** (`firmware/braille_wearable/src/braille.cpp:12-16`): buzz 400 ms · beat gap 300 ms · letter gap 800 ms (reused as the inter-digit gap). The both-fire stagger is retained at 30 ms only for onset legibility, not electrical reasons (see rule 5).
5. **No electrical stagger is needed.** The ERM rule staggered onsets to halve 2×90 mA inrush on a shared rail; buzzers have **no inrush**, so that reason is void. Keep a 30 ms both-fire stagger *only if* the wear test shows it improves onset legibility — otherwise fire both simultaneously.
6. **Every pattern is a step table** driven by a 10 ms tick. Arbitration is a pointer store; all timing stays off the main loop. Each step now carries a **(freq, on/off)** pair instead of a duty %.
7. **No overdrive kick.** It existed to break ERM stiction on unknown start voltage — a problem buzzers do not have. Onsets are clean; drive straight to the target frequency.

### Driving a passive buzzer for touch, not sound

The AX22-0018 is built for **audible** output — MLT-8530, 2.7 kHz resonant, 80 dB [`passive-buzzer/CONTENT.md`]. We are using it off-label: driven near resonance it is a loud tone (useless to a DeafBlind user and antisocial in a demo room); driven at a **low fundamental it becomes a coarse tactile buzz**, at the cost of most of its output. The open question the wear test answers first:

- **Is a ~60–200 Hz drive felt through the strap and sleeve at all?** A sealed magnetic buzzer moves a small diaphragm, not an eccentric mass, so the felt energy is far lower than an ERM's. If nothing is felt, the tactile concept fails and the device becomes an **audible** signaller for a hearing companion — a documented, honest fallback, not a silent one.
- **Which two low bands read as distinct "low" vs "high" texture?** Vibrotactile pitch is coarse; pick the two most-separated bands that are both felt (start ~60–100 Hz and ~180–250 Hz) and lock them.
- **Does two-buzzers-vs-one register as "stronger/wider"?** This is the BOTH-vs-ONE rule's new physical basis and it is weaker than the ERM amplitude cue. Verify or fall back to rhythm-only class coding.

There is no buzzer datasheet risk of the ERM kind — the MLT-8530 part is named on the product page and the LCSC datasheet (C94599) is the real PDF, not an HTML scrape. The uncertainty here is **perceptual**, and only a wrist can resolve it.

### The locked table

Notation: `A` = Port 1 buzzer, `B` = Port 3 buzzer, `BOTH` = both (optional 30 ms B stagger only if it aids onset legibility — see rule 5). All durations in ms. Per the table note below, the Intensity column is a drive-frequency selector, not an amplitude.

| # | Pattern | Motors | Intensity | Timing spec | Repeats | Total | Class | Queueable | Trigger |
|---|---|---|---|---|---|---|---|---|---|
| **P0** | **READY** | BOTH | 0→65 % | ramp `0→65` over 200, hold `65` for 200 | ×1 | **400** | STATUS | no | Boot complete: ToF init OK, motors OK, Wi-Fi joined or offline confirmed |
| **P1** | **DANGER** | BOTH | 100 % | `(200 on / 150 off) ×5`, then `500` sustained tail | ×4, gap **750** | **2250/cycle · 11 250 total** | **SAFETY** | no | Tier-2b confirmed siren **AND** amplitude trend rising |
| **P2** | **SIREN WARNING** | BOTH | 65 % | `(400 on / 300 off) ×2` | ×1 | **1400** | ALERT | no | Tier-2b confirmed siren, flat or falling trend. Rate-limited 1 per 10 s |
| **P3** | **ATTENTION** | BOTH | 100 % | single `250` pulse | ×1 | **250** | **SAFETY** | no | Tier-2a: band energy exceeds the adaptive floor by +12 dB on 2 consecutive FFT frames (~79 ms) |
| **P4** | **PROXIMITY** | **A only** | 80→180 Hz | `120 on / gap`, `gap = map(mm, 300→1200, 120→900)`, `freq = map(mm, 1200→300, 80→180 Hz)` — closer = faster **and** higher-pitched | re-posted every 100 ms while in range | continuous | HAZARD | no | ToF < 1200 mm on 3 consecutive frames (60 ms debounce against arm-swing) |
| **P5** | **BUS ARRIVING** | BOTH | 65 → 82 → 100 % | `(250 on / 250 off) ×3`, ascending | ×1 | **1500** | INFORMATION | no | `BUS_ARRIVED` edge from the relay |
| **P6** | **ROUTE NUMBER** | BOTH | digits **buzz band ~100 Hz**, brackets **alert band ~200 Hz** | preamble `500 @ ~200 Hz` + `600` silence · digits: `LONG=500`, `SHORT=150`, intra-gap `250`, inter-digit gap **800** · terminator `600` silence + `500 @ ~200 Hz` | ×1 | **6400 for "88"** | INFORMATION | **yes** | Claude returned `confidence == "high"` and the 3-vote gate reached consensus |
| **P7** | **WAIT** | A, B alternating | 100 % | `A 300 on / 200 off / B 300 on / 200 off` ×2 | ×4, gap **500** | **2000/cycle · 9500 total** | FEEDBACK | no | Vision request in flight, no result yet |
| **P8** | **UNKNOWN** | BOTH | 100→0 % | single `900` pulse, linear fade-out across its full duration | ×1 | **900** | INFORMATION | **yes** | `confidence == "low"`, **or** the vote failed consensus, **or** the request timed out (>8 s), **or** the route contains a non-digit |
| **P9** | **ACK** | **A only** | 100 % | single `150` pulse, within 20 ms of the press | ×1 | **150** | FEEDBACK | no | Onboard button press, debounced |
| **P10** | **ERROR / OFFLINE** | **A only** | 65 % | `600 on / 300 off / 150 on / 300 off / 600 on` (long-short-long) | ×1, re-fires every 60 s while degraded | **1950** | STATUS | no | Wi-Fi down >5 s, **or** 5 consecutive ToF I²C failures, **or** 3 consecutive relay failures |

**Reading the table for buzzers:** the **Motors** column (A / B / BOTH) is unchanged in *routing* — A = Port 1 buzzer, B = Port 3 buzzer. The **Intensity** column is now a **drive-frequency** column: read "100 %" as *buzz band (~60–120 Hz)*, "65 %" as a quieter/shorter gate of the same band, and any ramp as a short frequency glide within the buzz band. No pattern depends on a precise amplitude level.

**Partially uncut:** LEFT, RIGHT and AHEAD return as the experimental Navigation block below (Revision §3). **Still cut:** STOP and MOVE OVER — no trigger produces them in this build. **Still deliberately not added:** any TURN pattern. A rotation instruction the user cannot verify they executed correctly is worse than no instruction — it produces a user who has turned an unknown amount in an unknown direction and now believes the device has seen something. On insufficient information the device fires **P8 UNKNOWN** [T3 D2].

### Navigation block — EXPERIMENTAL (P11–P13), gated on the wear test

**These three exist only if the wear test proves the per-side frequency contrast is discriminable.** They are the buildable form of "steer toward the bus door" — attempted, not promised. The mechanism is **frequency-coded laterality**: left and right are carried by felt *pitch*, and the responsible buzzer is *also* the one physically on that side, so spatial and frequency cues reinforce rather than compete. If the test fails, delete all three; nothing else depends on them.

| # | Pattern | Buzzer | Drive | Timing spec | Repeats | Class | Trigger |
|---|---|---|---|---|---|---|---|
| **P11** | **LEFT** | A only | **low band ~70 Hz** | `(200 on / 200 off) ×2` | ×1, re-postable | INFORMATION | Detector says the bus door / target is to the user's left |
| **P12** | **RIGHT** | B only | **high band ~220 Hz** | `(200 on / 200 off) ×2` | ×1, re-postable | INFORMATION | Target is to the user's right |
| **P13** | **AHEAD** | BOTH | both bands together | `400 on / 200 off / 400 on` | ×1 | INFORMATION | Target is roughly centred — proceed forward |

**Design honesty for P11–P13:**
- **Redundant coding is the whole point.** Side is signalled *three* ways at once — which buzzer fires (spatial, weak at 33.9 mm), the pitch band (frequency, the load-bearing cue), and, if kept, a habitual mental "low = left / high = right" mapping the user is taught. Any one working is enough.
- **This is not verified navigation.** As with the cut TURN pattern, the device cannot confirm the user moved correctly. P11–P13 are advisory nudges toward a *dwelling* bus (15–30 s), not turn-by-turn guidance. On low detector confidence, fire **P8 UNKNOWN**, never a guessed direction.
- **"We have not validated this with DeafBlind users"** applies with double force here — frequency-coded laterality on a repurposed buzzer is the least-grounded idea in the build. It ships flagged as an experiment, or not at all.
- **Triggering** needs the detector to emit a coarse left/centre/right for the bus box (its horizontal centroid vs frame thirds). That is a few lines in `bus_vision.py`; the relay carries it as a new `CloudPattern` value only if the block survives the wear test.

### Discriminability analysis

Assessed as felt through a sleeve on the volar wrist, where amplitude is attenuated and fine timing is smeared. Most-confusable first [T3 §Discriminability Analysis].

| Pair | Risk | Separation | Verdict |
|---|---|---|---|
| **P3 ATTENTION vs P9 ACK** | **Highest** — both single short hits | Amplitude (2 motors vs 1, ~2× energy) and duration (250 vs 150 ms, ~1.7×, near the duration JND). **Waveform separation alone is marginal** | **Accepted — resolved by causation, not waveform.** P9 fires only within 20 ms of the user pressing the button. P3 arrives unbidden. Self-disambiguating in every real case |
| **P2 SIREN vs P5 BUS ARRIVING** | **High** — both a few medium pulses from both motors | Pulse count 2 vs 3; beat 400 vs 250 ms; envelope flat vs ascending | **Test this pair first in the wear test.** If confused: extend P5 to 4 pulses, or prepend a 700 ms sustained head. Both are one-line step-table changes |
| **P1 DANGER vs P4 PROXIMITY at close range** | **High in principle** — as an object nears, P4 becomes a fast insistent buzz | Amplitude (both @100 % vs one @100 %); P1 has a 500 ms sustained tail and repeats, P4 never does | **Safe by arbitration, not by waveform.** P1 preempts P4 (SAFETY > HAZARD), so they never overlap, and the mandatory 150 ms clearing gap marks the transition |
| **P1 DANGER vs P10 ERROR** | Medium | Motors (2 vs 1), intensity (100 vs 65 %), rhythm (fast even ×5 vs asymmetric long-short-long), persistence (every 3 s vs every 60 s) | **Safe — four independent margins.** An earlier fast-triplet ERROR was too close to DANGER and was replaced with the asymmetric figure |
| **P6 preamble (500 @ alert band) vs P6 LONG (500 @ buzz band)** | Medium — identical duration | **Pitch band** (alert ~200 Hz vs buzz ~100 Hz — a coarse but felt texture difference) and following gap (600 vs 250 ms, 2.4×). Relies on the buzz-vs-alert band contrast being felt — a wear-test item | **Safe if the two bands are discriminable; else lengthen the preamble gap** |
| **P6 LONG (500) vs P6 SHORT (150)** | Low | 3.3× duration ratio, far above the ~20–25 % duration JND. Identical intensity and motor set, so duration is the only varying dimension | **Safe. The cleanest contrast in the vocabulary** — correctly so, because it carries the payload |
| **P7 WAIT vs P4 PROXIMITY** | Low | Both single-motor and repeating, but P4's gap **changes as the user moves their arm** and P7's never does; P7 has 500 ms silent windows, P4 is continuous | **Safe — and the discriminator is embodied.** The user's own motion disambiguates within one arm movement |
| **P8 UNKNOWN vs P0 READY** | Low | Opposite envelopes (900 ms fade-out vs 400 ms ramp-up), 2.25× duration, and P0 fires only at boot | **Safe** |
| **P5's internal 65→82→100 % ramp** | — | Each step is ~15–20 %, right at the vibrotactile Weber fraction | **Do not rely on it.** P5's discriminating feature is **3 pulses**, not the ramp. Stated honestly so nobody builds a claim on it |

**Structural safeguard.** The BOTH-vs-ONE rule means the user's first discrimination is always the easy one — strong vs weak — and it is an amplitude judgement, not a localisation judgement, so it holds at 33.9 mm. Within each half, patterns separate by count and rhythm, the most robust vibrotactile dimensions through fabric. **No pattern requires the user to judge duration and intensity simultaneously.**

**Do not build meaning on apparent motion.** Tactile apparent motion between two actuators is real, but it needs a stimulus onset asynchrony of roughly half the burst duration (~80 ms for a 120 ms burst). Prior drafts specified a 400 ms crossfade, at which the effect does not occur — the user feels two successive buzzes. ERMs additionally have sloppy load-dependent rise and decay, so precise SOA control is poor. **No pattern's semantics may depend on direction** [T3 D18].

### Severity arbitration

**This is a NEW finding, absent from every prior draft, and firmware cannot be written without it** — two patterns sharing two motors produce noise, not a message [T3 §Severity Arbitration Rules].

| Class | Value | Patterns | Rationale |
|---|---|---|---|
| **SAFETY** | 0 | P1 DANGER, P3 ATTENTION | Physical risk. Never lose, never queue, never mute |
| **HAZARD** | 1 | P4 PROXIMITY | Physical risk, but continuous and low-stakes per event |
| **ALERT** | 2 | P2 SIREN WARNING | Environmental, non-immediate |
| **INFORMATION** | 3 | P5 BUS, P6 NUMBER, P8 UNKNOWN | The payload. Must arrive, but never before safety |
| **FEEDBACK** | 4 | P9 ACK, P7 WAIT | Conversational glue. Worthless if late |
| **STATUS** | 5 | P0 READY, P10 ERROR | About the device, not the world |

**Lower number = higher priority.**

1. **Higher class preempts lower, immediately, mid-sequence.** The running pattern aborts at the next 10 ms tick.
2. **Every preemption inserts a mandatory 150 ms clearing gap** with both motors off. Without it the two patterns smear into an unparseable blur — this gap is what makes preemption *legible* rather than merely correct.
3. **Equal or lower class never preempts.** It queues if queueable, else it is dropped. **Queue depth 2.**
4. **Queueable = P6 ROUTE NUMBER and P8 UNKNOWN only.** P6 is the payload; P8 gives the user closure. Everything else is dropped when the channel is busy: P5, P9, P7, P0, P10 are all stale the moment they are late. **P4 PROXIMITY is never queued — it is a state, not a message.** `loop()` re-posts it every 100 ms while the range condition holds, so it resumes automatically with zero extra machinery.
5. **A preempted queueable pattern restarts from step 0; it never resumes mid-sequence.** A half-delivered route number is worse than a delayed one — resuming mid-digit produces a **plausible wrong number**, which is the single worst output this device can make.
6. **Queue TTL = 10 000 ms.** Anything older is discarded silently. A stale bus number is actively dangerous because the bus may have gone.
7. **P1 DANGER is uninterruptible** except by a newer P1. It holds the channel for its full 2250 ms cycle, repeats up to 4× (11.25 s), and cannot be starved.
8. **Button press during P1:** the ACK is suppressed, but the vision request still fires and its result queues behind DANGER under the 10 s TTL.
9. **A bus arrives while a siren is active: DANGER wins.** BUS ARRIVING is **dropped**. ROUTE NUMBER is **queued with its 10 s TTL** — if the siren clears in time the user still learns which bus; if not, it expires silently and no misleading late signal is delivered. During a siren the user's decision is "do not step into the road", not "which bus is this".
10. **Rate limits (anti-fatigue), enforced at the producer:** P2 max 1 per 10 s · P10 max 1 per 60 s · P5 edge-triggered, max 1 per 15 s · P4 unlimited but gated to <1200 mm with a 3-frame debounce. **A wrist that buzzes constantly gets taken off.** These are not optional polish.
11. **Global mute:** long-press ≥1.5 s suspends classes HAZARD through STATUS for 60 s. **SAFETY is never mutable.**

### Button map — no extra patterns needed

| Input | Action | Haptic sequence |
|---|---|---|
| Short press | On-demand vision request | P9 → P7 → P6 or P8 |
| Short press within 10 s of a delivered number | Replay the last number, no new request | P9 → P6 |
| Long press ≥1.5 s | Toggle `BUS_STOP` mode | P0 on enter, P9 on exit |
| Long press ≥1.5 s during an active alert | Global mute 60 s, **P0/P1/P3 excepted** | P9 |

`BUS_STOP` mode is the buildable form of *"turn on once you reach the destination"* without geolocation: a manually entered mode, not a geofence. Vision only runs in that mode, which is both the battery story and the false-positive story [T3 D3].

---

## Number Encoding — quinary long/short

**Unary counting fails on four counts** [T3 §Number Encoding Decision]. Route "88" would be 16 pulses of undifferentiated buzzing. Human subitizing is reliable to about four items; counting to eight twice without error, tactile, through fabric, on a moving arm, from a user also managing a cane, is not a reasonable ask — and a miscount produces a **confident wrong answer**. It is spatially coded (*"on R"*), which is unavailable. And **unary has no symbol for zero**, so routes 10, 20, 205, 390 — a large fraction of real London routes — cannot be encoded at all. That is a hard bug, not a limitation.

**LONG = 5, SHORT = 1.** Digit *d* = (*d* ÷ 5) LONGs followed by (*d* mod 5) SHORTs. Because *d* ÷ 5 ≤ 1 for every digit 0–9, **"two LONGs" is a free codepoint — assign it to zero.** That closes the zero gap with no extra machinery.

| Digit | Encoding | Elements | Digit | Encoding | Elements |
|---|---|---|---|---|---|
| 0 | `LONG LONG` | 2 | 5 | `LONG` | 1 |
| 1 | `SHORT` | 1 | 6 | `LONG SHORT` | 2 |
| 2 | `SHORT SHORT` | 2 | 7 | `LONG SHORT SHORT` | 3 |
| 3 | `SHORT ×3` | 3 | 8 | `LONG SHORT ×3` | 4 |
| 4 | `SHORT ×4` | 4 | 9 | `LONG SHORT ×4` | 5 |

**Parameters:** `SHORT = 150` · `LONG = 500` · intra-digit gap `250` · **inter-digit gap `800`** (the proven constant, reused) · both buzzers, **digit tones in the buzz band (~100 Hz)** throughout · preamble `500 @ ~200 Hz` (alert band) + `600` silence · terminator `600` silence + `500 @ ~200 Hz`. The digit/bracket contrast is now **pitch** (buzz vs alert band), a cleaner discriminator on this hardware than the ERM's amplitude ramp.

**Per-digit block** (tone + intra-digit gaps only):

| d | Encoding | Elements | Tone | Intra gaps | **Block** |
|---|---|---|---|---|---|
| 0 | `L L` | 2 | 1000 | 250 | **1250** |
| 1 | `S` | 1 | 150 | 0 | **150** |
| 2 | `S S` | 2 | 300 | 250 | **550** |
| 3 | `S S S` | 3 | 450 | 500 | **950** |
| 4 | `S S S S` | 4 | 600 | 750 | **1350** |
| 5 | `L` | 1 | 500 | 0 | **500** |
| 6 | `L S` | 2 | 650 | 250 | **900** |
| 7 | `L S S` | 3 | 800 | 500 | **1300** |
| 8 | `L S S S` | 4 | 950 | 750 | **1700** |
| 9 | `L S S S S` | 5 | 1100 | 1000 | **2100** |

`total = Σ blocks + (ndigits − 1) × 800 + 2200`

| Route | Elements | Σ blocks | Inter gaps | Brackets | **Total** | Steps |
|---|---|---|---|---|---|---|
| "7" | 3 | 1300 | 0 | 2200 | **3.5 s** | 9 |
| "10" | 3 | 1400 | 800 | 2200 | **4.4 s** | 9 |
| **"88"** | **8** | 3400 | 800 | 2200 | **6.4 s** | **19** |
| "205" | **5** | 2300 | 1600 | 2200 | **6.1 s** | 13 |
| "999" | 15 | 6300 | 1600 | 2200 | **10.1 s** | 33 |

**Use these numbers.** Earlier drafts stated 5.6 s for "88" and 7 elements for "205"; both are wrong. The encoding scheme is correct and unchanged — only the arithmetic moves [T4 §R6].

**Why this is the right trade.** The headline win is not speed, it is error rate and coverage. Maximum identical adjacent elements drops from **9 to 4**, landing inside the reliable subitizing range — the failure mode being designed out is a confident wrong number. Zero becomes representable, taking the scheme from "works for some routes" to "works for all routes". Elements for "88" drop from 16 to 8 at the same wall-clock time, so the same duration carries far less counting load. And it is grounded in the project's own cited research: DeafBlind vibrotactile researchers chose Morse over Braille for exactly this time-efficiency reason, and long/short *is* that primitive.

**Brackets remove digit-boundary ambiguity.** Without a preamble, a user who misses the leading LONG of "8" receives "3". The 500 ms bracket costs ~1.1 s per delivery and eliminates the highest-consequence error in the system. **If 6.4 s proves too long in rehearsal, drop the terminator bracket first (−1.1 s → 5.3 s) before touching digit timing.**

**Routes containing letters are unencodable.** Claude's prompt explicitly allows `"N3"` and `"P5"`. `/api/event` rejects any route failing `ROUTE_RE` and stores `pattern: "UNKNOWN"` instead, so the failure is visible on the debug screen rather than invisible on the wrist. Route 88 is unaffected.

---

## The Siren Path — two tiers, because one is physically impossible

Prior drafts specified *"< 200 ms siren classification"*. **That budget cannot be met, and no optimisation fixes it** [T3 D19].

The defining features of a siren are slow temporal modulations. A yelp modulates at **2–4 Hz**, so one period is already 250–500 ms. A wail's modulation is **0.25–1 Hz**, so a full sweep cycle is **1–4 s**. You cannot observe a 400 ms period inside a 200 ms window. **This is a property of the signal, not a limit of the ESP32.**

The fix is to split the tier, and the split produces a better story rather than an excuse:

| Sub-tier | Budget | Test | Haptic |
|---|---|---|---|
| **2a — acoustic alert** | **<100 ms** (measured 78.6 ms) | Band energy in bins 16…58 exceeds the adaptive noise floor by +12 dB on 2 consecutive frames | **P3 ATTENTION** |
| **2b — siren confirmed** | **1–2 s** | ≥1.02 s of sustained band energy **AND** (2–4 Hz modulation index > 0.35 **OR** a monotonic peak sweep) | **P1 DANGER** if the amplitude trend is rising, else **P2 SIREN WARNING** |

**This mirrors the two-stage bus haptic exactly — coarse now, precise shortly after.** That consistency is worth stating out loud: the device matches latency to certainty, and it does it twice, in two independent sensing paths. It is architecture, not a special case.

**Tier 2a latency, shown:**

```
capture frame 1                32.0 ms
FFT + features                  2.3 ms
capture frame 2                32.0 ms
FFT + features                  2.3 ms
haptic tick quantisation     ≤ 10.0 ms
                             ─────────
TOTAL                        ≈ 78.6 ms      ← inside the <100 ms budget
```

### The bin arithmetic

```
N        = 512                                    FFT size
f_s      = 16 000 Hz                              sample rate
Δf       = f_s / N        = 16000 / 512  = 31.25 Hz per bin
T_frame  = N / f_s        = 512 / 16000  = 32.0 ms per frame
f_rate   = 1 / T_frame                   = 31.25 frames per second
Nyquist  = f_s / 2        = 8000 Hz      → usable bins 0 … 255
f(k)     = k × 31.25 Hz
```

```
Siren band low   500 Hz  →  500 / 31.25 = 16.00  → bin 16   (500.00 Hz)  exact
Siren band high 1800 Hz  → 1800 / 31.25 = 57.60  → bin 58  (1812.50 Hz)
Wail sweep low   400 Hz  →  400 / 31.25 = 12.80  → bin 13   (406.25 Hz)
Wail sweep high 1300 Hz  → 1300 / 31.25 = 41.60  → bin 42  (1312.50 Hz)
```

**Siren energy gate = bins 16…58 (43 bins). Peak tracking = bins 13…42 (30 bins).**

**History = 64 frames = 2048 ms.** 64 is a power of two so the ring modulo is a mask, and it holds ≥2 full cycles of the slowest yelp (2 Hz → 500 ms period → 16 frames → 32 frames for two cycles, with margin).

```
Envelope is sampled at 31.25 Hz. A modulation of period P frames = 1000/(P × 32) Hz.
  lag  8 frames → 1000 / 256 = 3.91 Hz
  lag 16 frames → 1000 / 512 = 1.95 Hz
⇒ search lags 8 … 16 inclusive to cover the verified 2–4 Hz yelp band.
```

**Why Hann, not Hamming.** We measure band *energy* and track a *peak bin*; we never need to resolve two close tones. Hann's far-sidelobe rolloff is −60 dB/decade against Hamming's −20 dB/decade, so a loud low-frequency component — traffic rumble, wind, HVAC — leaks far less into the 500–1800 Hz band. Sidelobe rejection is the property that matters.

**Why no overlap.** 50 % overlap would halve detection latency at double the CPU, but it also doubles the envelope sample rate and complicates the lag table. Non-overlapped frames give an envelope sampled at exactly 31.25 Hz, which keeps the lag table clean, and 78.6 ms already meets the budget.

**No DC blocker is required, by construction.** The tunable high-pass fields (`hp_en`, `hp_cut_off_freq_hz`) are gated on `SOC_I2S_SUPPORTS_PDM_RX_HP_FILTER`, defined only for the ESP32-P4. That would normally force a software DC blocker — **it does not here, because every feature is computed from bins 13…58 and DC lands in bin 0.** Deriving the amplitude trend from FFT band energy rather than time-domain RMS makes the whole chain DC-immune for free.

### Two silent-failure traps — design against both, do not discover them

**TRAP 1 — the PDM-to-PCM converter exists on I2S0 only.** ESP-IDF, verbatim: *"PDM RX is only supported on I2S0, and it only supports 16-bit width sample data."* Binding the mic to I2S1 **does not error** — it yields the raw 1-bit bitstream, producing an FFT full of garbage with no diagnostic.

**TRAP 2 — the mono slot default is LEFT.** `I2S_PDM_RX_SLOT_*_DEFAULT_CONFIG` sets `.slot_mask = (mono) ? I2S_PDM_SLOT_LEFT : I2S_PDM_SLOT_BOTH`. **A PDM mic whose L/R select pin is tied high lands on the right slot, and the mono default then reads pure silence** — again with no error.

**One assertion at bring-up distinguishes both.** After `i2s_channel_enable()`, capture 512 samples and print the standard deviation:

```
Real 16-bit PCM in a quiet room:   sigma ≈  50 – 500 LSB      → healthy
Raw PDM misread as PCM:            sigma > 5000, flat spectrum → TRAP 1
Wrong slot:                        sigma == 0, every sample 0  → TRAP 2
```

This converts two afternoon-eating silent failures into two printed sentences. **It ships in the first hour of the build** (Task 13).

---

## The Vision Pipeline — why Modal hosts a real detector

The transcript contains a direct challenge: *"I don't even think we need an image [model]… we can probably do the entire thing with Claude. But I know we have to use Modal somehow."*

**The speaker is right on capability and wrong on architecture.** Claude can absolutely read a route number off a frame — better than YOLO could, since YOLO-COCO has no concept of text at all. If the question is *"can Claude do this task"*, the answer is yes and no detector is needed. But the sentence immediately after is the tell: a team that cannot finish *"and Modal is there because ___"* is decorating, and a judge who has seen forty hackathon projects will hear it.

**Three arguments were available. Two of them do not survive the numbers, and the plan concedes both.**

**Argument 1 — cost. Directionally true, practically irrelevant at demo scale.** Nothing here needs 30 fps; a bus pulling in is a multi-second event and the honest frame rate is **2 fps**. For a five-minute demo:

| Approach | Arithmetic | Cost |
|---|---|---|
| Claude Haiku 4.5 on every frame, 640×480 (414 visual + ~200 prompt ≈ 614 in, 45 out) | 600 frames × $0.00083 | **$0.50** |
| Warm Modal T4 + Claude only on the transition | $0.058 + 3 × $0.0041 | **$0.070** |

The detector is ~7× cheaper **and both numbers are under a dollar.** It becomes real only at product scale — continuous monitoring, one user, one hour at 2 fps: **$5.98 vs $0.71**, an 8× gap that compounds per user. **Say that as a roadmap claim, not as today's reason.**

**Argument 2 — cropping improves OCR. True, quantified, and not an argument for a detector.** A full 1280×720 frame costs `⌈1280/28⌉ × ⌈720/28⌉ = 46 × 26 = 1196` visual tokens; the 896×280 blind crop costs `32 × 10 = 320`. That is a 3.7× token reduction and, more importantly, it removes the search problem — Claude is handed the answer rather than asked to find it in a street scene. **But you can crop without a detector.** For a hardcoded demo with a prop at a known distance, a fixed centre-crop would do most of this. Supporting evidence, not necessity.

**Argument 3 — state. This is the load-bearing one, and it is the only one Claude structurally cannot supply.**

> **The detector's product is not a bounding box. It is a state transition.**

"A bus is here" is a boolean over time. Turning noisy per-frame detections into one clean `BUS_ARRIVED` event needs three things: a fast per-frame signal, **debounce and hysteresis over ~1–2 seconds of history** so one flickery frame does not fire and one dropped frame does not un-fire, and **a fire-once latch** so Claude is called once per arrival rather than 600 times and the user is buzzed once rather than continuously.

**The Claude API is stateless per request.** It cannot do the second or the third. *Something* must hold a few seconds of history. That something is a server, and Modal is an honest place for it.

There is also a latency floor. A warm T4 running YOLO-nano returns a box in ~10 ms of compute; the round trip is network-dominated at ~100–300 ms. A Claude response requires network RTT **plus** time-to-first-token **plus** generation of ~45 output tokens. **There is no model configuration in which a complete Claude JSON response beats a warm YOLO bounding box** — that inequality holds regardless of the exact milliseconds, and it is what the two-stage haptic rests on. Human perception of "instant" for a haptic response is roughly <300 ms; a ~1 s round trip reads as lag, not feedback.

**The verdict:** *Modal hosts the stateful arrival detector, because the arrival event is a temporal object and Claude is a stateless oracle. Modal also calls Claude server-side, so the crop is made and read in the same process it was detected in* — saving a ~100–200 ms round trip and keeping `ANTHROPIC_API_KEY` off the phone about to be handed to a judge.

**Stage line: *"Detection is when. Claude is what."***

**What we do not claim on stage.** We do not claim we needed a GPU for throughput — we do not, at 2 fps. We do not claim Claude cannot read the number — it can, better than YOLO. We do not claim cost forced our hand at demo scale — it did not. Claiming any of those invites the exact question the transcript already asked, and we would lose.

**Does the two-stage haptic mask latency, or relocate it? It relocates it, and relocation is the point.** Total time from prop-raised to route-known is unchanged. What changes is that the user gets actionable information at ~1.4 s instead of ~3.8 s. "A bus is here" is itself useful — a London bus dwells 15–30 seconds, and knowing early is real time to start moving toward the door. **It stops working the moment stage one is slow:** if the arrival pulse lands late, the audience perceives two lags rather than coarse-then-precise. That is the whole reason the detector must be warm and must be a detector.

### Camera and transport

**Camera host: a mobile web app on the phone (Revision §2 — this reverses [T4 §Decision 1]).** Capture is `getUserMedia({ video: { facingMode: "environment" } })` + a `<canvas>.drawImage` grab + `canvas.toDataURL("image/jpeg", 0.85)` at 2 Hz, POSTed to Modal. The original ruling costed this at ~400 lines / ~4 hours and rejected it for iOS-Safari quirks and stage-reload risk; that cost and risk are **accepted now**, and two things soften them: `app/app/page.tsx:176-191` already runs the `getUserMedia` permission/stream dance for audio (adapt it for video), and serving from the existing HTTPS Vercel origin satisfies the secure-context requirement for free. **Rehearse the permission grant on the actual demo phone/browser** — the one failure mode that still bites is a denied or reset camera permission mid-demo. The laptop `cv2.VideoCapture` client (`vision/bus_client.py`) is cut.

**Transport: the existing Vercel + Upstash polling relay**, ESP32 outbound-only at 300 ms. It is already built, deployed and smoke-tested green end-to-end; `net.cpp` already implements TLS join, poll, `seq` gate and JSON POST; `/api/pull` already sets `Access-Control-Allow-Origin: *` so the debug screen reads the same state from the same place for free.

**The rationale beyond reuse is the one that matters:** the Modal URL **changes between `modal serve` (a `-dev` suffix) and `modal deploy`**. If the board pointed at Modal directly, every redeploy would be a recompile-and-reflash cycle — at exactly the moment you are least able to afford one. With the relay, the URL reaches exactly one place:

| Consumer | How it gets the URL | Cost to change |
|---|---|---|
| Phone capture page | `MODAL_URL` as a build-time env / query param on the page URL | redeploy or edit the URL — **seconds** |
| **ESP32** | **never sees it.** The board only knows `VERCEL_HOST` | n/a |
| Debug screen | never sees it. Reads Redis | n/a |

**The one change that makes 300 ms polling viable: TLS keep-alive.** `net.cpp:41-48` constructs a fresh `HTTPClient` per poll and calls `http.end()`, tearing the TLS session down; every poll then pays a full handshake (ECDHE on a 240 MHz Xtensa ≈ 300–800 ms) — which is why the old firmware used a 700 ms cadence. Hoisting `HTTPClient` to a static and calling `setReuse(true)` collapses a poll to one TLS record exchange (~50–200 ms).

### Latency budget

**Stage 1 — prop raised → BUS ARRIVING on the wrist**

| # | Hop | Estimate |
|---|---|---|
| 1 | Prop enters frame → next capture tick | 0–500 ms (mean **250**) |
| 2 | `canvas.toDataURL` JPEG encode ~q85 | ~**10 ms** |
| 3 | Phone → Modal POST, ~120 kB | 80–250 ms (mean **150**) |
| 4 | YOLO26n forward pass, warm T4 | **10–30 ms** |
| 5 | Debounce `HITS_TO_ARRIVE = 2` @ 2 Hz | +**500 ms** (deliberate) |
| 6 | Modal → phone response, ~200 B | 30–80 ms (mean **50**) |
| 7 | Phone → Vercel `POST /api/event` | 60–150 ms (mean **100**) |
| 8 | Redis MSET + INCR | 20–60 ms (mean **40**) |
| 9 | ESP32 poll wait | 0–300 ms (mean **150**) |
| 10 | `POST /api/pull` round trip with keep-alive | 50–200 ms (mean **120**) |
| 11 | ArduinoJson parse + enum map + `xQueueSend` | <**2 ms** |
| 12 | Queue → first buzzer onset | 0–10 ms (mean **5**) |
| | **TOTAL** | **0.76 – 2.09 s · mean ≈ 1.38 s** |

**Stage 2 — … → first digit of ROUTE NUMBER**

| # | Hop | Estimate |
|---|---|---|
| 13 | 3 × Claude vision calls, **run concurrently** | **1.5 – 3.0 s** (sequential would be 4.5–9.0 s) |
| 14 | Vote + gate, in-process | <1 ms |
| 15 | Phone notices `reading_ready` on its next 500 ms poll | 0–500 ms (mean **250**) |
| 16 | `/api/event` → Redis → ESP32 poll → parse | 130–560 ms (mean **415**) |
| | **prop raised → first digit** | **2.4 – 6.2 s · mean ≈ 3.8 s** |
| 17 | P6 delivers route "88" | **6.4 s** |
| | **prop raised → number fully delivered** | **8.8 – 12.6 s** |

Against a 15–30 s dwell this is real but not generous. **The two levers, in order: make the three Claude votes concurrent (saves 3–6 s, it is four lines — ship the concurrent version), then drop the P6 terminator bracket (saves 1.1 s).**
