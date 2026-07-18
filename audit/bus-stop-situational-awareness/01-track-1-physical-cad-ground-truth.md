# 01 — Track 1: Physical / CAD Ground-Truth Audit

**Date:** 2026-07-18 (Saturday; hack runs Fri 17 – Sun 19 Jul 2026 → ~1.5 days remain)
**Scope of authority:** this file is the measurement record for the pivot. Nothing else was mutated.
**Method:** direct STEP geometry interrogation with `build123d` 0.11.1 (repo `.venv`), via the `cad` skill.

**BOM is fully populated and entirely in hand:** Genesis Mini board + VL53L0CX ToF (AX22-0015) +
2 × ERM (AX22-0013) + PDM digital microphone (**AX22-0044**, marking **T3902**). No LCD, no encoder.

---

## Scope

### What I measured, and how

All geometry numbers below were extracted by loading STEP files into `build123d` (the kernel behind
the repo's `cad` skill) and interrogating solids, bounding boxes and cylindrical-face axes directly.
No number was copied from a prior audit without being independently re-derived; where a prior audit
agrees I say so, and where it disagrees I give both.

| File | Solids | Load | What I took from it |
|---|---|---|---|
| `parts/…/axiometa-genesis-mini/files/STP_MTX0013.step` | 1265 | 4.6 s | PCB extent/thickness, socket centres → port map, mounting holes, USB-C, underside depth, buttons |
| `parts/distance-sensor-vl53l0cx/files/AX22-0015.step` | 47 | 0.2 s | **Net-new.** PCB, headers, holes, optical package position + height, tallest feature |
| `parts/Vibration Motor (ERM)/…/AX22-0013.step` | 12 | 0.2 s | PCB, motor envelope + offset, coin-cylinder search (negative) |
| **All 10 AX22 module STEPs** (0003, 0005, 0011, 0013, 0015, 0018, 0028, 0034, 0040, 0050) | — | ~2 s | **Family-standard scan** — footprint, hole pattern, header rows, Z stack — to license the mic's dimensions |
| `cad/reference/genesis-mini-shell.step` | 4 | 0.2 s | Envelope only — see below |

Techniques: assembly-tree walk with per-child bounding boxes; cylindrical-face extraction via
`BRepAdaptor_Surface` → `GeomAbs_Cylinder` filtered to vertical axes (how hole diameters/centres were
found, and how the ERM coin was searched for); socket-pair centroid averaging to derive port centres.

I also ran three **headless builds of the CAD scripts** through the repo's own `cad/tests/fake_adsk`
shim — which is a real build123d engine, not a stub — to probe built solids for material:
1. both designs as-committed;
2. a **25° optical-cone probe** over all four ports;
3. a **"closed-variant" experiment** on the monolith with the LCD/encoder/reveal cuts disabled in
   memory, to test the user's "closed body with small apertures only" intent empirically.

### What I skipped, and why

- **`cad/reference/genesis-mini-shell.step`** — envelope only (159.5 × 63.0 × 17.0 mm, 4 solids, root
  label `GM_Console_Body_v27`). It is a **desktop console body, not a wrist form factor**, ~2.6× the
  length of the wrist designs. It was already mined for M2 screw details (`BOSS_PILOT` 1.8,
  `PLATE_CB_DIA` 4.0, `PLATE_CB_D` 2.0, `PLATE_HOLE_DIA` 2.4 all carry "CORRECTED — reference shell").
  Nothing in the pivot changes those, so they are tagged `CARRIED-OVER-UNVERIFIED`.
- **The ERM coin diameter/protrusion** — not skipped by choice; **it is not in the STEP** (see Residual Risk).
- **Slicing** — not run. All print-time figures are ESTIMATE.
- **Microphone geometry** — no STEP, no images, no part folder exists for AX22-0044. Its footprint is
  handled via the family standard (see the `ASSUMED-AX22-STANDARD` tag); its Z height and acoustic
  port face are flagged as physical inspection items.
- **Catalogue/stock/sourcing** — dropped per instruction; the mic is in hand.

---

## Measured Dimension Table

> **Source tagging is exhaustive.** Every number carries exactly one of `MEASURED-FROM-STEP` (with
> file), `ASSUMED-AX22-STANDARD` (with the STEPs that established the standard), or
> `CARRIED-OVER-UNVERIFIED` (with script + line).
>
> **Two datums are in play. Do not mix them.**
> - **STEP datum** (what I measured): board PCB **bottom** = z 0, board centre = origin.
> - **Script datum** (what the CAD uses): board **top** = z 0.
> Rows state which datum they use.

### Genesis Mini board — `STP_MTX0013.step`

| Dimension | Value | Source | Where it's used |
|---|---|---|---|
| PCB footprint | 55.000 × 55.000 mm | MEASURED-FROM-STEP (`STP_MTX0013.step`, `MTX_GENESIS_Mini_PCB`) | `BOARD_BAY` — enclosure.py:80, exocage.py:142 |
| PCB thickness | **1.510** mm | MEASURED-FROM-STEP (`STP_MTX0013.step`) | Scripts code 1.6 — see next row |
| PCB thickness as coded | 1.6 mm | CARRIED-OVER-UNVERIFIED (enclosure.py:81, exocage.py:143 `BOARD_THICK`) | Drives `Z_BOARD_BOT` and the whole −Z map. **0.09 mm optimistic.** |
| Board bbox incl. components | 56.411 × 55.000 × 14.650 mm (x −27.500..28.911, z −5.585..9.065) | MEASURED-FROM-STEP (`STP_MTX0013.step`) | Cavity + pocket sizing |
| Mounting holes | 4 × Ø **3.400** mm at (±24.100, ±24.100), max dev 0.030 | MEASURED-FROM-STEP (`STP_MTX0013.step`) | `BOARD_HOLE_X` enclosure.py:82, exocage.py:144 |
| Mounting-pad annulus | Ø 6.800 mm | MEASURED-FROM-STEP (`STP_MTX0013.step`) | Sanity check on `BOSS_DIA` 7.0 |
| AX22 socket body | 6.800 (X) × 12.700 (Y) × 7.450 mm, 8 off | MEASURED-FROM-STEP (`STP_MTX0013.step`, `PinSocket_2x05_P2_54mm_Vertical_SMD`) | Module seating stack |
| Socket top face | z **9.065** (STEP datum) = **+7.555** above PCB top | MEASURED-FROM-STEP (`STP_MTX0013.step`) | Mated-module datum |
| Socket pitch within a port | 15.400 mm between the two socket body centres | MEASURED-FROM-STEP (`STP_MTX0013.step`) | Port structure |
| **Port centres** | **(±12.000, ±12.000)** — socket-pair centroids, max deviation **0.001 mm** | MEASURED-FROM-STEP (`STP_MTX0013.step`) | `PORT_CTR` enclosure.py:84, exocage.py:145 |
| **Port pitch** | **24.000 mm** both axes | MEASURED-FROM-STEP (`STP_MTX0013.step`) | Motor separation |
| **Port diagonal {1,3} / {2,4}** | **33.941 mm** | MEASURED-FROM-STEP (`STP_MTX0013.step`) | **See Motor Separation Finding** |
| Port adjacent spacing | 24.000 mm | MEASURED-FROM-STEP (`STP_MTX0013.step`) | Proves {1,4} adjacent, not diagonal |
| USB-C receptacle | 7.900 × 8.940 × 4.210 mm; x 21.011..**28.911**, y ±4.470, z −3.295..+0.915 | MEASURED-FROM-STEP (`STP_MTX0013.step`, `Type-C_16P`) | `USB_REC_ZLO/ZHI` enclosure.py:119-120 |
| **USB-C proud of board edge** | **1.411 mm** (28.911 − 27.500) | MEASURED-FROM-STEP (`STP_MTX0013.step`) | USB slot depth / plug reach |
| USB-C centred on | y = 0.000, +X edge | MEASURED-FROM-STEP (`STP_MTX0013.step`) | USB slot position |
| Deepest underside component | JST `S2B-PH-SM4-TB`, z **−5.585** (below PCB bottom), x 14.922..23.522, y 11.880..19.780 | MEASURED-FROM-STEP (`STP_MTX0013.step`) | `NEG_Z_DEEP` 5.59 — **confirmed to 0.005 mm** |
| ESP32-S3-MINI-1-N4R2 | 20.500 × 15.400 × 2.550 mm, z −2.635..−0.085 | MEASURED-FROM-STEP (`STP_MTX0013.step`) | Underside pocket |
| Onboard buttons | 3 × `skrpade010`, 3.200 × 4.600 × 2.500, at x **25.760**, y **+17.008 / +0.008 / −16.992** | MEASURED-FROM-STEP (`STP_MTX0013.step`) | `BTN_X` 25.76 / `BTN_Y` 17.0 — **confirmed** |
| Button top | z 4.095 = **+2.585** above PCB top | MEASURED-FROM-STEP (`STP_MTX0013.step`) | Scripts carry `BTN_PLUNGER_TOP` 2.4 (plunger, not body) |
| Onboard RGB LED | `XL-2020RGBC-WS2812B`, 2.828 × 2.828 × 0.650, at **(0, 0)**, z 1.595..2.245 — top face, dead centre | MEASURED-FROM-STEP (`STP_MTX0013.step`) | Unmodelled in both enclosures; free status indicator |

### ⭐ AX22 module family standard — established across **10** module STEPs

I scanned every `AX22-*.step` in the repo. The family is genuinely standardised, which is what
licenses dimensioning the mic without its CAD.

| Property | Value | Conformance | Source |
|---|---|---|---|
| **PCB footprint** | **22.000 × 22.000 mm** | **9 of 10.** Sole exception: AX22-0034 (IPS LCD) = 29.000 × 22.000 — a *double-wide* variant | MEASURED-FROM-STEP (all 10 `AX22-*.step`) |
| **PCB thickness** | **1.510 mm** | **10 of 10 — universal** | MEASURED-FROM-STEP (all 10) |
| **Mounting holes** | **4 × Ø 2.700 mm at (±9.000, ±9.000)**, pad annulus Ø4.000 | **8 of 10.** AX22-0034 moves to (±12.5, ±9.0) (double-wide); AX22-0003 encoder's own can-mount cylinders masked the corner pattern in my filter | MEASURED-FROM-STEP (all 10) |
| **Header rows** | 2 × `PinHeader_1x05_P2_54mm`, row centres at **Y = −8.900 / +8.890** (spacing **17.790 mm**), 12.700 long, pins to z −8.545 | **10 of 10 — universal, no exceptions** | MEASURED-FROM-STEP (all 10) |
| **Component face** | All functional components on the **+Z face** | **10 of 10** | MEASURED-FROM-STEP (all 10) |

**Per-module height above its own PCB top** (this is what governs enclosure Z):

| Module | AX22 | Height above PCB top | Tallest solid |
|---|---|---|---|
| Rotary encoder *(out of BOM)* | 0003 | 26.485 mm | encoder shaft |
| DHT11 | 0011 | **5.835 mm** ← tallest non-encoder | `Aosong_DHT11_5_5x12_0` |
| Tactile LED button | 0050 | 5.435 mm | `TactSwitch` |
| **ERM (in BOM)** | **0013** | **3.685 mm** ← **tallest module in our BOM** | `Vibration_Motor_v1` |
| IR transceiver | 0040 | 3.085 mm | `IRM-V838M3` |
| Passive buzzer | 0018 | 3.085 mm | `MLT-8530` |
| **ToF (in BOM)** | **0015** | **3.050 mm** | JST `SM04B-SRSS` |
| LDR | 0005 | 2.585 mm | `LDR_COLOR` |
| NeoPixel 5×5 | 0028 | 2.135 mm | `LED_RGB_PLCC4` |
| IPS LCD 0.96 *(out of BOM)* | 0034 | 1.620 mm | `IPS_0_96` |

All `MEASURED-FROM-STEP` (respective `AX22-*.step`).

### VL53L0CX ToF — `AX22-0015.step` (net-new geometry)

| Dimension | Value | Source | Where it's used |
|---|---|---|---|
| PCB footprint | 22.000 × 22.000 × 1.510 mm | MEASURED-FROM-STEP (`AX22-0015.step`) | Conforms to family standard |
| Module bbox incl. pins | 22.000 × 22.000 × 13.105 mm (z −8.545..4.560) | MEASURED-FROM-STEP (`AX22-0015.step`) | Envelope |
| Mounting holes | 4 × Ø 2.700 at (±9.000, ±9.000) | MEASURED-FROM-STEP (`AX22-0015.step`) | Family standard |
| **Optical package as modelled** | 2.500 × 4.900 × **1.570** mm, z 1.585..3.155, solid labelled **`ST_VL53L1x`** | MEASURED-FROM-STEP (`AX22-0015.step`) | ⚠️ **Wrong part — see next row** |
| **Optical package, real (ST)** | **4.40 × 2.40 × 1.00 mm**, Optical LGA12 | ST VL53L0X datasheet DocID029104 Rev 2, Table 1 (fetched 2026-07-18) | **The STEP embeds a VL53L1X sibling model** (VL53L1X is 4.9 × 2.5 × 1.56 — matches my measurement exactly). Real sensor is **0.57 mm shorter**. |
| **Optical package centre** | **(−0.002, 0.000)** = module centre to within 2 µm | MEASURED-FROM-STEP (`AX22-0015.step`) | **Aperture lands exactly on the port centre (±12, ±12)** |
| Package seating above PCB top | 0.075 mm (solder/pad layer) | MEASURED-FROM-STEP (`AX22-0015.step`) | Emitting-plane derivation |
| Module tallest feature | 2 × JST `SM04B-SRSS`, 4.950 × 6.000 × 2.960, z 1.600..**4.560** → **3.050** above PCB top | MEASURED-FROM-STEP (`AX22-0015.step`) | Governs module Z — **not** the sensor |
| Sensing axis | **+Z, normal to the module PCB** | MEASURED-FROM-STEP (`AX22-0015.step`) + `images/pinout/Pins-0015.png` (two visible apertures) | **Boresight is not steerable — see Verdict** |
| Signals | SDA, SCL (left header pos 4,5) · G, Vin, **Xs**/XSHUT (right header pos 1,2,4) · 3 × N.C | MEASURED (`parts/distance-sensor-vl53l0cx/images/pinout/Pins-0015.png`) | Port map |
| FoV (nominal) | **25°** system FoV | ST datasheet DocID029104 Rev 2 §5.1 (fetched 2026-07-18) | Cone probe |
| **FoV (exclusion zone)** | **35°** — *"recommended exclusion zone"* | ST **AN4907** DocID029711 §5.1 (fetched 2026-07-18) | ⭐ **This, not 25°, sizes the aperture** |
| I²C address | 0x52 (8-bit write) / 0x53 (read) / **0x29 (7-bit)** | ST datasheet Table 1 + Fig. 14 bit diagram (fetched 2026-07-18) | Firmware |
| Range | 1.2 m default (30 ms); **2 m long-range (33 ms, dark, no IR)** | ST datasheet Table 13 (fetched 2026-07-18) | Sensing envelope |

### ERM vibration motor — `AX22-0013.step`

| Dimension | Value | Source | Where it's used |
|---|---|---|---|
| PCB footprint | 22.000 × 22.000 × 1.510 mm | MEASURED-FROM-STEP (`AX22-0013.step`) | Family standard |
| Mounting holes | 4 × Ø 2.700 at (±9.000, ±9.000) | MEASURED-FROM-STEP (`AX22-0013.step`) | Family standard |
| **Motor envelope** | **14.594 × 9.699 × 4.328 mm**, x −4.874..9.720, y −4.856..4.843, z 0.867..5.195 | MEASURED-FROM-STEP (`AX22-0013.step`, `Vibration_Motor_v1`) | `MOTOR_TOP` derivation |
| Motor top above PCB top | **3.685 mm** — tallest module in the BOM | MEASURED-FROM-STEP (`AX22-0013.step`) | Governs deck height |
| Motor envelope centre | (**+2.423**, −0.007) — offset 2.423 mm from module centre | MEASURED-FROM-STEP (`AX22-0013.step`) | Coin-position uncertainty band |
| **Coin cylinder** | **NONE — zero cylindrical faces in the motor solid** | MEASURED-FROM-STEP (`AX22-0013.step`) | **Rectangular placeholder.** Independently confirms `20-…-consolidated.md §2` item 1 |
| Coin diameter | **UNMEASURABLE from STEP** — datasheet-typical Ø10 × 2.7 | CARRIED-OVER-UNVERIFIED (`audit/speech-to-braille-wearable/20-…md §2` item 1) | Needs calipers |

### PDM microphone — AX22-0044 / marking **T3902** (no CAD exists)

| Dimension | Value | Source | Where it's used |
|---|---|---|---|
| PCB footprint | 22.000 × 22.000 mm | **ASSUMED-AX22-STANDARD** (established by `AX22-0005/0011/0013/0015/0018/0028/0040/0050.step` — 22.000 × 22.000 on all 8) + user confirmation | Module keep-out (`MODULE_SQ`) |
| PCB thickness | 1.510 mm | **ASSUMED-AX22-STANDARD** (10 of 10 module STEPs) | Stack-up |
| Mounting holes | 4 × Ø 2.700 at (±9.000, ±9.000) | **ASSUMED-AX22-STANDARD** (8 of 10; the 2 exceptions are the double-wide LCD and the encoder) | Not used — modules are socket-retained |
| Header rows | 2 × 1×5 P2.54, rows at Y = ±8.9 (spacing 17.790) | **ASSUMED-AX22-STANDARD** (10 of 10 — universal) | Mating; module centres on its port |
| Seats centred on port | Yes, at (±12, ±12) | **ASSUMED-AX22-STANDARD** (all measured modules centre on their headers) | Acoustic port position |
| **Z height above PCB top** | **UNKNOWN — caliper required.** Interim design assumption: **≤ 4.64 mm** (the available headroom, below) | **ASSUMED-AX22-STANDARD** worst case bounded by the family: tallest non-encoder module is DHT11 at **5.835 mm** (`AX22-0011.step`) | **Load-bearing — see Residual Risk #2** |
| **MEMS port face (top/bottom-firing)** | **UNDETERMINED — physical inspection required** | Inference only: all 10 measured modules place functional components on the **+Z face** (MEASURED-FROM-STEP). **Not a measurement of this module.** | Acoustic port routing — see below |

### Derived mated stack (script datum: board top = 0)

Derivation: the header's 2.54 mm plastic base bottoms on the socket top face. Header base bottom sits
at module-local z −2.545; socket top measured at board z 9.065; board PCB top at 1.510.

| Dimension | Value | Source | Where it's used |
|---|---|---|---|
| Module PCB bottom | **+10.10** above board top | MEASURED-FROM-STEP (derived: `STP_MTX0013.step` + module STEPs) | Script carries +10.05 |
| **Module PCB top** | **+11.61** above board top | MEASURED-FROM-STEP (derived) | `MODULE_PCB_TOP` 11.56 — **agrees to 0.05 mm** |
| ToF optical plane **as modelled** | +13.26 | MEASURED-FROM-STEP (derived, `AX22-0015.step`) | Superseded by next row |
| **ToF optical plane, real** | **+12.68** | MEASURED-FROM-STEP (derived) + ST package height 1.00 mm (datasheet Table 1, fetched 2026-07-18) | ⭐ **Aperture sizing origin** |
| ToF tallest point (JST) | **+14.66** above board top | MEASURED-FROM-STEP (derived, `AX22-0015.step`) | Module Z |
| **ERM motor top** | **+15.30** above board top | MEASURED-FROM-STEP (derived, `AX22-0013.step`) | `MOTOR_TOP` 15.25 — **agrees to 0.05 mm** |
| Deck inner face | +16.25 | CARRIED-OVER-UNVERIFIED (enclosure.py:196 `Z_ROOF_INNER` = `MOTOR_TOP` + `ROOF_CLEAR`) | Aperture air gap |
| Deck outer face | +18.75 | CARRIED-OVER-UNVERIFIED (enclosure.py:197 `Z_ROOF_OUTER`) | Aperture air gap |
| **⭐ Module headroom (deck inner − module PCB top)** | **4.64 mm** | MEASURED-FROM-STEP (derived) + CARRIED-OVER-UNVERIFIED (`Z_ROOF_INNER` 16.25) | **Every module must fit under this. ERM uses 3.685 (0.955 spare); ToF uses 3.050 (1.590 spare); the mic must be ≤ 4.64.** |

> **Load-bearing consequence: the ToF is 0.64 mm SHORTER than the ERM.** The ERM remains the tallest
> module in the new BOM exactly as it was in the old one. **Every Z constant derived from `MOTOR_TOP`
> survives the BOM change untouched.** This is the biggest single reason adaptation is cheap.

### Built-geometry facts (headless rebuilds)

| Dimension | Value | Source | Where it's used |
|---|---|---|---|
| Exocage `cage` | 1 lump, 16 675.9 mm³, X ±31.00, Y ±36.00, Z −11.10..**16.50** | MEASURED (headless rebuild of `cad/braille_wearable_exocage.py`) | Print volume |
| Monolith `cage` as-committed | 1 lump, 22 865.7 mm³, X ±31.00, Y ±36.00, Z −11.10..**23.00** | MEASURED (headless rebuild of `cad/braille_wearable_enclosure.py`) | Print volume |
| **Monolith `cage`, closed variant** | **1 lump, 27 383.5 mm³**, X ±31.00, Y ±36.00, Z −11.10..**18.75** | MEASURED (in-memory closed-variant experiment, 2026-07-18) | ⭐ **The recommended part** |
| `skin_plate` (all variants) | 1 lump, 9 628.4 mm³, 57 × 57 × 3.0 | MEASURED (all rebuilds) | Print volume |
| Headless build time | exocage 0.43 s · monolith 0.52 s · **closed variant 0.24 s**; zero cosmetic skips in all three | MEASURED (2026-07-18) | **Decisive for the verdict** |
| STL export time | **0.03 s** per design | MEASURED (`build123d.export_stl`) | **Decisive for the verdict** |

---

## Motor Separation Finding

### The number

**Port 1 centre (−12, −12) → Port 3 centre (+12, +12) = 33.941 mm.**

`MEASURED-FROM-STEP` (`STP_MTX0013.step`): derived from the centroids of the eight
`PinSocket_2x05_P2_54mm_Vertical_SMD` bodies, which resolve the four port centres to
(±12.000, ±12.000) with a maximum deviation of **0.001 mm**. Diagonal = √(24² + 24²).

This is the **maximum achievable separation** between any two modules on this board. There is no
larger number available: the ports are the only mounting points, no extension kit exists, and the
board is 55 mm square.

### Uncertainty band on the actual coin position

The ERM's motor is a **rectangular placeholder with no cylindrical faces** — I searched and found
none. Its envelope centre is offset **+2.423 mm** from the module centre along the header-row axis.
A module can be inserted in either of two 180°-opposed orientations, so:

| Insertion case | Separation |
|---|---|
| Both offsets outward (best) | **37.52 mm** |
| Offsets aligned (nominal) | **33.94 mm** |
| Both offsets inward (worst) | **30.71 mm** |

`MEASURED-FROM-STEP` (`AX22-0013.step` + `STP_MTX0013.step`).

### Verdict on L/R discrimination

**Spatial left/right discrimination is not achievable. Do not build a vocabulary that depends on it.**

The brief cites ~70 mm as published vibrotactile two-point discrimination on the forearm;
`plan/PIVOT.md` independently states the same figure at lines 105, 134, 472 and 499. The achievable
separation is **33.9 mm nominal — under half that threshold, and below it in every insertion
orientation.** The two motors will be felt as one blurred source.

Two further facts sharpen this:

1. **`plan/PIVOT.md` is physically wrong and must be corrected.** Lines 105, 255, 472 and 640 require
   motors "on opposite sides of the wrist (inner/outer)", ~7 cm apart. **The measured maximum is
   33.9 mm, on a rigid 55 mm board, both modules socket-mounted on the same face.** Not achievable
   with the parts in hand. The checklist items at lines 255–256 and 640–641 ("Mount motors on
   opposite sides of wrist" / "if this fails, move them further apart") describe an action that
   **cannot be performed** — 33.9 mm is the ceiling. Delete them rather than leave a test whose
   failure branch is impossible.
2. **`plan/PIVOT.md`'s own port table is also wrong.** Lines 52–55 assign Port 1 = ToF, Port 2 = ERM,
   Port 3 = ERM, Port 4 = Mic. Ports 2 and 3 are **adjacent** (measured 24.000 mm), not diagonal —
   10 mm worse than the already-inadequate diagonal. The corrected map below puts the ERMs on {1,3}.

**Therefore the haptic vocabulary must be time-coded, not space-coded** — exactly what the old plan
already locked (`plan/2026-07-17-…md:18`: "the design gets distinguishability from **time**"). That
conclusion survives the pivot and is now *more* load-bearing, because the LCD — the old plan's
ground-truth fallback — is gone.

One option the haptics track will want: the motors are **distinguishable by amplitude and waveform,
not by location.** Treat the two ERMs as **one actuator with two drive channels**, not a left/right
pair.

---

## The 22.0 Constant Audit

### ⚠️ Corruption warning — read this first

**A blind `22.0 → 20.0` replacement in either script destroys the model.** There are **six**
semantically unrelated `22.0` constants across the two files, only **two** of which are the strap
gap. Worse, a global replace re-introduces a CRITICAL defect that two adversarial reviewers already
caught and a fix pass already closed:

- `MODULE_SQ = 22.0` is the **measured 22.000 × 22.000 mm AX22 module PCB** — I confirmed it on
  **9 of 10** modules in the family. Shrinking it to 20 under-sizes every module keep-out by 2 mm.
- `POST_INNER = 22.0` (exocage.py:206) is the **corner-post inner face**, geometrically fixed at
  `CAGE_HALF − POST_SQ` = 31 − 9. Shrinking it to 20 drives the posts 2 mm further inboard against
  modules whose corners reach ±23 → **a 3 mm static interference at every module corner**. That is a
  worse version of finding **MC-1 / F2** in `32-exocage-review-machinist.md` and
  `33-exocage-review-skeptic.md` (a 1 mm overlap, rated CRITICAL/MAJOR, blocking seating of both
  motors and the encoder), fixed in `34-exocage-fix-log.md` with pentagon posts. A global replace
  re-opens it.
- **`POST_INNER` was not in the task briefing's list.** It is the sixth constant, and the most dangerous.

### Complete inventory of every `22` literal in both scripts

#### `cad/braille_wearable_enclosure.py`

| Line | Token | Value | Actual meaning | Verdict |
|---|---|---|---|---|
| 85 | `MODULE_SQ` | 22.0 | AX22 module PCB square — **measured on 9 of 10 family modules** | 🔴 **MUST NOT CHANGE** |
| 87 | `LCD_PCB_H` | 22.0 | LCD PCB extent | ⚫ **DELETE with the LCD** — do not rescale |
| 129 | `LUG_GAP` | 22.0 | **Strap width** | 🟢 **CHANGE → 20.0** |
| 181 | `SIDEWIN_W` | 22.0 | −X side-window span along Y (y −11..+11) | 🔴 **MUST NOT CHANGE** — unrelated to strap |
| 723 | `if mx > 22.0:` | 22.0 | **Chamfer edge-selection filter** — button-trench X boundary | 🔴 **MUST NOT CHANGE** — changing it selects the wrong edges |
| 104 | `# … row 22` | — | Source-row citation | ⚪ Documentation |
| 301 | `"22x22 module PCB"` | — | Registry description | ⚪ Documentation |
| 312 | `"(HIGH, row22)"` | — | Registry description | ⚪ Documentation |
| 402 | `x_w = LCD_PCB_H + 2.0*MODULE_CLEAR_ROW` → 24.6 | LCD relief width | ⚫ **DELETE with the LCD** |
| 553 | `"22 x 12.6"` | — | Docstring describing `SIDEWIN_W` | ⚪ Documentation |
| 591, 954 | `"gap 22.0"`, `"gap 22"` | — | Docstring tracking `LUG_GAP` | 🟡 Update text to 20 |

#### `cad/braille_wearable_exocage.py`

| Line | Token | Value | Actual meaning | Verdict |
|---|---|---|---|---|
| 146 | `MODULE_SQ` | 22.0 | AX22 module PCB square — **measured** | 🔴 **MUST NOT CHANGE** |
| 148 | `LCD_PCB_H` | 22.0 | LCD PCB board-X extent | ⚫ **DELETE with the LCD** |
| 182 | `LUG_GAP` | 22.0 | **Strap width** | 🟢 **CHANGE → 20.0** |
| **206** | **`POST_INNER`** | **22.0** | **Post inner face = `CAGE_HALF − POST_SQ` = 31 − 9** | 🔴 **MUST NOT CHANGE — re-opens MC-1/F2 CRITICAL** |
| 456, 562, 586 | `POST_INNER` uses / `22` in comments | 22 | Post pentagon derivation + rim spans | 🔴 Follows `POST_INNER` |
| 163 | `# … row 22` | — | Source-row citation | ⚪ Documentation |
| 333 | `"22x22 module PCB"` | — | Registry description | ⚪ Documentation |
| 429, 782 | `"gap 22.0"`, `"gap 22"` | — | Docstring tracking `LUG_GAP` | 🟡 Update text to 20 |

#### Test suite

| Line | Assertion | Verdict |
|---|---|---|
| `test_exocage_build.py:324` | `assert mod.LUG_GAP == pytest.approx(22.0)` | 🟢 **CHANGE → 20.0** |
| `test_exocage_build.py:338` | `assert mod.POST_INNER == pytest.approx(22.0)` | 🔴 **MUST NOT CHANGE** |
| `test_enclosure_build.py:312` | `assert mod.SIDEWIN_W == pytest.approx(22.0)` | 🔴 **MUST NOT CHANGE** |

### Every LUG_GAP-derived value, old → new

`LUG_GAP` enters geometry through exactly one expression, once per script. Everything below cascades.

| # | Location | Expression | Old | **New (LUG_GAP = 20.0)** |
|---|---|---|---|---|
| 1 | enclosure.py:593 · exocage.py:430 | `x_ctr = LUG_GAP/2.0 + LUG_W/2.0` | 14.0 | **13.0** |
| 2 | derived from #1 | Lug block X span (`LUG_W` = 6 about `x_ctr`) | [11.0, 17.0] / [−17.0, −11.0] | **[10.0, 16.0] / [−16.0, −10.0]** |
| 3 | enclosure.py:629 · exocage.py:446 | Lug bore centre X (`cx = ±x_ctr`) | ±14.0 | **±13.0** |
| 4 | enclosure.py:634 · exocage.py:449 | Bore cut X extent (`_extrude_symmetric(prof2, LUG_W+2.0)` = 8.0 about `cx`) | [10.0, 18.0] | **[9.0, 17.0]** |
| 5 | `test_enclosure_build.py:26-27` | Lug-bore AIR probes | (±14.0, ±32.25, −3.0) | **(±13.0, ±32.25, −3.0)** |
| 6 | `test_exocage_build.py:99-100` | Lug-bore AIR probes | (±14.0, ±32.25, −3.0) | **(±13.0, ±32.25, −3.0)** |
| 7 | **exocage.py:217** | `WIN_W_Y = 18.0`, comment *"clears ±14 lugs"* | Window x ±9.0 vs lug inner face 11.0 → **2.0 mm margin** | Lug inner face → **10.0**, margin → **1.0 mm**. ⚠️ Below the `MULLION_W = 6.0` intent. **Recommend `WIN_W_Y → 16.0`**; update the stale "±14" comment to ±13. *(Moot if the exocage is not used.)* |

**Explicitly NOT affected by `LUG_GAP`** (verified by reading both `_add_lugs()` bodies in full —
enclosure.py:590-634, exocage.py:428-449):

`y_root` = `CAVITY_HALF` = 28.5 · `y_tip` = `CAGE_HALF + LUG_PROJ` = 36.0 · `y_mid` = 32.25 ·
`LUG_W` 6.0 · `LUG_H` 8.0 · `LUG_BORE` 2.6 · `LUG_BORE_Z` −3.0 · `LUG_PROJ` 5.0 ·
`CHAMFER_LUG` 1.5 · overall part bbox (62 × 72 mm, measured X ±31, Y ±36 on all variants).

### Safe procedure

Change `LUG_GAP` **by name, on its single line** (enclosure.py:129 / exocage.py:182), then update
items 5–7 and the docstrings. **Never** run a global find/replace on `22.0`. Re-run
`.venv/bin/python -m pytest cad/tests -q` afterwards (128 tests currently pass).

---

## Corrected Port Map

Port positions are `MEASURED-FROM-STEP` (`STP_MTX0013.step`, socket-pair centroids). GPIO assignments
are `CARRIED-OVER-UNVERIFIED` from `plan/2026-07-17-…md:34` and `audit/…/20-…md §4`.

| Port | Centre (measured) | Module | Part | IO0 | IO1 | IO2 | Signals used |
|---|---|---|---|---|---|---|---|
| **P1** | (−12.000, −12.000) | **ERM A** | AX22-0013 | GPIO4 | GPIO3 | GPIO2 | Data = **GPIO4** (IO0) |
| **P2** | (+12.000, −12.000) | **VL53L0CX ToF** | AX22-0015 | GPIO7 | GPIO6 | GPIO5 | SDA=**GPIO10**, SCL=**GPIO11** (shared) · XSHUT = **GPIO7** (IO0) |
| **P3** | (+12.000, +12.000) | **ERM B** | AX22-0013 | GPIO9 | GPIO16 | GPIO15 | Data = **GPIO9** (IO0) |
| **P4** | (−12.000, +12.000) | **PDM microphone** | **AX22-0044** (marking **T3902**) | GPIO1 | GPIO17 | GPIO18 | PDM CLK + DATA on 2 of the 3 IO pins — **confirm against the module silk at bring-up** |

- **Diagonals are {1,3} and {2,4}.** Measured: P1↔P3 = 33.941 mm; P1↔P2 = 24.000 mm (adjacent).
  ERMs on {1,3} for maximum separation; ToF + mic on {2,4}. **All four ports occupied.**
- **Zero LCD assignments. Zero encoder assignments.**
- Shared buses on every port: MOSI **GPIO12** / MISO **GPIO13** / SCK **GPIO14** / SDA **GPIO10** /
  SCL **GPIO11**. I²C was unused in the old build, so the ToF has a clean bus.
- **XSHUT pin derivation (new).** Comparing the two pinout images: the ERM's right header is
  `G · Vin · N.C · **D**(ata) · N.C` and the ToF's is `G · Vin · N.C · **Xs** · N.C` — Xs occupies
  **the same physical pin position** as the ERM's Data pin, which the locked map places on **IO0**.
  Therefore **ToF XSHUT = IO0 = GPIO7 on P2**. Corroboration: the ToF's *left* header is
  `N.C · N.C · N.C · SDA · SCL` (positions 4, 5), matching the shared-bus order
  `MOSI12 · MISO13 · SCK14 · SDA10 · SCL11` exactly. **The left header is the shared bus; the right
  header is power + IO.** Sources: `parts/distance-sensor-vl53l0cx/images/pinout/Pins-0015.png`,
  `parts/Vibration Motor (ERM)/vibration-motor-erm/images/pinout/Pins-0013.png`.
- **ToF I²C address 0x52 (8-bit) / 0x29 (7-bit)** is fixed in silicon. One ToF → no collision. XSHUT
  is a reset line, not required for single-sensor operation.
- **PDM mic pin assignment is the one unverified row — for `pins.h`, read this carefully.** A PDM mic
  needs **CLK (output, MCU → mic)** and **DATA (input, mic → MCU)**. P4 exposes exactly three IO pins:
  **GPIO1 (IO0) · GPIO17 (IO1) · GPIO18 (IO2)**. Two of those three carry CLK and DATA; the third is
  unused. **I could not derive which is which.** The XSHUT derivation above worked because I had
  pinout images for both the ERM and the ToF and could compare header silk position-by-position —
  **no pinout image or CAD exists in the repo for AX22-0044**, so the same method is unavailable.
  **Read the assignment off the module's silkscreen at bring-up.** An explicitly-flagged unknown is
  more useful here than a plausible wrong pin; do not let anyone guess it.
- **⚠️ ESP32-S3 constraint (established by a parallel track, recorded here because it binds
  `pins.h`): the PDM-to-PCM hardware converter exists on `I2S0` ONLY.** Binding the microphone to
  `I2S1` silently yields a **raw PDM bitstream instead of PCM, with no error raised** — it will look
  like the mic works and the audio is garbage. Use `I2S_NUM_0` for the mic. Pin choice itself is
  unconstrained: the ESP32-S3 routes I²S through the GPIO matrix, so any of GPIO1/17/18 can carry
  either signal.
- **AX22-0044 is not on the public Axiometa catalogue.** It is new hardware, in hand, uncatalogued.
  Tag it **REUSE / IN-HAND** in the BOM table with a footnote that no public product page exists.

> ### ⚠️ Inference trap — recorded so the next reader does not repeat it
>
> An earlier pass of this audit concluded the microphone was **not in hand**. The *evidence* was
> correct: there is genuinely no mic folder under `parts/`, no `part.json`, and no STEP file, and a
> recursive search for `*mic*`, `*mems*`, `*i2s*`, `*sound*`, `*audio*` genuinely returns nothing.
> **The inference from that absence was wrong.**
>
> AX22-0044 is a **new product not yet listed on the Axiometa website**. The catalogue entry, the
> `part.json`, and the STEP file are all missing *precisely because the part is new* — not because
> the hardware is absent. **"Not in the catalogue" and "not in the room" are independent facts, and
> for this part they diverge.**
>
> The generalisation worth keeping: in this repo, `parts/` is a **catalogue mirror**, not an
> inventory. Absence from `parts/` is evidence about Axiometa's product listing, and says nothing
> about what is physically on the bench. Ask a human before concluding a part does not exist.

---

## The ToF Optical Aperture — dimensioned requirement

**This is the highest-risk new enclosure feature, and it sits under the obstacle-reflex feature the
plan designates as must-ship.** Getting it wrong produces a sensor that reports a short, constant
false distance — a failure that looks exactly like a firmware bug.

### The mechanism

The VL53L0X emitter and receiver sit millimetres apart in one 4.4 × 2.4 mm package. IR from the
emitter that reflects off the **inside** of any cover material scatters straight into the receiver as
**optical crosstalk**. ST is explicit: *"signal from the emitter reflecting off the cover window and
being sensed by the receiver… **As the air gap increases, the amount of cross talk also increases**"*
and *"cross talk can be compensated **to a limit**"* (AN4907 DocID029711, fetched 2026-07-18).

### Why a cover window is impossible here — computed from our stack

ST's hard limit: **air gap + window thickness ≤ 2.0 mm** for sub-1000 mm ranging (≤ 1.0 mm for
>1000 mm ranging). Beyond 2.0 mm, *"a dedicated ID design study is required."* Our geometry:

| Quantity | Value | Source |
|---|---|---|
| Real VL53L0X emitting plane | **+12.68** (board-top datum) | MEASURED-FROM-STEP derived + ST package height |
| Deck inner face `Z_ROOF_INNER` | +16.25 | CARRIED-OVER-UNVERIFIED (enclosure.py:196) |
| **Air gap (sensor → wall inner face)** | **3.57 mm** | Derived |
| Wall thickness `ROOF_THICK` | 2.50 mm | CARRIED-OVER-UNVERIFIED (enclosure.py:128) |
| **Air gap + window** | **6.07 mm** | Derived |
| **ST limit** | **2.00 mm** | AN4907 §5 (fetched 2026-07-18) |

**We are at 3× the limit, and the air gap alone (3.57 mm) already exceeds it.** The gap is
structural — the deck sits at +16.25 because the *ERM* needs 15.25 + 1.0 clearance — so it cannot be
reduced without redesigning around the motor.

> **⭐ Conclusion: use an OPEN aperture with no cover material of any kind.** This is both the
> correct engineering answer and the cheapest. With no cover there is no window-reflection crosstalk
> source, and ST's air-gap/window budget stops applying. For a hackathon build this is unambiguously
> right. **Do not fit a lens, film, mesh, or clear window over the ToF.**

### Aperture sizing — derived from our stack, not quoted

ST sizes apertures to the **35° recommended exclusion zone**, not the 25° nominal FoV (AN4907 §5.1:
*"The 2 cones on the emitter FOV are the nominal cone (25 degrees) and recommended exclusion zone
(35 degrees)"*). I fitted ST's Table 1 (single oval aperture: 4.09 × 1.09 @ 0.5 mm; 4.44 × 1.44 @
1.0 mm; 4.99 × 1.99 @ 2.0 mm) to extract the underlying rule — the fit is consistent to ±0.05 mm
across all three rows:

> **X ≈ 3.78 + 0.63·g  ·  Y ≈ 0.78 + 0.63·g**  (g = distance from sensor to the aperture plane, mm;
> 0.63 = 2·tan 17.5°; constants absorb ST's ±150 µm X/Y, ±50 µm Z, ±2° tilt tolerances)

Applied to our geometry:

| Aperture plane | g | ST oval required | Round-hole equivalent |
|---|---|---|---|
| Deck **inner** face (+16.25) | 3.57 mm | 6.03 × 3.03 mm | Ø 6.03 |
| Deck **outer** face (+18.75) | **6.07 mm** | **7.60 × 4.60 mm** | **Ø 7.60** ← binding |
| + module registration ±1.27 mm | — | — | Ø 10.14 |
| **Recommendation (with print margin)** | — | — | **Ø 12.0 mm** |

**A straight Ø12 cylindrical through-hole, centred on the port centre (+12, −12), clears the 35°
exclusion cone at every depth** (required 6.03 at the inner face, 7.60 at the outer; 12 > both). **No
counterbore, no stepped wall, and no local thinning is needed** — the 2.5 mm wall is not a problem
once the hole is open and correctly sized.

### The remaining points

- **Maximum wall thickness:** not a constraint for an open hole. ST's ≤2 mm budget governs *cover
  window* crosstalk. The wall only matters geometrically (vignetting), and Ø12 through 2.5 mm does
  not vignette.
- **Internal baffle between emitter and receiver: do NOT attempt it.** ST's two-hole option needs a
  divider inside a package where emitter and receiver are ~2.6 mm apart — that demands a ~0.4 mm rib
  positioned to ±0.2 mm over a 4.4 mm span. **Not achievable at FDM resolution.** ST's **single oval
  aperture** option (Table 1) explicitly does not use a divider, and that is what a Ø12 open hole
  implements. Skipping the baffle is following ST, not cutting a corner.
- **Bore-wall reflection** is the one residual crosstalk path with an open hole. Mitigations, in
  order of value: (1) the Ø12 hole is already ~2 mm oversize all round versus the 7.60 requirement;
  (2) **print in black or dark filament** — light-coloured PLA is a decent IR diffuser; (3) chamfer
  the bore's outer edge to flare it; (4) run the sensor's crosstalk calibration **with the enclosure
  fitted**, never bare. ST notes the factory calibration flow *"takes into account all parameters
  (cover glass, temperature & voltage)"* and lists a cover above the module as an offset-calibration
  input (datasheet §2.3, §2.3.2).
- **Flush vs recessed:** the sensor sits **6.07 mm behind the outer face** and cannot be moved — its
  Z is fixed by the socket stack and the deck height is fixed by the ERM. Making it flush or proud
  would require a local deck depression over P2, which buys ~1 mm of aperture diameter and costs real
  geometry. **Not worth it: the Ø12 open hole already satisfies the requirement with margin.**

---

## The Microphone Acoustic Port

A microphone in a sealed pocket is badly attenuated and coloured — which would directly undermine
siren detection. This is a net-new enclosure feature with no equivalent in the old design.

**Port face — UNDETERMINED, flagged for physical inspection.** No STEP, no images, and no part folder
exist for AX22-0044, so I cannot measure which face the MEMS port sits on. What I can offer is an
**inference, not a measurement**: all 10 AX22 modules I measured place their functional component on
the **+Z face** (`MEASURED-FROM-STEP`, all `AX22-*.step`), so a **top-firing** port is much more
likely. **Confirm by eye before cutting metal** — a MEMS port is a small circular hole in the can
(top-firing) or in the PCB directly under the package (bottom-firing).

| Case | Enclosure consequence |
|---|---|
| **Top-firing** (likely) | Acoustic hole straight through the deck above the module, same as the ToF. Simple. |
| **Bottom-firing** | Sound path exits *downward* into the socket cavity. The deck hole does nothing; the interior must instead be vented — most cheaply by leaving the −Z pocket or a wall vent open. **Messier — worth 30 seconds of inspection to rule out.** |

**Recommendation (top-firing case):** a **Ø3.0 mm** hole through the 2.5 mm deck, centred on the port
centre (−12, +12). Rationale, kept proportionate:
- Effective port length = the deck thickness, **2.5 mm** (`ROOF_THICK`, CARRIED-OVER-UNVERIFIED
  enclosure.py:128). A short, wide port is always safer than a long, narrow one.
- Do **not** seal or gasket the module against the hole. The mic sits ~4.64 mm below the deck; a
  small open air path is more forgiving than a poorly-aligned seal, and misalignment is likely given
  the ±1.27 mm module registration ambiguity.
- If cosmetics allow, **3 × Ø1.5 mm in a triad beats a single Ø3.0** — it hedges against the port
  being offset from the module centre, which I cannot verify.
- The dominant risk is **occlusion**, not resonance. Siren energy is loud, broadband and
  low-frequency-rich; this is a far more forgiving feature than the ToF aperture and should not
  absorb design time.

---

## Old Global Constraints — Kept / Invalidated / Dropped

Source: `plan/2026-07-17-speech-to-braille-wearable.md` lines 13–38. Every bullet is accounted for.

| # | Constraint (line) | Status | Notes |
|---|---|---|---|
| 1 | **No soldering; all modules AX22 snap-in; all parts in hand** (:17) | 🟢 **KEEP UNCHANGED** | Holds completely. The ToF conforms to the AX22 family standard (measured), and the mic is confirmed in hand and same-form-factor. **All four ports populated; nothing to acquire.** |
| 2 | **BOM IS FIXED. No extension kit. Motors snap directly into ports → close together. Closeness ACCEPTED. Distinguishability from TIME.** (:18) | 🔴 **KEEP — MOST LOAD-BEARING ITEM IN THE SECTION** | My 33.941 mm measurement proves this correct and proves `plan/PIVOT.md` (105/255/472/640) wrong. **Carry into the new plan verbatim.** ⚠️ **Its escape hatch is GONE** — see row 11. |
| 3 | **Power: ≥1 A (≥5 W) USB source. Worst-case 3V3 ≈ 0.58 A; TLV62569 buck 2 A.** (:19) | 🟢 **KEEP UNCHANGED** | ⚠️ **At risk of silent loss — do not drop.** Average draw should *improve* (no LCD backlight, no encoder; ToF ~20 mA, PDM mic ~1 mA), but the binding constraint was never average draw — it is **2 × ERM inrush**, and both ERMs remain. |
| 4 | **Encoding LOCKED: 2 columns × 3 row-beats, Motor A = dots 1·2·3, Motor B = 4·5·6** (:20) | ⚫ **INVALIDATED** | No Braille. **Salvage:** "when both motors fire, micro-stagger left-then-right ~100 ms, never simultaneous" — a vibrotactile fact, not a Braille fact. |
| 5 | **Timing LOCKED: buzz 400 / gap 300 / letter 800 / word 1500 / stagger 100 ms** (:21) | ⚫ **INVALIDATED as a set** | Salvage as priors: ~400 ms is comfortably perceptible; ~100 ms stagger sequences two motors. |
| 6 | **Alphabet A–Z + gaps, no numbers/punctuation** (:22) | ⚫ **INVALIDATED** | Nothing to salvage. |
| 7 | **Throughput: 15-char cap; ~3.4–4.4 words/min** (:23) | 🟡 **INVALIDATED as stated; underlying fact now MORE important** | The cap is Braille-specific. The *rate* finding — this channel is extremely low-bandwidth — is why a situational-awareness device must convey state in **1–2 s, not 48**. |
| 8 | **Network LOCKED: phone hotspot; ESP32 outbound-only; all traffic to Vercel** (:24) | 🟡 **KEEP, BUT INSUFFICIENT** | ⚠️ **The old set contains nothing requiring a local real-time loop, and the new concept needs one.** An obstacle reflex that round-trips to Vercel is unusable. **NEW constraint required: ToF → haptic must be a local ESP32 loop with no network in the path.** A genuine gap, not a carry-over. |
| 9 | **WiFi fallback ladder** (:25) | 🟡 **KEEP, DEMOTED** | Valid if a cloud layer exists; much less critical once the reflex loop is local. A network outage should degrade semantics, not obstacle sensing. |
| 10 | **Pin map LOCKED; diagonals {1,3} and {2,4}** (:26-34) | 🟢 **KEEP the diagonal + GPIO table; DELETE LCD and encoder rows** | Re-confirmed: centres (±12.000, ±12.000), pitch 24.000, diagonal 33.941. |
| 11 | **Acceptance scenario-agnostic; success = buzzed sequence provably matches the on-screen caption vs a printed Braille chart** (:35) | 🔴 **INVALIDATED — MOST DANGEROUS SILENT DROP** | The old design had an **objective, falsifiable** acceptance test needing nobody to feel anything. **The new BOM deletes the LCD, so there is no on-device ground truth, and no replacement has been defined.** "The user felt an obstacle" is not falsifiable the same way. **Define a replacement before building.** This also removes row 2's escape hatch — **the wrist is now the only output channel.** |
| 12 | **Pitch integrity LOCKED: "gist" not "everything"; never claim world-first/novel/minimal-training; honest novelty = the LLM-reply loop** (:36) | 🟡 **KEEP the discipline; the specific claim is INVALIDATED** | The reply loop is gone, so the stated novelty is gone. A **new** honest novelty statement is required. Physical input: PIVOT's own table (27, 401) concedes the Sunu Band already does wrist sonar + haptics + edge detection for ~$299, differentiating only on "no microphone / no semantics" — **we now do have the microphone**, so that differentiation is real and defensible, provided the sound layer actually ships. |
| 13 | **Serverless is stateless; memory in Redis** (:37) | 🟢 **KEEP UNCHANGED** | Unaffected by the BOM change. |

### Load-bearing items most at risk of being lost

1. **≥1 A USB source** (row 3) — invisible until the demo browns out.
2. **No soldering / snap-in only** (row 1) — defines what is buildable.
3. **Motors are 33.9 mm apart, accepted; discrimination from time** (row 2).
4. **Diagonals are {1,3} and {2,4}** (row 10) — a previously-corrected error that will otherwise recur.
5. **A defined, objective acceptance test** (row 11) — currently a hole.
6. **NEW: the ToF → haptic reflex must be local, with no network in the path** (row 8).

---

## Skeleton Adaptation Assessment

Both designs are Fusion 360 Python scripts, **but both build headless** through `cad/tests/fake_adsk`,
a real build123d engine (`cad/tests/fake_adsk/fusion.py:1`: *"Fake `adsk.fusion` with a REAL geometry
engine"*). Verified: exocage **0.43 s**, monolith **0.52 s**, closed variant **0.24 s**; all
single-lump manifold solids, zero cosmetic skips; STL export **0.03 s**. Exported STL sizes match the
committed artifacts exactly. **No Fusion licence, no GUI, no cloud round-trip.**

### The design intent changes the answer

The user's steer — *"we can have cutouts for the mic and the ToF but ideally we can have holes for
those and rest is enclosed"* — is a closed body with two small apertures. That is **the monolith's
design language, not the exocage's**. The exocage is an open roll-cage skeleton by definition; making
it closed means deleting the thing it is.

### ⭐ The decisive experiment

I disabled the ten LCD/encoder/reveal cut calls in the monolith's build sequence
(enclosure.py:940-959) **in memory** and rebuilt. Disabled: `_cut_lcd_relief`, `_cut_p1_well`,
`_cut_grille`, `_cut_bezel_and_window`, `_build_turret`, `_cut_side_window`, `_reveal_chamfers`,
`_chamfer_lcd_bezel`, `_chamfer_side_reveal`, `_cut_usb_dock`.

| Result | Value |
|---|---|
| Build | **0.24 s, zero skips** |
| Body | **1 lump (manifold)**, 27 383.5 mm³ |
| Envelope | X ±31.00, Y ±36.00, Z −11.10..**+18.75** (was +23.00 — **4.25 mm shorter**, turret gone) |
| **Deck closed over P1 / P2 / P3 / P4** | **SOLID at z = 16.5, 17.0, 17.5, 18.0, 18.5 at all four ports — fully CLOSED** |

And every fit feature survived, probed individually:

| Check | Point | Result |
|---|---|---|
| **USB-C slot through +X wall** | (29.75, 0, −2.79) | **AIR ✓** |
| **USB-C slot interior / plug reach** | (31.5, 0, −2.79) | **AIR ✓** |
| +X wall solid away from the slot | (29.75, 16, −2.79) | SOLID ✓ |
| Button trench open | (25.76, 0, 19.0) | AIR ✓ |
| Lug bore | (14.0, 32.25, −3.0) | AIR ✓ |
| Boss pilot | (24.1, 24.1, −5.0) | AIR ✓ |
| −Z pocket clear at the JST | (19.2, 15.8, −7.0) | AIR ✓ |
| Board bay clear | (0, 0, 5.0) | AIR ✓ |

**Deleting the cuts closes the body for free.** The roof slab already exists; the reveals were cut
*into* it. Removing ten one-line calls yields exactly the requested closed shell with all fit
geometry intact — **and USB-C power access is preserved**, which was the explicit check.

### Monolith — constant-by-constant survival

**Survive unchanged:**

| Group | Constants | Why |
|---|---|---|
| Bay / shell | `BOARD_BAY` 55.0, `BAY_CLEAR` 1.0, `WALL` 2.5, `PLATE_T` 3.0, `ROOF_THICK` 2.5 | Board unchanged — measured 55.000 × 55.000 |
| Screw / boss | `BOARD_HOLE_X` 24.1, `BOSS_DIA` 7.0, `BOSS_PILOT` 1.8, `PLATE_CB_DIA` 4.0, `PLATE_CB_D` 2.0, `PLATE_HOLE_DIA` 2.4 | Measured holes at (±24.100, ±24.100), Ø3.400 |
| −Z pocket | `NEG_Z_POCKET` 6.5, `NEG_Z_DEEP` 5.59 | Measured JST at −5.585 — confirmed to 0.005 mm |
| **USB** | `USB_SLOT_W` 12.0, `USB_SLOT_H` 7.0, `USB_REC_ZLO/ZHI`, `USB_FUNNEL` 2.0 | Measured receptacle unchanged, 1.411 mm proud — **and empirically verified open in the closed variant** |
| Buttons | `BTN_X` 25.76, `BTN_Y` 17.0 | Measured (25.760, ±17.008 / +0.008) |
| Module keep-out | `MODULE_SQ` 22.0, `MODULE_CLEAR_ROW` 1.3 | ⭐ Derived against a *generic* 22×22 module — **the family standard I measured on 9 of 10 modules.** ToF and mic are dimensionally identical to the ERM. |
| **Z envelope** | `MOTOR_TOP` 15.25, `ROOF_CLEAR` 1.0, `Z_ROOF_INNER` 16.25, `Z_ROOF_OUTER` 18.75 | ⭐ **ToF (+14.66) < ERM (+15.30).** The ERM still governs. |
| Lugs | `LUG_W/H/BORE/BORE_Z/PROJ`, `CHAMFER_LUG` | Independent of `LUG_GAP` |

**Must change:**

| Change | Effort |
|---|---|
| `LUG_GAP` 22.0 → 20.0 (enclosure.py:129) + 2 test probes + docstrings | 1 line + 2 coords |
| Delete 10 build-sequence calls (enclosure.py:940-959) | **10 lines** — empirically verified above |
| Delete now-dead constants: all `LCD_*`, `BEZEL_*`, `CHAMFER_BEZEL`, `SIDE_REVEAL_CHAMFER`, `ENC_*`, `ENCODER_BORE`, `TURRET_*`, `HEXRING_*`, `P1_*`, `GRILLE_*`, `SIDEWIN_*`, and the `x_w` derivation at enclosure.py:402 | ~35 dead constants (cosmetic hygiene, not fit-critical) |
| **Add** `_cut_tof_aperture()` — Ø12.0 through-hole at (+12, −12) | ~6 lines; the script already has `_sketch_on_xy_at` / `_extrude` and does this pattern elsewhere |
| **Add** `_cut_mic_port()` — Ø3.0 through-hole at (−12, +12) | ~6 lines, same pattern |
| Update `test_enclosure_build.py` probes for the closed deck + 2 new apertures | ~10 probe lines |

### Exocage — why it loses on this brief

| Criterion | Monolith (closed variant) | Exocage |
|---|---|---|
| **Matches "closed body, small holes only"** | **✅ empirically demonstrated** | ❌ open skeleton by design — closing it means rebuilding it |
| Geometry to add | 2 small cuts | a roof, 4 wall infills, then 2 cuts |
| Encoder removal | delete `_build_turret()` (1 line) | constants only (turret already deleted in file 34) |
| Structural review status | reviewed; deck is what changes, and the change is *deletion* | PASS by two reviewers (files 32/33/34) — but for the *open* design |
| Print volume (measured) | 27.38 + 9.63 = **37.01 cm³** | 16.68 + 9.63 = 26.30 cm³ |
| Envelope (measured) | 62 × 72 × **29.85 mm** | 62 × 72 × 27.60 mm |
| ToF placement freedom | any port | any port |

The exocage is the lighter, faster print and has the stronger review pedigree — but it is the wrong
shape for the stated intent, and closing it is strictly more work than opening the monolith's two
holes. **Note the honest cost of enclosing: the closed monolith is +20 % material over the open
monolith and +41 % over the exocage.** That is the price of the design intent, and it is worth paying
only because the deletion path is nearly free.

### Does deleting the LCD and encoder free enough volume to shrink the part? **No.**

- **X/Y footprint is BOM-independent:** 62 × 62 = board 55 (measured) + 2 × 1.0 clearance + 2 × 2.5
  wall. Neither the LCD nor the encoder drove it. Measured X ±31.00 on every variant.
- **Z is governed by the ERM,** not by the deleted parts: measured ERM +15.30 vs ToF +14.66.
- Lugs set Y = 72 mm and are unaffected (`LUG_PROJ` is in Y; `LUG_GAP` is in X).

**The only real dimensional saving is the encoder turret: +23.00 → +18.75 mm (measured), a 4.25 mm
height reduction, which also retires audit-20 risk 4 ("the encoder knob makes the worn device tall").**
Closing the reveals *adds* 4.5 cm³ of material. Net: the part gets **shorter but heavier**.

---

## Go/No-Go Verdict

### **ADAPT THE MONOLITH** (`cad/braille_wearable_enclosure.py`) — closed variant.

This reverses my pre-correction position, and I want to be explicit about why, because the reversal
is evidence-driven rather than deference-driven. My earlier "no enclosure" leaning rested on three
legs. Two collapsed and the third is unaffected either way:

1. ~~The BOM is not closed (no microphone)~~ → **false.** The mic is in hand (AX22-0044 / T3902), and
   all four ports are populated.
2. ~~Adaptation is expensive~~ → **false, and I measured it.** Ten one-line deletions produce a
   closed, manifold, fully-fit-correct body in **0.24 s**, with USB-C, buttons, lugs, bosses and the
   −Z pocket all verified intact.
3. The ToF-boresight / haptic-coupling conflict (below) is **real and unchanged** — but it is a
   property of the board, not the shell, so it argues for a *wear decision*, not against enclosing.

Combined with an explicit user preference for a closed body, the honest answer is to build it.

#### Answering the direct challenge: "doesn't a real microphone *strengthen* the case for no enclosure?"

It was put to me that a strapped bare board needs no acoustic port at all, so the mic's existence
argues for skipping the enclosure. **On the narrow point, that is correct — and it is not what
decided this.** Stating my reasoning explicitly so the reader can disagree with it:

- **Agreed:** the microphone, considered alone, is an argument *against* enclosing. It adds a
  net-new acoustic port with an undetermined firing face (Residual Risk #3), and a bare board has a
  perfect acoustic path. Same for the ToF: a bare board has no cover and therefore no crosstalk
  risk at all. **On sensor grounds, bare wins on both counts.**
- **But the verdict did not turn on the mic.** It turned on two other things: (a) the user's explicit
  design intent for a closed body with small apertures — a product decision that is theirs to make,
  not a technical question I should override; and (b) the **measured** cost of complying, which is
  ten line deletions and a 0.24 s rebuild, far cheaper than I estimated before running the
  experiment. The mic being real removed one *objection* to enclosing; it was never the reason to
  enclose.
- **Where the sensor argument does bite, I have priced it in rather than dismissed it:** the ToF
  aperture is specified as a **fully open Ø12 hole with nothing over it** (which recovers most of the
  bare-board optical advantage), and the mic port is specified generously with a
  three-hole hedge against an offset MEMS port.
- **The one thing enclosing genuinely costs, and I want it on the record:** ~25–35 g of PLA mass
  damping a 0.9 g coin motor, plus 26 mm of stack between motor and skin (caveat 2 below). That is a
  real regression in haptic amplitude versus a bare board, on a device whose *only* output channel is
  haptic. **If the first print's bench test shows the buzz is marginal, the correct response is to
  abandon the enclosure and strap the bare board** — not to redesign the enclosure. That fallback
  should stay live until the bench test passes.

So: **verdict revised, and revised for reasons unrelated to the microphone.** Bare-board remains the
documented fallback with a concrete trigger (caveat 2 / Residual Risk #10).

#### If the exocage path is taken instead (not recommended, but priced)

Should someone prefer the lighter, faster-printing exocage despite the closed-body intent, both new
features are **free of geometry** in that design — I verified this empirically with the cone probe:
the exocage has **zero material in a 25° cone over all four ports, from the sensor plane to z = +24**.

- **ToF optical aperture: nothing to cut.** Open sky already satisfies it, and with no wall in front
  of the sensor there is no cover-crosstalk risk and no aperture sizing problem at all. This is
  strictly *better* optically than the monolith's Ø12 hole.
- **Mic acoustic port: nothing to cut.** Open sky above P4 is an unobstructed acoustic path,
  regardless of whether the module turns out to be top- or bottom-firing — which also makes Residual
  Risk #3 disappear.
- **Cost of that path:** it does not match the requested closed form, it leaves the electronics
  exposed, and `WIN_W_Y` needs the 18.0 → 16.0 correction (item 7 of the LUG_GAP table).

In other words the exocage is technically the *easier* and *optically safer* host for both new
sensors; it loses purely on form factor.

**Do not adapt the exocage** — right engineering, wrong shape for this brief.
**Do not start fresh** — every board-derived constant I re-measured (55.000 footprint, ±24.100 holes,
24.000 port pitch, −5.585 JST depth, 25.760/±17.008 buttons, 1.411 USB proud) confirms the existing
script to within 0.05 mm. A fresh pass would re-derive correct numbers and discard two adversarial
review passes.

### The build

| Step | Action | Time |
|---|---|---|
| 1 | `LUG_GAP` 22.0 → **20.0** (enclosure.py:129); update the 2 lug-bore test probes to ±13.0 | 5 min |
| 2 | Delete the 10 cut calls at enclosure.py:940-959 (list in the experiment above) | 5 min |
| 3 | Add `_cut_tof_aperture()` — **Ø12.0** through the deck at **(+12, −12)** | 10 min |
| 4 | Add `_cut_mic_port()` — **Ø3.0** through the deck at **(−12, +12)** *(confirm top-firing first)* | 5 min |
| 5 | Prune dead constants; update test probes; re-run `pytest cad/tests -q` | 15 min |
| 6 | Regenerate STL headless | **&lt;1 s** |
| | **Total editing** | **~40 min** |
| 7 | Print (37.01 cm³ measured) | **~3–4.5 h ESTIMATE — not sliced** |

Print it in **black or dark filament** (bore-wall IR absorption, see the aperture section) at **low
infill, 10–15 %** (mass damping, see below). Start the print before the firmware work, not after —
it is unattended machine time, not person time.

### Three caveats the enclosure cannot fix — carry these forward

**1. The ToF boresight and ERM haptic coupling are in direct, unresolvable conflict.** Measured: every
module mounts on the board's **+Z face**, and the ToF's sensing axis is **rigidly normal to the
board**. With no extension cables the sensor cannot be aimed independently of the board. So:

- Board **+Z outward** → ToF aims correctly; both ERMs sit **~26 mm from skin** across the board, an
  air pocket and the 3 mm plate.
- Board **+Z inward** → ERM coins touch skin (excellent haptics); **the ToF fires into the forearm.**
  Useless.

There is no third option, and **no enclosure can resolve it — it is a property of the board.** The
forced choice is +Z outward. **How the device is worn is how the sensor is aimed**; settle that
deliberately rather than discovering it on stage.

**2. Enclosing costs haptic amplitude, mostly through added mass.** The measured part is 37.01 cm³ of
PLA (~25–35 g at 10–15 % infill) for a ~0.9 g coin motor to shake, and the motor couples to skin
through 26 mm of rigid stack. Rigid coupling transmits vibration reasonably — the real loss is mass
damping and the loss of any localisation. Mitigate with **low infill** and a **firm strap**; a loose
strap is far worse than a heavy part. **Bench-check perceived intensity on the first print before
committing the haptic vocabulary to it** (this is audit-20 risk 5, still unquantified).

**3. The ToF aperture must be an open Ø12 hole with nothing over it.** Computed above: our air gap
(3.57 mm) alone already exceeds ST's entire 2.0 mm air-gap-plus-window budget, and the full stack
(6.07 mm) is 3× it. Any cover material produces optical crosstalk that presents as a constant false
short reading — a firmware-looking bug that will burn hours. **Calibrate crosstalk with the
enclosure fitted, never bare.**

---

## Grounding Notes

**Filesystem confirmations (2026-07-18):**

- **AX22 family standard established from 10 module STEPs** — `AX22-0003/0005/0011/0013/0015/0018/0028/0034/0040/0050.step`.
  Header rows at Y = ±8.9 on **10 of 10**; 22.000 × 22.000 × 1.510 PCB on **9 of 10** (double-wide LCD
  the exception); Ø2.700 holes at (±9.000, ±9.000) on **8 of 10**. This is what licenses the
  `ASSUMED-AX22-STANDARD` tag on the microphone's footprint.
- **No CAD, images, or part folder exist for AX22-0044.** Its footprint is inferred from the family
  standard plus user confirmation; its **Z height and acoustic-port face are unmeasured** and flagged.
- Hack dates verified against the system calendar: 2026-07-17 Friday, **2026-07-18 Saturday (today)**,
  2026-07-19 Sunday.

**Web sources (all fetched 2026-07-18):**

- **ST VL53L0X datasheet, DocID029104 Rev 2 (April 2018)** — https://www.pololu.com/file/0J1187/VL53L0X.pdf
  (mirror; canonical https://www.st.com/resource/en/datasheet/vl53l0x.pdf was **unreachable** from
  this environment — HTTP/2 `INTERNAL_ERROR`, then timeouts). Document identity confirmed from the
  page footers. Used for: 25° system FoV (§5.1); Optical LGA12 package **4.40 × 2.40 × 1.00 mm**
  (Table 1); I²C address 0x52 8-bit, 0x29 7-bit derived from the Fig. 14 bit diagram (**ST never
  prints "0x29"**); ranging profiles (Table 13); calibration inputs (§2.3, §2.3.2).
- **ST AN4907, "VL53L0X ranging module cover window guidelines", DocID029711 Rev 1 (Oct 2016)** —
  https://strawberry-linux.com/pub/en.DM00326504.pdf (mirror; canonical
  https://www.st.com/resource/en/application_note/an4907-vl53l0x-ranging-module-cover-window-guidelines-stmicroelectronics.pdf
  is **Rev 3, Nov 2018** and was not reachable). Used for: the **35° recommended exclusion zone**
  (§5.1); aperture Tables 1 and 2; the **air gap + window ≤ 2.0 mm** limit (≤1.0 mm above 1000 mm
  ranging); crosstalk mechanism and its growth with air gap; "compensated to a limit".
  ⚠️ **Revision gap Rev 1 vs Rev 3 is unverified** — the numbers matched Rev 3 search snippets, but
  treat the aperture tables as Rev 1 values.
- **ST Community, "Time-of-Flight cover glass"** — https://community.st.com/t5/mems-and-sensors/time-of-flight-cover-glass/ta-p/49259
  (corroborating only; no number in this report rests on it).

**Assumption flagged as unverified:** the **~70 mm forearm vibrotactile two-point discrimination**
threshold is taken from the task brief and `plan/PIVOT.md` (105, 134, 472, 499), not independently
sourced. The motor-separation conclusion does not hinge on its precision — the measured 33.941 mm is
under half of it, and stays under half across the entire 30.71–37.52 mm insertion band.

---

## Residual Risk

| # | Risk | What it would take to close |
|---|---|---|
| 1 | **The ToF aperture is the single highest-risk feature.** Cover material of any kind → optical crosstalk → constant false short reading that mimics a firmware bug. Our air gap alone (3.57 mm) exceeds ST's whole 2.0 mm budget. | Cut Ø12.0 open, nothing over it, dark filament, and run crosstalk calibration **with the enclosure fitted**. Bench-verify against a known distance before the demo. |
| 2 | **The mic's Z height is unknown.** Available headroom is **4.64 mm** (deck inner +16.25 − module PCB top +11.61). The ERM uses 3.685. **If the mic exceeds 4.64 mm above its PCB top it will hit the deck** — and the family's tallest non-encoder module (DHT11) is 5.835 mm, so this is not a hypothetical. | **Calipers, 60 seconds.** Measure the mic's tallest point above its module PCB. If > 4.64, raise `Z_ROOF_INNER` (and `Z_ROOF_OUTER` with it) by the difference and re-run — a two-constant change, and the aperture maths above then needs recomputing for the larger air gap. |
| 3 | **The mic's MEMS port face is undetermined** — top-firing vs bottom-firing. My +Z inference is from the other 10 modules, **not** from this one. | Look at the module. Top-firing → Ø3.0 through the deck as specified. Bottom-firing → the deck hole is useless and the interior needs venting instead. |
| 4 | **ERM coin diameter, protrusion and true centre are unknown.** The STEP is a **rectangular placeholder with zero cylindrical faces**. The 2.423 mm offset producing the 30.71–37.52 mm band is a placeholder centroid, not a coin centre. | Calipers, 2 minutes. Does **not** change the L/R verdict — the whole band is below threshold. |
| 5 | **The STEP's ToF optical package is a VL53L1X sibling model** (measured 2.500 × 4.900 × 1.570 vs ST's real 4.40 × 2.40 × 1.00). I corrected for this in the aperture maths (real emitting plane +12.68, not +13.26), but the *lateral* position of the emitter/receiver pair within the package is taken from the wrong part. | Immaterial at Ø12 — the hole is ~2 mm oversize all round. Would matter only if someone tried to size a minimal two-hole aperture. |
| 6 | **Module rotational registration ±1.27 mm** (half a 2.54 pitch); pin-1 polarity is not in the geometry. Header/socket footprints are pin-level incoherent by ~0.14 mm (I measured 17.790 module row spacing vs 17.940 socket outer-row spacing, reproducing the ~0.16 mm mismatch in `20-…md §2`). | Dry-fit each module; confirm it centres on its port against the silk labels. The Ø12 aperture already absorbs ±1.27. |
| 7 | **`BOARD_THICK` is coded 1.6 but measures 1.510** (enclosure.py:81). Every −Z derived value is 0.09 mm optimistic. | Harmless at current clearances (−Z pocket has 0.91 mm margin over the measured JST depth); correct it if the pocket is ever tightened. |
| 8 | **Neither design has ever been printed.** All validation is static/offline; chamfer edge-filters and boolean participation are historically the fragile spots (`20-…md §7` risk 1). | A test print, ~3–4.5 h ESTIMATE (unsliced). `20-…md §6` advises printing a spare. |
| 9 | **The wear orientation / sensor-aiming conflict is unresolved** and is a product decision, not a CAD one. The enclosure freezes the answer. | A human decides how the device is worn and demonstrated — settle it **before** the print finishes. |
| 10 | **Haptic amplitude through a 37 cm³ enclosure is unquantified** (audit-20 risk 5, still open). Added mass damps a 0.9 g coin motor. | Bench test on the first print: strap it on, fire each motor, confirm it is unambiguously perceptible before the vocabulary depends on it. |
| 11 | **No objective acceptance criterion exists for the new concept** (constraints row 11). The old caption-vs-buzz test died with the LCD. | The plan must define a replacement. Outside my track, but a direct consequence of a BOM change and otherwise lost silently. |
| 12 | **PDM mic pin assignment (CLK/DATA) on P4 is unverified** — no CAD or silk image for AX22-0044. | Read the module silk at bring-up. ESP32-S3's I²S peripheral routes PDM through the GPIO matrix, so no pin among GPIO1/17/18 is disqualified. |
