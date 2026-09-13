#!/usr/bin/env python3
"""Extract full-band symbol/number bounds from the original chart PDFs.

Requires PyMuPDF. Uses the same landscape rotation and 200 DPI dimensions as
color-drill-charts.py, without modifying the PDFs or rendered images.
"""
import json
from pathlib import Path
import re

import fitz

ROOT = Path(__file__).resolve().parents[2]


def main():
    bounds = {}
    for movement in range(1, 5):
        source = ROOT / 'reference' / f'{movement}-Ties That Bind Final Charts.pdf'
        with fitz.open(source) as document:
            for page in document:
                if page.mediabox.height > page.mediabox.width and page.rotation % 180 == 0:
                    page.set_rotation(90)
                match = re.search(r'Set\s*#\s*(\d+)\s+Counts:', page.get_text())
                if not match:
                    raise ValueError(f'Missing set footer: {source.name}, page {page.number + 1}')
                key = f'{movement}-{match.group(1)}'
                if not (ROOT / 'app/public/drill' / f'{key}.png').exists():
                    continue
                boxes = []
                symbols = 0
                for block in page.get_text('dict')['blocks']:
                    for line in block.get('lines', []):
                        for span in line['spans']:
                            text = span['text'].strip()
                            is_symbol = span['font'] == 'CIDFont+F3' and re.fullmatch(r'[A-Z ]+', text)
                            is_number = span['font'] == 'CIDFont+F2' and re.fullmatch(r'[0-9 ]+', text)
                            if not (is_symbol or is_number):
                                continue
                            if is_symbol:
                                symbols += len(text.replace(' ', ''))
                            boxes.append(fitz.Rect(span['bbox']) * page.rotation_matrix)
                if symbols != 73:
                    raise ValueError(f'{key}: expected 73 performer symbols, found {symbols}')
                scale = 200 / 72
                bounds[key] = {
                    'left': round(min(b.x0 for b in boxes) * scale, 2),
                    'top': round(min(b.y0 for b in boxes) * scale, 2),
                    'right': round(max(b.x1 for b in boxes) * scale, 2),
                    'bottom': round(max(b.y1 for b in boxes) * scale, 2),
                }
    if len(bounds) != 66:
        raise ValueError(f'Expected 66 charts, found {len(bounds)}')
    output = ROOT / 'app/src/data/chartFormationBounds.json'
    output.write_text(json.dumps(bounds, indent=2) + '\n')
    print(f'Extracted all-band symbol and number bounds for {len(bounds)} charts.')


if __name__ == '__main__':
    main()
