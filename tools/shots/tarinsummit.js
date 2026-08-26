// Tarin's last battle, driven and looked at: the Stage 7 ledger walked beat by
// beat, then the scene played on the real map, reached by WALKING up the real
// lane rather than by being put on the tile.
//
//   node tools/serve.js                                  # if nothing is on 5173
//   npx electron tools/capture.cjs tools/shots/tarinsummit.js
//
// Shots land in build/shots/t7-*. Change STARTER below and run it again to walk
// the other two branches -- Tarin takes the one the player's beats, so all three
// want checking whenever his teams change. See docs/TARIN.md.
//
// WHY IT WALKS. The scene is delivered by a step trigger on summit_approach
// 12,5 and 13,5, which are the only two tiles the Summit door can be entered
// from (row 4 of that map is solid granite either side of the door). Putting the
// player on the tile would prove nothing about that; walking up the lane from
// the head of the road is the only thing that proves the band cannot be walked
// round. The map is entered at 13,12, in the cleared lane, and the driver holds
// north.
const STARTER = 'sprigling';

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

const R = await import('/build/js/engine/renderer.js');
const tag = R.SCREEN_W + 'x' + R.SCREEN_H;
const kinMod = await import('/build/js/systems/kin.js');
const tarinMod = await import('/build/js/systems/tarin.js');
const tokens = await import('/build/js/core/tokens.js');

const ledger = (st) => tarinMod.TARIN_FLAGS.filter((f) => st.hasFlag(f)).join(' ') || '(none)';

/* ---------------------------------------------------------- boot a new game */

await d.loadWait(1400);
for (let i = 0; i < 80 && top().name !== 'overworld'; i++) {
  if (typeof top().rows === 'function') {
    const rows = top().rows();
    if ((rows[top().sel] || {}).action !== 'begin') { d.key('KeyS', 2); continue; }
  }
  d.key('Enter', 20);
}
if (top().name !== 'overworld') throw new Error('never reached a map: scene=' + top().name);

let ow = null;
for (let quiet = 0, i = 0; quiet < 12 && i < 200; i++) {
  if (top().name === 'overworld' && top().state) { ow = top(); quiet++; } else quiet = 0;
  d.key('Enter', 8);
}
if (!ow) throw new Error('never found a settled overworld; scene=' + top().name);
for (let i = 0; i < 60 && top() !== ow; i++) d.key('Enter', 8);

const st = ow.state;

/* --------------------------- a player who has finished the story and gone up */

for (const s of ['sprigling', 'cinderpaw', 'rilltail']) st.setFlag('starter_' + s, s === STARTER);
st.setFlag('got_starter');
st.setFlag('tarin_first_done');
for (let n = 1; n <= 8; n++) st.giveCrest(n);
st.setFlag('act6_done');

// The party the trainer rows were cut against: the starter at 48 and an
// ordinary road bench two levels down. See the $comment on tarin_summit_*.
st.party.length = 0;
const LEAD = { sprigling: 'thornmarch', cinderpaw: 'volcatrix', rilltail: 'maelstrix' }[STARTER];
st.addKin(kinMod.createKin(LEAD, 48, d.game.rng, { originalTrainer: 'player' }));
for (const sp of ['rimehound', 'craglide', 'tidewrack', 'currentail', 'chalkmar']) {
  st.addKin(kinMod.createKin(sp, 46, d.game.rng, { originalTrainer: 'player' }));
}
out.push('starter=' + STARTER + ' lead=' + LEAD
  + ' party=' + st.party.map((k) => k.species + ' L' + k.level).join(', '));

/* ------------------------------------------------- 1. the ledger, beat by beat */

const step = (label, fn) => {
  fn();
  out.push(label.padEnd(24) + ledger(st) + '  where=' + tokens.getToken('tarin_where'));
};
step('act6 done', () => {});
step('summit_open', () => st.setFlag('summit_open'));
step('ascent_road visited', () => st.visitMap('ascent_road'));
step('ascent_crown visited', () => st.visitMap('ascent_crown'));
step('summit_approach visited', () => st.visitMap('summit_approach'));

/* --------------------------------------- 2. walk up to the door and be stopped */

await ow.loadMap(d.game, 'summit_approach', 13, 12, 'up');
await d.loadWait(700);
for (let i = 0; i < 120 && (ow.events.running || top() !== ow); i++) d.key('Enter', 5);
out.push('on the map at ' + ow.player.tileX + ',' + ow.player.tileY
  + '  running=' + ow.events.running);
