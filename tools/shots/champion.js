// The Champion of Caelora, walked rather than teleported, and fought end to
// end through his own event script.
//
// Four things have to be SEEN rather than asserted.
//   1. THE JOIN. summit_master_bonds' top door was written before this room
//      existed and points at summit_champion 6,10. The driver walks out of
//      Nell Oakley's kitchen through that door over the map's own collision,
//      so if the reciprocal is wrong the walk simply does not arrive.
//   2. THE FRAMING. The room is sixteen by eleven and the authored camera is
//      fifteen by ten, so the claim in the map's _plan is that the rail, the
//      cairn, both fires and both people are in one frame from the moment the
//      scene starts. That is a picture, not a number.
//   3. THE FIGHT AND THE LOSS PATH. Six kin, elite AI, and a loss must leave
//      the player standing on a floor with an open door in it, with the fight
//      re-armed on Rook's own NPC and the party put back.
//   4. THE TITLE. `champion` set, championWonAt stamped, the first NPC gone
//      and the second one standing at the west rail after a reload.
//
// TWO HARNESS TRAPS THIS DRIVER EXISTS TO NOT FALL INTO. A scene that opens
// with `face` and `wait` leaves the top scene as the OVERWORLD, busy, for
// half a second before any dialogue appears -- so a loop that tests
// `top().name === 'dialogue'` walks straight through the start of the scene.
// And loadMap is async, so stepping onto a warp needs an `await d.loadWait`
// and not thirty synchronous ticks.
//
//   node tools/serve.js
//   npx electron tools/capture.cjs tools/shots/champion.js
const d = window.dev;
const top = () => d.game.scenes.top;
const log = [];
const note = (s) => { log.push(s); };
const here = () => { const p = d.probe(); return p.map + '@' + p.pos; };

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

/* Walk over the map's own collision and be honest about failing. An NPC is
 * not terrain, so the search will happily plan through Rook and the walk will
 * stop against him; the return value is where the player really ended up. */
const goTo = async (tx, ty) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (top().name !== 'overworld') return false;
    const p = d.probe();
    const [x, y] = (p.pos || '0,0').split(',').map(Number);
    if (x === tx && y === ty) return true;
    const steps = route(x, y, tx, ty);
    if (!steps) return false;
    for (const k of steps) {
      d.hold(k, 12);
      d.tick(2);
      if (top().name !== 'overworld') return true;
      if (top().busy) return true;
      const q = d.probe();
      if (q.map !== p.map) return true;
    }
    await d.loadWait(220);
  }
  const p = d.probe();
  const [x, y] = (p.pos || '0,0').split(',').map(Number);
  return x === tx && y === ty;
};

/**
 * Run whatever scene is up to its end, answering the first question yes or no.
 *
 * `wait` frames leave the overworld on top with busy set, so this ticks
 * through those instead of treating them as "the scene is over".
 */
