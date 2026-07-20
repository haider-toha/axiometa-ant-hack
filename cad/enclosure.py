# =============================================================================
# TACTA WEARABLE ENCLOSURE — Fusion 360 Python Script
# =============================================================================
# Wrist-worn situational-awareness wearable for the Axiometa "Genesis Mini" host
# board (55 x 55 mm) carrying, on the four AX22 ports:
#   P1 (-12,-12)  passive buzzer A   AX22-0018
#   P2 (+12,-12)  VL53L0CX ToF       AX22-0015
#   P3 (+12,+12)  passive buzzer B   AX22-0018
#   P4 (-12,+12)  analog electret mic AX22-0009   <-- GOVERNS THE DECK HEIGHT
#
# HOW TO RUN (paste-and-run, same as braille_wearable_enclosure.py):
#   1. Fusion 360 -> UTILITIES tab -> ADD-INS -> "Scripts and Add-Ins"
#   2. Scripts tab -> the green "+" -> "Create" (or point it at this .py file)
#   3. Select "enclosure" -> "Run"
#   You must have an active *Design* document open (not a drawing / CAM).
#   Any Design document works: in a *Part* document the enclosure builds
#   directly into the root component (Part documents allow only ONE component);
#   in an *Assembly* document it becomes its own child component named
#   "TactaEnclosure".  The script produces TWO bodies (cage + skin_plate) --
#   always fine, since the single-component limit restricts COMPONENTS, not
#   BODIES.  (audit/speech-to-braille-wearable/26 §Runtime error #1.)
#
# CRITICAL: the Fusion 360 API's internal length unit is CENTIMETRES.  Every
# dimension below is authored in MILLIMETRES and passes through exactly ONE
# chokepoint -- the _cm() helper -- which divides by 10.0.  An unconverted
# script builds a part 10x too large.
#   (audit/speech-to-braille-wearable/08 §2 + Residual risk R2.)
#
# AESTHETIC / FORM: a CLOSED MONOLITH.  Unlike braille_wearable_enclosure.py
# (its "monolith with reveals" sibling) this shell has NO reveals, NO wells, NO
# louvres, NO turret, NO side window and NO LCD relief.  The deck is a solid
# slab pierced ONLY by functional apertures: one ToF eye, two mic ports, two
# trimpot access holes, two buzzer grilles and one button-access slot.  Every
# OPENING exists because a transducer or a finger needs it.
#   ONE EXCEPTION, named honestly: the raised "TACTA" braille on the -X wall is
#   BRANDING.  It is the only decorative feature in the build, it pierces
#   nothing, and it is NOT an accessibility feature -- see _emboss_braille().
#
# BODY SPLIT (from cad/v1_22mm.step, the hand-built reference):
#   cage        shell + lugs + strap bars + braille        z -11.100 .. +20.075
#   skin_plate  plate + corner gussets + M2 standoffs      z -11.100 ..  -1.600
# The M2 standoffs belong to the PLATE, not the cage, so the base carries the
# board and the cage drops over the pair.  v1_22mm.step's two solids are named
# 'Body' and 'Base' and its Base stops at -1.600 = Z_BOARD_BOT, which is what
# fixes the split.  Our skin_plate reproduces that Base to 0.0000 mm^3 residual
# once the deliberate Ø2.0-pilot-vs-Ø2.4-through-bore difference is accounted
# for (10972.444 vs 10936.504 mm^3, delta 35.940 = 4 x pi/4 x (2.4^2-2.0^2) x 6.5).
#
# COORDINATE DATUM:
#   origin = geometric centre of the 55 x 55 host PCB.
#   BOARD TOP FACE = model Z 0.  +X = USB-C / button edge.
#   +Z = component / "outer" face.  -Z = wrist / skin side.
#
# SOURCE TAGS on every dimension (this file's audit trail):
#   T1:audit/01:<what>       measured in audit/situational-awareness/
#                            01-track-1-physical-cad-ground-truth.md
#   P1:audit/07:§<n>         measured/derived in audit/situational-
#                            awareness/07-phase-1-dims-and-aperture-research.md
#   ASSUMED-AX22-STANDARD    the AX22 module family standard (audit/01, 10 STEPs)
#   DESIGN                   an engineering choice made here or carried forward
#
# DIMENSION-LITERAL RULE (acceptance criterion): every DIMENSION -- length,
# position, diameter, depth, count -- is a named module-level constant with a
# source citation.  The only bare numbers permitted inside geometry calls are
# the structural factors 2.0 (halving a size / doubling a half-extent) and 10.0
# (mm -> cm, confined to _cm() and _pt()).
# =============================================================================

try:
    import adsk.core
    import adsk.fusion
    import adsk.cam
    import traceback
except ImportError:  # ---- HEADLESS ONLY.  Inside Fusion this is dead code. ----
    # cad/tests/fake_adsk is a real build123d geometry engine behind a fake adsk
    # API (cad/tests/README.md).  Aliasing it lets this exact file be executed by
    # a plain interpreter for fit verification.  Never taken in Fusion.
    import os as _os, sys as _sys, traceback
    _sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "tests"))
    import fake_adsk as _fake
    _sys.modules.update({"adsk": _fake, "adsk.core": _fake.core,
                         "adsk.fusion": _fake.fusion, "adsk.cam": _fake.cam})
    import adsk.core
    import adsk.fusion
    import adsk.cam


# -----------------------------------------------------------------------------
# THE mm->cm CHOKEPOINT.  This is the ONLY place createByReal() is called for
# geometry, and it ALWAYS divides mm by 10.0.  Drive every dimension through it.
# -----------------------------------------------------------------------------
def _cm(mm_value):
    # Fusion internal length unit is cm -> divide mm by 10.0.  (help.autodesk.com
    # Units_UM.htm / ValueInput_createByReal.htm; audit/08 §2 + R2.)
    return adsk.core.ValueInput.createByReal(mm_value / 10.0)


# =============================================================================
# DIMENSION REGISTRY
# Every literal that enters geometry lives here, once, with a source tag.
# =============================================================================

# --- Host board, measured (audit/01) ----------------------------------------
BOARD_BAY        = 55.0    # PCB footprint 55.000 x 55.000        T1:audit/01:PCB footprint
BOARD_THICK      = 1.6     # PCB nominal thickness AS CODED.      T1:audit/01:PCB thickness
                           #   audit/01 MEASURES 1.510 and flags the coded 1.6 as
                           #   "0.09 mm optimistic"; kept at 1.6 because every -Z
                           #   clearance below is then conservative (the pocket is
                           #   0.09 mm deeper in reality than the map says).
BOARD_HOLE_X     = 24.1    # 4 x Ø3.400 holes at (±24.100,±24.100) T1:audit/01:mounting holes
BOARD_HOLE_DIA   = 3.4     # measured board hole Ø (M2 slips loose) T1:audit/01:mounting holes
PORT_CTR         = 12.0    # AX22 port centres (±12.000,±12.000), pitch 24.000  T1:audit/01:port centres
MODULE_SQ        = 22.0    # AX22 module PCB square 22.000         ASSUMED-AX22-STANDARD
                           #   (audit/01: 9 of 10 STEPs; P1:audit/07:§4.1/§4.2
                           #   re-measures 22.000 on BOTH new modules)
BTN_X            = 25.76   # 3-button column X = 25.760            T1:audit/01:onboard buttons
BTN_Y            = 17.0    # buttons at y +17.008 / +0.008 / -16.992  T1:audit/01:onboard buttons
BTN_BODY_Y       = 4.6     # skrpade010 body 3.200 x 4.600 x 2.500 T1:audit/01:onboard buttons
BTN_BODY_X       = 3.2     # ditto, X extent                       T1:audit/01:onboard buttons
BTN_PLUNGER_TOP  = 2.4     # plunger top above board top (body top +2.585)  T1:audit/01:button top
NEG_Z_DEEP       = 5.59    # JST S2B-PH-SM4-TB hangs -5.585 below PCB bottom  T1:audit/01:deepest underside
USB_REC_ZLO      = -3.295  # USB-C receptacle low z rel. PCB bottom  T1:audit/01:USB-C receptacle
USB_REC_ZHI      = 0.915   # USB-C receptacle high z rel. PCB bottom T1:audit/01:USB-C receptacle
BOARD_PLAY       = 0.7     # board XY float = (BOARD_HOLE_DIA - BOSS_PILOT)/2   derived from T1:audit/01
                           #   Ø3.400 board hole over a Ø2.000 pilot/M2 shank.

# --- Port assignment (P1:audit/07:§5.0 master table) ------------------------
PORT_BUZZ_A_X    = -PORT_CTR   # P1 buzzer A                       P1:audit/07:§5.0
PORT_BUZZ_A_Y    = -PORT_CTR
PORT_TOF_X       = PORT_CTR    # P2 VL53L0CX ToF                   P1:audit/07:§5.0
PORT_TOF_Y       = -PORT_CTR
PORT_BUZZ_B_X    = PORT_CTR    # P3 buzzer B                       P1:audit/07:§5.0
PORT_BUZZ_B_Y    = PORT_CTR
PORT_MIC_X       = -PORT_CTR   # P4 analog electret microphone     P1:audit/07:§5.0
PORT_MIC_Y       = PORT_CTR

# --- Module heights above board top (P1:audit/07:§4.5) ----------------------
# THE Z CHAIN IS PHASE-1 CORRECTED.  audit/01's chain hung off an ERM motor
# (MOTOR_TOP +15.25) that is OUT OF THE BOM; the AX22-0009 microphone's
# top-adjust trimpot is 1.325 mm taller and now governs.  Using audit/01's
# +16.25 / +18.75 deck would drive a 0.325 mm HARD INTERFERENCE into the
# trimpot body.  (P1:audit/07:§2 "audit/01's Z chain is dead", §4.5.)
MIC_TRIMPOT_TOP  = 16.575  # 3362P trimpot body top = module PCB top 11.610
                           #   + 4.965 -- THE GOVERNING MODULE HEIGHT  P1:audit/07:§4.5
                           #   (buzzer top +14.695, ToF JST +14.660, mic
                           #   electret can top +14.195 all sit below it)
MIC_CAPSULE_OFFSET = 5.850 # CMC-6022-42P electret capsule centre is (+5.850,
                           #   +0.012) from the module centre -- badly off-centre,
                           #   and module insertion is 180°-ambiguous.  P1:audit/07:§4.1
MIC_TRIMPOT_OFFSET = 7.020 # 3362P adjustment-screw axis at module-local
                           #   (-7.022, -0.005)                    P1:audit/07:§4.1/§5.2

# --- Design choices ---------------------------------------------------------
BAY_CLEAR        = 1.0     # board bay clearance per side          DESIGN (audit/01 §D 0.5-1.0)
WALL             = 2.5     # cage wall thickness                   DESIGN (>=2.5 for FDM)
PLATE_T          = 3.0     # skin plate thickness                  DESIGN (>=3.0 solid)
NEG_Z_POCKET     = 6.5     # -Z clearance pocket depth             DESIGN
                           #   0.915 mm margin over the measured JST at -5.585.
                           #   P1:audit/07:§6.2 notes the reference shell only
                           #   gives 5.150 mm here and may foul that connector --
                           #   evidence FOR keeping 6.5, not against.
ROOF_CLEAR       = 1.0     # deck-inner clearance over the trimpot P1:audit/07:§4.5/§6.3
                           #   Corroborated by real printed hardware: the reference
                           #   shell runs 0.9-1.6 mm over a mated MLT-8530.
                           #   ALSO the tightest clearance in this build (§8 risk 12).
ROOF_THICK       = 2.5     # deck thickness                        DESIGN (>=2.5)

# --- Strap / lugs -----------------------------------------------------------
STRAP_W          = 20.0    # internal lug gap = strap width        DESIGN
                           #   plan/2026-07-18-situational-awareness.md:
                           #   "20 mm strap + Ø2.5 pins | REUSE / IN-HAND |
                           #    Drives LUG_GAP = 20.0, not 22.0".  The braille
                           #   sibling used 22.0 (NATO standard); this build uses
                           #   the strap actually in hand.
LUG_BORE         = 2.6     # lug bore Ø (printed Ø2.5 pin, or Ø1.78 spring bar)  DESIGN
LUG_W            = 6.0     # lug block X width                     DESIGN
LUG_PROJ         = 5.0     # lug projection past the outer wall    DESIGN
LUG_H            = 8.0     # lug block Z height                    DESIGN
LUG_BORE_Z       = -3.0    # lug bore centre Z (low, above the plate)  DESIGN
LUG_BORE_OVERSHOOT = 2.0   # symmetric bore full length = LUG_W + this  DESIGN
                           #   -> pierces the LUG_W block from BOTH ends.

