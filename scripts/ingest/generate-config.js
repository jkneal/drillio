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
  const performerData = JSON.parse(match[1]);
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
        const exists = files.has(`${part}${movement}-${set}.png`);
        // Only emit sets up to the last true to mirror sparse hand-kept config
        config[movement][part][set] = exists;
      }
      // Drop trailing false-only parts to keep the file readable
      if (Object.values(config[movement][part]).every(v => v === false)) {
        config[movement][part] = {};
      }
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
