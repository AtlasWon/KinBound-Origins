// Scratch probe: the mountain-road tile family, laid out as it is actually
// used rather than as an atlas dump. Left panel is Route 8's snow, right is
// Skyreach's rock and rope.

const d = window.dev;
await d.loadWait(1000);
const ts = await import('/build/js/gfx/tileset.js');

// Frostmere's family is being written in another window as this runs, and a
// half-declared tile id throws out of the atlas builder. Stub anything missing
// so this probe can photograph the tiles it is actually about.
for (const m of ['frostWall', 'shingleSnowRoof', 'roofStack', 'blueLantern',
  'woodpile', 'iceStack', 'firepot', 'cisternIce']) {
  if (typeof ts.Tileset.prototype[m] !== 'function') {
    ts.Tileset.prototype[m] = function stub(px, fill) { if (fill) fill('#ff00ff'); };
  }
}

const set = new ts.Tileset('kinbound-tiles');
const cell = ts.TILE_PX;
const S = 3;
const names = Object.keys(ts.T).filter((k) => Number.isNaN(Number(k)));

// Two little maps, drawn straight from the atlas by tile id.
const T = ts.T;
const A = [
  [T.SNOW, T.SNOW, T.SNOW_DEEP, T.SNOW, T.PINE, T.PINE_SNOW, T.SNOW, T.SNOW_SCRUB],
  [T.SNOW, T.SNOW_ROAD, T.SNOW_ROAD, T.SNOW, T.SNOW, T.PINE, T.SNOW_SCRUB, T.SNOW_SCRUB],
  [T.SNOW_DEEP, T.SNOW_ROAD, T.SNOW_ROAD, T.SNOW_ROCK, T.SNOW, T.SNOW, T.SNOW, T.SNOW],
  [T.SNOW, T.SNOW_ROAD, T.SNOW_ROAD, T.SNOW, T.CAIRN, T.SNOW, T.SNOW_LEDGE, T.SNOW_LEDGE],
  [T.SCREE, T.SCREE, T.SNOW_ROAD, T.SNOW, T.SNOW, T.SNOW, T.SNOW, T.SNOW],
  [T.LAKE_ICE, T.LAKE_ICE, T.ICE_CRACK, T.LAKE_ICE, T.LAKE_ICE, T.LAKE_ICE, T.SNOW, T.SNOW],
];
const B = [
  [T.WIND_TUSSOCK, T.WIND_TUSSOCK, T.SCREE, T.SCREE, T.CLIFF_TOP, T.WATERFALL, T.CLIFF_TOP, T.SCREE],
  [T.SCREE, T.SCREE, T.SCREE, T.ROPE_POST, T.GORGE, T.WATERFALL, T.GORGE, T.SCREE],
  [T.SCREE, T.CAIRN, T.SCREE, T.ROPE_DECK, T.ROPE_DECK, T.ROPE_DECK, T.ROPE_DECK, T.ROPE_POST],
  [T.SCREE, T.SCREE, T.SCREE, T.ROPE_POST, T.GORGE, T.GORGE, T.GORGE, T.SCREE],
  [T.WIND_TUSSOCK, T.SCREE, T.SNOW_ROCK, T.SCREE, T.GORGE, T.GORGE, T.GORGE, T.WIND_TUSSOCK],
];

const cv = document.createElement('canvas');
cv.width = 8 * cell * S * 2 + 40;
cv.height = 6 * cell * S + 220;
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
c.fillStyle = '#20242e';
c.fillRect(0, 0, cv.width, cv.height);

const draw = (grid, ox, oy) => {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const src = set.src(grid[y][x]);
      c.drawImage(set.canvas, src.x, src.y, cell, cell,
        ox + x * cell * S, oy + y * cell * S, cell * S, cell * S);
    }
  }
};
draw(A, 10, 10);
draw(B, 8 * cell * S + 30, 10);

// And every cell of the family on its own, labelled, so a bad one is findable.
let i = 0;
for (let id = T.SNOW; id <= T.WATERFALL; id++) {
  const dx = 10 + (i % 12) * (cell * 2 + 6);
  const dy = 6 * cell * S + 30 + Math.floor(i / 12) * (cell * 2 + 18);
  const src = set.src(id);
  c.drawImage(set.canvas, src.x, src.y, cell, cell, dx, dy, cell * 2, cell * 2);
  c.fillStyle = '#9aa6c2';
  c.font = '10px monospace';
  c.fillText(names[id] || String(id), dx, dy + cell * 2 + 11);
  i++;
}

const res = await fetch('/__shot/alpine-tiles', { method: 'POST', body: cv.toDataURL('image/png') });
return { path: await res.text() };
