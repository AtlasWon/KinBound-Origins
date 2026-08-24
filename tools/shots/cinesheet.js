// Contact sheets of the opening cinematic: one sheet per shot, four columns,
// so the whole film can be looked at in a handful of images instead of ninety.
//
// Each cell is the raw 1x back buffer, so this is still judging at 1x -- the
// grid only saves round trips, it does not scale anything up.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

const sheet = async (name, cells, cols) => {
  const w = cells[0].width;
  const h = cells[0].height;
  const rows = Math.ceil(cells.length / cols);
  const cv = document.createElement('canvas');
  cv.width = cols * (w + 2) + 2;
  cv.height = rows * (h + 2) + 2;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#803030';
  c.fillRect(0, 0, cv.width, cv.height);
  cells.forEach((cell, i) => {
    c.drawImage(cell, 2 + (i % cols) * (w + 2), 2 + Math.floor(i / cols) * (h + 2));
  });
  const url = cv.toDataURL('image/png');
  await fetch('/__shot/' + encodeURIComponent(name), { method: 'POST', body: url });
};

const grab = () => {
  const src = d.game.renderer.buffer;
  const cv = document.createElement('canvas');
  cv.width = src.width;
  cv.height = src.height;
  cv.getContext('2d').drawImage(src, 0, 0);
  return cv;
};

await d.loadWait(1400);
d.key('Enter', 4);
d.key('Enter', 4);
for (let i = 0; i < 60 && top().name !== 'opening'; i++) d.tick(4);
out.push('scene:' + top().name);

const LEN = [230, 210, 200, 230, 270, 300, 290, 180];
const STEP = Number(window.__step || 0);

for (let s = 0; s < LEN.length; s++) {
  const scene = top();
  if (scene.name !== 'opening') { out.push('left at shot ' + s); break; }
  const n = 8;
  const cells = [];
  let spent = 0;
  for (let i = 0; i < n; i++) {
    const want = Math.round((i + 0.5) * LEN[s] / n);
    d.tick(Math.max(1, want - spent));
    spent = want;
    cells.push(grab());
  }
  d.tick(Math.max(1, LEN[s] - spent));
  await sheet('sheet-' + s, cells, 4);
  out.push('shot ' + s + ' -> ' + top().shot + ' (' + top().name + ')');
}

return { out, scene: top().name };
