// The rename, walked.
//
// A brand new save, the real Act 1 opening on foot -- bedroom, Mira, Tarin,
// Sorrell's laboratory, the starter, the duel -- then the road north to Briarbell
// and on to Kellowmere, the second town. Every name the player is shown is
// photographed, because the failure mode of a rename is a dangling id that
// compiles perfectly and strands somebody in a room that no longer exists.
//
//   npx electron tools/capture.cjs tools/shots/renamewalk.js

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
const shots = [];

const KEY = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' };

const shoot = async (name) => { shots.push(name); await d.shoot('rw-' + name, 0, 3); };
const ow = () => d.game.scenes.find('overworld');
const at = () => (d.probe().map || '?') + ' ' + (d.probe().pos || '?');
const pos = () => (d.probe().pos || '-1,-1').split(',').map(Number);

/**
 * Single-tile steps with feedback, because a held key overshoots and every one
 * of these rooms has furniture in it. Tries the other axis whenever a step
 * fails, which is enough to get round a table without a real path-finder.
 */
const walkTo = (tx, ty) => {
  let stuck = 0;
  for (let i = 0; i < 120; i++) {
    const [x, y] = pos();
    if (x === tx && y === ty) return true;
    const wantX = x < tx ? 'right' : x > tx ? 'left' : null;
    const wantY = y < ty ? 'down' : y > ty ? 'up' : null;
    const order = stuck % 2 === 0 ? [wantX, wantY] : [wantY, wantX];
    let moved = false;
    for (const dir of order) {
      if (!dir) continue;
      d.walk(dir, 1);
      const [nx, ny] = pos();
      if (nx !== x || ny !== y) { moved = true; break; }
    }
    if (!moved) { stuck++; if (stuck > 6) return false; }
  }
  return false;
};

/** Press through dialogue, photographing the first box once it has typed out. */
const talk = async (name, max = 60) => {
  let first = true;
  for (let i = 0; i < max && top().name === 'dialogue'; i++) {
    if (first && name) { d.tick(70); await shoot(name); first = false; }
    d.key('Enter', 8);
  }
  d.tick(6);
};

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

/* ------------------------------------------------------------- the bedroom */

await talk('01-wake');
out.push('new save opens at ' + at());
await shoot('02-bedroom');

walkTo(10, 3);
d.walk('down', 1);
await d.loadWait(1200);
out.push('down the stairs -> ' + at());

/* ------------------------------------------------------------------ Mira */

walkTo(6, 4);
d.key('KeyA', 6);
d.key('Enter', 12);
await talk('03-mira', 80);
out.push('Mira done: mom_sendoff=' + ow().state.hasFlag('mom_sendoff')
  + ' bag=[' + ow().state.inventory.map((e) => e.item + ' x' + e.count).join(', ') + ']');
await shoot('04-house');

/* ------------------------------------------------- out the door, and Tarin */

walkTo(6, 6);
d.walk('down', 1);
await d.loadWait(1400);
out.push('out the front door -> ' + at());
await shoot('05-hearthmere');

d.walk('down', 1); d.tick(40);
await talk('06-tarin-meets', 200);
d.tick(500);
for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 8);
d.tick(200);
out.push('Tarin scene done: met_tarin=' + ow().state.hasFlag('met_tarin') + ', player at ' + at());
await shoot('07-village-street');

/* --------------------------------------------------------- the signposts */

const goTo = async (map, x, y, f) => {
  d.game.scenes.replaceAll(new (ow().constructor)(ow().state, map, x, y, f || 'up'));
  await d.loadWait(1100);
};
const readSign = async (map, x, y, name) => {
  await goTo(map, x, y + 1, 'up');
  d.key('KeyW', 4);
  d.key('Enter', 12);
  await talk(name, 16);
};

await readSign('hearthmere', 13, 7, '08-village-sign');
await readSign('hearthmere', 24, 17, '09-pond-sign');
await readSign('hearthmere', 17, 7, '10-lab-sign');

