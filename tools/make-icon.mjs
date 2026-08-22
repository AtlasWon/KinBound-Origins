/**
 * Generates launcher/icon.png.
 *
 * Written by hand rather than pulled from a library for the same reason the
 * game generates its tiles and creatures: nothing binary lives in the repo, and
 * the art stays editable by anyone who can read a file. Node ships zlib, which
 * is the only genuinely hard part of a PNG; the rest is four chunks and a CRC.
 *
 * The mark is the game's own image, reduced until it survives at 32px: a dark
 * crescent coast around a lit inner sea, with two amber eyes under the water.
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIZE = 512;

/* ------------------------------------------------------------- painting */

const px = new Uint8Array(SIZE * SIZE * 4);

const set = (x, y, r, g, b, a = 255) => {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
};

const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

const fillRect = (x0, y0, w, h, color) => {
  const [r, g, b] = hex(color);
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, r, g, b);
};

// Rounded-square backdrop, so the icon reads as an app tile at small sizes.
const RADIUS = Math.round(SIZE * 0.19);
const inTile = (x, y) => {
  const cx = Math.min(Math.max(x, RADIUS), SIZE - 1 - RADIUS);
  const cy = Math.min(Math.max(y, RADIUS), SIZE - 1 - RADIUS);
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= RADIUS * RADIUS;
};

const SKY = ['#161d34', '#1d2647', '#26325a', '#31406d', '#41507f',
             '#566191', '#7d7796', '#a98b92', '#c49a8c', '#d8ab90'];
const SEA = ['#132038', '#182843', '#1d3150', '#22395e', '#27416b'];
const HORIZON = Math.round(SIZE * 0.55);

// Sky.
const skyBand = Math.ceil(HORIZON / SKY.length);
SKY.forEach((c, i) => fillRect(0, i * skyBand, SIZE, skyBand + 1, c));

// Sea.
const seaBand = Math.ceil((SIZE - HORIZON) / SEA.length);
SEA.forEach((c, i) => fillRect(0, HORIZON + i * seaBand, SIZE, seaBand + 1, c));

// Shimmer lines on the water.
for (let i = 0; i < 16; i++) {
  const y = HORIZON + 14 + i * 13;
  const w = 40 + ((i * 37) % 90);
  const x = ((i * 151) % (SIZE - 60)) + 10;
  fillRect(x, y, w, 4, i < 9 ? '#33507a' : '#2b4568');
}

// The crescent coast, dark, sweeping in from both edges.
for (let x = 0; x < SIZE; x++) {
  const edge = Math.abs(x - SIZE / 2) / (SIZE / 2);
  const h = Math.floor(Math.pow(edge, 2.6) * (SIZE * 0.42));
  if (h <= 0) continue;
  fillRect(x, HORIZON - h, 1, h + 6, '#0e1424');
  fillRect(x, HORIZON - h, 1, 3, '#1f2942');
}

// The Warden below the surface.
const wx = SIZE / 2;
const wy = HORIZON + (SIZE - HORIZON) * 0.44;
for (let i = 0; i < 90; i++) {
  const a = (i / 90) * Math.PI;
  const w = Math.round(Math.sin(a) * SIZE * 0.46);
  if (w <= 0) continue;
  fillRect(Math.round(wx - w / 2), Math.round(wy - 44 + i * 1.5), w, 2, '#0b1220');
}
// Amber eyes: the one warm note, and the thing that survives at 32px.
fillRect(Math.round(wx - 62), Math.round(wy - 16), 26, 12, '#f0a94e');
fillRect(Math.round(wx + 36), Math.round(wy - 16), 26, 12, '#f0a94e');
fillRect(Math.round(wx - 58), Math.round(wy - 13), 18, 6, '#ffe9b0');
fillRect(Math.round(wx + 40), Math.round(wy - 13), 18, 6, '#ffe9b0');

// Amber rim along the inside of the tile, which is what makes it look like an
// icon rather than a screenshot.
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    if (!inTile(x, y)) { set(x, y, 0, 0, 0, 0); continue; }
    const edge = !inTile(x - 4, y) || !inTile(x + 4, y) || !inTile(x, y - 4) || !inTile(x, y + 4);
    if (edge) {
      const [r, g, b] = hex('#f0a94e');
      set(x, y, r, g, b, 210);
    }
  }
}

/* ----------------------------------------------------------- png output */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;   // bit depth
ihdr[9] = 6;   // colour type: RGBA
ihdr[10] = 0;  // deflate
ihdr[11] = 0;  // adaptive filtering
ihdr[12] = 0;  // no interlace

// One filter byte (0 = none) per scanline.
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  Buffer.from(px.buffer, y * SIZE * 4, SIZE * 4).copy(raw, y * (SIZE * 4 + 1) + 1);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

mkdirSync(resolve(ROOT, 'launcher'), { recursive: true });
const out = resolve(ROOT, 'launcher', 'icon.png');
writeFileSync(out, png);
console.log(`icon: ${SIZE}x${SIZE} -> ${out} (${(png.length / 1024).toFixed(1)} KB)`);
