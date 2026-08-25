// The player's own vessel: a send-out over the near pad, which is the one that
// has to rise past the foe's status panel, and the recall that follows it.
const d = window.dev;
const top = () => d.game.scenes.top;

await d.loadWait(1600);
const stateMod = await import('/build/js/systems/state.js');
const kinMod = await import('/build/js/systems/kin.js');
const battleMod = await import('/build/js/scenes/battle.js');

const state = new stateMod.GameState();
state.party.push(kinMod.createKin('cinderpaw', 24, d.game.rng, { originalTrainer: 'player' }));
state.party.push(kinMod.createKin('pebblet', 22, d.game.rng, { originalTrainer: 'player' }));
const foe = [kinMod.createKin('rilltail', 22, d.game.rng)];

d.game.scenes.push(new battleMod.BattleScene({
  state, playerParty: state.party, foeParty: foe, isWild: true,
  backdrop: 'grass', onFinish: () => {},
}));
d.tick(2);
d.game.settings.battleSpeed = 'classic';

const scene = top();
for (let i = 0; i < 40 && scene.phase !== 'menu'; i++) d.key('Enter', 10);

const mine = scene.view.player.kin;
scene.queue.length = 0;
scene.current = {
  kind: 'sendOut', side: 'player', kin: mine, hp: mine.hp, exp: mine.exp,
  level: mine.level, frames: 100, t: 0,
};
scene.phase = 'anim';
for (let i = 0; i < 18; i++) await d.shoot('pv-' + String(i).padStart(2, '0'), 6);

for (let i = 0; i < 40 && scene.phase !== 'menu'; i++) d.key('Enter', 10);
scene.queue.length = 0;
scene.current = { kind: 'withdraw', side: 'player', frames: 80, t: 0 };
scene.phase = 'anim';
for (let i = 0; i < 14; i++) await d.shoot('pw-' + String(i).padStart(2, '0'), 6);

return { phase: scene.phase };
