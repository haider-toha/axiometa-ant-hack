"""Fake ``adsk.fusion`` with a REAL geometry engine.

The engine executes the script's sketches / extrudes / booleans as build123d
solids so we can probe material, measure bounding boxes and enumerate real
edges.  It reproduces the two Fusion behaviours that bit the original author:

  * a CUT whose tool solid intersects no existing body raises
    ``RuntimeError("3 : No target body found to cut or intersect!")`` -- exactly
    the live-Fusion error the lug bore hit before the fix;
  * the sketch frame on an OFFSET yZ construction plane is NOT guaranteed to map
    sketch-X -> model +Y / sketch-Y -> model +Z / +normal -> model +X.  Which
    way it maps is a configurable *convention* (``fake_adsk.core.CONVENTION``);
    ``modelToSketchSpace`` is implemented as the exact inverse under every
    convention.  A script that hard-codes the axis mapping (the pre-fix code)
    mis-places geometry under the non-identity conventions and fails just like
    real Fusion did; a script that goes through ``modelToSketchSpace`` produces
    identical geometry under all of them.

Units: the fake API speaks CENTIMETRES (as the script does).  build123d solids
are built in MILLIMETRES (cm * 10).  Edge geometry handed back to the script is
in cm again (mm / 10), so the script's ``* 10`` round-trips to mm.
"""

from build123d import (
    Face, Wire, Vector, Plane as B3Plane, GeomType, extrude,
)

import fake_adsk.core as core


