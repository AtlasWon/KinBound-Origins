// The Turning, across its whole length. The caption promises a sea that
// reverses; this is whether the picture delivers one.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(400);
const open = await import('/build/js/scenes/opening.js');
const state = await import('/build/js/systems/state.js');

d.game.scenes.replaceAll(new open.OpeningScene(new state.GameState(), {}));
d.tick(2);
const s = top();
s.shot = 3; s.t = 0; s.veil = 0;

for (const at of [20, 60, 100, 140, 170, 200, 225]) {
  while (s.t < at) { d.tick(1); s.veil = 0; }
  await d.shoot('turn-' + String(at).padStart(3, '0'), 0);
  out.push('t=' + s.t);
}

return { out };
