# =============================================================================
# BRAILLE WEARABLE EXO-CAGE — Fusion 360 Python Script
# =============================================================================
# Wrist-worn braille / speech-to-touch wearable enclosure for the Axiometa
# "Genesis Mini" host board (55 x 55 mm) with 2x ERM haptic motors, an LCD,
# a rotary encoder and 3 onboard buttons.
#
# This is the EXO-CAGE variant (design file 27c, amended by file 31) — a
# SECOND, standalone design that coexists with braille_wearable_enclosure.py
# (the "MONOLITH WITH REVEALS").  Neither script touches the other.
#
# HOW TO RUN (paste-and-run):
#   1. Fusion 360 -> UTILITIES tab -> ADD-INS -> "Scripts and Add-Ins"
#   2. Scripts tab -> the green "+" -> "Create" (or point it at this .py file)
#   3. Select "braille_wearable_exocage" -> "Run"
#   You must have an active *Design* document open (not a drawing / CAM).
#   In a *Part* document the cage builds into the root component; in an
#   *Assembly* it becomes a child component "BrailleWearableExoCage".
#   The script produces TWO bodies (cage + skin_plate) -- always fine, the
#   single-component limit restricts COMPONENTS, not BODIES.
#
# CRITICAL: Fusion 360 API uses CENTIMETRES internally.  All dimensions below
# are in mm; every createByReal() call divides by 10.  Done in ONE place only,
# the helper _cm(), so the whole model stays consistent.
#
# STRAP: models LUG BOSSES ONLY.  Internal lug gap = 22.0 mm (standard 22 mm
# strap).  User buys a 22 mm strap and Ø2.5 printed pins (or Ø1.78 steel spring
# bars, which the Ø2.6 bore also admits loosely).
#
# ---------------------------------------------------------------------------
# AESTHETIC: "EXO-CAGE" (roll-cage skeleton, closest to renders/inspo_2.png).
# The enclosure is turned inside-out: a closed structural BASE TUBE (the solid
# base ring, z -11.1..+2) plus a bolted bottom plate carry all the load, so the
# entire upper half is stripped to a bare roll cage — four chamfered CORNER
# POSTS (9x9 outer footprint, inner corner cut back 45 deg so no post material
# sits in a module's seat), an L-shaped TOP RIM on +Y and -X, and 4 horizontal
# top CORNER PLATES — with the electronics standing PROUD IN OPEN AIR between
# them:
#   P1  ERM (-12,-12)   -- bare in open air, no visor, stands +2.25 proud of rim.
#   P2  LCD (+11.98,-14.38) -- FULLY BARE, no bezel, no material anywhere above
#                              the glass (>13.5x27.9 of open sky ⊃ the window).
#   P3  ERM (+12,+12)   -- bare in open air, no louvre, stands proud of the rim.
#   P4  ENCODER (-12,+12) -- FULLY BARE: no turret, no collar.  The encoder can
#                              measures r9.32 out to model +18.05 (file 34), so
#                              ANY sub-+18.6 collar would collide; "encoder
#                              clearance" is satisfied by TOTAL ABSENCE of
#                              material above the module -- open air like P1/P3.
# The board screws are driven from the OPEN WRIST (skin) side through the plate
# counterbores up into the standoffs -- there are NO top-side access bores (the
# old Ø4.5 post bores breached the post inner walls and were deleted, file 34).
# The green PCB edge shows through 45-chamfered SIDE WINDOWS on -X (26 wide) and
# +Y (18 wide).  Buttons sit BARE (the +X frame above +2 is open).  The -Y upper
# wall is fully ABSENT (LCD relief by absence).  Brutalist 45-deg CHAMFERS
# throughout.  The removal IS the design.
#
# --- DELTAS vs 27c (file 31, amended by file 34 fix) -----------------------
#   * NO LCD bridge bezel (27c step 13 deleted).  The LCD is fully bare; the
#     §A "LCD window >=13.5x27.9" anchor is satisfied by the TOTAL ABSENCE of
#     material above the glass — open sky is a superset of the required window.
#   * NO P3 louvre visor (27c step 15 deleted).  Both ERM motors stand bare in
#     open air, proud of the deck rim (motor top +15.25 vs rim top +13.0).
#   * NO encoder turret (file 34 E4).  The rotary-encoder can body has radius
#     9.32 up to model +18.05 and 13.51 at +12..+14.1 (file 34 slice table);
#     no collar/turret can enclose it below +18.6 without interference, so the
#     encoder is left BARE.  The hex turret + its two rim bridges were deleted.
#   * PENTAGON corner posts (file 34 E1).  The 9x9 square posts intruded to
#     +/-22, 1.0 mm INSIDE the +/-23 module corners.  Each post is now a
#     pentagon: the 9x9 square minus a 45-deg inner-corner triangle (leg 3.5),
#     so no post material lies in the L-keep-out around a module.
#   * TOP CORNER PLATES replace the 8 floating gussets (file 34 E3).  The old
#     gussets were line-contact-only (14-lump body) AND inside module footprints.
#
# --- PRINT ORIENTATION: skin-side DOWN, build +Z up ------------------------
# The open bottom (57x57 wrist side) starts as a simple perimeter ring; all
# tall features (posts) grow straight up; every module aperture opens UPWARD
# (no ceilings).  skin_plate prints separately, flat.
# BOARD INSERTION (file 34 F3, note): the corner boss pads (z -8.1..-5.6) snag a
# flat 55x55 drop-in by ~1 mm at the four PCB corners; TILT-INSERT the board
# (lead one edge in first) to clear the pads, then settle onto the standoffs.
# Overhang audit (45-deg rule / bridges <=12) after the bezel/visor/turret removals:
#   * Posts, base tube, USB dock walls -> vertical prisms, zero overhang.
#   * -X side-window lintel -> top corners chamfered 45 deg (WIN_CHAMF 7) so the
#     bridged flat span = WIN_W - 2*WIN_CHAMF = 12.0 mm (= limit). Self-supp.
#   * +Y side-window lintel -> 18 mm flat top (the window is cut with a vertical
#     Z-extrude so its top corners are square).  Apply the cosmetic top chamfer
#     in Fusion, or accept an 18 mm bridge (PLA-printable); a mid-mullion is not
#     an option — it would block the required +Y open-air view of the PCB.
#   * L top-rim + corner plates seat on the posts/wall below (not bridged).
#   * USB slot / lug bores in vertical walls -> cut with the orientation-proof
#     modelToSketchSpace + symmetric-extent idiom; slot top edge 7 mm < 12.
#
# --- STIFFNESS / LOAD PATH (27c §7, file 34 corrected) ---------------------
# Torsion + bending are carried by a CLOSED BASE TUBE (2.5-wall ring, z
# -11.1..+2, on all four sides — the side windows start at -1.6 but leave >=6 mm
# mullions + full solid corners, so the ring reads as a truss not a cut tube)
# plus a BOLTED 57x57x3 bottom shear panel.  The four pentagon corner posts tie
# base to top ring; the +Y/-X L-rim + 4 top corner plates (each volumetrically
# overlapping its post) close the top corners.  The load path is: base tube +
# bottom plate + posts + L-rim + corner plates (single fused body).  The -Y-open
# top corner is the DELIBERATE weak point (flagged for print/FEA), carried by
# its corner plate and the bottom plate.
#
# --- §A DEVIATIONS from the monolith TEST probe set (documented, file 31) ---
# The exo cage opens the +X frame above +2 (buttons bare) and windows the -X/+Y
# base ring from z -1.6, so three monolith-era probe POINTS move to where §A
# actually locks material (they encoded a tall closed wall, never a §A anchor):
#   * "roof above USB slot" (29.75,0,+3.0) -> (29.75,0,+1.0): §A locks the wall
#     solid only z -6.3..+0.7 around the slot; the base ring (-11.1..+2) covers
#     it; +3.0 sat in the deleted +X upper wall.
#   * "+X wall" (30,0,+5.0) -> (30,0,-5.0): +X is open above +2; the base ring
#     wall is solid below it.
#   * base-ring +X probe uses y=16 (not y=0): the §A USB slot occupies
#     (29.75, 0, 0), so y=0 there is correctly AIR.
# Every LOCKED §A fit anchor (bay keep-out, bosses, plate, -Z pocket, USB slot,
# LCD window by absence, bare encoder, lugs) is verified UNCHANGED.
#
# COORDINATE DATUM (audit file 16): origin = centre of the 55x55 host PCB.
# +X = USB-C / button edge.  +Z = component / outer face.  BOARD TOP at Z = 0.
#
# SOURCE TAGS: HIGH = measured/datasheet; MED = estimate; DESIGN = design choice;
# "DESIGN 27c/31 exo" = the exo-cage geometry.  "row N" = file 16 §A truth table.
# =============================================================================

