// Act 1, driven by STATE rather than by coordinates.
//
// The previous walk-through driver hardcoded tile positions and broke the
// moment Hearthmere was rebuilt underneath it -- it reported "no starter"
// when the truth was that it had walked into a wall. This one steers by what
// the game says about itself, so a map can be redesigned without silently
// turning the test into a lie.

const d = window.dev;
const top = () => d.game.scenes.top;
const flag = (f) => !!top().state?.hasFlag?.(f);
const log = [];
const note = (s) => { log.push(s); };

/*
 * Walk to a tile, following a route found by breadth-first search over the
 * map's own collision.
 *
 * Greedy "step toward the target" pathing produced FALSE FAILURES, which is
 * much worse than no test: the upstairs of the player's house is three rooms
 * joined by one corridor along the bottom, so walking straight at the stairs
 * hits a wall, and the driver reported "no starter" when the truth was that it
 * had walked into plaster. A driver that lies about the game is worse than a
 * driver that does not exist.
 */
const route = (sx, sy, tx, ty) => {
  const map = top().map;
  if (!map) return null;
  const key = (x, y) => `${x},${y}`;
  const open = (x, y) => map.inBounds(x, y) && map.collisionAt(x, y) !== 1;
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
  while (true) {
    const prev = from.get(key(cur[0], cur[1]));
    if (!prev) break;
    steps.unshift(prev[2]);
    cur = [prev[0], prev[1]];
  }
  return steps;
};

const goTo = async (tx, ty) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const p = d.probe();
    if (top().name !== 'overworld') return false;
    const [x, y] = (p.pos || '0,0').split(',').map(Number);
    if (x === tx && y === ty) return true;
    const steps = route(x, y, tx, ty);
    if (!steps) return false;
    for (const k of steps) {
      d.hold(k, 12);
      d.tick(2);
      if (top().name !== 'overworld') return true;   // a warp or a scene fired
    }
  }
  const p = d.probe();
  const [x, y] = (p.pos || '0,0').split(',').map(Number);
  return x === tx && y === ty;
};

const clear = () => { for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 8); d.tick(4); };

await d.loadWait(1400);
for (let i = 0; i < 90 && top().name !== 'title'; i++) d.key('Enter', 10);
if (top().name === 'title' && top().menu) { top().menu.index = 0; d.key('Enter', 24); }
for (let i = 0; i < 60 && top().name !== 'creator'; i++) d.key('Enter', 10);
for (let i = 0; i < 30 && top().name === 'creator'; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') { d.key('Enter', 40); break; }
  d.key('KeyS', 2);
}
await d.loadWait(1600);
clear();
note(`start: ${d.probe().map}`);

// Find the lab by asking the map where its warps go, rather than guessing.
const findWarp = (pred) => (top().map?.warps || []).find(pred);
const reach = async (pred, label) => {
  const w = findWarp(pred);
  if (!w) { note(`${label}: no warp found from ${d.probe().map}`); return false; }
  const ok = await goTo(w.x, w.y);
  await d.loadWait(1200);
  clear();
  note(`${label}: ${ok ? 'walked' : 'gave up'} -> ${d.probe().map}`);
  return d.probe().map === w.toMap;
};

// Downstairs, out of the house, into the lab, out again, up the road.
await reach((w) => /house_player|hearthmere_house/.test(w.toMap), 'downstairs');
await reach((w) => w.toMap === 'hearthmere', 'front door');
await reach((w) => /sorrell|lab/.test(w.toMap), 'lab');

// Walk up to the professor and talk to him. Standing in the room is not the
// same as triggering an interact script, which is what the first version of
// this driver quietly assumed.
const sorrell = (top().map?.npcs || []).find((n) => /sorrell$/.test(n.id));
if (sorrell) {
  // Stand on the tile below him and face up.
  const arrived = await goTo(sorrell.x, sorrell.y + 1);
  note(`approach sorrell(${sorrell.x},${sorrell.y}): ${arrived ? 'ok' : 'failed'} at ${d.probe().pos}`);
  d.hold('KeyW', 6);
  for (let i = 0; i < 40 && !flag('got_starter'); i++) {
    d.key('Enter', 10);
    if (top().name === 'starter') {
      // Pick whatever the cursor is on, then confirm the prompt.
      d.key('Enter', 14);
      for (let j = 0; j < 8 && top().name === 'dialogue'; j++) d.key('Enter', 10);
      d.tick(120);
    }
    clear();
  }
} else {
  note('no sorrell on this map');
}
const party = (top().state?.party || []).map((k) => `${k.name} L${k.level}`);
note(`got_starter=${flag('got_starter')} party=[${party.join(', ')}]`);

const out = [];
for (const [name, scale] of [['act1-01-hearthmere', 2], ['act1-02-lab', 2]]) {
  out.push(await d.shoot(name, 8, scale));
}

return { log, flags: { got_starter: flag('got_starter'), met_tarin: flag('met_tarin') }, probe: d.probe(), out };
