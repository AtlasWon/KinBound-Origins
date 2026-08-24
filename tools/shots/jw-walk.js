// Walking, measured. How long a real map takes to cross at the current walk
// speed, how many ticks a single tile costs, and what a tap does -- the three
// things that decide whether a speed is right.

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
for (let i = 0; i < 80 && top().name !== 'creator'; i++) d.key('Enter', 12);
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
const body = await import('/build/js/world/body.js');
const speed = body.WALK_SPEED;
out.push('WALK_SPEED ' + speed + ' -> ' + (speed * 60).toFixed(1) + ' px/s, '
  + (speed * 60 / 16).toFixed(2) + ' tiles/s, ' + (16 / speed).toFixed(2) + ' ticks per tile');

const at = async (map, x, y) => {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, 'down'));
  await d.loadWait(1100);
  clear();
  return top();
};

// Hold a key until the player stops making progress, and report the run.
const cross = async (label, map, x, y, key, limit) => {
  const s = await at(map, x, y);
  const p = s.player;
  const x0 = p.x, y0 = p.y;
  d.down(key);
  let ticks = 0;
  let lastX = p.x, lastY = p.y, still = 0;
  for (let i = 0; i < limit; i++) {
    d.tick(1);
    ticks++;
    if (s.busy || s.map.id !== map) break;
    if (Math.abs(p.x - lastX) < 0.01 && Math.abs(p.y - lastY) < 0.01) { still++; if (still > 4) break; }
    else still = 0;
    lastX = p.x; lastY = p.y;
  }
  d.up(key);
  d.tick(2);
  const dist = Math.hypot(p.x - x0, p.y - y0);
  out.push(label + ': ' + (dist / 16).toFixed(1) + ' tiles in ' + ticks + ' ticks = '
    + (ticks / 60).toFixed(2) + 's'
    + (s.map.id !== map ? ' (warped to ' + s.map.id + ')' : ''));
};

// A tap: does a short press still move a sensible, controllable amount?
const tap = async (map, x, y, key, ticks) => {
  const s = await at(map, x, y);
  const p = s.player;
  const y0 = p.y, x0 = p.x;
  d.down(key);
  d.tick(ticks);
  d.up(key);
  d.tick(6);
  out.push('tap ' + key + ' for ' + ticks + ' ticks on ' + map + ': moved '
    + (Math.hypot(p.x - x0, p.y - y0)).toFixed(1) + 'px ('
    + (Math.hypot(p.x - x0, p.y - y0) / 16).toFixed(2) + ' tiles), facing ' + p.facing);
};

await cross('ashgate north-south', 'ashgate', 14, 4, 'KeyS', 400);
await cross('route_1 north-south', 'route_1', 14, 2, 'KeyS', 500);
await cross('route_1 east-west', 'route_1', 3, 12, 'KeyD', 500);

await tap('ashgate', 14, 8, 'KeyS', 1);
await tap('ashgate', 14, 8, 'KeyS', 4);
await tap('ashgate', 14, 8, 'KeyS', 12);

// The walk cycle, sampled across one tile of travel, judged at 1x.
const s = await at('ashgate', 14, 8);
d.down('KeyS');
for (let i = 0; i < 13; i++) {
  d.tick(1);
  if (i % 3 === 0) {
    const n = 'jwalk-' + String(i).padStart(2, '0') + '-step' + s.player.animStep;
    await d.shoot(n, 0);
    shots.push(n);
  }
}
d.up('KeyS');

return { out, shots };
