"""Procedural music + SFX (numpy). Royalty-free by construction; every sound
is a function of parameters, so episodes stay sonically consistent.

All functions return float32 mono arrays at SR. Use Track to place them.
"""
import numpy as np

SR = 48000
rng = np.random.default_rng(0)


def t_(sec):
    return np.arange(int(sec * SR)) / SR


def note(n):
    """MIDI note -> Hz."""
    return 440.0 * 2 ** ((n - 69) / 12)


def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x); acc = 0.0
    # vectorised-ish one-pole via lfilter equivalent
    try:
        from scipy.signal import lfilter
        return lfilter([1 - a], [1, -a], x).astype(np.float32)
    except ImportError:
        for i, v in enumerate(x):
            acc = (1 - a) * v + a * acc; y[i] = acc
        return y


def highpass(x, cutoff):
    return (x - lowpass(x, cutoff)).astype(np.float32)


def env(n, a=0.01, r=0.2, sus=None):
    e = np.ones(n, np.float32)
    na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e


def saw(f, sec, detune=0.0):
    t = t_(sec)
    return (2 * ((t * f * (1 + detune)) % 1) - 1).astype(np.float32)


def sine(f, sec, phase=0.0):
    return np.sin(2 * np.pi * f * t_(sec) + phase).astype(np.float32)


def pink(sec):
    n = int(sec * SR)
    w = rng.standard_normal(n).astype(np.float32)
    return lowpass(w, 900) * 2.5 + lowpass(w, 150) * 4


# ------------------------------------------------------------------ music
def pad(chords, chord_sec, cutoff=900, gain=0.18):
    """chords: list of MIDI note lists. Warm detuned-saw pad with long fades."""
    out = []
    for ch in chords:
        seg = np.zeros(int(chord_sec * SR), np.float32)
        for n_ in ch:
            for d in (-0.004, 0.0, 0.005):
                seg += saw(note(n_), chord_sec, d) * 0.33
        seg = lowpass(seg, cutoff) * env(len(seg), a=chord_sec * 0.35, r=chord_sec * 0.45)
        out.append(seg)
    # overlap chords by 40% for smooth changes
    hop = int(chord_sec * SR * 0.6)
    total = np.zeros(hop * (len(out) - 1) + len(out[-1]), np.float32)
    for i, s in enumerate(out):
        total[i * hop:i * hop + len(s)] += s
    return total * gain / max(1e-6, np.abs(total).max())


def drone(midi, sec, gain=0.12):
    x = sine(note(midi), sec) + 0.4 * sine(note(midi + 12), sec) + 0.2 * saw(note(midi), sec, 0.002)
    x = lowpass(x, 300) * env(len(x), a=3, r=3)
    return x * gain / np.abs(x).max()


def pulse(sec, bpm=50, gain=0.35, start_gain=0.0):
    """Heartbeat-like sub kicks, fading in for tension."""
    x = np.zeros(int(sec * SR), np.float32)
    k = kick(0.5)
    period = 60 / bpm
    for i, s in enumerate(np.arange(0, sec - 0.5, period)):
        g = start_gain + (gain - start_gain) * s / sec
        for off in (0, 0.28):
            a = int((s + off) * SR); x[a:a + len(k)] += k[:len(x) - a] * g * (1 if off == 0 else 0.6)
    return x


def kick(sec=0.5):
    t = t_(sec)
    f = 45 + 70 * np.exp(-t * 30)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)).astype(np.float32)


def bell(midi, sec=4.0, gain=0.2):
    t = t_(sec)
    f = note(midi)
    x = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * d) for a, m, d in ((1, 1, 1.2), (0.5, 2.01, 2.0), (0.25, 3.98, 3.5)))
    return (x * gain).astype(np.float32)


# ------------------------------------------------------------------ sfx
def wind(sec, gain=0.08):
    x = pink(sec)
    lfo = 0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * t_(sec)) * np.sin(2 * np.pi * 0.037 * t_(sec) + 1)
    x = lowpass(highpass(x, 120), 1200) * lfo
    return x * gain / np.abs(x).max() * env(len(x), 1.0, 1.0)


