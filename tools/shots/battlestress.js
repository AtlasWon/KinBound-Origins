// The battle panels loaded with the longest names in the data, so the text
// problems there can be reported accurately. Read-only reconnaissance.

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
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1500);
for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const kinMod = await import('/build/js/systems/kin.js');
const battleMod = await import('/build/js/scenes/battle.js');
const reg = (await import('/build/js/data/registry.js')).registry;
const state = top().state;

const species = [...reg.species.values()].sort((a, b) => b.name.length - a.name.length);
const moves = [...reg.moves.values()].sort((a, b) =>
  (b.name.length + b.description.length) - (a.name.length + a.description.length));
out.push('species: ' + species.slice(0, 2).map((s) => s.name));
out.push('moves: ' + moves.slice(0, 4).map((m) => m.name));

state.party.length = 0;
const lead = kinMod.createKin(species[0].id, 100, d.game.rng, { originalTrainer: 'player' });
lead.currentHp = Math.round(lead.maxHp * 0.55);
lead.moves = moves.slice(0, 4).map((m) => ({ id: m.id, pp: m.pp, maxPp: m.pp }));
const second = kinMod.createKin(species[1].id, 100, d.game.rng, { originalTrainer: 'player' });
second.currentHp = 3;
const third = kinMod.createKin(species[2].id, 88, d.game.rng, { originalTrainer: 'player' });
third.currentHp = 0;
state.party.push(lead, second, third);

d.game.settings.battleSpeed = 'fast';
d.game.scenes.push(new battleMod.BattleScene({
  state,
  playerParty: state.party,
  foeParty: [kinMod.createKin(species[3].id, 100, d.game.rng)],
  isWild: true,
  backdrop: 'grass',
  onFinish: () => {},
}));
d.tick(2);
for (let i = 0; i < 40 && top().phase !== 'menu'; i++) d.key('Enter', 8);
await d.shoot('bs-01-command', 6);

d.key('Enter', 8);
await d.shoot('bs-02-moves', 6);
d.key('KeyS', 6);
await d.shoot('bs-03-moves-2', 6);
d.key('KeyS', 6);
await d.shoot('bs-04-moves-3', 6);

d.key('Escape', 8);
for (let i = 0; i < 8 && top().phase !== 'menu'; i++) d.key('Escape', 8);
d.key('KeyS', 6);
d.key('KeyS', 6);
d.key('Enter', 10);
await d.shoot('bs-05-switch', 8);
d.key('Escape', 8);

// And the message band during a turn.
for (let i = 0; i < 8 && top().phase !== 'menu'; i++) d.key('Escape', 8);
d.key('Enter', 8);
d.key('Enter', 8);
for (const t of [6, 20, 40, 70, 110]) {
  d.tick(t);
  await d.shoot('bs-06-turn-t' + t, 1);
}

return { out };
