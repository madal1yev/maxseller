"""30s customer-shop ad mix: exact Скриптонит track + Uzbek VO + restrained SFX."""
import json
import os
import wave

import numpy as np

TEMP = os.environ.get('TEMP', '.')
WORK = os.path.join(TEMP, 'maxseller-shop-ad')
MUSIC = os.path.join(WORK, 'skriptonit-48k.wav')
MAP = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   '.tmp', 'shop-music-map.json')
OUT = os.path.join(WORK, 'final-audio.wav')

SR, DURATION, N = 48000, 30.0, 48000 * 30
rng = np.random.default_rng(24)
info = json.load(open(MAP, encoding='utf-8'))

# ------------------------------- music ------------------------------------
with wave.open(MUSIC, 'rb') as w:
    raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, w.getnchannels())
    assert w.getframerate() == SR
start = int(info['cutStart'] * SR)
music = raw[start:start + N].astype(np.float32) / 32768.0
if len(music) < N:
    music = np.pad(music, ((0, N - len(music)), (0, 0)))
fi, fo = int(0.35 * SR), int(1.20 * SR)
music[:fi] *= np.linspace(0, 1, fi, dtype=np.float32)[:, None]
music[-fo:] *= np.linspace(1, 0, fo, dtype=np.float32)[:, None]

# ------------------------------ voiceover ---------------------------------
VO_AT = {
    '01_question': 3.115,
    '02_what': 4.973,
    '03_browse': 8.665,
    '04_order': 12.357,
    '05_brand': 17.906,
    '06_visit': 21.598,
}
vo = np.zeros(N, dtype=np.float32)
for p in json.load(open(os.path.join(WORK, 'vo', 'phrases.json'), encoding='utf-8')):
    with wave.open(p['wav'], 'rb') as w:
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    pos = int(VO_AT[p['id']] * SR)
    end = min(N, pos + len(a))
    vo[pos:end] += a[:end - pos] * 1.45

# Music ducks under narration but stays clearly audible.
hop = 480
blocks = vo[:N // hop * hop].reshape(-1, hop)
env = np.abs(blocks).mean(axis=1)
env = np.convolve(env, np.ones(11, dtype=np.float32) / 11, mode='same')
env_up = np.repeat(env, hop)[:N]
duck = (1.0 - 0.55 * np.clip(env_up / 0.075, 0, 1)).astype(np.float32)
music *= duck[:, None]

# ---------------------------- sound design --------------------------------
sfx = np.zeros(N, dtype=np.float32)


def place(t, data, gain=1.0):
    pos = int(t * SR)
    if pos >= N:
        return
    end = min(N, pos + len(data))
    sfx[pos:end] += data[:end - pos] * gain


def impact(dur=0.75, freq=58):
    t = np.arange(int(dur * SR), dtype=np.float32) / SR
    body = np.sin(2 * np.pi * (freq - 14 * t / dur) * t) * np.exp(-t * 4.2)
    sub = np.sin(2 * np.pi * 32 * t) * np.exp(-t * 6)
    click = rng.normal(0, 1, len(t)).astype(np.float32) * np.exp(-t * 42)
    return (body * 0.8 + sub * 0.45 + click * 0.22).astype(np.float32)


def whoosh(dur=0.5):
    t = np.arange(int(dur * SR), dtype=np.float32) / SR
    noise = rng.normal(0, 1, len(t)).astype(np.float32)
    out = np.empty_like(noise)
    acc = 0.0
    for i, v in enumerate(noise):
        acc += 0.18 * (v - acc)
        out[i] = acc
    return (out * np.sin(np.pi * t / dur) ** 2 * 2.0).astype(np.float32)


def ui_click(dur=0.045):
    t = np.arange(int(dur * SR), dtype=np.float32) / SR
    return (np.sin(2 * np.pi * 1900 * t) * np.exp(-t * 130) * 0.7).astype(np.float32)


for t in [3.115, 6.830, 12.357, 17.906, 25.290, 29.400]:
    place(t, impact(), 0.30)
for t in [4.973, 8.665, 10.522, 14.214, 21.598]:
    place(t, whoosh(), 0.14)
for t in [6.83, 8.665, 10.522, 14.214, 19.741, 22.272]:
    place(t, ui_click(), 0.16)

# --------------------------------- mix ------------------------------------
vo_st = np.stack([vo, vo], axis=1)
sfx_st = np.stack([sfx, sfx], axis=1)
mix = music * 0.80 + vo_st * 1.05 + sfx_st
mix = np.tanh(mix * 1.12).astype(np.float32)
peak = float(np.abs(mix).max())
mix = (mix / peak * 0.94).astype(np.float32)
with wave.open(OUT, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print(f'{OUT} {os.path.getsize(OUT)/1024/1024:.2f} MB peak={peak:.3f} bpm={info["bpm"]} cut={info["cutStart"]}-{info["cutEnd"]}')
