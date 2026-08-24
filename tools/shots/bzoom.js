// Close-up pass for building work: same spots, drawn at 3x so a tile's
// construction can be read. Judge shape here, never quality.

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
  ['marrow_house_player', 6, 4, 'up', 'z-in-player'],
  ['ashgate_provisioner', 6, 4, 'up', 'z-in-shop'],
  ['marrow_hollow', 6, 8, 'up', 'z-out-marrow'],
  ['marrow_hollow', 24, 19, 'up', 'z-out-fence'],
  ['ashgate', 5, 14, 'up', 'z-out-ashgate'],
];

for (const s of SPOTS) {
  d.game.scenes.replaceAll(new Overworld(state, s[0], s[1], s[2], s[3]));
  await d.loadWait(1200);
  clear();
  out.push(s[4]);
  await d.shoot(s[4], 8, 3);
}
return { out };