# --- Strap bar (MEASURED off cad/v1_22mm.step) ------------------------------
# The v1 reference carries an integral bar spanning lug-to-lug near the tip, so
# the strap can be threaded and looped WITHOUT a separate spring bar; the Ø2.6
# lug bores stay as the alternative hardware route.  Measured in v1_22mm.step:
#   bar X   -17.000 .. +17.000  (full outer width of both lug blocks)
#   bar Y    33.982 ..  35.409  (thickness 1.427; inner face 2.982 clear of the
#                                62 mm cage wall at y = 31)
#   bar Z    -3.546 ..  -2.162  (height 1.383, centred -2.854 -- essentially on
#                                the LUG_BORE_Z = -3.0 bore axis)
#   cross-section is RECTANGULAR: all four bounding faces are planes, and the
#   body carries no cylindrical face other than the four Ø2.6 lug bores.
# The v1 file is laid out for a 22 mm strap (lug centres ±14, 22.0 clear).  This
# build stays on the plan's 20 mm strap, so the bar is re-derived from STRAP_W
# rather than copied at ±17.
STRAP_SLOT       = 3.0     # clear gap, cage outer wall -> bar inner face  T1:v1_22mm (2.982)
STRAP_BAR_T      = 1.5     # bar thickness in Y                    T1:v1_22mm (1.427, rounded up)
STRAP_BAR_H      = 1.5     # bar height in Z                       T1:v1_22mm (1.383, rounded up)
                           #   ⚠ THIN.  A 1.5 x 1.5 mm PLA bar spanning STRAP_W
                           #   unsupported is the weakest feature in the build and
                           #   the most likely thing to snap if the strap is yanked.
                           #   Kept at the v1 figure deliberately; raise both to
                           #   ~2.5 if it fails in hand.  Prints as a short bridge.

# --- Braille branding "TACTA" (-X wall) -------------------------------------
# Cosmetic branding, NOT a functional braille display.  Dot geometry follows the
# 2010 ADA Standards §703.3 ranges so it reads correctly under a finger:
#   dot base Ø 1.5-1.6 | in-cell dot pitch 2.3-2.5 | cell pitch 6.1-7.6
#   dot height 0.6-0.9 | (line pitch 10.0-10.2 -- single line here, unused)
BRAILLE_DOT_DIA   = 1.5    # dot base Ø                            ADA 703.3 (1.5-1.6)
BRAILLE_DOT_PROUD = 0.7    # dot height proud of the wall          ADA 703.3 (0.6-0.9)
BRAILLE_DOT_PITCH = 2.4    # dot centres within a cell, both axes  ADA 703.3 (2.3-2.5)
BRAILLE_CELL_PITCH = 6.5   # corresponding dots, adjacent cells    ADA 703.3 (6.1-7.6)
BRAILLE_CELL_COLS = 2      # a braille cell is 2 columns x 3 rows  (standard)
BRAILLE_CELL_ROWS = 3

# --- M2 screw stack (P1:audit/07:§6.2 resolved all four CARRIED-OVER items) --
BOSS_DIA         = 7.0     # M2 boss/standoff outer Ø              P1:audit/07:§6.2
                           #   CONFIRMED Ø7.000 in the reference shell.
BOSS_PILOT       = 2.0     # M2 self-tap pilot Ø  -- OVERRIDE      P1:audit/07:§6.2
                           #   1.8 (carried, unsourced, used by the braille
                           #   sibling) vs 2.000 MEASURED on 8 features across 2
                           #   independent parts of cad/reference/genesis-mini-
                           #   shell.step, a printed shell that takes M2x20
                           #   screws.  2.000 wins: it is the value proven in PLA
                           #   on this exact board.  1.8 is not wrong, just a
                           #   tighter thread-forming fit with no evidence behind it.
GUSSET_SQ        = 9.0     # corner gusset pad size (grounds the boss to the walls)  DESIGN
GUSSET_T         = 2.5     # corner gusset thickness               DESIGN
PLATE_CB_DIA     = 4.0     # plate counterbore Ø (M2 head)         P1:audit/07:§6.2
                           #   CONFIRMED EXACTLY -- Ø4.000 measured, independent
                           #   agreement to 3 d.p.
PLATE_CB_D       = 2.0     # plate counterbore depth               P1:audit/07:§6.2
                           #   KEPT.  The reference's 3.350 lives in a 9.15 mm
                           #   stack, not a 3.0 mm plate; 3.350 here would be a
                           #   THROUGH-hole.  2.0 leaves 1.0 mm under the head.
PLATE_HOLE_DIA   = 2.4     # M2 clearance through-hole in the plate  P1:audit/07:§6.2
                           #   KEPT.  ISO 273 medium clearance for M2.  The
                           #   reference's Ø3.500 assembles but gives up location.

# --- USB-C ------------------------------------------------------------------
USB_SLOT_W       = 12.0    # USB slot width (Y), clears cable overmold  DESIGN (>=12)
USB_SLOT_H       = 7.0     # USB slot height (Z)                   DESIGN (>=7)
USB_PLANE_INSET  = 1.5     # sketch plane sits this far inside the cavity wall  DESIGN
WALL_CUT_MARGIN  = 2.0     # how far a wall cut exits the outer face  DESIGN

# --- Apertures (P1:audit/07:§5 -- Phase 2 codes directly from this) ---------
TOF_APERTURE_DIA = 13.0    # ToF optical aperture Ø                P1:audit/07:§5.1
                           #   Straight cylindrical through-hole.  NO counterbore,
                           #   NO step, NO baffle, NO lens/film/mesh/window over
                           #   it.  Derivation: air gap sensor->deck outer is
                           #   7.390 mm; corrected AN4907 rule X = 3.74 + 0.70*g
                           #   -> Ø8.913 required (first-principles cross-check
                           #   8.876, agreement 0.037 mm); + ±1.27 module
                           #   registration -> Ø11.453; Ø13.0 leaves 1.547 mm
                           #   diametral margin.  audit/01's Ø12.0 is SUPERSEDED
                           #   (only 0.547 mm margin -- do not reuse it).
                           #   ST also says >2.0 mm gap needs no cover material at
                           #   all; ours is 3.7x that limit.
MIC_PORT_DIA     = 3.5     # microphone acoustic port Ø            P1:audit/07:§5.2
                           #   L/D = 2.5/3.5 = 0.71 -- "short and wide", which the
                           #   Knowles SiSonic guide says is the safe direction.
                           #   NO gasket, NO mesh, NO membrane (an unsealed cavity
                           #   has nothing to resonate; a screen is pure loss).
MIC_PORT_COUNT   = 2       # TWO ports, one each side of the port centre  P1:audit/07:§5.2
                           #   The capsule sits 5.850 mm off module centre AND
                           #   insertion is 180°-ambiguous, so ONE hole on the port
                           #   centre (audit/01's spec) misses the capsule in BOTH
                           #   orientations -- it lands over the op-amp.  One of
                           #   these two lands on the capsule either way round;
                           #   the other is a harmless vent.
TRIMPOT_ACCESS_DIA = 4.0   # trimpot screwdriver access Ø          P1:audit/07:§5.2
                           #   The MCP6001 mic gain is set by a MANUAL trimpot.
                           #   Sealing it freezes gain at whatever it happened to
                           #   be at assembly -- a real functional trap, since gain
                           #   must be tuned against the actual acoustic
                           #   environment.  Two holes for the same 180° reason.
                           #   NOTE: at 1.170 mm centre spacing each Ø4.0 trimpot
                           #   hole MERGES with its neighbouring Ø3.5 mic port into
                           #   a single ~4.92 x 4.0 mm oblong opening.  Intended and
                           #   harmless: both functions are still served.
GRILLE_HOLE_DIA  = 2.5     # buzzer grille hole Ø                  P1:audit/07:§5.3
GRILLE_RING_R    = 3.5     # grille ring radius (6 holes at 60°)   P1:audit/07:§5.3
GRILLE_RING_N    = 6       # ring hole count; +1 centre hole = 7   P1:audit/07:§5.3
                           #   A SOLID wall over this buzzer loses 24-32 dB
                           #   (mass law, 2.7 kHz through 1.0-2.5 mm PLA) BEFORE
                           #   the 10-15 dB coincidence penalty -- an 80 dB alert
                           #   arrives at ~50-60 dB, conversation level.
                           #   The one designer who has actually printed a
                           #   shell for this exact buzzer cut a real through-grille
                           #   over this exact port (P1:audit/07:§6.4).
                           #   Overall extent Ø9.5 covers the Ø8.5 MLT-8530 body,
                           #   so the buzzer's off-centre sound hole is covered at
                           #   any module rotation.  Min web 1.00 mm >= 0.8 mm at a
                           #   0.4 mm nozzle, both centre->ring and ring->ring.
                           #   Open area 34.4 mm² per port.

# --- Button access ----------------------------------------------------------
BTN_SLOT_W       = 5.0     # through-deck slot width (X)           DESIGN
                           #   BTN_BODY_X 3.2 + 0.9/side = 5.0, and 0.9 > the
                           #   0.7 mm BOARD_PLAY, so the slot cannot land on a
                           #   button body.  Kept narrow deliberately: this is a
                           #   functional aperture, not a reveal.
BTN_SLOT_HALF_Y  = 20.0    # slot half length (Y)                  DESIGN
                           #   Button bodies span y -19.292..+19.308 (±16.992/
                           #   +17.008 centres ± BTN_BODY_Y/2); 20.0 clears the
                           #   whole column with ~0.7 mm to spare.
                           #   ⚠ HONEST LIMITATION -- see the residual-risk note in
                           #   _cut_button_slot().  The slot alone does NOT make
                           #   the buttons pressable by finger.

# --- Cut-tool over-run (idiom: overshoot every tool past both faces) --------
THRU_OVERSHOOT   = 0.15    # deck through-cut over-run, BOTH faces DESIGN

# --- Chamfers (cosmetic ONLY -- every one degrades into _skipped) -----------
CHAMFER_VERT     = 3.0     # vertical outer corner chamfer         DESIGN
CHAMFER_TOP      = 2.0     # deck-top outer perimeter hazard chamfer  DESIGN
CHAMFER_LUG      = 1.5     # lug outer-edge (tip) chamfer          DESIGN
USB_FUNNEL       = 1.5     # USB slot exterior funnel chamfer      DESIGN
CHAMFER_TOF      = 0.5     # ToF outer bore-edge flare             P1:audit/07:§5.1
                           #   "optionally chamfer the outer bore edge 0.5 x 45°".
EDGE_Z_TOL       = 0.3     # z tolerance for chamfer edge selection   DESIGN
EDGE_FACE_TOL    = 0.6     # face-proximity tolerance for edge selection  DESIGN
EDGE_CORNER_TOL  = 1.0     # corner-proximity tolerance for edge selection  DESIGN
EDGE_R_TOL       = 0.3     # radius tolerance for circular edge selection  DESIGN
EDGE_TIP_TOL     = 0.2     # lug-tip proximity tolerance           DESIGN
EDGE_SLOT_TOL    = 0.5     # USB-slot bound tolerance              DESIGN

# --- Exact literal for sin(60°) (no math import; Fusion scripts stay stdlib-free)
_SIN60           = 0.8660254037844386   # sqrt(3)/2

# =============================================================================
# DERIVED Z-MAP  (board top = 0)
# =============================================================================
Z_BOARD_TOP   = 0.0
Z_BOARD_BOT   = -BOARD_THICK                        # -1.600
Z_POCKET_FL   = Z_BOARD_BOT - NEG_Z_POCKET          # -8.100  (-Z pocket floor)
Z_PLATE_TOP   = Z_POCKET_FL                         # -8.100
Z_PLATE_BOT   = Z_PLATE_TOP - PLATE_T               # -11.100
Z_ROOF_INNER  = MIC_TRIMPOT_TOP + ROOF_CLEAR        # +17.575  (P1 CORRECTED, was +16.25)
Z_ROOF_OUTER  = Z_ROOF_INNER + ROOF_THICK           # +20.075  (P1 CORRECTED, was +18.75)
DECK_INNER    = Z_ROOF_INNER                        # +17.575  deck underside
DECK_TOP      = Z_ROOF_OUTER                        # +20.075  deck top / outer face
DECK_MID      = (DECK_INNER + DECK_TOP) / 2.0       # +18.825  probe plane
Z_THRU_TOP    = DECK_TOP + THRU_OVERSHOOT           # +20.225  cut over-run, top
Z_THRU_BOT    = DECK_INNER - THRU_OVERSHOOT         # +17.425  cut over-run, bottom
                                                    #   (the 0.15 below DECK_INNER
                                                    #   is open cavity -- removes
                                                    #   nothing, but guarantees the
                                                    #   tool crosses BOTH deck faces)