/* --------------------------------------------------------- Sorrell's lab */

await goTo('hearthmere', 22, 7, 'up');
d.walk('up', 1);
await d.loadWait(1500);
out.push('through the double door -> ' + at() + ' ("' + ow().map.displayName + '")');
await shoot('11-lab');

// Sorrell stands at (11,4) behind the counter; the floor in front is row 5.
const reached = walkTo(11, 5);
out.push('walked to the counter: ' + reached + ' at ' + at());
d.key('KeyW', 6);
d.key('Enter', 14);
d.tick(70);
await shoot('12-sorrell');
// One loop for the whole exchange: Sorrell talks, the starter scene opens, the
// confirmation is an ask on top of it, then the gifts come back as dialogue.
let shotChoice = false;
for (let i = 0; i < 300 && !ow().state.hasFlag('got_starter'); i++) {
  const n = top().name;
  if (n === 'starter' && !shotChoice) { d.tick(90); await shoot('13-starter-choice'); shotChoice = true; }
  if (n === 'dialogue' || n === 'starter') d.key('Enter', 10);
  else d.tick(10);
}
d.tick(40);
for (let i = 0; i < 80 && top().name === 'dialogue'; i++) {
  if (i === 0) { d.tick(70); await shoot('14-vellum-given'); }
  d.key('Enter', 8);
}
d.tick(30);
// The starter scene finishes on its own timer, so wait for the field to come
// back rather than trying to walk out of a scene that is still on top.
for (let i = 0; i < 150 && top().name !== 'overworld'; i++) {
  if (top().name === 'dialogue' || top().name === 'starter') d.key('Enter', 10);
  else d.tick(10);
}
out.push('scene after the starter exchange: ' + top().name + ' at ' + at());
out.push('got_starter=' + ow().state.hasFlag('got_starter')
  + ' party=[' + ow().state.party.map((k) => k.species + ' L' + k.level + ' met at ' + k.metAt).join(', ') + ']'
  + ' bag=[' + ow().state.inventory.map((e) => e.item + ' x' + e.count).join(', ') + ']');

/* ------------------------------------------------------- out, and the duel */

walkTo(8, 9);
d.walk('down', 1);
await d.loadWait(1500);
out.push('back outside -> ' + at());
// The duel fires on the road below the laboratory door.
walkTo(22, 8);
d.tick(60);
let sawBattle = false;
for (let i = 0; i < 900; i++) {
  const n = top().name;
  if (n === 'battle') { sawBattle = true; d.key('Enter', 6); }
  else if (n === 'dialogue') d.key('Enter', 6);
  else d.tick(6);
  if (d.probe().map === 'hearthmere_house_player' && n === 'overworld') break;
}
for (let i = 0; i < 80 && top().name === 'dialogue'; i++) d.key('Enter', 8);
d.tick(120);
out.push('duel fought=' + sawBattle + ', after it: ' + at()
  + ' tarin_first_done=' + ow().state.hasFlag('tarin_first_done'));

/* ---------------------------------------------------------- the main menu */

// No shot of the coda itself: it ends on a warp home whose fade is still
// running when the script gets control back, so every frame here is black. The
// menu shot below is taken in the same room a moment later and shows it.
for (let i = 0; i < 60 && top().name !== 'overworld'; i++) d.key('Enter', 8);
d.tick(120);
d.key('Tab', 30);
if (top().name !== 'mainmenu') {
  // Mira is still talking, or the fade has not settled. Open it directly:
  // the point of this shot is the Bond Crest counter, not the hotkey.
  const MainMenu = (await import('/build/js/scenes/mainmenu.js')).MainMenuScene;
  d.game.scenes.push(new MainMenu(ow().state, ow().map.displayName ?? ow().map.name));
  d.tick(30);
}
out.push('menu scene: ' + top().name);
await shoot('16-mainmenu');
d.key('Escape', 20);
d.tick(10);

