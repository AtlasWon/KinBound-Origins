// The Venom Hall of Mirehaven, walked rather than assumed.
//
// Modelled on tools/shots/act1.js and tidehall.js: every position comes from
// the map's own collision (BFS) or from the game saying where it just put the
// player. Nothing is a hardcoded route, because the whole claim this room
// makes -- that the walk and the water are two networks and they touch at four
// places -- is exactly the claim a hardcoded route would stop testing.
//
//   node tools/serve.js
//   npx electron tools/capture.cjs tools/shots/venomhall.js

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

const settle = async (ms = 320) => {
  await d.loadWait(ms);
  for (let pass = 0; pass < 4000; pass++) {
    const t = top();
    if (t.name === 'overworld' && !t.busy && !(t.events && t.events.running)) return;
    if (t.name === 'battle') battleStep(t);
    else if (t.name === 'dialogue') d.key('Enter', 8);
    else d.tick(6);
    if (pass % 10 === 9) await d.sleep(15);
  }
  note(`settle: never went quiet, top is ${top().name}`);
};

// Walkable for a player holding Wade: solid is out, deep peat (8) is out,
// standing marsh water (2) is in. This map deliberately does NOT set freeWade
// -- the art the Tide Hall gave is what opens its floor.
const route = (sx, sy, tx, ty) => {
  const m = top().map;
  if (!m) return null;
  const key = (x, y) => `${x},${y}`;
  const open = (x, y) => {
    if (!m.inBounds(x, y)) return false;
    const c = m.collisionAt(x, y);
    return c === 0 || c === 2 || c === 6;
  };
  const blocked = new Set((top().npcs || []).map((n) => key(n.actor.tileX, n.actor.tileY)));
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
const DIR = { KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right' };

const stepOne = (code) => {
  const before = pos();
  d.down(code);
  for (let i = 0; i < 40 && pos() === before && top().name === 'overworld' && !top().busy; i++) d.tick(1);
  for (let i = 0; i < 5 && top().name === 'overworld' && !top().busy; i++) d.tick(1);
  d.up(code);
  for (let i = 0; i < 24 && top().player && top().player.moving; i++) d.tick(1);
  d.tick(2);
};

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
      await settle(300);
      if (map() !== startMap) return 'warped';
      const [cx, cy] = pos().split(',').map(Number);
      if (cx === wantX && cy === wantY) { x = cx; y = cy; continue; }
      if (cx === x && cy === y) {
        note(`${label}: refused ${x},${y} -${k}-> ${wantX},${wantY}`
          + ` col=${top().map.collisionAt(wantX, wantY)}`
          + ` canEnter=${top().canEnter(wantX, wantY, DIR[k])}`);
        break;
      }
      x = cx; y = cy;                              // spotted and dragged a tile
    }
  }
  return pos() === `${tx},${ty}` ? 'arrived' : 'stuck';
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
for (const c of [1, 2, 3, 4]) state.giveCrest(c);
state.giveArt('wade');
if (!state.party.length) {
  const { createKin } = await import('/build/js/systems/kin.js');
  // The party tests/helpers/simulate.mjs measures this Hall against: the
  // starter line at the level the Act 3 model says a team-raiser arrives with,
  // and three ordinary catchables a level under it.
  state.party.push(createKin('brookmaw', 30, d.game.rng, { originalTrainer: 'player' }));
  state.party.push(createKin('kestrelle', 29, d.game.rng, { originalTrainer: 'player' }));
  state.party.push(createKin('gullswift', 29, d.game.rng, { originalTrainer: 'player' }));
  state.party.push(createKin('silthopper', 29, d.game.rng, { originalTrainer: 'player' }));
}
const { TrainerAI } = await import('/build/js/battle/ai.js');
novice = new TrainerAI('novice', d.game.rng);
note(`party: ${state.party.map((k) => k.name + ' L' + k.level).join(', ')}`);

const out = [];
const shoot = async (name, scale = 1) => { out.push(await d.shoot(name, 8, scale)); };

/* --------------------------------------------------------- the pile house */

await top().loadMap(d.game, 'mirehaven_hall', 8, 10, 'up');
await settle(700);
note(`pile house: ${map()} at ${pos()}`);
await shoot('venomhall-01-pilehouse');

// Read the board over the hatch, which is the room's whole rulebook.
note(`to hatch board: ${await goTo(8, 1, 'board')}`);

/* ---------------------------------------------------------- the underfloor */

