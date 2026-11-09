# lowpoly-studio

Reusable, fully procedural pipeline for **low-poly 3D micro web-series** (vertical shorts),
rendered with **three.js** in headless Chromium. Every asset is code (seeded), so characters,
the city, props and sounds regenerate identically and can be reused in any episode.

```
studio/        core.js (meshes, materials, join, seeded rng), anim.js (keyframes),
               lighting.js (time-of-day presets, sky dome, sun shadows), stage.js (renderer, camera)
assets/
  characters/survivor.js   Kai: joint rig + walk / look / phoneCall / shout / sit / poseStand
  city.js                  procedural city, window "rings" for blackout control, fixed landmarks
  props.js                 cars, traffic lights, street lamps, trees, birds/flocks, benches
  power.js                 power plant, cooling towers, pylons, power lines, smoke
  sky.js                   stars, moon, clouds
  palette.js               series colours
  fonts/                   Poppins (OFL) for captions
player.html    loads one shot; &ui=1 gives a scrub/play preview in any browser
tools/
  render.mjs    headless render: frames (resumable) -> one mp4 per shot with glow
  serve.mjs     static server for previews (npm run preview)
  tts.py        Kokoro narration (offline) -> per-shot wavs + timing.json
  sound.py      procedural music & SFX
  assemble.py   concat shots, pop captions, loudness-normalised mux (-14 LUFS)
  fetch_models.sh  Kokoro voice models (~350 MB, not in git)
series/<name>/  BIBLE.md + one folder per episode: script.json, shots.js, build.py
```

## Make an episode
```bash
npm install                                    # three.js
pip install kokoro-onnx soundfile scipy        # narration + audio
npx playwright install chromium                # if Chromium isn't already available
tools/fetch_models.sh

python3 tools/tts.py series/last-human/ep01/script.json build/last-human/ep01/audio   # 1. narration sets shot lengths
npm run preview      # 2. open player.html?ep=last-human/ep01&shot=s02_door&ui=1 and scrub
node tools/render.mjs last-human/ep01 s02_door --still 120   # 3. test frame
node tools/render.mjs last-human/ep01 all                    # 4. render every shot
python3 series/last-human/ep01/build.py                      # 5. music, SFX, captions -> output/*.mp4
```
Speed: ~1.5 s per 1080×1920 frame on a 2-core CPU (software WebGL); a 65 s episode renders
in about 50 minutes. On a machine with a GPU it is near real time.

## New episode checklist
1. Copy `series/last-human/ep01` → `ep02`, write `script.json` (one narration line per shot).
2. Run `tts.py` first — shot lengths come from narration timing.
3. Write shot functions in `shots.js` reusing `world()`, `Survivor`, `props`, `City` landmarks.
4. Preview / stills → fix → `render.mjs all` → `build.py`.

Voices: `michael` (am_michael), `bella` (af_bella).
The original Blender version of the library is preserved at git tag `blender-v1`.
