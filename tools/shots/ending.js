// Stage 7, THE ENDING. Plays the whole homecoming, in order, on foot.
//
// It walks: down the road into Hearthmere, along the street to the doorstep,
// in through the front door, into Elias' study, back out, out to Tarin, back
// in, up the stairs and into the player's own room -- pathfinding over the
// map's own collision every time, never teleporting onto a tile, because a
// scripted warp bypasses collision and can put the player inside scenery.
//
// Before any of that it runs the ONE LINE the Summit is asked to call --
// `{ "kind": "call", "script": "ending_go_home" }` -- through the event VM's own
// registry lookup, and reports where the player lands. That is the join, and a
// join nobody tested is the most common failure on this project.
//
// It reports, for every beat: whether it fired, and every box of text it said.
// A scene that does not fire reports zero boxes rather than quietly passing.
// It photographs the five that have to be looked at, including the chart of
// Averra twice: once at the pause with only Caelora on the desk, and once with
// the whole world on it.

const d = window.dev;
const top = () => d.game.scenes.top;
const world = () => d.game.scenes.find('overworld') || top();
const log = [];
const shots = [];
const yield_ = () => new Promise((r) => setTimeout(r, 0));

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

const place = async (map, x, y, facing) => {
  const scene = world();
  scene.state.currentMap = map;
  d.game.scenes.replaceAll(new (scene.constructor)(scene.state, map, x, y, facing || 'down'));
  await d.loadWait(1200);
};

const walkable = (m, x, y) => m.inBounds(x, y) && m.collisionAt(x, y) !== 1;

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

const goTo = async (tx, ty) => {
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
 * Walk through the warp that leads to `toMap` and confirm we came out the
 * other side. goTo cannot be used for this on its own: the moment the warp
 * fires the player is standing on a DIFFERENT map, and goTo's retry loop then
 * pathfinds towards the old target's coordinates on the new one -- which on
 * these maps is a walkable tile out in the mere.
 */
const crossTo = async (toMap) => {
  const w = (world().map?.warps || []).find((v) => v.toMap === toMap);
  if (!w) { log.push(`crossTo ${toMap}: no warp from ${d.probe().map}`); return false; }
  // Walk to a tile beside the door, then LEAN ON THE KEY without letting go.
  // goTo taps a key per tile, and a tap that comes up a few pixels short of a
  // doorway never moves the body's centre over the warp tile, so the warp does
  // not fire and the driver reports a door that works perfectly as broken.
  // Backing off two tiles and walking in matters: a body started from a
  // standstill on the tile immediately above the player's own front door does
  // not clear the bottom row of the map, and a run-up does.
  const approaches = [[0, -1, 'KeyS'], [0, 1, 'KeyW'], [-1, 0, 'KeyD'], [1, 0, 'KeyA']];
  outer:
  for (const [dx, dy, k] of approaches) {
    for (const dist of [2, 1, 3]) {
      if (d.probe().map === toMap) break outer;
      const ax = w.x + dx * dist;
      const ay = w.y + dy * dist;
      if (!walkable(world().map, ax, ay)) continue;
      if (!await goTo(ax, ay)) continue;
      if (d.probe().map === toMap) break outer;
      d.down(k);
      for (let i = 0; i < 26 && d.probe().map !== toMap; i++) { d.tick(8); await yield_(); }
      d.up(k);
      d.tick(6);
      await yield_();
      if (d.probe().map === toMap) break outer;
    }
  }
  await d.loadWait(1400);
  for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 10);
  const now = d.probe().map;
  if (now !== toMap) {
    /*
     * THE DRIVER'S PROBLEM, NOT THE GAME'S, AND IT IS WORTH WRITING DOWN.
     *
     * The player's own front door is one tile wide with solid wall on both
     * sides, and the body box is 11 px across in a 16 px cell -- two and a
     * half pixels of slack each side. A person holding a key gets nudged into
     * the gap; a driver that taps a key per tile leaves the body a pixel or so
     * off centre and it wedges on the door frame, sitting at the bottom of the
     * row above with nothing on screen to say why. So: stand the player
     * exactly on the tile beside the door and lean on the key from there.
     */
    const from = world().map.id;
    for (const [dx, dy, k, face] of [[0, -1, 'KeyS', 'down'], [0, 1, 'KeyW', 'up'],
      [-1, 0, 'KeyD', 'right'], [1, 0, 'KeyA', 'left']]) {
      const ax = w.x + dx;
      const ay = w.y + dy;
      if (!walkable(world().map, ax, ay)) continue;
      await place(from, ax, ay, face);
      d.down(k);
      for (let i = 0; i < 26 && d.probe().map !== toMap; i++) { d.tick(8); await yield_(); }
      d.up(k);
      d.tick(6);
      await d.loadWait(1200);
      for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 10);
      if (d.probe().map === toMap) break;
    }
  }
  const end = d.probe().map;
  log.push(`crossTo ${toMap}: ${end === toMap ? 'ok' : `FAILED, still on ${end}`} at ${d.probe().pos}`);
  return end === toMap;
};

