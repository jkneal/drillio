#!/usr/bin/env python3
"""Re-render drill PNGs with show colors, clean symbols, and no label leaders.

Edits PDF text drawing instructions, preserving embedded glyphs, positioning,
kerning, white number halos, field lines, and performer symbols. Removes only
the short gray leader strokes immediately preceding performer numbers and the
tiny center-dot contours in the D and Q glyphs. Source PDFs are never
overwritten. Requires pypdf, fontTools, and Poppler (pdftoppm).

python3 scripts/ingest/color-drill-charts.py --out /tmp/colored-drill
Review that output, then copy its PNGs to app/public/drill/.
"""
import argparse
from collections import Counter
from io import BytesIO
import json
from pathlib import Path
import re
import subprocess
import tempfile

from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, ByteStringObject, ContentStream, DecodedStreamObject, FloatObject, NameObject, NumberObject, TextStringObject
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import GlyphCoordinates

ROOT = Path(__file__).resolve().parents[2]
SECTIONS = json.loads((ROOT / 'app/src/data/drumlineSections.json').read_text())
BY_SYMBOL = {section['symbol']: section for section in SECTIONS.values()}
BY_NUMBER = {str(number): section for section in SECTIONS.values() for number in section['numbers']}
EXPECTED = Counter({**{s['symbol']: len(s['numbers']) for s in SECTIONS.values()}, **{n: 1 for n in BY_NUMBER}})
STRING_TYPES = (TextStringObject, ByteStringObject)


def font_maps(page):
    maps = {}
    for name, font in page['/Resources']['/Font'].items():
        font = font.get_object()
        if font.get('/Encoding') != '/Identity-H':
            raise ValueError(f'Unsupported font encoding: {name}')
        cmap = font['/ToUnicode'].get_object().get_data().decode('ascii')
        if 'beginbfrange' in cmap:
            raise ValueError('Unexpected range-based font map; update decoder before rendering.')
        maps[name] = {
            int(source, 16): bytes.fromhex(target).decode('utf-16-be')
            for block in re.findall(r'beginbfchar(.*?)endbfchar', cmap, re.S)
            for source, target in re.findall(r'<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>', block)
        }
    return maps


def raw_bytes(value):
    return value.original_bytes if isinstance(value, TextStringObject) else bytes(value)


def decode(value, cmap):
    raw = raw_bytes(value)
    return ''.join(cmap[int.from_bytes(raw[i:i + 2], 'big')] for i in range(0, len(raw), 2))


def rgb(hex_color):
    return [FloatObject(int(hex_color[i:i + 2], 16) / 255) for i in (1, 3, 5)]


def paint(section):
    ops = [(rgb(section['color']), b'rg')]
    # Yellow needs a narrow dark edge against the white field. Other sections
    # keep the original fill-only rendering, with no typography changes.
    if section.get('outline'):
        ops += [(rgb(section['outline']), b'RG'), ([FloatObject(4)], b'w'), ([NumberObject(2)], b'Tr')]
    else:
        ops += [([NumberObject(0)], b'Tr')]
    return ops


def remove_label_leaders(operations, maps):
    numbers = Counter()
    leaders = Counter()
    for index, (args, operator) in enumerate(operations):
        if operator == b'Tf':
            font = args[0]
        if operator != b'TJ':
            continue
        text = ''.join(decode(v, maps[font]) for v in args[0] if isinstance(v, STRING_TYPES))
        if not re.fullmatch(r'\d{2}', text):
            continue
        color, color_op = operations[index - 5]
        if color_op != b'rg':
            raise ValueError(f'Unexpected number drawing layout for {text!r}')
        if list(color) == [0, 0, 0]:
            numbers[text] += 1
        if list(color) != [1, 1, 1]:
            continue
        # Only the first white halo copy follows a leader stroke. Skip the
        # closing graphics states; do not alter clipping or surrounding paths.
        stroke = index - 8
        while operations[stroke][1] == b'Q':
            stroke -= 1
        if operations[stroke][1] != b'S':
            continue
        signature = [op for _, op in operations[stroke - 7:stroke + 1]]
        if (signature != [b'RG', b'J', b'j', b'M', b'w', b'm', b'l', b'S']
                or list(operations[stroke - 7][0]) != [0.25098] * 3
                or list(operations[stroke - 3][0]) != [0.64]):
            raise ValueError(f'Unexpected leader stroke for performer {text}')
        # End the path without painting, preserving every other PDF operation.
        operations[stroke] = ([], b'n')
        leaders[text] += 1
    if leaders != numbers or sum(numbers.values()) != 73:
        raise ValueError(f'Expected one leader per performer: numbers={numbers}, leaders={leaders}')
    return sum(leaders.values())


