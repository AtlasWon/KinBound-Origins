// How deep the grass actually is, measured off the tile rather than guessed.
//
// GRASS_BLADE_TOP in src/world/tilemap.ts is the row inside the tall-grass tile
// at which the blades start being drawn in FRONT of whoever is standing there.
// On a continuous field the number is pure taste, because every row is equally
// solid; on a Ruby-style tile made of discrete clumps it is not, because the top
// rows are tips and air and a leg hidden behind those is still a visible leg.
//
// So this prints, for each of the sixteen authoring rows of the tile, how much
// of that row is blade rather than backdrop -- across all four variants the
// tileset cycles through, since the cut has to hold for every one of them. Pick
// the first row from which coverage stays above about 0.6 and that is the depth.
// It also shoots the player and two NPCs stood in it, at 1x and at 4x, so the
// number can be judged by eye immediately after being chosen by arithmetic.
//
//   npx electron tools/capture.cjs tools/shots/grassdepth.js

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
const clear = () => { for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10); };

await d.loadWait(1400);
d.key('Enter', 4); d.key('Enter', 30);
d.key('Enter', 60);
for (let i = 0; i < 30; i++) {
  if (typeof top().rows !== 'function') { d.key('Enter', 20); continue; }
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1400);
clear();

const state = top().state;
const Overworld = top().constructor;
const DETAIL = 2;
const TILE = 16;

const sc = await go('route_1', 6, 24, 'up');

async function go(map, x, y, facing) {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing));
  await d.loadWait(1400);
  clear();
  return top();
}

const { T } = await import('/build/js/gfx/tileset.js');
const tileset = sc.tileset;
const TALL = T.TALL_GRASS;

// Reference colour for "not a blade": the plain grass tile the patch sits on.
const cx = tileset.canvas.getContext('2d', { willReadFrequently: true });

const lum = (p, i) => 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];

// The lawn the patch is cut into, as a brightness to compare against.
const lawnSrc = tileset.srcFor(T.GRASS, 0, 0);
const lawnPx = cx.getImageData(lawnSrc.x, lawnSrc.y, TILE * DETAIL, TILE * DETAIL).data;
let lawn = 0;
for (let i = 0; i < lawnPx.length; i += 4) lawn += lum(lawnPx, i);
lawn /= lawnPx.length / 4;
out.push('lawn brightness ' + lawn.toFixed(1));

// Every variant the tileset hands out for tall grass, so the cut holds for all.
const prof = new Array(TILE).fill(0);
let seen = 0;
for (let vy = 0; vy < 4; vy++) {
  for (let vx = 0; vx < 4; vx++) {
    const s = tileset.srcFor(TALL, vx, vy);
    if (!s) continue;
    const px = cx.getImageData(s.x, s.y, TILE * DETAIL, TILE * DETAIL).data;
    for (let row = 0; row < TILE; row++) {
      let dark = 0, n = 0;
      for (let sub = 0; sub < DETAIL; sub++) {
        const y = row * DETAIL + sub;
        for (let x = 0; x < TILE * DETAIL; x++) {
          const i = (y * TILE * DETAIL + x) * 4;
          // A blade pixel is anything meaningfully darker or greener than the
          // lawn it would otherwise be standing on; air inside a clump is not.
          if (lum(px, i) < lawn - 6) dark++;
          n++;
        }
      }
      prof[row] += dark / n;
    }
    seen++;
  }
}
out.push('variants sampled: ' + seen);
out.push('row coverage: ' + prof.map((v, i) => i + ':' + (v / seen).toFixed(2)).join(' '));
const first = prof.findIndex((v, i) => prof.slice(i).every((w) => w / seen >= 0.6));
out.push('first row from which coverage stays >= 0.60: ' + first);

// And the eye check, at the size the player sees it.
sc.addNpcRuntime({ id: 'gd_a', sprite: 'girl', x: 6, y: 22, facing: 'down', movement: { kind: 'static' } });
sc.addNpcRuntime({ id: 'gd_b', sprite: 'boy', x: 9, y: 21, facing: 'down', movement: { kind: 'static' } });
d.tick(4);
await d.shoot('gd-scene-1x', 2, 1);

const CW = 40, CH = 40;
const cv = document.createElement('canvas');
cv.width = CW * 3 * 4; cv.height = CH * 4;
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
c.fillStyle = '#101418'; c.fillRect(0, 0, cv.width, cv.height);
const r = d.game.renderer;
const grab = (n, wx, wy) => {
  c.drawImage(r.buffer,
    Math.round((wx - r.camX - CW / 2) * DETAIL), Math.round((wy - r.camY - CH + 8) * DETAIL),
    CW * DETAIL, CH * DETAIL, n * CW * 4, 0, CW * 4, CH * 4);
};
const p = top().player;
grab(0, p.centerX, p.footY);
grab(1, 6 * 16 + 8, 22 * 16 + 15);
grab(2, 9 * 16 + 8, 21 * 16 + 15);
await fetch('/__shot/gd-bodies-4x', { method: 'POST', body: cv.toDataURL('image/png') });

return { out };
