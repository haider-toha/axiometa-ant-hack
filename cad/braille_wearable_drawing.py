"""Speech-to-Braille Wearable — enclosure concept technical drawing (2D DXF).

A dimensioned, multi-view starting drawing to import into Fusion 360 (DXF -> sketch)
and to hand to Claude for CAD scripting. NOT a final printable model.

All dimensions in millimetres, 1:1. Values are sourced from the parts corpus / audit
files 03 & 07. Anything not yet measured is drawn approximately and tagged UNKNOWN in
magenta so it is measured (calipers / CAD-kernel STEP load) before the model is finalised.
"""

import ezdxf
from ezdxf.enums import TextEntityAlignment


# ---- verified / assumed parameters (mm) --------------------------------------
BOARD = 55.0            # host board is 55 x 55 (03: HIGH confidence)
BOARD_T = 1.6           # board thickness (03: approx)
MOD = 22.0              # module footprint 22 x 22 (LCD is 22 x 29)
LCD_H = 29.0            # LCD module height
STANDOFF = 8.6          # module sits ~8.6 mm proud on the AX22 socket (03: approx)
COIN_D = 10.0           # ERM coin diameter (approx; exact UNKNOWN)
COIN_PROUD = 3.6        # coin protrusion above its module (03: approx)
KNOB_D = 12.0           # encoder knob diameter (approx)
KNOB_PROUD = 20.0       # encoder shaft/knob above its module — TALLEST (03: approx)
WALL = 2.5              # printed cage wall
PLATE_T = 3.0           # solid skin-contact plate thickness (design choice)
CAGE = BOARD + 2 * (1.0 + WALL)     # ~62 outer (1 mm bay clearance + walls)
LUG_GAP = 22.0          # strap width = 22 mm (print segmented band, or buy a 22 mm quick-release strap)
PIN_D = 2.6             # lug pin bore


