// The Caelora Summit, walked rather than teleported.
//
//   node tools/serve.js                              # if nothing is on 5173
//   npx electron tools/capture.cjs tools/shots/summit.js
//
// Four maps and a check-in: the approach and its field of stones, the
// Threshold and its rail, the Last Room, and the Wind Step. The route is the
// breadth-first search over the map's own collision that tools/shots/act1.js
// uses, so a wall in the wrong place shows up in the log as "gave up" rather
// than as a screenshot of the inside of a rock.
//
// IT SETS tarin_summit_won BEFORE IT WALKS. The rival build's step trigger sits
// on 12,5 and 13,5 -- the only two tiles the Summit door can be entered from --
// and it fires for anybody with eight Crests, which is everybody this driver
// makes. Setting the flag closes that beat, which is also what puts the
// permanent town_tarin this map places at 15,5 on the screen.

const d = window.dev;
const top = () => d.game.scenes.top;
const log = [];
const note = (s) => { log.push(s); };
const where = () => (d.probe().map || top().name) + ' ' + (d.probe().pos || '');

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
      if (top().name !== 'overworld') return true;
    }
  }
  const p = d.probe();
  const [x, y] = (p.pos || '0,0').split(',').map(Number);
  return x === tx && y === ty;
};

// Presses through a scene rather than a single box: a script that waits between
// boxes drops out of the dialogue scene for a few ticks and then comes back.
const settle = () => {
  for (let i = 0; i < 120; i++) {
    if (top().name === 'overworld' && !top().busy) return;
    if (top().name === 'dialogue') d.key('Enter', 8); else d.tick(10);
  }
};
const clear = () => {
  // Two consecutive quiet rounds before it gives up: an event script that waits
  // between boxes leaves the dialogue scene for a few ticks and comes back, and
  // a clear that stops on the first gap walks the player into the middle of it.
  let quiet = 0;
  for (let r = 0; r < 24 && quiet < 2; r++) {
    if (top().name === 'dialogue') { quiet = 0; for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 8); }
    else if (top().name !== 'overworld' || top().busy) { quiet = 0; d.tick(20); }
    else { quiet++; d.tick(30); }
  }
  d.tick(4);
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
const kinMod = await import('/build/js/systems/kin.js');
try {
  const Overworld = top().constructor;
  for (let i = 1; i <= 8; i++) state.giveCrest(i);
  for (const art of ['clear', 'shoulder', 'kindle', 'wade', 'swim', 'updraft']) state.arts.add(art);
  state.setFlag('got_starter');
  state.setFlag('starter_sprigling');
  state.setFlag('tarin_summit_won');
  state.party.length = 0;
  for (const [sp, lv] of [['thornmarch', 50], ['volcatrix', 49], ['maelstrix', 49], ['craglide', 48]]) {
    state.addKin(kinMod.createKin(sp, lv, d.game.rng, { originalTrainer: 'player' }));
  }

  const at = async (map, x, y, facing) => {
    d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing || 'down'));
    await d.loadWait(1100);
    clear();
  };

  /* -------------------------------------------- 1. the approach, walked */

  await at('summit_approach', 13, 22, 'up');
  note('approach: ' + where());
  await d.shoot('summit-1-roadhead', 8, 1);

  const near = await goTo(11, 13);
  d.hold('KeyA', 5);
  d.key('Enter', 14);
  note('stone walk ' + near + ' at ' + where());
  note('stone keeper: ' + (d.probe().text || '(no box) ' + top().name));
  clear();
  await d.shoot('summit-2-field', 8, 1);

  await goTo(13, 6);
  await d.shoot('summit-3-door', 8, 1);
  const inDoor = await goTo(13, 4);
  await d.loadWait(1200);
  clear();
  note('through the door -> ' + where() + ' (walked:' + inDoor + ')');

  /* ------------------------------------------- 2. the Threshold, walked */

  await d.shoot('summit-4-threshold-south', 8, 1);
  await goTo(9, 12);
  await d.shoot('summit-5-rail', 8, 1);

  await goTo(7, 10);
  d.hold('KeyW', 5);
  for (let i = 0; i < 10 && !state.hasFlag('summit_admitted'); i++) { d.key('Enter', 14); clear(); }
  note('summit_admitted = ' + state.hasFlag('summit_admitted') + ' at ' + where());
  await d.shoot('summit-6-checkin', 8, 1);

  await goTo(17, 4);
  await d.loadWait(1200);
  clear();
  note('east door -> ' + where());
  await d.shoot('summit-7-lastroom', 8, 1);

  await goTo(6, 10);
  d.hold('KeyW', 5);
  d.key('Enter', 14);
  clear();
  note('muster keeper: respawn=' + state.respawnMap + ' ' + state.respawnX + ',' + state.respawnY);
  await d.shoot('summit-8-keeper', 8, 1);

  await goTo(0, 12);
  await d.loadWait(1200);
  clear();
  note('back -> ' + where());

  await goTo(8, 3);
  await d.shoot('summit-9-seal', 8, 1);
  d.hold('KeyW', 5);
  for (let i = 0; i < 12 && d.probe().map === 'summit_hall'; i++) { d.key('Enter', 14); clear(2); }
  await d.loadWait(1400);
  clear();
  settle();
  note('through the Seal -> ' + where());

  /* -------------------------------------------------- 3. the Wind Step */

  if (d.probe().map === 'summit_ascent') {
    await d.shoot('summit-10-windstep-low', 8, 1);
    note('respawn after the Seal = ' + state.respawnMap + ' ' + state.respawnX + ',' + state.respawnY);
    const narrows = await goTo(9, 7);
    note('narrows 9,7: ' + narrows + ' at ' + where());
    await d.shoot('summit-11-narrows', 8, 1);
    const shelf = await goTo(9, 4);
    note('shelf 9,4: ' + shelf);
    await d.shoot('summit-12-shelf', 8, 1);
    const gone = await goTo(9, 0);
    await d.loadWait(1400);
    clear();
    note('first Master door -> ' + where() + ' (walked:' + gone + ')');
    await d.shoot('summit-13-firstmaster', 8, 1);
  } else {
    note('NEVER REACHED THE WIND STEP');
    await at('summit_ascent', 9, 16, 'up');
    await d.shoot('summit-10-windstep-low', 8, 1);
    await goTo(9, 4);
    await d.shoot('summit-12-shelf', 8, 1);
  }

  note('done');
} catch (e) { note('THREW: ' + (e && e.message)); }
return { log };
