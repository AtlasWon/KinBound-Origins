// The Flame Hall, walked rather than assumed.
//
// Every position comes from the map's own collision (BFS, as act1.js does) or
// from the game telling us where it just put us. The whole point of this room
// is that a shaft is a lift or a hole depending on a variable, so a driver that
// walked a hardcoded route would be describing a room that does not exist.
//
//   node tools/serve.js
//   npx electron tools/capture.cjs tools/shots/emberhall.js

const d = window.dev;
const top = () => d.game.scenes.top;
const log = [];
const note = (s) => { log.push(s); };
const pos = () => (d.probe().pos || '?,?');
const map = () => d.probe().map;

const clear = () => {
  for (let i = 0; i < 60 && top().name === 'dialogue'; i++) d.key('Enter', 8);
  d.tick(4);
};

/** Play any battle on screen with the same novice AI the simulator uses. */
let novice = null;
const battleStep = (t) => {
  if (t.phase === 'menu' && t.battle && novice) {
    const act = novice.choose(t.battle, 'player');
    const slot = act.kind === 'move' ? act.index : 0;
    d.key('Enter', 6);
    for (let k = 0; k < slot; k++) d.key('KeyS', 4);
    d.key('Enter', 6);
  } else d.key('Enter', 6);
};

/** One loop, not three: a trainer can step out in the middle of anything. */
const settle = async (ms = 300) => {
  await d.loadWait(ms);
  for (let pass = 0; pass < 4000; pass++) {
    const t = top();
    if (t.name === 'overworld' && !t.busy && !(t.events && t.events.running)) return;
    if (t.name === 'battle') battleStep(t);
    else if (t.name === 'dialogue') {
      // `choosing` is the flag, not `opts.choices`: the box carries its options
      // from the first page, but the cursor is not live until the last page has
      // been advanced. Answering early only turns the page and then the cursor
      // resets to zero, which is how the beam hand read as a no-op for a whole
      // run of this driver while every var stayed where it started.
      if (t.choosing) return;
      d.key('Enter', 8);
    } else d.tick(6);
    if (pass % 10 === 9) await d.sleep(15);
  }
  note(`settle: never went quiet, top is ${top().name}`);
};

/** Answer a choice box by label, so the driver does not depend on option order. */
const answer = async (label) => {
  for (let i = 0; i < 80; i++) {
    const t = top();
    if (t.name === 'dialogue' && t.choosing) {
      const idx = (t.opts.choices || []).findIndex((c) => c.toUpperCase() === label.toUpperCase());
      if (idx < 0) { note(`answer: no "${label}" in [${(t.opts.choices || []).join(', ')}]`); return false; }
      t.choiceIndex = idx;
      d.key('Enter', 14);
      await settle();
      return true;
    }
    if (t.name === 'dialogue') d.key('Enter', 8);
    else d.tick(6);
  }
  note(`answer: no choice box appeared for "${label}"`);
  return false;
};

/* Every tile a step script fires on, read from the registry rather than typed. */
let vents = new Set();
const loadVents = async (mapId) => {
  const reg = (await import('/build/js/data/registry.js')).registry;
  vents = new Set();
  for (const s of reg.scripts.values()) {
    if (s.trigger !== 'step' || s.map !== mapId) continue;
    for (const t of s.at || []) vents.add(`${t.x},${t.y}`);
  }
  note(`step tiles on ${mapId}: ${vents.size}`);
};

