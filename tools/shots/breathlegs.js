// The bottom of the creature, at each breath pose, stacked.
//
// The seams sit in the lower body, so the only place the compression can go
// wrong is down there -- a row removed through the middle of a thin leg breaks
// its shading and can leave a paw looking detached. Nothing at 1x will show
// that; this crops the last twenty logical rows of the cell and blows them up.
//
// Usage: npx electron tools/capture.cjs tools/shots/breathlegs.js

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
d.game.settings.battleSpeed = 'fast';
d.game.settings.textSpeed = 'fast';

const DETAIL = 2;
const CELLS = { player: { x: 14, y: 40 }, foe: { x: 158, y: 2 } };
// Design rows within the cell. The feet are on 123, so this is the whole of
// the lower body plus a little floor.
const ROW0 = 80, ROWS = 48;

async function look(tag, mine, theirs) {
  state.party.length = 0;
  state.party.push(kinMod.createKin(mine, 14, d.game.rng, { originalTrainer: 'player' }));
  const foe = [kinMod.createKin(theirs, 8, d.game.rng)];
  d.game.scenes.push(new battleMod.BattleScene({
    state, playerParty: state.party, foeParty: foe, isWild: true,
    backdrop: 'grass', onFinish: () => {},
  }));
  for (let i = 0; i < 600 && top().phase !== 'menu'; i++) d.tick(1);

  const set = (t) => {
    top().view.player.idleT = t;
    top().view.foe.idleT = t + 72;   // the foe runs a little over half a cycle behind
    d.game.render();
  };

  for (const [side, cell] of Object.entries(CELLS)) {
    const Z = 6;
    const cv = document.createElement('canvas');
    cv.width = 128 * Z;
    cv.height = (ROWS * Z + 8) * 3;
    const sc = cv.getContext('2d');
    sc.imageSmoothingEnabled = false;
    sc.fillStyle = '#101018';
    sc.fillRect(0, 0, cv.width, cv.height);
    let row = 0;
    for (const t of [0, 42, 127]) {
      set(t);
      sc.drawImage(d.game.renderer.buffer,
        cell.x * DETAIL, cell.y * DETAIL + ROW0, 128, ROWS,
        0, row * (ROWS * Z + 8), 128 * Z, ROWS * Z);
      row++;
    }
    await fetch('/__shot/' + encodeURIComponent(`${tag}-${side}-legs`),
      { method: 'POST', body: cv.toDataURL('image/png') });
  }

  d.game.scenes.pop();
  d.tick(2);
}

const picked = (new URLSearchParams(location.search).get('kin') || '')
  .split(',').map((s) => s.trim()).filter(Boolean);
if (picked.length >= 2) await look('kin', picked[0], picked[1]);
else {
  await look('drawn', 'cinderpaw', 'rilltail');
  await look('gen', 'pebblet', 'menhir');
}
return 'ok';
