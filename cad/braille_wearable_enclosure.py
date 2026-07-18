# =============================================================================
# BRAILLE WEARABLE ENCLOSURE — Fusion 360 Python Script
# =============================================================================
# Wrist-worn braille / speech-to-touch wearable enclosure for the Axiometa
# "Genesis Mini" host board (55 x 55 mm) with 2x ERM haptic motors, an LCD,
# a rotary encoder and 3 onboard buttons.
#
# HOW TO RUN (paste-and-run):
#   1. Fusion 360 -> UTILITIES tab -> ADD-INS -> "Scripts and Add-Ins"
#   2. Scripts tab -> the green "+" -> "Create" (or point it at this .py file)
#   3. Select "braille_wearable_enclosure" -> "Run"
#   You must have an active *Design* document open (not a drawing / CAM).
#   Any Design document works, regardless of its type: in a *Part* document
#   the enclosure builds directly into the root component (Part documents allow
#   only ONE component); in an *Assembly* (or legacy multi-component) document
#   it becomes its own child component named "BrailleWearableEnclosure".
#   The script produces TWO bodies (cage + skin_plate) -- that is always fine,
#   since the single-component limit restricts COMPONENTS, not BODIES.
#
# CRITICAL: Fusion 360 API uses CENTIMETERS internally. All dimensions below
# are in mm; every createByReal() call divides by 10. This is done in ONE
# place only -- the helper _cm() below -- so the whole model stays consistent.
#
# STRAP: this script models LUG BOSSES ONLY (no strap, no hinge, no pin).
# Internal lug gap = 22.0 mm (standard NATO/spring-bar width). The user buys a
# 22 mm strap and Ø2.5 printed pins (or Ø1.78 steel spring bars, which the
# Ø2.6 bore also admits loosely).
#
# AESTHETIC: "MONOLITH WITH REVEALS" (design files 27d + 28). The full
# 62 x 62 G-SHOCK slab is kept, then CARVED like billet: a proud protective rim
# at +18.75 frames four deliberately different reveals milled into one gray deck
# so the black electronics read as instruments at the bottom of chamfered wells.
#   P1  OPEN REVEAL WELL   -- ERM (-12,-12) fully exposed, roof removed.
#   P3  LOUVRE GRILLE      -- ERM (+12,+12) felt behind 5 long-Y slots.
#   P2  RECESSED BEZEL     -- LCD glows in a recessed window frame.
#   P4  PROUD HEX TURRET   -- encoder rises through a scope-mount hex (top +23).
# Buttons sit in an OPEN TRENCH (plungers visible); one skeletal SIDE WINDOW on
# the -X flank exposes the green PCB edge (the single colour event). Brutalist
# 45 deg CHAMFERS throughout: 2.5 reveal funnels, 2.0 rim-top hazard chamfer,
# 3.0 vertical corners (3 of them) + one 6.0 CORNER-CLIP datum at (-X,+Y).
# It looks milled-from-billet, not printed: the removal is the ornament.
#
# COORDINATE DATUM (from audit file 16, Phase-1 reconciled truth table):
#   origin = geometric centre of the 55 x 55 host PCB.
#   +X = USB-C / button edge.  +Z = component / "outer" face.  -Z = skin/wrist.
#   This script places the BOARD TOP FACE at model Z = 0. File 16 uses PCB
#   top = +1.56 in its own frame; the mapping is: model_Z = file16_Z - 1.56.
#   Every "above board top" height from file 16 §A.4 therefore maps 1:1 to a
#   positive model Z here (motor top +15.25, LCD glass +13.18, encoder tip
#   +38.25, button plunger tops +2.4, socket top +7.50).
#
# SOURCE TAGS on every dimension:  HIGH = measured from resolved STEP solids
# or verbatim datasheet;  MED = datasheet-typical / single-method estimate;
# DESIGN = a design choice;  "DESIGN 27d/28 exposed rework" = the monolith
# reveal geometry introduced by design files 27d + 28.
# "row N" = row N of file 16 §A truth table.  "§C" = fit-critical anchor set.
# =============================================================================

import adsk.core
import adsk.fusion
import adsk.cam
import traceback


# -----------------------------------------------------------------------------
# THE mm->cm HELPER.  This is the ONLY place createByReal() is called for
# geometry, and it ALWAYS divides mm by 10.0.  Drive every dimension through it.
# -----------------------------------------------------------------------------
def _cm(mm_value):
    # Fusion internal length unit is cm -> divide mm by 10.0.  (help.autodesk.com
    # Units_UM.htm / ValueInput_createByReal.htm, verified 2026-07-17.)
    return adsk.core.ValueInput.createByReal(mm_value / 10.0)


# =============================================================================
# DIMENSION REGISTRY  (every literal that enters geometry lives here, once,
# with a source tag; geometry below references these names only).
# =============================================================================
# --- Host board & fit-critical anchors (file 16 §A / §C) --------------------
BOARD_BAY        = 55.0    # board footprint XY                 HIGH  row 1
BOARD_THICK      = 1.6     # PCB nominal thickness              HIGH  row 2
BOARD_HOLE_X     = 24.1    # screw hole centres (+/-24.1)       HIGH  row 3 (reference shell pattern ±24.0 agrees)
BOARD_HOLE_DIA   = 3.4     # measured BOARD hole Ø; loose slip over M2 screw body (not M3 clearance) HIGH row 3
PORT_CTR         = 12.0    # module/port centres at (+/-12)     HIGH  row 4 (pitch 24.0)
MODULE_SQ        = 22.0    # 22x22 module PCB (ERM, encoder)    HIGH  row 13
LCD_PCB_W        = 29.0    # LCD module PCB X extent            HIGH  row 14
LCD_PCB_H        = 22.0    # LCD module PCB Y extent            HIGH  row 14
MODULE_CLEAR_ROW = 1.3     # min pocket clearance, row dir      HIGH  row 28 / §C (X-registration +/-1.27)
# LCD mated placement (file 16 rows 20/27, conflict C12) --------------------
LCD_PCB_CX       = 12.0    # LCD PCB centre X                   HIGH  row 27
LCD_PCB_CY       = -15.5   # LCD PCB centre Y (overhangs -Y)    HIGH  row 27
LCD_WIN_CX       = 11.98   # LCD glass window centre X          HIGH  row 20 / C12  LOCKED
LCD_WIN_CY       = -14.38  # LCD glass window centre Y          HIGH  row 20 / C12  LOCKED
LCD_WIN_W        = 13.5    # window short side (along X)        HIGH  row 20 (visible glass 13.5)  LOCKED
LCD_WIN_H        = 27.9    # window long side (along Y)         HIGH  row 20 (visible glass 27.9)  LOCKED
LCD_OVERHANG     = 2.5     # LCD PCB overhang past board -Y edge HIGH row 27 / §C
# Module mated seats (file 16 rows 24-26) -----------------------------------
MOTOR_A_X        = -12.0   # ERM A centre (Port 1)              HIGH  row 24
MOTOR_A_Y        = -12.0   # ERM A centre (Port 1)              HIGH  row 24
MOTOR_B_X        = 12.0    # ERM B centre (Port 3, diagonal)    HIGH  row 25
MOTOR_B_Y        = 12.0    # ERM B centre (Port 3, diagonal)    HIGH  row 25
ENC_X            = -12.0   # encoder shaft axis (Port 4)        HIGH  row 26
ENC_Y            = 12.0    # encoder shaft axis (Port 4)        HIGH  row 26
ENC_SHAFT_DIA    = 6.0     # encoder Ø6 D-shaft                 HIGH  row 22
# Onboard buttons (file 16 row 9) -------------------------------------------
BTN_X            = 25.76   # 3x button column X                 HIGH  row 9
BTN_Y            = 17.0    # buttons at (25.76, +17 / 0 / -17)  HIGH  row 9
BTN_PLUNGER_TOP  = 2.4     # top-actuated plunger top above board top HIGH row 9
BTN_PLUNGER_DIA  = 2.2     # Ø2.2 plunger                       HIGH  row 9
# Stack-up heights above board top (file 16 §A.4) ---------------------------
MOTOR_TOP        = 15.25   # ERM motor body top (tallest enclosed) HIGH §A.4
LCD_GLASS_TOP    = 13.18   # LCD glass top                      HIGH  §A.4
MODULE_PCB_TOP   = 11.56   # module PCB top                     HIGH  §A.4
ENC_TIP          = 38.25   # encoder shaft tip (protrudes roof) HIGH  §A.4
LCD_GLASS_ENV    = 29.97   # LCD glass envelope length          HIGH  row 20
# -Z (skin side) clearances (file 16 rows 10,11) ----------------------------
NEG_Z_DEEP       = 5.59    # JST-PH hangs 5.59 below PCB bottom HIGH  row 11 (deepest)
# USB-C receptacle (file 16 row 8) ------------------------------------------
USB_REC_ZLO      = -3.29   # receptacle low z rel. PCB bottom   HIGH  row 8
USB_REC_ZHI      = 0.91    # receptacle high z rel. PCB bottom  HIGH  row 8

