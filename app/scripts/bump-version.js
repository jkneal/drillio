import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read current version from version.js
const versionPath = join(__dirname, '../src/version.js');
const viteConfigPath = join(__dirname, '../vite.config.js');

// Bump patch version
function bumpVersion(version) {
  const parts = version.split('.');
  parts[2] = String(parseInt(parts[2]) + 1);
  return parts.join('.');
}

// Update version.js
const versionContent = fs.readFileSync(versionPath, 'utf8');
const versionMatch = versionContent.match(/APP_VERSION = '(\d+\.\d+\.\d+)'/);
if (versionMatch) {
  const oldVersion = versionMatch[1];
  const newVersion = bumpVersion(oldVersion);
  
  const newVersionContent = versionContent.replace(
    `APP_VERSION = '${oldVersion}'`,
    `APP_VERSION = '${newVersion}'`
  );
  fs.writeFileSync(versionPath, newVersionContent);
  
  // Update vite.config.js
  const viteContent = fs.readFileSync(viteConfigPath, 'utf8');
  const newViteContent = viteContent.replace(
    /BUILD_VERSION = '\d+\.\d+\.\d+'/,
    `BUILD_VERSION = '${newVersion}'`
  );
  fs.writeFileSync(viteConfigPath, newViteContent);
  
  console.log(`Version bumped from ${oldVersion} to ${newVersion}`);
} else {
  console.error('Could not find version in version.js');
}