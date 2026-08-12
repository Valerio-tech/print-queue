#!/usr/bin/env python3
"""Build full-bleed 144x144 PNG source icons for card thumbnails."""
from __future__ import annotations

import io
import urllib.request
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parents[1] / 'icons' / 'sources'
SIZE = 144

DOWNLOADS = {
    'printables': 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/f1/91/61/f1916133-981a-e925-4a48-7badca4f60b3/AppIcon-0-0-1x_U007epad-0-1-85-220.png/512x512bb.jpg',
    'makerworld': 'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://makerworld.com&size=256',
    'thingiverse': 'https://www.google.com/s2/favicons?domain=thingiverse.com&sz=256',
    'thangs': 'https://www.google.com/s2/favicons?domain=thangs.com&sz=256',
    'crealitycloud': 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/04/da/a3/04daa33c-a710-3cb3-ce30-eb0309e82664/AppIcon2022_us-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg',
}


def fetch_image(url: str) -> Image.Image:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    data = urllib.request.urlopen(req, timeout=25).read()
    return Image.open(io.BytesIO(data)).convert('RGBA')


def fill_square(img: Image.Image) -> Image.Image:
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    cropped = img.crop((left, top, left + side, top + side))
    return cropped.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def save_png(img: Image.Image, name: str) -> None:
    path = OUT / f'{name}.png'
    square = fill_square(img)
    rgb = Image.new('RGB', square.size, '#ffffff')
    rgb.paste(square, mask=square.split()[3])
    rgb.save(path, 'PNG', optimize=True)
    print(f'wrote {path}')


if __name__ == '__main__':
    main()
