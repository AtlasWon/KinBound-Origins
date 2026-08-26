// Skyreach, walked rather than teleported.
//
// The most common failure on this project is a join nobody owned -- an entrance
// drawn on one map with a room built behind it and nothing connecting them --
// and the only proof against it is a driver that PATHFINDS over the map's own
// collision, exactly as tools/shots/act1.js does. This one walks in off the
// road from Route 9 and does not stop until it is standing in front of Keeper
// Fenn, going through every door on the way, and reports where it gave up if it
// does. Teleporting would prove nothing: it bypasses collision, so it cannot
// tell a bridge from a picture of one.

const d = window.dev;
const top = () => d.game.scenes.top;
const log = [];
const note = (s) => { log.push(s); };

const route = (sx, sy, tx, ty) => {
  const map = top().map;
  if (!map) return null;
  const key = (x, y) => `${x},${y}`;
  // NPCs are obstacles, and a search that does not know that plans straight
  // through a townsperson, bumps, and reports the map as broken. act1.js has
  // the same blind spot; it has just never walked past anybody standing in a
  // three-tile street.
  const blocked = new Set((top().npcs || []).map((n) => key(n.actor.tileX, n.actor.tileY)));
  const open = (x, y) => map.inBounds(x, y) && map.collisionAt(x, y) !== 1
    && !(blocked.has(key(x, y)) && !(x === tx && y === ty));
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

const clear = () => { for (let i = 0; i < 60 && top().name === 'dialogue'; i++) d.key('Enter', 8); d.tick(4); };

/**
 * Walk to a tile, re-planning every few steps.
 *
 * The first cut of this fired a whole eighty-key path in one go, the way
 * act1.js does, and drifted: one tile of desync anywhere in eighty and every
 * key after it is walking into a wall. Over the length of Skyreach that turned
 * a working map into four GAVE UPs in a row. Six steps at a time and a fresh
 * search costs nothing and cannot drift.
 */
const goTo = async (tx, ty) => {
  // A warp does NOT change the scene -- the overworld just loads a different
  // map under the same scene -- so "have we left" has to be asked of the map id
  // and not of the scene name. The first cut of this asked the scene, walked
  // through the Masthouse door, did not notice, re-planned against the Hall's
  // own grid, failed, walked back out, and reported the door as broken.
  const home = d.probe().map;
  for (let attempt = 0; attempt < 220; attempt++) {
    clear();
    if (top().name !== 'overworld') return false;
    if (d.probe().map !== home) return true;           // a door opened
    const [x, y] = (d.probe().pos || '0,0').split(',').map(Number);
    if (x === tx && y === ty) return true;
    const steps = route(x, y, tx, ty);
    if (!steps || !steps.length) return false;
    for (const k of steps.slice(0, 6)) {
      d.hold(k, 12);
      d.tick(2);
      if (d.probe().map !== home) { await d.loadWait(600); clear(); return true; }
      if (top().name !== 'overworld') {
        clear();
        if (top().name !== 'overworld') return true;
        break;
      }
    }
  }
  const [x, y] = (d.probe().pos || '0,0').split(',').map(Number);
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
clear();

const state = top().state;
// The player who reaches Skyreach in the finished game is carrying six Crests
// and a party. Both gates in this Hall are Crest gates, so a walk that does not
// hold them proves nothing about the back half of the map.
for (let n = 1; n <= 6; n++) state.giveCrest(n, 'test');
note(`crests: ${state.crestCount}`);

const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;
// Start ON the road tile Route 9 hands the player, not somewhere convenient.
d.game.scenes.replaceAll(new Overworld(state, 'skyreach', 1, 41, 'right'));
await d.loadWait(1600);
clear();
note(`entered at ${d.probe().map} ${d.probe().pos}`);

const step = async (label, tx, ty) => {
  const before = d.probe().map;
  const ok = await goTo(tx, ty);
  await d.loadWait(1000);
  clear();
  note(`${label}: ${ok ? 'walked' : 'GAVE UP'} ${before} -> ${d.probe().map} ${d.probe().pos}`);
  return ok;
};

const out = [];
await step('the gorge opens', 28, 41);
out.push(await d.shoot('walk-01-arrival', 8, 2));
await step('the clinic door', 12, 27);
// A door warp fires when you STEP ON to the tile, and the town drops the player
// on it already, so walking to it again is a no-op. Step off first.
await step('into the room', 7, 8);
await step('back out', 7, 10);
await step('the lookout rail', 27, 28);
out.push(await d.shoot('walk-02-lookout', 8, 2));
await step('the west cable station', 25, 16);
await step('into the car', 5, 4);
await step('out of the car on the far cliff', 10, 3);
note(`the Cradle put us at ${d.probe().map} ${d.probe().pos}`);
out.push(await d.shoot('walk-03-docks', 8, 2));
await step('back over the span, the long way', 32, 44);
await step('across it', 47, 45);
out.push(await d.shoot('walk-04-span', 8, 2));
await step('the Masthouse door', 59, 48);
note(`inside: ${d.probe().map}`);
await step('across the machine floor', 9, 10);
await step('the back door', 9, 0);
note(`on the spurs: ${d.probe().map} ${d.probe().pos}`);
out.push(await d.shoot('walk-05-spurs', 8, 2));
await step('the Fan', 18, 26);
await step('Spur Two', 18, 15);
await step('the foot of the great mast', 18, 7);
out.push(await d.shoot('walk-06-keeper', 8, 2));
note(`ended at ${d.probe().map} ${d.probe().pos}`);
// The way home is the east side, and it only goes down.
await step('the way down', 31, 6);
await step('the sill', 18, 37);
note(`came down to ${d.probe().map} ${d.probe().pos}`);

return { log, out };
