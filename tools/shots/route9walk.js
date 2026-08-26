// Walks Route 9, the falls and the Crown Road, and photographs them
// at 1x.
//
// Same contract as tools/shots/aureline.js: every position below is reached by
// breadth-first search over the map's OWN collision from a tile the map says is
// walkable, and anything the search cannot reach is reported by name rather
// than quietly skipped. Teleporting to an arbitrary tile is how a driver ends
// up photographing the inside of a crag and calling it a road.
const d = window.dev;
const top = () => d.game.scenes.top;
const log = [];
const note = (s) => { log.push(s); };

const route = (sx, sy, tx, ty) => {
  const map = top().map;
  if (!map) return null;
  const scene = top();
  const key = (x, y) => `${x},${y}`;
  const open = (x, y) => map.inBounds(x, y) && scene.canEnter(x, y, 'down');
  const from = new Map([[key(sx, sy), null]]);
  const q = [[sx, sy]];
  let head = 0;
  while (head < q.length) {
    const [x, y] = q[head++];
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

const settle = () => { for (let i = 0; i < 30 && top().name === 'dialogue'; i++) d.key('Enter', 8); };

const goTo = async (tx, ty) => {
  for (let attempt = 0; attempt < 10; attempt++) {
    settle();
    if (top().name !== 'overworld') return false;
    const [x, y] = (d.probe().pos || '0,0').split(',').map(Number);
    if (x === tx && y === ty) return true;
    let steps = route(x, y, tx, ty);
    if (!steps) {
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        steps = route(x, y, tx + dx, ty + dy);
        if (steps) break;
      }
    }
    if (!steps) return false;
    const here = d.probe().map;
    for (const k of steps) {
      d.hold(k, 12);
      d.tick(2);
      if (top().name !== 'overworld' || d.probe().map !== here) return true;
    }
  }
  const [x, y] = (d.probe().pos || '0,0').split(',').map(Number);
  return Math.abs(x - tx) + Math.abs(y - ty) <= 1;
};

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
settle();

const state = top().state;
// Act 5 state: the Crests that gate the field arts the road assumes, and the
// theft, so the storm variants of every line on these maps are the ones that
// get shown.
for (const f of ['act4_done', 'act4_theft', 'tideheart_taken', 'crest_5_taken']) state.setFlag?.(f, true);
for (const a of ['clear', 'shoulder', 'kindle', 'wade']) state.giveArt?.(a);
// NO PARTY, AND EVERY TRAINER ON THESE MAPS MARKED BEATEN. Both are needed and
// both are the same decision: this driver is photographing GROUND, and a walk
// across a route with a live bench turns into a wild battle inside twenty
// steps and photographs an arena instead. src/scenes/overworld.ts declines to
// roll an encounter for a player with nothing to send out, which is exactly
// the switch this wants; the defeated list stops the trainers on sight.
for (const t of ['r9_carter', 'r9_ropewalker', 'r9_windwatch', 'r9_shepherd', 'r9_dockrunner',
  'r9f_hermit', 'r10_toll', 'r10_drover', 'r10_terrace', 'r10_courier', 'r10_gatehand']) {
  state.markDefeated?.(t);
}

const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;
const enter = async (map, x, y, dir = 'left') => {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, dir));
  await d.loadWait(1400);
  settle();
  const scene = top();
  const ok = scene.map && scene.canEnter(x, y, 'down');
  note(`enter ${map} at ${x},${y}: ${ok ? 'walkable' : 'NOT WALKABLE'} -- probe says ${d.probe().pos}`);
};

const out = [];
const shot = async (name, ticks = 40) => { out.push(await d.shoot(name, ticks, 1)); };

/* --------------------------------------------------------------- Route 9 */
await enter('route_9', 1, 33, 'right');
await goTo(10, 33);
await shot('r9-01-valley');               // in from the capital, the last trees
await goTo(24, 27);
await shot('r9-02-rim');                  // the gorge opens under the road
await goTo(28, 25);
await shot('r9-03-bridgehead');           // the head of the main bridge
await goTo(34, 25);
await shot('r9-04-crossing');             // out on it, nothing either side
await goTo(30, 14);
await shot('r9-05-gap');                  // the third bridge, and the pinnacle
await goTo(30, 8);
await shot('r9-06-fall');                 // the fall into the gorge
await goTo(50, 24);
await shot('r9-07-plateau');              // combed tussock and the wind boards
await goTo(20, 39);
await shot('r9-08-oldbridge');            // the one-cell walkway south

/* ---------------------------------------------------------- the falls */
await enter('route_9_falls', 20, 28, 'up');
await goTo(20, 20);
await shot('r9f-01-behind');
await goTo(26, 15);
await shot('r9f-02-ledge');

/* ------------------------------------------------------ the Crown Road */
await enter('route_10', 20, 2, 'down');
await shot('r10-01-topofroad');
await goTo(22, 10);
await shot('r10-02-tarn');                // the high lake and the boundary stone
await goTo(30, 20);
await shot('r10-03-descent');
await goTo(37, 25);
await shot('r10-04-arch');                // the wayside arch
await goTo(34, 33);
await shot('r10-05-terraces');            // the abandoned terraces
await goTo(50, 14);
await shot('r10-06-citygate');

/* ------------------------------------------------- the come-back-later gate
 *
 * The two updraft gates are the only thing on these three maps that a walk
 * cannot prove by walking: without the art they are ordinary ground, and the
 * whole point of them is that they stay ordinary until the Gale Hall at the
 * far end of Route 9 hands it over. So the driver grants it and steps on the
 * tile, and reports where it ended up. If Skyreach never grants an art called
 * updraft this is the line that says so.
 */
await enter('route_9', 1, 33, 'right');
state.giveArt('updraft');
await goTo(31, 13);
d.hold('KeyD', 14); d.tick(30);
// The warp inside an event loads a map, and an awaited load only resolves when
// the driver yields to the event loop -- a synchronous run of d.tick() never
// lets it finish, and the scene sits behind a held fade forever. Sleep, do not
// just tick.
await d.sleep(80); d.tick(60); await d.sleep(80); d.tick(60);
for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 8);
d.tick(40);
for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 8);
d.hold('KeyW', 16); d.tick(30); await d.sleep(60);
for (let i = 0; i < 20 && top().name !== 'overworld'; i++) d.key('Enter', 8);
d.tick(20);
note('updraft gate: ended at ' + d.probe().pos + ' on ' + d.probe().map + ' (want 37,13) pinnacle item taken=' + state.hasFlag('item_r9_pinnacle'));
await shot('r9-09-pinnacle');

return { log, probe: d.probe(), out };
