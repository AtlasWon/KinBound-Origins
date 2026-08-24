// A close look at the swimmers in the deep shot: are they graded into the water
// or sitting on top of it?

const d = window.dev;
const top = () => d.game.scenes.top;

const crop = async (name, x, y, w, h, scale) => {
  const src = d.game.renderer.buffer;
  const cv = document.createElement('canvas');
  cv.width = w * scale;
  cv.height = h * scale;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  const k = src.width / 240;
  c.drawImage(src, x * k, y * k, w * k, h * k, 0, 0, cv.width, cv.height);
  await fetch('/__shot/' + encodeURIComponent(name),
    { method: 'POST', body: cv.toDataURL('image/png') });
};

await d.loadWait(1400);
d.key('Enter', 4);
d.key('Enter', 4);
for (let i = 0; i < 60 && top().name !== 'opening'; i++) d.tick(4);

d.tick(230 + 210 + 40);
await crop('deep-zoom', 0, 10, 240, 70, 4);
d.tick(90);
await crop('deep-zoom-b', 0, 10, 240, 70, 4);

return { shot: top().shot };
