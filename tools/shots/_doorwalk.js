// Enter every interior through its own door and try to walk in.
// Reports where the player actually ends up after three steps forward.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(1400);
d.key('Enter', 20); await d.loadWait(400);
d.key('Enter', 20); await d.loadWait(900);
for (let i = 0; i < 30 && top().name !== 'overworld'; i++) d.key('Enter', 12);
out.push('base ' + top().name);
const state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;

const KEY = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' };
const go = (dir, tiles) => { d.down(KEY[dir]); d.tick(Math.ceil(tiles * 10) + 2); d.up(KEY[dir]); d.tick(4); };

// map id -> entry tile (the door), from each map's warp target
const ROOMS = [
  ['marrow_house_player', 6, 7],
  ['marrow_house_up', 10, 4],
  ['marrow_house_neighbour', 6, 7],
  ['ashgate_house_a', 6, 7],
  ['ashgate_house_b', 6, 7],
  ['ashgate_waystation', 6, 9],
  ['ashgate_provisioner', 6, 7],
  ['brackwater_house', 6, 7],
  ['brackwater_waystation', 6, 9],
  ['brackwater_provisioner', 6, 9],
  ['brackwater_bastion', 8, 16],
  ['kellowmere_house_a', 6, 7],
  ['kellowmere_house_b', 6, 7],
  ['kellowmere_waystation', 6, 9],
  ['kellowmere_provisioner', 6, 7],
  ['kellowmere_bastion', 7, 15],
  ['tanners_house', 6, 7],
  ['tanners_waystation', 6, 9],
  ['tanners_provisioner', 6, 9],
  ['tanners_concord', 6, 9],
  ['vess_station', 8, 10],
  ['ashgate_house_b_up', 10, 4],
  ['kellowmere_house_b_up', 9, 3],
  ['tanners_house_up', 10, 4],
  ['brackwater_waystation_up', 12, 4],
];

for (const [m, x, y] of ROOMS) {
  d.game.scenes.replaceAll(new Overworld(state, m, x, y, 'up'));
  await d.loadWait(900);
  for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);
  d.tick(4);
  const start = d.probe().pos;
  go('up', 4);
  const after = d.probe().pos;
  const moved = parseInt(start.split(',')[1], 10) - parseInt(after.split(',')[1], 10);
  out.push(m + ' door=' + start + ' after4up=' + after + ' moved=' + moved + (moved < 3 ? '  <<< BLOCKED' : ''));
  await d.shoot('dw-' + m, 8, 1);
}
return { out };