# ---------------------------------------------------------------------------
# vector helpers (plain tuples, cm or unit)
# ---------------------------------------------------------------------------
def _add(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def _scale(a, s):
    return (a[0] * s, a[1] * s, a[2] * s)


def _dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


# ---------------------------------------------------------------------------
# construction-plane frame conventions (yZ planes only; XY is always identity)
# frame = (U, V, W_extrude, geo_normal), all unit vectors in MODEL space.
#   U, V     : where sketch +X / +Y point in model space
#   W_extrude: direction a one-sided / symmetric extrude runs
#   geo_normal: the TRUE geometric normal used for plane OFFSET positioning and
#               for the normal component of modelToSketchSpace.  Kept +X for
#               every yZ convention so setByOffset lands the plane at the right
#               model X (real Fusion offsets a yZ plane along +X); only the
#               in-plane axes and the extrude-normal sign vary.
# ---------------------------------------------------------------------------
_YZ_CONVENTIONS = {
    # naive assumption: sketch X->+Y, sketch Y->+Z, extrude ->+X
    "identity": ((0, 1, 0), (0, 0, 1), (1, 0, 0), (1, 0, 0)),
    # sketch X->-Y and extrude normal flipped (what really broke the lug bore)
    "mirrored": ((0, -1, 0), (0, 0, 1), (-1, 0, 0), (1, 0, 0)),
    # 90 deg in-plane rotation: sketch X->+Z, sketch Y->-Y
    "rotated":  ((0, 0, 1), (0, -1, 0), (1, 0, 0), (1, 0, 0)),
}


class Plane:
    def __init__(self, origin, u, v, w, geo_normal):
        self.origin = origin           # cm, model
        self.u = u
        self.v = v
        self.w = w                     # extrude direction (unit)
        self.geo_normal = geo_normal   # unit

    @staticmethod
    def base_xy():
        return Plane((0.0, 0.0, 0.0), (1, 0, 0), (0, 1, 0), (0, 0, 1), (0, 0, 1))

    @staticmethod
    def base_yz():
        u, v, w, g = _YZ_CONVENTIONS[core.CONVENTION]
        return Plane((0.0, 0.0, 0.0), u, v, w, g)

    def offset(self, dist_cm):
        origin = _add(self.origin, _scale(self.geo_normal, dist_cm))
        return Plane(origin, self.u, self.v, self.w, self.geo_normal)

    def sketch_to_model(self, u_cm, v_cm, w_cm=0.0):
        p = self.origin
        p = _add(p, _scale(self.u, u_cm))
        p = _add(p, _scale(self.v, v_cm))
        p = _add(p, _scale(self.geo_normal, w_cm))
        return p

    def model_to_sketch(self, point):
        d = (point.x - self.origin[0],
             point.y - self.origin[1],
             point.z - self.origin[2])
        return core.Point3D(_dot(d, self.u), _dot(d, self.v),
                            _dot(d, self.geo_normal))


# ---------------------------------------------------------------------------
# geometry world (shared across the run; rebuilt by core._reset)
# ---------------------------------------------------------------------------
WORLD = None
_TOL = 1e-4     # mm


def _new_world():
    global WORLD
    WORLD = World()


class Body:
    def __init__(self, solid, name=None):
        self.solid = solid
        self.name = name

    @property
    def edges(self):
        return [Edge(e) for e in self.solid.edges()]

    def bbox(self):
        return self.solid.bounding_box()

    def contains(self, pt_mm):
        for s in self.solid.solids():
            if s.is_inside(pt_mm):
                return True
        return False


class World:
    def __init__(self):
        self.bodies = []

    def add_body(self, solid):
        b = Body(solid)
        self.bodies.append(b)
        return b

    def body(self, name):
        for b in self.bodies:
            if b.name == name:
                return b
        raise KeyError(name)

    def body_names(self):
        return [b.name for b in self.bodies]

    def is_solid(self, pt_mm):
        return any(b.contains(pt_mm) for b in self.bodies)


def _volume(shape):
    if shape is None:
        return 0.0
    try:
        return sum(s.volume for s in shape.solids())
    except Exception:
        return getattr(shape, "volume", 0.0)


def _bbox_touch(a, b, tol=1e-3):
    ba, bb = a.bounding_box(), b.bounding_box()
    return (ba.min.X <= bb.max.X + tol and bb.min.X <= ba.max.X + tol and
            ba.min.Y <= bb.max.Y + tol and bb.min.Y <= ba.max.Y + tol and
            ba.min.Z <= bb.max.Z + tol and bb.min.Z <= ba.max.Z + tol)


# ---------------------------------------------------------------------------
# sketch profiles
# ---------------------------------------------------------------------------
class _Profile:
    def __init__(self, sketch):
        self.sketch = sketch

    def _face(self):
        raise NotImplementedError

    def build(self, one_sided=None, symmetric=None):
        """Return a build123d solid (mm) for this profile extruded."""
        plane = self.sketch.plane
        w = Vector(*plane.w)
        face = self._face()
        if symmetric is not None:
            total = symmetric * 10.0          # cm full length -> mm
            face = face.translate(w * (-total / 2.0))
            return extrude(face, amount=total, dir=w)
        d = one_sided * 10.0                  # cm -> mm
        direction = w if d >= 0 else w * -1.0
        return extrude(face, amount=abs(d), dir=direction)

    def _model_mm(self, u_cm, v_cm):
        x, y, z = self.sketch.plane.sketch_to_model(u_cm, v_cm)
        return Vector(x * 10.0, y * 10.0, z * 10.0)


class _PolyProfile(_Profile):
    def __init__(self, sketch, corners_uv):
        super().__init__(sketch)
        self.corners_uv = corners_uv          # list of (u,v) cm

    def _face(self):
        pts = [self._model_mm(u, v) for (u, v) in self.corners_uv]
        return Face(Wire.make_polygon(pts, close=True))


class _CircleProfile(_Profile):
    def __init__(self, sketch, center_uv, radius_cm):
        super().__init__(sketch)
        self.center_uv = center_uv
        self.radius_cm = radius_cm

    def _face(self):
        center = self._model_mm(*self.center_uv)
        pl = B3Plane(origin=center, z_dir=Vector(*self.sketch.plane.geo_normal))
        return Face(Wire.make_circle(self.radius_cm * 10.0, pl))


class Profiles:
    def __init__(self):
        self._items = []

    def add(self, profile):
        self._items.append(profile)

    def item(self, i):
        return self._items[i]

    @property
    def count(self):
        return len(self._items)


# ---------------------------------------------------------------------------
# sketch curve factories
# ---------------------------------------------------------------------------
class _SketchLines:
    def __init__(self, sketch):
        self.sketch = sketch
        self._pending = []            # open polyline of (u,v) points

    def addTwoPointRectangle(self, p0, p1):
        u0, v0, u1, v1 = p0.x, p0.y, p1.x, p1.y
        umin, umax = min(u0, u1), max(u0, u1)
        vmin, vmax = min(v0, v1), max(v0, v1)
        corners = [(umin, vmin), (umax, vmin), (umax, vmax), (umin, vmax)]
        self.sketch.profiles.add(_PolyProfile(self.sketch, corners))

    def addByTwoPoints(self, p0, p1):
        a = (p0.x, p0.y)
        b = (p1.x, p1.y)
        if not self._pending:
            self._pending = [a, b]
        elif self._close(self._pending[-1], a):
            self._pending.append(b)
        else:                          # start of a new chain
            self._pending = [a, b]
        # closed loop?
        if len(self._pending) >= 3 and self._close(self._pending[-1],
                                                   self._pending[0]):
            corners = self._pending[:-1]
            self.sketch.profiles.add(_PolyProfile(self.sketch, corners))
            self._pending = []

    @staticmethod
    def _close(a, b, tol=1e-6):
        return abs(a[0] - b[0]) < tol and abs(a[1] - b[1]) < tol


class _SketchCircles:
    def __init__(self, sketch):
        self.sketch = sketch

    def addByCenterRadius(self, center, radius_cm):
        self.sketch.profiles.add(
            _CircleProfile(self.sketch, (center.x, center.y), radius_cm))


class _SketchCurves:
    def __init__(self, sketch):
        self.sketchLines = _SketchLines(sketch)
        self.sketchCircles = _SketchCircles(sketch)


class Sketch:
    def __init__(self, plane):
        self.plane = plane
        self.sketchCurves = _SketchCurves(self)
        self.profiles = Profiles()

    def modelToSketchSpace(self, point):
        return self.plane.model_to_sketch(point)


class Sketches:
    def add(self, plane):
        return Sketch(plane)


# ---------------------------------------------------------------------------
# construction planes
# ---------------------------------------------------------------------------
class _ConstructionPlaneInput:
    def __init__(self):
        self._base = None
        self._offset = 0.0

    def setByOffset(self, base_plane, value_input):
        self._base = base_plane
        self._offset = value_input.value      # cm


class ConstructionPlanes:
    def createInput(self):
        return _ConstructionPlaneInput()

    def add(self, plane_input):
        return plane_input._base.offset(plane_input._offset)


# ---------------------------------------------------------------------------
# BRep edge wrappers
# ---------------------------------------------------------------------------
class _EdgeGeometry:
    def __init__(self, edge):
        self._edge = edge
        self._is_line = edge.geom_type == GeomType.LINE

    @property
    def objectType(self):
        return core.Line3D.classType() if self._is_line else "adsk::core::Curve3D"

    @property
    def startPoint(self):
        p = self._edge.position_at(0)
        return core.Point3D(p.X / 10.0, p.Y / 10.0, p.Z / 10.0)

    @property
    def endPoint(self):
        p = self._edge.position_at(1)
        return core.Point3D(p.X / 10.0, p.Y / 10.0, p.Z / 10.0)


class Edge:
    def __init__(self, edge):
        self._edge = edge

    @property
    def geometry(self):
        return _EdgeGeometry(self._edge)


# ---------------------------------------------------------------------------
# features
# ---------------------------------------------------------------------------
class _BodyList:
    def __init__(self, bodies):
        self._bodies = bodies

    def item(self, i):
        return self._bodies[i]

    @property
    def count(self):
        return len(self._bodies)


class _ExtrudeFeature:
    def __init__(self, bodies):
        self.bodies = _BodyList(bodies)


def _apply(profile, operation, one_sided=None, symmetric=None):
    tool = profile.build(one_sided=one_sided, symmetric=symmetric)

    if operation == FeatureOperations.NewBodyFeatureOperation:
        body = WORLD.add_body(tool)
        return _ExtrudeFeature([body])

    if operation == FeatureOperations.JoinFeatureOperation:
        targets = [b for b in WORLD.bodies if _bbox_touch(b.solid, tool)]
        if not targets:
            raise RuntimeError(
                "3 : Join failed: the new body is disjoint from every "
                "existing body")
        primary = targets[0]
        merged = primary.solid
        for extra in targets[1:]:
            merged = merged.fuse(extra.solid)
            WORLD.bodies.remove(extra)
        primary.solid = merged.fuse(tool)
        return _ExtrudeFeature([primary])

    if operation == FeatureOperations.CutFeatureOperation:
        hit = [b for b in WORLD.bodies if _volume(b.solid.intersect(tool)) > _TOL]
        if not hit:
            raise RuntimeError(
                "3 : No target body found to cut or intersect!")
        for b in hit:
            b.solid = b.solid.cut(tool)
        return _ExtrudeFeature(hit)

    raise RuntimeError("unknown operation %r" % (operation,))


class _ExtrudeInput:
    def __init__(self, profile, operation):
        self.profile = profile
        self.operation = operation
        self._symmetric = None

    def setSymmetricExtent(self, dist_value, is_full_length, taper_value):
        # is_full_length True => dist is the FULL length about the plane
        self._symmetric = dist_value.value        # cm


class ExtrudeFeatures:
    def addSimple(self, profile, distance_value, operation):
        return _apply(profile, operation, one_sided=distance_value.value)

    def createInput(self, profile, operation):
        return _ExtrudeInput(profile, operation)

    def add(self, extrude_input):
        return _apply(extrude_input.profile, extrude_input.operation,
                     symmetric=extrude_input._symmetric)


class _ChamferEdgeSets:
    def __init__(self):
        self.sets = []

    def addEqualDistanceChamferEdgeSet(self, edges, distance_value, tangent):
        self.sets.append((edges.count, distance_value.value, tangent))


class _ChamferInput:
    def __init__(self):
        self.chamferEdgeSets = _ChamferEdgeSets()


class ChamferFeatures:
    def __init__(self):
        self.records = []

    def createInput2(self):
        return _ChamferInput()

    def add(self, chamfer_input):
        # Chamfers are recorded, not applied (cosmetic).  The edge-selection
        # code paths already ran against real edge data before we got here.
        self.records.append(chamfer_input.chamferEdgeSets.sets)
        return chamfer_input


class Features:
    def __init__(self):
        self.extrudeFeatures = ExtrudeFeatures()
        self.chamferFeatures = ChamferFeatures()


# ---------------------------------------------------------------------------
# components / occurrences / document
# ---------------------------------------------------------------------------
class Occurrence:
    def __init__(self, component):
        self.component = component


class Occurrences:
    def addNewComponent(self, matrix):
        if core.PART_DOCUMENT:
            raise RuntimeError(
                "3 : Failed to create component: Part Design documents can "
                "only contain one component, please add this Part to an "
                "Assembly to add multiple components.")
        return Occurrence(Component())


class Component:
    def __init__(self):
        self.name = None
        self.occurrences = Occurrences()
        self.constructionPlanes = ConstructionPlanes()
        self.sketches = Sketches()
        self.features = Features()
        self.xYConstructionPlane = Plane.base_xy()
        self.yZConstructionPlane = Plane.base_yz()


class UserParameters:
    def __init__(self):
        self.params = []

    def add(self, name, value_input, units, comment):
        self.params.append((name, value_input.value, units, comment))
        return object()


class Design:
    def __init__(self, part_document=False):
        self.rootComponent = Component()
        self.userParameters = UserParameters()

    @staticmethod
    def cast(product):
        return product


# ---------------------------------------------------------------------------
# enum
# ---------------------------------------------------------------------------
class FeatureOperations:
    NewBodyFeatureOperation = "NewBody"
    JoinFeatureOperation = "Join"
    CutFeatureOperation = "Cut"
