// Every creature at the size the party screen and the switch menu actually
// draw them. A face that only survives at 3x is a face the player never sees.

const d = window.dev;
await d.loadWait(1200);
const ks = await import('/build/js/gfx/kinsprite.js');
const species = await (await fetch('/data/creatures/species.json')).json();
const ids = species.map((s) => s.id);

const S = 64;
const zoom = 2;              // 2x so the 64px art is legible on this sheet
const cols = 8;
const cellW = S * zoom;
const cellH = S * zoom + 12;
const rows = Math.ceil(ids.length / cols);

const cv = document.createElement('canvas');
cv.width = cols * cellW;
cv.height = rows * cellH;
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
c.fillStyle = '#dfe7f2';
c.fillRect(0, 0, cv.width, cv.height);

ids.forEach((id, i) => {
  const x = (i % cols) * cellW;
  const y = Math.floor(i / cols) * cellH;
  if ((i + Math.floor(i / cols)) % 2 === 0) {
    c.fillStyle = '#d3dcea';
    c.fillRect(x, y, cellW, cellH);
  }
  c.drawImage(ks.iconSprite(id), 0, 0, S, S, x, y, cellW, cellW);
  c.fillStyle = '#465066';
  c.font = '10px monospace';
  c.fillText(id, x + 3, y + cellW + 9);
});

const res = await fetch('/__shot/icons', { method: 'POST', body: cv.toDataURL('image/png') });
return await res.text();
