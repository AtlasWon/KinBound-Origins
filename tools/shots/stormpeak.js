// Stage 6, the catastrophe across Caelora: proves the second, worse tier of
// storm dialogue actually reaches the screen, and that it sits ABOVE Act 5's
// tier rather than replacing it.
//
// Same method as tools/shots/storm.js, which verified the Act 5 tier: for each
// NPC, scan the loaded map for a WALKABLE tile beside them, check that tile is
// reachable from elsewhere by breadth-first search over the map's own collision
// (so it cannot be a sealed pocket inside scenery), stand there, face them and
// talk. Nothing is teleported onto an arbitrary tile.
//
// Four passes on the same NPC, because by the time this ran the aftermath had
// been built on top of it and a shadowed tier is a silent failure:
//   1. clean save              -> the calm line
//   2. act4_done               -> the Act 5 storm line
//   3. + neravoss_restrained   -> the Stage 6 catastrophe line
//   4. + act6_done             -> the aftermath line
// All four must differ. If 2 and 3 match the catastrophe block did not fire; if
// 3 and 4 match the catastrophe block is standing on top of the aftermath and
// the region never recovers; if 1 and 2 match this run has broken Act 5. Each
// of those is worth catching and none of them shows up in npm test.

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

/* Stand beside an NPC and read every box they say. */
const speakTo = async (mapId, npcId, shot) => {
  await place(mapId, 1, 1, 'down');              // load the map; position fixed up below
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
    if (shot && i === 0) {
      // Judged at 1x, and after the box is FULL. Waiting out the typewriter on
      // ticks photographs "I have st"; DialogueScene treats a confirm press as
      // skip-the-reveal and only pages on with a second one, so one press fills
      // the box and the shot is of finished text.
      d.key('Enter', 8);
      await d.shoot(shot, 6, 1);
    }
    d.key('Enter', 10);
  }
  d.tick(4);
  return text;
};

// Every entry that gained a Stage 6 block, by the map it is actually placed on.
const CAST = [
  ['tideglass', 'tg_harbourmaster'],
  ['tideglass', 'tg_child'],
  ['tideglass', 'tg_lampkeeper'],
  // tanners_rest FIRST: Salthollow's house interior has no dialogue file of its
  // own, so tr_house lives in tanners_rest.json and is merged when the village
  // loads. A player can only reach that door through the village, so this is
  // the real order -- but a driver that teleports into the house cold would read
  // "..." on the first pass and score a step it had not earned.
  ['tanners_rest', 'tr_beaconwatch'],
  ['tanners_rest', 'tr_bellman'],
  ['tanners_house', 'tr_house'],
  ['marlbeck', 'mb_engineman'],
  ['marlbeck', 'mb_child'],
  ['hearthmere', 'hm_villager'],
  ['hearthmere', 'hm_kid'],
  ['hearthmere', 'hm_trader'],
  ['mirehaven', 'mh_ferrywoman'],
  ['mirehaven', 'mh_stiltwright'],
  ['harrowgate', 'hg_master'],
  ['aureline', 'au_park_keeper'],
  ['aureline', 'au_station_clerk'],
  ['stonewake', 'sw_warden'],
  ['frostmere', 'fm_metcrew'],
  ['briarbell', 'bb_bellwright'],
];

await boot();

// Pass one: calm.
const calm = {};
for (const [map, npc] of CAST) calm[`${map}/${npc}`] = await speakTo(map, npc, null);

// Pass two: Act 5 -- Meridian have the Tideheart and the weather has turned.
top().state.setFlag('act4_done');
const act5 = {};
for (const [map, npc] of CAST) act5[`${map}/${npc}`] = await speakTo(map, npc, null);

// Pass three: Stage 6 -- the restraints are on Neravoss and the region is hit.
top().state.setFlag('neravoss_restrained');
log.push(`act4_done=${top().state.hasFlag('act4_done')}`
  + ` neravoss_restrained=${top().state.hasFlag('neravoss_restrained')}`);

const peak = {};
for (const [map, npc] of CAST) peak[`${map}/${npc}`] = await speakTo(map, npc, null);

// Pass four: the aftermath. Neravoss is calm and the region is putting itself
// back together. This tier belongs to somebody else; it is read here only to
// prove the catastrophe tier is not sitting on top of it.
top().state.setFlag('neravoss_calm');
top().state.setFlag('act6_done');
const after = {};
for (const [map, npc] of CAST) after[`${map}/${npc}`] = await speakTo(map, npc, null);

// Pass five: the pictures, separately, so that pressing confirm to fill the box
// cannot disturb the four readings the comparison below is made of. Back down
// to the catastrophe tier first -- setFlag(f, false) is the documented way off
// a flag -- because these shots are of THIS tier, not the aftermath above it.
top().state.setFlag('act6_done', false);
top().state.setFlag('neravoss_calm', false);
const shots = [
  ['tideglass', 'tg_harbourmaster', 'peak-01-tideglass-harbour'],
  ['tideglass', 'tg_child', 'peak-02-tideglass-child'],
  ['tideglass', 'tg_lampkeeper', 'peak-03-tideglass-light'],
  ['marlbeck', 'mb_engineman', 'peak-04-marlbeck-buckets'],
  ['tanners_rest', 'tr_bellman', 'peak-05-salthollow-bell'],
  ['hearthmere', 'hm_kid', 'peak-06-hearthmere-book'],
  ['aureline', 'au_park_keeper', 'peak-07-aureline-park'],
];
for (const [map, npc, name] of shots) await speakTo(map, npc, name);

const stepped = [], flatAt5 = [], flatAtPeak = [], flatAtAftermath = [], missing = [];
for (const key of Object.keys(calm)) {
  const four = [calm[key], act5[key], peak[key], after[key]];
  if (four.some((t) => t === null)) { missing.push(key); continue; }
  if (act5[key] === calm[key]) flatAt5.push(key);
  if (peak[key] === act5[key]) flatAtPeak.push(key);
  if (after[key] === peak[key]) flatAtAftermath.push(key);
  if (new Set(four).size === 4) stepped.push(key);
}

return {
  log,
  cast: CAST.length,
  allFourTiersDistinct: stepped.length,
  didNotStepAtAct5: flatAt5,
  didNotStepAtCatastrophe: flatAtPeak,
  didNotStepAtAftermath: flatAtAftermath,
  missing,
  sample: Object.fromEntries(stepped.slice(0, 3).map((k) => [k, peak[k]])),
};
