"""Camera + render helpers. Renders a shot to frames, then encodes one mp4 per shot
(1080x1920, 30 fps, H.264) with optional soft glow so emissive windows/lamps bloom."""
import math, os, shutil, subprocess, tempfile
import bpy
from mathutils import Vector

W, H, FPS = 1080, 1920, 30

# software-GL env so EEVEE/Workbench run headless without a GPU
os.environ.setdefault("EGL_PLATFORM", "surfaceless")
os.environ.setdefault("GALLIUM_DRIVER", "llvmpipe")
os.environ.setdefault("MESA_GL_VERSION_OVERRIDE", "4.5")


def setup(engine="EEVEE", res_pct=50, samples=4, frames=150):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = W, H
    sc.render.resolution_percentage = res_pct
    sc.render.fps = FPS
    sc.frame_start, sc.frame_end = 1, frames
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Medium High Contrast'
    if engine == "EEVEE":
        sc.render.engine = 'BLENDER_EEVEE'
        e = sc.eevee
        e.taa_render_samples = samples
        for a, v in (("use_raytracing", False), ("shadow_ray_count", 1), ("shadow_step_count", 2),
                     ("use_volumetric_shadows", False), ("use_shadows", True)):
            if hasattr(e, a):
                setattr(e, a, v)
    elif engine == "CYCLES":
        sc.render.engine = 'CYCLES'
        sc.cycles.samples = samples
        sc.cycles.use_denoising = True
        sc.cycles.max_bounces = 3
    else:
        sc.render.engine = 'BLENDER_WORKBENCH'
        d = sc.display
        d.shading.light = 'STUDIO'
        d.shading.color_type = 'MATERIAL'
        d.shading.show_shadows = True
        d.render_aa = '8'
    sc.render.image_settings.file_format = 'JPEG'
    sc.render.image_settings.quality = 92
    return sc


def camera(loc, target=(0, 0, 0), lens=35, name="Cam"):
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    cd.clip_start, cd.clip_end = 0.1, 3000
    cam = bpy.data.objects.new(name, cd)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = loc
    tgt = bpy.data.objects.new(name + "_Target", None)
    bpy.context.scene.collection.objects.link(tgt)
    tgt.location = target
    c = cam.constraints.new('TRACK_TO')
    c.target = tgt
    c.track_axis, c.up_axis = 'TRACK_NEGATIVE_Z', 'UP_Y'
    bpy.context.scene.camera = cam
    return cam, tgt


def move(ob, keys):
    """keys: [(frame, (x,y,z)), ...] — eased camera/target moves."""
    for f, p in keys:
        ob.location = p
        ob.keyframe_insert("location", frame=f)


def frame(frames_dir_or_path, f):
    sc = bpy.context.scene
    sc.frame_set(f)
    sc.render.filepath = frames_dir_or_path
    bpy.ops.render.render(write_still=True)


GLOW = ("split[a][b];[b]lutyuv=y='if(gt(val,205),val,16)':u=128:v=128,gblur=sigma=18[g];"
        "[a][g]blend=all_mode=screen:all_opacity=0.55")


def render_shot(out_mp4, glow=True, grade="", keep_frames=False):
    """Render the scene's frame range and encode to out_mp4 (atomic rename)."""
    sc = bpy.context.scene
    tmp = tempfile.mkdtemp(prefix="shot_", dir=os.path.dirname(os.path.abspath(out_mp4)))
    sc.render.filepath = os.path.join(tmp, "f_")
    bpy.ops.render.render(animation=True)
    vf = f"scale={W}:{H}:flags=lanczos"
    if glow:
        vf += "," + GLOW
    if grade:
        vf += "," + grade
    vf += ",format=yuv420p"
    part = out_mp4[:-4] + ".part.mp4"
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-start_number", str(sc.frame_start),
           "-i", os.path.join(tmp, "f_%04d.jpg"), "-filter_complex", vf, "-c:v", "libx264",
           "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(FPS), part]
    subprocess.run(cmd, check=True)
    os.replace(part, out_mp4)
    if not keep_frames:
        shutil.rmtree(tmp, ignore_errors=True)
    return out_mp4
