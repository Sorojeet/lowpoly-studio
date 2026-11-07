"""Narration with Kokoro (offline, ONNX).

Usage: python3 tools/tts.py series/last-human/ep01/script.json build/last-human/ep01
Writes one wav per shot plus timing.json: {shot_id: {"voice": secs, "dur": secs incl. pad}}.
Voices: am_michael (deep male), af_bella (warm female), see VOICES below.
Models are fetched by tools/fetch_models.sh into ~/.cache/lowpoly-studio/models.
"""
import json, os, sys
import numpy as np
import soundfile as sf

MODELS = os.path.expanduser("~/.cache/lowpoly-studio/models")
VOICES = {"michael": "am_michael", "bella": "af_bella"}


def load():
    from kokoro_onnx import Kokoro
    return Kokoro(f"{MODELS}/kokoro-v1.0.onnx", f"{MODELS}/voices-v1.0.bin")


def trim(x, thr=0.004, keep=0.05, sr=24000):
    idx = np.where(np.abs(x) > thr)[0]
    if not len(idx):
        return x
    a, b = max(0, idx[0] - int(keep * sr)), min(len(x), idx[-1] + int(keep * sr))
    return x[a:b]


def main(script_path, out_dir):
    spec = json.load(open(script_path))
    os.makedirs(out_dir, exist_ok=True)
    k = load()
    voice = VOICES.get(spec.get("voice"), spec.get("voice", "am_michael"))
    timing = {}
    for shot in spec["shots"]:
        samples, sr = k.create(shot["line"], voice=voice, speed=spec.get("speed", 1.0), lang="en-us")
        samples = trim(np.asarray(samples, dtype=np.float32), sr=sr)
        sf.write(f"{out_dir}/{shot['id']}.wav", samples, sr)
        v = len(samples) / sr
        timing[shot["id"]] = {"voice": round(v, 3), "dur": round(v + shot.get("pad", 0.4) + 0.25, 3)}
        print(shot["id"], timing[shot["id"]])
    json.dump(timing, open(f"{out_dir}/timing.json", "w"), indent=1)
    print("total", round(sum(t["dur"] for t in timing.values()), 2), "s")


if __name__ == "__main__":
    main(*sys.argv[1:3])