const route = (sx, sy, tx, ty) => {
  const m = top().map;
  if (!m) return null;
  const key = (x, y) => `${x},${y}`;
  const open = (x, y) => m.inBounds(x, y) && [0, 2, 6].includes(m.collisionAt(x, y));
  const blocked = new Set((top().npcs || []).map((n) => key(n.actor.tileX, n.actor.tileY)));
  for (const t of vents) if (t !== key(tx, ty)) blocked.add(t);
  const from = new Map([[key(sx, sy), null]]);
  const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    if (x === tx && y === ty) break;
    for (const [dx, dy, k] of [[0, -1, 'KeyW'], [0, 1, 'KeyS'], [-1, 0, 'KeyA'], [1, 0, 'KeyD']]) {
      const nx = x + dx, ny = y + dy;
      if (!open(nx, ny) || from.has(key(nx, ny))) continue;
      if (blocked.has(key(nx, ny)) && !(nx === tx && ny === ty)) continue;
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

const VEC = { KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0] };

/**
 * Exactly one tile, held until the feet box sits inside ONE tile again.
 *
 * A fixed number of extra ticks is not enough and the difference is not
 * cosmetic. The body is 11x9 pixels and its tile index flips at the halfway
 * point, so releasing five ticks after the flip leaves the box straddling two
 * ROWS -- and a straddling body is tested against both of them. That is why an
 * earlier run of this driver reported the fissure floor as impassable: it was
 * standing half in row 18, where the tap's cheek stone is, and asking to walk
 * east along row 19, where it is not. Hold until aligned and the room opens up.
 */
const aligned = () => {
  const p = top().player;
  if (!p) return true;
  return Math.floor(p.y / 16) === Math.floor((p.y + 8) / 16)
    && Math.floor(p.x / 16) === Math.floor((p.x + 10) / 16);
};
const stepOne = (code) => {
  const before = pos();
  const live = () => top().name === 'overworld' && !top().busy;
  d.down(code);
  for (let i = 0; i < 40 && pos() === before && live(); i++) d.tick(1);
  for (let i = 0; i < 14 && !aligned() && live(); i++) d.tick(1);
  d.up(code);
  for (let i = 0; i < 24 && top().player && top().player.moving; i++) d.tick(1);
  d.tick(2);
};

/**
 * Walk toward a tile and stop the moment the world puts the player somewhere
 * else. On this map that is not a failure, it is the room working.
 */
const goTo = async (tx, ty, label) => {
  for (let attempt = 0; attempt < 4; attempt++) {
    let [x, y] = pos().split(',').map(Number);
    const startMap = map();
    if (x === tx && y === ty) return 'arrived';
    const steps = route(x, y, tx, ty);
    if (!steps) { note(`${label}: NO ROUTE from ${x},${y} to ${tx},${ty} on ${startMap}`); return 'noroute'; }
    for (const k of steps) {
      const [dx, dy] = VEC[k];
      const wantX = x + dx, wantY = y + dy;
      stepOne(k);
      await settle(280);
      const [cx, cy] = pos().split(',').map(Number);
      if (map() !== startMap) return 'warped';
      if (cx === wantX && cy === wantY) { x = cx; y = cy; continue; }
      if (cx === x && cy === y) {
        const p2 = top().player;
        note(`${label}: refused ${x},${y} -${k}-> ${wantX},${wantY}`
          + ` col=${top().map.collisionAt(wantX, wantY)} busy=${top().busy}`
          + ` body=${p2.x.toFixed(1)},${p2.y.toFixed(1)} rows[${Math.floor(p2.y / 16)}..${Math.floor((p2.y + 8) / 16)}]`
          + ` npcs=${(top().npcs || []).map((n) => n.data.id + '@' + n.actor.tileX + ',' + n.actor.tileY).join(' ')}`);
        break;
      }
      return 'taken';                                   // the draught had us
    }
  }
  return pos() === `${tx},${ty}` ? 'arrived' : 'stuck';
};

/**
 * Try each tile of a two-wide mouth in turn.
 *
 * A beaten trainer stops one tile short of wherever the player was standing,
 * and on this floor that can be one of the two lips of a tap -- which is
 * exactly why a tap lip is two tiles and not one. One of them is always free;
 * a driver that only ever aimed at the left-hand one reported the whole west
 * side of the Hall unreachable because Wick happened to be standing on it.
 */
const goToAny = async (targets, label) => {
  let last = 'noroute';
  for (const [tx, ty] of targets) {
    last = await goTo(tx, ty, label);
    if (last === 'taken' || last === 'warped' || last === 'arrived') return last;
  }
  return last;
};

/** Stand beside an NPC and face them. */
const faceNpc = async (id, label) => {
  const n = (top().npcs || []).find((o) => o.data.id === id);
  if (!n) { note(`${label}: ${id} not on the map`); return false; }
  const m = top().map;
  const spots = [[0, 1, 'KeyW'], [0, -1, 'KeyS'], [1, 0, 'KeyA'], [-1, 0, 'KeyD']]
    .map(([dx, dy, look]) => [n.actor.tileX + dx, n.actor.tileY + dy, look])
    .filter(([x, y]) => m.inBounds(x, y) && m.collisionAt(x, y) === 0 && !vents.has(`${x},${y}`));
  for (const [x, y, look] of spots) {
    const r = await goTo(x, y, label);
    if (pos() !== `${x},${y}`) { note(`${label}: ${r} at ${pos()}`); continue; }
    stepOne(look);
    note(`${label}: standing ${pos()} facing ${top().player ? top().player.facing : '?'}`);
    return true;
  }
  return false;
};

/* --------------------------------------------------------- boot a save */

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

const state = top().state;
for (const c of [1, 2, 3]) state.giveCrest(c);
if (!state.party.length) {
  const { createKin } = await import('/build/js/systems/kin.js');
  // Four kin at the level the difficulty harness says a team-raiser holds when
  // Embercoil Pass puts them down outside this door.
  state.party.push(createKin('brookmaw', 25, d.game.rng, { originalTrainer: 'player' }));
  state.party.push(createKin('kestrelle', 24, d.game.rng, { originalTrainer: 'player' }));
  state.party.push(createKin('chalkmar', 24, d.game.rng, { originalTrainer: 'player' }));
  state.party.push(createKin('mossback', 24, d.game.rng, { originalTrainer: 'player' }));
}
note(`party: ${state.party.map((k) => k.name + ' L' + k.level).join(', ')}`);
const { TrainerAI } = await import('/build/js/battle/ai.js');
novice = new TrainerAI('novice', d.game.rng);

await top().loadMap(d.game, 'emberfall_hall', 9, 12, 'up');
await settle(700);
note(`lobby: ${map()} at ${pos()}`);
const out = [];
out.push(await d.shoot('emberhall-01-lobby', 8, 1));

/* --------------------------------------------------------- into the stack */

const stair = (top().map.warps || []).find((w) => w.toMap === 'emberfall_hall_flues');
note(`lobby stair -> ${stair ? stair.x + ',' + stair.y : 'MISSING'}`);
note(`to stair: ${await goTo(stair.x, stair.y, 'stair')}`);
await settle(700);
note(`fissure floor: ${map()} at ${pos()}`);
await loadVents('emberfall_hall_flues');
out.push(await d.shoot('emberhall-02-floor', 8, 1));

const V = (k) => state.getVar(k);
note(`vars on arrival: ef_low=${V('ef_low')} ef_head=${V('ef_head')} ef_shifts=${V('ef_shifts')}`);

/* ------------------------------ leg 1: the west tap, which starts breathing */

note(`to west tap: ${await goToAny([[4, 18], [5, 18]], 'west tap')}`);
note(`after the west tap: ${map()} at ${pos()}  (expect 5,12 -- the west gallery)`);
out.push(await d.shoot('emberhall-03-west-gallery', 8, 1));

/* ---------------------------- leg 2: the head stack, dark, should drop us */

note(`to the head stack: ${await goToAny([[5, 9], [6, 9]], 'head stack')}`);
note(`after a dark head stack: ${map()} at ${pos()}  (expect 5,19 -- back on the floor)`);

/* ------------------------------------- leg 3: ask Brom for the east socket */

if (await faceNpc('ef_beamhand', 'beam hand')) {
  d.key('Enter', 14);
  await settle();
  await answer('EAST TAP');
  clear();
  await settle();
}
note(`after asking for east: ef_low=${V('ef_low')} ef_shifts=${V('ef_shifts')}`);

/* ------------------------------------------ leg 4: ride east, meet the crew */

note(`to east tap: ${await goToAny([[15, 18], [16, 18]], 'east tap')}`);
note(`after the east tap: ${map()} at ${pos()}  (expect 16,12 -- the east gallery)`);
out.push(await d.shoot('emberhall-04-east-gallery', 8, 1));

// Dess stands across the only row that reaches the wheel, so walking to Calla
// is also the test of whether she is really unavoidable.
state.healParty();
if (await faceNpc('ef_sharehand', 'share hand')) {
  note(`bath crew beaten on the way: ${state.hasDefeated('ef_bath_crew')}`);
  d.key('Enter', 14);
  // Her ask is a YES/NO; take YES.
  await settle();
  await answer('YES');
  clear();
  await settle();
}
note(`after the share hand: ef_head=${V('ef_head')}`);
out.push(await d.shoot('emberhall-05-wheel', 8, 1));

/* ------------------ leg 5: the east head refuses, so take the cold downcast */

note(`to the east shaft head: ${await goToAny([[17, 12], [18, 12]], 'east head')}`);
note(`after stepping on a breathing shaft head: ${map()} at ${pos()}  (expect no move)`);
note(`to the east downcast: ${await goToAny([[13, 12], [14, 12]], 'east downcast')}`);
note(`after the downcast: ${map()} at ${pos()}  (expect 13,22)`);

/* -------------------------------------- leg 6: beam back west, ride the stack */

if (await faceNpc('ef_beamhand', 'beam hand again')) {
  d.key('Enter', 14);
  await settle();
  await answer('WEST TAP');
  clear();
  await settle();
}
note(`after asking for west: ef_low=${V('ef_low')} ef_shifts=${V('ef_shifts')}`);

note(`to west tap again: ${await goToAny([[4, 18], [5, 18]], 'west tap again')}`);
note(`back in the west gallery: ${map()} at ${pos()}`);
note(`to the head stack again: ${await goToAny([[5, 9], [6, 9]], 'head stack again')}`);
note(`after a breathing head stack: ${map()} at ${pos()}  (expect 7,4 -- the head)`);
out.push(await d.shoot('emberhall-06-head', 8, 1));

/* ------------------------------------------------------------ the Keeper */

state.healParty();
if (await faceNpc('ef_keeper', 'keeper')) {
  d.key('Enter', 14);
  for (let i = 0; i < 3000; i++) {
    const t = top();
    if (t.name === 'battle') { battleStep(t); continue; }
    if (t.name === 'dialogue') { d.key('Enter', 8); continue; }
    if (t.name === 'overworld' && !t.busy && !(t.events && t.events.running)) break;
    d.tick(4);
  }
  await settle(600);
  note(`after the Keeper: crest4=${state.crests.has(4)} kindle=${state.hasArt('kindle')}`
    + ` crest_4_taken=${state.hasFlag('crest_4_taken')} won=${state.getVar('last_battle_won')}`
    + ` on ${map()} at ${pos()} party=[${state.party.map((k) => k.name + ' ' + k.hp + '/' + k.maxHp).join(', ')}]`);
  out.push(await d.shoot('emberhall-07-crest', 8, 2));
}

/* ------------------------------------------------- out by the head's stair */

const headStair = (top().map.warps || []).find((w) => w.toMap === 'emberfall_hall' && w.y < 6);
note(`head stair -> ${headStair ? headStair.x + ',' + headStair.y : 'MISSING'}`);
if (headStair) {
  note(`to head stair: ${await goTo(headStair.x, headStair.y, 'head stair')}`);
  await settle(700);
  note(`out: ${map()} at ${pos()}`);
}
out.push(await d.shoot('emberhall-08-lobby-after', 8, 1));

return {
  log,
  vars: { ef_low: V('ef_low'), ef_head: V('ef_head'), ef_shifts: V('ef_shifts') },
  crest4: state.crests.has(4),
  kindle: state.hasArt('kindle'),
  beaten: ['ef_tap_a', 'ef_tap_b', 'ef_bath_crew', 'ef_keeper_cade']
    .filter((t) => state.hasDefeated(t)),
  probe: d.probe(),
  out,
};
