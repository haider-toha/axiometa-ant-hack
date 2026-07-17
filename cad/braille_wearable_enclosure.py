# =============================================================================
# BRAILLE WEARABLE ENCLOSURE — Fusion 360 Python Script
# =============================================================================
# Wrist-worn braille / speech-to-touch wearable enclosure for the Axiometa
# "Genesis Mini" host board (55 x 55 mm) with 2x ERM haptic motors, an LCD,
# a rotary encoder and 3 onboard buttons. Brutalist, chamfered aesthetic.
#
# HOW TO RUN (paste-and-run):
#   1. Fusion 360 -> UTILITIES tab -> ADD-INS -> "Scripts and Add-Ins"
#   2. Scripts tab -> the green "+" -> "Create" (or point it at this .py file)
#   3. Select "braille_wearable_enclosure" -> "Run"
#   You must have an active *Design* document open (not a drawing / CAM).
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
# AESTHETIC: brutalist. CHAMFERS, never fillets, on all vertical outer edges.
# Shallow inset panel grooves + a raised chamfered step-rim on the outer face,
# and a hex detail ring around the encoder.
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
# DESIGN = a design choice (file 16 §D), not a measurement.
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
BOARD_HOLE_X     = 24.1    # M3 hole centres (+/-24.1, +/-24.1) HIGH  row 3 (was Ø2.7 -> corrected Ø3.4)
BOARD_HOLE_DIA   = 3.4     # board mounting hole Ø              HIGH  row 3
PORT_CTR         = 12.0    # module/port centres at (+/-12)     HIGH  row 4 (pitch 24.0)
MODULE_SQ        = 22.0    # 22x22 module PCB (ERM, encoder)    HIGH  row 13
LCD_PCB_W        = 29.0    # LCD module PCB X extent            HIGH  row 14
LCD_PCB_H        = 22.0    # LCD module PCB Y extent            HIGH  row 14
MODULE_CLEAR_ROW = 1.3     # min pocket clearance, row dir      HIGH  row 28 / §C (X-registration +/-1.27)
# LCD mated placement (file 16 rows 20/27, conflict C12) --------------------
LCD_PCB_CX       = 12.0    # LCD PCB centre X                   HIGH  row 27
LCD_PCB_CY       = -15.5   # LCD PCB centre Y (overhangs -Y)    HIGH  row 27
LCD_WIN_CX       = 11.98   # LCD glass window centre X          HIGH  row 20 / C12
LCD_WIN_CY       = -14.38  # LCD glass window centre Y          HIGH  row 20 / C12
LCD_WIN_W        = 13.5    # window short side (along X)        HIGH  row 20 (visible glass 13.5)
LCD_WIN_H        = 27.9    # window long side (along Y)         HIGH  row 20 (visible glass 27.9)
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
ROOF_CLEAR       = 1.0     # roof-inner clearance over motor    DESIGN §D
ROOF_THICK       = 2.5     # roof thickness                     DESIGN §D (>=2.5)
LUG_GAP          = 22.0    # internal lug gap = strap width     DESIGN §D (standard, web-confirmed)
LUG_BORE         = 2.6     # lug bore Ø (printed Ø2.5 pin)      DESIGN §D
LUG_W            = 6.0     # lug block X width                  DESIGN
LUG_PROJ         = 5.0     # lug projection past outer wall     DESIGN
LUG_H            = 8.0     # lug block Z height                 DESIGN
LUG_BORE_Z       = -3.0    # lug bore centre Z (low, above plate) DESIGN (clear of LCD relief; lug sits above plate top -7.6)
BOSS_DIA         = 7.0     # M3 boss/standoff outer Ø           DESIGN §D
BOSS_PILOT       = 2.5     # M3 self-tap pilot Ø                DESIGN §D
GUSSET_SQ        = 9.0     # corner gusset pad size (grounds boss to walls) DESIGN
GUSSET_T         = 2.5     # corner gusset thickness            DESIGN
USB_SLOT_W       = 12.0    # USB slot width (Y), cable overmold DESIGN §D (>=12)
USB_SLOT_H       = 7.0     # USB slot height (Z)                DESIGN §D (>=7)
USB_FUNNEL       = 1.5     # USB exterior funnel chamfer        DESIGN §D
ENCODER_BORE     = 16.0    # knob-clearance bore Ø              DESIGN §D (knob OD unknown)
HEX_AF           = 22.0    # encoder hex detail ring across-flats DESIGN §D
HEX_DEPTH        = 2.0     # encoder hex ring recess depth      DESIGN §D
CHAMFER_VERT     = 3.0     # vertical outer corner chamfer      DESIGN §D
CHAMFER_LUG      = 1.5     # lug outer-edge chamfer             DESIGN §D
CHAMFER_BEZEL    = 1.0     # LCD window-opening bezel chamfer   DESIGN §D (Phase-4 F1c)
GROOVE_W         = 1.0     # panel groove width                 DESIGN §D
GROOVE_D         = 0.5     # panel groove depth                 DESIGN §D
RIM_W            = 2.0     # raised step-rim lip width          DESIGN §D
RIM_STEP         = 1.0     # step-rim recess depth              DESIGN §D
MODULE_SEAT_D    = 2.0     # ERM roof seat recess depth         DESIGN
BEZEL_MARGIN     = 3.0     # LCD bezel recess margin per side   DESIGN
BEZEL_D          = 1.5     # LCD bezel recess depth             DESIGN
BTN_HOLE_DIA     = 4.0     # button finger/tool hole Ø          DESIGN §D
BTN_SHELF_TOP    = 5.0     # stepped button-shelf outer Z       DESIGN (holes <=3 mm deep)
PLATE_CB_DIA     = 6.0     # plate counterbore Ø (M3 head)      DESIGN
PLATE_CB_D       = 1.5     # plate counterbore depth            DESIGN

