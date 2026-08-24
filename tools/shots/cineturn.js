// The Turning shot end to end, close enough together to watch the sea leave
// and come back rather than to sample two poses out of it.

const d = window.dev;
const top = () => d.game.scenes.top;

await d.loadWait(1400);
d.key('Enter', 4);
d.key('Enter', 4);
// The title screen now plays a 64-tick departure of its own before the film
// starts, so waiting a fixed number of ticks is no longer enough.
for (let i = 0; i < 60 && top().name !== 'opening'; i++) d.tick(4);

// Skip to the head of shot 3.
while (top().name === 'opening' && top().shot < 3) d.tick(10);

for (let i = 0; i < 16; i++) {
  const s = top();
  await d.shoot('turn-' + String(i).padStart(2, '0') + '-t' + s.t, 0);
  d.tick(15);
}

return { scene: top().name, shot: top().shot, t: top().t };
