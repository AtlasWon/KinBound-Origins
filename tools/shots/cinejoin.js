// The one hard cut in the film: the last dozen frames of the Turning and the
// first dozen of Old Tidefall, four ticks apart, so the join can be judged as a
// join rather than as two pictures.

const d = window.dev;
const top = () => d.game.scenes.top;

await d.loadWait(1400);
d.key('Enter', 4);
d.key('Enter', 4);
// The title screen now plays a 64-tick departure of its own before the film
// starts, so waiting a fixed number of ticks is no longer enough.
for (let i = 0; i < 60 && top().name !== 'opening'; i++) d.tick(4);

while (top().name === 'opening' && top().shot < 3) d.tick(10);
// Up to four ticks before the strike that the cut lands on.
while (top().shot === 3 && top().t < 204) d.tick(2);

for (let i = 0; i < 16; i++) {
  const s = top();
  await d.shoot('join-' + String(i).padStart(2, '0') + '-s' + s.shot + '-t' + s.t, 0);
  d.tick(4);
}

return { scene: top().name, shot: top().shot, t: top().t };
