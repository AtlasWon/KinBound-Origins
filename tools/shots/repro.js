// Reproduces the two overlap complaints: standing under a sign, and standing
// against the top edge of a map.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
const stepTo = (tx, ty) => {
  for (let i = 0; i < 40; i++) {
    const p = d.probe().pos;
    if (!p) return false;
    const [x, y] = p.split(',').map(Number);
    if (x === tx && y === ty) return true;
    if (x < tx) d.hold('KeyD', 12);
    else if (x > tx) d.hold('KeyA', 12);
    else if (y < ty) d.hold('KeyS', 12);
    else d.hold('KeyW', 12);
  }
  return false;
};
const clear = () => { for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10); };

await d.loadWait(1200);
d.key('Enter', 4); d.key('Enter', 30);      // title -> new journey
d.key('Enter', 60);                          // skip the cinematic
// Straight out of the creator with the default look.
for (let i = 0; i < 30; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1200);
clear();

// Warp straight to the town sign rather than walking the whole way.
top().state.currentMap = 'hearthmere';
d.game.scenes.replaceAll(new (top().constructor)(top().state, 'hearthmere', 13, 9, 'up'));
await d.loadWait(1200);
clear();
out.push('at:' + d.probe().pos + ' on ' + d.probe().map);
await d.shoot('bug-01-sign', 6, 3);

stepTo(13, 9);
d.key('KeyW', 3);
await d.shoot('bug-02-sign-facing', 6, 3);

// Top edge of the same map.
stepTo(13, 1);
d.key('KeyW', 20);
out.push('edge:' + d.probe().pos);
await d.shoot('bug-03-top-edge', 6, 3);

return { out, probe: d.probe() };
