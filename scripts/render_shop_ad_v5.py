"""MAXSELLER shop ad v5 — fully original generated design.

No site screenshots, no product cover images, no UI slices.
Every visual is drawn procedurally (glass cards, icons, gradients, mock
illustrations). Real product names and prices only as text.
6 large pages, minimal motion, logo on every screen, music only.
"""
import math
import os
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

TEMP = os.environ.get('TEMP', '.')
WORK = os.path.join(TEMP, 'maxseller-shop-ad')
UI = os.path.join(WORK, 'ui')
FONTS = os.path.join(os.path.dirname(WORK), 'maxseller-commercial', 'fonts')
OUT = os.path.join(WORK, 'video-only-v5.mp4')

W, H, FPS = 1080, 1920, 30
BEAT = 0.6966
INTRO = 3 * BEAT               # 2.0898 s
SLOT = 7 * BEAT                # 4.8762 s per page
OUTRO = INTRO + 6 * SLOT       # 30.3468 s
END = OUTRO + 3 * BEAT         # 33.4368 s
FRAMES = round(END * FPS)
TR = 0.32                      # gentle crossfade only

FONT_U = os.path.join(FONTS, 'Unbounded.ttf')
FONT_M = os.path.join(FONTS, 'Manrope.ttf')

SITE_BG = (5, 16, 10)
SITE_GREEN = (34, 224, 90)
SITE_TEXT = (234, 245, 238)
SITE_MUTED = (144, 169, 154)
ACC = [(34, 224, 90), (14, 165, 233), (99, 102, 241),
       (34, 197, 94), (236, 72, 153), (34, 211, 238)]

HEADS = ["MAXSELLER — ONLAYN DO'KON", 'KATEGORIYALAR', 'MAHSULOTLARNI TANLANG',
         'MAHSULOT SAHIFASI', "BUYURTMA VA TO'LOV", 'FAYL SIZGA KELADI']
SUBS = ['12 mahsulot · 4 yo‘nalish', 'Veb · Dizayn · Hujjat · Video',
        'Qidiruv · filter · savatga qo‘shish', "Biznes landing page · 150 000 so'm",
        'Savat · aloqa · to‘lov usuli', 'Buyurtma qabul qilindi · kabinetdan yuklang']

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
    elif name == 'user':
        d.ellipse(P(0.30, 0.08) + P(0.70, 0.48), outline=c, width=wd)
        d.ellipse(P(0.10, 0.52) + P(0.90, 1.02), outline=c, width=wd)
    elif name == 'card':
        d.rounded_rectangle(P(0.04, 0.18) + P(0.96, 0.82), radius=int(S * 0.08),
                            fill=(*color, 30), outline=c, width=thin)
        d.line([P(0.04, 0.38), P(0.96, 0.38)], fill=c, width=thin)
        d.rounded_rectangle(P(0.12, 0.58) + P(0.36, 0.68), radius=int(S * 0.02), fill=c)
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
    elif name == 'filter':
        for yy, xx in ((0.28, 0.30), (0.5, 0.68), (0.72, 0.42)):
            d.line([P(0.08, yy), P(0.92, yy)], fill=c, width=thin)
            d.ellipse(P(xx - 0.09, yy - 0.09) + P(xx + 0.09, yy + 0.09), fill=c)
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
    'h1': fitted('XARID QILISHNING', FONT_U, 66, SITE_TEXT, 800, 1),
    'h2': fitted('QULAY USULI!', FONT_U, 76, SITE_GREEN, 800, 1),
    'introsub': fitted('Faqat mijozlar uchun onlayn do‘kon', FONT_M, 28, SITE_MUTED, 600),
    'logo': fitted('MAXSELLER', FONT_U, 92, SITE_TEXT, 900, 10),
    'cta': fitted('Onlayn xaridni hoziroq boshlang!', FONT_M, 40, SITE_TEXT, 700),
    'url': fitted('https://maxseller.vercel.app/', FONT_M, 37, SITE_GREEN, 700),
    'endsub': fitted('12 mahsulot · 4 yo‘nalish · 24/7', FONT_M, 25, SITE_MUTED, 600, 3),
}

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


def brand_row(frame, alpha=1.0, y=175):
    lx = W / 2 - (54 + 20 + BRAND.width) // 2
    paste(frame, LOGO_SM, lx, y, alpha)
    mid(frame, BRAND, lx + 54 + 20 + BRAND.width / 2, y + 8, alpha)


def card(frame, x, y, w, h, accent, radius=28, alpha=238):
    paste(frame, shadow((w, h), radius), x, y, alpha)
    g = glass((w, h), accent, radius, alpha)
    frame.alpha_composite(g, (int(x), int(y)))


