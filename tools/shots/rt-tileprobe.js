// Tile probe: the pieces Route 1 and Route 2 get built out of, side by side at 4x.
const d = window.dev;
const ts = await import('/build/js/gfx/tileset.js');
const set = new ts.Tileset('kinbound-tiles');
const cell = ts.TILE_PX;
const px = ts.TILE_SIZE;
const T = ts.T;

await d.loadWait(600);

const G = T.GRASS, g = T.GRASS_TUFT, F = T.GRASS_FLOWERS, W = T.TALL_GRASS;
const P = T.PATH, S = T.SAND, w = T.WATER, B = T.BRIDGE;
const TR = T.TREE, tr = T.TREE_SMALL, R = T.ROCK, O = T.BOULDER;

const BLOCKS = [
  ['fences', [
    [G, T.FENCE_H, T.FENCE_H, T.FENCE_H, T.FENCE_H, G],
    [G, T.FENCE_V, G, G, T.FENCE_V, G],
    [G, T.FENCE_V, W, W, T.FENCE_V, G],
    [G, T.FENCE_H, T.FENCE_H, T.FENCE_H, T.FENCE_H, G],
  ]],
  ['creek + crossing', [
    [G, G, g, G, G, G],
    [S, S, S, S, S, S],
    [w, w, w, B, w, w],
    [S, S, S, S, S, S],
  ]],
  ['creek, no sand', [
    [G, G, g, G, G, G],
    [w, w, w, B, w, w],
    [G, G, g, G, G, G],
    [G, F, G, G, g, G],
  ]],
  ['path through meadow', [
    [G, W, W, P, G, g],
    [g, W, W, P, G, G],
    [G, W, F, P, P, P],
    [G, G, G, P, G, G],
  ]],
  ['sand shore of a pond', [
    [G, S, S, S, S, G],
    [S, S, w, w, S, S],
    [S, w, w, w, w, S],
    [G, S, S, S, S, G],
  ]],
  ['forest floor, dense', [
    [TR, tr, G, TR, TR, tr],
    [TR, G, g, G, tr, TR],
    [tr, G, R, G, G, TR],
    [TR, TR, G, tr, TR, TR],
  ]],
  ['stone ruin front', [
    [T.CLIFF_TOP, T.CLIFF_TOP, T.CLIFF_TOP, T.CLIFF_TOP, T.CLIFF_TOP, T.CLIFF_TOP],
    [T.CLIFF_FACE, T.CLIFF_FACE, T.STONE_FLOOR, T.STONE_FLOOR, T.CLIFF_FACE, T.CLIFF_FACE],
    [T.STONE_FLOOR, T.STONE_FLOOR, T.STONE_FLOOR, T.STONE_FLOOR, T.STONE_FLOOR, T.STONE_FLOOR],
    [G, T.STONE_FLOOR, T.STONE_FLOOR, T.STONE_FLOOR, T.STONE_FLOOR, G],
  ]],
  ['cave mouth in a cliff', [
    [T.CLIFF_TOP, T.CLIFF_TOP, T.CLIFF_TOP, T.CLIFF_TOP, T.CLIFF_TOP, T.CLIFF_TOP],
    [T.CLIFF_FACE, T.CLIFF_FACE, T.DOOR, T.CLIFF_FACE, T.CLIFF_FACE, T.CLIFF_FACE],
    [G, G, G, G, R, G],
    [G, g, G, G, G, G],
  ]],
  ['puddles + flowers', [
    [G, T.PUDDLE, G, F, G, g],
    [T.PUDDLE, T.PUDDLE, G, G, F, G],
    [G, G, g, G, G, T.PUDDLE],
    [G, F, G, T.PUDDLE, G, G],
  ]],
  ['lamp, bed, sign', [
    [G, T.LAMP_POST, G, T.FLOWER_BED, G, T.SIGN],
    [G, G, G, G, G, G],
    [P, P, P, P, P, P],
    [G, G, G, G, G, G],
  ]],
  ['boulder on grass vs path', [
    [G, O, G, P, O, P],
    [G, R, G, P, R, P],
    [G, G, G, P, P, P],
    [G, G, G, P, P, P],
  ]],
  ['stone floor slab, small', [
    [G, G, G, G, G, G],
    [G, T.STONE_FLOOR, T.STONE_FLOOR, T.STONE_FLOOR, G, G],
    [G, T.STONE_FLOOR, T.PLATE, T.STONE_FLOOR, G, G],
    [G, G, G, G, G, G],
  ]],
];

const COLS = 4;
const SCALE = 4;
const GW = 6, GH = 4;
const bw = GW * px, bh = GH * px;
const gap = 10;
const rows = Math.ceil(BLOCKS.length / COLS);
const cv = document.createElement('canvas');
cv.width = (COLS * (bw + gap) + gap) * SCALE;
cv.height = (rows * (bh + gap + 10) + gap) * SCALE;
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
c.fillStyle = '#101014';
c.fillRect(0, 0, cv.width, cv.height);
c.scale(SCALE, SCALE);
c.imageSmoothingEnabled = false;

BLOCKS.forEach((b, i) => {
  const cx = gap + (i % COLS) * (bw + gap);
  const cy = gap + Math.floor(i / COLS) * (bh + gap + 10);
  const grid = b[1];
  for (let ty = 0; ty < grid.length; ty++) {
    for (let tx = 0; tx < grid[ty].length; tx++) {
      const t = grid[ty][tx];
      if (!t) continue;
      const s = set.srcFor(t, tx, ty);
      c.drawImage(set.canvas, s.x, s.y, cell, cell, cx + tx * px, cy + ty * px, px, px);
    }
  }
  c.fillStyle = '#ffffff';
  c.font = '7px monospace';
  c.fillText(b[0], cx, cy + bh + 8);
});

const url = cv.toDataURL('image/png');
const res = await fetch('/__shot/' + encodeURIComponent('rt-tileprobe'), { method: 'POST', body: url });
return await res.text();
