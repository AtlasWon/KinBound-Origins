// Stands the player one tile in front of every interior exit in turn, so the
// thing being checked -- can you see the way out -- is actually in frame.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

const clear = () => {
  for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);
  d.tick(4);
};

await d.loadWait(1400);
d.key('Enter', 4);
d.key('Enter', 30);
d.key('Enter', 60);
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

const SPOTS = [
  ['brackwater_bastion', 8, 14],
  ['kellowmere_bastion', 7, 13],
  ['brackwater_house', 6, 5],
  ['kellowmere_house_b', 6, 5],
  ['vess_station', 7, 7],
  ['tanners_waystation', 6, 6],
];

for (const s of SPOTS) {
  d.game.scenes.replaceAll(new Overworld(state, s[0], s[1], s[2], 'down'));
  await d.loadWait(1000);
  clear();
  out.push(s[0] + ':' + (d.probe().pos || '?'));
  await d.shoot('x-' + s[0], 8, 1);
}
return { out };
