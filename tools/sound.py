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
