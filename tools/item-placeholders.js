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
 */

import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { encodePng } from './lib/kinpng.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'assets', 'items');
const SIZE = 32;

const NAMES = ['potion.png', 'vessel_field.png', 'key_map.png'];

if (process.argv.includes('--clean')) {
  let n = 0;
  for (const f of NAMES) {
    const p = join(DIR, f);
    if (existsSync(p)) { rmSync(p); n++; }
  }
  console.log(`item placeholders: removed ${n} file(s). Run "npm run itemart" to rewrite the index.`);
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

const written = [
  ['potion.png', drawFlask(0, 0)],
  ['vessel_field.png', drawDisc(1, 1)],
  ['key_map.png', drawBad()],
];

for (const [name, rgba] of written) {
  writeFileSync(join(DIR, name), encodePng(SIZE, SIZE, rgba));
}

console.log(`item placeholders: wrote ${written.length} file(s) into assets/items.`);
console.log('');
console.log('  npm run itemart      write the index so the game can see them');
console.log('  npm run item:check   the report -- potion and vessel_field should be clean,');
console.log('                       key_map should be complained about three ways');
console.log('');
console.log('  node tools/item-placeholders.js --clean    when you are done');
