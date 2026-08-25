// A real level-up, reached the way a player reaches one: a level forty
// attacker knocks out a level three, the experience bar runs up, the band ends
// and the flourish fires. Faking the event was enough to draw the effect and
// not enough to prove the bar, the panel number and the queue order are right.
//
// Usage: npx electron tools/capture.cjs tools/shots/levelreal.js

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
state.party.length = 0;
const hero = kinMod.createKin('cinderpaw', 12, d.game.rng, { originalTrainer: 'player' });
const { expForLevel } = await import('/build/js/battle/formulas.js');
// Five points short of the next band, so one knockout carries it over.
hero.exp = expForLevel(hero.growthRate, hero.level + 1) - 5;
state.party.push(hero);

d.game.settings.battleSpeed = 'classic';
d.game.settings.textSpeed = 'fast';
d.game.scenes.push(new battleMod.BattleScene({
  state, playerParty: state.party, foeParty: [kinMod.createKin('nibbet', 6, d.game.rng)],
  isWild: true, backdrop: 'grass', onFinish: () => {},
}));
d.tick(2);
const s = top();
for (let i = 0; i < 400 && s.phase !== 'menu'; i++) {
  if (s.current && s.current.kind === 'text') d.key('Enter', 0); else d.tick(1);
}

// One hit ends it.
s.battle.foe.active.currentHp = 1;
out.push('before Lv' + hero.level + ' exp ' + hero.exp);
s.submit(d.game, { kind: 'move', index: 0 });

// Walk to the level-up step without pressing anything: confirm is the skip key.
let found = false;
for (let i = 0; i < 1200; i++) {
  if (s.current && s.current.kind === 'levelUp') { found = true; break; }
  d.tick(1);
}
out.push('reached levelUp: ' + found + ' -> Lv' + hero.level);
for (let i = 0; i < 10; i++) {
  await d.shoot('real-level-' + String(i).padStart(2, '0'), 0);
  d.tick(8);
}
out.push('panel shows Lv' + s.displayLevel + ', exp bar at ' + s.displayExp + '/' + hero.exp);


/* ------------------------- and straight on into the close */

for (let i = 0; i < 900 && s.phase !== 'finished'; i++) {
  if (s.current && s.current.kind === 'text') d.key('Enter', 0); else d.tick(1);
}
out.push('finished: ' + (s.phase === 'finished') + ' cheer ' + s.cheer);
for (let i = 0; i < 5; i++) { await d.shoot('real-cheer-' + i, 0); d.tick(6); }
d.key('Enter', 0);
for (let i = 0; i < 10; i++) {
  await d.shoot('real-outro-' + String(i).padStart(2, '0'), 0);
  d.tick(5);
}
out.push('depth ' + d.game.scenes.depth);
return { out };
