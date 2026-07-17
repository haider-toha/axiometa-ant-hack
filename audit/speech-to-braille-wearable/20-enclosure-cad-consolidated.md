# 20 — Enclosure CAD Consolidated Report

**Date:** 2026-07-17
**Deliverable:** `cad/braille_wearable_enclosure.py` — paste-and-run Fusion 360 Python script (Utilities → Scripts and Add-Ins → Scripts → + → Run) producing a native parametric model: bodies `cage` + `skin_plate`, ~45 features, 37 named user parameters, every dimension mm→cm converted through one `_cm()` helper with a source-tagged inline comment.
**Pipeline:** Phase 1 (parallel STEP-geometry + doc/web tracks → files 14, 15) → orchestrator reconciliation (16) → context-clean adversarial dimension re-derivation + grill-me (17) → script generation (18) → context-clean adversarial script review + orchestrator fixes (19) → this report. Both adversarial phases ran with fresh sub-agents forbidden from reading prior phases' outputs.

---

## 1. Final dimension truth table (fit-critical set; full table in file 16 Rev 3)

Frame: origin = board centre; +X = USB/button edge; +Z = outer face; heights above board top face.

| Feature | Value (mm) | Conf |
|---|---|---|
| Board | 55.00 × 55.00 × 1.6; bay 57×57 (1.0 clearance/side) | HIGH |
| Board mounting holes | 4× **Ø3.40** (M3) at (±24.1, ±24.1) — corpus "Ø2.7" was the modules' figure | HIGH |
| Ports | centres (±12, ±12), pitch 24.0; silk P1(−12,−12) P2(+12,−12) P3(+12,+12) P4(−12,+12); each port = 2× 2×5 sockets, pitch 2.54, body 7.5 tall | HIGH |
| Mated module seating | header plastic base (2.54) on socket top → module PCB bottom **+10.05**, top **+11.56** | HIGH |
| Motors (diagonal Ports 1 & 3) | ERM 22×22 seats at (−12,−12) and (+12,+12); motor envelope top **+15.25**; separation 33.9 | HIGH |
| Encoder (Port 4) | shaft axis exactly (−12, +12), Ø6.0 D-shaft, tip **+38.25** (protrudes through a Ø16 roof bore) | HIGH |
| LCD (Port 2) | 29×22 PCB centred (+12, −15.5), long axis board-Y, glass window 13.5 × 27.9 centred (+11.98, −14.38), glass top +13.18; PCB overhangs board −Y edge 2.5 → wall relief x −0.3…+24.3, z 9.5…15 | HIGH |
| USB-C | +X edge, Y=0, receptacle 8.9 × 4.2 spanning z −3.29…+0.91 rel. PCB bottom, 1.41 proud of the edge; slot 12 × 7 + 1.5 funnel chamfer | HIGH |
| Onboard buttons | 3× ALPS SKRPADE010, **top-actuated**, Ø2.2 plungers at (25.76, +17/0/−17), tops +2.4 → stepped roof shelf + 3× Ø4 holes ≤3 deep | HIGH |
| Board underside | ESP32 −2.66, USB-C −3.29, JST-PH **−5.59** (deepest) → pocket 6.5 deep (0.91 margin) | HIGH |
| Lugs | 2 pairs on ±Y, internal gap 22.0, bore Ø2.6 at z −3, tips chamfered 1.5 | DESIGN (22 mm standard web-confirmed) |
| Cage / plate | 62 × 62 footprint, wall 2.5, roof 2.5 (inner face +16.25), skin plate 3.0 solid; total device thickness ≈ **29.9** (plate bottom −11.1 → roof +18.75) + shaft/knob protruding above | DESIGN on measured stack |

## 2. UNKNOWN-CONFIRMED — caliper these BEFORE printing

