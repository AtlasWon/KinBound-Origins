// Photographs the first seconds of a battle densely, which is where the
// send-out animation lives. Also catches a switch and a knockout.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(1400);
d.key('Enter', 4);
d.key('Enter', 30);
d.key('Enter', 60);
for (let i = 0; i < 30; i++) {
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
state.party.push(kinMod.createKin('cinderpaw', 12, d.game.rng, { originalTrainer: 'player' }));
state.party.push(kinMod.createKin('pipwing', 9, d.game.rng, { originalTrainer: 'player' }));
const foe = [kinMod.createKin('rilltail', 6, d.game.rng)];

d.game.settings.battleSpeed = 'classic';
d.game.scenes.push(new battleMod.BattleScene({
  state, playerParty: state.party, foeParty: foe, isWild: true,
  backdrop: 'grass', onFinish: () => {},
}));
d.tick(2);

// The opening: both sides being sent out.
for (let i = 0; i < 46; i++) await d.shoot('so-' + String(i).padStart(2, '0'), 5);
out.push('phase after intro: ' + top().phase);

// Get to the menu, then switch, which is the return-and-send-out pair.
for (let i = 0; i < 20 && top().phase !== 'menu'; i++) d.key('Enter', 10);
await d.shoot('so-menu', 4);
d.key('KeyS', 4);                 // down to KIN
d.key('Enter', 10);
await d.shoot('so-party', 6);
d.key('KeyS', 4);
d.key('Enter', 6);
for (let i = 0; i < 16; i++) await d.shoot('so-switch-' + String(i).padStart(2, '0'), 5);
out.push('phase after switch: ' + top().phase);

return { out };
