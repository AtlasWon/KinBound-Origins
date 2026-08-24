// A handful of tiles blown up big, each shown alone and in the run it belongs
// to, so a single cell can be judged and its seams checked at the same time.
const d = window.dev;
await d.loadWait(900);
const ts = await import('/build/js/gfx/tileset.js');
const set = new ts.Tileset('kinbound-tiles');
const cell = ts.TILE_PX;
const DETAIL = 2;
const scale = 8;
const step = cell * scale / DETAIL;

const strips = [
  ['STAIRS in floor', ['FLOOR_WOOD', 'STAIRS', 'FLOOR_WOOD']],
  ['DOOR in wall run', ['WALL_INTERIOR', 'DOOR', 'WALL_INTERIOR']],
  ['TALL_GRASS x3', ['TALL_GRASS', 'TALL_GRASS', 'TALL_GRASS']],
];

const cv = document.createElement('canvas');
cv.width = 3 * step + 16;
cv.height = strips.length * (step + 16);
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
c.fillStyle = '#20242e';
c.fillRect(0, 0, cv.width, cv.height);
strips.forEach((s, i) => {
  s[1].forEach((nm, j) => {
    const src = set.srcFor(ts.T[nm], j, i);
    c.drawImage(set.canvas, src.x, src.y, cell, cell, 8 + j * step, i * (step + 16) + 4, step, step);
  });
  c.fillStyle = '#9aa6c2';
  c.font = '11px monospace';
  c.fillText(s[0], 8, i * (step + 16) + step + 15);
});
const res = await fetch('/__shot/tj-zoom', { method: 'POST', body: cv.toDataURL('image/png') });
return await res.text();
