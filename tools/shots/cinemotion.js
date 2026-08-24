// Consecutive frames, four ticks apart, at 1x. This is the pass that judges
// MOTION rather than composition: anything that only reads as a pose looks the
// same in all eight cells.

const d = window.dev;
const top = () => d.game.scenes.top;

const sheet = async (name, cells, cols) => {
  const w = cells[0].width;
  const h = cells[0].height;
  const cv = document.createElement('canvas');
  cv.width = cols * (w + 2) + 2;
  cv.height = Math.ceil(cells.length / cols) * (h + 2) + 2;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#803030';
  c.fillRect(0, 0, cv.width, cv.height);
  cells.forEach((cell, i) => {
    c.drawImage(cell, 2 + (i % cols) * (w + 2), 2 + Math.floor(i / cols) * (h + 2));
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

const strip = async (name, gap) => {
  const cells = [];
  for (let i = 0; i < 6; i++) { cells.push(grab()); d.tick(gap); }
  await sheet(name, cells, 3);
};

await d.loadWait(1400);
d.key('Enter', 4);
d.key('Enter', 4);
for (let i = 0; i < 60 && top().name !== 'opening'; i++) d.tick(4);

const LEN = [230, 210, 200, 230, 270, 300, 290, 180];

d.tick(90);
await strip('motion-sea', 5);           // shot 0
d.tick(LEN[0] - 90 - 30 + LEN[1] + LEN[2] + 100);
await strip('motion-turn', 5);          // shot 3, mid-withdrawal

return { shot: top().shot };
