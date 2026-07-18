# 07 — Phase 1: Dimensions & Aperture Research (new BOM)

**Date:** 2026-07-18
**Author:** Phase 1 (measurement + research only — **no CAD code written, no existing file modified**)
**Method:** direct STEP interrogation with `build123d` 0.11.1 (repo `.venv`) + live web fetches on 2026-07-18.
**Consumer:** Phase 2 (CAD implementation). Everything Phase 2 needs to cut geometry is in §5.

---

## 1. Scope

### Numbering-gap note

The task brief dictates the number `07`. At the time this file was written the topic folder contained
`01`–`04` (tracked) plus an **untracked `05-research-and-spec.md`** that appeared during this session from
a parallel track (Modal vision service — no CAD content, no conflict with this file). **`06` does not
exist.** The gap `06` is therefore real and unexplained; `05` exists but is not a CAD document.

### What I measured, and how

Every module STEP was loaded, its assembly tree walked child-by-child with per-child bounding boxes, and
solids named so each number is traceable to a label. Cylindrical faces were extracted via
`BRepAdaptor_Surface` → `GeomAbs_Cylinder` to recover hole diameters and centres; horizontal planar faces
were binned by z and summed by area to find can tops, recesses and roof thicknesses; and the reference
shell was additionally probed with `BRepClass3d_SolidClassifier` point-in-solid tests (solid/air rasters)
because its features are not all cylinder-derivable.

| File | Solids | Load | What I took from it |
|---|---|---|---|
| `parts/analog-microphone/files/AX22-0009.step` | 19 | 0.25 s | **Net-new.** Footprint, datum, holes, headers, tallest feature, electret capsule position/size, port face |
| `parts/Axiometa Genesis Mini - Starter Kit/passive-buzzer/files/AX22-0018.step` | 21 | 0.18 s | Confirm 3.085 / `MLT-8530`; buzzer body centre + diameter for grille placement |
| `parts/distance-sensor-vl53l0cx/files/AX22-0015.step` | 47 | 0.24 s | Sanity check only (optical package XY centre, tallest feature) |
| `cad/reference/genesis-mini-shell.step` | 4 | 0.17 s | Envelope, M2 boss stack, board seat, **lid roof + module posts + the P4 buzzer grille** |
| `parts/analog-microphone/images/pcb/T_0009.png`, `B_0009.png`, `gallery/105_*.png` | — | — | Acoustic-port face resolution (the physical photo is decisive) |

**Datum convention verified, not assumed.** All three module STEPs were explicitly checked: PCB solid
`min.Z == 0.000` is **True** on all three, and PCB thickness measures **1.510** on all three. So
"height above PCB top" = (solid `max.Z`) − 1.510 is valid for every number below.

### Web research

Nine fetches, listed with verdicts in §3. Canonical `st.com` was tried first for AN4907 and **timed out**
(60 s, no response); the audit/01 mirror worked and is what every ST number here comes from. Two intended
sources were unreachable and are reported as such rather than quietly dropped (§3, §8 risk 9).

### What I skipped, and why

- **Re-deriving the ToF beyond the two sanity checks the brief asked for.** audit/01 has it; both checks pass.
- **The Genesis Mini board STEP.** Unchanged by the BOM swap; audit/01's numbers stand.
- **Slicing / print-time estimates.** Not asked for, and nothing here is print-time sensitive.
- **`AX22-0018-datasheet.pdf` and `AX22-0009-datasheet.pdf`.** Both files in the repo are **HTML error
  pages, not PDFs** (`file` reports "HTML document text"; contents are the LCSC page shell). The scrape
  failed for both. Nothing in this report depends on them.

---

## 2. BOM-change impact — audit/01's Z chain is dead

### The swap

| | audit/01's BOM | **Locked new BOM** |
|---|---|---|
| Ranging | VL53L0CX ToF (AX22-0015) | VL53L0CX ToF (AX22-0015) — unchanged |
| Output | **2 × ERM vibration motor (AX22-0013)** | **2 × passive buzzer (AX22-0018)** |
| Input | **PDM digital mic (AX22-0044, no STEP, no images, uncatalogued)** | **1 × analog electret mic (AX22-0009, full STEP + images + photos)** |

### What that invalidates — bluntly

audit/01's entire vertical stack hangs off one sentence: *"the ERM at 3.685 mm above module PCB top is the
tallest module in the BOM."* **The ERM is out of the BOM. That sentence is now false, and every number
downstream of it is wrong.**

The failure is **not** in the direction audit/01 hedged for. audit/01 anticipated the deck possibly
needing to come *down* (the buzzer is 0.600 mm shorter than the ERM) and wrote that this was the "biggest
single reason adaptation is cheap." The opposite happened:

> **The AX22-0009 microphone carries a Bourns-style `3362P` top-adjust trimpot whose body top measures
> 4.965 mm above the module PCB top — 1.280 mm TALLER than the ERM it replaces, and 1.880 mm taller than
> the buzzer. The microphone module, not the output device, now governs the deck height.**

audit/01 flagged exactly this as **Residual Risk #2** ("The mic's Z height is unknown… available headroom
is 4.64 mm… if the mic exceeds 4.64 mm above its PCB top it will hit the deck"). **That risk has now
fired.** 4.965 > 4.640. Building audit/01's deck as specified produces a **0.325 mm hard interference
between the trimpot body and the deck underside** — the module would not seat.

### Invalidated rows, itemised

| audit/01 claim | Location in audit/01 | Status |
|---|---|---|
| "ERM… **3.685 mm** ← tallest module in our BOM" | family table, row `0013` | ⚫ **VOID** — part removed from BOM |
| "**ERM motor top +15.30** above board top" | derived mated stack | ⚫ **VOID** |
| `Z_ROOF_INNER` +16.25 | derived stack / `enclosure.py:196` | 🔴 **WRONG — too low by 1.325 mm** |
| `Z_ROOF_OUTER` +18.75 | derived stack / `enclosure.py:197` | 🔴 **WRONG — too low by 1.325 mm** |
| "Module headroom **4.64 mm**… the mic must be ≤ 4.64" | derived stack, ⭐ row | 🔴 **VIOLATED** — measured mic is 4.965 |
| "**Air gap 3.57 mm**" (sensor → deck inner) | ToF aperture section | 🔴 **WRONG** — now **4.890 mm** |
| "Air gap + window **6.07 mm**" (sensor → deck outer) | ToF aperture section | 🔴 **WRONG** — now **7.390 mm** |
| "required **Ø7.60** at the outer face… recommend **Ø12.0**" | aperture table | 🔴 **UNDERSIZED** — now **Ø8.9** required, **Ø13.0** recommended |
| "Every Z constant derived from `MOTOR_TOP` survives the BOM change untouched" | ⭐ load-bearing consequence | ⚫ **EXACTLY BACKWARDS** |
| "MEMS port face **UNDETERMINED**" | PDM mic table | 🟢 **RESOLVED** for the new part — top-firing, photographed (§4) |
| "PDM mic pin assignment unverified", "AX22-0044 uncatalogued", ESP32 `I2S0` constraint | port map + risk 12 | ⚫ **MOOT** — the new mic is a single-ended **analog** output (`A` on IO0), no I²S, no PDM |

### What survives untouched

The open-Ø-hole verdict, the "no cover window of any kind" conclusion, the 35°-exclusion-zone sizing
method, the ±1.27 mm registration allowance, the dark-filament recommendation, and calibrating crosstalk
with the enclosure fitted. **The reasoning was right; only the input number changed.** Also unchanged: the
board, the port centres (±12.000, ±12.000), the 33.941 mm diagonal, and every X/Y constant — the footprint
is BOM-independent.

---

## 3. Web-search verdicts

Every row fetched **2026-07-18**. "Verdict" is what I concluded *for this design*, not a paraphrase of the source.

