#!/usr/bin/env python3
"""Extract per-set music images from part PDFs + battery score.

Uses the measure maps from score-map.py plus sets-{N}.json (set -> drill
measures) to crop {Part}{N}-{set}.png images. Handles the drill-to-score
measure offset (auto-detected by aligning set boundaries with rehearsal
marks), multi-system wrapping (pieces stacked vertically), and tacet
detection (all-rest measures produce no image).

Usage:
  python3 extract-music.py --movement <n> --dir <ingest-output/mN>
      --part SD=<SnareLine.pdf> --part TD=<TenorLine.pdf> --part BD=<BassLine.pdf>
      --score <BatteryScore.pdf> [--offset <k>] [--dpi 200]

Outputs to <dir>/music/ plus music-report-{n}.json (per set: images made,
tacet parts, derived rehearsal-mark entry, flags).
"""
import json
import math
import os
import re
import subprocess
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PAD_L, PAD_R = 10, 4          # points around the measure span
# Above must reach rehearsal marks (~35pt up) without swallowing the previous
# system's stickings/dynamics; below must include stickings + dynamics.
ABOVE, BELOW = 38, 26


def run_map(pdf, out_json):
    subprocess.run(
        ['python3', os.path.join(HERE, 'score-map.py'), pdf, '--out', out_json],
        check=True, capture_output=True, text=True)
    with open(out_json) as f:
        return json.load(f)


def render_pages(pdf, prefix, dpi):
    pages = []
    n = 1
    while True:
        out = f"{prefix}-{n}"
        r = subprocess.run(['pdftoppm', '-png', '-r', str(dpi), '-f', str(n), '-l', str(n),
                            '-singlefile', pdf, out], capture_output=True)
        if r.returncode != 0 or not os.path.exists(out + '.png'):
            break
        pages.append(out + '.png')
        n += 1
    return pages


def parse_measures(text, total, offset):
    """Drill measures string -> inclusive score-measure range, or None."""
    t = text.strip()
    if re.search(r'opening', t, re.I):
        return None, None
    if re.search(r'\bsub\b', t, re.I):
        return None, 'sub-measures — needs manual mapping'
    nums = re.findall(r'\d+(?:\.\d+)?', t)
    if not nums:
        return None, f'unparsed measures {text!r}'
    start = math.floor(float(nums[0])) + offset
    if re.search(r'end', t, re.I):
        end = total
    else:
        end = math.ceil(float(nums[-1])) + offset
    return (max(1, start), min(end, total)), None


def measures_in(map_, lo, hi):
    """[(system, measure), ...] covering [lo, hi] (multirests included)."""
    found = []
    for sy in map_['systems']:
        for m in sy['measures']:
            m_lo, m_hi = m['n'], m['n'] + m['count'] - 1
            if m_hi >= lo and m_lo <= hi:
                found.append((sy, m))
    return found


def crop_set(map_, pages, lo, hi, staff_index, out_path, dpi):
    """Crop measures lo..hi of one staff; stack when spanning systems."""
    scale = dpi / 72.0
    pieces = []
    covered = measures_in(map_, lo, hi)
    if not covered:
        return False
    by_system = []
    for sy, m in covered:
        if by_system and by_system[-1][0] is sy:
            by_system[-1][1].append(m)
        else:
            by_system.append((sy, [m]))
    # All staff bands on each page (with owning system), for clamping crops
    # away from neighbors
    page_bands = {}
    for i, sy in enumerate(map_['systems']):
        page_bands.setdefault(sy['page'], []).extend(
            (st['y0'], st['y1'], i) for st in sy['staves'])
    for bands in page_bands.values():
        bands.sort()

    for sy, ms in by_system:
        sys_index = map_['systems'].index(sy)
        staff = sy['staves'][min(staff_index, len(sy['staves']) - 1)]
        x0 = (ms[0]['x0'] - PAD_L) * scale
        x1 = (ms[-1]['x1'] + PAD_R) * scale
        if staff_index == -1:  # whole system (Staff view)
            band = (sy['top'], sy['bottom'])
        else:
            band = (staff['y0'], staff['y1'])
        bands = page_bands[sy['page']]
        prev_bottom = max((b[1] for b in bands if b[1] < band[0]), default=0)
        nxt = min(((b[0], b[2]) for b in bands if b[0] > band[1]), default=None)
        # A following staff in the same system only carries this staff's
        # stickings between them; a new system has rehearsal marks above it
        next_clamp = 10 ** 6 if nxt is None else nxt[0] - (8 if nxt[1] == sys_index else 30)
        y0 = max(band[0] - ABOVE, prev_bottom + 16) * scale
        y1 = min(band[1] + BELOW, next_clamp) * scale
        page_img = Image.open(pages[sy['page'] - 1])
        box = (max(0, int(x0)), max(0, int(y0)),
               min(page_img.width, int(x1)), min(page_img.height, int(y1)))
        pieces.append(page_img.crop(box))
    if len(pieces) == 1:
        pieces[0].save(out_path)
    else:
        width = max(p.width for p in pieces)
        canvas = Image.new('RGB', (width, sum(p.height for p in pieces)), 'white')
        y = 0
        for p in pieces:
            canvas.paste(p, (0, y))
            y += p.height
        canvas.save(out_path)
    return True


