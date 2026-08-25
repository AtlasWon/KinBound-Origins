// The Tide Hall, walked rather than assumed.
//
// Every position in here comes from the map's own collision (BFS, as act1.js
// does) or from the game telling us where it just put us. Nothing is a
// hardcoded route: the point of the room is that the player does NOT choose
// where the water goes, so a driver that assumed a path would be describing a
// different room.
//
//   node tools/serve.js
//   npx electron tools/capture.cjs tools/shots/tidehall.js

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

/**
 * Play any battle that is on screen, with the SAME novice AI the simulator
 * uses. Mashing Enter is not novice play, it is "always move slot one", which
 * is a third and worse policy -- it lost the Keeper once and warped the whole
 * walk-through back to Hearthmere, which would have read as a broken Hall.
 */
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

/**
 * Wait until the field is quiet, whatever is between here and quiet.
 *
 * ONE loop, not three. The first version tried a battle pass, then a dialogue
 * pass, then a busy pass, and a trainer stepping out of nowhere lands in the
 * middle of that sequence -- so the driver read `map()` while a battle was on
 * top, got undefined, and reported the whole room unreachable. It has to yield
 * to the event loop periodically too, or a warp's map fetch can never land.
 */
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

/**
 * Every tile on this map that a step script fires on, read from the registry
 * rather than typed in. Pathing has to treat them as one-way doors: a route
 * that crosses a lane is not a route, it is a ride to somewhere else.
 */
let currents = new Set();
const loadCurrents = async () => {
  const reg = (await import('/build/js/data/registry.js')).registry;
  currents = new Set();
  for (const s of reg.scripts.values()) {
    if (s.trigger !== 'step' || s.map !== 'tideglass_hall_works') continue;
    for (const t of s.at || []) currents.add(`${t.x},${t.y}`);
  }
  note(`current tiles on the works map: ${currents.size}`);
};

// Walkable for the player: solid (1) and deep water (8) are out; shallow (2)
// is in because this map sets freeWade.
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
  for (const t of currents) if (t !== key(tx, ty)) blocked.add(t);
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
 * Exactly one tile. Movement is continuous, so a fixed hold length either
 * falls short or overshoots depending on where in the tile the feet were: hold
 * until the tile index actually changes, then let the step land.
 */
const stepOne = (code) => {
  const before = pos();
  d.down(code);
  for (let i = 0; i < 40 && pos() === before && top().name === 'overworld' && !top().busy; i++) d.tick(1);
  // Keep going for five more ticks after the tile index flips. Releasing on
  // the frame it flips parks the body ON the boundary -- eleven pixels of body
  // straddling two tiles -- which is the single worst alignment there is and
  // is not where a person walking across a room ever stops. The first version
  // of this driver did exactly that and reported a lane it could not enter.
  for (let i = 0; i < 5 && top().name === 'overworld' && !top().busy; i++) d.tick(1);
  d.up(code);
  for (let i = 0; i < 24 && top().player && top().player.moving; i++) d.tick(1);
  d.tick(2);
};

