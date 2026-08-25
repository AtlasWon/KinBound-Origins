// A whole turn played straight through, plus the menus either side of it, to
// check the panel rework did not disturb anything it sits next to.
const d = window.dev;
const top = () => d.game.scenes.top;

await d.loadWait(1600);
const stateMod = await import('/build/js/systems/state.js');
const kinMod = await import('/build/js/systems/kin.js');
const battleMod = await import('/build/js/scenes/battle.js');

const state = new stateMod.GameState();
state.party.push(kinMod.createKin('cinderpaw', 14, d.game.rng, { originalTrainer: 'player' }));
state.party.push(kinMod.createKin('pebblet', 12, d.game.rng, { originalTrainer: 'player' }));
state.inventory.push({ item: 'potion', count: 3 });
state.inventory.push({ item: 'field_vessel', count: 5 });
const foe = [kinMod.createKin('rilltail', 5, d.game.rng)];

d.game.scenes.push(new battleMod.BattleScene({
  state, playerParty: state.party, foeParty: foe, isWild: true,
  backdrop: 'grass', onFinish: () => {},
}));
d.tick(2);
d.game.settings.battleSpeed = 'fast';
const scene = top();
for (let i = 0; i < 40 && scene.phase !== 'menu'; i++) d.key('Enter', 12);

await d.shoot('tn-00-menu', 4);
scene.actionMenu.index = 2;                    // KIN
d.key('Enter', 6);
await d.shoot('tn-01-party', 4);
d.key('Escape', 6);
scene.actionMenu.index = 0;                    // FIGHT
d.key('Enter', 6);
await d.shoot('tn-02-moves', 4);
d.key('Enter', 6);
for (let i = 0; i < 26; i++) await d.shoot('tn-03-' + String(i).padStart(2, '0'), 10);
return { phase: scene.phase, foeHp: foe[0].hp, lvl: state.party[0].level };
