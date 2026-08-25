// Plan view of Aureline, for the city-layout pass, alongside Tideglass at the
// same scale. The point is the comparison: the brief is that the capital has to
// make the harbour city look like a town, and that is a claim about proportion
// which no amount of street-level screenshots can settle.
//
// It is a drawing tool, not a verdict. A city that only reads from a plan view
// has failed, so this is judged next to the 1x walk, never instead of it.
const d = window.dev;
const ts = await import('/build/js/gfx/tileset.js');
const set = new ts.Tileset('kinbound-tiles');
const cell = ts.TILE_PX;

const top = () => d.game.scenes.top;
await d.loadWait(1200);
d.key('Enter', 20); await d.loadWait(400);
d.key('Enter', 20); await d.loadWait(600);
const state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;

const out = [];
for (const id of ['aureline', 'tideglass']) {
  const sc = new Overworld(state, id, 1, 1, 'down');
  d.game.scenes.replaceAll(sc);
  await d.loadWait(1600);
  const map = sc.map;
  if (!map) { out.push(id + ': no map'); continue; }
  const W = map.width, H = map.height, px = ts.TILE_SIZE;
  const cv = document.createElement('canvas');
  cv.width = W * px; cv.height = H * px;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#000'; c.fillRect(0, 0, cv.width, cv.height);
  const blit = (arr) => {
    for (let ty = 0; ty < H; ty++) {
      for (let tx = 0; tx < W; tx++) {
        const t = arr[ty * W + tx];
        if (!t) continue;
        const s = set.srcFor(t, tx, ty);
        c.drawImage(set.canvas, s.x, s.y, cell, cell, tx * px, ty * px, px, px);
      }
    }
  };
  blit(map.ground);
  blit(map.over);
  const res = await fetch('/__shot/' + encodeURIComponent('atlas-' + id), { method: 'POST', body: cv.toDataURL('image/png') });
  out.push(id + ' ' + W + 'x' + H + ' -> ' + (await res.text()));
}
return { out };
