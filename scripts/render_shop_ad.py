"""30s vertical MAXSELLER ONLINE SHOP commercial — real customer UI only."""
import math
import os
import random
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps, ImageEnhance

TEMP = os.environ.get('TEMP', '.')
WORK = os.path.join(TEMP, 'maxseller-shop-ad')
UI = os.path.join(WORK, 'ui')
COVERS = os.path.join(os.path.dirname(WORK), 'maxseller-commercial', 'covers')
FONTS = os.path.join(os.path.dirname(WORK), 'maxseller-commercial', 'fonts')
OUT = os.path.join(WORK, 'video-only.mp4')

W, H, FPS = 1080, 1920, 30
FRAMES = 30 * FPS
S1, S2, S3, S4, S5 = 3.115, 6.830, 12.357, 17.906, 25.290
FONT_U = os.path.join(FONTS, 'Unbounded.ttf')
FONT_M = os.path.join(FONTS, 'Manrope.ttf')
GREEN = (40, 230, 110, 255)
LIGHT = (110, 245, 170, 255)
MUTED = (170, 205, 182, 255)
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


def window(t, a, b, fi=0.25, fo=0.28):
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


def rounded(frame, box, outline=GREEN, alpha=1.0, width=3, radius=14):
    d = ImageDraw.Draw(frame)
    d.rounded_rectangle(box, radius=radius, outline=(*outline[:3], int(outline[3] * alpha)), width=width)


# ------------------------------ background --------------------------------
yy, xx = np.mgrid[0:H, 0:W]
fx, fy = xx / W, yy / H
base = np.zeros((H, W, 3), dtype=np.float32)
base[:] = [4, 15, 10]
g1 = np.exp(-(((fx - 0.86) / 0.5) ** 2 + ((fy - 0.06) / 0.4) ** 2) * 2.0) * 32
g2 = np.exp(-(((fx - 0.05) / 0.45) ** 2 + ((fy - 0.94) / 0.45) ** 2) * 2.2) * 20
base[:, :, 0] += g1 * 0.14 + g2 * 0.08
base[:, :, 1] += g1 + g2 * 0.8
base[:, :, 2] += g1 * 0.32 + g2 * 0.28
grid = ((xx % 72 < 1) | (yy % 72 < 1)).astype(np.float32) * 4
base += grid[..., None] * np.array([0.2, 1.0, 0.45], dtype=np.float32)
vig = np.clip(1 - 0.45 * (((fx - 0.5) * 2) ** 2 + ((fy - 0.5) * 2) ** 2), 0, 1)
base *= vig[..., None]
base += np.random.default_rng(12).normal(0, 1.8, (H, W)).astype(np.float32)[..., None]
BG = Image.fromarray(base.clip(0, 255).astype('uint8'), 'RGB').convert('RGBA')


