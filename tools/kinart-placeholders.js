/**
 * Throwaway creature art, for testing the image route without any real art.
 *
 *   node tools/kinart-placeholders.js          write them
 *   node tools/kinart-placeholders.js --clean  delete them again
 *
 * These are not art and must never ship. They exist so the loader, the
 * seating, the icon reduction, the hit flash and the party screen can be
 * exercised against real PNG files before a single drawing arrives -- and so
 * that any of that can be re-checked later in one command.
 *
 * Two species get files, and they are deliberately different:
 *
 *   cinderpaw  drawn on an exact 2-pixel grid, framed correctly. Everything
 *              about it should come out clean, and its 64px icon should be a
 *              pixel-exact halving with no new colours in it.
 *   rilltail   the same construction shoved 13 pixels right and 21 up, on the
 *              ODD pixel phase. If the seating works it stands on the same
 *              ground line as everything else anyway, and if the grid-phase
 *              shift works its icon is exact too despite the offset.
 *
 * Front and back are obviously distinguishable: the front has a face and looks
 * left, the back has a spine stripe, no face, and looks right.
 */

import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'assets', 'kin');
const SIZE = 128;

const NAMES = ['cinderpaw-front.png', 'cinderpaw-back.png', 'rilltail-front.png', 'rilltail-back.png'];

if (process.argv.includes('--clean')) {
  let n = 0;
  for (const f of NAMES) {
    const p = join(DIR, f);
    if (existsSync(p)) { rmSync(p); n++; }
  }
  console.log(`placeholders: removed ${n} file(s). Run "npm run kinart" to rewrite the index.`);
  process.exit(0);
}

/* --------------------------------------------------------------- encoder */

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

/** RGBA8, no interlace, filter 0 on every row. */
function encodePng(w, h, rgba) {
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0;
    rgba.copy(raw, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------------------------------------------------------------- drawing */

function canvas() {
  return { w: SIZE, h: SIZE, d: Buffer.alloc(SIZE * SIZE * 4) };
}

function px(c, x, y, rgb) {
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const i = (y * c.w + x) * 4;
  c.d[i] = rgb[0]; c.d[i + 1] = rgb[1]; c.d[i + 2] = rgb[2]; c.d[i + 3] = 255;
}

/** One 2x2 block, on the grid the icon halves along. Everything is drawn in
 *  these, which is what makes the reduction exact. */
function block(c, bx, by, rgb, ox, oy) {
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
    px(c, ox + bx * 2 + dx, oy + by * 2 + dy, rgb);
  }
}

const INK = [24, 20, 34];
const BODY = [214, 96, 58];
const DARK = [150, 56, 34];
const LIGHT = [246, 176, 108];
const EYE = [250, 250, 255];

/**
 * A blunt creature: body, four feet, a head on the left, an ear.
 * Coordinates are in 2x2 blocks, so this is a 64x64 drawing at 128x128.
 * `ox`/`oy` move the whole thing, in PIXELS, so a placeholder can be put
 * deliberately in the wrong place.
 */
function creature(back, ox, oy) {
  const c = canvas();
  const B = (bx, by, rgb) => block(c, bx, by, rgb, ox, oy);

  // Body: blocks 16..46 across, 30..52 down.
  for (let by = 30; by <= 52; by++) {
    for (let bx = 16; bx <= 46; bx++) {
      const edge = by === 30 || by === 52 || bx === 16 || bx === 46;
      B(bx, by, edge ? INK : by < 36 ? LIGHT : by > 47 ? DARK : BODY);
    }
  }
  // Head, on the left for the front view and the right for the back view.
  const hx = back ? 40 : 14;
  for (let by = 18; by <= 33; by++) {
    for (let bx = hx; bx <= hx + 14; bx++) {
      const edge = by === 18 || by === 33 || bx === hx || bx === hx + 14;
      B(bx, by, edge ? INK : by < 24 ? LIGHT : BODY);
    }
  }
  // Ear.
  for (let by = 12; by <= 18; by++) B(hx + (back ? 11 : 3), by, INK);
  // Feet, planted on the ground line: block row 60 is pixel rows 120-121, and
  // the loader seats whatever this is so its last ink row is 123.
  for (const fx of [18, 26, 36, 44]) {
    for (let by = 53; by <= 61; by++) {
      for (let bx = fx; bx <= fx + 5; bx++) {
        B(bx, by, by === 61 || bx === fx || bx === fx + 5 ? INK : DARK);
      }
    }
  }

  if (back) {
    // A spine stripe instead of a face: unmistakably the other view.
    for (let by = 31; by <= 51; by += 2) for (let bx = 28; bx <= 34; bx++) B(bx, by, LIGHT);
  } else {
    // One big eye and a mouth, both facing left.
    for (let by = 24; by <= 28; by++) for (let bx = hx + 3; bx <= hx + 7; bx++) B(bx, by, EYE);
    for (let by = 25; by <= 27; by++) for (let bx = hx + 4; bx <= hx + 5; bx++) B(bx, by, INK);
    for (let bx = hx + 1; bx <= hx + 6; bx++) B(bx, 31, INK);
  }
  return c;
}

mkdirSync(DIR, { recursive: true });

const out = [
  // Framed the way the spec asks for.
  ['cinderpaw-front.png', creature(false, 0, 0)],
  ['cinderpaw-back.png', creature(true, 0, 0)],
  // Badly framed AND off the even pixel grid, on purpose.
  ['rilltail-front.png', creature(false, 13, -21)],
  ['rilltail-back.png', creature(true, 13, -21)],
];

for (const [name, c] of out) {
  writeFileSync(join(DIR, name), encodePng(c.w, c.h, c.d));
  console.log('placeholders: wrote assets/kin/' + name);
}
console.log('placeholders: now run "npm run kinart" to index and check them.');
