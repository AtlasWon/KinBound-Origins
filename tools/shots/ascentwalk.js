// Walks the whole Ascent -- Crownspire's north gate, the Pilgrim Road, the
// Throat, the West Shoulder, the High Waystation and the Crown -- and
// photographs it at 1x.
//
//   node tools/serve.js
//   npx electron tools/capture.cjs tools/shots/ascentwalk.js
//
// SAME CONTRACT AS tools/shots/route9walk.js. Every position below is reached
// by breadth-first search over the map's OWN collision from a tile the map says
// is walkable, and anything the search cannot reach is reported by name rather
// than quietly skipped. Teleporting to an arbitrary tile is how a driver ends up
// photographing the inside of a crag and calling it a road.
//
// IT ALSO PROVES THE FIVE GATES, which a walk cannot prove by walking: the ford
// (Wade), the terraces (Clear), the stone door and the lamp stair (Shoulder and
// Kindle), and the pinnacle and the viewpoint (Updraft). Each is stepped on and
// the driver reports where it ended up, so a gate that silently does nothing
// shows up as a coordinate rather than as a screenshot of the same field twice.
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

const settle = () => { for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 8); };

const goTo = async (tx, ty) => {
  for (let attempt = 0; attempt < 12; attempt++) {
    settle();
    if (top().name !== 'overworld') return false;
    const [x, y] = (d.probe().pos || '0,0').split(',').map(Number);
    if (x === tx && y === ty) return true;
    let steps = route(x, y, tx, ty);
    if (!steps) {
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0], [0, 2], [2, 0], [-2, 0], [0, -2]]) {
        steps = route(x, y, tx + dx, ty + dy);
        if (steps) break;
      }
    }
    if (!steps) { note(`  NO ROUTE to ${tx},${ty} from ${x},${y} on ${d.probe().map}`); return false; }
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
// STAGE 7 STATE. summit_open is what opens Crownspire's gate; the six arts are
// what the mountain is built out of. Everything else on this road assumes the
// story is over, which is the whole reason it exists.
for (const f of ['act4_done', 'act6_done', 'neravoss_calm', 'summit_open']) state.setFlag?.(f, true);
for (const a of ['clear', 'shoulder', 'kindle', 'wade', 'swim', 'updraft']) state.giveArt?.(a);

// NO PARTY, AND EVERY TRAINER ON THESE MAPS MARKED BEATEN. Both are the same
// decision: this driver photographs GROUND, and a walk with a live bench turns
// into a wild battle inside twenty steps. OverworldScene declines to roll an
// encounter for a player with nothing to send out, and the defeated list stops
// the eighteen Trainers firing on sight.
for (const t of [
  'asr_pilgrim', 'asr_carrier', 'asr_ford', 'asr_terrace', 'asr_falls',
  'asd_delver', 'asd_sump', 'asd_stonecrew',
  'ass_warden', 'ass_ropewalk', 'ass_cairn', 'ass_notch',
  'asu_pilgrim', 'asu_scholar',
  'asc_snowline', 'asc_tarn', 'asc_cornice', 'asc_lastwarden']) {
  state.markDefeated?.(t);
}

const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;
const enter = async (map, x, y, dir = 'up') => {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, dir));
  await d.loadWait(1400);
  settle();
  const scene = top();
  const ok = scene.map && scene.canEnter(x, y, 'down');
  note(`enter ${map} at ${x},${y}: ${ok ? 'walkable' : 'NOT WALKABLE'} -- probe says ${d.probe().pos}`);
};

/**
 * Step onto a gate tile and let the script have the frame.
 *
 * goTo cannot be used for the last step of a gate: a step script that warps
 * inside the SAME map leaves the map id unchanged, so goTo does not notice it
 * fired and keeps walking a path that is now nonsense. Walk to the cell BESIDE
 * the gate, take the last step by hand, and yield -- an awaited load only
 * resolves when the driver yields to the event loop, so d.sleep and not d.tick.
 */
const gate = async (fromX, fromY, key, want, label) => {
  await goTo(fromX, fromY);
  d.hold(key, 14); d.tick(30); await d.sleep(90); d.tick(60);
  for (let i = 0; i < 30 && top().name === 'dialogue'; i++) d.key('Enter', 8);
  for (let r = 0; r < 4; r++) {
    d.tick(30); await d.sleep(80);
    for (let i = 0; i < 20 && top().name !== 'overworld'; i++) d.key('Enter', 8);
  }
  d.tick(20);
  note(`${label}: ended at ${d.probe().pos} on ${d.probe().map} (want ${want})`);
};

/** Cut a thorn wall: face it and answer yes. */
const cut = async (fromX, fromY, key, label) => {
  await goTo(fromX, fromY);
  d.hold(key, 10); d.tick(10);
  d.key('Enter', 12);
  for (let i = 0; i < 12 && top().name === 'dialogue'; i++) d.key('Enter', 10);
  d.tick(20);
  note(`${label}: ${d.probe().map} ${d.probe().pos}`);
};

