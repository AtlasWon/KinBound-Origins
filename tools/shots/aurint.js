// Aureline interiors: walk every room and photograph it.
//
// Steered by the maps' own data, never by hardcoded tiles. Each room is
// entered by loading it AT ITS OWN DOOR TILE -- a tile the player is guaranteed
// to be able to stand on, because it is the tile the door warp puts them on --
// and everything after that is breadth-first pathfinding over the live
// collision layer, so a wall reports as "gave up" rather than as a lie.
//
// The BFS walks the SAME obstacles the player does: terrain collision AND the
// people standing on it. That matters twice over. In a room with fifteen
// townspeople in it, a pathfinder that ignores them walks into somebody's back
// and reports the room as impassable -- which is the driver lying about the
// game. And the staff gate in the Meridian atrium is a person standing in a
// one-tile channel, so "no route exists" is exactly the right reading of a
// sealed door and comes out as 'noroute' rather than as a stall.
//
// The first version of this driver kept walking after a warp fired and spent
// the rest of the run reporting one room's contents under another room's name,
// which is the failure the project notes warn about; goTo now stops dead the
// moment the map id changes.
//
//   node tools/serve.js
//   npx electron tools/capture.cjs tools/shots/aurint.js

const d = window.dev;
const top = () => d.game.scenes.top;
const log = [];
const note = (s) => log.push(s);
const here = () => d.probe().map;
const at = () => d.probe().pos;

const clear = () => { for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 8); d.tick(4); };

// A warp does not change the scene, it starts a fade, and the map underneath
// swaps some frames later. Reading the map id before that has finished is how a
// driver ends up reporting one room under another room's name, so every walk
// waits for the scene to stop being busy before it believes anything.
const settle = async () => {
  for (let i = 0; i < 120 && top().busy; i++) { d.tick(4); }
  await d.loadWait(250);
  clear();
};

const route = (sx, sy, tx, ty) => {
  const map = top().map;
  if (!map) return null;
  const key = (x, y) => `${x},${y}`;
  const people = new Set((top().npcs || []).map((n) => key(n.actor.tileX, n.actor.tileY)));
  const open = (x, y) => map.inBounds(x, y) && map.collisionAt(x, y) !== 1 && !people.has(key(x, y));
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

// Walk to a tile on THIS map. Returns 'arrived' | 'blocked' | 'noroute' |
// 'warped'. Stops the instant the map underfoot changes.
const goTo = async (tx, ty) => {
  const start = here();
  for (let attempt = 0; attempt < 4; attempt++) {
    clear();
    if (here() !== start) return 'warped';
    const [x, y] = (at() || '0,0').split(',').map(Number);
    if (x === tx && y === ty) { await settle(); return here() === start ? 'arrived' : 'warped'; }
    const steps = route(x, y, tx, ty);
    if (!steps) return 'noroute';
    for (const k of steps) {
      d.hold(k, 12);
      d.tick(2);
      if (top().busy || top().name !== 'overworld') await settle();
      if (here() !== start) return 'warped';
    }
  }
  await settle();
  if (here() !== start) return 'warped';
  const [x, y] = (at() || '0,0').split(',').map(Number);
  return (x === tx && y === ty) ? 'arrived' : 'blocked';
};

// Load a room, standing on the tile its own door warp lands the player on.
const enter = async (id, x, y, facing) => {
  await top().loadMap(d.game, id, x, y, facing || 'up');
  top().snapCamera();
  top().busy = false;
  d.tick(8);
  await d.loadWait(500);
  clear();
  return here() === id;
};

/* ---------------------------------------------------------- boot a game */
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

const shots = [];
const shoot = async (n) => { shots.push(await d.shoot(n, 6, 1)); };

// The furthest tile from the door that the collision layer says is reachable.
const farthest = (fromX, fromY) => {
  const map = top().map;
  const key = (x, y) => `${x},${y}`;
  const people = new Set((top().npcs || []).map((n) => key(n.actor.tileX, n.actor.tileY)));
  const open = (x, y) => map.inBounds(x, y) && map.collisionAt(x, y) !== 1 && !people.has(key(x, y));
  const seen = new Set([key(fromX, fromY)]);
  let q = [[fromX, fromY]], last = [fromX, fromY];
  while (q.length) {
    const nq = [];
    for (const [x, y] of q) {
      last = [x, y];
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const nx = x + dx, ny = y + dy;
        if (!open(nx, ny) || seen.has(key(nx, ny))) continue;
        seen.add(key(nx, ny)); nq.push([nx, ny]);
      }
    }
    q = nq;
  }
  return { far: last, reachable: seen.size };
};

