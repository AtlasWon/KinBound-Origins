// Move-effect magnifier.
//
// fxlab photographs the whole 480x320 back buffer nine times over, which is the
// right sheet for judging an effect's shape and timing but far too small to
// judge whether an element is actually READABLE -- a five-pixel vine and a
// two-pixel vine look the same once the sheet has been scaled to fit.
//
// This plays one animation and blows up a window around the middle of the field
// with nearest-neighbour scaling, so the design grid stays visible. Judge shape
// on fxlab; judge legibility here, then go back and judge at 1x.
//
//   npx electron tools/capture.cjs tools/shots/fxzoom.js 5173 "dev=1&mute=1&fx=vine&frames=10,14,18"
const d = window.dev;
const top = () => d.game.scenes.top;

const Q = new URLSearchParams(location.search);
const ANIM = Q.get('fx') || 'vine';
const TYPE = Q.get('type') || '#5aa04a';
const FRAMES = (Q.get('frames') || '10,14,18,22').split(',').map(Number);
const ZOOM = Number(Q.get('zoom') || 3);
// The window, in logical units, of the arena that actually gets magnified.
const WX = Number(Q.get('wx') || 30), WY = Number(Q.get('wy') || 30);
const WW = Number(Q.get('ww') || 180), WH = Number(Q.get('wh') || 80);

await d.loadWait(1200);
d.key('Enter', 4); d.key('Enter', 30);
d.key('Enter', 60);
for (let i = 0; i < 30; i++) {
  // The title flow can still be settling here, and not every scene on the way
  // through exposes a row list -- probe rather than assume.
  const s = top();
  const rows = typeof s.rows === 'function' ? s.rows() : null;
  if (rows && (rows[s.sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1400);
for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const kinMod = await import('/build/js/systems/kin.js');
const battleMod = await import('/build/js/scenes/battle.js');
const state = top().state;
state.party.length = 0;
state.party.push(kinMod.createKin('cinderpaw', 24, d.game.rng, { originalTrainer: 'player' }));
const foe = [kinMod.createKin('rilltail', 24, d.game.rng)];

d.game.scenes.push(new battleMod.BattleScene({
  state, playerParty: state.party, foeParty: foe, isWild: true,
  backdrop: 'grass', onFinish: () => {},
}));
d.tick(2);
for (let i = 0; i < 40 && top().phase !== 'menu'; i++) d.key('Enter', 12);
d.game.settings.battleSpeed = 'classic';

const scene = top();
const buf = d.game.renderer.buffer;
// The buffer is the logical field at DETAIL scale; work out that scale rather
// than assuming it, because the renderer has a screenFit setting.
const DET = buf.width / 240;

const sheet = document.createElement('canvas');
sheet.width = WW * DET * ZOOM;
sheet.height = WH * DET * ZOOM * FRAMES.length;
const sx = sheet.getContext('2d');
sx.imageSmoothingEnabled = false;

scene.fx.clear();
d.tick(1);
scene.fx.clear();

const user = scene.bodyPoint('player');
const fxMod = await import('/build/js/gfx/movefx.js');
const target = fxMod.fxTargetsSelf(ANIM) ? user : scene.bodyPoint('foe');
scene.fxSide = 'player';
scene.fx.play(ANIM, user, target, TYPE);

let slot = 0;
const last = FRAMES[FRAMES.length - 1];
for (let f = 1; f <= last; f++) {
  d.tick(1);
  if (!FRAMES.includes(f)) continue;
  const cy = slot * WH * DET * ZOOM;
  sx.drawImage(
    buf, WX * DET, WY * DET, WW * DET, WH * DET,
    0, cy, WW * DET * ZOOM, WH * DET * ZOOM,
  );
  sx.fillStyle = 'rgba(0,0,0,0.75)';
  sx.fillRect(2, cy + 2, 40, 18);
  sx.fillStyle = '#ffe680';
  sx.font = 'bold 14px monospace';
  sx.textBaseline = 'top';
  sx.fillText('f' + String(f).padStart(2, '0'), 5, cy + 3);
  slot++;
}

const url = sheet.toDataURL('image/png');
await fetch('/__shot/' + encodeURIComponent('zoom-' + ANIM), { method: 'POST', body: url });
scene.fx.clear();
return { anim: ANIM, frames: FRAMES, zoom: ZOOM };
