"""MAXSELLER shop ad v7 — hybrid premium commercial.

Real product covers inside original generated cinematic frames.
No site screenshots, no prices, no voiceover, no sound effects.
Music: EsDeeKid & Rico Ace - Phantom, cut and beat-synced (92.29 BPM).
Balanced cinematic transitions: impressive, but text stays readable.
"""
import json
import math
import os
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

TEMP = os.environ.get('TEMP', '.')
WORK = os.path.join(TEMP, 'maxseller-shop-ad')
UI = os.path.join(WORK, 'ui')
FONTS = os.path.join(os.path.dirname(WORK), 'maxseller-commercial', 'fonts')
COVER_DIR = os.path.join(os.path.dirname(WORK), 'maxseller-commercial', 'covers')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAP = json.load(open(os.path.join(ROOT, '.tmp', 'phantom-music-map.json'), encoding='utf-8'))
OUT = os.path.join(WORK, 'video-only-v7.mp4')

W, H, FPS = 1080, 1920, 30
BEAT = MAP['beatInterval']          # 0.6502 s
INTRO = 4 * BEAT                    # 2.6008 s — hook
SLOT = 7 * BEAT                     # 4.5514 s per page
OUTRO = INTRO + 6 * SLOT            # 29.9092 s
END = OUTRO + 5 * BEAT              # 33.1602 s — 51 beats
FRAMES = round(END * FPS)
TR = 0.46                           # cinematic yet readable

FONT_U = os.path.join(FONTS, 'Unbounded.ttf')
FONT_M = os.path.join(FONTS, 'Manrope.ttf')

SITE_BG = (5, 16, 10)
SITE_GREEN = (34, 224, 90)
SITE_TEXT = (234, 245, 238)
SITE_MUTED = (144, 169, 154)
ACC = [(34, 224, 90), (14, 165, 233), (99, 102, 241),
       (34, 197, 94), (236, 72, 153), (34, 211, 238)]

HEADS = ["MAXSELLER — ONLAYN DO‘KON", 'KATEGORIYALAR', 'MAHSULOTLARNI TANLANG',
         'NEGA MAXSELLER?', '4 QADAMDA BUYURTMA', 'FAYL SIZGA KELADI']
SUBS = ['12 mahsulot · 4 yo‘nalish', 'Veb · Dizayn · Hujjat · Video',
        'O‘zingizga keraklisini toping', 'Hammasi bir joyda · qulay · tez',
        'Tanlang · savatga qo‘shing · buyurtma bering', 'Buyurtma qabul qilindi · fayl tayyor']

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


def smooth(t):
    t = clamp(t)
    return t * t * (3 - 2 * t)


def text_layer(text, f, fill, tracking=0, shadow=True):
    p = ImageDraw.Draw(Image.new('RGBA', (1, 1)))
    widths = [p.textbbox((0, 0), ch, font=f)[2] for ch in text]
    total = sum(widths) + tracking * max(0, len(text) - 1)
    asc, desc = f.getmetrics()
    layer = Image.new('RGBA', (max(1, total + 14), asc + desc + 18), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x = 7
    for ch, cw in zip(text, widths):
        if shadow:
            d.text((x + 2, 7), ch, font=f, fill=(0, 0, 0, 215))
        d.text((x, 4), ch, font=f, fill=fill)
        x += cw + tracking
    return layer


def fitted(text, path, size, fill, weight=700, tracking=0, max_w=850):
    while size > 24:
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


def rr_mask(size, radius):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1),
                                        radius=radius, fill=255)
    return m


def grad(size, c1, c2, diag=False):
    w, h = size
    yy, xx = np.mgrid[0:h, 0:w]
    k = ((xx / max(1, w - 1)) * 0.55 + (yy / max(1, h - 1)) * 0.45) if diag else (yy / max(1, h - 1))
    k = np.clip(k, 0, 1)[..., None]
    a = np.array(c1, dtype=np.float32)[None, None, :] * (1 - k) + np.array(c2, dtype=np.float32)[None, None, :] * k
    return Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGB').convert('RGBA')


