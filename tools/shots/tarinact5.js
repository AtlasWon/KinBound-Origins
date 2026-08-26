// Tarin's Act 5, driven and looked at: the ledger walked beat by beat, then the
// three scenes played on screen -- the Frostmere fight (including the battle),
// the Observatory, and the agreement at Crownspire.
//
//   node tools/serve.js                                  # if nothing is on 5173
//   npx electron tools/capture.cjs tools/shots/tarinact5.js
//
// Shots land in build/shots/t5-*. Change STARTER below and run it again to walk
// the other two branches -- Tarin takes the one the player's beats, so all three
// want checking whenever his teams change. See docs/TARIN.md.
//
// WHY IT STAGES THE SCENES RATHER THAN WALKING TO THEM. Frostmere, Skyreach and
// the Observatory are being built by other agents this week and did not exist
// when this was written; Crownspire's map landed mid-pass. The scenes are
// therefore started through the event runner on a map that has shipped, which is
// exactly what overworld.interact does with them and is the only part of the
// staging that matters -- none of the three moves an actor, so none of them
// needs the actor to be standing there to run. When the towns land, point their
// town_tarin at tarin_town and this driver still checks the same thing.
const STARTER = 'sprigling';

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

const R = await import('/build/js/engine/renderer.js');
const tag = R.SCREEN_W + 'x' + R.SCREEN_H;
const kinMod = await import('/build/js/systems/kin.js');
const tarinMod = await import('/build/js/systems/tarin.js');
const tokens = await import('/build/js/core/tokens.js');
const reg = await import('/build/js/data/registry.js');

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

/* ------------------------------------- a player who has just left the capital */

// The Act 4 close, exactly: five Crests, the bag empty, the theft real.
for (const s of ['sprigling', 'cinderpaw', 'rilltail']) st.setFlag('starter_' + s, s === STARTER);
st.setFlag('got_starter');
st.setFlag('tarin_first_done');
st.setFlag('tideheart_taken');
for (let n = 1; n <= 5; n++) st.giveCrest(n);
st.party.length = 0;
const LEAD = { sprigling: 'thornmarch', cinderpaw: 'volcatrix', rilltail: 'maelstrix' }[STARTER];
st.addKin(kinMod.createKin(LEAD, 37, d.game.rng, { originalTrainer: 'player' }));
for (const [sp, lv] of [['weaverjaw', 36], ['craglide', 36], ['currentail', 36]]) {
  st.addKin(kinMod.createKin(sp, lv, d.game.rng, { originalTrainer: 'player' }));
}
st.giveItem('potion', 5);
out.push('starter=' + STARTER + ' lead=' + LEAD);
out.push('act4 close: ' + ledger(st) + '  where=' + tokens.getToken('tarin_where'));

/* ------------------------------------------------- 1. the ledger, beat by beat */

const step = (label, fn) => {
  fn();
  out.push(label.padEnd(22) + ledger(st) + '  where=' + tokens.getToken('tarin_where'));
};
step('route_8 visited', () => st.visitMap('route_8'));
step('frostmere visited', () => st.visitMap('frostmere'));
step('message heard', () => st.setFlag('act5_elias_message'));
step('skyreach visited', () => st.visitMap('skyreach'));
step('crest 7', () => st.giveCrest(7));
step('crownspire visited', () => st.visitMap('crownspire'));
step('crest 8', () => st.giveCrest(8));

/* ------------------------------------------------- 2. play the three scenes */

const script = reg.registry.scripts.get('tarin_town');
if (!script) throw new Error('tarin_town is not loaded');

/** Page a scene, shooting each box, and stop when the map or a battle takes over. */
async function play(prefix, maxBoxes) {
  for (let i = 0; i < maxBoxes; i++) {
    await d.shoot(prefix + '-' + String(i).padStart(2, '0'), 8);
    if (top().name === 'battle') return 'battle after ' + i + ' boxes';
    if (!ow.events || !ow.events.running) return 'done after ' + i + ' boxes, scene=' + top().name;
    d.key('Enter', 6);
  }
  return 'ranout';
}

/**
 * Put the ledger on one beat and start the shared town script from it.
 *
 * The idle wait is not politeness. EventRunner.start returns false when
 * something else is already running, and a boot that has left one box open
 * silently swallowed the whole Frostmere scene on one pass out of three --
 * which read as a content bug and was not one.
 */
async function scene(prefix, setup, maxBoxes) {
  setup();
  // STAGE SOMEWHERE WITH NO SCRIPTS OF ITS OWN. Two passes out of five paged
  // Sorrell's lab at the shared script instead of the Tarin scene, because the
  // boot does not always finish in the same room and every room in Hearthmere
  // has an enter script in it. tideglass_warehouse has no events file at all.
  await ow.loadMap(d.game, 'tideglass_warehouse', 9, 4, 'down');
  await d.loadWait(700);
  for (let i = 0; i < 200 && (ow.events.running || top() !== ow); i++) d.key('Enter', 5);
  if (ow.events.running) throw new Error(prefix + ': something else is still running');
  out.push(prefix + ' beat: ' + ledger(st));
  if (!ow.events.start(script)) throw new Error(prefix + ': tarin_town refused to start');
  return play(prefix, maxBoxes);
}

// -- Frostmere. Roll the ledger back to the beat he is waiting in.
st.crests.delete(7);
st.crests.delete(8);
st.flags.delete('act5_elias_message');
st.visited.delete('skyreach');
st.visited.delete('crownspire');
st.syncTarin();
let r = await scene('t5-' + tag + '-a-frostmere', () => {}, 30);
out.push('frostmere scene ended: ' + r + ' scene=' + top().name
  + ' great_potions=' + st.itemCount('great_potion'));

if (top().name === 'battle') {
  const b = top();
  const foe = b.battle && b.battle.foe;
  out.push('BATTLE trainer=' + ((foe.trainer || {}).id || '?')
    + ' party=' + (foe.party || []).map((k) => k.species + ' L' + k.level).join(', '));
  for (let i = 0; i < 14; i++) {
    await d.shoot('t5-' + tag + '-b' + String(i).padStart(2, '0') + '-battle', 10);
    d.key('Enter', 6);
  }
  for (let i = 0; i < 600 && top().name === 'battle'; i++) d.key('Enter', 4);
  out.push('after the battle: scene=' + top().name);
  r = await play('t5-' + tag + '-c-after', 20);
  out.push('coda: ' + r + ' frostmere_done=' + st.hasFlag('tarin_frostmere_done'));
}

// -- the Observatory. No jokes.
for (let i = 0; i < 200 && top().name !== 'overworld'; i++) d.key('Enter', 5);
st.healParty();
r = await scene('t5-' + tag + '-d-observatory', () => st.setFlag('act5_elias_message'), 20);
out.push('observatory ended: ' + r + ' done=' + st.hasFlag('tarin_observatory_done'));

// -- Crownspire. The agreement.
for (let i = 0; i < 200 && top().name !== 'overworld'; i++) d.key('Enter', 5);
r = await scene('t5-' + tag + '-e-crownspire', () => {
  st.visitMap('skyreach');
  st.giveCrest(7);
  st.visitMap('crownspire');
  st.giveCrest(8);
}, 34);
out.push('crownspire ended: ' + r + ' done=' + st.hasFlag('tarin_summit_pact_done'));
out.push('final ledger: ' + ledger(st) + '  where=' + tokens.getToken('tarin_where'));

return { out };
