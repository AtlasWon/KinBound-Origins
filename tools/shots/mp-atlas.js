// Whole-map atlas: renders an entire map's ground+overlay layers into one
// image, with NPCs, items, warps and signs marked, so a route can be judged as
// a SHAPE rather than through a 15x10 keyhole. Judgement of the *picture* still
// happens at 1x in the game; this is the plan view that tells you whether the
// plan is any good.
const d = window.dev;
const ts = await import('/build/js/gfx/tileset.js');
const set = new ts.Tileset('kinbound-tiles');
const cell = ts.TILE_PX;              // source cell in buffer px
const DETAIL = cell / ts.TILE_SIZE;

const top = () => d.game.scenes.top;
await d.loadWait(1200);
d.key('Enter', 20); await d.loadWait(400);
d.key('Enter', 20); await d.loadWait(600);
const state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;

const MAPS = (window.__atlasMaps || ['route_1', 'route_2', 'route_3', 'route_4']);
const out = [];

for (const id of MAPS) {
  const sc = new Overworld(state, id, 1, 1, 'down');
  d.game.scenes.replaceAll(sc);
  await d.loadWait(1100);
  const map = sc.map;
  const W = map.width, H = map.height, px = ts.TILE_SIZE;

  const cv = document.createElement('canvas');
  cv.width = W * px; cv.height = H * px;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#000'; c.fillRect(0, 0, cv.width, cv.height);

  const blit = (arr) => {
    for (let ty = 0; ty < H; ty++) {
      for (let tx = 0; tx < W; tx++) {
        const t = arr[ty * W + tx];
        if (!t) continue;
        const s = set.srcFor(t, tx, ty);
        c.drawImage(set.canvas, s.x, s.y, cell, cell, tx * px, ty * px, px, px);
      }
    }
  };
  blit(map.ground);
  blit(map.over);

  // Markers.
  const dot = (x, y, col, ch) => {
    c.fillStyle = col;
    c.fillRect(x * px + 3, y * px + 3, px - 6, px - 6);
    c.fillStyle = '#000';
    c.font = 'bold 9px monospace';
    c.fillText(ch, x * px + 5, y * px + 12);
  };
  for (const w of map.warps ?? []) dot(w.x, w.y, '#ff44ff', 'W');
  for (const o of map.objects ?? []) {
    const k = o.kind;
    dot(o.x, o.y, k === 'item' ? '#ffe14a' : k === 'hiddenItem' ? '#8a7a20'
      : k === 'sign' ? '#c9c9c9' : '#7ad0ff',
      k === 'item' ? 'i' : k === 'hiddenItem' ? 'h' : k === 'sign' ? 's' : '?');
  }
  for (const n of map.npcs ?? []) dot(n.x, n.y, n.trainer ? '#ff4a4a' : '#4aff7a', n.trainer ? 'T' : 'n');

  const url = cv.toDataURL('image/png');
  const res = await fetch('/__shot/' + encodeURIComponent('mp-atlas-' + id), { method: 'POST', body: url });
  out.push(id + ' ' + W + 'x' + H + ' -> ' + (await res.text()));
}
return { out };