# =============================================================================
# DERIVED XY-MAP
# =============================================================================
CAVITY        = BOARD_BAY + 2.0 * BAY_CLEAR         # 57.0
CAGE_OUTER    = CAVITY + 2.0 * WALL                 # 62.0
CAGE_HALF     = CAGE_OUTER / 2.0                    # 31.0
CAVITY_HALF   = CAVITY / 2.0                        # 28.5
USB_SLOT_CZ   = (USB_REC_ZLO + USB_REC_ZHI) / 2.0 + Z_BOARD_BOT   # -2.790
LUG_X_CTR     = STRAP_W / 2.0 + LUG_W / 2.0         # 13.0  (was 14.0 at STRAP_W 22.0)
LUG_Y_ROOT    = CAVITY_HALF                         # 28.5  flush with the wall inner
LUG_Y_TIP     = CAGE_HALF + LUG_PROJ                # 36.0
LUG_Y_MID     = (LUG_Y_ROOT + LUG_Y_TIP) / 2.0      # 32.25 -> bore axis

# --- Strap bar, DERIVED so it tracks STRAP_W (v1 was ±17.0 at STRAP_W 22.0) --
BAR_X_HALF    = LUG_X_CTR + LUG_W / 2.0             # 16.0  lug outer to lug outer
BAR_Y_IN      = CAGE_HALF + STRAP_SLOT              # 34.0  bar inner face
BAR_Y_OUT     = BAR_Y_IN + STRAP_BAR_T              # 35.5  bar outer face
BAR_Y_CTR     = (BAR_Y_IN + BAR_Y_OUT) / 2.0        # 34.75
BAR_Z_CTR     = LUG_BORE_Z                          # -3.0  on the lug-bore axis
BAR_Z_BOT     = BAR_Z_CTR - STRAP_BAR_H / 2.0       # -3.75
BAR_Z_TOP     = BAR_Z_CTR + STRAP_BAR_H / 2.0       # -2.25
LUG_BORE_Y_OUT = LUG_Y_MID + LUG_BORE / 2.0         # 33.55  bore outer tangent

# The bar must land INSIDE the lug envelope in both Y and Z, or its ends float.
assert BAR_Y_OUT < LUG_Y_TIP, \
    "strap bar outer face %.3f must stay inboard of the lug tip %.3f" % (
        BAR_Y_OUT, LUG_Y_TIP)
assert BAR_Y_IN > LUG_BORE_Y_OUT, \
    "strap bar inner face %.3f must clear the lug bore at %.3f" % (
        BAR_Y_IN, LUG_BORE_Y_OUT)
assert BAR_Z_BOT > LUG_BORE_Z - LUG_H / 2.0 and BAR_Z_TOP < LUG_BORE_Z + LUG_H / 2.0, \
    "strap bar Z %.3f..%.3f must sit inside the lug block" % (BAR_Z_BOT, BAR_Z_TOP)

# --- Braille "TACTA" block on the -X wall, DERIVED --------------------------
# Standard braille cell, dots numbered   1 4
#                                        2 5
#                                        3 6
# t = 2345, a = 1, c = 14  (Unicode ⠞ ⠁ ⠉ ⠞ ⠁)
BRAILLE_CELLS = ((2, 3, 4, 5), (1,), (1, 4), (2, 3, 4, 5), (1,))   # T A C T A
_BRAILLE_DOT_RC = {1: (0, 0), 2: (0, 1), 3: (0, 2),
                   4: (1, 0), 5: (1, 1), 6: (1, 2)}                # dot -> (col, row)
BRAILLE_N_CELLS = len(BRAILLE_CELLS)                # 5
BRAILLE_W     = ((BRAILLE_N_CELLS - 1) * BRAILLE_CELL_PITCH
                 + (BRAILLE_CELL_COLS - 1) * BRAILLE_DOT_PITCH)    # 28.4 dot-centre span
BRAILLE_H     = (BRAILLE_CELL_ROWS - 1) * BRAILLE_DOT_PITCH        # 4.8  dot-centre span
BRAILLE_X_FACE = -CAGE_HALF                         # -31.0  the -X outer wall face
BRAILLE_Z_CTR = (Z_PLATE_BOT + DECK_TOP) / 2.0      # +4.4875  mid-height of the side
BRAILLE_Y_LEFT = BRAILLE_W / 2.0                    # +14.2  FIRST cell, reader's left
BRAILLE_Z0    = BRAILLE_Z_CTR + BRAILLE_H / 2.0     # +6.8875  top dot row
# READING DIRECTION -- the sign here is NOT cosmetic.  Braille is CHIRAL: mirror
# a cell and dots 1/2/3 swap with 4/5/6, which turns 't' (2345) into 1256, not a
# letter at all.  For a camera looking along d with up u, screen-right = d x u
# (check: front view d=(0,1,0) u=(0,0,1) -> +X right, as every drawing shows).
# Standing outside the -X wall, d=(+1,0,0) and u=(0,0,1), so
#         screen-right = (1,0,0) x (0,0,1) = (0,-1,0) = -Y.
# The string therefore has to START at the most POSITIVE y and ADVANCE toward
# -y, and within a cell the left column (dots 1,2,3) must also sit at the
# HIGHER y.  Hence the subtraction in _braille_dot_xyz.
#   Getting this backwards renders 'TACTA' as 'a ?? a a ??' -- caught by the
#   snapshot, NOT by the material probes, because the probes called the same
#   helper that placed the dots and so mirrored the bug with it.  The
#   hardcoded-coordinate probes in _material_probes exist to close that hole.
# Row 0 is the TOP row, so rows step -Z.  Block is 28.4 + 1.5 = 29.9 mm wide.
assert BRAILLE_W + BRAILLE_DOT_DIA < CAGE_OUTER, \
    "braille block %.1f mm must fit the %.1f mm wall" % (
        BRAILLE_W + BRAILLE_DOT_DIA, CAGE_OUTER)
assert BRAILLE_DOT_PROUD < WALL, \
    "braille dots must embed within the %.1f mm wall" % WALL

# Microphone port + trimpot access X positions, DERIVED (not hard-coded) from the
# measured module-local offsets, so they track the port assignment automatically.
MIC_PORT_A_X      = PORT_MIC_X - MIC_CAPSULE_OFFSET     # -17.850  P1:audit/07:§5.0
MIC_PORT_B_X      = PORT_MIC_X + MIC_CAPSULE_OFFSET     #  -6.150  P1:audit/07:§5.0
TRIMPOT_A_X       = PORT_MIC_X - MIC_TRIMPOT_OFFSET     # -19.020  P1:audit/07:§5.0
TRIMPOT_B_X       = PORT_MIC_X + MIC_TRIMPOT_OFFSET     #  -4.980  P1:audit/07:§5.0

# =============================================================================
# ENVELOPE CROSS-CHECK  (required, P1:audit/07:§6.1)
# -----------------------------------------------------------------------------
# The reference article cad/reference/genesis-mini-shell.step -- a shell PROVEN
# to physically seat a Genesis Mini -- measures 159.500 x 63.000 x 17.000 mm.
#
#   ASSERT: CAGE_OUTER (62.0) < 63.000, the reference's measured WIDTH axis.
#           -> we clear the proven article by 1.0 mm on that axis.
#
# On the other axis we are deliberately nothing like it: our length is 62 mm
# against the reference's 159.5 mm.  That is the whole point -- the reference is
# a desktop console body laid out for print; this is a WRIST form factor, square
# on the board, with the strap lugs carrying the load off the ±Y walls.
# (Note the reference's 159.5 mm is itself a print-layout artefact: the file
# holds four separate bodies side by side, P1:audit/07:§6.1.)
# =============================================================================
REFERENCE_SHELL_WIDTH = 63.0   # measured width axis                P1:audit/07:§6.1
assert CAGE_OUTER < REFERENCE_SHELL_WIDTH, \
    "CAGE_OUTER %.1f must clear the reference shell width %.1f" % (
        CAGE_OUTER, REFERENCE_SHELL_WIDTH)


# =============================================================================
# GLOBALS filled in run()
# =============================================================================
_app = None
_ui = None
_comp = None          # the enclosure component
_cage = None          # the "cage" BRepBody
_plate = None         # the "skin_plate" BRepBody
_skipped = []         # cosmetic features that were skipped (reported at the end)


# -----------------------------------------------------------------------------
# Small geometry helpers
# -----------------------------------------------------------------------------
def _pt(x_mm, y_mm, z_mm=0.0):
    return adsk.core.Point3D.create(x_mm / 10.0, y_mm / 10.0, z_mm / 10.0)


def _offset_plane(base_plane, dist_mm):
    """A construction plane parallel to base_plane, offset by dist_mm."""
    planes = _comp.constructionPlanes
    pin = planes.createInput()
    pin.setByOffset(base_plane, _cm(dist_mm))
    return planes.add(pin)


def _rect_profile(sketch, cx, cy, w, h):
    """Draw a centred axis-aligned rectangle; return the enclosed profile."""
    lines = sketch.sketchCurves.sketchLines
    lines.addTwoPointRectangle(
        _pt(cx - w / 2.0, cy - h / 2.0),
        _pt(cx + w / 2.0, cy + h / 2.0),
    )
    return sketch.profiles.item(sketch.profiles.count - 1)


def _circle_profile(sketch, cx, cy, dia):
    """Draw a circle by DIAMETER (mm); return its profile."""
    sketch.sketchCurves.sketchCircles.addByCenterRadius(_pt(cx, cy), dia / 2.0 / 10.0)
    return sketch.profiles.item(sketch.profiles.count - 1)


def _extrude(profile, dist_mm, operation):
    """Extrude a profile a signed distance (mm) with the given operation."""
    return _comp.features.extrudeFeatures.addSimple(profile, _cm(dist_mm), operation)


def _extrude_symmetric(profile, total_mm, operation):
    """Two-sided (symmetric) extrude of TOTAL length total_mm, centred on the
    profile's own sketch plane.  Unlike addSimple's ONE-sided signed distance, a
    symmetric extent reaches the target body regardless of the construction
    plane's normal SIGN or its in-plane axis orientation -- the mandatory idiom
    for cuts sketched on OFFSET yZ construction planes, whose sketch frame is
    NOT guaranteed to map sketch-X -> model +Y, sketch-Y -> model +Z, or
    +distance -> model +X.
    (help.autodesk.com ExtrudeFeatures_createInput.htm ;
     help.autodesk.com ExtrudeInput_setSymmetricExtent.htm -- isFullLength=True
     => total_mm is the FULL length, i.e. ±total_mm/2 about the plane.)"""
    ext = _comp.features.extrudeFeatures
    ein = ext.createInput(profile, operation)
    ein.setSymmetricExtent(_cm(total_mm), True, adsk.core.ValueInput.createByReal(0.0))
    return ext.add(ein)


def _extrude_into(profile, dist_mm, operation, target_body):
    """Extrude a signed distance (mm) that may ONLY touch target_body.

    MANDATORY for every JOIN once more than one body exists.  A default Fusion
    join merges the new material into EVERY body it contacts, and this design is
    full of deliberately coincident faces -- the skin plate fills the cavity, so
    its four side faces are flush with the cage's inner walls, and the corner
    gussets reach that same plane.  An unqualified join of a gusset would
    therefore fuse the cage AND the plate into a single body and silently
    destroy the two-part split.  participantBodies pins the operation to one
    body.  (help.autodesk.com ExtrudeFeatureInput_participantBodies.htm ;
     help.autodesk.com ExtrudeFeatureInput_setDistanceExtent.htm)"""
    ext = _comp.features.extrudeFeatures
    ein = ext.createInput(profile, operation)
    ein.setDistanceExtent(False, _cm(dist_mm))
    ein.participantBodies = [target_body]
    return ext.add(ein)


def _extrude_symmetric_into(profile, total_mm, operation, target_body):
    """Symmetric-extent twin of _extrude_into -- the orientation-proof idiom for
    a cut or join sketched on an OFFSET yZ plane, restricted to one body."""
    ext = _comp.features.extrudeFeatures
    ein = ext.createInput(profile, operation)
    ein.setSymmetricExtent(_cm(total_mm), True, adsk.core.ValueInput.createByReal(0.0))
    ein.participantBodies = [target_body]
    return ext.add(ein)


