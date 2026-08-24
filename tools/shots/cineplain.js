// The far column in the plains shot, close enough to tell an animal from a bush.

const d = window.dev;
const top = () => d.game.scenes.top;

const crop = async (name, cells, cols, x, y, w, h, scale) => {
  const cv = document.createElement('canvas');
  const cw = w * scale;
  const ch = h * scale;
  cv.width = cols * (cw + 2) + 2;
  cv.height = Math.ceil(cells.length / cols) * (ch + 2) + 2;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#803030';
  c.fillRect(0, 0, cv.width, cv.height);
  cells.forEach((cell, i) => {
    const k = cell.width / 240;
    c.drawImage(cell, x * k, y * k, w * k, h * k,
      2 + (i % cols) * (cw + 2), 2 + Math.floor(i / cols) * (ch + 2), cw, ch);
  });
  await fetch('/__shot/' + encodeURIComponent(name),
    { method: 'POST', body: cv.toDataURL('image/png') });
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

d.tick(230 + 70);
const cells = [];
for (let i = 0; i < 6; i++) { cells.push(grab()); d.tick(4); }
await crop('plain-column', cells, 3, 0, 74, 120, 34, 6);

return { shot: top().shot };
