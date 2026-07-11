# Season Data Ingest Tools

Tools for pulling a new season's drill data out of the raw PDFs (Pyware
charts/coordinates, battery scores) and into the app's formats. Raw downloads
go in `reference/`; extraction output defaults to `ingest-output/` (gitignored)
so runs can be validated before anything is copied into `app/`.

The end-to-end flow is orchestrated by two Claude skills — run them per
movement, in movement order:

1. `/ingest-drill <movement>` — chart images, coordinates, counts, forms,
   orientations → `performerData.js` + `app/public/drill/`
2. `/ingest-music <movement>` — per-set music crops, rehearsal marks →
   `app/public/music/`, `rehearsalMarks.js`, `musicConfig.js`

Video/audio have no script — download from the shared drive and place as
`app/public/video/{movement}.mp4` and `app/public/audio/{movement}.mp3`.

## New season checklist — when the drill comes in

**1. Collect the raw files into `reference/`** (stays untracked — licensed
show materials):

- Per movement, from Pyware: the **Final Charts** PDF and the **Final
  Coordinates** PDF. Get BOTH — in 2025 the movement-4 coordinates PDF was
  missed, which blocked that movement's performer data, left `musicConfig.js`
  without a movement-4 section, and broke the next movement's first-set
  move detection.
- Per movement, from the arranger: the **SnareLine / TenorLine / BassLine
  part PDFs** and the **Battery Score** PDF. Part PDFs make the best crops
  (marks on every part); the score fills in when a part PDF is missing.
  Grab them mid-season — end-of-season "final" revisions can differ from
  what was actually performed.
- Video and audio per movement from the shared drive / Box link.

**2. One-time setup for the season:**

- If drill labels changed (roster turnover), update `roster.json`
  (drill label → app symbol, e.g. `"63": "SD1"`).
- Add the movement names to `app/src/data/movementsConfig.js` (hand-kept;
  the pipeline does not generate it).

**3. Ingest, one movement at a time, in order** (in a Claude Code session):

```
/ingest-drill 1     then review + apply
/ingest-music 1     then review + apply
/ingest-drill 2     ...
```

Movement order matters: counts detection for a movement's first set reads
the previous movement's final positions from `performerData.js`.
Everything lands in `ingest-output/` (gitignored, safe to delete) until the
review step approves copying into `app/`.

**4. Expect to be asked about the judgment calls** — the extraction is
deterministic but these are not:

- Forms and orientations (bass drums usually face an end zone; turn cues
  and chart notes don't always match what's performed — see the skill).
- Sets with `sub N` measures can't be mapped to score measures
  automatically, and their neighbors' printed ranges shift too — those
  music crops are mapped by hand with `music-crop.py`.
- Count splits when a footer note says "doubletime" (16 doubletime = 8
  counts) or gives an uneven split.

**5. Finish up:** place video/audio (step 1 downloads) as
`app/public/video/{N}.mp4` and `app/public/audio/{N}.mp3`, add any set
nicknames to `setNicknamesConfig.js`, run the app (`npm run dev` in `app/`)
and click through each movement, then commit.

## Scripts

### extract-drill.js

