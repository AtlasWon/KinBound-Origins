// Every screen owned by the UI pass, loaded with worst-case long names so text
// overlap shows up rather than hiding behind short test data.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

const clear = () => {
  for (let i = 0; i < 24 && top().name === 'dialogue'; i++) d.key('Enter', 8);
  d.tick(4);
};

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
await d.loadWait(1600);
clear();

const kinMod = await import('/build/js/systems/kin.js');
const reg = (await import('/build/js/data/registry.js')).registry;
const state = top().state;

// The longest species name in the game, and moves to match.
const species = [...reg.species.values()];
const longest = species.slice().sort((a, b) => b.name.length - a.name.length);
out.push('longest species: ' + longest.slice(0, 3).map((s) => s.name).join(', '));

const moves = [...reg.moves.values()];
const longMoves = moves.slice().sort((a, b) =>
  (b.name.length + b.description.length) - (a.name.length + a.description.length));
out.push('longest moves: ' + longMoves.slice(0, 4).map((m) => m.name).join(', '));

const mk = (spId, lv, frac, nick) => {
  const k = kinMod.createKin(spId, lv, d.game.rng, { originalTrainer: 'player' });
  if (nick) k.nickname = nick;
  k.currentHp = Math.max(0, Math.round(k.maxHp * frac));
  // Stack the four wordiest moves onto the lead so the summary is stressed.
  k.moves = longMoves.slice(0, 4).map((m) => ({ id: m.id, pp: m.pp, maxPp: m.pp }));
  return k;
};

state.party.length = 0;
state.party.push(
  mk(longest[0].id, 100, 0.55),
  mk(longest[1].id, 100, 0.12),
  mk(longest[2].id, 88, 0),
  mk(longest[3].id, 7, 1),
  mk(longest[4].id, 64, 0.8),
  mk(longest[5].id, 41, 0.33),
);
state.party[0].heldItem = 'warden_vessel';
state.party[1].status = 'paralysis';
state.party[4].status = 'toxic';
state.money = 999999;
for (const it of reg.items.values()) state.giveItem(it.id, 99);
for (const sp of species) { state.seen.add(sp.id); }
species.slice(0, 30).forEach((sp) => state.caught.add(sp.id));

// ------------------------------------------------------------- main menu
d.key('Tab', 20);
out.push('scene: ' + top().name);
await d.shoot('ui-01-mainmenu', 6);

// ------------------------------------------------------------------ party
d.key('KeyP', 24);
out.push('scene: ' + top().name);
await d.shoot('ui-02-party', 10);
d.key('KeyS', 8);
await d.shoot('ui-03-party-bench', 8);
d.key('Enter', 10);
await d.shoot('ui-04-party-actions', 8);
d.key('Escape', 8);

// ---------------------------------------------------------------- summary
const partyMod = await import('/build/js/scenes/party.js');
d.game.scenes.push(new partyMod.SummaryScene(state.party[0]));
d.tick(4);
await d.shoot('ui-05-summary-stats', 6);
d.key('KeyD', 6);
await d.shoot('ui-06-summary-moves', 6);
d.key('KeyD', 6);
await d.shoot('ui-07-summary-record', 6);
d.key('Escape', 8);
d.key('Escape', 10);

// -------------------------------------------------------------------- bag
d.key('KeyI', 20);
out.push('scene: ' + top().name);
await d.shoot('ui-08-bag-items', 8);
d.key('KeyX', 8);
await d.shoot('ui-09-bag-vessels', 8);
d.key('KeyX', 8);
await d.shoot('ui-10-bag-key', 8);
d.key('Escape', 10);

// ----------------------------------------------------------------- vellum
d.key('KeyC', 20);
out.push('scene: ' + top().name);
await d.shoot('ui-11-vellum', 8);
for (let i = 0; i < 6; i++) d.key('KeyS', 4);
await d.shoot('ui-12-vellum-scrolled', 8);
d.key('Escape', 10);

// ------------------------------------------------------------------- save
const saveSys = await import('/build/js/systems/save.js');
saveSys.save(1, state, 'Cinderfall Works Approach and the Long Stair', 987654);
saveSys.save(2, state, 'Marrow Hollow', 4321);
const saveMod = await import('/build/js/scenes/saveScene.js');
d.game.scenes.push(new saveMod.SaveScene(state, 'Cinderfall Works Approach and the Long Stair'));
d.tick(6);
await d.shoot('ui-13-save', 8);
d.key('KeyS', 8);
await d.shoot('ui-13b-save-slot2', 8);
d.key('Escape', 8);

// ---------------------------------------------------------------- options
const optMod = await import('/build/js/scenes/options.js');
d.game.scenes.push(new optMod.OptionsScene());
d.tick(6);
await d.shoot('ui-14-options-game', 8);
d.key('KeyX', 8);
await d.shoot('ui-15-options-keys', 8);
for (let i = 0; i < 10; i++) d.key('KeyS', 3);
await d.shoot('ui-16-options-keys-scrolled', 8);
d.key('Escape', 8);

// ------------------------------------------------------------------- shop
const shopMod = await import('/build/js/scenes/shop.js');
d.game.scenes.push(new shopMod.ShopScene(state, 'kellowmere_provisioner'));
d.tick(6);
await d.shoot('ui-17-shop-root', 8);
d.key('Enter', 8);
await d.shoot('ui-18-shop-buy', 8);
d.key('Enter', 8);
for (let i = 0; i < 6; i++) d.key('KeyD', 3);
await d.shoot('ui-19-shop-quantity', 8);
d.key('Escape', 6);
d.key('Escape', 6);
d.key('KeyS', 6);
d.key('Enter', 8);
await d.shoot('ui-20-shop-sell', 8);
d.key('Escape', 8);
d.key('Escape', 8);

// --------------------------------------------------------------- dialogue
const dlg = await import('/build/js/ui/dialogue.js');
d.game.scenes.push(new dlg.DialogueScene([
  'The Warden of the Cinderfall Works will not see you without a seal.',
  'Come back when you have one, and bring something to trade.',
], { who: 'Quartermaster Ellowbrand' }));
d.tick(80);
await d.shoot('ui-21-dialogue', 6);
d.key('Enter', 6);
d.tick(80);
await d.shoot('ui-22-dialogue-page2', 6);
for (let i = 0; i < 8 && top().name === 'dialogue'; i++) d.key('Enter', 8);
out.push('after dialogue: ' + top().name);

d.game.scenes.push(new dlg.DialogueScene([
  'Will you hand over the Bladderwrack you are carrying, all of it, right now?',
], { who: 'Warden', choices: ['Yes, take the whole lot', 'No, not a chance'] }));
d.tick(120);
d.key('Enter', 8);
d.key('Enter', 8);
out.push('choosing: ' + !!top().choosing);
await d.shoot('ui-23-dialogue-choices', 6);
for (let i = 0; i < 8 && top().name === 'dialogue'; i++) d.key('Enter', 8);

// The trainer card, which is a dialogue box full of measured rows.
for (let i = 0; i < 6 && top().name !== 'mainmenu'; i++) d.key('Escape', 8);
if (top().name === 'mainmenu') {
  for (let i = 0; i < 10; i++) {
    if (top().menu && top().menu.selectedValue === 'trainer') break;
    d.key('KeyS', 4);
  }
  d.key('Enter', 20);
  d.tick(120);
  await d.shoot('ui-24-trainer-card', 6);
}

return { out };