import adsk.core
import adsk.fusion
import adsk.cam
import traceback


# -----------------------------------------------------------------------------
# THE mm->cm HELPER.  The ONLY place createByReal() is called for geometry;
# it ALWAYS divides mm by 10.0.  Drive every dimension through it.
# -----------------------------------------------------------------------------
def _cm(mm_value):
    return adsk.core.ValueInput.createByReal(mm_value / 10.0)


# =============================================================================
# DIMENSION REGISTRY  (every literal that enters geometry lives here, once).
# =============================================================================
# --- Host board & fit-critical anchors (file 16 §A / §C) --------------------
BOARD_BAY        = 55.0    # board footprint XY                 HIGH  row 1
BOARD_THICK      = 1.6     # PCB nominal thickness              HIGH  row 2
BOARD_HOLE_X     = 24.1    # screw hole centres (+/-24.1)       HIGH  row 3
PORT_CTR         = 12.0    # module/port centres at (+/-12)     HIGH  row 4
MODULE_SQ        = 22.0    # 22x22 module PCB (ERM, encoder)    HIGH  row 13
LCD_PCB_W        = 29.0    # LCD PCB board-Y extent after mate  HIGH  row 14 (29 mates along board-Y)
LCD_PCB_H        = 22.0    # LCD PCB board-X extent after mate  HIGH  row 14 (22 mates along board-X; used as relief X-width)
MODULE_CLEAR_ROW = 1.3     # min pocket clearance, row dir      HIGH  row 28 / §C
LCD_PCB_CX       = 12.0    # LCD PCB centre X                   HIGH  row 27
LCD_PCB_CY       = -15.5   # LCD PCB centre Y (overhangs -Y)    HIGH  row 27
LCD_WIN_CX       = 11.98   # LCD glass window centre X          HIGH  row 20  LOCKED
LCD_WIN_CY       = -14.38  # LCD glass window centre Y          HIGH  row 20  LOCKED
LCD_WIN_W        = 13.5    # window short side (along X)        HIGH  row 20  LOCKED
LCD_WIN_H        = 27.9    # window long side (along Y)         HIGH  row 20  LOCKED
LCD_OVERHANG     = 2.5     # LCD PCB overhang past board -Y edge HIGH row 27 / §C
MOTOR_A_X        = -12.0   # ERM A centre (Port 1)              HIGH  row 24
MOTOR_A_Y        = -12.0   # ERM A centre (Port 1)              HIGH  row 24
MOTOR_B_X        = 12.0    # ERM B centre (Port 3, diagonal)    HIGH  row 25
MOTOR_B_Y        = 12.0    # ERM B centre (Port 3, diagonal)    HIGH  row 25
ENC_X            = -12.0   # encoder shaft axis (Port 4)        HIGH  row 26
ENC_Y            = 12.0    # encoder shaft axis (Port 4)        HIGH  row 26
ENC_SHAFT_DIA    = 6.0     # encoder Ø6 D-shaft                 HIGH  row 22
BTN_X            = 25.76   # 3x button column X                 HIGH  row 9
BTN_Y            = 17.0    # buttons at (25.76, +17 / 0 / -17)  HIGH  row 9
BTN_PLUNGER_TOP  = 2.4     # top-actuated plunger top above board top HIGH row 9
BTN_PLUNGER_DIA  = 2.2     # Ø2.2 plunger                       HIGH  row 9
MOTOR_TOP        = 15.25   # ERM motor body top (tallest)       HIGH §A.4
LCD_GLASS_TOP    = 13.18   # LCD glass top                      HIGH  §A.4
MODULE_PCB_TOP   = 11.56   # module PCB top                     HIGH  §A.4
ENC_TIP          = 38.25   # encoder shaft tip (protrudes)      HIGH  §A.4
LCD_GLASS_ENV    = 29.97   # LCD glass envelope length          HIGH  row 20
NEG_Z_DEEP       = 5.59    # JST-PH hangs 5.59 below PCB bottom HIGH  row 11
USB_REC_ZLO      = -3.29   # receptacle low z rel. PCB bottom   HIGH  row 8
USB_REC_ZHI      = 0.91    # receptacle high z rel. PCB bottom  HIGH  row 8

