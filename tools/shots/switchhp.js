// Bug hunt: switching kin shows the new arrival already damaged, and the exp
// bar behaves oddly after a knockout. Drives a real battle, switches, and
// samples the scene's own view state frame by frame.
//
// Usage: npx electron tools/capture.cjs tools/shots/switchhp.js

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(1400);
// Press through the title, the menu and the cinematic until the creator is
// actually on top. A fixed count of Enters broke when the menu gained a
// transition into the cinematic and moved the beat this landed on.
// Reach the title, then choose NEW JOURNEY deliberately -- the cursor starts
// on CONTINUE whenever a save exists, so pressing Enter blindly loads that
// save and skips the creator entirely.
for (let i = 0; i < 90 && top().name !== 'title'; i++) d.key('Enter', 10);
if (top().name === 'title' && top().menu) { top().menu.index = 0; d.key('Enter', 24); }
for (let i = 0; i < 60 && top().name !== 'creator'; i++) d.key('Enter', 10);
for (let i = 0; i < 30; i++) {
  if (typeof top().rows !== 'function') { d.key('Enter', 20); continue; }
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1500);
for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const kinMod = await import('/build/js/systems/kin.js');
const battleMod = await import('/build/js/scenes/battle.js');
const state = top().state;
state.party.length = 0;
const a = kinMod.createKin('cinderpaw', 24, d.game.rng, { originalTrainer: 'player' });
const b = kinMod.createKin('sprigling', 24, d.game.rng, { originalTrainer: 'player' });
state.party.push(a, b);

d.game.settings.battleSpeed = 'brisk';
d.game.settings.textSpeed = 'fast';
d.game.scenes.push(new battleMod.BattleScene({
  state, playerParty: state.party, foeParty: [kinMod.createKin('menhir', 22, d.game.rng)],
  isWild: true, backdrop: 'grass', onFinish: () => { out.push('onFinish ran'); },
}));
d.tick(2);
for (let i = 0; i < 80 && top().phase !== 'menu'; i++) d.key('Enter', 8);
const scene = top();
out.push('phase ' + scene.phase);

/* ------------------------------------------------ 1. the switch bug */

out.push('B before switch: ' + b.currentHp + '/' + b.maxHp);
scene.submit(d.game, { kind: 'switch', partyIndex: 1 });
out.push('B in model right after the turn resolves: ' + b.currentHp + '/' + b.maxHp);
out.push('queue: ' + scene.queue.map((q) => q.kind).join(','));

let shotOnArrival = false;
for (let i = 0; i < 500; i++) {
  d.tick(1);
  const cur = scene.current;
  if (cur && cur.kind === 'sendOut' && cur.side === 'player') {
    if (!shotOnArrival && cur.t > cur.frames * 0.9) {
      shotOnArrival = true;
      out.push('ARRIVAL: displayHp=' + Math.round(scene.view.player.displayHp)
        + ' model=' + b.currentHp + '/' + b.maxHp);
      await d.shoot('switchhp-arrival', 0, 1);
    }
  }
  if (scene.phase === 'menu') break;
}
out.push('after queue drained: displayHp=' + Math.round(scene.view.player.displayHp)
  + ' model=' + b.currentHp);

return out;
