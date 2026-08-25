// Act 2's story spine, played rather than described.
//
// Four beats in order: the Meridian convoy on Eastwind Ridge, Tarin on the
// crest, Cassian Veyl speaking in public in Tideglass, and the night on the
// coast road where Meridian try to take the Tideheart and Lyra walks into it.
//
//   node tools/serve.js                            # if nothing is on 5173
//   npx electron tools/capture.cjs tools/shots/act2beats.js
//
// STEERED BY STATE, NOT BY TILES, in the sense act1.js means it: every walk is
// a breadth-first search over the map's own collision, and every destination is
// read off the map at runtime -- a warp's own coordinates, an NPC's own tile --
// so the coast can be rebuilt underneath this without it becoming a picture of
// a wall. Where it cannot get somewhere it says where it stopped.
//
// EVERY MAP IS LOADED EXACTLY ONCE PER BEAT. The first draft of this driver
// "probed" a map by loading it to read its warps and then loaded it again to
// play on it, and reported that none of the beats fired -- because 'enter'
// scripts fire on map load, so the probe had already played the scene into a
// scene object that was thrown away a moment later. Anything this needs to know
// about a map before standing on it is read out of the JSON on disk instead.
//
// The Meridian agents are real battles, played with the same novice AI the
// simulator uses, on a party deliberately overpowered for them: the point of
// this run is to see the SCENE through, not to re-measure a number that
// tests/helpers/simulate.mjs has already measured.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
const log = [];
const note = (s) => { log.push(s); };
const world = () => d.game.scenes.find('overworld') || top();
const flag = (f) => !!world().state?.hasFlag?.(f);

/** A map's JSON, straight off disk -- never by loading it. */
const mapJson = async (id) => {
  try {
    const r = await fetch('/data/maps/' + id + '.json');
    return r.ok ? await r.json() : null;
  } catch { return null; }
};

/** Everyone standing on the live map, including anyone a script spawned. */
const actors = () => (world().npcs || []).map((n) => n.data);

/* ------------------------------------------------------------- pathfinding */

const route = (map, sx, sy, tx, ty, blocked = new Set()) => {
  const key = (x, y) => `${x},${y}`;
  const npcAt = new Set((world().npcs || [])
    .map((n) => `${n.actor ? n.actor.tileX : n.data.x},${n.actor ? n.actor.tileY : n.data.y}`));
  // Collision 0 only. '!== 1' looks like the same test and is not: shallow
  // water is 2 and deep water is 8, so on a harbour city that BFS happily
  // plots a route straight across the bay and the driver then reports that
  // Cassian could not be reached. Ledges and everything else that needs a
  // field art are excluded for the same reason -- conservative pathing finds
  // a longer way round; optimistic pathing finds a wall.
  const open = (x, y) => map.inBounds(x, y) && map.collisionAt(x, y) === 0
    && !blocked.has(key(x, y)) && !(npcAt.has(key(x, y)) && !(x === tx && y === ty));
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

const here = () => (d.probe().pos || '-1,-1').split(',').map(Number);

/**
 * Walk to a tile, re-planning whenever a step does not land.
 *
 * The first version planned once and then trusted the plan, which on a city
 * with people standing in the streets means the player walks into a docker and
 * stays there for forty presses -- and the driver then reports that Cassian
 * could not be reached, which is a lie about the game. Every step is checked;
 * a step that does not move the player re-plans with that tile treated as a
 * wall, so a crowd is walked around rather than walked into.
 */
const goTo = async (tx, ty, tries = 24) => {
  const blocked = new Set();
  for (let attempt = 0; attempt < tries; attempt++) {
    if (top().name !== 'overworld') return false;
    let [x, y] = here();
    if (x === tx && y === ty) return true;
    const steps = route(top().map, x, y, tx, ty, blocked);
    if (!steps) return false;
    let moved = true;
    for (const k of steps) {
      // 16 frames, not 12. A walk is 15 frames a tile, so a 12-frame hold
      // lands the step only when the two-tick settle happens to cover it --
      // and a step that silently did not happen gets its tile blacklisted
      // below, which is how a perfectly walkable street turns into a wall
      // forty tiles later. Retried once before it is believed, for the same
      // reason.
      const before = here();
      d.hold(k, 16);
      d.tick(2);
      if (top().name !== 'overworld') return false;   // a scene fired mid-walk
      let after = here();
      if (after[0] === before[0] && after[1] === before[1]) {
        d.hold(k, 20);
        d.tick(3);
        if (top().name !== 'overworld') return false;
        after = here();
      }
      if (after[0] === before[0] && after[1] === before[1]) {
        const step = { KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0] }[k];
        blocked.add(`${before[0] + step[0]},${before[1] + step[1]}`);
        moved = false;
        break;
      }
    }
    if (moved) {
      const [ax, ay] = here();
      if (ax === tx && ay === ty) return true;
    }
  }
  const [x, y] = here();
  return x === tx && y === ty;
};

