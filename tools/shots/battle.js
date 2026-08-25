// Drops straight into a wild battle and photographs a whole turn.
const d = window.dev;
const top = () => d.game.scenes.top;

await d.loadWait(1200);
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
await d.loadWait(1400);
for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const kinMod = await import('/build/js/systems/kin.js');
const battleMod = await import('/build/js/scenes/battle.js');
const state = top().state;
state.party.length = 0;
state.party.push(kinMod.createKin('cinderpaw', 12, d.game.rng, { originalTrainer: 'player' }));
const foe = [kinMod.createKin('rilltail', 11, d.game.rng)];

d.game.scenes.push(new battleMod.BattleScene({
  state, playerParty: state.party, foeParty: foe, isWild: true,
  backdrop: 'grass', onFinish: () => {},
}));
d.tick(2);
const out = [];
const shot = async (name, ticks) => { out.push(name + '@' + top().name); return d.shoot(name, ticks); };

await shot('bt-01-intro', 60);
// Skip the send-out chatter until the menu is up.
for (let i = 0; i < 20 && !(top().phase === 'menu'); i++) d.key('Enter', 12);
await shot('bt-02-menu', 6);
d.game.settings.battleSpeed = 'classic';  // a stored setting must not decide the shot
d.key('Enter', 10);                       // FIGHT
await shot('bt-03-moves', 6);
// Down to the elemental move: Strike is a plain hit and shows none of the
// per-type effect work.
d.key('KeyS', 4); d.key('KeyS', 4);
d.key('Enter', 4);
// Photograph the turn as it plays, without pressing anything.
for (let i = 0; i < 26; i++) await shot('bt-04-turn-' + String(i).padStart(2,'0'), 10);
out.push('phase:' + top().phase);
return { out, ticks: d.game.ticks };
