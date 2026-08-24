/**
 * Hand-drawn creature art: index and check.
 *
 *   npm run kinart
 *
 * Two jobs.
 *
 * 1. Writes assets/kin/index.json -- the list of image files that are actually
 *    there. The game reads it instead of probing 96 URLs and collecting 90-odd
 *    404s, which is the same rule data/manifest.json exists for. Both the dev
 *    server and the Electron scheme handler also synthesise this listing on the
 *    fly from the folder, so a file dropped in mid-session is picked up on the
 *    next launch without running anything; the written copy is for a plain
 *    static host, where nobody is there to synthesise it.
 *
 * 2. Reads every PNG and reports what would go wrong: a name that does not
 *    match a species, a canvas that is not 128x128, an anti-aliased edge, a
 *    creature too big for the cell, a front and back that are the same drawing,
 *    and -- the one that is least obvious and matters most -- whether the art
 *    sits on a 2-pixel grid. The 64px party icon is this image halved, so art
 *    on the grid reduces exactly and art off it comes out soft. The percentage
 *    printed here is the fraction of 2x2 blocks that are one flat colour.
 *
 * It never fails the build. Everything it reports, the game survives.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'assets', 'kin');
const INDEX = join(DIR, 'index.json');

/** Must match gfx/kinart.ts. */
const CELL = 128;
const GROUND_ROW = 123;
const ALPHA_CUT = 128;
const SOFT_ICON = 0.6;

/* ------------------------------------------------------------ png decode */

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Minimal PNG reader: enough for anything a pixel-art tool exports.
 *  Returns { w, h, rgba } or throws. */
function decodePng(buf) {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(SIG)) throw new Error('not a PNG');
  let p = 8;
  let ihdr = null, plte = null, trns = null;
  const idat = [];
  while (p + 8 <= buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('latin1', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      ihdr = {
        w: data.readUInt32BE(0), h: data.readUInt32BE(4),
        depth: data[8], colour: data[9], interlace: data[12],
      };
    } else if (type === 'PLTE') plte = Buffer.from(data);
    else if (type === 'tRNS') trns = Buffer.from(data);
    else if (type === 'IDAT') idat.push(Buffer.from(data));
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (!ihdr) throw new Error('no IHDR');
  if (ihdr.interlace) throw new Error('interlaced (Adam7) PNGs are not read here');
  const { w, h, depth, colour } = ihdr;
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colour];
  if (channels === undefined) throw new Error(`unsupported colour type ${colour}`);
  if (colour === 3 ? ![1, 2, 4, 8].includes(depth) : depth !== 8) {
    throw new Error(`unsupported bit depth ${depth} for colour type ${colour}`);
  }

  const raw = inflateSync(Buffer.concat(idat));
  const bpp = Math.max(1, (channels * depth) / 8 | 0);
  const stride = Math.ceil((w * channels * depth) / 8);
  const lines = Buffer.alloc(h * stride);
  let off = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[off++];
    const row = raw.subarray(off, off + stride);
    off += stride;
    const out = lines.subarray(y * stride, (y + 1) * stride);
    const prev = y ? lines.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const x = row[i];
      const a = i >= bpp ? out[i - bpp] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= bpp ? prev[i - bpp] : 0;
      let v;
      switch (filter) {
        case 0: v = x; break;
        case 1: v = x + a; break;
        case 2: v = x + b; break;
        case 3: v = x + ((a + b) >> 1); break;
        case 4: {
          const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
          v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: throw new Error(`unknown filter ${filter}`);
      }
      out[i] = v & 0xff;
    }
  }

  const rgba = Buffer.alloc(w * h * 4);
  const bit = (line, i) => {
    const per = 8 / depth;
    const byte = lines[line * stride + ((i / per) | 0)];
    const shift = 8 - depth - (i % per) * depth;
    return (byte >> shift) & ((1 << depth) - 1);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = (y * w + x) * 4;
      if (colour === 3) {
        const idx = bit(y, x);
        rgba[d] = plte ? plte[idx * 3] : 0;
        rgba[d + 1] = plte ? plte[idx * 3 + 1] : 0;
        rgba[d + 2] = plte ? plte[idx * 3 + 2] : 0;
        rgba[d + 3] = trns && idx < trns.length ? trns[idx] : 255;
        continue;
      }
      const s = y * stride + x * channels;
      if (colour === 0) {
        rgba[d] = rgba[d + 1] = rgba[d + 2] = lines[s];
        rgba[d + 3] = 255;
      } else if (colour === 4) {
        rgba[d] = rgba[d + 1] = rgba[d + 2] = lines[s];
        rgba[d + 3] = lines[s + 1];
      } else if (colour === 2) {
        rgba[d] = lines[s]; rgba[d + 1] = lines[s + 1]; rgba[d + 2] = lines[s + 2];
        rgba[d + 3] = 255;
      } else {
        rgba[d] = lines[s]; rgba[d + 1] = lines[s + 1];
        rgba[d + 2] = lines[s + 2]; rgba[d + 3] = lines[s + 3];
      }
    }
  }
  return { w, h, rgba };
}

/* ------------------------------------------------------------- analysis */

