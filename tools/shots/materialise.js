// The send-out, recall, faint and capture at frame resolution.
//
// The existing sendout driver samples five frames apart, which steps straight
// over the moment a creature is arriving -- exactly the beat the player
// complained about. This one waits for the step it wants to photograph and
// then shoots every other frame, on a drawn species and a generated one, so
// the two routes can be compared side by side.
//
// Usage: npx electron tools/capture.cjs tools/shots/materialise.js

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

d.game.settings.battleSpeed = 'classic';
d.game.settings.textSpeed = 'fast';

/** Tick one frame at a time until `ok()` says we are on the beat we want. */
const until = (ok, limit = 400) => {
  for (let i = 0; i < limit; i++) {
    if (ok()) return true;
    d.tick(1);
  }
  return false;
};
const step = () => top().current;
const isKind = (k) => () => { const a = step(); return Boolean(a) && a.kind === k; };

async function battle(tag, mine, bench, theirs) {
  state.party.length = 0;
  state.party.push(kinMod.createKin(mine, 14, d.game.rng, { originalTrainer: 'player' }));
  state.party.push(kinMod.createKin(bench, 14, d.game.rng, { originalTrainer: 'player' }));
  const foe = [kinMod.createKin(theirs, 8, d.game.rng)];
  d.game.scenes.push(new battleMod.BattleScene({
    state, playerParty: state.party, foeParty: foe, isWild: true,
    backdrop: 'grass', onFinish: () => {},
  }));
  d.tick(1);

  // 1. The send-out, every other frame from the throw to the last beat.
  out.push(tag + ' sendOut found: ' + until(isKind('sendOut')));
  for (let i = 0; i < 30; i++) await d.shoot(tag + '-out-' + String(i).padStart(2, '0'), 2, 2);

  // 2. Idle, held long enough to see a whole breath.
  until(() => top().phase === 'menu');
  for (let i = 0; i < 12; i++) await d.shoot(tag + '-idle-' + String(i).padStart(2, '0'), 4, 2);

  // 3. A move, so the effect anchor can be seen against the body.
  d.key('Enter', 8);                       // FIGHT
  d.key('Enter', 4);                       // first move
  out.push(tag + ' moveFx found: ' + until(isKind('moveFx')));
  for (let i = 0; i < 16; i++) await d.shoot(tag + '-fx-' + String(i).padStart(2, '0'), 3, 2);

  // 4. A switch: recall then send-out back to back.
  until(() => top().phase === 'menu', 900);
  d.key('KeyS', 4); d.key('KeyS', 4);      // FIGHT -> KIN
  d.key('Enter', 8);
  d.key('KeyS', 4);
  d.key('Enter', 4);
  out.push(tag + ' withdraw found: ' + until(isKind('withdraw'), 600));
  for (let i = 0; i < 22; i++) await d.shoot(tag + '-in-' + String(i).padStart(2, '0'), 2, 2);

  d.game.scenes.pop();
  d.tick(2);
}

// Defaults are one drawn cast and one generated one. Any three species can be
// named instead, which is how an awkward shape gets checked without editing
// this file:
//   npx electron tools/capture.cjs tools/shots/materialise.js 5173 \
//     "dev=1&mute=1&kin=thornmarch,pipwing,galecrest"
const picked = (new URLSearchParams(location.search).get('kin') || '')
  .split(',').map((s) => s.trim()).filter(Boolean);

if (picked.length >= 3) {
  await battle('kin', picked[0], picked[1], picked[2]);
} else {
  await battle('drawn', 'cinderpaw', 'pipwing', 'rilltail');
  await battle('gen', 'pebblet', 'tuftail', 'menhir');
}

return { out };
