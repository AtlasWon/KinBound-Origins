// Act 4 places at 1x, entered on tiles the game itself warps to.
const d = window.dev;
const top = () => d.game.scenes.top;
await d.loadWait(1400);
for (let i = 0; i < 90 && top().name !== 'title'; i++) d.key('Enter', 10);
if (top().name === 'title' && top().menu) { top().menu.index = 0; d.key('Enter', 24); }
for (let i = 0; i < 60 && top().name !== 'creator'; i++) d.key('Enter', 10);
for (let i = 0; i < 30 && top().name === 'creator'; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') { d.key('Enter', 40); break; }
  d.key('KeyS', 2);
}
await d.loadWait(1600);
for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 8);
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;
const state = top().state;
const out = [];
const visit = async (map, x, y, name) => {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, 'down'));
  await d.loadWait(1500);
  for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 8);
  out.push(name + ':' + (d.probe().map || '?'));
  await d.shoot(name, 8, 2);
};
// Entry tiles taken from the maps' own warp destinations.
await visit('route_8_pass', 1, 20, 'a5-01-wintergate');
await visit('frostmere', 22, 23, 'a5-02-frostmere');
await visit('skyreach', 60, 57, 'a5-03-skyreach');
await visit('crownspire', 12, 26, 'a5-04-crownspire');
await visit('frostmere_observatory_dome', 10, 15, 'a5-05-dome');
return { out };