def remove_symbol_dots(page, maps, symbol_fonts, cleaned_fonts):
    for name in symbol_fonts:
        descendant = page['/Resources']['/Font'][name]['/DescendantFonts'][0].get_object()
        descriptor = descendant['/FontDescriptor'].get_object()
        if id(descriptor) in cleaned_fonts:
            continue  # Embedded fonts are shared by multiple pages.
        if descendant.get('/CIDToGIDMap') != '/Identity':
            raise ValueError('Expected identity mapping for performer symbols.')
        font = TTFont(BytesIO(descriptor['/FontFile2'].get_object().get_data()))
        glyph_ids = {char: cid for cid, char in maps[name].items() if char in ('D', 'Q')}
        if set(glyph_ids) != {'D', 'Q'}:
            raise ValueError('Missing D/Q performer glyphs.')
        for char, glyph_id in glyph_ids.items():
            glyph = font['glyf'][font.getGlyphName(glyph_id)]
            if glyph.numberOfContours != 3 or glyph.program.getBytecode():
                raise ValueError(f'Unexpected {char} glyph structure.')
            start = glyph.endPtsOfContours[-2] + 1
            dot = glyph.coordinates[start:]
            xs, ys = zip(*dot)
            if len(dot) != 16 or max(xs) - min(xs) != 84 or (min(ys), max(ys)) != (642, 726):
                raise ValueError(f'Unexpected center-dot contour in {char}.')
            # Keep the outer letter and its counter exactly as embedded.
            glyph.coordinates = GlyphCoordinates(glyph.coordinates[:start])
            glyph.flags = glyph.flags[:start]
            glyph.endPtsOfContours = glyph.endPtsOfContours[:-1]
            glyph.numberOfContours = 2
        output = BytesIO()
        font.save(output)
        stream = DecodedStreamObject()
        stream.set_data(output.getvalue())
        stream[NameObject('/Length1')] = NumberObject(len(output.getvalue()))
        descriptor[NameObject('/FontFile2')] = stream
        cleaned_fonts.add(id(descriptor))


