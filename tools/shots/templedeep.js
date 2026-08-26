// The Temple of the Deep: the ocean platform and the flooded ruins, played
// rather than photographed.
//
//   node tools/serve.js
//   npx electron tools/capture.cjs tools/shots/templedeep.js
//
// Steers by the map's own collision, exactly like tools/shots/act1.js and
// tools/shots/sanctum.js, because a driver that walks into a wall and reports a
// missing feature is worse than no driver. Nothing below names a coordinate
// that was not read out of the map file: every route is a breadth-first search
// over `map.collisionAt`, every warp is found by asking the map where its warps
// go, and every NPC is found by id in the scene's own list.
//
// The BFS knows what the player knows: floor, tall grass and shallow water are
// walkable (Wade has been in the bag since Act 2), deep water is walkable only
// once `swim` is in the art set, and a tile with a person standing on it is
// solid.

const d = window.dev;
const top = () => d.game.scenes.top;
const log = [];
const note = (s) => { log.push(s); console.log('- ' + s); };
const flag = (f) => !!top().state?.hasFlag?.(f);

/* --------------------------------------------------------------- boot */

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
for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 8);

const kin = await import('/build/js/systems/kin.js');
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;
const { TrainerAI } = await import('/build/js/battle/ai.js');

// Eight Crests, every art the game has handed out so far, and a party chosen to
// be OVERWHELMING rather than typical.
//
// That is deliberate and it is the opposite of what the difficulty work wants.
// A driver exists to prove that rooms walk, scripts fire, warps land and signs
// read; the moment it loses a fight it whites out, and every line it prints
// after that says "not on this map" when the truth is "lost a battle two rooms
// ago". The first cut of this ran a level-45 Flame lead -- which is exactly the
// party the encounter tables are cut against -- lost three fights on the deck
// and reported the entire flooded ruins as missing. How hard these seven
// Meridian actually are is measured properly, at the real levels, with the real
// novice AI, in tests/helpers/simulate.mjs; the numbers are in the $comment on
// every one of them in data/trainers/trainers.json.
//
// NOT swim: the lower temple grants that, and this driver has to see the nave
// the way a first-time player sees it. NOT the Tideheart either -- Meridian
// have it and keep it until the chamber three floors below this one.
const state = top().state;
state.party.length = 0;
for (const [sp, lv] of [['maelstrix', 58], ['thornmarch', 58], ['galecrest', 58], ['menhir', 58]]) {
  state.party.push(kin.createKin(sp, lv, d.game.rng, { originalTrainer: 'player' }));
}
for (let n = 1; n <= 8; n++) state.giveCrest(n);
for (const a of ['clear', 'shoulder', 'kindle', 'wade', 'updraft']) state.giveArt(a);
state.setFlag('tideheart_taken');
state.setFlag('act4_done');

/* ------------------------------------------------------- walking about */

const clearBox = () => {
  for (let i = 0; i < 250 && top().name === 'dialogue'; i++) d.key('Enter', 6);
  d.tick(4);
};

let autoBattle = async () => {};

const settle = async (tries = 150) => {
  let quiet = 0;
  for (let i = 0; i < tries; i++) {
    if (top().name === 'battle') { quiet = 0; await autoBattle('unplanned'); continue; }
    if (top().name === 'dialogue') { quiet = 0; d.key('Enter', 6); await d.sleep(10); continue; }
    if (top().name === 'overworld' && top().map && !top().busy && !top().events?.running) {
      if (++quiet >= 6) { d.tick(6); return true; }
    } else quiet = 0;
    await d.sleep(70);
    d.tick(8);
  }
  note('settle: gave up, scene=' + top().name + ' map=' + (top().map && top().map.id));
  return false;
};

const live = () => top().name === 'overworld' && !!top().map;

const solid = (x, y) => {
  const s = top();
  const map = s.map;
  if (!map || !map.inBounds(x, y)) return true;
  const c = map.collisionAt(x, y);
  const canSwim = !!s.state?.hasArt?.('swim');
  if (c === 8) return !canSwim;
  if (c !== 0 && c !== 6 && c !== 2) return true;
  if ((s.npcs || []).some((n) => n.actor.tileX === x && n.actor.tileY === y)) return true;
  return false;
};

// A warp is a hole in the floor as far as this driver is concerned. Routing
// THROUGH one is how one run of this walked over to the boat crew, took a step
// too many down the pontoon, left the island by the door it was meant to be
// testing, and then reported the whole platform as missing. Warps get used
// deliberately, by being named as a target, and are never stepped on by
// accident on the way to somewhere else.
const isWarp = (x, y) => {
  const map = top().map;
  return !!(map && map.warpAt && map.warpAt(x, y));
};