def glass(size, accent, radius=28, alpha=238):
    w, h = size
    dark = tuple(int(c * 0.30 + 9) for c in accent)
    im = grad(size, (9, 24, 16), dark, diag=True)
    im.putalpha(ImageChops.multiply(im.getchannel('A'), rr_mask(size, radius)).point(lambda v: int(v * alpha / 255)))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((1, 1, w - 2, h - 2), radius=radius, outline=(*accent, 120), width=2)
    d.line((radius, 4, w - radius, 4), fill=(235, 255, 242, 55), width=2)
    return im


def shadow(size, radius=28, blur=24, opacity=150):
    lay = Image.new('RGBA', size, (0, 0, 0, 0))
    ImageDraw.Draw(lay).rounded_rectangle((6, 12, size[0] - 6, size[1] - 6),
                                          radius=radius, fill=(0, 0, 0, opacity))
    return lay.filter(ImageFilter.GaussianBlur(blur))


def chip(label, accent, size=26, pad=20):
    f = font(FONT_M, size, 700)
    t = text_layer(label, f, SITE_TEXT, 1)
    w, h = t.width + 2 * pad, t.height + 2 * pad - 6
    lay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=h // 2,
                        fill=(*accent, 42), outline=(*accent, 135), width=2)
    lay.paste(t, (pad, pad - 4), t.getchannel('A'))
    return lay


