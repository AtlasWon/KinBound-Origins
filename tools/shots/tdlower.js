// The lower Temple of the Deep, PLAYED rather than photographed.
//
//   node tools/serve.js
//   npx electron tools/capture.cjs tools/shots/tdlower.js
//
// Steers by the map's own collision, like tools/shots/act1.js and
// tools/shots/sanctum.js, because a driver that teleports onto an arbitrary
// tile can drop the player inside solid scenery and then report the room
// broken. Every coordinate below is read out of the map file or off an object;
// the route to it is a breadth-first search over `map.collisionAt`.
//
// The BFS here knows one thing the earlier drivers did not: DEEP WATER IS
// WALKABLE ONCE SWIM IS HELD. That is the whole point of the map it is
// testing -- the first half of the run must NOT be able to cross code 8, and
// the second half must.

const d = window.dev;
const top = () => d.game.scenes.top;
const log = [];
const note = (s) => { log.push(s); console.log('. ' + s); };
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

// A player arriving at the Temple of the Deep: eight Crests, five arts, and
// NOT the Tideheart -- Meridian took it in Act 4 and Cassian does not hand it
// back until the control ring. Party levels from tests/helpers/simulate.mjs
// for a team-raising player leaving Crownspire.
const state = top().state;
state.party.length = 0;
for (const [sp, lv] of [['volcatrix', 45], ['galecrest', 44], ['maelstrix', 44], ['menhir', 44]]) {
  state.party.push(kin.createKin(sp, lv, d.game.rng, { originalTrainer: 'player' }));
}
for (let n = 1; n <= 8; n++) state.giveCrest(n);
for (const a of ['clear', 'shoulder', 'wade', 'kindle', 'updraft']) state.giveArt(a);
state.setFlag('tideheart_given');
state.setFlag('tideheart_named');
state.setFlag('tideheart_taken');
state.setFlag('act4_done');

/* ------------------------------------------------------- walking about */

const clearBoxes = () => {
  for (let i = 0; i < 300 && top().name === 'dialogue'; i++) d.key('Enter', 6);
  d.tick(4);
};

let autoBattle = async () => {};

const settle = async (tries = 160) => {
  let quiet = 0;
  for (let i = 0; i < tries; i++) {
    if (top().name === 'battle') { quiet = 0; await autoBattle('wild'); continue; }
    if (top().name === 'dialogue') { quiet = 0; d.key('Enter', 6); await d.sleep(8); continue; }
    if (top().name === 'overworld' && top().map && !top().busy && !top().events?.running) {
      if (++quiet >= 6) { d.tick(6); return true; }
    } else quiet = 0;
    await d.sleep(60);
    d.tick(8);
  }
  note('settle: gave up, scene=' + top().name);
  return false;
};

const live = () => top().name === 'overworld' && !!top().map;