| # | Claim | Verdict | Source URL | Fetched |
|---|---|---|---|---|
| **ToF (VL53L0CX / VL53L0X)** ||||
| T1 | Aperture must be sized to the **35° recommended exclusion zone**, not the 25° nominal FoV | **CONFIRMED** verbatim: §5.1 "The 2 cones on the emitter FOV are the nominal cone (25 degrees) and recommended exclusion zone (35 degrees)" | https://strawberry-linux.com/pub/en.DM00326504.pdf (AN4907 Rev 1, DocID029711) | 2026-07-18 |
| T2 | Exclusion-area **Table 1** (single oval): 0.1→3.81/0.81 · 0.5→4.09/1.09 · 1.0→4.44/1.44 · 1.5→4.68/1.68 · 2.0→4.99/1.99 mm (X/Y) | **CONFIRMED — full 12-row table read directly.** X − Y = 3.00 on every row (= emitter↔collector pitch, Fig. 15). **Low-gap slope is 0.700/mm, not 0.63** — see §5 | same (AN4907 Rev 1, Table 1, p.13) | 2026-07-18 |
| T3 | Two-hole option **Table 2**: collector Ø0.57→1.41, emitter Ø0.79→1.99 over 0.1→2.0 mm gap | **CONFIRMED**, and **rejected for this build** — sub-2 mm holes on a 3.00 mm pitch are not FDM-achievable | same (AN4907 Rev 1, Table 2, p.14) | 2026-07-18 |
| T4 | **air gap + window thickness ≤ 2.0 mm** for sub-1000 mm ranging; ≤1.0 mm for >1000 mm; beyond 2.0 mm "a dedicated ID design study is required" | **CONFIRMED** verbatim (§5.1). Our stack is **7.390 mm = 3.7× the limit** → **no cover material of any kind.** Note ST also says "ideal ID design has a **small air gap (<0.5 mm)**" — unreachable here | same (AN4907 Rev 1, §2.1, §5.1) | 2026-07-18 |
| T5 | Crosstalk grows with air gap and "can be compensated **to a limit**" | **CONFIRMED** (§3.1.3, Fig. 12 shows crosstalk rising steeply past 0.5 mm) | same (AN4907 Rev 1) | 2026-07-18 |
| T6 | ST recommends a **gasket** when the gap cannot be reduced (Fig. 5) | **CONFIRMED but NOT APPLICABLE** — a gasket exists to seal a *window*. With no window there is nothing to seal | same (AN4907 Rev 1, §2.1) | 2026-07-18 |
| T7 | Real package is **4.4 × 2.4 × 1.0 mm**, range 2 m, "advanced embedded optical cross-talk compensation" | **CONFIRMED** — p.1 features list. Validates audit/01's correction of the STEP's oversized VL53L1X stand-in | https://www.pololu.com/file/0J1187/VL53L0X.pdf (DocID029104 Rev 2, Apr 2018) | 2026-07-18 |
| T8 | Canonical `st.com` AN4907 URL | **UNREACHABLE** — 60 s timeout, no response. Mirror used instead (Rev **1**, Oct 2016; canonical is Rev 3, Nov 2018 — revision delta unverified, same caveat audit/01 raised) | https://www.st.com/resource/en/application_note/an4907-…pdf | 2026-07-18 |
| **Microphone (acoustic port)** ||||
| M1 | **"A short, wide acoustic path has minimal effects on the mic response while a long, narrow path can create peaks in the audio band"** | **CONFIRMED** verbatim (§3.2.1). This is the single most load-bearing mic sentence in this report — it says *wider is safer*, which is the opposite of the MEMS-port instinct | https://media.digikey.com/pdf/data%20sheets/knowles%20acoustics%20pdfs/sisonic_design_guide.pdf (SiSonic Design Guide Rev 3.0 / AN16) | 2026-07-18 |
| M2 | Recommended **case hole diameter 1.5 > D ≥ 1.0 mm**; gasket cavity D > 1.5 mm | **CONFIRMED** (Table 4, p.17) but **DOES NOT TRANSFER.** That table is for a *gasket-sealed* path onto a **Ø0.25–0.84 mm MEMS port**. Ours is an **unsealed** cavity over a **Ø6.0 electret** standing 3.38 mm off the wall — see §5 note | same (Knowles Table 4) | 2026-07-18 |
| M3 | Fixes for a bad acoustic path, in the source's own order: **larger case port hole**, thinner case at the hole, wider cavity, shorter path | **CONFIRMED** (§3.2.1 list). Directly supports going **larger**, not smaller | same (Knowles §3.2.1) | 2026-07-18 |
| M4 | "Case holes and gasket ports can be **non-circular**, and will generally give similar performance as a circular hole with the **same cross-sectional area**" | **CONFIRMED** (§3.2.2 preamble). Licenses slots/grilles being specified by open area | same (Knowles) | 2026-07-18 |
| M5 | A screen/mesh is an *acoustic resistance* used to **damp a resonant peak** in top-port designs | **CONFIRMED** (§3.3, Fig. 21) — and therefore **NOT wanted here**: we have no sealed cavity to resonate (§5). A mesh would only add insertion loss | same (Knowles §3.3) | 2026-07-18 |
| M6 | Gasket leaks cause echo/noise; a good seal is required **for gasketed designs** | **CONFIRMED** (§3.4) — and the reason to choose **no gasket at all** rather than a bad one, given ±1.27 mm registration | same (Knowles §3.4) | 2026-07-18 |
| M7 | Electret capsules take sound in through the **front (closed) face**, typically behind a dustproof mesh or membrane; rear holes set directivity | **CONFIRMED** | https://ecmicrophones.com/hole-design-in-electret-microphone-capsules/ | 2026-07-18 |
| M8 | "Enclosure thickness in front of the mic < 1 mm; single hole > Ø1.3 mm, multiple holes > Ø0.8 mm" | ⚠️ **NOT CONFIRMED.** This appeared in the search index snippet for M7 but is **absent from the fetched page**. **Not used.** Recorded only so nobody re-finds the snippet and treats it as sourced | search snippet only (page fetched, claim not present) | 2026-07-18 |
| M9 | InvenSense AN-1003 (PCB hole ≥0.25 mm, 0.5–1.0 typical, cavity 2–4× port, cavity height 0.5–1.0 mm) | ⚠️ **SEARCH-SNIPPET ONLY — both PDF URLs failed** (direct PDF **404**; the `download-pdf/` landing page returns a marketing shell with no technical content). Consistent with Knowles, but **no number here rests on it** | https://invensense.tdk.com/wp-content/uploads/2015/02/Recommendations-for-Mounting-and-Connecting-InvenSense-MEMS-Microphones.pdf (404) | 2026-07-18 |
| **Passive buzzer (through-wall transmission)** ||||
| B1 | Mass law: **TL ≈ 20·log₁₀(m·f) − 47 dB** (normal incidence), m in kg/m², f in Hz; **subtract ~5 dB for random incidence** | **CONFIRMED** with the exact constant | https://acousplan.com/learn/what-is-transmission-loss | 2026-07-18 |
| B2 | TL rises ~**6 dB per doubling** of surface mass or of frequency | **CONFIRMED** (two independent sources) | https://acousplan.com/learn/what-is-transmission-loss · https://customaudiodirect.co.uk/sound-transmission-loss-in-panels/ | 2026-07-18 |
| B3 | The **coincidence dip** costs a further **10–15 dB below mass law**, typically **1–4 kHz** | **CONFIRMED** — and 2.7 kHz sits inside that window, so mass law is an **optimistic** bound for us | https://acousplan.com/learn/what-is-transmission-loss · https://customaudiodirect.co.uk/sound-transmission-loss-in-panels/ | 2026-07-18 |
| B4 | Penetrations / flanking, not panel mass, are "the most common reason that installed enclosures fail to meet their design targets" | **CONFIRMED** | https://www.ecotone.in/acoustic-enclosure-design-guidelines/ | 2026-07-18 |
| B5 | **Can 2.7 kHz at 80 dB usefully pass through 1–1.5 mm PLA?** | ❌ **NO — a grille is mandatory.** Arithmetic in §5.3; **20–31 dB lost before the coincidence penalty.** Independently corroborated by real printed hardware (§6) | derived from B1–B4 + `genesis-mini-shell.step` | 2026-07-18 |

---

## 4. Updated dimension table

> Datums, as in audit/01 — **do not mix them**:
> **Module-local STEP datum:** module PCB **bottom** = z 0 (verified True on all three files).
> **Script datum:** board **top** = z 0.

