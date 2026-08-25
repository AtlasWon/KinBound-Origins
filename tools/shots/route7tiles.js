// The Central Road's tile family, drawn as fields rather than as single cells.
//
// A tile sheet of one cell per tile is useless for ground: the whole question
// about macadam, plough, wheat and ballast is whether an acre of them tiles
// without printing a lattice, and one cell cannot answer that. So each entry
// below is drawn as a 6x4 block of the SAME tile with its alternates rotating
// the way TileMap picks them, at 1x and again at 3x.
const d = window.dev;
await d.loadWait(1000);
const ts = await import('/build/js/gfx/tileset.js');
const set = new ts.Tileset('kinbound-tiles');
const T = ts.T;
const cell = ts.TILE_PX;

const SHOW = [
  ['HIGHROAD', T.HIGHROAD], ['FURROW', T.FURROW], ['WHEAT', T.WHEAT],
  ['HEDGEROW', T.HEDGEROW], ['EMBANKMENT', T.EMBANKMENT],
  ['TRACK_H', T.TRACK_H], ['TRACK_V', T.TRACK_V],
  ['TRACK_CROSSING', T.TRACK_CROSSING],
  ['HALT_DECK', T.HALT_DECK], ['HALT_EDGE', T.HALT_EDGE],
  ['STOOK', T.STOOK], ['MILESTONE', T.MILESTONE],
  ['TELEGRAPH', T.TELEGRAPH], ['TRACK_SIGNAL', T.TRACK_SIGNAL],
  ['TRACK_NE', T.TRACK_NE], ['TRACK_NW', T.TRACK_NW],
  ['TRACK_SE', T.TRACK_SE], ['TRACK_SW', T.TRACK_SW],
];

const BW = 6, BH = 4;
const shoot = async (name, scale) => {
  const cv = document.createElement('canvas');
  const cw = BW * cell * scale + 8;
  const ch = BH * cell * scale + 18;
  const cols = 6;
  cv.width = cols * cw;
  cv.height = Math.ceil(SHOW.length / cols) * ch;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#74d24d';
  c.fillRect(0, 0, cv.width, cv.height);
  c.font = '10px monospace';
  SHOW.forEach(([label, id], i) => {
    const ox = (i % cols) * cw + 4;
    const oy = Math.floor(i / cols) * ch + 14;
    for (let y = 0; y < BH; y++) {
      for (let x = 0; x < BW; x++) {
        const r = set.srcFor(id, x, y);
        c.drawImage(set.canvas, r.x, r.y, cell, cell,
          ox + x * cell * scale, oy + y * cell * scale, cell * scale, cell * scale);
      }
    }
    c.fillStyle = '#20242e';
    c.fillRect(ox - 4, oy - 14, cw, 13);
    c.fillStyle = '#fff';
    c.fillText(label, ox, oy - 3);
  });
  const res = await fetch('/__shot/' + name, { method: 'POST', body: cv.toDataURL('image/png') });
  return res.text();
};

const out = [];
out.push(await shoot('r7t-1x', 1));
out.push(await shoot('r7t-3x', 3));
return { out };
