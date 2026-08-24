/**
 * Hand-drawn item art: index and check.
 *
 *   npm run itemart
 *
 * The items' counterpart to tools/kinart.js, and it does the same two jobs.
 *
 * 1. Writes assets/items/index.json -- the list of image files that are
 *    actually there: <icon-key>.png, and <icon-key>-<state>.png for an icon
 *    that also ships a frame of itself (see FRAME_STATES in lib/itemseat.js).
 *    The game reads it instead of probing one URL per icon key and per frame
 *    and collecting a pile of 404s. Both the dev server and the Electron
 *    scheme handler also synthesise this listing on the fly from the folder, so
 *    a file dropped in mid-session is picked up on the next launch without
 *    running anything; the written copy is for a plain static host, where
 *    nobody is there to synthesise it.
 *
 * 2. Reads every PNG and reports what would go wrong: a name that is not an
 *    icon key, a canvas that is not 32x32, an anti-aliased edge, a drawing too
 *    big for the cell, two keys sharing one file, and -- the one that is least
 *    obvious and matters most -- whether the art sits on a 2-pixel grid. The
 *    16px bag-row icon is this image halved, so art on the grid reduces exactly
 *    and art off it comes out soft.
 *
 * It never fails the build. Everything it reports, the game survives: an item
 * whose file cannot be used falls back to the icon generated in
 * src/gfx/itemart.ts.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { decodePng } from './lib/kinpng.js';
import {
  seatGroup, icon, iconKeys, splitFrameName, frameFile, FRAME_STATES, CELL, SOFT_ICON,
} from './lib/itemseat.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'assets', 'items');
const INDEX = join(DIR, 'index.json');

const items = JSON.parse(readFileSync(join(ROOT, 'data', 'items', 'items.json'), 'utf8'));
const keys = iconKeys(items);
const known = new Set(keys.map((k) => k.key));

if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });

const present = readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.png')).sort();
const files = [];
const problems = [];
const rows = [];
const pending = [];
const hashes = new Map();

for (const name of present) {
  const stem = name.replace(/\.png$/i, '').toLowerCase();
  const { key, state } = splitFrameName(stem);
  if (!known.has(key)) {
    problems.push(`${name}: "${stem}" is not an icon key, and "${key}" is not one either. The `
      + 'name of a file is the "icon" field in data/items/items.json -- not the item id, not '
      + `the item name, and not a family name. A frame is <icon-key>-<state>.png for one of `
      + `[${Object.keys(FRAME_STATES).join(', ')}]. Run "npm run item:check" for the list, or `
      + '"npm run item:import" to have the renaming done for you');
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
    problems.push(`${name}: could not be read (${e.message}) -- the game will fall back to the generated icon`);
    continue;
  }

  const px = { w: img.w, h: img.h, data: img.rgba };
  // The frames of a key are seated together, so this file cannot be measured
  // until its whole group has been read. Park it and come back.
  pending.push({ name, key, state, px, img, colours: null });
}

/* Seat each key's files as one group, exactly as the loader does. */
{
  const byGroup = new Map();
  for (const p of pending) {
    const g = byGroup.get(p.key) ?? [];
    g.push(p);
    byGroup.set(p.key, g);
  }
  for (const g of byGroup.values()) {
    g.sort((a, b) => Number(a.state !== null) - Number(b.state !== null));
    const seated = seatGroup(g.map((p) => ({ state: p.state, px: p.px })));
    g.forEach((p, i) => { p.seated = seated[i]; });
  }
}

for (const { name, key, state, px, img, seated } of pending) {
  if (!seated) {
    problems.push(`${name}: has no opaque pixels at all`);
    continue;
  }
  if (img.w !== CELL || img.h !== CELL) {
    problems.push(`${name}: canvas is ${img.w}x${img.h}, should be ${CELL}x${CELL}`);
  }
  if (seated.softness.soft) {
    problems.push(`${name}: ${seated.softness.soft} part-transparent pixel(s) -- export with anti-aliasing off`);
  }
  if (seated.scale < 1) {
    problems.push(`${name}: the drawing is ${seated.source.w}x${seated.source.h}, too big for the `
      + `${CELL}x${CELL} cell; it will be shrunk and lose crispness`);
  }
  // Only the ICON is ever halved -- a frame is drawn at 32px in a scene and
  // never appears in a list -- so the 2-pixel grid is not a fact about it.
  if (!state && seated.gridScore < SOFT_ICON) {
    problems.push(`${name}: only ${(seated.gridScore * 100).toFixed(0)}% of it is on a 2-pixel grid, `
      + 'so the 16px bag-row icon is a per-block vote rather than an exact halving. That is '
      + 'deliberate on anything built by "npm run item:import" -- see the note under that '
      + 'heading in "npm run item:check"');
  }

  let colours = 0;
  {
    const set = new Set();
    for (let i = 0; i < px.data.length; i += 4) {
      if (px.data[i + 3]) set.add((px.data[i] << 16) | (px.data[i + 1] << 8) | px.data[i + 2]);
    }
    colours = set.size;
  }

  rows.push({
    name, key, state,
    size: `${img.w}x${img.h}`,
    ink: `${seated.placed.w}x${seated.placed.h}`,
    grid: seated.gridScore,
    exact: icon(seated).exact,
    colours,
  });
}

const seen = new Map();
for (const r of rows) {
  const sha = hashes.get(r.name);
  const prev = seen.get(sha);
  if (prev) problems.push(`${r.name}: is byte-identical to ${prev}`);
  else seen.set(sha, r.name);
}

writeFileSync(INDEX, JSON.stringify({
  note: 'Generated by tools/itemart.js. Lists the item art actually present.',
  files,
}, null, 2) + '\n');

const frames = rows.filter((r) => r.state);
console.log(`itemart: ${rows.length - frames.length} icon(s) of ${known.size} icon key(s)`
  + (frames.length ? ` and ${frames.length} extra frame(s)` : '')
  + '; index written to assets/items/index.json');
if (rows.length) {
  console.log('');
  console.log('  file                        size      drawing   on-grid  icon    colours  is');
  for (const r of rows.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log('  ' + r.name.padEnd(28) + r.size.padEnd(10) + r.ink.padEnd(10)
      + `${(r.grid * 100).toFixed(0)}%`.padStart(6)
      + (r.exact ? '  exact ' : '  soft  ').padStart(8)
      + String(r.colours).padStart(9)
      + '  ' + (r.state ? `${r.state} frame of ${r.key}` : 'the icon'));
  }
}
if (problems.length) {
  console.log('');
  console.log(`itemart: ${problems.length} thing(s) to look at --`);
  for (const p of problems) console.log('  - ' + p);
  console.log('');
  console.log('  None of these stop the game. Anything it cannot use falls back to the');
  console.log('  icon generated in src/gfx/itemart.ts for that key.');
}
