// Sweeps the whole opening cinematic at a fixed tick interval, so the film can
// be watched as a strip rather than sampled at poses. Every frame is named with
// the absolute tick so pacing can be reasoned about.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

const STEP = Number(window.__STEP || 30);
const COUNT = Number(window.__COUNT || 70);

await d.loadWait(1400);
d.key('Enter', 4);
d.key('Enter', 4);
// The title screen now plays a 64-tick departure of its own before the film
// starts, so waiting a fixed number of ticks is no longer enough.
for (let i = 0; i < 60 && top().name !== 'opening'; i++) d.tick(4);
out.push('scene:' + top().name);

let tick = 0;
for (let i = 0; i < COUNT; i++) {
  const s = top();
  if (s.name !== 'opening') { out.push('left at frame ' + i + ' tick ' + tick); break; }
  await d.shoot('sweep-' + String(i).padStart(3, '0') + '-s' + s.shot + '-t' + s.t, 0);
  d.tick(STEP);
  tick += STEP;
}

return { out, scene: top().name, tick };