# --- Derived Z-map (board top = 0) ------------------------------------------
Z_BOARD_TOP   = 0.0
Z_BOARD_BOT   = -BOARD_THICK                       # -1.6
Z_POCKET_FL   = Z_BOARD_BOT - NEG_Z_POCKET         # -7.6  (-Z pocket floor / plate top)
Z_PLATE_TOP   = Z_POCKET_FL                        # -7.6
Z_PLATE_BOT   = Z_PLATE_TOP - PLATE_T              # -10.6
Z_ROOF_INNER  = MOTOR_TOP + ROOF_CLEAR             # +16.25
Z_ROOF_OUTER  = Z_ROOF_INNER + ROOF_THICK          # +18.75
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
        ("board_hole_x",     BOARD_HOLE_X,   "M3 hole centre offset (HIGH, row3)"),
        ("board_hole_dia",   BOARD_HOLE_DIA, "Board hole dia; M3 clearance (HIGH, row3)"),
        ("bay_clearance",    BAY_CLEAR,      "Board bay clearance/side (DESIGN)"),
        ("wall",             WALL,           "Cage wall (DESIGN >=2.5)"),
        ("plate_t",          PLATE_T,        "Skin plate thickness (DESIGN >=3.0)"),
        ("neg_z_pocket",     NEG_Z_POCKET,   "-Z pocket depth (DESIGN >=6, clears JST -5.59)"),
        ("roof_thick",       ROOF_THICK,     "Roof thickness (DESIGN >=2.5)"),
        ("roof_clear",       ROOF_CLEAR,     "Roof clearance over motor top (DESIGN)"),
        ("port_ctr",         PORT_CTR,       "Module/port centre offset (HIGH, row4)"),
        ("module_sq",        MODULE_SQ,      "22x22 module PCB (HIGH, row13)"),
        ("module_clear_row", MODULE_CLEAR_ROW, "Pocket row-dir clearance (HIGH, row28)"),
        ("lcd_pcb_cx",       LCD_PCB_CX,     "LCD PCB centre X (HIGH, row27)"),
        ("lcd_pcb_cy",       LCD_PCB_CY,     "LCD PCB centre Y (HIGH, row27)"),
        ("lcd_win_cx",       LCD_WIN_CX,     "LCD window centre X (HIGH, C12)"),
        ("lcd_win_cy",       LCD_WIN_CY,     "LCD window centre Y (HIGH, C12)"),
        ("lcd_win_w",        LCD_WIN_W,      "LCD window X (HIGH, row20)"),
        ("lcd_win_h",        LCD_WIN_H,      "LCD window Y (HIGH, row20)"),
        ("enc_x",            ENC_X,          "Encoder shaft X (HIGH, row26)"),
        ("enc_y",            ENC_Y,          "Encoder shaft Y (HIGH, row26)"),
        ("enc_shaft_dia",    ENC_SHAFT_DIA,  "Encoder shaft Ø (HIGH, row22)"),
        ("encoder_bore",     ENCODER_BORE,   "Knob clearance bore (DESIGN)"),
        ("btn_x",            BTN_X,          "Button column X (HIGH, row9)"),
        ("btn_y",            BTN_Y,          "Button +/-Y offset (HIGH, row9)"),
        ("btn_hole_dia",     BTN_HOLE_DIA,   "Button tool hole (DESIGN)"),
        ("usb_slot_w",       USB_SLOT_W,     "USB slot width (DESIGN >=12)"),
        ("usb_slot_h",       USB_SLOT_H,     "USB slot height (DESIGN >=7)"),
        ("lug_gap",          LUG_GAP,        "Internal lug gap = strap width (DESIGN)"),
        ("lug_bore",         LUG_BORE,       "Lug bore Ø (DESIGN)"),
        ("boss_dia",         BOSS_DIA,       "M3 boss/standoff Ø (DESIGN)"),
        ("boss_pilot",       BOSS_PILOT,     "M3 self-tap pilot Ø (DESIGN)"),
        ("chamfer_vert",     CHAMFER_VERT,   "Vertical outer corner chamfer (DESIGN)"),
        ("groove_w",         GROOVE_W,       "Panel groove width (DESIGN)"),
        ("groove_d",         GROOVE_D,       "Panel groove depth (DESIGN)"),
        ("rim_w",            RIM_W,          "Step-rim lip width (DESIGN)"),
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
    """Step 1: outer 62x62 solid block from plate-bottom to roof-outer."""
    global _cage
    sk = _sketch_on_xy_at(Z_PLATE_BOT)
    prof = _rect_profile(sk, 0, 0, CAGE_OUTER, CAGE_OUTER)   # 62x62  DESIGN §A.5
    feat = _extrude(prof, Z_ROOF_OUTER - Z_PLATE_BOT, NEWBODY)  # 29.35 mm tall
    _cage = feat.bodies.item(0)
    _cage.name = "cage"


