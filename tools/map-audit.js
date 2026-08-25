// Walkability audit for the ASCII maps.
//
// validate-maps.js proves a map is well-FORMED; this proves it is well-CONNECTED.
// It floods the walkable tiles from every way into the map and reports anything
// a player could never touch: a door with no approach, an NPC sealed in a wall,
// a sign nobody can face, an item on an island.
//
//   node tools/map-audit.js            # every map
//   node tools/map-audit.js ashgate    # one map
//
// Kept in step with TERRAIN in src/world/terrain.ts by hand.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAPDIR = join(ROOT, 'data', 'maps');

/** Tiles a player can stand on with no field move. 'L' is a one-way ledge. */
const OPEN = new Set([...'.,*-=sDfrSpBxgFiqu:"L']);
/** Water. Impassable on foot, but not a mistake -- it is meant to stop you. */
const WET = new Set([...'~W']);

const only = process.argv[2];
const files = readdirSync(MAPDIR).filter((f) => f.endsWith('.json'));
let problems = 0;

for (const f of files) {
  const id = f.slice(0, -5);
  if (only && id !== only) continue;
  const m = JSON.parse(readFileSync(join(MAPDIR, f), 'utf8'));
  const rows = m.rows ?? [];
  const H = rows.length, W = H ? rows[0].length : 0;
  const at = (x, y) => (y >= 0 && y < H && x >= 0 && x < W ? rows[y][x] : '#');
  // A thorn is scenery you are meant to remove, so the alcove behind one is
  // not sealed off -- it is gated. Same for shallow water on a wading map.
  const cut = new Set((m.objects ?? [])
    .filter((o) => o.kind === 'cuttable').map((o) => `${o.x},${o.y}`));
  const open = (x, y) => OPEN.has(at(x, y))
    || (m.freeWade && at(x, y) === '~')
    || cut.has(`${x},${y}`);

  // Flood from every warp tile: those are the ways in.
  const seen = new Set();
  const queue = [];
  const push = (x, y) => {
    const k = y * W + x;
    if (seen.has(k) || !open(x, y)) return;
    seen.add(k); queue.push([x, y]);
  };
  for (const w of m.warps ?? []) push(w.x, w.y);
  // An interior with no warp in still deserves an audit: start from its floor.
  if (!queue.length) {
    outer: for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (open(x, y)) { push(x, y); break outer; }
    }
  }
  while (queue.length) {
    const [x, y] = queue.shift();
    // A ledge is one-way: you may land on it and leave downward, never climb it.
    if (at(x, y) === 'L') { push(x, y + 1); continue; }
    push(x + 1, y); push(x - 1, y); push(x, y + 1);
    if (at(x, y - 1) !== 'L') push(x, y - 1);
  }
  const reached = (x, y) => seen.has(y * W + x);
  const touchable = (x, y) =>
    reached(x, y) || reached(x + 1, y) || reached(x - 1, y)
    || reached(x, y + 1) || reached(x, y - 1);

  const say = (msg) => { problems++; console.log(`  ${id}: ${msg}`); };

  for (const w of m.warps ?? []) {
    if (!reached(w.x, w.y)) say(`warp to ${w.toMap} at ${w.x},${w.y} is cut off`);
  }
  for (const n of m.npcs ?? []) {
    if (!open(n.x, n.y)) say(`NPC ${n.id} stands in solid tile "${at(n.x, n.y)}" at ${n.x},${n.y}`);
    else if (!reached(n.x, n.y)) say(`NPC ${n.id} at ${n.x},${n.y} is cut off`);
  }
  for (const o of m.objects ?? []) {
    // A sign is read by facing it, so it needs a neighbour you can stand on.
    if (!touchable(o.x, o.y)) say(`${o.kind} at ${o.x},${o.y} cannot be reached`);
  }

  // Orphan pockets of floor: walkable ground the flood never got to.
  let orphan = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (open(x, y) && !reached(x, y)) orphan++;
  }
  if (orphan) say(`${orphan} walkable tile(s) sealed off from the rest of the map`);

  // Water with no bank reads as a hole cut in the grass.
  let bare = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!WET.has(at(x, y))) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = at(x + dx, y + dy);
      if ('.,*"'.includes(c)) bare++;
    }
  }
  const flag = orphan || bare ? ` shore:${bare}` : '';
  if (!only) console.log(`ok ${id.padEnd(26)} ${String(W).padStart(2)}x${String(H).padStart(2)}${flag}`);
}

console.log(problems === 0 ? '\nEvery map is walkable end to end.' : `\n${problems} reachability problem(s).`);
process.exit(problems === 0 ? 0 : 1);
