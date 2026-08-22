// A sweep through the places that matter, for reviewing art changes.
//
// Warps straight from map to map rather than walking, because the point is the
// picture, not the route. Run with tools/capture.cjs.

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
d.key('Enter', 60);                        // skip the cinematic

// Straight out of the creator with whatever it starts on.
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

const visit = async (map, x, y, facing, name, scale) => {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing || 'down'));
  await d.loadWait(1500);
  clear();
  out.push(name + ':' + (d.probe().map || '?'));
  await d.shoot(name, 8, scale || 2);
};

await visit('marrow_hollow', 15, 9, 'up', 'tour-01-hollow');
await visit('marrow_hollow', 21, 8, 'up', 'tour-02-lab-outside');
await visit('vess_station', 7, 8, 'up', 'tour-03-lab-inside');
await visit('marrow_house_player', 6, 5, 'up', 'tour-04-home');
await visit('ashgate', 15, 12, 'up', 'tour-05-ashgate');
await visit('ashgate_waystation', 4, 4, 'up', 'tour-06-waystation');
await visit('ashgate_provisioner', 5, 4, 'up', 'tour-07-shop');
await visit('route_1', 14, 12, 'down', 'tour-08-route');

return { out, probe: d.probe() };
