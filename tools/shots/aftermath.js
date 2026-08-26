// Stage 6, the aftermath. Proves the three post-climax scenes actually play
// and that the storm world is gone from the screen afterwards.
//
// It does four jobs and reports all four:
//
//   1. SCENES. Loads Tideglass, the Meridian atrium and the Summit registry
//      with act6_done set and steps through every box, reading the dialogue
//      back. A scene that does not fire reports zero boxes rather than
//      quietly passing.
//   2. THE STORM IS OVER. Talks to the same NPCs twice -- once with act4_done
//      only, once with act6_done as well -- and reports any whose text did not
//      change. Sixty entries in the game shadow a storm variant; if one of
//      them is unreachable the count comes back wrong.
//   3. THE REBUILDING IS ON THE MAP. Finds the ten new requiresFlag NPCs and
//      talks to each one, standing on a tile reached by breadth-first search
//      over the map's own collision so it cannot stand inside scenery.
//   4. THE SUMMIT IS NOT ENTERABLE. Checks that no warp on the registry map
//      leads anywhere except back into Aureline. Stage 7 owns the Ascent, and
//      a stub a player can walk into is the failure this stage must not ship.

const d = window.dev;
const top = () => d.game.scenes.top;
const log = [];
const shots = [];

const boot = async () => {
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
  for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);
};

/* The overworld under whatever UI is on top of the stack. */
const world = () => d.game.scenes.find('overworld') || top();

const place = async (map, x, y, facing, keepScene) => {
  // The scene constructor is taken off whatever overworld is on the stack, so
  // this has to find one rather than assume the top of the stack is a map.
  const scene = world();
  scene.state.currentMap = map;
  d.game.scenes.replaceAll(new (scene.constructor)(scene.state, map, x, y, facing || 'down'));
  await d.loadWait(1200);
  // An enter script on the destination pushes a dialogue scene straight away.
  // Unless the caller wants that scene, clear it, or every later lookup of
  // world().map finds a dialogue box instead of a tilemap.
  if (keepScene) return;
  for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 10);
  d.tick(4);
};



const walkable = (m, x, y) => m.inBounds(x, y) && m.collisionAt(x, y) !== 1;

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

const standBeside = (m, nx, ny) => {
  const tries = [
    [nx, ny + 1, 'up'], [nx, ny - 1, 'down'],
    [nx - 1, ny, 'right'], [nx + 1, ny, 'left'],
  ];
  for (const [x, y, facing] of tries) {
    if (!walkable(m, x, y)) continue;
    if (reachCount(m, x, y) < 30) continue;
    return { x, y, facing };
  }
  return null;
};

