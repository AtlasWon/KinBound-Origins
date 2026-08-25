// Walks the Central Road and photographs it at 1x.
//
// Steers by breadth-first search over the map's own collision, the way
// tools/shots/act1.js and tools/shots/mirewalk.js do, because a driver that
// walks into a wall and calls it a missing feature is worse than no driver at
// all. Every target below is a tile the search proved it could reach; anything
// it could not reach is reported as "GAVE UP" and named, never quietly skipped.
const d = window.dev;
const top = () => d.game.scenes.top;
const log = [];
const note = (s) => { log.push(s); };

const route = (sx, sy, tx, ty) => {
  const map = top().map;
  if (!map) return null;
  const scene = top();
  const key = (x, y) => `${x},${y}`;
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

const goTo = async (tx, ty) => {
  for (let attempt = 0; attempt < 4; attempt++) {
    if (top().name !== 'overworld') return false;
    const [x, y] = (d.probe().pos || '0,0').split(',').map(Number);
    if (x === tx && y === ty) return true;
    const steps = route(x, y, tx, ty);
    if (!steps) return false;
    const here = d.probe().map;
    for (const k of steps) {
      d.hold(k, 12);
      d.tick(2);
      if (top().name !== 'overworld' || d.probe().map !== here) return true;
      // A wild encounter is not a failure; walk out of it and carry on.
      for (let i = 0; i < 200 && top().name !== 'overworld'; i++) d.key('Enter', 6);
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
// What a player standing at the Mirehaven gate is actually carrying.
state.giveArt('wade');
state.giveArt('shoulder');
state.giveArt('clear');
// Nothing here is a difficulty test, and a driver that keeps losing its party
// stops walking. Wild fights are fled from above; this keeps the party upright.
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;

const visit = async (id, x, y, shots) => {
  const sc = new Overworld(state, id, x, y, 'down');
  d.game.scenes.replaceAll(sc);
  await d.loadWait(1400);
  for (let i = 0; i < 30 && top().name === 'dialogue'; i++) d.key('Enter', 8);
  note(`${id}: entered at ${d.probe().pos}`);
  for (const [name, tx, ty] of shots) {
    const ok = await goTo(tx, ty);
    if (top().name !== 'overworld' || d.probe().map !== id) {
      note(`${name}: left the map for ${d.probe().map}`);
      d.game.scenes.replaceAll(new Overworld(state, id, x, y, 'down'));
      await d.loadWait(1000);
      continue;
    }
    await d.shoot(name, 6);
    if (name.endsWith('!')) await d.shoot(name + '-3x', 0, 3);
    note(`${name}: ${ok ? 'reached' : 'GAVE UP short of'} ${tx},${ty} - at ${d.probe().pos}`);
  }
};

await visit('route_7', 2, 57, [
  ['r7-01-causeway', 7, 57],
  ['r7-02-bankfoot', 10, 55],
  ['r7-03-banktop', 10, 50],
  ['r7-04-fork', 10, 46],
  ['r7-05-eastleg', 20, 45],
  ['r7-06-bridge', 29, 36],
  ['r7-07-wheat', 20, 28],
  ['r7-08-crossing!', 29, 22],
  ['r7-09-signal', 27, 18],
  ['r7-10-northwheat', 20, 8],
  ['r7-11-milestone', 28, 6],
  ['r7-12-pasture', 42, 15],
  ['r7-13-junction', 47, 29],
]);

return { log };
