"""Test harness for the offline enclosure suite.

Responsibilities:
  * put ``cad/tests`` on sys.path and alias ``fake_adsk`` -> ``adsk`` (and its
    submodules) in ``sys.modules`` BEFORE the script is imported, so the
    script's top-level ``import adsk.core`` resolves to the fake package;
  * import the enclosure script BY PATH (``cad/`` has no ``__init__.py``), fresh
    on every request so its module-level globals (_skipped, _cage, _comp ...)
    never leak between tests;
  * provide a ``build`` fixture that resets the fake world under a chosen
    orientation convention / document type, runs ``run(None)``, and returns a
    small result object for assertions.
"""

import importlib.util
import pathlib
import sys

import pytest

_TESTS_DIR = pathlib.Path(__file__).resolve().parent
_CAD_DIR = _TESTS_DIR.parent
_SCRIPT = _CAD_DIR / "bus_stop_enclosure.py"

# --- alias fake_adsk as adsk (must happen before importing the script) ------
sys.path.insert(0, str(_TESTS_DIR))
import fake_adsk                                    # noqa: E402

sys.modules.setdefault("adsk", fake_adsk)
sys.modules.setdefault("adsk.core", fake_adsk.core)
sys.modules.setdefault("adsk.fusion", fake_adsk.fusion)
sys.modules.setdefault("adsk.cam", fake_adsk.cam)


def load_script():
    """Import the enclosure script as a FRESH module object every call."""
    spec = importlib.util.spec_from_file_location(
        "bus_stop_enclosure_under_test", _SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class BuildResult:
    def __init__(self, module, world, messages):
        self.module = module
        self.world = world
        self.messages = messages

    @property
    def final_message(self):
        return self.messages[-1] if self.messages else ""

    @property
    def failed(self):
        return any(m.startswith("Failed:") for m in self.messages)

    @property
    def skipped(self):
        return list(self.module._skipped)

    def body(self, name):
        return self.world.body(name)

    def is_solid(self, x_mm, y_mm, z_mm):
        return self.world.is_solid((x_mm, y_mm, z_mm))


def run_build(convention="identity", part_document=False):
    fake_adsk.reset(convention=convention, part_document=part_document)
    module = load_script()
    module.run(None)
    return BuildResult(module, fake_adsk.fusion.WORLD, list(fake_adsk.core.MESSAGES))


@pytest.fixture
def build():
    return run_build