/** Shoulder a stone north until it stops moving. */
const shove = async (sx, sy, label) => {
  const ok = await goTo(sx, sy + 1);
  note(`  ${label}: stood at ${d.probe().pos} (want ${sx},${sy + 1}) routed=${ok}`);
  // FOUR PUSHES, NOT TEN. A stone shoved past its socket is a puzzle nobody can
  // finish without leaving the map, so the sockets are cut against the wall and
  // the stone stops on them -- but the driver still pushes only as far as the
  // stone can go, so an over-push would show up here as a coordinate.
  for (let i = 0; i < 5; i++) { d.hold('KeyW', 26); d.tick(20); }
  note(`  ${label}: now at ${d.probe().pos}, plates=${state.getVar('ascent_deep_plates')}`);
};

const out = [];
const shot = async (name, ticks = 40) => { out.push(await d.shoot(name, ticks, 1)); };

/* ------------------------------------------------- Crownspire's north gate */
await enter('crownspire', 48, 7, 'up');
await goTo(48, 5);
await shot('as-00-citygate');
d.hold('KeyW', 16); d.tick(30); await d.sleep(90); d.tick(60);
for (let i = 0; i < 30 && top().name === 'dialogue'; i++) d.key('Enter', 8);
d.tick(30); await d.sleep(60);
for (let i = 0; i < 20 && top().name !== 'overworld'; i++) d.key('Enter', 8);
note('gate: ended at ' + d.probe().pos + ' on ' + d.probe().map + ' (want 34,54 on ascent_road)');
await shot('as-01-throughgate');

/* --------------------------------------------------------- the Pilgrim Road */
await enter('ascent_road', 34, 54, 'up');
await goTo(35, 47);
await shot('as-02-oakwood');
await goTo(41, 38);
await shot('as-03-pineband');
await goTo(28, 31);
await shot('as-04-brokenbridge');
await goTo(20, 22);
await shot('as-05-ford');
await goTo(22, 46);
await shot('as-06-plungepool');
await cut(45, 41, 'KeyD', 'terrace thorn');
await goTo(50, 42);
await shot('as-07-terraces');
await goTo(11, 12);
await shot('as-08-uppergorge');
await goTo(9, 6);
await shot('as-09-cavemouth');

/* ------------------------------------------------------------- the Throat */
await enter('ascent_deep', 9, 41, 'up');
await shot('as-10-entrancehall');
await goTo(14, 25);
await shot('as-11-sump');
await goTo(30, 22);
await shot('as-12-sockets');
// SOLVE IT RATHER THAN SKIP IT. Three stones at 26,21 / 30,20 / 34,21, three
// sockets four rows above them; the driver stands under each stone and pushes
// north until the plate count says three. If this ever fails to reach three the
// puzzle is not solvable and the map is sealed.
await shove(26, 20, 'west stone');
await shove(30, 20, 'middle stone');
await shove(34, 20, 'east stone');
note('stone gate: plates var = ' + state.getVar('ascent_deep_plates') + ' (want 3)');
await shot('as-12b-platesdown');
await gate(31, 17, 'KeyW', '31,13', 'stone door');
await shot('as-13-gallery');
await gate(45, 11, 'KeyW', '45,5', 'lamp stair');
note('lamps lit = ' + state.hasFlag('asd_lamps_lit'));
await shot('as-14-stairhead');

/* ------------------------------------------------------ the West Shoulder */
await enter('ascent_shelf', 7, 48, 'up');
await shot('as-15-outofthemountain');
await goTo(16, 41);
await shot('as-16-bothy');
await goTo(30, 27);
await shot('as-17-gorge');
await goTo(38, 26);
await shot('as-18-ropebridge');
await goTo(32, 42);
await shot('as-19-notch');
await goTo(52, 12);
await shot('as-20-eastroad');
await goTo(58, 20);
await shot('as-21-meltwater');
await gate(66, 24, 'KeyW', '66,19', 'pinnacle');
await shot('as-22-pinnacle');

/* -------------------------------------------------------------- the bothy */
await enter('ascent_bothy', 8, 9, 'up');
await shot('as-23-bothy-inside');

/* --------------------------------------------------- the High Waystation */
await enter('ascent_ruin', 18, 32, 'up');
await shot('as-24-ruin-in');
await goTo(19, 20);
await shot('as-25-cistern');
await goTo(19, 7);
await shot('as-26-namewall');
await goTo(28, 21);
for (let i = 0; i < 5; i++) { d.hold('KeyS', 14); d.tick(4); }
await cut(28, 25, 'KeyD', 'ruin thorn');
await goTo(32, 27);
await shot('as-27-thorncorner');

/* ---------------------------------------------------------------- the Crown */
await enter('ascent_crown', 28, 43, 'up');
await shot('as-28-crown-in');
await goTo(24, 32);
await shot('as-29-tarn');
await goTo(29, 24);
await shot('as-30-greatcairn');
await goTo(40, 25);
await shot('as-31-cornice');
await gate(43, 15, 'KeyW', '43,11', 'viewpoint');
await shot('as-32-viewpoint');

await enter('ascent_crown', 28, 43, 'up');
await goTo(29, 4);
await shot('as-33-summitgate');
await gate(29, 3, 'KeyW', 'summit_approach 14,22', 'summit seam');
await shot('as-34-summitseam');

return { log, probe: d.probe(), out };