def art_tile(w, h, accent, icon_name='web', mark=None):
    im = grad((w, h), (7, 26, 16), tuple(int(c * 0.42 + 8) for c in accent), diag=True)
    im.putalpha(rr_mask((w, h), 22))
    d = ImageDraw.Draw(im)
    for j in range(3):
        r = int(min(w, h) * (0.30 + j * 0.13))
        d.ellipse((w // 2 - r, h // 2 - r, w // 2 + r, h // 2 + r),
                  outline=(*accent, 55 - j * 13), width=2)
    ic = icon(icon_name, int(min(w, h) * 0.44), accent)
    im.paste(ic, (w // 2 - ic.width // 2, h // 2 - ic.height // 2), ic.getchannel('A'))
    if mark:
        t = text_layer(mark, font(FONT_M, 22, 700), SITE_TEXT, 3)
        im.paste(t, (w // 2 - t.width // 2, h - t.height - 24), t.getchannel('A'))
    return im


# ---------------------------------------------------------------- visuals --
def visual_hero(f, age, alpha):
    card(f, 140, 510, 800, 1010, SITE_GREEN, 34, alpha)
    at = art_tile(740, 570, SITE_GREEN, 'bag')
    at.putalpha(ImageChops.multiply(at.getchannel('A'), rr_mask((740, 570), 24)))
    f.alpha_composite(at, (170, 550))
    t = text_layer('DIGITAL STORE', font(FONT_M, 30, 700), SITE_MUTED, 9)
    mid(f, t, 540, 1145, alpha)
    labels = [('Veb', 'web'), ('Dizayn', 'design'), ('Hujjat', 'doc'), ('Video', 'play')]
    chips = []
    for label, icn in labels:
        c = chip(label, SITE_GREEN, 26, 22)
        i = icon(icn, 30, SITE_GREEN)
        lay = Image.new('RGBA', (i.width + 12 + c.width, c.height), (0, 0, 0, 0))
        lay.paste(i, (0, (c.height - i.height) // 2), i.getchannel('A'))
        lay.paste(c, (i.width + 12, 0), c.getchannel('A'))
        chips.append(lay)
    total = sum(c.width for c in chips) + 16 * (len(chips) - 1)
    x = W / 2 - total / 2
    for c in chips:
        paste(f, c, x, 1220, alpha)
        x += c.width + 16
    for x0, y0, lab, icn, col in ((52, 700, '24/7', 'bolt', (34, 211, 238)),
                                 (872, 930, 'Tezkor', 'spark', (245, 158, 11))):
        card(f, x0, y0, 158, 132, col, 24, alpha)
        i = icon(icn, 46, col)
        paste(f, i, x0 + 56, y0 + 16, alpha)
        t = text_layer(lab, font(FONT_M, 22, 700), SITE_TEXT, 1)
        mid(f, t, x0 + 79, y0 + 76, alpha)


def visual_categories(f, age, alpha):
    items = [('Veb', '3 mahsulot', 'web', (14, 165, 233)),
             ('Dizayn', '3 mahsulot', 'design', (168, 85, 247)),
             ('Hujjat', '3 mahsulot', 'doc', (245, 158, 11)),
             ('Video', '3 mahsulot', 'play', (236, 72, 153))]
    w, h = 400, 430
    for j, (lab, sub, icn, col) in enumerate(items):
        x = 100 + (j % 2) * 480
        y = 510 + (j // 2) * 470
        card(f, x, y, w, h, col, 32, alpha)
        i = icon(icn, 120, col)
        glow = i.filter(ImageFilter.GaussianBlur(18))
        paste(f, glow, x + w / 2 - 60, y + 55, alpha * 0.55)
        paste(f, i, x + w / 2 - 60, y + 55, alpha)
        t = fitted(lab, FONT_U, 42, SITE_TEXT, 800, 2, 340)
        mid(f, t, x + w / 2, y + 205, alpha)
        t2 = text_layer(sub, font(FONT_M, 26, 600), SITE_MUTED, 1)
        mid(f, t2, x + w / 2, y + 282, alpha)
    c = chip('Jami 12 ta mahsulot', SITE_GREEN, 28, 24)
    mid(f, c, W / 2, 1490, alpha)


def visual_catalog(f, age, alpha):
    items = [('Biznes landing page', "150 000 so'm", 'web', (34, 197, 94)),
             ('UI Kit: mobil ilova', "180 000 so'm", 'design', (99, 102, 241)),
             ('Noldan veb-dasturlash', "200 000 so'm", 'play', (239, 68, 68))]
    for j, (title, price, icn, col) in enumerate(items):
        y = 510 + j * 330
        card(f, 130, y, 820, 300, col, 30, alpha)
        at = art_tile(220, 220, col, icn)
        f.alpha_composite(at, (165, y + 40))
        t = fitted(title, FONT_U, 34, SITE_TEXT, 700, 1, 500)
        paste(f, t, 420, y + 52, alpha)
        tp = text_layer(price, font(FONT_M, 31, 700), SITE_GREEN, 1)
        paste(f, tp, 420, y + 120, alpha)
        c = chip('Savatga +', col, 25, 18)
        paste(f, c, 420, y + 188, alpha)
    c = chip('Qidiruv · filter · 4 yo‘nalish', SITE_GREEN, 26, 22)
    mid(f, c, W / 2, 1510, alpha)


def visual_product(f, age, alpha):
    col = (34, 197, 94)
    card(f, 120, 510, 840, 910, col, 34, alpha)
    # original illustration: stylised browser window (drawn, not a screenshot)
    win = grad((760, 560), (8, 30, 18), (13, 58, 32), diag=True)
    win.putalpha(rr_mask((760, 560), 24))
    d = ImageDraw.Draw(win)
    d.rounded_rectangle((0, 0, 759, 64), radius=24, fill=(16, 48, 28, 255))
    d.rectangle((0, 38, 759, 64), fill=(16, 48, 28, 255))
    for j, cc in enumerate(((255, 110, 110), (255, 200, 90), (90, 230, 140))):
        x = 30 + j * 34
        d.ellipse((x, 24, x + 16, 40), fill=(*cc, 255))
    d.rounded_rectangle((24, 92, 200, 536), radius=14, fill=(12, 40, 23, 255))
    for j in range(5):
        y = 124 + j * 56
        d.rounded_rectangle((44, y, 180 - (j % 3) * 22, y + 18), radius=8,
                            fill=(34, 130, 70, 190 if j == 0 else 110))
    d.rounded_rectangle((226, 92, 736, 300), radius=18, fill=(19, 72, 38, 255))
    d.rounded_rectangle((250, 120, 560, 150), radius=12, fill=(*SITE_GREEN, 210))
    d.rounded_rectangle((250, 172, 700, 192), radius=8, fill=(150, 210, 170, 110))
    d.rounded_rectangle((250, 208, 640, 228), radius=8, fill=(150, 210, 170, 90))
    d.rounded_rectangle((226, 324, 736, 536), radius=18, fill=(19, 72, 38, 255))
    d.rounded_rectangle((250, 356, 430, 470), radius=12, fill=(*SITE_GREEN, 150))
    d.rounded_rectangle((456, 356, 700, 386), radius=8, fill=(150, 210, 170, 120))
    d.rounded_rectangle((456, 404, 660, 424), radius=8, fill=(150, 210, 170, 90))
    d.rounded_rectangle((456, 444, 560, 478), radius=10, fill=(*SITE_GREEN, 200))
    f.alpha_composite(win, (160, 545))
    p = text_layer("150 000 so'm", font(FONT_U, 52, 800), SITE_GREEN, 2)
    paste(f, p, 165, 1160, alpha)
    c = chip('Savatga qo‘shish', col, 27, 24)
    paste(f, c, 560, 1170, alpha)
    c2 = chip('Tayyor fayl · 24/7', SITE_GREEN, 25, 22)
    mid(f, c2, W / 2, 1500, alpha)


def visual_checkout(f, age, alpha):
    steps = [('Savat', 'Mahsulotlaringiz', 'cart', (14, 165, 233)),
             ('Aloqa', 'Ism va telefon', 'user', (168, 85, 247)),
             ('To‘lov', 'Chek yuklash', 'card', (245, 158, 11))]
    d = ImageDraw.Draw(f)
    d.line((300, 660, 300, 1360), fill=(*SITE_GREEN, 110), width=4)
    for j, (lab, sub, icn, col) in enumerate(steps):
        cy = 660 + j * 350
        card(f, 150, cy - 115, 780, 230, col, 30, alpha)
        ic = icon(icn, 104, col)
        glow = ic.filter(ImageFilter.GaussianBlur(20))
        paste(f, glow, 228, cy - 52, alpha * 0.6)
        paste(f, ic, 228, cy - 52, alpha)
        t = fitted(lab, FONT_U, 42, SITE_TEXT, 800, 2, 330)
        paste(f, t, 400, cy - 76, alpha)
        t2 = text_layer(sub, font(FONT_M, 28, 600), SITE_MUTED, 1)
        paste(f, t2, 400, cy - 8, alpha)
        num = text_layer(f'0{j+1}', font(FONT_U, 30, 800), col, 2)
        paste(f, num, 850, cy - 62, alpha)


def visual_success(f, age, alpha):
    glow = Image.new('RGBA', (420, 420), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((10, 10, 410, 410), fill=(*SITE_GREEN, 70))
    glow = glow.filter(ImageFilter.GaussianBlur(48))
    f.alpha_composite(glow, (330, 570))
    ring = Image.new('RGBA', (360, 360), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    rd.ellipse((0, 0, 359, 359), fill=(9, 40, 22, 245), outline=(*SITE_GREEN, 230), width=8)
    f.alpha_composite(ring, (360, 600))
    ic = icon('check', 190, SITE_GREEN, 16)
    paste(f, ic, 445, 685, alpha)
    card(f, 150, 1030, 780, 450, SITE_GREEN, 32, alpha)
    ic2 = icon('download', 116, SITE_GREEN)
    paste(f, ic2, 192, 1090, alpha)
    t = fitted('Fayl tayyor!', FONT_U, 42, SITE_TEXT, 800, 2, 520)
    paste(f, t, 340, 1090, alpha)
    t2 = text_layer('Kabinetdan yuklab oling', font(FONT_M, 28, 600), SITE_MUTED, 1)
    paste(f, t2, 340, 1170, alpha)
    c = chip('Faylni olish', SITE_GREEN, 27, 24)
    paste(f, c, 340, 1240, alpha)
    c2 = chip('24/7 avtomatik yetkazish', SITE_GREEN, 25, 22)
    mid(f, c2, W / 2, 1530, alpha)


VISUALS = [visual_hero, visual_categories, visual_catalog,
           visual_product, visual_checkout, visual_success]


def page_visual(idx, age):
    f = base_bg(ACC[idx], age, idx)
    VISUALS[idx](f, age, 1.0)
    return f


def draw_page_text(f, idx, age, alpha=1.0):
    brand_row(f, alpha)
    mid(f, HEAD_LAYERS[idx], W / 2, 255, alpha * ease(age / 0.25))
    mid(f, SUB_LAYERS[idx], W / 2, 365, alpha * ease((age - 0.06) / 0.3))
    rule(f, W / 2, 435, 340 * ease((age - 0.08) / 0.3), alpha, ACC[idx])
    paste(f, COUNTERS[idx], W - COUNTERS[idx].width - 70, 190, alpha * 0.95)


def intro_visual(t):
    f = base_bg(SITE_GREEN, t, 0)
    items = [(150, 780, 310, 210, 'spark', SITE_GREEN),
             (620, 860, 310, 210, 'bolt', (34, 211, 238)),
             (370, 1120, 340, 240, 'bag', (168, 85, 247))]
    for j, (x, y, w, h, icn, col) in enumerate(items):
        dy = int(9 * math.sin(t * 0.7 + j * 1.8))
        card(f, x, y + dy, w, h, col, 28, 0.95)
        i = icon(icn, 92, col)
        paste(f, i, x + w / 2 - 46, y + dy + 40, 1.0)
        t2 = text_layer(('Tezkor', '24/7', 'Xarid')[j], font(FONT_M, 28, 700), SITE_TEXT, 2)
        mid(f, t2, x + w / 2, y + dy + 145, 1.0)
    return f


def draw_intro_text(f, t, alpha=1.0):
    mid(f, T['h1'], W / 2, 330, alpha * ease((t - 0.15) / 0.4))
    mid(f, T['h2'], W / 2, 430, alpha * ease((t - 0.35) / 0.4))
    rule(f, W / 2, 560, 420 * ease((t - 0.6) / 0.35), alpha)
    mid(f, T['introsub'], W / 2, 620, alpha * ease((t - 0.75) / 0.35))
    brand_row(f, alpha)


def outro_visual(t):
    return base_bg(SITE_GREEN, t, 7)


def draw_outro_text(f, age, alpha=1.0):
    p = ease(age / 0.3)
    paste(f, LOGO_GLOW, W / 2 - LOGO_GLOW.width / 2, 380, alpha * p * 0.6)
    paste(f, LOGO_BIG, W / 2 - LOGO_BIG.width / 2, 380, alpha * p)
    mid(f, T['logo'], W / 2, 600, alpha * p)
    rule(f, W / 2, 760, 600 * ease((age - 0.2) / 0.35), alpha)
    mid(f, T['cta'], W / 2, 850, alpha * ease((age - 0.35) / 0.35))
    mid(f, T['url'], W / 2, 960, alpha * ease((age - 0.6) / 0.35))
    mid(f, T['endsub'], W / 2, 1060, alpha * ease((age - 0.85) / 0.35))


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
            out = intro_visual(t) if oi < 0 else page_visual(oi, SLOT)
            inn = outro_visual(0) if ii >= 6 else page_visual(ii, 0)
            f = Image.blend(out, inn, ease(u))
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
    f = page_visual(idx, t - (INTRO + idx * SLOT))
    draw_page_text(f, idx, t - (INTRO + idx * SLOT))
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
    for t in [1.2, 4.2, 9.0, 13.9, 18.8, 23.6, 28.5, 31.5, 32.7]:
        frame_at(t).convert('RGB').save(os.path.join(WORK, f'v5_{t:.1f}.png'))
    print('preview frames written')
else:
    render()
