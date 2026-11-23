"""Generate Uzbek voiceover phrases for the customer-shop commercial."""
import asyncio
import json
import os
import subprocess

import edge_tts

TEMP = os.environ.get('TEMP', '.')
OUT = os.path.join(TEMP, 'maxseller-shop-ad', 'vo')
os.makedirs(OUT, exist_ok=True)
VOICE = 'uz-UZ-SardorNeural'

PHRASES = [
    ('01_question', 'Kerakli mahsulotni izlayapsizmi?'),
    ('02_what', 'MAXSELLER bilan onlayn xarid qilish yanada qulay!'),
    ('03_browse', "Mahsulotlarni ko‘ring, tanlang va savatingizga qo‘shing."),
    ('04_order', 'Buyurtmangizni bir necha oddiy qadamda rasmiylashtiring.'),
    ('05_brand', 'MAXSELLER — onlayn xaridingiz uchun qulay manzil!'),
    ('06_visit', 'Hoziroq tashrif buyuring: maxseller.vercel.app'),
]


async def main():
    info = []
    for name, text in PHRASES:
        raw = os.path.join(OUT, name + '.mp3')
        clean = os.path.join(OUT, name + '.wav')
        await edge_tts.Communicate(text, VOICE, rate='+12%', pitch='-2Hz', volume='+12%').save(raw)
        subprocess.run([
            'ffmpeg', '-y', '-loglevel', 'error', '-i', raw,
            '-af', 'silenceremove=start_periods=1:start_duration=0.02:start_threshold=-48dB:'
                   'stop_periods=-1:stop_duration=0.18:stop_threshold=-48dB,aresample=48000',
            '-ac', '1', '-c:a', 'pcm_s16le', clean,
        ], check=True)
        probe = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
             '-of', 'default=nw=1:nk=1', clean], capture_output=True, text=True, check=True)
        duration = float(probe.stdout.strip())
        info.append({'id': name, 'text': text, 'wav': clean, 'duration': round(duration, 3)})
        print(f'{name:14s} {duration:5.2f}s  {text}')
    with open(os.path.join(OUT, 'phrases.json'), 'w', encoding='utf-8') as f:
        json.dump(info, f, ensure_ascii=False, indent=2)


asyncio.run(main())
