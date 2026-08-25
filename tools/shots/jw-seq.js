// Every frame of a real cold warp, in order, so the join between the two
// halves can be looked at rather than reasoned about.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
const shots = [];

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
for (let i = 0; i < 80; i++) {
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

const run = async (label, map, sx, sy, wx, wy) => {
  d.game.scenes.replaceAll(new Overworld(state, map, sx, sy, 'down'));
  await d.loadWait(1200);
  clear();
  const s = top();
  const warp = s.map.warpAt(wx, wy);
  if (!warp) { out.push(label + ': no warp'); return; }
  s.doWarp(d.game, warp);
  for (let i = 0; i < 60; i++) {
    d.tick(1);
    const f = s.fade || {};
    const tag = f.active
      ? (f.holding ? 'hold' : f.dir) + String(f.t).padStart(2, '0')
      : 'done';
    const name = label + '-' + String(i).padStart(2, '0') + '-' + tag;
    await d.shoot(name, 0);
    shots.push(name);
    if (!f.active) break;
  }
  out.push(label + ': ' + shots.filter((n) => n.indexOf(label + '-') === 0).length + ' frames');
  await d.loadWait(700);
};

await run('jd', 'ashgate', 14, 8, 6, 6);
await run('je', 'ashgate', 14, 20, 14, 23);

return { out, shots };
