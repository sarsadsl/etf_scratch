import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { attemptEtfDownload, buildManifest, cdpDownloadPromise, EXPECTED_ETFS, getTradingDate, prepareReleaseAssets } from '../src/archiver.js';
import { verifyManifest } from '../scripts/verify-archive.js';

const tempDirs = [];

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'etf-archive-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

test('CDP listeners are ready before click and are removed after completion', async () => {
  const client = new EventEmitter();
  const result = await cdpDownloadPromise(client, async () => {
    assert.equal(client.listenerCount('Browser.downloadWillBegin'), 1);
    assert.equal(client.listenerCount('Browser.downloadProgress'), 1);
    client.emit('Browser.downloadWillBegin', { suggestedFilename: 'holdings.xlsx' });
    client.emit('Browser.downloadProgress', { state: 'completed' });
    return 'Export XLSX';
  }, 100);

  assert.deepEqual(result, { clicked: true });
  assert.equal(client.listenerCount('Browser.downloadWillBegin'), 0);
  assert.equal(client.listenerCount('Browser.downloadProgress'), 0);
});

test('CDP wait cleans up when no download button is found or click fails', async () => {
  const client = new EventEmitter();
  assert.deepEqual(await cdpDownloadPromise(client, async () => null, 100), { clicked: false });
  assert.equal(client.listenerCount('Browser.downloadProgress'), 0);

  await assert.rejects(cdpDownloadPromise(client, async () => { throw new Error('click failed'); }, 100), /click failed/);
  assert.equal(client.listenerCount('Browser.downloadProgress'), 0);
});

test('CDP wait rejects on timeout and removes listeners', async () => {
  const client = new EventEmitter();
  await assert.rejects(cdpDownloadPromise(client, async () => true, 5), /CDP download timeout/);
  assert.equal(client.listenerCount('Browser.downloadWillBegin'), 0);
  assert.equal(client.listenerCount('Browser.downloadProgress'), 0);
});

test('one ETF failure is recorded without preventing another ETF download', async (t) => {
  t.mock.method(console, 'error', () => {});
  t.mock.method(console, 'log', () => {});
  const dir = makeTempDir();
  const results = new Map();
  await attemptEtfDownload(results, dir, '00991A', '00991A.xlsx', async () => {
    throw new Error('source unavailable');
  });
  await attemptEtfDownload(results, dir, '00980A', '00980A.csv', async () => {
    fs.writeFileSync(path.join(dir, '00980A.csv'), 'holdings');
  });

  assert.match(results.get('00991A').error, /source unavailable/);
  assert.equal(results.get('00980A').filename, '00980A.csv');
});

test('manifest reports completeness, missing ETFs, and downloaded count', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '00991A.xlsx'), 'file');
  const results = new Map([['00991A', { filename: '00991A.xlsx' }]]);
  const manifest = buildManifest({ yyyymmdd: '20261120' }, results, dir);

  assert.equal(manifest.complete, false);
  assert.equal(manifest.downloadedCount, 1);
  assert.deepEqual(manifest.missing, EXPECTED_ETFS.filter((code) => code !== '00991A'));
  assert.throws(() => verifyManifest(manifest), /Archive is incomplete/);

  const releaseDir = prepareReleaseAssets(dir, manifest);
  assert.deepEqual(fs.readdirSync(releaseDir).sort(), ['00991A.xlsx', 'manifest.json']);
});

test('manifest marks the archive complete when every ETF file was downloaded', () => {
  const dir = makeTempDir();
  const results = new Map();
  for (const code of EXPECTED_ETFS) {
    const filename = `${code}.csv`;
    fs.writeFileSync(path.join(dir, filename), 'file');
    results.set(code, { filename });
  }
  const manifest = buildManifest({ yyyymmdd: '20261120' }, results, dir);

  assert.equal(manifest.complete, true);
  assert.deepEqual(manifest.missing, []);
  assert.equal(manifest.downloadedCount, EXPECTED_ETFS.length);
  assert.equal(verifyManifest(manifest), true);
});

test('complete manifests pass final verification', () => {
  const files = EXPECTED_ETFS.map((code) => ({ name: `${code}.csv`, size: 1 }));
  assert.equal(verifyManifest({ complete: true, missing: [], downloadedCount: files.length, files }), true);
});

test('final verification command exits unsuccessfully for incomplete archives', () => {
  const dir = makeTempDir();
  const manifestPath = path.join(dir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({ complete: false, missing: ['00991A'], downloadedCount: 0, files: [] }));
  const verifierPath = fileURLToPath(new URL('../scripts/verify-archive.js', import.meta.url));
  const result = spawnSync(process.execPath, [verifierPath, manifestPath], { encoding: 'utf8' });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Archive is incomplete/);
});

test('trading date uses Taiwan cutoff and rolls weekends back to Friday', () => {
  assert.equal(getTradingDate(new Date('2026-11-20T06:59:00Z')).yyyymmdd, '20261119');
  assert.equal(getTradingDate(new Date('2026-11-20T07:00:00Z')).yyyymmdd, '20261120');
  assert.equal(getTradingDate(new Date('2026-11-21T10:00:00Z')).yyyymmdd, '20261120');
});
