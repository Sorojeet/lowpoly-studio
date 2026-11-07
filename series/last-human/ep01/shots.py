"""LAST HUMAN — Episode 1 "Day 1": all shots.

    python3 shots.py s02_door              # render shot -> build/.../shots/s02_door.mp4
    python3 shots.py s02_door --still 120  # one full-size test frame (jpg)
"""
import json, math, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
sys.path.insert(0, ROOT)
from studio import core as C, render as R, lighting as Lt, palette as P
from assets.city import City, PITCH, BLOCK, HOME, LIGHT_TOWER
from assets.characters.survivor import Survivor
from assets import props, power, sky

EP = os.path.join(ROOT, "build/last-human/ep01")
TIMING = json.load(open(os.path.join(EP, "audio/timing.json")))
SEED = 7          # the series city — keep fixed across episodes
LEAD = 0.25       # seconds of silence before narration in each shot


def frames(shot):
    return round(TIMING[shot]["dur"] * R.FPS)


def at(shot, sec):
    """frame number for `sec` seconds after narration starts."""
    return 1 + round((sec + LEAD) * R.FPS)


def world(preset, focus, radius=90, lit=0.0, **kw):
    C.reset()
    Lt.apply(preset)
    city = City(seed=SEED, n=6).build(focus=focus, detail_radius=radius, **kw)
    city.all_lights(lit)
    return city


def home_lot(city):
    return next(l for l in city.lots if (l["i"], l["j"], l["li"]) == HOME)


def entrance(lot):
    """Kai's apartment door on the south face of his building."""
    x, yf = lot["x"], lot["y"] - lot["d"] / 2
    dark = C.mat("door_dark", "#1a1c22"); frame = C.mat("door_frame", "#5a4a3c"); awn = C.mat("awning", "#2f6f73")
    C.box("door_recess", (2.2, 0.4, 2.6), (x, yf - 0.05, 0.18), dark, origin='bottom')
    C.box("door_frame_t", (2.8, 0.5, 0.25), (x, yf - 0.1, 2.8), frame, origin='bottom')
    for sx in (-1.25, 1.25):
        C.box(f"door_frame{sx}", (0.3, 0.5, 2.8), (x + sx, yf - 0.1, 0.18), frame, origin='bottom')
    C.box("awning", (4.0, 1.8, 0.18), (x, yf - 0.9, 3.4), awn, origin='bottom', taper=0.97)
    C.box("step", (3.2, 1.0, 0.18), (x, yf - 0.6, 0.18), C.mat("step", "#bdb6aa"), origin='bottom')
    num = C.mat("door_sign", "#e6e2d8", emission=0.6, emit_color="#fff4d0")
    C.box("door_sign", (0.8, 0.05, 0.3), (x + 1.9, yf - 0.06, 2.3), num)
    return x, yf


def scatter_cars(points, seed=0, **kw):
    out = []
    for k, (x, y, h) in enumerate(points):
        out.append(props.car(f"car{seed}_{k}", (x, y, 0), h, seed=seed * 31 + k, **kw))
    return out


# ============================================================== shots
def s01_aerial(n):
    city = world("dawn", focus=(0, -40), radius=70, lit=1.6, lit_fraction=0.12)
    sky.clouds(14, seed=4, height=170, color="#ffd9c4")
    props.flock(9, [(-80, -150, 60), (0, -120, 70), (90, -60, 85)], 1, n, seed=1, spread=5)
    scatter_cars([(25, -40, 3), (21, -70, 178), (-25, -10, 92), (75, 22, 88), (29, 30, 2)], seed=1)
    cam, tgt = R.camera((70, -300, 150), (0, 0, 15), lens=28)
    R.move(cam, [(1, (70, -300, 150)), (n, (40, -195, 92))])
    R.move(tgt, [(1, (0, 0, 15)), (n, (5, -20, 4))])


