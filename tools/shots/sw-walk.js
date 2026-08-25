// Stonewake, walked, at 1x.
//
// The plan view says whether the city has shape; only 1x says whether it has
// scale, and whether the streets read as streets from inside them. Drops into
// each district on foot, photographs it at the size the game actually draws,
// and reports where it ended up so a bad coordinate cannot pass as a good shot.
//
//   npx electron tools/capture.cjs tools/shots/sw-walk.js

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

const clear = () => {
  for (let i = 0; i < 24 && top().name === 'dialogue'; i++) d.key('Enter', 10);
  d.tick(4);
};

await d.loadWait(1400);
for (let i = 0; i < 90 && top().name !== 'title'; i++) d.key('Enter', 10);
if (top().name === 'title' && top().menu) { top().menu.index = 0; d.key('Enter', 24); }
for (let i = 0; i < 60 && top().name !== 'creator'; i++) d.key('Enter', 10);
for (let i = 0; i < 80; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1600);
clear();

const state = top().state;
const Overworld = top().constructor;

// The Crest gates half the town's dialogue and the field art the west working
// needs, so the sweep is run twice: once as a new arrival and once as somebody
// who has already been down the mine.
const AFTER = (window.SW_AFTER === true);
if (AFTER) {
  state.setFlag('crest_2_taken');
  state.giveCrest?.(2, 'Quarry Crest');
  state.crests?.add?.(2);
  state.giveArt?.('shoulder');
  state.setFlag('met_lyra');
  state.setFlag('lyra_saw_tideheart');
}

const SPOTS = [
  ['stonewake', 28, 49, 'up', 'sw-01-south-gate'],
  ['stonewake', 14, 46, 'up', 'sw-02-market'],
  ['stonewake', 28, 36, 'up', 'sw-03-kerb-street'],
  ['stonewake', 15, 40, 'up', 'sw-04-clinic'],
  ['stonewake', 24, 39, 'up', 'sw-05-the-green'],
  ['stonewake', 15, 34, 'up', 'sw-06-provisioner'],
  ['stonewake', 48, 29, 'up', 'sw-07-museum-front'],
  ['stonewake', 15, 28, 'up', 'sw-08-meridian-front'],
  ['stonewake', 33, 33, 'left', 'sw-09-cistern'],
  ['stonewake', 29, 22, 'up', 'sw-10-ramp-head'],
  ['stonewake', 9, 20, 'up', 'sw-11-haul-road'],
  ['stonewake', 12, 13, 'up', 'sw-12-quarry-yard'],
  ['stonewake', 25, 12, 'up', 'sw-13-quarry-office'],
  ['stonewake', 5, 4, 'up', 'sw-14-west-working'],
  ['stonewake', 41, 9, 'up', 'sw-15-hall-front'],
  ['stonewake', 47, 12, 'up', 'sw-16-winding-house'],
  ['stonewake_hall', 10, 15, 'up', 'sw-17-hall-in'],
  ['stonewake_hall', 10, 5, 'up', 'sw-18-hall-cage'],
  ['stonewake_mine', 11, 4, 'down', 'sw-19-mine'],
  ['stonewake_mine', 11, 11, 'down', 'sw-20-mine-plates'],
  ['stonewake_deep', 9, 10, 'up', 'sw-21-deep'],
  ['stonewake_deep', 9, 4, 'up', 'sw-22-roxen'],
  ['stonewake_museum', 11, 8, 'up', 'sw-23-museum'],
  ['stonewake_museum', 11, 5, 'up', 'sw-24-lyra'],
  ['stonewake_meridian', 8, 8, 'up', 'sw-25-meridian'],
  ['stonewake_market', 7, 5, 'up', 'sw-26-shop'],
  ['stonewake_clinic', 7, 6, 'up', 'sw-27-clinic'],
  ['stonewake_quarryoffice', 6, 5, 'up', 'sw-28-office'],
  ['stonewake_house_b', 6, 5, 'up', 'sw-29-house-b'],
  ['stonewake_house_d', 6, 5, 'up', 'sw-30-house-d'],
];

for (const [map, x, y, facing, name] of SPOTS) {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing));
  await d.loadWait(1000);
  clear();
  const p = d.probe();
  out.push(`${name}: ${p.map} ${p.pos}`);
  await d.shoot(name + (AFTER ? '-after' : ''), 8, 1);
}

return { out };
