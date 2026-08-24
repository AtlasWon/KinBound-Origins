// The wading line against the new clump tile.
//
// With one discrete tuft to a cell and bare turf at its shoulders, the hard
// case is no longer "does the grass cut the legs" -- it is where a character is
// standing when it does. Dead centre on a tile they are behind a clump; halfway
// between two, the middle of their body is over the gap and only their edges
// have blades in front of them. So this walks east one pixel at a time and
// crops every frame, which is the only way to see the straddle.
//
//   npx electron tools/capture.cjs tools/shots/grassleg.js

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
const clear = () => { for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10); };

await d.loadWait(1400);
d.key('Enter', 4); d.key('Enter', 30);
d.key('Enter', 60);
for (let i = 0; i < 30; i++) {
  if (typeof top().rows !== 'function') { d.key('Enter', 20); continue; }
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
const CW = 32, CH = 34;

const sheet = (cols, rows, scale) => {
  const cv = document.createElement('canvas');
  cv.width = CW * cols * scale; cv.height = CH * rows * scale;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#101418'; c.fillRect(0, 0, cv.width, cv.height);
  return { cv, c, n: 0, cols, scale };
};
const grabAt = (s, wx, wy) => {
  const r = d.game.renderer;
  const col = s.n % s.cols, row = Math.floor(s.n / s.cols);
  s.c.drawImage(r.buffer,
    Math.round((wx - r.camX - CW / 2) * DETAIL), Math.round((wy - r.camY - CH + 6) * DETAIL),
    CW * DETAIL, CH * DETAIL, col * CW * s.scale, row * CH * s.scale, CW * s.scale, CH * s.scale);
  s.n++;
};
const grab = (s) => { const p = top().player; grabAt(s, p.centerX, p.footY); };
const post = async (s, name) => {
  await fetch('/__shot/' + name, { method: 'POST', body: s.cv.toDataURL('image/png') });
};
const go = async (map, x, y, facing) => {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing));
  await d.loadWait(1400);
  clear();
  return top();
};

// Two tiles of travel east, every frame: the clump, the gap, the next clump.
{
  await go('route_1', 5, 21, 'right');
  const s1 = sheet(16, 2, 1);
  const s4 = sheet(16, 2, 4);
  d.down('KeyD');
  for (let i = 0; i < 32; i++) { d.tick(1); grab(s1); grab(s4); }
  d.up('KeyD');
  await post(s1, 'gl-east-1x');
  await post(s4, 'gl-east-4x');
  out.push('east ended ' + d.probe().pos);
}

// Walking north out of the top edge of a patch, where the row above has no
// grass to cover anything: the moment occlusion has to let go.
{
  await go('route_1', 6, 22, 'up');
  const s = sheet(12, 1, 4);
  d.down('KeyW');
  for (let i = 0; i < 12; i++) { d.tick(2); grab(s); }
  d.up('KeyW');
  await post(s, 'gl-northedge-4x');
  out.push('north ended ' + d.probe().pos);
}

// Out of the west edge of the patch: the frames where half the body has grass
// in front of it and half has none are the ones that expose a bad cut.
{
  await go('route_1', 6, 21, 'left');
  const s = sheet(12, 1, 4);
  d.down('KeyA');
  for (let i = 0; i < 12; i++) { d.tick(2); grab(s); }
  d.up('KeyA');
  await post(s, 'gl-westedge-4x');
  out.push('west ended ' + d.probe().pos);
}

// NPCs, who are drawn by the same skirt but never move off a tile centre.
{
  const sc = await go('route_1', 6, 25, 'up');
  sc.addNpcRuntime({ id: 'gl_a', sprite: 'girl', x: 5, y: 22, facing: 'down', movement: { kind: 'static' } });
  sc.addNpcRuntime({ id: 'gl_b', sprite: 'boy', x: 7, y: 21, facing: 'left', movement: { kind: 'static' } });
  sc.addNpcRuntime({ id: 'gl_c', sprite: 'girl', x: 9, y: 22, facing: 'right', movement: { kind: 'static' } });
  d.tick(4);
  const s = sheet(3, 1, 4);
  grabAt(s, 5 * 16 + 8, 22 * 16 + 15);
  grabAt(s, 7 * 16 + 8, 21 * 16 + 15);
  grabAt(s, 9 * 16 + 8, 22 * 16 + 15);
  await post(s, 'gl-npcs-4x');
  await d.shoot('gl-scene-1x', 2, 1);
}

return { out };