def s02_door(n):
    city = world("morning", focus=(-9, -25), radius=60)
    lot = home_lot(city)
    x, yf = entrance(lot)
    kai = Survivor("Kai", (x, yf + 0.3, 0.18), facing=0)
    kai.pose_stand(1)
    walk_end = at("s02_door", 2.0)
    kai.walk([(x, yf + 0.3), (x, yf - 2.6)], 12, walk_end)
    kai.pose_stand(walk_end + 4)
    kai.look(walk_end + 10, yaw=55)        # "No traffic."
    kai.look(at("s02_door", 4.3), yaw=-50)   # "No voices."
    kai.look(at("s02_door", 6.4), yaw=0, pitch=-12)  # "...holding its breath." looks up
    scatter_cars([(x - 7, yf - 11, 2), (x + 14, yf - 13.5, 179)], seed=2)
    props.bench("bench", (x - 4.5, yf - 2.0, 0.18), 0)
    props.flock(4, [(x + 30, yf - 30, 18), (x - 10, yf - 8, 14), (x - 40, yf + 10, 25)], 30, 200, seed=3, spread=2)
    cam, tgt = R.camera((x + 2.2, yf - 8.5, 1.0), (x, yf - 1, 1.5), lens=38)
    R.move(cam, [(1, (x + 3.2, yf - 10.5, 1.3)), (n, (x + 1.8, yf - 7.8, 1.45))])
    R.move(tgt, [(1, (x, yf - 1, 1.7)), (n, (x, yf - 2.6, 1.55))])


def s03_cars(n):
    city = world("morning", focus=(25, -25), radius=60)
    rx, ry = City.road(0), City.road(-1)   # intersection (25,-25)
    cyc = [(1, "red"), (at("s03_cars", 3.6), "green"), (at("s03_cars", 5.6), "amber"), (at("s03_cars", 6.6), "red")]
    props.traffic_light("tl", (rx - 8.0, ry - 8.5, 0.18), heading=90, cycle=cyc)
    props.traffic_light("tl2", (rx + 8.0, ry + 8.5, 0.18), heading=-90, cycle=cyc)
    scatter_cars([(rx - 3, ry - 14, 8), (rx + 3.5, ry - 4, 200), (rx - 2.5, ry + 9, 172),
                  (rx + 13, ry - 2.5, 95), (rx - 16, ry + 3, -80), (rx - 3.5, ry + 22, 182)], seed=3)
    props.car("open", (rx + 4.5, ry - 15, 0), 8, color="#2f6fb0", door_open=55)
    props.flock(3, [(rx + 2, ry - 4, 1.9), (rx + 2.2, ry - 4.3, 1.9)], 1, n, seed=5, spread=0.6, flap_period=40)
    cam, tgt = R.camera((rx - 1, ry - 24, 2.0), (rx - 6, ry - 8.5, 3.6), lens=30)
    R.move(cam, [(1, (rx - 2.5, ry - 25, 1.8)), (n, (rx + 2.0, ry - 22.5, 2.6))])
    R.move(tgt, [(1, (rx - 6.5, ry - 8.5, 4.2)), (n, (rx - 3, ry - 6, 3.0))])


def s04_walk(n):
    city = world("day", focus=(25, -90), radius=60)
    rx = City.road(0)
    kai = Survivor("Kai", (rx, -60, 0), facing=0)
    stop = at("s04_walk", 3.0)
    kai.walk([(rx, -62), (rx + 0.4, -71)], 1, stop)
    kai.pose_stand(stop + 3)
    kai.shout(stop + 4)
    kai.pose_stand(at("s04_walk", 4.0))
    kai.phone_call(at("s04_walk", 4.2))
    kai.look(at("s04_walk", 6.0), yaw=-8, pitch=10)
    scatter_cars([(rx + 4, -95, 182), (rx - 4.5, -88, 2), (rx + 4.5, -55, 178), (rx - 5, -112, 0)], seed=4)
    props.flock(6, [(rx - 40, -40, 30), (rx, -70, 22), (rx + 50, -100, 35)], at("s04_walk", 1.0), n, seed=6, spread=4)
    cam, tgt = R.camera((rx + 1.5, -66, 1.6), (rx, -62, 1.4), lens=35)
    R.move(cam, [(1, (rx + 1.6, -67.5, 1.7)), (stop, (rx + 1.3, -76.5, 1.55)), (n, (rx + 0.9, -74.3, 1.62))])
    R.move(tgt, [(1, (rx, -62, 1.3)), (stop, (rx + 0.3, -71, 1.35)), (n, (rx + 0.4, -71, 1.6))])