def chirp(gain=0.06):
    sec = rng.uniform(0.06, 0.14)
    t = t_(sec)
    f0 = rng.uniform(2800, 4200); f1 = f0 * rng.uniform(1.2, 1.6)
    f = f0 + (f1 - f0) * (t / sec) ** 0.6
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / sec) * gain).astype(np.float32)


def birds(sec, density=1.2, gain=0.06):
    x = np.zeros(int(sec * SR), np.float32)
    s = 0.3
    while s < sec - 0.5:
        for k in range(rng.integers(1, 4)):
            c = chirp(gain * rng.uniform(0.5, 1))
            a = int((s + k * 0.12) * SR); x[a:a + len(c)] += c[:len(x) - a]
        s += rng.exponential(1 / density)
    return x


def crickets(sec, gain=0.02):
    t = t_(sec)
    x = np.sin(2 * np.pi * 4700 * t) * (np.sin(2 * np.pi * 30 * t) > 0.3) * (np.sin(2 * np.pi * 0.9 * t) > 0)
    return lowpass(x.astype(np.float32), 6000) * gain


def ringback(sec=1.6, gain=0.09):
    """'Double ring' phone tone heard through a handset (band-limited)."""
    t = t_(sec)
    x = np.sin(2 * np.pi * 400 * t) + np.sin(2 * np.pi * 450 * t)
    gate = ((t < 0.4) | ((t > 0.6) & (t < 1.0))).astype(np.float32)
    x = highpass(lowpass((x * gate).astype(np.float32), 3000), 300)
    return x * gain


def click(gain=0.25):
    t = t_(0.03)
    return (rng.standard_normal(len(t)) * np.exp(-t * 300) * gain).astype(np.float32)


def hum(sec, gain=0.05, f=60):
    x = sum(a * sine(f * h, sec) for a, h in ((1, 1), (0.5, 2), (0.3, 3), (0.2, 5)))
    return (x * gain / 2).astype(np.float32) * env(int(sec * SR), 0.5, 0.5)


def power_down(sec=1.6, gain=0.3, f0=180):
    t = t_(sec)
    f = f0 * np.exp(-t * 2.2) + 20
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(2 * np.pi * np.cumsum(f * 2.01) / SR)
    return (x * np.exp(-t * 1.6) * gain).astype(np.float32)


def thunk(gain=0.5):
    k = kick(0.8)
    n = lowpass(rng.standard_normal(len(k)).astype(np.float32), 400) * np.exp(-t_(0.8) * 12)
    return (k + n * 0.8) * gain


def impact(sec=4.0, gain=0.6):
    t = t_(sec)
    sub = np.sin(2 * np.pi * np.cumsum(35 + 40 * np.exp(-t * 4)) / SR) * np.exp(-t * 1.2)
    nz = lowpass(rng.standard_normal(len(t)).astype(np.float32), 900) * np.exp(-t * 3) * 0.4
    return ((sub + nz) * gain).astype(np.float32)


def riser(sec=2.0, gain=0.15):
    t = t_(sec)
    nz = rng.standard_normal(len(t)).astype(np.float32)
    x = highpass(nz, 800) * (t / sec) ** 2
    return x * gain


# ------------------------------------------------------------------ more sfx / score (What If pack)
def bandpass(x, lo, hi):
    return lowpass(highpass(x, lo), hi)


def tick(gain=0.2):
    """One clock tick."""
    t = t_(0.05)
    x = np.sin(2 * np.pi * 2100 * t) * np.exp(-t * 160) + 0.6 * rng.standard_normal(len(t)) * np.exp(-t * 420)
    return (x * gain).astype(np.float32)


