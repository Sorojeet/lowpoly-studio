"""Assemble Episode 1: shots -> concat -> sound design + narration -> captions -> final mp4.

    python3 build.py            # needs build/.../shots/*.mp4 (render_all.sh) and audio (tools/tts.py)
"""
import json, os, sys
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../.."))
sys.path.insert(0, ROOT)
from tools import sound as S, assemble as A

EP = os.path.join(ROOT, "build/last-human/ep01")
LEAD = 0.25
spec = json.load(open(os.path.join(HERE, "script.json")))
timing = json.load(open(os.path.join(EP, "audio/timing.json")))
ids = [s["id"] for s in spec["shots"]]

# shot start times (frame-exact, matches rendered lengths)
starts, t = {}, 0.0
for i in ids:
    starts[i] = t
    t += round(timing[i]["dur"] * 30) / 30
TOTAL = t
st = lambda shot, sec=0.0: starts[shot] + LEAD + sec   # seconds into narration of a shot

# ---------------------------------------------------------------- narration
voice = S.Track(TOTAL)
for i in ids:
    v, sr = sf.read(os.path.join(EP, f"audio/{i}.wav"), dtype="float32")
    if sr != S.SR:
        v = np.interp(np.arange(int(len(v) * S.SR / sr)) * sr / S.SR, np.arange(len(v)), v).astype(np.float32)
    voice.add(v, st(i), 1.0)

# ---------------------------------------------------------------- music (D minor)
music = S.Track(TOTAL)
D = [[50, 57, 62, 65], [46, 53, 58, 62], [53, 57, 60, 65], [48, 55, 60, 64]]   # Dm  Bb  F  C
music.add(S.pad(D * 3, 8.0, cutoff=800, gain=0.055), 0.0)
music.add(S.drone(38, TOTAL, gain=0.035), 0.0)
music.add(S.pulse(starts["s07_rooftop"] - starts["s05_power"], bpm=52, gain=0.16, start_gain=0.02), starts["s05_power"])
music.duck(voice, depth=0.5)
# the drop: silence the bed just before the light, then the hit
on = st("s08_light", 3.2)
fade_a, fade_b = int((on - 1.2) * S.SR), int((on - 0.05) * S.SR)
music.x[fade_a:fade_b] *= np.linspace(1, 0, fade_b - fade_a)
music.x[fade_b:] = 0
music.add(S.riser(1.4, 0.10), on - 1.4)
music.add(S.impact(4.0, 0.35), on)
music.add(S.bell(74, 5.0, 0.12), on + 0.05)
music.add(S.bell(81, 4.0, 0.07), on + 0.9)

# ---------------------------------------------------------------- sfx
fx = S.Track(TOTAL)
fx.add(S.wind(starts["s06_blackout"], 0.025), 0.0)
fx.add(S.birds(starts["s05_power"], density=0.9, gain=0.03), 0.0)
for sec in (3.6, 5.6, 6.6):                       # traffic light relays
    fx.add(S.click(0.18), st("s03_cars", sec))
for sec in (4.9, 6.25, 7.6):                      # "It rings. And rings. And rings."
    fx.add(S.ringback(1.1, 0.10), st("s04_walk", sec))
fx.add(S.hum(starts["s06_blackout"] - starts["s05_power"] + 0.2, 0.05), starts["s05_power"])
fx.add(S.power_down(1.8, 0.25, 160), st("s05_power", 7.0))
n6 = round(timing["s06_blackout"]["dur"] * 30)
f0 = 1 + round((2.3 + LEAD) * 30); step = (n6 - 25 - f0) / 6
for k in range(6):
    tk = starts["s06_blackout"] + (f0 + k * step) / 30 + 0.2
    fx.add(S.thunk(0.30 + 0.05 * k), tk)
    fx.add(S.power_down(1.2, 0.10, 120 + 15 * k), tk)
fx.add(S.wind(TOTAL - starts["s07_rooftop"], 0.035), starts["s07_rooftop"])
fx.add(S.crickets(TOTAL - starts["s07_rooftop"], 0.012), starts["s07_rooftop"])
fx.add(S.click(0.35), on)

mix = voice.mix(music, fx)
rms = lambda a: 20 * np.log10(np.sqrt(np.mean(a[a != 0] ** 2)) + 1e-9)
print("rms dB  voice %.1f  music %.1f  fx %.1f" % (rms(voice.x), rms(music.x), rms(fx.x)))
mix = mix[: int(TOTAL * S.SR)]
mix *= 0.75 / np.percentile(np.abs(voice.x[voice.x != 0]), 99.5)   # voice sets the level
mix = np.tanh(mix * 1.1) / np.tanh(1.1) * 0.95                           # soft-limit hits
fade = int(0.8 * S.SR); mix[-fade:] *= np.linspace(1, 0, fade)
wav = os.path.join(EP, "mix.wav")
sf.write(wav, mix, S.SR)

# ---------------------------------------------------------------- picture
if "--audio-only" in sys.argv:
    print("mix", wav, round(TOTAL, 2)); sys.exit()
shots = [os.path.join(EP, "shots", f"{i}.mp4") for i in ids]
clean = A.concat(shots, os.path.join(EP, "ep01_clean.mp4"))
events = [(st(i), timing[i]["voice"], s["line"]) for i, s in zip(ids, spec["shots"])]
ass = A.captions_ass(events, os.path.join(EP, "captions.ass"), badge="LAST HUMAN  ·  EP 1",
                     end_card=dict(spec["end_card"], secs=2.4), total=TOTAL)
os.makedirs(os.path.join(ROOT, "output"), exist_ok=True)
final = A.finish(clean, wav, os.path.join(ROOT, "output/last-human_ep01_day-1.mp4"), ass=ass, total=TOTAL)
A.finish(clean, wav, os.path.join(ROOT, "output/last-human_ep01_day-1_no-captions.mp4"))
print("final", final, round(TOTAL, 2), "s")
