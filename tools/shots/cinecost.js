// How long a frame of each shot takes to draw. The wings and the far column
// added a few thousand fillRects a frame; this is the check that they cost
// nothing anyone can feel.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(1400);
d.key('Enter', 4);
d.key('Enter', 4);
for (let i = 0; i < 60 && top().name !== 'opening'; i++) d.tick(4);

const LEN = [230, 210, 200, 230, 270, 300, 290, 180];
for (let s = 0; s < LEN.length; s++) {
  if (top().name !== 'opening') break;
  d.tick(Math.round(LEN[s] * 0.45));
  const t0 = performance.now();
  for (let i = 0; i < 40; i++) d.game.render();
  out.push('shot ' + s + ': ' + ((performance.now() - t0) / 40).toFixed(2) + ' ms/frame');
  d.tick(Math.round(LEN[s] * 0.55));
}

return { out };
