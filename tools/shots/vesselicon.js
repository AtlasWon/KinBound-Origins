// The vessel prop on its own, at every stage of opening and every phase of the
// tumble, blown up so single pixels are visible.
//
// The icon is eleven units across. Nothing about it can be judged from a
// battle screenshot, and it is the one object in the send-out the whole
// sequence is about, so it gets its own sheet.
//
// Usage: npx electron tools/capture.cjs tools/shots/vesselicon.js

const d = window.dev;
const top = () => d.game.scenes.top;

await d.loadWait(1400);
d.key('Enter', 4);
d.key('Enter', 30);
d.key('Enter', 60);
for (let i = 0; i < 30; i++) {
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
state.party.push(kinMod.createKin('cinderpaw', 12, d.game.rng, { originalTrainer: 'player' }));
d.game.settings.battleSpeed = 'classic';
d.game.scenes.push(new battleMod.BattleScene({
  state, playerParty: state.party, foeParty: [kinMod.createKin('rilltail', 6, d.game.rng)],
  isWild: true, backdrop: 'grass', onFinish: () => {},
}));
d.tick(2);
for (let i = 0; i < 400 && top().phase !== 'menu'; i++) { d.tick(1); if (i % 4 === 0) d.key('Enter', 0); }
const s = top();

// A patch of open sky, well clear of everything, in logical units.
const AT = { x: 118, y: 50 };
const CELL = { w: 34, h: 34 };          // logical
const Z = 8;
const COLS = 6;

const poses = [];
for (const spin of [0, 0.12, 0.25, 0.37, 0.5, 0.75]) poses.push({ open: 0, spin, beam: 0 });
for (const open of [0.2, 0.45, 0.7, 1, 1, 1]) poses.push({ open, spin: 0, beam: open });

const cv = document.createElement('canvas');
cv.width = COLS * (CELL.w * Z + 6);
cv.height = Math.ceil(poses.length / COLS) * (CELL.h * Z + 6);
const c = cv.getContext('2d');
c.imageSmoothingEnabled = false;
c.fillStyle = '#101018';
c.fillRect(0, 0, cv.width, cv.height);

poses.forEach((pose, i) => {
  s.capsule = {
    x: AT.x, y: AT.y, open: pose.open, beam: pose.beam,
    beamTo: pose.beam > 0 ? { x: AT.x, y: AT.y + 40 } : null,
    spin: pose.spin, burst: 0, land: 0, trail: [], flow: 0.2, flare: 0, dust: 0, tell: null,
  };
  d.game.render();
  c.drawImage(d.game.renderer.buffer,
    (AT.x - CELL.w / 2) * 2, (AT.y - CELL.h / 2) * 2, CELL.w * 2, CELL.h * 2,
    (i % COLS) * (CELL.w * Z + 6) + 3, Math.floor(i / COLS) * (CELL.h * Z + 6) + 3,
    CELL.w * Z, CELL.h * Z);
});

await fetch('/__shot/vessel-icon', { method: 'POST', body: cv.toDataURL('image/png') });
return 'ok';
