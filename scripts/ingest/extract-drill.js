const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Extracts drill chart pages from a Pyware "Final Charts" PDF:
//  - renders each page to PNG, rotates to landscape
//  - names each image {movement}-{set}.png using the "Set #N" footer text
//  - writes sets-{movement}.json with counts/measures/notes per set
//
// Usage: node extract-drill.js <charts.pdf> [--out <dir>] [--movement <n>] [--dpi <n>]

function parseArgs(argv) {
  const args = { out: path.join(process.cwd(), 'ingest-output'), dpi: 200 };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--movement') args.movement = argv[++i];
    else if (argv[i] === '--dpi') args.dpi = parseInt(argv[++i], 10);
    else positional.push(argv[i]);
  }
  args.pdf = positional[0];
  return args;
}

function getPageCount(pdfPath) {
  const info = execFileSync('pdfinfo', [pdfPath], { encoding: 'utf-8' });
  const match = info.match(/^Pages:\s+(\d+)/m);
  if (!match) throw new Error('Could not determine page count');
  return parseInt(match[1], 10);
}

function getPageText(pdfPath, page) {
  return execFileSync(
    'pdftotext',
    ['-layout', '-f', String(page), '-l', String(page), pdfPath, '-'],
    { encoding: 'utf-8' }
  );
}

// Parse the footer block: "Set #2 Counts: 16 Measures: 2 - 5   1-Transient"
// followed by note lines (left column) and general reminders (right column).
function parseFooter(pageText) {
  const lines = pageText.split('\n');
  const setLineIndex = lines.findIndex(l => /Set #\d+\s+Counts:/.test(l));
  if (setLineIndex === -1) return null;

  const setMatch = lines[setLineIndex].match(
    /Set #(\d+)\s+Counts:\s*(\S+)\s+Measures:\s*(.+?)(?:\s{3,}(\S.*))?\s*$/
  );
  if (!setMatch) return null;
  const [, setNum, counts, measures, title] = setMatch;

  // Note lines follow the Set # line. The left column holds per-set
  // instructions; the right column (aligned far right) holds general reminders.
  const notes = [];
  const reminders = [];
  for (let i = setLineIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    // Skip print metadata that can appear below the footer
    if (/Licensed to:|Created on Pyware|Printed:/.test(line)) continue;
    const gapSplit = line.split(/\s{10,}/).filter(p => p.trim());
    const leadingSpace = line.match(/^\s*/)[0].length;
    if (leadingSpace > 60) {
      // Line only exists in the right column
      reminders.push(line.trim());
    } else {
      notes.push(gapSplit[0].trim());
      if (gapSplit.length > 1) reminders.push(gapSplit.slice(1).join(' ').trim());
    }
  }

  return {
    set: parseInt(setNum, 10),
    counts: counts.trim(),
    measures: measures.trim(),
    title: title ? title.trim() : null,
    notes,
    reminders
  };
}

function renderPage(pdfPath, page, dpi, outPathNoExt) {
  execFileSync('pdftoppm', [
    '-png', '-r', String(dpi),
    '-f', String(page), '-l', String(page),
    '-singlefile',
    pdfPath, outPathNoExt
  ]);
  return `${outPathNoExt}.png`;
}

function getImageSize(imagePath) {
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', imagePath], { encoding: 'utf-8' });
  const width = parseInt(out.match(/pixelWidth:\s+(\d+)/)[1], 10);
  const height = parseInt(out.match(/pixelHeight:\s+(\d+)/)[1], 10);
  return { width, height };
}

function rotateToLandscape(imagePath) {
  const { width, height } = getImageSize(imagePath);
  if (height > width) {
    // Pyware prints landscape charts on portrait pages, rotated 90° CCW;
    // rotate 90° CW to restore. sips rotates clockwise.
    execFileSync('sips', ['--rotate', '90', imagePath], { stdio: 'ignore' });
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.pdf) {
    console.error('Usage: node extract-drill.js <charts.pdf> [--out <dir>] [--movement <n>] [--dpi <n>]');
    process.exit(1);
  }

  // Movement number from --movement or the leading digit of the PDF filename
  let movement = args.movement;
  if (!movement) {
    const nameMatch = path.basename(args.pdf).match(/^(\d+)/);
    if (!nameMatch) {
      console.error('Could not determine movement number; pass --movement <n>');
      process.exit(1);
    }
    movement = nameMatch[1];
  }

  const drillDir = path.join(args.out, 'drill');
  fs.mkdirSync(drillDir, { recursive: true });

  const pageCount = getPageCount(args.pdf);
  console.log(`Movement ${movement}: ${pageCount} pages`);

  const setsInfo = { movement, title: null, sets: {} };

  for (let page = 1; page <= pageCount; page++) {
    const footer = parseFooter(getPageText(args.pdf, page));
    if (!footer) {
      console.warn(`  Page ${page}: no "Set #" footer found — skipped`);
      continue;
    }
    if (footer.title) setsInfo.title = footer.title;

    const imagePath = renderPage(args.pdf, page, args.dpi, path.join(drillDir, `${movement}-${footer.set}`));
    rotateToLandscape(imagePath);

    setsInfo.sets[footer.set] = {
      page,
      counts: footer.counts,
      measures: footer.measures,
      notes: footer.notes,
      reminders: footer.reminders
    };
    console.log(`  Page ${page} -> ${movement}-${footer.set}.png  (Counts: ${footer.counts}, Measures: ${footer.measures})`);
  }

  const setsPath = path.join(args.out, `sets-${movement}.json`);
  fs.writeFileSync(setsPath, JSON.stringify(setsInfo, null, 2) + '\n');
  console.log(`Wrote ${setsPath}`);
}

main();