/* ------------------------------------------------------------------ Route 1 */

const state = ow().state;
await goTo('hearthmere', 14, 2, 'up');
walkTo(14, 1);
d.walk('up', 1);
await d.loadWait(1500);
out.push('north out of the village -> ' + at() + ' ("' + ow().map.displayName + '")');
await shoot('17-route1');

await readSign('route_1', 13, 29, '18-route1-sign');
await readSign('route_1', 17, 8, '19-briarbell-milestone');

/* ------------------------------------------------------------------ Briarbell */

await goTo('route_1', 14, 1, 'up');
d.walk('up', 1);
await d.loadWait(1500);
out.push('top of Route 1 -> ' + at() + ' ("' + ow().map.displayName + '")');
await shoot('20-briarbell');

await readSign('briarbell', 16, 34, '21-briarbell-sign');
await readSign('briarbell', 18, 23, '22-briarbell-treesign');
await readSign('briarbell', 10, 7, '23-clinic-sign');

/* -------------------------------------------------------------- the Clinic */

await goTo('briarbell', 7, 8, 'up');
d.walk('up', 1);
await d.loadWait(1500);
out.push('into the healing building -> ' + at()
  + ' ("' + ow().map.displayName + '", name "' + ow().map.name + '")');
await shoot('24-clinic');

d.walk('up', 5); d.walk('left', 2);
out.push('at the Clinic counter: ' + at());
d.key('KeyW', 6);
d.key('Enter', 14);
await talk('25-clinic-keeper', 60);
for (let i = 0; i < 40 && top().name !== 'overworld'; i++) d.key('Enter', 8);
d.tick(20);
out.push('clinic_met=' + state.hasFlag('clinic_met') + ' respawn=' + state.respawnMap);

/* ---------------------------------------------------------------- the chart */

await goTo('briarbell', 14, 30, 'up');
const RegionMap = (await import('/build/js/scenes/regionmap.js')).RegionMapScene;
d.game.scenes.push(new RegionMap(state));
await d.loadWait(1000);
d.tick(40);
await shoot('26-regionmap');
for (let i = 0; i < 8; i++) d.key('KeyD', 6);
d.tick(20);
await shoot('27-regionmap-uncharted');
d.key('Escape', 24);
d.tick(10);

/* --------------------------------------------------------- Route 2, and on */

await goTo('briarbell', 14, 3, 'up');
walkTo(14, 1);
d.walk('up', 1);
await d.loadWait(1500);
out.push('north out of Briarbell -> ' + at() + ' ("' + ow().map.displayName + '")');
await shoot('28-route2');

await goTo('route_2', 14, 1, 'up');
d.walk('up', 1);
await d.loadWait(1500);
out.push('THE SECOND TOWN -> ' + at() + ' ("' + ow().map.displayName + '")');
await shoot('29-kellowmere');

await readSign('kellowmere', 7, 24, '30-kellowmere-sign');
await readSign('kellowmere', 10, 6, '31-hall-sign');

// The greeter at the south gate names the Clinic, the provisioner and the Hall.
await goTo('kellowmere', 16, 25, 'up');
d.key('KeyW', 6);
d.key('Enter', 14);
await talk('32-kellowmere-greeter', 30);

/* ------------------------------------------------------------------ the Hall */

await goTo('kellowmere', 15, 6, 'up');
d.walk('up', 1);
await d.loadWait(1500);
out.push('into the gym -> ' + at()
  + ' ("' + ow().map.displayName + '", name "' + ow().map.name + '")');
await shoot('33-hall');
walkTo(7, 3);
d.key('KeyW', 6);
d.key('Enter', 14);
await talk('34-hallkeeper', 40);

out.push('visited: ' + [...state.toJSON().visited].join(', '));
out.push('shots: ' + shots.length);
return { out, shots };
