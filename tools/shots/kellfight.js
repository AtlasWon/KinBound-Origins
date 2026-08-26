// STAGE 6, THE CLIMAX ON THE CONTROL RING.
//
// Drives the whole commander sequence the way a player reaches it: dropped onto
// temple_deep_power at 9,15, which is the tile the stage room's own warp names,
// and then WALKED north over the map's own collision until the step trigger
// fires. Nothing is teleported onto a trigger tile: the point of the run is to
// prove the trigger can be reached on foot and cannot be walked round.
//
//   node tools/serve.js
//   npx electron tools/capture.cjs tools/shots/kellfight.js
const d = window.dev;
const top = () => d.game.scenes.top;
const world = () => d.game.scenes.stack.find((s) => s.name === 'overworld') || top();
const log = [];
const note = (s) => { log.push(String(s)); };

const route = (map, sx, sy, tx, ty) => {
  const key = (x, y) => x + ',' + y;
  const open = (x, y) => map.inBounds(x, y)
    && map.collisionAt(x, y) !== 1 && map.collisionAt(x, y) !== 8;
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

const pos = () => {
  const w = world();
  return [w.player.tileX, w.player.tileY];
};

const goTo = (tx, ty) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (top().name !== 'overworld') return false;
    const [x, y] = pos();
    if (x === tx && y === ty) return true;
    const steps = route(world().map, x, y, tx, ty);
    if (!steps) return false;
    for (const k of steps) {
      d.hold(k, 12);
      d.tick(2);
      if (top().name !== 'overworld') return true;
      if (world().events && world().events.running) return true;
    }
  }
  const [x, y] = pos();
  return x === tx && y === ty;
};

/* --------------------------------------------------------------- boot */

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

/* --------------------------------- a player who has actually got this far */

const state = top().state;
for (const f of ['act4_done', 'act4_theft', 'tideheart_taken', 'msh_record_played',
  'tideheart_given', 'tideheart_named']) state.setFlag(f, true);
for (let c = 1; c <= 8; c++) state.giveCrest(c);
const flag = (f) => !!state.hasFlag(f);

// The team-raiser's party at the level the road delivers: four kin, lead one up.
// That is the column the difficulty note on td_kell is written against.
const { createKin } = await import('/build/js/systems/kin.js');
const { Rng } = await import('/build/js/core/rng.js');
const rng = new Rng('kellshot');
state.party.length = 0;
for (const pair of [['rilltail', 46], ['gullswift', 45], ['emberbore', 45], ['mossback', 45]]) {
  state.party.push(createKin(pair[0], pair[1], rng, { originalTrainer: 'player' }));
}
note('party: ' + state.party.map((k) => k.species + '@' + k.level).join(' '));
note('holding tideheart on arrival: ' + state.hasItem('tideheart'));

const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;
d.game.scenes.replaceAll(new Overworld(state, 'temple_deep_power', 9, 15, 'up'));
await d.loadWait(1800);
const cast = () => (world().npcs || []).map((n) => n.data.id + '@' + n.actor.tileX + ',' + n.actor.tileY);
note('arrived ' + pos().join(',') + ' cast: ' + cast().join(' '));
await d.shoot('kell-01-gangway', 8, 2);

/* ------------------------------------------------- walk on and play it out */

const walked = goTo(10, 9);
note('stepped onto the plate: walked=' + walked + ' pos=' + pos().join(',')
  + ' running=' + !!(world().events && world().events.running)
  + ' seen=' + flag('tdp_seen'));

let sawBattle = false;
let losses = 0;
let idle = 0;
let shotMid = false;
const trace = [];
for (let guard = 0; guard < 8000; guard++) {
  const scene = top().name;
  if (scene === 'battle') { sawBattle = true; idle = 0; d.key('Enter', 4); continue; }
  if (scene === 'dialogue') { idle = 0; d.key('Enter', 4); continue; }
  if (scene !== 'overworld') { idle = 0; d.key('Enter', 4); continue; }
  if (flag('td_power_done')) break;
  if (world().events && world().events.running) {
    idle = 0;
    if (!shotMid && flag('neravoss_restrained')) {
      shotMid = true;
      await d.shoot('kell-02-restrained', 8, 2);
    }
    d.tick(4);
    if (world().fade && world().fade.active) await d.sleep(20);
    continue;
  }
  idle++;
  if (idle < 8) { d.tick(4); continue; }
  if (flag('tdp_fight_pending')) {
    losses++;
    const before = pos().join(',');
    goTo(11, 1);
    trace.push('lost round ' + losses + '; tried the way out from ' + before
      + ' -> now ' + pos().join(',') + ' on ' + world().map.id);
    idle = 0;
    continue;
  }
  trace.push('stalled at ' + pos().join(',') + ' seen=' + flag('tdp_seen'));
  break;
}

note('trace: ' + (trace.join(' | ') || 'none'));
note('battle happened: ' + sawBattle + ' (losses: ' + losses + ')');
note('flags: restrained=' + flag('neravoss_restrained') + ' freed=' + flag('neravoss_freed')
  + ' kell_beaten=' + flag('td_kell_beaten') + ' power_done=' + flag('td_power_done'));
note('TIDEHEART back: ' + state.hasItem('tideheart') + '  taken=' + flag('tideheart_taken'));
note('cast after: ' + cast().join(' '));
note('ending at ' + world().map.id + ' ' + pos().join(','));
await d.shoot('kell-03-after', 8, 2);

// And now the way on must actually be walkable.
const out = goTo(11, 1);
note('after the act, reached the way out: ' + out + ' -> map ' + world().map.id
  + ' at ' + pos().join(','));

return { log };
