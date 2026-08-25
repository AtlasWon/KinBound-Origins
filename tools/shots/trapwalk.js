// JOB 1, the reproduction, walked rather than teleported.
//
// The move that does it: walk along the road in the same direction the trainer
// will later walk, stop the instant you cross into their column (which is where
// a key comes up), then step sideways into their sight line. Being spotted
// freezes the body right there, straddling the boundary -- and the trainer
// walks into the half of you that is still in the tile behind.
//
// Every step here is a held key. Nothing is placed by hand except the starting
// tile, and the movement check afterwards is a direction key and a demand that
// the body actually moved.
const d = window.dev;
const top = () => d.game.scenes.top;
const ow = () => d.game.scenes.find('overworld');
const out = [];
const fails = [];

await d.loadWait(1400);
// Reach the title, then choose NEW JOURNEY deliberately -- the cursor starts
// on CONTINUE whenever a save exists, so pressing Enter blindly loads that
// save and skips the creator entirely.
for (let i = 0; i < 90 && top().name !== 'title'; i++) d.key('Enter', 10);
if (top().name === 'title' && top().menu) { top().menu.index = 0; d.key('Enter', 24); }
for (let i = 0; i < 60 && top().name !== 'creator'; i++) d.key('Enter', 10);
for (let i = 0; i < 30; i++) {
  if (typeof top().rows !== 'function') { d.key('Enter', 20); continue; }
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1800);
for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const kinMod = await import('/build/js/systems/kin.js');
const OW = ow().constructor;
const state = ow().state;
d.game.settings.battleSpeed = 'brisk';
d.game.settings.textSpeed = 'fast';

const gates = () => {
  const o = ow();
  if (!o) return 'no-overworld';
  return 'scene=' + top().name + ' BUSY=' + o.busy + ' FADE=' + o.fade.active
    + ' WIPE=' + !!o.wipe + ' EV=' + !!(o.events && o.events.running)
    + ' pbusy=' + o.player.busy
    + ' at=' + o.player.tileX + ',' + o.player.tileY
    + ' xy=' + o.player.x.toFixed(1) + ',' + o.player.y.toFixed(1);
};

const canWalk = () => {
  const o = ow();
  if (!o || top().name !== 'overworld') return 'NO(' + gates() + ')';
  const p = o.player;
  for (const k of ['KeyD', 'KeyA', 'KeyW', 'KeyS']) {
    const bx = p.x, by = p.y;
    d.hold(k, 18);
    if (Math.abs(p.x - bx) > 0.5 || Math.abs(p.y - by) > 0.5) return 'yes';
  }
  return 'NO(' + gates() + ')';
};

const settle = async () => {
  for (let r = 0; r < 12; r++) {
    d.tick(20);
    for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 8);
    await d.sleep(60);
  }
  d.tick(40);
};

async function goTo(map) {
  d.game.scenes.replaceAll(new OW(state, map, 5, 5, 'down'));
  await d.loadWait(1200);
  for (let i = 0; i < 30 && top().name === 'dialogue'; i++) d.key('Enter', 10);
  for (let i = 0; i < 400 && ow().events && ow().events.running; i++) {
    d.tick(1);
    if (top().name === 'dialogue') d.key('Enter', 4);
  }
  d.tick(10);
}

const V = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const KEY = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' };
const walkable = (m, x, y) => {
  if (!m.inBounds(x, y)) return false;
  const c = m.collisionAt(x, y);
  return c === 0 || c === 6;
};

const party = () => {
  state.party.length = 0;
  state.party.push(
    kinMod.createKin('cinderpaw', 60, d.game.rng, { originalTrainer: 'player' }),
    kinMod.createKin('sprigling', 60, d.game.rng, { originalTrainer: 'player' }),
  );
};

async function fight() {
  for (let i = 0; i < 2500 && top().name !== 'battle'; i++) {
    d.tick(1);
    if (top().name === 'dialogue') d.key('Enter', 4);
  }
  if (top().name !== 'battle') return 'no-battle';
  const scene = top();
  let guard = 0;
  while (d.game.scenes.top === scene && guard++ < 9000) {
    const ph = scene.phase;
    if (ph === 'menu') scene.submit(d.game, { kind: 'move', index: 0 });
    else if (ph === 'finished' || ph === 'forcedSwitch') d.key('Enter', 3);
    else d.tick(3);
  }
  await settle();
  return scene.battle.result;
}

