"""STEP -> per-part STL for the Blender render pipeline.

Splits slides/models/v2_20mm_render_without_cage.step into one STL per
top-level child so each part can be animated independently in Blender.
Run with the repo venv:  .venv/bin/python slides/build/step_to_stl.py
"""
import sys, time, pathlib
from build123d import import_step, export_stl

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / "slides/models/v2_20mm_render_without_cage.step"
OUT = ROOT / "slides/build/mesh"
OUT.mkdir(parents=True, exist_ok=True)

# Port map from plan/2026-07-18-bus-stop-situational-awareness.md "Port Map".
# Child order in the STEP is positional; we disambiguate the two AX22-0018
# buzzers by their X/Y centroid against the measured port centres.
PORT_CENTRES = {"P1": (-12.0, -12.0), "P2": (12.0, -12.0),
                "P3": (12.0, 12.0), "P4": (-12.0, 12.0)}

def nearest_port(cx, cy):
    return min(PORT_CENTRES, key=lambda p: (PORT_CENTRES[p][0]-cx)**2
                                         + (PORT_CENTRES[p][1]-cy)**2)

def main():
    t0 = time.time()
    asm = import_step(str(SRC))
    print(f"imported {SRC.name} in {time.time()-t0:.1f}s")

    # Centre the assembly on the board so Blender gets a sane origin.
    bb = asm.bounding_box()
    ox, oy = bb.center().X, bb.center().Y

    manifest = []
    for i, child in enumerate(asm.children):
        cb = child.bounding_box()
        cx, cy = cb.center().X - ox, cb.center().Y - oy
        label = child.label or f"part_{i}"
        if label.startswith("AX22"):
            name = f"{nearest_port(cx, cy)}_{label}"
        elif label == "STP_MTX0013":
            name = "board_STP_MTX0013"
        else:
            name = label
        dest = OUT / f"{name}.stl"
        t1 = time.time()
        # tolerance/angular_tolerance tuned for render quality, not print.
        export_stl(child, str(dest), tolerance=0.02, angular_tolerance=0.15)
        kb = dest.stat().st_size / 1024
        print(f"  {name:28s} {kb:8.0f} KB  ({time.time()-t1:.1f}s)"
              f"  centre=({cx:+.1f},{cy:+.1f})")
        manifest.append({"name": name, "label": label,
                         "centre": [round(cx, 3), round(cy, 3)],
                         "size": [round(cb.size.X, 3), round(cb.size.Y, 3),
                                  round(cb.size.Z, 3)],
                         "z_min": round(cb.min.Z, 3), "z_max": round(cb.max.Z, 3)})

    import json
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"\nwrote {len(manifest)} STL + manifest.json in {time.time()-t0:.1f}s")

if __name__ == "__main__":
    sys.exit(main())