def _cut_cavity():
    """Step 2: hollow the interior 57x57 from the open bottom up to roof-inner."""
    sk = _sketch_on_xy_at(Z_PLATE_BOT)
    prof = _rect_profile(sk, 0, 0, CAVITY, CAVITY)          # 57x57  (board_bay + 2*clear)
    _extrude(prof, Z_ROOF_INNER - Z_PLATE_BOT, CUT)         # leaves 2.5 walls + 2.5 roof, open bottom


def _add_bosses_and_gussets():
    """Step 3: 4x M3 standoffs (+/-24.1) grounded to the walls by corner gussets."""
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
        _extrude(prof, GUSSET_T, JOIN)                      # -7.6 -> -5.1
    # standoffs: Ø7 from plate-top to board-bottom (the 6 mm -Z pocket span)
    for (cx, cy) in corners:
        sk = _sketch_on_xy_at(Z_PLATE_TOP)
        sk.sketchCurves.sketchCircles.addByCenterRadius(_pt(cx, cy), BOSS_DIA / 2.0 / 10.0)
        prof = sk.profiles.item(sk.profiles.count - 1)
        _extrude(prof, Z_BOARD_BOT - Z_PLATE_TOP, JOIN)     # -7.6 -> -1.6  (6.0 tall)
    # Ø2.5 self-tap pilot through each standoff (board screw from +Z top,
    # plate screw from -Z bottom, into the shared pilot).
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


