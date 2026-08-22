// Contact sheet of the walk cycle: every frame of every facing, side by side.
const d = window.dev;
await d.loadWait(1000);
const cs = await import('/build/js/gfx/charsprite.js');
const sheet = cs.getCharSheet('player');

const cell = 64;
const cv = document.createElement('canvas');
cv.width = cell * 4;
cv.height = cell * 4;
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
c.fillStyle = '#dfe7f2';
c.fillRect(0, 0, cv.width, cv.height);

cs.DIRS.forEach((dir, row) => {
  for (let step = 0; step < 4; step++) {
    const src = sheet.src(dir, step);
    c.save();
    if (src.flip) {
      c.translate(step * cell + cell, row * cell);
      c.scale(-1, 1);
      c.drawImage(sheet.canvas, src.x, src.y, src.w, src.h, 16, 8, src.w, src.h);
    } else {
      c.drawImage(sheet.canvas, src.x, src.y, src.w, src.h, step * cell + 16, row * cell + 8, src.w, src.h);
    }
    c.restore();
  }
});
const res = await fetch('/__shot/walk-cycle', { method: 'POST', body: cv.toDataURL('image/png') });
return await res.text();
