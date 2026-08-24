// Every frame of two tiles of travel through the big route_1 patch, cropped to
// the body. The failure this catches is a flicker, not a still: what has to
// hold is that the character stays the same depth in the grass frame to frame,
// and that nothing pale from the tile is repainted across their chest.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(1400);
d.key('Enter', 20); await d.loadWait(400);
d.key('Enter', 20); await d.loadWait(600);
const state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;

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
  for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);
  return top();
}

{
  await go('route_1', 6, 20, 'down');
  out.push('start ' + d.probe().pos);
  const s1 = sheet(8, 3, 1);
  const s2 = sheet(8, 3, 4);
  d.down('KeyS');
  for (let i = 0; i < 24; i++) { d.tick(1); grab(s1); grab(s2); }
  d.up('KeyS');
  await post(s1, 'tj-wade-south-1x');
  await post(s2, 'tj-wade-south-4x');
  out.push('south ended ' + d.probe().pos);
}

{
  const sc = await go('route_1', 6, 24, 'up');
  sc.addNpcRuntime({ id: 'g_a', sprite: 'girl', x: 6, y: 22, facing: 'down', movement: { kind: 'static' } });
  sc.addNpcRuntime({ id: 'g_b', sprite: 'boy', x: 8, y: 21, facing: 'down', movement: { kind: 'static' } });
  d.tick(4);
  const s = sheet(2, 1, 4);
  grabAt(s, 6 * 16 + 8, 22 * 16 + 15);
  grabAt(s, 8 * 16 + 8, 21 * 16 + 15);
  await post(s, 'tj-wade-npcs-4x');
  await d.shoot('tj-wade-scene-1x', 2, 1);
}

return { out, probe: d.probe() };
