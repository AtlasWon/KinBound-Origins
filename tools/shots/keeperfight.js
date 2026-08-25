// Plays the retuned first-Hall fight in the real game, with the party a
// player raising a team actually walks in with: an unevolved level-13 starter
// and two level-12 catches. Balance work is measured in tests/helpers/
// simulate.mjs, but the simulator drives Battle directly -- this is the only
// way to see that Roxen's rewritten Chalkmar (Gravelspray / Bulwark / Grit
// Field, no STAB attack) actually renders, actually resolves, and does not
// stall a Keeper fight into the turn cap on screen.
//
//   npx electron tools/capture.cjs tools/shots/keeperfight.js
const d = window.dev;
const top = () => d.game.scenes.top;

await d.loadWait(1200);
// Reach the title, then choose NEW JOURNEY deliberately -- the cursor starts
// on CONTINUE whenever a save exists, so pressing Enter blindly loads that
// save and skips the creator entirely.
for (let i = 0; i < 90 && top().name !== 'title'; i++) d.key('Enter', 10);
if (top().name === 'title' && top().menu) { top().menu.index = 0; d.key('Enter', 24); }
for (let i = 0; i < 60 && top().name !== 'creator'; i++) d.key('Enter', 10);
console.log('after title, scene=' + top().name);
for (let i = 0; i < 30; i++) {
  const rows = typeof top().rows === 'function' ? top().rows() : null;
  if (!rows) break;
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1400);
for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const kinMod = await import('/build/js/systems/kin.js');
const battleMod = await import('/build/js/scenes/battle.js');
const state = top().state;
state.party.length = 0;
// Cinderpaw is the starter the third pass was tuned around: Stone and Terra
// both double into Flame, so it is the one every Stone trainer punished.
state.party.push(kinMod.createKin('cinderpaw', 13, d.game.rng, { originalTrainer: 'player' }));
state.party.push(kinMod.createKin('slatewing', 12, d.game.rng, { originalTrainer: 'player' }));
state.party.push(kinMod.createKin('gravelet', 12, d.game.rng, { originalTrainer: 'player' }));

// Built the way overworld.ts builds one, so the per-kin overrides this pass
// added to Roxen's ace (flat-zero IVs, the rewritten moveset) are really in
// play and not just in the JSON.
const { registry } = await import('/build/js/data/registry.js');
const roxen = registry.trainers.get('hall1_roxen');
const foeParty = roxen.party.map((m) => kinMod.createKin(m.species, m.level, d.game.rng, {
  moves: m.moves, ability: m.ability, item: m.item, nature: m.nature,
  ivs: m.ivs, evs: m.evs, originalTrainer: roxen.name,
}));
console.log('ace=' + foeParty[2].species + ' L' + foeParty[2].level
  + ' moves=' + foeParty[2].moves.map((s) => s.id).join(','));

d.game.scenes.push(new battleMod.BattleScene({
  state, playerParty: state.party, foeParty, isWild: false,
  trainerId: 'hall1_roxen', skipIntroLines: true,
  backdrop: 'grass', onFinish: () => {},
}));
d.tick(2);
d.game.settings.battleSpeed = 'brisk';

await d.shoot('keeper-01-intro', 60);

// Play it out pressing the top move, which is what the novice player in the
// simulator does. The scene owns its own menus, so drive it by phase rather
// than by a fixed count of Enters, and step back out of any submenu that a
// stray press opened.
const scene = top();
const { TrainerAI } = await import('/build/js/battle/ai.js');
const you = new TrainerAI('novice', d.game.rng);
let sawAce = false;
let desync = 0;
for (let i = 0; i < 900 && !scene.battle.over; i++) {
  if (top() !== scene) { d.key('Enter', 6); continue; }   // party / bag screens
  if (scene.phase === 'menu') {
    // Play the player side with the SAME novice AI the simulator uses, so an
    // in-game result is comparable with the measured win rate instead of being
    // a third, worse policy. Pressing the raw highest-power move looks like
    // novice play but is not: it ignores the type chart even when the answer
    // is a four-times hit, and it turned a fight the simulator wins 98 times
    // in 100 into a loss.
    const act = you.choose(scene.battle, 'player');
    const best = act.kind === 'move' ? act.index : 0;
    d.key('Enter', 6);   // FIGHT
    for (let k = 0; k < best; k++) d.key('KeyS', 4);
    // The move list is a plain ListMenu, so index == slot -- but a press can be
    // swallowed while the scene is still animating, and a driver that silently
    // fires slot 0 instead of the move it chose looks exactly like a game that
    // is too hard. Count the desyncs and print them with the result.
    if (scene.moveMenu && scene.moveMenu.index !== best) desync++;
    d.key('Enter', 6);
  } else {
    d.key('Enter', 6);   // let the turn play out
  }
  if (!sawAce && scene.battle.foe.active && scene.battle.foe.active.species === 'chalkmar') {
    sawAce = true;
    for (let j = 0; j < 30 && scene.phase !== 'menu'; j++) d.key('Enter', 6);
    await d.shoot('keeper-02-ace', 8);
  }
}
await d.shoot('keeper-03-finish', 20);
console.log('result=' + scene.battle.result + ' desyncs=' + desync + ' turns=' + scene.battle.turn
  + ' foeLeft=' + scene.battle.foe.party.filter((k) => !k.fainted).length
  + ' youLeft=' + scene.battle.player.party.filter((k) => !k.fainted).length);
