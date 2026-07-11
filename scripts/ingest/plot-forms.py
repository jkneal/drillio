#!/usr/bin/env python3
"""Plot the battery's positions for every set of a movement in one grid image.

Used during /ingest-drill's visual pass: the geometry makes forms directly
readable (line vs arc vs staggered vs scattered) without squinting at the
full drill charts. SD = red, TD = green, BD = blue.

Usage: python3 plot-forms.py --dir <ingest-output/mN> [--movement <n>]
Writes <dir>/battery-forms-{movement}.png
"""
import json
import os
import re
import sys

from PIL import Image, ImageDraw


def parse_lr(s):
    if re.match(r'^On\s+50\s+yd\s+ln$', s, re.I):
        return 60.0
    m = re.match(r'^(Left|Right):\s*(?:(\d+(?:\.\d+)?)\s*steps?\s*(inside|outside))?\s*(?:On\s+)?(\d+)\s*yd\s*ln$', s, re.I)
    if not m:
        return None
    side, steps, inout, yd = m.group(1).lower(), float(m.group(2) or 0), (m.group(3) or '').lower(), int(m.group(4))
    pos = 60 + (50 - yd) * 1.6 if side == 'left' else 60 - (50 - yd) * 1.6
    if inout == 'inside':
        pos += -steps if side == 'left' else steps
    elif inout == 'outside':
        pos += steps if side == 'left' else -steps
    return pos


REFS = {'home hash': 28.48, 'visitor hash': 56.96,
        'front side line': 0, 'front sideline': 0, 'home side line': 0, 'home sideline': 0,
        'back side line': 85.44, 'back sideline': 85.44, 'visitor side line': 85.44, 'visitor sideline': 85.44}


def parse_hv(s):
    s = re.sub(r'\s*\(HS\)$', '', s)
    m = re.match(r'^(?:(\d+(?:\.\d+)?)\s*steps?\s*)?(In Front Of|Behind|On)\s+(.+)$', s, re.I)
    if not m:
        return None
    steps, direction, ref = float(m.group(1) or 0), m.group(2).lower(), m.group(3).lower()
    base = next((v for k, v in REFS.items() if k in ref), None)
    if base is None:
        return None
    return base + steps if direction == 'behind' else base - steps if 'front' in direction else base


COLORS = {'SD': (220, 40, 40), 'TD': (30, 140, 30), 'BD': (30, 60, 220)}
PW, PH, COLS = 460, 300, 4


def main():
    args = dict(zip(sys.argv[1::2], sys.argv[2::2]))
    out_dir = args['--dir']
    movement = args.get('--movement')
    if not movement:
        movement = next(f for f in os.listdir(out_dir) if re.match(r'coordinates-\d+\.json', f)).split('-')[1].split('.')[0]

    coords = json.load(open(os.path.join(out_dir, f'coordinates-{movement}.json')))
    sets = sorted({r['set'] for p in coords['battery'] for r in p['rows']})
    rows_n = (len(sets) + COLS - 1) // COLS
    img = Image.new('RGB', (PW * COLS, PH * rows_n), 'white')
    d = ImageDraw.Draw(img)

    for idx, s in enumerate(sets):
        ox, oy = (idx % COLS) * PW, (idx // COLS) * PH

        def px(x):
            return ox + 10 + (120 - x) / 80 * (PW - 20)

        def py(y):
            return oy + 25 + y / 85.44 * (PH - 40)

        for yd in range(40, 121, 8):
            d.line([(px(yd), py(0)), (px(yd), py(85.44))], fill=(210, 230, 240))
        for yy, lbl in [(0, 'FRONT'), (28.48, 'HH'), (56.96, 'VH'), (85.44, 'BACK')]:
            d.line([(px(40), py(yy)), (px(120), py(yy))], fill=(180, 200, 210))
            d.text((ox + 12, py(yy) - 10), lbl, fill=(120, 140, 150))
        d.line([(px(60), py(0)), (px(60), py(85.44))], fill=(150, 170, 180), width=2)
        d.text((ox + PW // 2 - 20, oy + 4), f"Set {s}", fill='black')

        for p in coords['battery']:
            r = next((r for r in p['rows'] if r['set'] == s), None)
            if not r:
                continue
            x, y = parse_lr(r['leftRight']), parse_hv(r['homeVisitor'])
            if x is None or y is None:
                d.text((ox + 150, oy + 4), f"PARSE FAIL {p['symbol']}", fill='red')
                continue
            c = COLORS[p['symbol'][:2]]
            d.ellipse([px(x) - 4, py(y) - 4, px(x) + 4, py(y) + 4], fill=c)
            d.text((px(x) + 5, py(y) - 5), p['symbol'][2:], fill=c)

    out = os.path.join(out_dir, f'battery-forms-{movement}.png')
    img.save(out)
    print(f"wrote {out} ({img.width}x{img.height})")


if __name__ == '__main__':
    main()
