// Hearthmere, walked.
//
// A brand new save and the whole of the opening on foot at the size the game
// draws it: the bedroom, down the stairs, Mira, Elias' study, out of the front
// door, Tarin on the lane, the length of the street, over the bridge, the field
// station, the starter, the duel on the forecourt, and the coda at home. Then
// the clinic, the Ashe house, and every signpost in the village.
//
//   npx electron tools/capture.cjs tools/shots/hm-walk.js
//
// MOVEMENT. Legs, not pathfinding. `x(n)` and `y(n)` hold one direction and
// release on the frame the tile index reaches n, which is exactly how a person
// plays and is the only method that survives a doorway: the feet box is nine
// pixels deep in a sixteen pixel cell, so a body whose tile index reads row N
// can still be overlapping row N-1, and a stepper that stops dead on every
// tile boundary catches the wall beside the opening. Continuous movement does
// not, because the collision resolver slides it clear.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
const shots = [];

const KEY = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' };
const shoot = async (name) => { shots.push(name); await d.shoot('hw-' + name, 0, 3); };
const ow = () => d.game.scenes.find('overworld');
const at = () => (d.probe().map || '?') + ' ' + (d.probe().pos || '?');
const pos = () => (d.probe().pos || '-1,-1').split(',').map(Number);

const slide = (dir, done) => {
  const code = KEY[dir];
  const from = d.probe().map;
  d.down(code);
  let hit = false;
  // A leg that walks onto a warp changes the world underneath it, and the
  // target tile it was aiming at no longer means anything -- so let go.
  for (let i = 0; i < 500; i++) {
    d.tick(1);
    if (d.probe().map !== from) { hit = true; break; }
    if (done(pos())) { hit = true; break; }
  }
  // The tile index flips the instant the body crosses the boundary, which
  // leaves the feet box still overlapping the cell behind it -- and the next
  // leg then catches the furniture in that cell. Six more frames is roughly
  // half a tile and parks it in the middle of the one it is standing in.
  if (hit && d.probe().map === from) d.tick(6);
  d.up(code);
  d.tick(4);
  return hit;
};
/** Walk east or west until standing in column tx. */
const gx = (tx) => {
  const [cx] = pos();
  if (cx === tx) return true;
  return slide(cx < tx ? 'right' : 'left', ([px]) => px === tx);
};
/** Walk north or south until standing in row ty. */
const gy = (ty) => {
  const [, cy] = pos();
  if (cy === ty) return true;
  return slide(cy < ty ? 'down' : 'up', ([, py]) => py === ty);
};
/** A route as alternating legs: ['x',14],['y',7],... Reports where it died. */
const leg = (...steps) => {
  for (const [axis, n] of steps) {
    const okay = axis === 'x' ? gx(n) : gy(n);
    if (!okay) return `stopped short of ${axis}=${n} at ${at()}`;
  }
  return 'ok';
};

/**
 * Press through a whole exchange, photographing the first box once it has
 * typed out. It rides through the script's own waits as well as its boxes:
 * an event that is between two lines leaves the overworld on top with busy
 * set, and a loop that only watches for the dialogue scene walks away in the
 * middle of the scene and then tries to move a body the runner has frozen.
 */
const talk = async (name, max = 60) => {
  let first = true;
  for (let i = 0; i < max * 4; i++) {
    const n = top().name;
    if (n === 'dialogue') {
      if (first && name) { d.tick(70); await shoot(name); first = false; }
      d.key('Enter', 8);
    } else if (n === 'overworld' && ow() && (ow().busy || (ow().events && ow().events.running))) d.tick(6);
    else break;
  }
  d.tick(10);
};
const face = (dir) => { d.key(KEY[dir], 6); };

await d.loadWait(600);

/* --------------------------------------------------- a genuinely new save */

const title = await import('/build/js/scenes/title.js');
localStorage.clear();
title.resetTitleSession();
d.game.scenes.replaceAll(new title.TitleScene());
d.tick(4);
for (let i = 0; i < 120 && top().name !== 'creator'; i++) d.key('Enter', 10);
if (top().name !== 'creator') throw new Error('never reached the creator; stuck on ' + top().name);
for (let i = 0; i < 40; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1800);

/* ------------------------------------------------------------ upstairs */