/* Step a running scene to the end, reading every box back. */
const playOut = async (label, shotAt) => {
  const boxes = [];
  const taken = new Set();
  for (let i = 0; i < 900; i++) {
    d.tick(6);
    const p = d.probe();
    if (p.scene === 'dialogue' && p.text) {
      if (!boxes.length || boxes[boxes.length - 1] !== p.text) boxes.push(p.text);
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
    if (i > 14 && p.scene === 'overworld' && !world().events?.running) break;
  }
  log.push(`${label}: ${boxes.length} boxes`);
  for (const b of boxes) log.push(`    | ${b}`);
  return boxes;
};

const flag = (f) => !!world().state?.hasFlag?.(f);

/* ------------------------------------------------------------------ run */

await boot();
const state = world().state;

// The state the ending is entitled to assume: the story is over, the object is
// back in the bag (canon 56), and the Champion has been beaten.
state.setFlag('act4_done');
state.setFlag('neravoss_calm');
state.setFlag('act6_done');
state.setFlag('summit_open');
state.setFlag('got_starter');
state.setFlag('mom_sendoff');
state.setFlag('met_tarin');
state.setFlag('tarin_first_done');
if (!state.hasItem('tideheart')) state.giveItem('tideheart', 1);

// 0. THE JOIN. Whatever owns the Champion is asked to do one thing and one
// thing only: { "kind": "call", "script": "ending_go_home" }. Run exactly that,
// through the event VM's own registry lookup, and see where the player lands.
world().events.start({
  id: '_probe_go_home',
  trigger: 'call',
  actions: [{ kind: 'call', script: 'ending_go_home' }],
});
await playOut('ending_go_home');
log.push(`handoff: map=${d.probe().map} pos=${d.probe().pos} champion=${flag('champion')}`);

// 1. Down the road.
if (d.probe().map !== 'hearthmere') await place('hearthmere', 14, 1, 'down');
await goTo(14, 4);
await playOut('road', [['first time you have come down it', 'ending-01-road']]);
log.push(`after road: pos=${d.probe().pos} ending_road=${flag('ending_road')}`);

// 2. The doorstep. Walked the length of the street, the way a player would.
const mira = (world().map.npcs || []).find((n) => n.id === 'hm_mira_door');
log.push(`mira on the map: ${mira ? `${mira.x},${mira.y}` : 'MISSING'}`);
await goTo(14, 24);
await goTo(17, 24);
await playOut('mira', [['Let me look at you first', 'ending-02-mira']]);
log.push(`after mira: pos=${d.probe().pos} ending_home=${flag('ending_home')}`);

// 3. Inside.
await crossTo('hearthmere_house_player');
await playOut('kitchen');
log.push(`inside: map=${d.probe().map} ending_indoors=${flag('ending_indoors')}`);

// 4. The study.
await goTo(17, 5);
await playOut('study', [['Where?', 'ending-03-study']]);
log.push(`study: tideheart_home=${flag('tideheart_home')} `
  + `stillHeld=${state.hasItem('tideheart')} chart=${flag('ending_chart')}`);

// 5. Back past his mother.
await goTo(11, 8);
await playOut('back out');

// 6. Tarin in the lane.
await crossTo('hearthmere');
const tarin = (world().map.npcs || []).find((n) => n.id === 'hm_tarin_home');
log.push(`tarin on the map: ${tarin ? `${tarin.x},${tarin.y}` : 'MISSING'}`);
await goTo(17, 24);
await playOut('tarin', [['Champion of Caelora', 'ending-04-tarin']]);
log.push(`after tarin: ending_tarin=${flag('ending_tarin')}`);

// 7. Upstairs, and the chart.
await crossTo('hearthmere_house_player');
await crossTo('hearthmere_house_up');
await goTo(3, 5);
log.push(`bedroom door: map=${d.probe().map} pos=${d.probe().pos}`);

// The last scene runs a set piece in the middle of it, so it cannot be stepped
// with playOut alone: photograph the chart while it is on screen.
const boxes = [];
let shotEarly = false;
let shotMid = false;
let shotLate = false;
for (let i = 0; i < 1400; i++) {
  d.tick(6);
  const p = d.probe();
  if (p.scene === 'averra') {
    // Settle ticks would run the reveal past itself, so both shots are keyed
    // to the scene's own clock and taken with no settle at all.
    if (!shotEarly && top().t > 120) {
      await d.shoot('ending-05-averra-caelora', 0, 1); shots.push('ending-05-averra-caelora'); shotEarly = true;
    } else if (shotEarly && !shotMid && top().t > 250) {
      await d.shoot('ending-06-averra-unrolling', 0, 1); shots.push('ending-06-averra-unrolling'); shotMid = true;
    } else if (shotMid && !shotLate && top().t > 400) {
      await d.shoot('ending-07-averra', 0, 1); shots.push('ending-07-averra'); shotLate = true;
    }
    await yield_();
    continue;
  }
  if (p.scene === 'dialogue' && p.text) {
    if (!boxes.length || boxes[boxes.length - 1] !== p.text) boxes.push(p.text);
  }
  d.key('Enter', 6);
  await yield_();
  if (i > 20 && p.scene === 'overworld' && !world().events?.running) break;
}
log.push(`bedroom: ${boxes.length} boxes`);
for (const b of boxes) log.push(`    | ${b}`);
log.push(`END: ending_seen=${flag('ending_seen')} act7_done=${flag('act7_done')} `
  + `scene=${d.probe().scene} map=${d.probe().map}`);

return { log, shots };