def _cut_module_roof_openings():
    """Step 5: ERM seats, encoder bore + hex, LCD window + bezel."""
    ext = _comp.features.extrudeFeatures
    # -- ERM roof seats (cosmetic recesses; motors already clear at +15.25 < 16.25 roof inner)
    seat = MODULE_SQ + 2.0 * MODULE_CLEAR_ROW          # 24.6 (>=1.3 clearance/side, row28)
    for (cx, cy) in [(MOTOR_A_X, MOTOR_A_Y), (MOTOR_B_X, MOTOR_B_Y)]:
        try:
            sk = _sketch_on_xy_at(Z_ROOF_OUTER)
            prof = _rect_profile(sk, cx, cy, seat, seat)
            _extrude(prof, -MODULE_SEAT_D, CUT)        # 18.75 -> 16.75 recess
        except Exception:
            _skipped.append("ERM seat @ (%.0f,%.0f)" % (cx, cy))
    # -- Encoder hex detail ring (cosmetic) around the shaft axis
    try:
        _cut_hex_recess(ENC_X, ENC_Y, HEX_AF, HEX_DEPTH)
    except Exception:
        _skipped.append("encoder hex ring")
    # -- Encoder knob-clearance bore, through the roof (shaft tip +38.25 protrudes)
    sk = _sketch_on_xy_at(Z_ROOF_OUTER + 2.0)          # start above the outer face
    sk.sketchCurves.sketchCircles.addByCenterRadius(_pt(ENC_X, ENC_Y), ENCODER_BORE / 2.0 / 10.0)
    prof = sk.profiles.item(sk.profiles.count - 1)
    _extrude(prof, -(Z_ROOF_OUTER + 2.0 - (Z_ROOF_INNER - 3.0)), CUT)  # to 3 mm past roof-inner: guaranteed through-cut (roof datum)  DESIGN
    # -- LCD bezel recess (cosmetic) then the through-window
    try:
        sk = _sketch_on_xy_at(Z_ROOF_OUTER)
        prof = _rect_profile(sk, LCD_WIN_CX, LCD_WIN_CY,
                             LCD_WIN_W + 2.0 * BEZEL_MARGIN, LCD_WIN_H + 2.0 * BEZEL_MARGIN)
        _extrude(prof, -BEZEL_D, CUT)                  # 18.75 -> 17.25 bezel recess
    except Exception:
        _skipped.append("LCD bezel recess")
    sk = _sketch_on_xy_at(Z_ROOF_OUTER + 2.0)
    prof = _rect_profile(sk, LCD_WIN_CX, LCD_WIN_CY, LCD_WIN_W, LCD_WIN_H)  # 13.5 x 27.9 window
    _extrude(prof, -(Z_ROOF_OUTER + 2.0 - LCD_GLASS_TOP), CUT)   # through roof to glass top


def _cut_hex_recess(cx, cy, af, depth):
    """Hexagonal recess (across-flats = af) on the outer face."""
    # No math import (imports restricted to adsk.* + traceback): use the exact
    # unit-hexagon vertices for a flat-topped hex (angles 30,90,...,330 deg).
    r = af / 2.0 / 0.8660254037844387                  # circumradius = (af/2)/cos30
    unit = [(0.8660254, 0.5), (0.0, 1.0), (-0.8660254, 0.5),
            (-0.8660254, -0.5), (0.0, -1.0), (0.8660254, -0.5)]
    sk = _sketch_on_xy_at(Z_ROOF_OUTER)
    lines = sk.sketchCurves.sketchLines
    pts = [_pt(cx + r * u, cy + r * v) for (u, v) in unit]
    for i in range(6):
        lines.addByTwoPoints(pts[i], pts[(i + 1) % 6])
    prof = sk.profiles.item(sk.profiles.count - 1)
    _extrude(prof, -depth, CUT)


