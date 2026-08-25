// Tarin's Act 1, driven end to end: the starter battle outside the lab, the
// Route 1 meeting, and the town scene -- with the ledger flags printed at every
// beat so the off-screen journey can be checked as well as looked at.
//
//   node tools/serve.js                                  # if nothing is on 5173
//   npx electron tools/capture.cjs tools/shots/tarinarc.js
//
// Shots land in build/shots/tarin-*. Change STARTER below and run it again to
// walk the other two branches -- Tarin takes the one the player's beats, so all
// three want checking whenever his opening changes. See docs/TARIN.md.
//
// The Hearthmere trigger tiles are read out of the event data rather than
// written down here, because that map is still being rebuilt and this driver
// has already been broken twice by it moving.
const STARTER = 'sprigling';

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

const R = await import('/build/js/engine/renderer.js');
const tag = R.SCREEN_W + 'x' + R.SCREEN_H;
const kinMod = await import('/build/js/systems/kin.js');
const tarinMod = await import('/build/js/systems/tarin.js');

const ledger = (st) => tarinMod.TARIN_FLAGS.filter((f) => st.hasFlag(f)).join(' ') || '(none)';

const tokens = await import('/build/js/core/tokens.js');

/** Advance dialogue, shooting as we go, and stop the moment a battle starts. */
async function play(prefix, maxBoxes) {
  for (let i = 0; i < maxBoxes; i++) {
    await d.shoot(prefix + '-' + String(i).padStart(2, '0'), 8);
    out.push(prefix + i + ' scene=' + top().name);
    if (top().name === 'battle') return;
    d.key('Enter', 6);
  }
}

/* ---------------------------------------------------------- boot a new game */

await d.loadWait(1400);
// Get to a map by any route the front end offers: title, menu, opening film or
// a save that is already there. All this driver needs is the overworld scene.
for (let i = 0; i < 80 && top().name !== 'overworld'; i++) {
  if (typeof top().rows === 'function') {
    const rows = top().rows();
    if ((rows[top().sel] || {}).action !== 'begin') { d.key('KeyS', 2); continue; }
  }
  d.key('Enter', 20);
}
if (top().name !== 'overworld') throw new Error('never reached a map: scene=' + top().name);

// The opening narration keeps opening text boxes for a while after the map is
// up. Drain until the overworld has been the top scene for a good stretch, or
// the first walk gets swallowed by somebody else's cutscene.
let ow = null;
for (let quiet = 0, i = 0; quiet < 12 && i < 200; i++) {
  if (top().name === 'overworld' && top().state) { ow = top(); quiet++; } else quiet = 0;
  d.key('Enter', 8);
}
if (!ow) throw new Error('never found a settled overworld; scene=' + top().name);
for (let i = 0; i < 60 && top() !== ow; i++) d.key('Enter', 8);

const st = ow.state;
st.setFlag('mom_sendoff');
st.setFlag('met_tarin');
st.setFlag('got_starter');
for (const s of ['sprigling', 'cinderpaw', 'rilltail']) st.setFlag('starter_' + s, s === STARTER);
st.party.length = 0;
st.addKin(kinMod.createKin(STARTER, 6, d.game.rng, { originalTrainer: 'player' }));
st.giveItem('potion', 3);
out.push('ledger after got_starter: ' + ledger(st) + '  where=' + tokens.getToken('tarin_where'));

/* ------------------------------------------- 1. the starter battle, Hearthmere */

// Hearthmere is being rebuilt by somebody else, so the trigger tiles are read
// out of the script rather than written down here. Stand next to one and step
// onto it: loadMap resets lastTile, so landing on a trigger never fires it.
const reg = await import('/build/js/data/registry.js');
await reg.registry.loadScriptsFor(d.game.assets, 'hearthmere');
const trig = reg.registry.scripts.get('hm_tarin_first');
if (!trig) throw new Error('hm_tarin_first has gone from data/events/hearthmere.json');

await ow.loadMap(d.game, 'hearthmere', trig.at[0].x, trig.at[0].y, 'down');
await d.loadWait(700);
const DIRS = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]];
let start = null;
for (const t of trig.at) {
  for (const [dir, dx, dy] of DIRS) {
    const nx = t.x + dx, ny = t.y + dy;
    if (!ow.map.inBounds(nx, ny) || ow.map.collisionAt(nx, ny) !== 0) continue;
    const back = DIRS.find((q) => q[1] === -dx && q[2] === -dy)[0];
    start = { x: nx, y: ny, walk: back, tile: t };
    break;
  }
  if (start) break;
}
if (!start) throw new Error('no walkable tile beside any trigger of hm_tarin_first');
await ow.loadMap(d.game, 'hearthmere', start.x, start.y, start.walk);
await d.loadWait(700);
// Hearthmere may have 'enter' scripts of its own; clear them before stepping.
for (let i = 0; i < 60 && top().name !== 'overworld'; i++) d.key('Enter', 8);
out.push('standing at ' + start.x + ',' + start.y + ', stepping ' + start.walk
  + ' onto trigger ' + start.tile.x + ',' + start.tile.y + ' ' + JSON.stringify(d.probe()));
