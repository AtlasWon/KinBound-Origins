// The operation, photographed at 1x on the maps it is built on.
//
// Stage 6 is thirty hours into a playthrough, so this driver does what
// crownspire-beats.js does: it makes the player the road really delivers --
// eight Crests, a team-raiser's party at the level simulate.mjs says they
// arrive with, and NO Tideheart, because Meridian have it until Cassian gives
// it back inside the Temple -- and then stands them on each map in turn.
//
//   npx electron tools/capture.cjs tools/shots/eastreach.js

const d = window.dev;
const top = () => d.game.scenes.top;
const log = [];
const note = (s) => log.push(s);
const key = (x, y) => `${x},${y}`;
const flag = (f) => !!top().state?.hasFlag?.(f);

const route = (sx, sy, tx, ty) => {
  const sc = top();
  const map = sc.map;
  if (!map) return null;
  const blocked = new Set((sc.npcs ?? []).map((n) => key(n.actor?.tileX ?? n.data?.x, n.actor?.tileY ?? n.data?.y)));
  const open = (x, y) => map.inBounds(x, y) && sc.canEnter(x, y, 'down') && !blocked.has(key(x, y));
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

const goTo = async (tx, ty) => {
  for (let attempt = 0; attempt < 4; attempt++) {
    const p = d.probe();
    if (top().name !== 'overworld') return false;
    const [x, y] = (p.pos || '0,0').split(',').map(Number);
    if (x === tx && y === ty) return true;
    const steps = route(x, y, tx, ty);
    if (!steps) return false;
    for (const k of steps) { d.hold(k, 12); d.tick(2); if (top().name !== 'overworld') return true; }
  }
  const p = d.probe();
  const [x, y] = (p.pos || '0,0').split(',').map(Number);
  return x === tx && y === ty;
};

const scenes = [];
const talk = async (picks = [], budget = 900) => {
  const seen = [];
  let pick = 0;
  let idle = 0;
  for (let i = 0; i < budget; i++) {
    const sc = top();
    if (scenes[scenes.length - 1] !== sc.name) scenes.push(sc.name);
    if (sc.name === 'battle') { idle = 0; d.key('Enter', 6); continue; }
    if (sc.name !== 'dialogue') {
      idle++; d.tick(4);
      if (idle > 30 && top().name === 'overworld') break;
      continue;
    }
    idle = 0;
    if (sc.choosing) {
      const want = picks[pick++] ?? 0;
      for (let j = 0; j < 8 && sc.choiceIndex !== want; j++) d.key('KeyS', 4);
      d.key('Enter', 8);
      continue;
    }
    const t = d.probe().text;
    if (t && seen[seen.length - 1] !== t) seen.push(t);
    d.key('Enter', 8);
  }
  return seen;
};

await d.loadWait(1400);
d.key('Enter', 20); await d.loadWait(400);
d.key('Enter', 20); await d.loadWait(700);
const state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;
const { createKin } = await import('/build/js/systems/kin.js');
const { Rng } = await import('/build/js/core/rng.js');

/**
 * The player the road really delivers to the East Quay. simulate.mjs puts the
 * team-raiser at L44-45 leaving Crownspire; this is that party, plus the two
 * things this act is defined by -- eight Crests, and an empty key pocket.
 */
const rng = new Rng('eastreach');
state.party.length = 0;
for (const [sp, lv] of [['volcatrix', 46], ['mossback', 45], ['gullswift', 45], ['galecrest', 45]]) {
  state.addKin(createKin(sp, lv, rng, { originalTrainer: 'player' }));
}
for (let n = 1; n <= 8; n++) state.giveCrest(n);
state.setFlag('crest_8_taken');
state.setFlag('act4_done');
state.setFlag('tideheart_taken');
state.giveArt('wade');
state.giveItem('full_restore', 4);
note('party ' + state.party.map((k) => k.name + ' L' + k.level).join(', '));
note('crests ' + state.crests.size + ' tideheart=' + state.hasItem('tideheart', 1) + ' swim=' + state.hasArt('swim'));

const shots = [];
const at = async (map, x, y, facing, name, extra) => {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing));
  await d.loadWait(1100);
  if (extra) await extra();
  shots.push(await d.shoot(name, 10, 1));
  note(name + ' -> ' + JSON.stringify(d.probe()));
};

