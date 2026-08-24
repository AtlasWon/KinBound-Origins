// Outdoor and indoor sweep for the detail/vibrancy pass on tileset.ts.
//
// Shoots every stop twice: once at 1x, which is how the art is actually judged,
// and once at 2x so a mark can be inspected without guessing. Run with
// tools/capture.cjs.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

const clear = () => {
  for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);
  d.tick(4);
};

await d.loadWait(1400);

for (let i = 0; i < 80 && top().name !== 'creator'; i++) d.key('Enter', 12);
if (top().name !== 'creator') throw new Error(`never reached the creator; stuck on ${top().name}`);

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
  await d.shoot(name + '-x2', 0, 2);
};

await visit('marrow_house_up', 6, 5, 'up', 'tp-15-bedroom');
await visit('route_2', 14, 13, 'up', 'tp-14-cliffs');
await visit('kellowmere', 14, 12, 'up', 'tp-10-kellowmere');
await visit('brackwater', 14, 12, 'up', 'tp-11-brackwater');
await visit('route_3', 12, 12, 'up', 'tp-12-route3');
await visit('tanners_concord', 14, 12, 'up', 'tp-13-tanners');
await visit('route_1', 14, 12, 'down', 'tp-01-route');
await visit('marrow_hollow', 15, 9, 'up', 'tp-02-hollow');
await visit('ashgate', 15, 12, 'up', 'tp-03-ashgate');
await visit('ashgate', 8, 20, 'up', 'tp-04-ashgate-s');
await visit('marrow_hollow', 21, 8, 'up', 'tp-05-lab-outside');
await visit('marrow_house_player', 6, 5, 'up', 'tp-06-home');
await visit('ashgate_waystation', 4, 4, 'up', 'tp-07-waystation');
await visit('ashgate_provisioner', 5, 4, 'up', 'tp-08-shop');
await visit('vess_station', 7, 8, 'up', 'tp-09-lab-inside');

return { out, probe: d.probe() };
