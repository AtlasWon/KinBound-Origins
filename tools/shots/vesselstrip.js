// The send-out and the recall, every few frames, tiled into one sheet.
//
// Both are about forty frames long and both are judged on timing, so a handful
// of stills taken at whatever moment a battle happened to be in tells you
// nothing. This finds the step in the queue, then walks it, cropping the half
// of the field the vessel is working in and laying the frames out in reading
// order at 1:1 buffer scale -- no resampling, so what is on the sheet is
// exactly what is on the screen.
//
// Usage: npx electron tools/capture.cjs tools/shots/vesselstrip.js
//        ...tools/shots/vesselstrip.js 5173 "dev=1&mute=1&kin=pebblet"

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

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
const species = (new URLSearchParams(location.search).get('kin') || 'cinderpaw').split(',');

state.party.length = 0;
state.party.push(kinMod.createKin(species[0], 12, d.game.rng, { originalTrainer: 'player' }));
state.party.push(kinMod.createKin(species[1] || 'pipwing', 10, d.game.rng, { originalTrainer: 'player' }));

d.game.settings.battleSpeed = 'classic';
d.game.settings.textSpeed = 'fast';
d.game.scenes.push(new battleMod.BattleScene({
  state, playerParty: state.party, foeParty: [kinMod.createKin('rilltail', 6, d.game.rng)],
  isWild: true, backdrop: 'grass', onFinish: () => {},
}));
d.tick(2);

// The player's half of the field, in BUFFER pixels: the vessel leaves the
// bottom-left corner, arcs up over the pad and comes back, so this has to
// include the floor and a good margin of sky.
let CROP = { x: 0, y: 44, w: 240, h: 200 };
const FOE_CROP = { x: 240, y: 0, w: 240, h: 190 };
const COLS = 5;

function sheet(frames) {
  const cv = document.createElement('canvas');
  const rows = Math.ceil(frames.length / COLS);
  cv.width = COLS * (CROP.w + 4);
  cv.height = rows * (CROP.h + 4);
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#181c28';
  c.fillRect(0, 0, cv.width, cv.height);
  frames.forEach((img, i) => {
    c.drawImage(img, (i % COLS) * (CROP.w + 4) + 2,
      Math.floor(i / COLS) * (CROP.h + 4) + 2);
  });
  return cv;
}

function snap() {
  const cv = document.createElement('canvas');
  cv.width = CROP.w; cv.height = CROP.h;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.drawImage(d.game.renderer.buffer, CROP.x, CROP.y, CROP.w, CROP.h, 0, 0, CROP.w, CROP.h);
  return cv;
}

/**
 * Tick until the current queue step is of `kind`, then walk it.
 *
 * Confirm is only pressed while a TEXT step is up. Pressing it blindly to get
 * through the queue is what a first version did and it silently skipped the
 * very animations this driver exists to photograph -- confirm is the skip key.
 */
async function walk(name, kind, every) {
  const s = top();
  for (let i = 0; i < 900; i++) {
    if (s.current && s.current.kind === kind) break;
    if (s.current && s.current.kind === 'text') d.key('Enter', 0);
    else d.tick(1);
  }
  if (!s.current || s.current.kind !== kind) { out.push('never reached ' + kind); return; }
  const frames = [];
  let guard = 0;
  while (s.current && s.current.kind === kind && guard < 200) {
    frames.push(snap());
    for (let k = 0; k < every; k++) { d.tick(1); guard++; }
  }
  frames.push(snap());
  out.push(name + ': ' + frames.length + ' frames');
  await fetch('/__shot/' + encodeURIComponent(name),
    { method: 'POST', body: sheet(frames).toDataURL('image/png') });
}

await walk('vessel-sendout', 'sendOut', 3);

// Reach the command pad, choose KIN, and switch to the second party member:
// that is a recall followed by a send-out, back to back.
const s = top();
for (let i = 0; i < 400 && s.phase !== 'menu'; i++) {
  if (s.current && s.current.kind === 'text') d.key('Enter', 0); else d.tick(1);
}
out.push('phase ' + s.phase);
// Straight to the action the switch screen would have submitted. Driving the
// command pad by key here only tested the pad's own navigation, which is not
// what this sheet is about, and got it wrong.
s.submit(d.game, { kind: 'switch', partyIndex: 1 });
await walk('vessel-recall', 'withdraw', 2);
await walk('vessel-swapin', 'sendOut', 3);

// The capture drives the same prop through a longer performance, so it has to
// be looked at alongside the other two or a change to the icon lands there
// unseen. A failed catch is the interesting one: it contains a send-out too.
for (let i = 0; i < 400 && s.phase !== 'menu'; i++) {
  if (s.current && s.current.kind === 'text') d.key('Enter', 0); else d.tick(1);
}
state.inventory.length = 0;
state.giveItem('field_vessel', 20);
s.submit(d.game, { kind: 'item', item: 'field_vessel', partyIndex: 0 });
CROP = FOE_CROP;
await walk('vessel-catch', 'vessel', 5);

return { out };
