// THE LOSS PATH, which is the half of the climax nobody sees and the half that
// can break the game. Loses on purpose with an under-levelled party, then tries
// to do the one thing that would skip the whole act: walk north into the
// chamber with the Tideheart still in Meridian's hands.
//
//   npx electron tools/capture.cjs tools/shots/kelllose.js
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
const pos = () => [world().player.tileX, world().player.tileY];
const goTo = (tx, ty) => {
  for (let a = 0; a < 3; a++) {
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

const state = top().state;
for (const f of ['act4_done', 'tideheart_taken', 'msh_record_played']) state.setFlag(f, true);
for (let c = 1; c <= 8; c++) state.giveCrest(c);
const flag = (f) => !!state.hasFlag(f);
const { createKin } = await import('/build/js/systems/kin.js');
const { Rng } = await import('/build/js/core/rng.js');
const rng = new Rng('kelllose');
state.party.length = 0;
state.party.push(createKin('rilltail', 12, rng, { originalTrainer: 'player' }));

const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;
d.game.scenes.replaceAll(new Overworld(state, 'temple_deep_power', 9, 15, 'up'));
await d.loadWait(1800);
const cast = () => (world().npcs || []).map((n) => n.data.id + '@' + n.actor.tileX + ',' + n.actor.tileY);

// Play until the runner goes quiet, which after a loss means the warp landed.
const settle = async (limit) => {
  for (let i = 0; i < limit; i++) {
    const t = top().name;
    if (t === 'battle' || t === 'dialogue') { d.key('Enter', 3); continue; }
    if (t !== 'overworld') { d.key('Enter', 3); continue; }
    if (!world().events || !world().events.running) return true;
    d.tick(3);
    if (world().fade && world().fade.active) await d.sleep(20);
  }
  return false;
};

goTo(10, 9);
const quiet1 = await settle(20000);
note('round 1: settled=' + quiet1 + ' pending=' + flag('tdp_fight_pending')
  + ' hp=' + state.party.map((k) => k.hp + '/' + k.maxHp).join(',')
  + ' pos=' + pos().join(',') + ' map=' + world().map.id);
note('cast after the loss: ' + cast().join(' '));
await d.shoot('kell-04-lost', 8, 2);

// Now the thing that must not work: walk north and out.
const reached = goTo(11, 1);
note('walked at the way out: reached=' + reached + ' pos=' + pos().join(',')
  + ' running=' + !!(world().events && world().events.running));
const quiet2 = await settle(20000);
note('after standing on the gate: settled=' + quiet2 + ' map=' + world().map.id
  + ' pos=' + pos().join(',') + ' pending=' + flag('tdp_fight_pending')
  + ' power_done=' + flag('td_power_done'));
note('ESCAPED INTO THE CHAMBER: ' + (world().map.id !== 'temple_deep_power'));

// Third: heal up the honest way and finish it, to prove the retry completes.
state.party.length = 0;
for (const pair of [['rilltail', 52], ['gullswift', 51], ['emberbore', 51], ['mossback', 51]]) {
  state.party.push(createKin(pair[0], pair[1], rng, { originalTrainer: 'player' }));
}
const k = (world().npcs || []).find((n) => n.data.id === 'tdp_kell');
if (k) {
  goTo(k.actor.tileX, k.actor.tileY + 1);
  d.hold('KeyW', 6);
  d.key('Enter', 6);
  for (let i = 0; i < 30 && top().name === 'dialogue'; i++) d.key('Enter', 5);
  // the ask defaults to yes
  await settle(20000);
}
note('after the rematch: kell_beaten=' + flag('td_kell_beaten')
  + ' power_done=' + flag('td_power_done')
  + ' tideheart=' + state.hasItem('tideheart') + ' taken=' + flag('tideheart_taken'));
return { log };
