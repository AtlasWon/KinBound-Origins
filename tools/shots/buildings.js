// Building/decoration review sweep: interiors, house frontages, fence runs.
// Shots are written at buffer resolution (480x320), the size the game draws.

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

const SPOTS = [
  ['marrow_house_player', 6, 4, 'up', 'b-in-player'],
  ['marrow_house_neighbour', 6, 4, 'up', 'b-in-neighbour'],
  ['ashgate_house_a', 6, 4, 'up', 'b-in-house-a'],
  ['ashgate_waystation', 6, 5, 'up', 'b-in-waystation'],
  ['ashgate_provisioner', 6, 4, 'up', 'b-in-shop'],
  ['vess_station', 7, 6, 'up', 'b-in-lab'],
  ['tanners_concord', 6, 5, 'up', 'b-in-concord'],
  ['marrow_house_up', 6, 4, 'up', 'b-in-upstairs'],
  ['marrow_hollow', 6, 8, 'up', 'b-out-marrow-house'],
  ['marrow_hollow', 6, 16, 'up', 'b-out-marrow-timber'],
  ['ashgate', 5, 14, 'up', 'b-out-ashgate-row'],
  ['ashgate', 6, 8, 'up', 'b-out-ashgate-civic'],
  ['kellowmere', 15, 7, 'up', 'b-out-kellow-wide'],
  ['kellowmere', 24, 24, 'up', 'b-out-kellow-timber'],
  ['tanners_rest', 6, 13, 'up', 'b-out-tanners'],
  ['brackwater', 21, 12, 'up', 'b-out-brack'],
  ['marrow_hollow', 24, 19, 'up', 'b-out-fence'],
  ['ashgate', 5, 20, 'right', 'b-out-fence2'],
];

for (const s of SPOTS) {
  d.game.scenes.replaceAll(new Overworld(state, s[0], s[1], s[2], s[3]));
  await d.loadWait(1200);
  clear();
  out.push(s[4] + ':' + (d.probe().map || '?'));
  await d.shoot(s[4], 8, 1);
}

return { out };