const route = (sx, sy, tx, ty) => {
  const key = (x, y) => `${x},${y}`;
  const from = new Map([[key(sx, sy), null]]);
  const q = [[sx, sy]];
  let found = false;
  while (q.length) {
    const [x, y] = q.shift();
    if (x === tx && y === ty) { found = true; break; }
    for (const [dx, dy, k] of [[0, -1, 'KeyW'], [0, 1, 'KeyS'], [-1, 0, 'KeyA'], [1, 0, 'KeyD']]) {
      const nx = x + dx, ny = y + dy;
      if (from.has(key(nx, ny))) continue;
      if ((solid(nx, ny) || isWarp(nx, ny)) && !(nx === tx && ny === ty)) continue;
      from.set(key(nx, ny), [x, y, k]);
      q.push([nx, ny]);
    }
  }
  if (!found && !from.has(key(tx, ty))) return null;
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

const at = () => (d.probe().pos || '0,0').split(',').map(Number);

const goTo = async (tx, ty, label) => {
  for (let attempt = 0; attempt < 8; attempt++) {
    if (!live()) await settle();
    if (!live()) return false;
    const [x, y] = at();
    if (x === tx && y === ty) return true;
    const steps = route(x, y, tx, ty);
    if (!steps) { note(`${label || ''}: NO ROUTE from ${x},${y} to ${tx},${ty} on ${d.probe().map}`); return false; }
    const before = d.probe().map;
    let interrupted = false;
    for (const k of steps) {
      d.hold(k, 12);
      d.tick(2);
      if (top().name === 'overworld' && top().map && top().map.id !== before) return true;
      if (top().name !== 'overworld') {
        await settle();
        if (top().map && top().map.id !== before) return true;
        interrupted = true;
        break;
      }
    }
    if (interrupted) continue;
  }
  const [x, y] = at();
  return x === tx && y === ty;
};

const talkTo = async (id) => {
  if (!live()) await settle();
  if (!live()) { note('talk ' + id + ': no map'); return false; }
  // The LIVE actor, not the map file. A trainer who has challenged on sight has
  // walked away from the tile the map declares, and looking them up in the JSON
  // sends the driver to an empty square and reports "no reachable side".
  const inst = (top().npcs || []).find((m) => m.data && m.data.id === id);
  const n = inst ? { x: inst.actor.tileX, y: inst.actor.tileY }
    : (top().map.npcs || []).find((m) => m.id === id);
  if (!n) { note(`talk ${id}: not on ${d.probe().map}`); return false; }
  const spots = [[n.x, n.y + 1, 'KeyW'], [n.x, n.y - 1, 'KeyS'], [n.x - 1, n.y, 'KeyD'], [n.x + 1, n.y, 'KeyA']];
  for (const [sx, sy, face] of spots) {
    if (solid(sx, sy)) continue;
    if (!(await goTo(sx, sy, 'talk ' + id))) continue;
    d.hold(face, 6);
    d.key('Enter', 10);
    if (top().name === 'battle') { await autoBattle('sight ' + id); return true; }
    if (top().name === 'dialogue') {
      const first = d.probe().text;
      clearBox();
      note(`talk ${id}: "${(first || '').slice(0, 70)}"`);
      return true;
    }
  }
  note(`talk ${id}: no reachable side`);
  return false;
};

/** Read a sign by standing next to it and facing it. */
const readSign = async (sx, sy, label) => {
  if (!live()) await settle();
  const spots = [[sx, sy + 1, 'KeyW'], [sx, sy - 1, 'KeyS'], [sx - 1, sy, 'KeyD'], [sx + 1, sy, 'KeyA']];
  for (const [x, y, face] of spots) {
    if (solid(x, y)) continue;
    if (!(await goTo(x, y, 'sign ' + label))) continue;
    d.hold(face, 6);
    d.key('Enter', 10);
    if (top().name === 'dialogue') {
      const t = d.probe().text;
      clearBox();
      note(`sign ${label}: "${(t || '').slice(0, 70)}"`);
      return true;
    }
  }
  note(`sign ${label} at ${sx},${sy}: unreadable`);
  return false;
};

const fight = async (label) => {
  for (let i = 0; i < 60 && top().name !== 'battle'; i++) { d.key('Enter', 6); d.tick(2); }
  if (top().name !== 'battle') { note(`${label}: no battle started`); return null; }
  d.game.settings.battleSpeed = 'brisk';
  const scene = top();
  const you = new TrainerAI('novice', d.game.rng);
  for (let i = 0; i < 2000 && !scene.battle.over; i++) {
    if (top() !== scene) { d.key('Enter', 6); continue; }
    if (scene.phase === 'menu') {
      const act = you.choose(scene.battle, 'player');
      const best = act.kind === 'move' ? act.index : 0;
      d.key('Enter', 6);
      for (let k = 0; k < best; k++) d.key('KeyS', 4);
      d.key('Enter', 6);
    } else d.key('Enter', 6);
  }
  const result = scene.battle.result;
  for (let i = 0; i < 250 && top().name === 'battle'; i++) d.key('Enter', 6);
  clearBox();
  note(`${label}: ${result}`);
  // Patch the party up between fights. This driver exists to prove the rooms
  // walk, the scripts fire and the seams hold; how hard the fights are is
  // measured properly in tests/helpers/simulate.mjs, and a driver that whites
  // out halfway through reports "map missing" when the truth is "lost a fight".
  state.healParty();
  return result;
};
autoBattle = fight;

const warpOut = (map, x, y, facing) => {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing || 'down'));
};

