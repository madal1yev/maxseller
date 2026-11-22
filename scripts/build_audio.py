"""Build the final 25s commercial soundtrack: Worry cut + VO + designed SFX."""
import json
import os
import wave

import numpy as np

TEMP = os.environ.get('TEMP', '.')
WORK = os.path.join(TEMP, 'maxseller-commercial')
MUSIC = os.path.join(TEMP, 'maxseller-worry', 'worry.wav')
MAP = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.tmp', 'worry-map.json')
OUT = os.path.join(WORK, 'final-audio.wav')

SR = 48000
DURATION = 25.0
N = int(SR * DURATION)
rng = np.random.default_rng(42)

music_map = json.load(open(MAP, encoding='utf-8'))
start_s = music_map['cutStart']

# ------------------------------- music ----------------------------------
with wave.open(MUSIC, 'rb') as w:
    raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, w.getnchannels())
    m_sr = w.getframerate()
assert m_sr == SR
segment = raw[int(start_s * SR):int(start_s * SR) + N].astype(np.float32) / 32768.0
if segment.shape[0] < N:
    segment = np.pad(segment, ((0, N - segment.shape[0]), (0, 0)))
fade_in = int(0.30 * SR)
fade_out = int(0.90 * SR)
segment[:fade_in] *= np.linspace(0, 1, fade_in, dtype=np.float32)[:, None]
segment[-fade_out:] *= np.linspace(1, 0, fade_out, dtype=np.float32)[:, None]
music = segment.copy()

# ----------------------------- voiceover --------------------------------
vo_track = np.zeros(N, dtype=np.float32)
placed = json.load(open(os.path.join(WORK, 'vo', 'placed.json'), encoding='utf-8'))
for item in placed:
    with wave.open(item['wav'], 'rb') as w:
        audio = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    pos = int(item['start'] * SR)
    end = min(N, pos + len(audio))
    vo_track[pos:end] += audio[:end - pos] * 1.35

# Sidechain-style ducking driven by the voice envelope.
hop = 480
vo_blocks = vo_track[:N // hop * hop].reshape(-1, hop)
env = np.abs(vo_blocks).mean(axis=1)
env = np.convolve(env, np.ones(9, dtype=np.float32) / 9, mode='same')
env_up = np.repeat(env, hop)[:N]
duck = (1.0 - 0.62 * np.clip(env_up / 0.085, 0, 1)).astype(np.float32)
music *= duck[:, None]

# --------------------------- sound design --------------------------------
sfx = np.zeros(N, dtype=np.float32)


def place(t, data, gain=1.0):
    pos = int(t * SR)
    end = min(N, pos + len(data))
    if pos < N:
        sfx[pos:end] += data[:end - pos] * gain


def bass_impact(dur=0.9):
    t = np.arange(int(dur * SR), dtype=np.float32) / SR
    freq = 52 - 16 * (t / dur)
    body = np.sin(2 * np.pi * freq * t) * np.exp(-t * 3.6)
    sub = np.sin(2 * np.pi * 30 * t) * np.exp(-t * 5.0)
    grit = rng.normal(0, 1, len(t)).astype(np.float32) * np.exp(-t * 34)
    return (body * 0.75 + sub * 0.5 + grit * 0.35).astype(np.float32)


def cinematic_hit(dur=1.4):
    t = np.arange(int(dur * SR), dtype=np.float32) / SR
    f = 92 - 62 * (t / dur) ** 0.6
    body = np.sin(2 * np.pi * f * t) * np.exp(-t * 2.2)
    transient = rng.normal(0, 1, len(t)).astype(np.float32) * np.exp(-t * 18)
    return (body * 0.85 + transient * 0.45).astype(np.float32)


def whoosh(dur=0.55, reverse=False):
    t = np.arange(int(dur * SR), dtype=np.float32) / SR
    noise = rng.normal(0, 1, len(t)).astype(np.float32)
    # one-pole low-pass makes the noise feel airy instead of hissy
    filtered = np.empty_like(noise)
    acc = 0.0
    for i, value in enumerate(noise):
        acc += 0.16 * (value - acc)
        filtered[i] = acc
    shape = np.sin(np.pi * t / dur) ** 2
    if reverse:
        shape = np.exp((t - dur) * 6.0)
    return (filtered * shape * 2.2).astype(np.float32)


def click(dur=0.05):
    t = np.arange(int(dur * SR), dtype=np.float32) / SR
    return (np.sin(2 * np.pi * 2100 * t) * np.exp(-t * 120) * 0.8).astype(np.float32)


def notification(dur=0.35):
    t = np.arange(int(dur * SR), dtype=np.float32) / SR
    a = np.sin(2 * np.pi * 880 * t) * np.exp(-t * 9)
    b = np.sin(2 * np.pi * 1320 * np.maximum(t - 0.09, 0)) * np.exp(-np.maximum(t - 0.09, 0) * 10)
    return (a * 0.6 + b * 0.45).astype(np.float32)


for t in [1.165, 2.884, 4.625, 6.343, 11.521, 13.240, 14.981, 16.699]:
    place(t, bass_impact(), 0.34)
for t in [18.418, 20.159, 23.596]:
    place(t, cinematic_hit(), 0.42 if t != 18.418 else 0.55)
for t in [0.85, 2.55, 6.05, 11.15, 13.9, 15.7, 19.95]:
    place(t, whoosh(), 0.16)
place(17.55, whoosh(0.85, reverse=True), 0.20)
for t in [6.55, 7.42, 8.28, 9.14]:
    place(t, click(), 0.22)
place(10.55, notification(), 0.18)

# Atmospheric bed.
air = rng.normal(0, 1, N).astype(np.float32)
smooth = np.empty(N, dtype=np.float32)
acc = 0.0
for i, value in enumerate(air):
    acc += 0.0025 * (value - acc)
    smooth[i] = acc
sfx += smooth * 0.9

# -------------------------------- mix -----------------------------------
vo_stereo = np.stack([vo_track, vo_track], axis=1)
mixed = music * 0.82 + vo_stereo * 0.95 + np.stack([sfx, sfx], axis=1)
mixed = np.tanh(mixed * 1.15).astype(np.float32)
peak = np.abs(mixed).max()
mixed = (mixed / peak * 0.94).astype(np.float32)

pcm = (mixed * 32767).astype('<i2')
with wave.open(OUT, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())

print(f'{OUT}  {os.path.getsize(OUT) / 1024 / 1024:.2f} MB  peak={peak:.3f}  bpm={music_map["bpm"]}')
