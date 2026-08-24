// A real battle turn, sampled tightly enough to see the effect.
//
// tools/shots/battle.js photographs a turn ten ticks apart, which is wider
// than most move effects' entire strike beat -- every frame it catches is
// message-box text. This one picks a move, then samples every other tick
// through the animation phase into one contact sheet.
const d = window.dev;
const top = () => d.game.scenes.top;

const Q = new URLSearchParams(location.search);
const MOVE = Number(Q.get('move') || 2);      // index in the move menu
const COLS = 3, ROWS = 4, STEP = Number(Q.get('step') || 2);

await d.loadWait(1200);
d.key('Enter', 4); d.key('Enter', 30);
d.key('Enter', 60);
for (let i = 0; i < 30; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
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
const foe = [kinMod.createKin('rilltail', 22, d.game.rng)];

d.game.scenes.push(new battleMod.BattleScene({
  state, playerParty: state.party, foeParty: foe, isWild: true,
  backdrop: 'grass', onFinish: () => {},
}));
d.tick(2);
for (let i = 0; i < 40 && top().phase !== 'menu'; i++) d.key('Enter', 12);
d.game.settings.battleSpeed = 'classic';

const scene = top();
d.key('Enter', 8);                       // FIGHT
for (let i = 0; i < MOVE; i++) d.key('KeyS', 4);
const chosen = (scene.rows ? '' : '') + (scene.moveRows ? '' : '');
d.key('Enter', 2);

const buf = d.game.renderer.buffer;
const CW = buf.width, CH = buf.height;
const sheet = document.createElement('canvas');
sheet.width = CW * COLS; sheet.height = CH * ROWS;
const sx = sheet.getContext('2d');
sx.imageSmoothingEnabled = false;
sx.fillStyle = '#000'; sx.fillRect(0, 0, sheet.width, sheet.height);

// Wait for the effect layer to actually have something in it, then shoot.
for (let i = 0; i < 200 && !scene.fx.busy; i++) d.tick(1);

for (let n = 0; n < COLS * ROWS; n++) {
  const cx = (n % COLS) * CW, cy = Math.floor(n / COLS) * CH;
  sx.drawImage(buf, cx, cy);
  sx.fillStyle = 'rgba(0,0,0,0.75)';
  sx.fillRect(cx + 2, cy + 2, 34, 16);
  sx.fillStyle = '#ffe680';
  sx.font = 'bold 13px monospace';
  sx.textBaseline = 'top';
  sx.fillText('t' + String(n * STEP).padStart(2, '0'), cx + 5, cy + 3);
  sx.strokeStyle = '#202028'; sx.lineWidth = 2;
  sx.strokeRect(cx + 1, cy + 1, CW - 2, CH - 2);
  d.tick(STEP);
}

await fetch('/__shot/' + encodeURIComponent('turn-move' + MOVE), {
  method: 'POST', body: sheet.toDataURL('image/png'),
});
void chosen;
return { phase: scene.phase };