await d.shoot('tarin-' + tag + '-a00-door', 4);

d.walk(start.walk, 1);
out.push('stepped to ' + JSON.stringify(d.probe()) + ' scene=' + top().name);
for (let i = 1; i <= 6; i++) {
  await d.shoot('tarin-' + tag + '-a' + String(i).padStart(2, '0') + '-run', 9);
}
await play('tarin-' + tag + '-b', 26);

// Whatever we are in now, report it: the battle should have started.
out.push('after the talk: scene=' + top().name);
if (top().name === 'battle') {
  const b = top();
  const foe = b.battle && b.battle.foe && b.battle.foe.active;
  out.push('BATTLE foe=' + (foe ? foe.species + ' L' + foe.level : '?')
    + ' trainer=' + ((b.battle.foe.trainer || {}).id || '?'));
  for (let i = 0; i < 10; i++) {
    await d.shoot('tarin-' + tag + '-c' + String(i).padStart(2, '0') + '-battle', 10);
    d.key('Enter', 6);
  }
}

out.push('ledger after the first battle: ' + ledger(st));

/* ------------------------------------------------ 2. the Route 1 meeting */

// Play the fight and its coda out until the player has the map back.
for (let i = 0; i < 400 && top().name !== 'overworld'; i++) {
  d.key('Enter', 5);
  if (i % 40 === 39) await d.shoot('tarin-' + tag + '-coda-' + i, 6);
}
out.push('back on the map at ' + JSON.stringify(d.probe()));
out.push('mom_rest=' + st.hasFlag('mom_rest'));

// Whatever the battle did to the party, the next beat only needs the flag.
st.setFlag('tarin_first_done');
st.healParty();
// Route 1's own trainers would spot the player on the way up and swallow the
// beat we are here to look at.
for (const t of ['r1_bex', 'r1_madden', 'r1_ottel', 'r1_wray', 'r1_cale', 'concord_surveyor_1']) {
  st.markDefeated(t);
}
const ow2 = ow;
await ow2.loadMap(d.game, 'route_1', 14, 5, 'up');
await d.loadWait(700);
// Route 1 has 'enter' scripts of its own; let them finish before stepping.
for (let i = 0; i < 40 && top().name !== 'overworld'; i++) d.key('Enter', 6);
await d.shoot('tarin-' + tag + '-d00-approach', 4);
d.walk('up', 2);
out.push('route_1 stepped to ' + JSON.stringify(d.probe()) + ' scene=' + top().name);
for (let i = 1; i <= 5; i++) {
  await d.shoot('tarin-' + tag + '-d' + String(i).padStart(2, '0') + '-run', 9);
}
await play('tarin-' + tag + '-e', 24);
out.push('after Route 1: ' + JSON.stringify(d.probe()));
out.push('ledger on Route 1: ' + ledger(st) + '  where=' + tokens.getToken('tarin_where'));

/* ------------------------------------------------- 3. the town check-in */

// Pretend the player has just walked into Briarbell. The map does not exist
// yet, but the ledger only asks whether it has been visited, so this is the
// exact state the Briarbell scene will run in.
st.visitMap('briarbell');
out.push('ledger in Briarbell: ' + ledger(st) + '  where=' + tokens.getToken('tarin_where'));

const ow3 = ow;
// km_tarin stands on the road at (12,16); (12,17) is a wall, so we face him
// from the west along the road.
await ow3.loadMap(d.game, 'kellowmere', 11, 16, 'right');
await d.loadWait(700);
for (let i = 0; i < 40 && top().name !== 'overworld'; i++) d.key('Enter', 6);
await d.shoot('tarin-' + tag + '-f00-town', 4);
out.push('in town at ' + JSON.stringify(d.probe()));
d.key('Enter', 10);
out.push('after talking: scene=' + top().name);
await play('tarin-' + tag + '-g', 34);
out.push('after the town scene: ' + ledger(st)
  + ' briarbell_done=' + st.hasFlag('tarin_briarbell_done')
  + ' potions=' + st.itemCount('strong_potion'));

return { out };