/**
 * Walk toward a tile, one step at a time, and stop the moment the world puts
 * the player somewhere other than the tile they stepped into. On this map that
 * is not a failure -- it is the room working -- so it is reported, not retried.
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
      await settle(320);
      const [cx, cy] = pos().split(',').map(Number);
      if (map() !== startMap) return 'warped';
      if (cx === wantX && cy === wantY) { x = cx; y = cy; continue; }
      if (cx === x && cy === y) {
        note(`${label}: refused ${x},${y} -${k}-> ${wantX},${wantY}`
          + ` col=${top().map.collisionAt(wantX, wantY)}`
          + ` canEnter=${top().canEnter(wantX, wantY, { KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right' }[k])}`
          + ` busy=${top().busy} facing=${top().player.facing} moving=${top().player.moving}`);
        break;
      }
      return 'taken';                              // the water had us
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

// Hand the test player a party and the two Crests the Hall asks for, then walk
// in through the front door the city will eventually own.
const state = top().state;
state.giveCrest(1);
state.giveCrest(2);
if (!state.party.length) {
  const { createKin } = await import('/build/js/systems/kin.js');
  // Four kin, which is the party the difficulty harness measures the Keeper
  // against (tests/helpers/simulate.mjs matchedRate). A two-kin party walking
  // the whole gauntlet with no healing loses to Vane often enough to make this
  // driver flaky, and a flaky driver is a driver that lies about the room.
  state.party.push(createKin('brookmaw', 26, d.game.rng, { originalTrainer: 'player' }));
  state.party.push(createKin('kestrelle', 25, d.game.rng, { originalTrainer: 'player' }));
  state.party.push(createKin('mossback', 25, d.game.rng, { originalTrainer: 'player' }));
  state.party.push(createKin('chalkmar', 25, d.game.rng, { originalTrainer: 'player' }));
}
note(`party: ${state.party.map((k) => k.name + ' L' + k.level).join(', ')}`);
const { TrainerAI } = await import('/build/js/battle/ai.js');
novice = new TrainerAI('novice', d.game.rng);

await top().loadMap(d.game, 'tideglass_hall', 9, 12, 'up');
await settle(700);
note(`lobby: ${map()} at ${pos()}`);
const out = [];
out.push(await d.shoot('tidehall-01-lobby', 8, 1));

/* ------------------------------------------------------ down to the tank */

const stair = (top().map.warps || []).find((w) => w.toMap === 'tideglass_hall_works');
note(`lobby stair -> ${stair ? stair.x + ',' + stair.y : 'MISSING'}`);
note(`to stair: ${await goTo(stair.x, stair.y, 'stair')}`);
await settle(700);
note(`apron: ${map()} at ${pos()}`);
await loadCurrents();
out.push(await d.shoot('tidehall-02-apron', 8, 1));

// The hands are NOT pre-beaten: whether the room's three trainers actually
// stand where the player has to walk is a claim about the map, and the only
// honest way to check it is to walk it and see who stops you.

/* ------------------------------------------------------------ the south lane */

note(`to lane mouth: ${await goTo(9, 18, 'mouth')}`);
note(`after south lane: ${map()} at ${pos()}  (expect 4,16)`);
out.push(await d.shoot('tidehall-03-west-staithe', 8, 1));

/* --------------------------------------------- the drain, then back again */

note(`to west drain: ${await goTo(1, 17, 'west drain')}`);
note(`after west drain: ${map()} at ${pos()}  (expect 2,20)`);
note(`back down the lane: ${await goTo(9, 18, 'mouth again')} -> ${pos()}`);

/* -------------------------------------------------- the race, sluice shut */

note(`gate var before: ${state.getVar('tg_gate')}`);
note(`to race mouth: ${await goTo(6, 14, 'race')}`);
note(`after race (shut): ${map()} at ${pos()}  (expect 19,9)`);
out.push(await d.shoot('tidehall-04-east-staithe', 8, 1));

/* ------------------------------------------------------------- the winch */