# --- Design choices (file 16 §D — NOT measurements) -------------------------
BAY_CLEAR        = 1.0     # board bay clearance per side       DESIGN §D (0.5-1.0)
WALL             = 2.5     # cage wall thickness                DESIGN §D (>=2.5)
PLATE_T          = 3.0     # skin plate thickness               DESIGN §D (>=3.0 solid)
NEG_Z_POCKET     = 6.5     # -Z clearance pocket depth          DESIGN §D (>=6.0; 6.5 leaves 0.91 margin over JST -5.59, Phase-4 note)
ROOF_CLEAR       = 1.0     # deck-inner clearance over motor    DESIGN §D
ROOF_THICK       = 2.5     # deck thickness                     DESIGN §D (>=2.5)
LUG_GAP          = 22.0    # internal lug gap = strap width     DESIGN §D (standard, web-confirmed)
LUG_BORE         = 2.6     # lug bore Ø (printed Ø2.5 pin)      DESIGN §D
LUG_W            = 6.0     # lug block X width                  DESIGN
LUG_PROJ         = 5.0     # lug projection past outer wall     DESIGN
LUG_H            = 8.0     # lug block Z height                 DESIGN
LUG_BORE_Z       = -3.0    # lug bore centre Z (low, above plate) DESIGN (clear of LCD relief; lug sits above plate top -8.1)
BOSS_DIA         = 7.0     # M2 boss/standoff outer Ø           DESIGN §D
BOSS_PILOT       = 1.8     # M2 self-tap pilot Ø  DESIGN §D  CORRECTED — reference shell cad/reference/genesis-mini-shell.step (was 2.5)
GUSSET_SQ        = 9.0     # corner gusset pad size (grounds boss to walls) DESIGN
GUSSET_T         = 2.5     # corner gusset thickness            DESIGN
USB_SLOT_W       = 12.0    # USB slot width (Y), cable overmold DESIGN §D (>=12)
USB_SLOT_H       = 7.0     # USB slot height (Z)                DESIGN §D (>=7)
USB_FUNNEL       = 2.0     # USB exterior funnel chamfer        DESIGN 27d/28 exposed rework (was 1.5 — deeper "dock" flare)
USB_DOCK_D       = 1.0     # shallow recessed dock panel around the port  DESIGN 27d/28 exposed rework
ENCODER_BORE     = 20.0    # knob-clearance bore Ø  DESIGN  CORRECTED — encoder can measured r9.32 to model +18.05 (file 34); r10 bore clears it +0.68 (was 16.0)
CHAMFER_VERT     = 3.0     # vertical outer corner chamfer      DESIGN §D
CHAMFER_LUG      = 1.5     # lug outer-edge chamfer             DESIGN §D
CHAMFER_BEZEL    = 1.0     # LCD window-opening bezel chamfer   DESIGN §D (Phase-4 F1c)
BEZEL_MARGIN     = 2.5     # LCD bezel recess margin per side (recess 18.5x32.9) DESIGN 27d/28 exposed rework (was 3.0)
BEZEL_D          = 1.5     # LCD bezel recess depth             DESIGN §D

# --- Monolith deck / rim frame (DESIGN 27d/28 exposed rework) ---------------
FIELD_HALF       = 26.5    # interior reveal-field half-extent = rim inner edge  DESIGN 27d/28 exposed rework
WEB_KEEPOUT      = 1.5     # half-width of retained deck spine at x=0 / y=0 (3.0 cross-web) DESIGN 27d/28 exposed rework
REVEAL_CHAMFER   = 2.5     # 45 deg funnel bevel on interior well top edges   DESIGN 27d/28 exposed rework
CHAMFER_TOP      = 2.0     # 45 deg hazard chamfer on rim top OUTER edge      DESIGN 27d/28 exposed rework
CORNER_CLIP      = 6.0     # one 45 deg clipped corner at (-X,+Y): 12-o'clock datum DESIGN 27d/28 exposed rework
# --- P1 open reveal well (ERM -12,-12) --------------------------------------
P1_XLO           = -26.5   # well opening rim-inner -> spine (25 wide)  DESIGN 27d/28 exposed rework
P1_XHI           = -1.5    # spine side (WEB_KEEPOUT)                    DESIGN 27d/28 exposed rework
P1_YLO           = -26.5   # same in Y                                   DESIGN 27d/28 exposed rework
P1_YHI           = -1.5    # through-deck removal -> no material over coin DESIGN 27d/28 exposed rework
# --- P3 louvre grille (ERM +12,+12) -----------------------------------------
GRILLE_XLO       = 1.5     # grille field low X (stops 2.0 short of trench) DESIGN 27d/28 exposed rework
GRILLE_XHI       = 21.8    # grille field high X                         DESIGN 27d/28 exposed rework
GRILLE_SLOT_W    = 2.0     # slot width (X) >=1.5                        DESIGN 27d/28 exposed rework
GRILLE_PITCH     = 4.0     # 2.0 slot + 2.0 rib                          DESIGN 27d/28 exposed rework
GRILLE_COUNT     = 5       # 5 slots across ~20 mm over the module       DESIGN 27d/28 exposed rework
GRILLE_LEN       = 20.0    # slot length, long axis Y                    DESIGN 27d/28 exposed rework
# --- P4 hex turret (encoder -12,+12) ----------------------------------------
TURRET_AF        = 24.0    # hex across-flats (2.0 wall around Ø20 bore) DESIGN  CORRECTED — encoder can measured r9.32 to model +18.05 (file 34); AF24 keeps 2.0 flats around Ø20 (was 20.0)
TURRET_TOP       = 23.0    # proud 4.25 above rim (scope-mount)          DESIGN 27d/28 exposed rework
TURRET_BORE      = ENCODER_BORE  # knob-clearance bore Ø20 through turret DESIGN (tracks ENCODER_BORE, file 34)
HEXRING_AF       = 28.0    # shallow hex reveal ring around turret base  DESIGN  CORRECTED — scaled to stay outside AF24 turret (was 24.0, file 34)
HEXRING_DEPTH    = 1.5     # ring recess depth (18.75 -> 17.25)          DESIGN 27d/28 exposed rework
# --- Button open trench (25.76, +/-17/0) ------------------------------------
BTN_TRENCH_XLO   = 23.8    # open channel between grille wall and +X inner wall DESIGN 27d/28 exposed rework
BTN_TRENCH_XHI   = 28.5    # (= cavity inner wall)                       DESIGN 27d/28 exposed rework
BTN_TRENCH_HALF_Y = 20.5   # y -20.5..+20.5 covers +/-17 buttons + 3.5   DESIGN 27d/28 exposed rework
# --- LCD -Y side reveal (relief) --------------------------------------------
SIDE_REVEAL_CHAMFER = 1.5  # chamfer the -Y relief mouth as an intentional reveal DESIGN 27d/28 exposed rework
# --- Grafted -X SIDE WINDOW (file 28 §2) ------------------------------------
SIDEWIN_W        = 22.0    # window span along Y, centred y=0 (y -11..+11) DESIGN 27d/28 exposed rework
SIDEWIN_ZLO      = -1.6    # board-bottom                               DESIGN 27d/28 exposed rework
SIDEWIN_ZHI      = 11.0    # module-PCB band top (12.6 tall)            DESIGN 27d/28 exposed rework
SIDEWIN_CHAMF    = 5.0     # 45 deg chamfer on ALL FOUR corners (octagon) DESIGN 27d/28 exposed rework
# --- Skin-plate screw features (reference-shell corrected) ------------------
PLATE_CB_DIA     = 4.0     # plate counterbore Ø (M2 head)  DESIGN  CORRECTED — reference shell cad/reference/genesis-mini-shell.step (was 6.0)
PLATE_CB_D       = 2.0     # plate counterbore depth, flush M2 head  DESIGN  CORRECTED — reference shell cad/reference/genesis-mini-shell.step (was 1.5)
PLATE_HOLE_DIA   = 2.4     # M2 clearance through-hole in skin plate  DESIGN  CORRECTED — reference shell cad/reference/genesis-mini-shell.step (was BOARD_HOLE_DIA 3.4)

