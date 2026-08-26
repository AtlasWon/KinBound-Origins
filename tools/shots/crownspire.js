// Crownspire at 1x, walked rather than teleported.
//
// It PATHFINDS over the map's own collision, exactly like tools/shots/act1.js,
// because dropping the player on an arbitrary tile bypasses collision and can
// put them inside solid scenery -- and a shot taken from ground the player
// cannot reach is a shot of a place that does not exist. Every frame here is
// taken from somewhere a player can stand, and the walk itself is the test: if
// a leg cannot be walked, the city has a wall in it.
//
//   node tools/serve.js
//   npx electron tools/capture.cjs tools/shots/crownspire.js

const d = window.dev;
const top = () => d.game.scenes.top;
const log = [];
const note = (s) => log.push(s);
const key = (x, y) => `${x},${y}`;

const route = (sx, sy, tx, ty) => {
  const sc = top();
  const map = sc.map;
  if (!map) return null;
  // NPCs are solid and the collision layer does not know about them, so a route
  // planned without them walks the player into a shopkeeper and stops dead. The
  // first pass of this driver did exactly that and reported a wall that is not there.
  const blocked = new Set((sc.npcs ?? []).map((n) => key(n.tileX ?? n.data?.x, n.tileY ?? n.data?.y)));
  const open = (x, y) => map.inBounds(x, y) && map.collisionAt(x, y) !== 1 && !blocked.has(key(x, y));
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
    for (const k of steps) {
      d.hold(k, 12);
      d.tick(2);
      if (top().name !== 'overworld') return true;
    }
  }
  const p = d.probe();
  const [x, y] = (p.pos || '0,0').split(',').map(Number);
  return x === tx && y === ty;
};

const clear = () => {
  for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 8);
  d.tick(4);
};

await d.loadWait(1400);
d.key('Enter', 20); await d.loadWait(400);
d.key('Enter', 20); await d.loadWait(700);
const state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;

// Stand the player just inside the west gate arch, on the road, which is where
// the Skyreach stair lands them. Everything after this is walked.
d.game.scenes.replaceAll(new Overworld(state, 'crownspire', 4, 58, 'right'));
await d.loadWait(1500);
note('entered at ' + d.probe().pos + ' on ' + d.probe().map);

const out = [];
const shoot = async (name, ...legs) => {
  let ok = true;
  for (const [wx, wy] of legs) ok = (await goTo(wx, wy)) && ok;
  d.tick(30);
  note(`${name}: ${ok ? 'walked' : 'GAVE UP'} -> ${d.probe().map} ${d.probe().pos}`);
  out.push(await d.shoot(name, 8, 1));
};

await shoot('cs-01-westgate', [10, 58]);
await shoot('cs-02-musteryard', [27, 59]);
await shoot('cs-03-masonsyard', [50, 58], [72, 58]);
await shoot('cs-04-civic', [50, 58], [47, 54], [24, 54]);
await shoot('cs-05-westroad', [47, 54], [47, 48], [35, 47]);
await shoot('cs-06-oldcity', [47, 47], [47, 44], [55, 44], [60, 45]);
await shoot('cs-07-riverside', [47, 44], [47, 38], [22, 38]);
await shoot('cs-08-kingsbridge', [47, 38], [47, 34]);
await shoot('cs-09-plaza', [47, 30], [47, 28]);
await shoot('cs-10-garden', [40, 27], [33, 26]);
await shoot('cs-11-crownstair', [47, 27], [47, 21]);
await shoot('cs-12-terrace', [47, 19], [47, 17]);
await shoot('cs-13-roll', [40, 17], [25, 16], [14, 16]);
await shoot('cs-14-halldoor', [40, 17], [47, 16]);
await shoot('cs-15-ascentgate', [32, 16], [32, 8], [40, 6], [47, 7]);

// Inside: the Long Gallery, and the Crown Floor above it.
await goTo(47, 16);
{
  const ok = await goTo(47, 15);
  await d.loadWait(1300); clear();
  note(`hall door: ${ok ? 'walked' : 'GAVE UP'} -> ${d.probe().map} ${d.probe().pos}`);
}
if (d.probe().map === 'crownspire_hall') {
  // Up the gallery in column 10, which is clear of all three Stewards' sight
  // lines -- Hollis watches x4, Derrin x7, Mabe x12. The first
  // pass walked straight up the middle and was challenged by Derrin at 13,15,
  // which is the Hall working correctly and a driver that cannot photograph it.
  await shoot('cs-16-gallery-door', [10, 19]);
  await shoot('cs-17-gallery-bays', [10, 15], [10, 12]);
  await shoot('cs-18-gallery-top', [10, 6], [10, 4]);
  const ok = await goTo(7, 3) && await goTo(7, 2);
  await d.loadWait(1300); clear();
  note(`crown stair: ${ok ? 'walked' : 'GAVE UP'} -> ${d.probe().map} ${d.probe().pos}`);
  if (d.probe().map === 'crownspire_hall_crown') {
    await shoot('cs-19-crownfloor', [7, 9]);
    await shoot('cs-20-keeper', [7, 6]);
  }
}

return { log, out, probe: d.probe() };