def _cut_usb_slot():
    """Step 6: USB-C slot through the +X wall, centred Y=0."""
    x_start = CAVITY_HALF - 1.5                          # 27.0, just inside cavity
    plane = _offset_plane(_comp.yZConstructionPlane, x_start)  # local (Y,Z)
    sk = _comp.sketches.add(plane)
    sk.sketchCurves.sketchLines.addTwoPointRectangle(
        _pt(0 - USB_SLOT_W / 2.0, USB_SLOT_CZ - USB_SLOT_H / 2.0),
        _pt(0 + USB_SLOT_W / 2.0, USB_SLOT_CZ + USB_SLOT_H / 2.0),
    )
    prof = sk.profiles.item(sk.profiles.count - 1)
    _extrude(prof, (CAGE_HALF - x_start) + 2.0, CUT)    # +X through the wall and out


def _cut_button_strip():
    """Step 7: stepped-down roof strip over the 3 buttons + 3 shallow tool holes."""
    h = 2.0 * (BTN_Y + 3.5)                             # 41 -> y -20.5..20.5 (covers +/-17)
    cy = 0.0
    # (a) cut the main roof away over the strip -> recessed access channel (x 23..28.5)
    ch_lo, ch_hi = 23.0, CAVITY_HALF
    sk = _sketch_on_xy_at(Z_ROOF_OUTER + 2.0)
    prof = _rect_profile(sk, (ch_lo + ch_hi) / 2.0, cy, ch_hi - ch_lo, h)
    _extrude(prof, -(Z_ROOF_OUTER + 2.0 - BTN_SHELF_TOP), CUT)   # down to +5.0
    # (b) join a lowered shelf just above the plungers; extend fully into the +X
    #     wall (x 23..31) so the JOIN unions solidly rather than only touching.
    sh_lo, sh_hi = 23.0, CAGE_HALF
    sk = _sketch_on_xy_at(BTN_SHELF_TOP - ROOF_THICK)   # +2.5
    prof = _rect_profile(sk, (sh_lo + sh_hi) / 2.0, cy, sh_hi - sh_lo, h)
    _extrude(prof, ROOF_THICK, JOIN)                    # +2.5 -> +5.0 shelf
    # (c) 3 finger/tool holes through the shelf down onto the plungers
    for by in (BTN_Y, 0.0, -BTN_Y):
        sk = _sketch_on_xy_at(BTN_SHELF_TOP)
        sk.sketchCurves.sketchCircles.addByCenterRadius(_pt(BTN_X, by), BTN_HOLE_DIA / 2.0 / 10.0)
        prof = sk.profiles.item(sk.profiles.count - 1)
        _extrude(prof, -(BTN_SHELF_TOP - (BTN_PLUNGER_TOP - 0.4)), CUT)  # <=3 mm deep to plunger


def _add_lugs():
    """Step 8: 2 lug pairs on +/-Y walls, gap 22.0, Ø2.6 through bores."""
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
            plane = _offset_plane(_comp.yZConstructionPlane, cx - LUG_W / 2.0 - 1.0)
            sk2 = _comp.sketches.add(plane)
            sk2.sketchCurves.sketchCircles.addByCenterRadius(
                _pt(sign * y_mid, LUG_BORE_Z), LUG_BORE / 2.0 / 10.0)
            prof2 = sk2.profiles.item(sk2.profiles.count - 1)
            _extrude(prof2, LUG_W + 2.0, CUT)


def _add_step_rim_and_grooves():
    """Step 9: raised chamfered step-rim + 2 panel grooves on the outer face."""
    # step-rim: recess the central outer face, leaving a RIM_W raised perimeter lip
    try:
        sk = _sketch_on_xy_at(Z_ROOF_OUTER)
        prof = _rect_profile(sk, 0, 0, CAGE_OUTER - 2.0 * RIM_W, CAGE_OUTER - 2.0 * RIM_W)
        _extrude(prof, -RIM_STEP, CUT)                  # 18.75 -> 17.75 central recess
    except Exception:
        _skipped.append("step-rim")
    # 2 panel grooves forming a cross that zones the modules (cosmetic)
    for (cx, cy, w, h) in [(0.0, 0.0, GROOVE_W, CAVITY - 6.0),
                           (0.0, 0.0, CAVITY - 6.0, GROOVE_W)]:
        try:
            sk = _sketch_on_xy_at(Z_ROOF_OUTER - RIM_STEP)
            prof = _rect_profile(sk, cx, cy, w, h)
            _extrude(prof, -GROOVE_D, CUT)
        except Exception:
            _skipped.append("panel groove")


