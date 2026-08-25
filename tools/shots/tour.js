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

// Press through the title, the menu and the cinematic until the creator is
// actually on top. Counting key presses was fragile -- the menu now flows into
// the cinematic through a transition, which moved the beat this used to land
// on and left the driver calling rows() on the opening scene.
// Reach the title, then choose NEW JOURNEY deliberately -- the cursor starts
// on CONTINUE whenever a save exists, so pressing Enter blindly loads that
// save and skips the creator entirely.
for (let i = 0; i < 90 && top().name !== 'title'; i++) d.key('Enter', 10);
if (top().name === 'title' && top().menu) { top().menu.index = 0; d.key('Enter', 24); }
for (let i = 0; i < 60 && top().name !== 'creator'; i++) d.key('Enter', 10);
if (top().name !== 'creator') throw new Error(`never reached the creator; stuck on ${top().name}`);

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

await visit('hearthmere', 15, 9, 'up', 'tour-01-hollow');
await visit('hearthmere', 21, 8, 'up', 'tour-02-lab-outside');
await visit('sorrell_lab', 7, 8, 'up', 'tour-03-lab-inside');
await visit('hearthmere_house_player', 6, 5, 'up', 'tour-04-home');
await visit('briarbell', 15, 12, 'up', 'tour-05-briarbell');
await visit('briarbell_clinic', 4, 4, 'up', 'tour-06-clinic');
await visit('briarbell_provisioner', 5, 4, 'up', 'tour-07-shop');
await visit('route_1', 14, 12, 'down', 'tour-08-route');

return { out, probe: d.probe() };
