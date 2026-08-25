// JOB 1, wider net. Every realistic way into a battle x every way out, then a
// hard check that the overworld will actually let the player walk again.
const d = window.dev;
const top = () => d.game.scenes.top;
const ow = () => d.game.scenes.find('overworld');
const out = [];

await d.loadWait(1400);
// Press through the title, the menu and the cinematic until the creator is
// actually on top. A fixed count of Enters broke when the menu gained a
// transition into the cinematic and moved the beat this landed on.
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
state.giveItem('field_vessel', 60);
state.giveItem('potion', 20);

const settle = async () => {
  for (let r = 0; r < 10; r++) {
    d.tick(20);
    for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 8);
    await d.sleep(70);
  }
  d.tick(30);
};

async function goTo(map, x, y, facing) {
  d.game.scenes.replaceAll(new OW(state, map, x, y, facing || 'down'));
  await d.loadWait(1400);
  for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);
  await settle();
}

const gates = () => {
  const o = ow();
  if (!o) return 'no-overworld';
  return 'scene=' + top().name + ' depth=' + d.game.scenes.depth
    + ' busy=' + o.busy + ' fade=' + o.fade.active + ' wipe=' + !!o.wipe
    + ' ev=' + !!(o.events && o.events.running)
    + ' pbusy=' + o.player.busy + ' map=' + o.map.id
    + ' at=' + o.player.tileX + ',' + o.player.tileY;
};

const canWalk = () => {
  const o = ow();
  if (!o || top().name !== 'overworld') return 'NO(' + gates() + ')';
  const p = o.player;
  const before = p.x.toFixed(2) + ',' + p.y.toFixed(2);
  for (const k of ['KeyD', 'KeyA', 'KeyW', 'KeyS']) {
    d.hold(k, 14);
    if (p.x.toFixed(2) + ',' + p.y.toFixed(2) !== before) return 'yes';
  }
  return 'NO(' + gates() + ')';
};

const open = (m, x, y) => {
  const c = m.collisionAt(x, y);
  return m.inBounds(x, y) && (c === 0 || c === 6);
};

// A tile with room to move in every direction, so a failed walk means a gate
// and not a wall.
function findHome(m, wantGrass) {
  for (let y = 2; y < m.height - 2; y++) {
    for (let x = 2; x < m.width - 2; x++) {
      if (!open(m, x, y)) continue;
      if (!open(m, x + 1, y) || !open(m, x - 1, y) || !open(m, x, y + 1) || !open(m, x, y - 1)) continue;
      if (wantGrass && !(m.terrainAt(x, y).encounter && m.terrainAt(x + 1, y).encounter)) continue;
      if (m.warpAt(x, y) || m.warpAt(x + 1, y) || m.warpAt(x - 1, y)) continue;
      return { x, y };
    }
  }
  return null;
}

const strongParty = () => {
  state.party.length = 0;
  state.party.push(
    kinMod.createKin('cinderpaw', 45, d.game.rng, { originalTrainer: 'player' }),
    kinMod.createKin('sprigling', 45, d.game.rng, { originalTrainer: 'player' }),
    kinMod.createKin('pebblet', 45, d.game.rng, { originalTrainer: 'player' }),
  );
};

async function playBattle(mode) {
  for (let i = 0; i < 600 && top().name !== 'battle'; i++) {
    d.tick(1);
    if (top().name === 'dialogue') d.key('Enter', 6);
  }
  if (top().name !== 'battle') return 'battle never opened (' + gates() + ')';
  const scene = top();
  let guard = 0;
  let switched = false;
  while (d.game.scenes.top === scene && guard++ < 6000) {
    const ph = scene.phase;
    if (ph === 'menu') {
      if (mode === 'run') scene.submit(d.game, { kind: 'run' });
      else if (mode === 'catch') scene.submit(d.game, { kind: 'item', item: 'field_vessel', partyIndex: 0 });
      else if (mode === 'switch' && !switched) {
        switched = true;
        scene.submit(d.game, { kind: 'switch', partyIndex: 1 });
      } else scene.submit(d.game, { kind: 'move', index: 0 });
    } else if (ph === 'finished' || ph === 'forcedSwitch') {
      d.key('Enter', 3);
    } else {
      d.tick(3);
    }
  }
  await settle();
  return 'guard=' + guard;
}

