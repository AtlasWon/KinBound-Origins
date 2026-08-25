// The idle breath, held at each step of its cycle.
//
// A breath is two logical pixels over about two and a half seconds, which no
// amount of sampling a running battle will reliably land on. So the clock is
// set by hand to the three poses -- extended, one, two -- and each is shot at
// 3x so a single design pixel is visible. Run on a drawn species and a
// generated one; the seams are measured off each creature's own ink, so the
// two have to be checked separately.
//
// Usage: npx electron tools/capture.cjs tools/shots/breath.js

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
const anchorMod = await import('/build/js/gfx/kinanchor.js');
const state = top().state;
d.game.settings.battleSpeed = 'fast';
d.game.settings.textSpeed = 'fast';

// idleT values that land on squash 0, 1 and 2. See BattleScene.breath.
const POSE = { rest: 40, half: 95, full: 120 };

async function look(tag, mine, theirs) {
  state.party.length = 0;
  state.party.push(kinMod.createKin(mine, 14, d.game.rng, { originalTrainer: 'player' }));
  const foe = [kinMod.createKin(theirs, 8, d.game.rng)];
  d.game.scenes.push(new battleMod.BattleScene({
    state, playerParty: state.party, foeParty: foe, isWild: true,
    backdrop: 'grass', onFinish: () => {},
  }));
  for (let i = 0; i < 600 && top().phase !== 'menu'; i++) d.tick(1);

  out.push(tag + ' player seams ' + JSON.stringify(anchorMod.kinAnchor(mine, true).seams)
    + ' foe seams ' + JSON.stringify(anchorMod.kinAnchor(theirs, false).seams));

  for (const [name, t] of Object.entries(POSE)) {
    // The clock is frozen for the shot, so the pose cannot drift under it.
    top().view.player.idleT = t;
    top().view.foe.idleT = t + 70;      // the foe runs half a cycle behind
    await d.shoot(tag + '-breath-' + name, 0, 3);
  }

  d.game.scenes.pop();
  d.tick(2);
}

// Two species can be named to check an awkward shape:
//   npx electron tools/capture.cjs tools/shots/breath.js 5173 \
//     "dev=1&mute=1&kin=pipwing,brookmaw"
const picked = (new URLSearchParams(location.search).get('kin') || '')
  .split(',').map((s) => s.trim()).filter(Boolean);

if (picked.length >= 2) {
  await look('kin', picked[0], picked[1]);
} else {
  await look('drawn', 'cinderpaw', 'rilltail');
  await look('gen', 'pebblet', 'menhir');
}

return { out };
