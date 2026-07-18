# 33 — Exo-Cage Adversarial Review — "THE SKEPTIC" (Reviewer 2 of 2)

**Target:** `cad/braille_wearable_exocage.py` + `cad/tests/test_exocage_build.py`
**Date:** 2026-07-18
**Method:** requirements independently re-derived from PRIMARY records only
(files 16, 21, 23); built geometry re-derived from the constants + code and
**empirically probed** with the project's own offline build123d engine
(scratchpad harness, not the shipped tests). I did **not** read files 31 or 32.

**VERDICT: FAIL.** Both compile/pytest gates are green (96 passed), and every
LOCKED §A fit anchor in the main body is correct — but the generated `cage`
body is **14 disjoint solids**: 8 structural gussets and 5 post-corner splinters
are geometrically disconnected from the frame (CRITICAL). Separately, the corner
posts statically interfere with three of the four module PCBs (MAJOR). The test
suite is honest about coordinates but structurally **cannot see either defect**,
so the green suite is misleading. Fixes are localized (gusset rooting, post
inner face vs modules, screw-bore diameter/position).

---

## 1. Independent fit-requirement re-derivation (primary sources only)

Datum (file 16): origin = centre of 55×55 PCB; +X = USB/button edge; +Z =
component face; **board top = Z 0**; PCB bottom = −1.6.

| # | Requirement (re-derived) | Source |
|---|---|---|
| R1 | Board bay ≥ 55×55 + clearance; cage ≈ 62 | 16 §A r1, §A.5 |
| R2 | 4 screw anchors at (±24.1, ±24.1); **M2 self-tap** (pilot ≈1.8, head recess Ø4.0, plate clr Ø2.4) | 16 r3; 21 boss verdict; 23 Q1 |
| R3 | Module seats at P1(−12,−12) ERM, P3(+12,+12) ERM, P4(−12,+12) encoder, P2 LCD(+12,−15.5) | 16 r24-27 |
| R4 | 22×22 module PCBs; each **spans ±11 → corner reach 23 mm from datum** | 16 r13 |
| R5 | Stack tops above board: socket 7.5 / mod-PCB 11.56 / LCD glass 13.18 / motor 15.25 / enc tip 38.25 / plunger 2.4 | 16 §A.4 |
| R6 | LCD PCB 29(Y)×22(X) at (12,−15.5); **2.5 mm −Y overhang**; glass env 29.97; window 13.5(X)×27.9(Y) at (11.98,−14.38); relief x −0.3..24.3, z ≈10..15, out to y −30.5 | 16 r14/20/27, §C |
| R7 | USB receptacle +X, Y0, face **1.41 proud of board edge** → face at x 28.91; body z −4.89..−0.69; plug metal ~6.5 needs ~6.2 insertion → opening must clear the overmold, not just the metal | 16 r8, §C; 23 Q4 |
| R8 | −Z pocket ≥6.0 deep (JST −5.59 below PCB bottom → tip at z −7.19) | 16 r11, §A.5 |
| R9 | 3 top-actuated buttons at (25.76, ±17/0); plunger top +2.4; access from OUTER/open side | 16 r9, §C |
| R10 | ±1.27 mm module registration ambiguity in the row direction | 16 r28 |
| R11 | Lugs: 22.0 internal gap, Ø2.6 bore | 16 §A.5 |