function analyse(img) {
  const { w, h, rgba } = img;
  let soft = 0;
  for (let i = 3; i < rgba.length; i += 4) {
    const a = rgba[i];
    if (a !== 0 && a !== 255) soft++;
    rgba[i] = a >= ALPHA_CUT ? 255 : 0;
  }
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!rgba[(y * w + x) * 4 + 3]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return { empty: true, soft };

  // The grid score at the best of the four half-pixel phases -- the loader
  // shifts the drawing by up to one pixel to reach exactly this alignment.
  let best = 0, bestPhase = [0, 0];
  for (const py of [0, 1]) {
    for (const px of [0, 1]) {
      let blocks = 0, flat = 0;
      for (let y = y0 + py; y + 1 <= y1; y += 2) {
        for (let x = x0 + px; x + 1 <= x1; x += 2) {
          const i = [(y * w + x) * 4, (y * w + x + 1) * 4,
            ((y + 1) * w + x) * 4, ((y + 1) * w + x + 1) * 4];
          if (!(rgba[i[0] + 3] | rgba[i[1] + 3] | rgba[i[2] + 3] | rgba[i[3] + 3])) continue;
          blocks++;
          const eq = (a, b) => rgba[a] === rgba[b] && rgba[a + 1] === rgba[b + 1]
            && rgba[a + 2] === rgba[b + 2] && rgba[a + 3] === rgba[b + 3];
          if (eq(i[0], i[1]) && eq(i[0], i[2]) && eq(i[0], i[3])) flat++;
        }
      }
      const score = blocks ? flat / blocks : 1;
      if (score > best) { best = score; bestPhase = [px, py]; }
    }
  }

  const colours = new Set();
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3]) colours.add((rgba[i] << 16) | (rgba[i + 1] << 8) | rgba[i + 2]);
  }

  return {
    empty: false, soft,
    ink: { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 },
    grid: best, phase: bestPhase, colours: colours.size,
  };
}

/* ------------------------------------------------------------------ run */

const speciesFile = join(ROOT, 'data', 'creatures', 'species.json');
const known = new Set(JSON.parse(readFileSync(speciesFile, 'utf8')).map((s) => s.id));

if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });

const present = readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.png')).sort();
const files = [];
const problems = [];
const rows = [];
const hashes = new Map();

for (const name of present) {
  const m = /^(.+)-(front|back)\.png$/i.exec(name);
  if (!m) {
    problems.push(`${name}: name must be <species-id>-front.png or <species-id>-back.png`);
    continue;
  }
  const id = m[1].toLowerCase();
  const view = m[2].toLowerCase();
  if (!known.has(id)) {
    problems.push(`${name}: "${id}" is not a species id`);
    continue;
  }

  if (name !== name.toLowerCase()) {
    problems.push(`${name}: has capital letters in its name. Windows does not care and a `
      + 'case-sensitive web host does -- rename it all-lowercase');
  }

  const bytes = readFileSync(join(DIR, name));
  files.push(name);
  hashes.set(name, createHash('sha1').update(bytes).digest('hex'));

  let img;
  try {
    img = decodePng(bytes);
  } catch (e) {
    problems.push(`${name}: could not be read (${e.message}) -- the game will fall back to the generated sprite`);
    continue;
  }
  const a = analyse(img);
  if (a.empty) {
    problems.push(`${name}: has no opaque pixels at all`);
    continue;
  }
  if (img.w !== CELL || img.h !== CELL) {
    problems.push(`${name}: canvas is ${img.w}x${img.h}, should be ${CELL}x${CELL}`);
  }
  if (a.soft) {
    problems.push(`${name}: ${a.soft} part-transparent pixel(s) -- export with anti-aliasing off`);
  }
  if (a.ink.w > CELL || a.ink.h > GROUND_ROW + 1) {
    problems.push(`${name}: the creature is ${a.ink.w}x${a.ink.h}, too big for the `
      + `${CELL}x${GROUND_ROW + 1} cell; it will be shrunk and lose crispness`);
  }
  if (a.grid < SOFT_ICON) {
    problems.push(`${name}: only ${(a.grid * 100).toFixed(0)}% of it is on a 2-pixel grid, `
      + 'so the 64px party icon will look soft');
  }
  rows.push({ name, id, view, size: `${img.w}x${img.h}`, ink: `${a.ink.w}x${a.ink.h}`,
    grid: a.grid, colours: a.colours });
}

for (const id of new Set(rows.map((r) => r.id))) {
  const f = hashes.get(`${id}-front.png`);
  const b = hashes.get(`${id}-back.png`);
  if (f && b && f === b) problems.push(`${id}: the front and back files are byte-identical`);
  if (f && !b) problems.push(`${id}: has a front but no back; the back stays generated`);
  if (b && !f) problems.push(`${id}: has a back but no front; the front stays generated`);
}

writeFileSync(INDEX, JSON.stringify({
  note: 'Generated by tools/kinart.js. Lists the creature art actually present.',
  files,
}, null, 2) + '\n');

console.log(`kinart: ${files.length} image(s) for ${new Set(rows.map((r) => r.id)).size} species `
  + `of ${known.size}; index written to assets/kin/index.json`);
if (rows.length) {
  console.log('');
  console.log('  file                                size      creature   on-grid  colours');
  for (const r of rows.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log('  ' + r.name.padEnd(34) + r.size.padEnd(10) + r.ink.padEnd(11)
      + `${(r.grid * 100).toFixed(0)}%`.padStart(6) + String(r.colours).padStart(9));
  }
}
if (problems.length) {
  console.log('');
  console.log(`kinart: ${problems.length} thing(s) to look at --`);
  for (const p of problems) console.log('  - ' + p);
  console.log('');
  console.log('  None of these stop the game. Anything it cannot use falls back to the');
  console.log('  procedural sprite for that species.');
}