if (map() === 'mirehaven_hall') {
  const hatch = (top().map.warps || []).find((w) => w.toMap === 'mirehaven_hall_under');
  note(`hatch at ${hatch ? hatch.x + ',' + hatch.y : 'MISSING'}`);
  note(`down the hatch: ${await goTo(hatch.x, hatch.y, 'hatch')}`);
}
await settle(900);
note(`underfloor: ${map()} at ${pos()}`);
await shoot('venomhall-02-landing');

// The three rules, from the hand by the ladder.
note(`to guide: ${await goTo(3, 2, 'guide')}`);
d.hold('KeyA', 6);
for (let i = 0; i < 12 && !state.hasFlag('mh_rules'); i++) { d.key('Enter', 10); clear(); }
note(`rules given: ${state.hasFlag('mh_rules')}`);

/* ------------------------------- walk the ring, gate by gate, in map order */

/*
 * Walk to a tile, photograph it if asked, and then heal.
 *
 * The heal is not cheating and it is not a difficulty claim. This driver is
 * testing whether the ROOM works -- whether every pocket opens, every item is
 * reachable, no trainer parks herself in her own doorway -- and it fights four
 * hands and a Keeper back to back with no bag, which is not a run any player
 * has. On the first pass it lost to Varis on the south walk, whited out to
 * Hearthmere, and reported the last third of the Hall unreachable, which is
 * exactly the kind of lie a driver must not tell. Difficulty is measured in
 * tests/helpers/simulate.mjs and nowhere else.
 */
const beat = async (label, tx, ty, shot) => {
  const r = await goTo(tx, ty, label);
  await settle(500);
  note(`${label}: ${r} -> ${map()} ${pos()}`);
  if (shot) await shoot(shot);
  state.healParty();
  return r;
};

// Gate N: the north bank, Odile, and the Full Restore behind her.
await beat('gate N mouth', 6, 4, 'venomhall-03-gateN');
await beat('north bank', 6, 6, null);
await beat('north bank item', 3, 8, null);

// Gate NE: three tiles of water and a bank, exactly as its card says.
await beat('gate NE stub', 13, 6, null);

// Gate E: the glue bank and Hollis.
await beat('gate E mouth', 18, 8, 'venomhall-04-gateE');
await beat('glue bank item', 15, 10, null);

// The south walk, the rotted end, and the fourth gap.
await beat('rotted end', 7, 19, null);
await beat('gate S mouth', 14, 17, 'venomhall-05-gateS');

/* ------------------------------------------------------------ the keeper */

await beat('the lane', 12, 15, 'venomhall-06-lane');
await beat('the great pile', 10, 13, 'venomhall-07-greatpile');

d.hold('KeyW', 6);
for (let i = 0; i < 60 && !state.hasFlag('crest_5_taken'); i++) {
  d.key('Enter', 10);
  await settle(260);
  state.healParty();
  if (map() !== 'mirehaven_hall_under') break;
}
await settle(600);
note(`after the Keeper: ${map()} ${pos()} crest5=${state.crests.has(5)} flag=${state.hasFlag('crest_5_taken')}`);
await shoot('venomhall-08-crest');

// The ladder out, which stands on the middle bank behind her.
const ladder = (top().map?.warps || []).filter((w) => w.toMap === 'mirehaven_hall');
note(`ladders on this map: ${ladder.map((w) => w.x + ',' + w.y).join(' ')}`);
await beat('ladder home', 8, 9, null);
await settle(700);
note(`out: ${map()} at ${pos()}`);
await shoot('venomhall-09-out');

const bag = (state.bag || []).map((b) => `${b.item}x${b.count}`).join(' ');
return {
  log,
  crest5: state.crests.has(5),
  defeated: ['mh_hand_a', 'mh_hand_b', 'mh_hand_c', 'mh_hand_d', 'mh_keeper_tallow']
    .filter((t) => state.hasDefeated(t)),
  items: ['item_mh_hall_a', 'item_mh_hall_b', 'item_mh_hall_c', 'item_mh_hall_d', 'item_mh_hall_e']
    .filter((f) => state.hasFlag(f)),
  // The room's own voice: the rule at the first gap, and the three lines that
  // mark the walk in along the fourth lane.
  atmosphere: ['mh_gate_seen', 'mh_lane_1_seen', 'mh_lane_2_seen', 'mh_lane_3_seen']
    .filter((f) => state.hasFlag(f)),
  bag,
  probe: d.probe(),
  out,
};