# --- Derived Z-map (board top = 0) ------------------------------------------
Z_BOARD_TOP   = 0.0
Z_BOARD_BOT   = -BOARD_THICK                       # -1.6
Z_POCKET_FL   = Z_BOARD_BOT - NEG_Z_POCKET         # -8.1  (-Z pocket floor / plate top)
Z_PLATE_TOP   = Z_POCKET_FL                        # -8.1
Z_PLATE_BOT   = Z_PLATE_TOP - PLATE_T              # -11.1
Z_ROOF_INNER  = MOTOR_TOP + ROOF_CLEAR             # +16.25
Z_ROOF_OUTER  = Z_ROOF_INNER + ROOF_THICK          # +18.75
DECK_INNER    = Z_ROOF_INNER                       # +16.25 (deck underside / over-motor floor)
DECK_TOP      = Z_ROOF_OUTER                        # +18.75 (deck top / rim top)
Z_THRU_TOP    = Z_ROOF_OUTER + 0.15                # +18.9  through-deck cut over-run
CAVITY        = BOARD_BAY + 2.0 * BAY_CLEAR         # 57.0
CAGE_OUTER    = BOARD_BAY + 2.0 * BAY_CLEAR + 2.0 * WALL   # 62.0
CAGE_HALF     = CAGE_OUTER / 2.0                    # 31.0
CAVITY_HALF   = CAVITY / 2.0                        # 28.5
USB_SLOT_CZ   = (USB_REC_ZLO + USB_REC_ZHI) / 2.0 + Z_BOARD_BOT  # receptacle mid, in model Z


# =============================================================================
# GLOBALS filled in run()
# =============================================================================
_app = None
_ui = None
_comp = None          # the enclosure component
_cage = None          # the "cage" BRepBody
_skipped = []         # cosmetic features that were skipped (shown at the end)


# -----------------------------------------------------------------------------
# Small geometry helpers
# -----------------------------------------------------------------------------
def _pt(x_mm, y_mm, z_mm=0.0):
    return adsk.core.Point3D.create(x_mm / 10.0, y_mm / 10.0, z_mm / 10.0)


def _offset_plane(base_plane, z_mm):
    """A construction plane parallel to base_plane, offset by z_mm."""
    planes = _comp.constructionPlanes
    pin = planes.createInput()
    pin.setByOffset(base_plane, _cm(z_mm))
    return planes.add(pin)


def _rect_profile(sketch, cx, cy, w, h):
    """Draw a centred axis-aligned rectangle; return the enclosed profile."""
    lines = sketch.sketchCurves.sketchLines
    lines.addTwoPointRectangle(
        _pt(cx - w / 2.0, cy - h / 2.0),
        _pt(cx + w / 2.0, cy + h / 2.0),
    )
    return sketch.profiles.item(sketch.profiles.count - 1)


def _extrude(profile, dist_mm, operation, start_plane_is_xy_at=None):
    """Extrude a profile a signed distance (mm) with the given operation."""
    ext = _comp.features.extrudeFeatures
    return ext.addSimple(profile, _cm(dist_mm), operation)


def _extrude_symmetric(profile, total_mm, operation):
    """Two-sided (symmetric) extrude of TOTAL length total_mm, centred on the
    profile's own sketch plane.  Unlike addSimple's ONE-sided signed distance,
    a symmetric extent reaches the target body regardless of the construction
    plane's normal SIGN or its in-plane axis orientation -- the robust idiom for
    cuts sketched on OFFSET yZ construction planes, whose sketch frame is not
    guaranteed to map sketch axes to model +Y/+Z or +distance to model +X.
    (help.autodesk.com ExtrudeFeatures_createInput.htm ;
     help.autodesk.com ExtrudeInput_setSymmetricExtent.htm -- isFullLength=True
     => total_mm is the FULL length, i.e. +/- total_mm/2 about the plane.)"""
    ext = _comp.features.extrudeFeatures
    ein = ext.createInput(profile, operation)
    ein.setSymmetricExtent(_cm(total_mm), True, adsk.core.ValueInput.createByReal(0.0))
    return ext.add(ein)


def _sketch_on_xy_at(z_mm):
    plane = _offset_plane(_comp.xYConstructionPlane, z_mm)
    return _comp.sketches.add(plane)


NEWBODY = adsk.fusion.FeatureOperations.NewBodyFeatureOperation
JOIN = adsk.fusion.FeatureOperations.JoinFeatureOperation
CUT = adsk.fusion.FeatureOperations.CutFeatureOperation


