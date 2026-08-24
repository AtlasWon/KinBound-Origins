// The greeting outside the player's house, played from a genuinely new game:
// through the house, out of the front door, and on through Perrin's departure.
// Frame-steps the exit so the empty-street stretch is measured, not guessed at.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
const clear = (n = 40) => {
  for (let i = 0; i < n && top().name === 'dialogue'; i++) d.key('Enter', 8);
};

await d.loadWait(1400);
// Title and menu layouts move around, so press on until the character creator
// -- the scene that answers rows() -- is actually up, rather than assuming a
// fixed number of taps gets there.
for (let i = 0; i < 12 && typeof top().rows !== 'function'; i++) d.key('Enter', 30);
out.push('creator reached: ' + top().name);
for (let i = 0; i < 40; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1500);
clear();
out.push('new game: ' + JSON.stringify(d.probe()));

const R = await import('/build/js/engine/renderer.js');
const tag = R.SCREEN_W + 'x' + R.SCREEN_H;

const ow = () => d.game.scenes.find('overworld');
const where = () => ow().player.tileX + ',' + ow().player.tileY;

// A walk is 10 ticks a tile now, so d.walk -- which still bills 15 -- overshoots
// by half, and half a tile is the difference between standing in front of your
// mother and walking out of the front door. Hold for 9 ticks instead: short of
// the commit point for a second tile, long enough to finish the first.
const KEY = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' };
const one = (dir) => {
  const p = ow().player;
  const axis = dir === 'up' || dir === 'down' ? 'tileY' : 'tileX';
  const from = p[axis];
  for (let attempt = 0; attempt < 3; attempt++) {
    d.hold(KEY[dir], 9);
    for (let i = 0; i < 30 && ow().player.moving; i++) d.tick(1);
    d.tick(1);
    if (top().name !== 'overworld') return;
    if (ow().player[axis] !== from) return;
  }
};
const step = (dir, n) => {
  for (let i = 0; i < n; i++) { one(dir); if (top().name !== 'overworld') return; }
};
const goY = (y) => {
  for (let i = 0; i < 20; i++) {
    const dy = y - ow().player.tileY;
    if (dy === 0 || top().name !== 'overworld') return;
    one(dy > 0 ? 'down' : 'up');
  }
};
const goX = (x) => {
  for (let i = 0; i < 20; i++) {
    const dx = x - ow().player.tileX;
    if (dx === 0 || top().name !== 'overworld') return;
    one(dx > 0 ? 'right' : 'left');
  }
};

// Upstairs bedroom -> the stairs at (10,4).
goY(3); goX(10); goY(4);
await d.loadWait(900);
out.push('downstairs: ' + JSON.stringify(d.probe()));

// Talk to Mother at (5,4) -- this sets mom_sendoff and puts Perrin outside.
goY(4); goX(6); goY(5); goX(5);
d.hold('KeyW', 3);
out.push('at mother? ' + where() + ' facing ' + ow().player.facing);
d.key('Enter', 8);
for (let i = 0; i < 80; i++) {
  if (top().name === 'dialogue') { d.key('Enter', 8); continue; }
  d.tick(8);
  if (i > 4 && !ow().busy && !(ow().events && ow().events.running)) break;
}
out.push('after mother: sendoff=' + ow().state.hasFlag('mom_sendoff') + ' ' + JSON.stringify(d.probe()));

// Out of the front door at (6,6).
goX(6); goY(6);
await d.loadWait(900);
out.push('outside: ' + JSON.stringify(d.probe()));

const perrin = () => {
  const s = ow();
  const n = s.npcs && s.npcs.find((q) => q.data.id === 'mh_perrin');
  return n ? n.actor : null;
};
const onScreen = () => {
  const a = perrin();
  if (!a) return false;
  const cam = d.game.renderer.camX;
  return a.tileX * 16 < cam + R.SCREEN_W && (a.tileX + 1) * 16 > cam;
};

// One step down onto (6,8) is what fires the greeting.
one('down');
for (let i = 0; i < 80; i++) {
  if (top().name === 'dialogue') { d.key('Enter', 6); continue; }
  d.tick(6);
  if (i > 6 && top().name === 'overworld' && !top().busy) break;
}
out.push('greeting over, perrin at ' + (perrin() ? perrin().tileX + ',' + perrin().tileY : 'none'));

let t = 0, leftView = -1, shot = 0;
while (t < 400) {
  if (top().name === 'dialogue') break;
  if (leftView < 0 && perrin() && !onScreen()) leftView = t;
  if (t % 10 === 0) {
    shot++;
    await d.shoot('leaves-' + tag + '-' + String(shot).padStart(2, '0'), 0);
  }
  d.tick(1);
  t++;
}
out.push('exit ticks total: ' + t + ', visible for: ' + leftView + ', empty street: ' + (t - leftView));
out.push('closing line: ' + JSON.stringify(d.probe().text));
await d.shoot('leaves-' + tag + '-99-line', 0);
return { out };