await d.shoot('t7-' + tag + '-a00-lane', 8);

for (let i = 0; i < 8 && !ow.events.running; i++) {
  d.walk('up', 1);
  d.key('Enter', 0);
  out.push('  step -> ' + ow.player.tileX + ',' + ow.player.tileY
    + (ow.events.running ? '  TRIGGERED' : ''));
}
if (!ow.events.running) throw new Error('walked to the door and nothing fired');
out.push('tarin on the platform: '
  + (ow.npcs || []).map((n) => n.data.id + '@' + n.actor.tileX + ',' + n.actor.tileY).join(' '));

/* --------------------------------------------------------- 3. play the scene */

async function play(prefix, maxBoxes) {
  for (let i = 0; i < maxBoxes; i++) {
    await d.shoot(prefix + '-' + String(i).padStart(2, '0'), 8);
    if (top().name === 'battle') return 'battle after ' + i + ' boxes';
    if (!ow.events || !ow.events.running) return 'done after ' + i + ' boxes, scene=' + top().name;
    d.key('Enter', 6);
  }
  return 'ranout';
}

let r = await play('t7-' + tag + '-b-gate', 90);
out.push('gate scene: ' + r + '  full_restores=' + st.itemCount('full_restore')
  + '  party hp=' + st.party.map((k) => k.currentHp + '/' + k.maxHp).join(' '));

/* ------------------------------------------------------------ 4. the battle */

if (top().name === 'battle') {
  const b = top();
  const foe = b.battle && b.battle.foe;
  out.push('BATTLE trainer=' + ((foe.trainer || {}).id || '?')
    + ' | ' + (foe.party || []).map((k) => k.species + ' L' + k.level).join(', '));
  for (let i = 0; i < 16; i++) {
    await d.shoot('t7-' + tag + '-c' + String(i).padStart(2, '0') + '-battle', 10);
    d.key('Enter', 6);
  }
  for (let i = 0; i < 1200 && top().name === 'battle'; i++) d.key('Enter', 4);
  out.push('after the battle: scene=' + top().name);
  for (let i = 0; i < 200 && top().name !== 'overworld'; i++) d.key('Enter', 5);
  r = await play('t7-' + tag + '-d-coda', 60);
  out.push('coda: ' + r);
}

out.push('done=' + st.hasFlag('tarin_summit_done')
  + ' won=' + st.hasFlag('tarin_summit_won')
  + ' lost=' + st.hasFlag('tarin_summit_lost'));
out.push('ledger now: ' + ledger(st) + '  where=' + tokens.getToken('tarin_where'));

/* ------------------------------- 5. the rematch, and the branch it cannot lose
 *
 * The driver plays the fight by holding Enter, which is worse than the novice
 * tier the numbers were cut against, so the first pass always loses -- which is
 * useful, because the loss is the branch nobody would otherwise look at. The
 * won branch is then reached the only honest way there is: ask him again, with
 * a party that cannot lose. */
if (st.hasFlag('tarin_summit_lost')) {
  const reg = await import('/build/js/data/registry.js');
  const script = reg.registry.scripts.get('tarin_summit');
  st.party.length = 0;
  st.addKin(kinMod.createKin(LEAD, 90, d.game.rng, { originalTrainer: 'player' }));
  for (let i = 0; i < 200 && (ow.events.running || top() !== ow); i++) d.key('Enter', 5);
  if (!ow.events.start(script)) throw new Error('rematch: tarin_summit refused to start');
  r = await play('t7-' + tag + '-e-rematch', 30);
  out.push('rematch: ' + r);
  if (top().name === 'battle') {
    for (let i = 0; i < 1200 && top().name === 'battle'; i++) d.key('Enter', 4);
    for (let i = 0; i < 200 && top().name !== 'overworld'; i++) d.key('Enter', 5);
    r = await play('t7-' + tag + '-f-rewon', 20);
    out.push('rematch coda: ' + r);
  }
  out.push('after rematch: won=' + st.hasFlag('tarin_summit_won')
    + ' lost=' + st.hasFlag('tarin_summit_lost')
    + '  ' + ledger(st) + '  where=' + tokens.getToken('tarin_where'));
}

/* ----------------------------------- 5. the beats nobody here can set for us */

step('champion', () => st.setFlag('champion'));
step('ending_seen', () => st.setFlag('ending_seen'));

return { out };
