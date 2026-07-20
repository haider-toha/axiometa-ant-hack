# Offline test suite for bus_stop_enclosure.py

`cad/bus_stop_enclosure.py` is a Fusion 360 Python add-in. Fusion has no headless
mode. The script normally runs only inside the Fusion GUI against a live `adsk`
API. This suite runs the script offline. It uses a fake `adsk` package that a real
build123d geometry engine backs. The enclosure builds and gets measured in CI
without Fusion.

## Run

```bash
.venv/bin/python -m pytest cad/tests -q
```

The project venv holds `pytest` and `build123d`. The suite needs no network and no
Fusion. If the venv is absent, the CAD suite cannot run. Report that plainly.

## What the suite checks

`test_bus_stop_build.py` is a smoke suite. It guards the current part.

* `test_bus_stop_enclosure_builds`. `run(None)` runs end to end under the fake
  engine and reports no `Failed:` message. A `Failed:` message means a boolean miss
  or an unhandled exception.
* `test_bus_stop_enclosure_two_named_bodies`. The build yields exactly two bodies,
  `cage` and `skin_plate`.

## How it works

* `fake_adsk/` implements the `adsk.core` and `adsk.fusion` surface that the script
  touches. `conftest.py` aliases it as `adsk` in `sys.modules` before it imports the
  script. It imports the script by path, because `cad/` has no `__init__.py`. It
  re-imports the script fresh for each test, so the module globals never leak. The
  `run_build(...)` helper resets the fake world, runs the add-in, and returns a
  small result object. The object exposes `failed`, `final_message`,
  `world.body_names()`, and per-point `is_solid()` probes.
* The engine runs sketches, extrudes, and booleans as build123d solids. Units follow
  the script. The fake API speaks centimetres. The script divides millimetres by 10.
  The solids build in millimetres.
* The booleans copy Fusion semantics. `NEWBODY` makes a body. `JOIN` fuses into any
  touching body, and raises if the bodies are disjoint. `CUT` subtracts, and raises
  `RuntimeError("3 : No target body found to cut or intersect!")` when the tool
  intersects no existing body. Live Fusion raises the same error.
* The orientation is a parametrized convention. The sketch frame on an offset `yZ`
  plane is configurable. The options are `identity`, `mirrored`, and `rotated`. A
  script that hard-codes the axis mapping mis-places geometry under `mirrored`, and
  the suite catches it.

The harness came from the earlier enclosure in this project. It carries more
capability than the current smoke suite uses. It can run point-in-solid material
probes, orientation-invariance checks, and dimension-registry invariants. A
contributor who tightens the bus-stop enclosure fit can add those deeper assertions
here through the same `run_build` API.

## What it cannot catch

* The real, undocumented Fusion construction-plane frame conventions. The engine
  models a family of conventions to prove invariance. The true in-Fusion mapping is
  ground truth only inside Fusion.
* Timeline and parametric-associativity quirks, feature-ordering rollback, and the
  way Fusion resolves faces and edges for chamfers. Chamfers here are recorded, not
  applied. Only the edge-selection code runs.
* UI behaviour, document and unit setup, and any real messageBox rendering.

The in-Fusion run stays ground truth. This suite is a fast regression net for the
geometry-logic bug classes above. It is not a substitute for a run inside Fusion.

## Pointers

* `f360mock`, a mock Fusion API. https://github.com/bommerio/f360mock
* AU class, Testing Strategies for Python Fusion 360 Add-Ins (2017). https://www.autodesk.com/autodesk-university/class/Testing-Strategies-Python-Fusion-360-Add-Ins-2017
* Forum thread on unit tests and CI for Fusion add-ins. https://forums.autodesk.com/t5/fusion-api-and-scripts-forum/unit-tests-for-fusion-360-add-ins-and-running-them-on-the-ci-cd/td-p/11600462

## Layout

```
cad/tests/
  fake_adsk/          # importable as `adsk` via conftest sys.modules aliasing
    __init__.py       # exposes core, fusion, cam; reset() helper
    core.py           # ValueInput, Point3D, Matrix3D, ObjectCollection, Line3D,
                      #   Application and UserInterface plus harness state
    fusion.py         # Design, Component, Sketch, features, and the build123d engine
    cam.py            # stub, imported but unused
  conftest.py         # sys.modules aliasing, fresh script import, run_build
  test_bus_stop_build.py
  README.md
```
