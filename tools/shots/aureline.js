// Walks Aureline and photographs it at 1x.
//
// Steers by breadth-first search over the map's own collision, the way
// tools/shots/act1.js and tools/shots/mirewalk.js do, because a driver that
// walks into a wall and calls it a missing district is worse than no driver at
// all. Every target below is a tile the search proved it could reach from where
// it was standing; anything it could not reach is reported as "GAVE UP" and
// named, never quietly skipped.
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

// Twelve ticks a step, a shade under the fifteen a tile takes at walking speed,
// so the body is still finishing one step as the next key goes down and a long
// run flows instead of stuttering. Overshoot is the thing to avoid.
const goTo = async (tx, ty) => {
  // Twelve attempts, not four. Aureline is a hundred and fifty-two cells across
  // and a walk from the Southgate to the Summit gate is two hundred and ten
  // steps; a run that long drifts a tile or two off the plan and a four-attempt
  // loop then reports "GAVE UP" about a route the search had already proved.
  // A driver that lies about the map is worse than no driver.
  for (let attempt = 0; attempt < 12; attempt++) {
    for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 8);
    if (top().name !== 'overworld') return false;
    const [x, y] = (d.probe().pos || '0,0').split(',').map(Number);
    if (x === tx && y === ty) return true;
    let steps = route(x, y, tx, ty);
    // A target can be legal and still have somebody standing on it: the crowd
    // is solid and half of it is pacing. Aim at a neighbour rather than
    // reporting the district unreachable, which is the kind of lie this driver
    // exists to avoid.
    if (!steps) {
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1]]) {
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
  return x === tx && y === ty;
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
for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 8);

const state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;

// Enter where a player entering actually enters: on the road inside the
// Southgate, on ground the map says is walkable.
const enter = async (x, y) => {
  d.game.scenes.replaceAll(new Overworld(state, 'aureline', x, y, 'up'));
  await d.loadWait(1400);
  for (let i = 0; i < 30 && top().name === 'dialogue'; i++) d.key('Enter', 8);
};
await enter(75, 118);
note(`entered at ${d.probe().pos} on ${d.probe().map}`);

const shots = [
  ['au-01-southgate', 75, 113],
  ['au-02-candlerow', 45, 105],
  ['au-03-candlerow-lane', 20, 99],
  ['au-04-mile-south', 70, 96],
  ['au-05-stationroad', 100, 91],
  ['au-06-station', 130, 108],
  ['au-07-forecourt', 122, 111],
  ['au-08-arcades', 92, 63],
  ['au-09-arcade-lane', 96, 74],
  ['au-10-eastfield', 130, 71],
  ['au-11-mile-park', 65, 74],
  ['au-12-park-lake', 22, 74],
  ['au-13-glasshouse', 55, 69],
  ['au-14-crossway', 80, 55],
  ['au-15-museum', 85, 53],
  ['au-16-mile-mid', 70, 47],
  ['au-17-square', 40, 50],
  ['au-18-tower-foot', 41, 41],
  ['au-19-spires', 95, 36],
  ['au-20-spire-alley', 108, 32],
  ['au-21-campusrow', 66, 21],
  ['au-22-campus', 45, 15],
  ['au-23-highwater', 11, 29],
  ['au-24-summit', 133, 15],
];

for (const [name, tx, ty] of shots) {
  const ok = await goTo(tx, ty);
  // Bumping a signpost on the way opens a text box, and a screenshot of a text
  // box is not a screenshot of a district.
  for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 8);
  if (top().name !== 'overworld' || d.probe().map !== 'aureline') {
    note(`${name}: LEFT THE MAP for ${d.probe().map} -- returning`);
    await enter(75, 118);
    continue;
  }
  await d.shoot(name, 6);
  note(`${name}: ${ok ? 'reached' : 'GAVE UP short of'} ${tx},${ty} -- standing at ${d.probe().pos}`);
}

// Every door, walked to rather than assumed. A door the search cannot reach is
// a door that is not in the game.
const doors = (top().map.warps || []).filter((w) => w.style === 'door');
const seenDoor = new Set();
for (const w of doors) {
  if (seenDoor.has(w.toMap)) continue;
  seenDoor.add(w.toMap);
  const ok = await goTo(w.x, w.y + 1);
  // "Did not arrive" and "cannot be arrived at" are completely different
  // findings and reporting them as one word is how a driver ends up claiming a
  // door is missing when what actually happened is that a long run drifted a
  // tile. Ask the search directly before saying anything.
  let verdict = 'reached';
  if (!ok) {
    const [px, py] = (d.probe().pos || '0,0').split(',').map(Number);
    verdict = route(px, py, w.x, w.y + 1) ? 'route exists, walk drifted short of' : 'NO ROUTE to';
  }
  note(`door ${w.toMap} at ${w.x},${w.y}: ${verdict} (stood at ${d.probe().pos})`);
  if (top().name !== 'overworld' || d.probe().map !== 'aureline') {
    note(`  -> walked through into ${d.probe().map}`);
    await enter(75, 118);
  }
}

return { log, probe: d.probe() };
