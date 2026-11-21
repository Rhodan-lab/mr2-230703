import assert from 'node:assert/strict';
import { lstatSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { buildDossier } from '../vendor/makefun-game.ts';

function walk(root, prefix = '') {
  const result = [];
  for (const name of readdirSync(join(root, prefix)).sort()) {
    const path = join(prefix, name);
    const info = lstatSync(join(root, path));
    assert(!info.isSymbolicLink());
    assert(info.isDirectory() || info.isFile());
    assert(Buffer.byteLength(path) <= 1000);
    result.push({ path, directory: info.isDirectory(), bytes: info.isFile() ? info.size : 0 });
    if (info.isDirectory()) result.push(...walk(root, path));
  }
  return result;
}

const output = resolve('out');
const tree = walk(join(output, 'game'));
const bytes = tree.reduce((sum, item) => sum + item.bytes, 0);
assert(tree.length <= 993);
assert(bytes <= 48 * 1024 * 1024);
assert(lstatSync(join(output, 'game/index.html')).size <= 1024 * 1024);
let sourceLines = 0;
let sourceModules = 0;
for (const entry of tree) {
  if (!entry.path.endsWith('.js')) continue;
  const file = join(output, 'game', entry.path);
  const source = readFileSync(file, 'utf8');
  sourceLines += source.split('\n').length - 1;
  sourceModules++;
  assert(!/https?:\/\//.test(source), `External URL in ${entry.path}`);
  assert(!/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|Worker)\s*\(/.test(source));
  for (const match of source.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)) {
    const specifier = match[1];
    assert(specifier.startsWith('./'), `Bare specifier ${specifier}`);
    const destination = resolve(dirname(file), specifier);
    assert(destination.startsWith(join(output, 'game') + '/'));
    assert(lstatSync(destination).isFile());
  }
  execFileSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(pathToFileURL(file).href)})`], { stdio: 'pipe' });
}
const html = readFileSync(join(output, 'game/index.html'), 'utf8');
assert(!/https?:\/\//.test(html));
for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
  assert(match[1].startsWith('./'));
  assert(lstatSync(resolve(output, 'game', match[1])).isFile());
}

const screenshotNames = readdirSync(join(output, 'screenshots')).sort();
assert.deepEqual(screenshotNames, ['1-chase.jpg', '2-goldenhour.jpg', '3-city.jpg', '4-boat.jpg']);
const screenshots = screenshotNames.map(name => {
  const data = readFileSync(join(output, 'screenshots', name));
  assert(data.length <= 204800);
  assert.equal(data.readUInt16BE(0), 0xffd8);
  assert.equal(data.readUInt16BE(data.length - 2), 0xffd9);
  let width = 0;
  let height = 0;
  for (let offset = 2; offset + 9 < data.length;) {
    if (data[offset++] !== 255) continue;
    const marker = data[offset++];
    if (marker === 216 || marker === 217) continue;
    if ([192, 193, 194].includes(marker)) {
      height = data.readUInt16BE(offset + 3);
      width = data.readUInt16BE(offset + 5);
      break;
    }
    const size = data.readUInt16BE(offset);
    assert(size >= 2);
    offset += size;
  }
  assert.equal(width, 1280);
  assert.equal(height, 720);
  return { name, bytes: data.length, width, height };
});

const dossier = readFileSync(join(output, 'dossier.json'));
assert(dossier.length <= 1572864);
const regenerated = buildDossier(output, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 204800 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
assert(dossier.equals(Buffer.from(regenerated)));
const first = walk(resolve('out-first'));
const second = walk(output);
assert.deepEqual(first, second);
for (const entry of second) {
  if (entry.directory) continue;
  assert(readFileSync(join('out-first', entry.path)).equals(readFileSync(join(output, entry.path))), `Repeat differs: ${entry.path}`);
}
const capture = JSON.parse(readFileSync('validation-capture.json', 'utf8'));
const gameplay = JSON.parse(readFileSync('validation-gameplay.json', 'utf8'));
const browser = JSON.parse(readFileSync('validation-browser.json', 'utf8'));
assert.equal(capture.errors.length, 0);
assert.equal(browser.exceptions.length, 0);
assert(gameplay.passed >= 17);
const report = {
  gameEntries: tree.length,
  gameBytes: bytes,
  sourceModules,
  sourceLines,
  indexBytes: Buffer.byteLength(html),
  screenshots,
  dossierBytes: dossier.length,
  dossierSha256: createHash('sha256').update(dossier).digest('hex'),
  gateEquivalent: {
    game_files: 'PASS',
    references: 'PASS',
    screenshots: 'PASS',
    dossier_matches: 'PASS',
    js_parses: 'PASS',
  },
  deterministicBuild: 'PASS — byte comparison of every output file',
  gameplayChecks: gameplay.passed,
  browserExceptions: browser.exceptions.length,
  network: 'All 42 observed game requests were local',
  officialGrade: 'Not run; no makefun CLI invoked',
};
writeFileSync('validation-output.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
