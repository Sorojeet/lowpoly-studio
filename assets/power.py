"""Power station + transmission pylons + rising smoke. Reusable for any
'infrastructure fails' beat (Ep1 blackout, later episodes' dams/plants)."""
import math, random
from studio import core as C


def cooling_tower(name, loc, r=9, h=26, mat=None):
    # hyperboloid approximated with 3 stacked frustums
    m = mat or C.mat("concrete_tower", "#d8d2c6")
    parts = [C.cylinder(f"{name}_a", r, h * 0.55, 14, (0, 0, 0), m, r_top=r * 0.68),
             C.cylinder(f"{name}_b", r * 0.68, h * 0.3, 14, (0, 0, h * 0.55), m, r_top=r * 0.64),
             C.cylinder(f"{name}_c", r * 0.64, h * 0.15, 14, (0, 0, h * 0.85), m, r_top=r * 0.72)]
    o = C.join(parts, name)
    o.location = loc
    return o


def plant(name="Plant", loc=(0, 0, 0), status_mat=None):
    """Returns (root, dict of useful handles). status_mat: emissive warning light material."""
    root = C.empty(name, loc)
    wall = C.mat("plant_wall", "#b9c2c9"); dark = C.mat("plant_dark", "#5b6670"); red = C.mat("plant_red", "#c8503c")
    parts = [C.box(f"{name}_hall", (36, 18, 12), (0, 0, 0), wall, origin='bottom'),
             C.box(f"{name}_roof", (36.4, 18.4, 1), (0, 0, 12), dark, origin='bottom'),
             C.box(f"{name}_hall2", (20, 14, 18), (-26, 4, 0), wall, origin='bottom'),
             C.cylinder(f"{name}_stack", 2.2, 48, 10, (14, 12, 0), red, r_top=1.6),
             C.box(f"{name}_tf", (10, 6, 5), (-6, -16, 0), dark, origin='bottom'),
             C.box(f"{name}_tf2", (10, 6, 5), (8, -16, 0), dark, origin='bottom'),
             C.box(f"{name}_pad", (110, 80, 0.3), (0, 10, 0), C.mat("plant_pad", "#8f8c86"), origin='bottom')]
    for i in range(6):  # stripe on stack
        parts.append(C.cylinder(f"{name}_st{i}", 1.6 + 0.6 * (1 - i / 6) + 0.05, 1.5, 10, (14, 12, 8 + i * 7),
                                C.mat("stack_white", "#f2f2f2"), r_top=1.6 + 0.6 * (1 - (i + 0.2) / 6)))
    C.parent(C.join(parts, f"{name}_static"), root)
    towers = [C.parent(cooling_tower(f"{name}_ct{i}", (x, 34, 0)), root) for i, x in enumerate((-28, 0))]
    win = status_mat or C.mat("plant_windows", "#1d2733", emission=0.0, emit_color="#ffe0a0")
    for k in range(8):
        C.parent(C.box(f"{name}_w{k}", (2.6, 0.2, 1.4), (-15 + k * 4.3, -9.1, 8), win), root)
    beacon = C.mat("beacon", "#300", emission=6.0, emit_color="#ff2a2a")
    C.parent(C.ico(f"{name}_beacon", 0.6, (14, 12, 48.6), beacon), root)
    return root, dict(windows=win, beacon=beacon, towers=towers, stack_top=(loc[0] + 14, loc[1] + 12, loc[2] + 48),
                      tower_tops=[(loc[0] + x, loc[1] + 34, loc[2] + 26) for x in (-28, 0)])


def smoke(name, src, start, end, rate=6, rise=0.18, drift=(0.06, 0.02), size=2.5, seed=0, color="#eeeeee",
          stop_frame=None):
    """Puffs spawning every `rate` frames at src, rising and growing, fading by scale."""
    r = random.Random(seed)
    m = C.mat(f"smoke_{color}", color, rough=1.0)
    puffs = []
    life = 150
    for k, f0 in enumerate(range(start - life, end, rate)):
        if stop_frame and f0 > stop_frame:
            break
        p = C.ico(f"{name}_{k}", size, src, m, 1, jitter=0.25, seed=seed + k)
        for f in (f0, f0 + life):
            t = (f - f0) / life
            p.location = (src[0] + drift[0] * (f - f0) + r.uniform(-1, 1) * t * 6,
                          src[1] + drift[1] * (f - f0), src[2] + rise * (f - f0))
            s = 0.4 + 2.2 * t
            p.scale = (s, s, s * 0.85) if t < 0.85 else (0.01,) * 3
            C.key(p, "location", f, interp='LINEAR'); C.key(p, "scale", f, interp='LINEAR')
        puffs.append(p)
    return puffs


def pylon(name, loc, heading=0, h=30):
    m = C.mat("steel", "#7d848c", rough=0.5, metal=0.6)
    parts = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            leg = C.cylinder(f"{name}_l{sx}{sy}", 0.25, h, 4, (sx * 3, sy * 3, 0), m, r_top=0.15)
            leg.rotation_euler = (math.radians(-5.5 * sy), math.radians(5.5 * sx), 0)
            parts.append(leg)
    for z, w in ((h * 0.55, 9), (h * 0.8, 12), (h * 0.98, 6)):
        parts.append(C.box(f"{name}_x{z}", (w, 0.4, 0.4), (0, 0, z), m))
    for z in (h * 0.25, h * 0.5, h * 0.75):
        parts.append(C.box(f"{name}_r{z}", (6 * (1 - z / h * 0.55), 6 * (1 - z / h * 0.55), 0.3), (0, 0, z), m))
    o = C.join(parts, name)
    o.location = loc
    o.rotation_euler = (0, 0, math.radians(heading))
    return o


def power_line(name, pylons_xy, h=30):
    m = C.mat("cable", "#2b2b2b")
    objs = []
    for (a, b) in zip(pylons_xy, pylons_xy[1:]):
        for off in (-5.5, 0, 5.5):
            ax, ay = a; bx, by = b
            d = math.dist(a, b)
            ang = math.atan2(by - ay, bx - ax)
            nx, ny = -math.sin(ang) * off, math.cos(ang) * off
            c = C.cylinder(f"{name}_{ax}_{off}", 0.06, d, 4, (ax + nx, ay + ny, h * 0.8 - 0.5), m, axis='X', origin='bottom')
            c.rotation_euler = (0, math.pi / 2, ang)
            objs.append(c)
    return C.join(objs, name)
