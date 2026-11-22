"""MAXSELLER vertical commercial v2: on-brand artwork, stronger on-screen copy, music only."""
import math
import os
import random
import subprocess
import json

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps, ImageEnhance

TEMP = os.environ.get('TEMP', '.')
WORK = os.path.join(TEMP, 'maxseller-commercial')
UI = os.path.join(WORK, 'ui')
COVERS = os.path.join(WORK, 'covers')
FONTS = os.path.join(WORK, 'fonts')
OUT = os.path.join(WORK, 'video-only-v2.mp4')

W, H, FPS = 1080, 1920, 30
FRAMES = 25 * FPS
S1_END, S2_END, S3_END, S4_END, S5_END = 2.884, 6.343, 11.521, 16.699, 20.159
FONT_U = os.path.join(FONTS, 'Unbounded.ttf')
FONT_M = os.path.join(FONTS, 'Manrope.ttf')
GREEN = (34, 224, 90, 255)
LIGHT = (94, 242, 160, 255)
MUTED = (168, 205, 181, 255)
WHITE = (246, 255, 249, 255)

_fc = {}


def font(path, size, weight=700):
    key = (path, size, weight)
    if key not in _fc:
        f = ImageFont.truetype(path, size)
        try:
            f.set_variation_by_axes([weight])
        except Exception:
            pass
        _fc[key] = f
    return _fc[key]


def clamp(v, a=0.0, b=1.0):
    return max(a, min(b, v))


def ease(t):
    return 1 - (1 - clamp(t)) ** 4


def ease_io(t):
    t = clamp(t)
    return 3 * t * t - 2 * t * t * t


def window(t, a, b, fi=0.24, fo=0.28):
    if t < a or t >= b:
        return 0.0
    return min(clamp((t - a) / fi), clamp((b - t) / fo))


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


# --------------------------- on-brand background --------------------------
yy, xx = np.mgrid[0:H, 0:W]
fx, fy = xx / W, yy / H
base = np.zeros((H, W, 3), dtype=np.float32)
base[:] = [4, 16, 10]
g1 = np.exp(-(((fx - 0.84) / 0.52) ** 2 + ((fy - 0.08) / 0.42) ** 2) * 2.1) * 34
g2 = np.exp(-(((fx - 0.06) / 0.46) ** 2 + ((fy - 0.92) / 0.46) ** 2) * 2.3) * 22
base[:, :, 0] += g1 * 0.16 + g2 * 0.10
base[:, :, 1] += g1 + g2 * 0.85
base[:, :, 2] += g1 * 0.34 + g2 * 0.30
grid = ((xx % 64 < 1) | (yy % 64 < 1)).astype(np.float32) * 5
base += grid[..., None] * np.array([0.2, 1.0, 0.45], dtype=np.float32)
vig = np.clip(1 - 0.44 * (((fx - 0.5) * 2) ** 2 + ((fy - 0.5) * 2) ** 2), 0, 1)
base *= vig[..., None]
base += np.random.default_rng(9).normal(0, 2.0, (H, W)).astype(np.float32)[..., None]
BG = Image.fromarray(base.clip(0, 255).astype('uint8'), 'RGB').convert('RGBA')


