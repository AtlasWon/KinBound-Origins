// A few species, full body, big. The side-by-side the player actually makes.
//
// Env: KIN_IDS (space separated), KIN_ZOOM.

const d = window.dev;
await d.loadWait(1200);
const ks = await import('/build/js/gfx/kinsprite.js');

const ids = (window.KIN_IDS || 'sprigling cinderpaw rilltail').split(/\s+/);
const zoom = window.KIN_ZOOM || 4;
const S = 128;
const cv = document.createElement('canvas');
cv.width = ids.length * (S * zoom + 8) + 8;
cv.height = S * zoom + 26;
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
c.fillStyle = '#e8eef6';
c.fillRect(0, 0, cv.width, cv.height);

ids.forEach((id, i) => {
  const x = 8 + i * (S * zoom + 8);
  c.fillStyle = i % 2 ? '#dde5ef' : '#e2e9f3';
  c.fillRect(x, 8, S * zoom, S * zoom);
  c.drawImage(ks.frontSprite(id), 0, 0, S, S, x, 8, S * zoom, S * zoom);
  c.fillStyle = '#465066';
  c.font = '13px monospace';
  c.fillText(id, x, S * zoom + 22);
});

const res = await fetch('/__shot/compare', { method: 'POST', body: cv.toDataURL('image/png') });
return await res.text();
