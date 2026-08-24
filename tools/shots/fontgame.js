// The spacing fix seen on real screens rather than on a specimen sheet:
// the party list, the battle command pad and move list, a dialogue box and the
// creature summary, all carrying names full of i and l.
//
//   npx electron tools/capture.cjs tools/shots/fontgame.js

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
const shot = async (name, ticks) => { out.push(name + '@' + top().name); return d.shoot(name, ticks); };

await d.loadWait(1400);

// Title -> opening -> creator.
for (let i = 0; i < 8 && top().name !== 'creator'; i++) d.key('Enter', 20);
out.push('at ' + top().name);
if (top().name === 'creator') {
  await shot('fg-00-creator', 8);
  // Walk the option list down to Begin and take it.
  for (let i = 0; i < 22; i++) d.key('KeyS', 2);
  d.key('Enter', 40);
}
await d.loadWait(1600);
for (let i = 0; i < 24 && top().name === 'dialogue'; i++) d.key('Enter', 10);
out.push('after intro: ' + top().name);

const state = top().state;
if (!state) return { out, error: 'no state on ' + top().name };

const kinMod = await import('/build/js/systems/kin.js');
const mk = (sp, lv, frac, moves) => {
  const k = kinMod.createKin(sp, lv, d.game.rng, { originalTrainer: 'player' });
  if (frac !== undefined) k.currentHp = Math.max(1, Math.round(k.maxHp * frac));
  // The longest move names in the game, so a panel that is one pixel short
  // shows it here rather than in someone's save.
  if (moves) k.setMoves(moves);
  return k;
};
state.party.length = 0;
state.party.push(
  mk('sprigling', 12, 0.55, ['creeping_dose', 'earthing_wire', 'tailwind_call', 'fissure_step']),
  mk('cinderpaw', 11, 0.2), mk('rilltail', 14, 1),
  mk('bristlebuck', 9, 0.7), mk('anchorling', 16, 0.9), mk('chalkid', 7, 0.4),
);

// The party list and one creature's summary pages.
const partyMod = await import('/build/js/scenes/party.js');
d.game.scenes.push(new partyMod.PartyScene(state));
await shot('fg-01-party', 12);
d.key('KeyS', 8);
await shot('fg-02-party-second', 8);
d.game.scenes.pop();
d.tick(2);
d.game.scenes.push(new partyMod.SummaryScene(state.party[0]));
await shot('fg-07-summary-1', 10);
d.key('KeyD', 8);
await shot('fg-08-summary-2', 8);
d.key('KeyD', 8);
await shot('fg-09-summary-3', 8);
d.game.scenes.pop();
d.tick(2);

// A battle, for the command pad, the move list and the message line.
const battleMod = await import('/build/js/scenes/battle.js');
d.game.scenes.push(new battleMod.BattleScene({
  state, playerParty: state.party, foeParty: [mk('maelstrix', 13)],
  isWild: true, backdrop: 'grass', onFinish: () => {},
}));
d.tick(2);
d.game.settings.battleSpeed = 'classic';
await shot('fg-03-battle-intro', 60);
for (let i = 0; i < 20 && top().phase !== 'menu'; i++) d.key('Enter', 12);
await shot('fg-04-battle-menu', 6);
d.key('Enter', 10);
await shot('fg-05-battle-moves', 6);
d.key('KeyS', 4);
await shot('fg-06-battle-moves-2', 6);

// The move panel on its own, four times up, to judge the letter gaps.
const buf = d.game.renderer.buffer;
const cv = document.createElement('canvas');
cv.width = 260 * 4; cv.height = 84 * 4;
const cx = cv.getContext('2d');
cx.imageSmoothingEnabled = false;
cx.drawImage(buf, 0, buf.height - 84, 260, 84, 0, 0, cv.width, cv.height);
await fetch('/__shot/fg-10-movepanel-4x', { method: 'POST', body: cv.toDataURL('image/png') });

return { out };
