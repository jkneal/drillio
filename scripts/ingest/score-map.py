#!/usr/bin/env python3
"""Build a deterministic measure map for an engraved score/part PDF.

These PDFs (Sibelius/Opus engraving) expose everything as vectors and fonts:
  - staff lines: long horizontal line objects (5 per staff)
  - barlines: vertical line objects spanning a staff's height
  - multirest counts: OpusStd size-16 digits above a bar
  - whole-bar rests: '∑' glyphs (OpusStd size-14)
  - rehearsal marks: Arial-BoldMT size-12 single uppercase letters
  - system-start measure numbers: Arial-ItalicMT size-7 digits (verification)

Output JSON (coordinates in PDF points, top-left origin; multiply by dpi/72
for rendered-page pixels):
  systems: [{page, top, bottom, staves: [{y0,y1}],
             measures: [{n, x0, x1, count}]}]   # count>1 = multirest
  marks: {letter: measure_number}
  rests: {staffIndex: [measure numbers that are whole-bar rests/multirests]}
  checks: printed system-start numbers vs computed (mismatches reported)

Usage: python3 score-map.py <score.pdf> [--out map.json]
"""
import json
import sys

import pdfplumber


def cluster(values, tol):
    groups = []
    for v in sorted(values):
        if groups and v - groups[-1][-1] <= tol:
            groups[-1].append(v)
        else:
            groups.append([v])
    return [sum(g) / len(g) for g in groups]


def find_staves(page):
    """Staff = 5 equally spaced long horizontal lines."""
    lines = [l for l in page.lines
             if abs(l['top'] - l['bottom']) < 0.5 and abs(l['x1'] - l['x0']) > 150]
    by_y = {}
    for l in lines:
        key = min(by_y, key=lambda y: abs(y - l['top']), default=None)
        if key is not None and abs(key - l['top']) <= 1.5:
            by_y[key].append(l)
        else:
            by_y[l['top']] = [l]
    ys = sorted(by_y)
    staves = []
    i = 0
    while i + 4 < len(ys):
        group = ys[i:i + 5]
        gaps = [b - a for a, b in zip(group, group[1:])]
        if max(gaps) - min(gaps) < 1.5 and max(gaps) < 8:
            staves.append({
                'y0': round(group[0], 1), 'y1': round(group[-1], 1),
                'x0': round(min(l['x0'] for y in group for l in by_y[y]), 1),
                'x1': round(max(l['x1'] for y in group for l in by_y[y]), 1)
            })
            i += 5
        else:
            i += 1
    return staves


def barline_lines(page):
    """Barlines are stroked wider than note stems (lw >= 4 vs 3)."""
    return [l for l in page.lines
            if abs(l['x0'] - l['x1']) < 1 and round(l.get('linewidth', 0), 1) >= 4
            and (l['bottom'] - l['top']) > 8]


def find_barlines(page, staff):
    """Barline x-positions covering this staff (systemic lines qualify)."""
    xs = [l['x0'] for l in barline_lines(page)
          if l['top'] <= staff['y0'] + 2 and l['bottom'] >= staff['y1'] - 2]
    return cluster(xs, 4)


def group_systems(page, staves):
    """Staves joined by a common (systemic) barline belong to one system."""
    joins = barline_lines(page)
    systems = []
    for s in staves:
        joined = False
        if systems:
            prev = systems[-1]['staves'][-1]
            for l in joins:
                if l['top'] <= prev['y0'] + 2 and l['bottom'] >= s['y1'] - 2:
                    joined = True
                    break
        if joined:
            systems[-1]['staves'].append(s)
        else:
            systems.append({'staves': [s]})
    for sy in systems:
        sy['top'] = sy['staves'][0]['y0']
        sy['bottom'] = sy['staves'][-1]['y1']
    return systems


def chars_by_kind(page):
    marks, sysnums, multirests, glyphs = [], [], [], []
    chars = page.chars
    for c in chars:
        font = c['fontname'].split('+')[-1]
        size = round(c['size'])
        if font == 'Arial-BoldMT' and 8 <= size <= 12 and c['text'].isupper() and len(c['text']) == 1:
            # rehearsal marks are isolated single letters (not words like titles)
            def adjacent(o):
                return (o is not c and o['fontname'] == c['fontname']
                        and abs(o['top'] - c['top']) < 2
                        and (-1 < o['x0'] - c['x1'] < 3 or -1 < c['x0'] - o['x1'] < 3))
            if not any(adjacent(o) for o in chars):
                marks.append(c)
        elif font == 'Arial-ItalicMT' and size <= 8 and c['text'].isdigit():
            sysnums.append(c)
        elif font == 'OpusStd' and c['text'].isdigit():
            multirests.append(c)  # position filter (above the staff) applied later
        elif font == 'OpusStd' and c['text'] == '∑':  # ∑ whole-bar rest
            glyphs.append(c)
    return marks, sysnums, multirests, glyphs


