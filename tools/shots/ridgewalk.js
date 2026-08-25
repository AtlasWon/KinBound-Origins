/*
 * Eastwind Ridge, Salthollow and the coast road: connectivity, then pictures.
 *
 * Two jobs, deliberately kept apart.
 *
 * 1. REACHABILITY is answered by a breadth-first search over the ENGINE'S OWN
 *    collision grid -- map.collisionAt, the same numbers the player is stopped
 *    by -- starting from the tile the player actually arrives on. Every warp,
 *    item, NPC and readable on the map is then checked against that set, and
 *    anything stranded is named. This is stricter than walking the route and it
 *    cannot be thrown off by a held key landing a frame late, which is what
 *    made three earlier versions of this driver report a working map as broken.
 *
 * 2. PICTURES are taken by putting the player on the tile and rendering, once
 *    the tile has been proved reachable by (1). Photographing a place the
 *    search says is stranded is refused, loudly, rather than quietly framed.
 *
 *   node tools/serve.js
 *   npx electron tools/capture.cjs tools/shots/ridgewalk.js
 */
const d = window.dev;
const top = () => d.game.scenes.top;
const log = [];
const note = (s) => log.push(s);
const clear = () => { for (let i = 0; i < 60 && top().name === 'dialogue'; i++) d.key('Enter', 8); d.tick(4); };

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
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;
const { registry } = await import('/build/js/data/registry.js');
// An empty party switches wild encounters off (OverworldScene.tryEncounter
// returns early), and a defeated trainer does not challenge on sight, so the
// pass photographs the route instead of fighting its way down it.
state.party.length = 0;
for (const id of registry.trainers.keys()) state.markDefeated(id);
for (const art of (window.__RIDGE_ARTS || ['clear', 'shoulder'])) state.giveArt?.(art);

const load = async (mapId, x, y) => {
  d.game.scenes.replaceAll(new Overworld(state, mapId, x, y, 'down'));
  await d.loadWait(1000);
  clear();
  return top().map;
};

/** Everything the player can stand on from `start`, by the engine's own rules. */
const walkable = (map, sx, sy) => {
  const seen = new Set([sy * map.width + sx]);
  const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = x + dx, ny = y + dy;
      if (!map.inBounds(nx, ny)) continue;
      const c = map.collisionAt(nx, ny);
      // 0 open, 6 tall grass, 3 ledge (downhill only). Water (2 and 8) is a
      // field art the player does not hold in Act 2, so it counts as a wall.
      if (!(c === 0 || c === 6 || c === 3)) continue;
      if (c === 3 && dy !== 1) continue;
      if (map.collisionAt(x, y) === 3 && dy !== 1) continue;
      const k = ny * map.width + nx;
      if (seen.has(k)) continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  return seen;
};

const PLAN = window.__RIDGE_PLAN || [
  { map: 'route_3', from: [1, 13],
    shots: [[4, 14, 'r3-01-gate'], [13, 16, 'r3-02-dray'], [33, 13, 'r3-03-whistle'],
      [12, 9, 'r3-04-works'], [20, 4, 'r3-05-crest'], [33, 4, 'r3-06-tarin'],
      [46, 9, 'r3-07-windstation'], [29, 23, 'r3-08-bridge'], [45, 25, 'r3-09-droveroad'],
      [20, 29, 'r3-10-boundarystone']],
    // Wade only, and only after the Tide Hall: not meant to be reachable yet.
    allowStranded: ['item_r3_pool'] },
  { map: 'route_3_whistle', from: [9, 14],
    shots: [[10, 12, 'r3w-01-throat'], [5, 8, 'r3w-02-climb'], [10, 4, 'r3w-03-gallery'], [14, 7, 'r3w-04-farend']],
    allowStranded: ['item_r3w_pocket'] },
  { map: 'tanners_rest', from: [2, 15],
    shots: [[6, 15, 'sh-01-gate'], [10, 5, 'sh-02-tanyard'], [9, 10, 'sh-03-clinic'],
      [19, 15, 'sh-04-crossroads'], [20, 15, 'sh-05-longtable'], [34, 15, 'sh-06-shutroad'],
      [29, 11, 'sh-07-provisioner'], [8, 23, 'sh-08-concord'], [13, 27, 'sh-09-paddock'],
      [20, 29, 'sh-10-coastgate']] },
  { map: 'route_4', from: [19, 1],
    shots: [[19, 3, 'r4-01-gate'], [9, 7, 'r4-02-firstpass'], [16, 12, 'r4-03-windstair'],
      [33, 15, 'r4-04-headland'], [26, 20, 'r4-05-pans'], [30, 18, 'r4-06-hollowmouth'],
      [15, 26, 'r4-07-strand'], [5, 31, 'r4-08-cove'], [14, 32, 'r4-09-tideglassgate']],
    allowStranded: ['item_r4_farcove'] },
  { map: 'route_4_hollow', from: [9, 10],
    shots: [[9, 6, 'r4h-01-hollow'], [4, 4, 'r4h-02-back']] },
];

const out = [];
let problems = 0;
for (const step of PLAN) {
  const map = await load(step.map, step.from[0], step.from[1]);
  if (!map || map.id !== step.map) { note(`${step.map}: FAILED TO LOAD`); problems++; continue; }
  const reach = walkable(map, step.from[0], step.from[1]);
  const at = (x, y) => reach.has(y * map.width + x);
  note(`${step.map} ${map.width}x${map.height}: ${reach.size} tiles reachable from ${step.from}`);

  for (const w of map.warps) {
    if (!at(w.x, w.y)) { note(`  STRANDED warp -> ${w.toMap} at ${w.x},${w.y}`); problems++; }
  }
  for (const n of map.npcs) {
    if (!at(n.x, n.y)) { note(`  STRANDED npc ${n.id} at ${n.x},${n.y}`); problems++; }
  }
  for (const o of map.objects) {
    const tag = o.flag || `${o.kind}@${o.x},${o.y}`;
    if ((step.allowStranded || []).includes(tag)) continue;
    if (o.kind === 'sign' || o.kind === 'script') {
      const near = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => at(o.x + dx, o.y + dy));
      if (!near) { note(`  UNREADABLE ${o.kind} at ${o.x},${o.y}`); problems++; }
    } else if (!at(o.x, o.y)) {
      note(`  STRANDED ${o.kind} ${tag} at ${o.x},${o.y}`); problems++;
    }
  }

  // A short walk at the entrance, so the pass still proves the player can move
  // on this map at all rather than only that the grid says they could.
  const before = d.probe().pos;
  for (let i = 0; i < 3; i++) { d.hold('KeyD', 12); d.tick(2); }
  note(`  walk test: ${before} -> ${d.probe().pos}`);

  for (const [x, y, name] of step.shots) {
    if (!at(x, y)) { note(`  REFUSED to photograph ${name}: ${x},${y} is not reachable`); problems++; continue; }
    await load(step.map, x, y);
    d.tick(16);
    out.push(await d.shoot(name, 6, 2));
    note(`  ${name} at ${d.probe().pos}`);
  }
}
return { problems, log, out };
