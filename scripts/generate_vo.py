"""Generate the Uzbek male voiceover segments with neural Sardor voice."""
import asyncio
import os
import subprocess
import json

import edge_tts

TMP = os.path.join(os.environ.get('TEMP', '.'), 'maxseller-commercial', 'vo')
os.makedirs(TMP, exist_ok=True)

VOICE = 'uz-UZ-SardorNeural'
SEGMENTS = [
    ('01_hook_a', 'Onlayn savdo...', '+22%', '-4Hz'),
    ('02_hook_b', 'shunchaki mahsulot sotish emas.', '+22%', '-4Hz'),
    ('03_problem', 'Bu — biznesni boshqarish.', '+12%', '-4Hz'),
    ('04_orders', 'Buyurtmalar.', '+20%', '-4Hz'),
    ('05_clients', 'Mijozlar.', '+20%', '-4Hz'),
    ('06_sales', 'Savdo.', '+20%', '-4Hz'),
    ('07_control', 'Nazorat.', '+20%', '-4Hz'),
    ('08_together', 'Hammasi bir joyda.', '+10%', '-4Hz'),
    ('09_brand', 'MAXSELLER.', '+5%', '-6Hz'),
    ('10_cta', 'Savdongizni yangi bosqichga olib chiqing.', '+10%', '-4Hz'),
]


async def main():
    info = []
    for name, text, rate, pitch in SEGMENTS:
        path = os.path.join(TMP, name + '.mp3')
        communicate = edge_tts.Communicate(text, VOICE, rate=rate, pitch=pitch, volume='+12%')
        await communicate.save(path)
        probe = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
             '-of', 'default=nw=1:nk=1', path],
            capture_output=True, text=True, check=True,
        )
        duration = float(probe.stdout.strip())
        info.append({'id': name, 'text': text, 'file': path, 'duration': round(duration, 3)})
        print(f'{name:14s} {duration:5.2f}s  {text}')
    with open(os.path.join(TMP, 'segments.json'), 'w', encoding='utf-8') as f:
        json.dump(info, f, ensure_ascii=False, indent=2)


asyncio.run(main())
