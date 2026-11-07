"""Street props: cars, traffic lights, street lamps, trees, birds, benches.
All return a root object you can move/rotate; animation helpers included."""
import math, random
from studio import core as C, palette as P


# ------------------------------------------------------------------ car
def car(name, loc=(0, 0, 0), heading=0, color=None, seed=0, door_open=0.0, kind="sedan", lights_on=False):
    r = random.Random(seed)
    color = color or r.choice(P.CAR)
    body = C.mat(f"car_{color}", color, rough=0.45)
    glass = C.mat("car_glass", "#2b3a4a", rough=0.15, metal=0.3)
    tyre = C.mat("tyre", P.TYRE)
    head = C.mat("headlight_on" if lights_on else "headlight", "#fff6d8", emission=3.0 if lights_on else 0.0)
    tail = C.mat("taillight", "#c81e1e", emission=0.6)
    L, Wd = (4.4, 1.85) if kind == "sedan" else (4.0, 1.9)
    root = C.empty(name, loc)
    root.rotation_euler = (0, 0, math.radians(heading))
    parts = [C.box(f"{name}_b", (Wd, L, 0.62), (0, 0, 0.32), body, origin='bottom', taper=0.97)]
    cab_h, cab_l, cab_y = (0.58, 2.2, 0.25) if kind == "sedan" else (0.75, 2.9, 0.45)
    parts.append(C.box(f"{name}_c", (Wd * 0.88, cab_l, cab_h), (0, cab_y, 0.94), glass, origin='bottom', taper=0.78))
    parts.append(C.box(f"{name}_r", (Wd * 0.7, cab_l * 0.6, 0.04), (0, cab_y, 0.94 + cab_h), body, origin='bottom'))
    for sx in (-1, 1):
        parts.append(C.box(f"{name}_hl{sx}", (0.36, 0.05, 0.14), (0.58 * sx, -L / 2, 0.72), head))
        parts.append(C.box(f"{name}_tl{sx}", (0.36, 0.05, 0.14), (0.62 * sx, L / 2, 0.75), tail))
        for sy in (-1, 1):
            w = C.cylinder(f"{name}_w{sx}{sy}", 0.36, 0.26, 10, (sx * (Wd / 2 - 0.12), sy * L * 0.31, 0.36), tyre, axis='X', origin='center')
            parts.append(w)
    shell = C.join(parts, f"{name}_shell")
    C.parent(shell, root)
    shell.location = (0, 0, 0)
    if door_open:
        hinge = C.empty(f"{name}_hinge", (-Wd / 2, -0.35, 0.35), root)
        d = C.box(f"{name}_door", (0.06, 1.1, 0.95), (0, 0.55, 0.45), body)
        C.parent(d, hinge)
        hinge.rotation_euler = (0, 0, math.radians(-door_open))
    return root


# ------------------------------------------------------------------ traffic light
def traffic_light(name, loc=(0, 0, 0), heading=0, cycle=None):
    """cycle: list of (frame, 'red'|'amber'|'green') to animate."""
    pole_m = C.mat("pole", "#4a4e57", rough=0.6, metal=0.4)
    root = C.empty(name, loc)
    root.rotation_euler = (0, 0, math.radians(heading))
    parts = [C.cylinder(f"{name}_pole", 0.09, 4.6, 8, (0, 0, 0), pole_m),
             C.box(f"{name}_arm", (0.1, 2.4, 0.1), (0, -1.2, 4.5), pole_m),
             C.box(f"{name}_box", (0.42, 0.34, 1.2), (0, -2.3, 3.85), C.mat("tl_box", "#1e2026"))]
    C.parent(C.join(parts, f"{name}_static"), root)
    lamps = {}
    for i, (col, hexc) in enumerate((("red", P.RED), ("amber", P.AMBER), ("green", P.GREEN))):
        m = C.mat(f"{name}_{col}", "#222", emission=0.0, emit_color=hexc)
        lamp = C.cylinder(f"{name}_{col}", 0.13, 0.06, 10, (-0.23, -2.3, 4.25 - i * 0.38), m, axis='X', origin='center')
        C.parent(lamp, root)
        lamps[col] = m
    if cycle:
        for f, state in cycle:
            for col, m in lamps.items():
                C.set_emission(m, 0.0 if col != state else 0.0, f - 1)
                C.set_emission(m, 12.0 if col == state else 0.0, f)
        for m in lamps.values():  # make switches instant
            for fc in C._fcurves(m.node_tree.animation_data.action):
                for kp in fc.keyframe_points:
                    kp.interpolation = 'CONSTANT'
    return root, lamps


