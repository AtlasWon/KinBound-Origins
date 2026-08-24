// JOB 4. Photograph a potion being used, and a vessel landing, frame by frame.
//
//   npx electron tools/capture.cjs tools/shots/itemfx.js 5173 "dev=1&mute=1&what=potion&zoom=2"
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(1400);
d.key('Enter', 4); d.key('Enter', 30); d.key('Enter', 60);
for (let i = 0; i < 30; i++) {
  if (typeof top().rows !== 'function') { d.key('Enter', 20); continue; }
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1600);
for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const kinMod = await import('/build/js/systems/kin.js');
const battleMod = await import('/build/js/scenes/battle.js');
const state = top().state;
const q = new URLSearchParams(location.search);
const what = q.get('what') || 'potion';
const Z = Number(q.get('zoom') || 2);

// 'classic' | 'brisk' | 'fast' are the only battle speeds; anything else makes
// battleSpeedScale return undefined and every step's frame count NaN.
d.game.settings.battleSpeed = 'classic';
d.game.settings.textSpeed = 'fast';
state.giveItem('potion', 20);
state.giveItem('full_restore', 20);
state.giveItem('clearleaf', 20);
state.giveItem('field_vessel', 40);

state.party.length = 0;
const a = kinMod.createKin('cinderpaw', 30, d.game.rng, { originalTrainer: 'player' });
state.party.push(a);
d.game.scenes.push(new battleMod.BattleScene({
  state, playerParty: state.party, foeParty: [kinMod.createKin('nibbet', 12, d.game.rng)],
  isWild: true, backdrop: 'grass', onFinish: () => {},
}));
d.tick(2);
const scene = top();
for (let i = 0; i < 400 && scene.phase !== 'menu'; i++) d.key('Enter', 4);

if (what === 'potion') {
  a.currentHp = Math.max(1, Math.floor(a.maxHp * 0.25));
  scene.view.player.displayHp = a.currentHp;
  out.push('hurt to ' + a.currentHp + '/' + a.maxHp);
  scene.submit(d.game, { kind: 'item', item: 'potion', partyIndex: 0 });
} else {
  scene.submit(d.game, { kind: 'item', item: 'field_vessel', partyIndex: 0 });
}
out.push('queue: ' + scene.queue.map((x) => x.kind + '@' + x.frames).join(','));
out.push('speed=' + d.game.settings.battleSpeed + ' text=' + d.game.settings.textSpeed);
// Run out the line that names the item, so the strip opens on the light
// arriving rather than on twenty frames of typing.
for (let i = 0; i < 200 && scene.current && scene.current.kind === 'text'; i++) d.tick(1);
out.push('at the item step: ' + (scene.current && scene.current.kind) + ' itemFx=' + scene.itemFx);

// A strip of the whole screen, every few frames, so the beats are legible.
const STEP = Number(q.get('step') || 6);
const COLS = Number(q.get('cols') || 6), ROWS = Number(q.get('rows') || 4);
const buf = d.game.renderer.buffer;
// Optional crop, in logical units, so the effect can be looked at rather than
// merely confirmed present.
const CROP = (q.get('crop') || '').split(',').map(Number);
const CX = CROP.length === 4 ? CROP[0] * 2 : 0;
const CY = CROP.length === 4 ? CROP[1] * 2 : 0;
const W = CROP.length === 4 ? CROP[2] * 2 : buf.width;
const H = CROP.length === 4 ? CROP[3] * 2 : buf.height;
const sheet = document.createElement('canvas');
sheet.width = COLS * W * Z / 2;
sheet.height = ROWS * H * Z / 2;
const g = sheet.getContext('2d');
g.imageSmoothingEnabled = false;
g.fillStyle = '#101018';
g.fillRect(0, 0, sheet.width, sheet.height);

let shot = 0;
for (let f = 0; f < COLS * ROWS * STEP && shot < COLS * ROWS; f++) {
  if (f % STEP === 0) {
    d.game.render();
    const cx = (shot % COLS) * W * Z / 2;
    const cy = Math.floor(shot / COLS) * H * Z / 2;
    g.drawImage(buf, CX, CY, W, H, cx, cy, W * Z / 2, H * Z / 2);
    g.fillStyle = '#ffe08a';
    g.font = '10px monospace';
    g.fillText('f' + f + ' itemFx=' + scene.itemFx, cx + 3, cy + 11);
    shot++;
  }
  d.tick(1);
}
await fetch('/__shot/itemfx-' + what, { method: 'POST', body: sheet.toDataURL('image/png') });
out.push('shots ' + shot);
return out;
