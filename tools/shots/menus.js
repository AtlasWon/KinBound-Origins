// The battle menus, one shot each: the command pad, the move list and its
// detail panel, and the switch screen.

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
const lead = kinMod.createKin('cinderpaw', 12, d.game.rng, { originalTrainer: 'player' });
lead.currentHp = Math.round(lead.maxHp * 0.55);
const second = kinMod.createKin('pipwing', 9, d.game.rng, { originalTrainer: 'player' });
second.currentHp = 3;
const third = kinMod.createKin('nibbet', 7, d.game.rng, { originalTrainer: 'player' });
third.currentHp = 0;
state.party.push(lead, second, third);

d.game.settings.battleSpeed = 'fast';
d.game.scenes.push(new battleMod.BattleScene({
  state, playerParty: state.party, foeParty: [kinMod.createKin('rilltail', 6, d.game.rng)],
  isWild: true, backdrop: 'grass', onFinish: () => {},
}));
d.tick(2);

// Press through the opening until the command pad is up.
for (let i = 0; i < 40 && top().phase !== 'menu'; i++) d.key('Enter', 8);
out.push('phase: ' + top().phase);
await d.shoot('menu-01-command', 6);

// Each command in turn, to check the selection ring.
d.key('KeyD', 6);
await d.shoot('menu-02-command-bag', 4);
d.key('KeyS', 6);
await d.shoot('menu-03-command-run', 4);
d.key('KeyA', 6);
d.key('KeyW', 6);
await d.shoot('menu-04-command-fight', 4);

// The move list.
d.key('Enter', 8);
out.push('phase: ' + top().phase);
await d.shoot('menu-05-moves', 6);
d.key('KeyS', 6);
await d.shoot('menu-06-moves-second', 6);
d.key('KeyS', 6);
await d.shoot('menu-07-moves-third', 6);

// Back out, then the switch screen.
d.key('Escape', 8);
for (let i = 0; i < 8 && top().phase !== 'menu'; i++) d.key('Escape', 8);
d.key('KeyS', 6);
d.key('KeyS', 6);
out.push('hover: ' + (top().actionMenu ? top().actionMenu.index : '?'));
d.key('Enter', 10);
out.push('phase: ' + top().phase);
await d.shoot('menu-08-switch', 8);
d.key('KeyS', 6);
await d.shoot('menu-09-switch-second', 6);

return { out };
