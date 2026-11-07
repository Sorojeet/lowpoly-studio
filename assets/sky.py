"""Night sky dressing: star dome, moon, low clouds."""
import math, random
from studio import core as C


def stars(n=500, radius=1400, seed=1, strength=6.0, min_elev=4, center=(0, 0)):
    r = random.Random(seed)
    m = C.mat("star", "#ffffff", emission=strength, emit_color="#f3f6ff")
    objs = []
    for i in range(n):
        az = r.uniform(0, 2 * math.pi)
        el = math.radians(r.uniform(min_elev, 88) ** 1.0)
        rr = radius * r.uniform(0.95, 1.0)
        p = (center[0] + rr * math.cos(el) * math.cos(az), center[1] + rr * math.cos(el) * math.sin(az), rr * math.sin(el))
        objs.append(C.ico(f"star{i}", r.uniform(0.9, 2.6), p, m, 1))
    o = C.join(objs, "Stars")
    return o, m


def moon(loc, r=30):
    m = C.mat("moon", "#dfe6ff", emission=2.5, emit_color="#e8eeff")
    return C.ico("Moon", r, loc, m, 2, jitter=0.02)


def clouds(n=12, seed=3, height=180, spread=900, color="#f4f1ec"):
    rnd = random.Random(seed)
    m = C.mat(f"cloud_{color}", color, rough=1.0)
    objs = []
    for i in range(n):
        cx, cy = rnd.uniform(-spread, spread), rnd.uniform(-spread, spread)
        for k in range(rnd.randint(3, 5)):
            objs.append(C.ico(f"cl{i}_{k}", rnd.uniform(14, 26), (cx + k * 18, cy + rnd.uniform(-8, 8), height + rnd.uniform(-5, 5)),
                              m, 1, jitter=0.2, scale=(1.4, 1, 0.55), seed=i * 10 + k))
    return C.join(objs, "Clouds")