/* --- the quay ------------------------------------------------------------ */
await at('eastreach_muster', 3, 8, 'right', 'er-01-quay-arch');
await at('eastreach_muster', 20, 8, 'right', 'er-02-quay-middle');
await at('eastreach_muster', 44, 8, 'right', 'er-03-quay-head');

/* --- the crossing -------------------------------------------------------- */
await at('eastreach_launch', 12, 12, 'up', 'er-04-launch-aft');
await at('eastreach_launch', 12, 5, 'up', 'er-05-launch-bow');

/* --- the shore ----------------------------------------------------------- */
await at('eastreach_shore', 12, 20, 'right', 'er-06-shore-beach');
await at('eastreach_shore', 20, 15, 'right', 'er-07-shore-bar');

/* --- the platform -------------------------------------------------------- */
await at('eastreach_platform', 20, 22, 'up', 'er-08-deck-stairhead');
await at('eastreach_platform', 20, 12, 'up', 'er-09-deck-main');
await at('eastreach_platform', 19, 6, 'up', 'er-10-deck-door');

/* --- the plank, and what is still shut behind Swim --------------------- */
// The critical path must NOT need Swim: it is taught two maps further on, on
// the last dry step inside the temple. What deep water gates here is a reward.
d.game.scenes.replaceAll(new Overworld(state, 'eastreach_shore', 12, 20, 'right'));
await d.loadWait(1000);
const plank = await goTo(39, 13);
note('WITHOUT SWIM, beach -> foot of the stair: ' + (plank ? 'crossed (right)' : 'BLOCKED (BAD)') + ' at ' + d.probe().pos);
const isletDry = await goTo(25, 17);
note('WITHOUT SWIM, the roof off the plank: ' + (isletDry ? 'REACHED (BAD)' : 'shut (right)') + ' at ' + d.probe().pos);
state.giveArt('swim');
const isletWet = await goTo(25, 17);
note('WITH SWIM, the roof off the plank: ' + (isletWet ? 'reached' : 'FAILED') + ' at ' + d.probe().pos);
shots.push(await d.shoot('er-11-shore-swim', 10, 1));

/*
 * The road, end to end, pathfound over each map's own collision. This is the
 * check that matters: a beautiful map the player cannot cross is not a map.
 * Everything reachable is also listed, because an unreachable NPC or item is
 * the failure that never shows up in a screenshot.
 */
const reach = (map) => {
  const sc = top();
  const seen = new Set();
  const [sx, sy] = (d.probe().pos || '0,0').split(',').map(Number);
  const q = [[sx, sy]];
  seen.add(key(sx, sy));
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = x + dx, ny = y + dy;
      if (!sc.map.inBounds(nx, ny) || seen.has(key(nx, ny))) continue;
      if (!sc.canEnter(nx, ny, dy > 0 ? 'down' : dy < 0 ? 'up' : dx > 0 ? 'right' : 'left')) continue;
      seen.add(key(nx, ny));
      q.push([nx, ny]);
    }
  }
  const misses = [];
  for (const n of sc.map.npcs) {
    const near = [[n.x, n.y - 1], [n.x, n.y + 1], [n.x - 1, n.y], [n.x + 1, n.y]];
    if (!near.some(([x, y]) => seen.has(key(x, y)))) misses.push('npc ' + n.id);
  }
  for (const o of sc.map.objects) {
    const near = o.kind === 'item' || o.kind === 'hiddenItem'
      ? [[o.x, o.y]]
      : [[o.x, o.y - 1], [o.x, o.y + 1], [o.x - 1, o.y], [o.x + 1, o.y]];
    if (!near.some(([x, y]) => seen.has(key(x, y)))) misses.push(o.kind + ' ' + o.x + ',' + o.y);
  }
  for (const w of sc.map.warps) if (!seen.has(key(w.x, w.y))) misses.push('warp -> ' + w.toMap);
  note(map + ': ' + seen.size + ' tiles reachable; unreachable: ' + (misses.length ? misses.join(', ') : 'none'));
};

const audit = async (map, x, y) => {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, 'down'));
  await d.loadWait(900);
  reach(map);
};
await audit('eastreach_muster', 2, 7);
await audit('eastreach_launch', 13, 13);
await audit('eastreach_shore', 12, 24);
await audit('eastreach_platform', 20, 24);

return { log, scenes, shots };
