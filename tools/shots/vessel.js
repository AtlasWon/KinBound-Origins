// The other two halves of the same mechanism: a knockout and a capture.
//
// Both used to share the send-out's crop -- an edge travelling across the
// artwork -- so both have to be looked at with the same eyes. Shot every other
// frame on a drawn species and a generated one.
//
// Usage: npx electron tools/capture.cjs tools/shots/vessel.js

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(1400);
// Press through the title, the menu and the cinematic until the creator is
// actually on top. A fixed count of Enters broke when the menu gained a
// transition into the cinematic and moved the beat this landed on.
for (let i = 0; i < 80 && top().name !== 'creator'; i++) d.key('Enter', 12);
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
// Only vessels in the bag, so "the first usable item" is unambiguous.
state.inventory.length = 0;
state.giveItem('field_vessel', 20);

const until = (ok, limit = 900) => {
  for (let i = 0; i < limit; i++) {
    if (ok()) return true;
    d.tick(1);
  }
  return false;
};
const isKind = (k) => () => { const a = top().current; return Boolean(a) && a.kind === k; };

async function fight(tag, mine, theirs, capture) {
  state.party.length = 0;
  state.party.push(kinMod.createKin(mine, 40, d.game.rng, { originalTrainer: 'player' }));
  const foe = [kinMod.createKin(theirs, 3, d.game.rng)];
  d.game.scenes.push(new battleMod.BattleScene({
    state, playerParty: state.party, foeParty: foe, isWild: true,
    backdrop: 'grass', onFinish: () => {},
  }));
  until(() => top().phase === 'menu');

  if (capture) {
    d.key('KeyS', 4);                    // FIGHT -> BAG
    d.key('Enter', 8);
    d.key('Enter', 6);                   // first usable item: a vessel
    out.push(tag + ' vessel found: ' + until(isKind('vessel')));
    for (let i = 0; i < 26; i++) await d.shoot(tag + '-catch-' + String(i).padStart(2, '0'), 2, 2);
  } else {
    // A level forty attacker against a level three: one move ends it.
    d.key('Enter', 8);
    d.key('Enter', 4);
    out.push(tag + ' faint found: ' + until(isKind('faint')));
    for (let i = 0; i < 22; i++) await d.shoot(tag + '-faint-' + String(i).padStart(2, '0'), 2, 2);
  }

  until(() => top().phase === 'finished' || top().phase === 'menu', 400);
  d.game.scenes.pop();
  d.tick(2);
}

await fight('drawn', 'blazelynx', 'rilltail', false);
await fight('drawnc', 'blazelynx', 'nibbet', true);
await fight('gen', 'pebblet', 'tuftail', false);
await fight('genc', 'pebblet', 'menhir', true);

return { out };
