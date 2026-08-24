// Measures where the procedural pipeline actually seats a creature in the
// 128 cell: the ink bounding box of every front and back sprite, so the image
// route can be made to stand on exactly the same ground line.
const d = window.dev;
await d.loadWait(800);
const ks = await import('/build/js/gfx/kinsprite.js');
const species = await (await fetch('/data/creatures/species.json')).json();

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

const rows = [];
for (const s of species) {
  // 200 skips the contact shadow (alpha 0.18 / 0.34) and finds the body ink.
  const f = bbox(ks.frontSprite(s.id), 200);
  const b = bbox(ks.backSprite(s.id), 200);
  const fs = bbox(ks.frontSprite(s.id), 8);
  rows.push({ id: s.id, fb: f.y1, bb: b.y1, ft: f.y0, fcx: (f.x0 + f.x1 + 1) / 2, shadowBottom: fs.y1 });
}
const bots = rows.map((r) => r.fb).sort((a, b) => a - b);
const bbots = rows.map((r) => r.bb).sort((a, b) => a - b);
const cxs = rows.map((r) => r.fcx).sort((a, b) => a - b);
const sh = rows.map((r) => r.shadowBottom).sort((a, b) => a - b);
return {
  n: rows.length,
  inkBottom: { min: bots[0], med: bots[bots.length >> 1], max: bots[bots.length - 1] },
  backInkBottom: { min: bbots[0], med: bbots[bbots.length >> 1], max: bbots[bbots.length - 1] },
  shadowBottom: { min: sh[0], med: sh[sh.length >> 1], max: sh[sh.length - 1] },
  centreX: { min: cxs[0], med: cxs[cxs.length >> 1], max: cxs[cxs.length - 1] },
  sample: rows.slice(0, 6),
};
