"""Fake ``adsk.core`` — the minimum of the Fusion core API the enclosure
script touches, plus the harness state (message log, orientation convention,
part-document flag).

Everything the script feeds through here uses Fusion's internal unit:
CENTIMETRES.  ``ValueInput`` and ``Point3D`` therefore carry cm values, exactly
as the script produces them (it divides every mm literal by 10 before calling
``createByReal`` / ``Point3D.create``).  The geometry engine in ``fusion.py``
converts cm -> mm at the build123d boundary.
"""

# --- harness state ----------------------------------------------------------
MESSAGES = []                 # every messageBox() call, in order
CONVENTION = "identity"       # yZ-plane sketch-frame convention (see fusion.py)
PART_DOCUMENT = False         # True => occurrences.addNewComponent raises

_APP = None


def _reset(convention="identity", part_document=False):
    """Rebuild a clean application + design.  Call before every script run."""
    global _APP, CONVENTION, PART_DOCUMENT
    MESSAGES.clear()
    CONVENTION = convention
    PART_DOCUMENT = part_document
    import fake_adsk.fusion as fusion
    fusion._new_world()
    _APP = Application()
    _APP._design = fusion.Design(part_document=part_document)


# --- value / point primitives ----------------------------------------------
class ValueInput:
    def __init__(self, real):
        self.value = real          # cm

    @staticmethod
    def createByReal(real):
        return ValueInput(real)


class Point3D:
    def __init__(self, x, y, z):
        self.x, self.y, self.z = x, y, z   # cm

    @staticmethod
    def create(x, y, z):
        return Point3D(x, y, z)


class Matrix3D:
    @staticmethod
    def create():
        return Matrix3D()


class ObjectCollection:
    def __init__(self):
        self._items = []

    @staticmethod
    def create():
        return ObjectCollection()

    def add(self, item):
        self._items.append(item)

    def item(self, i):
        return self._items[i]

    @property
    def count(self):
        return len(self._items)

    def __iter__(self):
        return iter(self._items)


class Line3D:
    """Curve classType sentinel.  Straight sketch/BRep edges report this from
    ``edge.geometry.objectType``; everything else reports something different so
    the script's ``objectType != Line3D.classType()`` filters skip them."""
    CLASS_TYPE = "adsk::core::Line3D"

    @staticmethod
    def classType():
        return Line3D.CLASS_TYPE


# --- application / UI -------------------------------------------------------
class UserInterface:
    def messageBox(self, text, *args):
        MESSAGES.append(text)
        return 0


class Application:
    def __init__(self):
        self.userInterface = UserInterface()
        self._design = None

    @staticmethod
    def get():
        return _APP

    @property
    def activeProduct(self):
        return self._design
