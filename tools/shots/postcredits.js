// THE POST-CREDITS, photographed shot by shot.
//
// The one frame this driver exists for is `pc-08-level`: the moment the animal
// is alongside its own carving. If that frame does not make a person say "that
// is it, on the wall", the scene has failed and nothing else in it matters.
//
// Absolute tick counts, because the reel is fixed length:
//   shot 0 THE DARK       0    -  269
//   shot 1 OPEN WATER     270  -  599
//   shot 2 THE RUINS      600  -  959
//   shot 3 THE WALL       960  - 1859   (p = (abs-960)/900)

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
  await fetch('/__shot/' + encodeURIComponent(name), { method: 'POST', body: cv.toDataURL('image/png') });
};

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
for (let i = 0; i < 60 && top().name !== 'overworld'; i++) d.key('Enter', 10);
if (top().name !== 'overworld') return { error: 'never reached the overworld: ' + top().name };

const state = top().state;
const { PostCreditsScene, POSTCREDITS_FLAG } = await import('/build/js/scenes/postcredits.js');

let done = false;
const scene = new PostCreditsScene(state, () => { done = true; });
d.game.scenes.push(scene);
d.tick(1);
out.push('flag on entry: ' + !!state.hasFlag(POSTCREDITS_FLAG));

let at = 1;
const runTo = (abs) => { const n = abs - at; if (n > 0) d.tick(n); at = Math.max(at, abs); };
const frame = async (abs, name, scale = 1) => { runTo(abs); await d.shoot(name, 0, scale); };

await frame(70,   'pc-01-dark-empty');
await frame(190,  'pc-02-dark-crossing');
await frame(240,  'pc-03-dark-lamps');
await crop('pc-03-dark-zoom', 0, 40, 240, 90, 3);

await frame(390,  'pc-04-open-entering');
await frame(437,  'pc-05-open-full');
await crop('pc-05-open-zoom', 0, 40, 240, 90, 3);

await frame(720,  'pc-06-ruins-far');
await frame(900,  'pc-07-ruins-near');

await frame(1060, 'pc-08-wall-arrive');
// THE FRAME. p = 0.42.
await frame(1338, 'pc-09-level');
await crop('pc-09-level-zoom', 0, 8, 240, 144, 2);
await frame(1420, 'pc-10-passing');
await frame(1500, 'pc-11-settled');
await frame(1620, 'pc-12-light-running');
await crop('pc-12-light-zoom', 100, 8, 140, 120, 3);
await frame(1700, 'pc-13-light-most');
// Full, and one frame BEFORE the hundred-tick fade starts at t = 800.
await frame(1755, 'pc-14-lit');
await crop('pc-14-lit-zoom', 0, 8, 240, 144, 2);
await frame(1840, 'pc-14b-going');

// Run it out and check it hands back.
for (let i = 0; i < 400 && !done; i++) d.tick(1);
out.push('reel finished and handed back: ' + done);
out.push('scene on top afterwards: ' + top().name);
out.push('flag after: ' + !!state.hasFlag(POSTCREDITS_FLAG));

/* --------------------------------------------------------- the hurry path */

let done2 = false;
const s2 = new PostCreditsScene(state, () => { done2 = true; });
d.game.scenes.push(s2);
d.tick(40);
d.key('Enter', 2);
d.tick(40);
out.push('hurried to shot ' + s2.shot + ' at t ' + s2.t);
await d.shoot('pc-15-hurried', 0, 1);
// The recognition beat has to survive the hurry: 0.42 of 900 is t = 378.
d.tick(378 - s2.t);
await d.shoot('pc-15b-hurried-level', 0, 1);
d.tick(1755 - 960 - s2.t);
await d.shoot('pc-16-hurried-lit', 0, 1);
for (let i = 0; i < 700 && !done2; i++) d.tick(1);
out.push('hurried run finished: ' + done2);
if (!done2) { d.game.scenes.pop(); d.tick(2); }

/* --------------------------------------------------------------- the cost */

// The wall shot lights a panel per pixel-block, blooms a whole room, walks five
// carvings and draws the animal on top. It is the last thing the game renders
// and a stutter here would be the last thing anybody remembers, so it is
// measured rather than assumed. 16.6ms is the frame budget.
let done3 = false;
const s3 = new PostCreditsScene(state, () => { done3 = true; });
d.game.scenes.push(s3);
d.tick(1);
const cost = {};
let seen = 1;
for (const [label, abs] of [['dark', 150], ['open', 440], ['ruins', 900], ['track', 1338], ['wake', 1755]]) {
  if (abs > seen) { d.tick(abs - seen); seen = abs; }
  const t0 = performance.now();
  for (let i = 0; i < 30; i++) s3.render(d.game, d.game.renderer);
  cost[label] = +((performance.now() - t0) / 30).toFixed(2);
}
out.push('ms per frame: ' + JSON.stringify(cost));
d.game.scenes.pop();
d.tick(2);

/* ------------------------------------------------------- the set-piece id */

const { setPieceScene } = await import('/build/js/scenes/neravoss.js');
const viaRegistry = setPieceScene('postcredits', { game: d.game, state, done: () => {} });
out.push('setPiece("postcredits") builds: ' + (viaRegistry ? viaRegistry.name : 'NULL'));

return { out };