1. **ERM coin diameter + protrusion.** The STEP models a rectangular placeholder, not the coin. Datasheet-typical: Ø10 × 2.7 (LCSC C2759984 = LEADER LCM1027A2445F), but the module's stated electricals (90 mA/12 000 rpm) differ slightly from that SKU (80 mA/13 500) — possibly a sibling part. → Caliper the coin Ø and its protrusion above the module PCB (envelope says 3.69). Enclosure tolerance: motor sits under a 24.6 mm roof seat with 1.0 mm Z clearance — any Ø8–12 coin fits; only re-check if a local coin recess is ever added.
2. **Module X-registration ±1.27.** The STEP socket/header footprints are pin-level incoherent (0.16 mm grid mismatch), and pin-1 polarity is not in the geometry — a module could conceivably register one half-pitch off. → Dry-fit each module; confirm it centres on its port (match the silk pin labels). Pockets carry ≥1.3 mm clearance either way.
3. **Encoder knob OD.** No knob in the STEP; EC11 knobs vary. → Caliper the knob you fit; the roof bore is `encoder_bore` = Ø16 (parameter; enlarge if the knob is bigger).
4. **Board hole Ø3.4-vs-spec-2.7.** Geometry says Ø3.4 (M3) twice-independently; the corpus text said Ø2.7. → Drop an M3 screw through a physical board corner hole. If it does NOT pass, switch to M2.5 screws (bosses' Ø2.5 pilots still work; print unaffected).
5. **Seating assumption.** Stack heights assume the header plastic base bottoms on the socket shroud (measured geometry supports it). → With one module dry-fitted, caliper module-PCB-top height above the board (expect ≈11.6); if it rides higher, the roof has 1.0 mm clearance before any collision.

## 3. What adversarial review caught (why the phases were worth it)

- **Phase 2 (dimension round):** (a) mated seating was 2.54 mm too low in Phase 1 — every stack height corrected upward (header plastic base measured: 12.70×2.54 block, faces −2.545/−0.005); (b) onboard buttons are TOP-actuated, not side-actuated (geometry probe + ALPS/DigiKey datasheet) — moved button access from the +X wall to a stepped roof shelf; (c) Phase 1's LCD placement survived the challenge — the auditor had missed the LCD's −3.55 mm header-centroid offset (measured, vs 0.00 on all other modules). Also independently double-confirmed: Ø3.4 board holes, the silk map, and that **plan's "Ports 1 & 4 diagonal" assumption is false**.
- **Phase 4 (script round):** (a) the LCD wall relief was cut into the **+Y wall** — the `xZConstructionPlane` normal is −Y, so the offset landed opposite to the author's comment; rebuilt as a plane-free XY-sketch cut; (b) the relief was also glass-width when the full PCB width overhangs (upstream spec error in file 16, now Rev 3); (c) the lug chamfer constant was defined but never applied; (d) a lug bore (fit feature) hid inside the cosmetic-failure fallback. All fixed; zero unresolved FAILs (fix log in file 19).

## 4. ⚠️ Firmware flag (NOT an enclosure issue — surface to the builder)

The plan's LOCKED pin map instructs "motors on the two physically farthest-apart ports (diagonal corners) — confirm the diagonal by eye; default assumes Port 1 & Port 4." Two board photos + STEP refdes binding now prove **silk Ports 1 & 4 are ADJACENT** (same column, 24 mm); the diagonals are **{1,3} and {2,4}** (33.9 mm). The enclosure follows the locked diagonal *rule*: **Motor A Port 1 (GPIO4) · Motor B Port 3 (GPIO9) · LCD Port 2 (unchanged, 7/6/5) · encoder Port 4 (BT=GPIO1, CL=GPIO17, DT=GPIO18)**. `pins.h` in the firmware plan (Task B1) must swap Motor B and the encoder accordingly. Chosen because it keeps ERM on Port 1 (strapping-pin preference, audit 03 §7.5) and leaves the LCD SPI pins untouched.

## 5. Aesthetic decisions (all DESIGN-tagged, all parameters/constants)

Brutalist per the inspiration render (`renders/faithful-gray-gptimage.png` — used for style ONLY): 3.0 chamfers on the four vertical outer corners (no fillets anywhere); 2.0-wide raised chamfer-lipped step-rim around the outer face (1.0 step); two 1.0×0.5 panel grooves zoning the 2×2 module cluster; hex ring (22 across-flats, 2.0 deep) around the encoder bore; recessed 1.5-deep LCD bezel with a 1.0 chamfered window edge; 1.5 chamfered lug tips; 1.5 USB funnel chamfer. Known cosmetic quirks (accepted, documented in 19): the panel-groove cross clips the LCD bezel edge and the ERM seat/bezel recesses merge where they overlap — shallow same-face cuts, visually a deliberate-looking merge.

## 6. Print notes (Bambu Lab, PLA)

- **Orientation: cage roof-down** (outer face on the bed): the step-rim/grooves become top-quality bed faces… actually they face the bed — if their finish matters more than the cavity's, keep roof-down for dimensional accuracy of the module openings and self-supporting lug bores (bores print as vertical-wall holes in this orientation on the ±Y sides — Ø2.6 horizontal holes print fine at this size). The 45° chamfers are self-supporting in either orientation. Alternative: cavity-down needs support inside the bay — avoid.
- Walls ≥2.5, roof 2.5, plate 3.0 — all ≥ the 2 mm FDM floor; no unsupported span exceeds the 12 mm USB slot width (bridge-safe in PLA).
- The skin plate prints flat-side-down, trivially.
- Fits any Bambu bed (62 × 72 incl. lugs; 256 or 180 mini).
- Assembly: board (modules fitted) drops into the open wrist side onto the four standoffs; M3 self-tappers through the board into the Ø2.5 pilots from above, M3 through the plate counterbores from below into the same pilots — use short screws (≈M3×4 board / M3×5 plate) so the two don't meet mid-boss (shared-pilot note, file 18/19).
- Print ≥1 spare: the wear-test (plan C2) may still move timing/fit choices, and UNKNOWN §2 items could force a pocket tweak.

## 7. Residual risks

| # | Risk | Mitigation |
|---|---|---|
| 1 | Static-only validation — the script has not run in a live Fusion session (none available here). Chamfer edge-filters and boolean body-participation are the fragile spots; all are wrapped so cosmetic failures degrade to a "skipped" list instead of crashing | First run: check the messageBox skip-list; fit geometry is unguarded and will error loudly if wrong |
| 2 | User parameters are documentation, not drivers — editing them in Fusion's dialog does not move geometry (constants drive the sketches) | Edit the constants at the top of the .py and re-run (10 s); stated in the script header block and file 18 |
| 3 | STEP-vs-physical-board divergence would pass both reviews (both read the same STEPs) | §2 caliper checklist before printing |
| 4 | Encoder knob (~38 mm tip) makes the worn device tall; strap tension carries the flat plate | Accepted per audit 07 G4; knob protrudes by design |
| 5 | Haptic strength through the 29.9 mm rigid stack unquantified | Audit 07 G1 bench test (accelerometer on plate) after first print |

## 8. Verification criteria — status

1. ✅ Script exists, `py_compile` passes, imports only `adsk.core/fusion/cam` + `traceback`, mandatory header block present.
2. ✅ Single `_cm()` helper does every mm→cm conversion (`createByReal(mm/10.0)`); `_pt()` likewise /10; no other conversion sites (grep-verified, Phase 4 item 1 PASS).
3. ✅ Every dimension constant carries `HIGH/MED/DESIGN` + source (file 16 row / URL / §D) in the registry block.
4. ✅ File 17 exists; zero UNKNOWN-CONTESTED on fit-critical dims (all three disputes resolved with measured evidence).
5. ✅ File 19 exists; post-fix zero unresolved FAILs (fix log appended).
6. ✅ Files 14–20 all present in `audit/speech-to-braille-wearable/`.
7. ✅ §2 above lists every UNKNOWN-CONFIRMED with an explicit physical measurement instruction.
