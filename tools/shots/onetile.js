// Blows up a handful of tiles so a single one can be judged.
const d = window.dev;
await d.loadWait(900);
const ts = await import('/build/js/gfx/tileset.js');
const set = new ts.Tileset('kinbound-tiles');
const cell = ts.TILE_PX;
const want = ['SOFA', 'LAB_DOOR_L', 'LAB_DOOR_R', 'BED_HEAD', 'WINDOW_IN', 'TABLE', 'CHAIR', 'TELEVISION'];
const scale = 6;
const cv = document.createElement('canvas');
cv.width = want.length * (cell * scale + 6);
cv.height = cell * scale + 20;
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
c.fillStyle = '#20242e';
c.fillRect(0, 0, cv.width, cv.height);
want.forEach((name, i) => {
  const id = ts.T[name];
  const s = set.src(id);
  const dx = i * (cell * scale + 6) + 3;
  c.drawImage(set.canvas, s.x, s.y, cell, cell, dx, 3, cell * scale, cell * scale);
  c.fillStyle = '#9aa6c2';
  c.font = '11px monospace';
  c.fillText(name, dx, cell * scale + 16);
});
const res = await fetch('/__shot/tile-zoom', { method: 'POST', body: cv.toDataURL('image/png') });
return await res.text();