# --- Design choices (file 16 §D — NOT measurements) -------------------------
BAY_CLEAR        = 1.0     # board bay clearance per side       DESIGN §D
WALL             = 2.5     # cage wall thickness                DESIGN §D (>=2.5)
PLATE_T          = 3.0     # skin plate thickness               DESIGN §D (>=3.0)
NEG_Z_POCKET     = 6.5     # -Z clearance pocket depth          DESIGN §D
LUG_GAP          = 22.0    # internal lug gap = strap width     DESIGN §D
LUG_BORE         = 2.6     # lug bore Ø (printed Ø2.5 pin)      DESIGN §D
LUG_W            = 6.0     # lug block X width                  DESIGN
LUG_PROJ         = 5.0     # lug projection past outer wall     DESIGN
LUG_H            = 8.0     # lug block Z height                 DESIGN
LUG_BORE_Z       = -3.0    # lug bore centre Z                  DESIGN
BOSS_DIA         = 7.0     # M2 boss/standoff outer Ø           DESIGN §D
BOSS_PILOT       = 1.8     # M2 self-tap pilot Ø                DESIGN §D
GUSSET_SQ        = 9.0     # boss corner-pad size (grounds boss to walls) DESIGN
GUSSET_T         = 2.5     # boss corner-pad thickness          DESIGN
USB_SLOT_W       = 12.0    # USB slot width (Y)                 DESIGN §D (>=12)
USB_SLOT_H       = 7.0     # USB slot height (Z)                DESIGN §D (>=7)
USB_WEB          = 2.1     # front wall thickness at receptacle DESIGN §A (do NOT thicken)
USB_FUNNEL       = 1.0     # USB exterior funnel chamfer (file 34 E5: only 1.29 mm lintel above the slot; was 1.5) DESIGN
PLATE_CB_DIA     = 4.0     # plate counterbore Ø (M2 head)      DESIGN (reference shell)
PLATE_CB_D       = 2.0     # plate counterbore depth            DESIGN (reference shell)
PLATE_HOLE_DIA   = 2.4     # M2 clearance through-hole in plate DESIGN (reference shell)

# --- EXO-CAGE roll-cage frame (DESIGN 27c/31 exo) ---------------------------
Z_BAND_TOP       = 2.0     # base-ring top = §A board keep-out ceiling; solid below, skeletal above DESIGN 27c
Z_DECK_BOT       = 11.0    # L top-rim underside / window lintel level          DESIGN 27c
Z_DECK_TOP       = 13.0    # L top-rim top / deck; motors (+15.25) proud +2.25  DESIGN 27c
DECK_RING_W      = 4.0     # rim width (inboard 28.5->24.5) on +Y and -X only   DESIGN 27c
POST_SQ          = 9.0     # corner-post OUTER footprint above +2 (9x9 square)  DESIGN 27c
POST_INNER       = 22.0    # post inner faces (= CAGE_HALF - POST_SQ)           DESIGN 27c
POST_CUT         = 3.5     # 45-deg inner-corner cut-back leg (file 34 E1): the
                           # 9x9 square minus a leg-3.5 triangle at its inner
                           # corner -> pentagon, so NO post material lies in the
                           # L-keep-out {|x|<24.3,|y|<23}U{|x|<23,|y|<24.3} around
                           # a module (module corner reaches +/-23; +1.3 clr incl
                           # +/-1.27 registration).  Hyp: x+y >= 2*POST_INNER+POST_CUT
Z_POST_TOP       = 16.5    # roll-cage top: > motor +15.25, < old roof +18.75   DESIGN 27c
WIN_LO           = -1.6    # side-window bottom = board bottom (shows PCB edge) DESIGN 27c
WIN_HI           = 11.0    # side-window top = lintel at Z_DECK_BOT             DESIGN 27c
WIN_W            = 26.0    # -X side window width (along Y)                     DESIGN 27c
WIN_W_Y          = 18.0    # +Y side window width (along X); clears +/-14 lugs  DESIGN 27c
WIN_CHAMF        = 7.0     # 45-deg chamfer on -X window TOP corners -> 12 lintel DESIGN 27c
MULLION_W        = 6.0     # min solid wall between/around windows              DESIGN 27c
WEB_T            = 2.5     # top corner-plate thickness (= WALL)                DESIGN 27c
PLATE_LEG        = 7.5     # top corner-plate leg along each wall (file 34 E3): a
                           # horizontal triangular web at each cage corner, right
                           # angle at (+/-31,+/-31), legs 7.5 -> vertices
                           # (+/-23.5,+/-31) & (+/-31,+/-23.5); overlaps the post
                           # pentagon volumetrically (replaces the floating gussets)
CHAMFER_VERT     = 3.0     # vertical outer post-corner chamfer                 DESIGN 27c
CHAMFER_TOP      = 1.0     # universal 45-deg chamfer on top-facing outer edges DESIGN 27c
CHAMFER_LUG      = 1.5     # lug tip chamfer                                    DESIGN 27c

# --- Derived Z-map (board top = 0) ------------------------------------------
Z_BOARD_TOP   = 0.0
Z_BOARD_BOT   = -BOARD_THICK                       # -1.6
Z_POCKET_FL   = Z_BOARD_BOT - NEG_Z_POCKET         # -8.1
Z_PLATE_TOP   = Z_POCKET_FL                        # -8.1
Z_PLATE_BOT   = Z_PLATE_TOP - PLATE_T              # -11.1
CAVITY        = BOARD_BAY + 2.0 * BAY_CLEAR         # 57.0
CAGE_OUTER    = BOARD_BAY + 2.0 * BAY_CLEAR + 2.0 * WALL   # 62.0
CAGE_HALF     = CAGE_OUTER / 2.0                    # 31.0
CAVITY_HALF   = CAVITY / 2.0                        # 28.5
POST_CTR      = CAGE_HALF - POST_SQ / 2.0          # 26.5 (corner-post centre)
RIM_INNER     = CAVITY_HALF - DECK_RING_W          # 24.5 (L-rim inboard edge)
USB_SLOT_CZ   = (USB_REC_ZLO + USB_REC_ZHI) / 2.0 + Z_BOARD_BOT  # -2.79


