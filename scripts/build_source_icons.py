#!/usr/bin/env python3
"""Build 144x144 PNG source icons for card thumbnails."""
from __future__ import annotations

import io
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / 'icons' / 'sources'
SIZE = 144
PAD = 12

DOWNLOADS = {
    'printables': 'https://icons.duckduckgo.com/ip3/printables.com.ico',
    'makerworld': 'https://icons.duckduckgo.com/ip3/makerworld.com.ico',
    'thingiverse': 'https://www.google.com/s2/favicons?domain=thingiverse.com&sz=256',
    'thangs': 'https://www.google.com/s2/favicons?domain=thangs.com&sz=256',
}


def fetch_image(url: str) -> Image.Image:
    data = urllib.request.urlopen(url, timeout=20).read()
    return Image.open(io.BytesIO(data)).convert('RGBA')


def fit_icon(img: Image.Image, bg: str = '#ffffff') -> Image.Image:
    canvas = Image.new('RGBA', (SIZE, SIZE), bg)
    inner = SIZE - PAD * 2
    copy = img.copy()
    copy.thumbnail((inner, inner), Image.Resampling.LANCZOS)
    x = (SIZE - copy.width) // 2
    y = (SIZE - copy.height) // 2
    canvas.paste(copy, (x, y), copy)
    return canvas


def make_creality_icon() -> Image.Image:
    canvas = Image.new('RGBA', (SIZE, SIZE), '#ffffff')
    draw = ImageDraw.Draw(canvas)
    greens = ['#7ED321', '#4CAF50', '#2E7D32']
    # Simplified cube-heart mark inspired by Creality Cloud branding.
    cubes = [
        (52, 34, 68, 50),
        (68, 34, 84, 50),
        (44, 50, 60, 66),
        (60, 50, 76, 66),
        (76, 50, 92, 66),
        (52, 66, 68, 82),
        (68, 66, 84, 82),
    ]
    for idx, box in enumerate(cubes):
        draw.rectangle(box, fill=greens[idx % len(greens)])
    draw.rounded_rectangle((28, 96, 116, 118), radius=8, fill='#4CAF50')
    return canvas


def save_png(img: Image.Image, name: str) -> None:
    path = OUT / f'{name}.png'
    img.convert('RGB').save(path, 'PNG', optimize=True)
    print(f'wrote {path}')


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    for name, url in DOWNLOADS.items():
        try:
            icon = fit_icon(fetch_image(url))
            save_png(icon, name)
        except Exception as exc:
            print(f'warn {name}: {exc}')

    save_png(make_creality_icon(), 'crealitycloud')


if __name__ == '__main__':
    main()
