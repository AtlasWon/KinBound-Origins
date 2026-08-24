// The three beats added to the battle scene, each sampled densely enough to
// catch it mid-flight: the switch screen with the fighter in the big slot, the
// level-up flourish, and the closing aperture. Everything is shot at 1x --
// these are judged at the size they are played at.
//
// Usage: npx electron tools/capture.cjs tools/shots/battlebeats.js

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
state.party.length = 0;
const a = kinMod.createKin('rilltail', 11, d.game.rng, { originalTrainer: 'player' });
const b = kinMod.createKin('cinderpaw', 14, d.game.rng, { originalTrainer: 'player' });
b.currentHp = Math.round(b.maxHp * 0.62);
const c = kinMod.createKin('pipwing', 9, d.game.rng, { originalTrainer: 'player' });
c.currentHp = 4;
const e = kinMod.createKin('nibbet', 7, d.game.rng, { originalTrainer: 'player' });
e.currentHp = 0;
state.party.push(a, b, c, e);

d.game.settings.battleSpeed = 'brisk';
d.game.settings.textSpeed = 'fast';
d.game.scenes.push(new battleMod.BattleScene({
  state, playerParty: state.party, foeParty: [kinMod.createKin('menhir', 9, d.game.rng)],
  isWild: true, backdrop: 'grass', onFinish: () => { out.push('onFinish ran'); },
}));
d.tick(2);
for (let i = 0; i < 60 && top().phase !== 'menu'; i++) d.key('Enter', 8);
out.push('phase ' + top().phase);

/* ------------------------------------------------- the switch screen */

// Party slot two is the one in the fight, which is the case the old screen got
// wrong: it drew slot ONE in the big card whatever was actually out there.
const scene = top();
scene.battle.player.activeIndex = 1;
scene.view.player.kin = scene.battle.player.party[1];
scene.displayExp = scene.battle.player.party[1].exp;
scene.displayLevel = scene.battle.player.party[1].level;

scene.phase = 'party';
scene.buildPartyMenu();
d.tick(2);
await d.shoot('beat-swap-01', 2);
out.push('swap cursor slot ' + scene.partyMenu.index
  + ' -> party index ' + scene.partyMenu.selectedValue);
d.key('KeyS', 6);
await d.shoot('beat-swap-02', 2);
out.push('after down: slot ' + scene.partyMenu.index
  + ' -> party index ' + scene.partyMenu.selectedValue);
d.key('Escape', 6);

/* --------------------------------------------------- the level-up */

scene.phase = 'anim';
scene.enqueue([
  { t: 'levelUp', kin: scene.battle.player.party[1], level: 15 },
  { t: 'message', text: 'Cinderpaw grew to level 15!' },
], d.game);
for (let i = 0; i < 8; i++) {
  await d.shoot('beat-level-' + String(i).padStart(2, '0'), 0);
  d.tick(9);
}
out.push('level shown as ' + scene.displayLevel);
for (let i = 0; i < 200 && (scene.current || scene.queue.length); i++) d.tick(1);

/* ----------------------------------------------------- the outro */

scene.battle.result = 'win';
scene.phase = 'anim';
scene.current = { kind: 'end' };
d.tick(1);
out.push('phase after end ' + scene.phase);
await d.shoot('beat-outro-00', 10);
await d.shoot('beat-outro-01', 14);
d.key('Enter', 0);
for (let i = 2; i < 12; i++) {
  await d.shoot('beat-outro-' + String(i).padStart(2, '0'), 0);
  d.tick(5);
}
out.push('depth after outro ' + d.game.scenes.depth);

return { out };
