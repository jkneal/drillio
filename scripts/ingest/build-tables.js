const fs = require('fs');
const path = require('path');
const {
  parseYardLineToPosition,
  parseFrontBackToPosition,
  loadExistingPerformerData
} = require('../updateCoordinates.js');

// Builds the Form/Counts/Orientation table skeleton that completes a
// coordinates.txt, from the extractor outputs in an ingest-output directory:
//   - Counts tables are derived: a section that changed position moves during
//     the first counts chunk from the chart footer ("8+8" -> "Move 8, Hold 8"),
//     a section that held gets "Hold <total>".
//   - Form and Orientation entries are TBD placeholders for the visual pass
//     (see the ingest-drill skill); Orientation defaults to Front.
//   - analysis-{movement}.json records per-set/section movement distances and
//     flags anything needing judgment (ambiguous chunks, notes mentioning DL).
//
// Usage: node build-tables.js --dir <ingest-output/mN> [--movement <n>] [--performer-data <path>]

const SECTIONS = [
  { name: 'Snare', prefix: 'SD' },
  { name: 'Tenor', prefix: 'TD' },
  { name: 'Bass Drum', prefix: 'BD' }
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dir') args.dir = argv[++i];
    else if (argv[i] === '--movement') args.movement = argv[++i];
    else if (argv[i] === '--performer-data') args.performerData = argv[++i];
  }
  return args;
}

function toPosition(row) {
  return {
    x: parseYardLineToPosition(row.leftRight),
    y: parseFrontBackToPosition(row.homeVisitor.replace(/\s*\(HS\)$/, ''))
  };
}

