// Every frame of every area transition, over a real map.
//
// The existing transitions.js driver samples five frames of each; a curve is
// only judgeable if you can see all of it, so this one shoots the whole run and
// also times a frame of the heaviest cover to prove the dither is not costing
// anything at 60fps.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

const clear = () => {
  for (let i = 0; i < 24 && top().name === 'dialogue'; i++) d.key('Enter', 8);
  d.tick(4);
};

await d.loadWait(1400);
// Press through the title, the menu and the cinematic until the creator is
// actually on top. A fixed count of Enters broke when the menu gained a
// transition into the cinematic and moved the beat this landed on.
// Reach the title, then choose NEW JOURNEY deliberately -- the cursor starts
// on CONTINUE whenever a save exists, so pressing Enter blindly loads that
// save and skips the creator entirely.
for (let i = 0; i < 90 && top().name !== 'title'; i++) d.key('Enter', 10);
if (top().name === 'title' && top().menu) { top().menu.index = 0; d.key('Enter', 24); }
for (let i = 0; i < 60 && top().name !== 'creator'; i++) d.key('Enter', 10);
for (let i = 0; i < 30; i++) {
  if (typeof top().rows !== 'function') { d.key('Enter', 20); continue; }
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1600);
clear();

const state = top().state;
const Overworld = top().constructor;
const tr = await import('/build/js/ui/transition.js');

const cover = {
  name: 'cover',
  transparent: true,
  style: 'door',
  p: 0,
  dir: 'down',
  update() {},
  render(_g, r) { tr.drawAreaCover(r, this.style, this.p, this.dir); },
};

const visit = async (map, x, y, facing) => {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing));
  await d.loadWait(1400);
  clear();
  d.game.scenes.push(cover);
  d.tick(1);
};

// Every frame of one half, named by frame number so the sequence reads in order.
const sweep = async (name, style, dir) => {
  const frames = tr.areaFrames(style);
  cover.style = style;
  cover.dir = dir;
  for (let f = 1; f <= frames; f++) {
    cover.p = f / frames;
    await d.shoot(`${name}-${String(f).padStart(2, '0')}`, 1);
  }
  cover.p = 0;
  d.tick(1);
  out.push(`${name}: ${frames} frames (${(frames / 60).toFixed(2)}s each way)`);
};

await visit('briarbell', 15, 12, 'up');
await sweep('sm-door', 'door', 'down');
await sweep('sm-warp', 'warp', 'down');

await visit('route_1', 14, 12, 'down');
await sweep('sm-edge', 'edge', 'down');

await visit('hearthmere_house_player', 6, 5, 'up');
await sweep('sm-stairs', 'stairs', 'up');

// What the dither actually costs. Worst case is the iris at half closed, which
// draws all four feathers at once.
cover.style = 'cave';
cover.p = 0.5;
const t0 = performance.now();
for (let i = 0; i < 60; i++) d.tick(1);
out.push('60 frames of a half-closed iris: ' + (performance.now() - t0).toFixed(1) + 'ms total');
cover.p = 0;

return { out };