/**
 * Walk up to somebody and face them, from whichever side is reachable.
 *
 * Two passes, because a route on a real map goes past trainers: the first pass
 * can be interrupted by somebody's line of sight, and reporting "could not
 * reach Tarin" when what happened was a battle on the way is exactly the kind
 * of false failure that gets a working scene reported as broken.
 */
const approach = async (npc) => {
  for (let pass = 0; pass < 2; pass++) {
    for (const [dx, dy, face] of [[-1, 0, 'KeyD'], [0, 1, 'KeyW'], [0, -1, 'KeyS'], [1, 0, 'KeyA']]) {
      if (await goTo(npc.x + dx, npc.y + dy)) { d.hold(face, 6); return true; }
      if (top().name !== 'overworld') await play();
    }
  }
  return false;
};

/**
 * Stand next to somebody without walking there.
 *
 * The fallback, and it is reported as one. A half-built route can be genuinely
 * unwalkable in the middle of the day it is being built, and a scene that is
 * fine should not be reported as broken because the ground under it is not
 * finished yet. So: try to walk (above), and if that fails, place the player
 * and say so, which tests the SCENE and leaves the ROUTE as the open question.
 */
const standBeside = (npc) => {
  const sc = world();
  for (const [dx, dy, facing] of [[0, 1, 'up'], [-1, 0, 'right'], [1, 0, 'left'], [0, -1, 'down']]) {
    const x = npc.x + dx, y = npc.y + dy;
    if (!sc.map.inBounds(x, y) || sc.map.collisionAt(x, y) !== 0) continue;
    sc.player.setTile(x, y);
    sc.player.facing = facing;
    sc.lastTile = { x, y };
    d.tick(4);
    return true;
  }
  return false;
};

/* ------------------------------------------ pressing through a whole beat */

let ai = null;

const fight = () => {
  const scene = top();
  for (let i = 0; i < 1500 && scene.battle && !scene.battle.over; i++) {
    if (top() !== scene) { d.key('Enter', 6); continue; }
    if (scene.phase === 'menu') {
      const act = ai.choose(scene.battle, 'player');
      const best = act.kind === 'move' ? act.index : 0;
      d.key('Enter', 6);
      for (let k = 0; k < best; k++) d.key('KeyS', 4);
      d.key('Enter', 6);
    } else {
      d.key('Enter', 6);
    }
  }
  note(`    [battle: ${scene.battle ? scene.battle.result : 'none'}]`);
  for (let i = 0; i < 80 && top() === scene; i++) d.key('Enter', 6);
};

/**
 * Press through a beat, recording each box once.
 *
 * A beat is not over when a box closes -- an event can wait, shake, fade, run a
 * battle and open another box -- so this only gives up after several quiet
 * passes, and it hands a battle to fight() rather than mashing Enter at it.
 */
const play = async (max = 500, shots = []) => {
  let quiet = 0;
  let last = null;
  let boxes = 0;
  for (let i = 0; i < max && quiet < 14; i++) {
    const name = top().name;
    if (name === 'battle') { quiet = 0; fight(); continue; }
    if (name === 'dialogue') {
      quiet = 0;
      d.tick(50);
      const p = d.probe();
      if (p.text && p.text !== last) {
        note('    ' + p.text);
        last = p.text;
        boxes++;
        // Photographed mid-scene on purpose: a shot taken after the beat has
        // finished is a picture of an empty street, because the scene's last
        // act is to take its actors off again.
        for (const sh of shots) if (sh.at === boxes) out.push(await d.shoot(sh.name, 6, 1));
      }
      d.key('Enter', 8);
      continue;
    }
    quiet++;
    d.tick(14);
  }
  d.tick(8);
};

/* ------------------------------------------------------------------- boot */

