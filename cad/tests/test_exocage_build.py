"""Offline test suite for cad/braille_wearable_exocage.py (the EXO-CAGE design).

Mirrors the mechanism of test_enclosure_build.py / conftest.py but drives the
SECOND, standalone script.  The fake ``adsk`` package (a real build123d geometry
engine) lets ``run(None)`` execute end to end here so we can probe material,
measure the bounding box and enumerate real edges.

Coverage:
  * every LOCKED §A fit anchor (bay keep-out, bosses, plate, -Z pocket, USB
    slot, LCD window, encoder bore, lugs) -- the fit set shared with the
    enclosure, ported at identical coordinates (three monolith-era probe POINTS
    that assumed a tall closed +X wall are moved to where §A actually locks
    material; see the script header "§A DEVIATIONS" and file 31);
  * EXO-specific geometry: solid corner posts, open sky over all four modules,
    bare proud motors, -X/+Y side windows + mullions, screw-access bores, the
    hex turret + Ø16 bore, the L top-rim, the open +X button trench, base-ring
    solidity, and the two-body contract;
  * orientation invariance across the identity/mirrored/rotated yZ-plane
    conventions (the crux regression net);
  * dimension-registry invariants for the new constants.
"""

import importlib.util
import pathlib
import sys

import pytest

_TESTS_DIR = pathlib.Path(__file__).resolve().parent
_CAD_DIR = _TESTS_DIR.parent
_SCRIPT = _CAD_DIR / "braille_wearable_exocage.py"

# --- alias fake_adsk as adsk (idempotent with conftest.py) ------------------
sys.path.insert(0, str(_TESTS_DIR))
import fake_adsk                                            # noqa: E402

sys.modules.setdefault("adsk", fake_adsk)
sys.modules.setdefault("adsk.core", fake_adsk.core)
sys.modules.setdefault("adsk.fusion", fake_adsk.fusion)
sys.modules.setdefault("adsk.cam", fake_adsk.cam)


def load_script(path=_SCRIPT):
    """Import the exocage script as a FRESH module object every call, so its
    module-level globals (_skipped, _cage, _comp ...) never leak between tests."""
    spec = importlib.util.spec_from_file_location(
        "braille_wearable_exocage_under_test", path)
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


def run_build_script(path=_SCRIPT, convention="identity", part_document=False):
    """Parametrizable loader/runner (additive to the conftest mechanism): reset
    the fake world under a chosen orientation convention / document type, import
    the script fresh, run it, and return a BuildResult."""
    fake_adsk.reset(convention=convention, part_document=part_document)
    module = load_script(path)
    module.run(None)
    return BuildResult(module, fake_adsk.fusion.WORLD, list(fake_adsk.core.MESSAGES))


def run_build(convention="identity", part_document=False):
    return run_build_script(_SCRIPT, convention, part_document)


CONVENTIONS = ["identity", "mirrored", "rotated"]

