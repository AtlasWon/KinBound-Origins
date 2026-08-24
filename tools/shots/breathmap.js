// WHERE the breath actually cuts, on every species at once.
//
// One cell per species: the sprite as drawn, with the barrel kinbreath found
// shaded blue and the design rows a compressing breath DELETES painted red.
// A correct seam has its red band buried in the middle of a solid mass. A wrong
// one has it across a leg, across a neck, or floating in the gap between two
// limbs -- all three are visible instantly and none of them are visible in the
// numbers.
//
// Usage: npx electron tools/capture.cjs tools/shots/breathmap.js [port] "dev=1&mute=1&view=front"

const reg = (await import('/build/js/data/registry.js')).registry;
const { kinBreath } = await import('/build/js/gfx/kinbreath.js');
const { frontSprite, backSprite } = await import('/build/js/gfx/kinsprite.js');

const view = new URLSearchParams(location.search).get('view') || 'front';
const back = view === 'back';

const ids = [...reg.species.keys()];
const COLS = 8, CELL = 128;
const rowsN = Math.ceil(ids.length / COLS);

const sheet = document.createElement('canvas');
sheet.width = COLS * CELL;
sheet.height = rowsN * CELL;
const g = sheet.getContext('2d');
g.imageSmoothingEnabled = false;
g.fillStyle = '#101018';
g.fillRect(0, 0, sheet.width, sheet.height);

ids.forEach((id, n) => {
  const cx = (n % COLS) * CELL, cy = Math.floor(n / COLS) * CELL;
  const img = back ? backSprite(id) : frontSprite(id);
  g.drawImage(img, cx, cy);
  const b = kinBreath(id, back);
  // The ink box, so it is obvious how much of the cell the animal uses.
  g.strokeStyle = 'rgba(255,255,255,0.22)';
  g.strokeRect(cx + 0.5, cy + b.y0 + 0.5, CELL - 1, b.y1 - b.y0);
  // The barrel.
  g.fillStyle = 'rgba(80,170,255,0.20)';
  g.fillRect(cx, cy + b.barrelTop, CELL, Math.max(0, b.barrelBottom - b.barrelTop + 1));
  // The two design rows each seam removes.
  g.fillStyle = 'rgba(255,60,60,0.75)';
  for (const s of b.seams) g.fillRect(cx, cy + s - 2, CELL, 2);
  g.fillStyle = '#ffe08a';
  g.font = '9px monospace';
  g.fillText(id, cx + 3, cy + 10);
});

const url = sheet.toDataURL('image/png');
await fetch('/__shot/breathmap-' + view, { method: 'POST', body: url });
return { view, species: ids.length };
