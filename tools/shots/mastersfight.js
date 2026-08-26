// The four Summit Masters, fought in the real BattleScene rather than in the
// simulator, to check that the measured win rates in data/trainers/trainers.json
// describe the game and not just tests/helpers/simulate.mjs.
//
// The simulator drives Battle directly. This drives the SCENE -- real menus,
// real animation queue, real send-out order, real per-kin overrides read out of
// the registry -- with the same novice policy the simulator uses on the player
// side, so the two numbers are comparable. Where they disagree the scene is
// right and the row in trainers.json has to be re-read.
//
//   node tools/serve.js
//   npx electron tools/capture.cjs tools/shots/mastersfight.js
const d = window.dev;
const top = () => d.game.scenes.top;
const log = [];

await d.loadWait(1200);
for (let i = 0; i < 90 && top().name !== 'title'; i++) d.key('Enter', 10);
if (top().name === 'title' && top().menu) { top().menu.index = 0; d.key('Enter', 24); }
for (let i = 0; i < 60 && top().name !== 'creator'; i++) d.key('Enter', 10);
for (let i = 0; i < 40; i++) {
  const rows = typeof top().rows === 'function' ? top().rows() : null;
  if (!rows) break;
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1400);
for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const kinMod = await import('/build/js/systems/kin.js');
const battleMod = await import('/build/js/scenes/battle.js');
const { registry } = await import('/build/js/data/registry.js');
const { TrainerAI } = await import('/build/js/battle/ai.js');
const state = top().state;
d.game.settings.battleSpeed = 'brisk';

/*
 * The party the measurement is cut against: the starter line at the level a
 * team-raiser arrives on, and the three strongest ordinary catchables the road
 * has offered by then, one level down. Same shape as the bench in the harness.
 */
const STARTERS = [['thornmarch', 'sprigling'], ['volcatrix', 'cinderpaw'], ['maelstrix', 'rilltail']];
const BENCH = ['menhir', 'rimehound', 'craglide'];
const MASTERS = ['summit_master_power', 'summit_master_control', 'summit_master_adapt', 'summit_master_bonds'];
const LEVEL = 50;
const RUNS = 4;

const fight = async (leadSpecies, trainerId, shotName) => {
  state.party.length = 0;
  state.party.push(kinMod.createKin(leadSpecies, LEVEL, d.game.rng, { originalTrainer: 'player' }));
  for (const b of BENCH) {
    state.party.push(kinMod.createKin(b, LEVEL - 1, d.game.rng, { originalTrainer: 'player' }));
  }
  const t = registry.trainers.get(trainerId);
  const foeParty = t.party.map((m) => kinMod.createKin(m.species, m.level, d.game.rng, {
    moves: m.moves, ability: m.ability, item: m.item, nature: m.nature,
    ivs: m.ivs, evs: m.evs, nickname: m.nickname, originalTrainer: t.name,
  }));
  d.game.scenes.push(new battleMod.BattleScene({
    state, playerParty: state.party, foeParty, isWild: false,
    trainerId, skipIntroLines: true, backdrop: 'indoor', onFinish: () => {},
  }));
  d.tick(2);
  const scene = top();
  const you = new TrainerAI('novice', d.game.rng);
  let desync = 0;
  /*
   * Drive the real menus, but SET the cursor rather than walking it with KeyS.
   * Counting the presses looked more honest and was not: a press is swallowed
   * while the scene is still animating, the driver then silently fires slot 0
   * instead of the move it picked, and the fight reads as far harder than it
   * is. The first pass of this file measured 13 wins in 48 with a mean of
   * thirty-five swallowed presses PER FIGHT, which is a measurement of the
   * driver and not of the game. `desync` now counts a confirm that did not
   * take, which is the thing actually worth knowing.
   */
  for (let i = 0; i < 2500 && !scene.battle.over; i++) {
    if (top() !== scene) { d.key('Enter', 6); continue; }
    if (scene.phase === 'menu') { scene.actionMenu.index = 0; d.key('Enter', 6); continue; }
    if (scene.phase === 'moves') {
      const act = you.choose(scene.battle, 'player');
      let best = act.kind === 'move' ? act.index : 0;
      const items = scene.moveMenu.items || [];
      if (!items[best] || items[best].enabled === false) best = items.findIndex((it) => it.enabled !== false);
      scene.moveMenu.index = Math.max(0, best);
      d.key('Enter', 6);
      if (scene.phase === 'moves') desync++;
      continue;
    }
    d.key('Enter', 6);
  }
  if (shotName) await d.shoot(shotName, 12, 1);
  const out = {
    result: scene.battle.result, turns: scene.battle.turn, desync,
    youLeft: scene.battle.player.party.filter((k) => !k.fainted).length,
    foeLeft: scene.battle.foe.party.filter((k) => !k.fainted).length,
  };
  for (let i = 0; i < 200 && top() === scene; i++) d.key('Enter', 6);
  d.tick(10);
  return out;
};

try {
  let shot = 0;
  for (const id of MASTERS) {
    for (const [lead, name] of STARTERS) {
      let wins = 0, turns = 0, desync = 0;
      for (let r = 0; r < RUNS; r++) {
        const o = await fight(lead, id, shot < 4 && r === 0 ? `mfight-${++shot}-${id.slice(14)}` : null);
        if (o.result === 'win') wins++;
        turns += o.turns;
        desync += o.desync;
      }
      log.push(`${id.slice(14).padEnd(8)} ${name.padEnd(10)} L${LEVEL}  ${wins}/${RUNS} wins, `
        + `${Math.round(turns / RUNS)} mean turns, ${desync} menu desyncs`);
    }
  }
} catch (e) {
  log.push('THREW: ' + (e && e.message));
}
return { log };
