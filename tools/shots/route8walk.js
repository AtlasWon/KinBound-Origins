// Walks Route 8, the charcoal hollow and the Wintergate, and photographs them
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
for (const t of ['r8_drover', 'r8_forester', 'r8_agent', 'r8_carter', 'r8_warden',
  'r8k_burner', 'r8p_packman', 'r8p_iceman', 'r8p_lakewarden', 'r8p_gatewarden']) {
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

/* --------------------------------------------------------------- Route 8 */
await enter('route_8', 82, 22);
await goTo(76, 22);
await shot('r8-01-lastfield');            // the capital's macadam, the last gate
await goTo(60, 20);
await shot('r8-02-pinewood');             // the treeline closing over the road
await goTo(41, 17);
await shot('r8-03-station');              // the Foundation weather station below
await goTo(33, 12);
await shot('r8-04-rockyhills');           // scree, and the first snow in the hollows
await goTo(31, 18);
await shot('r8-05-slide');                // the avalanche fan across the old road
await goTo(18, 9);
await shot('r8-06-cairns');               // the cairn line, in the fall
await goTo(6, 9);
await shot('r8-07-shelf');                // the sealed bench above the road

/* ---------------------------------------------------------- the hollow */
await enter('route_8_kiln', 16, 27, 'up');
await goTo(17, 18);
await shot('r8k-01-kiln');

/* ------------------------------------------------------- the Wintergate */
await enter('route_8_pass', 74, 30);
await shot('r8p-01-treeline');
await goTo(54, 24);
await shot('r8p-02-lakehead');            // the head of the west lane onto the ice
await goTo(40, 21);
await shot('r8p-03-icecrossing');         // out on the tarn, rotten rim in view
await goTo(41, 24);
await shot('r8p-04-thehole');             // the cut, and the islet
await goTo(24, 12);
await shot('r8p-05-refuge');
await goTo(14, 21);
await shot('r8p-06-wintergate');
await goTo(3, 21);
await shot('r8p-07-descent');            // Frostmere's gate, three tiles on

/* --------------------------------------------------------- the whiteout
 *
 * The one thing on these maps that cannot be photographed by standing
 * somewhere: the squall is a function of the player's position AND the clock,
 * so a shot taken at an arbitrary tick catches whatever the weather happens to
 * be doing. This asks src/gfx/snowfall.ts itself when the next bad half-minute
 * is, runs the game forward to it, and photographs the top of it.
 */
const { squallAt } = await import('/build/js/gfx/snowfall.js');
await goTo(14, 21);
{
  const scene = top();
  const cx = scene.player.centerX, cy = scene.player.footY - 8;
  let best = -1, at = 0;
  for (let t = 0; t < 3600; t += 4) {
    const v = squallAt(cx, cy, d.game.ticks + t);
    if (v > best) { best = v; at = t; }
  }
  note(`worst squall within a minute of the gate: ${best.toFixed(2)}, ${at} ticks away`);
  d.tick(at);
  await shot('r8p-08-whiteout', 2);
  note(`squall at the shutter: ${squallAt(cx, cy, d.game.ticks).toFixed(2)}`);
}             // Frostmere's gate, three tiles on

return { log, probe: d.probe(), out };
