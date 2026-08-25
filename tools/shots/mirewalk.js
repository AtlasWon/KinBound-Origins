// Walks the Mire Road and Mirehaven and photographs them at 1x, in the fog.
//
// Steers by breadth-first search over the map's own collision, the way
// tools/shots/act1.js does, because a driver that walks into a wall and calls
// it a missing feature is worse than no driver at all. Every target here is a
// tile the search proved it could reach; anything it could not reach is
// reported as "gave up" and named, not quietly skipped.
const d = window.dev;
const top = () => d.game.scenes.top;
const log = [];
const note = (s) => { log.push(s); };

const route = (sx, sy, tx, ty) => {
  const map = top().map;
  if (!map) return null;
  const key = (x, y) => `${x},${y}`;
  const scene = top();
  const open = (x, y) => map.inBounds(x, y) && scene.canEnter(x, y, 'down');
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

/**
 * Walk a route, holding each straight run for as long as the run is long.
 *
 * Movement here is continuous rather than tile-by-tile, so a key held for a
 * fixed number of ticks per step either stops short or sails a tile past the
 * corner -- and one tile past a corner on a boardwalk one tile wide is the
 * difference between arriving and reporting that the map is broken. Runs are
 * held at the engine's own rate (fifteen ticks to the tile, plus slack) and
 * the position is re-read between them.
 */
const goTo = async (tx, ty) => {
  for (let attempt = 0; attempt < 4; attempt++) {
    if (top().name !== 'overworld') return false;
    const [x, y] = (d.probe().pos || '0,0').split(',').map(Number);
    if (x === tx && y === ty) return true;
    const steps = route(x, y, tx, ty);
    if (!steps) return false;
    // Twelve ticks a step, which is a shade under the fifteen a tile takes at
    // walking speed, so the body is still finishing the step when the next key
    // goes down and the run flows instead of stuttering. Overshoot is the thing
    // to avoid, not undershoot: one tile past a corner on a boardwalk one tile
    // wide is the difference between arriving and reporting the map is broken,
    // and an undershoot is simply picked up by the next attempt.
    const here = d.probe().map;
    for (const k of steps) {
      d.hold(k, 12);
      d.tick(2);
      // A warp keeps the scene called 'overworld' but changes the map under
      // the driver, and a path planned on the old one is nonsense on the new.
      if (top().name !== 'overworld' || d.probe().map !== here) return true;
    }
  }
  const [x, y] = (d.probe().pos || '0,0').split(',').map(Number);
  return x === tx && y === ty;
};

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
for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 8);

const state = top().state;
// The wetlands open after the Tide Hall, so give the driver what a player
// standing at the Emberfall gate would actually be carrying.
state.giveArt('wade');
state.giveArt('shoulder');
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;

const visit = async (id, x, y, shots) => {
  const sc = new Overworld(state, id, x, y, 'down');
  d.game.scenes.replaceAll(sc);
  await d.loadWait(1400);
  for (let i = 0; i < 30 && top().name === 'dialogue'; i++) d.key('Enter', 8);
  note(`${id}: entered at ${d.probe().pos}`);
  for (const [name, tx, ty, hold] of shots) {
    const ok = await goTo(tx, ty);
    if (top().name !== 'overworld' || d.probe().map !== id) {
      note(`${name}: left the map for ${d.probe().map}`);
      const back = new Overworld(state, id, x, y, 'down');
      d.game.scenes.replaceAll(back);
      await d.loadWait(1000);
      continue;
    }
    if (hold) d.tick(hold);
    await d.shoot(name, 6);
    note(`${name}: ${ok ? 'reached' : 'GAVE UP short of'} ${tx},${ty} - at ${d.probe().pos}`);
  }
};

await visit('route_6', 3, 6, [
  ['mire-01-landing', 8, 6, 0],
  ['mire-02-firstreach', 17, 11, 0],
  ['mire-03-reeds', 22, 14, 0],
  ['mire-04-waystation', 14, 23, 0],
  ['mire-05-gaplip', 17, 30, 0],
  ['mire-06-wading', 17, 33, 0],
  ['mire-07-grovemouth', 8, 37, 0],
  ['mire-08-lagoon', 31, 37, 0],
  ['mire-09-causeway', 24, 45, 0],
]);

await visit('mirehaven', 30, 2, [
  ['mh-01-causeway', 30, 6, 0],
  ['mh-02-landing', 30, 12, 0],
  ['mh-03-rock', 25, 22, 0],
  ['mh-04-square', 25, 28, 0],
  ['mh-05-quay', 8, 29, 0],
  ['mh-06-rows', 20, 40, 0],
  ['mh-07-thirdrow', 19, 48, 0],
  ['mh-08-stage', 50, 24, 0],
]);

await visit('route_6_grove', 12, 21, [
  ['grove-01-mouth', 12, 18, 0],
  ['grove-02-house', 11, 7, 0],
]);

return { log };