// Hold `key` one tick at a time until the player's tile reaches want, then
// `extra` ticks more -- which is where a real key comes up.
function stepAcross(o, key, axis, want, extra) {
  d.down(key);
  for (let i = 0; i < 60; i++) {
    d.tick(1);
    if ((axis === 'x' ? o.player.tileX : o.player.tileY) === want) break;
  }
  d.tick(extra);
  d.up(key);
  d.tick(1);
}

async function tryTrainer(map, id, extra) {
  const tag = map + '/' + id + ' extra=' + extra;
  await goTo(map);
  const o = ow();
  const npc = o.npcs.find((n) => n.data.id === id);
  if (!npc) return tag + ' SKIP(absent)';
  if (state.defeatedTrainers) state.defeatedTrainers.clear();
  party();

  const f = npc.actor.facing;
  const v = V[f];
  const range = npc.data.sightRange || 4;
  const nx = npc.actor.tileX, ny = npc.actor.tileY;
  const perps = v[0] !== 0 ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0]];

  for (let dist = 2; dist <= range; dist++) {
    const sxT = nx + v[0] * dist, syT = ny + v[1] * dist;
    if (!walkable(o.map, sxT, syT)) continue;
    let blocked = false;
    for (let k = 1; k < dist; k++) {
      if (o.map.collisionAt(nx + v[0] * k, ny + v[1] * k) === 1) blocked = true;
    }
    if (blocked) continue;

    for (const p of perps) {
      const p1x = sxT + p[0], p1y = syT + p[1];
      const p0x = p1x - v[0], p0y = p1y - v[1];
      if (!walkable(o.map, p1x, p1y) || !walkable(o.map, p0x, p0y)) continue;
      if (o.npcs.some((n) => (n.actor.tileX === p1x && n.actor.tileY === p1y)
        || (n.actor.tileX === p0x && n.actor.tileY === p0y))) continue;

      o.player.setTile(p0x, p0y);
      o.lastTile = { x: p0x, y: p0y };
      d.tick(4);
      // Walk along the trainer's own axis and stop just past the boundary.
      stepAcross(o, KEY[f], v[0] !== 0 ? 'x' : 'y', v[0] !== 0 ? p1x : p1y, extra);
      if (o.player.tileX !== p1x || o.player.tileY !== p1y) continue;
      const body = o.player.x.toFixed(1) + ',' + o.player.y.toFixed(1);

      // Now step sideways into the sight line.
      const inKey = KEY[p[0] === 1 ? 'left' : p[0] === -1 ? 'right' : p[1] === 1 ? 'up' : 'down'];
      for (let i = 0; i < 40 && !o.busy && !o.wipe && top().name === 'overworld'; i++) d.hold(inKey, 3);
      if (!o.busy && !o.wipe && top().name === 'overworld') continue;

      const spottedAt = o.player.x.toFixed(1) + ',' + o.player.y.toFixed(1);
      const result = await fight();
      const walk = canWalk();
      const npcNow = npc.actor.tileX + ',' + npc.actor.tileY;
      const line = tag + ' face=' + f + ' d=' + dist + ' body=' + body
        + ' spottedAt=' + spottedAt + ' trainerEndedAt=' + npcNow
        + ' result=' + result + ' canWalk=' + walk;
      if (walk !== 'yes') fails.push(line);
      return line;
    }
  }
  return tag + ' SKIP(no perpendicular approach)';
}

const plan = [
  ['route_1', 'r1_madden'], ['route_1', 'r1_ottel'], ['route_1', 'r1_cale'],
  ['route_2', 'r2_juna'], ['route_3', 'r3_holt'], ['route_4', 'r4_bay'],
  ['kellowmere_hall', 'hall1_guard_a'], ['brackwater_hall', 'hall2_guard_c'],
];

// A/B, so the driver has to prove it can still see the bug. `playerCovers` is
// the whole fix -- neutering it puts the old "the player is one tile" rule
// back everywhere at once.
const real = OW.prototype.playerCovers;
for (const legacy of [true, false]) {
  OW.prototype.playerCovers = legacy ? () => false : real;
  const before = fails.length;
  for (const [map, id] of plan) {
    for (const extra of [1, 2, 3, 5]) out.push((legacy ? 'OLD ' : 'NEW ') + await tryTrainer(map, id, extra));
  }
  out.push((legacy ? 'OLD' : 'NEW') + ' locks = ' + (fails.length - before));
}
OW.prototype.playerCovers = real;
out.push('FAILURES=' + fails.length);
for (const f of fails) out.push('  !! ' + f);
return out;
