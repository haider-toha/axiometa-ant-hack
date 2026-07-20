"""Offline build smoke test for cad/bus_stop_enclosure.py.

bus_stop_enclosure.py is a Fusion 360 add-in (top-level ``import adsk`` +
``run(context)`` entrypoint). The fake_adsk shim in cad/tests aliases a real
build123d geometry engine as ``adsk``, so ``run(None)`` executes end-to-end here
and we can measure the result -- no Fusion required. This suite reuses the
conftest harness that formerly drove the (now-removed) braille enclosure; it
guards that the current part still builds cleanly and yields its two named
bodies (cage + skin_plate).
"""

from conftest import run_build


def test_bus_stop_enclosure_builds():
    """run(None) completes with no 'Failed:' message under the fake engine."""
    res = run_build(part_document=False)
    assert not res.failed, res.final_message


def test_bus_stop_enclosure_two_named_bodies():
    """The build yields exactly the cage + skin_plate bodies."""
    res = run_build()
    assert set(res.world.body_names()) == {"cage", "skin_plate"}
