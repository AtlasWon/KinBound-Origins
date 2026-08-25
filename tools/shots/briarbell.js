// Briarbell, looked at.
//
// A plan view of the town and of the Hall, then the great bell tree at 1x from
// the four places a player really sees it from: the road going north, the
// square to the south, under the boughs among the bells, and the plaza corner.
// The tree is nine rows tall on a screen that is ten rows tall, so the only way
// to know whether it reads as a tree is to stand where the camera stands.
//
//   npx electron tools/capture.cjs tools/shots/briarbell.js

const d = window.dev;
const ts = await import('/build/js/gfx/tileset.js');
const set = new ts.Tileset('kinbound-tiles');
const cell = ts.TILE_PX;
const out = [];

const top = () => d.game.scenes.top;
await d.loadWait(1200);
d.key('Enter', 20); await d.loadWait(400);
d.key('Enter', 20); await d.loadWait(600);
const state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;

/* ----------------------------------------------------- plan views */

for (const id of ['briarbell', 'briarbell_hall']) {
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
    for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
      const t = arr[ty * W + tx];
      if (!t) continue;
      const s = set.srcFor(t, tx, ty);
      c.drawImage(set.canvas, s.x, s.y, cell, cell, tx * px, ty * px, px, px);
    }
  };
  blit(map.ground); blit(map.over);
  const res = await fetch('/__shot/' + encodeURIComponent('bb-plan-' + id), {
    method: 'POST', body: cv.toDataURL('image/png'),
  });
  out.push('plan ' + id + ' ' + W + 'x' + H + ' -> ' + (await res.text()));
}

/* --------------------------------------------- the tree, in the game */

const STANDS = [
  ['road-south', 'briarbell', 15, 26, 'up'],
  ['road-beside', 'briarbell', 15, 21, 'right'],
  ['square', 'briarbell', 22, 27, 'up'],
  ['under-boughs', 'briarbell', 22, 21, 'up'],
  ['plaza-east', 'briarbell', 29, 20, 'left'],
  ['bells-close', 'briarbell', 19, 20, 'up'],
  ['hall-front', 'briarbell', 23, 11, 'up'],
  ['high-street', 'briarbell', 8, 10, 'up'],
  ['market', 'briarbell', 8, 22, 'up'],
  ['south-gate', 'briarbell', 15, 33, 'up'],
  ['glasshouse', 'briarbell', 7, 27, 'up'],
  ['hall-inside', 'briarbell_hall', 8, 13, 'up'],
  ['hall-plates', 'briarbell_hall', 8, 7, 'up'],
];

for (const [name, map, x, y, facing] of STANDS) {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing));
  await d.loadWait(900);
  await d.shoot('bb-' + name, 6, 1);
  out.push(name + ' @ ' + (d.probe().map || '?') + ' ' + (d.probe().pos || '?'));
}

// The bells swing on a four-frame loop; catch each frame so a still can be
// judged for whether the pendulum reads as a pendulum.
for (let i = 0; i < 4; i++) {
  await d.shoot('bb-bell-frame-' + i, 12, 3);
}

return { out };
