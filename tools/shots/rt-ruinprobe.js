// Which floor reads as a floor against a rock wall? The ruin's first draft had
// cliff face and stone paving side by side and they are the same grey.
const d = window.dev;
const ts = await import('/build/js/gfx/tileset.js');
const set = new ts.Tileset('kinbound-tiles');
const cell = ts.TILE_PX;
const px = ts.TILE_SIZE;
const T = ts.T;

await d.loadWait(600);

const COMBOS = [
  ['wall C / floor STONE_FLOOR', T.CLIFF_FACE, T.STONE_FLOOR],
  ['wall C / floor CIVIC_FLOOR', T.CLIFF_FACE, T.CIVIC_FLOOR],
  ['wall C / floor FLOOR_LAB', T.CLIFF_FACE, T.FLOOR_LAB],
  ['wall C / floor SAND', T.CLIFF_FACE, T.SAND],
  ['wall WALL_INTERIOR / STONE', T.WALL_INTERIOR, T.STONE_FLOOR],
  ['wall CIVIC_WALL / CIVIC_FLOOR', T.CIVIC_WALL, T.CIVIC_FLOOR],
  ['wall C / floor PATH', T.CLIFF_FACE, T.PATH],
  ['wall WALL_PLASTER / CIVIC', T.WALL_PLASTER, T.CIVIC_FLOOR],
];

const GW = 7, GH = 6, SCALE = 4, COLS = 4, gap = 10;
const bw = GW * px, bh = GH * px;
const rowsN = Math.ceil(COMBOS.length / COLS);
const cv = document.createElement('canvas');
cv.width = (COLS * (bw + gap) + gap) * SCALE;
cv.height = (rowsN * (bh + gap + 10) + gap) * SCALE;
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
c.fillStyle = '#101014';
c.fillRect(0, 0, cv.width, cv.height);
c.scale(SCALE, SCALE);
c.imageSmoothingEnabled = false;

COMBOS.forEach((combo, i) => {
  const [label, wall, floor] = combo;
  const cx = gap + (i % COLS) * (bw + gap);
  const cy = gap + Math.floor(i / COLS) * (bh + gap + 10);
  for (let ty = 0; ty < GH; ty++) {
    for (let tx = 0; tx < GW; tx++) {
      const edge = tx === 0 || tx === GW - 1 || ty === 0 || ty === GH - 1;
      let t = edge ? wall : floor;
      if (!edge && ty === 2 && tx >= 2 && tx <= 4) t = T.WATER;
      if (!edge && ty === 4 && (tx === 1 || tx === GW - 2)) t = T.PLATE;
      const s = set.srcFor(t, tx, ty);
      c.drawImage(set.canvas, s.x, s.y, cell, cell, cx + tx * px, cy + ty * px, px, px);
    }
  }
  c.fillStyle = '#ffffff';
  c.font = '6px monospace';
  c.fillText(label, cx, cy + bh + 8);
});

const url = cv.toDataURL('image/png');
const res = await fetch('/__shot/' + encodeURIComponent('rt-ruinprobe'), { method: 'POST', body: url });
return await res.text();
