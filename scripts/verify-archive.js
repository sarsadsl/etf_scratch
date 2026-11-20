import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function verifyManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('Archive manifest must be a JSON object');
  }
  if (manifest.complete !== true) {
    const missing = Array.isArray(manifest.missing) ? manifest.missing.join(', ') : 'unknown';
    throw new Error(`Archive is incomplete; missing ETFs: ${missing || 'none listed'}`);
  }
  if (!Array.isArray(manifest.missing) || manifest.missing.length > 0) {
    throw new Error('Archive manifest is inconsistent: complete must have an empty missing list');
  }
  if (!Number.isInteger(manifest.downloadedCount) || manifest.downloadedCount !== manifest.files?.length) {
    throw new Error('Archive manifest has an invalid downloadedCount');
  }
  return true;
}

function main() {
  const manifestPath = process.argv[2];
  if (!manifestPath) throw new Error('Usage: node scripts/verify-archive.js <manifest.json>');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  verifyManifest(manifest);
  console.log(`Archive ${manifest.date} is complete (${manifest.downloadedCount} ETF files).`);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  try {
    main();
  } catch (error) {
    console.error(`[Archive verification] ${error.message}`);
    process.exitCode = 1;
  }
}
