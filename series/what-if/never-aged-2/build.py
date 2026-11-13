"""Assemble Part 2: shots -> concat -> dialogue + narration (voice first) + quiet score + SFX -> captions -> final mp4.

    python3 tools/tts.py series/what-if/never-aged-2/script.json build/what-if/never-aged-2/audio
    node tools/render.mjs what-if/never-aged-2 all        (sh19_end is a black card made here)
    python3 series/what-if/never-aged-2/build.py [--audio-only]
Mix rule (after Part 1 feedback): music sits ~16 dB under the voices and ducks hard whenever anyone speaks.
"""
import json, os, subprocess, sys
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../.."))
sys.path.insert(0, ROOT)
from tools import sound as S, assemble as A

EP = os.path.join(ROOT, "build/what-if/never-aged-2")
spec = json.load(open(os.path.join(HERE, "script.json")))
timing = json.load(open(os.path.join(EP, "audio/timing.json")))
shots = spec["shots"]; ids = [s["id"] for s in shots]
starts, t = {}, 0.0
for s in shots:
    starts[s["id"]] = t; t += round(s["dur"] * 30) / 30
TOTAL = t
T = lambda shot, sec=0.0: starts[shot] + sec
scene = {}
for s in shots: scene.setdefault(s["scene"], starts[s["id"]])
SC = lambda k: scene[k]
cues = {c["id"]: c for c in spec["cues"]}
place = {cid: T(s["id"], at) for s in shots for cid, at in s.get("cues", [])}

def load(cid):
    v, sr = sf.read(os.path.join(EP, f"audio/{cid}.wav"), dtype="float32")
    if sr != S.SR: v = np.interp(np.arange(int(len(v) * S.SR / sr)) * sr / S.SR, np.arange(len(v)), v).astype(np.float32)
    return v

# ---------------------------------------------------------------- voices
voice = S.Track(TOTAL)
rms = lambda x: np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2)) + 1e-9
ref = rms(load("n01"))
for cid, at in place.items():
    v = load(cid)
    v *= ref / rms(v)                                         # every speaker at the same loudness
    if cid == "o01": v = S.room(S.radio(v, 180, 6000, 1.2), 0.12)   # broadcast mic
    if cid in ("p01",): v = S.room(v, 0.1, (0.05, 0.09, 0.13))       # outdoors, crowd around her
    if cid in ("s01", "d01"): v = S.room(v, 0.12)
    if cues[cid].get("fx") == "whisper": v *= 1.35
    voice.add(v, at)

# ---------------------------------------------------------------- score (kept low)
music = S.Track(TOTAL)
MIN = [[50, 57, 62, 65], [46, 53, 58, 62], [43, 50, 55, 58], [45, 52, 57, 61]]
music.add(S.drone(38, SC(3) + 1, gain=0.05), 0.0)
music.add(S.pad(MIN[:2], 6.0, cutoff=600, gain=0.05), 0.5)
music.add(S.pulse(SC(3) - SC(2), bpm=60, gain=0.09, start_gain=0.03), SC(2))
music.add(S.strings([[38, 45, 50, 53], [34, 41, 46, 50], [31, 38, 43, 46], [33, 40, 45, 49]], (SC(4) - SC(3)) / 3.2, gain=0.07, cutoff=1300), SC(3) - 0.2)
music.add(S.drums(SC(5) - SC(4), bpm=100, gain=0.13, build=True), SC(4))
music.add(S.drone(33, SC(6) - SC(5), gain=0.05), SC(5))
music.add(S.pulse(SC(6) - SC(5), bpm=72, gain=0.1, start_gain=0.02), SC(5))
music.add(S.riser(3.0, 0.035), T("sh12_monitor") - 0.5)
for k, m in enumerate((74, 70, 67)): music.add(S.bell(m, 3.5, 0.03), T("sh13_scientist", 0.2 + k * 1.6))
flat = T("sh14_patient", 4.2)
music.add(S.pad([[45, 52, 57, 60], [44, 51, 56, 59]], 3.0, cutoff=700, gain=0.05), SC(6) - 0.2)
music.add(S.pad([[38, 45, 50, 53], [37, 44, 49, 52]], 4.0, cutoff=500, gain=0.045), T("sh15_window", 3.6))   # returns softly under "invincibility"
music.add(S.drone(26, TOTAL - SC(7), gain=0.05), SC(7))
music.add(S.riser(2.5, 0.04), T("sh18_door", 2.3))
music.duck(voice, depth=0.8)
a, b = int((flat - 0.05) * S.SR), int(T("sh15_window", 3.6) * S.SR)        # music cuts out at the flatline
music.x[a:b] = 0
end = T("sh19_end")
music.x[int(end * S.SR):] = 0
music.add(S.impact(3.0, 0.22), end + 0.05)
music.x *= 0.6                                                            # overall: well under the voices

