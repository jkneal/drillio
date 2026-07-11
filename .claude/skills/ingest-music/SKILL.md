---
name: ingest-music
description: Ingest a movement's sheet-music images from the part PDFs + battery score — extracts per-set crops for SD/TD/BD/Staff deterministically, derives rehearsal marks, and regenerates musicConfig. Use after /ingest-drill for the movement, e.g. "/ingest-music 2".
argument-hint: <movement-number>
---

# Ingest Music Images for a Movement

Produces `music/{Part}{N}-{set}.png` images (Part = Staff, SD, TD, BD), the
movement's `rehearsalMarks.js` entries, and a regenerated `musicConfig.js`.
Requires `/ingest-drill {N}` to have run first (needs `sets-{N}.json` for the
set→measures mapping). All output goes to `ingest-output/m{N}/` for review
before anything is copied into `app/`.

The heavy lifting is deterministic: `score-map.py` reads the engraved PDFs'
vector/font layer (staff lines, barlines by stroke width, multirest counts,
rehearsal-mark letters, whole-bar-rest glyphs), and `extract-music.py` uses
those maps to crop every set, detect tacet parts, stack wrapped systems, and
derive rehearsal-mark entries. Your job is locating inputs, reviewing its
report, and fixing the flagged cases.

## Step 1 — Locate inputs

In `reference/`, for movement N ("Part N" in score filenames) find:
- Part PDFs: `*Part {N}*SnareLine*.pdf`, `*TenorLine*`, `*BassLine*`
- Battery score: `*Part {N}*Battery*Score*.pdf` (source for Staff images)

Prefer part PDFs for SD/TD/BD (marks on every part, condensed multirests).
When a part PDF is missing, source that part from the battery score with a
staff row selector: `SD=<score.pdf>@0`, `TD=@1`, `BD=@2`. If no score exists
at all (2025 movement 5), the movement simply has no music — stop here.

## Step 2 — Extract

```
python3 scripts/ingest/extract-music.py --movement {N} --dir ingest-output/m{N} \
  --part "SD=<SnareLine.pdf>" --part "TD=<TenorLine.pdf>" --part "BD=<BassLine.pdf>" \
  --score "<BatteryScore.pdf>"
```

It prints per set: score measures, derived rehearsal-mark entry, images
created, tacet parts — and writes `music-report-{N}.json`. Check:

- **Offset**: the drill→score measure offset is auto-detected by aligning set
  boundaries with rehearsal marks (2025 movement 1 was +11 — the drill didn't
  count the rubato intro). A low alignment score means the offset is suspect —
  verify against a known set before trusting the crops.
- **Flags**: `sub-measures` sets (e.g. "sub 8") can't be mapped automatically —
  determine their real measure span with the user, then crop manually with
  `music-crop.py` (boxes from the map JSON in `ingest-output/m{N}/score/`).
  A sub set usually also means its NEIGHBOR sets' footer ranges overlap —
  double-check the sets before/after it.
- **Source disagreements**: totals/marks differing between part PDFs usually
  means one map mis-parsed — investigate before using that part's crops.

## Step 3 — Verify visually

Read a sample of the generated images (at minimum: one per part, one
multi-system stacked image, one battery-score-sourced part if any):
correct marks visible, bar count matches the measure span, stickings and
dynamics not clipped, no heavy bleed from neighboring staves. Fix issues by
adjusting and re-running rather than hand-editing single images when the
problem is systematic.

## Step 4 — Review with the user

Show the per-set summary (measures, marks entry, images, tacet) plus a few
sample crops. Compare tacet decisions against what the user expects — a part
with content the user considers not worth showing should be dropped from the
final copy. Do NOT proceed until the user approves.

## Step 5 — Apply

1. `cp ingest-output/m{N}/music/*.png app/public/music/`
2. Merge the movement's entries into `app/src/data/rehearsalMarks.js` — use
   the derived entries from `music-report-{N}.json`, trimmed to the user's
   preferred verbosity (they often wrote "N-" where the derivation says
   "N-2 before O"; both are correct — ask which style they want).
3. Regenerate musicConfig (AFTER copying images — it scans the disk):
   `node scripts/ingest/generate-config.js --out app/src/data/musicConfig.js`
4. Remind the user: place the movement video/audio as
   `app/public/video/{N}.mp4` and `app/public/audio/{N}.mp3`.

## Gotchas

- Each movement's score restarts measure numbering.
- The drill's fractional measures ("28.5 - 41") floor/ceil to whole bars —
  crops include the partial bar, which is desirable context.
- Per-part tacet really happens (2025 m4 was snare-heavy; m2 had sets where
  only SD or only TD/BD rested) — trust the ∑-glyph detection but let the
  user overrule.
- Late-season "Final" PDFs can be revisions of what the band actually
  performed from mid-season; measure content may differ from older images.
