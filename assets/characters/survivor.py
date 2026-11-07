"""KAI — the last human. Low-poly character with a simple joint hierarchy
(no armature needed) plus reusable motions: walk, look, phone call, shout, sit.

    from assets.characters.survivor import Survivor
    kai = Survivor("Kai", loc=(0, 0, 0), facing=0)      # facing in degrees, 0 = toward -Y
    kai.walk(path=[(0,0),(0,-10)], start=1, end=200)
    kai.look(frame=60, yaw=-40)

Every colour comes from studio.palette, so a second survivor (e.g. the person
behind the light in Ep 1) is just Survivor("Mira", hoodie="#4f7fd9", ...).
"""
import math
from studio import core as C, palette as P

FPS = 30


class Survivor:
    def __init__(self, name="Kai", loc=(0, 0, 0), facing=0, skin=P.SKIN[0], hoodie=P.HOODIE,
                 pants=P.JEANS, shoes=P.SHOES, hair=P.HAIR, bag=P.BAG, scale=1.0, backpack=True, hood_up=False):
        self.name = name
        m = lambda k, c, **kw: C.mat(f"{name}_{k}", c, **kw)
        ms, mh, mp, mo, mha, mb = m("skin", skin), m("hoodie", hoodie), m("pants", pants), m("shoes", shoes), m("hair", hair), m("bag", bag)
        eye = m("eye", "#151518", rough=0.3)
        j = self.j = {}
        root = j["root"] = C.empty(name, loc)
        root.rotation_euler = (0, 0, math.radians(facing))
        root.scale = (scale,) * 3
        hips = j["hips"] = C.empty(f"{name}_hips", (0, 0, 0.95), root)
        C.parent(C.box(f"{name}_pelvis", (0.36, 0.22, 0.2), (0, 0, 0.02), mp), hips)
        spine = j["spine"] = C.empty(f"{name}_spine", (0, 0, 0.08), hips)
        C.parent(C.box(f"{name}_torso", (0.44, 0.26, 0.56), (0, 0, 0), mh, origin='bottom', taper=0.92), spine)
        C.parent(C.box(f"{name}_hood", (0.34, 0.12, 0.12), (0, 0.12, 0.55), mh, taper=0.8), spine)
        if backpack:
            C.parent(C.box(f"{name}_bag", (0.38, 0.2, 0.44), (0, 0.22, 0.24), mb, origin='bottom', taper=0.95), spine)
        head = j["head"] = C.empty(f"{name}_head", (0, 0, 0.6), spine)
        C.parent(C.box(f"{name}_neck", (0.12, 0.12, 0.08), (0, 0, 0), ms, origin='bottom'), head)
        C.parent(C.ico(f"{name}_skull", 0.14, (0, 0, 0.17), ms, subdiv=1, scale=(1, 1.05, 1.15), seed=3), head)
        C.parent(C.ico(f"{name}_hair", 0.15, (0, 0.025, 0.22), m("hair", hair) if not hood_up else mh,
                       subdiv=1, scale=(1.02, 1.05, 0.8), jitter=0.06, seed=5), head)
        for sx in (-1, 1):
            C.parent(C.box(f"{name}_eye{sx}", (0.03, 0.01, 0.04), (0.05 * sx, -0.145, 0.18), eye), head)
        C.parent(C.box(f"{name}_nose", (0.04, 0.04, 0.05), (0, -0.155, 0.14), ms, taper=0.6), head)
        for side, sx in (("L", 1), ("R", -1)):
            sh = j[f"shoulder{side}"] = C.empty(f"{name}_shoulder{side}", (0.27 * sx, 0, 0.5), spine)
            C.parent(C.box(f"{name}_uarm{side}", (0.12, 0.13, 0.3), (0, 0, 0), mh, origin='top'), sh)
            el = j[f"elbow{side}"] = C.empty(f"{name}_elbow{side}", (0, 0, -0.29), sh)
            C.parent(C.box(f"{name}_farm{side}", (0.11, 0.12, 0.27), (0, 0, 0), mh, origin='top', taper=0.9), el)
            hand = j[f"hand{side}"] = C.empty(f"{name}_hand{side}", (0, 0, -0.29), el)
            C.parent(C.ico(f"{name}_handm{side}", 0.06, (0, 0, -0.02), ms, subdiv=1, scale=(0.9, 1, 1.2)), hand)
            hp = j[f"hip{side}"] = C.empty(f"{name}_hip{side}", (0.1 * sx, 0, 0), hips)
            C.parent(C.box(f"{name}_thigh{side}", (0.16, 0.18, 0.46), (0, 0, 0), mp, origin='top', taper=0.95), hp)
            kn = j[f"knee{side}"] = C.empty(f"{name}_knee{side}", (0, 0, -0.45), hp)
            C.parent(C.box(f"{name}_shin{side}", (0.14, 0.15, 0.42), (0, 0, 0), mp, origin='top', taper=0.9), kn)
            ft = j[f"foot{side}"] = C.empty(f"{name}_foot{side}", (0, 0, -0.42), kn)
            C.parent(C.box(f"{name}_shoe{side}", (0.14, 0.27, 0.09), (0, -0.05, -0.04), mo), ft)
        # phone (hidden until used)
        ph = j["phone"] = C.box(f"{name}_phone", (0.08, 0.015, 0.15), (0, -0.05, -0.06),
                                C.mat("phone", "#111216", emission=0.0, emit_color="#9fd3ff"))
        C.parent(ph, j["handR"])
        ph.scale = (0.001,) * 3
        self.rest()

    # ------------------------------------------------------------ helpers
    def rot(self, joint, frame, x=0, y=0, z=0, interp='BEZIER'):
        ob = self.j[joint]
        ob.rotation_euler = (math.radians(x), math.radians(y), math.radians(z))
        C.key(ob, "rotation_euler", frame, interp=interp)

    def rest(self):
        for k in ("shoulderL", "shoulderR"):
            self.j[k].rotation_euler = (0, 0, math.radians(-6 if k.endswith("L") else 6))
        for k in ("elbowL", "elbowR"):
            self.j[k].rotation_euler = (math.radians(-10), 0, 0)

    def place(self, frame, x, y, facing=None, z=0.0):
        r = self.j["root"]
        r.location = (x, y, z)
        C.key(r, "location", frame, interp='LINEAR')
        if facing is not None:
            r.rotation_euler = (0, 0, math.radians(facing))
            C.key(r, "rotation_euler", frame)

    # ------------------------------------------------------------ motions
    def pose_stand(self, frame):
        for s, sx in (("L", 1), ("R", -1)):
            self.rot(f"hip{s}", frame); self.rot(f"knee{s}", frame); self.rot(f"foot{s}", frame)
            self.rot(f"shoulder{s}", frame, z=-6 * sx); self.rot(f"elbow{s}", frame, x=-10)
        self.rot("spine", frame); self.rot("head", frame)
        h = self.j["hips"]; h.location.z = 0.95; C.key(h, "location", frame)

    def walk(self, path, start, end, stride=0.72, step_frames=None, z=0.0, face_path=True, arm_swing=28):
        """Walk along a polyline [(x,y),...] from frame start to end.
        Stride length sets cadence so feet don't slide."""
        segs, total = [], 0.0
        for a, b in zip(path, path[1:]):
            d = math.dist(a, b); segs.append((a, b, d, total)); total += d
        frames = end - start
        steps = max(1.0, total / stride)
        cycle = frames / steps * 2  # frames per full gait cycle (two steps)
        for f in range(start, end + 1, 2):
            t = (f - start) / frames
            s = t * total
            for a, b, d, s0 in segs:
                if s <= s0 + d or (a, b) == segs[-1][:2]:
                    u = 0 if d == 0 else min(1, (s - s0) / d)
                    x, y = C.lerp(a[0], b[0], u), C.lerp(a[1], b[1], u)
                    ang = math.degrees(math.atan2(b[1] - a[1], b[0] - a[0])) + 90 if face_path else None
                    break
            self.place(f, x, y, ang, z)
            ph = 2 * math.pi * (f - start) / cycle
            for s_, sign in (("L", 1), ("R", -1)):
                sw = math.sin(ph) * sign
                self.rot(f"hip{s_}", f, x=-26 * sw, interp='LINEAR')
                self.rot(f"knee{s_}", f, x=6 + 40 * max(0.0, math.cos(ph) * sign), interp='LINEAR')
                self.rot(f"foot{s_}", f, x=-8 * sw, interp='LINEAR')
                self.rot(f"shoulder{s_}", f, x=arm_swing * sw, z=-6 * sign, interp='LINEAR')
                self.rot(f"elbow{s_}", f, x=-18 - 10 * max(0, -sw), interp='LINEAR')
            h = self.j["hips"]; h.location.z = 0.95 + 0.03 * abs(math.cos(ph)); C.key(h, "location", f, interp='LINEAR')
            self.rot("spine", f, x=-3, z=4 * math.sin(ph), interp='LINEAR')

    def look(self, frame, yaw=0, pitch=0, dur=12):
        """Turn head (yaw +left) over `dur` frames, keeping previous pose until then."""
        h = self.j["head"]
        C.key(h, "rotation_euler", frame)
        self.rot("head", frame + dur, x=pitch, z=yaw)

    def phone_call(self, frame, dur=15):
        sh, el = "shoulderR", "elbowR"
        C.key(self.j[sh], "rotation_euler", frame); C.key(self.j[el], "rotation_euler", frame)
        ph = self.j["phone"]; ph.scale = (0.001,) * 3; C.key(ph, "scale", frame)
        self.rot(sh, frame + dur, x=-35, z=25)
        self.rot(el, frame + dur, x=-140)
        ph.scale = (1, 1, 1); C.key(ph, "scale", frame + 4)
        C.set_emission(ph.data.materials[0], 0.0, frame)
        C.set_emission(ph.data.materials[0], 3.0, frame + 4)

    def shout(self, frame, dur=10):
        for s, sx in (("L", 1), ("R", -1)):
            C.key(self.j[f"shoulder{s}"], "rotation_euler", frame)
            self.rot(f"shoulder{s}", frame + dur, x=-60, z=-35 * sx)
            self.rot(f"elbow{s}", frame + dur, x=-60)
        C.key(self.j["head"], "rotation_euler", frame)
        self.rot("head", frame + dur, x=-18)

    def sit(self, frame, ledge_h=0.0):
        """Seated on a ledge edge, legs dangling over (+ forward)."""
        h = self.j["hips"]; h.location.z = 0.12 + ledge_h; C.key(h, "location", frame)
        for s, sx in (("L", 1), ("R", -1)):
            self.rot(f"hip{s}", frame, x=-88, z=-4 * sx)
            self.rot(f"knee{s}", frame, x=80 + 6 * sx)
            self.rot(f"shoulder{s}", frame, x=-30, z=-12 * sx)
            self.rot(f"elbow{s}", frame, x=-40)
        self.rot("spine", frame, x=8)
