// Every new Act 2 palette, at a magnification you can count pixels at.
//
// The 1x map shot (act2cast.js) decides whether a character reads at all; this
// one decides whether the coat, the badge and the hem are drawn where the code
// thinks they are. Two backgrounds alternate down the page, because a sprite
// that only reads on one ground is not finished.
//
// `right` is omitted: it is `left` mirrored by construction.

const d = window.dev;
await d.loadWait(1000);
const cs = await import('/build/js/gfx/charsprite.js');

const IDS = window.CAST_IDS || [
  'veyl', 'lyra', 'meridian', 'meridian_lead', 'meridian_sci', 'meridian_sci_f',
  'porter', 'dockhand', 'netmender', 'harbourmaster', 'townsfolk_m', 'townsfolk_f',
  'merchant', 'concord', 'villager_f', 'villager_m', 'professor', 'fisher',
];
/** Standing, and one contact frame, so the hem is judged in motion too. */
const POSES = [['down', 0], ['down', 1], ['up', 0], ['left', 0], ['left', 1]];

const Z = 3;
const CW = cs.CHAR_W * Z;
const CH = cs.CHAR_H * Z;
const PAD = 4;
const LABEL = 14;

const cv = document.createElement('canvas');
cv.width = PAD + IDS.length * (CW + PAD);
cv.height = LABEL + PAD + POSES.length * (CH + PAD);
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
c.fillStyle = '#7f8ea0';
c.fillRect(0, 0, cv.width, cv.height);
c.fillStyle = '#101418';
c.font = '11px monospace';

IDS.forEach((id, i) => {
  const x = PAD + i * (CW + PAD);
  c.fillText(id.slice(0, 13), x, 11);
  const sheet = cs.getCharSheet(id);
  POSES.forEach(([dir, step], row) => {
    const y = LABEL + PAD + row * (CH + PAD);
    c.fillStyle = row % 2 ? '#3c4a3a' : '#cbb489';
    c.fillRect(x, y, CW, CH);
    const src = sheet.src(dir, step);
    c.save();
    c.translate(x, y);
    if (src.flip) { c.translate(CW, 0); c.scale(-1, 1); }
    c.drawImage(sheet.canvas, src.x, src.y, src.w, src.h, 0, 0, CW, CH);
    c.restore();
    c.fillStyle = '#101418';
  });
});

const res = await fetch('/__shot/act2sheet', { method: 'POST', body: cv.toDataURL('image/png') });
return await res.text();
