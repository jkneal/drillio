const fs = require('fs');
const path = require('path');

// Regenerates app/src/data/musicConfig.js from the music images that exist on
// disk: a set is true for a part when {Part}{movement}-{set}.png exists.
// Movements and set lists come from performerData.js (Staff movements).
//
// Usage: node generate-config.js [--music-dir <dir>] [--out <file>]
//   Defaults: app/public/music -> stdout (pass --out to write the file,
//   e.g. --out app/src/data/musicConfig.js after validating)

const PARTS = ['Staff', 'SD', 'TD', 'BD'];

function parseArgs(argv) {
  const args = {
    musicDir: path.join(__dirname, '..', '..', 'app', 'public', 'music'),
    performerData: path.join(__dirname, '..', '..', 'app', 'src', 'data', 'performerData.js')
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--music-dir') args.musicDir = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--performer-data') args.performerData = argv[++i];
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const content = fs.readFileSync(args.performerData, 'utf-8');
  const match = content.match(/export const performerData = ({[\s\S]*});/);
  const performerData = match ? JSON.parse(match[1]) : {};
  if (!performerData.Staff) {
    console.error(`No Staff performer in ${args.performerData} — ingest drill data first (the config's movement/set lists come from performerData.js)`);
    process.exit(1);
  }
  const movements = performerData.Staff.movements;

  const files = new Set(fs.readdirSync(args.musicDir));

  const config = {};
  for (const [movement, sets] of Object.entries(movements)) {
    config[movement] = {};
    for (const part of PARTS) {
      config[movement][part] = {};
      for (const { set } of sets) {
        // Set 1 of a movement is the starting position; no music is shown for
        // it, matching the existing config which starts at the second set
        if (set === sets[0].set && movement === '1') continue;
        config[movement][part][set] = files.has(`${part}${movement}-${set}.png`);
      }
      // Drop all-false parts to keep the file readable
      if (Object.values(config[movement][part]).every(v => v === false)) {
        config[movement][part] = {};
      }
    }
  }

  // Images on disk for a movement not in performerData would silently get no
  // config (this happened when a movement's coordinates PDF was missing)
  const imageMovements = new Set(
    [...files].map(f => (f.match(/^(?:Staff|SD|TD|BD)(\d+)-\d+\.png$/) || [])[1]).filter(Boolean)
  );
  for (const m of [...imageMovements].sort()) {
    if (!config[m]) {
      console.warn(`  WARNING: music images exist for movement ${m} but performerData.js has no movement ${m} — no config emitted for it`);
    }
  }

  let js = 'export const musicConfig = ' + JSON.stringify(config, null, 2) + ';\n';
  if (args.out) {
    fs.writeFileSync(args.out, js);
    console.log(`Wrote ${args.out}`);
  } else {
    process.stdout.write(js);
  }
}

main();