const shots = [];
const shoot = async (name, ticks) => { shots.push(await d.shoot(name, ticks ?? 8, 1)); };

/* ---------------------------------------------------- the ocean platform */
//
// Entered on the plank the staging platform's own door lands on, not
// teleported into the middle of the deck.

warpOut('temple_deep', 20, 32, 'up');
await settle();
note(`arrived: ${d.probe().map} at ${d.probe().pos}`);
await shoot('td-01-landing', 8);

await goTo(20, 29, 'up onto the deck');
await settle();
note(`stepped onto the deck: td_arrived=${flag('td_arrived')} at ${d.probe().pos}`);
await shoot('td-02-deck', 8);

await talkTo('td_boat_crew');
await readSign(17, 28, 'crate stencil');
await goTo(20, 24, 'the yard');
await shoot('td-03-yard', 8);
await talkTo('td_quartermaster');
await readSign(17, 22, 'submersible');

// The rigger watches the middle of the yard, so the walk north takes him.
await settle();
if (top().name === 'battle') await fight('ostrey (sight)');
await talkTo('td_yard_ostrey');
await settle();

// The control shelter.
await goTo(20, 19, 'shelter');
await shoot('td-04-shelter', 8);
await talkTo('td_shelter_control');
await talkTo('td_shelter_tech');

// The plant, west across the gantry.
await goTo(10, 18, 'gantry west');
await settle();
if (top().name === 'battle') await fight('vasse (sight)');
await settle();
await shoot('td-05-plant', 8);
await talkTo('td_engineer_ordy');
await readSign(4, 16, 'generators');
note(`plant item taken: ${flag('item_td_plant')}`);
await goTo(7, 20, 'plant item');
await settle();
note(`plant item now: ${flag('item_td_plant')}`);

// The tower deck, east across the other gantry.
await goTo(33, 14, 'tower deck');
await settle();
if (top().name === 'battle') await fight('hale (sight)');
await settle();
await shoot('td-06-towers', 8);
await talkTo('td_tower_clerk');
await readSign(31, 11, 'resonance mast');
await goTo(34, 19, 'tower item');
await settle();
note(`tower item: ${flag('item_td_tower')}`);

// The checkpoint. There is no way north that misses it.
await goTo(20, 16, 'below the fence');
await settle();
await shoot('td-07-checkpoint', 8);
await goTo(19, 15, 'the gate');
await settle(400);
note(`checkpoint: done=${flag('td_checkpoint_done')} at ${d.probe().pos}`);
await shoot('td-08-after-checkpoint', 8);

// The aid post, and the seam at the head of the deck.
await goTo(15, 13, 'the aid post');
await settle();
await talkTo('td_medic');
await settle();
note(`medic met=${flag('td_medic_met')} respawn=${state.respawnMap}:${state.respawnX},${state.respawnY}`);
await goTo(20, 9, 'the seam');
await shoot('td-09-seam', 8);
await readSign(13, 4, 'the cut wall');
await goTo(19, 6, 'the stair head');
await shoot('td-10-stairhead', 8);

/* ------------------------------------------------------ the flooded ruins */

const down = ((top().map && top().map.warps) || []).find((w) => w.toMap === 'temple_deep_ruins');
if (!down) throw new Error('no stair down on ' + d.probe().map);
note(`down warp at ${down.x},${down.y} -> ${down.toMap} ${down.toX},${down.toY}`);
await goTo(down.x, down.y, 'down the stair');
await settle();
note(`ruins: ${d.probe().map} at ${d.probe().pos} entered=${flag('tdr_entered')}`);
await shoot('td-11-ruins-landing', 12);

