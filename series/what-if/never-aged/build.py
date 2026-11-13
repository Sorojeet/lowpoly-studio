"""Assemble "What If Humans Never Aged Again?": shots -> concat -> narration + score + SFX -> captions -> final mp4.

    python3 tools/tts.py series/what-if/never-aged/script.json build/what-if/never-aged/audio
    node tools/render.mjs what-if/never-aged all        (s13_end is a black card made here)
    python3 series/what-if/never-aged/build.py [--audio-only]
"""
import json, os, subprocess, sys
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../.."))
sys.path.insert(0, ROOT)
from tools import sound as S, assemble as A

EP = os.path.join(ROOT, "build/what-if/never-aged")
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
dur = lambda a, b: starts[b] - starts[a]

# ---------------------------------------------------------------- narration
voice = S.Track(TOTAL)
for i, s in zip(ids, spec["shots"]):
    if not s.get("line"): continue
    v, sr = sf.read(os.path.join(EP, f"audio/{i}.wav"), dtype="float32")
    if sr != S.SR:
        v = np.interp(np.arange(int(len(v) * S.SR / sr)) * sr / S.SR, np.arange(len(v)), v).astype(np.float32)
    voice.add(v, st(i), 1.25 if s.get("fx") == "whisper" else 1.0)

# ---------------------------------------------------------------- score
music = S.Track(TOTAL)
T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13 = (starts[k] for k in ids[1:])
# 1 discovery: low drone, a shimmer as the wrinkles fade
music.add(S.drone(38, T3 + 0.6, gain=0.05), 0.0)
for k, m in enumerate((74, 78, 81, 86)): music.add(S.bell(m, 3.5, 0.045), st("s02_mirror", 3.1 + k * 0.55))
# 2 celebration: bright strings in D major + bells + light pulse
MAJ = [[50, 57, 62, 66], [57, 61, 64, 69], [47, 54, 59, 62], [55, 59, 62, 67]]
cel = T6 - T3
music.add(S.strings(MAJ + MAJ[:1], cel / 3.9, gain=0.11), T3 - 0.3)
for k, m in enumerate([74, 78, 81, 86, 81, 78, 73, 76, 81, 85, 81, 76, 71, 74, 78, 83, 78, 74, 71, 74, 79, 83, 86, 91]):
    if T3 + 0.2 + k * 0.42 < T6 - 0.6: music.add(S.bell(m, 1.6, 0.035), T3 + 0.2 + k * 0.42)
music.add(S.drums(cel - 0.5, bpm=112, gain=0.12, pattern=(1, 0, 0.5, 0, 1, 0.4, 0.5, 0), build=False), T3)
# 3-4 the turn: minor pad, then war drums building through the collapse
MIN = [[50, 57, 62, 65], [46, 53, 58, 62], [43, 50, 55, 58], [45, 52, 57, 61]]
music.add(S.riser(1.6, 0.05), T6 - 1.5); music.add(S.impact(4.5, 0.3), T6 + 0.05)
dark = T10 - T6
music.add(S.pad(MIN * 2, dark / 5.2, cutoff=750, gain=0.075), T6)
music.add(S.strings([[38, 45, 50, 53], [34, 41, 46, 50], [31, 38, 43, 46], [33, 40, 45, 49]], (T10 - T8) / 3.2, gain=0.06, cutoff=1100), T8)
music.add(S.drone(38, TOTAL - T6 - 6, gain=0.04), T6)
music.add(S.drums(T10 - T8, bpm=104, gain=0.36), T8)
music.add(S.rumble(T10 - T8 + 1, 0.12), T8 - 0.5)
music.add(S.taiko(0.55, 46), T10 - 0.02); 
# 5 rooftop: everything falls away to wind and one thin held note
music.add(S.pad([[50, 57, 62, 65], [46, 53, 58, 65]], (T11 - T10) / 1.6, cutoff=600, gain=0.04), T10 + 0.4)
for k, m in enumerate((74, 69, 65)): music.add(S.bell(m, 5, 0.04), st("s10_rooftop", 1.0 + k * 2.6))
music.duck(voice, depth=0.5)
a, b = int((T11 - 2.2) * S.SR), int(T11 * S.SR)           # fade the bed out before the screen
music.x[a:b] *= np.linspace(1, 0, b - a); music.x[b:] = 0
# 6 the screen
on = T11 + 23 / 30
music.add(S.impact(4.0, 0.3), on); music.add(S.zap(0.22), on - 0.02); music.add(S.drone(26, T13 - on, gain=0.04), on)
music.add(S.heartbeat(T13 - T12 + 0.3, bpm=78, gain=0.17, accel=0.35), T12 - 0.3)
music.x[int(T13 * S.SR):] = 0                              # sudden silence on the cut to black
music.add(S.impact(2.6, 0.16), T13 + 0.45)                 # "to be continued"

