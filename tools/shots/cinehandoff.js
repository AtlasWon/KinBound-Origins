// The handoff: title screen, NEW JOURNEY, and the first second of the film,
// three ticks apart so the confirm blink and the closing letterbox both read as
// motion rather than as sampled poses.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(1400);
await d.shoot('hand-00-attract', 20);

// Into the menu, and take NEW JOURNEY (the first row, already selected).
d.key('Enter', 20);
out.push('phase:' + top().phase);
await d.shoot('hand-01-menu', 10);

d.key('Enter', 0);
for (let i = 0; i < 34; i++) {
  const s = top();
  const tag = s.name === 'title' ? 'L' + s.launch : 't' + s.t;
  await d.shoot('hand-' + String(i + 2).padStart(2, '0') + '-' + s.name + '-' + tag, 0);
  d.tick(3);
  out.push(s.name + ':' + tag);
}

return { out, scene: top().name };
