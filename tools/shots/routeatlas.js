// Plan view of the two routes I own, plus their sub-maps, for layout judging.
// Same technique as mapwalk-atlas.js, narrowed to Route 1 and Route 2.
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

const MAPS = ['route_1', 'route_2', 'route_1_hollow', 'route_2_ruin', 'route_2_cave'];
const out = [];

for (const id of MAPS) {
  const sc = new Overworld(state, id, 1, 1, 'down');
  d.game.scenes.replaceAll(sc);
  await d.loadWait(1100);
  const map = sc.map;
  if (!map || map.id !== id) { out.push(id + ' FAILED TO LOAD'); continue; }
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

  const url = cv.toDataURL('image/png');
  const res = await fetch('/__shot/' + encodeURIComponent('ratlas-' + id), { method: 'POST', body: url });
  out.push(id + ' ' + W + 'x' + H + ' -> ' + (await res.text()));
}
return { out };
