// A close look at a handful of tiles, laid out 3x3 so each one is seen beside
// copies of itself -- which is the only way to tell a texture from a stamp.
// Supplement to a map render, never a substitute: judgement is still at 1x.

const d = window.dev;
await d.loadWait(1000);
const ts = await import('/build/js/gfx/tileset.js');
const T = ts.T;

const set = new ts.Tileset('kinbound-tiles');
const cell = ts.TILE_PX;
const scale = 3;
const rep = 3;                       // tiles per side of each block
const want = [
  ['GRASS', T.GRASS], ['GRASS_TUFT', T.GRASS_TUFT], ['GRASS_FLOWERS', T.GRASS_FLOWERS],
  ['TALL_GRASS', T.TALL_GRASS], ['PATH', T.PATH], ['SAND', T.SAND],
  ['WATER', T.WATER], ['WATER_DEEP', T.WATER_DEEP], ['STONE_FLOOR', T.STONE_FLOOR],
  ['CLIFF_FACE', T.CLIFF_FACE], ['CLIFF_TOP', T.CLIFF_TOP], ['LEDGE', T.LEDGE],
  ['TREE', T.TREE], ['TREE_SMALL', T.TREE_SMALL], ['BRAMBLE', T.BRAMBLE],
  ['ROOF', T.ROOF], ['ROOF_SLATE', T.ROOF_SLATE], ['WALL_PLASTER', T.WALL_PLASTER],
  ['WALL_TIMBER', T.WALL_TIMBER], ['WALL_BRICK', T.WALL_BRICK], ['FLOOR_WOOD', T.FLOOR_WOOD],
  ['FLOOR_RUG', T.FLOOR_RUG], ['WALL_INTERIOR', T.WALL_INTERIOR], ['CIVIC_FLOOR', T.CIVIC_FLOOR],
];

const block = cell * rep * scale;
const cols = 6;
const rows = Math.ceil(want.length / cols);
const cv = document.createElement('canvas');
cv.width = cols * (block + 8);
cv.height = rows * (block + 18);
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
c.fillStyle = '#20242e';
c.fillRect(0, 0, cv.width, cv.height);

want.forEach(([name, id], i) => {
  const bx = (i % cols) * (block + 8) + 4;
  const by = Math.floor(i / cols) * (block + 18) + 4;
  for (let ty = 0; ty < rep; ty++) {
    for (let tx = 0; tx < rep; tx++) {
      const s = set.srcFor(id, tx, ty);
      c.drawImage(set.canvas, s.x, s.y, cell, cell,
        bx + tx * cell * scale, by + ty * cell * scale, cell * scale, cell * scale);
    }
  }
  c.fillStyle = '#9aa6c2';
  c.font = '10px monospace';
  c.fillText(name, bx, by + block + 12);
});

const res = await fetch('/__shot/tile-zoom', { method: 'POST', body: cv.toDataURL('image/png') });
return { path: await res.text() };