# -----------------------------------------------------------------------------
# User parameters (exposed & editable in the Fusion Parameters dialog).
# Registered via design.userParameters.add(name, ValueInput, "mm", comment).
# NOTE: geometry above is driven by the Python constants of the SAME value, so
# the model is self-consistent; editing a parameter here documents intent (for
# full associativity one would additionally bind each sketch dimension to the
# parameter expression -- out of scope for this build).
# -----------------------------------------------------------------------------
def _register_parameters(design):
    up = design.userParameters
    params = [
        ("board_bay",        BOARD_BAY,      "Host board footprint (HIGH, file16 row1)"),
        ("board_thick",      BOARD_THICK,    "PCB thickness (HIGH, row2)"),
        ("board_hole_x",     BOARD_HOLE_X,   "Screw hole centre offset (HIGH, row3)"),
        ("board_hole_dia",   BOARD_HOLE_DIA, "Board hole dia; M2 slips through (HIGH, row3)"),
        ("bay_clearance",    BAY_CLEAR,      "Board bay clearance/side (DESIGN)"),
        ("wall",             WALL,           "Cage wall (DESIGN >=2.5)"),
        ("plate_t",          PLATE_T,        "Skin plate thickness (DESIGN >=3.0)"),
        ("neg_z_pocket",     NEG_Z_POCKET,   "-Z pocket depth (DESIGN >=6, clears JST -5.59)"),
        ("roof_thick",       ROOF_THICK,     "Deck thickness (DESIGN >=2.5)"),
        ("roof_clear",       ROOF_CLEAR,     "Deck clearance over motor top (DESIGN)"),
        ("deck_top",         DECK_TOP,       "Deck / rim top height (DESIGN 27d/28)"),
        ("deck_inner",       DECK_INNER,     "Deck underside / over-motor floor (DESIGN 27d/28)"),
        ("field_half",       FIELD_HALF,     "Interior reveal-field half-extent (DESIGN 27d/28)"),
        ("reveal_chamfer",   REVEAL_CHAMFER, "45 deg reveal funnel bevel (DESIGN 27d/28)"),
        ("port_ctr",         PORT_CTR,       "Module/port centre offset (HIGH, row4)"),
        ("module_sq",        MODULE_SQ,      "22x22 module PCB (HIGH, row13)"),
        ("module_clear_row", MODULE_CLEAR_ROW, "Pocket row-dir clearance (HIGH, row28)"),
        ("lcd_pcb_cx",       LCD_PCB_CX,     "LCD PCB centre X (HIGH, row27)"),
        ("lcd_pcb_cy",       LCD_PCB_CY,     "LCD PCB centre Y (HIGH, row27)"),
        ("lcd_win_cx",       LCD_WIN_CX,     "LCD window centre X (HIGH, C12)"),
        ("lcd_win_cy",       LCD_WIN_CY,     "LCD window centre Y (HIGH, C12)"),
        ("lcd_win_w",        LCD_WIN_W,      "LCD window X (HIGH, row20)"),
        ("lcd_win_h",        LCD_WIN_H,      "LCD window Y (HIGH, row20)"),
        ("bezel_margin",     BEZEL_MARGIN,   "LCD bezel recess margin/side (DESIGN 27d/28)"),
        ("enc_x",            ENC_X,          "Encoder shaft X (HIGH, row26)"),
        ("enc_y",            ENC_Y,          "Encoder shaft Y (HIGH, row26)"),
        ("enc_shaft_dia",    ENC_SHAFT_DIA,  "Encoder shaft Ø (HIGH, row22)"),
        ("encoder_bore",     ENCODER_BORE,   "Knob clearance bore (DESIGN)"),
        ("turret_af",        TURRET_AF,      "Hex turret across-flats (DESIGN 27d/28)"),
        ("turret_top",       TURRET_TOP,     "Proud hex turret top Z (DESIGN 27d/28)"),
        ("grille_slot_w",    GRILLE_SLOT_W,  "Louvre slot width (DESIGN 27d/28)"),
        ("grille_pitch",     GRILLE_PITCH,   "Louvre slot pitch (DESIGN 27d/28)"),
        ("grille_count",     float(GRILLE_COUNT), "Louvre slot count (DESIGN 27d/28)"),
        ("btn_x",            BTN_X,          "Button column X (HIGH, row9)"),
        ("btn_y",            BTN_Y,          "Button +/-Y offset (HIGH, row9)"),
        ("btn_trench_half_y", BTN_TRENCH_HALF_Y, "Button open-trench half length Y (DESIGN 27d/28)"),
        ("usb_slot_w",       USB_SLOT_W,     "USB slot width (DESIGN >=12)"),
        ("usb_slot_h",       USB_SLOT_H,     "USB slot height (DESIGN >=7)"),
        ("usb_dock_d",       USB_DOCK_D,     "USB dock recess depth (DESIGN 27d/28)"),
        ("sidewin_w",        SIDEWIN_W,      "-X side window span Y (DESIGN 27d/28)"),
        ("sidewin_zhi",      SIDEWIN_ZHI,    "-X side window top Z (DESIGN 27d/28)"),
        ("lug_gap",          LUG_GAP,        "Internal lug gap = strap width (DESIGN)"),
        ("lug_bore",         LUG_BORE,       "Lug bore Ø (DESIGN)"),
        ("boss_dia",         BOSS_DIA,       "M2 boss/standoff Ø (DESIGN)"),
        ("boss_pilot",       BOSS_PILOT,     "M2 self-tap pilot Ø (DESIGN)"),
        ("plate_hole_dia",   PLATE_HOLE_DIA, "Plate M2 clearance hole (CORRECTED, reference shell)"),
        ("chamfer_vert",     CHAMFER_VERT,   "Vertical outer corner chamfer (DESIGN)"),
        ("corner_clip",      CORNER_CLIP,    "12-o'clock datum corner clip (DESIGN 27d/28)"),
    ]
    for name, value, comment in params:
        try:
            up.add(name, _cm(value), "mm", comment)
        except Exception:
            # a name clash (re-run into same doc) is non-fatal
            pass


# =============================================================================
# BUILD STEPS
# =============================================================================
def _build_cage_block():
    """Step 1: outer 62x62 solid block from plate-bottom to deck-top."""
    global _cage
    sk = _sketch_on_xy_at(Z_PLATE_BOT)
    prof = _rect_profile(sk, 0, 0, CAGE_OUTER, CAGE_OUTER)   # 62x62  DESIGN §A.5
    feat = _extrude(prof, DECK_TOP - Z_PLATE_BOT, NEWBODY)   # 29.85 mm tall
    _cage = feat.bodies.item(0)
    _cage.name = "cage"


def _cut_cavity():
    """Step 2: hollow the interior 57x57 from the open bottom up to deck-inner."""
    sk = _sketch_on_xy_at(Z_PLATE_BOT)
    prof = _rect_profile(sk, 0, 0, CAVITY, CAVITY)          # 57x57  (board_bay + 2*clear)
    _extrude(prof, DECK_INNER - Z_PLATE_BOT, CUT)           # leaves 2.5 walls + 2.5 deck, open bottom


def _add_bosses_and_gussets():
    """Step 3: 4x M2 standoffs (+/-24.1) grounded to the walls by corner gussets."""
    corners = [( BOARD_HOLE_X,  BOARD_HOLE_X),
               ( BOARD_HOLE_X, -BOARD_HOLE_X),
               (-BOARD_HOLE_X,  BOARD_HOLE_X),
               (-BOARD_HOLE_X, -BOARD_HOLE_X)]
    # gussets: floor pads that reach the walls (ground the standoffs)
    for (cx, cy) in corners:
        gx = (CAVITY_HALF - GUSSET_SQ / 2.0) * (1 if cx > 0 else -1)  # push pad into the corner
        gy = (CAVITY_HALF - GUSSET_SQ / 2.0) * (1 if cy > 0 else -1)
        sk = _sketch_on_xy_at(Z_PLATE_TOP)
        prof = _rect_profile(sk, gx, gy, GUSSET_SQ, GUSSET_SQ)
        _extrude(prof, GUSSET_T, JOIN)                      # -8.1 -> -5.6
    # standoffs: Ø7 from plate-top to board-bottom (the 6.5 mm -Z pocket span)
    for (cx, cy) in corners:
        sk = _sketch_on_xy_at(Z_PLATE_TOP)
        sk.sketchCurves.sketchCircles.addByCenterRadius(_pt(cx, cy), BOSS_DIA / 2.0 / 10.0)
        prof = sk.profiles.item(sk.profiles.count - 1)
        _extrude(prof, Z_BOARD_BOT - Z_PLATE_TOP, JOIN)     # -8.1 -> -1.6  (6.5 tall)
    # Ø1.8 M2 self-tap pilot through each standoff (board screw from +Z top,
    # plate screw from -Z bottom, into the shared pilot).
    # Screw shopping note: ~M2x5 board-side / ~M2x6 plate-side self-tapping.
    for (cx, cy) in corners:
        sk = _sketch_on_xy_at(Z_PLATE_TOP)
        sk.sketchCurves.sketchCircles.addByCenterRadius(_pt(cx, cy), BOSS_PILOT / 2.0 / 10.0)
        prof = sk.profiles.item(sk.profiles.count - 1)
        _extrude(prof, Z_BOARD_BOT - Z_PLATE_TOP, CUT)


def _cut_lcd_relief():
    """Step 4: relief notch in the -Y wall for the 2.5 mm LCD PCB overhang."""
    # PCB overhang reaches y = -(BOARD_BAY/2) - LCD_OVERHANG = -30.0 (row 27).
    # Phase-4 fix F1: (a) built from an XY sketch + vertical extrude so there is
    # NO construction-plane normal-sign ambiguity (the old xZ-offset version
    # landed the notch on the +Y wall); (b) widened to the FULL 22 mm PCB width
    # + 1.3 registration clearance per side (the old 5..19 span only cleared
    # the 13.5 mm glass and left the PCB corners colliding).
    y_out = -(BOARD_BAY / 2.0 + LCD_OVERHANG + 0.5)   # -30.5 mm — leaves 0.5 outer web  DESIGN
    y_in = -CAVITY_HALF                               # -28.5 mm — cavity inner wall  derived
    x_w = LCD_PCB_H + 2.0 * MODULE_CLEAR_ROW          # 24.6 mm: 22 PCB + 1.3/side  HIGH rows 14/28
    z_lo, z_hi = 9.5, 15.0                            # mm — module PCB band +10..+14.7 +margin  §C
    sk = _sketch_on_xy_at(z_lo)
    prof = _rect_profile(sk, LCD_PCB_CX, (y_out + y_in) / 2.0, x_w, (y_in - y_out))
    _extrude(prof, z_hi - z_lo, CUT)                  # straight +Z cut, x -0.3..24.3, y -30.5..-28.5


