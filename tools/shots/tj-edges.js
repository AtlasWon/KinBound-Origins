// What the edge of a map looks like from inside it, at 1x, on every outdoor map.
const d = window.dev;
const out = [];
const clear = () => { for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10); d.tick(4); };
const top = () => d.game.scenes.top;

// The intro is a title -> opening -> name-creator chain that a driver cannot
// reliably type its way through, and none of it matters here: the scene only
// needs a save state and the Overworld class, both of which can be had without
// starting a game.
await d.loadWait(1400);
d.key('Enter', 20); await d.loadWait(400);
d.key('Enter', 20); await d.loadWait(600);
const state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;

// map, x, y -- a spot near an edge worth looking at.
const SPOTS = [
  ['marrow_hollow', 4, 6, 'nw'],
  ['marrow_hollow', 26, 18, 'se'],
  ['route_1', 4, 4, 'nw'],
  ['route_1', 26, 28, 'se'],
  ['route_2', 4, 4, 'nw'],
  ['route_3', 5, 4, 'nw'],
  ['route_4', 26, 20, 'se'],
  ['ashgate', 4, 5, 'nw'],
  ['brackwater', 4, 5, 'nw'],
  ['kellowmere', 4, 5, 'nw'],
  ['kellowmere', 26, 24, 'se'],
  ['tanners_rest', 4, 5, 'nw'],
];

for (const [map, x, y, tag] of SPOTS) {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, 'down'));
  await d.loadWait(1000);
  clear();
  out.push(map + '/' + tag + ' -> ' + (d.probe().pos || '?'));
  await d.shoot('tj-edge-' + map + '-' + tag, 6, 1);
}
return { out };
