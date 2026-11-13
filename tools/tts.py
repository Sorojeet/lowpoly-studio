"""Narration with Kokoro (offline, ONNX).

Usage: python3 tools/tts.py series/last-human/ep01/script.json build/last-human/ep01
(Multi-character videos: give "cues" instead of shot lines — see cues() below.)
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


def whisper(x, sr, mix=0.8):
    """Turn a spoken line into a breathy whisper (noise vocoder): "fx": "whisper" on a shot."""
    from scipy.signal import butter, sosfilt
    rng = np.random.default_rng(1)
    edges = np.geomspace(180, min(9000, sr / 2 - 500), 19)
    out = np.zeros_like(x)
    lp = butter(2, 40, "low", fs=sr, output="sos")
    for lo, hi in zip(edges[:-1], edges[1:]):
        bp = butter(3, [lo, hi], "band", fs=sr, output="sos")
        e = np.maximum(sosfilt(lp, np.abs(sosfilt(bp, x))), 0)
        out += sosfilt(bp, rng.standard_normal(len(x)).astype(np.float32)) * e * (1.0 + 1.5 * (lo > 1500))
    hp = sosfilt(butter(2, 900, "high", fs=sr, output="sos"), x)
    rms = lambda a: np.sqrt(np.mean(a ** 2) + 1e-12)
    out *= rms(x) / rms(out)
    y = mix * out + (1 - mix) * hp
    return (y * 0.9 * rms(x) / rms(y)).astype(np.float32)


def cues(spec, out_dir, k, only=None):
    """Multi-voice mode: "cues": [{"id", "voice", "text", "speed", "fx": "whisper", "mix": 0.55}].
    One wav per cue; timing.json gets {"cues": {id: secs}} and fixed shot lengths from "shots": [{"id", "dur"}]."""
    out = {"cues": {}}
    for c in spec["cues"]:
        v = VOICES.get(c.get("voice"), c.get("voice", spec.get("voice", "am_michael")))
        x, sr = k.create(c["text"], voice=v, speed=c.get("speed", spec.get("speed", 1.0)), lang=c.get("lang", "en-us"))
        x = trim(np.asarray(x, dtype=np.float32), sr=sr)
        if c.get("fx") == "whisper":
            x = whisper(x, sr, c.get("mix", 0.8))
        sf.write(f"{out_dir}/{c['id']}.wav", x, sr)
        out["cues"][c["id"]] = round(len(x) / sr, 3)
        print(c["id"], v, out["cues"][c["id"]], "s")
    for sh in spec.get("shots", []):
        out[sh["id"]] = {"voice": 0, "dur": float(sh["dur"]), "cues": sh.get("cues", [])}   # cues: [[cue_id, secs into shot]]
    json.dump(out, open(f"{out_dir}/timing.json", "w"), indent=1)


def main(script_path, out_dir):
    spec = json.load(open(script_path))
    os.makedirs(out_dir, exist_ok=True)
    k = load()
    if "cues" in spec:
        return cues(spec, out_dir, k)
    voice = VOICES.get(spec.get("voice"), spec.get("voice", "am_michael"))
    timing = {}
    for shot in spec["shots"]:
        if not shot.get("line"):                       # silent shot: fixed length, no narration
            timing[shot["id"]] = {"voice": 0, "dur": float(shot.get("dur", 2.0))}
            print(shot["id"], timing[shot["id"]]); continue
        samples, sr = k.create(shot["line"], voice=voice, speed=shot.get("speed", spec.get("speed", 1.0)), lang="en-us")
        samples = trim(np.asarray(samples, dtype=np.float32), sr=sr)
        if shot.get("fx") == "whisper":
            samples = whisper(samples, sr)
        sf.write(f"{out_dir}/{shot['id']}.wav", samples, sr)
        v = len(samples) / sr
        timing[shot["id"]] = {"voice": round(v, 3), "dur": round(v + shot.get("pad", 0.4) + 0.25, 3)}
        print(shot["id"], timing[shot["id"]])
    json.dump(timing, open(f"{out_dir}/timing.json", "w"), indent=1)
    print("total", round(sum(t["dur"] for t in timing.values()), 2), "s")


if __name__ == "__main__":
    main(*sys.argv[1:3])
