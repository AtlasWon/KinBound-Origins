// Trees standing on their own, which is where an opaque canopy tile shows up
// as a dark square rather than as a tree.
const d = window.dev;
await d.loadWait(900);
const ts = await import('/build/js/gfx/tileset.js');
const set = new ts.Tileset('kinbound-tiles');
const cell = ts.TILE_PX;
const scale = 3;
const W = 12, H = 7;
const cv = document.createElement('canvas');
cv.width = W * cell * scale;
cv.height = H * cell * scale;
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
// Grass everywhere, then trees over it: exactly what TileMap does.
for (let ty = 0; ty < H; ty++) {
  for (let tx = 0; tx < W; tx++) {
    const s = set.srcFor(ts.T.GRASS, tx, ty);
    c.drawImage(set.canvas, s.x, s.y, cell, cell,
      tx * cell * scale, ty * cell * scale, cell * scale, cell * scale);
  }
}
const spots = [[1, 1], [4, 2], [7, 1], [10, 3], [2, 5], [5, 5], [6, 5], [9, 5], [8, 3], [8, 4]];
for (const [tx, ty] of spots) {
  const s = set.srcFor(ts.T.TREE, tx, ty);
  c.drawImage(set.canvas, s.x, s.y, cell, cell,
    tx * cell * scale, ty * cell * scale, cell * scale, cell * scale);
}
const res = await fetch('/__shot/lone-tree', { method: 'POST', body: cv.toDataURL('image/png') });
return await res.text();
