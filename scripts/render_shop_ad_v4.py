"""MAXSELLER shop ad v4 — Telegram Stories safe-area layout.

6 large pages, minimal motion, logo on every screen, music only.
Safe zone: top 150 px and bottom 210 px stay clear of UI overlays.
"""
import math
import os
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance, ImageChops

TEMP = os.environ.get('TEMP', '.')
WORK = os.path.join(TEMP, 'maxseller-shop-ad')
UI = os.path.join(WORK, 'ui')
FONTS = os.path.join(os.path.dirname(WORK), 'maxseller-commercial', 'fonts')
OUT = os.path.join(WORK, 'video-only-v4.mp4')

W, H, FPS = 1080, 1920, 30
BEAT = 0.6966
INTRO = 3 * BEAT          # 2.0898 s
SLOT = 7 * BEAT           # 4.8762 s per page
OUTRO = INTRO + 6 * SLOT  # 30.3468 s
END = OUTRO + 3 * BEAT    # 33.4368 s
FRAMES = round(END * FPS)
TR = 0.30                 # gentle crossfade

FONT_U = os.path.join(FONTS, 'Unbounded.ttf')
FONT_M = os.path.join(FONTS, 'Manrope.ttf')

SITE_BG = (5, 16, 10)
SITE_GREEN = (34, 224, 90)
SITE_TEXT = (234, 245, 238)
SITE_MUTED = (144, 169, 154)
ACC = [(34, 224, 90), (14, 165, 233), (99, 102, 241),
       (22, 163, 74), (236, 72, 153), (34, 211, 238)]

PAGES = [
    ('shop-hero.png',       "MAXSELLER — ONLAYN DO'KON", '12 mahsulot · 4 yo‘nalish'),
    ('shop-categories.png', 'KATEGORIYALAR',             'Veb · Dizayn · Hujjat · Video'),
    ('shop-catalog.png',    'MAHSULOTLARNI TANLANG',     'Qidiruv · filter · savatga qo‘shish'),
    ('shop-product-1.png',  'MAHSULOT SAHIFASI',         "Biznes landing page · 150 000 so'm"),
    ('shop-checkout.png',   'BUYURTMA VA TO‘LOV',        'Savat · aloqa · to‘lov usuli'),
    ('shop-success.png',    'FAYL SIZGA KELADI',         'Buyurtma qabul qilindi · kabinetdan yuklang'),
]

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
    t = clamp(t)
    return 1 - (1 - t) ** 4


