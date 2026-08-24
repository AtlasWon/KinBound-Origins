// A battle, a switch screen and a hit flash with an image-backed creature on
// one side and a procedural one on the other -- the only test that proves the
// two routes stand on the same floor.
const d = window.dev;
const top = () => d.game.scenes.top;

await d.loadWait(1200);
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
await d.loadWait(1400);
for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const kinMod = await import('/build/js/systems/kin.js');
const battleMod = await import('/build/js/scenes/battle.js');
const state = top().state;
state.party.length = 0;
// Player lead is image-backed (its BACK sprite is on screen); the party behind
// it is a mix, so the switch screen shows an image icon next to procedural ones.
state.party.push(
  kinMod.createKin('cinderpaw', 14, d.game.rng, { originalTrainer: 'player' }),
  kinMod.createKin('sprigling', 12, d.game.rng, { originalTrainer: 'player' }),
  kinMod.createKin('rilltail', 13, d.game.rng, { originalTrainer: 'player' }),
  kinMod.createKin('pebblet', 11, d.game.rng, { originalTrainer: 'player' }),
);
// Foe is procedural, so both routes are in the same frame.
const foe = [kinMod.createKin('nibbet', 13, d.game.rng)];

d.game.scenes.push(new battleMod.BattleScene({
  state, playerParty: state.party, foeParty: foe, isWild: true,
  backdrop: 'grass', onFinish: () => {},
}));
d.tick(2);
const out = [];

await d.shoot('ka-01-sendout', 40);
for (let i = 0; i < 20 && !(top().phase === 'menu'); i++) d.key('Enter', 12);
d.game.settings.battleSpeed = 'classic';
await d.shoot('ka-02-standoff', 6);

// KIN -> the in-battle switch screen, image icon beside procedural ones.
d.key('KeyS', 4); d.key('KeyS', 4);
out.push('cmd:' + top().phase);
d.key('Enter', 10);
await d.shoot('ka-03-switch', 8);
d.key('KeyS', 8);
await d.shoot('ka-04-switch-second', 8);
d.key('Escape', 8);
d.key('Escape', 8);

// A turn, to catch the white hit flash on both sides.
for (let i = 0; i < 12 && top().phase !== 'menu'; i++) d.key('Enter', 8);
d.key('Enter', 10);
d.key('Enter', 4);
for (let i = 0; i < 14; i++) await d.shoot('ka-05-turn-' + String(i).padStart(2, '0'), 8);

out.push('phase:' + top().phase);
return { out };
