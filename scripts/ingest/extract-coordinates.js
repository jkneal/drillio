const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Extracts battery member coordinate tables from a Pyware "Final Coordinates"
// PDF and generates the Performer sections of coordinates.txt in the format
// scripts/updateCoordinates.js expects.
//
// The PDF lists every band member (2-up, two performer tables per page) with
// Pyware symbols (% = snare, n = tenor, 1-5 = bass). Battery members are
// selected by drill label using roster.json (label -> app symbol).
//
// Usage: node extract-coordinates.js <coordinates.pdf> [--out <dir>] [--movement <n>] [--roster <roster.json>]

function parseArgs(argv) {
  const args = {
    out: path.join(process.cwd(), 'ingest-output'),
    roster: path.join(__dirname, 'roster.json')
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--movement') args.movement = argv[++i];
    else if (argv[i] === '--roster') args.roster = argv[++i];
    else positional.push(argv[i]);
  }
  args.pdf = positional[0];
  return args;
}

// Parse one performer table: header line + coordinate rows below it.
function parseTable(lines) {
  const headerMatch = lines[0].match(/Performer:\s+Symbol:\s+(\S+)\s+Label:\s+(\d+)\s+(\S+)/);
  if (!headerMatch) return null;
  const performer = {
    pdfSymbol: headerMatch[1],
    label: headerMatch[2],
    movementTitle: headerMatch[3],
    rows: []
  };
  for (const line of lines.slice(1)) {
    if (/^\s*Set\s+Title/.test(line)) continue;
    if (/Printed:|Page \d+ of/.test(line)) continue;

    // Columns are separated by 2+ spaces in pdftotext -layout output:
    // Set | Title | Measure | Left-Right | Home-Visitor
    const cells = line.trim().split(/\s{2,}/);
    if (cells.length === 5 && /^\d+$/.test(cells[0])) {
      performer.rows.push({
        set: parseInt(cells[0], 10),
        title: cells[1],
        // Pyware prints tight ranges as "2-5"; normalize to "2 - 5"
        measure: cells[2].replace(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/, '$1 - $2'),
        // "Right: On 50 yd ln" is the field center; drop the side prefix so it
        // matches updateCoordinates.js's center-position format ("On 50 yd ln")
        leftRight: cells[3].replace(/^(?:Left|Right): (On 50 yd ln)$/, '$1'),
        homeVisitor: cells[4]
      });
    }
  }
  return performer.rows.length > 0 ? performer : null;
}

// Pages hold a grid of performer tables (2 side-by-side, stacked vertically).
// Segment the page at each header line, then split each segment at the column
// where its own second "Performer:" occurrence starts.
function extractPerformers(pdfPath) {
  const text = execFileSync('pdftotext', ['-layout', pdfPath, '-'], {
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024
  });
  const performers = [];
  for (const page of text.split('\f')) {
    const pageLines = page.split('\n');
    const headerIndexes = pageLines
      .map((l, i) => (l.indexOf('Performer:') !== -1 ? i : -1))
      .filter(i => i !== -1);

    headerIndexes.forEach((start, h) => {
      const end = h + 1 < headerIndexes.length ? headerIndexes[h + 1] : pageLines.length;
      const segment = pageLines.slice(start, end);
      const headerLine = segment[0];
      const secondHeader = headerLine.indexOf('Performer:', headerLine.indexOf('Performer:') + 1);

      const columns = secondHeader === -1
        ? [segment]
        : [segment.map(l => l.slice(0, secondHeader)), segment.map(l => l.slice(secondHeader))];

      for (const columnLines of columns) {
        const performer = parseTable(columnLines);
        if (performer) performers.push(performer);
      }
    });
  }
  return performers;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.pdf) {
    console.error('Usage: node extract-coordinates.js <coordinates.pdf> [--out <dir>] [--movement <n>] [--roster <roster.json>]');
    process.exit(1);
  }

  let movement = args.movement;
  if (!movement) {
    const nameMatch = path.basename(args.pdf).match(/^(\d+)/);
    if (!nameMatch) {
      console.error('Could not determine movement number; pass --movement <n>');
      process.exit(1);
    }
    movement = nameMatch[1];
  }

  const roster = JSON.parse(fs.readFileSync(args.roster, 'utf-8'));
  const allPerformers = extractPerformers(args.pdf);
  console.log(`Parsed ${allPerformers.length} performers from PDF`);

  // Keep battery members only, ordered as listed in roster.json
  const battery = [];
  for (const [label, symbol] of Object.entries(roster)) {
    const performer = allPerformers.find(p => p.label === label || p.label === label.padStart(2, '0'));
    if (!performer) {
      console.warn(`  WARNING: no performer found for label ${label} (${symbol})`);
      continue;
    }
    battery.push({ ...performer, symbol });
  }

  // Generate Performer sections in the coordinates.txt format
  const sections = battery.map(p => {
    const header = `Performer: Symbol: ${p.symbol} Label: ${p.label} ${p.movementTitle}`;
    const rows = p.rows.map(r =>
      `${r.set} ${r.title} ${r.measure} ${r.leftRight} ${r.homeVisitor}`
    );
    return [header, '', 'Set Title Measure Left-Right Home-Visitor', ...rows].join('\n');
  });

  fs.mkdirSync(args.out, { recursive: true });
  const textPath = path.join(args.out, `coordinates-${movement}-performers.txt`);
  fs.writeFileSync(textPath, sections.join('\n\n') + '\n');

  const jsonPath = path.join(args.out, `coordinates-${movement}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify({ movement, battery }, null, 2) + '\n');

  console.log(`Battery members extracted: ${battery.map(p => p.symbol).join(', ')}`);
  console.log(`Wrote ${textPath}`);
  console.log(`Wrote ${jsonPath}`);
}

main();
