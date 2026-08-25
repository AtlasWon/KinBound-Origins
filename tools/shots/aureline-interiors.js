// Every Aureline interior, entered through its own front door and walked.
//
// Modelled on tools/shots/act1.js: it PATHFINDS over each map's own collision
// rather than trusting coordinates, because three times on this project a
// driver has walked into a wall and reported a missing feature. Nothing here
// teleports to an arbitrary tile -- each room is entered standing on the exact
// warp tile the game itself puts the player on when they come through the door,
// and everything after that is walked.
//
// It reports, per room, anything the player could not actually reach: a warp,
// an NPC, or a sign with no walkable tile beside it. An exit you cannot reach
// is a soft-lock, and a sign you cannot read is a room that lied to the author.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
const problems = [];

const clear = () => {
  for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);
  d.tick(4);
};

/** Flood the map from a tile over its own collision. Returns a Set of "x,y". */
const flood = (sx, sy) => {
  const map = top().map;
  const seen = new Set([`${sx},${sy}`]);
  const q = [[sx, sy]];
  const open = (x, y) => map.inBounds(x, y) && map.collisionAt(x, y) !== 1;
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (seen.has(k) || !open(nx, ny)) continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  return seen;
};

/**
 * Breadth-first route between two tiles, as key codes.
 *
 * `blocked` keeps the route off warp tiles. Walking THROUGH one fires it, and
 * an earlier version of this driver stepped off the Records stair onto the
 * stair beside it, ping-ponged between two floors and photographed the
 * transition fade -- reporting a finished room as a black rectangle.
 */
const route = (sx, sy, tx, ty, blocked = new Set()) => {
  const map = top().map;
  const key = (x, y) => `${x},${y}`;
  const open = (x, y) => map.inBounds(x, y) && map.collisionAt(x, y) !== 1
    && !blocked.has(key(x, y));
  const from = new Map([[key(sx, sy), null]]);
  const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    if (x === tx && y === ty) break;
    for (const [dx, dy, k] of [[0, -1, 'KeyW'], [0, 1, 'KeyS'], [-1, 0, 'KeyA'], [1, 0, 'KeyD']]) {
      const nx = x + dx, ny = y + dy;
      if (!open(nx, ny) || from.has(key(nx, ny))) continue;
      from.set(key(nx, ny), [x, y, k]);
      q.push([nx, ny]);
    }
  }
  if (!from.has(key(tx, ty))) return null;
  const steps = [];
  let cur = [tx, ty];
  for (;;) {
    const prev = from.get(key(cur[0], cur[1]));
    if (!prev) break;
    steps.unshift(prev[2]);
    cur = [prev[0], prev[1]];
  }
  return steps;
};

await d.loadWait(1400);
for (let i = 0; i < 90 && top().name !== 'title'; i++) d.key('Enter', 10);
if (top().name === 'title' && top().menu) { top().menu.index = 0; d.key('Enter', 24); }
for (let i = 0; i < 60 && top().name !== 'creator'; i++) d.key('Enter', 10);
for (let i = 0; i < 80; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1600);
clear();

const state = top().state;
const Overworld = top().constructor;

const MAPS = [
  'aureline_meridian', 'aureline_meridian_records', 'aureline_meridian_deep',
  'aureline_meridian_hall', 'aureline_station', 'aureline_clinic',
  'aureline_provisioner', 'aureline_market', 'aureline_museum',
  'aureline_conservatory', 'aureline_summit', 'aureline_press',
  'aureline_inn', 'aureline_house_a', 'aureline_house_b',
];

// Rooms worth a picture: the four Meridian floors and the three that carry the
// capital's scale. The rest are checked but not photographed.
const SHOOT = new Set([
  'aureline_meridian', 'aureline_meridian_records', 'aureline_meridian_deep',
  'aureline_meridian_hall', 'aureline_station', 'aureline_museum', 'aureline_market',
]);