def icon(name, size, color, stroke=None):
    k, S = 3, size * 3
    pad = int(S * 0.13)
    c = (*color, 255)
    wd = int((stroke or max(2, size // 14)) * k)
    thin = max(1, wd // 2)
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    def P(x, y):
        return (int(pad + x * (S - 2 * pad)), int(pad + y * (S - 2 * pad)))

    if name == 'web':
        d.ellipse(P(0.05, 0.05) + P(0.95, 0.95), outline=c, width=thin)
        d.ellipse(P(0.30, 0.05) + P(0.70, 0.95), outline=c, width=thin)
        d.line([P(0.05, 0.5), P(0.95, 0.5)], fill=c, width=thin)
        d.line([P(0.06, 0.28), P(0.94, 0.28)], fill=c, width=thin)
        d.line([P(0.06, 0.72), P(0.94, 0.72)], fill=c, width=thin)
    elif name == 'design':
        d.polygon([P(0.5, 0.03), P(0.85, 0.35), P(0.58, 0.88), P(0.42, 0.88), P(0.15, 0.35)],
                  fill=(*color, 35), outline=c, width=thin)
        d.ellipse(P(0.40, 0.12) + P(0.60, 0.34), outline=c, width=thin)
        d.line([P(0.5, 0.34), P(0.5, 0.82)], fill=c, width=thin)
    elif name == 'doc':
        d.rounded_rectangle(P(0.14, 0.04) + P(0.86, 0.96), radius=int(S * 0.06),
                            fill=(*color, 28), outline=c, width=thin)
        for yy in (0.35, 0.50, 0.65, 0.80):
            d.line([P(0.27, yy), P(0.73, yy)], fill=c, width=thin)
        d.line([P(0.14, 0.24), P(0.86, 0.24)], fill=c, width=thin)
    elif name == 'play':
        d.ellipse(P(0.05, 0.05) + P(0.95, 0.95), outline=c, width=thin)
        d.polygon([P(0.40, 0.28), P(0.76, 0.5), P(0.40, 0.72)], fill=c)
    elif name == 'cart':
        d.line([P(0.06, 0.16), P(0.22, 0.16), P(0.34, 0.72), P(0.86, 0.72)], fill=c, width=wd)
        d.line([P(0.30, 0.34), P(0.94, 0.34)], fill=c, width=thin)
        d.ellipse(P(0.32, 0.78) + P(0.46, 0.92), fill=c)
        d.ellipse(P(0.72, 0.78) + P(0.86, 0.92), fill=c)
    elif name == 'check':
        d.ellipse(P(0.04, 0.04) + P(0.96, 0.96), outline=c, width=wd)
        d.line([P(0.26, 0.52), P(0.44, 0.70), P(0.76, 0.32)], fill=c, width=wd)
    elif name == 'download':
        d.line([P(0.5, 0.08), P(0.5, 0.66)], fill=c, width=wd)
        d.line([P(0.28, 0.46), P(0.5, 0.68), P(0.72, 0.46)], fill=c, width=wd)
        d.line([P(0.12, 0.84), P(0.88, 0.84)], fill=c, width=wd)
    elif name == 'bag':
        d.rounded_rectangle(P(0.12, 0.30) + P(0.88, 0.94), radius=int(S * 0.07),
                            fill=(*color, 30), outline=c, width=wd)
        d.arc(P(0.30, 0.08) + P(0.70, 0.52), start=185, end=355, fill=c, width=wd)
        d.line([P(0.12, 0.52), P(0.88, 0.52)], fill=c, width=thin)
    elif name == 'bolt':
        d.polygon([P(0.58, 0.02), P(0.22, 0.54), P(0.47, 0.54),
                   P(0.38, 0.98), P(0.80, 0.42), P(0.53, 0.42)], fill=c)
    elif name == 'spark':
        d.polygon([P(0.5, 0.02), P(0.60, 0.40), P(0.98, 0.5), P(0.60, 0.60),
                   P(0.5, 0.98), P(0.40, 0.60), P(0.02, 0.5), P(0.40, 0.40)], fill=c)
    elif name == 'search':
        d.ellipse(P(0.10, 0.10) + P(0.72, 0.72), outline=c, width=wd)
        d.line([P(0.68, 0.68), P(0.94, 0.94)], fill=c, width=wd)
    else:
        d.ellipse(P(0.15, 0.15) + P(0.85, 0.85), outline=c, width=wd)
    return im.resize((size, size), Image.Resampling.LANCZOS)


LOGO = Image.open(os.path.join(UI, 'logo.png')).convert('RGBA')
LOGO_SM = LOGO.resize((54, 54), Image.Resampling.LANCZOS)
LOGO_BIG = LOGO.resize((170, 170), Image.Resampling.LANCZOS)
LOGO_GLOW = LOGO_BIG.filter(ImageFilter.GaussianBlur(26))
BRAND = text_layer('MAXSELLER', font(FONT_M, 32, 700), SITE_TEXT, 8)

HEAD_LAYERS = [fitted(h, FONT_U, 64, SITE_TEXT, 800, 1) for h in HEADS]
SUB_LAYERS = [fitted(s, FONT_M, 33, (205, 230, 214), 600, 1) for s in SUBS]
COUNTERS = [text_layer(f'{i:02d} / 06', font(FONT_M, 24, 700), SITE_GREEN, 4)
            for i in range(1, 7)]

T = {
    'h1': fitted('ONLAYN XARID.', FONT_U, 70, SITE_TEXT, 800, 1),
    'h2': fitted('YANGI TAJRIBA.', FONT_U, 70, SITE_GREEN, 800, 1),
    'logo': fitted('MAXSELLER', FONT_U, 92, SITE_TEXT, 900, 10),
    'cta': fitted('Xaridni hoziroq boshlang!', FONT_M, 42, SITE_TEXT, 700),
    'url': fitted('maxseller.vercel.app', FONT_M, 40, SITE_GREEN, 700),
    'endsub': fitted('12 mahsulot · 4 yo‘nalish · 24/7', FONT_M, 25, SITE_MUTED, 600, 3),
}

# ---- real product covers (no prices, original artwork) ---------------------
COVERS = {}
for n in range(1, 13):
    COVERS[n] = Image.open(os.path.join(COVER_DIR, f'cover-{n:02d}.png')).convert('RGBA')
_COV = {}


def cover(n, w, h, radius=18):
    k = (n, w, h, radius)
    if k not in _COV:
        im = COVERS[n].resize((w, h), Image.Resampling.LANCZOS)
        im.putalpha(ImageChops.multiply(im.getchannel('A'), rr_mask((w, h), radius)))
        _COV[k] = im
    return _COV[k]


SW, SH = 270, 480
SY, SX = np.mgrid[0:SH, 0:SW]
GX, GY = SX / SW, SY / SH


def base_bg(accent, t, idx):
    a = np.empty((SH, SW, 3), dtype=np.float32)
    a[:] = SITE_BG
    fx = 0.72 + 0.05 * math.sin(t * 0.22 + idx)
    fy = 0.22 + 0.04 * math.cos(t * 0.20 + idx)
    g = np.exp(-(((GX - fx) / 0.62) ** 2 + ((GY - fy) / 0.58) ** 2) * 2.0) * 52
    a += g[..., None] * (np.array(accent, dtype=np.float32) / 255.0)
    g2 = np.exp(-(((GX - 0.16) / 0.55) ** 2 + ((GY - 0.88) / 0.5) ** 2) * 2.0) * 27
    a += g2[..., None] * (np.array(SITE_GREEN, dtype=np.float32) / 255.0)
    a += (np.sin(GX * 33 + idx) * np.sin(GY * 21 + idx * 2))[..., None] * 1.8
    im = Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGB').convert('RGBA')
    im = im.resize((W, H), Image.Resampling.BICUBIC)
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    for x in range(0, W + 120, 120):
        d.line((x, 0, x - 260, H), fill=(150, 230, 180, 9), width=1)
    im.alpha_composite(lay)
    return im


def card(frame, x, y, w, h, accent, radius=28, alpha=238):
    paste(frame, shadow((w, h), radius), x, y, alpha)
    frame.alpha_composite(glass((w, h), accent, radius, alpha), (int(x), int(y)))


# ---------------------------------------------------------------- scenes ----
def visual_brand(f, age, alpha):
    card(f, 120, 510, 840, 900, SITE_GREEN, 34, alpha)
    main = cover(1, 760, 475, 22)
    glow = main.filter(ImageFilter.GaussianBlur(30))
    paste(f, glow, 160, 555, alpha * 0.5)
    paste(f, main, 160, 555, alpha)
    paste(f, cover(4, 360, 225, 16), 160, 1060, alpha)
    paste(f, cover(10, 360, 225, 16), 560, 1060, alpha)
    c = chip('Haqiqiy mahsulotlar · haqiqiy do‘kon', SITE_GREEN, 25, 20)
    mid(f, c, 540, 1335, alpha)


def visual_categories(f, age, alpha):
    items = [('Veb', 1, (14, 165, 233)), ('Dizayn', 4, (168, 85, 247)),
             ('Hujjat', 7, (245, 158, 11)), ('Video', 10, (236, 72, 153))]
    w, h = 400, 430
    for j, (lab, n, col) in enumerate(items):
        x = 100 + (j % 2) * 480
        y = 510 + (j // 2) * 470
        card(f, x, y, w, h, col, 30, alpha)
        paste(f, cover(n, 360, 225, 16), x + 20, y + 48, alpha)
        t = fitted(lab, FONT_U, 42, SITE_TEXT, 800, 2, 340)
        mid(f, t, x + w / 2, y + 310, alpha)
        t2 = text_layer('Mahsulotlar bor', font(FONT_M, 25, 600), SITE_MUTED, 1)
        mid(f, t2, x + w / 2, y + 368, alpha)


def visual_catalog(f, age, alpha):
    items = [('Biznes landing page', 1, (34, 197, 94)),
             ('UI Kit: mobil ilova', 6, (99, 102, 241)),
             ('Noldan veb-dasturlash', 10, (239, 68, 68))]
    for j, (title, n, col) in enumerate(items):
        y = 510 + j * 330
        card(f, 130, y, 820, 300, col, 28, alpha)
        paste(f, cover(n, 300, 188, 16), 160, y + 56, alpha)
        t = fitted(title, FONT_U, 34, SITE_TEXT, 700, 1, 430)
        paste(f, t, 490, y + 72, alpha)
        t2 = text_layer('Tayyor fayl · 24/7', font(FONT_M, 27, 600), SITE_MUTED, 1)
        paste(f, t2, 490, y + 140, alpha)
        c = chip('Ko‘rish', col, 25, 18)
        paste(f, c, 490, y + 206, alpha)
    c = chip('Qidiruv · filter · 4 yo‘nalish', SITE_GREEN, 26, 22)
    mid(f, c, W / 2, 1510, alpha)


def visual_why(f, age, alpha):
    items = [('Bir joyda', '12 mahsulot', 'bag', 1, SITE_GREEN),
             ('Qulay tanlov', 'Katalog va filter', 'search', 6, (14, 165, 233)),
             ('Savat', 'Tanlab qo‘shish', 'cart', 4, (168, 85, 247)),
             ('Buyurtma', 'Onlayn, 24/7', 'check', 10, (236, 72, 153))]
    w, h = 400, 430
    for j, (title, sub, icn, n, col) in enumerate(items):
        x = 100 + (j % 2) * 480
        y = 510 + (j // 2) * 470
        card(f, x, y, w, h, col, 30, alpha)
        i = icon(icn, 86, col)
        paste(f, i, x + 36, y + 34, alpha)
        t = fitted(title, FONT_U, 36, SITE_TEXT, 800, 1, 300)
        paste(f, t, x + 140, y + 52, alpha)
        t2 = text_layer(sub, font(FONT_M, 24, 600), SITE_MUTED, 1)
        paste(f, t2, x + 36, y + 150, alpha)
        paste(f, cover(n, 328, 205, 14), x + 36, y + 200, alpha)


def visual_how(f, age, alpha):
    steps = [('01', 'Saytga kiring', 'web', None, (14, 165, 233)),
             ('02', 'Mahsulot tanlang', 'search', 1, (99, 102, 241)),
             ('03', 'Savatga qo‘shing', 'cart', 6, (168, 85, 247)),
             ('04', 'Buyurtma bering', 'check', 10, SITE_GREEN)]
    for j, (num, label, icn, n, col) in enumerate(steps):
        y = 510 + j * 245
        card(f, 130, y, 820, 225, col, 26, alpha)
        nd = Image.new('RGBA', (86, 86), (0, 0, 0, 0))
        ImageDraw.Draw(nd).ellipse((0, 0, 85, 85), fill=(*col, 220))
        nt = text_layer(num, font(FONT_U, 30, 800), (5, 16, 10), 1, False)
        nd.paste(nt, (43 - nt.width // 2, 43 - nt.height // 2), nt.getchannel('A'))
        paste(f, nd, 160, y + 70, alpha)
        paste(f, icon(icn, 70, col), 280, y + 78, alpha)
        t = fitted(label, FONT_U, 36, SITE_TEXT, 700, 1, 340)
        paste(f, t, 380, y + 78, alpha)
        if n:
            paste(f, cover(n, 170, 106, 12), 770, y + 62, alpha)


def visual_success(f, age, alpha):
    card(f, 150, 540, 780, 880, SITE_GREEN, 32, alpha)
    paste(f, cover(1, 700, 438, 20), 190, 590, alpha)
    ic = icon('check', 150, SITE_GREEN, 14)
    paste(f, ic.filter(ImageFilter.GaussianBlur(20)), 465, 1050, alpha * 0.6)
    paste(f, ic, 465, 1050, alpha)
    t = fitted('Fayl tayyor!', FONT_U, 40, SITE_TEXT, 800, 2, 480)
    mid(f, t, 540, 1235, alpha)
    c = chip('Kabinetdan yuklab oling', SITE_GREEN, 25, 20)
    mid(f, c, 540, 1320, alpha)


VISUALS = [visual_brand, visual_categories, visual_catalog,
           visual_why, visual_how, visual_success]


def page_visual(idx, age):
    f = base_bg(ACC[idx], age, idx)
    VISUALS[idx](f, age, 1.0)
    return f


def draw_page_text(f, idx, age, alpha=1.0):
    lx = W / 2 - (54 + 20 + BRAND.width) // 2
    paste(f, LOGO_SM, lx, 175, alpha)
    mid(f, BRAND, lx + 54 + 20 + BRAND.width / 2, 183, alpha)
    mid(f, HEAD_LAYERS[idx], W / 2, 255, alpha * ease(age / 0.25))
    mid(f, SUB_LAYERS[idx], W / 2, 365, alpha * ease((age - 0.06) / 0.3))
    rule(f, W / 2, 435, 340 * ease((age - 0.08) / 0.3), alpha, ACC[idx])
    paste(f, COUNTERS[idx], W - COUNTERS[idx].width - 70, 190, alpha * 0.95)


def intro_visual(t):
    f = base_bg(SITE_GREEN, t, 0)
    # Two real covers, one at a time, with a gentle 3D push.
    for j, n in enumerate((1, 10)):
        st = 0.20 + j * 1.05
        if t < st or t > st + 1.15:
            continue
        u = clamp((t - st) / 0.35)
        s = 1.16 - 0.16 * ease((t - st) / 0.4)
        w, h = int(620 * s), int(388 * s)
        im = cover(n, w, h, 22)
        a = ease((t - st) / 0.18) * (1 - ease((t - (st + 0.92)) / 0.22))
        paste(f, im, W / 2 - w / 2, 740 + j * 10, a * 0.96)
    return f


def draw_intro_text(f, t, alpha=1.0):
    mid(f, T['h1'], W / 2, 320, alpha * ease((t - 0.10) / 0.35))
    mid(f, T['h2'], W / 2, 420, alpha * ease((t - 0.30) / 0.35))
    rule(f, W / 2, 555, 430 * ease((t - 0.55) / 0.3), alpha)
    lx = W / 2 - (54 + 20 + BRAND.width) // 2
    paste(f, LOGO_SM, lx, 620, alpha)
    mid(f, BRAND, lx + 54 + 20 + BRAND.width / 2, 628, alpha)


def outro_visual(t):
    return base_bg(SITE_GREEN, t, 7)


def draw_outro_text(f, age, alpha=1.0):
    p = ease(age / 0.35)
    paste(f, LOGO_GLOW, W / 2 - LOGO_GLOW.width / 2, 360, alpha * p * 0.6)
    paste(f, LOGO_BIG, W / 2 - LOGO_BIG.width / 2, 360, alpha * p)
    mid(f, T['logo'], W / 2, 580, alpha * p)
    rule(f, W / 2, 730, 620 * ease((age - 0.25) / 0.35), alpha)
    mid(f, T['cta'], W / 2, 820, alpha * ease((age - 0.4) / 0.35))
    mid(f, T['url'], W / 2, 930, alpha * ease((age - 0.65) / 0.35))
    mid(f, T['endsub'], W / 2, 1030, alpha * ease((age - 0.95) / 0.35))


# ------------------------------------------------ cinematic transitions -----
FULL = [(0, 0), (W, 0), (W, H), (0, H)]


def quad(cx, cy, w, h, deg):
    a = math.radians(deg)
    out = []
    for px, py in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)):
        out.append((cx + px * math.cos(a) - py * math.sin(a),
                    cy + px * math.sin(a) + py * math.cos(a)))
    return out


def warp(img, dest):
    A, b = [], []
    for (x, y), (u, v) in zip(dest, FULL):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.append(u)
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y]); b.append(v)
    c = np.linalg.solve(np.array(A, dtype=np.float64), np.array(b, dtype=np.float64))
    return img.transform((W, H), Image.Transform.PERSPECTIVE, c.tolist(),
                         Image.Resampling.BICUBIC)


def zoom(img, s, cx=0.5, cy=0.5):
    if s <= 1.002:
        return img.copy()
    nw, nh = int(W * s), int(H * s)
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    out.paste(img.resize((nw, nh), Image.Resampling.BILINEAR),
              (int(W / 2 - cx * nw), int(H / 2 - cy * nh)))
    return out


def motion_blur(img, amount):
    if amount < 0.8:
        return img
    a = np.asarray(img, dtype=np.float32)
    out = np.zeros_like(a)
    n = 7
    for k in range(n):
        d = int(round(amount * (k - (n - 1) / 2) / ((n - 1) / 2)))
        out += np.roll(a, d, axis=1) / n
    edge = max(1, int(amount))
    out[:, :edge] = 0
    out[:, -edge:] = 0
    return Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGBA')


def wipe(pos, soft=0.05):
    m = 1.0 / (1.0 + np.exp(-(pos - (GX + 0.52 * GY)) / soft))
    return Image.fromarray(np.clip(m * 255, 0, 255).astype(np.uint8), 'L').resize(
        (W, H), Image.Resampling.BICUBIC)


def sweep(frame, u, accent, power=85, pos=None, soft=0.065):
    p = (u * 1.9 - 0.25) if pos is None else pos
    m = np.exp(-(((GX + 0.52 * GY - p) / soft) ** 2))
    lay = np.zeros((SH, SW, 4), dtype=np.float32)
    lay[:, :, :3] = accent
    lay[:, :, 3] = m * power
    lay = Image.fromarray(lay.clip(0, 255).astype(np.uint8), 'RGBA').resize(
        (W, H), Image.Resampling.BICUBIC)
    frame.alpha_composite(lay)
    return frame


def poly_mask(poly, blur=18):
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    return m.filter(ImageFilter.GaussianBlur(blur)) if blur else m


_rng = np.random.default_rng(19)
PARTS = [(float(_rng.random()), float(_rng.random()), int(_rng.choice([3, 5, 9, 16])),
          float(_rng.random() * 6.28)) for _ in range(64)]
_GLOW = {}
for s in (3, 5, 9, 16):
    g = Image.new('RGBA', (s * 8, s * 8), (0, 0, 0, 0))
    ImageDraw.Draw(g).ellipse((s * 2, s * 2, s * 6, s * 6), fill=(255, 255, 255, 210))
    _GLOW[s] = g.filter(ImageFilter.GaussianBlur(s * 0.8))


def particles(frame, u, accent, n=32, converge=False):
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    k = smooth(u)
    for i in range(n):
        px, py, sz, ph = PARTS[i]
        if converge:
            x = px * (1 - k) + 0.5 * k
            y = py * (1 - k) + 0.48 * k
        else:
            x = (px + 0.05 * math.sin(ph + u * 3)) % 1.0
            y = (py - 0.06 * k) % 1.0
        g = _GLOW[sz]
        a = g.getchannel('A').point(lambda v: int(v * (0.7 if sz <= 5 else 0.3)))
        tinted = Image.new('RGBA', g.size, (*accent, 0))
        tinted.putalpha(a)
        lay.paste(tinted, (int(x * W - g.width / 2), int(y * H - g.height / 2)), a)
    frame.alpha_composite(lay)
    return frame


def t0(out, inn, u, ao, ai, t):        # 3D camera dolly
    s = 1 - 0.50 * smooth(u)
    o = motion_blur(warp(out, quad(W / 2, H * 0.45, W * s, H * s, -7 * u)), 8 * u)
    i = zoom(inn, 1 + 0.85 * (1 - smooth(u)), 0.5, 0.5)
    return sweep(Image.blend(o, i, smooth(clamp((u - 0.08) / 0.78))), u, ai, 70)


def t1(out, inn, u, ao, ai, t):        # hexagon mask + depth particles
    o = motion_blur(out, 4 * u)
    cx, cy = W * 0.42, H * 0.48
    r = W * 1.3 * smooth(u)
    poly = [(cx + r * math.cos(math.radians(60 * k + 30)),
             cy + r * math.sin(math.radians(60 * k + 30))) for k in range(6)]
    f = Image.composite(inn, o, poly_mask(poly, 20))
    return particles(f, u, ai, 34)


def t2(out, inn, u, ao, ai, t):        # light-sweep wipe
    pos = u * 1.9 - 0.25
    o = motion_blur(ImageChops.offset(out, -int(90 * u), -int(28 * u)), 7 * u)
    f = Image.composite(inn, o, wipe(pos))
    return sweep(f, u, ai, 110, pos=pos, soft=0.055)


def t3(out, inn, u, ao, ai, t):        # multi-speed parallax strips
    f = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for j in range(3):
        y0, y1 = j * H // 3, (j + 1) * H // 3
        uj = smooth(clamp((u - j * 0.06) / 0.88))
        s = Image.blend(out.crop((0, y0, W, y1)), inn.crop((0, y0, W, y1)), uj)
        s = ImageChops.offset(s, int(65 * (1 - uj) * (1 if j % 2 else -1)), 0)
        f.paste(s, (0, y0))
    return particles(f, u, ai, 22)


def t4(out, inn, u, ao, ai, t):        # rotating iris + rays
    o = motion_blur(zoom(out, 1 + 0.45 * u).rotate(-9 * u, resample=Image.Resampling.BICUBIC,
                                                  fillcolor=(0, 0, 0, 0)), 6 * u)
    i = inn.rotate(8 * (1 - u), resample=Image.Resampling.BICUBIC, fillcolor=(0, 0, 0, 0))
    r = W * 1.25 * smooth(u)
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).ellipse((W / 2 - r, H / 2 - r, W / 2 + r, H / 2 + r), fill=255)
    f = Image.composite(i, o, m.filter(ImageFilter.GaussianBlur(22)))
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    for k in range(16):
        ang = math.radians(k * 22.5 + u * 26)
        d.line((W / 2 + math.cos(ang) * r * 0.5, H / 2 + math.sin(ang) * r * 0.5,
                W / 2 + math.cos(ang) * r, H / 2 + math.sin(ang) * r),
               fill=(*ai, int(38 * (1 - u))), width=3)
    f.alpha_composite(lay.filter(ImageFilter.GaussianBlur(2)))
    return f


def t5(out, inn, u, ao, ai, t):        # match-cut zoom + subtle chromatic
    o = motion_blur(zoom(out, 1 + 1.15 * smooth(u), 0.42, 0.55), 11 * u)
    i = zoom(inn, 1 + 0.7 * (1 - smooth(u)), 0.58, 0.45)
    f = Image.blend(o, i, smooth(clamp((u - 0.05) / 0.85)))
    d = int(4 * math.sin(math.pi * u))
    if d:
        a = np.asarray(f).copy()
        a[:, :, 0] = np.roll(a[:, :, 0], d, axis=1)
        a[:, :, 2] = np.roll(a[:, :, 2], -d, axis=1)
        f = Image.fromarray(a, 'RGBA')
    return particles(f, u, ai, 26)


def t6(out, inn, u, ao, ai, t):        # final convergence
    pos = u * 1.9 - 0.25
    o = motion_blur(zoom(out, 1 + 0.6 * u), 9 * u)
    i = zoom(inn, 1 + 0.5 * (1 - smooth(u)))
    f = Image.composite(i, o, wipe(pos))
    f = sweep(f, u, ai, 125, pos=pos, soft=0.055)
    return particles(f, u, ai, 44, converge=True)


EFFECTS = [t0, t1, t2, t3, t4, t5, t6]
BOUNDS = [INTRO] + [INTRO + (k + 1) * SLOT for k in range(5)] + [OUTRO]


def frame_at(t):
    if t < INTRO:
        f = intro_visual(t)
        draw_intro_text(f, t)
        return f
    if t >= OUTRO:
        f = outro_visual(t - OUTRO)
        draw_outro_text(f, t - OUTRO)
        return f
    for k, B in enumerate(BOUNDS):
        if abs(t - B) <= TR / 2:
            u = clamp((t - (B - TR / 2)) / TR)
            oi, ii = k - 1, k
            ao = ACC[oi] if oi >= 0 else SITE_GREEN
            ai = ACC[ii] if ii < 6 else SITE_GREEN
            out = intro_visual(t) if oi < 0 else page_visual(oi, SLOT)
            inn = outro_visual(0) if ii >= 6 else page_visual(ii, 0)
            f = EFFECTS[k](out, inn, u, ao, ai, t)
            if oi < 0:
                if u < 0.5:
                    draw_intro_text(f, t, 1 - u / 0.5)
            elif u < 0.5:
                draw_page_text(f, oi, SLOT, 1 - u / 0.5)
            if u >= 0.5:
                if ii < 6:
                    draw_page_text(f, ii, 0, (u - 0.5) / 0.5)
                else:
                    draw_outro_text(f, max(0.0, t - OUTRO), (u - 0.5) / 0.5)
            return f
    idx = min(5, int((t - INTRO) / SLOT))
    age = t - (INTRO + idx * SLOT)
    f = page_visual(idx, age)
    draw_page_text(f, idx, age)
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
    for t in [1.0, 4.5, 9.0, 13.6, 18.1, 22.6, 27.2, 30.8, 32.4]:
        frame_at(t).convert('RGB').save(os.path.join(WORK, f'v7_{t:.1f}.png'))
    print('preview frames written')
else:
    render()
