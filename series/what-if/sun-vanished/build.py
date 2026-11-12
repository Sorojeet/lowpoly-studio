"""Assemble "What if the Sun disappeared?": shots -> concat -> music + SFX + narration -> captions -> mp4.

    python3 series/what-if/sun-vanished/build.py [--audio-only]
"""
import json, os, sys
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../.."))
sys.path.insert(0, ROOT)
from tools import sound as S, assemble as A

EP = os.path.join(ROOT, "build/what-if/sun-vanished")
NAME = "what-if_sun-disappeared"
LEAD = 0.25
spec = json.load(open(os.path.join(HERE, "script.json")))
timing = json.load(open(os.path.join(EP, "audio/timing.json")))
ids = [s["id"] for s in spec["shots"]]
starts, t = {}, 0.0
for i in ids:
    starts[i] = t
    t += round(timing[i]["dur"] * 30) / 30
TOTAL = t
st = lambda shot, sec=0.0: starts[shot] + LEAD + sec
dur = lambda a, b=None: (starts[b] if b else TOTAL) - starts[a]

# ---------------------------------------------------------------- narration
voice = S.Track(TOTAL)
for i in ids:
    v, sr = sf.read(os.path.join(EP, f"audio/{i}.wav"), dtype="float32")
    if sr != S.SR:
        v = np.interp(np.arange(int(len(v) * S.SR / sr)) * sr / S.SR, np.arange(len(v)), v).astype(np.float32)
    voice.add(v, st(i), 1.0)

# ---------------------------------------------------------------- music
music = S.Track(TOTAL)
dark = st("s02_dark", 5.45)                       # the switch
# 1. a bright, ordinary day (F major) -> cut dead at the switch
day = S.pad([[53, 60, 65, 69], [48, 55, 60, 64], [50, 57, 62, 65], [46, 53, 58, 62]] * 2, 5.0, cutoff=1400, gain=0.06)
day = day[: int(dark * S.SR)]
day[-int(0.08 * S.SR):] *= np.linspace(1, 0, int(0.08 * S.SR))
music.add(day, 0.0)
# 2. the dark: low drone + cold minor pad, heartbeat building through the freeze
music.add(S.drone(33, TOTAL - dark - 9, gain=0.05), dark + 0.4)
cold = [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 58], [40, 47, 52, 55]]   # Am F Gm Em
music.add(S.pad(cold * 3, 7.0, cutoff=650, gain=0.05)[: int((starts["s07_bunker"] - dark - 1.5) * S.SR)], dark + 1.5)
music.add(S.pulse(dur("s04_orbit", "s07_bunker"), bpm=46, gain=0.15, start_gain=0.03), starts["s04_orbit"])
# 3. survivors: warmth returns
music.add(S.pad([[50, 57, 62, 65], [53, 57, 60, 65], [46, 53, 58, 62], [48, 55, 60, 64]], 4.4, cutoff=1000, gain=0.055), starts["s07_bunker"] + 0.3)
for k, (m, tt) in enumerate([(74, 0.3), (77, 1.5), (81, 2.7)]):
    music.add(S.bell(m, 4.0, 0.07), st("s08_drift", tt))
# 4. sunrise: full major swell
rise = starts["s09_sunrise"]
music.add(S.pad([[53, 60, 65, 69, 72], [58, 62, 65, 70, 74], [53, 60, 65, 69, 77]], 3.4, cutoff=2200, gain=0.085), rise)
music.add(S.bell(77, 5.0, 0.10), rise + 0.2); music.add(S.bell(84, 5.0, 0.06), rise + 1.6); music.add(S.bell(81, 5.0, 0.06), rise + 3.0)
music.duck(voice, depth=0.5)

# ---------------------------------------------------------------- sfx
fx = S.Track(TOTAL)
fx.add(S.birds(dark - 0.2, density=1.6, gain=0.035)[: int(dark * S.SR)], 0.0)
fx.add(S.riser(1.2, 0.07), dark - 1.2)
fx.add(S.power_down(2.2, 0.32, 200), dark)
fx.add(S.impact(4.0, 0.42), dark)
for k in range(7):                                    # street lamps and windows clicking on
    fx.add(S.click(0.12), dark + 0.75 + k * 0.16)
fx.add(S.hum(1.8, 0.03), dark + 0.8)
moon = st("s03_moon", 0.9)
fx.add(S.power_down(1.4, 0.14, 120), moon)
fx.add(S.crickets(dur("s03_moon", "s04_orbit"), 0.008), starts["s03_moon"])
gone = st("s04_orbit", 1.0)
fx.add(S.riser(0.9, 0.06), gone - 0.9)
fx.add(S.impact(3.5, 0.34), gone)
fx.add(S.wind(dur("s05_week", "s07_bunker") + 0.5, 0.075), starts["s05_week"] - 0.2)
fx.add(S.thunk(0.22), starts["s06_year"] + 0.05)
fx.add(S.hum(dur("s07_bunker", "s08_drift"), 0.02, 50), starts["s07_bunker"])
fx.add(S.wind(dur("s08_drift", "s09_sunrise"), 0.02), starts["s08_drift"])
fx.add(S.birds(TOTAL - rise - 0.5, density=2.0, gain=0.04), rise + 0.4)
for s_ in ("s03_moon", "s05_week", "s06_year", "s07_bunker", "s08_drift"):   # soft whoosh on cuts
    fx.add(S.riser(0.35, 0.03), starts[s_] - 0.35)

mix = voice.mix(music, fx)
rms = lambda a: 20 * np.log10(np.sqrt(np.mean(a[a != 0] ** 2)) + 1e-9)
print("rms dB  voice %.1f  music %.1f  fx %.1f" % (rms(voice.x), rms(music.x), rms(fx.x)))
mix = mix[: int(TOTAL * S.SR)]
mix *= 0.75 / np.percentile(np.abs(voice.x[voice.x != 0]), 99.5)
mix = np.tanh(mix * 1.1) / np.tanh(1.1) * 0.95
fade = int(1.0 * S.SR); mix[-fade:] *= np.linspace(1, 0, fade)
wav = os.path.join(EP, "mix.wav")
sf.write(wav, mix, S.SR)
if "--audio-only" in sys.argv:
    print("mix", wav, round(TOTAL, 2)); sys.exit()

# ---------------------------------------------------------------- picture
shots = [os.path.join(EP, "shots", f"{i}.mp4") for i in ids]
clean = A.concat(shots, os.path.join(EP, "clean.mp4"))
events = [(st(i), timing[i]["voice"], s["line"]) for i, s in zip(ids, spec["shots"])]
lab = lambda shot, text, secs=2.2, off=0.1: (starts[shot] + off, starts[shot] + off + secs, text)
labels = [lab("s02_dark", "+ 8 MINUTES"), (dark + 0.1, dark + 1.7, "+ 8 MIN 20 SEC"), lab("s05_week", "+ 1 WEEK"), lab("s06_year", "+ 1 YEAR"), lab("s07_bunker", "+ 1,000 YEARS")]
ass = A.captions_ass(events, os.path.join(EP, "captions.ass"), badge="WHAT IF?", end_card=dict(spec["end_card"], secs=2.3),
                     total=TOTAL, accent="&H0030B8FF&", labels=labels)
os.makedirs(os.path.join(ROOT, "output"), exist_ok=True)
final = A.finish(clean, wav, os.path.join(ROOT, f"output/{NAME}.mp4"), ass=ass, total=TOTAL, fade_out=0.5)
print("final", final, round(TOTAL, 2), "s")
