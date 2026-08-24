// Tall grass: is the player waist-deep the whole way through a patch?
//
// The failure this driver exists to catch is a flicker, not a still: with free
// movement, occlusion tied to the tile grid makes a character sink and surface
// once per tile. So the sheets here are *consecutive frames* cropped around the
// body -- coarser sampling shows a good-looking still and hides the bug.
//
//   node tools/serve.js
//   npx electron tools/capture.cjs tools/shots/grass.js
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
const clear = () => { for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10); };

await d.loadWait(1400);
d.key('Enter', 4); d.key('Enter', 30);
d.key('Enter', 60);
for (let i = 0; i < 30; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1400);
clear();

const state = top().state;
const Overworld = top().constructor;
const DETAIL = 2;
const CW = 40, CH = 40;

function sheet(cols, rows, scale) {
  const cv = document.createElement('canvas');
  cv.width = CW * cols * scale; cv.height = CH * rows * scale;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#101418'; c.fillRect(0, 0, cv.width, cv.height);
  return { cv, c, n: 0, cols, scale };
}
function grabAt(s, wx, wy) {
  const r = d.game.renderer;
  const sx = Math.round((wx - r.camX - CW / 2) * DETAIL);
  const sy = Math.round((wy - r.camY - CH + 8) * DETAIL);
  const col = s.n % s.cols, row = Math.floor(s.n / s.cols);
  s.c.drawImage(r.buffer, sx, sy, CW * DETAIL, CH * DETAIL,
    col * CW * s.scale, row * CH * s.scale, CW * s.scale, CH * s.scale);
  s.n++;
}
const grab = (s) => { const p = top().player; grabAt(s, p.centerX, p.footY); };
async function post(s, name) {
  const res = await fetch('/__shot/' + name, { method: 'POST', body: s.cv.toDataURL('image/png') });
  return res.text();
}
async function go(map, x, y, facing) {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing));
  await d.loadWait(1400);
  clear();
  return top();
}

// --- every frame of two tiles of travel south, inside the big patch -------
// route_1 rows 20..22 are tall grass across x 4..9.
{
  await go('route_1', 6, 20, 'down');
  out.push('start ' + d.probe().pos);
  const s1 = sheet(8, 3, 1);
  const s2 = sheet(8, 3, 4);
  d.down('KeyS');
  for (let i = 0; i < 24; i++) { d.tick(1); grab(s1); grab(s2); }
  d.up('KeyS');
  await post(s1, 'grass-south-1x');
  await post(s2, 'grass-south-4x');
  out.push('south ended ' + d.probe().pos);
}

// --- walking out of the west edge, where only half the body is in grass ---
{
  await go('route_1', 6, 21, 'left');
  const s = sheet(8, 2, 4);
  d.down('KeyA');
  for (let i = 0; i < 16; i++) { d.tick(2); grab(s); }
  d.up('KeyA');
  await post(s, 'grass-westedge-4x');
  out.push('west ended ' + d.probe().pos);
}

// --- other characters get the same treatment ------------------------------
{
  const sc = await go('route_1', 6, 24, 'up');
  sc.addNpcRuntime({ id: 'grass_a', sprite: 'girl', x: 6, y: 22, facing: 'down', movement: { kind: 'static' } });
  sc.addNpcRuntime({ id: 'grass_b', sprite: 'boy', x: 8, y: 21, facing: 'down', movement: { kind: 'static' } });
  d.tick(4);
  const s = sheet(2, 1, 4);
  grabAt(s, 6 * 16 + 8, 22 * 16 + 15);
  grabAt(s, 8 * 16 + 8, 21 * 16 + 15);
  await post(s, 'grass-npcs-4x');
  await d.shoot('grass-scene-1x', 2, 1);
}

return { out, probe: d.probe() };
