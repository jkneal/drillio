---
name: ingest-drill
description: Ingest a movement's drill data from the season's raw PDFs (Pyware charts + coordinates) into the app — extracts chart images, coordinates, and counts, then visually determines forms and orientations for review before updating performerData.js. Use when the user wants to load new drill/season data, e.g. "/ingest-drill 2" or "ingest movement 2".
argument-hint: <movement-number>
---

# Ingest Drill Data for a Movement

Ingest one movement's drill data end-to-end. Movements MUST be ingested in
order (1, then 2, ...) — cross-movement move detection for the first set of a
movement reads the previous movement from performerData.js.

All intermediate output goes to `ingest-output/m{N}/` (gitignored). Nothing
touches `app/` until the user approves the review summary.

## Step 1 — Locate inputs

The movement number is the argument (call it N). Find in `reference/`:
- Charts PDF: matches `{N}-*Charts*.pdf` (ignore any `-rotated` variant)
- Coordinates PDF: matches `{N}-*Coordinates*.pdf`

If either is missing, stop and ask the user for it.

## Step 2 — Run the extractors

```
node scripts/ingest/extract-drill.js "<charts.pdf>" --out ingest-output/m{N}
node scripts/ingest/extract-coordinates.js "<coordinates.pdf>" --out ingest-output/m{N}
node scripts/ingest/build-tables.js --dir ingest-output/m{N}
```

Confirm every page produced a `{N}-{set}.png` and all 10 battery members were
extracted (SD1-3, TD1-2, BD1-5). If the roster changed (different drill labels),
update `scripts/ingest/roster.json` first.

This produces in `ingest-output/m{N}/`:
- `drill/{N}-{set}.png` — chart images (already named and rotated)
- `sets-{N}.json` — per set: counts, measures, footer notes
- `coordinates-{N}-performers.txt` / `.json` — battery coordinate tables
- `tables-{N}-draft.txt` — Counts tables derived; Form/Orientation are TBD
- `analysis-{N}.json` — per-set movement analysis + flags needing judgment

## Step 3 — Visual pass (forms, orientations, count splits)

First plot the battery geometry for every set in one grid image:

```
python3 scripts/ingest/plot-forms.py --dir ingest-output/m{N}
```

Read `battery-forms-{N}.png` — forms are directly readable from the plotted
positions (line vs arc vs staggered vs scattered vs tight cluster). Only open
the full drill chart `drill/{N}-{set}.png` when you need context the plot
can't give (props, other sections, the notes text in situ). Consult
`analysis-{N}.json` for which sections moved, how far, and the footer notes.

Finding the battery on a full chart: snares are `%` symbols near labels 63-65,
tenors `n` near 61-62, basses circled digits 1-5 near 66-70. Labels sit next
to each symbol. Heavy black dashes are props.

**Form** (one entry per section per set) — short display name for the shape
the section is in, using the established vocabulary where it fits:
- "Battery Line", "Battery Arc", "Battery Diagonal" — whole battery shapes
- "2 Battery Lines" — the battery in two parallel ranks / staggered double file
- "Snare Line", "Tenor Line", "Bass Line" — section-only shapes
- "Triangle" / "BD Triangle" — a section in a tight wedge cluster
- "Staggered", "Scattered", "Behind Props", "Block"
- Append qualifiers when useful: "Behind Props, 2 Snares out"
- Prefer "Battery Arc" over "Battery Line" when in doubt on shallow curves —
  the 2025 tables called even gently sagging lines arcs
- Append turn cues from the notes when the set involves a facing change:
  "Scattered, Turn backfield", "Battery Line, Turn to end zone",
  "Battery Line, Turn to front first 2 counts"

**Orientation** (one entry per section per set) — which way performers face
while EXECUTING this set's move (or hold). Allowed values ONLY: `Front`,
`Back`, `Left End Zone`, `Right End Zone` (Left = the side the "Left:"
coordinates refer to). Determine from, in priority order:
1. Ensemble footer notes — "winds / DL face back", "DL turn toward side 2 endzone"
2. Continuity — orientation persists from the previous set until a note/turn
   cue changes it; a "Turn X" cue in set S changes orientation starting set S
3. Marching direction — performers usually face their direction of travel
   unless a note says otherwise (backward marching shows as Move ... Backward
   tips later, which is normal for approaches to the front)
4. Bass drums face an end zone whenever the rest face Front — they carry
   drums sideways. In 2025 this held for nearly every set (m1 sets 1-7 Left
   End Zone, m1 11-13 + all of m2 Right End Zone, m3 46-51 Left End Zone);
   which end zone varies, so propose one and flag for review
5. The 2025 data applied a turn cue printed on set S's chart to set S-1
   (the turn happens during the preceding hold). When a turn note appears,
   ask the user which set the new facing starts at rather than assuming
6. Notes can disagree with what was performed (2025 m3 said "DL face front"
   at set 39 but the battery faced Back through set 45) — orientation is the
   least derivable field; always present it as a judgment for review

**Counts** — mostly already derived in `tables-{N}-draft.txt`. Resolve every
flag in `analysis-{N}.json`:
- "ensemble note may change split": interpret the note. "Float 16 doubletime,
  Hold 4" means 16 halftime steps = 8 counts moving, so `Move 8, Hold 4`.
  "Hold 8, Move 4"-style notes put the hold first: `Hold 8, Move 4`.
- "mixed movement": the entry follows the majority; only change it if the
  chart/notes show the majority reading is wrong.
- "ambiguous chunks" (e.g. `3+7+27`): use the notes/video to pick the split;
  if still unclear, ask the user.

## Step 4 — Assemble and dry-run

1. Fill every TBD in `tables-{N}-draft.txt` with the determined values.
   Orientation rows that are `Front` may be left as-is (Front is the default).
2. Concatenate into `ingest-output/m{N}/coordinates-full.txt` in this order:
   performer sections, Form x3, Counts x3, Orientation x3 (same layout as the
   draft — section header line, movement title line, then `{set} {value}` rows).
3. Dry run against a throwaway copy of the real data so cross-movement tips
   resolve, e.g.:
   ```
   cp app/src/data/performerData.js ingest-output/m{N}/performerData.test.js
   node scripts/updateCoordinates.js ingest-output/m{N}/coordinates-full.txt ingest-output/m{N}/performerData.test.js
   ```
4. Sanity-check the movement in `performerData.test.js`: every set present for
   all 10 performers + Staff, no null/empty tips after set 1, counts totals
   match the footer counts, movementVectors present whenever a section moved.

## Step 5 — Review with the user

Present a compact review table: per set — measures, counts entry per section,
form per section, orientation per section, and any judgment calls made
(especially orientation guesses and count-split interpretations). Show the
drill chart for any set the user wants to inspect.

Do NOT proceed until the user approves.

## Step 6 — Apply

1. `cp ingest-output/m{N}/drill/*.png app/public/drill/`
2. `node scripts/updateCoordinates.js ingest-output/m{N}/coordinates-full.txt app/src/data/performerData.js`
3. Verify the app loads the new movement (`npm run dev` in `app/`), then remind
   the user of the remaining per-movement steps: music images (`/ingest-music`),
   rehearsal marks, and video/audio placement.

## Conventions & gotchas

- Measures stay exactly as printed ("2 - 5", "sub 8", "46 to End") — do not
  reduce ranges to the arrival measure.
- Counts can be composite ("8+8", "12+16", "3+7+27") and each movement's
  measure numbering restarts at 1.
- Set 1 of movement 1 has counts "0" and tip "Starting position".
- setNicknamesConfig.js is optional flavor — ask the user if any set deserves
  a nickname (e.g. "Block").
