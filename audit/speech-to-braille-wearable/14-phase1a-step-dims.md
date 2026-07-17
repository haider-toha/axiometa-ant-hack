# Phase 1A — STEP Dimension Groundwork (Track A)

**Scope:** Extract physical dimensions from the fit-critical STEP files under `parts/` for the wrist-worn braille wearable enclosure CAD. Every value below is measured from actual resolved geometry; nothing is invented. Un-measurable items are marked **UNKNOWN-CONFIRMED** with a physical-measurement instruction.

**Date:** 2026-07-17

**Tooling / method (what actually worked):**
- CAD kernel **was available** in the project virtualenv `/.venv` (build123d + OCP/OpenCASCADE + `cadpy` all importable). The plain Homebrew `python` lacked them; `.venv/bin/python` has them.
- The skill launcher `python .claude/skills/cad/scripts/inspect refs <file> --facts --planes` works when run with `.venv/bin/python` and gave the board Z-plane stackup.
- Primary extraction used **direct OCP scripting** with `STEPCAFControl_Reader` (reads the assembly tree with named component labels **and applies all placement transforms**, so coordinates are world/board coordinates) plus `BRepAdaptor_Surface` cylinder detection for holes/pins/shafts. Scripts in scratchpad (`analyze.py`, `dump.py`).
- **The known data-quality caveat was avoided by construction:** using the solid model via the CAF reader (not raw CARTESIAN_POINT text) means no draughting/annotation entities leak in. The LCD X-span came out a clean **30.6 mm** (the "~315 mm" artifact was the un-transformed `IPS_LCD_Template` internal coordinate at x≈149.8; the CAF reader resolves its placement to x≈-1.1). No stray Z≈8–9 annotation points appeared in any solid bbox.

**Coordinate convention (single convention, used for ALL board XY below):**
- **Origin = geometric centre of the 55 × 55 mm PCB** (x=0, y=0).
- **+Z = up, toward the socket/button ("top") face.** Modules plug in on +Z; the ESP32-S3, USB-C and JST connectors hang on −Z.
- In model Z: **PCB bottom soldermask face = z ≈ −0.05 mm, PCB top soldermask face = z ≈ +1.56 mm.** "Height above PCB top" = (feature top Z) − 1.56.
- Module-local files use the same convention with each module's own PCB centred at its origin, PCB from z=0 (bottom) to z=+1.51 (top core), module components on +Z, mating header pins on −Z.

---

## Main dimension table

