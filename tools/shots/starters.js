// The three starters side by side, big, plus their silhouettes.
const d = window.dev;
await d.loadWait(1000);
const ks = await import('/build/js/gfx/kinsprite.js');
const ids = ['sprigling', 'cinderpaw', 'rilltail'];
const S = 128, scale = 2, pad = 8;
const cv = document.createElement('canvas');
cv.width = ids.length * (S * scale + pad) + pad;
cv.height = S * scale * 2 + pad * 3 + 16;
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
c.fillStyle = '#dfe7f2';
c.fillRect(0, 0, cv.width, cv.height);

ids.forEach((id, i) => {
  const x = pad + i * (S * scale + pad);
  c.drawImage(ks.frontSprite(id), 0, 0, S, S, x, pad, S * scale, S * scale);
});

// Silhouette row: fill every opaque pixel flat, which is the test that says
// whether two creatures are actually different shapes.
ids.forEach((id, i) => {
  const src = ks.frontSprite(id);
  const tmp = document.createElement('canvas');
  tmp.width = S; tmp.height = S;
  const t = tmp.getContext('2d');
  t.drawImage(src, 0, 0);
  t.globalCompositeOperation = 'source-in';
  t.fillStyle = '#1b2233';
  t.fillRect(0, 0, S, S);
  const x = pad + i * (S * scale + pad);
  c.imageSmoothingEnabled = false;
  c.drawImage(tmp, 0, 0, S, S, x, pad * 2 + S * scale, S * scale, S * scale);
});

const res = await fetch('/__shot/starters', { method: 'POST', body: cv.toDataURL('image/png') });
return await res.text();