# model-space probe points, in mm; True == expected SOLID, False == expected AIR
#
# --- §A LOCKED fit anchors (27b §A) -- ported from the enclosure suite -------
FIT_PROBES = [
    # AIR at the two lug bore centres (Ø2.6 through-bores along X)
    ((14.0, 32.25, -3.0), False, "lug bore +X/+Y"),
    ((-14.0, -32.25, -3.0), False, "lug bore -X/-Y"),
    # USB-C slot: AIR inside the slot; SOLID base-ring roof just above it.
    # (The monolith probe at (29.75,0,+3) assumed a tall +X wall; §A locks the
    #  wall solid only z -6.3..+0.7 -> the base ring covers it, probed at +1.)
    ((29.75, 0.0, -2.79), False, "USB slot interior"),
    ((29.75, 0.0, 1.0), True, "roof above USB slot (base ring)"),
    # +X base-ring wall SOLID, clear of the slot (the monolith (30,0,+5) probe
    # moves here: +X is open above +2, and y=0 at z<+0.7 is the USB slot).
    ((30.0, 16.0, -5.0), True, "+X base-ring wall (clear of slot)"),
    # encoder BARE (no turret): open air above the module (file 34 E4)
    ((-12.0, 12.0, 14.5), False, "encoder bare (open air, no turret)"),
    # LCD: open sky (no bezel) >> the required 13.5x27.9 window
    ((11.98, -14.38, 18.0), False, "LCD open sky (window by absence)"),
    # M2 boss pilot hole vs the surrounding Ø7 boss annulus
    ((24.1, 24.1, -5.0), False, "boss pilot"),
    ((26.5, 24.1, -5.0), True, "boss annulus"),
    # -Z clearance pocket over the JST region
    ((19.2, 15.8, -5.0), False, "-Z pocket"),
    # board-bay keep-out: nothing intrudes inside 57x57 between Z -8.1 and +2.0
    ((0.0, 0.0, 0.0), False, "bay keep-out (board plane)"),
    # skin plate: solid centre, open counterbore + through-hole at a corner
    ((0.0, 0.0, -9.5), True, "plate centre"),
    ((24.1, 24.1, -10.5), False, "plate counterbore"),
    ((24.1, 24.1, -9.5), False, "plate through-hole"),
    # LCD overhang relief void (§A: x -0.3..24.3, z 9.5..15, out to y -30.5)
    ((12.0, -29.5, 12.0), False, "LCD relief void (PCB overhang)"),
    ((23.0, -24.0, 12.0), False, "LCD relief (+X/-Y post corner notched)"),

    # --- EXO-CAGE aesthetic / structural probes (design 27c/31) --------------
    # four 9x9 corner posts SOLID above the base ring
    ((26.5, 26.5, 10.0), True, "post +X/+Y solid"),
    ((-26.5, 26.5, 10.0), True, "post -X/+Y solid"),
    ((26.5, -26.5, 10.0), True, "post +X/-Y solid"),
    ((-26.5, -26.5, 10.0), True, "post -X/-Y solid"),
    # OPEN SKY over all four module positions (no roof anywhere above them)
    ((12.0, 12.0, 14.0), False, "open sky over P3 (ERM)"),
    ((-12.0, -12.0, 14.0), False, "open sky over P1 (ERM)"),
    ((12.0, -12.0, 14.0), False, "open sky +X/-Y quadrant"),
    ((-12.0, 12.0, 14.0), False, "open sky over P4 (encoder bare)"),
    ((12.0, -14.38, 14.0), False, "open sky over P2 (LCD)"),
    # motor stands proud & bare -- nothing over the motor between post tops
    ((-12.0, -12.0, 16.0), False, "P1 motor proud/bare"),
    # side windows: AIR through each aperture
    ((-29.75, 0.0, 5.0), False, "-X side window aperture"),
    ((0.0, 29.75, 5.0), False, "+Y side window aperture"),
    # window mullions: SOLID wall flanking the apertures
    ((-29.75, 18.0, 5.0), True, "-X window mullion (+Y side)"),
    ((-29.75, -14.0, 5.0), True, "-X window mullion (-Y side)"),
    ((14.0, 29.75, 5.0), True, "+Y window mullion"),
    # screw-access bores DELETED (file 34 E2): screws drive from the open wrist
    # side; the post is now SOLID where the Ø4.5 bore used to breach the wall.
    ((24.1, 24.1, 10.0), True, "post solid at former screw-bore +X/+Y (E2)"),
    ((-24.1, -24.1, 10.0), True, "post solid at former screw-bore -X/-Y (E2)"),
    # encoder region fully bare -- AIR everywhere within r10 of (-12,+12) above it
    ((-12.0, 20.5, 14.5), False, "encoder region bare (no turret wall)"),
    # L top-rim SOLID on +Y and -X
    ((0.0, 26.5, 12.0), True, "+Y top-rim solid"),
    ((-26.5, 0.0, 12.0), True, "-X top-rim solid"),
    # +X frame open above +2 -> buttons BARE in an open trench (0 cover)
    ((25.76, 0.0, 5.0), False, "button trench open (buttons bare)"),
    # base ring SOLID all four sides (careful: -X/+Y are windowed from -1.6, so
    # probe them at z -5; +X at y=0 is the USB slot, so probe clear of it)
    ((29.75, 16.0, 0.0), True, "+X base ring solid (clear of USB slot)"),
    ((0.0, -29.75, 0.0), True, "-Y base ring solid"),
    ((-29.75, 0.0, -5.0), True, "-X base ring solid (below window)"),
    ((0.0, 29.75, -5.0), True, "+Y base ring solid (below window)"),
    ((-29.75, 0.0, -4.0), True, "-X wall below side window"),

    # --- LATERAL MODULE-CLEARANCE probes (file 34 T2/E1) ---------------------
    # The pentagon posts must leave the module L-keep-out AIR so the 22x22 PCBs
    # (corner reach +/-23) seat with >=1.3 mm clr.  Sentinels at (23.5,22.5) and
    # (22.5,23.5) per corner, at z +5 and +10, must be AIR; posts stay SOLID at
    # their retained region (+/-26,+/-26).
    ((23.5, 22.5, 5.0), False, "P3 L-keepout air (23.5,22.5,+5)"),
    ((22.5, 23.5, 5.0), False, "P3 L-keepout air (22.5,23.5,+5)"),
    ((23.5, 22.5, 10.0), False, "P3 L-keepout air (23.5,22.5,+10)"),
    ((22.5, 23.5, 10.0), False, "P3 L-keepout air (22.5,23.5,+10)"),
    ((-23.5, -22.5, 5.0), False, "P1 L-keepout air (-23.5,-22.5,+5)"),
    ((-22.5, -23.5, 10.0), False, "P1 L-keepout air (-22.5,-23.5,+10)"),
    ((-23.5, 22.5, 5.0), False, "P4 L-keepout air (-23.5,22.5,+5)"),
    ((-22.5, 23.5, 10.0), False, "P4 L-keepout air (-22.5,23.5,+10)"),
    # posts SOLID at their retained (outer) region
    ((26.0, 26.0, 10.0), True, "post retained solid +X/+Y"),
    ((-26.0, -26.0, 10.0), True, "post retained solid -X/-Y"),
    ((-26.0, 26.0, 10.0), True, "post retained solid -X/+Y"),
    ((26.0, -26.0, 10.0), True, "post retained solid +X/-Y"),

    # --- ENCODER-BAND probes (file 34 T2/E4): AIR within r10 of (-12,+12) ------
    # at z +13/+15/+17, four compass points at r9.9 -- the encoder is bare.
    ((-2.1, 12.0, 13.0), False, "encoder band air +x r9.9 z13"),
    ((-21.9, 12.0, 15.0), False, "encoder band air -x r9.9 z15"),
    ((-12.0, 21.9, 17.0), False, "encoder band air +y r9.9 z17"),
    ((-12.0, 2.1, 13.0), False, "encoder band air -y r9.9 z13"),

    # --- USB SLOT-HEIGHT material probes (file 34 T3) -------------------------
    # slot is 12x7 @ z -2.79 (+/-3.5): AIR at -2.79+/-3.4, SOLID base ring at
    # -2.79+/-3.6 -- so a slot-height regression flips a geometry probe.
    ((29.75, 0.0, 0.61), False, "USB slot-height air (top, -2.79+3.4)"),
    ((29.75, 0.0, -6.19), False, "USB slot-height air (bottom, -2.79-3.4)"),
    ((29.75, 0.0, 0.81), True, "USB base ring solid above slot (-2.79+3.6)"),
    ((29.75, 0.0, -6.39), True, "USB base ring solid below slot (-2.79-3.6)"),

    # nothing above the cage top
    ((0.0, 0.0, 20.0), False, "air above cage top"),
]


