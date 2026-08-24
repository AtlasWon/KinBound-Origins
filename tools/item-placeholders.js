/**
 * Throwaway item art, for testing the image route without any real art.
 *
 *   node tools/item-placeholders.js          write them
 *   node tools/item-placeholders.js --clean  delete them again
 *
 * These are not art and must never ship. They exist so the loader, the
 * centring, the grid nudge, the halving and the checker can be exercised
 * against real PNG files before a single drawing arrives -- and so any of that
 * can be re-checked later in one command.
 *
 * Three files, deliberately different, each proving one thing:
 *
 *   potion.png        drawn on an exact 2-pixel grid and framed sensibly.
 *                     Everything about it should come out clean, its halving
 *                     should be pixel-exact, and item:check should have nothing
 *                     whatsoever to say about it.
 *   vessel_field.png  a ringed disc built the same way but shoved one pixel
 *                     right and one down, onto the ODD pixel phase, so it is
 *                     off-centre and off-grid as delivered. If the centring
 *                     works it sits in the middle of the cell anyway; if the
 *                     phase nudge works its halving is exact despite the
 *                     offset.
 *   key_map.png       deliberately bad: a soft anti-aliased edge, one-pixel
 *                     detail that cannot survive the halving, and a stray dot
 *                     in a corner. The game must still load it; item:check must
 *                     name all three faults.
 *
 * If the first two come back clean and the third comes back with exactly those
 * complaints, the whole path works.
 *
 * IT WILL NOT TOUCH REAL ART. It used to write those three names unconditionally
 * and `--clean` used to delete them unconditionally, which was fine for exactly
 * as long as no drawing had ever arrived -- and then it silently overwrote the
 * imported potion and vessel and deleted them a minute later. Now every file it
 * writes is recorded by hash: it refuses to overwrite anything it did not write
 * itself, moves the test to another key in the same family if it can, and
 * `--clean` removes only the files that are still byte-for-byte its own.
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { encodePng } from './lib/kinpng.js';
import { iconKeys } from './lib/itemseat.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'assets', 'items');
/** What this tool wrote last time, by hash. Kept out of assets/ so it can never
 *  be mistaken for art or end up in the installer. */
const LEDGER = join(ROOT, 'build', 'item-placeholders.json');
const SIZE = 32;

const sha = (p) => createHash('sha1').update(readFileSync(p)).digest('hex');

function ledger() {
  try {
    return JSON.parse(readFileSync(LEDGER, 'utf8'));
  } catch {
    return {};
  }
}

/** True if this file on disk is one this tool wrote and nobody has changed. */
function isOurs(name) {
  const p = join(DIR, name);
  if (!existsSync(p)) return false;
  const was = ledger()[name];
  return Boolean(was) && was === sha(p);
}

if (process.argv.includes('--clean')) {
  const book = ledger();
  let n = 0, kept = 0;
  for (const name of Object.keys(book)) {
    const p = join(DIR, name);
    if (!existsSync(p)) continue;
    if (sha(p) !== book[name]) {
      kept++;
      console.log(`  LEFT  ${name}: it is not the file this tool wrote. Nothing was deleted.`);
      continue;
    }
    rmSync(p);
    n++;
  }
  if (existsSync(LEDGER)) rmSync(LEDGER);
  console.log(`item placeholders: removed ${n} file(s)`
    + (kept ? `, left ${kept} alone` : '')
    + '. Run "npm run itemart" to rewrite the index.');
  process.exit(0);
}

/* ------------------------------------------------------------ a canvas */

function blank() {
  return new Uint8ClampedArray(SIZE * SIZE * 4);
}

function put(rgba, x, y, [r, g, b], a = 255) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const d = (y * SIZE + x) * 4;
  rgba[d] = r; rgba[d + 1] = g; rgba[d + 2] = b; rgba[d + 3] = a;
}

/** One 2x2 block at design coordinates, offset by (ox, oy) whole pixels. The
 *  offset is what makes the second file interesting: an odd offset puts every
 *  block across the even grid. */
function block(rgba, dx, dy, colour, ox = 0, oy = 0) {
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) put(rgba, dx * 2 + i + ox, dy * 2 + j + oy, colour);
}

/**
 * A flask on the 16x16 design grid, the same shape the generated potion uses.
 * Everything is a whole 2x2 block, so a straight copy of this is on-grid.
 */
const FLASK = [
  '.....kkkkkk.....',
  '.....kppppk.....',
  '.....kppppk.....',
  '.....kvvvvk.....',
  '.....kvvvvk.....',
  '....kkvvvvkk....',
  '...kkvvvvvvkk...',
  '..kkvvvvvvvvkk..',
  '..kvvvvvvvvvvk..',
  '.kwwvvvvvvvvvvk.',
  '.kllllllllllllk.',
  '.kllllllllllllk.',
  '.kllllllllllllk.',
  '..kllllllllllk..',
  '..kkllllllllkk..',
  '...kkkkkkkkkk...',
];

const PALETTE = {
  k: [0x24, 0x1a, 0x10],
  p: [0x8a, 0x60, 0x38],
  v: [0xcf, 0xe0, 0xe4],
  l: [0xe0, 0x58, 0x7a],
  w: [0xff, 0xfa, 0xea],
  a: [0xc9, 0x8b, 0x4a],
};

