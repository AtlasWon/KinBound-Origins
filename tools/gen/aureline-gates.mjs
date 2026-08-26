// Opens Aureline's two remaining gates: the west road to Frostmere and the
// east road to Skyreach.
//
//   node tools/gen/aureline-gates.mjs
//
// SIX TILES AND SIX WARPS, AND IT IS DELIBERATELY ITS OWN FILE.
//
// data/maps/aureline.json belongs to Stage 4 and this is a Stage 5 change to
// it, so it is written as a re-runnable, idempotent patch that names exactly
// what it touches rather than as a hand-edit somebody has to find later. If
// the capital is ever rebuilt from tools/gen/aureline.mjs, running this
// afterwards restores the gates.
//
// WHY IT HAD TO BE DONE AT ALL. Stage 5 adds three roads out of the capital
// and the capital had gates for none of them: aureline.json shipped ringed by
// woodland on every side except the south road to Route 7. With those six
// tiles shut, EVERY MAP IN ACT 5 is unreachable from Hearthmere -- both
// mountain roads, Frostmere, Skyreach, Crownspire, the Observatory, three
// Halls -- and tests/content.test.js says so in one line. That is the failure
// this project has shipped in four stages running: an entrance drawn on one
// map with a room built behind it and nothing connecting them. Building the
// road and not opening its mouth would have been the fifth.
//
// The capital already does all the work. Two great avenues run clean across it
// from edge to edge -- rows 54-56 and rows 90-92, three lanes of carriageway
// each -- and both of them stop one tile short of the map border in a wall of
// trees. This puts the last three tiles of each in, on the rows the road was
// already on, and hangs a seam warp on the border cell. Nothing else in
// Aureline moves, and no street, building, door, sign or person is touched.
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'data/maps/aureline.json';
const map = JSON.parse(readFileSync(path, 'utf8'));
const rows = map.rows.map((r) => [...r]);
const W = rows[0].length;

/**
 * The two gates, and where the road on the other side of each one starts.
 *
 * Both targets were read off the route maps rather than agreed in advance:
 * route_8 puts its macadam at rows 21-23 of its east edge and route_9 puts its
 * gravel at rows 32-34 of its west edge, and the player lands one cell inside
 * each so the warp they arrived through is behind them.
 */
const GATES = [
  {
    name: 'the west road, to Route 8 and Frostmere',
    xs: [0, 1, 2], ys: [54, 55, 56], edge: 0, inward: 2,
    toMap: 'route_8', toX: 82, toY: 21, facing: 'left',
  },
  {
    name: 'the east road, to Route 9 and Skyreach',
    xs: [W - 3, W - 2, W - 1], ys: [90, 91, 92], edge: W - 1, inward: W - 3,
    toMap: 'route_9', toX: 1, toY: 32, facing: 'right',
  },
];

let cut = 0;
const warps = (map.warps ?? []).filter((w) => w.toMap !== 'route_8' && w.toMap !== 'route_9');
for (const g of GATES) {
  for (const [i, y] of g.ys.entries()) {
    for (const x of g.xs) {
      if (rows[y][x] !== '▬') { rows[y][x] = '▬'; cut++; }
    }
    warps.push({
      x: g.edge, y, toMap: g.toMap, toX: g.toX, toY: g.toY + i, facing: g.facing, style: 'edge',
    });
  }
  console.log(`  ${g.name}: rows ${g.ys.join(',')} opened, 3 warps to ${g.toMap}`);
}

map.rows = rows.map((r) => r.join(''));
map.warps = warps;
writeFileSync(path, JSON.stringify(map, null, 2) + '\n');
console.log(`  ${cut} tile(s) of woodland cut, ${warps.length} warps in aureline.json`);