# ---------------------------------------------------------------------------
# 1. build completes (both document types) with an EMPTY skipped list
# ---------------------------------------------------------------------------
def test_build_completes_assembly_document():
    res = run_build(part_document=False)
    assert not res.failed, res.final_message
    assert res.skipped == [], "unexpected skipped features: %r" % res.skipped
    assert "All cosmetic features created." in res.final_message


def test_build_completes_part_document():
    # addNewComponent raises the Part-Design RuntimeError -> the script falls
    # back to building into the root component.  Must still complete cleanly.
    res = run_build(part_document=True)
    assert not res.failed, res.final_message
    assert res.skipped == [], "unexpected skipped features: %r" % res.skipped
    assert "All cosmetic features created." in res.final_message


# ---------------------------------------------------------------------------
# 2. two named bodies (the test-suite contract)
# ---------------------------------------------------------------------------
def test_two_bodies():
    res = run_build()
    assert set(res.world.body_names()) == {"cage", "skin_plate"}


# ---------------------------------------------------------------------------
# 3. cage bounding box
# ---------------------------------------------------------------------------
def test_cage_bbox():
    res = run_build()
    bb = res.body("cage").bbox()
    # X = 62 (+/-31); Y = 72 (lugs project +/-5 past the 62 wall -> +/-36);
    # Z bottom -11.1 (plate bottom); Z top +16.5 -- the corner POSTS are now the
    # tallest feature (the +17.5 hex turret was deleted, file 34 E4).  Chamfers
    # are recorded-not-applied, so the box is exact.
    assert bb.min.X == pytest.approx(-31.0, abs=0.1)
    assert bb.max.X == pytest.approx(31.0, abs=0.1)
    assert bb.min.Y == pytest.approx(-36.0, abs=0.1)
    assert bb.max.Y == pytest.approx(36.0, abs=0.1)
    assert bb.min.Z == pytest.approx(-11.1, abs=0.1)
    assert bb.max.Z == pytest.approx(16.5, abs=0.1)


