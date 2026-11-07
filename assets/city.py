"""Procedural low-poly city (seeded, so the same city appears in every episode).

    from assets.city import City
    city = City(seed=7, n=6).build(focus=(0, 0), detail_radius=120)

Grid: blocks every PITCH metres, roads between them. Road centre lines run at
x = (i+0.5)*PITCH and y = (j+0.5)*PITCH. Windows are grouped into `rings`
(distance bands from the origin) with one emissive material each, so a whole
district can be switched on/off with city.set_ring(k, strength, frame).
"""
import math, random
from studio import core as C, palette as P
from assets import props

BLOCK, ROAD = 36.0, 14.0
PITCH = BLOCK + ROAD
FLOOR = 3.3
# series landmarks (block i, block j, lot) -> floors
HOME = (0, 0, 0)          # Kai's apartment tower
LIGHT_TOWER = (-1, -4, 3)  # where the light switches on (Ep1 cliffhanger)
LANDMARKS = {HOME: 38, LIGHT_TOWER: 44}


class MeshBuf:
    def __init__(self):
        self.v, self.f, self.m = [], [], []

    def box(self, cx, cy, z0, sx, sy, sz, mi, taper=1.0):
        b = len(self.v)
        hx, hy = sx / 2, sy / 2
        for z, t in ((z0, 1.0), (z0 + sz, taper)):
            self.v += [(cx - hx * t, cy - hy * t, z), (cx + hx * t, cy - hy * t, z),
                       (cx + hx * t, cy + hy * t, z), (cx - hx * t, cy + hy * t, z)]
        for q in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
            self.f.append(tuple(b + i for i in q)); self.m.append(mi)

    def quad(self, pts, mi):
        b = len(self.v); self.v += pts; self.f.append((b, b + 1, b + 2, b + 3)); self.m.append(mi)

    def cyl(self, cx, cy, z0, r, h, mi, n=8):
        b = len(self.v)
        for z in (z0, z0 + h):
            self.v += [(cx + r * math.cos(2 * math.pi * i / n), cy + r * math.sin(2 * math.pi * i / n), z) for i in range(n)]
        self.f.append(tuple(b + i for i in range(n))[::-1]); self.m.append(mi)
        self.f.append(tuple(b + n + i for i in range(n))); self.m.append(mi)
        for i in range(n):
            self.f.append((b + i, b + (i + 1) % n, b + n + (i + 1) % n, b + n + i)); self.m.append(mi)

    def obj(self, name, mats):
        return C.mesh_obj(name, self.v, self.f, mats=mats, face_mats=self.m)


def _mix(a, b, t):
    ca, cb = C.hex_rgb(a), C.hex_rgb(b)
    return tuple(x + (y - x) * t for x, y in zip(ca, cb))


