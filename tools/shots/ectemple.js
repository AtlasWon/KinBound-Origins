// Walk the Embercoil Temple.
//
// Pathfinds over the map's own collision -- see tools/shots/act1.js for why a
// driver in this project never hardcodes a route. Two things here are worth
// saying out loud:
//
//   1. It enters at 12,24, which is the tile emberfall.json's own warp lands
//      the player on, so every step after that is ground a player really
//      stands on. Nothing is teleported into the middle of a room.
//   2. It reports the story flags, not the pictures. Three rings, a stair that
//      must be shut before them and open after, and one recording: if a shot
//      looks right and the flags are wrong, the shot is a lie.
const d = window.dev;
const top = () => d.game.scenes.top;
const ow = () => { const t = d.game.scenes.top; return t && t.map ? t : null; };
const log = [];
const note = (s) => log.push(s);
const flag = (f) => !!top().state?.hasFlag?.(f);
const num = (v) => top().state?.getVar?.(v) ?? 0;

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
  const open = (x, y) => {
    if (!map.inBounds(x, y) || solid.has(key(x, y))) return false;
    const c = map.collisionAt(x, y);
    return c === 0 || c === 6;
  };
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

const step = (key) => {
  const [x0, y0] = pos();
  d.down(key);
  for (let i = 0; i < 60; i++) {
    d.tick(1);
    if (top().name !== 'overworld') break;
    const [x, y] = pos();
    if (x !== x0 || y !== y0) { d.tick(7); break; }
  }
  d.up(key);
  d.tick(2);
};

// Cutscenes wait between boxes, so pressing Enter until the box goes is not
// enough -- the scene has to be let run on and pressed again. `busy` is false
// during a `wait`, so the settle at the end is what stops the driver reading a
// flag the scene has not got to yet.
const clear = () => {
  for (let round = 0; round < 60; round++) {
    for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 8);
    d.tick(24);
    if (top().name !== 'dialogue' && !(ow() || {}).busy) break;
  }
  d.tick(90);
  for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 8);
  d.tick(8);
};

const goTo = async (tx, ty) => {
  let stalls = 0;
  for (let i = 0; i < 500; i++) {
    if (top().name !== 'overworld') { clear(); if (top().name !== 'overworld') return false; }
    const [x, y] = pos();
    if (x === tx && y === ty) return true;
    const steps = route(x, y, tx, ty);
    if (!steps || !steps.length) return false;
    step(steps[0]);
    clear();
    const [nx, ny] = pos();
    if (nx === x && ny === y) { if (++stalls > 12) return false; } else stalls = 0;
  }
  const [x, y] = pos();
  return x === tx && y === ty;
};

/* ---------------------------------------------------------------- boot */

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
// The player reaches Act 3 carrying the object and knowing its name; both are
// set by Stage 1 and Stage 2 beats this driver is not walking through.
state.giveItem('tideheart', 1);
state.setFlag('tideheart_given');
state.setFlag('tideheart_named');

const enter = async (map, x, y, facing = 'up') => {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing));
  await d.loadWait(1100);
  clear();
};

const out = [];
const shoot = async (name, scale = 1) => { out.push(await d.shoot(name, 8, scale)); };

/* ------------------------------------------------------- the outer coil */

await enter('embercoil_temple', 12, 24, 'up');
note('entered: ' + JSON.stringify(d.probe()) + ' arrived=' + flag('ect_arrived'));
await shoot('ect-01-entrance');

// Stand next to Sorrell on whichever side of her is open, then face her.
const sorrell = (ow()?.map?.npcs || []).find((n) => n.id === 'ect_sorrell');
if (sorrell) {
  const sides = [[0, 1, 'KeyW'], [-1, 0, 'KeyD'], [1, 0, 'KeyA'], [0, -1, 'KeyS']];
  let talked = false;
  for (const [dx, dy, look] of sides) {
    if (!(await goTo(sorrell.x + dx, sorrell.y + dy))) continue;
    d.hold(look, 8);
    d.key('Enter', 12);
    talked = top().name === 'dialogue' || (ow() || {}).busy;
    note(`sorrell from ${dx},${dy}: talked=${talked} text=${JSON.stringify(d.probe().text || '')}`);
    if (talked) { await shoot('ect-02-sorrell'); clear(); break; }
  }
  if (!talked) note('sorrell: could not be spoken to');
} else {
  note('sorrell missing from the map');
}

