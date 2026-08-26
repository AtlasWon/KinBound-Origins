// Plan view of Crownspire, drawn at tile resolution, next to Aureline and
// Tideglass at the same scale.
//
// The claim this settles is a claim about proportion and it cannot be settled
// from street level: Crownspire is the second city of Caelora and has to look
// it beside the capital, while being built out of the capital's OLD kit and
// nothing else. It is a drawing tool and not a verdict -- a city that only
// reads from above has failed, so this is judged next to the 1x walk in
// tools/shots/crownspire.js, never instead of it.
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
for (const id of ['crownspire', 'crownspire_hall', 'crownspire_hall_crown']) {
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