### 4.1 Analog microphone — `AX22-0009.step` (NET NEW — nothing about this part is in audit/01)

Root label `AX22-0009_1`, 19 solids, load 0.25 s.

| Dimension | Value | Tag | Notes |
|---|---|---|---|
| PCB footprint | **22.000 × 22.000 mm** | **NEW** · MEASURED-FROM-STEP (`AX22-0009.step`, `AX22_MEMS-Microphone_PCB`) | Conforms to the AX22 family standard (audit/01: 9 of 10) |
| PCB thickness | **1.510 mm** | **NEW** · MEASURED-FROM-STEP (same solid) | Family standard, 10 of 10 |
| PCB centre | (−0.002, −0.002) | **NEW** · MEASURED-FROM-STEP | All module-local offsets below are relative to this |
| Module bbox incl. pins | 22.000 × 22.000 × **15.020** mm, z −8.545..**6.475** | **NEW** · MEASURED-FROM-STEP | Tallest module in the BOM by 1.880 mm |
| Mounting holes | **4 × Ø2.700 at (±9.000, ±9.000)**, pad annulus **Ø4.000** | **NEW** · MEASURED-FROM-STEP (vertical-cylinder extraction) | ✅ **CONFIRMS the Ø2.7 @ (±9,±9) family standard** (audit/01 "AX22 module family standard", 8 of 10) |
| Header rows | 2 × `PinHeader_1x05_P2_54mm_Vertical`, row centres **Y = −8.902 / +8.888**, spacing **17.790** | **NEW** · MEASURED-FROM-STEP | ✅ **CONFIRMS Y = ±8.9** (audit/01 row: −8.900/+8.890, spacing 17.790 — agrees to **0.002 mm**) |
| Header pin holes | 10 × Ø1.000 at x ∈ {−5.082, −2.542, −0.002, 2.538, 5.078}, y = ±8.89 | **NEW** · MEASURED-FROM-STEP | 2.540 pitch |
| **⭐ TALLEST FEATURE** | **`3362P-1-503LF` — body top z 6.475 → +4.965 above PCB top** | **NEW** · MEASURED-FROM-STEP | **Trimpot, not the electret.** See detail below |
| Trimpot body envelope | **6.990 (X) × 6.600 (Y)**, z **1.595..6.475**, centre **(−7.367, −0.005)** | **NEW** · MEASURED-FROM-STEP (solid [3] of the `3362P` compound, vol 180.971 mm³) | Full body reaches full height — **a screwdriver-only access hole does NOT clear it** |
| Trimpot adjustment screw | Ø2.946, z **4.975..6.475**, axis **(−7.022, −0.005)** | **NEW** · MEASURED-FROM-STEP (solid [4], vol 7.759 mm³) | Recessed flush into the body top; slot Ø2.946, head features to Ø5.486 |
| Trimpot leads | 3 × Ø0.460, z −4.245..2.175, at (−7.332, ±2.54) and (−4.792, −0.005) | **NEW** · MEASURED-FROM-STEP | Through-hole part |
| **Electret capsule** | **`CMC-6022-42P` — Ø6.000 barrel** (z 1.995..3.695), Ø5.600 top step (z 3.895..4.095) | **NEW** · MEASURED-FROM-STEP | Can height **2.100 mm**; sits 0.485 above PCB top on its leads |
| **Capsule top** | z **4.095** → **+2.585 above PCB top** | **NEW** · MEASURED-FROM-STEP | This is the plane the acoustic port faces |
| **⭐ Capsule XY centre** | **(+5.848, +0.010)** absolute = **(+5.850, +0.012) relative to module centre** | **NEW** · MEASURED-FROM-STEP | 🔴 **Badly off-centre. The mic port CANNOT be at the port centre.** Load-bearing for §5.2 |
| Capsule leads | 2 × Ø0.450 at (6.848, ±0.950), z −1.105..1.945 | **NEW** · MEASURED-FROM-STEP | Confirms the capsule's electrical orientation |
| **⭐ Acoustic port face** | **TOP-FIRING (+Z)** | **NEW** · MEASURED-FROM-STEP + **photograph** | **Resolved — see the three-way evidence below** |
| Op-amp | `SOT-23-5`, +1.635 above PCB top, centre (−1.447, +0.018) | **NEW** · MEASURED-FROM-STEP | MCP6001 per `CONTENT.md` |
| Passives | 4 × `C_0603` (+0.885), 5 × `R_0603` (+0.535) | **NEW** · MEASURED-FROM-STEP | Irrelevant to enclosure Z |

**Acoustic-port face — resolved three independent ways, all agreeing on TOP-FIRING (+Z):**

1. **Geometry.** The capsule's closed face is at z = 4.095 with planar area **24.630 mm² = π/4 × 5.600²
   exactly** — an unbroken disc facing **up**. The PCB-facing end (z = 1.995) is an *annular rim* with a
   Ø4.015 opening — i.e. the open/base end (terminals + FET) points **down**. This is standard ECM
   construction: leads down, closed ported can up.
2. **No PCB vent.** A full vertical-cylinder sweep of the whole module found **only** 4 × Ø2.700 mounting,
   10 × Ø1.000 header and the 2 × Ø0.450 capsule leads. **There is no acoustic through-hole in the PCB
   under the capsule** — which a bottom-firing part would require. Corroborated visually in
   `images/pcb/B_0009.png` (bottom copper): the capsule footprint contains only its two round pads.
3. **⭐ Direct photograph** — `images/gallery/105_e44b7a60-4036-43d7-be44-5fd0bd73328a.png` shows the
   module seated on a real Genesis Mini: the metal capsule can is on the **+Z face** with a visibly
   **mesh-covered opening in its upward-facing top**, and the blue top-adjust trimpot beside it is
   unmistakably the tallest part on the board. This closes audit/01's Residual Risk #3 for the new part.

> **CAD caveats worth knowing.** (a) The PCB and silkscreen solids are labelled
> `AX22_MEMS-Microphone_*`, but the part is an **electret condenser**, not a MEMS — a stale footprint
> name, not a different part. (b) The STEP names the trimpot `3362P-1-**503**LF` (50 kΩ) while the
> photographed board carries a **"P 103"** (10 kΩ) trimmer. **The resistance differs; the 3362P body form
> factor is identical** (blue square body, top cross-slot screw) and matches the photo, so the **4.965 mm
> height stands**. Nothing mechanical depends on the resistance. (c) The capsule's port hole is **not
> modelled** (the top disc is unbroken) — normal CAD simplification, and irrelevant since §5.2 sizes the
> enclosure port to the whole Ø6.0 can, not to the capsule's own port.

### 4.2 Passive buzzer — `AX22-0018.step`

Root label `AX22-0018_1`, 21 solids, load 0.18 s.