def crowd(sec, gain=0.1, excite=0.0, seed=0):
    """Crowd bed: murmur (excite 0) up to cheering with whoops (excite 1)."""
    r = np.random.default_rng(seed + 5)
    t = t_(sec); x = np.zeros(len(t), np.float32)
    for lo, hi in ((250, 700), (600, 1500), (1200, 2600 + 1400 * excite)):
        n = bandpass(r.standard_normal(len(t)).astype(np.float32), lo, hi)
        am = 0.6 + 0.4 * np.sin(2 * np.pi * r.uniform(0.15, 0.5) * t + r.uniform(0, 6)) * np.sin(2 * np.pi * r.uniform(2.5, 5) * t + r.uniform(0, 6))
        x += n * am
    x /= np.abs(x).max()
    for _ in range(int(sec * 3.5 * excite)):                       # whoops and whistles
        d = r.uniform(0.25, 0.7); tt = t_(d); f0 = r.uniform(500, 1100)
        f = f0 * (1 + 0.6 * (tt / d) ** 0.7) * (1 + 0.02 * np.sin(2 * np.pi * 7 * tt))
        w = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / d) ** 2 * r.uniform(0.15, 0.4)
        a = int(r.uniform(0, max(0.01, sec - d)) * SR); x[a:a + len(w)] += w[:len(x) - a]
    return (x * gain * env(len(x), min(0.5, sec / 4), min(0.6, sec / 4))).astype(np.float32)


def shouts(sec, gain=0.05, density=1.0, seed=0):
    """Distant panicked shouting, far away and muffled."""
    r = np.random.default_rng(seed + 9)
    x = np.zeros(int(sec * SR), np.float32)
    for _ in range(max(1, int(sec * density))):
        d = r.uniform(0.5, 1.3); tt = t_(d); f0 = r.uniform(520, 900)
        f = f0 * (1 + 0.35 * np.sin(np.pi * tt / d)) * (1 + 0.03 * np.sin(2 * np.pi * 9 * tt))
        w = (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * np.sin(4 * np.pi * np.cumsum(f) / SR) + 0.25 * r.standard_normal(len(tt))) * np.sin(np.pi * tt / d) ** 1.5
        a = int(r.uniform(0, max(0.01, sec - d)) * SR); x[a:a + len(w)] += (w * r.uniform(0.3, 1))[:len(x) - a]
    x = lowpass(x, 1700)
    for dl, g in ((0.11, 0.5), (0.23, 0.3), (0.37, 0.18)):          # cheap echo = distance
        k = int(dl * SR); x[k:] += x[:-k] * g
    return (x / (np.abs(x).max() + 1e-9) * gain).astype(np.float32)


def siren(sec, gain=0.05, rate=0.35, lo=620, hi=980, phase=0.0):
    """Wailing emergency siren heard from a few streets away."""
    t = t_(sec)
    f = lo + (hi - lo) * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t + phase))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = lowpass((np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)).astype(np.float32), 1500)
    k = int(0.19 * SR); x[k:] += x[:-k] * 0.4
    return (x / np.abs(x).max() * gain * env(len(x), min(1.0, sec / 3), min(1.2, sec / 3))).astype(np.float32)


def strings(chords, chord_sec, gain=0.15, cutoff=2600):
    """Orchestral string section: bright detuned saws with octave doubling and slow tremolo."""
    out = []
    for ch in chords:
        seg = np.zeros(int(chord_sec * SR), np.float32)
        for n_ in list(ch) + [ch[-1] + 12, ch[0] - 12]:
            for d in (-0.006, -0.002, 0.003, 0.007):
                seg += saw(note(n_), chord_sec, d) * 0.25
        trem = 1 + 0.08 * np.sin(2 * np.pi * 5.5 * t_(chord_sec))
        out.append(lowpass(seg, cutoff) * trem * env(len(seg), a=chord_sec * 0.22, r=chord_sec * 0.35))
    hop = int(chord_sec * SR * 0.72)
    total = np.zeros(hop * (len(out) - 1) + len(out[-1]), np.float32)
    for i, sgm in enumerate(out):
        total[i * hop:i * hop + len(sgm)] += sgm
    return total * gain / max(1e-6, np.abs(total).max())


def taiko(gain=0.5, pitch=58):
    """Big war drum hit."""
    t = t_(1.1)
    f = pitch * (1 + 1.4 * np.exp(-t * 28))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5.5)
    skin = lowpass(rng.standard_normal(len(t)).astype(np.float32), 2200) * np.exp(-t * 45) * 0.7
    return ((body + skin) * gain).astype(np.float32)