# =============================================================================
# GLOBALS filled in run()
# =============================================================================
_app = None
_ui = None
_comp = None          # the enclosure component
_cage = None          # the "cage" BRepBody
_skipped = []         # cosmetic features that were skipped (shown at the end)


# -----------------------------------------------------------------------------
# Small geometry helpers (proven idioms from braille_wearable_enclosure.py)
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
    profile's own sketch plane.  The robust idiom for cuts sketched on OFFSET
    yZ construction planes (help.autodesk.com ExtrudeInput_setSymmetricExtent
    -- isFullLength=True => total_mm is the FULL length, +/- total_mm/2)."""
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
# -----------------------------------------------------------------------------
def _register_parameters(design):
    up = design.userParameters
    params = [
        ("board_bay",        BOARD_BAY,      "Host board footprint (HIGH, file16 row1)"),
        ("board_thick",      BOARD_THICK,    "PCB thickness (HIGH, row2)"),
        ("board_hole_x",     BOARD_HOLE_X,   "Screw hole centre offset (HIGH, row3)"),
        ("bay_clearance",    BAY_CLEAR,      "Board bay clearance/side (DESIGN)"),
        ("wall",             WALL,           "Cage wall (DESIGN >=2.5)"),
        ("plate_t",          PLATE_T,        "Skin plate thickness (DESIGN >=3.0)"),
        ("neg_z_pocket",     NEG_Z_POCKET,   "-Z pocket depth (DESIGN >=6)"),
        ("z_band_top",       Z_BAND_TOP,     "Base-ring top / keep-out ceiling (DESIGN 27c)"),
        ("z_deck_bot",       Z_DECK_BOT,     "L-rim underside / window lintel (DESIGN 27c)"),
        ("z_deck_top",       Z_DECK_TOP,     "L-rim top / deck (DESIGN 27c)"),
        ("deck_ring_w",      DECK_RING_W,    "L-rim width, +Y and -X (DESIGN 27c)"),
        ("post_sq",          POST_SQ,        "Corner-post outer footprint (DESIGN 27c)"),
        ("post_cut",         POST_CUT,       "Post inner-corner 45-deg cut-back leg (DESIGN, file 34 E1)"),
        ("z_post_top",       Z_POST_TOP,     "Roll-cage top height (DESIGN 27c)"),
        ("win_w",            WIN_W,          "-X side window width, Y (DESIGN 27c)"),
        ("win_w_y",          WIN_W_Y,        "+Y side window width, X (DESIGN 27c)"),
        ("win_chamf",        WIN_CHAMF,      "-X window top-corner chamfer (DESIGN 27c)"),
        ("web_t",            WEB_T,          "Top corner-plate thickness (DESIGN 27c)"),
        ("plate_leg",        PLATE_LEG,      "Top corner-plate leg (DESIGN, file 34 E3)"),
        ("port_ctr",         PORT_CTR,       "Module/port centre offset (HIGH, row4)"),
        ("module_sq",        MODULE_SQ,      "22x22 module PCB (HIGH, row13)"),
        ("module_clear_row", MODULE_CLEAR_ROW, "Pocket row-dir clearance (HIGH, row28)"),
        ("lcd_win_cx",       LCD_WIN_CX,     "LCD window centre X (HIGH, C12)"),
        ("lcd_win_cy",       LCD_WIN_CY,     "LCD window centre Y (HIGH, C12)"),
        ("lcd_win_w",        LCD_WIN_W,      "LCD window X (HIGH, row20)"),
        ("lcd_win_h",        LCD_WIN_H,      "LCD window Y (HIGH, row20)"),
        ("enc_x",            ENC_X,          "Encoder shaft X (HIGH, row26)"),
        ("enc_y",            ENC_Y,          "Encoder shaft Y (HIGH, row26)"),
        ("btn_x",            BTN_X,          "Button column X (HIGH, row9)"),
        ("usb_slot_w",       USB_SLOT_W,     "USB slot width (DESIGN >=12)"),
        ("usb_slot_h",       USB_SLOT_H,     "USB slot height (DESIGN >=7)"),
        ("usb_web",          USB_WEB,        "USB front web thickness (DESIGN §A)"),
        ("usb_funnel",       USB_FUNNEL,     "USB funnel chamfer (DESIGN 27c)"),
        ("lug_gap",          LUG_GAP,        "Internal lug gap = strap width (DESIGN)"),
        ("lug_bore",         LUG_BORE,       "Lug bore Ø (DESIGN)"),
        ("boss_dia",         BOSS_DIA,       "M2 boss/standoff Ø (DESIGN)"),
        ("boss_pilot",       BOSS_PILOT,     "M2 self-tap pilot Ø (DESIGN)"),
        ("plate_hole_dia",   PLATE_HOLE_DIA, "Plate M2 clearance hole (reference shell)"),
        ("chamfer_vert",     CHAMFER_VERT,   "Vertical outer corner chamfer (DESIGN 27c)"),
        ("chamfer_top",      CHAMFER_TOP,    "Universal top chamfer (DESIGN 27c)"),
    ]
    for name, value, comment in params:
        try:
            up.add(name, _cm(value), "mm", comment)
        except Exception:
            pass  # a name clash (re-run into same doc) is non-fatal


# =============================================================================
# BUILD STEPS  (timeline order)
# =============================================================================
def _build_cage_block():
    """Step 1: outer 62x62 solid block from plate-bottom to post-top."""
    global _cage
    sk = _sketch_on_xy_at(Z_PLATE_BOT)
    prof = _rect_profile(sk, 0, 0, CAGE_OUTER, CAGE_OUTER)     # 62x62
    feat = _extrude(prof, Z_POST_TOP - Z_PLATE_BOT, NEWBODY)   # 27.6 mm tall
    _cage = feat.bodies.item(0)
    _cage.name = "cage"


def _cut_cavity():
    """Step 2 (+3 merged): hollow the interior 57x57 from the open bottom all
    the way to Z_POST_TOP, leaving 2.5 walls + open bottom.

    27c lists a separate 'board keep-out relief' (its step 3) that also cuts
    57x57 up to Z_POST_TOP -- executed literally that is the SAME solid as step
    2, so a second cut would remove nothing and (in Fusion, and in the offline
    test engine) raise 'No target body found to cut'.  The two are therefore
    merged into ONE full-height hollow: the cavity is empty above +2 (keep-out
    satisfied) and the only sanctioned inboard material is the bosses/gussets
    below the board (added next), so nothing intrudes the 57x57 board bay."""
    sk = _sketch_on_xy_at(Z_PLATE_BOT)
    prof = _rect_profile(sk, 0, 0, CAVITY, CAVITY)             # 57x57
    _extrude(prof, Z_POST_TOP - Z_PLATE_BOT, CUT)


def _add_bosses_and_gussets():
    """Step 3: 4x M2 standoffs (+/-24.1) grounded to the walls by corner pads."""
    corners = [( BOARD_HOLE_X,  BOARD_HOLE_X),
               ( BOARD_HOLE_X, -BOARD_HOLE_X),
               (-BOARD_HOLE_X,  BOARD_HOLE_X),
               (-BOARD_HOLE_X, -BOARD_HOLE_X)]
    for (cx, cy) in corners:
        gx = (CAVITY_HALF - GUSSET_SQ / 2.0) * (1 if cx > 0 else -1)
        gy = (CAVITY_HALF - GUSSET_SQ / 2.0) * (1 if cy > 0 else -1)
        sk = _sketch_on_xy_at(Z_PLATE_TOP)
        prof = _rect_profile(sk, gx, gy, GUSSET_SQ, GUSSET_SQ)
        _extrude(prof, GUSSET_T, JOIN)                         # -8.1 -> -5.6
    for (cx, cy) in corners:
        sk = _sketch_on_xy_at(Z_PLATE_TOP)
        sk.sketchCurves.sketchCircles.addByCenterRadius(_pt(cx, cy), BOSS_DIA / 2.0 / 10.0)
        prof = sk.profiles.item(sk.profiles.count - 1)
        _extrude(prof, Z_BOARD_BOT - Z_PLATE_TOP, JOIN)        # -8.1 -> -1.6 (6.5 tall)
    for (cx, cy) in corners:
        sk = _sketch_on_xy_at(Z_PLATE_TOP)
        sk.sketchCurves.sketchCircles.addByCenterRadius(_pt(cx, cy), BOSS_PILOT / 2.0 / 10.0)
        prof = sk.profiles.item(sk.profiles.count - 1)
        _extrude(prof, Z_BOARD_BOT - Z_PLATE_TOP, CUT)


def _cut_usb_slot():
    """Step 4: USB-C slot 12x7 through the +X base ring, centred Y=0, z -2.79.
    Orientation-proof: MODEL-space corners via modelToSketchSpace on an offset
    yZ plane + a symmetric extent through the wall."""
    x_start = CAVITY_HALF - 1.5                                # 27.0
    plane = _offset_plane(_comp.yZConstructionPlane, x_start)
    sk = _comp.sketches.add(plane)
    c0 = sk.modelToSketchSpace(_pt(x_start, -USB_SLOT_W / 2.0, USB_SLOT_CZ - USB_SLOT_H / 2.0))
    c1 = sk.modelToSketchSpace(_pt(x_start,  USB_SLOT_W / 2.0, USB_SLOT_CZ + USB_SLOT_H / 2.0))
    sk.sketchCurves.sketchLines.addTwoPointRectangle(c0, c1)
    prof = sk.profiles.item(sk.profiles.count - 1)
    _extrude_symmetric(prof, 2.0 * ((CAGE_HALF - x_start) + 2.0), CUT)  # spans X 21..33


def _add_lugs():
    """Step 5: 2 lug pairs on +/-Y base ring, gap 22.0, Ø2.6 through bores."""
    x_ctr = LUG_GAP / 2.0 + LUG_W / 2.0                        # 14.0
    y_root = CAVITY_HALF                                       # 28.5
    y_tip = CAGE_HALF + LUG_PROJ                               # 36.0
    y_mid = (y_root + y_tip) / 2.0
    for sign in (1, -1):
        for xs in (1, -1):
            cx = xs * x_ctr
            sk = _sketch_on_xy_at(LUG_BORE_Z - LUG_H / 2.0)
            prof = _rect_profile(sk, cx, sign * y_mid, LUG_W, (y_tip - y_root))
            _extrude(prof, LUG_H, JOIN)
            # Ø2.6 bore along X.  FIT feature -- NOT wrapped in a cosmetic
            # fallback: if this fails the run must abort loudly.  Orientation-
            # proof: MODEL-space centre via modelToSketchSpace on a yZ plane AT
            # the lug mid-plane + a symmetric extent piercing the whole block.
            plane = _offset_plane(_comp.yZConstructionPlane, cx)
            sk2 = _comp.sketches.add(plane)
            ctr = sk2.modelToSketchSpace(_pt(cx, sign * y_mid, LUG_BORE_Z))
            sk2.sketchCurves.sketchCircles.addByCenterRadius(ctr, LUG_BORE / 2.0 / 10.0)
            prof2 = sk2.profiles.item(sk2.profiles.count - 1)
            _extrude_symmetric(prof2, LUG_W + 2.0, CUT)


def _add_posts():
    """Step 6: 4x PENTAGON corner posts, JOINed +2 -> +16.5 (file 34 E1).

    Each post is a 9x9 square footprint (outer corner at (+/-31,+/-31), inner
    faces at +/-POST_INNER=22) MINUS a 45-deg triangle cut off the inner corner
    with leg POST_CUT=3.5.  The pentagon keeps no material in the module
    L-keep-out (module corner reaches +/-23; the cut-back hypotenuse
    |x|+|y| >= 2*POST_INNER+POST_CUT = 47.5 stays outboard of the
    {|x|<24.3,|y|<23}U{|x|<23,|y|<24.3} L-region, i.e. >=1.3 mm incl. +/-1.27
    registration).  Each post overlaps the full-height 2.5 wall (28.5..31) it
    grows against, so the JOIN unions robustly; below +2 it fuses into the base
    ring."""
    inner = POST_INNER
    cut_in = POST_INNER + POST_CUT                             # 25.5
    for sx in (1, -1):
        for sy in (1, -1):
            # pentagon vertices, CCW: cut inner corner (sx*22,sy*22) removed
            verts = [
                (sx * cut_in,     sy * inner),                 # on the +/-Y face
                (sx * CAGE_HALF,  sy * inner),                 # outer, +/-Y face
                (sx * CAGE_HALF,  sy * CAGE_HALF),             # outer corner
                (sx * inner,      sy * CAGE_HALF),             # outer, +/-X face
                (sx * inner,      sy * cut_in),                # on the +/-X face
            ]
            sk = _sketch_on_xy_at(Z_BAND_TOP)
            lines = sk.sketchCurves.sketchLines
            pts = [_pt(vx, vy) for (vx, vy) in verts]
            for i in range(5):
                lines.addByTwoPoints(pts[i], pts[(i + 1) % 5])
            prof = sk.profiles.item(sk.profiles.count - 1)
            _extrude(prof, Z_POST_TOP - Z_BAND_TOP, JOIN)      # +2 -> +16.5


def _add_top_rim():
    """Step 8: L top-rim on +Y and -X, width 4 (inboard 28.5->24.5), z +11..+13.
    Rects overlap the corner posts (to +/-23) so both JOINs union robustly."""
    # +Y rim
    sk = _sketch_on_xy_at(Z_DECK_BOT)
    prof = _rect_profile(sk, 0.0, (RIM_INNER + CAVITY_HALF) / 2.0,
                         2.0 * (POST_INNER + 1.0), DECK_RING_W)  # x -23..23
    _extrude(prof, Z_DECK_TOP - Z_DECK_BOT, JOIN)
    # -X rim
    sk = _sketch_on_xy_at(Z_DECK_BOT)
    prof = _rect_profile(sk, -(RIM_INNER + CAVITY_HALF) / 2.0, 0.0,
                         DECK_RING_W, 2.0 * (POST_INNER + 1.0))  # y -23..23
    _extrude(prof, Z_DECK_TOP - Z_DECK_BOT, JOIN)


def _add_corner_plates():
    """Step 9: 4 top CORNER PLATES (file 34 E3) -- one per cage corner, a
    horizontal triangular web at z Z_DECK_TOP-WEB_T .. Z_DECK_TOP (10.5..13),
    right angle at the cage corner (+/-31,+/-31), legs PLATE_LEG=7.5 along each
    wall -> vertices (+/-31,+/-31),(+/-(31-7.5),+/-31),(+/-31,+/-(31-7.5)).  Each
    plate overlaps its 9x9 post pentagon VOLUMETRICALLY (the whole triangle lies
    inside |x|+|y|>=54.5, well outboard of the post hypotenuse 47.5), so the JOIN
    fuses into one lump -- unlike the deleted floating gussets.

    (+X,-Y) EXCEPTION (file 34 E3 decision): that corner's +/-Y-wall leg is
    CLIPPED to x>=24.5 so the plate clears the LCD PCB-overhang relief envelope
    (x -0.3..24.3, y to -30.5, z 9.5..15).  Unclipped, the plate would poke a
    ~0.3x0.5 mm sliver into the relief corner (computed file 34); clipping the
    leg from x 23.5 to x 24.5 removes it while keeping full post overlap."""
    for sx in (1, -1):
        for sy in (1, -1):
            leg_wall_y = PLATE_LEG                             # leg along +/-Y wall (x varies)
            if sx > 0 and sy < 0:                              # (+X,-Y): clip to x>=24.5
                leg_wall_y = CAGE_HALF - 24.5                  # 6.5
            outer = (sx * CAGE_HALF, sy * CAGE_HALF)
            v_wall_y = (sx * (CAGE_HALF - leg_wall_y), sy * CAGE_HALF)  # on +/-Y wall
            v_wall_x = (sx * CAGE_HALF, sy * (CAGE_HALF - PLATE_LEG))   # on +/-X wall
            sk = _sketch_on_xy_at(Z_DECK_TOP - WEB_T)          # 10.5 (top flush at Z_DECK_TOP)
            lines = sk.sketchCurves.sketchLines
            p = [_pt(*outer), _pt(*v_wall_y), _pt(*v_wall_x)]
            for i in range(3):
                lines.addByTwoPoints(p[i], p[(i + 1) % 3])
            prof = sk.profiles.item(sk.profiles.count - 1)
            _extrude(prof, WEB_T, JOIN)                        # 10.5 -> 13.0


def _cut_side_window_x():
    """Step 11: -X SIDE WINDOW, 26 wide (Y), z -1.6..+11, chamfered TOP corners
    (45-deg, WIN_CHAMF 7) -> 12 mm self-supporting lintel.  Orientation-proof:
    MODEL-space polygon via modelToSketchSpace on an offset yZ plane + a
    symmetric extent through the -X wall."""
    x_wall = -CAGE_HALF                                        # -31
    plane = _offset_plane(_comp.yZConstructionPlane, x_wall)
    sk = _comp.sketches.add(plane)
    ylo, yhi = -WIN_W / 2.0, WIN_W / 2.0                       # -13 .. +13
    c = WIN_CHAMF                                              # 7
    # square bottom, 45-deg chamfered top corners (model y,z at x=-31), CCW
    corners_model = [
        (ylo, WIN_LO), (yhi, WIN_LO),
        (yhi, WIN_HI - c), (yhi - c, WIN_HI),
        (ylo + c, WIN_HI), (ylo, WIN_HI - c),
    ]
    pts = [sk.modelToSketchSpace(_pt(x_wall, y, z)) for (y, z) in corners_model]
    lines = sk.sketchCurves.sketchLines
    for i in range(6):
        lines.addByTwoPoints(pts[i], pts[(i + 1) % 6])
    prof = sk.profiles.item(sk.profiles.count - 1)
    _extrude_symmetric(prof, 2.0 * (WALL + 1.0), CUT)         # pierces the -X wall


def _cut_side_window_y():
    """Step 12: +Y SIDE WINDOW, 18 wide (X), z -1.6..+11.  Cut with a vertical
    Z-extruded tool box (the fake/offline engine and this idiom set expose only
    xY and yZ construction planes; a +Y-wall aperture is bounded in X,Z and cut
    through Y, which a Z-extruded XY rectangle achieves cleanly).  Top corners
    are square here -> 18 mm lintel (see header print note)."""
    y_out = CAVITY_HALF + WALL + 0.5                           # 33.5 (past +Y face)
    y_in = POST_INNER                                          # 22 (spans wall + a hair inboard)
    sk = _sketch_on_xy_at(WIN_LO)
    prof = _rect_profile(sk, 0.0, (y_out + y_in) / 2.0, WIN_W_Y, (y_out - y_in))
    _extrude(prof, WIN_HI - WIN_LO, CUT)                       # -1.6 -> +11 through +Y wall


def _cut_neg_y_opening():
    """Step 13: remove the -Y upper wall entirely above +2 (between the posts) --
    the LCD relief 'by absence'.  Vertical Z-extruded box through the -Y wall."""
    y_out = CAVITY_HALF + WALL + 0.5                           # 33.5
    y_in = CAVITY_HALF - 0.5                                   # 28.0 (wall band)
    sk = _sketch_on_xy_at(Z_BAND_TOP)
    prof = _rect_profile(sk, 0.0, -(y_out + y_in) / 2.0, 2.0 * POST_INNER, (y_out - y_in))
    _extrude(prof, Z_POST_TOP - Z_BAND_TOP, CUT)              # +2 -> +16.5, x -22..22


def _cut_lcd_relief():
    """Step 14: §A LCD overhang relief -- void in x -0.3..24.3, z 9.5..15 out to
    y -30.5.  The -Y opening (step 13) already cleared the wall for x -22..22;
    this notch additionally removes the +X/-Y post's inner-lower corner
    (x 22..24.3) in the relief band so the 2.5 mm LCD PCB overhang clears it.
    (Accepted consequence: the +X/-Y post is notched at z 9.5..15 -- the -Y-open
    weak corner of 27c §7.)"""
    y_out = -(BOARD_BAY / 2.0 + LCD_OVERHANG + 0.5)           # -30.5
    y_in = -(POST_INNER - 0.01)                               # -22 (into post inner corner)
    x_w = LCD_PCB_H + 2.0 * MODULE_CLEAR_ROW                  # 24.6 (x -0.3..24.3)
    z_lo, z_hi = 9.5, 15.0
    sk = _sketch_on_xy_at(z_lo)
    prof = _rect_profile(sk, LCD_PCB_CX, (y_out + y_in) / 2.0, x_w, (y_in - y_out))
    _extrude(prof, z_hi - z_lo, CUT)


def _cut_pos_x_opening():
    """Step 15: open the +X frame above +2 (buttons BARE, +X fully open) --
    remove the +X wall band between the +X posts.  The USB slot + base ring
    below +2 are untouched (so the slot keeps its solid roof)."""
    x_out = CAVITY_HALF + WALL + 0.5                           # 33.5
    x_in = CAVITY_HALF - 0.5                                   # 28.0
    sk = _sketch_on_xy_at(Z_BAND_TOP)
    prof = _rect_profile(sk, (x_out + x_in) / 2.0, 0.0, (x_out - x_in), 2.0 * POST_INNER)
    _extrude(prof, Z_POST_TOP - Z_BAND_TOP, CUT)             # +2 -> +16.5, y -22..22


def _build_skin_plate():
    """Step 17: the solid skin plate (2nd body) + 4 corner counterbores."""
    sk = _sketch_on_xy_at(Z_PLATE_BOT)
    prof = _rect_profile(sk, 0, 0, CAVITY, CAVITY)            # 57x57
    feat = _extrude(prof, PLATE_T, NEWBODY)                   # -11.1 -> -8.1
    plate = feat.bodies.item(0)
    plate.name = "skin_plate"
    corners = [( BOARD_HOLE_X,  BOARD_HOLE_X), ( BOARD_HOLE_X, -BOARD_HOLE_X),
               (-BOARD_HOLE_X,  BOARD_HOLE_X), (-BOARD_HOLE_X, -BOARD_HOLE_X)]
    for (cx, cy) in corners:
        sk = _sketch_on_xy_at(Z_PLATE_BOT)
        sk.sketchCurves.sketchCircles.addByCenterRadius(_pt(cx, cy), PLATE_HOLE_DIA / 2.0 / 10.0)
        _extrude(sk.profiles.item(sk.profiles.count - 1), PLATE_T, CUT)
        sk = _sketch_on_xy_at(Z_PLATE_BOT)
        sk.sketchCurves.sketchCircles.addByCenterRadius(_pt(cx, cy), PLATE_CB_DIA / 2.0 / 10.0)
        _extrude(sk.profiles.item(sk.profiles.count - 1), PLATE_CB_D, CUT)


# -----------------------------------------------------------------------------
# Chamfers (deterministic edge selection; cosmetic -> degrade gracefully).
# The offline geometry engine RECORDS chamfers without applying them, so the
# selection code runs against real edges and the bbox stays exact; in Fusion the
# chamfers are the visible 45-deg motif.
# -----------------------------------------------------------------------------
def _edge_is_vertical(edge):
    g = edge.geometry
    if g.objectType != adsk.core.Line3D.classType():
        return None
    sp, ep = g.startPoint, g.endPoint
    dx, dy, dz = ep.x - sp.x, ep.y - sp.y, ep.z - sp.z
    length = (dx * dx + dy * dy + dz * dz) ** 0.5
    if length < 1e-6 or abs(dz) / length < 0.99:
        return None
    return ((sp.x + ep.x) / 2.0 * 10.0, (sp.y + ep.y) / 2.0 * 10.0)


def _horizontal_edge_mid(edge):
    g = edge.geometry
    if g.objectType != adsk.core.Line3D.classType():
        return None
    sp, ep = g.startPoint, g.endPoint
    if abs(ep.z - sp.z) > 1e-6:
        return None
    return ((sp.x + ep.x) / 2.0 * 10.0, (sp.y + ep.y) / 2.0 * 10.0,
            (sp.z + ep.z) / 2.0 * 10.0)


def _apply_equal_chamfer(edges, distance_mm, both):
    chamfers = _comp.features.chamferFeatures
    cin = chamfers.createInput2()
    cin.chamferEdgeSets.addEqualDistanceChamferEdgeSet(edges, _cm(distance_mm), both)
    chamfers.add(cin)


def _chamfer_top_edges():
    """CHAMFER_TOP 1.0 -- universal 45-deg chamfer on top-facing outer edges of
    the posts / rim / corner plates (mz at post-top or deck-top, near the outer
    perimeter)."""
    try:
        edges = adsk.core.ObjectCollection.create()
        for edge in _cage.edges:
            m = _horizontal_edge_mid(edge)
            if m is None:
                continue
            mx, my, mz = m
            near_top = abs(mz - Z_POST_TOP) < 0.3 or abs(mz - Z_DECK_TOP) < 0.3
            if near_top and (abs(mx) > CAGE_HALF - 1.0 or abs(my) > CAGE_HALF - 1.0):
                edges.add(edge)
        if edges.count == 0:
            _skipped.append("top chamfers (no edges matched)")
            return
        _apply_equal_chamfer(edges, CHAMFER_TOP, True)
    except Exception:
        _skipped.append("top chamfers (exception)")


def _chamfer_vertical_corners():
    """CHAMFER_VERT 3.0 on the 4 vertical outer post corners."""
    try:
        edges = adsk.core.ObjectCollection.create()
        for edge in _cage.edges:
            res = _edge_is_vertical(edge)
            if res is None:
                continue
            mx, my = res
            if abs(mx) > CAGE_HALF - 1.0 and abs(my) > CAGE_HALF - 1.0:
                edges.add(edge)
        if edges.count == 0:
            _skipped.append("vertical corner chamfers (no edges matched)")
            return
        _apply_equal_chamfer(edges, CHAMFER_VERT, True)
    except Exception:
        _skipped.append("vertical corner chamfers (exception)")


def _chamfer_usb_funnel():
    """USB_FUNNEL 1.0 funnel chamfer on the exterior long edges of the USB slot."""
    try:
        edges = adsk.core.ObjectCollection.create()
        for edge in _cage.edges:
            g = edge.geometry
            if g.objectType != adsk.core.Line3D.classType():
                continue
            sp, ep = g.startPoint, g.endPoint
            if abs(ep.z - sp.z) > 1e-6 or abs(ep.x - sp.x) > 1e-6:
                continue
            mx = (sp.x + ep.x) / 2.0 * 10.0
            mz = (sp.z + ep.z) / 2.0 * 10.0
            if mx > CAGE_HALF - 0.6 and abs(mz - USB_SLOT_CZ) < USB_SLOT_H / 2.0 + 0.5:
                edges.add(edge)
        if edges.count:
            _apply_equal_chamfer(edges, USB_FUNNEL, True)
        else:
            _skipped.append("USB funnel chamfer (no edges matched)")
    except Exception:
        _skipped.append("USB funnel chamfer (exception)")


def _chamfer_lugs():
    """CHAMFER_LUG 1.5 on the outer (tip) face edges of the 4 lug blocks."""
    try:
        y_tip = CAGE_HALF + LUG_PROJ                          # 36.0
        edges = adsk.core.ObjectCollection.create()
        for edge in _cage.edges:
            g = edge.geometry
            if g.objectType != adsk.core.Line3D.classType():
                continue
            sp, ep = g.startPoint, g.endPoint
            my = (sp.y + ep.y) / 2.0 * 10.0
            if abs(my) > y_tip - 0.2:
                edges.add(edge)
        if edges.count == 0:
            _skipped.append("lug chamfers (no edges matched)")
            return
        _apply_equal_chamfer(edges, CHAMFER_LUG, False)
    except Exception:
        _skipped.append("lug chamfers (exception)")


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

        # New component to hold the whole cage.  A "Part Design" document allows
        # exactly ONE component, so addNewComponent() raises there -- fall back
        # to modelling directly into rootComponent.  (Multiple BODIES are always
        # allowed, so cage + skin_plate are fine in a Part document.)
        root = design.rootComponent
        try:
            occ = root.occurrences.addNewComponent(adsk.core.Matrix3D.create())
            _comp = occ.component
            _comp.name = "BrailleWearableExoCage"
        except Exception:
            _comp = root
            try:
                _comp.name = "BrailleWearableExoCage"
            except Exception:
                pass

        _register_parameters(design)

        # --- Ordered timeline (design 27c §4 build sequence, file 31 amended) --
        _build_cage_block()             # 1  outer 62x62 block
        _cut_cavity()                   # 2  hollow 57x57 (keep-out merged in)
        _add_bosses_and_gussets()       # 3  4x M2 standoffs + pads + pilots
        _cut_usb_slot()                 # 4  USB-C slot in +X base ring
        _add_lugs()                     # 5  2 lug pairs, gap 22, Ø2.6 bores
        _add_posts()                    # 6  4x pentagon corner posts +2 -> +16.5
        _add_top_rim()                  # 8  L top-rim (+Y, -X) +11 -> +13
        _add_corner_plates()            # 9  4 top corner plates (post-overlapping)
        # (encoder is fully bare -- no turret; file 34 E4)
        _cut_side_window_x()            # 11 -X side window (chamfered lintel)
        _cut_side_window_y()            # 12 +Y side window (clears lug roots)
        _cut_neg_y_opening()            # 13 -Y upper wall absent (LCD relief)
        _cut_lcd_relief()               # 14 §A LCD overhang relief notch
        _cut_pos_x_opening()            # 15 +X frame open (buttons bare)
        # 16 edge chamfers (all cosmetic -> graceful skip)
        _chamfer_top_edges()            # 16a CHAMFER_TOP 1.0 top-facing edges
        _chamfer_vertical_corners()     # 16b CHAMFER_VERT 3.0 post corners
        _chamfer_usb_funnel()           # 16c USB_FUNNEL 1.0 slot funnel
        _chamfer_lugs()                 # 16d CHAMFER_LUG 1.5 lug tips
        _build_skin_plate()             # 17 solid skin plate + counterbores

        # --- Report -----------------------------------------------------------
        msg = ("Braille wearable EXO-CAGE built (roll-cage skeleton).\n\n"
               "Bodies: cage + skin_plate\n"
               "Cage footprint: %.1f x %.1f mm, post top %.2f\n"
               "Frame: 4x pentagon corner posts (%gx%g outer), L top-rim (+Y,-X),\n"
               "       4 top corner plates, -X/+Y side windows, -Y open (LCD relief),\n"
               "       +X open (buttons), encoder BARE (no turret)\n"
               "Board bay: %.0f x %.0f, 4x M2 standoffs at +/-%.1f\n"
               % (CAGE_OUTER, CAGE_OUTER, Z_POST_TOP,
                  POST_SQ, POST_SQ, BOARD_BAY, BOARD_BAY, BOARD_HOLE_X))
        if _skipped:
            msg += "\nCosmetic features skipped (fit geometry unaffected):\n - " + \
                   "\n - ".join(_skipped)
        else:
            msg += "\nAll cosmetic features created."
        _ui.messageBox(msg)

    except Exception:
        if _ui:
            _ui.messageBox("Failed:\n{}".format(traceback.format_exc()))
