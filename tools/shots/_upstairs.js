// Every new upper floor: step onto the stairs, shoot the room, step back.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(1400);
d.key('Enter', 20); await d.loadWait(400);
d.key('Enter', 20); await d.loadWait(900);
for (let i = 0; i < 30 && top().name !== 'overworld'; i++) d.key('Enter', 12);
const state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;

const KEY = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' };
const go = (dir, tiles) => { d.down(KEY[dir]); d.tick(Math.ceil(tiles * 14) + 2); d.up(KEY[dir]); d.tick(6); };
const clear = () => { for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10); d.tick(4); };

// down map, tile to stand on, direction onto the stairs, the way back down
const PAIRS = [
  ['briarbell_house_b', 10, 2, 'up', 'down'],
  ['kellowmere_house_b', 10, 3, 'down', 'up'],
  ['tanners_house', 10, 5, 'up', 'down'],
  ['brackwater_clinic', 12, 4, 'up', 'down'],
];

for (const [m, x, y, dir, back] of PAIRS) {
  d.game.scenes.replaceAll(new Overworld(state, m, x, y, dir));
  await d.loadWait(900); clear();
  await d.shoot('up-' + m + '-0-down', 8, 1);
  go(dir, 1);
  await d.loadWait(900); clear();
  const u = d.probe();
  out.push(m + ' -> ' + u.map + ' at ' + u.pos);
  await d.shoot('up-' + m + '-1-up', 8, 1);
  // Look around the upper floor a little, then come back down.
  go('left', 3);
  await d.shoot('up-' + m + '-2-look', 8, 1);
  go('right', 3);
  go(back, 1);
  await d.loadWait(900); clear();
  out.push('  back -> ' + d.probe().map + ' at ' + d.probe().pos);
}
return { out };