# -------------------------------- assets ----------------------------------
def panel(path, size, radius=14, bright=1.0):
    im = Image.open(path).convert('RGB')
    im = ImageEnhance.Contrast(im).enhance(1.05)
    im = ImageEnhance.Brightness(im).enhance(bright)
    im = ImageOps.fit(im, size, method=Image.Resampling.LANCZOS).convert('RGBA')
    mask = Image.new('L', size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    im.putalpha(mask)
    out = Image.new('RGBA', (size[0] + 16, size[1] + 32), (0, 0, 0, 0))
    sh = Image.new('RGBA', size, (0, 0, 0, 0))
    sh.paste((0, 0, 0, 175), (0, 0), im.getchannel('A'))
    sh = sh.filter(ImageFilter.GaussianBlur(26))
    out.paste(sh, (8, 26), sh.getchannel('A'))
    out.paste(im, (8, 4), im.getchannel('A'))
    return out


UI_P = {
    'hero': panel(os.path.join(UI, 'shop-hero.png'), (850, 1259), bright=1.18),
    'catalog': panel(os.path.join(UI, 'shop-catalog.png'), (850, 1259), bright=1.18),
    'product1': panel(os.path.join(UI, 'shop-product-1.png'), (820, 1215), bright=1.25),
    'checkout': panel(os.path.join(UI, 'shop-checkout.png'), (820, 1215), bright=1.25),
    'success': panel(os.path.join(UI, 'shop-success.png'), (820, 1215), bright=1.25),
    'howto': panel(os.path.join(UI, 'shop-howto.png'), (820, 1215), bright=1.22),
}
CP = {}
for i in range(1, 13):
    n = f'{i:02d}'
    CP[n] = panel(os.path.join(COVERS, f'cover-{n}.png'), (330, 206), radius=12)
CP['big'] = {}

# Big close-up covers for the showcase scene.
for n, key in [('01', 'a'), ('04', 'b'), ('10', 'c'), ('02', 'd')]:
    CP['big'][key] = panel(os.path.join(COVERS, f'cover-{n}.png'), (830, 519), radius=16)

LOGO = Image.open(os.path.join(UI, 'logo.png')).convert('RGBA')
LOGO_GLOW = LOGO.filter(ImageFilter.GaussianBlur(18))

_cache = {}


def scaled(img, s):
    k = (id(img), round(s, 2))
    if k not in _cache:
        r = round(s, 2)
        _cache[k] = img.resize((max(1, int(img.width * r)), max(1, int(img.height * r))),
                               Image.Resampling.BILINEAR)
    return _cache[k]


# -------------------------------- typography -------------------------------
T = {
    'brand': text_layer('MAXSELLER', font(FONT_M, 23, 700), MUTED, 9),
    'h1a': text_layer('XARID QILISHNING', font(FONT_U, 60, 800), WHITE, 1),
    'h1b': text_layer('QULAY USULI!', font(FONT_U, 66, 800), LIGHT, 1),
    'h1sub': text_layer('MAXSELLER · DIGITAL STORE', font(FONT_M, 23, 700), MUTED, 7),
    'def1': text_layer('MAXSELLER — kerakli mahsulotlarni', font(FONT_M, 34, 700), WHITE),
    'def2': text_layer('onlayn xarid qilish uchun', font(FONT_M, 34, 700), WHITE),
    'def3': text_layer('qulay do‘kon.', font(FONT_M, 34, 700), LIGHT),
    'cats': text_layer('VEB  ·  DIZAYN  ·  HUJJAT  ·  VIDEO', font(FONT_M, 24, 700), LIGHT, 5),
    'showtitle': text_layer('12 MAHSULOT · 4 YO‘NALISH', font(FONT_U, 42, 800), WHITE, 1),
    'showsub': text_layer('Tayyor fayllar — tanlashga tayyor', font(FONT_M, 24, 600), MUTED),
    'why1': text_layer('QIDIRING · TANLANG ·', font(FONT_U, 46, 800), WHITE, 1),
    'why2': text_layer('SAVATGA QO‘SHING', font(FONT_U, 46, 800), LIGHT, 1),
    'whyfoot': text_layer('Bir joyda  ·  Tez topish  ·  Savat', font(FONT_M, 23, 600), MUTED),
    'reallabel': text_layer('HAQIQIY DO‘KON INTERFEYSI', font(FONT_M, 19, 700), MUTED, 6),
    'howtitle': text_layer('4 QADAMDA BUYURTMA', font(FONT_U, 42, 800), WHITE, 1),
    'step1': text_layer('1  Mahsulotni tanlang', font(FONT_M, 30, 700), LIGHT),
    'step2': text_layer('2  Buyurtmani tasdiqlang', font(FONT_M, 30, 700), LIGHT),
    'step3': text_layer('3  To‘lov chekini yuklang', font(FONT_M, 30, 700), LIGHT),
    'step4': text_layer('4  Faylni oling', font(FONT_M, 30, 700), LIGHT),
    'orderlabel': text_layer('HAQIQIY BUYURTMA VA KABINET', font(FONT_M, 19, 700), MUTED, 6),
    'logo': text_layer('MAXSELLER', font(FONT_U, 98, 900), WHITE, 10),
    'logoglow': text_layer('MAXSELLER', font(FONT_U, 98, 900), GREEN, 10).filter(ImageFilter.GaussianBlur(24)),
    'finalcta': text_layer('Onlayn xaridni hoziroq boshlang!', font(FONT_M, 38, 700), WHITE),
    'url': text_layer('https://maxseller.vercel.app/', font(FONT_M, 36, 700), LIGHT),
    'finalsub': text_layer('12 mahsulot · 4 yo‘nalish · 24/7', font(FONT_M, 22, 600), MUTED, 4),
}

PRODUCTS = [
    ('a', 'Biznes landing page', '150 000 so‘m', 'VEB'),
    ('b', 'Instagram post shablonlari', '60 000 so‘m', 'DIZAYN'),
    ('c', 'Noldan veb-dasturlash', '200 000 so‘m', 'VIDEO'),
    ('d', 'Onlayn do‘kon shabloni', '350 000 so‘m', 'VEB'),
]
PT = {}
for key, name, price, cat in PRODUCTS:
    PT[key] = (
        text_layer(name, font(FONT_U, 37, 700), WHITE),
        text_layer(price, font(FONT_M, 34, 700), LIGHT),
        text_layer(cat, font(FONT_M, 22, 700), MUTED, 5),
    )
COUNTER = [text_layer(f'{i} / 12', font(FONT_M, 22, 700), MUTED, 4) for i in (1, 4, 10, 2)]
PRODUCT_AT = [6.830, 8.665, 10.522, 11.521]


# -------------------------------- scenes ----------------------------------
def brand_top(frame, a):
    mid(frame, T['brand'], W / 2, 115, a * 0.8)
    rule(frame, W / 2, 165, 180, a * 0.5, GREEN, 2)


def s1(frame, t):
    a = window(t, 0, S1, 0.16, 0.30)
    random.seed(31)
    for i in range(12):
        col, row = i % 3, i // 3
        tx, ty = 90 + col * 305, 870 + row * 195
        sx, sy = random.randint(-300, 1300), random.randint(900, 2000)
        p = ease((t - 0.10) / 1.05)
        x = sx + (tx - sx) * p + math.sin(t * 9 + i) * (1 - p) * 11
        y = sy + (ty - sy) * p
        paste(frame, CP[f'{i+1:02d}'], x, y, a * (0.65 + 0.35 * p))
    brand_top(frame, a)
    ap = ease((t - 0.85) / 0.6)
    if ap > 0:
        mid(frame, T['h1a'], W / 2, 330, a * ap, (1 - ap) * 24)
        mid(frame, T['h1b'], W / 2, 415, a * ap, (1 - ap) * 30)
        rule(frame, W / 2, 540, 470 * ease((t - 1.35) / 0.55), a)
        if t > 1.65:
            mid(frame, T['h1sub'], W / 2, 600, a * ease((t - 1.65) / 0.4))


def s2(frame, t):
    a = window(t, S1, S2, 0.24, 0.28)
    brand_top(frame, a)
    for i, k in enumerate(['def1', 'def2', 'def3']):
        p = ease((t - S1 - 0.12 - i * 0.16) / 0.45)
        if p > 0:
            mid(frame, T[k], W / 2, 220 + i * 52, a * p, (1 - p) * 18)
    rule(frame, W / 2, 400, 400 * ease((t - S1 - 0.6) / 0.5), a * 0.8)
    p = ease((t - S1 - 0.35) / 1.0)
    pic = scaled(UI_P['hero'], 0.96 + 0.04 * p)
    paste(frame, pic, W / 2 - pic.width / 2, 450 + 20 * (1 - p), a * p)
    if t > 5.5:
        mid(frame, T['cats'], W / 2, 1735, a * ease((t - 5.5) / 0.45))


def s3(frame, t):
    a = window(t, S2, S3, 0.18, 0.28)
    brand_top(frame, a)
    mid(frame, T['showtitle'], W / 2, 160, a * 0.98)
    mid(frame, T['showsub'], W / 2, 225, a * 0.85)
    rule(frame, W / 2, 285, 380, a * 0.6)
    idx = 0
    for i, at in enumerate(PRODUCT_AT):
        if t >= at:
            idx = i
    at = PRODUCT_AT[idx]
    key, name, price, cat = PRODUCTS[idx]
    p = ease((t - at) / 0.6)
    pic = scaled(CP['big'][key], 1.14 - 0.14 * p)
    x, y = W / 2 - pic.width / 2, 420 + 22 * (1 - p)
    rounded(frame, (x - 14, y - 14, x + pic.width + 14, y + pic.height + 14), GREEN, a * 0.55)
    paste(frame, pic, x, y, a)
    title, price_l, cat_l = PT[key]
    mid(frame, title, W / 2, 1050, a * min(1, p * 1.4), (1 - p) * 18)
    mid(frame, price_l, W / 2, 1125, a * min(1, p * 1.3))
    mid(frame, cat_l, W / 2, 1190, a * 0.9)
    mid(frame, COUNTER[idx], W / 2, 1750, a * 0.9)


def s4(frame, t):
    a = window(t, S3, S4, 0.20, 0.28)
    brand_top(frame, a)
    mid(frame, T['why1'], W / 2, 150, a)
    mid(frame, T['why2'], W / 2, 215, a)
    rule(frame, W / 2, 305, 420, a * 0.7)
    key = 'catalog' if t < 14.214 else 'product1'
    p = ease((t - (S3 if key == 'catalog' else 14.214)) / 0.65)
    pic = scaled(UI_P[key], 1.05 - 0.05 * p)
    paste(frame, pic, W / 2 - pic.width / 2, 380 + 22 * (1 - p), a * p)
    mid(frame, T['reallabel'], W / 2, 1665, a * 0.75)
    mid(frame, T['whyfoot'], W / 2, 1730, a * 0.85)


def s5(frame, t):
    a = window(t, S4, S5, 0.20, 0.26)
    brand_top(frame, a)
    mid(frame, T['howtitle'], W / 2, 145, a)
    rule(frame, W / 2, 215, 350, a * 0.6)
    steps = [(17.906, 'step1'), (19.741, 'step2'), (22.272, 'step3'), (23.650, 'step4')]
    for i, (at, k) in enumerate(steps):
        p = ease((t - at) / 0.4)
        if p <= 0:
            continue
        mid(frame, T[k], W / 2, 265 + i * 48, a * p, (1 - p) * 16)
    if t < 21.598:
        pic = scaled(UI_P['product1'], 1.04 - 0.04 * ease((t - S4) / 0.7))
    elif t < 23.300:
        pic = scaled(UI_P['checkout'], 1.04 - 0.04 * ease((t - 21.598) / 0.6))
    else:
        pic = scaled(UI_P['success'], 1.04 - 0.04 * ease((t - 23.300) / 0.6))
    paste(frame, pic, W / 2 - pic.width / 2, 490, a)
    mid(frame, T['orderlabel'], W / 2, 1740, a * 0.8)


def s6(frame, t):
    if t < S5:
        return
    a = clamp((t - S5) / 0.32)
    if t >= 29.55:
        a *= clamp((30.0 - t) / 0.45)
    glow = scaled(LOGO_GLOW, 0.72 + 0.08 * ease((t - S5) / 0.7))
    mark = scaled(LOGO, 0.72 + 0.08 * ease((t - S5) / 0.7))
    paste(frame, glow, W / 2 - glow.width / 2, 540, a * 0.65)
    paste(frame, mark, W / 2 - mark.width / 2, 540, a)
    lg = scaled(T['logoglow'], 1.0 - 0.06 * ease((t - S5) / 0.8))
    lm = scaled(T['logo'], 1.0 - 0.06 * ease((t - S5) / 0.8))
    mid(frame, lg, W / 2, 780, a * 0.5)
    mid(frame, lm, W / 2, 780, a)
    rule(frame, W / 2, 930, 650 * ease((t - S5) / 0.45), a)
    if t > S5 + 0.45:
        mid(frame, T['finalcta'], W / 2, 1010, a * ease((t - S5 - 0.45) / 0.45))
    if t > S5 + 0.9:
        mid(frame, T['url'], W / 2, 1110, a * ease((t - S5 - 0.9) / 0.5))
    if t > S5 + 1.4:
        mid(frame, T['finalsub'], W / 2, 1210, a * ease((t - S5 - 1.4) / 0.5))


# -------------------------------- render ----------------------------------
cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
       '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'fast',
       '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT]
proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
for f in range(FRAMES):
    t = f / FPS
    frame = BG.copy()
    if t < S1:
        s1(frame, t)
    elif t < S2:
        s2(frame, t)
    elif t < S3:
        s3(frame, t)
    elif t < S4:
        s4(frame, t)
    elif t < S5:
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