// The two divers in the doorway.
await goTo(19, 6, 'vestibule');
await settle();
if (top().name === 'battle') await fight('syl or orren (sight)');
await settle();
await shoot('td-12-vestibule', 8);
await talkTo('tdr_camp_wren');
await talkTo('tdr_camp_hand');
await readSign(12, 5, 'catalogue');
await goTo(14, 5, 'camp item');
await settle();
note(`camp item: ${flag('item_tdr_camp')}`);

await talkTo('tdr_gate_syl');
await settle();
await talkTo('tdr_gate_orren');
await settle();

// The processional, and the flooded aisle.
await goTo(19, 13, 'causeway');
await shoot('td-13-processional', 8);
await goTo(8, 15, 'west aisle');
await settle();
note(`aisle item: ${flag('item_tdr_aisle')} at ${d.probe().pos}`);
await shoot('td-14-aisle', 8);
await readSign(9, 13, 'ring in the flood');

// The lip, and the nave.
await goTo(19, 19, 'the lip');
await settle(300);
note(`nave seen=${flag('tdr_nave_seen')} at ${d.probe().pos}`);
await shoot('td-15-nave', 12);
await talkTo('tdr_lip_diver');

// The crossing. No art needed; the drums are dry stone.
await goTo(18, 25, 'across the drums');
await settle();
note(`crossed the nave without swim: at ${d.probe().pos} hasSwim=${state.hasArt('swim')}`);
await shoot('td-16-crossing', 8);

// The ring floor.
await goTo(19, 28, 'ring floor');
await settle(300);
note(`ring seen=${flag('tdr_ring_seen')} at ${d.probe().pos}`);
await shoot('td-17-ringfloor', 12);
await readSign(19, 30, 'meridian ring');
await readSign(10, 30, 'the great ring');
await settle();
if (top().name === 'battle') await fight('bern (sight)');
await talkTo('tdr_ruin_bern');
await settle();

// And down, to somebody else's map.
const deeper = ((top().map && top().map.warps) || []).find((w) => w.toMap === 'temple_deep_tunnels');
if (!deeper) note('no stair down to the tunnels');
if (deeper) {
  note(`descent at ${deeper.x},${deeper.y} -> ${deeper.toMap} ${deeper.toX},${deeper.toY}`);
  await goTo(deeper.x, deeper.y, 'the descent');
  await settle();
  note(`through the seam: ${d.probe().map} at ${d.probe().pos}`);
  await shoot('td-18-into-the-tunnels', 12);
}

/* ------------------------------------------------ the swim-only content */
//
// Granted below in the real game; handed over here so the two deep-water
// rewards on my maps can be proved reachable and proved unreachable without it.

state.giveArt('swim');
warpOut('temple_deep_ruins', 19, 22, 'down');
await settle();
await goTo(11, 23, 'nave islet (swim)');
await settle();
note(`swim islet reached: ${d.probe().pos}`);
await shoot('td-19-swimming', 8);

warpOut('temple_deep', 20, 26, 'down');
await settle();
await goTo(5, 29, 'drowned colonnade (swim)');
await settle();
note(`colonnade: at ${d.probe().pos} item=${flag('item_td_colonnade')}`);
await shoot('td-20-colonnade', 8);

/* ------------------------------------------------------------ the aid post */
//
// Checked last and from a standing start, because the walk up the deck reaches
// her by way of two gantries and a checkpoint and this driver has proved often
// enough that it can lose a tile somewhere in there. 15,13 is the deck plate
// directly below Onwen, read out of the map file, not an arbitrary coordinate.

warpOut('temple_deep', 15, 13, 'up');
await settle();
state.party[0].currentHp = 1;
await talkTo('td_medic');
await settle();
note(`aid post: met=${flag('td_medic_met')} lead hp=${state.party[0].currentHp}/${state.party[0].maxHp}`
  + ` respawn=${state.respawnMap}:${state.respawnX},${state.respawnY}`);
await shoot('td-21-aidpost', 8);

return {
  log,
  shots,
  flags: {
    arrived: flag('td_arrived'),
    checkpoint: flag('td_checkpoint_done'),
    medic: flag('td_medic_met'),
    ruins: flag('tdr_entered'),
    nave: flag('tdr_nave_seen'),
    ring: flag('tdr_ring_seen'),
    items: [
      flag('item_td_plant'), flag('item_td_tower'), flag('item_td_colonnade'),
      flag('item_tdr_camp'), flag('item_tdr_aisle'), flag('item_tdr_drum'),
    ],
  },
  probe: d.probe(),
};
