// The capital's tiles, side by side and labelled, at 4x.
//
// A tile has to be judged as itself and as a run of itself: the curtain wall is
// stacked ten high in the game and the paving is laid four hundred cells
// across, so a single cell tells you almost nothing about either. Each entry is
// drawn once large and then as a 5x4 patch, which is where a repeat shows.
const d = window.dev;
await d.loadWait(1000);
const ts = await import('/build/js/gfx/tileset.js');
const set = new ts.Tileset('kinbound-tiles');
const cell = ts.TILE_PX;
const T = ts.T;

const names = ['CITY_PAVE', 'CITY_ROAD', 'CITY_COBBLE', 'PARK_PATH', 'GLASS_WALL',
  'TOWER_PIER', 'TOWER_CAP_L', 'TOWER_CAP', 'TOWER_CAP_R', 'TOWER_PLINTH', 'TOWER_DOOR',
  'SHOPFRONT', 'AWNING', 'GRANITE_WALL', 'GRANITE_WINDOW', 'GRANITE_ARCH',
  'MER_WALL', 'MER_GLASS', 'MER_CREST', 'MER_DOOR', 'SHED_ROOF', 'SHED_TRUSS',
  'CITY_LAMP', 'STREET_TREE', 'BENCH', 'RAILING', 'HEDGE', 'STATUE', 'FOUNTAIN'];

const big = 4, patchS = 2, PW = 5, PH = 4;
const rowH = Math.max(cell * big, cell * patchS * PH) + 16;
const cv = document.createElement('canvas');
cv.width = 1000;
cv.height = rowH * Math.ceil(names.length / 2) + 8;
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
c.fillStyle = '#20242e';
c.fillRect(0, 0, cv.width, cv.height);

names.forEach((n, i) => {
  const id = T[n];
  const colX = (i % 2) * 500 + 6;
  const y = Math.floor(i / 2) * rowH + 6;
  const s = set.src(id);
  c.drawImage(set.canvas, s.x, s.y, cell, cell, colX, y, cell * big, cell * big);
  for (let py = 0; py < PH; py++) {
    for (let px = 0; px < PW; px++) {
      const v = set.srcFor(id, px + i * 7, py + i * 3);
      c.drawImage(set.canvas, v.x, v.y, cell, cell,
        colX + cell * big + 10 + px * cell * patchS, y + py * cell * patchS,
        cell * patchS, cell * patchS);
    }
  }
  c.fillStyle = '#9aa6c2';
  c.font = '12px monospace';
  c.fillText(n, colX, y + rowH - 8);
});

const res = await fetch('/__shot/city-tiles', { method: 'POST', body: cv.toDataURL('image/png') });
return { path: await res.text() };