def _cut_p1_well():
    """Step 5: P1 OPEN REVEAL WELL -- through-deck removal over ERM(-12,-12)."""
    cx = (P1_XLO + P1_XHI) / 2.0
    cy = (P1_YLO + P1_YHI) / 2.0
    sk = _sketch_on_xy_at(DECK_INNER)
    prof = _rect_profile(sk, cx, cy, P1_XHI - P1_XLO, P1_YHI - P1_YLO)   # 25 x 25
    _extrude(prof, Z_THRU_TOP - DECK_INNER, CUT)      # 16.25 -> 18.9 through deck (no roof over coin)


def _cut_grille():
    """Step 6: P3 LOUVRE GRILLE -- 5 long-Y slots through the deck over (+12,+12)."""
    half = (GRILLE_COUNT - 1) / 2.0
    for i in range(GRILLE_COUNT):
        cx = MOTOR_B_X + (i - half) * GRILLE_PITCH    # 4,8,12,16,20
        sk = _sketch_on_xy_at(DECK_INNER)
        prof = _rect_profile(sk, cx, MOTOR_B_Y, GRILLE_SLOT_W, GRILLE_LEN)  # 2.0 x 20.0
        _extrude(prof, Z_THRU_TOP - DECK_INNER, CUT)  # 16.25 -> 18.9; slats remain = grille


def _cut_bezel_and_window():
    """Step 7: P2 recessed bezel frame + the LOCKED LCD through-window."""
    # (a) bezel recess 18.5 x 32.9 @ (11.98,-14.38) -> floor +17.25
    sk = _sketch_on_xy_at(DECK_TOP)
    prof = _rect_profile(sk, LCD_WIN_CX, LCD_WIN_CY,
                         LCD_WIN_W + 2.0 * BEZEL_MARGIN, LCD_WIN_H + 2.0 * BEZEL_MARGIN)
    _extrude(prof, -BEZEL_D, CUT)                     # 18.75 -> 17.25 bezel recess
    # (b) LOCKED 13.5 x 27.9 window, through the deck down to LCD glass top +13.18
    sk = _sketch_on_xy_at(DECK_TOP + 2.0)
    prof = _rect_profile(sk, LCD_WIN_CX, LCD_WIN_CY, LCD_WIN_W, LCD_WIN_H)
    _extrude(prof, -(DECK_TOP + 2.0 - LCD_GLASS_TOP), CUT)


def _build_turret():
    """Step 8: P4 PROUD HEX TURRET + hex reveal ring + Ø16 knob bore.

    BUILD-ORDER NOTE (deviation from 27d §4 step 8 sub-order, documented in file
    29): the AF28 hex reveal-ring recess is cut BEFORE the AF24 turret is joined.
    27d lists JOIN(a) then ring-CUT(b); executed literally, a solid AF28 recess
    cut 1.5 deep would slice straight through the AF24 turret base (AF24 < AF28)
    and SEVER the proud column from the deck.  Cutting the ring first, then
    joining the turret, fills the AF24 footprint back to +23 and leaves the reveal
    ring only in the AF28-AF24 annulus -- exactly the described geometry, connected.

    ENCODER-CAN CLEARANCE (file 34 M1): the roof/turret band +16.25..+18.05 must
    clear the encoder can (measured r9.32 to model +18.05); the Ø20 bore (r10)
    clears it with +0.68 mm.  AF24 keeps a 2.0 mm wall at the hex flats around the
    Ø20 bore; AF28 ring stays outside the AF24 turret (its +Y vertex reaches
    y +28.17, inboard of the 28.5 wall, so the rim is not thinned -- see file 34).
    """
    # (a) hex AF28 reveal-ring recess in the deck (18.75 -> 17.25)
    _cut_hex_recess(ENC_X, ENC_Y, HEXRING_AF, HEXRING_DEPTH)
    # (b) hex AF24 turret JOIN, deck-inner up to the proud top +23.0
    _join_hex_column(ENC_X, ENC_Y, TURRET_AF, DECK_INNER, TURRET_TOP)
    # (c) Ø20 knob-clearance bore down through the turret, past +13 (encoder datum)
    sk = _sketch_on_xy_at(TURRET_TOP + 0.5)           # start above the proud top
    sk.sketchCurves.sketchCircles.addByCenterRadius(_pt(ENC_X, ENC_Y), TURRET_BORE / 2.0 / 10.0)
    prof = sk.profiles.item(sk.profiles.count - 1)
    _extrude(prof, -(TURRET_TOP + 0.5 - 12.9), CUT)   # to +12.9: guaranteed past +13


def _hex_pts_uv():
    """The exact unit-hexagon vertices for a flat-topped hex (no math import;
    imports restricted to adsk.* + traceback).  Angles 30,90,...,330 deg."""
    return [(0.8660254, 0.5), (0.0, 1.0), (-0.8660254, 0.5),
            (-0.8660254, -0.5), (0.0, -1.0), (0.8660254, -0.5)]


def _cut_hex_recess(cx, cy, af, depth):
    """Hexagonal recess (across-flats = af) on the deck top face."""
    r = af / 2.0 / 0.8660254037844387                  # circumradius = (af/2)/cos30
    sk = _sketch_on_xy_at(DECK_TOP)
    lines = sk.sketchCurves.sketchLines
    pts = [_pt(cx + r * u, cy + r * v) for (u, v) in _hex_pts_uv()]
    for i in range(6):
        lines.addByTwoPoints(pts[i], pts[(i + 1) % 6])
    prof = sk.profiles.item(sk.profiles.count - 1)
    _extrude(prof, -depth, CUT)


def _join_hex_column(cx, cy, af, z_lo, z_hi):
    """Solid hexagonal column (across-flats = af) JOINed from z_lo up to z_hi."""
    r = af / 2.0 / 0.8660254037844387
    sk = _sketch_on_xy_at(z_lo)
    lines = sk.sketchCurves.sketchLines
    pts = [_pt(cx + r * u, cy + r * v) for (u, v) in _hex_pts_uv()]
    for i in range(6):
        lines.addByTwoPoints(pts[i], pts[(i + 1) % 6])
    prof = sk.profiles.item(sk.profiles.count - 1)
    _extrude(prof, z_hi - z_lo, JOIN)


def _cut_usb_slot():
    """Step 9: USB-C slot through the +X wall, centred Y=0."""
    # ORIENTATION HARDENING (same root cause as the _add_lugs fix below; live
    # Fusion 2026): the sketch frame on an OFFSET yZConstructionPlane is NOT
    # guaranteed to map sketch-X -> model +Y / sketch-Y -> model +Z, nor is
    # addSimple's +distance guaranteed to run model +X. The old raw-coordinate
    # rectangle + one-sided +X addSimple could therefore mirror the slot to the
    # WRONG model Z (+2.79 instead of -2.79, reflected about the plane origin)
    # even though it did not crash (the slot is Y-symmetric and tall enough to
    # hit the wall regardless). FIX: derive both rectangle corners from MODEL
    # coords via sketch.modelToSketchSpace(), and cut with a SYMMETRIC extent
    # that pierces the +X wall whichever way the plane normal points.
    #   help.autodesk.com Sketch_modelToSketchSpace.htm
    #   help.autodesk.com ExtrudeInput_setSymmetricExtent.htm
    x_start = CAVITY_HALF - 1.5                          # 27.0, just inside cavity
    plane = _offset_plane(_comp.yZConstructionPlane, x_start)  # plane at model X=27.0
    sk = _comp.sketches.add(plane)
    # MODEL-space opposite corners (y = +/-W/2, z = CZ +/- H/2, at the plane's X):
    c0 = sk.modelToSketchSpace(_pt(x_start, -USB_SLOT_W / 2.0, USB_SLOT_CZ - USB_SLOT_H / 2.0))
    c1 = sk.modelToSketchSpace(_pt(x_start,  USB_SLOT_W / 2.0, USB_SLOT_CZ + USB_SLOT_H / 2.0))
    sk.sketchCurves.sketchLines.addTwoPointRectangle(c0, c1)
    prof = sk.profiles.item(sk.profiles.count - 1)
    # Symmetric FULL length 2*((CAGE_HALF - x_start) + 2.0) = 12.0 mm about X=27.0
    # -> the cut spans model X 21.0 .. 33.0: it exits the +X outer wall (31.0) by
    # 2 mm, and its -X reach (21.0) stops 49.5 mm short of the -X inner wall
    # (-28.5), so it CANNOT nick the opposite wall.  (The 21.0..28.5 stretch is
    # hollow cavity, so the extra inward reach removes nothing.)
    _extrude_symmetric(prof, 2.0 * ((CAGE_HALF - x_start) + 2.0), CUT)


