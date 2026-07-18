# 08 — Phase 2: CAD Build (closed monolith, Fusion 360 script)

**Date:** 2026-07-18
**Author:** Phase 2 (CAD implementation)
**Deliverable:** `cad/bus_stop_enclosure.py` — a **Fusion 360 Scripts API** script
(`adsk.core` / `adsk.fusion`), editable in Fusion via *Utilities → ADD-INS → Scripts and Add-Ins*.
**Inputs:** `07-phase-1-dims-and-aperture-research.md` (dimension + aperture authority),
`01-track-1-physical-cad-ground-truth.md` (board-level ground truth),
`cad/braille_wearable_enclosure.py` (structural template),
`audit/speech-to-braille-wearable/26-fusion-runtime-fixes.md` (live-Fusion defect log),
`audit/speech-to-braille-wearable/08-fusion360-claude-workflow.md` §2/R2 (cm-unit trap).

---

## 1. Scope

### What was built

A **CLOSED MONOLITH** — one 62 × 62 × 31.175 mm slab body (`cage`) plus a bolt-on `skin_plate`.
The deck is a solid slab pierced **only** by functional apertures. There are **no reveals, no wells,
no louvres, no turret, no side window, no LCD relief and no bezel** — every one of the braille
sibling's decorative removals is deleted. What remains, in build order:

| # | Feature | Geometry |
|---|---|---|
| 1 | Outer block | 62.0 square, z −11.100 → +20.075 |
| 2 | Cavity | 57.0 square hollowed from the open bottom to +17.575 ⇒ 2.5 walls + **solid closed deck** |
| 3 | Screw stack | 4 × Ø7.0 M2 bosses + 9 × 9 corner gussets at (±24.1, ±24.1), Ø**2.0** pilots |
| 4 | **ToF aperture** | **Ø13.0** straight through-hole at (+12.000, −12.000). Nothing over it |
| 5 | **Mic acoustic ports** | **2 ×** Ø3.5 at (−17.850, +12.000) and (−6.150, +12.000) |
| 6 | **Trimpot access** | **2 ×** Ø4.0 at (−19.020, +12.000) and (−4.980, +12.000) |
| 7 | **Buzzer grilles ×2** | 7 × Ø2.5 hex (1 centre + 6 at r 3.5, 60°) at (−12,−12) and (+12,+12) |
| 8 | USB-C slot | 12.0 (Y) × 7.0 (Z) through the +X wall at model z −2.790 |
| 9 | Lugs | 2 pairs on ±Y walls, **`STRAP_W = 20.0`**, x_ctr **13.0**, Ø2.6 bores |
| 10 | Button access | 5.0 (X) × 40.0 (Y) through-deck slot over the 3-button column at x 25.76 |
| 11 | Skin plate | 57.0 square × 3.0, 4 × Ø2.4 clearance + Ø4.0 × 2.0 counterbores |
| 12 | Chamfers | 5 cosmetic sets, each in try/except → `_skipped` |

### How it was verified

Fusion has no headless mode, but `cad/tests/fake_adsk/` is a **real build123d geometry engine behind
a fake `adsk` API**. A 10-line `try/except ImportError` at the top of the script aliases it into
`sys.modules` when Fusion is absent; **inside Fusion the `try` succeeds and the fallback is dead
code**, so the file behaves exactly like `braille_wearable_enclosure.py` there.

| Check | Result |
|---|---|
| `.venv/bin/python cad/bus_stop_enclosure.py` | **exit 0** |
| Material probes, convention `identity` | **34 PASS / 0 FAIL** |
| Material probes, convention `mirrored` | **34 PASS / 0 FAIL** |
| Geometry identical under `identity` vs `mirrored` | **PASS** (per-body volume + bbox byte-identical) |
| Geometry under `rotated` (extra, not required) | identical volumes — 27556.87301 / 9628.37346 mm³ |
| Part-document path (`addNewComponent` refused) | **builds into `rootComponent`**, same 2 bodies, same volumes |
| Cosmetic chamfers skipped | **none** — all 5 edge selectors matched edges |
| Body manifoldness | `cage` **1 lump**, `skin_plate` **1 lump** |
| `.venv/bin/python -m pytest cad/tests -q` | **128 passed** (unchanged) |
| `cad/bus_stop_enclosure.step` | 441 830 bytes, 2 labelled solids |
| `cad/bus_stop_enclosure.stl` | 961 484 bytes |