# ---------------------------------------------------------------- sfx
fx = S.Track(TOTAL)
fx.add(S.impact(3.5, 0.4), 0.12)                           # deep cinematic boom
fx.add(S.hum(T3, 0.012, 50), 0)
stop = st("s02_mirror", 6.4)
k = 0.1
while k < stop - 0.3:                                      # the clock ticks... and stops
    fx.add(S.tick(0.16 if k < stop - 2 else 0.22), k); k += 1.0
fx.add(S.thunk(0.3), stop); fx.add(S.power_down(1.4, 0.12, 140), stop)
fx.add(S.whoosh(2.2, 0.1), T3 - 0.4)
fx.add(S.crowd(T4 - T3 + 0.3, 0.12, 1.0, 1), T3)
fx.add(S.crowd(T5 - T4, 0.02, 0.6, 2), T4)                # party heard through the hospital wall
for q in np.arange(0.3, T5 - T4 - 0.2, 0.75): fx.add(S.beep(0.035, 1050), T4 + q)
fx.add(S.crowd(T6 - T5 + 0.2, 0.12, 1.0, 3), T5 - 0.1)
fx.add(S.broadcast(T6 - T5 - 0.2, 0.075), T5 + 0.1)
fx.add(S.whoosh(T7 - T6, 0.06), T6); fx.add(S.wind(T7 - T6 + 1, 0.03), T6)
for q in np.arange(0.2, T7 - T6 - 0.8, 0.3): fx.add(S.tick(0.05), T6 + q)       # years flying by
fx.add(S.crowd(T8 - T7 + 0.3, 0.085, 0.0, 4), T7)
fx.add(S.siren(T8 - T7, 0.022, 0.3), T7 + 0.3); fx.add(S.siren(T9 - T7 - 2, 0.016, 0.42, 700, 1100, 2.0), T7 + 2)
fx.add(S.crowd(T9 - T8 + 0.2, 0.05, 0.25, 5), T8)
fx.add(S.shouts(T9 - T8, 0.05, 1.3, 1), T8 + 0.2)
for q in (0.5, 1.7, 2.6, 3.9, 4.6): fx.add(S.thunk(0.16), T8 + q); 
fx.add(S.hum(T9 - T8, 0.02, 100), T8)
fx.add(S.crowd(T10 - T9 + 0.2, 0.1, 0.35, 6), T9)
fx.add(S.shouts(T10 - T9, 0.065, 1.6, 2), T9 + 0.1)
fx.add(S.siren(T10 - T9, 0.04, 0.55, 650, 1050), T9)
fx.add(S.wind(T12 - T10 + 0.5, 0.05), T10)
fx.add(S.crowd(T11 - T10, 0.012, 0.0, 7), T10 + 0.5)       # the city far below
fx.add(S.klaxon(T12 - on, 0.03), on + 0.3)
fx.add(S.wind(T13 - T12, 0.02), T12)
fx.x[int(T13 * S.SR):] = 0

mix = voice.mix(music, fx)
rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x[x != 0] ** 2)) + 1e-9)
print("rms dB  voice %.1f  music %.1f  fx %.1f" % (rms(voice.x), rms(music.x), rms(fx.x)))
mix = mix[: int(TOTAL * S.SR)]
mix *= 0.75 / np.percentile(np.abs(voice.x[voice.x != 0]), 99.5)
mix = np.tanh(mix * 1.1) / np.tanh(1.1) * 0.95
wav = os.path.join(EP, "mix.wav")
sf.write(wav, mix, S.SR)
if "--audio-only" in sys.argv:
    print("mix", wav, round(TOTAL, 2)); sys.exit()

# ---------------------------------------------------------------- picture
black = os.path.join(EP, "shots/s13_end.mp4")
n13 = round(timing["s13_end"]["dur"] * 30)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"color=c=black:s=1080x1920:r=30", "-frames:v", str(n13),
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", black], check=True)
clean = A.concat([os.path.join(EP, "shots", f"{i}.mp4") for i in ids], os.path.join(EP, "clean.mp4"))
events = [(st(i), timing[i]["voice"], s["line"]) for i, s in zip(ids, spec["shots"]) if s.get("line")]
end = dict(spec["end_card"], secs=timing["s13_end"]["dur"] - 0.35, size=84, y=930)
ass = A.captions_ass(events, os.path.join(EP, "captions.ass"), end_card=end, total=TOTAL, accent="&H00FFFFFF&")
ass2 = A.captions_ass([], os.path.join(EP, "endcard.ass"), end_card=end, total=TOTAL, accent="&H00FFFFFF&")
os.makedirs(os.path.join(ROOT, "output"), exist_ok=True)
final = A.finish(clean, wav, os.path.join(ROOT, "output/what-if_never-aged.mp4"), ass=ass, total=TOTAL, crf=22, maxrate="9M")
A.finish(clean, wav, os.path.join(ROOT, "output/what-if_never-aged_no-captions.mp4"), ass=ass2, total=TOTAL, crf=22, maxrate="9M")
print("final", final, round(TOTAL, 2), "s")
