// Act 2 places, at 1x, to judge scale and colour.
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
await visit('route_3', 26, 20, 'a2-01-ridge');
await visit('tanners_rest', 22, 16, 'a2-02-salthollow');
await visit('route_4', 20, 18, 'a2-03-coast');
await visit('tideglass', 14, 3, 'a2-04-tideglass');
await visit('tideglass', 16, 26, 'a2-05-tideglass-harbour');
await visit('route_5', 20, 8, 'a3-01-embercoil');
await visit('emberfall', 20, 40, 'a3-02-emberfall');
await visit('route_6', 20, 20, 'a3-03-wetlands');
await visit('mirehaven', 20, 20, 'a3-04-mirehaven');
return { out };
