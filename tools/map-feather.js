// Take the corners off the tall grass without mowing it.
//
// A field of tall grass drawn as a filled rectangle is the most obviously
// authored thing on a route: rough ground has no corners and no ruled sides.
// Trimming the corners alone would work, except these patches are small enough
// that the corners are most of the patch -- so this grows before it cuts, and
// the encounter field keeps roughly the area it had:
//
//   1. GROW. Turf that already touches the field is turf the field
//      is closing in on; a deterministic quarter of it becomes tall grass, which
//      bulges the outline outwards in a way no rectangle does.
//   2. TRIM. A convex corner -- a tile whose only two tall-grass neighbours sit
//      at right angles -- becomes a tuft, rounding what is left.
//
// Tall grass is walkable, so growing can never wall a route off, and it only
// ever spreads into plain turf -- never onto a path, a shore or a doorstep.
//
//   node tools/map-feather.js --check route_1
//   node tools/map-feather.js route_1 route_2
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAPDIR = join(ROOT, 'data', 'maps');

const args = process.argv.slice(2);
const check = args.includes('--check');
const picked = args.filter((a) => !a.startsWith('--'));

/** Stable per-tile jitter, so a rerun makes the same field. */
const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

let grown = 0, trimmed = 0;
for (const f of readdirSync(MAPDIR).filter((n) => n.endsWith('.json'))) {
  const id = f.slice(0, -5);
  if (picked.length && !picked.includes(id)) continue;
  const path = join(MAPDIR, f);
  const map = JSON.parse(readFileSync(path, 'utf8'));
  const rows = (map.rows ?? []).map((r) => [...r]);
  if (!rows.length) continue;
  const H = rows.length, W = rows[0].length;
  const at = (x, y) => (y >= 0 && y < H && x >= 0 && x < W ? rows[y][x] : '#');
  const tall = (x, y) => at(x, y) === '"';
  const nbrs = (x, y, p) => [[1, 0], [-1, 0], [0, 1], [0, -1]]
    .filter(([dx, dy]) => p(x + dx, y + dy)).length;

  // Pass 1: grow, read off the ORIGINAL field so growth cannot cascade.
  const adds = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (at(x, y) !== '.' && at(x, y) !== ',') continue;
      if (nbrs(x, y, tall) >= 1 && hash(x, y) % 4 === 0) adds.push([x, y]);
    }
  }
  for (const [x, y] of adds) rows[y][x] = '"';

  // Pass 2: trim the convex corners of whatever shape that left.
  const cuts = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!tall(x, y)) continue;
      const n = tall(x, y - 1), s = tall(x, y + 1);
      const w = tall(x - 1, y), e = tall(x + 1, y);
      if ([n, s, w, e].filter(Boolean).length === 2 && (n || s) && (w || e)) cuts.push([x, y]);
    }
  }
  for (const [x, y] of cuts) rows[y][x] = hash(x, y) % 7 === 0 ? '*' : ',';

  if (!adds.length && !cuts.length) continue;
  grown += adds.length; trimmed += cuts.length;
  const area = rows.flat().filter((c) => c === '"').length;
  console.log(`${id}: +${adds.length} grown, -${cuts.length} trimmed, ${area} tall now`);
  if (check) continue;
  map.rows = rows.map((r) => r.join(''));
  writeFileSync(path, JSON.stringify(map, null, 2) + '\n');
}
console.log(check ? `would grow ${grown}, trim ${trimmed}` : `grew ${grown}, trimmed ${trimmed}`);
