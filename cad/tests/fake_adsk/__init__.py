"""A stand-in for Fusion 360's ``adsk`` package, importable OFFLINE.

conftest.py aliases this package (and its submodules) to ``adsk`` in
``sys.modules`` so the enclosure script's ``import adsk.core`` etc. resolve here
instead of failing outside Fusion.  Only the API surface the script actually
touches is implemented; see ``core.py`` and ``fusion.py``.
"""

from . import core, fusion, cam

reset = core._reset          # convenience: fake_adsk.reset(convention, part_document)

__all__ = ["core", "fusion", "cam", "reset"]
