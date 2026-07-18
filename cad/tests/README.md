# Offline test suite for `braille_wearable_enclosure.py`

`cad/braille_wearable_enclosure.py` is a Fusion 360 Python add-in. Fusion has no
headless mode, so the script normally only runs inside the Fusion GUI against a
live `adsk` API. Two real runtime failures still slipped past static review:

1. `root.occurrences.addNewComponent(...)` raising in a **Part Design** document
   (which allows only one component), and
2. a lug-bore **CUT** whose tool solid missed its target because the
   sketch-axis orientation on an offset `yZ` construction plane was *assumed*
   rather than *queried* — the live-Fusion
   `RuntimeError: 3 : No target body found to cut or intersect!`.

Both are fixed in the script (a `try/except` Part fallback, `modelToSketchSpace`,
and a symmetric-extent `_extrude_symmetric` helper). This suite runs the script
**offline** against a fake `adsk` package backed by a real
[build123d](https://github.com/gumyr/build123d) geometry engine, so it can catch
that class of bug without Fusion.

## Run

```bash
.venv/bin/python -m pytest cad/tests -q
```

(`pytest` is installed into the project venv; the engine needs build123d, which
the venv already has. No network, no Fusion.)

## How it works

* `fake_adsk/` implements exactly the `adsk.core` / `adsk.fusion` surface the
  script touches. `conftest.py` aliases it as `adsk` in `sys.modules` **before**
  importing the script (imported by path, since `cad/` has no `__init__.py`) and
  re-imports the script fresh per test so its module globals never leak.
* The engine executes sketches, extrudes (`addSimple` and
  `createInput`+`setSymmetricExtent`) and booleans as build123d solids. Units
  follow the script: the fake API speaks **cm** (the script divides mm by 10);
  solids are built in **mm**; edge geometry is handed back in cm.
* **Booleans reproduce Fusion semantics.** `NEWBODY` creates a body; `JOIN`
  fuses into any touching body (raises if disjoint); `CUT` subtracts and raises
  `RuntimeError("3 : No target body found to cut or intersect!")` when the tool
  volumetrically intersects no existing body — exactly the live-Fusion error.
* **Orientation is a parametrized convention.** The sketch frame on an offset
  `yZ` plane (which model axes sketch-X/Y map to, and the extrude-normal sign) is
  configurable: `identity` (the naive sketch-X→+Y / Y→+Z / normal +X assumption),
  `mirrored` (sketch-X→−Y, normal −X) and `rotated` (90° in-plane). The plane's
  *position* stays physically correct under every convention (offset along +X),
  only the in-plane frame varies. `modelToSketchSpace` is the exact inverse of
  the frame under all of them, so the **post-fix** script produces identical
  geometry regardless of convention, while a script that hard-codes the axis
  mapping mis-places geometry and fails under `mirrored` — precisely how real
  Fusion failed.

## What the harness catches

* Boolean-miss errors — a CUT tool that reaches no body (the lug-bore class).
* Orientation *assumptions* — via the convention parametrization; the pre-fix
  raw-coordinate approach fails under `mirrored`
  (`test_mirrored_raw_coords_would_miss` demonstrates it directly).
* Dimension regressions — the registry invariants
  (`CAGE_OUTER`, `CAVITY`, the Z-map, the reference-shell hole/pilot
  corrections).
* The Part-document path — `addNewComponent` raising, and the fallback into the
  root component (`test_build_completes_part_document`).
* Fit-feature placement — point-in-solid probes at bores, slots, windows, boss
  pilots/annuli, button holes, plate counterbores/through-holes and walls
  (`test_fit_features_material_probes`), including the mirrored-Z USB-slot check.

## What it CANNOT catch

* Real Fusion's *actual* (undocumented) construction-plane frame conventions —
  the engine models a family of conventions to prove invariance, but the true
  in-Fusion mapping is ground truth only inside Fusion.
* Timeline / parametric-associativity quirks, feature-ordering rollback, and how
  Fusion resolves faces/edges for chamfers (chamfers here are recorded, not
  applied; only the edge-*selection* code runs).
* UI behaviour, document/unit setup, and any real messageBox rendering.

**The in-Fusion run remains ground truth.** This suite is a fast regression net
for the geometry-logic bug classes above, not a substitute for running the
script in Fusion.

## Pointers

* `f360mock` — a mock Fusion API: https://github.com/bommerio/f360mock
* AU class, *Testing Strategies for Python Fusion 360 Add-Ins* (2017):
  https://www.autodesk.com/autodesk-university/class/Testing-Strategies-Python-Fusion-360-Add-Ins-2017
* Forum thread on unit tests + CI for Fusion add-ins:
  https://forums.autodesk.com/t5/fusion-api-and-scripts-forum/unit-tests-for-fusion-360-add-ins-and-running-them-on-the-ci-cd/td-p/11600462

## Layout

```
cad/tests/
  fake_adsk/          # importable as `adsk` via conftest sys.modules aliasing
    __init__.py       # exposes core, fusion, cam; `reset()` helper
    core.py           # ValueInput, Point3D, Matrix3D, ObjectCollection, Line3D,
                      #   Application/UserInterface + harness state
    fusion.py         # Design/Component/Sketch/features + the build123d engine
    cam.py            # stub (imported, unused)
  conftest.py         # sys.modules aliasing, fresh script import, `build` fixture
  test_enclosure_build.py
  README.md
```
