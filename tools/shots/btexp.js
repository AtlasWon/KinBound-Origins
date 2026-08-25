// The experience meter with something in it, which is the only way to see that
// it has cleared the HP readout above it.
const d = window.dev;
await d.loadWait(1600);
const stateMod = await import('/build/js/systems/state.js');
const kinMod = await import('/build/js/systems/kin.js');
const battleMod = await import('/build/js/scenes/battle.js');
const fmt = await import('/build/js/battle/formulas.js');

const state = new stateMod.GameState();
const mine = kinMod.createKin('cinderpaw', 47, d.game.rng, { originalTrainer: 'player' });
state.party.push(mine);
const foe = [kinMod.createKin('rilltail', 46, d.game.rng)];
d.game.scenes.push(new battleMod.BattleScene({
  state, playerParty: state.party, foeParty: foe, isWild: true,
  backdrop: 'grass', onFinish: () => {},
}));
d.tick(2);
const scene = d.game.scenes.top;
d.game.settings.battleSpeed = 'fast';
for (let i = 0; i < 40 && scene.phase !== 'menu'; i++) d.key('Enter', 12);

const cur = fmt.expForLevel(mine.growthRate, 47);
const next = fmt.expForLevel(mine.growthRate, 48);
scene.displayExp = Math.round(cur + (next - cur) * 0.62);
scene.view.player.kin.status = 'burn';
scene.view.player.displayHp = 7;
await d.shoot('xp-01', 2);
await d.shoot('xp-01-x4', 0, 4);
return { cur, next, shown: scene.displayExp };
