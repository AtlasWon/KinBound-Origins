// A handful of species at 4x with their breath bands on, for reading the seam
// against the actual drawing rather than against a number.
//
// Usage: npx electron tools/capture.cjs tools/shots/breathzoom.js 5173 "dev=1&mute=1&view=front&ids=menhir,cairnling"

const { kinBreath } = await import('/build/js/gfx/kinbreath.js');
const { frontSprite, backSprite } = await import('/build/js/gfx/kinsprite.js');

const q = new URLSearchParams(location.search);
const view = q.get('view') || 'front';
const back = view === 'back';
const ids = (q.get('ids') || 'menhir').split(',');

const Z = 4, CELL = 128;
const sheet = document.createElement('canvas');
sheet.width = ids.length * CELL * Z;
sheet.height = CELL * Z;
const g = sheet.getContext('2d');
g.imageSmoothingEnabled = false;
g.fillStyle = '#101018';
g.fillRect(0, 0, sheet.width, sheet.height);

ids.forEach((id, n) => {
  const img = back ? backSprite(id) : frontSprite(id);
  const cx = n * CELL * Z;
  g.drawImage(img, 0, 0, CELL, CELL, cx, 0, CELL * Z, CELL * Z);
  const b = kinBreath(id, back);
  g.fillStyle = 'rgba(80,170,255,0.18)';
  g.fillRect(cx, b.barrelTop * Z, CELL * Z, Math.max(0, (b.barrelBottom - b.barrelTop + 1) * Z));
  g.fillStyle = 'rgba(255,50,50,0.6)';
  for (const s of b.seams) g.fillRect(cx, (s - 2) * Z, CELL * Z, 2 * Z);
  g.fillStyle = '#ffe08a';
  g.font = '20px monospace';
  g.fillText(id + '/' + view, cx + 6, 22);
});

await fetch('/__shot/breathzoom-' + view, { method: 'POST', body: sheet.toDataURL('image/png') });
return { view, ids };