function drawFlask(ox = 0, oy = 0) {
  const rgba = blank();
  FLASK.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const colour = PALETTE[ch];
      if (colour) block(rgba, x, y, colour, ox, oy);
    });
  });
  return rgba;
}

/**
 * A ringed disc, obviously synthetic so nobody mistakes it for real art. Its
 * ink stops one design cell short of every edge, which leaves room to shove it
 * onto the odd pixel phase without clipping -- the whole point of this file.
 */
const DISC = [
  '................',
  '.....kkkkkk.....',
  '...kkaaaaaakk...',
  '..kaaaaaaaaaak..',
  '..kaaaaaaaaaak..',
  '.kaaaaaaaaaaaak.',
  '.kaaaaaaaaaaaak.',
  '.kllllllllllllk.',
  '.kllllllllllllk.',
  '.kvvvvvvvvvvvvk.',
  '.kvvvvvvvvvvvvk.',
  '..kvvvvvvvvvvk..',
  '..kvvvvvvvvvvk..',
  '...kkvvvvvvkk...',
  '.....kkkkkk.....',
  '................',
];

function drawDisc(ox = 0, oy = 0) {
  const rgba = blank();
  DISC.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const colour = PALETTE[ch];
      if (colour) block(rgba, x, y, colour, ox, oy);
    });
  });
  return rgba;
}

/* -------------------------------------------------------------- the bad one */

/**
 * Everything the spec says not to do, in one file: one-pixel detail, a soft
 * anti-aliased edge, and a speck in the corner that drags the bounding box out.
 */
function drawBad() {
  const rgba = blank();
  const paper = [0xe0, 0xd4, 0xb0];
  const ink = [0x22, 0x20, 0x2e];
  const route = [0xc0, 0x48, 0x38];

  for (let y = 6; y < 26; y++) {
    for (let x = 4; x < 28; x++) {
      const edge = y === 6 || y === 25 || x === 4 || x === 27;
      put(rgba, x, y, edge ? ink : paper);
    }
  }
  // One-pixel detail: a route line and fold creases that cannot survive a 2:1
  // reduction, and colour changes that all land on odd pixels.
  for (let x = 7; x < 25; x += 1) put(rgba, x, 9 + ((x * 3) % 5), route);
  for (let y = 8; y < 24; y += 3) put(rgba, 11, y, ink);
  for (let y = 8; y < 24; y += 3) put(rgba, 19, y, ink);
  // A soft, anti-aliased outer edge.
  for (let x = 3; x < 29; x++) { put(rgba, x, 5, ink, 96); put(rgba, x, 26, ink, 96); }
  for (let y = 5; y < 27; y++) { put(rgba, 3, y, ink, 96); put(rgba, 28, y, ink, 96); }
  // And a stray dot, well away from the drawing.
  put(rgba, 1, 30, route);
  return rgba;
}

/* ------------------------------------------------------------------- write */

if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
mkdirSync(dirname(LEDGER), { recursive: true });

const KEYS = iconKeys(JSON.parse(readFileSync(join(ROOT, 'data', 'items', 'items.json'), 'utf8')))
  .map((k) => k.key);

/**
 * Where to put each test file.
 *
 * The preferred key first, because these three shapes were chosen to look like
 * the items they stand in for. If real art has arrived for one, the test moves
 * to another key in the same family rather than either destroying the drawing
 * or losing the coverage -- the point of the file is the pixels in it, not
 * which item it happens to be filed under.
 */
const WANT = [
  { key: 'potion', draw: () => drawFlask(0, 0) },
  { key: 'vessel_field', draw: () => drawDisc(1, 1) },
  { key: 'key_map', draw: () => drawBad() },
];

const taken = new Set();
const written = [];
const skipped = [];
for (const want of WANT) {
  const family = want.key.split('_')[0];
  const candidates = [want.key, ...KEYS.filter((k) => k === family || k.startsWith(family + '_'))];
  const free = candidates.find((k) =>
    !taken.has(k) && (!existsSync(join(DIR, `${k}.png`)) || isOurs(`${k}.png`)));
  if (!free) {
    skipped.push(want.key);
    continue;
  }
  taken.add(free);
  written.push({ name: `${free}.png`, instead: free === want.key ? null : want.key, rgba: want.draw() });
}

const book = {};
for (const w of written) {
  const bytes = encodePng(SIZE, SIZE, w.rgba);
  writeFileSync(join(DIR, w.name), bytes);
  book[w.name] = createHash('sha1').update(bytes).digest('hex');
}
writeFileSync(LEDGER, JSON.stringify(book, null, 2) + '\n');

console.log(`item placeholders: wrote ${written.length} file(s) into assets/items.`);
for (const w of written) {
  console.log(`  ${w.name}` + (w.instead ? `   (${w.instead}.png is real art, so this went elsewhere)` : ''));
}
for (const s of skipped) {
  console.log(`  SKIPPED ${s}: every key in that family already has real art. Nothing was overwritten.`);
}
console.log('');
console.log('  npm run itemart      write the index so the game can see them');
console.log('  npm run item:check   the report -- the flask and the disc should be clean,');
console.log('                       the third one should be complained about three ways');
console.log('');
console.log('  node tools/item-placeholders.js --clean    when you are done. It removes only');
console.log('                       the files it wrote and only if they are unchanged.');