/** Stand next to an NPC and face them. */
const faceUp = async (id, label) => {
  const n = (top().npcs || []).find((o) => o.data.id === id);
  if (!n) { note(`${label}: ${id} not on the map`); return false; }
  const m = top().map;
  const spots = [[0, 1, 'up'], [0, -1, 'down'], [1, 0, 'left'], [-1, 0, 'right']]
    .map(([dx, dy, look]) => [n.actor.tileX + dx, n.actor.tileY + dy, look])
    .filter(([x, y]) => m.inBounds(x, y) && m.collisionAt(x, y) === 0 && !currents.has(`${x},${y}`));
  for (const [x, y, look] of spots) {
    const r = await goTo(x, y, label);
    if (pos() !== `${x},${y}`) { note(`${label}: ${r} at ${pos()}`); continue; }
    stepOne({ up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' }[look]);
    note(`${label}: standing ${pos()} facing ${top().player ? top().player.facing : '?'}`);
    return true;
  }
  return false;
};

if (await faceUp('tg_hand_c', 'winch approach')) {
  d.key('Enter', 14);
  // Walk the boxes, then take the YES on "Shall I put the beam over?".
  for (let i = 0; i < 40 && top().name === 'dialogue'; i++) {
    if (top().menu || top().options || top().choices) break;
    d.key('Enter', 10);
  }
  d.key('Enter', 14);
  clear();
  await settle();
  note(`gate var after talking: ${state.getVar('tg_gate')}`);
}
out.push(await d.shoot('tidehall-05-winch', 8, 1));

/* --------------------------------------------------- the race, sluice open */

if (state.getVar('tg_gate') >= 1) {
  note(`to race again: ${await goTo(16, 10, 'race again')}`);
  note(`after race (open): ${map()} at ${pos()}  (expect 10,5)`);
  out.push(await d.shoot('tidehall-06-sill', 8, 1));

  const keeper = (top().npcs || []).find((n) => n.data.id === 'tg_keeper');
  note(`keeper on sill: ${keeper ? keeper.actor.tileX + ',' + keeper.actor.tileY : 'MISSING'}`);
  // The sill's own stair is the one up on the sill, not the apron stair the
  // player came in by; both go to the lobby, so pick by where it stands.
  const sillStair = (top().map.warps || []).find((w) => w.toMap === 'tideglass_hall' && w.y < 10);
  note(`sill stair -> ${sillStair ? sillStair.x + ',' + sillStair.y : 'MISSING'}`);
  const here = pos().split(',').map(Number);
  note(`sill stair reachable from the landing: ${sillStair && route(here[0], here[1], sillStair.x, sillStair.y) ? 'yes' : 'NO'}`);

  /* ------------------------------------------------------- the keeper */

  // A player arriving at the sill has a Kin Clinic two streets away and both
  // drains to reach it by; this driver has neither, so it patches up here
  // rather than measuring a fight the harness already measures properly.
  state.healParty();
  if (await faceUp('tg_keeper', 'keeper approach')) {
    d.key('Enter', 14);
    // Run the scene right to its end. `busy` alone is not the end of it: the
    // script's scripted walk to the gauge and its wait are timers on the
    // overworld, so a loop that stops at the first quiet frame reads the flags
    // three boxes early and reports a Crest that was about to be given.
    for (let i = 0; i < 2500; i++) {
      const t = top();
      if (t.name === 'battle') { battleStep(t); continue; }
      if (t.name === 'dialogue') { d.key('Enter', 8); continue; }
      if (t.name === 'overworld' && !t.busy && !(t.events && t.events.running)) break;
      d.tick(4);
    }
    await settle(600);
    note(`after the keeper: crest3=${state.crests.has(3)} wade=${state.hasArt('wade')}`
      + ` crest_3_taken=${state.hasFlag('crest_3_taken')} at ${pos()}`);
    note(`keeper walked back to ${(top().npcs || []).find((n) => n.data.id === 'tg_keeper')?.actor.tileX},`
      + `${(top().npcs || []).find((n) => n.data.id === 'tg_keeper')?.actor.tileY}`);
    note(`npcs on the sill: ${(top().npcs || []).map((n) => `${n.data.id}@${n.actor.tileX},${n.actor.tileY} vis=${n.actor.visible} facing=${n.actor.facing}`).join(' | ')}`);
    out.push(await d.shoot('tidehall-07-crest', 8, 2));
    note(`hands beaten: ${['tg_hand_a','tg_hand_b','tg_hand_c'].map((id) => id + '=' + state.hasDefeated(id)).join(' ')}`);
    note(`out by the sill stair: ${await goTo(sillStair.x, sillStair.y, 'sill stair')} -> ${map()} at ${pos()}`);
    out.push(await d.shoot('tidehall-08-back-in-the-lobby', 8, 1));
  }
} else {
  note('north sluice never opened -- stopping before the sill');
}

return { log, probe: d.probe(), out };
