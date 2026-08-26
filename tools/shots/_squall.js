// Scratch probe: does the whiteout actually draw?
const d = window.dev;
const top = () => d.game.scenes.top;
const log = [];
await d.loadWait(1400);
for (let i = 0; i < 90 && top().name !== 'title'; i++) d.key('Enter', 10);
if (top().name === 'title' && top().menu) { top().menu.index = 0; d.key('Enter', 24); }
for (let i = 0; i < 60 && top().name !== 'creator'; i++) d.key('Enter', 10);
for (let i = 0; i < 30 && top().name === 'creator'; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') { d.key('Enter', 40); break; }
  d.key('KeyS', 2);
}
await d.loadWait(1600);
for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 8);

const state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;
d.game.scenes.replaceAll(new Overworld(state, 'route_8_pass', 14, 21, 'left'));
await d.loadWait(1400);

const { squallAt } = await import('/build/js/gfx/snowfall.js');
const scene = top();
log.push('map.snow = ' + scene.map.snow);
const cx = scene.player.centerX, cy = scene.player.footY - 8;
let best = -1, at = 0;
for (let t = 0; t < 4000; t += 3) {
  const v = squallAt(cx, cy, d.game.ticks + t);
  if (v > best) { best = v; at = t; }
}
log.push('best squall ' + best.toFixed(3) + ' in ' + at + ' ticks; now ' + d.game.ticks);
d.tick(at);
log.push('after tick: ticks=' + d.game.ticks + ' squall=' + squallAt(cx, cy, d.game.ticks).toFixed(3));
const out = [await d.shoot('squall-peak', 1, 1)];
log.push('at shot: squall=' + squallAt(cx, cy, d.game.ticks).toFixed(3));
return { log, out };
