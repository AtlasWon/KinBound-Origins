// Battle-screen jobs: status badges, the HP/XP stack, the vessel throw, the bag.
//
// The battle is pushed straight onto the stack over a state built here, rather
// than walked to through the title and the creator: those scenes belong to
// other people this week and their key sequence keeps moving.
const d = window.dev;
const top = () => d.game.scenes.top;

await d.loadWait(1600);

const stateMod = await import('/build/js/systems/state.js');
const kinMod = await import('/build/js/systems/kin.js');
const battleMod = await import('/build/js/scenes/battle.js');

const state = new stateMod.GameState();
// A long name, a gender mark and a two-digit level, all at once -- the worst
// case the player's panel has to survive.
const mine = kinMod.createKin('cinderpaw', 47, d.game.rng, { originalTrainer: 'player' });
mine.gender = 'female';
state.party.push(mine);
const foe = [kinMod.createKin('rilltail', 46, d.game.rng)];

// One of everything usable, so the icon column is exercised.
for (const id of ['field_vessel', 'potion', 'great_potion', 'strong_potion',
  'clearleaf', 'full_heal', 'rouse', 'tonic_berry']) {
  state.inventory.push({ item: id, count: 9 });
}

d.game.scenes.push(new battleMod.BattleScene({
  state, playerParty: state.party, foeParty: foe, isWild: true,
  backdrop: 'grass', onFinish: () => {},
}));
d.tick(2);
d.game.settings.battleSpeed = 'fast';
for (let i = 0; i < 40 && top().phase !== 'menu'; i++) d.key('Enter', 12);

const scene = top();
const out = ['phase:' + scene.phase];

// ---- job 1: every status badge, on both panels at once.
const STATUS = ['burn', 'freeze', 'paralysis', 'poison', 'toxic', 'sleep'];
for (const s of STATUS) {
  scene.view.player.kin.status = s;
  scene.view.foe.kin.status = s;
  await d.shoot('j1-' + s, 2);
  await d.shoot('j1-' + s + '-x4', 0, 4);
}

// ---- job 2: the player panel with HP text, exp bar and a badge together.
scene.view.player.kin.status = 'poison';
scene.view.player.displayHp = scene.view.player.kin.maxHp * 0.44;
await d.shoot('j2-panel', 2);
await d.shoot('j2-panel-x4', 0, 4);
scene.view.player.kin.status = 'none';
scene.view.foe.kin.status = 'none';
await d.shoot('j2-clean', 2);

// ---- job 4: the bag.
scene.actionMenu.index = 1;           // BAG
out.push('action-sel:' + JSON.stringify(scene.actionMenu.selectedValue));
d.key('Enter', 6);
out.push('bag-phase:' + scene.phase + ' rows:' + scene.bagMenu.visible);
await d.shoot('j4-bag', 2);
await d.shoot('j4-bag-x4', 0, 4);
d.key('KeyS', 4); d.key('KeyS', 4); d.key('KeyS', 4);
await d.shoot('j4-bag-scrolled', 2);
d.key('Escape', 6);

// ---- job 3: the vessel throw, frame by frame.
for (let i = 0; i < 30 && scene.phase !== 'menu'; i++) d.key('Enter', 8);
d.game.settings.battleSpeed = 'classic';
scene.queue.length = 0;
scene.current = {
  kind: 'vessel', shakes: 3, caught: true, icon: 'vessel_field',
  ph: { throw: 26, suck: 34, settle: 22, wobble: 20, finish: 40 },
  frames: 26 + 34 + 22 + 60 + 40, t: 0,
};
scene.phase = 'anim';
for (let i = 0; i < 22; i++) await d.shoot('j3-' + String(i).padStart(2, '0'), 8);

// A send-out, which is the vessel animation the player sees most.
scene.queue.length = 0;
scene.current = null;
scene.view.foe.kin = foe[0];
scene.current = {
  kind: 'sendOut', side: 'foe', kin: foe[0], hp: foe[0].hp, exp: foe[0].exp,
  level: foe[0].level, frames: 96, t: 0,
};
scene.phase = 'anim';
for (let i = 0; i < 16; i++) await d.shoot('j3s-' + String(i).padStart(2, '0'), 6);

return { out };