| Dimension | Value | Tag | Notes |
|---|---|---|---|
| PCB footprint / thickness | 22.000 × 22.000 × 1.510 mm | **CONFIRMED** · MEASURED-FROM-STEP (`AX22_Passive-Buzzer_PCB`) | audit/01 family-standard rows |
| Mounting holes | 4 × Ø2.700 at (±9.000, ±9.000), annulus Ø4.000 | **CONFIRMED** · MEASURED-FROM-STEP | audit/01 family standard |
| Header rows | Y = −8.900 / +8.890, spacing 17.790 | **CONFIRMED** · MEASURED-FROM-STEP | audit/01: identical |
| **Tallest feature** | **`MLT-8530`, z_max 4.595 → +3.085 above PCB top** | ✅ **CONFIRMED** · MEASURED-FROM-STEP | audit/01 family table row `0018`: "**3.085 mm**, tallest solid `MLT-8530`" — **exact agreement, no correction needed** |
| **Buzzer body envelope** | **8.500 × 8.500 × 3.000 mm**, z **1.595..4.595** | **NEW** · MEASURED-FROM-STEP (lumps [0] + [11] of the `MLT-8530` compound) | Matches MLT-8530 nominal **Ø8.5 × 3.0** |
| **⭐ Buzzer XY centre** | **(−0.002, +0.000)** = **(0.000, 0.000) relative to module centre** | **NEW** · MEASURED-FROM-STEP | 🟢 **Dead centre — the grille goes straight on the port centre, no offset.** The opposite of the mic |
| Body cross-section | Rounded square in CAD (top face area 67.333 mm² in an 8.500 bbox ⇒ ~2.4 mm corner radius); **zero cylindrical faces** | **NEW** · MEASURED-FROM-STEP | The real MLT-8530 is round Ø8.5; the CAD is a squared-off stand-in. **Immaterial** — §5.3's grille is sized to Ø9.5 and covers either shape |
| Sound-emitting hole | Small recess ~Ø0.7 at **≈(+3.0, 0.0)** in the top face, 0.05–0.20 mm deep (planar faces at z 4.545 / 4.395; raster shows air at x ≈ +2.75..+3.25) | **NEW** · MEASURED-FROM-STEP | Modelled as a **blind recess**, not a through-hole. Indicative of an **off-centre** sound hole — **deliberately not load-bearing**, because §5.3's grille spans the whole Ø9.5 footprint |
| Vent under buzzer | **None** — no PCB through-hole beneath the body | **NEW** · MEASURED-FROM-STEP | Confirms the buzzer radiates **+Z**, same face as everything else |
| Support parts | `SOT-323_SC-70` (+1.135), `D_SOD-323F` (+0.815), 2 × `C_0603`, 2 × `R_0603` | **NEW** · MEASURED-FROM-STEP | Driver transistor + flyback diode |

### 4.3 VL53L0CX ToF — `AX22-0015.step` (sanity check only)

| Check the brief asked for | Result | Tag |
|---|---|---|
| Optical package XY centre ≈ module centre | `ST_VL53L1x` centre **(−0.002, −0.000)**; PCB centre (−0.002, +0.000) ⇒ **offset (0.000, 0.000)** | ✅ **CONFIRMED** · MEASURED-FROM-STEP — audit/01: "(−0.002, 0.000) = module centre to within 2 µm" |
| Module tallest feature ≈ 3.050 mm | 2 × `SM04B-SRSS…` JST, z_max **4.560** → **+3.050** above PCB top | ✅ **CONFIRMED** · MEASURED-FROM-STEP — audit/01 family table row `0015`: **3.050**, exact |
| (incidental) PCB / holes / headers | 22.000 × 22.000 × 1.510; Y = −8.900/+8.890, spacing 17.790 | ✅ **CONFIRMED** |

Both checks pass exactly. **audit/01's ToF geometry is reliable and is carried forward unchanged**,
including its correction that the STEP embeds an oversized VL53L1X sibling (measured 2.500 × 4.900 × 1.570)
where the real VL53L0X is 4.40 × 2.40 × **1.00** (source T7).

### 4.4 Per-module height ranking — NEW BOM

| Module | AX22 | Above PCB top | Tallest solid | vs audit/01 |
|---|---|---|---|---|
| **⭐ Analog microphone** | **0009** | **4.965 mm** | **`3362P-1-503LF`** (trimpot body) | **NEW — not in audit/01 at all** |
| Passive buzzer | 0018 | 3.085 mm | `MLT-8530` | **CONFIRMED** (family table) |
| VL53L0CX ToF | 0015 | 3.050 mm | `SM04B-SRSS` ×2 | **CONFIRMED** (family table) |
| *(mic electret can, for reference)* | 0009 | 2.585 mm | `CMC-6022-42P` | NEW |
| ~~ERM~~ | ~~0013~~ | ~~3.685 mm~~ | ~~`Vibration_Motor_v1`~~ | ⚫ **OUT OF BOM** |

### 4.5 Derived mated stack — NEW BOM (script datum: board top = 0)

Carried from audit/01 (MEASURED-FROM-STEP, derived): module PCB bottom **+10.10**, module PCB top **+11.61**.
Both re-checked against the three module STEPs — header-base geometry is identical on all of them, so the
derivation transfers unchanged.

