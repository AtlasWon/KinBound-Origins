// The wetland and Mirehaven tiles, laid out as material swatches rather than
// as an atlas dump: each new tile is drawn as a 4x4 block of itself so the
// question "does this tile?" can actually be answered, with the animated ones
// shown as their four frames in a row underneath.
const d = window.dev;
await d.loadWait(1000);
const ts = await import('/build/js/gfx/tileset.js');
const set = new ts.Tileset('kinbound-tiles');
const cell = ts.TILE_PX;
const T = ts.T;

const NEW = [
  'MIRE_MUD', 'MIRE_WATER', 'REEDS', 'SEDGE', 'BOARDWALK', 'BOARD_RAIL',
  'MANGROVE', 'GLOWCAP', 'STILT_POST', 'MOORED_BOAT', 'LAMP_MIRE',
  'ROOF_THATCH_L', 'ROOF_THATCH', 'ROOF_THATCH_R',
  'WALL_TAR', 'WALL_TAR_WINDOW', 'WALL_TAR_PLANT', 'DOOR_TAR',
];

const N = 4;                 // tiles per swatch edge
const scale = Number(window.__mireScale || 2);
const sw = cell * N * scale;
const pad = 10;
const cols = 6;
const rows = Math.ceil(NEW.length / cols);

const cv = document.createElement('canvas');
cv.width = cols * (sw + pad) + pad;
cv.height = rows * (sw + pad + 12) + pad;
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
c.fillStyle = '#151820';
c.fillRect(0, 0, cv.width, cv.height);

NEW.forEach((name, i) => {
  const id = T[name];
  const ox = pad + (i % cols) * (sw + pad);
  const oy = pad + Math.floor(i / cols) * (sw + pad + 12);
  for (let ty = 0; ty < N; ty++) {
    for (let tx = 0; tx < N; tx++) {
      const s = set.srcFor(id, tx + i * 3, ty + i * 5);
      c.drawImage(set.canvas, s.x, s.y, cell, cell,
        ox + tx * cell * scale, oy + ty * cell * scale, cell * scale, cell * scale);
    }
  }
  c.fillStyle = '#9aa6c2';
  c.font = '10px monospace';
  c.fillText(name, ox, oy + sw + 10);
});

const res = await fetch('/__shot/' + encodeURIComponent(window.__mireShot || 'mire-tiles'),
  { method: 'POST', body: cv.toDataURL('image/png') });
return { path: await res.text() };
