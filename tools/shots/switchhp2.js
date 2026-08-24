// JOB 2. Watch the player's HP readout frame by frame across a switch, in
// several shapes of turn, and record every change together with the step that
// was running when it happened.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(1400);
// Press through the title, the menu and the cinematic until the creator is
// actually on top. A fixed count of Enters broke when the menu gained a
// transition into the cinematic and moved the beat this landed on.
for (let i = 0; i < 80 && top().name !== 'creator'; i++) d.key('Enter', 12);
for (let i = 0; i < 30; i++) {
  if (typeof top().rows !== 'function') { d.key('Enter', 20); continue; }
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1600);
for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const kinMod = await import('/build/js/systems/kin.js');
const battleMod = await import('/build/js/scenes/battle.js');
const state = top().state;
d.game.settings.battleSpeed = 'brisk';
d.game.settings.textSpeed = 'fast';

function openBattle(party, foe) {
  state.party.length = 0;
  for (const k of party) state.party.push(k);
  d.game.scenes.push(new battleMod.BattleScene({
    state, playerParty: state.party, foeParty: [foe],
    isWild: true, backdrop: 'grass', onFinish: () => {},
  }));
  d.tick(2);
  for (let i = 0; i < 200 && top().phase !== 'menu'; i++) d.key('Enter', 6);
  return top();
}

// Compressed change-trace of what the player can read off the screen.
function trace(scene, ticks, label) {
  const rows = [];
  let last = '';
  for (let i = 0; i < ticks; i++) {
    const v = scene.view.player;
    const cur = scene.current;
    const key = (v.kin ? v.kin.name : '-') + ' bar=' + Math.round(v.displayHp)
      + ' model=' + (v.kin ? v.kin.currentHp : '-')
      + ' vis=' + v.visible;
    const now = key + ' | ' + (cur ? cur.kind : 'idle') + ' | ' + scene.phase;
    if (key !== last) { rows.push('  t' + i + ' ' + now); last = key; }
    if (scene.phase === 'menu' && i > 4) break;
    d.tick(1);
  }
  out.push(label);
  for (const r of rows) out.push(r);
}

/* ---------------------------------- 1. plain switch, foe attacks same turn */
{
  const a = kinMod.createKin('cinderpaw', 30, d.game.rng, { originalTrainer: 'player' });
  const b = kinMod.createKin('sprigling', 30, d.game.rng, { originalTrainer: 'player' });
  const scene = openBattle([a, b], kinMod.createKin('menhir', 28, d.game.rng));
  out.push('== 1. switch while the foe attacks ==');
  out.push('  B before: ' + b.currentHp + '/' + b.maxHp);
  scene.submit(d.game, { kind: 'switch', partyIndex: 1 });
  out.push('  B in model right after the turn resolves: ' + b.currentHp + '/' + b.maxHp);
  out.push('  queue: ' + scene.queue.map((q) => q.kind).join(','));
  trace(scene, 900, '  trace:');
  d.game.scenes.pop(); d.tick(4);
}

/* ------------------------------------------- 2. switch into entry hazards */
{
  const a = kinMod.createKin('cinderpaw', 30, d.game.rng, { originalTrainer: 'player' });
  const b = kinMod.createKin('sprigling', 30, d.game.rng, { originalTrainer: 'player' });
  const scene = openBattle([a, b], kinMod.createKin('menhir', 28, d.game.rng));
  scene.battle.player.hazards.spikes = 2;
  out.push('== 2. switch into spikes ==');
  out.push('  B before: ' + b.currentHp + '/' + b.maxHp);
  scene.submit(d.game, { kind: 'switch', partyIndex: 1 });
  out.push('  B in model after: ' + b.currentHp + '/' + b.maxHp);
  out.push('  queue: ' + scene.queue.map((q) => q.kind).join(','));
  trace(scene, 900, '  trace:');
  d.game.scenes.pop(); d.tick(4);
}

/* --------------------------------------------- 3. forced switch on a faint */
{
  const a = kinMod.createKin('cinderpaw', 6, d.game.rng, { originalTrainer: 'player' });
  a.currentHp = 1;
  const b = kinMod.createKin('sprigling', 30, d.game.rng, { originalTrainer: 'player' });
  const scene = openBattle([a, b], kinMod.createKin('menhir', 40, d.game.rng));
  out.push('== 3. forced switch after a faint ==');
  out.push('  B before: ' + b.currentHp + '/' + b.maxHp);
  scene.submit(d.game, { kind: 'move', index: 0 });
  for (let i = 0; i < 900 && scene.phase !== 'forcedSwitch'; i++) d.tick(1);
  out.push('  phase now ' + scene.phase);
  scene.battle.doSwitch('player', 1);
  scene.enqueue(scene.battle.drainEvents(), d.game);
  scene.phase = 'anim';
  out.push('  queue: ' + scene.queue.map((q) => q.kind).join(','));
  trace(scene, 900, '  trace:');
  d.game.scenes.pop(); d.tick(4);
}

/* ------------------------------- 4. switch back to a kin that was hurt earlier */
{
  const a = kinMod.createKin('cinderpaw', 30, d.game.rng, { originalTrainer: 'player' });
  const b = kinMod.createKin('sprigling', 30, d.game.rng, { originalTrainer: 'player' });
  const scene = openBattle([a, b], kinMod.createKin('menhir', 28, d.game.rng));
  out.push('== 4. out and back again ==');
  scene.submit(d.game, { kind: 'switch', partyIndex: 1 });
  for (let i = 0; i < 1200 && scene.phase !== 'menu'; i++) d.tick(1);
  out.push('  A parked at ' + a.currentHp + '/' + a.maxHp + ', B on field at ' + b.currentHp);
  scene.submit(d.game, { kind: 'switch', partyIndex: 0 });
  out.push('  A model after switching back: ' + a.currentHp + '/' + a.maxHp);
  trace(scene, 900, '  trace:');
  d.game.scenes.pop(); d.tick(4);
}

return out;