def drums(sec, bpm=96, gain=0.4, pattern=(1, 0, 0, 0.5, 1, 0, 0.7, 0), build=True):
    """Looped taiko pattern (eighth notes); build=True swells from quiet to full."""
    x = np.zeros(int(sec * SR) + SR * 2, np.float32); step = 60 / bpm / 2; k = 0
    for s in np.arange(0, sec, step):
        v = pattern[k % len(pattern)]; k += 1
        if not v: continue
        h = taiko(gain * v * ((0.35 + 0.65 * s / sec) if build else 1), 52 if v >= 1 else 70)
        a = int(s * SR); x[a:a + len(h)] += h
    return x[:int(sec * SR) + SR]


def rumble(sec, gain=0.15):
    x = lowpass(rng.standard_normal(int(sec * SR)).astype(np.float32), 55)
    x *= 0.7 + 0.3 * np.sin(2 * np.pi * 0.23 * t_(sec))
    return (x / np.abs(x).max() * gain * env(len(x), min(1.5, sec / 3), min(1.5, sec / 3))).astype(np.float32)


def broadcast(sec, gain=0.06, seed=0):
    """TV news heard across a square: urgent sting + unintelligible announcer."""
    r = np.random.default_rng(seed + 3)
    t = t_(sec); x = np.zeros(len(t), np.float32)
    for i, s in enumerate(np.arange(0, min(sec, 1.3), 0.16)):       # sting
        b = sine(880 if i % 3 else 1320, 0.09) * env(int(0.09 * SR), 0.005, 0.03)
        a = int(s * SR); x[a:a + len(b)] += b[:len(x) - a] * 0.5
    f = 125 * (1 + 0.12 * np.sin(2 * np.pi * 0.7 * t) + 0.05 * np.sin(2 * np.pi * 2.3 * t))
    v = 2 * ((np.cumsum(f) / SR) % 1) - 1
    syl = np.clip(np.sin(2 * np.pi * 4.3 * t + 1.5 * np.sin(2 * np.pi * 0.9 * t)), 0, 1) ** 0.6
    form = bandpass(v.astype(np.float32), 500, 900) + 0.7 * bandpass(v.astype(np.float32), 1100, 2200)
    x += form / (np.abs(form).max() + 1e-9) * syl * 0.8
    return (bandpass(x, 400, 3200) * gain * env(len(x), 0.05, 0.3)).astype(np.float32)


def zap(gain=0.3):
    """A huge screen snapping on: electrical crack + mains thump."""
    t = t_(0.9)
    cr = highpass(rng.standard_normal(len(t)).astype(np.float32), 2500) * np.exp(-t * 14) * (1 + np.sign(np.sin(2 * np.pi * 37 * t))) * 0.5
    th = np.sin(2 * np.pi * 50 * t) * np.exp(-t * 6) + 0.5 * np.sin(2 * np.pi * 100 * t) * np.exp(-t * 9)
    return ((cr * 0.6 + th) * gain).astype(np.float32)


def klaxon(sec, gain=0.08, f=233):
    """Slow two-pulse state alarm."""
    t = t_(sec)
    x = lowpass(np.sign(np.sin(2 * np.pi * f * t)) * 0.6 + np.sign(np.sin(2 * np.pi * f * 1.5 * t)) * 0.4, 1400)
    gate = (np.sin(2 * np.pi * 1.1 * t) > -0.2).astype(np.float32)
    return (x * lowpass(gate, 30) * gain * env(len(x), 0.05, 0.4)).astype(np.float32)


def whoosh(sec=1.5, gain=0.2):
    t = t_(sec); u = t / sec
    x = bandpass(rng.standard_normal(len(t)).astype(np.float32), 200, 2500) * np.sin(np.pi * u) ** 2 * (0.4 + 0.6 * u)
    return (x / np.abs(x).max() * gain).astype(np.float32)


def heartbeat(sec, bpm=72, gain=0.4, accel=0.0):
    """Lub-dub heartbeat; accel > 0 speeds it up over the clip."""
    x = np.zeros(int(sec * SR) + SR, np.float32); k = kick(0.45); s = 0.0
    while s < sec - 0.4:
        for off, g in ((0, 1.0), (0.2, 0.65)):
            a = int((s + off) * SR); x[a:a + len(k)] += k * gain * g
        s += 60 / (bpm * (1 + accel * s / sec))
    return lowpass(x[:int(sec * SR)], 180) * 2.2


def beep(gain=0.05, f=1000, sec=0.12):
    return (sine(f, sec) * env(int(sec * SR), 0.005, 0.02) * gain).astype(np.float32)