### USB reach physics (R7) — computed
Outer wall face x 31; receptacle face x 28.91 → **2.09 mm of wall depth** in front
of the receptacle. A plug-metal-snug slot (ref shell's 8.6×3.5) would strand the
overmold and prevent latch. Requirement: the opening must be a clean through-cut
wide/tall enough for the overmold. **The script cuts a clean 12×7 through-slot
(x 21→33, fully penetrating the 2.5 wall)** — there is *no* web at all in front of
the receptacle, so reach is unrestricted. `USB_WEB = 2.1` is a **documentation-only
dead constant** (never used in geometry; its value happens to equal the wall depth
but nothing consumes it). **R7 satisfied.**

---

## 2. Requirement-vs-script table (built geometry re-derived + probed)

| Req | Script realisation | Probe evidence | Verdict |
|---|---|---|---|
| R1 | CAGE 62, CAVITY 57 (±28.5), BAY_CLEAR 1.0 | bbox X/Y ±31 | ✅ |
| R2 | bosses Ø7 at ±24.1, pilot Ø1.8, plate CB Ø4.0 / hole Ø2.4 | boss annulus SOLID, pilot AIR, plate CB/hole AIR | ✅ |
| R3 | posts/rim/turret placed to those centres | — | ✅ placement; ⚠️ see F2 |
| R4 | **not enforced** — MODULE_SQ unused in geometry; posts encroach to ±22 < 23 | (±22.5,±22.5,11) **SOLID** at P1/P3/P4 | ❌ **F2** |
| R5 | documentation constants only (open cage, no pockets) | turret base 12 vs enc PCB 11.56 = 0.44 gap | ✅ (tight) |
| R6 | window "by absence" + relief step 14 (x_w=LCD_PCB_H=22 +2.6=24.6) | LCD open-sky AIR; relief void AIR; +X/−Y post corner notched AIR | ✅ geometry (⚠️ naming F5) |
| R7 | clean 12×7 through-slot; H7 > body 4.2; roof lintel z0.71..2.0 | slot interior AIR across full wall; lintel SOLID | ✅ |
| R8 | pocket floor −8.1; JST tip −7.19 → **0.91 clear** | (19.2,15.8,−7.0) AIR | ✅ |
| R9 | +X frame open above +2; buttons bare, top-accessible | button trench AIR | ✅ |
| R10 | no pockets; but ±1.27 **worsens** F2 (motor body 0.05 nominal clear → −1.2) | derived | ⚠️ compounds F2 |
| R11 | LUG_GAP 22, bore Ø2.6, +Y window x±9 clears x±14 lugs | lug-bore AIR | ✅ |

Main-body (`lump 0`) fit envelope is **entirely correct**. The failures are in the
added roll-cage structure and post placement.

---

## 3. Openness-hazard findings (what the closed walls used to guarantee)

- **Module insertion / seating — BLOCKED at 3 of 4 (F2, MAJOR).** Post inner faces
  sit at ±22 (`POST_INNER = CAGE_HALF − POST_SQ = 22`), but a 22×22 module at ±12
  reaches its corner at **23** — a **1.0 mm static overlap** at each corner where
  both |x|>22 and |y|>22. Empirically SOLID at (±22.5,±22.5,10.5–13.0) for **P1,
  P3 (both ERM motors) and P4 (encoder)**. Only **P2 (LCD)** is clear, because
  step-14's relief happens to notch that one post corner. The code comment
  `POST_INNER … clears modules` is **false**. The module PCB corner cannot occupy
  its designed seat; assembly requires filing the post corners or clipping PCB
  corners. The ERM body's nearest post approach is only **0.05 mm** nominal, going
  **−1.2 mm (interference)** under the measured ±1.27 registration shift (R10).
- **Board insertion sweep (MINOR).** From the open (skin) side the 55×55 board
  (corner 27.5) must pass the corner pads (x/y 19.5..28.5, z −8.1..−5.6): **1.0 mm
  corner snag** at 4 corners — probed SOLID at (27.5,27.5,−6.5). Marginal (PLA pads
  flex), but real. From the +Z side the board cannot enter at all (posts leave only
  44 mm between inner faces vs a 55 mm board) — so bottom insertion is the only path.
- **Encoder knob swing — OK.** Ø13 knob (file 21) in Ø16 turret bore = 1.5 mm radial
  clearance, concentric on the shaft axis; bore interior AIR z 11.6–17; bridges lie
  outside Ø16. No collision.
- **LCD viewing cone — OK.** Glass footprint x 5.2..18.7, y −28.3..−0.4 has open sky
  above; nearest post (26.5,−26.5) starts at x 22 > 18.7; no member shadows it.
- **Button reach — OK/IMPROVED.** Plunger top +2.4 is proud of the +2 base ring and
  fully open above (no roof, +X open) → direct fingertip access from top/+X, no tool
  needed. The closed design's "13 mm deep hole" problem is dissolved by the openness.

---

## 4. CRITICAL — the `cage` is 14 disjoint solids (F1)

Enumerating the built `cage` body's lumps (scratchpad probe, project engine):

```
cage lump count: 14   total 17646 mm^3
 lump 0  vol 17125.2  X -31..31  Y -36..36  Z -11.1..17.5   <- the real frame
 lumps 1-8  vol 61.2 each   <- the 8 GUSSETS, each disconnected
 lumps 9-13 vol 0.9..8.7    <- 5 POST INNER-CORNER SPLINTERS, disconnected
```

**Cause A — gussets touch nothing (line contact).** `_add_corner_gussets` places a
right-triangle at each post *inner* corner (right angle at ±22,±22; legs 7 mm
*inward* to ±15). The post occupies x/y ∈ [22,31]; the gusset occupies x/y ∈
[15,22]. They share **only the vertical line x=22,y=22** — no face, no volume. The
gusset reaches no wall or rim either. Result: 8 floating triangular prisms that (a)
provide **zero structural tie** (contradicting the header's "8 gussets close the top
… backing the frame corners" load-path claim) and (b) print as mid-air islands.

**Cause B — the screw bore slices off each post corner.** `SCREW_ACCESS_DIA/2 =
2.25` at (±24.1,±24.1) reaches inward to **21.85 < 22**, so the Ø4.5 bore breaches
*both* inner faces of every post and isolates the corner sliver beyond it (lumps
9–13: ~0.6 mm² × up to 14.5 mm tall needles; the +X/−Y one split in two by the
relief). Those splinters are disconnected, unprintable, and the bore is effectively
an inner-open slot rather than an enclosed hole.

**Consequence:** the STEP/STL deliverable contains 13 loose fragments (521 mm³, 3 %
of volume) with nothing joining them to the part. A slicer starts them in mid-air →
detachment/print failure; the "gusset" stiffening does not exist. In real Fusion the
gusset extrude-Joins union to a non-manifold edge at best.

**Why the suite misses it:** the fake `JOIN` targets by *bounding-box touch* and
fuses via build123d, which silently yields a disconnected compound; `body_names`
still returns one `"cage"`, `is_solid` still probes true inside each lump, and the
volume-invariance test sums all lumps. **No test asserts single-lump connectivity.**

---

## 5. Test-suite honesty verdict

**Probes themselves are honest** — I re-checked every coordinate/expectation against
my independent derivation and they match the geometry the script builds. The three
relocated monolith probes are **legitimately** moved (documented, tied to real design
choices, not papering a violation):
- `roof above USB slot` +3.0→+1.0 — +3.0 is now intentional open air (+X bare); +1.0
  still verifies the §A slot roof (base ring solid over the receptacle). ✅
- `+X wall` (30,0,+5)→(30,16,−5) — +X above +2 is intentionally open, and y0 below
  +0.7 is the USB slot itself; the relocated point still confirms the base-ring wall
  exists clear of the slot. ✅
- base-ring +X probe uses y=16 to avoid the slot at y=0. ✅

**But coverage is inadequate for the two real defects.** The harness structurally
cannot detect F1 (connectivity — see §4) and F2 (module interference — modules are
not modelled, so nothing probes the post-vs-PCB overlap). Additional honest gaps:
- "LCD open sky (window by absence)" is verified at **one centre point only**; the
  13.5×27.9 window corners are never probed (geometry is in fact clear — I checked —
  but the test would not catch a corner intrusion).
- Chamfers are *recorded-not-applied*; the `bbox` test explicitly relies on this, so
  **chamfer geometric validity is entirely untested** (see F4).

### Mutation check (on scratchpad copies; real files untouched)
Re-ran the suite's own `FIT_PROBES` + registry invariants against two mutated copies:

| Mutation | Caught by | Result |
|---|---|---|
| `BOSS_DIA` 7.0→4.0 | geometry probe `boss annulus` (SOLID→AIR) | ✅ caught |
| `USB_SLOT_H` 7.0→4.0 | **only** registry invariant (`==7.0`); **no** geometry probe flips | ✅ caught (literal-pin only) |

The suite catches fit-constant flips, but note the USB slot-height geometry is only
guarded by a literal pin, not by any material probe (all slot probes have margin).

### Checksum proof (files byte-identical before/after all mutation work)
```
BEFORE  9e85667cea77a375bf909ac70a2a9be5083de0231fb5c47712576006a9e692c5  cad/braille_wearable_exocage.py
BEFORE  66165a5755eb12befc5f875ef2ea891d66a6b19bdd58c1f4aa38a9a466ba3ab8  cad/tests/test_exocage_build.py
AFTER   9e85667cea77a375bf909ac70a2a9be5083de0231fb5c47712576006a9e692c5  cad/braille_wearable_exocage.py
AFTER   66165a5755eb12befc5f875ef2ea891d66a6b19bdd58c1f4aa38a9a466ba3ab8  cad/tests/test_exocage_build.py
```

---

## 6. Fusion runtime risk table

| Risk | Assessment |
|---|---|
| Non-XY sketches use modelToSketchSpace + symmetric extent | ✅ USB slot, lug bores, −X window all do; +Y/−Y/+X openings use XY-plane Z-extrudes (orientation-proof). Passes all 3 conventions. |
| Profile-index `count−1` after multi-profile sketches | ✅ every sketch here is a single closed loop → one profile. Low risk. |
| JOIN fails to touch existing material | ❌ **gussets touch only at a line → F1**; posts/rim/turret-bridges/hex all overlap volumetrically (OK). |
| Screw bore isolates post corner | ❌ **F1 cause B** (breaches inner face by 0.15 mm). |
| Chamfer over-consumption | ⚠️ **F4**: USB funnel 1.5 mm on the slot top edge vs a **1.29 mm** lintel (z 0.71→2.0) — over-consumes into the open +X region; cosmetic + try/except, so offline it is recorded-not-applied and never exercised. |
| Hex-vertex math | ✅ r = AF/2/0.8660254; across-flats = 21.0; vertices consistent. |

---

## 7. Print-physics audit (skin-down, +Z up)

- **Disconnected fragments (F1):** 8 gusset islands + 5 post splinters start in
  mid-air → detachment/failure. Dominates the print verdict.
- **Bridges >12 mm:** +Y window **18 mm** flat lintel (header admits it); −X window
  12 mm (at the limit); USB roof lintel 12 mm × only 1.29 mm tall; **turret bridges
  ~12.5 mm long × 1.0 mm thick** (z 12→13) unsupported underside — sag-prone and the
  sole turret tie.
- **Ø4.5 post bore vs post integrity:** offset bore (centre 24.1 in a 22–31 post)
  leaves a thin C-section (0.15 mm inner web) + the isolated splinter — the
  load-bearing posts are the weakest-printed members.
- **Post→base-ring junction:** posts weld to the ring at a horizontal layer plane
  (z +2); a strapped-wrist bending moment loads that interface in interlayer tension
  — the intrinsically weak PLA direction, aggravated by the reduced bored section and
  the deliberately open −Y corner. Qualitative, but the cage's stiffness story leans
  on gussets that (per F1) are not attached.

---

## 8. Findings table

| ID | Sev | Claim | Evidence | Verdict |
|---|---|---|---|---|
| F1 | **CRITICAL** | "roll cage … 8 gussets + turret bridges close the top … single load-bearing frame" | `cage` = **14 disjoint solids**: 8 gusset prisms (line-contact only) + 5 post-corner splinters (Ø4.5 bore breaches ±22 face at 21.85). Empirical lump dump. | Broken: floating fragments, non-functional gussets, unprintable splinters, non-manifold in Fusion. |
| F2 | **MAJOR** | `POST_INNER … clears modules` | Post inner face 22 < module corner reach 23 → 1.0 mm static overlap; SOLID at (±22.5,±22.5,11) for P1/P3/P4; ERM body 0.05 mm nominal, −1.2 mm under ±1.27 registration. | Blocks seating of both motors + encoder without rework. |
| F3 | MINOR | board drops onto bosses cleanly | Corner pads (19.5..28.5, z −8.1..−5.6) snag the 55×55 board corner by 1.0 mm on bottom insertion (SOLID at 27.5,27.5,−6.5). | Marginal; ease pad corners. |
| F4 | MINOR | "all cosmetic chamfers created" | USB funnel 1.5 > 1.29 mm lintel → real-Fusion over-consumption; chamfers are recorded-not-applied so never geometrically tested. | Cosmetic; would silently skip/err in Fusion. |
| F5 | NOTE | `LCD_PCB_W = 29 # X extent`, `LCD_PCB_H = 22 # Y extent` | Axes swapped vs 16 r14 (29 is board-Y). `LCD_PCB_W` is **dead**; `LCD_PCB_H`(=22) is used as the relief X-width — correct value, wrong label. | Misleading comments; no geometry impact. |
| F6 | NOTE | dimension registry | `USB_WEB`(2.1) and the entire stack-height set (`MOTOR_TOP`, `LCD_GLASS_TOP`, `ENC_TIP`, `MODULE_SQ`, …) are defined but **unused** in geometry — documentation only. | No live cross-check between module envelopes and cage clearances (root cause of F2). |
| F7 | NOTE | suite covers the fit set | Harness cannot see connectivity (F1) or module interference (F2); "window by absence" probed at 1 point; USB_SLOT_H guarded only by a literal pin. | Green suite ≠ manifold, assemblable part. |

MINOR: 2 (F3, F4). NOTE: 3 (F5, F6, F7).

---

## 9. Gate outputs

- `python3 -m py_compile cad/braille_wearable_exocage.py` → **PY_COMPILE_OK**.
- `.venv/bin/python -m pytest cad/tests -q` → **96 passed in ~60 s**.
- Both gates pass; per §4–§5 the pass does not exercise F1/F2.

## 10. Overall verdict — **FAIL**

The dimensional fit foundation the user is anxious about is actually **sound**: bay,
M2 bosses, plate, −Z pocket (0.91 mm JST clearance), USB reach, LCD window+relief,
encoder bore, and lugs all verify correctly in the main body. The design fails on
**structure**, not core dimensions:

1. **F1 (CRITICAL):** the generated body is 14 disconnected pieces — floating
   gussets and unprintable post-corner splinters; the roll-cage stiffening it
   advertises is not physically attached.
2. **F2 (MAJOR):** the corner posts overlap the two ERM and the encoder PCBs by
   1 mm, blocking their seating (worse under measured registration).

Both are localized and fixable — root the gussets *into* the posts and out to a
wall/rim (volumetric overlap), pull `POST_INNER` back to ≥23.3 (or relieve the three
post corners like the LCD), and shrink/re-centre the Ø4.5 screw bore so it stays
inside the ±22 face — and both should be covered by new tests (single-lump
connectivity assertion; a modelled-module keep-out probe). Until then the cage is
not printable-and-assemblable as drawn.

---

# Re-verification (post file-34 fix pass) — 2026-07-18

Re-ran my own harness (lump enumeration + probes) against the rebuilt
`cad/braille_wearable_exocage.py`, re-checked the hardened test suite, re-ran both
my original mutation cases, and sanity-checked the orchestrator encoder change. I
made **no edits to any repo file** during re-verification (all writes were to the
scratchpad).

## Per-finding verdicts

| ID | Sev | Verdict | Evidence |
|---|---|---|---|
| F1 | CRITICAL | **RESOLVED** | Rebuilt cage enumerates to **1 lump** (was 14); skin_plate 1 lump. Floating gussets → 4 top corner plates each volumetrically overlapping its post (all points \|x\|+\|y\|≥54.5 ⊃ post hyp 47.5); Ø4.5 post screw-bores deleted (screws drive from wrist side) so no post-corner splinters. Suite adds `test_cage_and_plate_single_lump` (`len(solids())==1`) — a direct structural assert that closes this class permanently. |
| F2 | MAJOR | **RESOLVED** | Pentagon posts (9×9 minus a 3.5-leg 45° inner-corner cut). All four module corners AIR at (±22.5,±22.5,10.5–15); the exact corner (23,23) AIR; **registration-worst corners (24.27,23) and (23,24.27) all AIR** (0.2 mm margin: post hyp 47.5 vs L-region 47.3). Posts remain SOLID outboard (26,26). Suite adds 12 lateral L-keepout probes + 4 post-retained probes. |
| F3 | MINOR | **RESOLVED** (as MINOR) | Header BOARD-INSERTION note added (E6): tilt-insert to clear the 1 mm corner-pad snag. Comment-only, adequate for a documented MINOR. |
| F4 | MINOR | **RESOLVED** | `USB_FUNNEL` 1.5→**1.0** < the 1.29 mm lintel → no over-consumption; lintel probes SOLID. (Trivial residue: `_chamfer_usb_funnel` docstring still says "1.5"; value is correct.) |
| F5 | NOTE | **RESOLVED** | `LCD_PCB_W`/`LCD_PCB_H` comments corrected (29 = board-Y after mate, 22 = board-X → relief width); false "clears modules" and "gussets close the top" claims removed; load-path note rewritten. (`LCD_PCB_W` still unused but now correctly labelled — cosmetic.) |
| F6 | NOTE | **PARTIALLY RESOLVED** (acceptable) | The real gap — no *coverage* of module lateral clearance — is closed by the T2 L-keepout probes and the `POST_CUT` registry relation. Residual is cosmetic only: `POST_CUT` is a hard-coded 3.5 (not derived from `MODULE_SQ`), and `MOTOR_TOP`/`ENC_TIP`/`USB_WEB`/… remain unused documentation constants. |
| F7 | NOTE | **RESOLVED** | T1 single-lump assert catches the F1 class; T2 lateral + encoder-band probes catch the F2 / re-introduced-collar classes; T3 slot-height probes make a `USB_SLOT_H` regression flip a **geometry** probe. Confirmed: my two original mutations are now both caught by geometry probes — `BOSS_DIA 7→4` → `boss annulus`; `USB_SLOT_H 7→4` → `USB slot-height air (top/bottom)` (previously only the registry pin caught it). |

**REGRESSED: none.**

## Orchestrator encoder change — sanity vs measured can (r13.51 base, r9.32 to +18.05)

**SOUND.** Exocage: the hex turret + Ø16 bore + rim bridges are deleted, encoder
fully bare — the only robust answer, since no sub-+18.6 collar can enclose the
r13.51 can base. I re-derived the can envelope (base slice 19.7×18.4 → ±9.85 X /
±9.2 Y half-extents, r13.51 at the corner) against every remaining member: nearest
approaches are the −X rim (2.65 mm clear) and +Y rim (3.3 mm clear); posts (cut
back) and corner plates clear. Encoder-band probes confirm AIR within r9.9 at
z 13/15/17. Monolith `ENCODER_BORE` 16→20 / `TURRET_AF` 24 / `HEXRING_AF` 28: I
probed the monolith directly — the r13.51 can **base** (z +12..+14.1) sits in the
**open module cavity below the deck inner face (16.25)**, so it is not enclosed by
any bore there (all probes within r13.5 at z13 = AIR); the Ø20 bore only meets the
can where it has narrowed to r9.32 (z ≥ 16.25), clearing r10 vs r9.32. No collision,
no regression. (The M1 log's "clears +0.68" reasoning omits the can taper but lands
correct because the base is below the deck.)

## Gates (re-run)

- `python3 -m py_compile cad/braille_wearable_exocage.py` → **OK**
- `python3 -m py_compile cad/braille_wearable_enclosure.py` → **OK**
- `.venv/bin/python -m pytest cad/tests -q` → **128 passed** (52 enclosure + 76 exocage).

## Checksums (files legitimately changed by the fix pass; my re-verify wrote nothing to the repo)
```
a4a43f6df66b400439d2fa70100102272d4fad44293269d676ce1b3114ba95be  cad/braille_wearable_exocage.py
5194059ed6a736aa9cbfa96d3335aae552b546d6fbb870cf98572f79991732d3  cad/braille_wearable_enclosure.py
bf4d68544e463d9a9f99125aa83cf8203d981a375f95818dee0f044a2b3da104  cad/tests/test_exocage_build.py
```

## Final re-verification verdict: **PASS**

All CRITICAL/MAJOR findings resolved with independent geometric proof; the two NOTE
items are resolved or acceptably mitigated; no regressions; the encoder redesign is
sound against the primary can measurement. The green suite now genuinely exercises
the two defect classes I raised (connectivity + module lateral clearance).
