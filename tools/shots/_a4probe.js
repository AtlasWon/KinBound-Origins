// Diagnostic: can the player actually walk the Records reading aisle?
const d = window.dev;
const top = () => d.game.scenes.top;
const ow = () => d.game.scenes.find('overworld');
const log = [];
const P = () => { const p = ow().player; return `tile ${p.tileX},${p.tileY} px ${p.x.toFixed(1)},${p.y.toFixed(1)}`; };

const step = (k) => {
  const p = ow().player;
  const x0 = p.x, y0 = p.y;
  d.down(k);
  let n = 0;
  for (let i = 0; i < 40; i++) {
    d.tick(1); n++;
    if (Math.abs(p.x - x0) >= 16 || Math.abs(p.y - y0) >= 16) break;
  }
  d.up(k); d.tick(2);
  return n;
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
for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 8);

await ow().loadMap(d.game, 'aureline_meridian_records', 16, 13, 'right');
await d.loadWait(1200);
const o = ow();
log.push(`placed: ${P()}`);
log.push(`canEnter(17,13,'right') = ${o.canEnter(17, 13, 'right')}`);
log.push(`canEnter(18,13,'right') = ${o.canEnter(18, 13, 'right')}`);
for (let i = 0; i < 6; i++) log.push(`east #${i + 1}: ${step('KeyD')} ticks -> ${P()}`);
log.push('---- and the doorway at 18,10 ----');
await ow().loadMap(d.game, 'aureline_meridian_records', 18, 9, 'down');
await d.loadWait(800);
log.push(`placed: ${P()}  canEnter(18,10,'down')=${ow().canEnter(18, 10, 'down')}`);
for (let i = 0; i < 4; i++) log.push(`south #${i + 1}: ${step('KeyS')} ticks -> ${P()}`);
return { log };
