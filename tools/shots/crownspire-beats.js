// Act 5 at Crownspire, driven through the beats rather than looked at.
//
// This is the functional test the screenshots cannot be: it stands a player
// with seven Crests and a real party in front of Keeper Ord and runs BOTH
// roads -- the Crest on its own, and the Long Floor -- checking the flags and
// the bag afterwards. It also runs the shut Ascent gate and Tarin's pact, in
// that order, because the pact only opens once the eighth Crest is held.
//
//   npx electron tools/capture.cjs tools/shots/crownspire-beats.js

const d = window.dev;
const top = () => d.game.scenes.top;
const log = [];
const note = (s) => log.push(s);
const key = (x, y) => `${x},${y}`;
const flag = (f) => !!top().state?.hasFlag?.(f);

const route = (sx, sy, tx, ty) => {
  const sc = top();
  const map = sc.map;
  if (!map) return null;
  const blocked = new Set((sc.npcs ?? []).map((n) => key(n.tileX ?? n.data?.x, n.tileY ?? n.data?.y)));
  const open = (x, y) => map.inBounds(x, y) && map.collisionAt(x, y) !== 1 && !blocked.has(key(x, y));
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
  for (let attempt = 0; attempt < 4; attempt++) {
    const p = d.probe();
    if (top().name !== 'overworld') return false;
    const [x, y] = (p.pos || '0,0').split(',').map(Number);
    if (x === tx && y === ty) return true;
    const steps = route(x, y, tx, ty);
    if (!steps) return false;
    for (const k of steps) { d.hold(k, 12); d.tick(2); if (top().name !== 'overworld') return true; }
  }
  const p = d.probe();
  const [x, y] = (p.pos || '0,0').split(',').map(Number);
  return x === tx && y === ty;
};

/**
 * Press through dialogue, taking whichever option the caller asks for, and
 * mash a battle to a finish when one starts.
 *
 * The choice list lives inside DialogueScene rather than in a menu scene, so
 * the cursor is steered by reading the scene's own choosing/choiceIndex
 * fields -- which are private in TypeScript and perfectly ordinary properties
 * at runtime. Blind Enter-pressing always picks option zero, which is how the
 * first pass of this driver "tested" the Long Floor by taking the short road.
 */
const scenes = [];
const talk = async (picks = [], budget = 1200) => {
  const seen = [];
  let pick = 0;
  let idle = 0;
  for (let i = 0; i < budget; i++) {
    const sc = top();
    if (scenes[scenes.length - 1] !== sc.name) scenes.push(sc.name);
    if (sc.name === 'battle') { idle = 0; d.key('Enter', 6); continue; }
    // Do NOT break on the first overworld frame. A choice that ends in a
    // battleTrainer hands control back to the overworld for a few ticks while
    // the battle scene is built, and the first version of this loop left at
    // exactly that moment and reported that no battle had happened.
    if (sc.name !== 'dialogue') {
      idle++; d.tick(4);
      if (idle > 30 && top().name === 'overworld') break;
      continue;
    }
    idle = 0;
    if (sc.choosing) {
      const want = picks[pick++] ?? 0;
      for (let j = 0; j < 8 && sc.choiceIndex !== want; j++) d.key('KeyS', 4);
      d.key('Enter', 8);
      continue;
    }
    const t = d.probe().text;
    if (t && seen[seen.length - 1] !== t) seen.push(t);
    d.key('Enter', 8);
  }
  return seen;
};

await d.loadWait(1400);
d.key('Enter', 20); await d.loadWait(400);
d.key('Enter', 20); await d.loadWait(700);
const state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;
const { createKin } = await import('/build/js/systems/kin.js');
const { Rng } = await import('/build/js/core/rng.js');

/**
 * The party the road really delivers. simulate.mjs puts the team-raiser in
 * front of Ord on L44 with three kin a level behind, so that is what stands
 * here: no cheat levels, so the Long Floor is run as a player would run it.
 */