def _cut_usb_dock():
    """Step 9b: shallow recessed dock panel framing the USB port on the +X face.
    Cosmetic exposed-port cue -- does NOT thin the ~2.1 mm front web (only the
    outer USB_DOCK_D of the 2.5 wall is relieved)."""
    try:
        x_face = CAGE_HALF                              # 31.0 (+X outer face)
        plane = _offset_plane(_comp.yZConstructionPlane, x_face)
        sk = _comp.sketches.add(plane)
        w = USB_SLOT_W + 4.0                            # 16 (Y)
        h = USB_SLOT_H + 3.0                            # 10 (Z)
        c0 = sk.modelToSketchSpace(_pt(x_face, -w / 2.0, USB_SLOT_CZ - h / 2.0))
        c1 = sk.modelToSketchSpace(_pt(x_face,  w / 2.0, USB_SLOT_CZ + h / 2.0))
        sk.sketchCurves.sketchLines.addTwoPointRectangle(c0, c1)
        prof = sk.profiles.item(sk.profiles.count - 1)
        # symmetric 2*USB_DOCK_D about X=31 -> spans X 30..32: relieves the outer
        # 1.0 mm of wall (30..31), the 31..32 half is empty air (removes nothing).
        _extrude_symmetric(prof, 2.0 * USB_DOCK_D, CUT)
    except Exception:
        _skipped.append("USB dock recess")


def _cut_side_window():
    """Step 9c (file 28 §2): skeletal SIDE WINDOW through the -X wall -- an
    octagonal aperture (22 x 12.6, 45 deg on all four corners) exposing the green
    PCB edge + socket stack.  Orientation-proof: MODEL-space corners via
    modelToSketchSpace on an offset yZ plane + a symmetric extent through the wall."""
    x_wall = -CAGE_HALF                                 # -31 (-X outer face)
    plane = _offset_plane(_comp.yZConstructionPlane, x_wall)
    sk = _comp.sketches.add(plane)
    ylo, yhi = -SIDEWIN_W / 2.0, SIDEWIN_W / 2.0        # -11 .. +11
    zlo, zhi = SIDEWIN_ZLO, SIDEWIN_ZHI                 # -1.6 .. +11
    c = SIDEWIN_CHAMF                                    # 5.0 corner cut
    # octagon corners in MODEL (x=-31, y, z), CCW; 45 deg flats at each rect corner
    corners_model = [
        (ylo + c, zlo), (yhi - c, zlo),
        (yhi, zlo + c), (yhi, zhi - c),
        (yhi - c, zhi), (ylo + c, zhi),
        (ylo, zhi - c), (ylo, zlo + c),
    ]
    pts = [sk.modelToSketchSpace(_pt(x_wall, y, z)) for (y, z) in corners_model]
    lines = sk.sketchCurves.sketchLines
    for i in range(8):
        lines.addByTwoPoints(pts[i], pts[(i + 1) % 8])
    prof = sk.profiles.item(sk.profiles.count - 1)
    # symmetric FULL 2*(WALL+1.0)=7.0 about X=-31 -> spans X -34.5..-27.5: pierces
    # the 2.5 -X wall (-31..-28.5); the -27.5 reach is open cavity (removes nothing).
    _extrude_symmetric(prof, 2.0 * (WALL + 1.0), CUT)


def _cut_button_trench():
    """Step 10: BUTTON OPEN TRENCH -- deck removed over the 3 plungers (no shelf,
    no tool-holes); plungers stand visible, 0 mm cover."""
    cx = (BTN_TRENCH_XLO + BTN_TRENCH_XHI) / 2.0
    w = BTN_TRENCH_XHI - BTN_TRENCH_XLO
    h = 2.0 * BTN_TRENCH_HALF_Y                          # 41 -> y -20.5..+20.5
    sk = _sketch_on_xy_at(Z_THRU_TOP)
    prof = _rect_profile(sk, cx, 0.0, w, h)
    _extrude(prof, -(Z_THRU_TOP - DECK_INNER), CUT)      # 18.9 -> 16.25 opens to cavity


def _add_lugs():
    """Step 11: 2 lug pairs on +/-Y walls, gap 22.0, Ø2.6 through bores."""
    # inner faces of a pair at +/-(LUG_GAP/2); block centres at +/-(LUG_GAP/2 + LUG_W/2)
    x_ctr = LUG_GAP / 2.0 + LUG_W / 2.0                 # 14.0
    y_root = CAVITY_HALF                                # 28.5 (flush w/ wall inner; stays OUT of the board bay)
    y_tip = CAGE_HALF + LUG_PROJ                        # 36.0
    y_mid = (y_root + y_tip) / 2.0
    for sign in (1, -1):                                # +Y then -Y wall
        for xs in (1, -1):                              # two lugs per pair
            cx = xs * x_ctr
            # lug block
            sk = _sketch_on_xy_at(LUG_BORE_Z - LUG_H / 2.0)
            prof = _rect_profile(sk, cx, sign * y_mid, LUG_W, (y_tip - y_root))
            _extrude(prof, LUG_H, JOIN)
            # Ø2.6 bore along X through the lug.  FIT feature — deliberately NOT
            # wrapped in the cosmetic fallback (Phase-4 W2): if this fails the
            # run must abort loudly, not report "fit geometry unaffected".
            #
            # LIVE-FUSION RUNTIME ERROR (2026 build, step 8):
            #   "RuntimeError: 3 : No target body found to cut or intersect!"
            #   raised by addSimple on the FIRST lug bore.
            # ROOT CAUSE: the old code sketched the circle on an OFFSET
            # yZConstructionPlane using RAW sketch-space coords
            # _pt(sign*y_mid, LUG_BORE_Z) and a one-sided +X addSimple. That
            # assumes sketch-X -> model +Y, sketch-Y -> model +Z, and +distance ->
            # model +X. The sketch frame on a yZ-parallel plane does NOT guarantee
            # those axis/sign mappings, so the cylinder landed at a mirrored/shifted
            # location (e.g. -Y on the +Y-first iteration, where no lug body yet
            # exists) and/or extruded away from the lug -> the cut tool intersects
            # no body.
            # FIX (orientation-proof): build the bore centre from intended MODEL
            # coords via sketch.modelToSketchSpace(), put the sketch plane AT the
            # lug mid-plane (model X=cx), and cut with a SYMMETRIC extent so it
            # pierces the whole LUG_W=6 block (x cx-3..cx+3) from BOTH ends
            # regardless of the plane's normal sign.
            #   help.autodesk.com Sketch_modelToSketchSpace.htm
            #   help.autodesk.com ExtrudeInput_setSymmetricExtent.htm
            plane = _offset_plane(_comp.yZConstructionPlane, cx)   # plane AT mid-lug (model X=cx)
            sk2 = _comp.sketches.add(plane)
            ctr = sk2.modelToSketchSpace(_pt(cx, sign * y_mid, LUG_BORE_Z))  # MODEL->sketch
            sk2.sketchCurves.sketchCircles.addByCenterRadius(ctr, LUG_BORE / 2.0 / 10.0)
            prof2 = sk2.profiles.item(sk2.profiles.count - 1)
            # symmetric FULL length LUG_W+2 = 8 mm about X=cx -> cuts model X
            # cx-4..cx+4, fully piercing the LUG_W=6 lug (cx-3..cx+3) from both ends.
            _extrude_symmetric(prof2, LUG_W + 2.0, CUT)


