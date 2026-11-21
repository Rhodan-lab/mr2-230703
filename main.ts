// MARBELLA RUN 2. Initial build pass: validate, copy, seal with official dossier API.
import { cpSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const limits = {
  files: 993,
  gameBytes: 48 * 1024 * 1024,
  screenshotBytes: 204800,
  dossierBytes: 1572864,
};

function log(phase: string, detail: Record<string, unknown>) {
  console.log(JSON.stringify({ build: 'marbella-run-2', phase, ...detail }));
}

function demand(condition: boolean, explanation: string) {
  if (!condition) throw new Error(explanation);
}

function auditGame(directory: string) {
  let count = 0;
  let bytes = 0;
  function walk(folder: string) {
    for (const name of readdirSync(folder).sort()) {
      const path = join(folder, name);
      const info = lstatSync(path);
      count++;
      demand(!info.isSymbolicLink(), 'Symlinks are unsupported');
      demand(Buffer.byteLength(relative(directory, path)) <= 1000, 'Game path too long');
      if (info.isDirectory()) walk(path);
      else {
        demand(info.isFile(), 'Special file in game');
        bytes += info.size;
      }
    }
  }
  walk(directory);
  demand(count <= limits.files, 'Game entry count exceeded');
  demand(bytes <= limits.gameBytes, 'Game byte cap exceeded');
  demand(lstatSync(join(directory, 'index.html')).size <= 1048576, 'Index cap exceeded');
  return { count, bytes };
}

function imageDimensions(data: Buffer): [number, number] {
  demand(data[0] === 255 && data[1] === 216, 'Expected JPEG');
  let offset = 2;
  while (offset + 9 < data.length) {
    if (data[offset++] !== 255) continue;
    const marker = data[offset++];
    if (marker === 216 || marker === 217) continue;
    const size = data.readUInt16BE(offset);
    if ([192, 193, 194].includes(marker)) {
      return [data.readUInt16BE(offset + 5), data.readUInt16BE(offset + 3)];
    }
    demand(size >= 2, 'Invalid JPEG segment');
    offset += size;
  }
  throw new Error('Missing JPEG dimensions');
}

function auditScreenshots(directory: string) {
  const expected = ['1-chase.jpg', '2-goldenhour.jpg', '3-city.jpg', '4-boat.jpg'];
  const names = readdirSync(directory).filter(name => !name.startsWith('.')).sort();
  demand(JSON.stringify(names) === JSON.stringify(expected), 'Four named screenshots required');
  return names.map(name => {
    const path = join(directory, name);
    demand(lstatSync(path).isFile(), 'Screenshot must be regular');
    const data = readFileSync(path);
    demand(data.length <= limits.screenshotBytes, 'Screenshot over 200 KiB');
    const [width, height] = imageDimensions(data);
    demand(width === 1280 && height === 720, 'Expected 1280 by 720');
    return { name, bytes: data.length, width, height };
  });
}

const tree = auditGame(join(root, 'game'));
const images = auditScreenshots(join(root, 'screenshots'));
log('preflight', { tree, images });
mkdirSync(output, { recursive: true });
cpSync(join(root, 'game'), join(output, 'game'), { recursive: true });
cpSync(join(root, 'screenshots'), join(output, 'screenshots'), { recursive: true });
const dossier = buildDossier(output, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 204800 },
  game_max_files: limits.files,
  game_max_bytes: limits.gameBytes,
  game_path_max_bytes: 1000,
});
demand(Buffer.byteLength(dossier) <= limits.dossierBytes, 'Dossier over cap');
writeFileSync(join(output, 'dossier.json'), dossier);
log('complete', { dossierBytes: Buffer.byteLength(dossier), entries: tree.count });
