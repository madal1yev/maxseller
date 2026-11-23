"""MAXSELLER shop ad v2: music only, 10 real customer pages shown one by one."""
import math
import os
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps, ImageEnhance

TEMP = os.environ.get('TEMP', '.')
WORK = os.path.join(TEMP, 'maxseller-shop-ad')
UI = os.path.join(WORK, 'ui')
FONTS = os.path.join(os.path.dirname(WORK), 'maxseller-commercial', 'fonts')
COVERS = os.path.join(os.path.dirname(WORK), 'maxseller-commercial', 'covers')
OUT = os.path.join(WORK, 'video-only-v2.mp4')

W, H, FPS = 1080, 1920, 30
BEAT = 0.6966
INTRO_END = 4 * BEAT
PAGE_BEATS = 4
OUTRO_START = INTRO_END + 10 * PAGE_BEATS * BEAT
END = OUTRO_START + 4 * BEAT
FRAMES = round(END * FPS)

FONT_U = os.path.join(FONTS, 'Unbounded.ttf')
FONT_M = os.path.join(FONTS, 'Manrope.ttf')
GREEN = (40, 230, 110, 255)
LIGHT = (110, 245, 170, 255)
MUTED = (175, 210, 188, 255)
WHITE = (248, 255, 250, 255)

_fc = {}


def font(path, size, weight=700):
    k = (path, size, weight)
    if k not in _fc:
        f = ImageFont.truetype(path, size)
        try:
            f.set_variation_by_axes([weight])
        except Exception:
            pass
        _fc[k] = f
    return _fc[k]


def clamp(v, a=0.0, b=1.0):
    return max(a, min(b, v))


def ease(t):
    return 1 - (1 - clamp(t)) ** 4


