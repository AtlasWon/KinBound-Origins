// The routes at 1x, from inside them: the fork, the choke, the ledge, the
// shore. A plan view says whether a route has a shape; only this says whether
// standing in it is worth anything.
const d = window.dev;
const top = () => d.game.scenes.top;
const clear = () => { for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10); d.tick(4); };

await d.loadWait(1200);
d.key('Enter', 20); await d.loadWait(400);
d.key('Enter', 20); await d.loadWait(600);
const state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;

const SPOTS = window.__spots || [
  ['route_1', 14, 28, 'up', 'r1-a-gate'],
  ['route_1', 12, 26, 'up', 'r1-b-fork'],
  ['route_1', 6, 20, 'up', 'r1-c-hollow'],
  ['route_1', 17, 18, 'right', 'r1-d-tarn'],
  ['route_1', 14, 23, 'down', 'r1-e-ledge'],
  ['route_1', 8, 8, 'up', 'r1-f-terrace'],
  ['route_2', 15, 27, 'up', 'r2-a-meadow'],
  ['route_2', 18, 23, 'up', 'r2-b-notch'],
  ['route_2', 10, 18, 'left', 'r2-c-tarn'],
  ['route_2', 14, 12, 'up', 'r2-d-band'],
  ['route_2', 12, 7, 'up', 'r2-e-quarry'],
  ['route_3', 5, 13, 'right', 'r3-a-west'],
  ['route_3', 8, 10, 'right', 'r3-b-pasture'],
  ['route_3', 16, 13, 'right', 'r3-c-bridge'],
  ['route_3', 27, 15, 'down', 'r3-d-copse'],
  ['route_3', 28, 8, 'right', 'r3-e-shoulder'],
  ['route_4', 14, 6, 'down', 'r4-a-inland'],
  ['route_4', 19, 13, 'right', 'r4-b-shelf'],
  ['route_4', 8, 16, 'down', 'r4-c-ledge'],
  ['route_4', 18, 20, 'right', 'r4-d-spit'],
];

const out = [];
for (const [map, x, y, facing, tag] of SPOTS) {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing));
  await d.loadWait(900);
  clear();
  out.push(tag + ' ' + (d.probe().pos || '?'));
  await d.shoot('mp-' + tag, 6, 1);
}
return { out };
