"""Core helpers shared by every asset and episode.

Everything is built procedurally from code (seeded), so any asset can be
regenerated, re-coloured or re-used in a new episode with one import.
"""
import math, random
import bpy, bmesh
from mathutils import Vector, Euler

_MATS = {}


def reset(fps=30):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _MATS.clear()
    sc = bpy.context.scene
    sc.render.fps = fps
    sc.unit_settings.system = 'METRIC'
    return sc


# ---------------------------------------------------------------- materials
def mat(name, color, emission=0.0, rough=0.85, metal=0.0, emit_color=None):
    """Flat low-poly material. `color` is hex '#rrggbb' or rgb tuple 0-1.
    Emission strength can be keyframed later via set_emission()."""
    if name in _MATS:
        return _MATS[name]
    c = hex_rgb(color) if isinstance(color, str) else color
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*c, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    ec = hex_rgb(emit_color) if isinstance(emit_color, str) else (emit_color or c)
    b.inputs["Emission Color"].default_value = (*ec, 1)
    b.inputs["Emission Strength"].default_value = emission
    m.diffuse_color = (*c, 1)  # Workbench / viewport colour
    _MATS[name] = m
    return m


def set_emission(m, value, frame=None):
    s = m.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
    s.default_value = value
    if frame is not None:
        s.keyframe_insert("default_value", frame=frame)


def hex_rgb(h):
    h = h.lstrip('#')
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92 for c in srgb)


# ---------------------------------------------------------------- meshes
def mesh_obj(name, verts, faces, material=None, mats=None, face_mats=None, loc=(0, 0, 0)):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    for m in (mats or ([material] if material else [])):
        me.materials.append(m)
    if face_mats:
        for p, i in zip(me.polygons, face_mats):
            p.material_index = i
    ob.location = loc
    return ob


def box(name, size=(1, 1, 1), loc=(0, 0, 0), material=None, origin='center', taper=1.0, jitter=0.0, seed=0):
    """Axis-aligned box. origin: 'center' | 'bottom' | 'top'. taper scales the top face."""
    sx, sy, sz = (s / 2 for s in size)
    z0, z1 = {'center': (-sz, sz), 'bottom': (0, 2 * sz), 'top': (-2 * sz, 0)}[origin]
    r = random.Random(seed)
    j = lambda: r.uniform(-jitter, jitter)
    v = [(-sx, -sy, z0), (sx, -sy, z0), (sx, sy, z0), (-sx, sy, z0)]
    v += [(x * taper + j(), y * taper + j(), z1 + j()) for x, y, _ in v]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    return mesh_obj(name, v, f, material, loc=loc)


def cylinder(name, r=0.5, h=1, n=8, loc=(0, 0, 0), material=None, axis='Z', r_top=None, origin='bottom'):
    r_top = r if r_top is None else r_top
    z0 = 0 if origin == 'bottom' else -h / 2
    v = [(r * math.cos(a), r * math.sin(a), z0) for a in (2 * math.pi * i / n for i in range(n))]
    v += [(r_top * math.cos(a), r_top * math.sin(a), z0 + h) for a in (2 * math.pi * i / n for i in range(n))]
    f = [tuple(range(n))[::-1], tuple(range(n, 2 * n))]
    f += [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    ob = mesh_obj(name, v, f, material, loc=loc)
    if axis == 'X':
        ob.rotation_euler = (0, math.pi / 2, 0)
    elif axis == 'Y':
        ob.rotation_euler = (math.pi / 2, 0, 0)
    return ob


def ico(name, r=1, loc=(0, 0, 0), material=None, subdiv=1, jitter=0.0, scale=(1, 1, 1), seed=0):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=r)
    rnd = random.Random(seed)
    for v in bm.verts:
        v.co += Vector((rnd.uniform(-1, 1) for _ in range(3))) * jitter * r
        v.co = Vector((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2]))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if material:
        me.materials.append(material)
    ob.location = loc
    return ob


def empty(name, loc=(0, 0, 0), parent=None):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    e.location = loc
    if parent:
        e.parent = parent
    return e


def parent(child, par, keep=False):
    child.parent = par
    if keep:
        child.matrix_parent_inverse = par.matrix_world.inverted()
    return child


def join(objs, name):
    """Merge many static objects into one mesh (much faster to render)."""
    from mathutils import Matrix
    objs = [o for o in objs if o and o.type == 'MESH']
    if not objs:
        return None
    bpy.context.view_layer.update()
    for o in objs:  # bake transforms so the result sits at the world origin
        mw = o.matrix_world.copy()
        o.parent = None
        o.data.transform(mw)
        o.matrix_world = Matrix.Identity(4)
    ctx = bpy.context
    for o in ctx.selected_objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    ctx.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    objs[0].name = name
    return objs[0]


def collection(name):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(c)
    return c


# ---------------------------------------------------------------- animation
def key(ob, path, frame, value=None, interp='BEZIER'):
    if value is not None:
        setattr(ob, path, value)
    ob.keyframe_insert(path, frame=frame)
    ad = ob.animation_data
    if ad and ad.action:
        for fc in _fcurves(ad.action):
            if fc.data_path == path:
                for kp in fc.keyframe_points:
                    if abs(kp.co.x - frame) < 0.01:
                        kp.interpolation = interp


def _fcurves(action):
    if hasattr(action, "fcurves"):
        return action.fcurves
    out = []  # Blender 5 layered actions
    for layer in action.layers:
        for strip in layer.strips:
            for cb in strip.channelbags:
                out.extend(cb.fcurves)
    return out


def ease(t):
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    return a + (b - a) * t