# ------------------------------------------------------------------ Part 2 additions
def rotor(sec, gain=0.05, f=118, seed=0):
    """Drone / quadcopter whine with a little Doppler wobble."""
    r = np.random.default_rng(seed + 31); t = t_(sec)
    ff = f * (1 + 0.03 * np.sin(2 * np.pi * 0.4 * t + r.uniform(0, 6)))
    ph = 2 * np.pi * np.cumsum(ff) / SR
    x = np.sign(np.sin(ph)) * 0.4 + np.sin(2 * ph) * 0.3 + np.sin(4.02 * ph) * 0.2
    x = lowpass(x.astype(np.float32), 2400) + 0.25 * bandpass(rng.standard_normal(len(t)).astype(np.float32), 600, 3000)
    return (x / np.abs(x).max() * gain * env(len(x), min(0.8, sec / 3), min(0.8, sec / 3))).astype(np.float32)


def march(sec, bpm=104, gain=0.15):
    """Heavy synchronized boots."""
    x = np.zeros(int(sec * SR) + SR, np.float32); step = 60 / bpm
    for i, s in enumerate(np.arange(0, sec, step)):
        t = t_(0.25); h = (np.sin(2 * np.pi * 70 * t) * np.exp(-t * 30) + 0.7 * lowpass(rng.standard_normal(len(t)).astype(np.float32), 1500) * np.exp(-t * 40))
        a = int(s * SR); x[a:a + len(h)] += h * gain * (1 if i % 2 else 0.8)
    return x[:int(sec * SR)]


def flatline(sec, gain=0.05, f=980):
    return (sine(f, sec) * env(int(sec * SR), 0.01, 0.05) * gain).astype(np.float32)


def typing(sec, gain=0.06, rate=9, seed=0):
    r = np.random.default_rng(seed + 41); x = np.zeros(int(sec * SR), np.float32); s = 0.0
    while s < sec - 0.05:
        t = t_(0.02); c = highpass(r.standard_normal(len(t)).astype(np.float32), 1800) * np.exp(-t * 400)
        a = int(s * SR); x[a:a + len(c)] += c[:len(x) - a] * r.uniform(0.6, 1)
        s += r.exponential(1 / rate) + 0.03
    return x * gain


def hiss(sec=0.9, gain=0.12):
    """Pneumatic door."""
    t = t_(sec); u = t / sec
    x = highpass(rng.standard_normal(len(t)).astype(np.float32), 2500) * np.exp(-u * 3) + 0.4 * lowpass(rng.standard_normal(len(t)).astype(np.float32), 300) * np.sin(np.pi * u)
    return (x / np.abs(x).max() * gain).astype(np.float32)


def radio(x, lo=250, hi=4200, drive=1.6):
    """Broadcast / PA colour for a voice (keeps it intelligible)."""
    y = bandpass(x, lo, hi)
    y = np.tanh(y * drive / (np.abs(y).max() + 1e-9)) * (np.abs(x).max())
    return y.astype(np.float32)


def room(x, wet=0.18, delays=(0.031, 0.047, 0.071, 0.093)):
    """Small-room reflections, so a voice sits in its space."""
    y = x.copy()
    for i, d in enumerate(delays):
        k = int(d * SR); y[k:] += lowpass(x[:-k], 3000) * wet * (0.8 ** i)
    return y


# ------------------------------------------------------------------ track
class Track:
    def __init__(self, sec):
        self.x = np.zeros(int(sec * SR) + SR, np.float32)

    def add(self, sig, at, gain=1.0):
        a = int(at * SR)
        if a >= len(self.x):
            return
        n = min(len(sig), len(self.x) - a)
        self.x[a:a + n] += sig[:n] * gain

    def duck(self, key, depth=0.45, attack=0.08, release=0.5):
        """Lower this track where `key` (voice track) is active."""
        e = np.abs(key.x)
        e = lowpass(e, 6)
        e = np.clip(e / (e.max() + 1e-9) * 6, 0, 1)
        self.x *= (1 - depth * e)
        return self

    def mix(self, *others):
        out = self.x.copy()
        for o in others:
            out[:len(o.x)] += o.x[:len(out)]
        return out
