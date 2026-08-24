// The sea shot alone, sampled close enough together to see the skimmer's dive
// as motion rather than as poses. The dive cycle is 112 ticks, so 14 frames
// eight ticks apart is one full drop, touch and climb.

const d = window.dev;
const top = () => d.game.scenes.top;

await d.loadWait(1400);
d.key('Enter', 4);
d.key('Enter', 4);
// The title screen now plays a 64-tick departure of its own before the film
// starts, so waiting a fixed number of ticks is no longer enough.
for (let i = 0; i < 60 && top().name !== 'opening'; i++) d.tick(4);

// Deep enough into the shot that the camera has come down onto the water.
d.tick(120);
for (let i = 0; i < 15; i++) {
  await d.shoot('sea-' + String(i).padStart(2, '0'), 0);
  d.tick(8);
}
await d.shoot('sea-zoom', 0, 4);

return { scene: top().name, shot: top().shot, t: top().t };
