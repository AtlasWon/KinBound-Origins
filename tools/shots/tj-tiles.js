// Tile-judge: the tiles this pass touches, drawn as they tile, at 1x and 4x.
// A single blown-up cell hides the one thing that matters for grass and walls:
// what a block of them does when they meet.
const d = window.dev;
await d.loadWait(900);
const ts = await import('/build/js/gfx/tileset.js');
const set = new ts.Tileset('kinbound-tiles');
const cell = ts.TILE_PX;          // 32 buffer px = 16 logical units
const DETAIL = 2;

// Each group: a label and a 2D array of tile names laid out as a small map.
const G = 'GRASS', X = 'TALL_GRASS';
const groups = [
  ['tallgrass', [
    [G, G, G, G, G, G, G, G],
    [G, X, X, X, X, X, X, G],
    [G, X, X, X, X, X, X, G],
    [G, X, X, X, X, X, X, G],
    [G, G, X, X, X, X, G, G],
    [G, G, G, X, X, G, G, G],
    [G, G, G, G, G, G, G, G],
    [G, G, G, G, G, G, G, G],
  ]],
  ['door-in-wall', [
    ['WALL_INTERIOR', 'WALL_INTERIOR', 'WALL_INTERIOR', 'WALL_INTERIOR'],
    ['FLOOR_WOOD', 'FLOOR_WOOD', 'FLOOR_WOOD', 'FLOOR_WOOD'],
    ['FLOOR_WOOD', 'DOOR', 'FLOOR_WOOD', 'FLOOR_WOOD'],
    ['WALL_INTERIOR', 'WALL_INTERIOR', 'WALL_INTERIOR', 'WALL_INTERIOR'],
  ]],
  ['door-in-run', [
    ['FLOOR_WOOD', 'FLOOR_WOOD', 'FLOOR_WOOD', 'FLOOR_WOOD'],
    ['FLOOR_WOOD', 'FLOOR_WOOD', 'FLOOR_WOOD', 'FLOOR_WOOD'],
    ['WALL_INTERIOR', 'DOOR', 'WALL_INTERIOR', 'WALL_INTERIOR'],
    ['WALL_INTERIOR', 'WALL_INTERIOR', 'WALL_INTERIOR', 'WALL_INTERIOR'],
  ]],
  ['stairs', [
    ['WALL_INTERIOR', 'WALL_INTERIOR', 'WALL_INTERIOR', 'WALL_INTERIOR'],
    ['FLOOR_WOOD', 'STAIRS', 'FLOOR_WOOD', 'FLOOR_WOOD'],
    ['FLOOR_WOOD', 'FLOOR_WOOD', 'FLOOR_WOOD', 'FLOOR_WOOD'],
    ['FLOOR_WOOD', 'FLOOR_WOOD', 'FLOOR_WOOD', 'FLOOR_WOOD'],
  ]],
  ['edge-trees', [
    ['TREE', 'TREE', 'TREE', 'TREE'],
    ['TREE', 'GRASS', 'GRASS', 'TREE'],
    ['TREE', 'GRASS', 'GRASS', 'TREE'],
    ['TREE', 'TREE', 'TREE', 'TREE'],
  ]],
  ['edge-cliff', [
    ['CLIFF_TOP', 'CLIFF_TOP', 'CLIFF_TOP', 'CLIFF_TOP'],
    ['CLIFF_FACE', 'GRASS', 'GRASS', 'CLIFF_FACE'],
    ['CLIFF_FACE', 'GRASS', 'GRASS', 'CLIFF_FACE'],
    ['CLIFF_FACE', 'CLIFF_FACE', 'CLIFF_FACE', 'CLIFF_FACE'],
  ]],
];

async function draw(scale, name) {
  const span = Math.max(...groups.map((g) => Math.max(g[1].length, g[1][0].length)));
  const gw = span * cell * scale / DETAIL;
  const pad = 8;
  const cv = document.createElement('canvas');
  cv.width = groups.length * (gw + pad) + pad;
  cv.height = gw + pad * 2 + 12;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#20242e';
  c.fillRect(0, 0, cv.width, cv.height);
  groups.forEach((g, gi) => {
    const ox = pad + gi * (gw + pad);
    g[1].forEach((row, ry) => {
      row.forEach((nm, rx) => {
        const id = ts.T[nm];
        // Use srcFor so varied tiles show their alternates, as the map does.
        const s = set.srcFor(id, rx, ry);
        const step = cell * scale / DETAIL;
        c.drawImage(set.canvas, s.x, s.y, cell, cell,
          ox + rx * step, pad + ry * step, step, step);
      });
    });
    c.fillStyle = '#9aa6c2';
    c.font = '10px monospace';
    c.fillText(g[0], ox, cv.height - 4);
  });
  const res = await fetch('/__shot/' + name, { method: 'POST', body: cv.toDataURL('image/png') });
  return res.text();
}

const a = await draw(1, 'tj-tiles-1x');
const b = await draw(4, 'tj-tiles-4x');
return { a, b };
