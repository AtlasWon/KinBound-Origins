// The party screen outside battle, with a mixed-health party in it.
const d = window.dev;
const top = () => d.game.scenes.top;
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
const state = top().state;
state.party.length = 0;
const mk = (sp, lv, frac) => {
  const k = kinMod.createKin(sp, lv, d.game.rng, { originalTrainer: 'player' });
  k.currentHp = Math.max(0, Math.round(k.maxHp * frac));
  return k;
};
state.party.push(mk('cinderpaw', 12, 0.55), mk('pipwing', 9, 0.12), mk('nibbet', 7, 0),
  mk('sprigling', 10, 1), mk('pebblet', 8, 0.8));

d.key('KeyP', 30);
const out = ['scene: ' + top().name];
await d.shoot('party-01', 10);
d.key('KeyS', 8);
await d.shoot('party-02-second', 8);
d.key('KeyS', 8);
d.key('KeyS', 8);
await d.shoot('party-03-fourth', 8);
d.key('Enter', 10);
await d.shoot('party-04-actions', 8);
return { out };
