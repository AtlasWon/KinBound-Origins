// Dumps the whole generated tile atlas, so tiles can be reviewed side by side
// instead of hunting for one in a map. Each cell is labelled with its id.

const d = window.dev;
await d.loadWait(1000);
const ts = await import('/build/js/gfx/tileset.js');

const set = new ts.Tileset('kinbound-tiles');
const cell = ts.TILE_PX;               // 32 buffer pixels
const scale = 2;
const cols = 8;
const rows = Math.ceil(set.canvas.height / cell);

const cv = document.createElement('canvas');
cv.width = cols * (cell * scale + 4);
cv.height = rows * (cell * scale + 14);
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
c.fillStyle = '#20242e';
c.fillRect(0, 0, cv.width, cv.height);

const names = Object.keys(ts.T).filter((k) => Number.isNaN(Number(k)));

for (let i = 0; i < rows * cols; i++) {
  const sx = (i % cols) * cell;
  const sy = Math.floor(i / cols) * cell;
  if (sy >= set.canvas.height) break;
  const dx = (i % cols) * (cell * scale + 4) + 2;
  const dy = Math.floor(i / cols) * (cell * scale + 14) + 2;
  c.drawImage(set.canvas, sx, sy, cell, cell, dx, dy, cell * scale, cell * scale);
  c.fillStyle = '#9aa6c2';
  c.font = '9px monospace';
  c.fillText(String(i) + ' ' + (names[i] || ''), dx, dy + cell * scale + 10);
}

const res = await fetch('/__shot/tile-sheet', { method: 'POST', body: cv.toDataURL('image/png') });
return { cells: rows * cols, path: await res.text() };
