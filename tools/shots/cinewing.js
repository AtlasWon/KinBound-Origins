// One bird, very large, across a whole wingbeat. This is a diagnostic: the
// point is to see the SHAPE the wing makes, not to judge the film.

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

// The lead bird crosses the whole width every ~250 ticks; sample eight
// consecutive frames so a wingbeat is visible as motion.
d.tick(60);
const cells = [];
for (let i = 0; i < 12; i++) { cells.push(grab()); d.tick(3); }
await crop('wing-strip', cells, 4, 0, 12, 90, 46, 6);

return { ok: true };
