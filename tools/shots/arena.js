/*
 * Arena driver.
 *
 * src/gfx/arena.ts cannot be seen in a real battle without editing battle.ts,
 * so this stands the arena up on its own and puts REAL creature sprites on it
 * at the real battle coordinates -- a backdrop only has to work behind a
 * creature, and judging one in isolation is how you ship a field that fights
 * the sprite standing on it.
 *
 * It also stencils the furniture that covers the field: the two HP panels and
 * the message box. Detail spent under those is detail nobody sees.
 *
 *   npx electron tools/capture.cjs tools/shots/arena.js
 */
const d = window.dev;
const r = d.game.renderer;

await d.loadWait(900);

const arena = await import('/build/js/gfx/arena.js');
const kinsprite = await import('/build/js/gfx/kinsprite.js');
const { DETAIL } = await import('/build/js/engine/renderer.js');

arena.clearArenaCache();

// The real numbers from src/scenes/battle.ts.
const FOE_SPRITE = { x: 158, y: 2 };
const PLAYER_SPRITE = { x: 14, y: 40 };
const FOE_BOX = { x: 6, y: 10, w: 100, h: 28 };
const PLAYER_BOX = { x: 134, y: 68, w: 100, h: 36 };
const MSG = { x: 0, y: 114, w: 240, h: 46 };

const post = async (name) => {
  const url = r.buffer.toDataURL('image/png');
  const res = await fetch('/__shot/' + encodeURIComponent(name), { method: 'POST', body: url });
  return res.text();
};

/** Same crop as a real zoom-in, so fine texture can be judged. */
const postZoom = async (name, x, y, w, h, scale) => {
  const cv = document.createElement('canvas');
  cv.width = w * DETAIL * scale;
  cv.height = h * DETAIL * scale;
  const cx = cv.getContext('2d');
  cx.imageSmoothingEnabled = false;
  cx.drawImage(r.buffer, x * DETAIL, y * DETAIL, w * DETAIL, h * DETAIL, 0, 0, cv.width, cv.height);
  const url = cv.toDataURL('image/png');
  await fetch('/__shot/' + encodeURIComponent(name), { method: 'POST', body: url });
};

function furniture() {
  const box = (b) => {
    r.rect(b.x, b.y, b.w, b.h, 'rgba(244,246,251,0.92)');
    r.outline(b.x, b.y, b.w, b.h, '#232a3d');
  };
  box(FOE_BOX);
  box(PLAYER_BOX);
  r.rect(MSG.x, MSG.y, MSG.w, MSG.h, '#f4f6fb');
  r.outline(MSG.x, MSG.y, MSG.w, MSG.h, '#232a3d');
}

function frame(kind, ticks, opts = {}) {
  r.beginFrame();
  r.clear('#000000');
  arena.drawArena(r, kind, ticks, { pads: false });
  arena.drawPads(r, kind);
  if (opts.kin !== false) {
    r.image(kinsprite.frontSprite(opts.foe || 'nibbet'), FOE_SPRITE.x, FOE_SPRITE.y);
    r.image(kinsprite.backSprite(opts.you || 'cinderpaw'), PLAYER_SPRITE.x, PLAYER_SPRITE.y);
  }
  if (opts.hud !== false) furniture();
}

const kinds = ['highland', 'coast', 'quarry', 'cave', 'indoor'];
const out = [];

for (const kind of kinds) {
  frame(kind, 40);
  await post('ar-' + kind);
  out.push(kind);
}

// Highland gets the most looks: bare field, field with creatures only, and a
// zoom on each pad.
frame('highland', 40, { kin: false, hud: false });
await post('ar-highland-bare');

frame('highland', 40, { hud: false });
await post('ar-highland-kin');

frame('highland', 40);
await postZoom('ar-zoom-player', 0, 78, 110, 36, 3);
await postZoom('ar-zoom-foe', 140, 40, 100, 36, 3);
await postZoom('ar-zoom-sky', 96, 0, 100, 60, 3);

// A drawn species on both sides, since drawn art only fills the lower frame.
frame('highland', 40, { foe: 'cinderpaw', you: 'sprigling' });
await post('ar-highland-drawn');

// Motion, sampled at intervals, to confirm nothing jumps or strobes.
for (const t of [0, 120, 400, 900]) {
  frame('coast', t);
  await post('ar-coast-t' + t);
  frame('highland', t);
  await post('ar-highland-t' + t);
}

// Fine motion on the cave, whose drip is the fastest thing on any field.
for (const t of [0, 20, 40, 50, 55]) {
  frame('cave', t);
  await postZoom('ar-cave-drip-t' + t, 120, 20, 70, 74, 3);
}

// No pads at all, which is how battle.ts will call drawArena if it keeps its
// own pads inside the shake group. Nothing may look broken in that mode.
r.beginFrame();
r.clear('#000000');
arena.drawArena(r, 'highland', 40, { pads: false });
await post('ar-highland-nopads');

return { out, pads: [arena.FOE_PAD, arena.PLAYER_PAD] };