def _build_skin_plate():
    """Step 10: the solid skin plate (2nd body) + 4 corner counterbores."""
    sk = _sketch_on_xy_at(Z_PLATE_BOT)
    prof = _rect_profile(sk, 0, 0, CAVITY, CAVITY)     # 57x57 fills the cavity bottom
    feat = _extrude(prof, PLATE_T, NEWBODY)            # -10.6 -> -7.6
    plate = feat.bodies.item(0)
    plate.name = "skin_plate"
    # 4 counterbores at the board-hole corners (screws thread up into the standoffs)
    corners = [( BOARD_HOLE_X,  BOARD_HOLE_X), ( BOARD_HOLE_X, -BOARD_HOLE_X),
               (-BOARD_HOLE_X,  BOARD_HOLE_X), (-BOARD_HOLE_X, -BOARD_HOLE_X)]
    for (cx, cy) in corners:
        # through clearance
        sk = _sketch_on_xy_at(Z_PLATE_BOT)
        sk.sketchCurves.sketchCircles.addByCenterRadius(_pt(cx, cy), BOARD_HOLE_DIA / 2.0 / 10.0)
        _extrude(sk.profiles.item(sk.profiles.count - 1), PLATE_T, CUT)
        # counterbore for the M3 head on the wrist face
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


def _chamfer_vertical_corners():
    """Equal-distance chamfer on the 4 vertical outer corner edges (brutalist)."""
    try:
        edges = adsk.core.ObjectCollection.create()
        for edge in _cage.edges:
            res = _edge_is_vertical(edge)
            if res is None:
                continue
            mx, my = res
            # outer corner: both |x| and |y| near the 62/2 = 31 corner
            if abs(mx) > CAGE_HALF - 1.0 and abs(my) > CAGE_HALF - 1.0:
                edges.add(edge)
        if edges.count == 0:
            _skipped.append("vertical corner chamfers (no edges matched)")
            return
        chamfers = _comp.features.chamferFeatures
        cin = chamfers.createInput2()
        cin.chamferEdgeSets.addEqualDistanceChamferEdgeSet(edges, _cm(CHAMFER_VERT), True)
        chamfers.add(cin)
    except Exception:
        _skipped.append("vertical corner chamfers (exception)")


def _chamfer_usb_funnel():
    """1.5 mm funnel chamfer on the exterior long edges of the USB slot."""
    try:
        edges = adsk.core.ObjectCollection.create()
        for edge in _cage.edges:
            g = edge.geometry
            if g.objectType != adsk.core.Line3D.classType():
                continue
            sp, ep = g.startPoint, g.endPoint
            # horizontal edges running in Y, on the outer +X face, at slot top/bottom
            if abs(ep.z - sp.z) > 1e-6:
                continue
            if abs(ep.x - sp.x) > 1e-6:
                continue
            mx = (sp.x + ep.x) / 2.0 * 10.0
            mz = (sp.z + ep.z) / 2.0 * 10.0
            if mx > CAGE_HALF - 0.5 and abs(mz - USB_SLOT_CZ) < USB_SLOT_H / 2.0 + 0.5:
                edges.add(edge)
        if edges.count:
            chamfers = _comp.features.chamferFeatures
            cin = chamfers.createInput2()
            cin.chamferEdgeSets.addEqualDistanceChamferEdgeSet(edges, _cm(USB_FUNNEL), True)
            chamfers.add(cin)
        else:
            _skipped.append("USB funnel chamfer (no edges matched)")
    except Exception:
        _skipped.append("USB funnel chamfer (exception)")


