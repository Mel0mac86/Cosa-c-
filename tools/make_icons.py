#!/usr/bin/env python3
"""Genera le icone PNG di AllerScan (scudo verde con spunta) senza dipendenze
esterne: disegna i pixel a mano e li scrive in PNG con zlib (stdlib).

Uso: python3 tools/make_icons.py
"""
import math
import struct
import zlib

GREEN = (22, 163, 74)        # #16a34a
GREEN_DARK = (21, 128, 61)   # #15803d
WHITE = (255, 255, 255)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def dist_to_segment(px, py, ax, ay, bx, by):
    """Distanza del punto (px,py) dal segmento A-B."""
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    cx, cy = ax + t * dx, ay + t * dy
    return math.hypot(px - cx, py - cy)


def rounded_rect_alpha(x, y, w, h, r):
    """Copertura morbida (0..1) di un rettangolo con angoli arrotondati."""
    cx = min(max(x, r), w - r)
    cy = min(max(y, r), h - r)
    d = math.hypot(x - cx, y - cy)
    return max(0.0, min(1.0, (r - d) + 0.5)) if (x < r or x > w - r) and (y < r or y > h - r) else 1.0


def shield_half_width(y, top, bottom, max_half):
    """Mezza larghezza dello scudo all'altezza y."""
    taper_start = top + 0.42 * (bottom - top)
    if y < top or y > bottom:
        return 0.0
    if y <= taper_start:
        # spalla superiore leggermente arrotondata
        shoulder = top + 0.10 * (bottom - top)
        if y < shoulder:
            f = (y - top) / (shoulder - top)
            return max_half * math.sqrt(max(0.0, f))
        return max_half
    # parte inferiore: rastrema fino alla punta con lati convessi
    f = (bottom - y) / (bottom - taper_start)
    return max_half * math.sqrt(max(0.0, f))


def make_icon(size):
    s = size
    img = bytearray()  # RGBA rows

    # geometria icona
    bg_r = s * 0.18
    # scudo
    top = s * 0.20
    bottom = s * 0.82
    cx = s / 2.0
    max_half = s * 0.30
    # spunta (checkmark) in coordinate relative
    a = (s * 0.36, s * 0.52)
    b = (s * 0.46, s * 0.63)
    c = (s * 0.66, s * 0.38)
    check_w = s * 0.05

    for py in range(s):
        row = bytearray()
        for px in range(s):
            # sfondo: gradiente verticale verde
            t = py / s
            base = lerp(GREEN, GREEN_DARK, t)
            color = base
            alpha = rounded_rect_alpha(px + 0.5, py + 0.5, s, s, bg_r)

            # scudo bianco
            hw = shield_half_width(py + 0.5, top, bottom, max_half)
            in_shield = abs((px + 0.5) - cx) <= hw and top <= (py + 0.5) <= bottom
            if in_shield:
                color = WHITE
                # spunta verde sopra lo scudo
                d = min(
                    dist_to_segment(px + 0.5, py + 0.5, a[0], a[1], b[0], b[1]),
                    dist_to_segment(px + 0.5, py + 0.5, b[0], b[1], c[0], c[1]),
                )
                if d <= check_w:
                    color = GREEN_DARK

            row += bytes((color[0], color[1], color[2], int(alpha * 255)))
        img.append(0)  # filter byte per scanline
        img += row

    # img contiene già un filter byte (0) prima di ogni scanline RGBA
    png_data = zlib.compress(bytes(img), 9)

    def chunk(typ, payload):
        c = struct.pack(">I", len(payload)) + typ + payload
        c += struct.pack(">I", zlib.crc32(typ + payload) & 0xFFFFFFFF)
        return c

    out = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", s, s, 8, 6, 0, 0, 0)  # RGBA
    out += chunk(b"IHDR", ihdr)
    out += chunk(b"IDAT", png_data)
    out += chunk(b"IEND", b"")
    return out


for size, name in [(512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png")]:
    with open(name, "wb") as f:
        f.write(make_icon(size))
    print("scritto", name)