await talk('01-wake');
out.push('new save opens at ' + at());
await shoot('02-your-room');
out.push('across your room: ' + leg(['x', 2], ['y', 3]));
face('down');
d.key('Enter', 12);
await talk('03-your-desk', 16);
out.push('onto the landing: ' + leg(['x', 3], ['y', 8], ['x', 10]));
await shoot('04-landing');
out.push("into Mira's room: " + leg(['x', 16], ['y', 5]));
await shoot('05-mira-room');
out.push('to the stair: ' + leg(['y', 8], ['x', 12], ['y', 1]));
await d.loadWait(1300);
out.push('down the stairs -> ' + at());

/* ---------------------------------------------------------------- Mira */

await shoot('06-kitchen');
out.push('to Mira: ' + leg(['x', 11], ['y', 6], ['x', 5], ['y', 5]));
face('up');
d.key('Enter', 12);
await talk('07-mira', 120);
out.push('Mira done: mom_sendoff=' + ow().state.hasFlag('mom_sendoff')
  + ' tideheart=' + ow().state.hasFlag('tideheart_given')
  + ' bag=[' + ow().state.inventory.map((e) => e.item + ' x' + e.count).join(', ') + ']');

/* ------------------------------------------------------- Elias' study */

out.push('into the study: ' + leg(['y', 8], ['x', 17], ['y', 2]));
await shoot('08-study');
face('left');
d.key('Enter', 12);
await talk('09-study-case', 16);
out.push('to the photograph: ' + leg(['y', 4], ['x', 14]));
face('down');
d.key('Enter', 12);
await talk('10-study-photo', 16);

/* ------------------------------------------- out the door, and Tarin */

out.push('to the front door: ' + leg(['x', 17], ['y', 8], ['x', 6], ['y', 10]));
await d.loadWait(1400);
out.push('out the front door -> ' + at());
await shoot('11-front-door');

d.hold('KeyA', 10);
d.tick(40);
await talk('12-tarin-meets', 200);
d.tick(700);
for (let i = 0; i < 60 && top().name === 'dialogue'; i++) d.key('Enter', 8);
d.tick(260);
out.push('Tarin scene: met_tarin=' + ow().state.hasFlag('met_tarin') + ', player at ' + at());
await shoot('13-the-lane');

/* ------------------------------------------------- the street, north */

out.push('up the street: ' + leg(['x', 14], ['y', 20]));
await shoot('14-cottages');
out.push('into the square: ' + leg(['y', 17]));
await shoot('15-square');
out.push('the wellhead: ' + leg(['y', 16]));
await shoot('16-wellhead');
out.push('the market: ' + leg(['x', 17], ['y', 16]));
await shoot('17-market');
face('right');
d.key('Enter', 12);
await talk('18-trader', 30);

/* ----------------------------------------------------------- the clinic */

out.push('to the clinic door: ' + leg(['x', 14], ['y', 15], ['x', 11], ['y', 14]));
await d.loadWait(1400);
out.push('into the clinic -> ' + at() + ' ("' + ow().map.displayName + '")');
await shoot('19-clinic');
out.push('to the counter: ' + leg(['y', 3], ['x', 5]));
face('up');
d.key('Enter', 14);
await talk('20-clinic-keeper', 60);
for (let i = 0; i < 40 && top().name !== 'overworld'; i++) d.key('Enter', 8);
d.tick(20);
out.push('clinic_met=' + ow().state.hasFlag('clinic_met') + ' respawn=' + ow().state.respawnMap);
out.push('out again: ' + leg(['x', 7], ['y', 8], ['x', 6], ['y', 9]));
await d.loadWait(1400);
out.push('back on the square -> ' + at());

/* -------------------------------------------------- the bridge, the mere */

out.push('to the bridge: ' + leg(['x', 14], ['y', 11]));
await shoot('21-north-of-square');
out.push('over the water: ' + leg(['y', 7]));
await shoot('22-bridge');

/* ------------------------------------------------------ Sorrell's station */

