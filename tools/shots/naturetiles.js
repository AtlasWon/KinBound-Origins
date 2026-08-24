// Blows up the outdoor tiles, and stamps each in a 3x3 block so the way it
// meets a copy of itself is visible too.
const d = window.dev;
await d.loadWait(900);
const ts = await import('/build/js/gfx/tileset.js');
const set = new ts.Tileset('kinbound-tiles');
const cell = ts.TILE_PX;
const want = ['TALL_GRASS', 'TREE', 'CLIFF_FACE', 'CLIFF_TOP', 'WATER', 'WATER_DEEP', 'GRASS', 'TREE_SMALL'];
const scale = 4;
const blk = cell * 3 * scale;
const cv = document.createElement('canvas');
cv.width = want.length * (blk + 8);
cv.height = blk + 22;
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
c.fillStyle = '#20242e';
c.fillRect(0, 0, cv.width, cv.height);
want.forEach((name, i) => {
  const id = ts.T[name];
  const dx = i * (blk + 8) + 4;
  for (let ty = 0; ty < 3; ty++) {
    for (let tx = 0; tx < 3; tx++) {
      const s = set.srcFor(id, tx + i * 7, ty + i * 3);
      c.drawImage(set.canvas, s.x, s.y, cell, cell,
        dx + tx * cell * scale, 4 + ty * cell * scale, cell * scale, cell * scale);
    }
  }
  c.fillStyle = '#9aa6c2';
  c.font = '11px monospace';
  c.fillText(name, dx, blk + 18);
});
const res = await fetch('/__shot/nature-tiles', { method: 'POST', body: cv.toDataURL('image/png') });
return await res.text();
