// The four Summit Master chambers, walked rather than teleported, and one of
// them fought end to end through its own event script.
//
// Two things have to be seen rather than asserted. FIRST, that each Master is
// really a gate: every chamber's exit door has exactly one walkable neighbour
// and the Master is standing on it, so the driver tries to walk out past each
// of them and the attempt must FAIL before the fight and SUCCEED after it.
// SECOND, that the win path actually runs -- the script sets a flag, removes
// the blocker at runtime (NPC visibility flags are only read in loadMap, so a
// script that sets the flag and stops leaves the player shut in with somebody
// who is no longer there), spawns the after-image and hands over an item.
//
//   node tools/serve.js
//   npx electron tools/capture.cjs tools/shots/masters.js
const d = window.dev;
const top = () => d.game.scenes.top;
const log = [];
const note = (s) => { log.push(s); };

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
  for (;;) {
    const prev = from.get(key(cur[0], cur[1]));
    if (!prev) break;
    steps.unshift(prev[2]);
    cur = [prev[0], prev[1]];
  }
  return steps;
};

/*
 * Walk somewhere, over the map's OWN collision, and be honest about failing.
 *
 * The NPC standing in the doorway is not terrain, so route() will happily plan
 * a path straight through the Master and the walk will simply stop against
 * them. That is the point of this driver: the return value is where the player
 * actually ended up, not where the search thought they could get to.
 */
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

const clear = () => { for (let i = 0; i < 80 && top().name === 'dialogue'; i++) d.key('Enter', 8); d.tick(4); };

/** Page through a conversation, answering the first question yes or no. */
const answer = (yes) => {
  let answered = false;
  for (let i = 0; i < 120 && top().name === 'dialogue'; i++) {
    const t = top();
    if (t.choosing && !answered) {
      if (!yes) d.key('KeyS', 4);
      d.key('Enter', 10);
      answered = true;
      continue;
    }
    d.key('Enter', 8);
  }
  d.tick(4);
  return answered;
};

await d.loadWait(1400);
for (let i = 0; i < 90 && top().name !== 'title'; i++) d.key('Enter', 10);
if (top().name === 'title' && top().menu) { top().menu.index = 0; d.key('Enter', 24); }
for (let i = 0; i < 60 && top().name !== 'creator'; i++) d.key('Enter', 10);
for (let i = 0; i < 80; i++) {
  const rows = typeof top().rows === 'function' ? top().rows() : null;
  if (!rows) break;
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1600);
clear();

const kinMod = await import('/build/js/systems/kin.js');
const state = top().state;

