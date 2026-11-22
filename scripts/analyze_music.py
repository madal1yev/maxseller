"""Analyze the licensed Worry track and output a beat map for the 25s commercial cut."""
import json
import os
import wave

import numpy as np

SRC = os.path.join(os.environ.get('TEMP', '.'), 'maxseller-worry', 'worry.wav')
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.tmp', 'worry-map.json')

with wave.open(SRC, 'rb') as w:
    sr = w.getframerate()
    channels = w.getnchannels()
    raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, channels)
    duration = raw.shape[0] / sr

mono = raw.astype(np.float32).mean(axis=1) / 32768.0

# Analysis rate 22050 Hz via linear interpolation.
AR = 22050
n = int(len(mono) * AR / sr)
x = np.interp(np.linspace(0, len(mono) - 1, n), np.arange(len(mono)), mono).astype(np.float32)

HOP = 512
NFFT = 1024
win = np.hanning(NFFT).astype(np.float32)
total_frames = 1 + (len(x) - NFFT) // HOP
previous = None
flux_parts = []
for begin in range(0, total_frames, 4096):
    idx = np.arange(begin, min(begin + 4096, total_frames))[:, None] * HOP + np.arange(NFFT)[None, :]
    spec = np.abs(np.fft.rfft(x[idx] * win, axis=1)).astype(np.float32)
    delta = np.diff(spec, axis=0)
    if previous is not None:
        delta = np.vstack([spec[0] - previous, delta])
    flux_parts.append(np.maximum(0.0, delta).sum(axis=1))
    previous = spec[-1]
flux = np.concatenate(flux_parts)
flux_t = (np.arange(len(flux)) * HOP + NFFT) / AR

# Light smoothing keeps musical onsets without sample noise.
kernel = np.ones(3, dtype=np.float32) / 3
flux_s = np.convolve(flux, kernel, mode='same')

# Tempo from autocorrelation of the onset envelope (60-180 BPM).
env = flux_s - flux_s.mean()
env = env / (env.std() + 1e-9)
corr = np.correlate(env, env, mode='full')[len(env) - 1:]
step = HOP / AR
lo, hi = int(60 / 180 / step), int(60 / 60 / step)
best_lag = lo + int(np.argmax(corr[lo:hi]))
bpm = 60.0 / (best_lag * step)

# Loudness envelope in 100 ms blocks.
block = int(AR * 0.1)
blocks = x[:len(x) // block * block].reshape(-1, block)
rms = np.sqrt((blocks ** 2).mean(axis=1))
rms_t = (np.arange(len(rms)) + 0.5) * 0.1

# Pick the most impactful 25 s window, preferring sections with dynamics.
WIN = 250
cs = np.concatenate([[0.0], np.cumsum(rms)])
starts = np.arange(0, len(rms) - WIN)
scores = (cs[starts + WIN] - cs[starts]) / WIN
variance = np.array([rms[s:s + WIN].std() for s in starts])
score = scores + 0.35 * variance
start_block = int(starts[int(np.argmax(score))])
start = max(0.0, start_block * 0.1 - 0.4)
end = min(duration, start + 25.0)

# Onset peaks inside the chosen window.
mask = (flux_t >= start) & (flux_t <= end)
peaks = []
for i in np.where(mask)[0]:
    if i == 0 or i == len(flux_s) - 1:
        continue
    if flux_s[i] >= flux_s[i - 1] and flux_s[i] > flux_s[i + 1]:
        t = float(flux_t[i] - start)
        if not peaks or t - peaks[-1][0] > 0.16:
            peaks.append([round(t, 3), float(flux_s[i])])
        elif flux_s[i] > peaks[-1][1]:
            peaks[-1] = [round(t, 3), float(flux_s[i])]

strong = sorted(peaks, key=lambda p: p[1], reverse=True)[:14]
strong = sorted(strong)

# Beat grid aligned to the strongest onset near the cut start.
beat_interval = 60.0 / bpm
anchor = min(strong, key=lambda p: abs(p[0] - 0.4))[0] if strong else 0.0
beats = []
t = anchor - beat_interval * 3
while t < 25.0:
    if t >= 0:
        beats.append(round(t, 3))
    t += beat_interval

result = {
    'source': 'worry (ultra slowed) - LONOWN',
    'youtube': 'https://youtu.be/lCKU-tI-upI',
    'sampleRate': sr,
    'duration': round(duration, 3),
    'bpm': round(bpm, 2),
    'beatInterval': round(beat_interval, 4),
    'cutStart': round(start, 3),
    'cutEnd': round(end, 3),
    'onsets': [[round(float(t - start), 3), float(v)] for t, v in zip(flux_t[mask], flux_s[mask])][::8],
    'peaks': [[round(float(t - start), 3), float(v)] for t, v in peaks],
    'strong': [[round(float(t), 3), round(float(v), 3)] for t, v in strong],
    'beats': beats,
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
print(json.dumps({k: result[k] for k in ('bpm', 'cutStart', 'cutEnd', 'strong', 'beats')}, ensure_ascii=False, indent=2))
