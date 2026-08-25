// JOB 1 repro, the real one: LOSE the first battle against Tarin in Hearthmere
// Hollow. That script declares onLoss:"continue", so the scene carries on --
// while the overworld also runs its standard blackout. Two owners, one fade.
const d = window.dev;
const top = () => d.game.scenes.top;
const ow = () => d.game.scenes.find('overworld');
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
  if (typeof top().rows !== 'function') { d.key('Enter', 20); continue; }
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1800);
for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const kinMod = await import('/build/js/systems/kin.js');
const OW = ow().constructor;
const state = ow().state;
d.game.settings.battleSpeed = 'brisk';
d.game.settings.textSpeed = 'fast';

state.setFlag('met_tarin');
state.setFlag('got_starter');
state.setFlag('starter_cinderpaw');
state.party.length = 0;
const mine = kinMod.createKin('cinderpaw', 5, d.game.rng, { originalTrainer: 'player' });
mine.currentHp = 1;
state.party.push(mine);

d.game.scenes.replaceAll(new OW(state, 'hearthmere', 22, 9, 'up'));
await d.loadWait(1600);
for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const gates = () => {
  const o = ow();
  if (!o) return 'no-overworld';
  return 'scene=' + top().name + ' depth=' + d.game.scenes.depth
    + ' busy=' + o.busy + ' fadeActive=' + o.fade.active + ' fadeT=' + o.fade.t + '/' + o.fade.frames
    + ' hasThen=' + !!o.fade.then
    + ' wipe=' + !!o.wipe + ' ev=' + !!(o.events && o.events.running)
    + ' pbusy=' + o.player.busy + ' map=' + (o.map && o.map.id)
    + ' at=' + o.player.tileX + ',' + o.player.tileY;
};

const canWalk = () => {
  const o = ow();
  if (!o || top().name !== 'overworld') return 'NO(' + gates() + ')';
  const p = o.player;
  const before = p.x.toFixed(2) + ',' + p.y.toFixed(2);
  for (const k of ['KeyD', 'KeyA', 'KeyW', 'KeyS']) {
    d.hold(k, 14);
    if (p.x.toFixed(2) + ',' + p.y.toFixed(2) !== before) return 'yes';
  }
  return 'NO(' + gates() + ')';
};

// Step onto the trigger tile.
out.push('before: ' + gates());
for (let i = 0; i < 60 && !(ow().events && ow().events.running); i++) d.hold('KeyW', 6);
out.push('script running: ' + gates());

// Push through the approach and the dialogue until the battle opens.
for (let i = 0; i < 3000 && top().name !== 'battle'; i++) {
  d.tick(1);
  if (top().name === 'dialogue') d.key('Enter', 4);
}
out.push('battle open: ' + (top().name === 'battle'));
if (top().name !== 'battle') return out;

const scene = top();
let guard = 0;
while (d.game.scenes.top === scene && guard++ < 8000) {
  const ph = scene.phase;
  if (ph === 'menu') scene.submit(d.game, { kind: 'move', index: 0 });
  else if (ph === 'finished' || ph === 'forcedSwitch') d.key('Enter', 3);
  else d.tick(3);
}
out.push('battle over, result=' + scene.battle.result + ' guard=' + guard);

for (let r = 0; r < 25; r++) {
  d.tick(20);
  for (let i = 0; i < 60 && top().name === 'dialogue'; i++) d.key('Enter', 8);
  await d.sleep(70);
}
d.tick(60);
out.push('settled: ' + gates());
out.push('canWalk=' + canWalk());
await d.shoot('stuck-after-loss', 4, 2);
return out;