// The stair, before the rings. It must refuse.
await goTo(14, 10);
clear();
await shoot('ect-03-shaft');
note('stair before the rings: map=' + d.probe().map + ' open=' + flag('ect_stair_open'));

// Walk the coil. Each ring is a step script on the spiral in front of it.
for (const [x, y, f] of [[3, 18, 'ect_ring_west'], [26, 9, 'ect_ring_east'], [7, 13, 'ect_ring_inner']]) {
  const ok = await goTo(x, y);
  clear();
  note(`ring ${f}: walked=${ok} set=${flag(f)} count=${num('embercoil_rings')}`);
  // Stand three tiles back before photographing the ring: the overlay pass
  // draws it with its own row, so a player parked on the spiral in front of it
  // is standing in front of the thing the shot is of.
  if (f === 'ect_ring_west') { await goTo(3, 21); d.hold('KeyW', 8); await shoot('ect-04-ring'); }
}
clear();
note('rings=' + num('embercoil_rings') + ' stair_open=' + flag('ect_stair_open'));

/* ------------------------------------------------------------ downwards */

const reached = await goTo(14, 10);
clear();
await d.loadWait(900);
clear();
note(`descend: walked=${reached} now ${JSON.stringify(d.probe())}`);
await shoot('ect-05-deep');

// The short causeway is broken on purpose: the way to the island is the long
// way round. Asked of the map's own collision, not of the pathfinder, which
// would happily answer "yes" by walking all the way round the lake.
const m2 = ow()?.map;
note('north causeway 13,6: collision=' + m2.collisionAt(13, 6)
  + ' (1 = broken, as designed)');

const onIsland = await goTo(13, 11);
clear();
note(`island: walked=${onIsland} at ${d.probe().pos} shaftlook=${flag('ect_shaft_look')}`);
await shoot('ect-06-island');

// The vault, off the far corner.
await enter('embercoil_temple_deep', 25, 18, 'right');
const vaultDoor = await goTo(26, 18);
await d.loadWait(900);
clear();
note(`vault: walked=${vaultDoor} now ${d.probe().map} at ${d.probe().pos}`);
await goTo(7, 6);
await shoot('ect-07-vault');

/* -------------------------------------------------------- the recording */

await enter('embercoil_temple_deep', 13, 11, 'up');
const down = await goTo(13, 10);
await d.loadWait(900);
clear();
note(`heart: walked=${down} now ${d.probe().map} at ${d.probe().pos}`);
await goTo(9, 11);
await shoot('ect-08-heart');

const atBasin = await goTo(9, 8);
note('basin: walked=' + atBasin + ' at ' + d.probe().pos);
let caught = false;
for (let i = 0; i < 120 && !flag('heard_elias_first'); i++) {
  const t = String(d.probe().text || '');
  if (!caught && top().name === 'dialogue' && /Elias|Neravoss|Cassian/.test(t)) {
    await shoot('ect-09-elias');
    caught = true;
  }
  d.key('Enter', 10);
  d.tick(16);
}
clear();
note(`recording: heard=${flag('heard_elias_first')} neravoss=${flag('knows_neravoss')}`
  + ` echo=${flag('tideheart_echo_embercoil_temple')} caughtVoice=${caught}`);
await shoot('ect-10-after');

// And the object itself, which should now hold this echo and read as answered.
const th = await import('/build/js/systems/tideheart.js');
const reading = th.readTideheart(state);
note('tideheart: ' + JSON.stringify({
  label: reading.label, stirring: reading.stirring, answered: reading.answered,
  echoes: reading.echoes.map((e) => e.id), reading: reading.reading,
}));

return { log, out, probe: d.probe() };
