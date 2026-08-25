// Walks every seam these two routes own, in both directions, and reports where
// the player actually lands. A warp that points at the wrong row does not fail
// any test -- it just strands somebody in the middle of a map.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

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
for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const state = top().state;
const Overworld = top().constructor;
// The routes are walked without the story running over the top of them.
for (const f of ['tarin_first_done', 'tarin_route1_done', 'r2_ruin_open', 'r2_pin_seen',
  'mom_sendoff', 'got_starter', 'tideheart_carried_seen']) state.setFlag(f);

const SEAMS = [
  ['hearthmere', 14, 1, 'up', 'route_1'],
  ['route_1', 14, 1, 'up', 'briarbell'],
  ['briarbell', 14, 2, 'up', 'route_2'],
  ['route_2', 14, 1, 'up', 'stonewake'],
  ['stonewake', 28, 50, 'down', 'route_2'],
  ['route_2', 14, 32, 'down', 'briarbell'],
  ['briarbell', 14, 34, 'down', 'route_1'],
  ['route_1', 14, 30, 'down', 'hearthmere'],
  ['route_1', 3, 15, 'left', 'route_1_hollow'],
  ['route_1_hollow', 14, 7, 'right', 'route_1'],
  ['route_2', 25, 9, 'up', 'route_2_ruin'],
  ['route_2_ruin', 9, 16, 'down', 'route_2'],
  ['route_2', 6, 11, 'up', 'route_2_cave'],
  ['route_2_cave', 8, 10, 'down', 'route_2'],
];

for (const [from, x, y, dir, expect] of SEAMS) {
  d.game.scenes.replaceAll(new Overworld(state, from, x, y, dir));
  await d.loadWait(800);
  for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);
  d.walk(dir, 2);
  await d.loadWait(900);
  for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);
  const p = d.probe();
  const ok = p.map === expect;
  out.push((ok ? 'ok   ' : 'WRONG ') + from + ' ' + x + ',' + y + ' ' + dir
    + ' -> ' + p.map + ' @' + p.pos + (ok ? '' : ' (expected ' + expect + ')'));
}
return { out };