def s05_power(n):
    C.reset(); Lt.apply("afternoon")
    city = City(seed=SEED, n=6).build(focus=(400, 400), detail_radius=1, windows=True, trees=False, lamps=False)
    city.all_lights(0.0)
    C.box("field", (900, 900, 0.4), (60, 560, -0.2), C.mat("field", P.GRASS))
    loc = (60, 470, 0)
    root, h = power.plant("Plant", loc)
    C.set_emission(h["windows"], 2.5)
    stop = at("s05_power", 7.0)
    for i, top in enumerate(h["tower_tops"]):
        power.smoke(f"steam{i}", top, 1, n, rate=7, rise=0.16, size=8.0, seed=10 + i, stop_frame=stop)
    power.smoke("stackfume", h["stack_top"], 1, n, rate=9, rise=0.2, size=2.2, seed=20, color="#cfcfcf", stop_frame=stop)
    pts = [(60, 420), (75, 370), (90, 320)]
    for k, p in enumerate(pts):
        power.pylon(f"py{k}", (*p, 0), heading=math.degrees(math.atan2(-50, 15)))
    power.power_line("lines", pts)
    trees = [props.tree(f"pt{k}", (loc[0] - 70 + k * 9, loc[1] - 45 + (k % 3) * 4, 0), seed=k, size=1.6, kind="pine" if k % 2 else "round") for k in range(16)]
    C.join(trees, "PlantTrees")
    props.flock(7, [(150, 380, 40), (60, 450, 55), (-50, 520, 60)], 1, n, seed=8, spread=6)
    # warning: plant windows flicker, beacon blinks, then dies
    for f in range(1, n, 14):
        C.set_emission(h["beacon"], 7.0, f); C.set_emission(h["beacon"], 0.0, f + 7)
    for k, f in enumerate(range(stop - 30, stop + 10, 5)):
        C.set_emission(h["windows"], 0.3 if k % 2 == 0 else 2.2, f)
    C.set_emission(h["windows"], 0.0, stop + 12)
    cam, tgt = R.camera((140, 385, 10), (50, 480, 22), lens=28)
    R.move(cam, [(1, (145, 375, 8)), (n, (118, 402, 13))])
    R.move(tgt, [(1, (48, 478, 24)), (n, (45, 482, 30))])


def s06_blackout(n):
    city = world("dusk", focus=(0, 0), radius=80, lit=4.0, lit_fraction=0.7)
    Lt.apply("dusk", 1)
    Lt.apply("night", n)
    sky.stars(300, seed=2, strength=4)
    start = at("s06_blackout", 2.3)
    step = (n - 25 - start) / city.rings
    for k in range(city.rings):           # outer districts fail first
        ring = city.rings - 1 - k
        f = int(start + k * step)
        city.set_ring(ring, 4.0, f)
        city.set_ring(ring, 0.6, f + 2)
        city.set_ring(ring, 3.0, f + 4)    # flicker
        city.set_ring(ring, 0.0, f + 7)
    cam, tgt = R.camera((-190, -250, 120), (0, 0, 10), lens=26)
    R.move(cam, [(1, (-190, -250, 120)), (n, (-165, -228, 104))])
    R.move(tgt, [(1, (0, 0, 14)), (n, (5, 5, 10))])


def _rooftop(city):
    lot = home_lot(city)
    top = lot["top"] + 0.4
    # the light-house: a tall far building south-west
    far = next(l for l in city.lots if (l["i"], l["j"], l["li"]) == LIGHT_TOWER)
    ex, ey = lot["x"], lot["y"] - lot["d"] * 0.96 / 2 + 0.25
    ux, uy = far["x"] - ex, far["y"] - ey
    L = math.hypot(ux, uy); ux, uy = ux / L, uy / L
    C.box("parapet", (lot["w"] * 0.96, 0.3, 0.35), (lot["x"], ey - 0.05, top), C.mat("roof", P.ROOF), origin='bottom')
    return lot, far, (ex, ey, top), (ux, uy)


def night_world():
    city = world("blackout", focus=(0, -60), radius=50, lit=0.0, trees=True, lamps=True)
    sky.stars(700, seed=2, strength=7)
    sky.moon((-500, 700, 420), 26)
    return city


