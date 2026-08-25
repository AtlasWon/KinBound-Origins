// Stands the player at every beat on Route 1 and Route 2 and photographs it at
// 1x, which is the only size any of this is allowed to be judged at.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

const clear = () => {
  for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);
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

const SPOTS = [
  ['r1-gate', 'route_1', 14, 29, 'up'],
  ['r1-teachgrass', 'route_1', 7, 29, 'up'],
  ['r1-bridge', 'route_1', 17, 27, 'up'],
  ['r1-junction', 'route_1', 14, 22, 'up'],
  ['r1-hayfield', 'route_1', 12, 18, 'up'],
  ['r1-hedgegap', 'route_1', 5, 15, 'left'],
  ['r1-tarn', 'route_1', 28, 16, 'left'],
  ['r1-stone', 'route_1', 21, 9, 'up'],
  ['r1-topgate', 'route_1', 16, 6, 'up'],
  ['r1-briarbell', 'route_1', 14, 2, 'up'],
  ['r1h-hollow', 'route_1_hollow', 9, 7, 'left'],

  ['r2-gate', 'route_2', 14, 31, 'up'],
  ['r2-pass1', 'route_2', 20, 27, 'up'],
  ['r2-tarnspur', 'route_2', 12, 22, 'left'],
  ['r2-thorn', 'route_2', 32, 22, 'up'],
  ['r2-pass2', 'route_2', 36, 18, 'up'],
  ['r2-ruin', 'route_2', 25, 10, 'up'],
  ['r2-ruin-wide', 'route_2', 25, 12, 'up'],
  ['r2-cave', 'route_2', 6, 12, 'up'],
  ['r2-shelf3', 'route_2', 20, 5, 'up'],
  ['r2-top', 'route_2', 14, 2, 'up'],
  ['ruin-hall', 'route_2_ruin', 9, 13, 'up'],
  ['ruin-chamber', 'route_2_ruin', 9, 3, 'up'],
  ['cave-in', 'route_2_cave', 8, 7, 'up'],
];

for (const [name, map, x, y, facing] of SPOTS) {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing));
  await d.loadWait(900);
  clear();
  const p = d.probe();
  out.push(name + ' ' + p.map + ' @' + p.pos);
  await d.shoot('rw-' + name, 10, 1);
}
return { out };
