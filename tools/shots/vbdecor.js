// Blows up the dressing and the interior surfaces, four times life size and
// stamped 2x2 so a tile's join with a copy of itself shows too. Two rows:
// what stands about outdoors, and what a room is made of.

const d = window.dev;
await d.loadWait(900);
const ts = await import('/build/js/gfx/tileset.js');
const set = new ts.Tileset('kinbound-tiles');
const cell = ts.TILE_PX;
const rows = [
  ['FENCE_H', 'FENCE_V', 'SIGN', 'LAMP_POST', 'FLOWER_BED', 'BRIDGE', 'PUDDLE',
    'LEDGE', 'ROCK', 'BOULDER', 'BRAMBLE', 'STONE_FLOOR'],
  ['FLOOR_WOOD', 'FLOOR_RUG', 'WALL_INTERIOR', 'CIVIC_FLOOR', 'FLOOR_LAB',
    'COUNTER', 'TABLE', 'CHAIR', 'BED_HEAD', 'SOFA', 'BOOKSHELF', 'STAIRS'],
];
const scale = 4;
const blk = cell * 2 * scale;
const cv = document.createElement('canvas');
cv.width = rows[0].length * (blk + 8);
cv.height = rows.length * (blk + 22);
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
c.fillStyle = '#20242e';
c.fillRect(0, 0, cv.width, cv.height);
rows.forEach((names, r) => {
  names.forEach((name, i) => {
    const id = ts.T[name];
    const dx = i * (blk + 8) + 4;
    const dy = r * (blk + 22) + 4;
    for (let ty = 0; ty < 2; ty++) {
      for (let tx = 0; tx < 2; tx++) {
        const s = set.srcFor(id, tx + i * 5, ty + r * 3);
        c.drawImage(set.canvas, s.x, s.y, cell, cell,
          dx + tx * cell * scale, dy + ty * cell * scale, cell * scale, cell * scale);
      }
    }
    c.fillStyle = '#9aa6c2';
    c.font = '11px monospace';
    c.fillText(name, dx, dy + blk + 14);
  });
});
const res = await fetch('/__shot/vb-decor', { method: 'POST', body: cv.toDataURL('image/png') });
return await res.text();