def text_layer(text, f, fill, tracking=0):
    p = ImageDraw.Draw(Image.new('RGBA', (1, 1)))
    widths = [p.textbbox((0, 0), ch, font=f)[2] for ch in text]
    total = sum(widths) + tracking * max(0, len(text) - 1)
    asc, desc = f.getmetrics()
    layer = Image.new('RGBA', (max(1, total + 14), asc + desc + 18), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x = 7
    for ch, cw in zip(text, widths):
        d.text((x + 2, 7), ch, font=f, fill=(0, 0, 0, 210))
        d.text((x, 4), ch, font=f, fill=fill)
        x += cw + tracking
    return layer


def fitted(text, path, size, fill, weight=700, tracking=0, max_w=860):
    while size > 26:
        layer = text_layer(text, font(path, size, weight), fill, tracking)
        if layer.width <= max_w:
            return layer
        size -= 2
    return text_layer(text, font(path, size, weight), fill, tracking)


def paste(frame, layer, x, y, alpha=1.0):
    if alpha <= 0.003 or layer is None:
        return
    if alpha < 0.999:
        layer = layer.copy()
        layer.putalpha(layer.getchannel('A').point(lambda v: int(v * alpha)))
    frame.paste(layer, (int(x), int(y)), layer.getchannel('A'))


def mid(frame, layer, cx, y, alpha=1.0, dy=0.0):
    paste(frame, layer, cx - layer.width / 2, y + dy, alpha)


def rule(frame, cx, y, width, alpha=1.0, color=SITE_GREEN):
    if width <= 0:
        return
    lay = Image.new('RGBA', (int(width) + 2, 4), (0, 0, 0, 0))
    ImageDraw.Draw(lay).rectangle((0, 0, int(width), 3), fill=(*color, 255))
    paste(frame, lay, cx - width / 2, y, alpha)


# ---------------------------------------------------------------- assets ----
def load_panel(path):
    im = Image.open(path).convert('RGB')
    im = ImageEnhance.Brightness(im).enhance(1.26)
    im = ImageEnhance.Contrast(im).enhance(1.06)
    return im.resize((850, 1259), Image.Resampling.LANCZOS).convert('RGBA')


PANELS = [load_panel(os.path.join(UI, p[0])) for p in PAGES]
HEADS = [fitted(p[1], FONT_U, 64, SITE_TEXT, 800, 1) for p in PAGES]
SUBS = [fitted(p[2], FONT_M, 33, (205, 230, 214), 600, 1) for p in PAGES]
COUNTERS = [text_layer(f'{i:02d} / 06', font(FONT_M, 24, 700), SITE_GREEN, 4)
            for i in range(1, 7)]

LOGO = Image.open(os.path.join(UI, 'logo.png')).convert('RGBA')
LOGO_SM = LOGO.resize((54, 54), Image.Resampling.LANCZOS)
LOGO_BIG = LOGO.resize((170, 170), Image.Resampling.LANCZOS)
LOGO_GLOW = LOGO_BIG.filter(ImageFilter.GaussianBlur(26))
BRAND = text_layer('MAXSELLER', font(FONT_M, 32, 700), SITE_TEXT, 8)

T = {
    'hook1': fitted('XARID QILISHNING', FONT_U, 66, SITE_TEXT, 800, 1),
    'hook2': fitted('QULAY USULI!', FONT_U, 76, SITE_GREEN, 800, 1),
    'hooksub': fitted('Faqat mijozlar uchun onlayn do‘kon', FONT_M, 28, SITE_MUTED, 600),
    'logo': fitted('MAXSELLER', FONT_U, 92, SITE_TEXT, 900, 10),
    'cta': fitted('Onlayn xaridni hoziroq boshlang!', FONT_M, 40, SITE_TEXT, 700),
    'url': fitted('https://maxseller.vercel.app/', FONT_M, 37, SITE_GREEN, 700),
    'endsub': fitted('12 mahsulot · 4 yo‘nalish · 24/7', FONT_M, 25, SITE_MUTED, 600, 3),
}

# static background grid (no moving particles — minimal motion)
GRID = Image.new('RGBA', (W, H), (0, 0, 0, 0))
_gd = ImageDraw.Draw(GRID)
for x in range(0, W + 90, 90):
    _gd.line((x, 0, x, H), fill=(140, 220, 165, 10), width=1)
for y in range(0, H + 90, 90):
    _gd.line((0, y, W, y), fill=(140, 220, 165, 10), width=1)

SW, SH = 270, 480
SY, SX = np.mgrid[0:SH, 0:SW]
GX, GY = SX / SW, SY / SH


def bg(accent, t, idx):
    a = np.empty((SH, SW, 3), dtype=np.float32)
    a[:] = SITE_BG
    fx = 0.72 + 0.06 * math.sin(t * 0.35 + idx)
    fy = 0.20 + 0.04 * math.cos(t * 0.3 + idx)
    g = np.exp(-(((GX - fx) / 0.62) ** 2 + ((GY - fy) / 0.58) ** 2) * 2.0) * 58
    a += g[..., None] * (np.array(accent, dtype=np.float32) / 255.0)
    g2 = np.exp(-(((GX - 0.18) / 0.55) ** 2 + ((GY - 0.88) / 0.5) ** 2) * 2.0) * 30
    a += g2[..., None] * (np.array(SITE_GREEN, dtype=np.float32) / 255.0)
    im = Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGB').convert('RGBA')
    im = im.resize((W, H), Image.Resampling.BICUBIC)
    im.alpha_composite(ImageChops.offset(GRID, int(t * 5) % 90, 0))
    return im


def brand_row(frame, alpha=1.0, y=160):
    lx = W / 2 - (54 + 20 + BRAND.width) // 2
    paste(frame, LOGO_SM, lx, y, alpha)
    mid(frame, BRAND, lx + 54 + 20 + BRAND.width / 2, y + 8, alpha)


def scene(idx, age, alpha=1.0):
    f = bg(ACC[idx], age, idx)
    s = 1.012 + 0.018 * ease(age / SLOT)
    pw, ph = int(850 * s), int(1259 * s)
    im = PANELS[idx].resize((pw, ph), Image.Resampling.BILINEAR)
    dx, dy = (pw - 850) // 2, int((ph - 1259) * 0.5)
    im = im.crop((dx, dy, dx + 850, dy + 1259))
    sh = Image.new('RGBA', (850, 1259), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((8, 16, 842, 1251), radius=18, fill=(0, 0, 0, 170))
    sh = sh.filter(ImageFilter.GaussianBlur(22))
    f.paste(sh, (115, 442), sh.getchannel('A'))
    f.paste(im, (115, 440), im.getchannel('A'))
    return f


def draw_text(frame, idx, age, alpha=1.0):
    brand_row(frame, alpha)
    mid(frame, HEADS[idx], W / 2, 245, alpha * ease(age / 0.25))
    mid(frame, SUBS[idx], W / 2, 340, alpha * ease((age - 0.08) / 0.3))
    rule(frame, W / 2, 405, 340 * ease((age - 0.1) / 0.3), alpha, ACC[idx])
    paste(frame, COUNTERS[idx], W - COUNTERS[idx].width - 70, 176, alpha * 0.95)


def intro_scene(t):
    f = bg(SITE_GREEN, t, 0)
    return f


def draw_intro(frame, t, alpha=1.0):
    brand_row(frame, alpha, 400)
    p = ease((t - 0.25) / 0.45)
    mid(frame, T['hook1'], W / 2, 720, alpha * p, (1 - p) * 18)
    mid(frame, T['hook2'], W / 2, 820, alpha * ease((t - 0.45) / 0.45))
    rule(frame, W / 2, 940, 420 * ease((t - 0.8) / 0.4), alpha)
    mid(frame, T['hooksub'], W / 2, 1000, alpha * ease((t - 0.95) / 0.4))


def outro_scene(age):
    f = bg(SITE_GREEN, age, 7)
    paste(f, LOGO_GLOW, W / 2 - LOGO_GLOW.width / 2, 330, 0.55)
    paste(f, LOGO_BIG, W / 2 - LOGO_BIG.width / 2, 330)
    mid(f, T['logo'], W / 2, 550, ease(age / 0.3))
    rule(f, W / 2, 700, 600 * ease((age - 0.2) / 0.35))
    mid(f, T['cta'], W / 2, 790, ease((age - 0.35) / 0.35))
    mid(f, T['url'], W / 2, 900, ease((age - 0.6) / 0.35))
    mid(f, T['endsub'], W / 2, 1000, ease((age - 0.85) / 0.35))
    return f


BOUNDS = [INTRO] + [INTRO + (k + 1) * SLOT for k in range(5)] + [OUTRO]


def frame_at(t):
    if t < INTRO:
        f = intro_scene(t)
        draw_intro(f, t)
        return f
    if t >= OUTRO:
        return outro_scene(t - OUTRO)
    for k, B in enumerate(BOUNDS):
        if abs(t - B) <= TR / 2:
            u = clamp((t - (B - TR / 2)) / TR)
            oi, ii = k - 1, k
            if oi < 0:
                out = intro_scene(t)
            else:
                out = scene(oi, SLOT - 0.02)
            if ii >= 6:
                inn = outro_scene(max(0.0, t - OUTRO))
            else:
                inn = scene(ii, 0.02 + u * 0.12)
            f = Image.blend(out, inn, ease(u))
            if oi < 0:
                if u < 0.5:
                    draw_intro(f, t, 1 - u / 0.5)
            elif u < 0.5:
                draw_text(f, oi, SLOT - 0.02, 1 - u / 0.5)
            if u >= 0.5 and ii < 6:
                draw_text(f, ii, 0.02 + u * 0.12, (u - 0.5) / 0.5)
            return f
    idx = min(5, int((t - INTRO) / SLOT))
    age = t - (INTRO + idx * SLOT)
    f = scene(idx, age)
    draw_text(f, idx, age)
    return f


def render():
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
           '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-vf', 'setsar=1',
           '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
           '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for n in range(FRAMES):
        proc.stdin.write(frame_at(n / FPS).convert('RGB').tobytes())
        if n % 200 == 0:
            print(f'frame {n}/{FRAMES}', flush=True)
    proc.stdin.close()
    if proc.wait() != 0:
        raise SystemExit('ffmpeg failed')
    print(f'Video: {OUT} ({os.path.getsize(OUT)/1024/1024:.2f} MB) frames={FRAMES} duration={FRAMES/FPS:.3f}s')


if os.environ.get('PREVIEW'):
    for t in [1.2, 3.2, 7.0, 11.9, 16.8, 21.6, 26.5, 31.0, 32.5]:
        frame_at(t).convert('RGB').save(os.path.join(WORK, f'v4_{t:.1f}.png'))
    print('preview frames written')
else:
    render()