# ---------------------------------------------------------------- sfx
fx = S.Track(TOTAL)
fx.add(S.wind(SC(2), 0.035), 0); fx.add(S.klaxon(SC(2) - 0.5, 0.012), 0.2)
fx.add(S.siren(SC(2), 0.016, 0.3), 0.5); fx.add(S.siren(SC(2) - 3, 0.012, 0.45, 700, 1100, 2.0), 3)
fx.add(S.heartbeat(2.4, bpm=80, gain=0.1), 0.0)
fx.add(S.hum(T("sh04_screens") - SC(2), 0.012, 50), SC(2))
fx.add(S.broadcast(1.2, 0.04), SC(2)); fx.add(S.broadcast(1.0, 0.03, 2), T("sh04_screens"))
fx.add(S.crowd(SC(3) - T("sh04_screens"), 0.03, 0.0, 11), T("sh04_screens"))
fx.add(S.crowd(T("sh06_shelves") - SC(3), 0.012, 0.0, 12), SC(3))
fx.add(S.hum(3.0, 0.02, 100), T("sh06_shelves"))
fx.add(S.crowd(3.4, 0.025, 0.1, 13), T("sh07_queue"))
fx.add(S.shouts(3.3, 0.03, 1.5, 14), T("sh08_jobs")); fx.add(S.crowd(3.3, 0.03, 0.3, 15), T("sh08_jobs"))
fx.add(S.shouts(SC(5) - SC(4), 0.04, 1.6, 16), SC(4)); fx.add(S.crowd(SC(5) - SC(4), 0.05, 0.6, 17), SC(4))
fx.add(S.rotor(SC(5) - SC(4), 0.03, 118, 1), SC(4) + 0.3); fx.add(S.rotor(SC(5) - SC(4) - 1, 0.022, 131, 2), SC(4) + 1.2)
fx.add(S.march(T("sh10_police", 7.0) - T("sh10_police"), 104, 0.12), T("sh10_police"))
fx.add(S.siren(SC(5) - SC(4), 0.012, 0.5), SC(4))
fx.add(S.hum(SC(6) - SC(5), 0.012, 60), SC(5))
for q in np.arange(0.4, SC(6) - SC(5), 1.3): fx.add(S.beep(0.022, 1500, 0.06), SC(5) + q)
for k in range(6): fx.add(S.beep(0.03, 1200 if k % 2 else 900, 0.05), T("sh12_monitor", 0.55 + k * 0.38))
fx.add(S.beep(0.05, 520, 0.4), T("sh12_monitor", 2.25))                   # "CELL DAMAGE" alert
for q in np.arange(0.1, 4.15, 0.36): fx.add(S.beep(0.03, 1050), SC(6) + q)   # racing heart monitor
fx.add(S.flatline(T("sh15_window", 3.3) - flat, 0.035), flat)
fx.add(S.hum(TOTAL - SC(7), 0.012, 60), SC(7))
fx.add(S.typing(1.2, 0.05), T("sh16_file", 0.1)); fx.add(S.click(0.18), T("sh16_file", 0.5))
for k in range(4): fx.add(S.beep(0.03, 700, 0.08), T("sh16_file", 1.4 + k * 0.62))
fx.add(S.click(0.3), T("sh18_door", 0.7)); fx.add(S.beep(0.04, 1400, 0.1), T("sh18_door", 0.72))
fx.add(S.hiss(1.0, 0.09), T("sh18_door", 1.4)); fx.add(S.thunk(0.12), T("sh18_door", 2.4))
fx.x[int(end * S.SR):] = 0
fx.duck(voice, depth=0.35)