def _build_skin_plate():
    """Step 13: the solid skin plate (2nd body) + 4 corner counterbores."""
    sk = _sketch_on_xy_at(Z_PLATE_BOT)
    prof = _rect_profile(sk, 0, 0, CAVITY, CAVITY)     # 57x57 fills the cavity bottom
    feat = _extrude(prof, PLATE_T, NEWBODY)            # -11.1 -> -8.1
    plate = feat.bodies.item(0)
    plate.name = "skin_plate"
    # 4 counterbores at the board-hole corners (screws thread up into the standoffs)
    corners = [( BOARD_HOLE_X,  BOARD_HOLE_X), ( BOARD_HOLE_X, -BOARD_HOLE_X),
               (-BOARD_HOLE_X,  BOARD_HOLE_X), (-BOARD_HOLE_X, -BOARD_HOLE_X)]
    for (cx, cy) in corners:
        # through clearance -- M2 clearance (Ø2.4), NOT the board hole Ø3.4.
        # The M3->M2 screw switch (reference shell) shrinks the head recess to
        # Ø4.0; a Ø3.4 through-hole under a Ø4.0 head recess would leave only a
        # 0.3 mm bearing ring, so the plate through-hole becomes M2 clearance.
        sk = _sketch_on_xy_at(Z_PLATE_BOT)
        sk.sketchCurves.sketchCircles.addByCenterRadius(_pt(cx, cy), PLATE_HOLE_DIA / 2.0 / 10.0)
        _extrude(sk.profiles.item(sk.profiles.count - 1), PLATE_T, CUT)
        # counterbore for the M2 head on the wrist face
        sk = _sketch_on_xy_at(Z_PLATE_BOT)
        sk.sketchCurves.sketchCircles.addByCenterRadius(_pt(cx, cy), PLATE_CB_DIA / 2.0 / 10.0)
        _extrude(sk.profiles.item(sk.profiles.count - 1), PLATE_CB_D, CUT)


# -----------------------------------------------------------------------------
# Chamfers (deterministic edge selection; cosmetic -> degrade gracefully)
# -----------------------------------------------------------------------------
def _edge_is_vertical(edge):
    g = edge.geometry
    if g.objectType != adsk.core.Line3D.classType():
        return None
    sp = g.startPoint
    ep = g.endPoint
    dx, dy, dz = ep.x - sp.x, ep.y - sp.y, ep.z - sp.z
    length = (dx * dx + dy * dy + dz * dz) ** 0.5
    if length < 1e-6:
        return None
    # vertical == direction essentially +/-Z
    if abs(dz) / length < 0.99:
        return None
    mx = (sp.x + ep.x) / 2.0 * 10.0     # back to mm
    my = (sp.y + ep.y) / 2.0 * 10.0
    return (mx, my)


def _horizontal_edge_mid(edge):
    """Return (mx, my, mz) in mm for a straight HORIZONTAL edge, else None."""
    g = edge.geometry
    if g.objectType != adsk.core.Line3D.classType():
        return None
    sp, ep = g.startPoint, g.endPoint
    if abs(ep.z - sp.z) > 1e-6:
        return None
    return ((sp.x + ep.x) / 2.0 * 10.0,
            (sp.y + ep.y) / 2.0 * 10.0,
            (sp.z + ep.z) / 2.0 * 10.0)


def _apply_equal_chamfer(edges, distance_mm, both):
    chamfers = _comp.features.chamferFeatures
    cin = chamfers.createInput2()
    cin.chamferEdgeSets.addEqualDistanceChamferEdgeSet(edges, _cm(distance_mm), both)
    chamfers.add(cin)


def _reveal_chamfers():
    """REVEAL_CHAMFER 2.5 on the interior reveal-well mouths (P1 well and P2
    bezel ONLY) at the deck top.  Position-filtered to EXCLUDE (a) the ~1-2 mm
    P2/P3 spine sliver (file 28 §1 amendment) and (b) the ENTIRE P3 grille field
    (file 30 review F1): a 2.5 chamfer on the grille's 2.0 slots / 2.0 ribs
    over-consumes the geometry and would error the chamfer feature in real
    Fusion, silently skipping every reveal chamfer.  Grille slot mouths stay
    crisp-edged by design."""
    try:
        edges = adsk.core.ObjectCollection.create()
        for edge in _cage.edges:
            m = _horizontal_edge_mid(edge)
            if m is None:
                continue
            mx, my, mz = m
            if abs(mz - DECK_TOP) > 0.3:                # deck-top mouths only
                continue
            if abs(mx) > FIELD_HALF + 0.2 or abs(my) > FIELD_HALF + 0.2:
                continue                                # interior field only (rim excluded)
            if mx < 0.0 and my > 0.0:                   # P4 turret quadrant (own hex language)
                continue
            if mx > 22.0:                               # button trench (own language)
                continue
            # GRILLE GUARD (file 30 F1) — supersedes the narrower sliver guard:
            # exclude the ENTIRE P3 grille field (its 2.0 slot/rib rims cannot
            # take a 2.5 chamfer; one bad edge errors the whole feature in real
            # Fusion).  This also covers the P2/P3 spine sliver band (file 28 §1).
            if my > -0.5 and GRILLE_XLO - 0.5 <= mx <= GRILLE_XHI + 0.5:
                continue
            edges.add(edge)
        if edges.count == 0:
            _skipped.append("reveal chamfers (no edges matched)")
            return
        _apply_equal_chamfer(edges, REVEAL_CHAMFER, True)
    except Exception:
        _skipped.append("reveal chamfers (exception)")


def _chamfer_rim_top():
    """CHAMFER_TOP 2.0 hazard chamfer on the rim TOP outer perimeter edge."""
    try:
        edges = adsk.core.ObjectCollection.create()
        for edge in _cage.edges:
            m = _horizontal_edge_mid(edge)
            if m is None:
                continue
            mx, my, mz = m
            if abs(mz - DECK_TOP) > 0.3:
                continue
            if abs(mx) > CAGE_HALF - 0.6 or abs(my) > CAGE_HALF - 0.6:
                edges.add(edge)
        if edges.count == 0:
            _skipped.append("rim top chamfer (no edges matched)")
            return
        _apply_equal_chamfer(edges, CHAMFER_TOP, True)
    except Exception:
        _skipped.append("rim top chamfer (exception)")


def _chamfer_vertical_corners():
    """CHAMFER_VERT 3.0 on THREE vertical outer corners (all but (-X,+Y))."""
    try:
        edges = adsk.core.ObjectCollection.create()
        for edge in _cage.edges:
            res = _edge_is_vertical(edge)
            if res is None:
                continue
            mx, my = res
            if abs(mx) > CAGE_HALF - 1.0 and abs(my) > CAGE_HALF - 1.0:
                if mx < 0.0 and my > 0.0:               # reserved for the corner clip
                    continue
                edges.add(edge)
        if edges.count == 0:
            _skipped.append("vertical corner chamfers (no edges matched)")
            return
        _apply_equal_chamfer(edges, CHAMFER_VERT, True)
    except Exception:
        _skipped.append("vertical corner chamfers (exception)")


def _chamfer_corner_clip():
    """CORNER_CLIP 6.0 -- the single big 12-o'clock datum chamfer at (-X,+Y)."""
    try:
        edges = adsk.core.ObjectCollection.create()
        for edge in _cage.edges:
            res = _edge_is_vertical(edge)
            if res is None:
                continue
            mx, my = res
            if (abs(mx) > CAGE_HALF - 1.0 and abs(my) > CAGE_HALF - 1.0
                    and mx < 0.0 and my > 0.0):
                edges.add(edge)
        if edges.count == 0:
            _skipped.append("corner clip (no edges matched)")
            return
        _apply_equal_chamfer(edges, CORNER_CLIP, True)
    except Exception:
        _skipped.append("corner clip (exception)")


