// Photographs the first seconds of a battle densely, which is where the
// send-out animation lives. Also catches a switch and a knockout.
//
// "Densely" used to mean a frame every five, which is coarse enough to step
// clean over the middle of a materialise -- the beat that actually had to be
// looked at. Two now, with the text collapsed so the shots are spent on the
// animation rather than on a line typing. tools/shots/materialise.js is the
// version that waits for each step and walks it frame by frame.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(1400);
// Press through the title, the menu and the cinematic until the creator is
// actually on top. A fixed count of Enters broke when the menu gained a
// transition into the cinematic and moved the beat this landed on.
for (let i = 0; i < 80 && top().name !== 'creator'; i++) d.key('Enter', 12);
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
d.game.settings.textSpeed = 'fast';
d.game.scenes.push(new battleMod.BattleScene({
  state, playerParty: state.party, foeParty: foe, isWild: true,
  backdrop: 'grass', onFinish: () => {},
}));
d.tick(2);

// The opening: both sides being sent out.
for (let i = 0; i < 60; i++) await d.shoot('so-' + String(i).padStart(2, '0'), 2);
out.push('phase after intro: ' + top().phase);

// Get to the menu, then switch, which is the return-and-send-out pair.
for (let i = 0; i < 20 && top().phase !== 'menu'; i++) d.key('Enter', 10);
await d.shoot('so-menu', 4);
d.key('KeyS', 4);                 // down to KIN
d.key('Enter', 10);
await d.shoot('so-party', 6);
d.key('KeyS', 4);
d.key('Enter', 6);
for (let i = 0; i < 30; i++) await d.shoot('so-switch-' + String(i).padStart(2, '0'), 2);
out.push('phase after switch: ' + top().phase);

return { out };