def gen_dxf():
    doc = ezdxf.new("R2010", setup=True)
    doc.units = ezdxf.units.MM
    msp = doc.modelspace()

    for name, col in [
        ("BOARD", 5), ("MODULE", 8), ("SCREEN", 4), ("CAGE", 7),
        ("PLATE", 9), ("DIM", 1), ("TEXT", 7), ("HOLE", 1),
        ("UNKNOWN", 6), ("PATH", 1), ("STRAP", 8),
    ]:
        if name not in doc.layers:
            doc.layers.add(name, color=col)

    # ---- helpers -------------------------------------------------------------
    def rect(x, y, w, h, layer, close=True):
        msp.add_lwpolyline(
            [(x, y), (x + w, y), (x + w, y + h), (x, y + h)],
            close=close, dxfattribs={"layer": layer})

    def crect(cx, cy, w, h, layer):          # centred rect
        rect(cx - w / 2, cy - h / 2, w, h, layer)

    def hole(cx, cy, d, layer="HOLE"):
        msp.add_circle((cx, cy), d / 2, dxfattribs={"layer": layer})

    def text(x, y, s, h=2.4, layer="TEXT", align="MIDDLE_CENTER"):
        t = msp.add_text(s, dxfattribs={"layer": layer, "height": h})
        t.set_placement((x, y), align=getattr(TextEntityAlignment, align))
        return t

    def notes(x, y, s, h=2.4, layer="TEXT", width=90):
        m = msp.add_mtext(s, dxfattribs={"layer": layer, "char_height": h})
        m.set_location((x, y))
        m.dxf.width = width
        return m

    def hdim(x1, x2, y, s=None, layer="DIM"):
        msp.add_line((x1, y), (x2, y), dxfattribs={"layer": layer})
        for xx in (x1, x2):
            msp.add_line((xx, y - 1.2), (xx, y + 1.2), dxfattribs={"layer": layer})
        text((x1 + x2) / 2, y + 1.4, s or f"{abs(x2 - x1):.0f}", 2.2, layer)

    def vdim(y1, y2, x, s=None, layer="DIM"):
        msp.add_line((x, y1), (x, y2), dxfattribs={"layer": layer})
        for yy in (y1, y2):
            msp.add_line((x - 1.2, yy), (x + 1.2, yy), dxfattribs={"layer": layer})
        text(x + 1.6, (y1 + y2) / 2, s or f"{abs(y2 - y1):.0f}", 2.2, layer, "MIDDLE_LEFT")

    def arrow(x1, y1, x2, y2, layer="PATH"):
        msp.add_line((x1, y1), (x2, y2), dxfattribs={"layer": layer})
        import math
        a = math.atan2(y2 - y1, x2 - x1)
        for da in (2.6, -2.6):
            msp.add_line((x2, y2),
                         (x2 - 2.5 * math.cos(a + da), y2 - 2.5 * math.sin(a + da)),
                         dxfattribs={"layer": layer})

    # =========================================================================
    # VIEW 1 — TOP / OUTER FACE  (centred on origin)
    # =========================================================================
    text(0, CAGE / 2 + 14, "VIEW 1  —  OUTER FACE (faces away from wrist)", 3.2, "TEXT")
    crect(0, 0, CAGE, CAGE, "CAGE")                       # printed cage outer
    crect(0, 0, BOARD, BOARD, "BOARD")                    # host board
    for sx in (-1, 1):                                    # 4 corner mount holes (approx)
        for sy in (-1, 1):
            hole(sx * (BOARD / 2 - 5), sy * (BOARD / 2 - 5), 2.7)

    # 2x2 module cluster (motors on the DIAGONAL for max separation) — centres approx
    P = 13.0
    mods = {(-P, P): ("MOTOR A\n(L col)", "coin"),
            (P, -P): ("MOTOR B\n(R col)", "coin"),
            (P, P): ("LCD 0.96\"\n22x29", "screen"),
            (-P, -P): ("ENCODER\nknob", "knob")}
    for (cx, cy), (lbl, kind) in mods.items():
        mh = LCD_H if kind == "screen" else MOD       # LCD module is 22 x 29 (taller)
        crect(cx, cy, MOD, mh, "MODULE")
        if kind == "coin":
            hole(cx, cy, COIN_D, "MODULE")
        elif kind == "knob":
            hole(cx, cy, KNOB_D, "MODULE")
        elif kind == "screen":
            crect(cx, cy, 13.5, 27.9, "SCREEN")       # glass 13.5 x 27.9 (portrait on the module)
        text(cx, cy - (mh / 2 - 3), lbl, 1.9, "TEXT")

    # USB-C on right edge
    rect(CAGE / 2 - 0.5, -4, 3.5, 8, "CAGE")
    text(CAGE / 2 + 7, 0, "USB-C\n(edge — offset UNKNOWN)", 1.9, "UNKNOWN", "MIDDLE_LEFT")

    # strap lugs (top & bottom), gap = strap width
    for sy in (-1, 1):
        ybase = sy * CAGE / 2
        for sx in (-1, 1):
            lx = sx * (LUG_GAP / 2)
            rect(lx - 1.5, ybase - (0 if sy > 0 else 5), 3, 5, "CAGE")
            hole(lx, ybase + sy * 2.5, PIN_D, "HOLE")

    hdim(-CAGE / 2, CAGE / 2, -CAGE / 2 - 8, f"{CAGE:.0f} cage (approx)")
    hdim(-BOARD / 2, BOARD / 2, -CAGE / 2 - 14, "55 board")
    hdim(-LUG_GAP / 2, LUG_GAP / 2, CAGE / 2 + 8, "22 strap")
    hdim(P - MOD / 2, P + MOD / 2, P + MOD / 2 + 2, "22 module")
    text(0, -CAGE / 2 - 20, "module + socket-cluster positions APPROX — measure AX22 socket centres & pitch",
         2.0, "UNKNOWN")

    # =========================================================================
    # VIEW 2 — SIDE / CROSS-SECTION  (to the right)
    # =========================================================================
    X0 = 110.0
    text(X0, CAGE / 2 + 14, "VIEW 2  —  SIDE CROSS-SECTION (worn orientation; representative, Z not to scale)", 2.8, "TEXT")
    half = CAGE / 2
    y_wrist = -half
    BACK_Z = 4.0                                        # back-side parts (ESP32-S3, USB-C) between board and plate
    y_plate0, y_plate1 = y_wrist, y_wrist + PLATE_T
    y_board0, y_board1 = y_plate1 + BACK_Z, y_plate1 + BACK_Z + BOARD_T
    y_modb = y_board1 + STANDOFF                       # module bottom
    y_modt = y_modb + BOARD_T                          # module top

    # wrist line
    msp.add_line((X0 - half, y_wrist), (X0 + half, y_wrist), dxfattribs={"layer": "UNKNOWN"})
    text(X0, y_wrist - 3, "WRIST (top of wrist) — strap holds plate firmly here", 2.0, "UNKNOWN")
    rect(X0 - half, y_plate0, CAGE, PLATE_T, "PLATE")            # skin plate
    text(X0 - half - 2, y_plate0 + PLATE_T / 2, "skin plate", 1.8, "PLATE", "MIDDLE_RIGHT")
    rect(X0 - BOARD / 2, y_plate1, BOARD, BACK_Z, "MODULE")      # back-side components (board not flush)
    text(X0 + half + 4, y_plate1 + BACK_Z / 2, "back parts ~4 (ESP32-S3, USB-C) - board NOT flush [approx]", 1.7, "MODULE", "MIDDLE_LEFT")
    rect(X0 - BOARD / 2, y_board0, BOARD, BOARD_T, "BOARD")      # board
    text(X0 - half - 2, y_board0 + BOARD_T / 2, "host board ~1.6", 1.8, "BOARD", "MIDDLE_RIGHT")

    # modules standing on standoffs
    for cx, top_extra, kind in [(-P, COIN_PROUD, "coin"), (P, KNOB_PROUD, "knob")]:
        # standoff posts
        rect(X0 + cx - MOD / 2, y_board1, 2, STANDOFF, "MODULE")
        rect(X0 + cx + MOD / 2 - 2, y_board1, 2, STANDOFF, "MODULE")
        rect(X0 + cx - MOD / 2, y_modb, MOD, BOARD_T, "MODULE")   # module PCB
        if kind == "coin":
            crect(X0 + cx, y_modt + top_extra / 2, COIN_D, top_extra, "MODULE")
            text(X0 + cx, y_modt + top_extra + 2, "ERM coin\n(faces OUT)", 1.7, "TEXT")
        else:
            rect(X0 + cx - 1.5, y_modt, 3, top_extra, "MODULE")   # knob shaft
            crect(X0 + cx, y_modt + top_extra, KNOB_D, 4, "MODULE")
            text(X0 + cx, y_modt + top_extra + 4, "knob (TALLEST)", 1.7, "TEXT")

    # cage walls
    for sx in (-1, 1):
        rect(X0 + sx * half - (WALL if sx > 0 else 0), y_wrist, WALL,
             (y_modt + KNOB_PROUD + 6) - y_wrist, "CAGE")

    # vibration path arrow: coin -> board -> plate -> wrist
    arrow(X0 - P, y_modt, X0 - P, y_wrist + 1, "PATH")
    text(X0, y_wrist - 8,
         "VIBRATION PATH: motor shakes the whole rigid stack -> plate -> wrist (a closed plate TRANSMITS it; a soft membrane would damp it)",
         1.9, "PATH", "MIDDLE_CENTER")

    text(X0, y_modt + KNOB_PROUD + 10, "OUTER / VIEWING SIDE (up)", 2.2, "TEXT")
    text(X0 + half + 4, y_modt + 6, "cage wall 2.5", 1.7, "CAGE", "MIDDLE_LEFT")
    vdim(y_plate0, y_plate1, X0 + half + 4, f"{PLATE_T:.0f} plate")
    vdim(y_board1, y_modb, X0 + half + 12, "~8.6 standoff (approx)")
    vdim(y_wrist, y_modt + KNOB_PROUD, X0 + half + 26, "~39 total (approx)")

    # =========================================================================
    # VIEW 3 — UNDERSIDE (below view 1)
    # =========================================================================
    Y0 = -CAGE - 40
    text(0, Y0 + CAGE / 2 + 10, "VIEW 3  —  UNDERSIDE / SKIN PLATE (touches wrist)", 3.2, "TEXT")
    crect(0, Y0, CAGE, CAGE, "PLATE")
    for sy in (-1, 1):
        for sx in (-1, 1):
            rect(sx * (LUG_GAP / 2) - 1.5, Y0 + sy * CAGE / 2 - (0 if sy > 0 else 5), 3, 5, "CAGE")
            hole(sx * (LUG_GAP / 2), Y0 + sy * (CAGE / 2) + sy * 2.5, PIN_D)
    text(0, Y0, "SOLID rigid skin plate\nNO components  NO holes\n(motors couple through it)", 2.2, "PLATE")

    # =========================================================================
    # NOTES / BOM
    # =========================================================================
    notes(-CAGE / 2, Y0 - CAGE / 2 - 8,
          "SPEECH-TO-BRAILLE WEARABLE — ENCLOSURE CONCEPT  (1:1, mm)\\P"
          "\\PBOM (all on ONE outer face, snap into a central 2x2 AX22 cluster):\\P"
          "  - Host board 55 x 55 x ~1.6 (thickness approx) + ~4 back-side parts (ESP32-S3, USB-C)\\P"
          "  - LCD 0.96in module 22 x 29 (glass 13.5 x 27.9)\\P"
          "  - Rotary encoder module 22 x 22 (knob ~20 proud = TALLEST)\\P"
          "  - 2x ERM motor module 22 x 22 (coin ~10 dia, ~3.6 proud) on DIAGONAL ports\\P"
          "  - Gray PLA printed cage + SOLID gray PLA skin plate\\P"
          "\\PWORN LIKE A WATCH: outer face up, plate against top of wrist. Motors face\\P"
          "OUT and buzz the whole rigid stack -> plate -> wrist (a closed plate transmits;\\P"
          "a soft membrane would DAMP it). Rigidly clamp each motor module to the plate.\\P"
          "\\PUNKNOWN (magenta) — MEASURE before finalising: AX22 socket centres + 2x5 pitch,\\P"
          "mounting-hole XY, USB-C edge offset, board thickness, coin diameter.\\P"
          "\\PSTRAP (22 mm lugs): print a segmented pin-hinge band (PLA, no magnets, Ø2.5 pin) OR\\P"
          "buy a 22 mm quick-release strap (Ø1.9 spring-bar bore). Fits 256 bed whole; split for 180 bed.\\P"
          "\\PPRINTER: fits any Bambu (256 std / 180 mini). One-piece flexible PLA strap is NOT viable.",
          2.2, "TEXT", width=130)

    return doc


if __name__ == "__main__":
    gen_dxf().saveas("braille_wearable_drawing.dxf")
