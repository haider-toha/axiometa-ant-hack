"""Offline test suite for cad/braille_wearable_enclosure.py.

The script is a Fusion 360 add-in that can normally only execute inside Fusion.
conftest.py aliases a fake ``adsk`` package with a real build123d geometry
engine, so ``run(None)`` executes end to end here and we can measure the result.

What this catches (see cad/tests/README.md):
  * boolean "no target body" misses (the lug-bore RuntimeError from live Fusion),
  * sketch-frame orientation ASSUMPTIONS on offset yZ construction planes, via
    the ``CONVENTION`` parametrization (identity / mirrored / rotated),
  * dimension-registry regressions,
  * the Part-document addNewComponent fallback path.
"""

import pytest

from conftest import run_build, load_script

CONVENTIONS = ["identity", "mirrored", "rotated"]

# model-space probe points, in mm; True == expected SOLID, False == expected AIR
#
# §A fit probes (LOCKED anchors, 27b §A) — these MUST stay untouched and pass.
FIT_PROBES = [
    # AIR at the two lug bore centres (Ø2.6 through-bores along X)
    ((14.0, 32.25, -3.0), False, "lug bore +X/+Y"),
    ((-14.0, -32.25, -3.0), False, "lug bore -X/-Y"),
    # USB-C slot: AIR inside the slot, SOLID in the roof above it
    ((29.75, 0.0, -2.79), False, "USB slot interior"),
    ((29.75, 0.0, 3.0), True, "roof above USB slot"),
    # encoder knob bore through the roof/turret (Ø20, file 34 M1)
    ((-12.0, 12.0, 17.5), False, "encoder bore"),
    # LCD through-window
    ((11.98, -14.38, 18.0), False, "LCD window"),
    # M2 boss pilot hole vs the surrounding Ø7 boss annulus
    ((24.1, 24.1, -5.0), False, "boss pilot"),
    ((26.5, 24.1, -5.0), True, "boss annulus"),
    # -Z clearance pocket over the JST region, and a solid wall
    ((19.2, 15.8, -5.0), False, "-Z pocket"),
    ((30.0, 0.0, 5.0), True, "+X wall"),
    # board-bay keep-out: nothing intrudes inside 57x57 between Z -8.1 and +2.0
    ((0.0, 0.0, 0.0), False, "bay keep-out (board plane)"),
    # skin plate: solid centre, open counterbore + through-hole at a corner
    ((0.0, 0.0, -9.5), True, "plate centre"),
    ((24.1, 24.1, -10.5), False, "plate counterbore"),
    ((24.1, 24.1, -9.5), False, "plate through-hole"),

    # --- MONOLITH-WITH-REVEALS aesthetic probes (design 27d/28, file 28 §3.4) --
    # P1 open reveal well: roof removed over ERM A (-12,-12)
    ((-12.0, -12.0, 17.5), False, "P1 well open over ERM A"),
    # P3 louvre grille over ERM B (+12,+12): SOLID at a rib, AIR in a slot
    ((14.0, 12.0, 17.5), True, "grille rib solid"),
    ((12.0, 12.0, 17.5), False, "grille slot open"),
    # P4 proud hex turret: SOLID in the AF24 turret wall (outside the Ø20 bore,
    # at a hex flat: x=-1.5 -> r10.5 > r10), AIR up inside the Ø20 bore.  Bore
    # enlarged Ø16 -> Ø20 (file 34 M1); the old (-3,12) wall probe now sits
    # INSIDE the r10 bore, so it moves out to a flat.
    ((-1.5, 12.0, 21.0), True, "turret wall proud (outside Ø20 bore)"),
    ((-12.0, 12.0, 21.0), False, "turret Ø20 bore interior"),
    # P2 recessed bezel: AIR in the recess, SOLID in the deck below the recess floor
    ((20.0, -14.38, 18.0), False, "bezel recess open"),
    ((20.0, -14.38, 16.5), True, "deck solid below bezel floor"),
    # button OPEN TRENCH over the plungers (no shelf, no holes -> open to cavity)
    ((25.76, 0.0, 17.0), False, "button trench open"),
    # -X skeletal SIDE WINDOW (file 28): AIR through the aperture, SOLID around it
    ((-29.75, 0.0, 5.0), False, "side window aperture"),
    ((-29.75, 0.0, -4.0), True, "wall below side window"),
    ((-29.75, 14.0, 5.0), True, "wall +Y of side window"),
    ((-29.75, -14.0, 5.0), True, "wall -Y of side window"),
    # deck top +18.75: solid deck at the retained spine, air above the deck
    ((0.0, 0.0, 18.0), True, "deck top solid at spine"),
    ((0.0, 0.0, 20.0), False, "air above deck top"),

    # --- ENCODER-BAND probes (file 34 T2/M1): Ø20 bore clears the can (r9.32) --
    # AIR inside the r10 bore at r9.9 compass points; SOLID in the AF24 turret
    # wall at the hex flats (r>10, inside AF24).
    ((-2.1, 12.0, 17.0), False, "encoder Ø20 bore air +x r9.9 z17"),
    ((-21.9, 12.0, 17.0), False, "encoder Ø20 bore air -x r9.9 z17"),
    ((-12.0, 21.9, 18.0), False, "encoder Ø20 bore air +y r9.9 z18"),
    ((-1.5, 12.0, 17.0), True, "AF24 turret wall solid +x flat (r10.5)"),
    ((-22.5, 12.0, 17.0), True, "AF24 turret wall solid -x flat (r10.5)"),
    # rim NOT thinned by the AF28 hex-ring recess: the perimeter wall (28.5..31)
    # stays SOLID (the recess +Y vertex only reaches y 28.17, inboard of 28.5).
    ((0.0, 29.75, 17.0), True, "+Y perimeter wall solid (AF28 ring clears it)"),

    # --- USB SLOT-HEIGHT material probes (file 34 T3) -------------------------
    # slot 12x7 @ z -2.79 (+/-3.5): AIR at -2.79+/-3.4, SOLID wall at -2.79+/-3.6.
    ((29.75, 0.0, 0.61), False, "USB slot-height air (top, -2.79+3.4)"),
    ((29.75, 0.0, -6.19), False, "USB slot-height air (bottom, -2.79-3.4)"),
    ((29.75, 0.0, 0.81), True, "USB wall solid above slot (-2.79+3.6)"),
    ((29.75, 0.0, -6.39), True, "USB wall solid below slot (-2.79-3.6)"),
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
    # addNewComponent raises the Part-Design RuntimeError -> script falls back to
    # building into the root component.  Must still complete with nothing skipped.
    res = run_build(part_document=True)
    assert not res.failed, res.final_message
    assert res.skipped == [], "unexpected skipped features: %r" % res.skipped
    assert "All cosmetic features created." in res.final_message


# ---------------------------------------------------------------------------
# 2. two named bodies
# ---------------------------------------------------------------------------
def test_two_bodies():
    res = run_build()
    assert set(res.world.body_names()) == {"cage", "skin_plate"}


# ---------------------------------------------------------------------------
# 2b. cage + plate are each ONE connected solid (file 34 T1)
# ---------------------------------------------------------------------------
def test_cage_and_plate_single_lump():
    res = run_build()
    assert len(res.body("cage").solid.solids()) == 1, "cage is not a single solid"
    assert len(res.body("skin_plate").solid.solids()) == 1, "plate is not a single solid"


# ---------------------------------------------------------------------------
# 3. cage bounding box
# ---------------------------------------------------------------------------
def test_cage_bbox():
    res = run_build()
    bb = res.body("cage").bbox()
    # X = 62 (+/-31); Y = 72 (lugs project +/-5 past the 62 wall -> +/-36);
    # Z bottom -11.1 (plate bottom); Z top now +23.0 -- the proud hex TURRET
    # breaks the +18.75 deck plane (design 27d P4).  Chamfers are
    # recorded-not-applied, so the box is exact.
    assert bb.min.X == pytest.approx(-31.0, abs=0.1)
    assert bb.max.X == pytest.approx(31.0, abs=0.1)
    assert bb.min.Y == pytest.approx(-36.0, abs=0.1)
    assert bb.max.Y == pytest.approx(36.0, abs=0.1)
    assert bb.min.Z == pytest.approx(-11.1, abs=0.1)
    assert bb.max.Z == pytest.approx(23.0, abs=0.1)


# ---------------------------------------------------------------------------
# 4. fit-feature material probes
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
    """The post-fix script must build cleanly under EVERY yZ-plane convention.
    The pre-fix lug bore / USB slot (raw sketch coords) would raise the Fusion
    'No target body found to cut or intersect!' error under 'mirrored'."""
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
# 6. the net itself: a CUT that misses must raise the Fusion error
# ---------------------------------------------------------------------------
def test_lug_bore_would_fail_without_fix():
    """Prove the harness reproduces the original bug: a cut whose tool solid
    intersects no body raises exactly the live-Fusion RuntimeError.  This is the
    error the pre-fix lug bore hit; the current script avoids it via
    modelToSketchSpace + a symmetric extent (verified by
    test_orientation_build_clean under 'mirrored')."""
    import fake_adsk
    core = fake_adsk.core
    fusion = fake_adsk.fusion
    fake_adsk.reset()
    comp = fusion.Component()

    # a target body: 10 mm cube near the origin
    sk = comp.sketches.add(comp.xYConstructionPlane)
    sk.sketchCurves.sketchLines.addTwoPointRectangle(
        core.Point3D(-0.5, -0.5, 0.0), core.Point3D(0.5, 0.5, 0.0))
    comp.features.extrudeFeatures.addSimple(
        sk.profiles.item(0), core.ValueInput(1.0),
        fusion.FeatureOperations.NewBodyFeatureOperation)

    # a cut whose tool is 1 m away -> intersects nothing
    sk2 = comp.sketches.add(comp.xYConstructionPlane)
    sk2.sketchCurves.sketchCircles.addByCenterRadius(
        core.Point3D(100.0, 100.0, 0.0), 0.13)
    with pytest.raises(RuntimeError, match="No target body found to cut"):
        comp.features.extrudeFeatures.addSimple(
            sk2.profiles.item(0), core.ValueInput(1.0),
            fusion.FeatureOperations.CutFeatureOperation)


def test_mirrored_raw_coords_would_miss():
    """A hand-rolled 'pre-fix' lug bore -- RAW sketch coords on an offset yZ
    plane instead of modelToSketchSpace -- hits the lug under 'identity' but
    MISSES (raises) under 'mirrored', reproducing the exact class of failure the
    fix removed."""
    import fake_adsk
    core = fake_adsk.core
    fusion = fake_adsk.fusion

    def attempt(convention):
        fake_adsk.reset(convention=convention)
        comp = fusion.Component()
        # lug block spanning model x 11..17, y 28.5..36, z -7..1 (NEWBODY)
        base = comp.xYConstructionPlane.offset(-0.7)     # z = -7 mm
        sk = comp.sketches.add(base)
        sk.sketchCurves.sketchLines.addTwoPointRectangle(
            core.Point3D(1.1, 2.85, 0.0), core.Point3D(1.7, 3.6, 0.0))
        comp.features.extrudeFeatures.addSimple(
            sk.profiles.item(0), core.ValueInput(0.8),
            fusion.FeatureOperations.NewBodyFeatureOperation)
        # buggy bore: RAW (sign*y_mid, z) sketch coords, assuming X->+Y, Y->+Z
        plane = comp.yZConstructionPlane.offset(1.4)     # model X = 14 mm
        sk2 = comp.sketches.add(plane)
        sk2.sketchCurves.sketchCircles.addByCenterRadius(
            core.Point3D(3.225, -0.3, 0.0), 0.13)        # (y_mid, z) raw
        comp.features.extrudeFeatures.addSimple(
            sk2.profiles.item(0), core.ValueInput(0.8),
            fusion.FeatureOperations.CutFeatureOperation)

    attempt("identity")                                   # hits the lug -> fine
    with pytest.raises(RuntimeError, match="No target body found to cut"):
        attempt("mirrored")                               # mirrored to empty -Y


# ---------------------------------------------------------------------------
# 7. dimension-registry invariants (no geometry needed)
# ---------------------------------------------------------------------------
def test_dimension_registry_invariants():
    mod = load_script()
    assert mod.CAGE_OUTER == pytest.approx(62.0)
    assert mod.CAVITY == pytest.approx(57.0)
    # derived Z-map (reference-shell corrections from audit files 23/24)
    assert mod.Z_PLATE_TOP == pytest.approx(-8.1)
    assert mod.Z_PLATE_BOT == pytest.approx(-11.1)
    assert mod.Z_ROOF_INNER == pytest.approx(16.25)
    assert mod.Z_ROOF_OUTER == pytest.approx(18.75)
    # deck/rim aliases (design 27d/28)
    assert mod.DECK_INNER == pytest.approx(16.25)
    assert mod.DECK_TOP == pytest.approx(18.75)
    # corrected hole/pilot diameters
    assert mod.BOSS_PILOT == pytest.approx(1.8)
    assert mod.PLATE_HOLE_DIA == pytest.approx(2.4)
    assert mod.PLATE_CB_DIA == pytest.approx(4.0)
    assert mod.PLATE_CB_D == pytest.approx(2.0)


def test_monolith_reveal_registry():
    """New DESIGN 27d/28 exposed-rework constants carry their approved values."""
    mod = load_script()
    # deck / rim frame
    assert mod.FIELD_HALF == pytest.approx(26.5)
    assert mod.WEB_KEEPOUT == pytest.approx(1.5)
    assert mod.REVEAL_CHAMFER == pytest.approx(2.5)
    assert mod.CHAMFER_TOP == pytest.approx(2.0)
    assert mod.CORNER_CLIP == pytest.approx(6.0)
    # P1 open reveal well (through-deck)
    assert (mod.P1_XLO, mod.P1_XHI) == pytest.approx((-26.5, -1.5))
    assert (mod.P1_YLO, mod.P1_YHI) == pytest.approx((-26.5, -1.5))
    # P3 louvre grille
    assert mod.GRILLE_COUNT == 5
    assert mod.GRILLE_SLOT_W == pytest.approx(2.0)
    assert mod.GRILLE_PITCH == pytest.approx(4.0)
    assert mod.GRILLE_LEN == pytest.approx(20.0)
    # P4 hex turret + reveal ring (file 34 M1: enlarged to clear encoder can r9.32)
    assert mod.ENCODER_BORE == pytest.approx(20.0)
    assert mod.TURRET_AF == pytest.approx(24.0)      # 2.0 wall at flats around Ø20
    assert mod.TURRET_TOP == pytest.approx(23.0)
    assert mod.TURRET_BORE == pytest.approx(20.0)
    assert mod.HEXRING_AF == pytest.approx(28.0)     # stays outside AF24 turret
    assert mod.HEXRING_DEPTH == pytest.approx(1.5)
    assert (mod.TURRET_AF - mod.ENCODER_BORE) / 2.0 == pytest.approx(2.0)
    # P2 bezel recess 18.5 x 32.9
    assert mod.BEZEL_MARGIN == pytest.approx(2.5)
    assert mod.LCD_WIN_W + 2.0 * mod.BEZEL_MARGIN == pytest.approx(18.5)
    assert mod.LCD_WIN_H + 2.0 * mod.BEZEL_MARGIN == pytest.approx(32.9)
    # button open trench
    assert (mod.BTN_TRENCH_XLO, mod.BTN_TRENCH_XHI) == pytest.approx((23.8, 28.5))
    assert mod.BTN_TRENCH_HALF_Y == pytest.approx(20.5)
    # USB dock + funnel
    assert mod.USB_FUNNEL == pytest.approx(2.0)
    assert mod.USB_DOCK_D == pytest.approx(1.0)
    # grafted -X side window (file 28 §2)
    assert mod.SIDEWIN_W == pytest.approx(22.0)
    assert mod.SIDEWIN_ZLO == pytest.approx(-1.6)
    assert mod.SIDEWIN_ZHI == pytest.approx(11.0)
    assert mod.SIDEWIN_CHAMF == pytest.approx(5.0)
    assert mod.SIDE_REVEAL_CHAMFER == pytest.approx(1.5)


def test_retired_constants_absent():
    """The old closed-roof vocabulary is gone (design 27d/28 retirement)."""
    mod = load_script()
    for dead in ("RIM_W", "RIM_STEP", "GROOVE_W", "GROOVE_D", "MODULE_SEAT_D",
                 "HEX_AF", "HEX_DEPTH", "BTN_HOLE_DIA", "BTN_SHELF_TOP"):
        assert not hasattr(mod, dead), "retired constant still present: %s" % dead
