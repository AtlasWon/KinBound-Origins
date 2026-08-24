// Faces at high zoom, for judging eye shape pixel by pixel.
//
// Crops from the top-left of the ink bounding box rather than the canvas
// centre: almost everything on the roster faces left, so that is where the
// head is. Centring the crop put the face off the edge of the picture.

const d = window.dev;
await d.loadWait(1200);
const ks = await import('/build/js/gfx/kinsprite.js');

const ids = (window.HEAD_IDS || ['cinderpaw', 'sprigling', 'rilltail', 'nibbet']);
const crop = 34;
const zoom = 11;
const cv = document.createElement('canvas');
cv.width = ids.length * (crop * zoom + 6) + 6;
cv.height = crop * zoom + 22;
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
c.fillStyle = '#e8eef6';
c.fillRect(0, 0, cv.width, cv.height);

ids.forEach((id, i) => {
  const src = ks.frontSprite(id);
  const tmp = document.createElement('canvas');
  tmp.width = src.width; tmp.height = src.height;
  const t = tmp.getContext('2d');
  t.drawImage(src, 0, 0);
  const px = t.getImageData(0, 0, src.width, src.height).data;

  let top = src.height, left = src.width;
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      if (px[(y * src.width + x) * 4 + 3] === 0) continue;
      if (y < top) top = y;
      if (x < left) left = x;
    }
  }
  const sx = Math.max(0, Math.min(left - 2, src.width - crop));
  const sy = Math.max(0, Math.min(top - 2, src.height - crop));

  const x = 6 + i * (crop * zoom + 6);
  c.drawImage(src, sx, sy, crop, crop, x, 6, crop * zoom, crop * zoom);
  c.fillStyle = '#465066';
  c.font = '12px monospace';
  c.fillText(id, x, crop * zoom + 18);
});

const res = await fetch('/__shot/heads', { method: 'POST', body: cv.toDataURL('image/png') });
return await res.text();
