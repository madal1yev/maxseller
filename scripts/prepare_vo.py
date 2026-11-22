"""Trim neural VO silences and place each phrase on the beat grid."""
import json
import os
import subprocess
import wave

TMP = os.path.join(os.environ.get('TEMP', '.'), 'maxseller-commercial', 'vo')

# Start times chosen against the 0.859 s beat grid of the Worry cut.
PLACEMENT = {
    '01_hook_a': 0.12,
    '02_hook_b': 1.90,
    '03_problem': 4.35,
    '04_orders': 6.55,
    '05_clients': 7.42,
    '06_sales': 8.28,
    '07_control': 9.14,
    '08_together': 10.55,
    '09_brand': 17.40,
    '10_cta': 20.05,
}

segments = json.load(open(os.path.join(TMP, 'segments.json'), encoding='utf-8'))
out = []
for seg in segments:
    src = seg['file']
    wav_path = os.path.join(TMP, seg['id'] + '.wav')
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error', '-i', src,
        '-af', 'silenceremove=start_periods=1:start_duration=0.02:start_threshold=-48dB:'
               'stop_periods=-1:stop_duration=0.22:stop_threshold=-48dB,aresample=48000',
        '-ac', '1', '-c:a', 'pcm_s16le', wav_path,
    ], check=True)
    with wave.open(wav_path, 'rb') as w:
        duration = w.getnframes() / w.getframerate()
    start = PLACEMENT[seg['id']]
    item = {**seg, 'wav': wav_path, 'speechDuration': round(duration, 3), 'start': start,
            'end': round(start + duration, 3)}
    out.append(item)
    print(f"{seg['id']:14s} start={start:5.2f}  speech={duration:4.2f}s  end={item['end']:5.2f}")

with open(os.path.join(TMP, 'placed.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
