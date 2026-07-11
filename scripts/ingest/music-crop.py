#!/usr/bin/env python3
"""Crop and stitch helpers for building music images from rendered score pages.

Usage:
  python3 music-crop.py crop <src.png> <x0,y0,x1,y1> <out.png>
  python3 music-crop.py stack <img1.png> <img2.png> [...] <out.png>

crop  — cut a region out of a rendered score page.
stack — stack images vertically (for measures that wrap across systems/pages);
        widths are normalized to the widest image, on white.
"""
import sys
from PIL import Image


def crop(src, box, out):
    x0, y0, x1, y1 = (int(v) for v in box.split(','))
    Image.open(src).crop((x0, y0, x1, y1)).save(out)
    print(f"wrote {out} ({x1 - x0}x{y1 - y0})")


def stack(paths, out):
    images = [Image.open(p) for p in paths]
    width = max(i.width for i in images)
    height = sum(i.height for i in images)
    canvas = Image.new('RGB', (width, height), 'white')
    y = 0
    for i in images:
        canvas.paste(i, (0, y))
        y += i.height
    canvas.save(out)
    print(f"wrote {out} ({width}x{height})")


if __name__ == '__main__':
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(1)
    cmd = sys.argv[1]
    if cmd == 'crop':
        crop(sys.argv[2], sys.argv[3], sys.argv[4])
    elif cmd == 'stack':
        stack(sys.argv[2:-1], sys.argv[-1])
    else:
        print(__doc__)
        sys.exit(1)
