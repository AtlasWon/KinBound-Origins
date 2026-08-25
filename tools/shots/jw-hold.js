// The same warp, paced at roughly 60fps of real time, so pending fetches get
// the same chance to resolve that they get in play. Reports how many frames the
// cover has to be held at full after the out-fade lands, and shoots the frame
// that used to be the flash.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
const shots = [];

const clear = () => {
  for (let i = 0; i < 24 && top().name === 'dialogue'; i++) d.key('Enter', 8);
  d.tick(4);
};
const frame = () => new Promise((r) => setTimeout(r, 16));

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

const run = async (label, map, sx, sy, wx, wy, shoot) => {
  d.game.scenes.replaceAll(new Overworld(state, map, sx, sy, 'down'));
  await d.loadWait(1200);
  clear();
  const s = top();
  const warp = s.map.warpAt(wx, wy);
  if (!warp) { out.push(label + ': no warp at ' + wx + ',' + wy); return; }
  const from = s.map.id;

  s.doWarp(d.game, warp);
  let held = 0, bare = 0, closing = 0, opening = 0, shotDone = false;
  for (let i = 0; i < 140; i++) {
    d.tick(1);
    const f = s.fade || {};
    if (f.active && f.holding) {
      held++;
      if (shoot && !shotDone) { shotDone = true; await d.shoot(label + '-held', 0); shots.push(label + '-held'); }
    } else if (f.active && f.dir === 'out') closing++;
    else if (f.active && f.dir === 'in') opening++;
    else if (s.map.id === from) bare++;
    else break;
    await frame();
  }
  out.push(label + ' -> ' + warp.toMap + ' [' + warp.style + ']: close ' + closing
    + ', hold ' + held + ', open ' + opening + ', uncovered-on-old-map ' + bare
    + ' (now on ' + top().map.id + ', busy=' + (top().busy ? 1 : 0) + ')');
  await d.loadWait(700);
};

// Cold: neither of these has been visited this session.
await run('door', 'ashgate', 14, 8, 6, 6, true);
await run('edge', 'ashgate', 14, 20, 14, 23, true);
// Warm: straight back through a door that is already in the cache.
await run('door-warm', 'ashgate', 14, 8, 6, 6, false);

return { out, shots };
