// The whole creature roster on one sheet, with a silhouette sheet beside it.
//
// The silhouette sheet is the one that matters: fill every creature with one
// flat colour and any two that are the same drawing in different paint become
// impossible to hide.
//
// Env: SIL=1 for silhouettes, COLS to change the grid, Z for zoom.

const d = window.dev;
await d.loadWait(1200);
const ks = await import('/build/js/gfx/kinsprite.js');
const species = await (await fetch('/data/creatures/species.json')).json();
const ids = species.map((s) => s.id);

const S = 128;
const cols = 8;
const zoom = 1;
const cellW = S * zoom;
const cellH = S * zoom + 12;
const rows = Math.ceil(ids.length / cols);

function sheet(silhouette) {
  const cv = document.createElement('canvas');
  cv.width = cols * cellW;
  cv.height = rows * cellH;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.fillStyle = silhouette ? '#e8eef6' : '#dfe7f2';
  c.fillRect(0, 0, cv.width, cv.height);

  ids.forEach((id, i) => {
    const x = (i % cols) * cellW;
    const y = Math.floor(i / cols) * cellH;
    if ((i + Math.floor(i / cols)) % 2 === 0) {
      c.fillStyle = silhouette ? '#dde5ef' : '#d3dcea';
      c.fillRect(x, y, cellW, cellH);
    }
    let src = ks.frontSprite(id);
    if (silhouette) {
      const tmp = document.createElement('canvas');
      tmp.width = S; tmp.height = S;
      const t = tmp.getContext('2d');
      t.drawImage(src, 0, 0);
      t.globalCompositeOperation = 'source-in';
      t.fillStyle = '#1b2233';
      t.fillRect(0, 0, S, S);
      src = tmp;
    }
    c.drawImage(src, 0, 0, S, S, x, y, cellW, cellW);
    c.fillStyle = '#465066';
    c.font = '10px monospace';
    c.fillText(id, x + 3, y + cellW + 9);
  });
  return cv;
}

const out = [];
for (const [name, sil] of [['roster-colour', false], ['roster-silhouette', true]]) {
  const res = await fetch('/__shot/' + name, { method: 'POST', body: sheet(sil).toDataURL('image/png') });
  out.push(await res.text());
}
return { species: ids.length, out };