**Independent re-probe of the exported STEP** (fresh `import_step` + `BRepClass3d_SolidClassifier`,
i.e. *not* the same code path that built it): 15/15 checks pass. Every cylindrical face was then
extracted and measured off the STEP:

| Measured Ø | Count | Where | Spec |
|---|---|---|---|
| **13.0000** | 1 | (12.000, −12.000), z 17.575..20.075 | ToF aperture ✅ |
| **4.0000** | 6 | 2 trimpot @ (−19.020 / −4.980, 12.000) + 4 plate counterbores | ✅ |
| **3.5000** | 2 | (−17.850, 12.000), (−6.150, 12.000) | mic ports ✅ |
| **2.5000** | 14 | 2 grilles × 7 holes, z 17.575..20.075 | buzzer grilles ✅ |
| **2.6000** | 4 | axis X at (±32.250, −3.000) | lug bores ✅ |
| **2.4000** | 4 | (±24.1, ±24.1), z −11.100..−8.100 | plate clearance ✅ |
| **2.0000** | 4 | (±24.1, ±24.1), z −8.100..−1.600 | **BOSS_PILOT override** ✅ |
| **7.0000** | 4 | (±24.1, ±24.1) | boss OD ✅ |

Overall bbox **X ±31.000 · Y ±36.000 · Z −11.100..+20.075** — 62 × 72 × 31.175 mm. This is also the
**cm-unit sanity check** (audit/08 R2): a script that skipped the `/10.0` conversion would measure
620 × 720 × 311 mm. It does not.

A 1 mm raster of the deck at z = 18.825 and 0.1 mm line scans confirm the deck is **solid everywhere
except the listed apertures**, and rendered ISO/TOP snapshots were reviewed against the raster.

---

## 2. Parameter table

Every constant is module-level, named, and carries one of four tags: `T1:audit/01:<what>`,
`P1:audit/07:§<n>`, `ASSUMED-AX22-STANDARD`, `DESIGN`. **No bare dimensional number appears inside a
geometry call.** The only bare numbers permitted in geometry are the structural factors `2.0`
(halving a size / doubling a half-extent) and `10.0` (mm → cm, confined to `_cm()` and `_pt()`).

### 2.1 Host board — measured

| Constant | Value | Source tag | Note |
|---|---|---|---|
| `BOARD_BAY` | 55.0 | `T1:audit/01:PCB footprint` | 55.000 × 55.000 measured |
| `BOARD_THICK` | 1.6 | `T1:audit/01:PCB thickness` | **Measured 1.510; coded 1.6 kept.** audit/01 flags the coded value as "0.09 mm optimistic". Keeping 1.6 makes every −Z clearance *conservative* (the real pocket is 0.09 mm deeper than the map says) |
| `BOARD_HOLE_X` | 24.1 | `T1:audit/01:mounting holes` | 4 × Ø3.400 at (±24.100, ±24.100) |
| `BOARD_HOLE_DIA` | 3.4 | `T1:audit/01:mounting holes` | measured board hole Ø |
| `PORT_CTR` | 12.0 | `T1:audit/01:port centres` | (±12.000, ±12.000), max deviation 0.001 mm; pitch 24.000 |
| `MODULE_SQ` | 22.0 | `ASSUMED-AX22-STANDARD` | audit/01: 9 of 10 STEPs. P1:audit/07:§4.1/§4.2 re-measures 22.000 on **both** new modules — the assumption became a measurement |
| `BTN_X` | 25.76 | `T1:audit/01:onboard buttons` | 3 × `skrpade010` at x 25.760 |
| `BTN_Y` | 17.0 | `T1:audit/01:onboard buttons` | y +17.008 / +0.008 / −16.992 |
| `BTN_BODY_X` / `BTN_BODY_Y` | 3.2 / 4.6 | `T1:audit/01:onboard buttons` | body 3.200 × 4.600 × 2.500 |
| `BTN_PLUNGER_TOP` | 2.4 | `T1:audit/01:button top` | plunger top above board top (body top +2.585) |
| `NEG_Z_DEEP` | 5.59 | `T1:audit/01:deepest underside` | JST `S2B-PH-SM4-TB` at −5.585, agreement 0.005 mm |
| `USB_REC_ZLO` | −3.295 | `T1:audit/01:USB-C receptacle` | rel. PCB bottom |
| `USB_REC_ZHI` | 0.915 | `T1:audit/01:USB-C receptacle` | rel. PCB bottom |
| `BOARD_PLAY` | 0.7 | derived from `T1:audit/01` | (Ø3.400 board hole − Ø2.000 pilot)/2 = board XY float |