# -------------------------------- panels ---------------------------------
def panel(path, size, radius=14, bright=1.0, contrast=1.06):
    im = Image.open(path).convert('RGB')
    im = ImageEnhance.Contrast(im).enhance(contrast)
    im = ImageEnhance.Brightness(im).enhance(bright)
    im = ImageOps.fit(im, size, method=Image.Resampling.LANCZOS).convert('RGBA')
    mask = Image.new('L', size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    im.putalpha(mask)
    out = Image.new('RGBA', (size[0] + 16, size[1] + 32), (0, 0, 0, 0))
    sh = Image.new('RGBA', size, (0, 0, 0, 0))
    sh.paste((0, 0, 0, 170), (0, 0), im.getchannel('A'))
    sh = sh.filter(ImageFilter.GaussianBlur(24))
    out.paste(sh, (8, 26), sh.getchannel('A'))
    out.paste(im, (8, 4), im.getchannel('A'))
    return out


P = {
    'home': panel(os.path.join(UI, 'store-home.png'), (760, 700)),
    'catalog': panel(os.path.join(UI, 'store-catalog.png'), (430, 690)),
    'product': panel(os.path.join(UI, 'store-product.png'), (430, 690)),
    'dashboard': panel(os.path.join(UI, 'admin-dashboard.png'), (920, 575), bright=1.04),
    'orders': panel(os.path.join(UI, 'admin-orders.png'), (900, 563), bright=1.04),
    'products': panel(os.path.join(UI, 'admin-products.png'), (900, 563), bright=1.04),
    'customers': panel(os.path.join(UI, 'admin-customers.png'), (900, 563), bright=1.04),
}
for i in range(1, 13):
    n = f'{i:02d}'
    P[f'c{n}'] = panel(os.path.join(COVERS, f'cover-{n}.png'), (400, 250), radius=12)
P['cbig1'] = panel(os.path.join(COVERS, 'cover-01.png'), (780, 488), radius=16)
P['cbig5'] = panel(os.path.join(COVERS, 'cover-05.png'), (780, 488), radius=16)
P['cbig10'] = panel(os.path.join(COVERS, 'cover-10.png'), (780, 488), radius=16)

_cache = {}


def scaled(img, s):
    k = (id(img), round(s, 2))
    if k not in _cache:
        r = round(s, 2)
        _cache[k] = img.resize((max(1, int(img.width * r)), max(1, int(img.height * r))), Image.Resampling.BILINEAR)
    return _cache[k]


# --------------------------------- text ----------------------------------
T = {
    'top': text_layer('MAXSELLER', font(FONT_M, 24, 700), MUTED, 9),
    'h1': text_layer('ONLINE SAVDO.', font(FONT_U, 66, 800), WHITE, 1),
    'h2': text_layer('YANGI DARAJA.', font(FONT_U, 66, 800), LIGHT, 1),
    'sub1': text_layer("RAQAMLI MAHSULOTLAR DO'KONI", font(FONT_M, 24, 700), LIGHT, 6),
    'sub2': text_layer('SHUNCHAKI MAHSULOT SOTISH EMAS.', font(FONT_M, 22, 700), MUTED, 3),
    'p1': text_layer('BU — BIZNESNI', font(FONT_U, 52, 800), WHITE, 1),
    'p2': text_layer('BOSHQARISH.', font(FONT_U, 52, 800), LIGHT, 1),
    'plist': text_layer('Buyurtmalar  ·  Mijozlar  ·  Savdo  ·  Nazorat', font(FONT_M, 25, 600), MUTED, 1),
    'w1': text_layer('BUYURTMALAR.', font(FONT_U, 48, 800), LIGHT, 1),
    'w2': text_layer('MIJOZLAR.', font(FONT_U, 48, 800), LIGHT, 1),
    'w3': text_layer('SAVDO.', font(FONT_U, 48, 800), LIGHT, 1),
    'w4': text_layer('NAZORAT.', font(FONT_U, 48, 800), LIGHT, 1),
    'd1': text_layer('Barcha buyurtmalar bitta tizimda', font(FONT_M, 23, 500), MUTED),
    'd2': text_layer('Xaridorlar va ular bilan aloqa', font(FONT_M, 23, 500), MUTED),
    'd3': text_layer('Savdo holati va statistikasi', font(FONT_M, 23, 500), MUTED),
    'd4': text_layer("To'lov va yetkazib berish nazorati", font(FONT_M, 23, 500), MUTED),
    'together': text_layer('HAMMASI BIR JOYDA.', font(FONT_U, 42, 700), WHITE, 1),
    'range': text_layer("12 MAHSULOT  ·  4 YO'NALISH", font(FONT_U, 30, 700), LIGHT, 3),
    'captions': {
        'a': text_layer('TAYYOR SAYT SHABLONLARI', font(FONT_M, 25, 700), MUTED, 5),
        'b': text_layer('DIZAYN VA BREND TO\'PLAMLARI', font(FONT_M, 25, 700), MUTED, 5),
        'c': text_layer("ONLAYN DO'KON VA KATALOG", font(FONT_M, 25, 700), MUTED, 5),
        'd': text_layer('VIDEO DARSLAR VA KURSLAR', font(FONT_M, 25, 700), MUTED, 5),
    },
    'cats': text_layer('VEB  ·  DIZAYN  ·  HUJJAT  ·  VIDEO', font(FONT_M, 24, 700), LIGHT, 5),
    'logo': text_layer('MAXSELLER', font(FONT_U, 104, 900), WHITE, 10),
    'glow': text_layer('MAXSELLER', font(FONT_U, 104, 900), GREEN, 10).filter(ImageFilter.GaussianBlur(26)),
    'brandsub': text_layer('ONLAYN SAVDO BOSHQARUVI', font(FONT_M, 29, 600), LIGHT, 7),
    'trust': text_layer('HAQIQIY BUYURTMA  ·  XAVFSIZ KIRISH', font(FONT_M, 22, 600), MUTED, 5),
    'logosm': text_layer('MAXSELLER', font(FONT_U, 42, 800), WHITE, 6),
    'cta1': text_layer('SAVDONGIZNI', font(FONT_U, 46, 700), WHITE, 1),
    'cta2': text_layer('YANGI BOSQICHGA', font(FONT_U, 44, 700), WHITE, 1),
    'cta3': text_layer('OLIB CHIQING.', font(FONT_U, 46, 700), LIGHT, 1),
    'url': text_layer('maxseller.vercel.app', font(FONT_M, 40, 700), LIGHT, 1),
    'start': text_layer('BUGUN BOSHLANG', font(FONT_M, 22, 700), MUTED, 8),
}
labels = {}
for s in ['01 / KATALOG', '02 / MAHSULOT', '03 / BOSHQARUV', '04 / MAHSULOTLAR', '05 / MIJOZLAR']:
    labels[s] = text_layer(s, font(FONT_M, 21, 700), LIGHT, 4)
WORDS = [(6.55, 'w1', 'd1'), (7.42, 'w2', 'd2'), (8.28, 'w3', 'd3'), (9.14, 'w4', 'd4')]
CUTS = [
    (11.521, 'cbig1', 'a'),
    (13.240, 'cbig5', 'b'),
    (14.981, 'catalog', 'c'),
    (16.000, 'cbig10', 'd'),
]


# -------------------------------- scenes ---------------------------------
def s1(frame, t):
    a = window(t, 0, S1_END, 0.16, 0.34)
    random.seed(21)
    for i in range(12):
        col, row = i % 3, i // 3
        tx, ty = 170 + col * 285, 1010 + row * 172
        sx, sy = random.randint(-200, 1250), random.randint(800, 1950)
        p = ease((t - 0.12) / 1.05)
        x = sx + (tx - sx) * p + math.sin(t * 10 + i) * (1 - p) * 12
        y = sy + (ty - sy) * p
        thumb = scaled(P[f'c{i+1:02d}'], 0.62)
        paste(frame, thumb, x, y, a * (0.75 + 0.25 * p))

    mid(frame, T['top'], W / 2, 150, a * 0.8)
    ap = ease((t - 0.95) / 0.7)
    if ap > 0:
        mid(frame, T['h1'], W / 2, 590, a * ap, (1 - ap) * 26)
        mid(frame, T['h2'], W / 2, 685, a * ap, (1 - ap) * 34)
        rule(frame, W / 2, 790, 560 * ease((t - 1.45) / 0.6), a)
        if t > 1.75:
            mid(frame, T['sub1'], W / 2, 840, a * ease((t - 1.75) / 0.45))
        if t > 2.05:
            mid(frame, T['sub2'], W / 2, 905, a * ease((t - 2.05) / 0.4))


def s2(frame, t):
    a = window(t, S1_END, S2_END, 0.24, 0.30)
    mid(frame, T['top'], W / 2, 140, a * 0.7)
    ap = ease((t - 2.95) / 0.5)
    mid(frame, T['p1'], W / 2, 300, a * ap, (1 - ap) * 22)
    mid(frame, T['p2'], W / 2, 380, a * ap, (1 - ap) * 28)
    if t > 3.5:
        mid(frame, T['plist'], W / 2, 470, a * ease((t - 3.5) / 0.5))

    items = [('catalog', 70, 660, 2.884, '01 / KATALOG'),
             ('product', 580, 730, 3.743, '02 / MAHSULOT'),
             ('dashboard', 170, 1210, 4.625, '03 / BOSHQARUV')]
    for key, x, y, at, label in items:
        p = ease((t - at) / 0.6)
        if p <= 0:
            continue
        pic = scaled(P[key], 0.95 + 0.05 * p)
        paste(frame, pic, x + (1 - p) * (130 if x < 500 else -130), y + (1 - p) * 70, a * p)
        mid(frame, labels[label], x + pic.width / 2, y - 42, a * p * 0.95)


def s3(frame, t):
    a = window(t, S2_END, S3_END, 0.26, 0.32)
    p = ease((t - S2_END) / 1.2)
    pic = scaled(P['dashboard'], 1.13 - 0.13 * p)
    x, y = W / 2 - pic.width / 2, 610 - 16 * (1 - p)
    paste(frame, pic, x, y, a)
    rule(frame, W / 2, 575, 420 * p, a * 0.7, GREEN, 2)

    for at, wk, dk in WORDS:
        if t < at:
            continue
        life = t - at
        wa = min(clamp(life / 0.16), clamp((0.94 - life) / 0.20))
        if wa > 0:
            dy = (1 - ease(life / 0.22)) * 26
            mid(frame, T[wk], W / 2, 1300, a * wa, dy)
            mid(frame, T[dk], W / 2, 1365, a * wa * 0.9, dy)

    if t >= 10.55:
        ta = ease((t - 10.55) / 0.45)
        mid(frame, T['together'], W / 2, 1510, a * ta, (1 - ta) * 20)
        rule(frame, W / 2, 1590, 500 * ta, a)


def s4(frame, t):
    a = window(t, S3_END, S4_END, 0.18, 0.28)
    mid(frame, T['range'], W / 2, 240, a * 0.95)
    rule(frame, W / 2, 310, 360, a * 0.6)

    idx = 0
    for i, c in enumerate(CUTS):
        if t >= c[0]:
            idx = i
    at, key, cap = CUTS[idx]
    p = ease((t - at) / 0.72)
    pic = scaled(P[key], 1.16 - 0.16 * p)
    paste(frame, pic, W / 2 - pic.width / 2, 620 + 24 * (1 - p), a)
    mid(frame, T['captions'][cap], W / 2, 1180, a * min(1, p * 1.5))
    mid(frame, T['cats'], W / 2, 1290, a * 0.9)

    if idx > 0:
        prev = P[CUTS[idx - 1][1]].resize((290, 181), Image.Resampling.BILINEAR)
        paste(frame, prev, 780, 1330, a * 0.75)


def s5(frame, t):
    a = window(t, S4_END, S5_END, 0.28, 0.28)
    if t < 18.418:
        k = ease_io((t - S4_END) / 1.5)
        h = int(540 * (1 - k))
        d = ImageDraw.Draw(frame)
        d.line((W / 2, H / 2 - h / 2, W / 2, H / 2 + h / 2), fill=(*GREEN[:3], int(150 * (1 - k) * a)), width=3)
        return
    age = t - 18.418
    p = ease(age / 0.85)
    s = 1.22 - 0.22 * p
    glow = T['glow'].resize((int(T['glow'].width * s), int(T['glow'].height * s)), Image.Resampling.BILINEAR)
    logo = T['logo'].resize((int(T['logo'].width * s), int(T['logo'].height * s)), Image.Resampling.BILINEAR)
    mid(frame, glow, W / 2, 830, a * 0.5 * clamp(age / 0.2))
    mid(frame, logo, W / 2, 830, a * clamp(age / 0.16))
    if age > 0.55:
        rule(frame, W / 2, 975, 620 * ease((age - 0.55) / 0.5), a)
    if age > 0.85:
        mid(frame, T['brandsub'], W / 2, 1040, a * ease((age - 0.85) / 0.5), (1 - ease((age - 0.85) / 0.5)) * 16)
    if age > 1.35:
        mid(frame, T['trust'], W / 2, 1120, a * ease((age - 1.35) / 0.5) * 0.9)


def s6(frame, t):
    if t < S5_END:
        return
    a = clamp((t - S5_END) / 0.28)
    if t >= 23.6:
        a *= clamp((25.0 - t) / 1.35)
    mid(frame, T['logosm'], W / 2, 165, a * 0.9)
    for at, k, y in [(20.20, 'cta1', 360), (20.38, 'cta2', 435), (20.56, 'cta3', 510)]:
        p = ease((t - at) / 0.45)
        if p > 0:
            mid(frame, T[k], W / 2, y, a * p, (1 - p) * 22)
    pic = scaled(P['home'], 1.05 - 0.05 * ease((t - 20.159) / 0.9))
    paste(frame, pic, W / 2 - pic.width / 2, 700, a)
    mid(frame, T['url'], W / 2, 1560, a * ease((t - 20.5) / 0.5))
    if t >= 21.877:
        rule(frame, W / 2, 1630, 520 * ease((t - 21.877) / 0.6), a)
    if t > 22.6:
        mid(frame, T['start'], W / 2, 1710, a * ease((t - 22.6) / 0.5))


# -------------------------------- render ---------------------------------
cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
       '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'fast',
       '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT]
proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
for f in range(FRAMES):
    t = f / FPS
    frame = BG.copy()
    if t < S1_END:
        s1(frame, t)
    elif t < S2_END:
        s2(frame, t)
    elif t < S3_END:
        s3(frame, t)
    elif t < S4_END:
        s4(frame, t)
    elif t < S5_END:
        s5(frame, t)
    else:
        s6(frame, t)
    proc.stdin.write(frame.convert('RGB').tobytes())
    if f % 150 == 0:
        print(f'frame {f}/{FRAMES}', flush=True)
proc.stdin.close()
if proc.wait() != 0:
    raise SystemExit('ffmpeg failed')
print(f'Video: {OUT} ({os.path.getsize(OUT) / 1024 / 1024:.2f} MB)')