try {
  const Overworld = top().constructor;
  for (let i = 1; i <= 8; i++) state.giveCrest(i);
  for (const art of ['clear', 'shoulder', 'kindle', 'wade', 'swim', 'updraft']) state.arts.add(art);
  state.setFlag('got_starter');

  /*
   * The party a team-raiser really walks in with. Level fifty is what the
   * measurement in data/trainers/trainers.json is cut against, and the bench
   * is the strongest ordinary catchables the road has offered by then rather
   * than four more starters.
   */
  const freshParty = () => {
    state.party.length = 0;
    for (const [sp, lv] of [['thornmarch', 50], ['menhir', 49], ['rimehound', 49], ['craglide', 49]]) {
      state.addKin(kinMod.createKin(sp, lv, d.game.rng, { originalTrainer: 'player' }));
    }
  };
  freshParty();

  const at = async (map, x, y, facing) => {
    d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing || 'down'));
    await d.loadWait(1100);
    clear();
  };

  const CHAMBERS = [
    { map: 'summit_master_power', name: 'power', inAt: [9, 13], talkFrom: [9, 2], door: [9, 0], flag: 'master_power_beaten' },
    { map: 'summit_master_control', name: 'control', inAt: [9, 13], talkFrom: [9, 2], door: [9, 0], flag: 'master_control_beaten' },
    { map: 'summit_master_adapt', name: 'adapt', inAt: [9, 15], talkFrom: [9, 2], door: [9, 0], flag: 'master_adapt_beaten' },
    { map: 'summit_master_bonds', name: 'bonds', inAt: [6, 9], talkFrom: [6, 2], door: [6, 0], flag: 'master_bonds_beaten' },
  ];

  /* ------------------------------------- 1. every chamber, shut, as arrived */

  let n = 0;
  for (const c of CHAMBERS) {
    n++;
    await at(c.map, c.inAt[0], c.inAt[1], 'up');
    note(`${c.name}: arrived ${d.probe().map} at ${d.probe().pos}`);
    await d.shoot(`masters-${n}a-${c.name}-room`, 8, 1);

    // The gate. This must fail while the Master is still standing in it.
    const out = await goTo(c.door[0], c.door[1]);
    note(`${c.name}: door reachable before the fight = ${out} (want false), map=${d.probe().map}`);
    if (d.probe().map !== c.map) { await at(c.map, c.inAt[0], c.inAt[1], 'up'); }

    // Talk, read the philosophy, decline.
    await goTo(c.talkFrom[0], c.talkFrom[1]);
    d.hold('KeyW', 6);
    d.key('Enter', 14);
    note(`${c.name}: opening = ${(d.probe().text || '(nothing)')}`);
    await d.shoot(`masters-${n}b-${c.name}-intro`, 8, 1);
    const asked = answer(false);
    note(`${c.name}: reached the question = ${asked}`);
  }

  /* ---------------------------- 2. the Master of Bonds, fought for real */

  freshParty();
  d.game.settings.battleSpeed = 'brisk';
  for (const f of ['master_power_beaten', 'master_control_beaten', 'master_adapt_beaten']) state.setFlag(f);
  await at('summit_master_bonds', 6, 9, 'up');
  await d.shoot('masters-5-bonds-pip', 8, 1);

  const { TrainerAI } = await import('/build/js/battle/ai.js');
  const you = new TrainerAI('novice', d.game.rng);
  let shotIntro = false;
  let result = '(never started)';

  /*
   * Fight her until the win path runs, up to four goes.
   *
   * This is not padding the result: the loss branch is `continue` and it is
   * meant to be retried from the same tile with the heal in it, so looping
   * here tests the thing the chamber is FOR. The per-fight rate is measured
   * properly in tools/shots/mastersfight.js and in the harness; what this
   * loop has to prove is that losing leaves the conversation usable and that
   * winning really sets the flag, hands the item over and takes the blocker
   * off the door at runtime.
   */
  for (let attempt = 1; attempt <= 4 && !state.hasFlag('master_bonds_beaten'); attempt++) {
  await goTo(6, 2);
  d.hold('KeyW', 6);
  d.key('Enter', 14);
  answer(true);
  let post = 0;
  note('attempt ' + attempt + ': party at full = '
    + state.party.every((k) => k.currentHp === k.maxHp));

  // The fight arrives on top of the event, so drive whichever scene is up.
  for (let i = 0; i < 4000; i++) {
    const t = top();
    if (t.name === 'battle') {
      if (!shotIntro) { shotIntro = true; await d.shoot('masters-6-bonds-fight', 20, 1); }
      if (t.battle && t.battle.over) { result = t.battle.result; d.key('Enter', 6); continue; }
      // Set the cursor rather than walking it: a KeyS swallowed by the
      // animation queue silently fires move slot 0 and turns a fight the
      // simulator wins nine times in ten into a loss on screen.
      if (t.phase === 'menu') { t.actionMenu.index = 0; d.key('Enter', 6); continue; }
      if (t.phase === 'moves' && t.battle) {
        const act = you.choose(t.battle, 'player');
        let best = act.kind === 'move' ? act.index : 0;
        const items = t.moveMenu.items || [];
        if (!items[best] || items[best].enabled === false) best = items.findIndex((it) => it.enabled !== false);
        t.moveMenu.index = Math.max(0, best);
        d.key('Enter', 6);
        continue;
      }
      d.key('Enter', 6);
      continue;
    }
    if (t.name === 'dialogue') { d.key('Enter', 6); continue; }
    /*
     * Do not break the moment the overworld is on top again.
     *
     * The win script is still running there -- setFlag, giveItem, removeNpc
     * all come AFTER the battle -- and the overworld is the top scene in the
     * gaps between its dialogue boxes. Breaking on the first gap reported a
     * won fight with the flag still unset, which is a driver that lies about
     * the game in the most expensive possible direction.
     */
    if (t.name === 'overworld' && shotIntro) { if (++post > 150) break; d.key('Enter', 6); continue; }
    d.key('Enter', 6);
  }
  d.tick(20);
  note('attempt ' + attempt + ': ' + result + ', beaten = ' + state.hasFlag('master_bonds_beaten'));
  }
  note('bonds fight result = ' + result);
  note('master_bonds_beaten = ' + state.hasFlag('master_bonds_beaten')
    + ', summit_masters_done = ' + state.hasFlag('summit_masters_done'));
  note('full_rouse in bag = ' + (state.itemCount ? state.itemCount('full_rouse') : '?'));
  await d.shoot('masters-7-bonds-after', 12, 1);

  /* --------------------------- 3. the doors, open, all four in one walk */

  for (const f of CHAMBERS) state.setFlag(f.flag);
  await at('summit_master_power', 9, 13, 'up');
  const walk = [];
  for (let i = 0; i < 6; i++) {
    const here = d.probe().map;
    walk.push(here + '@' + d.probe().pos);
    const c = CHAMBERS.find((x) => x.map === here);
    if (!c) break;
    const ok = await goTo(c.door[0], c.door[1]);
    await d.loadWait(1100);
    clear();
    if (!ok && d.probe().map === here) { walk.push('STUCK in ' + here); break; }
  }
  note('walk after the four flags: ' + walk.join(' -> ') + ' -> ' + d.probe().map + '@' + d.probe().pos);
  await d.shoot('masters-8-through', 10, 1);

  // And the four Masters where they stand afterwards.
  let m = 0;
  for (const c of CHAMBERS) {
    m++;
    await at(c.map, c.inAt[0], c.inAt[1], 'up');
    await d.shoot(`masters-9${'abcd'[m - 1]}-${c.name}-after`, 8, 1);
  }

  note('done');
} catch (e) {
  note('THREW: ' + (e && e.message) + ' | ' + (e && e.stack || '').split('\n').slice(0, 3).join(' | '));
}
return { log };
