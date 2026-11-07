"""Time-of-day presets: sun + gradient sky + ambient. Animate between them with
apply(preset, frame) at several frames."""
import math
import bpy
from .core import hex_rgb

PRESETS = {
    #           sun colour, sun strength, sun elev, sun azim, horizon, zenith, sky strength
    "dawn":      ("#ffb07a", 3.0, 12, 120, "#ffc29a", "#6f8fc9", 0.9),
    "morning":   ("#ffe2bf", 4.0, 28, 130, "#e6eef2", "#7ab0e0", 1.0),
    "day":       ("#fff3e0", 4.5, 55, 150, "#dff0f7", "#5d9fe0", 1.0),
    "afternoon": ("#ffe1b0", 4.0, 30, 230, "#f6e2c5", "#6aa2d8", 1.0),
    "dusk":      ("#ff7a4a", 2.6, 4, 250, "#ff9a6a", "#4a4f8f", 0.8),
    "night":     ("#9fb6ff", 0.6, 35, 200, "#24305a", "#070a18", 0.5),
    "blackout":  ("#8ea4f0", 0.9, 30, 160, "#1c2750", "#04060e", 0.55),
}


def setup_sky():
    w = bpy.data.worlds.new("Sky")
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    bg = nt.nodes.new("ShaderNodeBackground")
    out = nt.nodes.new("ShaderNodeOutputWorld")
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    nt.links.new(sep.outputs["Z"], ramp.inputs[0])
    nt.links.new(ramp.outputs[0], bg.inputs[0])
    nt.links.new(bg.outputs[0], out.inputs[0])
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[1].position = 0.45
    ramp.name, bg.name = "SkyRamp", "SkyBG"
    sun_data = bpy.data.lights.new("Sun", 'SUN')
    sun_data.angle = math.radians(2.5)
    sun = bpy.data.objects.new("Sun", sun_data)
    bpy.context.scene.collection.objects.link(sun)
    return sun


def apply(preset, frame=None):
    sc = bpy.context.scene
    sun = bpy.data.objects.get("Sun") or setup_sky()
    col, strength, elev, azim, hor, zen, sky = PRESETS[preset]
    sun.data.color = hex_rgb(col)
    sun.data.energy = strength
    sun.rotation_euler = (math.radians(90 - elev), 0, math.radians(azim))
    nt = sc.world.node_tree
    ramp = nt.nodes["SkyRamp"].color_ramp
    ramp.elements[0].color = (*hex_rgb(hor), 1)
    ramp.elements[1].color = (*hex_rgb(zen), 1)
    bg = nt.nodes["SkyBG"].inputs[1]
    bg.default_value = sky
    if frame is not None:
        sun.data.keyframe_insert("color", frame=frame)
        sun.data.keyframe_insert("energy", frame=frame)
        sun.keyframe_insert("rotation_euler", frame=frame)
        for e in ramp.elements:
            e.keyframe_insert("color", frame=frame)
        bg.keyframe_insert("default_value", frame=frame)
    return sun