class City:
    def __init__(self, seed=7, n=6, rings=6, downtown=1.0):
        self.seed, self.n, self.rings, self.downtown = seed, n, rings, downtown
        self.lots, self.parks = [], []
        self.win_mats = []

    # ------------------------------------------------------------------
    def build(self, focus=(0, 0), detail_radius=110, haze="#dfe8ee", haze_amt=0.35, lit_fraction=0.65,
              windows=True, lamps=True, trees=True, skip_lots=(), heights=None):
        heights = {**LANDMARKS, **(heights or {})}
        r = random.Random(self.seed)
        n = self.n
        reach = (n + 0.5) * PITCH
        # ground
        C.box("Ground", (reach * 2 + 400, reach * 2 + 400, 1), (0, 0, -0.5), C.mat("asphalt", P.ASPHALT, rough=0.95))
        C.box("Outskirts", (reach * 6, reach * 6, 1), (0, 0, -0.62), C.mat("grass_far", "#5d7f4c"))
        # materials: building colours x 3 haze bands
        bmats = []
        for band in range(3):
            for i, col in enumerate(P.BUILDINGS):
                m = C.mat(f"bld{i}_h{band}", "#000000")
                c = _mix(col, haze, haze_amt * band / 2)
                m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*c, 1)
                m.diffuse_color = (*c, 1)
                bmats.append(m)
        roof_i = len(bmats); bmats.append(C.mat("roof", P.ROOF))
        walk_i = len(bmats); bmats.append(C.mat("sidewalk", P.SIDEWALK))
        grass_i = len(bmats); bmats.append(C.mat("grass", P.GRASS))
        lane_i = len(bmats); bmats.append(C.mat("lane", P.LANE, rough=0.7))
        tank_i = len(bmats); bmats.append(C.mat("tank", "#8b6f55"))
        self.win_mats = [C.mat(f"win_ring{k}", P.WINDOW_DARK, emission=0.0, emit_color=P.WINDOW_LIT, rough=0.3)
                         for k in range(self.rings)]
        off_m = C.mat("win_off", P.WINDOW_DARK, rough=0.3)
        city, win = MeshBuf(), MeshBuf()
        fx, fy = focus
        max_d = math.hypot(reach, reach)
        for i in range(-n, n + 1):
            for j in range(-n, n + 1):
                cx, cy = i * PITCH, j * PITCH
                city.box(cx, cy, 0, BLOCK, BLOCK, 0.18, walk_i)
                d0 = math.hypot(cx - fx, cy - fy)
                band = 0 if d0 < detail_radius else (1 if d0 < detail_radius * 2.2 else 2)
                if r.random() < 0.08 and (i, j) != (0, 0):
                    city.box(cx, cy, 0.18, BLOCK - 4, BLOCK - 4, 0.05, grass_i)
                    self.parks.append((cx, cy))
                    continue
                dist_c = math.hypot(cx, cy) / PITCH
                for li, (ox, oy) in enumerate(((-9, -9), (9, -9), (-9, 9), (9, 9))):
                    if (i, j, li) in skip_lots:
                        continue
                    x, y = cx + ox, cy + oy
                    w, d = r.uniform(11, 16), r.uniform(11, 16)
                    base = max(2, int(r.gauss(18 * self.downtown * math.exp(-dist_c / 3.2) + 4, 4)))
                    floors = heights.get((i, j, li), min(base, 48))
                    h = floors * FLOOR
                    ci = r.randrange(len(P.BUILDINGS)) + band * len(P.BUILDINGS)
                    style = r.choice(("box", "box", "setback", "taper")) if (i, j, li) not in heights else "box"
                    city.box(x, y, 0.18, w, d, h, ci, taper=0.92 if style == "taper" else 1.0)
                    top = 0.18 + h
                    tw, td = (w * 0.92, d * 0.92) if style == "taper" else (w, d)
                    if style == "setback" and floors > 8:
                        sh = r.randint(3, 8) * FLOOR
                        city.box(x, y, top, w * 0.65, d * 0.65, sh, ci)
                        top += sh; tw, td = w * 0.65, d * 0.65
                    city.box(x, y, top, tw * 0.96, td * 0.96, 0.4, roof_i)
                    if band == 0:
                        for _ in range(r.randint(0, 3)):
                            city.box(x + r.uniform(-tw / 3, tw / 3), y + r.uniform(-td / 3, td / 3), top + 0.4, 1.6, 1.2, 1.0, roof_i)
                        if r.random() < 0.3:
                            city.cyl(x + tw / 4, y - td / 4, top + 0.4, 1.3, 2.2, tank_i)
                    ring = min(self.rings - 1, int(self.rings * math.hypot(x, y) / max_d * 1.25))
                    lot = dict(i=i, j=j, li=li, x=x, y=y, w=w, d=d, h=h, floors=floors, ring=ring, top=top)
                    self.lots.append(lot)
                    if windows:
                        self._windows(win, lot, style, r, lit_fraction, ring)
        # lane markings
        for k in range(-n - 1, n + 1):
            c = (k + 0.5) * PITCH
            for s in range(int(-reach), int(reach), 6):
                city.box(c, s, 0.0, 0.18, 3.0, 0.03, lane_i)
                city.box(s, c, 0.0, 3.0, 0.18, 0.03, lane_i)
        self.city_obj = city.obj("City", bmats)
        if windows:
            self.win_obj = win.obj("Windows", self.win_mats + [off_m])
        if trees or lamps:
            self._street_furniture(focus, detail_radius, r, trees, lamps)
        return self

    def _windows(self, buf, lot, style, r, lit_fraction, ring):
        x, y, w, d = lot["x"], lot["y"], lot["w"], lot["d"]
        floors = lot["floors"]
        if style == "setback":
            floors = floors  # windows on main body only
        tp = 0.92 if style == "taper" else 1.0
        e = 0.06
        for fl in range(floors):
            z0 = 0.18 + fl * FLOOR + 0.9
            z1 = z0 + 1.7
            t0 = 1 - (1 - tp) * (z0 / (floors * FLOOR)); t1 = 1 - (1 - tp) * (z1 / (floors * FLOOR))
            for axis, span, other in (("x", w, d), ("y", d, w)):
                cols = max(1, int(span / 3.0))
                for c in range(cols):
                    u = (c + 0.5) / cols - 0.5
                    for side in (-1, 1):
                        mi = ring if r.random() < lit_fraction else len(self.win_mats)
                        a0, a1 = (u * span - 0.7), (u * span + 0.7)
                        if axis == "x":
                            yy0 = y + side * (other / 2 * t0 + e); yy1 = y + side * (other / 2 * t1 + e)
                            pts = [(x + a0 * t0, yy0, z0), (x + a1 * t0, yy0, z0), (x + a1 * t1, yy1, z1), (x + a0 * t1, yy1, z1)]
                        else:
                            xx0 = x + side * (other / 2 * t0 + e); xx1 = x + side * (other / 2 * t1 + e)
                            pts = [(xx0, y + a0 * t0, z0), (xx0, y + a1 * t0, z0), (xx1, y + a1 * t1, z1), (xx1, y + a0 * t1, z1)]
                        if side * (1 if axis == "x" else -1) > 0:
                            pts = pts[::-1]
                        buf.quad(pts, mi)

    def _street_furniture(self, focus, radius, r, trees, lamps):
        fx, fy = focus
        n = self.n
        self.lamp_mats = [C.mat(f"lamp_ring{k}", "#fff1c9", emission=0.0, emit_color="#ffcf8a") for k in range(self.rings)]
        objs_t, objs_l = [], []
        max_d = math.hypot((n + .5) * PITCH, (n + .5) * PITCH)
        for i in range(-n, n + 1):
            for j in range(-n, n + 1):
                cx, cy = i * PITCH, j * PITCH
                if math.hypot(cx - fx, cy - fy) > radius:
                    continue
                for k in range(-2, 3):
                    for sx, sy, hd in ((k * 7, -BLOCK / 2 + 1.2, 0), (k * 7, BLOCK / 2 - 1.2, 180),
                                       (-BLOCK / 2 + 1.2, k * 7, -90), (BLOCK / 2 - 1.2, k * 7, 90)):
                        x, y = cx + sx, cy + sy
                        if trees and k % 2 == 0 and r.random() < 0.7:
                            objs_t.append(props.tree(f"tree_{i}_{j}_{k}_{hd}", (x, y, 0.18), seed=r.randrange(999), size=r.uniform(0.85, 1.2)))
                        if lamps and k in (-1, 1) and abs(sx) + abs(sy) > 0:
                            ring = min(self.rings - 1, int(self.rings * math.hypot(x, y) / max_d * 1.25))
                            props.street_lamp(f"lamp_{i}_{j}_{k}_{hd}", (x, y, 0.18), hd, self.lamp_mats[ring])
        if objs_t:
            C.join(objs_t, "Trees")

    # ------------------------------------------------------------------
    def set_ring(self, k, strength, frame=None, lamps=True):
        C.set_emission(self.win_mats[k], strength, frame)
        if lamps and getattr(self, "lamp_mats", None):
            C.set_emission(self.lamp_mats[k], strength * 2.5, frame)

    def all_lights(self, strength, frame=None):
        for k in range(self.rings):
            self.set_ring(k, strength, frame)

    @staticmethod
    def road(k):
        """Centre coordinate of road line k (between block k and k+1)."""
        return (k + 0.5) * PITCH
