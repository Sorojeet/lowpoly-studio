# lowpoly-studio

Reusable, fully procedural pipeline for **low-poly 3D micro web-series** (vertical shorts).
Every asset is Python code (seeded), so characters, the city, props and sounds can be
regenerated, recoloured and reused in any episode.

```
studio/        core helpers (meshes, materials, keyframes), palette, lighting presets, render/encode
assets/        reusable models
  characters/survivor.py   rigged low-poly human + walk / look / phone / shout / sit
  city.py                  procedural city, window "rings" for blackout control, landmarks
  props.py                 cars, traffic lights, street lamps, trees, birds/flocks, benches
  power.py                 power plant, cooling towers, pylons, power lines, smoke
  sky.py                   stars, moon, clouds
  fonts/                   Poppins (OFL) for captions
tools/
  tts.py        Kokoro narration (offline) -> per-shot wavs + timing.json
  sound.py      procedural music & SFX (pads, drone, pulse, wind, birds, ringback, power-down, impact…)
  assemble.py   concat shots, ASS pop captions, final mux
  fetch_models.sh  downloads Kokoro voice models (~350 MB, not in git)
series/<name>/  BIBLE.md + one folder per episode (script.json, shots.py, build.py, render_all.sh)
```

## Make an episode
```bash
pip install bpy kokoro-onnx soundfile scipy      # Blender 5.x as a Python module
tools/fetch_models.sh
python3 tools/tts.py series/last-human/ep01/script.json build/last-human/ep01/audio
python3 series/last-human/ep01/shots.py s02_door --still 120     # preview a frame
series/last-human/ep01/render_all.sh                              # all shots
python3 series/last-human/ep01/build.py                           # -> output/*.mp4
```
Renders with EEVEE; on CPU-only machines it uses software GL (`RES=50` default, upscaled
to 1080×1920). On a GPU machine set `RES=100 SAMPLES=16` for full-quality frames.

## New episode checklist
1. Copy `series/last-human/ep01` → `ep02`, write `script.json` (one line per shot).
2. Run `tts.py` first — shot lengths come from narration timing.
3. Write shot functions reusing `world()`, `Survivor`, `props`, `City` landmarks.
4. Stills → fix → `render_all.sh` → `build.py`.

Voices: `michael` (am_michael), `bella` (af_bella).