await goTo('route_1', 14, 20, 'down');
const HOME = findHome(ow().map, false);
const GRASS = findHome(ow().map, true);
out.push('home=' + JSON.stringify(HOME) + ' grass=' + JSON.stringify(GRASS));

async function atHome(spot) {
  const o = ow();
  o.player.setTile(spot.x, spot.y);
  o.lastTile = { x: spot.x, y: spot.y };
  d.tick(4);
  return canWalk();
}

/* ---------------------------------------------------- 1. wild from grass */
strongParty();
{
  const base = await atHome(GRASS || HOME);
  let started = false;
  for (let i = 0; i < 400 && !started; i++) {
    d.hold(i % 2 ? 'KeyD' : 'KeyA', 12);
    if (ow().busy || ow().wipe || top().name === 'battle') started = true;
  }
  out.push('grass baseline=' + base + ' started=' + started);
  if (started) out.push('  grass win: ' + (await playBattle('win')) + ' canWalk=' + canWalk());
}

/* ------------------------------------------- 2. trainer, spotted on sight */
for (const mode of ['win', 'loss']) {
  await goTo('route_1', HOME.x, HOME.y, 'down');
  if (mode === 'loss') {
    state.party.length = 0;
    const a = kinMod.createKin('cinderpaw', 3, d.game.rng, { originalTrainer: 'player' });
    a.currentHp = 1;
    state.party.push(a);
  } else strongParty();
  if (state.defeatedTrainers && state.defeatedTrainers.clear) state.defeatedTrainers.clear();
  const o = ow();
  // Madden stands at (12,25) facing LEFT, so his line runs west: 11,10,9,8.
  // Step up into (11,25) and he spots you.
  o.player.setTile(11, 26);
  o.lastTile = { x: 11, y: 26 };
  d.tick(4);
  let started = false;
  for (let i = 0; i < 200 && !started; i++) {
    d.hold('KeyW', 10);
    if (o.busy || o.wipe || top().name === 'battle') started = true;
  }
  out.push('sight(' + mode + ') started=' + started + ' ' + gates());
  if (started) {
    for (let i = 0; i < 1200 && top().name !== 'battle'; i++) {
      d.tick(1);
      if (top().name === 'dialogue') d.key('Enter', 4);
    }
    out.push('  sight(' + mode + '): ' + (await playBattle(mode)) + ' after=' + gates()
      + ' canWalk=' + canWalk());
  }
}

/* ------------------------------------------ 3. trainer, talked to head-on */
await goTo('route_1', HOME.x, HOME.y, 'down');
strongParty();
if (state.defeatedTrainers && state.defeatedTrainers.clear) state.defeatedTrainers.clear();
{
  const o = ow();
  o.player.setTile(17, 26);
  o.player.facing = 'up';
  d.tick(4);
  d.key('Enter', 6);
  out.push('talk started ' + gates());
  out.push('  talk win: ' + (await playBattle('win')) + ' canWalk=' + canWalk());
}

/* ----------------------- 4..7 direct starts from a known-open home tile */
const cases = [
  ['switch', () => strongParty()],
  ['run', () => strongParty()],
  ['catch', () => strongParty()],
  ['forced', () => {
    state.party.length = 0;
    const a = kinMod.createKin('cinderpaw', 4, d.game.rng, { originalTrainer: 'player' });
    a.currentHp = 1;
    state.party.push(a, kinMod.createKin('pebblet', 55, d.game.rng, { originalTrainer: 'player' }));
  }],
];
for (const [mode, setup] of cases) {
  await goTo('route_1', HOME.x, HOME.y, 'down');
  setup();
  const base = await atHome(HOME);
  const foeLevel = mode === 'forced' ? 30 : 5;
  ow().startBattle(d.game, { foeParty: [kinMod.createKin('menhir', foeLevel, d.game.rng)], isWild: true });
  const r = await playBattle(mode === 'forced' ? 'win' : mode);
  out.push(mode + ': baseline=' + base + ' ' + r + ' canWalk=' + canWalk());
}

return out;

