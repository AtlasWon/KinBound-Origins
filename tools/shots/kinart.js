// What the image route actually did with the files in assets/kin.
//
// Prints the load report, then measures the seated sprites against the
// procedural ones: same ground line, same centre, and an exact 2:1 icon.
// Also writes a sheet showing front, back, hit flash and icon per species.
const d = window.dev;
await d.loadWait(900);
const ka = await import('/build/js/gfx/kinart.js');
const ks = await import('/build/js/gfx/kinsprite.js');

function bbox(cv, minAlpha) {
  const g = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
  for (let y = 0; y < cv.height; y++) {
    for (let x = 0; x < cv.width; x++) {
      if (g[(y * cv.width + x) * 4 + 3] < minAlpha) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  return { x0, y0, x1, y1 };
}

// Colours in the icon that were not in the sprite: the tell for a muddy
// resample. An exact 2:1 reduction invents nothing.
function newColours(id) {
  const src = ks.frontSprite(id);
  const ico = ks.iconSprite(id);
  const s = src.getContext('2d').getImageData(0, 0, src.width, src.height).data;
  const i = ico.getContext('2d').getImageData(0, 0, ico.width, ico.height).data;
  const have = new Set();
  for (let p = 0; p < s.length; p += 4) {
    if (s[p + 3] >= 128) have.add((s[p] << 16) | (s[p + 1] << 8) | s[p + 2]);
  }
  let bad = 0;
  for (let p = 0; p < i.length; p += 4) {
    if (i[p + 3] < 128) continue;
    if (!have.has((i[p] << 16) | (i[p + 1] << 8) | i[p + 2])) bad++;
  }
  return bad;
}

const report = ka.kinArtReport();
const rows = [];
for (const id of report.species) {
  const f = ks.frontSprite(id), b = ks.backSprite(id), i = ks.iconSprite(id);
  const fb = bbox(f, 200), bb = bbox(b, 200), ib = bbox(i, 200);
  rows.push({
    id,
    frontSize: f.width + 'x' + f.height,
    iconSize: i.width + 'x' + i.height,
    frontInkBottom: fb.y1, frontCentre: (fb.x0 + fb.x1 + 1) / 2,
    backInkBottom: bb.y1, backCentre: (bb.x0 + bb.x1 + 1) / 2,
    iconInkBottom: ib.y1,
    iconInventedColours: newColours(id),
    whiteOk: bbox(ks.whiteSprite(id, false), 200).y1 === fb.y1,
  });
}

// A contact sheet: front, back, white flash, icon, for every image species,
// with one procedural species beside them for comparison.
const ids = [...report.species, 'sprigling'];
const cell = 132;
const cv = document.createElement('canvas');
cv.width = cell * 4;
cv.height = cell * ids.length;
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
c.fillStyle = '#c8d2e0';
c.fillRect(0, 0, cv.width, cv.height);
ids.forEach((id, r) => {
  const y = r * cell;
  c.fillStyle = '#dde5ef';
  c.fillRect(0, y, cv.width, 128);
  // Ground line the generator uses, drawn across every cell.
  c.fillStyle = 'rgba(200,40,40,0.55)';
  c.fillRect(0, y + 123, cv.width, 1);
  c.drawImage(ks.frontSprite(id), 0, y);
  c.drawImage(ks.backSprite(id), cell, y);
  c.drawImage(ks.whiteSprite(id, false), cell * 2, y);
  c.fillStyle = '#3b4560';
  c.fillRect(cell * 3, y, 64, 64);
  c.drawImage(ks.iconSprite(id), cell * 3, y);
  c.fillStyle = '#33405c';
  c.font = '11px monospace';
  c.fillText(id, cell * 3 + 2, y + 78);
});
await fetch('/__shot/kinart-sheet', { method: 'POST', body: cv.toDataURL('image/png') });

return {
  loaded: report.loaded,
  species: report.species,
  notes: report.notes,
  unpaired: report.unpaired,
  softIcons: report.softIcons,
  entries: report.entries.map((e) => ({
    f: e.file, src: e.sourceW + 'x' + e.sourceH, scale: e.scale,
    grid: Number(e.gridScore.toFixed(3)), shift: e.gridShift, soft: e.softPixels,
    ink: e.ink,
  })),
  rows,
};
