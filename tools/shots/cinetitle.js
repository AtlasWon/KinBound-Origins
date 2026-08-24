// The last shot: the logo arriving over the frame the film opened on, and the
// handover out of the cinematic into character creation.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(1400);
d.key('Enter', 4);
d.key('Enter', 4);
for (let i = 0; i < 60 && top().name !== 'opening'; i++) d.tick(4);

while (top().name === 'opening' && top().shot < 7) d.tick(8);

for (let i = 0; i < 10; i++) {
  const s = top();
  out.push(s.name + (s.shot !== undefined ? ':' + s.shot + ':' + s.t : ''));
  await d.shoot('card-' + String(i).padStart(2, '0'), 0);
  if (i === 5) await d.shoot('card-zoom', 0, 4);
  d.tick(22);
}

return { out, scene: top().name };
