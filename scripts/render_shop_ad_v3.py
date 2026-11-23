"""MAXSELLER shop ad v3 — cinematic motion design, real site palette, sequential intro.

Music only. 10 real customer pages shown one by one. No admin screens.
"""
import math
import os
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps, ImageEnhance, ImageChops

TEMP = os.environ.get('TEMP', '.')
WORK = os.path.join(TEMP, 'maxseller-shop-ad')
UI = os.path.join(WORK, 'ui')
FONTS = os.path.join(os.path.dirname(WORK), 'maxseller-commercial', 'fonts')
COVERS = os.path.join(os.path.dirname(WORK), 'maxseller-commercial', 'covers')
OUT = os.path.join(WORK, 'video-only-v3.mp4')

W, H, FPS = 1080, 1920, 30
BEAT = 0.6966
INTRO = 4 * BEAT
SLOT = 4 * BEAT
OUTRO = INTRO + 10 * SLOT
END = OUTRO + 4 * BEAT
FRAMES = round(END * FPS)
TR = 0.52  # transition length, centred on the beat boundary

FONT_U = os.path.join(FONTS, 'Unbounded.ttf')
FONT_M = os.path.join(FONTS, 'Manrope.ttf')

# Exact values from src/shared/styles.css + scripts/generate-covers.mjs
SITE_BG = (5, 16, 10)
SITE_GREEN = (34, 224, 90)
SITE_TEXT = (234, 245, 238)
SITE_MUTED = (144, 169, 154)
ACC = [
    (34, 224, 90),    # 1 hero — brand green
    (14, 165, 233),   # 2 categories — sky
    (99, 102, 241),   # 3 catalog — indigo
    (22, 163, 74),    # 4 web product — green
    (239, 68, 68),    # 5 video product — red
    (245, 158, 11),   # 6 how-to — amber
    (20, 184, 166),   # 7 features — teal
    (236, 72, 153),   # 8 cart/checkout — pink
    (34, 211, 238),   # 9 success — cyan
    (139, 92, 246),   # 10 order/download — violet
    (34, 224, 90),    # outro — brand green
]

