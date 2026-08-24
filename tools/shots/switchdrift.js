// JOB 2 verification. Knock the readouts out of step on purpose -- the way a
// dropped animation step does -- and check the scene puts them back before the
// player is next asked to read them.
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

state.party.length = 0;
const a = kinMod.createKin('cinderpaw', 45, d.game.rng, { originalTrainer: 'player' });
const b = kinMod.createKin('sprigling', 45, d.game.rng, { originalTrainer: 'player' });
state.party.push(a, b);
d.game.scenes.push(new battleMod.BattleScene({
  state, playerParty: state.party, foeParty: [kinMod.createKin('menhir', 20, d.game.rng)],
  isWild: true, backdrop: 'grass', onFinish: () => {},
}));
d.tick(2);
const scene = top();
for (let i = 0; i < 2000 && scene.phase !== 'menu'; i++) d.tick(1);
out.push('at the menu: bar=' + Math.round(scene.view.player.displayHp)
  + ' model=' + a.currentHp + '/' + a.maxHp);

// A dropped step, simulated: the bar reads far too low and nothing is queued
// that would ever correct it.
scene.view.player.displayHp = 7;
scene.displayExp = 0;
scene.displayLevel = 1;
out.push('after drift: bar=' + Math.round(scene.view.player.displayHp)
  + ' exp=' + scene.displayExp + ' lv=' + scene.displayLevel);

// Hand the scene back to its own loop with nothing to play.
scene.phase = 'anim';
for (let i = 0; i < 400 && scene.phase !== 'menu'; i++) d.tick(1);
out.push('back at the menu: phase=' + scene.phase
  + ' bar=' + Math.round(scene.view.player.displayHp) + ' model=' + a.currentHp
  + ' exp=' + scene.displayExp + '/' + a.exp
  + ' lv=' + scene.displayLevel + '/' + a.level);
out.push(Math.round(scene.view.player.displayHp) === a.currentHp
  && scene.displayExp === a.exp && scene.displayLevel === a.level
  ? 'REPAIRED' : 'STILL WRONG');
await d.shoot('drift-repaired', 2, 3);

// And the same across a switch, so the repair cannot be hiding a stale kin.
scene.view.player.displayHp = 3;
scene.submit(d.game, { kind: 'switch', partyIndex: 1 });
for (let i = 0; i < 3000 && scene.phase !== 'menu'; i++) d.tick(1);
out.push('after a switch: panel=' + scene.view.player.kin.name
  + ' bar=' + Math.round(scene.view.player.displayHp)
  + ' model=' + scene.battle.player.active.currentHp
  + ' engineActive=' + scene.battle.player.active.name);
return out;

