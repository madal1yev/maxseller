"""Clean 33.16 s music-only cut of EsDeeKid & Rico Ace - Phantom.

No voiceover, no sound effects — only the exact official track.
"""
import json
import os
import wave

import numpy as np

TEMP = os.environ.get('TEMP', '.')
WORK = os.path.join(TEMP, 'maxseller-shop-ad')
MUSIC = os.path.join(WORK, 'phantom-48k.wav')
MAP = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   '.tmp', 'phantom-music-map.json')
OUT = os.path.join(WORK, 'final-audio-phantom.wav')

SR = 48000
info = json.load(open(MAP, encoding='utf-8'))
N = int(info['cutEnd'] * SR) - int(info['cutStart'] * SR)

with wave.open(MUSIC, 'rb') as w:
    raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, w.getnchannels())
    assert w.getframerate() == SR
start = int(info['cutStart'] * SR)
audio = raw[start:start + N].astype(np.float32) / 32768.0
if len(audio) < N:
    audio = np.pad(audio, ((0, N - len(audio)), (0, 0)))

fi, fo = int(0.25 * SR), int(1.10 * SR)
audio[:fi] *= np.linspace(0, 1, fi, dtype=np.float32)[:, None]
audio[-fo:] *= np.linspace(1, 0, fo, dtype=np.float32)[:, None]
audio = np.tanh(audio * 1.08).astype(np.float32)
audio = (audio / np.abs(audio).max() * 0.94).astype(np.float32)

with wave.open(OUT, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((audio * 32767).astype('<i2').tobytes())
print(f'{OUT} {N/SR:.3f}s {os.path.getsize(OUT)/1024/1024:.2f} MB cut={info["cutStart"]}-{info["cutEnd"]}')
