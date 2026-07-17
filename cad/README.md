# CAD — Speech-to-Braille Wearable enclosure

Dimensioned 2D technical drawing of the wrist enclosure — the starting point for the 3D model
in Fusion 360. Not a final printable part. Grounded in `audit/speech-to-braille-wearable/03`
(parts truth) and `07` (physical arrangement); every unmeasured dimension is flagged in the drawing.

## Files
- **`braille_wearable_drawing.py`** — parametric drawing source (`gen_dxf()` via `ezdxf`). Edit the
  parameters at the top (`BOARD`, `MOD`, `LCD_H`, `STANDOFF`, `LUG_GAP`, …) to update the drawing.
- **`braille_wearable_drawing.dxf`** — generated 2D drawing. **Import into Fusion 360** (Insert → Insert
  DXF → it becomes a sketch to build from). Also viewable in any CAD tool or `$cad-viewer`.
- **`render_drawing.py`** — regenerates the `.dxf` and a viewable PNG (`renders/braille_technical_drawing.png`).

## Regenerate
The dxf skill's own runner needs the heavy CAD kernel (`build123d`/`cadquery-ocp`), which is **not** needed
for this pure-2D drawing — just `ezdxf` (+ `matplotlib` for the PNG):

```bash
python3 -m venv .venv
.venv/bin/pip install ezdxf matplotlib
.venv/bin/python cad/render_drawing.py        # run from the repo root
```

## Measure before finalising (UNKNOWN — flagged magenta in the drawing)
AX22 socket centres + 2×5 pitch · mounting-hole XY (board + each module) · USB-C edge offset ·
board thickness · ERM coin diameter. Use calipers, or load `STP_MTX0013.step` in a CAD kernel.

## Next step
Turn this into a parametric 3D model: **Claude writes a Fusion 360 Python script** (pipeline in
`audit/speech-to-braille-wearable/08`) → Run in Fusion's *Scripts & Add-Ins* → export STL → Bambu.
The local build123d `cad` skill (STEP) is the no-Fusion fallback. Note: the Fusion Python API works
in **centimetres** — the script must convert from these mm values.