def _sketch_on_xy_at(z_mm):
    """Sketch on an XY-parallel plane at model z.  PREFERRED over yZ/xZ planes
    everywhere the geometry allows: an XY sketch + vertical extrude has no
    construction-plane normal-sign ambiguity at all.  (xZConstructionPlane's
    normal is -Y, which once put a cut on the wrong wall -- audit/26 §Runtime
    error #2 background.)"""
    return _comp.sketches.add(_offset_plane(_comp.xYConstructionPlane, z_mm))


def _hex_ring_uv():
    """Unit offsets for GRILLE_RING_N points at 60° spacing, starting at 0°.
    Exact literals -- Fusion scripts here stay import-free beyond adsk.* and
    traceback, so cos/sin are written out rather than computed."""
    s = _SIN60
    return [(1.0, 0.0), (0.5, s), (-0.5, s), (-1.0, 0.0), (-0.5, -s), (0.5, -s)]


def _braille_dot_xyz(cell_index, dot, x_mm):
    """Model (x,y,z) of one braille dot centre.  SINGLE SOURCE for both the
    geometry and the verification probes, so a layout change cannot leave the
    probes testing the old positions (and silently passing)."""
    col, row = _BRAILLE_DOT_RC[dot]
    # -Y is the reader's LEFT->RIGHT direction on the -X wall, so cells and
    # in-cell columns both SUBTRACT.  See the BRAILLE_Y_LEFT derivation.
    return (x_mm,
            BRAILLE_Y_LEFT - (cell_index * BRAILLE_CELL_PITCH
                              + col * BRAILLE_DOT_PITCH),
            BRAILLE_Z0 - row * BRAILLE_DOT_PITCH)


NEWBODY = adsk.fusion.FeatureOperations.NewBodyFeatureOperation
JOIN = adsk.fusion.FeatureOperations.JoinFeatureOperation
CUT = adsk.fusion.FeatureOperations.CutFeatureOperation


# -----------------------------------------------------------------------------
# User parameters (exposed & editable in the Fusion Parameters dialog).
# Registered via design.userParameters.add(name, ValueInput, "mm", comment).
# ValueInput.createByReal takes INTERNAL (cm) units while "mm" is the DISPLAY
# unit, so _cm(value) + "mm" round-trips to the intended millimetre figure.
# NOTE: geometry above is driven by the Python constants of the SAME value, so
# the model is self-consistent; editing a parameter here documents intent (full
# associativity would need each sketch dimension bound to the expression).
# -----------------------------------------------------------------------------
def _register_parameters(design):
    up = design.userParameters
    params = [
        ("board_bay",          BOARD_BAY,          "Host board footprint (T1:audit/01)"),
        ("board_thick",        BOARD_THICK,        "PCB thickness as coded; measures 1.510 (T1:audit/01)"),
        ("board_hole_x",       BOARD_HOLE_X,       "Screw hole centre offset (T1:audit/01)"),
        ("board_hole_dia",     BOARD_HOLE_DIA,     "Board hole dia (T1:audit/01)"),
        ("port_ctr",           PORT_CTR,           "AX22 port centre offset (T1:audit/01)"),
        ("module_sq",          MODULE_SQ,          "AX22 module PCB square (ASSUMED-AX22-STANDARD)"),
        ("bay_clearance",      BAY_CLEAR,          "Board bay clearance/side (DESIGN)"),
        ("wall",               WALL,               "Cage wall (DESIGN >=2.5)"),
        ("plate_t",            PLATE_T,            "Skin plate thickness (DESIGN >=3.0)"),
        ("neg_z_pocket",       NEG_Z_POCKET,       "-Z pocket depth, clears JST -5.585 (DESIGN)"),
        ("mic_trimpot_top",    MIC_TRIMPOT_TOP,    "GOVERNING module height (P1:audit/07:4.5)"),
        ("roof_clear",         ROOF_CLEAR,         "Deck clearance over the trimpot (P1:audit/07:4.5)"),
        ("roof_thick",         ROOF_THICK,         "Deck thickness (DESIGN >=2.5)"),
        ("deck_inner",         DECK_INNER,         "Deck underside +17.575 (P1 CORRECTED)"),
        ("deck_top",           DECK_TOP,           "Deck outer face +20.075 (P1 CORRECTED)"),
        ("tof_aperture_dia",   TOF_APERTURE_DIA,   "ToF open aperture (P1:audit/07:5.1)"),
        ("mic_port_dia",       MIC_PORT_DIA,       "Mic acoustic port (P1:audit/07:5.2)"),
        ("mic_capsule_offset", MIC_CAPSULE_OFFSET, "Electret capsule off-centre (P1:audit/07:4.1)"),
        ("trimpot_access_dia", TRIMPOT_ACCESS_DIA, "Trimpot screwdriver access (P1:audit/07:5.2)"),
        ("trimpot_offset",     MIC_TRIMPOT_OFFSET, "Trimpot screw axis off-centre (P1:audit/07:4.1)"),
        ("grille_hole_dia",    GRILLE_HOLE_DIA,    "Buzzer grille hole (P1:audit/07:5.3)"),
        ("grille_ring_r",      GRILLE_RING_R,      "Buzzer grille ring radius (P1:audit/07:5.3)"),
        ("grille_ring_n",      float(GRILLE_RING_N), "Buzzer grille ring hole count (P1:audit/07:5.3)"),
        ("btn_x",              BTN_X,              "Button column X (T1:audit/01)"),
        ("btn_y",              BTN_Y,              "Button +/-Y offset (T1:audit/01)"),
        ("btn_slot_w",         BTN_SLOT_W,         "Button access slot width (DESIGN)"),
        ("btn_slot_half_y",    BTN_SLOT_HALF_Y,    "Button access slot half length (DESIGN)"),
        ("usb_slot_w",         USB_SLOT_W,         "USB slot width (DESIGN >=12)"),
        ("usb_slot_h",         USB_SLOT_H,         "USB slot height (DESIGN >=7)"),
        ("strap_w",            STRAP_W,            "Strap width = internal lug gap (DESIGN, plan)"),
        ("lug_bore",           LUG_BORE,           "Lug bore (DESIGN)"),
        ("strap_slot",         STRAP_SLOT,         "Wall -> strap-bar gap (T1:v1_22mm 2.982)"),
        ("strap_bar_t",        STRAP_BAR_T,        "Strap bar Y thickness (T1:v1_22mm 1.427)"),
        ("strap_bar_h",        STRAP_BAR_H,        "Strap bar Z height (T1:v1_22mm 1.383)"),
        ("braille_dot_dia",    BRAILLE_DOT_DIA,    "Braille dot base dia (ADA 703.3)"),
        ("braille_dot_proud",  BRAILLE_DOT_PROUD,  "Braille dot height (ADA 703.3)"),
        ("braille_dot_pitch",  BRAILLE_DOT_PITCH,  "Braille in-cell dot pitch (ADA 703.3)"),
        ("braille_cell_pitch", BRAILLE_CELL_PITCH, "Braille cell pitch (ADA 703.3)"),
        ("boss_dia",           BOSS_DIA,           "M2 boss/standoff (P1:audit/07:6.2 CONFIRMED)"),
        ("boss_pilot",         BOSS_PILOT,         "M2 pilot, 1.8 -> 2.0 OVERRIDE (P1:audit/07:6.2)"),
        ("plate_cb_dia",       PLATE_CB_DIA,       "Plate counterbore (P1:audit/07:6.2 CONFIRMED)"),
        ("plate_cb_d",         PLATE_CB_D,         "Plate counterbore depth (P1:audit/07:6.2 KEPT)"),
        ("plate_hole_dia",     PLATE_HOLE_DIA,     "Plate M2 clearance hole (P1:audit/07:6.2 KEPT)"),
        ("chamfer_vert",       CHAMFER_VERT,       "Vertical outer corner chamfer (DESIGN)"),
        ("chamfer_top",        CHAMFER_TOP,        "Deck-top hazard chamfer (DESIGN)"),
    ]
    for name, value, comment in params:
        try:
            up.add(name, _cm(value), "mm", comment)
        except Exception:
            pass    # a name clash (re-run into the same doc) is non-fatal


# =============================================================================
# BUILD STEPS
# =============================================================================
def _build_cage_block():
    """Step 1: outer CAGE_OUTER square solid block, plate-bottom to deck-top."""
    global _cage
    sk = _sketch_on_xy_at(Z_PLATE_BOT)
    prof = _rect_profile(sk, 0.0, 0.0, CAGE_OUTER, CAGE_OUTER)      # 62 x 62
    feat = _extrude(prof, DECK_TOP - Z_PLATE_BOT, NEWBODY)          # 31.175 mm tall
    _cage = feat.bodies.item(0)
    _cage.name = "cage"


def _cut_cavity():
    """Step 2: hollow the CAVITY square from the open bottom up to DECK_INNER.

    Leaves WALL-thick walls all round and a SOLID CLOSED DECK -- the whole point
    of this variant.  Nothing else is removed from the deck except the numbered
    functional apertures below."""
    sk = _sketch_on_xy_at(Z_PLATE_BOT)
    prof = _rect_profile(sk, 0.0, 0.0, CAVITY, CAVITY)              # 57 x 57
    _extrude(prof, DECK_INNER - Z_PLATE_BOT, CUT)                   # open bottom -> deck underside


def _boss_corners():
    return [( BOARD_HOLE_X,  BOARD_HOLE_X),
            ( BOARD_HOLE_X, -BOARD_HOLE_X),
            (-BOARD_HOLE_X,  BOARD_HOLE_X),
            (-BOARD_HOLE_X, -BOARD_HOLE_X)]


def _add_bosses_and_gussets():
    """4 x M2 standoffs at (±BOARD_HOLE_X, ±BOARD_HOLE_X) on corner gussets,
    each with a BOSS_PILOT self-tap pilot.

    BODY OWNERSHIP -- these belong to the PLATE, not the cage.  cad/v1_22mm.step
    settles it: that file's two solids are 'Body' (the cage, z -11.100..+16.500)
    and 'Base' (z -11.100..-1.600), and -1.600 is Z_BOARD_BOT -- the top of the
    standoffs.  Probing the reference Base finds Ø7.000 boss walls over
    z -5.600..-1.600 and gusset material at z -7.000 that is gone by -5.000, i.e.
    plate + GUSSET_T pads + standoffs are ONE printed part.  So the base carries
    the board and the cage drops over the pair.

    This runs LATE in the timeline (after _build_skin_plate) purely because the
    plate has to exist before anything can be joined to it, and every join here
    is pinned to _plate via _extrude_into -- see that helper for why an
    unqualified join would weld the cage and plate together."""
    # gussets: floor pads reaching into the cavity corners (ground the standoffs)
    for (cx, cy) in _boss_corners():
        gx = (CAVITY_HALF - GUSSET_SQ / 2.0) * (1.0 if cx > 0.0 else -1.0)
        gy = (CAVITY_HALF - GUSSET_SQ / 2.0) * (1.0 if cy > 0.0 else -1.0)
        sk = _sketch_on_xy_at(Z_PLATE_TOP)
        prof = _rect_profile(sk, gx, gy, GUSSET_SQ, GUSSET_SQ)
        _extrude_into(prof, GUSSET_T, JOIN, _plate)                 # -8.1 -> -5.6
    # standoffs: BOSS_DIA columns spanning the whole -Z pocket
    for (cx, cy) in _boss_corners():
        sk = _sketch_on_xy_at(Z_PLATE_TOP)
        prof = _circle_profile(sk, cx, cy, BOSS_DIA)
        _extrude_into(prof, Z_BOARD_BOT - Z_PLATE_TOP, JOIN, _plate)  # -8.1 -> -1.6
    # BOSS_PILOT M2 self-tap pilot through each standoff.  FIT feature -- never
    # wrapped.  With the standoffs on the base, the board screws DOWN into these
    # pilots from +Z and the plate's own Ø2.4/Ø4.0 stack below is now a clear
    # pass-through rather than a second fixing.  Screw note: ~M2x5 board-side.
    #   NOTE vs the reference: v1_22mm.step bores Ø2.400 straight through its
    #   standoffs (no pilot at all), which needs a nut or a threaded feature
    #   above the board.  BOSS_PILOT Ø2.000 is kept here -- it is the value
    #   measured on printed hardware in P1:audit/07:§6.2 and it lets the board
    #   self-tap directly into the base with no extra hardware.
    for (cx, cy) in _boss_corners():
        sk = _sketch_on_xy_at(Z_PLATE_TOP)
        prof = _circle_profile(sk, cx, cy, BOSS_PILOT)
        _extrude_into(prof, Z_BOARD_BOT - Z_PLATE_TOP, CUT, _plate)