mix = voice.mix(music, fx)
db = lambda x: 20 * np.log10(rms(x))
print("rms dB  voice %.1f  music %.1f  fx %.1f" % (db(voice.x), db(music.x), db(fx.x)))
mix = mix[: int(TOTAL * S.SR)]
mix *= 0.8 / np.percentile(np.abs(voice.x[voice.x != 0]), 99.5)
mix = np.tanh(mix * 1.05) / np.tanh(1.05) * 0.95
wav = os.path.join(EP, "mix.wav"); sf.write(wav, mix, S.SR)
if "--audio-only" in sys.argv:
    print("mix", wav, round(TOTAL, 2)); sys.exit()

# ---------------------------------------------------------------- picture
SH = os.path.join(EP, "shots")
enc = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30"]
n_end = round(shots[-1]["dur"] * 30)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=black:s=1080x1920:r=30", "-frames:v", str(n_end), *enc, os.path.join(SH, "sh19_end.mp4")], check=True)
# broadcast look on the studio shot: grain, scan lines, little signal glitches
b_in, b_out = os.path.join(SH, "sh03_broadcast.mp4"), os.path.join(SH, "sh03_broadcast_tv.mp4")
vf = ("noise=alls=10:allf=t,"
      "drawgrid=w=0:h=6:t=2:c=black@0.18,"
      "rgbashift=rh=10:bh=-10:enable='lt(mod(t\\,1.9)\\,0.07)+between(t\\,0\\,0.12)',"
      "eq=saturation=1.08:contrast=1.04")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", b_in, "-vf", vf, *enc, b_out], check=True)
files = [b_out if i == "sh03_broadcast" else os.path.join(SH, f"{i}.mp4") for i in ids]
clean = A.concat(files, os.path.join(EP, "clean.mp4"))

YEL = "&H0040D8FF&"
events = []
for cid, at in sorted(place.items(), key=lambda kv: kv[1]):
    who = spec["speakers"].get(cid)
    events.append((at, timing["cues"][cid], cues[cid]["text"]) if not who else (at, timing["cues"][cid], cues[cid]["text"], YEL))
end_card = dict(spec["end_card"], secs=shots[-1]["dur"] - 0.2, size=84, y=900)
ass = A.captions_ass(events, os.path.join(EP, "captions.ass"), end_card=end_card, total=TOTAL, accent="&H00FFFFFF&")
ts = A._ts
b0, b1 = T("sh03_broadcast"), T("sh04_screens")
extra = [
    f"Dialogue: 3,{ts(b0 + 0.3)},{ts(b1)},LowerRed,,0,0,0,,{{\\pos(60,250)\\fad(200,0)}}EMERGENCY BROADCAST",
    f"Dialogue: 3,{ts(b0 + 0.5)},{ts(b1)},LowerSub,,0,0,0,,{{\\pos(60,338)\\fad(200,0)}}WORLD GOVERNMENT COUNCIL",
    f"Dialogue: 3,{ts(b0 + 0.3)},{ts(b1)},Live,,0,0,0,,{{\\pos(1020,130)}}● LIVE",
]
styles = """Style: LowerRed,Poppins,58,&H00FFFFFF,&H00FFFFFF,&H001C20C8,&H001C20C8,1,0,0,0,100,100,2,0,3,14,0,7,40,40,0,1
Style: LowerSub,Poppins,40,&H00FFFFFF,&H00FFFFFF,&H00301810,&H00301810,1,0,0,0,100,100,2,0,3,12,0,7,40,40,0,1
Style: Live,Poppins,40,&H002A2AFF,&H00FFFFFF,&H00101010,&H00000000,1,0,0,0,100,100,2,0,1,3,0,9,40,40,0,1
"""
txt = open(ass).read().replace("\n[Events]", styles + "\n[Events]")
open(ass, "w").write(txt + "\n".join(extra) + "\n")
nocap = A.captions_ass([], os.path.join(EP, "nocap.ass"), end_card=end_card, total=TOTAL, accent="&H00FFFFFF&")
nc = open(nocap).read()
open(nocap, "w").write(nc.replace("\n[Events]", styles + "\n[Events]") + "\n".join(extra) + "\n")
os.makedirs(os.path.join(ROOT, "output"), exist_ok=True)
final = A.finish(clean, wav, os.path.join(ROOT, "output/what-if_never-aged_part2.mp4"), ass=ass, total=TOTAL, crf=22, maxrate="9M")
A.finish(clean, wav, os.path.join(ROOT, "output/what-if_never-aged_part2_no-captions.mp4"), ass=nocap, total=TOTAL, crf=22, maxrate="9M")
print("final", final, round(TOTAL, 2), "s")