def detect_offset(sets, marks, total):
    """Offset k that lands the most set boundaries exactly on rehearsal marks."""
    mark_measures = set(marks.values())
    best_k, best_score = 0, -1
    for k in range(-2, 21):
        score = 0
        for info in sets.values():
            r, _ = parse_measures(info['measures'], total, k)
            if not r:
                continue
            if r[0] in mark_measures:
                score += 1
            if r[1] + 1 in mark_measures or r[1] == total:
                score += 1
        if score > best_score:
            best_k, best_score = k, score
    return best_k, best_score


def mark_entry(lo, hi, marks, total):
    """Rehearsal-marks shorthand for a set spanning score measures lo..hi."""
    by_measure = {v: k for k, v in sorted(marks.items())}
    start = by_measure.get(lo)
    if start is None:
        later = [m for m in by_measure if lo < m <= lo + 3]
        if later:
            m = min(later)
            start = f"{m - lo} before {by_measure[m]}"
    end = 'End' if hi >= total else by_measure.get(hi + 1)
    if end is None:
        later = [m for m in by_measure if hi + 1 < m <= hi + 4]
        if later:
            m = min(later)
            end = f"{m - hi - 1} before {by_measure[m]}"
    if start and end:
        return f"{start}-{end}"
    if start:
        return f"{start}-"
    if end:
        return f"-{end}"
    return ""


def is_tacet(map_, staff_index, lo, hi):
    rests = set(map_['rests'].get(str(staff_index if staff_index >= 0 else 0), []))
    return all(m in rests for m in range(lo, hi + 1))


def main():
    argv = sys.argv[1:]
    parts, staff_rows, opts = {}, {}, {}
    i = 0
    while i < len(argv):
        if argv[i] == '--part':
            # NAME=path[@staffRow] — staffRow selects the staff within a
            # multi-staff source (e.g. SD from the battery score is @0, TD @1)
            name, path = argv[i + 1].split('=', 1)
            if '@' in path and path.rsplit('@', 1)[1].isdigit():
                path, row = path.rsplit('@', 1)
                staff_rows[name] = int(row)
            else:
                staff_rows[name] = 0
            parts[name] = path
            i += 2
        else:
            opts[argv[i]] = argv[i + 1]
            i += 2
    movement = opts['--movement']
    out_dir = opts['--dir']
    dpi = int(opts.get('--dpi', 200))
    score_pdf = opts.get('--score')

    with open(os.path.join(out_dir, f'sets-{movement}.json')) as f:
        sets_info = json.load(f)['sets']

    music_dir = os.path.join(out_dir, 'music')
    score_dir = os.path.join(out_dir, 'score')
    os.makedirs(music_dir, exist_ok=True)
    os.makedirs(score_dir, exist_ok=True)

    sources = dict(parts)
    if score_pdf:
        sources['Staff'] = score_pdf

    maps, pages = {}, {}
    for name, pdf in sources.items():
        maps[name] = run_map(pdf, os.path.join(score_dir, f'{name}.map.json'))
        pages[name] = render_pages(pdf, os.path.join(score_dir, f'{name}-page'), dpi)

    # Consensus checks across sources
    totals = {n: m['totalMeasures'] for n, m in maps.items()}
    report = {'movement': movement, 'totals': totals, 'sets': {}, 'flags': []}
    if len(set(totals.values())) > 1:
        report['flags'].append(f'sources disagree on total measures: {totals}')
    ref = next(iter(maps.values()))
    for n, m in maps.items():
        if m['marks'] != ref['marks']:
            report['flags'].append(f'marks differ: {n}={m["marks"]} vs {list(maps)[0]}={ref["marks"]}')

    total = max(totals.values())
    if '--offset' in opts:
        offset, oscore = int(opts['--offset']), None
    else:
        offset, oscore = detect_offset(sets_info, ref['marks'], total)
    report['offset'] = offset
    print(f"movement {movement}: {total} measures, marks {ref['marks']}, drill->score offset {offset}"
          + (f" (alignment score {oscore})" if oscore is not None else ""))

    for set_num, info in sorted(sets_info.items(), key=lambda kv: int(kv[0])):
        r, flag = parse_measures(info['measures'], total, offset)
        entry = {'measures': info['measures'], 'images': [], 'tacet': [], 'flags': []}
        report['sets'][set_num] = entry
        if flag:
            entry['flags'].append(flag)
            print(f"  set {set_num}: SKIPPED — {flag}")
            continue
        if not r:
            continue
        lo, hi = r
        entry['scoreMeasures'] = [lo, hi]
        entry['rehearsalMark'] = mark_entry(lo, hi, ref['marks'], total)
        for name in sources:
            staff_index = -1 if name == 'Staff' else staff_rows.get(name, 0)
            if name == 'Staff':
                # Staff view is tacet only if every staff rests
                if all(is_tacet(maps[name], s, lo, hi) for s in range(3)):
                    entry['tacet'].append(name)
                    continue
            elif is_tacet(maps[name], staff_index, lo, hi):
                entry['tacet'].append(name)
                continue
            out_path = os.path.join(music_dir, f'{name}{movement}-{set_num}.png')
            if crop_set(maps[name], pages[name], lo, hi, staff_index, out_path, dpi):
                entry['images'].append(os.path.basename(out_path))
            else:
                entry['flags'].append(f'{name}: measures {lo}-{hi} not found in map')
        print(f"  set {set_num}: m{lo}-{hi} [{entry.get('rehearsalMark', '')}] "
              f"images={len(entry['images'])} tacet={entry['tacet']}")

    with open(os.path.join(out_dir, f'music-report-{movement}.json'), 'w') as f:
        json.dump(report, f, indent=1)
    print(f"wrote {out_dir}/music-report-{movement}.json")


if __name__ == '__main__':
    main()