def _cut_deck_hole(cx, cy, dia):
    """A straight cylindrical through-hole in the deck, over-running BOTH deck
    faces by THRU_OVERSHOOT.  A CUT whose tool intersects no body raises
    'RuntimeError: 3 : No target body found to cut or intersect!', so every deck
    tool is deliberately longer than the deck it crosses."""
    sk = _sketch_on_xy_at(Z_THRU_BOT)
    prof = _circle_profile(sk, cx, cy, dia)
    _extrude(prof, Z_THRU_TOP - Z_THRU_BOT, CUT)


def _cut_tof_aperture():
    """Step 4: ToF optical aperture -- ONE straight Ø13.0 through-hole.

    NO counterbore, NO step, NO baffle, NO lens/film/mesh/window, nothing over
    it.  ST's own limit is air-gap + window <= 2.0 mm for sub-1000 mm ranging;
    our sensor-to-deck-outer stack is 7.390 mm = 3.7x that, so any cover
    material at all is out.  The two-hole (emitter/collector) option needs
    Ø0.79-1.99 holes on a 3.00 mm pitch -- not FDM-achievable at a 0.4 mm nozzle
    -- and the single round/oval option ST publishes uses no divider, so
    skipping the baffle is FOLLOWING ST, not cutting a corner.
    (P1:audit/07:§5.1, T3/T4.)"""
    _cut_deck_hole(PORT_TOF_X, PORT_TOF_Y, TOF_APERTURE_DIA)


def _cut_mic_ports():
    """Step 5: TWO Ø3.5 microphone acoustic ports, straddling the P4 centre.

    The electret capsule sits MIC_CAPSULE_OFFSET (5.850 mm) off the module
    centre and module insertion is 180°-ambiguous, so the capsule lands at
    port centre ± 5.850 depending on which way the module is pushed in.  A
    single hole on the port centre -- audit/01's spec -- misses the capsule in
    BOTH orientations and sits over the op-amp instead.  Cutting both means one
    always lands on the capsule; the other is a harmless vent.
    NO gasket, NO mesh, NO membrane.  (P1:audit/07:§5.2, M1/M5/M6.)"""
    for cx in (MIC_PORT_A_X, MIC_PORT_B_X):
        _cut_deck_hole(cx, PORT_MIC_Y, MIC_PORT_DIA)


def _cut_trimpot_access():
    """Step 6: TWO Ø4.0 trimpot access holes, straddling the P4 centre.

    The microphone's MCP6001 gain is set by a MANUAL top-adjust trimpot.  In a
    sealed enclosure that becomes unreachable and the gain is frozen at whatever
    it happened to be at assembly -- gain normally has to be tuned against the
    real acoustic environment.  Two holes for the same 180°-ambiguity reason as
    the mic ports.  A small flat screwdriver reaches the Ø2.946 slot 2.09 mm
    below the outer face.  These do NOT solve the trimpot's HEIGHT problem --
    its full 6.99 x 6.60 body reaches 4.965 mm, which is why the deck rose.
    (P1:audit/07:§5.2.)"""
    for cx in (TRIMPOT_A_X, TRIMPOT_B_X):
        _cut_deck_hole(cx, PORT_MIC_Y, TRIMPOT_ACCESS_DIA)


def _cut_buzzer_grille(cx, cy):
    """A 7-hole hex grille: 1 centre + GRILLE_RING_N at GRILLE_RING_R, 60° apart.

    Min web is 1.00 mm in both directions (centre->ring = 3.5 - 2.5; ring->ring
    chord = 2*3.5*sin30 - 2.5), comfortably above the 0.8 mm floor for a 0.4 mm
    nozzle, and every hole is a vertical bore in a flat deck -- no overhangs, no
    supports, aspect ratio 1.0.  (P1:audit/07:§5.3.)"""
    _cut_deck_hole(cx, cy, GRILLE_HOLE_DIA)                    # centre hole
    for (u, v) in _hex_ring_uv():                              # 6 ring holes
        _cut_deck_hole(cx + GRILLE_RING_R * u, cy + GRILLE_RING_R * v,
                       GRILLE_HOLE_DIA)


def _cut_buzzer_grilles():
    """Step 7: buzzer grilles over P1 and P3.  MANDATORY, not decorative -- a
    solid deck loses 24-32 dB of a 2.7 kHz alert before the coincidence penalty,
    and the only person known to have printed a shell for this exact buzzer cut
    a real through-grille over it.  The MLT-8530 is centred on its module to
    (0.000, 0.000), so grille centre = port centre exactly, and the Ø9.5 overall
    extent covers the Ø8.5 body at any module rotation.  (P1:audit/07:§5.3/§6.4.)"""
    _cut_buzzer_grille(PORT_BUZZ_A_X, PORT_BUZZ_A_Y)
    _cut_buzzer_grille(PORT_BUZZ_B_X, PORT_BUZZ_B_Y)


def _cut_usb_slot():
    """Step 8: USB-C slot through the +X wall, centred y = 0, at the receptacle
    mid-Z (USB_SLOT_CZ = -2.790 in model coords).

    ORIENTATION-PROOFING (mandatory on any offset yZ plane; live Fusion 2026,
    audit/26 §Runtime error #2 + §Precautionary fix): the sketch frame on an
    OFFSET yZConstructionPlane is NOT guaranteed to map sketch-X -> model +Y /
    sketch-Y -> model +Z, nor is a one-sided addSimple's +distance guaranteed to
    run model +X.  A raw-coordinate rectangle + one-sided +X addSimple can
    therefore mirror the slot to the WRONG model Z (+2.79 instead of -2.79,
    reflected about the plane origin) WITHOUT crashing, because the rectangle is
    Y-symmetric and tall enough to hit the wall either way.  So:
      (a) both corners come from intended MODEL coords via modelToSketchSpace();
      (b) the cut uses a SYMMETRIC extent, which pierces the +X wall whichever
          way the plane normal points.
      help.autodesk.com Sketch_modelToSketchSpace.htm
      help.autodesk.com ExtrudeInput_setSymmetricExtent.htm"""
    x_start = CAVITY_HALF - USB_PLANE_INSET                    # 27.0, just inside the cavity
    plane = _offset_plane(_comp.yZConstructionPlane, x_start)
    sk = _comp.sketches.add(plane)
    c0 = sk.modelToSketchSpace(_pt(x_start, -USB_SLOT_W / 2.0,
                                   USB_SLOT_CZ - USB_SLOT_H / 2.0))
    c1 = sk.modelToSketchSpace(_pt(x_start,  USB_SLOT_W / 2.0,
                                   USB_SLOT_CZ + USB_SLOT_H / 2.0))
    sk.sketchCurves.sketchLines.addTwoPointRectangle(c0, c1)
    prof = sk.profiles.item(sk.profiles.count - 1)
    # Symmetric FULL length 2*((CAGE_HALF - x_start) + WALL_CUT_MARGIN) = 12.0 mm
    # about X = 27.0 -> the cut spans model X 21.0..33.0.  It exits the +X outer
    # wall (31.0) by 2 mm and its -X reach (21.0) stops 49.5 mm short of the -X
    # inner wall (-28.5), so it CANNOT nick the opposite wall; the 21.0..28.5
    # stretch is hollow cavity and removes nothing.
    _extrude_symmetric(prof, 2.0 * ((CAGE_HALF - x_start) + WALL_CUT_MARGIN), CUT)


def _add_lugs():
    """Step 9: 2 lug pairs on the ±Y walls, internal gap STRAP_W = 20.0.

    LUG_X_CTR = STRAP_W/2 + LUG_W/2 = 13.0 (the braille sibling's 14.0 came from
    a 22 mm NATO strap; this build uses the 20 mm strap actually in hand).

    The Ø2.6 bore is sketched on an OFFSET yZ plane, so idiom 3 applies in full
    -- this is the exact feature that produced the live-Fusion
    'RuntimeError: 3 : No target body found to cut or intersect!' when the bore
    centre was written in RAW sketch-space coords and cut one-sided: the circle
    landed mirrored (at -Y on the +Y-first iteration, where no lug body exists
    yet) and/or the tool extruded away from the lug, so it overlapped no solid.
    FIX: plane AT the lug mid-plane, centre via modelToSketchSpace() from MODEL
    coords, symmetric extent LUG_W + LUG_BORE_OVERSHOOT = 8 mm about X = cx so
    it pierces the 6 mm block from BOTH ends regardless of normal sign.

    FIT feature -- deliberately NOT wrapped in a cosmetic fallback.  A failure
    here must abort loudly, not report 'fit geometry unaffected'."""
    for sign in (1.0, -1.0):                                   # +Y wall, then -Y
        for xs in (1.0, -1.0):                                 # two lugs per pair
            cx = xs * LUG_X_CTR
            # lug block, JOINed to the wall (LUG_Y_ROOT is flush with the wall
            # inner face, so the block never intrudes into the board bay)
            sk = _sketch_on_xy_at(LUG_BORE_Z - LUG_H / 2.0)
            prof = _rect_profile(sk, cx, sign * LUG_Y_MID, LUG_W,
                                 LUG_Y_TIP - LUG_Y_ROOT)
            _extrude(prof, LUG_H, JOIN)
            # Ø2.6 bore along X through the lug
            plane = _offset_plane(_comp.yZConstructionPlane, cx)
            sk2 = _comp.sketches.add(plane)
            ctr = sk2.modelToSketchSpace(_pt(cx, sign * LUG_Y_MID, LUG_BORE_Z))
            sk2.sketchCurves.sketchCircles.addByCenterRadius(ctr, LUG_BORE / 2.0 / 10.0)
            prof2 = sk2.profiles.item(sk2.profiles.count - 1)
            _extrude_symmetric(prof2, LUG_W + LUG_BORE_OVERSHOOT, CUT)


def _add_strap_bars():
    """One integral strap bar per ±Y wall, spanning lug tip to lug tip.

    THE FEATURE cad/v1_22mm.step HAS AND THIS SCRIPT DID NOT.  Without it the
    lugs only accept a separate spring bar or printed pin through the Ø2.6
    bores; with it the strap threads straight through the STRAP_SLOT gap and
    loops around the bar, so the device is wearable with no extra hardware.
    The bores are kept as the alternative route.

    Geometry re-derived from STRAP_W rather than copied from the 22 mm v1:
      X   ±BAR_X_HALF (±16.0)  -- buried in both lug blocks at each end
      Y   34.000 .. 35.500     -- STRAP_SLOT 3.0 clear of the wall, 0.5 inboard
                                  of the lug tip, 0.45 clear of the bore
      Z   -3.750 .. -2.250     -- centred on the LUG_BORE_Z axis
    The strap passes through the 20.0 x 3.0 mm slot between the cage wall and
    the bar's inner face.

    Sketched on an XY plane and extruded +Z, so no construction-plane normal
    ambiguity applies -- unlike the bore in _add_lugs, this needs no
    modelToSketchSpace/symmetric-extent proofing.

    FIT feature -- deliberately NOT wrapped in a cosmetic fallback.  A strap
    that cannot be attached is a dead prototype, so a failure here must abort."""
    for sign in (1.0, -1.0):                                   # +Y wall, then -Y
        sk = _sketch_on_xy_at(BAR_Z_BOT)
        prof = _rect_profile(sk, 0.0, sign * BAR_Y_CTR,
                             2.0 * BAR_X_HALF, STRAP_BAR_T)
        _extrude_into(prof, STRAP_BAR_H, JOIN, _cage)


