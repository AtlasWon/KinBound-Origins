// 4x crops of the starter table, with the player standing right in front of a
// kin -- the depth-sort case that decides whether they read as on the table.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
await d.loadWait(1400);
d.key('Enter', 20); await d.loadWait(400);
d.key('Enter', 20); await d.loadWait(900);
for (let i = 0; i < 30 && top().name !== 'overworld'; i++) d.key('Enter', 12);
const state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;

const DETAIL = 2;
async function crop(name, tx, ty, tw, th, scale) {
  const r = d.game.renderer;
  const cv = document.createElement('canvas');
  cv.width = tw * 16 * scale; cv.height = th * 16 * scale;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#101418'; c.fillRect(0, 0, cv.width, cv.height);
  const sx = Math.round((tx * 16 - r.camX) * DETAIL);
  const sy = Math.round((ty * 16 - r.camY) * DETAIL);
  c.drawImage(r.buffer, sx, sy, tw * 16 * DETAIL, th * 16 * DETAIL, 0, 0, cv.width, cv.height);
  const res = await fetch('/__shot/' + name, { method: 'POST', body: cv.toDataURL('image/png') });
  return res.text();
}

for (const [tag, px, py] of [['front', 7, 5], ['beside', 3, 4], ['behind', 7, 3]]) {
  d.game.scenes.replaceAll(new Overworld(state, 'vess_station', px, py, 'up'));
  await d.loadWait(900);
  for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);
  d.tick(6);
  out.push(tag + ' ' + d.probe().pos);
  await d.shoot('lab-' + tag, 6, 1);
  await crop('lab-' + tag + '-4x', 2, 2, 12, 5, 4);
}
return { out };