# ------------------------------------------------------------------ street lamp
def street_lamp(name, loc=(0, 0, 0), heading=0, lamp_mat=None):
    pole_m = C.mat("pole", "#4a4e57", rough=0.6, metal=0.4)
    lamp_mat = lamp_mat or C.mat("lamp", "#fff1c9", emission=0.0, emit_color="#ffd48a")
    parts = [C.cylinder(f"{name}_p", 0.07, 6, 6, (0, 0, 0), pole_m),
             C.box(f"{name}_a", (0.08, 1.2, 0.08), (0, -0.6, 6.0), pole_m)]
    o = C.join(parts, name)
    lamp = C.box(f"{name}_h", (0.3, 0.55, 0.12), (0, -1.15, 5.92), lamp_mat)
    lamp.parent = o
    o.location = loc
    o.rotation_euler = (0, 0, math.radians(heading))
    return o


# ------------------------------------------------------------------ nature
def tree(name, loc=(0, 0, 0), seed=0, size=1.0, kind="round"):
    r = random.Random(seed)
    trunk = C.cylinder(f"{name}_t", 0.14 * size, 1.8 * size, 6, (0, 0, 0), C.mat("trunk", P.TRUNK), r_top=0.1 * size)
    leaf = C.mat(f"leaf{seed % len(P.LEAF)}", P.LEAF[seed % len(P.LEAF)], rough=0.9)
    parts = [trunk]
    if kind == "pine":
        for i in range(3):
            parts.append(C.cylinder(f"{name}_c{i}", (1.1 - i * 0.28) * size, 1.4 * size, 7,
                                    (0, 0, (1.2 + i * 0.9) * size), leaf, r_top=0.05))
    else:
        parts.append(C.ico(f"{name}_f", 1.15 * size, (0, 0, 2.4 * size), leaf, 1, jitter=0.18, seed=seed))
        if r.random() < 0.6:
            parts.append(C.ico(f"{name}_f2", 0.75 * size, (r.uniform(-.5, .5) * size, r.uniform(-.5, .5) * size, 3.1 * size),
                               leaf, 1, jitter=0.2, seed=seed + 1))
    o = C.join(parts, name)
    o.location = loc
    o.rotation_euler = (0, 0, r.uniform(0, 6.28))
    return o


def bird(name, color="#3a3d44"):
    m = C.mat(f"bird_{color}", color)
    body = C.ico(f"{name}", 0.12, (0, 0, 0), m, 1, scale=(0.7, 1.6, 0.7))
    wings = []
    for sx in (-1, 1):
        w = C.mesh_obj(f"{name}_w{sx}", [(0, -0.08, 0), (0, 0.1, 0), (0.42 * sx, 0.06, 0)], [(0, 1, 2)], m)
        w.parent = body
        wings.append(w)
    return body, wings


def flock(n, path, start, end, seed=0, spread=4.0, flap_period=8, color="#3a3d44"):
    """Birds flying along `path` [(x,y,z), ...] between frames start-end."""
    r = random.Random(seed)
    birds = []
    for i in range(n):
        b, wings = bird(f"bird{seed}_{i}", color)
        off = (r.uniform(-spread, spread), r.uniform(-spread, spread), r.uniform(-spread / 3, spread / 3))
        delay = r.uniform(0, 12)
        for k, p in enumerate(path):
            f = int(C.lerp(start, end, k / (len(path) - 1)) + delay)
            b.location = (p[0] + off[0], p[1] + off[1], p[2] + off[2])
            C.key(b, "location", f, interp='LINEAR')
        a = path[0]; z = path[-1]
        b.rotation_euler = (0, 0, math.atan2(z[1] - a[1], z[0] - a[0]) - math.pi / 2 + math.pi)
        ph = r.uniform(0, 6.28)
        for f in range(start, end + 20, 2):
            for sx, w in zip((-1, 1), wings):
                w.rotation_euler = (0, sx * 0.9 * math.sin(2 * math.pi * f / flap_period + ph), 0)
                C.key(w, "rotation_euler", f, interp='LINEAR')
        birds.append(b)
    return birds


def bench(name, loc=(0, 0, 0), heading=0):
    wood = C.mat("bench_wood", "#9a6b45"); metal = C.mat("pole", "#4a4e57", rough=0.6, metal=0.4)
    parts = [C.box(f"{name}_s", (1.8, 0.45, 0.06), (0, 0, 0.45), wood), C.box(f"{name}_b", (1.8, 0.06, 0.4), (0, 0.22, 0.7), wood)]
    for sx in (-0.8, 0.8):
        parts.append(C.box(f"{name}_l{sx}", (0.06, 0.4, 0.45), (sx, 0, 0), metal, origin='bottom'))
    o = C.join(parts, name); o.location = loc; o.rotation_euler = (0, 0, math.radians(heading))
    return o
