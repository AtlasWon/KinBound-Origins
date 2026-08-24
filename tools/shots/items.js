// Every item icon the game can draw, generated and hand-drawn together, at the
// two sizes it draws them: 32px (16 logical units, the panel/overworld size)
// and 16px (8 logical, the bag-row size).
//
// The left block of each cell is 1x -- judge it there, it is the only size that
// tells the truth -- and the right block is the same icon at 4x so single
// pixels are visible.
//
// Usage: node tools/serve.js
//        npx electron tools/capture.cjs tools/shots/items.js

const d = window.dev;
await d.loadWait(1400);

const art = await import('/build/js/gfx/itemart.js');
const { registry } = await import('/build/js/data/registry.js');

const items = [...registry.items.values()];
const seen = new Map();
for (const it of items) {
  if (!seen.has(it.icon)) seen.set(it.icon, { key: it.icon, category: it.category, names: [] });
  seen.get(it.icon).names.push(it.name);
}
const keys = [...seen.values()];

const CELL_W = 120;
const CELL_H = 44;
const COLS = 4;
const rows = Math.ceil(keys.length / COLS);

const cv = document.createElement('canvas');
cv.width = COLS * CELL_W + 8;
cv.height = rows * CELL_H + 28;
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
c.fillStyle = '#4a4257';
c.fillRect(0, 0, cv.width, cv.height);
// The bag's own background, so these are judged against the surface they will
// actually sit on rather than against black.
for (let y = 0; y < cv.height; y += 4) {
  c.fillStyle = '#514860';
  c.fillRect(0, y, cv.width, 1);
}

c.font = '11px monospace';
c.fillStyle = '#f0f2f8';
c.fillText(`${keys.length} item icons  --  32px and 16px, at 1x then 4x`, 8, 16);

keys.forEach((k, i) => {
  const x = 4 + (i % COLS) * CELL_W;
  const y = 24 + Math.floor(i / COLS) * CELL_H;
  const drawn = art.hasItemArt(k.key);

  const big = art.itemSprite(k.key, k.category);
  const small = art.itemIcon(k.key, k.category);

  // 1x, the two sizes side by side on the same baseline.
  c.drawImage(big, x + 2, y + 2);
  c.drawImage(small, x + 38, y + 10);

  // 4x.
  c.drawImage(big, 0, 0, 32, 32, x + 58, y + 2, 32 * 1.25, 32 * 1.25);
  c.drawImage(small, 0, 0, 16, 16, x + 100, y + 10, 16 * 1.25, 16 * 1.25);

  c.font = '9px monospace';
  c.fillStyle = drawn ? '#ffd98a' : '#c8cede';
  c.fillText(k.key + (drawn ? ' *' : ''), x + 2, y + 42);
});

await fetch('/__shot/item-icons', { method: 'POST', body: cv.toDataURL('image/png') });

// And a blown-up sheet where a single pixel is four pixels, which is where an
// off-grid halving actually shows.
const Z = 6;
const ZW = 32 * Z + 16 * Z + 16;
const ZH = 32 * Z + 18;
const zoom = document.createElement('canvas');
zoom.width = COLS * ZW + 8;
zoom.height = Math.ceil(keys.length / COLS) * ZH + 8;
const z = zoom.getContext('2d');
z.imageSmoothingEnabled = false;
z.fillStyle = '#16141f';
z.fillRect(0, 0, zoom.width, zoom.height);
keys.forEach((k, i) => {
  const x = 4 + (i % COLS) * ZW;
  const y = 4 + Math.floor(i / COLS) * ZH;
  z.drawImage(art.itemSprite(k.key, k.category), 0, 0, 32, 32, x, y, 32 * Z, 32 * Z);
  z.drawImage(art.itemIcon(k.key, k.category), 0, 0, 16, 16, x + 32 * Z + 8, y, 16 * Z, 16 * Z);
  z.font = '10px monospace';
  z.fillStyle = '#9aa4b8';
  z.fillText(k.key, x, y + 32 * Z + 12);
});
await fetch('/__shot/item-icons-zoom', { method: 'POST', body: zoom.toDataURL('image/png') });

const report = art.itemArtReport();
return `${keys.length} keys, ${report.keys.length} hand-drawn, ${report.notes.length} note(s)`;
