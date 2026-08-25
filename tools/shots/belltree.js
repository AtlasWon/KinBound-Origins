// The great-tree tiles, laid out and blown up.
// Judging a nineteen-tile landmark from a screenshot of a town is hopeless;
// this prints the atlas cells themselves, and then the assembled tree.
const d = window.dev;
const ts = await import('/build/js/gfx/tileset.js');
const T = ts.T;
const set = new ts.Tileset('kinbound-tiles');
const cell = ts.TILE_PX;
await d.loadWait(400);

const SHAPE = [
  "    '''''    ",
  "  '''''''''  ",
  " ''''''''''' ",
  "'''''''''''''",
  "'''''''''''''",
  "` ` `{{{` ` `",
  "     {{{     ",
  "     {{{     ",
  "    }}}}}    ",
];

// Resolve the nine-slice exactly the way TileMap does, so this is the picture
// the game builds and not a hand-made approximation of it.
const W = 13, H = SHAPE.length;
const ch = (x, y) => (SHAPE[y] ?? '')[x] ?? ' ';
const leaf = (x, y) => ch(x, y) === "'";
const trunk = (x, y) => ch(x, y) === '{';
const root = (x, y) => ch(x, y) === '}';
const LEAF = [
  [T.GREAT_LEAF_NW, T.GREAT_LEAF_N, T.GREAT_LEAF_NE],
  [T.GREAT_LEAF_W, T.GREAT_LEAF_C, T.GREAT_LEAF_E],
  [T.GREAT_LEAF_SW, T.GREAT_LEAF_S, T.GREAT_LEAF_SE],
];
const span = (f, x, y) => ((f(x - 1, y) ? 1 : 0) + (f(x + 1, y) ? 1 : 0) === 2 ? 1 : f(x - 1, y) ? 2 : 0);

const scale = 4;
const cv = document.createElement('canvas');
cv.width = W * cell * scale; cv.height = (H + 1) * cell * scale;
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
c.fillStyle = '#8ede62'; c.fillRect(0, 0, cv.width, cv.height);

for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  let id = 0;
  if (leaf(x, y)) {
    if (trunk(x, y + 1)) id = [T.GREAT_BOLE_L, T.GREAT_BOLE_C, T.GREAT_BOLE_R][span(trunk, x, y + 1)];
    else {
      const col = leaf(x - 1, y) ? (leaf(x + 1, y) ? 1 : 2) : 0;
      const row = leaf(x, y - 1) ? (leaf(x, y + 1) ? 1 : 2) : 0;
      id = LEAF[row][col];
    }
  } else if (ch(x, y) === '`') id = T.GREAT_BELL;
  else if (trunk(x, y)) id = [T.GREAT_TRUNK_L, T.GREAT_TRUNK_C, T.GREAT_TRUNK_R][span(trunk, x, y)];
  else if (root(x, y)) id = [T.GREAT_ROOT_L, T.GREAT_ROOT_C, T.GREAT_ROOT_R][span(root, x, y)];
  if (!id) continue;
  const s = set.srcFor(id, x, y);
  c.drawImage(set.canvas, s.x, s.y, cell, cell, x * cell * scale, y * cell * scale, cell * scale, cell * scale);
}

const res = await fetch('/__shot/belltree', {
  method: 'POST', body: cv.toDataURL('image/png'),
});
return { out: [await res.text()] };
