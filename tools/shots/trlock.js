// JOB 1, the harsh version. EVERY trainer placed in EVERY map, reached by both
// routes a player can use (walk into their sight line, or stand in front and
// press confirm), fought to a win and to a loss, with a direction key pressed
// afterwards and the player's actual pixel position asserted to have moved.
//
// Keys are also mashed all the way through the approach, the dialogue and the
// wipe, because that is what a person does and an input arriving mid-fade is a
// classic way to strand a state machine.
const d = window.dev;
const top = () => d.game.scenes.top;
const ow = () => d.game.scenes.find('overworld');
const out = [];
const fails = [];

/* ------------------------------------------------------------ boot */
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
state.giveItem('potion', 40);
state.setFlag('got_starter');
state.setFlag('starter_cinderpaw');

/* ------------------------------------------------------- instruments */
const gates = () => {
  const o = ow();
  if (!o) return 'no-overworld';
  return 'scene=' + top().name + ' depth=' + d.game.scenes.depth
    + ' BUSY=' + o.busy + ' FADE=' + o.fade.active + '(' + o.fade.t + '/' + o.fade.frames
    + ',hold=' + o.fade.holding + ',cb=' + !!o.fade.then + ')'
    + ' WIPE=' + !!o.wipe + ' EV=' + !!(o.events && o.events.running)
    + ' pbusy=' + o.player.busy + ' timers=' + o.timers.length
    + ' scripted=' + o.scripted.length
    + ' map=' + (o.map && o.map.id) + ' at=' + o.player.tileX + ',' + o.player.tileY;
};

// Real movement: press a direction and demand the body actually moved.
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

const settle = async (mash) => {
  for (let r = 0; r < 14; r++) {
    for (let i = 0; i < 20; i++) {
      d.tick(1);
      if (mash && i % 3 === 0) { d.down('Enter'); d.tick(1); d.up('Enter'); }
      if (mash && i % 5 === 0) { d.down('KeyD'); d.tick(1); d.up('KeyD'); }
    }
    for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 8);
    await d.sleep(60);
  }
  d.tick(40);
};

async function goTo(map, x, y, facing) {
  d.game.scenes.replaceAll(new OW(state, map, x, y, facing || 'down'));
  await d.loadWait(1300);
  for (let i = 0; i < 30 && top().name === 'dialogue'; i++) d.key('Enter', 10);
  // Any 'enter' script on the map gets to finish before the case starts.
  for (let i = 0; i < 400 && ow().events && ow().events.running; i++) {
    d.tick(1);
    if (top().name === 'dialogue') d.key('Enter', 4);
  }
  d.tick(20);
}

const walkable = (m, x, y) => {
  if (!m.inBounds(x, y)) return false;
  const c = m.collisionAt(x, y);
  return c === 0 || c === 6;
};

const DIRS = [
  { dx: 0, dy: -1, face: 'down', from: 'up' },
  { dx: 0, dy: 1, face: 'up', from: 'down' },
  { dx: -1, dy: 0, face: 'right', from: 'left' },
  { dx: 1, dy: 0, face: 'left', from: 'right' },
];

const strongParty = () => {
  state.party.length = 0;
  state.party.push(
    kinMod.createKin('cinderpaw', 60, d.game.rng, { originalTrainer: 'player' }),
    kinMod.createKin('sprigling', 60, d.game.rng, { originalTrainer: 'player' }),
    kinMod.createKin('pebblet', 60, d.game.rng, { originalTrainer: 'player' }),
  );
};
const doomedParty = () => {
  state.party.length = 0;
  const a = kinMod.createKin('cinderpaw', 2, d.game.rng, { originalTrainer: 'player' });
  a.currentHp = 1;
  state.party.push(a);
};

// Play the battle out. `mode`: 'win' | 'lose'.
async function playBattle(mode, mash) {
  for (let i = 0; i < 1500 && top().name !== 'battle'; i++) {
    d.tick(1);
    if (top().name === 'dialogue') d.key('Enter', 4);
    else if (mash && i % 4 === 0) { d.down('Enter'); d.tick(1); d.up('Enter'); }
    if (mash && i % 7 === 0) { d.down('KeyW'); d.tick(1); d.up('KeyW'); }
  }
  if (top().name !== 'battle') return { ok: false, why: 'battle never opened ' + gates() };
  const scene = top();
  let guard = 0;
  while (d.game.scenes.top === scene && guard++ < 9000) {
    const ph = scene.phase;
    if (ph === 'menu') scene.submit(d.game, { kind: 'move', index: 0 });
    else if (ph === 'finished' || ph === 'forcedSwitch') d.key('Enter', 3);
    else d.tick(3);
  }
  const result = scene.battle.result;
  await settle(mash);
  return { ok: true, result: result };
}

/* ------------------------------------------------ trainer placements */
const maps = ['route_1', 'route_2', 'route_3', 'route_4',
  'kellowmere_hall', 'brackwater_hall', 'kellowmere'];

