// Can a body actually get through the interior doorways of the Hearthmere
// houses by just holding a key, the way a person plays? Each run drops the
// player on one side of an opening, holds one direction, and reports where
// they ended up.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
await d.loadWait(1200);
d.key('Enter', 20); await d.loadWait(400);
d.key('Enter', 20); await d.loadWait(600);
const state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;
const KEY = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' };

const runs = [
  ['hearthmere_house_up', 3, 8, 'right', 12],
  ['hearthmere_house_up', 11, 8, 'right', 8],
  ['hearthmere_house_up', 16, 8, 'left', 12],
  ['hearthmere_house_up', 3, 9, 'right', 12],
  ['hearthmere_house_up', 2, 1, 'down', 8],
  ['hearthmere_house_player', 10, 8, 'right', 8],
  ['hearthmere_house_player', 17, 9, 'left', 12],
  ['hearthmere_house_player', 2, 5, 'right', 10],
  ['hearthmere_house_player', 6, 2, 'down', 8],
  ['sorrell_lab', 3, 3, 'right', 15],
  ['sorrell_lab', 17, 11, 'left', 15],
  ['sorrell_lab', 10, 11, 'up', 8],
  ['hearthmere', 18, 24, 'left', 14],
  ['hearthmere', 4, 24, 'right', 20],
  ['hearthmere', 14, 24, 'up', 17],
  ['hearthmere', 14, 7, 'right', 8],
  ['hearthmere', 27, 7, 'left', 12],
  ['hearthmere', 25, 10, 'up', 4],
  ['hearthmere', 2, 7, 'right', 12],
  ['hearthmere', 8, 7, 'up', 3],
  ['hearthmere', 12, 16, 'right', 9],
  ['hearthmere', 6, 26, 'right', 20],
];

for (const [map, x, y, dir, tiles] of runs) {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, dir));
  await d.loadWait(900);
  const p0 = d.probe().pos;
  const code = KEY[dir];
  d.down(code);
  d.tick(Math.ceil(tiles * 13) + 20);
  d.up(code);
  d.tick(6);
  out.push(`${map} ${p0} ${dir} x${tiles} -> ${d.probe().pos}`);
}
return { out };