def color_page(page, reader, cleaned_fonts):
    maps = font_maps(page)
    content = ContentStream(page.get_contents(), reader)
    original = content.operations
    removed_leaders = remove_label_leaders(original, maps)
    output = []
    found = Counter()
    symbol_fonts = set()
    footer = None
    for index, (args, operator) in enumerate(original):
        if operator == b'Tf':
            font = args[0]
        if operator != b'TJ':
            output.append((args, operator))
            continue
        text = ''.join(decode(v, maps[font]) for v in args[0] if isinstance(v, STRING_TYPES))
        match = re.search(r'Set\s*#\s*(\d+)\s+Counts:', text)
        if match:
            footer = int(match.group(1))
        symbols = bool(text) and all(c in BY_SYMBOL for c in text)
        number_section = BY_NUMBER.get(text)
        if not symbols and not number_section:
            output.append((args, operator))
            continue
        color, color_op = original[index - 5]
        if color_op != b'rg':
            raise ValueError(f'Unexpected text drawing layout for {text!r}')
        if list(color) != [0, 0, 0]:
            # Four white text copies form the existing halo behind each number.
            output.append((args, operator))
            continue
        if original[index - 4][1] != b'BT' or original[index + 1][1] != b'ET' or original[index + 2][1] != b'Q':
            raise ValueError('Text must have an isolated graphics state to avoid coloring other objects.')
        if number_section:
            found[text] += 1
            output.extend(paint(number_section))
            output.append((args, operator))
        else:
            symbol_fonts.add(font)
            found.update(text)
            # Runs such as QQS or SDD mix sections. Split glyphs while retaining
            # every TJ spacing adjustment and each original font-encoded byte.
            for value in args[0]:
                if not isinstance(value, STRING_TYPES):
                    output.append(([ArrayObject([value])], b'TJ'))
                    continue
                raw = raw_bytes(value)
                for offset in range(0, len(raw), 2):
                    glyph = raw[offset:offset + 2]
                    char = maps[font][int.from_bytes(glyph, 'big')]
                    output.extend(paint(BY_SYMBOL[char]))
                    output.append(([ByteStringObject(glyph)], b'Tj'))
    if footer is None or found != EXPECTED:
        raise ValueError(f'Set {footer}: expected {dict(EXPECTED)}, found {dict(found)}')
    content.operations = output
    page[NameObject('/Contents')] = content
    remove_symbol_dots(page, maps, symbol_fonts, cleaned_fonts)
    return footer, dict(found), removed_leaders


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--references', type=Path, default=ROOT / 'reference')
    parser.add_argument('--images', type=Path, default=ROOT / 'app/public/drill')
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    expected_images = {p.name for p in args.images.glob('[1-4]-*.png')}
    report = {}
    with tempfile.TemporaryDirectory(prefix='drill-section-colors-') as temp:
        for movement in range(1, 5):
            source = args.references / f'{movement}-Ties That Bind Final Charts.pdf'
            reader = PdfReader(source)
            writer = PdfWriter()
            cleaned_fonts = set()
            selected_pages = []
            for page in reader.pages:
                set_number, counts, removed_leaders = color_page(page, reader, cleaned_fonts)
                name = f'{movement}-{set_number}.png'
                if name not in expected_images:
                    continue  # Movement 3 includes a repeat of movement 2's last set.
                if name in report:
                    raise ValueError(f'Duplicate chart: {name}')
                # Some movements omit /Rotate even though Pyware draws the
                # field sideways. Normalize in the PDF before rasterizing.
                if page.mediabox.height > page.mediabox.width and page.rotation % 180 == 0:
                    page.rotate(90)
                writer.add_page(page)
                selected_pages.append(name)
                report[name] = {'symbolsAndNumbers': counts, 'removedLeaders': removed_leaders,
                                'removedSymbolDots': counts['D'] + counts['Q'], 'source': source.name}
            pdf = Path(temp) / f'{movement}-colored.pdf'
            writer.write(pdf)
            prefix = Path(temp) / f'{movement}-page'
            subprocess.run(['pdftoppm', '-png', '-r', '200', str(pdf), str(prefix)], check=True, capture_output=True)
            rendered = sorted(Path(temp).glob(f'{movement}-page-*.png'), key=lambda p: int(p.stem.rsplit('-', 1)[1]))
            if len(rendered) != len(selected_pages):
                raise ValueError(f'Incomplete render for movement {movement}')
            for png, name in zip(rendered, selected_pages):
                (args.out / name).write_bytes(png.read_bytes())
            print(f'Movement {movement}: colored and cleaned {len(selected_pages)} charts', flush=True)
        if set(report) != expected_images:
            raise ValueError(f'Unprocessed images: {expected_images - set(report)}')
    (args.out / 'color-report.json').write_text(json.dumps({'sections': SECTIONS, 'charts': report}, indent=2) + '\n')
    print(f'Validated {len(report)} charts: 10 battery symbols, 10 colored numbers, 73 removed leaders, and 7 removed symbol dots per chart.', flush=True)


if __name__ == '__main__':
    main()
