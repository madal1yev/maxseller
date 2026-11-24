"""Analyze the exact EsDeeKid & Rico Ace track and build a beat map for the shop ad."""
import json
import os
import wave

import numpy as np

TEMP = os.environ.get('TEMP', '.')
SRC = os.path.join(TEMP, 'maxseller-shop-ad', 'phantom-48k.wav')
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   '.tmp', 'phantom-music-map.json')
DURATION_CUT = float(os.environ.get('CUT_SECONDS', '33.44'))

with wave.open(SRC, 'rb') as w:
    sr = w.getframerate()
    channels = w.getnchannels()
    raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, channels)
    duration = raw.shape[0] / sr

mono = raw.astype(np.float32).mean(axis=1) / 32768.0
AR = 22050
n = int(len(mono) * AR / sr)
x = np.interp(np.linspace(0, len(mono) - 1, n), np.arange(len(mono)), mono).astype(np.float32)

HOP, NFFT = 512, 1024
win = np.hanning(NFFT).astype(np.float32)
total = 1 + (len(x) - NFFT) // HOP
prev = None
parts = []
for begin in range(0, total, 4096):
    idx = np.arange(begin, min(begin + 4096, total))[:, None] * HOP + np.arange(NFFT)[None, :]
    spec = np.abs(np.fft.rfft(x[idx] * win, axis=1)).astype(np.float32)
    delta = np.diff(spec, axis=0)
    if prev is not None:
        delta = np.vstack([spec[0] - prev, delta])
    parts.append(np.maximum(0.0, delta).sum(axis=1))
    prev = spec[-1]
flux = np.concatenate(parts)
flux_t = (np.arange(len(flux)) * HOP + NFFT) / AR
flux_s = np.convolve(flux, np.ones(3, dtype=np.float32) / 3, mode='same')

env = flux_s - flux_s.mean()
env /= env.std() + 1e-9
corr = np.correlate(env, env, mode='full')[len(env) - 1:]
step = HOP / AR
lo, hi = int(70 / 160 / step), int(70 / 70 / step)
lag = lo + int(np.argmax(corr[lo:hi]))
bpm = 60.0 / (lag * step)

block = int(AR * 0.1)
blocks = x[:len(x) // block * block].reshape(-1, block)
rms = np.sqrt((blocks ** 2).mean(axis=1))
WIN = int(DURATION_CUT / 0.1)
cs = np.concatenate([[0.0], np.cumsum(rms)])
starts = np.arange(0, len(rms) - WIN)
score = (cs[starts + WIN] - cs[starts]) / WIN
score += 0.4 * np.array([rms[s:s + WIN].std() for s in starts])
cut = max(0.0, float(starts[int(np.argmax(score))] * 0.1 - 0.3))
cut_end = min(duration, cut + DURATION_CUT)

mask = (flux_t >= cut) & (flux_t <= cut_end)
peaks = []
for i in np.where(mask)[0]:
    if i == 0 or i == len(flux_s) - 1:
        continue
    if flux_s[i] >= flux_s[i - 1] and flux_s[i] > flux_s[i + 1]:
        t = float(flux_t[i] - cut)
        if not peaks or t - peaks[-1][0] > 0.14:
            peaks.append([round(t, 3), float(flux_s[i])])
        elif flux_s[i] > peaks[-1][1]:
            peaks[-1] = [round(t, 3), float(flux_s[i])]

strong = sorted(sorted(peaks, key=lambda p: p[1], reverse=True)[:18])
interval = 60.0 / bpm
anchor = min(strong, key=lambda p: abs(p[0] - 0.3))[0] if strong else 0.0
beats = []
t = anchor - interval * 3
while t < DURATION_CUT:
    if t >= 0:
        beats.append(round(t, 3))
    t += interval

result = {
    'source': 'EsDeeKid & Rico Ace - Phantom',
    'youtube': 'https://www.youtube.com/watch?v=hmdzniMJOZs',
    'sampleRate': sr,
    'duration': round(duration, 3),
    'bpm': round(bpm, 2),
    'beatInterval': round(interval, 4),
    'cutStart': round(cut, 3),
    'cutEnd': round(cut_end, 3),
    'strong': [[round(float(a), 3), round(float(b), 2)] for a, b in strong],
    'beats': beats,
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
print(json.dumps({k: result[k] for k in ('bpm', 'beatInterval', 'cutStart', 'cutEnd', 'strong', 'beats')},
                 ensure_ascii=False, indent=2))