def text_layer(text, f, fill=WHITE, tracking=0):
    d0 = ImageDraw.Draw(Image.new('RGBA', (1, 1)))
    widths = [d0.textbbox((0, 0), ch, font=f)[2] for ch in text]
    total = sum(widths) + tracking * max(0, len(text) - 1)
    asc, desc = f.getmetrics()
    layer = Image.new('RGBA', (max(1, total + 10), asc + desc + 14), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x = 5
    for ch, cw in zip(text, widths):
        d.text((x, 5), ch, font=f, fill=fill)
        x += cw + tracking
    return layer


def fitted(text, path, size, fill=WHITE, weight=700, tracking=0, max_w=940):
    while size > 24:
        f = font(path, size, weight)
        layer = text_layer(text, f, fill, tracking)
        if layer.width <= max_w:
            return layer
        size -= 2
    return text_layer(text, font(path, size, weight), fill, tracking)


def paste(frame, layer, x, y, alpha=1.0):
    if alpha <= 0.002 or layer is None:
        return
    if alpha < 0.999:
        layer = layer.copy()
        layer.putalpha(layer.getchannel('A').point(lambda v: int(v * alpha)))
    frame.paste(layer, (int(x), int(y)), layer.getchannel('A'))


def mid(frame, layer, cx, y, alpha=1.0, dy=0.0):
    paste(frame, layer, cx - layer.width / 2, y + dy, alpha)


def rule(frame, cx, y, width, alpha=1.0, color=GREEN, thickness=3):
    if width <= 0:
        return
    layer = Image.new('RGBA', (int(width) + 2, thickness), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rectangle((0, 0, int(width), thickness - 1), fill=color)
    paste(frame, layer, cx - width / 2, y, alpha)


# ------------------------------ background --------------------------------
yy, xx = np.mgrid[0:H, 0:W]
fx, fy = xx / W, yy / H
base = np.zeros((H, W, 3), dtype=np.float32)
base[:] = [4, 15, 10]
g1 = np.exp(-(((fx - 0.85) / 0.5) ** 2 + ((fy - 0.05) / 0.4) ** 2) * 2.0) * 30
g2 = np.exp(-(((fx - 0.06) / 0.46) ** 2 + ((fy - 0.95) / 0.45) ** 2) * 2.2) * 19
base[:, :, 0] += g1 * 0.14 + g2 * 0.08
base[:, :, 1] += g1 + g2 * 0.8
base[:, :, 2] += g1 * 0.32 + g2 * 0.28
grid = ((xx % 72 < 1) | (yy % 72 < 1)).astype(np.float32) * 4
base += grid[..., None] * np.array([0.2, 1.0, 0.45], dtype=np.float32)
vig = np.clip(1 - 0.45 * (((fx - 0.5) * 2) ** 2 + ((fy - 0.5) * 2) ** 2), 0, 1)
base *= vig[..., None]
base += np.random.default_rng(17).normal(0, 1.7, (H, W)).astype(np.float32)[..., None]
BG = Image.fromarray(base.clip(0, 255).astype('uint8'), 'RGB').convert('RGBA')


# -------------------------------- assets ----------------------------------
def page_panel(path):
    im = Image.open(path).convert('RGB')
    im = ImageEnhance.Brightness(im).enhance(1.22)
    im = ImageEnhance.Contrast(im).enhance(1.06)
    return im.resize((1080, 1600), Image.Resampling.LANCZOS).convert('RGBA')


PAGES = [
    ('shop-hero.png', "MAXSELLER — ONLAYN DO'KON", 'Raqamli mahsulotlar bir joyda!'),
    ('shop-categories.png', "4 YO'NALISH", 'Veb · Dizayn · Hujjat · Video'),
    ('shop-catalog.png', '12 TA MAHSULOT', 'Katalogdan osongina tanlang'),
    ('shop-product-1.png', 'BIZNES LANDING PAGE', "150 000 so'm · Tayyor fayl"),
    ('shop-product-10.png', 'NOLDAN VEB-DASTURLASH', "200 000 so'm · Video darslar"),
    ('shop-howto.png', '4 QADAMDA BUYURTMA', 'Hammasi bir ko‘rishda tushunarli'),
    ('shop-features.png', 'NEGA MAXSELLER?', 'Tezkor · 24/7 · Sifat · Qulaylik'),
    ('shop-checkout.png', "SAVATGA QO'SHING", 'Miqdorni tanlab, buyurtma bering'),
    ('shop-success.png', 'BUYURTMA QABUL QILINDI', 'Holatni kabinetingizda kuzating'),
    ('shop-order.png', "TO'LOV VA FAYL", 'Chek yuklang, faylni oling'),
]
PANELS = [page_panel(os.path.join(UI, p[0])) for p in PAGES]
HEADS = [fitted(p[1], FONT_U, 56, WHITE, 800, 1) for p in PAGES]
SUBS = [fitted(p[2], FONT_M, 30, MUTED, 600, 1) for p in PAGES]
COUNTERS = [text_layer(f'{i:02d} / 10', font(FONT_M, 24, 700), LIGHT, 3) for i in range(1, 11)]

COVER_KEYS = ['01', '04', '10', '02']
COVERS_SM = []
for k in COVER_KEYS:
    im = Image.open(os.path.join(COVERS, f'cover-{k}.png')).convert('RGBA')
    im = ImageOps.fit(im, (470, 294), method=Image.Resampling.LANCZOS)
    COVERS_SM.append(im)

LOGO = Image.open(os.path.join(UI, 'logo.png')).convert('RGBA')
LOGO_GLOW = LOGO.filter(ImageFilter.GaussianBlur(20))

T = {
    'brand': text_layer('MAXSELLER', font(FONT_M, 26, 700), LIGHT, 9),
    'hook1': fitted('XARID QILISHNING', FONT_U, 62, WHITE, 800, 1),
    'hook2': fitted('QULAY USULI!', FONT_U, 70, LIGHT, 800, 1),
    'logo': fitted('MAXSELLER', FONT_U, 100, WHITE, 900, 10),
    'logoglow': fitted('MAXSELLER', FONT_U, 100, GREEN, 900, 10).filter(ImageFilter.GaussianBlur(24)),
    'cta': fitted('Onlayn xaridni hoziroq boshlang!', FONT_M, 42, WHITE, 700),
    'url': fitted('https://maxseller.vercel.app/', FONT_M, 38, LIGHT, 700),
    'endsub': fitted('12 mahsulot · 4 yo‘nalish · 24/7', FONT_M, 24, MUTED, 600, 3),
}


def top_band(frame, alpha):
    band = Image.new('RGBA', (W, 300), (0, 0, 0, 0))
    d = ImageDraw.Draw(band)
    for y in range(300):
        k = 1 - y / 300
        d.line((0, y, W, y), fill=(3, 14, 8, int(235 * k * alpha)))
    frame.alpha_composite(band)


# -------------------------------- scenes ----------------------------------
def intro(frame, t):
    a = clamp(t / 0.35)
    mid(frame, T['brand'], W / 2, 150, a * 0.9)
    rule(frame, W / 2, 210, 260 * ease(t / 0.5), a * 0.8)
    p1 = ease((t - 0.35) / 0.5)
    mid(frame, T['hook1'], W / 2, 540, a * p1, (1 - p1) * 26)
    p2 = ease((t - 0.6) / 0.5)
    mid(frame, T['hook2'], W / 2, 640, a * p2, (1 - p2) * 30)
    for i, im in enumerate(COVERS_SM):
        p = ease((t - 0.3 - i * 0.16) / 0.5)
        if p <= 0:
            continue
        x, y = (60, 880) if i % 2 == 0 else (550, 880)
        yy_ = y if i < 2 else 1220
        paste(frame, im, x + (1 - p) * 60, yy_ + (1 - p) * 30, a * p)


def page(frame, t, i):
    start = INTRO_END + i * PAGE_BEATS * BEAT
    age = t - start
    slot = PAGE_BEATS * BEAT
    a = min(clamp(age / 0.26), clamp((slot - age) / 0.26))
    p = ease(age / 0.55)
    top_band(frame, a)
    mid(frame, HEADS[i], W / 2, 70, a * p, (1 - p) * 18)
    mid(frame, SUBS[i], W / 2, 175, a * ease((age - 0.12) / 0.4))
    rule(frame, W / 2, 245, 330 * ease((age - 0.15) / 0.45), a * 0.9)
    pic = PANELS[i]
    paste(frame, pic, 0, 300, a)
    mid(frame, COUNTERS[i], W / 2, 1860, a * 0.9)
    # precise progress bar for this page
    d = ImageDraw.Draw(frame)
    d.rectangle((0, H - 6, W, H - 1), fill=(255, 255, 255, int(26 * a)))
    d.rectangle((0, H - 6, int(W * clamp(age / slot)), H - 1), fill=(*GREEN[:3], int(220 * a)))


def outro(frame, t):
    age = t - OUTRO_START
    a = clamp(age / 0.35)
    if t >= END - 0.35:
        a *= clamp((END - t) / 0.35)
    glow = LOGO_GLOW.resize((int(LOGO_GLOW.width * 0.82), int(LOGO_GLOW.height * 0.82)), Image.Resampling.BILINEAR)
    mark = LOGO.resize((int(LOGO.width * 0.82), int(LOGO.height * 0.82)), Image.Resampling.BILINEAR)
    paste(frame, glow, W / 2 - glow.width / 2, 480, a * 0.6)
    paste(frame, mark, W / 2 - mark.width / 2, 480, a)
    p = ease(age / 0.55)
    mid(frame, T['logoglow'], W / 2, 760, a * 0.5 * p)
    mid(frame, T['logo'], W / 2, 760, a * p, (1 - p) * 20)
    rule(frame, W / 2, 900, 650 * ease((age - 0.4) / 0.45), a)
    if age > 0.6:
        mid(frame, T['cta'], W / 2, 980, a * ease((age - 0.6) / 0.4))
    if age > 1.05:
        mid(frame, T['url'], W / 2, 1080, a * ease((age - 1.05) / 0.45))
    if age > 1.5:
        mid(frame, T['endsub'], W / 2, 1180, a * ease((age - 1.5) / 0.45))


# -------------------------------- render ----------------------------------
cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
       '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'fast',
       '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT]
proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
for f in range(FRAMES):
    t = f / FPS
    frame = BG.copy()
    if t < INTRO_END:
        intro(frame, t)
    elif t < OUTRO_START:
        i = min(9, int((t - INTRO_END) / (PAGE_BEATS * BEAT)))
        page(frame, t, i)
    else:
        outro(frame, t)
    proc.stdin.write(frame.convert('RGB').tobytes())
    if f % 200 == 0:
        print(f'frame {f}/{FRAMES}', flush=True)
proc.stdin.close()
if proc.wait() != 0:
    raise SystemExit('ffmpeg failed')
print(f'Video: {OUT} ({os.path.getsize(OUT)/1024/1024:.2f} MB) frames={FRAMES} duration={FRAMES/FPS:.3f}s')