def s07_rooftop(n):
    city = night_world()
    lot, far, (ex, ey, top), (ux, uy) = _rooftop(city)
    kai = Survivor("Kai", (ex, ey, top + 0.35), facing=math.degrees(math.atan2(uy, ux)) + 90)
    kai.sit(1, ledge_h=0.0)
    kai.look(at("s07_rooftop", 3.0), pitch=-25)   # "Just stars..."
    kai.look(at("s07_rooftop", 6.2), pitch=0, yaw=6)
    sx, sy = -uy, ux
    c0 = (ex - ux * 4.5 + sx * 1.6, ey - uy * 4.5 + sy * 1.6, top + 1.8)
    c1 = (ex - ux * 6.0 + sx * 2.4, ey - uy * 6.0 + sy * 2.4, top + 3.2)
    cam, tgt = R.camera(c0, (ex, ey, top + 1), lens=26)
    R.move(cam, [(1, c0), (n, c1)])
    # dark horizon with Kai -> tilt up to the stars -> settle back on Kai
    R.move(tgt, [(1, (ex + ux * 6, ey + uy * 6, top + 0.6)), (at("s07_rooftop", 2.6), (ex + ux * 8, ey + uy * 8, top + 1.2)),
                 (at("s07_rooftop", 4.6), (ex + ux * 30, ey + uy * 30, top + 34)), (at("s07_rooftop", 5.8), (ex + ux * 30, ey + uy * 30, top + 36)),
                 (n - 15, (ex + ux * 7, ey + uy * 7, top + 0.9)), (n, (ex + ux * 7, ey + uy * 7, top + 0.9))])


def s08_light(n):
    city = night_world()
    lot, far, (ex, ey, top), (ux, uy) = _rooftop(city)
    kai = Survivor("Kai", (ex, ey, top + 0.35), facing=math.degrees(math.atan2(uy, ux)) + 90)
    kai.sit(1)
    # one window on the far building's face toward Kai
    fx, fy = far["x"], far["y"]
    face_y = fy + far["d"] / 2 + 0.12
    wz = 0.18 + (far["floors"] - 4) * 3.3 + 0.9
    lm = C.mat("the_light", "#2a3442", emission=0.0, emit_color="#ffd27a")
    C.box("TheLight", (1.6, 0.1, 1.8), (fx + 1.5, face_y, wz), lm, origin='bottom')
    on = at("s08_light", 3.2)
    C.set_emission(lm, 0.0, on - 1)
    C.set_emission(lm, 9.0, on)
    C.set_emission(lm, 2.0, on + 3)
    C.set_emission(lm, 6.0, on + 6)
    kai.look(on + 6, yaw=-4, pitch=6)
    # over-the-shoulder, slow push toward the light
    sx, sy = -uy, ux
    lx, ly, lz = fx + 1.5, face_y, wz + 0.9
    c0 = (ex - ux * 2.4 + sx * 0.9, ey - uy * 2.4 + sy * 0.9, top + 1.75)
    c1 = (ex - ux * 1.2 + sx * 0.7, ey - uy * 1.2 + sy * 0.7, top + 1.6)
    cam, tgt = R.camera(c0, (lx, ly, lz), lens=40)
    R.move(cam, [(1, c0), (on, c0), (n, c1)])
    R.move(tgt, [(1, (lx, ly, lz - 10)), (on, (lx, ly, lz - 6)), (n, (lx, ly, lz))])
    cam.data.keyframe_insert("lens", frame=on)
    cam.data.lens = 62
    cam.data.keyframe_insert("lens", frame=n)


SHOTS = {k: v for k, v in globals().items() if k[:1] == "s" and k[1:3].isdigit()}

if __name__ == "__main__":
    shot = sys.argv[1]
    n = frames(shot)
    SHOTS[shot](n)
    res = int(os.environ.get("RES", 50))
    R.setup("EEVEE", res_pct=res, samples=int(os.environ.get("SAMPLES", 3)), frames=n)
    os.makedirs(os.path.join(EP, "shots"), exist_ok=True)
    if "--still" in sys.argv:
        f = int(sys.argv[sys.argv.index("--still") + 1])
        R.frame(os.path.join(EP, "stills", f"{shot}_{f:04d}.jpg"), f)
    else:
        R.render_shot(os.path.join(EP, "shots", f"{shot}.mp4"), os.path.join(EP, "frames", shot))