const play = async (yes, budget = 2000) => {
  let answered = false;
  let idle = 0;
  for (let i = 0; i < budget; i++) {
    const t = top();
    if (t.name === 'dialogue') {
      idle = 0;
      if (t.choosing && !answered) {
        if (!yes) d.key('KeyS', 4);
        d.key('Enter', 12);
        answered = true;
        continue;
      }
      d.key('Enter', 8);
      continue;
    }
    if (t.name === 'battle') return 'battle';
    idle++;
    d.tick(4);
    if (idle > 50) break;
  }
  await d.loadWait(200);
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
await play(true, 200);

const kinMod = await import('/build/js/systems/kin.js');
const state = top().state;

try {
  const Overworld = top().constructor;
  for (let i = 1; i <= 8; i++) state.giveCrest(i);
  for (const art of ['clear', 'shoulder', 'kindle', 'wade', 'swim', 'updraft']) state.arts.add(art);
  state.setFlag('got_starter');
  for (const f of ['master_power_beaten', 'master_control_beaten',
    'master_adapt_beaten', 'master_bonds_beaten', 'summit_masters_done']) state.setFlag(f);
  state.playTime = 41 * 3600 + 17 * 60;

  /*
   * The party a team-raiser really arrives with. Level fifty-six is the honest
   * expectation in the $comment on summit_champion in data/trainers/trainers.json
   * and six is the size that row is measured at, because he has six.
   */
  const freshParty = (lead = 56) => {
    state.party.length = 0;
    for (const [sp, off] of [['thornmarch', 0], ['galecrest', -1], ['rimehound', -1],
      ['craglide', -1], ['tidewrack', -1], ['weaverjaw', -1]]) {
      state.addKin(kinMod.createKin(sp, lead + off, d.game.rng, { originalTrainer: 'player' }));
    }
  };
  freshParty();

  const at = async (map, x, y, facing) => {
    d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing || 'down'));
    await d.loadWait(1100);
    await play(true, 200);
  };

  /* ------------------- 1. the join, walked out of Nell Oakley's kitchen */

  await at('summit_master_bonds', 6, 9, 'up');
  note('start: ' + here());
  await d.shoot('champion-1-kitchen', 8, 1);
  await goTo(6, 0);
  await d.loadWait(1200);
  note('through the top door -> ' + here() + '   (want summit_champion@6,10)');
  await d.shoot('champion-2-arrived', 12, 1);

  /* ------------------- 2. the walk north, and the scene at the band */

  if (d.probe().map !== 'summit_champion') await at('summit_champion', 6, 10, 'up');
  await goTo(6, 7);
  for (let i = 0; i < 400 && top().name !== 'dialogue'; i++) d.tick(4);
  note('band fired at ' + here() + ', scene = ' + top().name);
  note('  box 1: ' + (d.probe().text || '(nothing)'));
  await d.shoot('champion-3-open', 10, 1);
  for (let i = 0; i < 3; i++) { d.key('Enter', 10); for (let k = 0; k < 80 && top().name !== 'dialogue'; k++) d.tick(4); }
  note('  box 4: ' + (d.probe().text || '(nothing)'));
  await d.shoot('champion-4-rook', 10, 1);
  const asked = await play(false);
  note('reached the question and declined = ' + asked + ', sc_seen = ' + state.hasFlag('sc_seen'));
  await d.shoot('champion-5-room', 14, 1);

  /* ------------------- 3. the room, read from the rail, at 1x */

  await goTo(6, 2);
  d.hold('KeyW', 8);
  d.tick(20);
  await d.shoot('champion-6-rail', 14, 1);
  d.key('Enter', 14);
  note('the cairn reads: ' + (d.probe().text || '(nothing)'));
  await play(true, 200);

  /* ------------------- 4. the fight, driven to a finish, as often as it takes
   *
   * It is meant to be about a coin flip at this level with no bag items, so
   * the driver plays it up to four times: what has to be seen is BOTH ends --
   * the loss path putting the party back and re-arming the fight on his own
   * NPC, and the crowning. */

  const { TrainerAI } = await import('/build/js/battle/ai.js');
  const you = new TrainerAI('novice', d.game.rng);
  d.game.settings.battleSpeed = 'brisk';
  let shotIntro = false;
  let shotLoss = false;
  let shotCrown = false;
  let result = '(never started)';
  let attempts = 0;

  const talkToRook = async () => {
    await goTo(6, 5);
    d.hold('KeyW', 6);
    d.key('Enter', 14);
    for (let i = 0; i < 160 && top().name !== 'dialogue'; i++) d.tick(4);
  };

  const fight = async () => {
    let idle = 0;
    for (let i = 0; i < 30000; i++) {
      const t = top();
      if (t.name === 'battle') {
        idle = 0;
        if (!shotIntro) { shotIntro = true; await d.shoot('champion-7-fight', 20, 1); }
        if (t.battle && t.battle.over) { result = t.battle.result; d.key('Enter', 6); continue; }
        if (t.phase === 'menu' && t.battle) {
          const act = you.choose(t.battle, 'player');
          const best = act.kind === 'move' ? act.index : 0;
          d.key('Enter', 6);
          for (let k = 0; k < best; k++) d.key('KeyS', 4);
          d.key('Enter', 6);
        } else {
          d.key('Enter', 6);
        }
        continue;
      }
      if (t.name === 'dialogue') {
        idle = 0;
        if (state.hasFlag('champion') && !shotCrown) { shotCrown = true; await d.shoot('champion-10-crowned', 14, 1); }
        d.key('Enter', 6);
        continue;
      }
      idle++;
      d.tick(4);
      if (idle > 60) break;
    }
    await d.loadWait(300);
  };

  /*
   * ATTEMPT 1 IS THE REAL ONE: level fifty-six, six kin, no bag items, which
   * is the row the $comment on this trainer measures. Anything after it is
   * over-levelled ON PURPOSE and proves nothing about difficulty -- this
   * driver's move picker maps a TrainerAI choice onto a two-by-two menu with
   * KeyS alone and gets the wrong move about half the time, so it plays a
   * long way below the novice it is standing in for. The measured win rates
   * come from tests/helpers/simulate.mjs, which drives Battle directly. What
   * the extra attempts are for is SEEING the crowning.
   */
  while (attempts < 4 && !state.hasFlag('champion')) {
    attempts++;
    freshParty(attempts === 1 ? 56 : 56 + attempts * 8);
    await talkToRook();
    await play(true, 600);
    await fight();
    note('attempt ' + attempts + ': ' + result
      + '   sc_fight_pending = ' + state.hasFlag('sc_fight_pending')
      + ', party alive = ' + state.partyIsAlive
      + ', standing at ' + here());
    if (result !== 'win' && !shotLoss) {
      shotLoss = true;
      await d.shoot('champion-8-loss', 14, 1);
      await talkToRook();
      note('  retry offer: ' + (d.probe().text || '(nothing)'));
      await d.shoot('champion-9-retry', 12, 1);
      await play(false, 400);
    }
  }
  note('champion flag = ' + state.hasFlag('champion')
    + ', state.champion = ' + state.champion
    + ', championWonAt = ' + state.championWonAt
    + '  (playTime ' + state.playTime + ')');
  if (!state.hasFlag('champion')) {
    note('NEVER WON IN FOUR TRIES -- taking the flag by hand so the after-state can be seen.');
    state.setFlag('champion');
  }

  /* ------------------- 5. the room on a reload, once it is over */

  await at('summit_champion', 6, 10, 'up');
  const npcs = (top().npcs || []).map((n) => n.data.id + '@' + n.actor.tileX + ',' + n.actor.tileY);
  note('npcs on reload = ' + (npcs.join(' | ') || '(none)') + '   (want sc_rook_after only)');
  await d.shoot('champion-11-reload', 14, 1);
  await goTo(2, 3);
  d.hold('KeyW', 8);
  d.key('Enter', 14);
  for (let i = 0; i < 120 && top().name !== 'dialogue'; i++) d.tick(4);
  note('after-lines: ' + (d.probe().text || '(nothing)'));
  await d.shoot('champion-12-rook-after', 12, 1);
  await play(true, 300);
  const h = state.header(1, 'The Top');
  note('save header: champion = ' + h.champion + ', crests = ' + h.crests);
  note('done');
} catch (err) {
  note('THREW: ' + (err && err.message) + ' | ' + ((err && err.stack) || '').split('\n').slice(0, 3).join(' | '));
}

return { log };