for (const id of MAPS) {
  // Load the room OUTSIDE its door first so we can find the door tile, then
  // stand on it. Overworld's own constructor takes the entry tile, which is
  // exactly what a warp hands it.
  d.game.scenes.replaceAll(new Overworld(state, id, 1, 1, 'down'));
  await d.loadWait(900);
  const warps = top().map?.warps || [];
  const door = warps.find((w) => w.toMap === 'aureline') || warps[0];
  if (!door) { problems.push(`${id}: no warps at all`); continue; }

  d.game.scenes.replaceAll(new Overworld(state, id, door.x, door.y, 'up'));
  await d.loadWait(900);
  clear();

  const map = top().map;
  const real = d.probe().map;
  if (real !== id) { problems.push(`${id}: loaded as ${real}`); continue; }

  const seen = flood(door.x, door.y);
  const at = (x, y) => `${x},${y}`;
  const walkable = (x, y) => map.inBounds(x, y) && map.collisionAt(x, y) !== 1;

  for (const w of warps) {
    if (!seen.has(at(w.x, w.y))) problems.push(`${id}: WARP (${w.x},${w.y})->${w.toMap} unreachable from the door`);
  }
  for (const n of map.npcs || []) {
    if (!seen.has(at(n.x, n.y))) problems.push(`${id}: NPC ${n.id} (${n.x},${n.y}) unreachable`);
  }
  for (const o of map.objects || []) {
    if (o.kind !== 'sign' && o.kind !== 'script') continue;
    if (walkable(o.x, o.y)) { problems.push(`${id}: SIGN (${o.x},${o.y}) is standing on the floor`); continue; }
    const ok = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(at(o.x + dx, o.y + dy)));
    if (!ok) problems.push(`${id}: SIGN (${o.x},${o.y}) has no tile beside it the player can stand on`);
  }
  for (const o of map.objects || []) {
    if (o.kind !== 'hiddenItem' && o.kind !== 'item') continue;
    if (!seen.has(at(o.x, o.y))) problems.push(`${id}: ITEM (${o.x},${o.y}) unreachable`);
  }

  // Actually walk somewhere: into the middle of the room, so the shot is taken
  // from ground the player reached on foot rather than from the doormat.
  // Never aim at (or through) a warp tile: stepping on one fires it, and the
  // first version of this driver photographed the transition fade and reported
  // the Records floor as a black room.
  const isWarp = new Set(warps.map((w) => at(w.x, w.y)));
  const mid = [Math.floor(map.width / 2), Math.floor(map.height / 2)];
  let target = null;
  for (let r = 0; r < 8 && !target; r++) {
    for (let dy = -r; dy <= r && !target; dy++) {
      for (let dx = -r; dx <= r && !target; dx++) {
        const x = mid[0] + dx, y = mid[1] + dy;
        if (seen.has(at(x, y)) && !isWarp.has(at(x, y))) target = [x, y];
      }
    }
  }
  let walked = 'no reachable centre';
  if (target) {
    const steps = route(door.x, door.y, target[0], target[1], isWarp);
    if (steps) {
      for (const k of steps) { d.hold(k, 12); d.tick(2); if (top().name !== 'overworld') break; }
      walked = `walked to ${d.probe().pos}`;
    } else walked = 'no route to centre';
  }

  // A shot is only worth anything if we are still standing in the room we think
  // we are in.
  const landed = d.probe().map;
  out.push(`${id} ${map.width}x${map.height} door(${door.x},${door.y}) npcs:${(map.npcs || []).length} objs:${(map.objects || []).length} ${walked} on=${landed}`);
  if (landed !== id) problems.push(`${id}: walking to the centre left the map (now ${landed})`);
  if (SHOOT.has(id) && landed === id) { await d.loadWait(600); d.tick(30); await d.shoot(id.replace(/_/g, '-'), 8, 1); }
}

return { rooms: out, problems, problemCount: problems.length };