Renders each chart page of a Pyware "Final Charts" PDF to a landscape PNG named
`{movement}-{set}.png` (set number read from the page's `Set #N` footer text),
and writes `sets-{movement}.json` with counts, measures, and note lines per set.

```
node scripts/ingest/extract-drill.js "reference/1-Transient Final Charts.pdf" --out ingest-output/m1
```

Options: `--movement <n>` (default: leading digit of the PDF filename),
`--dpi <n>` (default 200 — matches the app's 2200x1700 images), `--out <dir>`.

### extract-coordinates.js

Extracts battery member coordinate tables from a Pyware "Final Coordinates"
PDF (which lists all ~100 band members) and generates the `Performer:` sections
of coordinates.txt in the exact format `scripts/updateCoordinates.js` parses.
Battery members are selected by drill label via `roster.json` (label → app
symbol) — update that file when the roster changes.

```
node scripts/ingest/extract-coordinates.js "reference/1-Transient Final Coordinates.pdf" --out ingest-output/m1
```

Outputs `coordinates-{movement}-performers.txt` (text sections) and
`coordinates-{movement}.json` (same data as JSON for downstream tooling).

### build-tables.js

Derives the Counts tables that complete a coordinates.txt (Move/Hold per
section per set, from position deltas + the chart footer's counts chunks) and
emits TBD skeletons for the Form/Orientation tables plus `analysis-{movement}.json`
flagging everything that needs judgment (mixed section movement, ensemble
notes like "Float 16 doubletime, Hold 4", ambiguous chunk splits).

```
node scripts/ingest/build-tables.js --dir ingest-output/m1
```

Run after both extractors. For movements > 1 it reads the previous movement's
final positions from `performerData.js`, so ingest movements in order.

### generate-config.js

Regenerates `musicConfig.js` from the music images that actually exist in
`app/public/music/` — a set is `true` for a part when `{Part}{mvt}-{set}.png`
is present. Eliminates config/image drift (in 2025, m4 Staff/TD/BD sets 52-55
had images but were never flagged in the hand-kept config).

```
node scripts/ingest/generate-config.js                                  # preview to stdout
node scripts/ingest/generate-config.js --out app/src/data/musicConfig.js
```

### plot-forms.py

Plots the battery's coordinates for every set of a movement in one grid image
(`battery-forms-{mvt}.png`) — forms (line/arc/staggered/scattered) are read
straight off the geometry during `/ingest-drill`'s visual pass.

```
python3 scripts/ingest/plot-forms.py --dir ingest-output/m1
```

### score-map.py

Builds a deterministic measure map for an engraved score/part PDF from its
vector and font layer: staff lines, barlines (stroke width ≥4 vs note stems'
3), multirest counts (large OpusStd digits), whole-bar-rest ∑ glyphs per
staff, rehearsal-mark letters (isolated Arial-Bold capitals), and printed
system-start measure numbers used to verify the numbering.

```
python3 scripts/ingest/score-map.py "reference/...SnareLine~Manual LITE.pdf" --out map.json
```

### extract-music.py

The `/ingest-music` engine. Maps every source PDF, renders pages, and for each
set in `sets-{mvt}.json`: converts drill measures to score measures (the
drill→score offset is auto-detected by aligning set boundaries with rehearsal
marks), skips tacet parts (all-rest measures), crops each part's staff band
(stacking systems when the range wraps), and derives the set's rehearsal-mark
entry. Writes images plus `music-report-{mvt}.json`.

```
python3 scripts/ingest/extract-music.py --movement 2 --dir ingest-output/m2 \
  --part "SD=<SnareLine.pdf>" --part "TD=<TenorLine.pdf>" --part "BD=<BassLine.pdf>" \
  --score "<BatteryScore.pdf>"
```

A part missing its PDF can be sourced from the battery score by staff row:
`--part "SD=<score.pdf>@0"` (0=snare, 1=tenor, 2=bass staff).

### music-crop.py

Manual crop/stitch helper for one-off fixes (e.g. "sub 8" sets that need
hand-mapped measure spans).

```
python3 scripts/ingest/music-crop.py crop page-1.png 335,620,890,790 BD2-14.png
python3 scripts/ingest/music-crop.py stack top.png bottom.png combined.png
```

## Validated against the 2025 season

Everything above was verified by regenerating 2025 data from `reference/` and
diffing against production:

- Drill PNGs match `app/public/drill/` (naming, size, rotation) for all 5
  movements — including movement 4, which had needed manual PDF rotation.
- Generated performer sections match the hand-made `coordinates.txt` /
  `coordinates-1.txt` byte-for-byte.
- Derived Counts tables match the hand-made tables 39/39 (m1) with the one
  judgment case (m5 set 68 "Float 16 doubletime") correctly flagged for review.
- Full pipeline (extract → tables → updateCoordinates.js) reproduces
  `performerData.js` movement 1 exactly, apart from the measures field where
  2025's m1 used an older single-measure convention (m2-m5 use ranges, as
  does the pipeline).
- Music extraction regenerated 165 images across movements 1-4 (2025 had 114);
  m1's set/tacet decisions match the hand-kept musicConfig exactly, and the
  drill→score offset (+11 for m1's uncounted intro) was auto-detected.
- Derived rehearsal marks vs the hand-kept rehearsalMarks.js: 32/52 exact,
  18 compatible (same anchors, different verbosity), 2 requiring manual
  mapping ("sub 8" sets, correctly flagged).
