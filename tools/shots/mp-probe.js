// Does the new geometry actually behave? Four things the pictures cannot show:
// the ledge hops two tiles, the stones are shut without Shoulder, the trainers
// see down the corridors they were placed to watch, and the roads join up.
const d = window.dev;
const top = () => d.game.scenes.top;
const clear = () => { for (let i = 0; i < 30 && top().name === 'dialogue'; i++) d.key('Enter', 10); d.tick(4); };

await d.loadWait(1200);
d.key('Enter', 20); await d.loadWait(400);
d.key('Enter', 20); await d.loadWait(600);
const state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;

const go = async (map, x, y, facing) => {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing || 'down'));
  await d.loadWait(900);
  clear();
};
const pos = () => d.probe().pos;
const out = [];

// --- ledges: a hop must cross the ledge tile and land beyond it.
for (const [map, x, y, want] of [
  ['route_1', 14, 23, '14,25'], ['route_1', 4, 17, '4,19'],
  ['route_2', 14, 21, '14,23'], ['route_2', 6, 21, '6,23'],
  ['route_2', 15, 10, '15,12'], ['route_2', 23, 10, '23,12'],
  ['route_3', 15, 14, '15,16'], ['route_3', 26, 22, '26,24'],
  ['route_4', 5, 7, '5,9'], ['route_4', 7, 16, '7,18'],
]) {
  await go(map, x, y, 'down');
  d.key('KeyS', 2); d.tick(46);
  out.push(`ledge ${map} ${x},${y} -> ${pos()} (want ${want}) ${pos() === want ? 'OK' : 'FAIL'}`);
}

// --- ledges are one-way: walking up at one must not pass.
for (const [map, x, y] of [['route_1', 14, 25], ['route_2', 14, 23], ['route_4', 7, 18]]) {
  await go(map, x, y, 'up');
  d.hold('KeyW', 40); d.tick(20);
  out.push(`ledge-up ${map} ${x},${y} -> ${pos()} ${pos() === `${x},${y}` ? 'OK blocked' : 'PASSED THROUGH'}`);
}

// --- stones: shut until Shoulder, which the player does not have here.
for (const [map, x, y, dir, key] of [
  ['route_2', 23, 7, 'right', 'KeyD'], ['route_3', 27, 15, 'down', 'KeyS'],
]) {
  await go(map, x, y, dir);
  d.hold(key, 50); d.tick(20);
  out.push(`stone ${map} from ${x},${y} -> ${pos()} ${pos() === `${x},${y}` ? 'OK shut' : 'OPEN WITHOUT SHOULDER'}`);
}

// --- trainer sight: walk into the corridor each one was placed to watch.
for (const [map, x, y, key, who] of [
  ['route_1', 9, 27, 'KeyW', 'madden'],
  ['route_1', 20, 27, 'KeyW', 'ottel'],
  ['route_1', 15, 9, 'KeyW', 'cale'],
  ['route_2', 16, 28, 'KeyW', 'dell'],
  ['route_2', 19, 26, 'KeyW', 'juna'],
  ['route_3', 8, 7, 'KeyW', 'bram'],
  ['route_4', 15, 8, 'KeyW', 'teal'],
  ['route_1', 15, 6, 'KeyW', 'surveyor'],
  ['route_2', 11, 17, 'KeyW', 'pike'],
  ['route_2', 13, 7, 'KeyW', 'wren'],
  ['route_3', 12, 13, 'KeyW', 'sill'],
  ['route_3', 25, 20, 'KeyW', 'holt'],
  ['route_3', 27, 21, 'KeyD', 'ivo'],
  ['route_4', 17, 14, 'KeyW', 'gorse'],
  ['route_4', 18, 17, 'KeyW', 'nesh'],
  ['route_4', 15, 23, 'KeyW', 'bay'],
]) {
  await go(map, x, y, 'up');
  d.hold(key, 90); d.tick(30);
  out.push(`sight ${who}: scene=${top().name} at ${pos()}`);
  clear();
}

return { out };
