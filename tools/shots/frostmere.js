// Frostmere at 1x, entered on tiles the maps themselves warp to, and then
// WALKED with the map's own collision so nothing is photographed from a tile a
// player could not stand on.
const d = window.dev;
const top = () => d.game.scenes.top;

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

const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;
const state = top().state;
// The Hall gates on five Crests and the Wade art is what gets you off the ice,
// so the driver arrives holding both -- exactly as the road would deliver it.
for (let c = 1; c <= 5; c++) state.giveCrest(c);
if (state.giveArt) state.giveArt('wade');

const out = [];

/* Breadth-first over the live map's own collision, as tools/shots/act1.js does:
   teleporting to an arbitrary tile can drop the player inside solid scenery. */
const route = (sx, sy, tx, ty) => {
  const map = top().map;
  if (!map) return null;
  const key = (x, y) => x + ',' + y;
  const open = (x, y) => map.inBounds(x, y) && map.collisionAt(x, y) !== 1;
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
  const p = d.probe();
  const [x, y] = (p.pos || '0,0').split(',').map(Number);
  const steps = route(x, y, tx, ty);
  if (!steps) { out.push('NO ROUTE to ' + tx + ',' + ty + ' from ' + x + ',' + y); return false; }
  for (const k of steps) { d.hold(k, 16); d.tick(2); }
  const q = d.probe();
  if (q.pos !== tx + ',' + ty) out.push('DRIFTED: wanted ' + tx + ',' + ty + ' got ' + q.pos);
  return true;
};

const enter = async (map, x, y, name) => {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, 'down'));
  await d.loadWait(1500);
  for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 8);
  out.push(name + ' @ ' + (d.probe().map || '?') + ' ' + d.probe().pos);
  await d.shoot(name, 8, 1);
};

const shootAt = async (tx, ty, name) => {
  await goTo(tx, ty);
  for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 8);
  out.push(name + ' @ ' + d.probe().pos);
  await d.shoot(name, 8, 1);
};

// The road really does put the player down here: route_8_pass 0,20 -> 2,24.
await enter('frostmere', 2, 25, 'fm-01-gate');
await shootAt(14, 25, 'fm-02-street-one');
await shootAt(11, 23, 'fm-03-inn-and-fire');
await shootAt(22, 23, 'fm-04-clinic-and-store');
await shootAt(8, 33, 'fm-05-hall-and-shore');
await shootAt(20, 34, 'fm-06-quay-and-ice');
await shootAt(20, 38, 'fm-07-the-rotten-mere');
await shootAt(38, 18, 'fm-08-the-trail');
await shootAt(33, 11, 'fm-09-met-station');
await shootAt(20, 7, 'fm-10-observatory-door');

await enter('frostmere_hall', 11, 14, 'fm-11-hall-room');
await enter('frostmere_hall_cistern', 2, 2, 'fm-12-cistern-landing');
await shootAt(4, 6, 'fm-13-cistern-channel');
await shootAt(10, 10, 'fm-14-cistern-intake');
await enter('frostmere_inn', 8, 12, 'fm-15-inn');
await enter('frostmere_icehouse', 9, 12, 'fm-16-icehouse');
await enter('frostmere_provisioner', 7, 10, 'fm-17-store');
await enter('frostmere_house_a', 5, 9, 'fm-18-house');

return { out };