| Dim name | Measured value (mm) | Conf. | Measurement method |
|---|---|---|---|
| **HOST BOARD `STP_MTX0013`** | | | |
| Overall assembly bbox (incl. USB-C, sockets) | 56.41 (X) × 55.00 (Y) × 14.65 (Z), z[−5.585, +9.065] | HIGH | OCP bbox of resolved assembly |
| PCB outline (X × Y) | 55.00 × 55.00 | HIGH | PCB/soldermask solid bbox |
| PCB thickness (core FR4) | 1.51 | HIGH | `..._PCB` solid z-extent (z 0.00→1.51) |
| PCB thickness (soldermask-to-soldermask) | 1.61 | HIGH | `..._soldermask` solid (z −0.05→+1.56) |
| Board mounting holes | 4× Ø3.40, through, at (±24.1, ±24.1) | HIGH | cylindrical face R=1.70, z[0,1.51], ×4 |
| — annular pad around each | Ø6.8 pad ring | MED | concentric Ø6.8 face at corners |
| AX22 port sockets (see UNKNOWN #1) | 8× `PinSocket_2x05_P2.54mm_Vertical_SMD` in 4 ports | HIGH | CAF component labels |
| Socket body (each 2×5) | 6.80 (X) × 12.70 (Y) × 7.50 (Z) | HIGH | component instance bbox |
| Socket top height above PCB top | 7.50 (top at z=+9.065) | HIGH | bbox z-max − 1.56 |
| Pin pitch | 2.54 (both axes) | HIGH | part name P2.54; row pitch measured 2.54; body 12.7=5×2.54 |
| USB-C receptacle (see UNKNOWN #3) | `Type-C 16P`, 7.90(X)×8.90(Y)×4.20(Z) | HIGH | component `P1` bbox |
| Onboard tactile switches | 3× `skrpade010` (SW1/SW2/SW3), **top-actuated (+Z plunger, Ø2.2)** — see A7 Dispute 3 (file-14 v1 said side-actuated; corrected) | HIGH | CAF labels + actuator geometry |
| — switch positions | (25.76, +17.01), (25.76, +0.01), (25.76, −16.99) | HIGH | component centres; cap top z≈+4.09 |
| ESP32-S3 module (−Z) | `ESP32-S3-MINI-1-N4R2` 20.5×15.4×2.6, ctr(−17.14, 0) | HIGH | component bbox; bottom z≈−2.66 |
| Max component protrusion below PCB | 5.59 (JST-PH `J19`, z to −5.585) | HIGH | assembly bbox z-min; ESP32 reaches only −2.66 |
| JST connectors (−Z) | `J18` SM04B (24.37,−15.80); `J19` S2B-PH (19.22,+15.83) | HIGH | component labels |
| **ERM MODULE `AX22-0013`** | | | |
| Module bbox | 22.00 × 22.00 × 13.74, z[−8.545, +5.195] | HIGH | resolved bbox |
| Module PCB | 22.00 × 22.00 × 1.51 | HIGH | `..._PCB` solid |
| Mounting holes | 4× Ø2.70 at (±9, ±9), through (Ø4.0 pad ring) | HIGH | R=1.35 faces ×4 |
| Motor body `Vibration Motor v1` | 18.20 × 16.54 × 4.35 envelope, top z=+5.20 | HIGH | component bbox |
| Motor top above module PCB top | 3.69 | HIGH | 5.20 − 1.51 |
| ERM coin diameter (see UNKNOWN #5) | **UNKNOWN-CONFIRMED** — no coin modeled | — | motor is a rectangular envelope, no round coin face exists |
| Header pins | 2× `PinHeader_1x05_P2.54_Vertical`, tips z=−8.55 | HIGH | component bbox |
| Header pin protrusion below module PCB | 8.55 | HIGH | z-min 0 → −8.55 |
| **ROTARY ENCODER `AX22-0003`** | | | |
| Module bbox | 22.40 × 22.40 × 36.94, z[−8.745, +28.195] | HIGH | resolved bbox |
| Module PCB | 22.00 × 22.00 × 1.51 | HIGH | `..._PCB` solid |
| Mounting holes | 4× Ø2.70 at (±9, ±9), through | HIGH | R=1.35 faces ×4 |
| Encoder shaft diameter | Ø6.0 (D-shaft; Ø7 threaded bushing below) | MED | Ø6.0 cylinder present; Ø6.5 knurl cluster |
| Shaft tip height (above PCB top) | 26.68 (tip at z=+28.195) | HIGH | bbox z-max − 1.51 |
| Encoder can body | `482020714001`, top z≈+20.4 | HIGH | sub-part bbox |
| Knob OD | **UNKNOWN-CONFIRMED** — no knob modeled | — | bare shaft only |
| Header pins | 2× 1×5 P2.54, tips z=−8.55 | HIGH | component bbox |
| **IPS LCD 0.96" `AX22-0034`** | | | |
| Module bbox | 30.60 × 22.00 × 11.675, z[−8.545, +3.130] | HIGH | resolved bbox |
| Module PCB footprint | **29.00 (X) × 22.00 (Y)** × 1.51 | HIGH | `..._PCB` solid |
| Mounting holes | 4× Ø2.70 at (±12.5, ±9), through | HIGH | R=1.35 faces ×4 |
| Glass/panel `IPS_0.96` | 29.97 (X) × 13.50 (Y) × 4.31, ctr(−1.12, −0.02) | HIGH | component bbox |
| Panel proud height above PCB top | 1.62 (top at z=+3.13) | HIGH | 3.13 − 1.51 |
| Panel overhang past PCB (−X edge) | ~1.6 (glass to x=−16.1 vs PCB −14.5) | MED | bbox comparison |
| Header pins | 2× 1×5 P2.54 at x=−3.50 (offset), tips z=−8.55 | HIGH | component bbox |
| **TACTILE LED BUTTON `AX22-0050`** (internal name AX22-0051) | | | |
| Module bbox | 22.00 × 22.00 × 15.49, z[−8.545, +6.945] | HIGH | resolved bbox |
| Module PCB | 22.00 × 22.00 × 1.51 | HIGH | `..._PCB` solid |
| Mounting holes | 4× Ø2.70 at (±9, ±9), through | HIGH | R=1.35 faces ×4 |
| Button `TactSwitch` | 14.05 × 15.00 × 8.99, centred (0,0) | HIGH | component bbox |
| Button cap | Ø6.62, top z=+6.95 | HIGH | Ø6.62 cyl at (0,0) |
| Button cap top above PCB top | 5.44 | HIGH | 6.95 − 1.51 |
| Header pins | 2× 1×5 P2.54, tips z=−8.55 | HIGH | component bbox |

### Non-mounted modules (brief bbox only — not in this build)

| Module | File | Overall bbox (mm) | Height above PCB top | Note |
|---|---|---|---|---|
| NeoPixel 5×5 | AX22-0028 | 22.00 × 22.00 × 12.19 | ~2.13 | 22×22, hdr pins to −8.55 |
| Passive buzzer | AX22-0018 | 22.00 × 22.00 × 13.14 | ~3.09 | 22×22 |
| DHT11 | AX22-0011 | 22.00 × 22.00 × 15.89 | ~5.84 | 22×22 |
| LDR | AX22-0005 | 22.00 × 22.00 × 32.50 | ~2.58 | **z-min −28.4 anomaly** (bent lead/loose geometry ~30 mm below PCB — ignore for enclosure; verify if ever used) |
| IR transceiver | AX22-0040 | 22.00 × 22.00 × 13.18 | ~3.12 | 22×22 |

All mounted-format modules share the pattern: **22×22 (LCD 29×22) PCB, 1.51 mm thick, 4× Ø2.7 mounting holes, two 1×5 P2.54 vertical header rows with pins protruding 8.55 mm below the module PCB.**

---

## The five UNKNOWNs — verdicts

### UNKNOWN #1 — AX22 socket centres, pitch, body dimensions — **RESOLVED**
The board carries **8** `PinSocket_2x05_P2.54mm_Vertical_SMD` components, grouped by reference designator into **4 ports (U1–U4)**, each port = a **pair** of 2×5 sockets side-by-side:

| Port (refdes) | Quadrant | Socket-A centre | Socket-B centre | Port centre |
|---|---|---|---|---|
| **U4** | top-left | (−19.70, +12.00) | (−4.30, +12.00) | (−12.0, +12.0) |
| **U3** | top-right | (+4.30, +12.00) | (+19.70, +12.00) | (+12.0, +12.0) |
| **U1** | bottom-left | (−19.70, −12.00) | (−4.30, −12.00) | (−12.0, −12.0) |
| **U2** | bottom-right | (+4.30, −12.00) | (+19.70, −12.00) | (+12.0, −12.0) |

- **Pin pitch = 2.54 mm** on both axes. Evidence: component name `P2.54mm`; measured row pitch 2.54 (rows at y = 6.92, 9.46, 12.00, 14.54, 17.08); socket length 12.70 = 5 × 2.54.
- **Socket body (each 2×5) = 6.80 (X) × 12.70 (Y) × 7.50 (Z) mm.** Sits on PCB top (z≈1.59) up to z≈9.09 → **7.50 mm tall above the PCB top face.**
- Each socket's two pin columns lie ±1.27 mm about its own centre X (2.54 mm apart).
- Evidence: `STEPCAFControl_Reader` component instance bboxes + resolved placements; 80 socket pins independently confirmed in an 8-column × 10-row grid.

### UNKNOWN #2 — Board mounting-hole XY + diameter — **RESOLVED (with a correction)**
**4× Ø3.40 mm through-holes at (±24.10, ±24.10) mm** (i.e. 3.4 mm in from each edge; 48.2 mm hole-to-hole spacing). Each hole has a concentric Ø6.8 pad/keepout ring. Through the full PCB (z 0→1.51).
> ⚠️ **Correction to the brief's expectation:** the brief expected Ø2.7 near corners; geometry measures **Ø3.4** (M3 clearance), not Ø2.7. The Ø2.7 holes belong to the 22×22 *modules*, not the host board. Confidence HIGH (clean ×4 cylindrical faces).

### UNKNOWN #3 — USB-C receptacle — **RESOLVED**
Component `P1` = `Type-C 16P` on the **+X edge**, **centred on Y=0**.
- Receptacle body: **7.90 (X, into board) × 8.90 (Y, width) × 4.20 (Z, height)**.
- Centre at (24.96, 0.00, −1.19). Body Z-range **−3.29 → +0.91** → it sits mostly **below** the PCB (bottom/−Z side), with its opening facing +X.
- **Protrusion past the +X board edge:** board edge at x=+27.5; receptacle reaches x=+28.91 → **1.41 mm proud** of the board edge.
- Enclosure USB cut-out must be centred on Y=0 on the +X wall, ~9 mm wide × ~4.2 mm tall, referenced to the PCB **bottom** face (receptacle centre ≈1.2 mm below PCB mid-plane).

### UNKNOWN #4 — Board thickness (PCB only) — **RESOLVED**
- **FR4 core = 1.51 mm.**
- **Soldermask-to-soldermask = 1.61 mm** (bottom face z=−0.05, top face z=+1.56).
- Use **1.6 mm** as the nominal board thickness for enclosure slots/rails. Confidence HIGH.

### UNKNOWN #5 — ERM coin diameter + protrusion — **PARTIAL / UNKNOWN-CONFIRMED**
- **Coin diameter: UNKNOWN-CONFIRMED.** The motor in `AX22-0013` (`Vibration Motor v1`) is modeled as a **rectangular envelope 18.20 × 16.54 × 4.35 mm**, not a round coin — there is **no cylindrical coin face anywhere in the file** (largest cylinder is Ø4.0, the mounting-pad rings). The exact coin diameter cannot be read from geometry.
  - **Physical measurement instruction:** with calipers, measure the coin ERM's outer diameter and thickness directly on the physical module. Typical coin ERMs are Ø8–12 mm × 2.5–3.4 mm — confirm the actual part.
- **Protrusion above module PCB: RESOLVED (envelope) = 3.69 mm** (motor body top at z=+5.20, module PCB top at z=+1.51). If the real coin is thinner than the 4.35 mm envelope, protrusion may be less — treat 3.69 mm as the modeled worst-case and verify against the physical coin.

---

## Port → logical-position mapping and onboard button count

### Port → position
The STEP encodes **reference designators U1–U4** (component labels), not silk "Port 1–4" text. The LOCKED pin map (Motor A=Port 1, LCD=Port 2, Encoder=Port 3, Motor B=Port 4; Port 1 & 4 diagonal) uses *logical port numbers* whose correspondence to the physical U1–U4 positions **cannot be proven from STEP geometry alone.**

What geometry *does* fix — the two diagonal pairs of port positions:
- Diagonal pair A: **U1 (−12, −12) ↔ U3 (+12, +12)**
- Diagonal pair B: **U2 (+12, −12) ↔ U4 (−12, +12)**

Since the pin map says Port 1 & Port 4 are diagonal, {Port 1, Port 4} = one of these two diagonal pairs, and {Port 2, Port 3} = the other. **Which logical port maps to which physical U-position: UNKNOWN-CONFIRMED.**
> **Resolution instruction:** photograph the board silkscreen (or read the schematic) to bind logical Port 1/2/3/4 to physical positions U1(−12,−12)/U2(+12,−12)/U3(+12,+12)/U4(−12,+12). Geometry already gives you the four XY anchor points to design the module cavities around.

### Onboard tactile button count — **3, not 2**
Three side-actuated `skrpade010` tactile switches are on the +X region of the top (+Z) face:
- **SW2** at (25.76, +17.01)
- **SW3** at (25.76, +0.01)
- **SW1** at (25.76, −16.99)

Cap top ≈ z+4.09 (≈2.5 mm above PCB top). The inspiration render showing "2 dots" **under-counts** — the STEP has 3. (Likely BOOT / RESET / user; exact function is a silk/schematic check, not geometry.)

---

## Grounding notes & residual risk

- **High-confidence, geometry-backed:** all bounding boxes, PCB thickness, socket centres & body, pin pitch, board mounting holes, USB-C envelope & offset, module footprints & mounting holes, button count & positions, header-pin protrusion. These came from named CAF components with resolved transforms — the strongest evidence class.
- **Residual risks / verify physically:**
  1. **ERM coin diameter** — not in geometry (rectangular envelope only). Calipers required.
  2. **Encoder shaft Ø** — Ø6.0 cylinder is present but merges with a Ø6.5 knurl and Ø7 bushing; treat as Ø6.0 D-shaft, confirm with calipers if the knob/cavity fit is tight. No knob is modeled.
  3. **Port logical numbering** — geometry gives 4 XY positions and the diagonal pairing, but not the logical Port 1–4 binding. Needs silk photo / schematic.
  4. **Board mounting hole = Ø3.4** (not the Ø2.7 assumed in the brief) — design enclosure bosses for M3, and verify against a physical board before committing.
  5. **LDR module** has stray geometry ~28 mm below its PCB (bent lead or loose entity). Not in this build; ignore unless it becomes a mounted part.
  6. **USB-C sits mostly below the PCB** (z −3.29→+0.91) — the enclosure USB window and the −Z clearance pocket must account for this, along with the JST-PH connector (deepest point, 5.59 mm below PCB bottom) and the ESP32-S3 (2.66 mm below).
- **Datum reminder for downstream CAD:** origin = PCB centre; +Z = socket/top side; PCB bottom face z=−0.05, PCB top face z=+1.56. All XY values above are directly consumable in this frame.

---

## Addendum — mated module placements (Phase 1A follow-up)

Same coordinate convention as above: **origin = board centre, +X = USB/button edge, +Y = "top", +Z = socket/top side.** All XY in board frame, mm.

### A0. Silk numbering RESOLVED (supersedes file-14 UNKNOWN on port mapping)
Board photos (IMG_6063 + BUN0001-HERO) fix the silk: the **+X (USB/button) edge carries Port 3 & Port 2**, the **−X column carries Port 4 & Port 1**, diagonal silk pairs {Port 1, Port 3} and {Port 2, Port 4}. This binds uniquely to the STEP reference designators (the only mapping consistent with all four constraints):

| Silk Port | Refdes | Board XY (port/socket centroid) | Locked function |
|---|---|---|---|
| **Port 1** | U1 | (−12.0, −12.0) | Motor A (ERM) |
| **Port 2** | U2 | (+12.0, −12.0) | LCD |
| **Port 3** | U3 | (+12.0, +12.0) | Encoder |
| **Port 4** | U4 | (−12.0, +12.0) | Motor B (ERM) |

Port pitch = **24.0 mm** in both X (row) and Y (column). Confidence HIGH (geometry) for the four XY anchors; silk→function binding is HIGH given the photo evidence.

### A1. Board socket contact grid (per port) — measured
Each port = two `PinSocket_2x05` bodies; contacts modeled as Ø1.09 stub cylinders at the PCB face (z≈1.61–1.82). Per-port grid (4 columns × 5 rows):

| Port | Socket-A cols X | Socket-B cols X | Rows Y (5, pitch 2.54) |
|---|---|---|---|
| Port 3 / U3 | 0.93, 7.67 | 16.33, 23.07 | 6.92, 9.46, 12.00, 14.54, 17.08 |
| Port 4 / U4 | −23.07, −16.33 | −7.67, −0.93 | 6.92, 9.46, 12.00, 14.54, 17.08 |
| Port 2 / U2 | 0.93, 7.67 | 16.33, 23.07 | −17.08, −14.54, −12.00, −9.46, −6.92 |
| Port 1 / U1 | −23.07, −16.33 | −7.67, −0.93 | −17.08, −14.54, −12.00, −9.46, −6.92 |

**Confirmed: the −Y ports mirror the +Y ports exactly** (rows at −6.92 … −17.08). Column pitch **within one 2×5 socket = 6.74 mm**; **row pitch = 2.54 mm**; two sockets per port 15.40 mm apart (socket-centre to socket-centre, x=±4.30 / ±19.70).

### A2. Module header-pin grid (module-local) — measured
Every module carries two `PinHeader_1x05_P2.54mm_Vertical` rows (5 pins each, long axis = module-X, pins at local x = −5.08, −2.54, 0, +2.54, +5.08, pitch 2.54):

| Module | Row A centre | Row B centre | Row separation | Header centroid (module-local) |
|---|---|---|---|---|
| ERM (AX22-0013) | (0.00, −8.90) | (0.00, +8.90) | 17.78 (= 7×2.54) | (0.00, 0.00) = PCB centre |
| Encoder (AX22-0003) | (0.00, −8.90) | (0.00, +8.90) | 17.78 | (0.00, 0.00) = PCB centre |
| Button (AX22-0050) | (0.00, −8.90) | (0.00, +8.90) | 17.78 | (0.00, 0.00) = PCB centre |
| LCD (AX22-0034) | (−3.50, −8.90) | (−3.50, +8.90) | 17.78 | **(−3.50, 0.00)** — offset −3.50 X from PCB centre |

### A3. CRITICAL: the board and module footprint models are pin-level incoherent
The board socket contacts are on a **6.74 (col) × 2.54 (row)** grid; the module header pins are on a **2.54 (in-row) × 17.78 (row-sep)** grid. After the mandatory 90° mate (module 5-pin axis must align to the socket's 5-row line → **module-X → board-Y**), the module's two rows are 17.78 mm apart in board-X, but **no board-port column pair equals 17.78** (available pair separations: 6.74, 8.66, 15.40, 22.14). The two vendor STEP libraries (board = SMD PinSocket, modules = THT PinHeader) **do not snap pin-to-hole**. Consequence: an exact pin-coincident mating transform cannot be derived from geometry. The physically correct and enclosure-usable rule is **header-centroid → port-centre, module-X → board-Y**; sub-mm pin registration is not resolvable from these files.

### A4. Mated placements (header-centroid → port-centre; module-X long axis → board-Y)

| Dim name | Value (mm) | Conf. | Method |
|---|---|---|---|
| Mate rotation (all modules) | module-X → board-Y (±90° about Z); 180°/0° cannot mate (all sockets have 5-hole lines along Y) | HIGH | socket grids A1 |
| Module PCB-bottom standoff above host PCB top | 7.50 (module PCB bottom ≈ board z +9.07 = socket top) | MED | socket height; header pin length 8.55 reaches contacts at z≈0.5 |
| **Motor A (ERM) @ Port 1** PCB centre | (−12.0, −12.0) | HIGH | centroid→port |
| — motor envelope centre | (−12.85, −12.70) [outward θ] or (−11.15, −11.30) [inward θ] | MED | motor local (0.70,−0.85) rotated |
| **Motor B (ERM) @ Port 4** PCB centre | (−12.0, +12.0) | HIGH | centroid→port |
| — motor envelope centre | (−12.85, +11.30) or (−11.15, +12.70) | MED | as above |
| **Encoder @ Port 3** PCB centre | (+12.0, +12.0) | HIGH | centroid→port |
| — **shaft axis XY (drives enclosure hole)** | **(+12.0, +12.0)** — rotation-independent | HIGH | shaft at module-local (0,0) = PCB centre = header centroid |
| — shaft Ø / tip height | Ø6.0, tip at board z ≈ +37.3 (28.2 above module PCB bottom) | MED/HIGH | shaft measured; +9.07 standoff |
| **LCD @ Port 2** PCB centre | **(+12.0, −15.5)** (only viable orientation) | HIGH | centroid→port + (−3.5,0) offset, θ=−90 |
| — glass/panel centre | (+11.98, −14.38) | HIGH | glass local (−1.12,−0.02) rotated |
| — 29 mm PCB axis direction | forced along board-Y; must point **outward (−Y, toward near board edge)** | HIGH | A5 |

### A5. LCD orientation — collision / overhang analysis (the enclosure-critical case)
The LCD's 29 mm PCB axis (30.6 mm incl. glass overhang) is **forced along board-Y** (never along X) because every socket presents its 5-hole line along Y. On Port 2 (U2, +12,−12) the two orientations are:

- **θ = +90° (29 mm points INWARD, toward board centre):** PCB centre (12, −8.5), PCB Y-span [−23.0, +6.0]. The +6.0 edge overlaps the **Encoder module on Port 3** (22×22 at (12,+12) spans Y [+1, +23]) by **≈5 mm → COLLISION.** Not viable.
- **θ = −90° (29 mm points OUTWARD, toward −Y board edge):** PCB centre (12, −15.5), PCB Y-span [−30.0, −1.0]; glass Y-span [−29.4, +0.6]. Inward edge (−1.0 PCB / +0.6 glass) clears the Encoder module (starts at +1.0) by 2.0 mm (PCB) / 0.4 mm (glass). **Outward it overhangs the 55 mm board −Y edge (−27.5) by 2.5 mm (PCB) / 1.9 mm (glass).** **Only viable orientation.**
- **Row (X, 22 mm) direction:** LCD X-span 22 mm at 24 mm port pitch → 2.0 mm clearance to any same-row neighbour, and 4.5 mm from the +X board edge. No issue.

**Enclosure impact:** the LCD window must be centred at board XY ≈ (12.0, −14.4) (glass centre), with the panel extending ~1.9 mm **past the board's −Y (bottom) edge**; the enclosure −Y wall must clear that overhang. The LCD cannot be rotated to keep its long axis inboard without hitting the encoder module.

### A6. Residual ambiguity (UNKNOWN-CONFIRMED)
- **Exact in-plane pin registration (±half-pitch / which socket columns engage):** not resolvable — the board/module footprint models are pin-incoherent (A3). Nominal placement uses header-centroid→port-centre. **Physical check:** dry-fit a module and measure the seated PCB-centre offset with calipers, or read the schematic footprints.
- **θ sign (which header end is pin-1) for ERM / Encoder / Button:** low geometric impact (features at/near module centre: encoder shaft and button cap are rotation-invariant; ERM motor shifts only ±(0.85, 0.70)). Electrical pin-1 polarity → schematic/photo. For the **LCD the θ sign IS resolved** (only θ=−90 outward is collision-free), independent of electrical pin-1.
- **Module Z standoff (9.07)** assumes the module PCB seats on the socket top; verify seated height on a physical stack if enclosure Z is tight. **→ SUPERSEDED by A7 Dispute 1 below: correct standoff is 10.05 mm.**

### A7. Adversarial-review corrections (round 2)

Three disputes were re-measured from the STEP geometry (OCP solid-classifier Z-footprint scans + planar/cylindrical face extraction). Verdicts:

#### Dispute 1 — Mated seating height → **AUDITOR CORRECT; file 14 corrected (+2.54 mm)**
Z-footprint scan of the module header solid (0.2 mm grid, solid classifier) shows three bands:
- z_local −8.545 → −2.545: **narrow (1.9 mm²) = the 5 pins** (Ø/post cross-section).
- z_local −2.545 → −0.005: **wide (32.4 mm² = 12.70 × 2.54) = the PLASTIC INSULATOR BLOCK.** Exact horizontal faces measured at z = −2.545 (bottom) and −0.005 (top) → **plastic-base thickness = 2.54 mm**, flush under the module PCB bottom (z_local 0).
- z_local −0.005 → +2.995: narrow = pin tails into/above the PCB.

So there **is** a 2.54 mm plastic insulator between the module PCB bottom face and the pins. The pins extend **6.00 mm below the plastic base** (−2.545 → −8.545). On mating, the **plastic-base bottom face (z_local −2.545) lands on the socket top face (board z +9.065)** — the plastic is the hard stop, not the PCB. Pin fit check: pins insert 6.00 mm into the 7.50 mm socket (pin tip reaches board z +3.07, socket contact stubs at z +1.6 to +1.8) → **pins do NOT bottom out** (1.5 mm clearance). Mechanism confirmed.

**Corrected seating transform:** `board_Z = module_local_Z + 11.61` (was +9.07).

| Corrected height | board Z (mm) | vs file-14 | Method |
|---|---|---|---|
| Module PCB bottom | +11.61 | +2.54 | plastic base −2.545 on socket top +9.065 |
| **Module standoff above board PCB top (+1.56)** | **10.05** (was 7.50) | +2.55 | 11.61 − 1.56 |
| Module PCB top | +13.12 | +2.54 | +1.51 local |
| ERM motor top | +16.81 | +2.54 | local 5.20 |
| LCD glass top | +14.74 | +2.54 | local 3.13 |
| **Encoder shaft tip** | **+39.81** (was 37.3) | +2.54 | local 28.195 |
| Button cap top | +18.56 | +2.54 | local 6.95 |

All module-mounted feature heights in file 14 shift **up by 2.54 mm.** Enclosure internal Z must grow accordingly (encoder shaft tip now ~39.8 mm above the board datum).

#### Dispute 2 — LCD mated centre → **AUDITOR INCORRECT; file-14 placement STANDS**
Re-measured the LCD header solid directly: plastic-block X-extent [−9.85, +2.75] → **header centroid X = −3.55 mm**; pins span x [−8.85, +1.75] (5 posts, 2.54 pitch, centred at −3.55); both rows at y = ±8.90. The LCD PCB is centred at (0,0) (PCB solid ctr = 0.00, 29×22). Therefore the **header centroid is genuinely offset −3.55 mm in X from the LCD PCB centre** — this is not a bbox artifact (the same scan shows ERM/encoder/button headers centred at x = 0.00).

Because the pins must seat in the port sockets, the mate is **header-centroid → port-centre**, which forces the **LCD PCB centre to port-centre + 3.5 mm** (rotated to +Y offset in board frame). File-14 values stand: **PCB centre (12, −15.5), glass centre (11.98, −14.38), ~2.5 mm PCB / ~1.9 mm glass overhang past the −Y board edge.** The auditor's module-centre→port-centre (PCB centre (12,−12)) **omits the −3.55 mm header offset** and would misplace the LCD (and its window) by 3.5 mm — it also mis-registers the pins to the sockets. Auditor missed the offset.

#### Dispute 3 — Onboard button actuation direction → **AUDITOR CORRECT; file 14 corrected**
Extracted all cylindrical faces of `skrpade010` (SW3) with axis directions. The only actuator-class feature is a **Ø2.20 cylinder with a vertical (+Z) axis at the switch body centre (x 25.76, y 0), top at z ≈ +4.00** (body top +4.10). There is **no plunger protruding toward +X**: the body is a clean 3.20 × 4.60 × 2.50 box whose +X face (x = 27.36) is flat and stops 0.14 mm short of the board edge (27.5); the only +X-axis cylinders are Ø0.22 SMD lead stubs at z ≈ 1.7 (solder legs, not an actuator). **Verdict: TOP-ACTUATED, plunger travel axis +Z, Ø2.2, at body centre, top ~2.4 mm above the PCB top face.**

**Correction to file 14:** SW1/SW2/SW3 are **top-actuated (+Z)**, NOT side-actuated. The enclosure needs **3 button openings in the OUTER (+Z / top) face** directly above (25.76, +17.01), (25.76, +0.01), (25.76, −16.99) — **not** in the +X side wall. (File-14 main table row "Onboard tactile switches … side-actuated" is corrected to top-actuated, +Z plunger.)