// One case: reach `npcId` on `map` by `how`, fight to `mode`, then try to walk.
async function runCase(map, npcId, how, mode, mash) {
  const tag = map + '/' + npcId + ' ' + how + '/' + mode + (mash ? '/mash' : '');
  await goTo(map, 5, 5, 'down');
  let o = ow();
  let npc = o.npcs.find((n) => n.data.id === npcId);
  if (!npc) return tag + ' SKIP(npc not present)';
  if (state.defeatedTrainers) state.defeatedTrainers.clear();
  state.setVar('last_battle_won', 0);
  if (mode === 'win') strongParty(); else doomedParty();

  const nx = npc.actor.tileX, ny = npc.actor.tileY;
  let px = -1, py = -1, face = null;

  if (how === 'sight') {
    // Stand on the trainer's line, at the far end of the range they can see.
    const range = npc.data.sightRange || 4;
    const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[npc.actor.facing];
    for (let dist = range; dist >= 1; dist--) {
      const tx = nx + v[0] * dist, ty = ny + v[1] * dist;
      if (!walkable(o.map, tx, ty)) continue;
      let blocked = false;
      for (let k = 1; k < dist; k++) {
        if (o.map.collisionAt(nx + v[0] * k, ny + v[1] * k) === 1) blocked = true;
      }
      if (blocked) continue;
      px = tx; py = ty; face = 'down';
      break;
    }
    if (px < 0) return tag + ' SKIP(no clear sight tile)';
    // Approach the tile from one step further out, so onEnterTile fires the
    // way it does for a player walking in.
    const backX = px + v[0], backY = py + v[1];
    if (walkable(o.map, backX, backY)) {
      o.player.setTile(backX, backY);
      o.lastTile = { x: backX, y: backY };
      o.player.facing = { up: 'down', down: 'up', left: 'right', right: 'left' }[npc.actor.facing];
      d.tick(6);
      const key = { up: 'KeyS', down: 'KeyW', left: 'KeyD', right: 'KeyA' }[npc.actor.facing];
      for (let i = 0; i < 60 && !o.busy && !o.wipe && top().name === 'overworld'; i++) d.hold(key, 6);
    } else {
      o.player.setTile(px, py);
      o.lastTile = { x: -1, y: -1 };
      d.tick(2);
      o.player.setTile(px, py);
      d.tick(10);
    }
    if (!o.busy && !o.wipe && top().name === 'overworld') {
      return tag + ' SKIP(never spotted) ' + gates();
    }
  } else {
    for (const dir of DIRS) {
      const tx = nx + dir.dx, ty = ny + dir.dy;
      if (!walkable(o.map, tx, ty)) continue;
      if (o.npcs.some((n) => n.actor.tileX === tx && n.actor.tileY === ty)) continue;
      px = tx; py = ty; face = dir.face;
      break;
    }
    if (px < 0) return tag + ' SKIP(no open tile beside)';
    o.player.setTile(px, py);
    o.lastTile = { x: px, y: py };
    o.player.facing = face;
    d.tick(6);
    const base = canWalk();
    if (base !== 'yes') return tag + ' SKIP(cannot walk before the fight) ' + base;
    o.player.setTile(px, py);
    o.player.facing = face;
    d.tick(6);
    d.key('Enter', 6);
    if (!o.busy && !o.wipe && top().name === 'overworld' && !(o.events && o.events.running)) {
      return tag + ' SKIP(talk did nothing) ' + gates();
    }
  }

  const r = await playBattle(mode, mash);
  if (!r.ok) return tag + ' ' + r.why;
  const walk = canWalk();
  const line = tag + ' result=' + r.result + ' canWalk=' + walk;
  if (walk !== 'yes') fails.push(line);
  return line;
}

/* ------------------------------------------------------------- run */
const plan = [];
for (const map of maps) {
  await goTo(map, 5, 5, 'down');
  const o = ow();
  for (const n of o.npcs) {
    if (!n.data.trainer && !(n.data.script && /keeper|tarin/i.test(n.data.script))) continue;
    plan.push({ map: map, id: n.data.id, sight: !!n.data.trainer });
  }
}
out.push('plan: ' + plan.map((p) => p.map + '/' + p.id).join(', '));

for (const p of plan) {
  out.push(await runCase(p.map, p.id, 'talk', 'win', false));
  out.push(await runCase(p.map, p.id, 'talk', 'win', true));
  out.push(await runCase(p.map, p.id, 'talk', 'lose', false));
  if (p.sight) {
    out.push(await runCase(p.map, p.id, 'sight', 'win', false));
    out.push(await runCase(p.map, p.id, 'sight', 'win', true));
    out.push(await runCase(p.map, p.id, 'sight', 'lose', false));
  }
}

out.push('FAILURES=' + fails.length);
for (const f of fails) out.push('  !! ' + f);
return out;