def nearest_system(systems, c):
    cy = (c['top'] + c['bottom']) / 2
    return min(range(len(systems)),
               key=lambda i: min(abs(cy - systems[i]['top']), abs(cy - systems[i]['bottom'])))


def nearest_staff(system, c):
    cy = (c['top'] + c['bottom']) / 2
    return min(range(len(system['staves'])),
               key=lambda i: abs(cy - (system['staves'][i]['y0'] + system['staves'][i]['y1']) / 2))


def main():
    args = sys.argv[1:]
    pdf_path = args[0]
    out_path = args[args.index('--out') + 1] if '--out' in args else None

    all_systems = []
    all_marks = {}
    rests = {}
    checks = []

    with pdfplumber.open(pdf_path) as pdf:
        measure_no = 0
        for pageno, page in enumerate(pdf.pages, start=1):
            staves = find_staves(page)
            systems = group_systems(page, staves)
            marks, sysnums, multirests, sum_glyphs = chars_by_kind(page)

            # group multi-digit system numbers (e.g. "46") by adjacency
            sysnum_groups = []
            for c in sorted(sysnums, key=lambda c: (round(c['top']), c['x0'])):
                if sysnum_groups and c['x0'] - sysnum_groups[-1][-1]['x1'] < 2 \
                   and abs(c['top'] - sysnum_groups[-1][-1]['top']) < 2:
                    sysnum_groups[-1].append(c)
                else:
                    sysnum_groups.append([c])

            for sy in systems:
                sy['page'] = pageno
                # The first measure starts at the staff's left edge — single-staff
                # systems draw no leading barline
                barlines = cluster([sy['staves'][0]['x0']] + find_barlines(page, sy['staves'][0]), 4)
                sy['measures'] = []

                # printed number at this system's start (verification)
                printed = None
                for g in sysnum_groups:
                    gy = (g[0]['top'] + g[0]['bottom']) / 2
                    if sy['top'] - 25 < gy < sy['top'] + 10 and g[0]['x0'] < (barlines[0] if barlines else 999):
                        printed = int(''.join(c['text'] for c in g))
                if printed is not None:
                    checks.append({'page': pageno, 'printed': printed, 'computed': measure_no + 1,
                                   'ok': printed == measure_no + 1})
                    measure_no = printed - 1  # trust the engraver

                for x0, x1 in zip(barlines, barlines[1:]):
                    if x1 - x0 < 6:
                        continue
                    # multirest? a big OpusStd digit centered over this bar
                    count = 1
                    digits = [c for c in multirests
                              if x0 < (c['x0'] + c['x1']) / 2 < x1
                              and sy['top'] - 30 < c['bottom'] < sy['top'] + 8]
                    if digits:
                        digits.sort(key=lambda c: c['x0'])
                        count = int(''.join(c['text'] for c in digits))
                    sy['measures'].append({
                        'n': measure_no + 1,
                        'x0': round(x0, 1), 'x1': round(x1, 1),
                        'count': count
                    })
                    if count > 1:
                        for st in range(len(sy['staves'])):
                            rests.setdefault(st, []).extend(range(measure_no + 1, measure_no + 1 + count))
                    measure_no += count

                # rehearsal marks attach to the measure whose start barline is
                # nearest their center (engravers center marks on the barline)
                for c in marks:
                    if nearest_system(systems, c) == systems.index(sy) and \
                       c['bottom'] < sy['top'] + 5 and sy['measures']:
                        mx = (c['x0'] + c['x1']) / 2
                        m = min(sy['measures'], key=lambda m: abs(m['x0'] - mx))
                        all_marks[c['text']] = m['n']

                # whole-bar rests per staff
                for g in sum_glyphs:
                    if nearest_system(systems, g) != systems.index(sy):
                        continue
                    st = nearest_staff(sy, g)
                    gx = (g['x0'] + g['x1']) / 2
                    for m in sy['measures']:
                        if m['x0'] < gx < m['x1']:
                            rests.setdefault(st, []).append(m['n'])

            all_systems.extend(systems)

    result = {
        'pdf': pdf_path,
        'totalMeasures': measure_no,
        'systems': all_systems,
        'marks': dict(sorted(all_marks.items())),
        'rests': {k: sorted(set(v)) for k, v in rests.items()},
        'checks': checks
    }
    text = json.dumps(result, indent=1)
    if out_path:
        with open(out_path, 'w') as f:
            f.write(text + '\n')
        bad = [c for c in checks if not c['ok']]
        print(f"wrote {out_path}: {measure_no} measures, {len(all_systems)} systems, "
              f"marks {''.join(result['marks'])}"
              + (f"  CHECK MISMATCHES: {bad}" if bad else "  (numbering verified)"))
    else:
        print(text)


if __name__ == '__main__':
    main()