def _chamfer_lugs():
    """1.5 mm chamfer on the outer (tip) face edges of the 4 lug blocks.
    Phase-4 fix F2: CHAMFER_LUG was defined but never applied."""
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
        chamfers = _comp.features.chamferFeatures
        cin = chamfers.createInput2()
        cin.chamferEdgeSets.addEqualDistanceChamferEdgeSet(edges, _cm(CHAMFER_LUG), False)
        chamfers.add(cin)
    except Exception:
        _skipped.append("lug chamfers (exception)")


def _chamfer_lcd_bezel():
    """1.0 mm chamfer on the LCD window-opening edges at the bezel floor.
    Phase-4 fix F1c: the bezel recess existed but was not chamfered."""
    try:
        z_floor = Z_ROOF_OUTER - BEZEL_D                # 17.25 — window opening edge level
        edges = adsk.core.ObjectCollection.create()
        for edge in _cage.edges:
            g = edge.geometry
            if g.objectType != adsk.core.Line3D.classType():
                continue
            sp, ep = g.startPoint, g.endPoint
            if abs(ep.z - sp.z) > 1e-6:                 # horizontal edges only
                continue
            mz = (sp.z + ep.z) / 2.0 * 10.0
            if abs(mz - z_floor) > 0.2:                 # excludes step-rim floor at 17.75
                continue
            mx = (sp.x + ep.x) / 2.0 * 10.0
            my = (sp.y + ep.y) / 2.0 * 10.0
            # window-perimeter edges only (bezel-recess outer boundary is farther out)
            if (abs(mx - LCD_WIN_CX) < LCD_WIN_W / 2.0 + 0.5 and
                    abs(my - LCD_WIN_CY) < LCD_WIN_H / 2.0 + 0.5):
                edges.add(edge)
        if edges.count == 0:
            _skipped.append("LCD bezel chamfer (no edges matched)")
            return
        chamfers = _comp.features.chamferFeatures
        cin = chamfers.createInput2()
        cin.chamferEdgeSets.addEqualDistanceChamferEdgeSet(edges, _cm(CHAMFER_BEZEL), False)
        chamfers.add(cin)
    except Exception:
        _skipped.append("LCD bezel chamfer (exception)")


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
        root = design.rootComponent
        occ = root.occurrences.addNewComponent(adsk.core.Matrix3D.create())
        _comp = occ.component
        _comp.name = "BrailleWearableEnclosure"

        _register_parameters(design)

        # --- Ordered timeline -------------------------------------------------
        _build_cage_block()             # 1  outer 62x62 block
        _cut_cavity()                   # 2  hollow 57x57 interior, open wrist side
        _add_bosses_and_gussets()       # 3  4x M3 standoffs + gussets + pilots
        _cut_lcd_relief()               # 4  -Y wall relief for LCD overhang
        _cut_module_roof_openings()     # 5  ERM seats, encoder bore+hex, LCD window+bezel
        _cut_usb_slot()                 # 6  USB-C slot through +X wall
        _cut_button_strip()             # 7  stepped roof strip + 3 tool holes
        _add_lugs()                     # 8  2 lug pairs, gap 22, Ø2.6 bores
        _add_step_rim_and_grooves()     # 9  step-rim + panel grooves (cosmetic)
        _chamfer_vertical_corners()     # 10 brutalist vertical corner chamfers
        _chamfer_usb_funnel()           # 11 USB funnel chamfer
        _chamfer_lugs()                 # 11b lug tip chamfers (Phase-4 F2)
        _chamfer_lcd_bezel()            # 11c LCD bezel chamfer (Phase-4 F1c)
        _build_skin_plate()             # 12 solid skin plate + corner counterbores

        # --- Report -----------------------------------------------------------
        msg = ("Braille wearable enclosure built.\n\n"
               "Bodies: cage + skin_plate\n"
               "Cage footprint: %.1f x %.1f mm, height %.2f mm\n"
               "Board bay: %.0f x %.0f, 4x M3 standoffs at +/-%.1f\n"
               % (CAGE_OUTER, CAGE_OUTER, Z_ROOF_OUTER - Z_PLATE_BOT,
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
