"""Regenerate the technical drawing: braille_wearable_drawing.dxf + a viewable PNG.

Portable: derives the repo root from this file's location. Run with a Python that has
ezdxf + matplotlib (see cad/README.md). The dxf skill's own runner is NOT needed here
(it pulls in build123d/OCP for 3D projection; this drawing is pure 2D ezdxf).

    python3 -m venv .venv && .venv/bin/pip install ezdxf matplotlib
    .venv/bin/python cad/render_drawing.py
"""
import sys, os

HERE = os.path.dirname(os.path.abspath(__file__))   # .../cad
PROJ = os.path.dirname(HERE)                          # repo root
sys.path.insert(0, HERE)
os.chdir(PROJ)

from braille_wearable_drawing import gen_dxf

doc = gen_dxf()
doc.saveas("cad/braille_wearable_drawing.dxf")
print("DXF saved: cad/braille_wearable_drawing.dxf")

msp = doc.modelspace()
counts = {}
for e in msp:
    counts[e.dxftype()] = counts.get(e.dxftype(), 0) + 1
print("Entity counts:", counts)

try:
    from ezdxf.addons.drawing import matplotlib as ezmpl
    ezmpl.qsave(msp, "renders/braille_technical_drawing.png", bg="#FFFFFF", dpi=150)
    print("PNG saved: renders/braille_technical_drawing.png")
except Exception as e:
    print("PNG render skipped (need matplotlib):", e)