def _chamfer_usb_funnel():
    """USB_FUNNEL 2.0 funnel chamfer on the exterior long edges of the USB slot
    (at the dock-recess floor if the dock cut succeeded, else at the outer face)."""
    try:
        edges = adsk.core.ObjectCollection.create()
        for edge in _cage.edges:
            g = edge.geometry
            if g.objectType != adsk.core.Line3D.classType():
                continue
            sp, ep = g.startPoint, g.endPoint
            # horizontal (Y-running) edges lying in a constant-X plane on the +X face
            if abs(ep.z - sp.z) > 1e-6:
                continue
            if abs(ep.x - sp.x) > 1e-6:
                continue
            mx = (sp.x + ep.x) / 2.0 * 10.0
            mz = (sp.z + ep.z) / 2.0 * 10.0
            if mx > CAGE_HALF - USB_DOCK_D - 0.6 and abs(mz - USB_SLOT_CZ) < USB_SLOT_H / 2.0 + 0.5:
                edges.add(edge)
        if edges.count:
            _apply_equal_chamfer(edges, USB_FUNNEL, True)
        else:
            _skipped.append("USB funnel chamfer (no edges matched)")
    except Exception:
        _skipped.append("USB funnel chamfer (exception)")


def _chamfer_lugs():
    """CHAMFER_LUG 1.5 chamfer on the outer (tip) face edges of the 4 lug blocks."""
    try:
        y_tip = CAGE_HALF + LUG_PROJ                    # 36.0 — nothing else reaches |y| > 31
        edges = adsk.core.ObjectCollection.create()
        for edge in _cage.edges:
            g = edge.geometry
            if g.objectType != adsk.core.Line3D.classType():
                continue
            sp, ep = g.startPoint, g.endPoint
            my = (sp.y + ep.y) / 2.0 * 10.0             # back to mm
            if abs(my) > y_tip - 0.2:                   # edges bounding the lug tip faces
                edges.add(edge)
        if edges.count == 0:
            _skipped.append("lug chamfers (no edges matched)")
            return
        _apply_equal_chamfer(edges, CHAMFER_LUG, False)
    except Exception:
        _skipped.append("lug chamfers (exception)")


def _chamfer_lcd_bezel():
    """CHAMFER_BEZEL 1.0 chamfer on the LCD window-opening edges at the bezel floor."""
    try:
        z_floor = DECK_TOP - BEZEL_D                    # 17.25 — window opening edge level
        edges = adsk.core.ObjectCollection.create()
        for edge in _cage.edges:
            m = _horizontal_edge_mid(edge)
            if m is None:
                continue
            mx, my, mz = m
            if abs(mz - z_floor) > 0.2:                 # bezel floor level only
                continue
            # window-perimeter edges only (bezel-recess outer boundary is farther out)
            if (abs(mx - LCD_WIN_CX) < LCD_WIN_W / 2.0 + 0.5 and
                    abs(my - LCD_WIN_CY) < LCD_WIN_H / 2.0 + 0.5):
                edges.add(edge)
        if edges.count == 0:
            _skipped.append("LCD bezel chamfer (no edges matched)")
            return
        _apply_equal_chamfer(edges, CHAMFER_BEZEL, False)
    except Exception:
        _skipped.append("LCD bezel chamfer (exception)")


def _chamfer_side_reveal():
    """SIDE_REVEAL_CHAMFER 1.5 on the -Y LCD relief mouth -- celebrate the relief
    as an intentional side reveal showing the LCD PCB edge."""
    try:
        edges = adsk.core.ObjectCollection.create()
        for edge in _cage.edges:
            m = _horizontal_edge_mid(edge)
            if m is None:
                continue
            mx, my, mz = m
            if abs(mz - 15.0) > 0.3:                    # relief top face (z_hi = 15.0)
                continue
            if -31.0 <= my <= -28.0 and -1.5 <= mx <= 25.0:
                edges.add(edge)
        if edges.count == 0:
            _skipped.append("side reveal chamfer (no edges matched)")
            return
        _apply_equal_chamfer(edges, SIDE_REVEAL_CHAMFER, False)
    except Exception:
        _skipped.append("side reveal chamfer (exception)")


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
        # PART vs ASSEMBLY document restriction (Fusion 2026 builds):
        # A "Part Design" document may contain exactly ONE component (its
        # rootComponent); calling root.occurrences.addNewComponent() there
        # raises:
        #   RuntimeError: 3 : Failed to create component: Part Design documents
        #   can only contain one component, please add this Part to an Assembly
        #   to add multiple components.
        # "Assembly" (and legacy/hybrid multi-component) documents allow child
        # components, so we prefer the child-component behaviour and fall back
        # to modelling directly into rootComponent when it is disallowed.
        # NOTE: this restriction is on multiple COMPONENTS only -- multiple
        # BODIES in one component are always allowed, so this script's two
        # bodies (cage + skin_plate) are fine in a Part document.
        root = design.rootComponent
        try:
            occ = root.occurrences.addNewComponent(adsk.core.Matrix3D.create())
            _comp = occ.component
            _comp.name = "BrailleWearableEnclosure"
        except Exception:
            # Part Design document: build into the single root component.
            _comp = root
            try:
                _comp.name = "BrailleWearableEnclosure"
            except Exception:
                pass  # renaming the root component may be disallowed; non-fatal

        _register_parameters(design)

        # --- Ordered timeline (design 27d §4 build sequence + file 28 graft) --
        _build_cage_block()             # 1  outer 62x62 block
        _cut_cavity()                   # 2  hollow 57x57 interior, open wrist side
        _add_bosses_and_gussets()       # 3  4x M2 standoffs + gussets + pilots
        _cut_lcd_relief()               # 4  -Y wall relief for LCD overhang
        _cut_p1_well()                  # 5  P1 open reveal well (ERM -12,-12)
        _cut_grille()                   # 6  P3 louvre grille (ERM +12,+12)
        _cut_bezel_and_window()         # 7  P2 bezel recess + LOCKED LCD window
        _build_turret()                 # 8  P4 hex turret + reveal ring + Ø16 bore
        _cut_usb_slot()                 # 9  USB-C slot through +X wall
        _cut_usb_dock()                 # 9b USB dock recess panel (cosmetic)
        _cut_side_window()              # 9c -X skeletal side window (file 28)
        _cut_button_trench()            # 10 button open trench (no shelf/holes)
        _add_lugs()                     # 11 2 lug pairs, gap 22, Ø2.6 bores
        # 12 reveal + edge chamfers (all cosmetic -> graceful skip)
        _reveal_chamfers()              # 12a REVEAL_CHAMFER 2.5 well mouths (sliver-safe)
        _chamfer_rim_top()              # 12b CHAMFER_TOP 2.0 rim top outer edge
        _chamfer_vertical_corners()     # 12c CHAMFER_VERT 3.0 on 3 vertical corners
        _chamfer_corner_clip()          # 12d CORNER_CLIP 6.0 datum corner (-X,+Y)
        _chamfer_lugs()                 # 12e CHAMFER_LUG 1.5 lug tips
        _chamfer_lcd_bezel()            # 12f CHAMFER_BEZEL 1.0 window opening
        _chamfer_usb_funnel()           # 12g USB_FUNNEL 2.0 slot funnel
        _chamfer_side_reveal()          # 12h SIDE_REVEAL_CHAMFER 1.5 -Y relief mouth
        _build_skin_plate()             # 13 solid skin plate + corner counterbores

        # --- Report -----------------------------------------------------------
        msg = ("Braille wearable enclosure built (MONOLITH WITH REVEALS).\n\n"
               "Bodies: cage + skin_plate\n"
               "Cage footprint: %.1f x %.1f mm, deck top %.2f, turret top %.2f\n"
               "Reveals: P1 open well / P3 louvre grille / P2 bezel window /\n"
               "         P4 proud hex turret; button open trench; -X side window\n"
               "Board bay: %.0f x %.0f, 4x M2 standoffs at +/-%.1f\n"
               % (CAGE_OUTER, CAGE_OUTER, DECK_TOP, TURRET_TOP,
                  BOARD_BAY, BOARD_BAY, BOARD_HOLE_X))
        if _skipped:
            msg += "\nCosmetic features skipped (fit geometry unaffected):\n - " + \
                   "\n - ".join(_skipped)
        else:
            msg += "\nAll cosmetic features created."
        _ui.messageBox(msg)

    except Exception:
        if _ui:
            _ui.messageBox("Failed:\n{}".format(traceback.format_exc()))