// The harness installs itself as soon as the first assets land, which can be
// before the scene stack has anything on it at all. Waiting on the stack rather
// than on a fixed number of milliseconds is the difference between this driver
// running and this driver reporting "cannot read properties of undefined".
await d.loadWait(1400);
for (let i = 0; i < 400 && !top(); i++) { d.tick(4); await d.sleep(20); }
if (!top()) return { log: ['the game never put a scene on the stack'], out: [] };

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
for (let i = 0; i < 24 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const kinMod = await import('/build/js/systems/kin.js');
const reg = await import('/build/js/data/registry.js');
const { TrainerAI } = await import('/build/js/battle/ai.js');
ai = new TrainerAI('novice', d.game.rng);
const Overworld = top().constructor;
const state = top().state;

d.game.settings.battleSpeed = 'brisk';
d.game.settings.useSystemClock = false;
d.game.settings.fixedTime = 'day';

/** Where the player really is by Act 2: a party, two Crests, the keepsake. */
state.party.length = 0;
for (const [sp, lv] of [['blazelynx', 26], ['gullswift', 24], ['burrowen', 24]]) {
  state.party.push(kinMod.createKin(sp, lv, d.game.rng, { originalTrainer: 'player' }));
}
state.giveItem('tideheart', 1);
state.setFlag('tideheart_given');
state.setFlag('got_starter');
state.setFlag('starter_cinderpaw');
state.giveCrest(1, 'Bell Crest');
state.giveCrest(2, 'Quarry Crest');
state.setFlag('crest_1_taken');
state.setFlag('crest_2_taken');

const at = async (mapId, x, y, facing = 'down') => {
  d.game.scenes.replaceAll(new Overworld(state, mapId, x, y, facing));
  await d.loadWait(1400);
};

/** The tile on `json` that a warp from `fromMap` stands on, one step inside. */
const seamOf = (json, fromMap, dx = 0, dy = 0) => {
  const w = (json.warps || []).find((k) => k.toMap === fromMap);
  return w ? { x: w.x + dx, y: w.y + dy } : null;
};

/** Which id the harbour city landed on. */
const cityId = (await mapJson('tideglass')) ? 'tideglass' : 'brackwater';


/* ------------------------------------------- 1. the convoy on the ridge */

note('BEAT 1 -- Eastwind Ridge, Meridian moving east');
{
  const json = await mapJson('route_3');
  const seam = seamOf(json, 'stonewake', 1, 0) || { x: 1, y: 1 };
  await at('route_3', seam.x, seam.y, 'right');
  note(`  entered route_3 (${world().map.name}) at ${world().player.tileX},${world().player.tileY}`);
  await play();
  note(`  ridge_convoy_seen=${flag('ridge_convoy_seen')}`);
  out.push(await d.shoot('act2-01-ridge', 8, 1));
}

/* --------------------------------------------------- 2. Tarin on the crest */

note('BEAT 2 -- Tarin on the ridge');
{
  note(`  ledger: at_ridge=${flag('tarin_at_ridge')} even=${flag('tarin_even')} holds_2=${flag('tarin_holds_2')}`);
  const tarin = actors().find((n) => n.id === 'town_tarin');
  if (!tarin) note('  no town_tarin on route_3 -- the ridge has not placed him');
  else {
    let ok = await approach(tarin);
    if (ok) note(`  approach town_tarin(${tarin.x},${tarin.y}): walked, at ${world().player.tileX},${world().player.tileY}`);
    else {
      const stopped = d.probe().pos;
      ok = standBeside(tarin);
      note(`  approach town_tarin(${tarin.x},${tarin.y}): COULD NOT WALK THERE from the`
        + ` Stonewake seam (stopped at ${stopped}) -- ${ok ? 'placed beside him instead' : 'no open tile beside him'}`);
    }
    if (ok) {
      // Pressed more than once on purpose: a press can be swallowed while the
      // overworld is still settling after a placement or a battle, and one
      // silent miss reads as "the scene does not fire".
      for (let i = 0; i < 5 && !flag('tarin_ridge_done'); i++) {
        d.key('Enter', 20);
        await play(500, [{ name: 'act2-02-tarin-ridge', at: 2 }, { name: 'act2-02-tarin-ridge-gift', at: 6 }]);
      }
      note(`  tarin_ridge_done=${flag('tarin_ridge_done')} great potions=${state.itemCount('great_potion')}`);
    }
  }
}

/* ------------------------------- 2b. the second convoy, on the way back over */

note('BEAT 2b -- crossing the ridge again');
{
  const json = await mapJson('route_3');
  const seam = seamOf(json, 'stonewake', 1, 0) || { x: 1, y: 1 };
  await at('route_3', seam.x, seam.y, 'right');
  await play();
  note(`  ridge_convoy_seen_2=${flag('ridge_convoy_seen_2')}`);
}

/* ------------------------------------------------- 3. Cassian, in public */

note('BEAT 3 -- Tideglass, Dr. Veyl in public');
{
  const json = await mapJson(cityId);
  const seam = seamOf(json, 'route_4', 0, 1) || { x: 1, y: 1 };
  await at(cityId, seam.x, seam.y, 'down');
  note(`  entered ${cityId} (${world().map.name}) at ${world().player.tileX},${world().player.tileY}`);
  await play();
  note(`  tideglass_arrived=${flag('tideglass_arrived')}`);
  out.push(await d.shoot('act2-03-wharf', 8, 1));

  const veyl = actors().find((n) => n.id === 'tg_cassian');
  if (!veyl) note('  tg_cassian is nowhere on the map -- neither placed nor spawned');
  else {
    const ok = await approach(veyl);
    note(`  approach tg_cassian(${veyl.x},${veyl.y}): ${ok ? 'ok' : 'could not reach'} at ${world().player.tileX},${world().player.tileY}`);
    if (ok) {
      d.key('Enter', 20);
      await play(500, [{ name: 'act2-04-veyl-speech', at: 2 }, { name: 'act2-04-veyl-father', at: 12 }]);
      note(`  cassian_public_done=${flag('cassian_public_done')} tideheart_named=${flag('tideheart_named')}`);
      note(`  the bag now calls it: "${reg.registry.itemName('tideheart')}"`);
    }
  }
  if (!flag('cassian_public_done')) {
    note('  !! forcing cassian_public_done so the night beat can still be judged');
    state.setFlag('cassian_public_done');
    state.setFlag('tideheart_named');
  }
}

/* ----------------------------------------------- 4. the night on the road */

note('BEAT 4 -- the coast road, after dark');
{
  state.giveCrest(3, 'Tide Crest');
  state.setFlag('crest_3_taken');
  d.game.settings.fixedTime = 'night';
  const json = await mapJson('route_4');
  const seam = seamOf(json, cityId, 0, -1) || seamOf(json, 'brackwater', 0, -1);
  if (!seam) note('  route_4 has no seam back to the harbour city');
  else {
    await at('route_4', seam.x, seam.y, 'up');
    note(`  on the coast road at ${d.probe().pos}, walking north out of the city`);
    for (let i = 0; i < 14 && top().name === 'overworld' && !flag('night_attempt_done'); i++) {
      d.hold('KeyW', 16);
      d.tick(4);
      if (top().name === 'battle') fight();
    }
    await play(700, [{ name: 'act2-05-night-agents', at: 4 }, { name: 'act2-05-night-lyra', at: 20 }]);
    note(`  night_attempt_done=${flag('night_attempt_done')} lyra_doubt=${flag('lyra_doubt')}`
      + ` echo=${flag('tideheart_echo_glass_quay')} dusk vessels=${state.itemCount('dusk_vessel')}`);
    out.push(await d.shoot('act2-05-night-empty', 8, 1));
  }
  d.game.settings.fixedTime = 'day';
}

/* ------------------------------------------- 5. Tarin, after the north road */

note('BEAT 5 -- Tarin, afterwards');
state.party.forEach((k) => { k.currentHp = k.maxHp; k.status = null; });
{
  const json = await mapJson(cityId);
  const seam = seamOf(json, 'route_4', 0, 1) || { x: 1, y: 1 };
  await at(cityId, seam.x, seam.y, 'down');
  await play();
  note(`  ledger: at_nightafter=${flag('tarin_at_nightafter')} holds_3=${flag('tarin_holds_3')}`);
  const tarin = actors().find((n) => n.id === 'town_tarin');
  if (!tarin) note('  town_tarin did not appear in the city');
  else {
    const ok = await approach(tarin);
    note(`  approach town_tarin(${tarin.x},${tarin.y}): ${ok ? 'ok' : 'could not reach'}`);
    if (ok) {
      d.key('Enter', 20);
      await play(700, [{ name: 'act2-06-tarin-after', at: 2 }, { name: 'act2-06-tarin-fight', at: 8 }]);
      note(`  tarin_tideglass_talked=${flag('tarin_tideglass_talked')} done=${flag('tarin_tideglass_done')}`);
    }
  }
}

/* ------------------------------------ 5b. what the town says about him now */

note('BEAT 5b -- the world talking about Tarin');
{
  const crier = actors().find((n) => n.id === 'tg_crier');
  if (!crier) note('  no tg_crier in the city');
  else {
    const ok = await approach(crier) || standBeside(crier);
    note(`  approach tg_crier(${crier.x},${crier.y}): ${ok ? 'ok' : 'could not reach'}`);
    if (ok) { d.key('Enter', 20); await play(200); }
  }
}

/* -------------------------------------------- 6. Lyra, still inside Meridian */

note('BEAT 6 -- Lyra, afterwards');
{
  const lyra = actors().find((n) => n.id === 'tg_lyra');
  if (!lyra) note('  tg_lyra is not on the map (she needs requiresFlag "lyra_doubt")');
  else {
    const ok = await approach(lyra) || standBeside(lyra);
    note(`  approach tg_lyra(${lyra.x},${lyra.y}): ${ok ? 'ok' : 'could not reach'}`);
    if (ok) {
      d.key('Enter', 20);
      await play(400, [{ name: 'act2-07-lyra-after', at: 3 }]);
      note(`  lyra_thread=${flag('lyra_thread')}`);
      // Once more: the scene runs one time and then hands back to the city's
      // own dialogue table, which is the thing that was quietly being eaten.
      d.key('Enter', 20);
      await play(120);
    }
  }
}

return { log, out, probe: d.probe() };
