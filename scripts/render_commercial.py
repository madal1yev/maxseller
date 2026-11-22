"""Render the 25s 1080x1920 MAXSELLER commercial with beat-synced motion."""
import math
import os
import random
import subprocess
import json
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

TEMP = os.environ.get('TEMP', '.')
WORK = os.path.join(TEMP, 'maxseller-commercial')
UI = os.path.join(WORK, 'ui')
FONTS = os.path.join(WORK, 'fonts')
OUT = os.path.join(WORK, 'video-only.mp4')

W, H = 1080, 1920
FPS = 30
FRAMES = 25 * FPS
SR = 48000

MAP = json.load(open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.tmp', 'worry-map.json'), encoding='utf-8'))
BEATS = MAP['beats']

# Beat-snapped scene boundaries.
S1_END = 2.884
S2_END = 6.343
S3_END = 11.521
S4_END = 16.699
S5_END = 20.159

FONT_U = os.path.join(FONTS, 'Unbounded.ttf')
FONT_M = os.path.join(FONTS, 'Manrope.ttf')

_fcache = {}


def font(path, size, weight=700):
    key = (path, size, weight)
    if key not in _fcache:
        f = ImageFont.truetype(path, size)
        try:
            f.set_variation_by_axes([weight])
        except Exception:
            pass
        _fcache[key] = f
    return _fcache[key]


def clamp(v, a=0.0, b=1.0):
    return max(a, min(b, v))


def ease_out(t):
    return 1 - (1 - clamp(t)) ** 4


def ease_in_out(t):
    t = clamp(t)
    return 3 * t * t - 2 * t * t * t


def fade_window(t, start, end, fi=0.22, fo=0.22):
    if t < start or t >= end:
        return 0.0
    return min(clamp((t - start) / fi), clamp((end - t) / fo))


def text_layer(text, f, fill=(255, 255, 255, 255), tracking=0):
    draw = ImageDraw.Draw(Image.new('RGBA', (1, 1)))
    widths = [draw.textbbox((0, 0), ch, font=f)[2] for ch in text]
    total = sum(widths) + tracking * max(0, len(text) - 1)
    ascent, descent = f.getmetrics()
    layer = Image.new('RGBA', (max(1, total + 8), ascent + descent + 12), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x = 4
    for ch, cw in zip(text, widths):
        d.text((x, 4), ch, font=f, fill=fill)
        x += cw + tracking
    return layer


def paste(frame, layer, x, y, alpha=1.0):
    if alpha <= 0.001 or layer is None:
        return
    if alpha < 0.999:
        layer = layer.copy()
        a = layer.getchannel('A').point(lambda v: int(v * alpha))
        layer.putalpha(a)
    frame.paste(layer, (int(x), int(y)), layer.getchannel('A'))


def centered(frame, layer, cx, y, alpha=1.0, dy=0.0):
    paste(frame, layer, cx - layer.width / 2, y + dy, alpha)


# ------------------------------ background -------------------------------
import numpy as np
yy, xx = np.mgrid[0:H, 0:W]
_d = np
dist = _d.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
_vig = _d.clip(1 - 0.42 * dist ** 2, 0, 1)
_grain = _d.random.default_rng(7).normal(0, 2.2, (H, W)).astype(_d.float32)
_base = (_d.stack([7 * _vig, 7 * _vig, 8 * _vig], axis=-1) + _grain[..., None]).clip(0, 255).astype('uint8')
BG = Image.fromarray(_base, 'RGB').convert('RGBA')

# ------------------------------- panels ----------------------------------
def make_panel(path, size, angle=0.0, bright=1.0, radius=16):
    im = Image.open(path).convert('RGB')
    im = ImageOps.autocontrast(ImageOps.grayscale(im), cutoff=1)
    im = ImageEnhance_brightness(im, bright)
    im = ImageOps.fit(im, size, method=Image.Resampling.LANCZOS).convert('RGBA')
    mask = Image.new('L', size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    im.putalpha(mask)
    if angle:
        pad = 40
        canvas = Image.new('RGBA', (size[0] + pad * 2, size[1] + pad * 2), (0, 0, 0, 0))
        canvas.paste(im, (pad, pad))
        im = canvas.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
    out = Image.new('RGBA', (im.width + 20, im.height + 40), (0, 0, 0, 0))
    shadow = Image.new('RGBA', im.size, (0, 0, 0, 0))
    shadow.paste((0, 0, 0, 190), (0, 0), im.getchannel('A'))
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))
    out.paste(shadow, (10, 34), shadow.getchannel('A'))
    out.paste(im, (10, 6), im.getchannel('A'))
    return out


def ImageEnhance_brightness(im, factor):
    from PIL import ImageEnhance
    return ImageEnhance.Brightness(im).enhance(factor)


P = {
    'home': make_panel(os.path.join(UI, 'store-home.png'), (760, 700), 0, 1.02),
    'catalog': make_panel(os.path.join(UI, 'store-catalog.png'), (440, 700), -3, 1.0),
    'product': make_panel(os.path.join(UI, 'store-product.png'), (440, 700), 3, 1.0),
    'dashboard': make_panel(os.path.join(UI, 'admin-dashboard.png'), (920, 575), 0, 1.05),
    'orders': make_panel(os.path.join(UI, 'admin-orders.png'), (900, 563), 0, 1.05),
    'products': make_panel(os.path.join(UI, 'admin-products.png'), (900, 563), 0, 1.05),
    'customers': make_panel(os.path.join(UI, 'admin-customers.png'), (900, 563), 0, 1.05),
}

_scale_cache = {}


def scaled(panel, scale):
    k = (id(panel), round(scale, 2))
    if k not in _scale_cache:
        s = round(scale, 2)
        _scale_cache[k] = panel.resize((max(1, int(panel.width * s)), max(1, int(panel.height * s))), Image.Resampling.BILINEAR)
    return _scale_cache[k]


# ------------------------------- typography ------------------------------
T = {
    'hook1': text_layer('ONLINE SAVDO.', font(FONT_U, 72, 800), tracking=2),
    'hook2': text_layer('YANGI DARAJA.', font(FONT_U, 72, 800), tracking=2),
    'top': text_layer('MAXSELLER', font(FONT_M, 24, 700), (235, 235, 235, 190), tracking=9),
    'w1': text_layer('BUYURTMALAR.', font(FONT_U, 62, 800), tracking=1),
    'w2': text_layer('MIJOZLAR.', font(FONT_U, 62, 800), tracking=1),
    'w3': text_layer('SAVDO.', font(FONT_U, 62, 800), tracking=1),
    'w4': text_layer('NAZORAT.', font(FONT_U, 62, 800), tracking=1),
    'together': text_layer('HAMMASI BIR JOYDA.', font(FONT_U, 42, 700), tracking=1),
    'logo_big': text_layer('MAXSELLER', font(FONT_U, 104, 900), tracking=10),
    'logo_glow': text_layer('MAXSELLER', font(FONT_U, 104, 900), (255, 255, 255, 150), tracking=10).filter(ImageFilter.GaussianBlur(24)),
    'brand_sub': text_layer('ONLAYN SAVDO BOSHQARUVI', font(FONT_M, 29, 600), (225, 225, 225, 230), tracking=7),
    'logo_small': text_layer('MAXSELLER', font(FONT_U, 42, 800), (245, 245, 245, 240), tracking=6),
    'cta1': text_layer('SAVDONGIZNI', font(FONT_U, 46, 700), tracking=1),
    'cta2': text_layer('YANGI BOSQICHGA', font(FONT_U, 44, 700), tracking=1),
    'cta3': text_layer('OLIB CHIQING.', font(FONT_U, 46, 700), tracking=1),
    'url': text_layer('maxseller.vercel.app', font(FONT_M, 40, 700), (255, 255, 255, 255), tracking=1),
    'ui_label': text_layer('HAQIQIY INTERFEYS', font(FONT_M, 19, 600), (220, 220, 220, 150), tracking=7),
}
SCENE_WORDS = [
    (6.55, T['w1']), (7.42, T['w2']), (8.28, T['w3']), (9.14, T['w4']),
]
CUTS = [
    (11.521, 'orders', '01 / BUYURTMALAR'),
    (13.240, 'products', '02 / MAHSULOTLAR'),
    (14.981, 'catalog', '03 / KATALOG'),
    (16.000, 'customers', '04 / MIJOZLAR'),
]

small_labels = {}
for label in ['01 / KATALOG', '02 / MAHSULOT', '03 / BUYURTMALAR', 'MAXSELLER / BOSHQARUV'] + [c[2] for c in CUTS]:
    small_labels[label] = text_layer(label, font(FONT_M, 22, 600), (235, 235, 235, 200), tracking=4)


def rule(frame, cx, y, width, alpha=1.0, thickness=2, color=(255, 255, 255, 255)):
    if width <= 0:
        return
    layer = Image.new('RGBA', (int(width) + 2, thickness), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rectangle((0, 0, int(width), thickness - 1), fill=color)
    if alpha < 0.999:
        layer.putalpha(layer.getchannel('A').point(lambda v: int(v * alpha)))
    paste(frame, layer, cx - width / 2, y)


def brackets(frame, x, y, w, h, alpha=1.0):
    d = ImageDraw.Draw(frame)
    length = 42
    c = (255, 255, 255, int(210 * alpha))
    pts = [
        [(x, y), (x + length, y), (x, y), (x, y + length)],
        [(x + w, y), (x + w - length, y), (x + w, y), (x + w, y + length)],
        [(x, y + h), (x + length, y + h), (x, y + h), (x, y + h - length)],
        [(x + w, y + h), (x + w - length, y + h), (x + w, y + h), (x + w, y + h - length)],
    ]
    for p in pts:
        d.line([p[0], p[1]], fill=c, width=3)
        d.line([p[2], p[3]], fill=c, width=3)


# -------------------------------- scenes ---------------------------------
def scene1(frame, t):
    a = fade_window(t, 0, S1_END, 0.18, 0.35)
    random.seed(11)
    for i in range(12):
        col, row = i % 4, i // 4
        tx, ty = 300 + col * 135, 1180 + row * 88
        sx, sy = random.randint(-260, 1380), random.randint(700, 1900)
        p = ease_out((t - 0.15) / 1.15) if t > 0.15 else 0
        x = sx + (tx - sx) * p + math.sin(t * 9 + i) * (1 - p) * 9
        y = sy + (ty - sy) * p
        layer = Image.new('RGBA', (108, 58), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        d.rounded_rectangle((0, 0, 107, 57), radius=8, outline=(255, 255, 255, 120), width=2)
        d.rectangle((12, 14, 74, 19), fill=(255, 255, 255, 110))
        d.rectangle((12, 27, 92, 31), fill=(255, 255, 255, 55))
        paste(frame, layer, x, y, 0.55 * a)

    appear = ease_out((t - 0.95) / 0.7)
    if appear > 0:
        centered(frame, T['hook1'], W / 2, 760, a * appear, (1 - appear) * 26)
        centered(frame, T['hook2'], W / 2, 870, a * appear, (1 - appear) * 34)
        rule(frame, W / 2, 990, 520 * ease_out((t - 1.45) / 0.6), a * 0.9)
    centered(frame, T['top'], W / 2, 150, a * 0.7)


def scene2(frame, t):
    a = fade_window(t, S1_END, S2_END, 0.25, 0.30)
    items = [
        ('catalog', 80, 470, 2.884, '01 / KATALOG'),
        ('product', 560, 540, 3.743, '02 / MAHSULOT'),
        ('orders', 190, 1200, 4.625, '03 / BUYURTMALAR'),
    ]
    for key, x, y, at, label in items:
        p = ease_out((t - at) / 0.62)
        if p <= 0:
            continue
        panel = scaled(P[key], 0.94 + 0.06 * p)
        jitter = math.sin(t * 12) * 3 * (1 - p)
        paste(frame, panel, x + (1 - p) * (140 if x < 500 else -140) + jitter, y + (1 - p) * 80, a * p)
        centered(frame, small_labels[label], x + panel.width / 2, y - 46, a * p * 0.9)
    rule(frame, W / 2, 1100, 260 * ease_out((t - 5.2) / 0.6), a * 0.4)


def scene3(frame, t):
    a = fade_window(t, S2_END, S3_END, 0.28, 0.35)
    p = ease_out((t - S2_END) / 1.25)
    scale = 1.14 - 0.14 * p
    panel = scaled(P['dashboard'], scale)
    x, y = W / 2 - panel.width / 2, 620 - 18 * (1 - p)
    paste(frame, panel, x, y, a)
    brackets(frame, x - 16, y - 16, panel.width + 32, panel.height + 32, a * 0.8)
    centered(frame, small_labels['MAXSELLER / BOSHQARUV'], W / 2, 190, a * 0.8)

    for at, layer in SCENE_WORDS:
        if t < at:
            continue
        life = t - at
        wa = min(clamp(life / 0.18), clamp((0.92 - life) / 0.22))
        if wa > 0:
            centered(frame, layer, W / 2, 1350, a * wa, (1 - ease_out(life / 0.25)) * 30)

    if t >= 10.55:
        ta = ease_out((t - 10.55) / 0.45)
        centered(frame, T['together'], W / 2, 1520, a * ta, (1 - ta) * 22)
        rule(frame, W / 2, 1600, 460 * ta, a * 0.8)


def scene4(frame, t):
    a = fade_window(t, S3_END, S4_END, 0.20, 0.30)
    idx = 0
    for i, (at, key, label) in enumerate(CUTS):
        if t >= at:
            idx = i
    at, key, label = CUTS[idx]
    p = ease_out((t - at) / 0.75)
    panel = scaled(P[key], 1.18 - 0.18 * p)
    x, y = W / 2 - panel.width / 2, 640 + 26 * (1 - p)
    paste(frame, panel, x, y, a)
    centered(frame, small_labels[label], W / 2, 540, a * min(1, p * 1.6))
    centered(frame, T['ui_label'], W / 2, 1280, a * 0.75)

    # Depth panel from the previous cut.
    if idx > 0:
        prev = P[CUTS[idx - 1][1]]
        mini = prev.resize((300, 188), Image.Resampling.BILINEAR)
        paste(frame, mini, 756, 1320, a * 0.72)

    # Beat-driven scan line across the interface.
    sweep = ((t - at) % 0.86) / 0.86
    sy = y + sweep * panel.height
    d = ImageDraw.Draw(frame)
    d.line((x, sy, x + panel.width, sy), fill=(255, 255, 255, int(70 * a)), width=2)


def scene5(frame, t):
    a = fade_window(t, S4_END, S5_END, 0.30, 0.30)
    if t < 18.418:
        k = ease_in_out((t - S4_END) / 1.5)
        h = int(560 * (1 - k))
        d = ImageDraw.Draw(frame)
        d.line((W / 2, H / 2 - h / 2, W / 2, H / 2 + h / 2), fill=(255, 255, 255, int(120 * (1 - k) * a)), width=2)
        return

    age = t - 18.418
    p = ease_out(age / 0.85)
    scale = 1.24 - 0.24 * p
    glow = T['logo_glow'].resize((int(T['logo_glow'].width * scale), int(T['logo_glow'].height * scale)), Image.Resampling.BILINEAR)
    logo = T['logo_big'].resize((int(T['logo_big'].width * scale), int(T['logo_big'].height * scale)), Image.Resampling.BILINEAR)
    centered(frame, glow, W / 2, 830, a * 0.55 * clamp(age / 0.2))
    centered(frame, logo, W / 2, 830, a * clamp(age / 0.16))

    if age > 0.55:
        ta = ease_out((age - 0.55) / 0.5)
        rule(frame, W / 2, 975, 620 * ta, a * 0.95, 2)
    if age > 0.85:
        sa = ease_out((age - 0.85) / 0.5)
        centered(frame, T['brand_sub'], W / 2, 1040, a * sa * 0.95, (1 - sa) * 16)


def scene6(frame, t):
    if t < S5_END:
        return
    a = clamp((t - S5_END) / 0.28)
    if t >= 23.60:
        a *= clamp((25.0 - t) / 1.35)

    centered(frame, T['logo_small'], W / 2, 170, a * 0.9)
    heads = [(20.20, T['cta1'], 380), (20.38, T['cta2'], 455), (20.56, T['cta3'], 530)]
    for at, layer, y in heads:
        p = ease_out((t - at) / 0.45)
        if p > 0:
            centered(frame, layer, W / 2, y, a * p, (1 - p) * 24)

    panel = scaled(P['home'], 1.06 - 0.06 * ease_out((t - 20.159) / 0.9))
    paste(frame, panel, W / 2 - panel.width / 2, 720, a)
    centered(frame, T['url'], W / 2, 1570, a * ease_out((t - 20.5) / 0.5))
    if t >= 21.877:
        rule(frame, W / 2, 1640, 520 * ease_out((t - 21.877) / 0.6), a * 0.9)

    if 23.60 <= t < 23.78:
        flash = Image.new('RGBA', (W, H), (255, 255, 255, int(90 * clamp((23.78 - t) / 0.18))))
        frame.alpha_composite(flash)


def beat_pulse(frame, t):
    nxt = next((b for b in BEATS if b > t + 0.02), None)
    if nxt is None:
        return
    age = nxt - t
    if age > 0.22:
        return
    k = 1 - age / 0.22
    d = ImageDraw.Draw(frame)
    width = 18 + 54 * (1 - k)
    d.ellipse((W / 2 - width / 2, H - 62 - width / 2, W / 2 + width / 2, H - 62 + width / 2),
              outline=(255, 255, 255, int(110 * (1 - k))), width=2)


# --------------------------------- render --------------------------------
cmd = [
    'ffmpeg', '-y', '-loglevel', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', OUT,
]
proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

for f in range(FRAMES):
    t = f / FPS
    frame = BG.copy()
    if t < S1_END:
        scene1(frame, t)
    elif t < S2_END:
        scene2(frame, t)
    elif t < S3_END:
        scene3(frame, t)
    elif t < S4_END:
        scene4(frame, t)
    elif t < S5_END:
        scene5(frame, t)
    else:
        scene6(frame, t)
    beat_pulse(frame, t)
    proc.stdin.write(frame.convert('RGB').tobytes())
    if f % 150 == 0:
        print(f'frame {f}/{FRAMES}', flush=True)

proc.stdin.close()
code = proc.wait()
if code != 0:
    raise SystemExit(f'ffmpeg failed: {code}')
print(f'Video: {OUT} ({os.path.getsize(OUT) / 1024 / 1024:.2f} MB)')