def _emboss_braille():
    """Raised 'TACTA' in braille on the -X wall.  BRANDING, COSMETIC ONLY.

    ⚠ CALL IT WHAT IT IS: this is a five-cell name plate, not an accessibility
    feature and not a braille display.  It says nothing at runtime and conveys
    no device state.  It is on the -X wall because that is the only fully clear
    outer face -- USB-C takes +X, the lugs and strap bars take ±Y.

    Dot geometry sits inside the 2010 ADA Standards §703.3 ranges (Ø1.5 base,
    2.4 mm in-cell pitch, 6.5 mm cell pitch, 0.7 mm proud), so it reads as
    braille under a finger rather than as decoration.

    Each dot is a circle on the -X wall plane extruded SYMMETRICALLY about that
    plane: 0.7 mm stands proud and 0.7 mm buries into the 2.5 mm wall, which
    both guarantees a real volumetric join to the cage and makes the feature
    immune to the yZ plane's normal-sign ambiguity (idiom 3, as in _add_lugs).
    The centre comes from MODEL coords via modelToSketchSpace, so the block
    cannot mirror -- braille is chiral and a mirrored cell is a different
    letter, which the identity-vs-mirrored harness check would catch.

    ⚠ HARNESS + PRINT LIMITATION: the dots export as flat-topped cylinders, not
    domes.  ADA allows domed or rounded dots; a cylinder is the FDM-friendly
    approximation and is what the STEP will show.  On a vertical wall they print
    as 0.7 mm horizontal protrusions -- printable, but expect layer stepping."""
    try:
        plane = _offset_plane(_comp.yZConstructionPlane, BRAILLE_X_FACE)
        for i, cell in enumerate(BRAILLE_CELLS):
            for dot in cell:
                dx, dy, dz = _braille_dot_xyz(i, dot, BRAILLE_X_FACE)
                sk = _comp.sketches.add(plane)
                ctr = sk.modelToSketchSpace(_pt(dx, dy, dz))
                sk.sketchCurves.sketchCircles.addByCenterRadius(
                    ctr, BRAILLE_DOT_DIA / 2.0 / 10.0)
                prof = sk.profiles.item(sk.profiles.count - 1)
                _extrude_symmetric_into(prof, 2.0 * BRAILLE_DOT_PROUD, JOIN, _cage)
    except Exception:
        _skipped.append("braille 'TACTA' branding (exception)")


def _cut_button_slot():
    """Step 10: a narrow through-deck slot over the 3-button column.

    The board's three buttons at (25.760, +17.008 / +0.008 / -16.992) are the
    device's ONLY user input, and the firmware uses a LONG PRESS >= 1.5 s for
    global mute plus a short press for ACK
    (plan/2026-07-18-situational-awareness.md).  Sealing them would
    make the device unusable, so this aperture is functional, exactly like the
    ToF eye and the buzzer grilles -- not a reveal.

    ⚠ RESIDUAL RISK, STATED PLAINLY: the plunger tops sit at
    BTN_PLUNGER_TOP = +2.4, which is DECK_INNER - 2.4 = 15.175 mm below the deck
    underside and 17.675 mm below the outer face.  A 5.0 mm slot admits a stylus
    or a small screwdriver; it does NOT admit a fingertip that far down, so THE
    SLOT ALONE DOES NOT MAKE THE BUTTONS PRESSABLE BY FINGER.  Closing that gap
    needs one of: a printed plunger extension / button cap bridging +2.4 to
    ~+20.1, a wider finger opening (which costs the closed-body language), or a
    flexible membrane over a widened slot.  This is a REAL OPEN ITEM, not a
    detail -- see audit/situational-awareness/08 §Residual risk."""
    sk = _sketch_on_xy_at(Z_THRU_BOT)
    prof = _rect_profile(sk, BTN_X, 0.0, BTN_SLOT_W, 2.0 * BTN_SLOT_HALF_Y)
    _extrude(prof, Z_THRU_TOP - Z_THRU_BOT, CUT)


def _build_skin_plate():
    """Step 11: the solid skin plate (2nd body) + 4 counterbored M2 clearance
    holes.  Screws pass up through the plate into the shared boss pilots."""
    global _plate
    sk = _sketch_on_xy_at(Z_PLATE_BOT)
    prof = _rect_profile(sk, 0.0, 0.0, CAVITY, CAVITY)         # fills the cavity bottom
    feat = _extrude(prof, PLATE_T, NEWBODY)                    # -11.1 -> -8.1
    _plate = feat.bodies.item(0)
    _plate.name = "skin_plate"
    for (cx, cy) in _boss_corners():
        # M2 clearance through-hole (PLATE_HOLE_DIA 2.4 = ISO 273 medium), NOT
        # the Ø3.4 board hole: under a Ø4.0 head recess a Ø3.4 through-hole
        # would leave only a 0.3 mm bearing ring.
        sk = _sketch_on_xy_at(Z_PLATE_BOT)
        prof = _circle_profile(sk, cx, cy, PLATE_HOLE_DIA)
        _extrude(prof, PLATE_T, CUT)
        # counterbore for the M2 head on the wrist face
        sk = _sketch_on_xy_at(Z_PLATE_BOT)
        prof = _circle_profile(sk, cx, cy, PLATE_CB_DIA)
        _extrude(prof, PLATE_CB_D, CUT)


# -----------------------------------------------------------------------------
# Chamfers -- Step 12.  COSMETIC ONLY.  Every one degrades into _skipped; not a
# single fit dimension depends on any of them.  (Phase-4 W2 / audit/26 line 76:
# fit-critical cuts abort loudly, only cosmetics degrade.)
# -----------------------------------------------------------------------------
def _edge_is_vertical(edge):
    """(mx, my) in mm for a straight VERTICAL edge, else None."""
    g = edge.geometry
    if g.objectType != adsk.core.Line3D.classType():
        return None
    sp, ep = g.startPoint, g.endPoint
    dx, dy, dz = ep.x - sp.x, ep.y - sp.y, ep.z - sp.z
    length = (dx * dx + dy * dy + dz * dz) ** 0.5
    if length < 1e-6:
        return None
    if abs(dz) / length < 0.99:
        return None
    return ((sp.x + ep.x) / 2.0 * 10.0, (sp.y + ep.y) / 2.0 * 10.0)


def _horizontal_edge_mid(edge):
    """(mx, my, mz) in mm for a straight HORIZONTAL edge, else None."""
    g = edge.geometry
    if g.objectType != adsk.core.Line3D.classType():
        return None
    sp, ep = g.startPoint, g.endPoint
    if abs(ep.z - sp.z) > 1e-6:
        return None
    return ((sp.x + ep.x) / 2.0 * 10.0,
            (sp.y + ep.y) / 2.0 * 10.0,
            (sp.z + ep.z) / 2.0 * 10.0)


def _edge_point_on_curve(edge):
    """A point (mm) lying ON a non-linear edge, else None.

    Real Fusion's BRepEdge exposes .pointOnEdge; the offline harness exposes
    only geometry.startPoint, which for a closed circle also lies on the circle.
    Either source lets us ask 'is this the Ø13 bore rim at the deck top?'"""
    try:
        p = edge.pointOnEdge
        return (p.x * 10.0, p.y * 10.0, p.z * 10.0)
    except Exception:
        pass
    try:
        p = edge.geometry.startPoint
        return (p.x * 10.0, p.y * 10.0, p.z * 10.0)
    except Exception:
        return None


def _apply_equal_chamfer(edges, distance_mm, both):
    chamfers = _comp.features.chamferFeatures
    cin = chamfers.createInput2()
    cin.chamferEdgeSets.addEqualDistanceChamferEdgeSet(edges, _cm(distance_mm), both)
    chamfers.add(cin)


def _chamfer_deck_top():
    """CHAMFER_TOP hazard chamfer on the deck-top OUTER perimeter."""
    try:
        edges = adsk.core.ObjectCollection.create()
        for edge in _cage.edges:
            m = _horizontal_edge_mid(edge)
            if m is None:
                continue
            mx, my, mz = m
            if abs(mz - DECK_TOP) > EDGE_Z_TOL:
                continue
            if abs(mx) > CAGE_HALF - EDGE_FACE_TOL or abs(my) > CAGE_HALF - EDGE_FACE_TOL:
                edges.add(edge)
        if edges.count == 0:
            _skipped.append("deck top chamfer (no edges matched)")
            return
        _apply_equal_chamfer(edges, CHAMFER_TOP, True)
    except Exception:
        _skipped.append("deck top chamfer (exception)")


def _chamfer_vertical_corners():
    """CHAMFER_VERT on the four vertical outer corners of the slab."""
    try:
        edges = adsk.core.ObjectCollection.create()
        for edge in _cage.edges:
            res = _edge_is_vertical(edge)
            if res is None:
                continue
            mx, my = res
            if abs(mx) > CAGE_HALF - EDGE_CORNER_TOL and abs(my) > CAGE_HALF - EDGE_CORNER_TOL:
                edges.add(edge)
        if edges.count == 0:
            _skipped.append("vertical corner chamfers (no edges matched)")
            return
        _apply_equal_chamfer(edges, CHAMFER_VERT, True)
    except Exception:
        _skipped.append("vertical corner chamfers (exception)")


def _chamfer_lugs():
    """CHAMFER_LUG on the outer (tip) face edges of the 4 lug blocks."""
    try:
        edges = adsk.core.ObjectCollection.create()
        for edge in _cage.edges:
            g = edge.geometry
            if g.objectType != adsk.core.Line3D.classType():
                continue
            sp, ep = g.startPoint, g.endPoint
            my = (sp.y + ep.y) / 2.0 * 10.0
            if abs(my) > LUG_Y_TIP - EDGE_TIP_TOL:     # nothing else reaches |y| > 31
                edges.add(edge)
        if edges.count == 0:
            _skipped.append("lug chamfers (no edges matched)")
            return
        _apply_equal_chamfer(edges, CHAMFER_LUG, False)
    except Exception:
        _skipped.append("lug chamfers (exception)")


def _chamfer_usb_funnel():
    """USB_FUNNEL funnel chamfer on all four exterior edges of the USB slot."""
    try:
        edges = adsk.core.ObjectCollection.create()
        for edge in _cage.edges:
            g = edge.geometry
            if g.objectType != adsk.core.Line3D.classType():
                continue
            sp, ep = g.startPoint, g.endPoint
            if abs(ep.x - sp.x) > 1e-6:                # must lie in a constant-X plane
                continue
            mx = (sp.x + ep.x) / 2.0 * 10.0
            my = (sp.y + ep.y) / 2.0 * 10.0
            mz = (sp.z + ep.z) / 2.0 * 10.0
            if mx < CAGE_HALF - EDGE_FACE_TOL:         # +X outer face only
                continue
            if abs(my) > USB_SLOT_W / 2.0 + EDGE_SLOT_TOL:
                continue
            if abs(mz - USB_SLOT_CZ) > USB_SLOT_H / 2.0 + EDGE_SLOT_TOL:
                continue
            edges.add(edge)
        if edges.count == 0:
            _skipped.append("USB funnel chamfer (no edges matched)")
            return
        _apply_equal_chamfer(edges, USB_FUNNEL, True)
    except Exception:
        _skipped.append("USB funnel chamfer (exception)")


def _chamfer_tof_bore():
    """CHAMFER_TOF 0.5 x 45° flare on the ToF bore's OUTER rim (P1:audit/07:§5.1
    'optionally chamfer the outer bore edge 0.5 x 45° to flare it').  Selected by
    'circular edge, at DECK_TOP, at radius TOF_APERTURE_DIA/2 from the bore
    axis', so it cannot pick up a grille hole (24 mm away) or a mic port."""
    try:
        edges = adsk.core.ObjectCollection.create()
        r_nom = TOF_APERTURE_DIA / 2.0
        for edge in _cage.edges:
            if edge.geometry.objectType == adsk.core.Line3D.classType():
                continue
            p = _edge_point_on_curve(edge)
            if p is None:
                continue
            px, py, pz = p
            if abs(pz - DECK_TOP) > EDGE_Z_TOL:
                continue
            dx, dy = px - PORT_TOF_X, py - PORT_TOF_Y
            if abs((dx * dx + dy * dy) ** 0.5 - r_nom) > EDGE_R_TOL:
                continue
            edges.add(edge)
        if edges.count == 0:
            _skipped.append("ToF bore chamfer (no edges matched)")
            return
        _apply_equal_chamfer(edges, CHAMFER_TOF, False)
    except Exception:
        _skipped.append("ToF bore chamfer (exception)")