out.push('to the station door: ' + leg(['x', 21], ['y', 5]));
await shoot('23-station-front');
out.push('inside: ' + leg(['y', 4]));
await d.loadWait(1500);
out.push('through the double door -> ' + at() + ' ("' + ow().map.displayName + '")');
await shoot('24-station');
out.push('to the counter: ' + leg(['y', 9], ['x', 9]));
await shoot('25-the-three');
face('up');
d.key('Enter', 14);
d.tick(70);
await shoot('26-sorrell');
let shotChoice = false;
for (let i = 0; i < 300 && !ow().state.hasFlag('got_starter'); i++) {
  const n = top().name;
  if (n === 'starter' && !shotChoice) { d.tick(90); await shoot('27-starter-choice'); shotChoice = true; }
  if (n === 'dialogue' || n === 'starter') d.key('Enter', 10);
  else d.tick(10);
}
d.tick(40);
for (let i = 0; i < 80 && top().name === 'dialogue'; i++) d.key('Enter', 8);
for (let i = 0; i < 150 && top().name !== 'overworld'; i++) {
  if (top().name === 'dialogue' || top().name === 'starter') d.key('Enter', 10);
  else d.tick(10);
}
out.push('got_starter=' + ow().state.hasFlag('got_starter')
  + ' party=[' + ow().state.party.map((k) => k.species + ' L' + k.level).join(', ') + ']');

/* --------------------------------------------------------- out, the duel */

out.push('back to the door: ' + leg(['y', 11], ['x', 10], ['y', 12]));
await d.loadWait(1500);
out.push('back outside -> ' + at());
d.hold('KeyA', 10);
d.tick(60);
await talk('28-duel-opens', 40);
let sawBattle = false;
for (let i = 0; i < 1400; i++) {
  const n = top().name;
  if (n === 'battle') {
    if (!sawBattle) { sawBattle = true; d.tick(60); await shoot('29-duel'); }
    d.key('Enter', 6);
  } else if (n === 'dialogue') d.key('Enter', 6);
  else d.tick(6);
  // The coda ends on a warp, and a warp awaits a map fetch. A loop that only
  // ticks never lets the microtask queue run, so the promise never settles and
  // the script sits at the warp for ever. Yield.
  if (i % 20 === 0) await d.sleep(0);
  if (d.probe().map === 'hearthmere_house_player' && n === 'overworld') break;
}
for (let i = 0; i < 80 && top().name === 'dialogue'; i++) d.key('Enter', 8);
d.tick(160);
out.push('duel fought=' + sawBattle + ', after it: ' + at()
  + ' tarin_first_done=' + ow().state.hasFlag('tarin_first_done'));
// The coda ends on a warp home whose fade is still running when the script
// gets control back, so settle it before photographing the room.
for (let i = 0; i < 900; i++) {
  const n = top().name;
  if (n === 'dialogue' || n === 'battle') d.key('Enter', 6);
  else if (n === 'overworld' && ow() && (ow().busy || (ow().events && ow().events.running))) d.tick(6);
  else break;
  if (i % 20 === 0) await d.sleep(0);
}
for (let i = 0; i < 240 && top().name !== 'overworld'; i++) { d.key('Enter', 8); if (i % 10 === 0) await d.sleep(0); }
d.tick(90);
out.push('after the coda: ' + at() + ' mom_rest=' + ow().state.hasFlag('mom_rest'));
await shoot('30-home-after');

/* ------------------------------------------------- the rest of the village */

const state = ow().state;
const goTo = async (map, mx, my, f) => {
  d.game.scenes.replaceAll(new (ow().constructor)(state, map, mx, my, f || 'up'));
  await d.loadWait(1100);
};
const readSign = async (map, sx, sy, name) => {
  await goTo(map, sx, sy + 1, 'up');
  face('up');
  d.key('Enter', 12);
  await talk(name, 16);
};

await readSign('hearthmere', 13, 3, '31-sign-village');
await readSign('hearthmere', 13, 5, '32-sign-field');
await readSign('hearthmere', 16, 11, '33-sign-mere');
await readSign('hearthmere', 7, 14, '34-sign-board');
await readSign('hearthmere', 13, 27, '35-sign-meadow');

await goTo('hearthmere', 10, 24, 'up');
out.push('into the Ashe house: ' + leg(['y', 23]));
await d.loadWait(1400);
out.push('the Ashe house -> ' + at() + ' ("' + ow().map.displayName + '")');
await shoot('36-ashe-house');
out.push('to Nanna: ' + leg(['y', 4], ['x', 11]));
face('right');
d.key('Enter', 14);
await talk('37-ashe-gran', 30);

await goTo('hearthmere', 8, 4, 'down');
await shoot('38-the-field');
await goTo('hearthmere', 6, 26, 'down');
await shoot('39-lower-meadow');
await goTo('hearthmere', 24, 12, 'down');
await shoot('40-east-side');
await goTo('hearthmere', 14, 3, 'down');
await shoot('41-north-gate');
await goTo('hearthmere', 5, 10, 'down');
await shoot('42-riverbank');

out.push('shots: ' + shots.length);
return { out, shots };