| Dimension | Value | Tag | audit/01 |
|---|---|---|---|
| Module PCB bottom | +10.100 | **CONFIRMED** (derived, `STP_MTX0013.step` + module STEPs) | +10.10 |
| Module PCB top | +11.610 | **CONFIRMED** (derived) | +11.61 |
| ToF **real** emitting plane | **+12.685** | **CONFIRMED** (11.61 + 0.075 seating + 1.00 ST package height, source T7) | +12.68 |
| Mic electret can top | **+14.195** | **NEW** (11.61 + 2.585) | — |
| ToF tallest point (JST) | +14.660 | **CONFIRMED** (11.61 + 3.050) | +14.66 |
| **Buzzer top** | **+14.695** | **NEW** (11.61 + 3.085) | — (ERM was +15.30) |
| **⭐ Mic trimpot top — GOVERNING** | **+16.575** | **NEW** (11.61 + 4.965) | — |
| **`Z_ROOF_INNER`** | **+17.575** | **CORRECTED** (16.575 + `ROOF_CLEAR` 1.00) | **+16.25 — WRONG, too low by 1.325.** New value wins |
| **`Z_ROOF_OUTER`** | **+20.075** | **CORRECTED** (17.575 + `ROOF_THICK` 2.50) | **+18.75 — WRONG, too low by 1.325.** New value wins |
| **Module headroom** (deck inner − module PCB top) | **5.965 mm** | **CORRECTED** | **4.64 — insufficient.** New value wins |
| Spare headroom: mic / buzzer / ToF | **1.000** / 2.880 / 2.915 mm | **NEW** (derived) | Mic sets the datum; the other two float |
| **Air gap, sensor → deck inner** | **4.890 mm** | **CORRECTED** (17.575 − 12.685) | **3.57 — WRONG.** New value wins |
| **Air gap + wall, sensor → deck outer** | **7.390 mm** | **CORRECTED** (20.075 − 12.685) | **6.07 — WRONG.** New value wins |
| Overall part height (closed monolith) | z −11.10 .. **+20.075** ⇒ **31.175 mm** | **CORRECTED** (derived from audit/01's measured −11.10 floor) | 29.85 mm. **+1.325 mm taller** |

> **`ROOF_CLEAR = 1.00` is not arbitrary and is now independently corroborated.** §6 measures the
> reference shell's real clearance over a *mated MLT-8530 buzzer* at **≈0.9–1.6 mm**. 1.00 sits inside
> that band. Keep it.

---

## 5. Recommended aperture specs — Phase 2 codes directly from this

Port assignment assumed from audit/01's corrected map with buzzers substituted for ERMs:
**P1 (−12, −12) buzzer A · P2 (+12, −12) ToF · P3 (+12, +12) buzzer B · P4 (−12, +12) microphone.**
Port centres are MEASURED-FROM-STEP (`STP_MTX0013.step`, socket-pair centroids, max deviation 0.001 mm).
**If the plan re-assigns ports, only the XY centres below move — every diameter and depth is unchanged.**

### 5.0 Master table

| Feature | Ø / geometry | Through | XY centre (board coords) | Cover / seal |
|---|---|---|---|---|
| **ToF aperture** | **Ø13.0 straight cylinder** | full deck, +17.575 → +20.075 | **(+12.000, −12.000)** | **NOTHING. Open hole.** No lens, film, mesh, window |
| **Mic port** | **2 × Ø3.5 straight** | full deck | **(−17.850, +12.000)** and **(−6.150, +12.000)** | **NOTHING. No gasket, no mesh, no membrane.** Open cavity |
| **Trimpot access** (optional but recommended) | **2 × Ø4.0 straight** | full deck | **(−19.020, +12.000)** and **(−4.980, +12.000)** | Open |
| **Buzzer grille ×2** | **7 × Ø2.5 hex pattern**, ring radius 3.5 | full deck | centred **(−12.000, −12.000)** and **(+12.000, +12.000)** | **NOTHING** |

### 5.1 ToF optical aperture

**Derivation, from the NEW air gap.** As the brief requires, first with audit/01's fitted rule:

> audit/01: **X ≈ 3.78 + 0.63·g**, **Y ≈ 0.78 + 0.63·g**

| Aperture plane | g (mm) | audit/01 rule X × Y | Round-hole equiv. |
|---|---|---|---|
| Deck **inner** (+17.575) | **4.890** | 6.861 × 3.861 | Ø6.861 |
| Deck **outer** (+20.075) | **7.390** | **8.436 × 5.436** | **Ø8.436** ← binding |

**But audit/01's 0.63 slope is a poor fit, and I can now show that directly.** audit/01 fitted three
Table-1 rows (0.5, 1.0, 2.0). Having fetched the **full 12-row table** (T2), the structure is plain:

- Rows 0.1→1.0 mm are **exactly collinear**: Y = 0.81, 0.88, 0.95, 1.02, 1.09, 1.16, 1.23, 1.30, 1.37,
  1.44 — **+0.07 per +0.1 mm ⇒ slope 0.700**, intercept 0.74.
- X − Y = **3.00** on all 12 rows = the emitter↔collector pitch (AN4907 Fig. 15).
- The 1.5 and 2.0 rows fall **below** that line (1.68 and 1.99 vs 1.79 and 2.14 predicted) — the table
  bends past 1.0 mm. **audit/01's three sample points straddled the knee**, averaging to a shallow 0.63.

> **Corrected rule: X = 3.74 + 0.70·g · Y = 0.74 + 0.70·g** (10 collinear rows, residual < 0.005 mm)

| Aperture plane | g (mm) | corrected X × Y | Round-hole equiv. |
|---|---|---|---|
| Deck **inner** (+17.575) | 4.890 | 7.163 × 4.163 | Ø7.163 |
| Deck **outer** (+20.075) | **7.390** | **8.913 × 5.913** | **Ø8.913** ← binding |

**Independent first-principles check** (not a fit — pure geometry + ST's stated tolerances):

```
emitter↔collector pitch                          3.000   (AN4907 Fig. 15)
emitter aperture                                 0.400   (AN4907 Fig. 15, Ø0.40)
35° exclusion cone over g = 7.390 mm
      2·tan(17.5°)·7.390 = 0.63060 × 7.390       4.660
±150 µm X/Y assembly tolerance, both sides       0.300   (AN4907 §5.2 note 1)
±2° tilt over 7.390 mm: 2·7.390·tan 2°           0.516   (AN4907 §5.2 note 1)
                                                 -----
                                                 8.876 mm
```

**8.876 (geometry) vs 8.913 (fit) — agreement to 0.037 mm.** The corrected rule is sound; audit/01's
8.436 is **0.48 mm optimistic**. Both are extrapolations far outside the table's 0.1–2.0 mm range, so the
conservative one wins.

| Step | Value |
|---|---|
| Binding requirement at the outer face | **Ø8.913** |
| + module registration ±1.27 mm (audit/01 Residual Risk #6) | **Ø11.453** |
| **⭐ RECOMMENDED — Ø13.0** | 1.547 mm diametral margin |
| *(Ø12.0, audit/01's number)* | only **0.547 mm** margin — **do not reuse it** |

**Spec for Phase 2:**

| Parameter | Value |
|---|---|
| Hole type | **Straight cylindrical through-hole. No counterbore, no step, no local thinning.** |
| **Diameter** | **13.0 mm** |
| Depth | Full deck: z **+17.575 → +20.075** (2.500 mm). Overshoot the cutting tool ~1 mm both ends |
| XY centre | **(+12.000, −12.000)** — the optical package is dead-centre on its module (§4.3), so hole centre = port centre |
| Cover | **NONE.** No lens, film, mesh, glass or clear window. Our 7.390 mm stack is **3.7×** ST's 2.0 mm limit (T4) |
| Baffle / divider | **DO NOT ATTEMPT.** ST's two-hole option needs Ø0.79–1.99 holes on a 3.00 mm pitch (T3) — unachievable at 0.4 mm nozzle. The single **oval/round** option explicitly uses no divider. **Skipping the baffle is following ST, not cutting a corner** |
| Wall clearance | Not a constraint for an open hole. Ø13 through 2.5 mm does not vignette (required 7.163 at inner, 8.913 at outer; 13 > both) |
| Finish | **Print in black/dark filament** (bore-wall IR absorption); optionally chamfer the outer bore edge 0.5 × 45° to flare it |
| Calibration | Run VL53L0X crosstalk calibration **with the enclosure fitted**, never bare |

**Optional refinement Phase 2 may take (not required).** The deck rose 1.325 mm *solely* because of the
trimpot at **P4**. A local deck depression over **P2** only, down to +15.660 inner / +18.160 outer
(= ToF top 14.660 + 1.000 clear), gives g_outer = 5.475 → X = 7.573 → +2.54 → **Ø10.11 ⇒ a Ø11.0 hole**.
That trades a 2 mm smaller aperture for a local pocket feature. **Recommended only if the Ø13 hole is
judged cosmetically unacceptable** — the straight Ø13 is simpler and Phase 2 should default to it.

### 5.2 Microphone acoustic port

**The load-bearing fact: the capsule is 5.850 mm off the module centre, and module insertion is
180°-ambiguous.** Both facts are measured (§4.1) and neither is optional.

The capsule therefore lands at **port centre + (+5.850, +0.012)** *or* **port centre + (−5.850, −0.012)**
depending on which way round the module is pushed in. audit/01's "Ø3.0 at the port centre" would put the
hole **5.85 mm off the capsule in either orientation** — over the op-amp, not the microphone.

| Parameter | Value | Rationale |
|---|---|---|
| Hole type | Straight cylindrical through-hole | Port length = deck thickness only |
| **Diameter** | **Ø3.5 mm** (acceptable band Ø3.0–4.0) | L/D = 2.5/3.5 = **0.71** — "short and wide" (M1). M3 lists *larger case port hole* as the first fix for a bad path |
| **Count / centres** | **TWO holes**, at **(−17.850, +12.000)** and **(−6.150, +12.000)** | One lands on the capsule whichever way the module is inserted. The other is a harmless vent |
| Depth | Full deck, +17.575 → +20.075 | |
| Capsule standoff | Capsule top **+14.195** → deck inner **+17.575** = **3.380 mm** free air | Comfortably short |
| **Gasket / seal** | **NONE — leave the cavity open** | Sealing needs the hole aligned to the capsule to ~±0.5 mm; registration is ±1.27 (audit/01 RR#6). M6: a *leaking* gasket is worse than no gasket |
| **Mesh / membrane / screen** | **NONE** | M5: a screen is an acoustic *resistance* used to damp a resonant peak. We have no sealed cavity to resonate — it would be pure insertion loss |
| Chamfer | Optional 0.3 × 45° on the outer edge | Cosmetic only |

**Why Knowles' "1.0–1.5 mm case hole" (M2) does not apply.** That table assumes a **gasket-sealed tube**
running from the case hole down onto a **Ø0.25–0.84 mm MEMS port**. Our topology is the opposite: an
**unsealed** open cavity, 3.38 mm of free air, over a **Ø6.0 mm electret** whose own port is ~7× larger
than a MEMS port. In an unsealed design the dominant failure is **occlusion and attenuation**, not
resonance, and the source's own remedy list (M3) puts *larger hole* first. **Ø3.5 is the correct answer
for this geometry; Ø1.2 would be the correct answer for a gasketed MEMS design we are not building.**

**Helmholtz check — explicitly computed, then dismissed.** For Ø3.5 × 2.5 mm into a nominal 20 cm³
cavity: A = 9.62 mm², L_eff = L + 1.7a = 2.50 + 2.98 = 5.48 mm, f = (c/2π)·√(A/(V·L_eff)) ≈ **512 Hz** —
which would sit squarely in the siren band. **But this resonance does not exist in the real part**: the
Ø13 ToF hole alone is **132.7 mm²**, plus 2 × Ø2.5-hole grilles (68.7 mm²) and the second mic hole. Total
open area ≳ 220 mm² means the interior is effectively vented to atmosphere and is **not a Helmholtz
cavity at all**. This is a second, independent reason **not to seal or gasket anything.**

**Trimpot access — strongly recommended, and nearly free.** The MCP6001 gain is set by a **manual
trimpot**. In a closed enclosure it becomes unreachable, so mic gain would be frozen at whatever it
happened to be at assembly — a real functional trap, since gain must usually be tuned against the actual
acoustic environment. The screw axis is module-local **(−7.022, −0.005)**, so at P4 it lands at
**(−19.020, +11.995)** or **(−4.980, +12.005)**. **Cut Ø4.0 at both**; a small flat screwdriver reaches the
Ø2.946 slot at +16.485 (2.09 mm below the outer face). Do **not** rely on an access hole to solve the
*height* problem — the trimpot's full 6.99 × 6.60 body reaches 4.965 mm, so the deck must still rise.

### 5.3 Passive buzzer — EXACT treatment

**Verdict: a physical grille is mandatory. A solid wall of any printable thickness is not acceptable.**

**The arithmetic** (mass law, T/B1: TL = 20·log₁₀(m·f) − 47 dB normal incidence, −5 dB random; PLA
ρ = 1240 kg/m³; f = 2700 Hz, the MLT-8530 resonant frequency per `CONTENT.md`):

| Wall t | m = ρ·t | TL normal | TL random | 80 dB source heard at |
|---|---|---|---|---|
| 1.00 mm | 1.240 kg/m² | 20·log₁₀(1.240 × 2700) − 47 = 70.5 − 47 = **23.5 dB** | 18.5 dB | 56.5–61.5 dB |
| 1.50 mm | 1.860 kg/m² | 20·log₁₀(5022) − 47 = 74.0 − 47 = **27.0 dB** | 22.0 dB | 53.0–58.0 dB |
| 2.00 mm | 2.480 kg/m² | **29.5 dB** | 24.5 dB | 50.5–55.5 dB |
| 2.50 mm (`ROOF_THICK`) | 3.100 kg/m² | 20·log₁₀(8370) − 47 = 78.4 − 47 = **31.5 dB** | 26.5 dB | 48.5–53.5 dB |

**So the brief's question — "can 2.7 kHz from an 80 dB transducer usefully pass through ~1–1.5 mm PLA?" —
answers NO by 20–27 dB.** Even the thinnest printable wall drops an 80 dB alert to ~57–62 dB, roughly
normal conversation level, at a bus stop. And these figures are **optimistic**, for three reasons:

1. **Coincidence** (B3) costs a further **10–15 dB** below mass law, and 2.7 kHz is inside the stated
   1–4 kHz coincidence window.
2. **Source choking.** Mass law models a panel driven by a free sound field. Sealing a small magnetic
   transducer into a tiny stiff cavity raises the acoustic impedance it works against and cuts output
   **at the source**, before any panel loss.
3. Mass law is a **transmission** model; it does not credit the enclosure's own resonances, which colour
   as often as they help.

**Corroborated by real printed hardware.** `cad/reference/genesis-mini-shell.step` — a shell that is
proven to physically seat a Genesis Mini with an **AX22-0018 passive buzzer on P4** — has a
**through-grille of ~1.5–2.0 mm slots** in its ~2.02 mm roof directly over that port (§6.4), while the
other three ports are plain open holes. **The one designer who has actually printed and used this exact
buzzer under a roof cut a grille.**

**Grille spec (× 2, one per buzzer port):**

| Parameter | Value |
|---|---|
| Pattern | **7 × Ø2.5 mm straight through-holes, hex**: 1 at the centre + 6 at **radius 3.5 mm**, 60° apart (0°, 60°, 120°, 180°, 240°, 300°) |
| **XY centre** | **(−12.000, −12.000)** and **(+12.000, +12.000)** — the MLT-8530 is centred on its module to (0.000, 0.000), §4.2, so grille centre = port centre exactly |
| Depth | Full deck, +17.575 → +20.075 (2.500 mm) |
| Overall extent | **Ø9.5 mm** (2 × 3.5 + 2.5) — covers the Ø8.5 buzzer body completely, so the buzzer's off-centre sound hole is covered wherever it actually is, and module rotation is irrelevant |
| Open area | 7 × π/4 × 2.5² = **34.4 mm²** per port |
| Cover | **NONE.** No mesh, no fabric, no membrane |
| **FDM check @ 0.4 mm nozzle** | Min web: centre→ring = 3.5 − 2.5 = **1.00 mm ≥ 0.8** ✅ · ring→ring = 2 × 3.5 × sin 30° = 3.5, − 2.5 = **1.00 mm ≥ 0.8** ✅ · hole **Ø2.5 ≥ 1.0** ✅ · vertical holes in a flat deck ⇒ **no overhangs, no supports**, aspect ratio 1.0 ✅ |

**If more output is wanted** (the reference shell is more open than this): **Ø3.0 at 4.0 mm ring radius**
keeps the 1.00 mm web, extends to Ø11.0, and raises open area to **49.5 mm²**. Both are printable; start
with the Ø2.5 version, which is the more conservative structurally.

**Do NOT** substitute local wall thinning for the grille. Thinning 2.5 → 1.0 mm buys only 8 dB (table
above) and costs stiffness; the holes are what matter (B4: penetrations dominate).

---

## 6. Reference-shell findings — `cad/reference/genesis-mini-shell.step`

Root label **`GM_Console_Body_v27`**, **4 solids**, load 0.17 s — matches audit/01's description exactly.

### 6.1 Envelope — CONFIRMED

| Dimension | Measured | Expected (brief / audit/01) | Verdict |
|---|---|---|---|
| Overall bbox | **159.500 × 63.000 × 17.000 mm** (X −29.500..130.000, Y −2.500..60.500, Z 0.000..17.000) | ~159.5 × 63.0 × 17.0 | ✅ **CONFIRMED exactly** |

**The 159.5 mm length is a print-layout artefact, not a part.** The file holds **four separate bodies laid
out side by side**, which audit/01 (envelope only) did not decompose:

| # | Bbox | Vol (mm³) | Identification |
|---|---|---|---|
| [0] | X ±29.500, Y −2.000..60.000, **Z 0..10.000** | 11 667.9 | **Console body** (board seat + M2 bosses) |
| [1] | X 70.000..130.000, Y −2.500..60.500, **Z 0..17.000** | 16 385.2 | **Lid** (roof, module posts, the buzzer grille) |
| [2] | X 47.600..50.400, Y 43.000..52.000, Z 0..14.250 | 204.7 | Small clip / button stem |
| [3] | X 42.492..55.490, Y 12.540..25.481, Z 0..9.500 | 580.2 | **Encoder knob** (Ø13.000 cylinder, z 1.0..8.5) — the README's "optional encoder knob cover" |

**Board datum recovery.** Both the body's and the lid's screw features sit on a **48.000 × 48.000** square
⇒ board centre **(0, 27.5)** in the body and **(100, 27.5)** in the lid. That resolves the four AX22 port
centres in lid coordinates to (88, 15.5), (112, 15.5), (112, 39.5), (88, 39.5) — i.e. board-relative
**(∓12, ∓12)**, matching the measured port grid. All §6.3–6.4 findings depend on this mapping and are
flagged accordingly.

> ⚠️ The shell's screw pattern is **±24.000**, whereas the board's holes measure **±24.100** (audit/01).
> A 0.100 mm per-axis discrepancy, absorbed by the Ø3.400 board holes. Noted, not a problem.

### 6.2 The four `CARRIED-OVER-UNVERIFIED` items — resolved

**All four were attempted. None is carried forward still tagged UNVERIFIED.**

| audit/01 constant | Carried value | Measured in reference shell | **Verdict** |
|---|---|---|---|
| **`BOSS_PILOT`** | **1.8** | **Ø2.000** — body pilot z 3.350..7.150 (3.800 long) at (±24.000, 27.5±24.000); **and the lid pilot is also Ø2.000** (z 11.000..15.000), 8 features, 2 independent parts | 🔴 **OVERRIDE → 2.000.** Both numbers stated: **1.8 (carried, unsourced) vs 2.000 (measured, in a printed shell that takes M2×20 screws per `cad/reference/README.md`). 2.000 wins.** 1.8 is not *wrong* — it is a tighter thread-forming fit — but 2.000 is the value proven in PLA on this exact board |
| **`PLATE_CB_DIA`** | **4.0** | **Ø4.000** — body counterbore z 0.000..3.350, 4 off, same axes | 🟢 **CONFIRMED exactly.** Independent agreement to 3 d.p. |
| **`PLATE_CB_D`** | **2.0** | **3.350** — but in a **9.15 mm** stack (2.000 floor + boss), not a 3.0 mm plate | 🟡 **NOT OVERRIDABLE — attempted and explicitly rejected.** 3.350 in a 3.0 mm `skin_plate` would be a *through-hole*. The reference's topology (screw entering a thick body) does not constrain a thin bolt-on plate. **Keep 2.0** (leaves 1.0 mm under the head). Re-tag from `CARRIED-OVER-UNVERIFIED` to **ENGINEERING-JUDGEMENT, reference-checked, not transferable** |
| **`PLATE_HOLE_DIA`** | **2.4** | **Ø3.500** — lid through-hole z 0.000..11.000, with a Ø7.500 × 1.350 counterbore | 🟡 **KEEP 2.4.** Both stated: **2.4 (= ISO 273 medium clearance for M2) vs 3.500 (reference).** The reference proves Ø3.5 assembles, but it is a *loose* fit that gives up location. **2.4 wins on merit**; the reference bounds it from above and confirms nothing tighter is needed |

**Additional M2 geometry, measured, free for Phase 2 to reuse:**

| Feature | Value |
|---|---|
| Screw-boss OD | **Ø7.000** (z 2.000..7.150) — audit/01 carries `BOSS_DIA` 7.0 ✅ **CONFIRMED** |
| Body floor thickness | **2.000 mm** (outer 0.000 → inner 2.000), flat, verified at 6 probe points |
| Board seat height | Boss top **z 7.150** ⇒ **5.150 mm** clearance under the PCB |
| Thread engagement | 3.800 mm of Ø2.000 pilot, screw head recessed 3.350 |
| Lid roof | inner **z 15.000**, outer **z 17.050** ⇒ **2.050 mm** — close to `ROOF_THICK` 2.5 |

> ⚠️ **Finding worth carrying: the reference shell's under-board clearance (5.150 mm) is LESS than the
> measured deepest board component (JST `S2B-PH-SM4-TB` at −5.585, audit/01).** A 0.435 mm shortfall.
> The floor is flat at z = 2.000 everywhere sampled, **including directly under the JST footprint**
> (probed at body (19.2, 43.3)). Either the shell does not clear that connector, or the board STEP's JST
> is oversized. **Our `NEG_Z_POCKET` 6.5 / `NEG_Z_DEEP` 5.59 is the more conservative number and should be
> kept** — this is evidence *for* our design, not against it. Caveat: board orientation inside the shell
> is inferred from the 48 × 48 screw pattern, not from a keyed feature.

### 6.3 Minimum headroom above an AX22-mated module — measured

The lid hangs **four posts per port** onto each module, at the AX22 mounting-hole positions (±9, ±9):

| Feature | Measurement | How |
|---|---|---|
| Post cylindrical shank | **Ø4.000–4.100, z 11.000 → 15.000 (4.000 mm long)** | vertical-cylinder extraction, 16 features |
| Post tip below that | ~45° cone, Ø4.00 at z 10.95 → Ø2.10 at z 10.00 → tip at **z 9.500** | radial solid/air probe at (97.0, 24.5) and (121.0, 24.5) |
| Lid roof inner | **z 15.000** | planar face, area 1803.3 mm²; probe: air to 14.90, solid from 15.05 |
| Lid roof outer | **z 17.050** (locally 16.850 / 16.400 where recessed) | probe + planar face at 17.000 |

The Ø4.000 shank exactly matches the AX22 **Ø4.000 mounting-pad annulus** (audit/01 family standard), so
the design intent is the shoulder bearing on the module PCB top at **z = 11.000**, with the cone acting as
a self-centring lead-in through the Ø2.700 hole (it jams at Ø2.7 around z ≈ 10.3).

| Quantity | Value |
|---|---|
| **Designed headroom, module PCB top → roof inner** | **4.000 mm** (shoulder interpretation) — bounded **4.000 to 4.700 mm** if the module instead seats on the cone |
| Clearance over a mated MLT-8530 buzzer (3.085 tall) | **0.915 mm** (shoulder) to **1.615 mm** (cone) |

**Two conclusions Phase 2 should carry:**

1. ✅ **`ROOF_CLEAR = 1.00 mm` is validated by real printed hardware** — the reference's own clearance over
   this exact buzzer is 0.9–1.6 mm. Keep 1.00.
2. 🔴 **The AX22-0009 microphone does not fit in the reference shell either.** It needs 4.965 mm; the
   reference provides 4.000–4.700. The proven state of the art for this board family is ~0.3–1.0 mm short
   of what our BOM demands. **The deck raise in §4.5 is not conservatism — it is required, and no
   existing design has solved it.** (Consistent: the reference's own two tall modules — encoder 26.485,
   LED button 5.435 — both **protrude through open holes** rather than fitting under the roof.)

### 6.4 ⭐ The buzzer grille — direct real-world precedent

Per `cad/reference/README.md` the reference shell's ports are P1 encoder, P2 LED button, P3 IPS LCD,
**P4 passive buzzer (AX22-0018)**. Solid/air rasters of the lid roof at z = 15.20 and z = 16.00 give:

| Port (board-relative) | Lid coords | Roof at z = 16.0 |
|---|---|---|
| (−12, −12) | (88, 15.5) | **fully open** (air 8.0 → 17.5) — encoder shaft |
| (+12, −12) | (112, 15.5) | **fully open** — LED button |
| (+12, +12) | (112, 39.5) | **fully open** — LCD |
| **(−12, +12) — the passive buzzer** | **(88, 39.5)** | **ROOFED, and perforated with a through-grille** |

The z = 15.20 and z = 16.00 rasters are **identical**, confirming the openings run clean through from the
roof inner (15.000) to the outer (~17.02) — real through-slots, not a cosmetic surface relief.

| Grille property | Measured |
|---|---|
| Pattern | Two nested chevrons (a "sound-wave" motif) plus two straight bars, centred on the port |
| **Slot width** | **1.5–2.0 mm** (3–4 raster cells at 0.5 mm) |
| Web between slots | **1.0–2.5 mm** |
| Extent | ~**12 mm (X) × 14 mm (Y)** about the port centre |
| Roof thickness at the grille | 15.000 → 17.020 = **2.020 mm** |
| Port centre itself | solid, 15.000 → 16.820 (chevron apex); air at offsets (±0.5, 0), (±1.0, 0), (2.0, 2.0) |

**This is the strongest single piece of evidence in the report**: an independent designer, printing a real
shell for this exact board and this exact buzzer, roofed the buzzer port and cut a through-grille of
1.5–2.0 mm slots in a ~2.0 mm wall. §5.3's spec (Ø2.5 holes, 1.0 mm webs, 2.5 mm wall) is **more
conservative** than the proven article and is safe.

---

## 7. What changed vs prior audits

| # | audit/01 said | This file says | Why |
|---|---|---|---|
| 1 | ERM 3.685 mm is the tallest module; **the deck is governed by `MOTOR_TOP`** | **Mic trimpot 4.965 mm governs.** `MOTOR_TOP` no longer exists as a concept | BOM swap. Measured `3362P-1-503LF` body top at module-local z 6.475 |
| 2 | "Every Z constant derived from `MOTOR_TOP` **survives the BOM change untouched**" | **Exactly backwards** — every one moves **up by 1.325 mm** | Governing module is 1.280 mm taller than the ERM |
| 3 | `Z_ROOF_INNER` +16.25 / `Z_ROOF_OUTER` +18.75 | **+17.575 / +20.075** | Derived from the new governing height + unchanged `ROOF_CLEAR` 1.0 / `ROOF_THICK` 2.5 |
| 4 | Module headroom **4.64 mm**; "the mic must be ≤ 4.64" | **5.965 mm**; the mic measured **4.965** — audit/01's own Residual Risk #2 **has fired** | Direct measurement of the part that did not exist in CAD when audit/01 was written |
| 5 | ToF air gap 3.57 mm inner / 6.07 mm total | **4.890 / 7.390 mm** | Follows the deck |
| 6 | Aperture Ø7.60 required, **Ø12.0 recommended** | **Ø8.913 required, Ø13.0 recommended** | Larger gap **and** a corrected slope (0.700, not 0.63) from the full AN4907 Table 1 |
| 7 | ST rule `X ≈ 3.78 + 0.63·g` | **`X = 3.74 + 0.70·g`** in the well-determined region; confirmed by first principles to 0.037 mm | audit/01 fitted 3 rows straddling the table's knee; I fetched all 12 |
| 8 | Mic port face **UNDETERMINED**, physical inspection required | **TOP-FIRING (+Z)** — geometry + no PCB vent + **photograph** | Resolved for AX22-0009. audit/01 RR#3 closed |
| 9 | Mic port: **Ø3.0 at the port centre**, "3 × Ø1.5 triad" as a hedge | **2 × Ø3.5 at port centre ±(5.850, 0)** | 🔴 **The capsule is 5.850 mm off-centre.** A centred hole misses it in *both* insertion orientations |
| 10 | Mic footprint `ASSUMED-AX22-STANDARD` (no CAD existed) | **MEASURED and confirming** — 22.000², 1.510, Ø2.7 @ (±9,±9), Y = ±8.9 | The assumption was correct; it is now a measurement |
| 11 | Buzzer 3.085 mm, tallest solid `MLT-8530` (family table) | **CONFIRMED exactly**; plus body Ø8.5 × 3.0 at offset **(0.000, 0.000)** | Re-measured; new placement data for the grille |
| 12 | Buzzer treatment | **Not addressed** (buzzers were not in the BOM) | **NEW:** grille mandatory; 7 × Ø2.5 spec; mass-law arithmetic; reference-shell precedent |
| 13 | `BOSS_PILOT` **1.8** `CARRIED-OVER-UNVERIFIED` | **OVERRIDE → 2.000** | Measured in 8 features across 2 parts of the reference shell |
| 14 | `PLATE_CB_DIA` 4.0 / `PLATE_CB_D` 2.0 / `PLATE_HOLE_DIA` 2.4 `CARRIED-OVER-UNVERIFIED` | **4.0 CONFIRMED** · **2.0 kept** (reference topology not transferable) · **2.4 kept** (reference's 3.5 is looser) | All three attempted; none still tagged UNVERIFIED |
| 15 | Reference shell "envelope only… desktop console body" | **4 separate bodies decomposed**; board datum recovered; M2 stack, roof, module posts and the **P4 buzzer grille** all measured | audit/01 explicitly skipped this file; the brief asked for it |
| 16 | PDM/I²S constraints, `I2S_NUM_0`, CLK/DATA pin ambiguity, "AX22-0044 uncatalogued" | ⚫ **All moot** — AX22-0009 is single-ended **analog** (`A` on IO0, per `Pins-0009.png` + `CONTENT.md` example using `analogRead`) | Different part |
| 17 | Part height 29.85 mm (closed monolith) | **31.175 mm** | +1.325 mm |

---

## 8. Residual risk

| # | Risk | What would close it |
|---|---|---|
| 1 | **The 4.965 mm trimpot height is from CAD, not calipers**, and the STEP labels a `3362P-1-**503**LF` while the photographed board carries a **"P 103"**. Body form factor matches the photo, but a different manufacturer's 10 kΩ trimmer could differ by a few tenths. **Everything in §4.5 hangs off this one number.** | **Calipers, 60 seconds** — measure the trimpot top above the module PCB top. If it differs, shift `Z_ROOF_INNER`/`Z_ROOF_OUTER` by the delta and recompute the ToF aperture (§5.1 arithmetic is parametric in g) |
| 2 | **Module insertion orientation is 180°-ambiguous**, which is why the mic needs 2 ports and 2 trimpot holes. If Phase 2 or assembly locks the orientation, half of those holes are wasted openings | Dry-fit, mark the module and the deck, document the orientation; then delete the unused hole of each pair. Do **not** delete either one on the assumption it will "probably" go in one way |
| 3 | **The ToF aperture requirement is an extrapolation 3.7× beyond ST's table** (g = 7.390 mm vs a table ending at 2.0). Two independent methods agree to 0.037 mm, but ST publishes nothing at this gap and explicitly says >2.0 mm needs "a dedicated ID design study" | Bench-test against a known distance **with the enclosure fitted**, and run crosstalk calibration in that state. If readings are short/constant, enlarge the hole before touching firmware |
| 4 | **AN4907 Rev 1 (2016) was used; the canonical Rev 3 (2018) is unreachable** from this environment (`st.com` 60 s timeout). Aperture tables may have been revised | Fetch Rev 3 from a network that can reach st.com and diff Tables 1–2. audit/01 raised the same caveat and it is still open |
| 5 | **Buzzer↔mic acoustic coupling is unquantified and structurally unavoidable.** Two 80 dB transducers sit 24–34 mm from an amplified electret on the same rigid board, inside one open cavity. The mic will very likely saturate whenever a buzzer sounds | **Firmware, not CAD:** gate/mute the mic for the duration of any buzzer output plus a decay tail. Flag to the firmware track. No enclosure geometry can fix it — all four ports are within 33.941 mm (audit/01) |
| 6 | **The MLT-8530's real sound-hole position is not reliably known.** The CAD models it as a blind ~Ø0.7 recess at ≈(+3.0, 0) rather than a through-hole | Deliberately de-risked: §5.3's grille spans Ø9.5 over a Ø8.5 body, so it covers the hole wherever it is and at any module rotation. **No action needed** unless the grille is shrunk |
| 7 | **Mass-law figures in §5.3 are estimates, not measurements** — a small stiff clamped panel is stiffness-controlled, not mass-controlled, and the coincidence penalty is not quantified for PLA | Not worth closing analytically. The verdict (grille required) is independently confirmed by the reference shell's real printed grille (§6.4). If the first print sounds weak, open the grille to the Ø3.0/4.0 mm variant |
| 8 | **Reference-shell board orientation is inferred**, from the 48 × 48 screw pattern only — there is no keyed feature proving which way the board goes in. §6.3–6.4 (headroom, grille port identity) depend on it | Compare against `cad/reference/image_of_the_build.png` and the Printables listing. The grille finding is robust either way (only **one** of four ports is roofed, and only one BOM module — the buzzer — is short enough to be roofed) |
| 9 | **Two intended sources were unreachable**: InvenSense AN-1003 (PDF **404**; landing page has no technical content) and canonical ST AN4907. Their claims appear in §3 as **search-index snippets only** and are **not used** for any number | Retry from a different network. Nothing in §5 depends on either; the mic spec rests on the fully-fetched Knowles SiSonic guide |
| 10 | **The reference shell's under-board clearance (5.150 mm) is 0.435 mm less than the measured deepest board component (−5.585).** Either the shell fouls the JST or the board STEP's JST is oversized — I cannot tell which | Caliper the JST on the real board. Our `NEG_Z_POCKET` 6.5 already clears both, so this is informational; it only matters if anyone ever tightens the −Z pocket toward the reference's value |
| 11 | **Port assignment is assumed, not decided.** §5 keys XY centres to audit/01's map with buzzers on {P1, P3}. That map's rationale (maximum ERM separation for haptics) **no longer applies** — buzzers do not need spatial separation, so ports are now free to be reassigned | Plan track decides. If it changes, **only the four XY centres in §5.0 move**; every diameter, depth, count and pitch is unaffected |
| 12 | **`ROOF_CLEAR` 1.00 mm over the trimpot is the tightest clearance in the build** (mic spare headroom = exactly 1.000, vs 2.880/2.915 for the other two modules). Any upward error in risk 1, or any print z-overshoot on the deck underside, lands directly on the trimpot | Same caliper check as risk 1; consider `ROOF_CLEAR` 1.5 if the extra 0.5 mm of height is acceptable. Note the reference shell runs 0.9–1.6 mm here, so 1.0 is normal practice, not tight-by-mistake |
| 13 | **Nothing here has been printed.** All figures are static geometry and desk arithmetic | A test print. The two features most worth checking first are the Ø13 ToF hole (measure it, then range-test with the enclosure on) and a buzzer grille (listen to it) |