# =============================================================================
# ENTRY POINT
# =============================================================================
def run(context):
    global _app, _ui, _comp
    _app = adsk.core.Application.get()
    _ui = _app.userInterface
    try:
        design = adsk.fusion.Design.cast(_app.activeProduct)
        if not design:
            _ui.messageBox(
                "No active Fusion Design.\n\n"
                "Open a Design document (Solid workspace) and run again.")
            return

        # New component to hold the whole enclosure.
        #
        # PART vs ASSEMBLY document restriction (Fusion 2026 builds, observed
        # live -- audit/speech-to-braille-wearable/26 §Runtime error #1):
        # a "Part Design" document may contain exactly ONE component (its
        # rootComponent); calling root.occurrences.addNewComponent() there
        # raises:
        #   RuntimeError: 3 : Failed to create component: Part Design documents
        #   can only contain one component, please add this Part to an Assembly
        #   to add multiple components.
        # "Assembly" (and legacy/hybrid multi-component) documents allow child
        # components, so prefer that and fall back to modelling directly into
        # rootComponent when it is refused.  The restriction is on multiple
        # COMPONENTS only -- multiple BODIES in one component are always
        # allowed, so this script's two bodies are fine in a Part document.
        root = design.rootComponent
        try:
            occ = root.occurrences.addNewComponent(adsk.core.Matrix3D.create())
            _comp = occ.component
            _comp.name = "TactaEnclosure"
        except Exception:
            _comp = root
            try:
                _comp.name = "TactaEnclosure"
            except Exception:
                pass    # renaming the root component may be disallowed; non-fatal

        _register_parameters(design)

        # --- Ordered timeline -------------------------------------------------
        # BODY OWNERSHIP drives this order.  Everything that belongs to the CAGE
        # is built first, then the PLATE is created, and only then are the
        # standoffs joined -- they are part of the base, so the base has to exist
        # before they can attach to it.  (Was: standoffs at step 3, on the cage.)
        _build_cage_block()        # 1  outer 62 x 62 block, -11.100 -> +20.075
        _cut_cavity()              # 2  hollow 57 x 57, open wrist side, CLOSED deck
        _cut_tof_aperture()        # 3  Ø13.0 open ToF eye at (+12, -12)
        _cut_mic_ports()           # 4  2x Ø3.5 mic ports at (-17.850/-6.150, +12)
        _cut_trimpot_access()      # 5  2x Ø4.0 trimpot access at (-19.020/-4.980, +12)
        _cut_buzzer_grilles()      # 6  2x 7-hole Ø2.5 hex grille at (-12,-12) & (+12,+12)
        _cut_usb_slot()            # 7  USB-C slot through the +X wall
        _add_lugs()                # 8  2 lug pairs, STRAP_W gap 20.0, Ø2.6 bores
        _add_strap_bars()          # 9  integral strap bar per wall (from v1_22mm)
        _cut_button_slot()         # 10 narrow through-deck slot over the button column
        _emboss_braille()          # 11 raised 'TACTA' braille on the -X wall
        _build_skin_plate()        # 12 solid skin plate + 4 counterbores
        _add_bosses_and_gussets()  # 13 4x M2 standoffs + gussets + Ø2.0 pilots
                                   #    -> JOINED TO THE PLATE, not the cage
        # 14 chamfers, all cosmetic -> graceful skip
        _chamfer_deck_top()        # 14a CHAMFER_TOP 2.0 deck-top outer perimeter
        _chamfer_vertical_corners()# 14b CHAMFER_VERT 3.0 on 4 vertical corners
        _chamfer_lugs()            # 14c CHAMFER_LUG 1.5 lug tips
        _chamfer_usb_funnel()      # 14d USB_FUNNEL 1.5 USB slot mouth
        _chamfer_tof_bore()        # 14e CHAMFER_TOF 0.5 ToF bore outer rim

        # --- Report -----------------------------------------------------------
        msg = ("TACTA wearable enclosure built (CLOSED MONOLITH).\n\n"
               "Bodies: cage (shell + lugs + strap bars + braille)\n"
               "        skin_plate (plate + gussets + M2 standoffs)\n"
               "Footprint: %.1f x %.1f mm   Height: %.3f (%.3f .. %.3f)\n"
               "Deck: inner %.3f / outer %.3f  (mic trimpot %.3f + clear %.1f)\n"
               "Apertures: ToF O%.1f @ (%.0f,%.0f) | mic 2x O%.1f | trimpot 2x O%.1f\n"
               "           buzzer grilles 2x %dx O%.1f | button slot %.1f x %.1f\n"
               "Board bay %.0f x %.0f, 4x M2 standoffs at +/-%.1f, pilot O%.1f\n"
               "  -> standoffs are part of the BASE (v1_22mm.step body split)\n"
               "Strap: width %.1f mm | bar %.1f x %.1f at y %.3f..%.3f | slot %.1f mm\n"
               "Braille 'TACTA': %d cells on the -X wall, %.1f mm wide, O%.1f x %.1f proud\n"
               % (CAGE_OUTER, CAGE_OUTER, DECK_TOP - Z_PLATE_BOT, Z_PLATE_BOT, DECK_TOP,
                  DECK_INNER, DECK_TOP, MIC_TRIMPOT_TOP, ROOF_CLEAR,
                  TOF_APERTURE_DIA, PORT_TOF_X, PORT_TOF_Y, MIC_PORT_DIA,
                  TRIMPOT_ACCESS_DIA, GRILLE_RING_N + 1, GRILLE_HOLE_DIA,
                  BTN_SLOT_W, 2.0 * BTN_SLOT_HALF_Y,
                  BOARD_BAY, BOARD_BAY, BOARD_HOLE_X, BOSS_PILOT,
                  STRAP_W, STRAP_BAR_T, STRAP_BAR_H, BAR_Y_IN, BAR_Y_OUT, STRAP_SLOT,
                  BRAILLE_N_CELLS, BRAILLE_W + BRAILLE_DOT_DIA,
                  BRAILLE_DOT_DIA, BRAILLE_DOT_PROUD))
        if _skipped:
            msg += "\nCosmetic features skipped (fit geometry unaffected):\n - " + \
                   "\n - ".join(_skipped)
        else:
            msg += "\nAll cosmetic features created."
        _ui.messageBox(msg)

    except Exception:
        if _ui:
            _ui.messageBox("Failed:\n{}".format(traceback.format_exc()))


# =============================================================================
# HEADLESS VERIFICATION  --  NOT part of the Fusion script.
# -----------------------------------------------------------------------------
# Fusion has no headless mode, but cad/tests/fake_adsk is a REAL build123d
# geometry engine behind a fake adsk API (cad/tests/README.md).  Running this
# file with a plain interpreter therefore builds the actual solids, probes them
# for material, and exports STEP/STL fit-check artifacts.
#
#     .venv/bin/python cad/enclosure.py
#
# Fusion never enters this block: its script runner imports the module under the
# script's own name and calls run(context), so __name__ != "__main__".
#
# ⚠ HARNESS LIMITATION, STATED HONESTLY: fake_adsk RECORDS chamfers WITHOUT
# APPLYING them (cad/tests/fake_adsk/fusion.py:452).  The exported STEP/STL is
# therefore correct in every FIT dimension and MISSING ALL CHAMFERS.  It is a
# fit-check artifact, not a faithful preview.  Fusion remains ground truth.
# =============================================================================
def _headless_build(convention):
    """Reset the fake world under one orientation convention and build."""
    import fake_adsk
    fake_adsk.reset(convention=convention)
    del _skipped[:]                                    # module global; clear in place
    run(None)
    messages = list(fake_adsk.core.MESSAGES)
    failed = [m for m in messages if m.startswith("Failed:")]
    return fake_adsk.fusion.WORLD, messages, failed


def _probe(world, label, xyz, want_solid, results):
    got = world.is_solid(xyz)
    ok = (got is want_solid)
    results.append(ok)
    print("  %-4s  %-46s (%8.3f,%8.3f,%8.3f)  want %-5s got %s"
          % ("PASS" if ok else "FAIL", label, xyz[0], xyz[1], xyz[2],
             "SOLID" if want_solid else "AIR", "SOLID" if got else "AIR"))
    return ok


def _material_probes(world):
    """Fit probes.  AIR where a transducer, screw, plug or finger must reach;
    SOLID where the closed body must stay closed."""
    r = []
    grille_web_x = PORT_BUZZ_A_X + GRILLE_RING_R * _SIN60   # 30° between two ring holes
    grille_web_y = PORT_BUZZ_A_Y + GRILLE_RING_R * 0.5
    # --- deck apertures ---
    _probe(world, "ToF aperture centre", (PORT_TOF_X, PORT_TOF_Y, DECK_MID), False, r)
    _probe(world, "ToF aperture near rim (r=6.0)",
           (PORT_TOF_X + TOF_APERTURE_DIA / 2.0 - 0.5, PORT_TOF_Y, DECK_MID), False, r)
    _probe(world, "deck SOLID just outside ToF rim (r=7.0)",
           (PORT_TOF_X + TOF_APERTURE_DIA / 2.0 + 0.5, PORT_TOF_Y, DECK_MID), True, r)
    _probe(world, "deck SOLID between apertures (0,0)", (0.0, 0.0, DECK_MID), True, r)
    _probe(world, "deck SOLID at corner (-24,-24)", (-24.0, -24.0, DECK_MID), True, r)
    _probe(world, "buzzer A grille centre hole",
           (PORT_BUZZ_A_X, PORT_BUZZ_A_Y, DECK_MID), False, r)
    _probe(world, "buzzer B grille centre hole",
           (PORT_BUZZ_B_X, PORT_BUZZ_B_Y, DECK_MID), False, r)
    _probe(world, "buzzer A grille ring hole (0 deg)",
           (PORT_BUZZ_A_X + GRILLE_RING_R, PORT_BUZZ_A_Y, DECK_MID), False, r)
    _probe(world, "buzzer A grille WEB solid (30 deg)",
           (grille_web_x, grille_web_y, DECK_MID), True, r)
    _probe(world, "mic port A (capsule, orientation 1)",
           (MIC_PORT_A_X, PORT_MIC_Y, DECK_MID), False, r)
    _probe(world, "mic port B (capsule, orientation 2)",
           (MIC_PORT_B_X, PORT_MIC_Y, DECK_MID), False, r)
    _probe(world, "trimpot access A", (TRIMPOT_A_X, PORT_MIC_Y, DECK_MID), False, r)
    _probe(world, "trimpot access B", (TRIMPOT_B_X, PORT_MIC_Y, DECK_MID), False, r)
    _probe(world, "trimpot A outboard of the mic port",
           (TRIMPOT_A_X - 1.6, PORT_MIC_Y, DECK_MID), False, r)
    _probe(world, "deck SOLID at the P4 PORT CENTRE (audit/01 spec superseded)",
           (PORT_MIC_X, PORT_MIC_Y, DECK_MID), True, r)
    # --- button access ---
    _probe(world, "button slot over +Y button", (BTN_X, BTN_Y, DECK_MID), False, r)
    _probe(world, "button slot over centre button", (BTN_X, 0.0, DECK_MID), False, r)
    _probe(world, "button slot over -Y button", (BTN_X, -BTN_Y, DECK_MID), False, r)
    _probe(world, "deck SOLID inboard of the button slot", (20.0, 0.0, DECK_MID), True, r)
    # --- walls / USB ---
    _probe(world, "USB-C slot through the +X wall",
           (CAGE_HALF - WALL / 2.0, 0.0, USB_SLOT_CZ), False, r)
    _probe(world, "+X wall SOLID away from the USB slot",
           (CAGE_HALF - WALL / 2.0, 16.0, USB_SLOT_CZ), True, r)
    _probe(world, "+Y wall SOLID", (0.0, CAGE_HALF - WALL / 2.0, 0.0), True, r)
    # --- lugs ---
    for sx in (1.0, -1.0):
        for sy in (1.0, -1.0):
            _probe(world, "lug bore (%+.0f,%+.0f)" % (sx, sy),
                   (sx * LUG_X_CTR, sy * LUG_Y_MID, LUG_BORE_Z), False, r)
    _probe(world, "lug block SOLID above the bore",
           (LUG_X_CTR, LUG_Y_MID, LUG_BORE_Z + LUG_H / 2.0 - 0.5), True, r)
    # --- strap bars (the v1_22mm feature) ---
    # The strap has to be able to PASS BETWEEN the wall and the bar, loop round
    # it, and come back, so the bar must be solid AND surrounded by air on three
    # sides.  Probing only "bar is solid" would pass on a solid block of plastic.
    for sy in (1.0, -1.0):
        _probe(world, "strap bar mid-span SOLID (%+.0fY)" % sy,
               (0.0, sy * BAR_Y_CTR, BAR_Z_CTR), True, r)
        _probe(world, "strap SLOT open, wall->bar (%+.0fY)" % sy,
               (0.0, sy * (CAGE_HALF + STRAP_SLOT / 2.0), BAR_Z_CTR), False, r)
        _probe(world, "open OUTBOARD of the bar (%+.0fY)" % sy,
               (0.0, sy * (BAR_Y_OUT + LUG_Y_TIP) / 2.0, BAR_Z_CTR), False, r)
        _probe(world, "open ABOVE the bar (%+.0fY)" % sy,
               (0.0, sy * BAR_Y_CTR, BAR_Z_TOP + 1.0), False, r)
        _probe(world, "open BELOW the bar (%+.0fY)" % sy,
               (0.0, sy * BAR_Y_CTR, BAR_Z_BOT - 1.0), False, r)
    # bar runs past the lug inner face (x 10.0) -- proves it spans, not stubs
    _probe(world, "strap bar SOLID just inboard of the lug",
           (LUG_X_CTR - LUG_W / 2.0 - 0.5, BAR_Y_CTR, BAR_Z_CTR), True, r)
    _probe(world, "strap bar STOPS at the lug outer face",
           (BAR_X_HALF + 0.5, BAR_Y_CTR, BAR_Z_CTR), False, r)
    # --- braille 'TACTA' -- verifies the ENCODING, not merely that dots exist ---
    # Probed 0.35 mm proud of the wall, so a SET dot reads SOLID and a CLEAR dot
    # reads AIR.  Neighbouring dots are 2.4 mm apart against a 1.5 mm diameter,
    # so no dot can contaminate another dot's probe.
    x_proud = BRAILLE_X_FACE - BRAILLE_DOT_PROUD / 2.0
    for (ci, dot, want, why) in ((0, 2, True,  "cell0 T dot2 SET"),
                                 (0, 5, True,  "cell0 T dot5 SET"),
                                 (0, 1, False, "cell0 T dot1 CLEAR"),
                                 (0, 6, False, "cell0 T dot6 CLEAR"),
                                 (1, 1, True,  "cell1 A dot1 SET"),
                                 (1, 3, False, "cell1 A dot3 CLEAR"),
                                 (2, 1, True,  "cell2 C dot1 SET"),
                                 (2, 4, True,  "cell2 C dot4 SET"),
                                 (2, 2, False, "cell2 C dot2 CLEAR"),
                                 (3, 4, True,  "cell3 T dot4 SET"),
                                 (4, 1, True,  "cell4 A dot1 SET"),
                                 (4, 5, False, "cell4 A dot5 CLEAR")):
        _probe(world, "braille %s" % why, _braille_dot_xyz(ci, dot, x_proud), want, r)
    _probe(world, "braille dots stand proud of the -X wall",
           _braille_dot_xyz(1, 1, BRAILLE_X_FACE - BRAILLE_DOT_PROUD + 0.05), True, r)
    _probe(world, "nothing beyond the braille dot tips",
           _braille_dot_xyz(1, 1, BRAILLE_X_FACE - BRAILLE_DOT_PROUD - 0.2), False, r)
    # READING-DIRECTION probes.  HARDCODED model coordinates on purpose: every
    # probe above calls _braille_dot_xyz, the same helper that PLACES the dots,
    # so a sign error there moves the dots and the probes together and they all
    # still pass.  That is exactly what happened -- the layout was mirrored and
    # 60/60 probes passed; only the snapshot showed it.  These three pin the
    # string to absolute y, so a flip fails loudly.
    #   -X wall seen from outside => screen-right is -Y, so the FIRST cell sits
    #   at the most POSITIVE y (+14.2) and the LAST at the most negative.
    _probe(world, "braille 1st cell 'T' dot2 at y=+14.200 (reader's left)",
           (x_proud, 14.2, 4.4875), True, r)
    _probe(world, "braille last cell 'A' dot1 at y=-11.800 (reader's right)",
           (x_proud, -11.8, 6.8875), True, r)
    _probe(world, "braille NOT mirrored: y=-14.200 top row is CLEAR",
           (x_proud, -14.2, 6.8875), False, r)
    # --- bosses / bay / pocket ---
    _probe(world, "boss pilot", (BOARD_HOLE_X, BOARD_HOLE_X, -5.0), False, r)
    _probe(world, "boss annulus SOLID",
           (BOARD_HOLE_X + BOSS_DIA / 2.0 - 1.0, BOARD_HOLE_X, -5.0), True, r)
    _probe(world, "board bay clear", (0.0, 0.0, 5.0), False, r)
    _probe(world, "-Z pocket clear at the JST", (19.2, 15.8, -7.0), False, r)
    # --- skin plate ---
    _probe(world, "skin plate SOLID", (0.0, 0.0, Z_PLATE_BOT + PLATE_T / 2.0), True, r)
    _probe(world, "plate M2 clearance hole",
           (BOARD_HOLE_X, BOARD_HOLE_X, Z_PLATE_TOP - 0.5), False, r)
    _probe(world, "plate counterbore",
           (BOARD_HOLE_X + PLATE_CB_DIA / 2.0 - 0.3, BOARD_HOLE_X, Z_PLATE_BOT + 0.5),
           False, r)
    return r


