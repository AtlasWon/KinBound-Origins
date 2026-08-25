// A round trip on foot: out of town through a door, back out again, down to the
// route seam and back up. Everything driven by held keys, nothing poked
// directly, so if a transition strands `busy` the walk simply stops.

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
d.game.scenes.replaceAll(new Overworld(state, 'ashgate', 6, 9, 'up'));
await d.loadWait(1200);
clear();

// Hold a key, at real pacing, until the map changes or we run out of patience.
const go = async (key, limit, label) => {
  const s = top();
  const from = s.map.id;
  d.down(key);
  let ticks = 0;
  for (let i = 0; i < limit; i++) {
    d.tick(1); ticks++;
    await frame();
    if (s.map.id !== from && !s.busy && !(s.fade || {}).active) break;
  }
  d.up(key);
  d.tick(4);
  const t = top();
  out.push(label + ': ' + from + ' -> ' + t.map.id + ' in ' + ticks + ' ticks, busy=' + (t.busy ? 1 : 0)
    + ', at ' + t.player.tileX + ',' + t.player.tileY);
  return t.map.id !== from;
};

await go('KeyW', 90, 'into the Waystation');
clear();
await d.shoot('jround-inside', 0); shots.push('jround-inside');
await go('KeyS', 90, 'back out');
clear();
await d.shoot('jround-town', 0); shots.push('jround-town');

// Down the main road to the route seam.
d.game.scenes.replaceAll(new Overworld(state, 'ashgate', 14, 18, 'down'));
await d.loadWait(1200);
clear();
await go('KeyS', 200, 'south to Route 1');
clear();
await d.shoot('jround-route', 0); shots.push('jround-route');
await go('KeyW', 120, 'back north into town');
clear();
await d.shoot('jround-back', 0); shots.push('jround-back');

// And still able to move afterwards.
const s = top();
const x0 = s.player.x, y0 = s.player.y;
d.down('KeyD'); d.tick(20); d.up('KeyD'); d.tick(4);
out.push('still walks after all that: moved ' + Math.hypot(s.player.x - x0, s.player.y - y0).toFixed(1) + 'px');

return { out, shots };
