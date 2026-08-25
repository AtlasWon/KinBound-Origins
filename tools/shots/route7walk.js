// Walks the whole Central Road and photographs it at 1x.
//
// Steers by breadth-first search over the map's own collision, the way
// tools/shots/act1.js and tools/shots/mirewalk.js do, because a driver that
// walks into a wall and calls it a missing feature is worse than no driver at
// all. Every target below is a tile the search proved it could reach; anything
// it could not reach is reported as "GAVE UP" and named, never quietly skipped.
//
// A shot name ending in '!' is taken twice, at 1x and again at 3x, for the
// handful of places where the question is about the pixels rather than the
// layout.
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
  for (let attempt = 0; attempt < 6; attempt++) {
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
      // A wild encounter is not a failure; press through it and carry on.
      for (let i = 0; i < 250 && top().name !== 'overworld'; i++) d.key('Enter', 6);
    }
  }
  // The last tile or two, one step at a time.
  //
  // A run held at twelve ticks a step is a shade under the fifteen a tile takes,
  // which flows nicely over a long path and reliably stops one short at the end
  // of a two-step one. Correcting a step at a time here costs nothing and is the
  // difference between a photograph and a driver reporting a wall that is not
  // there.
  for (let i = 0; i < 16; i++) {
    if (top().name !== 'overworld') break;
    const [cx, cy] = (d.probe().pos || '0,0').split(',').map(Number);
    if (cx === tx && cy === ty) return true;
    const k = cx < tx ? 'KeyD' : cx > tx ? 'KeyA' : cy < ty ? 'KeyS' : 'KeyW';
    // Thirteen, not sixteen: a hold long enough to cross a tile boundary can
    // cross two, and a correction that overshoots oscillates instead of landing.
    d.hold(k, 13);
    d.tick(3);
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
// A party the level a player actually arrives with. Without it the driver
// walks a level-six starter into a field of level-twenty-eight Beast Kin, gets
// whited out on the second screen, and reports the rest of the road as missing.
const kinMod = await import('/build/js/systems/kin.js');
state.party.length = 0;
for (const [sp, lv] of [['thornmarch', 40], ['galecrest', 38], ['menhir', 38], ['maelstrix', 38]]) {
  state.party.push(kinMod.createKin(sp, lv, d.game.rng, { originalTrainer: 'player' }));
}
// Every trainer on the road, marked beaten.
//
// This driver is photographing LAYOUT, and a trainer who stops it at the third
// screen photographs a battle instead. The fights are measured separately and
// properly by tests/helpers/simulate.mjs, which is where difficulty is decided;
// what this run has to prove is that a player can get to every tile the maps
// claim to have, and a sight line firing is exactly the thing that stops it
// proving that.
for (const t of ['r7_bankman', 'r7_dyke', 'r7_carter', 'r7_gate', 'r7_stubble',
  'r7n_wagon', 'r7n_ganger', 'r7n_ferry', 'r7n_courier', 'r7n_reaper', 'r7n_wire',
  'r7f_fowler', 'r7r_linesman', 'hg_granary_hand']) state.markDefeated(t);

const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;

/**
 * Take the wild encounters off the map for the duration of a photograph.
 *
 * This driver exists to prove the LAYOUT: that every tile the maps claim to
 * have can actually be stood on. A wild fight every nine steps in a field of
 * standing corn is the tables working exactly as designed -- it is measured
 * properly in tests/helpers/simulate.mjs, which is where difficulty is decided
 * -- but in here it is a scene the camera is pointed at instead of the road.
 */
const quiet = () => { const sc = top(); if (sc && 'encounters' in sc) sc.encounters = undefined; };

const visit = async (id, x, y, shots) => {
  d.game.scenes.replaceAll(new Overworld(state, id, x, y, 'down'));
  await d.loadWait(1400);
  for (let i = 0; i < 30 && top().name === 'dialogue'; i++) d.key('Enter', 8);
  quiet();
  note(`${id}: entered at ${d.probe().pos}`);
  for (const [name, tx, ty] of shots) {
    // Clear anything the last leg left on top -- a wild fight, a text box --
    // before planning the next one, rather than reporting the map as missing.
    for (let i = 0; i < 400 && top().name !== 'overworld'; i++) d.key('Enter', 6);
    if (top().name !== 'overworld' || d.probe().map !== id) {
      d.game.scenes.replaceAll(new Overworld(state, id, x, y, 'down'));
      await d.loadWait(1200);
      quiet();
    }
    const ok = await goTo(tx, ty);
    if (top().name !== 'overworld' || d.probe().map !== id) {
      note(`${name}: left the map for ${d.probe().map}`);
      d.game.scenes.replaceAll(new Overworld(state, id, x, y, 'down'));
      await d.loadWait(1000);
      continue;
    }
    const file = name.replace(/!$/, '');
    await d.shoot(file, 6);
    if (name.endsWith('!')) await d.shoot(file + '-3x', 0, 3);
    note(`${name}: ${ok ? 'reached' : 'GAVE UP short of'} ${tx},${ty} - at ${d.probe().pos}`);
  }
};

await visit('route_7', 2, 57, [
  ['r7-01-causeway', 7, 57],
  ['r7-02-bankfoot', 10, 55],
  ['r7-03-banktop', 10, 51],
  ['r7-04-fork', 10, 46],
  ['r7-05-eastleg', 20, 45],
  ['r7-06-bridge', 29, 36],
  ['r7-07-wheat!', 20, 28],
  ['r7-08-crossing!', 29, 22],
  ['r7-09-signal', 27, 18],
  ['r7-10-northwheat', 20, 8],
  ['r7-11-milestone', 28, 6],
  ['r7-12-pasture', 42, 15],
  ['r7-13-junction', 47, 29],
  ['r7-14-fengate', 20, 61],
]);

await visit('route_7_north', 29, 61, [
  ['r7n-01-curve', 28, 53],
  ['r7n-02-lane', 18, 47],
  ['r7n-03-relaytrack', 30, 40],
  ['r7n-04-crossing', 9, 27],
  ['r7n-05-bridge!', 16, 22],
  ['r7n-06-eyotview', 19, 19],
  ['r7n-07-occupation', 9, 16],
  ['r7n-08-tunnel', 43, 14],
  ['r7n-09-gate', 16, 3],
]);

await visit('route_7_fen', 20, 2, [
  ['fen-01-plankend', 20, 8],
  ['fen-02-breach', 19, 12],
  ['fen-03-ruin', 30, 18],
  ['fen-04-reeds', 9, 26],
]);

await visit('route_7_relay', 2, 9, [
  ['relay-01-gate', 6, 9],
  ['relay-02-hut', 12, 12],
  ['relay-03-grass', 19, 5],
]);

await visit('marlbeck', 42, 20, [
  ['mb-01-street', 30, 20],
  ['mb-04-clinic', 11, 26],
  ['mb-02-engine', 12, 15],
  ['mb-03-bank', 20, 8],
]);

await visit('harrowgate', 50, 19, [
  ['hg-01-high', 40, 19],
  ['hg-02-cross', 22, 20],
  ['hg-03-station', 25, 26],
  ['hg-04-platform!', 20, 30],
  ['hg-05-granary', 45, 28],
  ['hg-06-civic', 12, 18],
]);

const rooms = [
  ['marlbeck_engine', 9, 13, 'in-01-engine', 7, 8],
  ['harrowgate_halt', 9, 10, 'in-02-halt', 8, 5],
  ['harrowgate_granary', 11, 15, 'in-03-granary', 9, 8],
  ['harrowgate_office', 7, 9, 'in-04-office', 7, 5],
];
for (const [id, sx, sy, name, tx, ty] of rooms) {
  await visit(id, sx, sy, [[name, tx, ty]]);
}

return { log };
