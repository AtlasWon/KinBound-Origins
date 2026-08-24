// The experience bar across two knockouts and a switch. Logs what the panel is
// showing against what the kin actually holds, and shoots the bar at the end of
// each award.
//
// Usage: npx electron tools/capture.cjs tools/shots/switchexp.js

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(1400);
d.key('Enter', 4);
d.key('Enter', 30);
d.key('Enter', 60);
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
const a = kinMod.createKin('cinderpaw', 30, d.game.rng, { originalTrainer: 'player' });
const b = kinMod.createKin('sprigling', 30, d.game.rng, { originalTrainer: 'player' });
state.party.push(a, b);

d.game.settings.battleSpeed = 'brisk';
d.game.settings.textSpeed = 'fast';
d.game.scenes.push(new battleMod.BattleScene({
  state,
  playerParty: state.party,
  foeParty: [
    kinMod.createKin('nibbet', 6, d.game.rng),
    kinMod.createKin('nibbet', 6, d.game.rng),
  ],
  isWild: false,
  backdrop: 'grass',
  onFinish: () => { out.push('onFinish ran'); },
}));
d.tick(2);
for (let i = 0; i < 80 && top().phase !== 'menu'; i++) d.key('Enter', 8);
const scene = top();

const line = (tag) => out.push(tag
  + ' bar=' + Math.round(scene.displayExp)
  + ' A=' + a.exp + '(L' + a.level + ')'
  + ' B=' + b.exp + '(L' + b.level + ')'
  + ' onField=' + (scene.view.player.kin === a ? 'A' : 'B'));

const drain = async (tag) => {
  for (let i = 0; i < 900; i++) {
    d.tick(1);
    if (scene.phase === 'menu' || scene.phase === 'finished') break;
  }
  line(tag);
  await d.shoot('switchexp-' + tag, 0, 1);
};

line('start');

// A knocks out the first foe.
scene.submit(d.game, { kind: 'move', index: 0 });
await drain('ko1');

// Switch to B, then B knocks out the second.
if (scene.phase === 'menu') {
  scene.submit(d.game, { kind: 'switch', partyIndex: 1 });
  await drain('switched');
}
for (let n = 0; n < 6 && scene.phase === 'menu'; n++) {
  scene.submit(d.game, { kind: 'move', index: 0 });
  await drain('ko2-' + n);
}

return out;
