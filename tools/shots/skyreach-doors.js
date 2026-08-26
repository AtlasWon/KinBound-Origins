// Every Skyreach door, opened one at a time from the tile in front of it.
//
// The long walk-through driver is good at proving a ROUTE and bad at proving a
// DOOR: a step script or a stray dialogue box anywhere along eighty tiles ends
// the attempt, and the report then blames whatever door it had not reached yet.
// This does the opposite -- it stands the player on the tile outside each
// entrance in turn and walks one step into it -- so a failure here is the door
// and nothing else.

const d = window.dev;
const top = () => d.game.scenes.top;
const clear = () => { for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 8); d.tick(4); };
const log = [];

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
clear();

const state = top().state;
for (let n = 1; n <= 6; n++) state.giveCrest(n, 'test');
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;

// [label, map, stand-on x, y, key, expected map]
const DOORS = [
  ['clinic', 'skyreach', 12, 28, 'KeyW', 'skyreach_clinic'],
  ['provisioner', 'skyreach', 20, 28, 'KeyW', 'skyreach_provisioner'],
  ['inn', 'skyreach', 11, 38, 'KeyW', 'skyreach_inn'],
  ['house A', 'skyreach', 20, 38, 'KeyW', 'skyreach_house_a'],
  ['house B', 'skyreach', 19, 53, 'KeyW', 'skyreach_house_b'],
  ['wind house', 'skyreach', 7, 12, 'KeyW', 'skyreach_turbinehouse'],
  ['Cradle, west', 'skyreach', 25, 17, 'KeyW', 'skyreach_lift'],
  ['Cradle, east', 'skyreach', 50, 17, 'KeyW', 'skyreach_lift'],
  ['dock office', 'skyreach', 61, 18, 'KeyW', 'skyreach_dockoffice'],
  ['market', 'skyreach', 68, 29, 'KeyW', 'skyreach_market'],
  ['THE MASTHOUSE', 'skyreach', 59, 49, 'KeyW', 'skyreach_hall'],
  ['the spurs', 'skyreach_hall', 9, 1, 'KeyW', 'skyreach_hall_spurs'],
  ['back off the spurs', 'skyreach_hall_spurs', 18, 37, 'KeyS', 'skyreach_hall'],
  ['out of the Masthouse', 'skyreach_hall', 8, 13, 'KeyS', 'skyreach'],
  ['out of the west car', 'skyreach_lift', 1, 3, 'KeyA', 'skyreach'],
  ['out of the east car', 'skyreach_lift', 9, 3, 'KeyD', 'skyreach'],
  ['the road west, to Route 9', 'skyreach', 1, 41, 'KeyA', 'route_9'],
  ['the road south-east, to Route 10', 'skyreach', 60, 58, 'KeyS', 'route_10'],
];

for (const [label, from, x, y, key, want] of DOORS) {
  d.game.scenes.replaceAll(new Overworld(state, from, x, y, 'down'));
  await d.loadWait(1200);
  clear();
  const stood = d.probe().pos;
  for (let i = 0; i < 4 && d.probe().map === from; i++) { d.hold(key, 14); d.tick(4); clear(); }
  await d.loadWait(900);
  clear();
  const got = d.probe().map;
  log.push(`${got === want ? 'ok  ' : 'FAIL'} ${label}: stood ${from} ${stood}, ${key} -> ${got} ${d.probe().pos}${got === want ? '' : ` (wanted ${want})`}`);
}

// And the Hall's own floor, walked: three gantries up to the Keeper and four
// cornices back down to the sill. Pathfound over the map's own collision, with
// the trainers counted as obstacles the way the town's NPCs are, so a gantry
// that does not join is a GAVE UP and nothing else can produce one.
const route = (sx, sy, tx, ty) => {
  const map = top().map;
  const key = (x, y) => `${x},${y}`;
  const blocked = new Set((top().npcs || []).map((n) => key(n.actor.tileX, n.actor.tileY)));
  const open = (x, y) => map.inBounds(x, y) && map.collisionAt(x, y) !== 1
    && !(blocked.has(key(x, y)) && !(x === tx && y === ty));
  const from = new Map([[key(sx, sy), null]]);
  const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    if (x === tx && y === ty) break;
    for (const [dx, dy, k] of [[0, -1, 'KeyW'], [0, 1, 'KeyS'], [-1, 0, 'KeyA'], [1, 0, 'KeyD']]) {
      const nx = x + dx, ny = y + dy;
      if (!open(nx, ny) || from.has(key(nx, ny))) continue;
      from.set(key(nx, ny), [x, y, k]);
      q.push([nx, ny]);
    }
  }
  if (!from.has(key(tx, ty))) return null;
  const steps = [];
  let cur = [tx, ty];
  for (;;) {
    const prev = from.get(key(cur[0], cur[1]));
    if (!prev) break;
    steps.unshift(prev[2]);
    cur = [prev[0], prev[1]];
  }
  return steps;
};

// The four trainers on the spurs watch the tiles this walk has to cross, and
// a harness player with no party cannot survive being challenged. Mark them
// beaten: the point of this pass is whether the gantries JOIN, and the fights
// are measured in tests/helpers/simulate.mjs where they belong.
for (const id of ['sh_spur_corran', 'sh_spur_kellow', 'sh_spur_nesse', 'sh_spur_wisp']) state.markDefeated(id);
d.game.scenes.replaceAll(new Overworld(state, 'skyreach_hall_spurs', 18, 37, 'up'));
await d.loadWait(1400);
clear();
for (const [label, tx, ty] of [
  ['the Fan', 18, 26], ['Spur Two', 18, 15], ['the foot of the great mast', 18, 7],
  ['the bridge to the way down', 27, 5], ['the second terrace', 31, 11],
  ['the fourth terrace', 31, 30], ['back on the sill', 18, 37],
]) {
  let ok = false;
  for (let attempt = 0; attempt < 220 && !ok; attempt++) {
    clear();
    const [x, y] = (d.probe().pos || '0,0').split(',').map(Number);
    if (x === tx && y === ty) { ok = true; break; }
    const steps = route(x, y, tx, ty);
    if (!steps || !steps.length) break;
    for (const k of steps.slice(0, 5)) { d.hold(k, 14); d.tick(3); clear(); }
  }
  log.push(`${ok ? 'ok  ' : 'FAIL'} spurs, ${label} -> ${d.probe().pos}`);
}
const shot = await d.shoot('walk-keeper', 8, 2);

return { log, shot };
