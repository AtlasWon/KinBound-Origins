// A close look at the flyers in the sea shot and the title card: 1x, and a 3x
// crop of the sky band where the mid-layer birds live.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

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

// Mid-shot of the sea.
d.tick(120);
await d.shoot('bird-sea-1x', 0);
await crop('bird-sea-zoom', 0, 8, 240, 64, 3);

// Straight to the title card.
const LEN = [230, 210, 200, 230, 270, 300, 290, 180];
let spent = 120;
d.tick(LEN[0] - spent);
for (let s = 1; s < 7; s++) d.tick(LEN[s]);
out.push('at shot ' + top().shot);
d.tick(90);
await d.shoot('bird-title-1x', 0);
await crop('bird-title-zoom', 0, 8, 240, 72, 3);

return { out };