const stock = (starter) => {
  const rng = new Rng('beats');
  state.party.length = 0;
  for (const [sp, lv] of [[starter, 44], ['mossback', 43], ['gullswift', 43], ['galecrest', 43]]) {
    state.addKin(createKin(sp, lv, rng, { originalTrainer: 'player' }));
  }
  for (let n = 1; n <= 7; n++) state.giveCrest(n);
  state.giveItem('full_restore', 6);
  state.giveItem('full_heal', 6);
};

const enterCrown = async () => {
  d.game.scenes.replaceAll(new Overworld(state, 'crownspire_hall_crown', 7, 6, 'up'));
  await d.loadWait(1200);
};

const results = {};

/* --- 1. the gate that will not open -------------------------------------- */
stock('volcatrix');
d.game.scenes.replaceAll(new Overworld(state, 'crownspire', 47, 7, 'up'));
await d.loadWait(1200);
await goTo(47, 6);
d.hold('KeyW', 4);
d.key('Enter', 10);
const gate = await talk([], 200);
note('ASCENT GATE (7 crests): ' + gate.length + ' boxes; first = ' + (gate[0] ?? 'none'));

/* --- 2. Tarin before the eighth Crest ------------------------------------ */
d.game.scenes.replaceAll(new Overworld(state, 'crownspire', 47, 23, 'up'));
await d.loadWait(1000);
await goTo(47, 23);
d.hold('KeyW', 4);
d.key('Enter', 10);
const tarinPre = await talk([], 300);
note('TARIN (7 crests): ' + tarinPre.length + ' boxes; cs_tarin_met=' + flag('cs_tarin_met'));

/* --- 3. the registrar, and the gate on the Hall -------------------------- */
d.game.scenes.replaceAll(new Overworld(state, 'crownspire_hall', 4, 19, 'up'));
await d.loadWait(1000);
d.hold('KeyW', 4);
d.key('Enter', 10);
const reg = await talk([], 300);
note('REGISTRAR: ' + reg.length + ' boxes; signed=' + flag('cs_hall_signed')
  + ' full_heals=' + state.itemCount('full_heal'));

/* --- 4. the short road: the Crest on its own ----------------------------- */
await enterCrown();
await goTo(7, 4);
d.hold('KeyW', 4);
d.key('Enter', 10);
const crest = await talk([0], 1600);
results.shortRoad = {
  crest8: flag('crest_8_taken'),
  roll: flag('cs_roll_name'),
  boxes: crest.length,
  beatOrd: state.hasDefeated('cs_keeper_ord'),
};
note('SHORT ROAD: ' + JSON.stringify(results.shortRoad));
const shot1 = await d.shoot('csb-01-crest', 8, 1);

/* --- 5. Tarin after the eighth Crest: the pact --------------------------- */
d.game.scenes.replaceAll(new Overworld(state, 'crownspire', 47, 23, 'up'));
await d.loadWait(1000);
d.hold('KeyW', 4);
d.key('Enter', 10);
const pact = await talk([0], 600);
note('TARIN PACT: ' + pact.length + ' boxes; cs_summit_pact=' + flag('cs_summit_pact'));
const shot2 = await d.shoot('csb-02-pact', 8, 1);

/* --- 6. the long road, from a clean player ------------------------------- */
for (const f of ['crest_8_taken', 'cs_roll_name', 'cs_summit_pact', 'cs_tarin_met', 'cs_hall_signed']) {
  state.setFlag(f, false);
}
state.crests.delete(8);
stock('maelstrix');
await enterCrown();
await goTo(7, 4);
d.hold('KeyW', 4);
d.key('Enter', 10);
const long = await talk([1, 0], 4000);
results.longFloor = {
  crest8: flag('crest_8_taken'),
  roll: flag('cs_roll_name'),
  boxes: long.length,
  stewards: ['cs_steward_hollis', 'cs_steward_derrin', 'cs_steward_mabe']
    .map((t) => state.hasDefeated(t)),
  party: state.party.map((k) => `${k.name} ${k.currentHp}/${k.maxHp}`),
};
note('LONG FLOOR: ' + JSON.stringify(results.longFloor));
const shot3 = await d.shoot('csb-03-longfloor', 8, 1);

return { log, results, scenes, out: [shot1, shot2, shot3] };
