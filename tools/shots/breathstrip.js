// JOB 3, the eye test. Every hand-drawn species, one side per sheet, every pose
// the idle reaches, side by side with generous headroom so nothing is cropped
// by the sheet itself.
//
//   npx electron tools/capture.cjs tools/shots/breathstrip.js 5173 "dev=1&mute=1&side=back&zoom=2&page=0"
//
// zoom=1 is the judging size. Higher only to inspect something the 1x sheet
// already told you to look at.

const d = window.dev;
const top = () => d.game.scenes.top;

await d.loadWait(1400);
// Press through the title, the menu and the cinematic until the creator is
// actually on top. A fixed count of Enters broke when the menu gained a
// transition into the cinematic and moved the beat this landed on.
for (let i = 0; i < 80 && top().name !== 'creator'; i++) d.key('Enter', 12);
for (let i = 0; i < 30; i++) {
  if (typeof top().rows !== 'function') { d.key('Enter', 20); continue; }
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1500);
for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const kinMod = await import('/build/js/systems/kin.js');
const battleMod = await import('/build/js/scenes/battle.js');
const breathMod = await import('/build/js/gfx/kinbreath.js');

const state = top().state;
state.party.length = 0;
state.party.push(kinMod.createKin('cinderpaw', 20, d.game.rng, { originalTrainer: 'player' }));
d.game.settings.battleSpeed = 'classic';
d.game.settings.textSpeed = 'fast';
d.game.scenes.push(new battleMod.BattleScene({
  state, playerParty: state.party, foeParty: [kinMod.createKin('nibbet', 5, d.game.rng)],
  isWild: true, backdrop: 'grass', onFinish: () => {},
}));
d.tick(2);
for (let i = 0; i < 200 && top().phase !== 'menu'; i++) d.key('Enter', 4);
const scene = top();

const q = new URLSearchParams(location.search);
const back = (q.get('side') || 'back') === 'back';
const Z = Number(q.get('zoom') || 2);
const PAGE = Number(q.get('page') || 0);
const PER = Number(q.get('per') || 9);

const res = await fetch('/assets/kin/index.json');
const idx = await res.json();
const all = [...new Set((idx.files || [])
  .map((f) => f.toLowerCase().replace(/-(front|back)\.png$/, '')))].sort();
const ids = q.get('ids') ? q.get('ids').split(',') : all.slice(PAGE * PER, PAGE * PER + PER);

const CELL = 128;
const HEAD = 24;                 // buffer rows of sky kept above the cell
const SX = (back ? 14 : 158) * 2;
const SY = (back ? 40 : 2) * 2 - HEAD;
const SH = CELL + HEAD;

const v = back ? scene.view.player : scene.view.foe;
const other = back ? scene.view.foe : scene.view.player;
other.visible = false;

// Three columns is the most the cycle ever has: rest, +1, +2.
const COLS = 3;
const sheet = document.createElement('canvas');
sheet.width = COLS * CELL * Z;
sheet.height = ids.length * SH * Z;
const g = sheet.getContext('2d');
g.imageSmoothingEnabled = false;
g.fillStyle = '#101018';
g.fillRect(0, 0, sheet.width, sheet.height);

const buf = d.game.renderer.buffer;
const notes = [];

ids.forEach((id, n) => {
  let kin;
  try { kin = kinMod.createKin(id, 20, d.game.rng, { originalTrainer: 'player' }); }
  catch { notes.push(id + ': unknown'); return; }
  v.kin = kin;
  v.displayHp = kin.currentHp;
  v.visible = true; v.alpha = 1; v.ghost = 0; v.bloom = 0; v.clipY = null;
  v.offsetX = 0; v.offsetY = 0; v.dash = 0; v.dashV = 0; v.dashTo = 0; v.flash = 0;

  const amp = breathMod.kinBreath(id, back).lift;
  const byLift = new Map();
  for (let t = 0; t < 200; t++) {
    v.idleT = t;
    const l = scene.breath(back ? 'player' : 'foe', amp);
    if (!byLift.has(l)) byLift.set(l, t);
  }
  const order = [...byLift.entries()].sort((a, b) => a[0] - b[0]);
  order.forEach(([l, t], c) => {
    if (c >= COLS) return;
    v.idleT = t;
    d.game.render();
    g.drawImage(buf, SX, SY, CELL, SH, c * CELL * Z, n * SH * Z, CELL * Z, SH * Z);
  });
  g.fillStyle = '#ffe08a';
  g.font = (7 * Z) + 'px monospace';
  g.fillText(id + '  ' + order.map((e) => '+' + e[0]).join(' / '), 4, n * SH * Z + 10 * Z);
  notes.push(id + ' ' + order.map((e) => e[0]).join(','));
});

const name = 'breathstrip-' + (back ? 'back' : 'front') + '-' + PAGE;
await fetch('/__shot/' + name, { method: 'POST', body: sheet.toDataURL('image/png') });
return { name, ids, notes };