# ---------------------------------------------------------------------------
# 3b. cage + plate are each ONE connected solid (file 34 T1) -- catches the
# file 33 F1 class (floating gussets / post-corner splinters) forever.
# ---------------------------------------------------------------------------
def test_cage_and_plate_single_lump():
    res = run_build()
    assert len(res.body("cage").solid.solids()) == 1, "cage is not a single solid"
    assert len(res.body("skin_plate").solid.solids()) == 1, "plate is not a single solid"


# ---------------------------------------------------------------------------
# 4. fit-feature material probes (§A locked + exo-cage geometry)
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("pt,expect_solid,label", FIT_PROBES,
                         ids=[p[2] for p in FIT_PROBES])
def test_fit_features_material_probes(pt, expect_solid, label):
    res = run_build()
    got = res.world.is_solid(pt)
    assert got == expect_solid, (
        "%s at %r: expected %s, got %s"
        % (label, pt, "SOLID" if expect_solid else "AIR",
           "SOLID" if got else "AIR"))


# ---------------------------------------------------------------------------
# 5. orientation invariance -- the crux regression net
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("convention", CONVENTIONS)
def test_orientation_build_clean(convention):
    """The script must build cleanly under EVERY yZ-plane convention: raw
    sketch coords on offset yZ planes (USB slot, lug bores, -X window) would
    raise the Fusion 'No target body found to cut' error under 'mirrored'."""
    res = run_build(convention=convention)
    assert not res.failed, res.final_message
    assert res.skipped == [], res.skipped


def test_orientation_invariance():
    """Identical probe results and cage volume across all conventions."""
    baseline = run_build(convention="identity")
    base_vol = baseline.body("cage").solid.volume
    base_probes = [baseline.world.is_solid(p) for (p, _e, _l) in FIT_PROBES]
    for convention in CONVENTIONS[1:]:
        res = run_build(convention=convention)
        assert [res.world.is_solid(p) for (p, _e, _l) in FIT_PROBES] == base_probes
        assert res.body("cage").solid.volume == pytest.approx(base_vol, rel=1e-6)


# ---------------------------------------------------------------------------
# 6. dimension-registry invariants (no geometry needed)
# ---------------------------------------------------------------------------
def test_dimension_registry_shared_anchors():
    """Fit-critical anchors shared with the enclosure carry identical values."""
    mod = load_script()
    assert mod.CAGE_OUTER == pytest.approx(62.0)
    assert mod.CAVITY == pytest.approx(57.0)
    assert mod.CAGE_HALF == pytest.approx(31.0)
    assert mod.CAVITY_HALF == pytest.approx(28.5)
    assert mod.Z_PLATE_TOP == pytest.approx(-8.1)
    assert mod.Z_PLATE_BOT == pytest.approx(-11.1)
    # corrected M2 boss / plate features
    assert mod.BOSS_PILOT == pytest.approx(1.8)
    assert mod.PLATE_HOLE_DIA == pytest.approx(2.4)
    assert mod.PLATE_CB_DIA == pytest.approx(4.0)
    assert mod.PLATE_CB_D == pytest.approx(2.0)
    # locked LCD window + USB slot
    assert (mod.LCD_WIN_W, mod.LCD_WIN_H) == pytest.approx((13.5, 27.9))
    assert (mod.LCD_WIN_CX, mod.LCD_WIN_CY) == pytest.approx((11.98, -14.38))
    assert (mod.USB_SLOT_W, mod.USB_SLOT_H) == pytest.approx((12.0, 7.0))
    assert mod.USB_SLOT_CZ == pytest.approx(-2.79)
    assert mod.USB_WEB == pytest.approx(2.1)
    # lugs + encoder bore
    assert mod.LUG_GAP == pytest.approx(22.0)
    assert mod.LUG_BORE == pytest.approx(2.6)
    assert mod.LUG_BORE_Z == pytest.approx(-3.0)


