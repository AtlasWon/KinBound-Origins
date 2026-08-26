// Act 5, the storm: proves the changed NPC lines actually reach the screen.
//
// The job this verifies is dialogue, not geometry, so it does not walk the
// whole region -- but it does not cheat on collision either. For each NPC it
// scans the loaded map for a WALKABLE tile beside them, checks that tile is
// reachable from somewhere else on the map by breadth-first search over the
// map's own collision (so it cannot be a sealed pocket inside scenery), stands
// there, faces the NPC and talks. Then it reads the dialogue box back.
//
// It runs the same NPC twice: once on a clean save, once with act4_done set,
// and reports both texts. If the two are identical the variant did not fire.

const d = window.dev;
const top = () => d.game.scenes.top;
const log = [];

const boot = async () => {
  await d.loadWait(1400);
  for (let i = 0; i < 90 && top().name !== 'title'; i++) d.key('Enter', 10);
  if (top().name === 'title' && top().menu) { top().menu.index = 0; d.key('Enter', 24); }
  for (let i = 0; i < 60 && top().name !== 'creator'; i++) d.key('Enter', 10);
  for (let i = 0; i < 30; i++) {
    const rows = top().rows();
    if ((rows[top().sel] || {}).action === 'begin') break;
    d.key('KeyS', 2);
  }
  d.key('Enter', 60);
  await d.loadWait(1400);
  for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);
};

const place = async (map, x, y, facing) => {
  const scene = top();
  scene.state.currentMap = map;
  d.game.scenes.replaceAll(new (scene.constructor)(scene.state, map, x, y, facing || 'up'));
  await d.loadWait(1100);
  for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);
};

const walkable = (m, x, y) => m.inBounds(x, y) && m.collisionAt(x, y) !== 1;

/* How many tiles can be reached from here? A one-tile pocket is scenery. */
const reachCount = (m, sx, sy) => {
  const seen = new Set([`${sx},${sy}`]);
  const q = [[sx, sy]];
  while (q.length && seen.size < 400) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (seen.has(k) || !walkable(m, nx, ny)) continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  return seen.size;
};

/* A walkable tile beside the NPC, and the way to face from it. */
const standBeside = (m, nx, ny) => {
  const tries = [
    [nx, ny + 1, 'up'], [nx, ny - 1, 'down'],
    [nx - 1, ny, 'right'], [nx + 1, ny, 'left'],
  ];
  for (const [x, y, facing] of tries) {
    if (!walkable(m, x, y)) continue;
    if (reachCount(m, x, y) < 30) continue;      // sealed inside scenery
    return { x, y, facing };
  }
  return null;
};

/* Stand beside an NPC and read what they say. */
const speakTo = async (mapId, npcId, shot) => {
  await place(mapId, 1, 1, 'down');              // load the map; position is fixed up below
  const m = top().map;
  const npc = (m.npcs || []).find((n) => n.id === npcId || n.script === npcId);
  if (!npc) { log.push(`${mapId}/${npcId}: no such NPC`); return null; }
  const spot = standBeside(m, npc.x, npc.y);
  if (!spot) { log.push(`${mapId}/${npcId}: nowhere reachable to stand`); return null; }
  await place(mapId, spot.x, spot.y, spot.facing);
  d.key('Enter', 12);
  let text = '';
  for (let i = 0; i < 12 && top().name === 'dialogue'; i++) {
    const p = d.probe();
    if (p.text) text += (text ? ' | ' : '') + p.text;
    if (shot && i === 0) await d.shoot(shot, 6, 2);
    d.key('Enter', 10);
  }
  d.tick(4);
  return text;
};

const CAST = [
  ['tideglass', 'tg_gaugeman'],
  ['tideglass', 'tg_child'],
  ['tideglass', 'tg_harbourmaster'],
  ['briarbell', 'bb_bellwright'],
  ['briarbell', 'bb_farmer'],
  ['marlbeck', 'mb_engineman'],
  ['marlbeck', 'mb_child'],
  ['mirehaven', 'mh_stiltwright'],
  ['mirehaven', 'mh_child'],
  ['tanners_rest', 'tr_bellman'],
  ['hearthmere', 'hearth_villager'],
  ['hearthmere', 'hearth_kid'],
  ['hearthmere', 'hearth_fisher'],
  ['hearthmere', 'hearth_trader'],
  ['stonewake', 'sw_carter'],
  ['stonewake', 'sw_lamplighter'],
  ['emberfall', 'ef_ash_sweeper'],
  ['emberfall', 'ef_slag_child'],
  ['harrowgate', 'hg_master'],
  ['harrowgate', 'hg_farmer'],
  ['aureline', 'au_park_keeper'],
  ['aureline', 'au_spires_broker'],
];

await boot();

// Pass one: the world before the theft.
const before = {};
for (const [map, npc] of CAST) before[`${map}/${npc}`] = await speakTo(map, npc, null);

// Pass two: Meridian have the Tideheart and the weather has turned.
top().state.setFlag('act4_done');
log.push(`act4_done=${top().state.hasFlag('act4_done')}`);

const after = {};
const shots = [
  ['tideglass', 'tg_gaugeman', 'storm-01-tideglass-gauge'],
  ['briarbell', 'bb_bellwright', 'storm-02-briarbell-bells'],
  ['marlbeck', 'mb_child', 'storm-03-marlbeck-child'],
  ['hearthmere', 'hearth_villager', 'storm-04-hearthmere-well'],
];
const shotFor = (map, npc) => (shots.find((s) => s[0] === map && s[1] === npc) || [])[2] || null;
for (const [map, npc] of CAST) after[`${map}/${npc}`] = await speakTo(map, npc, shotFor(map, npc));

const changed = [], same = [], missing = [];
for (const key of Object.keys(before)) {
  if (before[key] === null || after[key] === null) { missing.push(key); continue; }
  (before[key] !== after[key] ? changed : same).push(key);
}

return {
  log,
  changed: changed.length,
  unchanged: same,
  missing,
  sample: Object.fromEntries(changed.slice(0, 6).map((k) => [k, after[k]])),
};
