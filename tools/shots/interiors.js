// Every interior in the game, one shot each, at the size the game draws.
// Written for the doorway change: an exit you cannot see is a soft-lock in
// everything but name, so every room has to be checked, not a sample of them.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

const clear = () => {
  for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);
  d.tick(4);
};

await d.loadWait(1400);
// Press through the title, the menu and the cinematic until the creator is
// actually on top. A fixed count of Enters broke when the menu gained a
// transition into the cinematic and moved the beat this landed on.
for (let i = 0; i < 80 && top().name !== 'creator'; i++) d.key('Enter', 12);
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

const MAPS = [
  'marrow_house_player', 'marrow_house_up', 'marrow_house_neighbour',
  'ashgate_house_a', 'ashgate_house_b', 'ashgate_waystation', 'ashgate_provisioner',
  'brackwater_house', 'brackwater_waystation', 'brackwater_provisioner', 'brackwater_bastion',
  'kellowmere_house_a', 'kellowmere_house_b', 'kellowmere_waystation',
  'kellowmere_provisioner', 'kellowmere_bastion',
  'tanners_house', 'tanners_waystation', 'tanners_provisioner', 'tanners_concord',
  'vess_station',
];

for (const m of MAPS) {
  d.game.scenes.replaceAll(new Overworld(state, m, 4, 3, 'down'));
  await d.loadWait(1000);
  clear();
  out.push(m + ':' + (d.probe().map || '?'));
  await d.shoot('i-' + m, 8, 1);
}
return { out };
