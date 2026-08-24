// Crops of the moving edge, blown up, to check the dither structure itself.
// Judging happens at 1x elsewhere; this is only for reading the pattern.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

const clear = () => {
  for (let i = 0; i < 24 && top().name === 'dialogue'; i++) d.key('Enter', 8);
  d.tick(4);
};

await d.loadWait(1400);
d.key('Enter', 4);
d.key('Enter', 30);
d.key('Enter', 60);
for (let i = 0; i < 30; i++) {
  if (typeof top().rows !== 'function') { d.key('Enter', 20); continue; }
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1600);
clear();

const tr = await import('/build/js/ui/transition.js');
const cover = {
  name: 'cover', transparent: true, style: 'door', p: 0, dir: 'down',
  update() {},
  render(_g, r) { tr.drawAreaCover(r, this.style, this.p, this.dir); },
};
d.game.scenes.push(cover);
d.tick(1);

// Crop in buffer pixels, upscaled with no smoothing, posted like a shot.
const crop = async (name, bx, by, bw, bh, scale) => {
  const src = d.game.renderer.buffer;
  const up = document.createElement('canvas');
  up.width = bw * scale; up.height = bh * scale;
  const cx = up.getContext('2d');
  cx.imageSmoothingEnabled = false;
  cx.drawImage(src, bx, by, bw, bh, 0, 0, up.width, up.height);
  await fetch('/__shot/' + encodeURIComponent(name), { method: 'POST', body: up.toDataURL('image/png') });
};

const shot = async (name, style, p, dir, bx, by, bw, bh, scale) => {
  cover.style = style; cover.p = p; cover.dir = dir;
  d.tick(1);
  await crop(name, bx, by, bw, bh, scale);
};

// The left door's leading edge, half way through.
await shot('zm-door-half', 'door', 0.5, 'down', 90, 90, 80, 60, 6);
await shot('zm-door-early', 'door', 0.18, 'down', 0, 90, 80, 60, 6);
// A route seam sweeping down.
await shot('zm-edge-half', 'edge', 0.5, 'down', 140, 60, 120, 60, 5);
// The iris top edge.
await shot('zm-iris-half', 'stairs', 0.5, 'up', 140, 40, 120, 60, 5);

// Numbers, not just pictures: the darkness profile across the door's feather.
cover.style = 'door'; cover.p = 0.5; d.tick(1);
const g = d.game.renderer.buffer.getContext('2d', { willReadFrequently: true });
const row = g.getImageData(0, 160, 320, 1).data;
const prof = [];
for (let x = 100; x < 190; x += 2) prof.push(row[x * 4] + ',' + row[x * 4 + 1]);
out.push('door p=.5 row scan (r,g per 2px from bx=100): ' + prof.join(' '));

return { out };