def test_exocage_registry():
    """EXO-CAGE (design 27c/31) constants carry their approved values."""
    mod = load_script()
    # base tube / deck / posts
    assert mod.Z_BAND_TOP == pytest.approx(2.0)
    assert mod.Z_DECK_BOT == pytest.approx(11.0)
    assert mod.Z_DECK_TOP == pytest.approx(13.0)
    assert mod.DECK_RING_W == pytest.approx(4.0)
    assert mod.POST_SQ == pytest.approx(9.0)
    assert mod.POST_INNER == pytest.approx(22.0)
    assert mod.POST_INNER == pytest.approx(mod.CAGE_HALF - mod.POST_SQ)
    assert mod.POST_CTR == pytest.approx(26.5)
    assert mod.RIM_INNER == pytest.approx(24.5)
    assert mod.Z_POST_TOP == pytest.approx(16.5)
    # pentagon posts (file 34 E1): inner corner cut back 45 deg, leg 3.5, so no
    # post material in the module L-keep-out (hyp |x|+|y| >= 2*22+3.5 = 47.5 vs
    # module L-region max 47.3)
    assert mod.POST_CUT == pytest.approx(3.5)
    assert 2.0 * mod.POST_INNER + mod.POST_CUT == pytest.approx(47.5)
    # side windows
    assert mod.WIN_LO == pytest.approx(-1.6)
    assert mod.WIN_HI == pytest.approx(11.0)
    assert mod.WIN_W == pytest.approx(26.0)
    assert mod.WIN_W_Y == pytest.approx(18.0)
    assert mod.WIN_CHAMF == pytest.approx(7.0)
    # -X window lintel flat span is self-supporting (<=12)
    assert mod.WIN_W - 2.0 * mod.WIN_CHAMF == pytest.approx(12.0)
    assert mod.MULLION_W == pytest.approx(6.0)
    # top corner plates (file 34 E3) -- replace the deleted floating gussets
    assert mod.WEB_T == pytest.approx(2.5)
    assert mod.PLATE_LEG == pytest.approx(7.5)
    # plate triangle lies inside |x|+|y| >= 2*31-7.5 = 54.5, outboard of the
    # post pentagon hyp 47.5 -> volumetric overlap with the post
    assert 2.0 * mod.CAGE_HALF - mod.PLATE_LEG == pytest.approx(54.5)
    # chamfer motif
    assert mod.CHAMFER_TOP == pytest.approx(1.0)
    assert mod.CHAMFER_VERT == pytest.approx(3.0)
    assert mod.CHAMFER_LUG == pytest.approx(1.5)
    # USB funnel reduced 1.5 -> 1.0 (only 1.29 mm lintel above the slot, E5)
    assert mod.USB_FUNNEL == pytest.approx(1.0)


def test_removed_features_absent():
    """The deleted bezel + louvre vocabulary (file 31) is gone; so is the
    retired closed-roof language AND the file-34-deleted turret / screw-bore /
    gusset vocabulary (E2/E3/E4)."""
    mod = load_script()
    for dead in ("Z_BEZEL_BOT", "Z_BEZEL_TOP", "BEZEL_BAR_W", "BEZEL_MARGIN",
                 "BEZEL_D", "Z_VISOR_BOT", "Z_VISOR_TOP", "SLOT_W", "SLOT_PITCH",
                 "SLOT_COUNT", "Z_ROOF_INNER", "Z_ROOF_OUTER", "ROOF_THICK",
                 "GRILLE_COUNT", "HEXRING_AF",
                 # file 34 retirements: turret (E4), screw bores (E2), gussets (E3)
                 "HEX_AF_TURRET", "Z_TURRET_BOT", "Z_TURRET_TOP", "ENCODER_BORE",
                 "SCREW_ACCESS_DIA", "GUSSET_LEG"):
        assert not hasattr(mod, dead), "removed/retired constant present: %s" % dead


def test_deleted_functions_absent():
    """The turret / screw-bore / gusset build steps are gone (file 34)."""
    mod = load_script()
    for dead in ("_build_turret", "_cut_post_screw_bores", "_add_corner_gussets",
                 "_join_hex_column", "_hex_pts_uv"):
        assert not hasattr(mod, dead), "deleted build function present: %s" % dead
