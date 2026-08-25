// Rest against squashed, blown up, for a named handful of creatures.
//
// Same three-column order as the idle actually plays -- stretched, rest,
// squashed -- but magnified, so the question "is the join invisible" can be
// answered by looking rather than by arithmetic. Both frames come out of the
// running game's back buffer, not out of a reimplementation of the blit.
//
// Usage: npx electron tools/capture.cjs tools/shots/breathpair.js 5173 "dev=1&mute=1&ids=cinderpaw,craglide,chalkid"

const d = window.dev;
const top = () => d.game.scenes.top;

await d.loadWait(1400);
// Press through the title, the menu and the cinematic until the creator is
// actually on top. A fixed count of Enters broke when the menu gained a
// transition into the cinematic and moved the beat this landed on.
// Reach the title, then choose NEW JOURNEY deliberately -- the cursor starts
// on CONTINUE whenever a save exists, so pressing Enter blindly loads that
// save and skips the creator entirely.
for (let i = 0; i < 90 && top().name !== 'title'; i++) d.key('Enter', 10);
if (top().name === 'title' && top().menu) { top().menu.index = 0; d.key('Enter', 24); }
for (let i = 0; i < 60 && top().name !== 'creator'; i++) d.key('Enter', 10);
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

const state = top().state;
state.party.length = 0;
state.party.push(kinMod.createKin('cinderpaw', 20, d.game.rng, { originalTrainer: 'player' }));

d.game.settings.battleSpeed = 'instant';
d.game.settings.textSpeed = 'instant';
d.game.scenes.push(new battleMod.BattleScene({
  state, playerParty: state.party, foeParty: [kinMod.createKin('nibbet', 5, d.game.rng)],
  isWild: true, backdrop: 'grass', onFinish: () => {},
}));
d.tick(2);
for (let i = 0; i < 120 && top().phase !== 'menu'; i++) d.key('Enter', 4);
const scene = top();

const q = new URLSearchParams(location.search);
const ids = (q.get('ids') || 'cinderpaw').split(',');
const Z = Number(q.get('zoom') || 3);
// The foe's cycle is offset by 1.15pi so the two sides never pulse together,
// so it reaches the same three poses at different clocks.
const foe = q.get('side') === 'foe';
const CLOCKS = foe ? [115, 0, 30] : [35, 0, 127];
const SX = (foe ? 158 : 14) * 2, SY = (foe ? 2 : 40) * 2, SW = 128, SH = 128;

const sheet = document.createElement('canvas');
sheet.width = CLOCKS.length * SW * Z;
sheet.height = ids.length * SH * Z;
const g = sheet.getContext('2d');
g.imageSmoothingEnabled = false;
g.fillStyle = '#101018';
g.fillRect(0, 0, sheet.width, sheet.height);

const buf = d.game.renderer.buffer;
ids.forEach((id, n) => {
  const kin = kinMod.createKin(id, 20, d.game.rng, { originalTrainer: 'player' });
  const v = foe ? scene.view.foe : scene.view.player;
  v.kin = kin;
  v.displayHp = kin.currentHp;
  CLOCKS.forEach((t, c) => {
    v.idleT = t;
    d.game.render();
    g.drawImage(buf, SX, SY, SW, SH, c * SW * Z, n * SH * Z, SW * Z, SH * Z);
  });
  g.fillStyle = '#ffe08a';
  g.font = '16px monospace';
  g.fillText(id + '  stretch / rest / squash', 6, n * SH * Z + 18);
});

await fetch('/__shot/breathpair-' + (foe ? 'front' : 'back'), { method: 'POST', body: sheet.toDataURL('image/png') });
return { ids, zoom: Z };
