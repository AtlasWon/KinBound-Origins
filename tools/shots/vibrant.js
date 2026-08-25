// Outdoor art review. Same places as tour.js, but shot at 1x -- every defect
// this project has shipped looked fine zoomed in -- plus a second pass at 3x
// on the two maps where the ground texture has to be judged up close.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

const clear = () => {
  for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);
  d.tick(4);
};

await d.loadWait(1400);
// Press through the title and the cinematic until either the creator or -- if
// a run got as far as saving -- the overworld itself is on top.
for (let i = 0; i < 140 && top().name !== 'overworld'; i++) {
  if (top().name === 'creator') {
    for (let k = 0; k < 30; k++) {
      const rows = top().rows();
      if ((rows[top().sel] || {}).action === 'begin') break;
      d.key('KeyS', 2);
    }
    d.key('Enter', 60);
    await d.loadWait(1600);
    continue;
  }
  d.key('Enter', 12);
}
if (top().name !== 'overworld') throw new Error(`stuck on ${top().name}`);
clear();

const state = top().state;
const Overworld = top().constructor;

const visit = async (map, x, y, facing, name, scale) => {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing || 'down'));
  await d.loadWait(1500);
  clear();
  out.push(name + ':' + (d.probe().map || '?'));
  await d.shoot(name, 8, scale);
};

await visit('hearthmere', 15, 9, 'up', 'vb-1x-hollow', 1);
await visit('route_1', 14, 12, 'down', 'vb-1x-route', 1);
await visit('briarbell', 15, 8, 'up', 'vb-1x-civic', 1);
await visit('briarbell', 10, 15, 'up', 'vb-1x-houses', 1);
await visit('briarbell', 7, 21, 'up', 'vb-1x-pond', 1);
await visit('hearthmere', 15, 9, 'up', 'vb-3x-hollow', 3);
await visit('route_1', 14, 12, 'down', 'vb-3x-route', 3);
await visit('briarbell', 15, 8, 'up', 'vb-3x-civic', 3);
await visit('briarbell', 10, 15, 'up', 'vb-3x-houses', 3);
await visit('briarbell', 7, 21, 'up', 'vb-3x-pond', 3);
await visit('kellowmere', 15, 12, 'up', 'vb-1x-quarry', 1);
await visit('kellowmere', 15, 12, 'up', 'vb-3x-quarry', 3);
await visit('brackwater', 15, 12, 'up', 'vb-1x-coast', 1);
await visit('brackwater', 15, 12, 'up', 'vb-3x-coast', 3);
await visit('hearthmere_house_player', 6, 5, 'up', 'vb-1x-home', 1);
await visit('hearthmere_house_player', 6, 5, 'up', 'vb-3x-home', 3);
await visit('hearthmere', 11, 18, 'up', 'vb-1x-shore', 1);
await visit('hearthmere', 11, 18, 'up', 'vb-3x-shore', 3);
await visit('hearthmere', 11, 13, 'up', 'vb-3x-court', 3);
// Standing in the route_1 patch: the check that the tall-grass skirt still
// covers a character's legs and paints nothing pale across their chest.
await visit('route_1', 6, 24, 'up', 'vb-4x-wade', 4);
await visit('briarbell_clinic', 4, 4, 'up', 'vb-1x-way', 1);
await visit('sorrell_lab', 7, 8, 'up', 'vb-1x-lab', 1);

return { out };