def _body_probes(world):
    """WHICH BODY owns which feature -- the whole point of the v1_22mm rework.

    _material_probes tests the UNION of both bodies, so it cannot tell a standoff
    on the cage from a standoff on the base; both read SOLID.  These probes ask
    each body separately, which is the only way to prove the split actually
    happened and that the participantBodies pinning did not silently weld the
    cage and plate into one solid."""
    r = []

    def check(label, ok, detail=""):
        r.append(ok)
        print("  %-4s  %-46s %s" % ("PASS" if ok else "FAIL", label, detail))
        return ok

    names = sorted(world.body_names())
    check("exactly 2 bodies: cage + skin_plate",
          names == ["cage", "skin_plate"], str(names))
    if names != ["cage", "skin_plate"]:
        return r          # everything below would raise on a missing body

    cage, plate = world.body("cage"), world.body("skin_plate")
    x_proud = BRAILLE_X_FACE - BRAILLE_DOT_PROUD / 2.0
    #            label                     point                       owner
    owned = (("M2 standoff wall",
              (BOARD_HOLE_X + BOSS_DIA / 2.0 - 1.0, BOARD_HOLE_X, -5.0), plate),
             ("standoff top, just under the board",
              (BOARD_HOLE_X + BOSS_DIA / 2.0 - 1.0, BOARD_HOLE_X,
               Z_BOARD_BOT - 0.2), plate),
             # gusset OUTER corner: 5.52 mm from the boss axis, so it clears the
             # Ø7.0 boss AND the Ø2.0 pilot and can only be gusset material.
             ("corner gusset pad",
              (CAVITY_HALF - 0.5, CAVITY_HALF - 0.5,
               Z_PLATE_TOP + GUSSET_T / 2.0), plate),
             ("skin plate body",
              (0.0, 0.0, Z_PLATE_BOT + PLATE_T / 2.0), plate),
             ("strap bar", (0.0, BAR_Y_CTR, BAR_Z_CTR), cage),
             ("lug block", (LUG_X_CTR, LUG_Y_MID, LUG_BORE_Z + 3.0), cage),
             ("braille dot", _braille_dot_xyz(1, 1, x_proud), cage),
             ("deck", (0.0, 0.0, DECK_MID), cage),
             ("side wall", (CAGE_HALF - WALL / 2.0, 16.0, 0.0), cage))
    for label, pt, owner in owned:
        other = cage if owner is plate else plate
        want, dont = owner.contains(pt), other.contains(pt)
        check("%-34s -> %s" % (label, "skin_plate" if owner is plate else "cage"),
              want and not dont,
              "in=%-5s leaked=%-5s" % (want, dont))

    # The base must now reach the board underside, exactly like v1_22mm's 'Base'
    # (measured z -11.100 .. -1.600).  If the standoffs had stayed on the cage
    # the plate would still stop at Z_PLATE_TOP = -8.100.
    bb = plate.bbox()
    check("skin_plate top = Z_BOARD_BOT (v1_22mm Base -1.600)",
          abs(bb.max.Z - Z_BOARD_BOT) < 1e-6,
          "%.3f vs %.3f" % (bb.max.Z, Z_BOARD_BOT))
    bbc = cage.bbox()
    check("cage reaches the strap-bar/lug tips +/-%.1f" % LUG_Y_TIP,
          abs(bbc.max.Y - LUG_Y_TIP) < 1e-6 and abs(bbc.min.Y + LUG_Y_TIP) < 1e-6,
          "y %.3f .. %.3f" % (bbc.min.Y, bbc.max.Y))
    check("cage reaches the braille dot tips -%.2f" % (CAGE_HALF + BRAILLE_DOT_PROUD),
          abs(bbc.min.X + CAGE_HALF + BRAILLE_DOT_PROUD) < 1e-6,
          "x min %.3f" % bbc.min.X)
    return r


def _body_signature(world):
    sig = []
    for b in world.bodies:
        bb = b.bbox()
        sig.append((b.name, round(sum(s.volume for s in b.solid.solids()), 5),
                    (round(bb.min.X, 5), round(bb.min.Y, 5), round(bb.min.Z, 5),
                     round(bb.max.X, 5), round(bb.max.Y, 5), round(bb.max.Z, 5))))
    return sig


def _headless_main():
    import os
    import sys

    failures = 0

    print("=" * 78)
    print("HEADLESS BUILD  --  convention 'identity'")
    print("=" * 78)
    world, messages, failed = _headless_build("identity")
    if failed:
        print(failed[0])
        return 1
    print(messages[-1])
    print("\nMaterial probes (identity):")
    results = _material_probes(world)
    n_pass, n_fail = sum(1 for x in results if x), sum(1 for x in results if not x)
    print("  -> %d PASS, %d FAIL" % (n_pass, n_fail))
    failures += n_fail

    print("\nBody-ownership probes (identity):")
    body_results = _body_probes(world)
    b_pass, b_fail = (sum(1 for x in body_results if x),
                      sum(1 for x in body_results if not x))
    print("  -> %d PASS, %d FAIL" % (b_pass, b_fail))
    failures += b_fail
    n_pass += b_pass
    sig_identity = _body_signature(world)
    for name, vol, bb in sig_identity:
        print("  body %-11s volume %12.3f mm^3  bbox %s" % (name, vol, bb))

    print("\n" + "=" * 78)
    print("HEADLESS BUILD  --  convention 'mirrored'  (catches idiom-3 violations)")
    print("=" * 78)
    world_m, messages_m, failed_m = _headless_build("mirrored")
    if failed_m:
        print(failed_m[0])
        return 1
    print("\nMaterial probes (mirrored):")
    results_m = _material_probes(world_m)
    n_pass_m, n_fail_m = sum(1 for x in results_m if x), sum(1 for x in results_m if not x)
    print("  -> %d PASS, %d FAIL" % (n_pass_m, n_fail_m))
    failures += n_fail_m
    sig_mirrored = _body_signature(world_m)

    print("\nOrientation invariance (identity vs mirrored):")
    if sig_identity == sig_mirrored:
        print("  PASS  geometry IDENTICAL under both conventions")
    else:
        print("  FAIL  geometry DIFFERS -- raw-coordinate bug on a yZ plane")
        for a, b in zip(sig_identity, sig_mirrored):
            if a != b:
                print("        identity %s\n        mirrored %s" % (a, b))
        failures += 1

    # --- export the identity build (chamfers ABSENT -- see the banner above) --
    from build123d import Compound, export_step, export_stl
    world, _, failed = _headless_build("identity")
    if failed:
        print(failed[0])
        return 1
    shapes = []
    for b in world.bodies:
        s = b.solid
        s.label = b.name or "body"
        shapes.append(s)
    asm = Compound(children=shapes)
    asm.label = "TactaEnclosure"
    here = os.path.dirname(os.path.abspath(__file__))
    step_path = os.path.join(here, "enclosure.step")
    stl_path = os.path.join(here, "enclosure.stl")
    export_step(asm, step_path)
    export_stl(asm, stl_path)
    print("\nExported (FIT-CHECK ARTIFACTS -- chamfers not applied by the harness):")
    for p in (step_path, stl_path):
        size = os.path.getsize(p)
        print("  %-46s %9d bytes  %s" % (p, size, "OK" if size > 0 else "EMPTY"))
        if size == 0:
            failures += 1

    print("\n" + "=" * 78)
    if failures:
        print("RESULT: %d FAILURE(S)" % failures)
    else:
        print("RESULT: ALL CHECKS PASSED (%d probes x 2 conventions)" % n_pass)
    print("=" * 78)
    return 1 if failures else 0


if __name__ == "__main__":
    import sys as _sysmain
    _sysmain.exit(_headless_main())