### 2.2 Port assignment

| Constant | Value | Source tag |
|---|---|---|
| `PORT_BUZZ_A_X / _Y` | −12.0 / −12.0 | `P1:audit/07:§5.0` |
| `PORT_TOF_X / _Y` | +12.0 / −12.0 | `P1:audit/07:§5.0` |
| `PORT_BUZZ_B_X / _Y` | +12.0 / +12.0 | `P1:audit/07:§5.0` |
| `PORT_MIC_X / _Y` | −12.0 / +12.0 | `P1:audit/07:§5.0` |

### 2.3 Module heights — the corrected Z chain

| Constant | Value | Source tag | Note |
|---|---|---|---|
| `MIC_TRIMPOT_TOP` | **16.575** | `P1:audit/07:§4.5` | **THE GOVERNING MODULE HEIGHT.** module PCB top 11.610 + `3362P` trimpot body 4.965. audit/01's `MOTOR_TOP` 15.25 is void — the ERM is out of the BOM |
| `MIC_CAPSULE_OFFSET` | 5.850 | `P1:audit/07:§4.1` | electret capsule at (+5.850, +0.012) from module centre |
| `MIC_TRIMPOT_OFFSET` | 7.020 | `P1:audit/07:§4.1/§5.2` | trimpot screw axis at module-local (−7.022, −0.005) |
| `ROOF_CLEAR` | 1.0 | `P1:audit/07:§4.5/§6.3` | validated by real printed hardware — the reference shell runs 0.9–1.6 mm over a mated MLT-8530 |
| `ROOF_THICK` | 2.5 | `DESIGN` | ≥2.5 for FDM |

**Derived Z-map** (board top = 0), all in the script as computed expressions, never as literals:

| Name | Expression | Value |
|---|---|---|
| `Z_BOARD_BOT` | `−BOARD_THICK` | −1.600 |
| `Z_POCKET_FL` = `Z_PLATE_TOP` | `Z_BOARD_BOT − NEG_Z_POCKET` | −8.100 |
| `Z_PLATE_BOT` | `Z_PLATE_TOP − PLATE_T` | −11.100 |
| **`Z_ROOF_INNER`** = `DECK_INNER` | `MIC_TRIMPOT_TOP + ROOF_CLEAR` | **+17.575** (audit/01's +16.25 is wrong, too low by 1.325) |
| **`Z_ROOF_OUTER`** = `DECK_TOP` | `Z_ROOF_INNER + ROOF_THICK` | **+20.075** (audit/01's +18.75 is wrong, too low by 1.325) |
| `DECK_MID` | `(DECK_INNER + DECK_TOP)/2` | +18.825 |
| `Z_THRU_BOT` / `Z_THRU_TOP` | `DECK_INNER − / DECK_TOP + THRU_OVERSHOOT` | +17.425 / +20.225 |
| overall height | `DECK_TOP − Z_PLATE_BOT` | **31.175** (matches P1:audit/07:§4.5 exactly) |

### 2.4 Apertures

| Constant | Value | Source tag | Note |
|---|---|---|---|
| `TOF_APERTURE_DIA` | **13.0** | `P1:audit/07:§5.1` | Straight cylinder. Ø8.913 required at the outer face (corrected rule X = 3.74 + 0.70·g, g = 7.390; first-principles cross-check 8.876, agreement 0.037 mm), + ±1.27 registration ⇒ Ø11.453; 13.0 leaves 1.547 mm margin. **audit/01's Ø12.0 superseded — only 0.547 mm** |
| `MIC_PORT_DIA` | 3.5 | `P1:audit/07:§5.2` | L/D = 0.71, "short and wide" per Knowles M1/M3 |
| `MIC_PORT_COUNT` | 2 | `P1:audit/07:§5.2` | capsule 5.850 off-centre × 180°-ambiguous insertion |
| `TRIMPOT_ACCESS_DIA` | 4.0 | `P1:audit/07:§5.2` | manual gain trimpot must stay reachable |
| `GRILLE_HOLE_DIA` | 2.5 | `P1:audit/07:§5.3` | min web 1.00 mm ≥ 0.8 at a 0.4 mm nozzle |
| `GRILLE_RING_R` | 3.5 | `P1:audit/07:§5.3` | overall extent Ø9.5 over a Ø8.5 body |
| `GRILLE_RING_N` | 6 | `P1:audit/07:§5.3` | + 1 centre = 7 holes, 34.4 mm² open area per port |
| `MIC_PORT_A_X` / `_B_X` | −17.850 / −6.150 | derived | `PORT_MIC_X ∓ MIC_CAPSULE_OFFSET` |
| `TRIMPOT_A_X` / `_B_X` | −19.020 / −4.980 | derived | `PORT_MIC_X ∓ MIC_TRIMPOT_OFFSET` |
| `BTN_SLOT_W` | 5.0 | `DESIGN` | `BTN_BODY_X` 3.2 + 0.9/side; 0.9 > `BOARD_PLAY` 0.7 |
| `BTN_SLOT_HALF_Y` | 20.0 | `DESIGN` | button bodies span y −19.292..+19.308 |
| `THRU_OVERSHOOT` | 0.15 | `DESIGN` | cut-tool over-run past **both** deck faces |

### 2.5 Structure, strap and screw stack

| Constant | Value | Source tag | Note |
|---|---|---|---|
| `BAY_CLEAR` | 1.0 | `DESIGN` | audit/01 §D 0.5–1.0 |
| `WALL` | 2.5 | `DESIGN` | |
| `PLATE_T` | 3.0 | `DESIGN` | |
| `NEG_Z_POCKET` | 6.5 | `DESIGN` | 0.915 mm margin over the measured JST at −5.585. P1:audit/07:§6.2 notes the reference shell only gives 5.150 mm and may foul that connector — **evidence for keeping 6.5** |
| **`STRAP_W`** | **20.0** | `DESIGN` | `plan/2026-07-18-bus-stop-situational-awareness.md`: "20 mm strap + Ø2.5 pins \| REUSE / IN-HAND \| Drives `LUG_GAP` = 20.0, not 22.0" |
| `LUG_X_CTR` (derived) | 13.0 | derived | `STRAP_W/2 + LUG_W/2` (was 14.0 at 22 mm) |
| `LUG_BORE` / `LUG_W` / `LUG_PROJ` / `LUG_H` / `LUG_BORE_Z` | 2.6 / 6.0 / 5.0 / 8.0 / −3.0 | `DESIGN` | carried from the braille sibling |
| `LUG_BORE_OVERSHOOT` | 2.0 | `DESIGN` | symmetric bore full length = `LUG_W` + this |
| `BOSS_DIA` | 7.0 | `P1:audit/07:§6.2` | **CONFIRMED** Ø7.000 in the reference shell |
| **`BOSS_PILOT`** | **2.0** | `P1:audit/07:§6.2` | **OVERRIDE.** 1.8 (carried, unsourced) vs **2.000 measured on 8 features across 2 independent parts** of `cad/reference/genesis-mini-shell.step`, a printed shell taking M2×20 screws. 2.000 wins — it is the value proven in PLA on this exact board. 1.8 is not *wrong*, just a tighter thread-forming fit with no evidence behind it |
| `GUSSET_SQ` / `GUSSET_T` | 9.0 / 2.5 | `DESIGN` | |
| `PLATE_CB_DIA` | 4.0 | `P1:audit/07:§6.2` | **CONFIRMED EXACTLY** — Ø4.000, independent agreement to 3 d.p. |
| `PLATE_CB_D` | 2.0 | `P1:audit/07:§6.2` | **KEPT.** The reference's 3.350 lives in a 9.15 mm stack; 3.350 in a 3.0 mm plate would be a *through-hole*. 2.0 leaves 1.0 mm under the head |
| `PLATE_HOLE_DIA` | 2.4 | `P1:audit/07:§6.2` | **KEPT.** ISO 273 medium clearance for M2. The reference's Ø3.500 assembles but gives up location |
| `USB_SLOT_W` / `USB_SLOT_H` | 12.0 / 7.0 | `DESIGN` | ≥12 for cable overmold, ≥7 |
| `USB_PLANE_INSET` / `WALL_CUT_MARGIN` | 1.5 / 2.0 | `DESIGN` | sketch-plane inset; wall-cut exit margin |
| `CHAMFER_VERT` / `CHAMFER_TOP` / `CHAMFER_LUG` / `USB_FUNNEL` | 3.0 / 2.0 / 1.5 / 1.5 | `DESIGN` | cosmetic only |
| `CHAMFER_TOF` | 0.5 | `P1:audit/07:§5.1` | "optionally chamfer the outer bore edge 0.5 × 45° to flare it" |
| `EDGE_*_TOL` | 0.2–1.0 | `DESIGN` | chamfer edge-selection tolerances (not geometry dimensions) |

### 2.6 Envelope cross-check (required)

`REFERENCE_SHELL_WIDTH = 63.0` — `P1:audit/07:§6.1`, measured 159.500 × 63.000 × 17.000 mm.

The script carries a **live `assert CAGE_OUTER < REFERENCE_SHELL_WIDTH`**, so the check cannot rot:

- `CAGE_OUTER` **62.0 < 63.000** → we clear the proven article by **1.0 mm** on its width axis.
- On the other axis we are deliberately nothing like it: **62 mm vs 159.5 mm**. That is the point —
  the reference is a desktop console body (and its 159.5 mm is itself a print-layout artefact: the
  file holds four separate bodies laid out side by side). Ours is a **wrist form factor**, square on
  the board, with the strap lugs carrying the load off the ±Y walls.

---

## 3. Deviations vs `braille_wearable_enclosure.py`

`cad/braille_wearable_enclosure.py` was **not modified** — this is a sibling file in the same idiom.

| # | Deviation | Justification |
|---|---|---|
| 1 | **Strap 22.0 → `STRAP_W` 20.0**; `x_ctr` 14.0 → **13.0** | The plan locks the 20 mm strap that is **in hand** (`plan/…:121`). The braille file's 22.0 was the generic NATO/spring-bar width. Renamed `LUG_GAP` → `STRAP_W` because it *is* the strap width, and the lug gap is the consequence |
| 2 | **Deck +1.325 mm**: `Z_ROOF_INNER` 16.25 → **17.575**, `Z_ROOF_OUTER` 18.75 → **20.075** | The ERM (`MOTOR_TOP` 15.25) is **out of the BOM**. The AX22-0009 mic's `3362P` trimpot tops out at +16.575 — 1.325 mm higher. Building audit/01's deck gives a **0.325 mm hard interference** into the trimpot body: the module would not seat. audit/01's own Residual Risk #2 fired (`P1:audit/07:§2`) |
| 3 | **All reveals deleted** — `_cut_p1_well`, `_cut_grille` (louvres), `_cut_bezel_and_window`, `_build_turret` + hex ring, `_cut_side_window`, `_cut_lcd_relief`, `_cut_usb_dock`, and every associated constant (`FIELD_HALF`, `WEB_KEEPOUT`, `P1_*`, `GRILLE_*`, `TURRET_*`, `HEXRING_*`, `SIDEWIN_*`, `BEZEL_*`, `LCD_*`, `ENC_*`, `CORNER_CLIP`) | The BOM has no LCD and no encoder, and the brief is a **closed body**. audit/01's decisive experiment showed deleting these ten calls closes the shell for free with every fit feature intact. Kept the same conclusion, but authored the closed form directly rather than by subtraction |
| 4 | **ToF Ø12.0 → Ø13.0** | The larger air gap (7.390 vs 6.07 mm) **and** a corrected AN4907 slope (0.700, not 0.63 — audit/01 fitted 3 rows that straddled the table's knee) raise the requirement from Ø8.436 to Ø8.913. Ø12.0 would leave only 0.547 mm of diametral margin against ±1.27 mm module registration |
| 5 | **Mic 1 hole on the port centre → 2 holes off-centre** | The electret capsule is **5.850 mm off the module centre** and insertion is 180°-ambiguous, so audit/01's centred Ø3.0 lands over the **op-amp** in *both* orientations. Two Ø3.5 holes at port centre ± 5.850 guarantee one lands on the capsule. A probe explicitly asserts the P4 **port centre is SOLID** to lock this in |
| 6 | **NEW: buzzer grilles ×2** (absent — the braille build had ERMs, which need no acoustic path) | A solid deck loses **24–32 dB** of a 2.7 kHz alert before the 10–15 dB coincidence penalty; an 80 dB alert arrives at ~50–60 dB at a bus stop. The one designer known to have printed a shell for this exact buzzer cut a real through-grille over this exact port (`P1:audit/07:§5.3/§6.4`) |
| 7 | **NEW: trimpot access ×2** | The MCP6001 gain is set by a **manual** trimpot. Sealing it freezes gain at whatever it was at assembly — a functional trap, since gain must be tuned against the real acoustic environment |
| 8 | **`BOSS_PILOT` 1.8 → 2.0** | Measured on 8 features across 2 independent parts of the reference shell (§2.5). The braille file's 1.8 was `CARRIED-OVER-UNVERIFIED` |
| 9 | **NEW: headless `try/except ImportError` + `__main__` block** (absent from the braille file, which is Fusion-only and is exercised by `cad/tests/`) | Lets *this exact file* be run by a plain interpreter for fit verification and STEP/STL export, without a separate harness. ~10 lines, clearly commented, **dead code inside Fusion** |
| 10 | Button **open trench** (4.7 × 41, `BTN_TRENCH_*`) → **narrow slot** (5.0 × 40, `BTN_SLOT_*`) | The trench was part of the reveal language. This is the minimal functional aperture: `BTN_BODY_X` 3.2 + 0.9/side, where 0.9 > the 0.7 mm `BOARD_PLAY`. See Residual Risk #6 — it does **not** solve reach |
| 11 | Cut tools now overshoot **both** deck faces (`Z_THRU_BOT`/`Z_THRU_TOP`), not just the top | The braille file sketched deck cuts *at* `DECK_INNER`, leaving a coincident face. A CUT whose tool fails to fully cross a face is the same failure family as `RuntimeError: 3 : No target body found to cut or intersect!` |
| 12 | USB funnel chamfer now selects **all four** slot edges, not just the two long ones | The braille filter required horizontal edges; the vertical pair was silently dropped. Cosmetic either way |
| 13 | Skin plate built at step **11** (before chamfers), not step 13 | Follows the brief's sequence. Harmless: chamfer selectors iterate `_cage.edges` only, and no boolean follows the plate |
| 14 | `USB_REC_ZLO/ZHI` −3.29/0.91 → **−3.295/0.915** | audit/01's exact measured values. `USB_SLOT_CZ` is unchanged at −2.790 |
| 15 | Added a live `assert CAGE_OUTER < REFERENCE_SHELL_WIDTH` | §2.6 — makes the envelope cross-check executable rather than a comment |

**Carried over unchanged and deliberately so:** the `_cm()` chokepoint, the Part-document fallback,
`modelToSketchSpace` + `setSymmetricExtent` on every offset-yZ feature, "fit features abort loudly /
only cosmetics degrade", the XY-sketch-plus-vertical-extrude preference, `BOARD_BAY`, `BAY_CLEAR`,
`WALL`, `PLATE_T`, `NEG_Z_POCKET`, `BOSS_DIA`, `GUSSET_*`, `USB_SLOT_W/H`, `LUG_*` (except the gap),
and the whole `_boss_corners()` / gusset / pilot construction.

---

## 4. Residual risk

### Carried from Phase 1 §8 — the items that bind this geometry

| # | Risk | Why it binds | What would close it |
|---|---|---|---|
| **1** | **The 4.965 mm trimpot height is from CAD, not calipers.** The STEP labels a `3362P-1-**503**LF` while the photographed board carries a **"P 103"** — same body form factor, different resistance | 🔴 **Everything hangs off this one number.** `MIC_TRIMPOT_TOP` 16.575 sets `Z_ROOF_INNER`, `Z_ROOF_OUTER`, the whole 31.175 mm height, the 7.390 mm ToF air gap and therefore the Ø13.0 aperture. A few tenths of error propagates through all of it | **Calipers, 60 seconds** — measure the trimpot top above the module PCB top. If it differs, change `MIC_TRIMPOT_TOP` and everything downstream recomputes; then re-derive the ToF aperture (§5.1's arithmetic is parametric in g) |
| **2** | **Module insertion is 180°-ambiguous** | This is the *only* reason there are 2 mic ports and 2 trimpot holes instead of 1 each. If assembly locks the orientation, **half of those four openings are wasted holes** in a body whose whole point is being closed | Dry-fit, mark the module and the deck, document the orientation, then delete the unused hole of each pair. Do **not** delete either on the assumption it will "probably" go in one way |
| **12** | **`ROOF_CLEAR` 1.00 mm over the trimpot is the tightest clearance in the build** — mic spare headroom is exactly 1.000 mm vs 2.880 (buzzer) / 2.915 (ToF) | Any upward error in risk 1, or any print z-overshoot on the deck underside, lands **directly on the trimpot**. There is no slack anywhere else to absorb it | Same caliper check as risk 1. Consider `ROOF_CLEAR` 1.5 if 0.5 mm of extra height is acceptable — note the reference shell runs 0.9–1.6 mm here, so 1.0 is normal practice, not tight-by-mistake |
| 3 | ToF aperture is an **extrapolation 3.7× beyond ST's published table** (g = 7.390 vs a table ending at 2.0) | Ø13.0 rests on it. Two independent methods agree to 0.037 mm, but ST publishes nothing at this gap | Bench-test against a known distance **with the enclosure fitted**; run crosstalk calibration in that state. If readings are short/constant, enlarge the hole before touching firmware |
| 5 | **Buzzer↔mic acoustic coupling is unquantified and structurally unavoidable** | Two 80 dB transducers 24–34 mm from an amplified electret inside **one open cavity** — and this build deliberately vents that cavity further (≳220 mm² of open area) | **Firmware, not CAD:** gate/mute the mic for any buzzer output plus a decay tail. No enclosure geometry can fix it |
| 11 | **Port assignment is assumed, not decided** (§5.0 keys to audit/01's map with buzzers on P1/P3) | If the plan re-assigns ports, four XY centres move | Only the `PORT_*` constants change; every diameter, depth, count and pitch is unaffected. The mic port and trimpot X positions are **derived** from `PORT_MIC_X`, so they follow automatically |
| 10 | Reference shell's under-board clearance (5.150) < measured deepest component (−5.585) | Informational only — our `NEG_Z_POCKET` 6.5 clears both | Caliper the JST. Matters only if anyone tightens the −Z pocket toward the reference's value |

### New in Phase 2

| # | Risk | Detail |
|---|---|---|
| **6** | 🔴 **The button slot does not make the buttons pressable by finger.** | The plunger tops sit at **+2.4**, which is **15.175 mm below the deck underside** and 17.675 mm below the outer face. A 5.0 mm slot admits a stylus or a small screwdriver; it does **not** admit a fingertip that far down. The firmware's primary interaction — a **long press ≥1.5 s for global mute**, plus a short press for ACK — is therefore awkward-to-impossible with bare hands as built. This is a **real open item**, not a detail. Closing it needs one of: (a) a printed plunger extension / button cap bridging +2.4 → ~+20.1 (the honest fix, and a new part); (b) a wider finger opening, which costs the closed-body language; (c) a flexible membrane over a widened slot. **Nothing in this file solves it, and the slot alone must not be mistaken for a solution.** |
| **7** | **Chamfers are unverified by the harness.** | `fake_adsk` **records chamfers without applying them** (`cad/tests/fake_adsk/fusion.py:452`). The script reports "All cosmetic features created", which means all five **edge selectors matched edges** — it does **not** mean the chamfers are geometrically valid. In real Fusion any of them can still error (over-consumed geometry, unresolvable faces), in which case it lands in `_skipped`. The `CHAMFER_TOF` selector additionally relies on `BRepEdge.pointOnEdge` in Fusion vs `geometry.startPoint` offline — the offline path is exercised, the Fusion path is not |
| **8** | **The exported STEP/STL is a fit-check artifact, not a preview.** | It is correct in **every fit dimension** (independently re-measured, §1) and **missing all chamfers**. Do not send it to a slicer expecting the finished part, and do not treat its edges as the design's edges. **Fusion remains ground truth** |
| **9** | **Nothing here has been run in Fusion, and nothing has been printed.** | The two live-Fusion defect classes (Part-document components; offset-yZ sketch-frame orientation) are *structurally* prevented — the Part fallback is exercised headlessly, and geometry is proven **identical under `identity`, `mirrored` and `rotated`** conventions. But the harness models a *family* of conventions to prove invariance; the true in-Fusion frame is ground truth only inside Fusion. Everything else is static geometry and desk arithmetic |
| **10** | **The mic and trimpot holes MERGE.** | At 1.170 mm centre spacing, each Ø4.0 trimpot hole overlaps its neighbouring Ø3.5 mic port. The result is not four round holes but **two ~4.92 × 4.0 mm oblong openings** (measured 4.800 mm at 0.1 mm raster resolution, true extent −21.020..−16.100 and −7.900..−2.980). Phase 1 specified both features without noting this. **Intended and harmless** — both functions are still served and the openings stay 7.5 mm clear of the cavity wall — but it is a visible cosmetic consequence, and it makes the deck's open area larger than the sum of the nominal circles |
| **11** | **The lug bore over-run nicks the ±Y wall.** | The symmetric Ø2.6 bore (full length 8.0 about the lug mid-plane) reaches 1 mm past each end of the 6 mm lug block, where the ±Y wall's outer face is at \|y\| = 31.0 and the bore reaches \|y\| = 30.95. Result: a **0.05 mm deep, ~0.71 mm wide, 1 mm long scallop** on each side of each lug (verified: SOLID at y = 30.94, AIR at y = 30.96). **Far below FDM resolution** — a 0.4 mm nozzle cannot represent it — and the over-run is what makes the bore orientation-proof, so it stays. Recorded so nobody rediscovers it in a mesh inspector and thinks it is a defect |
| **12** | **`BOARD_THICK` is coded 1.6 but measures 1.510.** | Carried forward deliberately (§2.1). Every −Z derived value is 0.09 mm *conservative*, not optimistic, in the direction that matters (the real pocket is deeper). Harmless at current clearances; correct it if the −Z pocket is ever tightened |

---

## 5. Physical inspection items before printing

Ordered by what would waste the most material if wrong.

1. **⭐ Caliper the mic trimpot.** Measure the `3362P` body top above the AX22-0009 module PCB top.
   Expect **4.965 mm**. This single number sets the deck height, the total part height and the ToF
   aperture diameter (risks 1 and 12). **Do this before slicing anything.**
2. **⭐ Dry-fit the microphone module and decide its orientation.** Mark the module and the deck. If
   the orientation is locked, delete the unused mic port and the unused trimpot hole (risk 2) — that
   removes two openings from a body whose purpose is to be closed.
3. **Caliper the JST `S2B-PH-SM4-TB` depth below the board.** Expect −5.585. `NEG_Z_POCKET` 6.5
   leaves 0.915 mm; the reference shell's 5.150 mm would not clear it (risk 10).
4. **Confirm the board screw pattern and hole diameter.** Expect (±24.100, ±24.100), Ø3.400. The
   reference shell uses ±24.000 — a 0.100 mm/axis discrepancy absorbed by the board holes.
5. **Test the Ø2.0 pilot with the actual M2 screws before committing 4 bosses.** Print one boss as a
   coupon. `BOSS_PILOT` was overridden 1.8 → 2.0 on reference-shell evidence; 2.0 is the value proven
   in PLA, but *your* screws and *your* filament decide.
6. **Check the USB-C plug's overmold against the 12.0 × 7.0 slot** with the actual cable, and confirm
   the receptacle sits 1.411 mm proud of the board edge.
7. **Decide the button plunger strategy before printing the cage** (risk 6). A plunger extension is a
   new part with its own fit; a wider opening changes the deck. Both are cheaper to decide now.
8. **Print a buzzer grille coupon and listen to it** with the real MLT-8530 mated. If it sounds weak,
   Phase 1's more-open variant (Ø3.0 holes at 4.0 mm ring radius, Ø11.0 extent, 49.5 mm² open) keeps
   the same 1.00 mm web.
9. **Measure the printed Ø13.0 ToF hole, then range-test with the enclosure fitted** and run VL53L0X
   crosstalk calibration **in that state, never bare** (risk 3).
10. **Print in black / dark filament** for bore-wall IR absorption at the ToF aperture.
11. **Verify the 20 mm strap and Ø2.5 pins** against the 20.0 mm lug gap and Ø2.6 bores before
    printing the lugs.
12. **Run the script once in Fusion and read the dialog.** Confirm the bounding box is
    62 × 72 × 31.175 mm (not 620 × 720 × 311 — the cm-unit trap), that both bodies appear, and check
    which chamfers, if any, landed in the "skipped" list (risk 7).

---

## 6. Files

| Path | What |
|---|---|
| `cad/bus_stop_enclosure.py` | **The deliverable.** Fusion 360 Scripts API script, 1 204 lines |
| `cad/bus_stop_enclosure.step` | Fit-check artifact, 441 830 bytes, 2 labelled solids (`cage`, `skin_plate`) — **chamfers absent** |
| `cad/bus_stop_enclosure.stl` | Fit-check artifact, 961 484 bytes — **chamfers absent** |
| `audit/bus-stop-situational-awareness/08-phase-2-cad-build.md` | This file |

**Not modified:** `cad/braille_wearable_enclosure.py`, `cad/braille_wearable_exocage.py`,
`cad/tests/**`, and audit files `01`–`05`, `06-*`, `07`.
