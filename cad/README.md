# Bus-stop situational-awareness enclosure CAD

This is the parametric enclosure for the wrist-worn Tacta device. It wraps the
Axiometa "Genesis Mini" host board (55 x 55 mm) and its four snap-in AX22
modules.

| Port | Module | Aperture in the shell |
|---|---|---|
| P1 / P3 | passive buzzers | two buzzer grilles |
| P2 | VL53L0CX ToF | one ToF "eye" |
| P4 | microphone | mic port(s), this module governs the deck height |

The shell is a **closed monolith**. A solid deck carries only functional
openings. These are the ToF eye, the mic ports, the trimpot access, the buzzer
grilles, and a button-access slot. The one decorative feature is the raised
"TACTA" branding on the −X wall. It pierces nothing and is **not** an
accessibility feature.

## `bus_stop_enclosure.py`

`bus_stop_enclosure.py` is a **Fusion 360 Python script**. It authors every
dimension in millimetres. It converts to Fusion's internal centimetres through a
single `_cm()` chokepoint. It produces two bodies. `cage` holds the shell, lugs,
strap bars, and branding. `skin_plate` holds the base plate, corner gussets, and
M2 standoffs. So the base carries the board, and the cage drops over it.

**In Fusion.** Open a Design document. Then open *Utilities*, *Add-Ins*,
*Scripts and Add-Ins*. Add this file and run it. The Fusion entry point is
`run(context)`.

**Headless, no Fusion.** The script falls back to
[`tests/fake_adsk/`](tests/fake_adsk). This is a real
[build123d](https://github.com/gumyr/build123d) geometry engine behind a fake
`adsk` API. So it builds and **exports STEP and STL** without the Fusion GUI.

```bash
python cad/bus_stop_enclosure.py
```

This writes `bus_stop_enclosure.step` and `bus_stop_enclosure.stl` as fit-check
artifacts. The headless harness records chamfers but does not apply them. So the
exported solids are sharp-edged relative to the in-Fusion build.

## `reference/`

[`reference/genesis-mini-shell.step`](reference/genesis-mini-shell.step) is a
**known-good, physically printed** Genesis Mini shell from Printables. It serves
as the fit reference. This shell already seats the board and modules. Check
openings, clearances, and envelope against it before you trust our own model
alone. See [`reference/README.md`](reference/README.md) for provenance and its
different original module layout.

## `tests/`

Fusion has no headless mode. So geometry-logic bugs otherwise surface only inside
the GUI. These bugs include boolean-miss cuts, sketch-plane orientation
assumptions, and dimension regressions. The suite runs the enclosure script
**offline** against `fake_adsk` and probes the result. It catches that whole
class of bug without Fusion.

```bash
.venv/bin/python -m pytest cad/tests -q
```

The venv needs `pytest` and `build123d`. If it is absent, the geometry suite
cannot run. The in-Fusion build remains ground truth. This suite is a fast
regression net, not a substitute. See [`tests/README.md`](tests/README.md) for
what the harness can and cannot catch.
