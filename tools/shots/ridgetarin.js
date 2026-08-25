/*
 * Proves the two story beats the ridge owns actually fire.
 *
 *  1. The convoy sighting on entering route_3 with the Stone Crest taken
 *     (act2_ridge_convoy_r3 in data/events/common.json).
 *  2. TARIN on the crest -- walked into, not interacted with, because the step
 *     band in data/events/route_3.json is what makes the meeting unmissable.
 *
 * Both are checked by reading the flags the scenes set, not by looking at a
 * picture: a scene that draws and never sets its flag is the failure that
 * matters.
 *
 *   npx electron tools/capture.cjs tools/shots/ridgetarin.js
 */
const d = window.dev;
const top = () => d.game.scenes.top;
const log = [];
const note = (s) => log.push(s);
const flag = (f) => !!top().state?.hasFlag?.(f);
// Press through whatever is on screen. NOT a while-loop on scene.name: these
// scenes have wait actions in them, and a driver that stops the moment the
// dialogue box blinks leaves the script half-run and its flag unset -- which
// looks exactly like a beat that does not fire.
const clear = (n = 90) => {
  for (let i = 0; i < n; i++) { d.key('Enter', 8); d.tick(6); }
  d.tick(8);
};

await d.loadWait(1400);
for (let i = 0; i < 90 && top().name !== 'title'; i++) d.key('Enter', 10);
if (top().name === 'title' && top().menu) { top().menu.index = 0; d.key('Enter', 24); }
for (let i = 0; i < 60 && top().name !== 'creator'; i++) d.key('Enter', 10);
for (let i = 0; i < 30 && top().name === 'creator'; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') { d.key('Enter', 40); break; }
  d.key('KeyS', 2);
}
await d.loadWait(1600);
clear();

const state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;
const { createKin } = await import('/build/js/systems/kin.js');
const { registry } = await import('/build/js/data/registry.js');
for (const id of registry.trainers.keys()) state.markDefeated(id);
state.party.length = 0;
state.party.push(createKin('cinderpaw', 20, d.game.rng, { originalTrainer: 'player' }));

// The state a player is really in when they first walk onto the ridge.
state.setFlag('got_starter');
state.setFlag('crest_1_taken');
state.setFlag('crest_2_taken');
note(`before: tarin_at_ridge=${flag('tarin_at_ridge')} convoy=${flag('ridge_convoy_seen')} tarin_done=${flag('tarin_ridge_done')}`);

/* -------------------------------------------------- 1. arriving on the ridge */
d.game.scenes.replaceAll(new Overworld(state, 'route_3', 1, 13, 'right'));
await d.loadWait(1200);
clear();
note(`on arrival: scene=${top().name} pos=${d.probe().pos} ridge_convoy_seen=${flag('ridge_convoy_seen')}`);

/* --------------------------------------------------------- 2. Tarin's band */
// Put the player one tile west of the trigger band on the crest road and walk
// east into it, so the scene is entered the way a player enters it.
d.game.scenes.replaceAll(new Overworld(state, 'route_3', 26, 4, 'right'));
await d.loadWait(1000);
clear();
note(`at the crest: pos=${d.probe().pos} tarin on map=${!!top().npcs.find((n) => n.data.id === 'town_tarin')}`);

for (let i = 0; i < 10 && !flag('tarin_ridge_done'); i++) {
  d.hold('KeyD', 12); d.tick(2);
  if (top().name === 'dialogue' || top().busy) {
    note(`  step ${i}: scene fired at ${d.probe().pos}`);
    clear();
  }
}
note(`after the crest: tarin_ridge_done=${flag('tarin_ridge_done')} pos=${d.probe().pos}`);
note(`tarin still on map=${!!top().npcs.find((n) => n.data.id === 'town_tarin')}`);

/* ------------------------------------------ 3. the second convoy, on return */
d.game.scenes.replaceAll(new Overworld(state, 'route_3', 1, 13, 'right'));
await d.loadWait(1200);
clear();
note(`re-entering: ridge_convoy_seen_2=${flag('ridge_convoy_seen_2')}`);

const shot = await d.shoot('r3-tarin-scene', 6, 2);
return {
  ok: flag('ridge_convoy_seen') && flag('tarin_ridge_done') && flag('ridge_convoy_seen_2'),
  log,
  shot,
};
