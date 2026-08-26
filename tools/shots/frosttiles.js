// The fourteen Frostmere tiles side by side, at 1x and at 4x, so each can be
// judged on its own before it is judged in a street.
const d = window.dev;
await d.loadWait(1000);
const ts = await import('/build/js/gfx/tileset.js');
const set = new ts.Tileset('kinbound-tiles');
const cell = ts.TILE_PX;

const names = ['FROST_WALL', 'FROST_WINDOW', 'FROST_DOOR', 'ROOF_SHINGLE_L', 'ROOF_SHINGLE',
  'ROOF_SHINGLE_R', 'ROOF_STACK', 'LAMP_FROST', 'WOODPILE', 'ICE_STACK', 'FIREPOT',
  'ICE_SOUND', 'ICE_ROTTEN', 'ICE_THAW'];

const cv = document.createElement('canvas');
cv.width = names.length * (cell * 2 + 4);
cv.height = cell * 2 + cell * 8 + 30;
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
c.fillStyle = '#20242e';
c.fillRect(0, 0, cv.width, cv.height);

names.forEach((n, i) => {
  const id = ts.T[n];
  const s = set.src(id);
  const dx = i * (cell * 2 + 4) + 2;
  // 1x, four of them tiled, so a repeat shows.
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
    c.drawImage(set.canvas, s.x, s.y, cell, cell, dx + a * cell, b * cell, cell, cell);
  }
  // 4x.
  c.drawImage(set.canvas, s.x, s.y, cell, cell, dx, cell * 2 + 8, cell * 4, cell * 4);
  c.fillStyle = '#9aa6c2';
  c.font = '10px monospace';
  c.save();
  c.translate(dx + 8, cell * 6 + 20);
  c.fillText(n, 0, 0);
  c.restore();
});

const res = await fetch('/__shot/frost-tiles', { method: 'POST', body: cv.toDataURL('image/png') });
return { path: await res.text(), count: names.length };