/** Walkable for THIS player, arts included. Deep water is code 8. */
const solid = (x, y) => {
  const s = top();
  const map = s.map;
  if (!map || !map.inBounds(x, y)) return true;
  const c = map.collisionAt(x, y);
  const ok = c === 0 || c === 6
    || ((c === 2 || c === 7) && (map.freeWade || state.hasArt('wade')))
    || (c === 8 && state.hasArt('swim'));
  if (!ok) return true;
  if ((s.npcs || []).some((n) => n.actor.tileX === x && n.actor.tileY === y)) return true;
  if ((s.boulders || []).some((b) => b.x === x && b.y === y)) return true;
  return false;
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
      if (solid(nx, ny) && !(nx === tx && ny === ty)) continue;
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
  for (let attempt = 0; attempt < 4; attempt++) {
    if (!live()) await settle();
    if (!live()) return false;
    const [x, y] = at();
    if (x === tx && y === ty) return true;
    const steps = route(x, y, tx, ty);
    if (!steps) { note(`${label || ''}: NO ROUTE ${x},${y} -> ${tx},${ty} on ${d.probe().map}`); return false; }
    const before = top().map.id;
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

const fight = async (label) => {
  for (let i = 0; i < 60 && top().name !== 'battle'; i++) { d.key('Enter', 6); d.tick(2); }
  if (top().name !== 'battle') return null;
  d.game.settings.battleSpeed = 'brisk';
  const scene = top();
  const you = new TrainerAI('novice', d.game.rng);
  for (let i = 0; i < 1500 && !scene.battle.over; i++) {
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
  clearBoxes();
  note(`${label}: ${result}`);
  return result;
};
autoBattle = fight;

const warpOut = (map, x, y, facing) => {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing || 'down'));
};

/*
 * THE CLIMAX AND THE NERAVOSS SET PIECE ARE ANOTHER AUTHOR'S, AND THIS DRIVER
 * TURNS THEM OFF.
 *
 * data/events/temple_deep_power.json and data/events/temple_deep_heart.json are
 * written by whoever owns the encounter; both fire the moment the player sets
 * foot on the floor, and both hold the player still for as long as they last.
 * Left running, this pass reports six perfectly walkable tiles as unreachable
 * and photographs a cutscene instead of a room -- which is exactly what an
 * earlier run of it did. Dropping their scripts out of the registry for the
 * photo pass tests MY floors and leaves THEIR scenes to their own driver.
 */
const registry = (await import('/build/js/data/registry.js')).registry;
// Deleting the loaded scripts is not enough: loadMap calls loadScriptsFor,
// which reads the file again and puts them straight back. The manifest is the
// switch -- registry.has('events', id) is what decides whether the file is
// fetched at all -- so the photo pass takes the two maps off it once, up front.
const silenceOthers = () => {
  const mf = registry.manifest ?? registry['manifest'];
  mf.events = mf.events.filter((e) => e !== 'temple_deep_power' && e !== 'temple_deep_heart');
  for (const id of [...registry.scripts.keys()]) {
    if (/^tdp_(enter|start|gate|open|cast|cast_after|fight|retry|aftermath)$/.test(id)) registry.scripts.delete(id);
    if (/^temple_deep_heart_/.test(id)) registry.scripts.delete(id);
  }
};

const shots = [];
const shoot = async (name, ticks) => { shots.push(await d.shoot(name, ticks ?? 8, 1)); };

/* ------------------------------------------------- 1. the drowned approach */
//
// Entered on 14,34 -- the tile temple_deep_ruins' own stair lands the player
// on -- and not teleported into the middle of the water.

warpOut('temple_deep_tunnels', 14, 34, 'up');
await settle();
// Wild encounters off for the geometry pass. This driver exists to prove that
// every tile the design depends on can be REACHED; whether the swim across is
// a fair fight is a different question and belongs to the encounter table's own
// note and to tests/helpers/simulate.mjs. Left on, a run of bad luck turns a
// reachability report into a report about the RNG. One leg below turns them
// back on so the table is proved to fire at all.
const tunnelTable = top().encounters;
top().encounters = undefined;
note(`arrived: ${d.probe().map} at ${d.probe().pos}`);
await shoot('td-01-landing', 8);

// THE GATE. Before Marit, deep water must be shut. Prove it by trying to walk
// to the far end of the nave and failing.
note(`swim before: ${state.hasArt('swim')}`);
const blocked = await goTo(14, 10, 'gate check (should fail)');
note(`crossed the drop without Swim: ${blocked} (want false)`);

// Read the quay sign, then step on the lip and let the scene run.
await goTo(9, 26, 'below the quay');
d.hold('KeyW', 6); d.key('Enter', 10); clearBoxes();
await goTo(14, 25, 'the quay lip');
await settle();
note(`swim after:  ${state.hasArt('swim')}  flag=${flag('tdt_swim_taught')}`);
await shoot('td-02-quay', 8);

// Now swim the nave and collect what is behind the gate.
await goTo(15, 17, 'the dais');
await settle();
await shoot('td-03-nave', 8);
d.key('Enter', 10); clearBoxes();

for (const [x, y, label] of [[3, 16, 'west chapel'], [1, 11, 'west arm'], [26, 21, 'east chapel']]) {
  // Topped up between legs so a wild loss does not white the driver out and
  // send it to the mainland; the point of this pass is the geometry, and the
  // difficulty of the swim is measured in tests/helpers/simulate.mjs instead.
  const ok = await goTo(x, y, label);
  await settle();
  note(`${label}: ${ok ? 'reached' : 'FAILED'} at ${d.probe().pos}`);
}
await shoot('td-04-transept', 8);
const bag = (state.bag ? [...state.bag.keys?.() ?? []] : []);
note(`picked up: full_restore=${flag('item_tdt_west_chapel')} arm=${flag('item_tdt_west_arm')} east=${flag('item_tdt_east_chapel')}`);
void bag;

// Out of the top of the nave into the works.
// Encounters back on for the last leg of the swim, so the table is proved to
// actually fire on deep water rather than merely to exist.
top().encounters = tunnelTable;
await goTo(14, 1, 'north exit');
await settle();
note(`north exit -> ${d.probe().map} at ${d.probe().pos}`);

/* ------------------------------------------------------- 2. the works */

if (d.probe().map !== 'temple_deep_power_stage') warpOut('temple_deep_power_stage', 16, 24, 'up');
await settle();
await shoot('td-05-works', 8);

await goTo(13, 11, 'the fitter');
d.hold('KeyW', 6); d.key('Enter', 10); clearBoxes();
await goTo(13, 8, 'rack two');
d.hold('KeyW', 6); d.key('Enter', 10); clearBoxes();
await shoot('td-06-racks', 8);

// The heal. Party is chipped first so the effect is visible in the probe.
//
// NOTE FOR ANYONE COPYING THIS: a naive `while (top().name === 'dialogue')
// press Enter` loop DOES NOT WORK across a multi-box scene. The event VM drops
// back to the overworld for a frame between boxes, so the loop exits on the
// first gap and reports the scene as never having happened. Everything here
// goes through `settle`, which keeps pressing until the map is quiet.
for (const k of state.party) k.hp = Math.max(1, Math.floor(k.maxHp * 0.3));
const before = state.party.map((k) => k.hp).join('/');
await goTo(7, 15, 'the sick bay');
d.hold('KeyA', 6);
d.key('Enter', 10);
await settle();
note(`heal: ${before} -> ${state.party.map((k) => `${k.hp}/${k.maxHp}`).join(' ')}`);

await goTo(20, 14, 'the cable head');
d.hold('KeyA', 6); d.key('Enter', 10); clearBoxes();
await shoot('td-07-trench', 8);

await goTo(16, 1, 'up to the ring');
await settle();
note(`up -> ${d.probe().map} at ${d.probe().pos}`);

/* -------------------------------------------------- 3. the control ring */

// THE CLIMAX ON THIS DECK IS ANOTHER AUTHOR'S SCENE and it fires on `enter`
// while td_power_done is false. Running it here would mean this driver is
// testing their cutscene rather than my room, and it blocks the player for as
// long as it lasts -- which is how an earlier pass reported four perfectly
// walkable tiles as unreachable. Set the flag first: the room is what is under
// test, and the scene has its own author to run it.
state.setFlag('td_power_done');
silenceOthers();
warpOut('temple_deep_power', 9, 15, 'up');
await settle(200);
await shoot('td-08-ring', 8);
note(`ring: at ${d.probe().pos} td_power_done=${flag('td_power_done')}`);

// Every tile the climax stands somebody on has to be standable.
for (const [x, y, who] of [[10, 7, 'VEYL'], [17, 3, 'KELL'], [12, 10, 'LYRA'], [9, 13, 'TARIN']]) {
  const c = top().map.collisionAt(x, y);
  const ok = await goTo(x, y, 'stage ' + who);
  note(`stage ${who} ${x},${y}: collision=${c} walkable=${ok} (want 0 / true)`);
}
await shoot('td-09-ring-centre', 8);

await goTo(11, 1, 'north of the ring');
await settle();
note(`on -> ${d.probe().map} at ${d.probe().pos}`);

/* ------------------------------------------------- 4. the listening floor */

silenceOthers();
if (d.probe().map !== 'temple_deep_heart') warpOut('temple_deep_heart', 19, 34, 'up');
await settle(400);
note(`chamber: ${d.probe().map} at ${d.probe().pos}`);
await shoot('td-10-chamber-entry', 8);

await goTo(19, 26, 'the apron');
await shoot('td-11-chamber-apron', 8);
await goTo(19, 20, 'the south rim');
await shoot('td-12-chamber-rim', 8);
await goTo(7, 16, 'the west gallery');
await shoot('td-13-chamber-west', 8);
const rimRound = await goTo(31, 16, 'all the way round the rim');
note(`rim walks the whole way round: ${rimRound}`);
await goTo(19, 16, 'out over the middle');
await shoot('td-14-chamber-middle', 8);
note(`middle of the well: at ${d.probe().pos} (want 19,16 -- only reachable with Swim)`);
await goTo(19, 9, 'the cable head');
await shoot('td-15-chamber-cable', 8);

return { log, shots, probe: d.probe(), swim: state.hasArt('swim') };
