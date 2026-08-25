// Walk Tideglass.
//
// Pathfinds over the map's own collision -- see tools/shots/act1.js for why a
// driver in this project never hardcodes a route -- and additionally treats the
// tiles people are standing on as blocked, because a city with thirty-four
// townsfolk in it has townsfolk standing in doorways, and a search that walks
// through them reports a perfectly good street as unreachable.
//
// Doors are opened by walking to the step BELOW the door and pressing up rather
// than by pathing onto the door tile itself: a warp fires when the player
// ENTERS its tile, so a driver that arrives on one and then asks why nothing
// happened is measuring itself and not the map.
const d = window.dev;
const top = () => d.game.scenes.top;
const ow = () => { const t = d.game.scenes.top; return t && t.map ? t : null; };
const log = [];
const note = (s) => log.push(s);

const blocked = () => {
  const s = ow();
  const set = new Set();
  for (const n of (s?.npcs || [])) {
    const a = n.actor;
    if (!a) continue;
    set.add(`${a.tileX},${a.tileY}`);
    if (a.moving) set.add(`${a.targetX},${a.targetY}`);
  }
  for (const n of (s?.map?.npcs || [])) set.add(`${n.x},${n.y}`);
  return set;
};

const route = (sx, sy, tx, ty) => {
  const map = ow()?.map;
  if (!map) return null;
  const solid = blocked();
  solid.delete(`${tx},${ty}`);
  const key = (x, y) => `${x},${y}`;
  // 1 is a wall, 2 and 7 need Wade and 8 needs Swim. A search that only
  // rejects walls happily plots a course straight down the middle of a canal,
  // which is how this driver first reported half of Tideglass as unreachable.
  const passable = (c) => c === 0 || c === 3 || c === 4 || c === 5 || c === 6;
  const open = (x, y) => map.inBounds(x, y) && passable(map.collisionAt(x, y)) && !solid.has(key(x, y));
  const from = new Map([[key(sx, sy), null]]);
  const q = [[sx, sy]];
  let head = 0;
  while (head < q.length) {
    const [x, y] = q[head++];
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

const pos = () => (d.probe().pos || '-1,-1').split(',').map(Number);

// Movement is continuous, not tile-stepped, so a driver cannot hold a key for
// "n tiles worth of ticks" and trust it: the walk covers a tile in about twelve
// ticks, faster than the harness's own fifteen-tick estimate,
// and over a twenty-tile run that overshoots into a wall. So each step holds
// the key only until the tile under the feet actually changes.
const step = (key) => {
  const [x0, y0] = pos();
  d.down(key);
  for (let i = 0; i < 60; i++) {
    d.tick(1);
    if (top().name !== 'overworld') break;
    const [x, y] = pos();
    // The tile index flips at the halfway point, so letting go here would leave
    // the body straddling two columns -- and a body straddling two columns
    // cannot turn into a two-tile bridge or a one-tile lane. Finish the tile.
    if (x !== x0 || y !== y0) { d.tick(7); break; }
  }
  d.up(key);
  d.tick(2);
};

const goTo = async (tx, ty) => {
  let stalls = 0;
  for (let i = 0; i < 400; i++) {
    if (top().name !== 'overworld') return false;
    const [x, y] = pos();
    if (x === tx && y === ty) return true;
    const steps = route(x, y, tx, ty);
    if (!steps || !steps.length) return false;
    step(steps[0]);
    const [nx, ny] = pos();
    if (nx === x && ny === y) { if (++stalls > 12) return false; } else stalls = 0;
  }
  const [x, y] = pos();
  return x === tx && y === ty;
};

// Cutscenes wait between boxes, so pressing Enter until the box goes is not
// enough: the scene has to be let run on and pressed again.
const clear = () => {
  for (let round = 0; round < 40; round++) {
    for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 8);
    d.tick(24);
    if (top().name !== 'dialogue' && !(ow() || {}).busy) break;
  }
  d.tick(4);
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
clear();

const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;
const state = top().state;
const enterCity = async (x = 14, y = 2) => {
  d.game.scenes.replaceAll(new Overworld(state, 'tideglass', x, y, 'down'));
  await d.loadWait(1100);
  clear();
};
await enterCity();
note('arrived: ' + JSON.stringify(d.probe()));

const town = ow()?.map;
if (!town) return { fatal: 'tideglass did not load', probe: d.probe() };
const doors = (town.warps || []).filter((w) => w.style === 'door');
note(`doors on the map: ${doors.length}`);

// The city at 1x, standing where a player stands, in each district.
const shots = [
  ['tg-01-gate', 15, 4],
  ['tg-02-residential', 26, 5],
  ['tg-03-hallsquare', 24, 21],
  ['tg-04-parade', 20, 22],
  ['tg-05-canal', 39, 25],
  ['tg-06-oldharbour', 16, 39],
  ['tg-07-wharf', 28, 47],
  ['tg-08-mole', 8, 55],
  ['tg-09-research', 63, 16],
  ['tg-10-dockyards', 64, 40],
];
const out = [];
for (const [name, x, y] of shots) {
  const ok = await goTo(x, y);
  clear();
  out.push(`${name} ${ok ? 'ok' : 'FAILED'} at ${d.probe().pos} -> ` + (await d.shoot(name, 6, 1)));
}

// Every door opened from the street, and every interior walked back out of.
const bad = [];
for (const w of doors) {
  if (d.probe().map !== 'tideglass') await enterCity();
  if (!(await goTo(w.x, w.y + 1))) {
    bad.push(`${w.toMap}: cannot stand in front of its door at ${w.x},${w.y + 1}`);
    continue;
  }
  d.hold('KeyW', 24);
  await d.loadWait(700);
  clear();
  if (d.probe().map !== w.toMap) {
    bad.push(`${w.toMap}: walking into ${w.x},${w.y} left me in ${d.probe().map}`);
    continue;
  }
  const back = (ow()?.map?.warps || []).find((b) => b.toMap === 'tideglass');
  if (!back) { bad.push(`${w.toMap}: no way back out`); continue; }
  if (!(await goTo(back.x, back.y - 1))) {
    bad.push(`${w.toMap}: cannot reach the inside of its own door`);
    continue;
  }
  d.hold('KeyS', 24);
  await d.loadWait(700);
  clear();
  if (d.probe().map !== 'tideglass') bad.push(`${w.toMap}: the way out landed in ${d.probe().map}`);
}
note(`doors that misbehaved: ${bad.length}`);

// Everyone standing outside, talked to, so nobody is a silent box.
await enterCity();
const silent = [];
for (const n of (ow()?.map?.npcs || [])) {
  if (n.requiresFlag && !state.hasFlag(n.requiresFlag)) continue;
  if (n.hiddenIfFlag && state.hasFlag(n.hiddenIfFlag)) continue;
  const spots = [[n.x, n.y + 1, 'KeyW'], [n.x, n.y - 1, 'KeyS'], [n.x - 1, n.y, 'KeyD'], [n.x + 1, n.y, 'KeyA']];
  let spoke = false;
  for (const [sx, sy, face] of spots) {
    if (!(await goTo(sx, sy))) continue;
    d.key(face, 6);
    d.key('Enter', 12);
    if (top().name !== 'dialogue') d.key('Enter', 12);
    if (top().name === 'dialogue') { spoke = true; clear(); break; }
    clear();
  }
  if (!spoke) silent.push(`${n.id}@${n.x},${n.y}`);
}
note(`npcs with nothing to say: ${silent.length}`);

return { log, bad, silent, out };
