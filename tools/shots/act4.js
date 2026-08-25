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
await visit('route_7', 1, 57, 'a4-01-levels');
await visit('harrowgate', 28, 34, 'a4-02-harrowgate');
await visit('aureline', 75, 118, 'a4-03-aureline-gate');
await visit('aureline', 40, 41, 'a4-04-aureline-meridian');
await visit('aureline_meridian', 12, 18, 'a4-05-hq-atrium');
return { out };
