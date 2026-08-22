// Renders a contact sheet of kin front sprites, so the creature art can be
// judged side by side rather than one at a time in a battle.
const d = window.dev;
await d.loadWait(1000);
const ks = await import('/build/js/gfx/kinsprite.js');

const ids = ['sprigling', 'cinderpaw', 'rilltail', 'nibbet', 'pipwing', 'nettlebug',
  'pebblet', 'fizzlet', 'tuftail', 'frostnip', 'deeplum', 'anchorling'];

const cols = 4;
const cell = 128;
const cv = document.createElement('canvas');
cv.width = cols * cell;
cv.height = Math.ceil(ids.length / cols) * cell;
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
c.fillStyle = '#e8eef6';
c.fillRect(0, 0, cv.width, cv.height);
c.fillStyle = '#cfd8e6';
for (let i = 0; i < ids.length; i++) {
  if (i % 2 === 0) c.fillRect((i % cols) * cell, Math.floor(i / cols) * cell, cell, cell);
}
ids.forEach((id, i) => {
  const s = ks.frontSprite(id);
  c.drawImage(s, (i % cols) * cell, Math.floor(i / cols) * cell);
});
const res = await fetch('/__shot/' + encodeURIComponent('kin-sheet'), {
  method: 'POST', body: cv.toDataURL('image/png'),
});
return await res.text();
