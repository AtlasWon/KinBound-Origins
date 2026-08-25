// Terrain review: tall grass, treelines, the rock map edge, water.
// Renders real maps at 1x (and a 3x blow-up of the same frame) so a tile can be
// judged at the size it actually ships at.

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
// Reach the title, then choose NEW JOURNEY deliberately -- the cursor starts
// on CONTINUE whenever a save exists, so pressing Enter blindly loads that
// save and skips the creator entirely.
for (let i = 0; i < 90 && top().name !== 'title'; i++) d.key('Enter', 10);
if (top().name === 'title' && top().menu) { top().menu.index = 0; d.key('Enter', 24); }
for (let i = 0; i < 60 && top().name !== 'creator'; i++) d.key('Enter', 10);

for (let i = 0; i < 30; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1600);
clear();

const state = top().state;
const Overworld = top().constructor;

const visit = async (map, x, y, facing, name) => {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing || 'down'));
  await d.loadWait(1500);
  clear();
  out.push(name + ':' + (d.probe().map || '?'));
  await d.shoot(name, 8, 1);
  await d.shoot(name + '-3x', 2, 3);
};

// Tall grass field with a treeline behind it.
await visit('route_1', 8, 21, 'down', 'ter-01-tallgrass');
// Pond ringed with trees.
await visit('route_1', 10, 12, 'down', 'ter-02-pond');
// Map border treeline, top of route.
await visit('route_1', 20, 3, 'up', 'ter-03-treeline');
// The rock edge, used as a vertical wall.
await visit('hearthmere', 5, 12, 'left', 'ter-04-cliff-vertical');
// The rock edge, used as a horizontal wall.
await visit('kellowmere', 8, 5, 'up', 'ter-05-cliff-horizontal');
await visit('route_2', 6, 31, 'up', 'ter-06-cliff-route2');
// Deep water.
await visit('brackwater', 14, 14, 'down', 'ter-07-water');
// Tall grass in town.
await visit('hearthmere', 6, 19, 'down', 'ter-08-hollow-grass');

return { out, probe: d.probe() };