function distance(a, b) {
  if (a.x == null || a.y == null || b.x == null || b.y == null) return null;
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

// Total counts and chunk list from a footer counts string like "8", "8+8", "0"
function parseChunks(counts) {
  const chunks = String(counts).split('+').map(c => parseInt(c.trim(), 10)).filter(n => !isNaN(n));
  return { chunks, total: chunks.reduce((a, b) => a + b, 0) };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.dir) {
    console.error('Usage: node build-tables.js --dir <ingest-output/mN> [--movement <n>] [--performer-data <path>]');
    process.exit(1);
  }

  let movement = args.movement;
  if (!movement) {
    const setsFile = fs.readdirSync(args.dir).find(f => /^sets-\d+\.json$/.test(f));
    if (!setsFile) {
      console.error(`No sets-{movement}.json found in ${args.dir}; run extract-drill.js first or pass --movement`);
      process.exit(1);
    }
    movement = setsFile.match(/^sets-(\d+)\.json$/)[1];
  }

  const setsInfo = JSON.parse(fs.readFileSync(path.join(args.dir, `sets-${movement}.json`), 'utf-8'));
  const coords = JSON.parse(fs.readFileSync(path.join(args.dir, `coordinates-${movement}.json`), 'utf-8'));

  // Previous positions for the first set of movements > 1 come from the last
  // set of the previous movement in the existing performer data (if present).
  const performerDataPath = args.performerData ||
    path.join(__dirname, '..', '..', 'app', 'src', 'data', 'performerData.js');
  const existingData = loadExistingPerformerData(performerDataPath);
  const prevMovement = String(parseInt(movement, 10) - 1);

  const setNumbers = Object.keys(setsInfo.sets).map(Number).sort((a, b) => a - b);
  const analysis = { movement, title: setsInfo.title, sections: {}, flags: [] };
  const countsTables = {};

  for (const section of SECTIONS) {
    const members = coords.battery.filter(p => p.symbol.startsWith(section.prefix));
    const sectionAnalysis = {};
    const sectionCounts = {};

    for (let i = 0; i < setNumbers.length; i++) {
      const setNum = setNumbers[i];
      const setInfo = setsInfo.sets[setNum];
      const { chunks, total } = parseChunks(setInfo.counts);

      // Per-member distance traveled from the previous set; the section entry
      // follows the majority (e.g. one bass entering while four hold is a Hold)
      let maxDist = 0;
      let movedCount = 0;
      let memberCount = 0;
      let unknownPrev = false;
      for (const member of members) {
        const row = member.rows.find(r => r.set === setNum);
        if (!row) continue;
        let prevPos = null;
        if (i > 0) {
          const prevRow = member.rows.find(r => r.set === setNumbers[i - 1]);
          if (prevRow) prevPos = toPosition(prevRow);
        } else if (movement !== '1') {
          const prevSets = existingData[member.symbol]?.movements?.[prevMovement];
          if (prevSets && prevSets.length > 0) {
            prevPos = toPosition(prevSets[prevSets.length - 1]);
          } else {
            unknownPrev = true;
          }
        }
        if (prevPos) {
          memberCount++;
          const d = distance(prevPos, toPosition(row));
          if (d !== null && d > 0.1) movedCount++;
          if (d !== null && d > maxDist) maxDist = d;
        }
      }

      const moved = memberCount > 0 && movedCount * 2 > memberCount;
      let entry;
      const flags = [];

      if (i === 0 && movement === '1') {
        entry = '0';
      } else if (i === 0 && unknownPrev) {
        entry = `TBD (${setInfo.counts})`;
        flags.push('no previous-movement data to detect movement');
      } else if (!moved) {
        entry = `Hold ${total}`;
      } else if (chunks.length === 1) {
        entry = `Move ${chunks[0]}`;
      } else if (chunks.length === 2) {
        entry = `Move ${chunks[0]}, Hold ${chunks[1]}`;
      } else {
        entry = `Move ${chunks[0]}, Hold ${total - chunks[0]}`;
        flags.push(`ambiguous chunks ${setInfo.counts} — verify move/hold split`);
      }

      if (movedCount > 0 && movedCount < memberCount) {
        flags.push(`mixed movement (${movedCount}/${memberCount} members moved) — entry follows majority`);
      }

      // Notes that mention the drumline usually override the default split
      const dlNotes = (setInfo.notes || []).filter(n => /\bDL\b|\bB\d|drum|batter/i.test(n));
      if (dlNotes.length > 0) {
        flags.push(`notes mention battery: ${dlNotes.join(' | ')}`);
      }
      // Notes without a performer-label prefix (e.g. "Float 16 doubletime,
      // Hold 4") apply to the whole ensemble and can change the move/hold split
      const ensembleNotes = (setInfo.notes || []).filter(
        n => !/^[A-Z]{1,3}\d+/.test(n.trim()) && !dlNotes.includes(n)
      );
      if (ensembleNotes.length > 0 && moved) {
        flags.push(`ensemble note may change split: ${ensembleNotes.join(' | ')}`);
      }

      sectionCounts[setNum] = entry;
      sectionAnalysis[setNum] = {
        moved,
        maxDistance: Math.round(maxDist * 100) / 100,
        footerCounts: setInfo.counts,
        entry,
        notes: setInfo.notes || [],
        flags
      };
      for (const f of flags) analysis.flags.push(`${section.name} set ${setNum}: ${f}`);
    }

    countsTables[section.name] = sectionCounts;
    analysis.sections[section.name] = sectionAnalysis;
  }

  // Assemble the tables skeleton in coordinates.txt format
  const title = setsInfo.title || `${movement}-`;
  const lines = [];
  for (const section of SECTIONS) {
    lines.push(`Form ${section.name}`, title);
    for (const setNum of setNumbers) lines.push(`${setNum} TBD`);
    lines.push('');
  }
  for (const section of SECTIONS) {
    lines.push(`Counts ${section.name}`, title);
    for (const setNum of setNumbers) lines.push(`${setNum} ${countsTables[section.name][setNum]}`);
    lines.push('');
  }
  for (const section of SECTIONS) {
    lines.push(`Orientation ${section.name}`, title);
    for (const setNum of setNumbers) lines.push(`${setNum} Front`);
    lines.push('');
  }

  const tablesPath = path.join(args.dir, `tables-${movement}-draft.txt`);
  fs.writeFileSync(tablesPath, lines.join('\n'));
  const analysisPath = path.join(args.dir, `analysis-${movement}.json`);
  fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2) + '\n');

  console.log(`Wrote ${tablesPath}`);
  console.log(`Wrote ${analysisPath}`);
  if (analysis.flags.length > 0) {
    console.log('\nItems needing judgment:');
    for (const f of analysis.flags) console.log(`  - ${f}`);
  }
}

main();