PAGES = [
    ('shop-hero.png',        "MAXSELLER — ONLAYN DO'KON", 'Raqamli mahsulotlar bir joyda!'),
    ('shop-categories.png',  "4 YO'NALISH",               'Veb · Dizayn · Hujjat · Video'),
    ('shop-catalog.png',     '12 TA MAHSULOT',            'Katalogdan osongina tanlang'),
    ('shop-product-1.png',   'BIZNES LANDING PAGE',       "150 000 so'm · Tayyor fayl"),
    ('shop-product-10.png',  'NOLDAN VEB-DASTURLASH',     "200 000 so'm · Video darslar"),
    ('shop-howto.png',       '4 QADAMDA BUYURTMA',        'Hammasi bir ko‘rishda tushunarli'),
    ('shop-features.png',    'NEGA MAXSELLER?',           'Tezkor · 24/7 · Sifat · Qulaylik'),
    ('shop-checkout.png',    "SAVATGA QO'SHING",          'Miqdorni tanlab, buyurtma bering'),
    ('shop-success.png',     'BUYURTMA QABUL QILINDI',    'Holatni kabinetingizda kuzating'),
    ('shop-order.png',       "TO'LOV VA FAYL",            'Chek yuklang, faylni oling'),
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


def smooth(t):
    t = clamp(t)
    return t * t * (3 - 2 * t)


def text_layer(text, f, fill, tracking=0, shadow=True):
    probe = ImageDraw.Draw(Image.new('RGBA', (1, 1)))
    widths = [probe.textbbox((0, 0), ch, font=f)[2] for ch in text]
    total = sum(widths) + tracking * max(0, len(text) - 1)
    asc, desc = f.getmetrics()
    layer = Image.new('RGBA', (max(1, total + 14), asc + desc + 20), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x = 7
    for ch, cw in zip(text, widths):
        if shadow:
            d.text((x + 2, 8), ch, font=f, fill=(0, 0, 0, 215))
        d.text((x, 5), ch, font=f, fill=fill)
        x += cw + tracking
    return layer


def fitted(text, path, size, fill, weight=700, tracking=0, max_w=980):
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


def rule(frame, cx, y, width, alpha=1.0, color=SITE_GREEN, thickness=4):
    if width <= 0:
        return
    layer = Image.new('RGBA', (int(width) + 2, thickness), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rectangle((0, 0, int(width), thickness - 1), fill=(*color, 255))
    paste(frame, layer, cx - width / 2, y, alpha)


# --------------------------------------------------------------------------
# Static assets
# --------------------------------------------------------------------------
def load_panel(path):
    im = Image.open(path).convert('RGB')
    im = ImageEnhance.Brightness(im).enhance(1.24)
    im = ImageEnhance.Contrast(im).enhance(1.06)
    return im.resize((1080, 1600), Image.Resampling.LANCZOS).convert('RGBA')


PANELS = [load_panel(os.path.join(UI, p[0])) for p in PAGES]
HEADS = [fitted(p[1], FONT_U, 66, SITE_TEXT, 800, 1) for p in PAGES]
SUBS = [fitted(p[2], FONT_M, 34, (205, 230, 214), 600, 1) for p in PAGES]
COUNTERS = [text_layer(f'{i:02d} / 10', font(FONT_M, 26, 700), SITE_GREEN, 4)
            for i in range(1, 11)]

COVER_KEYS = ['01', '04', '10']
COVERS_SM = []
for k in COVER_KEYS:
    im = Image.open(os.path.join(COVERS, f'cover-{k}.png')).convert('RGBA')
    COVERS_SM.append(im.resize((720, 450), Image.Resampling.LANCZOS))

LOGO = Image.open(os.path.join(UI, 'logo.png')).convert('RGBA')
LOGO_GLOW = LOGO.filter(ImageFilter.GaussianBlur(22))

T = {
    'brand': text_layer('MAXSELLER', font(FONT_M, 28, 700), SITE_GREEN, 10),
    'hook1': fitted('XARID QILISHNING', FONT_U, 68, SITE_TEXT, 800, 1),
    'hook2': fitted('QULAY USULI!', FONT_U, 78, SITE_GREEN, 800, 1),
    'hooksub': fitted('MAXSELLER · DIGITAL STORE', FONT_M, 26, SITE_MUTED, 600, 6),
    'logo': fitted('MAXSELLER', FONT_U, 104, SITE_TEXT, 900, 10),
    'logoglow': fitted('MAXSELLER', FONT_U, 104, SITE_GREEN, 900, 10).filter(ImageFilter.GaussianBlur(26)),
    'cta': fitted('Onlayn xaridni hoziroq boshlang!', FONT_M, 44, SITE_TEXT, 700),
    'url': fitted('https://maxseller.vercel.app/', FONT_M, 40, SITE_GREEN, 700),
    'endsub': fitted('12 mahsulot · 4 yo‘nalish · 24/7', FONT_M, 26, SITE_MUTED, 600, 3),
}

# Small-grid coordinates for fast gradients / masks
SW, SH = 270, 480
SY, SX = np.mgrid[0:SH, 0:SW]
GX = SX / SW
GY = SY / SH

# Precomputed overlays
_grid = Image.new('RGBA', (W, H), (0, 0, 0, 0))
_gd = ImageDraw.Draw(_grid)
for x in range(0, W + 90, 90):
    _gd.line((x, 0, x, H), fill=(140, 220, 165, 13), width=1)
for y in range(0, H + 90, 90):
    _gd.line((0, y, W, y), fill=(140, 220, 165, 13), width=1)
GRID = _grid

_v = np.ones((H, W), dtype=np.float32)
_vy, _vx = np.mgrid[0:H, 0:W]
_v -= 0.42 * (((_vx / W - 0.5) * 2) ** 2 + ((_vy / H - 0.5) * 2) ** 2)
VIG = Image.new('RGBA', (W, H), (0, 0, 0, 0))
arr = np.zeros((H, W, 4), dtype=np.uint8)
arr[:, :, 3] = np.clip((1 - _v) * 185, 0, 185).astype(np.uint8)
VIG = Image.fromarray(arr, 'RGBA')

_band = np.zeros((300, W, 4), dtype=np.uint8)
for y in range(300):
    _band[y, :, :3] = (3, 12, 7)
    _band[y, :, 3] = int(252 * (1 - y / 300) ** 0.55)
BAND = Image.fromarray(_band, 'RGBA')

_sheen = np.zeros((SH, SW, 4), dtype=np.float32)
_diag = GX + 0.55 * GY
_sheen[:, :, 3] = np.exp(-((_diag - 0.55) / 0.13) ** 2) * 30
_sheen[:, :, :3] = (200, 255, 220)
SHEEN = Image.fromarray(_sheen.clip(0, 255).astype(np.uint8), 'RGBA').resize((W, H), Image.Resampling.BICUBIC)

# Particle seeds (position, speed, size, phase)
_rng = np.random.default_rng(77)
PARTS = [(float(_rng.random()), float(_rng.random()), float(_rng.uniform(0.3, 1.4)),
          int(_rng.choice([3, 4, 6, 10, 18])), float(_rng.random() * 6.28))
         for _ in range(85)]
GLOWS = {}
for s in (3, 4, 6, 10, 18):
    g = Image.new('RGBA', (s * 8, s * 8), (0, 0, 0, 0))
    ImageDraw.Draw(g).ellipse((s * 2, s * 2, s * 6, s * 6), fill=(255, 255, 255, 210))
    GLOWS[s] = g.filter(ImageFilter.GaussianBlur(s * 0.8))


def make_bg(accent, t, idx):
    a = np.empty((SH, SW, 3), dtype=np.float32)
    a[:] = SITE_BG
    glows = [
        (0.78 + 0.09 * math.sin(t * 0.7 + idx), 0.07 + 0.05 * math.cos(t * 0.6 + idx),
         0.56, accent, 66),
        (0.12 + 0.07 * math.cos(t * 0.55 + idx * 1.7), 0.91 + 0.04 * math.sin(t * 0.5),
         0.52, SITE_GREEN, 42),
        (0.46 + 0.22 * math.sin(t * 0.4 + idx), 0.48, 0.46, accent, 21),
    ]
    for fx, fy, r, col, inten in glows:
        g = np.exp(-(((GX - fx) / r) ** 2 + ((GY - fy) / r) ** 2) * 2.1) * inten
        a += g[..., None] * (np.array(col, dtype=np.float32) / 255.0)
    flash = math.exp(-max(0.0, t) * 11) * 32
    a += flash * np.array(accent, dtype=np.float32) / 255.0
    bg = Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGB').convert('RGBA')
    bg = bg.resize((W, H), Image.Resampling.BICUBIC)
    bg.alpha_composite(ImageChops.offset(GRID, int(t * 13) % 90, int(t * 7) % 90))
    for px, py, sp, sz, ph in PARTS:
        x = (px + t * 0.010 * sp + 0.02 * math.sin(t * 0.8 + ph)) % 1.0
        y = (py - t * 0.016 * sp) % 1.0
        spr = GLOWS[sz].copy()
        spr.putalpha(spr.getchannel('A').point(lambda v: int(v * (0.25 if sz > 6 else 0.5))))
        bg.paste(spr, (int(x * W - spr.width / 2), int(y * H - spr.height / 2)), spr.getchannel('A'))
    bg.alpha_composite(VIG)
    return bg


def panel_view(panel, age, idx):
    s = 1.03 + 0.045 * math.sin(age / SLOT * math.pi)
    pw, ph = int(1080 * s), int(1600 * s)
    im = panel.resize((pw, ph), Image.Resampling.BILINEAR)
    dx = int((pw - 1080) * (0.5 + 0.12 * math.sin(age * 0.7 + idx)))
    dy = int((ph - 1600) * (0.5 + 0.10 * math.cos(age * 0.6 + idx)))
    return im.crop((dx, dy, dx + 1080, dy + 1600))


def scene(idx, age):
    accent = ACC[idx]
    f = make_bg(accent, age, idx)
    sh = Image.new('RGBA', (W, 1600), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((14, 26, 1066, 1590), radius=22, fill=(0, 0, 0, 165))
    f.paste(sh.filter(ImageFilter.GaussianBlur(26)), (0, 326), sh.filter(ImageFilter.GaussianBlur(26)).getchannel('A'))
    pv = panel_view(PANELS[idx], age, idx)
    f.alpha_composite(pv, (0, 300))
    shn = ImageChops.offset(SHEEN, int((age * 260 + idx * 170) % W), 0)
    f.alpha_composite(shn, (0, 300))
    fl = Image.new('RGBA', (W, H), (*accent, int(18 * math.exp(-max(0.0, age) * 12))))
    f.alpha_composite(fl)
    return f


def draw_text(frame, idx, age, alpha=1.0):
    if idx is None:
        return
    if alpha < 0.999:
        b = BAND.copy()
        b.putalpha(b.getchannel('A').point(lambda v: int(v * alpha)))
    else:
        b = BAND
    frame.alpha_composite(b)
    mid(frame, T['brand'], W / 2, 42, alpha * 0.85)
    mid(frame, HEADS[idx], W / 2, 88, alpha * ease(age / 0.30), (1 - ease(age / 0.30)) * 16)
    mid(frame, SUBS[idx], W / 2, 180, alpha * ease((age - 0.10) / 0.35))
    rule(frame, W / 2, 240, 400 * ease((age - 0.14) / 0.45), alpha * 0.95, ACC[idx])
    paste(frame, COUNTERS[idx], W - COUNTERS[idx].width - 44, 38, alpha * 0.95)
    d = ImageDraw.Draw(frame)
    d.rectangle((0, H - 7, W, H - 1), fill=(255, 255, 255, int(26 * alpha)))
    d.rectangle((0, H - 7, int(W * clamp(age / SLOT)), H - 1), fill=(*ACC[idx], int(235 * alpha)))


def intro_scene(t):
    f = make_bg(SITE_GREEN, t, 0)
    # animated depth rings
    rr = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    rd = ImageDraw.Draw(rr)
    for j in range(3):
        r = int(260 + j * 180 + 40 * math.sin(t * 1.4 + j))
        rd.ellipse((W / 2 - r, 1120 - r * 0.62, W / 2 + r, 1120 + r * 0.62),
                   outline=(*SITE_GREEN, 42 - j * 10), width=3)
    f.alpha_composite(rr.filter(ImageFilter.GaussianBlur(2)))
    # ONE cover at a time, swapped on the beat
    for j, key in enumerate(COVER_KEYS):
        st = 0.28 + j * BEAT
        if t < st:
            continue
        local = t - st
        if local > BEAT + 0.25:
            continue
        p = ease(local / 0.30)
        im = COVERS_SM[j]
        s = 1.32 - 0.32 * p
        rot = 9 * (1 - p) * (1 if j % 2 == 0 else -1)
        w, h = int(720 * s), int(450 * s)
        im2 = im.resize((w, h), Image.Resampling.BILINEAR)
        if rot:
            im2 = im2.rotate(rot, resample=Image.Resampling.BICUBIC, expand=True, fillcolor=(0, 0, 0, 0))
        a = clamp(local / 0.12) * clamp((BEAT + 0.18 - local) / 0.18)
        paste(f, im2, W / 2 - im2.width / 2, 900 - im2.height / 2, a)
        if local < 0.15 and j > 0:
            prev = COVERS_SM[j - 1]
            s2 = 1.0 + 0.55 * smooth(local / 0.15)
            pw, ph = int(720 * s2), int(450 * s2)
            pim = prev.resize((pw, ph), Image.Resampling.BILINEAR)
            paste(f, pim, W / 2 - pw / 2, 900 - ph / 2, (1 - smooth(local / 0.15)) * 0.8)
    return f


def draw_intro_text(frame, alpha=1.0):
    frame.alpha_composite(BAND)
    mid(frame, T['brand'], W / 2, 42, alpha * 0.85)
    mid(frame, T['hook1'], W / 2, 330, alpha)
    mid(frame, T['hook2'], W / 2, 430, alpha)
    rule(frame, W / 2, 550, 460, alpha * 0.9)
    mid(frame, T['hooksub'], W / 2, 600, alpha * 0.9)


def outro_scene(age):
    f = make_bg(SITE_GREEN, age, 11)
    rr = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    rd = ImageDraw.Draw(rr)
    for j in range(4):
        r = int(150 + j * 150 + 70 * ease(age / 0.8))
        rd.ellipse((W / 2 - r, 900 - r, W / 2 + r, 900 + r),
                   outline=(*SITE_GREEN, max(0, 55 - j * 12)), width=3)
    f.alpha_composite(rr.filter(ImageFilter.GaussianBlur(3)))
    for px, py, sp, sz, ph in PARTS[:45]:
        k = smooth(age / 1.6)
        x = px * (1 - k) + 0.5 * k + 0.08 * math.sin(ph + age)
        y = py * (1 - k) + 0.48 * k
        spr = GLOWS[sz]
        f.paste(spr, (int(x * W - spr.width / 2), int(y * H - spr.height / 2)), spr.getchannel('A'))
    s = 0.82 + 0.06 * ease(age / 0.7)
    g = LOGO_GLOW.resize((int(LOGO_GLOW.width * s), int(LOGO_GLOW.height * s)), Image.Resampling.BILINEAR)
    m = LOGO.resize((int(LOGO.width * s), int(LOGO.height * s)), Image.Resampling.BILINEAR)
    paste(f, g, W / 2 - g.width / 2, 410, 0.65)
    paste(f, m, W / 2 - m.width / 2, 410)
    p = ease(age / 0.55)
    mid(f, T['logoglow'], W / 2, 700, p * 0.55)
    mid(f, T['logo'], W / 2, 700, p, (1 - p) * 22)
    rule(f, W / 2, 850, 660 * ease((age - 0.35) / 0.45))
    if age > 0.55:
        mid(f, T['cta'], W / 2, 930, ease((age - 0.55) / 0.4))
    if age > 1.0:
        mid(f, T['url'], W / 2, 1030, ease((age - 1.0) / 0.45))
    if age > 1.45:
        mid(f, T['endsub'], W / 2, 1130, ease((age - 1.45) / 0.45))
    return f


# --------------------------------------------------------------------------
# Cinematic transition toolkit
# --------------------------------------------------------------------------
def warp(img, dest_pts, src_pts):
    A = []
    b = []
    for (x, y), (u, v) in zip(dest_pts, src_pts):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.append(u)
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y]); b.append(v)
    c = np.linalg.solve(np.array(A, dtype=np.float64), np.array(b, dtype=np.float64))
    return img.transform((W, H), Image.Transform.PERSPECTIVE, c.tolist(),
                         Image.Resampling.BICUBIC)


def zoom_frame(img, s, cx=0.5, cy=0.5):
    if s <= 1.001:
        return img.copy()
    nw, nh = int(W * s), int(H * s)
    im = img.resize((nw, nh), Image.Resampling.BILINEAR)
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    out.paste(im, (int(W / 2 - cx * nw), int(H / 2 - cy * nh)))
    return out


def motion_blur(img, amount):
    if amount < 0.7:
        return img
    n = 7
    a = np.asarray(img, dtype=np.float32)
    out = np.zeros_like(a)
    for k in range(n):
        d = int(round(amount * (k - (n - 1) / 2) / ((n - 1) / 2)))
        out += np.roll(a, d, axis=1) / n
    edge = max(1, int(amount))
    out[:, :edge] = 0
    out[:, -edge:] = 0
    return Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGBA')


def _diag_field(pos, soft):
    return np.exp(-(((GX + 0.52 * GY - pos) / soft) ** 2))


def wipe_mask(pos, soft=0.045):
    """Cumulative diagonal wipe: 0 before the light line, 1 after it."""
    m = 1.0 / (1.0 + np.exp(-(pos - (GX + 0.52 * GY)) / soft))
    return Image.fromarray(np.clip(m * 255, 0, 255).astype(np.uint8), 'L').resize(
        (W, H), Image.Resampling.BICUBIC)


def light_sweep(frame, u, accent, pos=None, soft=0.11, power=115):
    p = (u * 1.55 - 0.25) if pos is None else pos
    m = _diag_field(p, soft)
    lay = np.zeros((SH, SW, 4), dtype=np.float32)
    lay[:, :, :3] = accent
    lay[:, :, 3] = m * power
    lay = Image.fromarray(lay.clip(0, 255).astype(np.uint8), 'RGBA').resize((W, H), Image.Resampling.BICUBIC)
    core = np.zeros((SH, SW, 4), dtype=np.float32)
    core[:, :, :3] = (255, 255, 255)
    core[:, :, 3] = np.exp(-(((GX + 0.52 * GY - p) / 0.018) ** 2)) * 175
    core = Image.fromarray(core.clip(0, 255).astype(np.uint8), 'RGBA').resize((W, H), Image.Resampling.BICUBIC)
    frame.alpha_composite(lay)
    frame.alpha_composite(core)
    return frame


def particles(frame, u, accent, center=(0.5, 0.5), n=70, converge=False):
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for i in range(n):
        px, py, sp, sz, ph = PARTS[i]
        k = smooth(u)
        if converge:
            x = px * (1 - k) + center[0] * k
            y = py * (1 - k) + center[1] * k
        else:
            ang = ph + i * 0.7
            rad = (0.05 + 0.75 * k * sp) % 1.0
            x = center[0] + math.cos(ang) * rad
            y = center[1] + math.sin(ang) * rad * 0.7
        spr = GLOWS[sz].copy()
        col = Image.new('RGBA', spr.size, (*accent, 0))
        col.paste(spr.getchannel('A'), (0, 0), spr.getchannel('A'))
        spr = col
        spr.putalpha(spr.getchannel('A').point(lambda v: int(v * (0.8 if sz <= 6 else 0.35))))
        lay.paste(spr, (int(x * W - spr.width / 2), int(y * H - spr.height / 2)), spr.getchannel('A'))
    frame.alpha_composite(lay)
    return frame


def chromatic(frame, d):
    if d < 1:
        return frame
    a = np.asarray(frame).copy()
    a[:, :, 0] = np.roll(a[:, :, 0], d, axis=1)
    a[:, :, 2] = np.roll(a[:, :, 2], -d, axis=1)
    return Image.fromarray(a, 'RGBA')


def depth_lines(frame, u, accent, vp):
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    for i in range(14):
        x = (i / 13) * W
        d.line((vp[0], vp[1], x, H), fill=(*accent, int(38 * (1 - u))), width=2)
    frame.alpha_composite(lay.filter(ImageFilter.GaussianBlur(1.5)))
    return frame


def rotated_quad(cx, cy, w, h, deg):
    a = math.radians(deg)
    pts = [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]
    return [(cx + px * math.cos(a) - py * math.sin(a),
             cy + px * math.sin(a) + py * math.cos(a)) for px, py in pts]


def full_corners():
    return [(0, 0), (W, 0), (W, H), (0, H)]


def polygon_mask(poly, blur=12):
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    return m.filter(ImageFilter.GaussianBlur(blur)) if blur else m


# ---- 11 distinct transitions: intro -> 10 pages -> outro -------------------
def eff0(out, inn, u, ao, ai, t):  # cinematic zoom-through + light sweep
    o = motion_blur(zoom_frame(out, 1 + 1.55 * smooth(u), 0.5, 0.42), 11 * u)
    i = zoom_frame(inn, 1 + 0.95 * (1 - smooth(u)), 0.5, 0.5)
    f = Image.blend(o, i, smooth(clamp((u - 0.10) / 0.72)))
    f = light_sweep(f, u, ai)
    return particles(f, u, ai, (0.5, 0.42), 70)


def eff1(out, inn, u, ao, ai, t):  # 3D camera dolly with perspective depth
    s = 1 - 0.82 * smooth(u)
    vp = (W * 0.5, H * 0.42)
    o = motion_blur(warp(out, rotated_quad(vp[0], vp[1], W * s, H * s, -7 * u), full_corners()), 7 * u)
    crop = 0.55 + 0.45 * smooth(u)
    x0, y0, x1, y1 = (1 - crop) / 2 * W, (1 - crop) / 2 * H, (1 + crop) / 2 * W, (1 + crop) / 2 * H
    i = warp(inn, full_corners(), [(x0, y0), (x1, y0), (x1, y1), (x0, y1)])
    f = Image.blend(o, i, smooth(u))
    return depth_lines(f, u, ai, vp)


def eff2(out, inn, u, ao, ai, t):  # expanding hexagon mask reveal
    o = motion_blur(out, 5 * u)
    cx, cy = W * 0.42, H * 0.48
    r = W * 1.25 * smooth(u)
    poly = [(cx + r * math.cos(math.radians(60 * k + 30)),
             cy + r * math.sin(math.radians(60 * k + 30))) for k in range(6)]
    f = Image.composite(inn, o, polygon_mask(poly, 20))
    return particles(f, u, ai, (0.42, 0.48), 65)


def eff3(out, inn, u, ao, ai, t):  # rotating morph / diamond reveal
    o = zoom_frame(out, 1 + 0.65 * u)
    o = motion_blur(o.rotate(15 * u, resample=Image.Resampling.BICUBIC, fillcolor=(0, 0, 0, 0)), 7 * u)
    i = inn.rotate(-12 * (1 - u), resample=Image.Resampling.BICUBIC, fillcolor=(0, 0, 0, 0))
    r = W * 1.3 * smooth(u)
    poly = [(W / 2, H / 2 - r), (W / 2 + r, H / 2), (W / 2, H / 2 + r), (W / 2 - r, H / 2)]
    f = Image.composite(i, o, polygon_mask(poly, 18))
    return light_sweep(f, u * 0.75, ai, soft=0.08, power=85)


def eff4(out, inn, u, ao, ai, t):  # diagonal slit light sweep
    dx = int(W * 0.45 * u)
    o = motion_blur(ImageChops.offset(out, -dx, -int(H * 0.12 * u)), 9 * u)
    i = inn
    pos = u * 1.9 - 0.2
    f = Image.composite(i, o, wipe_mask(pos))
    return light_sweep(f, u, ai, pos=pos, soft=0.05, power=150)


def eff5(out, inn, u, ao, ai, t):  # multi-speed parallax strips
    f = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for j in range(3):
        y0, y1 = j * H // 3, (j + 1) * H // 3
        uj = clamp((u - j * 0.055) / 0.89)
        s = Image.blend(out.crop((0, y0, W, y1)), inn.crop((0, y0, W, y1)), smooth(uj))
        s = ImageChops.offset(s, int(70 * (1 - uj) * (1 if j % 2 else -1)), 0)
        f.paste(s, (0, y0))
    return particles(f, u, ai, (0.5, 0.5), 45)


def eff6(out, inn, u, ao, ai, t):  # rotating circular iris + radial rays
    o = motion_blur(zoom_frame(out, 1 + 0.5 * u).rotate(-10 * u, resample=Image.Resampling.BICUBIC,
                                                      fillcolor=(0, 0, 0, 0)), 6 * u)
    i = inn.rotate(10 * (1 - u), resample=Image.Resampling.BICUBIC, fillcolor=(0, 0, 0, 0))
    r = W * 1.25 * smooth(u)
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).ellipse((W / 2 - r, H / 2 - r, W / 2 + r, H / 2 + r), fill=255)
    f = Image.composite(i, o, m.filter(ImageFilter.GaussianBlur(22)))
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    for k in range(18):
        ang = math.radians(k * 20 + u * 30)
        d.line((W / 2 + math.cos(ang) * r * 0.55, H / 2 + math.sin(ang) * r * 0.55,
                W / 2 + math.cos(ang) * r * 1.1, H / 2 + math.sin(ang) * r * 1.1),
               fill=(*ai, int(45 * (1 - u))), width=3)
    f.alpha_composite(lay.filter(ImageFilter.GaussianBlur(2)))
    return f


def eff7(out, inn, u, ao, ai, t):  # camera tilt / vertical pan
    qo = [(0, H * 0.22 * u), (W, H * 0.09 * u), (W, H), (0, H)]
    qi = [(0, 0), (W, 0), (W, H * (1 - 0.22 * (1 - u))), (0, H * (1 - 0.12 * (1 - u)))]
    o = motion_blur(warp(out, qo, full_corners()), 8 * u)
    i = warp(inn, qi, full_corners())
    return Image.blend(o, i, smooth(u))


def eff8(out, inn, u, ao, ai, t):  # angular shard mask reveal
    o = motion_blur(out, 4 * u)
    m = Image.new('L', (W, H), 0)
    md = ImageDraw.Draw(m)
    for j in range(5):
        uj = clamp((u - j * 0.055) / 0.55)
        r = W * 1.35 * smooth(uj)
        ang = math.radians(j * 72 + 18)
        hw = r * 0.55
        cx, cy = W * 0.5, H * 0.5
        poly = [
            (cx + math.cos(ang - 0.5) * r, cy + math.sin(ang - 0.5) * r),
            (cx + math.cos(ang) * r * 0.15, cy + math.sin(ang) * r * 0.15),
            (cx + math.cos(ang + 0.5) * r, cy + math.sin(ang + 0.5) * r),
            (cx + math.cos(ang + 0.5) * r + math.cos(ang) * hw, cy + math.sin(ang + 0.5) * r + math.sin(ang) * hw),
        ]
        md.polygon(poly, fill=255)
    f = Image.composite(inn, o, m.filter(ImageFilter.GaussianBlur(10)))
    return particles(f, u, ai, (0.5, 0.5), 60)


def eff9(out, inn, u, ao, ai, t):  # deep zoom + chromatic aberration + burst
    o = motion_blur(zoom_frame(out, 1 + 2.2 * smooth(u), 0.32, 0.62), 15 * u)
    i = zoom_frame(inn, 1 + 1.1 * (1 - smooth(u)), 0.68, 0.40)
    f = Image.blend(o, i, smooth(clamp((u - 0.05) / 0.8)))
    f = chromatic(f, int(7 * math.sin(u * math.pi)))
    return particles(f, u, ai, (0.4, 0.52), 80)


def eff10(out, inn, u, ao, ai, t):  # final diagonal sweep + converging light
    o = motion_blur(zoom_frame(out, 1 + 1.0 * u), 9 * u)
    i = zoom_frame(inn, 1 + 0.6 * (1 - smooth(u)))
    pos = u * 1.9 - 0.2
    f = Image.composite(i, o, wipe_mask(pos))
    f = light_sweep(f, u, ai, pos=pos, soft=0.05, power=160)
    return particles(f, u, ai, (0.5, 0.5), 70, converge=True)


EFFECTS = [eff0, eff1, eff2, eff3, eff4, eff5, eff6, eff7, eff8, eff9, eff10]
BOUNDS = [INTRO] + [INTRO + k * SLOT for k in range(1, 10)] + [OUTRO]


def frame_at(t):
    if t < INTRO:
        f = intro_scene(t)
        draw_intro_text(f)
        return f
    if t >= OUTRO:
        return outro_scene(t - OUTRO)
    for k, B in enumerate(BOUNDS):
        if abs(t - B) <= TR / 2:
            u = clamp((t - (B - TR / 2)) / TR)
            oi, ii = (k - 1), k
            a_out = ACC[oi] if oi >= 0 else SITE_GREEN
            a_in = ACC[ii] if ii < 11 else SITE_GREEN
            out_f = intro_scene(t) if oi < 0 else scene(oi, SLOT - 0.04)
            in_f = outro_scene(max(0.0, t - OUTRO)) if ii == 10 else scene(ii, 0.04 + u * 0.22)
            f = EFFECTS[k](out_f, in_f, u, a_out, a_in, t)
            if oi < 0:
                if u < 0.5:
                    draw_intro_text(f, 1 - u / 0.5)
            else:
                if u < 0.5:
                    draw_text(f, oi, SLOT - 0.04, 1 - u / 0.5)
            if ii < 10:
                if u >= 0.5:
                    draw_text(f, ii, 0.04 + u * 0.22, (u - 0.5) / 0.5)
            return f
    idx = min(9, int((t - INTRO) / SLOT))
    age = t - (INTRO + idx * SLOT)
    f = scene(idx, age)
    draw_text(f, idx, age)
    return f


def render():
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
           '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'fast',
           '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for n in range(FRAMES):
        t = n / FPS
        proc.stdin.write(frame_at(t).convert('RGB').tobytes())
        if n % 150 == 0:
            print(f'frame {n}/{FRAMES}', flush=True)
    proc.stdin.close()
    if proc.wait() != 0:
        raise SystemExit('ffmpeg failed')
    print(f'Video: {OUT} ({os.path.getsize(OUT)/1024/1024:.2f} MB) frames={FRAMES} duration={FRAMES/FPS:.3f}s')


if os.environ.get('PREVIEW'):
    for t in [0.9, 1.6, 2.4, 4.0, 5.5, 8.3, 11.0, 13.9, 16.6, 19.4, 22.2, 24.9, 27.7, 30.4, 31.6, 32.8]:
        frame_at(t).convert('RGB').save(os.path.join(WORK, f'v3_{t:.1f}.png'))
    print('preview frames written')
else:
    render()
