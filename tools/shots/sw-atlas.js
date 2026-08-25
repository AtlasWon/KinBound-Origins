// Plan view of Stonewake and everything it opens into.
//
// A city is judged from the air first -- density, silhouette, whether the
// streets go anywhere -- and only then at 1x on the ground. Compiles each map
// through TileMap directly and blits both layers, so nothing has to be walked
// to be photographed.
//
//   npx electron tools/capture.cjs tools/shots/sw-atlas.js

const d = window.dev;
const ts = await import('/build/js/gfx/tileset.js');
const tm = await import('/build/js/world/tilemap.js');
const set = new ts.Tileset('kinbound-tiles');
const cell = ts.TILE_PX;
const px = ts.TILE_SIZE;

await d.loadWait(900);

const MAPS = (window.SW_MAPS || ['stonewake']);
const out = [];

for (const id of MAPS) {
  const file = await (await fetch('/data/maps/' + id + '.json')).json();
  const map = new tm.TileMap(file);

  const cv = document.createElement('canvas');
  cv.width = map.width * px;
  cv.height = map.height * px;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#000';
  c.fillRect(0, 0, cv.width, cv.height);
  const blit = (arr) => {
    for (let ty = 0; ty < map.height; ty++) {
      for (let tx = 0; tx < map.width; tx++) {
        const t = arr[ty * map.width + tx];
        if (!t) continue;
        const s = set.srcFor(t, tx, ty);
        c.drawImage(set.canvas, s.x, s.y, cell, cell, tx * px, ty * px, px, px);
      }
    }
  };
  blit(map.ground);
  blit(map.over);

  // Warps and doors marked, so a plan view also proves the way in and out.
  for (const w of map.warps ?? []) {
    c.strokeStyle = '#ff00ff';
    c.strokeRect(w.x * px + 0.5, w.y * px + 0.5, px - 1, px - 1);
  }

  const res = await fetch('/__shot/' + encodeURIComponent('sw-atlas-' + id), {
    method: 'POST', body: cv.toDataURL('image/png'),
  });
  out.push(id + ' ' + map.width + 'x' + map.height + ' -> ' + (await res.text()));
}

return { out };
