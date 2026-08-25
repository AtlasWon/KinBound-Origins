// Give every stretch of open water a bank.
//
// The tileset has no water-to-grass edge, so turf drawn hard against a river
// reads as a hole cut in the field. Every body of water that looks right in
// this game -- Route 1's pool, the Kellowmere tarn -- has a tile of shingle
// between the two, and this puts one everywhere it is missing: any grass cell
// orthogonally touching water becomes sand.
//
//   node tools/map-banks.js --check     # report, change nothing
//   node tools/map-banks.js route_3     # bank one map
//   node tools/map-banks.js             # bank every map
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAPDIR = join(ROOT, 'data', 'maps');

const WET = new Set(['~', 'W']);
const TURF = new Set(['.', ',', '*', '"']);

const args = process.argv.slice(2);
const check = args.includes('--check');
const only = args.find((a) => !a.startsWith('--'));

let total = 0;
for (const f of readdirSync(MAPDIR).filter((n) => n.endsWith('.json'))) {
  const id = f.slice(0, -5);
  if (only && id !== only) continue;
  const path = join(MAPDIR, f);
  const map = JSON.parse(readFileSync(path, 'utf8'));
  const rows = (map.rows ?? []).map((r) => [...r]);
  if (!rows.length) continue;
  const H = rows.length, W = rows[0].length;
  const at = (x, y) => (y >= 0 && y < H && x >= 0 && x < W ? rows[y][x] : '#');

  const banked = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!TURF.has(at(x, y))) continue;
      const wet = WET.has(at(x + 1, y)) || WET.has(at(x - 1, y))
        || WET.has(at(x, y + 1)) || WET.has(at(x, y - 1));
      if (wet) banked.push([x, y]);
    }
  }
  if (!banked.length) continue;
  total += banked.length;
  console.log(`${id}: ${banked.length} bare bank tile(s)`);
  if (check) continue;
  for (const [x, y] of banked) rows[y][x] = 's';
  map.rows = rows.map((r) => r.join(''));
  writeFileSync(path, JSON.stringify(map, null, 2) + '\n');
}
console.log(total === 0 ? 'Every bank is already shingled.'
  : check ? `${total} tile(s) would be banked.` : `${total} tile(s) banked.`);