// Enter a room, cross it to its far corner, come back to the middle of its
// floor, and photograph it from there.
const tour = async (id, doorX, doorY, label, midX, midY) => {
  if (!(await enter(id, doorX, doorY, 'up'))) { note(`${label}: FAILED to load ${id}`); return; }
  const map = top().map;
  const { far, reachable } = farthest(doorX, doorY);
  const out = await goTo(far[0], far[1]);
  const back = (here() === id) ? await goTo(midX, midY) : 'warped';
  note(`${label} ${id} ${map.width}x${map.height} tiles=${reachable} npcs=${(map.npcs || []).length} `
     + `signs=${(map.objects || []).filter((o) => o.kind === 'sign').length} `
     + `far(${far[0]},${far[1]})=${out} mid(${midX},${midY})=${back} at=${at()}`);
  await shoot(`aur-${label}`);
};

/* ================================================ THE MERIDIAN BUILDING */

// 1. The atrium, entered through its own front door with no pass.
await tour('aureline_meridian', 12, 19, '01-atrium', 12, 11);

// 2. The staff channel must stop the player dead before the story opens it.
const st = top().state;
const preGate = await goTo(2, 2);
note(`GATE before aur_hq_pass: staff stair (2,2) = ${preGate} (want blocked/noroute), at=${at()}`);
await goTo(12, 8);
await shoot('aur-02-atrium-gate');

// 3. The public lecture theatre is reachable with no pass at all.
await enter('aureline_meridian', 12, 19, 'up');
const toHall = await goTo(23, 16);
note(`public stair (23,16) = ${toHall} -> ${here()} at ${at()}`);
if (here() === 'aureline_meridian_hall') {
  const aisle = await goTo(11, 5);
  note(`assembly hall aisle to the stage: ${aisle} at ${at()} on ${here()}`);
  await shoot('aur-03-assembly');
} else {
  note('assembly hall: NOT REACHED from the atrium');
}

// 4. Open the building the way the story does, and walk the whole route down.
st.setFlag('aur_hq_pass');
await enter('aureline_meridian', 12, 19, 'up');
const postGate = await goTo(2, 2);
note(`GATE after aur_hq_pass: staff stair (2,2) = ${postGate} -> ${here()} at ${at()}`);
if (here() === 'aureline_meridian_records') {
  await goTo(12, 8);
  note(`records corridor: ${at()} on ${here()}`);
  await shoot('aur-04-records');

  const arch = await goTo(20, 15);
  note(`Antiquities and Records room: ${arch} at ${at()}`);
  await shoot('aur-05-archive');

  const preDeep = await goTo(1, 8);
  note(`DEEP STAIR before aur_deep_open: ${preDeep} -> ${here()} at ${at()} (want blocked)`);

  st.setFlag('aur_deep_open');
  await enter('aureline_meridian_records', 23, 8, 'down');
  const postDeep = await goTo(1, 8);
  note(`DEEP STAIR after aur_deep_open: ${postDeep} -> ${here()} at ${at()}`);
}

if (here() === 'aureline_meridian_deep') {
  await goTo(14, 12);
  note(`deep survey floor: ${at()}`);
  await shoot('aur-06-deep');
  const bench = await goTo(10, 8);
  note(`Abyss Crown bench: ${bench} at ${at()}`);
  await shoot('aur-07-abysscrown');
  const chart = await goTo(14, 2);
  note(`the chart wall: ${chart} at ${at()}`);
  await shoot('aur-08-chart');
  const cast = (top().map.npcs || []).map((n) => n.id).join(' ');
  note(`deep cast on the map: ${cast}`);
} else {
  note(`deep survey: NOT REACHED, ended on ${here()}`);
}

/* ==================================================== THE OTHER ELEVEN */
await tour('aureline_station', 12, 19, '09-station', 12, 9);
await tour('aureline_clinic', 9, 13, '10-clinic', 9, 7);
await tour('aureline_provisioner', 10, 11, '11-provisioner', 10, 5);
await tour('aureline_market', 11, 15, '12-market', 11, 6);
await tour('aureline_museum', 11, 17, '13-museum', 11, 8);
await tour('aureline_conservatory', 10, 13, '14-glasshouse', 10, 7);
await tour('aureline_summit', 9, 15, '15-summit', 9, 6);
await tour('aureline_press', 9, 13, '16-press', 9, 7);
await tour('aureline_inn', 9, 13, '17-inn', 9, 10);
await tour('aureline_house_a', 7, 11, '18-house-a', 7, 5);
await tour('aureline_house_b', 7, 11, '19-house-b', 7, 5);

return { log, shots };