/* Breadth-first route over the map's own collision. */
const route = (sx, sy, tx, ty) => {
  const map = world().map;
  if (!map) return null;
  const key = (x, y) => `${x},${y}`;
  const from = new Map([[key(sx, sy), null]]);
  const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    if (x === tx && y === ty) break;
    for (const [dx, dy, k] of [[0, -1, 'KeyW'], [0, 1, 'KeyS'], [-1, 0, 'KeyA'], [1, 0, 'KeyD']]) {
      const nx = x + dx, ny = y + dy;
      if (!walkable(map, nx, ny) || from.has(key(nx, ny))) continue;
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

const yield_ = () => new Promise((r) => setTimeout(r, 0));

const goTo = async (tx, ty) => {
  // Retried, the way act1.js retries: one hold can drop a tile, and a driver
  // that reports "could not get there" when it is one step short is a lie
  // about the map.
  for (let attempt = 0; attempt < 4; attempt++) {
    const p = d.probe();
    if (p.scene !== 'overworld') return true;
    const [x, y] = (p.pos || '0,0').split(',').map(Number);
    if (x === tx && y === ty) return true;
    const steps = route(x, y, tx, ty);
    if (!steps) return false;
    for (const k of steps) {
      d.hold(k, 14);
      d.tick(3);
      if (top().name !== 'overworld') return true;
    }
    await yield_();
  }
  return d.probe().pos === `${tx},${ty}`;
};

/*
 * Step a running scene to the end, reading every box back.
 *
 * THE YIELD IS LOAD-BEARING. d.tick() is synchronous, so a loop of ticks never
 * lets the event loop turn -- and a cutscene that warps (the quay scene warps
 * the player to the head of the east mole) blocks on an async loadMap that can
 * only settle once the stack empties. Without the yield the scene reported two
 * boxes and stopped, which is exactly the false failure the first run of this
 * driver produced: the content was fine and the driver was not.
 */
const playOut = async (label, shotAt) => {
  const boxes = [];
  const taken = new Set();
  for (let i = 0; i < 400; i++) {
    d.tick(6);
    const p = d.probe();
    if (p.scene === 'dialogue' && p.text) {
      if (!boxes.length || boxes[boxes.length - 1] !== p.text) boxes.push(p.text);
      // Shots are keyed to what the box SAYS, not to how many boxes have gone
      // past, because a count moves the moment a line is added anywhere above
      // it. A long settle first so the typewriter has finished: a screenshot of
      // half a sentence is a screenshot of nothing.
      // The probe returns the box already wrapped, with the line breaks in it,
      // so a needle has to be matched against the unwrapped text or it misses
      // every phrase a wrap happens to fall through.
      const flat = String(p.text).replace(/\s*\/\s*/g, ' ').replace(/\s+/g, ' ');
      for (const [needle, name] of shotAt || []) {
        if (taken.has(name) || !flat.includes(needle)) continue;
        taken.add(name);
        await d.shoot(name, 300, 1);
        shots.push(name);
      }
    }
    d.key('Enter', 6);
    await yield_();
    if (i > 12 && p.scene === 'overworld' && !world().events?.running) break;
  }
  log.push(`${label}: ${boxes.length} boxes`);
  return boxes;
};

/* Stand beside an NPC and read what they say. */
const speakTo = async (mapId, npcId) => {
  await place(mapId, 1, 1, 'down');
  const m = world().map;
  const npc = (m.npcs || []).find((n) => n.id === npcId || n.script === npcId);
  if (!npc) return null;
  const spot = standBeside(m, npc.x, npc.y);
  if (!spot) return null;
  await place(mapId, spot.x, spot.y, spot.facing);
  d.key('Enter', 12);
  let text = '';
  for (let i = 0; i < 14 && top().name === 'dialogue'; i++) {
    const p = d.probe();
    if (p.text) text += (text ? ' | ' : '') + p.text;
    d.key('Enter', 10);
  }
  d.tick(4);
  return text;
};

await boot();
const state = () => world().state;

/* ------------------------------------------------ pass one: the storm world */

for (let c = 1; c <= 8; c++) state().giveCrest(c);
state().setFlag('act4_done');
state().setFlag('cassian_public_done');
state().setFlag('lyra_doubt');
// The Act 4 leftovers a real save carries into this stage: without them the
// atrium still has Act 4's Lyra and Tarin standing in it and the shot is a lie.
state().setFlag('act4_inside');
state().setFlag('am_arrived');
state().setFlag('act4_theft_done');
state().setFlag('act4_after_done');
state().setFlag('tarin_committed');
state().setFlag('tarin_tideglass_done');
state().setFlag('tideheart_taken');

const CAST = [
  ['tideglass', 'tg_gaugeman'], ['tideglass', 'tg_child'], ['tideglass', 'tg_harbourmaster'],
  ['briarbell', 'bb_bellwright'], ['briarbell', 'bb_farmer'],
  ['marlbeck', 'mb_engineman'], ['marlbeck', 'mb_child'],
  ['mirehaven', 'mh_stiltwright'], ['mirehaven', 'mh_child'],
  ['tanners_rest', 'tr_bellman'], ['tanners_rest', 'tr_beaconwatch'],
  ['hearthmere', 'hearth_villager'], ['hearthmere', 'hearth_kid'], ['hearthmere', 'hearth_fisher'],
  ['stonewake', 'sw_carter'], ['stonewake', 'sw_lamplighter'],
  ['emberfall', 'ef_ash_sweeper'], ['emberfall', 'ef_slag_child'],
  ['harrowgate', 'hg_master'], ['harrowgate', 'hg_farmer'],
  ['aureline', 'au_park_keeper'], ['aureline', 'au_square_sitter'],
  ['frostmere', 'fm_icemaster'], ['frostmere', 'fm_child'],
  ['frostmere_inn', 'fmi_host'], ['frostmere_icehouse', 'fmh_master'],
];

const before = {};
for (const [map, npc] of CAST) before[`${map}/${npc}`] = await speakTo(map, npc);

/* --------------------------------------------------- the climax has happened */

state().setFlag('act6_done');
log.push(`act6_done=${state().hasFlag('act6_done')} tarin_at_aftermath=${state().hasFlag('tarin_at_aftermath')}`);

/* ----------------------------------------------------------- scene one: quay */

await place('tideglass', 40, 30, 'down', true);
const quay = await playOut('quay', [
  ['counted them four times', 'aftermath-01-quay-flat'],
  ['yard book with one name', 'aftermath-02-kell-arrested'],
  ['name at the bottom of each', 'aftermath-03-veyl-statement'],
  ['not going with him', 'aftermath-04-lyra-mole'],
  ['not going up without you', 'aftermath-05-tarin-summit'],
]);
log.push(`quay first: ${(quay[0] || '').slice(0, 60)}`);
log.push(`quay last: ${(quay[quay.length - 1] || '').slice(0, 70)}`);
log.push(`after quay: map=${d.probe().map} pos=${d.probe().pos} aftermath_seen=${state().hasFlag('aftermath_seen')}`);
log.push(`quay cast cleared: af_quay_cast=${state().hasFlag('af_quay_cast')}`);
log.push(`tideheart in bag: ${state().hasItem('tideheart')}`);

/* --------------------------------------------------------- scene two: atrium */

await place('aureline_meridian', 12, 18, 'up', true);
const atrium = await playOut('atrium', [
  ['found out what they had been part of', 'aftermath-06-atrium-lyra'],
  ['Eleven hundred people and three things', 'aftermath-07-lyra-signs'],
]);
log.push(`lyra_rebuilds=${state().hasFlag('lyra_rebuilds')} af_hq_cast=${state().hasFlag('af_hq_cast')}`);
log.push(`atrium last: ${(atrium[atrium.length - 1] || '').slice(0, 70)}`);

/* -------------------------------------------------------- scene three: summit */

await place('aureline_summit', 9, 14, 'up');
const arrived = await goTo(9, 2);
log.push(`summit walk to 9,2: ${arrived} at ${d.probe().pos}`);
const summit = await playOut('summit', [
  ['eighty-ninth', 'aftermath-08-summit-tarin'],
  ['come off their shut', 'aftermath-09-doors-open'],
  ['stopped being the whole list', 'aftermath-10-tarin-goal'],
]);
log.push(`summit_open=${state().hasFlag('summit_open')}`);
log.push(`summit last: ${(summit[summit.length - 1] || '').slice(0, 70)}`);

// Nothing behind the doors. Stage 7 owns the Ascent.
await place('aureline_summit', 9, 14, 'up');
const exits = (world().map.warps || []).map((w) => w.toMap);
log.push(`registry exits: ${JSON.stringify([...new Set(exits)])}`);
const tarinHere = (world().map.npcs || []).some((n) => n.id === 'aur_sum_tarin');
log.push(`tarin standing in the registry afterwards: ${tarinHere}`);
await d.shoot('aftermath-11-registry-after', 6, 1);
shots.push('aftermath-11-registry-after');

/* ------------------------------------------- pass two: the world after it all */

const after = {};
for (const [map, npc] of CAST) after[`${map}/${npc}`] = await speakTo(map, npc);

const changed = [], same = [], missing = [];
for (const key of Object.keys(before)) {
  if (before[key] === null || after[key] === null) { missing.push(key); continue; }
  (before[key] !== after[key] ? changed : same).push(key);
}

/* --------------------------------------------- the rebuilding crews are there */

const REBUILD = [
  ['tideglass', 'tg_mason'], ['tideglass', 'tg_notice_reader'],
  ['stonewake', 'sw_notice_reader'], ['aureline', 'au_notice_reader'],
  ['hearthmere', 'hm_roofer'], ['marlbeck', 'mb_drainhand'],
  ['mirehaven', 'mh_lamphand'], ['emberfall', 'ef_slabman'],
  ['harrowgate', 'hg_bankman'], ['frostmere', 'fm_homegoer'],
  // Three voices that were written in earlier stages and never given a body.
  // They now have one, so their aftermath variants are reachable.
  ['tideglass', 'coast_word_veyl'], ['tideglass', 'foundation_word_hauler'],
  ['tideglass_hall', 'tarin_word_hall'],
];
const crews = {};
for (const [map, npc] of REBUILD) crews[`${map}/${npc}`] = await speakTo(map, npc);
const silentCrews = Object.entries(crews).filter(([, v]) => !v || v === '...').map(([k]) => k);

await place('tideglass', 72, 55, 'down');
await d.shoot('aftermath-12-mole-after', 8, 1);
shots.push('aftermath-12-mole-after');

return {
  log,
  shots,
  stormOver: { changed: changed.length, unchanged: same, missing },
  crews: { asked: REBUILD.length, silent: silentCrews },
  sampleAfter: Object.fromEntries(changed.slice(0, 4).map((k) => [k, after[k]])),
  crewSample: Object.fromEntries(Object.entries(crews).slice(0, 3)),
};
